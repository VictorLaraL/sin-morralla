// Compila y corre las pruebas de la lógica del firmware en la PC (sin placa).
// Usa g++ o clang++ si existen; en Windows también busca el compilador de Visual Studio (Build Tools).
// Uso: npm run test:firmware

import { execFileSync, execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const fuente = join("firmware", "pruebas", "prueba_entrega.cpp");
const salida = join(tmpdir(), "sin-morralla-firmware");
mkdirSync(salida, { recursive: true });
const ejecutable = join(salida, process.platform === "win32" ? "prueba_entrega.exe" : "prueba_entrega");

function existe(comando: string): boolean {
  return spawnSync(comando, ["--version"], { stdio: "ignore", shell: process.platform === "win32" }).status === 0;
}

function vcvars(): string | null {
  const vswhere = "C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe";
  if (!existsSync(vswhere)) return null;
  const ruta = execFileSync(vswhere, ["-latest", "-products", "*", "-requires", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64", "-property", "installationPath"])
    .toString()
    .trim();
  const bat = join(ruta, "VC", "Auxiliary", "Build", "vcvars64.bat");
  return ruta && existsSync(bat) ? bat : null;
}

const compilador = ["g++", "clang++"].find(existe);
if (compilador) {
  execFileSync(compilador, ["-std=c++17", "-Wall", "-Wextra", "-o", ejecutable, fuente], { stdio: "inherit" });
} else {
  const bat = process.platform === "win32" ? vcvars() : null;
  if (!bat) {
    console.error("No encontré un compilador de C++ (g++, clang++ o Visual Studio Build Tools).");
    process.exit(2);
  }
  execSync(`call "${bat}" >nul 2>nul && cl /nologo /std:c++17 /EHsc /W4 /D_CRT_SECURE_NO_WARNINGS /Fo"${salida}\\\\" /Fe"${ejecutable}" "${fuente}"`, {
    stdio: ["ignore", "inherit", "inherit"],
    shell: "cmd.exe",
  });
}

const r = spawnSync(ejecutable, { stdio: "inherit" });
process.exit(r.status ?? 1);
