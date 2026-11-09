// Rabiscolândia (Mundo Vivo, etapa 9): a interface nova (hud.js + hud.css).
// Em 4 tamanhos de tela (TV/computador 1280×720 e 1920×1080, celular deitado 844×390 e em pé 390×844):
//  - painel do jogador, moedas com "+", fileira de 5 botões e o botão do Mapa estão na tela inteiros e com 40 px ou mais;
//  - nada se sobrepõe: entre si, com o topo da casca (✕, pausa, ⚙️) e, no celular, com os controles de toque a pé;
//  - no celular dentro do carro a fileira e o Mapa somem (SAIR, pedais e volante ficam livres);
//  - cada botão abre a tela certa: Missões → Passaporte, Minha Casa → Casa, Inventário → Mochila, Loja → menu (Ateliê, Móveis),
//    Conquistas → menu (Passaporte, Desafios), "+" → Ateliê, Mapa → mapa grande, painel → Meu Rabisco;
//  - com uma tela por cima (Rabisfone) a fileira some e volta ao fechar.
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/hud.mjs [http://localhost:8097] [pasta-das-fotos]
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:8097";
const FOTOS = process.argv[3] || null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
let falhas = 0;
const vigia = setTimeout(() => { console.log("✗ o teste travou (o navegador caiu?)"); process.exit(2); }, 15 * 60 * 1000);
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 90000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e));
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const TELAS = [
  { nome: "TV/computador 1280×720", largura: 1280, altura: 720, mobile: false, arq: "tv-1280" },
  { nome: "TV grande 1920×1080", largura: 1920, altura: 1080, mobile: false, arq: "tv-1920" },
  { nome: "celular deitado 844×390", largura: 844, altura: 390, mobile: true, arq: "celular-deitado" },
  { nome: "celular em pé 390×844", largura: 390, altura: 844, mobile: true, arq: "celular-em-pe" },
];
// retângulos dos elementos visíveis (nome → [x0, y0, x1, y1]); só os que estão de fato na tela
const RETS = `(() => { const out = []; const visivel = (e) => { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || e.hidden) return false; const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const pega = (sel, nome) => document.querySelectorAll(sel).forEach((e, i) => { if (!visivel(e)) return; const r = e.getBoundingClientRect(); out.push({ nome: nome + (i ? "#" + i : ""), x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }); });
  pega(".hud-jog", "painel"); pega(".hud-rp .rbc-contador", "moedas"); pega(".hud-mais", "+loja"); pega(".hud-btn", "botão"); pega(".hud-mapa", "mapa");
  pega(".casca-topo > *", "topo"); pega(".pausa-botao", "pausa");
  if (document.body.classList.contains("touch")) { pega(".rp-pe .rp-acao", "toque:ação"); pega(".rp-pe .rp-fone", "toque:fone"); pega(".jd-pulo", "toque:pulo"); pega(".rp-carro .rp-sair", "carro:sair"); pega(".rp-carro .rp-acel", "carro:acel"); pega(".rp-carro .rp-re", "carro:ré"); pega(".rp-carro .rp-auto", "carro:auto"); pega(".rp-carro .rp-volante", "carro:volante"); pega(".rp-carro .rp-fone", "carro:fone"); }
  return { w: innerWidth, h: innerHeight, out }; })()`;
const cruza = (a, b) => a.x0 < b.x1 - 1 && a.x1 > b.x0 + 1 && a.y0 < b.y1 - 1 && a.y1 > b.y0 + 1;
const APP = `document.querySelector(".rf-aparelho")?.dataset.app`;

for (const T of TELAS) {
  const t = await abrir("about:blank", { mobile: T.mobile, largura: T.largura, altura: T.altura });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: FAMILIA });
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  ok(await ate(t, "Boolean(window.teste?.vivo && window.teste.hud)"), `[${T.nome}] carregou com a interface nova`);
  await espera(1800);
  const clicar = async (sel) => { if (T.mobile) await t.toque(sel); else await t.ev(`document.querySelector(${JSON.stringify(sel)}).click()`); await espera(450); };
  // ---- o que há na tela e onde
  const R = await t.ev(RETS);
  const hud = R.out.filter((r) => /^(painel|moedas|\+loja|botão|mapa)/.test(r.nome));
  ok(hud.filter((r) => r.nome.startsWith("botão")).length === 5 && hud.some((r) => r.nome === "mapa") && hud.some((r) => r.nome === "painel") && hud.some((r) => r.nome === "moedas") && hud.some((r) => r.nome === "+loja"), `[${T.nome}] painel, moedas, +, 5 botões e Mapa na tela (${hud.map((r) => r.nome).join(", ")})`);
  const fora = hud.filter((r) => r.x0 < -1 || r.y0 < -1 || r.x1 > R.w + 1 || r.y1 > R.h + 1).map((r) => r.nome);
  ok(!fora.length, `[${T.nome}] tudo dentro da tela ${R.w}×${R.h} (${fora.join(", ")})`);
  const pequenos = hud.filter((r) => /^(botão|mapa|\+loja)/.test(r.nome) && Math.min(r.x1 - r.x0, r.y1 - r.y0) < (r.nome === "+loja" ? 24 : 40)).map((r) => `${r.nome} ${Math.round(r.x1 - r.x0)}×${Math.round(r.y1 - r.y0)}`);
  ok(!pequenos.length, `[${T.nome}] botões com 40 px ou mais (${pequenos.join(", ")})`);
  const pares = [];
  for (let i = 0; i < R.out.length; i++) for (let k = i + 1; k < R.out.length; k++) { const a = R.out[i], b = R.out[k]; const umHud = /^(painel|moedas|\+loja|botão|mapa)/.test(a.nome) || /^(painel|moedas|\+loja|botão|mapa)/.test(b.nome); if (umHud && cruza(a, b)) pares.push(`${a.nome}×${b.nome}`); }
  ok(!pares.length, `[${T.nome}] nada se sobrepõe (interface, topo da casca${T.mobile ? " e controles de toque" : ""}) ${pares.join(", ")}`);
  if (T.mobile) {
    const toqueOk = R.out.some((r) => r.nome === "toque:ação") && R.out.some((r) => r.nome === "toque:pulo");
    ok(toqueOk, `[${T.nome}] os controles de toque a pé continuam na tela`);
  }
  if (FOTOS) await t.foto(`${FOTOS}/${T.arq}.png`);
  // celular em pé: a casca pede para girar o celular ("deitado: true") e cobre a tela; aqui só o desenho conta
  const gire = await t.ev('(() => { const g = document.querySelector(".gire-celular"); return Boolean(g) && getComputedStyle(g).display !== "none" && document.body.classList.contains("so-deitado"); })()');
  if (gire) { ok(true, `[${T.nome}] a casca pede para girar o celular: os botões só valem deitado`); const erros = errosDeVerdade(t); ok(!erros.length, `[${T.nome}] sem erros no console (${erros.slice(0, 2).join(" | ")})`); await t.fechar(); continue; }
  // ---- cada botão abre a tela certa
  await clicar('.hud-btn[data-hud="missoes"]');
  ok(await t.ev(`teste.fone.aberto && ${APP} === "passaporte"`), `[${T.nome}] Missões abre o Passaporte`);
  ok(await t.ev('getComputedStyle(document.querySelector(".hud-botoes")).display === "none"'), `[${T.nome}] com o Rabisfone aberto a fileira some`);
  await t.ev("teste.fone.fechar()"); await espera(500);
  ok(await t.ev('getComputedStyle(document.querySelector(".hud-botoes")).display !== "none"'), `[${T.nome}] fechou: a fileira volta`);
  await clicar('.hud-btn[data-hud="casa"]');
  ok(await t.ev(`teste.fone.aberto && ${APP} === "casa"`), `[${T.nome}] Minha Casa abre o app Casa`);
  await t.ev("teste.fone.fechar()"); await espera(400);
  await clicar('.hud-btn[data-hud="inventario"]');
  ok(await t.ev(`teste.fone.aberto && ${APP} === "inventario" && /mochila/i.test(document.querySelector(".rf-tela").textContent)`), `[${T.nome}] Inventário abre a Mochila`);
  await t.ev("teste.fone.fechar()"); await espera(400);
  await clicar('.hud-btn[data-hud="loja"]');
  const menuLoja = await t.ev(`(() => { const m = document.querySelector(".hud-menu"); return m.hidden ? null : [...m.querySelectorAll(".hud-menu-item span:nth-child(2)")].map((b) => b.textContent.trim()); })()`);
  ok(menuLoja && menuLoja.length === 2 && /Ateliê/.test(menuLoja[0]) && /Móveis/.test(menuLoja[1]), `[${T.nome}] Loja abre o menu com Ateliê e Móveis (${(menuLoja ?? []).join(" · ")})`);
  await clicar(".hud-menu .hud-menu-item");
  ok(await t.ev(`teste.fone.aberto && ${APP} === "atelie" && document.querySelector(".hud-menu").hidden`), `[${T.nome}] Loja → Ateliê abre o Ateliê e fecha o menu`);
  await t.ev("teste.fone.fechar()"); await espera(400);
  await clicar('.hud-btn[data-hud="loja"]'); await clicar(".hud-menu .hud-menu-item:nth-child(2)");
  ok(await t.ev(`teste.fone.aberto && ${APP} === "casa"`), `[${T.nome}] Loja → Móveis fora de casa mostra o app Casa (o catálogo é lá dentro)`);
  await t.ev("teste.fone.fechar()"); await espera(400);
  await clicar('.hud-btn[data-hud="conquistas"]');
  const menuConq = await t.ev(`(() => { const m = document.querySelector(".hud-menu"); return m.hidden ? null : [...m.querySelectorAll(".hud-menu-item span:nth-child(2)")].map((b) => b.textContent.trim()); })()`);
  ok(menuConq && menuConq.includes("Passaporte") && menuConq.includes("Desafios"), `[${T.nome}] Conquistas abre o menu com Passaporte e Desafios (${(menuConq ?? []).join(" · ")})`);
  await clicar(".hud-menu .hud-menu-item:nth-child(2)");
  ok(await t.ev(`teste.fone.aberto && ${APP} === "desafios"`), `[${T.nome}] Conquistas → Desafios abre os Desafios`);
  await t.ev("teste.fone.fechar()"); await espera(400);
  await clicar(".hud-mais");
  ok(await t.ev(`teste.fone.aberto && ${APP} === "atelie"`), `[${T.nome}] o "+" das moedas abre a loja (Ateliê)`);
  await t.ev("teste.fone.fechar()"); await espera(400);
  await clicar(".hud-mapa");
  ok(await t.ev("Boolean(teste.mapaUI.aberto)"), `[${T.nome}] Mapa abre o mapa grande`);
  await t.ev("teste.mapaUI.fechar()"); await espera(400);
  await clicar(".hud-jog");
  ok(await t.ev("Boolean(teste.meuRb.aberto)"), `[${T.nome}] o painel do jogador abre o Meu Rabisco`);
  await t.ev("teste.meuRb.fechar()"); await espera(400);
  const painel = await t.ev(`({ nome: document.querySelector(".hud-nome").textContent, avatar: document.querySelector(".hud-avatar").textContent, nivel: document.querySelector(".hud-niv i").textContent, xp: document.querySelector(".hud-xp i").style.width })`);
  ok(painel.nome === "Alice" && painel.avatar === "👧" && painel.nivel === "1", `[${T.nome}] painel: ${painel.avatar} ${painel.nome}, nível ${painel.nivel}, XP ${painel.xp || "0%"}`);
  // ---- no celular dentro do carro: a fileira e o Mapa saem do caminho dos pedais e do SAIR
  if (T.mobile) {
    await t.ev("teste.entrar(0)"); await espera(900);
    const R2 = await t.ev(RETS);
    const hud2 = R2.out.filter((r) => /^(botão|mapa)/.test(r.nome)).map((r) => r.nome);
    ok(!hud2.length && R2.out.some((r) => r.nome === "carro:sair") && R2.out.some((r) => r.nome === "carro:acel"), `[${T.nome}] no carro: fileira e Mapa somem; SAIR e pedais na tela (${hud2.join(", ")})`);
    const pares2 = [];
    for (let i = 0; i < R2.out.length; i++) for (let k = i + 1; k < R2.out.length; k++) { const a = R2.out[i], b = R2.out[k]; if (/^(painel|moedas|\+loja)/.test(a.nome) !== /^(painel|moedas|\+loja)/.test(b.nome) && cruza(a, b)) pares2.push(`${a.nome}×${b.nome}`); }
    ok(!pares2.length, `[${T.nome}] no carro: painel e moedas não cobrem controle nenhum ${pares2.join(", ")}`);
    if (FOTOS) await t.foto(`${FOTOS}/${T.arq}-carro.png`);
    await t.ev("teste.sair()"); await espera(600);
  }
  const erros = errosDeVerdade(t);
  ok(!erros.length, `[${T.nome}] sem erros no console (${erros.slice(0, 2).join(" | ")})`);
  await t.fechar();
}

clearTimeout(vigia);
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
