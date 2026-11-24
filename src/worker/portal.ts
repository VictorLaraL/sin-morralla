// API del portal del dueño (un solo cliente). Todo exige la clave PORTAL_TOKEN.
//
// GET  /api/portal/resumen                   máquinas, ventas de hoy y de la semana, pagos y créditos por atender
// GET  /api/portal/en-vivo?token=…            WebSocket con los pagos y entregas en vivo
// PUT  /api/portal/maquinas/:id              configuración (precio, pulsos, botón)
// POST /api/portal/maquinas/:id/qr           crea el QR fijo de la máquina en pey
// POST /api/portal/maquinas/:id/token        genera el token del módulo ESP32 (se muestra una sola vez)
// POST /api/portal/maquinas/:id/prueba       manda pulsos de prueba sin pago
// POST /api/portal/creditos/:id/devuelto     marca un pago por atender como devuelto
// GET  /api/portal/contactos                 interesados que dejaron sus datos en la landing

import { compararSecreto, generarToken, sha256Hex } from "../core/tokens.ts";
import { inicioDelDiaCdmx, validarConfigMaquina } from "../core/validaciones.ts";
import { crearCreditoPrueba, maquina, type FilaMaquina } from "./db.ts";
import { json, log, tokenBearer } from "./http.ts";
import { crearQrFijo } from "./pey.ts";

const EN_LINEA_MS = 60_000;

function vistaMaquina(m: FilaMaquina, hoy: { pagos: number; total: number } | undefined, ahora: number) {
  return {
    id: m.id,
    nombre: m.nombre,
    ubicacion: m.ubicacion,
    virtual: m.virtual === 1,
    precioCentavos: m.precio_centavos,
    valorPulsoCentavos: m.valor_pulso_centavos,
    pulsoMs: m.pulso_ms,
    pausaMs: m.pausa_ms,
    maxPulsos: m.max_pulsos,
    requiereBoton: m.requiere_boton === 1,
    qrString: m.qr_string,
    qrMontoCentavos: m.qr_monto_centavos,
    qrDesactualizado: m.qr_id !== null && m.qr_monto_centavos !== m.precio_centavos,
    tieneToken: m.token_hash !== null,
    enLinea: m.ultima_conexion !== null && ahora - Date.parse(m.ultima_conexion) < EN_LINEA_MS,
    ultimaConexion: m.ultima_conexion,
    hoy: { pagos: hoy?.pagos ?? 0, totalCentavos: hoy?.total ?? 0 },
  };
}

async function resumen(db: D1Database) {
  const ahora = Date.now();
  const desdeHoy = inicioDelDiaCdmx();
  const desdeSemana = new Date(Date.parse(desdeHoy) - 6 * 86_400_000).toISOString();

  const [maquinas, porMaquina, semana, recientes, porAtender, contactos] = await db.batch([
    db.prepare("SELECT * FROM maquinas ORDER BY virtual, id"),
    db.prepare("SELECT maquina_id, COUNT(*) AS pagos, SUM(monto_centavos) AS total FROM pagos WHERE fecha_pago >= ? GROUP BY maquina_id").bind(desdeHoy),
    db.prepare("SELECT COUNT(*) AS pagos, COALESCE(SUM(monto_centavos), 0) AS total FROM pagos WHERE fecha_pago >= ?").bind(desdeSemana),
    db.prepare(
      `SELECT p.transaction_id, p.maquina_id, m.nombre AS maquina_nombre, p.monto_centavos, p.fecha_pago, p.clave_rastreo,
              c.estado AS credito_estado, c.pulsos
       FROM pagos p LEFT JOIN maquinas m ON m.id = p.maquina_id LEFT JOIN creditos c ON c.transaction_id = p.transaction_id
       ORDER BY p.fecha_pago DESC LIMIT 30`,
    ),
    db.prepare(
      `SELECT c.*, m.nombre AS maquina_nombre FROM creditos c JOIN maquinas m ON m.id = c.maquina_id
       WHERE c.estado IN ('vencido', 'sin-servicio') ORDER BY c.creado_en DESC LIMIT 50`,
    ),
    db.prepare("SELECT COUNT(*) AS n FROM contactos"),
  ]);

  const hoyPorMaquina = new Map(
    (porMaquina.results as Array<{ maquina_id: string; pagos: number; total: number }>).map((f) => [f.maquina_id, f]),
  );
  const filasHoy = [...hoyPorMaquina.values()];
  const s = semana.results[0] as { pagos: number; total: number };
  return {
    maquinas: (maquinas.results as unknown as FilaMaquina[]).map((m) => vistaMaquina(m, hoyPorMaquina.get(m.id), ahora)),
    hoy: { pagos: filasHoy.reduce((a, f) => a + f.pagos, 0), totalCentavos: filasHoy.reduce((a, f) => a + (f.total ?? 0), 0) },
    semana: { pagos: s.pagos, totalCentavos: s.total },
    pagosRecientes: recientes.results,
    porAtender: porAtender.results,
    contactos: (contactos.results[0] as { n: number }).n,
  };
}

export async function manejarPortal(
  request: Request,
  env: Env,
  url: URL,
  conectar: (canal: "portal") => Promise<Response>,
): Promise<Response> {
  if (!env.PORTAL_TOKEN) return json({ error: "Falta configurar PORTAL_TOKEN" }, 503);
  // El navegador no puede mandar encabezados al abrir un WebSocket: ahí la clave va en ?token=.
  const recibido = url.pathname === "/api/portal/en-vivo" ? (url.searchParams.get("token") ?? "") : tokenBearer(request);
  if (!(await compararSecreto(recibido, env.PORTAL_TOKEN))) return json({ error: "Clave incorrecta" }, 401);

  const metodo = request.method;
  if (metodo === "GET" && url.pathname === "/api/portal/resumen") return json(await resumen(env.DB));
  if (metodo === "GET" && url.pathname === "/api/portal/en-vivo") return conectar("portal");
  if (metodo === "GET" && url.pathname === "/api/portal/contactos") {
    const r = await env.DB.prepare("SELECT * FROM contactos ORDER BY creado_en DESC LIMIT 100").all();
    return json(r.results);
  }

  const devuelto = /^\/api\/portal\/creditos\/(c_[0-9a-f]{12})\/devuelto$/.exec(url.pathname);
  if (metodo === "POST" && devuelto) {
    const r = await env.DB.prepare(
      "UPDATE creditos SET estado = 'devuelto' WHERE id = ? AND estado IN ('vencido', 'sin-servicio') RETURNING id",
    )
      .bind(devuelto[1])
      .first();
    return r ? json({ ok: true }) : json({ error: "Ese pago no está por atender" }, 404);
  }

  const ruta = /^\/api\/portal\/maquinas\/([a-z0-9-]{1,40})(?:\/(qr|token|prueba))?$/.exec(url.pathname);
  if (!ruta) return json({ error: "No encontrado" }, 404);
  const m = await maquina(env.DB, ruta[1]);
  if (!m) return json({ error: "No existe esa máquina" }, 404);
  const accion = ruta[2];

  if (metodo === "PUT" && !accion) {
    let datos: Record<string, unknown>;
    try {
      datos = await request.json();
    } catch {
      return json({ error: "Formato inválido" }, 400);
    }
    const config = validarConfigMaquina(datos);
    if (!config.ok) return json({ error: config.error }, 400);
    const c = config.valor;
    await env.DB.prepare(
      `UPDATE maquinas SET nombre = ?, ubicacion = ?, precio_centavos = ?, valor_pulso_centavos = ?, pulso_ms = ?, pausa_ms = ?,
         max_pulsos = ?, requiere_boton = ? WHERE id = ?`,
    )
      .bind(c.nombre, c.ubicacion || null, c.precioCentavos, c.valorPulsoCentavos, c.pulsoMs, c.pausaMs, c.maxPulsos, c.requiereBoton ? 1 : 0, m.id)
      .run();
    return json({ ok: true, qrDesactualizado: m.qr_id !== null && m.qr_monto_centavos !== c.precioCentavos });
  }

  if (metodo === "POST" && accion === "qr") {
    const qr = await crearQrFijo(env, { montoCentavos: m.precio_centavos, concepto: m.nombre, metadata: { maquina: m.id } });
    await env.DB.prepare("UPDATE maquinas SET qr_id = ?, qr_string = ?, qr_monto_centavos = ? WHERE id = ?")
      .bind(qr.id, qr.qrString, m.precio_centavos, m.id)
      .run();
    log("qr_creado", { maquina: m.id, simulado: qr.simulado });
    return json({ qrString: qr.qrString, qrMontoCentavos: m.precio_centavos, simulado: qr.simulado });
  }

  if (metodo === "POST" && accion === "token") {
    if (m.virtual === 1) return json({ error: "La máquina demo no tiene módulo" }, 400);
    const token = generarToken();
    await env.DB.prepare("UPDATE maquinas SET token_hash = ? WHERE id = ?").bind(await sha256Hex(token), m.id).run();
    log("token_generado", { maquina: m.id });
    return json({ token });
  }

  if (metodo === "POST" && accion === "prueba") {
    if (m.virtual === 1) return json({ error: "La máquina demo no tiene módulo" }, 400);
    let pulsos = 1;
    try {
      pulsos = Number(((await request.json()) as { pulsos?: unknown }).pulsos ?? 1);
    } catch {
      // Sin cuerpo: un pulso.
    }
    if (!Number.isInteger(pulsos) || pulsos < 1 || pulsos > 20) return json({ error: "Entre 1 y 20 pulsos" }, 400);
    return json(await crearCreditoPrueba(env.DB, m, pulsos, new Date().toISOString()), 201);
  }

  return json({ error: "No encontrado" }, 404);
}
