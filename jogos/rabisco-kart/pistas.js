// As 10 pistas do Rabisco Kart (valem para todos os modos: contas, cores, ônibus, inglês...).
// A pista 1 é o circuito original da escola; as outras têm traçado "radial" (um raio que varia em volta
// de um centro), que nunca cruza com ele mesmo, e um tema: grama, céu, neblina e a decoração em volta.
// A pista vem de ?pista=N (1 a 10); o jogo recarrega a página ao trocar de pista.

import { THREE } from "../../src/motor3d/toon.js";
import { luaB } from "./blocos.js";

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

// ---------- decorações dos temas: de blocos (blocos.js); as do circuito da escola (lápis, árvore, livros) também
export { decoracaoB as decoracao } from "./blocos.js";

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
  const lua = luaB();
  lua.position.set(-400, 380, 600);
  cena.add(pontos, lua);
}
