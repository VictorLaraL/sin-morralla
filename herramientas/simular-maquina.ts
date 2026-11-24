// Simula el módulo ESP32: consulta créditos, "emite" los pulsos y confirma la entrega.
// Uso: node herramientas/simular-maquina.ts --token <token del módulo> [--url http://localhost:8787]

import { parseArgs } from "node:util";
import { setTimeout as esperar } from "node:timers/promises";
import { leerLineaCredito } from "../src/core/protocolo.ts";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:8787" },
    token: { type: "string" },
  },
});
if (!values.token) throw new Error("Falta --token (lo genera el portal del dueño)");

const base = values.url!.replace(/\/$/, "");
const auth = { Authorization: `Bearer ${values.token}` };
let ultimo = "";

console.log(`Máquina simulada conectada a ${base}. Esperando pagos… (Ctrl+C para salir)`);
while (true) {
  try {
    const r = await fetch(`${base}/device/poll`, { headers: auth, signal: AbortSignal.timeout(40_000) });
    if (r.status === 204) continue;
    if (r.status === 401) throw new Error("Token inválido");
    const credito = leerLineaCredito(await r.text());
    if (!credito) throw new Error(`Respuesta inesperada (${r.status})`);
    if (credito.id !== ultimo) {
      if (credito.requiereBoton) console.log("🔘 Esperando que el cliente presione \"Servir con CoDi\"… (simulado: 2 s)");
      if (credito.requiereBoton) await esperar(2000);
      process.stdout.write(`💧 Crédito ${credito.id}: `);
      for (let i = 0; i < credito.pulsos; i++) {
        process.stdout.write("▮");
        await esperar(credito.pulsoMs + credito.pausaMs);
      }
      console.log(`  ${credito.pulsos} pulsos`);
      ultimo = credito.id;
    }
    const ack = await fetch(`${base}/device/ack?id=${encodeURIComponent(credito.id)}`, { method: "POST", headers: auth });
    console.log(`✓ Confirmado (${ack.status})`);
  } catch (e) {
    console.error(`✗ ${(e as Error).message}. Reintento en 3 s`);
    await esperar(3000);
  }
}
