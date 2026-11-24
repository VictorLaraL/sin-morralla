// Manda un aviso de pago firmado igual que pey al servidor local, sin dinero real.
// Uso: npm run simular:pago -- --qr <IDC del QR de la máquina> --monto 13
// Opciones: --url (por defecto http://localhost:8787/webhooks/pey) --tx <transactionId> --repetir

import { parseArgs } from "node:util";
import { avisoDePago, enviarAviso, leerDevVars } from "./comun.ts";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:8787/webhooks/pey" },
    qr: { type: "string" },
    monto: { type: "string", default: "13" },
    tx: { type: "string" },
    repetir: { type: "boolean", default: false },
  },
});

const secreto = leerDevVars().PEY_WEBHOOK_SECRET;
if (!secreto) throw new Error("Falta PEY_WEBHOOK_SECRET en .dev.vars");

const aviso = avisoDePago({ montoCentavos: Math.round(Number(values.monto) * 100), codiQrId: values.qr, transactionId: values.tx });
const id = "msg_sim_" + Date.now();
for (let i = 0; i < (values.repetir ? 2 : 1); i++) {
  const r = await enviarAviso(values.url!, secreto, aviso, id);
  console.log(`${i === 0 ? "Envío" : "Reintento"} -> ${r.status} ${await r.text()}`);
}
