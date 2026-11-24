# Sin Morralla — MVP en Cloudflare

Objetivo: landing con demo CoDi en vivo, portal de un solo cliente, servidor en Cloudflare y firmware del módulo.
Rama: `feat/mvp-cloudflare` · Entrega: `single-pr` (el usuario pidió hacerlo "de una") · Pruebas: `node --test` + e2e
contra `wrangler dev` + revisión en el navegador integrado.

## Specs

- **S1. Repositorio público en la cuenta personal.** "vamos a subir el repor a VictorLaraL para que ahi viva el repo,
  en mi cuenta personal, de manera publica". "el repo hayq ue subirlo a github con mi cuenta personal".
- **S2. Todo en Cloudflare.** "podemos montar todo el stack en cloudflare? par acomenzar con esa infraestructura".
  "la demo la ladning page y todo lo demsa a mi cuenta personal de cloudflare vale."
- **S3. Identidad.** "generarle una identidad de colores y un pequeño logo, algo sencillo para comenzar creando la
  landing page". Supuesto: se usa la identidad ya propuesta en `docs/PLAN.md` y `brand/`.
- **S4. Demo en la landing.** "coemnzando por la demo en la landing page donde se pague y se vea como se llena el
  garrafon dentro de la landing page".
- **S5. Portal de un solo cliente.** "debemos crear el portal del cliente etc, por ahora no haremos multitenencia lo
  ahremos solo con un cliente".
- **S6. Lo planeado.** "hagamos el proyecto de una dejemoslo como lo planeamos". Alcance según `docs/PLAN.md` y
  `docs/MVP.md` v0.6: aviso de pey con firma verificada, un pago se procesa una sola vez, un QR fijo por máquina,
  pulsos al ESP32 con confirmación, luz de estado, bip, botón "Servir con CoDi", créditos vencidos para devolución.
- **S7. README para jueces con diagrama.** "en elreadme del proyecto coloca todso lo necesario para los jueces
  incluyendo un diagrama de como funciona por dentro el servicio con representacion grrafica y flujo de como funicona
  el sistema y como funcionaria el hardware si queires hacer dos diagramas esta bien pero preferiri que todo se vea en
  uno".
- **S8. Documentación como la de los ganadores.** "para los puntos de ld coumentacion basate en la documentacion de
  los otros participantes que ya han ganado para ser lo mas similares posible."
- **S9. Abierto en local.** "cuando termines lo dejas abierto en local para probar".
- **S10. Método.** "apliquemos ODD y RDD". "checa gentle ai que tenemos instalado de ahi usamos odd y rdd y pruebas
  en el navegador".

## Tasks

| ID | Specs | Ruta | Estado | Commit / evidencia |
|---|---|---|---|---|
| T1 | S1, S3 | inline | hecho | Docs en `main`: `f1714e5`; estructura `5a8a4f2` (dev local: salud 200, landing 200) |
| T2 | S6 | inline | hecho | `76d28ff` (RED: módulos inexistentes; GREEN: 18/18) + corrección de advertencias RDD (RED 3, GREEN 25/25) |
| T3 | S2, S6 | inline | hecho | RED: tokens inexistente y e2e 0/7; GREEN: unitarias 25/25, e2e 7/7 (`npm run e2e` contra `npm run dev`) |
| T4 | S2, S4, S5 | inline | pendiente | — |
| T5 | S3, S4 | inline | pendiente | — |
| T6 | S5 | inline | pendiente | — |
| T7 | S6 | inline | pendiente | — |
| T8 | S9, S10 | inline | pendiente | — |
| T9 | S7, S8 | inline | pendiente | — |
| T10 | S1, S2 | inline | pendiente | — |

- **T1** Estructura del proyecto (Worker, D1, configuración, scripts) sobre la documentación existente.
- **T2** Núcleo sin dependencias de Cloudflare: verificación de firma Standard Webhooks con Web Crypto, normalización
  del aviso de pey, cálculo de pulsos y protocolo del ESP32, con pruebas.
- **T3** Worker: esquema D1, `/webhooks/pey` (atómico e idempotente por `transactionId`), `/device/poll` y
  `/device/ack`, cliente de pey y modo simulación. Riesgo alto (secretos, datos persistidos): commit propio.
- **T4** Difusor en vivo (Durable Object con WebSockets en hibernación), API de la demo, API del portal, contacto y
  cron de créditos vencidos.
- **T5** Landing con la identidad y la demo del garrafón que se llena al llegar el pago.
- **T6** Portal del dueño: resumen, máquinas, QR, token del módulo, pulso de prueba, pagos por atender, calcomanía.
- **T7** Firmware: luz verde/roja, bip, botón "Servir con CoDi", nueva dirección del servidor.
- **T8** Pruebas de punta a punta contra `wrangler dev` y en el navegador integrado; dejarlo corriendo en local.
- **T9** README para jueces con un diagrama único (servicio + hardware), basado en la documentación de ganadores.
- **T10** Publicar en Cloudflare (D1, deploy) y subir el repositorio a GitHub.

Rutas: todo inline. Ninguna unidad cumple el disparador de escritor (no hay dos unidades independientes de varios
minutos con superficies disjuntas que convenga paralelizar); la investigación de READMEs ganadores corre en un
explorador de solo lectura.

## Log

- **L1 (2026-11-23):** "ya me logge con mi cuenta personal en github y en cloudflare, hagamos el proyecto de una
  dejemoslo como lo planeamos de una apliquemos ODD y RDD, cuando termines lo dejas abierto en local para probar, en
  elreadme del proyecto coloca todso lo necesario para los jueces incluyendo un diagrama de como funciona por dentro el
  servicio con representacion grrafica y flujo de como funicona el sistema y como funcionaria el hardware si queires
  hacer dos diagramas esta bien pero preferiri que todo se vea en uno, para los puntos de ld coumentacion basate en la
  documentacion de los otros participantes que ya han ganado para ser lo mas similares posible."
- **L2 (2026-11-23):** "checa gentle ai que tenemos instalado de ahi usamos odd y rdd y pruebas en el navegador"
- **L3:** Contexto previo del mismo día (planeación aprobada): "vale entonces hagamos como prioridad lo del software,
  vamos a subir el repor a VictorLaraL para que ahi viva el repo, en mi cuenta personal, de manera publica el nombre del
  producto ya lo tenemos solo habria que generarle una identidad de colores y un pequeño logo, algo sencillo para
  comenzar creando la landing page, debemos crear el portal del cliente etc, por ahora no haremos multitenencia lo
  ahremos solo con un cliente, coemnzando por la demo en la landing page donde se pague y se vea como se llena el
  garrafon dentro de la landing page".
- **L4 Decisiones:** entrega `single-pr` porque el usuario pidió "de una"; commits sin atribución de IA según sus reglas
  de `~/.codex/AGENTS.md`; RDD activo (global) con consentimiento permanente; el ESP32 usa long-poll HTTPS contra el
  Worker (el Worker consulta D1 cada segundo) para no mantener despierto un Durable Object; los navegadores usan
  WebSockets en hibernación.
- **L6 RDD tramo T1–T2 (`main..76d28ff`):** evaluado medio/"under_budget"; escalado a alto (ítem 2: verificación de
  firmas) para cerrarlo antes de T3. Revisión `review-141590e8d9977364` con lentes riesgo, legibilidad y confiabilidad:
  **aprobada y confirmada**. Advertencias no bloqueantes atendidas con pruebas en el commit siguiente: valor de pulso o
  tope en 0 regalaba pulsos; un aviso sin monto pasaba como $0; fechas de pago fuera de rango.
- **L7 RDD tramo de corrección (`76d28ff..117c83e`):** revisión `review-34589394c2811466` (riesgo, confiabilidad):
  **aprobada y confirmada**. Advertencia restante (un `amount` como `true` o `[5]` se convertía en número) atendida con
  prueba dentro de T3, que toca la entrada del webhook.
- **L5 Evidencia previa:** prueba del 23 de noviembre: el mismo QR fijo de $0.01 aceptó dos pagos y pey registró dos
  transacciones exitosas (`docs/MVP.md`, H2).
