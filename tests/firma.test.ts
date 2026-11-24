import { test } from "node:test";
import assert from "node:assert/strict";
import { Webhook } from "standardwebhooks";
import { firmarAviso, verificarAviso } from "../src/core/firma.ts";

// Secreto de prueba con el mismo formato que entrega pey (whsec_ + base64). No es un secreto real.
const SECRETO = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const CUERPO = JSON.stringify({ type: "codi.qr.payment_received", amount: 13, transactionId: "TX1" });

function encabezados(id: string, fecha: Date, firma: string) {
  return {
    "webhook-id": id,
    "webhook-timestamp": String(Math.floor(fecha.getTime() / 1000)),
    "webhook-signature": firma,
  };
}

test("acepta un aviso firmado con la librería oficial de Standard Webhooks", async () => {
  const fecha = new Date();
  const firma = new Webhook(SECRETO).sign("msg_1", fecha, CUERPO);
  const r = await verificarAviso(SECRETO, encabezados("msg_1", fecha, firma), CUERPO);
  assert.deepEqual(r, { ok: true });
});

test("nuestra firma la acepta la librería oficial", async () => {
  const fecha = new Date();
  const firma = await firmarAviso(SECRETO, "msg_2", Math.floor(fecha.getTime() / 1000), CUERPO);
  assert.doesNotThrow(() => new Webhook(SECRETO).verify(CUERPO, encabezados("msg_2", fecha, firma)));
});

test("acepta si alguna de varias firmas coincide (rotación de secreto)", async () => {
  const fecha = new Date();
  const buena = new Webhook(SECRETO).sign("msg_3", fecha, CUERPO);
  const r = await verificarAviso(SECRETO, encabezados("msg_3", fecha, `v1,AAAA ${buena}`), CUERPO);
  assert.equal(r.ok, true);
});

test("rechaza un cuerpo alterado", async () => {
  const fecha = new Date();
  const firma = new Webhook(SECRETO).sign("msg_4", fecha, CUERPO);
  const r = await verificarAviso(SECRETO, encabezados("msg_4", fecha, firma), CUERPO.replace("13", "1300"));
  assert.deepEqual(r, { ok: false, motivo: "firma inválida" });
});

test("rechaza un aviso firmado con otro secreto", async () => {
  const fecha = new Date();
  const firma = new Webhook("whsec_" + btoa("otro-secreto-de-prueba-123")).sign("msg_5", fecha, CUERPO);
  const r = await verificarAviso(SECRETO, encabezados("msg_5", fecha, firma), CUERPO);
  assert.deepEqual(r, { ok: false, motivo: "firma inválida" });
});

test("rechaza avisos con más de 5 minutos de diferencia (reenvíos viejos)", async () => {
  const vieja = new Date(Date.now() - 6 * 60 * 1000);
  const firma = new Webhook(SECRETO).sign("msg_6", vieja, CUERPO);
  const r = await verificarAviso(SECRETO, encabezados("msg_6", vieja, firma), CUERPO);
  assert.deepEqual(r, { ok: false, motivo: "fecha fuera de rango" });
});

test("rechaza avisos sin encabezados de firma", async () => {
  const r = await verificarAviso(SECRETO, { "webhook-id": "", "webhook-timestamp": "", "webhook-signature": "" }, CUERPO);
  assert.deepEqual(r, { ok: false, motivo: "faltan encabezados" });
});
