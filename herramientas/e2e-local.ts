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

// ---------- T4: demo en vivo, portal, contacto y cron ----------

const PORTAL = { Authorization: `Bearer ${vars.PORTAL_TOKEN}`, "content-type": "application/json" };
// Respuestas JSON de la API: en las pruebas se leen sin tipar.
const leer = async (r: Response): Promise<any> => r.json();
const limite = (ms: number) => new Promise((_, mal) => setTimeout(() => mal(new Error(`sin respuesta en ${ms} ms`)), ms));

test("la demo pública ofrece su QR en modo simulación", async () => {
  const r = await fetch(`${BASE}/api/demo`);
  assert.equal(r.status, 200);
  const d = await leer(r);
  assert.equal(d.simulacion, true);
  assert.equal(d.montoCentavos, 100);
  assert.ok(d.qrString, "la demo debe tener QR");
});

test("un pago a la demo llega en vivo a la landing por WebSocket", async () => {
  const ws = new WebSocket(`${BASE.replace(/^http/, "ws")}/api/demo/en-vivo`);
  await new Promise((ok, mal) => {
    ws.addEventListener("open", () => ok(null));
    ws.addEventListener("error", () => mal(new Error("no abrió el WebSocket")));
  });
  const evento = new Promise<Record<string, unknown>>((ok) => {
    ws.addEventListener("message", (m) => ok(JSON.parse(String(m.data))));
  });
  const antes = await leer(await fetch(`${BASE}/api/demo`));
  const r = await fetch(`${BASE}/api/demo/simular`, { method: "POST" });
  assert.equal(r.status, 200);
  const e = (await Promise.race([evento, limite(5000)])) as Record<string, unknown>;
  assert.equal(e.tipo, "pago");
  assert.equal(e.montoCentavos, 100);
  ws.close();
  const despues = await leer(await fetch(`${BASE}/api/demo`));
  assert.equal(despues.pagosHoy, antes.pagosHoy + 1);
});

test("el portal exige su clave", async () => {
  assert.equal((await fetch(`${BASE}/api/portal/resumen`)).status, 401);
  assert.equal((await fetch(`${BASE}/api/portal/resumen`, { headers: { Authorization: "Bearer otra" } })).status, 401);
  const r = await fetch(`${BASE}/api/portal/resumen`, { headers: PORTAL });
  assert.equal(r.status, 200);
  const d = await leer(r);
  assert.deepEqual(d.maquinas.map((m: { id: string }) => m.id).sort(), ["agua-01", "demo"]);
});

test("el portal valida la configuración de la máquina", async () => {
  const malo = await fetch(`${BASE}/api/portal/maquinas/agua-01`, {
    method: "PUT",
    headers: PORTAL,
    body: JSON.stringify({ nombre: "Despachador", ubicacion: "", precioCentavos: 1300, valorPulsoCentavos: 100, pulsoMs: 5, pausaMs: 50, maxPulsos: 50, requiereBoton: false }),
  });
  assert.equal(malo.status, 400);
  assert.match((await leer(malo)).error, /ancho del pulso/);
  const bueno = await fetch(`${BASE}/api/portal/maquinas/agua-01`, {
    method: "PUT",
    headers: PORTAL,
    body: JSON.stringify({ nombre: "Despachador de agua", ubicacion: "Banco de pruebas", precioCentavos: 1300, valorPulsoCentavos: 100, pulsoMs: 50, pausaMs: 50, maxPulsos: 50, requiereBoton: false }),
  });
  assert.equal(bueno.status, 200);
});

test("el portal genera el token del módulo y manda un pulso de prueba", async () => {
  const t = await fetch(`${BASE}/api/portal/maquinas/agua-01/token`, { method: "POST", headers: PORTAL });
  assert.equal(t.status, 200);
  const { token } = await leer(t);
  assert.match(token, /^[A-Za-z0-9_-]{32}$/);
  const nuevo = { Authorization: `Bearer ${token}` };
  assert.equal((await fetch(`${BASE}/device/poll?espera=0`, { headers: dispositivo })).status, 401, "el token anterior deja de servir");

  const p = await fetch(`${BASE}/api/portal/maquinas/agua-01/prueba`, { method: "POST", headers: PORTAL, body: JSON.stringify({ pulsos: 2 }) });
  assert.equal(p.status, 201);
  const poll = await fetch(`${BASE}/device/poll?espera=0`, { headers: nuevo });
  const m = /^CREDITO (c_[0-9a-f]{12}) 2 50 50 0\n$/.exec(await poll.text());
  assert.ok(m);
  await fetch(`${BASE}/device/ack?id=${m[1]}`, { method: "POST", headers: nuevo });
});

test("un crédito que la máquina no recoge vence y aparece por atender", async () => {
  const p = await fetch(`${BASE}/api/portal/maquinas/agua-01/prueba`, { method: "POST", headers: PORTAL, body: JSON.stringify({ pulsos: 1 }) });
  const { id } = await leer(p);
  sql(`UPDATE creditos SET creado_en='2020-01-01T00:00:00.000Z' WHERE id='${id}'`);
  const cron = await fetch(`${BASE}/__scheduled?cron=*+*+*+*+*`);
  assert.equal(cron.status, 200);
  const d = await leer(await fetch(`${BASE}/api/portal/resumen`, { headers: PORTAL }));
  const vencido = d.porAtender.find((c: { id: string }) => c.id === id);
  assert.equal(vencido?.estado, "vencido");

  const dev = await fetch(`${BASE}/api/portal/creditos/${id}/devuelto`, { method: "POST", headers: PORTAL });
  assert.equal(dev.status, 200);
  const d2 = await leer(await fetch(`${BASE}/api/portal/resumen`, { headers: PORTAL }));
  assert.equal(d2.porAtender.some((c: { id: string }) => c.id === id), false);
});

test("el formulario de contacto guarda interesados e ignora bots", async () => {
  const ok = await fetch(`${BASE}/api/contacto`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nombre: "Prueba e2e", telefono: "5512345678", mensaje: "Tengo una purificadora" }),
  });
  assert.equal(ok.status, 200);
  const malo = await fetch(`${BASE}/api/contacto`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nombre: "" }) });
  assert.equal(malo.status, 400);
  const bot = await fetch(`${BASE}/api/contacto`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nombre: "Bot", telefono: "1", sitio: "http://spam" }),
  });
  assert.equal(bot.status, 200, "al bot se le responde igual, pero no se guarda");
  const lista = await leer(await fetch(`${BASE}/api/portal/contactos`, { headers: PORTAL }));
  assert.ok(lista.some((c: { nombre: string }) => c.nombre === "Prueba e2e"));
  assert.equal(lista.some((c: { nombre: string }) => c.nombre === "Bot"), false);
});
