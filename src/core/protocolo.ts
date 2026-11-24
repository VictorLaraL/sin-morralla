// Protocolo de texto entre el servidor y el ESP32: fácil de leer en C sin librerías de JSON.
//
//   GET /device/poll  ->  200 "CREDITO <id> <pulsos> <pulso_ms> <pausa_ms> <requiere_boton 0|1>\n"
//                     ->  204 sin cuerpo (no hubo pagos durante la espera)
//   POST /device/ack?id=<id>  ->  200 "OK\n"

export interface LineaCredito {
  id: string;
  pulsos: number;
  pulsoMs: number;
  pausaMs: number;
  requiereBoton: boolean;
}

export function lineaCredito(c: LineaCredito): string {
  return `CREDITO ${c.id} ${c.pulsos} ${c.pulsoMs} ${c.pausaMs} ${c.requiereBoton ? 1 : 0}\n`;
}

export function leerLineaCredito(texto: string): LineaCredito | null {
  const m = /^CREDITO (\S+) (\d+) (\d+) (\d+) ([01])\s*$/.exec(texto);
  if (!m) return null;
  return { id: m[1], pulsos: Number(m[2]), pulsoMs: Number(m[3]), pausaMs: Number(m[4]), requiereBoton: m[5] === "1" };
}
