// Pruebas de punta a punta contra el servidor local (`npm run dev`, puerto 8787).
// Uso: npm run e2e
//
// Prepara la máquina agua-01 con un QR y un token de prueba directamente en la base local,
// y luego recorre el flujo real: aviso firmado de pey -> crédito -> ESP32 lo recoge -> confirma.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { avisoDePago, enviarAviso, leerDevVars } from "./comun.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:8787";
const vars = leerDevVars();
const SECRETO = vars.PEY_WEBHOOK_SECRET;
const QR = "QR-E2E-" + randomBytes(3).toString("hex");
const TOKEN = "token-e2e-" + randomBytes(6).toString("hex");

// Escribe directo en la base local de `wrangler dev`. El SQL va entre comillas dobles (no lleva comillas dobles).
function sql(comando: string) {
  execSync(`npx wrangler d1 execute sin-morralla --local --command "${comando}"`, {
    stdio: "ignore",
    env: { ...process.env, CI: "1" },
  });
}

const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");
const dispositivo = { Authorization: `Bearer ${TOKEN}` };

test.before(() => {
  sql(
    `UPDATE maquinas SET qr_id='${QR}', qr_monto_centavos=1300, precio_centavos=1300, requiere_boton=0, ` +
      `token_hash='${sha256(TOKEN)}' WHERE id='agua-01'; DELETE FROM creditos WHERE maquina_id='agua-01' AND estado='pendiente';`,
  );
});

test("rechaza avisos sin firma válida", async () => {
  const r = await fetch(`${BASE}/webhooks/pey`, { method: "POST", body: JSON.stringify(avisoDePago({ montoCentavos: 1300, codiQrId: QR })) });
  assert.equal(r.status, 401);
});

test("el ESP32 sin token válido no recibe nada", async () => {
  const r = await fetch(`${BASE}/device/poll?espera=0`, { headers: { Authorization: "Bearer otro" } });
  assert.equal(r.status, 401);
});

test("sin pagos, la consulta del ESP32 termina en 204", async () => {
  const r = await fetch(`${BASE}/device/poll?espera=0`, { headers: dispositivo });
  assert.equal(r.status, 204);
});

test("un pago al QR de la máquina se convierte en sus pulsos, una sola vez", async () => {
  const aviso = avisoDePago({ montoCentavos: 1300, codiQrId: QR, concepto: "Garrafón" });
  const r1 = await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, aviso, "msg_e2e_1");
  assert.equal(r1.status, 200);
  assert.deepEqual(await r1.json(), { ok: true, duplicado: false });

  // pey reintenta el mismo aviso y luego manda otro mensaje del mismo pago: ninguno crea otro crédito.
  const r2 = await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, aviso, "msg_e2e_1");
  assert.deepEqual(await r2.json(), { ok: true, duplicado: true });
  const r3 = await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, aviso, "msg_e2e_2");
  assert.deepEqual(await r3.json(), { ok: true, duplicado: true });

  const poll = await fetch(`${BASE}/device/poll?espera=0`, { headers: dispositivo });
  assert.equal(poll.status, 200);
  const linea = await poll.text();
  const m = /^CREDITO (c_[0-9a-f]{12}) 13 50 50 0\n$/.exec(linea);
  assert.ok(m, `línea inesperada: ${JSON.stringify(linea)}`);

  const ack = await fetch(`${BASE}/device/ack?id=${m[1]}`, { method: "POST", headers: dispositivo });
  assert.equal(await ack.text(), "OK\n");

  const despues = await fetch(`${BASE}/device/poll?espera=0`, { headers: dispositivo });
  assert.equal(despues.status, 204, "un crédito entregado no se vuelve a mandar");
});

test("la consulta larga entrega el crédito en cuanto llega el pago", async () => {
  const inicio = Date.now();
  const espera = fetch(`${BASE}/device/poll?espera=10`, { headers: dispositivo });
  await new Promise((ok) => setTimeout(ok, 1500));
  await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, avisoDePago({ montoCentavos: 1300, codiQrId: QR }));
  const r = await espera;
  assert.equal(r.status, 200);
  assert.match(await r.text(), /^CREDITO c_[0-9a-f]{12} 13 /);
  assert.ok(Date.now() - inicio < 5000, "debe llegar en segundos, no al final de la espera");
  const id = /CREDITO (\S+)/.exec(await (await fetch(`${BASE}/device/poll?espera=0`, { headers: dispositivo })).text())?.[1];
  if (id) await fetch(`${BASE}/device/ack?id=${id}`, { method: "POST", headers: dispositivo });
});

test("un pago menor al precio no da servicio", async () => {
  const r = await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, avisoDePago({ montoCentavos: 500, codiQrId: QR }));
  assert.equal(r.status, 200);
  const poll = await fetch(`${BASE}/device/poll?espera=0`, { headers: dispositivo });
  assert.equal(poll.status, 204);
});

test("ignora eventos que no son pagos", async () => {
  const r = await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, { type: "bank.account.updated", codiStatus: "ACTIVE" });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, ignorado: true });
});
