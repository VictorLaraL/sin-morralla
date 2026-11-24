// Cliente del API de pey para crear el QR fijo de cada máquina (POST /codi/qr, docs.pey.mx).
// Sin PEY_API_KEY y con SIMULACION=1 regresa un QR simulado para probar en local.

import { generarId } from "../core/tokens.ts";

export interface QrFijo {
  id: string;
  qrString: string;
  simulado: boolean;
}

export async function crearQrFijo(
  env: Env,
  datos: { montoCentavos: number; concepto: string; metadata: Record<string, string> },
): Promise<QrFijo> {
  if (!env.PEY_API_KEY) {
    if (env.SIMULACION !== "1") throw new Error("Falta configurar PEY_API_KEY");
    const id = generarId("SIMQR");
    return { id, qrString: `SIMULADO|${id}|${datos.montoCentavos}|${datos.concepto}`, simulado: true };
  }

  const respuesta = await fetch("https://api.pey.mx/codi/qr", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.PEY_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: datos.montoCentavos / 100, // 0 = el cliente escribe el monto
      concept: datos.concepto.slice(0, 40),
      expiration: 0, // QR fijo: no vence y acepta muchos pagos (probado el 23 de noviembre de 2026)
      metadata: datos.metadata,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const texto = await respuesta.text();
  if (!respuesta.ok) throw new Error(`pey respondió ${respuesta.status}: ${texto.slice(0, 300)}`);
  const cuerpo = JSON.parse(texto) as { id?: string; qrString?: string };
  if (!cuerpo.id || !cuerpo.qrString) throw new Error("pey no regresó el QR");
  return { id: cuerpo.id, qrString: cuerpo.qrString, simulado: false };
}
