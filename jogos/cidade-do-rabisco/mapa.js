// Traçado da Cidade do Rabisco (dados puros, sem three.js): ruas como linhas com largura, os lugares
// da cidade e as rotas dos carros. Usado pela montagem 3D (cidade.js), pelo minimapa e pelos testes.
//
// Formato da cidade (vista de cima, x para a direita e z para baixo):
//  - Avenida Central de leste a oeste (com canteiro e árvores) que chega numa rotatória com a praça e o chafariz;
//  - ruas retas de norte a sul (Oeste e Leste) e a Rua do Norte, cruzando com semáforos;
//  - a Rua das Curvas, sinuosa, no sul (passa pelo parque com o lago);
//  - a Rua das Casas Coloridas, curtinha, e a Rua do Contorno em volta de tudo (cantos arredondados).
// Unidade: o Rabisco tem 1,8 de altura.

import { PARCEIROS } from "./parceiros.js";

export const BORDA = 125;

const arco = (cx, cz, r, a0, a1, n) => {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return pts;
};
function retanguloArredondado(x0, z0, x1, z1, r) {
  const n = 6;
  return [
    ...arco(x1 - r, z0 + r, r, -Math.PI / 2, 0, n),
    ...arco(x1 - r, z1 - r, r, 0, Math.PI / 2, n),
    ...arco(x0 + r, z1 - r, r, Math.PI / 2, Math.PI, n),
    ...arco(x0 + r, z0 + r, r, Math.PI, Math.PI * 1.5, n),
  ];
}
export const curvaSul = (x) => 75 + 18 * Math.sin((x + 125) / 40);
const curvas = [];
for (let x = -125; x <= 125.01; x += 6.25) curvas.push([x, curvaSul(x)]);

// w: largura do asfalto · fechada: volta para o começo · canteiro: ilha verde no meio (avenida)
export const RUAS = [
  { id: "avenida-o", nome: "Avenida Central", w: 16, canteiro: true, pts: [[-125, 0], [-19, 0]] },
  { id: "avenida-l", nome: "Avenida Central", w: 16, canteiro: true, pts: [[19, 0], [125, 0]] },
  { id: "rotatoria", nome: "Rotatória da Praça", w: 10, fechada: true, pts: arco(0, 0, 18, 0, Math.PI * 2, 36).slice(0, -1) },
  { id: "norte", nome: "Rua do Sino", w: 11, pts: [[0, -19], [0, -70]] },
  { id: "sul", nome: "Rua da Escola", w: 11, pts: [[0, 19], [0, curvaSul(0)]] },
  { id: "oeste", nome: "Rua Oeste", w: 11, pts: [[-72, -125], [-72, 125]] },
  { id: "leste", nome: "Rua Leste", w: 11, pts: [[72, -125], [72, 125]] },
  { id: "rua-norte", nome: "Rua do Norte", w: 11, pts: [[-125, -70], [125, -70]] },
  { id: "casas", nome: "Rua das Casas Coloridas", w: 9, pts: [[-72, 40], [0, 40]] },
  { id: "curvas", nome: "Rua das Curvas", w: 11, pts: curvas },
  { id: "contorno", nome: "Rua do Contorno", w: 11, fechada: true, pts: retanguloArredondado(-125, -125, 125, 125, 22) },
];
export const CALCADA = 3; // largura da calçada dos dois lados de cada rua

// ---------- geometria
function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
export function segmentos(rua) {
  const s = [];
  const n = rua.pts.length;
  for (let i = 0; i < (rua.fechada ? n : n - 1); i++) s.push([rua.pts[i], rua.pts[(i + 1) % n]]);
  return s;
}
// distância até a beira do asfalto (negativa = em cima da rua)
export function distRua(x, z, ignorar = null) {
  let melhor = Infinity, qual = null;
  for (const r of RUAS) {
    if (r === ignorar) continue;
    for (const [[ax, az], [bx, bz]] of segmentos(r)) {
      const d = distSeg(x, z, ax, az, bx, bz) - r.w / 2;
      if (d < melhor) { melhor = d; qual = r; }
    }
  }
  return { d: melhor, rua: qual };
}
export const naRua = (x, z) => distRua(x, z).d < 0;

// ---------- lugares (porta na calçada, virada para a rua; dir = para onde a fachada olha)
const L = (id, nome, x, z, dx, dz, extra = {}) => ({ id, nome, x, z, dir: [dx, dz], rot: Math.atan2(dx, dz), raio: 12, recuo: 7, ...extra });
export const LUGARES = [
  L("escola", "Escola Educarte", -36, -78.5, 0, 1),
  L("hospital", "Hospital", 36, -78.5, 0, 1),
  L("bombeiros", "Bombeiros", 100, -78.5, 0, 1),
  L("biblioteca", "Biblioteca", -80.5, -35, 1, 0),
  L("igreja", "Igreja", -40, -61.5, 0, -1, { recuo: 12 }),
  L("correio", "Correio", -50, -11.5, 0, 1),
  L("padaria", "Padaria", 40, -11.5, 0, 1),
  L("mercado", "Mercado", 40, -61.5, 0, -1),
  L("praca", "Praça", 0, 0, 0, 1, { raio: 15, recuo: 0 }),
  L("casas", "Rua das Casas Coloridas", -36, 40, 0, 1, { raio: 15, recuo: 0 }),
  L("casas2", "Vila", -80.5, 32, 1, 0, { raio: 14, recuo: 0 }),
  L("parque", "Parque", 30, 71.5, 0, 1, { raio: 14, recuo: 0 }),
];
// lojas das empresas parceiras (parceiros.js): no lado sul da Avenida Central, logo depois da rotatória
// (as duas primeiras ficam a poucos passos da largada) e depois perto das pontas da avenida
export const PONTOS_PARCEIROS = [[34, 11.5, 0, -1], [-34, 11.5, 0, -1], [100, 11.5, 0, -1], [-100, 11.5, 0, -1]];
PARCEIROS.slice(0, PONTOS_PARCEIROS.length).forEach((p, i) => {
  const [x, z, dx, dz] = PONTOS_PARCEIROS[i];
  LUGARES.push(L(`parceiro-${p.id}`, p.nome, x, z, dx, dz, { parceiro: p }));
});
export const lugar = (id) => LUGARES.find((l) => l.id === id);

// casas coloridas: quatro do lado norte da Rua das Casas (porta para a rua); duas na Vila; a casa da Vovó
export const CASAS = [
  { cor: "vermelha", hex: 0xd94a3d, numero: 1, x: -60, z: 32.5, dir: [0, 1] },
  { cor: "azul", hex: 0x3d7ad9, numero: 2, x: -44, z: 32.5, dir: [0, 1] },
  { cor: "amarela", hex: 0xf2c94c, numero: 3, x: -28, z: 32.5, dir: [0, 1] },
  { cor: "verde", hex: 0x4cae5a, numero: 4, x: -12, z: 32.5, dir: [0, 1] },
  { cor: "rosa", hex: 0xec8cb8, numero: 5, x: -80.5, z: 20, dir: [1, 0] },
  { cor: "lilás", hex: 0xa98ce0, numero: 6, x: -80.5, z: 44, dir: [1, 0] },
  { cor: "laranja", hex: 0xf09a4a, numero: 7, x: 80.5, z: 40, dir: [1, 0].map((v) => -v), vovo: true },
];

// parque (sul da Rua das Curvas): lago, playground e bosque; a praça é a ilha da rotatória
export const PARQUE = { x0: 2, x1: 66, z0: 80, z1: 116 };
export const LAGO = { x: 38, z: 98, r: 10 };
export const PLAYGROUND = { x: 14, z: 96 };
export const PRACA = { x: 0, z: 0, r: 12.5 };

// cruzamentos com semáforo e faixa de pedestre: [x, z, rua que corre em x, rua que corre em z]
export const SEMAFOROS = [
  { x: -72, z: 0, ruaX: "avenida-o", ruaZ: "oeste" },
  { x: 72, z: 0, ruaX: "avenida-l", ruaZ: "leste" },
  { x: -72, z: -70, ruaX: "rua-norte", ruaZ: "oeste" },
  { x: 72, z: -70, ruaX: "rua-norte", ruaZ: "leste" },
].map((s) => ({ ...s, wX: RUAS.find((r) => r.id === s.ruaX).w, wZ: RUAS.find((r) => r.id === s.ruaZ).w }));

// rotas fechadas dos carros (sentido de quem dirige; a faixa da direita é calculada na hora)
const rotatoriaRota = arco(0, 0, 18, Math.PI * 2, 0, 36).slice(0, -1); // anti-horário visto de cima
const contornoRota = retanguloArredondado(-125, -125, 125, 125, 22);
const curvaEntre = (xa, xb) => curvas.filter(([x]) => x > Math.min(xa, xb) + 0.1 && x < Math.max(xa, xb) - 0.1);
export const ROTAS = [
  { pts: contornoRota, carros: 4 },
  { pts: [[-72, -70], [72, -70], [72, 125], [-72, 125]], carros: 3 },
  { pts: rotatoriaRota, carros: 2 },
  { pts: [[-72, curvaSul(-72)], ...curvaEntre(-72, 72), [72, curvaSul(72)], [72, 125], [-72, 125]].reverse(), carros: 2 },
  { pts: [[72, 0], [125, 0], [125, -70], [72, -70]], carros: 1 },
];

// vagas dos carros que o Rabisco pode dirigir (conversíveis): perto da largada e do hospital
export const VAGAS = [
  { x: 3.4, z: 34, ang: Math.PI, cor: 0xec2e8c },
  { x: 26, z: -72.6, ang: -Math.PI / 2, cor: 0x00b5f0 },
];
export const LARGADA = { x: 10.5, z: 26, dir: Math.PI };
