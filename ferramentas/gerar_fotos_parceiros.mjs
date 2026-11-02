// Gera as "fotos" (arte inventada, sem nada de terceiros) das parceiras sem foto: assets/parceiros/<id>.webp.
// O desenho está em src/parceiros-arte.js; o Chrome sem janela só pinta o canvas e devolve o webp.
// Uso, com o servidor de teste no ar:
//   node --experimental-websocket ferramentas/gerar_fotos_parceiros.mjs http://localhost:8099 [id ...]
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir } from "./teste/cdp.mjs";

const [BASE = "http://localhost:8099", ...SO] = process.argv.slice(2);
const PASTA = fileURLToPath(new URL("../assets/parceiros/", import.meta.url));
const t = await abrir(`${BASE}/jogos/rabiscopolis/previa-pessoas.html`);
const fotos = await t.ev(`(async () => {
  await document.fonts.load("800 64px 'Baloo 2'").catch(() => {});
  const { desenharFoto, IDS_ARTE } = await import("${BASE}/src/parceiros-arte.js");
  const { PARCEIROS } = await import("${BASE}/src/parceiros.js");
  const so = ${JSON.stringify(SO)}, saida = {};
  for (const id of IDS_ARTE) {
    if (so.length && !so.includes(id)) continue;
    const k = document.createElement("canvas"); k.width = 1024; k.height = 640;
    desenharFoto(k.getContext("2d"), id, 1024, 640, { instagram: PARCEIROS.find((p) => p.id === id)?.instagram });
    saida[id] = k.toDataURL("image/webp", 0.86);
  }
  return saida;
})()`);
for (const [id, url] of Object.entries(fotos)) {
  const b = Buffer.from(url.split(",")[1], "base64");
  writeFileSync(`${PASTA}${id}.webp`, b);
  console.log(`${id}.webp: ${Math.round(b.length / 1024)} KB`);
}
await t.fechar();
