// As 10 pistas do Rabisco Kart (valem para todos os modos: contas, cores, ônibus, inglês...).
// A pista 1 é o circuito original da escola; as outras têm traçado "radial" (um raio que varia em volta
// de um centro), que nunca cruza com ele mesmo, e um tema: grama, céu, neblina e a decoração em volta.
// A pista vem de ?pista=N (1 a 10); o jogo recarrega a página ao trocar de pista.

import { THREE, toon, peca, COR3D } from "../../src/motor3d/toon.js";

const ORIGINAL = [
  [0, 0], [60, -10], [115, -42], [160, -18], [178, 34], [146, 84], [92, 92], [64, 132], [86, 182],
  [44, 224], [-30, 212], [-72, 160], [-58, 104], [-110, 72], [-134, 12], [-92, -30], [-42, -22],
].map(([x, z]) => [x * 1.35, z * 1.35]);

// traçado radial: r(θ) = R · (1 + Σ a·sin(kθ + φ)), esticado em x/z, começando numa reta
function radial({ R = 165, ondas, ex = 1, ez = 1, n = 22 }) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    let r = 1;
    for (const [k, a, f] of ondas) r += a * Math.sin(k * t + f);
    pts.push([20 + Math.cos(t) * R * r * ex, 110 + Math.sin(t) * R * r * ez]);
  }
  return pts;
}

// traçado de "ruas": cantos retos arredondados (raio r), como quarteirões de cidade. Cada canto é [x, z, raio];
// raio 0 = ponto de passagem (o primeiro é sempre no meio de uma reta: é a largada).
function ruas(cantos, raioPadrao = 30) {
  const pts = [];
  const n = cantos.length;
  for (let i = 0; i < n; i++) {
    const [x, z, r0] = cantos[i];
    const r = r0 ?? raioPadrao;
    if (!r) { pts.push([x, z]); continue; }
    const [ax, az] = cantos[(i - 1 + n) % n], [bx, bz] = cantos[(i + 1) % n];
    const la = Math.hypot(ax - x, az - z), lb = Math.hypot(bx - x, bz - z);
    const ra = Math.min(r, la * 0.45), rb = Math.min(r, lb * 0.45);
    const p0 = [x + ((ax - x) / la) * ra, z + ((az - z) / la) * ra], p2 = [x + ((bx - x) / lb) * rb, z + ((bz - z) / lb) * rb];
    for (let k = 0; k <= 4; k++) { // curva de Bézier quadrática com o canto como controle
      const t = k / 4, u = 1 - t;
      pts.push([u * u * p0[0] + 2 * u * t * x + t * t * p2[0], u * u * p0[1] + 2 * u * t * z + t * t * p2[1]]);
    }
  }
  // pontos intermediários nas retas longas: a curva suave não "barriga" entre cantos distantes
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    const k = Math.max(1, Math.floor(Math.hypot(bx - ax, bz - az) / 45));
    for (let s = 0; s < k; s++) out.push([ax + ((bx - ax) * s) / k, az + ((bz - az) * s) / k]);
  }
  return out;
}

// Pista 1: o circuito original da escola. Pistas 2 a 10: traçados novos de ruas (ferradura, L, chicane,
// grampo, quarteirões, T...), cada uma com o seu tema. Os de antes (radiais) continuam em radial() acima.
export const PISTAS = [
  { nome: "Escola", emoji: "🏫", pontos: ORIGINAL, tema: "escola" },
  { nome: "Parque", emoji: "🌳", tema: "parque", pontos: ruas([[0, -90, 0], [220, -90], [220, 300], [110, 300], [110, 120], [-70, 120], [-70, 300], [-200, 300], [-200, -90]]) },
  { nome: "Praia", emoji: "🏖️", tema: "praia", pontos: ruas([[0, -80, 0], [240, -80], [240, 80], [60, 80, 40], [60, 320], [-200, 320, 50], [-200, -80, 50]]) },
  { nome: "Floresta", emoji: "🌲", tema: "floresta", pontos: ruas([[0, -90, 0], [220, -90], [220, 20, 26], [80, 20, 26], [80, 120, 26], [220, 120, 26], [220, 320], [-190, 320, 45], [-190, -90, 45]]) },
  { nome: "Fazenda", emoji: "🐮", tema: "fazenda", pontos: ruas([[0, -90, 0], [230, -90], [230, 330], [140, 330, 30], [140, 110, 28], [40, 110, 28], [40, 330, 30], [-200, 330], [-200, -90]]) },
  { nome: "Cidade", emoji: "🏙️", tema: "cidade", pontos: ruas([[0, -90, 0], [120, -90, 24], [120, -20, 24], [240, -20], [240, 200, 26], [150, 200, 26], [150, 330], [-80, 330], [-80, 200, 26], [-200, 200, 26], [-200, -90]]) },
  { nome: "Montanha de Neve", emoji: "⛄", tema: "neve", pontos: ruas([[0, -90, 0], [220, -60, 50], [150, 320, 60], [-60, 330, 50], [-210, 120, 60], [-150, -90, 50]]) },
  { nome: "Deserto", emoji: "🌵", tema: "deserto", pontos: ruas([[0, -90, 0], [250, -90], [250, 30, 30], [80, 30, 30], [80, 320], [-40, 320], [-40, 30, 30], [-210, 30, 30], [-210, -90]]) },
  { nome: "Pôr do Sol", emoji: "🌅", tema: "por-do-sol", pontos: ruas([[0, -90, 0], [220, -90, 40], [250, 60, 40], [140, 150, 36], [240, 250, 40], [150, 340, 40], [-120, 330, 50], [-220, 170, 45], [-120, 60, 40], [-210, -60, 40]]) },
  { nome: "Noite Estrelada", emoji: "🌙", tema: "noite", pontos: ruas([[0, -90, 0], [120, -90, 20], [150, -50, 20], [240, -50], [240, 300], [60, 300, 22], [30, 260, 22], [-60, 260, 22], [-90, 300, 22], [-210, 300], [-210, -90]]) },
];

// cores e decoração de cada tema
export const TEMAS = {
  escola: { ceu: [0x1fa9ff, 0xd8f5ff], neblina: 0xd8f5ff, grama: ["#62c845", "#58b93d"], acost: "#47a933", luz: 2.4, morros: [0x7dd36a, 0x9fe08a], deco: ["lapis", "arvore", "livros"] },
  parque: { ceu: [0x2f9bff, 0xe2f6ff], neblina: 0xe2f6ff, grama: ["#6fd04f", "#62c845"], acost: "#4fb53a", luz: 2.4, morros: [0x7dd36a, 0x9fe08a], deco: ["arvore", "flores", "arvore"] },
  praia: { ceu: [0x22b8ff, 0xfff4d6], neblina: 0xfff4d6, grama: ["#f6deA0", "#efd28a"], acost: "#e8c46f", luz: 2.6, morros: [0x3ab0e8, 0x7fd6ff], deco: ["palmeira", "guarda-sol", "palmeira"], chao: "#f3d9a4" },
  floresta: { ceu: [0x3a9be0, 0xcfe9d8], neblina: 0xcfe9d8, grama: ["#3fa83a", "#379a33"], acost: "#2f8a2c", luz: 2.0, morros: [0x2f8a2c, 0x46a83d], deco: ["pinheiro", "pinheiro", "arvore"] },
  fazenda: { ceu: [0x3aa7ff, 0xf2f8e6], neblina: 0xf2f8e6, grama: ["#8ad15a", "#7fc44f"], acost: "#a8743a", luz: 2.4, morros: [0x9fd45f, 0xc4e27a], deco: ["celeiro", "feno", "arvore"] },
  cidade: { ceu: [0x4a9ee6, 0xe5eef7], neblina: 0xe5eef7, grama: ["#5fbf4a", "#56b142"], acost: "#9aa3ad", luz: 2.3, morros: [0x8fa4b8, 0xa9bccd], deco: ["predio", "predio", "arvore"] },
  neve: { ceu: [0x7fbfff, 0xf4fbff], neblina: 0xf4fbff, grama: ["#f4f8ff", "#e6eef8"], acost: "#d8e6f5", luz: 2.2, morros: [0xffffff, 0xe6f0fa], deco: ["pinheiro-neve", "boneco-neve", "pinheiro-neve"] },
  deserto: { ceu: [0x46a8f0, 0xfde7c2], neblina: 0xfde7c2, grama: ["#eac27a", "#e2b66a"], acost: "#d6a65a", luz: 2.7, morros: [0xd99a52, 0xe8b06a], deco: ["cacto", "cacto", "pedra"] },
  "por-do-sol": { ceu: [0x6a4fc4, 0xffb27a], neblina: 0xffc79a, grama: ["#7cbf4a", "#71b241"], acost: "#5d9c38", luz: 1.9, corLuz: 0xffc58a, morros: [0x8a6fc4, 0xc48ab4], deco: ["palmeira", "arvore", "lapis"] },
  noite: { ceu: [0x0b1b4a, 0x2a3f86], neblina: 0x1d2d66, grama: ["#2f7a3a", "#2a6e34"], acost: "#245e2d", luz: 0.9, corLuz: 0xaecbff, ambiente: 0.8, morros: [0x1f4a5a, 0x2a5a6a], deco: ["poste", "arvore", "lapis"], estrelas: true },
};

export function pistaAtual() {
  const n = Math.min(PISTAS.length, Math.max(1, Number(new URLSearchParams(location.search).get("pista")) || 1));
  const p = PISTAS[n - 1];
  return { numero: n, ...p, cfg: TEMAS[p.tema], pontos: p.pontos.map(([x, z]) => new THREE.Vector3(x, 0, z)) };
}

// ---------- decorações dos temas (as do circuito da escola vêm de objetos.js)
export function decoracao(tipo, rnd) {
  const g = new THREE.Group();
  if (tipo === "palmeira") {
    for (let i = 0; i < 6; i++) {
      const gomo = peca(new THREE.CylinderGeometry(0.9 - i * 0.06, 1 - i * 0.06, 2.4, 8), 0xb07a45, { contorno: 0.15 });
      gomo.position.set(i * 0.25, 1.2 + i * 2.2, 0);
      g.add(gomo);
    }
    for (let i = 0; i < 7; i++) {
      const folha = peca(new THREE.ConeGeometry(1.2, 7, 4), COR3D.verde, { contorno: 0.15 });
      const a = (i / 7) * Math.PI * 2;
      folha.position.set(1.5 + Math.cos(a) * 3, 13.4, Math.sin(a) * 3);
      folha.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1 - 0.2);
      g.add(folha);
    }
  } else if (tipo === "guarda-sol") {
    const haste = peca(new THREE.CylinderGeometry(0.2, 0.2, 7, 6), 0xffffff, { contorno: 0.08 });
    haste.position.y = 3.5;
    const pano = peca(new THREE.ConeGeometry(5, 2.2, 10), [COR3D.rosa, COR3D.laranja, COR3D.ciano][Math.floor(rnd() * 3)], { contorno: 0.15 });
    pano.position.y = 7.4;
    g.add(haste, pano);
  } else if (tipo === "pinheiro" || tipo === "pinheiro-neve") {
    const tronco = peca(new THREE.CylinderGeometry(0.7, 0.9, 4, 7), COR3D.marrom, { contorno: 0.15 });
    tronco.position.y = 2;
    g.add(tronco);
    for (let i = 0; i < 3; i++) {
      const cone = peca(new THREE.ConeGeometry(5 - i * 1.3, 6, 8), tipo === "pinheiro" ? 0x2e8b3a : 0x3f9a55, { contorno: 0.2 });
      cone.position.y = 5.5 + i * 3.4;
      g.add(cone);
      if (tipo === "pinheiro-neve") {
        const neve = new THREE.Mesh(new THREE.ConeGeometry(3.4 - i * 0.9, 2, 8), toon(0xffffff));
        neve.position.y = 7.6 + i * 3.4;
        g.add(neve);
      }
    }
  } else if (tipo === "boneco-neve") {
    for (const [y, r] of [[2.4, 2.6], [6.2, 1.9], [9.1, 1.3]]) { const b = peca(new THREE.SphereGeometry(r, 16, 12), 0xffffff, { contorno: 0.12 }); b.position.y = y; g.add(b); }
    const nariz = peca(new THREE.ConeGeometry(0.25, 1.4, 8), COR3D.laranja, { contorno: 0.05 });
    nariz.rotation.x = Math.PI / 2; nariz.position.set(0, 9.1, 1.6);
    const chapeu = peca(new THREE.CylinderGeometry(1, 1, 1.4, 12), 0x2b2b2b, { contorno: 0.06 });
    chapeu.position.y = 10.8;
    g.add(nariz, chapeu);
  } else if (tipo === "predio") {
    const andares = 3 + Math.floor(rnd() * 6);
    const cor = [0xf3d9a4, 0xcfe3f2, 0xf4c2c2, 0xd6f0c2, 0xe8d7ff][Math.floor(rnd() * 5)];
    const corpo = peca(new THREE.BoxGeometry(12, andares * 4, 12), cor, { contorno: 0.25 });
    corpo.position.y = andares * 2;
    g.add(corpo);
    for (let a = 0; a < andares; a++) for (const lado of [-1, 1]) for (const x of [-3.5, 0, 3.5]) {
      const j = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), toon(0x7fc8ff));
      j.position.set(x, 2 + a * 4, lado * 6.05);
      if (lado < 0) j.rotation.y = Math.PI;
      g.add(j);
    }
  } else if (tipo === "celeiro") {
    const corpo = peca(new THREE.BoxGeometry(12, 8, 10), 0xc1121f, { contorno: 0.2 });
    corpo.position.y = 4;
    const teto = peca(new THREE.CylinderGeometry(6.4, 6.4, 10.4, 3), 0x7a4a2a, { contorno: 0.2 });
    teto.rotation.set(Math.PI / 2, 0, Math.PI / 2); teto.position.y = 9.2;
    const porta = new THREE.Mesh(new THREE.PlaneGeometry(4, 5), toon(0xffffff));
    porta.position.set(0, 2.5, 5.02);
    g.add(corpo, teto, porta);
  } else if (tipo === "feno") {
    const fardo = peca(new THREE.CylinderGeometry(2, 2, 3, 14), 0xe8c45a, { contorno: 0.1 });
    fardo.rotation.z = Math.PI / 2; fardo.position.y = 2;
    g.add(fardo);
  } else if (tipo === "cacto") {
    const verde = 0x3f9a4a;
    const tronco = peca(new THREE.CapsuleGeometry(1.2, 8, 4, 10), verde, { contorno: 0.12 });
    tronco.position.y = 5;
    g.add(tronco);
    for (const s of [-1, 1]) {
      const braco = peca(new THREE.CapsuleGeometry(0.7, 3, 4, 8), verde, { contorno: 0.1 });
      braco.position.set(s * 2.2, 6 + rnd() * 2, 0);
      g.add(braco);
    }
  } else if (tipo === "pedra") {
    const p = peca(new THREE.DodecahedronGeometry(3 + rnd() * 2, 0), 0xc89a6a, { contorno: 0.15 });
    p.position.y = 1.5; p.scale.y = 0.6;
    g.add(p);
  } else if (tipo === "flores") {
    for (let i = 0; i < 9; i++) {
      const f = peca(new THREE.SphereGeometry(0.6, 8, 6), [COR3D.rosa, COR3D.amarelo, 0xffffff, COR3D.roxo][i % 4], { contorno: 0.05 });
      f.position.set((rnd() - 0.5) * 8, 0.6, (rnd() - 0.5) * 8);
      g.add(f);
    }
  } else if (tipo === "poste") {
    const haste = peca(new THREE.CylinderGeometry(0.3, 0.3, 12, 6), 0x2b2b2b, { contorno: 0.06 });
    haste.position.y = 6;
    const luz = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
    luz.position.y = 12.4;
    g.add(haste, luz);
  }
  return g;
}

// céu de noite: pontinhos de estrela e a lua
export function estrelas(cena) {
  const n = 600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, b = Math.random() * 0.45 + 0.05;
    pos.set([Math.cos(a) * Math.cos(b) * 900, Math.sin(b) * 900, Math.sin(a) * Math.cos(b) * 900], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pontos = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, fog: false }));
  const lua = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff6d0, fog: false }));
  lua.position.set(-400, 380, 600);
  cena.add(pontos, lua);
}
