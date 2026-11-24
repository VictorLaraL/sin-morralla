// Portal del dueño: resumen del día, pagos por atender, máquinas, calcomanía e interesados.
// Todo dato del servidor se pinta como texto (nunca como HTML): los contactos vienen de un formulario público.

import { descargarPng, svgQr } from "/qr.js";

const $ = (id) => document.getElementById(id);
const pesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const fechaCorta = new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short", timeZone: "America/Mexico_City" });
const deCentavos = (c) => pesos.format((c ?? 0) / 100);
const fecha = (iso) => (iso ? fechaCorta.format(new Date(iso)) : "—");

const ESTADOS = {
  pendiente: "Esperando a la máquina",
  entregado: "Servido",
  vencido: "No se sirvió",
  "sin-servicio": "Sin servicio",
  devuelto: "Devuelto",
};

/** Crea un elemento con propiedades e hijos; los textos se insertan como nodos de texto. */
function h(etiqueta, props = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === "class") el.className = valor;
    else if (clave.startsWith("on")) el.addEventListener(clave.slice(2), valor);
    else el.setAttribute(clave, valor === true ? "" : String(valor));
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : String(hijo));
  }
  return el;
}

function guardado(clave, valor) {
  try {
    if (valor === undefined) return localStorage.getItem(clave) ?? "";
    localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento: solo se pierde la comodidad de recordar el dato.
  }
  return valor ?? "";
}

function avisar(texto, tipo = "info") {
  const aviso = h("p", { class: `aviso ${tipo}` }, texto);
  $("avisos").append(aviso);
  setTimeout(() => aviso.remove(), 5000);
}

// ---------- Sesión ----------

let clave = "";
try {
  clave = sessionStorage.getItem("sm-clave") ?? "";
} catch {
  // Sin sessionStorage: se pide la clave en cada carga.
}

class ErrorApi extends Error {}

async function api(ruta, { metodo = "GET", cuerpo } = {}) {
  const r = await fetch(ruta, {
    method: metodo,
    headers: { Authorization: `Bearer ${clave}`, ...(cuerpo !== undefined ? { "content-type": "application/json" } : {}) },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  if (r.status === 401) {
    salir("La clave no es correcta o cambió.");
    throw new ErrorApi("Clave incorrecta");
  }
  if (!r.ok) throw new ErrorApi(datos.error ?? `Error ${r.status}`);
  return datos;
}

function salir(mensaje) {
  clave = "";
  try {
    sessionStorage.removeItem("sm-clave");
  } catch {
    // Nada que borrar.
  }
  cerrarVivo();
  $("panel").hidden = true;
  $("salir").hidden = true;
  $("vivo").hidden = true;
  $("entrar").hidden = false;
  const error = $("entrar-error");
  error.hidden = !mensaje;
  error.textContent = mensaje ?? "";
}

$("form-entrar").addEventListener("submit", async (e) => {
  e.preventDefault();
  clave = $("clave").value.trim();
  try {
    await cargar();
    try {
      sessionStorage.setItem("sm-clave", clave);
    } catch {
      // Se usa solo en memoria.
    }
    $("clave").value = "";
    $("entrar").hidden = true;
    $("panel").hidden = false;
    $("salir").hidden = false;
    conectarVivo();
  } catch (error) {
    if (!(error instanceof ErrorApi) || error.message !== "Clave incorrecta") salir(error.message);
  }
});

$("salir").addEventListener("click", () => salir());

// ---------- Resumen ----------

let datos = null;

async function cargar() {
  datos = await api("/api/portal/resumen");
  pintar();
}

function pintar() {
  const fisicas = datos.maquinas.filter((m) => !m.virtual);
  const enLinea = fisicas.filter((m) => m.enLinea).length;
  const cifra = (titulo, valor, detalle) =>
    h("dl", { class: "cifra tarjeta" }, h("dt", {}, titulo), h("dd", {}, valor), detalle ? h("div", { class: "detalle" }, detalle) : null);
  $("cifras").replaceChildren(
    cifra("Ventas CoDi de hoy", deCentavos(datos.hoy.totalCentavos), `${datos.hoy.pagos} pagos`),
    cifra("Últimos 7 días", deCentavos(datos.semana.totalCentavos), `${datos.semana.pagos} pagos`),
    cifra("Máquinas en línea", `${enLinea} de ${fisicas.length}`, enLinea < fisicas.length ? "Revisa el WiFi del local" : "Todo en orden"),
    cifra("Interesados", String(datos.contactos), "desde la landing"),
  );
  pintarPorAtender();
  pintarMaquinas();
  pintarPagos();
}

function pintarPorAtender() {
  const caja = $("por-atender");
  if (datos.porAtender.length === 0) {
    caja.replaceChildren(h("p", { class: "vacio" }, "Nada por atender. Todos los pagos se sirvieron."));
    return;
  }
  caja.replaceChildren(
    h(
      "div",
      { class: "atender" },
      datos.porAtender.map((c) =>
        h(
          "article",
          { class: "atender-fila tarjeta" },
          h(
            "div",
            {},
            h("p", { class: "monto" }, `${deCentavos(c.monto_centavos)} · ${c.maquina_nombre}`),
            h("p", {}, `${ESTADOS[c.estado] ?? c.estado} · ${fecha(c.fecha_pago ?? c.creado_en)}`),
            c.nota ? h("p", {}, c.nota) : null,
            c.clave_rastreo ? h("p", {}, `Clave de rastreo: ${c.clave_rastreo}`) : null,
          ),
          h(
            "button",
            {
              class: "boton secundario chico",
              type: "button",
              onclick: async (e) => {
                if (!confirm(`¿Ya devolviste ${deCentavos(c.monto_centavos)} desde tu banco?`)) return;
                e.currentTarget.disabled = true;
                try {
                  await api(`/api/portal/creditos/${encodeURIComponent(c.id)}/devuelto`, { metodo: "POST" });
                  avisar("Pago marcado como devuelto.", "ok");
                  await cargar();
                } catch (error) {
                  avisar(error.message, "error");
                  e.currentTarget.disabled = false;
                }
              },
            },
            "Marcar devuelto",
          ),
        ),
      ),
    ),
  );
}

// ---------- Máquinas ----------

// El token del módulo se muestra una sola vez: se guarda en memoria para que sobreviva a los refrescos del panel
// hasta que el dueño confirme que ya lo copió.
const tokensRecientes = new Map();

function cajaToken(m) {
  const token = tokensRecientes.get(m.id);
  if (!token) return null;
  return h(
    "div",
    { class: "token-caja" },
    h("strong", {}, "Token del módulo: cópialo ahora, no se vuelve a mostrar."),
    h("code", {}, token),
    h(
      "div",
      { class: "fila-botones" },
      h(
        "button",
        { class: "boton chico", type: "button", onclick: () => navigator.clipboard?.writeText(token).then(() => avisar("Token copiado.", "ok")) },
        "Copiar",
      ),
      h(
        "button",
        {
          class: "boton secundario chico",
          type: "button",
          onclick: () => {
            tokensRecientes.delete(m.id);
            pintarMaquinas();
          },
        },
        "Ya lo guardé",
      ),
    ),
  );
}

function campo(etiqueta, nombre, valor, { claseEtiqueta, ...extra } = {}) {
  return h("label", { class: claseEtiqueta }, etiqueta, h("input", { name: nombre, value: valor, required: true, ...extra }));
}

function fichaMaquina(m) {
  // Los mensajes van como avisos flotantes: la ficha se vuelve a pintar con cada refresco del panel.
  const mostrar = (texto, tipo) => avisar(texto, tipo);

  const estado = m.virtual
    ? h("span", { class: "etiqueta" }, "Demo de la landing")
    : m.enLinea
      ? h("span", { class: "etiqueta verde" }, h("span", { class: "punto" }), "En línea")
      : h("span", { class: "etiqueta roja" }, h("span", { class: "punto" }), m.tieneToken ? "Sin conexión" : "Sin módulo");

  const formulario = h(
    "form",
    {
      onsubmit: async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const centavos = (nombre) => Math.round(Number(String(f.get(nombre)).replace(",", ".")) * 100);
        const config = {
          nombre: f.get("nombre"),
          ubicacion: f.get("ubicacion"),
          precioCentavos: centavos("precio"),
          valorPulsoCentavos: centavos("valorPulso"),
          pulsoMs: Number(f.get("pulsoMs")),
          pausaMs: Number(f.get("pausaMs")),
          maxPulsos: Number(f.get("maxPulsos")),
          requiereBoton: f.get("requiereBoton") === "on",
        };
        try {
          const r = await api(`/api/portal/maquinas/${encodeURIComponent(m.id)}`, { metodo: "PUT", cuerpo: config });
          mostrar(r.qrDesactualizado ? "Guardado. El precio cambió: genera un QR nuevo y cambia la calcomanía." : "Guardado.", "ok");
          await cargar();
        } catch (error) {
          mostrar(error.message, "error");
        }
      },
    },
    campo("Nombre", "nombre", m.nombre, { maxlength: 60, claseEtiqueta: "ancho" }),
    h("label", { class: "ancho" }, "Ubicación", h("input", { name: "ubicacion", value: m.ubicacion ?? "", maxlength: 80 })),
    campo("Precio en el QR ($)", "precio", (m.precioCentavos / 100).toFixed(2), { inputmode: "decimal", title: "0 = el cliente escribe el monto" }),
    m.virtual ? null : campo("Valor de un pulso ($)", "valorPulso", (m.valorPulsoCentavos / 100).toFixed(2), { inputmode: "decimal" }),
    m.virtual ? null : campo("Ancho del pulso (ms)", "pulsoMs", m.pulsoMs, { type: "number", min: 10, max: 500 }),
    m.virtual ? null : campo("Pausa entre pulsos (ms)", "pausaMs", m.pausaMs, { type: "number", min: 10, max: 1000 }),
    m.virtual ? null : campo("Tope de pulsos por pago", "maxPulsos", m.maxPulsos, { type: "number", min: 1, max: 500 }),
    m.virtual
      ? null
      : h(
          "label",
          { class: "casilla ancho" },
          h("input", { type: "checkbox", name: "requiereBoton", checked: m.requiereBoton }),
          "Esperar el botón «Servir con CoDi» antes de dar los pulsos",
        ),
    m.virtual ? h("input", { type: "hidden", name: "valorPulso", value: (m.valorPulsoCentavos / 100).toFixed(2) }) : null,
    m.virtual ? h("input", { type: "hidden", name: "pulsoMs", value: m.pulsoMs }) : null,
    m.virtual ? h("input", { type: "hidden", name: "pausaMs", value: m.pausaMs }) : null,
    m.virtual ? h("input", { type: "hidden", name: "maxPulsos", value: m.maxPulsos }) : null,
    h("div", { class: "fila-botones ancho" }, h("button", { class: "boton chico", type: "submit" }, "Guardar")),
  );

  const botones = h(
    "div",
    { class: "fila-botones" },
    h(
      "button",
      {
        class: m.qrString && !m.qrDesactualizado ? "boton secundario chico" : "boton ambar chico",
        type: "button",
        onclick: async () => {
          if (m.qrString && !confirm("La calcomanía actual seguirá cobrando su monto anterior. ¿Crear un QR nuevo?")) return;
          try {
            const r = await api(`/api/portal/maquinas/${encodeURIComponent(m.id)}/qr`, { metodo: "POST" });
            avisar(r.simulado ? "QR creado (SIMULADO: modo local)." : "QR creado en pey.", "ok");
            await cargar();
          } catch (error) {
            mostrar(error.message, "error");
          }
        },
      },
      !m.qrString ? "Crear QR" : m.qrDesactualizado ? "Crear QR con el precio nuevo" : "Crear QR nuevo",
    ),
    m.qrString ? h("button", { class: "boton secundario chico", type: "button", onclick: () => abrirCalcomania(m) }, "Calcomanía") : null,
    m.virtual
      ? null
      : h(
          "button",
          {
            class: "boton secundario chico",
            type: "button",
            onclick: async () => {
              const aviso = m.tieneToken ? "El módulo dejará de cobrar hasta que le cargues el token nuevo. ¿Continuar?" : "¿Generar el token del módulo?";
              if (!confirm(aviso)) return;
              try {
                const { token } = await api(`/api/portal/maquinas/${encodeURIComponent(m.id)}/token`, { metodo: "POST" });
                tokensRecientes.set(m.id, token);
                await cargar();
              } catch (error) {
                mostrar(error.message, "error");
              }
            },
          },
          m.tieneToken ? "Cambiar token del módulo" : "Token del módulo",
        ),
  );

  let prueba = null;
  if (!m.virtual) {
    const cuantos = h("select", { "aria-label": "Pulsos de prueba" }, [1, 2, 3, 5, 10].map((n) => h("option", { value: n }, `${n} pulso${n > 1 ? "s" : ""}`)));
    prueba = h(
      "div",
      { class: "fila-botones" },
      cuantos,
      h(
        "button",
        {
          class: "boton secundario chico",
          type: "button",
          onclick: async () => {
            try {
              await api(`/api/portal/maquinas/${encodeURIComponent(m.id)}/prueba`, { metodo: "POST", cuerpo: { pulsos: Number(cuantos.value) } });
              mostrar(m.enLinea ? "Pulsos de prueba enviados: la máquina los recibe en segundos." : "Pulsos en espera: la máquina los recibe cuando se conecte.", "ok");
            } catch (error) {
              mostrar(error.message, "error");
            }
          },
        },
        "Mandar pulso de prueba",
      ),
      h("span", { class: "ayuda" }, "Sin cobro: sirve para calibrar el monedero."),
    );
  }

  return h(
    "article",
    { class: "maquina-ficha tarjeta" },
    h(
      "header",
      {},
      h(
        "div",
        {},
        h("h3", {}, m.nombre),
        h("p", { class: "sub" }, [m.ubicacion, m.id].filter(Boolean).join(" · ")),
        h("p", { class: "sub" }, `Hoy: ${m.hoy.pagos} pagos · ${deCentavos(m.hoy.totalCentavos)}`, m.ultimaConexion && !m.virtual ? ` · última conexión ${fecha(m.ultimaConexion)}` : ""),
      ),
      estado,
    ),
    formulario,
    botones,
    prueba,
    cajaToken(m),
  );
}

function pintarMaquinas() {
  $("maquinas").replaceChildren(...datos.maquinas.map(fichaMaquina));
}

function pintarPagos() {
  const caja = $("pagos");
  if (datos.pagosRecientes.length === 0) {
    caja.replaceChildren(h("p", { class: "vacio" }, "Aún no hay pagos."));
    return;
  }
  caja.replaceChildren(
    h(
      "table",
      {},
      h("thead", {}, h("tr", {}, ["Fecha", "Máquina", "Monto", "Resultado", "Clave de rastreo"].map((t) => h("th", { scope: "col" }, t)))),
      h(
        "tbody",
        {},
        datos.pagosRecientes.map((p) =>
          h(
            "tr",
            {},
            h("td", {}, fecha(p.fecha_pago)),
            h("td", {}, p.maquina_nombre ?? "QR sin máquina"),
            h("td", { class: "num" }, deCentavos(p.monto_centavos)),
            h("td", {}, p.credito_estado ? `${ESTADOS[p.credito_estado] ?? p.credito_estado}${p.pulsos ? ` · ${p.pulsos} pulsos` : ""}` : "—"),
            h("td", {}, p.clave_rastreo ?? "—"),
          ),
        ),
      ),
    ),
  );
}

$("ver-contactos").addEventListener("click", async () => {
  try {
    const lista = await api("/api/portal/contactos");
    $("contactos").replaceChildren(
      lista.length === 0
        ? h("p", { class: "vacio" }, "Todavía nadie deja sus datos.")
        : h(
            "table",
            {},
            h("thead", {}, h("tr", {}, ["Fecha", "Nombre", "Teléfono", "Correo", "Mensaje"].map((t) => h("th", { scope: "col" }, t)))),
            h(
              "tbody",
              {},
              lista.map((c) =>
                h("tr", {}, h("td", {}, fecha(c.creado_en)), h("td", {}, c.nombre), h("td", {}, c.telefono ?? "—"), h("td", {}, c.correo ?? "—"), h("td", {}, c.mensaje ?? "—")),
              ),
            ),
          ),
    );
  } catch (error) {
    avisar(error.message, "error");
  }
});

// ---------- Calcomanía ----------

let maquinaCalcomania = null;

function pintarCalcomania() {
  const m = maquinaCalcomania;
  const monto = $("cal-monto");
  const libre = !m.qrMontoCentavos;
  monto.textContent = libre ? "Escribe el monto en tu banco" : deCentavos(m.qrMontoCentavos);
  monto.classList.toggle("libre", libre);
  $("cal-qr").innerHTML = svgQr(m.qrString);
  $("cal-nombre").textContent = $("cal-beneficiario").value.trim() || "(escribe el nombre del beneficiario)";
  const telefono = $("cal-telefono").value.trim();
  $("cal-aclaraciones").textContent = telefono ? `Aclaraciones: ${telefono}` : "";
  $("cal-maquina").textContent = `Sin Morralla · ${m.id}`;
}

function abrirCalcomania(m) {
  maquinaCalcomania = m;
  $("calcomania-titulo").textContent = `Calcomanía de ${m.nombre}`;
  $("cal-beneficiario").value = guardado("sm-beneficiario");
  $("cal-telefono").value = guardado("sm-telefono");
  pintarCalcomania();
  $("dialogo-calcomania").showModal();
}

$("cal-beneficiario").addEventListener("input", (e) => {
  guardado("sm-beneficiario", e.currentTarget.value);
  pintarCalcomania();
});
$("cal-telefono").addEventListener("input", (e) => {
  guardado("sm-telefono", e.currentTarget.value);
  pintarCalcomania();
});
$("cal-imprimir").addEventListener("click", () => window.print());
$("cal-png").addEventListener("click", () => descargarPng(maquinaCalcomania.qrString, `sin-morralla-${maquinaCalcomania.id}-codi.png`));
$("cal-cerrar").addEventListener("click", () => $("dialogo-calcomania").close());

// ---------- En vivo ----------

let ws = null;
let intento = 0;
let reintento = null;
let recarga = null;

function marcarVivo(enVivo) {
  const vivo = $("vivo");
  vivo.hidden = false;
  vivo.classList.toggle("en-vivo", enVivo);
  vivo.classList.toggle("sin-conexion", !enVivo);
  vivo.lastElementChild.textContent = enVivo ? "En vivo" : "Reconectando…";
}

function recargarPronto() {
  clearTimeout(recarga);
  recarga = setTimeout(() => cargar().catch(() => {}), 400);
}

async function conectarVivo() {
  if (!clave) return;
  try {
    // El WebSocket se abre con un boleto de 60 s: la clave del portal nunca va en la URL.
    const { boleto } = await api("/api/portal/boleto", { metodo: "POST" });
    ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/portal/en-vivo?boleto=${encodeURIComponent(boleto)}`);
  } catch {
    reintento = setTimeout(conectarVivo, Math.min(30_000, 1000 * 2 ** intento++));
    return;
  }
  let latido;
  ws.addEventListener("open", () => {
    intento = 0;
    marcarVivo(true);
    latido = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send("ping"), 30_000);
  });
  ws.addEventListener("message", (m) => {
    if (m.data === "pong") return;
    let evento;
    try {
      evento = JSON.parse(m.data);
    } catch {
      return;
    }
    if (evento.tipo === "pago") avisar(`Pago de ${deCentavos(evento.montoCentavos)}${evento.maquinaNombre ? ` en ${evento.maquinaNombre}` : ""}.`);
    if (evento.tipo === "credito" && evento.estado === "vencido") avisar("Un pago no se sirvió: revisa «Pagos por atender».", "error");
    recargarPronto();
  });
  ws.addEventListener("close", () => {
    clearInterval(latido);
    if (!clave) return;
    marcarVivo(false);
    reintento = setTimeout(conectarVivo, Math.min(30_000, 1000 * 2 ** intento++));
  });
}

function cerrarVivo() {
  clearTimeout(reintento);
  const abierto = ws;
  ws = null;
  abierto?.close();
}

// El estado "en línea" de las máquinas depende del latido: se refresca cada 30 s.
setInterval(() => {
  if (clave && document.visibilityState === "visible") cargar().catch(() => {});
}, 30_000);

// ---------- Inicio ----------

if (clave) {
  cargar()
    .then(() => {
      $("entrar").hidden = true;
      $("panel").hidden = false;
      $("salir").hidden = false;
      conectarVivo();
    })
    .catch(() => {});
}
