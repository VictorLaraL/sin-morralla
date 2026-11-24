// Sin Morralla — Worker de Cloudflare.
// Los archivos de /web se sirven como assets; este Worker atiende /api, /webhooks y /device.

export default {
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/salud") {
      return Response.json({ ok: true, servicio: "sin-morralla" });
    }
    return Response.json({ error: "No encontrado" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
