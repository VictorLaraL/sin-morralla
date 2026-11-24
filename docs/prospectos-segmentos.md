# Sin Morralla — Segmentos y prospectos

**23 de noviembre de 2026** · Para buscar clientes mientras construimos la demo.

> Lo marcado como *inferencia* no está verificado. Despachadores de agua: ver
> [investigacion-maquinas-agua.md](investigacion-maquinas-agua.md).

## Contexto

- Conectar un lector en lugar del monedero e imitar sus pulsos es la práctica normal del sector: Nayax lo hace y
  conecta hasta 6 máquinas a un solo lector ([Nayax](https://nayax.com/business_type/laundry/)). En Brasil, Pixmaq
  vende un controlador Pix que libera el crédito al confirmarse el pago y toma corriente de los cables del monedero
  ([Pixmaq](https://pixmaq.com.br/)). **No encontramos nada equivalente con CoDi en México.**
- A julio de 2026, CoDi tenía 23.2 millones de cuentas validadas; la iniciativa de Ley de Economía Digital busca que
  el 50 % de los pagos sean digitales hacia 2027
  ([Expansión](https://expansion.mx/economia/2026/09/29/mexico-quiere-emular-a-brasil-y-masificar-en-un-ano-los-pagos-digitales)).

## Ranking

| # | Segmento | Ticket | Compatibilidad | Dueños | Por qué sí | En contra |
|---|---|---|---|---|---|---|
| 0 | **Despachadores de agua** (piloto) | $13–26 | Pulsos, 12 V | Dueños de 1 a varias máquinas | Ya tenemos cliente piloto; robo de monedas | — |
| 1 | **Montables infantiles y sillones masajeadores** | $10–50 *(inferencia)* | Pulsos con temporizador *(inferencia)* | Operadores con rutas en plazas y supermercados | Mismo canal y distribuidores; a los papás les falta cambio; sin riesgo de juego | Ticket no verificado |
| 2 | **Lavanderías de autoservicio** | Lavado $25–40, secado $20–65 | Pulsos o fichas | Un local con muchas máquinas | Ticket más alto; un solo local sirve de piloto con varias máquinas | Son pocas en México (la mayoría son por encargo) y ya hay competencia |
| 3 | **Autolavados de autoservicio** | $30–50 por 15–30 min | Pulsos con temporizador *(inferencia)* | Dueños de 1 a pocos locales | Alcancías a la intemperie | No encontramos ejemplos concretos en México: confirmar en tu ciudad |
| 4 | **Rockolas** | ~$10 *(inferencia)* | Monedero y billetero de pulsos *(inferencia)* | Operadores con rutas | Clientes sin cambio en la cantina | Pocos datos; derechos de autor |
| 5 | **Baños en terminales y plazas privadas** | $5–10 | Torniquete que se libera con un pulso | Concesionarios | Mucho volumen | Ticket bajo; presión para hacer gratuitos los de mercados |

**Fuera de la versión 1**
- **Grúas de peluches:** técnicamente ideales, pero hay decomisos recientes junto con tragamonedas (Irapuato 2025,
  CDMX octubre de 2026, operativo en Torreón) y pey prohíbe las apuestas sin permiso. Solo con opinión legal y
  aceptación por escrito de pey ([Crónica](https://www.cronica.com.mx/metropoli/2026/10/09/aseguran-266-maquinas-tragamonedas-en-cuauhtemoc-e-iztapalapa/),
  [Posta](https://www.posta.com.mx/mexico/maquinas-expendedoras-de-peluches-en-torreon-por-que-las-regularizaran/vl1752376)).
- **"Maquinitas" de tienditas:** en su mayoría son tragamonedas; los decomisos crecieron mucho en 2025
  ([Xataka](https://www.xataka.com.mx/seguridad/mexico-quiere-frenar-maquinitas-tienditas-operativos-revelan-problema-real-se-estan-multiplicando)).
- **Vending de refrescos y botanas:** usan MDB.
- **Básculas, chicleras, lockers, parquímetros:** mecánicas, atendidas o sistemas cerrados.

## Datos por segmento

**Montables infantiles y masajeadores**
- Proveedores en México: DIVICON (CDMX), Pepe Monedas (Nuevo León), MYTEK (Baja California), Maquinitas.com.mx y
  Galopines (Jalisco), Quimmetex (Puebla), Jazen (Naucalpan)
  ([montables](https://www.cosmos.com.mx/producto/montables-j8rm/),
  [masajeadores](https://www.cosmos.com.mx/producto/sillones-de-masaje-operados-por-monedas-tipo-vending-14hd/)).
- Nayax ya tiene solución con QR para montables
  ([Nayax](https://cdn.nayax.com/business_type/kiddie-amusement-rides)).

**Lavanderías**
- 40,750 lavanderías y tintorerías en el DENUE (mayo de 2026), pero casi todas por encargo
  ([DataMéxico](https://www.economia.gob.mx/datamexico/es/profile/industry/drycleaning-and-laundry-services),
  [Mexico News Daily](https://mexiconewsdaily.com/culture/at-this-lavanderia-getting-your-clothes-washed-takes-a-leap-of-faith/)).
- Competencia: PayQubit (QR), Lacolada, LaundryPay PRO y Nayax
  ([PayQubit](https://apps.apple.com/mx/app/payqubit/id1466024214)).
- Gremio: CANALAVA (Cámara Nacional de la Industria de Lavanderías).

**Autolavados**
- 27,947 autolavados formales y solo el 7 % automatizado, según Profeco
  ([Milenio](https://amp.milenio.com/negocios/actual-market-research-autolavados-gastan-2-mil-137-mdp-en-agua)).
- Kärcher vende boxes de autoservicio que cobran con monedas, tarjeta o celular
  ([Kärcher](https://www.kaercher.com/es/professional/know-how-profesional-conocimientos-tecnicos-y-experiencias-de-limpieza-para-profesionales/apertura-de-una-instalacion-de-lavado-en-autoservicio.html)).

**Baños**
- Metro de CDMX $5, Metrobús hasta $10
  ([ADN40](https://www.adn40.mx/ciudad/metrobus-cdmx-que-lineas-estaciones-tienen-banos-gratis-para-usuarios)).
- Fabricantes de torniquetes con monedero: Techno Security, FAMISA, Tojan y Value Tech
  ([Cosmos](https://www.cosmos.com.mx/producto/torniquetes-con-monedero-electronico-lsxp/)).

## Dónde encontrar prospectos

- **DENUE de INEGI:** descargar nombre y domicilio por actividad. Códigos SCIAN a confirmar: 812210 (lavanderías),
  811192 (lavado de autos), 812130 (sanitarios públicos).
- **Distribuidores:** los de la lista de arriba; sus clientes son los operadores con rutas.
- **Administradores de plazas y supermercados**, donde están montables y masajeadores.
- **Ferias y gremios:** INA PAACE Automechanika México, en julio, con sector de lavado y detallado; IAAPA para
  entretenimiento; CANALAVA para lavanderías.
- **Mercado Libre:** anuncios de traspaso de "negocio de maquinitas" y vendedores de premios al mayoreo.

## Qué cambia en el producto *(inferencia)*

- **Un ESP32 puede manejar varias máquinas cercanas** (una lavandería o un grupo de montables), con un canal de
  optoacoplador y una calcomanía por máquina. Baja el costo por máquina.
- **Las máquinas que cobran por tiempo** (montables, masajeadores, autolavados) encajan bien con un QR sin monto:
  pagar más da más tiempo.
- **En montables, masajeadores y autolavados el servicio arranca en cuanto llega el crédito**, igual que con
  monedas: la calcomanía debe decir "paga cuando estés listo".

## Lo que no encontramos

Tickets verificados de montables, masajeadores y rockolas; autolavados concretos de bahía con monedas en México;
criterio oficial de Segob sobre las grúas; cuántas máquinas tienen los operadores con rutas.
