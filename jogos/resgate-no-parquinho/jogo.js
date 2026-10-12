// Resgate no Parquinho (6 a 8 anos): plataforma vertical no estilo dos clássicos de barris.
// O gatinho da escola subiu no alto dos andaimes da reforma; o Rabisco sobe vigas e escadas para
// resgatá-lo, pulando as bolas e latas de tinta que rolam de andar em andar. No caminho há letras
// (formam uma palavra e abrem o portãozinho do último lance) ou números (pegos na ordem dão estrela).
// A tela inteira cabe sem rolagem: o mundo tem tamanho fixo e o Phaser escala para caber.
// Rabisco 2D oficial (src/motor/rabisco.js, Phaser) e a pose de costas oficial nas escadas.

import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar, preCarregarFalas } from "../../src/motor/voz.js";
import { carregarRabisco, Rabisco } from "../../src/motor/rabisco.js";

const RAIZ = "../..";
const TESTE = new URLSearchParams(location.search).has("teste");

// ------------------------------------------------------------------ Mundo (unidades lógicas)
const W = 880, H = 770, CHAO = 740, TOPO = 120;
const Z = 1.5; // o canvas é 1,5x maior que o mundo para ficar nítido em telas boas
const ALT_RB = 70;               // altura do Rabisco
const GRAV = 1700, V_PULO = 480, VEL = 190, V_SOBE = 120;
const COYOTE = 0.1, BUFFER = 0.14; // pulo "perdoa" quem aperta um pouquinho depois de sair da beira ou antes de pousar
const R = 14;                    // raio das bolas
const X_GATO = 540, X_ESCADA_TOPO = 380;
const TINTA = 0x151515;

// 10 fases: cada uma muda o desenho da torre e acrescenta uma ideia nova
const FASES = [
  { nome: "Primeiro andaime", andares: 3, vel: 60, intervalo: 5.6, coleta: { letras: "GATO" }, tema: "manha", viga: 0xec2e8c },
  { nome: "Rampas", andares: 4, inclina: 16, vel: 74, intervalo: 4.8, coleta: { numeros: 4 }, tema: "manha", viga: 0xff7a00 },
  { nome: "Escada quebrada", andares: 4, quebradas: [1], vel: 78, intervalo: 4.4, coleta: { numeros: 5 }, tema: "tarde", viga: 0x00b5f0, fala: "rg-quebrada" },
  { nome: "Latas de tinta", andares: 5, inclina: 10, latas: 0.5, vel: 82, intervalo: 4.0, coleta: { letras: "BOLA" }, tema: "manha", viga: 0x8e6cff, fala: "rg-latas" },
  { nome: "Carona", andares: 4, movel: 2, vel: 84, intervalo: 4.0, coleta: { letras: "ESCOLA" }, tema: "tarde", viga: 0x1fc08e, fala: "rg-carona" },
  { nome: "Elevadores", andares: 4, elevadores: "duplo", vel: 86, intervalo: 6.4, coleta: { numeros: 5 }, tema: "manha", viga: 0xec2e8c, fala: "rg-elevador" },
  { nome: "Buracos", andares: 5, buracos: true, vel: 92, intervalo: 3.7, coleta: { numeros: 7 }, tema: "tarde", viga: 0xff7a00, fala: "rg-buracos" },
  { nome: "Noite no parquinho", andares: 5, inclina: 12, latas: 0.35, quebradas: [0, 2], descem: 0.25, vel: 106, intervalo: 3.3, coleta: { letras: "LUA" }, tema: "noite", viga: 0x00b5f0, fala: "rg-noite" },
  { nome: "Vento e chuva", andares: 4, vento: true, movel: 2, elevadores: "simples", latas: 0.3, vel: 96, intervalo: 3.5, coleta: { letras: "AMIGO" }, tema: "chuva", viga: 0x8e6cff, fala: "rg-vento" },
  { nome: "O topo da escola", andares: 6, inclina: 10, buracos: true, movel: 3, quebradas: [1], latas: 0.4, descem: 0.3, vel: 112, intervalo: 2.9, coleta: { letras: "AMOR" }, tema: "por-do-sol", viga: 0xec2e8c },
];

const jogo = criarCasca({
  titulo: "Resgate no Parquinho",
  sub: "Suba até o gatinho!",
  faixa: "alfabetizacao",
  cor: "#00B5F0",
  pose: "apresentando",
  niveis: FASES.map((f, i) => ({ nome: `${i + 1}`, desc: f.nome })),
  deitado: true,
  menuNoJogo: false,
  teclado: false,
  musicaFundo: "fase",
  dica: {
    teclado: "Setas ou WASD para andar e subir · Espaço para pular · P para pausar",
    toque: "◀ ▶ para andar · ▲ ▼ nas escadas · ⤒ para pular",
    controle: "Direcional para andar e subir · A para pular · Start para pausar",
  },
  falas: { titulo: "rg-titulo", vitoria: null },
  aoComecar: montar,
  aoSair: destruir,
  aoPausar: soltarEntrada,
  aoControle: lerControle,
});
preCarregarFalas(["rg-inicio", "rg-quase", "rg-resgate", "rg-letras", "rg-numeros", "rg-ordem", "rg-portao", "rg-portao-fechado", "rg-numeros-ok", "rg-fe", "rg-amigo"]);

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

// Botões de toque fixos (melhores que joystick para plataforma 2D): vários dedos ao mesmo tempo
function criarBotoesToque() {
  const caixa = el("div", { class: "rg-toque" });
  const botao = (nome, texto, rotulo, classe) => {
    const b = el("button", { class: `rg-bt ${classe || ""}`, "aria-label": rotulo, texto, tabindex: "-1" });
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
    el("div", { class: "rg-lado esq" }, [botao("esq", "◀", "Andar para a esquerda"), botao("dir", "▶", "Andar para a direita")]),
    el("div", { class: "rg-lado dir" }, [
      el("div", { class: "rg-coluna" }, [botao("cima", "▲", "Subir a escada"), botao("baixo", "▼", "Descer a escada")]),
      botao("pulo", "⤒", "Pular", "pulo"),
    ]),
  );
  return caixa;
}

// ------------------------------------------------------------------ Montagem da torre de cada fase
const yEm = (s, x) => s.y0 + ((s.y1 - s.y0) * (x - s.x0)) / (s.x1 - s.x0 || 1);

function construir(F) {
  const n = F.andares, vao = (CHAO - TOPO) / n;
  // o andar de cima rola para a direita (as bolas nascem à esquerda) e os de baixo alternam, como zigue-zague
  const dirDe = (i) => ((n - 1 - i) % 2 === 0 ? 1 : -1);
  const cortesDe = (i) => {
    const c = [];
    if (F.buracos && i > 0 && i !== F.movel) c.push(i % 2 ? [250, 300] : [560, 610]);
    if (F.movel === i) c.push([330, 550]);
    if (F.elevadores === "duplo" && (i === 1 || i === 2)) c.push([300, 580]);
    return c.sort((a, b) => a[0] - b[0]);
  };
  const segs = [];
  for (let i = 0; i < n; i++) {
    const base = CHAO - i * vao, d = dirDe(i);
    const inc = i > 0 ? F.inclina || 0 : 0;
    const yDe = (x) => base + d * inc * ((x - W / 2) / (W / 2));
    // cada andar deixa a ponta "baixa" livre para a bola cair no andar de baixo
    const ini = i === 0 ? -60 : d === 1 ? 40 : 95;
    const fim = i === 0 ? W + 60 : d === 1 ? 785 : 840;
    let a = ini;
    for (const [c0, c1] of cortesDe(i)) { segs.push({ x0: a, x1: c0, y0: yDe(a), y1: yDe(c0), andar: i, dir: d }); a = c1; }
    segs.push({ x0: a, x1: fim, y0: yDe(a), y1: yDe(fim), andar: i, dir: d });
  }
  const topo = { x0: 300, x1: 600, y0: TOPO, y1: TOPO, andar: n, dir: -1, topo: true };
  segs.push(topo);
  const segEm = (andar, x, folga = 0) => segs.find((s) => s.andar === andar && x >= s.x0 - folga && x <= s.x1 + folga);

  const escadas = [];
  const escada = (i, x, extra = {}) => {
    const b = segEm(i, x), t = segEm(i + 1, x);
    if (b && t) escadas.push({ x, yBot: yEm(b, x), yTop: yEm(t, x), de: i, ...extra });
  };
  for (let i = 0; i < n - 1; i++) {
    const k = n - 1 - i;
    if (F.elevadores === "duplo" && i === 1) continue; // os elevadores ligam o andar 1 ao 2
    if (!(F.elevadores === "simples" && i === 0)) escada(i, k % 2 ? 700 : 180);
    const quebrada = Boolean(F.quebradas?.includes(i));
    if (i % 2 === 1 || quebrada) escada(i, 440, { quebrada });
  }
  escada(n - 1, X_ESCADA_TOPO, { final: true, portao: Boolean(F.coleta.letras) });
  for (const e of escadas) if (e.quebrada) { const h = e.yBot - e.yTop; e.falta = [e.yTop + h * 0.32, e.yTop + h * 0.6]; }

  // plataforma móvel (carona) no vão do meio
  const moveis = [];
  if (F.movel != null) {
    const a = segEm(F.movel, 320), b = segEm(F.movel, 560);
    const y = (yEm(a, 330) + yEm(b, 550)) / 2;
    moveis.push({ a: 330, b: 440, larg: 110, x0: 330, x1: 440, y0: y, y1: y, t: 0, periodo: 4.2, dx: 0, dy: 0, mov: true });
  }
  // elevadores: colunas de plataformas que sobem (dir -1) ou descem (dir 1) e reaparecem do outro lado
  const colunas = [];
  if (F.elevadores === "duplo") {
    const alto = CHAO - 2 * vao - 55;
    colunas.push({ x0: 500, x1: 580, alto, baixo: CHAO - 8, dir: -1, vel: 48, n: 3 });
    colunas.push({ x0: 300, x1: 380, alto, baixo: CHAO - 8, dir: 1, vel: 48, n: 3 });
  } else if (F.elevadores === "simples") {
    colunas.push({ x0: 790, x1: 870, alto: CHAO - vao - 32, baixo: CHAO + 8, dir: -1, vel: 42, n: 2 });
  }
  for (const c of colunas) {
    const passo = (c.baixo - c.alto) / c.n;
    c.plats = Array.from({ length: c.n }, (_, k) => ({ x0: c.x0, x1: c.x1, y0: c.alto + passo * k, y1: c.alto + passo * k, dx: 0, dy: 0, mov: true, col: c }));
  }

  // letras ou números espalhados no caminho, de baixo para cima
  const lista = F.coleta.letras ? [...F.coleta.letras] : Array.from({ length: F.coleta.numeros }, (_, i) => String(i + 1));
  const usados = {};
  const escolherX = (andar) => {
    for (const x of [520, 430, 610, 650, 300, 240]) {
      if (andar === n - 1 && (x < 420 || x > 680)) continue; // no último andar, entre a escada de chegada e a do topo
      const s = segEm(andar, x);
      if (!s || (andar > 0 && (x < s.x0 + 30 || x > s.x1 - 30))) continue;
      if ((usados[andar] || []).some((u) => Math.abs(u - x) < 70)) continue;
      (usados[andar] ||= []).push(x);
      return { x, y: yEm(s, x) - 34 };
    }
    return null;
  };
  const itens = [];
  lista.forEach((v, j) => {
    let andar = Math.floor((j * n) / lista.length), lugar = escolherX(andar);
    while (!lugar && andar < n - 1) lugar = escolherX(++andar);
    if (lugar) itens.push({ v, ...lugar, andar, pego: false });
  });

  const primeira = escadas.find((e) => e.de === 0 && !e.quebrada);
  const inicioX = primeira && primeira.x > W / 2 ? 70 : F.elevadores === "simples" ? 70 : 810;
  return { n, vao, segs, topo, segEm, escadas, moveis, colunas, itens, inicioX, fonte: { x: 72, seg: segEm(n - 1, 72) }, lista };
}

// ------------------------------------------------------------------ Estado
let F = FASES[0], M = null, game = null, cena = null, nivelAtual = 1;
let p = null, bolas = [], tempo = 0, proxBola = 0, chances = 3, pontos = 0, fim = false, recomecou = false;
let proxNumero = 1, avisoOrdem = 0, avisoPortao = 0, portaoAberto = false, falouPulo = 0, cenaCss = null;
const timers = [];
const depois = (ms, f) => timers.push(setTimeout(f, ms));

function novoJogador() {
  const s = M.segEm(0, M.inicioX);
  return { x: M.inicioX, y: yEm(s, M.inicioX), vx: 0, vy: 0, chao: true, seg: s, escada: null, coyote: 0, tonto: 0, invul: 0, pulos: 0 };
}

function montar(n) {
  destruir();
  nivelAtual = n;
  F = FASES[n - 1];
  M = construir(F);
  p = novoJogador();
  bolas = []; tempo = 0; proxBola = 1.6; chances = 3; pontos = 0; fim = false; recomecou = false;
  proxNumero = 1; avisoOrdem = 0; avisoPortao = 0; portaoAberto = !F.coleta.letras; falouPulo = 0;
  soltarEntrada();

  cenaCss = el("div", { class: `rg-cena tema-${F.tema}` }, [
    el("div", { class: "rg-astro" }),
    el("div", { class: "rg-nuvens", html: "<i></i><i></i><i></i>" }),
    el("div", { class: "rg-escola", html: `<div class="telhado"></div><div class="fachada"><div class="janelas">${"<i></i>".repeat(12)}</div><div class="porta"></div></div>` }),
    el("div", { class: "rg-arbustos", html: "<i></i><i></i><i></i><i></i><i></i>" }),
    F.tema === "chuva" ? el("div", { class: "rg-chuva" }) : "",
  ].filter(Boolean));
  const mundo = el("div", { class: "rg-mundo" });
  cenaCss.append(mundo);
  jogo.palco.append(cenaCss, criarBotoesToque());

  game = new Phaser.Game({
    type: Phaser.AUTO, parent: mundo, transparent: true, width: W * Z, height: H * Z,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    audio: { noAudio: true }, banner: false,
    scene: CenaParquinho,
  });
  atualizarPlacar();

  // apresentação da fase: objetivo na tela e na voz (uma fala por vez)
  jogo.aviso(n === 1 ? "Suba até o gatinho! 🐈" : `Fase ${n}: ${F.nome}`, "bom", 2200);
  depois(1700, () => falar(F.fala || "rg-inicio"));
  depois(F.fala ? 5200 : 4300, () => { if (!fim) { falar(F.coleta.letras ? "rg-letras" : "rg-numeros"); jogo.aviso(F.coleta.letras ? `Pegue as letras: ${F.coleta.letras}` : `Pegue 1 a ${F.coleta.numeros} na ordem`, "bom", 2400); } });
}

function destruir() {
  timers.splice(0).forEach(clearTimeout);
  if (game) { try { game.destroy(true); } catch { /* já destruído */ } }
  game = null; cena = null; M = null;
}

function atualizarPlacar() {
  if (!M) return;
  const cor = chances > 0 ? "❤️".repeat(chances) + "🤍".repeat(3 - chances) : "🤍🤍🤍";
  const coleta = F.coleta.letras
    ? M.lista.map((v, i) => `<b class="rg-slot ${M.itens[i]?.pego ? "ok" : ""}">${M.itens[i]?.pego ? v : "_"}</b>`).join("")
    : M.lista.map((v) => `<b class="rg-slot ${Number(v) < proxNumero ? "ok" : ""}">${Number(v) < proxNumero ? v : "_"}</b>`).join("");
  jogo.placar(`<span>${cor}</span><span class="rg-coleta">${coleta}</span><span>⭐ ${pontos}</span>`);
}

// ------------------------------------------------------------------ Cena Phaser (desenho)
class CenaParquinho extends Phaser.Scene {
  constructor() { super("parquinho"); }
  preload() {
    carregarRabisco(this, RAIZ);
    this.load.image("rg-costas", `${RAIZ}/assets/rabisco/poses/costas.png`);
    this.load.image("rg-logo", `${RAIZ}/assets/marca/logos/azul-icone-rosa.png`);
  }
  create() {
    cena = this;
    this.cameras.main.setOrigin(0, 0).setZoom(Z);
    criarTexturas(this);
    desenharFundo(this);
    desenharTorre(this);
    this.dyn = this.add.graphics().setDepth(5);    // plataformas que andam
    this.itensObj = M.itens.map((it) => criarItem(this, it));
    criarGato(this);
    // Rabisco: rig animado andando/pulando e a pose de costas oficial nas escadas
    this.rb = new Rabisco(this, p.x, p.y, ALT_RB).setDepth(20);
    this.costas = this.add.image(p.x, p.y, "rg-costas").setOrigin(0.5, 1).setDepth(20).setVisible(false);
    this.costas.setScale(ALT_RB / this.costas.height);
    this.tontura = [0, 1, 2].map(() => this.add.text(0, 0, "⭐", { fontSize: "14px" }).setOrigin(0.5).setResolution(Z).setDepth(22).setVisible(false));
  }
  // passos fixos de 1/60 s: o tempo do jogo acompanha o relógio mesmo se o aparelho engasgar
  // (relógio próprio: o delta do Phaser é suavizado e "perde" tempo quando o quadro demora)
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
  // latas de tinta (rosa, amarela, ciano) desenhadas uma vez e reaproveitadas
  [0xec2e8c, 0xffcc1f, 0x00b5f0].forEach((cor, i) => {
    if (s.textures.exists(`rg-lata-${i}`)) return;
    const g = s.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xdfe6ee).fillRoundedRect(3, 6, 26, 26, 4).lineStyle(3, TINTA).strokeRoundedRect(3, 6, 26, 26, 4);
    g.fillStyle(cor).fillRect(5, 14, 22, 10);
    g.fillStyle(cor).fillEllipse(16, 7, 24, 7).lineStyle(2, TINTA).strokeEllipse(16, 7, 24, 7);
    g.fillStyle(cor).fillRoundedRect(8, 6, 5, 14, 2).fillRoundedRect(19, 6, 4, 10, 2); // tinta escorrendo
    g.generateTexture(`rg-lata-${i}`, 32, 34);
    g.destroy();
  });
}

const noite = () => F.tema === "noite";

function desenharFundo(s) {
  const g = s.add.graphics().setDepth(0);
  // bandeirinhas da Educarte penduradas dos dois lados do topo
  const cores = [0x00b5f0, 0xec2e8c, 0xffcc1f, 0x1fc08e, 0xff7a00, 0x8e6cff];
  const fio = (xa, ya, xb, yb) => {
    g.lineStyle(2, noite() ? 0xdddddd : TINTA, 0.8).lineBetween(xa, ya, xb, yb);
    const n = Math.floor(Math.hypot(xb - xa, yb - ya) / 30);
    for (let k = 0; k < n; k++) {
      const t0 = (k + 0.15) / n, t1 = (k + 0.85) / n;
      const ax = xa + (xb - xa) * t0, ay = ya + (yb - ya) * t0, bx = xa + (xb - xa) * t1, by = ya + (yb - ya) * t1;
      g.fillStyle(cores[k % cores.length]).fillTriangle(ax, ay, bx, by, (ax + bx) / 2, (ay + by) / 2 + 20);
    }
  };
  fio(0, 30, 290, 80);
  fio(610, 80, W, 30);
  // postes de luz do parquinho (acesos à noite)
  for (const x of [22, W - 22]) {
    g.fillStyle(0x4a5568).fillRect(x - 4, 210, 8, CHAO - 210).lineStyle(2, TINTA).strokeRect(x - 4, 210, 8, CHAO - 210);
    if (noite()) { g.fillStyle(0xfff3a0, 0.25).fillCircle(x, 205, 21).fillStyle(0xfff3a0, 0.12).fillCircle(x, 205, 21); }
    g.fillStyle(noite() ? 0xfff3a0 : 0xffffff).fillCircle(x, 205, 12).lineStyle(3, TINTA).strokeCircle(x, 205, 12);
  }
  // chão do parquinho: grama e terra
  g.fillStyle(0x8a5a2b).fillRect(0, CHAO + 6, W, H - CHAO);
  g.fillStyle(noite() ? 0x2f7a3a : 0x5cc13a).fillRect(0, CHAO, W, 12);
  g.lineStyle(3, TINTA).lineBetween(0, CHAO, W, CHAO);
  // placa da Educarte no chão do parquinho
  const PX = 290; // longe das letras do chão e das escadas
  g.fillStyle(0x8a5a2b).fillRect(PX - 34, CHAO - 26, 8, 26).fillRect(PX + 26, CHAO - 26, 8, 26);
  g.fillStyle(0xffffff).fillRoundedRect(PX - 68, CHAO - 92, 136, 68, 14).lineStyle(4, TINTA).strokeRoundedRect(PX - 68, CHAO - 92, 136, 68, 14);
  const logo = s.add.image(PX, CHAO - 58, "rg-logo").setDepth(1);
  logo.setScale(118 / logo.width);
  // arbustos e cones de obra
  for (const x of [130, 260, 620, 760]) {
    g.fillStyle(noite() ? 0x24683a : 0x3fae4a).fillCircle(x, CHAO - 8, 18).fillCircle(x + 18, CHAO - 14, 20).fillCircle(x + 36, CHAO - 8, 16);
  }
  const cone = (x, y) => {
    g.fillStyle(0xff7a00).fillTriangle(x - 10, y, x + 10, y, x, y - 26).lineStyle(2, TINTA).strokeTriangle(x - 10, y, x + 10, y, x, y - 26);
    g.fillStyle(0xffffff).fillRect(x - 5, y - 14, 10, 4);
    g.fillStyle(0xff7a00).fillRect(x - 13, y - 3, 26, 4);
  };
  cone(380, CHAO); cone(600, CHAO);
  for (const sg of M.segs) if (sg.andar > 0 && !sg.topo && sg.x1 - sg.x0 > 200) cone(sg.dir === 1 ? sg.x1 - 16 : sg.x0 + 16, yEm(sg, sg.dir === 1 ? sg.x1 - 16 : sg.x0 + 16));
  // vento: riscos que passam (desenhados a cada quadro em quadro())
  s.ventoG = F.vento ? s.add.graphics().setDepth(30) : null;
}

function desenharTorre(s) {
  const g = s.add.graphics().setDepth(2);
  // poços dos elevadores
  for (const c of M.colunas) {
    g.fillStyle(0x4a5568, 0.35).fillRect(c.x0, c.alto - 20, c.x1 - c.x0, c.baixo - c.alto + 20);
    g.lineStyle(4, TINTA).lineBetween(c.x0 + 4, c.alto - 20, c.x0 + 4, Math.min(c.baixo, CHAO)).lineBetween(c.x1 - 4, c.alto - 20, c.x1 - 4, Math.min(c.baixo, CHAO));
    g.fillStyle(0xffcc1f).fillRect(c.x0, c.alto - 30, c.x1 - c.x0, 12).lineStyle(3, TINTA).strokeRect(c.x0, c.alto - 30, c.x1 - c.x0, 12);
    const seta = c.dir < 0 ? "▲" : "▼";
    s.add.text((c.x0 + c.x1) / 2, c.alto - 46, seta, { fontSize: "18px", color: "#ffffff", stroke: "#151515", strokeThickness: 4, fontStyle: "bold" }).setOrigin(0.5).setResolution(Z).setDepth(3);
  }
  // escadas (atrás das vigas)
  for (const e of M.escadas) {
    const trilho = (y0, y1) => {
      for (const [l, cor] of [[6, TINTA], [3, e.quebrada ? 0xb0b8c4 : 0xffcc1f]]) {
        g.lineStyle(l, cor).lineBetween(e.x - 11, y0, e.x - 11, y1).lineBetween(e.x + 11, y0, e.x + 11, y1);
      }
      for (let y = y0 + 8; y < y1 - 2; y += 13) {
        g.lineStyle(5, TINTA).lineBetween(e.x - 11, y, e.x + 11, y);
        g.lineStyle(3, e.quebrada ? 0xb0b8c4 : 0xffcc1f).lineBetween(e.x - 10, y, e.x + 10, y);
      }
    };
    if (e.falta) { trilho(e.yTop, e.falta[0]); trilho(e.falta[1], e.yBot); } else trilho(e.yTop, e.yBot);
  }
  // vigas (andaimes): faixa colorida com treliça e rebites
  for (const sg of M.segs) {
    if (sg.andar === 0) continue;
    const T = 13, cor = sg.topo ? 0xffcc1f : F.viga;
    const x0 = Math.max(sg.x0, 0), x1 = Math.min(sg.x1, W), ya = yEm(sg, x0), yb = yEm(sg, x1);
    g.fillStyle(cor).beginPath().moveTo(x0, ya).lineTo(x1, yb).lineTo(x1, yb + T).lineTo(x0, ya + T).closePath().fillPath();
    g.lineStyle(3, TINTA).beginPath().moveTo(x0, ya).lineTo(x1, yb).lineTo(x1, yb + T).lineTo(x0, ya + T).closePath().strokePath();
    const passos = Math.max(1, Math.round((x1 - x0) / 24));
    g.lineStyle(2, 0xffffff, 0.6);
    for (let k = 0; k < passos; k++) {
      const xa = x0 + ((x1 - x0) * k) / passos, xb = x0 + ((x1 - x0) * (k + 1)) / passos, xm = (xa + xb) / 2;
      g.lineBetween(xa, yEm(sg, xa) + T - 3, xm, yEm(sg, xm) + 3).lineBetween(xm, yEm(sg, xm) + 3, xb, yEm(sg, xb) + T - 3);
    }
  }
  // grade de proteção e telhadinho do topo, onde o gatinho está
  g.lineStyle(3, TINTA);
  for (let x = 306; x <= 594; x += 24) if (Math.abs(x - X_ESCADA_TOPO) > 16) g.lineBetween(x, TOPO, x, TOPO - 22);
  g.lineStyle(4, TINTA).lineBetween(300, TOPO - 22, X_ESCADA_TOPO - 16, TOPO - 22).lineBetween(X_ESCADA_TOPO + 16, TOPO - 22, 600, TOPO - 22);
  // cesto de bolas e escorregador de onde as bolas saem
  const f = M.fonte, fy = yEm(f.seg, f.x);
  g.fillStyle(0xffcc1f).beginPath().moveTo(44, fy - 64).lineTo(110, fy - 4).lineTo(110, fy).lineTo(44, fy - 56).closePath().fillPath();
  g.lineStyle(3, TINTA).beginPath().moveTo(44, fy - 64).lineTo(110, fy - 4).lineTo(110, fy).lineTo(44, fy - 56).closePath().strokePath();
  g.fillStyle(0x8a5a2b).fillRoundedRect(16, fy - 96, 44, 36, 8).lineStyle(3, TINTA).strokeRoundedRect(16, fy - 96, 44, 36, 8);
  s.add.text(38, fy - 100, "⚽🏀", { fontSize: "18px" }).setOrigin(0.5, 1).setResolution(Z).setDepth(2);
  // portãozinho do último lance (fases de letras)
  if (!portaoAberto) {
    const e = M.escadas.find((x) => x.final);
    const pg = s.add.graphics().setDepth(4);
    pg.fillStyle(0xff7a00).fillRoundedRect(e.x - 18, e.yTop - 34, 36, 34, 4).lineStyle(3, TINTA).strokeRoundedRect(e.x - 18, e.yTop - 34, 36, 34, 4);
    pg.lineStyle(3, TINTA); for (const dx of [-8, 0, 8]) pg.lineBetween(e.x + dx, e.yTop - 30, e.x + dx, e.yTop - 2);
    s.portao = s.add.container(0, 0, [pg, s.add.text(e.x, e.yTop - 46, "🔒", { fontSize: "16px" }).setOrigin(0.5).setResolution(Z)]).setDepth(4);
  }
}

function criarItem(s, it) {
  const letra = Boolean(F.coleta.letras);
  const g = s.add.graphics();
  g.fillStyle(0xffffff).fillCircle(0, 0, 17).lineStyle(4, TINTA).strokeCircle(0, 0, 17);
  const t = s.add.text(0, 1, it.v, { fontFamily: "'Baloo 2', system-ui, sans-serif", fontSize: "24px", fontStyle: "bold", color: letra ? "#ec2e8c" : "#00a0d8" }).setOrigin(0.5).setResolution(Z);
  return s.add.container(it.x, it.y, [g, t]).setDepth(6);
}

function criarGato(s) {
  s.gato = s.add.text(X_GATO, TOPO + 2, "🐈", { fontSize: "40px" }).setOrigin(0.5, 1).setResolution(Z).setDepth(8);
  s.balao = s.add.text(X_GATO + 30, TOPO - 52, "Miau!", {
    fontFamily: "'Baloo 2', system-ui, sans-serif", fontSize: "18px", fontStyle: "bold", color: "#151515",
    backgroundColor: "#ffffff", padding: { x: 8, y: 2 },
  }).setOrigin(0.5).setResolution(Z).setDepth(8);
  s.tweens.add({ targets: s.balao, y: TOPO - 58, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  s.tweens.add({ targets: s.gato, angle: { from: -4, to: 4 }, duration: 500, yoyo: true, repeat: -1 });
}

// ------------------------------------------------------------------ Laço do jogo
function quadro(s, dt) {
  if (!M || !p || !s.rb) return;
  if (jogo.estado === "jogando" && !jogo.pausado) {
    tempo += dt;
    moverPlataformas(dt);
    if (!fim) {
      atualizarJogador(dt);
      atualizarBolas(dt);
      coletar();
      if (p.chao && p.seg?.topo && Math.abs(p.x - X_GATO) < 50) resgatar();
    }
  }
}

function moverPlataformas(dt) {
  for (const m of M.moveis) {
    m.t += dt;
    const x = m.a + (m.b - m.a) * (0.5 - 0.5 * Math.cos((m.t / m.periodo) * Math.PI * 2));
    m.dx = x - m.x0; m.x0 = x; m.x1 = x + m.larg;
  }
  for (const c of M.colunas) {
    for (const pl of c.plats) {
      let y = pl.y0 + c.dir * c.vel * dt;
      if (c.dir < 0 && y < c.alto) y = c.baixo; // chegou lá em cima: some e volta por baixo
      if (c.dir > 0 && y > c.baixo) y = c.alto;
      pl.dy = y - pl.y0; pl.y0 = pl.y1 = y; pl.dx = 0;
    }
  }
}

// superfícies onde dá para ficar em pé: vigas, plataforma móvel e elevadores
function superficies() {
  const l = [...M.segs, ...M.moveis];
  for (const c of M.colunas) l.push(...c.plats);
  return l;
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

  // andar com aceleração (no ar o controle é um pouco mais solto)
  p.vx += (ent.x * VEL - p.vx) * Math.min(1, dt * (p.chao ? 14 : 7));
  // pulo com buffer e coyote time; soltar o botão cedo faz pulo curto
  if (bufferPulo > 0 && (p.chao || p.coyote > 0)) {
    p.vy = -V_PULO; p.chao = false; p.coyote = 0; bufferPulo = 0; p.pulos++;
    p.baseY = p.y; p.maiorPulo = 0;
    sons.pulo();
  }
  if (!ent.pulo && p.vy < -V_PULO * 0.45) p.vy = -V_PULO * 0.45;

  // carona na plataforma em que está em pé
  if (p.chao && p.seg?.mov) p.x += p.seg.dx;
  p.x = Math.max(14, Math.min(W - 14, p.x + p.vx * dt));
  const antes = p.y;
  p.vy += GRAV * dt;
  p.y += p.vy * dt;
  if (p.baseY != null) p.maiorPulo = Math.max(p.maiorPulo, p.baseY - p.y);

  let apoio = null;
  if (p.vy >= 0) {
    // a superfície mais alta entre onde os pés estavam e onde estão (com folga para grudar em rampas e elevadores)
    const de = antes - 10, ate = p.y + (p.chao ? 14 : 1);
    for (const sg of superficies()) {
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
  if (p.y > H + 80) { Object.assign(p, novoJogador(), { pulos: p.pulos }); } // caiu do mundo: volta ao começo, sem castigo
}

function subirEscada(e, ent, dt) {
  p.x = e.x; p.vx = 0;
  p.y += ent.y * V_SOBE * dt;
  p.subiu = (p.subiu || 0) + Math.abs(ent.y * V_SOBE * dt);
  // escada quebrada: subindo, para no pedaço que falta (só serve para descer)
  if (e.falta && ent.y < 0 && p.y < e.falta[1] + 2 && p.y > e.falta[0]) {
    p.y = e.falta[1] + 2;
    if (tempo > avisoPortao) { avisoPortao = tempo + 3; jogo.aviso("Escada quebrada! 🔧", "", 1400); sons.erro(); }
  }
  // portãozinho fechado no último lance
  if (e.portao && !portaoAberto && p.y < e.yTop + 40) {
    p.y = e.yTop + 40;
    if (tempo > avisoPortao) { avisoPortao = tempo + 4; jogo.aviso("Pegue todas as letras! 🔒", "", 1800); falar("rg-portao-fechado"); sons.erro(); }
  }
  if (p.y <= e.yTop) { p.y = e.yTop; sairEscada(e.de + 1); }
  else if (p.y >= e.yBot) { p.y = e.yBot; sairEscada(e.de); }
  if (bufferPulo > 0) bufferPulo = 0; // na escada não se pula (como no clássico)
}
function sairEscada(andar) {
  p.seg = M.segEm(andar, p.x, 2) || M.topo;
  p.escada = null; p.chao = true; p.vy = 0; p.coyote = COYOTE;
}

function novaBola() {
  const lata = Math.random() < (F.latas || 0);
  const f = M.fonte;
  const obj = lata
    ? cena.add.image(0, 0, `rg-lata-${Math.floor(Math.random() * 3)}`)
    : cena.add.text(0, 0, Math.random() < 0.5 ? "⚽" : "🏀", { fontSize: "26px", padding: { x: 2, y: 2 } }).setOrigin(0.5).setResolution(Z);
  obj.setDepth(15);
  bolas.push({ x: f.x + 16, y: yEm(f.seg, f.x + 16) - R, dir: 1, seg: f.seg, vx: 0, vy: 0, lata, obj, rot: 0, hopT: Math.random(), hop: 0, pontuou: false, escada: null, vistas: new Set() });
}

function atualizarBolas(dt) {
  proxBola -= dt;
  if (proxBola <= 0) { novaBola(); proxBola = F.intervalo * (0.75 + Math.random() * 0.5); }
  // vento: as bolas aceleram e freiam em rajadas
  const fator = F.vento ? 1 + 0.55 * Math.sin(tempo * 0.9) : 1;
  for (const b of bolas) {
    const v = F.vel * (b.lata ? 0.8 : 1) * fator;
    if (b.escada) {
      b.y += 80 * dt;
      if (b.y + R >= b.escada.yBot) { const s = M.segEm(b.escada.de, b.x); b.escada = null; if (s) { b.seg = s; b.dir = s.dir; b.y = yEm(s, b.x) - R; } }
    } else if (b.seg) {
      b.x += b.dir * v * dt;
      if (b.x < b.seg.x0 || b.x > b.seg.x1) { b.seg = null; b.vy = 0; b.vx = b.dir * v * 0.55; }
      else {
        b.y = yEm(b.seg, b.x) - R;
        // às vezes a bola desce pela escada, se o Rabisco estiver mais embaixo
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
    // latas quicam em pulinhos (pular por cima pede outro tempo)
    b.hopT += dt;
    b.hop = b.lata && b.seg ? Math.abs(Math.sin(b.hopT * 5.5)) * 24 : 0;
    colidir(b);
  }
  bolas = bolas.filter((b) => {
    const fora = b.y > H + 60 || b.x < -40 || b.x > W + 40 || b.morta;
    if (fora) b.obj.destroy();
    return !fora;
  });
}

function colidir(b) {
  const cx = b.x, cy = b.y - b.hop;
  if (p.invul <= 0) {
    const nx = Math.max(p.x - 11, Math.min(p.x + 11, cx)), ny = Math.max(p.y - ALT_RB + 12, Math.min(p.y - 3, cy));
    if ((cx - nx) ** 2 + (cy - ny) ** 2 < (R - 3) ** 2) { atingido(b); return; }
  }
  // pulou por cima: pontos
  if (!b.pontuou && !p.chao && !p.escada && Math.abs(cx - p.x) < 14 && cy > p.y && cy - p.y < 90) {
    b.pontuou = true;
    pontos += 100;
    sons.moeda();
    flutuar("+100", p.x, p.y - ALT_RB - 10, "#ffcc1f");
    if (tempo > falouPulo) { falouPulo = tempo + 12; falar("rg-pulo"); }
    atualizarPlacar();
  }
}

function atingido(b) {
  b.morta = true;
  chances--;
  sons.dano();
  p.tonto = 1.1; p.invul = 2.8;
  if (!p.escada) { p.vx = 0; if (p.vy < 0) p.vy = 0; }
  flutuar("💥", b.x, b.y - 10, "#ffffff");
  atualizarPlacar();
  if (chances > 0) {
    jogo.aviso("Quase! Tente de novo!", "", 1600);
    falar("rg-quase");
    return;
  }
  // acabaram as chances: recomeça lá de baixo, com calma e sem drama
  jogo.aviso("Vamos de novo! 💪", "", 1800);
  falar("rg-recomeca");
  recomecou = true;
  depois(1200, () => {
    if (!M || fim) return;
    for (const x of bolas) x.obj.destroy();
    bolas = []; proxBola = 2;
    chances = 3;
    Object.assign(p, novoJogador(), { pulos: p.pulos, invul: 2 });
    atualizarPlacar();
  });
}

function coletar() {
  const numeros = !F.coleta.letras;
  M.itens.forEach((it, i) => {
    if (it.pego || Math.hypot(p.x - it.x, p.y - 30 - it.y) > 34) return;
    if (numeros && Number(it.v) !== proxNumero) {
      if (tempo > avisoOrdem) {
        avisoOrdem = tempo + 2.5;
        sons.erro(); falar("rg-ordem");
        jogo.aviso(`Opa! Antes vem o ${proxNumero}.`, "", 1800);
        cena.tweens.add({ targets: cena.itensObj[i], x: it.x + 6, duration: 60, yoyo: true, repeat: 3 });
      }
      return;
    }
    pegarItem(it, i);
  });
}

function pegarItem(it, i) {
  const numeros = !F.coleta.letras;
  it.pego = true;
  sons.letra();
  if (numeros) proxNumero++;
  falar(numeros ? `rg-n${it.v}` : `letra-${it.v}`);
  const o = cena?.itensObj[i];
  if (o) cena.tweens.add({ targets: o, y: it.y - 40, scale: 1.6, alpha: 0, duration: 600, onComplete: () => o.setVisible(false) });
  atualizarPlacar();
  if (!M.itens.every((x) => x.pego)) return;
  if (numeros) {
    pontos += 300;
    jogo.aviso("Todos na ordem! +⭐", "bom", 2000);
    depois(1000, () => falar("rg-numeros-ok"));
  } else {
    portaoAberto = true;
    sons.porta();
    jogo.aviso(`${F.coleta.letras}! Portão aberto 🔓`, "bom", 2200);
    depois(1000, () => falar(`rg-palavra-${F.coleta.letras.toLowerCase()}`));
    depois(3200, () => { if (!fim) falar("rg-portao"); });
    if (cena?.portao) cena.tweens.add({ targets: cena.portao, y: -30, alpha: 0, duration: 700 });
  }
  atualizarPlacar();
}

function resgatar() {
  fim = true;
  p.vx = 0;
  sons.moeda();
  falar("rg-resgate");
  jogo.aviso("Gatinho salvo! 🐈💕", "bom", 2000);
  const s = cena;
  if (s) {
    s.balao.setText("Obrigado! 💕");
    s.tweens.killTweensOf(s.gato);
    s.gato.angle = 0;
    // o gatinho pula no colo do Rabisco e saem coraçõezinhos
    s.tweens.add({ targets: s.gato, x: p.x + 4, y: p.y - ALT_RB * 0.35, scale: 0.8, duration: 500, ease: "Back.easeOut" });
    for (let k = 0; k < 10; k++) {
      const c = s.add.text(p.x + (Math.random() - 0.5) * 60, p.y - 30, "❤️", { fontSize: "18px" }).setOrigin(0.5).setResolution(Z).setDepth(25);
      s.tweens.add({ targets: c, y: c.y - 70 - Math.random() * 50, alpha: 0, delay: k * 90, duration: 1100, onComplete: () => c.destroy() });
    }
  }
  depois(2300, vencerFase);
}

function vencerFase() {
  const completa = M.itens.every((x) => x.pego);
  const estrelas = Math.min(3, (chances === 3 && !recomecou ? 2 : 1) + (completa ? 1 : 0));
  const nome = window.Familia?.crianca?.()?.nome;
  const muitoBem = nome ? `Muito bem, ${nome}!` : "Muito bem!";
  // toque leve de fé/valores em 1 de cada 3 fases (e sempre no topo da escola)
  const n = nivelAtual;
  let texto = `${muitoBem} O gatinho está salvo.${pontos ? ` ⭐ ${pontos} pontos` : ""}`;
  let fala = null;
  if (n === 10) { texto = "Que bom cuidar dos animais que Deus criou! 🐈💕"; fala = "rg-topo"; }
  else if (n % 3 === 0) { const fe = (n / 3) % 2 === 1; texto = fe ? "Que bom cuidar dos animais que Deus criou!" : "Amigo que ajuda é um presente!"; fala = fe ? "rg-fe" : "rg-amigo"; }
  if (n === 10) jogo.confete();
  jogo.vencer({ titulo: n === 10 ? "Herói do parquinho!" : "Gatinho salvo!", estrelas, texto, fala, proximo: true });
}

function flutuar(texto, x, y, cor) {
  if (!cena) return;
  const t = cena.add.text(x, y, texto, { fontFamily: "'Baloo 2', system-ui, sans-serif", fontSize: "22px", fontStyle: "bold", color: cor, stroke: "#151515", strokeThickness: 5 }).setOrigin(0.5).setResolution(Z).setDepth(30);
  cena.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
}

function desenhar(s, dt) {
  // plataformas que andam
  const g = s.dyn.clear();
  for (const m of M.moveis) {
    g.fillStyle(0xffcc1f).fillRoundedRect(m.x0, m.y0, m.larg, 13, 4).lineStyle(3, TINTA).strokeRoundedRect(m.x0, m.y0, m.larg, 13, 4);
    g.fillStyle(TINTA).fillTriangle(m.x0 + 10, m.y0 + 6.5, m.x0 + 20, m.y0 + 2, m.x0 + 20, m.y0 + 11).fillTriangle(m.x0 + m.larg - 10, m.y0 + 6.5, m.x0 + m.larg - 20, m.y0 + 2, m.x0 + m.larg - 20, m.y0 + 11);
  }
  for (const c of M.colunas) for (const pl of c.plats) {
    g.fillStyle(0x1fc08e).fillRoundedRect(pl.x0 + 2, pl.y0, pl.x1 - pl.x0 - 4, 12, 4).lineStyle(3, TINTA).strokeRoundedRect(pl.x0 + 2, pl.y0, pl.x1 - pl.x0 - 4, 12, 4);
  }
  // itens balançando
  s.itensObj.forEach((o, i) => { if (!M.itens[i].pego) o.y = M.itens[i].y + Math.sin(tempo * 3 + i) * 3; });
  // bolas
  for (const b of bolas) { b.obj.setPosition(b.x, b.y - b.hop); b.obj.rotation = b.lata ? Math.sin(b.hopT * 11) * 0.25 : b.rot; }
  // Rabisco: na escada aparece de costas (pose oficial) balançando a cada degrau
  const rb = s.rb;
  if (p.escada) {
    rb.setVisible(false);
    s.costas.setVisible(true).setPosition(p.x, p.y);
    const esc = ALT_RB / s.costas.height;
    s.costas.setScale(Math.floor((p.subiu || 0) / 13) % 2 ? esc : -esc, esc);
    s.costas.alpha = p.invul > 0 && Math.sin(tempo * 30) < 0 ? 0.35 : 1;
  } else {
    s.costas.setVisible(false);
    rb.setVisible(true);
    rb.x = p.x; rb.y = p.y;
    // passos pequenos: as molas do rig ficam instáveis com quadros longos (aparelho lento)
    for (let resto = dt; resto > 1e-4; resto -= 1 / 60) rb.atualizar(Math.min(resto, 1 / 60), { vx: p.vx, vy: p.vy, noChao: p.chao, vmax: VEL });
    if (p.tonto > 0) rb.rotation += Math.sin(tempo * 14) * 0.18;
    rb.alpha = p.invul > 0 && Math.sin(tempo * 30) < 0 ? 0.35 : 1;
  }
  // estrelinhas de tontura em volta da cabeça
  s.tontura.forEach((t, k) => {
    t.setVisible(p.tonto > 0);
    const a = tempo * 6 + (k * Math.PI * 2) / 3;
    t.setPosition(p.x + Math.cos(a) * 18, p.y - ALT_RB - 4 + Math.sin(a) * 5);
  });
  // gatinho olha para o Rabisco
  if (!fim) s.gato.scaleX = p.x > X_GATO ? -1 : 1;
  // vento: riscos brancos atravessando a tela
  if (s.ventoG) {
    const vg = s.ventoG.clear().lineStyle(2, 0xffffff, 0.55);
    const forca = 0.6 + 0.4 * Math.sin(tempo * 0.9);
    for (let k = 0; k < 9; k++) {
      const x = ((tempo * 420 * forca + k * 137) % (W + 200)) - 100, y = 60 + ((k * 97) % 600);
      vg.lineBetween(x, y, x + 40 + 30 * forca, y + 4);
    }
  }
}

// ------------------------------------------------------------------ Teste automático
if (TESTE) {
  window.teste = {
    jogo,
    estado() {
      if (!p || !M) return null;
      const andar = p.seg ? p.seg.andar : Math.round((CHAO - p.y) / M.vao);
      return { andar, x: p.x, y: p.y, chances, coletados: M.itens.filter((x) => x.pego).length, pulos: p.pulos, maiorPulo: p.maiorPulo || 0, chao: p.chao, pontos };
    },
    subirAoTopo() {
      if (!p || !M) return false;
      Object.assign(p, { escada: null, x: X_GATO - 30, y: TOPO, vx: 0, vy: 0, chao: true, seg: M.topo });
      return true;
    },
    coletarTudo() { M.itens.forEach((it, i) => { if (!it.pego) { if (!F.coleta.letras) proxNumero = Number(it.v); pegarItem(it, i); } }); },
    ir(x) { if (p && !p.escada) { p.x = x; p.vx = 0; } }, // anda direto até x no mesmo andar (bot de teste)
    semBolas() { F = { ...F, intervalo: 9999 }; proxBola = 9999; },
    // o rig do Rabisco está visível e com números válidos (molas não explodiram)
    rabiscoOk: () => Boolean(cena?.rb) && [cena.rb.x, cena.rb.y, cena.rb.mola.scaleX, cena.rb.mola.scaleY, cena.rb.rotation].every(Number.isFinite) && Math.abs(cena.rb.mola.scaleY - 1) < 0.6,
    bolas: () => bolas.length,
    mundo: () => M && { escadas: M.escadas.length, itens: M.itens.length, colunas: M.colunas.length, moveis: M.moveis.length },
  };
}
