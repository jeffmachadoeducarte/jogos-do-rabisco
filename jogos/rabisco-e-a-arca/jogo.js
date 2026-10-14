// Rabisco e a Arca (6 a 10 anos): plataforma de fliperama com vigas inclinadas, escadas e barris rolando.
// A chuva vai chegar! O Rabisco sobe os andaimes da arca de Noé em construção para levar os animais até
// a porta, lá no alto, onde a ovelhinha espera. Lá de cima a Manchinha de Tinta rola barris de tinta roxa.
//
// Inglês dentro da mecânica: a voz pede em inglês ("Find the lion!"), e o Rabisco pula para pegar o item
// certo no andar (cada item tem o nome escrito em inglês). Pegou outro? A voz diz o nome dele ("Oops!
// That's the zebra.") e repete o pedido, sem castigo. Fases: animais → cores → números → frases.
// No fim de cada fase, o arco-íris e um versículo curto em inglês (na fase) e em português (no cartão).
//
// Rabisco 2D oficial (src/motor/rabisco.js) com os membros animados também na escada (RabiscoArca).
// Sons 8-bit próprios (sons-arca.js) e falas gravadas (dados.js → falas.json → ferramentas/gerar_vozes.py).

import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar, preCarregarFalas } from "../../src/motor/voz.js";
import { carregarRabisco, Rabisco } from "../../src/motor/rabisco.js";
import { efeitos } from "./sons-arca.js";
import { FASES, ITENS, FRASES, VERSICULOS } from "./dados.js";

const RAIZ = "../..";
const params = new URLSearchParams(location.search);
const TESTE = params.has("teste");

// ------------------------------------------------------------------ Mundo (unidades lógicas)
// mundo alto (vigas bem espaçadas para o Rabisco grande); a câmera acompanha o Rabisco e mostra parte da torre
const W = 880, H = 962, CHAO = 932, TOPO = 132;
const Z = 1.5;                       // o canvas é 1,5x maior que o mundo para ficar nítido
const ALT_RB = 110;                  // altura do Rabisco
const GRAV = 1700, V_PULO = 572, VEL = 205, V_SOBE = 150;
const COYOTE = 0.1, BUFFER = 0.14;
const R = 17;                        // raio dos barris
const X_OVELHA = 552, X_ESCADA_TOPO = 380, X_PORTA = 452;
const X_MANCHA = 104;
const ITEM_ALT = 146, ITEM_R = 24;    // o item flutua na altura do pulo: andando por baixo não pega
const TINTA = 0x151515, VIGA = 0xe8413c, ESCADA = 0x00b5f0;
const FONTE_PIXEL = "'Press Start 2P', monospace";
const FONTE = "'Baloo 2', system-ui, sans-serif";

const jogo = criarCasca({
  titulo: "Rabisco e a Arca",
  sub: "Leve os animais até a arca! 🌈",
  faixa: "alfabetizacao",
  cor: "#e8413c",
  pose: "apresentando",
  niveis: FASES.map((f, i) => ({ nome: `${i + 1}`, desc: `${f.nome}` })),
  deitado: true,
  menuNoJogo: false,
  teclado: false,
  musicaFundo: "fase",
  dica: {
    teclado: "Setas ou WASD para andar e subir · Espaço para pular · P para pausar",
    toque: "◀ ▶ para andar · ▲ ▼ nas escadas · ⤒ para pular",
    controle: "Direcional para andar e subir · A para pular · Start para pausar",
  },
  falas: { titulo: "arca-titulo", vitoria: null },
  aoComecar: montar,
  aoSair: destruir,
  aoPausar: soltarEntrada,
  aoControle: lerControle,
});
preCarregarFalas(["arca-inicio", "arca-quase", "arca-porta", "arca-porta-fechada", "arca-pulo", "arca-recomeca", "en-arca-great"]);

// Manchinha de Tinta em SVG (tela de start); no jogo ela é desenhada em desenharManchinha()
const SVG_MANCHA = `<path d="M50 6 C58 22 86 40 86 66 C86 88 70 102 50 102 C30 102 14 88 14 66 C14 42 40 30 50 6 Z" fill="#5b2bb5" stroke="#151515" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="33" cy="50" rx="5" ry="10" fill="#c9b2ff" transform="rotate(20 33 50)"/>
  <ellipse cx="40" cy="66" rx="8" ry="10" fill="#fff" stroke="#151515" stroke-width="3"/><ellipse cx="60" cy="66" rx="8" ry="10" fill="#fff" stroke="#151515" stroke-width="3"/>
  <circle cx="42" cy="68" r="4" fill="#151515"/><circle cx="62" cy="68" r="4" fill="#151515"/>
  <path d="M31 53 L45 57 M69 53 L55 57" stroke="#151515" stroke-width="4" stroke-linecap="round"/>
  <path d="M38 82 Q50 94 62 82" fill="#ff8fbf" stroke="#151515" stroke-width="4" stroke-linecap="round"/>`;

// ------------------------------------------------------------------ Tela de fliperama ("PRESS START")
// Fica por cima da abertura da casca; um toque, clique, tecla ou botão do controle mostra as fases.
const abertura = document.querySelector(".casca-abertura");
let telaStart = null;
if (abertura && !params.has("nivel") && !params.has("jogar")) {
  const bichos = ["🦁", "🐘", "🦒", "🦓", "🐒", "🐰", "🐢", "🐦"].map((e, i) => `<i style="--i:${i}">${e}</i>`).join("");
  telaStart = el("button", { class: "arca-start", type: "button", "aria-label": "Começar: Rabisco e a Arca" });
  telaStart.innerHTML = `
    <span class="arca-start-topo"><b class="pisca">1UP</b><span>00000</span><b>HIGH SCORE</b><span>${String(lerRecorde()).padStart(6, "0")}</span></span>
    <span class="arca-start-titulo"><span>RABISCO</span><small>E A</small><span>ARCA</span></span>
    <span class="arca-start-cena">
      <img src="${RAIZ}/assets/rabisco/poses/apresentando.png" alt="">
      <svg class="arca-start-mancha" viewBox="0 0 100 110" aria-hidden="true">${SVG_MANCHA}</svg>
    </span>
    <span class="arca-start-bichos">${bichos}</span>
    <span class="arca-start-press">PRESS START</span>
    <span class="arca-start-toque">toque para começar</span>
    <span class="arca-start-rodape">© EDUCARTE · ESCOLA CRISTÃ</span>`;
  telaStart.addEventListener("click", fecharStart);
  addEventListener("keydown", (e) => { if (telaStart && !telaStart.hidden && !e.repeat) { e.preventDefault(); fecharStart(); } }, true);
  abertura.append(telaStart);
  setTimeout(() => telaStart?.focus({ preventScroll: true }), 50);
}
function fecharStart() {
  if (!telaStart || telaStart.hidden) return;
  efeitos.destravar();
  sons.destravar();
  efeitos.ficha();
  telaStart.classList.add("saindo");
  setTimeout(() => { if (telaStart) telaStart.hidden = true; abertura?.querySelector(".casca-nivel")?.focus({ preventScroll: true }); }, 380);
}
function lerRecorde() { try { return Number(localStorage.getItem("rabisco-arca-recorde")) || 0; } catch { return 0; } }
function salvarRecorde(v) { try { localStorage.setItem("rabisco-arca-recorde", String(v)); } catch { /* sem armazenamento */ } }

// ------------------------------------------------------------------ Entrada (teclado, controle e toque)
const teclas = new Set();
const toque = { esq: false, dir: false, cima: false, baixo: false, pulo: false };
const pad = { x: 0, y: 0, pulo: false };
let bufferPulo = 0;
const TECLAS_JOGO = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space"];
addEventListener("keydown", (e) => {
  if (jogo.estado !== "jogando" || jogo.pausado || !TECLAS_JOGO.includes(e.code)) return;
  e.preventDefault();
  if (e.code === "Space" && !teclas.has("Space")) bufferPulo = BUFFER;
  teclas.add(e.code);
});
addEventListener("keyup", (e) => teclas.delete(e.code));
addEventListener("blur", soltarEntrada);
function soltarEntrada() {
  teclas.clear();
  Object.assign(toque, { esq: false, dir: false, cima: false, baixo: false, pulo: false });
  Object.assign(pad, { x: 0, y: 0, pulo: false });
  bufferPulo = 0;
}
function lerControle({ segura, apertou, eixoX, eixoY }) {
  pad.x = Math.abs(eixoX) > 0.3 ? eixoX : (segura.dir ? 1 : 0) - (segura.esq ? 1 : 0);
  pad.y = Math.abs(eixoY) > 0.3 ? eixoY : (segura.baixo ? 1 : 0) - (segura.cima ? 1 : 0);
  pad.pulo = segura.pulo;
  if (apertou.pulo) bufferPulo = BUFFER;
}
function entrada() {
  const t = (...cs) => cs.some((c) => teclas.has(c));
  const x = (t("ArrowRight", "KeyD") ? 1 : 0) - (t("ArrowLeft", "KeyA") ? 1 : 0) + (toque.dir ? 1 : 0) - (toque.esq ? 1 : 0) + pad.x;
  const y = (t("ArrowDown", "KeyS") ? 1 : 0) - (t("ArrowUp", "KeyW") ? 1 : 0) + (toque.baixo ? 1 : 0) - (toque.cima ? 1 : 0) + pad.y;
  return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), pulo: teclas.has("Space") || toque.pulo || pad.pulo };
}

// Botões de toque fixos (vários dedos ao mesmo tempo): ◀ ▶ à esquerda; ▲ ▼ e pulo à direita
function criarBotoesToque() {
  const caixa = el("div", { class: "arca-toque" });
  const botao = (nome, texto, rotulo, classe) => {
    const b = el("button", { class: `arca-bt ${classe || ""}`, "aria-label": rotulo, texto, tabindex: "-1" });
    const solta = () => { toque[nome] = false; b.classList.remove("apertado"); };
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try { b.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
      toque[nome] = true;
      b.classList.add("apertado");
      if (nome === "pulo") bufferPulo = BUFFER;
    });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, solta);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
    return b;
  };
  caixa.append(
    el("div", { class: "arca-lado esq" }, [botao("esq", "◀", "Andar para a esquerda"), botao("dir", "▶", "Andar para a direita")]),
    el("div", { class: "arca-lado dir" }, [
      el("div", { class: "arca-coluna" }, [botao("cima", "▲", "Subir a escada"), botao("baixo", "▼", "Descer a escada")]),
      botao("pulo", "⤒", "Pular", "pulo"),
    ]),
  );
  return caixa;
}

// ------------------------------------------------------------------ Montagem da torre de andaimes
const yEm = (s, x) => s.y0 + ((s.y1 - s.y0) * (x - s.x0)) / (s.x1 - s.x0 || 1);
const embaralhar = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function construir(F) {
  const n = F.andares, vao = (CHAO - TOPO) / n;
  // o andar de cima rola para a direita (a Manchinha fica à esquerda) e os de baixo alternam, em zigue-zague
  const dirDe = (i) => ((n - 1 - i) % 2 === 0 ? 1 : -1);
  const segs = [];
  for (let i = 0; i < n; i++) {
    const base = CHAO - i * vao, d = dirDe(i);
    const inc = i > 0 ? F.inclina || 0 : 0;
    const yDe = (x) => base + d * inc * ((x - W / 2) / (W / 2));
    // cada andar deixa a ponta "baixa" livre para o barril cair no andar de baixo
    const ini = i === 0 ? -60 : d === 1 ? 40 : 95;
    const fim = i === 0 ? W + 60 : d === 1 ? 785 : 840;
    segs.push({ x0: ini, x1: fim, y0: yDe(ini), y1: yDe(fim), andar: i, dir: d });
  }
  const topo = { x0: 300, x1: 610, y0: TOPO, y1: TOPO, andar: n, dir: -1, topo: true };
  segs.push(topo);
  const segEm = (andar, x, folga = 0) => segs.find((s) => s.andar === andar && x >= s.x0 - folga && x <= s.x1 + folga);

  const escadas = [];
  const escada = (i, x, extra = {}) => {
    const b = segEm(i, x), t = segEm(i + 1, x);
    if (b && t) escadas.push({ x, yBot: yEm(b, x), yTop: yEm(t, x), de: i, ...extra });
  };
  for (let i = 0; i < n - 1; i++) {
    const k = n - 1 - i;
    escada(i, k % 2 ? 700 : 180);
    const quebrada = Boolean(F.quebradas?.includes(i));
    if (i % 2 === 1 || quebrada) escada(i, 440, { quebrada });
  }
  escada(n - 1, X_ESCADA_TOPO, { final: true, portao: true });
  for (const e of escadas) if (e.quebrada) { const h = e.yBot - e.yTop; e.falta = [e.yTop + h * 0.32, e.yTop + h * 0.6]; }

  // itens: cada alvo num andar (de baixo para cima) + itens "de enfeite" no mesmo andar
  const porAndar = Array.from({ length: n }, () => []);
  F.alvos.forEach((id, k) => porAndar[Math.min(n - 1, Math.floor((k * n) / F.alvos.length))].push(id));
  // enfeites sem repetir na fase (se a lista acabar, repete, mas nunca dois iguais no mesmo andar)
  let sobra = embaralhar(F.outros);
  for (const lista of porAndar) {
    for (let e = 0; e < F.extras; e++) {
      if (!sobra.some((id) => !lista.includes(id))) sobra = embaralhar(F.outros);
      const k = sobra.findIndex((id) => !lista.includes(id));
      if (k >= 0) lista.push(sobra.splice(k, 1)[0]);
    }
  }
  const itens = [];
  porAndar.forEach((lista, andar) => {
    const s = segEm(andar, W / 2), acima = andar < n - 1 ? (x) => yEm(segEm(andar + 1, x) || s, x) : () => TOPO;
    const xsEscada = escadas.filter((e) => e.de === andar || e.de === andar - 1).map((e) => e.x);
    const usados = [];
    for (const id of lista) { // alvos primeiro (garantidos); os enfeites ocupam o espaço que sobra
      for (const x of embaralhar(Array.from({ length: 50 }, (_, k) => 200 + k * 10))) {
        if (x < 200 || x > 690) continue;
        if (andar === n - 1 && (x < 190 || Math.abs(x - X_ESCADA_TOPO) < 50)) continue; // longe da Manchinha e da escada final
        if (xsEscada.some((ex) => Math.abs(ex - x) < 46)) continue;
        if (usados.some((u) => Math.abs(u - x) < 96)) continue;
        const piso = yEm(s, x);
        // abaixo da viga de cima (com folga) e acima da cabeça de quem anda
        const y = Math.max(piso - ITEM_ALT, acima(x) + 13 + ITEM_R + 2);
        if (piso - y < ALT_RB + ITEM_R + 4) continue; // a cabeça de quem anda passa por baixo sem encostar
        usados.push(x);
        itens.push({ id, x, y, andar, pego: false, espera: 0, dica: false });
        break;
      }
    }
  });

  const primeira = escadas.find((e) => e.de === 0 && !e.quebrada);
  const inicioX = primeira && primeira.x > W / 2 ? 70 : 810;
  return { n, vao, segs, topo, segEm, escadas, itens, inicioX, fonte: { x: X_MANCHA + 52, seg: segEm(n - 1, X_MANCHA + 52) } };
}

// ------------------------------------------------------------------ Estado
let F = FASES[0], M = null, game = null, cena = null, nivelAtual = 1, montagem = 0;
let p = null, barris = [], tempo = 0, proxBarril = 0, chances = 3, pontos = 0, bonus = 0, fim = false, recomecou = false;
let alvoIdx = 0, erros = 0, errosNoPedido = 0, proxLembrete = 0, avisoPortao = 0, portaoAberto = false, falouPulo = 0;
let cenaCss = null, pedidoEl = null, VH = H;
const timers = [];
const depois = (ms, f) => timers.push(setTimeout(f, ms));

function novoJogador() {
  const s = M.segEm(0, M.inicioX);
  return { x: M.inicioX, y: yEm(s, M.inicioX), vx: 0, vy: 0, chao: true, seg: s, escada: null, coyote: 0, tonto: 0, invul: 0, pulos: 0, passo: 0 };
}

function montar(n) {
  destruir();
  const minha = ++montagem;
  nivelAtual = n;
  F = FASES[n - 1];
  M = construir(F);
  p = novoJogador();
  barris = []; tempo = 0; proxBarril = 2.6; chances = 3; pontos = 0; fim = false; recomecou = false;
  alvoIdx = 0; erros = 0; errosNoPedido = 0; proxLembrete = 1e9; avisoPortao = 0; portaoAberto = false; falouPulo = 0;
  bonus = 3000 + (n - 1) * 500;
  soltarEntrada();
  if (telaStart) telaStart.hidden = true;

  cenaCss = el("div", { class: `arca-cena tema-${F.tema}` }, [
    el("div", { class: "arca-astro" }),
    el("div", { class: "arca-nuvens", html: "<i></i><i></i><i></i><i></i>" }),
    F.tema === "chuva" ? el("div", { class: "arca-chuva" }) : "",
  ].filter(Boolean));
  const mundo = el("div", { class: "arca-mundo" });
  cenaCss.append(mundo);
  pedidoEl = el("button", { class: "arca-pedido", type: "button", "aria-live": "polite", onclick: () => { if (!fim) pedir(); } });
  jogo.palco.append(cenaCss, pedidoEl, criarBotoesToque());
  atualizarPlacar();
  mostrarPedido();

  // celular deitado: a tela é baixa; mostra só uma parte da torre (câmera acompanha o Rabisco) para tudo ficar maior
  const alt = mundo.getBoundingClientRect().height || innerHeight;
  // altura de mundo visível: ~530 no computador/TV (Rabisco grande) e um pouco menos no celular deitado
  VH = Math.round(Math.max(400, Math.min(530, alt / 0.75)));
  const fontes = Promise.all([document.fonts?.load(`16px ${FONTE_PIXEL}`), document.fonts?.load(`800 16px ${FONTE}`)]).catch(() => {});
  Promise.race([fontes, new Promise((r) => setTimeout(r, 1500))]).then(() => {
    if (minha !== montagem) return;
    game = new Phaser.Game({
      type: Phaser.AUTO, parent: mundo, transparent: true, width: W * Z, height: VH * Z,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { keyboard: false, mouse: false, touch: false, gamepad: false },
      audio: { noAudio: true }, banner: false,
      scene: CenaArca,
    });
  });

  // apresentação: vinheta + "STAGE n", instrução em português e o primeiro pedido em inglês
  efeitos.vinheta();
  const instrucao = F.falaPt;
  depois(2000, () => falar(instrucao));
  duracao(instrucao).then((d) => depois(2000 + d * 1000 + 500, () => { if (minha === montagem && !fim) pedir(); }));
}

// duração de uma fala gravada (para encadear sem cortar a anterior)
const duracoes = new Map();
function duracao(chave) {
  if (!duracoes.has(chave)) {
    duracoes.set(chave, new Promise((r) => {
      const a = new Audio(new URL(`${RAIZ}/assets/voz/${chave}.mp3`, location.href).href);
      a.preload = "metadata";
      const fim = () => r(Number.isFinite(a.duration) ? a.duration : 3);
      a.addEventListener("loadedmetadata", fim, { once: true });
      a.addEventListener("error", () => r(3), { once: true });
      setTimeout(() => r(4), 2500);
    }));
  }
  return duracoes.get(chave);
}

function destruir() {
  montagem++;
  timers.splice(0).forEach(clearTimeout);
  if (game) { try { game.destroy(true); } catch { /* já destruído */ } }
  game = null; cena = null; M = null;
}

// ------------------------------------------------------------------ Placar, pedido em inglês e pontuação
function atualizarPlacar() {
  if (!M) return;
  const vidas = Array.from({ length: 3 }, (_, i) => `<i class="${i < chances ? "" : "vazia"}">♥</i>`).join("");
  jogo.placar(`<span class="arca-1up">1UP</span><b class="arca-pts">${String(pontos).padStart(6, "0")}</b><span class="arca-vidas" aria-label="${chances} vidas">${vidas}</span>`);
  cena?.atualizarManifesto?.();
}

const artigo = (id) => (ITENS[id].tipo === "animal" ? "the " : "");
function textoPedido(id) {
  const d = ITENS[id];
  if (F.modo === "frase") return `<span class="som">🔊</span><span>${FRASES[id]} <em>Who is it?</em></span>`;
  if (d.tipo === "numero") return `<span class="som">🔊</span><span>Find number <b>${d.en}</b>!</span>`;
  return `<span class="som">🔊</span><span>Find ${artigo(id)}<b>${d.en}</b>!</span>`;
}
function mostrarPedido() {
  if (!pedidoEl) return;
  const id = F.alvos[alvoIdx];
  if (alvoIdx >= F.alvos.length) pedidoEl.innerHTML = `<span class="som">🐑</span><span class="pt">Suba até a ovelhinha!</span>`;
  else if (proxLembrete > 1e8) pedidoEl.innerHTML = `<span class="som">🔊</span><span class="pt">Ouça em inglês…</span>`;
  else pedidoEl.innerHTML = textoPedido(id);
  pedidoEl.classList.remove("novo"); void pedidoEl.offsetWidth; pedidoEl.classList.add("novo");
}
// o pedido em inglês (repete sozinho de tempos em tempos)
function pedir() {
  const id = F.alvos[alvoIdx];
  if (!id || !M) return;
  efeitos.chamada();
  falar(F.modo === "frase" ? `en-arca-frase-${id}` : `en-arca-find-${id}`);
  proxLembrete = tempo + 16;
  mostrarPedido();
}

function somar(v, x, y) {
  pontos += v;
  if (x != null) flutuar(`${v}`, x, y, "#ffcc1f");
  atualizarPlacar();
}

// ------------------------------------------------------------------ Rabisco com os membros animados na escada
const suave = (atual, alvo, dt, rapidez) => atual + (alvo - atual) * Math.min(1, dt * rapidez);
class RabiscoArca extends Rabisco {
  // pose montada à mão (escada, susto, festa): braços e pernas vão suavemente até o alvo
  pose(dt, alvo, { rapidez = 14, inclina = 0, troncoY = 0 } = {}) {
    for (const k of ["pf", "pt", "bf", "bt"]) this.ang[k] = suave(this.ang[k], alvo[k] ?? 0, dt, rapidez);
    this.ang.inclina = suave(this.ang.inclina, inclina, dt, rapidez);
    this.pernaFrente.angle = this.ang.pf;
    this.pernaTras.angle = this.ang.pt;
    this.braco.angle = this.ang.bf;
    this.bracoTras.angle = this.ang.bt;
    this.rotation = Phaser.Math.DegToRad(this.ang.inclina);
    this.mola.y = suave(this.mola.y, 0, dt, 12);
    this.tronco.y = suave(this.tronco.y, troncoY, dt, 16);
    this.mochilaVel += ((0 - this.mochilaAng) * 180 - this.mochilaVel * 12) * dt;
    this.mochilaAng += this.mochilaVel * dt;
    this.mochila.angle = this.mochilaAng;
    this.esticaVel += ((1 - this.estica) * 260 - this.esticaVel * 14) * dt;
    this.estica += this.esticaVel * dt;
    this.mola.scaleY = this.estica;
    this.mola.scaleX = 1 / Math.sqrt(this.estica);
    this.noChaoAntes = true;
    this.vyAntes = 0;
  }
  // subindo a escada: um braço alcança o degrau de cima enquanto a perna do outro lado sobe
  escalar(dt, fase) {
    const s = Math.sin(fase);
    this.pose(dt, { bf: 158 + 22 * s, bt: 158 - 22 * s, pf: 18 + 30 * Math.max(0, s), pt: 18 + 30 * Math.max(0, -s) }, { rapidez: 20, troncoY: -Math.abs(s) * 4 });
  }
  susto(dt) { this.pose(dt, { bf: 120, bt: 95, pf: 14, pt: -10 }, { rapidez: 16, inclina: -this.dir * 6 }); }
  festa(dt, t) { const s = Math.sin(t * 9); this.pose(dt, { bf: 165 + 12 * s, bt: 165 - 12 * s, pf: 6 * s, pt: -6 * s }, { rapidez: 14 }); }
}

// ------------------------------------------------------------------ Cena Phaser
class CenaArca extends Phaser.Scene {
  constructor() { super("arca"); }
  preload() {
    carregarRabisco(this, RAIZ);
    this.load.image("arca-logo", `${RAIZ}/assets/marca/logos/azul-icone-rosa.png`);
  }
  create() {
    cena = this;
    const cam = this.cameras.main.setOrigin(0, 0).setZoom(Z);
    cam.scrollY = Math.max(0, Math.min(H - VH, p.y - VH * 0.62));
    criarTexturas(this);
    desenharFundo(this);
    desenharArca(this);
    desenharTorre(this);
    criarManchinha(this);
    this.itensObj = M.itens.map((it) => criarItem(this, it));
    criarOvelha(this);
    criarManifesto(this);
    criarHud(this);
    this.rb = new RabiscoArca(this, p.x, p.y, ALT_RB).setDepth(20);
    this.tontura = [0, 1, 2].map(() => this.add.text(0, 0, "⭐", { fontSize: "14px" }).setOrigin(0.5).setResolution(Z).setDepth(22).setVisible(false));
    this.arco = this.add.graphics().setDepth(0.9);
    // "STAGE n" de fliperama
    const banner = this.add.container(W / 2, VH * 0.42, [
      this.add.text(0, -26, `STAGE ${nivelAtual}`, { fontFamily: FONTE_PIXEL, fontSize: "30px", color: "#ffcc1f", stroke: "#151515", strokeThickness: 8 }).setOrigin(0.5).setResolution(Z),
      this.add.text(0, 22, F.nome.toUpperCase(), { fontFamily: FONTE_PIXEL, fontSize: "18px", color: "#ffffff", stroke: "#151515", strokeThickness: 7 }).setOrigin(0.5).setResolution(Z),
    ]).setDepth(40).setScrollFactor(0);
    this.tweens.add({ targets: banner, alpha: 0, delay: 1900, duration: 400, onComplete: () => banner.destroy() });
  }
  // passos fixos de 1/60 s: o tempo do jogo acompanha o relógio mesmo se o aparelho engasgar
  update() {
    const agora = performance.now();
    const dt = Math.min(0.5, (agora - (this.ult ?? agora)) / 1000);
    this.ult = agora;
    this.acc = (this.acc || 0) + dt;
    while (this.acc >= 1 / 60) { this.acc -= 1 / 60; quadro(this, 1 / 60); }
    if (M && p && this.rb) desenhar(this, Math.min(dt, 0.1));
  }
}

function criarTexturas(s) {
  // barril de madeira visto de lado (rola), com respingos de tinta roxa
  if (!s.textures.exists("arca-barril")) {
    const g = s.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xb8722f).fillCircle(16, 16, 14).lineStyle(3, TINTA).strokeCircle(16, 16, 14);
    g.lineStyle(3, 0x6e3f17).strokeCircle(16, 16, 9);
    g.lineStyle(2, 0x6e3f17).lineBetween(16, 3, 16, 29).lineBetween(3, 16, 29, 16);
    g.fillStyle(0x7a3fd6).fillCircle(9, 9, 5).fillCircle(13, 6, 3).fillCircle(22, 22, 3.5);
    g.fillStyle(0xffffff, 0.5).fillCircle(8, 8, 1.6);
    g.generateTexture("arca-barril", 32, 32);
    g.destroy();
  }
  // gotona de tinta que pula (fases 5 e 6)
  if (!s.textures.exists("arca-gota")) {
    const g = s.make.graphics({ x: 0, y: 0, add: false });
    const pts = gotaPontos(15, 17, 15, 12, 10);
    g.fillStyle(0x6a35c8).fillPoints(pts, true).lineStyle(3, TINTA).strokePoints(pts, true);
    g.fillStyle(0xffffff).fillCircle(12, 19, 3.2).fillCircle(19, 19, 3.2);
    g.fillStyle(TINTA).fillCircle(12.5, 19.5, 1.5).fillCircle(19.5, 19.5, 1.5);
    g.fillStyle(0xc9b2ff).fillEllipse(9, 13, 3, 6);
    g.generateTexture("arca-gota", 32, 34);
    g.destroy();
  }
}

// contorno de uma gota (base redonda, biquinho para cima e um pouco para o lado)
function gotaPontos(cx, cy, rx, ry, bico) {
  const pts = [];
  for (let k = 0; k < 48; k++) {
    const t = (k / 48) * Math.PI * 2;
    let x = cx + rx * Math.sin(t), y = cy + ry * Math.cos(t);
    const c = -Math.cos(t);
    if (c > 0.35) { const f = ((c - 0.35) / 0.65) ** 2; y -= bico * f; x += bico * 0.35 * f - (x - cx) * 0.55 * f; }
    pts.push(new Phaser.Geom.Point(x, y));
  }
  return pts;
}

function desenharFundo(s) {
  const g = s.add.graphics().setDepth(1.6); // na frente do casco da arca
  // chão: grama e terra
  g.fillStyle(0x8a5a2b).fillRect(0, CHAO + 6, W, H - CHAO);
  g.fillStyle(F.tema === "chuva" ? 0x4f9a3a : 0x5cc13a).fillRect(0, CHAO, W, 12);
  g.lineStyle(3, TINTA).lineBetween(0, CHAO, W, CHAO);
  // pedrinhas na terra
  g.fillStyle(0x6e4520);
  for (let x = 20; x < W; x += 47) g.fillEllipse(x, CHAO + 18 + ((x * 7) % 9), 8, 4);
  // placa da Educarte no chão
  const PX = 446;
  g.fillStyle(0x8a5a2b).fillRect(PX - 30, CHAO - 22, 7, 22).fillRect(PX + 23, CHAO - 22, 7, 22);
  g.fillStyle(0xffffff).fillRoundedRect(PX - 56, CHAO - 76, 112, 56, 12).lineStyle(4, TINTA).strokeRoundedRect(PX - 56, CHAO - 76, 112, 56, 12);
  const logo = s.add.image(PX, CHAO - 48, "arca-logo").setDepth(1.7);
  logo.setScale(98 / logo.width);
  // tufos de grama
  g.fillStyle(0x3fae4a);
  for (const x of [150, 300, 590, 730]) g.fillCircle(x, CHAO - 6, 13).fillCircle(x + 14, CHAO - 10, 15).fillCircle(x + 28, CHAO - 5, 11);
}

// Arca em construção atrás dos andaimes: casco de tábuas, casa no alto com a porta e janelinhas
function desenharArca(s) {
  const g = s.add.graphics().setDepth(1);
  const madeira = 0xc98a4b, escura = 0x8f5a2a, clara = 0xe0a868;
  // casco: borda de cima reta, fundo arredondado
  const topoCasco = TOPO + 200, fundo = CHAO - 40, x0 = 26, x1 = W - 26;
  const casco = [];
  for (let k = 0; k <= 40; k++) {
    const x = x0 + ((x1 - x0) * k) / 40, u = (x - W / 2) / ((x1 - x0) / 2);
    casco.push(new Phaser.Geom.Point(x, topoCasco + (fundo - topoCasco) * Math.sqrt(Math.max(0, 1 - u ** 4))));
  }
  casco.push(new Phaser.Geom.Point(x1 + 14, topoCasco - 18), new Phaser.Geom.Point(x0 - 14, topoCasco - 18));
  g.fillStyle(madeira, 0.92).fillPoints(casco, true);
  // tábuas
  g.lineStyle(2, escura, 0.55);
  for (let y = topoCasco + 14; y < fundo; y += 30) {
    const meia = ((x1 - x0) / 2) * (1 - ((y - topoCasco) / (fundo - topoCasco)) ** 2) ** 0.25;
    g.lineBetween(W / 2 - meia, y, W / 2 + meia, y);
  }
  g.lineStyle(4, TINTA, 0.85).strokePoints(casco, true);
  // amurada do convés
  g.fillStyle(escura).fillRect(x0 - 14, topoCasco - 24, x1 - x0 + 28, 10).lineStyle(3, TINTA).strokeRect(x0 - 14, topoCasco - 24, x1 - x0 + 28, 10);
  // casa da arca, do convés até o alto (a porta fica na plataforma do topo)
  const cx0 = 262, cx1 = 642, cTopo = 40;
  g.fillStyle(clara).fillRect(cx0, cTopo, cx1 - cx0, topoCasco - 24 - cTopo);
  g.lineStyle(2, escura, 0.45);
  for (let y = cTopo + 18; y < topoCasco - 24; y += 22) g.lineBetween(cx0, y, cx1, y);
  g.lineStyle(4, TINTA).strokeRect(cx0, cTopo, cx1 - cx0, topoCasco - 24 - cTopo);
  // telhado
  g.fillStyle(0xa8572a).beginPath().moveTo(cx0 - 26, cTopo + 4).lineTo(W / 2 + 12, cTopo - 34).lineTo(cx1 + 26, cTopo + 4).closePath().fillPath();
  g.lineStyle(4, TINTA).beginPath().moveTo(cx0 - 26, cTopo + 4).lineTo(W / 2 + 12, cTopo - 34).lineTo(cx1 + 26, cTopo + 4).closePath().strokePath();
  // janelinhas com animais espiando (aparecem quando entram)
  s.janelas = [];
  for (const [jx, jy] of [[300, TOPO + 70], [372, TOPO + 70], [532, TOPO + 70], [604, TOPO + 70]]) {
    g.fillStyle(0x5a3416).fillRoundedRect(jx - 22, jy - 18, 44, 36, 8).lineStyle(3, TINTA).strokeRoundedRect(jx - 22, jy - 18, 44, 36, 8);
    s.janelas.push({ x: jx, y: jy, ocupada: false });
  }
  // porta da casa (abre quando todos chegaram)
  const porta = s.add.graphics();
  porta.fillStyle(escura).fillRoundedRect(-30, -78, 60, 78, { tl: 26, tr: 26, bl: 0, br: 0 }).lineStyle(4, TINTA).strokeRoundedRect(-30, -78, 60, 78, { tl: 26, tr: 26, bl: 0, br: 0 });
  porta.lineStyle(2, 0x5a3416).lineBetween(-10, -72, -10, 0).lineBetween(10, -72, 10, 0);
  porta.fillStyle(0xffcc1f).fillCircle(18, -36, 4).lineStyle(2, TINTA).strokeCircle(18, -36, 4);
  const vao = s.add.graphics();
  vao.fillStyle(0x2a1607).fillRoundedRect(-30, -78, 60, 78, { tl: 26, tr: 26, bl: 0, br: 0 });
  vao.fillStyle(0xffe9a8, 0.35).fillRoundedRect(-24, -70, 48, 70, { tl: 22, tr: 22, bl: 0, br: 0 });
  vao.setPosition(X_PORTA, TOPO).setDepth(1.1);
  s.porta = porta.setPosition(X_PORTA, TOPO).setDepth(1.2);
  // placa "ARK" de fliperama em cima da porta
  s.add.text(X_PORTA, TOPO - 98, "ARK", { fontFamily: FONTE_PIXEL, fontSize: "14px", color: "#ffcc1f", stroke: "#151515", strokeThickness: 6 }).setOrigin(0.5).setResolution(Z).setDepth(1.3);
}

function desenharTorre(s) {
  const g = s.add.graphics().setDepth(2);
  // escadas (atrás das vigas), azul-claro de fliperama
  for (const e of M.escadas) {
    const trilho = (y0, y1) => {
      for (const [l, cor] of [[7, TINTA], [3.5, e.quebrada ? 0x9fb3c4 : ESCADA]]) {
        g.lineStyle(l, cor).lineBetween(e.x - 12, y0, e.x - 12, y1).lineBetween(e.x + 12, y0, e.x + 12, y1);
      }
      for (let y = y0 + 9; y < y1 - 2; y += 14) {
        g.lineStyle(6, TINTA).lineBetween(e.x - 12, y, e.x + 12, y);
        g.lineStyle(3, e.quebrada ? 0x9fb3c4 : ESCADA).lineBetween(e.x - 11, y, e.x + 11, y);
      }
    };
    if (e.falta) { trilho(e.yTop, e.falta[0]); trilho(e.falta[1], e.yBot); } else trilho(e.yTop, e.yBot);
  }
  // vigas vermelhas com treliça e rebites (o andar 0 é o chão)
  for (const sg of M.segs) {
    if (sg.andar === 0) continue;
    const T = 14, cor = sg.topo ? 0xffcc1f : VIGA;
    const x0 = Math.max(sg.x0, 0), x1 = Math.min(sg.x1, W), ya = yEm(sg, x0), yb = yEm(sg, x1);
    g.fillStyle(cor).beginPath().moveTo(x0, ya).lineTo(x1, yb).lineTo(x1, yb + T).lineTo(x0, ya + T).closePath().fillPath();
    g.fillStyle(0x000000, 0.18).beginPath().moveTo(x0, ya + T - 4).lineTo(x1, yb + T - 4).lineTo(x1, yb + T).lineTo(x0, ya + T).closePath().fillPath();
    g.lineStyle(3, TINTA).beginPath().moveTo(x0, ya).lineTo(x1, yb).lineTo(x1, yb + T).lineTo(x0, ya + T).closePath().strokePath();
    const passos = Math.max(1, Math.round((x1 - x0) / 22));
    g.lineStyle(2, 0xffffff, 0.7);
    for (let k = 0; k < passos; k++) {
      const xa = x0 + ((x1 - x0) * k) / passos, xb = x0 + ((x1 - x0) * (k + 1)) / passos, xm = (xa + xb) / 2;
      g.lineBetween(xa, yEm(sg, xa) + T - 3, xm, yEm(sg, xm) + 3).lineBetween(xm, yEm(sg, xm) + 3, xb, yEm(sg, xb) + T - 3);
    }
    g.fillStyle(0x7a1d1a);
    for (let x = x0 + 8; x < x1 - 4; x += 44) g.fillCircle(x, yEm(sg, x) + T / 2, 1.8);
  }
  // grade do topo
  g.lineStyle(3, TINTA);
  for (let x = 306; x <= 604; x += 22) if (Math.abs(x - X_ESCADA_TOPO) > 16 && Math.abs(x - X_PORTA) > 34) g.lineBetween(x, TOPO, x, TOPO - 18);
  // portãozinho do último lance (abre quando todos os pedidos foram atendidos)
  const e = M.escadas.find((x) => x.final);
  const pg = s.add.graphics();
  pg.fillStyle(0xff7a00).fillRoundedRect(e.x - 19, e.yTop - 34, 38, 34, 5).lineStyle(3, TINTA).strokeRoundedRect(e.x - 19, e.yTop - 34, 38, 34, 5);
  pg.lineStyle(3, TINTA); for (const dx of [-8, 0, 8]) pg.lineBetween(e.x + dx, e.yTop - 30, e.x + dx, e.yTop - 2);
  s.portao = s.add.container(0, 0, [pg, s.add.text(e.x, e.yTop - 47, "🔒", { fontSize: "16px" }).setOrigin(0.5).setResolution(Z)]).setDepth(4);
}

// ------------------------------------------------------------------ Manchinha de Tinta (vilã travessa, nada assustadora)


function criarManchinha(s) {
  const seg = M.segEm(M.n - 1, X_MANCHA);
  const base = yEm(seg, X_MANCHA);
  // pilha de barris ao lado dela
  const pilha = s.add.graphics().setDepth(9);
  const barrilEmPe = (x, y) => {
    pilha.fillStyle(0xb8722f).fillRoundedRect(x - 13, y - 32, 26, 32, 7).lineStyle(3, TINTA).strokeRoundedRect(x - 13, y - 32, 26, 32, 7);
    pilha.lineStyle(3, 0x6e3f17).lineBetween(x - 12, y - 24, x + 12, y - 24).lineBetween(x - 12, y - 8, x + 12, y - 8);
    pilha.fillStyle(0x7a3fd6).fillEllipse(x, y - 31, 20, 6);
  };
  const yb = (x) => yEm(seg, x);
  barrilEmPe(52, yb(52)); barrilEmPe(78, yb(78)); barrilEmPe(65, yb(65) - 32);
  // corpo (redesenhado quando muda de humor: "travessa", "joga" e "feliz")
  const g = s.add.graphics();
  g.setScale(1.35);
  const c = s.add.container(X_MANCHA + 18, base, [g]).setDepth(10);
  s.mancha = { c, g, humor: "", olhar: 1, base };
  desenharManchinha("travessa");
  s.tweens.add({ targets: c, scaleY: 0.94, scaleX: 1.05, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
}
function desenharManchinha(humor, olhar = 1) {
  const m = cena?.mancha;
  if (!m || (m.humor === humor && m.olhar === olhar)) return;
  m.humor = humor; m.olhar = olhar;
  const g = m.g.clear();
  // poça embaixo
  g.fillStyle(0x4a2196).fillEllipse(0, -2, 66, 12);
  const pts = gotaPontos(0, -28, 29, 26, 26);
  g.fillStyle(0x5b2bb5).fillPoints(pts, true).lineStyle(4, TINTA).strokePoints(pts, true);
  g.fillStyle(0xc9b2ff).fillEllipse(-15, -38, 7, 14);
  if (humor === "feliz") {
    g.lineStyle(4, TINTA);
    g.beginPath().arc(-10, -28, 6, Math.PI * 1.1, Math.PI * 1.9).strokePath();
    g.beginPath().arc(10, -28, 6, Math.PI * 1.1, Math.PI * 1.9).strokePath();
    g.fillStyle(0xff8fbf, 0.9).fillCircle(-20, -18, 5).fillCircle(20, -18, 5);
    g.fillStyle(0xff8fbf).beginPath().arc(0, -15, 9, 0, Math.PI).closePath().fillPath();
    g.lineStyle(3, TINTA).beginPath().arc(0, -15, 9, 0, Math.PI).closePath().strokePath();
    return;
  }
  for (const ox of [-10, 10]) {
    g.fillStyle(0xffffff).fillEllipse(ox, -28, 15, 19).lineStyle(3, TINTA).strokeEllipse(ox, -28, 15, 19);
    g.fillStyle(TINTA).fillCircle(ox + 3 * olhar, -26, 4.2);
    g.fillStyle(0xffffff).fillCircle(ox + 3 * olhar + 1.5, -27.5, 1.3);
  }
  // sobrancelhas travessas
  g.lineStyle(4, TINTA).lineBetween(-19, -42, -5, -38).lineBetween(19, -42, 5, -38);
  if (humor === "joga") {
    g.fillStyle(0xff8fbf).fillEllipse(0, -12, 14, 11).lineStyle(3, TINTA).strokeEllipse(0, -12, 14, 11);
  } else {
    g.lineStyle(4, TINTA).beginPath().arc(0, -18, 10, Math.PI * 0.15, Math.PI * 0.85).strokePath();
  }
}

// ------------------------------------------------------------------ Itens (animais, cores e números com o nome em inglês)
function criarItem(s, it) {
  const d = ITENS[it.id];
  const g = s.add.graphics();
  const brilho = s.add.graphics().setVisible(false);
  brilho.fillStyle(0xffe14d, 0.45).fillCircle(0, 0, ITEM_R + 12).fillStyle(0xffe14d, 0.35).fillCircle(0, 0, ITEM_R + 6);
  g.fillStyle(0x000000, 0.18).fillCircle(2, 4, ITEM_R);
  g.fillStyle(0xffffff).fillCircle(0, 0, ITEM_R).lineStyle(4, TINTA).strokeCircle(0, 0, ITEM_R);
  const filhos = [brilho, g];
  if (d.tipo === "animal") {
    filhos.push(s.add.text(0, 1, d.emoji, { fontSize: "28px", padding: { x: 4, y: 4 } }).setOrigin(0.5).setResolution(Z * 1.5));
  } else if (d.tipo === "cor") {
    // gota de tinta da cor, com respingos
    const pts = gotaPontos(0, 4, 14, 13, 11);
    g.fillStyle(d.cor).fillPoints(pts, true).lineStyle(3, TINTA).strokePoints(pts, true);
    g.fillStyle(d.cor).fillCircle(-15, 12, 3.5).fillCircle(15, 9, 3);
    g.fillStyle(0xffffff, 0.75).fillEllipse(-5, 0, 4, 8);
  } else {
    filhos.push(s.add.text(0, 2, String(d.num), { fontFamily: FONTE, fontSize: "32px", fontStyle: "800", color: "#1e7bff", stroke: "#ffffff", strokeThickness: 3 }).setOrigin(0.5).setResolution(Z));
  }
  // plaquinha com o nome em inglês
  const rot = s.add.text(0, ITEM_R + 12, d.en, { fontFamily: FONTE, fontSize: "14px", fontStyle: "800", color: "#151515" }).setOrigin(0.5).setResolution(Z);
  const lw = Math.max(40, rot.width + 14);
  g.fillStyle(0xfff3c4).fillRoundedRect(-lw / 2, ITEM_R + 2, lw, 21, 8).lineStyle(3, TINTA).strokeRoundedRect(-lw / 2, ITEM_R + 2, lw, 21, 8);
  filhos.push(rot);
  const c = s.add.container(it.x, it.y, filhos).setDepth(6);
  c.brilho = brilho;
  return c;
}

function criarOvelha(s) {
  s.ovelha = s.add.text(X_OVELHA, TOPO + 3, "🐑", { fontSize: "52px", padding: { x: 4, y: 4 } }).setOrigin(0.5, 1).setResolution(Z * 1.5).setDepth(8);
  s.balao = s.add.text(X_OVELHA + 28, TOPO - 60, "Baa!", { fontFamily: FONTE, fontSize: "17px", fontStyle: "800", color: "#151515", backgroundColor: "#ffffff", padding: { x: 8, y: 2 } }).setOrigin(0.5).setResolution(Z).setDepth(8);
  s.tweens.add({ targets: s.balao, y: TOPO - 66, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
}

// placa de madeira com os animais/itens que já entraram na arca
function criarManifesto(s) {
  const n = F.alvos.length, larg = n * 38 + 16;
  const x = W - 14 - larg, y = 96; // fixa na tela, embaixo da caixa de BONUS (a Manchinha fica à esquerda)
  const g = s.add.graphics().setDepth(33).setScrollFactor(0);
  g.fillStyle(0x8f5a2a).fillRoundedRect(x, y, larg, 50, 10).lineStyle(4, TINTA).strokeRoundedRect(x, y, larg, 50, 10);
  s.slots = F.alvos.map((id, i) => {
    const sx = x + 27 + i * 38, sy = y + 25;
    g.fillStyle(0x5a3416).fillCircle(sx, sy, 16).lineStyle(2, TINTA).strokeCircle(sx, sy, 16);
    const t = s.add.text(sx, sy + 1, "?", { fontFamily: FONTE_PIXEL, fontSize: "12px", color: "#e0a868" }).setOrigin(0.5).setResolution(Z).setDepth(33.1).setScrollFactor(0);
    return { id, x: sx, y: sy, t, g: null };
  });
  s.atualizarManifesto = () => {
    s.slots.forEach((sl, i) => {
      const feito = i < alvoIdx;
      if (!feito || sl.g || sl.feito) return;
      sl.feito = true;
      const d = ITENS[sl.id];
      sl.t.setText("");
      if (d.tipo === "animal") sl.g = s.add.text(sl.x, sl.y + 1, d.emoji, { fontSize: "20px", padding: { x: 3, y: 3 } }).setOrigin(0.5).setResolution(Z * 1.5).setDepth(33.2).setScrollFactor(0);
      else if (d.tipo === "cor") { sl.g = s.add.graphics().setDepth(33.2).setScrollFactor(0); sl.g.fillStyle(d.cor).fillCircle(sl.x, sl.y, 11).lineStyle(2, TINTA).strokeCircle(sl.x, sl.y, 11); }
      else sl.g = s.add.text(sl.x, sl.y + 1, String(d.num), { fontFamily: FONTE, fontSize: "20px", fontStyle: "800", color: "#ffffff" }).setOrigin(0.5).setResolution(Z).setDepth(33.2).setScrollFactor(0);
      s.tweens.add({ targets: sl.g, scale: { from: 1.8, to: 1 }, duration: 350, ease: "Back.easeOut" });
    });
  };
}

// caixa de BONUS de fliperama (fica fixa no canto da tela)
function criarHud(s) {
  const g = s.add.graphics().setScrollFactor(0).setDepth(35);
  const x = W - 132, y = 14;
  g.fillStyle(0x0b1b4a, 0.92).fillRoundedRect(x, y, 118, 58, 8).lineStyle(4, 0x00b5f0).strokeRoundedRect(x, y, 118, 58, 8);
  s.add.text(x + 59, y + 16, "BONUS", { fontFamily: FONTE_PIXEL, fontSize: "10px", color: "#ff8fbf" }).setOrigin(0.5).setResolution(Z).setScrollFactor(0).setDepth(36);
  s.bonusTxt = s.add.text(x + 59, y + 38, String(bonus), { fontFamily: FONTE_PIXEL, fontSize: "15px", color: "#ffffff" }).setOrigin(0.5).setResolution(Z).setScrollFactor(0).setDepth(36);
  s.add.text(x + 59, y + 70, `L=${String(nivelAtual).padStart(2, "0")}`, { fontFamily: FONTE_PIXEL, fontSize: "10px", color: "#ffcc1f", stroke: "#151515", strokeThickness: 4 }).setOrigin(0.5).setResolution(Z).setScrollFactor(0).setDepth(36);
}

// ------------------------------------------------------------------ Laço do jogo
function quadro(s, dt) {
  if (!M || !p || !s.rb) return;
  if (jogo.estado !== "jogando" || jogo.pausado) return;
  tempo += dt;
  if (fim) { s.festaT = (s.festaT || 0) + dt; return; }
  // bônus de fliperama: desce 100 a cada 2 s (não tem "tempo esgotado": só vale menos pontos)
  const novo = Math.max(0, (3000 + (nivelAtual - 1) * 500) - Math.floor(tempo / 2) * 100);
  if (novo !== bonus) { bonus = novo; s.bonusTxt?.setText(String(bonus)); }
  atualizarJogador(dt);
  atualizarBarris(dt);
  tocarItens();
  if (tempo > proxLembrete && alvoIdx < F.alvos.length) pedir(); // lembra o pedido de tempos em tempos
  if (p.chao && p.seg?.topo && Math.abs(p.x - X_OVELHA) < 46) chegar();
}

function atualizarJogador(dt) {
  const ent = entrada();
  if (p.tonto > 0) { p.tonto -= dt; ent.x = 0; ent.y = 0; bufferPulo = 0; }
  p.invul = Math.max(0, p.invul - dt);
  bufferPulo = Math.max(0, bufferPulo - dt);

  if (p.escada) { subirEscada(p.escada, ent, dt); return; }

  // entrar numa escada: para cima no pé dela ou para baixo no alto dela
  if (p.chao && Math.abs(ent.y) > 0.5) {
    const e = M.escadas.find((e) => Math.abs(e.x - p.x) < 16 && Math.abs(p.y - (ent.y < 0 ? e.yBot : e.yTop)) < 9);
    if (e) {
      p.escada = e; p.x = e.x; p.vx = 0; p.vy = 0; p.chao = false;
      if (ent.y > 0) p.y += 3;
      return;
    }
  }

  p.vx += (ent.x * VEL - p.vx) * Math.min(1, dt * (p.chao ? 14 : 7));
  if (bufferPulo > 0 && (p.chao || p.coyote > 0)) {
    p.vy = -V_PULO; p.chao = false; p.coyote = 0; bufferPulo = 0; p.pulos++;
    p.baseY = p.y; p.maiorPulo = 0;
    sons.pulo();
  }
  if (!ent.pulo && p.vy < -V_PULO * 0.45) p.vy = -V_PULO * 0.45;

  p.x = Math.max(14, Math.min(W - 14, p.x + p.vx * dt));
  const antes = p.y;
  p.vy += GRAV * dt;
  p.y += p.vy * dt;
  if (p.baseY != null) p.maiorPulo = Math.max(p.maiorPulo, p.baseY - p.y);

  let apoio = null;
  if (p.vy >= 0) {
    const de = antes - 10, ate = p.y + (p.chao ? 14 : 1);
    for (const sg of M.segs) {
      if (p.x < sg.x0 - 6 || p.x > sg.x1 + 6) continue;
      const y = yEm(sg, Math.max(sg.x0, Math.min(sg.x1, p.x)));
      if (y >= de && y <= ate && (!apoio || y < apoio.y)) apoio = { sg, y };
    }
  }
  if (apoio) {
    p.y = apoio.y; p.vy = 0; p.chao = true; p.seg = apoio.sg; p.coyote = COYOTE;
  } else {
    if (p.chao) p.coyote = COYOTE;
    p.chao = false; p.seg = null;
    p.coyote = Math.max(0, p.coyote - dt);
  }
  // passinhos de fliperama
  if (p.chao && Math.abs(p.vx) > 40) {
    p.passo += Math.abs(p.vx) * dt;
    if (p.passo > 30) { p.passo = 0; p.pe = !p.pe; efeitos.passo(p.pe); }
  }
  if (p.y > H + 80) Object.assign(p, novoJogador(), { pulos: p.pulos }); // caiu do mundo: volta ao começo, sem castigo
}

function subirEscada(e, ent, dt) {
  p.x = e.x; p.vx = 0;
  const dy = ent.y * V_SOBE * dt;
  p.y += dy;
  p.subiu = (p.subiu || 0) + Math.abs(dy);
  if (Math.abs(dy) > 0 && Math.floor(p.subiu / 14) !== p.degrau) { p.degrau = Math.floor(p.subiu / 14); efeitos.degrau(p.degrau % 2); }
  // escada quebrada: subindo, para no pedaço que falta
  if (e.falta && ent.y < 0 && p.y < e.falta[1] + 2 && p.y > e.falta[0]) {
    p.y = e.falta[1] + 2;
    if (tempo > avisoPortao) { avisoPortao = tempo + 3; jogo.aviso("Escada quebrada! 🔧", "", 1400); sons.erro(); }
  }
  // portãozinho fechado no último lance
  if (e.portao && !portaoAberto && p.y < e.yTop + 40) {
    p.y = e.yTop + 40;
    if (tempo > avisoPortao) { avisoPortao = tempo + 4; jogo.aviso("A porta ainda está fechada! 🔒", "", 1800); falar("arca-porta-fechada"); sons.erro(); }
  }
  if (p.y <= e.yTop) { p.y = e.yTop; sairEscada(e.de + 1); }
  else if (p.y >= e.yBot) { p.y = e.yBot; sairEscada(e.de); }
  if (bufferPulo > 0) bufferPulo = 0; // na escada não se pula (como no clássico)
}
function sairEscada(andar) {
  p.seg = M.segEm(andar, p.x, 2) || M.topo;
  p.escada = null; p.chao = true; p.vy = 0; p.coyote = COYOTE;
}

// ------------------------------------------------------------------ Barris da Manchinha
function novoBarril() {
  const gota = Math.random() < (F.pulam || 0);
  const f = M.fonte;
  const obj = cena.add.image(0, 0, gota ? "arca-gota" : "arca-barril").setDepth(15).setScale(R / 14);
  barris.push({ x: f.x, y: yEm(f.seg, f.x) - R, dir: 1, seg: f.seg, vx: 0, vy: 0, gota, obj, rot: 0, hopT: Math.random(), hop: 0, pontuou: false, escada: null, vistas: new Set() });
  efeitos.arremesso();
}

function atualizarBarris(dt) {
  proxBarril -= dt;
  // a Manchinha se prepara um pouquinho antes de jogar (dá para ver chegando)
  if (proxBarril < 0.45 && !cena.mancha.preparando) {
    cena.mancha.preparando = true;
    desenharManchinha("joga", cena.mancha.olhar);
    cena.tweens.add({ targets: cena.mancha.c, angle: { from: 0, to: -10 }, duration: 380, yoyo: true, ease: "Sine.easeInOut" });
  }
  if (proxBarril <= 0) {
    novoBarril();
    cena.mancha.preparando = false;
    proxBarril = F.intervalo * (0.75 + Math.random() * 0.5);
    setTimeout(() => desenharManchinha("travessa", cena?.mancha?.olhar), 300);
  }
  for (const b of barris) {
    const v = F.vel * (b.gota ? 0.8 : 1);
    if (b.escada) {
      b.y += 80 * dt;
      if (b.y + R >= b.escada.yBot) { const s = M.segEm(b.escada.de, b.x); b.escada = null; if (s) { b.seg = s; b.dir = s.dir; b.y = yEm(s, b.x) - R; } }
    } else if (b.seg) {
      b.x += b.dir * v * dt;
      if (b.x < b.seg.x0 || b.x > b.seg.x1) { b.seg = null; b.vy = 0; b.vx = b.dir * v * 0.55; }
      else {
        b.y = yEm(b.seg, b.x) - R;
        // às vezes o barril desce pela escada, se o Rabisco estiver mais embaixo
        if (F.descem) for (const e of M.escadas) {
          if (e.final || e.de !== b.seg.andar - 1 || b.vistas.has(e) || Math.abs(b.x - e.x) > 4) continue;
          b.vistas.add(e);
          if (Math.random() < F.descem && p.y > b.y + 20) { b.escada = e; b.x = e.x; b.seg = null; }
        }
      }
    } else {
      b.vy += GRAV * 0.8 * dt;
      b.x += b.vx * dt;
      const antes = b.y;
      b.y += b.vy * dt;
      const s = M.segs.find((s) => !s.topo && b.x >= s.x0 && b.x <= s.x1 && yEm(s, b.x) - R >= antes - 1 && yEm(s, b.x) - R <= b.y);
      if (s) { b.seg = s; b.dir = s.dir; b.y = yEm(s, b.x) - R; b.vy = 0; b.hopT = 0; }
    }
    b.rot += (b.dir * v * dt) / R;
    b.hopT += dt;
    b.hop = b.gota && b.seg ? Math.abs(Math.sin(b.hopT * 5.5)) * 26 : 0;
    colidir(b);
  }
  barris = barris.filter((b) => {
    const fora = b.y > H + 60 || b.x < -40 || b.x > W + 40 || b.morta;
    if (fora) b.obj.destroy();
    return !fora;
  });
}

function colidir(b) {
  const cx = b.x, cy = b.y - b.hop;
  if (p.invul <= 0) {
    const nx = Math.max(p.x - 14, Math.min(p.x + 14, cx)), ny = Math.max(p.y - ALT_RB + 12, Math.min(p.y - 3, cy));
    if ((cx - nx) ** 2 + (cy - ny) ** 2 < (R - 3) ** 2) { atingido(b); return; }
  }
  // pulou por cima: pontos
  if (!b.pontuou && !p.chao && !p.escada && Math.abs(cx - p.x) < 18 && cy > p.y && cy - p.y < 120) {
    b.pontuou = true;
    sons.moeda();
    somar(100, p.x, p.y - ALT_RB - 10);
    if (tempo > falouPulo) { falouPulo = tempo + 14; falar("arca-pulo"); }
  }
}

function atingido(b) {
  b.morta = true;
  chances--;
  sons.dano();
  p.tonto = 1.1; p.invul = 2.8;
  if (!p.escada) { p.vx = 0; if (p.vy < 0) p.vy = 0; }
  flutuar("💦", b.x, b.y - 10, "#ffffff");
  atualizarPlacar();
  if (chances > 0) {
    jogo.aviso("Quase! Tente de novo!", "", 1600);
    falar("arca-quase");
    return;
  }
  // acabaram as vidas: recomeça lá de baixo (os animais que já entraram na arca continuam lá)
  jogo.aviso("Vamos de novo! 💪", "", 1800);
  falar("arca-recomeca");
  recomecou = true;
  depois(1200, () => {
    if (!M || fim) return;
    for (const x of barris) x.obj.destroy();
    barris = []; proxBarril = 2;
    chances = 3;
    Object.assign(p, novoJogador(), { pulos: p.pulos, invul: 2 });
    atualizarPlacar();
  });
}

// ------------------------------------------------------------------ Pegar itens (o inglês mora aqui)
function tocarItens() {
  const hx = p.x, hy = p.y - ALT_RB + 8; // cabeça do Rabisco
  M.itens.forEach((it, i) => {
    if (it.pego || tempo < it.espera) return;
    if (alvoIdx < F.alvos.length && proxLembrete > 1e8) return; // espera o pedido em inglês
    const perto = Math.hypot(hx - it.x, hy - it.y) < ITEM_R + 6 || (Math.abs(hx - it.x) < ITEM_R && hy < it.y && p.y > it.y + 10);
    if (!perto) return;
    it.espera = tempo + 2.4;
    if (it.id === F.alvos[alvoIdx]) pegar(it, i);
    else outro(it, i);
  });
}

function outro(it, i) {
  const pedindo = alvoIdx < F.alvos.length;
  if (pedindo) { erros++; errosNoPedido++; }
  efeitos.outro();
  falar(`en-arca-thats-${it.id}`);
  const d = ITENS[it.id];
  jogo.aviso(`That's ${artigo(it.id)}${d.en}!`, "", 1700);
  const o = cena?.itensObj[i];
  if (o) cena.tweens.add({ targets: o, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => { o.angle = 0; } });
  // depois do nome do outro, repete o pedido; na 2ª tentativa errada, o certo brilha de leve
  if (!pedindo) return;
  const alvo = alvoIdx;
  duracao(`en-arca-thats-${it.id}`).then((dur) => depois(dur * 1000 + 350, () => { if (!fim && alvo === alvoIdx && M) pedir(); }));
  if (errosNoPedido >= 2) { const certo = M.itens.find((x) => x.id === F.alvos[alvoIdx] && !x.pego); if (certo) certo.dica = true; }
}

function pegar(it, i) {
  it.pego = true;
  efeitos.pegou();
  falar(`en-arca-yes-${it.id}`);
  somar(300, it.x, it.y - 30);
  errosNoPedido = 0;
  alvoIdx++;
  atualizarPlacar();
  // o item voa até a porta da arca e aparece numa janelinha
  const o = cena?.itensObj[i];
  if (o) {
    o.brilho.setVisible(false);
    cena.tweens.add({ targets: o, y: o.y - 30, duration: 220, ease: "Quad.easeOut", onComplete: () => {
      cena?.tweens.add({ targets: o, x: X_PORTA, y: TOPO - 40, scale: 0.55, duration: 900, ease: "Sine.easeInOut", onComplete: () => {
        o.setVisible(false);
        espiarNaJanela(it.id);
      } });
    } });
  }
  if (alvoIdx < F.alvos.length) {
    proxLembrete = 1e9;
    mostrarPedido();
    duracao(`en-arca-yes-${it.id}`).then((dur) => depois(dur * 1000 + 600, () => { if (!fim && M) pedir(); }));
    return;
  }
  // todos atendidos: a porta da arca abre
  proxLembrete = 1e9;
  depois(1300, () => {
    if (!M || fim) return;
    portaoAberto = true;
    sons.porta();
    mostrarPedido();
    jogo.aviso("A porta abriu! 🚪", "bom", 2000);
    falar("arca-porta");
    if (cena?.portao) cena.tweens.add({ targets: cena.portao, y: -30, alpha: 0, duration: 700 });
    if (cena?.porta) cena.tweens.add({ targets: cena.porta, scaleX: 0.12, x: X_PORTA - 26, duration: 600, ease: "Sine.easeIn" });
  });
}

function espiarNaJanela(id) {
  if (!cena) return;
  const j = cena.janelas.find((x) => !x.ocupada);
  if (!j) return;
  j.ocupada = true;
  const d = ITENS[id];
  let o;
  if (d.tipo === "animal") o = cena.add.text(j.x, j.y + 2, d.emoji, { fontSize: "24px", padding: { x: 3, y: 3 } }).setOrigin(0.5).setResolution(Z * 1.5);
  else if (d.tipo === "cor") { o = cena.add.graphics(); o.fillStyle(d.cor).fillCircle(0, 0, 12).lineStyle(2, TINTA).strokeCircle(0, 0, 12); o.setPosition(j.x, j.y); }
  else o = cena.add.text(j.x, j.y + 2, String(d.num), { fontFamily: FONTE, fontSize: "24px", fontStyle: "800", color: "#ffcc1f" }).setOrigin(0.5).setResolution(Z);
  o.setDepth(1.05);
  cena.tweens.add({ targets: o, y: { from: j.y + 16, to: o.y }, duration: 300, ease: "Back.easeOut" });
}

// ------------------------------------------------------------------ Chegada ao topo: arco-íris e versículo
function chegar() {
  fim = true;
  p.vx = 0;
  efeitos.bee();
  const s = cena;
  const v = VERSICULOS[(nivelAtual - 1) % VERSICULOS.length];
  falar("en-arca-great");
  if (pedidoEl) pedidoEl.innerHTML = `<span class="som">🌈</span><span>All the animals are safe!</span>`;
  jogo.aviso("All the animals are safe! 🌈", "bom", 2200);
  if (s) {
    s.balao.setText("Thank you! 💕");
    s.tweens.add({ targets: s.ovelha, x: p.x + 20, y: p.y - 4, duration: 500, ease: "Back.easeOut" });
    for (let k = 0; k < 10; k++) {
      const c = s.add.text(p.x + (Math.random() - 0.5) * 60, p.y - 30, "❤️", { fontSize: "18px" }).setOrigin(0.5).setResolution(Z).setDepth(25);
      s.tweens.add({ targets: c, y: c.y - 70 - Math.random() * 50, alpha: 0, delay: k * 90, duration: 1100, onComplete: () => c.destroy() });
    }
    // a Manchinha também fica feliz e pede desculpas
    desenharManchinha("feliz");
    const sorry = s.add.text(s.mancha.c.x + 6, s.mancha.base - 112, "Sorry! 💜", { fontFamily: FONTE, fontSize: "15px", fontStyle: "800", color: "#5b2bb5", backgroundColor: "#ffffff", padding: { x: 6, y: 1 } }).setOrigin(0.5).setResolution(Z).setDepth(26).setAlpha(0);
    s.tweens.add({ targets: sorry, alpha: 1, delay: 900, duration: 300 });
    for (const b of barris) s.tweens.add({ targets: b.obj, alpha: 0, scale: 0.2, duration: 400 });
    // arco-íris e a pombinha com o raminho
    depois(700, () => { efeitos.arcoIris(); abrirArcoIris(s); });
    depois(1100, () => voarPomba(s));
  }
  // versículo em inglês na tela e na voz; depois o cartão com o versículo em português
  depois(2600, () => {
    if (!cena) return;
    mostrarVersiculo(cena, v);
    falar(`en-arca-v${nivelAtual}`);
  });
  duracao(`en-arca-v${nivelAtual}`).then((d) => depois(2600 + d * 1000 + 900, vencerFase));
}

function abrirArcoIris(s) {
  const cores = [0xe8413c, 0xff7a00, 0xffcc1f, 0x3fae4a, 0x1e7bff, 0x5b3fd6, 0x8e6cff];
  const cx = W / 2, cy = TOPO + 420, r0 = 410; // atrás da arca: aparece dos dois lados da casa, sobre o casco
  const t0 = performance.now();
  const passo = () => {
    if (!s.arco?.active) return;
    const f = Math.min(1, (performance.now() - t0) / 1500);
    s.arco.clear();
    cores.forEach((c, i) => {
      s.arco.lineStyle(20, c, 0.85).beginPath().arc(cx, cy, r0 - i * 19, Math.PI, Math.PI + Math.PI * f).strokePath();
    });
    if (f < 1) requestAnimationFrame(passo);
  };
  passo();
}

function voarPomba(s) {
  const pomba = s.add.text(-40, 90, "🕊️", { fontSize: "34px", padding: { x: 4, y: 4 } }).setOrigin(0.5).setResolution(Z * 1.5).setDepth(30).setFlipX(true);
  const ramo = s.add.text(-18, 104, "🌿", { fontSize: "16px", padding: { x: 2, y: 2 } }).setOrigin(0.5).setResolution(Z * 1.5).setDepth(30);
  s.tweens.add({ targets: [pomba, ramo], x: `+=${W + 80}`, duration: 4200, ease: "Sine.easeInOut" });
  s.tweens.add({ targets: [pomba, ramo], y: "-=26", duration: 600, yoyo: true, repeat: 3, ease: "Sine.easeInOut" });
}

function mostrarVersiculo(s, v) {
  const y = Math.min(VH, H) * 0.5;
  const txt = s.add.text(W / 2, y, `“${v.en}”`, { fontFamily: FONTE, fontSize: "26px", fontStyle: "800", color: "#151515", align: "center", wordWrap: { width: 600 } }).setOrigin(0.5).setResolution(Z);
  const ref = s.add.text(W / 2, y + txt.height / 2 + 18, v.refEn, { fontFamily: FONTE_PIXEL, fontSize: "11px", color: "#e8413c" }).setOrigin(0.5).setResolution(Z);
  const lw = Math.max(txt.width, ref.width) + 56, lh = txt.height + 64;
  const g = s.add.graphics();
  g.fillStyle(0xffffff, 0.96).fillRoundedRect(W / 2 - lw / 2, y - txt.height / 2 - 20, lw, lh, 22).lineStyle(5, TINTA).strokeRoundedRect(W / 2 - lw / 2, y - txt.height / 2 - 20, lw, lh, 22);
  const caixa = s.add.container(0, 0, [g, txt, ref]).setDepth(45).setScrollFactor(0).setAlpha(0);
  s.tweens.add({ targets: caixa, alpha: 1, duration: 400 });
}

function vencerFase() {
  if (!M || jogo.estado !== "jogando") return;
  const v = VERSICULOS[(nivelAtual - 1) % VERSICULOS.length];
  // o bônus que sobrou entra na pontuação
  pontos += bonus;
  if (pontos > lerRecorde()) salvarRecorde(pontos);
  atualizarPlacar();
  const estrelas = Math.min(3, 1 + (chances === 3 && !recomecou ? 1 : 0) + (erros <= 1 ? 1 : 0));
  const nome = window.Familia?.crianca?.()?.nome;
  const extra = el("div", { class: "arca-versiculo" });
  extra.innerHTML = `
    <p class="pt">“${v.pt}”<small>${v.ref}</small></p>
    <p class="en" lang="en">“${v.en}”<small>${v.refEn}</small></p>
    <span class="arca-pontos"><b>1UP</b> ${String(pontos).padStart(6, "0")} <span>BONUS ${bonus}</span></span>`;
  const ouvir = el("button", { class: "arca-ouvir", type: "button", html: "🔊 English", onclick: () => falar(`en-arca-v${nivelAtual}`) });
  extra.querySelector(".en").append(ouvir);
  if (nivelAtual === FASES.length) jogo.confete();
  jogo.vencer({
    titulo: nivelAtual === FASES.length ? "Todos na arca! 🌈" : "Muito bem!",
    estrelas,
    texto: `${nome ? `${nome}, você` : "Você"} levou todos para a arca!`,
    extra,
    fala: `arca-v${nivelAtual}`,
    proximo: true,
  });
}

function flutuar(texto, x, y, cor) {
  if (!cena) return;
  const t = cena.add.text(x, y, texto, { fontFamily: FONTE_PIXEL, fontSize: "14px", color: cor, stroke: "#151515", strokeThickness: 5 }).setOrigin(0.5).setResolution(Z).setDepth(30);
  cena.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
}

// ------------------------------------------------------------------ Desenho a cada quadro
function desenhar(s, dt) {
  // itens balançando de leve (e brilhando quando a criança precisa de uma ajudinha)
  s.itensObj.forEach((o, i) => {
    const it = M.itens[i];
    if (it.pego) return;
    o.y = it.y + Math.sin(tempo * 2.6 + i) * 3;
    o.brilho.setVisible(it.dica);
    if (it.dica) o.brilho.setScale(1 + 0.12 * Math.sin(tempo * 7));
  });
  for (const b of barris) { b.obj.setPosition(b.x, b.y - b.hop); b.obj.rotation = b.gota ? Math.sin(b.hopT * 11) * 0.2 : b.rot; }
  // a Manchinha olha para o lado do Rabisco
  if (!fim && s.mancha && !s.mancha.preparando) desenharManchinha("travessa", p.x > s.mancha.c.x ? 1 : -1);
  // Rabisco: rig animado (anda, pula) e pose de escada / susto / festa com braços e pernas
  const rb = s.rb;
  rb.x = p.x; rb.y = p.y;
  for (let resto = dt; resto > 1e-4; resto -= 1 / 60) {
    const passo = Math.min(resto, 1 / 60);
    if (fim) {
      rb.festa(passo, tempo);
    } else if (p.escada) rb.escalar(passo, (p.subiu || 0) / 14 * Math.PI);
    else if (p.tonto > 0) rb.susto(passo);
    else rb.atualizar(passo, { vx: p.vx, vy: p.vy, noChao: p.chao, vmax: VEL });
  }
  if (fim) { rb.y = p.y - Math.abs(Math.sin(tempo * 6)) * 14; rb.olhar(p.x < X_OVELHA ? 1 : -1); }
  rb.alpha = p.invul > 0 && !fim && Math.sin(tempo * 30) < 0 ? 0.35 : 1;
  s.tontura.forEach((t, k) => {
    t.setVisible(p.tonto > 0 && !fim);
    const a = tempo * 6 + (k * Math.PI * 2) / 3;
    t.setPosition(p.x + Math.cos(a) * 18, p.y - ALT_RB - 4 + Math.sin(a) * 5);
  });
  if (!fim) s.ovelha.setFlipX(p.x > X_OVELHA);
  // câmera do celular deitado acompanha o Rabisco na vertical
  if (VH < H) {
    const cam = s.cameras.main, alvo = Math.max(0, Math.min(H - VH, (fim ? TOPO : p.y) - VH * 0.62));
    cam.scrollY += (alvo - cam.scrollY) * Math.min(1, dt * 5);
  }
}

// ------------------------------------------------------------------ Teste automático (?teste)
if (TESTE) {
  window.teste = {
    jogo,
    estado() {
      if (!p || !M) return null;
      const andar = p.seg ? p.seg.andar : Math.round((CHAO - p.y) / M.vao);
      return { andar, x: p.x, y: p.y, chances, pegos: alvoIdx, alvo: F.alvos[alvoIdx] || null, erros, pulos: p.pulos, maiorPulo: p.maiorPulo || 0, chao: p.chao, pontos, portaoAberto, escada: Boolean(p.escada), fim, pedindo: proxLembrete < 1e8 };
    },
    mundo: () => M && { andares: M.n, escadas: M.escadas.length, itens: M.itens.map((i) => ({ id: i.id, x: i.x, y: i.y, andar: i.andar, pego: i.pego })), alvos: F.alvos, inicioX: M.inicioX },
    escadas: () => M && M.escadas.map((e) => ({ x: e.x, de: e.de, yBot: e.yBot, yTop: e.yTop, quebrada: Boolean(e.quebrada), final: Boolean(e.final) })),
    pedirAgora() { pedir(); },
    // leva o Rabisco ao andar (no x dado), em pé: atalho do robô de teste
    teleportar(andar, x) {
      if (!p || !M) return false;
      const s = andar >= M.n ? M.topo : M.segEm(andar, x);
      if (!s) return false;
      Object.assign(p, { escada: null, x, y: yEm(s, x), vx: 0, vy: 0, chao: true, seg: s });
      return true;
    },
    // pega o item (certo ou não) pelo id, como se o Rabisco tivesse pulado nele
    tocar(id) { const i = M.itens.findIndex((x) => x.id === id && !x.pego); if (i < 0) return false; const it = M.itens[i]; it.espera = 0; Object.assign(p, { x: it.x, y: it.y + ALT_RB - 8, chao: false, vy: 0, escada: null }); return true; },
    semBarris() { F = { ...F, intervalo: 9999 }; proxBarril = 9999; for (const b of barris) b.morta = true; },
    rabiscoOk: () => Boolean(cena?.rb) && [cena.rb.x, cena.rb.y, cena.rb.mola.scaleX, cena.rb.mola.scaleY, cena.rb.rotation].every(Number.isFinite) && Math.abs(cena.rb.mola.scaleY - 1) < 0.6,
    barris: () => barris.length,
    vh: () => VH,
  };
}
