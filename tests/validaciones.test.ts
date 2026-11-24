import { test } from "node:test";
import assert from "node:assert/strict";
import { inicioDelDiaCdmx, validarConfigMaquina, validarContacto, vigenciaMinutos } from "../src/core/validaciones.ts";

test("la configuración válida de una máquina se normaliza a enteros", () => {
  const r = validarConfigMaquina({
    nombre: "  Despachador Calle 5 ",
    ubicacion: "Afuera de la tienda",
    precioCentavos: 1300,
    valorPulsoCentavos: 100,
    pulsoMs: 50,
    pausaMs: 50,
    maxPulsos: 30,
    requiereBoton: true,
  });
  assert.deepEqual(r, {
    ok: true,
    valor: {
      nombre: "Despachador Calle 5",
      ubicacion: "Afuera de la tienda",
      precioCentavos: 1300,
      valorPulsoCentavos: 100,
      pulsoMs: 50,
      pausaMs: 50,
      maxPulsos: 30,
      requiereBoton: true,
    },
  });
});

test("rechaza valores que harían fallar a la máquina, con un mensaje claro", () => {
  const base = { nombre: "M", ubicacion: "", precioCentavos: 0, valorPulsoCentavos: 100, pulsoMs: 50, pausaMs: 50, maxPulsos: 30, requiereBoton: false };
  const casos: Array<[Record<string, unknown>, RegExp]> = [
    [{ nombre: "" }, /nombre/],
    [{ valorPulsoCentavos: 0 }, /valor del pulso/],
    [{ pulsoMs: 5 }, /ancho del pulso/],
    [{ pausaMs: 2000 }, /pausa/],
    [{ maxPulsos: 0 }, /tope/],
    [{ precioCentavos: -100 }, /precio/],
    [{ precioCentavos: 12.5 }, /precio/],
  ];
  for (const [cambio, mensaje] of casos) {
    const r = validarConfigMaquina({ ...base, ...cambio });
    assert.equal(r.ok, false, JSON.stringify(cambio));
    if (!r.ok) assert.match(r.error, mensaje);
  }
});

test("el contacto exige nombre y una forma de responder, y limita los largos", () => {
  assert.deepEqual(validarContacto({ nombre: "Ana", telefono: "55 1234 5678", correo: "", mensaje: "Tengo 3 máquinas" }), {
    ok: true,
    valor: { nombre: "Ana", telefono: "55 1234 5678", correo: null, mensaje: "Tengo 3 máquinas" },
  });
  assert.equal(validarContacto({ nombre: "", telefono: "5512345678" }).ok, false);
  assert.equal(validarContacto({ nombre: "Ana", telefono: "", correo: "" }).ok, false, "sin teléfono ni correo");
  assert.equal(validarContacto({ nombre: "Ana", correo: "no-es-correo" }).ok, false);
  assert.equal(validarContacto({ nombre: "Ana", correo: "ana@ejemplo.mx", mensaje: "x".repeat(1001) }).ok, false);
});

test("el inicio del día se calcula en hora de la Ciudad de México (UTC-6)", () => {
  // 23 nov 2026 a las 03:00 UTC todavía es 22 nov en CDMX (21:00).
  assert.equal(inicioDelDiaCdmx(new Date("2026-11-23T03:00:00Z")), "2026-11-22T06:00:00.000Z");
  assert.equal(inicioDelDiaCdmx(new Date("2026-11-23T18:00:00Z")), "2026-11-23T06:00:00.000Z");
});

test("la vigencia de un crédito usa 10 minutos si la configuración no sirve", () => {
  assert.equal(vigenciaMinutos("10"), 10);
  assert.equal(vigenciaMinutos("3"), 3);
  assert.equal(vigenciaMinutos("1440"), 1440);
  for (const malo of ["0", "-5", "abc", "", undefined, "2.5", "1441"]) {
    assert.equal(vigenciaMinutos(malo), 10, `con ${JSON.stringify(malo)}`);
  }
});
