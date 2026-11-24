# Firmware del módulo Sin Morralla (ESP32)

El módulo se conecta **en paralelo** a la línea de pulsos (COIN) del monedero. Para la tarjeta de la máquina, un pago
CoDi se ve igual que una moneda: el ESP32 cierra el optoacoplador tantas veces como pulsos tenga el crédito.

> **Estado:** el código está escrito y su protocolo está probado contra el Worker con el simulador
> (`npm run simular:maquina`), pero **todavía no se compila ni se prueba en una placa real**. Ese es el siguiente paso
> en el banco de pruebas (`docs/hardware-mvp.md`, sección 2).

## Conexiones

| ESP32 | Va a | Notas |
|---|---|---|
| GPIO 26 | Ánodo del LED del PC817, con resistencia de 330 Ω | Cátodo a GND del ESP32 |
| Colector del PC817 | Línea COIN del monedero | Por el arnés en Y con conectores JST, sin cortar cables |
| Emisor del PC817 | GND de la máquina | Mide antes con el multímetro qué nivel usa la línea |
| GPIO 25 / GPIO 33 | Luz bicolor verde / roja, con 220 Ω cada una | Verde = CoDi disponible; roja = usar monedas |
| GPIO 27 | Zumbador **activo** | Con transistor si consume más de 20 mA |
| GPIO 14 | Botón "Servir con CoDi" a GND | Opcional; usa la resistencia interna |
| 5 V / GND | Cargador USB de 5 V a 2 A | Alimentación aislada, no de la tarjeta de la máquina |

El optoacoplador aísla por completo al ESP32 de los 12 V de la máquina.

## Cargarlo

1. Arduino IDE 2 con el paquete **esp32 de Espressif** (2.x o 3.x). Placa: *ESP32 Dev Module*.
2. Copia `sin-morralla-esp32/config.example.h` a `config.h` y llena el WiFi, la dirección del Worker y el token del
   módulo (se genera en el portal y se muestra una sola vez). `config.h` está en `.gitignore`.
3. Compila y carga. En el monitor serie (115200) debe decir `Sin Morralla listo` y la IP.
4. En el portal, **Mandar pulso de prueba** con 1 pulso: la máquina debe sumar un peso de crédito.
5. Ajusta el ancho y la pausa del pulso en el portal hasta que el monedero cuente todos los pulsos (se mide con el
   analizador lógico la moneda real y se copia).

## Protocolo con el Worker

Texto plano sobre HTTPS, con `Authorization: Bearer <token del módulo>` (el servidor guarda solo su SHA-256).

| Petición | Respuesta |
|---|---|
| `GET /device/poll?espera=25` | `CREDITO <id> <pulsos> <ancho_ms> <pausa_ms> <boton 0/1>` o `204` si no hubo pagos en la espera |
| `POST /device/ack?id=<id>` | `OK` (también si se repite); `404 CREDITO DESCONOCIDO` si no es de esta máquina |
| `POST /device/ack?id=<id>&parcial=1` | Igual, pero marca la entrega como interrumpida para que el dueño la revise |

## Por qué no da servicio doble

El crédito se guarda en la memoria no volátil como **en curso** antes de dar los pulsos y como **hecho** después.

| Qué pasa | Qué hace el módulo |
|---|---|
| Se perdió el `OK` del servidor | El servidor vuelve a mandar el crédito; el módulo ve que está **hecho** y solo confirma |
| Se fue la luz a media entrega | Al volver, el crédito está **en curso**: no repite pulsos, confirma con `parcial=1` y el pago aparece en el portal |
| El cliente no presiona el botón en 60 s | No da pulsos ni confirma; el crédito sigue pendiente y se vuelve a ofrecer hasta que vence (10 min) |
| El módulo no recoge un pago en 10 min | El Worker lo marca como vencido y aparece en "Pagos por atender" |

## Pendiente para producción

- Fijar el certificado raíz del Worker (`CERTIFICADO_RAIZ` en `config.h`). En el piloto la conexión es HTTPS sin
  validar el certificado, lo que permitiría a alguien en la misma red inyectar créditos falsos.
- Configurar el WiFi desde el celular (portal cautivo) en lugar de compilarlo en `config.h`.
- Leer la señal de "fuera de servicio" de la máquina para poner la luz en rojo cuando no puede servir.
