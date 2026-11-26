// Efectos visuales de la landing (identidad v2). Solo presentación: la demo y el formulario viven en landing.js.
// Si este archivo no carga, la página se ve completa y sin animaciones de entrada.

const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

// La barra se vuelve más sólida al bajar.
const barra = document.querySelector(".barra");
const alDesplazar = () => barra?.classList.toggle("desplazada", scrollY > 12);
addEventListener("scroll", alDesplazar, { passive: true });
alDesplazar();

// Las secciones aparecen al entrar en pantalla. El estado oculto solo existe mientras <html> tiene .con-movimiento.
if (!sinMovimiento && "IntersectionObserver" in window) {
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        const el = entrada.target;
        // Lo que ya quedó arriba de la pantalla (posición restaurada al recargar) se muestra sin esperar.
        if (!entrada.isIntersecting && entrada.boundingClientRect.bottom < 0) {
          el.classList.add("visible");
          observador.unobserve(el);
          continue;
        }
        if (!entrada.isIntersecting) continue;
        // Escalonado: cada elemento declara su turno con style="--orden: N".
        const orden = Number(el.style.getPropertyValue("--orden")) || 0;
        setTimeout(() => el.classList.add("visible"), orden * 90);
        observador.unobserve(el);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  document.documentElement.classList.add("con-movimiento");
  for (const el of document.querySelectorAll("[data-revelar]")) observador.observe(el);
}

// El contador de pagos de la demo "salta" en verde cuando sube.
const contador = document.getElementById("pagos-hoy");
if (contador && !sinMovimiento) {
  let anterior = null;
  new MutationObserver(() => {
    const actual = Number(contador.textContent);
    if (Number.isFinite(actual) && anterior !== null && actual > anterior) {
      contador.classList.remove("cambio");
      void contador.offsetWidth; // reinicia la animación
      contador.classList.add("cambio");
    }
    if (Number.isFinite(actual)) anterior = actual;
  }).observe(contador, { childList: true, characterData: true, subtree: true });
}
