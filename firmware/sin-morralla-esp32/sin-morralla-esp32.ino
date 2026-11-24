// Sin Morralla — módulo ESP32 que convierte pagos CoDi en pulsos de monedero.
//
// Se conecta en paralelo a la línea COIN del monedero de la máquina (ver firmware/README.md). Pregunta al Worker si
// hay créditos (consulta larga por HTTPS), da los pulsos por el optoacoplador y confirma la entrega.
//
//   Luz verde  = en línea: se puede pagar con CoDi.      Luz roja = sin conexión: usar monedas.
//   Bip doble  = pago recibido.                          Verde parpadeando = esperando el botón "Servir con CoDi".
//
// Entrega en dos fases para no dar servicio doble ni perder un pago (lógica en entrega.h, probada en la PC con
// `npm run test:firmware`):
//   1. Antes de dar pulsos guarda el crédito como "en curso" (memoria no volátil).
//   2. Después de darlos lo guarda como "hecho" y confirma.
//   Si arranca y el servidor le vuelve a mandar el crédito "en curso" (se fue la luz a media entrega), NO repite los
//   pulsos: confirma con parcial=1 hasta que el servidor lo reciba, y el pago aparece en el portal para que el dueño
//   lo revise con el cliente.
//
// Placa: ESP32 Dev Module (Arduino core para ESP32 2.x o 3.x). Sin librerías externas.
// Antes de compilar: copia config.example.h a config.h y llena tus datos (config.h no se sube al repositorio).
// Adaptado del prototipo previo del mismo autor (ver "Componentes previos" en el README del proyecto).

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include "config.h"
#include "entrega.h"

#ifndef PIN_LED_VERDE
#define PIN_LED_VERDE -1
#endif
#ifndef PIN_LED_ROJO
#define PIN_LED_ROJO -1
#endif
#ifndef LED_ACTIVO
#define LED_ACTIVO HIGH
#endif
#ifndef PIN_ZUMBADOR
#define PIN_ZUMBADOR -1
#endif
#ifndef PIN_BOTON
#define PIN_BOTON -1
#endif
#ifndef ESPERA_BOTON_MS
#define ESPERA_BOTON_MS 60000
#endif

static const int ESPERA_POLL_SEG = 25;          // el Worker sostiene la consulta hasta 25 s
static const uint32_t TIMEOUT_POLL_MS = 35000;  // margen sobre la espera del servidor

Preferences memoria;
EstadoEntrega estado;  // copia en RAM de lo guardado en memoria no volátil

// ---------- luz, bip y botón ----------

enum Luz { APAGADA, VERDE, ROJA };

void escribirLed(int pin, bool encendido) {
  if (pin >= 0) digitalWrite(pin, encendido ? LED_ACTIVO : !LED_ACTIVO);
}

void luz(Luz color) {
  escribirLed(PIN_LED_VERDE, color == VERDE);
  escribirLed(PIN_LED_ROJO, color == ROJA);
}

// Zumbador activo (trae su oscilador): basta con encenderlo y apagarlo.
void bip(int veces, int ms) {
  if (PIN_ZUMBADOR < 0) return;
  for (int i = 0; i < veces; i++) {
    digitalWrite(PIN_ZUMBADOR, HIGH);
    delay(ms);
    digitalWrite(PIN_ZUMBADOR, LOW);
    if (i + 1 < veces) delay(ms);
  }
}

bool botonPresionado() {
  return PIN_BOTON >= 0 && digitalRead(PIN_BOTON) == LOW;  // botón a GND con INPUT_PULLUP
}

// Espera a que el cliente presione "Servir con CoDi". Regresa false si no lo presiona a tiempo: el crédito sigue
// pendiente en el servidor y se vuelve a ofrecer en la siguiente consulta, hasta que venza.
bool esperarBotonFisico() {
  if (PIN_BOTON < 0) return true;
  Serial.println("Esperando el botón \"Servir con CoDi\"");
  uint32_t inicio = millis();
  uint32_t ultimoBip = 0;
  bool encendido = false;
  while (millis() - inicio < ESPERA_BOTON_MS) {
    if (botonPresionado()) {
      delay(30);  // antirrebote
      if (botonPresionado()) return true;
    }
    encendido = !encendido;
    luz(encendido ? VERDE : APAGADA);
    if (millis() - ultimoBip > 5000) {
      bip(1, 60);
      ultimoBip = millis();
    }
    delay(150);
  }
  luz(VERDE);
  return false;
}

// ---------- red ----------

void conectarWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("Conectando a WiFi \"%s\"", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  bool encendido = false;
  while (WiFi.status() != WL_CONNECTED) {
    encendido = !encendido;
    luz(encendido ? ROJA : APAGADA);  // rojo parpadeando = sin WiFi
    delay(250);
    Serial.print(".");
  }
  Serial.printf("\nConectado. IP %s\n", WiFi.localIP().toString().c_str());
}

// Hace una petición al Worker. Regresa el código HTTP, o un número negativo si falló la conexión.
int pedir(bool post, const String& ruta, String& cuerpo, uint32_t timeoutMs) {
  String url = String(SERVIDOR_URL) + ruta;
  HTTPClient http;
  WiFiClientSecure seguro;
  WiFiClient plano;
  bool iniciado;
  if (url.startsWith("https://")) {
#ifdef CERTIFICADO_RAIZ
    seguro.setCACert(CERTIFICADO_RAIZ);
#else
    // Piloto: sin certificado fijado. Para producción define CERTIFICADO_RAIZ en config.h (ver README).
    seguro.setInsecure();
#endif
    iniciado = http.begin(seguro, url);
  } else {
    iniciado = http.begin(plano, url);  // pruebas en la red local: http://192.168.x.x:8787
  }
  if (!iniciado) return -1;
  http.setConnectTimeout(10000);
  http.setTimeout(timeoutMs);
  http.addHeader("Authorization", String("Bearer ") + MAQUINA_TOKEN);
  int codigo = post ? http.POST("") : http.GET();
  if (codigo > 0) cuerpo = http.getString();
  http.end();
  return codigo;
}

// ---------- pulsos ----------

void emitirPulsos(int pulsos, int pulsoMs, int pausaMs) {
  for (int i = 0; i < pulsos; i++) {
    luz(APAGADA);
    digitalWrite(PIN_PULSO, PULSO_ACTIVO);
    delay(pulsoMs);
    digitalWrite(PIN_PULSO, !PULSO_ACTIVO);
    luz(VERDE);
    delay(pausaMs);
  }
}

// Confirma la entrega. true si el servidor la recibió (200) o no reconoce el crédito (404: deja de reintentar).
// Si no contesta, el servidor vuelve a mandar el crédito y entrega.h decide qué hacer sin repetir pulsos.
bool confirmarConServidor(const char* id, bool parcial) {
  String ruta = String("/device/ack?id=") + id + (parcial ? "&parcial=1" : "");
  for (int intento = 0; intento < 3; intento++) {
    String respuesta;
    int codigo = pedir(true, ruta, respuesta, 10000);
    if (codigo == 200 || codigo == 404) return true;
    delay(1000 * (intento + 1));
  }
  return false;
}

// Une la lógica de entrega (entrega.h) con el hardware y la red de este módulo.
class AccionesModulo : public AccionesEntrega {
 public:
  int pulsos = 0, pulsoMs = 50, pausaMs = 50;
  void avisarPago() override { bip(2, 80); }
  bool esperarBoton() override { return esperarBotonFisico(); }
  void darPulsos() override { emitirPulsos(pulsos, pulsoMs, pausaMs); }
  bool confirmar(const char* id, bool parcial) override { return confirmarConServidor(id, parcial); }
  void guardar(const char* clave, const char* valor) override { memoria.putString(clave, valor); }
};

AccionesModulo acciones;

// Regresa false si la respuesta no es un crédito válido (por ejemplo, la página de un portal cautivo).
bool procesarCredito(const String& cuerpo) {
  char id[40];
  int pulsos = 0, pulsoMs = 0, pausaMs = 0, boton = 0;
  int campos = sscanf(cuerpo.c_str(), "CREDITO %39s %d %d %d %d", id, &pulsos, &pulsoMs, &pausaMs, &boton);
  if (campos < 4) {
    Serial.printf("Respuesta no reconocida: %s\n", cuerpo.c_str());
    return false;
  }
  if (pulsos < 1 || pulsos > 500 || pulsoMs < 10 || pulsoMs > 500 || pausaMs < 10 || pausaMs > 1000) {
    Serial.println("Crédito fuera de rango; se ignora");
    return false;
  }
  acciones.pulsos = pulsos;
  acciones.pulsoMs = pulsoMs;
  acciones.pausaMs = pausaMs;
  switch (procesarEntrega(id, boton == 1, estado, acciones)) {
    case Resultado::Entregado:
      Serial.printf("Crédito %s: %d pulsos de %d ms entregados\n", id, pulsos, pulsoMs);
      break;
    case Resultado::SoloConfirmado:
      Serial.printf("Crédito %s ya entregado; solo confirmé\n", id);
      break;
    case Resultado::Parcial:
      Serial.printf("Crédito %s interrumpido por un reinicio; avisé como parcial\n", id);
      break;
    case Resultado::SinBoton:
      Serial.println("Nadie presionó el botón; el crédito sigue pendiente");
      break;
  }
  return true;
}

// ---------- arranque ----------

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PULSO, OUTPUT);
  digitalWrite(PIN_PULSO, !PULSO_ACTIVO);
  if (PIN_LED_VERDE >= 0) pinMode(PIN_LED_VERDE, OUTPUT);
  if (PIN_LED_ROJO >= 0) pinMode(PIN_LED_ROJO, OUTPUT);
  if (PIN_ZUMBADOR >= 0) {
    pinMode(PIN_ZUMBADOR, OUTPUT);
    digitalWrite(PIN_ZUMBADOR, LOW);
  }
  if (PIN_BOTON >= 0) pinMode(PIN_BOTON, INPUT_PULLUP);
  luz(ROJA);

  memoria.begin("sinmorralla", false);
  copiarId(estado.enCurso, memoria.getString("curso", "").c_str());
  copiarId(estado.hecho, memoria.getString("hecho", "").c_str());
  copiarId(estado.porConfirmar, memoria.getString("pendiente", "").c_str());
  Serial.println("\nSin Morralla listo");
  conectarWifi();
}

uint32_t esperaError = 2000;

void loop() {
  conectarWifi();
  if (confirmarPendiente(estado, acciones)) Serial.println("Confirmé una entrega que había quedado sin ACK");

  String cuerpo;
  int codigo = pedir(false, String("/device/poll?espera=") + ESPERA_POLL_SEG, cuerpo, TIMEOUT_POLL_MS);

  if (codigo == 200 && procesarCredito(cuerpo)) {
    luz(VERDE);
    esperaError = 2000;
  } else if (codigo == 200) {
    // Un 200 que no es un crédito no cuenta como "en línea": luz roja y espera creciente para no saturar.
    luz(ROJA);
    delay(esperaError);
    esperaError = min<uint32_t>(esperaError * 2, 30000);
  } else if (codigo == 204) {
    luz(VERDE);  // en línea, sin pagos en este ciclo
    esperaError = 2000;
  } else if (codigo == 401) {
    Serial.println("Token inválido: genera uno en el portal y cárgalo en config.h");
    luz(ROJA);
    bip(1, 600);
    delay(30000);
  } else {
    Serial.printf("Sin conexión con el servidor (%d). Reintento en %u ms\n", codigo, esperaError);
    luz(ROJA);
    delay(esperaError);
    esperaError = min<uint32_t>(esperaError * 2, 30000);
  }
}
