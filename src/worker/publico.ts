// Rutas públicas de la landing: la demo en vivo y el formulario de contacto.
//
// GET  /api/demo           QR de la máquina demo y cuántos pagos lleva hoy (sin datos personales).
// GET  /api/demo/en-vivo   WebSocket: avisa cada pago a la demo para llenar el garrafón.
// POST /api/demo/simular   Solo con SIMULACION=1: manda un aviso firmado por el mismo camino que pey.
// POST /api/contacto       "Quiero probarlo en mi máquina".

import { firmarAviso } from "../core/firma.ts";
import { generarId } from "../core/tokens.ts";
import { inicioDelDiaCdmx, validarContacto } from "../core/validaciones.ts";
import { maquina, type FilaMaquina } from "./db.ts";
import { json } from "./http.ts";
import { crearQrFijo } from "./pey.ts";
import { manejarAviso, type PagoProcesado } from "./webhook.ts";

export async function estadisticasDemo(db: D1Database) {
  const fila = await db
    .prepare(
      `SELECT COUNT(*) AS pagos, COALESCE(SUM(monto_centavos), 0) AS total, MAX(fecha_pago) AS ultimo
       FROM pagos WHERE maquina_id = 'demo' AND fecha_pago >= ?`,
    )
    .bind(inicioDelDiaCdmx())
    .first<{ pagos: number; total: number; ultimo: string | null }>();
  return { pagosHoy: fila?.pagos ?? 0, totalHoyCentavos: fila?.total ?? 0, ultimoPago: fila?.ultimo ?? null };
}

async function demoConQr(env: Env): Promise<FilaMaquina | null> {
  const m = await maquina(env.DB, "demo");
  if (!m) return null;
  // En local, la demo crea sola su QR simulado. En producción el QR real se genera desde el portal.
  if (!m.qr_id && env.SIMULACION === "1") {
    const qr = await crearQrFijo(env, { montoCentavos: m.precio_centavos, concepto: "Demo Sin Morralla", metadata: { maquina: "demo" } });
    await env.DB.prepare("UPDATE maquinas SET qr_id = ?, qr_string = ?, qr_monto_centavos = ? WHERE id = 'demo'")
      .bind(qr.id, qr.qrString, m.precio_centavos)
      .run();
    return { ...m, qr_id: qr.id, qr_string: qr.qrString, qr_monto_centavos: m.precio_centavos };
  }
  return m;
}

export async function manejarPublico(
  request: Request,
  env: Env,
  url: URL,
  alProcesar: (r: PagoProcesado) => Promise<void>,
  conectar: (canal: "demo") => Promise<Response>,
): Promise<Response> {
  const metodo = request.method;

  if (metodo === "GET" && url.pathname === "/api/demo") {
    const m = await demoConQr(env);
    if (!m) return json({ error: "La demo no está configurada" }, 503);
    return json({
      montoCentavos: m.qr_monto_centavos ?? m.precio_centavos,
      qrString: m.qr_string,
      simulacion: env.SIMULACION === "1",
      ...(await estadisticasDemo(env.DB)),
    });
  }

  if (metodo === "GET" && url.pathname === "/api/demo/en-vivo") return conectar("demo");

  if (metodo === "POST" && url.pathname === "/api/demo/simular") {
    if (env.SIMULACION !== "1") return json({ error: "No encontrado" }, 404);
    const m = await demoConQr(env);
    if (!m?.qr_id) return json({ error: "La demo no tiene QR" }, 503);
    const cuerpo = JSON.stringify({
      type: "codi.qr.payment_received",
      amount: (m.qr_monto_centavos ?? m.precio_centavos) / 100,
      codiQrId: m.qr_id,
      concept: "Demo Sin Morralla (simulado)",
      datePaid: Math.floor(Date.now() / 1000),
      metadata: { trackingKey: "SIMULADO", externalMetadata: { maquina: "demo" } },
      transactionId: generarId("SIMTX"),
    });
    const id = generarId("msg_sim");
    const ts = Math.floor(Date.now() / 1000);
    const aviso = new Request(new URL("/webhooks/pey", url), {
      method: "POST",
      body: cuerpo,
      headers: {
        "content-type": "application/json",
        "webhook-id": id,
        "webhook-timestamp": String(ts),
        "webhook-signature": await firmarAviso(env.PEY_WEBHOOK_SECRET, id, ts, cuerpo),
      },
    });
    return manejarAviso(aviso, env, alProcesar);
  }

  if (metodo === "POST" && url.pathname === "/api/contacto") {
    const texto = await request.text();
    if (texto.length > 4096) return json({ error: "Mensaje demasiado largo" }, 413);
    let datos: Record<string, unknown>;
    try {
      datos = JSON.parse(texto);
    } catch {
      return json({ error: "Formato inválido" }, 400);
    }
    // Campo trampa invisible: las personas lo dejan vacío, los bots lo llenan.
    if (String(datos.sitio ?? "").trim()) return json({ ok: true });
    const contacto = validarContacto(datos);
    if (!contacto.ok) return json({ error: contacto.error }, 400);
    const c = contacto.valor;
    await env.DB.prepare("INSERT INTO contactos (nombre, telefono, correo, mensaje, creado_en) VALUES (?, ?, ?, ?, ?)")
      .bind(c.nombre, c.telefono, c.correo, c.mensaje, new Date().toISOString())
      .run();
    return json({ ok: true });
  }

  return json({ error: "No encontrado" }, 404);
}
