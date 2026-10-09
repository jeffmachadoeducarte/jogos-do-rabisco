// Rabisco e as Cores da Criação: aventura 3D de plataforma no estilo dos jogos de artesanato.
// A Borracha Apagona apagou as cores do Livro da Criação; o Rabisco entra nas páginas e tudo que ele
// chega perto ganha cor de novo. Página 1: o Jardim — achar as 3 ovelhinhas perdidas do Lápis Verde
// pastor, abrir o portão das sementes e fazer as flores vermelhas virarem ponte.
// O conteúdo é sutil: contar ovelhas pela voz, encaixar sementes, ligar a cor ao nome, e a parábola
// da ovelha perdida (Lucas 15) e "Deus viu que tudo era muito bom" (Gênesis 1:31) na história.
// Sem morte: cair no rio volta para a última bandeirinha.

import { THREE } from "../../src/motor3d/toon.js";
import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
import { criarCasca, el } from "../../src/motor/casca.js";
import { sons, musica } from "../../src/motor/sons.js";
import { falar, preCarregarFalas } from "../../src/motor/voz.js";
import { criarCores } from "./cores.js";
import { montarJardim, RIO } from "./jardim.js";

const VEL = 6.2, PULO = 9.6, GRAV = 25, LARG = 0.35, ALT = 1.7;
const params = new URLSearchParams(location.search);

const jogo = criarCasca({
  titulo: "Rabisco e as Cores da Criação",
  sub: "Pinte o mundo de novo!",
  faixa: "alfabetizacao",
  cor: "#00B5F0",
  pose: "apresentando",
  niveis: [{ nome: "O Jardim", desc: "Página 1" }],
  deitado: true,
  menuNoJogo: false,
  teclado: false,
  dica: {
    teclado: "Setas ou WASD para andar · Espaço para pular · P para pausar",
    toque: "Joystick para andar · ⤒ para pular",
    controle: "Alavanca para andar · A para pular · Start para pausar",
  },
  falas: { titulo: "cc-titulo", vitoria: null },
  aoComecar: iniciar,
  aoSair: parar,
  aoPausar: () => { soltarEntrada(); },
  aoContinuar: () => musica.tocar("fase"),
  aoControle: lerControle,
});
preCarregarFalas(["cc-intro", "cc-pastor", "cc-ovelha-1", "cc-ovelha-2", "cc-ovelha-3", "cc-entregou", "cc-portao", "cc-portao-fechado", "cc-vermelho", "cc-ponte", "cc-estrela", "cc-caiu", "cc-final"]);

// ------------------------------------------------------------------ Entrada (teclado, controle e toque)
const teclas = new Set();
const entrada = { x: 0, z: 0, pulo: false, puloNovo: false };
const soltarEntrada = () => { teclas.clear(); Object.assign(entrada, { x: 0, z: 0, pulo: false, puloNovo: false }); joy.x = joy.z = 0; };
addEventListener("keydown", (e) => {
  if (jogo.estado !== "jogando" || jogo.pausado) return;
  teclas.add(e.code);
  if (e.code === "Space") { if (!entrada.pulo) entrada.puloNovo = true; entrada.pulo = true; e.preventDefault(); }
  if (e.code.startsWith("Arrow")) e.preventDefault();
});
addEventListener("keyup", (e) => { teclas.delete(e.code); if (e.code === "Space") entrada.pulo = false; });
let pad = { x: 0, z: 0 };
function lerControle({ segura, apertou, eixoX, eixoY }) {
  pad.x = eixoX || ((segura.dir ? 1 : 0) - (segura.esq ? 1 : 0));
  pad.z = -(eixoY || ((segura.baixo ? 1 : 0) - (segura.cima ? 1 : 0)));
  if (apertou.pulo) { entrada.puloNovo = true; }
  padPulo = segura.pulo;
}
let padPulo = false;
const joy = { x: 0, z: 0, id: null, ox: 0, oy: 0 };
function montarToque() {
  const base = el("div", { class: "joystick", "aria-hidden": "true" }, [el("div", { class: "pino" })]);
  const pulo = el("button", { class: "botao-pulo", "aria-label": "Pular", texto: "⤒" });
  const zona = el("div", { class: "zona-joystick" }, [base]);
  zona.addEventListener("pointerdown", (e) => {
    joy.id = e.pointerId; zona.setPointerCapture(e.pointerId);
    const r = base.getBoundingClientRect(); joy.ox = r.left + r.width / 2; joy.oy = r.top + r.height / 2;
    mover(e);
  });
  const mover = (e) => {
    if (e.pointerId !== joy.id) return;
    const dx = e.clientX - joy.ox, dy = e.clientY - joy.oy, raio = base.clientWidth / 2;
    const d = Math.min(1, Math.hypot(dx, dy) / raio), a = Math.atan2(dy, dx);
    joy.x = Math.cos(a) * d; joy.z = -Math.sin(a) * d;
    base.firstChild.style.transform = `translate(${Math.cos(a) * d * raio * 0.6}px, ${Math.sin(a) * d * raio * 0.6}px)`;
  };
  zona.addEventListener("pointermove", mover);
  const fim = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.z = 0; base.firstChild.style.transform = ""; };
  zona.addEventListener("pointerup", fim); zona.addEventListener("pointercancel", fim);
  pulo.addEventListener("pointerdown", (e) => { e.preventDefault(); if (!entrada.pulo) entrada.puloNovo = true; entrada.pulo = true; pulo.classList.add("apertado"); });
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) pulo.addEventListener(ev, () => { entrada.pulo = false; pulo.classList.remove("apertado"); });
  return el("div", { class: "controles-toque" }, [zona, pulo]);
}
function direcaoEntrada() {
  // a câmera olha para +z: para a direita na tela é -x
  let x = (teclas.has("ArrowLeft") || teclas.has("KeyA") ? 1 : 0) - (teclas.has("ArrowRight") || teclas.has("KeyD") ? 1 : 0);
  let z = (teclas.has("ArrowUp") || teclas.has("KeyW") ? 1 : 0) - (teclas.has("ArrowDown") || teclas.has("KeyS") ? 1 : 0);
  x += -pad.x - joy.x; z += pad.z + joy.z;
  const m = Math.hypot(x, z);
  return m > 1 ? [x / m, z / m] : [x, z];
}

// ------------------------------------------------------------------ Cena
let r3 = null, cena = null, cam = null, sol = null, mundo = null, cores = null, rabisco = null, relogio = null, vivo = false;
let hud = null, fala = { pastor: 0, portao: 0 };
const j = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), noChao: true, coyote: 0, buffer: 0, invul: 0, empurrao: 0, dir: 0 };
const trilha = [];
let ponto = new THREE.Vector3(), seguindo = [], entregues = 0, achadas = 0, sementes = 0, estrelas = 0, fim = false, tTrilha = 0;

function iniciar() {
  parar();
  const caixa = el("div", { class: "cena-aventura" });
  jogo.palco.append(caixa);
  r3 = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  r3.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  r3.outputColorSpace = THREE.SRGBColorSpace;
  r3.shadowMap.enabled = true;
  r3.shadowMap.type = THREE.PCFSoftShadowMap;
  caixa.append(r3.domElement);
  cena = new THREE.Scene();
  cena.background = new THREE.Color(0xa8dcff);
  cena.fog = new THREE.Fog(0xcdeeff, 45, 120);
  cam = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 300);
  sol = new THREE.DirectionalLight(0xffffff, 2.3);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 });
  sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.04;
  cena.add(sol, sol.target, new THREE.HemisphereLight(0xd6f3ff, 0x5aa83a, 1.5));

  cores = criarCores(cena);
  mundo = montarJardim(cena, cores);
  rabisco = new Rabisco3D({ raiz: "../..", altura: 1.8 });
  cena.add(rabisco.grupo);

  // estado
  Object.assign(j, { noChao: true, coyote: 0, buffer: 0, invul: 0, empurrao: 0, dir: 0 });
  j.pos.copy(mundo.inicio); j.vel.set(0, 0, 0);
  ponto = mundo.bandeiras[0].ponto.clone();
  trilha.length = 0; seguindo = []; entregues = 0; achadas = 0; sementes = 0; estrelas = 0; fim = false;
  fala = { pastor: 0, portao: 0 };
  hud = el("div", { class: "hud-aventura", "aria-live": "polite" });
  caixa.append(hud, montarToque());
  atualizarHud();

  const ajustar = () => {
    const w = caixa.clientWidth || innerWidth, h = caixa.clientHeight || innerHeight;
    r3.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  };
  new ResizeObserver(ajustar).observe(caixa);
  ajustar();
  posicionarCamera(1);
  relogio = new THREE.Clock();
  vivo = true;
  requestAnimationFrame(quadro);
  musica.tocar("fase");
  setTimeout(() => { falar("cc-intro"); jogo.aviso("Ande para pintar o Jardim!", "bom", 2600); }, 600);
}
function parar() {
  vivo = false;
  if (r3) { r3.dispose(); r3 = null; }
  soltarEntrada();
}

// ------------------------------------------------------------------ Física do Rabisco
const sobre = (c, x, z, folga = 0) => x > c.x0 - LARG - folga && x < c.x1 + LARG + folga && z > c.z0 - LARG - folga && z < c.z1 + LARG + folga;
function chaoEm(x, z, yAtual) {
  let y = z > RIO.z0 && z < RIO.z1 ? -Infinity : 0; // no rio não tem chão
  for (const c of mundo.caixas) if (c.ativo && sobre(c, x, z) && c.y1 <= yAtual + 0.35 && c.y1 > y) y = c.y1;
  return y;
}
function bateuEmCaixa(x, z, y) {
  for (const c of mundo.caixas) if (c.ativo && sobre(c, x, z) && y < c.y1 - 0.05 && y + ALT > c.y0) return true;
  return false;
}
function moverJogador(dt) {
  const [ix, iz] = fim ? [0, 0] : direcaoEntrada();
  j.coyote = j.noChao ? 0.1 : j.coyote - dt;
  j.buffer = entrada.puloNovo ? 0.14 : j.buffer - dt;
  entrada.puloNovo = false;
  if (j.empurrao > 0) j.empurrao -= dt;
  else {
    const k = Math.min(1, dt * (j.noChao ? 12 : 5));
    j.vel.x += (ix * VEL - j.vel.x) * k;
    j.vel.z += (iz * VEL - j.vel.z) * k;
  }
  if (j.buffer > 0 && j.coyote > 0) { j.vel.y = PULO; j.buffer = j.coyote = 0; j.noChao = false; sons.pulo(); }
  if (!(entrada.pulo || padPulo) && j.vel.y > 4) j.vel.y = 4; // pulo curto se soltar o botão
  j.vel.y -= GRAV * dt;

  // anda em x e depois em z, parando nas caixas e nas árvores
  const nx = j.pos.x + j.vel.x * dt;
  if (!bateuEmCaixa(nx, j.pos.z, j.pos.y)) j.pos.x = nx; else j.vel.x = 0;
  const nz = j.pos.z + j.vel.z * dt;
  if (!bateuEmCaixa(j.pos.x, nz, j.pos.y)) j.pos.z = nz; else j.vel.z = 0;
  for (const c of mundo.cilindros) {
    const dx = j.pos.x - c.x, dz = j.pos.z - c.z, d = Math.hypot(dx, dz), min = c.r + LARG;
    if (d < min && d > 0.0001 && j.pos.y < 2.5) { j.pos.x = c.x + (dx / d) * min; j.pos.z = c.z + (dz / d) * min; }
  }
  // vertical: chão, topo das caixas e teto
  const chao = chaoEm(j.pos.x, j.pos.z, j.pos.y);
  j.pos.y += j.vel.y * dt;
  if (j.vel.y > 0 && bateuEmCaixa(j.pos.x, j.pos.z, j.pos.y)) { j.vel.y = 0; }
  if (j.pos.y <= chao) { j.pos.y = chao; j.vel.y = 0; j.noChao = true; } else j.noChao = j.pos.y - chao < 0.02;
  if (j.pos.y < -2.5) caiu();

  // vira para onde anda
  const v = Math.hypot(j.vel.x, j.vel.z);
  if (v > 0.4) {
    const alvo = Math.atan2(j.vel.x, j.vel.z);
    let d = alvo - j.dir; d = Math.atan2(Math.sin(d), Math.cos(d));
    j.dir += d * Math.min(1, dt * 12);
  }
  rabisco.grupo.position.copy(j.pos);
  rabisco.grupo.rotation.y = j.dir;
  const modo = fim ? "comemorar" : !j.noChao ? "pular" : v > 0.6 ? "andar" : "parado";
  rabisco.atualizar(dt, { modo, vel: v, vmax: VEL });
  // pisca enquanto está protegido depois de esbarrar numa borracha
  j.invul -= dt;
  rabisco.grupo.visible = j.invul <= 0 || Math.floor(j.invul * 12) % 2 === 0;
}
function caiu() {
  sons.dano();
  falar("cc-caiu");
  j.pos.copy(ponto).setY(0.5); j.vel.set(0, 0, 0);
  trilha.length = 0;
  seguindo.forEach((o, i) => o.g.position.copy(ponto).add(new THREE.Vector3(1 + i, 0, -1.5)));
}

// ------------------------------------------------------------------ Câmera
const alvoCam = new THREE.Vector3(), posCam = new THREE.Vector3();
function posicionarCamera(k) {
  const longe = cam.aspect < 1.2 ? 1.25 : 1;
  // perto e um pouco acima, olhando adiante: o Rabisco aparece grande, como nos jogos de aventura
  alvoCam.lerp(new THREE.Vector3(j.pos.x * 0.9, j.pos.y + 1.2, j.pos.z + 2.6), k);
  posCam.lerp(new THREE.Vector3(j.pos.x * 0.8, j.pos.y * 0.7 + 3.6 * longe, j.pos.z - 6.4 * longe), k);
  cam.position.copy(posCam);
  cam.lookAt(alvoCam);
  // árvore entre a câmera e o Rabisco some enquanto atrapalha
  for (const a of mundo.arvores) {
    const ax = a.position.x - cam.position.x, az = a.position.z - cam.position.z;
    const px = j.pos.x - cam.position.x, pz = j.pos.z - cam.position.z;
    const l2 = px * px + pz * pz, u = (ax * px + az * pz) / l2;
    const dist = Math.hypot(ax - px * u, az - pz * u);
    a.visible = !(u > 0 && u < 1.05 && dist < 2.6);
  }
  sol.position.set(j.pos.x + 8, 22, j.pos.z - 4);
  sol.target.position.set(j.pos.x, 0, j.pos.z + 4);
}

// ------------------------------------------------------------------ Regras da página
const perto = (a, b, raio, alt = 1.6) => Math.hypot(a.x - b.x, a.z - b.z) < raio && Math.abs(a.y - b.y) < alt;
function regras(dt, t) {
  // trilha do Rabisco (as ovelhinhas andam por ela)
  tTrilha += dt;
  if (tTrilha > 0.06) { tTrilha = 0; trilha.push(j.pos.clone()); if (trilha.length > 240) trilha.shift(); }

  // ovelhinhas
  for (const o of mundo.ovelhas) {
    const u = o.g.userData;
    if (o.estado === "perdida") {
      u.corpo.position.y = Math.abs(Math.sin(t * 3 + o.fase)) * 0.08;
      u.cabeca.rotation.y = Math.sin(t * 1.3 + o.fase) * 0.5;
      if (perto(j.pos, o.g.position, 1.7)) {
        o.estado = "seguindo";
        seguindo.push(o);
        achadas++;
        sons.letra();
        falar(`cc-ovelha-${achadas}`);
        jogo.aviso("🐑", "bom", 1200);
        atualizarHud();
      }
    } else if (o.estado === "seguindo") {
      const k = seguindo.indexOf(o);
      // anda pela trilha do Rabisco, um pouco para o lado para não tapar a câmera
      const alvo = (trilha[Math.max(0, trilha.length - 1 - (k + 1) * 11)] ?? j.pos).clone().add(new THREE.Vector3(k % 2 ? -1.1 : 1.1, 0, 0));
      const d = alvo.clone().sub(o.g.position);
      const dist = Math.hypot(d.x, d.z);
      if (dist > 0.3) {
        o.g.position.x += d.x * Math.min(1, dt * 4); o.g.position.z += d.z * Math.min(1, dt * 4);
        o.g.rotation.y = Math.atan2(d.x, d.z);
        u.pernas.forEach((p, i) => { p.rotation.x = Math.sin(t * 14 + i * Math.PI) * 0.5; });
      }
      o.g.position.y += (alvo.y - o.g.position.y) * Math.min(1, dt * 6);
      u.corpo.position.y = dist > 0.3 ? Math.abs(Math.sin(t * 10)) * 0.1 : 0;
    } else if (o.estado === "entregando") {
      const d = o.destino.clone().sub(o.g.position);
      if (d.length() > 0.1) { o.g.position.addScaledVector(d, Math.min(1, dt * 2.5)); o.g.rotation.y = Math.atan2(d.x, d.z); }
      else { o.estado = "em-casa"; }
      u.corpo.position.y = Math.abs(Math.sin(t * 10)) * 0.1;
    } else {
      u.corpo.position.y = Math.abs(Math.sin(t * 2 + o.fase)) * 0.05;
      u.cabeca.rotation.x = Math.sin(t * 1.5 + o.fase) * 0.3 + 0.3; // pastando
    }
  }

  // o pastor recebe as ovelhinhas no cercado
  const pastor = mundo.pastor;
  pastor.rotation.y = Math.atan2(j.pos.x - pastor.position.x, j.pos.z - pastor.position.z);
  pastor.position.y = Math.abs(Math.sin(t * 2)) * 0.05;
  if (!fim && perto(j.pos, pastor.position, 4.2, 3)) {
    if (seguindo.length) {
      const c = mundo.cercado;
      for (const o of seguindo) {
        o.estado = "entregando";
        o.destino = new THREE.Vector3(c.x0 + 1.5 + (entregues % 3) * 1.6, 0, c.z0 + 2 + Math.floor(entregues / 3) * 1.5 + Math.random() * 2);
        entregues++;
      }
      seguindo = [];
      sons.porta();
      atualizarHud();
      if (entregues >= 3) final();
      else { falar("cc-entregou"); jogo.aviso("Obrigado!", "bom", 1600); }
    } else if (t - fala.pastor > 9) {
      fala.pastor = t;
      falar("cc-pastor");
    }
  }

  // sementes
  for (const s of mundo.sementes) {
    if (s.pega) continue;
    s.g.rotation.y = t * 2;
    s.g.position.y = s.y0 + Math.sin(t * 3) * 0.12;
    if (perto(j.pos, s.g.position, 1.2, 2)) { s.pega = true; s.g.visible = false; sementes++; sons.moeda(); atualizarHud(); }
  }
  // portão: perto dele, as sementes voam para os encaixes
  const P = mundo.portao;
  if (!P.aberto && Math.abs(j.pos.x) < 5 && j.pos.z > P.z - 4 && j.pos.z < P.z) {
    if (sementes > P.colocadas) {
      const enc = P.encaixes[P.colocadas];
      const s = mundo.montarSemente();
      s.scale.setScalar(1.3);
      s.position.copy(enc.position).setZ(-0.25);
      P.grupo.add(s);
      P.colocadas++;
      sons.bloco();
      atualizarHud();
      if (P.colocadas === 3) {
        P.aberto = true; P.abrindo = 0; P.caixa.ativo = false;
        sons.porta();
        setTimeout(() => falar("cc-portao"), 300);
      }
    } else if (t - fala.portao > 7) {
      fala.portao = t;
      falar("cc-portao-fechado");
      jogo.aviso("O portão quer sementes!", "", 2000);
    }
  }
  if (P.abrindo != null && P.abrindo < 1) {
    P.abrindo = Math.min(1, P.abrindo + dt);
    P.folhas[0].rotation.y = -P.abrindo * 1.6; P.folhas[1].rotation.y = P.abrindo * 1.6;
  }

  // botão vermelho: as flores vermelhas crescem e viram ponte
  const B = mundo.botao;
  if (!B.apertado && perto(j.pos, B.g.position, 1.1, 0.8)) {
    B.apertado = true;
    B.g.userData.capa.position.y = 0.16;
    sons.pisao();
    falar("cc-vermelho");
    jogo.aviso("Vermelho!", "bom", 1500);
    mundo.ponte.petalas.forEach((p, i) => setTimeout(() => { p.userData.cresce = 0.001; sons.nota(i + 2); }, 900 + i * 350));
    setTimeout(() => { mundo.ponte.caixa.ativo = true; falar("cc-ponte"); }, 900 + 4 * 350);
  }
  for (const p of mundo.ponte.petalas) {
    if (p.userData.cresce > 0 && p.userData.cresce < 1) {
      p.userData.cresce = Math.min(1, p.userData.cresce + dt * 2.5);
      const k = p.userData.cresce;
      p.scale.setScalar(k < 0.7 ? k / 0.7 * 1.15 : 1.15 - (k - 0.7) / 0.3 * 0.15);
    }
  }

  // estrelas escondidas
  for (const s of mundo.estrelas) {
    if (s.pega) continue;
    s.g.rotation.y = t * 2.5;
    s.g.position.y = s.y0 + Math.sin(t * 2.5) * 0.15;
    if (perto(j.pos, s.g.position, 1.3, 2.2)) { s.pega = true; s.g.visible = false; estrelas++; sons.letra(); falar("cc-estrela"); atualizarHud(); }
  }

  // bandeirinhas: o último ponto salvo
  for (const b of mundo.bandeiras) {
    if (!b.ativa && perto(j.pos, b.g.position, 2.6, 3)) {
      b.ativa = true; ponto = b.ponto.clone(); sons.volta();
      b.g.userData.pano.position.y = 2.2;
    }
  }

  // borrachas: pule em cima para amassar; se esbarrar, ela empurra
  for (const b of mundo.borrachas) {
    if (!b.viva) {
      if (b.morte > 0) { b.morte -= dt; b.g.scale.set(1.2, Math.max(0.15, b.morte), 1.2); if (b.morte <= 0) b.g.visible = false; }
      continue;
    }
    b.t += dt;
    b.g.position.x += b.dir * dt * 1.6;
    if (b.g.position.x > b.x1) b.dir = -1; if (b.g.position.x < b.x0) b.dir = 1;
    b.g.rotation.y = b.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    const u = b.g.userData;
    if (u.corpo) u.corpo.rotation.z = Math.sin(b.t * 8) * 0.08;
    if (u.pes) u.pes.forEach((p, i) => { p.position.y = Math.max(0, Math.sin(b.t * 10 + i * Math.PI)) * 0.12; });
    const dx = j.pos.x - b.g.position.x, dz = j.pos.z - b.g.position.z;
    if (Math.hypot(dx, dz) < 0.95 && j.pos.y < 1.3) {
      if (j.vel.y < -1 && j.pos.y > 0.45) {
        b.viva = false; b.morte = 0.9; sons.pisao(); j.vel.y = 8;
      } else if (j.invul <= 0) {
        j.invul = 1.3; j.empurrao = 0.35; sons.dano();
        const d = Math.hypot(dx, dz) || 1;
        j.vel.set((dx / d) * 7, 6, (dz / d) * 7);
      }
    }
  }

  mundo.agua.tex.offset.x = t * 0.05;
  mundo.agua.tex.offset.y = Math.sin(t * 0.7) * 0.03;
}

// fim da página: arco-íris, tudo ganha cor e o versículo
function final() {
  fim = true;
  sons.vitoria();
  const arco = new THREE.Group();
  ["#e63946", "#ff7a00", "#ffcc1f", "#58c43a", "#00b5f0", "#8e6cff"].forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(9 - i * 0.6, 0.3, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: c }));
    arco.add(m);
  });
  arco.position.set(-4, -1, 92);
  arco.scale.setScalar(0.01);
  cena.add(arco);
  const t0 = performance.now();
  const crescer = () => { const k = Math.min(1, (performance.now() - t0) / 1800); arco.scale.setScalar(0.01 + k * 0.99); if (k < 1 && vivo) requestAnimationFrame(crescer); };
  crescer();
  cores.colorirTudo(mundo.pastor.position);
  setTimeout(() => falar("cc-final"), 1400);
  setTimeout(() => jogo.vencer({ titulo: "Tudo colorido!", estrelas, texto: estrelas === 3 ? "Você achou todas as estrelas escondidas!" : "Ainda tem estrelas escondidas no Jardim...", proximo: false }), 6500);
}

// HUD sem números: ovelhinhas, sementes (até o portão abrir) e estrelas
function atualizarHud() {
  if (!hud) return;
  const icones = (ic, n, total) => Array.from({ length: total }, (_, i) => `<span class="${i < n ? "tem" : "falta"}">${ic}</span>`).join("");
  hud.innerHTML = `<div class="grupo">${icones("🐑", achadas, 3)}</div>` +
    (mundo.portao.aberto ? "" : `<div class="grupo">${icones("🌰", sementes, 3)}</div>`) +
    `<div class="grupo">${icones("⭐", estrelas, 3)}</div>`;
}

// ------------------------------------------------------------------ Laço
function quadro() {
  if (!vivo) return;
  const dt = Math.min(relogio.getDelta(), 1 / 30);
  if (!jogo.pausado) {
    const t = relogio.elapsedTime;
    moverJogador(dt);
    regras(dt, t);
    cores.atualizar(dt, j.pos);
    posicionarCamera(Math.min(1, dt * 5));
  }
  r3.render(cena, cam);
  requestAnimationFrame(quadro);
}

if (params.has("teste")) window.teste = {
  jogo, j, get mundo() { return mundo; }, get cores() { return cores; },
  get estado() { return { achadas, entregues, sementes, estrelas, fim, seguindo: seguindo.length, progresso: cores?.progresso() }; },
  ir(x, z, y = 0) { j.pos.set(x, y, z); j.vel.set(0, 0, 0); trilha.length = 0; posicionarCamera(1); },
};
