// Rabiscolândia: o Sítio Floresça, Escola de Campo Educarte, da Tia Regina (parceira "sitio-floresca"). Um terreno GRANDE no
// canto sudoeste (56 × 138 m), inventado a partir das fotos do lugar (nenhuma foto vai para o jogo):
//  - portão de tela com moldura metálica entre palanques de madeira, cerca de tela em volta, a porteira com a placa
//    "Escola de Campo Educarte · Sítio Floresça · Festas e eventos", a placa do @ e a CAMPAINHA do lado do portão;
//  - a casa grande de tijolinho à esquerda da estradinha (telha escura, janelas e venezianas escuras, lambrequim de
//    madeira no beiral, caixinha de madeira no oitão, calçada lateral) e o galinheiro;
//  - a estradinha de cascalho atravessando o gramado até os fundos: o celeiro de tábuas com as portas amarelas e as
//    mansardas, e a varanda comprida de treliça em losango (onde acontecem as aulas), com o coração vazado no oitão;
//  - o lago cercado (palanques e tela, com o portãozinho), a grama alta na beira, o pinheiro alto, palmeiras e a mata;
//  - quem mora lá: a Tia Regina (pessoas.js; não fala), o Duck (golden bem arteiro) e a pata Ale, com os patos e as galinhas.
// Convenção das fachadas (predios-parceiros.js): frente (o portão) em z = 0 olhando para +z; coordenadas de sitio-dados.js.
//
// Custo: tudo o que é fixo entra na mesclagem do bloco (caixas lisas numa malha só por bloco, mais um material para cada
// textura: tijolo, tábua, treliça, tela e a placa). O que se mexe (portão, Tia Regina, Duck, Ale, patos, galinhas e as
// gotinhas) fica num grupo à parte, e só anima com o Rabisco perto. A água do lago é uma malha só.
//
//   FACHADA: sitioFloresca(l) → { grupo, solidos, porta, topo, vivo }   (mundo.js chama vivo({ origem, solidos, lugar }))
//   api (mundo.sitio): ligar(ctx) · atualizar(dt, t, pos) · contexto(pos, noVeiculo) · e o que as cenas "ale" e "duck"
//   (missoes-cenas.js) usam para mexer na Ale, no Duck e na Tia Regina.

import { THREE, mat, matNovo, MAT_LAGO, texturaCanvas, arvoreReal, mesclar } from "./base3d.js";
import { cx as pc, claro, escuro, disco } from "./blocos.js";
import { coqueiro } from "./predios.js";
import { desenharLetreiro } from "../../src/parceiros-arte.js";
import { placaInstagram } from "./placas-instagram.js";
import { criarPessoa } from "./pessoas.js";
import { SITIO, FALAS_SITIO } from "./sitio-dados.js";

const F = { sombra: false };
const D_ = { sombra: false, detalhe: true };
const MISSAO_ALE = "parceiro-sitio-floresca", MISSAO_DUCK = "parceiro-sitio-floresca-duck";

// ------------------------------------------------------------------ texturas (1 m por repetição: o uv vai em metros)
let T = null;
function texturas() {
  if (T) return T;
  const rep = (px, f) => { const t = texturaCanvas(px, px, f, { repetir: true }); return t; };
  const tijolo = rep(256, (c, w) => { // 8 fiadas por metro, 4 tijolos por fiada, juntas claras
    c.fillStyle = "#d9c9ae"; c.fillRect(0, 0, w, w);
    const cores = ["#b4552f", "#c2643a", "#a84a2a", "#b95e35", "#9f4628"];
    for (let r = 0; r < 8; r++) for (let i = -1; i < 5; i++) { const x = i * 64 + (r % 2) * 32; c.fillStyle = cores[(r * 7 + i * 3 + 20) % cores.length]; c.fillRect(x + 2, r * 32 + 2, 60, 28); }
  });
  const tabua = rep(256, (c, w) => { // tábuas verticais de 12,5 cm, com veio e fresta escura
    const cores = ["#9a7350", "#8c6646", "#a57c57", "#93704d"];
    for (let i = 0; i < 8; i++) { c.fillStyle = cores[(i * 3) % 4]; c.fillRect(i * 32, 0, 32, w); c.fillStyle = "rgba(60,38,20,0.25)"; for (let k = 0; k < 3; k++) c.fillRect(i * 32 + 6 + k * 9, ((i * 53 + k * 71) % 200), 2, 40); c.fillStyle = "#4e3520"; c.fillRect(i * 32, 0, 3, w); }
  });
  const trelica = rep(128, (c, w) => { // treliça de madeira em losango: furos vazados (alpha)
    c.clearRect(0, 0, w, w); c.strokeStyle = "#c9a46a"; c.lineWidth = 11; c.lineCap = "square";
    for (let k = -w; k <= w * 2; k += 64) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + w, w); c.stroke(); c.beginPath(); c.moveTo(k, w); c.lineTo(k + w, 0); c.stroke(); }
    c.strokeStyle = "rgba(120,84,40,0.6)"; c.lineWidth = 2;
    for (let k = -w; k <= w * 2; k += 64) { c.beginPath(); c.moveTo(k + 5, 0); c.lineTo(k + w + 5, w); c.stroke(); }
  });
  const tela = rep(128, (c, w) => { // tela de arame: quadradinhos de 25 cm
    c.clearRect(0, 0, w, w); c.strokeStyle = "#a9b1b6"; c.lineWidth = 3;
    for (let k = 0; k <= w; k += 32) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, w); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(w, k); c.stroke(); }
  });
  T = {
    tijolo: matNovo({ map: tijolo }),
    tabua: matNovo({ map: tabua }),
    trelica: matNovo({ map: trelica, alphaTest: 0.5, side: THREE.DoubleSide }),
    tela: matNovo({ map: tela, alphaTest: 0.35, side: THREE.DoubleSide }),
  };
  return T;
}
// plano com o uv em metros (k = metros por repetição), olhando para +z antes do giro ry
function plano(g, material, w, h, x, y, z, ry = 0, k = 1) {
  const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / k, (uv.getY(i) * h) / k);
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; m.castShadow = false; g.add(m);
  return m;
}
// triângulo do oitão (base no chão do telhado, ponta em cima), com uv em metros
function oitao(g, material, base, alt, x, y, z, ry = 0) {
  const sh = new THREE.Shape(); sh.moveTo(-base / 2, 0); sh.lineTo(base / 2, 0); sh.lineTo(0, alt); sh.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), material); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; g.add(m);
  return m;
}
// coração (vazado: escuro), de frente para +z
function coracao(g, s, cor, x, y, z, ry = 0) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -s * 0.5); sh.bezierCurveTo(s * 0.6, -s * 0.05, s * 0.55, s * 0.5, 0, s * 0.22); sh.bezierCurveTo(-s * 0.55, s * 0.5, -s * 0.6, -s * 0.05, 0, -s * 0.5);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 6), mat(cor)); m.position.set(x, y, z); m.rotation.y = ry; g.add(m);
}
// telhado de duas águas com a cumeeira ao longo de z (eixo "z") ou de x (eixo "x"). Os beirais descem na mesma inclinação
// (a água encosta no topo da parede, sem vão) · retorna a inclinação (altura por metro)
function telhado(g, { x0, x1, z0, z1, h, cume, ov = 0.5, cor, eixo = "z", fileiras = true, frente = null }) {
  const larg = eixo === "z" ? x1 - x0 : z1 - z0, comp = (eixo === "z" ? z1 - z0 : x1 - x0) + ov * 2, meia = larg / 2, s = cume / meia;
  const xm = (x0 + x1) / 2, zm = (z0 + z1) / 2, cm = eixo === "z" ? xm : zm;
  for (const lado of [-1, 1]) {
    const run = meia + (lado > 0 && frente != null ? frente : ov); // frente: a água da frente vai mais longe (cobre a varanda)
    const L = Math.hypot(run, run * s), ang = Math.atan(s);
    const meio = cm + lado * (run / 2), ym = h + cume - (run * s) / 2;
    if (eixo === "z") pc(g, L + 0.02, 0.18, comp, cor, meio, ym, zm, { rz: lado * -ang });
    else pc(g, comp, 0.18, L + 0.02, cor, xm, ym, meio, { rx: lado * ang });
    if (fileiras) for (let k = 0.45; k < L - 0.1; k += 0.5) { // fileiras de telha: ripinhas mais escuras
      const d = k, px = cm + lado * (d * Math.cos(ang)), py = h + cume - d * Math.sin(ang) + 0.1;
      if (eixo === "z") pc(g, 0.06, 0.05, comp, escuro(cor, 0.8), px, py, zm, { ...F, rz: lado * -ang });
      else pc(g, comp, 0.05, 0.06, escuro(cor, 0.8), xm, py, px, { ...F, rx: lado * ang });
    }
  }
  // cumeeira
  if (eixo === "z") pc(g, 0.34, 0.2, comp, escuro(cor, 0.75), xm, h + cume + 0.06, zm, F); else pc(g, comp, 0.2, 0.34, escuro(cor, 0.75), xm, h + cume + 0.06, zm, F);
  return s;
}
// janela de moldura escura com as duas venezianas abertas, numa parede que olha para ry (0 = +z)
function janela(g, x, y, z, ry, { w = 1.1, h = 1.2, moldura = 0x2d2622, veneziana = 0x3b2c24 } = {}) {
  const j = new THREE.Group(); j.position.set(x, y, z); j.rotation.y = ry; g.add(j);
  pc(j, w, h, 0.06, 0x24313a, 0, 0, 0.02, F); // vidro escuro
  pc(j, w + 0.2, 0.12, 0.12, moldura, 0, h / 2 + 0.06, 0.05, F); pc(j, w + 0.3, 0.1, 0.22, moldura, 0, -h / 2 - 0.05, 0.08, F);
  for (const s of [-1, 1]) pc(j, 0.1, h, 0.12, moldura, s * (w / 2 + 0.05), 0, 0.05, F);
  pc(j, 0.06, h, 0.08, moldura, 0, 0, 0.06, F);
  for (const s of [-1, 1]) {
    pc(j, w * 0.5, h + 0.06, 0.05, veneziana, s * (w * 0.78 + 0.08), 0, 0.06, F);
    for (let k = -h / 2 + 0.12; k < h / 2; k += 0.14) pc(j, w * 0.46, 0.035, 0.03, claro(veneziana, 0.12), s * (w * 0.78 + 0.08), k, 0.095, D_);
  }
}
// palanque de madeira (poste da cerca)
const palanque = (g, x, z, h = 1.7, e = 0.14, cor = 0x8a6440) => pc(g, e, h, e, cor, x, h / 2, z, F);

// ------------------------------------------------------------------ bichos de blocos (cada parte vira UMA malha)
function parte(g, lista, x = 0, y = 0, z = 0) {
  const p = new THREE.Group(); p.position.set(x, y, z); g.add(p);
  for (const [w, h, d, cor, px, py, pz, rx = 0, ry = 0, rz = 0] of lista) pc(p, w, h, d, cor, px, py, pz, { sombra: false, rx, ry, rz });
  mesclar(p);
  return p;
}
// pato: branco de bico laranja (a Ale) ou marrom (os outros do lago). Frente em +z
function pato(branco = true) {
  const g = new THREE.Group();
  const C = branco ? 0xfbfbf6 : 0x8a6a48, CL = branco ? 0xe9e9e2 : 0x6f5238, B = 0xff9a1f, cabeca = branco ? C : 0x2f7a4a;
  parte(g, [
    [0.4, 0.3, 0.62, C, 0, 0.28, 0], [0.32, 0.22, 0.2, C, 0, 0.36, -0.36, -0.5], [0.06, 0.2, 0.42, CL, 0.2, 0.3, -0.02], [0.06, 0.2, 0.42, CL, -0.2, 0.3, -0.02],
    [0.18, 0.34, 0.18, C, 0, 0.5, 0.25, -0.25], [0.26, 0.24, 0.3, cabeca, 0, 0.72, 0.32], [0.16, 0.06, 0.2, B, 0, 0.66, 0.53], [0.14, 0.04, 0.16, escuro(B, 0.85), 0, 0.62, 0.5],
    [0.045, 0.06, 0.03, 0x151515, 0.13, 0.76, 0.4], [0.045, 0.06, 0.03, 0x151515, -0.13, 0.76, 0.4],
    [0.06, 0.14, 0.06, B, 0.1, 0.08, 0.02], [0.06, 0.14, 0.06, B, -0.1, 0.08, 0.02], [0.14, 0.03, 0.18, B, 0.1, 0.015, 0.06], [0.14, 0.03, 0.18, B, -0.1, 0.015, 0.06],
    ...(branco ? [] : [[0.2, 0.05, 0.2, 0xf4f4f0, 0, 0.6, 0.27]]),
  ]);
  return g;
}
function galinha(cor) {
  const g = new THREE.Group();
  parte(g, [
    [0.32, 0.3, 0.42, cor, 0, 0.32, 0], [0.12, 0.3, 0.2, escuro(cor, 0.85), 0, 0.46, -0.24, -0.4], [0.18, 0.22, 0.18, cor, 0, 0.56, 0.2],
    [0.08, 0.1, 0.1, 0xe2342b, 0, 0.71, 0.21], [0.06, 0.08, 0.04, 0xe2342b, 0, 0.47, 0.3], [0.08, 0.05, 0.1, 0xf2b632, 0, 0.56, 0.33],
    [0.04, 0.05, 0.03, 0x151515, 0.09, 0.6, 0.25], [0.04, 0.05, 0.03, 0x151515, -0.09, 0.6, 0.25],
    [0.05, 0.18, 0.05, 0xf2b632, 0.07, 0.09, 0], [0.05, 0.18, 0.05, 0xf2b632, -0.07, 0.09, 0],
  ]);
  return g;
}
// o Duck, golden retriever: pelo dourado-avermelhado (caramelo/cobre), creme no peito, embaixo da cauda e nas "calças" de
// trás; orelhas caídas peludas, cauda em pluma, focinho mais avermelhado, nariz preto e olhos castanho-escuros.
// Partes que se mexem: cabeça, cauda e as quatro patas (7 malhas, um material; molhado = o mesmo, mais escuro)
const DOURADO = 0xdc8f3c, COBRE = 0xc4722f, CREME = 0xf5ddb0, ORELHA = 0xbd6a2a;
function cachorro() {
  const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
  parte(corpo, [
    [0.44, 0.4, 0.96, DOURADO, 0, 0.66, 0], [0.4, 0.12, 0.8, claro(DOURADO, 0.12), 0, 0.88, -0.02], // costas
    [0.36, 0.38, 0.16, CREME, 0, 0.6, 0.5], [0.3, 0.12, 0.5, CREME, 0, 0.44, 0.12], // peito e barriga
    [0.12, 0.26, 0.24, CREME, 0.19, 0.52, -0.38], [0.12, 0.26, 0.24, CREME, -0.19, 0.52, -0.38], // calças de trás
    [0.32, 0.32, 0.3, DOURADO, 0, 0.88, 0.48, -0.35], [0.3, 0.2, 0.12, CREME, 0, 0.74, 0.6, -0.35], // pescoço com a juba clara
    [0.46, 0.1, 0.5, escuro(DOURADO, 0.92), 0, 0.5, -0.12], // pelo comprido caindo embaixo da barriga
  ]);
  const cab = parte(corpo, [
    [0.38, 0.34, 0.38, DOURADO, 0, 0.1, 0.08], [0.4, 0.1, 0.36, claro(DOURADO, 0.14), 0, 0.28, 0.06], // cabeça
    [0.24, 0.18, 0.26, COBRE, 0, -0.02, 0.33], [0.12, 0.08, 0.07, 0x151515, 0, 0.05, 0.47], // focinho e nariz
    [0.06, 0.07, 0.03, 0x2a160c, 0.1, 0.16, 0.27], [0.06, 0.07, 0.03, 0x2a160c, -0.1, 0.16, 0.27], [0.025, 0.025, 0.02, 0xffffff, 0.115, 0.18, 0.285], [0.025, 0.025, 0.02, 0xffffff, -0.085, 0.18, 0.285],
    [0.09, 0.32, 0.2, ORELHA, 0.22, -0.02, 0.04, 0, 0, -0.12], [0.09, 0.32, 0.2, ORELHA, -0.22, -0.02, 0.04, 0, 0, 0.12], // orelhas caídas
    [0.1, 0.12, 0.16, claro(ORELHA, 0.15), 0.23, -0.2, 0.05], [0.1, 0.12, 0.16, claro(ORELHA, 0.15), -0.23, -0.2, 0.05],
    [0.1, 0.025, 0.12, 0xf07a8a, 0, -0.12, 0.38], // linguinha
  ], 0, 1.0, 0.58);
  const cauda = parte(corpo, [
    [0.14, 0.14, 0.3, DOURADO, 0, 0.06, -0.14, 0.55], [0.18, 0.12, 0.3, claro(DOURADO, 0.1), 0, 0.22, -0.36, 0.85],
    [0.14, 0.08, 0.42, CREME, 0, 0.1, -0.3, 0.7], [0.12, 0.1, 0.22, CREME, 0, 0.34, -0.52, 1.1], // a pluma, clarinha embaixo
  ], 0, 0.8, -0.46);
  const pernas = [[0.15, 0.36, 1], [-0.15, 0.36, 1], [0.15, -0.36, 0], [-0.15, -0.36, 0]].map(([x, z, frente]) => parte(corpo, [
    [0.13, 0.5, 0.14, DOURADO, 0, -0.24, 0], [0.15, 0.07, 0.19, claro(DOURADO, 0.08), 0, -0.47, 0.03],
    ...(frente ? [[0.05, 0.3, 0.1, CREME, 0, -0.2, -0.08]] : [[0.16, 0.22, 0.12, CREME, 0, -0.12, -0.08]]),
  ], x, 0.5, z));
  return { g, corpo, cab, cauda, pernas };
}

// ------------------------------------------------------------------ a fachada: o sítio inteiro
export function sitioFloresca() {
  const S = { grupo: new THREE.Group(), solidos: [] }, g = S.grupo, M = texturas(), Q = SITIO;
  const W2 = Q.W / 2, D = Q.D;
  const sol = (x0, x1, z0, z1, y1 = 3) => { const s = { x0, x1, z0, z1, y1 }; S.solidos.push(s); return s; };
  const MAD = 0x8a6440, MADE = 0x6b4a2e, METAL = 0xc9ced4;

  // ---- chão: a estradinha de cascalho (de fora da cerca até o celeiro), manchas de terra e o caminho até a casa
  const E = Q.estrada;
  pc(g, E.larg, 0.05, -E.z1 + 1.5, 0xb3a07c, 0, 0.035, (E.z1 + 1.5) / 2, F);
  for (let z = -2; z > E.z1 + 1; z -= 3.7) pc(g, 0.7 + ((z * 7) % 3 + 3) % 3 * 0.3, 0.02, 1.1, 0xc9b892, ((z * 13) % 2) * 0.6, 0.065, z, D_);
  pc(g, 8.2, 0.04, 1.4, 0xb3a07c, -6.6, 0.03, -22, F); // trilha até a calçada da casa
  for (const [x, z, w, d] of [[12, -30, 2.2, 1.4], [18, -70, 1.6, 1.2], [-4, -48, 1.8, 1.0], [8, -84, 2.4, 1.2], [-14, -76, 1.4, 1.0], [22, -18, 1.2, 1.6]]) pc(g, w, 0.02, d, 0x8f7a58, x, 0.03, z, D_);

  // ---- cerca de tela com palanques em volta do terreno (o portão fica em x = ±2,2)
  const PM = Q.portao.meia, TH = 1.45;
  const lados = [ // [x0, z0, x1, z1]
    [-W2, 0, -PM - 0.25, 0], [PM + 0.25, 0, W2, 0], [W2, 0, W2, -D], [-W2, 0, -W2, -D], [-W2, -D, W2, -D],
  ];
  for (const [x0, z0, x1, z1] of lados) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 3)), ry = Math.atan2(-(z1 - z0), x1 - x0);
    for (let i = 0; i <= n; i++) palanque(g, x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n);
    plano(g, M.tela, L, TH, (x0 + x1) / 2, 0.1 + TH / 2, (z0 + z1) / 2, ry, 1);
    const fio = Math.abs(z1 - z0) > Math.abs(x1 - x0); // arame de cima
    pc(g, fio ? 0.03 : L, 0.03, fio ? L : 0.03, 0x8d969c, (x0 + x1) / 2, 0.1 + TH, (z0 + z1) / 2, F);
  }
  sol(-W2 - 0.2, -PM - 0.2, -0.25, 0.2); sol(PM + 0.2, W2 + 0.2, -0.25, 0.2);
  sol(W2 - 0.2, W2 + 0.25, -D - 0.2, 0.2); sol(-W2 - 0.25, -W2 + 0.2, -D - 0.2, 0.2); sol(-W2, W2, -D - 0.25, -D + 0.2);
  S.portaoSolido = sol(-PM - 0.2, PM + 0.2, -0.3, 0.2); // some quando a Tia Regina abre
  // palanques grossos do portão e a porteira: dois postes altos com a viga e a placa pendurada
  for (const s of [-1, 1]) { pc(g, 0.24, 2.0, 0.24, MADE, s * (PM + 0.2), 1.0, 0, F); pc(g, 0.32, 4.8, 0.32, MAD, s * 3.5, 2.4, 0.15); sol(s * 3.5 - 0.25, s * 3.5 + 0.25, -0.1, 0.4, 5); }
  pc(g, 7.8, 0.32, 0.36, MAD, 0, 4.7, 0.15); pc(g, 8.2, 0.12, 0.5, MADE, 0, 4.92, 0.15, F);
  for (const s of [-1, 1]) pc(g, 0.05, 0.4, 0.05, 0x55595e, s * 2.6, 4.35, 0.15, F); // correntinhas
  pc(g, 6.4, 1.5, 0.12, MADE, 0, 3.4, 0.15, F);
  {
    const larg = 1024, alt = Math.round((larg * 1.3) / 6.2);
    const tex = texturaCanvas(larg, alt, (c, a, b) => desenharLetreiro(c, "sitio-floresca", a, b));
    if (document.fonts?.status !== "loaded") document.fonts?.ready.then(() => { desenharLetreiro(tex.image.getContext("2d"), "sitio-floresca", larg, alt); tex.needsUpdate = true; });
    const m = matNovo({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 });
    for (const [z, ry] of [[0.22, 0], [0.08, Math.PI]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.3), m); p.position.set(0, 3.4, z); p.rotation.y = ry; g.add(p); }
  }
  // a placa do @, numa tábua com dois palanques, à esquerda do portão (de quem chega)
  for (const x of [-10.1, -5.1]) pc(g, 0.16, 2.7, 0.16, MAD, x, 1.35, 0.22, F);
  placaInstagram(g, "sitio-floresca");
  sol(-10.3, -4.9, 0.05, 0.6, 3);
  // a campainha: postinho do lado direito do portão, caixinha branca com o botão vermelho e um telhadinho
  { const [cx0, cz0] = Q.campainha;
    pc(g, 0.14, 1.3, 0.14, MADE, cx0, 0.65, cz0 - 0.1, F); pc(g, 0.24, 0.32, 0.1, 0xf4f2ec, cx0, 1.2, cz0, F);
    pc(g, 0.1, 0.1, 0.05, 0xe2342b, cx0, 1.2, cz0 + 0.07, F); pc(g, 0.18, 0.06, 0.04, 0x9aa1a7, cx0, 1.31, cz0 + 0.06, F);
    pc(g, 0.34, 0.05, 0.22, MADE, cx0, 1.39, cz0 - 0.02, { ...F, rx: 0.25 }); sol(cx0 - 0.12, cx0 + 0.12, cz0 - 0.2, cz0 + 0.08, 1.5); }

  // ---- a casa de tijolinho (à esquerda da estradinha): a parede comprida olha para a estrada (+x), o oitão para o portão (+z)
  const C = Q.casa, cw = C.x1 - C.x0, cd = C.z1 - C.z0, cxm = (C.x0 + C.x1) / 2, czm = (C.z0 + C.z1) / 2;
  pc(g, cw - 0.04, C.h, cd - 0.04, 0xb4552f, cxm, C.h / 2, czm, F); // corpo (o tijolo vai por fora, em planos)
  plano(g, M.tijolo, cd, C.h, C.x1 + 0.01, C.h / 2, czm, Math.PI / 2); plano(g, M.tijolo, cd, C.h, C.x0 - 0.01, C.h / 2, czm, -Math.PI / 2);
  plano(g, M.tijolo, cw, C.h, cxm, C.h / 2, C.z1 + 0.01, 0); plano(g, M.tijolo, cw, C.h, cxm, C.h / 2, C.z0 - 0.01, Math.PI);
  oitao(g, M.tijolo, cw, C.cume, cxm, C.h, C.z1 + 0.01, 0); oitao(g, M.tijolo, cw, C.cume, cxm, C.h, C.z0 - 0.01, Math.PI);
  pc(g, cw + 0.08, 0.3, cd + 0.08, 0x8f3f22, cxm, 0.15, czm, F); // rodapé
  const sC = telhado(g, { x0: C.x0, x1: C.x1, z0: C.z0, z1: C.z1, h: C.h, cume: C.cume, ov: 0.6, cor: 0x4a3b37, eixo: "z" });
  // lambrequim de madeira na beira do telhado do oitão da frente (tábua inclinada com os dentinhos) e a caixinha de madeira
  for (const lado of [-1, 1]) {
    const run = cw / 2 + 0.6, ang = Math.atan(sC), L = Math.hypot(run, run * sC);
    pc(g, L, 0.22, 0.06, 0x7a5232, cxm + lado * (run / 2), C.h + C.cume - (run * sC) / 2 - 0.12, C.z1 + 0.66, { ...F, rz: lado * -ang });
    for (let d = 0.2; d < L - 0.15; d += 0.28) { const px = cxm + lado * d * Math.cos(ang), py = C.h + C.cume - d * Math.sin(ang) - 0.3; pc(g, 0.12, 0.14, 0.05, 0x7a5232, px, py, C.z1 + 0.66, { ...F, rz: lado * -ang }); }
  }
  pc(g, 0.8, 0.66, 0.36, 0xa87a4a, cxm, C.h + 1.05, C.z1 + 0.2, F); pc(g, 0.94, 0.08, 0.46, 0x6b4a2e, cxm, C.h + 1.42, C.z1 + 0.22, F); pc(g, 0.3, 0.3, 0.04, 0x3a2a1c, cxm, C.h + 1.05, C.z1 + 0.39, F);
  janela(g, cxm - 2.0, 1.55, C.z1 + 0.02, 0); janela(g, cxm + 2.0, 1.55, C.z1 + 0.02, 0);
  // a parede da estrada: três janelas, a porta de madeira escura e a luminária
  for (const z of [C.z1 - 2.2, C.z1 - 6.4, C.z0 + 2.4]) janela(g, C.x1 + 0.02, 1.55, z, Math.PI / 2);
  { const zp = C.z1 - 10.2; pc(g, 0.08, 2.2, 1.1, 0x3b2a20, C.x1 + 0.04, 1.1, zp, F); pc(g, 0.12, 0.14, 1.36, 0x2d2622, C.x1 + 0.06, 2.27, zp, F); for (const s of [-1, 1]) pc(g, 0.12, 2.2, 0.12, 0x2d2622, C.x1 + 0.06, 1.1, zp + s * 0.62, F); pc(g, 0.06, 0.08, 0.08, 0xd4a941, C.x1 + 0.1, 1.05, zp + 0.36, F);
    pc(g, 0.2, 0.26, 0.2, 0, C.x1 + 0.18, 2.55, zp + 0.95, { ...F, material: matNovo({ color: 0xfff1c8, emissive: 0xffd27a, emissiveIntensity: 0.5 }) }); }
  for (const z of [C.z0 + 2.4]) janela(g, C.x0 - 0.02, 1.55, z, -Math.PI / 2); janela(g, cxm, 1.55, C.z0 - 0.02, Math.PI);
  pc(g, 1.6, 0.1, cd + 2, 0xc8c4ba, C.x1 + 0.8, 0.06, czm, F); // calçada lateral
  sol(C.x0 - 0.1, C.x1 + 0.1, C.z0 - 0.1, C.z1 + 0.1, 6);
  // canteiro de flores na frente da casa
  for (let i = 0; i < 9; i++) pc(g, 0.22, 0.3, 0.22, [0xff6fa8, 0xffd23f, 0xffffff][i % 3], C.x0 + 0.8 + i * 0.95, 0.2, C.z1 + 0.7, D_);
  pc(g, cw - 0.6, 0.12, 0.6, 0x5a8f3a, cxm, 0.07, C.z1 + 0.7, F);

  // ---- galinheiro: casinha de tábua e o cercadinho de tela
  const GL = Q.galinheiro;
  pc(g, 3, 2.0, 2.6, 0x9a7350, GL.x0 + 1.5, 1.0, GL.z0 + 1.3, F);
  plano(g, M.tabua, 3, 2.0, GL.x0 + 1.5, 1.0, GL.z0 + 2.61, 0); plano(g, M.tabua, 2.6, 2.0, GL.x0 + 3.01, 1.0, GL.z0 + 1.3, Math.PI / 2);
  pc(g, 3.5, 0.14, 3.1, 0xd0643a, GL.x0 + 1.5, 2.1, GL.z0 + 1.3, { rx: 0.18 }); pc(g, 0.6, 0.6, 0.06, 0x3a2a1c, GL.x0 + 2.2, 0.5, GL.z0 + 2.64, F);
  pc(g, 0.5, 0.06, 1.2, 0x8a6440, GL.x0 + 2.2, 0.25, GL.z0 + 3.1, { ...F, rx: 0.35 });
  for (const [x0, z0, x1, z1] of [[GL.x0, GL.z0, GL.x1, GL.z0], [GL.x1, GL.z0, GL.x1, GL.z1], [GL.x1, GL.z1, GL.x0, GL.z1], [GL.x0, GL.z1, GL.x0, GL.z0]]) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 2.2)), ry = Math.atan2(-(z1 - z0), x1 - x0);
    for (let i = 0; i <= n; i++) palanque(g, x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n, 1.3, 0.1);
    plano(g, M.tela, L, 1.1, (x0 + x1) / 2, 0.62, (z0 + z1) / 2, ry, 1);
  }
  for (let i = 0; i < 4; i++) pc(g, 0.5, 0.18, 0.5, 0xc9b55a, GL.x1 - 1.2 - i * 0.9, 0.05, GL.z1 - 1.5 - (i % 2), D_); // milho no chão
  sol(GL.x0 - 0.1, GL.x1 + 0.1, GL.z0 - 0.1, GL.z1 + 0.1, 3);

  // ---- celeiro de tábuas (nos fundos, no fim da estradinha): oitão da frente com as portas amarelas, mansardas de
  // madeira na água da direita e telha laranja
  const B = Q.celeiro, bw = B.x1 - B.x0, bd = B.z1 - B.z0, bxm = (B.x0 + B.x1) / 2, bzm = (B.z0 + B.z1) / 2, LAR = 0xd0643a;
  pc(g, bw - 0.04, B.h, bd - 0.04, 0x8c6646, bxm, B.h / 2, bzm, F);
  plano(g, M.tabua, bd, B.h, B.x1 + 0.01, B.h / 2, bzm, Math.PI / 2); plano(g, M.tabua, bw, B.h, bxm, B.h / 2, B.z0 - 0.01, Math.PI);
  oitao(g, M.tabua, bw, B.cume, bxm, B.h, B.z1 + 0.01, 0); oitao(g, M.tabua, bw, B.cume, bxm, B.h, B.z0 - 0.01, Math.PI);
  // frente: tábuas dos dois lados do vão da porta, o vão escuro e as duas folhas amarelas abertas encostadas na parede
  const PV = 3.6, PH = 3.0; // vão da porta
  for (const s of [-1, 1]) { const w = (bw - PV) / 2; plano(g, M.tabua, w, B.h, bxm + s * (PV / 2 + w / 2), B.h / 2, B.z1 + 0.01, 0); }
  plano(g, M.tabua, PV, B.h - PH, bxm, PH + (B.h - PH) / 2, B.z1 + 0.01, 0);
  pc(g, PV, PH, 0.1, 0x2a1d14, bxm, PH / 2, B.z1 - 0.6, F); pc(g, PV, 0.06, 0.7, 0x5a4636, bxm, 0.03, B.z1 - 0.3, F); // lá dentro, escuro
  for (const s of [-1, 1]) {
    const fx = bxm + s * (PV / 2 + PV / 4 + 0.05), z = B.z1 + 0.08;
    pc(g, PV / 2, PH, 0.1, 0xe8b547, fx, PH / 2, z);
    for (const [w, h, y] of [[PV / 2, 0.16, 0.12], [PV / 2, 0.16, PH - 0.12], [PV / 2, 0.16, PH / 2]]) pc(g, w, h, 0.05, 0xc99a30, fx, y, z + 0.07, F);
    const dg = Math.hypot(PV / 2, PH / 2 - 0.2); for (const q of [-1, 1]) pc(g, 0.12, dg, 0.04, 0xc99a30, fx, PH * (q > 0 ? 0.75 : 0.25), z + 0.08, { ...F, rz: Math.atan2(PV / 2, PH / 2 - 0.2) * s });
  }
  pc(g, PV + 0.4, 0.18, 0.2, 0x6b4a2e, bxm, PH + 0.1, B.z1 + 0.1, F);
  janela(g, bxm, B.h + 1.1, B.z1 + 0.03, 0, { w: 0.8, h: 0.7, moldura: 0x5a3f28, veneziana: 0xe8b547 });
  const sB = telhado(g, { x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1, h: B.h, cume: B.cume, ov: 0.5, cor: LAR, eixo: "z" });
  // mansardas na água da direita (+x): caixinha de tábua com telhadinho e o coração vazado no oitão
  for (const z of [bzm + 2.6, bzm - 2.6]) {
    const fx = bxm + (bw / 2) * 0.55, base = B.h + B.cume * 0.45;
    pc(g, (fx - bxm) - 0.2, 1.5, 1.5, 0x8c6646, (fx + bxm + 0.2) / 2, base + 0.45, z, F);
    plano(g, M.tabua, 1.5, 1.0, fx + 0.01, base + 0.55, z, Math.PI / 2);
    oitao(g, M.tabua, 1.5, 0.7, fx + 0.01, base + 1.05, z, Math.PI / 2);
    coracao(g, 0.34, 0x2a1a10, fx + 0.03, base + 1.3, z, Math.PI / 2);
    for (const q of [-1, 1]) pc(g, (fx - bxm) + 0.2, 0.12, 1.02, LAR, (fx + bxm) / 2 + 0.1, base + 1.4, z + q * 0.42, { ...F, rx: q * 0.75 });
    void sB;
  }
  sol(B.x0 - 0.1, B.x1 + 0.1, B.z0 - 0.1, B.z1 + 0.3, 7);

  // ---- a varanda comprida (as aulas da Escola de Campo): tábua por dentro, telha laranja descendo até a frente da
  // varanda, palanques e a treliça em losango, com duas entradas; mansardas com o coração vazado
  const V = Q.varanda, vw = V.x1 - V.x0, vd = V.z1 - V.z0, vxm = (V.x0 + V.x1) / 2, vzm = (V.z0 + V.z1) / 2;
  pc(g, vw, V.h, vd - 0.04, 0x8c6646, vxm, V.h / 2, vzm, F);
  plano(g, M.tabua, vw, V.h, vxm, V.h / 2, V.z1 + 0.01, 0); plano(g, M.tabua, vw, V.h, vxm, V.h / 2, V.z0 - 0.01, Math.PI);
  plano(g, M.tabua, vd, V.h, V.x0 - 0.01, V.h / 2, vzm, -Math.PI / 2); oitao(g, M.tabua, vd, 1.5, V.x0 - 0.01, V.h, vzm, -Math.PI / 2);
  coracao(g, 0.5, 0x2a1a10, V.x0 - 0.03, V.h + 0.62, vzm, -Math.PI / 2); // o coração vazado no oitão
  telhado(g, { x0: V.x0, x1: V.x1, z0: V.z0, z1: V.z1, h: V.h, cume: 1.5, ov: 0.35, cor: LAR, eixo: "x", frente: V.frente - V.z1 + 0.3 });
  // portas das salinhas, ao longo da varanda
  for (const x of [V.x0 + 3, V.x0 + 8, V.x0 + 13]) { pc(g, 1.1, 2.15, 0.06, 0x5a3f28, x, 1.08, V.z1 + 0.04, F); pc(g, 1.3, 0.12, 0.1, 0x3b2a20, x, 2.2, V.z1 + 0.05, F); pc(g, 0.06, 0.06, 0.06, 0xd4a941, x + 0.38, 1.05, V.z1 + 0.09, F); }
  for (const x of [V.x0 + 5.5, V.x0 + 10.5, V.x0 + 15.5]) janela(g, x, 1.6, V.z1 + 0.02, 0, { w: 0.9, h: 0.9, moldura: 0x5a3f28, veneziana: 0x7a5a3a });
  pc(g, vw, 0.1, V.frente - V.z1 + 0.3, 0xc8c4ba, vxm, 0.05, (V.z1 + V.frente + 0.3) / 2, F); // piso da varanda
  const postes = []; for (let x = V.x0 + 0.15; x <= V.x1 - 0.1; x += vw / 6) postes.push(x);
  const sTel = 1.5 / (vd / 2), alturaFrente = V.h - sTel * (V.frente - V.z1);
  for (const x of postes) pc(g, 0.2, alturaFrente, 0.2, 0x7a5532, x, alturaFrente / 2, V.frente, F);
  pc(g, vw, 0.18, 0.22, 0x7a5532, vxm, alturaFrente - 0.05, V.frente, F);
  const entradas = [2, 4]; // vãos sem treliça (entre os postes)
  for (let i = 0; i < postes.length - 1; i++) {
    if (entradas.includes(i)) continue;
    const a = postes[i] + 0.1, b = postes[i + 1] - 0.1, ht = alturaFrente - 0.45;
    plano(g, M.trelica, b - a, ht, (a + b) / 2, 0.2 + ht / 2, V.frente, 0, 0.5);
    pc(g, b - a, 0.08, 0.08, 0x7a5532, (a + b) / 2, 0.16, V.frente, F);
    sol(a - 0.1, b + 0.1, V.frente - 0.12, V.frente + 0.12, 3);
  }
  for (const x of postes) sol(x - 0.12, x + 0.12, V.frente - 0.12, V.frente + 0.12, 3);
  // mesinhas e cadeirinhas coloridas da Escola de Campo
  for (const [x, c] of [[V.x0 + 5, 0x3fa9f5], [V.x0 + 12, 0xff8a3d]]) {
    pc(g, 1.4, 0.06, 0.8, 0xf4f2ec, x, 0.62, V.z1 + 1.3, F); for (const q of [-1, 1]) for (const r of [-1, 1]) pc(g, 0.06, 0.56, 0.06, 0x9aa1a7, x + q * 0.6, 0.32, V.z1 + 1.3 + r * 0.32, F);
    for (const q of [-0.45, 0.45]) { pc(g, 0.36, 0.05, 0.34, c, x + q, 0.36, V.z1 + 0.62, F); pc(g, 0.36, 0.38, 0.05, c, x + q, 0.56, V.z1 + 0.45, F); }
  }
  for (const x of [V.x0 + 4.5, V.x0 + 13.5]) { // mansardas na água da frente
    const fz = V.z1 + 0.9, yb = V.h - sTel * 0.9;
    // caixa curta e alta: não aparece por baixo do telhado, dentro da varanda
    pc(g, 1.6, 1.0, 1.0, 0x8c6646, x, yb + 0.8, fz - 0.5, F);
    plano(g, M.tabua, 1.6, 1.25, x, yb + 0.6, fz + 0.01, 0); oitao(g, M.tabua, 1.6, 0.7, x, yb + 1.2, fz + 0.01, 0);
    for (const q of [-1, 1]) pc(g, 0.05, 1.0, 1.0, 0x7a5532, x + q * 0.8, yb + 0.8, fz - 0.5, F);
    coracao(g, 0.36, 0x2a1a10, x, yb + 1.45, fz + 0.03, 0);
    for (const q of [-1, 1]) pc(g, 1.06, 0.12, 1.4, LAR, x + q * 0.44, yb + 1.54, fz - 0.55, { ...F, rz: -q * 0.75 });
  }
  sol(V.x0 - 0.1, V.x1, V.z0 - 0.1, V.z1 + 0.05, 6);

  // ---- o lago cercado: água calma, a beira de terra com a grama alta, palanques e tela em volta e o portãozinho
  const LG = Q.lago;
  const agua = new THREE.Mesh(disco(LG.r, { passo: 0.5 }), MAT_LAGO); agua.rotation.x = -Math.PI / 2; agua.position.set(LG.x, 0.06, LG.z); agua.userData.dinamico = true; g.add(agua);
  S.agua = agua;
  { const m = new THREE.Mesh(disco(LG.r + 0.9, { furo: LG.r - 0.2, passo: 0.5 }), mat(0x8a7a55)); m.rotation.x = -Math.PI / 2; m.position.set(LG.x, 0.045, LG.z); g.add(m); }
  const NP = 28;
  for (let i = 0; i < NP; i++) {
    const a = (i / NP) * Math.PI * 2, b = ((i + 1) / NP) * Math.PI * 2;
    const [ax, az, bx, bz] = [LG.x + Math.sin(a) * LG.cerca, LG.z + Math.cos(a) * LG.cerca, LG.x + Math.sin(b) * LG.cerca, LG.z + Math.cos(b) * LG.cerca];
    palanque(g, ax, az, 1.6, 0.13);
    const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax);
    if (i === 0) { // o portãozinho (de frente para a estradinha): moldura metálica e a tela
      const p = new THREE.Group(); p.position.set((ax + bx) / 2, 0, (az + bz) / 2); p.rotation.y = ry; g.add(p);
      for (const s of [-1, 1]) pc(p, 0.06, 1.3, 0.06, METAL, s * (L / 2 - 0.12), 0.78, 0, F);
      for (const y of [0.16, 1.4]) pc(p, L - 0.2, 0.06, 0.06, METAL, 0, y, 0, F);
      plano(p, M.tela, L - 0.3, 1.2, 0, 0.78, 0, 0, 1);
    } else plano(g, M.tela, L, 1.3, (ax + bx) / 2, 0.75, (az + bz) / 2, ry, 1);
    // grama alta na margem
    for (let k = 0; k < 4; k++) { const aa = a + ((b - a) * (k + 0.5)) / 4, r = LG.r + 0.5 + ((i * 7 + k * 3) % 5) * 0.25; pc(g, 0.1, 0.45 + ((i + k) % 3) * 0.2, 0.1, [0x5aa83a, 0x78bf46, 0x9ccf5a][(i + k) % 3], LG.x + Math.sin(aa) * r, 0.3, LG.z + Math.cos(aa) * r, { ...D_, rz: ((k % 3) - 1) * 0.2 }); }
  }
  S.solidos.push({ circulo: true, x: LG.x, z: LG.z, r: LG.cerca + 0.15 });
  // a marca no chão, na frente do portãozinho (aparece quando a missão precisa)
  { const m = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 28), new THREE.MeshBasicMaterial({ color: 0xffcc1f, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(Q.marcaLago[0], 0.12, Q.marcaLago[1]); m.userData.dinamico = true; m.visible = false; g.add(m); S.marca = m; }

  // ---- o pinheiro alto ao lado do lago, as palmeiras e a mata ao fundo
  { const [px, pz] = Q.pinheiro, pg = new THREE.Group(); pg.position.set(px, 0, pz); g.add(pg);
    pc(pg, 0.5, 9.5, 0.5, 0x6b4a2e, 0, 4.75, 0);
    const copa = [[3.6, 1.0, 7.0, 0.4, 0], [3.0, 1.1, 8.2, -0.5, 0.3], [3.8, 1.0, 9.2, 0.2, -0.4], [2.8, 1.0, 10.3, -0.3, 0.2], [2.2, 1.0, 11.3, 0.3, 0], [1.3, 0.9, 12.3, 0, -0.1], [0.6, 0.7, 13.1, 0, 0]];
    copa.forEach(([w, h, y, dx, dz], i) => pc(pg, w, h, w * 0.85, i % 2 ? 0x2f5f33 : 0x3a7040, dx, y, dz, i < 3 ? {} : F));
    for (const [w, y, dx, rz] of [[1.6, 6.2, 0.9, -0.3], [1.4, 5.4, -0.8, 0.35]]) { pc(pg, w, 0.12, 0.12, 0x6b4a2e, dx, y, 0, { ...F, rz }); pc(pg, 1.2, 0.6, 1.0, 0x2f5f33, dx * 1.7, y + 0.2, 0, F); }
    sol(px - 0.35, px + 0.35, pz - 0.35, pz + 0.35, 10); }
  for (const [x, z, a] of [[-24, -133, 7.5], [-6, -134, 8.5], [0, -131, 7], [26, -134, 8], [-25, -12, 6.5], [-24.5, -66, 7.8], [25.5, -88, 7.2]]) { const c = coqueiro(a); c.position.set(x, 0.03, z); c.rotation.y = (x * 0.37) % 6; g.add(c); sol(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 6); }
  for (const [x, z, e, t] of [[-20, -136, 1.5, 0], [-14, -135.5, 1.3, 1], [-10, -136.4, 1.6, 3], [6, -136, 1.4, 0], [10, -135, 1.2, 1], [21, -136.5, 1.5, 3], [-26, -100, 1.2, 0], [-26, -80, 1.4, 1], [26, -60, 1.3, 3], [-25.5, -40, 1.1, 0], [26, -102, 1.3, 1]]) {
    const a = arvoreReal(e, t); a.position.set(x, 0.03, z); a.rotation.y = x; g.add(a); sol(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 6);
  }
  // moitas e bananeirinha perto da casa
  for (const [x, z] of [[-22.5, -18], [-22.5, -27], [-9.2, -35], [-21, -36]]) pc(g, 1.4, 0.9, 1.2, 0x4f9e3a, x, 0.45, z, D_);

  S.porta = [0, 1.2];
  S.grupo.updateMatrixWorld(true);
  S.topo = new THREE.Box3().setFromObject(g).max.y; // o pinheiro (o helicóptero passa por cima)
  S.vivo = (op) => criarVida(S, op);
  return S;
}

// ------------------------------------------------------------------ o que se mexe (portão, Tia Regina, Duck, Ale, patos e galinhas)
function criarVida(S, { origem: [ox, oz, rot], solidos, lugar }) {
  const Q = SITIO, raiz = new THREE.Group(); raiz.userData.dinamico = true; S.grupo.add(raiz);
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const paraMundo = (x, z) => [ox + x * cs + z * sn, oz - x * sn + z * cs];
  const paraLocal = (wx, wz) => { const dx = wx - ox, dz = wz - oz; return [dx * cs - dz * sn, dx * sn + dz * cs]; };
  const solidoPortao = solidos[S.solidos.filter((s) => !s.circulo).indexOf(S.portaoSolido)];
  let ctx = null; // ligar(): sons, falar, dizer, feitas, ativa
  const feita = (id) => (ctx?.feitas?.() ?? []).includes(id), ativa = () => ctx?.ativa?.() ?? null;

  // ---- o portão: duas folhas de moldura metálica com a tela, dobradiça nos palanques, abrindo para dentro (-z)
  const PM = Q.portao.meia, folhas = [-1, 1].map((s) => {
    const f = new THREE.Group(); f.position.set(s * PM, 0, -0.02); raiz.add(f);
    const d = new THREE.Group(); f.add(d);
    for (const x of [0.06, PM - 0.06]) pc(d, 0.07, Q.portao.alto, 0.07, 0xc9ced4, -s * x, 0.12 + Q.portao.alto / 2, 0, F);
    for (const y of [0.16, 0.12 + Q.portao.alto, 0.9]) pc(d, PM - 0.1, 0.06, 0.06, 0xc9ced4, -s * PM / 2, y, 0, F);
    pc(d, 0.05, Q.portao.alto - 0.1, 0.05, 0x9aa1a7, -s * PM / 2, 0.12 + Q.portao.alto / 2, 0.02, F);
    plano(d, texturas().tela, PM - 0.14, Q.portao.alto - 0.1, -s * PM / 2, 0.12 + Q.portao.alto / 2, 0, 0, 1);
    mesclar(d);
    return { g: f, s };
  });
  let portao = 0, abrindo = false, aberto = false; // 0 fechado … 1 aberto

  // ---- Tia Regina
  const regina = criarPessoa("regina"); regina.grupo.userData.dinamico = true; raiz.add(regina.grupo);
  const R = { x: Q.regina.casa[0], z: Q.regina.casa[1], rot: Math.PI / 2, estado: "casa", caminho: [] };
  const mundoR = paraMundo(R.x, R.z);
  const [gx, gz] = paraMundo(...Q.regina.portao);
  lugar.pessoaNaPorta = { m: regina, x: gx, z: gz, mundo: mundoR }; // as missões usam este boneco (e o [x, z] em dia)

  // ---- o Duck
  const duck = cachorro(); duck.g.userData.dinamico = true; raiz.add(duck.g);
  let matSeco = null; duck.g.traverse((o) => { if (o.isMesh && !matSeco) matSeco = o.material; });
  const matMolhado = matSeco.clone(); matMolhado.color.setHex(0xc9b29c); matMolhado.onBeforeCompile = matSeco.onBeforeCompile; matMolhado.customProgramCacheKey = matSeco.customProgramCacheKey;
  const K = { x: 6, z: -30, rot: 0, modo: "brincar", a: 0, alvo: [8, -30], vel: 0, fase: 0, pulo: 0, sacode: 0, t: 0, molhado: false, fim: null };
  const gotas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 5, 4), new THREE.MeshBasicMaterial({ color: 0x8fd6ff }), 24);
  gotas.userData.dinamico = true; gotas.visible = false; gotas.frustumCulled = false; raiz.add(gotas);
  const gotasV = Array.from({ length: 24 }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), vida: 0 }));

  // ---- a Ale e os outros patos do lago; as galinhas
  const LG = Q.lago;
  const ale = pato(true); ale.scale.setScalar(1.15); ale.userData.dinamico = true; raiz.add(ale);
  const A = { modo: "lago", a: 0.6, x: LG.x, z: LG.z, rot: 0, alvo: null, voo: 0, de: null, para: null, fim: null, rabisco: null };
  const patos = [0.2, 2.4, 4.3].map((a, i) => { const p = pato(false); p.userData.dinamico = true; raiz.add(p); return { g: p, a, r: 3 + i * 1.6, v: 0.25 + i * 0.07 }; });
  const GL = Q.galinheiro;
  const galinhas = [0xffffff, 0xb5651d, 0xe9d6b0].map((cor, i) => { const gg = galinha(cor); gg.userData.dinamico = true; raiz.add(gg); return { g: gg, x: GL.x0 + 5 + i * 1.3, z: GL.z0 + 4 + i, alvo: null, fase: i * 1.7 }; });

  const marca = S.marca;
  const [cbx, cbz] = paraMundo(Q.campainha[0], Q.campainha[1] + 0.9);
  const centro = paraMundo(0, -Q.D / 2);

  // anda (x, z) até o alvo com velocidade v; devolve a distância que falta
  const passo = (o, ax, az, v, dt) => { const dx = ax - o.x, dz = az - o.z, d = Math.hypot(dx, dz); if (d > 0.05) { const k = Math.min(d, v * dt); o.x += (dx / d) * k; o.z += (dz / d) * k; o.rot = Math.atan2(dx, dz); } return d; };
  const virarPara = (atual, alvo, k) => { let d = alvo - atual; d = Math.atan2(Math.sin(d), Math.cos(d)); return atual + d * k; };
  const dentroDe = (o, r) => Math.max(r.x0, Math.min(r.x1, o));

  function abrirPortao() {
    if (aberto || abrindo || R.estado !== "casa") return;
    R.estado = "vindo"; R.caminho = [[-1.4, -20], [-0.6, -3.2]];
  }
  function reginaAlvo() {
    if (R.estado === "casa") return Q.regina.casa;
    if (!aberto) return null;
    if (ativa() === MISSAO_ALE && A.modo === "fugida") return null; // ajudando a pegar a Ale (atualizarRegina)
    return feita(MISSAO_ALE) || (ativa() === MISSAO_ALE && A.modo !== "fugida") ? Q.regina.espera : Q.regina.portao;
  }
  function atualizarRegina(dt, t, pl) {
    let vel = 0;
    if (R.estado === "vindo") {
      const [ax, az] = R.caminho[0];
      if (passo(R, ax, az, 3.2, dt) < 0.1) { R.caminho.shift(); if (!R.caminho.length) { R.estado = "abrindo"; abrindo = true; regina.acenar(1.5); ctx?.sons?.porta?.(); } }
      else vel = 3.2;
    } else if (R.estado === "abrindo") {
      R.rot = virarPara(R.rot, 0, Math.min(1, dt * 5));
      if (aberto) { R.estado = "aberto"; regina.acenar(2.5); ctx?.falar?.("rp-sitio-entrou"); ctx?.dizer?.("Rabiscolândia", FALAS_SITIO["rp-sitio-entrou"], 3600); }
    } else if (R.estado === "aberto") {
      const fug = ativa() === MISSAO_ALE && A.modo === "fugida";
      if (fug) { // corre atrás da Ale, do lado de lá dela: a Ale foge para o lado do Rabisco
        const dx = A.x - pl[0], dz = A.z - pl[1], d = Math.hypot(dx, dz) || 1;
        const ax = dentroDe(A.x + (dx / d) * 2.6, Q.fuga), az = Math.max(Q.fuga.z0, Math.min(Q.fuga.z1, A.z + (dz / d) * 2.6));
        if (passo(R, ax, az, 3.4, dt) > 0.3) vel = 4.5;
      } else {
        const alvo = reginaAlvo();
        if (alvo && passo(R, alvo[0], alvo[1], 2.4, dt) > 0.15) vel = 2.4;
        else if (Math.hypot(pl[0] - R.x, pl[1] - R.z) < 7) R.rot = virarPara(R.rot, Math.atan2(pl[0] - R.x, pl[1] - R.z), Math.min(1, dt * 4)); // olha para o Rabisco
        else R.rot = virarPara(R.rot, 0, Math.min(1, dt * 2));
      }
    } else if (R.estado === "casa" && Math.hypot(pl[0] - R.x, pl[1] - R.z) < 9) R.rot = virarPara(R.rot, Math.atan2(pl[0] - R.x, pl[1] - R.z), Math.min(1, dt * 3));
    regina.grupo.position.set(R.x, 0, R.z); regina.grupo.rotation.y = R.rot;
    regina.atualizar(dt, { vel });
    const [wx, wz] = paraMundo(R.x, R.z); mundoR[0] = wx; mundoR[1] = wz;
  }

  // ---- Duck: brinca em volta do Rabisco, vai para o lago (missão), sai e se sacode, segue o Rabisco, senta com a Tia Regina
  function duckModoPadrao() {
    if (K.modo === "seguir" || K.modo === "chamado" || K.modo === "saindo" || K.modo === "sacudir" || K.modo === "entregue" || K.modo === "indoLago" || K.modo === "pulandoLago") return;
    const querLago = feita(MISSAO_ALE) && !feita(MISSAO_DUCK) && ativa() !== MISSAO_ALE;
    if (querLago && K.modo !== "lago") { K.modo = "indoLago"; return; }
    if (!querLago && K.modo === "lago" && ativa() !== MISSAO_DUCK) { K.modo = "brincar"; K.x = Q.marcaLago[0]; K.z = Q.marcaLago[1] + 1.5; secar(); }
  }
  function secar() { K.molhado = false; for (const m of meshesDuck) m.material = matSeco; duck.cauda.scale.set(1, 1, 1); for (const o of [duck.cab]) o.scale.set(1, 1, 1); }
  function molhar() { K.molhado = true; for (const m of meshesDuck) m.material = matMolhado; duck.cauda.scale.set(0.7, 0.7, 0.8); }
  const meshesDuck = []; duck.g.traverse((o) => { if (o.isMesh) meshesDuck.push(o); });
  function atualizarDuck(dt, t, pl, plRot) {
    duckModoPadrao();
    let v = 0, ny = 0.03;
    K.t += dt;
    const lagoAlvo = [LG.x + Math.sin(K.a) * 3.5, LG.z + Math.cos(K.a) * 3.5];
    if (K.modo === "brincar") {
      const dR = Math.hypot(pl[0] - K.x, pl[1] - K.z), noPatio = pl[0] > Q.patio.x0 - 6 && pl[0] < Q.patio.x1 + 4 && pl[1] > Q.patio.z0 - 8 && pl[1] < Q.patio.z1 + 6 && aberto;
      if (noPatio && dR < 14) { // corre em volta do Rabisco, de vez em quando pula
        K.a += dt * 1.6; const ax = pl[0] + Math.sin(K.a) * 2.4, az = pl[1] + Math.cos(K.a) * 2.4;
        const d = passo(K, dentroDe(ax, Q.patio), Math.max(Q.patio.z0, Math.min(Q.patio.z1, az)), dR > 5 ? 6 : 4.2, dt); v = d > 0.2 ? (dR > 5 ? 6 : 4.2) : 0;
        if (K.pulo <= 0 && Math.random() < dt * 0.35) K.pulo = 0.5;
        if (!K.latiu && dR < 4) { K.latiu = true; ctx?.sons?.bichinho?.("au"); }
      } else { // passeia pelo pátio, cheirando o gramado
        K.latiu = false;
        if (!K.alvo || Math.hypot(K.alvo[0] - K.x, K.alvo[1] - K.z) < 0.4 || Math.random() < dt * 0.08) K.alvo = [Q.patio.x0 + Math.random() * (Q.patio.x1 - Q.patio.x0), Q.patio.z0 + Math.random() * (Q.patio.z1 - Q.patio.z0)];
        if (Math.sin(K.t * 0.6) > -0.3 && passo(K, K.alvo[0], K.alvo[1], 2.2, dt) > 0.2) v = 2.2;
      }
    } else if (K.modo === "indoLago") { // corre até o portãozinho e pula a cerca, direto na água (arteiro!)
      if (passo(K, Q.marcaLago[0], Q.marcaLago[1], 6, dt) < 0.3) { K.modo = "pulandoLago"; K.voo = 0; K.de = [K.x, K.z]; }
      else v = 6;
    } else if (K.modo === "pulandoLago" || K.modo === "saindo") {
      K.voo += dt / 0.9;
      const [x0, z0] = K.de, [x1, z1] = K.modo === "saindo" ? [Q.marcaLago[0] - 1.6, Q.marcaLago[1] + 0.9] : lagoAlvo, k = Math.min(1, K.voo);
      K.x = x0 + (x1 - x0) * k; K.z = z0 + (z1 - z0) * k; K.rot = Math.atan2(x1 - x0, z1 - z0);
      ny = (K.modo === "saindo" ? -0.55 + 0.58 * k : 0.03 - 0.58 * k) + Math.sin(k * Math.PI) * 1.7;
      if (k >= 1) {
        if (K.modo === "saindo") { K.modo = "sacudir"; K.sacode = 1.3; soltarGotas(); ctx?.sons?.bichinho?.("au"); }
        else { K.modo = "lago"; molhar(); ctx?.sons?.estouro?.(); }
      }
    } else if (K.modo === "lago") { // nadando: só a cabeça e o peito para fora, de pelo grudado
      K.a += dt * 0.35; const ax = LG.x + Math.sin(K.a) * 3.5, az = LG.z + Math.cos(K.a) * 3.5;
      passo(K, ax, az, 1.4, dt); ny = -0.55 + Math.sin(t * 2.4) * 0.04; v = 1.4;
    } else if (K.modo === "chamado") { // nada até o portãozinho
      if (passo(K, Q.marcaLago[0], Q.marcaLago[1] - 4.6, 2.6, dt) < 0.2) { K.modo = "saindo"; K.voo = 0; K.de = [K.x, K.z]; }
      ny = -0.55 + Math.sin(t * 4) * 0.05; v = 2.6;
    } else if (K.modo === "sacudir") {
      K.sacode -= dt; if (K.sacode <= 0) { secar(); K.modo = "seguir"; const f = K.fim; K.fim = null; f?.(); }
    } else if (K.modo === "seguir") { // atrás do Rabisco, trotando e abanando a cauda
      const ax = pl[0] - Math.sin(plRot) * 1.7, az = pl[1] - Math.cos(plRot) * 1.7, d = Math.hypot(ax - K.x, az - K.z);
      if (d > 22) { K.x = ax; K.z = az; }
      if (d > 0.4) { const vv = Math.min(9, 2 + d * 2.2); passo(K, ax, az, vv, dt); v = vv; }
      else K.rot = virarPara(K.rot, Math.atan2(pl[0] - K.x, pl[1] - K.z), Math.min(1, dt * 5));
    } else if (K.modo === "entregue") { // do lado da Tia Regina, abanando a cauda
      const ax = R.x + Math.cos(R.rot) * 1.1, az = R.z - Math.sin(R.rot) * 1.1;
      if (passo(K, ax, az, 3, dt) > 0.15) v = 3; else K.rot = virarPara(K.rot, R.rot, Math.min(1, dt * 4));
      K.t2 = (K.t2 ?? 0) + dt; if (K.t2 > 9) { K.modo = "brincar"; K.t2 = 0; }
    }
    // pose: trote, cauda abanando, pulinho e a sacudida
    if (K.pulo > 0) { K.pulo -= dt; ny += Math.sin((1 - K.pulo / 0.5) * Math.PI) * 0.6; }
    K.fase += dt * (v > 0.2 ? 6 + v * 1.6 : 0);
    const amp = v > 0.2 ? Math.min(0.75, 0.35 + v * 0.07) : 0;
    duck.pernas.forEach((p, i) => { p.rotation.x = Math.sin(K.fase + (i === 0 || i === 3 ? 0 : Math.PI)) * amp; });
    duck.corpo.position.y = Math.abs(Math.sin(K.fase)) * 0.05 * (v > 0.2 ? 1 : 0);
    duck.cauda.rotation.y = Math.sin(t * (K.modo === "lago" ? 3 : 13)) * (K.molhado ? 0.2 : 0.65);
    duck.cab.rotation.x = K.modo === "lago" || K.modo === "chamado" ? -0.35 : Math.sin(t * 1.3) * 0.08;
    duck.corpo.rotation.z = K.modo === "sacudir" ? Math.sin(t * 38) * 0.32 : 0;
    duck.g.position.set(K.x, ny, K.z); duck.g.rotation.y = K.rot;
  }
  function soltarGotas() {
    gotas.visible = true;
    for (const q of gotasV) { q.p.set(K.x + (Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 0.4, K.z + (Math.random() - 0.5) * 0.9); const a = Math.random() * 6.28; q.v.set(Math.cos(a) * 3, 2 + Math.random() * 2.5, Math.sin(a) * 3); q.vida = 0.6 + Math.random() * 0.6; }
  }
  const _o = new THREE.Object3D();
  function animarGotas(dt) {
    if (!gotas.visible) return;
    let vivas = 0;
    gotasV.forEach((q, i) => {
      if (K.modo === "sacudir" && q.vida <= 0 && Math.random() < 0.3) { q.p.set(K.x, 0.7, K.z); const a = Math.random() * 6.28; q.v.set(Math.cos(a) * 3, 2.5, Math.sin(a) * 3); q.vida = 0.6; }
      q.vida -= dt; q.v.y -= 9.8 * dt; q.p.addScaledVector(q.v, dt);
      _o.position.copy(q.p); _o.scale.setScalar(q.vida > 0 ? 1 : 0.0001); _o.updateMatrix(); gotas.setMatrixAt(i, _o.matrix);
      if (q.vida > 0) vivas++;
    });
    gotas.instanceMatrix.needsUpdate = true;
    if (!vivas && K.modo !== "sacudir") gotas.visible = false;
  }

  // ---- Ale: nada no lago; na missão foge pelo gramado (da Tia Regina e do Rabisco), vai no colo do Rabisco e volta voando para a água
  function atualizarAle(dt, t, pl) {
    if (A.modo === "lago") {
      A.a += dt * 0.3; A.x = LG.x + Math.sin(A.a) * 5.2; A.z = LG.z + Math.cos(A.a) * 5.2; A.rot = A.a + Math.PI / 2;
      ale.position.set(A.x, 0.02 + Math.sin(t * 2) * 0.02, A.z); ale.rotation.y = A.rot;
    } else if (A.modo === "fugida") {
      // foge de quem chega perto (o Rabisco, mais forte; a Tia Regina, um pouco), passeia e às vezes para, "cansada"
      let fx = 0, fz = 0;
      const dR = Math.hypot(A.x - pl[0], A.z - pl[1]), dT = Math.hypot(A.x - R.x, A.z - R.z);
      if (dR < 6) { fx += ((A.x - pl[0]) / (dR || 1)) * (6 - dR); fz += ((A.z - pl[1]) / (dR || 1)) * (6 - dR); }
      if (dT < 4) { fx += ((A.x - R.x) / (dT || 1)) * (4 - dT) * 0.8; fz += ((A.z - R.z) / (dT || 1)) * (4 - dT) * 0.8; }
      if (!A.alvo || Math.random() < dt * 0.4) A.alvo = [Q.fuga.x0 + Math.random() * (Q.fuga.x1 - Q.fuga.x0), Q.fuga.z0 + Math.random() * (Q.fuga.z1 - Q.fuga.z0)];
      fx += (A.alvo[0] - A.x) * 0.08; fz += (A.alvo[1] - A.z) * 0.08;
      A.cansada = (A.cansada ?? 0) - dt; if (A.cansada < -4 && dR < 3) A.cansada = 0.9;
      const v = A.cansada > 0 ? 0 : Math.min(3.6, Math.hypot(fx, fz) * 1.2), l = Math.hypot(fx, fz) || 1;
      if (v > 0.1) { A.x += (fx / l) * v * dt; A.z += (fz / l) * v * dt; A.rot = virarPara(A.rot, Math.atan2(fx, fz), Math.min(1, dt * 8)); }
      A.x = dentroDe(A.x, Q.fuga); A.z = Math.max(Q.fuga.z0, Math.min(Q.fuga.z1, A.z));
      ale.position.set(A.x, 0.03 + (v > 0.1 ? Math.abs(Math.sin(t * 16)) * 0.1 : 0), A.z); ale.rotation.set(0, A.rot, v > 0.1 ? Math.sin(t * 16) * 0.12 : 0);
    } else if (A.modo === "voltando") {
      A.voo += dt / 0.9; const k = Math.min(1, A.voo), [x0, z0] = A.de, [x1, z1] = A.para;
      A.x = x0 + (x1 - x0) * k; A.z = z0 + (z1 - z0) * k;
      ale.position.set(A.x, 1.05 * (1 - k) + Math.sin(k * Math.PI) * 1.6 + 0.02, A.z); ale.rotation.set(0, Math.atan2(x1 - x0, z1 - z0), 0);
      if (k >= 1) { A.modo = "lago"; A.a = Math.atan2(A.x - LG.x, A.z - LG.z); ctx?.sons?.bichinho?.("quack"); const f = A.fim; A.fim = null; f?.(); }
    }
    for (const p of patos) { p.a += p.v * dt; const x = LG.x + Math.sin(p.a) * p.r, z = LG.z + Math.cos(p.a) * p.r; p.g.position.set(x, 0.02 + Math.sin(t * 2 + p.r) * 0.02, z); p.g.rotation.y = p.a + Math.PI / 2; }
  }
  function atualizarGalinhas(dt, t) {
    for (const q of galinhas) {
      if (!q.alvo || Math.hypot(q.alvo[0] - q.x, q.alvo[1] - q.z) < 0.2 || Math.random() < dt * 0.1) q.alvo = [GL.x0 + 4 + Math.random() * (GL.x1 - GL.x0 - 4.8), GL.z0 + 0.8 + Math.random() * (GL.z1 - GL.z0 - 1.6)];
      const anda = Math.sin(t * 0.8 + q.fase) > 0;
      if (anda) passo(q, q.alvo[0], q.alvo[1], 0.9, dt);
      q.g.position.set(q.x, 0.03 + (anda ? Math.abs(Math.sin(t * 14 + q.fase)) * 0.06 : 0), q.z); q.g.rotation.set(anda ? 0 : Math.max(0, Math.sin(t * 5 + q.fase)) * 0.5, q.rot ?? 0, 0); // ciscando
    }
  }

  let perto = false;
  const api = {
    centro, paraMundo, paraLocal,
    get aberto() { return aberto; }, get estadoRegina() { return R.estado; },
    ligar(c) { ctx = c; },
    // a campainha (jogo.js · contexto): só com o portão fechado e a Tia Regina em casa
    contexto(p, noVeiculo = false) {
      if (noVeiculo || aberto || R.estado !== "casa" || Math.hypot(p.x - cbx, p.z - cbz) > 1.9) return null;
      return { rotulo: "🔔 Tocar a campainha", fazer: () => api.tocarCampainha() };
    },
    tocarCampainha() {
      if (aberto || R.estado !== "casa") return false;
      ctx?.sons?.campainha?.(); ctx?.falar?.("rp-sitio-campainha"); ctx?.dizer?.("Rabiscolândia", FALAS_SITIO["rp-sitio-campainha"], 3400);
      abrirPortao(); return true;
    },
    campainhaMundo: () => ({ x: cbx, z: cbz }),
    atualizar(dt, t, p) {
      const pl = paraLocal(p.x, p.z);
      const agora = Math.hypot(p.x - centro[0], p.z - centro[1]) < 160;
      if (!agora) { perto = false; return; }
      perto = true;
      if (abrindo) { portao = Math.min(1, portao + dt / 1.3); if (portao >= 1) { abrindo = false; aberto = true; solidoPortao.y1 = -1; } }
      for (const f of folhas) f.g.rotation.y = -f.s * portao * 1.75; // para dentro (-z)
      const plRot = ctx?.rotRabisco ? ctx.rotRabisco() - rot : 0;
      atualizarRegina(dt, t, pl);
      atualizarDuck(dt, t, pl, plRot);
      atualizarAle(dt, t, pl);
      atualizarGalinhas(dt, t);
      animarGotas(dt);
      if (marca.visible) marca.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    },
    // ---- para as cenas das missões (missoes-cenas.js) e para os testes
    reginaMundo: () => ({ x: mundoR[0], z: mundoR[1] }),
    aleMundo: () => { const [x, z] = A.modo === "colo" && A.rabisco ? [A.rabisco.position.x, A.rabisco.position.z] : paraMundo(A.x, A.z); return { x, z }; },
    duckMundo: () => { const [x, z] = paraMundo(K.x, K.z); return { x, z, modo: K.modo, molhado: K.molhado }; },
    marcaLagoMundo: () => { const [x, z] = paraMundo(...Q.marcaLago); return { x, z }; },
    perto: (p, o, r) => Math.hypot(p.x - o.x, p.z - o.z) < r,
    mostrarMarca(sim) { marca.visible = Boolean(sim); },
    get ale() { return A.modo; }, get duck() { return K.modo; },
    aleFugir() { if (A.modo === "colo") return; A.modo = "fugida"; A.x = 11; A.z = -17; A.alvo = null; ctx?.sons?.bichinho?.("quack"); },
    pegarAle(rabisco) {
      if (A.modo !== "fugida") return false;
      A.modo = "colo"; A.rabisco = rabisco.grupo;
      const sy = rabisco.grupo.scale.y || 1; rabisco.grupo.add(ale); ale.position.set(0, 0.6 / sy, 0.46 / sy); ale.rotation.set(0, 0, 0); ale.scale.setScalar(0.85 / sy); // no colo, abaixo do rosto
      return true;
    },
    soltarAle(fim) {
      if (A.modo !== "colo") return false;
      raiz.add(ale); ale.scale.setScalar(1.15); A.rabisco = null;
      A.modo = "voltando"; A.voo = 0; A.de = [...Q.marcaLago]; A.para = [LG.x, LG.z + 4.5]; A.fim = fim; return true;
    },
    cancelarAle() { if (A.modo === "colo") { raiz.add(ale); ale.scale.setScalar(1.15); A.rabisco = null; } A.modo = "lago"; A.fim = null; },
    duckNoLago() { if (K.modo === "lago" || K.modo === "pulandoLago" || K.modo === "indoLago") return; K.modo = "indoLago"; },
    chamarDuck(fim) { if (K.modo !== "lago") return false; K.modo = "chamado"; K.fim = fim; return true; },
    duckEntregar() { K.modo = "entregue"; K.t2 = 0; regina.comemorar(2.5); },
    cancelarDuck() { if (K.modo === "seguir" || K.modo === "sacudir" || K.modo === "chamado" || K.modo === "saindo") { secar(); K.modo = "brincar"; K.fim = null; } },
    info: () => ({ portao, aberto, regina: R.estado, ale: A.modo, duck: K.modo, molhado: K.molhado, perto }),
    // testes: onde estão as coisas para fotografar
    pontos: () => Object.fromEntries(Object.entries({ portao: [0, 1], casa: [(Q.casa.x0 + Q.casa.x1) / 2, Q.casa.z1], celeiro: [(Q.celeiro.x0 + Q.celeiro.x1) / 2, Q.celeiro.z1], varanda: [(Q.varanda.x0 + Q.varanda.x1) / 2, Q.varanda.frente], lago: [LG.x, LG.z], galinheiro: [(GL.x0 + GL.x1) / 2, (GL.z0 + GL.z1) / 2] }).map(([k, v]) => [k, paraMundo(...v)])),
  };
  regina.grupo.position.set(R.x, 0, R.z); regina.grupo.rotation.y = R.rot;
  return api;
}
