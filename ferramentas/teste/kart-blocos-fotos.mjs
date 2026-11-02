// Fotos do Rabisco Kart (largada, curva, portal, parceiros, TV e celular) para comparar antes e depois do estilo de blocos.
// Uso: node --experimental-websocket ferramentas/teste/kart-blocos-fotos.mjs <http://localhost:porta> <prefixo> [cena ...]
// Saída: .claude/tmp/kart-blocos/<prefixo>-<cena>.png
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";
const BASE = process.argv[2], PREF = process.argv[3] || "depois";
const SO = process.argv.slice(4);
const OUT = fileURLToPath(new URL("../../.claude/tmp/kart-blocos/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const TV = `sessionStorage.setItem("rabisco.tv", JSON.stringify({ codigo: null, token: null, vagas: [{ tipo: "controle", pad: 0 }, { tipo: null }], jogadores: 1 }));`;
const ate = async (t, expr, ms = 40000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(250); } return false; };
const posar = (i, lat, vel, ang = "null") => `(() => { const k = teste.jogador; teste.colocar(k, ${i}, ${lat}, ${vel}); teste.angulo = ${ang}; })()`;
// índice da curva mais fechada da pista
const CURVA = `(() => { let m = 0, b = 100; for (let i = 100; i < teste.AMOSTRAS - 100; i += 5) { const a = Math.abs(Math.atan2(teste.tangente[teste.idx(i + 30)].x, teste.tangente[teste.idx(i + 30)].z) - Math.atan2(teste.tangente[i].x, teste.tangente[i].z)); if (a > m && a < 3) { m = a; b = i; } } return b; })()`;
// põe o kart na pista um pouco antes da n-ésima loja (prédio grande de uma parceira), com a loja à frente
const LOJA = (n) => `const L = []; teste.cena.children.forEach((o) => { if (!o.userData.dinamico) return; const b = new (teste.cena.constructor === undefined ? Object : Object)(); L.push(o); });
  const lojas = L.filter((o) => { let w = 0, h = 0; o.traverse((m) => { if (m.isMesh) { m.geometry.computeBoundingBox(); const s = m.geometry.boundingBox; w = Math.max(w, (s.max.x - s.min.x) * m.scale.x); h = Math.max(h, s.max.y * m.scale.y + m.position.y); } }); return w > 12 && h > 8; });
  const o = lojas[${n} % lojas.length]; let k = 0, m = 1e9; for (let i = 0; i < teste.AMOSTRAS; i += 2) { const d = Math.hypot(teste.centro[i].x - o.position.x, teste.centro[i].z - o.position.z); if (d < m) { m = d; k = i; } }
  const ld = teste.lado[k], sg = Math.sign((o.position.x - teste.centro[k].x) * ld.x + (o.position.z - teste.centro[k].z) * ld.z);
  teste.colocar(teste.jogador, teste.idx(k - 4), -sg * 7, 0); teste.angulo = -sg * Math.PI * 0.62; window.__lojas = lojas.length;`;
const CENAS = {
  "1-largada": { url: "?teste&auto", js: `0`, esperar: 6200, pronto: "teste.estado === 'corrida'" },
  "2-curva": { url: "?teste&auto", js: `(() => { const i = ${CURVA}; ${posar("i - 12", 0, 24)}; })()`, esperar: 1800 },
  "3-portal": { url: "?teste&auto&porticos=0", js: `0`, esperar: 2600 },
  "4-parceiros": { url: "?teste&auto", js: `(() => { ${LOJA(1)} })()`, esperar: 2200, pronto: "teste.estado === 'corrida'" },
  "5-parceiros-b": { url: "?teste&auto", js: `(() => { ${LOJA(2)} })()`, esperar: 2200, pronto: "teste.estado === 'corrida'" },
  "6-abertura": { url: "?teste", js: `0`, esperar: 2500 },
  "7-tv": { url: "?tv=1&teste", js: `0`, esperar: 3000, tv: true, antes: TV, pronto: "!!window.teste && window.Jogadores?.tv === true", w: 1280, h: 720 },
  "8-celular": { url: "?teste&auto", js: `(() => { const i = ${CURVA}; ${posar("i - 12", 0, 24)}; })()`, esperar: 2600, mobile: true, w: 844, h: 390 },
};
for (const [nome, c] of Object.entries(CENAS)) {
  if (SO.length && !SO.some((s) => nome.includes(s))) continue;
  const t = await abrir("about:blank", { largura: c.w || 1280, altura: c.h || 720, mobile: c.mobile });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: FAMILIA + ";" + (c.antes || "") });
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabisco-kart/${c.url}` });
  if (!(await ate(t, c.pronto || "!!window.teste && teste.karts.length === 4", 90000))) console.log("não abriu", nome, t.erros.join("|"));
  await espera(1500);
  await t.ev(c.js).catch((e) => console.log("js", nome, e.message.slice(0, 120)));
  await espera(c.esperar);
  await t.foto(`${OUT}${PREF}-${nome}.png`);
  console.log(nome, t.erros.length ? t.erros.slice(0, 3).join(" | ") : "ok");
  await t.fechar();
}
process.exit(0);
