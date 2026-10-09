// Guarda-roupa 3D do Rabisco (jogos do Camarim): chapéus, casacos, botas, luvas e objetos de mão
// que se encaixam nas articulações do Rabisco3D e acompanham a animação.
//
// Regra da marca: a logo do peito nunca some. Casacos ficam abertos na frente (a camiseta com a logo
// aparece) e a camisa de time leva a logo oficial impressa no mesmo lugar.
//
//   import { vestir, tirar, ROUPAS, poseDasRoupas } from "../../src/motor3d/roupas3d.js";
//   vestir(rb, "galocha");            // troca o que estiver no mesmo lugar (slot)
//   vestir(rb, "camisa-time", { cor: 0xe8413c, numero: 10 });
//   const extra = poseDasRoupas(rb);   // ex.: braço erguido segurando o guarda-chuva (usar com posar)
//
// Unidades: as do Rabisco3D (1 = diâmetro da cabeça, pés em y = 0). O tronco começa em y = 2,15.

import { THREE, toon, comContorno, texturaCanvas } from "./toon.js";

const G = THREE;
const TINTA = 0x151515;
const LARANJA_BONE = 0xff6400;

// malha com cor chapada e contorno preto
function pc(geo, cor, pai, { borda = 0.03, x = 0, y = 0, z = 0, extra } = {}) {
  const m = new G.Mesh(geo, toon(cor, extra));
  m.castShadow = true;
  if (borda) comContorno(m, borda);
  m.position.set(x, y, z);
  pai.add(m);
  return m;
}
// grupo preso ao tronco, com y na medida do corpo inteiro
function noTronco(rb, y = 2.15) {
  const g = new G.Group();
  g.position.y = y - 2.15;
  rb.tronco.add(g);
  return g;
}
const linha = (pts, raio, cor, pai) => pc(new G.TubeGeometry(new G.CatmullRomCurve3(pts.map((p) => new G.Vector3(...p))), 32, raio, 8, false), cor, pai, { borda: 0 });

// ---------------------------------------------------------------- peças base

// Casaco aberto na frente. Perfil de baixo (yBaixo) até o ombro; mangas curtas ou longas.
function casaco(rb, { cor, yBaixo = 2.1, abre = 0.66, mangaLonga = false, gola = null, faixas = null, bolso = null }) {
  const objs = [];
  const g = noTronco(rb, 0 + 2.15);
  objs.push(g);
  const sobe = [];
  const flare = yBaixo < 2.2 ? 0.1 : 0.02;
  for (let i = 0; i <= 10; i++) {
    const y = yBaixo + ((3.5 - yBaixo) * i) / 10;
    const t = i / 10;
    sobe.push(new G.Vector2(0.6 + flare * (1 - t) ** 2, y - 2.15));
  }
  sobe.push(new G.Vector2(0.58, 3.58 - 2.15), new G.Vector2(0.53, 3.64 - 2.15));
  const geo = new G.LatheGeometry(sobe, 48, abre, Math.PI * 2 - abre * 2);
  const m = new G.Mesh(geo, toon(cor, { side: G.DoubleSide }));
  m.castShadow = true;
  g.add(m);
  // traço preto nas bordas da abertura e na barra, como o contorno do desenho
  for (const s of [-1, 1]) {
    linha(sobe.map((p) => [s * p.x * Math.sin(abre) * 1.01, p.y, p.x * Math.cos(abre) * 1.01]), 0.018, TINTA, g);
  }
  const barra = new G.Mesh(new G.TorusGeometry(sobe[0].x * 1.005, 0.018, 6, 48, Math.PI * 2 - abre * 2), toon(TINTA));
  barra.rotation.set(Math.PI / 2, 0, Math.PI / 2 - (Math.PI * 2 - abre * 2) - abre + Math.PI);
  barra.rotation.z = -(Math.PI / 2 - abre); // começa numa borda e vai até a outra pelas costas
  barra.position.y = sobe[0].y;
  g.add(barra);
  if (faixas) {
    for (const y of faixas.alturas) {
      const f = new G.Mesh(new G.CylinderGeometry(0.0, 0.0, 0.1, 48, 1, true, abre, Math.PI * 2 - abre * 2), toon(faixas.cor, { side: G.DoubleSide }));
      f.geometry = new G.CylinderGeometry(0.615, 0.615, 0.1, 48, 1, true, abre, Math.PI * 2 - abre * 2);
      f.position.y = y - 2.15;
      g.add(f);
    }
  }
  if (gola) {
    const t = pc(new G.TorusGeometry(0.56, 0.09, 10, 40), gola, g, { borda: 0.02, y: 3.6 - 2.15 });
    t.rotation.x = Math.PI / 2;
  }
  if (bolso) {
    // bolso no lado esquerdo (fora da logo), com uma caneta
    const pivo = new G.Group(); pivo.rotation.y = 1.05; g.add(pivo);
    pc(new G.BoxGeometry(0.24, 0.2, 0.02), cor, pivo, { borda: 0.02, y: 2.75 - 2.15, z: 0.615 });
    pc(new G.CylinderGeometry(0.02, 0.02, 0.2, 8), bolso, pivo, { borda: 0.01, x: 0.05, y: 2.86 - 2.15, z: 0.63 });
  }
  // mangas
  for (const braco of [rb.bracoE, rb.bracoD]) {
    objs.push(pc(new G.CylinderGeometry(0.205, 0.195, 0.58, 20), cor, braco.ombro, { borda: 0.025, y: -0.25 }));
    if (faixas) objs.push(pc(new G.CylinderGeometry(0.21, 0.21, 0.08, 20), faixas.cor, braco.ombro, { borda: 0, y: -0.42 }));
    if (mangaLonga) objs.push(pc(new G.CylinderGeometry(0.125, 0.12, 0.6, 16), cor, braco.cotovelo, { borda: 0.02, y: -0.3 }));
  }
  return objs;
}

// Camisa de time fechada, com a logo oficial no peito e o número nas costas
function camisaTime(rb, { cor = 0xe8413c, numero = 10, detalhe = 0xffffff }) {
  const objs = [];
  const g = noTronco(rb);
  objs.push(g);
  const perfil = [[0.6, 2.12], [0.6, 3.0], [0.59, 3.5], [0.56, 3.6], [0.52, 3.64]].map(([r, y]) => new G.Vector2(r, y - 2.15));
  pc(new G.LatheGeometry(perfil, 48), cor, g, { borda: 0.03 });
  // gola em V da cor do detalhe
  const gola = pc(new G.TorusGeometry(0.54, 0.035, 8, 40), detalhe, g, { borda: 0, y: 3.6 - 2.15 });
  gola.rotation.x = Math.PI / 2;
  // logo oficial (mesmo lugar e tamanho da camiseta do Rabisco)
  const raiz = rb.raiz;
  const tex = new G.TextureLoader().load(`${raiz}/assets/marca/logos/branco.png`);
  tex.colorSpace = G.SRGBColorSpace;
  const ang = 2 * Math.asin(0.31 / 0.605);
  const logo = new G.Mesh(new G.CylinderGeometry(0.605, 0.605, 0.33, 24, 1, true, -ang / 2, ang), new G.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  logo.position.y = 3.12 - 2.15;
  logo.renderOrder = 3;
  g.add(logo);
  // número nas costas
  const texNum = texturaCanvas(256, 256, (c, w, h) => {
    c.font = "800 200px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 18; c.strokeStyle = "#151515"; c.lineJoin = "round"; c.strokeText(String(numero), w / 2, h / 2 + 16);
    c.fillStyle = `#${new G.Color(detalhe).getHexString()}`; c.fillText(String(numero), w / 2, h / 2 + 16);
  });
  const angN = 1.0;
  const num = new G.Mesh(new G.CylinderGeometry(0.606, 0.606, 0.5, 24, 1, true, Math.PI - angN / 2, angN), new G.MeshBasicMaterial({ map: texNum, transparent: true, depthWrite: false }));
  num.position.y = 3.05 - 2.15;
  num.renderOrder = 3;
  g.add(num);
  for (const braco of [rb.bracoE, rb.bracoD]) {
    objs.push(pc(new G.CylinderGeometry(0.205, 0.195, 0.5, 20), cor, braco.ombro, { borda: 0.025, y: -0.22 }));
    objs.push(pc(new G.CylinderGeometry(0.2, 0.2, 0.07, 20), detalhe, braco.ombro, { borda: 0, y: -0.46 }));
  }
  return objs;
}

// Botas por cima do tênis (galocha, bota de bombeiro, de astronauta, chuteira)
function botas(rb, { cor, cano = 0.62, faixa = null, sola = TINTA, listras = null }) {
  const objs = [];
  for (const perna of [rb.pernaE, rb.pernaD]) {
    const g = new G.Group();
    perna.pe.add(g);
    objs.push(g);
    const pe = pc(new G.SphereGeometry(1, 28, 18), cor, g, { borda: 0.03, y: -0.49, z: 0.08 });
    pe.scale.set(0.315, 0.27, 0.53);
    const s = pc(new G.SphereGeometry(1, 28, 12), sola, g, { borda: 0.02, y: -0.66, z: 0.09 });
    s.scale.set(0.325, 0.1, 0.55);
    if (cano > 0) {
      pc(new G.CylinderGeometry(0.2, 0.19, cano, 20), cor, g, { borda: 0.03, y: -0.4 + cano / 2 });
      if (faixa) pc(new G.CylinderGeometry(0.205, 0.205, 0.08, 20), faixa, g, { borda: 0, y: -0.4 + cano * 0.7 });
    }
    if (listras) for (let i = 0; i < 3; i++) {
      const l = pc(new G.BoxGeometry(0.03, 0.2, 0.06), listras, g, { borda: 0, x: 0.3, y: -0.47, z: -0.05 + i * 0.12 });
      l.rotation.z = -0.3;
      const l2 = l.clone(); l2.position.x = -0.3; l2.rotation.z = 0.3; g.add(l2);
    }
  }
  return objs;
}

// Luvas tipo "mitene" cobrindo a mão inteira
function luvas(rb, { cor, punho = null }) {
  const objs = [];
  for (const [braco, lado] of [[rb.bracoE, 1], [rb.bracoD, -1]]) {
    const g = new G.Group();
    g.position.y = -0.78;
    braco.cotovelo.add(g);
    objs.push(g);
    const m = pc(new G.SphereGeometry(1, 24, 16), cor, g, { borda: 0.025, y: -0.17 });
    m.scale.set(0.09, 0.2, 0.16);
    const pol = pc(new G.CapsuleGeometry(0.045, 0.08, 4, 8), cor, g, { borda: 0.015, x: -lado * 0.02, y: -0.08, z: 0.14 });
    pol.rotation.x = -0.6;
    pc(new G.CylinderGeometry(0.1, 0.1, 0.1, 16), punho ?? cor, g, { borda: 0.02, y: 0.04 });
  }
  return objs;
}

// Chapéu em cúpula (capacete): cobre a ponta do lápis
function cupula(rb, { cor, alto = 2.05, aba = 0, abaTras = 0, cristaCor = null, placa = null }) {
  const g = noTronco(rb, 4.74);
  const d = pc(new G.SphereGeometry(0.62, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), cor, g, { borda: 0.04 });
  d.scale.y = alto;
  const base = pc(new G.CylinderGeometry(0.625, 0.625, 0.14, 40), cor, g, { borda: 0.03, y: 0.04 });
  base.scale.y = 1;
  if (aba) {
    const a = pc(new G.CylinderGeometry(aba, aba, 0.05, 40), cor, g, { borda: 0.03, y: 0.0 });
    a.scale.z = 1 + abaTras;
    a.position.z = -abaTras * 0.45;
    a.rotation.x = -0.12;
  }
  if (cristaCor) {
    const c = pc(new G.BoxGeometry(0.1, 0.3, 1.25), cristaCor, g, { borda: 0.02, y: 0.62 * alto - 0.08 });
    c.scale.y = 1;
  }
  if (placa) {
    const p = pc(new G.CylinderGeometry(0.2, 0.2, 0.04, 6), placa, g, { borda: 0.02, y: 0.45, z: 0.6 });
    p.rotation.x = Math.PI / 2 - 0.25;
  }
  return [g];
}

// ---------------------------------------------------------------- catálogo
// slot: onde a peça vai (uma por slot). escondeAba: tira a aba do boné de baixo de chapéus.
export const ROUPAS = {
  // ---- cabeça
  "gorro": { nome: "Gorro", icone: "🧶", slot: "cabeca", escondeAba: true, monta: (rb, o) => {
    const g = noTronco(rb, 4.72);
    const cor = o.cor ?? 0xe8413c;
    const perfil = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; perfil.push(new G.Vector2(0.6 * Math.cos(t * 1.2) ** 0.7 * (1 - t * 0.55), t * 1.65)); }
    perfil.push(new G.Vector2(0, 1.68));
    pc(new G.LatheGeometry(perfil, 40), cor, g, { borda: 0.04 });
    pc(new G.CylinderGeometry(0.64, 0.64, 0.26, 40), 0xffffff, g, { borda: 0.03, y: 0.1 });
    pc(new G.SphereGeometry(0.2, 18, 12), 0xffffff, g, { borda: 0.03, y: 1.75 });
    return [g];
  } },
  "chapeu-palha": { nome: "Chapéu de sol", icone: "👒", slot: "cabeca", escondeAba: true, monta: (rb) => {
    const g = noTronco(rb, 4.76);
    pc(new G.CylinderGeometry(1.25, 1.25, 0.05, 48), 0xf3d27a, g, { borda: 0.04 });
    const copa = pc(new G.SphereGeometry(0.62, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), 0xf3d27a, g, { borda: 0.04 });
    copa.scale.y = 2.15;
    pc(new G.CylinderGeometry(0.635, 0.635, 0.2, 40), 0xec2e8c, g, { borda: 0.02, y: 0.12 });
    return [g];
  } },
  "capacete-bombeiro": { nome: "Capacete de bombeiro", icone: "⛑️", slot: "cabeca", escondeAba: true, monta: (rb) => cupula(rb, { cor: 0xe8413c, aba: 0.85, abaTras: 0.35, cristaCor: 0xe8413c, placa: 0xffcc1f }) },
  "touca-chef": { nome: "Chapéu de chef", icone: "🧑‍🍳", slot: "cabeca", escondeAba: true, monta: (rb) => {
    const g = noTronco(rb, 4.74);
    pc(new G.CylinderGeometry(0.62, 0.58, 1.15, 40), 0xffffff, g, { borda: 0.04, y: 0.57 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      pc(new G.SphereGeometry(0.36, 18, 12), 0xffffff, g, { borda: 0.03, x: Math.sin(a) * 0.36, y: 1.3, z: Math.cos(a) * 0.36 });
    }
    pc(new G.SphereGeometry(0.42, 18, 12), 0xffffff, g, { borda: 0.03, y: 1.5 });
    return [g];
  } },
  "capacete-astronauta": { nome: "Capacete de astronauta", icone: "👩‍🚀", slot: "cabeca", escondeAba: true, monta: (rb) => {
    const g = noTronco(rb, 4.72);
    const vidro = new G.Mesh(new G.SphereGeometry(1.02, 40, 28), toon(0xbfe9ff, { transparent: true, opacity: 0.28, depthWrite: false }));
    vidro.scale.y = 1.38;
    vidro.renderOrder = 5;
    g.add(vidro);
    const aro = pc(new G.TorusGeometry(0.66, 0.11, 12, 40), 0xffffff, g, { borda: 0.03, y: -1.2 });
    aro.rotation.x = Math.PI / 2;
    const brilho = new G.Mesh(new G.SphereGeometry(0.12, 12, 8), new G.MeshBasicMaterial({ color: 0xffffff }));
    brilho.scale.set(1, 1.8, 0.3);
    brilho.position.set(-0.55, 0.55, 0.75);
    g.add(brilho);
    return [g];
  } },
  "coroa": { nome: "Coroa", icone: "👑", slot: "cabeca", monta: (rb) => {
    const g = noTronco(rb, 4.95);
    pc(new G.CylinderGeometry(0.6, 0.6, 0.26, 40, 1, true), 0xffcc1f, g, { borda: 0, extra: { side: G.DoubleSide } });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = pc(new G.ConeGeometry(0.13, 0.32, 4), 0xffcc1f, g, { borda: 0.02, x: Math.sin(a) * 0.59, y: 0.28, z: Math.cos(a) * 0.59 });
      p.rotation.y = a;
      if (i % 2 === 0) pc(new G.SphereGeometry(0.07, 10, 8), [0xec2e8c, 0x00b5f0][i % 4 ? 1 : 0], g, { borda: 0.01, x: Math.sin(a) * 0.62, y: 0, z: Math.cos(a) * 0.62 });
    }
    return [g];
  } },
  // ---- rosto
  "oculos-sol": { nome: "Óculos de sol", icone: "🕶️", slot: "rosto", monta: (rb, o) => {
    const g = noTronco(rb, 4.13);
    const aro = o.cor ?? 0xec2e8c;
    const lentes = [-0.62, 0.47]; // ângulo de cada olho em volta da cabeça (medidas do rosto oficial)
    const pts = [];
    for (const a of lentes) {
      const p = new G.Group(); p.rotation.y = a; g.add(p);
      const l = pc(new G.CylinderGeometry(0.22, 0.22, 0.04, 28), 0x1d2633, p, { borda: 0, z: 0.64 });
      l.rotation.x = Math.PI / 2; l.scale.z = 1.25;
      const t = pc(new G.TorusGeometry(0.225, 0.035, 8, 28), aro, p, { borda: 0, z: 0.66 });
      t.scale.y = 1.25;
      const b = new G.Mesh(new G.CircleGeometry(0.05, 10), new G.MeshBasicMaterial({ color: 0xffffff }));
      b.position.set(-0.08, 0.1, 0.665); p.add(b);
      pts.push(a);
    }
    // ponte entre as lentes e hastes até os fones
    const R = 0.66;
    const ponto = (a, y = 0) => [Math.sin(a) * R, y, Math.cos(a) * R];
    linha([ponto(lentes[0] + 0.33, 0.06), ponto((lentes[0] + lentes[1]) / 2, 0.1), ponto(lentes[1] - 0.33, 0.06)], 0.03, aro, g);
    linha([ponto(lentes[0] - 0.33), [-0.62, 0, 0.2], [-0.6, -0.04, 0]], 0.028, aro, g);
    linha([ponto(lentes[1] + 0.33), [0.62, 0, 0.2], [0.6, -0.04, 0]], 0.028, aro, g);
    return [g];
  } },
  // ---- pescoço
  "cachecol": { nome: "Cachecol", icone: "🧣", slot: "pescoco", monta: (rb, o) => {
    const g = noTronco(rb, 3.5);
    const cor = o.cor ?? 0x00b5f0;
    const t = pc(new G.TorusGeometry(0.6, 0.11, 12, 40), cor, g, { borda: 0.03 });
    t.rotation.x = Math.PI / 2; t.scale.z = 0.8;
    const pivo = new G.Group(); pivo.rotation.y = 0.85; g.add(pivo);
    const ponta = pc(new G.BoxGeometry(0.24, 0.62, 0.07), cor, pivo, { borda: 0.025, y: -0.36, z: 0.66 });
    ponta.rotation.x = 0.08;
    for (const y of [-0.2, -0.45]) pc(new G.BoxGeometry(0.245, 0.06, 0.075), 0xffffff, pivo, { borda: 0, y, z: 0.665 });
    return [g];
  } },
  "estetoscopio": { nome: "Estetoscópio", icone: "🩺", slot: "pescoco", monta: (rb) => {
    const g = noTronco(rb, 3.5);
    const t = pc(new G.TorusGeometry(0.61, 0.03, 8, 40), 0x555b66, g, { borda: 0 });
    t.rotation.x = Math.PI / 2;
    const ang = (a, y, r = 0.63) => [Math.sin(a) * r, y, Math.cos(a) * r];
    linha([ang(0.8, 0), ang(0.85, -0.3), ang(0.9, -0.62)], 0.028, 0x555b66, g);
    linha([ang(-0.8, 0), ang(-0.85, -0.25)], 0.028, 0x555b66, g);
    const disco = pc(new G.CylinderGeometry(0.09, 0.09, 0.05, 20), 0xc9d1db, g, { borda: 0.015 });
    disco.position.set(...ang(0.9, -0.68, 0.65)); disco.rotation.set(Math.PI / 2, 0, 0); disco.rotation.order = "YXZ"; disco.rotation.y = 0.9;
    return [g];
  } },
  // ---- corpo
  "capa-chuva": { nome: "Capa de chuva", icone: "🧥", slot: "corpo", monta: (rb) => casaco(rb, { cor: 0xffcc1f, yBaixo: 1.7, mangaLonga: true }) },
  "casaco": { nome: "Casaco", icone: "🧥", slot: "corpo", monta: (rb, o) => casaco(rb, { cor: o.cor ?? 0xe8413c, yBaixo: 2.1, mangaLonga: true, gola: 0xffffff }) },
  "jaleco": { nome: "Jaleco", icone: "🥼", slot: "corpo", monta: (rb) => casaco(rb, { cor: 0xffffff, yBaixo: 1.5, mangaLonga: true, bolso: 0x00b5f0 }) },
  "jaqueta-bombeiro": { nome: "Jaqueta de bombeiro", icone: "🧯", slot: "corpo", monta: (rb) => casaco(rb, { cor: 0xd9a441, yBaixo: 1.9, mangaLonga: true, faixas: { cor: 0xf4f7a0, alturas: [2.25, 2.65] } }) },
  "traje-astronauta": { nome: "Traje espacial", icone: "🧑‍🚀", slot: "corpo", monta: (rb) => casaco(rb, { cor: 0xf1f4f8, yBaixo: 1.9, mangaLonga: true, faixas: { cor: 0x00b5f0, alturas: [2.3] } }) },
  "avental": { nome: "Avental", icone: "🍳", slot: "corpo", monta: (rb) => {
    const g = noTronco(rb);
    const perfil = [[0.62, 1.75], [0.6, 2.4], [0.6, 2.88]].map(([r, y]) => new G.Vector2(r, y - 2.15));
    const m = new G.Mesh(new G.LatheGeometry(perfil, 32, -1.0, 2.0), toon(0xffffff, { side: G.DoubleSide }));
    m.castShadow = true; g.add(m);
    const laco = pc(new G.TorusGeometry(0.605, 0.03, 6, 48), 0xec2e8c, g, { borda: 0, y: 2.84 - 2.15 });
    laco.rotation.x = Math.PI / 2;
    const bolso = new G.Group(); g.add(bolso);
    pc(new G.BoxGeometry(0.34, 0.18, 0.02), 0xec2e8c, bolso, { borda: 0.015, y: 2.3 - 2.15, z: 0.625 });
    return [g];
  } },
  "camisa-time": { nome: "Camisa do time", icone: "👕", slot: "corpo", monta: (rb, o) => camisaTime(rb, o) },
  // ---- mãos (as duas)
  "luvas": { nome: "Luvas", icone: "🧤", slot: "maos", monta: (rb, o) => luvas(rb, { cor: o.cor ?? 0xe8413c, punho: 0xffffff }) },
  "luvas-astronauta": { nome: "Luvas de astronauta", icone: "🧤", slot: "maos", monta: (rb) => luvas(rb, { cor: 0xf1f4f8, punho: 0x00b5f0 }) },
  "luvas-bombeiro": { nome: "Luvas de bombeiro", icone: "🧤", slot: "maos", monta: (rb) => luvas(rb, { cor: 0xffcc1f, punho: 0x2b2b2b }) },
  "luvas-goleiro": { nome: "Luvas de goleiro", icone: "🧤", slot: "maos", monta: (rb, o) => luvas(rb, { cor: o.cor ?? 0x1fc08e, punho: 0xffffff }) },
  // ---- objeto na mão esquerda
  "guarda-chuva": { nome: "Guarda-chuva", icone: "☂️", slot: "mao", pose: { oE: [-2.75, 0.05], cE: -0.35 }, monta: (rb) => {
    // preso à mão erguida; o pivô corrige a inclinação do braço para a cúpula ficar reta sobre a cabeça
    const g = new G.Group(); g.position.y = -0.95; rb.bracoE.cotovelo.add(g);
    const reto = new G.Group(); g.add(reto);
    reto.userData.endireitar = true;
    pc(new G.CylinderGeometry(0.03, 0.03, 1.5, 8), 0x2b2b2b, reto, { borda: 0, y: 0.55 });
    const cabo = pc(new G.TorusGeometry(0.1, 0.03, 6, 12, Math.PI), 0x2b2b2b, reto, { borda: 0, y: -0.2 });
    cabo.rotation.z = Math.PI;
    const c = pc(new G.SphereGeometry(1.4, 8, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), 0xec2e8c, reto, { borda: 0.05, extra: { side: G.DoubleSide, flatShading: true } });
    c.position.y = 0.95;
    for (let i = 0; i < 8; i += 2) c.add(new G.Mesh(new G.SphereGeometry(1.41, 8, 10, (i / 8) * Math.PI * 2, Math.PI / 4, 0, Math.PI / 2.4), toon(0xffffff, { side: G.DoubleSide, flatShading: true })));
    pc(new G.SphereGeometry(0.06, 8, 6), 0x2b2b2b, reto, { borda: 0, y: 2.36 });
    return [g];
  } },
  "garrafinha": { nome: "Garrafinha de água", icone: "💧", slot: "mao", monta: (rb) => {
    const g = new G.Group(); g.position.set(0, -0.98, 0.1); rb.bracoE.cotovelo.add(g);
    pc(new G.CylinderGeometry(0.1, 0.1, 0.42, 16), 0x7fd6ff, g, { borda: 0.02 });
    pc(new G.CylinderGeometry(0.06, 0.06, 0.08, 12), 0x00b5f0, g, { borda: 0.015, y: 0.25 });
    return [g];
  } },
  "colher": { nome: "Colher de pau", icone: "🥄", slot: "mao", pose: { oE: [-0.9, 0.3], cE: -0.9 }, monta: (rb) => {
    const g = new G.Group(); g.position.y = -0.95; rb.bracoE.cotovelo.add(g);
    pc(new G.CylinderGeometry(0.035, 0.035, 0.9, 8), 0xc8894b, g, { borda: 0.012, y: -0.35 });
    const c = pc(new G.SphereGeometry(0.12, 14, 10), 0xc8894b, g, { borda: 0.015, y: -0.85 });
    c.scale.set(1, 1.4, 0.5);
    return [g];
  } },
  "maleta": { nome: "Maleta de médico", icone: "💼", slot: "mao", monta: (rb) => {
    const g = new G.Group(); g.position.y = -1.0; rb.bracoE.cotovelo.add(g);
    pc(new G.BoxGeometry(0.2, 0.42, 0.62), 0xffffff, g, { borda: 0.03, y: -0.3 });
    pc(new G.BoxGeometry(0.21, 0.24, 0.07), 0xe8413c, g, { borda: 0, y: -0.3 });
    pc(new G.BoxGeometry(0.21, 0.07, 0.24), 0xe8413c, g, { borda: 0, y: -0.3 });
    const alca = pc(new G.TorusGeometry(0.1, 0.025, 6, 12, Math.PI), 0x2b2b2b, g, { borda: 0, y: -0.06 });
    alca.rotation.y = Math.PI / 2;
    return [g];
  } },
  "mangueira": { nome: "Mangueira", icone: "🚿", slot: "mao", pose: { oE: [-1.3, 0.2], cE: -0.2 }, monta: (rb) => {
    const g = new G.Group(); g.position.y = -0.95; rb.bracoE.cotovelo.add(g);
    pc(new G.CylinderGeometry(0.07, 0.05, 0.5, 12), 0x9aa3ad, g, { borda: 0.015, y: -0.2 });
    pc(new G.CylinderGeometry(0.07, 0.07, 0.12, 12), 0xe8413c, g, { borda: 0.015, y: 0.05 });
    return [g];
  } },
  "bandeirinha": { nome: "Bandeirinha", icone: "🚩", slot: "mao", pose: { oE: [-0.2, 2.3], cE: -0.2 }, monta: (rb, o) => {
    const g = new G.Group(); g.position.y = -0.95; rb.bracoE.cotovelo.add(g);
    pc(new G.CylinderGeometry(0.025, 0.025, 1.2, 8), 0xf3c99a, g, { borda: 0.01, y: -0.5 });
    const b = pc(new G.BoxGeometry(0.02, 0.4, 0.6), o.cor ?? 0xe8413c, g, { borda: 0.02, y: -0.9, z: 0.3 });
    b.rotation.x = 0;
    return [g];
  } },
  // ---- pés
  "galocha": { nome: "Galocha", icone: "🥾", slot: "pes", monta: (rb, o) => botas(rb, { cor: o.cor ?? 0x2bb24c, cano: 0.7 }) },
  "botas-bombeiro": { nome: "Botas de bombeiro", icone: "🥾", slot: "pes", monta: (rb) => botas(rb, { cor: 0x2b2b2b, cano: 0.7, faixa: 0xffcc1f }) },
  "botas-astronauta": { nome: "Botas de astronauta", icone: "🥾", slot: "pes", monta: (rb) => botas(rb, { cor: 0xf1f4f8, cano: 0.5, faixa: 0x00b5f0, sola: 0x9aa3ad }) },
  "chuteira": { nome: "Chuteira", icone: "👟", slot: "pes", monta: (rb, o) => botas(rb, { cor: o.cor ?? 0x2b2b2b, cano: 0, listras: 0xffffff, sola: 0xffffff }) },
  // ---- boné do Rabisco com outra cor (time)
  "bone-cor": { nome: "Boné do time", icone: "🧢", slot: "bone", monta: (rb, o) => {
    rb.bone.material = toon(o.cor ?? 0xe8413c);
    rb.aba.material = toon(o.cor ?? 0xe8413c);
    return [];
  }, desmonta: (rb) => { rb.bone.material = toon(LARANJA_BONE); rb.aba.material = toon(LARANJA_BONE); } },
};

// ---------------------------------------------------------------- vestir e tirar
export function vestir(rb, id, opcoes = {}) {
  const r = ROUPAS[id];
  if (!r) throw new Error(`roupa desconhecida: ${id}`);
  rb.roupas ??= {};
  tirar(rb, r.slot);
  const objs = r.monta(rb, opcoes);
  rb.roupas[r.slot] = { id, objs, opcoes };
  atualizarAba(rb);
  return rb.roupas[r.slot];
}

export function tirar(rb, slot) {
  const atual = rb.roupas?.[slot];
  if (!atual) return;
  for (const o of atual.objs) o.removeFromParent();
  ROUPAS[atual.id].desmonta?.(rb);
  delete rb.roupas[slot];
  atualizarAba(rb);
}

export function tirarTudo(rb) { for (const s of Object.keys(rb.roupas ?? {})) tirar(rb, s); }
export const vestindo = (rb, id) => Object.values(rb.roupas ?? {}).some((r) => r.id === id);

function atualizarAba(rb) {
  const chapeu = rb.roupas?.cabeca;
  rb.pivoAba.visible = !(chapeu && ROUPAS[chapeu.id].escondeAba);
}

// Objetos que precisam ficar de pé no mundo (guarda-chuva): chamar depois de posar, a cada quadro
const _q = new G.Quaternion(), _p = new G.Vector3(), _c = new G.Vector3();
export function ajustarRoupas(rb) {
  const mao = rb.roupas?.mao;
  if (!mao) return;
  for (const o of mao.objs) o.traverse((x) => {
    if (!x.userData.endireitar) return;
    x.parent.updateWorldMatrix(true, false);
    x.parent.getWorldQuaternion(_q);
    _q.invert().multiply(rb.grupo.getWorldQuaternion(new G.Quaternion()));
    x.quaternion.copy(_q);
    // desloca a cúpula até o meio da cabeça (a mão fica um pouco para o lado)
    x.parent.getWorldPosition(_p);
    rb.tronco.getWorldPosition(_c);
    const off = new G.Vector3(_c.x - _p.x, 0, _c.z - _p.z).multiplyScalar(0.3);
    x.position.copy(x.parent.worldToLocal(_p.clone().add(off)));
  });
}

// Pose pedida pelas roupas (ex.: guarda-chuva erguido) ou null
export function poseDasRoupas(rb) {
  const mao = rb.roupas?.mao;
  return mao ? ROUPAS[mao.id].pose ?? null : null;
}
