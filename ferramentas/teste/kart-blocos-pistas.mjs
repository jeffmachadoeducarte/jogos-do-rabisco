// Uma foto de cada pista (2 a 10, ou as dadas) do Rabisco Kart em estilo de blocos, no meio de uma curva e perto de uma loja.
// Uso: node --experimental-websocket ferramentas/teste/kart-blocos-pistas.mjs http://localhost:PORTA [n ...]
// Saída: .claude/tmp/kart-blocos/pistas/pista-N.png
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";
const BASE = process.argv[2];
const DESL = Number(process.env.DESL || 14); // quantas amostras antes da curva (para fugir de um outdoor na frente da câmera)
const SO = process.argv.slice(3).map(Number);
const OUT = fileURLToPath(new URL("../../.claude/tmp/kart-blocos/pistas/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const CURVA = `(() => { let m = 0, b = 100; for (let i = 100; i < teste.AMOSTRAS - 100; i += 5) { const T = teste.tangente; const a = Math.abs(Math.atan2(T[teste.idx(i + 30)].x, T[teste.idx(i + 30)].z) - Math.atan2(T[i].x, T[i].z)); if (a > m && a < 3) { m = a; b = i; } } return b; })()`;
for (let n = 2; n <= 10; n++) {
  if (SO.length && !SO.includes(n)) continue;
  const t = await abrir("about:blank", { largura: 1280, altura: 720 });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: FAMILIA });
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabisco-kart/?teste&auto&pista=${n}` });
  for (let i = 0; i < 180; i++) { await espera(500); if (await t.ev("window.teste?.estado === 'corrida'").catch(() => false)) break; }
  await t.ev(`(() => { const i = ${CURVA}; teste.colocar(teste.jogador, teste.idx(i - ${DESL}), 0, 10); })()`).catch(() => {});
  await espera(7000); // o 3D por software é lento (1 a 3 quadros por segundo): a câmera leva alguns segundos para alcançar o kart
  await t.cmd("Page.captureScreenshot", { format: "png" }).then(async (r) => (await import("node:fs")).writeFileSync(`${OUT}pista-${n}.png`, Buffer.from(r.result.data, "base64")));
  console.log("pista", n, t.erros.filter((e) => !e.includes("mp3")).slice(0, 3).join(" | ") || "ok");
  await t.fechar();
}
process.exit(0);
