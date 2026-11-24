// POST /webhooks/pey — avisos de pago de pey.
//
// 1. Verifica la firma (Standard Webhooks) sobre el cuerpo crudo.
// 2. Identifica la máquina por el QR pagado.
// 3. Registra pago + crédito en una sola transacción; un pago repetido no hace nada.
// Responde 500 ante errores inesperados para que pey reintente.

import { verificarAviso } from "../core/firma.ts";
import { normalizarPago } from "../core/pagos.ts";
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
  if (!pago) return json({ ok: true, ignorado: true });

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

  if (alProcesar) {
    await alProcesar({ maquina: destino, credito: resultado.credito, montoCentavos: pago.montoCentavos, fechaPago: pago.fechaPago });
  }
  return json({ ok: true, duplicado: false });
}
