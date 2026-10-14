// Rabiscolândia: Vida na Cidade. A criança vive o dia do Rabisco numa cidade grande e colorida: escolhe uma casa no
// Bairro das Casas (a placa ganha o nome dela), passeia a pé ou dirigindo (carro aberto ou ônibus da escola, que
// aparecem pelo Rabifone), conhece a Igreja Reviver, a escola, o hospital, os bombeiros, o comércio com as lojas
// parceiras, o parque com o lago e a Fazendinha, e troca o dia pela noite. Sem tempo, sem perder, sem dinheiro.
// Os moradores são amigos do estojo (personagens.js). Tudo o que é guardado fica no aparelho (salvar.js).
//
// Módulos: mapa.js (dados) · mundo.js (montagem em blocos) · predios.js · casas.js · personagens.js · veiculos.js
// · fisica.js · camera.js · ceu.js · rabifone.js · toque.js · salvar.js · qualidade.js. ?teste expõe window.teste.

import { THREE, MAT, mesclar } from "./base3d.js";
import { PARCEIROS } from "../cidade-do-rabisco/parceiros.js";
import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar, falarNome, preCarregarFalas } from "../../src/motor/voz.js";
import { montarMundo } from "./mundo.js";
import { criarFisica, VEL } from "./fisica.js";
import { criarCamera } from "./camera.js";
import { criarCeu } from "./ceu.js";
import { criarVeiculo, animarVeiculo, criarTransito, atualizarTransito, atualizarSemaforos } from "./veiculos.js";
import { criarMorador, criarVovo } from "./personagens.js";
import { criarRabifone } from "./rabifone.js";
import { criarToque } from "./toque.js";
import { carregar, salvar } from "./salvar.js";
import { criarQualidade } from "./qualidade.js";
import { RUAS, segmentos, LOTES, VAGAS, LARGADA, LUGARES, LAGO, PARQUE, PRACA, FAZENDA, BORDA, MORADORES, distRua } from "./mapa.js";

const params = new URLSearchParams(location.search);
const CONTROLES = [
  { id: "frente", nome: "Frente / acelerar", teclas: ["KeyW", "ArrowUp"] },
  { id: "tras", nome: "Trás / ré", teclas: ["KeyS", "ArrowDown"] },
  { id: "esq", nome: "Esquerda", teclas: ["KeyA", "ArrowLeft"] },
  { id: "dir", nome: "Direita", teclas: ["KeyD", "ArrowRight"] },
  { id: "pular", nome: "Pular (no carro: buzina)", teclas: ["Space"], botoes: [0, 1], controle: "pulo" },
  { id: "acao", nome: "Ação (entrar, sair, morar aqui)", teclas: ["KeyF", "Enter"], botoes: [2, 3], controle: "acao" },
  { id: "fone", nome: "Rabifone", teclas: ["Tab", "KeyC"], botoes: [8], controle: "select" },
  { id: "girarE", nome: "Girar a câmera ⟲", teclas: ["KeyQ"] },
  { id: "girarD", nome: "Girar a câmera ⟳", teclas: ["KeyE"] },
  { id: "mapa", nome: "Mapa grande", teclas: ["KeyM"] },
];
// falas gravadas (chaves rp-*; o texto fica em falas.mjs → falas.json, para gerar depois)
const FALAS = ["rp-titulo", "rp-intro", "rp-casa", "rp-casa-pre", "rp-casa-pos", "rp-carro", "rp-onibus", "rp-garagem", "rp-noite", "rp-dia"];

const jogo = criarCasca({
  titulo: "Rabiscolândia",
  sub: "Vida na Cidade: escolha sua casa, passeie e dirija!",
  faixa: "alfabetizacao",
  cor: "#00B5F0",
  pose: "apresentando",
  deitado: true,
  menuNoJogo: false,
  teclado: false,
  dica: {
    teclado: "WASD ou setas andam · F faz a ação · Tab abre o Rabifone · M abre o mapa · Q/E giram a câmera · Espaço pula",
    toque: "Arraste à esquerda para andar · à direita para olhar · ✋ faz a ação · 📱 abre o Rabifone",
    controle: "Alavanca anda · X faz a ação · Select abre o Rabifone · A pula · Start pausa",
  },
  falas: { titulo: "rp-titulo", vitoria: null },
  controles: CONTROLES,
  jogadores: false, // 1 jogador nesta fatia: no celular sozinho nunca pede controle nem QR
  aoComecar: iniciar,
  aoSair: parar,
  aoPausar: () => { teclas.clear(); toque?.zerar(); },
  aoControle: lerControle,
});
preCarregarFalas([]);
void FALAS;

// ------------------------------------------------------------------ Entrada
const teclas = new Set();
const PADRAO = Object.fromEntries(CONTROLES.map((a) => [a.id, a.teclas]));
const teclasDe = (acao) => jogo.remap?.teclas(acao) ?? PADRAO[acao];
const tem = (acao) => teclasDe(acao).some((k) => teclas.has(k));
const ehAcao = (acao, code) => teclasDe(acao).includes(code);
const pad = { x: 0, y: 0, gx: 0, pulo: false, puloNovo: false, acaoNova: false };
let toque = null, fone = null;
addEventListener("keydown", (e) => {
  if (jogo.estado !== "jogando" || jogo.pausado) return;
  if (fone?.aberto) {
    const mapa = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] };
    if (mapa[e.code]) { fone.navegar(...mapa[e.code]); e.preventDefault(); return; }
    if (e.code === "Enter" || e.code === "Space" || e.code === "KeyF") { fone.confirmar(); e.preventDefault(); return; }
    if (e.code === "Escape" || e.code === "Backspace") { fone.voltar(); e.preventDefault(); return; }
    if (ehAcao("fone", e.code)) { fone.fechar(); e.preventDefault(); }
    return;
  }
  teclas.add(e.code);
  if (ehAcao("pular", e.code)) { pad.puloNovo = true; e.preventDefault(); }
  if (ehAcao("acao", e.code) && !e.repeat) { pad.acaoNova = true; e.preventDefault(); }
  if (ehAcao("fone", e.code) && !e.repeat) { e.preventDefault(); fone?.abrir(); }
  if (ehAcao("mapa", e.code) && !e.repeat) alternarMapa();
  if (e.code.startsWith("Arrow")) e.preventDefault();
});
addEventListener("keyup", (e) => teclas.delete(e.code));
function lerControle({ segura, apertou, eixoX, eixoY }) {
  if (fone?.aberto) {
    if (apertou.esq) fone.navegar(-1, 0); if (apertou.dir) fone.navegar(1, 0);
    if (apertou.cima) fone.navegar(0, -1); if (apertou.baixo) fone.navegar(0, 1);
    if (apertou.confirma) fone.confirmar(); else if (apertou.voltar) fone.voltar();
    if (apertou.select) fone.fechar();
    return;
  }
  let gx = 0;
  for (const p of navigator.getGamepads?.() ?? []) if (p && Math.abs(p.axes[2] ?? 0) > 0.2) gx = p.axes[2];
  pad.x = eixoX || ((segura.dir ? 1 : 0) - (segura.esq ? 1 : 0));
  pad.y = -(eixoY || ((segura.baixo ? 1 : 0) - (segura.cima ? 1 : 0)));
  pad.gx = gx;
  if (apertou.pulo) pad.puloNovo = true;
  pad.pulo = segura.pulo;
  if (apertou.acao) pad.acaoNova = true;
  if (apertou.select) fone?.abrir();
  if (apertou.voltar && mapaGrande && !mapaGrande.hidden) alternarMapa();
}

// ------------------------------------------------------------------ Estado
let r3, cena, cam, ceu, mundo, fis, camera, rabisco, relogio, qualidade, vivo = false;
let hud, minimapa, mapaGrande, balao, bussola, caixa;
const j = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), noChao: true, coyote: 0, buffer: 0, dir: 0 };
const veiculos = []; let garagem = null; // veículo chamado pelo Rabifone (só um por vez)
let transito = [], moradores = [], vovo = null;
let dentro = null, contexto = null, salvo = carregar(), alvoMapa = null;
let entradaTeste = null;
const nomeCrianca = () => { try { return window.Familia?.crianca?.()?.nome || null; } catch { return null; } };

function iniciar() {
  parar();
  salvo = carregar();
  caixa = el("div", { class: "cena-rp" });
  jogo.palco.append(caixa);
  r3 = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  r3.outputColorSpace = THREE.SRGBColorSpace;
  r3.toneMapping = THREE.ACESFilmicToneMapping;
  r3.toneMappingExposure = 1.0;
  r3.shadowMap.enabled = true;
  r3.shadowMap.type = THREE.PCFSoftShadowMap;
  caixa.append(r3.domElement);
  const ajustar = () => { const w = caixa.clientWidth || innerWidth, h = caixa.clientHeight || innerHeight; r3.setPixelRatio(qualidade.calcular(w, h)); r3.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  qualidade = criarQualidade(r3, () => ajustar());
  cena = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 900);
  ceu = criarCeu(cena, { sombra: qualidade.perfil.sombra });
  qualidade.aoSemSombra = () => { ceu.sol.castShadow = false; };
  mundo = montarMundo(cena);
  fis = criarFisica(mundo);
  camera = criarCamera(cam, mundo.solidos);
  rabisco = new Rabisco3D({ raiz: "../..", altura: 1.8 });
  cena.add(rabisco.grupo);
  otimizarRabisco(rabisco);
  // celular: neblina mais perto, menos blocos e carros desenhados
  if (qualidade.perfil.toque) { mundo.alcance = 95; mundo.contornoAte = 20; mundo.detalheAte = 35; cena.fog.far = 95; cena.fog.near = 40; }
  j.pos.set(LARGADA.x, 0.07, LARGADA.z); j.vel.set(0, 0, 0); j.dir = LARGADA.dir; camera.st.yaw = LARGADA.dir;
  for (const v of VAGAS) { const q = criarVeiculo(v.tipo, v.cor); q.pos.set(v.x, 0.03, v.z); q.ang = v.ang; cena.add(q.g); animarVeiculo(q, 0, 0); veiculos.push(q); }
  transito = criarTransito(cena);
  criarMoradores();
  aplicarCasa();

  // HUD
  hud = el("div", { class: "hud-rp" });
  minimapa = el("canvas", { class: "minimapa-rp", width: "200", height: "200", role: "button", "aria-label": "Abrir o mapa" });
  minimapa.addEventListener("click", () => alternarMapa());
  balao = el("div", { class: "balao-rp", "aria-live": "polite" });
  bussola = el("div", { class: "bussola-rp", hidden: "" }, [el("div", { class: "seta", html: "<span>➤</span>" }), el("div", { class: "rotulo" })]);
  mapaGrande = el("div", { class: "mapa-grande-rp", hidden: "" }, [el("div", { class: "cartao" }, [el("h2", { texto: "🗺️ Rabiscolândia" }), el("canvas", { width: "640", height: "640" }), el("p", { class: "legenda", html: '<span class="voce">▲ Você</span> <span>🏠 Sua casa</span> <span>● Lugares</span> <span>▬ Veículos</span>' })])]);
  mapaGrande.addEventListener("click", () => alternarMapa());
  const btnFone = el("button", { class: "btn-fone-rp", "aria-label": "Abrir o Rabifone", html: "📱 <span>Rabifone</span>" });
  btnFone.addEventListener("click", () => fone.abrir());
  const btnAcao = el("button", { class: "acao-rp", hidden: "", "aria-label": "Ação" });
  btnAcao.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); pad.acaoNova = true; });
  caixa.append(hud, minimapa, bussola, balao, btnFone, btnAcao, mapaGrande);
  hud.btnAcao = btnAcao;
  toque = criarToque(caixa);
  fone = criarRabifone(caixa, {
    hora: () => ceu.horaAtual,
    aoAbrir: () => { teclas.clear(); toque.zerar(); },
    aoGaragem: (tipo, cor) => chamarVeiculo(tipo, cor),
    aoHora: (h) => mudarHora(h),
    aoMapa: () => alternarMapa(true),
    infoCasa: () => ({ tem: salvo.casa != null, nome: salvo.casa != null ? `Casa ${salvo.casa}` : "" }),
    aoCasa: (acao) => {
      const c = mundo.casas.find((k) => k.lote.numero === salvo.casa) ?? mundo.casas[0];
      if (acao === "ir" && !dentro) { const [x, z] = c.frente; irPara(x, z + (c.lote.dir[1] > 0 ? 2.5 : -2.5)); }
      else alvoMapa = { x: c.frente[0], z: c.frente[1], emoji: "🏠" };
    },
  });
  atualizarHud();

  new ResizeObserver(ajustar).observe(caixa);
  ajustar();
  relogio = new THREE.Clock();
  vivo = true;
  posicionarCamera(1, 0);
  requestAnimationFrame(quadro);
  setTimeout(() => { falar("rp-intro"); dizer("Rabiscolândia", salvo.casa != null ? "Bem-vindo de volta! Sua casa está esperando no Bairro das Casas." : "Que cidade grande! Escolha uma casa no Bairro das Casas e use o Rabifone 📱 para chamar um carro."); }, 700);
}
function parar() {
  vivo = false;
  if (r3) { r3.dispose(); r3 = null; }
  veiculos.length = 0; transito = []; moradores = []; vovo = null; garagem = null;
  dentro = null; contexto = null; alvoMapa = null;
  teclas.clear();
}

// ------------------------------------------------------------------ Rabisco com menos chamadas de desenho
// O Rabisco oficial (rabisco3d.js, sem mudar) tem ~165 peças. As que não mexem entre si são juntadas em cada
// articulação (corpo, tronco, quadris, joelhos, ombros e cotovelos): ~30 chamadas. Boné e aba ficam soltos
// (roupas3d.js mexe neles). O rosto chega depois (rosto3d.json): junta de novo quando ele aparecer.
function otimizarRabisco(rb) {
  for (const o of [rb.bone, rb.pivoAba, rb.aba]) if (o) o.userData.dinamico = true;
  const juntas = new Set([rb.corpo, rb.tronco, rb.pernaE.quadril, rb.pernaE.joelho, rb.pernaD.quadril, rb.pernaD.joelho, rb.bracoE.ombro, rb.bracoE.cotovelo, rb.bracoD.ombro, rb.bracoD.cotovelo].filter(Boolean));
  const juntar = () => { if (rabisco === rb) mesclar(rb.grupo, { juntas }); };
  juntar();
  for (const ms of [1500, 4000, 9000]) setTimeout(juntar, ms);
}

// ------------------------------------------------------------------ Moradores do estojo
function criarMoradores() {
  MORADORES.forEach((m, i) => {
    const p = criarMorador(m.tipo, { cor: m.cor, nome: m.nome, semente: i });
    const rua = RUAS.find((r) => r.id === m.rua);
    const segs = segmentos(rua);
    cena.add(p.grupo);
    moradores.push({ p, rua, segs, lado: m.lado, t: (i * 0.137) % 1, sentido: i % 2 ? 1 : -1, vel: 1.3 + (i % 3) * 0.25, comp: segs.reduce((a, [[ax, az], [bx, bz]]) => a + Math.hypot(bx - ax, bz - az), 0), parado: 0, acenou: false });
  });
  // a Vovó Lápis espera na porta da casa 8 (nas entregas, é ela quem recebe)
  vovo = criarVovo();
  const c8 = mundo.casas.find((c) => c.lote.numero === 8);
  vovo.grupo.position.set(c8.porta[0] + 1.6, 0.25, c8.porta[1] - 0.6 * c8.lote.dir[1]);
  vovo.grupo.rotation.y = c8.lote.rot;
  cena.add(vovo.grupo);
}
const _pp = new THREE.Vector3();
function atualizarMoradores(dt) {
  for (const m of moradores) {
    const g = m.p.grupo;
    const longe = Math.hypot(g.position.x - j.pos.x, g.position.z - j.pos.z) > (qualidade.perfil.toque ? 35 : 45);
    g.visible = !longe;
    // perto do Rabisco: para, vira para ele e acena (uma vez por encontro)
    const perto = !dentro && Math.hypot(g.position.x - j.pos.x, g.position.z - j.pos.z) < 3.5;
    if (perto) {
      if (!m.acenou) { m.acenou = true; m.p.acenar(2); m.p.pular(); }
      const alvo = Math.atan2(j.pos.x - g.position.x, j.pos.z - g.position.z);
      let d = alvo - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * Math.min(1, dt * 6);
      m.p.atualizar(dt, { vel: 0 });
      continue;
    }
    if (Math.hypot(g.position.x - j.pos.x, g.position.z - j.pos.z) > 8) m.acenou = false;
    m.t += (m.vel * dt * m.sentido) / m.comp;
    if (m.t > 1) { m.t = 1; m.sentido = -1; } else if (m.t < 0) { m.t = 0; m.sentido = 1; }
    // posição ao longo da rua, na calçada
    let s = m.t * m.comp;
    for (let i = 0; i < m.segs.length; i++) {
      const [[ax, az], [bx, bz]] = m.segs[i];
      const l = Math.hypot(bx - ax, bz - az) || 1;
      if (s <= l || i === m.segs.length - 1) {
        const f = Math.min(1, s / l), nx = -(bz - az) / l, nz = (bx - ax) / l, off = m.lado * (m.rua.w / 2 + 1.4);
        _pp.set(ax + (bx - ax) * f + nx * off, 0.07, az + (bz - az) * f + nz * off);
        g.rotation.y = Math.atan2((bx - ax) * m.sentido, (bz - az) * m.sentido);
        break;
      }
      s -= l;
    }
    g.position.copy(_pp);
    if (!longe) m.p.atualizar(dt, { vel: m.vel });
  }
  if (vovo) {
    const d = Math.hypot(vovo.grupo.position.x - j.pos.x, vovo.grupo.position.z - j.pos.z);
    if (d < 4 && !vovo.acenou) { vovo.acenou = true; vovo.acenar(2.5); }
    if (d > 8) vovo.acenou = false;
    vovo.atualizar(dt, { vel: 0 });
  }
}

// ------------------------------------------------------------------ Casa
function textoPlaca() { const n = nomeCrianca(); return n ? `Casa de ${n}` : "Minha Casa"; }
function aplicarCasa() {
  for (const c of mundo.casas) c.placa.userData.definir(c.lote.numero === salvo.casa ? textoPlaca() : `Casa ${c.lote.numero}`, c.lote.numero === salvo.casa ? "#ffcc1f" : "#ec2e8c");
}
function morarAqui(c) {
  salvo.casa = c.lote.numero; salvo.corCasa = c.lote.cor;
  salvar(salvo);
  aplicarCasa();
  sons.vitoria?.();
  jogo.confete?.();
  const n = nomeCrianca();
  dizer("Rabiscolândia", n ? `Agora esta é a casa de ${n}! Que lar bonito!` : "Agora esta é a sua casa! Que lar bonito!", 4200);
  falarNome("rp-casa-pre", "rp-casa-pos").then((ok) => { if (!ok) falar("rp-casa"); });
}

// ------------------------------------------------------------------ Veículos
function pertoDeVeiculo() {
  let melhor = null, dm = Infinity;
  for (const v of veiculos) { const d = Math.hypot(v.pos.x - j.pos.x, v.pos.z - j.pos.z) - (v.tipo === "onibus" ? 3.5 : 0); if (d < 3.6 && d < dm) { dm = d; melhor = v; } }
  return melhor;
}
function entrar(v) {
  if (dentro) return;
  dentro = v;
  j.vel.set(0, 0, 0);
  v.g.add(rabisco.grupo); const a = v.g.userData.motorista; rabisco.grupo.position.set(a.x, a.y - 2.0 * rabisco.escala, a.z); rabisco.grupo.rotation.set(0, 0, 0);
  if (v.g.userData.cima) v.g.userData.cima.visible = false; // ônibus: janelas e teto somem para ver o Rabisco dirigindo
  v.g.userData.seta.visible = false;
  sons.pisao();
  camera.st.manual = 0;
  toque?.modo("carro");
  if (!entrar.falou) { entrar.falou = true; falar(v.tipo === "onibus" ? "rp-onibus" : "rp-carro"); dizer("Rabiscolândia", "Cinto afivelado! Para a frente acelera, para trás freia. Aperte a ação de novo para sair.", 4200); }
}
function sair() {
  const v = dentro;
  if (!v || Math.abs(v.vel) > 3) return;
  const lx = Math.cos(v.ang), lz = -Math.sin(v.ang), fx = Math.sin(v.ang), fz = Math.cos(v.ang);
  const lado = v.larg + 1.3;
  const op = [[lx * lado, lz * lado], [-lx * lado, -lz * lado], [-fx * (v.comp + 1.4), -fz * (v.comp + 1.4)], [fx * (v.comp + 1.4), fz * (v.comp + 1.4)]];
  const [ox, oz] = op.find(([ox, oz]) => !fis.bate(v.pos.x + ox, v.pos.z + oz, 0.1)) ?? op[0];
  dentro = null; v.vel = 0;
  cena.add(rabisco.grupo); rabisco.grupo.visible = true;
  if (v.g.userData.cima) v.g.userData.cima.visible = true;
  j.pos.set(v.pos.x + ox, 0.07, v.pos.z + oz); j.vel.set(0, 0, 0); j.dir = v.ang;
  rabisco.grupo.position.copy(j.pos); rabisco.grupo.rotation.set(0, j.dir, 0);
  v.g.userData.seta.visible = true;
  sons.pisao();
  toque?.modo("pe");
}
// Garagem do Rabifone: o veículo aparece do lado do Rabisco (num lugar livre a menos de 6 m)
function chamarVeiculo(tipo, cor) {
  if (dentro) { dizer("Rabifone", "Saia do veículo para chamar outro."); return null; }
  if (garagem) { cena.remove(garagem.g); veiculos.splice(veiculos.indexOf(garagem), 1); garagem = null; }
  const v = criarVeiculo(tipo, cor);
  const R = tipo === "onibus" ? 4.6 : 3.4;
  let ponto = null;
  for (let r = R; r < 5.9 && !ponto; r += 0.4) for (let a = 0; a < 6.28 && !ponto; a += 0.39) {
    const ang = j.dir + Math.PI / 2 + a, x = j.pos.x + Math.sin(ang) * r, z = j.pos.z + Math.cos(ang) * r;
    if (!fis.veiculoBate(v, x, z, j.dir, veiculos.map((o) => ({ x: o.pos.x, z: o.pos.z, raio: o.comp })))) ponto = [x, z];
  }
  if (!ponto) { dizer("Rabifone", "Aqui está muito apertado! Vá para um lugar mais aberto, como a rua."); return null; }
  v.pos.set(ponto[0], 0.03, ponto[1]); v.ang = j.dir;
  animarVeiculo(v, 0, 0);
  cena.add(v.g);
  veiculos.push(v);
  garagem = v;
  sons.moeda?.();
  falar("rp-garagem");
  dizer("Rabifone", tipo === "onibus" ? "O ônibus da escola chegou! Entre e leve todo mundo para passear." : "Seu carro chegou! Chegue perto e aperte a ação para entrar.", 3600);
  return v;
}
function mudarHora(h) {
  ceu.hora(h);
  falar(h >= 18.5 || h < 6 ? "rp-noite" : "rp-dia");
  dizer("Rabifone", h >= 19 || h < 6 ? "Boa noite! As janelas e os postes acenderam." : h >= 18 ? "Que pôr do sol bonito!" : "Bom dia, Rabiscolândia!", 2800);
}
function irPara(x, z) { const [lx, lz] = fis.livre(x, z, 0.6); j.pos.set(lx, 0.07, lz); j.vel.set(0, 0, 0); posicionarCamera(1, 0); }

// ------------------------------------------------------------------ Laço
function entrada() {
  let ix = (tem("dir") ? 1 : 0) - (tem("esq") ? 1 : 0);
  let iy = (tem("frente") ? 1 : 0) - (tem("tras") ? 1 : 0);
  ix += pad.x; iy += pad.y;
  if (toque) {
    if (dentro) { ix += (toque.carro.dir ? 1 : 0) - (toque.carro.esq ? 1 : 0); iy += (toque.carro.frente ? 1 : 0) - (toque.carro.re ? 1 : 0); }
    else { ix += toque.x; iy += toque.y; }
  }
  if (entradaTeste) { ix = entradaTeste.virar; iy = entradaTeste.acel; }
  const m = Math.hypot(ix, iy);
  if (m > 1) { ix /= m; iy /= m; }
  if (fone?.aberto) ix = iy = 0;
  return { ix, iy, m };
}
function regras() {
  // o que a ação faz agora
  contexto = null;
  if (dentro) contexto = { rotulo: "🚪 Sair", fazer: sair };
  else {
    const v = pertoDeVeiculo();
    if (v) contexto = { rotulo: v.tipo === "onibus" ? "🚌 Dirigir" : "🚗 Entrar", fazer: () => entrar(v) };
    else {
      const c = mundo.casas.find((k) => Math.hypot(k.frente[0] - j.pos.x, k.frente[1] - j.pos.z) < 4.5 || Math.hypot(k.porta[0] - j.pos.x, k.porta[1] - j.pos.z) < 3);
      if (c && c.lote.numero !== salvo.casa) contexto = { rotulo: "🏠 Morar aqui?", fazer: () => morarAqui(c) };
      else if (c) contexto = { rotulo: "🏠 Minha casa!", fazer: () => dizer("Rabiscolândia", "Lar, doce lar! Logo dá para decorar por dentro.") };
    }
  }
  const quer = pad.acaoNova || toque?.acaoNova || (dentro && toque?.sairNovo);
  pad.acaoNova = false; if (toque) { toque.acaoNova = false; toque.sairNovo = false; }
  if (quer && contexto) contexto.fazer();
  if (toque?.foneNovo) { toque.foneNovo = false; fone.abrir(); }
  // chegou num lugar novo: aviso com o nome
  for (const l of mundo.lugares) {
    const d = Math.hypot(l.x - j.pos.x, l.z - j.pos.z);
    if (d < l.raio * 0.7 && regras.ultimo !== l.id) { regras.ultimo = l.id; dizer(l.bairro || "Rabiscolândia", `${l.nome}`, 2200); }
  }
  if (alvoMapa && Math.hypot(alvoMapa.x - j.pos.x, alvoMapa.z - j.pos.z) < 5) alvoMapa = null;
}
let tMapa = 0;
const _pOnibus = new THREE.Vector3();
function posicionarCamera(k, dt, andando = false) {
  const giro = (tem("girarD") ? 1 : 0) - (tem("girarE") ? 1 : 0) + pad.gx * 1.2;
  const arrasto = toque && !dentro ? toque.girar() : 0;
  const P = dentro?.tipo === "onibus" ? _pOnibus.set(dentro.pos.x + Math.sin(dentro.ang) * 2.6, dentro.pos.y, dentro.pos.z + Math.cos(dentro.ang) * 2.6) : dentro ? dentro.pos : j.pos;
  camera.posicionar({ P, ref: dentro ? dentro.ang : j.dir, dirigindo: Boolean(dentro), andando, giro, arrasto, onibus: dentro?.tipo === "onibus" }, k, dt);
  ceu.seguir(P.x, P.z);
  mundo.visibilidade(P.x, P.z);
}
function quadro() {
  if (!vivo) return;
  // aparelho lento: o tempo do jogo não fica para trás (até 8 passos de 1/30 s por quadro)
  const total = Math.min(relogio.getDelta(), 8 / 30);
  const passos = Math.max(1, Math.ceil(total / (1 / 30 + 1e-6)));
  for (let p = 0; p < passos; p++) passo(total / passos, p === passos - 1);
  r3.render(cena, cam);
  estat.calls = r3.info.render.calls; estat.tris = r3.info.render.triangles;
  estat.n++;
  requestAnimationFrame(quadro);
}
function passo(dt, ultimo) {
  const t = relogio.elapsedTime;
  if (!jogo.pausado) {
    const ent = entrada();
    let andando = false;
    if (dentro) {
      const outros = transito.map((k) => ({ x: k.g.position.x, z: k.g.position.z, raio: 2.2 })).concat(veiculos.filter((v) => v !== dentro).map((v) => ({ x: v.pos.x, z: v.pos.z, raio: v.comp })));
      if (fis.dirigir(dentro, ent, dt, outros)) { sons.batida(); navigator.vibrate?.(30); }
      if ((pad.puloNovo || toque?.puloNovo) && dentro.buzina <= 0) { sons.buzina(); dentro.buzina = 0.8; }
      dentro.buzina -= dt;
      pad.puloNovo = false; if (toque) toque.puloNovo = false;
      j.pos.set(dentro.pos.x, 0.07, dentro.pos.z); j.dir = dentro.ang;
      {
        rabisco.atualizar(dt, { modo: "dirigir", virar: dentro.virar });
        const vol = dentro.g.userData.volante;
        dentro.g.updateMatrixWorld(true);
        const mE = rabisco.bracoE.cotovelo.localToWorld(new THREE.Vector3(0, -0.82, 0)), mD = rabisco.bracoD.cotovelo.localToWorld(new THREE.Vector3(0, -0.82, 0));
        const meio = mE.clone().add(mD).multiplyScalar(0.5); dentro.g.worldToLocal(meio);
        vol.position.copy(meio); vol.scale.setScalar(Math.max(0.6, mE.distanceTo(mD) / 2 / 0.24)); vol.rotation.set(-1.0, 0, dentro.virar * 0.6);
      }
      andando = Math.abs(dentro.vel) > 1;
    } else {
      const quer = pad.puloNovo || toque?.puloNovo;
      pad.puloNovo = false; if (toque) toque.puloNovo = false;
      const { v, pulou } = fis.andar(j, { ix: ent.ix, iy: ent.iy, pular: quer, segura: pad.pulo || toque?.pulo || tem("pular") }, camera.st.yaw, dt);
      if (pulou) sons.pulo();
      rabisco.grupo.position.copy(j.pos); rabisco.grupo.rotation.y = j.dir;
      rabisco.atualizar(dt, { modo: !j.noChao ? "pular" : v > 0.6 ? "andar" : "parado", vel: v, vmax: VEL });
      andando = ent.m > 0.2 && ent.iy > -0.3;
      // carro da cidade encostando no Rabisco a pé: empurra devagar
      for (const k of transito) { const ex = j.pos.x - k.g.position.x, ez = j.pos.z - k.g.position.z, d = Math.hypot(ex, ez); if (d < 2.4 && d > 0.01 && j.pos.y < 2) { j.pos.x += (ex / d) * dt * 4; j.pos.z += (ez / d) * dt * 4; } }
    }
    for (const v of veiculos) animarVeiculo(v, dt, t);
    atualizarSemaforos(mundo.semaforos, t);
    const alvos = [{ x: j.pos.x, z: j.pos.z, raio: dentro ? 1.6 : 0.6 }, ...veiculos.filter((v) => v !== dentro).map((v) => ({ x: v.pos.x, z: v.pos.z, raio: v.larg }))];
    atualizarTransito(transito, mundo.semaforos, alvos, dt, t);
    for (const k of transito) k.g.visible = Math.hypot(k.g.position.x - j.pos.x, k.g.position.z - j.pos.z) < (qualidade.perfil.toque ? 60 : mundo.alcance - 20);
    // a seta "entre aqui" só aparece perto (e nunca no veículo que ele dirige)
    for (const v of veiculos) v.g.userData.seta.visible = v !== dentro && Math.hypot(v.pos.x - j.pos.x, v.pos.z - j.pos.z) < 25;
    atualizarMoradores(dt);
    mundo.atualizar(dt, t);
    regras();
    posicionarCamera(Math.min(1, dt * 6), dt, andando);
    tMapa -= dt;
    if (ultimo && tMapa <= 0) { tMapa = 0.15; desenharMapa(minimapa.getContext("2d"), 200); atualizarBussola(); atualizarBotaoAcao(); if (!mapaGrande.hidden) desenharMapa(mapaGrande.querySelector("canvas").getContext("2d"), 640, true); }
    if (ultimo && !params.has("fixo")) qualidade.medir(t);
  }
}
const estat = { calls: 0, tris: 0, n: 0, t: 0 };

// ------------------------------------------------------------------ HUD: balão, botão de ação, bússola e mapa
function dizer(nome, texto, ms = 4200) {
  balao.innerHTML = `<b>${nome}</b>${texto}`;
  balao.classList.add("ativo");
  clearTimeout(dizer.t);
  dizer.t = setTimeout(() => balao.classList.remove("ativo"), ms);
}
function atualizarHud() { hud.innerHTML = `<div class="chip-rp">🏙️ Rabiscolândia</div>`; }
function atualizarBotaoAcao() {
  const b = hud.btnAcao;
  const touch = document.body.classList.contains("touch");
  // no toque o botão ✋ da direita mostra o rótulo; no teclado/controle, o botão amarelo embaixo
  if (toque?.elAcao) { toque.elAcao.textContent = contexto ? contexto.rotulo : "✋"; toque.elAcao.classList.toggle("ativo", Boolean(contexto)); }
  if (!contexto || touch) { b.hidden = true; return; }
  b.hidden = false;
  const r = jogo.remap;
  const dica = document.body.classList.contains("com-controle") ? (r?.rotuloBotao("acao") || "X") : (r?.rotulo("acao") || "F");
  const html = `${contexto.rotulo} <kbd>${dica}</kbd>`;
  if (b.innerHTML !== html) b.innerHTML = html;
}
function atualizarBussola() {
  const a = alvoMapa;
  if (!a) { bussola.hidden = true; return; }
  bussola.hidden = false;
  const ang = Math.atan2(a.x - j.pos.x, a.z - j.pos.z);
  const rel = Math.atan2(Math.sin(ang - camera.st.yaw), Math.cos(ang - camera.st.yaw));
  bussola.querySelector(".seta").style.transform = `rotate(${(-rel * 180) / Math.PI - 90}deg)`;
  bussola.querySelector(".rotulo").textContent = `${a.emoji} ${Math.round(Math.hypot(a.x - j.pos.x, a.z - j.pos.z))} m`;
}
function alternarMapa(abrir = null) {
  mapaGrande.hidden = abrir === null ? !mapaGrande.hidden : !abrir;
  if (!mapaGrande.hidden) desenharMapa(mapaGrande.querySelector("canvas").getContext("2d"), 640, true);
}
function desenharMapa(c, S, nomes = false) {
  const k = S / ((BORDA + 8) * 2);
  const P = (x, z) => [S / 2 + x * k, S / 2 + z * k];
  c.clearRect(0, 0, S, S);
  c.fillStyle = "#7ccf52"; c.fillRect(0, 0, S, S);
  c.fillStyle = "#5fb83f"; for (const A of [PARQUE, FAZENDA]) { const [x0, z0] = P(A.x0, A.z0); c.fillRect(x0, z0, (A.x1 - A.x0) * k, (A.z1 - A.z0) * k); }
  c.fillStyle = "#3fb6f5"; c.beginPath(); c.arc(...P(LAGO.x, LAGO.z), LAGO.r * k, 0, 7); c.fill();
  c.fillStyle = "rgba(255,248,235,0.9)";
  for (const s of mundo.solidos) if (s.y1 > 8 && s.x1 - s.x0 > 5) { const [x0, z0] = P(s.x0, s.z0); c.fillRect(x0, z0, (s.x1 - s.x0) * k, (s.z1 - s.z0) * k); }
  c.lineCap = c.lineJoin = "round";
  for (const [extra, cor] of [[6, "#efe4d0"], [0, "#5b6170"]]) for (const r of RUAS) {
    c.beginPath(); r.pts.forEach((p, i) => (i ? c.lineTo(...P(...p)) : c.moveTo(...P(...p)))); if (r.fechada) c.closePath();
    c.lineWidth = (r.w + extra) * k; c.strokeStyle = cor; c.stroke();
  }
  c.fillStyle = "#e8e2d6"; c.beginPath(); c.arc(...P(PRACA.x, PRACA.z), PRACA.r * k, 0, 7); c.fill();
  for (const l of LUGARES) {
    const [x, y] = P(l.x, l.z);
    c.fillStyle = l.parceiro ? "#ffcc1f" : "#ffffff"; c.strokeStyle = "#151515"; c.lineWidth = Math.max(1, S / 200);
    c.beginPath(); c.arc(x, y, S / 70, 0, 7); c.fill(); c.stroke();
    if (nomes) { c.font = `800 ${Math.round(S / 46)}px 'Baloo 2', sans-serif`; c.textAlign = "center"; c.lineWidth = 4; c.strokeStyle = "#fff"; c.strokeText(l.nome, x, y - S / 50); c.fillStyle = "#151515"; c.fillText(l.nome, x, y - S / 50); }
  }
  for (const L of LOTES) {
    const [x, y] = P(L.x, L.z); const minha = L.numero === salvo.casa;
    c.font = `${Math.round(S / (minha ? 18 : 30))}px 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(minha ? "🏠" : "⌂", x, y); c.textBaseline = "alphabetic";
  }
  for (const v of veiculos) { const [x, y] = P(v.pos.x, v.pos.z); c.save(); c.translate(x, y); c.rotate(Math.PI - v.ang); c.fillStyle = `#${new THREE.Color(v.cor ?? 0xffcc1f).getHexString()}`; c.strokeStyle = "#151515"; c.lineWidth = 1.5; const w = S / 60, h = S / (v.tipo === "onibus" ? 22 : 34); c.fillRect(-w / 2, -h / 2, w, h); c.strokeRect(-w / 2, -h / 2, w, h); c.restore(); }
  if (alvoMapa) { const [x, y] = P(alvoMapa.x, alvoMapa.z); c.strokeStyle = "#ff2a6a"; c.lineWidth = 3; c.beginPath(); c.arc(x, y, S / 30 + Math.sin(relogio.elapsedTime * 6) * 2, 0, 7); c.stroke(); }
  const [x, y] = P(j.pos.x, j.pos.z);
  c.save(); c.translate(x, y); c.rotate(-j.dir + Math.PI);
  const e = S / 24;
  c.fillStyle = "#ec2e8c"; c.strokeStyle = "#151515"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, -e); c.lineTo(e * 0.75, e * 0.75); c.lineTo(-e * 0.75, e * 0.75); c.closePath(); c.fill(); c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ Testes (?teste)
if (params.has("teste")) window.teste = {
  jogo, j, veiculos, LOTES, LUGARES, PARCEIROS, distRua,
  get janelas() { return { janela: MAT.janela.emissiveIntensity, quente: MAT.janelaQuente.emissiveIntensity, lampada: MAT.lampada.emissiveIntensity }; },
  get mundo() { return mundo; }, get dentro() { return dentro; }, get contexto() { return contexto?.rotulo ?? null; },
  get salvo() { return carregar(); }, get fone() { return fone; }, get transito() { return transito; }, get moradores() { return moradores; },
  get ceu() { return ceu; }, get estat() { return { ...estat, fps: qualidade?.fps ?? 0, blocos: mundo.blocosVisiveis(), malhas: mundo.malhas }; },
  get vivo() { return vivo; },
  get r3() { return r3; }, get cena() { return cena; }, get cam() { return cam; }, get rabisco() { return rabisco; }, get vovo() { return vovo; },
  // desenha um quadro agora e devolve o custo (com e sem o passe de sombra)
  medir() { r3.render(cena, cam); const a = { calls: r3.info.render.calls, tris: r3.info.render.triangles }; const s = ceu.sol.castShadow; ceu.sol.castShadow = false; r3.shadowMap.needsUpdate = true; r3.render(cena, cam); const b = { calls: r3.info.render.calls, tris: r3.info.render.triangles }; ceu.sol.castShadow = s; return { total: a, semSombra: b }; },
  ir(x, z) { if (dentro) sair(); j.pos.set(x, 0.07, z); j.vel.set(0, 0, 0); posicionarCamera(1, 0); },
  olhar(yaw) { camera.st.yaw = yaw; camera.st.manual = 5; posicionarCamera(1, 0); },
  vista(pos, alvo, neblina = true) { camera.st.vista = pos ? { pos, alvo } : null; const longe = pos && !neblina; mundo.alcance = longe ? 2000 : qualidade.perfil.toque ? 95 : 140; cena.fog.far = longe ? 2000 : mundo.alcance; cena.fog.near = longe ? 1500 : 60; if (pos) mundo.visibilidade(alvo[0], alvo[2]); if (pos && !neblina) mundo.blocos.forEach((b) => (b.visible = true)); posicionarCamera(1, 0); },
  acao() { pad.acaoNova = true; },
  entrar(i = 0) { const v = veiculos[i]; if (dentro) sair(); j.pos.set(v.pos.x + 2, 0.07, v.pos.z); entrar(v); },
  sair() { if (dentro) dentro.vel = 0; sair(); },
  volante(acel, virar = 0) { entradaTeste = acel == null ? null : { acel, virar }; },
  garagem(tipo = "carro", cor = 0xff7a00) { const v = chamarVeiculo(tipo, cor); return v ? Math.hypot(v.pos.x - j.pos.x, v.pos.z - j.pos.z) : null; },
  hora(h) { ceu.hora(h); },
  dentroDeSolido(x, z) { return fis.bate(x, z, 0.5, 0); },
  casaFrente(n) { const c = mundo.casas.find((k) => k.lote.numero === n); return c.frente; },
};
