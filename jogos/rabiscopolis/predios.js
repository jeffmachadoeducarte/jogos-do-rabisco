// Rabiscolândia: os prédios dos lugares (Igreja Reviver, hospital, bombeiros, escola, mercado, padaria,
// sorveteria), os prédios de enchimento, a praça (chafariz e coreto), o parque (lago, patinhos, parquinho),
// a Fazendinha (celeiro, silo, bichinhos) e os postes de luz. Tudo de blocos: caixas de plástico com muito detalhe
// montado (cantoneiras, sacadas, telhados em degraus). Janelas usam MAT.janela (acendem de noite).
// Convenção: cada prédio tem a frente em z = 0 (local), olhando para +z, e vai até z = -fundo.
// Cada função devolve { grupo, solidos } com os retângulos de colisão em coordenadas locais.

import { THREE, matNovo, mat, malha, caixa, caixaRedonda, geoCaixaRedonda, MAT, MAT_LAGO, TEX, letreiro, lojaParceira, arvoreReal, texturaCanvas, mesclar, r as rnd } from "./base3d.js";
import { cx as pc, viga, pinos, degraus, disco, emBlocos, geoCaixas, claro, escuro, comRecorte, plastico, telhadoDegraus, frontaoDegraus } from "./blocos.js";
import { carregarTextura, aleatorio } from "../../src/motor3d/toon.js";
import { ESTILO_PARCEIRO } from "../../src/parceiros.js";
import { cerquinha } from "./casas.js";

const BRANCO = 0xfffdf6;
const rv = aleatorio(3301); // sorteio só do visual (janelas acesas): não mexe na ordem do sorteio da cidade
const hexDe = (c) => (typeof c === "string" ? new THREE.Color(c).getHex() : c);
const repetida = (t, x, y) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
const MAT_CALCADA = mat(0xffffff, { map: repetida(TEX.calcada, 9, 9) }), MAT_TERRA = mat(0xffffff, { map: repetida(TEX.terra, 1, 10) });
const novo = () => ({ grupo: new THREE.Group(), solidos: [] });
const sol = (S, x0, x1, z0, z1, y1 = 20) => S.solidos.push({ x0, x1, z0, z1, y1 });

// fileira de janelas na fachada (+z) de uma parede de largura w, em z (frente da parede). De noite nem toda janela acende
function janelas(g, { w, andares, z, y0 = 1.2, alt = 3.2, jw = 1.4, jh = 1.5, cor = BRANCO, colunas = null, emX = false }) {
  const n = colunas ?? Math.max(1, Math.floor((w - 1) / 3)), f = { sombra: false };
  for (let a = 0; a < andares; a++) for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w / n) * (i + 0.5), y = y0 + a * alt + jh / 2, s = emX ? Math.sign(z) || 1 : 1;
    const pos = (q) => (emX ? [z + q * s, y, x] : [x, y, z + q]), ry = emX ? Math.PI / 2 : 0, v = rv();
    pc(g, jw + 0.3, jh + 0.3, 0.14, cor, ...pos(0), { ...f, ry });
    pc(g, jw, jh, 0.16, 0, ...pos(0.02), { ...f, ry, material: v < 0.36 ? MAT.vidro : v < 0.74 ? MAT.janela : MAT.janelaQuente });
    pc(g, 0.08, jh, 0.2, cor, ...pos(0.03), { ...f, ry });
    const q = pos(0.1); pc(g, jw + 0.5, 0.12, 0.3, escuro(hexDe(cor), 0.9), q[0], y - jh / 2 - 0.16, q[2], { ...f, ry });
  }
}
// toldo listrado de blocos, inclinado, com a barrinha na ponta; de largura w na frente (origem na parede)
function toldo(w, cor1, cor2) {
  const t = new THREE.Group(), n = Math.max(4, Math.round(w / 1.15)), l = w / n;
  for (let i = 0; i < n; i++) {
    const c = hexDe(i % 2 ? cor2 : cor1), x = -w / 2 + l * (i + 0.5);
    pc(t, l, 0.14, 1.75, c, x, -0.34, 0.8, { rx: 0.4, sombra: i % 2 === 0 });
    pc(t, l, 0.34, 0.1, c, x, -0.82, 1.6, { sombra: false });
  }
  return t;
}
function porta(g, { x = 0, z, w = 2.6, h = 3.2, cor = 0x2f6fc0, vidro = true }) {
  pc(g, w + 0.44, h + 0.22, 0.2, BRANCO, x, h / 2 + 0.11, z, { sombra: false });
  pc(g, w, h, 0.22, 0, x, h / 2, z + 0.03, { sombra: false, material: vidro ? MAT.janela : mat(cor) });
  pc(g, 0.1, h, 0.26, cor, x, h / 2, z + 0.04, { sombra: false });
  if (!vidro) for (const s of [-1, 1]) pc(g, w * 0.34, h * 0.32, 0.26, claro(cor, 0.2), x + (s * w) / 4, h * 0.7, z + 0.03, { sombra: false });
  pc(g, 0.16, 0.16, 0.34, 0xffcc1f, x + w * 0.16, h * 0.46, z + 0.06, { sombra: false });
}
// corpo de prédio: caixa com rodapé, cantoneiras na frente (fazem a fachada parecer montada), beiral e mureta no teto
function corpo(g, w, h, d, cor, { beiral = 0xffffff, rodape = null } = {}) {
  pc(g, w, h, d, cor, 0, h / 2, -d / 2);
  pc(g, w + 0.7, 0.5, d + 0.7, beiral, 0, h + 0.2, -d / 2);
  for (const [ww, dd, x, z] of [[w + 0.7, 0.4, 0, 0.15], [w + 0.7, 0.4, 0, -d - 0.15], [0.4, d + 0.7, -w / 2 - 0.15, -d / 2], [0.4, d + 0.7, w / 2 + 0.15, -d / 2]]) pc(g, ww, 0.4, dd, claro(beiral, 0.14), x, h + 0.62, z, { sombra: false });
  pc(g, w - 0.2, 0.1, d - 0.2, 0xb6bcc6, 0, h + 0.5, -d / 2, { sombra: false });
  if (rodape != null) pc(g, w + 0.16, 0.7, d + 0.16, rodape, 0, 0.35, -d / 2);
  const ca = claro(cor, 0.26), n = Math.floor((h - 1) / 1.25);
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) pc(g, i % 2 ? 0.6 : 0.95, 0.56, 0.12, ca, s * (w / 2 - (i % 2 ? 0.3 : 0.47)), 1.0 + i * 1.25, 0.03, { sombra: false });
}
// placa com o nome em cima da porta
function nome(g, texto, { y, largura = 9, cor = "#00b5f0", z = 0.15 }) { const l = letreiro(texto, largura, { cor }); l.position.set(0, y, z); g.add(l); }

// ---------- poste de luz (lâmpada acende de noite)
export function posteLuz() {
  const g = new THREE.Group(), azul = 0x2f3d5c, f = { sombra: false };
  pc(g, 0.5, 0.42, 0.5, 0x3d4d70, 0, 0.21, 0, f); pc(g, 0.22, 4.5, 0.22, azul, 0, 2.5, 0, f);
  pc(g, 0.72, 0.18, 0.72, azul, 0, 5.1, 0, f); pc(g, 0.46, 0.3, 0.46, 0, 0, 4.9, 0, { ...f, material: MAT.lampada });
  const poca = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), MAT.pocaLuz); poca.rotation.x = -Math.PI / 2; poca.position.y = 0.05; g.add(poca);
  return g;
}
export function banco() {
  const g = new THREE.Group();
  g.userData.detalhe = true;
  const madeira = mat(0xd98a46);
  for (let i = 0; i < 3; i++) { const t = caixa(2.6, 0.1, 0.22, madeira, { sombra: false }); t.position.set(0, 0.62, -0.25 + i * 0.25); g.add(t); }
  for (let i = 0; i < 2; i++) { const t = caixa(2.6, 0.22, 0.08, madeira, { sombra: false }); t.position.set(0, 0.95 + i * 0.3, -0.4); g.add(t); }
  for (const x of [-1.1, 1.1]) { const pe = caixa(0.12, 0.62, 0.6, mat(0x2f3d5c), { sombra: false }); pe.position.set(x, 0.31, -0.1); g.add(pe); }
  return g;
}
export function canteiro(w, d) {
  const g = new THREE.Group();
  const flores = new THREE.Group(); flores.userData.detalhe = true; g.add(flores);
  const borda = caixaRedonda(w, 0.45, d, mat(0xe8dcc6)); borda.position.y = 0.22; g.add(borda);
  const terra = caixa(w - 0.4, 0.1, d - 0.4, mat(0x7a5232)); terra.position.y = 0.46; g.add(terra);
  const cores = [0xff5fa2, 0xffcc1f, 0xffffff, 0xff7a3d, 0xb08cff, 0x4fb6ff];
  const n = Math.floor((w * d) / 0.7);
  for (let i = 0; i < n; i++) {
    const f = malha(new THREE.IcosahedronGeometry(0.16, 0), mat(cores[i % cores.length]), { sombra: false });
    f.position.set((rnd() - 0.5) * (w - 0.7), 0.62 + rnd() * 0.15, (rnd() - 0.5) * (d - 0.7)); flores.add(f);
    if (i % 2) { const fo = malha(new THREE.IcosahedronGeometry(0.2, 0), mat(0x4cb83f), { sombra: false }); fo.position.set(f.position.x + 0.15, 0.55, f.position.z); flores.add(fo); }
  }
  return g;
}

// ---------- Igreja Reviver: o prédio real em blocos (concreto cinza, moldura branca, arco azul-marinho, parede de vidro,
// marquise branca e palmeiras). A logo vem do arquivo real (recorte de assets/parceiros/igreja-reviver.webp, parede com
// "igreja reviver") e nunca nome de pessoa. As três placas azuis da frente são lisas, como devem ser.
export function igrejaReviver(l) {
  const S = novo(), g = S.grupo;
  const [W, D] = l.pegada, MARINHO = 0x1f3a8a, CONCRETO = 0xb4b8bf, CLARO = 0xf4f6fb, alt = 12;
  const L = W - 2, f = { sombra: false };
  pc(g, L, alt, D - 2, CONCRETO, 0, alt / 2, -(D - 2) / 2);
  pc(g, L + 0.2, 0.6, D - 1.8, 0x9ca1aa, 0, 0.3, -(D - 2) / 2);
  // moldura branca (topo e pilares) e cimalha
  pc(g, L + 0.8, 0.8, D - 1.2, CLARO, 0, alt + 0.4, -(D - 2) / 2);
  for (const x of [-L / 2 + 0.7, L / 2 - 0.7]) pc(g, 1.5, alt, 0.5, CLARO, x, alt / 2, 0.15);
  // juntas do concreto na parte cega
  for (let i = 0; i < 3; i++) pc(g, 11.4, 0.08, 0.06, 0x989da6, -6.7, 3.4 + i * 2.8, 0.03, f);
  // parede de vidro à direita com a grade azul-escura e o arco em degraus
  const vx0 = -1.2, vx1 = L / 2 - 1.5, vw = vx1 - vx0, vm = (vx0 + vx1) / 2, vh = alt - 1.3;
  pc(g, vw, vh, 0.12, 0, vm, vh / 2 + 0.4, 0.06, { ...f, material: MAT.janela });
  for (let i = 1; i < 6; i++) pc(g, 0.12, vh, 0.2, 0x2a3a58, vx0 + (vw * i) / 6, vh / 2 + 0.4, 0.1, f);
  for (let i = 1; i < 5; i++) pc(g, vw, 0.12, 0.2, 0x2a3a58, vm, 0.4 + (vh * i) / 5, 0.1, f);
  pc(g, vw - 1.5, 0.6, 0.45, MARINHO, vm + 0.75, alt - 0.6, 0.2);
  pc(g, 0.6, vh - 2.5, 0.45, MARINHO, vx0 - 0.3, (vh - 2.5) / 2 + 0.4, 0.2);
  for (let i = 0; i < 3; i++) pc(g, 0.7, 0.6, 0.45, MARINHO, vx0 - 0.1 + i * 0.5, alt - 2.1 + i * 0.5, 0.2);
  // marquise branca, com colunas finas
  pc(g, 17, 0.5, 4, CLARO, -2.4, 4.7, 1.9); pc(g, 17.2, 0.16, 4.2, 0xd6dbe6, -2.4, 4.4, 1.9, f);
  for (const x of [-10, 5.4]) pc(g, 0.3, 4.4, 0.3, 0x2a3a58, x, 2.2, 3.4);
  // porta de vidro no meio e jardim baixo à esquerda
  pc(g, 4, 3.8, 0.16, 0, -0.2, 2.2, 0.12, { ...f, material: MAT.janelaQuente }); for (const x of [-2.2, -0.2, 1.8]) pc(g, 0.14, 3.8, 0.22, 0x1d2536, x, 2.2, 0.14, f);
  for (let i = 0; i < 6; i++) pc(g, 1.5, 0.9 + (i % 3) * 0.3, 1.1, i % 2 ? 0x35b83a : 0x42c92d, -11 + i * 1.75, 0.55, 0.6, { ...f, detalhe: true });
  // a logo real numa placa de concreto com moldura (enquanto a imagem não chega, o nome em texto)
  const lw = 8.6, lh = lw / 2.62;
  pc(g, lw + 0.5, lh + 0.5, 0.3, CLARO, -6.7, 8.1, 0.14);
  const matL = matNovo({ map: criarPlacaIgreja(l.nome) });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), matL); logo.position.set(-6.7, 8.1, 0.31); logo.userData.dinamico = true; g.add(logo);
  const frente = new THREE.Group(); frente.userData = { dinamico: true, largura: L, alturaFoto: alt, fotoOk: false }; g.add(frente);
  comRecorte(matL, `../../${l.foto}`, [0.17, 0.3, 0.4, 0.47], () => { frente.userData.fotoOk = true; });
  // três placas azuis lisas, em postes verdes (como as do pátio real)
  for (const x of [-9, -4.2, 9]) { pc(g, 0.24, 1.9, 0.24, 0x2c7a3f, x, 0.95, 5.6); pc(g, 1.9, 0.62, 0.2, 0x2448a8, x, 2.1, 5.6); S.solidos.push({ x0: x - 0.3, x1: x + 0.3, z0: 5.3, z1: 5.9, y1: 2.5 }); }
  // palmeiras dos dois lados
  for (const [x, a] of [[-W / 2 + 1.2, 7.2], [W / 2 - 1.2, 8]]) { const c = coqueiro(a); c.position.set(x, 0.03, 2.8); c.rotation.y = x < 0 ? 0.4 : 2.6; g.add(c); S.solidos.push({ x0: x - 0.5, x1: x + 0.5, z0: 2.3, z1: 3.3, y1: 6 }); }
  // torre baixinha atrás com a cruz dourada
  pc(g, 5, alt + 5, 5, CLARO, 0, (alt + 5) / 2, -D + 4);
  for (const s of [-1, 1]) pc(g, 0.9, 6, 0.2, 0, s * 1.1, alt + 2, -D + 6.55, { ...f, material: MAT.janelaQuente });
  const teto = malha(degraus(6.4, 6.4, 3.2, 4), mat(MARINHO)); teto.position.set(0, alt + 6.6, -D + 4); g.add(teto);
  pc(g, 0.45, 2.6, 0.45, 0xffd36b, 0, alt + 9.4, -D + 4); pc(g, 1.6, 0.45, 0.45, 0xffd36b, 0, alt + 9.8, -D + 4);
  // escadaria larga na frente
  for (let i = 0; i < 3; i++) pc(g, 10 - i * 1.2, 0.22, 1.2 - i * 0.25, 0xdfe2e8, -0.2, 0.11 + i * 0.22, 0.9 - i * 0.3, f);
  sol(S, -W / 2 + 1, W / 2 - 1, -D + 2, 0, 20);
  S.foto = frente;
  return S;
}
const criarPlacaIgreja = (texto) => texturaCanvas(512, 196, (c, w, h) => { c.fillStyle = "#b4b8bf"; c.fillRect(0, 0, w, h); c.fillStyle = "#ffffff"; c.font = "800 62px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(texto, w / 2, h / 2); });

export function hospital(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const h = 11, azul = 0x4fb6ff;
  corpo(g, W, h, D - 2, 0xf7fbff, { beiral: azul, rodape: 0x8fd0ff });
  // bloco central mais alto, com a cruz vermelha, e faixas azuis entre os andares
  pc(g, W * 0.34, 2.6, D - 5, 0xe8f3ff, 0, h + 1.6, -(D - 2) / 2);
  pc(g, W * 0.34 + 0.5, 0.4, D - 4.5, azul, 0, h + 3.05, -(D - 2) / 2);
  for (const y of [4.45, 7.75]) pc(g, W - 0.2, 0.22, 0.14, 0xbfe2ff, 0, y, 0.04, { sombra: false });
  janelas(g, { w: W - 1, andares: 3, z: 0.02, y0: 1.4, alt: 3.3, colunas: 4 });
  pc(g, 3.4, 1.1, 0.4, 0xe8413c, 0, h - 1.6, 0.25); pc(g, 1.1, 3.4, 0.4, 0xe8413c, 0, h - 1.6, 0.25);
  // marquise azul da entrada, com colunas
  pc(g, 7, 0.35, 3, azul, 0, 3.9, 1.3); pc(g, 7.3, 0.14, 3.2, 0xbfe2ff, 0, 4.14, 1.3, { sombra: false });
  for (const x of [-3.2, 3.2]) pc(g, 0.28, 3.8, 0.28, BRANCO, x, 1.9, 2.5);
  porta(g, { z: 0.05, w: 3.2, h: 3.2 });
  nome(g, "Hospital Cuidar", { y: 5.1, largura: 7.5, cor: "#e8413c" });
  sol(S, -W / 2, W / 2, -D + 2, 0, 20);
  return S;
}
export function bombeiros(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const h = 7.5, f = { sombra: false };
  corpo(g, W, h, D - 2, 0xe8413c, { beiral: 0xffffff, rodape: 0xb83228 });
  for (const x of [-3.6, 3.6]) {
    pc(g, 5.8, 5.4, 0.2, 0xffcc1f, x, 2.75, 0.04, f);
    pc(g, 5.2, 5, 0.3, 0xf2f2f2, x, 2.6, 0.08, f);
    for (let i = 0; i < 6; i++) pc(g, 5.2, 0.1, 0.34, 0xc8ccd2, x, 0.6 + i * 0.75, 0.1, f);
    for (let i = 0; i < 3; i++) pc(g, 1.3, 0.7, 0.34, 0, x - 1.6 + i * 1.6, 4.1, 0.11, { ...f, material: MAT.janela });
  }
  // listras de alerta no pé dos pilares
  for (const x of [0, -7.1, 7.1]) for (let i = 0; i < 3; i++) pc(g, 0.7, 0.34, 0.14, i % 2 ? 0x2a2a2a : 0xffcc1f, x, 0.9 + i * 0.34, 0.06, f);
  // torre do sino de alarme
  const tx = W / 2 - 2.4, tz = -D + 4;
  pc(g, 3.4, 4, 3.4, 0xe8413c, tx, h + 2, tz); pc(g, 3.7, 0.4, 3.7, 0xffffff, tx, h + 4.1, tz);
  for (const [a, b] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) pc(g, 0.4, 1.3, 0.4, 0xe8413c, tx + a, h + 4.9, tz + b);
  const sino = malha(degraus(1.3, 1.3, 1, 3), mat(0xffcc1f)); sino.position.set(tx, h + 4.9, tz); g.add(sino);
  const tt = malha(degraus(4.2, 4.2, 1.6, 3), mat(0xffffff)); tt.position.set(tx, h + 6.3, tz); g.add(tt);
  nome(g, "Bombeiros", { y: 6.5, largura: 6.5, cor: "#e8413c" });
  sol(S, -W / 2, W / 2, -D + 2, 0, 20);
  return S;
}
// ---------- a Educarte em blocos, na mesma composição da escola oficial: corpo creme, alas rosa e azul, telhados em
// degraus e a torre-lápis com o relógio. Marca só pelos arquivos oficiais de assets/marca/logos.
export function escola(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada, k = Math.min(W / 31.2, 1), f = { sombra: false };
  const e = new THREE.Group(); e.scale.setScalar(k); e.position.z = -3.9 * k; g.add(e);
  const CIANO = 0x00b5f0, ROSA = 0xec2e8c, LARANJA = 0xff7a00, ROXO = 0x8e6cff, CREME = 0xfff1d6;
  pc(e, 16, 7, 7, CREME, 0, 3.5, 0); pc(e, 7, 5, 6, 0xffe3ef, -11.5, 2.5, 0.5); pc(e, 7, 5, 6, 0xdff6ff, 11.5, 2.5, 0.5);
  pc(e, 16.2, 0.5, 7.2, ROSA, 0, 0.25, 0); pc(e, 16.2, 0.35, 7.2, LARANJA, 0, 3.6, 0);
  pc(e, 7.2, 0.5, 6.2, CIANO, -11.5, 0.25, 0.5); pc(e, 7.2, 0.5, 6.2, ROSA, 11.5, 0.25, 0.5);
  telhadoDegraus(e, 16, 7, CIANO, 7, 0, { camadas: 5, alt: 0.6, beiral: 0.6 });
  telhadoDegraus(e, 7, 6, LARANJA, 5, 0.5, { camadas: 4, alt: 0.55, beiral: 0.5, x: -11.5 });
  telhadoDegraus(e, 7, 6, ROXO, 5, 0.5, { camadas: 4, alt: 0.55, beiral: 0.5, x: 11.5 });
  // torre-lápis: corpo branco, madeira em degraus e grafite na ponta
  pc(e, 4, 5, 4, 0xffffff, 0, 9.5, 0); pc(e, 4.3, 0.4, 4.3, ROSA, 0, 11.9, 0);
  const ponta = malha(degraus(4.2, 4.2, 4, 5, { fim: 0.34 }), mat(0xf3c99a)); ponta.position.set(0, 14.1, 0); e.add(ponta);
  const graf = malha(degraus(1.3, 1.3, 1.2, 3), mat(0x2a2a2a)); graf.position.set(0, 16.6, 0); e.add(graf);
  // relógio com o ícone oficial
  pc(e, 2.8, 2.8, 0.3, ROSA, 0, 10, 2.1); pc(e, 2.3, 2.3, 0.1, 0xffffff, 0, 10, 2.27, f);
  const icone = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: carregarTextura("../../assets/marca/logos/icone-branco.png"), transparent: true, color: ROSA }));
  icone.position.set(0, 10, 2.34); icone.userData.dinamico = true; e.add(icone);
  // janelas dos dois andares e das alas
  janelas(e, { w: 15, andares: 2, z: 3.52, y0: 1.2, alt: 3.3, jw: 1.5, jh: 1.6, colunas: 5, cor: 0xffffff });
  for (const [x, c] of [[-11.5, 0xffb3d4], [11.5, 0x9fe0ff]]) { const a = new THREE.Group(); a.position.x = x; e.add(a); janelas(a, { w: 6, andares: 1, z: 3.52, y0: 1.5, jw: 1.6, jh: 1.8, colunas: 2, cor: c }); }
  // porta grande e logo oficial em cima dela
  porta(e, { z: 3.54, w: 3, h: 3.1, cor: ROSA });
  pc(e, 6, 1.5, 0.2, 0xffffff, 0, 4.25, 3.62, f);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35), matNovo({ map: carregarTextura("../../assets/marca/logos/azul-icone-rosa.png"), transparent: true, alphaTest: 0.3 }));
  logo.position.set(0, 4.25, 3.74); logo.userData.dinamico = true; e.add(logo);
  // lápis de cor enfeitando a frente das alas
  [ROSA, LARANJA, 0xffcc1f, 0x58c43a, CIANO, ROXO].forEach((c, i) => { const x = -14 + i * 1.1 + (i > 2 ? 22.3 : 0); pc(e, 0.5, 1.4, 0.3, c, x, 1.2, 3.72, f); const t = malha(degraus(0.5, 0.3, 0.4, 2), mat(0xf3c99a)); t.position.set(x, 2.1, 3.72); e.add(t); });
  const zc = e.position.z, z0 = zc - 3.6 * k, z1 = zc + 3.8 * k;
  sol(S, -15 * k, 15 * k, z0, z1, 20);
  return S;
}
export function mercado(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const h = 6.5;
  corpo(g, W, h, D, 0xd9f2c9, { beiral: 0x2bb24c, rodape: 0x9ad58a });
  const vitrine = caixaRedonda(W - 3, 2.8, 0.2, MAT.janela); vitrine.position.set(0, 1.9, 0.06); g.add(vitrine);
  const t = toldo(W - 1, "#2bb24c", "#ffffff"); t.position.set(0, 4.1, 0.1); g.add(t);
  porta(g, { z: 0.2, w: 3, h: 3.1, cor: 0x2bb24c });
  nome(g, "Mercado Cesta Cheia", { y: 5.6, largura: 10, cor: "#2bb24c" });
  // caixotes de frutas na calçada
  const cores = [0xe8413c, 0xff9f1c, 0xffd84a, 0x58c43a];
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + 2 + i * 1.6;
    const cx = caixaRedonda(1.3, 0.7, 0.9, mat(0xc98a4b)); cx.position.set(x, 0.35, 1.0); g.add(cx);
    for (let k = 0; k < 6; k++) { const f = malha(new THREE.SphereGeometry(0.2, 10, 8), mat(cores[i]), { sombra: false }); f.position.set(x - 0.4 + (k % 3) * 0.4, 0.82, 0.8 + Math.floor(k / 3) * 0.35); g.add(f); }
  }
  sol(S, -W / 2, W / 2, -D, 0, 20); sol(S, -W / 2 + 1.2, -W / 2 + 7.2, 0.4, 1.6, 0.9);
  return S;
}
export function padaria(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const h = 6;
  corpo(g, W, h, D, 0xfbe6c4, { beiral: 0x8a4b2a, rodape: 0xd9a46b });
  const vitrine = caixaRedonda(W - 6.5, 2.2, 0.2, MAT.janelaQuente); vitrine.position.set(-2, 1.9, 0.06); g.add(vitrine);
  const t = toldo(W - 1, "#8a4b2a", "#fbe6c4"); t.position.set(0, 3.9, 0.1); g.add(t);
  porta(g, { x: W / 2 - 2.6, z: 0.2, w: 2.4, h: 3, cor: 0x8a4b2a });
  // pãozão em cima do letreiro
  const pao = malha(new THREE.CapsuleGeometry(0.8, 2.4, 6, 16), mat(0xe0a050)); pao.rotation.z = Math.PI / 2; pao.position.set(0, h + 1.3, -1); g.add(pao);
  for (let i = -1; i <= 1; i++) { const c = caixa(0.12, 0.5, 1.4, mat(0xfbe6c4)); c.position.set(i * 0.8, h + 2.0, -1); c.rotation.z = 0.5; g.add(c); }
  nome(g, "Padaria", { y: 5.2, largura: 7, cor: "#8a4b2a" });
  sol(S, -W / 2, W / 2, -D, 0, 20);
  return S;
}
export function sorveteria(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const h = 5.8;
  corpo(g, W, h, D, 0xffd6e8, { beiral: 0x7fe0d0, rodape: 0xff9cc8 });
  const vitrine = caixaRedonda(W - 6.5, 2.2, 0.2, MAT.janela); vitrine.position.set(2, 1.9, 0.06); g.add(vitrine);
  const t = toldo(W - 1, "#ff6fae", "#ffffff"); t.position.set(0, 3.9, 0.1); g.add(t);
  porta(g, { x: -W / 2 + 2.6, z: 0.2, w: 2.4, h: 3, cor: 0xff6fae });
  // casquinha gigante no telhado
  const casq = malha(new THREE.ConeGeometry(1.1, 3, 18), mat(0xe8a85a)); casq.rotation.x = Math.PI; casq.position.set(0, h + 2.1, -2); g.add(casq);
  const bolas = [[0xff8cc0, 0], [0x8fe3cf, 1.05], [0xfff0c9, 1.95]];
  for (const [c, y] of bolas) { const b = malha(new THREE.SphereGeometry(1.15 - y * 0.12, 18, 14), mat(c)); b.position.set(0, h + 3.8 + y, -2); g.add(b); }
  const cer = malha(new THREE.SphereGeometry(0.32, 12, 10), mat(0xe8213a)); cer.position.set(0, h + 6.95, -2); g.add(cer);
  nome(g, "Sorveteria", { y: 5.0, largura: 7, cor: "#ff6fae" });
  sol(S, -W / 2, W / 2, -D, 0, 20);
  return S;
}
export function lojaDeParceiro(l, aoMudar) {
  const S = novo();
  const loja = lojaParceira(l.parceiro, aoMudar);
  S.grupo.add(loja);
  S.loja = loja;
  return S;
}

// ---------- Crescente Contabilidade (parceira sem foto de fachada): prédio-escritório de 3 andares nas cores da marca
// (marrom e dourado), com o banner da marca (assets/parceiros/crescente-contabilidade.webp) de letreiro grande no
// segundo andar, porta de vidro com marquise dourada no térreo e a lua crescente dourada no alto.
const MARROM = 0x813d18, MARROM_ESC = 0x5a2a10, DOURADO = 0xd4a937, OURO = 0xf2c34e;
export function escritorioCrescente(l) {
  const S = novo(), g = S.grupo;
  const [W0, D0] = l.pegada, W = W0 - 1, D = D0 - 1, h = 11.2;
  corpo(g, W, h, D, MARROM, { beiral: DOURADO, rodape: MARROM_ESC });
  // frisos dourados entre os andares (só na frente e nas laterais da frente)
  for (const y of [3.75, 8.25]) { const f = caixa(W - 1.1, 0.22, 0.3, mat(DOURADO), { sombra: false }); f.position.set(0, y, 0.06); g.add(f); }
  // térreo: porta de vidro no meio e duas vitrines; 3º andar: fileira de janelas de moldura dourada
  porta(g, { z: 0.06, w: 2.6, h: 3.0, cor: MARROM_ESC });
  for (const s of [-1, 1]) { const v = caixa(3.4, 1.9, 0.2, MAT.janela, { sombra: false }); v.position.set(s * 4.6, 1.85, 0.08); g.add(v); const m = caixa(3.7, 2.2, 0.14, mat(DOURADO), { sombra: false }); m.position.set(s * 4.6, 1.85, 0.02); g.add(m); }
  janelas(g, { w: W - 1, andares: 1, z: 0.04, y0: 8.75, jh: 1.6, cor: DOURADO, colunas: 5 });
  // banner (letreiro): moldura dourada e a arte da marca, que "brilha" um pouco para ler de longe e de noite
  const bw = W - 2.2, bh = bw / 3;
  const moldura = caixa(bw + 0.5, bh + 0.5, 0.3, mat(DOURADO), { sombra: false }); moldura.position.set(0, 6.0, 0.15); g.add(moldura);
  const mBanner = matNovo({ color: MARROM });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), mBanner); banner.position.set(0, 6.0, 0.31); banner.userData.dinamico = true; g.add(banner);
  new THREE.TextureLoader().load(`../../${l.parceiro.foto}`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    Object.assign(mBanner, { map: t, emissiveMap: t, emissiveIntensity: 0.4 }); mBanner.color.set(0xffffff); mBanner.emissive.set(0xffffff); mBanner.needsUpdate = true;
  });
  // marquise dourada sobre a porta, com dois pilarzinhos
  const marq = caixaRedonda(4.4, 0.3, 1.8, mat(DOURADO)); marq.position.set(0, 3.35, 0.9); g.add(marq);
  for (const x of [-1.95, 1.95]) { const p = malha(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), mat(MARROM_ESC), { sombra: false }); p.position.set(x, 1.6, 1.6); g.add(p); }
  // degrau e floreiras dos lados da porta
  const degrau = caixa(3.6, 0.18, 0.9, mat(0xe8dcc6), { sombra: false }); degrau.position.set(0, 0.09, 0.45); g.add(degrau);
  for (const s of [-1, 1]) {
    const vaso = caixa(0.9, 0.7, 0.7, mat(DOURADO), { sombra: false }); vaso.position.set(s * 2.4, 0.35, 0.55); g.add(vaso);
    const folha = malha(new THREE.IcosahedronGeometry(0.55, 0), mat(0x4cb83f), { sombra: false }); folha.position.set(s * 2.4, 1.05, 0.55); g.add(folha);
  }
  // lua crescente dourada no alto, de frente para a rua (como no logo), com três barrinhas de gráfico subindo, numa base
  const base = caixa(4.2, 0.6, 1.2, mat(MARROM_ESC), { sombra: false }); base.position.set(0, h + 0.75, -1.6); g.add(base);
  const lua = malha(new THREE.TorusGeometry(1.45, 0.4, 7, 18, Math.PI * 1.3), mat(OURO), { sombra: false }); lua.rotation.z = Math.PI * 0.5; lua.position.set(-0.2, h + 2.75, -1.6); g.add(lua);
  [[0.05, 0.8], [0.55, 1.25], [1.05, 1.75]].forEach(([x, a]) => { const b = caixa(0.36, a, 0.36, mat(OURO), { sombra: false }); b.position.set(x, h + 1.05 + a / 2, -1.6); g.add(b); });
  sol(S, -W / 2 - 0.3, W / 2 + 0.3, -D - 0.3, 0.3, 20);
  S.banner = banner;
  return S;
}

// ---------- prédios de enchimento (moradias). Seis tipos de edifício e três de sobrado, escolhidos por um sorteio só
// (a ordem do sorteio da cidade não muda). Nada de caixa lisa: sacadas, recuos, faixas, lojinha no térreo, teto com
// caixa-d'água, jardim ou placas de sol. A colisão continua sendo a pegada w × d.
const SAC = [0xff7a00, 0x00b5f0, 0xec2e8c, 0x58c43a, 0x8e6cff, 0xffcc1f];
function sacada(g, x, y, z, w, cor) {
  const f = { sombra: false };
  pc(g, w, 0.22, 1.1, cor, x, y, z + 0.55);
  pc(g, w, 0.7, 0.1, claro(cor, 0.2), x, y + 0.42, z + 1.05, f);
  for (const s of [-1, 1]) pc(g, 0.1, 0.7, 1.1, claro(cor, 0.2), x + (s * w) / 2, y + 0.42, z + 0.55, f);
}
function caixaDagua(g, x, y, z) {
  for (const [a, b] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) pc(g, 0.2, 0.9, 0.2, 0x8a93a3, x + a, y + 0.45, z + b, { sombra: false });
  pc(g, 2.2, 1.5, 2.2, 0xdfe6ee, x, y + 1.6, z); pc(g, 2.5, 0.2, 2.5, 0x00b5f0, x, y + 2.45, z);
}
function ladosJanelas(g, d, w, andares, y0 = 1.0) {
  for (const s of [-1, 1]) { const lado = new THREE.Group(); lado.position.set(s * (w / 2 + 0.02), 0, -d / 2); lado.rotation.y = s * Math.PI / 2; g.add(lado); janelas(lado, { w: d - 1, andares, z: 0, y0, alt: 3.2, colunas: Math.max(1, Math.floor(d / 4)) }); }
}
function predioSobrado(g, w, d, c, sorte) {
  const h = 6.4, tel = [0xd94a3d, 0x2f6fc0, 0x3c9a4a, 0x7a52c9][Math.floor(sorte * 4)], tipo = Math.floor(sorte * 12) % 3, esc = new THREE.Color(c).multiplyScalar(0.8).getHex();
  corpo(g, w, h, d, c, { beiral: 0xffffff, rodape: esc });
  janelas(g, { w, andares: 2, z: 0.02, y0: 1.1, alt: 3.0, colunas: 3 });
  porta(g, { z: 0.1, w: 1.8, h: 2.6, cor: 0x8a4b2a, vidro: false });
  if (tipo === 2) { // telhado baixo de quatro águas, em degraus
    const t = malha(degraus(w + 1.2, d + 1.2, 2, 4, { fim: 0.4 }), mat(tel)); t.position.set(0, h + 1.5, -d / 2); g.add(t);
  } else {
    telhadoDegraus(g, w, d, tel, h + 0.45, -d / 2, { camadas: 5, alt: 0.58, beiral: 0.5 });
    frontaoDegraus(g, w - 0.2, c, h + 0.45, -0.14, { camadas: 4, alt: 0.58 });
    pc(g, 1.1, 1.1, 0.2, 0xffffff, 0, h + 1.5, 0.05, { sombra: false }); pc(g, 0.8, 0.8, 0.2, 0, 0, h + 1.5, 0.1, { sombra: false, material: MAT.janelaQuente });
  }
  if (tipo === 1) sacada(g, 0, 3.15, 0, w * 0.46, SAC[Math.floor(sorte * 60) % 6]);
  pc(g, 0.9, 2.2, 0.9, 0xc8553a, w / 4, h + 2.2, -d * 0.7); pc(g, 1.15, 0.24, 1.15, 0xffffff, w / 4, h + 3.4, -d * 0.7);
}
function predioEdificio(g, w, d, andares, c, sorte) {
  const h = andares * 3.2 + 0.6, tipo = Math.floor(sorte * 6), acento = SAC[Math.floor(sorte * 60) % 6], esc = new THREE.Color(c).multiplyScalar(0.8).getHex(), f = { sombra: false };
  const colunas = Math.max(2, Math.floor(w / 3.4));
  if (tipo === 1 && andares >= 3) { // escalonado: os dois últimos andares recuam e sobra um terraço com jardim
    const hb = (andares - 2) * 3.2 + 0.6, wc = w * 0.66, dc = d * 0.66;
    corpo(g, w, hb, d, c, { beiral: 0xffffff, rodape: esc });
    janelas(g, { w, andares: andares - 2, z: 0.02, y0: 1.0, alt: 3.2, colunas });
    ladosJanelas(g, d, w, andares - 2);
    const topo = new THREE.Group(); topo.position.set(0, hb + 0.5, -(d - dc) / 2); g.add(topo);
    corpo(topo, wc, 6.4, dc, claro(c, 0.14), { beiral: acento });
    janelas(topo, { w: wc, andares: 2, z: 0.02, y0: 0.6, alt: 3.2, colunas: Math.max(2, Math.floor(wc / 3.4)) });
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) pc(g, 0.95, 0.5 + (i % 2) * 0.5, 0.95, i % 2 ? 0x35b83a : 0x58d63a, s * (w / 2 - 0.9), hb + 0.75, -0.9 - i * ((d - 1.6) / 4), f);
  } else if (tipo === 3) { // fitas de vidro e aleta colorida; placas de sol no teto
    corpo(g, w, h, d, c, { beiral: acento, rodape: esc });
    for (let a = 0; a < andares; a++) {
      const y = 1.9 + a * 3.2, v = rv();
      pc(g, w - 1.6, 1.7, 0.14, 0, 0, y, 0.04, { ...f, material: v < 0.4 ? MAT.vidro : v < 0.75 ? MAT.janela : MAT.janelaQuente });
      pc(g, w - 1.2, 0.2, 0.3, 0xffffff, 0, y - 1, 0.1, f);
      for (let i = 1; i < colunas * 2; i++) pc(g, 0.09, 1.7, 0.2, 0x2f3d5c, -(w - 1.6) / 2 + ((w - 1.6) * i) / (colunas * 2), y, 0.08, f);
    }
    ladosJanelas(g, d, w, andares);
    pc(g, 0.9, h + 1.8, 0.6, acento, -w / 2 + 0.3, (h + 1.8) / 2, 0.2);
    for (let i = 0; i < 3; i++) pc(g, w / 4.4, 0.1, d * 0.3, 0x24406e, -w / 4 + (i * w) / 4, h + 1.0, -d / 2, { rx: -0.32 });
  } else if (tipo === 4) { // loja no térreo, apartamentos em cima
    corpo(g, w, h, d, c, { beiral: 0xffffff, rodape: esc });
    pc(g, w + 0.1, 3, 0.12, claro(acento, 0.55), 0, 1.7, 0.03, f);
    pc(g, w - 3.6, 1.9, 0.14, 0, -1.2, 1.75, 0.1, { ...f, material: MAT.janelaQuente }); for (let i = 1; i < 4; i++) pc(g, 0.1, 1.9, 0.2, 0xffffff, -1.2 - (w - 3.6) / 2 + ((w - 3.6) * i) / 4, 1.75, 0.13, f);
    const t = toldo(w - 1, acento, 0xffffff); t.position.set(0, 3.4, 0.1); g.add(t);
    janelas(g, { w, andares: andares - 1, z: 0.02, y0: 4.2, alt: 3.2, colunas });
    ladosJanelas(g, d, w, andares);
    for (let a = 2; a < andares; a++) pc(g, w - 0.4, 0.18, 0.2, claro(c, 0.3), 0, a * 3.2 + 0.42, 0.06, f);
    caixaDagua(g, -w / 4, h + 0.5, -d / 2);
  } else if (tipo === 5) { // janelões salientes em colunas, com faixas de duas cores
    corpo(g, w, h, d, c, { beiral: 0xffffff, rodape: esc });
    ladosJanelas(g, d, w, andares);
    const nb = Math.max(2, Math.floor(w / 5.4));
    for (let i = 0; i < nb; i++) {
      const x = -w / 2 + (w / nb) * (i + 0.5), cb = i % 2 ? claro(acento, 0.5) : 0xffffff;
      const b = new THREE.Group(); b.position.set(x, 0, 0.5); g.add(b);
      pc(g, 3.2, andares * 3.2 - 0.5, 0.9, cb, x, (andares * 3.2 - 0.5) / 2 + 0.6, 0.3);
      janelas(b, { w: 2.8, andares, z: 0.32, y0: 1.0, alt: 3.2, jw: 1.9, jh: 1.6, colunas: 1, cor: 0xffffff });
    }
    pc(g, 3, 0.8, 3, 0xc9ced8, w / 4, h + 0.95, -d / 2); pc(g, 1.4, 1.2, 1.4, 0xb6bcc6, -w / 4, h + 1.15, -d / 2);
  } else { // sacadas (tipo 0 e tipo 2, este com faixas e cimalha dentada)
    corpo(g, w, h, d, c, { beiral: 0xffffff, rodape: esc });
    janelas(g, { w, andares, z: 0.02, y0: 1.0, alt: 3.2, colunas });
    ladosJanelas(g, d, w, andares);
    if (tipo === 2) {
      for (let a = 1; a < andares; a++) pc(g, w + 0.1, 0.26, 0.2, claro(c, 0.34), 0, a * 3.2 + 0.5, 0.06, f);
      const nd = Math.floor(w / 1.1); for (let i = 0; i < nd; i++) pc(g, 0.55, 0.42, 0.26, acento, -w / 2 + (w / nd) * (i + 0.5), h - 0.3, 0.1, f);
    } else {
      for (let a = 1; a < andares; a++) for (let i = 0; i < colunas; i += 2) sacada(g, -w / 2 + (w / colunas) * (i + 0.5), a * 3.2 + 0.58, 0.04, Math.min(2.6, w / colunas - 0.3), acento);
    }
    caixaDagua(g, w / 4, h + 0.5, -d / 2);
  }
  if (tipo !== 4) porta(g, { z: 0.1, w: 2.2, h: 2.8, cor: 0x2f3d5c });
}
export function predioEnchimento(p) {
  const S = novo(), g = S.grupo;
  const { w, d, andares, cor } = p, c = new THREE.Color(cor).getHex(), sorte = rnd();
  if (p.tipo === "sobrado") predioSobrado(g, w, d, c, sorte); else predioEdificio(g, w, d, andares, c, sorte);
  sol(S, -w / 2, w / 2, -d, 0, 30);
  return S;
}

// ---------- praça: piso de placas, gramado, chafariz de degraus, canteiros, bancos, postes e árvores (centro em 0,0 local)
export function praca(raio) {
  const S = novo(), g = S.grupo;
  const lado = raio * 2 - 2, n = Math.round(lado / 4), f = { sombra: false };
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) pc(g, lado / n - 0.06, 0.1, lado / n - 0.06, (i + k) % 2 ? 0xe9e6dd : 0xd7d3c9, -lado / 2 + (lado / n) * (i + 0.5), 0.06, -lado / 2 + (lado / n) * (k + 0.5), f);
  const gr = lado * 0.72;
  pc(g, gr + 0.5, 0.13, gr + 0.5, 0xd2c7b0, 0, 0.09, 0, f); pc(g, gr, 0.16, gr, 0x52c842, 0, 0.1, 0, f);
  // chafariz de degraus: bacia, coluna, prato e jato
  const pedra = 0xe6e0d4;
  pc(g, 9.2, 0.4, 9.2, claro(pedra, 0.2), 0, 0.3, 0); pc(g, 8.6, 0.9, 8.6, pedra, 0, 0.6, 0);
  const agua = new THREE.Mesh(emBlocos(new THREE.BoxGeometry(7.6, 0.12, 7.6)), MAT_LAGO); agua.position.y = 1.02; agua.userData.dinamico = true; g.add(agua);
  pc(g, 1.4, 2.6, 1.4, pedra, 0, 2.2, 0); pc(g, 3.6, 0.5, 3.6, claro(pedra, 0.3), 0, 3.7, 0); pc(g, 2.9, 0.1, 2.9, 0x6fcff2, 0, 3.96, 0, f); pc(g, 1.0, 0.5, 1.0, pedra, 0, 4.2, 0);
  const jato = new THREE.Group(); jato.position.y = 4.4; jato.userData.dinamico = true; g.add(jato);
  const matJ = matNovo({ color: 0xcfefff, transparent: true, opacity: 0.8 });
  for (const [w, h, y] of [[0.6, 1.7, 0.85], [0.34, 0.6, 2]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), matJ); m.position.y = y; jato.add(m); }
  sol(S, -4.4, 4.4, -4.4, 4.4, 1.0);
  S.agua = agua; S.jato = jato;
  // canteiros, bancos e postes em volta
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const cx = Math.sin(a) * 9.5, cz = Math.cos(a) * 9.5;
    const c = canteiro(3.6, 2.2); c.position.set(cx, 0.1, cz); c.rotation.y = a; g.add(c);
    sol(S, cx - 1.9, cx + 1.9, cz - 1.9, cz + 1.9, 0.6);
    const b = banco(); b.position.set(Math.sin(a + Math.PI / 4) * 7.2, 0.14, Math.cos(a + Math.PI / 4) * 7.2); b.rotation.y = a + Math.PI / 4 + Math.PI; g.add(b);
    const p = posteLuz(); p.position.set(Math.sin(a + 0.38) * 13.5, 0.06, Math.cos(a + 0.38) * 13.5); g.add(p);
    sol(S, p.position.x - 0.25, p.position.x + 0.25, p.position.z - 0.25, p.position.z + 0.25, 5);
    const t = arvoreReal(1.15, i); t.position.set(Math.sin(a) * 13.8, 0.06, Math.cos(a) * 13.8); g.add(t);
    sol(S, t.position.x - 0.5, t.position.x + 0.5, t.position.z - 0.5, t.position.z + 0.5, 6);
  }
  return S;
}

// ---------- patinho (para o lago)
export function patinho(cor = 0xffd84a) {
  const g = new THREE.Group();
  const c = malha(new THREE.SphereGeometry(0.42, 14, 10), mat(cor)); c.scale.set(1, 0.72, 1.3); c.position.y = 0.2; g.add(c);
  const cab = malha(new THREE.SphereGeometry(0.27, 14, 10), mat(cor)); cab.position.set(0, 0.62, 0.36); g.add(cab);
  const bico = malha(new THREE.SphereGeometry(0.12, 10, 8), mat(0xff8a1f)); bico.scale.set(1.2, 0.5, 1.4); bico.position.set(0, 0.58, 0.62); g.add(bico);
  for (const s of [-1, 1]) { const o = malha(new THREE.SphereGeometry(0.06, 8, 6), mat(0x151515), { sombra: false }); o.position.set(s * 0.13, 0.7, 0.55); g.add(o); }
  mesclar(g); // por dentro nada mexe
  g.userData.dinamico = true;
  return g;
}
// ---------- parque: lago com patinhos e pontinha de pedras, parquinho, caminhos, bancos e muitas árvores
export function parque(P, lago, play) {
  const S = novo(), g = S.grupo;
  const cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;
  void cx; void cz;
  // caminho de terra até o lago
  const cam = new THREE.Mesh(new THREE.PlaneGeometry(3.2, lago.z - lago.r - P.z0 + 1), MAT_TERRA); cam.rotation.x = -Math.PI / 2; cam.position.set(0, 0.045, (P.z0 + lago.z - lago.r) / 2); g.add(cam);
  const areia = new THREE.Mesh(disco(lago.r + 1.6, { furo: lago.r - 1.2, passo: 1 }), mat(0xf6e0a6)); areia.rotation.x = -Math.PI / 2; areia.position.set(lago.x, 0.05, lago.z); g.add(areia);
  const agua = new THREE.Mesh(disco(lago.r, { passo: 1 }), MAT_LAGO); agua.rotation.x = -Math.PI / 2; agua.position.set(lago.x, 0.07, lago.z); agua.userData.dinamico = true; g.add(agua);
  // pedrinhas na beira e vitórias-régias
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; const p = malha(new THREE.IcosahedronGeometry(0.45 + rnd() * 0.3, 0), mat(0xc9c2b4), { sombra: false }); p.scale.y = 0.55; p.userData.detalhe = true; p.position.set(lago.x + Math.cos(a) * (lago.r + 0.6), 0.15, lago.z + Math.sin(a) * (lago.r + 0.6)); g.add(p); }
  for (let i = 0; i < 6; i++) { const a = rnd() * 6.28, rr = 4 + rnd() * (lago.r - 6); const f = malha(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 14, 1, false, 0.4, 5.6), mat(0x4cb83f), { sombra: false }); f.position.set(lago.x + Math.cos(a) * rr, 0.1, lago.z + Math.sin(a) * rr); g.add(f); }
  S.solidos.push({ circulo: true, x: lago.x, z: lago.z, r: lago.r - 0.4 });
  const patos = [];
  for (let i = 0; i < 5; i++) { const p = patinho(i === 2 ? 0xffffff : 0xffd84a); p.position.set(lago.x, 0.12, lago.z); g.add(p); patos.push({ p, a: (i / 5) * 6.28, r: 4 + (i % 3) * 2.5, v: 0.12 + i * 0.03 }); }
  S.patos = patos; S.agua = agua; S.lago = lago;
  // parquinho: balanço, escorregador e gira-gira em areia
  const piso = new THREE.Mesh(disco(8, { passo: 0.8 }), mat(0xf6e0a6)); piso.rotation.x = -Math.PI / 2; piso.position.set(play.x, 0.045, play.z); g.add(piso);
  const metal = mat(0xec2e8c);
  for (const x of [-2.2, 2.2]) for (const z of [-0.8, 0.8]) { const p = malha(new THREE.CylinderGeometry(0.12, 0.12, 4, 8), metal); p.position.set(play.x - 3 + x, 2, play.z + z); p.rotation.x = z > 0 ? -0.2 : 0.2; g.add(p); }
  const trave = malha(new THREE.CylinderGeometry(0.13, 0.13, 4.8, 8), metal); trave.rotation.z = Math.PI / 2; trave.position.set(play.x - 3, 3.9, play.z); g.add(trave);
  for (const x of [-1, 1]) { const a = caixaRedonda(0.9, 0.12, 0.5, mat(0xffcc1f)); a.position.set(play.x - 3 + x, 1.1, play.z); g.add(a); for (const s of [-0.35, 0.35]) { const c = caixa(0.04, 2.7, 0.04, mat(0x9aa3ad)); c.position.set(play.x - 3 + x + s, 2.5, play.z); g.add(c); } }
  sol(S, play.x - 5.6, play.x - 0.4, play.z - 1.2, play.z + 1.2, 4.5);
  const torre = caixaRedonda(1.8, 2.6, 1.8, mat(0xff7a00)); torre.position.set(play.x + 3, 1.3, play.z - 1.5); g.add(torre);
  const tetoT = malha(new THREE.ConeGeometry(1.6, 1.4, 4), mat(0x00b5f0)); tetoT.rotation.y = Math.PI / 4; tetoT.position.set(play.x + 3, 3.3, play.z - 1.5); g.add(tetoT);
  // escorregador: rampa com beiradas e a escadinha atrás (de blocos)
  const rampa = new THREE.Group(); rampa.position.set(play.x + 3, 1.35, play.z + 1.5); rampa.rotation.x = 0.55; g.add(rampa);
  pc(rampa, 1.3, 0.16, 4.6, 0x00b5f0, 0, 0, 0); for (const s of [-1, 1]) pc(rampa, 0.14, 0.34, 4.6, 0xffcc1f, s * 0.62, 0.2, 0);
  for (let i = 0; i < 5; i++) pc(g, 1.1, 0.14, 0.22, 0xffcc1f, play.x + 3, 0.34 + i * 0.5, play.z - 2.55 - i * 0.02);
  for (const s of [-1, 1]) pc(g, 0.14, 2.7, 0.14, 0xff7a00, play.x + 3 + s * 0.6, 1.35, play.z - 2.56);
  sol(S, play.x + 2, play.x + 4, play.z - 2.5, play.z - 0.5, 2.6);
  const gira = malha(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 24), mat(0x58c43a)); gira.position.set(play.x, 0.45, play.z + 4); g.add(gira);
  // bancos e postes em volta do lago, e árvores pelo parque
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; const b = banco(); b.position.set(lago.x + Math.cos(a) * (lago.r + 4), 0.04, lago.z + Math.sin(a) * (lago.r + 4)); b.rotation.y = -a - Math.PI / 2; g.add(b); const p = posteLuz(); p.position.set(lago.x + Math.cos(a + 0.4) * (lago.r + 4.5), 0.04, lago.z + Math.sin(a + 0.4) * (lago.r + 4.5)); g.add(p); }
  for (let n = 0; n < 34; n++) {
    const x = P.x0 + 2 + rnd() * (P.x1 - P.x0 - 4), z = P.z0 + 3 + rnd() * (P.z1 - P.z0 - 5);
    if (Math.hypot(x - lago.x, z - lago.z) < lago.r + 6 || Math.hypot(x - play.x, z - play.z) < 10 || Math.abs(x) < 3) continue;
    const a = arvoreReal(0.9 + rnd() * 0.5, n); a.position.set(x, 0.03, z); g.add(a);
    sol(S, x - 0.5, x + 0.5, z - 0.5, z + 0.5, 6);
  }
  return S;
}

// ---------- Fazendinha: celeiro vermelho, silo, cercado com vaquinha, ovelhinhas e galinhas, e a horta
function bicho(tipo) {
  const g = new THREE.Group();
  g.userData.dinamico = true;
  if (tipo === "vaca") {
    const c = malha(geoCaixaRedonda(1.3, 1.0, 2.0, 0.4), mat(0xffffff)); c.position.y = 1.0; g.add(c);
    for (const [x, z, s] of [[0.3, 0.3, 0.35], [-0.4, -0.4, 0.3], [0.2, -0.7, 0.25]]) { const m = malha(new THREE.SphereGeometry(s, 10, 8), mat(0x2a2a2a)); m.scale.set(0.5, 1, 1); m.position.set(0.62 * Math.sign(x), 1.05, z); g.add(m); }
    const cab = malha(geoCaixaRedonda(0.85, 0.8, 0.8, 0.3), mat(0xffffff)); cab.position.set(0, 1.5, 1.2); g.add(cab);
    const foc = malha(geoCaixaRedonda(0.8, 0.4, 0.3, 0.15), mat(0xffb6c8)); foc.position.set(0, 1.3, 1.62); g.add(foc);
    for (const s of [-1, 1]) { const ch = malha(new THREE.ConeGeometry(0.08, 0.3, 8), mat(0xfff0c9)); ch.position.set(s * 0.32, 2.0, 1.15); ch.rotation.z = -s * 0.4; g.add(ch); const o = malha(new THREE.SphereGeometry(0.09, 8, 6), mat(0x151515)); o.position.set(s * 0.2, 1.62, 1.6); g.add(o); }
    for (const [x, z] of [[-0.4, 0.6], [0.4, 0.6], [-0.4, -0.6], [0.4, -0.6]]) { const p = malha(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 8), mat(0xffffff)); p.position.set(x, 0.3, z); g.add(p); }
  } else if (tipo === "ovelha") {
    for (let i = 0; i < 7; i++) { const b = malha(new THREE.SphereGeometry(0.42, 12, 10), mat(0xfdfdfd)); b.position.set((i % 3 - 1) * 0.35, 0.85 + (i > 4 ? 0.25 : 0), (Math.floor(i / 3) - 1) * 0.35); g.add(b); }
    const cab = malha(new THREE.SphereGeometry(0.3, 12, 10), mat(0x3a3a3a)); cab.scale.z = 1.2; cab.position.set(0, 1.0, 0.7); g.add(cab);
    for (const s of [-1, 1]) { const o = malha(new THREE.SphereGeometry(0.07, 8, 6), mat(0xffffff)); o.position.set(s * 0.12, 1.08, 0.98); g.add(o); }
    for (const [x, z] of [[-0.25, 0.3], [0.25, 0.3], [-0.25, -0.3], [0.25, -0.3]]) { const p = malha(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), mat(0x3a3a3a)); p.position.set(x, 0.25, z); g.add(p); }
  } else {
    const c = malha(new THREE.SphereGeometry(0.3, 12, 10), mat(0xffffff)); c.scale.set(0.9, 1, 1.1); c.position.y = 0.42; g.add(c);
    const cab = malha(new THREE.SphereGeometry(0.18, 10, 8), mat(0xffffff)); cab.position.set(0, 0.78, 0.2); g.add(cab);
    const crista = malha(new THREE.SphereGeometry(0.08, 8, 6), mat(0xe8213a)); crista.scale.set(0.6, 1.2, 1.2); crista.position.set(0, 0.98, 0.2); g.add(crista);
    const bico = malha(new THREE.ConeGeometry(0.06, 0.14, 6), mat(0xffa21f)); bico.rotation.x = Math.PI / 2; bico.position.set(0, 0.76, 0.42); g.add(bico);
    for (const s of [-1, 1]) { const p = malha(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 5), mat(0xffa21f)); p.position.set(s * 0.1, 0.1, 0); g.add(p); }
  }
  g.userData.dinamico = false; mesclar(g); g.userData.dinamico = true; // por dentro nada mexe
  return g;
}
export function fazendinha(l, F) {
  const S = novo(), g = S.grupo;
  // chão de terra/grama do sítio (coordenadas do mundo; o grupo fica na origem)
  const cx = (F.x0 + F.x1) / 2, cz = (F.z0 + F.z1) / 2;
  void cx; void cz;
  // celeiro
  const bx = F.x0 + 16, bz = F.z0 + 22;
  const cel = new THREE.Group(); cel.position.set(bx, 0, bz); cel.rotation.y = Math.PI; g.add(cel);
  const W = 14, D = 12, H = 7;
  const paredes = caixaRedonda(W, H, D, mat(0xd6402f)); paredes.position.set(0, H / 2, -D / 2); cel.add(paredes);
  telhadoDegraus(cel, W, D, 0x4a4f5c, H, -D / 2, { camadas: 6, alt: 0.72, beiral: 0.6 });
  frontaoDegraus(cel, W - 0.4, 0xd6402f, H, -0.1, { camadas: 5, alt: 0.72, prof: 0.2 });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) pc(cel, 0.5, 2, 0.1, 0xffffff, s * (W / 2 - 0.3), 1.2 + i * 2.3, 0.02, { sombra: false }); // cantos brancos
  const portao = caixaRedonda(5, 5, 0.3, mat(0xffffff)); portao.position.set(0, 2.6, 0.1); cel.add(portao);
  const portaoV = caixaRedonda(4.2, 4.3, 0.34, mat(0xd6402f)); portaoV.position.set(0, 2.5, 0.12); cel.add(portaoV);
  for (const s of [-1, 1]) { const x = caixa(0.3, 5.6, 0.36, mat(0xffffff)); x.position.set(0, 2.5, 0.14); x.rotation.z = s * 0.75; cel.add(x); }
  const jan = caixaRedonda(2, 1.6, 0.3, MAT.janelaQuente); jan.position.set(0, H + 1.6, 0.05); cel.add(jan);
  S.solidos.push({ x0: bx - W / 2, x1: bx + W / 2, z0: bz, z1: bz + D, y1: 20 });
  // silo
  const silo = malha(new THREE.CylinderGeometry(2.4, 2.4, 10, 24), mat(0xdfe6ee)); silo.position.set(bx + 10, 5, bz + 6); g.add(silo);
  const cup = malha(new THREE.SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd6402f)); cup.position.set(bx + 10, 10, bz + 6); g.add(cup);
  for (let i = 0; i < 4; i++) { const a = malha(new THREE.CylinderGeometry(2.5, 2.5, 0.24, 8), mat(0x9aa3ad)); a.position.set(bx + 10, 2 + i * 2.2, bz + 6); g.add(a); }
  S.solidos.push({ circulo: true, x: bx + 10, z: bz + 6, r: 2.5 });
  // cercado com bichinhos
  const cx0 = F.x0 + 32, cz0 = F.z0 + 8, cw = 26, cd = 22;
  const madeira = 0xc98a4b;
  for (const [x, z, comp, rot] of [[cx0, cz0, cw, 0], [cx0, cz0 + cd, cw, 0], [cx0, cz0, cd, -Math.PI / 2], [cx0 + cw, cz0, cd, -Math.PI / 2]]) {
    const c = cerquinha(comp, { cor: madeira, altura: 1.2 }); c.position.set(x, 0.03, z); c.rotation.y = rot; g.add(c);
  }
  S.solidos.push({ x0: cx0 - 0.2, x1: cx0 + cw + 0.2, z0: cz0 - 0.25, z1: cz0 + 0.25, y1: 1.3 }, { x0: cx0 - 0.2, x1: cx0 + cw + 0.2, z0: cz0 + cd - 0.25, z1: cz0 + cd + 0.25, y1: 1.3 });
  S.solidos.push({ x0: cx0 - 0.25, x1: cx0 + 0.25, z0: cz0, z1: cz0 + cd, y1: 1.3 }, { x0: cx0 + cw - 0.25, x1: cx0 + cw + 0.25, z0: cz0, z1: cz0 + cd, y1: 1.3 });
  const bichos = [];
  for (const [tipo, n] of [["vaca", 2], ["ovelha", 3], ["galinha", 5]]) for (let i = 0; i < n; i++) {
    const b = bicho(tipo); const x = cx0 + 3 + rnd() * (cw - 6), z = cz0 + 3 + rnd() * (cd - 6);
    b.position.set(x, 0.03, z); b.rotation.y = rnd() * 6.28; g.add(b);
    bichos.push({ g: b, tipo, x0: cx0 + 2, x1: cx0 + cw - 2, z0: cz0 + 2, z1: cz0 + cd - 2, alvo: [x, z], v: tipo === "galinha" ? 1.6 : 0.7, fase: rnd() * 6 });
  }
  S.bichos = bichos;
  // horta: canteiros de terra com cenouras e repolhos (verduras somem de longe)
  const horta = new THREE.Group(); horta.userData.detalhe = true; g.add(horta);
  for (let k = 0; k < 5; k++) {
    const hx = F.x0 + 5, hz = F.z0 + 40 + k * 4.5;
    const terra = caixaRedonda(24, 0.4, 2.4, mat(0x8a5a32)); terra.position.set(hx + 12, 0.2, hz); g.add(terra);
    for (let i = 0; i < 10; i++) {
      const vx = hx + 1.4 + i * 2.3;
      if (k % 2) { const c = malha(new THREE.IcosahedronGeometry(0.45, 1), mat(0x7ed957), { sombra: false }); c.position.set(vx, 0.65, hz); horta.add(c); }
      else { const fo = malha(new THREE.ConeGeometry(0.25, 0.7, 5), mat(0x4cb83f), { sombra: false }); fo.position.set(vx, 0.75, hz); horta.add(fo); const ce = malha(new THREE.ConeGeometry(0.16, 0.4, 6), mat(0xff8a1f), { sombra: false }); ce.rotation.x = Math.PI; ce.position.set(vx, 0.45, hz); horta.add(ce); }
    }
  }
  // espantalho simpático e fardos de feno
  for (let i = 0; i < 4; i++) { const fe = malha(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 16), mat(0xf2cf5b)); fe.rotation.z = Math.PI / 2; fe.position.set(bx - 4 + i * 2.1, 0.9, bz - 3); g.add(fe); }
  S.solidos.push({ x0: bx - 5, x1: bx + 3.4, z0: bz - 4, z1: bz - 2, y1: 1.8 });
  // árvores em volta
  for (let n = 0; n < 10; n++) { const x = F.x0 + 2 + rnd() * (F.x1 - F.x0 - 4), z = F.z1 - 2 - rnd() * 8; const a = arvoreReal(1 + rnd() * 0.4, n); a.position.set(x, 0.03, z); g.add(a); S.solidos.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5, y1: 6 }); }
  return S;
}
// ---------- Esportes: campo de futebol (gramado listrado com linhas, gols com rede, bandeirinhas, bola,
// arquibancada colorida e vestiário), quadra poliesportiva (piso azul e laranja, tabelas de basquete) e horta
const texCampo = (w, d) => texturaCanvas(256, Math.round((256 * d) / w), (c, W, H) => {
  const k = W / w;
  for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? "#5cc443" : "#6fd257"; c.fillRect(0, (i * H) / 10, W, H / 10 + 1); }
  c.strokeStyle = "#ffffff"; c.lineWidth = Math.max(2, 0.18 * k);
  const m = 1.2 * k;
  c.strokeRect(m, m, W - 2 * m, H - 2 * m);
  c.beginPath(); c.moveTo(m, H / 2); c.lineTo(W - m, H / 2); c.stroke();
  c.beginPath(); c.arc(W / 2, H / 2, 4.5 * k, 0, 7); c.stroke();
  for (const y of [m, H - m]) { const s = y < H / 2 ? 1 : -1; c.strokeRect(W / 2 - 8 * k, y, 16 * k, s * 6 * k); c.strokeRect(W / 2 - 3.5 * k, y, 7 * k, s * 2.2 * k); }
  c.fillStyle = "#ffffff"; c.beginPath(); c.arc(W / 2, H / 2, 0.4 * k, 0, 7); c.fill();
});
const texRede = texturaCanvas(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = "rgba(255,255,255,0.95)"; c.lineWidth = 3; for (let i = 0; i <= 64; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } }, { repetir: true });
const texBola = texturaCanvas(128, 64, (c, w, h) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h); c.fillStyle = "#151515"; for (const [x, y] of [[16, 16], [48, 40], [80, 16], [112, 40], [32, 56], [96, 56], [64, 4]]) { c.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283; c.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); } c.fill(); } });
export function campoFutebol(C, E) {
  const S = novo(), g = S.grupo;
  const gram = new THREE.Mesh(new THREE.PlaneGeometry(C.w + 4, C.d + 4), matNovo({ map: texCampo(C.w + 4, C.d + 4) }));
  gram.rotation.x = -Math.PI / 2; gram.position.set(C.x, 0.05, C.z); gram.receiveShadow = true; g.add(gram);
  // gols (traves redondas brancas e rede)
  const matRede = matNovo({ map: texRede, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  texRede.repeat.set(6, 2);
  for (const s of [-1, 1]) {
    const z = C.z + s * (C.d / 2 - 0.2), gol = new THREE.Group(); gol.position.set(C.x, 0, z); gol.rotation.y = s > 0 ? Math.PI : 0; g.add(gol);
    for (const x of [-3, 3]) { const p = malha(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 10), mat(0xffffff)); p.position.set(x, 1.2, 0); gol.add(p); }
    const tr = malha(new THREE.CylinderGeometry(0.12, 0.12, 6.24, 10), mat(0xffffff)); tr.rotation.z = Math.PI / 2; tr.position.set(0, 2.4, 0); gol.add(tr);
    const fundo = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.4), matRede); fundo.position.set(0, 1.2, -1.6); gol.add(fundo);
    const teto = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.6), matRede); teto.rotation.x = Math.PI / 2; teto.position.set(0, 2.4, -0.8); gol.add(teto);
    for (const x of [-3, 3]) { const lado = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), matRede); lado.rotation.y = Math.PI / 2; lado.position.set(x, 1.2, -0.8); gol.add(lado); }
    S.solidos.push({ x0: C.x - 3.2, x1: C.x - 2.8, z0: z - 0.2, z1: z + 0.2, y1: 2.5 }, { x0: C.x + 2.8, x1: C.x + 3.2, z0: z - 0.2, z1: z + 0.2, y1: 2.5 });
  }
  // bandeirinhas de escanteio
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = malha(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), mat(0xffffff), { sombra: false }); p.position.set(C.x + sx * (C.w / 2 + 0.8), 0.75, C.z + sz * (C.d / 2 + 0.8)); g.add(p);
    const b = malha(new THREE.PlaneGeometry(0.5, 0.35), mat(0xff7a00, { side: THREE.DoubleSide }), { sombra: false }); b.position.set(p.position.x + 0.25, 1.35, p.position.z); g.add(b);
  }
  // bola no meio
  const bola = malha(new THREE.SphereGeometry(0.35, 16, 12), matNovo({ map: texBola })); bola.position.set(C.x, 0.4, C.z); bola.userData.dinamico = true; g.add(bola);
  S.bola = bola;
  // arquibancada (degraus coloridos) no lado oeste
  const cores = [0x00b5f0, 0xec2e8c, 0xffcc1f, 0x58c43a];
  const ax = C.x - C.w / 2 - 7.5;
  for (let i = 0; i < 4; i++) {
    const d = caixaRedonda(2.2, 0.7 * (i + 1), C.d - 8, mat(0xe8e2d6)); d.position.set(ax - i * 2.2, 0.35 * (i + 1), C.z); g.add(d);
    const banco = caixaRedonda(1.6, 0.25, C.d - 9, mat(cores[i])); banco.position.set(ax - i * 2.2 + 0.2, 0.7 * (i + 1) + 0.12, C.z); g.add(banco);
  }
  const cob = caixaRedonda(10, 0.4, C.d - 6, mat(0x2f6fc0)); cob.position.set(ax - 3.3, 5.6, C.z); g.add(cob);
  for (const z of [C.z - C.d / 2 + 5, C.z + C.d / 2 - 5]) { const p = malha(new THREE.CylinderGeometry(0.15, 0.15, 5.4, 8), mat(0xffffff)); p.position.set(ax - 7.6, 2.7, z); g.add(p); }
  S.solidos.push({ x0: ax - 8, x1: ax + 1.1, z0: C.z - C.d / 2 + 4, z1: C.z + C.d / 2 - 4, y1: 20 });
  // vestiário com placa, no canto sudeste
  const vx = E.x1 - 9, vz = E.z1 - 7;
  const vest = new THREE.Group(); vest.position.set(vx, 0, vz); vest.rotation.y = -Math.PI / 2; g.add(vest);
  corpo(vest, 10, 4.2, 7, 0xfff4e0, { beiral: 0x00b5f0, rodape: 0x9fd8ff });
  porta(vest, { z: 0.1, w: 2, h: 2.8, cor: 0x00b5f0, vidro: false });
  nome(vest, "Vestiário", { y: 3.6, largura: 5, cor: "#00b5f0" });
  S.solidos.push({ x0: vx, x1: vx + 7, z0: vz - 5, z1: vz + 5, y1: 20 });
  return S;
}
const texQuadra = (w, d) => texturaCanvas(256, Math.round((256 * d) / w), (c, W, H) => {
  const k = W / w;
  c.fillStyle = "#2f8fe8"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#ff8a3d"; c.fillRect(2 * k, 2 * k, W - 4 * k, H - 4 * k);
  c.strokeStyle = "#ffffff"; c.lineWidth = Math.max(2, 0.12 * k);
  c.strokeRect(2 * k, 2 * k, W - 4 * k, H - 4 * k);
  c.beginPath(); c.moveTo(W / 2, 2 * k); c.lineTo(W / 2, H - 2 * k); c.stroke();
  c.beginPath(); c.arc(W / 2, H / 2, 2.2 * k, 0, 7); c.stroke();
  for (const x of [2 * k, W - 2 * k]) { c.beginPath(); c.arc(x, H / 2, 6 * k, -Math.PI / 2, Math.PI / 2, x > W / 2); c.stroke(); c.fillStyle = "#2f8fe8"; c.fillRect(x > W / 2 ? x - 5 * k : x, H / 2 - 2 * k, 5 * k, 4 * k); }
});
export function quadra(Q) {
  const S = novo(), g = S.grupo;
  const w = Q.x1 - Q.x0, d = Q.z1 - Q.z0, cx = (Q.x0 + Q.x1) / 2, cz = (Q.z0 + Q.z1) / 2;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(w - 2, d - 2), matNovo({ map: texQuadra(w - 2, d - 2) }));
  piso.rotation.x = -Math.PI / 2; piso.position.set(cx, 0.06, cz); piso.receiveShadow = true; g.add(piso);
  // tabelas de basquete nas pontas
  for (const s of [-1, 1]) {
    const x = cx + s * (w / 2 - 1.6);
    const poste = malha(new THREE.CylinderGeometry(0.14, 0.16, 3.6, 10), mat(0x2f3440)); poste.position.set(x, 1.8, cz); g.add(poste);
    const tabela = caixaRedonda(0.15, 1.3, 2, mat(0xffffff)); tabela.position.set(x - s * 0.4, 3.7, cz); g.add(tabela);
    const quad = caixa(0.17, 0.5, 0.7, mat(0xe8413c), { sombra: false }); quad.position.set(x - s * 0.4, 3.5, cz); g.add(quad);
    const aro = malha(new THREE.TorusGeometry(0.3, 0.04, 6, 18), mat(0xff7a00), { sombra: false }); aro.rotation.x = Math.PI / 2; aro.position.set(x - s * 0.8, 3.15, cz); g.add(aro);
    S.solidos.push({ x0: x - 0.3, x1: x + 0.3, z0: cz - 0.3, z1: cz + 0.3, y1: 4 });
  }
  // alambrado baixinho e bancos
  for (const [x, z, comp, rot] of [[Q.x0, Q.z0, w, 0], [Q.x0, Q.z1, w, 0]]) { const c = cerquinha(comp, { cor: 0x2f6fc0, altura: 1 }); c.position.set(x, 0.03, z); c.rotation.y = rot; g.add(c); S.solidos.push({ x0: x, x1: x + comp, z0: z - 0.25, z1: z + 0.25, y1: 1.2 }); }
  for (const s of [-1, 1]) { const b = banco(); b.position.set(cx + s * 5, 0.06, Q.z1 - 1.4); b.rotation.y = Math.PI; g.add(b); }
  return S;
}
export function hortaComunitaria(H) {
  const S = novo(), g = S.grupo;
  const w = H.x1 - H.x0, d = H.z1 - H.z0;
  const terra = new THREE.Mesh(new THREE.PlaneGeometry(w - 1, d - 1), MAT_TERRA); terra.rotation.x = -Math.PI / 2; terra.position.set((H.x0 + H.x1) / 2, 0.04, (H.z0 + H.z1) / 2); g.add(terra);
  const verduras = new THREE.Group(); verduras.userData.detalhe = true; g.add(verduras);
  const cores = [0xe8413c, 0xff8a1f, 0x7ed957, 0xb07ce8];
  for (let k = 0; k < 4; k++) {
    const z = H.z0 + 4 + k * 4.6;
    const cant = caixaRedonda(w - 12, 0.5, 2.4, mat(0xc98a4b)); cant.position.set(H.x0 + 2 + (w - 12) / 2, 0.25, z); g.add(cant);
    S.solidos.push({ x0: H.x0 + 2, x1: H.x0 + w - 10, z0: z - 1.2, z1: z + 1.2, y1: 0.55 });
    for (let i = 0; i < 8; i++) {
      const x = H.x0 + 3.5 + i * ((w - 15) / 7);
      const pe = malha(new THREE.IcosahedronGeometry(0.42, 0), mat(0x4cb83f), { sombra: false }); pe.position.set(x, 0.75, z); verduras.add(pe);
      const fruto = malha(new THREE.IcosahedronGeometry(0.17, 1), mat(cores[k]), { sombra: false }); fruto.position.set(x + 0.2, 0.95, z + 0.2); verduras.add(fruto);
    }
  }
  // casinha de ferramentas, regador e placa
  const cx = H.x1 - 5, cz = H.z0 + 6;
  const casinha = new THREE.Group(); casinha.position.set(cx, 0, cz + 3); g.add(casinha);
  corpo(casinha, 5, 3.2, 5, 0xc98a4b, { beiral: 0x3c9a4a });
  porta(casinha, { z: 0.1, w: 1.6, h: 2.3, cor: 0x3c9a4a, vidro: false });
  S.solidos.push({ x0: cx - 2.6, x1: cx + 2.6, z0: cz - 2.1, z1: cz + 3.1, y1: 20 });
  const reg = malha(new THREE.CylinderGeometry(0.35, 0.4, 0.6, 12), mat(0x00b5f0)); reg.position.set(cx - 3.5, 0.3, cz + 5); g.add(reg);
  const bico = malha(new THREE.CylinderGeometry(0.05, 0.08, 0.7, 8), mat(0x00b5f0)); bico.rotation.z = 0.9; bico.position.set(cx - 3.95, 0.55, cz + 5); g.add(bico);
  nome(casinha, "Horta", { y: 3.0, largura: 3.5, cor: "#3c9a4a" });
  return S;
}

// ================================================================== bairros de fora
// ---------- Educarte Kids I (bebês de 4 meses a 4 anos): prédio baixinho em tons suaves (menta, rosa-bebê, lilás e
// azul-bebê), telhados redondos como nuvens, janelas redondas, berçário com berços nas janelas, placa grande com a logo
// e o nome, e o parquinho de bebê no pátio (piso emborrachado, escorregador baixinho, cavalinho de balanço, piscina de
// bolinhas e caixa de areia, com cerquinha baixa).
const PASTEL = { menta: 0xbff0dc, rosa: 0xffd3e2, lilas: 0xe2d4ff, azul: 0xcfe9ff, creme: 0xfff7e6, amarelo: 0xfff0a8 };
function placaEscola(texto, cor, largura) {
  const g = new THREE.Group();
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(largura * 0.32, largura * 0.16), matNovo({ map: carregarTextura("../../assets/marca/logos/azul-icone-rosa.png"), transparent: true, alphaTest: 0.3 }));
  logo.position.set(-largura * 0.33, 0, 0.14); logo.userData.dinamico = true; g.add(logo);
  const fundo = caixaRedonda(largura, largura * 0.22, 0.25, mat(0xffffff)); g.add(fundo);
  const nomeL = letreiro(texto, largura * 0.62, { cor }); nomeL.position.set(largura * 0.17, 0, 0.1); g.add(nomeL);
  return g;
}
export function educarteKids1(l, area) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const alas = [[-W / 2 + 6, PASTEL.menta, 0x7fd9b8], [0, PASTEL.rosa, 0xff9cc0], [W / 2 - 6, PASTEL.lilas, 0xb9a0f0]];
  for (const [x, cor, teto] of alas) {
    const ala = new THREE.Group(); ala.position.x = x; g.add(ala);
    const c = caixaRedonda(11.5, 5, D - 4, mat(cor)); c.position.set(0, 2.5, -(D - 4) / 2); ala.add(c);
    // telhado de nuvem: três "bolas" achatadas
    for (const [dx, r] of [[-3, 2.6], [0, 3.2], [3, 2.6]]) { const n = malha(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(teto)); n.scale.set(1, 0.55, (D - 4) / (2 * r)); n.position.set(dx, 5, -(D - 4) / 2); ala.add(n); }
    // janelas redondas
    for (const dx of [-3.2, 3.2]) {
      const aro = malha(new THREE.TorusGeometry(0.95, 0.18, 8, 20), mat(0xffffff)); aro.position.set(dx, 2.7, 0.05); ala.add(aro);
      const v = malha(new THREE.CircleGeometry(0.95, 20), MAT.janela, { sombra: false }); v.position.set(dx, 2.7, 0.04); ala.add(v);
    }
  }
  // porta de arco amarelinha com toldo listrado
  porta(g, { z: 0.1, w: 2.8, h: 3.2, cor: 0xffcc1f, vidro: false });
  const t = toldo(4.5, "#ff9cc0", "#ffffff"); t.position.set(0, 3.7, 0.2); g.add(t);
  // ala lilás = berçário; cubinhos ABC coloridos na entrada
  const ber = new THREE.Group(); ber.position.set(W / 2 - 6, 0, 0.12); g.add(ber); nome(ber, "Berçário", { y: 4.3, largura: 5, cor: "#8e6cff" });
  [["A", 0xff9cc0], ["B", 0x9fd8ff], ["C", 0xfff0a8]].forEach(([, c], i) => { const cubo = caixaRedonda(0.9, 0.9, 0.9, mat(c)); cubo.position.set(-3.6 + i * 1.0, 0.45 + (i === 1 ? 0.9 : 0), 1.4); cubo.rotation.y = i * 0.3; g.add(cubo); });
  S.solidos.push({ x0: -4.2, x1: -1.4, z0: 0.9, z1: 1.9, y1: 1.9 });
  const placa = placaEscola("Educarte Kids I", "#ec2e8c", 11); placa.position.set(0, 6.6, 0.4); g.add(placa);
  // estrelinhas e nuvens decorando a fachada
  for (const [x, y, c] of [[-W / 2 + 2, 4.2, 0xffcc1f], [W / 2 - 2, 4.2, 0x00b5f0], [-8, 1.2, 0xff9cc0], [8, 1.2, 0x58c43a]]) { const e = malha(new THREE.IcosahedronGeometry(0.45, 0), mat(c)); e.position.set(x, y, 0.4); g.add(e); }
  S.solidos.push({ x0: -W / 2, x1: W / 2, z0: -D + 4 - 0.2, z1: 0.2, y1: 20 });
  // parquinho de bebê (área em coordenadas locais: atrás? no pátio ao lado) — feito em parquinhoBebe(area)
  return S;
}
export function parquinhoBebe(A) {
  const S = novo(), g = S.grupo;
  const cx = (A.x0 + A.x1) / 2, cz = (A.z0 + A.z1) / 2, w = A.x1 - A.x0, d = A.z1 - A.z0;
  // piso emborrachado colorido em quadrados
  const cores = [PASTEL.menta, PASTEL.rosa, PASTEL.lilas, PASTEL.azul, PASTEL.amarelo];
  for (let i = 0; i < Math.floor(w / 4); i++) for (let k = 0; k < Math.floor(d / 4); k++) {
    const p = caixa(3.9, 0.08, 3.9, mat(cores[(i + k) % cores.length]), { sombra: false }); p.position.set(A.x0 + 2 + i * 4, 0.05, A.z0 + 2 + k * 4); g.add(p);
  }
  // escorregador baixinho
  const torre = caixaRedonda(1.6, 1.2, 1.6, mat(PASTEL.rosa)); torre.position.set(cx - 5, 0.6, cz - 3); g.add(torre);
  const rampa = new THREE.Group(); rampa.position.set(cx - 5, 0.6, cz - 1.2); rampa.rotation.x = 0.42; g.add(rampa);
  pc(rampa, 1.1, 0.14, 2.6, PASTEL.azul, 0, 0, 0); for (const s of [-1, 1]) pc(rampa, 0.12, 0.26, 2.6, PASTEL.lilas, s * 0.52, 0.14, 0);
  S.solidos.push({ x0: cx - 5.8, x1: cx - 4.2, z0: cz - 3.8, z1: cz - 2.2, y1: 1.2 });
  // cavalinho de balanço
  const cav = new THREE.Group(); cav.position.set(cx + 4, 0, cz - 3); g.add(cav);
  const base = malha(new THREE.TorusGeometry(1.0, 0.1, 6, 18, Math.PI), mat(PASTEL.lilas)); base.rotation.z = Math.PI; base.position.y = 1.0; base.scale.y = 0.4; cav.add(base);
  const corpo2 = malha(new THREE.CapsuleGeometry(0.35, 1.0, 4, 10), mat(0xfff4e0)); corpo2.rotation.z = Math.PI / 2; corpo2.position.y = 0.95; cav.add(corpo2);
  const cab = malha(new THREE.SphereGeometry(0.33, 12, 10), mat(0xfff4e0)); cab.position.set(0.75, 1.4, 0); cav.add(cab);
  const crina = malha(new THREE.SphereGeometry(0.2, 10, 8), mat(0xff9cc0)); crina.position.set(0.55, 1.65, 0); cav.add(crina);
  // piscina de bolinhas
  const pisc = malha(new THREE.CylinderGeometry(2, 2, 0.6, 24, 1, true), mat(PASTEL.azul, { side: THREE.DoubleSide })); pisc.position.set(cx, 0.3, cz + 3); g.add(pisc);
  for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, r = rnd() * 1.8; const b = malha(new THREE.IcosahedronGeometry(0.17, 0), mat([0xff9cc0, 0x9fd8ff, 0xfff0a8, 0xbff0dc][i % 4]), { sombra: false }); b.position.set(cx + Math.cos(a) * r, 0.4 + rnd() * 0.15, cz + 3 + Math.sin(a) * r); g.add(b); }
  S.solidos.push({ x0: cx - 2, x1: cx + 2, z0: cz + 1, z1: cz + 5, y1: 0.6 });
  // caixa de areia
  const caixaA = caixaRedonda(3.6, 0.35, 3.6, mat(0xc98a4b)); caixaA.position.set(cx + 5, 0.18, cz + 3); g.add(caixaA);
  const areia = caixa(3.2, 0.06, 3.2, mat(0xf3dca0), { sombra: false }); areia.position.set(cx + 5, 0.36, cz + 3); g.add(areia);
  // cerquinha baixa
  for (const [x, z, comp, rot] of [[A.x0, A.z1, w, 0], [A.x0, A.z0, d, -Math.PI / 2], [A.x1, A.z0, d, -Math.PI / 2]]) { const c = cerquinha(comp, { cor: 0xffffff, altura: 0.8 }); c.position.set(x, 0.03, z); c.rotation.y = rot; g.add(c); }
  return S;
}

// Educarte Kids II (5 a 12 anos): a escola oficial (escolaEducarte3D) com placa própria
export function educarteKids2(l) {
  const S = escola(l);
  const placa = placaEscola("Educarte Kids II", "#00b5f0", 12); placa.position.set(0, 1.6, 0.6); S.grupo.add(placa);
  for (const x of [-5.6, 5.6]) { const p = malha(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 8), mat(0x2f3440)); p.position.set(x, 0.8, 0.4); S.grupo.add(p); }
  S.solidos.push({ x0: -6.2, x1: 6.2, z0: 0.2, z1: 0.8, y1: 3 });
  return S;
}
// prédio "de loja" com um enfeite grande no telhado
function lojinha(l, { cor, beiral, rodape, texto, corTexto, h = 6, vitrine = MAT.janela, enfeite = null, toldoCores = null }) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  corpo(g, W, h, D, cor, { beiral, rodape });
  const v = caixaRedonda(W - 7, 2.3, 0.2, vitrine); v.position.set(-2, 1.9, 0.06); g.add(v);
  if (toldoCores) { const t = toldo(W - 1, ...toldoCores); t.position.set(0, 3.9, 0.1); g.add(t); }
  porta(g, { x: W / 2 - 2.6, z: 0.2, w: 2.4, h: 3, cor: beiral, vidro: false });
  nome(g, texto, { y: h - 1, largura: Math.min(W - 2, 9), cor: corTexto });
  if (enfeite) { enfeite.position.y += h + 0.5; enfeite.position.z += -D / 2; g.add(enfeite); }
  S.solidos.push({ x0: -W / 2, x1: W / 2, z0: -D, z1: 0, y1: 20 });
  return S;
}
export function biblioteca(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  corpo(g, W, 8, D - 2, 0xf3e6cf, { beiral: 0x8e6cff, rodape: 0xd8c7a6 });
  for (const x of [-9, -4.5, 4.5, 9]) { const c = malha(new THREE.CylinderGeometry(0.45, 0.5, 7, 14), mat(0xffffff)); c.position.set(x, 3.5, 0.6); g.add(c); }
  const front = caixaRedonda(W - 2, 0.6, 2, mat(0x8e6cff)); front.position.set(0, 7.2, 0.6); g.add(front);
  janelas(g, { w: W - 8, andares: 2, z: 0.02, y0: 1.3, alt: 3.2, colunas: 3 });
  porta(g, { z: 0.1, w: 3, h: 3.4, cor: 0x8e6cff, vidro: false });
  // pilha de livros gigantes no telhado
  const cores = [0xe8413c, 0x00b5f0, 0xffcc1f, 0x58c43a];
  cores.forEach((c, i) => { const b = caixaRedonda(6 - i * 0.6, 0.9, 4, mat(c)); b.position.set(0, 8.9 + i * 0.95, -D / 2); b.rotation.y = (i % 2 ? 0.25 : -0.15); g.add(b); });
  nome(g, "Biblioteca", { y: 6.1, largura: 8, cor: "#8e6cff" });
  S.solidos.push({ x0: -W / 2, x1: W / 2, z0: -D + 2, z1: 1.2, y1: 20 });
  return S;
}
// patinha (enfeite do veterinário)
function patinha(cor) {
  const g = new THREE.Group();
  const p = malha(new THREE.SphereGeometry(1.1, 16, 12), mat(cor)); p.scale.set(1, 0.85, 0.35); g.add(p);
  for (const [x, y] of [[-1.1, 1.0], [-0.4, 1.45], [0.4, 1.45], [1.1, 1.0]]) { const d = malha(new THREE.SphereGeometry(0.42, 12, 10), mat(cor)); d.scale.z = 0.4; d.position.set(x, y, 0); g.add(d); }
  return g;
}
function cachorrinho(cor = 0xd9a066) {
  const g = new THREE.Group();
  const c = malha(new THREE.CapsuleGeometry(0.32, 0.6, 4, 10), mat(cor)); c.rotation.x = Math.PI / 2; c.position.y = 0.55; g.add(c);
  const cab = malha(new THREE.SphereGeometry(0.34, 14, 10), mat(cor)); cab.position.set(0, 0.95, 0.5); g.add(cab);
  for (const s of [-1, 1]) { const o = malha(new THREE.SphereGeometry(0.15, 10, 8), mat(0x8a5a32)); o.scale.set(0.6, 1.3, 0.5); o.position.set(s * 0.28, 1.05, 0.45); g.add(o); const olho = malha(new THREE.SphereGeometry(0.06, 8, 6), mat(0x151515)); olho.position.set(s * 0.12, 1.02, 0.8); g.add(olho); }
  const nariz = malha(new THREE.SphereGeometry(0.07, 8, 6), mat(0x151515)); nariz.position.set(0, 0.92, 0.84); g.add(nariz);
  for (const [x, z] of [[-0.18, 0.3], [0.18, 0.3], [-0.18, -0.3], [0.18, -0.3]]) { const p = malha(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8), mat(cor)); p.position.set(x, 0.18, z); g.add(p); }
  const rabo = malha(new THREE.CapsuleGeometry(0.06, 0.3, 4, 6), mat(cor)); rabo.position.set(0, 0.8, -0.55); rabo.rotation.x = -0.7; g.add(rabo);
  return g;
}
export function veterinario(l) {
  const S = lojinha(l, { cor: 0xd8f5ea, beiral: 0x1fc08e, rodape: 0x9fe3c8, texto: "Veterinário", corTexto: "#1fc08e", enfeite: patinha(0xff9cc0) });
  const cao = cachorrinho(); cao.position.set(-4, 0.03, 2.2); cao.rotation.y = 0.6; S.grupo.add(cao);
  const casinha = caixaRedonda(1.6, 1.3, 1.6, mat(0xe8413c)); casinha.position.set(-6.6, 0.65, 1.8); S.grupo.add(casinha);
  S.solidos.push({ x0: -7.4, x1: -5.8, z0: 1, z1: 2.6, y1: 1.3 });
  return S;
}
export function lavaRapido(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  // galpão aberto com arco e escovões giratórios coloridos
  const teto = caixaRedonda(W, 0.6, D, mat(0x00b5f0)); teto.position.set(0, 5.2, -D / 2); g.add(teto);
  for (const x of [-W / 2 + 0.6, W / 2 - 0.6]) { const parede = caixaRedonda(1.2, 5, D, mat(0xffffff)); parede.position.set(x, 2.5, -D / 2); g.add(parede); S.solidos.push({ x0: x - 0.6, x1: x + 0.6, z0: -D, z1: 0, y1: 20 }); }
  const fundo = caixaRedonda(W, 5, 0.6, mat(0xffffff)); fundo.position.set(0, 2.5, -D + 0.3); g.add(fundo); S.solidos.push({ x0: -W / 2, x1: W / 2, z0: -D, z1: -D + 0.6, y1: 20 });
  for (const [x, c] of [[-4, 0xec2e8c], [4, 0x00b5f0]]) { const e = malha(new THREE.CylinderGeometry(1, 1, 4, 16), mat(c)); e.position.set(x, 2.5, -D / 2); g.add(e); S.solidos.push({ x0: x - 1, x1: x + 1, z0: -D / 2 - 1, z1: -D / 2 + 1, y1: 4.5 }); }
  const bolhas = new THREE.Group(); bolhas.userData.detalhe = true; g.add(bolhas);
  for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(emBlocos(new THREE.SphereGeometry(0.25 + rnd() * 0.35, 12, 8)), matNovo({ color: 0xcff4ff, transparent: true, opacity: 0.6 })); b.position.set((rnd() - 0.5) * (W - 3), 5.6 + rnd() * 1.6, -rnd() * D); bolhas.add(b); }
  const pl = new THREE.Group(); pl.position.set(0, 6.2, 0.4); g.add(pl); nome(pl, "Lava-Rápido Bolhinha", { y: 0, largura: 10, cor: "#00b5f0" });
  return S;
}
function notaMusical(cor) {
  const g = new THREE.Group();
  const cab = malha(new THREE.SphereGeometry(0.9, 16, 12), mat(cor)); cab.scale.set(1.25, 0.9, 0.6); cab.rotation.z = 0.4; g.add(cab);
  const haste = caixaRedonda(0.3, 3.4, 0.3, mat(cor)); haste.position.set(0.9, 1.6, 0); g.add(haste);
  const bandeira = caixaRedonda(1.3, 0.5, 0.3, mat(cor)); bandeira.position.set(1.4, 3.1, 0); bandeira.rotation.z = -0.5; g.add(bandeira);
  return g;
}
export function estudio(l) {
  const S = lojinha(l, { cor: 0xe2d4ff, beiral: 0x8e6cff, rodape: 0x151515, texto: "Estúdio Dó-Ré-Mi", corTexto: "#8e6cff", enfeite: notaMusical(0xec2e8c) });
  // faixa de teclas de piano na frente
  const [W] = l.pegada;
  for (let i = 0; i < 12; i++) { const t = caixa(W / 12 - 0.06, 0.9, 0.12, mat(0xffffff), { sombra: false }); t.position.set(-W / 2 + (i + 0.5) * (W / 12), 4.4, 0.08); S.grupo.add(t); if (i % 7 !== 2 && i % 7 !== 6) { const p = caixa(0.4, 0.55, 0.16, mat(0x151515), { sombra: false }); p.position.set(-W / 2 + (i + 1) * (W / 12), 4.6, 0.1); S.grupo.add(p); } }
  return S;
}
function envelope() {
  const g = new THREE.Group();
  const e = caixaRedonda(4, 2.6, 0.5, mat(0xffffff)); g.add(e);
  for (let i = 0; i < 4; i++) pc(g, 3.8 - i * 1.15, 0.33, 0.1, 0xffcc1f, 0, 1.04 - i * 0.33, 0.26, { sombra: false }); // aba em degraus
  const selo = caixa(0.6, 0.7, 0.1, mat(0xe8413c), { sombra: false }); selo.position.set(1.4, 0.75, 0.3); g.add(selo);
  return g;
}
export function correios(l) {
  const S = lojinha(l, { cor: 0xfff0a8, beiral: 0x1d4fb8, rodape: 0xffcc1f, texto: "Correios", corTexto: "#1d4fb8", enfeite: envelope() });
  const caixaC = caixaRedonda(0.9, 1.3, 0.8, mat(0xffcc1f)); caixaC.position.set(-5.5, 0.65, 1.6); S.grupo.add(caixaC);
  S.solidos.push({ x0: -6, x1: -5, z0: 1.2, z1: 2, y1: 1.3 });
  return S;
}
// Mirante: torre de pedra com escada até uma plataforma a 6 m (dá para subir a pé), luneta e bandeirinhas
export function mirante(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const H = 6, z0 = -D + 1, z1 = -7; // plataforma de z0 a z1
  const base = caixaRedonda(12, H, z1 - z0, mat(0xd8d2c4)); base.position.set(0, H / 2, (z0 + z1) / 2); g.add(base);
  S.solidos.push({ x0: -6, x1: 6, z0, z1, y1: H });
  const piso = caixaRedonda(12.6, 0.3, z1 - z0 + 0.6, mat(0xc98a4b)); piso.position.set(0, H + 0.1, (z0 + z1) / 2); g.add(piso);
  // grade em volta (deixa a escada livre)
  for (const [x, z, comp, rot] of [[-6, z0, z1 - z0, -Math.PI / 2], [6, z0, z1 - z0, -Math.PI / 2], [-6, z0, 12, 0]]) { const c = cerquinha(comp, { cor: 0xffffff, altura: 1.0 }); c.position.set(x, H + 0.2, z); c.rotation.y = rot; c.userData.detalhe = false; g.add(c); }
  for (const x of [-6, 2]) { const c = cerquinha(4, { cor: 0xffffff, altura: 1.0 }); c.position.set(x, H + 0.2, z1); c.userData.detalhe = false; g.add(c); }
  S.solidos.push({ x0: -6.3, x1: -5.7, z0, z1, y1: H + 1.2 }, { x0: 5.7, x1: 6.3, z0, z1, y1: H + 1.2 }, { x0: -6, x1: 6, z0: z0 - 0.3, z1: z0 + 0.3, y1: H + 1.2 }, { x0: -6, x1: -2, z0: z1 - 0.3, z1: z1 + 0.3, y1: H + 1.2 }, { x0: 2, x1: 6, z0: z1 - 0.3, z1: z1 + 0.3, y1: H + 1.2 });
  // escada (degraus de 0,33 m: o Rabisco sobe andando)
  const n = Math.ceil(H / 0.33);
  for (let i = 0; i < n; i++) {
    const y = (i + 1) * (H / n), z = -0.6 - (i * (z1 - -0.6 + 0.0)) / n * -1;
    const zz = -0.6 - i * (6.4 / n);
    const d = caixa(4, y, 6.4 / n + 0.02, mat(i % 2 ? 0xe8e2d6 : 0xd8d2c4)); d.position.set(0, y / 2, zz); g.add(d);
    S.solidos.push({ x0: -2, x1: 2, z0: zz - 3.2 / n, z1: zz + 3.2 / n, y1: y });
    void z;
  }
  // luneta, bandeirinhas e placa
  const tripe = malha(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 8), mat(0x2f3440)); tripe.position.set(3, H + 0.85, z0 + 2); g.add(tripe);
  const lun = malha(new THREE.CylinderGeometry(0.16, 0.22, 1.2, 12), mat(0xffcc1f)); lun.rotation.x = 1.2; lun.position.set(3, H + 1.55, z0 + 1.8); g.add(lun);
  const mastro = malha(new THREE.CylinderGeometry(0.08, 0.08, 4, 8), mat(0xffffff)); mastro.position.set(-4.5, H + 2.2, z0 + 1.5); g.add(mastro);
  const band = malha(new THREE.PlaneGeometry(1.6, 1), mat(0xec2e8c, { side: THREE.DoubleSide }), { sombra: false }); band.position.set(-3.7, H + 3.6, z0 + 1.5); g.add(band);
  const pl = new THREE.Group(); pl.position.set(-4.5, 0, 0.3); g.add(pl); nome(pl, "Mirante", { y: 2.2, largura: 4, cor: "#3c9a4a" });
  for (const s of [-1, 1]) { const p = malha(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), mat(0x9a6232)); p.position.set(-4.5 + s * 1.8, 1.1, 0.3); g.add(p); }
  return S;
}
// heliponto: círculo com o H, anel amarelo e luzinhas (de noite acendem)
const texHeli = texturaCanvas(256, 256, (c, w, h) => {
  c.fillStyle = "#3a3f4c"; c.fillRect(0, 0, w, h);
  c.strokeStyle = "#ffcc1f"; c.lineWidth = 12; c.strokeRect(22, 22, 212, 212);
  c.fillStyle = "#ffffff"; c.font = "900 150px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("H", 128, 138);
});
export function heliponto(H) {
  const S = novo(), g = S.grupo;
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(H.r * 1.8, H.r * 1.8), matNovo({ map: texHeli })); pad.rotation.x = -Math.PI / 2; pad.position.set(H.x, 0.08, H.z); pad.receiveShadow = true; g.add(pad);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const l = malha(new THREE.SphereGeometry(0.22, 10, 8), MAT.lampada, { sombra: false }); l.position.set(H.x + Math.cos(a) * (H.r + 0.4), 0.2, H.z + Math.sin(a) * (H.r + 0.4)); g.add(l); }
  return S;
}
// coqueiro, guarda-sol e a praia do lago
function coqueiro(alt = 6) {
  const g = new THREE.Group(), f = { sombra: false };
  // tronco de blocos que entorta um pouco, folhas de três gomos que caem para fora e os cocos
  let y = 0, x = 0;
  const n = 6, a = alt / n;
  for (let i = 0; i < n; i++) { const e = 0.62 - i * 0.05; pc(g, e, a + 0.06, e, i % 2 ? 0xb9875a : 0xa8784d, x, y + a / 2, 0, f); x += 0.1 + i * 0.03; y += a; }
  const verdes = [0x35b83a, 0x42c92d, 0x2fae45];
  for (let i = 0; i < 7; i++) {
    const r = (i / 7) * Math.PI * 2 + 0.3, fo = new THREE.Group(); fo.position.set(x, y, 0); fo.rotation.y = r; g.add(fo);
    const cor = verdes[i % 3];
    pc(fo, 1.5, 0.2, 0.86, cor, 0.72, 0.16, 0, { rz: 0.12 });
    pc(fo, 1.4, 0.2, 0.68, claro(cor, 0.1), 1.98, -0.08, 0, { ...f, rz: -0.42 });
    pc(fo, 1.1, 0.18, 0.42, cor, 2.98, -0.74, 0, { ...f, rz: -0.95 });
  }
  pc(g, 0.7, 0.34, 0.7, 0x3c9a4a, x, y + 0.24, 0, f);
  for (let i = 0; i < 3; i++) { const q = (i / 3) * 6.28; pc(g, 0.34, 0.34, 0.34, 0x7a4a2a, x + Math.cos(q) * 0.36, y - 0.26, Math.sin(q) * 0.36, f); }
  return g;
}
function guardaSol(c1, c2) {
  const g = new THREE.Group(), f = { sombra: false };
  pc(g, 0.14, 2.8, 0.14, 0xffffff, 0, 1.4, 0, f);
  // lona em degraus, com gomos das duas cores
  const a = 1.0;
  for (const [sx, sz] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) { const c = sx * sz > 0 ? c1 : c2; pc(g, a * 1.55, 0.2, a * 1.55, c, (sx * a * 1.55) / 2, 2.62, (sz * a * 1.55) / 2); pc(g, a * 0.95, 0.2, a * 0.95, c, (sx * a * 0.95) / 2, 2.82, (sz * a * 0.95) / 2, f); pc(g, a * 0.42, 0.2, a * 0.42, c, (sx * a * 0.42) / 2, 3.02, (sz * a * 0.42) / 2, f); }
  pc(g, 0.26, 0.14, 0.26, 0xffffff, 0, 3.18, 0, f);
  pc(g, 1.2, 0.06, 2, c1, 1.2, 0.08, 0.3, f); pc(g, 1.2, 0.07, 0.4, 0xffffff, 1.2, 0.09, -0.2, f);
  return g;
}
export function praia(P, L2) {
  const S = novo(), g = S.grupo;
  const cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;
  const areia = new THREE.Mesh(new THREE.PlaneGeometry(P.x1 - P.x0, P.z1 - P.z0), mat(0xf3dca0)); areia.rotation.x = -Math.PI / 2; areia.position.set(cx, 0.04, cz); areia.receiveShadow = true; g.add(areia);
  const raso = new THREE.Mesh(disco(L2.r + 1.8, { passo: 1 }), mat(0x9fe6f5)); raso.rotation.x = -Math.PI / 2; raso.position.set(L2.x, 0.06, L2.z); g.add(raso);
  const agua = new THREE.Mesh(disco(L2.r, { passo: 1 }), MAT_LAGO); agua.rotation.x = -Math.PI / 2; agua.position.set(L2.x, 0.08, L2.z); agua.userData.dinamico = true; g.add(agua);
  S.solidos.push({ circulo: true, x: L2.x, z: L2.z, r: L2.r - 0.5 });
  S.agua = agua;
  // boias e barquinho
  const boias = [];
  for (let i = 0; i < 3; i++) { const b = malha(new THREE.TorusGeometry(0.6, 0.22, 8, 18), mat([0xec2e8c, 0xffcc1f, 0x00b5f0][i])); b.rotation.x = Math.PI / 2; b.position.set(L2.x - 8 + i * 8, 0.2, L2.z - 6 + (i % 2) * 10); b.userData.dinamico = true; g.add(b); boias.push(b); }
  S.boias = boias;
  // coqueiros e guarda-sóis em volta do lago, quiosque de sucos na beira
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3, x = L2.x + Math.cos(a) * (L2.r + 11), z = L2.z + Math.sin(a) * (L2.r + 9);
    if (z < P.z0 + 4 || z > P.z1 - 3 || x < P.x0 + 3 || x > P.x1 - 3) continue;
    const c = coqueiro(5.5 + rnd() * 2); c.position.set(x, 0.04, z); c.rotation.y = rnd() * 6; g.add(c); S.solidos.push({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4, y1: 6 });
  }
  const cores = [[0xec2e8c, 0xffffff], [0x00b5f0, 0xffffff], [0xffcc1f, 0xff7a00], [0x58c43a, 0xffffff], [0x8e6cff, 0xffffff]];
  cores.forEach(([a, b], i) => {
    const ang = Math.PI * 0.1 + i * 0.42, x = L2.x + Math.cos(ang) * (L2.r + 5), z = L2.z + Math.sin(ang) * (L2.r + 4);
    const gs = guardaSol(a, b); gs.position.set(x, 0.04, z); gs.rotation.y = -ang; g.add(gs); S.solidos.push({ x0: x - 0.15, x1: x + 0.15, z0: z - 0.15, z1: z + 0.15, y1: 3 });
  });
  const qx = P.x1 - 12, qz = P.z0 + 5;
  const quiosque = new THREE.Group(); quiosque.position.set(qx, 0, qz + 2.5); g.add(quiosque);
  corpo(quiosque, 6, 3, 4, 0xfff4e0, { beiral: 0xff7a00 });
  const tetoQ = malha(new THREE.ConeGeometry(4.6, 2, 6), mat(0xe8b25a)); tetoQ.position.set(0, 4.3, -2); quiosque.add(tetoQ);
  nome(quiosque, "Sucos", { y: 2.4, largura: 4, cor: "#ff7a00" });
  S.solidos.push({ x0: qx - 3, x1: qx + 3, z0: qz - 1.5, z1: qz + 2.5, y1: 20 });
  return S;
}
export { coqueiro, guardaSol };

// ---------- bairros novos: lojinhas com enfeite no telhado (mesmo molde do veterinário e dos correios)
function florGrande(cor) {
  const g = new THREE.Group();
  const caule = malha(new THREE.CylinderGeometry(0.15, 0.15, 2.2, 8), mat(0x3c9a4a)); caule.position.y = 1.1; g.add(caule);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const p = malha(new THREE.SphereGeometry(0.6, 12, 8), mat(cor)); p.scale.set(1, 1, 0.4); p.position.set(Math.cos(a) * 0.75, 2.6 + Math.sin(a) * 0.75, 0); g.add(p); }
  const miolo = malha(new THREE.SphereGeometry(0.5, 12, 8), mat(0xffcc1f)); miolo.scale.z = 0.5; miolo.position.set(0, 2.6, 0.1); g.add(miolo);
  return g;
}
export function floricultura(l) {
  const S = lojinha(l, { cor: 0xffe4f0, beiral: 0xec2e8c, rodape: 0x58c43a, texto: "Floricultura", corTexto: "#ec2e8c", enfeite: florGrande(0xff5fa2), toldoCores: ["#ec2e8c", "#ffffff"] });
  // vasos de flores na calçada, na frente da vitrine
  [[-6, 0xff5fa2], [-4.6, 0xffcc1f], [-3.2, 0x8e6cff]].forEach(([x, c]) => {
    const v = malha(new THREE.CylinderGeometry(0.4, 0.3, 0.6, 12), mat(0xc96a3a)); v.position.set(x, 0.3, 1.2); S.grupo.add(v);
    const f = malha(new THREE.IcosahedronGeometry(0.45, 1), mat(c)); f.position.set(x, 0.9, 1.2); f.userData.detalhe = true; S.grupo.add(f);
  });
  S.solidos.push({ x0: -6.5, x1: -2.8, z0: 0.8, z1: 1.6, y1: 0.7 });
  return S;
}
function fatiaPizza() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) pc(g, 3.2 - i * 0.6, 0.64, 0.3, 0xffcc4d, 0, 3.08 - i * 0.64, 0.15); // fatia em degraus
  const borda = caixaRedonda(3.4, 0.5, 0.45, mat(0xd99a4e)); borda.position.set(0, 3.45, 0.15); g.add(borda);
  for (const [x, y] of [[-0.6, 2.9], [0.5, 2.6], [0, 1.7]]) { const t = malha(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12), mat(0xe8413c)); t.rotation.x = Math.PI / 2; t.position.set(x, y, 0.36); g.add(t); }
  return g;
}
export function pizzaria(l) { return lojinha(l, { cor: 0xfff1d6, beiral: 0xe8413c, rodape: 0x3c9a4a, texto: "Pizzaria", corTexto: "#e8413c", enfeite: fatiaPizza(), toldoCores: ["#e8413c", "#ffffff"] }); }
function cruzVerde() {
  const g = new THREE.Group();
  for (const [w, h] of [[1, 3], [3, 1]]) { const c = caixaRedonda(w, h, 0.4, mat(0x2bb24c)); c.position.y = 2; g.add(c); }
  return g;
}
export function farmacia(l) { return lojinha(l, { cor: 0xeafaf0, beiral: 0x2bb24c, rodape: 0xb8ead0, texto: "Farmácia", corTexto: "#2bb24c", enfeite: cruzVerde() }); }
function piao() {
  const g = new THREE.Group();
  const corpo = malha(new THREE.ConeGeometry(1.2, 1.8, 16), mat(0xff7a00)); corpo.rotation.x = Math.PI; corpo.position.y = 1.4; g.add(corpo);
  const faixa = malha(new THREE.CylinderGeometry(1.25, 1.25, 0.35, 16), mat(0x00b5f0)); faixa.position.y = 2.4; g.add(faixa);
  const pino = malha(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), mat(0xec2e8c)); pino.position.y = 2.9; g.add(pino);
  return g;
}
export function brinquedos(l) { return lojinha(l, { cor: 0xe8f4ff, beiral: 0x00b5f0, rodape: 0xffcc1f, texto: "Brinquedos", corTexto: "#00b5f0", enfeite: piao(), toldoCores: ["#ffcc1f", "#00b5f0"] }); }
// Museu dos Dinossauros: prédio de colunas com um dinossauro verde e bonzinho (pescoço comprido) na frente
export function museu(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const casa = new THREE.Group(); casa.position.z = -3; g.add(casa); // o prédio fica 3 m para trás; na frente, as colunas
  corpo(casa, W, 8, D - 3, 0xf3ead8, { beiral: 0x3c9a4a, rodape: 0xd8c7a6 });
  porta(casa, { z: 0.1, w: 3, h: 3.6, cor: 0x3c9a4a, vidro: false });
  for (const x of [-8, -4, 4, 8]) { const c = malha(new THREE.CylinderGeometry(0.5, 0.55, 7, 14), mat(0xffffff)); c.position.set(x, 3.5, -0.8); g.add(c); }
  const viga = caixaRedonda(W - 2, 1.3, 3.4, mat(0xffffff)); viga.position.set(0, 7.6, -1.5); g.add(viga);
  frontaoDegraus(g, W - 2, 0x3c9a4a, 8.25, -1.5, { camadas: 5, alt: 0.52, prof: 3.4 });
  nome(g, "Museu dos Dinossauros", { y: 7.6, largura: 12, cor: "#3c9a4a", z: 0.22 });
  S.solidos.push({ x0: -W / 2, x1: W / 2, z0: -D, z1: -3, y1: 20 });
  for (const x of [-8, -4, 4, 8]) S.solidos.push({ x0: x - 0.55, x1: x + 0.55, z0: -1.35, z1: -0.25, y1: 20 });
  // o dino: corpo, pescoço comprido, cabeça sorrindo e cauda (só enfeite, no gramado ao lado)
  const dino = new THREE.Group(); dino.position.set(W / 2 - 2.2, 0, -1.4); dino.rotation.y = 0.3; dino.scale.setScalar(0.65); g.add(dino);
  const verde = mat(0x6fd15a);
  const barriga = malha(new THREE.SphereGeometry(1.4, 16, 12), verde); barriga.scale.set(1, 0.8, 1.5); barriga.position.y = 1.9; dino.add(barriga);
  const pescoco = malha(new THREE.CapsuleGeometry(0.4, 2.6, 4, 10), verde); pescoco.position.set(0, 3.6, 1.4); pescoco.rotation.x = 0.5; dino.add(pescoco);
  const cab = malha(new THREE.SphereGeometry(0.6, 14, 10), verde); cab.scale.set(1, 0.85, 1.3); cab.position.set(0, 5, 2.2); dino.add(cab);
  for (const s of [-1, 1]) { const o = malha(new THREE.SphereGeometry(0.1, 8, 6), mat(0x151515)); o.position.set(s * 0.3, 5.2, 2.75); dino.add(o); }
  const cauda = malha(new THREE.ConeGeometry(0.6, 3, 10), verde); cauda.rotation.x = -Math.PI / 2 - 0.3; cauda.position.set(0, 1.6, -2.6); dino.add(cauda);
  for (const [x, z] of [[-0.7, 0.7], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7]]) { const p = malha(new THREE.CylinderGeometry(0.35, 0.4, 1.3, 10), verde); p.position.set(x, 0.65, z); dino.add(p); }
  const [dx, dz] = [W / 2 - 2.2, -1.4];
  S.solidos.push({ x0: dx - 1.1, x1: dx + 1.1, z0: dz - 1.3, z1: dz + 1.3, y1: 3 });
  return S;
}
// Observatório Estrelinha: torre redonda com cúpula branca e a luneta apontando para o céu
export function observatorio(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const torre = malha(new THREE.CylinderGeometry(W / 2 - 1, W / 2 - 0.6, 7, 28), mat(0xd8cdf2)); torre.position.set(0, 3.5, -D / 2); g.add(torre);
  const cupula = malha(new THREE.SphereGeometry(W / 2 - 0.8, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff)); cupula.position.set(0, 7, -D / 2); g.add(cupula);
  const fenda = caixa(1.4, 0.4, W / 2, mat(0x2f3d5c), { sombra: false }); fenda.position.set(0, 7 + W / 2 - 1.6, -D / 2 + 0.6); fenda.rotation.x = -0.9; g.add(fenda);
  const lun = malha(new THREE.CylinderGeometry(0.35, 0.5, 4, 14), mat(0xffcc1f)); lun.position.set(0, 11.5, -D / 2 + 2.2); lun.rotation.x = -0.7; g.add(lun);
  for (let i = 0; i < 5; i++) { const e = malha(new THREE.OctahedronGeometry(0.45, 0), MAT.lampada, { sombra: false }); const a = (i / 5) * Math.PI * 2; e.position.set(Math.cos(a) * (W / 2 - 0.4), 6.6, -D / 2 + Math.sin(a) * (W / 2 - 0.4)); g.add(e); }
  porta(g, { z: 0.1 - 1.2, w: 2.4, h: 3, cor: 0x7a52c9, vidro: false });
  const pl = new THREE.Group(); pl.position.set(0, 0, 0.3); g.add(pl); nome(pl, "Observatório", { y: 4.6, largura: 7, cor: "#7a52c9", z: -0.6 });
  S.solidos.push({ x0: -W / 2 + 0.6, x1: W / 2 - 0.6, z0: -D + 0.6, z1: -1.1, y1: 20 });
  return S;
}
