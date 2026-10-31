// Rabisco Kart em estilo de blocos: mundo de caixas coloridas, plástico liso, sem contorno preto no cenário e céu limpo.
// Tudo original (caixas, pinos e a paleta da Educarte). Este arquivo é só do Kart: nada de src/motor3d/toon.js nem objetos.js
// muda, então os outros jogos continuam idênticos. O Rabisco oficial (src/motor3d/rabisco3d.js) não é tocado: o jogo.js só
// monta o kart em volta dele.
//
// Desempenho: caixas e cilindros curtos compartilham geometria e material por cor; o cenário parado é juntado depois pelo
// mesclarLocal (jogo.js), que grava a cor de cada peça nos vértices (a cor de cada peça vai nos vértices).

import { THREE, COR3D, texturaCanvas } from "../../src/motor3d/toon.js";
import { juntarGeometrias, mesclarLocal } from "../cidade-do-rabisco/mesclar.js";

// ------------------------------------------------------------------ materiais e peças básicas
// Lambert (liso e barato de desenhar, importa na TV) com um pouco de luz própria (parte da cor): as faces à sombra não ficam apagadas, sem mexer nas luzes da cena
// (que valem para o Rabisco oficial). Clona junto (o mesclarLocal clona o material ao gravar a cor nos vértices).
const LUZ_PROPRIA = 0.42;
class Plast extends THREE.MeshLambertMaterial {
  constructor(p) { const { roughness, metalness, ...q } = p ?? {}; super(q); this.onBeforeCompile = Plast.compilar; }
  copy(o) { super.copy(o); this.onBeforeCompile = Plast.compilar; return this; }
  customProgramCacheKey() { return "plast"; }
  static compilar(sh) { sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ${LUZ_PROPRIA.toFixed(2)};`); }
}
export const MaterialPlastico = Plast;
const plasticos = new Map();
export function plastico(cor, extra = {}) {
  const c = new THREE.Color(cor);
  const k = `${c.getHex()}|${extra.rugo ?? ""}|${extra.emis ?? ""}`;
  if (!plasticos.has(k)) {
    const m = new Plast({ color: c, roughness: extra.rugo ?? 0.45, metalness: 0 });
    if (extra.emis) { m.emissive = new THREE.Color(extra.emis); m.emissiveIntensity = 0.6; }
    plasticos.set(k, m);
  }
  return plasticos.get(k);
}
// material com textura (chão, pista, placas). side: o padrão é só a face de cima.
export function plasticoMapa(mapa, extra = {}) {
  mapa.anisotropy = 8;
  return new Plast({ map: mapa, roughness: 0.5, metalness: 0, ...extra });
}
const VIDRO = () => plastico(0x9be7ff, { rugo: 0.2 });
const claro = (hex, f) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), f).getHex();
const escuro = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
const AZUL = 0x24305f; // "preto" do plástico: pneu, pupila, fresta (azul-marinho, nunca contorno)

const caixas = new Map();
const geoCaixa = (w, h, d) => {
  const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  if (!caixas.has(k)) caixas.set(k, new THREE.BoxGeometry(w, h, d));
  return caixas.get(k);
};
// caixa colorida posta num grupo: w h d, cor, posição do CENTRO
export function cx(pai, w, h, d, cor, x, y, z, { sombra = true, material = null } = {}) {
  const m = new THREE.Mesh(geoCaixa(w, h, d), material ?? plastico(cor));
  m.position.set(x, y, z); m.castShadow = sombra; m.receiveShadow = true; pai.add(m);
  return m;
}
const geoPino = new THREE.CylinderGeometry(0.19, 0.19, 0.13, 8);
// fileira de pinos de peça de montar em cima de uma face (centro x,z; largura w; fundo d; y do topo)
export function pinos(pai, w, d, x, y, z, cor, passo = 0.95) {
  const m = plastico(cor), nx = Math.max(1, Math.floor(w / passo)), nz = Math.max(1, Math.floor(d / passo));
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const p = new THREE.Mesh(geoPino, m);
    p.position.set(x - w / 2 + (w / nx) * (i + 0.5), y + 0.065, z - d / 2 + (d / nz) * (k + 0.5)); pai.add(p);
  }
}

// ------------------------------------------------------------------ chão, pista e placas (texturas)
// chão: placa de pinos (cada lado do ladrilho = 8 pinos)
export function texturaChao(corA, corB) {
  const t = texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = corA; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) {
      const x = 16 + i * 32, y = 16 + k * 32;
      c.fillStyle = "rgba(0,0,0,0.12)"; c.beginPath(); c.arc(x + 2, y + 3, 9, 0, Math.PI * 2); c.fill();
      c.fillStyle = corB; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill();
    }
  }, { repetir: true });
  return t;
}
export function texturaAsfalto() {
  return texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#4b5266"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#565e74"; c.fillRect(0, 6, w, h - 12); // placas com uma fresta escura a cada ladrilho
    c.fillStyle = "#ffffff";
    c.fillRect(10, 0, 8, h); c.fillRect(w - 18, 0, 8, h);
    c.fillRect(w / 2 - 4, 0, 8, h * 0.45);
  }, { repetir: true });
}
export function texturaAcostamento(cor) {
  return texturaCanvas(128, 128, (c, w, h) => {
    c.fillStyle = cor; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { c.fillStyle = "rgba(255,255,255,0.12)"; c.beginPath(); c.arc(16 + i * 32, 16 + k * 32, 8, 0, Math.PI * 2); c.fill(); }
    [["#ffffff", 20, 90], ["#ffcc1f", 70, 40], ["#ff8fbf", 100, 100]].forEach(([f, x, y]) => { c.fillStyle = f; c.fillRect(x, y, 9, 9); });
  }, { repetir: true });
}
export function texturaXadrez() {
  return texturaCanvas(256, 64, (c) => {
    for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? AZUL_CSS : "#ffffff"; c.fillRect(x * 16, y * 16, 16, 16); }
  });
}
const AZUL_CSS = "#24305f";
export function texturaFaixaLargada(logo) {
  return texturaCanvas(1024, 256, (c, w, h) => {
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h);
    for (let x = 0; x < 64; x++) for (let y = 0; y < 2; y++) {
      c.fillStyle = (x + y) % 2 ? AZUL_CSS : "#ffffff";
      c.fillRect(x * 16, y * 16, 16, 16); c.fillRect(x * 16, h - 32 + y * 16, 16, 16);
    }
    const lh = 150, lw = (logo.width / logo.height) * lh;
    c.drawImage(logo, 60, 53, lw, lh);
    c.font = "800 120px 'Baloo 2', sans-serif"; c.textBaseline = "middle"; c.textAlign = "center";
    c.fillStyle = "#ec2e8c"; c.fillText("LARGADA", 660, 134);
  });
}

// ------------------------------------------------------------------ faixas da pista (geometria que segue o traçado)
// Faixa lisa virada para cima: pos = pares de pontos (esquerda/direita) por amostra.
export function faixaPlana(centro, lado, idx, AMOSTRAS, PASSO, de, ate, y, repV) {
  const pos = [], uv = [], ind = [];
  for (let i = 0; i <= AMOSTRAS; i++) {
    const k = idx(i);
    const a = centro[k].clone().addScaledVector(lado[k], de), b = centro[k].clone().addScaledVector(lado[k], ate);
    pos.push(a.x, y, a.z, b.x, y, b.z);
    const v = (i * PASSO) / repV; uv.push(0, v, 1, v);
    if (i < AMOSTRAS) { const n = i * 2; ind.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(ind); geo.computeVertexNormals();
  return geo;
}
// Zebra de blocos: tijolinhos baixos (altura h) de duas cores, um a cada 2 amostras, com as laterais.
export function zebraBlocos(centro, lado, idx, AMOSTRAS, lo, hi, h, cA, cB) {
  const pos = [], nor = [], col = [], ind = [];
  const ca = new THREE.Color(cA), cb = new THREE.Color(cB), cl = new THREE.Color(cA).lerp(new THREE.Color(0x000000), 0.0);
  void cl;
  const quad = (p, n, cor) => { // p: 4 pontos; reordena se o giro não bater com a normal
    const a = p[0].clone().sub(p[1]), b = p[2].clone().sub(p[1]);
    const ordem = b.cross(a).dot(n) >= 0 ? [0, 1, 2, 3] : [3, 2, 1, 0];
    const v0 = pos.length / 3;
    for (const i of ordem) { pos.push(p[i].x, p[i].y, p[i].z); nor.push(n.x, n.y, n.z); col.push(cor.r, cor.g, cor.b); }
    ind.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
  };
  const P = (i, lat, y) => centro[idx(i)].clone().addScaledVector(lado[idx(i)], lat).setY(y);
  const y0 = 0.04;
  for (let i = 0, n = 0; i < AMOSTRAS; i += 2, n++) {
    const cor = n % 2 ? ca : cb, lado2 = cor.clone().multiplyScalar(0.82);
    const j = i + 2, ln = lado[idx(i)].clone();
    quad([P(i, lo, h), P(j, lo, h), P(j, hi, h), P(i, hi, h)], new THREE.Vector3(0, 1, 0), cor);
    quad([P(i, lo, y0), P(j, lo, y0), P(j, lo, h), P(i, lo, h)], ln.clone().negate(), lado2);
    quad([P(i, hi, y0), P(j, hi, y0), P(j, hi, h), P(i, hi, h)], ln, lado2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(ind);
  const m = new THREE.Mesh(geo, new Plast({ vertexColors: true, roughness: 0.45, metalness: 0 }));
  m.receiveShadow = true; m.castShadow = false;
  return m;
}

// Barreira de blocos coloridos nas beiradas (no lugar dos gizes de cera): tijolo comprido com dois pinos em cima.
export function barreiraBlocos(n, cores) {
  const peca = [
    { o: { geometry: new THREE.BoxGeometry(3.6, 1.1, 1.3) }, m: new THREE.Matrix4() },
    { o: { geometry: new THREE.CylinderGeometry(0.3, 0.3, 0.22, 8) }, m: new THREE.Matrix4().makeTranslation(-0.9, 0.66, 0) },
    { o: { geometry: new THREE.CylinderGeometry(0.3, 0.3, 0.22, 8) }, m: new THREE.Matrix4().makeTranslation(0.9, 0.66, 0) },
  ].map((p) => ({ ...p, ini: 0, n: p.o.geometry.index.count }));
  const geo = juntarGeometrias(peca);
  return cores.map((cor) => { const m = new THREE.InstancedMesh(geo, plastico(cor), n); m.castShadow = true; m.receiveShadow = true; return m; });
}

// ------------------------------------------------------------------ objetos do cenário
// Lápis gigante de blocos: coluna quadrada, anel claro perto da ponta e ponta em degraus (madeira + grafite)
export function lapisB(cor, altura = 20, raio = 1.6) {
  const g = new THREE.Group(), w = raio * 1.9;
  cx(g, w, altura, w, cor, 0, altura / 2, 0);
  for (const y of [altura - 1.5, altura - 0.7]) cx(g, w + 0.14, 0.34, w + 0.14, 0xf4f4f4, 0, y, 0, { sombra: false });
  const h = raio * 0.8;
  [[0.88, 0], [0.62, 1], [0.34, 2]].forEach(([f, i]) => cx(g, w * f, h, w * f, i === 2 ? claro(0xf3c99a, 0) : 0xf3c99a, 0, altura + h * (i + 0.5), 0));
  cx(g, w * 0.16, h * 0.8, w * 0.16, cor, 0, altura + h * 3 + h * 0.4, 0);
  return g;
}
const VERDES = [0x42c92d, 0x35b83a, 0x58d63a, 0x2fae45];
export function arvoreB(escala = 1, tipo = 0) {
  const g = new THREE.Group(), verde = VERDES[tipo % VERDES.length];
  cx(g, 1.3, 4.4, 1.3, 0x8a5426, 0, 2.2, 0);
  cx(g, 5.6, 4.2, 5.6, verde, 0, 6.3, 0);
  cx(g, 3.5, 2.4, 3.5, claro(verde, 0.12), 0.4, 9.6, -0.3);
  cx(g, 2.0, 2.0, 2.0, claro(verde, 0.22), 3.2, 5.2, 1.0);
  g.scale.setScalar(escala);
  return g;
}
export function nuvemB(escala = 1) {
  const g = new THREE.Group(), e = 1.9 * escala, branco = plastico(0xffffff), base = plastico(0xdbe7f6);
  const bl = (w, h, d, x, y, z, m) => { const k = new THREE.Mesh(geoCaixa(w, h, d), m); k.position.set(x, y, z); g.add(k); };
  bl(e * 8, e * 1.1, e * 4.2, 0, 0, 0, base);
  bl(e * 7.4, e * 1.3, e * 4.0, 0, e * 1.1, 0, branco);
  bl(e * 4.4, e * 1.5, e * 3.4, -e, e * 2.4, 0, branco);
  bl(e * 2.4, e * 1.2, e * 2.8, e * 1.8, e * 2.2, 0, branco);
  return g;
}
// morro de terraços (placas empilhadas cada vez menores)
export function morroB(raio, cor = 0x7dd36a) {
  const g = new THREE.Group(), altura = raio * 0.45, n = 4;
  for (let i = 0; i < n; i++) cx(g, raio * 2 * (1 - i * 0.24), altura / n, raio * 2 * (1 - i * 0.24), claro(cor, i * 0.07), 0, (altura / n) * (i + 0.5), 0, { sombra: false });
  return g;
}
// pilha de livros de blocos (páginas claras na frente)
export function livrosB() {
  const g = new THREE.Group(), cores = [COR3D.ciano, COR3D.rosa, COR3D.laranja, COR3D.roxo];
  let y = 0;
  cores.forEach((cor, i) => {
    const l = new THREE.Group(), w = 7 - i * 0.6, d = 5 - i * 0.3;
    cx(l, w, 1.4, d, cor, 0, 0, 0); cx(l, w - 0.5, 1.0, 0.12, 0xfff6e3, 0, 0, d / 2 + 0.01, { sombra: false });
    y += 0.7; l.position.y = y; y += 0.7; l.rotation.y = (i % 2 ? 1 : -1) * 0.15; g.add(l);
  });
  return g;
}
const janelaB = (g, w, h, x, y, z, ry = 0) => {
  const j = new THREE.Group(); j.position.set(x, y, z); j.rotation.y = ry;
  cx(j, w + 0.5, h + 0.5, 0.3, 0xffffff, 0, 0, 0); cx(j, w, h, 0.2, 0, 0, 0, 0.12, { material: VIDRO() });
  g.add(j);
};
export function escolaB(texLogo) {
  const g = new THREE.Group();
  cx(g, 36, 14, 16, 0xffe3a3, 0, 7, 0);
  cx(g, 36.6, 1.0, 16.6, 0xf3c99a, 0, 0.5, 0);
  // telhado em degraus
  for (let i = 0; i < 5; i++) cx(g, 38 - i * 6.6, 1.8, 18 - i * 3, COR3D.vermelho, 0, 14.9 + i * 1.8, 0);
  pinos(g, 8, 4, 0, 23.8, 0, claro(COR3D.vermelho, 0.25), 1.2);
  // torre
  cx(g, 8, 12, 8, 0xffd27a, 0, 26, 0);
  for (let i = 0; i < 4; i++) cx(g, 9.6 - i * 2.4, 1.6, 9.6 - i * 2.4, COR3D.vermelho, 0, 32.8 + i * 1.6, 0);
  for (const x of [-13, -6.5, 6.5, 13]) for (const y of [4.5, 10]) janelaB(g, 4, 3.4, x, y, 8.1);
  cx(g, 6.4, 8.4, 0.4, 0xffffff, 0, 4.2, 8.15); cx(g, 5.4, 7.6, 0.3, 0xb0662e, 0, 3.8, 8.3);
  cx(g, 0.5, 0.5, 0.4, COR3D.amarelo, 1.6, 3.8, 8.55);
  for (let i = 0; i < 2; i++) cx(g, 9 - i, 0.4, 2.2 - i * 0.8, 0xe3ddd0, 0, 0.2 + i * 0.4, 9.2 - i * 0.4);
  cx(g, 15.4, 8.4, 0.8, 0xffffff, 0, 18.6, 8.6);
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(14, 7.3), new THREE.MeshBasicMaterial({ map: texLogo, transparent: true }));
  placa.position.set(0, 18.6, 9.02); g.add(placa);
  return g;
}
export function onibusB(texLogo) {
  const g = new THREE.Group();
  cx(g, 5, 4.4, 14, COR3D.amarelo, 0, 3.7, 0);
  cx(g, 5.1, 0.7, 14.1, AZUL, 0, 2.5, 0);
  cx(g, 5.2, 0.4, 14.2, claro(COR3D.amarelo, 0.2), 0, 6.0, 0);
  pinos(g, 4, 12, 0, 6.2, 0, claro(COR3D.amarelo, 0.3), 1.3);
  for (let i = 0; i < 4; i++) for (const l of [-1, 1]) cx(g, 0.2, 1.5, 2.4, 0, l * 2.55, 4.6, -4.5 + i * 3, { material: VIDRO() });
  cx(g, 4.2, 1.5, 0.2, 0, 0, 4.4, 7.02, { material: VIDRO() });
  for (const x of [-1.7, 1.7]) cx(g, 0.7, 0.5, 0.2, 0xfff2a8, x, 2.6, 7.06, { sombra: false });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.4), new THREE.MeshBasicMaterial({ map: texLogo, transparent: true }));
  logo.position.set(2.53, 3.4, 3.2); logo.rotation.y = Math.PI / 2; g.add(logo);
  for (const [x, z] of [[-2.3, -4.5], [2.3, -4.5], [-2.3, 4.5], [2.3, 4.5]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.8, 14), plastico(AZUL)); r.rotation.z = Math.PI / 2; r.position.set(x, 1.1, z); r.castShadow = true; g.add(r);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.84, 8), plastico(0xdfe6ee)); c.rotation.z = Math.PI / 2; c.position.set(x, 1.1, z); g.add(c);
  }
  return g;
}

// ------------------------------------------------------------------ decorações dos temas (no lugar de pistas.js · decoracao)
const pedaco = (g, geo, cor, x, y, z) => { const m = new THREE.Mesh(geo, plastico(cor)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
export function decoracaoB(tipo, rnd) {
  const g = new THREE.Group();
  if (tipo === "palmeira") {
    for (let i = 0; i < 6; i++) cx(g, 1.6 - i * 0.1, 2.4, 1.6 - i * 0.1, i % 2 ? 0xb07a45 : 0xc08a52, i * 0.25, 1.2 + i * 2.4, 0);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const f = cx(g, 4.6, 0.5, 1.4, i % 2 ? 0x42c92d : 0x35b83a, 1.5 + Math.cos(a) * 2.6, 14.3, Math.sin(a) * 2.6); f.rotation.y = -a; f.rotation.z = 0; }
    cx(g, 1.6, 1.6, 1.6, 0x35b83a, 1.5, 14.4, 0);
  } else if (tipo === "guarda-sol") {
    cx(g, 0.4, 7, 0.4, 0xffffff, 0, 3.5, 0);
    const c = [COR3D.rosa, COR3D.laranja, COR3D.ciano][Math.floor(rnd() * 3)];
    [[9, 0], [6.4, 1], [3.6, 2]].forEach(([w, i]) => cx(g, w, 0.8, w, i % 2 ? claro(c, 0.35) : c, 0, 7.2 + i * 0.8, 0));
  } else if (tipo === "pinheiro" || tipo === "pinheiro-neve") {
    cx(g, 1.4, 4, 1.4, COR3D.marrom, 0, 2, 0);
    const verde = tipo === "pinheiro" ? 0x2e8b3a : 0x3f9a55;
    [[9, 3], [7.2, 6], [5.4, 9], [3.6, 12], [1.8, 14.6]].forEach(([w, y], i) => { cx(g, w, 2.4, w, i % 2 ? claro(verde, 0.08) : verde, 0, y, 0); if (tipo === "pinheiro-neve") cx(g, w * 0.78, 0.6, w * 0.78, 0xffffff, 0, y + 1.35, 0, { sombra: false }); });
  } else if (tipo === "boneco-neve") {
    [[2.4, 5], [6.2, 3.7], [9.1, 2.6]].forEach(([y, w]) => cx(g, w, w, w, 0xffffff, 0, y, 0));
    cx(g, 0.5, 0.5, 1.6, COR3D.laranja, 0, 9.1, 1.9); cx(g, 2.9, 0.4, 2.9, AZUL, 0, 10.5, 0); cx(g, 1.8, 1.5, 1.8, AZUL, 0, 11.4, 0);
    for (const x of [-0.5, 0.5]) cx(g, 0.35, 0.35, 0.2, AZUL, x, 9.6, 1.3, { sombra: false });
  } else if (tipo === "predio") {
    const andares = 3 + Math.floor(rnd() * 6), cor = [0xf3d9a4, 0xcfe3f2, 0xf4c2c2, 0xd6f0c2, 0xe8d7ff][Math.floor(rnd() * 5)];
    cx(g, 12, andares * 4, 12, cor, 0, andares * 2, 0);
    cx(g, 12.8, 0.8, 12.8, escuro(cor, 0.78), 0, andares * 4 + 0.4, 0);
    pinos(g, 10, 10, 0, andares * 4 + 0.8, 0, claro(cor, 0.3), 1.7);
    for (let a = 0; a < andares; a++) for (const l of [-1, 1]) for (const x of [-3.5, 0, 3.5]) cx(g, 2.2, 2.2, 0.2, 0, x, 2 + a * 4, l * 6.08, { material: VIDRO(), sombra: false });
  } else if (tipo === "celeiro") {
    cx(g, 12, 8, 10, 0xc1121f, 0, 4, 0);
    for (let i = 0; i < 4; i++) cx(g, 12.6 - i * 3, 1.5, 10.6, 0x7a4a2a, 0, 8.75 + i * 1.5, 0);
    cx(g, 4.4, 5.4, 0.3, 0xffffff, 0, 2.7, 5.05); cx(g, 3.6, 5.0, 0.3, 0x9a5a2a, 0, 2.5, 5.2);
    cx(g, 0.3, 5.0, 0.3, 0xffffff, 0, 2.5, 5.4); cx(g, 3.6, 0.3, 0.3, 0xffffff, 0, 2.5, 5.4);
  } else if (tipo === "feno") {
    cx(g, 4, 3.4, 3.4, 0xe8c45a, 0, 1.7, 0); cx(g, 4.1, 0.4, 3.5, 0xc9a43a, 0, 1.0, 0); cx(g, 4.1, 0.4, 3.5, 0xc9a43a, 0, 2.4, 0);
  } else if (tipo === "cacto") {
    const v = 0x3f9a4a;
    cx(g, 2.4, 10, 2.4, v, 0, 5, 0);
    for (const s of [-1, 1]) { cx(g, 2.4, 1.4, 1.4, v, s * 1.7, 6.5, 0); cx(g, 1.4, 3.6 + rnd() * 1.5, 1.4, v, s * 2.4, 8.2, 0); }
  } else if (tipo === "pedra") {
    const s = 3 + rnd() * 2;
    cx(g, s * 1.6, s * 0.5, s * 1.4, 0xc89a6a, 0, s * 0.25, 0); cx(g, s * 1.1, s * 0.5, s, 0xd6aa7a, 0.2, s * 0.75, 0); cx(g, s * 0.6, s * 0.4, s * 0.5, 0xe0b88a, 0, s * 1.2, 0);
  } else if (tipo === "flores") {
    for (let i = 0; i < 9; i++) { const x = (rnd() - 0.5) * 8, z = (rnd() - 0.5) * 8; cx(g, 0.3, 0.9, 0.3, 0x3a9a2a, x, 0.45, z, { sombra: false }); cx(g, 1.0, 0.5, 1.0, [COR3D.rosa, COR3D.amarelo, 0xffffff, COR3D.roxo][i % 4], x, 1.1, z, { sombra: false }); }
  } else if (tipo === "poste") {
    cx(g, 0.7, 12, 0.7, 0x4a5168, 0, 6, 0);
    pedaco(g, geoCaixa(2, 1.6, 2), 0xfff1a8, 0, 12.6, 0).material = new THREE.MeshBasicMaterial({ color: 0xfff1a8 });
  }
  return g;
}

// ------------------------------------------------------------------ lojas parceiras (letreiro = a foto da parceira)
// Construção de blocos em duas partes: térreo com vitrines, porta e toldo listrado; em cima, o letreiro com a foto.
// montar(prop) é chamado de novo quando a foto chega e a proporção muda.
export function lojaB(o, estilo, PARC) {
  const g = new THREE.Group();
  g.userData.dinamico = true;
  const parede = new THREE.Color(estilo.parede).getHex(), beiral = new THREE.Color(estilo.beiral).getHex();
  const montar = (prop) => {
    while (g.children.length) g.remove(g.children[0]);
    const W = Math.min(PARC.larguraMax, PARC.altura * prop), D = PARC.prof, T = 4.2;
    const pw = Math.min(W - 2, 7.2 * prop), ph = pw / prop;
    const sub = new THREE.Group();
    cx(sub, W, T, D, parede, 0, T / 2, 0);
    cx(sub, W + 0.4, 0.7, D + 0.4, beiral, 0, 0.35, 0);
    // vitrines e porta
    for (const s of [-1, 1]) { cx(sub, W * 0.28 + 0.6, 2.7, 0.3, 0xffffff, s * W * 0.3, 2.3, D / 2 + 0.05); cx(sub, W * 0.28, 2.3, 0.2, 0, s * W * 0.3, 2.3, D / 2 + 0.2, { material: VIDRO() }); }
    cx(sub, 2.8, 3.2, 0.3, 0xffffff, 0, 1.6, D / 2 + 0.05); cx(sub, 2.2, 2.8, 0.2, beiral, 0, 1.4, D / 2 + 0.2);
    // toldo de blocos listrados
    const n = Math.max(6, Math.round(W / 2.4) & ~1);
    for (let i = 0; i < n; i++) cx(sub, W / n, 0.36, 1.8, i % 2 ? 0xffffff : beiral, -W / 2 + (W / n) * (i + 0.5), 3.95, D / 2 + 0.9);
    // andar de cima + beiral + pinos
    cx(sub, W, ph + 1.6, D, parede, 0, T + (ph + 1.6) / 2, 0);
    cx(sub, W + 0.8, 0.8, D + 0.8, beiral, 0, T + ph + 1.6 + 0.4, 0);
    pinos(sub, W - 1.4, D - 1.4, 0, T + ph + 2.0, 0, claro(beiral, 0.25), 1.5);
    // moldura do letreiro e a foto
    cx(sub, pw + 1, ph + 1, 0.5, beiral, 0, T + 0.8 + ph / 2 + 0.2, D / 2 + 0.25);
    const foto = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), o.frente);
    foto.position.set(0, T + 0.8 + ph / 2 + 0.2, D / 2 + 0.52);
    mesclarCaixas(sub); g.add(sub, foto);
  };
  montar(o.prop); o.ajustes.push(montar);
  return g;
}
export function outdoorB(o, estilo, PARC) {
  const g = new THREE.Group();
  g.userData.dinamico = true;
  const beiral = new THREE.Color(estilo.beiral).getHex();
  const montar = (prop) => {
    while (g.children.length) g.remove(g.children[0]);
    const w = Math.min(PARC.outdoorLarg, PARC.outdoorAlt * prop), h = w / prop, sub = new THREE.Group();
    cx(sub, w + 1, h + 1, 0.7, beiral, 0, PARC.pe + h / 2, 0);
    for (const k of [-1, 1]) cx(sub, 1.0, PARC.pe + h / 2, 1.0, 0xdfe6ee, k * (w / 2 - 1.3), (PARC.pe + h / 2) / 2, -0.4);
    cx(sub, w + 1.6, 0.5, 1.2, claro(beiral, 0.2), 0, PARC.pe + h + 0.75, 0);
    const foto = new THREE.Mesh(new THREE.PlaneGeometry(w, h), o.frente);
    foto.position.set(0, PARC.pe + h / 2, 0.37);
    mesclarCaixas(sub); g.add(sub, foto);
  };
  montar(o.prop); o.ajustes.push(montar);
  return g;
}
// junta as caixas de um grupo parado por cor (poucas malhas por loja)
const mesclarCaixas = (grupo) => mesclarLocal(grupo);

// ------------------------------------------------------------------ karts
// Kart de blocos. Mesma interface do kart3D: userData.chassi, volante, escapes, rodas (children[0] e [1] giram em x).
export function kartB(cor, texEmblema, { capo: corCapo = cor, detalhe = AZUL } = {}) {
  const g = new THREE.Group(), chassi = new THREE.Group();
  g.add(chassi); g.userData.chassi = chassi;
  cx(chassi, 1.8, 0.6, 3.1, cor, 0, 0.55, 0);                    // banheira
  cx(chassi, 1.5, 0.3, 0.7, cor, 0, 0.72, 1.7);                  // focinho
  cx(chassi, 1.3, 0.4, 1.5, corCapo, 0, 1.0, 0.8);               // capô
  cx(chassi, 1.5, 0.12, 0.5, claro(corCapo, 0.35), 0, 0.88, 1.7, { sombra: false }); // faixa clara na frente
  cx(chassi, 2.1, 0.34, 0.4, detalhe, 0, 0.45, 1.85);            // para-choque
  for (const x of [-1.05, 1.05]) { cx(chassi, 0.46, 0.5, 1.9, detalhe, x, 0.58, -0.1); pinos(chassi, 0.46, 1.9, x, 0.83, -0.1, claro(detalhe, 0.35), 0.62); }
  // pinos de peça de montar no capô, de cada lado do emblema
  for (const x of [-0.42, 0.42]) for (const z of [0.35, 1.25]) { const p = new THREE.Mesh(geoPino, plastico(claro(corCapo, 0.3))); p.position.set(x, 1.265, z); chassi.add(p); }
  for (const x of [-0.32, 0.32]) cx(chassi, 0.34, 0.2, 0.2, 0xfff2a8, x, 0.72, 2.05, { sombra: false }); // faróis
  if (texEmblema) {
    const emb = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: texEmblema, transparent: true }));
    emb.rotation.x = -Math.PI / 2; emb.position.set(0, 1.211, 0.8); chassi.add(emb);
  }
  cx(chassi, 1.0, 0.7, 0.4, AZUL, 0, 1.05, -1.15);               // encosto do banco
  cx(chassi, 1.0, 0.2, 0.9, AZUL, 0, 0.9, -0.85);                // assento
  // volante quadrado (o jogo.js encaixa nas mãos do Rabisco e gira)
  const volante = new THREE.Group(); volante.position.set(0, 1.3, 0.25); volante.rotation.x = -0.9;
  const v = plastico(0x2f3748);
  [[0.62, 0.1, 0, 0.26], [0.62, 0.1, 0, -0.26], [0.1, 0.62, 0.26, 0], [0.1, 0.62, -0.26, 0]].forEach(([w, h, x, y]) => { const b = new THREE.Mesh(geoCaixa(w, h, 0.1), v); b.position.set(x, y, 0); volante.add(b); });
  chassi.add(volante); g.userData.volante = volante;
  // aerofólio
  cx(chassi, 2.0, 0.12, 0.55, corCapo, 0, 1.26, -1.62);
  for (const x of [-0.6, 0.6]) cx(chassi, 0.12, 0.5, 0.12, detalhe, x, 0.98, -1.55);
  // escapamentos (de onde sai o turbo)
  g.userData.escapes = [];
  for (const x of [-0.55, 0.55]) { const e = cx(chassi, 0.24, 0.24, 0.4, 0xc4ccd6, x, 0.7, -1.76, { sombra: false }); g.userData.escapes.push(e); }
  // rodas: pneu cilíndrico gordinho e miolo de caixa (gira junto, dá para ver rodando)
  g.userData.rodas = [];
  for (const [x, z, rr] of [[-1.12, 1.05, 0.44], [1.12, 1.05, 0.44], [-1.18, -1.05, 0.54], [1.18, -1.05, 0.54]]) {
    const roda = new THREE.Group();
    const pneu = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 0.52, 14), plastico(AZUL)); pneu.rotation.z = Math.PI / 2; pneu.castShadow = true;
    const miolo = new THREE.Mesh(geoCaixa(0.58, rr * 1.0, rr * 1.0), plastico(corCapo));
    roda.add(pneu, miolo);
    roda.position.set(x, rr, z); roda.userData.frente = z > 0; g.add(roda); g.userData.rodas.push(roda);
  }
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.9), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.03; g.add(sombra);
  return g;
}
// Adversários lápis de cor, de blocos, cada um com um jeito: Verdinho de faixa na cabeça, Roxinha de laço, Amarelinho de óculos.
export function pilotoB(cor) {
  const g = new THREE.Group();
  cx(g, 0.84, 1.5, 0.84, cor, 0, 0.75, 0);
  [[0.8, 0], [0.54, 1], [0.28, 2]].forEach(([w, i]) => cx(g, w, 0.28, w, 0xf3c99a, 0, 1.64 + i * 0.28, 0, { sombra: false }));
  cx(g, 0.14, 0.2, 0.14, cor, 0, 2.38, 0, { sombra: false });
  for (const x of [-0.2, 0.2]) { cx(g, 0.24, 0.28, 0.1, 0xffffff, x, 1.08, 0.43, { sombra: false }); cx(g, 0.11, 0.14, 0.06, AZUL, x, 1.06, 0.49, { sombra: false }); }
  cx(g, 0.34, 0.08, 0.06, 0x7a2a3a, 0, 0.74, 0.43, { sombra: false });
  for (const x of [-0.55, 0.55]) cx(g, 0.2, 0.2, 0.7, escuro(cor, 0.82), x, 0.75, 0.35, { sombra: false }); // braços no volante
  if (cor === COR3D.verde) cx(g, 0.9, 0.2, 0.9, 0xffffff, 0, 1.4, 0, { sombra: false });                      // faixa
  else if (cor === COR3D.roxo) for (const x of [-0.2, 0.2]) cx(g, 0.26, 0.26, 0.1, COR3D.rosa, x, 1.42, 0.44, { sombra: false });
  else if (cor === COR3D.amarelo) { cx(g, 0.78, 0.2, 0.08, AZUL, 0, 1.1, 0.5, { sombra: false }); cx(g, 0.1, 0.1, 0.04, 0xffffff, -0.2, 1.14, 0.55, { sombra: false }); }
  return g;
}

// uma pedra para a lua da noite (no lugar da esfera)
export const luaB = () => new THREE.Mesh(new THREE.BoxGeometry(70, 70, 24), new THREE.MeshBasicMaterial({ color: 0xfff6d0, fog: false }));
