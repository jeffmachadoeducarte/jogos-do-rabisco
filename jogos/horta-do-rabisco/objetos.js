// Objetos 3D da Horta do Rabisco: formas simples no traço toon (contorno preto), cada um com
// cerca de 1 unidade de altura e centro na origem, para flutuar acima da horta como opção de toque.

import { THREE as G, COR3D, peca, toon, texturaCanvas } from "../../src/motor3d/toon.js";

const C = {
  agua: 0x3aa7f0, terraEscura: 0x5a3412, saco: 0xc79a5b, areia: 0xf2d58a, gelo: 0xbfe9ff, pedra: 0x9aa3ad,
  folha: COR3D.verde, caule: COR3D.verdeEscuro, tomate: COR3D.vermelho, rosaMinhoca: 0xf59bb0, lua: 0xffe680,
};

// ---------- peças básicas
// esferas com poucos lados, compartilhadas por raio (a horta tem muitas e o celular agradece)
const esferas = new Map();
const geoEsfera = (r) => { if (!esferas.has(r)) esferas.set(r, new G.SphereGeometry(r, r > 0.25 ? 16 : 10, r > 0.25 ? 12 : 8)); return esferas.get(r); };
function esfera(r, cor, pos = [0, 0, 0], esc = null, contorno = 0.05, extra) {
  const m = peca(geoEsfera(r), cor, { contorno, extra });
  m.position.set(...pos);
  if (esc) m.scale.set(...esc);
  return m;
}
function caixa(w, h, d, cor, pos = [0, 0, 0], contorno = 0.05, extra) {
  const m = peca(new G.BoxGeometry(w, h, d), cor, { contorno, extra });
  m.position.set(...pos);
  return m;
}
function cilindro(rt, rb, h, cor, pos = [0, 0, 0], contorno = 0.05, seg = 18) {
  const m = peca(new G.CylinderGeometry(rt, rb, h, seg), cor, { contorno });
  m.position.set(...pos);
  return m;
}
function cone(r, h, cor, pos = [0, 0, 0], contorno = 0.04) {
  const m = peca(new G.ConeGeometry(r, h, 14), cor, { contorno });
  m.position.set(...pos);
  return m;
}
// dois olhinhos olhando para a frente (+z)
function olhos(g, x, y, z, sep = 0.11, r = 0.065) {
  for (const s of [-1, 1]) {
    g.add(esfera(r, 0xffffff, [x + s * sep, y, z], null, 0.025));
    g.add(esfera(r * 0.55, COR3D.tinta, [x + s * sep, y, z + r * 0.6], null, 0));
  }
}
function grupo(...filhos) { const g = new G.Group(); g.add(...filhos); return g; }

function geoEstrela(r = 0.3, ri = 0.13, prof = 0.1) {
  const s = new G.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? ri : r;
    if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return new G.ExtrudeGeometry(s, { depth: prof, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }).center();
}
function monte(r = 0.36, cor = C.terraEscura, y = -0.3) {
  const m = peca(new G.SphereGeometry(r, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), cor, { contorno: 0.04 });
  m.scale.y = 0.5; m.position.y = y;
  return m;
}
function folhinha(x, y, lado, tam = 1, cor = C.folha) {
  const f = esfera(0.16 * tam, cor, [x, y, 0], [1, 0.38, 0.6], 0.03);
  f.rotation.z = lado * 0.45;
  return f;
}

// ---------- natureza
export function gota() {
  const g = grupo(esfera(0.34, C.agua, [0, -0.12, 0]), cone(0.29, 0.5, C.agua, [0, 0.26, 0], 0.03));
  g.add(esfera(0.07, 0xffffff, [-0.13, 0, 0.28], [1, 1.5, 1], 0));
  return g;
}
export function sol() {
  const g = grupo(esfera(0.3, COR3D.amarelo, [0, 0, 0], null, 0.06));
  const raios = new G.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = cone(0.09, 0.2, COR3D.laranja, [Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0], 0.03);
    r.rotation.z = a - Math.PI / 2;
    raios.add(r);
  }
  g.add(raios);
  g.userData.gira = raios;
  olhos(g, 0, 0.05, 0.26, 0.1, 0.05);
  return g;
}
export function lua() {
  const m = peca(new G.TorusGeometry(0.28, 0.14, 12, 32, Math.PI * 1.15), C.lua, { contorno: 0.05 });
  m.rotation.z = Math.PI * 0.42;
  return grupo(m);
}
export function estrela(cor = COR3D.amarelo) {
  return grupo(peca(geoEstrela(0.42, 0.19), cor, { contorno: 0.05 }));
}
export function estrelas() {
  const g = new G.Group();
  for (const [x, y, r] of [[-0.22, -0.12, 0.3], [0.26, 0.05, 0.22], [-0.02, 0.36, 0.17]]) {
    const e = peca(geoEstrela(r, r * 0.45, 0.08), COR3D.amarelo, { contorno: 0.04 });
    e.position.set(x, y, 0);
    g.add(e);
  }
  return g;
}
export function pedra() {
  const a = peca(new G.DodecahedronGeometry(0.34), C.pedra, { contorno: 0.05 });
  a.scale.set(1.25, 0.8, 1); a.position.set(-0.08, -0.05, 0);
  const b = peca(new G.DodecahedronGeometry(0.18), 0x7d8792, { contorno: 0.04 });
  b.position.set(0.32, -0.15, 0.12);
  return grupo(a, b);
}
export function terra() {
  // saco de terra aberto, com um brotinho em cima: "terra boa"
  const g = grupo(cilindro(0.34, 0.4, 0.62, C.saco, [0, -0.12, 0], 0.05));
  g.add(esfera(0.33, C.terraEscura, [0, 0.2, 0], [1, 0.38, 1], 0.03));
  g.add(cilindro(0.35, 0.35, 0.06, 0xa87a43, [0, 0.16, 0], 0.03));
  g.add(cilindro(0.02, 0.02, 0.18, C.caule, [0, 0.33, 0], 0));
  g.add(folhinha(-0.1, 0.42, -1, 0.8), folhinha(0.1, 0.42, 1, 0.8));
  return g;
}
export function areia() {
  const g = grupo(monte(0.5, C.areia, -0.3));
  g.children[0].scale.y = 0.75;
  const pa = new G.Group();
  pa.add(cilindro(0.03, 0.03, 0.5, COR3D.rosa, [0, 0.25, 0], 0.02), caixa(0.2, 0.22, 0.03, COR3D.rosa, [0, -0.02, 0], 0.03));
  pa.position.set(0.22, -0.05, 0.15); pa.rotation.z = -0.5;
  g.add(pa);
  for (const [x, z] of [[-0.2, 0.25], [0.05, 0.32], [-0.3, 0.05]]) g.add(esfera(0.035, 0xd4b05e, [x, -0.12, z], null, 0));
  return g;
}
export function gelo() {
  const a = caixa(0.52, 0.52, 0.52, C.gelo, [-0.08, -0.05, 0], 0.05, { transparent: true, opacity: 0.85 });
  a.rotation.set(0.3, 0.5, 0.1);
  const b = caixa(0.28, 0.28, 0.28, C.gelo, [0.32, -0.2, 0.15], 0.04, { transparent: true, opacity: 0.85 });
  b.rotation.set(0.2, -0.4, 0.3);
  const brilho = caixa(0.08, 0.2, 0.02, 0xffffff, [-0.2, 0.08, 0.3], 0);
  return grupo(a, b, brilho);
}
export function regador() {
  const g = grupo(cilindro(0.28, 0.32, 0.5, COR3D.ciano, [-0.08, -0.1, 0], 0.05));
  const bico = cilindro(0.04, 0.06, 0.55, COR3D.ciano, [0.32, 0.02, 0], 0.03);
  bico.rotation.z = -0.95;
  g.add(bico, esfera(0.08, COR3D.ciano, [0.55, 0.19, 0], [1, 1, 1], 0.03));
  const alca = peca(new G.TorusGeometry(0.2, 0.04, 8, 16, Math.PI), COR3D.ciano, { contorno: 0.03 });
  alca.position.set(-0.08, 0.15, 0);
  g.add(alca);
  return g;
}
export function minhoca() {
  const g = new G.Group();
  for (let i = 0; i < 6; i++) {
    const cab = i === 5;
    g.add(esfera(cab ? 0.15 : 0.12, C.rosaMinhoca, [-0.45 + i * 0.17, Math.sin(i * 1.15) * 0.1 - 0.05 + (cab ? 0.05 : 0), 0], null, 0.04));
  }
  olhos(g, 0.4, 0.04, 0.12, 0.06, 0.045);
  return g;
}
export function abelha() {
  const g = new G.Group();
  g.add(esfera(0.28, COR3D.amarelo, [0, 0, 0], [1.35, 1, 1]));
  for (const x of [-0.12, 0.08]) {
    const f = cilindro(0.285, 0.285, 0.07, COR3D.tinta, [x, 0, 0], 0);
    f.rotation.z = Math.PI / 2;
    g.add(f);
  }
  const ferrao = cone(0.06, 0.14, COR3D.tinta, [-0.42, 0, 0], 0);
  ferrao.rotation.z = Math.PI / 2;
  g.add(ferrao, esfera(0.17, COR3D.tinta, [0.38, 0.04, 0], null, 0.03));
  olhos(g, 0.42, 0.08, 0.12, 0.07, 0.05);
  const asas = [];
  for (const s of [-1, 1]) {
    const a = esfera(0.16, 0xffffff, [0, 0.3, s * 0.12], [0.8, 1.2, 0.3], 0.03, { transparent: true, opacity: 0.85 });
    a.rotation.x = s * 0.4;
    asas.push(a); g.add(a);
  }
  g.userData.asas = asas;
  g.rotation.y = -0.45;
  return g;
}
export function borboleta(cores = [COR3D.rosa, COR3D.roxo]) {
  const g = new G.Group();
  g.add(peca(new G.CapsuleGeometry(0.05, 0.45, 4, 8), COR3D.tinta, { contorno: 0 }));
  const asas = [];
  for (const s of [-1, 1]) {
    const lado = new G.Group();
    lado.add(esfera(0.24, cores[0], [s * 0.24, 0.12, 0], [1, 1, 0.2], 0.04));
    lado.add(esfera(0.16, cores[1], [s * 0.18, -0.17, 0], [1, 1, 0.2], 0.04));
    lado.add(esfera(0.06, 0xffffff, [s * 0.28, 0.16, 0.05], [1, 1, 0.3], 0));
    asas.push(lado); g.add(lado);
  }
  for (const s of [-1, 1]) {
    const antena = cilindro(0.01, 0.01, 0.2, COR3D.tinta, [s * 0.05, 0.33, 0], 0);
    antena.rotation.z = -s * 0.4;
    g.add(antena);
  }
  g.userData.borboleta = asas;
  return g;
}
export function joaninha() {
  const g = new G.Group();
  const casco = peca(new G.SphereGeometry(0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), COR3D.vermelho, { contorno: 0.05 });
  casco.rotation.x = Math.PI / 2; // abóbada virada para a frente
  g.add(casco, caixa(0.025, 0.66, 0.02, COR3D.tinta, [0, 0, 0.355], 0));
  for (const [x, y] of [[-0.17, 0.1], [0.17, 0.1], [-0.15, -0.16], [0.15, -0.16], [0, -0.28]]) {
    const z = Math.sqrt(Math.max(0.01, 0.36 ** 2 - x * x - y * y));
    g.add(esfera(0.065, COR3D.tinta, [x, y, z - 0.01], [1, 1, 0.5], 0));
  }
  g.add(esfera(0.15, COR3D.tinta, [0, 0.36, 0.12], null, 0.03));
  olhos(g, 0, 0.4, 0.24, 0.06, 0.04);
  return g;
}
export function coruja() {
  const g = new G.Group();
  g.add(esfera(0.36, COR3D.marrom, [0, 0, 0], [1, 1.15, 0.9]));
  g.add(esfera(0.24, COR3D.madeira, [0, -0.1, 0.18], [1, 1.1, 0.5], 0));
  for (const s of [-1, 1]) {
    g.add(esfera(0.12, 0xffffff, [s * 0.13, 0.15, 0.27], null, 0.03));
    g.add(esfera(0.065, COR3D.tinta, [s * 0.13, 0.15, 0.37], null, 0));
    const orelha = cone(0.08, 0.2, COR3D.marrom, [s * 0.22, 0.42, 0], 0.03);
    orelha.rotation.z = -s * 0.35;
    g.add(orelha);
  }
  const bico = cone(0.05, 0.12, COR3D.laranja, [0, 0.03, 0.34], 0.02);
  bico.rotation.x = Math.PI;
  g.add(bico);
  return g;
}
export function travesseiro() {
  const g = grupo(esfera(0.42, 0xd9ccff, [0, 0, 0], [1.3, 0.5, 0.8]));
  // "zz" de sono
  const z = texturaCanvas(128, 128, (c) => { c.font = "900 90px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.lineWidth = 10; c.strokeStyle = "#151515"; c.strokeText("z", 64, 96); c.fillStyle = "#8e6cff"; c.fillText("z", 64, 96); });
  for (const [x, y, s] of [[0.25, 0.32, 0.3], [0.45, 0.5, 0.22]]) {
    const p = new G.Mesh(new G.PlaneGeometry(s, s), new G.MeshBasicMaterial({ map: z, transparent: true }));
    p.position.set(x, y, 0.1);
    g.add(p);
  }
  return g;
}

// ---------- ciclo da planta (cada um num montinho de terra)
export function semente() {
  return grupo(monte(), esfera(0.17, 0xc98a4a, [0, -0.08, 0.05], [0.8, 1.15, 0.8], 0.04), esfera(0.04, 0xe8b27a, [-0.04, -0.02, 0.18], null, 0));
}
export function broto() {
  return grupo(monte(), cilindro(0.03, 0.035, 0.35, C.caule, [0, -0.1, 0], 0.02), folhinha(-0.13, 0.08, -1), folhinha(0.13, 0.08, 1));
}
export function flor(cor = COR3D.rosa) {
  const g = grupo(monte(0.3), cilindro(0.03, 0.035, 0.55, C.caule, [0, -0.05, 0], 0.02), folhinha(-0.13, -0.08, -1), folhinha(0.13, -0.02, 1));
  const cab = cabecaFlor(cor);
  cab.position.y = 0.3;
  g.add(cab);
  return g;
}
export function cabecaFlor(cor = COR3D.rosa) {
  const cab = new G.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    cab.add(esfera(0.11, cor, [Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0], [1, 1, 0.5], 0.03));
  }
  cab.add(esfera(0.1, COR3D.amarelo, [0, 0, 0.04], [1, 1, 0.6], 0.03));
  return cab;
}
export function fruto() {
  const g = grupo(esfera(0.33, C.tomate, [0, -0.05, 0], [1.1, 0.88, 1.05]));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const f = esfera(0.09, C.folha, [Math.cos(a) * 0.09, 0.25, Math.sin(a) * 0.09], [1, 0.3, 0.45], 0.02);
    f.rotation.y = -a;
    g.add(f);
  }
  g.add(cilindro(0.025, 0.03, 0.12, C.caule, [0, 0.3, 0], 0.02), esfera(0.06, 0xffffff, [-0.15, 0.07, 0.27], [1, 1.4, 0.5], 0));
  return g;
}
export function arvore() {
  const g = grupo(cilindro(0.08, 0.11, 0.5, COR3D.marrom, [0, -0.25, 0], 0.04, 8));
  for (const [x, y, r] of [[0, 0.2, 0.3], [-0.2, 0.05, 0.22], [0.2, 0.05, 0.22], [0, 0.4, 0.2]]) {
    const b = peca(new G.IcosahedronGeometry(r, 1), C.folha, { contorno: 0.04 });
    b.position.set(x, y, 0.05);
    g.add(b);
  }
  return g;
}
export function folhaLaranja() {
  const f = esfera(0.34, COR3D.laranja, [0, 0.05, 0], [0.62, 1, 0.16], 0.05);
  const nervura = caixa(0.025, 0.5, 0.02, 0xc24f00, [0, 0.05, 0.06], 0);
  const cab = cilindro(0.025, 0.025, 0.2, COR3D.marrom, [0, -0.38, 0], 0.02);
  const g = grupo(f, nervura, cab);
  g.rotation.z = 0.45;
  return g;
}
export function casaco() {
  const cor = 0x3a7bd5;
  const g = grupo(caixa(0.5, 0.55, 0.26, cor, [0, -0.02, 0], 0.05));
  for (const s of [-1, 1]) {
    const manga = cilindro(0.09, 0.11, 0.5, cor, [s * 0.34, -0.06, 0], 0.04);
    manga.rotation.z = s * 0.35;
    g.add(manga, esfera(0.1, 0xffffff, [s * 0.42, -0.3, 0], null, 0.03));
  }
  g.add(caixa(0.4, 0.1, 0.3, 0xffffff, [0, 0.27, 0], 0.03)); // gola de pelúcia
  for (const y of [0.12, -0.02, -0.16]) g.add(esfera(0.04, COR3D.amarelo, [0, y, 0.14], null, 0.015));
  return g;
}

// ---------- coisas que não são vivas / lixo
export function bola() {
  const tex = texturaCanvas(128, 64, (c, w, h) => {
    const cores = ["#ec2e8c", "#ffffff", "#ffcc1f", "#ffffff", "#00b5f0", "#ffffff"];
    cores.forEach((cor, i) => { c.fillStyle = cor; c.fillRect(0, (i * h) / cores.length, w, h / cores.length + 1); });
  });
  return grupo(peca(new G.SphereGeometry(0.36, 24, 16), 0xffffff, { contorno: 0.05, extra: { map: tex } }));
}
export function sapato() {
  const g = grupo(caixa(0.75, 0.1, 0.34, 0xffffff, [0.02, -0.18, 0], 0.04), caixa(0.42, 0.28, 0.32, COR3D.rosa, [-0.12, -0.0, 0], 0.04));
  g.add(esfera(0.17, COR3D.rosa, [0.2, -0.06, 0], [1.4, 0.75, 0.95], 0.04));
  for (const x of [-0.02, 0.08]) g.add(caixa(0.03, 0.03, 0.34, 0xffffff, [x, 0.1, 0], 0));
  g.rotation.y = -0.5;
  return g;
}
export function carro() {
  const g = grupo(caixa(0.8, 0.24, 0.42, COR3D.vermelho, [0, -0.05, 0], 0.05), caixa(0.44, 0.22, 0.38, COR3D.amarelo, [-0.05, 0.18, 0], 0.04));
  g.add(caixa(0.3, 0.13, 0.39, 0x9fdcff, [-0.05, 0.19, 0], 0));
  for (const x of [-0.26, 0.26]) for (const z of [-0.21, 0.21]) {
    const r = cilindro(0.12, 0.12, 0.08, COR3D.tinta, [x, -0.18, z], 0.02, 14);
    r.rotation.x = Math.PI / 2;
    g.add(r);
  }
  g.rotation.y = -0.45;
  return g;
}
export function garrafa() {
  const vidro = { transparent: true, opacity: 0.85 };
  const g = new G.Group();
  const corpo = peca(new G.CylinderGeometry(0.19, 0.19, 0.55, 18), 0x7fd3ff, { contorno: 0.05, extra: vidro });
  corpo.position.y = -0.12;
  g.add(corpo, cilindro(0.08, 0.19, 0.2, 0x7fd3ff, [0, 0.25, 0], 0.03), cilindro(0.09, 0.09, 0.08, COR3D.vermelho, [0, 0.39, 0], 0.02));
  g.add(cilindro(0.195, 0.195, 0.16, 0xffffff, [0, -0.1, 0], 0));
  g.rotation.z = -0.35;
  return g;
}
export function lata() {
  const g = grupo(cilindro(0.24, 0.24, 0.58, COR3D.vermelho, [0, 0, 0], 0.05), cilindro(0.22, 0.24, 0.05, 0xc8ced6, [0, 0.31, 0], 0.02));
  g.add(cilindro(0.245, 0.245, 0.12, 0xffffff, [0, 0.02, 0], 0));
  g.rotation.z = 0.4;
  return g;
}
export function papel() {
  const a = peca(new G.IcosahedronGeometry(0.34, 0), 0xf3f0e6, { contorno: 0.05 });
  a.rotation.set(0.4, 0.3, 0.2);
  const b = peca(new G.IcosahedronGeometry(0.2, 0), 0xe1dccb, { contorno: 0.04 });
  b.position.set(0.3, -0.18, 0.1);
  return grupo(a, b);
}
export function banana() {
  const m = peca(new G.TorusGeometry(0.3, 0.09, 10, 18, Math.PI * 0.85), 0xffd84a, { contorno: 0.04 });
  m.rotation.z = Math.PI * 1.08;
  const g = grupo(m);
  // cascas abertas caídas e pontinha marrom
  for (const s of [-1, 1]) {
    const c = esfera(0.14, 0xffd84a, [s * 0.18, -0.38, 0.05], [0.55, 1, 0.25], 0.03);
    c.rotation.z = s * 0.7;
    g.add(c);
  }
  g.add(esfera(0.05, 0x6b4a1f, [0.28, 0.06, 0], null, 0));
  return g;
}
export function caixinha() {
  const tex = texturaCanvas(128, 160, (c, w, h) => {
    c.fillStyle = "#ff9a1f"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#ffffff"; c.beginPath(); c.arc(w / 2, h * 0.55, 34, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ff7a00"; c.beginPath(); c.arc(w / 2, h * 0.55, 24, 0, Math.PI * 2); c.fill();
  });
  const g = grupo(caixa(0.36, 0.52, 0.24, 0xffffff, [0, -0.05, 0], 0.05, { map: tex }));
  const canudo = cilindro(0.025, 0.025, 0.3, COR3D.rosa, [0.08, 0.3, 0], 0.015);
  canudo.rotation.z = -0.3;
  g.add(canudo);
  g.rotation.set(0.1, -0.4, 0.3);
  return g;
}

// ---------- cenário
export function lixeira(cor = COR3D.verde) {
  const g = grupo(cilindro(0.38, 0.32, 0.8, cor, [0, 0.4, 0], 0.05), cilindro(0.42, 0.42, 0.1, cor, [0, 0.85, 0], 0.04));
  const tex = texturaCanvas(128, 128, (c) => { c.font = "900 96px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#ffffff"; c.fillText("♻", 64, 70); });
  const p = new G.Mesh(new G.PlaneGeometry(0.4, 0.4), new G.MeshBasicMaterial({ map: tex, transparent: true }));
  p.position.set(0, 0.42, 0.37);
  g.add(p);
  return g;
}
export function arvoreCor(cor = COR3D.verde, escala = 1) {
  const g = grupo(cilindro(0.25, 0.32, 2.2, COR3D.marrom, [0, 1.1, 0], 0.08, 8));
  for (const [x, y, z, r] of [[0, 2.9, 0, 1.2], [0.8, 2.4, 0.2, 0.85], [-0.75, 2.45, -0.1, 0.9], [0.1, 3.6, 0.1, 0.85]]) {
    const b = peca(new G.IcosahedronGeometry(r, 1), cor, { contorno: 0.1 });
    b.position.set(x, y, z);
    g.add(b);
  }
  g.scale.setScalar(escala);
  return g;
}
export function alface(x, z) {
  const g = new G.Group();
  for (const [dx, dy, dz, r] of [[0, 0.12, 0, 0.18], [0.12, 0.08, 0.05, 0.14], [-0.12, 0.08, 0.04, 0.14], [0, 0.08, 0.13, 0.13]]) {
    g.add(esfera(r, 0x7fd85a, [dx, dy, dz], [1, 0.8, 1], 0.03));
  }
  g.position.set(x, 0, z);
  return g;
}

// Planta do canteiro: cresce em 5 estágios (semente → broto → folhas → flor → fruto)
export function criarPlanta() {
  const g = new G.Group();
  const partes = [];
  const parte = (obj, de, ate = 9) => { obj.scale.setScalar(0.0001); partes.push({ obj, de, ate, s: 0, v: 0, base: obj.userData.base ?? [1, 1, 1] }); g.add(obj); return obj; };
  g.add(monte(0.42, C.terraEscura, 0));
  parte(esfera(0.13, 0xc98a4a, [0, 0.2, 0.08], null, 0.04), 1, 1);
  const geoCaule = new G.CylinderGeometry(0.05, 0.07, 1, 8);
  geoCaule.translate(0, 0.5, 0);
  const caule = peca(geoCaule, C.caule, { contorno: 0.04 });
  caule.position.y = 0.12;
  g.add(caule);
  const alturas = [0, 0, 0.5, 0.95, 1.35, 1.4];
  caule.scale.set(1, 0.0001, 1);
  const folha = (y, lado, tam) => {
    const f = new G.Group();
    const m = esfera(0.24 * tam, C.folha, [lado * 0.22 * tam, 0, 0], [1, 0.36, 0.55], 0.04);
    f.add(m);
    f.rotation.z = lado * 0.35;
    f.position.y = y;
    return f;
  };
  parte(folha(0.45, -1, 1.1), 2); parte(folha(0.45, 1, 1.1), 2);
  parte(folha(0.85, -1, 1), 3); parte(folha(0.85, 1, 1), 3);
  parte(folha(1.15, -1, 0.8), 4); parte(folha(1.15, 1, 0.8), 4);
  const cab = cabecaFlor(COR3D.rosa);
  cab.position.set(0, 1.5, 0.05); cab.rotation.x = -0.25; cab.scale.setScalar(1.6);
  cab.userData.base = [1.6, 1.6, 1.6];
  parte(cab, 4, 4);
  // frutos (tomates) pendurados e um no topo
  for (const [x, y, z, s] of [[-0.42, 0.72, 0.1, 0.7], [0.42, 0.95, 0.1, 0.7], [0, 1.62, 0.05, 0.85], [0.3, 0.4, 0.2, 0.55]]) {
    const t = fruto();
    t.position.set(x, y, z);
    t.userData.base = [s, s, s];
    parte(t, 5);
  }
  let estagio = 0, cauleS = 0, cauleV = 0;
  return {
    grupo: g,
    get estagio() { return estagio; },
    definir(n) { estagio = n; },
    atualizar(dt, t) {
      for (const p of partes) {
        const alvo = estagio >= p.de && estagio <= p.ate ? 1 : 0;
        // mola: cresce passando um pouquinho do tamanho e volta (efeito "boing")
        for (let h = dt; h > 1e-6; h -= 1 / 60) { // passinhos de 1/60 s: estável com quadros lentos
          const d = Math.min(h, 1 / 60);
          p.v += ((alvo - p.s) * 140 - p.v * 11) * d;
          p.s = Math.max(0, p.s + p.v * d);
        }
        const s = Math.max(0.0001, p.s);
        p.obj.visible = p.s > 0.002;
        p.obj.scale.set(p.base[0] * s, p.base[1] * s, p.base[2] * s);
      }
      for (let h = dt; h > 1e-6; h -= 1 / 60) {
        const d = Math.min(h, 1 / 60);
        cauleV += ((alturas[estagio] - cauleS) * 90 - cauleV * 10) * d;
        cauleS = Math.max(0.0001, cauleS + cauleV * d);
      }
      caule.scale.y = cauleS;
      g.rotation.z = Math.sin(t * 1.3) * 0.025; // balança com o vento
    },
  };
}
