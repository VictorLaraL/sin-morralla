// API del portal del dueño (un solo cliente). Todo exige la clave PORTAL_TOKEN.
//
// GET  /api/portal/resumen                   máquinas, ventas de hoy y de la semana, pagos y créditos por atender
// POST /api/portal/boleto                    boleto de 60 s para abrir el WebSocket (la clave no va en la URL)
// GET  /api/portal/en-vivo?boleto=…           WebSocket con los pagos y entregas en vivo
// PUT  /api/portal/maquinas/:id              configuración (precio, pulsos, botón)
// POST /api/portal/maquinas/:id/qr           crea el QR fijo de la máquina en pey
// POST /api/portal/maquinas/:id/token        genera el token del módulo ESP32 (se muestra una sola vez)
// POST /api/portal/maquinas/:id/prueba       manda pulsos de prueba sin pago
// POST /api/portal/creditos/:id/devuelto     marca un pago por atender como devuelto
// POST /api/portal/creditos/:id/atendido     cierra una entrega interrumpida: el cliente sí recibió todo
// GET  /api/portal/contactos                 interesados que dejaron sus datos en la landing

import { compararSecreto, firmarBoleto, generarToken, sha256Hex, verificarBoleto } from "../core/tokens.ts";
import { inicioDelDiaCdmx, validarConfigMaquina, validarPulsosPrueba } from "../core/validaciones.ts";
import { crearCreditoPrueba, maquina, type FilaMaquina } from "./db.ts";
import { json, log, tokenBearer } from "./http.ts";
import { crearQrFijo } from "./pey.ts";

// El módulo late cada 20 s como mínimo (LATIDO_MS); 90 s deja margen para una consulta larga y una reconexión.
const EN_LINEA_MS = 90_000;

async function leerJson(request: Request): Promise<unknown> {
  try {
    return JSON.parse(await request.text());
  } catch {
    return undefined;
  }
}

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
      `SELECT c.*, m.nombre AS maquina_nombre, p.clave_rastreo, p.fecha_pago
       FROM creditos c JOIN maquinas m ON m.id = c.maquina_id LEFT JOIN pagos p ON p.transaction_id = c.transaction_id
       WHERE c.origen = 'codi' AND (c.estado IN ('vencido', 'sin-servicio') OR (c.estado = 'entregado' AND c.interrumpido = 1))
       ORDER BY c.creado_en DESC LIMIT 50`,
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
  const metodo = request.method;

  // El navegador no puede mandar encabezados al abrir un WebSocket: ahí se usa un boleto de corta vida.
  if (url.pathname === "/api/portal/en-vivo") {
    if (!(await verificarBoleto(env.PORTAL_TOKEN, url.searchParams.get("boleto") ?? ""))) return json({ error: "Boleto inválido" }, 401);
    return conectar("portal");
  }
  if (!(await compararSecreto(tokenBearer(request), env.PORTAL_TOKEN))) return json({ error: "Clave incorrecta" }, 401);

  if (metodo === "POST" && url.pathname === "/api/portal/boleto") {
    const venceSeg = Math.floor(Date.now() / 1000) + 60;
    return json({ boleto: await firmarBoleto(env.PORTAL_TOKEN, venceSeg), venceEn: new Date(venceSeg * 1000).toISOString() });
  }
  if (metodo === "GET" && url.pathname === "/api/portal/resumen") return json(await resumen(env.DB));
  if (metodo === "GET" && url.pathname === "/api/portal/contactos") {
    const r = await env.DB.prepare("SELECT * FROM contactos ORDER BY creado_en DESC LIMIT 100").all();
    return json(r.results);
  }

  const devuelto = /^\/api\/portal\/creditos\/(c_[0-9a-f]{12})\/devuelto$/.exec(url.pathname);
  if (metodo === "POST" && devuelto) {
    const r = await env.DB.prepare(
      `UPDATE creditos SET estado = 'devuelto' WHERE id = ? AND origen = 'codi'
         AND (estado IN ('vencido', 'sin-servicio') OR (estado = 'entregado' AND interrumpido = 1)) RETURNING id`,
    )
      .bind(devuelto[1])
      .first();
    return r ? json({ ok: true }) : json({ error: "Ese pago no está por atender" }, 404);
  }

  const atendido = /^\/api\/portal\/creditos\/(c_[0-9a-f]{12})\/atendido$/.exec(url.pathname);
  if (metodo === "POST" && atendido) {
    // interrumpido = 2: el dueño ya lo revisó con el cliente. No se registra una devolución que no ocurrió.
    const r = await env.DB.prepare(
      `UPDATE creditos SET interrumpido = 2, nota = 'Entrega interrumpida revisada: el cliente recibió todo'
       WHERE id = ? AND origen = 'codi' AND estado = 'entregado' AND interrumpido = 1 RETURNING id`,
    )
      .bind(atendido[1])
      .first();
    return r ? json({ ok: true }) : json({ error: "Esa entrega no está por revisar" }, 404);
  }

  const ruta = /^\/api\/portal\/maquinas\/([a-z0-9-]{1,40})(?:\/(qr|token|prueba))?$/.exec(url.pathname);
  if (!ruta) return json({ error: "No encontrado" }, 404);
  const m = await maquina(env.DB, ruta[1]);
  if (!m) return json({ error: "No existe esa máquina" }, 404);
  const accion = ruta[2];

  if (metodo === "PUT" && !accion) {
    const config = validarConfigMaquina(await leerJson(request));
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
    let qr;
    try {
      qr = await crearQrFijo(env, { montoCentavos: m.precio_centavos, concepto: m.nombre, metadata: { maquina: m.id } });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      log("qr_fallido", { maquina: m.id, mensaje });
      return json({ error: `No se pudo crear el QR en pey: ${mensaje}` }, 502);
    }
    // Si la escritura en D1 fallara, el log permite recuperar el QR ya creado en pey (sus pagos llegan igual por la metadata).
    log("qr_recibido", { maquina: m.id, qrId: qr.id, simulado: qr.simulado });
    await env.DB.prepare("UPDATE maquinas SET qr_id = ?, qr_string = ?, qr_monto_centavos = ? WHERE id = ?")
      .bind(qr.id, qr.qrString, m.precio_centavos, m.id)
      .run();
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
    const pulsos = validarPulsosPrueba(await leerJson(request));
    if (!pulsos.ok) return json({ error: pulsos.error }, 400);
    return json(await crearCreditoPrueba(env.DB, m, pulsos.valor, new Date().toISOString()), 201);
  }

  return json({ error: "No encontrado" }, 404);
}
