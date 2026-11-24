# Lista de compras en Mercado Libre (hardware del MVP)

**24 de noviembre de 2026.** Basada en [hardware-mvp.md](hardware-mvp.md) y en las conexiones del
[firmware](../firmware/README.md).

> **Nada de esta lista está verificado.** Mercado Libre pidió iniciar sesión para ver cualquier publicación, así que no
> se pudo abrir ninguna. Los links **directos** (MLM-…) salieron del índice de un buscador y su título coincide con la
> pieza, pero pueden estar pausados o haber cambiado. Los links de **búsqueda** siempre funcionan. Los precios son los
> que reportó el buscador, no los vistos en Mercado Libre. Antes de comprar, abre cada link con tu sesión y confirma
> título, precio, envío desde México (de preferencia FULL) y reseñas.

## Antes de comprar

1. **En la visita a la máquina**, mide con el multímetro que el monedero sea de **12 V** y confirma el modelo y el
   conector (JST XH de 4 pines: 12 V, pulso, GND, inhibir) y el orden de sus pines. Hazlo antes de comprar el monedero,
   la tarjeta y el arnés del banco de pruebas.
2. **Los 12 V no van directo al ESP32 ni al analizador lógico**: sus entradas aguantan 3.3–5 V. Para medir la línea
   COIN usa un divisor de voltaje o el mismo optoacoplador.
3. **Revisa el esquema del módulo PC817.** Muchos ya traen resistencia de entrada; en ese caso la de 330 Ω del
   firmware sobra o baja demasiado la corriente. Con PC817 sueltos no hay sorpresas.
4. **El LED bicolor debe ser de cátodo común**: el firmware enciende cada color con nivel alto (GPIO 25 y 33).
5. **El zumbador de 5 V en un GPIO de 3.3 V** suena más bajo y consume 25–30 mA. Si queda débil, agrega un transistor.
6. **Evita "Compra internacional / Envío desde China"**: llega en semanas. Aparece sobre todo en el analizador lógico,
   el termofil, el monedero CH-926, el vinil y el router 4G.

## Módulo base (uno por máquina)

| Pieza | Cant. | Links | Precio aprox. | Notas |
|---|---|---|---|---|
| ESP32 DevKit V1 (ESP32-WROOM-32), USB-C | 1 (+1 de repuesto) | [Búsqueda](https://listado.mercadolibre.com.mx/esp32-devkit-v1-tipo-c) · [CP2102 con cable](https://articulo.mercadolibre.com.mx/MLM-3483511654-modulo-esp32-nodemcu-devkit-v1-cp2102-30p-tipo-c-con-cable-_JM) · [CH340C](https://articulo.mercadolibre.com.mx/MLM-1986539235-tarjeta-esp32-wroom-32-tipo-c-core-wifi-y-bluetooth-ch340c-_JM) | $119–139 | La de 30 pines expone los GPIO 14, 25, 26, 27 y 33. Varias no traen cable |
| Módulo optoacoplador PC817 de 2 canales | 1 | [Búsqueda](https://listado.mercadolibre.com.mx/modulo-optoacoplador-pc817-2-canales) | $57–67 | Alternativa: PC817 sueltos (20 pzs ≈ $69) |
| LED bicolor verde/rojo 5 mm, **cátodo común** | 1 paquete | [Búsqueda](https://listado.mercadolibre.com.mx/led-bicolor-rojo-verde) | $50 (10 pzs) | Muchos son de ánodo común |
| Kit de resistencias 1/4 W (incluye 220 Ω y 330 Ω) | 1 | [Kit de 840 pzs](https://articulo.mercadolibre.com.mx/MLM-771444785-kit-de-resistencias-de-14-watt-840-pzas-y-42-valores-_JM) · [Búsqueda](https://listado.mercadolibre.com.mx/kit-resistencias-1-4-watt) | sin dato | 42 valores |
| Zumbador **activo** de 5 V | 1 paquete | [10 piezas](https://www.mercadolibre.com.mx/10-piezas-zumbador-de-5v-buzzer-activo-arduino-pic/p/MLM2046528322) · [Búsqueda](https://listado.mercadolibre.com.mx/buzzer-activo-5v) | $73 (10 pzs) | |
| Botón metálico 16 mm IP65, momentáneo | 1 | [Botón IP65](https://articulo.mercadolibre.com.mx/MLM-1834364262-push-boton-metalico-switch-momentaneo-16mm-12v-3a-120v-ip65-_JM) · [Búsqueda](https://listado.mercadolibre.com.mx/boton-pulsador-metalico-16mm-ip65) | $77–89 | Opcional ("Servir con CoDi") |
| Conectores JST XH 2.54 mm de 4 pines, macho y hembra | 1 kit | [5 pares con cable](https://articulo.mercadolibre.com.mx/MLM-1840136342-conector-jst-xh-254-hembramacho-22-agw-4-pin-5-pares-_JM) · [40 juegos sin cable](https://articulo.mercadolibre.com.mx/MLM-1415014001-40-set-conectores-jst-xh-254mm-4-pines-hembra-y-macho-_JM) · [Búsqueda](https://listado.mercadolibre.com.mx/jst-xh-4-pines) | $189–299 | Los que no traen cable hay que crimparlos. Confirma antes el conector del monedero |
| Cargador USB 5 V 2 A con cable USB-C **de datos** | 1 | [Búsqueda](https://listado.mercadolibre.com.mx/cargador-5v-2a-tipo-c) | $89 | Muchos combos traen micro-USB |
| Caja estanca IP65 sin ventana (~100×68×50 mm) | 1 | [Gabinete IP65](https://articulo.mercadolibre.com.mx/MLM-1906948681-registro-gabinete-plastico-para-exterior-ip65-100-x-68-_JM) · [Búsqueda](https://listado.mercadolibre.com.mx/gabinete-plastico-exterior-ip65) | $92–122 | Usa prensaestopas para los cables |
| Módulo de relé de 2 canales 5 V | 1 | [Relé 2 canales](https://articulo.mercadolibre.com.mx/MLM-603599795-modulo-de-2-relevadores-relay-5v-10a-robotica-arduino-pic-_JM) · [Búsqueda](https://listado.mercadolibre.com.mx/modulo-rele-de-2-canales) | $66–74 | Opcional. Con lógica de 3.3 V algunos no disparan |
| Vinil adhesivo imprimible para exterior | 1 paquete | [Vinil impermeable](https://articulo.mercadolibre.com.mx/MLM-1332917899-papel-adhesivo-de-vinilo-imprimible-impermeable-2550x-para-_JM) · [Búsqueda](https://listado.mercadolibre.com.mx/vinil-adhesivo-imprimible-resistente-al-agua) | sin dato | Solo si imprimen las calcomanías ustedes; sin laminar no resiste el agua |
| Mica para laminar en frío, tamaño carta | 1 paquete | [50 hojas](https://articulo.mercadolibre.com.mx/MLM-774187005-mica-adherible-transfer-tamano-carta-50-hojas-_JM) · [Búsqueda](https://listado.mercadolibre.com.mx/mica-autoadherible-tamano-carta) | $350 | No compres mica térmica sin enmicadora |

**Subtotal aproximado:** $720–1,120 sin resistencias, vinil, mica ni relé. Varias piezas vienen en paquete y alcanzan
para varias máquinas.

## Banco de pruebas (para no tocar la máquina del cliente)

| Pieza | Cant. | Links | Precio aprox. | Notas |
|---|---|---|---|---|
| Monedero multimoneda programable de 12 V | 1 | [Programado $1, 2, 5 y 10](https://articulo.mercadolibre.com.mx/MLM-1422080813-monedero-multimonedas-programado-para-125-y-10-_JM) · [Con marco LED](https://articulo.mercadolibre.com.mx/MLM-1510527480-monedero-multimoneda-programado-1-2-5-y-10-marco-led-_JM) · [Búsqueda](https://listado.mercadolibre.com.mx/monedero-multimoneda-12v) | $649–803 | Idealmente el mismo modelo que la máquina del piloto |
| Tarjeta temporizadora para despachador de agua | 1 | [Timer de despachador](https://articulo.mercadolibre.com.mx/MLM-874723787-timer-despachador-vending-agua-purificada-monedero-_JM) · [Kit timer + monedero + fuente](https://articulo.mercadolibre.com.mx/MLM-926348441-kit-temporizador-timermonedero-multimonedafuente-de-poder-_JM) · [Búsqueda](https://listado.mercadolibre.com.mx/tarjeta-vending-de-agua-purificada) | desde $649 | El kit podría cubrir monedero, tarjeta y fuente. Alternativa: un segundo ESP32 que haga de tarjeta |
| Fuente de 12 V 2 A | 1 | [Volteck 12 V 2 A](https://www.mercadolibre.com.mx/fuente-de-alimentacion-eliminador-12v-2a-volteck/p/MLM47854781) · [Búsqueda](https://listado.mercadolibre.com.mx/fuente-de-poder-12v-2a) | desde $99 | Plug de 5.5 mm; conviene un adaptador de jack a bornes |
| Minibomba de diafragma 385 de 12 V con manguera | 1 | [Bomba 385](https://articulo.mercadolibre.com.mx/MLM-812041516-bomba-de-agua-12v-rs-385-diafragma-385-arduino-_JM) · [Búsqueda con manguera](https://listado.mercadolibre.com.mx/mini-bomba-de-diafragma-r385-con-manguera) | $75–139 | ~0.4 A. Un LED la puede reemplazar |
| Segundo ESP32 | 1 | Los mismos links del módulo base | $119–139 | Hace de tarjeta si no compran la temporizadora |

**Subtotal aproximado:** $1,000–1,200 usando el segundo ESP32 como tarjeta; $1,650–1,850 con una tarjeta temporizadora.

## Herramientas (solo las que no tengan)

| Pieza | Cant. | Links | Precio aprox. | Notas |
|---|---|---|---|---|
| Multímetro | 1 | [Truper MUT-33](https://www.mercadolibre.com.mx/tester-multimetro-digital-10-a-profesional-truper-mut-33/p/MLM23140151) · [Búsqueda UNI-T UT33B](https://listado.mercadolibre.com.mx/multimetro-uni-t-ut33b) | $290–520 | Indispensable en la visita |
| Analizador lógico USB de 8 canales 24 MHz | 1 | [Analizador genérico](https://articulo.mercadolibre.com.mx/MLM-2980707596-analizador-logico-saleae-8-ch-24mhz-usb-generico-logic-8-_JM) · [Búsqueda](https://listado.mercadolibre.com.mx/analizador-logico-usb-24mhz-8-canales) | $145–480 | Se usa con PulseView. Nunca a 12 V directo |
| Cautín 60 W ajustable y soldadura | 1 | [Kit de cautín](https://www.mercadolibre.com.mx/kit-cautin-soldador-60w-temperatura-ajustable-6-puntas-intercambiables-y-soporte-tecneu/p/MLM34218759) · [Búsqueda de soldadura](https://listado.mercadolibre.com.mx/soldadura-estano-0.8mm) | $156 + soldadura | |
| Termofil (kit de tubo termoencogible) | 1 | [Búsqueda](https://listado.mercadolibre.com.mx/kit-tubo-termoretractil) | $70–500 | |
| Crimpadora para JST XH (SN-28B) | 1 | [SN-28B](https://www.mercadolibre.com.mx/pinzas-crimpadoras-sn-28b/p/MLM46837781) · [Búsqueda](https://listado.mercadolibre.com.mx/pinza-sn-28b) | $250–300 | Solo si compran conectores sin cable |
| Protoboard 830 y cables jumper | 1 | [Kit de protoboard](https://articulo.mercadolibre.com.mx/MLM-929875041-kit-protoboard-830-puntos-fuente-mb102-65-cables-dupont-_JM) · [Búsqueda de jumpers macho-hembra](https://listado.mercadolibre.com.mx/cables-dupont-macho-hembra) | $85–149 | El ESP32 casi cubre todo el ancho: ayudan los macho-hembra |

**Subtotal si hay que comprarlas todas:** $1,000–2,100.

## Conectividad (solo si el local no tiene WiFi)

| Pieza | Cant. | Links | Precio aprox. | Notas |
|---|---|---|---|---|
| Router 4G portátil desbloqueado (Huawei E5576) | 1 | [Huawei E5576](https://www.mercadolibre.com.mx/router-modem-huawei-4g-lte-liberado-e5576/p/MLM20717237) · [Búsqueda](https://listado.mercadolibre.com.mx/router-4g-huawei) | $1,000–2,200 | Hay usados y desde China. El chip prepago se compra en tienda |
