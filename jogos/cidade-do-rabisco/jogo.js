// Cidade do Rabisco: mundo livre para explorar a cidade com o Rabisco 3D. Sem tempo e sem perder:
// a criança passeia (a pé ou dirigindo o carro aberto, com a criança cadastrada no banco do carona),
// conversa com os moradores (é só chegar perto) e cumpre missões bem diferentes entre si:
//  - Cartas: entregar a pé na caixa de correio da casa da mesma cor;      - Gatinhos: achar três escondidos;
//  - Pão: levar da padaria para a escola;                                   - Faixa: atravessar com o bonequinho verde;
//  - Corrida dos números: de carro, passar pelas bandeiras 1 a 5 contra o tempo;
//  - Encomenda: a caixa de frutas só cabe no carro: buscar no mercado e levar para a Vovó;
//  - Bombeiros: apagar os foguinhos com o botão da água;
//  - Caça ao tesouro: seguir as pistas (adivinhas) de um lugar para o outro;
//  - Patinhos do lago: contar os patos e pisar no número certo (e aprender "duck");
//  - Passeio: visitar todos os lugares (passaporte). Selos espalhados para colecionar.
// O alvo da missão em foco pisca no minimapa e uma seta (bússola) no alto da tela aponta o caminho.

import { THREE, texturaCanvas } from "../../src/motor3d/toon.js";
import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
import { moeda3D, pilotoLapis } from "../../src/motor3d/objetos.js";
import { carregarTextura } from "../../src/motor3d/toon.js";
import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar, preCarregarFalas, falarNome, parabenizar } from "../../src/motor/voz.js";
import { criarCompanheiro3D } from "../../src/motor3d/companheiro3d.js";
import { criarJoystick } from "../../src/motor/joystick.js";
import { CODIGOS_J2, TECLAS_J1_EXTRA } from "../../src/motor/jogadores.js";
import { montarCidade, carro, carroAberto, BORDA } from "./cidade.js";
import { RUAS, segmentos, ROTAS, CASAS, LAGO, PARQUE, PRACA, VAGAS, LARGADA, lugar as lugarDoMapa } from "./mapa.js";

const VEL = 6.5, PULO = 9.6, GRAV = 25, LARG = 0.35;
const CARRO_VMAX = 15, CARRO_RE = -5;
const params = new URLSearchParams(location.search);

// ações que a criança pode trocar na tela ⚙️ (computador/TV; no toque não aparece)
const CONTROLES = [
  { id: "frente", nome: "Frente / acelerar", teclas: ["KeyW", "ArrowUp"] },
  { id: "tras", nome: "Trás / frear", teclas: ["KeyS", "ArrowDown"] },
  { id: "esq", nome: "Esquerda", teclas: ["KeyA", "ArrowLeft"] },
  { id: "dir", nome: "Direita", teclas: ["KeyD", "ArrowRight"] },
  { id: "pular", nome: "Pular (no carro: buzina)", teclas: ["Space"], botoes: [0, 1], controle: "pulo" },
  { id: "acao", nome: "Entrar no carro · água", teclas: ["KeyF", "Enter"], botoes: [2, 3], controle: "acao" },
  { id: "girarE", nome: "Girar a câmera ⟲", teclas: ["KeyQ"] },
  { id: "girarD", nome: "Girar a câmera ⟳", teclas: ["KeyE"] },
  { id: "mapa", nome: "Mapa grande", teclas: ["KeyM"], botoes: [8], controle: "select" },
];

const jogo = criarCasca({
  titulo: "Cidade do Rabisco",
  sub: "Passeie, dirija e ajude os amigos da cidade!",
  faixa: "pequenos",
  cor: "#8E6CFF",
  pose: "apresentando",
  deitado: true,
  menuNoJogo: false,
  teclado: false,
  dica: {
    teclado: "WASD ou setas andam · F entra no carro · M abre o mapa · Q/E giram a câmera · Espaço pula · P pausa",
    toque: "Arraste à esquerda para andar · à direita para olhar · botão amarelo entra no carro",
    controle: "Alavanca esquerda anda · X entra no carro · Select abre o mapa · A pula · Start pausa",
  },
  falas: { titulo: "cid-titulo", vitoria: null },
  controles: CONTROLES,
  // 2 jogadores ao mesmo tempo: o jogador 2 controla a criança-companheira a pé; no carro, buzina (pulo) e acena (ação)
  jogadores: "simultaneo",
  aoComecar: iniciar,
  aoSair: parar,
  aoPausar: () => { teclas.clear(); toque?.zerar(); },
  aoContinuar: () => {},
  aoControle: lerControle,
});

// ------------------------------------------------------------------ Entrada
const teclas = new Set();
const PADRAO = Object.fromEntries(CONTROLES.map((a) => [a.id, a.teclas]));
const J = jogo.jogadores;
// teclas do jogador 1; no teclado dividido (2 jogadores no computador) as teclas do jogador 2 (WASD, Espaço, F) saem
// e o jogador 1 ganha Shift direito para pular e Enter para a ação
function teclasDe(acao) {
  const t = jogo.remap?.teclas(acao) ?? PADRAO[acao];
  if (!J.tecladoDividido) return t;
  const extra = acao === "pular" ? TECLAS_J1_EXTRA.pulo : acao === "acao" ? TECLAS_J1_EXTRA.acao : [];
  return [...t.filter((k) => !CODIGOS_J2.has(k)), ...extra];
}
const tem = (acao) => teclasDe(acao).some((k) => teclas.has(k));
const ehAcao = (acao, code) => teclasDe(acao).includes(code);
let pad = { x: 0, y: 0, gx: 0, pulo: false, puloNovo: false, acaoNova: false };
let toque = null;
addEventListener("keydown", (e) => {
  if (jogo.estado !== "jogando" || jogo.pausado) return;
  if (J.tv && !ehAcao("mapa", e.code)) return; // TV como tela (página tv/): o Rabisco e a criança são dos controles e celulares
  teclas.add(e.code);
  if (ehAcao("pular", e.code)) { pad.puloNovo = true; e.preventDefault(); }
  if (ehAcao("acao", e.code) && !e.repeat) { pad.acaoNova = true; e.preventDefault(); }
  if (ehAcao("mapa", e.code) && !e.repeat) alternarMapaGrande();
  if (e.code.startsWith("Arrow")) e.preventDefault();
});
addEventListener("keyup", (e) => teclas.delete(e.code));
function lerControle({ segura, apertou, eixoX, eixoY }) {
  const g = navigator.getGamepads?.() ?? [];
  let gx = 0;
  for (const p of g) if (p && p.index !== J.padJ2 && Math.abs(p.axes[2] ?? 0) > 0.2) gx = p.axes[2];
  pad.x = eixoX || ((segura.dir ? 1 : 0) - (segura.esq ? 1 : 0));
  pad.y = -(eixoY || ((segura.baixo ? 1 : 0) - (segura.cima ? 1 : 0)));
  pad.gx = gx;
  if (apertou.pulo) pad.puloNovo = true;
  pad.pulo = segura.pulo;
  if (apertou.acao) pad.acaoNova = true;
  if (apertou.select || (apertou.voltar && mapaGrande && !mapaGrande.hidden)) alternarMapaGrande();
}

// ------------------------------------------------------------------ Cena
let r3, cena, cam, sol, mundo, rabisco, relogio, vivo = false, hud, mapa, balao, bussola, btnAcao, mapaGrande;
let companheiro = null; // a criança cadastrada passeando junto (src/motor3d/companheiro3d.js)
const amigo = { pos: new THREE.Vector3(), dir: 0, vel: 0, fase: 0, vy: 0, noChao: true, acena: 0, buzina: 0 };
let dois = false; // 2 jogadores: a criança é do jogador 2 (src/motor/jogadores.js)
const RAIO_J2 = 11; // o jogador 2 fica a no máximo 11 m do Rabisco (a câmera enquadra os dois)
const j = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), noChao: true, coyote: 0, buffer: 0, dir: 0 };
let camYaw = 0, camManual = 0, vistaTeste = null;
const carros = [], moradores = [], selos = [], npcs = [], veiculos = [];
let dentro = null;     // carro em que o Rabisco está dirigindo (ou null: a pé)
let missoes = {}, visitados = new Set(), selosPegos = 0, fim = false, foco = null;
let entradaTeste = null; // ?teste: { acel, virar } força o volante (fotos e testes)

function iniciar() {
  parar();
  const caixa = el("div", { class: "cena-cidade" });
  jogo.palco.append(caixa);
  r3 = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const leve = navigator.maxTouchPoints > 0; // tablet e celular: um pouco menos de resolução para rodar liso
  r3.setPixelRatio(Math.min(devicePixelRatio, leve ? 1.3 : 1.6));
  r3.outputColorSpace = THREE.SRGBColorSpace;
  r3.toneMapping = THREE.ACESFilmicToneMapping;
  r3.toneMappingExposure = 1.05;
  r3.shadowMap.enabled = true;
  r3.shadowMap.type = THREE.PCFSoftShadowMap;
  caixa.append(r3.domElement);
  cena = new THREE.Scene();
  cena.fog = new THREE.Fog(0xcfe6f5, 80, 300);
  cam = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 800);
  // céu: degradê com o sol
  const ceu = new THREE.Mesh(new THREE.SphereGeometry(650, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { topo: { value: new THREE.Color(0x3d8fd9) }, horizonte: { value: new THREE.Color(0xdcefff) }, dirSol: { value: new THREE.Vector3(0.5, 0.55, 0.65).normalize() } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 topo; uniform vec3 horizonte; uniform vec3 dirSol; varying vec3 vP; void main(){ float h = clamp(vP.y*1.4, 0.0, 1.0); vec3 c = mix(horizonte, topo, pow(h,0.6)); float s = max(dot(normalize(vP), dirSol), 0.0); c += vec3(1.0,0.9,0.7) * (pow(s, 400.0) * 1.5 + pow(s, 12.0) * 0.18); gl_FragColor = vec4(c, 1.0); }",
  }));
  cena.add(ceu);
  sol = new THREE.DirectionalLight(0xfff2dc, 3.0);
  sol.castShadow = true;
  sol.shadow.mapSize.set(leve ? 1024 : 2048, leve ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.05;
  cena.add(sol, sol.target, new THREE.HemisphereLight(0xcfe6ff, 0x6a8f4a, 1.1));

  mundo = montarCidade(cena);
  rabisco = new Rabisco3D({ raiz: "../..", altura: 1.8 });
  cena.add(rabisco.grupo);
  j.pos.set(LARGADA.x, 0.03, LARGADA.z); j.vel.set(0, 0, 0); j.dir = LARGADA.dir; camYaw = LARGADA.dir;
  dois = J.ativo && J.j2Pronto;
  // sem cadastro, no modo 2 jogadores, vem a criança genérica (lápis verde) com o nome "Jogador 2"
  const semCadastro = !window.Familia?.crianca?.();
  companheiro = criarCompanheiro3D({ raiz: "../..", altura: 1.55, cracha: true, ...(dois && semCadastro ? { crianca: { nome: J.j2.nome } } : {}) });
  Object.assign(amigo, { vy: 0, noChao: true, acena: 0, buzina: 0 });
  if (companheiro) {
    amigo.pos.set(LARGADA.x + 1.4, 0.03, LARGADA.z + 1.4); amigo.dir = LARGADA.dir; amigo.vel = 0;
    companheiro.grupo.position.copy(amigo.pos);
    cena.add(companheiro.grupo);
  }
  dentro = null;
  criarVeiculos();
  criarCarros();
  criarMoradores();
  criarSelos();
  criarMissoes();

  hud = el("div", { class: "hud-cidade" });
  mapa = el("canvas", { class: "mapa-cidade", width: "200", height: "200", role: "button", "aria-label": "Abrir o mapa grande" });
  mapa.addEventListener("click", () => alternarMapaGrande());
  balao = el("div", { class: "balao-cidade", "aria-live": "polite" });
  bussola = el("div", { class: "bussola-cidade", hidden: "" }, [el("div", { class: "seta", html: "<span>➤</span>" }), el("div", { class: "rotulo" })]);
  btnAcao = el("button", { class: "acao-cidade", hidden: "", "aria-label": "Ação" });
  const apertarAcao = (e) => { e.preventDefault(); e.stopPropagation(); pad.acaoNova = true; };
  btnAcao.addEventListener("pointerdown", apertarAcao);
  btnAcao.addEventListener("click", (e) => e.preventDefault());
  mapaGrande = el("div", { class: "mapa-grande-cidade", hidden: "" }, [el("div", { class: "cartao" }, [el("h2", { texto: "🗺️ Mapa da Cidade" }), el("canvas", { width: "640", height: "640" }), el("p", { class: "legenda" })])]);
  mapaGrande.addEventListener("click", () => alternarMapaGrande());
  caixa.append(hud, mapa, bussola, balao, btnAcao, mapaGrande);
  toque = criarJoystick(caixa);
  atualizarHud();

  const ajustar = () => { const w = caixa.clientWidth || innerWidth, h = caixa.clientHeight || innerHeight; r3.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  new ResizeObserver(ajustar).observe(caixa);
  ajustar();
  relogio = new THREE.Clock();
  vivo = true;
  posicionarCamera(1, 0);
  requestAnimationFrame(quadro);
  setTimeout(() => { falar("cid-intro"); dizer("Cidade do Rabisco", "Que cidade bonita! Converse com quem tem um ! em cima. O carro rosa está esperando você!"); }, 700);
}
function parar() {
  vivo = false;
  if (r3) { r3.dispose(); r3 = null; }
  carros.length = moradores.length = selos.length = npcs.length = veiculos.length = 0;
  missoes = {}; visitados = new Set(); selosPegos = 0; fim = false; foco = null; dentro = null;
  teclas.clear();
}

// ------------------------------------------------------------------ Física do Rabisco
function chaoEm(x, z, y) {
  let h = 0.03;
  for (const s of mundo.solidos) if (s.y1 <= y + 0.4 && x > s.x0 - LARG && x < s.x1 + LARG && z > s.z0 - LARG && z < s.z1 + LARG && s.y1 > h) h = s.y1;
  return h;
}
const bate = (x, z, y, larg = LARG) => mundo.solidos.some((s) => y < s.y1 - 0.05 && x > s.x0 - larg && x < s.x1 + larg && z > s.z0 - larg && z < s.z1 + larg)
  || mundo.circulos.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + larg);
// um ponto livre perto do pedido (para NPCs, gatinhos, baús e foguinhos não nascerem dentro de nada)
function livre(x, z, folga = 0.9) {
  for (let r = 0; r < 14; r += 0.7) for (let a = 0; a < 6.28; a += r ? 0.5 / r + 0.3 : 7) {
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (!bate(px, pz, 0.1, folga)) return [px, pz];
  }
  return [x, z];
}
function entradaAndar() {
  let ix = (tem("dir") ? 1 : 0) - (tem("esq") ? 1 : 0);
  let iy = (tem("frente") ? 1 : 0) - (tem("tras") ? 1 : 0);
  ix += pad.x + (toque?.x ?? 0); iy += pad.y + (toque?.y ?? 0);
  if (entradaTeste) { ix = entradaTeste.virar; iy = entradaTeste.acel; }
  const m = Math.hypot(ix, iy);
  if (m > 1) { ix /= m; iy /= m; }
  if (fim) ix = iy = 0;
  return { ix, iy, m };
}
function moverJogador(dt) {
  const { ix, iy, m } = entradaAndar();
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
  const wx = fx * iy - fz * ix, wz = fz * iy + fx * ix; // frente e direita da câmera
  const k = Math.min(1, dt * (j.noChao ? 12 : 5));
  j.vel.x += (wx * VEL - j.vel.x) * k;
  j.vel.z += (wz * VEL - j.vel.z) * k;
  const quer = pad.puloNovo || toque?.puloNovo;
  pad.puloNovo = false; if (toque) toque.puloNovo = false;
  j.coyote = j.noChao ? 0.1 : j.coyote - dt;
  j.buffer = quer ? 0.14 : j.buffer - dt;
  if (j.buffer > 0 && j.coyote > 0) { j.vel.y = PULO; j.buffer = j.coyote = 0; j.noChao = false; sons.pulo(); }
  if (!(pad.pulo || toque?.pulo || tem("pular")) && j.vel.y > 4) j.vel.y = 4;
  j.vel.y -= GRAV * dt;
  const nx = j.pos.x + j.vel.x * dt;
  if (!bate(nx, j.pos.z, j.pos.y) && Math.abs(nx) < BORDA + 10) j.pos.x = nx; else j.vel.x = 0;
  const nz = j.pos.z + j.vel.z * dt;
  if (!bate(j.pos.x, nz, j.pos.y) && Math.abs(nz) < BORDA + 10) j.pos.z = nz; else j.vel.z = 0;
  const chao = chaoEm(j.pos.x, j.pos.z, j.pos.y);
  j.pos.y += j.vel.y * dt;
  if (j.pos.y <= chao) { j.pos.y = chao; j.vel.y = 0; j.noChao = true; } else j.noChao = j.pos.y - chao < 0.03;
  const v = Math.hypot(j.vel.x, j.vel.z);
  if (v > 0.4) { let d = Math.atan2(j.vel.x, j.vel.z) - j.dir; d = Math.atan2(Math.sin(d), Math.cos(d)); j.dir += d * Math.min(1, dt * 12); }
  rabisco.grupo.position.copy(j.pos);
  rabisco.grupo.rotation.y = j.dir;
  rabisco.atualizar(dt, { modo: fim ? "comemorar" : !j.noChao ? "pular" : v > 0.6 ? "andar" : "parado", vel: v, vmax: VEL });
  if (companheiro) (dois ? moverJogador2(dt) : moverCompanheiro(dt, v));
  return { andando: m > 0.2 && iy > -0.3 };
}

// A criança acompanha o Rabisco: vai para um ponto atrás e ao lado dele, com atraso suave, sem atravessá-lo,
// anda/para com a mesma animação e olha para onde está indo (ou para o Rabisco, quando parada).
function moverCompanheiro(dt, velRabisco) {
  const ATRAS = 1.7, LADO = 0.9, MIN = 1.25;
  const alvoX = j.pos.x - Math.sin(j.dir) * ATRAS + Math.cos(j.dir) * LADO;
  const alvoZ = j.pos.z - Math.cos(j.dir) * ATRAS - Math.sin(j.dir) * LADO;
  let dx = alvoX - amigo.pos.x, dz = alvoZ - amigo.pos.z;
  const dist = Math.hypot(dx, dz);
  // só sai do lugar quando o Rabisco se afasta; chega devagar perto do ponto (sem tremer)
  const quer = dist > 0.35 ? Math.min(VEL * 1.05, dist * 2.2) : 0;
  amigo.vel += (quer - amigo.vel) * Math.min(1, dt * 6);
  if (dist > 1e-3) { dx /= dist; dz /= dist; }
  let nx = amigo.pos.x + dx * amigo.vel * dt, nz = amigo.pos.z + dz * amigo.vel * dt;
  // nunca atravessa o Rabisco: se ficar perto demais, é empurrada para fora
  const ex = nx - j.pos.x, ez = nz - j.pos.z, d2 = Math.hypot(ex, ez);
  if (d2 < MIN && d2 > 1e-3) { nx = j.pos.x + (ex / d2) * MIN; nz = j.pos.z + (ez / d2) * MIN; }
  if (!bate(nx, amigo.pos.z, amigo.pos.y) && Math.abs(nx) < BORDA + 10) amigo.pos.x = nx;
  if (!bate(amigo.pos.x, nz, amigo.pos.y) && Math.abs(nz) < BORDA + 10) amigo.pos.z = nz;
  // ficou muito para trás (ex.: preso atrás de um prédio): aparece pertinho do Rabisco
  if (Math.hypot(amigo.pos.x - j.pos.x, amigo.pos.z - j.pos.z) > 14) { const [lx, lz] = livre(alvoX, alvoZ); amigo.pos.x = lx; amigo.pos.z = lz; }
  const chao = chaoEm(amigo.pos.x, amigo.pos.z, amigo.pos.y);
  amigo.pos.y += (chao - amigo.pos.y) * Math.min(1, dt * 10);
  const andando = amigo.vel > 0.5;
  // olha para onde vai; parada, vira para o Rabisco
  const alvoDir = andando ? Math.atan2(dx, dz) : Math.atan2(j.pos.x - amigo.pos.x, j.pos.z - amigo.pos.z);
  let d = alvoDir - amigo.dir; d = Math.atan2(Math.sin(d), Math.cos(d));
  amigo.dir += d * Math.min(1, dt * (andando ? 10 : 4));
  companheiro.grupo.position.copy(amigo.pos);
  companheiro.grupo.rotation.y = amigo.dir;
  companheiro.atualizar(dt, { modo: fim ? "comemorar" : andando ? "andar" : velRabisco > 0.6 ? "parado" : "acenar", vel: amigo.vel, vmax: VEL });
}

// Jogador 2: a criança anda sozinha (relativo à câmera, como o Rabisco), pula e acena (ação). Fica a no máximo
// RAIO_J2 do Rabisco: passando disso, é segurada na borda (a câmera compartilhada enquadra os dois).
let avisouRaio = false;
function moverJogador2(dt) {
  const e = J.ler2();
  let ix = e.x, iy = e.y;
  if (fim) ix = iy = 0;
  const m = Math.hypot(ix, iy);
  if (m > 1) { ix /= m; iy /= m; }
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
  const wx = fx * iy - fz * ix, wz = fz * iy + fx * ix;
  const V = VEL * 0.95;
  amigo.vx = (amigo.vx ?? 0) + (wx * V - (amigo.vx ?? 0)) * Math.min(1, dt * 12);
  amigo.vz = (amigo.vz ?? 0) + (wz * V - (amigo.vz ?? 0)) * Math.min(1, dt * 12);
  if (e.puloNovo && amigo.noChao) { amigo.vy = PULO * 0.95; amigo.noChao = false; sons.pulo(); }
  if (!e.pulo && amigo.vy > 4) amigo.vy = 4;
  if (e.acaoNova) { amigo.acena = 1.4; sons.bipe?.(false); }
  amigo.acena -= dt;
  amigo.vy -= GRAV * dt;
  let nx = amigo.pos.x + amigo.vx * dt, nz = amigo.pos.z + amigo.vz * dt;
  // segura perto do Rabisco
  const dx = nx - j.pos.x, dz = nz - j.pos.z, d = Math.hypot(dx, dz);
  if (d > RAIO_J2) {
    nx = j.pos.x + (dx / d) * RAIO_J2; nz = j.pos.z + (dz / d) * RAIO_J2;
    if (!avisouRaio) { avisouRaio = true; dizer(J.j2.nome, "Fique pertinho do Rabisco, assim a gente não se perde!", 3200); }
  }
  // nunca atravessa o Rabisco
  const ex = nx - j.pos.x, ez = nz - j.pos.z, d2 = Math.hypot(ex, ez);
  if (d2 < 1.0 && d2 > 1e-3) { nx = j.pos.x + (ex / d2) * 1.0; nz = j.pos.z + (ez / d2) * 1.0; }
  if (!bate(nx, amigo.pos.z, amigo.pos.y) && Math.abs(nx) < BORDA + 10) amigo.pos.x = nx; else amigo.vx = 0;
  if (!bate(amigo.pos.x, nz, amigo.pos.y) && Math.abs(nz) < BORDA + 10) amigo.pos.z = nz; else amigo.vz = 0;
  // ficou longe demais (o Rabisco correu e ela ficou presa atrás de algo): aparece pertinho dele
  if (Math.hypot(amigo.pos.x - j.pos.x, amigo.pos.z - j.pos.z) > RAIO_J2 + 4) { const [lx, lz] = livre(j.pos.x - Math.sin(j.dir) * 1.8, j.pos.z - Math.cos(j.dir) * 1.8); amigo.pos.x = lx; amigo.pos.z = lz; }
  const chao = chaoEm(amigo.pos.x, amigo.pos.z, amigo.pos.y);
  amigo.pos.y += amigo.vy * dt;
  if (amigo.pos.y <= chao) { amigo.pos.y = chao; amigo.vy = 0; amigo.noChao = true; } else amigo.noChao = amigo.pos.y - chao < 0.03;
  const v = Math.hypot(amigo.vx, amigo.vz);
  amigo.vel = v;
  if (v > 0.4) { let a = Math.atan2(amigo.vx, amigo.vz) - amigo.dir; a = Math.atan2(Math.sin(a), Math.cos(a)); amigo.dir += a * Math.min(1, dt * 12); }
  companheiro.grupo.position.copy(amigo.pos);
  companheiro.grupo.rotation.y = amigo.dir;
  const modo = fim ? "comemorar" : !amigo.noChao ? "pular" : v > 0.6 ? "andar" : amigo.acena > 0 ? "acenar" : "parado";
  companheiro.atualizar(dt, { modo, vel: v, vmax: VEL });
}
// Jogador 2 no carona: pulo = buzina, ação = acenar (braço para fora do carro)
function jogador2NoCarro(dt, v) {
  const e = J.ler2();
  amigo.buzina -= dt;
  if (e.puloNovo && amigo.buzina <= 0) { sons.buzina(); amigo.buzina = 0.8; navigator.vibrate?.(15); }
  if (e.acaoNova) amigo.acena = 1.6;
  amigo.acena -= dt;
  if (amigo.acena > 0 && companheiro) {
    const rb = companheiro.rabisco, t = relogio.elapsedTime;
    rb.bracoE.ombro.rotation.set(-0.25, 0, 2.55);
    rb.bracoE.cotovelo.rotation.x = -0.35 + Math.sin(t * 7) * 0.45;
  }
  void v;
}

// ------------------------------------------------------------------ Carro do Rabisco (dirigir)
function criarVeiculos() {
  for (const v of VAGAS) {
    const g = carroAberto(v.cor);
    g.position.set(v.x, 0.03, v.z); g.rotation.y = v.ang;
    cena.add(g);
    veiculos.push({ g, pos: new THREE.Vector3(v.x, 0.03, v.z), ang: v.ang, vel: 0, virar: 0, giro: 0, batida: 0, buzina: 0, caixa: null });
  }
}
const lateralDe = (ang) => [Math.cos(ang), -Math.sin(ang)]; // esquerda do carro (lado do motorista) no mundo
function pertoDeCarro() {
  let melhor = null, dm = 3.6;
  for (const v of veiculos) { const d = Math.hypot(v.pos.x - j.pos.x, v.pos.z - j.pos.z); if (d < dm) { dm = d; melhor = v; } }
  return melhor;
}
function sentar(personagem, assento, escala) {
  personagem.grupo.position.set(assento.x, assento.y - 2.0 * escala, assento.z);
  personagem.grupo.rotation.set(0, 0, 0);
}
function entrarNoCarro(v) {
  if (dentro || fim) return;
  dentro = v;
  j.vel.set(0, 0, 0);
  v.g.add(rabisco.grupo);
  sentar(rabisco, v.g.userData.motorista, rabisco.escala);
  if (companheiro) { v.g.add(companheiro.grupo); sentar(companheiro, v.g.userData.carona, companheiro.escala); }
  v.g.userData.seta.visible = false;
  sons.pisao();
  camManual = 0;
  if (!entrarNoCarro.falou) { entrarNoCarro.falou = true; setTimeout(() => falar("cid-carro"), 250); dizer("Cidade do Rabisco", "Cinto de segurança afivelado! Para a frente acelera, para trás freia. Aperte de novo para sair.", 4200); }
}
function sairDoCarro() {
  const v = dentro;
  if (!v || Math.abs(v.vel) > 3) return;
  const [lx, lz] = lateralDe(v.ang);
  const fx = Math.sin(v.ang), fz = Math.cos(v.ang);
  const opcoes = [[lx * 2.3, lz * 2.3], [-lx * 2.3, -lz * 2.3], [-fx * 3.6, -fz * 3.6], [fx * 3.6, fz * 3.6]];
  const [ox, oz] = opcoes.find(([ox, oz]) => !bate(v.pos.x + ox, v.pos.z + oz, 0.1)) ?? opcoes[0];
  dentro = null;
  v.vel = 0;
  cena.add(rabisco.grupo);
  j.pos.set(v.pos.x + ox, 0.03, v.pos.z + oz); j.vel.set(0, 0, 0); j.dir = v.ang;
  rabisco.grupo.position.copy(j.pos);
  if (companheiro) {
    cena.add(companheiro.grupo);
    const [cx, cz] = livre(v.pos.x - ox * (Math.abs(ox) > 1 ? 1 : 0) - lx * 2.3 * (Math.abs(ox) > 1 ? 0 : 1), v.pos.z - oz, 0.5);
    amigo.pos.set(cx, 0.03, cz); amigo.vel = 0; amigo.dir = v.ang;
    companheiro.grupo.position.copy(amigo.pos);
  }
  v.g.userData.seta.visible = true;
  sons.pisao();
}
// colisão do carro (círculos na frente, no meio e atrás) com prédios, árvores, lago, outros carros
function carroBate(x, z, ang, eu) {
  const fx = Math.sin(ang), fz = Math.cos(ang);
  for (const k of [-1.5, 0, 1.5]) {
    const px = x + fx * k, pz = z + fz * k;
    if (mundo.solidos.some((s) => s.y1 > 0.6 && px > s.x0 - 1.1 && px < s.x1 + 1.1 && pz > s.z0 - 1.1 && pz < s.z1 + 1.1)) return true;
    if (mundo.circulos.some((c) => Math.hypot(px - c.x, pz - c.z) < c.r + 1.1)) return true;
  }
  for (const c of carros) if (Math.hypot(c.g.position.x - x, c.g.position.z - z) < 3.5) return true;
  for (const v of veiculos) if (v !== eu && Math.hypot(v.pos.x - x, v.pos.z - z) < 3.6) return true;
  return Math.abs(x) > BORDA + 12 || Math.abs(z) > BORDA + 12;
}
function dirigirCarro(dt) {
  const v = dentro;
  let { ix, iy } = entradaAndar();
  if (Math.abs(iy) < 0.15) iy = 0;
  if (iy > 0) v.vel += iy * 9 * dt * (v.vel < 0 ? 2.2 : 1);
  else if (iy < 0) v.vel += iy * (v.vel > 0 ? 18 : 6) * dt;
  else v.vel -= Math.sign(v.vel) * Math.min(Math.abs(v.vel), 5 * dt);
  v.vel = Math.max(CARRO_RE, Math.min(CARRO_VMAX, v.vel));
  v.virar += (ix - v.virar) * Math.min(1, dt * 8);
  v.ang -= v.virar * 1.9 * dt * Math.max(-1, Math.min(1, v.vel / 6));
  const nx = v.pos.x + Math.sin(v.ang) * v.vel * dt, nz = v.pos.z + Math.cos(v.ang) * v.vel * dt;
  v.batida -= dt;
  if (carroBate(nx, nz, v.ang, v)) {
    if (Math.abs(v.vel) > 4 && v.batida <= 0) { sons.batida(); v.batida = 0.8; navigator.vibrate?.(30); }
    v.vel *= -0.25;
  } else { v.pos.x = nx; v.pos.z = nz; }
  // buzina no botão de pular
  v.buzina -= dt;
  if ((pad.puloNovo || toque?.puloNovo) && v.buzina <= 0) { sons.buzina(); v.buzina = 0.8; }
  pad.puloNovo = false; if (toque) toque.puloNovo = false;
  animarCarro(v, dt);
  j.pos.set(v.pos.x, 0.03, v.pos.z); j.dir = v.ang;
  rabisco.atualizar(dt, { modo: fim ? "comemorarSentado" : "dirigir", virar: v.virar });
  // volante encaixado nas mãos do Rabisco
  v.g.updateMatrixWorld(true);
  const mE = rabisco.bracoE.cotovelo.localToWorld(new THREE.Vector3(0, -0.82, 0));
  const mD = rabisco.bracoD.cotovelo.localToWorld(new THREE.Vector3(0, -0.82, 0));
  const meio = mE.clone().add(mD).multiplyScalar(0.5);
  v.g.worldToLocal(meio);
  const vol = v.g.userData.volante;
  vol.position.copy(meio);
  vol.scale.setScalar(Math.max(0.6, mE.distanceTo(mD) / 2 / 0.24));
  vol.rotation.set(-1.0, 0, v.virar * 0.6);
  if (companheiro) {
    const festa = fim || Math.abs(v.vel) > CARRO_VMAX * 0.9;
    companheiro.atualizar(dt, { modo: festa ? "comemorarSentado" : "dirigir", virar: v.virar });
    if (!festa) companheiro.bracos(-0.35, 0.55, -1.25);
    companheiro.rabisco.tronco.rotation.z += -v.virar * 0.1;
    if (dois) jogador2NoCarro(dt, v);
  }
  return { andando: Math.abs(v.vel) > 1 };
}
function animarCarro(v, dt) {
  v.g.position.copy(v.pos);
  v.g.rotation.y = v.ang;
  v.giro += (v.vel * dt) / 0.44;
  for (const r of v.g.userData.rodas) r.rotation.x = v.giro;
  if (v.g.userData.seta.visible) v.g.userData.seta.position.y = 3.2 + Math.sin(relogio.elapsedTime * 4) * 0.2;
}

// ------------------------------------------------------------------ Câmera (acompanha e gira)
const alvo = new THREE.Vector3(), posCam = new THREE.Vector3();
function posicionarCamera(k, dt, andando = false) {
  if (vistaTeste) { // ?teste: vista de cima / ângulo fixo para as fotos
    cam.position.set(...vistaTeste.pos); cam.lookAt(...vistaTeste.alvo);
    sol.position.set(vistaTeste.alvo[0] + 40, 60, vistaTeste.alvo[2] + 30); sol.target.position.set(vistaTeste.alvo[0], 0, vistaTeste.alvo[2]);
    return;
  }
  // girar: Q/E, alavanca direita ou arrastar à direita da tela
  const giro = (tem("girarD") ? 1 : 0) - (tem("girarE") ? 1 : 0) + pad.gx * 1.2;
  const arrasto = toque ? toque.girar() : 0;
  if (giro || arrasto) { camYaw -= giro * dt * 2.2 + arrasto * 0.008; camManual = 2.5; }
  camManual -= dt;
  // andando (ou dirigindo) para a frente, a câmera vai voltando para trás do Rabisco
  const ref = dentro ? dentro.ang : j.dir;
  if (camManual <= 0 && (andando || dentro)) { let d = ref - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * (dentro ? 2.5 : 1.2)); }
  const longe = cam.aspect < 1.2 ? 1.25 : 1;
  let dist = (dentro ? 8.6 : 6.3) * longe;
  // 2 jogadores a pé: a câmera mira o meio dos dois e se afasta conforme eles se separam
  const P = dois && !dentro && companheiro ? new THREE.Vector3((j.pos.x + amigo.pos.x) / 2, (j.pos.y + amigo.pos.y) / 2, (j.pos.z + amigo.pos.z) / 2) : j.pos;
  if (P !== j.pos) dist += Math.hypot(j.pos.x - amigo.pos.x, j.pos.z - amigo.pos.z) * 0.75;
  // a câmera não atravessa prédios: encurta a distância se tiver parede no caminho
  for (let s = 1; s <= 10; s++) {
    const d = (dist * s) / 10;
    const x = P.x - Math.sin(camYaw) * d, z = P.z - Math.cos(camYaw) * d;
    if (mundo.solidos.some((o) => o.y1 > 3 && x > o.x0 - 0.3 && x < o.x1 + 0.3 && z > o.z0 - 0.3 && z < o.z1 + 0.3)) { dist = Math.max(2.5, d - 0.6); break; }
  }
  const alt = dentro ? 3.8 : 3.0;
  alvo.lerp(new THREE.Vector3(P.x + Math.sin(camYaw) * (dentro ? 4 : 2), P.y + (dentro ? 1.4 : 1.3), P.z + Math.cos(camYaw) * (dentro ? 4 : 2)), k);
  posCam.lerp(new THREE.Vector3(P.x - Math.sin(camYaw) * dist, P.y + alt * longe, P.z - Math.cos(camYaw) * dist), k);
  cam.position.copy(posCam);
  cam.lookAt(alvo);
  sol.position.set(P.x + 40, 60, P.z + 30);
  sol.target.position.set(j.pos.x, 0, j.pos.z);
}

// ------------------------------------------------------------------ Trânsito: semáforos e carros
// cada cruzamento: verde para os carros do eixo z (7 s), amarelo (2 s), verde para o eixo x (7 s), amarelo (2 s)
const CICLO = 18;
function luzDe(s, eixo, t) {
  const f = (t + s.fase) % CICLO;
  const verdeZ = f < 7, amareloZ = f >= 7 && f < 9, verdeX = f >= 9 && f < 16;
  if (eixo === "z") return verdeZ ? "verde" : amareloZ ? "amarelo" : "vermelho";
  return verdeX ? "verde" : !verdeZ && !amareloZ && !verdeX ? "amarelo" : "vermelho";
}
function atualizarSemaforos(t) {
  for (const s of mundo.semaforos) {
    for (const p of s.postes) {
      const luz = luzDe(s, p.userData.eixo, t);
      for (const [nome, m] of Object.entries(p.userData.luzes)) m.material.emissiveIntensity = nome === luz ? 2.2 : 0;
      // bonequinho: verde quando os carros que este poste controla estão parados
      p.userData.ped.material.emissive.setHex(luz === "vermelho" ? 0x30ff60 : 0xff3030);
    }
  }
}
// rota com a faixa da direita (mão brasileira): desloca cada ponto para a direita de quem dirige
function faixaDireita(pts, desloc) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const d1 = [b[0] - a[0], b[1] - a[1]], d2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(...d1) || 1, l2 = Math.hypot(...d2) || 1;
    const n1 = [-d1[1] / l1, d1[0] / l1], n2 = [-d2[1] / l2, d2[0] / l2];
    let nx = n1[0] + n2[0], nz = n1[1] + n2[1];
    const ln = Math.hypot(nx, nz) || 1; nx /= ln; nz /= ln;
    const k = 1 / Math.max(0.5, nx * n1[0] + nz * n1[1]);
    out.push([b[0] + nx * desloc * k, b[1] + nz * desloc * k]);
  }
  const acum = [0];
  for (let i = 0; i < n; i++) acum.push(acum[i] + Math.hypot(out[(i + 1) % n][0] - out[i][0], out[(i + 1) % n][1] - out[i][1]));
  return { pts: out, acum, total: acum[n] };
}
function pontoNaRota(r, s) {
  s = ((s % r.total) + r.total) % r.total;
  let i = 0;
  while (r.acum[i + 1] < s) i++;
  const a = r.pts[i], b = r.pts[(i + 1) % r.pts.length], seg = r.acum[i + 1] - r.acum[i] || 1, f = (s - r.acum[i]) / seg;
  return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, dx: (b[0] - a[0]) / seg, dz: (b[1] - a[1]) / seg };
}
function criarCarros() {
  const cores = [0xd94a3d, 0x3d7ad9, 0xf2c94c, 0xffffff, 0x4cae5a, 0x8e6cff, 0xff7a00, 0x333333, 0x7fd6ff, 0xb5651d];
  let c = 0;
  for (const rota of ROTAS) {
    const r = faixaDireita(rota.pts, 2.7);
    for (let i = 0; i < rota.carros; i++) {
      const g = carro(cores[c++ % cores.length]);
      cena.add(g);
      const k = { g, rota: r, s: (r.total * i) / rota.carros + 5, vel: 9, vAtual: 9 };
      const p = pontoNaRota(r, k.s);
      g.position.set(p.x, 0.03, p.z); g.rotation.y = Math.atan2(p.dx, p.dz);
      carros.push(k);
    }
  }
}
function atualizarCarros(dt, t) {
  for (const k of carros) {
    const p = pontoNaRota(k.rota, k.s);
    const { x: px, z: pz } = p;
    const dx = Math.sin(k.g.rotation.y), dz = Math.cos(k.g.rotation.y); // para onde o carro está olhando
    const eixo = Math.abs(p.dx) > Math.abs(p.dz) ? "x" : "z";
    let alvoVel = k.vel;
    // sinal fechado no próximo cruzamento: para antes da faixa de pedestre
    for (const s of mundo.semaforos) {
      const ahead = (s.x - px) * p.dx + (s.z - pz) * p.dz, lado = Math.abs((s.x - px) * p.dz - (s.z - pz) * p.dx);
      const parada = (eixo === "z" ? s.wX : s.wZ) / 2 + 4.6;
      if (lado < 8 && ahead > parada - 1.5 && ahead < parada + 14 && luzDe(s, eixo, t) !== "verde") alvoVel = Math.min(alvoVel, Math.max(0, (ahead - parada) * 1.6));
    }
    // o Rabisco (a pé ou de carro) ou outro carro na frente: para
    const aheadJ = (j.pos.x - px) * dx + (j.pos.z - pz) * dz, ladoJ = Math.abs((j.pos.x - px) * dz - (j.pos.z - pz) * dx);
    if (aheadJ > 0 && aheadJ < 9 && ladoJ < (dentro ? 3 : 2.4)) alvoVel = Math.min(alvoVel, Math.max(0, (aheadJ - (dentro ? 5 : 3)) * 2));
    for (const v of veiculos) if (v !== dentro) {
      const a = (v.pos.x - px) * dx + (v.pos.z - pz) * dz, l = Math.abs((v.pos.x - px) * dz - (v.pos.z - pz) * dx);
      if (a > 0 && a < 9 && l < 2.6) alvoVel = Math.min(alvoVel, Math.max(0, (a - 5) * 2));
    }
    for (const o of carros) {
      if (o === k) continue;
      const a = (o.g.position.x - px) * dx + (o.g.position.z - pz) * dz, l = Math.abs((o.g.position.x - px) * dz - (o.g.position.z - pz) * dx);
      if (a > 0 && a < 9 && l < 1.8) alvoVel = Math.min(alvoVel, Math.max(0, (a - 5.5) * 2));
    }
    k.vAtual += (alvoVel - k.vAtual) * Math.min(1, dt * 3);
    k.s += k.vAtual * dt;
    k.g.position.set(px, 0.03, pz);
    const ang = Math.atan2(p.dx, p.dz);
    let d = ang - k.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    k.g.rotation.y += d * Math.min(1, dt * 6);
    // empurra o Rabisco a pé devagar se ele encostar no carro
    if (!dentro && Math.hypot(j.pos.x - px, j.pos.z - pz) < 2.4 && j.pos.y < 2) {
      const ex = j.pos.x - px, ez = j.pos.z - pz, dd = Math.hypot(ex, ez) || 1;
      j.pos.x += (ex / dd) * dt * 4; j.pos.z += (ez / dd) * dt * 4;
    }
  }
}

// ------------------------------------------------------------------ Moradores andando nas calçadas
function criarMoradores() {
  const cores = [0xe8413c, 0x58c43a, 0xffcc1f, 0x8e6cff, 0x00b5f0, 0xff7a00, 0xec2e8c, 0x9a6232];
  RUAS.filter((r) => !r.fechada && r.id !== "casas").forEach((rua, i) => {
    for (const lado of [1, -1]) {
      const p = pilotoLapis(cores[(i * 2 + (lado > 0 ? 0 : 1)) % cores.length]);
      p.scale.setScalar(0.62);
      cena.add(p);
      const segs = segmentos(rua);
      moradores.push({ p, rua, segs, lado, t: Math.random(), vel: 0.012 + Math.random() * 0.01, sentido: lado, fase: Math.random() * 6 });
    }
  });
}
function atualizarMoradores(dt, tempo) {
  for (const m of moradores) {
    m.t += m.vel * dt * m.sentido;
    if (m.t > 1) { m.t = 1; m.sentido = -1; } else if (m.t < 0) { m.t = 0; m.sentido = 1; }
    const k = Math.min(m.segs.length - 1e-6, m.t * m.segs.length), i = Math.floor(k), f = k - i;
    const [[ax, az], [bx, bz]] = m.segs[i];
    const l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / l, nz = (bx - ax) / l;
    const off = m.lado * (m.rua.w / 2 + 1.4);
    m.p.position.set(ax + (bx - ax) * f + nx * off, 0.03 + Math.abs(Math.sin(tempo * 8 + m.fase)) * 0.06, az + (bz - az) * f + nz * off);
    m.p.rotation.y = Math.atan2((bx - ax) * m.sentido, (bz - az) * m.sentido);
  }
}

// ------------------------------------------------------------------ Selos espalhados (nas calçadas e praças)
function criarSelos() {
  const texs = ["selo-rosa", "selo-azul", "selo-laranja"].map((n) => carregarTextura(`../../assets/elementos/${n}.png`));
  let n = 0;
  for (const rua of RUAS) {
    const segs = segmentos(rua);
    let acum = 0;
    for (const [[ax, az], [bx, bz]] of segs) {
      const l = Math.hypot(bx - ax, bz - az);
      for (let s = (26 - acum % 26); s < l; s += 26) {
        const nx = -(bz - az) / l, nz = (bx - ax) / l, lado = n % 2 ? 1 : -1;
        const x = ax + ((bx - ax) * s) / l + nx * lado * (rua.w / 2 + 1.5), z = az + ((bz - az) * s) / l + nz * lado * (rua.w / 2 + 1.5);
        if (bate(x, z, 0.5, 0.6)) continue;
        const m = moeda3D(texs[n % 3]);
        m.scale.setScalar(0.9);
        m.position.set(x, 1.2, z);
        cena.add(m);
        selos.push({ m, vivo: true });
        n++;
      }
      acum += l;
    }
  }
}

// ------------------------------------------------------------------ Missões
const MARCA = texturaCanvas(128, 128, (c) => { c.font = "900 110px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 12; c.strokeStyle = "#151515"; c.strokeText("!", 64, 70); c.fillStyle = "#ffcc1f"; c.fillText("!", 64, 70); });
const MARCA_OK = texturaCanvas(128, 128, (c) => { c.font = "900 96px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 12; c.strokeStyle = "#151515"; c.strokeText("?", 64, 70); c.fillStyle = "#7fd6ff"; c.fillText("?", 64, 70); });
const texNumero = (n, cor = "#ec2e8c") => texturaCanvas(128, 128, (c) => {
  c.fillStyle = "#fff"; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = "#151515"; c.stroke();
  c.font = "900 84px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = cor; c.fillText(String(n), 64, 72);
});
const lugar = (id) => mundo.lugares.find((l) => l.id === id);
function npc(nome, cor, x, z, fala) {
  [x, z] = livre(x, z, 0.8);
  const p = pilotoLapis(cor);
  p.scale.setScalar(0.8);
  p.position.set(x, 0.03, z);
  cena.add(p);
  const marca = new THREE.Sprite(new THREE.SpriteMaterial({ map: MARCA, depthTest: false }));
  marca.scale.setScalar(1.1); marca.position.set(0, 3.6, 0); marca.renderOrder = 5;
  p.add(marca);
  mundo.solidos.push({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4, y1: 2 });
  const n = { nome, p, marca, x, z, fala, ultima: -99 };
  npcs.push(n);
  return n;
}
function gatinho(x, z) {
  const g = new THREE.Group();
  const cor = new THREE.MeshStandardMaterial({ color: [0xff9f43, 0x888888, 0xffffff][Math.floor(Math.random() * 3)], roughness: 0.9 });
  const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 10), cor); corpo.scale.set(1, 0.8, 1.4); corpo.position.y = 0.35;
  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), cor); cab.position.set(0, 0.62, 0.38);
  for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), cor); o.position.set(s * 0.13, 0.86, 0.38); g.add(o); }
  const rabo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), cor); rabo.position.set(0, 0.6, -0.5); rabo.rotation.x = -0.6;
  for (const s of [-1, 1]) { const olho = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0x151515 })); olho.position.set(s * 0.09, 0.68, 0.6); g.add(olho); }
  for (const m of [corpo, cab, rabo]) m.castShadow = true;
  g.add(corpo, cab, rabo);
  g.position.set(x, 0.03, z);
  cena.add(g);
  return g;
}
function patinho() {
  const g = new THREE.Group();
  const amarelo = new THREE.MeshStandardMaterial({ color: Math.random() < 0.5 ? 0xffd84a : 0xffffff, roughness: 0.7 });
  const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), amarelo); corpo.scale.set(1, 0.7, 1.3); corpo.position.y = 0.2;
  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), amarelo); cab.position.set(0, 0.62, 0.38);
  const bico = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 8), new THREE.MeshStandardMaterial({ color: 0xff8a1f })); bico.rotation.x = Math.PI / 2; bico.position.set(0, 0.6, 0.66);
  for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0x151515 })); o.position.set(s * 0.13, 0.7, 0.55); g.add(o); }
  g.add(corpo, cab, bico);
  return g;
}
function bau() {
  const g = new THREE.Group();
  const madeira = new THREE.MeshStandardMaterial({ color: 0x9a6232, roughness: 0.7 });
  const ouro = new THREE.MeshStandardMaterial({ color: 0xffcc1f, metalness: 0.5, roughness: 0.35, emissive: 0x332200 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.8), madeira); base.position.y = 0.35; base.castShadow = true;
  const tampa = new THREE.Group(); tampa.position.set(0, 0.7, -0.4);
  const t = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.3, 0.84), madeira); t.position.set(0, 0.15, 0.4); tampa.add(t);
  const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 0.86), ouro); faixa.position.set(0, 0.15, 0.4); tampa.add(faixa);
  const fecho = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.06), ouro); fecho.position.set(0, 0.55, 0.42);
  g.add(base, tampa, fecho);
  g.userData.tampa = tampa;
  return g;
}
function foguinho() {
  const g = new THREE.Group();
  const cores = [0xff3d1f, 0xff8a1f, 0xffd84a];
  const chamas = cores.map((c, i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.7 - i * 0.18, 1.8 - i * 0.4, 8), new THREE.MeshBasicMaterial({ color: c })); m.position.y = (1.8 - i * 0.4) / 2; g.add(m); return m; });
  const lixeira = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.9, 12), new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.6 }));
  lixeira.position.y = 0.45; g.add(lixeira);
  for (const c of chamas) c.position.y += 0.8;
  g.userData.chamas = chamas;
  return g;
}
function bandeira(n) {
  // pórtico redondo com o número (corrida): visto de longe, gira devagar
  const g = new THREE.Group();
  const aro = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.35, 10, 32), new THREE.MeshStandardMaterial({ color: 0xec2e8c, emissive: 0x551133, roughness: 0.4 }));
  aro.position.y = 3.6; g.add(aro);
  const num = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNumero(n), depthTest: true }));
  num.scale.setScalar(2.4); num.position.y = 3.6; g.add(num);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.6, 8), new THREE.MeshStandardMaterial({ color: 0xffffff })); p.position.set(s * 3.4, 1.4, 0); g.add(p); }
  g.userData.aro = aro;
  return g;
}
function placaNumero(n) {
  const g = new THREE.Group();
  const piso = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0x00b5f0, roughness: 0.5 }));
  piso.position.y = 0.06; g.add(piso);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNumero(n, "#1d6fe0") }));
  sp.scale.setScalar(1.2); sp.position.y = 2.2; g.add(sp);
  return g;
}
// pedacinho de "água" que sai da mangueira (bolinhas azuis)
const gotas = [];
function soltarGota(de, para) {
  let g = gotas.find((q) => q.vida <= 0);
  if (!g) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: 0x7fd6ff })); cena.add(m); g = { m, vida: 0 }; gotas.push(g); }
  g.m.visible = true; g.m.position.copy(de);
  g.vel = para.clone().sub(de).multiplyScalar(2.2).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 3, (Math.random() - 0.5) * 1.5));
  g.vida = 0.5;
}
function atualizarGotas(dt) {
  for (const g of gotas) { if (g.vida <= 0) continue; g.vida -= dt; g.vel.y -= 14 * dt; g.m.position.addScaledVector(g.vel, dt); if (g.vida <= 0) g.m.visible = false; }
}

// a missão que está "em foco" mostra o alvo piscando no mapa e a seta no alto da tela
function aceitar(M) { M.estado = "ativa"; foco = M.id; }
function criarMissoes() {
  const L = (id) => lugar(id);
  const atras = (l, dist) => [l.x - l.dir[0] * dist, l.z - l.dir[1] * dist];
  const naPorta = (l, lado = 6) => [l.x + l.dir[1] * lado + l.dir[0] * 1.5, l.z - l.dir[0] * lado + l.dir[1] * 1.5];

  // 1. cartas: pegar no correio e pôr na caixa de correio da casa da mesma cor
  missoes.cartas = { id: "cartas", nome: "Cartas", icone: "✉️", estado: "nova", entregues: [], npc: npc("Lápis Azul, o carteiro", 0x1d6fe0, ...naPorta(L("correio")), "cid-carteiro"),
    texto: "Oi, Rabisco! Leve estas cartas: a vermelha, a azul e a amarela. Cada uma vai na caixa de correio da casa da mesma cor! As casas ficam na Rua das Casas Coloridas.",
    alvo() { const c = mundo.casas.filter((q) => ["vermelha", "azul", "amarela"].includes(q.cor) && !this.entregues.includes(q.cor)).sort((a, b) => dist2(a) - dist2(b))[0]; return c && { x: c.x, z: c.z, emoji: "✉️" }; } };
  // 2. gatinhos escondidos pela cidade (atrás da igreja, no parque e atrás do hospital)
  const lugaresGatos = [atras(L("igreja"), 30), [60, 88], atras(L("hospital"), 24)].map(([x, z]) => livre(x, z, 0.6));
  missoes.gatos = { id: "gatos", nome: "Gatinhos", icone: "🐱", estado: "nova", achados: 0, npc: npc("Lápis Rosa", 0xec2e8c, PRACA.x + 7.5, PRACA.z + 3, "cid-gatos"),
    texto: "Meus três gatinhos fugiram! Um foi para trás da igreja, outro para o parque e outro para trás do hospital.",
    lugares: lugaresGatos.map(([x, z]) => ({ x, z, achado: false, g: gatinho(x, z) })),
    alvo() { const l = this.lugares.filter((q) => !q.achado).sort((a, b) => dist2(a) - dist2(b))[0]; return l && { x: l.x, z: l.z, emoji: "🐱" }; } };
  // 3. pão quentinho da padaria para a escola
  missoes.pao = { id: "pao", nome: "Pão", icone: "🥖", estado: "nova", npc: npc("Lápis Laranja, o padeiro", 0xff7a00, ...naPorta(L("padaria")), "cid-padeiro"), destino: L("escola"),
    texto: "Pão quentinho! Você leva para a escola? As crianças vão adorar o lanche!",
    alvo() { return { x: this.destino.x, z: this.destino.z, emoji: "🏫" }; } };
  // 4. atravessar na faixa com o bonequinho verde (3 vezes)
  missoes.faixa = { id: "faixa", nome: "Faixa", icone: "🚸", estado: "nova", vezes: 0, npc: npc("Lápis Amarelo, o guarda", 0xffcc1f, 80.5, 10.5, "cid-guarda"),
    texto: "Olá! Atravesse a rua na faixa de pedestre, a pé, mas só quando o bonequinho do semáforo ficar verde. Três vezes!",
    alvo() { const f = [...mundo.faixas].sort((a, b) => dist2(centroFaixa(a)) - dist2(centroFaixa(b)))[0]; return f && { ...centroFaixa(f), emoji: "🚸" }; } };
  // 5. corrida dos números: de carro, bandeiras de 1 a 5 em ordem, contra o tempo
  const pontos = [[40, 2.7], [74.7, -35], [36, -72.7], [-74.7, -35], [-36, 2.7]];
  missoes.corrida = { id: "corrida", nome: "Corrida", icone: "🏁", estado: "nova", proxima: 0, tempo: 0, npc: npc("Lápis Verde, a piloto", 0x2bb24c, LARGADA.x - 1, LARGADA.z + 16, "cid-corrida"),
    texto: "Oi, Rabisco! Pegue o carro e passe pelas bandeiras na ordem: 1, 2, 3, 4 e 5! O relógio começa na bandeira 1.",
    bandeiras: pontos.map(([x, z], i) => { const g = bandeira(i + 1); g.position.set(x, 0, z); g.rotation.y = Math.abs(z) < 5 || Math.abs(z + 72.7) < 1 ? Math.PI / 2 : 0; g.visible = false; cena.add(g); return { x, z, g }; }),
    alvo() { if (!dentro) return carroMaisPerto(); const b = this.bandeiras[this.proxima]; return b && { x: b.x, z: b.z, emoji: String(this.proxima + 1) }; } };
  // 6. encomenda: a caixa de frutas só cabe no carro (mercado → casa da Vovó)
  const vovo = mundo.casas.find((c) => c.vovo);
  missoes.encomenda = { id: "encomenda", nome: "Encomenda", icone: "📦", estado: "nova", noCarro: false, npc: npc("Seu Lápis Marrom, o feirante", 0x9a6232, ...naPorta(L("mercado")), "cid-encomenda"),
    texto: "Esta caixa de frutas é grande demais para levar a pé! Venha de carro e leve para a casa da Vovó Lápis, a casa laranja perto da Rua Leste.",
    destino: { x: vovo.porta[0] - 3, z: vovo.porta[1] },
    alvo() { if (!this.noCarro) return dentro ? { x: this.npc.x, z: this.npc.z, emoji: "📦" } : carroMaisPerto(); return dentro ? { ...this.destino, emoji: "👵" } : carroMaisPerto(); } };
  // 7. bombeiros: quatro foguinhos para apagar com o botão da água
  const lugaresFogo = [[-22, -82], [22, 86], [-52, 47], [92, -40]].map(([x, z]) => livre(x, z, 1.2));
  missoes.fogo = { id: "fogo", nome: "Bombeiros", icone: "🚒", estado: "nova", apagados: 0, npc: npc("Capitão Lápis Vermelho, o bombeiro", 0xe63946, ...naPorta(L("bombeiros")), "cid-bombeiro"),
    texto: "Socorro! Tem quatro foguinhos na cidade. Chegue pertinho e aperte o botão da água!",
    fogos: lugaresFogo.map(([x, z]) => { const g = foguinho(); g.position.set(x, 0.03, z); g.visible = false; cena.add(g); mundo.solidos.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5, y1: 0.9 }); return { x, z, g, agua: 0, perto: 0, apagado: false }; }),
    alvo() { const f = this.fogos.filter((q) => !q.apagado).sort((a, b) => dist2(a) - dist2(b))[0]; return f && { x: f.x, z: f.z, emoji: "🔥" }; } };
  // 8. caça ao tesouro: adivinhas que levam de um lugar para o outro
  const PISTAS = [
    { onde: naPorta(L("igreja"), -6), texto: "Primeira pista: procure onde o sino toca e a gente agradece a Deus!", fala: "cid-tesouro" },
    { onde: [PRACA.x + 6.5, PRACA.z - 2], texto: "Achou! Próxima pista: onde a água dança no meio da cidade.", fala: "cid-pista-2" },
    { onde: [20, 90], texto: "Muito bem! Agora vá ao playground, onde tem balanço e escorregador.", fala: "cid-pista-3" },
    { onde: naPorta(L("padaria"), -6), texto: "Quase lá! A última pista: onde se faz o pão quentinho.", fala: "cid-pista-4" },
  ];
  missoes.tesouro = { id: "tesouro", nome: "Tesouro", icone: "🗝️", estado: "nova", pista: 0, npc: npc("Professora Lápis Roxa", 0x8e6cff, ...naPorta(L("biblioteca"), 7), "cid-tesouro"),
    texto: "Vamos fazer uma caça ao tesouro? " + PISTAS[0].texto, pistas: PISTAS,
    baus: PISTAS.map((p) => { const [x, z] = livre(...p.onde, 0.8); const g = bau(); g.position.set(x, 0.03, z); g.visible = false; cena.add(g); return { x, z, g }; }),
    alvo() { const b = this.baus[this.pista]; return b && { x: b.x, z: b.z, emoji: "🗝️" }; } };
  // 9. patinhos do lago: contar e pisar no número certo
  const nPatos = 3 + Math.floor(Math.random() * 5);
  const opcoes = [nPatos - 1, nPatos, nPatos + 1].sort(() => Math.random() - 0.5);
  const donaPatos = npc("Dona Lápis Azul", 0x00b5f0, LAGO.x - 14, LAGO.z - 8, "cid-patos");
  missoes.patos = { id: "patos", nome: "Patinhos", icone: "🦆", estado: "nova", n: nPatos, npc: donaPatos,
    texto: "Quantos patinhos estão nadando no lago? Conte bem e pise no número certo, aqui do meu lado!",
    patos: Array.from({ length: nPatos }, (_, i) => { const g = patinho(); cena.add(g); return { g, a: (i / nPatos) * Math.PI * 2, r: 3 + (i % 3) * 2.2, v: 0.25 + Math.random() * 0.2 }; }),
    placas: opcoes.map((n, i) => { const [x, z] = livre(donaPatos.x - 3 + i * 3, donaPatos.z - 4, 1.1); const g = placaNumero(n); g.position.set(x, 0.03, z); g.visible = false; cena.add(g); return { n, x, z, g, dentro: false }; }),
    alvo() { return { x: LAGO.x, z: LAGO.z, emoji: "🦆" }; } };
  // 10. passaporte: visitar todos os lugares
  missoes.passaporte = { id: "passaporte", nome: "Passeio", icone: "🗺️", estado: "ativa",
    alvo() { const l = mundo.lugares.filter((q) => !visitados.has(q.id)).sort((a, b) => dist2(a) - dist2(b))[0]; return l && { x: l.x, z: l.z, emoji: "📍" }; } };
  preCarregarFalas(["cid-intro", "cid-carteiro", "cid-gatos", "cid-padeiro", "cid-guarda", "cid-carta-ok", "cid-gato-ok", "cid-pao-ok", "cid-faixa-ok", "cid-espere", "cid-missao-ok", "cid-final"]); // as falas das missões novas (cid-carro, cid-corrida...) tocam sob demanda
}
const dist2 = (p) => (p.x - j.pos.x) ** 2 + (p.z - j.pos.z) ** 2;
const centroFaixa = (f) => ({ x: (f.x0 + f.x1) / 2, z: (f.z0 + f.z1) / 2 });
function carroMaisPerto() {
  const v = [...veiculos].sort((a, b) => dist2(a.pos) - dist2(b.pos))[0];
  return v && { x: v.pos.x, z: v.pos.z, emoji: "🚗" };
}
function alvoAtual() {
  const M = foco && missoes[foco];
  if (M && M.estado === "ativa") return M.alvo();
  // sem missão em foco: o amigo com "!" mais perto
  const n = npcs.filter((q) => q.marca.visible && Object.values(missoes).some((m) => m.npc === q && m.estado === "nova")).sort((a, b) => dist2(a) - dist2(b))[0];
  return n ? { x: n.x, z: n.z, emoji: "❗" } : missoes.passaporte.alvo();
}
function dizer(nome, texto, ms = 5200) {
  balao.innerHTML = `<b>${nome}</b>${texto}`;
  balao.classList.add("ativo");
  clearTimeout(dizer.t);
  dizer.t = setTimeout(() => balao.classList.remove("ativo"), ms);
}
let carregando = null; // o pão
let contexto = null;   // o que o botão de ação faz agora: { tipo, rotulo, fazer }
function regras(dt, t) {
  const perto = (x, z, r) => Math.hypot(j.pos.x - x, j.pos.z - z) < r;
  const aPe = !dentro;
  contexto = null;
  // conversar: é só chegar perto (a pé ou de carro)
  for (const n of npcs) {
    n.p.rotation.y = Math.atan2(j.pos.x - n.x, j.pos.z - n.z);
    n.marca.position.y = 3.6 + Math.sin(t * 3) * 0.15;
    if (perto(n.x, n.z, dentro ? 5 : 3) && t - n.ultima > 8) { n.ultima = t; conversar(n); }
  }
  // cartas: caixa de correio da cor certa (a pé)
  const C = missoes.cartas;
  if (C.estado === "ativa" && aPe) for (const casa of mundo.casas) {
    if (C.entregues.includes(casa.cor) || !["vermelha", "azul", "amarela"].includes(casa.cor)) continue;
    if (perto(casa.x, casa.z, 2.6)) {
      C.entregues.push(casa.cor);
      casa.correio.scale.setScalar(1.3); setTimeout(() => casa.correio.scale.setScalar(1), 400);
      sons.moeda(); falar("cid-carta-ok");
      dizer("Lápis Azul, o carteiro", `Carta entregue na casa ${casa.cor}!`, 2600);
      if (C.entregues.length === 3) concluir(C);
      atualizarHud();
    }
  }
  // gatinhos
  const G = missoes.gatos;
  if (G.estado === "ativa") for (const l of G.lugares) {
    if (l.achado) continue;
    l.g.rotation.y = Math.sin(t * 2) * 0.6;
    if (perto(l.x, l.z, 2.2)) { l.achado = true; G.achados++; sons.letra(); falar("cid-gato-ok"); dizer("Lápis Rosa", "Achou um gatinho! Miau!", 2400); l.g.visible = false; if (G.achados === 3) concluir(G); atualizarHud(); }
  }
  // pão para a escola
  const P = missoes.pao;
  if (P.estado === "ativa" && perto(P.destino.x, P.destino.z, 6)) { concluir(P); falar("cid-pao-ok"); dizer("Escola", "Que cheirinho bom! Obrigado pelo pão, Rabisco!", 3600); carregando = null; }
  // faixa de pedestre: atravessar a pé com o bonequinho verde
  const F = missoes.faixa;
  if (F.estado === "ativa" && aPe) {
    const fx = mundo.faixas.find((q) => j.pos.x > q.x0 && j.pos.x < q.x1 && j.pos.z > q.z0 && j.pos.z < q.z1);
    if (fx && !F.dentro) {
      const seguro = luzDe(fx.cruz, fx.atravessa, t) === "vermelho"; // os carros da rua que ela cruza estão parados
      F.dentro = { fx, seguro, de: fx.atravessa === "z" ? j.pos.x : j.pos.z };
      if (!seguro) { falar("cid-espere"); dizer("Lápis Amarelo, o guarda", "Espere o bonequinho verde para atravessar!", 2800); }
    } else if (!fx && F.dentro) {
      const d = F.dentro, agora = d.fx.atravessa === "z" ? j.pos.x : j.pos.z;
      if (d.seguro && Math.abs(agora - d.de) > d.fx.largura * 0.7) { F.vezes++; sons.moeda(); falar("cid-faixa-ok"); dizer("Lápis Amarelo, o guarda", `Muito bem! Atravessou certinho (${F.vezes} de 3).`, 2600); if (F.vezes >= 3) concluir(F); atualizarHud(); }
      F.dentro = null;
    }
  }
  // corrida dos números
  const R = missoes.corrida;
  if (R.estado === "ativa") {
    R.bandeiras.forEach((b, i) => { b.g.visible = i >= R.proxima; b.g.userData.aro.material.emissiveIntensity = i === R.proxima ? 1 + Math.sin(t * 8) : 0.3; b.g.userData.aro.rotation.z = t; });
    if (R.proxima > 0) {
      R.tempo -= dt;
      if (R.tempo <= 0) { R.proxima = 0; falar("cid-corrida-tempo"); dizer("Lápis Verde, a piloto", "Acabou o tempo! Vamos de novo? Comece pela bandeira 1.", 3600); atualizarHud(); }
    }
    const b = R.bandeiras[R.proxima];
    if (b && perto(b.x, b.z, 6.5)) {
      if (!dentro && R.proxima === 0) { if (t - (R.avisou || -9) > 6) { R.avisou = t; dizer("Lápis Verde, a piloto", "A corrida é de carro! Pegue o carro e volte aqui.", 3000); } }
      else {
        R.proxima++; sons.volta(); falar(`cid-num-${R.proxima}`);
        if (R.proxima === 1) R.tempo = 75;
        if (R.proxima === R.bandeiras.length) { concluir(R); falar("cid-corrida-ok"); dizer("Lápis Verde, a piloto", `Que corrida! 1, 2, 3, 4, 5: você passou por todas as bandeiras! (sobraram ${Math.ceil(R.tempo)} segundos)`, 4200); }
        atualizarHud();
      }
    }
  }
  // encomenda: carregar no mercado de carro e levar para a Vovó
  const E = missoes.encomenda;
  if (E.estado === "ativa") {
    if (!E.noCarro && perto(E.npc.x, E.npc.z, dentro ? 8 : 3.2)) {
      if (dentro) {
        E.noCarro = dentro;
        const cx = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1), new THREE.MeshStandardMaterial({ color: 0xc9a46b, roughness: 0.8 }));
        cx.position.set(0, 1.85, -1.75); dentro.g.add(cx); dentro.caixa = cx;
        for (const [x, c] of [[-0.35, 0xff8a1f], [0, 0xffd84a], [0.35, 0xff8a1f]]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: c })); f.position.set(x, 0.45, 0); cx.add(f); }
        sons.moeda(); falar("cid-caixa-carro"); dizer("Seu Lápis Marrom, o feirante", "A caixa de frutas está no carro! Agora, para a casa da Vovó. Siga a seta!", 3600);
        atualizarHud();
      } else if (t - (E.avisou || -9) > 7) { E.avisou = t; falar("cid-caixa-pe"); dizer("Seu Lápis Marrom, o feirante", "A caixa é pesada! Volte aqui de carro.", 3000); }
    }
    if (E.noCarro && dentro === E.noCarro && perto(E.destino.x, E.destino.z, 8)) {
      dentro.caixa?.removeFromParent(); dentro.caixa = null;
      concluir(E); falar("cid-encomenda-ok"); dizer("Vovó Lápis", "Obrigada, Rabisco! Vamos contar: cinco laranjas e três bananas! Deus abençoe você!", 4800);
    }
  }
  // bombeiros: chegar pertinho do foguinho e jogar água (botão de ação ou esperando um pouquinho)
  const B = missoes.fogo;
  if (B.estado === "ativa") for (const f of B.fogos) {
    if (f.apagado) continue;
    f.g.visible = true;
    f.g.userData.chamas.forEach((c, i) => { c.scale.set(1 + Math.sin(t * 12 + i) * 0.12, (1 + Math.sin(t * 9 + i * 2) * 0.18) * Math.max(0.15, 1 - f.agua / 1.2), 1 + Math.cos(t * 11 + i) * 0.12); });
    if (aPe && perto(f.x, f.z, 3.6)) {
      contexto = { tipo: "agua", rotulo: "💧 Água", fazer: () => { f.jato = 1.3; } };
      f.perto += dt;
      if (f.perto > 3) f.jato = Math.max(f.jato || 0, 0.1); // espera um pouquinho: a água sai sozinha
    } else f.perto = 0;
    if (f.jato > 0) {
      f.jato -= dt; f.agua += dt;
      if (Math.random() < 0.7) soltarGota(new THREE.Vector3(j.pos.x, 1.3, j.pos.z), new THREE.Vector3(f.x, 1, f.z));
      if (f.agua >= 1.2) {
        f.apagado = true; f.g.userData.chamas.forEach((c) => (c.visible = false)); B.apagados++;
        sons.moeda(); falar("cid-fogo-ok"); dizer("Capitão Lápis Vermelho, o bombeiro", `Fogo apagado! (${B.apagados} de 4)`, 2400);
        if (B.apagados === 4) { concluir(B); setTimeout(() => { falar("cid-bombeiro-ok"); dizer("Capitão Lápis Vermelho, o bombeiro", "A cidade está segura! Obrigado, Deus, por cuidar de nós!", 4200); }, 1500); }
        atualizarHud();
      }
    }
  }
  // caça ao tesouro
  const T = missoes.tesouro;
  if (T.estado === "ativa") {
    const b = T.baus[T.pista];
    if (b) {
      b.g.visible = true; b.g.position.y = 0.03 + Math.abs(Math.sin(t * 3)) * 0.12;
      if (perto(b.x, b.z, 2.4)) {
        b.g.userData.tampa.rotation.x = -1.2; sons.porta();
        T.pista++;
        const prox = T.pistas[T.pista];
        if (prox) { setTimeout(() => { b.g.visible = false; }, 1500); falar(prox.fala); dizer("Pista do tesouro", prox.texto, 6000); }
        else { selosPegos += 10; jogo.confete(); concluir(T); falar("cid-tesouro-ok"); dizer("Professora Lápis Roxa", "Você achou o tesouro: um livro de histórias e 10 selos! Mas o maior tesouro é o amor de Deus.", 6000); }
        atualizarHud();
      }
    }
  }
  // patinhos: nadam em roda no lago; com a missão ativa, as placas de número aparecem
  const D = missoes.patos;
  D.patos.forEach((p) => { p.a += p.v * dt; p.g.position.set(LAGO.x + Math.cos(p.a) * p.r, 0.06 + Math.sin(t * 3 + p.a) * 0.03, LAGO.z + Math.sin(p.a) * p.r); p.g.rotation.y = -p.a; });
  if (D.estado === "ativa") for (const pl of D.placas) {
    pl.g.visible = true;
    const em = aPe && perto(pl.x, pl.z, 1.3);
    if (em && !pl.dentro) {
      if (pl.n === D.n) { concluir(D); falar("cid-patos-ok"); dizer("Dona Lápis Azul", `Isso mesmo! ${D.n} patinhos! Em inglês, pato é duck. Quack, quack!`, 4600); D.placas.forEach((q) => (q.g.visible = false)); }
      else { sons.erro(); falar("cid-patos-erro"); dizer("Dona Lápis Azul", "Hmm, conte de novo, devagarinho.", 2600); }
    }
    pl.dentro = em;
  }
  // passaporte: chegar perto de cada lugar
  for (const l of mundo.lugares) {
    if (visitados.has(l.id) || !perto(l.x, l.z, l.raio)) continue;
    visitados.add(l.id);
    sons.volta();
    jogo.aviso(`📍 ${l.nome}`, "bom", 1800);
    falar(`cid-lugar-${l.id}`);
    // a criança comenta pelo nome (balão + fala gravada com o nome, depois da fala do lugar)
    if (companheiro) {
      const texto = FRASES_LUGAR[Math.floor(Math.random() * FRASES_LUGAR.length)].replaceAll("{lugar}", l.nome);
      setTimeout(() => { dizer(companheiro.crianca.nome, texto.replaceAll("{nome}", companheiro.crianca.nome), 3200); falarNome("lug-pre", "lug-pos"); }, 2200);
    }
    if (visitados.size === mundo.lugares.length) concluir(missoes.passaporte);
    atualizarHud();
  }
  // selos
  for (const s of selos) {
    if (!s.vivo) continue;
    s.m.rotation.y = t * 3;
    const pegaJ2 = dois && !dentro && companheiro && Math.hypot(amigo.pos.x - s.m.position.x, amigo.pos.z - s.m.position.z) < 1.2 && amigo.pos.y < 2.5;
    if (pegaJ2 || (Math.hypot(j.pos.x - s.m.position.x, j.pos.z - s.m.position.z) < (dentro ? 2 : 1.2) && j.pos.y < 2.5)) { s.vivo = false; s.m.visible = false; selosPegos++; sons.moeda(); atualizarHud(); }
  }
  // carros: a pé perto de um carro, o botão entra; dirigindo, o botão sai (parado)
  if (!contexto) {
    if (aPe) { const v = pertoDeCarro(); if (v) contexto = { tipo: "entrar", rotulo: "🚗 Entrar", fazer: () => entrarNoCarro(v) }; }
    else contexto = { tipo: "sair", rotulo: Math.abs(dentro.vel) > 3 ? "🛑 Pare para sair" : "🚪 Sair", fazer: () => sairDoCarro() };
  }
  if (pad.acaoNova) { pad.acaoNova = false; contexto?.fazer(); }
  for (const v of veiculos) if (v !== dentro) animarCarro(v, dt);
}
const NOMES_MISSAO = { cartas: "cartas", gatos: "gatos", pao: "pao", faixa: "faixa", corrida: "corrida", encomenda: "encomenda", fogo: "fogo", tesouro: "tesouro", patos: "patos" };
function conversar(n) {
  const M = Object.values(missoes).find((m) => m.npc === n);
  if (!M) return;
  if (M.estado === "nova") {
    aceitar(M);
    n.marca.material.map = MARCA_OK; n.marca.material.needsUpdate = true;
    falar(n.fala);
    dizer(n.nome, M.texto, 7600);
    if (M === missoes.pao) carregando = "pao";
    setTimeout(() => jogo.aviso(`${M.icone} Siga a seta ➤`, "bom", 2200), 7800);
    atualizarHud();
  } else if (M.estado === "ativa") {
    foco = M.id;
    if (M === missoes.patos) dizer(n.nome, "Conte os patinhos do lago e pise no número certo aqui do meu lado!", 3000);
    else dizer(n.nome, "Você consegue, Rabisco! Estou esperando aqui.", 2600);
  } else {
    dizer(n.nome, "Obrigado pela ajuda, Rabisco!", 2400);
  }
}
const FRASES_LUGAR = ["Olha, {nome}! Chegamos: {lugar}!", "{nome}, que legal! Esse lugar é {lugar}!", "Uau, {nome}! Vamos conhecer: {lugar}!"];
function concluir(M) {
  if (M.estado === "feita") return;
  M.estado = "feita";
  if (foco === M.id) foco = Object.values(missoes).find((m) => m.estado === "ativa" && m.id !== "passaporte")?.id ?? null;
  if (companheiro) setTimeout(() => parabenizar({ gravada: false }), 900);
  if (M.npc) M.npc.marca.visible = false;
  sons.porta();
  setTimeout(() => { jogo.aviso(`${M.icone} Missão cumprida!`, "bom", 2200); falar("cid-missao-ok"); }, 600);
  atualizarHud();
  if (Object.values(missoes).every((m) => m.estado === "feita")) {
    fim = true;
    setTimeout(() => { sons.vitoria(); falar("cid-final"); jogo.confete(); }, 1600);
    setTimeout(() => jogo.vencer({ titulo: "Amigo da cidade!", estrelas: selosPegos >= selos.length * 0.75 ? 3 : selosPegos >= selos.length * 0.4 ? 2 : 1, texto: `Você ajudou todo mundo e juntou ${selosPegos} selos!`, proximo: false }), 5200);
  }
}
void NOMES_MISSAO;

// ------------------------------------------------------------------ HUD, bússola e mapas
function atualizarHud() {
  if (!hud) return;
  const lista = Object.values(missoes);
  const extra = (m) => {
    if (m.estado !== "ativa") return "";
    if (m.id === "cartas") return ` <small>${["vermelha", "azul", "amarela"].map((c) => `<i class="carta ${c} ${m.entregues.includes(c) ? "ok" : ""}"></i>`).join("")}</small>`;
    if (m.id === "gatos") return ` <small>${"🐱".repeat(m.achados)}${"·".repeat(3 - m.achados)}</small>`;
    if (m.id === "pao") return carregando ? " <small>🥖</small>" : "";
    if (m.id === "faixa") return ` <small>${"✔".repeat(m.vezes)}${"·".repeat(3 - m.vezes)}</small>`;
    if (m.id === "corrida") return ` <small>${m.proxima}/5${m.proxima > 0 ? ` ⏱️${Math.ceil(m.tempo)}` : ""}</small>`;
    if (m.id === "encomenda") return m.noCarro ? " <small>📦→👵</small>" : " <small>🚗→📦</small>";
    if (m.id === "fogo") return ` <small>${"💧".repeat(m.apagados)}${"🔥".repeat(4 - m.apagados)}</small>`;
    if (m.id === "tesouro") return ` <small>pista ${Math.min(4, m.pista + 1)}/4</small>`;
    if (m.id === "passaporte") return ` <small>${visitados.size}/${mundo.lugares.length}</small>`;
    return "";
  };
  const item = (m) => `<li class="${m.estado}${foco === m.id ? " foco" : ""}"><span>${m.icone}</span>${m.nome}${extra(m)}${m.estado === "feita" ? " ✔" : ""}</li>`;
  const feitas = lista.filter((m) => m.estado === "feita").length;
  hud.innerHTML = `<ul>${lista.map(item).join("")}</ul><div class="selos-cidade">🏅 ${selosPegos} · ⭐ ${feitas}/${lista.length}</div>`;
}
const PISCA = ["#ff2a6a", "#ffcc1f"];
function desenharCidade(c, S, { nomes = false } = {}) {
  const k = S / ((BORDA + 14) * 2);
  const P = (x, z) => [S / 2 + x * k, S / 2 + z * k];
  const t = relogio?.elapsedTime ?? 0;
  c.clearRect(0, 0, S, S);
  c.fillStyle = "rgba(95,168,63,0.94)"; c.fillRect(0, 0, S, S);
  // parque e lago
  c.fillStyle = "#4f9a3a"; const [px0, pz0] = P(PARQUE.x0, PARQUE.z0); c.fillRect(px0, pz0, (PARQUE.x1 - PARQUE.x0) * k, (PARQUE.z1 - PARQUE.z0) * k);
  c.fillStyle = "#3aa7f0"; c.beginPath(); c.arc(...P(LAGO.x, LAGO.z), LAGO.r * k, 0, 7); c.fill();
  // prédios (cinza claro)
  c.fillStyle = "rgba(235,228,214,0.85)";
  for (const s of mundo.solidos) if (s.y1 > 6 && s.x1 - s.x0 > 4) { const [x0, z0] = P(s.x0, s.z0); c.fillRect(x0, z0, (s.x1 - s.x0) * k, (s.z1 - s.z0) * k); }
  // ruas: calçada clara por baixo, asfalto por cima
  c.lineCap = c.lineJoin = "round";
  for (const [extra, cor] of [[6, "#d8d2c4"], [0, "#555b63"]]) for (const r of RUAS) {
    c.beginPath();
    r.pts.forEach((p, i) => (i ? c.lineTo(...P(...p)) : c.moveTo(...P(...p))));
    if (r.fechada) c.closePath();
    c.lineWidth = (r.w + extra) * k; c.strokeStyle = cor; c.stroke();
  }
  c.fillStyle = "#7fbf5a"; c.beginPath(); c.arc(...P(PRACA.x, PRACA.z), 12.5 * k, 0, 7); c.fill();
  c.fillStyle = "#7fd6ff"; c.beginPath(); c.arc(...P(PRACA.x, PRACA.z), 4 * k, 0, 7); c.fill();
  // lugares
  for (const l of mundo.lugares) {
    const [x, y] = P(l.x, l.z);
    c.fillStyle = visitados.has(l.id) ? "#ffcc1f" : "#ffffff"; c.strokeStyle = "#151515"; c.lineWidth = Math.max(1, S / 180);
    c.beginPath(); c.arc(x, y, S / 60, 0, 7); c.fill(); c.stroke();
    if (nomes) { c.font = `800 ${Math.round(S / 40)}px 'Baloo 2', sans-serif`; c.textAlign = "center"; c.lineWidth = 4; c.strokeStyle = "#fff"; c.strokeText(l.nome, x, y - S / 45); c.fillStyle = "#151515"; c.fillText(l.nome, x, y - S / 45); }
  }
  // amigos com missão nova
  for (const n of npcs) { if (!n.marca.visible || !Object.values(missoes).some((m) => m.npc === n && m.estado === "nova")) continue; const [x, y] = P(n.x, n.z); c.fillStyle = "#ffcc1f"; c.strokeStyle = "#151515"; c.lineWidth = 3; c.font = `900 ${Math.round(S / 11)}px 'Baloo 2'`; c.textAlign = "center"; c.strokeText("!", x, y + S / 40); c.fillText("!", x, y + S / 40); }
  // carros que dá para dirigir
  for (const v of veiculos) {
    const [x, y] = P(v.pos.x, v.pos.z);
    c.save(); c.translate(x, y); c.rotate(Math.PI - v.ang);
    c.fillStyle = `#${new THREE.Color(v.g.children[0].material.color).getHexString()}`; c.strokeStyle = "#151515"; c.lineWidth = 1.5;
    c.fillRect(-S / 90, -S / 55, S / 45, S / 27.5); c.strokeRect(-S / 90, -S / 55, S / 45, S / 27.5);
    c.restore();
  }
  // alvo da missão: piscando (anel que cresce + bolinha que troca de cor) e o emoji
  const a = alvoAtual();
  if (a) {
    const [x, y] = P(a.x, a.z);
    const f = (t * 1.6) % 1;
    c.strokeStyle = PISCA[0]; c.lineWidth = Math.max(2, S / 70); c.globalAlpha = 1 - f;
    c.beginPath(); c.arc(x, y, S / 40 + f * S / 12, 0, 7); c.stroke(); c.globalAlpha = 1;
    c.fillStyle = PISCA[Math.floor(t * 4) % 2]; c.strokeStyle = "#151515"; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, S / 32, 0, 7); c.fill(); c.stroke();
    c.font = `${Math.round(S / 14)}px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif`; c.textAlign = "center"; c.textBaseline = "alphabetic";
    if (Math.floor(t * 4) % 2 === 0) c.fillText(a.emoji, x, y - S / 26);
  }
  // o Rabisco (seta rosa)
  const [x, y] = P(j.pos.x, j.pos.z);
  c.save(); c.translate(x, y); c.rotate(-j.dir + Math.PI);
  const e = S / 22;
  c.fillStyle = "#ec2e8c"; c.strokeStyle = "#151515"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, -e); c.lineTo(e * 0.75, e * 0.75); c.lineTo(-e * 0.75, e * 0.75); c.closePath(); c.fill(); c.stroke();
  c.restore();
}
function desenharMapa() { desenharCidade(mapa.getContext("2d"), 200); }
function alternarMapaGrande() {
  if (!mapaGrande) return;
  mapaGrande.hidden = !mapaGrande.hidden;
  if (!mapaGrande.hidden) {
    desenharCidade(mapaGrande.querySelector("canvas").getContext("2d"), 640, { nomes: true });
    const a = alvoAtual(), M = foco && missoes[foco];
    mapaGrande.querySelector(".legenda").innerHTML = `<span class="voce">▲ Você</span> <span class="pisca">● ${M && M.estado === "ativa" ? `${M.icone} ${M.nome}` : a ? "Próximo amigo" : ""}</span> <span>❗ Missão nova</span> <span>▬ Carro</span>`;
  }
}
const _v = new THREE.Vector3();
function atualizarBussola() {
  const a = alvoAtual();
  if (!a || fim) { bussola.hidden = true; return; }
  bussola.hidden = false;
  const ang = Math.atan2(a.x - j.pos.x, a.z - j.pos.z);
  const rel = Math.atan2(Math.sin(ang - camYaw), Math.cos(ang - camYaw));
  bussola.querySelector(".seta").style.transform = `rotate(${(-rel * 180) / Math.PI - 90}deg)`;
  const d = Math.round(Math.hypot(a.x - j.pos.x, a.z - j.pos.z));
  bussola.querySelector(".rotulo").textContent = `${a.emoji} ${d < 4 ? "aqui!" : `${d} m`}`;
  void _v;
}
function atualizarBotaoAcao() {
  if (!contexto) { btnAcao.hidden = true; return; }
  btnAcao.hidden = false;
  const r = jogo.remap;
  const dica = document.body.classList.contains("touch") ? "" : document.body.classList.contains("com-controle") ? (r?.rotuloBotao("acao") || "X") : (r?.rotulo("acao") || "F");
  const html = `${contexto.rotulo}${dica ? ` <kbd>${dica}</kbd>` : ""}`;
  if (btnAcao.innerHTML !== html) btnAcao.innerHTML = html;
}

// ------------------------------------------------------------------ Laço
let tMapa = 0, tHud = 0;
function quadro() {
  if (!vivo) return;
  const dt = Math.min(relogio.getDelta(), 1 / 30);
  if (dois && !J.ativo) dois = false; // o controle do jogador 2 caiu e escolheram seguir só com o Rabisco: a criança volta a seguir
  if (!jogo.pausado) {
    const t = relogio.elapsedTime;
    const { andando } = dentro ? dirigirCarro(dt) : moverJogador(dt);
    atualizarSemaforos(t);
    atualizarCarros(dt, t);
    atualizarMoradores(dt, t);
    regras(dt, t);
    atualizarGotas(dt);
    mundo.roda.userData.roda.rotation.z += dt * 0.15;
    for (const c of mundo.roda.userData.cabines) c.rotation.z = -mundo.roda.userData.roda.rotation.z;
    posicionarCamera(Math.min(1, dt * 6), dt, andando);
    tMapa -= dt;
    if (tMapa <= 0) { tMapa = 0.12; desenharMapa(); atualizarBussola(); atualizarBotaoAcao(); if (!mapaGrande.hidden) desenharCidade(mapaGrande.querySelector("canvas").getContext("2d"), 640, { nomes: true }); }
    tHud -= dt;
    if (tHud <= 0 && missoes.corrida?.estado === "ativa" && missoes.corrida.proxima > 0) { tHud = 0.5; atualizarHud(); }
  }
  r3.render(cena, cam);
  requestAnimationFrame(quadro);
}

if (params.has("teste")) window.teste = {
  jogo, j, carros, veiculos, lugarDoMapa, amigo, get dois() { return dois; },
  get companheiro() { return companheiro; }, get missoes() { return missoes; }, get mundo() { return mundo; }, get selos() { return selosPegos; }, get visitados() { return visitados.size; },
  get dentro() { return dentro; }, get foco() { return foco; }, alvo: () => alvoAtual(), get contexto() { return contexto?.tipo ?? null; },
  ir(x, z, y = 0.03) { j.pos.set(x, y, z); j.vel.set(0, 0, 0); posicionarCamera(1, 0); }, olhar(yaw) { camYaw = yaw; camManual = 5; posicionarCamera(1, 0); },
  vista(pos, alvo) { vistaTeste = pos ? { pos, alvo } : null; cena.fog.far = pos ? 2000 : 300; cena.fog.near = pos ? 1500 : 80; posicionarCamera(1, 0); },
  acao() { pad.acaoNova = true; }, entrar(i = 0) { const v = veiculos[i]; j.pos.set(v.pos.x + 2, 0.03, v.pos.z); entrarNoCarro(v); }, sair() { if (dentro) dentro.vel = 0; sairDoCarro(); },
  volante(acel, virar) { entradaTeste = acel == null ? null : { acel, virar }; },
  aceitar(id) { const M = missoes[id]; if (M.estado === "nova") { M.npc.ultima = -99; conversar(M.npc); } return M.estado; },
  mapaGrande: () => alternarMapaGrande(), bate: (x, z) => bate(x, z, 0.1),
  levarCarro(i, x, z, ang) { const v = veiculos[i]; v.pos.set(x, 0.03, z); v.ang = ang; v.vel = 0; animarCarro(v, 0); if (dentro === v) j.pos.set(x, 0.03, z); },
};
