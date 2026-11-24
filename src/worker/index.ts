// Sin Morralla — Worker de Cloudflare.
// Los archivos de /web se sirven como assets; este Worker atiende /api, /webhooks y /device,
// y cada minuto vence los créditos que ninguna máquina recogió.

import { vencerCreditos } from "./db.ts";
import type { Canal } from "./difusor.ts";
import { limiteVigencia, manejarDispositivo } from "./dispositivo.ts";
import { json, log } from "./http.ts";
import { manejarPortal } from "./portal.ts";
import { estadisticasDemo, manejarPublico } from "./publico.ts";
import { manejarAviso, type PagoProcesado } from "./webhook.ts";

export { Difusor } from "./difusor.ts";

function difusor(env: Env) {
  return env.DIFUSOR.getByName("principal");
}

/** Abre un WebSocket del canal indicado (la autorización ya se hizo antes de llamar). */
function conectar(request: Request, env: Env, canal: Canal): Promise<Response> {
  const encabezados = new Headers(request.headers);
  encabezados.set("x-canal", canal);
  return difusor(env).fetch(request.url, { headers: encabezados });
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    // Después de registrar un pago: avisar en vivo al portal y, si es la demo, a la landing.
    const alProcesar = async (r: PagoProcesado) => {
      const evento = {
        tipo: "pago",
        maquinaId: r.maquina?.id ?? null,
        maquinaNombre: r.maquina?.nombre ?? null,
        montoCentavos: r.montoCentavos,
        pulsos: r.credito?.pulsos ?? 0,
        estado: r.credito?.estado ?? "sin-maquina",
        fecha: r.fechaPago,
      };
      ctx.waitUntil(difusor(env).difundir("portal", evento));
      if (r.maquina?.virtual === 1) {
        const stats = await estadisticasDemo(env.DB);
        ctx.waitUntil(difusor(env).difundir("demo", { tipo: "pago", montoCentavos: r.montoCentavos, fecha: r.fechaPago, ...stats }));
      }
    };

    try {
      if (url.pathname === "/api/salud") return json({ ok: true, servicio: "sin-morralla" });
      if (url.pathname === "/webhooks/pey" && request.method === "POST") return await manejarAviso(request, env, alProcesar);
      if (url.pathname.startsWith("/device/")) {
        return await manejarDispositivo(request, env, url, async (m, c) => {
          ctx.waitUntil(difusor(env).difundir("portal", { tipo: "credito", maquinaId: m.id, id: c.id, estado: c.estado, pulsos: c.pulsos }));
        });
      }
      if (url.pathname.startsWith("/api/portal/")) return await manejarPortal(request, env, url, (canal) => conectar(request, env, canal));
      if (url.pathname.startsWith("/api/")) {
        return await manejarPublico(request, env, url, alProcesar, (canal) => conectar(request, env, canal));
      }
      return json({ error: "No encontrado" }, 404);
    } catch (error) {
      log("error", { ruta: url.pathname, mensaje: error instanceof Error ? error.message : String(error) });
      return json({ ok: false, error: "Error interno" }, 500);
    }
  },

  async scheduled(_controlador, env, ctx): Promise<void> {
    const vencidos = await vencerCreditos(env.DB, limiteVigencia(env));
    for (const c of vencidos) {
      log("credito_vencido", { maquina: c.maquina_id, credito: c.id });
      ctx.waitUntil(difusor(env).difundir("portal", { tipo: "credito", maquinaId: c.maquina_id, id: c.id, estado: c.estado, pulsos: c.pulsos }));
    }
  },
} satisfies ExportedHandler<Env>;
