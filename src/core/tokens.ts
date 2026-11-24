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

const BOLETO_MAX_SEG = 120;

function base64url(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function firmaBoleto(secreto: string, venceSeg: number): Promise<Uint8Array> {
  const llave = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", llave, new TextEncoder().encode(`portal-en-vivo:${venceSeg}`)));
}

/**
 * Boleto para abrir el WebSocket del portal. El navegador no puede mandar encabezados al abrir un WebSocket, así que
 * la autorización va en la URL; con este boleto (vence en segundos y no revela la clave) la clave maestra nunca viaja ahí.
 */
export async function firmarBoleto(secreto: string, venceSeg: number): Promise<string> {
  return `${venceSeg}.${base64url(await firmaBoleto(secreto, venceSeg))}`;
}

export async function verificarBoleto(secreto: string, boleto: string, ahoraSeg = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!secreto) return false;
  const m = /^(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(boleto);
  if (!m) return false;
  const vence = Number(m[1]);
  if (vence <= ahoraSeg || vence - ahoraSeg > BOLETO_MAX_SEG) return false;
  const esperado = new TextEncoder().encode(base64url(await firmaBoleto(secreto, vence)));
  return igualesTiempoConstante(new TextEncoder().encode(m[2]), esperado);
}
