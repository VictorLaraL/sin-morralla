// Respuestas HTTP comunes del Worker.

export function json(datos: unknown, status = 200): Response {
  return Response.json(datos, { status, headers: { "cache-control": "no-store" } });
}

export function texto(cuerpo: string, status = 200): Response {
  return new Response(cuerpo, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

/** Lee el valor de `Authorization: Bearer <token>`, o cadena vacía. */
export function tokenBearer(request: Request): string {
  const valor = request.headers.get("authorization") ?? "";
  return valor.startsWith("Bearer ") ? valor.slice(7).trim() : "";
}

export function log(evento: string, datos: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ evento, ...datos }));
}

export const esperar = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));
