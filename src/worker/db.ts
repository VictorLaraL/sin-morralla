// Acceso a D1. Toda la lógica de "una sola vez" descansa en las llaves únicas de la base.

import type { PagoRecibido } from "../core/pagos.ts";
import type { Credito } from "../core/pulsos.ts";
import { generarId } from "../core/tokens.ts";

export interface FilaMaquina {
  id: string;
  nombre: string;
  ubicacion: string | null;
  virtual: number;
  precio_centavos: number;
  valor_pulso_centavos: number;
  pulso_ms: number;
  pausa_ms: number;
  max_pulsos: number;
  requiere_boton: number;
  token_hash: string | null;
  qr_id: string | null;
  qr_string: string | null;
  qr_monto_centavos: number | null;
  ultima_conexion: string | null;
  creado_en: string;
}

export interface FilaCredito {
  id: string;
  maquina_id: string;
  transaction_id: string | null;
  monto_centavos: number;
  pulsos: number;
  excedente_centavos: number;
  origen: "codi" | "prueba";
  estado: "pendiente" | "entregado" | "vencido" | "sin-servicio" | "devuelto";
  nota: string | null;
  creado_en: string;
  entregado_en: string | null;
}

export function maquina(db: D1Database, id: string) {
  return db.prepare("SELECT * FROM maquinas WHERE id = ?").bind(id).first<FilaMaquina>();
}

export function maquinaPorQr(db: D1Database, qrId: string) {
  return db.prepare("SELECT * FROM maquinas WHERE qr_id = ?").bind(qrId).first<FilaMaquina>();
}

export function maquinaPorToken(db: D1Database, tokenHash: string) {
  return db.prepare("SELECT * FROM maquinas WHERE token_hash = ? AND virtual = 0").bind(tokenHash).first<FilaMaquina>();
}

export async function tocarMaquina(db: D1Database, id: string, ahora: string): Promise<void> {
  await db.prepare("UPDATE maquinas SET ultima_conexion = ? WHERE id = ?").bind(ahora, id).run();
}

/**
 * Registra el pago y su crédito en una sola transacción (batch de D1).
 * Si el pago ya existía (reintento de pey o aviso repetido), no se crea nada y `nuevo` es false.
 * En una máquina virtual (la demo) el crédito nace entregado: no hay hardware que lo recoja.
 */
export async function registrarPago(
  db: D1Database,
  pago: PagoRecibido,
  destino: { maquina: FilaMaquina; credito: Credito } | null,
  ahora: string,
): Promise<{ nuevo: boolean; credito: FilaCredito | null }> {
  const sentencias = [
    db
      .prepare(
        `INSERT INTO pagos (transaction_id, webhook_id, tipo, maquina_id, codi_qr_id, monto_centavos, concepto, clave_rastreo, fecha_pago, recibido_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (transaction_id) DO NOTHING`,
      )
      .bind(
        pago.transactionId,
        pago.webhookId,
        pago.tipo,
        destino?.maquina.id ?? null,
        pago.codiQrId,
        pago.montoCentavos,
        pago.concepto,
        pago.claveRastreo,
        pago.fechaPago,
        ahora,
      ),
  ];

  let credito: FilaCredito | null = null;
  if (destino) {
    const { maquina: m, credito: c } = destino;
    const virtual = m.virtual === 1;
    credito = {
      id: generarId("c"),
      maquina_id: m.id,
      transaction_id: pago.transactionId,
      monto_centavos: pago.montoCentavos,
      pulsos: c.pulsos,
      excedente_centavos: c.excedenteCentavos,
      origen: "codi",
      estado: c.pulsos === 0 ? "sin-servicio" : virtual ? "entregado" : "pendiente",
      nota: c.nota,
      creado_en: ahora,
      entregado_en: virtual && c.pulsos > 0 ? ahora : null,
    };
    sentencias.push(
      db
        .prepare(
          `INSERT INTO creditos (id, maquina_id, transaction_id, monto_centavos, pulsos, excedente_centavos, origen, estado, nota, creado_en, entregado_en)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (transaction_id) DO NOTHING`,
        )
        .bind(
          credito.id,
          credito.maquina_id,
          credito.transaction_id,
          credito.monto_centavos,
          credito.pulsos,
          credito.excedente_centavos,
          credito.origen,
          credito.estado,
          credito.nota,
          credito.creado_en,
          credito.entregado_en,
        ),
    );
  }

  const resultados = await db.batch(sentencias);
  const nuevo = resultados[0].meta.changes === 1;
  return { nuevo, credito: nuevo ? credito : null };
}

/** El crédito pendiente más antiguo de la máquina que todavía no vence. */
export function creditoPendiente(db: D1Database, maquinaId: string, noAntesDe: string) {
  return db
    .prepare(
      "SELECT * FROM creditos WHERE maquina_id = ? AND estado = 'pendiente' AND creado_en >= ? ORDER BY creado_en LIMIT 1",
    )
    .bind(maquinaId, noAntesDe)
    .first<FilaCredito>();
}

/** Marca un crédito como entregado. Se acepta aunque ya hubiera vencido: la máquina sí lo entregó. */
export async function entregarCredito(db: D1Database, id: string, maquinaId: string, ahora: string): Promise<FilaCredito | null> {
  return db
    .prepare(
      `UPDATE creditos SET estado = 'entregado', entregado_en = ?
       WHERE id = ? AND maquina_id = ? AND estado IN ('pendiente', 'vencido') RETURNING *`,
    )
    .bind(ahora, id, maquinaId)
    .first<FilaCredito>();
}
