// Abre cada jogo "pronto" do catálogo como tablet, confere o botão de voltar, começa a jogar e procura erros.
// Uso: node --experimental-websocket ferramentas/teste/todos.mjs [http://localhost:8080]
import { abrir, espera } from "./cdp.mjs";
import { readFileSync } from "node:fs";
const BASE = process.argv[2] || "http://localhost:8080";
const cat = readFileSync(new URL("../../src/catalogo.js", import.meta.url), "utf8");
const ids = [...new Set([...cat.matchAll(/\{ id: "([^"]+)"[^\n]*status: "pronto"/g)].map((m) => m[1]))];
let falhas = 0;
for (const id of ids) {
  const t = await abrir(`${BASE}/jogos/${id}/`, { mobile: true, largura: 1180, altura: 820 });
  await espera(4000);
  const voltar = await t.ev(`!!document.querySelector(".botao-voltar")`).catch(() => false);
  await t.ev(`(document.querySelector(".casca-nivel, [data-nivel], #jogar, .botao.respira") || {}).click?.()`).catch(() => {});
  await espera(2500);
  if (t.erros.length || !voltar) falhas++;
  console.log(t.erros.length || !voltar ? "✗" : "✓", id.padEnd(22), voltar ? "" : "SEM VOLTAR", t.erros.join(" ; "));
  await t.fechar();
}
console.log(ids.length, "jogos, falhas:", falhas);
process.exit(falhas ? 1 : 0);
