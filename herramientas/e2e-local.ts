// Pruebas de punta a punta contra el servidor local (`npm run dev`, puerto 8787).
// Uso: npm run e2e
//
// Prepara la máquina agua-01 con un QR y un token de prueba directamente en la base local,
// y luego recorre el flujo real: aviso firmado de pey -> crédito -> ESP32 lo recoge -> confirma.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { avisoDePago, enviarAviso, enviarCuerpoFirmado, leerDevVars } from "./comun.ts";

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

// Lee filas de la base local (para revisar estados que la API no expone).
// El resultado de `wrangler d1 execute --json` es [{ results: [...] }].
function consulta(comando: string): Array<Record<string, unknown>> {
  const salida = execSync(`npx wrangler d1 execute sin-morralla --local --json --command "${comando}"`, {
    env: { ...process.env, CI: "1" },
  }).toString();
  return JSON.parse(salida)[0].results;
}

const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");
const dispositivo = { Authorization: `Bearer ${TOKEN}` };

test.before(() => {
  sql(
    `UPDATE maquinas SET qr_id='${QR}', qr_monto_centavos=1300, precio_centavos=1300, requiere_boton=0, ` +
      `token_hash='${sha256(TOKEN)}' WHERE id='agua-01'; DELETE FROM creditos WHERE maquina_id='agua-01' AND estado='pendiente'; ` +
      `DELETE FROM contactos WHERE nombre LIKE 'Prueba e2e%';`,
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
  assert.deepEqual(await r.json(), { ok: true, ignorado: true, motivo: "no es un pago" });
});

// ---------- Correcciones de la revisión RDD de T3 ----------

test("un aviso de pago incompleto se ignora pero dice por qué", async () => {
  const r = await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, { type: "codi.qr.payment_received", amount: 13, codiQrId: QR });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, ignorado: true, motivo: "pago incompleto" });
});

test("un aviso firmado que no es JSON da 400 y uno enorme da 413", async () => {
  assert.equal((await enviarCuerpoFirmado(`${BASE}/webhooks/pey`, SECRETO, "no soy json")).status, 400);
  assert.equal((await enviarCuerpoFirmado(`${BASE}/webhooks/pey`, SECRETO, "x".repeat(70_000))).status, 413);
});

test("si el primer aviso de un pago no tenía máquina, otro aviso del mismo pago no crea crédito", async () => {
  const transactionId = "SIMTX-SINQR-" + randomBytes(4).toString("hex");
  const r1 = await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, avisoDePago({ montoCentavos: 1300, codiQrId: "QR-AJENO", transactionId }));
  assert.deepEqual(await r1.json(), { ok: true, duplicado: false });
  const r2 = await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, avisoDePago({ montoCentavos: 1300, codiQrId: QR, transactionId }));
  assert.deepEqual(await r2.json(), { ok: true, duplicado: true });
  assert.equal((await fetch(`${BASE}/device/poll?espera=0`, { headers: dispositivo })).status, 204, "no debe dar servicio");
});

test("si falta el QR, el pago se ubica por la máquina guardada en la metadata", async () => {
  const aviso = { ...avisoDePago({ montoCentavos: 1300, codiQrId: "QR-ANTERIOR" }), metadata: { trackingKey: "SIM", externalMetadata: { maquina: "agua-01" } } };
  await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, aviso);
  const linea = await (await fetch(`${BASE}/device/poll?espera=0`, { headers: dispositivo })).text();
  const m = /^CREDITO (c_[0-9a-f]{12}) 13 /.exec(linea);
  assert.ok(m, `línea inesperada: ${JSON.stringify(linea)}`);
  await fetch(`${BASE}/device/ack?id=${m[1]}`, { method: "POST", headers: dispositivo });
});

test("una máquina no puede confirmar créditos de otra y confirmar dos veces no falla", async () => {
  const otro = "token-e2e-otra-" + randomBytes(6).toString("hex");
  sql(`INSERT INTO maquinas (id, nombre, virtual, precio_centavos, token_hash, creado_en) VALUES ('agua-e2e', 'Otra', 0, 1300, '${sha256(otro)}', '2026-01-01T00:00:00.000Z')`);
  try {
    await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, avisoDePago({ montoCentavos: 1300, codiQrId: QR }));
    const id = /CREDITO (\S+)/.exec(await (await fetch(`${BASE}/device/poll?espera=0`, { headers: dispositivo })).text())?.[1];
    assert.ok(id);
    const ajena = await fetch(`${BASE}/device/ack?id=${id}`, { method: "POST", headers: { Authorization: `Bearer ${otro}` } });
    assert.equal(ajena.status, 404);
    assert.equal(await ajena.text(), "CREDITO DESCONOCIDO\n");
    const sigue = await (await fetch(`${BASE}/device/poll?espera=0`, { headers: dispositivo })).text();
    assert.match(sigue, new RegExp(`^CREDITO ${id} `), "el crédito sigue pendiente para su máquina");
    for (let i = 0; i < 2; i++) {
      const confirmacion: Response = await fetch(`${BASE}/device/ack?id=${id}`, { method: "POST", headers: dispositivo });
      assert.equal(await confirmacion.text(), "OK\n");
    }
  } finally {
    sql(`DELETE FROM maquinas WHERE id='agua-e2e'`);
  }
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

test("un pago que la máquina no recoge vence y aparece por atender", async () => {
  const transactionId = "SIMTX-VENCE-" + randomBytes(4).toString("hex");
  await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, avisoDePago({ montoCentavos: 1300, codiQrId: QR, transactionId }));
  const id = String(consulta(`SELECT id FROM creditos WHERE transaction_id='${transactionId}'`)[0]?.id);
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

// ---------- Correcciones de la revisión RDD de T4 ----------

async function tokenNuevo() {
  const t = await leer(await fetch(`${BASE}/api/portal/maquinas/agua-01/token`, { method: "POST", headers: PORTAL }));
  return { Authorization: `Bearer ${t.token}` };
}

function abreWebSocket(url: string) {
  return new Promise<boolean>((ok) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => {
      ws.close();
      ok(true);
    });
    ws.addEventListener("error", () => ok(false));
  });
}

test("el WebSocket del portal pide un boleto de corta vida, no la clave maestra", async () => {
  const ws = BASE.replace(/^http/, "ws");
  assert.equal(await abreWebSocket(`${ws}/api/portal/en-vivo?token=${encodeURIComponent(vars.PORTAL_TOKEN)}`), false);
  assert.equal((await fetch(`${BASE}/api/portal/boleto`, { method: "POST" })).status, 401);
  const { boleto } = await leer(await fetch(`${BASE}/api/portal/boleto`, { method: "POST", headers: PORTAL }));
  assert.equal(await abreWebSocket(`${ws}/api/portal/en-vivo?boleto=${encodeURIComponent(boleto)}`), true);
});

test("un cuerpo JSON que no es objeto da 400, no 500", async () => {
  const put = await fetch(`${BASE}/api/portal/maquinas/agua-01`, { method: "PUT", headers: PORTAL, body: "null" });
  assert.equal(put.status, 400);
  const contacto = await fetch(`${BASE}/api/contacto`, { method: "POST", headers: { "content-type": "application/json" }, body: "null" });
  assert.equal(contacto.status, 400);
});

test("el pulso de prueba exige un número de pulsos válido", async () => {
  const cuerpos = ["", "{malo", "null", '{"pulsos":true}', '{"pulsos":[2]}', '{"pulsos":0}', '{"pulsos":21}'];
  for (const cuerpo of cuerpos) {
    const r = await fetch(`${BASE}/api/portal/maquinas/agua-01/prueba`, { method: "POST", headers: PORTAL, body: cuerpo });
    assert.equal(r.status, 400, `con ${cuerpo}`);
  }
});

test("un pulso de prueba vencido no aparece como pago por devolver", async () => {
  const p = await leer(await fetch(`${BASE}/api/portal/maquinas/agua-01/prueba`, { method: "POST", headers: PORTAL, body: '{"pulsos":1}' }));
  sql(`UPDATE creditos SET creado_en='2020-01-01T00:00:00.000Z' WHERE id='${p.id}'`);
  await fetch(`${BASE}/__scheduled?cron=*+*+*+*+*`);
  const d = await leer(await fetch(`${BASE}/api/portal/resumen`, { headers: PORTAL }));
  assert.equal(d.porAtender.some((c: { id: string }) => c.id === p.id), false);
  assert.equal((await fetch(`${BASE}/api/portal/creditos/${p.id}/devuelto`, { method: "POST", headers: PORTAL })).status, 404);
});

test("si la máquina entrega un crédito ya devuelto, el ACK se acepta y queda anotado", async () => {
  const modulo = await tokenNuevo();
  await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, avisoDePago({ montoCentavos: 1300, codiQrId: QR }));
  const id = /CREDITO (\S+)/.exec(await (await fetch(`${BASE}/device/poll?espera=0`, { headers: modulo })).text())?.[1];
  assert.ok(id);
  sql(`UPDATE creditos SET creado_en='2020-01-01T00:00:00.000Z' WHERE id='${id}'`);
  await fetch(`${BASE}/__scheduled?cron=*+*+*+*+*`);
  assert.equal((await fetch(`${BASE}/api/portal/creditos/${id}/devuelto`, { method: "POST", headers: PORTAL })).status, 200);
  const ack = await fetch(`${BASE}/device/ack?id=${id}`, { method: "POST", headers: modulo });
  assert.equal(ack.status, 200);
  assert.equal(await ack.text(), "OK\n");
  const [fila] = consulta(`SELECT estado, nota FROM creditos WHERE id='${id}'`);
  assert.equal(fila.estado, "devuelto");
  assert.match(String(fila.nota), /entregó después/);
});

test("después de consultar, el portal ve la máquina en línea", async () => {
  const modulo = await tokenNuevo();
  sql(`UPDATE maquinas SET ultima_conexion=NULL WHERE id='agua-01'`);
  assert.equal((await fetch(`${BASE}/device/poll?espera=0`, { headers: modulo })).status, 204);
  const d = await leer(await fetch(`${BASE}/api/portal/resumen`, { headers: PORTAL }));
  assert.equal(d.maquinas.find((m: { id: string }) => m.id === "agua-01")?.enLinea, true);
});

test("el formulario de contacto limita envíos repetidos y cuerpos enormes", async () => {
  const enviar = () =>
    fetch(`${BASE}/api/contacto`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre: "Prueba e2e límite", telefono: "5512345678" }),
    });
  const estados: number[] = [];
  for (let i = 0; i < 6; i++) estados.push((await enviar()).status);
  assert.ok(estados.includes(429), `estados: ${estados.join(", ")}`);
  const enorme = await fetch(`${BASE}/api/contacto`, { method: "POST", headers: { "content-type": "application/json" }, body: "x".repeat(10_000) });
  assert.equal(enorme.status, 413);
});

// ---------- Correcciones de la revisión RDD de la corrección de T4 ----------

test("el ACK de un crédito sin servicio (nunca se mandó) da 404", async () => {
  const modulo = await tokenNuevo();
  const transactionId = "SIMTX-MENOS-" + randomBytes(4).toString("hex");
  await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, avisoDePago({ montoCentavos: 500, codiQrId: QR, transactionId }));
  const [fila] = consulta(`SELECT id, estado FROM creditos WHERE transaction_id='${transactionId}'`);
  assert.equal(fila.estado, "sin-servicio");
  const ack = await fetch(`${BASE}/device/ack?id=${fila.id}`, { method: "POST", headers: modulo });
  assert.equal(ack.status, 404);
});

// ---------- T7: entregas interrumpidas (corte de luz a media entrega) ----------

test("si el módulo avisa que la entrega se interrumpió, el pago queda por atender", async () => {
  const modulo = await tokenNuevo();
  const transactionId = "SIMTX-CORTE-" + randomBytes(4).toString("hex");
  await enviarAviso(`${BASE}/webhooks/pey`, SECRETO, avisoDePago({ montoCentavos: 1300, codiQrId: QR, transactionId }));
  const id = /CREDITO (\S+)/.exec(await (await fetch(`${BASE}/device/poll?espera=0`, { headers: modulo })).text())?.[1];
  assert.ok(id);
  const ack = await fetch(`${BASE}/device/ack?id=${id}&parcial=1`, { method: "POST", headers: modulo });
  assert.equal(await ack.text(), "OK\n");
  assert.equal((await fetch(`${BASE}/device/poll?espera=0`, { headers: modulo })).status, 204, "no se vuelve a mandar");
  const d = await leer(await fetch(`${BASE}/api/portal/resumen`, { headers: PORTAL }));
  const fila = d.porAtender.find((c: { id: string }) => c.id === id);
  assert.equal(fila?.estado, "entregado");
  assert.equal(fila?.interrumpido, 1);
  assert.equal((await fetch(`${BASE}/api/portal/creditos/${id}/devuelto`, { method: "POST", headers: PORTAL })).status, 200);
});
