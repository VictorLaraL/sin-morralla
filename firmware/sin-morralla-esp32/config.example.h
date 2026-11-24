// Copia este archivo a config.h (no se sube al repositorio) y llena tus datos.
#pragma once

#define WIFI_SSID      "MiRed"
#define WIFI_PASS      "MiClave"

// Dirección del Worker, sin diagonal al final. En pruebas locales: http://192.168.1.50:8787
#define SERVIDOR_URL   "https://sin-morralla.tu-subdominio.workers.dev"
// Se genera en el portal ("Token del módulo") y se muestra una sola vez.
#define MAQUINA_TOKEN  "pega-aqui-el-token-del-modulo"

// Salida hacia el LED del optoacoplador PC817 (con resistencia de 330 ohm).
#define PIN_PULSO      26
// Nivel que enciende el LED del PC817 (HIGH si el LED va del pin a GND).
#define PULSO_ACTIVO   HIGH

// Luz bicolor (cada color con su resistencia de 220 ohm). -1 para desactivar.
#define PIN_LED_VERDE  25
#define PIN_LED_ROJO   33
#define LED_ACTIVO     HIGH

// Zumbador ACTIVO (con oscilador integrado). Si consume más de 20 mA, usa un transistor. -1 para desactivar.
#define PIN_ZUMBADOR   27

// Botón "Servir con CoDi" a GND (se usa la resistencia interna). -1 si la máquina no lleva botón.
// Solo se espera el botón si el portal lo pide para esta máquina.
#define PIN_BOTON      14
#define ESPERA_BOTON_MS 60000

// Producción: fija el certificado raíz del servidor para evitar intermediarios.
// #define CERTIFICADO_RAIZ "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
