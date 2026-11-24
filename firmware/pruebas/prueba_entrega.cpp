// Pruebas de la entrega en dos fases del módulo (firmware/sin-morralla-esp32/entrega.h) en la PC.
// Uso: npm run test:firmware   (compila con g++, clang++ o MSVC, lo que encuentre)

#include <cstdio>
#include <string>
#include <vector>
#include "../sin-morralla-esp32/entrega.h"

static int fallas = 0;
#define VERIFICA(condicion, mensaje)                       \
  do {                                                     \
    if (!(condicion)) {                                    \
      std::printf("  FALLA: %s (linea %d)\n", mensaje, __LINE__); \
      fallas++;                                            \
    }                                                      \
  } while (0)

struct Ack {
  std::string id;
  bool parcial;
};

// Módulo falso: cuenta pulsos, guarda lo que se escribiría en memoria y decide si el servidor contesta.
class ModuloFalso : public AccionesEntrega {
 public:
  int pulsos = 0;
  int bips = 0;
  bool botonPresionado = true;
  bool servidorResponde = true;
  std::vector<Ack> acks;
  std::vector<std::string> escrituras;

  void avisarPago() override { bips++; }
  bool esperarBoton() override { return botonPresionado; }
  void darPulsos() override { pulsos++; }
  bool confirmar(const char* id, bool parcial) override {
    acks.push_back({id, parcial});
    return servidorResponde;
  }
  void guardar(const char* clave, const char* valor) override { escrituras.push_back(std::string(clave) + "=" + valor); }
};

static void prueba(const char* nombre, void (*cuerpo)()) {
  int antes = fallas;
  cuerpo();
  std::printf("%s %s\n", fallas == antes ? "ok  " : "MAL ", nombre);
}

int main() {
  prueba("un crédito nuevo se sirve una vez y se confirma", [] {
    EstadoEntrega e;
    ModuloFalso m;
    VERIFICA(procesarEntrega("c_1", false, e, m) == Resultado::Entregado, "debe entregar");
    VERIFICA(m.pulsos == 1 && m.bips == 1, "una entrega y un bip");
    VERIFICA(m.escrituras.size() == 2 && m.escrituras[0] == "curso=c_1" && m.escrituras[1] == "hecho=c_1",
             "guarda en curso antes y hecho después");
    VERIFICA(m.acks.size() == 1 && !m.acks[0].parcial, "un ACK normal");
  });

  prueba("si se perdió el ACK, el reenvío solo se confirma", [] {
    EstadoEntrega e;
    ModuloFalso m;
    procesarEntrega("c_1", false, e, m);
    VERIFICA(procesarEntrega("c_1", false, e, m) == Resultado::SoloConfirmado, "no debe volver a entregar");
    VERIFICA(m.pulsos == 1, "sin pulsos de más");
    VERIFICA(m.acks.size() == 2 && !m.acks[1].parcial, "ACK normal");
  });

  prueba("tras un corte a media entrega no se repiten pulsos y se avisa como parcial", [] {
    EstadoEntrega e;
    copiarId(e.enCurso, "c_2");
    copiarId(e.hecho, "c_1");
    ModuloFalso m;
    VERIFICA(procesarEntrega("c_2", false, e, m) == Resultado::Parcial, "debe ser parcial");
    VERIFICA(m.pulsos == 0 && m.bips == 0, "sin pulsos ni bip");
    VERIFICA(m.acks.size() == 1 && m.acks[0].parcial, "ACK parcial");
    VERIFICA(strcmp(e.hecho, "c_2") == 0, "con el servidor enterado queda como hecho");
  });

  prueba("si el ACK parcial no llega, el reintento vuelve a avisar como parcial", [] {
    EstadoEntrega e;
    copiarId(e.enCurso, "c_2");
    copiarId(e.hecho, "c_1");
    ModuloFalso m;
    m.servidorResponde = false;
    procesarEntrega("c_2", false, e, m);
    VERIFICA(strcmp(e.hecho, "c_1") == 0, "no se marca hecho sin que el servidor lo sepa");
    m.servidorResponde = true;
    VERIFICA(procesarEntrega("c_2", false, e, m) == Resultado::Parcial, "el reintento sigue siendo parcial");
    VERIFICA(m.acks.size() == 2 && m.acks[1].parcial, "el segundo ACK también es parcial");
    VERIFICA(m.pulsos == 0, "nunca se repiten pulsos");
    VERIFICA(strcmp(e.hecho, "c_2") == 0, "ahora sí queda como hecho");
  });

  prueba("si nadie presiona el botón no se sirve ni se confirma", [] {
    EstadoEntrega e;
    ModuloFalso m;
    m.botonPresionado = false;
    VERIFICA(procesarEntrega("c_3", true, e, m) == Resultado::SinBoton, "debe esperar el botón");
    VERIFICA(m.pulsos == 0 && m.acks.empty() && m.escrituras.empty(), "sin pulsos, ACK ni escrituras");
    m.botonPresionado = true;
    VERIFICA(procesarEntrega("c_3", true, e, m) == Resultado::Entregado, "con el botón se sirve");
    VERIFICA(m.pulsos == 1, "una sola entrega");
  });

  prueba("un id demasiado largo se recorta sin desbordar la memoria", [] {
    EstadoEntrega e;
    ModuloFalso m;
    std::string largo(100, 'x');
    procesarEntrega(largo.c_str(), false, e, m);
    VERIFICA(strlen(e.hecho) == LARGO_ID - 1, "recortado a LARGO_ID - 1");
  });

  std::printf(fallas == 0 ? "\nTodas las pruebas del firmware pasaron.\n" : "\n%d verificaciones fallaron.\n", fallas);
  return fallas == 0 ? 0 : 1;
}
