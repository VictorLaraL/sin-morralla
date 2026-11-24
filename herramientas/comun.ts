// Utilidades de las herramientas locales (simuladores y pruebas e2e).

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { firmarAviso } from "../src/core/firma.ts";

/** Lee .dev.vars (KEY=VALUE) para usar el mismo secreto que el servidor local. */
export function leerDevVars(ruta = ".dev.vars"): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(linea);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

export interface AvisoSimulado {
  tipo?: "qr" | "pn";
  montoCentavos: number;
  codiQrId?: string;
  transactionId?: string;
  concepto?: string;
}

/** Arma un aviso con la misma forma que manda pey. */
export function avisoDePago(a: AvisoSimulado) {
  const tipo = a.tipo ?? "qr";
  return {
    type: `codi.${tipo}.payment_received`,
    amount: a.montoCentavos / 100,
    apiKeyId: "SIMULADO",
    ...(tipo === "qr" ? { codiQrId: a.codiQrId ?? "SIN-QR" } : {}),
    concept: a.concepto ?? "Pago simulado",
    datePaid: Math.floor(Date.now() / 1000),
    metadata: { trackingKey: "SIM" + randomBytes(6).toString("hex").toUpperCase(), externalMetadata: {} },
    numRef: "0",
    transactionId: a.transactionId ?? "SIMTX" + randomBytes(8).toString("hex").toUpperCase(),
  };
}

/** Envía un aviso firmado igual que pey. */
export async function enviarAviso(url: string, secreto: string, aviso: unknown, webhookId = "msg_" + randomBytes(8).toString("hex")) {
  const cuerpo = JSON.stringify(aviso);
  const ts = Math.floor(Date.now() / 1000);
  const firma = await firmarAviso(secreto, webhookId, ts, cuerpo);
  return fetch(url, {
    method: "POST",
    body: cuerpo,
    headers: {
      "content-type": "application/json",
      "webhook-id": webhookId,
      "webhook-timestamp": String(ts),
      "webhook-signature": firma,
    },
  });
}
