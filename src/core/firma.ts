// Verificación de los avisos de pey, firmados con Standard Webhooks (https://www.standardwebhooks.com/).
// Solo usa Web Crypto, así que corre igual en el Worker y en Node (pruebas).

const PREFIJO_SECRETO = "whsec_";
const TOLERANCIA_SEGUNDOS = 5 * 60;

export interface EncabezadosFirma {
  "webhook-id": string;
  "webhook-timestamp": string;
  "webhook-signature": string;
}

export type ResultadoFirma =
  | { ok: true }
  | { ok: false; motivo: "faltan encabezados" | "fecha fuera de rango" | "firma inválida" | "secreto inválido" };

function base64ABytes(texto: string): Uint8Array {
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function bytesABase64(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

/** Compara dos arreglos sin cortar en la primera diferencia, para no filtrar información por tiempo. */
export function igualesTiempoConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a[i] ^ b[i];
  return diferencia === 0;
}

async function calcularFirma(secreto: string, id: string, timestamp: string, cuerpo: string): Promise<Uint8Array> {
  const crudo = secreto.startsWith(PREFIJO_SECRETO) ? secreto.slice(PREFIJO_SECRETO.length) : secreto;
  const llave = await crypto.subtle.importKey("raw", base64ABytes(crudo), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const firma = await crypto.subtle.sign("HMAC", llave, new TextEncoder().encode(`${id}.${timestamp}.${cuerpo}`));
  return new Uint8Array(firma);
}

/** Firma un aviso igual que pey. Se usa en el modo simulación y en las pruebas. */
export async function firmarAviso(secreto: string, id: string, timestampSeg: number, cuerpo: string): Promise<string> {
  return "v1," + bytesABase64(await calcularFirma(secreto, id, String(timestampSeg), cuerpo));
}

/**
 * Verifica la firma de un aviso. `cuerpo` debe ser el texto crudo recibido, sin volver a serializar.
 * El encabezado de firma puede traer varias firmas separadas por espacios (rotación de secreto).
 */
export async function verificarAviso(
  secreto: string,
  encabezados: EncabezadosFirma,
  cuerpo: string,
  ahoraSeg = Math.floor(Date.now() / 1000),
): Promise<ResultadoFirma> {
  const id = encabezados["webhook-id"];
  const timestamp = encabezados["webhook-timestamp"];
  const firmas = encabezados["webhook-signature"];
  if (!id || !timestamp || !firmas) return { ok: false, motivo: "faltan encabezados" };

  const segundos = Number(timestamp);
  if (!Number.isInteger(segundos) || Math.abs(ahoraSeg - segundos) > TOLERANCIA_SEGUNDOS) {
    return { ok: false, motivo: "fecha fuera de rango" };
  }

  let esperada: Uint8Array;
  try {
    esperada = await calcularFirma(secreto, id, timestamp, cuerpo);
  } catch {
    return { ok: false, motivo: "secreto inválido" };
  }

  for (const parte of firmas.split(" ")) {
    const [version, valor] = parte.split(",", 2);
    if (version !== "v1" || !valor) continue;
    let recibida: Uint8Array;
    try {
      recibida = base64ABytes(valor);
    } catch {
      continue;
    }
    if (igualesTiempoConstante(esperada, recibida)) return { ok: true };
  }
  return { ok: false, motivo: "firma inválida" };
}
