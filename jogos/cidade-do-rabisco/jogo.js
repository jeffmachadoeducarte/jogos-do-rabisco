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
//  - Lojas parceiras (parceiros.js): Carro novo (escolher um dos 5 carros do pátio da J.E Multimarcas, ganhar a
//    chave e sair dirigindo pelo portão até a casa verde), Presente da Professora (entrar na Bella Cat, escolher um
//    acessório, ver embrulhar e levar à professora na escola) e Exercício (entrar na Rise Up: esteira e halter 5 vezes);
//  - Hora da Aula: buscar a mochila azul na casa azul (nº 2) e levar ao aluno na porta da Escola Educarte antes do sino;
//  - Convite: convidar 3 amigos lápis para o culto infantil e levá-los à Igreja Reviver (Salmo 122:1);
//  - Pai Nosso: orar junto, frase por frase, no tapete da porta da Igreja Reviver (Mateus 6:9-13);
//  - Passeio: visitar todos os lugares (passaporte). Selos espalhados para colecionar.
// Em toda entrega tem alguém esperando na frente do destino (receptor): acena enquanto espera e recebe/comemora.
// O alvo da missão em foco pisca no minimapa e uma seta (bússola) no alto da tela aponta o caminho.

import { THREE, texturaCanvas } from "../../src/motor3d/toon.js";
import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
import { moeda3D, pilotoLapis } from "../../src/motor3d/objetos.js";
import { carregarTextura } from "../../src/motor3d/toon.js";
import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar as falarMotor, preCarregarFalas, falarNome, parabenizar } from "../../src/motor/voz.js";
import { criarCompanheiro3D } from "../../src/motor3d/companheiro3d.js";
import { criarJoystick } from "../../src/motor/joystick.js";
import { CODIGOS_J2, TECLAS_J1_EXTRA } from "../../src/motor/jogadores.js";
import { montarCidade, carro, carroAberto, BORDA } from "./cidade.js";
import { RUAS, segmentos, ROTAS, CASAS, LAGO, PARQUE, PRACA, VAGAS, LARGADA, PATIO_JE, HELIPONTO, lugar as lugarDoMapa } from "./mapa.js";
import { montarAcademia, montarBellaCat, halter, montarSalaAula, objetoAula, maca, PROFESSORA_AULA } from "./interiores.js";
import { MATERIAS, nivelDaIdade } from "../rabiscopolis/aulas.js";
import { carroFofo, helicoptero } from "./veiculos3d.js";
import { mesclarLocal } from "./mesclar.js";
import { criarRadio } from "../../src/radio/radio.js";
import { criarRadioUI } from "../../src/radio/radio-ui.js";

const ORACAO = [ // Pai Nosso (Mateus 6:9-13, texto tradicional): uma frase por vez, cada uma com a sua voz (cid-pai-1..11)
  "Pai nosso, que estás no céu,", "santificado seja o teu nome.", "Venha o teu reino,", "seja feita a tua vontade,", "assim na terra como no céu.",
  "O pão nosso de cada dia nos dá hoje.", "Perdoa as nossas ofensas,", "assim como nós perdoamos a quem nos tem ofendido.",
  "E não nos deixes cair em tentação,", "mas livra-nos do mal.", "Amém.",
];

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
  { id: "descer", nome: "Helicóptero: descer", teclas: ["KeyC", "ShiftLeft"] },
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
    teclado: "WASD ou setas andam · F entra no carro · M abre o mapa · Q/E giram a câmera · Espaço pula · helicóptero: Espaço sobe, C desce · P pausa",
    toque: "Arraste à esquerda para andar · à direita para olhar · botão amarelo entra no carro",
    controle: "Alavanca esquerda anda · X entra no carro · Select abre o mapa · A pula · Start pausa",
  },
  falas: { titulo: "cid-titulo", vitoria: null },
  controles: CONTROLES,
  // 2 jogadores ao mesmo tempo: o jogador 2 controla a criança-companheira a pé; no carro, buzina (pulo) e acena (ação)
  jogadores: "simultaneo",
  aoComecar: iniciar,
  aoSair: parar,
  aoPausar: () => { teclas.clear(); toque?.zerar(); radioUI?.sairDoCarro(); for (const o of [carroBtn, heliBtn]) for (const k in o) o[k] = false; },
  aoContinuar: () => { if (dentro && !dentro.heli) radioUI?.entrarNoCarro(); },
  aoControle: lerControle,
});

// rádio gospel do carro (src/radio): o painel aparece abaixo do minimapa só enquanto o Rabisco dirige um carro
// (no helicóptero, a pé, nas lojas e no Pai Nosso fica desligado); as falas em MP3 abaixam o rádio sozinhas
let radio = null, radioUI = null;

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
const amigo = { pos: new THREE.Vector3(), dir: 0, vel: 0, fase: 0, vy: 0, noChao: true, acena: 0, buzina: 0, pulos: 0 };
let dois = false; // 2 jogadores: a criança é do jogador 2 (src/motor/jogadores.js)
const RAIO_J2 = 11; // o jogador 2 fica a no máximo 11 m do Rabisco (a câmera enquadra os dois)
const j = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), noChao: true, coyote: 0, buffer: 0, dir: 0, pulos: 0 };
let camYaw = 0, camManual = 0, vistaTeste = null;
const carros = [], moradores = [], selos = [], npcs = [], veiculos = [], receptores = [], convidados = [];
let dentro = null;     // carro em que o Rabisco está dirigindo (ou null: a pé)
let paradoDesde = null, ultimaFalaLugar = -99, falouLugar = new Set();
let missoes = {}, visitados = new Set(), selosPegos = 0, fim = false, foco = null;
let levando = null;     // presente ou garrafinha sobre a cabeça do Rabisco (missões das lojas parceiras)
let entradaTeste = null; // ?teste: { acel, virar } força o volante (fotos e testes)
let oracao = null;       // missão Pai Nosso em andamento: { i, t, dur, ... } (o Rabisco fica parado, reverente)
let painelOracao = null;
let quemRecebe = { cartas: {} }; // receptores das entregas: cartas[cor], vovo, verde, merendeira

function iniciar() {
  parar();
  if (!radioUI) { radio = criarRadio(); radioUI = criarRadioUI({ radio }); }
  const caixa = el("div", { class: "cena-cidade" });
  jogo.palco.append(caixa);
  r3 = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const leve = navigator.maxTouchPoints > 0; // tablet e celular: um pouco menos de resolução para rodar liso
  const tv = !leve; // sem toque (TV): até 1,25× e no máximo ~1920×1080 pixels desenhados
  const ajustarPixels = (w, h) => {
    let dpr = Math.min(devicePixelRatio, tv ? 1.25 : 1.3);
    if (tv) dpr *= Math.min(1, Math.sqrt((1920 * 1080) / (w * h * dpr * dpr)));
    r3.setPixelRatio(dpr);
  };
  r3.outputColorSpace = THREE.SRGBColorSpace;
  r3.toneMapping = THREE.ACESFilmicToneMapping;
  r3.toneMappingExposure = 1.05;
  r3.shadowMap.enabled = true;
  r3.shadowMap.type = tv ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
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
  sol.shadow.mapSize.set(leve || tv ? 1024 : 2048, leve || tv ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.05;
  cena.add(sol, sol.target, new THREE.HemisphereLight(0xcfe6ff, 0x6a8f4a, 1.1));

  mundo = montarCidade(cena);
  rabisco = new Rabisco3D({ raiz: "../..", altura: 1.8 });
  cena.add(rabisco.grupo);
  j.pos.set(LARGADA.x, 0.03, LARGADA.z); j.vel.set(0, 0, 0); j.dir = LARGADA.dir; camYaw = LARGADA.dir;
  dois = J.ativo && J.j2Pronto;
  Object.assign(amigo, { vy: 0, noChao: true, acena: 0, buzina: 0 });
  companheiro = null; dentro = null;
  if (dois) criarCompanheira(); // com 1 jogador só o Rabisco passeia; a criança só existe com o jogador 2
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
  painelOracao = el("div", { class: "oracao-cidade", hidden: "", "aria-live": "polite" });
  fadeEl = el("div", { class: "fade-cidade" });
  barraEl = el("div", { class: "barra-cidade", hidden: "" }, [el("i")]);
  caixa.append(hud, mapa, bussola, balao, btnAcao, mapaGrande, painelOracao, barraEl, fadeEl);
  toque = criarJoystick(caixa);
  botoesVeiculo();
  atualizarHud();

  const ajustar = () => { const w = caixa.clientWidth || innerWidth, h = caixa.clientHeight || innerHeight; ajustarPixels(w, h); r3.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
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
  radioUI?.sairDoCarro();
  if (r3) { r3.dispose(); r3 = null; }
  carros.length = moradores.length = selos.length = npcs.length = veiculos.length = receptores.length = convidados.length = 0;
  oracao = null; aula = null; quemRecebe = { cartas: {} }; salas = {}; sala = null; transicao = false; bloqueioPorta = null; trava = null;
  paradoDesde = null; ultimaFalaLugar = -99; falouLugar = new Set(); missoes = {}; visitados = new Set(); selosPegos = 0; fim = false; foco = null; dentro = null; levando = null;
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
  if (dentro) { ix += (carroBtn.dir ? 1 : 0) - (carroBtn.esq ? 1 : 0); if (!dentro.heli) iy += (carroBtn.frente ? 1 : 0) - (carroBtn.re ? 1 : 0); }
  if (entradaTeste) { ix = entradaTeste.virar; iy = entradaTeste.acel; }
  const m = Math.hypot(ix, iy);
  if (m > 1) { ix /= m; iy /= m; }
  if (fim || oracao || transicao) ix = iy = 0;
  return { ix, iy, m };
}
function moverJogador(dt) {
  if (trava) { // na esteira ou com o halter: o Rabisco fica no lugar (a animação é da missão)
    j.pos.set(trava.x, trava.y, trava.z); j.vel.set(0, 0, 0); j.dir = trava.dir; j.noChao = true;
    pad.puloNovo = false; if (toque) toque.puloNovo = false;
    rabisco.grupo.position.copy(j.pos); rabisco.grupo.rotation.y = j.dir;
    rabisco.atualizar(dt, { modo: trava.modo, vel: trava.vel, vmax: VEL });
    if (companheiro) (dois ? moverJogador2(dt) : moverCompanheiro(dt, 0));
    return { andando: false };
  }
  const { ix, iy, m } = entradaAndar();
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
  const wx = fx * iy - fz * ix, wz = fz * iy + fx * ix; // frente e direita da câmera
  const k = Math.min(1, dt * (j.noChao ? 12 : 5));
  j.vel.x += (wx * VEL - j.vel.x) * k;
  j.vel.z += (wz * VEL - j.vel.z) * k;
  const quer = (pad.puloNovo || toque?.puloNovo) && !oracao;
  pad.puloNovo = false; if (toque) toque.puloNovo = false;
  j.coyote = j.noChao ? 0.1 : j.coyote - dt;
  j.buffer = quer ? 0.14 : j.buffer - dt;
  if (j.buffer > 0 && j.coyote > 0) { j.vel.y = PULO; j.buffer = j.coyote = 0; j.noChao = false; j.pulos++; sons.pulo(); }
  if (!(pad.pulo || toque?.pulo || tem("pular")) && j.vel.y > 4) j.vel.y = 4;
  j.vel.y -= GRAV * dt;
  const nx = j.pos.x + j.vel.x * dt;
  if (!bate(nx, j.pos.z, j.pos.y) && naBorda(nx)) j.pos.x = nx; else j.vel.x = 0;
  const nz = j.pos.z + j.vel.z * dt;
  if (!bate(j.pos.x, nz, j.pos.y) && naBorda(nz)) j.pos.z = nz; else j.vel.z = 0;
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
  if (!bate(nx, amigo.pos.z, amigo.pos.y) && naBorda(nx)) amigo.pos.x = nx;
  if (!bate(amigo.pos.x, nz, amigo.pos.y) && naBorda(nz)) amigo.pos.z = nz;
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
  companheiro.atualizar(dt, { modo: fim ? "comemorar" : andando ? "andar" : velRabisco > 0.6 || oracao ? "parado" : "acenar", vel: amigo.vel, vmax: VEL });
}

// Jogador 2: a criança anda sozinha (relativo à câmera, como o Rabisco), pula e acena (ação). Fica a no máximo
// RAIO_J2 do Rabisco: passando disso, é segurada na borda (a câmera compartilhada enquadra os dois).
let avisouRaio = false;
function moverJogador2(dt) {
  const e = J.ler2();
  let ix = e.x, iy = e.y;
  if (fim || oracao) { ix = iy = 0; e.puloNovo = false; }
  const m = Math.hypot(ix, iy);
  if (m > 1) { ix /= m; iy /= m; }
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
  const wx = fx * iy - fz * ix, wz = fz * iy + fx * ix;
  const V = VEL * 0.95;
  amigo.vx = (amigo.vx ?? 0) + (wx * V - (amigo.vx ?? 0)) * Math.min(1, dt * 12);
  amigo.vz = (amigo.vz ?? 0) + (wz * V - (amigo.vz ?? 0)) * Math.min(1, dt * 12);
  if (e.puloNovo && amigo.noChao) { amigo.vy = PULO * 0.95; amigo.noChao = false; amigo.pulos++; sons.pulo(); }
  if (!e.pulo && amigo.vy > 4) amigo.vy = 4;
  if (e.acaoNova) { amigo.acena = 1.4; amigo.acaoNova = true; sons.bipe?.(false); }
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
  if (!bate(nx, amigo.pos.z, amigo.pos.y) && naBorda(nx)) amigo.pos.x = nx; else amigo.vx = 0;
  if (!bate(amigo.pos.x, nz, amigo.pos.y) && naBorda(nz)) amigo.pos.z = nz; else amigo.vz = 0;
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
  criarHelicoptero(); // por último: os testes contam com os carros nos primeiros lugares
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
// a criança companheira só existe com 2 jogadores: entra quando o jogador 2 conecta e some quando sai
function criarCompanheira() {
  if (companheiro) return;
  const semCadastro = !window.Familia?.crianca?.();
  companheiro = criarCompanheiro3D({ raiz: "../..", altura: 1.55, cracha: true, ...(semCadastro ? { crianca: { nome: J.j2.nome } } : {}) });
  if (!companheiro) return;
  amigo.vy = 0; amigo.noChao = true; amigo.acena = 0; amigo.vel = 0; amigo.dir = j.dir;
  if (dentro) { dentro.g.add(companheiro.grupo); sentar(companheiro, dentro.g.userData.carona, companheiro.escala); return; }
  const [cx, cz] = livre(j.pos.x + 1.4, j.pos.z + 1.4, 0.5);
  amigo.pos.set(cx, 0.03, cz);
  companheiro.grupo.position.copy(amigo.pos);
  cena.add(companheiro.grupo);
}
function removerCompanheira() {
  if (!companheiro) return;
  companheiro.grupo.removeFromParent();
  companheiro = null;
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
  if (!v.heli) radioUI?.entrarNoCarro(); // dentro do gesto (Ação), por causa do autoplay
  if (v.heli) { if (!entrarNoCarro.falouHeli) { entrarNoCarro.falouHeli = true; setTimeout(() => falar("cid-heli"), 250); dizer("Helicóptero", "Helicóptero ligado! Para subir, aperte pular (▲). Para descer, C (▼). Para a frente, vá para a frente!", 5200); } return; }
  if (!entrarNoCarro.falou) { entrarNoCarro.falou = true; setTimeout(() => falar("cid-carro"), 250); dizer("Cidade do Rabisco", "Cinto de segurança afivelado! Para a frente acelera, para trás freia. Aperte de novo para sair.", 4200); }
}
function sairDoCarro() {
  const v = dentro;
  if (!v || Math.abs(v.vel) > 3 || (v.heli && !heliPousado(v))) return;
  const [lx, lz] = lateralDe(v.ang);
  const fx = Math.sin(v.ang), fz = Math.cos(v.ang), k = v.heli ? 1.35 : 1;
  const opcoes = [[lx * 2.3 * k, lz * 2.3 * k], [-lx * 2.3 * k, -lz * 2.3 * k], [-fx * 3.6, -fz * 3.6], [fx * 3.6 * k, fz * 3.6 * k]];
  const [ox, oz] = opcoes.find(([ox, oz]) => !bate(v.pos.x + ox, v.pos.z + oz, 0.1)) ?? opcoes[0];
  dentro = null;
  v.vel = 0;
  radioUI?.sairDoCarro();
  cena.add(rabisco.grupo);
  j.pos.set(v.pos.x + ox, 0.03, v.pos.z + oz); j.vel.set(0, 0, 0); j.dir = v.ang;
  if (v.heli) { v.vel = v.vy = 0; v.virar = 0; }
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
  // carros da IA: não bloqueiam (separação suave em dirigirCarro); outros carros parados só bloqueiam se o movimento aproxima
  for (const v of veiculos) if (v !== eu) { const d = Math.hypot(v.pos.x - x, v.pos.z - z); if (d < 3.6 && d < Math.hypot(v.pos.x - eu.pos.x, v.pos.z - eu.pos.z) - 0.001) return true; }
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
  // encostou num carro do trânsito: os dois se afastam devagar (sem dano), o jogador nunca fica preso
  for (const c of carros) {
    if (c.fantasma) continue;
    const ex = v.pos.x - c.g.position.x, ez = v.pos.z - c.g.position.z, d = Math.hypot(ex, ez);
    if (d >= 3.6) continue;
    // empurrão só no eixo do próprio carro (nunca de lado: lateral jogava o carro contra postes da calçada)
    const hx = Math.sin(v.ang), hz = Math.cos(v.ang), dot = (ex * hx + ez * hz) / (d || 1);
    if (Math.abs(dot) > 0.25) {
      const f = Math.min(1, dt * 6) * (3.6 - d) * Math.sign(dot);
      const px = v.pos.x + hx * f, pz = v.pos.z + hz * f;
      if (!carroBate(px, pz, v.ang, v)) { v.pos.x = px; v.pos.z = pz; }
    }
    if (d < 2.2 && c.espera > 0.6) c.fantasma = true; // preso de verdade: o da IA passa "fantasma"
  }
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
  if (v.g.userData.seta.visible) v.g.userData.seta.position.y = (v.setaY ?? 3.2) + Math.sin(relogio.elapsedTime * 4) * 0.2;
}

// ------------------------------------------------------------------ Helicóptero (heliponto do hospital)
// Entra com Ação (como o carro). Subir: pular (Espaço / A / ▲); descer: C ou Shift / LB / ▼; frente e trás com a
// alavanca (ou ⏩ no celular); esquerda e direita viram. Seguro e sem queda: nunca atravessa prédios (se tiver algo
// mais alto na frente, para e sobe sozinho), não desce em cima de nada (só para no ar) e pousa suave no chão plano.
const HELI = { vmax: 13, sobe: 5, desce: 4, giro: 1.7, teto: 48 };
const heliBtn = { subir: false, descer: false, frente: false };
const carroBtn = { esq: false, dir: false, frente: false, re: false };
let heliBotoes = null, carroBotoes = null;
function criarHelicoptero() {
  const g = helicoptero();
  g.rotation.order = "YXZ";
  const pos = new THREE.Vector3(HELIPONTO.x, 0.17, HELIPONTO.z);
  g.position.copy(pos); g.rotation.y = Math.PI;
  cena.add(g);
  const v = { g, pos, ang: Math.PI, vel: 0, virar: 0, giro: 0, batida: 0, buzina: 0, caixa: null, heli: true, vy: 0, chao: 0.17, rotor: 0, setaY: 5.4 };
  veiculos.push(v);
  return v;
}
// altura do que está embaixo do helicóptero (prédios, árvores, cercas...); lago e chafariz contam como "não pousa"
function alturaEm(x, z, r = 2.4) {
  let h = 0.03;
  for (const s of mundo.solidos) if (x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r && s.y1 > h) h = s.y1;
  for (const c of mundo.circulos) if (Math.hypot(x - c.x, z - c.z) < c.r + r) h = Math.max(h, 1.2);
  if (Math.hypot(x - HELIPONTO.x, z - HELIPONTO.z) < HELIPONTO.r) h = Math.max(h, 0.17); // o piso do heliponto
  return h;
}
const plano = (h) => h < 0.6; // dá para pousar (chão, calçada, rua, heliponto)
function botaoGamepad(i) { for (const p of navigator.getGamepads?.() ?? []) if (p && p.index !== J.padJ2 && p.buttons[i]?.pressed) return true; return false; }
function pilotarHeli(dt) {
  const v = dentro;
  const { ix, iy } = entradaAndar();
  const sobe = tem("pular") || pad.pulo || toque?.pulo || heliBtn.subir || botaoGamepad(5) || botaoGamepad(7) || (entradaTeste?.sobe ?? false);
  const desce = tem("descer") || heliBtn.descer || botaoGamepad(4) || botaoGamepad(6) || (entradaTeste?.desce ?? false);
  pad.puloNovo = false; if (toque) toque.puloNovo = false;
  const frente = Math.max(iy, heliBtn.frente ? 1 : 0);
  const noAr = v.pos.y > v.chao + 0.25;
  // vertical: sobe e desce suave
  v.vy += ((sobe ? HELI.sobe : desce ? -HELI.desce : 0) - v.vy) * Math.min(1, dt * 3);
  // horizontal: só no ar (no chão o helicóptero só gira)
  const alvoV = noAr ? (frente > 0.1 ? frente * HELI.vmax : iy < -0.1 ? iy * 5 : 0) : 0;
  v.vel += (alvoV - v.vel) * Math.min(1, dt * 1.6);
  v.virar += (ix - v.virar) * Math.min(1, dt * 5);
  v.ang -= v.virar * HELI.giro * dt * (noAr ? 1 : 0.5);
  const nx = v.pos.x + Math.sin(v.ang) * v.vel * dt, nz = v.pos.z + Math.cos(v.ang) * v.vel * dt;
  const frenteAlto = alturaEm(nx + Math.sin(v.ang) * 2, nz + Math.cos(v.ang) * 2);
  if (Math.abs(v.vel) > 0.05 && frenteAlto > v.pos.y - 0.4) { // algo mais alto na frente: para e sobe sozinho
    v.vel *= 0.5; v.vy = Math.max(v.vy, 3.5);
    if (relogio.elapsedTime - (v.avisou || -9) > 6) { v.avisou = relogio.elapsedTime; dizer("Helicóptero", "Opa, tem um prédio na frente! Subindo para passar por cima.", 2600); }
  } else if (Math.abs(nx) < BORDA + 40 && Math.abs(nz) < BORDA + 40) { v.pos.x = nx; v.pos.z = nz; }
  // chão: pousa suave no plano; em cima de algo (prédio, árvore, lago) só para no ar
  v.chao = alturaEm(v.pos.x, v.pos.z);
  let ny = Math.min(HELI.teto, v.pos.y + v.vy * dt);
  if (!plano(v.chao) && ny < v.chao + 1.2) { ny = Math.max(ny, v.chao + 1.2); v.vy = Math.max(0, v.vy); }
  if (ny <= v.chao) { ny = v.chao; v.vy = Math.max(0, v.vy); }
  v.pos.y = ny;
  animarHeli(v, dt, true);
  j.pos.copy(v.pos); j.dir = v.ang;
  rabisco.atualizar(dt, { modo: fim ? "comemorarSentado" : "dirigir", virar: v.virar });
  if (companheiro) { companheiro.atualizar(dt, { modo: fim ? "comemorarSentado" : "dirigir", virar: v.virar }); companheiro.bracos(-0.35, 0.55, -1.25); if (dois) jogador2NoCarro(dt, v); }
  return { andando: Math.abs(v.vel) > 1 };
}
function animarHeli(v, dt, ligado) {
  v.rotor += ((ligado ? 1 : 0) - v.rotor) * Math.min(1, dt * (ligado ? 1.5 : 0.4));
  const u = v.g.userData;
  u.rotor.rotation.y += dt * 22 * v.rotor; u.rotorCauda.rotation.x += dt * 30 * v.rotor;
  v.g.position.copy(v.pos);
  v.g.rotation.set(Math.max(-0.12, Math.min(0.18, v.vel / HELI.vmax * 0.16)), v.ang, -v.virar * 0.14 * Math.min(1, Math.abs(v.vel) / 4));
  if (u.seta.visible) u.seta.position.y = v.setaY + Math.sin(relogio.elapsedTime * 4) * 0.2;
}
const heliPousado = (v) => v.pos.y <= v.chao + 0.08 && plano(v.chao);
// No toque, dentro de um veículo o joystick some: ◀ ▶ à esquerda viram; à direita ▲ acelera e ▼ dá ré (carro) ou
// ▲ sobe, ⏩ vai para a frente e ▼ desce (helicóptero); o botão amarelo de ação vira "Sair" (igual ao kart e à
// Rabiscolândia). A pé continua o joystick de arrastar.
function botoesVeiculo() {
  const caixa = jogo.palco.querySelector(".cena-cidade");
  carroBotoes = el("div", { class: "veiculo-cidade" });
  const botao = (alvo, k, txt, rot, classe) => {
    const b = el("button", { class: classe, "aria-label": rot, texto: txt });
    const on = (e) => { e.preventDefault(); e.stopPropagation(); alvo[k] = true; b.classList.add("apertado"); try { b.setPointerCapture(e.pointerId); } catch { /* dedo simulado */ } navigator.vibrate?.(10); };
    const off = () => { alvo[k] = false; b.classList.remove("apertado"); };
    b.addEventListener("pointerdown", on); for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, off);
    b.addEventListener("click", (e) => e.preventDefault());
    return b;
  };
  carroBotoes.append(el("div", { class: "volante-cidade" }, [botao(carroBtn, "esq", "◀", "Virar à esquerda", "v-esq"), botao(carroBtn, "dir", "▶", "Virar à direita", "v-dir")]),
    el("div", { class: "pedais-cidade" }, [botao(carroBtn, "frente", "▲", "Acelerar", "p-frente"), botao(carroBtn, "re", "▼", "Ré", "p-re")]));
  caixa.append(carroBotoes);
  botoesHeli(botao);
}
function botoesHeli(botao) {
  const caixa = jogo.palco.querySelector(".cena-cidade");
  heliBotoes = el("div", { class: "heli-cidade", hidden: "" });
  for (const [k, txt, rot] of [["subir", "▲", "Subir"], ["frente", "⏩", "Voar para a frente"], ["descer", "▼", "Descer"]]) heliBotoes.append(botao(heliBtn, k, txt, rot, `heli-${k}`));
  caixa.append(heliBotoes);
}

// ------------------------------------------------------------------ Câmera (acompanha e gira)
const alvo = new THREE.Vector3(), posCam = new THREE.Vector3();
function posicionarCamera(k, dt, andando = false) {
  if (vistaTeste) { // ?teste: vista de cima / ângulo fixo para as fotos
    cam.position.set(...vistaTeste.pos); cam.lookAt(...vistaTeste.alvo);
    sol.position.set(vistaTeste.alvo[0] + 40, 60, vistaTeste.alvo[2] + 30); sol.target.position.set(vistaTeste.alvo[0], 0, vistaTeste.alvo[2]);
    return;
  }
  if (oracao) { // oração: câmera parada atrás do Rabisco, olhando a fachada da igreja
    const tp = missoes.painosso.tapete;
    alvo.lerp(new THREE.Vector3(tp.x - tp.dir[0] * 2, 2.6, tp.z - tp.dir[1] * 2), k);
    posCam.lerp(new THREE.Vector3(tp.x + tp.dir[0] * 7.5, 4.4, tp.z + tp.dir[1] * 7.5), k);
    cam.position.copy(posCam); cam.lookAt(alvo);
    sol.position.set(tp.x + 40, 60, tp.z + 30); sol.target.position.set(tp.x, 0, tp.z);
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
  let dist = (dentro?.heli ? 11.5 : dentro ? 8.6 : 6.3) * longe;
  // 2 jogadores a pé: a câmera mira o meio dos dois e se afasta conforme eles se separam
  const P = dois && !dentro && companheiro ? new THREE.Vector3((j.pos.x + amigo.pos.x) / 2, (j.pos.y + amigo.pos.y) / 2, (j.pos.z + amigo.pos.z) / 2) : j.pos;
  if (P !== j.pos) dist += Math.hypot(j.pos.x - amigo.pos.x, j.pos.z - amigo.pos.z) * 0.75;
  // a câmera não atravessa prédios: encurta a distância se tiver parede no caminho
  for (let s = 1; s <= 10; s++) {
    const d = (dist * s) / 10;
    const x = P.x - Math.sin(camYaw) * d, z = P.z - Math.cos(camYaw) * d;
    if (mundo.solidos.some((o) => o.y1 > 3 && x > o.x0 - 0.3 && x < o.x1 + 0.3 && z > o.z0 - 0.3 && z < o.z1 + 0.3)) { dist = Math.max(sala ? 1.2 : 2.5, d - 0.6); break; }
  }
  const alt = dentro?.heli ? 6.2 : dentro ? 3.8 : 3.0;
  const adiante = dentro?.heli ? 8 : dentro ? 4 : 2, sobe = dentro?.heli ? 1.0 : dentro ? 1.4 : 1.3;
  alvo.lerp(new THREE.Vector3(P.x + Math.sin(camYaw) * adiante, P.y + sobe, P.z + Math.cos(camYaw) * adiante), k);
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
    for (const eixo of ["x", "z"]) { // as luzes de cada sentido são uma malha por cor (cidade.js)
      const luz = luzDe(s, eixo, t);
      for (const [nome, m] of Object.entries(s.luzes[eixo])) m.material.emissiveIntensity = nome === luz ? 2.2 : 0;
      // bonequinho: verde quando os carros que este sentido controla estão parados
      s.peds[eixo].material.emissive.setHex(luz === "vermelho" ? 0x30ff60 : 0xff3030);
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
    const voando = j.pos.y > 3; // o helicóptero lá em cima não atrapalha o trânsito
    const aheadJ = voando ? -99 : (j.pos.x - px) * dx + (j.pos.z - pz) * dz, ladoJ = Math.abs((j.pos.x - px) * dz - (j.pos.z - pz) * dx);
    if (k.fantasma && (Math.hypot(j.pos.x - px, j.pos.z - pz) > 7 || aheadJ < -1)) { k.fantasma = false; k.espera = 0; }
    let esperando = false;
    if (!k.fantasma && aheadJ > 0 && aheadJ < 9 && ladoJ < (dentro ? 3 : 2.4)) {
      const lim = Math.max(0, (aheadJ - (dentro ? 5 : 3)) * 2);
      alvoVel = Math.min(alvoVel, lim); esperando = lim < 1 && Boolean(dentro);
    }
    // esperou o jogador (de carro) mais de 1,5 s: segue a rota "fantasma" até se afastar
    if (esperando) { k.espera = (k.espera || 0) + dt; if (k.espera > 1.5) { k.fantasma = true; alvoVel = k.vel; } } else if (!k.fantasma) k.espera = 0;
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
      const p = lapis(cores[(i * 2 + (lado > 0 ? 0 : 1)) % cores.length], { escala: 0.62 });
      cena.add(p);
      const segs = segmentos(rua);
      moradores.push({ p, rua, segs, lado, t: Math.random(), vel: 0.012 + Math.random() * 0.01, sentido: lado, fase: Math.random() * 6, passo: Math.random() * 6 });
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
    m.passo += dt * 7; // passo na velocidade da caminhada (sem balançar o corpo todo)
    m.p.position.set(ax + (bx - ax) * f + nx * off, 0.03, az + (bz - az) * f + nz * off);
    andarLapis(m.p, m.passo, 1);
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
// amigos lápis da cidade (pilotoLapis) com bracinhos para acenar e receber, e acessórios que dizem quem é quem
const matLapis = (cor, extra = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.7, ...extra });
const ACESSORIOS = {
  // Vovó Lápis: cabelo grisalho em coque, óculos redondos, xale e bengala
  vovo(p) {
    const cinza = matLapis(0xd9d9d9, { roughness: 0.9 });
    const cabelo = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.62, 12), cinza); cabelo.position.y = 1.86;
    const coque = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), cinza); coque.position.set(0, 1.95, -0.33);
    const xale = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.56, 0.36, 12), matLapis(0xc97fb0)); xale.position.y = 1.32;
    const no = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), matLapis(0xa8558f)); no.position.set(0, 1.22, 0.53);
    const madeira = matLapis(0x7a4a2a);
    const bengala = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 8), madeira); bengala.position.set(0.7, 0.52, 0.2);
    const cabo = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 12, Math.PI), madeira); cabo.position.set(0.6, 1.05, 0.2);
    p.add(cabelo, coque, xale, no, bengala, cabo);
    ACESSORIOS.oculos(p);
  },
  oculos(p) {
    const aro = matLapis(0x5a3a20, { roughness: 0.4 });
    for (const x of [-0.17, 0.17]) { const o = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16), aro); o.position.set(x, 1.05, 0.48); p.add(o); }
    const ponte = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.025), aro); ponte.position.set(0, 1.08, 0.5); p.add(ponte);
  },
  laco(p, cor = 0xec2e8c) {
    const m = matLapis(cor);
    for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 8), m); a.rotation.z = s * Math.PI / 2; a.position.set(0.2 + s * 0.12, 1.72, 0.28); p.add(a); }
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), m); n.position.set(0.2, 1.72, 0.3); p.add(n);
  },
  chef(p) {
    const branco = matLapis(0xffffff);
    const aba = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 14), branco); aba.position.y = 2.15;
    const fofo = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), branco); fofo.scale.y = 0.7; fofo.position.y = 2.38;
    const avental = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.05), branco); avental.position.set(0, 0.42, 0.42);
    p.add(aba, fofo, avental);
  },
  bone(p, cor = 0x1d6fe0) {
    const m = matLapis(cor);
    const copa = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m); copa.position.y = 1.95;
    const aba = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.32), m); aba.position.set(0, 1.97, 0.36);
    p.add(copa, aba);
  },
  chapeu(p) {
    const m = matLapis(0x7a5230);
    const aba = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 16), m); aba.position.y = 1.8;
    const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.34, 16), m); copa.position.y = 1.98;
    p.add(aba, copa);
  },
  gravata(p) {
    const g = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 4), matLapis(0xe63946)); g.rotation.x = Math.PI; g.position.set(0, 1.25, 0.43); p.add(g);
  },
};
// geometrias e materiais compartilhados por todos os lápis (braços, pernas e tênis); sem sombra extra
const PERNA = 0.3; // altura das perninhas: o corpo do lápis sobe isso para os pés ficarem no chão
const GEO_LAPIS = {
  braco: new THREE.CylinderGeometry(0.075, 0.065, 0.6, 8),
  mao: new THREE.SphereGeometry(0.1, 10, 8),
  perna: new THREE.CylinderGeometry(0.07, 0.065, PERNA, 8),
  tenis: new THREE.SphereGeometry(0.13, 10, 8),
};
const MAT_LAPIS = new Map();
const matCompartilhado = (cor) => { if (!MAT_LAPIS.has(cor)) MAT_LAPIS.set(cor, matLapis(cor)); return MAT_LAPIS.get(cor); };
const TENIS = [0xffffff, 0xe8413c, 0x1d6fe0, 0x58c43a, 0xffcc1f, 0xec2e8c, 0x151515];
let proximoTenis = 0;
function lapis(cor, { escala = 0.8, acessorios = [] } = {}) {
  const p = pilotoLapis(cor);
  p.scale.setScalar(escala);
  // bracinhos: [0] do lado -x e [1] do lado +x (o que acena)
  p.userData.bracos = [-1, 1].map((s) => {
    const ombro = new THREE.Group(); ombro.position.set(s * 0.43, 1.0, 0); ombro.rotation.z = s * 0.25;
    const braco = new THREE.Mesh(GEO_LAPIS.braco, matCompartilhado(cor)); braco.position.y = -0.3;
    const mao = new THREE.Mesh(GEO_LAPIS.mao, matCompartilhado(0xffffff)); mao.position.y = -0.62;
    ombro.add(braco, mao); p.add(ombro);
    return ombro;
  });
  for (const a of acessorios) ACESSORIOS[a]?.(p);
  for (const c of p.children) c.position.y += PERNA; // sobe o lápis inteiro (acessórios incluídos) para caberem as pernas
  // perninhas com tênis: [0] do lado -x e [1] do lado +x; o quadril fica em y = PERNA e gira para andar
  const tenis = matCompartilhado(TENIS[proximoTenis++ % TENIS.length]);
  p.userData.pernas = [-1, 1].map((s) => {
    const quadril = new THREE.Group(); quadril.position.set(s * 0.2, PERNA, 0);
    const perna = new THREE.Mesh(GEO_LAPIS.perna, matCompartilhado(cor)); perna.position.y = -PERNA / 2;
    const pe = new THREE.Mesh(GEO_LAPIS.tenis, tenis); pe.scale.set(1, 0.55, 1.5); pe.position.set(0, -PERNA + 0.03, 0.07);
    quadril.add(perna, pe); p.add(quadril);
    return quadril;
  });
  return p;
}
// anda: pernas alternando e braços em oposição; fase em radianos (avança com o passo), amp 0..1 (0 = parado, braços relaxados)
function andarLapis(p, fase, amp) {
  const [e, d] = p.userData.pernas, [be, bd] = p.userData.bracos;
  const s = Math.sin(fase) * amp;
  e.rotation.x = s * 0.7; d.rotation.x = -s * 0.7;
  be.rotation.set(-s * 0.55, 0, -0.25); bd.rotation.set(s * 0.55, 0, 0.25);
}
// anima um amigo lápis (npc, quem recebe, convidado): acena enquanto espera, recebe com as mãos para a frente
// e depois comemora pulando (a.festa > 0: segundos de festa, ver receber)
function animarLapis(a, t, dt, acenando) {
  const [b0, b1] = a.p.userData.bracos;
  a.festa = Math.max(0, (a.festa || 0) - dt);
  let y = 0, x0 = 0, x1 = 0, z0 = -0.25, z1 = 0.25;
  if (a.festa > 1.7) { x0 = x1 = -1.35; z0 = -0.15; z1 = 0.15; } // recebendo: mãos para a frente
  else if (a.festa > 0) { const k = Math.abs(Math.sin(t * 7)); y = k * 0.35; z0 = -2.5 - k * 0.2; z1 = 2.5 + k * 0.2; } // comemorando
  else if (acenando) { z1 = 2.6 + Math.sin(t * 7) * 0.35; x1 = -0.2; y = Math.abs(Math.sin(t * 3.5)) * 0.05; }
  else { const r = Math.sin(t * 2 + (a.x || 0)); x0 = r * 0.06; x1 = -r * 0.06; }
  b0.rotation.set(x0, 0, z0); b1.rotation.set(x1, 0, z1);
  a.p.position.y = (a.y0 ?? 0.03) + y;
}
function receber(a) { if (a) a.festa = 2.8; }
function npc(nome, cor, x, z, fala, acessorios = []) {
  [x, z] = livre(x, z, 0.8);
  const p = lapis(cor, { acessorios });
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
// quem espera uma entrega na frente do destino (Vovó, famílias das casas, merendeira, aluno...): fica parado,
// olhando para a rua; vira para o Rabisco quando ele chega perto e acena enquanto espera() for verdade
function receptor(nome, cor, x, z, dir, espera, { acessorios = [], escala = 0.8 } = {}) {
  [x, z] = livre(x, z, 0.8);
  const p = lapis(cor, { acessorios, escala });
  p.position.set(x, 0.03, z);
  p.rotation.y = Math.atan2(dir[0], dir[1]);
  cena.add(p);
  mundo.solidos.push({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4, y1: 2 });
  const r = { nome, p, x, z, rot: p.rotation.y, espera };
  receptores.push(r);
  return r;
}
function atualizarAmigos(t, dt) {
  for (const n of npcs) {
    const M = Object.values(missoes).find((m) => m.npc === n);
    const perto = Math.hypot(j.pos.x - n.x, j.pos.z - n.z) < 16;
    animarLapis(n, t, dt, perto && (M?.estado === "nova" || Boolean(n.espera?.())));
  }
  for (const r of receptores) {
    const d = Math.hypot(j.pos.x - r.x, j.pos.z - r.z);
    const alvoRot = d < 20 ? Math.atan2(j.pos.x - r.x, j.pos.z - r.z) : r.rot;
    let a = alvoRot - r.p.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a));
    r.p.rotation.y += a * Math.min(1, dt * 5);
    animarLapis(r, t, dt, d < 18 && Boolean(r.espera?.()));
  }
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
// lojas parceiras: laço de presente no capô do carro novo e o presente embrulhado que o Rabisco carrega
function laco() {
  const g = new THREE.Group();
  const fitaMat = new THREE.MeshStandardMaterial({ color: 0xe8213a, roughness: 0.45, emissive: 0x330008 });
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 1.52), fitaMat); f1.position.set(0, 1.4, 1.45);
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.05, 0.24), fitaMat); f2.position.set(0, 1.4, 1.45);
  const no = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), fitaMat); no.position.set(0, 1.55, 1.45);
  g.add(f1, f2, no);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 8, 16), fitaMat); a.position.set(s * 0.3, 1.66, 1.45); a.rotation.set(0, 0, s * 0.5); a.scale.set(1, 0.7, 1); g.add(a); }
  return g;
}
function presente(cor = 0xec8cb8) {
  const g = new THREE.Group();
  const caixa = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: cor === 0xf4f0ea ? 0x7fd6ff : cor, roughness: 0.6 }));
  const fitaMat = new THREE.MeshStandardMaterial({ color: cor === 0xec8cb8 || cor === 0x8e5bd8 ? 0xffcc1f : 0xec2e8c, roughness: 0.4 });
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.52, 0.12), fitaMat), f2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.62), fitaMat);
  g.add(caixa, f1, f2);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 6, 12), fitaMat); a.position.set(s * 0.12, 0.33, 0); a.rotation.z = s * 0.6; g.add(a); }
  return g;
}
// maleta de remédio (missão do helicóptero): branca com a cruz vermelha
function maleta() {
  const g = new THREE.Group();
  const caixa = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.35), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
  const verm = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5 });
  for (const [w, h] of [[0.36, 0.11], [0.11, 0.36]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), verm); c.position.z = 0.18; g.add(c); const c2 = c.clone(); c2.position.z = -0.18; g.add(c2); }
  const alca = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 14, Math.PI), verm); alca.position.y = 0.25; g.add(caixa, alca);
  return g;
}
function mochila() {
  const g = new THREE.Group();
  const azul = new THREE.MeshStandardMaterial({ color: 0x1d6fe0, roughness: 0.6 });
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.3), azul); corpo.castShadow = true;
  const bolso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.08), new THREE.MeshStandardMaterial({ color: 0xffcc1f, roughness: 0.6 })); bolso.position.set(0, -0.12, 0.18);
  const tampa = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.56, 12, 1, false, 0, Math.PI), azul); tampa.rotation.z = Math.PI / 2; tampa.position.y = 0.31;
  g.add(corpo, bolso, tampa);
  return g;
}
// coraçãozinho do convite (missão da Igreja Reviver) sobre os amigos ainda não convidados
const CORACAO = texturaCanvas(128, 128, (c) => {
  c.beginPath(); c.moveTo(64, 112); c.bezierCurveTo(-6, 64, 20, 6, 64, 38); c.bezierCurveTo(108, 6, 134, 64, 64, 112);
  c.lineWidth = 10; c.strokeStyle = "#151515"; c.stroke(); c.fillStyle = "#ff4f8b"; c.fill();
});
// tapete da oração (missão Pai Nosso), no pátio da Igreja Reviver
function tapete() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x1f3a8a, roughness: 0.8 }));
  const borda = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.06, 8, 40), new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0x664400, roughness: 0.4 }));
  borda.rotation.x = Math.PI / 2; borda.position.y = 0.05;
  base.position.y = 0.03; g.add(base, borda);
  g.userData.borda = borda;
  return g;
}
// o que o Rabisco leva nas mãos (presente, garrafinha): flutua sobre a cabeça, a pé ou de carro
function levar(obj) {
  if (levando) levando.removeFromParent();
  levando = obj;
  if (obj) cena.add(obj);
}
function atualizarLevando(t) {
  if (!levando) return;
  if (dentro?.heli) { // no helicóptero, o pacote vai no banco do lado
    const p = dentro.g.localToWorld(dentro.g.userData.carona.clone().add(new THREE.Vector3(companheiro ? 0 : 0, 0.55, companheiro ? -1.0 : 0)));
    levando.position.copy(p); levando.rotation.y = dentro.ang; return;
  }
  levando.position.set(j.pos.x, j.pos.y + (dentro ? 3.1 : 2.45) + Math.sin(t * 4) * 0.08, j.pos.z);
  levando.rotation.y = t * 1.5;
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

// ------------------------------------------------------------------ J.E Multimarcas: carros do pátio
// cada carro exposto (o carro fofinho da Rabiscolândia, veiculos3d.js) ganha um jeitinho próprio: esportivo com
// aerofólio, jipe com santantônio e estepe, florzinha no capô, carro de praia com prancha e luxo com frisos cromados
function enfeitarCarro(g, modelo) {
  const branco = matLapis(0xffffff, { roughness: 0.4 }), preto = matLapis(0x262626, { roughness: 0.6 }), cromo = matLapis(0xdfe6ee, { metalness: 0.7, roughness: 0.25 });
  const peca = (geo, m, x, y, z) => { const b = new THREE.Mesh(geo, m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; };
  const caixa = (w, h, d, m, x, y, z) => peca(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  if (modelo === 0) { // esportivo: aerofólio
    caixa(2.1, 0.08, 0.45, preto, 0, 1.62, -2.15); for (const x of [-0.75, 0.75]) caixa(0.08, 0.36, 0.12, preto, x, 1.42, -2.1);
  } else if (modelo === 1) { // jipe: santantônio e estepe atrás
    const arco = peca(new THREE.TorusGeometry(0.95, 0.07, 8, 20, Math.PI), preto, 0, 1.15, -1.25);
    const estepe = peca(new THREE.TorusGeometry(0.28, 0.13, 6, 16), preto, 0, 1.0, -2.6); void arco; void estepe;
    peca(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 12), branco, 0, 1.0, -2.6).rotation.x = Math.PI / 2;
  } else if (modelo === 2) { // florzinha no capô
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; peca(new THREE.SphereGeometry(0.13, 10, 8), branco, Math.cos(a) * 0.17, 1.2, 1.55 + Math.sin(a) * 0.17).scale.y = 0.4; }
    peca(new THREE.SphereGeometry(0.11, 10, 8), matLapis(0xec2e8c), 0, 1.23, 1.55).scale.y = 0.5;
  } else if (modelo === 3) { // praia: bagageiro com prancha de surfe
    for (const z of [-1.3, -2.1]) caixa(2.0, 0.06, 0.1, preto, 0, 1.45, z);
    const prancha = peca(new THREE.SphereGeometry(1, 16, 8), matLapis(0xffcc1f, { roughness: 0.4 }), 0, 1.55, -1.7); prancha.scale.set(0.35, 0.06, 1.5);
    caixa(0.08, 0.02, 2.6, matLapis(0xec2e8c), 0, 1.61, -1.7);
  } else { // luxo: frisos cromados, pneus faixa branca e estrelinha no capô
    for (const s of [-1, 1]) caixa(0.04, 0.08, 3.8, cromo, s * 1.17, 0.78, 0);
    for (const r of g.userData.rodas) { const anel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 20), branco); anel.rotation.y = Math.PI / 2; anel.position.x = Math.sign(r.position.x) * 0.17; r.add(anel); }
    peca(new THREE.OctahedronGeometry(0.16), matLapis(0xffd84a, { metalness: 0.6, roughness: 0.25 }), 0, 1.3, 2.05);
  }
}
// plaquinha de preço espetada no carro: o nome da cor e um "preço" de brincadeira (contar de 1 a 5)
const PRECOS = ["R$ 1 sorriso", "R$ 2 abraços", "R$ 3 obrigados", "R$ 4 sorrisos", "R$ 5 abraços"];
function plaquinhaPreco(vg) {
  const g = new THREE.Group();
  const cor = `#${new THREE.Color(vg.hex).getHexString()}`;
  const tex = texturaCanvas(256, 176, (c, w, h) => {
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h); c.lineWidth = 10; c.strokeStyle = "#151515"; c.strokeRect(5, 5, w - 10, h - 10);
    c.fillStyle = cor; c.fillRect(10, 10, w - 20, 62);
    c.font = "900 44px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#ffffff"; c.strokeStyle = "#151515"; c.lineWidth = 6;
    c.strokeText(vg.cor.toUpperCase(), w / 2, 44); c.fillText(vg.cor.toUpperCase(), w / 2, 44);
    c.font = "800 34px 'Baloo 2', sans-serif"; c.fillStyle = "#151515"; c.fillText(PRECOS[vg.modelo], w / 2, 108);
    c.fillStyle = "#ffb300"; c.font = "900 30px 'Baloo 2', sans-serif"; c.fillText("★ ★ ★", w / 2, 146);
  });
  // frente e verso (o verso também lê certo, sem espelhar)
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.3 });
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.03), mat), verso = placa.clone(); verso.rotation.y = Math.PI;
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), matLapis(0x333333)); haste.position.y = -0.85;
  g.add(placa, verso, haste);
  g.position.set(0, 2.35, 1.0);
  return g;
}
// chave do carro (voa da mão do vendedor para o Rabisco)
function chave() {
  const g = new THREE.Group(), ouro = matLapis(0xffcc1f, { metalness: 0.6, roughness: 0.3, emissive: 0x332200 });
  const argola = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16), ouro); argola.position.y = 0.25;
  const haste = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.04), ouro); haste.position.y = -0.08;
  const dente = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.04), ouro); dente.position.set(0.07, -0.22, 0);
  const pingente = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), matLapis(0xec2e8c)); pingente.position.set(0, 0.25, 0.05);
  g.add(argola, haste, dente, pingente); g.scale.setScalar(1.6);
  return g;
}
function escolherCarro(CN, c, t) {
  if (CN.fase !== "escolher") return;
  CN.escolhido = c; CN.fase = "chave";
  c.placa.removeFromParent();
  // o carro que vai sair andando: um igual, com rodas que giram e volante solto
  const novo = carroFofo(c.vg.hex); enfeitarCarro(novo, c.vg.modelo); mesclarLocal(novo, [...novo.userData.rodas, novo.userData.volante, novo.userData.seta]);
  novo.userData.seta.visible = false; novo.position.copy(c.g.position); novo.rotation.y = c.ang;
  c.g.removeFromParent(); c.g = novo; cena.add(novo);
  mundo.solidos.splice(mundo.solidos.indexOf(c.solido), 1);
  veiculos.push(c);
  CN.laco = laco(); CN.laco.position.y = -0.25; c.g.add(CN.laco);
  // o vendedor vem até a frente do carro (do lado do corredor) entregar a chave
  const fx = Math.sin(c.ang), fz = Math.cos(c.ang), lx = Math.cos(c.ang), lz = -Math.sin(c.ang);
  CN.ponto = livre(c.pos.x + fx * 3.3 + lx * 1.3, c.pos.z + fz * 3.3 + lz * 1.3, 0.4);
  CN.npc.volta = false;
  sons.moeda(); falar(`cid-je-${c.cor}`); jogo.confete?.();
  dizer("Rabisco", `Quero este! O carro ${c.cor}!`, 3000);
  void t;
  atualizarHud();
}

// ------------------------------------------------------------------ Lojas por dentro (interiores.js)
// A porta de cada loja tem um tapete na calçada: pisar nele (a pé) leva para dentro com um fade; o tapete verde
// de dentro traz de volta. A sala é montada na primeira entrada, longe da cidade (origem), e fica escondida fora.
const SALAS_DEF = {
  rise: { lugar: "parceiro-rise-up", origem: [-90, 430], montar: montarAcademia, lado: 1.0, ajudante: ["Treinadora Lápis Laranja", 0xff7a00, ["bone"], "treinadora"] },
  bella: { lugar: "parceiro-bella-cat", origem: [0, 430], montar: montarBellaCat, lado: 0, ajudante: ["Lápis Lilás", 0xa98ce0, ["laco"], "vendedora"] },
  // salas de aula: na escola da idade da criança quem recebe é a Professora Lápis Turquesa (com as aulas);
  // na outra escola, uma professora da outra turma explica que a aula é na outra Educarte
  kids2: { lugar: "escola", origem: [90, 430], montar: () => montarSalaAula({ kids1: false }), lado: 0, frente: 4, escola: true, ajudante: ["Professora Lápis Coral", 0xff8a80, ["laco"], "professora"] },
  kids1: { lugar: "kids1", origem: [180, 430], montar: () => montarSalaAula({ kids1: true }), lado: 0, escola: true, ajudante: ["Tia Lápis Lavanda", 0xc8b6ff, ["laco"], "professora"] },
};
let salas = {}, sala = null, transicao = false, bloqueioPorta = null, trava = null, fadeEl = null, barraEl = null;
const naBorda = (v) => Boolean(sala) || Math.abs(v) < BORDA + 10;
const TEX_TAPETE = texturaCanvas(256, 128, (c, w, h) => {
  c.fillStyle = "#3a2a4a"; c.fillRect(0, 0, w, h); c.strokeStyle = "#ffcc1f"; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
  c.font = "900 54px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#ffcc1f"; c.fillText("ENTRE ▲", w / 2, h / 2 + 4);
});
function criarSalas() {
  for (const [id, def] of Object.entries(SALAS_DEF)) {
    const l = lugar(def.lugar);
    if (!l) continue;
    // tapete na frente da porta da foto (1,3 m da fachada), virado para a rua
    const lat = [Math.cos(l.rot), -Math.sin(l.rot)], recuo = l.recuo - (def.frente ?? 3.08) - 1.3;
    const px = l.x - l.dir[0] * recuo + lat[0] * def.lado, pz = l.z - l.dir[1] * recuo + lat[1] * def.lado;
    const tapete = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 1.3), new THREE.MeshStandardMaterial({ map: TEX_TAPETE, roughness: 0.95 }));
    tapete.position.set(px, 0.07, pz); tapete.rotation.y = l.rot; tapete.receiveShadow = true; cena.add(tapete);
    const seta = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xffcc1f }));
    seta.rotation.x = Math.PI; seta.position.set(px, 3.4, pz); seta.visible = false; cena.add(seta);
    salas[id] = { id, def, l, porta: { x: px, z: pz }, dir: l.dir, O: def.origem, tapete, seta, obj: null, ajudante: null };
  }
}
function montarSala(S) {
  const o = S.def.montar();
  const [ox, oz] = S.O;
  o.g.position.set(ox, 0, oz); cena.add(o.g);
  for (const s of o.solidos) mundo.solidos.push({ x0: s.x0 + ox, x1: s.x1 + ox, z0: s.z0 + oz, z1: s.z1 + oz, y1: s.y1 });
  if (S.def.escola) o.escrever(...(S.id === "kids1" ? ["Educarte Kids I", "Bem-vindo, Rabisco!"] : ["Educarte Kids II", "Bem-vindo à sala de aula!"]));
  if (aulasEm() === S.id) return void (S.obj = o, S.saida = o.saida); // aqui quem recebe é a professora das aulas (npc)
  const [nome, cor, aces, onde] = S.def.ajudante, pos = o[onde];
  const p = lapis(cor, { acessorios: aces });
  p.position.set(ox + pos.x, 0.03, oz + pos.z); o.g.parent.add(p);
  S.ajudante = { nome, p, x: ox + pos.x, z: oz + pos.z, alvo: null };
  S.obj = o; S.saida = o.saida;
}
function portasDasSalas(t) {
  for (const S of Object.values(salas)) {
    const M = S.id === "rise" ? missoes.exercicio : S.id === "bella" ? missoes.presente : null;
    S.seta.visible = !sala && M?.estado === "ativa" && M.fase === "entrar";
    if (S.seta.visible) S.seta.position.y = 3.4 + Math.sin(t * 4) * 0.2;
    if (transicao || dentro || fim || oracao) continue;
    if (sala === S) {
      const [ox, oz] = S.O;
      if (!trava && Math.hypot(j.pos.x - (ox + S.obj.saida.x), j.pos.z - (oz + S.obj.saida.z)) < 0.9) sairSala(S);
    } else if (!sala) {
      const d = Math.hypot(j.pos.x - S.porta.x, j.pos.z - S.porta.z);
      if (bloqueioPorta === S.id) { if (d > 2) bloqueioPorta = null; } else if (d < 1.0) entrarSala(S);
    }
  }
}
function fade(meio) {
  transicao = true; fadeEl.classList.add("ativo");
  setTimeout(() => {
    if (!vivo) return;
    meio();
    posicionarCamera(1, 0);
    fadeEl.classList.remove("ativo");
    setTimeout(() => { transicao = false; }, 320);
  }, 300);
}
function entrarSala(S) {
  fade(() => {
    if (!S.obj) montarSala(S);
    S.obj.g.visible = true; if (S.ajudante) S.ajudante.p.visible = true;
    sala = S;
    const [ox, oz] = S.O;
    j.pos.set(ox + S.obj.entrada.x, 0.03, oz + S.obj.entrada.z); j.vel.set(0, 0, 0); j.dir = Math.PI; camYaw = Math.PI; camManual = 0;
    if (companheiro) { amigo.pos.set(j.pos.x + 1.3, 0.03, j.pos.z + 0.6); amigo.vel = amigo.vx = amigo.vz = 0; }
    cam.far = 90; cam.updateProjectionMatrix();
    sons.porta();
    if (S.def.escola) {
      if (!S.ajudante) { if (!aula) { falar("cid-aula-bemvindo"); dizer("Professora Lápis Turquesa", "Bem-vindo à sala de aula! Venha falar comigo para começar a aula!", 4200); } }
      else { falar(`cid-aula-outra-${S.id}`); dizer(S.ajudante.nome, S.id === "kids1" ? "Aqui é a Educarte Kids I, a escolinha dos pequenininhos! A sua turma estuda na Educarte Kids II." : "Aqui é a Educarte Kids II, a escola dos maiores! A sua turma estuda na Educarte Kids I, do outro lado da cidade.", 5600); }
      return;
    }
    const M = S.id === "rise" ? missoes.exercicio : missoes.presente;
    if (!M || M.estado !== "ativa") dizer(S.ajudante.nome, S.id === "rise" ? "Bem-vindo à Academia Rise Up! Fique à vontade!" : "Bem-vindo à Bella Cat! Que bom ver você!", 3000);
  });
}
function sairSala(S) {
  fade(() => {
    sala = null; trava = null;
    S.obj.g.visible = false; if (S.ajudante) S.ajudante.p.visible = false;
    j.pos.set(S.porta.x + S.dir[0] * 1.7, 0.03, S.porta.z + S.dir[1] * 1.7); j.vel.set(0, 0, 0);
    j.dir = Math.atan2(S.dir[0], S.dir[1]); camYaw = j.dir; camManual = 0;
    if (companheiro) { const [cx, cz] = livre(j.pos.x - S.dir[1] * 1.3, j.pos.z + S.dir[0] * 1.3, 0.5); amigo.pos.set(cx, 0.03, cz); amigo.vel = amigo.vx = amigo.vz = 0; }
    cam.far = 800; cam.updateProjectionMatrix();
    bloqueioPorta = S.id;
    sons.porta();
  });
}
// a treinadora e a vendedora de dentro: andam até o lugar da vez e olham para o Rabisco
function atualizarAjudantes(t, dt) {
  if (!sala?.ajudante) return;
  const a = sala.ajudante, [ox, oz] = sala.O;
  let andando = false;
  if (a.alvo) {
    const dx = ox + a.alvo.x - a.x, dz = oz + a.alvo.z - a.z, d = Math.hypot(dx, dz);
    if (d > 0.12) { const v = Math.min(d, 3 * dt); a.x += (dx / d) * v; a.z += (dz / d) * v; a.p.rotation.y = Math.atan2(dx, dz); andando = true; }
  }
  a.p.position.x = a.x; a.p.position.z = a.z;
  if (!andando) { let r = Math.atan2(j.pos.x - a.x, j.pos.z - a.z) - a.p.rotation.y; r = Math.atan2(Math.sin(r), Math.cos(r)); a.p.rotation.y += r * Math.min(1, dt * 5); }
  andarLapis(a.p, t * 9, andando ? 1 : 0);
  if (!andando) animarLapis(a, t, dt, false);
}

// ------------------------------------------------------------------ Aulas na sala da Educarte (aulas.js)
// A Professora Lápis Turquesa fica dentro da sala da escola da idade (Kids I até 4 anos; Kids II de 5 a 12 e
// quando a idade não é conhecida). Cada matéria é uma missão; as rodadas aparecem no tapete (objetos), na lousa
// (a tarefa) e na voz. Não tem erro que perde: errar só dá uma dica e repete a pergunta.
const ORDEM_VAGAS = [2, 3, 1, 4, 7, 8, 6, 9, 0, 5, 10];
const TEXTO_AULA = {
  aulaIngles: { bebe: "Vamos aprender as cores em inglês! Escute e ache a bola da cor certa. Depois aperte o botão!", k: "Aula de inglês! Escute bem e ache o que eu pedir. Depois aperte o botão!" },
  aulaPortugues: { bebe: "Vamos ouvir os bichinhos! Escute o som e ache o bichinho certo!", k: "Aula de português! Vamos escrever uma palavra: pegue as letras na ordem certa!" },
  aulaMatematica: { bebe: "Vamos brincar com as formas e contar até três!", k: "Aula de matemática! Pegue as maçãs na bandeja e leve para a minha mesa!" },
};
const FALA_AULA = { aulaIngles: "cid-aula-ingles", aulaPortugues: "cid-aula-portugues", aulaMatematica: "cid-aula-matematica" };
let aula = null; // aula em andamento: { M, rod, i, R, objs, pos, carregando, espera }
let filaFala = [], filaT = null;
// várias falas em sequência (uma espera a outra acabar, pela duração do MP3)
function falarFila(chaves) {
  filaFala = [...chaves]; clearTimeout(filaT);
  const passo = () => {
    if (!filaFala.length) return;
    if (performance.now() < falaAte - 60) { filaT = setTimeout(passo, 120); return; }
    falar(filaFala.shift()); filaT = setTimeout(passo, 350);
  };
  passo();
}
function criarAulas(L) {
  const nivel = nivelDaIdade(idadeCrianca());
  const onde = nivel === "bebe" && L("kids1") ? "kids1" : "kids2";
  const [ox, oz] = SALAS_DEF[onde].origem;
  const prof = npc("Professora Lápis Turquesa", 0x2ec4b6, ox + PROFESSORA_AULA.x, oz + PROFESSORA_AULA.z, "cid-aula-bemvindo", ["laco", "oculos"]);
  prof.aulas = onde;
  prof.calado = () => Boolean(aula);
  for (const mat of MATERIAS) {
    missoes[mat.id] = { id: mat.id, nome: mat.nome, icone: mat.icone, estado: "nova", npc: prof, materia: mat, nivel, sala: onde,
      texto: TEXTO_AULA[mat.id][nivel === "bebe" ? "bebe" : "k"], fala: `${FALA_AULA[mat.id]}${nivel === "bebe" ? "-bebe" : ""}`,
      aoAceitar() { iniciarAula(this); },
      alvo() { return alvoAula(this); } };
  }
}
function alvoAula(M) {
  const S = salas[M.sala];
  if (sala !== S) return { x: S.porta.x, z: S.porta.z, emoji: "🏫" };
  const [ox, oz] = S.O, o = S.obj;
  if (aula?.M !== M || !aula.R) return { x: M.npc.x, z: M.npc.z, emoji: "👩‍🏫" };
  if (aula.R.tipo === "contar") return aula.carregando >= aula.R.n ? { x: ox + o.mesa.x, z: oz + o.mesa.z, emoji: "🧺" } : { x: ox + o.bandeja.x, z: oz + o.bandeja.z, emoji: "🍎" };
  return { x: ox, z: oz - 1.4, emoji: "✋" };
}
function iniciarAula(M) {
  aula = { M, rod: M.materia.gerar(M.nivel, Math.random), i: -1, objs: [], pos: 0, carregando: 0, espera: true };
  setTimeout(() => { if (aula?.M === M) { aula.espera = false; proximaRodada(); } }, 900);
}
function limparObjsAula() {
  for (const o of aula?.objs ?? []) o.g.removeFromParent();
  if (aula) aula.objs = [];
}
const embaralhar = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
function proximaRodada() {
  limparObjsAula();
  aula.i++;
  const R = aula.R = aula.rod[aula.i];
  if (!R) return terminarAula();
  const S = salas[aula.M.sala], o = S.obj, [ox, oz] = S.O;
  aula.pos = 0; aula.carregando = 0;
  const por = (itens) => itens.forEach((op, k) => { const v = o.vagas[ORDEM_VAGAS[k]]; const g = objetoAula(op); g.position.set(v.x, 0.05, v.z); o.g.add(g); aula.objs.push({ ...op, g, x: ox + v.x, z: oz + v.z }); });
  if (R.tipo === "achar") { por(embaralhar(R.opcoes)); o.escrever(R.lousa, R.sub ?? ""); }
  else if (R.tipo === "letras") { por(R.blocos.map((l) => ({ tipo: "letra", valor: l, nome: `a letra ${l}` }))); escreverPalavra(); }
  else { o.escrever(R.lousa, `Traga ${R.n === 1 ? "1 maçã" : "as maçãs"} para a mesa`); o.macasBandeja.forEach((m) => (m.visible = true)); }
  falarFila(R.fala);
  atualizarHud();
}
function escreverPalavra() {
  const R = aula.R, o = salas[aula.M.sala].obj;
  o.escrever([...R.palavra].map((l, i) => (i < aula.pos ? l : "_")).join(" "), `Palavra: ${R.palavra}`);
}
const ehIngles = () => aula?.M.id === "aulaIngles";
function acertou(espera = 2300) {
  const prof = aula.M.npc;
  aula.espera = true; sons.moeda(); receber(prof);
  falar(ehIngles() ? "en-cid-yes" : "cid-aula-certo");
  dizer(prof.nome, ehIngles() ? "Yes! Great job! Muito bem!" : ["Muito bem!", "Isso mesmo!", "Que capricho!"][aula.i % 3], 2000);
  const M = aula.M;
  setTimeout(() => { if (aula?.M === M) { aula.espera = false; proximaRodada(); } }, espera);
}
function errou(texto, falas) {
  sons.erro?.();
  dizer(aula.M.npc.nome, texto, 3400);
  falarFila([...(falas ?? [ehIngles() ? "en-cid-try" : "cid-aula-dica"]), ...aula.R.fala]);
}
function escolherAula(obj) {
  if (!aula?.R || aula.espera) return;
  const R = aula.R;
  if (R.tipo === "achar") {
    if (obj.valor === R.certo) { obj.g.position.y += 0.35; acertou(); }
    else errou(`Esse é ${obj.nome}. Escute de novo e tente outra vez!`);
  } else if (R.tipo === "letras") {
    const certa = R.palavra[aula.pos];
    if (obj.valor === certa) {
      aula.pos++; sons.letra?.(); falar(`letra-${certa}`); escreverPalavra(); obj.festa = 0.5;
      if (aula.pos === R.palavra.length) { aula.espera = true; setTimeout(() => { if (aula) { falarFila(R.fala.slice(0, 0)); acertou(2600); } }, 900); }
      atualizarHud();
    } else errou(`Essa é a letra ${obj.valor}. Procure a letra ${certa}!`, ["cid-aula-procure", `letra-${certa}`]);
  }
}
function pilhaDeMacas(n) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const m = maca(); m.position.set(((i % 3) - 1) * 0.3, Math.floor(i / 3) * 0.26, 0); g.add(m); }
  return g;
}
function pegarMaca() {
  if (!aula?.R || aula.espera || aula.R.tipo !== "contar") return;
  if (aula.carregando >= 10) { dizer(aula.M.npc.nome, "Já está bem cheio! Leve para a mesa.", 2200); return; }
  aula.carregando++;
  const o = salas[aula.M.sala].obj;
  o.macasBandeja.forEach((m, i) => (m.visible = i >= aula.carregando));
  sons.moeda(); falar(`cid-num-${aula.carregando}`);
  levar(pilhaDeMacas(aula.carregando));
  atualizarHud();
}
function entregarMacas() {
  if (!aula?.R || aula.espera || aula.R.tipo !== "contar" || !aula.carregando) return;
  const R = aula.R, o = salas[aula.M.sala].obj, c = aula.carregando;
  levar(null);
  if (c === R.n) {
    const p = pilhaDeMacas(c); p.scale.setScalar(0.7); p.position.set(o.mesa.cesta.position.x, 1.25, o.mesa.cesta.position.z); o.g.add(p); aula.objs.push({ g: p });
    acertou(2600);
  } else {
    aula.carregando = 0; o.macasBandeja.forEach((m) => (m.visible = true));
    errou(`Você trouxe ${c}. ${R.lousa.includes("?") ? "Faça a conta de novo, devagarinho!" : `Eu pedi ${R.n}.`} Vamos contar de novo!`, ["cid-aula-conta-de-novo"]);
  }
  atualizarHud();
}
function terminarAula() {
  const M = aula.M, prof = M.npc, o = salas[M.sala].obj;
  limparObjsAula(); levar(null);
  o.macasBandeja.forEach((m) => (m.visible = true));
  o.escrever("Parabéns!", `★ ${M.nome} ★`);
  aula = null;
  receber(prof); prof.ultima = relogio.elapsedTime;
  concluir(M); jogo.confete?.();
  falar("cid-aula-fim");
  dizer(prof.nome, "Parabéns, Rabisco! Você aprendeu muito hoje! “O sábio ouve e aprende ainda mais.” (baseado em Provérbios 1:5)", 6400);
  if (Object.values(missoes).some((m) => m.npc === prof && m.estado === "nova")) { prof.marca.material.map = MARCA; prof.marca.material.needsUpdate = true; prof.marca.visible = true; }
}
// botão de ação dentro da sala: escolher objeto, pegar maçã ou entregar na mesa (a criança do jogador 2 também)
function regrasDaAula(aPe, acaoJ2) {
  if (!aula?.R || aula.espera || sala?.id !== aula.M.sala) return;
  const S = sala, o = S.obj, [ox, oz] = S.O, R = aula.R;
  const maisPerto = (p) => aula.objs.filter((q) => q.tipo).map((q) => ({ q, d: Math.hypot(q.x - p.x, q.z - p.z) })).filter((q) => q.d < 1.7).sort((a, b) => a.d - b.d)[0]?.q;
  if (R.tipo !== "contar") {
    const meu = aPe ? maisPerto(j.pos) : null, dela = dois && companheiro ? maisPerto(amigo.pos) : null;
    for (const q of aula.objs) if (q.g.userData.anel) q.g.userData.anel.visible = q === meu || q === dela;
    if (meu) contexto = { tipo: "aula", rotulo: "✋ Este!", fazer: () => escolherAula(meu) };
    if (acaoJ2 && dela) escolherAula(dela);
    return;
  }
  const bx = ox + o.bandeja.x, bz = oz + o.bandeja.z, mx = ox + o.mesa.x, mz = oz + o.mesa.z;
  for (const p of [j.pos, ...(dois && companheiro ? [amigo.pos] : [])]) {
    const ehJ2 = p === amigo.pos;
    let fazer = null, rotulo = "";
    if (Math.hypot(p.x - bx, p.z - bz) < 1.9) { fazer = pegarMaca; rotulo = `🍎 Pegar (${aula.carregando})`; }
    else if (Math.hypot(p.x - mx, p.z - mz) < 2.1 && aula.carregando) { fazer = entregarMacas; rotulo = `🧺 Entregar ${aula.carregando}`; }
    if (!fazer) continue;
    if (ehJ2) { if (acaoJ2) fazer(); } else contexto = { tipo: fazer === pegarMaca ? "aula-pegar" : "aula-entregar", rotulo, fazer };
  }
}

// ------------------------------------------------------------------ Bella Cat: escolher e embrulhar
function escolherAcessorio(PV, p, t) {
  if (PV.fase !== "escolher") return;
  PV.escolhido = p; PV.fase = "embrulhar"; PV.t0 = t; p.levado = true;
  for (const q of salas.bella.obj.pedestais) q.anel.visible = q === p;
  const S = salas.bella;
  // o acessório sai do pedestal e voa para o balcão
  S.obj.g.attach(p.obj);
  PV.de = p.obj.position.clone();
  S.ajudante.alvo = { x: S.obj.vendedora.x, z: S.obj.vendedora.z };
  sons.moeda(); falar(`cid-bella-${p.id}`);
  dizer(S.ajudante.nome, `${p.art === "a" ? "A" : "O"} ${p.nome}! Que ${p.art === "a" ? "linda" : "lindo"}! Vou embrulhar numa caixinha de presente.`, 3600);
  // o Rabisco e a câmera viram para o balcão para ver o embrulho
  const [ox, oz] = S.O, bx = ox + S.obj.balcao.x, bz = oz + S.obj.balcao.z;
  camYaw = Math.atan2(bx - j.pos.x, bz - j.pos.z); camManual = 4.5; j.dir = camYaw;
  atualizarHud();
}
function embrulhar(PV, t) {
  const S = salas.bella, o = S.obj, k = (t - PV.t0) / 1.1, p = PV.escolhido;
  const e = new THREE.Vector3(o.embrulho.x, o.embrulho.y + 0.15, o.embrulho.z);
  if (k < 1) { p.obj.position.lerpVectors(PV.de, e, k); p.obj.position.y += Math.sin(k * Math.PI) * 1.2; p.obj.rotation.y = t * 6; return; }
  if (!PV.caixa) {
    p.obj.visible = false;
    PV.caixa = presente(p.cor); PV.caixa.position.copy(e); PV.caixa.scale.setScalar(0.01); o.g.add(PV.caixa);
    receber(S.ajudante); sons.porta();
  }
  const k2 = Math.min(1, (t - PV.t0 - 1.1) / 0.6);
  PV.caixa.scale.setScalar(0.01 + k2 * 0.7); PV.caixa.rotation.y = t * 2;
  if (t - PV.t0 > 3.2) {
    PV.caixa.removeFromParent();
    levar(presente(p.cor));
    PV.fase = "levar"; falar("cid-bella-embrulho");
    dizer(S.ajudante.nome, "Pronto, embrulhadinho! Agora leve o presente até a Professora Lápis Turquesa, na porta da escola!", 5600);
    atualizarHud();
  }
}

// ------------------------------------------------------------------ Rise Up: esteira e halter
function treinar(EX, S, t, dt, aPe, acaoJ2, pertoJ2) {
  const o = S.obj, [ox, oz] = S.O, e = o.esteira, ex = ox + e.x, ez = oz + e.z;
  const perto = (x, z, r) => Math.hypot(j.pos.x - x, j.pos.z - z) < r;
  e.g.children[1].material.color.setHex(EX.fase === "esteira" && Math.sin(t * 6) > 0 ? 0xffd84a : 0xffffff);
  if (EX.fase === "esteira" && aPe && !trava && (perto(ex, ez + 1.9, 1.3) || pertoJ2(ex, ez + 1.9, 1.3))) {
    trava = { x: ex, y: 0.27, z: ez + 0.3, dir: Math.PI, modo: "andar", vel: 3 };
    EX.fase = "correndo"; barraEl.hidden = false; camYaw = Math.PI + 0.75; camManual = 4;
    sons.pisao(); atualizarHud();
  }
  if (EX.fase === "correndo") {
    const { iy } = entradaAndar();
    contexto = { tipo: "correr", rotulo: "🏃 Correr!", fazer: () => { EX.empurrao = 0.6; } };
    if (acaoJ2) EX.empurrao = 0.6;
    EX.empurrao = (EX.empurrao || 0) - dt;
    const forte = iy > 0.3 || tem("acao") || EX.empurrao > 0;
    EX.corrida = Math.min(1, EX.corrida + dt * (0.045 + (forte ? 0.15 : 0)));
    trava.vel = forte ? VEL : 3.2;
    e.cinta.offset.y += dt * trava.vel * 0.5;
    camManual = 1;
    barraEl.firstElementChild.style.width = `${Math.round(EX.corrida * 100)}%`;
    if (EX.corrida >= 0.5 && !EX.meio) { EX.meio = true; falar("cid-rise-corre"); dizer(S.ajudante.nome, "Isso! Continue correndo!", 2400); }
    if (EX.corrida >= 1) {
      trava = null; j.pos.set(ex + 1.4, 0.03, ez + 2.0); barraEl.hidden = true;
      EX.fase = "peso"; S.ajudante.alvo = o.treinadoraPeso; receber(S.ajudante); sons.volta(); falar("cid-rise-peso");
      dizer(S.ajudante.nome, "Que corrida! Agora vamos levantar o halter. Vá até o colchonete laranja e aperte o botão cinco vezes!", 6000);
      atualizarHud();
    }
    return;
  }
  if (EX.fase !== "peso") return;
  const px = ox + o.peso.x, pz = oz + o.peso.z;
  if (!EX.pronto && aPe && (perto(px, pz, 1.4) || pertoJ2(px, pz, 1.4))) {
    // em cima do colchonete, de frente para a sala: pega os dois halteres
    EX.pronto = true; EX.parado = t;
    trava = { x: px, y: 0.1, z: pz + 0.2, dir: 0, modo: "parado", vel: 0 };
    camYaw = Math.PI - 0.55; camManual = 99;
    o.peso.halter.visible = false;
    EX.maos = [rabisco.bracoE, rabisco.bracoD].map((b, i) => { const h = halter(matLapis(i ? 0x1d6fe0 : 0xec2e8c, { roughness: 0.4 }), 1.7); h.position.set(0, -0.86, 0); h.rotation.y = Math.PI / 2; b.cotovelo.add(h); return h; });
    sons.pisao();
  }
  if (!EX.pronto) return;
  camManual = 99;
  const levantar = () => { if (EX.rep == null && EX.levantou < 5) { EX.rep = 0; EX.contou = false; EX.parado = t; } };
  if (EX.levantou < 5) contexto = { tipo: "levantar", rotulo: "🏋️ Levantar!", fazer: levantar };
  if (acaoJ2) levantar();
  if (EX.rep == null && EX.levantou < 5 && t - EX.parado > 6) { EX.parado = t; dizer(S.ajudante.nome, "Aperte o botão para levantar o halter!", 2400); }
  let k = 0;
  if (EX.rep != null) {
    EX.rep += dt;
    k = Math.sin(Math.min(1, EX.rep / 0.9) * Math.PI);
    if (EX.rep > 0.42 && !EX.contou) {
      EX.contou = true; EX.levantou++; sons.moeda(); falar(`cid-num-${EX.levantou}`);
      dizer(S.ajudante.nome, `${EX.levantou}! ${EX.levantou < 5 ? "Mais um!" : "Muito bem!"}`, 1400);
      atualizarHud();
    }
    if (EX.rep >= 0.9) EX.rep = null;
  }
  // pose: halteres na altura dos ombros e, a cada levantamento, braços esticados para cima
  for (const [b, s] of [[rabisco.bracoE, 1], [rabisco.bracoD, -1]]) { b.ombro.rotation.set(0, 0, s * (1.25 + k * 1.65)); b.cotovelo.rotation.x = 0; b.cotovelo.rotation.z = s * (1.5 - k * 1.5); }
  rabisco.tronco.rotation.x = 0;
  if (EX.levantou >= 5 && EX.rep == null && !EX.fimT) {
    EX.fimT = t;
    soltarHalteres(EX, o); receber(S.ajudante); concluir(EX); jogo.confete?.(); falar("cid-rise-ok");
    dizer(S.ajudante.nome, "Parabéns, Rabisco! Você foi forte e corajoso! Corpo saudável, coração alegre!", 5600);
  }
}
function soltarHalteres(EX, o) {
  for (const h of EX.maos || []) h.removeFromParent();
  for (const b of [rabisco.bracoE, rabisco.bracoD]) b.cotovelo.rotation.z = 0;
  EX.maos = null; o.peso.halter.visible = true; trava = null; camManual = 0;
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
  // 2. gatinhos escondidos pela cidade (atrás da Igreja Reviver, no parque e atrás do hospital)
  const lugaresGatos = [atras(L("igreja"), 30), [60, 88], atras(L("hospital"), 24)].map(([x, z]) => livre(x, z, 0.6));
  missoes.gatos = { id: "gatos", nome: "Gatinhos", icone: "🐱", estado: "nova", achados: 0, npc: npc("Lápis Rosa", 0xec2e8c, PRACA.x + 7.5, PRACA.z + 3, "cid-gatos"),
    texto: "Meus três gatinhos fugiram! Um foi para trás da Igreja Reviver, outro para o parque e outro para trás do hospital.",
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
  const lugaresFogo = [[-22, -82], [22, 86], [-52, 47], [86, -22]].map(([x, z]) => livre(x, z, 1.2));
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
  // 10. Hora da Aula: a mochila azul ficou na casa azul (nº 2); levar ao Lápis Azulzinho na porta da escola antes do sino
  // a escola da criança: Educarte Kids I (até 4 anos) ou Kids II (5 a 12, e quando a idade não é conhecida)
  const escola = idadeCrianca() != null && idadeCrianca() <= 4 && L("kids1") ? L("kids1") : L("escola"), casaAzul = CASAS.find((c) => c.cor === "azul");
  const [mx, mz] = livre(casaAzul.x + 0.6, casaAzul.z + 1.4, 0.5);
  const objMochila = mochila(); objMochila.position.set(mx, 0.35, mz); objMochila.visible = false; cena.add(objMochila);
  missoes.escola = { id: "escola", nome: "Hora da Aula", icone: "🎒", estado: "nova", fase: "buscar", escolaNome: escola.nome, sino: 90, tocou: false, mochila: { x: mx, z: mz, g: objMochila },
    npc: npc("Professora Lápis Turquesa", 0x2ec4b6, ...naPorta(escola, 6.5), "cid-professora", ["laco", "oculos"]),
    texto: "Oi, Rabisco! O sino da aula já vai tocar e o Lápis Azulzinho esqueceu a mochila em casa! Busque a mochila azul na casa azul, a de número 2, e traga para ele aqui na porta da escola!",
    aoAceitar() { this.sino = 90; objMochila.visible = true; },
    alvo() { return this.fase === "buscar" ? { x: this.mochila.x, z: this.mochila.z, emoji: "🎒" } : { x: this.aluno.x, z: this.aluno.z, emoji: "🏫" }; } };
  missoes.escola.aluno = receptor("Lápis Azulzinho", 0x3d7ad9, ...naPorta(escola, 2.5), escola.dir, () => missoes.escola.estado === "ativa", { acessorios: ["bone"], escala: 0.6 });
  // 11. convite para o culto infantil: três amigos lápis espalhados pela cidade seguem o Rabisco até a Igreja Reviver
  const igreja = L("igreja"), latIg = [-igreja.dir[1], igreja.dir[0]];
  const patio = (lado, prof = 2) => [igreja.x - igreja.dir[0] * prof + latIg[0] * lado, igreja.z - igreja.dir[1] * prof + latIg[1] * lado];
  const pontosConvite = [[naPorta(L("padaria"), 9), 0xe8413c, "Lápis Vermelhinho"], [[L("parque").x - 8, L("parque").z], 0xffcc1f, "Lápis Amarelinho"], [[-79.5, 27], 0x58c43a, "Lápis Verdinho"]];
  missoes.igreja = { id: "igreja", nome: "Convite", icone: "💌", estado: "nova", convidados: 0,
    npc: npc("Tia Lápis Lilás, da Igreja Reviver", 0xa98ce0, ...patio(-4), "cid-igreja", ["laco"]),
    texto: "Oi, Rabisco! Hoje tem culto infantil na Igreja Reviver! Convide três amigos lápis pela cidade e traga todos aqui. Siga os coraçõezinhos!",
    amigos: pontosConvite.map(([[x0, z0], cor, nome]) => {
      const [x, z] = livre(x0, z0, 0.8);
      const p = lapis(cor, { escala: 0.6, acessorios: cor === 0xffcc1f ? ["laco"] : ["bone"] });
      const marca = new THREE.Sprite(new THREE.SpriteMaterial({ map: CORACAO, depthTest: false })); marca.scale.setScalar(1.1); marca.position.y = 3.7; marca.renderOrder = 5; marca.visible = false; p.add(marca);
      p.position.set(x, 0.03, z); cena.add(p);
      return { nome, p, x, z, marca, convidado: false };
    }),
    alvo() {
      if (this.convidados < 3) { const a = this.amigos.filter((q) => !q.convidado).sort((a, b) => dist2(a) - dist2(b))[0]; return { x: a.x, z: a.z, emoji: "💌" }; }
      return { x: this.npc.x, z: this.npc.z, emoji: "⛪" };
    } };
  missoes.igreja.npc.lado = igreja.dir; // os convidados ficam do lado de fora da Tia (longe do tapete da oração)
  missoes.igreja.npc.espera = () => missoes.igreja.estado === "ativa" && missoes.igreja.convidados === 3;
  // 12. Pai Nosso: orar juntos, frase por frase, no tapete da porta da Igreja Reviver
  const [tx, tz] = patio(0, 2.2);
  const objTapete = tapete(); objTapete.position.set(tx, 0, tz); objTapete.visible = false; cena.add(objTapete);
  missoes.painosso = { id: "painosso", nome: "Pai Nosso", icone: "🙏", estado: "nova", frase: 0, tapete: { x: tx, z: tz, g: objTapete, olhar: Math.atan2(-igreja.dir[0], -igreja.dir[1]), dir: igreja.dir },
    npc: npc("Tio Lápis Azul, da Igreja Reviver", 0x1f3a8a, ...patio(4), "cid-painosso", ["gravata"]),
    texto: "Oi, Rabisco! Vamos orar juntos o Pai Nosso? Venha para o tapete azul na porta da igreja. Eu falo uma frase e você repete comigo, bem devagarinho.",
    aoAceitar() { objTapete.visible = true; },
    alvo() { return { x: this.tapete.x, z: this.tapete.z, emoji: "🙏" }; } };
  // 13–15. lojas parceiras (parceiros.js e mapa.js): cada missão só existe se a loja estiver na cidade
  const je = L("parceiro-je-multimarcas"), bella = L("parceiro-bella-cat"), rise = L("parceiro-rise-up");
  // carro novo: no pátio da J.E (PATIO_JE) o Rabisco escolhe um dos 5 carros, ganha a chave do Seu Lápis Cinza, sai
  // dirigindo pelo portão e leva o carro para mostrar ao Seu Lápis Verde, na casa verde. O carro continua dele.
  if (je) {
    const verde = CASAS.find((c) => c.cor === "verde");
    const patio = PATIO_JE.vagas.map((vg) => {
      const g = carroFofo(vg.hex);
      enfeitarCarro(g, vg.modelo);
      g.userData.seta.visible = false;
      mesclarLocal(g, [g.userData.seta]); // parado no pátio: o carro inteiro (rodas e enfeites) vira poucas malhas; ao ser escolhido, ganha um igual com rodas que giram
      const placa = plaquinhaPreco(vg); g.add(placa);
      g.position.set(vg.x, 0.03, vg.z); g.rotation.y = vg.ang;
      cena.add(g);
      // colisão do carro exposto (caixa alinhada, um pouco menor que o carro girado): o Rabisco e o carro que sai desviam
      const sa = Math.abs(Math.sin(vg.ang)), ca = Math.abs(Math.cos(vg.ang));
      const hx = (sa * 2.3 + ca * 1.15) * 0.9, hz = (ca * 2.3 + sa * 1.15) * 0.9;
      const solido = { x0: vg.x - hx, x1: vg.x + hx, z0: vg.z - hz, z1: vg.z + hz, y1: 1.0 };
      mundo.solidos.push(solido);
      return { g, vg, pos: new THREE.Vector3(vg.x, 0.03, vg.z), ang: vg.ang, vel: 0, virar: 0, giro: 0, batida: 0, buzina: 0, caixa: null, cor: vg.cor, placa, solido };
    });
    const vendedor = npc("Seu Lápis Cinza, da J.E Multimarcas", 0x6b6b6b, PATIO_JE.x0 - 1.9, PATIO_JE.portao[0] - 1.6, "cid-je", ["gravata"]);
    vendedor.casa = [vendedor.x, vendedor.z];
    missoes.carroNovo = { id: "carroNovo", nome: "Carro novo", icone: "🔑", estado: "nova", fase: "escolher", patio, escolhido: null, laco: null,
      npc: vendedor,
      texto: "Olá, Rabisco! Bem-vindo à J.E Multimarcas, a loja de carros! Entre no pátio pelo portão e escolha o carro que você mais gostar. Chegue pertinho e aperte o botão!",
      destino: { x: verde.x + verde.dir[0] * 7.5, z: verde.z + verde.dir[1] * 7.5 },
      alvo() {
        const E = this.escolhido;
        if (this.fase === "escolher") { const c = this.patio.filter((q) => q !== E).sort((a, b) => dist2(a.pos) - dist2(b.pos))[0]; return { x: c.pos.x, z: c.pos.z, emoji: "🚗" }; }
        if (this.fase === "chave") return { x: this.npc.x, z: this.npc.z, emoji: "🔑" };
        if (dentro !== E) return { x: E.pos.x, z: E.pos.z, emoji: "🔑" };
        if (this.fase === "sair") return { x: PATIO_JE.saida[0], z: PATIO_JE.saida[1], emoji: "🚧" };
        return { ...this.destino, emoji: "🏠" };
      } };
    vendedor.calado = () => missoes.carroNovo.estado === "ativa" && missoes.carroNovo.fase !== "escolher";
  }
  // presente para a Professora: entrar na Bella Cat, escolher um acessório nos pedestais, a Lápis Lilás embrulha e o
  // Rabisco leva até a Professora Lápis Turquesa, que espera na porta da escola
  if (bella) {
    missoes.presente = { id: "presente", nome: "Presente da Professora", icone: "🎁", estado: "nova", fase: "entrar", escolhido: null,
      npc: npc("Lápis Lilás, da Bella Cat", 0xa98ce0, ...naPorta(bella), "cid-bella", ["laco"]),
      texto: "Oi, Rabisco! Que tal um presente para a Professora Lápis Turquesa? Entre aqui na Bella Cat e escolha um acessório bem bonito!",
      alvo() {
        const S = salas.bella, [ox, oz] = S.O;
        if (this.fase === "levar") { if (sala === S) return { x: ox + S.saida.x, z: oz + S.saida.z, emoji: "🚪" }; const p = missoes.escola.npc; return { x: p.x, z: p.z, emoji: "🎁" }; }
        if (sala !== S) return { x: S.porta.x, z: S.porta.z, emoji: "🚪" };
        if (this.fase === "embrulhar") return { x: ox + S.obj.balcao.x - 1, z: oz + S.obj.balcao.z, emoji: "🎁" };
        const p = S.obj.pedestais.filter((q) => !q.levado).sort((a, b) => dist2({ x: ox + a.x, z: oz + a.z }) - dist2({ x: ox + b.x, z: oz + b.z }))[0];
        return { x: ox + p.x, z: oz + p.z + 1.2, emoji: "💝" };
      } };
  }
  // exercício na Rise Up: entrar na academia, correr na esteira (barrinha enchendo) e levantar o halter 5 vezes
  if (rise) {
    missoes.exercicio = { id: "exercicio", nome: "Exercício", icone: "💪", estado: "nova", fase: "entrar", corrida: 0, levantou: 0,
      npc: npc("Treinadora Lápis Laranja, da Rise Up", 0xff7a00, ...naPorta(rise), "cid-rise", ["bone"]),
      texto: "Oi, Rabisco! Bem-vindo à Academia Rise Up! Aqui a gente cuida do corpo que Deus nos deu. Entre pela porta e vamos treinar!",
      alvo() {
        const S = salas.rise, [ox, oz] = S.O;
        if (sala !== S) return { x: S.porta.x, z: S.porta.z, emoji: "🚪" };
        if (this.fase === "peso") return { x: ox + S.obj.peso.x, z: oz + S.obj.peso.z, emoji: "🏋️" };
        return { x: ox + S.obj.esteira.x, z: oz + S.obj.esteira.z + 1.9, emoji: "🏃" };
      } };
  }
  // remédio de helicóptero: a Doutora Lápis Branca, no heliponto do hospital, pede para levar o remédio da Vovó
  const heli = veiculos.find((v) => v.heli);
  missoes.remedio = { id: "remedio", nome: "Remédio", icone: "🚁", estado: "nova",
    npc: npc("Doutora Lápis Branca, do hospital", 0xf4f4f4, HELIPONTO.x - HELIPONTO.r - 2.2, HELIPONTO.z + 2, "cid-remedio", ["oculos"]),
    texto: "Oi, Rabisco! A Vovó Lápis precisa do remédio dela! Leve de helicóptero: suba no helicóptero aqui do heliponto e pouse pertinho da casa laranja, perto da Rua Leste.",
    aoAceitar() { levar(maleta()); },
    alvo() { const v = quemRecebe.vovo; return dentro === heli || this.voou ? { x: v.x, z: v.z, emoji: "👵" } : { x: heli.pos.x, z: heli.pos.z, emoji: "🚁" }; } };
  criarAulas(L);
  criarSalas();
  for (const n of npcs) if (n.aulas) n.mapa = salas[n.aulas].porta; // no minimapa, a professora das aulas aparece na porta da escola
  // 16. passaporte: visitar todos os lugares
  missoes.passaporte = { id: "passaporte", nome: "Passeio", icone: "🗺️", estado: "ativa",
    alvo() { const l = mundo.lugares.filter((q) => !visitados.has(q.id)).sort((a, b) => dist2(a) - dist2(b))[0]; return l && { x: l.x, z: l.z, emoji: "📍" }; } };
  // quem recebe as entregas, esperando na frente de cada destino
  const ativa = (id) => missoes[id]?.estado === "ativa";
  const portaCasa = (c, lado) => { const lat = [-c.dir[1], c.dir[0]]; return [c.x + c.dir[0] * 0.7 + lat[0] * lado, c.z + c.dir[1] * 0.7 + lat[1] * lado]; };
  for (const [cor, hex, nome, aces] of [["vermelha", 0xd94a3d, "Seu Lápis Vermelho", ["chapeu"]], ["azul", 0x3d7ad9, "Mamãe Lápis Azul", ["laco"]], ["amarela", 0xf2c94c, "Dona Lápis Amarela", ["laco", "oculos"]]]) {
    const c = CASAS.find((q) => q.cor === cor);
    quemRecebe.cartas[cor] = receptor(nome, hex, ...portaCasa(c, 1.8), c.dir,
      () => (ativa("cartas") && !missoes.cartas.entregues.includes(cor)) || (cor === "azul" && ativa("escola") && missoes.escola.fase === "buscar"), { acessorios: aces });
  }
  const cv = CASAS.find((q) => q.vovo);
  quemRecebe.vovo = receptor("Vovó Lápis", 0xf4a3c4, ...portaCasa(cv, 1.8), cv.dir, () => (ativa("encomenda") && Boolean(missoes.encomenda.noCarro)) || ativa("remedio"), { acessorios: ["vovo"] });
  if (missoes.carroNovo) { const c = CASAS.find((q) => q.cor === "verde"); quemRecebe.verde = receptor("Seu Lápis Verde, da casa verde", 0x4cae5a, ...portaCasa(c, 1.8), c.dir, () => ativa("carroNovo"), { acessorios: ["chapeu"] }); }
  const kids2 = L("escola");
  quemRecebe.merendeira = receptor("Tia Lápis Amarela, a merendeira", 0xffcc1f, ...naPorta(kids2, -2.5), kids2.dir, () => ativa("pao"), { acessorios: ["chef"] });
  // a professora espera o presente da Bella Cat na porta da escola (acena e não puxa conversa até receber)
  if (missoes.presente) missoes.escola.npc.espera = missoes.escola.npc.calado = () => ativa("presente") && missoes.presente.fase === "levar";
  preCarregarFalas(["cid-intro", "cid-carteiro", "cid-gatos", "cid-padeiro", "cid-guarda", "cid-carta-ok", "cid-gato-ok", "cid-pao-ok", "cid-faixa-ok", "cid-espere", "cid-missao-ok", "cid-final"]); // as falas das missões novas (cid-carro, cid-corrida...) tocam sob demanda
}
// idade da criança do cadastro (src/motor/familia.js: nascimento → idade); ?idade=N na URL vale para testar
function idadeCrianca() {
  if (params.has("idade")) return Number(params.get("idade"));
  const i = window.Familia?.crianca?.()?.idade;
  return Number.isFinite(i) ? i : null;
}
const dist2 = (p) => (p.x - j.pos.x) ** 2 + (p.z - j.pos.z) ** 2;
const centroFaixa = (f) => ({ x: (f.x0 + f.x1) / 2, z: (f.z0 + f.z1) / 2 });
// convidados da Igreja Reviver: seguem o Rabisco em fila (de carro, vão de carona e somem até ele descer)
function seguirRabisco(dt, t) {
  let ant = { x: j.pos.x, z: j.pos.z };
  for (const a of convidados) {
    a.p.visible = !dentro;
    if (dentro) { a.x = j.pos.x; a.z = j.pos.z; ant = a; continue; }
    const dx = ant.x - a.x, dz = ant.z - a.z, d = Math.hypot(dx, dz);
    if (d > 16) [a.x, a.z] = livre(ant.x - Math.sin(j.dir) * 1.6, ant.z - Math.cos(j.dir) * 1.6, 0.4);
    else if (d > 1.6) {
      const v = Math.min(VEL * 1.05, (d - 1.6) * 3) * dt, nx = a.x + (dx / d) * v, nz = a.z + (dz / d) * v;
      if (!bate(nx, a.z, 0.1, 0.25)) a.x = nx;
      if (!bate(a.x, nz, 0.1, 0.25)) a.z = nz;
    }
    a.p.position.x = a.x; a.p.position.z = a.z;
    if (d > 0.05) a.p.rotation.y = Math.atan2(dx, dz);
    animarLapis(a, t, dt, false);
    if (d > 1.7 && !a.festa) a.p.position.y = 0.03 + Math.abs(Math.sin(t * 9 + a.x)) * 0.12; // passinhos
    ant = a;
  }
}

// ------------------------------------------------------------------ Oração do Pai Nosso
// O Rabisco fica parado no tapete, olhando para a igreja, de mãos juntas; a câmera para atrás dele, a luz fica
// mais suave e cada frase aparece grande, acendendo palavra por palavra enquanto a voz fala (karaokê). Depois da
// voz, a criança "repete junto" e aperta Ação (ou espera) para a próxima. Sem pressa e sem errar.
const ESPERA_REPETIR = 4.5; // segundos depois da voz até seguir sozinho
function duracaoFrase(PN, i) {
  const a = PN.audios?.[i], d = a?.duration;
  return Number.isFinite(d) && d > 0 ? d : 0.8 + ORACAO[i].length * 0.075;
}
function comecarOracao(PN, t) {
  const tp = PN.tapete;
  j.pos.set(tp.x, 0.03, tp.z); j.vel.set(0, 0, 0); j.dir = tp.olhar;
  PN.audios ??= ORACAO.map((_, i) => { const a = new Audio(`../../assets/voz/cid-pai-${i + 1}.mp3`); a.preload = "metadata"; return a; });
  if (companheiro) { // a criança ora do lado do Rabisco
    const lat = [-tp.dir[1], tp.dir[0]];
    const [cx, cz] = livre(tp.x + lat[0] * 1.3, tp.z + lat[1] * 1.3, 0.4);
    amigo.pos.set(cx, 0.03, cz); amigo.vel = 0; amigo.vx = amigo.vz = 0; amigo.dir = tp.olhar;
  }
  oracao = { i: -1, inicio: t, dur: 2.8, luz: sol.intensity, exp: r3.toneMappingExposure };
  painelOracao.hidden = false;
  painelOracao.innerHTML = `<p class="frase">🙏 Vamos orar juntos.</p><p class="dica">Fique quietinho e repita comigo.</p>`;
  falar("cid-pai-intro");
}
function proximaFrase(PN, t) {
  oracao.i++;
  if (oracao.i >= ORACAO.length) return terminarOracao(PN);
  oracao.inicio = t; oracao.dur = duracaoFrase(PN, oracao.i);
  const palavras = ORACAO[oracao.i].split(" ");
  painelOracao.innerHTML = `<p class="frase">${palavras.map((w) => `<span>${w}</span>`).join(" ")}</p><p class="dica"></p><p class="conta">${oracao.i + 1} / ${ORACAO.length}</p>`;
  falar(`cid-pai-${oracao.i + 1}`);
  PN.frase = oracao.i + 1;
  atualizarHud();
}
function terminarOracao(PN) {
  sol.intensity = oracao.luz; r3.toneMappingExposure = oracao.exp;
  oracao = null;
  painelOracao.hidden = true;
  receber(PN.npc);
  concluir(PN);
  jogo.confete();
  dizer(PN.npc.nome, "Amém! Deus ouve a nossa oração. (Pai Nosso: Mateus 6:9-13)", 5200);
}
function seguirOracao(PN, t, dt) {
  const k = Math.min(1, dt * 1.5); // luz mais suave
  sol.intensity += (oracao.luz * 0.6 - sol.intensity) * k;
  r3.toneMappingExposure += (oracao.exp * 0.92 - r3.toneMappingExposure) * k;
  j.dir = PN.tapete.olhar; rabisco.grupo.rotation.y = j.dir;
  // mãos juntas na frente do peito e cabeça um pouco baixa (o Rabisco e a criança)
  for (const rb of [rabisco, companheiro?.rabisco]) {
    if (!rb) continue;
    rb.bracoE.ombro.rotation.set(-0.85, 0, -0.62); rb.bracoD.ombro.rotation.set(-0.85, 0, 0.62);
    rb.bracoE.cotovelo.rotation.x = -1.05; rb.bracoD.cotovelo.rotation.x = -1.05;
    rb.tronco.rotation.x = 0.1;
  }
  if (companheiro) { amigo.dir = PN.tapete.olhar; companheiro.grupo.rotation.y = amigo.dir; }
  const passou = t - oracao.inicio;
  if (oracao.i >= 0) {
    const spans = painelOracao.querySelectorAll(".frase span");
    const acesas = Math.ceil(spans.length * Math.min(1, passou / (oracao.dur * 0.92)));
    spans.forEach((sp, n) => sp.classList.toggle("dita", n < acesas));
    const dica = painelOracao.querySelector(".dica");
    const txt = passou > oracao.dur ? (oracao.i === ORACAO.length - 1 ? "Amém! 🙏" : "Agora você! Repita e aperte 🙏 para seguir.") : "";
    if (dica.textContent !== txt) dica.textContent = txt;
  }
  const pode = passou > Math.min(oracao.dur * 0.6, oracao.dur - 0.3);
  contexto = pode ? { tipo: "orar", rotulo: "🙏 Amém, próxima", fazer: () => proximaFrase(PN, t) } : { tipo: "orar-espera", rotulo: "🙏 Orando…", fazer: () => {} };
  if (passou > oracao.dur + (oracao.i < 0 ? 0.6 : ESPERA_REPETIR)) proximaFrase(PN, t);
}
// a professora das aulas fica na sala (longe da cidade): no mapa e na seta ela "mora" na porta da escola
const posNoMapa = (n) => (n.mapa && sala?.id !== n.aulas ? [n.mapa.x, n.mapa.z] : [n.x, n.z]);
const aulasEm = () => (nivelDaIdade(idadeCrianca()) === "bebe" && lugar("kids1") ? "kids1" : "kids2");
function carroMaisPerto() {
  const v = [...veiculos].sort((a, b) => dist2(a.pos) - dist2(b.pos))[0];
  return v && { x: v.pos.x, z: v.pos.z, emoji: "🚗" };
}
function alvoAtual() {
  const M = foco && missoes[foco];
  if (M && M.estado === "ativa") return M.alvo();
  // sem missão em foco: o amigo com "!" mais perto
  const n = npcs.filter((q) => q.marca.visible && Object.values(missoes).some((m) => m.npc === q && m.estado === "nova")).map((q) => { const [x, z] = posNoMapa(q); return { x, z }; }).sort((a, b) => dist2(a) - dist2(b))[0];
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
    if (n.calado?.()) { n.ultima = t; continue; } // ocupado na missão (vendedor entregando a chave, professora esperando o presente)
    if (j.pos.y < 4 && perto(n.x, n.z, dentro ? 5 : 3) && t - n.ultima > 8) { n.ultima = t; conversar(n); }
  }
  // cartas: caixa de correio da cor certa (a pé)
  const C = missoes.cartas;
  if (C.estado === "ativa" && aPe) for (const casa of mundo.casas) {
    if (C.entregues.includes(casa.cor) || !["vermelha", "azul", "amarela"].includes(casa.cor)) continue;
    if (perto(casa.x, casa.z, 2.6)) {
      C.entregues.push(casa.cor);
      casa.correio.scale.setScalar(1.3); setTimeout(() => casa.correio.scale.setScalar(1), 400);
      sons.moeda(); falar("cid-carta-ok"); receber(quemRecebe.cartas[casa.cor]);
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
  if (P.estado === "ativa" && perto(P.destino.x, P.destino.z, 6)) { receber(quemRecebe.merendeira); concluir(P); falar("cid-pao-ok"); dizer("Escola", "Que cheirinho bom! Obrigado pelo pão, Rabisco!", 3600); carregando = null; }
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
      dentro.caixa?.removeFromParent(); dentro.caixa = null; receber(quemRecebe.vovo);
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
  // portas das lojas com interior: pisar no tapete da porta (a pé) entra; o tapete verde de dentro sai
  portasDasSalas(t);
  // quem pode agir: o Rabisco e, no modo 2 jogadores, a criança do jogador 2 (botão de ação dela)
  const acaoJ2 = dois && companheiro && aPe && amigo.acaoNova;
  const pertoJ2 = (x, z, r) => dois && companheiro && aPe && Math.hypot(amigo.pos.x - x, amigo.pos.z - z) < r;
  // carro novo (J.E Multimarcas): escolher no pátio, ganhar a chave, sair pelo portão e mostrar na casa verde
  const CN = missoes.carroNovo;
  if (CN) {
    const P = PATIO_JE;
    const noPatio = j.pos.x > P.x0 && j.pos.x < P.x1 && j.pos.z > P.z0 && j.pos.z < P.z1;
    if (CN.estado === "nova" && aPe && noPatio) { CN.npc.ultima = t; conversar(CN.npc); } // entrou no pátio sem falar com ele: ele recebe
    for (const c of CN.patio) if (c !== CN.escolhido) { c.placa.position.y = 2.35 + Math.sin(t * 2 + c.pos.z) * 0.05; c.placa.scale.setScalar(1); }
    if (CN.estado === "ativa" && CN.fase === "escolher") {
      // o carro mais perto (do Rabisco ou da criança do jogador 2) ganha destaque; Ação = "Quero este!"
      const cand = CN.patio.map((c) => ({ c, d: Math.hypot(c.pos.x - j.pos.x, c.pos.z - j.pos.z), d2: dois && companheiro ? Math.hypot(c.pos.x - amigo.pos.x, c.pos.z - amigo.pos.z) : 99 }));
      const meu = aPe ? cand.filter((q) => q.d < 3.6).sort((a, b) => a.d - b.d)[0] : null;
      const dela = cand.filter((q) => q.d2 < 3.6).sort((a, b) => a.d2 - b.d2)[0];
      for (const q of [meu, dela]) if (q) q.c.placa.scale.setScalar(1.25 + Math.sin(t * 6) * 0.08);
      if (meu) contexto = { tipo: "escolher-carro", rotulo: "⭐ Quero este!", fazer: () => escolherCarro(CN, meu.c, t) };
      if (acaoJ2 && dela) escolherCarro(CN, dela.c, t);
    }
    if (CN.fase === "chave") { // o vendedor vai até o carro escolhido e entrega a chave
      const n = CN.npc, [ax, az] = CN.ponto;
      const dx = ax - n.x, dz = az - n.z, d = Math.hypot(dx, dz);
      if (d > 0.15) { const v = Math.min(d, 3.4 * dt); n.x += (dx / d) * v; n.z += (dz / d) * v; n.p.position.x = n.x; n.p.position.z = n.z; n.p.rotation.y = Math.atan2(dx, dz); andarLapis(n.p, t * 9, 1); }
      else if (!CN.chave) {
        andarLapis(n.p, 0, 0);
        CN.chave = chave(); CN.chave.position.set(n.x, 1.6, n.z); cena.add(CN.chave); CN.chaveT = t;
        receber(n); sons.moeda(); falar("cid-je-chave");
        dizer(n.nome, "É seu! Cuide bem dele! Aqui está a chave. Entre no carro e saia pelo portão!", 5200);
      }
      if (CN.chave) {
        const k = Math.min(1, (t - CN.chaveT) / 0.9);
        CN.chave.position.set(n.x + (j.pos.x - n.x) * k, 1.6 + Math.sin(k * Math.PI) * 1.2 + k * 0.8, n.z + (j.pos.z - n.z) * k);
        CN.chave.rotation.y = t * 6;
        if (k >= 1) { CN.chave.removeFromParent(); CN.chave = null; CN.fase = "entrar"; CN.escolhido.g.userData.seta.visible = !dentro; atualizarHud(); }
      }
    }
    if (CN.estado === "ativa" && CN.escolhido) CN.laco.children[2].scale.setScalar(1 + Math.sin(t * 5) * 0.15);
    if (CN.fase === "entrar" && dentro === CN.escolhido) { CN.fase = "sair"; dizer(CN.npc.nome, "Isso! Agora saia devagar pelo portão!", 3000); atualizarHud(); }
    if (CN.fase === "sair" && dentro === CN.escolhido && CN.escolhido.pos.x < P.x0 - 1.5) {
      CN.fase = "levar"; CN.npc.volta = true; receber(CN.npc); sons.volta(); falar("cid-je-portao");
      dizer(CN.npc.nome, "Boa viagem! Leve o carro novo até a casa verde: o Seu Lápis Verde quer ver! Siga a seta.", 5200);
      atualizarHud();
    }
    if (CN.npc.volta) { // o vendedor volta para o portão
      const n = CN.npc, [ax, az] = n.casa, dx = ax - n.x, dz = az - n.z, d = Math.hypot(dx, dz);
      if (d > 0.15) { const v = Math.min(d, 3 * dt); n.x += (dx / d) * v; n.z += (dz / d) * v; n.p.position.x = n.x; n.p.position.z = n.z; if (!n.festa) { n.p.rotation.y = Math.atan2(dx, dz); andarLapis(n.p, t * 9, 1); } }
      else { n.volta = false; andarLapis(n.p, 0, 0); }
    }
    if (CN.estado === "ativa" && CN.fase === "levar" && dentro === CN.escolhido && perto(CN.destino.x, CN.destino.z, 8)) {
      CN.laco.removeFromParent(); receber(quemRecebe.verde);
      concluir(CN); falar("cid-je-ok"); dizer("Seu Lápis Verde, da casa verde", `Uau, que carro ${CN.escolhido.cor} lindo! Parabéns, Rabisco! Vamos agradecer a Deus por esse presente!`, 5200);
    }
  }
  // presente para a Professora (Bella Cat): escolher o acessório, esperar o embrulho e levar até a professora
  const PV = missoes.presente;
  if (PV?.estado === "ativa") {
    const S = salas.bella;
    if (PV.fase === "entrar" && sala === S) { PV.fase = "escolher"; falar("cid-bella-escolha"); dizer(S.ajudante.nome, "Que bom que você veio! Escolha um presente: chegue pertinho de um pedestal e aperte o botão!", 5200); atualizarHud(); }
    if (sala === S && PV.fase === "escolher") {
      const [ox, oz] = S.O;
      const ped = S.obj.pedestais.map((p) => ({ p, d: Math.hypot(ox + p.x - j.pos.x, oz + p.z - j.pos.z), d2: Math.hypot(ox + p.x - amigo.pos.x, oz + p.z - amigo.pos.z) }));
      const meu = ped.filter((q) => q.d < 1.9).sort((a, b) => a.d - b.d)[0], dela = dois && companheiro ? ped.filter((q) => q.d2 < 1.9).sort((a, b) => a.d2 - b.d2)[0] : null;
      for (const q of ped) q.p.anel.visible = q === meu || q === dela || Math.sin(t * 4) > 0;
      if (meu) contexto = { tipo: "escolher-acessorio", rotulo: "💝 Este!", fazer: () => escolherAcessorio(PV, meu.p, t) };
      if (acaoJ2 && dela) escolherAcessorio(PV, dela.p, t);
    }
    if (PV.fase === "embrulhar") embrulhar(PV, t);
    if (PV.fase === "levar" && !sala && perto(missoes.escola.npc.x, missoes.escola.npc.z, dentro ? 7 : 3.5)) {
      const prof = missoes.escola.npc;
      prof.ultima = t; levar(null);
      const caixinha = presente(PV.escolhido.cor); caixinha.scale.setScalar(0.75); caixinha.position.set(0, 0.72, 0.6); prof.p.add(caixinha);
      receber(prof); concluir(PV); falar("cid-bella-ok");
      dizer(prof.nome, `Que ${PV.escolhido.art === "a" ? "linda" : "lindo"} ${PV.escolhido.art === "a" ? "esta" : "este"} ${PV.escolhido.nome}! Obrigada por lembrar de mim, Rabisco. Deus te abençoe!`, 5600);
    }
  }
  // exercício (Rise Up): esteira e halter dentro da academia
  const EX = missoes.exercicio;
  if (EX?.estado === "ativa") {
    const S = salas.rise;
    if (EX.fase === "entrar" && sala === S) {
      EX.fase = "esteira"; S.ajudante.alvo = S.obj.treinadora; falar("cid-rise-esteira");
      dizer(S.ajudante.nome, "Primeiro, a esteira! Suba na esteira do meio e corra: aperte o botão ou vá para a frente!", 5600); atualizarHud();
    }
    if (sala === S) treinar(EX, S, t, dt, aPe, acaoJ2, pertoJ2);
  }
  // aulas na sala da Educarte
  regrasDaAula(aPe, acaoJ2);
  if (amigo.acaoNova) amigo.acaoNova = false;
  // Hora da Aula: pegar a mochila azul na casa azul e levar ao Lápis Azulzinho antes do sino
  const ES = missoes.escola;
  if (ES.estado === "ativa") {
    const quem = [[j, true]];
    if (dois && companheiro && aPe) quem.push([amigo, true]);
    if (ES.sino > 0) {
      ES.sino -= dt;
      if (ES.sino <= 0) { sons.volta(); falar("cid-sino"); dizer("Professora Lápis Turquesa", "Plim, plom! O sino tocou! Mas a professora espera você. Corra, Rabisco!", 3600); atualizarHud(); }
    }
    const mo = ES.mochila;
    if (ES.fase === "buscar") {
      mo.g.rotation.y = t * 1.5; mo.g.position.y = 0.35 + Math.abs(Math.sin(t * 3)) * 0.15;
      if (quem.some(([p]) => Math.hypot(p.pos.x - mo.x, p.pos.z - mo.z) < (dentro ? 4.5 : 2.2))) {
        ES.fase = "levar"; mo.g.visible = false; levar(mochila()); receber(quemRecebe.cartas.azul);
        sons.moeda(); falar("cid-mochila"); dizer("Mamãe Lápis Azul", `A mochila azul! Obrigada, Rabisco! Agora corra para a ${ES.escolaNome}!`, 3600);
        atualizarHud();
      }
    } else if (perto(ES.aluno.x, ES.aluno.z, dentro ? 7 : 3.4)) {
      levar(null);
      const m = mochila(); m.position.set(0, 0.85, -0.5); ES.aluno.p.add(m);
      receber(ES.aluno); receber(ES.npc);
      concluir(ES); falar("cid-escola-ok");
      dizer("Lápis Azulzinho", ES.sino > 0 ? "Minha mochila! Obrigado, Rabisco! Chegou antes do sino. Hoje a aula é das letras: A, B, C!" : "Minha mochila! Obrigado, Rabisco! Hoje a aula é das letras: A, B, C!", 4800);
    }
  }
  // Convite: os amigos lápis com coração viram convidados e seguem o Rabisco até a Igreja Reviver
  const CV = missoes.igreja;
  if (CV.estado === "ativa") {
    for (const a of CV.amigos) {
      if (a.convidado) continue;
      a.marca.visible = true; a.marca.position.y = 3.7 + Math.sin(t * 3) * 0.15;
      a.p.rotation.y = Math.atan2(j.pos.x - a.x, j.pos.z - a.z);
      animarLapis(a, t, dt, Math.hypot(j.pos.x - a.x, j.pos.z - a.z) < 14);
      const pertoDele = perto(a.x, a.z, dentro ? 5 : 2.4) || (dois && companheiro && aPe && Math.hypot(amigo.pos.x - a.x, amigo.pos.z - a.z) < 2.4);
      if (pertoDele) {
        a.convidado = true; a.marca.visible = false; CV.convidados++; convidados.push(a); receber(a);
        sons.moeda(); falar(CV.convidados < 3 ? "cid-convite" : "cid-convite-todos");
        dizer(a.nome, CV.convidados < 3 ? `Oba! Eu vou ao culto infantil! (${CV.convidados} de 3)` : "Eu também vou! Três amigos! Agora vamos todos para a Igreja Reviver!", 3400);
        atualizarHud();
      }
    }
    seguirRabisco(dt, t);
    if (CV.convidados === 3 && perto(CV.npc.x, CV.npc.z, dentro ? 8 : 4)) {
      CV.npc.ultima = t;
      // os convidados entram no pátio, lado a lado, e todo mundo comemora
      const lat = [-CV.npc.lado[1], CV.npc.lado[0]];
      convidados.forEach((a, i) => { [a.x, a.z] = livre(CV.npc.x - lat[0] * (1.6 + i * 1.3), CV.npc.z - lat[1] * (1.6 + i * 1.3), 0.5); a.p.visible = true; a.p.position.set(a.x, 0.03, a.z); a.p.rotation.y = Math.atan2(j.pos.x - a.x, j.pos.z - a.z); receber(a); });
      receber(CV.npc);
      concluir(CV); falar("cid-igreja-ok");
      dizer(CV.npc.nome, "Que alegria! “Alegrei-me quando me disseram: vamos à casa do Senhor!” (baseado no Salmo 122:1)", 7600);
    }
  }
  for (const a of CV.amigos) if (a.convidado && CV.estado === "feita") animarLapis(a, t, dt, false);
  // Pai Nosso: no tapete da porta da Igreja Reviver, orar frase por frase
  const PN = missoes.painosso;
  if (PN.estado === "ativa") {
    PN.tapete.g.userData.borda.material.emissiveIntensity = 1 + Math.sin(t * 2.5) * 0.6;
    if (!oracao && perto(PN.tapete.x, PN.tapete.z, dentro ? 6 : 1.5)) {
      if (dentro) { if (t - (PN.avisou || -9) > 7) { PN.avisou = t; dizer(PN.npc.nome, "Para orar, saia do carro e venha para o tapete.", 3000); } }
      else comecarOracao(PN, t);
    }
    if (oracao) seguirOracao(PN, t, dt);
  }
  // remédio (helicóptero): pousar perto da casa laranja e entregar à Vovó (ou chegar a pé com a maleta)
  const RM = missoes.remedio;
  if (RM?.estado === "ativa") {
    if (dentro?.heli && j.pos.y > 3 && !RM.voou) { RM.voou = true; atualizarHud(); }
    const vv = quemRecebe.vovo, pousado = dentro?.heli ? heliPousado(dentro) : true;
    if (pousado && perto(vv.x, vv.z, dentro?.heli ? 16 : 3.5) && (RM.voou || !dentro)) {
      levar(null); receber(vv); vv.ultimaFesta = t;
      concluir(RM); falar("cid-remedio-ok"); dizer("Vovó Lápis", "Meu remédio! Obrigada, Rabisco! Que voo lindo! Deus cuida de nós com tanto carinho.", 5600);
    }
  }
  atualizarAmigos(t, dt);
  atualizarAjudantes(t, dt);
  atualizarLevando(t);
  // passaporte: marca o lugar ao chegar perto (de carro, em silêncio: só um selo discreto)
  for (const l of mundo.lugares) {
    if (visitados.has(l.id) || !perto(l.x, l.z, l.raio)) continue;
    visitados.add(l.id);
    sons.volta();
    jogo.aviso(`📍 ${l.nome}`, "bom", 2000);
    if (visitados.size === mundo.lugares.length) concluir(missoes.passaporte);
    atualizarHud();
  }
  // a pé: só comenta o lugar quando a criança PARA perto dele (uma vez por lugar, nunca por cima de outra fala)
  {
    const parada = Math.hypot(j.vel.x, j.vel.z) < 0.3;
    if (!aPe || !parada || oracao) paradoDesde = null; else if (paradoDesde == null) paradoDesde = t;
    if (paradoDesde != null && t - paradoDesde >= 1 && t - ultimaFalaLugar >= 8 && !balao.classList.contains("ativo") && performance.now() > falaAte + 500) {
      const l = mundo.lugares.find((q) => !falouLugar.has(q.id) && perto(q.x, q.z, q.raio));
      if (l) { falouLugar.add(l.id); ultimaFalaLugar = t; falar(`cid-lugar-${l.id}`); }
    }
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
    if (aPe) { const v = pertoDeCarro(); if (v) contexto = { tipo: "entrar", rotulo: v.heli ? "🚁 Entrar" : "🚗 Entrar", fazer: () => entrarNoCarro(v) }; }
    else if (dentro.heli) contexto = { tipo: "sair", rotulo: heliPousado(dentro) ? "🚪 Sair" : "🚁 Pouse para sair", fazer: () => sairDoCarro() };
    else contexto = { tipo: "sair", rotulo: Math.abs(dentro.vel) > 3 ? "🛑 Pare para sair" : "🚪 Sair", fazer: () => sairDoCarro() };
  }
  if (pad.acaoNova) { pad.acaoNova = false; contexto?.fazer(); }
  for (const v of veiculos) if (v !== dentro) (v.heli ? animarHeli(v, dt, false) : animarCarro(v, dt));
}
const NOMES_MISSAO = { remedio: "remedio", cartas: "cartas", gatos: "gatos", pao: "pao", faixa: "faixa", corrida: "corrida", encomenda: "encomenda", fogo: "fogo", tesouro: "tesouro", patos: "patos", carroNovo: "je", presente: "bella", exercicio: "rise", escola: "professora", igreja: "igreja", painosso: "painosso" };
function conversar(n) {
  const dela = Object.values(missoes).filter((m) => m.npc === n);
  const M = n.aulas ? (dela.find((m) => m.estado === "ativa") ?? dela.find((m) => m.estado === "nova") ?? dela[0]) : dela[0]; // a professora: uma aula de cada vez
  if (!M) return;
  if (M.estado === "nova") {
    aceitar(M);
    n.marca.material.map = MARCA_OK; n.marca.material.needsUpdate = true;
    falar(M.fala ?? n.fala);
    dizer(n.nome, M.texto, 7600);
    if (M === missoes.pao) carregando = "pao";
    M.aoAceitar?.();
    setTimeout(() => { if (!oracao) jogo.aviso(`${M.icone} Siga a seta ➤`, "bom", 2200); }, 7800);
    atualizarHud();
  } else if (M.estado === "ativa") {
    foco = M.id;
    if (M === missoes.patos) dizer(n.nome, "Conte os patinhos do lago e pise no número certo aqui do meu lado!", 3000);
    else if (M === missoes.painosso) { if (!oracao) dizer(n.nome, "Venha para o tapete azul aqui na porta. Vamos orar juntos!", 2800); }
    else if (M === missoes.igreja && M.convidados < 3) dizer(n.nome, `Convide os amigos com coração! Já são ${M.convidados} de 3.`, 2800);
    else dizer(n.nome, "Você consegue, Rabisco! Estou esperando aqui.", 2600);
  } else {
    dizer(n.nome, "Obrigado pela ajuda, Rabisco!", 2400);
  }
}
// fala da cidade: o motor só toca uma por vez; aqui lembramos até quando a atual vai (pela duração do MP3)
// para o "Missão cumprida" falado esperar o fim dela em vez de cortá-la.
const duracaoFala = new Map(); // chave → segundos (vem dos metadados do MP3)
let falaAte = 0;
function falar(chave) {
  const agora = performance.now();
  const dur = duracaoFala.get(chave);
  falaAte = agora + (dur ?? 3.5) * 1000;
  if (dur == null) {
    const a = new Audio(new URL(`../../assets/voz/${chave}.mp3`, import.meta.url).href);
    a.preload = "metadata";
    a.addEventListener("loadedmetadata", () => { if (Number.isFinite(a.duration)) { duracaoFala.set(chave, a.duration); falaAte = Math.max(falaAte, agora + a.duration * 1000); } });
  }
  falarMotor(chave);
}
function concluir(M) {
  if (M.estado === "feita") return;
  M.estado = "feita";
  if (foco === M.id) foco = Object.values(missoes).find((m) => m.estado === "ativa" && m.id !== "passaporte")?.id ?? null;
  if (companheiro) setTimeout(async () => { radio?.pausarPorFala(true); try { await parabenizar({ gravada: false }); } finally { radio?.pausarPorFala(false); } }, 900);
  if (M.npc && !Object.values(missoes).some((m) => m !== M && m.npc === M.npc && m.estado !== "feita")) M.npc.marca.visible = false;
  sons.porta();
  // o letreiro é imediato; a voz "Missão cumprida" espera a fala em andamento acabar (ou é omitida se faltar mais de 6 s: versículo, Amém)
  setTimeout(() => {
    jogo.aviso(`${M.icone} Missão cumprida!`, "bom", 2200);
    const falta = falaAte - performance.now();
    if (falta <= 0) falar("cid-missao-ok");
    else if (falta <= 6000) setTimeout(() => { if (falaAte - performance.now() <= 0) falar("cid-missao-ok"); }, falta + 150);
  }, 600);
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
    if (m.id === "carroNovo") return ` <small>${{ escolher: "⭐→🚗", chave: "🔑", entrar: "🔑→🚗", sair: "🚗→🚧" }[m.fase] ?? "🚗→🏠"}</small>`;
    if (m.materia) return aula?.M === m && aula.R ? ` <small>${aula.R.tipo === "letras" ? `${aula.pos}/${aula.R.palavra.length}` : aula.R.tipo === "contar" ? `🍎${aula.carregando}` : ""} ${aula.i + 1}/${aula.rod.length}</small>` : ` <small>🏫</small>`;
    if (m.id === "remedio") return ` <small>${m.voou ? "🚁→👵" : "🩺→🚁"}</small>`;
    if (m.id === "presente") return ` <small>${{ entrar: "🚪→💝", escolher: "💝?", embrulhar: "🎁…" }[m.fase] ?? "🎁→🏫"}</small>`;
    if (m.id === "exercicio") return ` <small>${m.fase === "entrar" ? "🚪→🏋️" : m.fase === "peso" ? `🏋️ ${m.levantou}/5` : `🏃 ${Math.round(m.corrida * 100)}%`}</small>`;
    if (m.id === "escola") return ` <small>${m.fase === "buscar" ? "🏠→🎒" : "🎒→🏫"}${m.sino > 0 ? ` ⏰${Math.ceil(m.sino)}` : " 🔔"}</small>`;
    if (m.id === "igreja") return ` <small>${"💌".repeat(m.convidados)}${"·".repeat(3 - m.convidados)}</small>`;
    if (m.id === "painosso") return m.frase ? ` <small>${m.frase}/${ORACAO.length}</small>` : "";
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
  for (const n of npcs) { if (!n.marca.visible || !Object.values(missoes).some((m) => m.npc === n && m.estado === "nova")) continue; const [x, y] = P(...posNoMapa(n)); c.fillStyle = "#ffcc1f"; c.strokeStyle = "#151515"; c.lineWidth = 3; c.font = `900 ${Math.round(S / 11)}px 'Baloo 2'`; c.textAlign = "center"; c.strokeText("!", x, y + S / 40); c.fillText("!", x, y + S / 40); }
  // carros que dá para dirigir
  for (const v of veiculos) {
    const [x, y] = P(v.pos.x, v.pos.z);
    c.save(); c.translate(x, y); c.rotate(Math.PI - v.ang);
    c.fillStyle = `#${new THREE.Color(v.g.userData.cor ?? v.g.children[0].material.color).getHexString()}`; c.strokeStyle = "#151515"; c.lineWidth = 1.5;
    c.fillRect(-S / 90, -S / 55, S / 45, S / 27.5); c.strokeRect(-S / 90, -S / 55, S / 45, S / 27.5);
    c.restore();
  }
  // alvo da missão: piscando (anel que cresce + bolinha que troca de cor) e o emoji
  const a = sala ? { ...sala.porta, emoji: "🏠" } : alvoAtual();
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
  const [x, y] = sala ? P(sala.porta.x, sala.porta.z) : P(j.pos.x, j.pos.z);
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
  if (!a || fim || oracao) { bussola.hidden = true; return; }
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
let tMapa = 0, tHud = 0, tPerto = 0;
// desempenho: selos e moradores longe da câmera não são desenhados (ficam pequenos e no meio da neblina)
function mostrarSoPerto() {
  const x = cam.position.x, z = cam.position.z;
  for (const s of selos) s.m.visible = s.vivo && (s.m.position.x - x) ** 2 + (s.m.position.z - z) ** 2 < 75 * 75;
  const perto = (p, r) => (p.position.x - x) ** 2 + (p.position.z - z) ** 2 < r * r;
  for (const m of moradores) m.p.visible = perto(m.p, 75);
  // amigos lápis parados (missões, quem recebe, convidados): o "!" do minimapa usa a marca, não o lápis
  for (const n of npcs) n.p.visible = perto(n.p, 80);
  for (const r of receptores) r.p.visible = perto(r.p, 80);
  for (const a of missoes.igreja?.amigos ?? []) if (!a.convidado) a.p.visible = perto(a.p, 80);
  for (const c of carros) c.g.visible = perto(c.g, 150);
  // carros parados do pátio da J.E: de longe (mais de 110 m, já na neblina) não são desenhados
  for (const c of missoes.carroNovo?.patio ?? []) if (c !== missoes.carroNovo.escolhido) c.g.visible = perto(c.g, 110);
}
function quadro() {
  if (!vivo) return;
  const dt = Math.min(relogio.getDelta(), 1 / 30);
  // jogador 2 entrou no meio do jogo: a criança aparece; saiu (controle caiu e seguem só com o Rabisco): ela some
  if (!dois && J.ativo && J.j2Pronto) { dois = true; criarCompanheira(); }
  else if (dois && !J.ativo) { dois = false; removerCompanheira(); }
  if (!jogo.pausado) {
    const t = relogio.elapsedTime;
    const { andando } = dentro ? (dentro.heli ? pilotarHeli(dt) : dirigirCarro(dt)) : moverJogador(dt);
    if (heliBotoes) heliBotoes.hidden = !dentro?.heli;
    jogo.palco.querySelector(".cena-cidade")?.classList.toggle("no-veiculo", Boolean(dentro));
    jogo.palco.querySelector(".cena-cidade")?.classList.toggle("no-heli", Boolean(dentro?.heli));
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
    tPerto -= dt;
    if (tPerto <= 0) { tPerto = 0.3; mostrarSoPerto(); }
    tHud -= dt;
    if (tHud <= 0 && ((missoes.corrida?.estado === "ativa" && missoes.corrida.proxima > 0) || (missoes.escola?.estado === "ativa" && missoes.escola.sino > 0) || missoes.exercicio?.fase === "correndo")) { tHud = 0.5; atualizarHud(); }
  }
  r3.render(cena, cam);
  requestAnimationFrame(quadro);
}

if (params.has("teste")) window.teste = {
  jogo, j, carros, veiculos, moradores, lugarDoMapa, amigo, get dois() { return dois; },
  get companheiro() { return companheiro; }, get missoes() { return missoes; }, get mundo() { return mundo; }, get selos() { return selosPegos; }, carroBate, get falouLugar() { return falouLugar.size; }, get visitados() { return visitados.size; },
  get dentro() { return dentro; }, get foco() { return foco; }, get oracao() { return oracao; }, get quemRecebe() { return quemRecebe; }, receptores, alvo: () => alvoAtual(), get contexto() { return contexto?.tipo ?? null; },
  ir(x, z, y = 0.03) { j.pos.set(x, y, z); j.vel.set(0, 0, 0); posicionarCamera(1, 0); }, olhar(yaw) { camYaw = yaw; camManual = 5; posicionarCamera(1, 0); },
  vista(pos, alvo) { vistaTeste = pos ? { pos, alvo } : null; cena.fog.far = pos ? 2000 : 300; cena.fog.near = pos ? 1500 : 80; posicionarCamera(1, 0); },
  acao() { pad.acaoNova = true; }, entrar(i = 0) { const v = veiculos[i]; j.pos.set(v.pos.x + 2, 0.03, v.pos.z); entrarNoCarro(v); }, sair() { if (dentro) dentro.vel = 0; sairDoCarro(); },
  volante(acel, virar, extra = {}) { entradaTeste = acel == null ? null : { acel, virar, ...extra }; }, get heli() { return veiculos.find((v) => v.heli); },
  aceitar(id) { const M = missoes[id]; if (M.estado === "nova") { M.npc.ultima = -99; conversar(M.npc); } return M.estado; },
  mapaGrande: () => alternarMapaGrande(), bate: (x, z) => bate(x, z, 0.1),
  get cena() { return cena; }, carroBtn, heliBtn, get aula() { return aula; }, aulasEm: () => aulasEm(), get radio() { return radio; }, get sala() { return sala?.id ?? null; }, get salas() { return salas; }, get transicao() { return transicao; }, get trava() { return trava; },
  entrarSala(id) { const S = salas[id]; j.pos.set(S.porta.x, 0.03, S.porta.z); }, cam: () => cam, info: () => r3.info.render,
  acaoJ2() { amigo.acaoNova = true; },
  levarCarro(i, x, z, ang) { const v = veiculos[i]; v.pos.set(x, 0.03, z); v.ang = ang; v.vel = 0; animarCarro(v, 0); if (dentro === v) j.pos.set(x, 0.03, z); },
};
