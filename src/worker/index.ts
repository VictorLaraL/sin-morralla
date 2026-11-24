// Sin Morralla — Worker de Cloudflare.
// Los archivos de /web se sirven como assets; este Worker atiende /api, /webhooks y /device.

import { manejarDispositivo } from "./dispositivo.ts";
import { json, log } from "./http.ts";
import { manejarAviso } from "./webhook.ts";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/salud") return json({ ok: true, servicio: "sin-morralla" });
      if (url.pathname === "/webhooks/pey" && request.method === "POST") return await manejarAviso(request, env);
      if (url.pathname.startsWith("/device/")) return await manejarDispositivo(request, env, url);
      return json({ error: "No encontrado" }, 404);
    } catch (error) {
      log("error", { ruta: url.pathname, mensaje: error instanceof Error ? error.message : String(error) });
      return json({ ok: false, error: "Error interno" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
