import { test } from "node:test";
import assert from "node:assert/strict";
import { compararSecreto, firmarBoleto, generarId, generarToken, sha256Hex, verificarBoleto } from "../src/core/tokens.ts";

test("sha256Hex coincide con el vector conocido", async () => {
  assert.equal(await sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("compararSecreto acepta solo el valor exacto y nunca un secreto vacío", async () => {
  assert.equal(await compararSecreto("clave-del-portal", "clave-del-portal"), true);
  assert.equal(await compararSecreto("clave-del-portaL", "clave-del-portal"), false);
  assert.equal(await compararSecreto("", ""), false, "sin secreto configurado nadie entra");
});

test("generarToken da valores distintos, sin caracteres que estorben en una URL", () => {
  const a = generarToken();
  const b = generarToken();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]{32}$/);
});

test("generarId usa el prefijo y 12 caracteres hexadecimales", () => {
  assert.match(generarId("c"), /^c_[0-9a-f]{12}$/);
});

test("el boleto del WebSocket del portal vence pronto y solo sirve con la misma clave", async () => {
  const ahora = 1_800_000_000;
  const boleto = await firmarBoleto("clave-del-portal", ahora + 60);
  assert.equal(await verificarBoleto("clave-del-portal", boleto, ahora), true);
  assert.equal(await verificarBoleto("otra-clave", boleto, ahora), false);
  assert.equal(await verificarBoleto("clave-del-portal", boleto, ahora + 61), false, "ya venció");
  const largo = await firmarBoleto("clave-del-portal", ahora + 3600);
  assert.equal(await verificarBoleto("clave-del-portal", largo, ahora), false, "no se aceptan boletos de más de 2 minutos");
  for (const malo of ["", "x", `${ahora + 60}.`, ".abc", `${ahora + 60}.AAAA`, `${ahora + 60}x.${boleto.split(".")[1]}`]) {
    assert.equal(await verificarBoleto("clave-del-portal", malo, ahora), false, `con ${JSON.stringify(malo)}`);
  }
  assert.equal(await verificarBoleto("", boleto, ahora), false, "sin clave configurada no hay boletos");
  assert.doesNotMatch(boleto, /clave/);
});
