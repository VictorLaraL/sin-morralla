// API del módulo ESP32 (texto plano; ver src/core/protocolo.ts).
//
// GET  /device/poll?espera=<0..25>  consulta larga: responde en cuanto hay un crédito o tras la espera (204).
// POST /device/ack?id=<credito>     confirma que los pulsos se entregaron.
//
// El Worker revisa D1 cada segundo durante la espera. Así no se mantiene despierto un Durable Object
// por cada máquina y el crédito llega en uno o dos segundos.

import { lineaCredito } from "../core/protocolo.ts";
import { sha256Hex } from "../core/tokens.ts";
import { vigenciaMinutos } from "../core/validaciones.ts";
import { creditoPendiente, entregarCredito, maquinaPorToken, tocarMaquina, type FilaCredito, type FilaMaquina } from "./db.ts";
import { esperar, log, texto, tokenBearer } from "./http.ts";

const ESPERA_MAXIMA_SEG = 25;
const INTERVALO_MS = 1000;

/** El latido es telemetría: si D1 falla al anotarlo, la consulta del módulo sigue adelante. */
async function latir(env: Env, maquinaId: string): Promise<void> {
  try {
    await tocarMaquina(env.DB, maquinaId, new Date().toISOString());
  } catch (error) {
    log("latido_fallido", { maquina: maquinaId, mensaje: error instanceof Error ? error.message : String(error) });
  }
}

export function limiteVigencia(env: Env, ahora = Date.now()): string {
  return new Date(ahora - vigenciaMinutos(env.TTL_CREDITO_MIN) * 60_000).toISOString();
}

export async function manejarDispositivo(
  request: Request,
  env: Env,
  url: URL,
  alEntregar?: (maquina: FilaMaquina, credito: FilaCredito) => Promise<void>,
): Promise<Response> {
  const token = tokenBearer(request);
  const m = token ? await maquinaPorToken(env.DB, await sha256Hex(token)) : null;
  if (!m) return texto("TOKEN INVALIDO\n", 401);

  await latir(env, m.id);

  if (request.method === "GET" && url.pathname === "/device/poll") {
    const pedida = Number(url.searchParams.get("espera") ?? ESPERA_MAXIMA_SEG);
    const espera = Number.isFinite(pedida) ? Math.min(Math.max(pedida, 0), ESPERA_MAXIMA_SEG) : ESPERA_MAXIMA_SEG;
    const fin = Date.now() + espera * 1000;

    while (true) {
      const c = await creditoPendiente(env.DB, m.id, limiteVigencia(env));
      if (c) {
        return texto(
          lineaCredito({ id: c.id, pulsos: c.pulsos, pulsoMs: m.pulso_ms, pausaMs: m.pausa_ms, requiereBoton: m.requiere_boton === 1 }),
        );
      }
      // Con enable_request_signal, la señal se activa si el módulo cortó la conexión: deja de consultar D1.
      if (Date.now() >= fin || request.signal.aborted) break;
      await esperar(INTERVALO_MS);
    }
    if (!request.signal.aborted) await latir(env, m.id);
    return new Response(null, { status: 204 });
  }

  if (request.method === "POST" && url.pathname === "/device/ack") {
    const id = url.searchParams.get("id") ?? "";
    // parcial=1: el módulo arrancó con una entrega a medias y no repitió los pulsos (ver firmware).
    const parcial = url.searchParams.get("parcial") === "1";
    const r = await entregarCredito(env.DB, id, m.id, new Date().toISOString(), parcial);
    if (r.resultado === "desconocido") {
      // No existe o es de otra máquina: el módulo deja de reintentar.
      log("ack_desconocido", { maquina: m.id, credito: id });
      return texto("CREDITO DESCONOCIDO\n", 404);
    }
    if (r.resultado === "entregado") {
      log(parcial ? "credito_interrumpido" : "credito_entregado", { maquina: m.id, credito: id, pulsos: r.credito.pulsos });
      if (alEntregar) {
        try {
          await alEntregar(m, r.credito);
        } catch (error) {
          log("aviso_en_vivo_fallido", { credito: id, mensaje: error instanceof Error ? error.message : String(error) });
        }
      }
    }
    // Confirmar dos veces el mismo crédito no es un error: el ESP32 puede reintentar.
    return texto("OK\n");
  }

  return texto("NO ENCONTRADO\n", 404);
}
