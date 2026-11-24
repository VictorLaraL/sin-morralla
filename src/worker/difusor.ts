// Difusor: reparte eventos en vivo a la landing (canal "demo") y al portal (canal "portal").
//
// Usa la API de WebSockets con hibernación: mientras nadie habla, el Durable Object duerme y no consume
// tiempo de cómputo. Hay una sola instancia ("principal") porque hoy el sistema tiene un solo cliente;
// con varios clientes se usaría una instancia por cliente (getByName(clienteId)).

import { DurableObject } from "cloudflare:workers";

export type Canal = "demo" | "portal";
const CANALES: Canal[] = ["demo", "portal"];

export class Difusor extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Responde "ping" sin despertar al objeto.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  /** Solo recibe upgrades que el Worker ya autorizó; el canal llega en el encabezado x-canal. */
  async fetch(request: Request): Promise<Response> {
    const canal = request.headers.get("x-canal") as Canal | null;
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket" || !canal || !CANALES.includes(canal)) {
      return new Response("Se espera un WebSocket", { status: 426 });
    }
    const par = new WebSocketPair();
    const [cliente, servidor] = Object.values(par);
    this.ctx.acceptWebSocket(servidor, [canal]);
    return new Response(null, { status: 101, webSocket: cliente });
  }

  /** Manda un evento a todos los conectados a un canal. Regresa a cuántos llegó. */
  async difundir(canal: Canal, evento: Record<string, unknown>): Promise<number> {
    const mensaje = JSON.stringify(evento);
    let enviados = 0;
    for (const ws of this.ctx.getWebSockets(canal)) {
      try {
        ws.send(mensaje);
        enviados++;
      } catch {
        // Conexión ya cerrada: el runtime la limpia.
      }
    }
    return enviados;
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code, "cerrado");
    } catch {
      // Ya estaba cerrada.
    }
  }
}
