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
| T3 | S2, S6 | inline | hecho | `15399d6`. RED: tokens inexistente y e2e 0/7; GREEN: unitarias 25/25, e2e 7/7 (`npm run e2e` contra `npm run dev`) |
| T4 | S2, S4, S5 | inline | hecho | RED: validaciones inexistente y e2e 7/14; GREEN: unitarias 29/29, e2e 14/14, `tsc` limpio |
| T5 | S3, S4 | inline | hecho | Contrato cubierto por e2e de T4; navegador integrado: QR dibujado, WebSocket "En vivo", pago simulado llena el garrafón y sube el contador, consola sin errores, 375 px sin desplazamiento horizontal |
| T6 | S5 | inline | hecho | API cubierta por e2e 27/27; navegador integrado: clave incorrecta rechazada, entrada, canal en vivo con boleto, crear QR (simulado), token visible tras refrescos, pulso de prueba recibido y confirmado por el módulo, aviso en vivo de un pago firmado, calcomanía de 10 cm, 375 px sin desplazamiento horizontal |
| T7 | S6 | inline | hecho | Protocolo de 5 campos y ACK parcial cubiertos por e2e 28/28; entrega en dos fases; **sin compilar** (no hay arduino-cli ni placa en esta máquina) |
| T8 | S9, S10 | inline | hecho | Unitarias 34/34, e2e 31/31 (30/30 dos corridas seguidas antes de la última prueba), firmware 8/8 (`npm run test:firmware`, MSVC), `typecheck` limpio; navegador integrado en landing y portal; servidor local corriendo en el puerto 8787 |
| T9 | S7, S8 | inline | hecho | `README.md` con un solo diagrama Mermaid (servicio, flujo y hardware) validado con Mermaid 10.9.1 sin errores; `firmware/README.md` |
| T11 | S3 | inline | hecho | Rediseño de la landing con la identidad v2. Navegador integrado en 1280 px y 375 px: portada, demo, pago simulado con brillo verde y burbujas, secciones, formulario; consola sin errores; sin desplazamiento horizontal; portal sin cambios (sigue en v1) |
| T10 | S1, S2 | inline | hecho | D1 `sin-morralla` (WNAM), migraciones remotas 0001–0003, Worker en https://sin-morralla.victormlaralopez.workers.dev (salud, landing, portal y demo 200); repo público https://github.com/VictorLaraL/sin-morralla con `main` y `feat/mvp-cloudflare`. Faltan los secretos, que pone el usuario |

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
- **L8 RDD T3 (`117c83e..15399d6`, riesgo alto, revisión sola):** `review-69d6213200d50a29` con lentes riesgo,
  resiliencia y confiabilidad: **aprobada y confirmada**. Advertencias no bloqueantes que se atienden con pruebas en un
  commit de corrección: un aviso firmado pero mal formado se ignoraba sin dejar rastro; si un primer aviso llegó sin
  máquina y un segundo sí la trae, se creaba el crédito y se respondía "duplicado" sin registro ni aviso en vivo; los
  créditos vencidos quedaban mudos (resuelto en T4 con el cron); un fallo del aviso en vivo devolvía 500 aunque el pago
  ya estaba guardado; la consulta larga no se detenía al cortarse la conexión; faltaba cobertura de vigencia, de
  aislamiento entre máquinas y de las respuestas 400/413/503. Reentrega hasta el ACK: se resuelve en el firmware (T7)
  guardando el último crédito servido en memoria no volátil antes de dar pulsos.
- **L10 Corrección de advertencias de T3:** RED con 4 e2e y 2 unitarias nuevas (pago incompleto con motivo, crédito
  creado por un segundo aviso, ACK de otra máquina, vigencia inválida); GREEN: unitarias 31/31, e2e 19/19 dos veces
  seguidas sobre la misma base. Además: el aviso en vivo ya no puede tumbar la respuesta del webhook, el latido del
  módulo escribe a lo más cada 30 s y la consulta larga se corta con `enable_request_signal`.
- **L11 RDD T4 + corrección (`15399d6..6446c16`):** revisión con lentes riesgo, resiliencia y confiabilidad:
  **aprobada y confirmada**. Advertencias atendidas con pruebas (RED: 7 e2e y 2 unitarias; GREEN: unitarias 34/34,
  e2e 26/26 dos veces): boleto de 60 s para el WebSocket del portal en lugar de la clave en la URL; límite de 5
  contactos por hora por huella de IP y tamaño revisado antes de leer; JSON `null` da 400; el pulso de prueba exige un
  entero de 1 a 20; los pulsos de prueba vencidos no aparecen como pagos por devolver; el ACK de un crédito ya devuelto
  se acepta y queda anotado; latido cada 20 s con 90 s de margen; un fallo al crear el QR en pey responde 502 con el
  motivo.
- **L12 RDD de la corrección de T4 (`2a32416..858ed6a`, riesgo alto, sola):** **aprobada y confirmada**. La landing
  (`6446c16..2a32416`) se evaluó riesgo medio y bajo presupuesto: sin revisión debida. Advertencias atendidas: el ACK de un
  crédito sin servicio vuelve a dar 404 (RED 1 e2e; GREEN 27/27); el latido no puede tumbar la consulta del módulo;
  `npm run deploy` aplica las migraciones remotas antes de publicar. El cambio a boleto no rompe clientes porque el portal
  todavía no se había publicado.
- **L13 RDD portal (`858ed6a..cffa3f3`):** **aprobada y confirmada**. Advertencias atendidas y verificadas en el
  navegador: al salir se borran de la página contactos, claves de rastreo y tokens; `currentTarget` se captura antes de
  esperar; el error de clave es una clase propia; el refresco automático no borra un formulario a medio editar (un pago
  en vivo llegó y el campo conservó lo escrito); no quedan reconexiones del WebSocket después de salir. Descartada con
  evidencia: `landing.js` sí se carga como módulo y el QR de la landing se dibujó tras el cambio.
- **L14 T7 entregas interrumpidas:** RED 1 e2e (ACK con `parcial=1`); GREEN e2e 28/28. El firmware guarda "en curso"
  antes de los pulsos y "hecho" después; si arranca con una entrega a medias no repite pulsos y confirma con
  `parcial=1`; el pago queda por atender. Esto cierra la advertencia de RDD sobre la reentrega hasta el ACK.
- **L15 RDD firmware (`cffa3f3..ab3642a`): corrección requerida.** Hallazgo crítico `R4-parcial-perdido-en-reintento`:
  si el primer ACK con `parcial=1` no llegaba, el módulo ya había marcado el crédito como hecho y el reintento lo
  confirmaba como entrega normal. Plan de corrección capturado (pronóstico de 20 líneas; el cambio real fue mayor porque
  la lógica se extrajo a `entrega.h` para poder probarla en la PC). RED: 3 verificaciones fallaban en ese escenario;
  GREEN 6/6 (`9fd95b2`). gentle-ai recuperó la revisión como linaje nuevo (`scope_changed`) sobre el tramo corregido:
  **aprobada y confirmada**.
- **L16 Advertencias del tramo corregido:** atendidas con pruebas (RED: 1 e2e y el firmware sin compilar; GREEN: e2e
  30/30, firmware 8/8): cerrar una entrega interrumpida como "Recibió todo" sin registrar devolución; ACK pendiente
  guardado y reintentado aunque el crédito venza; un 200 que no es crédito pone la luz en rojo con espera; el portal solo
  congela una ficha mientras se escribe en ella y ofrece "Descartar cambios". TLS sin fijar en el módulo queda como
  limitación documentada del piloto.
- **L17 Entorno local:** al poner el `database_id` real, wrangler cambia la base local (se indexa por ese id); hubo que
  reiniciar `npm run dev` para migrar la nueva base local antes de las e2e.
- **L18 RDD última corrección (`9fd95b2..54d3ed9`):** **aprobada y confirmada**. Advertencias: el ACK tardío de un
  crédito vencido no tenía prueba de punta a punta (agregada: e2e 31/31, pasa sin cambiar código). Descartadas con
  evidencia: el ACK pendiente sí termina ante un rechazo permanente, porque `confirmarConServidor` trata el 404 como final
  y un crédito devuelto responde 200; el token del módulo sobrevive a los refrescos porque vive en `tokensRecientes`.
  Pendiente menor, sin cambio por ahora: "Descartar cambios" repinta todas las fichas, así que un dueño editando dos
  máquinas a la vez perdería lo de la otra.
- **L19 (2026-11-23) Demo a un centavo:** "Sí, ajústala a $0.01". La máquina demo cuenta cualquier pago como servido
  (`creditoDemo`), la migración 0004 baja su precio a 1 centavo si aún no tiene QR, y los textos de la landing toman el
  monto del servidor. RED: 1 unitaria y 1 e2e; GREEN: unitarias 35/35, e2e 32/32; navegador: todos los montos dicen $0.01
  y un pago simulado de un centavo llena el garrafón.
- **L20 (2026-11-24) Demo en producción y entrega:** dos pagos reales de $0.01 al QR de la demo creado con pey; los
  registros del Worker muestran aviso con firma válida, pago registrado una vez, 1 pulso, entregado, sin errores. El
  comprobante del banco muestra como beneficiario al titular de la cuenta "Pruebas Pey": queda **pendiente** pasar la
  demo a la cuenta CoDi propia "Sin Morralla" cuando pey la apruebe ("si esa cuenta la dejaremos en la demo una vez la
  aprueben. dejalo como pendiente"). Modo jurado de solo lectura (`JURADO_TOKEN`): RED 1 unitaria y 3 e2e; GREEN
  unitarias 36/36, e2e 35/35; navegador: aviso de modo jurado, campos deshabilitados, solo "Ver calcomanía", claves de
  rastreo recortadas, interesados ocultos, canal en vivo conectado. `docs/entrega.md` con los textos de §10.1
  (descripción 426 palabras, instrucciones 503).
- **L21 RDD modo jurado (`0f7489f..0c8a6c1`, riesgo alto):** **aprobada y confirmada**. Advertencias descartadas con
  evidencia: sin `JURADO_TOKEN` nadie entra como jurado porque `compararSecreto` rechaza todo secreto vacío (prueba
  unitaria existente); el canal en vivo solo lleva máquina, monto, pulsos y estado, nunca claves de rastreo ni
  contactos; la lista de interesados solo se pide con el botón "Ver interesados", que en modo jurado está oculto (el
  navegador no mostró errores). Lista de compras en `docs/compras-mercadolibre.md`: Mercado Libre pidió sesión para ver
  publicaciones y Claude in Chrome no estaba conectado, así que los links quedan marcados como sin verificar.
- **L22 (2026-11-24) Paginación y dominio propio:** "ponle limite a los registros de pedidos por atender pionle
  paginacion de 5 registros, iguala ultimos pagos de codi paginacion de 5 comenzando ambos por el ultimo en hacerse" y
  "configura el nombre de dominio sinmorralla que acabo de adquirir". Paginación en el servidor (`?pagos=N&atender=N`,
  5 por página, lo más reciente primero): RED 2 unitarias y 3 e2e; GREEN unitarias 38/38, e2e 38/38; navegador: 5 filas
  por lista, "Página 2 de 43", páginas independientes. RDD: riesgo medio, bajo presupuesto, sin revisión debida.
  Dominio: `sinmorralla.com` y `www.sinmorralla.com` como dominios propios del Worker; landing, portal, API y WebSocket
  responden en ambos con certificado válido. `workers.dev` sigue activo para el webhook de pey.
- **L23 (2026-11-25) Identidad de marca v2:** "vamos a mejorar el tema estatico del producto agrega todo esto en docs
  como parte de la parte de diseño de marca" y "solo deja el documento aun no modifiquemos la landing page". Documento en
  `docs/marca/README.md` con logo conceptual y tableros de referencia. Contraste calculado: Agua Viva y Verde Pulso dan
  ~3.2:1 sobre Blanco Hielo, así que para texto pequeño se documentan `#0369A1` y `#15803D`. Landing, portal y calcomanía
  sin cambios.
- **L24 (2026-11-25) Rediseño de la landing con la identidad v2:** "con la nueva identidad de marca que tenemos audita y
  haz un refactor estetico de la landing page solo enfocate en el UI por que el UX y el contenido esta perfecto solo
  necesitamos mejorar la UI, animaciones e impacto visual, apegados a la nueva identidad logos etc." Contenido, flujo e
  identificadores de la demo sin cambios (`landing.js` intacto). Tokens v2 solo en `web/landing.css`; logo vectorial en
  `brand/v2`; efectos de presentación en `web/efectos.js` (si no carga, la página se ve completa). El commit de la página
  pasa de 400 líneas porque es la reescritura visual de una sola hoja. Los colores Agua Viva y Verde Pulso se usan solo
  en íconos, indicadores y texto grande; el texto pequeño usa `#0369A1` y `#15803D`.
- **L25 RDD rediseño de la landing (`dfa1103..0e78dac`):** evaluado riesgo medio y bajo presupuesto; escalado para
  revisarlo de todos modos por ser una reescritura de 1,242 líneas de la página pública. **Aprobada y confirmada.**
  Atendida: los trazos de las líneas de flujo terminaban en x = 1800 y, al desplazarse 400, dejaban un hueco a la
  derecha en pantallas muy anchas; ahora llegan a 2400 (medido con `getBBox`). Descartada con evidencia: las animaciones
  infinitas sí respetan "reducir movimiento" por la regla global de `web/estilos.css` (líneas 315–327). Verificación
  tras publicar: `sinmorralla.com` con QR real, canal en vivo, tres tipografías cargadas y consola sin errores;
  unitarias 38/38 y e2e 38/38.
- **L9 T4 tamaño:** el commit del Worker de T4 pasa de ~400 líneas (≈470 de código y 113 de pruebas e2e) porque el
  ruteo de la demo, el portal y el difusor vive en el mismo `index.ts`; las validaciones van en un commit previo.
- **L5 Evidencia previa:** prueba del 23 de noviembre: el mismo QR fijo de $0.01 aceptó dos pagos y pey registró dos
  transacciones exitosas (`docs/MVP.md`, H2).
