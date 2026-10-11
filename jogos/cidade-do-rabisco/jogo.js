// Cidade do Rabisco: mundo livre para explorar a cidade com o Rabisco 3D. Sem tempo e sem perder:
// a criança passeia, conversa com os moradores (é só chegar perto) e cumpre missões aconchegantes —
// entregar cartas pela cor da casa, achar gatinhos, levar pão para a escola, atravessar na faixa com
// o bonequinho verde e visitar todos os lugares (passaporte da cidade). Selos espalhados para colecionar.

import { THREE, texturaCanvas } from "../../src/motor3d/toon.js";
import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
import { moeda3D, pilotoLapis } from "../../src/motor3d/objetos.js";
import { carregarTextura } from "../../src/motor3d/toon.js";
import { criarCasca, el } from "../../src/motor/casca.js";
import { sons, musica } from "../../src/motor/sons.js";
import { falar, preCarregarFalas } from "../../src/motor/voz.js";
import { criarJoystick } from "../../src/motor/joystick.js";
import { montarCidade, carro, RUAS, BORDA, RUA } from "./cidade.js";

const VEL = 6.5, PULO = 9.6, GRAV = 25, LARG = 0.35, ALT = 1.7;
const params = new URLSearchParams(location.search);

const jogo = criarCasca({
  titulo: "Cidade do Rabisco",
  sub: "Passeie, ajude os amigos e conheça a cidade!",
  faixa: "pequenos",
  cor: "#8E6CFF",
  pose: "apresentando",
  deitado: true,
  menuNoJogo: false,
  teclado: false,
  dica: {
    teclado: "WASD ou setas para andar · Q/E giram a câmera · Espaço pula · P pausa",
    toque: "Arraste à esquerda para andar · à direita para olhar · ⤒ pula",
    controle: "Alavanca esquerda anda · direita gira a câmera · A pula · Start pausa",
  },
  falas: { titulo: "cid-titulo", vitoria: null },
  aoComecar: iniciar,
  aoSair: parar,
  aoPausar: () => { teclas.clear(); toque?.zerar(); },
  aoContinuar: () => {},
  aoControle: lerControle,
});

// ------------------------------------------------------------------ Entrada
const teclas = new Set();
let pad = { x: 0, y: 0, gx: 0, pulo: false, puloNovo: false };
let toque = null;
addEventListener("keydown", (e) => {
  if (jogo.estado !== "jogando" || jogo.pausado) return;
  teclas.add(e.code);
  if (e.code === "Space") { pad.puloNovo = true; e.preventDefault(); }
  if (e.code.startsWith("Arrow")) e.preventDefault();
});
addEventListener("keyup", (e) => teclas.delete(e.code));
function lerControle({ segura, apertou, eixoX, eixoY }) {
  const g = navigator.getGamepads?.() ?? [];
  let gx = 0;
  for (const p of g) if (p && Math.abs(p.axes[2] ?? 0) > 0.2) gx = p.axes[2];
  pad.x = eixoX || ((segura.dir ? 1 : 0) - (segura.esq ? 1 : 0));
  pad.y = -(eixoY || ((segura.baixo ? 1 : 0) - (segura.cima ? 1 : 0)));
  pad.gx = gx;
  if (apertou.pulo) pad.puloNovo = true;
  pad.pulo = segura.pulo;
}

// ------------------------------------------------------------------ Cena
let r3, cena, cam, sol, mundo, rabisco, relogio, vivo = false, hud, mapa, balao;
const j = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), noChao: true, coyote: 0, buffer: 0, dir: 0 };
let camYaw = 0, camManual = 0;
const carros = [], moradores = [], selos = [], npcs = [];
let missoes = {}, visitados = new Set(), selosPegos = 0, fim = false;

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
  cena.fog = new THREE.Fog(0xcfe6f5, 70, 260);
  cam = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 700);
  // céu: degradê com o sol
  const ceu = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
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
  j.pos.set(0, 0.18, 30); j.vel.set(0, 0, 0); j.dir = Math.PI; camYaw = Math.PI;
  criarCarros();
  criarMoradores();
  criarSelos();
  criarMissoes();

  hud = el("div", { class: "hud-cidade" });
  mapa = el("canvas", { class: "mapa-cidade", width: "180", height: "180", "aria-hidden": "true" });
  balao = el("div", { class: "balao-cidade", "aria-live": "polite" });
  caixa.append(hud, mapa, balao);
  toque = criarJoystick(caixa);
  atualizarHud();

  const ajustar = () => { const w = caixa.clientWidth || innerWidth, h = caixa.clientHeight || innerHeight; r3.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  new ResizeObserver(ajustar).observe(caixa);
  ajustar();
  relogio = new THREE.Clock();
  vivo = true;
  posicionarCamera(1, 0);
  requestAnimationFrame(quadro);
  setTimeout(() => { falar("cid-intro"); dizer("Rabisco", "Que cidade bonita! Vamos passear? Converse com quem tem um ! em cima."); }, 700);
}
function parar() {
  vivo = false;
  if (r3) { r3.dispose(); r3 = null; }
  carros.length = moradores.length = selos.length = npcs.length = 0;
  teclas.clear();
}

// ------------------------------------------------------------------ Física do Rabisco
const noQuarteirao = (x, z) => RUAS.slice(0, 4).some((v) => Math.abs(x - (v + 23)) < 17) && RUAS.slice(0, 4).some((v) => Math.abs(z - (v + 23)) < 17);
function chaoEm(x, z, y) {
  let h = noQuarteirao(x, z) ? 0.18 : 0;
  for (const s of mundo.solidos) if (s.y1 <= y + 0.4 && x > s.x0 - LARG && x < s.x1 + LARG && z > s.z0 - LARG && z < s.z1 + LARG && s.y1 > h) h = s.y1;
  return h;
}
const bate = (x, z, y) => mundo.solidos.some((s) => y < s.y1 - 0.05 && x > s.x0 - LARG && x < s.x1 + LARG && z > s.z0 - LARG && z < s.z1 + LARG);
function moverJogador(dt) {
  // direção relativa à câmera
  let ix = (teclas.has("KeyD") || teclas.has("ArrowRight") ? 1 : 0) - (teclas.has("KeyA") || teclas.has("ArrowLeft") ? 1 : 0);
  let iy = (teclas.has("KeyW") || teclas.has("ArrowUp") ? 1 : 0) - (teclas.has("KeyS") || teclas.has("ArrowDown") ? 1 : 0);
  ix += pad.x + (toque?.x ?? 0); iy += pad.y + (toque?.y ?? 0);
  const m = Math.hypot(ix, iy);
  if (m > 1) { ix /= m; iy /= m; }
  if (fim) ix = iy = 0;
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
  if (!(pad.pulo || toque?.pulo || teclas.has("Space")) && j.vel.y > 4) j.vel.y = 4;
  j.vel.y -= GRAV * dt;
  const nx = j.pos.x + j.vel.x * dt;
  if (!bate(nx, j.pos.z, j.pos.y) && Math.abs(nx) < BORDA + 4) j.pos.x = nx; else j.vel.x = 0;
  const nz = j.pos.z + j.vel.z * dt;
  if (!bate(j.pos.x, nz, j.pos.y) && Math.abs(nz) < BORDA + 4) j.pos.z = nz; else j.vel.z = 0;
  const chao = chaoEm(j.pos.x, j.pos.z, j.pos.y);
  j.pos.y += j.vel.y * dt;
  if (j.pos.y <= chao) { j.pos.y = chao; j.vel.y = 0; j.noChao = true; } else j.noChao = j.pos.y - chao < 0.03;
  const v = Math.hypot(j.vel.x, j.vel.z);
  if (v > 0.4) { let d = Math.atan2(j.vel.x, j.vel.z) - j.dir; d = Math.atan2(Math.sin(d), Math.cos(d)); j.dir += d * Math.min(1, dt * 12); }
  rabisco.grupo.position.copy(j.pos);
  rabisco.grupo.rotation.y = j.dir;
  rabisco.atualizar(dt, { modo: fim ? "comemorar" : !j.noChao ? "pular" : v > 0.6 ? "andar" : "parado", vel: v, vmax: VEL });
  return { andando: m > 0.2 && iy > -0.3 };
}

// ------------------------------------------------------------------ Câmera (acompanha e gira)
const alvo = new THREE.Vector3(), posCam = new THREE.Vector3();
function posicionarCamera(k, dt, andando = false) {
  // girar: Q/E, alavanca direita ou arrastar à direita da tela
  const giro = (teclas.has("KeyE") ? 1 : 0) - (teclas.has("KeyQ") ? 1 : 0) + pad.gx * 1.2;
  const arrasto = toque ? toque.girar() : 0;
  if (giro || arrasto) { camYaw -= giro * dt * 2.2 + arrasto * 0.008; camManual = 2.5; }
  camManual -= dt;
  // andando para a frente, a câmera vai voltando para trás do Rabisco
  if (camManual <= 0 && andando) { let d = j.dir - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * 1.2); }
  const longe = cam.aspect < 1.2 ? 1.25 : 1;
  let dist = 6.3 * longe;
  // a câmera não atravessa prédios: encurta a distância se tiver parede no caminho
  for (let s = 1; s <= 10; s++) {
    const d = (dist * s) / 10;
    const x = j.pos.x - Math.sin(camYaw) * d, z = j.pos.z - Math.cos(camYaw) * d;
    if (mundo.solidos.some((o) => o.y1 > 3 && x > o.x0 - 0.3 && x < o.x1 + 0.3 && z > o.z0 - 0.3 && z < o.z1 + 0.3)) { dist = Math.max(2.5, d - 0.6); break; }
  }
  alvo.lerp(new THREE.Vector3(j.pos.x + Math.sin(camYaw) * 2, j.pos.y + 1.3, j.pos.z + Math.cos(camYaw) * 2), k);
  posCam.lerp(new THREE.Vector3(j.pos.x - Math.sin(camYaw) * dist, j.pos.y + 3.0 * longe, j.pos.z - Math.cos(camYaw) * dist), k);
  cam.position.copy(posCam);
  cam.lookAt(alvo);
  sol.position.set(j.pos.x + 40, 60, j.pos.z + 30);
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
      const pode = luz === "vermelho";
      p.userData.ped.material.emissive.setHex(pode ? 0x30ff60 : 0xff3030);
    }
  }
}
const ROTAS = [[-46, -46, 46, 46, 3], [-92, -92, 92, 92, 4], [0, -92, 92, 0, 2], [-92, 0, 0, 92, 2]];
function criarCarros() {
  const cores = [0xd94a3d, 0x3d7ad9, 0xf2c94c, 0xffffff, 0x4cae5a, 0x8e6cff, 0xff7a00, 0x333333, 0xec2e8c, 0x7fd6ff];
  let c = 0;
  for (const [x0, z0, x1, z1, n] of ROTAS) {
    const cantos = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; // sentido horário visto de cima
    for (let i = 0; i < n; i++) {
      const g = carro(cores[c++ % cores.length]);
      cena.add(g);
      carros.push({ g, cantos, seg: i % 4, t: ((i * 0.37) % 1), vel: 9, vAtual: 9 });
    }
  }
}
function atualizarCarros(dt, t) {
  for (const k of carros) {
    const [ax, az] = k.cantos[k.seg], [bx, bz] = k.cantos[(k.seg + 1) % 4];
    const comp = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / comp, dz = (bz - az) / comp;
    // faixa da direita de quem dirige (mão brasileira)
    const ox = -dz * 3, oz = dx * 3;
    const px = ax + dx * k.t * comp + ox, pz = az + dz * k.t * comp + oz;
    const eixo = Math.abs(dx) > 0.5 ? "x" : "z";
    let alvoVel = k.vel;
    // sinal vermelho no próximo cruzamento com semáforo
    const s = mundo.semaforos.find((q) => {
      const ahead = (q.x - px) * dx + (q.z - pz) * dz, lado = Math.abs((q.x - px) * dz - (q.z - pz) * dx);
      return ahead > RUA / 2 + 2 && ahead < RUA / 2 + 16 && lado < 5;
    });
    if (s && luzDe(s, eixo, t) !== "verde") {
      const ahead = (s.x - px) * dx + (s.z - pz) * dz - (RUA / 2 + 5.5); // para antes da faixa de pedestre
      alvoVel = Math.min(alvoVel, Math.max(0, ahead * 1.6));
    }
    // pedestre (o Rabisco) ou outro carro na frente: para
    const aheadJ = (j.pos.x - px) * dx + (j.pos.z - pz) * dz, ladoJ = Math.abs((j.pos.x - px) * dz - (j.pos.z - pz) * dx);
    if (aheadJ > 0 && aheadJ < 8 && ladoJ < 2.4) alvoVel = Math.min(alvoVel, Math.max(0, (aheadJ - 3) * 2));
    for (const o of carros) {
      if (o === k) continue;
      const a = (o.g.position.x - px) * dx + (o.g.position.z - pz) * dz, l = Math.abs((o.g.position.x - px) * dz - (o.g.position.z - pz) * dx);
      if (a > 0 && a < 8 && l < 1.5) alvoVel = Math.min(alvoVel, Math.max(0, (a - 5.5) * 2));
    }
    k.vAtual += (alvoVel - k.vAtual) * Math.min(1, dt * 3);
    k.t += (k.vAtual * dt) / comp;
    if (k.t >= 1) { k.t -= 1; k.seg = (k.seg + 1) % 4; }
    k.g.position.set(px, 0, pz);
    const ang = Math.atan2(dx, dz);
    let d = ang - k.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    k.g.rotation.y += d * Math.min(1, dt * 6);
    // empurra o Rabisco devagar se ele encostar no carro
    if (Math.abs(j.pos.x - px) < 1.6 && Math.abs(j.pos.z - pz) < 2.6 && j.pos.y < 2) {
      const ex = j.pos.x - px, ez = j.pos.z - pz, dd = Math.hypot(ex, ez) || 1;
      j.pos.x += (ex / dd) * dt * 4; j.pos.z += (ez / dd) * dt * 4;
    }
  }
}

// ------------------------------------------------------------------ Moradores andando nas calçadas
function criarMoradores() {
  const cores = [0xe8413c, 0x58c43a, 0xffcc1f, 0x8e6cff, 0x00b5f0, 0xff7a00, 0xec2e8c, 0x9a6232];
  mundo.blocos.forEach((b, i) => {
    if (i % 2) return;
    const p = pilotoLapis(cores[i % cores.length]);
    p.scale.setScalar(0.62);
    cena.add(p);
    moradores.push({ p, b, t: Math.random() * 4, vel: 0.05 + Math.random() * 0.03, fase: Math.random() * 6 });
  });
}
function atualizarMoradores(dt, tempo) {
  for (const m of moradores) {
    m.t = (m.t + m.vel * dt) % 4;
    const lado = Math.floor(m.t), f = m.t - lado, R = 15.6;
    const cantos = [[-R, -R], [R, -R], [R, R], [-R, R]];
    const [ax, az] = cantos[lado], [bx, bz] = cantos[(lado + 1) % 4];
    m.p.position.set(m.b.cx + ax + (bx - ax) * f, 0.18 + Math.abs(Math.sin(tempo * 8 + m.fase)) * 0.06, m.b.cz + az + (bz - az) * f);
    m.p.rotation.y = Math.atan2(bx - ax, bz - az);
  }
}

// ------------------------------------------------------------------ Selos espalhados
function criarSelos() {
  const texs = ["selo-rosa", "selo-azul", "selo-laranja"].map((n) => carregarTextura(`../../assets/elementos/${n}.png`));
  let n = 0;
  for (const v of RUAS.slice(0, 4)) for (const w of RUAS.slice(0, 4)) {
    for (const [dx, dz] of [[23, 7], [7, 23], [39, 23]]) {
      const m = moeda3D(texs[n % 3]);
      m.scale.setScalar(0.9);
      m.position.set(v + dx, 1.2, w + dz);
      cena.add(m);
      selos.push({ m, vivo: true });
      n++;
    }
  }
}

// ------------------------------------------------------------------ Missões e conversas
const MARCA = texturaCanvas(128, 128, (c) => { c.font = "900 110px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 12; c.strokeStyle = "#151515"; c.strokeText("!", 64, 70); c.fillStyle = "#ffcc1f"; c.fillText("!", 64, 70); });
const MARCA_OK = texturaCanvas(128, 128, (c) => { c.font = "900 96px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 12; c.strokeStyle = "#151515"; c.strokeText("?", 64, 70); c.fillStyle = "#7fd6ff"; c.fillText("?", 64, 70); });
const lugar = (id) => mundo.lugares.find((l) => l.id === id);
function npc(nome, cor, x, z, fala) {
  const p = pilotoLapis(cor);
  p.scale.setScalar(0.8);
  p.position.set(x, 0.18, z);
  cena.add(p);
  const marca = new THREE.Sprite(new THREE.SpriteMaterial({ map: MARCA, depthTest: false }));
  marca.scale.setScalar(1.1); marca.position.set(0, 3.6, 0); marca.renderOrder = 5;
  p.add(marca);
  mundo.solidos.push({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4, y1: 2 });
  const n = { nome, p, marca, x, z, fala, ultima: -99 };
  npcs.push(n);
  return n;
}
function criarMissoes() {
  const correio = lugar("correio"), praca = lugar("praca"), padaria = lugar("padaria"), escola = lugar("escola");
  // 1. cartas: pegar no correio e pôr na caixa de correio da casa da mesma cor
  missoes.cartas = { nome: "Cartas", icone: "✉️", estado: "nova", entregues: [], npc: npc("Lápis Azul, o carteiro", 0x1d6fe0, correio.x + 4, correio.z + 2, "cid-carteiro") };
  // 2. gatinhos escondidos pela cidade
  const ig = lugar("igreja"), pq = lugar("parque"), hp = lugar("hospital");
  missoes.gatos = {
    nome: "Gatinhos", icone: "🐱", estado: "nova", achados: 0, npc: npc("Lápis Rosa", 0xec2e8c, praca.x + 6, praca.z, "cid-gatos"),
    // escondidos atrás dos prédios (do lado oposto à porta)
    lugares: [[ig, 13], [pq, -12], [hp, 14]].map(([l, dx]) => { const x = l.cx + dx, z = l.cz - l.frente * 14; return { x, z, achado: false, g: gatinho(x, z) }; }),
  };
  // 3. pão quentinho da padaria para a escola
  missoes.pao = { nome: "Pão", icone: "🥖", estado: "nova", npc: npc("Lápis Laranja, o padeiro", 0xff7a00, padaria.x - 4, padaria.z + 2, "cid-padeiro"), destino: escola };
  // 4. atravessar na faixa com o bonequinho verde (3 vezes)
  missoes.faixa = { nome: "Faixa", icone: "🚸", estado: "nova", vezes: 0, npc: npc("Lápis Amarelo, o guarda", 0xffcc1f, 9, 9, "cid-guarda") };
  // 5. passaporte: visitar todos os lugares
  missoes.passaporte = { nome: "Passeio", icone: "🗺️", estado: "ativa" };
  preCarregarFalas(["cid-intro", "cid-carteiro", "cid-gatos", "cid-padeiro", "cid-guarda", "cid-carta-ok", "cid-gato-ok", "cid-pao-ok", "cid-faixa-ok", "cid-espere", "cid-missao-ok", "cid-final"]);
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
  g.position.set(x, 0.18, z);
  cena.add(g);
  return g;
}
function dizer(nome, texto, ms = 5200) {
  balao.innerHTML = `<b>${nome}</b>${texto}`;
  balao.classList.add("ativo");
  clearTimeout(dizer.t);
  dizer.t = setTimeout(() => balao.classList.remove("ativo"), ms);
}
let carregando = null; // carta da vez ou o pão
function regras(dt, t) {
  const perto = (x, z, r) => Math.hypot(j.pos.x - x, j.pos.z - z) < r;
  // conversar: é só chegar perto
  for (const n of npcs) {
    n.p.rotation.y = Math.atan2(j.pos.x - n.x, j.pos.z - n.z);
    n.marca.position.y = 3.6 + Math.sin(t * 3) * 0.15;
    if (perto(n.x, n.z, 3) && t - n.ultima > 8) { n.ultima = t; conversar(n); }
  }
  // cartas: caixa de correio da cor certa
  const C = missoes.cartas;
  if (C.estado === "ativa") for (const casa of mundo.casas) {
    if (C.entregues.includes(casa.cor) || !["vermelha", "azul", "amarela"].includes(casa.cor)) continue;
    if (perto(casa.x, casa.z, 2.6)) {
      C.entregues.push(casa.cor);
      casa.correio.scale.setScalar(1.3); setTimeout(() => casa.correio.scale.setScalar(1), 400);
      sons.moeda(); falar("cid-carta-ok");
      dizer("Rabisco", `Carta entregue na casa ${casa.cor}!`, 2600);
      if (C.entregues.length === 3) concluir(C);
      atualizarHud();
    }
  }
  // gatinhos
  const G = missoes.gatos;
  if (G.estado === "ativa") for (const l of G.lugares) {
    if (l.achado) continue;
    l.g.rotation.y = Math.sin(t * 2) * 0.6;
    if (perto(l.x, l.z, 2)) { l.achado = true; G.achados++; sons.letra(); falar("cid-gato-ok"); dizer("Rabisco", "Achei um gatinho! Miau!", 2400); l.g.visible = false; if (G.achados === 3) concluir(G); atualizarHud(); }
  }
  // pão para a escola
  const P = missoes.pao;
  if (P.estado === "ativa" && perto(P.destino.x, P.destino.z, 6)) { concluir(P); falar("cid-pao-ok"); dizer("Escola", "Que cheirinho bom! Obrigado pelo pão, Rabisco!", 3600); carregando = null; }
  // faixa de pedestre: atravessar com o bonequinho verde
  const F = missoes.faixa;
  if (F.estado === "ativa") {
    const fx = mundo.faixas.find((q) => j.pos.x > q.x0 && j.pos.x < q.x1 && j.pos.z > q.z0 && j.pos.z < q.z1);
    if (fx && !F.dentro) {
      const s = mundo.semaforos.find((q) => q.x === fx.cruz.x && q.z === fx.cruz.z);
      const seguro = luzDe(s, fx.atravessa, t) === "vermelho"; // os carros da rua que ela cruza estão parados
      F.dentro = { fx, seguro, de: fx.atravessa === "z" ? j.pos.x : j.pos.z };
      if (!seguro) { falar("cid-espere"); dizer("Lápis Amarelo, o guarda", "Espere o bonequinho verde para atravessar!", 2800); }
    } else if (!fx && F.dentro) {
      const d = F.dentro, agora = d.fx.atravessa === "z" ? j.pos.x : j.pos.z;
      if (d.seguro && Math.abs(agora - d.de) > RUA * 0.7) { F.vezes++; sons.moeda(); falar("cid-faixa-ok"); dizer("Lápis Amarelo, o guarda", `Muito bem! Atravessou certinho (${F.vezes} de 3).`, 2600); if (F.vezes >= 3) concluir(F); atualizarHud(); }
      F.dentro = null;
    }
  }
  // passaporte: chegar perto de cada lugar
  for (const l of mundo.lugares) {
    if (visitados.has(l.id) || !perto(l.x, l.z, l.raio)) continue;
    visitados.add(l.id);
    sons.volta();
    jogo.aviso(`📍 ${l.nome}`, "bom", 1800);
    falar(`cid-lugar-${l.id}`);
    if (visitados.size === mundo.lugares.length) concluir(missoes.passaporte);
    atualizarHud();
  }
  // selos
  for (const s of selos) {
    if (!s.vivo) continue;
    s.m.rotation.y = t * 3;
    if (Math.hypot(j.pos.x - s.m.position.x, j.pos.z - s.m.position.z) < 1.2 && j.pos.y < 2.5) { s.vivo = false; s.m.visible = false; selosPegos++; sons.moeda(); atualizarHud(); }
  }
}
function conversar(n) {
  const M = Object.values(missoes).find((m) => m.npc === n);
  if (!M) return;
  if (M.estado === "nova") {
    M.estado = "ativa";
    n.marca.material.map = MARCA_OK; n.marca.material.needsUpdate = true;
    falar(n.fala);
    const textos = {
      cartas: "Oi, Rabisco! Leve estas cartas: a vermelha, a azul e a amarela. Cada uma vai na caixa de correio da casa da mesma cor!",
      gatos: "Meus três gatinhos fugiram! Um foi para trás da igreja, outro para o parque e outro para perto do hospital.",
      pao: "Pão quentinho! Você leva para a escola? As crianças vão adorar o lanche!",
      faixa: "Olá! Atravesse a rua na faixa de pedestre, mas só quando o bonequinho do semáforo ficar verde. Três vezes!",
    };
    dizer(n.nome, textos[Object.keys(missoes).find((k) => missoes[k] === M)], 7000);
    if (M === missoes.pao) carregando = "pao";
    atualizarHud();
  } else if (M.estado === "ativa") {
    dizer(n.nome, "Você consegue, Rabisco! Estou esperando aqui.", 2600);
  } else {
    dizer(n.nome, "Obrigado pela ajuda, Rabisco!", 2400);
  }
}
function concluir(M) {
  if (M.estado === "feita") return;
  M.estado = "feita";
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

// ------------------------------------------------------------------ HUD e mapa
function atualizarHud() {
  if (!hud) return;
  const item = (m, extra = "") => `<li class="${m.estado}"><span>${m.icone}</span>${m.nome}${extra}${m.estado === "feita" ? " ✔" : ""}</li>`;
  const C = missoes.cartas, G = missoes.gatos, F = missoes.faixa;
  const cartas = C.estado === "ativa" ? ` <small>${["vermelha", "azul", "amarela"].map((c) => `<i class="carta ${c} ${C.entregues.includes(c) ? "ok" : ""}"></i>`).join("")}</small>` : "";
  hud.innerHTML = `<ul>${item(C, cartas)}${item(G, G.estado === "ativa" ? ` <small>${"🐱".repeat(G.achados)}${"·".repeat(3 - G.achados)}</small>` : "")}${item(missoes.pao, carregando ? " <small>🥖</small>" : "")}${item(F, F.estado === "ativa" ? ` <small>${"✔".repeat(F.vezes)}${"·".repeat(3 - F.vezes)}</small>` : "")}${item(missoes.passaporte, ` <small>${visitados.size}/${mundo.lugares.length}</small>`)}</ul><div class="selos-cidade">🏅 ${selosPegos}</div>`;
}
function desenharMapa() {
  const c = mapa.getContext("2d"), S = 180, k = S / ((BORDA + 8) * 2);
  const P = (x, z) => [S / 2 + x * k, S / 2 + z * k];
  c.clearRect(0, 0, S, S);
  c.fillStyle = "rgba(95,168,63,0.92)"; c.fillRect(0, 0, S, S);
  c.fillStyle = "#555b63";
  for (const v of RUAS) { const [a] = P(v - RUA / 2, 0); c.fillRect(a, 0, RUA * k, S); const [, b] = P(0, v - RUA / 2); c.fillRect(0, b, S, RUA * k); }
  for (const l of mundo.lugares) { const [x, y] = P(l.x, l.z); c.fillStyle = visitados.has(l.id) ? "#ffcc1f" : "#ffffff"; c.beginPath(); c.arc(x, y, 3.2, 0, 7); c.fill(); }
  for (const n of npcs) { if (!n.marca.visible) continue; const [x, y] = P(n.x, n.z); c.fillStyle = "#ffcc1f"; c.font = "900 16px 'Baloo 2'"; c.fillText("!", x - 3, y + 5); }
  const [x, y] = P(j.pos.x, j.pos.z);
  c.save(); c.translate(x, y); c.rotate(-j.dir + Math.PI);
  c.fillStyle = "#ec2e8c"; c.strokeStyle = "#151515"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 6); c.lineTo(-6, 6); c.closePath(); c.fill(); c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ Laço
let tMapa = 0;
function quadro() {
  if (!vivo) return;
  const dt = Math.min(relogio.getDelta(), 1 / 30);
  if (!jogo.pausado) {
    const t = relogio.elapsedTime;
    const { andando } = moverJogador(dt);
    atualizarSemaforos(t);
    atualizarCarros(dt, t);
    atualizarMoradores(dt, t);
    regras(dt, t);
    posicionarCamera(Math.min(1, dt * 6), dt, andando);
    tMapa -= dt;
    if (tMapa <= 0) { tMapa = 0.15; desenharMapa(); }
  }
  r3.render(cena, cam);
  requestAnimationFrame(quadro);
}

if (params.has("teste")) window.teste = {
  jogo, j, get missoes() { return missoes; }, get mundo() { return mundo; }, get selos() { return selosPegos; }, get visitados() { return visitados.size; }, carros,
  ir(x, z, y = 0.18) { j.pos.set(x, y, z); j.vel.set(0, 0, 0); posicionarCamera(1, 0); }, olhar(yaw) { camYaw = yaw; camManual = 5; posicionarCamera(1, 0); },
};
