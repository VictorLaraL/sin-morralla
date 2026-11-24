// Convierte el aviso de pago de pey en un objeto propio, en centavos.
// Documentado en docs.pey.mx/docs/webhooks/codi/qr y /codi/pn.

export interface PagoRecibido {
  webhookId: string;
  /** qr = pagaron un QR; pn = aceptaron un cobro enviado al celular. */
  tipo: "qr" | "pn";
  transactionId: string;
  montoCentavos: number;
  concepto: string;
  /** IDC del QR pagado (solo en pagos por QR). Con él sabemos de qué máquina es el pago. */
  codiQrId: string | null;
  /** Clave de rastreo SPEI, útil para aclaraciones con el banco. */
  claveRastreo: string | null;
  fechaPago: string;
  /** Metadata que mandamos al crear el cobro, si pey la regresa. */
  metadata: Record<string, unknown>;
}

type Objeto = Record<string, unknown>;

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown): string | null {
  return valor === undefined || valor === null || valor === "" ? null : String(valor);
}

/**
 * Regresa null si el evento no es un pago CoDi recibido o le faltan datos.
 * Acepta los campos en la raíz (como en la documentación) o dentro de `data`.
 */
export function normalizarPago(webhookId: string, aviso: unknown, ahora = new Date()): PagoRecibido | null {
  if (!esObjeto(aviso)) return null;
  const datos: Objeto = esObjeto(aviso.data) ? { ...aviso.data, type: aviso.type ?? aviso.data.type } : aviso;

  const coincidencia = /^codi\.(qr|pn)\.payment_received$/.exec(String(datos.type ?? ""));
  if (!coincidencia) return null;

  const transactionId = texto(datos.transactionId);
  // Number(null) y Number("") dan 0: un aviso sin monto no debe pasar como pago de $0.
  if (datos.amount === undefined || datos.amount === null || datos.amount === "") return null;
  const monto = Number(datos.amount);
  if (!transactionId || !Number.isFinite(monto) || monto < 0) return null;

  const metadataPey = esObjeto(datos.metadata) ? datos.metadata : {};
  let nuestra: unknown = metadataPey.externalMetadata ?? {};
  if (typeof nuestra === "string") {
    try {
      nuestra = JSON.parse(nuestra);
    } catch {
      nuestra = {};
    }
  }

  // pey manda segundos Unix. Si llega algo fuera de rango (milisegundos, negativo, futuro lejano),
  // se usa la hora de recepción para no guardar fechas absurdas.
  const segundos = Number(datos.datePaid);
  const desde2020 = Date.UTC(2020, 0, 1) / 1000;
  const hastaManana = ahora.getTime() / 1000 + 86_400;
  const fechaPago = Number.isFinite(segundos) && segundos >= desde2020 && segundos <= hastaManana ? new Date(segundos * 1000) : ahora;

  return {
    webhookId,
    tipo: coincidencia[1] as "qr" | "pn",
    transactionId,
    montoCentavos: Math.round(monto * 100),
    concepto: String(datos.concept ?? ""),
    codiQrId: texto(datos.codiQrId),
    claveRastreo: texto(metadataPey.trackingKey),
    fechaPago: fechaPago.toISOString(),
    metadata: esObjeto(nuestra) ? nuestra : {},
  };
}
