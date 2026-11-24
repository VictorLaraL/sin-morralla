// POST /webhooks/pey — avisos de pago de pey.
//
// 1. Verifica la firma (Standard Webhooks) sobre el cuerpo crudo.
// 2. Identifica la máquina por el QR pagado.
// 3. Registra pago + crédito en una sola transacción; un pago repetido no hace nada.
// Responde 500 ante errores inesperados para que pey reintente.

import { verificarAviso } from "../core/firma.ts";
import { esEventoDePago, normalizarPago } from "../core/pagos.ts";
import { calcularCredito } from "../core/pulsos.ts";
import { maquina, maquinaPorQr, registrarPago, type FilaCredito, type FilaMaquina } from "./db.ts";
import { json, log } from "./http.ts";

const TAMANO_MAXIMO = 64 * 1024;

export interface PagoProcesado {
  maquina: FilaMaquina | null;
  credito: FilaCredito | null;
  montoCentavos: number;
  fechaPago: string;
}

export async function manejarAviso(
  request: Request,
  env: Env,
  alProcesar?: (resultado: PagoProcesado) => Promise<void>,
): Promise<Response> {
  if (!env.PEY_WEBHOOK_SECRET) return json({ ok: false, error: "Falta configurar PEY_WEBHOOK_SECRET" }, 503);

  const largo = Number(request.headers.get("content-length") ?? 0);
  if (largo > TAMANO_MAXIMO) return json({ ok: false, error: "Aviso demasiado grande" }, 413);
  const cuerpo = await request.text();
  if (cuerpo.length > TAMANO_MAXIMO) return json({ ok: false, error: "Aviso demasiado grande" }, 413);

  const encabezados = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };
  const firma = await verificarAviso(env.PEY_WEBHOOK_SECRET, encabezados, cuerpo);
  if (!firma.ok) {
    log("aviso_rechazado", { motivo: firma.motivo, webhookId: encabezados["webhook-id"] });
    return json({ ok: false, error: firma.motivo }, 401);
  }

  let aviso: unknown;
  try {
    aviso = JSON.parse(cuerpo);
  } catch {
    return json({ ok: false, error: "El aviso no es JSON" }, 400);
  }

  const pago = normalizarPago(encabezados["webhook-id"], aviso);
  if (!pago) {
    // Se responde 200 porque reintentar no lo arregla, pero queda en el log para conciliar con pey.
    const motivo = esEventoDePago(aviso) ? "pago incompleto" : "no es un pago";
    const tipo = typeof aviso === "object" && aviso !== null ? String((aviso as { type?: unknown }).type ?? "") : "";
    log(motivo === "pago incompleto" ? "aviso_pago_incompleto" : "aviso_ignorado", { motivo, tipo, webhookId: encabezados["webhook-id"] });
    return json({ ok: true, ignorado: true, motivo });
  }

  let destino: FilaMaquina | null = pago.codiQrId ? await maquinaPorQr(env.DB, pago.codiQrId) : null;
  if (!destino && typeof pago.metadata.maquina === "string") destino = await maquina(env.DB, pago.metadata.maquina);

  const credito = destino
    ? calcularCredito(
        {
          valorPulsoCentavos: destino.valor_pulso_centavos,
          maxPulsos: destino.max_pulsos,
          precioCentavos: destino.precio_centavos,
        },
        pago.montoCentavos,
      )
    : null;

  const ahora = new Date().toISOString();
  const resultado = await registrarPago(env.DB, pago, destino && credito ? { maquina: destino, credito } : null, ahora);
  if (!resultado.nuevo) return json({ ok: true, duplicado: true });

  log("pago_registrado", {
    transactionId: pago.transactionId,
    maquina: destino?.id ?? null,
    montoCentavos: pago.montoCentavos,
    pulsos: resultado.credito?.pulsos ?? 0,
    estado: resultado.credito?.estado ?? "sin-maquina",
  });

  // El pago ya quedó guardado: si falla el aviso en vivo no se responde 500, porque el reintento de pey
  // caería en "duplicado" y tampoco lo repetiría. Se registra y se sigue.
  if (alProcesar) {
    try {
      await alProcesar({ maquina: destino, credito: resultado.credito, montoCentavos: pago.montoCentavos, fechaPago: pago.fechaPago });
    } catch (error) {
      log("aviso_en_vivo_fallido", { transactionId: pago.transactionId, mensaje: error instanceof Error ? error.message : String(error) });
    }
  }
  return json({ ok: true, duplicado: false });
}
