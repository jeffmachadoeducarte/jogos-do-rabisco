// Rabiscolândia: PESSOAS de verdade em versão boneco de blocos (cabeça quadrada, tronco, braços e pernas de caixas, rosto
// expressivo desenhado). Nenhuma foto vai para o jogo: são bonecos inspirados nelas. Elas não falam.
//  - "sabrina": Diretora Sabrina (Educarte Kids II) — cabelo escuro longo e liso de lado, blazer rosa da Educarte com a
//    logo oficial no peito, calça branca, brincos dourados;
//  - "elaine": Contadora Elaine (Crescente Contabilidade) — óculos de armação grossa, cabelo com pontas caramelo, blusa
//    creme com listras azuis, prancheta do alvará;
//  - "carina": Diretora Carina (Educarte Kids I) — cabelo preto cacheado e volumoso, sorriso largo, vestido bege com cinto;
//  - "aurelio": Aurélio (Crescente Contabilidade) — mais alto e gordinho, cabelo curto grisalho, óculos pretos, barba,
//    camiseta preta e jeans;
//  - "camila": Camila, dona da academia Rise Up — loira com raiz castanha, argolas grandes, regata e legging pretas com
//    "RISE UP" no peito, tênis branco e laranja;
//  - "riseup-dono": Robert, também dono da Rise Up — boné preto "RISE UP", barba cheia, forte, camiseta grafite.
//
// Custo baixo: o corpo inteiro é UMA malha com esqueleto (cada caixa presa ao seu osso) com cor por vértice, mais uma
// malha com os desenhos (rosto e peito). Com a sombrinha redonda: 3 chamadas de desenho.
//
//   import { criarPessoa } from "./pessoas.js";
//   const s = criarPessoa("sabrina");  cena.add(s.grupo);
//   s.atualizar(dt, { modo: "andar", vel });       // modo "parado" | "andar" (vel > 0,2 também anda)
//   s.acenar(2); s.pular(); s.comemorar(2.5); s.orar(true);
//   s.receber(alvara3D);                           // guarda o objeto próprio (prancheta), estica as mãos e segura o alvará
//   s.segurar(null); s.objeto(true); s.calma();     // larga, pega o objeto próprio de volta, encerra aceno/festa

import { THREE, texturaCanvas } from "../../src/motor3d/toon.js";
import { sombraBlob } from "../../src/motor3d/objetos.js";
import { comArestas } from "./blocos.js";

// ---------------------------------------------------------------- esqueleto (posição de repouso, em metros, escala 1)
const OSSOS = [
  ["quadril", -1, [0, 0.98, 0]], ["tronco", 0, [0, 1.02, 0]], ["cabeca", 1, [0, 1.56, 0]], ["cabeloTras", 2, [0, 2.0, -0.16]],
  ["ombroE", 1, [0.42, 1.48, 0]], ["cotoveloE", 4, [0.44, 1.2, 0]], ["maoE", 5, [0.45, 0.92, 0]], ["objeto", 6, [0.5, 0.9, 0.1]],
  ["ombroD", 1, [-0.42, 1.48, 0]], ["cotoveloD", 8, [-0.44, 1.2, 0]], ["maoD", 9, [-0.45, 0.92, 0]],
  ["pernaE", 0, [0.17, 0.92, 0]], ["joelhoE", 11, [0.17, 0.5, 0]], ["pernaD", 0, [-0.17, 0.92, 0]], ["joelhoD", 13, [-0.17, 0.5, 0]],
];
const O = Object.fromEntries(OSSOS.map(([n], i) => [n, i]));
const ALTURA = 2.15;

// ---------------------------------------------------------------- receitas
const PESSOAS = {
  sabrina: { nome: "Diretora Sabrina", escola: "kids2", pele: 0xf2c4a0, roupa: 0xec2e8c, manga: 0xec2e8c, calca: 0xf4f4f4, sapato: 0x1d1c22, frente: "#ffcfe3", lapela: "#e0207f", cabelo: { estilo: "lado", cor: 0x2b1913 }, brinco: 0xf2bb3d, rosto: { iris: "#6e3a18", brow: "#22110a", batom: "#b03f5c", cilios: true, boca: "aberta" }, logo: new URL("../../assets/marca/logos/azul.png", import.meta.url).href, objeto: null },
  elaine: { nome: "Contadora Elaine", empresa: "Crescente Contabilidade", pele: 0xf7d8c4, roupa: 0xf1e4d2, manga: 0xf1e4d2, calca: 0x2e3348, sapato: 0x1d1c22, listras: "#2f3f8f", frente: "#f1e4d2", cabelo: { estilo: "meio", cor: 0x4a2f1f, pontas: 0xb98a55 }, brinco: 0xe9b949, oculos: 0x24242c, rosto: { iris: "#5e3a1c", brow: "#4a2e1c", batom: "#d9707f", cilios: true, boca: "discreta" }, objeto: { tipo: "prancheta" } },
  aurelio: { nome: "Aurélio", empresa: "Crescente Contabilidade", escala: 1.1, pele: 0xf3c2a6, roupa: 0x232328, manga: 0x232328, curta: true, calca: 0x2b3b62, sapato: 0x1a1a1e, frente: "#232328", corpo: { ombros: 1.14, gordo: 1.18 }, cabelo: { estilo: "curto", cor: 0x9c8a6a }, barba: 0xbdb19a, oculos: 0x16161a, rosto: { iris: "#3f5a3a", brow: "#7c6d52", boca: "sorriso", barba: true }, objeto: null },
  camila: { nome: "Camila", empresa: "Rise Up", pele: 0xf7d3bc, roupa: 0x1b1b20, manga: null, calca: 0x1b1b20, sapato: 0xf6f6f8, tenis: 0xff5a36, frente: "#1b1b20", texto: "RISE UP", corpo: { ombros: 0.96, gordo: 0.92 }, cabelo: { estilo: "ondas", cor: 0x8a6a48, pontas: 0xead39e }, brinco: 0xe7b443, rosto: { iris: "#3a6a7a", brow: "#6a4a2c", batom: "#d9707f", cilios: true, boca: "aberta" }, objeto: null },
  "riseup-dono": { nome: "Robert", empresa: "Rise Up", escala: 1.1, pele: 0xf1c3a8, roupa: 0x2e3036, manga: 0x2e3036, curta: true, calca: 0x18181c, sapato: 0x18181c, tenis: 0xff5a36, frente: "#2e3036", corpo: { ombros: 1.2, gordo: 1.06 }, cabelo: { estilo: "bone", cor: 0x17181c }, barba: 0x4a3324, rosto: { iris: "#4a3016", brow: "#3a2616", boca: "sorriso", barba: true, bone: "RISE UP" }, objeto: null },
  carina: { nome: "Diretora Carina", escola: "kids1", pele: 0xd9a07a, roupa: 0xd8c29e, manga: 0xd8c29e, calca: 0xd9a07a, saia: true, sapato: 0x1d1c22, frente: "#d8c29e", botoes: true, cabelo: { estilo: "cachos", cor: 0x17110e }, brinco: 0xe9b84a, rosto: { iris: "#3a2010", brow: "#17110e", batom: "#a8483c", cilios: true, boca: "dentes" }, objeto: null },
};

// ---------------------------------------------------------------- montagem: cada caixa presa a um osso
const COR = new THREE.Color();
function montar(p) {
  const pos = [], nrm = [], uv = [], cor = [], ind = [], pes = [];
  const P = (osso, w, h, d, c, x, y, z) => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.translate(x, y, z); COR.set(c);
    const A = g.attributes, i0 = O[osso];
    for (let i = 0; i < A.position.count; i++) { pos.push(A.position.getX(i), A.position.getY(i), A.position.getZ(i)); nrm.push(A.normal.getX(i), A.normal.getY(i), A.normal.getZ(i)); uv.push(A.uv.getX(i), A.uv.getY(i)); cor.push(COR.r, COR.g, COR.b); ind.push(i0, 0, 0, 0); pes.push(1, 0, 0, 0); }
  };
  const G = { ombros: 1, gordo: 1, ...(p.corpo ?? {}) }, L = 0.68 * G.gordo, xB = 0.42 * G.ombros, fim = 0.92, H = 1.56;
  // pernas e sapatos
  for (const [s, c, j] of [[1, "pernaE", "joelhoE"], [-1, "pernaD", "joelhoD"]]) {
    const x = s * 0.17;
    P(c, 0.27, 0.42, 0.28, p.calca, x, 0.71, 0); P(j, 0.25, 0.4, 0.26, p.calca, x, 0.3, 0);
    P(j, 0.29, 0.13, 0.42, p.sapato, x, 0.065, 0.06); if (p.tenis) { P(j, 0.3, 0.05, 0.43, p.tenis, x, 0.12, 0.06); }
  }
  // tronco, quadril e pescoço
  if (p.saia) { P("quadril", 0.82, 0.3, 0.42, p.roupa, 0, 0.82, 0); P("quadril", 0.92, 0.24, 0.46, p.roupa, 0, 0.6, 0); P("tronco", L + 0.02, 0.1, 0.38, 0xcdb28a, 0, 1.02, 0); }
  else P("quadril", L, 0.2, 0.36, p.calca, 0, 0.94, 0);
  P("tronco", L, 0.52, 0.34 * G.gordo, p.roupa, 0, 1.3, 0);
  P("tronco", 0.2, 0.08, 0.2, p.pele, 0, 1.59, 0);
  // braços: manga (ou pele, na regata), antebraço e mão
  for (const [s, o, c, m] of [[1, "ombroE", "cotoveloE", "maoE"], [-1, "ombroD", "cotoveloD", "maoD"]]) {
    const x = s * (xB + 0.02), b = p.manga ?? p.pele, b2 = p.curta || p.manga == null ? p.pele : p.manga;
    P(o, 0.22, 0.3, 0.24, b, x, 1.36, 0); P(c, 0.2, 0.3, 0.22, b2, x, 1.06, 0); P(m, 0.2, 0.16, 0.2, p.pele, x, 0.84, 0);
  }
  // cabeça
  const cab = "cabeca", W = 0.56, A = 0.54, Y = H + 0.08 + A / 2;
  P(cab, W, A, 0.5, p.pele, 0, Y, 0);
  const C = p.cabelo;
  if (C.estilo === "bone") {
    P(cab, W + 0.03, 0.2, 0.53, C.cor, 0, Y + 0.2, 0); P(cab, W - 0.04, 0.08, 0.34, C.cor, 0, Y + 0.32, 0); P(cab, 0.5, 0.05, 0.3, C.cor, 0, Y + 0.13, 0.36);
  } else {
    P(cab, W + 0.04, 0.16, 0.54, C.cor, 0, Y + 0.25, 0); // topo
    if (C.estilo === "lado") { P(cab, 0.2, 0.3, 0.54, C.cor, -0.24, Y + 0.08, 0); P(cab, 0.3, 0.1, 0.1, C.cor, -0.12, Y + 0.17, 0.25); P(cab, 0.09, 0.28, 0.54, C.cor, 0.3, Y + 0.06, 0); P("cabeloTras", W + 0.06, 0.92, 0.14, C.cor, 0, 1.68, -0.24); for (const s of [-1, 1]) P("tronco", 0.14, 0.42, 0.14, C.cor, s * 0.33, 1.52, 0.12); }
    else if (C.estilo === "meio") { P(cab, 0.32, 0.1, 0.1, C.cor, -0.13, Y + 0.17, 0.25); P(cab, 0.32, 0.1, 0.1, C.cor, 0.13, Y + 0.17, 0.25); for (const s of [-1, 1]) P(cab, 0.11, 0.42, 0.54, C.cor, s * 0.31, Y, 0); P("cabeloTras", W + 0.1, 0.62, 0.14, C.cor, 0, 1.82, -0.24); P("cabeloTras", W + 0.1, 0.2, 0.14, C.pontas, 0, 1.41, -0.24); for (const s of [-1, 1]) { P("tronco", 0.13, 0.26, 0.14, C.cor, s * 0.33, 1.56, 0.1); P("tronco", 0.13, 0.13, 0.14, C.pontas, s * 0.33, 1.37, 0.1); } }
    else if (C.estilo === "curto") { for (const s of [-1, 1]) P(cab, 0.07, 0.24, 0.5, C.cor, s * 0.3, Y + 0.08, 0); P(cab, W + 0.04, 0.26, 0.06, C.cor, 0, Y + 0.06, -0.27); P(cab, 0.34, 0.06, 0.1, C.cor, 0, Y + 0.19, 0.25); }
    else if (C.estilo === "ondas") { P(cab, W + 0.04, 0.1, 0.1, C.cor, 0, Y + 0.18, 0.25); for (const s of [-1, 1]) { P(cab, 0.12, 0.3, 0.56, C.cor, s * 0.32, Y + 0.02, 0); P("tronco", 0.16, 0.16, 0.26, C.cor, s * 0.36, 1.62, 0); P("tronco", 0.2, 0.26, 0.24, C.pontas, s * 0.38, 1.45, 0.02); P("tronco", 0.16, 0.2, 0.2, C.pontas, s * 0.34, 1.24, 0.02); } P("cabeloTras", W + 0.14, 0.42, 0.16, C.cor, 0, 1.9, -0.24); P("cabeloTras", W + 0.16, 0.4, 0.18, C.pontas, 0, 1.5, -0.25); }
    else if (C.estilo === "cachos") { // cachinhos: cubos soltos formando um volume grande
      const k = (x, y, z, e = 0.2) => P(cab, e, e, e, (x * 7 + y * 11) % 2 > 1 ? C.cor : 0x2c201a, x, Y + y, z);
      for (const x of [-0.36, -0.18, 0, 0.18, 0.36]) { k(x, 0.34, 0.1, 0.22); k(x, 0.34, -0.14, 0.24); k(x, 0.42, -0.02, 0.2); }
      for (const s of [-1, 1]) for (const y of [0.2, 0.02, -0.16, -0.32]) { k(s * 0.38, y, 0.08); k(s * 0.38, y, -0.14, 0.22); k(s * 0.46, y + 0.06, -0.02, 0.18); }
      for (const x of [-0.24, 0, 0.24]) for (const y of [0.2, 0, -0.2, -0.36]) k(x, y, -0.3, 0.24);
      for (const x of [-0.2, 0, 0.2]) k(x, 0.24, 0.24, 0.16);
    }
  }
  if (p.brinco) for (const s of [-1, 1]) P(cab, 0.06, p.nome === "Camila" ? 0.14 : 0.08, 0.06, p.brinco, s * 0.32, Y - 0.16, 0.04);
  if (p.oculos) { for (const s of [-1, 1]) { P(cab, 0.2, 0.03, 0.03, p.oculos, s * 0.13, Y + 0.12, 0.26); P(cab, 0.2, 0.03, 0.03, p.oculos, s * 0.13, Y - 0.02, 0.26); P(cab, 0.03, 0.17, 0.03, p.oculos, s * 0.03, Y + 0.05, 0.26); P(cab, 0.03, 0.17, 0.03, p.oculos, s * 0.23, Y + 0.05, 0.26); P(cab, 0.03, 0.03, 0.26, p.oculos, s * 0.29, Y + 0.1, 0.13); } }
  if (p.barba) { P(cab, W + 0.03, 0.14, 0.53, p.barba, 0, Y - 0.2, 0.0); P(cab, 0.12, 0.2, 0.5, p.barba, 0.27, Y - 0.1, 0); P(cab, 0.12, 0.2, 0.5, p.barba, -0.27, Y - 0.1, 0); }
  // objeto na mão
  if (p.objeto?.tipo === "prancheta") { P("objeto", 0.05, 0.36, 0.28, 0xb07a45, 0.55, 0.92, 0.14); P("objeto", 0.06, 0.28, 0.22, 0xffffff, 0.56, 0.9, 0.14); P("objeto", 0.07, 0.04, 0.1, 0xc8d0da, 0.56, 1.06, 0.14); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(ind, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(pes, 4));
  return { geo: g, cabY: Y, z: 0.252, L, zT: 0.17 * G.gordo + 0.003 };
}
// desenhos: quadrados com uv do atlas, presos a um osso (rosto na cabeça e estampa no tronco)
function geoDesenhos(m, p) {
  const pos = [], uv = [], ind = [], pes = [];
  const Q = (osso, w, h, x, y, z, [u0, v0, u1, v1]) => {
    for (const [a, b, u, v] of [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, -1, u0, v0], [1, 1, u1, v1], [-1, 1, u0, v1]]) { pos.push(x + (a * w) / 2, y + (b * h) / 2, z); uv.push(u, v); ind.push(O[osso], 0, 0, 0); pes.push(1, 0, 0, 0); }
  };
  Q("cabeca", 0.54, 0.46, 0, m.cabY - 0.02, m.z, [0, 0, 0.5, 1]);
  Q("tronco", m.L - 0.04, 0.5, 0, 1.3, m.zT, [0.5, 0, 1, 1]);
  if (p.rosto.bone) Q("cabeca", 0.42, 0.13, 0, m.cabY + 0.2, m.z + 0.03, [0.75, 0.85, 1, 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(ind, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(pes, 4));
  return g;
}
// o atlas: à esquerda o rosto (olhos grandes, sobrancelha, bochecha e boca), à direita a estampa do peito
function desenhar(c, p, fechado, logo) {
  const r = p.rosto, S = 256;
  c.clearRect(0, 0, S * 2, S); c.lineCap = c.lineJoin = "round";
  const olho = (x) => {
    if (fechado) { c.lineWidth = 11; c.strokeStyle = "#151515"; c.beginPath(); c.arc(x, 112, 26, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); return; }
    c.fillStyle = "#ffffff"; c.lineWidth = 7; c.strokeStyle = "#151515"; c.beginPath(); c.roundRect(x - 33, 72, 66, 78, 18); c.fill(); c.stroke();
    c.fillStyle = r.iris; c.beginPath(); c.roundRect(x - 18, 90, 40, 54, 14); c.fill();
    c.fillStyle = "#151515"; c.beginPath(); c.roundRect(x - 8, 102, 22, 36, 8); c.fill();
    c.fillStyle = "#ffffff"; c.fillRect(x - 12, 92, 13, 13);
    if (r.cilios) { c.lineWidth = 7; for (const d of [-28, -14, 4]) { c.beginPath(); c.moveTo(x + (x < 128 ? d : -d), 74); c.lineTo(x + (x < 128 ? d - 6 : -d + 6), 58); c.stroke(); } }
  };
  olho(82); olho(174);
  c.strokeStyle = r.brow; c.lineWidth = 11;
  for (const [x, s] of [[82, -1], [174, 1]]) { c.beginPath(); c.moveTo(x - 28, 44 + (s < 0 ? 6 : 0)); c.lineTo(x + 28, 44 + (s > 0 ? 6 : 0)); c.stroke(); }
  c.fillStyle = "rgba(255,110,140,0.42)"; for (const x of [34, 222]) c.fillRect(x - 20, 160, 40, 18);
  const Y = 188;
  if (r.boca === "aberta") { c.fillStyle = "#3a1218"; c.beginPath(); c.roundRect(92, Y, 72, 42, 12); c.fill(); c.fillStyle = "#ffffff"; c.fillRect(100, Y + 2, 56, 12); c.fillStyle = "#f45aa6"; c.fillRect(110, Y + 26, 36, 12); }
  else if (r.boca === "dentes") { c.fillStyle = "#3a1218"; c.beginPath(); c.roundRect(76, Y - 2, 104, 40, 14); c.fill(); c.fillStyle = "#ffffff"; c.fillRect(84, Y + 3, 88, 20); }
  else { c.strokeStyle = r.batom ?? "#6a3a2a"; c.lineWidth = 10; c.beginPath(); c.moveTo(92, Y + 4); c.lineTo(108, Y + 18); c.lineTo(148, Y + 18); c.lineTo(164, Y + 4); c.stroke(); }
  if (r.batom && r.boca !== "discreta") { c.strokeStyle = r.batom; c.lineWidth = 5; c.strokeRect(r.boca === "dentes" ? 78 : 94, Y - 1, r.boca === "dentes" ? 100 : 68, r.boca === "dentes" ? 38 : 40); }
  // estampa do tronco
  c.save(); c.translate(S, 0);
  c.fillStyle = p.frente; c.fillRect(0, 0, S, S);
  if (p.listras) { c.fillStyle = p.listras; for (let y = 22; y < S; y += 44) for (let x = 0; x < S; x += 32) c.fillRect(x, y + (x % 64 ? 8 : 0), 22, 8); }
  if (p.lapela) { c.fillStyle = p.lapela; c.fillRect(0, 0, 66, S); c.fillRect(S - 66, 0, 66, S); c.fillStyle = "#ffffff"; c.fillRect(90, 0, 76, 44); }
  if (p.botoes) { c.fillStyle = "#eadbbf"; c.fillRect(70, 0, 116, 34); c.fillStyle = "#8a6a48"; for (const y of [66, 118, 170, 222]) c.fillRect(118, y, 20, 20); }
  if (logo) { const w = 96, h = (logo.naturalHeight / logo.naturalWidth) * w; c.fillStyle = "#ffffff"; c.fillRect(S - 112, 60, w + 8, h + 8); c.drawImage(logo, S - 108, 64, w, h); }
  if (p.texto) { c.fillStyle = "#ff5a36"; c.font = "900 54px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("RISE", S / 2, 96); c.fillStyle = "#ffffff"; c.fillText("UP", S / 2, 150); }
  if (r.bone) { c.fillStyle = "#17181c"; c.fillRect(S / 2, 0, S / 2, 40); c.fillStyle = "#ff5a36"; c.font = "900 30px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(r.bone, (S * 3) / 4, 20); }
  c.restore();
}
function texturasDe(p) {
  const fazer = (fechado) => { const t = texturaCanvas(512, 256, (c) => desenhar(c, p, fechado, null)); t.flipY = true; return t; };
  const aberto = fazer(false), fechado = fazer(true);
  if (p.logo) { const im = new Image(); im.onload = () => { for (const [t, f] of [[aberto, false], [fechado, true]]) { desenhar(t.image.getContext("2d"), p, f, im); t.needsUpdate = true; } }; im.src = p.logo; }
  return { aberto, fechado };
}
let matCorpo = null;
const corpoMat = () => (matCorpo ??= comArestas(new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0x2c2c2c, shininess: 36 })));

export function criarPessoa(id = "sabrina", { escala: esc = null, nome = null } = {}) {
  const p = PESSOAS[id];
  if (!p) throw new Error(`pessoa desconhecida: ${id}`);
  const escala = esc ?? p.escala ?? 1;
  const grupo = new THREE.Group();
  const raiz = new THREE.Group(); // pulo e estica-e-achata
  grupo.add(raiz);

  // esqueleto (ombros mais largos para quem tem corpo maior)
  const ko = p.corpo?.ombros ?? 1;
  const mundoOsso = (i) => { const [n, , w] = OSSOS[i]; return new THREE.Vector3(/ombro|cotovelo|mao|objeto/.test(n) ? w[0] * ko : w[0], w[1], w[2]); };
  const ossos = OSSOS.map(([n]) => { const b = new THREE.Bone(); b.name = n; return b; });
  OSSOS.forEach(([, pai], i) => { const b = ossos[i]; if (pai >= 0) { ossos[pai].add(b); b.position.copy(mundoOsso(i)).sub(mundoOsso(pai)); } else b.position.copy(mundoOsso(i)); });
  raiz.add(ossos[0]);
  const mont = montar(p);
  const tex = texturasDe(p);
  const matDes = new THREE.MeshPhongMaterial({ map: tex.aberto, emissive: 0xffffff, emissiveMap: tex.aberto, emissiveIntensity: 0.22, specular: 0x111111, shininess: 20, transparent: true, alphaTest: 0.3 });
  const malha = new THREE.SkinnedMesh(mont.geo, corpoMat()), des = new THREE.SkinnedMesh(geoDesenhos(mont, p), matDes);
  const esq = new THREE.Skeleton(ossos);
  raiz.add(malha, des);
  raiz.updateMatrixWorld(true);
  malha.bind(esq); des.bind(esq, malha.bindMatrix);
  for (const mm of [malha, des]) { mm.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.1, 0), 1.5); mm.castShadow = false; mm.receiveShadow = true; }
  const sombra = sombraBlob(0.5, 0.32);
  grupo.add(sombra);
  grupo.scale.setScalar(escala);
  grupo.userData = { tipo: "pessoa", id, nome: nome ?? p.nome, altura: ALTURA * escala };

  // ---------------- animação
  const B = (n) => ossos[O[n]];
  const POSE_OBJ = { oEx: -0.12, oEz: 0.04, cE: -1.0, mEx: 0.25 };
  const atual = {};
  let tempo = Math.random() * 10, fase = 0, piscar = 2, aceno = 0, festa = 0, recebe = 0, juntas = false;
  let vy = 0, py = 0, objQuer = Boolean(p.objeto), objEsc = objQuer ? 1 : 0, segurando = null, pendente = null, olharAlvo = 0, olharT = 3;
  const k0 = (dt, v) => 1 - Math.exp(-dt * v);

  function pose(andando, vel) {
    const a = { qY: 0, corpoY: 0, tronX: 0, tronY: 0, tronZ: 0, cabX: 0, cabY: 0, cabZ: 0, oEx: 0, oEz: 0.08, cE: -0.1, mEx: 0, oDx: 0, oDz: -0.08, cD: -0.1, mDx: 0, pE: 0, jE: 0, pD: 0, jD: 0, tX: 0, tZ: 0, sq: 1 };
    const t = tempo;
    if (andando) {
      const s = Math.sin(fase), c = Math.cos(fase), amp = Math.min(0.55, 0.32 + vel * 0.06);
      a.pE = -amp * s; a.pD = amp * s;
      a.jE = 0.08 + Math.max(0, c) * 0.85; a.jD = 0.08 + Math.max(0, -c) * 0.85;
      a.oEx = amp * 0.85 * s; a.oDx = -amp * 0.85 * s; a.cE = a.cD = -0.3;
      a.corpoY = 0.025 * Math.cos(2 * fase) - 0.01;
      a.tronX = 0.05; a.tronY = s * 0.09; a.qY = -s * 0.07; a.cabY = -s * 0.05; a.cabX = -0.03;
      a.tX = 0.12 + Math.sin(2 * fase) * 0.05; a.tZ = s * 0.06;
    } else {
      // parada: respira, balança de leve e às vezes olha para o lado
      a.tronX = Math.sin(t * 1.6) * 0.012; a.tronZ = Math.sin(t * 0.7) * 0.02;
      a.cabZ = Math.sin(t * 0.8 + 1) * 0.05; a.cabY = olharAlvo; a.cabX = Math.sin(t * 0.6) * 0.03;
      a.sq = 1 + Math.sin(t * 2.2) * 0.008;
      a.tX = Math.sin(t * 1.1) * 0.02; a.tZ = Math.sin(t * 0.8) * 0.02;
    }
    // objeto na mão esquerda (encostado no quadril)
    if (objQuer && !juntas) { a.oEx = POSE_OBJ.oEx + (andando ? Math.sin(fase) * 0.06 : 0); a.oEz = POSE_OBJ.oEz; a.cE = POSE_OBJ.cE; a.mEx = POSE_OBJ.mEx; }
    // segurando algo na mão direita (ex.: o alvará): mão na frente do corpo
    if (segurando && recebe <= 0) { a.oDx = -0.55; a.oDz = 0.06; a.cD = -0.85; a.mDx = 0.2; }
    if (juntas) { a.oEx = a.oDx = -0.62; a.oEz = -0.52; a.oDz = 0.52; a.cE = a.cD = -1.5; a.mEx = a.mDx = 0; a.cabX = 0.22; a.cabY = 0; }
    if (recebe > 0) { a.oEx = a.oDx = -1.15; a.oEz = -0.14; a.oDz = 0.14; a.cE = a.cD = -0.4; a.mEx = a.mDx = 0.1; a.tronX = 0.08; a.cabX = 0.08; }
    if (aceno > 0) { a.oDz = -2.45 + Math.sin(t * 11) * 0.32; a.oDx = -0.15; a.cD = -0.35; a.cabZ = -0.1; a.tronZ = 0.04; }
    if (festa > 0) {
      a.oEz = 2.5 + Math.sin(t * 9) * 0.25; a.oDz = -2.5 - Math.sin(t * 9 + 1) * 0.25; a.oEx = a.oDx = -0.1; a.cE = a.cD = -0.25;
      a.tronZ = Math.sin(t * 4.5) * 0.06; a.cabZ = Math.sin(t * 4.5) * 0.08; a.tX = 0.1;
    }
    if (py > 0) { a.pE = a.pD = -0.25; a.jE = a.jD = 0.45; a.tX = 0.18; }
    return a;
  }

  const api = {
    grupo, id, tipo: "pessoa", nome: nome ?? p.nome, altura: ALTURA * escala, escola: p.escola, empresa: p.empresa,
    ossos: Object.fromEntries(OSSOS.map(([n], i) => [n, ossos[i]])),
    custo: { chamadas: 3, triangulos: mont.geo.attributes.position.count / 3, triangulosContorno: 0 },
    pular() { if (py <= 0.001) vy = 3.2; },
    // segura o piscar por s segundos (fotos, cenas)
    olhosAbertos(s = 5) { piscar = s; },
    // encerra aceno, festa e "receber" na hora (volta para a pose parada)
    calma() { aceno = festa = recebe = 0; pendente = null; },
    acenar(s = 1.8) { aceno = Math.max(aceno, s); },
    comemorar(s = 2.5) { festa = Math.max(festa, s); api.pular(); },
    orar(sim = true) { juntas = sim; },
    // mostra/guarda o objeto próprio da mão esquerda (prancheta da Elaine); quem não tem, ignora
    objeto(sim = true) { objQuer = sim && Boolean(p.objeto); },
    // estica as duas mãos para receber; com objeto, ele vai para a mão direita (e o objeto próprio é guardado)
    receber(obj = null, s = 1.4) { recebe = s; objQuer = false; if (obj) pendente = obj; },
    segurar(obj) {
      if (segurando && segurando !== obj) segurando.parent?.remove(segurando);
      segurando = obj || null;
      if (obj) { B("maoD").add(obj); if (!obj.userData.posNaMao) obj.position.set(0, -0.08, 0.05); }
    },
    atualizar(dt, a1 = {}, a2) {
      const op = a1 && typeof a1 === "object" ? a1 : (a2 ?? {});
      const vel = op.vel ?? 0, andando = op.modo === "andar" || vel > 0.2;
      tempo += dt;
      if (andando) fase += dt * (4.2 + Math.min(6, vel) * 0.9);
      // piscar (de olhos fechados enquanto ora)
      piscar -= dt;
      let fechado = juntas;
      if (piscar <= 0) { fechado = true; if (piscar < -0.13) piscar = 2 + Math.random() * 3; }
      const mapa = fechado ? tex.fechado : tex.aberto;
      if (matDes.map !== mapa) matDes.map = matDes.emissiveMap = mapa;
      // olhar em volta de vez em quando
      olharT -= dt; if (olharT <= 0) { olharT = 2.5 + Math.random() * 4; olharAlvo = Math.random() < 0.5 ? 0 : (Math.random() - 0.5) * 0.7; }
      // pulo
      vy -= 13 * dt; py = Math.max(0, py + vy * dt); if (py === 0) vy = Math.max(vy, 0);
      if (festa > 0 && py === 0 && vy === 0) api.pular();
      aceno = Math.max(0, aceno - dt); festa = Math.max(0, festa - dt);
      if (recebe > 0) { recebe -= dt; if (pendente && recebe < 0.9) { api.segurar(pendente); pendente = null; } }
      const alvo = pose(andando, vel);
      const k = k0(dt, andando ? 16 : 10);
      for (const c in alvo) atual[c] = atual[c] === undefined ? alvo[c] : atual[c] + (alvo[c] - atual[c]) * k;
      const A = atual;
      raiz.position.y = py + A.corpoY;
      const sq = py > 0 ? 1 + Math.min(0.08, vy * 0.02) : A.sq;
      raiz.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      B("quadril").rotation.set(0, A.qY, 0);
      B("tronco").rotation.set(A.tronX, A.tronY, A.tronZ);
      B("cabeca").rotation.set(A.cabX, A.cabY, A.cabZ);
      B("ombroE").rotation.set(A.oEx, 0, A.oEz); B("cotoveloE").rotation.x = A.cE; B("maoE").rotation.set(A.mEx, 0, 0);
      B("ombroD").rotation.set(A.oDx, 0, A.oDz); B("cotoveloD").rotation.x = A.cD; B("maoD").rotation.set(A.mDx, 0, 0);
      B("pernaE").rotation.x = A.pE; B("joelhoE").rotation.x = A.jE;
      B("pernaD").rotation.x = A.pD; B("joelhoD").rotation.x = A.jD;
      B("cabeloTras").rotation.set(A.tX, 0, A.tZ);
      objEsc += ((objQuer ? 1 : 0) - objEsc) * k0(dt, 12);
      B("objeto").scale.setScalar(Math.max(0.0001, objEsc));
      sombra.scale.setScalar(1 - Math.min(0.4, py * 0.6));
    },
  };
  api.atualizar(0.016);
  return api;
}

export const PESSOAS_IDS = Object.keys(PESSOAS);
