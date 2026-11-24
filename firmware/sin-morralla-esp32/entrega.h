// Entrega en dos fases, sin dependencias de Arduino: se compila en el ESP32 y en la PC para probarla
// (firmware/pruebas/prueba_entrega.cpp, `npm run test:firmware`).
#pragma once
#include <string.h>

static const int LARGO_ID = 40;

// Lo que el módulo guarda en memoria no volátil.
struct EstadoEntrega {
  char enCurso[LARGO_ID] = "";  // crédito cuyos pulsos ya empezaron
  char hecho[LARGO_ID] = "";    // último crédito que no se debe volver a servir
  char porConfirmar[LARGO_ID] = "";  // entrega completa cuyo ACK todavía no recibe el servidor
};

// Lo que la lógica necesita del hardware y de la red.
class AccionesEntrega {
 public:
  virtual ~AccionesEntrega() {}
  virtual void avisarPago() = 0;                                   // bip y luz
  virtual bool esperarBoton() = 0;                                 // false: el cliente no presionó a tiempo
  virtual void darPulsos() = 0;
  virtual bool confirmar(const char* id, bool parcial) = 0;        // true: el servidor lo recibió (200 o 404)
  virtual void guardar(const char* clave, const char* valor) = 0;  // memoria no volátil
};

enum class Resultado { Entregado, SoloConfirmado, Parcial, SinBoton };

inline void copiarId(char* destino, const char* origen) {
  strncpy(destino, origen, LARGO_ID - 1);
  destino[LARGO_ID - 1] = '\0';
}

inline Resultado procesarEntrega(const char* credito, bool requiereBoton, EstadoEntrega& e, AccionesEntrega& a) {
  if (strcmp(credito, e.hecho) == 0) {
    if (a.confirmar(credito, false) && strcmp(credito, e.porConfirmar) == 0) {
      e.porConfirmar[0] = '\0';
      a.guardar("pendiente", "");
    }
    return Resultado::SoloConfirmado;
  }
  if (strcmp(credito, e.enCurso) == 0) {
    // Se reinició a media entrega: nunca se repiten los pulsos. "hecho" se guarda solo cuando el servidor recibió el
    // aviso parcial; si no llegó, el siguiente reenvío vuelve a entrar aquí y avisa otra vez como parcial, para que el
    // pago siga apareciendo en "Pagos por atender".
    if (a.confirmar(credito, true)) {
      copiarId(e.hecho, credito);
      a.guardar("hecho", credito);
    }
    return Resultado::Parcial;
  }
  a.avisarPago();
  if (requiereBoton && !a.esperarBoton()) return Resultado::SinBoton;
  copiarId(e.enCurso, credito);
  a.guardar("curso", credito);  // 1. antes de los pulsos
  a.darPulsos();
  copiarId(e.hecho, credito);
  a.guardar("hecho", credito);  // 2. después de los pulsos
  if (!a.confirmar(credito, false)) {
    // Sin ACK: se guarda para reintentarlo aunque el servidor ya no lo mande (por ejemplo, si venció sin red).
    copiarId(e.porConfirmar, credito);
    a.guardar("pendiente", credito);
  }
  return Resultado::Entregado;
}

// Reintenta el ACK de una entrega completa que el servidor no recibió. Se llama antes de cada consulta.
// Si el crédito ya venció en el servidor, el ACK lo pasa a entregado y sale de "Pagos por atender".
inline bool confirmarPendiente(EstadoEntrega& e, AccionesEntrega& a) {
  if (e.porConfirmar[0] == '\0') return false;
  if (!a.confirmar(e.porConfirmar, false)) return false;
  e.porConfirmar[0] = '\0';
  a.guardar("pendiente", "");
  return true;
}
