# Sin Morralla — Definición del MVP

**Versión 0.6** · 23 de noviembre de 2026 · **Estado:** borrador para validar con el cliente piloto

> Este documento define qué vamos a construir y probar con una máquina real antes de escribir más código.
> Lo marcado como **[por llenar]** se completa en la visita al dueño de la máquina.
> Investigación de soporte: [investigacion-maquinas-agua.md](investigacion-maquinas-agua.md) · Lista de compras:
> [hardware-mvp.md](hardware-mvp.md).

**Cambios en la v0.6:** validamos que un QR fijo acepta varios pagos (H2).

**Cambios en la v0.5:** **una sola calcomanía por máquina**; segmentos para buscar prospectos en
[prospectos-segmentos.md](prospectos-segmentos.md).

**Cambios en la v0.4:** el piloto va **sin pantalla**: calcomanías con un QR fijo por llenado (monto exacto) y un
módulo base con luz de estado, bip y botón. Plan B si el QR fijo no acepta varios pagos: pantalla de tinta electrónica.

---

## 1. En una frase

Un módulo que se instala en las máquinas de monedas **que ya existen** —empezando por despachadores de agua
purificada— para que también cobren con CoDi, **sin cambiar la máquina y sin comisión**. El cliente escanea la
calcomanía de la máquina y paga desde la app de su banco.

## 2. El problema

- Si el cliente **no trae monedas**, la venta se pierde o tiene que ir a buscar cambio.
- El dueño tiene que **recolectar y contar monedas**, con riesgo de robo o vandalismo para sacarlas (hay notas
  recientes de esto), monederos atascados y monedas falsas.
- Volver "cashless" una máquina hoy es caro: hay que **reemplazarla o poner una terminal** que cobra comisión. Con
  tickets de $13 a $26 por garrafón, la comisión no conviene.
- El dueño **no sabe cuánto vende cada máquina** hasta que va a recolectar: casi ninguna tiene internet.

> Validar con el dueño cuál de estos dolores pesa más y cuánto le cuesta.

## 3. Cliente piloto

| Dato | Valor |
|---|---|
| Dueño / negocio | [por llenar] |
| Número de máquinas y ubicación | [por llenar] |
| Marca y modelo de la máquina | [por llenar] |
| Llenados que ofrece y precio de cada uno | [por llenar] |
| Ventas promedio por día por máquina | [por llenar] |
| ¿Cada cuánto recolecta monedas? ¿Quién lo hace? | [por llenar] |
| ¿Hay WiFi cerca de la máquina? ¿Señal de celular y de qué compañía? | [por llenar] |
| ¿Tiene cuenta bancaria a su nombre? ¿Banco? | [por llenar] |

## 4. Propuesta de valor

**Para el dueño de la máquina**
- **Vende también a quien no trae monedas.**
- **No cambia su máquina:** el módulo se enchufa en paralelo al monedero, sin cortar cables, y se puede quitar.
  Las monedas siguen funcionando igual.
- **Sin comisión por venta** (CoDi).
- **Ve sus ventas CoDi en tiempo real** y sabe si su máquina está en línea; hoy casi ninguna máquina tiene esto.
- **Menos efectivo** que recolectar, contar y cuidar.

**Para quien compra el agua**
- Escanea el QR de la máquina y paga desde la app de su banco; no necesita monedas.

**Frase de valor:** *"Tu máquina de siempre, ahora sin monedas."*

**Contra qué competimos hoy**

| Alternativa actual | Qué le falta |
|---|---|
| Solo monedas | Ventas perdidas, recolección, robo, monederos atascados |
| Reemplazar por una máquina nueva con pago digital | Inversión alta (las máquinas cuestan de $16,000 a $135,000) |
| Kits de pago con tarjeta para máquinas | Equipo caro y comisión en cada venta; no conviene con tickets chicos |

En México no encontramos un módulo CoDi para estas máquinas; en Brasil existe uno equivalente para Pix.

**Costo:** piloto ≈ $700–1,500 MXN por máquina en piezas sueltas (módulo base y calcomanías); en volumen
≈ $350–500 MXN de material. Detalle en [hardware-mvp.md](hardware-mvp.md).

## 5. Objetivos

- **Objetivo del MVP (aprender):** demostrar que una máquina de agua real entrega su servicio pagado con CoDi de
  forma **confiable**, **sin modificar la máquina**, y que sus usuarios lo usan.
- **Objetivo para el hackatón:** video con la máquina real entregando agua después de un pago CoDi, más métricas
  del piloto (pesan *uso de CoDi* 30 % e *impacto* 25 %).
- **No es objetivo todavía:** vender módulos, instalar en varias máquinas ni otros tipos de máquina.

## 6. Hipótesis a validar

De la más riesgosa a la menos:

| # | Hipótesis | Cómo la validamos | Señal de éxito (propuesta) |
|---|---|---|---|
| H1 | El monedero de la máquina piloto manda pulsos y podemos imitarlos en paralelo sin afectar las monedas | Levantamiento técnico y prueba en banco con un monedero igual | 1 pulso de prueba = $1 de crédito; las monedas siguen funcionando |
| H2 | Un QR fijo de CoDi se puede pagar muchas veces | **Validada el 23 de noviembre** | El mismo QR de $0.01 se pagó dos veces desde BBVA y pey registró dos transacciones exitosas |
| H3 | Los usuarios de la máquina tienen CoDi y lo prefieren a buscar monedas, aun para $13–26 | Contar pagos CoDi vs. ventas totales durante el piloto | Al menos 10 % de las ventas por CoDi en la semana |
| H4 | El cliente entiende la calcomanía y la luz sin ayuda | Observar a los primeros clientes reales | 9 de cada 10 pagan sin ayuda |
| H5 | El tiempo de pago es aceptable en la máquina | Observar pagos reales | Menos de 5 s del aviso de pago a la máquina con crédito |
| H6 | Hay conexión estable en el sitio (WiFi del local o router 4G) | Monitorear disponibilidad del módulo | En línea 95 % del horario de operación |
| H7 | El dueño pagaría por el módulo o una mensualidad | Pregunta de cierre con precio de referencia | Acepta un precio de referencia |

**H2, antecedentes y prueba:** Banxico contempla que el QR de CoDi "puede estar estático en un establecimiento"
([Banxico](https://www.banxico.org.mx/sistemas-de-pago/codi-cobro-digital-banco-me.html)). En pey, un QR sin
vencimiento se crea con `expiration: 0`, y su API lista **las transacciones de un mismo QR, 20 por página**
([docs de pey](https://docs.pey.mx/docs/api/get-co-di-qr-transactions)). Ambos indican que un QR fijo recibe varios
pagos, y Transfiéreme (un producto de una edición anterior de este hackatón) ya ofrece un QR fijo imprimible para el
mostrador. **La prueba del 23 de noviembre lo confirmó:** un QR fijo de $0.01 sin vencimiento, creado con el API de
pey, se pagó dos veces desde BBVA (dos claves de rastreo distintas, comisión $0.00, el banco mostró el nombre del
beneficiario) y el portal de pey registró dos transacciones exitosas de tipo `API_CODI_QR`. Falta probar el QR sin
monto, que solo se necesita para máquinas con varios llenados.

## 7. Métricas del piloto

| Métrica | Meta (propuesta, ajustar con el dueño) |
|---|---|
| Ventas CoDi por día | Medir; subir semana a semana |
| % de ventas CoDi vs. monedas (con lo que reporta el dueño al recolectar) | 10 % o más |
| Pagos sin servicio o servicio sin pago | **Cero** |
| Pagos que llegan mientras el módulo está sin conexión | Registrar todos |
| Tiempo entre el aviso de pago y los pulsos en la máquina | Menos de 3 s |
| Disponibilidad del módulo (en línea) | 95 % o más |
| Incidentes que requirieron devolución manual | Registrar todos |
| Satisfacción del dueño (1 a 10) y "¿lo dejarías instalado?" | 8 o más, y sí |

## 8. Alcance del MVP

**Incluye (imprescindible)**
1. **Un módulo base en una máquina real:** ESP32 con optoacoplador, conectado con un arnés en Y al conector del
   monedero (normalmente JST XH de 4 pines), sin cortar cables. Tiene su propio cargador desde el contacto de 110 V
   de la máquina, aislado de su electrónica.
2. **Una calcomanía por máquina** con su QR CoDi fijo. Si la máquina tiene un solo precio, el QR lleva ese monto
   exacto; si tiene varios llenados o cobra por tiempo, el QR va sin monto y la máquina acumula el crédito como con
   monedas. El servidor sabe qué máquina se pagó y manda los pulsos de ese monto, una sola vez.
3. **Luz de estado y bip:** verde = CoDi disponible; parpadeo y bip = pago recibido; roja o apagada = sin conexión,
   usar monedas.
4. **Botón "Servir con CoDi"**, solo en máquinas que sirven en cuanto entra la moneda: el pago espera a que el
   cliente coloque su garrafón y lo presione.
5. **Sin cambio con CoDi:** la calcomanía avisa que los pagos con CoDi no dan cambio ni se devuelven en monedas.
6. **Panel mínimo para el dueño:** ventas CoDi del día, máquina en línea o no, y alertas.
7. **Configuración desde el celular:** precios de cada llenado, parámetros del pulso y un pulso de prueba ("inyectar
   $1") para la instalación.
8. **Aclaraciones:** teléfono del dueño en la calcomanía.

**Deseable**
9. **Modo "aprender":** el instalador mete una moneda de $1 y una de $10 y el módulo copia cómo son los pulsos de esa
   máquina (polaridad, ancho y pulsos por peso).
10. Leer la señal de "fuera de servicio" de la máquina para apagar la luz verde cuando no puede servir.
11. Alerta por WhatsApp o correo al dueño si la máquina se desconecta, un pago queda sin servicio o las ventas CoDi
    caen de golpe.
12. Conteo de las monedas reales (telemetría de efectivo).

**No incluye (fase 2 o después)**
- Máquinas con protocolo MDB (24 V) y billeteros.
- Grúas de peluches, maquinitas y cualquier máquina que pueda confundirse con juego de azar (riesgo legal).
- Pantalla (tableta o tinta electrónica).
- Módem celular integrado en el módulo (en el piloto, router 4G aparte si no hay WiFi; ver sección 11).
- Varias máquinas o varios dueños, y venta del módulo.

## 9. Cómo se usa (flujo principal)

1. Llega un cliente sin monedas y ve la luz verde y la calcomanía de la máquina.
2. Abre la app de su banco → CoDi → escanea → escribe el monto si la calcomanía no lo trae → **verifica que diga
   el nombre del dueño** → confirma.
3. Segundos después, el módulo hace bip y la máquina muestra el crédito, como si le hubieran metido monedas. En
   máquinas que sirven al instante, coloca su garrafón y presiona "Servir con CoDi".
4. Usa la máquina como siempre y sale el agua.
5. El dueño ve la venta en su panel.

**Si el cliente se va sin servirse:** en máquinas que acumulan crédito, el crédito se queda en la máquina, como pasa
hoy cuando alguien deja monedas. En máquinas que sirven al instante, el pago espera 10 minutos a que presione
"Servir con CoDi" y luego se marca para devolución si el cliente la pide.

**Si paga de menos o de más (QR sin monto):** el crédito se acumula en la máquina como con monedas y la máquina sirve
cuando alcanza el precio. CoDi no da cambio.

**Si la máquina no responde:** el cliente llama o escribe al teléfono de la calcomanía; el dueño revisa el panel y le
devuelve el pago desde su banco. **Solo hay devoluciones si el cliente las pide.**

**Si el módulo pierde conexión:** la luz se pone roja y la calcomanía dice que en ese caso no se pague con CoDi. Si
alguien paga de todos modos, el crédito se entrega al volver la conexión (dentro de 10 minutos) o se devuelve si lo
pide.

## 10. Requisitos no negociables

- **Nunca dar servicio sin un pago válido** (solo avisos de pey con firma verificada).
- **Nunca cobrar sin dar servicio sin que el dueño se entere:** todo pago sin servicio genera alerta.
- **Un pago CoDi nunca se convierte en monedas:** sin cambio y sin devolución del crédito CoDi en monedas. Si no, se
  podría vaciar el hopper o sacar efectivo con pagos digitales.
- **No modificar ni dañar la máquina:** instalación reversible; las monedas siguen funcionando.
- **Sin conexión, la luz lo avisa;** los pagos que lleguen se entregan al reconectar o se devuelven a solicitud.
- **Seguridad eléctrica:** salida aislada con optoacoplador, caja cerrada resistente a salpicaduras y lejos del agua.
- **El dinero llega directo a la cuenta del dueño;** nosotros nunca lo tocamos.

## 11. Conectividad: ¿y si no hay WiFi?

| Situación | Solución | Notas |
|---|---|---|
| Hay WiFi del local cerca | Conectar el módulo a ese WiFi | Lo más barato. Si la señal llega débil, repetidor o antena exterior |
| **No hay WiFi (piloto)** | **Router 4G de bolsillo con chip de prepago**, conectado al contacto de 110 V de la máquina; el módulo se conecta a él por WiFi | No requiere cambiar el módulo. Costo del equipo y del plan por cotizar |
| No hay WiFi (producto) | Módulo celular integrado (LTE-M o 4G) con chip para dispositivos | Necesita su propia fuente: el eliminador de 12 V a 2 A de la máquina no aguanta los picos de corriente del módem |

- El módulo gasta pocos datos. Con datos celulares conviene una conexión que se quede abierta (MQTT) en lugar de
  preguntar cada 25 segundos, para gastar todavía menos. Medirlo en el piloto.
- Revisar en la visita qué compañía tiene mejor señal en el sitio.
- No usar módulos 2G: esas redes se están apagando.

## 12. Levantamiento técnico (en la visita)

- [ ] Marca y modelo de la máquina; fotos de la tarjeta controladora y su etiqueta
- [ ] Modelo del monedero (CH-926, 616, DG600F, ICT…) y si es de pulsos o MDB (24 V)
- [ ] Conector del monedero (¿JST XH de 4 pines?): fotos del conector y de los colores de los cables
- [ ] Voltaje de alimentación (¿12 V?) y de la línea de pulsos en reposo (¿5 V o 12 V?); ¿baja a 0 V con cada moneda?
- [ ] Switches del monedero: N.O./N.C. y velocidad del pulso
- [ ] Cuántos pulsos manda cada moneda ($1, $2, $5, $10)
- [ ] ¿Sirve en cuanto entra la moneda, o acumula crédito y luego se presiona un botón?
- [ ] ¿La pantallita de la máquina muestra el crédito acumulado?
- [ ] Llenados que ofrece y precio de cada uno
- [ ] ¿Da cambio (hopper)? ¿Tiene botón para devolver crédito? ¿Se puede desactivar en su configuración?
- [ ] ¿Tiene conectada la señal de "fuera de servicio" (inhibit)? ¿Qué pasa cuando se queda sin agua?
- [ ] WiFi disponible, o señal celular y de qué compañía
- [ ] Contacto de 110 V dentro del gabinete y espacio para el módulo (y el router 4G si hace falta)
- [ ] Lugar detrás de la mica para las calcomanías y la luz, que se vean bien desde afuera
- [ ] Quién tiene la llave y quién puede estar presente en la instalación

## 13. Dependencias y restricciones técnicas (API de pey)

- **¿A qué cuenta llega el dinero?** (a) registrar la CLABE del dueño como cuenta de cobro en nuestra API key
  (confirmar con legal@pey.mx, regla 7.4), o (b) que el dueño abra su propia cuenta en pey. Activación de hasta
  **5 días hábiles**.
- Este proyecto usa **su propia API key** y su propio webhook (regla 8.1).
- **Un QR fijo por máquina**, sin vencimiento (`expiration: 0`), creado una sola vez al instalar: con monto exacto si
  la máquina tiene un solo precio, o sin monto (`amount: 0`) si tiene varios. Si cambia un precio fijo, se crea un QR
  nuevo y se reimprime la calcomanía.
- No hay ambiente de pruebas: probamos con cobros de $0.01. Ya confirmamos que el mismo QR acepta varios pagos.
- No hay reembolsos por API: las devoluciones las hace el dueño desde su banco.
- Base técnica existente: `hackaton-mexico-2026/apps/sin-morralla` (ya liga cada QR con su máquina), firmware en
  `hackaton-mexico-2026/firmware` y guía de hardware en `hackaton-mexico-2026/docs/sin-morralla-hardware.md`. Hay que
  agregar la luz con el bip y el botón. El firmware aún no se prueba en una placa real.

## 14. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El monedero no es de pulsos (MDB a 24 V) | Alto | Revisarlo en la visita antes de comprar material; MDB queda fuera de la versión 1 |
| Alguien saca monedas con crédito pagado por CoDi (botón de devolver crédito o cambio) | Alto | El monto exacto no deja sobrante. Revisar si la máquina devuelve crédito y desactivarlo; si no se puede, el módulo "presiona" el botón del llenado para usar el crédito de inmediato |
| Daño eléctrico a la máquina | Alto | Pruebas primero en banco, optoacoplador, fusible e instalación con el dueño presente |
| La cuenta del dueño no se activa a tiempo | Alto | Iniciar el alta pronto; mientras, pruebas con nuestra cuenta y $0.01 |
| Alguien pega un QR falso sobre la calcomanía | Medio | Calcomanías por dentro de la mica; la calcomanía pide verificar el nombre del dueño en la app del banco; alerta si las ventas CoDi caen de golpe |
| La máquina sirve en cuanto recibe pulsos y el garrafón no está puesto | Medio | Botón "Servir con CoDi": los pulsos salen solo al presionarlo |
| No hay WiFi junto a la máquina | Medio | Router 4G de bolsillo con chip de prepago |
| Alguien paga sin conexión aunque la luz esté roja | Bajo | El crédito se entrega al reconectar o se devuelve a solicitud |
| Alguien paga el QR desde una foto, lejos de la máquina | Bajo | El crédito queda en la máquina; lo pierde quien pagó; devolución a solicitud |
| Cambia el precio de una máquina con QR de monto fijo | Bajo | Crear un QR nuevo y reimprimir la calcomanía |

## 15. Plan del piloto (propuesta)

| Fecha | Actividad |
|---|---|
| 24–25 nov | Visita al dueño: entrevista, levantamiento técnico y fotos; iniciar el alta de la cuenta |
| 25–26 nov | Comprar el módulo base y un monedero igual al de la máquina; router 4G si no hay WiFi |
| 27–30 nov | Banco de pruebas: módulo, monedero y bomba; QR de la máquina; imprimir calcomanías |
| 1–2 dic | Instalación en la máquina real con el dueño presente |
| 2–8 dic | Piloto en vivo con revisión diaria |
| 9 dic | Entrevista de cierre, métricas y testimonio |
| 10 dic | **Cierre de postulación (23:59)** |
| 11–12 dic | Video con la máquina real y entrega |

## 16. Preguntas para el dueño (entrevista inicial)

1. ¿Cuántos garrafones vende al día cada máquina? ¿Qué llenados ofrece y a qué precio?
2. ¿Cuántos clientes se van porque no traen monedas o no tienen cambio?
3. ¿Cada cuánto recolectas las monedas? ¿Has tenido robos, atascos o monedas falsas?
4. ¿Quién le da mantenimiento a la máquina? ¿Tiene garantía vigente?
5. ¿Hay WiFi cerca de la máquina? Si no, ¿qué compañía de celular tiene buena señal ahí?
6. ¿Nos permitirías abrir el gabinete e instalar un módulo que se puede quitar?
7. ¿Tu máquina da cambio? ¿Se puede pedir la devolución del crédito con un botón?
8. ¿Estás de acuerdo con que las devoluciones de pagos CoDi las hagas tú desde tu banco, solo si el cliente las pide?
9. ¿Cuántas máquinas tienes? ¿Conoces a otros dueños?
10. ¿Tu cuenta bancaria está a tu nombre? ¿En qué banco? *(la CLABE se captura directamente en el portal de pey,
    no por chat)*
11. Si te funciona, ¿cuánto pagarías por el módulo o al mes?

## 17. Decisiones y pendientes

**Decidido**
- Solo CoDi (sin tarjeta).
- Es un **complemento para máquinas que ya existen**, no una máquina nueva. Empezamos con agua purificada.
- **Piloto sin pantalla:** una calcomanía por máquina con su QR fijo (con monto si hay un solo precio, sin monto si hay
  varios) y un módulo base con luz de estado, bip y botón. Ya validamos que un QR fijo acepta varios
  pagos.
- **Segmentos:** empezar con agua purificada y buscar prospectos en montables infantiles, sillones masajeadores,
  lavanderías y autolavados de autoservicio. Fuera: grúas de peluches y maquinitas (riesgo legal). Ver
  [prospectos-segmentos.md](prospectos-segmentos.md).
- Si el cliente se va sin servirse, el crédito se queda en la máquina, como con las monedas.
- **Los pagos CoDi no dan cambio ni se devuelven en monedas;** la calcomanía lo avisa.
- Las devoluciones solo se hacen si el cliente las pide, y las hace el dueño desde su banco.
- Si no hay WiFi, en el piloto se usa un router 4G de bolsillo con chip de prepago.
- El conteo de monedas reales queda para después del MVP.

**Pendiente**
- Probar el QR sin monto (solo para máquinas con varios llenados).
- Datos del cliente piloto (sección 3) y levantamiento técnico (sección 12).
- Cuenta de cobro: opción (a) o (b) (sección 13).
- Cómo evitar la devolución de crédito en monedas según la máquina piloto (sección 14).
- Metas numéricas definitivas (secciones 6 y 7).
