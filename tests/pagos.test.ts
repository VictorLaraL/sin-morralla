import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarPago } from "../src/core/pagos.ts";

// Forma documentada por pey para codi.qr.payment_received (docs.pey.mx/docs/webhooks/codi/qr).
const avisoQr = {
  type: "codi.qr.payment_received",
  amount: 13,
  apiKeyId: "key_1",
  codiQrId: "35fe2b8736",
  concept: "Garrafón",
  datePaid: 1795480200,
  metadata: { trackingKey: "4443841739", externalMetadata: { maquina: "agua-01" } },
  numRef: "0",
  transactionId: "01M85BYRNG6FAVQ1ASPHTRJ2M7",
};

test("convierte el aviso de pago por QR en centavos, con el QR y la clave de rastreo", () => {
  const p = normalizarPago("msg_1", avisoQr);
  assert.deepEqual(p, {
    webhookId: "msg_1",
    tipo: "qr",
    transactionId: "01M85BYRNG6FAVQ1ASPHTRJ2M7",
    montoCentavos: 1300,
    concepto: "Garrafón",
    codiQrId: "35fe2b8736",
    claveRastreo: "4443841739",
    fechaPago: new Date(1795480200 * 1000).toISOString(),
    metadata: { maquina: "agua-01" },
  });
});

test("redondea centavos sin errores de punto flotante", () => {
  assert.equal(normalizarPago("m", { ...avisoQr, amount: 0.01 })?.montoCentavos, 1);
  assert.equal(normalizarPago("m", { ...avisoQr, amount: 19.99 })?.montoCentavos, 1999);
});

test("reconoce el aviso de cobro al celular (push), que no trae QR", () => {
  const { codiQrId: _, ...sinQr } = avisoQr;
  const p = normalizarPago("m", { ...sinQr, type: "codi.pn.payment_received" });
  assert.equal(p?.tipo, "pn");
  assert.equal(p?.codiQrId, null);
});

test("acepta los campos dentro de data y la metadata como texto JSON", () => {
  const p = normalizarPago("m", {
    type: "codi.qr.payment_received",
    data: { amount: "10", transactionId: "TX2", codiQrId: "QR2", metadata: { externalMetadata: '{"maquina":"demo"}' } },
  });
  assert.equal(p?.montoCentavos, 1000);
  assert.deepEqual(p?.metadata, { maquina: "demo" });
});

test("un aviso sin monto, o con un monto que no es número, no se registra", () => {
  for (const amount of [null, undefined, "", true, false, [], [5], {}, "abc", "1e3", " "]) {
    assert.equal(normalizarPago("m", { ...avisoQr, amount }), null, `amount=${String(amount)}`);
  }
});

test("una fecha de pago fuera de rango (milisegundos o absurda) usa la hora de recepción", () => {
  const ahora = new Date("2026-11-23T18:00:00Z");
  for (const datePaid of [1795480200000, -5, 99999999999]) {
    assert.equal(normalizarPago("m", { ...avisoQr, datePaid }, ahora)?.fechaPago, ahora.toISOString(), `datePaid=${datePaid}`);
  }
});

test("ignora eventos que no son pagos CoDi recibidos", () => {
  assert.equal(normalizarPago("m", { type: "bank.account.updated", codiStatus: "ACTIVE" }), null);
  assert.equal(normalizarPago("m", { type: "codi.qr.payment_received", amount: 5 }), null, "sin transactionId");
  assert.equal(normalizarPago("m", "texto"), null);
});
