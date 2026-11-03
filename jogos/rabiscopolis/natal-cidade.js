// Rabiscolândia: o Natal na cidade (só existe com o modo Natal ligado, natal.js). Tudo o que é fixo vira UMA malha só:
// a árvore grande da praça (nasce da bacia do chafariz, com estrela, bolas, festão e presentes embaixo), o estábulo e as
// peças do presépio, as guirlandas nas portas das casas e das parceiras, os pinheirinhos na calçada das lojas de foto e os
// cordões de luzinhas (prédios perto da praça, Rua do Comércio, fachadas das parceiras e postes do miolo).
// As luzinhas piscam no próprio shader (fase por vértice: nada por quadro na CPU) e as peças do presépio aparecem por uma
// máscara (uniform), com um pulinho. Orçamento: 1 chamada de desenho para tudo isso (+1 da sombra na TV); na TV ainda tem
// o brilho das luzes de noite e o confete leve caindo na praça (1 chamada cada). No celular, só a malha.
// A música da praça (musica-cenas.js · NATAL_PRACA) toca quando o Rabisco está a pé perto da árvore.
//
//   const N = criarNatal(cena, ctx);   N.atualizar(dt, t, pos, livre)   N.presepio.mostrar(i)   N.info()

import { THREE, mat, texturaCanvas, mesclar } from "./base3d.js";
import { cx as pc, comArestas } from "./blocos.js";
import { PREDIOS, LUGARES, SEMAFOROS, BORDA_ANTIGA } from "./mapa.js";
import { ARVORE, PRESEPIO, LUZES, PECAS_PRESEPIO, FALAS_NATAL } from "./natal.js";
import { criarSequencia, NATAL_PRACA } from "./musica-cenas.js";

const FIXA = -1, BRILHA = -2; // aFase: peça comum · peça que brilha sem piscar (estrela, auréola). >= 0: luzinha que pisca
const N_PECAS = PECAS_PRESEPIO.length;

// ------------------------------------------------------------------ juntar tudo numa geometria só
function criarJuntador() {
  const pos = [], nrm = [], uv = [], cor = [], fase = [], peca = [], centro = [];
  const _m = new THREE.Matrix4(), _n = new THREE.Matrix3(), _v = new THREE.Vector3(), _c = new THREE.Color();
  const caixa = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  // geometria (sem índice) já no lugar, por uma matriz, com cor, fase e peça
  function por(geo, m, hex, f = FIXA, p = 0, ctr = null) {
    const g = geo.index ? geo.toNonIndexed() : geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    _n.getNormalMatrix(m); _c.setHex(hex);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(N, i).applyMatrix3(_n).normalize(); nrm.push(_v.x, _v.y, _v.z);
      uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0);
      cor.push(_c.r, _c.g, _c.b); fase.push(f); peca.push(p);
      centro.push(ctr?.x ?? 0, ctr?.y ?? 0, ctr?.z ?? 0);
    }
  }
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  // caixa w h d com o centro em x y z (giro em rx ry rz)
  function bloco(w, h, d, hex, x, y, z, { rx = 0, ry = 0, rz = 0, f = FIXA, p = 0, ctr = null } = {}) {
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(w, h, d));
    por(caixa, _m, hex, f, p, ctr);
  }
  // fio fininho de a até b
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0);
  function fio(a, b, hex = 0x1f4d2a, e = 0.035) {
    _a.set(...a); _b.set(...b); _d.subVectors(_b, _a); const l = _d.length(); if (l < 1e-3) return;
    _q.setFromUnitVectors(_y, _d.normalize());
    _m.compose(_p.addVectors(_a, _b).multiplyScalar(0.5), _q, _s.set(e, l, e));
    por(caixa, _m, hex);
  }
  // tudo o que está num grupo de malhas (montado com pc() de blocos.js), já na posição do grupo
  function grupo(g, { f = FIXA, p = 0, ctr = null } = {}) {
    g.updateMatrixWorld(true);
    g.traverse((o) => { if (o.isMesh) por(o.geometry, o.matrixWorld, o.material.color?.getHex() ?? 0xffffff, o.userData.fase ?? f, p, ctr); });
  }
  function malha() {
    const geo = new THREE.BufferGeometry(), F = (a, n) => new THREE.Float32BufferAttribute(a, n);
    geo.setAttribute("position", F(pos, 3)); geo.setAttribute("normal", F(nrm, 3)); geo.setAttribute("uv", F(uv, 2));
    geo.setAttribute("color", F(cor, 3)); geo.setAttribute("aFase", F(fase, 1)); geo.setAttribute("aPeca", F(peca, 1)); geo.setAttribute("aCentro", F(centro, 3));
    geo.computeBoundingSphere();
    return geo;
  }
  return { por, bloco, fio, grupo, malha, get vertices() { return pos.length / 3; } };
}

// material: plástico com cor por vértice + luzinhas que piscam (emissivo) + peças do presépio que aparecem com um pulinho
function materialNatal() {
  const m = comArestas(new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0x2c2c2c, shininess: 36 }));
  const arestas = m.onBeforeCompile;
  const U = { uTempo: { value: 0 }, uNoite: { value: 0 }, uMostra: { value: new Array(N_PECAS + 1).fill(1) } };
  m.onBeforeCompile = (sh) => {
    arestas(sh);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
attribute float aFase; attribute float aPeca; attribute vec3 aCentro;
uniform float uTempo; uniform float uMostra[${N_PECAS + 1}];
varying float vLuz;`).replace("#include <begin_vertex>", `#include <begin_vertex>
  float mostra = uMostra[int(aPeca + 0.5)];
  transformed = aCentro + (transformed - aCentro) * mostra;
  vLuz = aFase < -1.5 ? 1.0 : aFase < -0.5 ? 0.0 : 0.18 + 0.82 * smoothstep(-0.35, 0.45, sin(uTempo * 2.2 + aFase));`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
uniform float uNoite; varying float vLuz;`).replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  totalEmissiveRadiance += vColor.rgb * vLuz * (0.62 + 0.75 * uNoite);`);
  };
  m.customProgramCacheKey = () => "natal-cidade";
  // a sombra segue a mesma máscara (peça escondida não faz sombra)
  const sombra = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  sombra.onBeforeCompile = (sh) => {
    sh.uniforms.uMostra = U.uMostra;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\nattribute float aPeca; attribute vec3 aCentro; uniform float uMostra[${N_PECAS + 1}];`)
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n  transformed = aCentro + (transformed - aCentro) * uMostra[int(aPeca + 0.5)];");
  };
  sombra.customProgramCacheKey = () => "natal-sombra";
  return { m, U, sombra };
}

// ------------------------------------------------------------------ peças (montadas com caixas em grupos; viram vértices da malha única)
const PELE = 0xf2c7a0, PELE2 = 0xd9a37a, OLHO = 0x2a1d14, OURO = 0xf2b632, F = { sombra: false };
// rostinho: olhos e bochechas na frente da cabeça (cabeça de lado s, frente em z)
function rosto(g, y, z, s = 0.42) { for (const k of [-1, 1]) { pc(g, 0.06, 0.08, 0.02, OLHO, k * s * 0.2, y + 0.02, z + 0.01, F); pc(g, 0.07, 0.04, 0.02, 0xf29a9a, k * s * 0.3, y - 0.07, z + 0.01, F); } }
// pessoa de presépio: manto até o chão, mãos, cabeça com véu/turbante (cores) e, se tiver, barba, coroa e cajado
function figura({ manto, mantoClaro = manto, veu = null, faixa = null, barba = null, coroa = false, cajado = false, presente = null, ajoelhada = false, pele = PELE, altura = 1 }) {
  const g = new THREE.Group(), y0 = ajoelhada ? -0.42 : 0;
  pc(g, 0.66, 0.95 + y0, 0.52, manto, 0, (0.95 + y0) / 2, 0, F); // saia do manto
  if (ajoelhada) pc(g, 0.7, 0.32, 0.86, manto, 0, 0.16, 0.08, F); // joelhos dobrados
  const yT = 0.95 + y0;
  pc(g, 0.6, 0.55, 0.44, mantoClaro, 0, yT + 0.27, 0, F); // tronco
  pc(g, 0.18, 0.16, 0.16, pele, 0, yT + 0.25, 0.27, F); // mãos juntinhas
  const yC = yT + 0.55 + 0.21;
  pc(g, 0.42, 0.42, 0.4, pele, 0, yC, 0, F); rosto(g, yC, 0.2);
  if (veu) { pc(g, 0.5, 0.12, 0.48, veu, 0, yC + 0.25, -0.01, F); for (const k of [-1, 1]) pc(g, 0.06, 0.5, 0.46, veu, k * 0.24, yC - 0.02, -0.02, F); pc(g, 0.5, 0.62, 0.07, veu, 0, yC - 0.06, -0.23, F); pc(g, 0.64, 0.8, 0.1, veu, 0, yT + 0.2, -0.26, F); }
  if (faixa) pc(g, 0.46, 0.08, 0.44, faixa, 0, yC + 0.12, 0, F);
  if (barba) { pc(g, 0.36, 0.2, 0.08, barba, 0, yC - 0.17, 0.2, F); pc(g, 0.1, 0.05, 0.03, barba, 0, yC - 0.05, 0.21, F); }
  if (coroa) { pc(g, 0.46, 0.12, 0.44, OURO, 0, yC + 0.27, 0, F); for (const [x, z] of [[-0.18, 0.17], [0, 0.17], [0.18, 0.17], [-0.18, -0.17], [0.18, -0.17]]) pc(g, 0.09, 0.14, 0.09, OURO, x, yC + 0.39, z, F); pc(g, 0.07, 0.07, 0.03, 0xe8413c, 0, yC + 0.27, 0.23, F); }
  if (cajado) { pc(g, 0.07, 2.0, 0.07, 0x8a5a2b, 0.42, 1.0 + y0 / 2, 0.12, F); pc(g, 0.26, 0.07, 0.07, 0x8a5a2b, 0.32, 2.0 + y0 / 2, 0.12, F); pc(g, 0.07, 0.2, 0.07, 0x8a5a2b, 0.2, 1.92 + y0 / 2, 0.12, F); pc(g, 0.14, 0.14, 0.14, pele, 0.36, yT + 0.25, 0.14, F); }
  if (presente) { pc(g, 0.26, 0.22, 0.24, presente, 0, yT + 0.3, 0.36, F); pc(g, 0.3, 0.05, 0.28, OURO, 0, yT + 0.43, 0.36, F); }
  g.scale.setScalar(altura);
  return g;
}
function ovelha() {
  const g = new THREE.Group(), LA = 0xf7f6ef, CARA = 0x3a3a3a;
  pc(g, 0.62, 0.42, 0.82, LA, 0, 0.5, 0, F); pc(g, 0.5, 0.16, 0.66, 0xffffff, 0, 0.76, 0, F);
  for (const [x, z] of [[-0.2, 0.28], [0.2, 0.28], [-0.2, -0.28], [0.2, -0.28]]) pc(g, 0.1, 0.3, 0.1, CARA, x, 0.15, z, F);
  pc(g, 0.3, 0.3, 0.3, CARA, 0, 0.66, 0.5, F); pc(g, 0.34, 0.12, 0.2, LA, 0, 0.84, 0.44, F);
  for (const k of [-1, 1]) { pc(g, 0.16, 0.06, 0.08, CARA, k * 0.22, 0.7, 0.44, F); pc(g, 0.05, 0.05, 0.02, 0xffffff, k * 0.07, 0.7, 0.655, F); }
  return g;
}
// manjedoura com feno e o menino Jesus enroladinho (auréola dourada que brilha)
function manjedoura() {
  const g = new THREE.Group(), MD = 0x9a6232;
  pc(g, 1.3, 0.36, 0.62, MD, 0, 0.62, 0, F); pc(g, 1.18, 0.1, 0.5, 0xf2c94c, 0, 0.84, 0, F);
  for (const x of [-0.55, 0.55]) for (const s of [-1, 1]) pc(g, 0.08, 0.66, 0.08, 0x7a4a22, x, 0.3, s * 0.14, { ...F, rx: s * 0.5 });
  for (const [x, z, r] of [[-0.62, 0.2, 0.4], [0.6, -0.22, -0.5], [0.58, 0.24, 0.2]]) pc(g, 0.3, 0.04, 0.05, 0xf2c94c, x, 0.82, z, { ...F, ry: r });
  pc(g, 0.56, 0.22, 0.3, 0xfff6e6, 0.06, 0.97, 0, F); pc(g, 0.58, 0.05, 0.32, 0xf3e0c0, 0.06, 0.9, 0, F);
  pc(g, 0.24, 0.24, 0.24, PELE, -0.3, 1.0, 0, F); rosto(g, 1.0, 0.12, 0.24);
  const aur = new THREE.Group(); aur.position.set(-0.3, 1.16, -0.02); g.add(aur);
  for (const [w, d, x, z] of [[0.36, 0.05, 0, 0.16], [0.36, 0.05, 0, -0.16], [0.05, 0.36, 0.16, 0], [0.05, 0.36, -0.16, 0]]) { const b = pc(aur, w, 0.04, d, 0xffe27a, x, 0, z, F); b.userData.fase = BRILHA; }
  return g;
}
// estrela de 5 pontas em blocos (extrudada), dourada e brilhando
export function estrela(r = 0.7, prof = 0.22, hex = 0xffd23f) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: false }); geo.translate(0, 0, -prof / 2);
  const m = new THREE.Mesh(geo, mat(hex)); m.userData.fase = BRILHA;
  return m;
}
function presente(w, h, d, hex, fita) {
  const g = new THREE.Group();
  pc(g, w, h, d, hex, 0, h / 2, 0, F); pc(g, w + 0.03, h + 0.02, 0.14, fita, 0, h / 2, 0, F); pc(g, 0.14, h + 0.02, d + 0.03, fita, 0, h / 2, 0, F);
  for (const k of [-1, 1]) pc(g, 0.26, 0.16, 0.12, fita, k * 0.13, h + 0.09, 0, { ...F, rz: k * 0.45 });
  pc(g, 0.12, 0.12, 0.12, fita, 0, h + 0.07, 0, F);
  return g;
}
function guirlanda(r = 0.42) {
  const g = new THREE.Group(), V = [0x2e8b3a, 0x3fa34a, 0x237a33];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; pc(g, 0.26, 0.26, 0.12, V[i % 3], Math.cos(a) * r, Math.sin(a) * r, 0, { ...F, rz: a }); }
  for (const a of [0.6, 2.1, 3.7, 5.0]) pc(g, 0.09, 0.09, 0.09, 0xe8413c, Math.cos(a) * r, Math.sin(a) * r, 0.08, F);
  for (const k of [-1, 1]) pc(g, 0.22, 0.14, 0.06, 0xd62839, k * 0.12, -r - 0.02, 0.08, { ...F, rz: k * 0.4 });
  pc(g, 0.08, 0.26, 0.05, 0xd62839, 0.06, -r - 0.18, 0.08, { ...F, rz: 0.2 }); pc(g, 0.08, 0.26, 0.05, 0xd62839, -0.06, -r - 0.18, 0.08, { ...F, rz: -0.2 });
  return g;
}
// pinheirinho em vaso, para a calçada das lojas de foto (luzinhas à parte)
function pinheirinho() {
  const g = new THREE.Group();
  pc(g, 0.9, 0.6, 0.9, 0xc8323c, 0, 0.3, 0, F); pc(g, 1.0, 0.12, 1.0, 0xffffff, 0, 0.62, 0, F);
  for (let i = 0; i < 4; i++) pc(g, 1.3 - i * 0.28, 0.42, 1.3 - i * 0.28, i % 2 ? 0x3fa34a : 0x2e8b3a, 0, 0.88 + i * 0.4, 0, { ...F, ry: i % 2 ? Math.PI / 4 : 0 });
  return g;
}

// anjinho do presépio: quem pede a missão do presépio (missoes.js · tipo "anjo"). Peça de presépio em blocos, uma malha só
// (a praça já estava no limite de desenho do celular): túnica branca com faixa dourada, asas, cabelo cacheado e auréola
export function anjo() {
  const g = new THREE.Group(), BR = 0xfdfdfd, AZ = 0xeaf4ff;
  pc(g, 0.74, 0.5, 0.6, BR, 0, 0.25, 0, F); pc(g, 0.64, 0.5, 0.52, BR, 0, 0.72, 0, F); pc(g, 0.56, 0.42, 0.46, AZ, 0, 1.1, 0, F); // túnica em degraus
  pc(g, 0.68, 0.1, 0.56, OURO, 0, 0.94, 0, F); // faixa dourada
  for (const k of [-1, 1]) { pc(g, 0.16, 0.42, 0.16, AZ, k * 0.34, 1.08, 0.08, { ...F, rz: k * 0.25 }); pc(g, 0.13, 0.13, 0.13, PELE, k * 0.38, 0.86, 0.14, F); } // bracinhos
  const yC = 1.54;
  pc(g, 0.42, 0.42, 0.4, PELE, 0, yC, 0, F); rosto(g, yC, 0.2);
  pc(g, 0.48, 0.14, 0.46, 0xf2c94c, 0, yC + 0.24, -0.02, F); for (const k of [-1, 1]) pc(g, 0.08, 0.3, 0.44, 0xf2c94c, k * 0.24, yC + 0.06, -0.03, F); pc(g, 0.46, 0.34, 0.08, 0xf2c94c, 0, yC + 0.04, -0.22, F); // cabelo
  for (const [w, d, x, z] of [[0.46, 0.06, 0, 0.2], [0.46, 0.06, 0, -0.2], [0.06, 0.46, 0.2, 0], [0.06, 0.46, -0.2, 0]]) pc(g, w, 0.05, d, 0xffd23f, x, yC + 0.5, z, F); // auréola
  for (const k of [-1, 1]) { pc(g, 0.5, 0.62, 0.07, BR, k * 0.45, 1.24, -0.32, { ...F, rz: k * 0.4 }); pc(g, 0.36, 0.38, 0.07, AZ, k * 0.56, 0.86, -0.32, { ...F, rz: -k * 0.25 }); } // asas
  const m = new THREE.Group(); m.add(g); mesclar(m);
  return m;
}

// ------------------------------------------------------------------ montagem
export function criarNatal(cena, ctx) {
  const { mundo, ceu } = ctx;
  const toque = Boolean(ctx.toque);
  const J = criarJuntador();
  const lampadas = []; // [x, y, z, cor, fase] (para o brilho de noite)
  const novosSolidos = [];
  let nLuz = 0;
  const luz = (x, y, z, cor = null, tam = 0.17) => {
    const c = cor ?? LUZES.cores[nLuz % LUZES.cores.length], f = ((nLuz * 2.39996) % (Math.PI * 2));
    nLuz++;
    J.bloco(tam, tam, tam, c, x, y, z, { f }); lampadas.push([x, y, z, c, f]);
  };
  // cordão em "barriguinhas" (festão) de a até b, preso a cada ~4 m, com uma luzinha a cada ~0,8 m
  function cordao(a, b, { caida = 0.45, passo = 0.8, fioCor = 0x1f4d2a, tam = 0.17 } = {}) {
    const [ax, ay, az] = a, [bx, by, bz] = b, L = Math.hypot(bx - ax, bz - az, by - ay);
    const vaos = Math.max(1, Math.round(L / 4)), n = Math.max(2, Math.round(L / passo));
    const pt = (k) => { const u = k / n, v = (u * vaos) % 1; return [ax + (bx - ax) * u, ay + (by - ay) * u - Math.sin(v * Math.PI) * caida, az + (bz - az) * u]; };
    let ant = pt(0);
    for (let k = 1; k <= n; k++) { const p = pt(k); J.fio(ant, p, fioCor); ant = p; if (k < n) luz(p[0], p[1] - 0.1, p[2], null, tam); }
  }
  // ---- 1. a árvore grande (na bacia do chafariz: o jato some no Natal)
  const A = ARVORE, NIV = 10, H = 0.98;
  const arv = new THREE.Group(); arv.position.set(A.x, 0, A.z);
  const VERDES = [0x2e8b3a, 0x3fa34a];
  for (let i = 0; i < NIV; i++) {
    const w = 7.4 * (1 - i / (NIV + 1.6)), y = A.base + i * H, gir = i % 2 ? Math.PI / 4 : 0;
    pc(arv, w, H + 0.06, w, VERDES[i % 2], 0, y + H / 2, 0, { sombra: true, ry: gir });
    // festão dourado na beira de baixo de cada andar e luzinhas nele; bolas nos cantos
    const hs = w / 2, cs = Math.cos(gir), sn = Math.sin(gir), rot = (x, z) => [A.x + x * cs + z * sn, A.z - x * sn + z * cs];
    for (const [x, z, ry] of [[0, hs + 0.04, 0], [0, -hs - 0.04, 0], [hs + 0.04, 0, Math.PI / 2], [-hs - 0.04, 0, Math.PI / 2]]) pc(arv, w + 0.08, 0.1, 0.08, 0xf2c94c, ...[x * cs + z * sn, y + 0.08, -x * sn + z * cs], { ...F, ry: gir + ry });
    const nb = Math.max(3, Math.round(w / 0.75));
    for (const lado of [0, 1, 2, 3]) for (let k = 0; k < nb; k++) {
      const u = -hs + (w * (k + 0.5)) / nb, [lx, lz] = [[u, hs + 0.1], [hs + 0.1, -u], [-u, -hs - 0.1], [-hs - 0.1, u]][lado];
      const [wx, wz] = rot(lx, lz); luz(wx, y + 0.2, wz, null, 0.2);
    }
    for (const [cx, cz] of [[hs, hs], [-hs, hs], [hs, -hs], [-hs, -hs]]) { const [wx, wz] = rot(cx * 1.02, cz * 1.02); J.bloco(0.4, 0.4, 0.4, [0xd62839, OURO, 0x2f8fe8, 0xdfe6ee][(i + (cx > 0) + (cz > 0) * 2) % 4], wx, y - 0.02, wz, { ry: gir }); }
  }
  const topoY = A.base + NIV * H;
  pc(arv, 0.5, 0.6, 0.5, 0x2e8b3a, 0, topoY + 0.25, 0, F);
  J.grupo(arv);
  const est = estrela(0.85, 0.28); est.position.set(A.x, topoY + 1.1, A.z); J.grupo(est);
  const est2 = estrela(0.85, 0.28); est2.position.set(A.x, topoY + 1.1, A.z); est2.rotation.y = Math.PI / 2; J.grupo(est2);
  lampadas.push([A.x, topoY + 1.1, A.z, 0xffe27a, -1, 3.2]);
  novosSolidos.push({ x0: A.x - 3.75, x1: A.x + 3.75, z0: A.z - 3.75, z1: A.z + 3.75, y1: topoY + 1 });
  // presentes em volta da bacia (o lado sul fica livre: é a frente do presépio)
  const CORES_P = [[0xd62839, 0xf2c94c], [0x2f8fe8, 0xffffff], [0x3fa34a, 0xd62839], [0xf2c94c, 0xd62839], [0xec2e8c, 0xffffff], [0x8e6cff, 0xf2c94c], [0xffffff, 0x3fa34a], [0xff7a00, 0x2f8fe8]];
  [40, 72, 108, 145, 215, 252, 288, 320].forEach((g, i) => {
    const a = (g * Math.PI) / 180, r = 5.55 + (i % 2) * 0.35, x = A.x + Math.sin(a) * r, z = A.z + Math.cos(a) * r;
    const w = 0.8 + ((i * 37) % 5) * 0.12, h = 0.6 + ((i * 53) % 4) * 0.15, [c, f] = CORES_P[i];
    const p = presente(w, h, w * 0.9, c, f); p.position.set(x, 0.11, z); p.rotation.y = a * 0.7; J.grupo(p);
    if (i % 2) { const q = presente(0.5, 0.42, 0.5, CORES_P[(i + 3) % 8][0], CORES_P[(i + 3) % 8][1]); q.position.set(x + Math.cos(a) * 0.7, 0.11, z - Math.sin(a) * 0.7); q.rotation.y = a; J.grupo(q); }
    novosSolidos.push({ x0: x - 0.7, x1: x + 0.7, z0: z - 0.7, z1: z + 0.7, y1: h + 0.2 });
  });

  // ---- 2. o estábulo do presépio (sempre) e as 7 peças (aparecem quando a criança monta; ficam depois de montado)
  const P = PRESEPIO, cP = Math.cos(P.rot), sP = Math.sin(P.rot);
  const noPresepio = (lx, ly, lz) => new THREE.Vector3(P.x + lx * cP + lz * sP, ly, P.z - lx * sP + lz * cP);
  const est0 = new THREE.Group(); est0.position.set(P.x, 0, P.z); est0.rotation.y = P.rot;
  const MD = 0x9a6232, MD2 = 0x7a4a22, PALHA = 0xe0b04a, PALHA2 = 0xc8902f;
  pc(est0, 6.8, 0.24, 3.9, 0x8a5a2b, 0, 0.29, 0, F); // estrado
  for (let i = 0; i < 9; i++) pc(est0, 0.72, 2.95, 0.18, i % 2 ? 0xc08a52 : 0xa8743e, -2.9 + i * 0.725, 0.41 + 1.47, -1.8, F); // fundo de tábuas (claro: as peças aparecem)
  for (const k of [-1, 1]) {
    for (const z of [-1.8, 1.75]) pc(est0, 0.3, 3.15, 0.3, MD2, k * 3.25, 0.41 + 1.57, z, F); // postes
    pc(est0, 0.16, 1.3, 3.5, MD, k * 3.25, 0.41 + 0.65, 0, F); // meia parede do lado
  }
  pc(est0, 6.8, 0.26, 0.3, MD2, 0, 3.55, 1.75, F); pc(est0, 6.8, 0.26, 0.3, MD2, 0, 3.55, -1.8, F); // vigas
  for (const k of [-1, 1]) { pc(est0, 7.4, 0.26, 2.55, PALHA, 0, 3.98, k * 1.02, { ...F, rx: k * 0.5 }); pc(est0, 7.5, 0.12, 0.4, PALHA2, 0, 3.48, k * 2.2, { ...F, rx: k * 0.5 }); } // telhado de palha
  pc(est0, 7.5, 0.22, 0.34, PALHA2, 0, 4.55, 0, F); // cumeeira
  for (const [x, z, w] of [[-2.55, -1.2, 1.1], [2.55, -1.2, 1.0], [2.65, -0.2, 0.8]]) { pc(est0, w, 0.5, 0.8, 0xf2c94c, x, 0.66, z, F); pc(est0, w - 0.1, 0.06, 0.7, PALHA2, x, 0.94, z, F); } // fardos de feno
  pc(est0, 0.1, 0.5, 0.1, 0x2f3440, 1.9, 3.15, 1.6, F); pc(est0, 0.3, 0.36, 0.3, 0xffe39a, 1.9, 2.78, 1.6, F).userData.fase = BRILHA; // lampião
  J.grupo(est0);
  { const l = noPresepio(1.9, 2.78, 1.6); lampadas.push([l.x, l.y, l.z, 0xffd27a, -1, 2.4]); }
  novosSolidos.push({ x0: P.x - 3.45, x1: P.x + 3.45, z0: P.z - 2.0, z1: P.z + 2.0, y1: 3.4 });
  // as peças: [lx, ly, lz, ry] no estábulo (frente para +z local, onde chega quem visita)
  const PECAS = {
    maria: () => { const f = figura({ manto: 0x2f6fd0, mantoClaro: 0x4f8ae0, veu: 0x2f6fd0, ajoelhada: true, altura: 1.05 }); return [f, -1.0, 0.41, 0.7, 0.5]; },
    jose: () => { const f = figura({ manto: 0x8a5a2b, mantoClaro: 0xa0703c, faixa: 0xd8c3a0, barba: 0x5a3a1c, cajado: true, altura: 1.08 }); return [f, 1.3, 0.41, 0.45, -0.45]; },
    menino: () => [manjedoura(), 0.12, 0.41, 0.95, 0],
    pastores: () => { const g = new THREE.Group(); const a = figura({ manto: 0x7a8c3a, faixa: 0xffffff, veu: 0xd8c3a0, cajado: true, altura: 1.0 }); a.position.set(0, 0, 0); g.add(a); const b = figura({ manto: 0xc49a5a, mantoClaro: 0xd8b27a, veu: 0x5b8fd9, faixa: 0xffffff, barba: 0x6b4a2a, altura: 0.98 }); b.position.set(1.0, 0, -0.6); g.add(b); return [g, 2.55, 0.12, 2.55, -0.45]; },
    ovelhas: () => { const g = new THREE.Group(); for (const [x, z, r, s] of [[0, 0, 0.3, 1], [1.05, 0.35, -0.5, 0.9], [-1.15, 0.5, 0.9, 0.85]]) { const o = ovelha(); o.position.set(x, 0, z); o.rotation.y = r; o.scale.setScalar(s); g.add(o); } return [g, 0.4, 0.12, 2.75, 0]; },
    estrela: () => [estrela(0.62, 0.22), 0, 5.35, 0.25, 0],
    magos: () => { const g = new THREE.Group(); [[0x7a4fd1, 0xc8a2ff, 0xf2c94c, null], [0xc8323c, 0xe86a6a, 0xffffff, 0xcfcfcf], [0x1f8a7a, 0x4fbfae, 0x5a3a1c, 0x2a1a10]].forEach(([m, mc, pr, bb], i) => { const f = figura({ manto: m, mantoClaro: mc, coroa: true, barba: bb, presente: pr === 0xffffff ? 0xd9a520 : pr, pele: i === 2 ? PELE2 : PELE, altura: 1.06 }); f.position.set(i * 0.85, 0, [0, 0.45, 0.7][i]); f.rotation.y = -0.2 * i; g.add(f); }); return [g, -3.9, 0.12, 2.4, 0.35]; },
  };
  const pecas = PECAS_PRESEPIO.map((id, i) => {
    const [g, lx, ly, lz, ry] = PECAS[id]();
    const w = noPresepio(lx, ly, lz);
    g.position.copy(w); g.rotation.y += P.rot + ry;
    const ctr = new THREE.Vector3(w.x, ly, w.z);
    J.grupo(g, { p: i + 1, ctr });
    if (id === "estrela") lampadas.push([w.x, w.y, w.z, 0xffe27a, -1, 2.2, i + 1]);
    if (id === "menino") { const h = noPresepio(lx - 0.3 + 0.12, 1.6, lz); lampadas.push([h.x, h.y, h.z, 0xfff0b0, -1, 2.6, i + 1]); }
    // quem fica na frente do estábulo vira obstáculo quando aparece
    const sol = ly < 0.3 ? (() => { const b = new THREE.Box3().setFromObject(g); return { x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, y1: 1.6 }; })() : null;
    return { id, ctr, sol, visivel: false };
  });

  // ---- 3. luzinhas e guirlandas pela cidade
  // prédios perto da praça e da Rua do Comércio: cordão no alto do térreo, de ponta a ponta da fachada
  const nPredios = { n: 0 };
  const lugaresMundoDe = (id) => (mundo.lugares ?? []).find((q) => q.id === id);
  PREDIOS.forEach((p, i) => {
    const d = Math.hypot(p.cx, p.cz - A.z), comercio = p.cx > 50 && p.cx < 150 && Math.abs(p.cz) < 45;
    if (!(d < LUZES.raioPredios || comercio) || i % 3 === 2) return;
    const [dx, dz] = p.dir, deitado = Math.abs(dx) > 0.5, fx = dx > 0 ? p.x1 : dx < 0 ? p.x0 : 0, fz = dz > 0 ? p.z1 : dz < 0 ? p.z0 : 0;
    const off = 0.32, y = 3.75;
    const a = deitado ? [fx + dx * off, y, p.z0 + 0.5] : [p.x0 + 0.5, y, fz + dz * off], b = deitado ? [fx + dx * off, y, p.z1 - 0.5] : [p.x1 - 0.5, y, fz + dz * off];
    cordao(a, b); nPredios.n++;
  });
  // prédios da cidade em volta (hospital, biblioteca, bombeiros e o comércio): cordão na frente, no alto do térreo
  for (const id of ["hospital", "biblioteca", "bombeiros", "mercado", "padaria", "sorveteria"]) {
    const l = lugaresMundoDe(id); if (!l?.pegada) continue;
    const [dx, dz] = l.dir, fx = l.x - dx * (l.recuo - 0.45), fz = l.z - dz * (l.recuo - 0.45), lx = dz ? 1 : 0, lz = dz ? 0 : 1, w = l.pegada[0] / 2 - 0.6;
    cordao([fx - lx * w, 4.3, fz - lz * w], [fx + lx * w, 4.3, fz + lz * w]); nPredios.n++;
  }
  // fachadas das parceiras: guirlanda na porta e, nas fachadas inventadas, um cordão discreto no alto da frente;
  // nas lojas de foto (a foto é a fachada real), dois pinheirinhos com luzinhas na calçada, um de cada lado
  const lugaresMundo = mundo.lugares ?? [];
  let nParceiras = 0;
  for (const l of lugaresMundo.filter((q) => q.parceiro)) {
    const rot = l.rot, c = Math.cos(rot), s = Math.sin(rot), [dx, dz] = l.dir;
    if (l.origem && l.porta) {
      const [ox, oz] = l.origem, aLocal = (wx, wz) => { const x = wx - ox, z = wz - oz; return [x * c - z * s, x * s + z * c]; };
      const mundoL = (x, z) => [ox + x * c + z * s, oz - x * s + z * c];
      const [px] = aLocal(...l.porta);
      const gu = guirlanda(0.4); const [gx, gz] = mundoL(px, 0.3); gu.position.set(gx, 2.45, gz); gu.rotation.y = rot; J.grupo(gu);
      const w = (l.pegada?.[0] ?? 16) - 1.4, y = Math.min((l.topo ?? 9) - 0.7, 8.5), z = 0.4;
      const [ax, az] = mundoL(-w / 2, z), [bx, bz] = mundoL(w / 2, z);
      cordao([ax, y, az], [bx, y, bz], { caida: 0.3, passo: 0.9 });
    } else {
      const w = Math.min(l.pegada?.[0] ?? 16, 17), fx = l.x - dx * (l.recuo ?? 1), fz = l.z - dz * (l.recuo ?? 1), lx = dz ? 1 : 0, lz = dz ? 0 : 1;
      for (const k of [-1, 1]) {
        const x = fx + dx * 1.3 + lx * k * (w / 2 - 0.9), z = fz + dz * 1.3 + lz * k * (w / 2 - 0.9);
        const pi = pinheirinho(); pi.position.set(x, 0.07, z); J.grupo(pi);
        for (let q = 0; q < 10; q++) { const a = q * 1.25, rr = 0.68 - q * 0.05; luz(x + Math.cos(a) * rr, 0.85 + q * 0.16, z + Math.sin(a) * rr, null, 0.13); }
        novosSolidos.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5, y1: 2.4 });
      }
    }
    nParceiras++;
  }
  // guirlanda na porta das casas do Bairro das Casas e da Vila das Flores
  let nCasas = 0;
  for (const k of mundo.casas ?? []) {
    if (k.lote.numero > 16) continue;
    const [dx, dz] = k.lote.dir, [px, pz] = k.porta;
    const gu = guirlanda(0.3); gu.position.set(px - dx * 1.2 + dx * 0.33, 2.15, pz - dz * 1.2 + dz * 0.33); gu.rotation.y = k.lote.rot; J.grupo(gu); nCasas++;
  }
  // postes do miolo: luzinhas em espiral (o poste é um sólido de 0,5 × 0,5 e 5 m; os dos semáforos ficam de fora)
  let nPostes = 0;
  for (const s of mundo.solidos) {
    if (s.y1 !== 5 || Math.abs(s.x1 - s.x0 - 0.5) > 1e-3 || Math.abs(s.z1 - s.z0 - 0.5) > 1e-3) continue;
    const x = (s.x0 + s.x1) / 2, z = (s.z0 + s.z1) / 2;
    if (Math.hypot(x, z - A.z) > LUZES.raioPostes || Math.max(Math.abs(x), Math.abs(z)) > BORDA_ANTIGA || SEMAFOROS.some((q) => Math.hypot(q.x - x, q.z - z) < 11)) continue;
    for (let q = 0; q < 12; q++) { const a = q * 0.95 + nPostes; luz(x + Math.cos(a) * 0.2, 1.05 + q * 0.29, z + Math.sin(a) * 0.2, null, 0.13); }
    // lacinho vermelho no alto
    J.bloco(0.34, 0.2, 0.1, 0xd62839, x, 4.55, z + 0.14, { rz: 0.4 }); J.bloco(0.34, 0.2, 0.1, 0xd62839, x, 4.55, z + 0.14, { rz: -0.4 });
    nPostes++;
  }
  // cordões atravessando a rua (como no centro das cidades no Natal): mastro nas duas calçadas, festão com luzes maiores e
  // uma estrela pendurada no meio. Rua do Comércio, Avenida da Alegria (frente da praça e do parque) e Avenida da Esperança
  const livreAqui = (x, z) => !mundo.solidos.some((s) => x > s.x0 - 0.8 && x < s.x1 + 0.8 && z > s.z0 - 0.8 && z < s.z1 + 0.8);
  let nTravessas = 0;
  const TRAVESSAS = [...[64, 84, 104, 126, 148].map((x) => ({ x, z: 0, eixo: "z", meia: 7.4 })), ...[-30, -10, 10, 30].map((x) => ({ x, z: 50, eixo: "z", meia: 7.6 })), ...[-14, 14].map((x) => ({ x, z: -50, eixo: "z", meia: 7.6 }))];
  for (const T of TRAVESSAS) {
    let x = T.x;
    for (let k = 0; k < 6 && !(livreAqui(x, T.z - T.meia) && livreAqui(x, T.z + T.meia)); k++) x += 1.6;
    if (!(livreAqui(x, T.z - T.meia) && livreAqui(x, T.z + T.meia))) continue;
    for (const s of [-1, 1]) {
      const z = T.z + s * T.meia;
      J.bloco(0.4, 0.3, 0.4, 0x3d4d70, x, 0.15, z); J.bloco(0.14, 6.4, 0.14, 0x2f3d5c, x, 3.3, z);
      const e = estrela(0.26, 0.1); e.position.set(x, 6.75, z); e.rotation.y = Math.PI / 2; J.grupo(e);
      novosSolidos.push({ x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25, y1: 6.5 });
    }
    cordao([x, 6.2, T.z - T.meia], [x, 6.2, T.z + T.meia], { caida: 1.0, passo: 0.7, tam: 0.22 });
    const meio = estrela(0.42, 0.14); meio.position.set(x, 4.75, T.z); meio.rotation.y = Math.PI / 2; J.grupo(meio); J.fio([x, 5.2, T.z], [x, 4.95, T.z], 0x1f4d2a, 0.03);
    lampadas.push([x, 4.75, T.z, 0xffe27a, -1, 1.8]);
    nTravessas++;
  }

  // ---- a malha única
  const { m: material, U, sombra } = materialNatal();
  const geo = J.malha();
  const malhaNatal = new THREE.Mesh(geo, material);
  malhaNatal.customDepthMaterial = sombra;
  malhaNatal.castShadow = !toque; malhaNatal.receiveShadow = true; malhaNatal.frustumCulled = false; malhaNatal.name = "natal";
  // a sombra só da árvore, do estábulo e dos presentes conta: a malha inteira projeta (custa 1 chamada a mais na TV)
  const raiz = new THREE.Group(); raiz.name = "natal"; raiz.add(malhaNatal); cena.add(raiz);
  mundo.solidos.push(...novosSolidos);

  // ---- brilho das luzes de noite (TV) e confete leve caindo na praça (TV)
  let brilho = null, confete = null;
  if (!toque) {
    const n = lampadas.length, bp = new Float32Array(n * 3), bc = new Float32Array(n * 3), bf = new Float32Array(n), bt = new Float32Array(n), bpc = new Float32Array(n), cc = new THREE.Color();
    lampadas.forEach(([x, y, z, c, f, tam = 1, pq = 0], i) => { bp.set([x, y, z], i * 3); cc.setHex(c); bc.set([cc.r, cc.g, cc.b], i * 3); bf[i] = f; bt[i] = tam; bpc[i] = pq; });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(bp, 3)); g.setAttribute("color", new THREE.BufferAttribute(bc, 3)); g.setAttribute("aFase", new THREE.BufferAttribute(bf, 1)); g.setAttribute("aTam", new THREE.BufferAttribute(bt, 1)); g.setAttribute("aPeca", new THREE.BufferAttribute(bpc, 1));
    const tex = texturaCanvas(64, 64, (c2) => { const gr = c2.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64); });
    const m = new THREE.PointsMaterial({ size: 1.35, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTempo = U.uTempo; sh.uniforms.uMostra = U.uMostra;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\nattribute float aFase; attribute float aTam; attribute float aPeca; uniform float uTempo; uniform float uMostra[${N_PECAS + 1}]; varying float vLuz;`)
        .replace("#include <color_vertex>", `#include <color_vertex>\n  vLuz = (aFase < -0.5 ? 1.0 : 0.15 + 0.85 * smoothstep(-0.35, 0.45, sin(uTempo * 2.2 + aFase))) * uMostra[int(aPeca + 0.5)];`)
        .replace("gl_PointSize = size;", "gl_PointSize = size * aTam;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vLuz;").replace("#include <color_fragment>", "#include <color_fragment>\n  diffuseColor.a *= vLuz;");
    };
    m.customProgramCacheKey = () => "natal-brilho";
    brilho = new THREE.Points(g, m); brilho.frustumCulled = false; brilho.visible = false; raiz.add(brilho);
    // confete: quadradinhos coloridos caindo devagar em volta da árvore (o shader faz cair: nada por quadro)
    const NC = 320, cp = new Float32Array(NC * 3), ccor = new Float32Array(NC * 3), cf = new Float32Array(NC);
    const CORES_C = [0xffffff, 0xffffff, 0xffe9a8, 0xffc2d6, 0xbfe6ff, 0xd62839, 0x3fa34a, 0xf2c94c];
    for (let i = 0; i < NC; i++) { const a = i * 2.39996, r = 3.5 + ((i * 7919) % 1000) / 1000 * 18; cp.set([A.x + Math.cos(a) * r, ((i * 104729) % 1000) / 1000 * 16, A.z + Math.sin(a) * r], i * 3); cc.setHex(CORES_C[i % CORES_C.length]); ccor.set([cc.r, cc.g, cc.b], i * 3); cf[i] = (i * 0.618) % 1; }
    const gc = new THREE.BufferGeometry(); gc.setAttribute("position", new THREE.BufferAttribute(cp, 3)); gc.setAttribute("color", new THREE.BufferAttribute(ccor, 3)); gc.setAttribute("aFase", new THREE.BufferAttribute(cf, 1));
    const texC = texturaCanvas(32, 32, (c2) => { c2.fillStyle = "#ffffff"; c2.fillRect(8, 8, 16, 16); });
    const mc = new THREE.PointsMaterial({ size: 0.26, map: texC, vertexColors: true, transparent: true, alphaTest: 0.5 });
    mc.onBeforeCompile = (sh) => {
      sh.uniforms.uTempo = U.uTempo;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aFase; uniform float uTempo;")
        .replace("#include <begin_vertex>", `#include <begin_vertex>
  transformed.y = 0.2 + mod(transformed.y - uTempo * (0.55 + aFase * 0.5), 16.0);
  transformed.x += sin(uTempo * 0.8 + aFase * 9.0) * 0.5; transformed.z += cos(uTempo * 0.6 + aFase * 7.0) * 0.5;`);
    };
    mc.customProgramCacheKey = () => "natal-confete";
    confete = new THREE.Points(gc, mc); confete.frustumCulled = false; raiz.add(confete);
  }

  // ---- o jato e a água do chafariz da praça somem (a árvore está na bacia)
  const jato = mundo.anima?.jatos?.[0], agua = mundo.anima?.aguas?.[0];
  if (jato) jato.visible = false;
  if (agua) agua.visible = false; // a árvore cobre a bacia: a água não aparece (e no celular cada chamada conta)

  // ---- presépio: o que aparece
  const anima = []; // [i, t]
  function mostrar(i, animar = true) {
    const q = pecas[i]; if (!q || q.visivel) return;
    q.visivel = true; U.uMostra.value[i + 1] = animar ? 0.001 : 1;
    if (animar) anima.push({ i, t: 0 });
    if (q.sol) mundo.solidos.push(q.sol);
  }
  function esconderTudo() {
    pecas.forEach((q, i) => { q.visivel = false; U.uMostra.value[i + 1] = 0; if (q.sol) { const k = mundo.solidos.indexOf(q.sol); if (k >= 0) mundo.solidos.splice(k, 1); } });
    anima.length = 0;
  }
  const montadoAntes = () => (ctx.salvo?.()?.missoesFeitas ?? []).includes("natalPresepio");
  esconderTudo();
  if (montadoAntes()) pecas.forEach((q, i) => mostrar(i, false));

  // ---- música da praça
  let musica = null, volMus = 0, saudou = false, tVida = 0;
  function atualizar(dt, t, p, livre = true) {
    U.uTempo.value = t; tVida += dt;
    const noite = ceu?.noite ?? 0; U.uNoite.value = noite;
    if (brilho) { brilho.visible = noite > 0.05; brilho.material.opacity = Math.min(1, noite * 1.1) * 0.9; }
    const dTree = Math.hypot(p.x - A.x, p.z - A.z);
    if (confete) confete.visible = dTree < 70;
    // pulinho de quem acabou de chegar no presépio (cresce, passa um pouco e volta)
    for (let k = anima.length - 1; k >= 0; k--) {
      const a = anima[k]; a.t += dt;
      const u = Math.min(1, a.t / 0.55), s = u < 1 ? Math.sin(u * Math.PI * 0.5) * 1.18 - Math.max(0, u - 0.75) * 0.72 : 1;
      U.uMostra.value[a.i + 1] = Math.max(0.001, u >= 1 ? 1 : s);
      if (u >= 1) anima.splice(k, 1);
    }
    // a música: de perto e a pé, mais alta quanto mais perto (sobe e desce devagar)
    const alvo = livre && dTree < 34 ? Math.min(1, (34 - dTree) / 18) : 0;
    volMus += (alvo - volMus) * Math.min(1, dt * 1.5);
    if (alvo > 0 && !musica) { musica = criarSequencia(NATAL_PRACA); musica.iniciar(0.3); }
    if (musica) { musica.volume(volMus); musica.atualizar(); if (alvo === 0 && volMus < 0.02) { musica.parar(0.4); musica = null; } }
    // "Feliz Natal!" uma vez, perto da árvore (depois das boas-vindas do começo)
    if (!saudou && tVida > 9 && dTree < 26 && livre && !ctx.ocupado?.()) { saudou = true; ctx.falar?.("rp-natal-praca"); ctx.dizer?.("Rabiscolândia", `🎄 ${FALAS_NATAL["rp-natal-praca"]}`, 4600); }
  }
  const api = {
    grupo: raiz, malha: malhaNatal, atualizar,
    presepio: {
      total: N_PECAS, pecas: PECAS_PRESEPIO, mostrar, esconderTudo,
      mostrarTudo: () => pecas.forEach((q, i) => mostrar(i, false)),
      get colocadas() { return pecas.filter((q) => q.visivel).length; },
      get montado() { return pecas.every((q) => q.visivel); },
      centro: [P.x, P.z],
    },
    pararMusica() { if (musica) { musica.parar(0.3); musica = null; } },
    // testes: o que existe e quanto custa
    info: () => ({
      ligado: true, lampadas: lampadas.length, predios: nPredios.n, travessas: nTravessas, parceiras: nParceiras, casas: nCasas, postes: nPostes, vertices: J.vertices,
      arvore: { x: A.x, z: A.z, topo: topoY + 1.1 }, pecas: pecas.filter((q) => q.visivel).map((q) => q.id), montado: pecas.every((q) => q.visivel),
      musica: Boolean(musica), volume: +volMus.toFixed(2), brilho: Boolean(brilho?.visible), confete: Boolean(confete?.visible), jato: jato ? jato.visible : null,
    }),
  };
  return api;
}
