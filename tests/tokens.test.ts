import { test } from "node:test";
import assert from "node:assert/strict";
import { compararSecreto, generarId, generarToken, sha256Hex } from "../src/core/tokens.ts";

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
