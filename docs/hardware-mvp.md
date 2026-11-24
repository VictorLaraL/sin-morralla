# Sin Morralla — Hardware del MVP

**23 de noviembre de 2026** · Precios aproximados, **por cotizar**. Comprar en México (Mercado Libre, UNIT Electronics,
AG Electrónica, zona de electrónica del Centro): lo importado tarda semanas.

**Decisión del piloto:** **sin pantalla.** Una calcomanía por máquina con su QR fijo (con monto si hay un solo precio,
sin monto si hay varios) y un módulo base con luz de estado, bip y botón. Un mismo ESP32 puede manejar varias máquinas
cercanas (lavandería, grupo de montables) con un canal de optoacoplador por máquina. Si la prueba del QR fijo falla, se agrega una pantalla de tinta electrónica (sección 5).

## 1. Módulo base (lo que se instala en la máquina)

| Pieza | Para qué | Aprox. MXN |
|---|---|---|
| ESP32 DevKit (ESP32-WROOM-32 con USB) | El cerebro: recibe el aviso de pago y manda los pulsos | $150–250 |
| Módulo optoacoplador PC817 de 2 canales | Simular la moneda; leer la señal de "fuera de servicio" | $40–100 |
| Módulo de relé de 2 canales (opcional) | "Presionar" el botón del llenado, solo si la máquina devuelve crédito en monedas | $50–100 |
| LED de panel bicolor verde/rojo (o tira corta de LED) | Verde = CoDi disponible; rojo = usar monedas | $30–60 |
| Zumbador (buzzer) | Bip de pago recibido | $20–60 |
| Botón de panel resistente al agua (opcional) | "Servir con CoDi", solo en máquinas que sirven al instante | $50–100 |
| Cables con conector JST XH de 4 pines (macho y hembra) | Arnés en Y sin cortar cables | $80–150 |
| Cargador USB de 5 V a 2 A | Alimentación aislada desde el contacto de 110 V | $80–150 |
| Caja estanca chica, sin ventana | Proteger la electrónica dentro del gabinete | $100–250 |
| Calcomanía de vinil para exterior, laminada, una por máquina | Los QR, el nombre del dueño, "verifica el nombre antes de pagar", "sin cambio" y el teléfono de aclaraciones | $100–300 |
| **Subtotal por máquina** | | **≈ $700–1,500** |

En volumen, el material bajaría a unos $350–500 por máquina.

## 2. Banco de pruebas (para no tocar la máquina del cliente)

| Pieza | Para qué | Aprox. MXN |
|---|---|---|
| Monedero multimoneda de 12 V, igual al de la máquina | Probar con el mismo modelo | $300–600 |
| Tarjeta temporizadora para monedero, o un ESP32 extra que haga de tarjeta | Simular la tarjeta de la máquina | $150–400 |
| Fuente de 12 V a 2 A | Alimentar el banco | $150–250 |
| Minibomba de 12 V con manguera, o un LED | Ver que "sale el agua" | $100–200 |
| Monedas de $1, $2, $5 y $10 | Configurar el monedero y probar el modo "aprender" | — |
| **Subtotal** | | **≈ $700–1,450** |

## 3. Herramientas (solo lo que no tengan)

| Pieza | Para qué | Aprox. MXN |
|---|---|---|
| Multímetro | Medir voltajes en la visita (indispensable) | $250–500 |
| Analizador lógico USB de 8 canales | Medir el ancho exacto de los pulsos | $150–300 |
| Cautín, termofil, pinzas y crimpadora para JST | Armar el arnés | $300–700 |
| Protoboard y cables | Prototipo | $100–200 |

## 4. Conectividad, solo si no hay WiFi

| Pieza | Aprox. MXN |
|---|---|
| Router 4G de bolsillo | $600–1,200 |
| Chip de prepago con datos | $100–200 al mes |

## 5. Ya no hace falta: pantalla de tinta electrónica

La prueba del 23 de noviembre confirmó que un QR fijo acepta varios pagos, así que esta sección queda solo como
referencia.

| Pieza | Para qué | Aprox. MXN |
|---|---|---|
| Pantalla de tinta electrónica de 4.2″ para ESP32 | Mostrar un QR nuevo por venta; se lee al sol, sin luz ni batería | $400–600 |
| Botones por llenado (2–4) | Elegir el llenado antes de mostrar el QR | $100–200 |

No comprar.

## 6. Lo que no es hardware

- Uno o dos celulares del equipo con CoDi activado en su app del banco, para pagar $0.01 de prueba.
- Laptop y cable USB de datos para programar el ESP32.
- Servidor público con HTTPS para recibir los avisos de pey (gratis o ~US$5 al mes).
- API key propia de este proyecto.

## Notas

- **Antes de comprar el monedero y el arnés**, confirmar en la visita el modelo del monedero y el conector.
- El ESP32, el optoacoplador, la luz, el bip, el multímetro y el banco de pruebas se pueden comprar ya: sirven igual
  con calcomanías o con pantalla.
