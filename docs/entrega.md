# Entrega en pey.build

Textos listos para copiar en el formulario de entrega (bases §10.1). La entrega se puede editar hasta el
**12 de diciembre de 2026 a las 23:59** (hora de la Ciudad de México); conviene subir una primera versión completa antes.

| Campo (§10.1) | Qué poner | Estado |
|---|---|---|
| 1. Nombre y descripción (máx. 500 palabras) | Sección 1 de este documento (426 palabras) | Listo |
| 2. Demo pública | https://sinmorralla.com | Funcionando con pagos reales |
| 2. Credenciales de prueba | Portal https://sinmorralla.com/portal/ con la clave de jurado (solo en el formulario, nunca en el repositorio) | Falta configurar `JURADO_TOKEN` |
| 3. Video (máx. 3 minutos, público) | Link del video | Por grabar |
| 4. Repositorio | https://github.com/VictorLaraL/sin-morralla | Listo |
| 5. Componentes previos y de terceros | Sección 2 de este documento | Listo |
| 6. Instrucciones de prueba (máx. 1000 palabras) | Sección 3 de este documento (503 palabras) | Listo; poner la clave de jurado |
| 7. Integrantes | Un integrante (cuenta personal) | Listo |

**Pendiente antes de cerrar:** cambiar la demo a la cuenta CoDi propia "Sin Morralla" en cuanto pey la apruebe (nueva
API Key, webhook, secretos `PEY_API_KEY` y `PEY_WEBHOOK_SECRET`, y "Crear QR nuevo" en la demo), y actualizar la nota
del beneficiario en las secciones 1 y 3.

**Guion sugerido del video (§10.1.3: desde que se genera el cobro hasta que el proyecto reacciona):**

1. (0:00–0:20) El problema: máquinas de agua que solo aceptan monedas.
2. (0:20–0:50) En el portal, "Crear QR": pey crea el QR fijo de la máquina; se muestra la calcomanía.
3. (0:50–1:50) Pago desde la app del banco con el celular, en pantalla dividida con la landing y el portal: llega el
   aviso, el garrafón se llena y el portal muestra el pago en vivo.
4. (1:50–2:40) El módulo en el banco de pruebas: el monedero recibe los pulsos y la bomba sirve.
5. (2:40–3:00) Cierre: sin cambiar la máquina, sin terminal, ventas en tiempo real.

No muestres en el video el comprobante del banco sin tapar nombres, números de cuenta ni la clave de rastreo.

---

## 1. Nombre y descripción

**Sin Morralla**

En México hay miles de **despachadores de agua purificada** en las colonias y casi todos funcionan **solo con
monedas**. Cada vez menos gente trae morralla: el cliente que no trae monedas se va, y el dueño pierde la venta.
Cambiar la máquina por una con terminal es caro, y las terminales cobran comisión por cada venta.

**Sin Morralla** es un módulo pequeño (un ESP32 y un optoacoplador) que se conecta **en paralelo** al monedero que la
máquina ya tiene. En la máquina se pega una **calcomanía con un QR CoDi fijo** que ya trae el precio. El cliente:

1. Abre la app de su banco, entra a CoDi y escanea la calcomanía.
2. Revisa el nombre del dueño y el monto, y paga.
3. En segundos la luz parpadea, suena un bip y **la máquina sirve**, porque el módulo le manda los mismos pulsos que
   mandaría una moneda.

La máquina no se modifica, las monedas siguen funcionando y, si un día se quita el módulo, todo queda como estaba.

**Para el dueño** hay un portal con las ventas CoDi del día en vivo, el estado de cada máquina (en línea o no), la
configuración del precio y de los pulsos, la calcomanía lista para imprimir y una lista de **pagos por atender**: los
que la máquina no pudo servir, para devolverlos desde su banco si el cliente lo pide.

**Reglas de cobro pensadas para la calle.** CoDi no da cambio: el QR trae el precio exacto y lo que se pague de más
nunca se devuelve en monedas. Así nadie puede vaciar el cambio de la máquina pagando con CoDi. Un pago se sirve **una
sola vez**, aunque pey repita el aviso o el módulo se reinicie a media entrega, y ningún pago se pierde: si no se
sirvió, aparece en el portal.

**Por qué CoDi y pey.** CoDi no tiene comisión para el cliente, todos los bancos lo tienen en su app y el dinero llega
por SPEI con su clave de rastreo. Con el API de pey creamos un QR fijo por máquina (`POST /codi/qr` con
`expiration: 0`) y recibimos cada pago por webhook. El 23 de noviembre comprobamos que **un mismo QR fijo acepta
varios pagos**, que era la hipótesis que hacía posible poner una calcomanía en lugar de una pantalla.

**La demo** de la landing es una máquina virtual con su propio QR real de **un centavo**: quien paga desde su banco ve cómo se
llena un garrafón en la página, en vivo, con el mismo camino que usaría una máquina real.

## 2. Componentes previos y de terceros

- **Prototipo propio anterior al hackatón** (carpeta `hackaton-mexico-2026`, del mismo autor, no publicada): de ahí se
  adaptaron la idea de la verificación de avisos de pey, el cálculo de pulsos, la primera versión del firmware y los
  simuladores. En este repositorio se reescribieron para Cloudflare (Worker, D1, Durable Object) y se ampliaron.
- **Todo el código de este repositorio** se escribió a partir del 23 de noviembre de 2026. Su historia empieza en el
  commit `f1714e5` (documentación) y `5a8a4f2` (estructura).
- **Terceros:** [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 (MIT, incluido en
  `web/vendor`) para dibujar el QR; `standardwebhooks` solo en pruebas, para comprobar la firma contra la librería
  oficial; Wrangler y TypeScript como herramientas.

## 3. Instrucciones para probar el proyecto

**1. La demo en línea (2 minutos, cobro real de un centavo)**

1. Abre https://sinmorralla.com. La tarjeta "Demo en vivo" muestra el QR CoDi real de $0.01
   de una máquina de agua virtual. Ese QR lo creó el portal de Sin Morralla con el API de pey (`POST /codi/qr`).
2. Abre la app de tu banco, entra a CoDi y escanea el QR. Si estás en el celular, presiona "Descargar QR" y ábrelo
   desde la app del banco (opción de leer un QR desde una imagen).
3. Revisa el monto ($0.01) y paga. Mientras pey aprueba la cuenta CoDi propia del proyecto, el beneficiario que muestra
   tu banco es el titular de la cuenta de pruebas "Pruebas Pey".
4. En segundos pey avisa al Worker por webhook; el Worker verifica la firma, registra el pago una sola vez y lo manda en
   vivo a la página. Verás "¡Pago recibido!", el pulso al monedero y el garrafón llenándose. El contador de pagos de hoy
   sube para todos los que tengan la página abierta.

**2. El portal del dueño en modo jurado**

1. Abre https://sinmorralla.com/portal/ y entra con la clave de solo lectura:
   `[CLAVE DE JURADO]`.
2. Verás lo mismo que el dueño: ventas del día y de la semana, máquinas en línea, pagos por atender, últimos pagos y la
   calcomanía imprimible de cada máquina ("Ver calcomanía"). Las claves de rastreo se muestran recortadas y los datos
   de los interesados no se muestran.
3. Deja el portal abierto y vuelve a pagar el QR de la demo: el pago aparece en vivo.

En modo jurado no se puede cambiar nada; cualquier cambio responde "solo lectura".

**3. El recorrido completo en tu computadora (5 minutos, sin dinero real)**

Requisitos: Node.js 22.18 o más reciente.

```
git clone https://github.com/VictorLaraL/sin-morralla.git
cd sin-morralla
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

- Abre http://localhost:8787 y presiona "Simular pago de $0.01". El botón manda un aviso firmado al mismo
  `/webhooks/pey` que usa pey, así que recorre el camino completo. Todo lo simulado dice SIMULADO.
- Abre http://localhost:8787/portal/ con la clave `PORTAL_TOKEN` de tu `.dev.vars` (en local eres el dueño): crea el
  QR de la máquina "Despachador de agua", cambia su precio, genera el token del módulo, manda un pulso de prueba e
  imprime la calcomanía.
- Pruebas automáticas: `npm test` (36 unitarias), `npm run e2e` con `npm run dev` corriendo en otra terminal (35 de
  punta a punta: firmas, pagos repetidos, consulta larga del módulo, créditos vencidos, entregas interrumpidas, modo
  jurado) y `npm run test:firmware` (8 de la lógica del ESP32; necesita g++, clang++ o Visual Studio Build Tools).

**4. El hardware**

`firmware/README.md` tiene las conexiones del ESP32 con el optoacoplador, el protocolo con el Worker y por qué un pago
nunca se sirve dos veces aunque se vaya la luz. El sketch completo todavía no se prueba en una placa con un monedero
real; su lógica de entrega sí se prueba en la PC.

**Dónde mirar en el código:** `src/worker/pey.ts` (creación del QR en pey), `src/worker/webhook.ts` y
`src/core/firma.ts` (aviso firmado e idempotencia), `src/worker/dispositivo.ts` (consulta larga del módulo) y
`firmware/sin-morralla-esp32/entrega.h` (entrega en dos fases).
