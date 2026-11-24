// Tokens y comparaciones seguras (Web Crypto: funciona en el Worker y en Node).

import { igualesTiempoConstante } from "./firma.ts";

async function digerir(texto: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
}

export async function sha256Hex(texto: string): Promise<string> {
  return [...(await digerir(texto))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compara un secreto recibido con el configurado sin filtrar información por tiempo. Un secreto vacío nunca pasa. */
export async function compararSecreto(recibido: string, esperado: string): Promise<boolean> {
  if (!esperado || !recibido) return false;
  const [a, b] = await Promise.all([digerir(recibido), digerir(esperado)]);
  return igualesTiempoConstante(a, b);
}

/** Token aleatorio en base64url (24 bytes = 32 caracteres). */
export function generarToken(bytes = 24): string {
  const crudo = crypto.getRandomValues(new Uint8Array(bytes));
  let binario = "";
  for (const b of crudo) binario += String.fromCharCode(b);
  return btoa(binario).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function generarId(prefijo: string): string {
  const crudo = crypto.getRandomValues(new Uint8Array(6));
  return `${prefijo}_${[...crudo].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
