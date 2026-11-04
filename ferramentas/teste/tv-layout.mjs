// Tela da TV (/tv): o painel "Quantos vão jogar?" e o "JOGAR" sem texto em cima de texto, em 720p, 1080p, 4K e na tela
// ultralarga (3437×1343), com as vagas vazias, 1 controle, 2 jogadores (celular + controle) e alguém desconectado.
// Também confere que o Rabisco Kart está fora (src/catalogo.js, JOGOS_NO_AR) e que o jogo único vira o botão "JOGAR".
// Uso: node --experimental-websocket ferramentas/teste/tv-layout.mjs [http://localhost:8080] [pasta-das-fotos]
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
const BASE = process.argv[2] || "http://localhost:8080";
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const PASTA = (process.argv[3] || RAIZ + ".claude/tmp/tv-layout").replace(/\/?$/, "/");
mkdirSync(PASTA, { recursive: true });
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 20000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(250); } return false; };

// relay local (a TV abre a sala nele; nada sai para o servidor de verdade)
const portaLivre = () => new Promise((r) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const PORTA = await portaLivre();
if (!existsSync(RAIZ + "servidor/node_modules/ws")) { console.log("✗ servidor/node_modules não encontrado: rode `cd servidor && npm ci`"); process.exit(1); }
const relay = spawn(process.execPath, ["sala.mjs"], { cwd: RAIZ + "servidor", env: { ...process.env, PORT: String(PORTA), ORIGENS: "" }, stdio: "ignore" });
process.on("exit", () => { try { relay.kill(); } catch { /* já saiu */ } });
await espera(1200);

const CADASTRO = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t.com" }, crianca: { nome: "Alice Souza", genero: "menina" } }));`;
const t = await abrir("about:blank", { largura: 1920, altura: 1080 });
await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: CADASTRO });
await t.cmd("Page.navigate", { url: `${BASE}/tv/?teste&sala=${encodeURIComponent(`ws://localhost:${PORTA}`)}` });
ok(await ate(t, "window.tvTeste?.sala?.estado === 'aberta' && !!document.querySelector('#qr svg')"), "/tv abriu com a sala e o QR");
await t.ev("document.fonts.ready.then(() => true)");

ok(await t.ev("!document.querySelector('[data-jogo=\"rabisco-kart\"]') && document.querySelectorAll('.card').length === 1"), "Rabisco Kart fora da TV (só a Rabiscolândia)");
ok(await t.ev("!!document.querySelector('.card.grande[data-jogo=\"rabiscopolis\"]') && document.querySelector('.card.grande').textContent.includes('JOGAR')"), "um jogo só: botão grande 'JOGAR Rabiscolândia'");

// textos do menu: um retângulo por linha de texto (a caixa inclui a entrelinha da fonte: só conta como sobreposto quando
// as letras se cruzam de verdade, mais de 35% da altura da linha menor); nenhum encosta em outro de outro elemento, e todos ficam dentro do painel
const MEDIR = `(() => {
  const caixas = [];
  const andar = document.createTreeWalker(document.querySelector('#menu'), NodeFilter.SHOW_TEXT);
  for (let n = andar.nextNode(); n; n = andar.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (!el || el.closest('[hidden]') || getComputedStyle(el).visibility === 'hidden') continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const painel = (el.closest('button, .vaga, .dica-controle') || el.closest('.painel')).getBoundingClientRect(); // dentro do botão/linha dele
    for (const q of r.getClientRects()) if (q.width > 1 && q.height > 1) caixas.push({ el: [...document.querySelectorAll('#menu *')].indexOf(el), txt: n.textContent.trim().slice(0, 30), x0: q.left, y0: q.top, x1: q.right, y1: q.bottom, p: [painel.left, painel.top, painel.right, painel.bottom] });
  }
  const ruins = [];
  for (let i = 0; i < caixas.length; i++) {
    const a = caixas[i];
    if (a.x0 < a.p[0] - 1 || a.y0 < a.p[1] - 1 || a.x1 > a.p[2] + 1 || a.y1 > a.p[3] + 1) ruins.push('cortado (sai do botão/linha/painel): ' + a.txt);
    for (let j = i + 1; j < caixas.length; j++) {
      const b = caixas[j];
      if (a.el === b.el) continue;
      const ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), iy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ix > 2 && iy > 0.35 * Math.min(a.y1 - a.y0, b.y1 - b.y0)) ruins.push('"' + a.txt + '" × "' + b.txt + '"');
    }
  }
  const rolagem = document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1;
  return { n: caixas.length, ruins: ruins.slice(0, 6), rolagem };
})()`;

const ESTADOS = {
  "vazio": null,
  "1-jogador-controle": { n: 1, vagas: [{ n: 1, tipo: "controle", pad: 0, conectado: true }, { n: 2, tipo: null }] },
  "1-jogador-celular-caiu": { n: 1, vagas: [{ n: 1, tipo: "celular", conectado: false, caiu: 1 }, { n: 2, tipo: null }] },
  "2-jogadores-celular-controle": { n: 2, vagas: [{ n: 1, tipo: "celular", conectado: true }, { n: 2, tipo: "controle", pad: 1, conectado: true }] },
  "2-jogadores-um-desconectou": { n: 2, vagas: [{ n: 1, tipo: "controle", pad: 0, conectado: true }, { n: 2, tipo: "celular", conectado: false, caiu: 1 }] },
  "1-jogador-com-2-na-sala": { n: 1, vagas: [{ n: 1, tipo: "controle", pad: 0, conectado: true }, { n: 2, tipo: "celular", conectado: true }] },
};
const TAMANHOS = [[1280, 720], [1920, 1080], [3437, 1343], [3840, 2160]];
const FOTOS = new Set(["1920x1080", "3437x1343"]);
for (const [w, h] of TAMANHOS) {
  await t.cmd("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await espera(400);
  for (const [nome, est] of Object.entries(ESTADOS)) {
    await t.ev(`tvTeste.simularVagas(${JSON.stringify(est)})`);
    await espera(150);
    const m = await t.ev(MEDIR);
    ok(!m.ruins.length && !m.rolagem && m.n > 10, `${w}×${h} ${nome}: ${m.n} linhas de texto, nada sobreposto nem cortado${m.ruins.length ? " → " + m.ruins.join(" ; ") : ""}${m.rolagem ? " (ROLAGEM)" : ""}`);
    if (FOTOS.has(`${w}x${h}`)) await t.foto(`${PASTA}tv-${w}x${h}-${nome}.png`);
  }
}
await t.ev("tvTeste.simularVagas(null)");
ok(!t.erros.length, "sem erros " + t.erros.join(" ; "));
await t.fechar();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo", "· fotos em", PASTA);
process.exit(falhas ? 1 : 0);
