# Investigación — Despachadores de agua autoservicio en México

**Fecha:** 23 de noviembre de 2026 · **Para:** diseño del módulo Sin Morralla

> **Ojo con la confiabilidad:** casi todos los datos vienen de páginas de vendedores (publicidad, no comprobado).
> Lo marcado como *inferencia* es análisis nuestro, no un dato publicado. Todo lo técnico hay que confirmarlo con la
> máquina real en la visita.

---

## Resumen

1. **Hay muchos fabricantes mexicanos** (Puritec, Oasis Expres, Purificadoras Agua, Hidromatic, Despachadores
   Automáticos…) y equipos chinos. Un despachador cuesta entre **$16,000 y $135,000 MXN**.
2. **La mayoría usa monedero multimoneda de pulsos a 12 V** conectado a la tarjeta con un **conector JST XH de 4 pines**
   (12 V, pulso, GND, inhibit). Eso confirma la estrategia de emular pulsos con un arnés en Y que se enchufa.
3. **Hay tres formas de despachar:** por tiempo en cuanto entra la moneda, crédito acumulado más botón, o tarjetas
   MDB a 24 V. Las dos primeras son compatibles; **MDB queda fuera de la versión 1**.
4. **No encontramos ningún módulo CoDi** para despachadores ya instalados en México. En Brasil existe uno casi
   idéntico para Pix (ESP32, sin mensualidad), lo que valida la idea.
5. **Mercado:** unos **24,000 establecimientos** de purificación de agua en México, y hay notas recientes de **robo y
   vandalismo** de máquinas para sacar las monedas.

## 1. Fabricantes, modelos y precios

| Fabricante | Modelo / dato | Precio publicado | Notas |
|---|---|---|---|
| [Puritec](https://www.puritecequipos.com.mx/product/despachador-automatico-de-agua-24-horas-economico/) | Despachador económico | $16,400 ($26,500 con hopper) | Despacha **por tiempo según la moneda**, monedero DG600F, 110 V, no da cambio |
| [Puritec](https://www.puritecequipos.com.mx/product/maquina-vending-de-agua-purificada/) | Vending con purificación | $102,500 | Monedas de $1 a $10, da cambio de $1, monedero ICT UCA E |
| [Oasis Expres](https://oasisexpres.com/pages/despachadores) | Clásico / Premium | $19,400 / $27,800 | Clásico sin cambio ("monto exacto"); Premium con cambio |
| [Purificadoras Agua](https://www.purificadorasagua.com.mx/purificadoras-de-agua-automaticas-24-horas/) | Despachador / paquetes | $26,500 / $87,800–$102,500 | |
| [Despachadores Automáticos](https://despachadoresautomaticos.com/despachadores-automaticos-2412/catalogo/dap-touch/) | Refill Touch | No publicado | Pantalla táctil de 10.9", tarjeta propia, cambio de $1 |
| [Hydrotech](https://www.hydrotech.mx/) | Solo Agua | $135,000 | Terminal de tarjeta opcional |
| [Hidromatic](https://hidromatic.mx/vending-de-agua-purificada) | Vending | No publicado | Tarjeta "HM", sensor de flujo, billetero opcional |
| Importados (Jiangmen Pukui, Kayson) | Varios | No revisado | Anuncian tarjeta IC, monedas, billetes y GSM |

Otros: [Puritronic](https://www.puritronic.com.mx/purificadoras-de-agua/gabinete-vending/),
[Agua Inmaculada](https://www.aguainmaculada.com/blog/que-son-las-maquinas-expendedoras/). Una empresa china
(Aquarelief) instaló cerca de 1,000 máquinas en Atizapán en 2025, a $7 el garrafón
([nota](https://www.elimparcial.com/mexico/2025/05/10/empresa-china-instala-maquinas-de-agua-en-escuelas-de-atizapan-estado-de-mexico-precio-objetivo-y-todo-lo-que-debes-saber)).

## 2. Electrónica típica

**Tarjetas controladoras que se venden en México**

| Tarjeta | Precio | Datos |
|---|---|---|
| [Puritec por pulsos](https://www.puritecequipos.com.mx/product/tarjeta-electronica-vending-agua-purificada-pulsos/) | $4,500 | 12 V a 1–2 A, "compatible con cualquier monedero multimoneda de pulsos", caudalímetro o tiempo, 4 llenados, hopper opcional |
| [Puritec MDB](https://www.puritecequipos.com.mx/product/tarjeta-electronica-vending-agua-purificada-mdb/) | $7,600 | **24 V**, monederos CPI Gryphon o MEI CF7000 |
| [Manantial (kit)](https://manantialwater.com.mx/sistema-electronico-tarjeta-para-despachdor-de-agua) | $8,800 | Monedero DF600F, eliminador de 12 V a 2 A, caudalímetro 3/4", válvulas 110 VAC o 12/24 VDC; diagrama solo con la compra |
| [JMDM-SELLV4 (China)](http://jmctrl.en.hisupplier.com/product-1240394-coin-control-PCB-board-Digital-Tube-Display-Auto-Water-Vending-Machine-with-Coin-and-IC-Card-controller.html) | — | AC 9 V o DC 12 V, monedero "four-wire 12V", caudalímetro de 3 hilos, lector IC, RS232 |

**Conector del monedero:** JST XH de 4 vías, paso de 2.5 mm (B4B-XH-AM en la tarjeta, XHP-4 en el cable), con
12 V, pulso, GND e inhibit. **No hay estándar de colores**: dos fuentes asignan los cables distinto
([cable-tester](https://www.cable-tester.com/coin-acceptor-connector-pin-out),
[Arcade Express](https://www.arcadexpress.com/es/cableado-cables/1111-cableado-4-pines-para-monedero-universal-616-ch-926.html)).
Siempre medir con multímetro.

**Monederos**
- **CH-926 / 616:** switch NO/NC; ancho de pulso entre ~20 y ~100 ms según la fuente.
- **DG600F:** puede **acumular el crédito dentro del monedero** y, en uno de sus modos, mandar
  "monto ÷ precio" pulsos. Es decir, **un pulso no siempre vale $1**
  ([manual](https://www.arcadexpress.com/documentos/ManualDG600F.pdf), tabla de pines no confirmada).
- No encontramos despachadores mexicanos con ccTalk ni detalles públicos de billeteros.

## 3. Cómo despachan

| Modo | Cómo funciona | Qué implica para el módulo *(inferencia)* |
|---|---|---|
| **Por tiempo según la moneda** | El agua sale en cuanto entra la moneda (Puritec económico) | Si mandamos pulsos al recibir el pago, el agua sale de inmediato. Hay que pedir al cliente confirmar que su garrafón está colocado antes de mandar los pulsos |
| **Crédito acumulado + botón** | La moneda suma crédito; el cliente elige llenado (garrafón, medio, galón, litro) por caudalímetro o tiempo | Compatible directo: los pulsos suman crédito y el cliente presiona el botón como siempre |
| **MDB (24 V)** | Protocolo digital de vending | Fuera de la versión 1; el módulo debe detectarlo y avisar |

- **Cambio:** solo con hopper opcional, en monedas de $1; muchos modelos no dan cambio.
- **Inhibit:** sin agua, la máquina muestra "fuera de servicio" y rechaza monedas (Manantial). Si leemos esa línea,
  podemos **quitar el QR cuando la máquina no puede servir**.

## 4. Conectividad actual

La mayoría de las tarjetas mexicanas solo muestran el reporte de ventas en su pantalla, sin internet. Excepciones:
Agua Inmaculada ("Smart App"), Hidromatic (plataforma web) y Hydrotech (app anunciada como "próximamente"). Los
equipos chinos anuncian GSM o 4G. **El dueño típico no tiene telemetría: el panel de ventas es un valor agregado.**

## 5. Competencia

| Producto | Dónde | Cómo funciona | Diferencia con nosotros |
|---|---|---|---|
| [Módulo Pix con ESP32](https://www.rafaelaquino.com.br/2026/03/sistema-pix-sem-mensalidades-para.html) | Brasil | Wi-Fi, entrada de pulsos, cuenta Mercado Pago, R$980, sin mensualidad | Mismo concepto para Pix: valida la idea |
| [Foschia](https://expendedoras-automaticas.com.ar/2026/11/09/sumar-pago-qr-expendedora/) | Argentina | QR de Mercado Pago, solo MDB, instalación de ~30 min | No sirve para monederos de pulsos |
| [POSVending](https://posvending.lat/) | Argentina, Uruguay | MDB, pulsos y RS232/ccTalk con Mercado Pago | No usa CoDi |
| [LavaPay](https://lavapay.com.mx/) | México (lavanderías) | QR que abre WhatsApp y pago por SPEI | Otro giro; sin confirmación automática conocida |
| [Nayax Onyx / VPOS](https://www.nayax.com/solution/onyx/) | Global | Tarjeta y QR, MDB o pulsos | Caro y con comisión por transacción |
| [PayRange BluKey Pulse](https://payrange.com/products/blukey/) | EE. UU. | "Imita" el pulso junto con las monedas | Mismo método, otro mercado |
| [Laundro](https://info.thelaundro.com/how-to-upgrade-coin-laundromats-to-cashless-qr-pay-laundro/) | Global (lavanderías) | Se empalma a las líneas de pulso sin cortar el arnés; energía de 12/24 V | Mismo método de instalación |

**No encontramos un módulo CoDi para despachadores de agua en México.**

## 6. Mercado

- **~24,000 establecimientos** de purificación de agua en México (INEGI, citado en diciembre de 2023) y **2,068 en la
  CDMX** según el DENUE ([La Razón](https://www.razon.com.mx/negocios/falta-regulacion-rellenadoras-agua-problema-salud-publica-556852),
  [Publimetro](https://www.publimetro.com.mx/noticias/2023/07/03/cdmx-purificadoras-no-garantizan-la-calidad-del-agua-que-beben-millones-de-capitalinos/)).
  No hay un conteo nacional de máquinas; Agua Inmaculada dice tener más de 2,500 franquiciados.
- **Precio del garrafón de 20 L:** entre **$13 y $26** ([ADN40](https://www.adn40.mx/es-tendencia/2026-02-20/cuanto-dura-un-garrafon-agua-20-litros/));
  Puritec anuncia "desde $14".
- **Robo y vandalismo** de máquinas para sacar monedas, con notas recientes
  ([Tiempo](https://www.tiempo.com.mx/local/danaron-maquina-expendedora-agua-dinero-villa-juarez/),
  [Por Esto](https://www.poresto.com/campeche/2026/9/17/alertan-por-sujeto-que-vandaliza-maquinas-despachadoras-de-agua-y-tira-tapas-limpias-en-dzitbalche.html)).
  No encontramos fuentes sobre monederos atascados.
- **Adopción de CoDi:** alrededor de 21 millones de 94 millones de cuentas, según una nota que cita a La Jornada
  ([fuente](https://ciaespinoza.com/en/blogs/news/ley-economia-digital-pagos-qr-maquinas-expendedoras-octubre-2026));
  el mismo blog dice que la Ley de Economía Digital se aprobó en comisión en octubre de 2026. Fuente secundaria:
  verificar antes de citarlo en el pitch.

## 7. Qué cambia en el diseño del módulo *(inferencia)*

- **Arnés en Y con conector JST XH de 4 pines** (macho y hembra): se desconecta el cable del monedero, se intercala
  el arnés y se vuelve a conectar. Del mismo conector salen 12 V y GND para alimentar el módulo. Para conectores
  distintos, una variante con terminales de pinza.
- **Modo "aprender" para configurar fácil:** el instalador mete una moneda de $1 y una de $10, y el módulo copia
  polaridad (NO/NC), ancho de pulso y cuántos pulsos manda cada peso. Resuelve que no haya estándar de colores ni
  de tiempos, y el caso del DG600F donde un pulso no vale $1.
- **Leer la línea inhibit:** si la máquina está "fuera de servicio", la pantalla quita el QR.
- **Máquinas por tiempo:** antes de mandar los pulsos, la pantalla pide "coloca tu garrafón y presiona el botón";
  el módulo necesita un botón propio o pantalla táctil.
- **Precio exacto por llenado:** como muchas máquinas no dan cambio, conviene que el cliente elija el llenado en la
  pantalla y el QR pida ese monto exacto. Así desaparecen los pagos incompletos y los sobrantes.
- **Montaje:** caja IP54 o mejor (hay salpicaduras), fija con cinta VHB o velcro dentro del gabinete, con opción de
  riel DIN; la pantalla en un lugar visible y protegido.
- **Consumo:** el eliminador típico da 12 V a 2 A; un módem 4G tiene picos de 2 A. Preferir el Wi-Fi del local.
- **Configuración desde el celular:** por Bluetooth o con una red Wi-Fi propia del módulo y una página de ajustes
  (precios de cada llenado, parámetros del pulso, botón "inyectar $1" para probar).
- **Diferenciador para vender:** CoDi, sin comisión, sin cortar cables y con panel de ventas que hoy casi ninguna
  máquina tiene.

## 8. Qué agregar al levantamiento técnico de la visita

- Fabricante y modelo de la máquina; fotos de la tarjeta controladora y su etiqueta.
- Modelo del monedero (CH-926, 616, DG600F, ICT…) y si es de pulsos o MDB.
- Conector del monedero: ¿JST XH de 4 pines? Fotos del conector y de los colores.
- ¿Despacha por tiempo en cuanto entra la moneda, o acumula crédito y luego se presiona un botón?
- ¿Cuántos llenados ofrece y a qué precio cada uno? ¿Da cambio?
- ¿Tiene línea inhibit conectada? ¿Qué pasa cuando se queda sin agua?
