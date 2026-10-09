// Super Rabisco: Caça às Letras (4 e 5 anos) — 3D no estilo dos clássicos de plataforma
// Mesma fase da versão 2D (chão de blocos, tijolos, blocos "?", canos, escada, mastro e castelo-escola),
// agora em 3D e com o Rabisco 3D oficial. As "moedas especiais" são letras: juntando todas, a criança
// forma a palavra da figura, desce pelo mastro e chega ao castelo-escola.
// Unidade: 1 = um bloco. Chão em y = 0.

import { THREE, COR3D, carregarTextura, texturaCanvas, aleatorio } from "../../src/motor3d/toon.js";
import {
  blocoMario, chaoMario, cano3D, morroMario, arbustoMario, nuvemMario, mastro3D, castelo3D, onibus3D, moeda3D, bolha3D, borracha3D, manchinha3D,
} from "../../src/motor3d/objetos.js";
import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
import { sons, musica } from "../../src/motor/sons.js";
import { falar, preCarregarFalas } from "../../src/motor/voz.js";
import { criarPausa } from "../../src/motor/pausa.js";
import { ligarControle } from "../../src/motor/controle.js";
import { prepararCelular } from "../../src/motor/celular.js";
import { modoAtual } from "./modos.js";
import { botaoVoltar } from "../../src/motor/voltar.js";

const RAIZ = "../..";
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
// A troca de nível acontece na própria página (sem recarregar): em páginas publicadas recarregar é bloqueado

// O que vai nas bolhas depende do modo (letras, sílabas, frutas ou perguntas): ver modos.js
const MODO = modoAtual();
const NIVEIS = MODO.niveis;
const PALAVRAS_POR_NIVEL = MODO.porNivel; // cada nível é uma sequência de fases
const NOME_FASE = MODO.nome === "letras" || MODO.nome === "silabas" ? "Palavra" : "Fase";

// Lugares possíveis das letras na fase (coluna, altura); a palavra usa tantos quantas letras tiver,
// espalhados do começo ao fim e sempre na ordem da palavra
const LUGARES_LETRA = [
  // todas alcançáveis: andando, com um pulo do chão ou em cima da pirâmide do fim
  [13, 0.9], [16, 0.9], [20, 2.0], [24, 0.9], [30, 0.9], [33, 2.6], [49, 0.9], [54, 2.6],
  [61, 2.0], [66, 2.4], [70, 0.9], [75, 2.6], [79, 2.0], [88, 0.9], [96, 2.4], [103, 4.4],
];

// Física (o Rabisco tem 2,4 blocos de altura, como o "Mario grande")
const GRAVIDADE = 36;
const VEL_PULO = 16.5;
const VEL_CORRIDA = 7.5;
const ALTURA_RABISCO = 2.4;
const LARG_J = 0.8, ALT_J = 2.3;

// ---------- Fase (colunas = blocos; a = altura em blocos acima do chão) ----------
const FASE = {
  inicio: 7,
  blocos: [
    [14, 4, "q"],
    [18, 4, "t"], [19, 4, "q"], [20, 4, "t"], [21, 4, "q"], [22, 4, "t"], [20, 8, "q"],
    [58, 4, "t"], [59, 4, "t"], [60, 4, "q"], [61, 4, "t"], [62, 4, "t"], [63, 4, "t"], [60, 8, "q"],
    [78, 4, "q"], [79, 4, "q"],
  ],
  canos: [[27, 2], [36, 3], [45, 2], [83, 3]],        // [coluna da esquerda, altura]
  // cano 36 leva para a sala secreta; a saída da sala devolve o Rabisco pelo cano 45
  sala: { x0: 300, x1: 322, entrada: 302, saida: 316 },
  moedas: [
    [9, 1], [10, 1], [11, 1], [12, 1],
    [36.5, 4.3], [37.5, 4.3],
    [58, 6], [59, 6], [61, 6], [62, 6], [63, 6],
    [72, 1], [73, 1], [74, 1],
    [101, 2.4], [102, 3.4], [103, 5.6], [104, 3.4], [105, 2.4],
  ],
  // inimigos: [coluna, mínimo, máximo, tipo] — borracha anda; manchinha de tinta pula
  inimigos: [[32, 29, 35, "b"], [51, 47, 55, "m"], [71, 67, 76, "b"], [94, 90, 97, "m"], [56, 47, 57, "b"]],
  piramide: [100, 4],                              // sobe 4 degraus a partir da coluna 100 e desce do outro lado
  mastro: 114,
  castelo: 121,
  fim: 128,
};

// ------------------------------------------------------------------ Render
const renderer = new THREE.WebGLRenderer({ canvas: $("cena"), antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const cena = new THREE.Scene();
cena.fog = new THREE.Fog(0xb8ecff, 70, 190);
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.3, 600);
function ajustarTela() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", ajustarTela);
ajustarTela();

const ceu = new THREE.Mesh(
  new THREE.SphereGeometry(400, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { topo: { value: new THREE.Color(0x3fa6ff) }, horizonte: { value: new THREE.Color(0xc4efff) } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 topo; uniform vec3 horizonte; varying vec3 vP; void main(){ float h = clamp(vP.y*1.8, 0.0, 1.0); gl_FragColor = vec4(mix(horizonte, topo, pow(h,0.7)), 1.0); }",
  }),
);
cena.add(ceu);
const sol = new THREE.DirectionalLight(0xffffff, 2.4);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -24, right: 24, top: 16, bottom: -8, near: 1, far: 90 });
sol.shadow.bias = -0.0005;
sol.shadow.normalBias = 0.03;
cena.add(sol, sol.target, new THREE.HemisphereLight(0xd6f3ff, 0x5aa83a, 1.6));

// ------------------------------------------------------------------ Mundo
const solidos = [];   // { x0, x1, y0, y1, bloco }
const moedas = [];
const letras = [];
const borrachas = [];
let mastro = null, bandeiraCastelo = null, castelo = null;
const MURO_MASTRO = { x0: FASE.mastro - 0.25, x1: FASE.mastro + 0.25, y0: 0, y1: 40, ligado: true };

function construirMundo(tex) {
  const rnd = aleatorio(5);
  const comp = FASE.fim + 22;

  // chão de blocos (2 de altura) e o "fundo" do chão continuando para trás
  const chao = chaoMario(comp, 2, 3);
  chao.position.set(comp / 2 - 12, -1, 0);
  cena.add(chao);
  const campo = new THREE.Mesh(new THREE.PlaneGeometry(700, 300), new THREE.MeshToonMaterial({ color: 0x5cc13a }));
  campo.rotation.x = -Math.PI / 2;
  campo.position.set(60, -0.02, -152);
  cena.add(campo);
  solidos.push({ x0: -12, x1: comp - 12, y0: -2, y1: 0 });
  solidos.push({ x0: -14, x1: 0.2, y0: 0, y1: 40 });                       // parede no começo
  solidos.push({ x0: FASE.fim, x1: FASE.fim + 3, y0: 0, y1: 40 });         // parede no fim
  solidos.push(MURO_MASTRO);

  // fundo: morros, arbustos e nuvens
  [[2, 7, "g"], [16, 4.5, "p"], [30, 7, "g"], [47, 4.5, "p"], [62, 7, "g"], [78, 4.5, "p"], [92, 7, "g"], [108, 4.5, "p"]].forEach(([x, r, t]) => {
    const m = morroMario(r, t === "g" ? 0x5cc13a : 0x79d24f, t === "g" ? 0x3a9227 : 0x4ea533);
    m.position.set(x, 0, -6 - r * 0.6);
    cena.add(m);
  });
  for (const x of [12, 23, 41, 53, 70, 86, 100]) {
    const a = arbustoMario(0.9);
    a.position.set(x, 0, -1.9);
    cena.add(a);
  }
  for (let i = 0; i < 16; i++) {
    const n = nuvemMario(0.8 + rnd() * 0.5);
    n.position.set(-6 + i * 9 + rnd() * 4, 11 + rnd() * 5, -14 - rnd() * 6);
    cena.add(n);
  }

  // ônibus que trouxe o Rabisco
  const bus = onibus3D(tex.logo);
  bus.scale.setScalar(0.5);
  bus.rotation.y = -Math.PI / 2;
  bus.position.set(2.6, 0, -1.6);
  cena.add(bus);

  // blocos "?" e tijolos
  for (const [col, alt, tipo] of FASE.blocos) {
    const b = blocoMario(tipo === "t" ? "tijolo" : "pergunta");
    b.position.set(col + 0.5, alt + 0.5, 0);
    cena.add(b);
    solidos.push({ x0: col, x1: col + 1, y0: alt, y1: alt + 1, bloco: { malha: b, temMoeda: tipo !== "t", tinhaMoeda: tipo !== "t", base: alt + 0.5, empurrao: 0 } });
  }
  // canos (2 blocos de largura)
  for (const [col, alt] of FASE.canos) {
    const c = cano3D(alt);
    c.position.set(col + 1, 0, 0);
    cena.add(c);
    solidos.push({ x0: col, x1: col + 2, y0: 0, y1: alt });
  }
  // pirâmide de blocos duros: degraus dos dois lados (dá para voltar sempre)
  const [ini, alt] = FASE.piramide;
  const alturas = [...Array.from({ length: alt }, (_, i) => i + 1), ...Array.from({ length: alt - 1 }, (_, i) => alt - 1 - i)];
  alturas.forEach((h, i) => {
    for (let k = 0; k < h; k++) {
      const b = blocoMario("duro");
      b.position.set(ini + i + 0.5, k + 0.5, 0);
      cena.add(b);
    }
    solidos.push({ x0: ini + i, x1: ini + i + 1, y0: 0, y1: h });
  });
  const baseMastro = blocoMario("duro");
  baseMastro.position.set(FASE.mastro + 0.5, 0.5, 0);
  cena.add(baseMastro);
  solidos.push({ x0: FASE.mastro, x1: FASE.mastro + 1, y0: 0, y1: 1 });
  mastro = mastro3D(9, tex.icone);
  mastro.position.set(FASE.mastro + 0.5, 1, 0);
  cena.add(mastro);

  // castelo-escola
  castelo = castelo3D(tex.logo);
  castelo.position.set(FASE.castelo, 0, -2.2);
  cena.add(castelo);
  const bc = mastro3D(1.6, tex.icone);
  bc.position.set(FASE.castelo, 5.6, -2.2);
  bc.userData.bandeira.position.y = 0.2;
  bc.visible = false;
  cena.add(bc);
  bandeiraCastelo = bc;

  construirSala();

  // moedas = selos oficiais da Educarte
  const selos = [tex.seloRosa, tex.seloAzul, tex.seloLaranja];
  FASE.moedas.forEach(([col, a], i) => {
    const m = moeda3D(selos[i % 3]);
    m.position.set(col + 0.5, a + 0.5, 0);
    cena.add(m);
    moedas.push({ m, x: col + 0.5, y: a + 0.5, viva: true, fase: i * 0.4 });
  });
}

// Sala secreta (embaixo da terra): tijolos azuis, muitos selos e o cano de volta
const CANOS_ENTRADA = [];
function construirSala() {
  const { x0, x1, entrada, saida } = FASE.sala;
  const larg = x1 - x0;
  const chao = chaoMario(larg, 2, 3, "chaoAzul");
  chao.position.set(x0 + larg / 2, -1, 0);
  cena.add(chao);
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(larg + 40, 40), new THREE.MeshBasicMaterial({ color: 0x0b1030 }));
  fundo.position.set(x0 + larg / 2, 6, -2.5);
  cena.add(fundo);
  for (const [x, w] of [[x0 - 1, 2], [x1 + 1, 2]]) {
    const parede = chaoMario(w, 14, 3, "chaoAzul");
    parede.position.set(x, 7, 0);
    cena.add(parede);
  }
  const teto = chaoMario(larg + 4, 1, 3, "chaoAzul");
  teto.position.set(x0 + larg / 2, 12.5, 0);
  cena.add(teto);
  solidos.push({ x0, x1, y0: -2, y1: 0 }, { x0: x0 - 2, x1: x0, y0: 0, y1: 14 }, { x0: x1, x1: x1 + 2, y0: 0, y1: 14 });
  const deCima = cano3D(2.5);
  deCima.rotation.z = Math.PI;
  deCima.position.set(entrada + 1, 12, 0);
  cena.add(deCima);
  const volta = cano3D(2);
  volta.position.set(saida + 1, 0, 0);
  cena.add(volta);
  solidos.push({ x0: saida, x1: saida + 2, y0: 0, y1: 2 });
  CANOS_ENTRADA.push({ x: saida + 1, topo: 2, destino: { x: 46, topo: 2 } });
  // selos em fileiras (a recompensa da sala)
  for (let lin = 0; lin < 3; lin++) {
    for (let c = 0; c < 9; c++) {
      const x = x0 + 4.5 + c, y = 1.5 + lin * 1.4;
      const m = moeda3D([texturas.seloRosa, texturas.seloAzul, texturas.seloLaranja][(c + lin) % 3]);
      m.position.set(x, y, 0);
      cena.add(m);
      moedas.push({ m, x, y, viva: true, fase: c * 0.3 });
    }
  }
}
CANOS_ENTRADA.push({ x: 37, topo: 3, destino: "sala" });

// Seta "entre aqui" pulando em cima dos canos que levam a algum lugar
const setas = [];
function colocarSetas() {
  const tex = texturaCanvas(128, 128, (c) => {
    c.beginPath(); c.moveTo(64, 116); c.lineTo(18, 60); c.lineTo(44, 60); c.lineTo(44, 12); c.lineTo(84, 12); c.lineTo(84, 60); c.lineTo(110, 60); c.closePath();
    c.fillStyle = "#ffcc1f"; c.fill(); c.lineWidth = 9; c.strokeStyle = "#151515"; c.stroke();
  });
  for (const c of CANOS_ENTRADA) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
    s.scale.setScalar(0.9);
    s.position.set(c.x, c.topo + 3.2, 0.3);
    cena.add(s);
    setas.push({ s, base: c.topo + 3.2 });
  }
}

function colocarLetras(d) {
  const n = d.pecas.length;
  const espalhar = (total) => Array.from({ length: total }, (_, i) => LUGARES_LETRA[Math.round((i * (LUGARES_LETRA.length - 1)) / Math.max(1, total - 1))]);
  const bolha = ([col, a], texto, dados) => {
    const b = bolha3D(texto, { grande: MODO.bolhaGrande });
    b.position.set(col + 0.5, a + 0.5, 0);
    cena.add(b);
    letras.push({ b, x: col + 0.5, y: a + 0.5, viva: true, ...dados });
  };
  if (d.erradas) {
    // perguntas: cada uma tem um grupo de três bolhas lado a lado (uma certa, duas erradas)
    const passo = Math.floor((LUGARES_LETRA.length - 3) / Math.max(1, n - 1));
    d.pecas.forEach((p, i) => {
      const lugares = LUGARES_LETRA.slice(i * passo, i * passo + 3);
      const textos = [{ texto: p.texto, certa: true }, ...d.erradas[i].map((t) => ({ texto: t, certa: false }))].sort(() => Math.random() - 0.5);
      textos.forEach((t, k) => bolha(lugares[k], t.texto, t.certa ? { i } : { i, errada: true }));
    });
    return;
  }
  const extras = d.intrusas || 0;
  const lugares = espalhar(n + extras);
  // as intrusas entram em posições sorteadas; as certas ficam na ordem da palavra
  const posIntrusas = new Set();
  while (posIntrusas.size < extras) posIntrusas.add(1 + Math.floor(Math.random() * (n + extras - 1)));
  const banco = (MODO.banco || []).filter((x) => !d.pecas.some((p) => p.texto === x)).sort(() => Math.random() - 0.5);
  let i = 0;
  lugares.forEach((lugar, k) => {
    if (posIntrusas.has(k)) bolha(lugar, banco.pop(), { i: -1, errada: true });
    else { bolha(lugar, d.pecas[i].texto, { i }); i++; }
  });
}

function colocarBorrachas() {
  for (const [col, min, max, tipo] of FASE.inimigos) {
    const g = tipo === "m" ? manchinha3D() : borracha3D();
    g.scale.setScalar(tipo === "m" ? 1.05 : 1.15);
    g.position.set(col, 0, 0);
    cena.add(g);
    borrachas.push({ g, tipo, x: col, x0: col, y: 0, vy: 0, min, max, dir: -1, viva: true, t: Math.random() * 6, espera: Math.random() * 1.5 });
  }
  if (MODO.semInimigos) tirarInimigos();
}
// Mini: nenhuma borracha na fase
function tirarInimigos() { for (const b of borrachas) { b.viva = false; b.morte = 0; b.g.visible = false; } }

// ------------------------------------------------------------------ Partículas
const texEstrela = texturaCanvas(64, 64, (c) => {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 12 : 28, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  c.closePath(); c.fillStyle = "#ffffff"; c.fill(); c.lineWidth = 4; c.strokeStyle = "#151515"; c.stroke();
});
const particulas = [];
function faiscas(x, y, cor, n) {
  for (let k = 0; k < n; k++) {
    let p = particulas.find((q) => q.vida <= 0);
    if (!p) {
      p = { s: new THREE.Sprite(new THREE.SpriteMaterial({ map: texEstrela, transparent: true, depthWrite: false })) };
      cena.add(p.s);
      particulas.push(p);
    }
    p.s.material.color.set(cor);
    p.s.position.set(x, y, 0.6);
    p.s.visible = true;
    const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 5;
    Object.assign(p, { vx: Math.cos(a) * v, vy: Math.sin(a) * v + 3, vida: 0.7, total: 0.7 });
  }
}
function atualizarParticulas(dt) {
  for (const p of particulas) {
    if (p.vida <= 0) continue;
    p.vida -= dt;
    p.vy -= 18 * dt;
    p.s.position.x += p.vx * dt;
    p.s.position.y += p.vy * dt;
    const f = Math.max(0, p.vida / p.total);
    p.s.scale.setScalar(0.45 * f + 0.1);
    p.s.material.opacity = f;
    if (p.vida <= 0) p.s.visible = false;
  }
}

// ------------------------------------------------------------------ Estado
// abertura | jogando | mastro (descendo) | andando (até o castelo) | vitoria
let estado = "abertura";
let palavra = null;
let desafio = null; // o que a fase pede (ver modos.js)
let nivel = 1;
let sequencia = [], indice = 0; // as palavras do nível, uma depois da outra
let rabisco = null;
const j = { x: FASE.inicio, y: 0, vx: 0, vy: 0, dir: 1, noChao: true, coyote: 0, buffer: 0, invul: 0, empurrao: 0, angulo: 0.35 };
let coletadas = [];
let moedasPegas = 0;
let palavraFeita = false;
let avisoMastroT = 0;
const entrada = { esq: false, dir: false, pulo: false, puloNovo: false, baixo: false };

addEventListener("keydown", (e) => {
  if (["ArrowLeft", "a", "A"].includes(e.key)) entrada.esq = true;
  if (["ArrowRight", "d", "D"].includes(e.key)) entrada.dir = true;
  if (e.key === " ") { // pular: só a barra de espaço
    if (!entrada.pulo) entrada.puloNovo = true;
    entrada.pulo = true;
    e.preventDefault();
  }
  if (["ArrowDown", "s", "S"].includes(e.key)) entrada.baixo = true;
  if (e.key === "Enter" && estado === "abertura") comecar(nivel);
  if (e.key === "m" || e.key === "M") $("som").click();
});
addEventListener("keyup", (e) => {
  if (["ArrowLeft", "a", "A"].includes(e.key)) entrada.esq = false;
  if (["ArrowRight", "d", "D"].includes(e.key)) entrada.dir = false;
  if (e.key === " ") entrada.pulo = false;
  if (["ArrowDown", "s", "S"].includes(e.key)) entrada.baixo = false;
});
prepararCelular({ deitado: true }); // toque, tela cheia e "gire o celular"
// Mini: um botão só — qualquer tecla ou toque na tela faz o Rabisco pular
if (MODO.autoCorre) {
  const pula = () => { if (estado !== "jogando" || pausa.ativa) return; if (!entrada.pulo) entrada.puloNovo = true; entrada.pulo = true; };
  const solta = () => { entrada.pulo = false; };
  addEventListener("keydown", (e) => { if (!e.repeat && !["p", "P", "Escape", "m", "M"].includes(e.key)) pula(); });
  addEventListener("keyup", solta);
  $("cena").addEventListener("pointerdown", pula);
  addEventListener("pointerup", solta);
}

// Abertura de cada modo: título, nomes dos níveis e dicas
document.body.classList.add(`modo-${MODO.nome}`);
document.title = MODO.sub && MODO.nome === "letras" ? `${MODO.titulo}: ${MODO.sub}` : MODO.titulo;
document.querySelector("#abertura h1").textContent = MODO.titulo;
$("abertura").append(botaoVoltar({ raiz: RAIZ, faixa: MODO.faixa }));
document.querySelector("#abertura .sub").textContent = MODO.sub;
for (const b of document.querySelectorAll("[data-nivel]")) {
  const n = NIVEIS[Number(b.dataset.nivel) - 1];
  b.innerHTML = `<b>Nível ${b.dataset.nivel}</b><span>${n.nome}</span>`;
}
$("dica").textContent = MODO.dica.teclado;
document.querySelector("#abertura .so-toque").textContent = MODO.dica.toque;
for (const [id, chave] of [["btn-esq", "esq"], ["btn-dir", "dir"], ["btn-pulo", "pulo"], ["btn-baixo", "baixo"]]) {
  const b = $(id);
  const liga = (e) => { e.preventDefault(); if (chave === "pulo" && !entrada.pulo) entrada.puloNovo = true; entrada[chave] = true; b.classList.add("apertado"); };
  const desliga = (e) => { e.preventDefault(); entrada[chave] = false; b.classList.remove("apertado"); };
  b.addEventListener("pointerdown", liga);
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) b.addEventListener(ev, desliga);
}
$("som").addEventListener("click", () => { $("som").textContent = sons.alternarMudo() ? "🔇" : "🔊"; });
for (const b of document.querySelectorAll("[data-nivel]")) b.addEventListener("click", () => comecar(Number(b.dataset.nivel)));
// Fim de cada palavra: próxima palavra do nível; no fim do nível, próximo nível
$("proximo").addEventListener("click", () => {
  const fimDoNivel = indice >= sequencia.length - 1;
  reiniciar();
  if (fimDoNivel) comecar(Math.min(3, nivel + 1));
  else { indice++; comecar(nivel, null, true); }
});
$("de-novo").addEventListener("click", () => { const p = palavra; reiniciar(); comecar(nivel, p, true); }); // repete a mesma palavra
$("sair").addEventListener("click", () => { if (RAIZ === ".") reiniciar(); else location.href = `${RAIZ}/index.html#/faixa/${MODO.faixa}`; });

function aviso(texto, ms = 2400) {
  const a = $("aviso");
  a.textContent = texto;
  a.classList.add("ativo");
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => a.classList.remove("ativo"), ms);
}

function montarHud() {
  $("figura").textContent = desafio.e;
  // uma casa por peça; o hífen das palavras compostas já vem desenhado
  $("casas").innerHTML = desafio.casas.map((c) => (c === "-" ? `<div class="hifen">-</div>` : `<div class="casa"></div>`)).join("");
  $("casas").classList.toggle("muitas", desafio.pecas.length > 6);
  $("casas").classList.toggle("largas", desafio.pecas.some((p) => [...p.texto].length > 1) && !desafio.emoji);
  $("casas").classList.toggle("respostas", Boolean(desafio.erradas));
  $("nivel-hud").textContent = `Nível ${nivel} · ${indice + 1}/${sequencia.length || PALAVRAS_POR_NIVEL}`;
  mostrarPergunta();
}
// Super Rabisco 2: mostra a primeira pergunta ainda sem resposta
function mostrarPergunta() {
  const el = $("pergunta-sr");
  if (!desafio.perguntas) { el.hidden = true; return; }
  const k = coletadas.indexOf(false);
  el.hidden = k < 0;
  if (k >= 0) el.textContent = desafio.perguntas[k];
}

// Escolhe a palavra do nível e espalha as letras dela pela fase
function prepararPalavra(n, pedida = null) {
  nivel = Math.min(3, Math.max(1, n));
  palavra = pedida ?? NIVEIS[nivel - 1].itens[0];
  desafio = MODO.desafio(palavra);
  coletadas = desafio.pecas.map(() => false);
  preCarregarFalas([MODO.falaNivel(nivel), ...Object.values(desafio.falas), ...desafio.pecas.map((p) => p.voz)].filter(Boolean));
  for (const l of letras) cena.remove(l.b);
  letras.length = 0;
  colocarLetras(desafio);
  montarHud();
  if (MODO.mastroAberto) { palavraFeita = true; MURO_MASTRO.ligado = false; }
}

// Volta tudo para o começo da fase (selos, blocos, inimigos, bandeiras e o Rabisco)
function reiniciar() {
  musica.parar();
  Object.assign(j, { x: FASE.inicio, y: 0, vx: 0, vy: 0, dir: 1, noChao: true, coyote: 0, buffer: 0, invul: 0, empurrao: 0, angulo: 0.35 });
  for (const m of moedas) if (!m.viva) { m.viva = true; cena.add(m.m); }
  for (const s of solidos) if (s.bloco) { s.bloco.temMoeda = s.bloco.tinhaMoeda; if (s.bloco.tinhaMoeda) s.bloco.malha.userData.trocar("pergunta"); }
  for (const b of borrachas) {
    Object.assign(b, { x: b.x0, y: 0, vy: 0, dir: -1, viva: true, morte: 0 });
    b.g.visible = true;
    b.g.position.set(b.x0, 0, 0);
    b.g.scale.setScalar(b.tipo === "m" ? 1.05 : 1.15);
    if (b.tipo === "m") { b.g.userData.corpo.visible = true; b.g.userData.poca.visible = false; }
  }
  if (MODO.semInimigos) tirarInimigos();
  palavraFeita = false;
  MURO_MASTRO.ligado = true;
  mastro.userData.bandeira.position.y = 8.4;
  bandeiraCastelo.visible = false;
  moedasPegas = 0;
  $("n-moedas").textContent = "0";
  estado = "abertura";
  $("vitoria").classList.add("escondido");
  $("hud").classList.add("escondido");
  $("abertura").classList.remove("escondido");
  try {
    const g = JSON.parse(localStorage.getItem(MODO.chave) || "{}");
    for (const b of document.querySelectorAll("[data-nivel]")) b.classList.toggle("feito", Boolean(g[b.dataset.nivel]));
  } catch { /* sem armazenamento */ }
}

let pronto = false, pendente = null;
function novaSequencia(n) {
  const todas = [...NIVEIS[n - 1].itens].sort(() => Math.random() - 0.5);
  sequencia = todas.slice(0, PALAVRAS_POR_NIVEL);
  indice = 0;
}

// Começa o nível n (uma sequência nova de palavras) ou continua a sequência atual (continuar = true)
function comecar(n = nivel, pedida = null, continuar = false) {
  if (!pronto) { pendente = n; return; } // clicou antes de o mundo terminar de carregar: começa assim que ficar pronto
  if (estado !== "abertura") return;
  if (!continuar) novaSequencia(n);
  prepararPalavra(n, pedida ?? sequencia[indice]);
  sons.destravar();
  musica.tocar("fase");
  estado = "jogando";
  $("abertura").classList.add("escondido");
  $("hud").classList.remove("escondido");
  const inicio = desafio.falas.inicio;
  if (indice === 0 && !continuar) {
    falar(MODO.falaNivel(nivel));
    if (inicio) setTimeout(() => falar(inicio), 2600);
  } else if (inicio) setTimeout(() => falar(inicio), 400);
}

// ------------------------------------------------------------------ Física do jogador
const sobrepoe = (a, s) => a.x0 < s.x1 && a.x1 > s.x0 && a.y0 < s.y1 && a.y1 > s.y0;
const caixaJ = () => ({ x0: j.x - LARG_J / 2, x1: j.x + LARG_J / 2, y0: j.y, y1: j.y + ALT_J });
const ativos = () => solidos.filter((s) => s !== MURO_MASTRO || MURO_MASTRO.ligado);

function moverJogador(dt) {
  let direcao = 0, pulou = false, segurando = false;
  if (estado === "jogando") {
    direcao = MODO.autoCorre ? 1 : (entrada.dir ? 1 : 0) - (entrada.esq ? 1 : 0); // Mini: corre sozinho
    pulou = entrada.puloNovo;
    segurando = entrada.pulo;
  } else if (estado === "andando") direcao = 1;
  entrada.puloNovo = false;
  if (["mastro", "vitoria", "abertura", "cano"].includes(estado)) return;
  // em cima de um cano que leva a algum lugar: ↓ entra
  if (estado === "jogando" && j.noChao && entrada.baixo) {
    const c = CANOS_ENTRADA.find((k) => Math.abs(k.x - j.x) < 0.75 && Math.abs(j.y - k.topo) < 0.05);
    if (c) return entrarNoCano(c);
  }

  j.coyote = j.noChao ? 0.1 : j.coyote - dt;
  j.buffer = pulou ? 0.14 : j.buffer - dt;
  if (j.empurrao > 0) j.empurrao -= dt;
  else {
    const alvo = direcao * (estado === "andando" ? VEL_CORRIDA * 0.45 : VEL_CORRIDA * (MODO.velocidade || 1));
    j.vx += (alvo - j.vx) * Math.min(1, dt * (j.noChao ? (direcao ? 14 : 18) : 7));
  }
  if (direcao) j.dir = direcao;
  if (j.buffer > 0 && j.coyote > 0) {
    j.vy = VEL_PULO;
    j.buffer = j.coyote = 0;
    j.quicando = false;
    sons.pulo();
  }
  if (!segurando && j.vy > 7 && !j.quicando && estado === "jogando") j.vy = 7;
  j.vy = Math.max(j.vy - GRAVIDADE * dt, -24);

  j.x += j.vx * dt;
  for (const s of ativos()) {
    if (sobrepoe(caixaJ(), s)) {
      if (s === MURO_MASTRO) avisarMastro();
      if (j.vx > 0) j.x = s.x0 - LARG_J / 2 - 0.001;
      else if (j.vx < 0) j.x = s.x1 + LARG_J / 2 + 0.001;
      j.vx = 0;
    }
  }
  const yAntes = j.y;
  j.y += j.vy * dt;
  j.noChao = false;
  for (const s of ativos()) {
    if (!sobrepoe(caixaJ(), s)) continue;
    if (j.vy <= 0 && yAntes >= s.y1 - 0.08) { j.y = s.y1; j.vy = 0; j.noChao = true; }
    else if (j.vy > 0 && yAntes + ALT_J <= s.y0 + 0.08) { j.y = s.y0 - ALT_J; j.vy = 0; if (s.bloco) baterBloco(s.bloco); }
  }
  if (j.quicando && j.vy <= 0) j.quicando = false;
}

function avisarMastro() {
  if (avisoMastroT > 0 || palavraFeita) return;
  avisoMastroT = 6;
  aviso(MODO.falta);
  falar(MODO.falaFalta);
}

function baterBloco(b) {
  b.empurrao = 0.16;
  sons.bloco();
  if (!b.temMoeda) return;
  b.temMoeda = false;
  b.malha.userData.trocar("usado");
  const m = moeda3D(texturas.seloLaranja);
  m.position.set(b.malha.position.x, b.base + 0.8, 0);
  cena.add(m);
  const ini = performance.now();
  const sobe = () => {
    const t = (performance.now() - ini) / 500;
    m.position.y = b.base + 0.8 + Math.sin(Math.min(t, 1) * Math.PI) * 1.8;
    m.rotation.y = t * 20;
    if (t < 1) requestAnimationFrame(sobe); else cena.remove(m);
  };
  sobe();
  somarMoeda(b.malha.position.x, b.base + 2);
}

function somarMoeda(x, y) {
  moedasPegas++;
  $("n-moedas").textContent = moedasPegas;
  sons.moeda();
  faiscas(x, y, 0xffcc1f, 5);
}

function pegarLetra(l) {
  l.viva = false;
  cena.remove(l.b);
  if (l.errada) {
    // bolha errada: estoura sem castigo, só avisa
    sons.erro();
    faiscas(l.x, l.y, 0x9aa3ad, 10);
    if (desafio.erradas) { aviso("Essa não! Tente outra bolha", 1800); falar("sr2-erro"); }
    else { aviso("Essa sílaba não é da palavra!", 1800); falar("sil-intrusa"); }
    return;
  }
  coletadas[l.i] = true;
  const peca = desafio.pecas[l.i];
  sons.letra();
  if (peca.voz) setTimeout(() => falar(peca.voz), 280);
  faiscas(l.x, l.y, 0xec2e8c, 14);
  // perguntas: as outras bolhas do grupo somem junto
  if (desafio.erradas) for (const o of letras) if (o.viva && o.i === l.i) { o.viva = false; cena.remove(o.b); faiscas(o.x, o.y, 0x9aa3ad, 6); }
  const casa = $("casas").querySelectorAll(".casa")[l.i];
  casa.textContent = peca.texto;
  casa.classList.add("cheia");
  mostrarPergunta();
  if (coletadas.every(Boolean)) {
    palavraFeita = true;
    MURO_MASTRO.ligado = false;
    sons.porta();
    if (desafio.falas.completa) setTimeout(() => falar(desafio.falas.completa), MODO.autoCorre ? 900 : 2000);
    if (!MODO.mastroAberto) aviso(`${desafio.erradas ? "Muito bem" : desafio.rotulo}!  Corra até o mastro ➜`, 3000);
  }
}

function tocarBorracha(b) {
  if (j.vy < -1 && j.y > b.y + 0.5) {
    b.viva = false;
    b.morte = b.tipo === "m" ? 1.2 : 0.5;
    sons.pisao();
    faiscas(b.x, b.y + 0.7, b.tipo === "m" ? 0x7c4dff : 0xffcc1f, 10);
    if (b.tipo === "m") { b.g.userData.poca.visible = true; b.g.userData.corpo.visible = false; b.g.position.y = 0; }
    j.vy = 11;
    j.quicando = true;
    return;
  }
  if (j.invul > 0) return;
  j.invul = 1.4;
  sons.dano();
  const lado = Math.sign(j.x - b.x) || 1;
  j.vx = lado * 8;
  j.vy = 8;
  j.empurrao = 0.3;
}

// ------------------------------------------------------------------ Canos: entra em um, sai em outro
let canoAnim = null; // { fase: "desce" | "sobe", t, de, ate, depois }
let salaVisitada = false;
function entrarNoCano(c) {
  estado = "cano";
  sons.cano();
  j.vx = j.vy = 0;
  j.x = c.x;
  canoAnim = { fase: "desce", t: 0, de: c.topo, ate: c.topo - ALT_J - 0.3, depois: c.destino };
}
function atualizarCano(dt) {
  const a = canoAnim;
  a.t += dt;
  const k = Math.min(1, a.t / 0.9);
  j.y = a.de + (a.ate - a.de) * k;
  if (k < 1) return;
  if (a.fase === "desce") {
    if (a.depois === "sala") {
      // cai do cano do teto da sala secreta
      j.x = FASE.sala.entrada + 1; j.y = 8; j.vy = 0;
      camera.position.set(j.x + 2, 6, 17); camAlvo.set(j.x + 2, 5, 0);
      estado = "jogando"; canoAnim = null;
      if (!salaVisitada) { salaVisitada = true; falar("sala-secreta"); }
    } else {
      // sobe pelo cano de destino
      j.x = a.depois.x; j.y = a.depois.topo - ALT_J - 0.3;
      camera.position.set(j.x + 2, 5, 17); camAlvo.set(j.x + 2, 4, 0);
      sons.cano();
      canoAnim = { fase: "sobe", t: 0, de: j.y, ate: a.depois.topo, depois: null };
    }
  } else { j.y = a.ate; j.noChao = true; estado = "jogando"; canoAnim = null; }
}

// ------------------------------------------------------------------ Final: mastro → castelo → vitória
let mastroT = 0;
function descerMastro() {
  estado = "mastro";
  musica.parar();
  sons.volta();
  j.vx = j.vy = 0;
  j.x = FASE.mastro + 0.5 - 0.55;
  j.dir = 1;
  mastroT = 0;
  mastro.userData.yIni = j.y;
}
function atualizarMastro(dt) {
  mastroT += dt;
  const dur = Math.max(0.6, (mastro.userData.yIni - 1) * 0.16);
  const k = Math.min(1, mastroT / dur);
  j.y = mastro.userData.yIni + (1 - mastro.userData.yIni) * k;
  mastro.userData.bandeira.position.y = 8.4 + (0.6 - 8.4) * k;
  if (mastroT > dur + 0.4) {
    sons.vitoria();
    j.y = 1; j.vy = 0;
    estado = "andando";
  }
}
function chegouNoCastelo() {
  estado = "vitoria";
  j.vx = 0;
  bandeiraCastelo.visible = true;
  bandeiraCastelo.userData.bandeira.position.y = -0.6;
  vitoria();
}

// ------------------------------------------------------------------ Atualização
function atualizarMundo(dt, t) {
  for (const m of moedas) {
    if (!m.viva) continue;
    m.m.rotation.y = t * 3 + m.fase;
    if (estado === "jogando" && Math.abs(m.x - j.x) < 0.8 && m.y > j.y - 0.3 && m.y < j.y + ALT_J + 0.3) {
      m.viva = false;
      cena.remove(m.m);
      somarMoeda(m.x, m.y);
    }
  }
  for (const l of letras) {
    if (!l.viva) continue;
    l.b.position.y = l.y + Math.sin(t * 2.4 + l.i) * 0.18;
    l.b.rotation.y = Math.sin(t * 1.3 + l.i) * 0.35;
    if (estado === "jogando" && Math.abs(l.x - j.x) < 1.0 && l.b.position.y > j.y - 0.5 && l.b.position.y < j.y + ALT_J + 0.5) pegarLetra(l);
  }
  for (const b of borrachas) {
    if (!b.g.visible) continue;
    if (!b.viva) {
      b.morte -= dt;
      if (b.tipo === "m") { const k = Math.max(0, b.morte / 1.2); b.g.userData.poca.scale.set(1 + (1 - k) * 0.4, 0.6, 1); b.g.userData.poca.material.opacity = k; b.g.userData.poca.material.transparent = true; }
      else b.g.scale.set(1.5, 0.3, 1.3);
      if (b.morte <= 0) b.g.visible = false;
      continue;
    }
    b.t += dt;
    const u = b.g.userData;
    if (b.tipo === "m") {
      // manchinha: espera, se encolhe e dá um pulinho para o lado
      if (b.y <= 0 && b.vy <= 0) {
        b.y = 0; b.vy = 0;
        b.espera -= dt;
        const enc = b.espera < 0.3 ? 0.75 : 1 + Math.sin(b.t * 6) * 0.04;
        u.corpo.scale.set(1 / Math.sqrt(enc), enc, 1 / Math.sqrt(enc));
        if (b.espera <= 0) { b.vy = 9; b.espera = 0.8 + Math.random(); if (b.x < b.min) b.dir = 1; else if (b.x > b.max) b.dir = -1; else if (Math.random() < 0.3) b.dir *= -1; }
      } else {
        b.vy -= 30 * dt; b.y = Math.max(0, b.y + b.vy * dt); b.x += b.dir * 2.2 * dt;
        u.corpo.scale.set(0.9, 1.15, 0.9);
      }
      b.g.position.set(b.x, b.y, 0);
      b.g.rotation.y = b.dir * 0.4;
    } else {
      // borracha: marcha com os pezinhos e pisca
      b.x += b.dir * 1.4 * dt;
      if (b.x < b.min) b.dir = 1;
      if (b.x > b.max) b.dir = -1;
      b.g.position.x = b.x;
      b.g.scale.x = (b.dir > 0 ? -1 : 1) * 1.15;
      const passo = Math.sin(b.t * 9);
      u.corpo.position.y = 0.1 + Math.abs(passo) * 0.08;
      u.corpo.rotation.z = passo * 0.05;
      u.pes[0].position.z = 0.08 + passo * 0.12; u.pes[1].position.z = 0.08 - passo * 0.12;
      u.pes[0].position.y = 0.07 + Math.max(0, passo) * 0.08; u.pes[1].position.y = 0.07 + Math.max(0, -passo) * 0.08;
      const pisca = (b.t % 3) < 0.12 ? 0.1 : 1;
      for (const o of u.olhos) o.scale.y = pisca;
    }
    if (estado === "jogando" && Math.abs(b.x - j.x) < 0.85 && j.y < b.y + 1.1 && j.y + ALT_J > b.y) tocarBorracha(b);
  }
  for (const s of solidos) {
    if (!s.bloco) continue;
    const b = s.bloco;
    b.empurrao = Math.max(0, b.empurrao - dt);
    b.malha.position.y = b.base + Math.sin((b.empurrao / 0.16) * Math.PI) * 0.25;
  }
  // "?" piscando
  const pisca = Math.floor(t * 2.6) % 2;
  for (const s of solidos) if (s.bloco?.temMoeda) s.bloco.malha.material.emissive?.setScalar(pisca ? 0.12 : 0);
  if (bandeiraCastelo.visible) bandeiraCastelo.userData.bandeira.position.y += (0.4 - bandeiraCastelo.userData.bandeira.position.y) * Math.min(1, dt * 2);

  if (estado === "jogando" && palavraFeita && j.x >= FASE.mastro - LARG_J / 2 - 0.05) descerMastro(); // encostou no mastro (ou na base dele)
  if (estado === "mastro") atualizarMastro(dt);
  if (estado === "cano") atualizarCano(dt);
  for (const s of setas) s.s.position.y = s.base + Math.abs(Math.sin(t * 4)) * 0.4;
  // botão ↓ (tablet) só aparece em cima de um cano que leva a algum lugar
  const noCano = estado === "jogando" && j.noChao && CANOS_ENTRADA.some((k) => Math.abs(k.x - j.x) < 0.75 && Math.abs(j.y - k.topo) < 0.05);
  $("btn-baixo").classList.toggle("visivel", noCano);
  if (estado === "andando" && j.x >= FASE.castelo) chegouNoCastelo();
  avisoMastroT -= dt;
}

const camAlvo = new THREE.Vector3();
let olhar = 0;
function atualizarCamera(dt) {
  let pos, alvo;
  if (estado === "abertura") {
    pos = new THREE.Vector3(j.x + 2.2, 1.8, 7.2);
    alvo = new THREE.Vector3(j.x + 2.2, 1.6, 0);
  } else if (estado === "vitoria") {
    pos = new THREE.Vector3(j.x + 2.4, 2.4, 9.5);
    alvo = new THREE.Vector3(j.x + 2.4, 2.2, 0);
  } else {
    olhar += (j.dir * 2.5 - olhar) * Math.min(1, dt * 2);
    const naSala = j.x > FASE.sala.x0 - 5;
    const cx = naSala ? Math.min(Math.max(j.x + olhar, FASE.sala.x0 + 9), FASE.sala.x1 - 9) : Math.max(10, j.x + olhar);
    const cy = 4 + Math.max(0, j.y - 2) * 0.6;
    pos = new THREE.Vector3(cx, cy + 0.6, 17);
    alvo = new THREE.Vector3(cx, cy - 0.4, 0);
  }
  const k = 1 - Math.exp(-dt * (estado === "abertura" ? 2.5 : 6));
  camera.position.lerp(pos, k);
  camAlvo.lerp(alvo, k);
  camera.lookAt(camAlvo);
  sol.position.set(j.x + 8, 20, 14);
  sol.target.position.set(j.x, 0, 0);
  ceu.position.copy(camera.position);
}

function animarRabisco(dt) {
  rabisco.grupo.position.set(j.x, j.y, 0);
  // de 3/4 para a câmera: rosto e logo do peito sempre à mostra
  let alvoAng;
  if (estado === "vitoria") alvoAng = 0;
  else if (estado === "abertura") alvoAng = 0.35;
  else if (estado === "mastro") alvoAng = Math.PI / 2;
  else if (estado === "cano") alvoAng = 0.25;
  else alvoAng = j.dir > 0 ? Math.PI / 2 - 0.5 : -Math.PI / 2 + 0.5;
  j.angulo += (alvoAng - j.angulo) * Math.min(1, dt * 12);
  rabisco.grupo.rotation.y = j.angulo;
  let modo = "parado";
  if (estado === "vitoria") modo = "comemorar";
  else if (estado === "mastro") modo = "pular";
  else if (estado === "cano") modo = "parado";
  else if (!j.noChao) modo = "pular";
  else if (Math.abs(j.vx) > 0.4) modo = "andar";
  rabisco.atualizar(dt, { modo, vel: j.vx, vmax: VEL_CORRIDA });
  rabisco.grupo.visible = j.invul > 0 ? Math.floor(j.invul * 12) % 2 === 0 : true;
}

// ------------------------------------------------------------------ Vitória
function vitoria() {
  musica.parar();
  $("hud").classList.add("escondido");
  const d = desafio;
  $("vit-figura").textContent = d.e;
  // letras: a palavra com o hífen; nos outros modos, as peças pegas
  const pecas = MODO.nome === "letras" ? d.rotulo.split("") : d.pecas.map((p) => p.texto);
  $("vit-palavra").innerHTML = pecas.map((l) => (l === "-" ? `<span class="hifen dita">-</span>` : `<span>${l}</span>`)).join("");
  $("vit-palavra").classList.toggle("muitas", d.pecas.length > 6 || pecas.join("").length > 10);
  $("vit-palavra").classList.toggle("respostas", Boolean(d.erradas));
  const fimDoNivel = indice >= sequencia.length - 1;
  $("vit-progresso").textContent = fimDoNivel ? `Nível ${nivel} completo! ⭐` : `${NOME_FASE} ${indice + 1} de ${sequencia.length}`;
  $("proximo").textContent = fimDoNivel ? "Próximo nível ▶" : `Próxima ${NOME_FASE.toLowerCase()} ▶`;
  $("proximo").hidden = fimDoNivel && nivel >= 3;
  if (fimDoNivel) {
    try { const g = JSON.parse(localStorage.getItem(MODO.chave) || "{}"); g[nivel] = true; localStorage.setItem(MODO.chave, JSON.stringify(g)); } catch { /* sem armazenamento: tudo bem */ }
  }
  $("vit-selos").textContent = `+ ${moedasPegas} selos`;
  $("vitoria").classList.remove("escondido");
  const INICIO = 1200;
  const spans = [...$("vit-palavra").children].filter((s) => !s.classList.contains("hifen"));
  let fim;
  if (d.falas.soletra) {
    // letras: cada letra aparece na hora em que a voz soletra
    const tempos = soletrar?.[d.falas.soletra] ?? [0, 0.7, 1.4, 2.1];
    setTimeout(() => falar(d.falas.soletra), INICIO);
    spans.forEach((s, i) => setTimeout(() => s.classList.add("dita"), INICIO + (tempos[i] ?? i * 0.5) * 1000));
    fim = INICIO + (tempos[tempos.length - 1] + 1.6) * 1000;
  } else {
    // as peças aparecem uma a uma, cada uma com a sua voz
    spans.forEach((s, i) => setTimeout(() => { s.classList.add("dita"); if (d.pecas[i]?.voz) falar(d.pecas[i].voz); }, INICIO + i * 900));
    fim = INICIO + spans.length * 900 + 400;
  }
  setTimeout(() => falar(fimDoNivel && MODO.nome !== "mini" ? "nivel-completo" : d.falas.parabens), fim);
  for (let k = 0; k < 6; k++) setTimeout(() => faiscas(j.x + (Math.random() - 0.5) * 3, 2.5 + Math.random() * 2, [0x00b5f0, 0xec2e8c, 0xff7a00, 0xffcc1f][k % 4], 12), k * 350);
}

// ------------------------------------------------------------------ Pause
const pausa = criarPausa({
  podePausar: () => estado === "jogando",
  aoPausar: () => { musica.parar(); Object.assign(entrada, { esq: false, dir: false, pulo: false, puloNovo: false, baixo: false }); },
  aoContinuar: () => musica.tocar("fase"),
  aoRecomecar: () => { const p = palavra; reiniciar(); comecar(nivel, p, true); },
  aoSair: () => reiniciar(),
});

// ------------------------------------------------------------------ Controle
// Mesmo esquema do teclado: direcional ou alavanca anda, A/B pula, ⬇ entra no cano, Start pausa.
// Nas telas (abertura, vitória, pause) o direcional escolhe o botão e A confirma.
const controle = ligarControle({
  entrada,
  pausa,
  mapa: MODO.autoCorre ? { pulo: "pulo", esq: "pulo", dir: "pulo", cima: "pulo", baixo: "pulo" } : undefined, // Mini: qualquer botão pula
  menu: () => (estado === "abertura" ? $("abertura") : estado === "vitoria" ? $("vitoria") : null),
  aoStart: () => { if (estado === "abertura") comecar(nivel); },
  aoConectar: () => {
    $("dica").textContent = MODO.autoCorre ? "Controle: qualquer botão faz o Rabisco pular!" : "Controle: direcional para andar · A para pular · ⬇ para entrar no cano · Start para pausar";
    if (estado === "jogando") aviso("Controle conectado 🎮");
  },
});

// ------------------------------------------------------------------ Laço
const relogio = new THREE.Clock();
function quadro() {
  const dt = Math.min(relogio.getDelta(), 1 / 30);
  controle.atualizar();
  pausa.atualizar();
  if (pausa.ativa) { renderer.render(cena, camera); requestAnimationFrame(quadro); return; }
  const t = relogio.elapsedTime;
  moverJogador(dt);
  j.invul -= dt;
  atualizarMundo(dt, t);
  atualizarParticulas(dt);
  animarRabisco(dt);
  atualizarCamera(dt);
  renderer.render(cena, camera);
  requestAnimationFrame(quadro);
}

// ------------------------------------------------------------------ Início
let texturas = null;
let soletrar = null;
async function iniciar() {
  await Promise.race([
    Promise.all([document.fonts.load("800 40px 'Baloo 2'"), document.fonts.load("900 40px 'Neulis Cursive'")]),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => {});
  soletrar = await fetch(`${RAIZ}/assets/voz/soletrar.json`).then((r) => r.json()).catch(() => null);
  const carregarImg = (url) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = url; });
  const icone = await carregarImg(`${RAIZ}/assets/marca/logos/icone-branco.png`);
  texturas = {
    logo: carregarTextura(`${RAIZ}/assets/marca/logos/azul-icone-rosa.png`),
    icone: { image: icone },
    seloRosa: carregarTextura(`${RAIZ}/assets/elementos/selo-rosa.png`),
    seloAzul: carregarTextura(`${RAIZ}/assets/elementos/selo-azul.png`),
    seloLaranja: carregarTextura(`${RAIZ}/assets/elementos/selo-laranja.png`),
  };
  nivel = Math.min(3, Math.max(1, Number(params.get("nivel")) || 1));
  const pedida = NIVEIS.flatMap((n) => n.itens).find((p) => MODO.desafio(p).chave === params.get("palavra")) ?? null;
  preCarregarFalas(MODO.falasExtras);
  try {
    const g = JSON.parse(localStorage.getItem(MODO.chave) || "{}");
    for (const b of document.querySelectorAll("[data-nivel]")) if (g[b.dataset.nivel]) b.classList.add("feito");
  } catch { /* sem armazenamento */ }

  construirMundo(texturas);
  colocarSetas();
  colocarBorrachas();
  rabisco = new Rabisco3D({ raiz: RAIZ, altura: ALTURA_RABISCO });
  cena.add(rabisco.grupo);
  camera.position.set(j.x + 2.2, 1.8, 7.2);
  camAlvo.set(j.x + 2.2, 1.6, 0);
  requestAnimationFrame(quadro);

  pronto = true;
  if (pendente) comecar(pendente);
  else if (params.has("jogar") || params.has("x") || params.has("vitoria") || pedida) comecar(nivel, pedida);
  if (params.has("x")) j.x = Number(params.get("x"));
  if (params.has("vitoria")) {
    coletadas.fill(true);
    palavraFeita = true;
    MURO_MASTRO.ligado = false;
    j.x = FASE.mastro - 1.5;
    j.y = 5;
  }
  if (params.has("teste")) window.teste = { j, letras, get coletadas() { return coletadas; }, get desafio() { return desafio; }, pegar: pegarLetra, get estado() { return estado; }, renderer, get indice() { return indice; }, set indice(v) { indice = v; }, ganhar() { coletadas.fill(true); palavraFeita = true; MURO_MASTRO.ligado = false; j.x = FASE.mastro - 1.5; j.y = 5; } };
}
iniciar();
