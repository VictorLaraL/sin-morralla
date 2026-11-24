import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularCredito } from "../src/core/pulsos.ts";
import { lineaCredito, leerLineaCredito } from "../src/core/protocolo.ts";

const agua = { valorPulsoCentavos: 100, maxPulsos: 50, precioCentavos: 0 };

test("monto libre: un pulso por cada peso", () => {
  assert.deepEqual(calcularCredito(agua, 1300), { pulsos: 13, excedenteCentavos: 0, nota: null });
});

test("monto con centavos: se entregan los pulsos completos y se anota el excedente", () => {
  const c = calcularCredito(agua, 750);
  assert.equal(c.pulsos, 7);
  assert.equal(c.excedenteCentavos, 50);
  assert.match(c.nota ?? "", /excedente/);
});

test("precio fijo: pagar menos no da servicio y se marca para devolución", () => {
  const c = calcularCredito({ ...agua, precioCentavos: 1300 }, 1000);
  assert.equal(c.pulsos, 0);
  assert.equal(c.excedenteCentavos, 1000);
  assert.match(c.nota ?? "", /devolución/);
});

test("nunca manda más pulsos que el tope de la máquina", () => {
  const c = calcularCredito(agua, 100_000);
  assert.equal(c.pulsos, 50);
  assert.equal(c.excedenteCentavos, 95_000);
});

test("pulsos de $5 (lavadoras y otras máquinas)", () => {
  assert.equal(calcularCredito({ valorPulsoCentavos: 500, maxPulsos: 20, precioCentavos: 3000 }, 3000).pulsos, 6);
});

test("la línea de crédito para el ESP32 se arma y se lee igual", () => {
  const linea = lineaCredito({ id: "c_1a2b", pulsos: 13, pulsoMs: 50, pausaMs: 60, requiereBoton: true });
  assert.equal(linea, "CREDITO c_1a2b 13 50 60 1\n");
  assert.deepEqual(leerLineaCredito(linea), { id: "c_1a2b", pulsos: 13, pulsoMs: 50, pausaMs: 60, requiereBoton: true });
  assert.equal(leerLineaCredito("OTRA COSA"), null);
});
