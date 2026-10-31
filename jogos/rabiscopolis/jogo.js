// Rabiscolândia: Vida na Cidade. A criança vive o dia do Rabisco numa cidade grande e colorida: escolhe uma casa no
// Bairro das Casas (a placa ganha o nome dela), passeia a pé ou dirigindo (carro aberto ou ônibus da escola, que
// aparecem pelo Rabifone), conhece a Igreja Reviver, a escola, o hospital, os bombeiros, o comércio com as lojas
// parceiras, o parque com o lago e a Fazendinha, e troca o dia pela noite. Sem tempo, sem perder, sem dinheiro.
// Os moradores são amigos do estojo (personagens.js). Tudo o que é guardado fica no aparelho (salvar.js).
//
// Módulos: mapa.js (dados) · mundo.js (montagem em blocos) · predios.js · casas.js · personagens.js · veiculos.js
// · fisica.js · camera.js · ceu.js · rabifone.js · toque.js · salvar.js · qualidade.js · missoes.js (+ missoes-dados.js)
// · jogador2.js (2 jogadores: com 1 jogador só o Rabisco; o jogador 2 escolhe a criança do cadastro ou um amigo do estojo).
// ?teste expõe window.teste.

import { THREE, MAT, mesclar, placa } from "./base3d.js";
import { PARCEIROS } from "../../src/parceiros.js";
import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { Engrenagem } from "../../src/motor/engrenagem.js";
import { falar, falarNome, preCarregarFalas } from "../../src/motor/voz.js";
import { montarMundo } from "./mundo.js";
import { criarFisica, VEL } from "./fisica.js";
import { criarCamera } from "./camera.js";
import { criarCeu } from "./ceu.js";
import { criarVeiculo, animarVeiculo, criarTransito, atualizarTransito, atualizarSemaforos, luzDe } from "./veiculos.js";
import { criarMissoes } from "./missoes.js";
import { criarPatioJE, enfeitarCarro } from "./je-patio.js";
import { criarJogador2 } from "./jogador2.js";
import { CODIGOS_J2, TECLAS_J1_EXTRA } from "../../src/motor/jogadores.js";
import { criarMorador, criarVovo } from "./personagens.js";
import { criarRabifone } from "./rabifone.js";
import { criarToque } from "./toque.js";
import { carregar, salvar } from "./salvar.js";
import { criarQualidade } from "./qualidade.js";
import { montarInterior, colocar, solidosDosMoveis, cabe, pegadaDoMovel, PLANTAS, verificar } from "./interiores.js";
import { MOVEIS, CORES_MOVEL, VERSICULOS } from "./moveis.js";
import { criarDecorar } from "./decorar.js";
import { recolorirParedes } from "./casas.js";
import { montarSala, SALAS, tocarNotas, MUSIQUINHA } from "./lugares-dentro.js";
import { vestirProfissao, tirarProfissao, PROFISSOES } from "./roupas-rp.js";
import { criarSorveteUI } from "./sorvete-ui.js";
import { criarRadioRabisco, criarAvisoRadio } from "./radio-rabisco.js";
import { criarRadioUI } from "../../src/radio/radio-ui.js";
import { RUAS, segmentos, LOTES, VAGAS, LARGADA, LUGARES, LAGO, PARQUE, PRACA, FAZENDA, BORDA, MORADORES, distRua, PRAIA, LAGO2, HELIPONTO, MAR, ORLA, ILHA, PIERS, RODA, PRACAS_NOVAS } from "./mapa.js";
void PARQUE;

const params = new URLSearchParams(location.search);
const CONTROLES = [
  { id: "frente", nome: "Frente / acelerar", teclas: ["KeyW", "ArrowUp"] },
  { id: "tras", nome: "Trás / ré", teclas: ["KeyS", "ArrowDown"] },
  { id: "esq", nome: "Esquerda", teclas: ["KeyA", "ArrowLeft"] },
  { id: "dir", nome: "Direita", teclas: ["KeyD", "ArrowRight"] },
  { id: "pular", nome: "Pular (no carro: buzina)", teclas: ["Space"], botoes: [0, 1], controle: "pulo" },
  { id: "acao", nome: "Ação (entrar, sair, morar aqui)", teclas: ["KeyF", "Enter"], botoes: [2, 3], controle: "acao" },
  { id: "descer", nome: "Helicóptero: descer (pulo sobe)", teclas: ["ShiftLeft", "KeyZ"] },
  { id: "fone", nome: "Rabifone", teclas: ["Tab", "KeyC"], botoes: [8], controle: "select" },
  { id: "girarE", nome: "Girar a câmera ⟲", teclas: ["KeyQ"] },
  { id: "girarD", nome: "Girar a câmera ⟳", teclas: ["KeyE"] },
  { id: "mapa", nome: "Mapa (mostrar / esconder)", teclas: ["KeyM"], botoes: [10], controle: "mapa" },
];
// Pai Nosso (Mateus 6.9-13, texto tradicional): uma frase por vez, cada uma com a sua voz (cid-pai-1..11, da Rabiscópolis)
const ORACAO = [
  "Pai nosso, que estás no céu,", "santificado seja o teu nome.", "Venha o teu reino,", "seja feita a tua vontade,", "assim na terra como no céu.",
  "O pão nosso de cada dia nos dá hoje.", "Perdoa as nossas ofensas,", "assim como nós perdoamos a quem nos tem ofendido.",
  "E não nos deixes cair em tentação,", "mas livra-nos do mal.", "Amém.",
];
const ESPERA_REPETIR = 4.5; // segundos depois da voz até seguir sozinho (a criança repete junto)
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
    teclado: "WASD ou setas andam · F faz a ação · Tab abre o Rabifone · M mostra o mapa · Q/E giram a câmera · Espaço pula",
    toque: "Arraste à esquerda para andar · à direita para olhar · ✋ faz a ação · 📱 abre o Rabifone · ⚙️ mostra o mapa",
    controle: "Alavanca anda · X faz a ação · Select abre o Rabifone · L3 mostra o mapa · A pula · Start pausa",
  },
  falas: { titulo: "rp-titulo", vitoria: null },
  controles: CONTROLES,
  // 2 jogadores ao mesmo tempo (src/motor/jogadores.js): o jogador 2 entra por controle, celular (QR) ou teclado dividido.
  // No celular sozinho abre sempre em 1 jogador (nada de pedir controle ou QR).
  jogadores: "simultaneo",
  aoComecar: iniciar,
  aoSair: parar,
  aoPausar: () => { teclas.clear(); toque?.zerar(); radioUI?.sairDoCarro(); },
  aoContinuar: () => { if (dentro && dentro.tipo !== "heli") radioUI?.entrarNoCarro(); },
  aoControle: lerControle,
});
preCarregarFalas([]);
void FALAS;

// ------------------------------------------------------------------ Entrada
const teclas = new Set();
const PADRAO = Object.fromEntries(CONTROLES.map((a) => [a.id, a.teclas]));
const J = jogo.jogadores;
// teclado dividido (2 jogadores no computador): WASD, Espaço e F são do jogador 2; o Rabisco fica com as setas,
// Enter (ação) e Shift direito (pulo)
function teclasDe(acao) {
  const t = jogo.remap?.teclas(acao) ?? PADRAO[acao];
  if (!J.tecladoDividido) return t;
  const extra = acao === "pular" ? TECLAS_J1_EXTRA.pulo : acao === "acao" ? TECLAS_J1_EXTRA.acao : [];
  return [...t.filter((k) => !CODIGOS_J2.has(k)), ...extra];
}
const tem = (acao) => teclasDe(acao).some((k) => teclas.has(k));
const ehAcao = (acao, code) => teclasDe(acao).includes(code);
const pad = { x: 0, y: 0, gx: 0, pulo: false, puloNovo: false, acaoNova: false };
let toque = null, fone = null;
addEventListener("keydown", (e) => {
  if (jogo.estado !== "jogando" || jogo.pausado) return;
  if (J.tv && !ehAcao("mapa", e.code)) return; // TV como tela (página tv/): os dois jogam pelos controles e celulares
  if (sorveteUI?.aberto) {
    const mapa = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (mapa[e.code]) { sorveteUI.navegar(...mapa[e.code]); e.preventDefault(); return; }
    if (e.code === "Enter" || e.code === "Space" || e.code === "KeyF") { sorveteUI.confirmar(); e.preventDefault(); return; }
    if (e.code === "Escape" || e.code === "Backspace") { sorveteUI.fechar(); e.preventDefault(); }
    return;
  }
  if (deco?.aberto) {
    const mapa = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] };
    if (mapa[e.code]) { deco.navegar(...mapa[e.code]); e.preventDefault(); return; }
    if (e.code === "Enter" || e.code === "Space" || e.code === "KeyF") { deco.confirmar(); e.preventDefault(); return; }
    if (e.code === "Escape" || e.code === "Backspace") { deco.cancelar(); e.preventDefault(); }
    return;
  }
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
  if (ehAcao("mapa", e.code) && !e.repeat) mapaPedido();
  if (e.code.startsWith("Arrow")) e.preventDefault();
});
addEventListener("keyup", (e) => teclas.delete(e.code));
function lerControle({ segura, apertou, eixoX, eixoY }) {
  if (sorveteUI?.aberto) {
    if (apertou.esq) sorveteUI.navegar(-1, 0); if (apertou.dir) sorveteUI.navegar(1, 0);
    if (apertou.cima) sorveteUI.navegar(0, -1); if (apertou.baixo) sorveteUI.navegar(0, 1);
    if (apertou.confirma) sorveteUI.confirmar(); else if (apertou.voltar) sorveteUI.fechar();
    return;
  }
  if (deco?.aberto) {
    if (apertou.esq) deco.navegar(-1, 0); if (apertou.dir) deco.navegar(1, 0);
    if (apertou.cima) deco.navegar(0, -1); if (apertou.baixo) deco.navegar(0, 1);
    if (apertou.confirma) deco.confirmar(); else if (apertou.voltar) deco.cancelar();
    return;
  }
  if (fone?.aberto) {
    if (apertou.esq) fone.navegar(-1, 0); if (apertou.dir) fone.navegar(1, 0);
    if (apertou.cima) fone.navegar(0, -1); if (apertou.baixo) fone.navegar(0, 1);
    if (apertou.confirma) fone.confirmar(); else if (apertou.voltar) fone.voltar();
    if (apertou.select) fone.fechar();
    return;
  }
  let gx = 0;
  for (const p of navigator.getGamepads?.() ?? []) if (p && p.index !== J.padJ2 && Math.abs(p.axes[2] ?? 0) > 0.2) gx = p.axes[2];
  pad.x = eixoX || ((segura.dir ? 1 : 0) - (segura.esq ? 1 : 0));
  pad.y = -(eixoY || ((segura.baixo ? 1 : 0) - (segura.cima ? 1 : 0)));
  pad.gx = gx;
  if (apertou.pulo) pad.puloNovo = true;
  pad.pulo = segura.pulo;
  // helicóptero: A/RB sobem (pulo), LB/LT descem
  pad.descer = false;
  for (const p of navigator.getGamepads?.() ?? []) if (p && p.index !== J.padJ2 && (p.buttons[4]?.pressed || p.buttons[6]?.pressed)) pad.descer = true;
  if (apertou.acao) pad.acaoNova = true;
  if (apertou.select) fone?.abrir();
  if (apertou.mapa) mapaPedido();
  if (apertou.voltar && mapaGrande && !mapaGrande.hidden) alternarMapa();
}

// ------------------------------------------------------------------ Rádio gospel (src/radio): só no carro e no ônibus
// (no helicóptero não: LB desce o helicóptero e o painel usaria LB/RB/R3). O painel fica abaixo do minimapa
// (no celular deitado, à esquerda, longe dos pedais e do 📱). Teclas R, [ e ]; as falas abaixam o volume sozinhas.
// Ao entrar no carro toca a Rádio Rabisco (radio-rabisco.js: gospel dance, uma faixa diferente a cada vez);
// ▶ e ◀ passam para as estações de hinos. Cada faixa nova aparece uns 3 s no alto da tela.
let radio = null, radioUI = null, avisoRadio = null;
function garantirRadio() {
  if (radio) return;
  avisoRadio = criarAvisoRadio();
  radio = criarRadioRabisco({ aoTocar: (f) => { if (f && dentro) avisoRadio.mostrar(`🎵 Rádio Rabisco: ${f.nome}`); } });
  radioUI = criarRadioUI({ radio });
}

// ------------------------------------------------------------------ Estado
let r3, cena, cam, ceu, mundo, fis, camera, rabisco, relogio, qualidade, vivo = false;
let hud, minimapa, mapaGrande, balao, bussola, caixa;
const j = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), noChao: true, coyote: 0, buffer: 0, dir: 0 };
const veiculos = []; let garagem = null; // veículo chamado pelo Rabifone (só um por vez)
let transito = [], moradores = [], vovo = null, missoes = null, j2 = null, patioJE = null;
let dentro = null, contexto = null, salvo = carregar(), alvoMapa = null;
let mapaLigado = false; // minimapa do canto: escondido ao começar; M, L3 e a ⚙️ mostram e escondem
let emCasa = null, deco = null, fade = null; const interiores = {}; // casa por dentro (montada uma vez por planta)
let emLugar = null, sorveteUI = null; const salas = {}; // lugares por dentro (Fatia 3), montados na primeira visita
let solidosDentro = []; // colisões da sala/casa em que o Rabisco está
let entradaTeste = null;
let trava = null; // Rabisco preso na esteira ou no halter (parceiras-dentro.js)
let oracao = null, painelOracao = null, audiosOracao = null; // Pai Nosso no tapete da igreja (ou lá dentro)
let acaoJ2 = null; // balãozinho rosa: o que a ação do jogador 2 faz agora
// idade da criança do cadastro (src/motor/familia.js); ?idade=N na URL vale para testar
function idadeCrianca() {
  if (params.has("idade")) return Number(params.get("idade"));
  try { const i = window.Familia?.crianca?.()?.idade; return Number.isFinite(i) ? i : null; } catch { return null; }
}
const nomeCrianca = () => { try { return window.Familia?.crianca?.()?.nome || null; } catch { return null; } };
// plaquinha com o nome em pé sobre a cabeça do Rabisco: o nome do cadastro da família ou, sem cadastro, o que a criança escreveu
// no Meu Rabisco (só neste aparelho). Até 12 letras (nome comprido mostra o primeiro nome). Sem nome, sem plaquinha.
const nomeDaPlaca = () => {
  const n = (nomeCrianca() || salvo.nomeRabisco || "").trim().replace(/\s+/g, " ");
  return (n.length > 12 ? n.split(" ")[0] : n).slice(0, 12);
};
let placaNome = null; // { sprite, nome }
function criarPlaca() {
  placaNome = null;
  atualizarPlaca();
  document.fonts?.ready.then(() => { if (placaNome) { placaNome.nome = null; atualizarPlaca(); } });
}
function atualizarPlaca() {
  if (!rabisco) return;
  const nome = nomeDaPlaca();
  if (!nome) { if (placaNome) placaNome.sprite.visible = false; return; }
  if (!placaNome) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false }));
    sprite.scale.set(1.25, 0.37, 1); sprite.position.y = 2.05; sprite.renderOrder = 7;
    rabisco.grupo.add(sprite);
    placaNome = { sprite, nome: null };
  }
  if (placaNome.nome !== nome) {
    placaNome.sprite.material.map?.dispose();
    placaNome.sprite.material.map = placa(nome, { cor: "#ec2e8c", w: 384, h: 112 });
    placaNome.sprite.material.needsUpdate = true;
    placaNome.nome = nome;
  }
  placaNome.sprite.visible = !dentro; // dentro de um veículo a plaquinha fica escondida (o teto e o vidro a cobririam)
}

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
  criarPlaca();
  if (salvo.roupas?.[0] && PROFISSOES[salvo.roupas[0]]) setTimeout(() => vestir(salvo.roupas[0]), 0);
  // celular: neblina mais perto, menos blocos e carros desenhados
  if (qualidade.perfil.toque) { mundo.alcance = 95; mundo.contornoAte = 20; mundo.detalheAte = 35; cena.fog.far = 95; cena.fog.near = 40; }
  j.pos.set(LARGADA.x, 0.07, LARGADA.z); j.vel.set(0, 0, 0); j.dir = LARGADA.dir; camera.st.yaw = LARGADA.dir;
  for (const v of VAGAS) { const q = criarVeiculo(v.tipo, v.cor); q.pos.set(v.x, 0.03, v.z); q.ang = v.ang; cena.add(q.g, q.parado); animarVeiculo(q, 0, 0); veiculos.push(q); }
  transito = criarTransito(cena);
  patioJE = criarPatioJE(cena, { solidos: mundo.solidos }); // pátio de carros da J.E (montado só de perto)
  criarMoradores();
  aplicarCasa();
  missoes = criarMissoes({
    cena, rabisco, vovo, salvo, sons, dizer: (...a) => dizer(...a),
    salvar: (d) => { Object.assign(salvo, { missoesFeitas: d.missoesFeitas, selos: d.selos }); salvar(salvo); },
    falar: (k) => { radio?.pausarPorFala(true); falar(k); },
    // fala emendada com o nome da criança (banco assets/voz/nomes); false sem cadastro/nome gravado
    falarNome: (pre, pos) => { radio?.pausarPorFala(true); return falarNome(pre, pos); }, nome: nomeCrianca,
    confete: () => jogo.confete?.(),
    pos: () => j.pos, veiculoAtual: () => dentro, ocupado: () => Boolean(emCasa || emLugar),
    raio: () => (qualidade.perfil.toque ? 35 : 45),
    distRua, luzDe, semaforos: () => mundo.semaforos,
    chamarCarro: () => chamarVeiculo("carro", 0x00b5f0),
    aoConcluir: () => { alvoMapa = null; },
    pos2: () => (j2?.aPe ? j2.pos : null),
    // missões que vieram da Rabiscópolis: casas (quem espera na porta), idade (escola da criança), patinhos do lago
    patioJE,
    // o carro escolhido no pátio da J.E vira um carro de verdade, com o mesmo enfeite
    adicionarVeiculo: (vg) => { const v = criarVeiculo("carro", vg.hex, (g) => enfeitarCarro(g, vg.modelo)); v.pos.set(vg.x, 0.03, vg.z); v.ang = vg.ang; animarVeiculo(v, 0, 0); cena.add(v.g, v.parado); veiculos.push(v); return v; },
    orar: (tp, fim) => comecarOracao(tp, fim), pararOracao: () => terminarOracao(false),
    casas: () => mundo.casas, idade: idadeCrianca, patos: () => mundo.anima.patos, chaoHeli: (x, z) => fis.chaoHeli(x, z),
  });

  // HUD
  hud = el("div", { class: "hud-rp" });
  minimapa = el("canvas", { class: "minimapa-rp", width: "200", height: "200", role: "button", "aria-label": "Abrir o mapa grande", hidden: "" });
  mapaLigado = false;
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
  j2 = criarJogador2({
    cena, caixa, fis, J, j, sons, dizer: (...a) => dizer(...a), raiz: "../..",
    salvo: () => salvo, salvar: (d) => salvar(d), crianca: () => { try { return window.Familia?.crianca?.() || null; } catch { return null; } },
    otimizar: (rb) => otimizarRabisco(rb, () => j2?.modelo?.c?.rabisco === rb),
    veiculo: () => dentro, yaw: () => camera.st.yaw, caronaDaMissao: () => missoes?.carona,
    travado: () => Boolean(fone?.aberto || deco?.aberto || sorveteUI?.aberto),
  });
  acaoJ2 = el("div", { class: "acao-j2-rp", hidden: "" }); caixa.append(acaoJ2);
  fade = el("div", { class: "fade-rp" }); caixa.append(fade);
  painelOracao = el("div", { class: "oracao-rp", hidden: "", "aria-live": "polite" }); caixa.append(painelOracao);
  sorveteUI = criarSorveteUI(caixa);
  deco = criarDecorar(caixa, {
    aoTrocar: (e) => { if (emCasa && pontoDeco) colocar(emCasa.int, pontoDeco, e); },
    aoConfirmar: (e) => confirmarDeco(e),
    aoCancelar: (orig) => { if (emCasa && pontoDeco) colocar(emCasa.int, pontoDeco, orig); pontoDeco = null; },
  });
  fone = criarRabifone(caixa, {
    hora: () => ceu.horaAtual,
    aoAbrir: () => { teclas.clear(); toque.zerar(); },
    aoGaragem: (tipo, cor) => chamarVeiculo(tipo, cor),
    aoHora: (h) => mudarHora(h),
    aoMapa: () => alternarMapa(true),
    infoCasa: () => ({ tem: salvo.casa != null, nome: salvo.casa != null ? `Casa ${salvo.casa}` : "" }),
    coresCasa: () => CORES_PAREDE,
    missoes: () => ({ lista: missoes.MISSOES.map((m) => ({ id: m.id, titulo: m.titulo, icone: m.icone, tipo: m.tipo, feita: missoes.feitas.includes(m.id) })), ativa: missoes.ativa }),
    aoMissao: (acao, id) => {
      if (acao === "largar") { missoes.largar(); dizer("Passaporte", "Tudo bem! Dá para voltar quando quiser.", 2400); return; }
      const o = missoes.ondePede(id); alvoMapa = { x: o.x, z: o.z, emoji: "❗" };
      dizer("Passaporte", "Siga a setinha até quem tem o ponto de exclamação!", 2600);
    },
    aoCasa: (acao, extra) => {
      if (acao === "cor") { trocarCorCasa(extra); return; }
      if (emCasa && acao === "ir") return;
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
  emCasa = null; for (const k of Object.keys(interiores)) delete interiores[k];
  emLugar = null; solidosDentro = []; for (const k of Object.keys(salas)) delete salas[k];
  radioUI?.sairDoCarro();
  if (r3) { r3.dispose(); r3 = null; }
  veiculos.length = 0; transito = []; patioJE = null; moradores = []; vovo = null; garagem = null; missoes = null;
  jogo.palco.querySelector('.escolha-j2-rp')?.remove(); j2 = null;
  dentro = null; contexto = null; alvoMapa = null; oracao = null; trava = null;
  teclas.clear();
}

// ------------------------------------------------------------------ Rabisco com menos chamadas de desenho
// O Rabisco oficial (rabisco3d.js, sem mudar) tem ~165 peças. As que não mexem entre si são juntadas em cada
// articulação (corpo, tronco, quadris, joelhos, ombros e cotovelos): ~30 chamadas. Boné e aba ficam soltos
// (roupas3d.js mexe neles). O rosto chega depois (rosto3d.json): junta de novo quando ele aparecer.
function otimizarRabisco(rb, vale = () => rabisco === rb) {
  for (const o of [rb.bone, rb.pivoAba, rb.aba]) if (o) o.userData.dinamico = true;
  const juntas = new Set([rb.corpo, rb.tronco, rb.pernaE.quadril, rb.pernaE.joelho, rb.pernaD.quadril, rb.pernaD.joelho, rb.bracoE.ombro, rb.bracoE.cotovelo, rb.bracoD.ombro, rb.bracoD.cotovelo].filter(Boolean));
  const juntar = () => { if (vale()) mesclar(rb.grupo, { juntas }); };
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
    vovo.grupo.visible = d < mundo.alcance + 10; // longe (na neblina) nem desenha: com a cidade maior isso pesava
    if (d < 4 && !vovo.acenou) { vovo.acenou = true; vovo.acenar(2.5); }
    if (d > 8) vovo.acenou = false;
    vovo.atualizar(dt, { vel: 0 });
  }
}

// ------------------------------------------------------------------ Casa
function textoPlaca() { const n = nomeCrianca(); return n ? `Casa de ${n}` : "Minha Casa"; }
function aplicarCasa() {
  for (const c of mundo.casas) {
    const minha = c.lote.numero === salvo.casa;
    c.placa.userData.definir(minha ? textoPlaca() : `Casa ${c.lote.numero}`, minha ? "#ffcc1f" : "#ec2e8c");
    // cor das paredes: a escolhida no Rabifone (só a casa da criança); as outras ficam com a cor do lote
    const cor = minha && typeof salvo.corCasa === "number" ? salvo.corCasa : c.lote.hex;
    if (c.grupo.userData.paredes.userData.cor !== cor) recolorirParedes(c.grupo.userData.paredes, cor);
  }
}
// ------------------------------------------------------------------ Casa por dentro (Fatia 2)
// Planta A no Bairro das Casas, planta B na Vila das Flores. A casa é vista em corte (sem teto, frente baixinha);
// a decoração é por pontos fixos com o carrossel (decorar.js) e fica guardada no aparelho (salvar.js: moveis).
const CORES_PAREDE = [0xf59ac0, 0x8cc8f5, 0xffd86b, 0x9ee08a, 0xc8b0f5, 0xffb27a, 0x8fe3cf, 0xfff0c9, 0xffffff, 0xff8a8a];
let pontoDeco = null;
const plantaDe = (lote) => (lote.numero <= 8 ? "A" : "B");
function trocarCorCasa(hex) {
  if (salvo.casa == null) return;
  salvo.corCasa = hex; salvar(salvo); aplicarCasa();
  falar("rp-casa-cor");
  dizer("Rabifone", "Casa pintadinha de cor nova!", 2400);
}
function escurecer(cb) { fade.classList.add("ativo"); setTimeout(() => { cb(); setTimeout(() => fade.classList.remove("ativo"), 60); }, 260); }
function trocarSolidosCasa(novos) {
  for (const s of solidosDentro) { const i = mundo.solidos.indexOf(s); if (i >= 0) mundo.solidos.splice(i, 1); }
  solidosDentro = novos;
  mundo.solidos.push(...novos);
}
function entrarCasa(c, imediato = false) {
  if (emCasa || emLugar || dentro) return;
  const id = plantaDe(c.lote);
  const fazer = () => {
    if (!interiores[id]) { interiores[id] = montarInterior(id); cena.add(interiores[id].grupo); }
    const int = interiores[id];
    int.grupo.visible = true;
    const salvos = salvo.moveis?.[c.lote.numero] ?? {};
    for (const p of int.pontos) { const e = salvos[p.id] ?? null; if (JSON.stringify(e) !== JSON.stringify(p.escolha)) colocar(int, p, e); }
    emCasa = { c, int, solidos: [] };
    trocarSolidosCasa([...int.solidos, ...solidosDosMoveis(int)]);
    j.pos.set(int.entrada[0], 0.07, int.entrada[1]); j.vel.set(0, 0, 0); j.dir = Math.PI;
    camera.st.yaw = Math.PI;
    aplicarMinimapa();
    posicionarCamera(1, 0);
    if (!entrarCasa.falou) { entrarCasa.falou = true; falar("rp-casa-entrar"); dizer("Minha casa", "Que casa gostosa! Chegue perto de um círculo amarelo e aperte a ação para decorar.", 4200); }
  };
  imediato ? fazer() : escurecer(fazer);
}
function sairCasa(imediato = false) {
  if (!emCasa) return;
  const fazer = () => {
    const { c, int } = emCasa;
    deco.cancelar();
    trocarSolidosCasa([]);
    int.grupo.visible = false;
    emCasa = null;
    const [fx, fz] = c.frente, s = c.lote.dir;
    camera.st.vista = null; camera.st.yaw = Math.atan2(s[0], s[1]); // antes do irPara: a câmera da rua já nasce no lugar certo
    irPara(fx + s[0] * 2.5, fz + s[1] * 2.5);
    j.dir = camera.st.yaw;
    aplicarMinimapa();
  };
  imediato ? fazer() : escurecer(fazer);
}
// ------------------------------------------------------------------ Lugares por dentro (Fatia 3): profissões
function vestir(id) {
  vestirProfissao(rabisco, id);
  // cada peça vira poucas malhas (por dentro ela não mexe)
  for (const r of Object.values(rabisco.roupas ?? {})) for (const o of r.objs) mesclar(o);
  for (const objs of Object.values(rabisco.roupasRP ?? {})) for (const o of objs) mesclar(o);
  salvo.roupas = [id]; salvar(salvo);
}
function tirarUniforme() { tirarProfissao(rabisco); salvo.roupas = []; salvar(salvo); }
// parabéns por missão/aula concluída: a narradora fala o NOME DA CRIANÇA (rp-xxx-pre + nome gravado + rp-xxx-pos); sem
// cadastro ou sem o nome no banco, a fala neutra rp-xxx, sem nome e sem "Rabisco". `chave` = "rp-xxx" (-pre/-pos/neutra).
function parabens(chave, depois, ms, quem = "Rabiscolândia") {
  const n = nomeCrianca();
  dizer(quem, `Parabéns${n ? `, ${n}` : ""}! ${depois}`, ms);
  radio?.pausarPorFala(true);
  falarNome(`${chave}-pre`, `${chave}-pos`).then((ok) => { if (!ok) falar(chave); });
}
const apiLugar = () => ({
  dizer, falar, sons, rabisco, parabens,
  // dentro da Igreja Reviver também dá para orar o Pai Nosso (de frente para a cruz)
  orar: () => comecarOracao({ x: j.pos.x, z: j.pos.z, olhar: Math.PI }, () => { const n = nomeCrianca(); dizer("Igreja Reviver", `Amém${n ? `, ${n}` : ""}! Deus ouve a nossa oração. 🙏`, 4200); }),
  profissao: () => rabisco.profissao ?? null,
  vestir, tirar: tirarUniforme,
  confete: () => jogo.confete?.(),
  // missões dentro das lojas parceiras (presente na Bella Cat, treino na Rise Up)
  missao: () => missoes?.ativa ?? null, evento: (nome, dados) => missoes?.evento(nome, dados),
  // prende o Rabisco num lugar por uns segundos (esteira, halter), com animação
  // colisão que entra e sai com o objeto (blocos e objetos das aulas)
  solido: (s, sim = true) => { if (sim) { solidosDentro.push(s); mundo.solidos.push(s); } else for (const L of [solidosDentro, mundo.solidos]) { const i = L.indexOf(s); if (i >= 0) L.splice(i, 1); } },
  travar: (o) => { trava = { ...o, t: 0, tp: 0 }; teclas.clear(); toque?.zerar(); },
  abrirSorvete: (sabores, cb) => { teclas.clear(); toque?.zerar(); sorveteUI.abrir(sabores, cb); },
});
function entrarLugar(id, imediato = false) {
  if (emCasa || emLugar || dentro || !SALAS[id]) return;
  const fazer = () => {
    if (!salas[id]) { salas[id] = montarSala(id, { idade: idadeCrianca() }); cena.add(salas[id].grupo); }
    const s = salas[id];
    s.grupo.visible = true;
    emLugar = s;
    trocarSolidosCasa([...s.solidos]);
    j.pos.set(s.entrada[0], 0.07, s.entrada[1]); j.vel.set(0, 0, 0); j.dir = Math.PI;
    camera.st.yaw = Math.PI;
    aplicarMinimapa();
    posicionarCamera(1, 0);
    const def = SALAS[id];
    // nas lojas parceiras quem fala é a anfitriã narrando (os personagens parceiros, por enquanto, não falam)
    const quem = id.startsWith("parceiro-") ? "Rabiscolândia" : s.nome;
    if (def.dica && missoes?.ativa === def.dica.missao) { falar(def.dica.fala); dizer(quem, def.dica.texto, 4600); }
    else { falar(def.fala ?? "rp-lugar-entrar"); dizer(quem, def.boasVindas ?? "Bem-vindo! Vista o uniforme no armário 👔 e brinque com os objetos marcados.", 4200); }
    s.est?.aoEntrar?.(apiLugar()); // a sala reage à chegada (na Crescente o Aurélio recepciona)
  };
  imediato ? fazer() : escurecer(fazer);
}
function sairLugar(imediato = false) {
  if (!emLugar) return;
  const fazer = () => {
    const s = emLugar, l = mundo.lugares.find((q) => q.id === s.id);
    sorveteUI.fechar();
    trocarSolidosCasa([]);
    s.grupo.visible = false;
    emLugar = null;
    camera.st.vista = null; camera.st.yaw = Math.atan2(l.dir[0], l.dir[1]); // antes do irPara: a câmera da rua já nasce no lugar certo
    irPara(l.x + l.dir[0] * 2.6, l.z + l.dir[1] * 2.6);
    j.dir = camera.st.yaw;
    aplicarMinimapa();
  };
  imediato ? fazer() : escurecer(fazer);
}
// andar até o vão da porta já leva para a rua (sem botão): a missão continua de onde estava
function saidaPelaPorta() {
  if ((!emLugar && !emCasa) || trava || fade.classList.contains("ativo")) return;
  const porta = emLugar ? emLugar.porta : emCasa.int.porta;
  if (j.pos.z > porta[1] - 0.35 && Math.abs(j.pos.x - porta[0]) < 0.9) emLugar ? sairLugar() : sairCasa();
}
function interativoPerto() {
  if (!emLugar) return null;
  let melhor = null, dm = Infinity;
  for (const it of emLugar.interativos) { const d = Math.hypot(it.pos[0] - j.pos.x, it.pos[1] - j.pos.z); if (d < it.raio && d < dm) { dm = d; melhor = it; } }
  return melhor;
}

// móveis que cabem no ponto (os quadros de versículo viram um item por versículo)
function listaDoPonto(p) {
  const out = [];
  for (const m of MOVEIS) {
    if (m.comodo !== p.comodo) continue;
    const [w, d] = pegadaDoMovel(m.id);
    if (!cabe({ pegada: [w, d] }, p)) continue;
    if (m.variantes) for (let v = 0; v < m.variantes; v++) out.push({ id: m.id, variante: v, nome: `${m.nome}: “${VERSICULOS[v].texto}”` });
    else out.push({ id: m.id, nome: m.nome });
  }
  return out;
}
function pontoPerto() {
  if (!emCasa) return null;
  let melhor = null, dm = 1.7;
  for (const p of emCasa.int.pontos) {
    const [x, z] = p.pe, d = Math.hypot(x - j.pos.x, z - j.pos.z);
    if (d < dm) { dm = d; melhor = p; }
  }
  return melhor;
}
function abrirDeco(p) {
  pontoDeco = p;
  const nomes = { sala: "Sala", cozinha: "Cozinha", quarto: "Quarto", parede: "Parede" };
  deco.abrir({ titulo: `${nomes[p.comodo] ?? "Cômodo"} · escolha o móvel`, lista: listaDoPonto(p), escolha: p.escolha, paleta: CORES_MOVEL,
    dica: document.body.classList.contains("touch") ? "◀ ▶ móvel · bolinhas = cor" : "◀ ▶ móvel · ▲ ▼ cor · Enter = pronto · Esc = voltar" });
  teclas.clear(); toque?.zerar();
}
function confirmarDeco(e) {
  const p = pontoDeco; pontoDeco = null;
  if (!emCasa || !p) return;
  colocar(emCasa.int, p, e);
  const n = emCasa.c.lote.numero;
  salvo.moveis = typeof salvo.moveis === "object" && !Array.isArray(salvo.moveis) ? salvo.moveis : {};
  salvo.moveis[n] = { ...(salvo.moveis[n] ?? {}) };
  if (e) salvo.moveis[n][p.id] = e; else delete salvo.moveis[n][p.id];
  salvar(salvo);
  trocarSolidosCasa([...emCasa.int.solidos, ...solidosDosMoveis(emCasa.int)]);
  // se o móvel novo ficou em cima do Rabisco, ele dá um passinho para o lado
  if (fis.bate(j.pos.x, j.pos.z, 0.1)) { const [lx, lz] = fis.livre(j.pos.x, j.pos.z, 0.5); j.pos.x = lx; j.pos.z = lz; }
  if (e) { sons.moeda?.(); falar(e.id === "quadro-versiculo" ? `rp-versiculo-${(e.variante ?? 0) + 1}` : "rp-casa-movel"); if (e.id === "quadro-versiculo") dizer("Quadro novo", `${VERSICULOS[e.variante ?? 0].texto} (${VERSICULOS[e.variante ?? 0].ref})`, 4800); }
}
function morarAqui(c) {
  salvo.casa = c.lote.numero; salvo.corCasa = c.lote.hex;
  salvar(salvo);
  aplicarCasa();
  sons.vitoria?.();
  jogo.confete?.();
  const n = nomeCrianca();
  dizer("Rabiscolândia", n ? `Agora esta é a casa de ${n}! Que lar bonito!` : "Agora esta é a sua casa! Que lar bonito!", 4200);
  radio?.pausarPorFala(true);
  falarNome("rp-casa-pre", "rp-casa-pos").then((ok) => { if (!ok) falar("rp-casa"); }).finally(() => setTimeout(() => radio?.pausarPorFala(false), 2500));
}

// ------------------------------------------------------------------ Veículos
function pertoDeVeiculo() {
  let melhor = null, dm = Infinity;
  for (const v of veiculos) { const d = Math.hypot(v.pos.x - j.pos.x, v.pos.z - j.pos.z) - (v.tipo === "heli" ? 1.5 : Math.max(0, v.comp - 2.4)); if (d < 3.6 && v.alt < 1 && d < dm) { dm = d; melhor = v; } }
  return melhor;
}
function entrar(v) {
  if (dentro) return;
  dentro = v;
  atualizarPlaca();
  j.vel.set(0, 0, 0);
  v.g.add(rabisco.grupo); const a = v.g.userData.motorista; rabisco.grupo.position.set(a.x, a.y - 2.0 * rabisco.escala, a.z); rabisco.grupo.rotation.set(0, 0, 0);
  v.g.userData.aoEntrar?.(rabisco); // moto: põe o capacete
  v.g.userData.seta.visible = false;
  sons.pisao();
  camera.st.manual = 0;
  toque?.modo(v.tipo === "heli" ? "heli" : "carro");
  // rádio: carros, vans, caminhão e ônibus (não na bicicleta, patinete, barquinho nem helicóptero)
  if (!["heli", "bici", "patinete", "barco", "jetski", "lancha"].includes(v.tipo)) { garantirRadio(); radioUI.entrarNoCarro(); } // dentro do gesto da criança (ação/toque)
  toque?.especial(ESPECIAL[v.g.userData.especial] ?? null);
  j2?.entrar(v); // o jogador 2 vai de carona (ou correndo atrás, se não tem banco)
  if (v.tipo === "heli") {
    falar("rp-heli");
    const toqueTela = document.body.classList.contains("touch"), comControle = document.body.classList.contains("com-controle");
    dizer("Rabiscolândia", toqueTela ? "Hélices girando! ▲ sobe, ▼ desce, ➤ voa para a frente. Para sair, pouse no chão." : comControle ? "Hélices girando! A sobe, LB desce, alavanca para a frente voa. Para sair, pouse no chão." : "Hélices girando! Espaço sobe, Shift desce, W voa para a frente. Para sair, pouse no chão.", 4600);
    return;
  }
  if (v.tipo === "jetski" || v.tipo === "lancha") { // no mar não tem cinto: a dica é outra (e só uma vez)
    if (!entrar.falouMar) { entrar.falouMar = true; falar("rp-mar"); dizer(v.tipo === "jetski" ? "Jet ski" : "Lancha", "Partiu, Rabisco! Para a frente acelera, para trás freia. Encoste na areia, no píer ou na ilha para descer.", 4200); }
    return;
  }
  if (!entrar.falou) { entrar.falou = true; falar(v.tipo === "onibus" ? "rp-onibus" : "rp-carro"); dizer("Rabiscolândia", "Cinto afivelado! Para a frente acelera, para trás freia. Aperte a ação de novo para sair.", 4200); }
}
function sair() {
  const v = dentro;
  if (!v || Math.abs(v.vel) > 3) return;
  if (v.tipo === "heli" && v.alt - fis.chaoHeli(v.pos.x, v.pos.z) > 0.3) { falar("rp-heli-pousar"); dizer("Rabiscolândia", "Primeiro pouse o helicóptero: segure para descer até encostar no chão.", 2600); return; }
  const lx = Math.cos(v.ang), lz = -Math.sin(v.ang), fx = Math.sin(v.ang), fz = Math.cos(v.ang);
  const lado = v.larg + 1.3;
  const op = [[lx * lado, lz * lado], [-lx * lado, -lz * lado], [-fx * (v.comp + 1.4), -fz * (v.comp + 1.4)], [fx * (v.comp + 1.4), fz * (v.comp + 1.4)]];
  const livreSaida = op.find(([ox, oz]) => !fis.bate(v.pos.x + ox, v.pos.z + oz, 0.1));
  if (!livreSaida && v.tipo === "barco") { dizer("Barquinho", "Leve o barquinho até a beirinha do lago para descer.", 2600); return; }
  if (!livreSaida && (v.tipo === "jetski" || v.tipo === "lancha")) { dizer(v.tipo === "jetski" ? "Jet ski" : "Lancha", "Encoste na areia, no píer ou na ilha para descer.", 2600); return; }
  const [ox, oz] = livreSaida ?? op[0];
  dentro = null; v.vel = 0; v.jatoLigado = false;
  atualizarPlaca();
  radioUI?.sairDoCarro(); avisoRadio?.esconder();
  toque?.especial(null);
  cena.add(rabisco.grupo); rabisco.grupo.visible = true;
  v.g.userData.aoSair?.(rabisco); // moto: tira o capacete
  j.pos.set(v.pos.x + ox, v.tipo === "heli" ? Math.max(0.07, v.alt) : 0.07, v.pos.z + oz); j.vel.set(0, 0, 0); j.dir = v.ang;
  rabisco.grupo.position.copy(j.pos); rabisco.grupo.rotation.set(0, j.dir, 0);
  j2?.sair(v, v.pos.x - ox, v.pos.z - oz); // o jogador 2 desce do outro lado
  v.g.userData.seta.visible = true;
  sons.pisao();
  toque?.modo("pe");
}
// ------------------------------------------------------------------ Roda-gigante (Ilha da Alegria)
// O Rabisco senta na cabine que está embaixo (do tamanho de sempre) e dá uma volta inteira; a câmera mostra a cabine
// subindo e a cidade lá de baixo. Perto do chão dá para descer antes; no fim ele desce sozinho na plataforma.
let roda = null; // { i, ultimo, feito, podeDescer }
function subirRoda() {
  const S = mundo.anima.roda; if (!S || dentro || roda) return;
  let i = 0; for (let k = 1; k < RODA.cabines; k++) if (S.pivo(k).y < S.pivo(i).y) i = k;
  roda = { i, ultimo: S.giro, feito: 0, podeDescer: false };
  j.vel.set(0, 0, 0); teclas.clear(); toque?.zerar();
  sons.pisao(); falar("rp-roda");
  dizer("Roda-Gigante", "Segure firme, Rabisco! Lá de cima dá para ver a cidade inteira.", 3800);
}
function descerRoda(fim = false) {
  if (!roda) return;
  roda = null;
  camera.st.vista = null;
  j.pos.set(RODA.x, 0.07, RODA.z - 6.5); j.vel.set(0, 0, 0); j.dir = Math.PI;
  rabisco.grupo.position.copy(j.pos); rabisco.grupo.rotation.set(0, j.dir, 0);
  sons.pisao();
  if (fim) { jogo.confete?.(); sons.vitoria?.(); falar("rp-roda-fim"); dizer("Roda-Gigante", "Que passeio lindo! Deus fez um mundo muito bonito.", 3600); }
  missoes?.evento?.("roda");
}
function seguirRoda(dt) {
  const S = mundo.anima.roda, p = S.pivo(roda.i);
  roda.feito += Math.max(0, S.giro - roda.ultimo); roda.ultimo = S.giro;
  const x = RODA.x + p.x, chao = p.y + S.piso, z = RODA.z + p.z;
  j.pos.set(x, chao + 0.07, z); j.dir = Math.PI;
  rabisco.grupo.position.set(x, chao + 0.49 - 2.0 * rabisco.escala, z); rabisco.grupo.rotation.set(0, Math.PI, 0);
  const alto = p.y > RODA.h + RODA.r * 0.55;
  rabisco.atualizar(dt, { modo: alto ? "comemorarSentado" : "dirigir", virar: 0 });
  roda.podeDescer = roda.feito > 1 && p.y < RODA.h - RODA.r * 0.85;
  // câmera: um pouco ao lado e acima da cabine, olhando para o Rabisco (com a cidade atrás)
  camera.st.vista = { pos: [x + 5.5, chao + 3.6, z - 7], alvo: [x, chao + 1.1, z] };
  if (roda.feito >= Math.PI * 2) descerRoda(true);
}
// botão especial de cada veículo (pulo/A/Espaço no teclado e controle; botão próprio no toque)
const ESPECIAL = { buzina: "📯", sirene: "🚨", musica: "🎵", agua: "💧" };
function acionarEspecial(v) {
  const e = v.g.userData.especial;
  if (e === "sirene") { v.sirene = 6; for (let i = 0; i < 6; i++) setTimeout(() => tocarNotas([0, 0.45, 76, 0.5, 0.45, 71], 120, { onda: "square", vol: 0.05 }), i * 1000); dizer(v.tipo === "ambulancia" ? "Ambulância" : "Bombeiros", "Uóóó-uóóó! Abram caminho, por favor!", 2400); }
  else if (e === "musica") { tocarNotas(MUSIQUINHA, 130, { onda: "sine", vol: 0.12 }); dizer("Van de sorvete", "🎶 Olha o sorvete! Quem quer sorvete?", 2400); }
  else if (e === "agua") return; // o jato fica ligado enquanto segura
  else sons.buzina();
}
// Garagem do Rabifone: o veículo aparece do lado do Rabisco (num lugar livre a menos de 6 m)
function chamarVeiculo(tipo, cor) {
  if (dentro) { dizer("Rabifone", "Saia do veículo para chamar outro."); return null; }
  if (emCasa || emLugar) { dizer("Rabifone", "Saia para a rua para chamar um veículo: ele estaciona lá fora."); return null; }
  if (garagem) { cena.remove(garagem.g, garagem.parado); veiculos.splice(veiculos.indexOf(garagem), 1); garagem = null; }
  const v = criarVeiculo(tipo, cor);
  if (tipo === "barco") {
    const lago = [LAGO, LAGO2].find((l) => Math.hypot(l.x - j.pos.x, l.z - j.pos.z) < l.r + 14);
    if (!lago) { dizer("Rabifone", "O barquinho só anda no lago: vá ao Parque do Lago ou à Praia!"); return null; }
    if (garagem) { cena.remove(garagem.g, garagem.parado); veiculos.splice(veiculos.indexOf(garagem), 1); }
    const a = Math.atan2(j.pos.x - lago.x, j.pos.z - lago.z), r = lago.r - 3;
    const vb = criarVeiculo("barco");
    vb.pos.set(lago.x + Math.sin(a) * r, 0.03, lago.z + Math.cos(a) * r); vb.ang = a + Math.PI / 2;
    animarVeiculo(vb, 0, 0); cena.add(vb.g, vb.parado); veiculos.push(vb); garagem = vb;
    dizer("Rabifone", "O barquinho chegou na beira do lago! Chegue perto e aperte a ação.", 3000);
    return vb;
  }
  if (tipo === "jetski" || tipo === "lancha") {
    // jet ski e lancha: aparecem na água mais perto (perto da areia, do píer ou da ilha)
    let ponto = null;
    for (let r = 4; r < 30 && !ponto; r += 1) for (let a = 0; a < 6.28 && !ponto; a += 0.26) {
      const x = j.pos.x + Math.sin(a) * r, z = j.pos.z + Math.cos(a) * r;
      if (!fis.veiculoBate(v, x, z, 0, veiculos.map((o) => ({ x: o.pos.x, z: o.pos.z, raio: o.comp })))) ponto = [x, z];
    }
    if (!ponto) { dizer("Rabifone", "O jet ski e a lancha andam no mar: vá até a Praia do Mar Azul, o píer ou a ilha!"); return null; }
    v.pos.set(ponto[0], 0.03, ponto[1]); v.ang = 0;
    animarVeiculo(v, 0, 0); cena.add(v.g, v.parado); veiculos.push(v); garagem = v;
    sons.moeda?.(); falar("rp-garagem");
    dizer("Rabifone", `${tipo === "jetski" ? "O jet ski" : "A lancha"} chegou na beira da água! Chegue perto e aperte a ação.`, 3200);
    return v;
  }
  const R = tipo === "onibus" ? 4.6 : tipo === "heli" ? 5 : tipo === "bombeiro" ? 5 : 3.4, RMAX = tipo === "heli" ? 9.5 : tipo === "bombeiro" ? 8 : 5.9;
  let ponto = null;
  for (let r = R; r < RMAX && !ponto; r += 0.4) for (let a = 0; a < 6.28 && !ponto; a += 0.39) {
    const ang = j.dir + Math.PI / 2 + a, x = j.pos.x + Math.sin(ang) * r, z = j.pos.z + Math.cos(ang) * r;
    const livreAqui = tipo === "heli" ? fis.chaoHeli(x, z) < 0.5 && !fis.veiculoBate(v, x, z, j.dir, veiculos.map((o) => ({ x: o.pos.x, z: o.pos.z, raio: o.comp + 2 }))) : !fis.veiculoBate(v, x, z, j.dir, veiculos.map((o) => ({ x: o.pos.x, z: o.pos.z, raio: o.comp })));
    if (livreAqui) ponto = [x, z];
  }
  if (!ponto) { dizer("Rabifone", "Aqui está muito apertado! Vá para um lugar mais aberto, como a rua."); return null; }
  v.pos.set(ponto[0], 0.03, ponto[1]); v.ang = j.dir;
  animarVeiculo(v, 0, 0);
  cena.add(v.g, v.parado);
  veiculos.push(v);
  garagem = v;
  sons.moeda?.();
  falar("rp-garagem");
  dizer("Rabifone", tipo === "heli" ? "O helicóptero pousou do seu lado! Chegue perto e aperte a ação." : tipo === "onibus" ? "O ônibus da escola chegou! Entre e leve todo mundo para passear." : "Seu carro chegou! Chegue perto e aperte a ação para entrar.", 3600);
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
    if (dentro?.tipo === "heli") { ix += (toque.carro.dir ? 1 : 0) - (toque.carro.esq ? 1 : 0); iy += toque.carro.voar ? 1 : 0; }
    else if (dentro) { ix += (toque.carro.dir ? 1 : 0) - (toque.carro.esq ? 1 : 0); iy += (toque.carro.frente ? 1 : 0) - (toque.carro.re ? 1 : 0); }
    else { ix += toque.x; iy += toque.y; }
  }
  if (entradaTeste) { ix = entradaTeste.virar; iy = entradaTeste.acel; }
  const m = Math.hypot(ix, iy);
  if (m > 1) { ix /= m; iy /= m; }
  if (fone?.aberto || deco?.aberto || sorveteUI?.aberto) ix = iy = 0;
  return { ix, iy, m };
}
function regras() {
  // o que a ação faz agora
  contexto = null;
  if (trava) { pad.acaoNova = false; if (toque) toque.acaoNova = false; return; } // na esteira/halter a ação espera
  if (oracao) {
    const passou = relogio.elapsedTime - oracao.inicio, pode = passou > Math.min(oracao.dur * 0.6, oracao.dur - 0.3);
    contexto = pode ? { rotulo: oracao.i === ORACAO.length - 1 ? "🙏 Amém!" : "🙏 Amém, próxima", fazer: () => proximaFrase() } : { rotulo: "🙏 Orando…", fazer: () => {} };
    const quer = pad.acaoNova || toque?.acaoNova;
    pad.acaoNova = false; if (toque) { toque.acaoNova = false; toque.sairNovo = false; toque.foneNovo = false; }
    if (quer) contexto.fazer();
    return;
  }
  if (emLugar) {
    const it = interativoPerto();
    if (Math.hypot(emLugar.porta[0] - j.pos.x, emLugar.porta[1] - j.pos.z) < 1.6) contexto = { rotulo: "🚪 Sair", fazer: () => sairLugar() };
    else if (it) contexto = { rotulo: it.rotulo, fazer: () => it.fazer(apiLugar()) };
  } else if (emCasa) {
    const p = pontoPerto();
    if (Math.hypot(emCasa.int.porta[0] - j.pos.x, emCasa.int.porta[1] - j.pos.z) < 1.6) contexto = { rotulo: "🚪 Sair de casa", fazer: () => sairCasa() };
    else if (p) contexto = { rotulo: p.escolha ? "🛋️ Trocar" : "🛋️ Decorar", fazer: () => abrirDeco(p) };
  } else if (dentro) contexto = { rotulo: "🚪 Sair", fazer: sair };
  else if (roda) contexto = roda.podeDescer ? { rotulo: "🎡 Descer", fazer: () => descerRoda() } : { rotulo: "🎡 Passeando…", fazer: () => {} };
  else if ((contexto = missoes?.contexto() ?? null)) { /* missão: pedir, pegar, entregar, plantar */ }
  else if (Math.hypot(RODA.x - j.pos.x, RODA.z - 6.5 - j.pos.z) < 3.4) contexto = { rotulo: "🎡 Andar na roda-gigante", fazer: () => subirRoda() };
  else {
    const v = pertoDeVeiculo();
    const lp = mundo.lugares.find((l) => SALAS[l.id] && Math.hypot(l.x - j.pos.x, l.z - j.pos.z) < 3.2);
    const ROT = { onibus: "🚌 Dirigir", heli: "🚁 Pilotar", bici: "🚲 Pedalar", moto: "🏍️ Pilotar", patinete: "🛴 Andar", barco: "🚣 Remar", jetski: "🌊 Pilotar", lancha: "🚤 Pilotar", trator: "🚜 Dirigir", bombeiro: "🚒 Dirigir", ambulancia: "🚑 Dirigir", sorvete: "🍦 Dirigir" };
    if (v) contexto = { rotulo: ROT[v.tipo] ?? "🚗 Entrar", fazer: () => entrar(v) };
    else if (lp) contexto = { rotulo: `🚪 Entrar: ${SALAS[lp.id].nome}`, fazer: () => entrarLugar(lp.id) };
    else {
      const c = mundo.casas.find((k) => Math.hypot(k.frente[0] - j.pos.x, k.frente[1] - j.pos.z) < 4.5 || Math.hypot(k.porta[0] - j.pos.x, k.porta[1] - j.pos.z) < 3);
      if (c && c.lote.numero !== salvo.casa) contexto = { rotulo: "🏠 Morar aqui?", fazer: () => morarAqui(c) };
      else if (c) contexto = { rotulo: "🚪 Entrar em casa", fazer: () => entrarCasa(c) };
    }
  }
  j2?.regras((p) => (emCasa || emLugar ? null : missoes?.contexto(p) ?? null));
  const quer = pad.acaoNova || toque?.acaoNova || (dentro && toque?.sairNovo);
  pad.acaoNova = false; if (toque) { toque.acaoNova = false; toque.sairNovo = false; }
  if (quer && contexto) contexto.fazer();
  if (toque?.foneNovo) { toque.foneNovo = false; if (!deco.aberto) fone.abrir(); }
  if (emCasa || emLugar) return; // lá dentro não tem aviso de lugar da cidade
  // chegou num lugar novo: aviso com o nome
  for (const l of mundo.lugares) {
    const d = Math.hypot(l.x - j.pos.x, l.z - j.pos.z);
    if (d < l.raio * 0.7 && regras.ultimo !== l.id) { regras.ultimo = l.id; dizer(l.bairro || "Rabiscolândia", `${l.nome}`, 2200); }
  }
  if (alvoMapa && Math.hypot(alvoMapa.x - j.pos.x, alvoMapa.z - j.pos.z) < 5) alvoMapa = null;
}
let tMapa = 0;
const _pOnibus = new THREE.Vector3(), _pDois = new THREE.Vector3();
function posicionarCamera(k, dt, andando = false) {
  const giro = (tem("girarD") ? 1 : 0) - (tem("girarE") ? 1 : 0) + pad.gx * 1.2;
  const arrasto = toque && !dentro ? toque.girar() : 0;
  const dois = j2?.enquadrar(); // 2 jogadores a pé: a câmera mira o meio dos dois e afasta para caber
  if (oracao) { // oração: a câmera para atrás do Rabisco, olhando para a igreja (ou para a cruz)
    const fx = Math.sin(oracao.olhar), fz = Math.cos(oracao.olhar);
    camera.st.vista = { pos: [oracao.x - fx * 4.6, 2.5, oracao.z - fz * 4.6], alvo: [oracao.x + fx * 3, 1.6, oracao.z + fz * 3] };
    camera.posicionar({ P: j.pos }, k, dt);
    ceu.seguir(j.pos.x, j.pos.z);
    mundo.visibilidade(j.pos.x, j.pos.z);
    return;
  }
  if (emCasa || emLugar) { // casa de bonecas: da frente e levemente por cima (3ª pessoa inclinada), sem teto
    const cx = dois ? dois.x : j.pos.x, cz = dois ? dois.z : j.pos.z, af = dois ? Math.min(4, dois.afastar) : 0;
    camera.st.vista = { pos: [cx, 5.6 + af * 0.7, cz + 8.6 + af * 0.8], alvo: [cx, 1.1, cz - 1.2] };
    camera.posicionar({ P: j.pos }, k, dt);
    ceu.seguir(j.pos.x, j.pos.z);
    mundo.visibilidade(j.pos.x, j.pos.z);
    return;
  }
  const P = dentro?.tipo === "onibus" ? _pOnibus.set(dentro.pos.x + Math.sin(dentro.ang) * 2.6, dentro.pos.y, dentro.pos.z + Math.cos(dentro.ang) * 2.6) : dentro ? dentro.pos : dois ? _pDois.set(dois.x, dois.y, dois.z) : j.pos;
  const afastar = !dentro && dois ? dois.afastar : dentro && j2?.seguindo ? 2.5 : 0;
  camera.posicionar({ P, ref: dentro ? dentro.ang : j.dir, dirigindo: Boolean(dentro), andando, giro, arrasto, onibus: ["onibus", "ambulancia", "sorvete"].includes(dentro?.tipo), comp: dentro?.comp ?? 0, heli: dentro?.tipo === "heli", afastar }, k, dt);
  ceu.seguir(P.x, P.z);
  mundo.visibilidade(P.x, P.z);
}
function quadro() {
  if (!vivo) return;
  // aparelho lento: o tempo do jogo não fica para trás (até 8 passos de 1/30 s por quadro)
  const total = Math.min(relogio.getDelta(), 8 / 30);
  const passos = Math.max(1, Math.ceil(total / (1 / 30 + 1e-6)));
  if (!jogo.pausado) j2?.quadro();
  // celular com 2 jogadores: a criança/amigo custa ~20 chamadas de desenho; a neblina chega um pouco mais perto
  const doisToque = Boolean(j2?.ativo) && qualidade.perfil.toque;
  if (doisToque !== quadro.doisToque) { quadro.doisToque = doisToque; if (qualidade.perfil.toque) { mundo.alcance = doisToque ? 78 : 95; mundo.detalheAte = doisToque ? 28 : 35; cena.fog.far = mundo.alcance; } }
  for (let p = 0; p < passos; p++) passo(total / passos, p === passos - 1);
  estat.tj = (estat.tj ?? 0) + total; // tempo de jogo (o que os passos simularam), para os testes
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
    if (dentro?.tipo === "heli") {
      const subir = tem("pular") || pad.pulo || toque?.carro.subir || entradaTeste?.subir;
      const descer = tem("descer") || pad.descer || toque?.carro.descer || entradaTeste?.descer;
      fis.voar(dentro, { ix: ent.ix, iy: ent.iy, subir, descer }, dt);
      pad.puloNovo = false; if (toque) toque.puloNovo = false;
      j.pos.set(dentro.pos.x, dentro.alt + 0.07, dentro.pos.z); j.dir = dentro.ang;
      rabisco.atualizar(dt, { modo: "dirigir", virar: dentro.virar });
      andando = Math.abs(dentro.vel) > 1;
    } else if (dentro) {
      // sem atropelar: os moradores (e a Vovó) também são obstáculo; o veículo para antes
      const gente = moradores.filter((m) => m.p.grupo.visible).map((m) => ({ x: m.p.grupo.position.x, z: m.p.grupo.position.z, raio: 0.5 }));
      if (vovo) gente.push({ x: vovo.grupo.position.x, z: vovo.grupo.position.z, raio: 0.5 });
      if (missoes) gente.push(...missoes.obstaculos());
      if (j2?.pos && !j2.sentado) gente.push({ x: j2.pos.x, z: j2.pos.z, raio: 0.6 });
      // carro da IA NÃO entra aqui (nunca bloqueia o Rabisco): é ele que freia antes de encostar
      const outros = veiculos.filter((v) => v !== dentro).map((v) => ({ x: v.pos.x, z: v.pos.z, raio: v.comp })).concat(gente);
      if (fis.dirigir(dentro, ent, dt, outros)) { sons.batida(); navigator.vibrate?.(30); }
      const segurando = tem("pular") || pad.pulo || toque?.carro.especial || entradaTeste?.especial;
      if ((pad.puloNovo || toque?.puloNovo || toque?.especialNovo || entradaTeste?.especialNovo) && dentro.buzina <= 0) { acionarEspecial(dentro); dentro.buzina = dentro.g.userData.especial === "buzina" ? 0.8 : 1.5; if (entradaTeste) entradaTeste.especialNovo = false; }
      if (toque) toque.especialNovo = false;
      dentro.jatoLigado = dentro.g.userData.especial === "agua" && Boolean(segurando);
      dentro.buzina -= dt;
      pad.puloNovo = false; if (toque) toque.puloNovo = false;
      j.pos.set(dentro.pos.x, 0.07, dentro.pos.z); j.dir = dentro.ang;
      if (dentro.g.userData.emPe) rabisco.atualizar(dt, { modo: "parado" });
      else {
        rabisco.atualizar(dt, { modo: "dirigir", virar: dentro.virar });
        const vol = dentro.g.userData.volante;
        dentro.g.updateMatrixWorld(true);
        const mE = rabisco.bracoE.cotovelo.localToWorld(new THREE.Vector3(0, -0.82, 0)), mD = rabisco.bracoD.cotovelo.localToWorld(new THREE.Vector3(0, -0.82, 0));
        const meio = mE.clone().add(mD).multiplyScalar(0.5); dentro.g.worldToLocal(meio);
        if (vol) { vol.position.copy(meio); vol.scale.setScalar(Math.max(0.6, mE.distanceTo(mD) / 2 / 0.24)); vol.rotation.set(-1.0, 0, dentro.virar * 0.6); }
        dentro.g.userData.posar?.(rabisco, dentro); // moto: inclinado para a frente, mãos no guidão, pés nas pedaleiras
      }
      andando = Math.abs(dentro.vel) > 1;
    } else if (roda) {
      pad.puloNovo = false; if (toque) toque.puloNovo = false;
      seguirRoda(dt);
    } else if (trava) {
      pad.puloNovo = false; if (toque) toque.puloNovo = false;
      j.pos.set(trava.x, 0.07, trava.z); j.vel.set(0, 0, 0); j.dir = trava.dir;
      rabisco.grupo.position.copy(j.pos); rabisco.grupo.rotation.y = j.dir;
      rabisco.atualizar(dt, { modo: trava.modo, vel: trava.vel ?? 0, vmax: VEL });
      trava.t += dt; trava.tp -= dt;
      const f = Math.min(1, trava.t / trava.segundos);
      if (trava.pose === "halter") { // levanta o halter acima da cabeça e desce
        const k = Math.sin(f * Math.PI);
        for (const [b, s] of [[rabisco.bracoE, 1], [rabisco.bracoD, -1]]) { b.ombro.rotation.set(0, 0, s * (0.3 + k * 2.5)); b.cotovelo.rotation.x = -0.4 * (1 - k); }
        if (trava.objeto) { trava.objeto.position.set(j.pos.x + Math.sin(j.dir) * 0.15, 0.25 + k * 2.0, j.pos.z + Math.cos(j.dir) * 0.15); trava.objeto.rotation.set(0, j.dir + Math.PI / 2, 0); }
      }
      if (trava.progresso && trava.tp <= 0) { trava.tp = 0.45; trava.progresso(f); }
      if (f >= 1) { const o = trava; trava = null; if (o.objeto) o.objeto.position.y = 0.25; o.aoFim?.(); }
    } else if (oracao) {
      pad.puloNovo = false; if (toque) toque.puloNovo = false;
      j.pos.set(oracao.x, 0.07, oracao.z); j.vel.set(0, 0, 0); j.dir = oracao.olhar;
      rabisco.grupo.position.copy(j.pos); rabisco.grupo.rotation.y = j.dir;
      rabisco.atualizar(dt, { modo: "parado", vel: 0, vmax: VEL });
      seguirOracao(dt);
    } else {
      const quer = pad.puloNovo || toque?.puloNovo;
      pad.puloNovo = false; if (toque) toque.puloNovo = false;
      const { v, pulou } = fis.andar(j, { ix: ent.ix, iy: ent.iy, pular: quer, segura: pad.pulo || toque?.pulo || tem("pular") }, camera.st.yaw, dt);
      if (pulou) sons.pulo();
      rabisco.grupo.position.copy(j.pos); rabisco.grupo.rotation.y = j.dir;
      rabisco.atualizar(dt, { modo: !j.noChao ? "pular" : v > 0.6 ? "andar" : "parado", vel: v, vmax: VEL });
      andando = ent.m > 0.2 && ent.iy > -0.3;
      // carro da cidade encostando no Rabisco a pé: empurra devagar
      for (const k of transito) { const ex = j.pos.x - k.g.position.x, ez = j.pos.z - k.g.position.z, d = Math.hypot(ex, ez); if (d < 2.4 && d > 0.01 && j.pos.y < 2) { const px = j.pos.x + (ex / d) * dt * 4, pz = j.pos.z + (ez / d) * dt * 4; if (!fis.bate(px, pz, j.pos.y)) { j.pos.x = px; j.pos.z = pz; } } }
    }
    for (const v of veiculos) { if (v.tipo === "heli" && v !== dentro) fis.pararHeli(v, dt); animarVeiculo(v, dt, t); }
    atualizarSemaforos(mundo.semaforos, t);
    const alvos = [{ x: j.pos.x, z: j.pos.z, raio: dentro ? 1.6 : 0.6 }, ...(j2?.pos && !j2.sentado ? [{ x: j2.pos.x, z: j2.pos.z, raio: 0.6 }] : []), ...veiculos.filter((v) => v !== dentro && v.alt < 1.5).map((v) => ({ x: v.pos.x, z: v.pos.z, raio: v.larg }))];
    if (dentro) { alvos[0].raio = Math.max(1.0, dentro.larg); alvos[0].comp = dentro.comp; } // a IA freia antes do para-choque
    atualizarTransito(transito, mundo.semaforos, alvos, dt, t);
    for (const k of transito) k.g.visible = Math.hypot(k.g.position.x - j.pos.x, k.g.position.z - j.pos.z) < (qualidade.perfil.toque ? 60 : mundo.alcance - 20);
    // a seta "entre aqui" só aparece perto (e nunca no veículo que ele dirige)
    for (const v of veiculos) {
      const d = Math.hypot(v.pos.x - j.pos.x, v.pos.z - j.pos.z), perto = v === dentro || d < 9, aparece = v === dentro || d < mundo.alcance - 10;
      // de longe e estacionado: a versão mesclada (poucas chamadas); de perto ou dirigindo: a completa (rodas, volante, seta)
      v.g.visible = aparece && perto; v.parado.visible = aparece && !perto;
      v.g.userData.seta.visible = v !== dentro && d < 9;
    }
    j2?.passo(dt, t);
    atualizarMoradores(dt);
    missoes?.atualizar(dt, t);
    patioJE?.atualizar(j.pos.x, j.pos.z);
    mundo.atualizar(dt, t);
    if (emLugar) emLugar.atualizar(dt, t);
    saidaPelaPorta();
    regras();
    posicionarCamera(Math.min(1, dt * 6), dt, andando);
    tMapa -= dt;
    if (ultimo && tMapa <= 0) { tMapa = 0.15; if (!minimapa.hidden) desenharMapa(minimapa.getContext("2d"), 200); atualizarBussola(); atualizarBotaoAcao(); atualizarMissaoHud(); atualizarAcaoJ2(); if (!mapaGrande.hidden) desenharMapa(mapaGrande.querySelector("canvas").getContext("2d"), 640, true); }
    if (ultimo && !params.has("fixo")) qualidade.medir(t);
  }
}
const estat = { calls: 0, tris: 0, n: 0, t: 0 };

// ------------------------------------------------------------------ Pai Nosso
// O Rabisco fica parado no tapete, de mãos juntas, olhando para a igreja; a câmera para atrás dele e a luz fica mais
// suave. Cada frase aparece grande, acendendo palavra por palavra enquanto a voz fala (karaokê); depois a criança
// repete junto e aperta 🙏 (ou espera um pouquinho). Sem pressa e sem errar. O jogador 2 ora ao lado.
function duracaoFrase(i) { const d = audiosOracao?.[i]?.duration; return Number.isFinite(d) && d > 0 ? d : 0.8 + ORACAO[i].length * 0.075; }
function comecarOracao(tp, fim) {
  if (oracao || dentro) return;
  audiosOracao ??= ORACAO.map((_, i) => { const a = new Audio(`../../assets/voz/cid-pai-${i + 1}.mp3`); a.preload = "metadata"; return a; });
  teclas.clear(); toque?.zerar();
  oracao = { x: tp.x, z: tp.z, olhar: tp.olhar, i: -1, inicio: relogio.elapsedTime, dur: 2.8, luz: ceu.sol.intensity, exp: r3.toneMappingExposure, fim };
  j.pos.set(tp.x, 0.07, tp.z); j.vel.set(0, 0, 0); j.dir = tp.olhar;
  const lx = Math.cos(tp.olhar), lz = -Math.sin(tp.olhar);
  j2?.orar?.({ x: tp.x + lx * 1.3, z: tp.z + lz * 1.3, dir: tp.olhar });
  radio?.pausarPorFala(true);
  painelOracao.hidden = false;
  // a oração é com o NOME DA CRIANÇA ("Alice, vamos orar juntos."); sem nome no banco, a fala neutra gravada
  const nm = nomeCrianca();
  if (nm) oracao.dur = 5.6; // com o nome a introdução é mais longa: a 1ª frase só vem depois dela
  painelOracao.innerHTML = `<p class="frase">🙏 ${nm ? `${nm}, vamos` : "Vamos"} orar juntos.</p><p class="dica">Fique quietinho e repita comigo.</p>`;
  falarNome(null, "rp-pai-intro-pos").then((ok) => { if (!ok) falar("cid-pai-intro"); });
}
function proximaFrase() {
  if (!oracao) return;
  oracao.i++;
  if (oracao.i >= ORACAO.length) return terminarOracao(true);
  oracao.inicio = relogio.elapsedTime; oracao.dur = duracaoFrase(oracao.i);
  const palavras = ORACAO[oracao.i].split(" ");
  painelOracao.innerHTML = `<p class="frase">${palavras.map((w) => `<span>${w}</span>`).join(" ")}</p><p class="dica"></p><p class="conta">${oracao.i + 1} / ${ORACAO.length}</p>`;
  falar(`cid-pai-${oracao.i + 1}`);
}
function terminarOracao(completa) {
  if (!oracao) return;
  const o = oracao; oracao = null;
  ceu.sol.intensity = o.luz; r3.toneMappingExposure = o.exp;
  camera.st.vista = null; camera.st.yaw = o.olhar;
  painelOracao.hidden = true;
  for (const rb of [rabisco, j2?.modelo?.c?.rabisco]) if (rb) rb.tronco.rotation.x = 0;
  j2?.orar?.(null);
  setTimeout(() => radio?.pausarPorFala(false), 2500);
  if (completa) { jogo.confete?.(); sons.vitoria?.(); o.fim?.(); }
}
function seguirOracao(dt) {
  const k = Math.min(1, dt * 1.5); // luz mais suave
  ceu.sol.intensity += (oracao.luz * 0.6 - ceu.sol.intensity) * k;
  r3.toneMappingExposure += (oracao.exp * 0.92 - r3.toneMappingExposure) * k;
  // mãos juntas na frente do peito e cabeça um pouco baixa (o Rabisco e a criança do jogador 2)
  for (const rb of [rabisco, j2?.modelo?.c?.rabisco]) {
    if (!rb) continue;
    rb.bracoE.ombro.rotation.set(-0.85, 0, -0.62); rb.bracoD.ombro.rotation.set(-0.85, 0, 0.62);
    rb.bracoE.cotovelo.rotation.x = -1.05; rb.bracoD.cotovelo.rotation.x = -1.05;
    rb.tronco.rotation.x = 0.1;
  }
  const passou = relogio.elapsedTime - oracao.inicio;
  if (oracao.i >= 0) {
    const spans = painelOracao.querySelectorAll(".frase span");
    const acesas = Math.ceil(spans.length * Math.min(1, passou / (oracao.dur * 0.92)));
    spans.forEach((sp, n) => sp.classList.toggle("dita", n < acesas));
    const dica = painelOracao.querySelector(".dica");
    const txt = passou > oracao.dur ? (oracao.i === ORACAO.length - 1 ? "Amém! 🙏" : "Agora você! Repita e aperte 🙏 para seguir.") : "";
    if (dica.textContent !== txt) dica.textContent = txt;
  }
  if (passou > oracao.dur + (oracao.i < 0 ? 0.6 : ESPERA_REPETIR)) proximaFrase();
}

// ------------------------------------------------------------------ HUD: balão, botão de ação, bússola e mapa
function dizer(nome, texto, ms = 4200) {
  balao.innerHTML = `<b>${nome}</b>${texto}`;
  balao.classList.add("ativo");
  clearTimeout(dizer.t);
  dizer.t = setTimeout(() => balao.classList.remove("ativo"), ms);
}
function atualizarHud() { hud.innerHTML = `<div class="chip-rp">🏙️ Rabiscolândia</div><div class="missao-rp" hidden></div>`; }
// balãozinho rosa do jogador 2 (só quando a ação dele faz alguma coisa)
function atualizarAcaoJ2() {
  const r = j2?.acao;
  if (!r) { acaoJ2.hidden = true; return; }
  const dica = J.tecladoDividido ? "F" : "X";
  const html = `<b>🎮2</b> ${r} <kbd>${dica}</kbd>`;
  if (acaoJ2.innerHTML !== html) acaoJ2.innerHTML = html;
  acaoJ2.hidden = false;
}
// faixa da missão ativa (embaixo do nome da cidade): o que fazer agora
function atualizarMissaoHud() {
  const box = hud.querySelector(".missao-rp"), m = !emCasa && !emLugar ? missoes?.texto() : null;
  if (!m) { box.hidden = true; return; }
  const html = `<b>${m.icone} ${m.titulo}</b><span>${m.passo}</span>`;
  if (box.innerHTML !== html) box.innerHTML = html;
  box.hidden = false;
}
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
  const a = alvoMapa ?? (!emCasa && !emLugar ? missoes?.alvo() : null);
  if (!a) { bussola.hidden = true; return; }
  bussola.hidden = false;
  const ang = Math.atan2(a.x - j.pos.x, a.z - j.pos.z);
  const rel = Math.atan2(Math.sin(ang - camera.st.yaw), Math.cos(ang - camera.st.yaw));
  bussola.querySelector(".seta").style.transform = `rotate(${(-rel * 180) / Math.PI - 90}deg)`;
  bussola.querySelector(".rotulo").textContent = `${a.emoji} ${Math.round(Math.hypot(a.x - j.pos.x, a.z - j.pos.z))} m`;
}
// minimapa do canto: só aparece quando a criança pede (M, L3 do controle ou "Mapa" na ⚙️) e nunca dentro de casa ou de lugar;
// tocar nele abre o mapa grande. Com o mapa grande aberto, o pedido fecha o grande.
function aplicarMinimapa() { if (minimapa) minimapa.hidden = !mapaLigado || Boolean(emCasa || emLugar); }
function alternarMinimapa(ligar = null) {
  mapaLigado = ligar === null ? !mapaLigado : ligar;
  aplicarMinimapa();
  if (!minimapa.hidden) desenharMapa(minimapa.getContext("2d"), 200);
}
function mapaPedido() {
  if (!vivo) return;
  if (!mapaGrande.hidden) alternarMapa(false); else alternarMinimapa();
}
Engrenagem.extra({ id: "mapa", ic: "🗺️", texto: "Mapa", sub: "Mostrar ou esconder o mapa", mostrar: () => vivo, acao: () => mapaPedido() });
function alternarMapa(abrir = null) {
  mapaGrande.hidden = abrir === null ? !mapaGrande.hidden : !abrir;
  if (!mapaGrande.hidden) desenharMapa(mapaGrande.querySelector("canvas").getContext("2d"), 640, true);
}
// o que não muda no mapa (chão, água, prédios, ruas e lugares) é desenhado uma vez só por tamanho, num canvas à parte
// (a cidade dobrou: redesenhar tudo a cada 0,15 s pesava); por cima vão as casas, os veículos, o alvo e o Rabisco
const fundosMapa = new Map();
function fundoDoMapa(S, nomes) {
  const chave = `${S}|${nomes}`;
  if (fundosMapa.has(chave)) return fundosMapa.get(chave);
  const tela = document.createElement("canvas"); tela.width = tela.height = S;
  const c = tela.getContext("2d");
  const k = S / ((BORDA + 8) * 2);
  const P = (x, z) => [S / 2 + x * k, S / 2 + z * k];
  c.fillStyle = "#7ccf52"; c.fillRect(0, 0, S, S);
  c.fillStyle = "#5fb83f"; for (const A of [PARQUE, FAZENDA]) { const [x0, z0] = P(A.x0, A.z0); c.fillRect(x0, z0, (A.x1 - A.x0) * k, (A.z1 - A.z0) * k); }
  c.fillStyle = "#f3dca0"; { const [x0, z0] = P(PRAIA.x0, PRAIA.z0); c.fillRect(x0, z0, (PRAIA.x1 - PRAIA.x0) * k, (PRAIA.z1 - PRAIA.z0) * k); }
  c.fillStyle = "#3fb6f5"; for (const L of [LAGO, LAGO2]) { c.beginPath(); c.arc(...P(L.x, L.z), L.r * k, 0, 7); c.fill(); }
  // orla do Mar Azul: areia, mar, a Ilha da Alegria (com a roda-gigante) e os píeres
  c.fillStyle = "#f3dca0"; { const [x0, z0] = P(-BORDA - 8, ORLA.z0); c.fillRect(x0, z0, S, (ORLA.z1 - ORLA.z0) * k); }
  c.fillStyle = "#3fa9ef"; { const [x0, z0] = P(-BORDA - 8, MAR.costa); c.fillRect(x0, z0, S, S); }
  c.fillStyle = "#f3dca0"; c.beginPath(); c.arc(...P(ILHA.x, ILHA.z), ILHA.r * k, 0, 7); c.fill();
  c.fillStyle = "#7ccf52"; c.beginPath(); c.arc(...P(ILHA.x, ILHA.z), (ILHA.r - 8) * k, 0, 7); c.fill();
  c.fillStyle = "#b07a45"; for (const pi of PIERS) { const [x0, z0] = P(pi.x0, pi.z0); c.fillRect(x0, z0, Math.max(1.5, (pi.x1 - pi.x0) * k), (pi.z1 - pi.z0) * k); }
  c.strokeStyle = "#ec2e8c"; c.lineWidth = Math.max(1.5, S / 260); c.beginPath(); c.arc(...P(RODA.x, RODA.z - 2), Math.max(3, RODA.r * k * 0.8), 0, 7); c.stroke();
  c.fillStyle = "#3a3f4c"; c.beginPath(); c.arc(...P(HELIPONTO.x, HELIPONTO.z), HELIPONTO.r * k, 0, 7); c.fill();
  c.fillStyle = "rgba(255,248,235,0.9)";
  for (const s of mundo.solidos) if (s.y1 > 8 && Math.abs(s.z0) < BORDA + 10 && s.x1 - s.x0 > 5) { const [x0, z0] = P(s.x0, s.z0); c.fillRect(x0, z0, (s.x1 - s.x0) * k, (s.z1 - s.z0) * k); }
  c.lineCap = c.lineJoin = "round";
  for (const [extra, cor] of [[6, "#efe4d0"], [0, "#5b6170"]]) for (const r of RUAS) {
    c.beginPath(); r.pts.forEach((p, i) => (i ? c.lineTo(...P(...p)) : c.moveTo(...P(...p)))); if (r.fechada) c.closePath();
    c.lineWidth = (r.w + extra) * k; c.strokeStyle = cor; c.stroke();
  }
  c.fillStyle = "#e8e2d6"; for (const pc of [PRACA, ...PRACAS_NOVAS]) { c.beginPath(); c.arc(...P(pc.x, pc.z), pc.r * k, 0, 7); c.fill(); }
  for (const l of LUGARES) {
    const [x, y] = P(l.x, l.z);
    c.fillStyle = l.parceiro ? "#ffcc1f" : "#ffffff"; c.strokeStyle = "#151515"; c.lineWidth = Math.max(1, S / 200);
    c.beginPath(); c.arc(x, y, S / 70, 0, 7); c.fill(); c.stroke();
    if (nomes) { c.font = `800 ${Math.round(S / 46)}px 'Baloo 2', sans-serif`; c.textAlign = "center"; c.lineWidth = 4; c.strokeStyle = "#fff"; c.strokeText(l.nome, x, y - S / 50); c.fillStyle = "#151515"; c.fillText(l.nome, x, y - S / 50); }
  }
  if (document.fonts?.status !== "loading") fundosMapa.set(chave, tela); // com a fonte carregada (os nomes)
  return tela;
}
function desenharMapa(c, S, nomes = false) {
  const k = S / ((BORDA + 8) * 2);
  const P = (x, z) => [S / 2 + x * k, S / 2 + z * k];
  c.clearRect(0, 0, S, S);
  c.drawImage(fundoDoMapa(S, nomes), 0, 0);
  for (const L of LOTES) {
    const [x, y] = P(L.x, L.z); const minha = L.numero === salvo.casa;
    c.font = `${Math.round(S / (minha ? 18 : 30))}px 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(minha ? "🏠" : "⌂", x, y); c.textBaseline = "alphabetic";
  }
  for (const v of veiculos) { const [x, y] = P(v.pos.x, v.pos.z); c.save(); c.translate(x, y); c.rotate(Math.PI - v.ang); c.fillStyle = `#${new THREE.Color(v.cor ?? 0xffcc1f).getHexString()}`; c.strokeStyle = "#151515"; c.lineWidth = 1.5; const w = S / 60, h = S / (v.tipo === "onibus" ? 22 : 34); c.fillRect(-w / 2, -h / 2, w, h); c.strokeRect(-w / 2, -h / 2, w, h); c.restore(); }
  const am = !emCasa && !emLugar && !alvoMapa ? missoes?.alvo() : null;
  if (am) { const [x, y] = P(am.x, am.z); c.fillStyle = "#ffcc1f"; c.strokeStyle = "#151515"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, S / 45 + Math.sin(relogio.elapsedTime * 6) * 1.5, 0, 7); c.fill(); c.stroke(); }
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
  get vivo() { return vivo; }, get mapaLigado() { return mapaLigado; }, mapaPedido, Engrenagem, get placa() { return placaNome ? { visivel: placaNome.sprite.visible, nome: placaNome.nome, y: placaNome.sprite.position.y } : null; }, get tempo() { return estat.tj ?? 0; }, get fis() { return fis; },
  get modo() { return emCasa ? "casa" : emLugar ? "lugar" : dentro ? "veiculo" : "rua"; },
  get emLugar() { return emLugar ? { id: emLugar.id, est: emLugar.est, interativos: emLugar.interativos.map((i) => ({ id: i.id, rotulo: i.rotulo, pos: i.pos })) } : null; },
  get sorveteUI() { return sorveteUI; },
  entrarLugar(id) { if (dentro) sair(); if (emCasa) sairCasa(true); entrarLugar(id, true); },
  sairLugar() { sairLugar(true); },
  irAoInterativo(iid) { const it = emLugar.interativos.find((i) => i.id === iid); j.pos.set(it.pos[0], 0.07, it.pos[1]); j.vel.set(0, 0, 0); },
  get profissao() { return rabisco.profissao ?? null; },
  posVeiculo(i, x, z, ang) { const v = veiculos[i]; v.pos.set(x, v.pos.y, z); v.ang = ang; v.vel = 0; animarVeiculo(v, 0, 0); if (dentro === v) j.pos.set(x, 0.07, z); },
  especial(segurar = true) { entradaTeste = { acel: entradaTeste?.acel ?? 0, virar: entradaTeste?.virar ?? 0, especial: segurar, especialNovo: segurar }; },
  get emCasa() { return emCasa ? { numero: emCasa.c.lote.numero, planta: emCasa.int.id, pontos: emCasa.int.pontos.map((p) => ({ id: p.id, comodo: p.comodo, escolha: p.escolha, mundo: p.mundo, parede: Boolean(p.parede) })) } : null; },
  get deco() { return deco; },
  entrarCasa(n = salvo.casa) { const c = mundo.casas.find((k) => k.lote.numero === n); if (dentro) sair(); entrarCasa(c, true); },
  sairCasa() { sairCasa(true); },
  irAoPonto(id) { const p = emCasa.int.pontos.find((q) => q.id === id); j.pos.set(p.pe[0], 0.07, p.pe[1]); j.vel.set(0, 0, 0); },
  decorar(id, escolha) { pontoDeco = emCasa.int.pontos.find((q) => q.id === id); confirmarDeco(escolha); },
  lista(id) { return listaDoPonto(emCasa.int.pontos.find((q) => q.id === id)); },
  verificar: (id) => verificar(id), plantas: () => Object.keys(PLANTAS),
  memoria() { return { ...r3.info.memory }; },
  // geometrias ainda ligadas à cena (as que saíram da cena precisam ter sido liberadas: senão é vazamento)
  geometriasNaCena() { const g = new Set(); cena.traverse((o) => { if (o.geometry) g.add(o.geometry); }); return g.size; },
  corCasa(hex) { trocarCorCasa(hex); },
  get corParedes() { const c = mundo.casas.find((k) => k.lote.numero === salvo.casa); return c?.grupo.userData.paredes.userData.cor; },
  get radio() { return radio; }, get radioUI() { return radioUI; }, get avisoRadio() { return avisoRadio; }, falar: (k) => falar(k),
  get missoes() { return missoes; }, get patioJE() { return patioJE; },
  get roda() { return roda ? { ...roda, y: j.pos.y } : null; }, subirRoda: () => subirRoda(), descerRoda: () => descerRoda(),
  get trava() { return trava ? { pose: trava.pose ?? null, t: trava.t } : null; },
  get oracao() { return oracao ? { i: oracao.i, total: ORACAO.length, painel: !painelOracao.hidden, texto: painelOracao.textContent } : null; },
  proximaFrase: () => proximaFrase(),
  get j2() { return j2; }, get dois() { return Boolean(j2?.ativo); }, get Jogadores() { return J; },
  // as duas pessoas aparecem na tela? (projeção dentro do quadro)
  get naTela() { const ps = [rabisco.grupo, j2?.modelo?.grupo].filter(Boolean); return ps.map((g) => { const v = new THREE.Vector3(); g.getWorldPosition(v); v.y += 1; v.project(cam); return Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1; }); },
  luzPedestreVerde: (s, eixo) => luzDe(s, eixo, relogio.elapsedTime) === "vermelho",
  get r3() { return r3; }, get cena() { return cena; }, get cam() { return cam; }, get rabisco() { return rabisco; }, get vovo() { return vovo; },
  // desenha um quadro agora e devolve o custo (com e sem o passe de sombra)
  medir() { r3.render(cena, cam); const a = { calls: r3.info.render.calls, tris: r3.info.render.triangles }; const s = ceu.sol.castShadow; ceu.sol.castShadow = false; r3.shadowMap.needsUpdate = true; r3.render(cena, cam); const b = { calls: r3.info.render.calls, tris: r3.info.render.triangles }; ceu.sol.castShadow = s; return { total: a, semSombra: b }; },
  ir(x, z) { if (dentro) sair(); j.pos.set(x, 0.07, z); j.vel.set(0, 0, 0); posicionarCamera(1, 0); },
  get camYaw() { return camera.st.yaw; }, // o "para a frente" do andar (fisica.andar); os testes de andar de verdade leem
  olhar(yaw) { camera.st.yaw = yaw; camera.st.manual = 5; posicionarCamera(1, 0); },
  vista(pos, alvo, neblina = true) { camera.st.vista = pos ? { pos, alvo } : null; const longe = pos && !neblina; mundo.alcance = longe ? 2000 : qualidade.perfil.toque ? (quadro.doisToque ? 78 : 95) : 140; cena.fog.far = longe ? 2000 : mundo.alcance; cena.fog.near = longe ? 1500 : 60; if (pos) mundo.visibilidade(alvo[0], alvo[2]); if (pos && !neblina) mundo.blocos.forEach((b) => (b.visible = true)); posicionarCamera(1, 0); },
  acao() { pad.acaoNova = true; },
  entrar(i = 0) { const v = veiculos[i]; if (dentro) sair(); j.pos.set(v.pos.x + 2, 0.07, v.pos.z); entrar(v); },
  sair() { if (dentro) dentro.vel = 0; sair(); },
  volante(acel, virar = 0, extra = {}) { entradaTeste = acel == null ? null : { acel, virar, ...extra }; },
  voar(subir, descer = false) { entradaTeste = { acel: entradaTeste?.acel ?? 0, virar: entradaTeste?.virar ?? 0, subir, descer }; },
  get chaoHeli() { return (x, z) => fis.chaoHeli(x, z); },
  garagem(tipo = "carro", cor = 0xff7a00) { const v = chamarVeiculo(tipo, cor); return v ? Math.hypot(v.pos.x - j.pos.x, v.pos.z - j.pos.z) : null; },
  hora(h) { ceu.hora(h); },
  dentroDeSolido(x, z) { return fis.bate(x, z, 0.5, 0); },
  casaFrente(n) { const c = mundo.casas.find((k) => k.lote.numero === n); return c.frente; },
};
