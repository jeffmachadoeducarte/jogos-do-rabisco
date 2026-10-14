// Teste do Rabisco e a Arca: tela PRESS START, fase 1 jogada do começo ao fim (pulo de verdade nos itens,
// um item errado, escada final com o direcional e chegada à ovelhinha), versículo no cartão, celular deitado
// com os botões de toque e as outras fases abrindo sem erro. Com FOTOS=pasta salva as fotos para avaliação.
// Uso: node --experimental-websocket ferramentas/teste/rabisco-e-a-arca.mjs http://localhost:8095
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8095";
const FOTOS = process.env.FOTOS || "";
const foto = async (t, nome) => { if (FOTOS) await t.foto(`${FOTOS}/arca-${nome}.png`); };
let falhas = 0;
const ate = async (t, expr, ms = 15000) => { let v; for (let i = 0; i < ms / 250; i++) { try { v = await t.ev(expr); } catch { v = null; } if (v) return v; await espera(250); } return v; };
const ok = (cond, txt) => { console.log(`${cond ? "✓" : "✗"} ${txt}`); if (!cond) falhas++; };
const URL_JOGO = `${BASE}/jogos/rabisco-e-a-arca/?teste`;
const est = (t) => t.ev("window.teste.estado()");

// ------------------------------------------------------------------ Tablet com controle: fase 1 inteira
const t = await abrir(URL_JOGO, { mobile: true, largura: 1180, altura: 820 });
await ate(t, "!!document.querySelector('.arca-start') && document.querySelectorAll('.casca-nivel').length === 6");
await espera(1500);
ok(t.erros.length === 0, `abre sem erros ${t.erros.join(" | ")}`);
ok(await t.ev("getComputedStyle(document.querySelector('.arca-start')).display !== 'none'"), "tela PRESS START aparece");
await foto(t, "inicio");
await t.toque(".arca-start");
await ate(t, "document.querySelector('.arca-start').hidden");
ok(await t.ev("document.querySelector('.arca-start').hidden"), "um toque tira a tela PRESS START");
ok(await t.ev("document.querySelectorAll('.casca-nivel').length") === 6, "6 fases na abertura");
await foto(t, "fases");

await t.toque(".casca-nivel");
await ate(t, "window.teste?.estado() && document.querySelector('.arca-mundo canvas') && window.teste.jogo.estado === 'jogando'");
await t.conecta();
await espera(2600);
await foto(t, "jogando");
ok(await ate(t, "window.teste.estado().pedindo", 15000), "o pedido em inglês começa depois da instrução");
const pedido = await t.ev("document.querySelector('.arca-pedido').textContent");
ok(/Find the LION!/.test(pedido), `balão mostra o pedido em inglês: "${pedido.trim()}"`);
await foto(t, "pedido-ingles");

const mundo = await t.ev("window.teste.mundo()");
ok(mundo.andares === 3 && mundo.itens.length === 6, `fase 1: 3 andares e 6 itens ${JSON.stringify(mundo.itens.map((i) => i.id))}`);
await t.ev("window.teste.semBarris()");

// pula embaixo de um item de verdade (A do controle) e confere o que aconteceu
async function pularEm(id) {
  const it = (await t.ev("window.teste.mundo()")).itens.find((i) => i.id === id && !i.pego);
  await t.ev(`window.teste.teleportar(${it.andar}, ${it.x})`);
  await espera(250);
  await t.ev("__aperta(0, true)");
  await espera(450);
  await t.ev("__aperta(0, false)");
  await ate(t, "window.teste.estado().chao", 4000);
}
// andar de lado com o direcional (anda mesmo)
const e0 = await est(t);
await t.ev(`__aperta(${e0.x > 440 ? 14 : 15}, true)`); await espera(900); await t.ev(`__aperta(${e0.x > 440 ? 14 : 15}, false)`); await espera(200);
const e1 = await est(t);
ok(Math.abs(e1.x - e0.x) > 60, `direcional anda o Rabisco (x ${e0.x.toFixed(0)} → ${e1.x.toFixed(0)})`);

// item errado primeiro: a voz diz o nome dele e nada se perde
const errado = mundo.itens.find((i) => i.andar === 0 && i.id !== "lion");
await pularEm(errado.id);
const e2 = await est(t);
ok(e2.pegos === 0 && e2.erros === 1, `item errado (${errado.id}) não conta e não tira vida (erros ${e2.erros}, vidas ${e2.chances})`);
ok(e2.maiorPulo > 60, `pulo de verdade (subiu ${e2.maiorPulo.toFixed(0)})`);
await espera(2600);
for (const alvo of mundo.alvos) {
  await ate(t, `window.teste.estado().pedindo && window.teste.estado().alvo === '${alvo}'`, 12000);
  await pularEm(alvo);
  const e = await est(t);
  ok(e.pegos === mundo.alvos.indexOf(alvo) + 1, `pegou ${alvo} pulando (${e.pegos}/${mundo.alvos.length})`);
  if (alvo === "elephant") await foto(t, "pegou");
}
ok(await ate(t, "window.teste.estado().portaoAberto", 6000), "com todos na arca, a porta abre");
ok(await t.ev("window.teste.rabiscoOk()"), "Rabisco 2D inteiro depois de pular");

// escada final com o direcional para cima e depois anda até a ovelhinha
const final = (await t.ev("window.teste.escadas()")).find((e) => e.final);
await t.ev(`window.teste.teleportar(${final.de}, ${final.x})`);
await espera(200);
await t.ev("__aperta(12, true)");
await ate(t, "window.teste.estado().escada", 3000);
await espera(500);
await foto(t, "escada");
ok(await t.ev("window.teste.rabiscoOk()"), "Rabisco subindo a escada com o rig inteiro");
await ate(t, "window.teste.estado().andar === 3 && !window.teste.estado().escada", 8000);
await t.ev("__aperta(12, false)");
ok((await est(t)).andar === 3, "subiu a escada até o topo da arca");
await t.ev("__aperta(15, true)");
ok(await ate(t, "window.teste.estado().fim", 6000), "chegou na ovelhinha");
await t.ev("__aperta(15, false)");
await espera(4200);
await foto(t, "arco-iris");
ok(await ate(t, "!document.querySelector('.casca-vitoria')?.classList.contains('escondido')", 15000), "cartão de vitória aparece");
await espera(1500);
const vit = await t.ev("document.querySelector('.casca-vitoria').textContent");
ok(vit.includes("baseado em Gênesis 1:31") && vit.includes("based on Genesis 1:31") && vit.includes("God looked at all he made"), "versículo (paráfrase) em português e em inglês no cartão");
await foto(t, "versiculo");
ok(t.erros.length === 0, `fase 1 sem erros ${t.erros.join(" | ")}`);
await t.fechar();

// ------------------------------------------------------------------ Celular deitado: botões de toque
const c = await abrir(`${URL_JOGO}&nivel=1`, { mobile: true, largura: 740, altura: 375 });
await ate(c, "window.teste?.estado() && document.querySelector('.arca-mundo canvas')");
await espera(1500);
ok(await c.ev("getComputedStyle(document.querySelector('.arca-toque')).display !== 'none'"), "botões de toque aparecem no celular");
ok((await c.ev("window.teste.vh()")) < 770, "no celular a câmera mostra parte da torre (tudo maior)");
const c0 = await c.ev("window.teste.estado()");
const bt = c0.x > 440 ? ".arca-bt:nth-child(1)" : ".arca-lado.esq .arca-bt:nth-child(2)";
await c.toque(bt, 900);
const c1 = await c.ev("window.teste.estado()");
ok(Math.abs(c1.x - c0.x) > 40, `◀/▶ de toque anda (x ${c0.x.toFixed(0)} → ${c1.x.toFixed(0)})`);
await c.toque(".arca-bt.pulo", 300);
await espera(200);
ok((await c.ev("window.teste.estado()")).pulos > c1.pulos, "⤒ de toque pula");
await ate(c, "window.teste.estado().pedindo", 15000);
await espera(800);
await foto(c, "celular");
ok(!(await c.transborda()), "celular deitado sem rolagem lateral");
ok(c.erros.length === 0, `celular sem erros ${c.erros.join(" | ")}`);
await c.fechar();

// ------------------------------------------------------------------ As outras fases abrem e jogam
for (let n = 2; n <= 6; n++) {
  const d = await abrir(`${URL_JOGO}&nivel=${n}`, { mobile: true, largura: 1180, altura: 820 });
  await ate(d, "window.teste?.mundo() && window.teste.jogo.estado === 'jogando' && document.querySelector('.arca-mundo canvas')");
  const m = await d.ev("window.teste.mundo()");
  const todos = m.alvos.every((a) => m.itens.some((i) => i.id === a));
  ok(todos, `fase ${n}: todos os alvos estão no mapa (${m.alvos.join(", ")}; ${m.itens.length} itens)`);
  await ate(d, "window.teste.barris() >= 1", 12000);
  if (FOTOS && (n === 3 || n === 5 || n === 6)) { await ate(d, "window.teste.estado().pedindo", 15000); await espera(600); await foto(d, `fase${n}`); }
  ok(d.erros.length === 0, `fase ${n} sem erros ${d.erros.join(" | ")}`);
  await d.fechar();
}

console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo!");
process.exit(falhas ? 1 : 0);
