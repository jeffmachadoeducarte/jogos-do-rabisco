// Rabiscópolis: traçado da cidade em dados puros (sem three.js), usado pela montagem 3D (mundo.js), pelo minimapa,
// pela física e pelo teste em node (ferramentas/teste/rabiscopolis-mapa.mjs).
//
// A cidade tem ~300 × 300 m, dividida em 3 × 3 blocos de 100 m (só o bloco atual e os vizinhos ficam visíveis):
//
//            x: -150 ······ -50 ······· 50 ······ 150
//   z -150   ┌──────────┬───────────┬──────────┐
//            │ Morro    │  Escola   │ Torres   │      Avenida da Esperança (z = -50)
//    -50     ├──────────┼───────────┼──────────┤
//            │ Bairro   │  Centro   │ Comércio │      Rua das Casas (z = 0, oeste) · Rua do Comércio (z = 0, leste)
//     50     ├──────────┼───────────┼──────────┤
//            │Fazendinha│  Parque   │ Jardins  │      Avenida da Alegria (z = 50)
//    150     └──────────┴───────────┴──────────┘      Avenida do Contorno em volta de tudo (cantos arredondados)
//
// Unidade: o Rabisco tem 1,8 de altura. x para a direita, z para baixo (vista de cima). dir = para onde a fachada olha.

import { PARCEIROS } from "../cidade-do-rabisco/parceiros.js";

export const BORDA = 150;
export const BLOCO = 100;
export const CALCADA = 3; // largura da calçada dos dois lados de cada rua

// bloco (0..2, 0..2) de um ponto
export const blocoDe = (x, z) => [Math.max(0, Math.min(2, Math.floor((x + BORDA) / BLOCO))), Math.max(0, Math.min(2, Math.floor((z + BORDA) / BLOCO)))];

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

// ---------- ruas (w: largura do asfalto · fechada: volta para o começo)
const CONTORNO = retanguloArredondado(-140, -140, 140, 140, 24);
export const RUAS = [
  { id: "contorno", nome: "Avenida do Contorno", w: 12, fechada: true, pts: CONTORNO },
  { id: "av-norte", nome: "Avenida da Esperança", w: 12, pts: [[-140, -50], [140, -50]] },
  { id: "av-sul", nome: "Avenida da Alegria", w: 12, pts: [[-140, 50], [140, 50]] },
  { id: "oeste", nome: "Rua do Sol", w: 11, pts: [[-50, -140], [-50, 140]] },
  { id: "leste", nome: "Rua da Lua", w: 11, pts: [[50, -140], [50, 140]] },
  { id: "casas", nome: "Rua das Casas", w: 9, pts: [[-140, 0], [-50, 0]] },
  { id: "comercio", nome: "Rua do Comércio", w: 10, pts: [[50, 0], [140, 0]] },
  { id: "flores", nome: "Rua das Flores", w: 9, pts: [[-140, -95], [-50, -95]] },
];

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

// retângulo (x0..x1, z0..z1) da pegada de algo com a frente em (x, z) olhando para dir, w de largura e d de fundo,
// começando `recuo` metros para trás da frente (dir é sempre um dos 4 eixos)
export function pegadaDe(x, z, dir, w, d, recuo = 0) {
  const [dx, dz] = dir;
  const fx = x - dx * recuo, fz = z - dz * recuo;      // meio da fachada
  const cx = fx - dx * (d / 2), cz = fz - dz * (d / 2); // centro do prédio
  const deitado = Math.abs(dx) > 0.5;
  const sx = (deitado ? d : w) / 2, sz = (deitado ? w : d) / 2;
  return { x0: cx - sx, x1: cx + sx, z0: cz - sz, z1: cz + sz, cx, cz };
}

// ---------- lugares (o ponto x, z fica na calçada, na frente da porta; o prédio começa `recuo` m para trás)
// pegada: [largura, fundo] do prédio · raio: até onde conta "estou neste lugar" · foto: fachada de foto real
const L = (id, nome, x, z, dx, dz, extra = {}) => ({ id, nome, x, z, dir: [dx, dz], rot: Math.atan2(dx, dz), raio: 12, recuo: 1.5, pegada: null, bairro: "", ...extra });
export const LUGARES = [
  // Centro: a praça e a Igreja Reviver (a igreja da escola), de frente para a praça
  L("praca", "Praça da Paz", 0, 12, 0, 1, { raio: 17, recuo: 0, bairro: "Centro" }),
  L("igreja", "Igreja Reviver", 0, -17, 0, 1, { recuo: 4, pegada: [26, 16], raio: 14, bairro: "Centro", foto: "assets/parceiros/igreja-reviver.webp?v=1", proporcao: 1024 / 550 }),
  // Escola, Hospital e Bombeiros: de frente para a Avenida da Esperança
  L("hospital", "Hospital Cuidar", -28, -59.5, 0, 1, { pegada: [18, 15], bairro: "Escola" }),
  L("escola", "Escola Educarte", 0, -59.5, 0, 1, { pegada: [26, 16], raio: 14, bairro: "Escola" }),
  L("bombeiros", "Bombeiros", 29, -59.5, 0, 1, { pegada: [16, 15], bairro: "Escola" }),
  // Comércio: lado norte da Rua do Comércio
  L("mercado", "Mercado Cesta Cheia", 70, -9, 0, 1, { pegada: [20, 14], bairro: "Comércio" }),
  L("padaria", "Padaria Pão Quentinho", 93, -9, 0, 1, { pegada: [15, 12], bairro: "Comércio" }),
  L("sorveteria", "Sorveteria Geladinho", 115, -9, 0, 1, { pegada: [15, 12], bairro: "Comércio" }),
  // Parque com lago e Fazendinha (de frente para a Avenida da Alegria)
  L("parque", "Parque do Lago", 0, 59.5, 0, -1, { raio: 16, recuo: 0, bairro: "Parque" }),
  // Esportes (sudeste): campo de futebol com arquibancada; quadra e horta comunitária (nordeste)
  L("campo", "Campo de Futebol", 95, 59.5, 0, -1, { raio: 18, recuo: 0, bairro: "Esportes" }),
  L("quadra", "Quadra da Alegria", 98, -117, -1, 0, { raio: 14, recuo: 0, bairro: "Esportes" }),
  L("horta", "Horta Comunitária", 115, -101, 0, 1, { raio: 12, recuo: 0, bairro: "Esportes" }),
  L("fazendinha", "Fazendinha", -95, 59.5, 0, -1, { raio: 18, recuo: 3, pegada: [44, 30], bairro: "Fazendinha" }),
];

// lojas das empresas parceiras (../cidade-do-rabisco/parceiros.js), na ordem da lista: lado sul da Rua do Comércio
// e, sobrando parceira, na Avenida da Esperança (bloco das Torres). A loja tem no máximo LOJA_MAX m de largura.
export const LOJA_MAX = 19;
export const PONTOS_PARCEIROS = [[70, 9, 0, -1], [93, 9, 0, -1], [116, 9, 0, -1], [95, -59.5, 0, 1], [118, -59.5, 0, 1]];
PARCEIROS.slice(0, PONTOS_PARCEIROS.length).forEach((p, i) => {
  const [x, z, dx, dz] = PONTOS_PARCEIROS[i];
  LUGARES.push(L(`parceiro-${p.id}`, p.nome, x, z, dx, dz, { parceiro: p, pegada: [LOJA_MAX, 7.5], recuo: 1, bairro: "Comércio" }));
});
export const lugar = (id) => LUGARES.find((l) => l.id === id);

// ---------- Bairro das Casas: 8 lotes na Rua das Casas (4 de cada lado), porta virada para a rua
const CORES_CASA = [
  { cor: "rosa", hex: 0xf59ac0, telhado: 0xc2477a }, { cor: "azul", hex: 0x8cc8f5, telhado: 0x2f6fc0 },
  { cor: "amarela", hex: 0xffd86b, telhado: 0xe0662e }, { cor: "verde", hex: 0x9ee08a, telhado: 0x3c9a4a },
  { cor: "lilás", hex: 0xc8b0f5, telhado: 0x7a52c9 }, { cor: "laranja", hex: 0xffb27a, telhado: 0xb8452a },
  { cor: "menta", hex: 0x8fe3cf, telhado: 0x1f8a7a }, { cor: "creme", hex: 0xfff0c9, telhado: 0xd94a3d },
];
export const LOTE = { w: 15, d: 22, recuo: 1 }; // largura, fundo (inclui quintal) e recuo da cerca até a calçada
// Bairro das Casas (Rua das Casas, lotes 1 a 8) e Vila das Flores (Rua das Flores, lotes 9 a 16)
export const LOTES = [
  ...[-121, -103, -85, -67].flatMap((x, i) => [
    { numero: i * 2 + 1, x, z: -8.5, dir: [0, 1], bairro: "Bairro das Casas" },
    { numero: i * 2 + 2, x, z: 8.5, dir: [0, -1], bairro: "Bairro das Casas" },
  ]),
  ...[-120, -102, -84, -66].flatMap((x, i) => [
    { numero: 9 + i * 2, x, z: -103.5, dir: [0, 1], bairro: "Vila das Flores" },
    { numero: 10 + i * 2, x, z: -86.5, dir: [0, -1], bairro: "Vila das Flores" },
  ]),
].map((l, i) => ({ ...l, ...CORES_CASA[(i * 3) % CORES_CASA.length], ...(i < 8 ? CORES_CASA[i] : {}), id: `lote-${l.numero}`, rot: Math.atan2(l.dir[0], l.dir[1]) }));

// ---------- parque, praça e fazendinha
export const PRACA = { x: 0, z: 12, r: 16 };
export const LAGO = { x: 8, z: 104, r: 15 };
export const PLAYGROUND = { x: -26, z: 84 };
export const PARQUE = { x0: -40, x1: 40, z0: 62, z1: 128 };
export const FAZENDA = { x0: -128, x1: -62, z0: 62, z1: 128 };
export const CAMPO = { x: 95, z: 92, w: 30, d: 46 };            // campo de futebol (gol no norte e no sul)
export const ESPORTES = { x0: 62, x1: 130, z0: 62, z1: 130 };    // campo, arquibancada e vestiário
export const QUADRA = { x0: 100, x1: 130, z0: -130, z1: -104 };  // quadra poliesportiva
export const HORTA = { x0: 100, x1: 130, z0: -98, z1: -72 };     // horta comunitária

// ---------- vagas dos veículos que o Rabisco pode dirigir (fora do asfalto, na beira da rua)
// tipo: "carro" (conversível) | "onibus" · ang: para onde a frente aponta (0 = +z)
export const VAGAS = [
  { x: 16, z: 37, ang: Math.PI / 2, tipo: "carro", cor: 0xec2e8c },
  { x: -18, z: 37, ang: -Math.PI / 2, tipo: "carro", cor: 0x00b5f0 },
  { x: 30, z: -40, ang: Math.PI / 2, tipo: "onibus" },
];
export const LARGADA = { x: 0, z: 33, dir: Math.PI }; // na frente da praça, olhando para a igreja

// ---------- prédios de enchimento (sempre iguais, pela semente): onde não tem lugar, lote, parque nem fazenda
function semente(s) {
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const sobrepoe = (a, b, folga = 0) => a.x0 < b.x1 + folga && a.x1 > b.x0 - folga && a.z0 < b.z1 + folga && a.z1 > b.z0 - folga;
export const PEGADAS_FIXAS = [
  ...LUGARES.filter((l) => l.pegada).map((l) => ({ id: l.id, ...pegadaDe(l.x, l.z, l.dir, l.pegada[0], l.pegada[1], l.recuo) })),
  ...LOTES.map((l) => ({ id: l.id, ...pegadaDe(l.x, l.z, l.dir, LOTE.w, LOTE.d, LOTE.recuo) })),
  { id: "praca", x0: PRACA.x - PRACA.r - 2, x1: PRACA.x + PRACA.r + 2, z0: PRACA.z - PRACA.r - 2, z1: PRACA.z + PRACA.r + 2 },
  { id: "parque", ...PARQUE }, { id: "fazenda", ...FAZENDA },
  { id: "esportes", ...ESPORTES }, { id: "quadra-area", ...QUADRA }, { id: "horta-area", ...HORTA },
  // pontos de parceira ainda livres ficam reservados (a próxima parceira já tem lugar)
  ...PONTOS_PARCEIROS.slice(PARCEIROS.length).map(([x, z, dx, dz], i) => ({ id: `reserva-parceira-${i}`, ...pegadaDe(x, z, [dx, dz], LOJA_MAX, 7.5, 1) })),
  ...VAGAS.map((v, i) => { const meioC = v.tipo === "onibus" ? 7.5 : 2.6, meioL = v.tipo === "onibus" ? 3 : 1.4, deitado = Math.abs(Math.sin(v.ang)) > 0.5; return { id: `vaga-${i}`, x0: v.x - (deitado ? meioC : meioL), x1: v.x + (deitado ? meioC : meioL), z0: v.z - (deitado ? meioL : meioC), z1: v.z + (deitado ? meioL : meioC) }; }),
  { id: "largada", x0: LARGADA.x - 3, x1: LARGADA.x + 3, z0: LARGADA.z - 3, z1: LARGADA.z + 3 },
];
export const PREDIOS = [];
{
  const r = semente(2027);
  const cores = ["#f6d2a8", "#bfe0f2", "#f5c4c4", "#c9eabf", "#fbe3a6", "#d8cdf2", "#ffd9b8", "#c4ece6"];
  const ocupado = (p) => [...PEGADAS_FIXAS, ...PREDIOS].some((o) => sobrepoe(p, o, 3));
  for (let gx = -132; gx <= 132; gx += 17) for (let gz = -132; gz <= 132; gz += 17) {
    const x = gx + (r() - 0.5) * 3, z = gz + (r() - 0.5) * 3;
    const centro = Math.abs(x) < 50 && Math.abs(z) < 50;
    const w = centro ? 11 + r() * 3 : 12 + r() * 5, d = centro ? 9 + r() * 2 : 11 + r() * 4;
    // fachada para a rua mais perto
    const gxR = distRua(x + 1, z).d - distRua(x - 1, z).d, gzR = distRua(x, z + 1).d - distRua(x, z - 1).d;
    const dir = Math.abs(gxR) > Math.abs(gzR) ? [-Math.sign(gxR), 0] : [0, -Math.sign(gzR)];
    const deitado = Math.abs(dir[0]) > 0.5;
    const p = { x0: x - (deitado ? d : w) / 2, x1: x + (deitado ? d : w) / 2, z0: z - (deitado ? w : d) / 2, z1: z + (deitado ? w : d) / 2 };
    const cantos = [[p.x0, p.z0], [p.x1, p.z0], [p.x1, p.z1], [p.x0, p.z1]];
    if (cantos.some(([cx, cz]) => distRua(cx, cz).d < CALCADA + 1.5 || Math.abs(cx) > 128 || Math.abs(cz) > 128)) continue;
    if (Math.hypot(x, z) > 175 || ocupado(p)) continue;
    const andares = centro ? 2 + Math.floor(r() * 2) : 3 + Math.floor(r() * 5);
    PREDIOS.push({ id: `predio-${PREDIOS.length}`, ...p, cx: x, cz: z, w, d, dir, rot: Math.atan2(dir[0], dir[1]), andares, cor: cores[Math.floor(r() * cores.length)], tipo: r() < 0.3 ? "sobrado" : "predio" });
  }
}

// ---------- semáforos nos cruzamentos das avenidas com as ruas do Sol e da Lua
export const SEMAFOROS = [[-50, -50], [50, -50], [-50, 50], [50, 50]].map(([x, z]) => ({ x, z, wX: 12, wZ: 11 }));

// ---------- rotas fechadas dos carros (sentido de quem dirige; a faixa da direita é calculada na hora)
export const ROTAS = [
  { id: "contorno", pts: CONTORNO, carros: 4 },
  { id: "centro", pts: [[-50, -50], [50, -50], [50, 50], [-50, 50]], carros: 3 },
  { id: "leste", pts: [[50, -50], [140, -50], [140, 50], [50, 50]], carros: 2 },
  { id: "oeste", pts: [[-140, -50], [-50, -50], [-50, 50], [-140, 50]], carros: 2 },
  { id: "comercio", pts: [[50, 0], [140, 0], [140, 50], [50, 50]], carros: 1 },
  { id: "flores", pts: [[-140, -95], [-50, -95], [-50, -50], [-140, -50]], carros: 1 },
];

// ---------- moradores do estojo: em que rua caminham (calçada) e de que tipo são
export const MORADORES = [
  { tipo: "lapis", cor: 0xe8413c, nome: "Lápis Vermelho", rua: "av-sul", lado: 1 },
  { tipo: "borracha", nome: "Borrachinha", rua: "casas", lado: -1 },
  { tipo: "apontador", cor: 0x2f8fe8, nome: "Apontador Azul", rua: "comercio", lado: 1 },
  { tipo: "giz", cor: 0xffa21f, nome: "Giz de Cera Laranja", rua: "oeste", lado: 1 },
  { tipo: "cola", nome: "Colinha", rua: "av-norte", lado: 1 },
  { tipo: "regua", nome: "Régua Rui", rua: "leste", lado: -1 },
  { tipo: "pincel", cor: 0x8e6cff, nome: "Pincel Roxo", rua: "av-sul", lado: -1 },
  { tipo: "caderno", cor: 0x1fc08e, nome: "Caderninho", rua: "comercio", lado: -1 },
  { tipo: "clipe", cor: 0xec2e8c, nome: "Clipe Rosa", rua: "casas", lado: 1 },
  { tipo: "lapis", cor: 0x58c43a, nome: "Lápis Verde", rua: "av-norte", lado: -1 },
];
