// Demo en vivo de la landing: muestra el QR de la máquina virtual y llena el garrafón cuando llega un pago.

const $ = (id) => document.getElementById(id);
const maquina = $("maquina");
const estado = $("estado");
const pulsos = $("pulsos");
const conexion = $("conexion");
const pesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const movimientoReducido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

let demo = null;
let ultimoPago = null;
let ocupado = false;
const cola = [];

// ---------- Estado de la demo ----------

function textoEspera() {
  return demo ? `Esperando tu pago de ${pesos.format(demo.montoCentavos / 100)}` : "Esperando pago";
}

function haceCuanto(iso) {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return `hace ${s} s`;
  const min = Math.round(s / 60);
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.round(min / 60)} h`;
}

function pintarContadores(pagosHoy, ultimo) {
  $("pagos-hoy").textContent = String(pagosHoy ?? 0);
  if (ultimo) ultimoPago = ultimo;
  $("ultimo-pago").textContent = ultimoPago ? haceCuanto(ultimoPago) : "Sin pagos hoy";
}

setInterval(() => {
  if (ultimoPago) $("ultimo-pago").textContent = haceCuanto(ultimoPago);
}, 1000);

async function cargarDemo() {
  try {
    const r = await fetch("/api/demo", { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    demo = await r.json();
  } catch {
    if (!demo) estado.textContent = "La demo no está disponible en este momento.";
    return;
  }
  $("monto").textContent = pesos.format(demo.montoCentavos / 100);
  if (!ocupado) estado.textContent = textoEspera();
  pintarContadores(demo.pagosHoy, demo.ultimoPago);
  pintarQr(demo.qrString);

  if (demo.simulacion) {
    $("simular").hidden = false;
    $("nota-pago").innerHTML =
      '<span class="etiqueta simulado">SIMULADO</span> Modo local: el QR no es de un banco y no se puede pagar. ' +
      "El botón manda un aviso firmado por el mismo camino que usa pey.";
  }
}

// ---------- QR ----------

let qrActual = null;

function crearQr(texto) {
  const qrcode = globalThis.qrcode;
  qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
  const qr = qrcode(0, "M");
  qr.addData(texto, "Byte");
  qr.make();
  return qr;
}

function pintarQr(texto) {
  const caja = $("qr");
  if (!texto) {
    caja.innerHTML = '<span class="qr-cargando">La demo se está preparando. Vuelve en unos minutos.</span>';
    $("descargar").disabled = true;
    return;
  }
  if (qrActual?.texto === texto) return;
  const qr = crearQr(texto);
  const n = qr.getModuleCount();
  const margen = 4;
  let trazo = "";
  for (let fila = 0; fila < n; fila++) {
    for (let col = 0; col < n; col++) {
      if (qr.isDark(fila, col)) trazo += `M${col + margen} ${fila + margen}h1v1h-1z`;
    }
  }
  const lado = n + margen * 2;
  caja.innerHTML =
    `<svg viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges" aria-hidden="true">` +
    `<rect width="${lado}" height="${lado}" fill="#fff"/><path d="${trazo}" fill="#141A2E"/></svg>`;
  qrActual = { texto, qr };
  $("descargar").disabled = false;
}

// Para pagar desde el mismo celular: muchas apps de banco leen el QR desde una imagen guardada.
$("descargar").addEventListener("click", () => {
  if (!qrActual) return;
  const { qr } = qrActual;
  const n = qr.getModuleCount();
  const escala = 12;
  const margen = 4;
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = (n + margen * 2) * escala;
  const ctx = lienzo.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.fillStyle = "#141A2E";
  for (let fila = 0; fila < n; fila++) {
    for (let col = 0; col < n; col++) {
      if (qr.isDark(fila, col)) ctx.fillRect((col + margen) * escala, (fila + margen) * escala, escala, escala);
    }
  }
  const enlace = document.createElement("a");
  enlace.href = lienzo.toDataURL("image/png");
  enlace.download = "sin-morralla-demo-codi.png";
  enlace.click();
});

// ---------- Llenado del garrafón ----------

function recibirPago(evento) {
  pintarContadores(evento.pagosHoy, evento.fecha);
  cola.push(evento);
  void atenderCola();
}

async function atenderCola() {
  if (ocupado || cola.length === 0) return;
  ocupado = true;
  const evento = cola.shift();
  const rapido = movimientoReducido();
  const cuantos = Math.min(5, Math.max(1, Math.round(evento.montoCentavos / 100)));

  estado.classList.remove("exito");
  estado.textContent = `¡Pago de ${pesos.format(evento.montoCentavos / 100)} recibido!`;
  for (let i = 1; i <= cuantos; i++) {
    pulsos.textContent = `Pulso ${i} de ${cuantos} enviado al monedero`;
    maquina.classList.add("pulso");
    await espera(rapido ? 100 : 650);
    maquina.classList.remove("pulso");
    await espera(rapido ? 50 : 200);
  }

  maquina.classList.add("sirviendo");
  estado.textContent = "Sirviendo agua…";
  pulsos.textContent = "La máquina cree que le echaron monedas.";
  await espera(rapido ? 400 : 5200);

  maquina.classList.add("lleno");
  estado.classList.add("exito");
  estado.textContent = "¡Listo! Garrafón servido.";
  pulsos.textContent = "Así funciona en una máquina real, en segundos.";
  await espera(rapido ? 1500 : 4500);

  maquina.classList.remove("sirviendo", "lleno");
  await espera(rapido ? 100 : 1000);
  estado.classList.remove("exito");
  estado.textContent = textoEspera();
  pulsos.textContent = " ";
  ocupado = false;
  void atenderCola();
}

// ---------- En vivo ----------

function marcarConexion(enVivo) {
  conexion.classList.toggle("en-vivo", enVivo);
  conexion.classList.toggle("sin-conexion", !enVivo);
  conexion.lastElementChild.textContent = enVivo ? "En vivo" : "Reconectando…";
  maquina.classList.toggle("sin-red", !enVivo);
}

let intento = 0;

function conectar() {
  const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/demo/en-vivo`);
  let latido;
  ws.addEventListener("open", () => {
    intento = 0;
    marcarConexion(true);
    // El servidor contesta "pong" sin despertar al Durable Object.
    latido = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send("ping"), 30_000);
    void cargarDemo();
  });
  ws.addEventListener("message", (m) => {
    if (m.data === "pong") return;
    try {
      const evento = JSON.parse(m.data);
      if (evento.tipo === "pago") recibirPago(evento);
    } catch {
      // Mensaje desconocido: se ignora.
    }
  });
  ws.addEventListener("close", () => {
    clearInterval(latido);
    marcarConexion(false);
    setTimeout(conectar, Math.min(30_000, 1000 * 2 ** intento++));
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void cargarDemo();
});

$("simular").addEventListener("click", async (e) => {
  const boton = e.currentTarget;
  boton.disabled = true;
  try {
    const r = await fetch("/api/demo/simular", { method: "POST" });
    if (!r.ok) estado.textContent = "No se pudo simular el pago.";
  } finally {
    setTimeout(() => (boton.disabled = false), 1200);
  }
});

// ---------- Contacto ----------

$("formulario").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formulario = e.currentTarget;
  const aviso = $("formulario-aviso");
  const boton = formulario.querySelector("button[type=submit]");
  const datos = Object.fromEntries(new FormData(formulario));
  boton.disabled = true;
  try {
    const r = await fetch("/api/contacto", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(datos),
    });
    const cuerpo = await r.json().catch(() => ({}));
    aviso.hidden = false;
    if (r.ok) {
      aviso.className = "aviso ok";
      aviso.textContent = "¡Gracias! Te contactamos pronto.";
      formulario.reset();
    } else {
      aviso.className = "aviso error";
      aviso.textContent = cuerpo.error ?? "No se pudo enviar. Intenta de nuevo.";
    }
  } catch {
    aviso.hidden = false;
    aviso.className = "aviso error";
    aviso.textContent = "Sin conexión. Intenta de nuevo.";
  } finally {
    boton.disabled = false;
  }
});

void cargarDemo();
conectar();
