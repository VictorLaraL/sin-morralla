// Cuántos pulsos ("monedas") le corresponden a un pago en una máquina.

export interface ConfigPulsos {
  /** Cuánto vale un pulso del monedero (por ejemplo, 100 = $1). */
  valorPulsoCentavos: number;
  /** Tope de pulsos por pago, para no regalar servicio por un error. */
  maxPulsos: number;
  /** Monto del QR de la máquina; 0 = el cliente escribe el monto. */
  precioCentavos: number;
}

export interface Credito {
  pulsos: number;
  excedenteCentavos: number;
  /** Explicación para el dueño cuando algo requiere atención (devolución, excedente). */
  nota: string | null;
}

export function calcularCredito(config: ConfigPulsos, montoCentavos: number): Credito {
  if (!(config.valorPulsoCentavos > 0) || !(config.maxPulsos > 0)) {
    return {
      pulsos: 0,
      excedenteCentavos: montoCentavos,
      nota: "Configuración de pulsos inválida (valor del pulso o tope en 0): revisa la máquina; requiere devolución",
    };
  }
  if (config.precioCentavos > 0 && montoCentavos < config.precioCentavos) {
    return {
      pulsos: 0,
      excedenteCentavos: montoCentavos,
      nota: "Pagó menos que el precio: requiere devolución si el cliente la pide",
    };
  }
  const posibles = Math.floor(montoCentavos / config.valorPulsoCentavos);
  const pulsos = Math.min(posibles, config.maxPulsos);
  const excedenteCentavos = montoCentavos - pulsos * config.valorPulsoCentavos;

  let nota: string | null = null;
  if (pulsos === 0) nota = "Monto menor al valor de un pulso: requiere devolución si el cliente la pide";
  else if (posibles > config.maxPulsos) nota = `Se limitó a ${config.maxPulsos} pulsos; el excedente requiere devolución`;
  else if (excedenteCentavos > 0) nota = "Sobró un excedente que no completa un pulso";

  return { pulsos, excedenteCentavos, nota };
}
