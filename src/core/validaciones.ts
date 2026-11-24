// Validaciones de lo que llega del portal y de la landing.

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

export interface ConfigMaquina {
  nombre: string;
  ubicacion: string;
  /** Monto del QR fijo; 0 = el cliente escribe el monto. */
  precioCentavos: number;
  valorPulsoCentavos: number;
  pulsoMs: number;
  pausaMs: number;
  maxPulsos: number;
  requiereBoton: boolean;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function entero(valor: unknown, min: number, max: number): number | null {
  const n = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() !== "" ? Number(valor) : Number.NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export function validarConfigMaquina(e: unknown): Resultado<ConfigMaquina> {
  if (!esObjeto(e)) return { ok: false, error: "Formato inválido" };
  const nombre = String(e.nombre ?? "").trim();
  if (!nombre || nombre.length > 60) return { ok: false, error: "Escribe un nombre de hasta 60 caracteres" };
  const ubicacion = String(e.ubicacion ?? "").trim();
  if (ubicacion.length > 80) return { ok: false, error: "La ubicación puede tener hasta 80 caracteres" };

  const precioCentavos = entero(e.precioCentavos, 0, 1_000_000);
  if (precioCentavos === null) {
    return { ok: false, error: "El precio va en centavos, entre 0 y 1,000,000 (0 = el cliente escribe el monto)" };
  }
  const valorPulsoCentavos = entero(e.valorPulsoCentavos, 1, 100_000);
  if (valorPulsoCentavos === null) return { ok: false, error: "El valor del pulso debe ser de al menos 1 centavo" };
  const pulsoMs = entero(e.pulsoMs, 10, 500);
  if (pulsoMs === null) return { ok: false, error: "El ancho del pulso debe estar entre 10 y 500 ms" };
  const pausaMs = entero(e.pausaMs, 10, 1000);
  if (pausaMs === null) return { ok: false, error: "La pausa entre pulsos debe estar entre 10 y 1000 ms" };
  const maxPulsos = entero(e.maxPulsos, 1, 500);
  if (maxPulsos === null) return { ok: false, error: "El tope de pulsos por pago debe estar entre 1 y 500" };

  return {
    ok: true,
    valor: { nombre, ubicacion, precioCentavos, valorPulsoCentavos, pulsoMs, pausaMs, maxPulsos, requiereBoton: e.requiereBoton === true },
  };
}

export interface Contacto {
  nombre: string;
  telefono: string | null;
  correo: string | null;
  mensaje: string | null;
}

export function validarContacto(e: unknown): Resultado<Contacto> {
  if (!esObjeto(e)) return { ok: false, error: "Formato inválido" };
  const nombre = String(e.nombre ?? "").trim();
  const telefono = String(e.telefono ?? "").trim();
  const correo = String(e.correo ?? "").trim();
  const mensaje = String(e.mensaje ?? "").trim();

  if (!nombre || nombre.length > 80) return { ok: false, error: "Escribe tu nombre" };
  if (!telefono && !correo) return { ok: false, error: "Déjanos un teléfono o un correo para responderte" };
  if (telefono && !/^[0-9+()\s-]{7,20}$/.test(telefono)) return { ok: false, error: "Revisa el teléfono" };
  if (correo && (correo.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))) return { ok: false, error: "Revisa el correo" };
  if (mensaje.length > 1000) return { ok: false, error: "El mensaje puede tener hasta 1000 caracteres" };

  return { ok: true, valor: { nombre, telefono: telefono || null, correo: correo || null, mensaje: mensaje || null } };
}

/** Inicio del día en la Ciudad de México (UTC-6 todo el año desde 2022), en ISO UTC. */
export function inicioDelDiaCdmx(fecha = new Date()): string {
  const cdmx = new Date(fecha.getTime() - 6 * 3_600_000);
  return new Date(Date.UTC(cdmx.getUTCFullYear(), cdmx.getUTCMonth(), cdmx.getUTCDate(), 6)).toISOString();
}

/** Minutos que un crédito espera a la máquina antes de vencer (TTL_CREDITO_MIN). Fuera de 1–1440 usa 10. */
export function vigenciaMinutos(valor: unknown): number {
  return entero(valor, 1, 1440) ?? 10;
}

/** Pulsos de prueba desde el portal: mueven hardware real, así que solo se acepta un entero de 1 a 20. */
export function validarPulsosPrueba(e: unknown): Resultado<number> {
  const pulsos = esObjeto(e) ? e.pulsos : undefined;
  if (typeof pulsos !== "number" || !Number.isInteger(pulsos) || pulsos < 1 || pulsos > 20) {
    return { ok: false, error: "Indica entre 1 y 20 pulsos" };
  }
  return { ok: true, valor: pulsos };
}

/** Para el jurado: la clave de rastreo SPEI se muestra solo con sus últimos 4 caracteres. */
export function enmascararRastreo(clave: string | null): string | null {
  if (!clave) return null;
  return clave.length <= 4 ? "••••" : `••••${clave.slice(-4)}`;
}

/** Página pedida en una lista del portal: entero de 1 a 10000; cualquier otra cosa es la página 1. */
export function paginaPedida(valor: unknown): number {
  // Solo dígitos: Number() aceptaría "1e3" o " 0x10 ".
  const texto = typeof valor === "number" ? String(valor) : typeof valor === "string" ? valor.trim() : "";
  return /^\d{1,5}$/.test(texto) ? (entero(texto, 1, 10_000) ?? 1) : 1;
}

export function totalPaginas(total: number, tamano: number): number {
  return Math.max(1, Math.ceil(total / tamano));
}
