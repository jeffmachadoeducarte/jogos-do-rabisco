// Rabiscolândia: os bichinhos que acompanham o Rabisco (cachorrinho, gatinho, coelhinho, patinho, tartaruga e ovelhinha).
// Cada um é montado de caixinhas coloridas (2 ou 3 cores) e vira UMA malha só (uma chamada de desenho): as partes
// que se mexem (cabeça, orelhas, patas, rabo, asas) são animadas na CPU, mexendo nos vértices da malha única. Assim
// o bichinho custa 1 chamada de desenho, com qualquer pose.
//
//   const m = criarModeloBichinho("cachorro");  m.grupo (THREE.Group, pés no chão, frente = +z)
//   m.posar({ fase, vel, sentado, pulo, flip, olhar, abanar, coracao, t })  → mexe nas partes
//     fase: relógio do passo (rad) · vel: 0 parado, 1 andando, 2 correndo · sentado: 0..1 · pulo: altura extra (m)
//     flip: cambalhota (rad) · olhar: giro da cabeça (rad) · abanar: 0..1 (rabo/orelhas felizes) · coracao: 0..1
//
// Tudo original, no estilo de blocos do jogo (plástico liso com a linha clara na beira de cada caixa).

import { THREE } from "../../src/motor3d/toon.js";
import { plasticoVC } from "./blocos.js";

const C = { tinta: 0x151515, branco: 0xffffff, rosa: 0xff8fb8, rosaForte: 0xf14ba8 };

// ---- catálogo: id, nome, preço em Rabiscoins (o 1º bichinho de cada criança sai de graça) e as cores da amostra
export const BICHINHOS = [
  { id: "cachorro", nome: "Cachorrinho", icone: "🐶", preco: 60, cores: [0xd99a5b, 0xfff3e0, 0x6b3f22], som: "au" },
  { id: "gato", nome: "Gatinho", icone: "🐱", preco: 70, cores: [0x9aa0b8, 0xffffff, 0xff8fb8], som: "miau" },
  { id: "coelho", nome: "Coelhinho", icone: "🐰", preco: 90, cores: [0xfaf6f2, 0xffb6c8, 0xcfc4dc], som: "pulinho" },
  { id: "pato", nome: "Patinho", icone: "🐥", preco: 100, cores: [0xffd83a, 0xff9a1f, 0xffffff], som: "quack" },
  { id: "ovelha", nome: "Ovelhinha", icone: "🐑", preco: 120, cores: [0xfffbf0, 0x4a4150, 0xffb6c8], som: "bee" },
  { id: "tartaruga", nome: "Tartaruguinha", icone: "🐢", preco: 150, cores: [0x59b84a, 0x8a6a3c, 0xe8d49a], som: "plim" },
];
export const bichinhoPorId = (id) => BICHINHOS.find((b) => b.id === id) ?? null;
export const ID_BICHINHO = (id) => `rabiscolandia:bichinho:${id}`;

// ---- as caixas: [w, h, d, x, y, z, cor, rx?, ry?, rz?]  (x,y,z = centro). Parte = { id, pai, pivo:[x,y,z], caixas }
const cx = (w, h, d, x, y, z, cor, rx = 0, ry = 0, rz = 0) => [w, h, d, x, y, z, cor, rx, ry, rz];
const olhos = (y, z, esp = 0.07, t = 0.04) => [cx(t, t * 1.25, 0.02, -esp, y, z, C.tinta), cx(t, t * 1.25, 0.02, esp, y, z, C.tinta)];
const perna = (id, x, z, topo, alt, cor, pe = null, larg = 0.09) => ({ id, pai: "corpo", pivo: [x, topo, z], caixas: pe
  ? [cx(larg, alt - 0.05, larg, x, topo - (alt - 0.05) / 2, z, cor), cx(larg + 0.006, 0.05, larg + 0.012, x, 0.025, z + 0.004, pe)]
  : [cx(larg, alt, larg, x, topo - alt / 2, z, cor)] });
const CORACAO = { id: "coracao", pai: null, pivo: [0, 0.78, 0], caixas: [
  cx(0.05, 0.05, 0.04, -0.03, 0.8, 0, C.rosaForte), cx(0.05, 0.05, 0.04, 0.03, 0.8, 0, C.rosaForte),
  cx(0.11, 0.045, 0.04, 0, 0.765, 0, C.rosaForte), cx(0.05, 0.04, 0.04, 0, 0.73, 0, C.rosaForte)] };

const MODELOS = {
  cachorro() {
    const [pel, bco, esc] = bichinhoPorId("cachorro").cores;
    return { sentar: "cao", passo: "andar", partes: [
      { id: "corpo", pai: null, pivo: [0, 0.22, -0.14], caixas: [cx(0.27, 0.24, 0.46, 0, 0.29, 0, pel), cx(0.2, 0.05, 0.32, 0, 0.18, 0.02, bco), cx(0.285, 0.13, 0.2, 0, 0.33, -0.1, esc)] },
      { id: "cabeca", pai: "corpo", pivo: [0, 0.4, 0.2], caixas: [cx(0.27, 0.23, 0.25, 0, 0.5, 0.31, pel), cx(0.15, 0.1, 0.1, 0, 0.45, 0.46, bco), cx(0.055, 0.04, 0.03, 0, 0.48, 0.515, C.tinta), cx(0.05, 0.02, 0.05, 0, 0.395, 0.46, C.rosa), ...olhos(0.54, 0.44)] },
      { id: "orelhaE", pai: "cabeca", pivo: [-0.12, 0.6, 0.27], caixas: [cx(0.07, 0.17, 0.11, -0.15, 0.53, 0.28, esc)] },
      { id: "orelhaD", pai: "cabeca", pivo: [0.12, 0.6, 0.27], caixas: [cx(0.07, 0.17, 0.11, 0.15, 0.53, 0.28, esc)] },
      { id: "cauda", pai: "corpo", pivo: [0, 0.33, -0.23], caixas: [cx(0.06, 0.06, 0.18, 0, 0.4, -0.31, pel, 0.6), cx(0.065, 0.065, 0.05, 0, 0.45, -0.38, bco, 0.6)] },
      perna("pernaFE", -0.085, 0.14, 0.17, 0.17, pel, bco), perna("pernaFD", 0.085, 0.14, 0.17, 0.17, pel, bco),
      perna("pernaTE", -0.085, -0.14, 0.17, 0.17, pel, bco), perna("pernaTD", 0.085, -0.14, 0.17, 0.17, pel, bco),
      CORACAO] };
  },
  gato() {
    const [pel, bco, ros] = bichinhoPorId("gato").cores;
    const lis = 0x7c8299;
    return { sentar: "cao", passo: "andar", partes: [
      { id: "corpo", pai: null, pivo: [0, 0.22, -0.14], caixas: [cx(0.23, 0.21, 0.46, 0, 0.28, 0, pel), cx(0.17, 0.05, 0.3, 0, 0.18, 0.02, bco), cx(0.235, 0.04, 0.05, 0, 0.34, -0.06, lis), cx(0.235, 0.04, 0.05, 0, 0.34, 0.06, lis)] },
      { id: "cabeca", pai: "corpo", pivo: [0, 0.38, 0.2], caixas: [cx(0.26, 0.21, 0.22, 0, 0.49, 0.3, pel), cx(0.12, 0.07, 0.04, 0, 0.455, 0.42, bco), cx(0.04, 0.03, 0.02, 0, 0.485, 0.43, ros), ...olhos(0.52, 0.41, 0.07, 0.045),
        cx(0.12, 0.008, 0.01, -0.17, 0.47, 0.38, C.branco), cx(0.12, 0.008, 0.01, 0.17, 0.47, 0.38, C.branco), cx(0.12, 0.008, 0.01, -0.17, 0.44, 0.38, C.branco, 0, 0, 0.2), cx(0.12, 0.008, 0.01, 0.17, 0.44, 0.38, C.branco, 0, 0, -0.2)] },
      { id: "orelhaE", pai: "cabeca", pivo: [-0.09, 0.58, 0.27], caixas: [cx(0.08, 0.1, 0.05, -0.09, 0.64, 0.27, pel), cx(0.04, 0.06, 0.02, -0.09, 0.635, 0.3, ros)] },
      { id: "orelhaD", pai: "cabeca", pivo: [0.09, 0.58, 0.27], caixas: [cx(0.08, 0.1, 0.05, 0.09, 0.64, 0.27, pel), cx(0.04, 0.06, 0.02, 0.09, 0.635, 0.3, ros)] },
      { id: "cauda", pai: "corpo", pivo: [0, 0.3, -0.23], caixas: [cx(0.05, 0.05, 0.2, 0, 0.34, -0.33, pel, 0.5), cx(0.05, 0.2, 0.05, 0, 0.5, -0.43, pel), cx(0.055, 0.05, 0.055, 0, 0.62, -0.43, lis)] },
      perna("pernaFE", -0.07, 0.15, 0.17, 0.17, pel, bco, 0.08), perna("pernaFD", 0.07, 0.15, 0.17, 0.17, pel, bco, 0.08),
      perna("pernaTE", -0.07, -0.15, 0.17, 0.17, pel, bco, 0.08), perna("pernaTD", 0.07, -0.15, 0.17, 0.17, pel, bco, 0.08),
      CORACAO] };
  },
  coelho() {
    const [pel, ros, lil] = bichinhoPorId("coelho").cores;
    return { sentar: "cao", passo: "pulinhos", partes: [
      { id: "corpo", pai: null, pivo: [0, 0.2, -0.12], caixas: [cx(0.27, 0.25, 0.34, 0, 0.3, 0, pel), cx(0.2, 0.05, 0.22, 0, 0.19, 0.02, lil)] },
      { id: "cabeca", pai: "corpo", pivo: [0, 0.4, 0.14], caixas: [cx(0.24, 0.21, 0.21, 0, 0.5, 0.22, pel), cx(0.04, 0.03, 0.02, 0, 0.485, 0.335, ros), cx(0.035, 0.04, 0.012, -0.015, 0.45, 0.335, C.branco), cx(0.035, 0.04, 0.012, 0.015, 0.45, 0.335, C.branco),
        ...olhos(0.54, 0.325, 0.07, 0.04)] },
      { id: "orelhaE", pai: "cabeca", pivo: [-0.06, 0.6, 0.2], caixas: [cx(0.07, 0.3, 0.05, -0.07, 0.75, 0.2, pel, 0, 0, 0.12), cx(0.035, 0.22, 0.02, -0.07, 0.75, 0.225, ros, 0, 0, 0.12)] },
      { id: "orelhaD", pai: "cabeca", pivo: [0.06, 0.6, 0.2], caixas: [cx(0.07, 0.3, 0.05, 0.07, 0.75, 0.2, pel, 0, 0, -0.12), cx(0.035, 0.22, 0.02, 0.07, 0.75, 0.225, ros, 0, 0, -0.12)] },
      { id: "cauda", pai: "corpo", pivo: [0, 0.3, -0.18], caixas: [cx(0.11, 0.11, 0.11, 0, 0.3, -0.22, C.branco)] },
      perna("pernaFE", -0.07, 0.1, 0.17, 0.17, pel, lil, 0.07), perna("pernaFD", 0.07, 0.1, 0.17, 0.17, pel, lil, 0.07),
      { id: "pernaTE", pai: "corpo", pivo: [-0.11, 0.17, -0.1], caixas: [cx(0.09, 0.16, 0.2, -0.11, 0.1, -0.08, pel), cx(0.1, 0.04, 0.25, -0.11, 0.02, -0.04, lil)] },
      { id: "pernaTD", pai: "corpo", pivo: [0.11, 0.17, -0.1], caixas: [cx(0.09, 0.16, 0.2, 0.11, 0.1, -0.08, pel), cx(0.1, 0.04, 0.25, 0.11, 0.02, -0.04, lil)] },
      CORACAO] };
  },
  pato() {
    const [ama, lar, bco] = bichinhoPorId("pato").cores;
    return { sentar: "agachar", passo: "gingado", partes: [
      { id: "corpo", pai: null, pivo: [0, 0.2, 0], caixas: [cx(0.28, 0.24, 0.34, 0, 0.27, 0, ama), cx(0.22, 0.06, 0.24, 0, 0.16, 0.02, bco), cx(0.1, 0.1, 0.1, 0, 0.34, -0.2, ama, 0.5)] },
      { id: "cabeca", pai: "corpo", pivo: [0, 0.38, 0.1], caixas: [cx(0.22, 0.2, 0.2, 0, 0.5, 0.14, ama), cx(0.14, 0.04, 0.1, 0, 0.465, 0.28, lar), cx(0.12, 0.025, 0.08, 0, 0.44, 0.275, lar), ...olhos(0.54, 0.245, 0.07, 0.04), cx(0.03, 0.06, 0.03, 0, 0.64, 0.12, ama)] },
      { id: "asaE", pai: "corpo", pivo: [-0.15, 0.34, 0], caixas: [cx(0.04, 0.13, 0.2, -0.155, 0.28, -0.01, lar)] },
      { id: "asaD", pai: "corpo", pivo: [0.15, 0.34, 0], caixas: [cx(0.04, 0.13, 0.2, 0.155, 0.28, -0.01, lar)] },
      perna("pernaE", -0.06, 0.02, 0.15, 0.15, lar, null, 0.045), perna("pernaD", 0.06, 0.02, 0.15, 0.15, lar, null, 0.045),
      { id: "peE", pai: "pernaE", pivo: [-0.06, 0.02, 0.02], caixas: [cx(0.09, 0.025, 0.12, -0.06, 0.012, 0.04, lar)] },
      { id: "peD", pai: "pernaD", pivo: [0.06, 0.02, 0.02], caixas: [cx(0.09, 0.025, 0.12, 0.06, 0.012, 0.04, lar)] },
      CORACAO] };
  },
  ovelha() {
    const [la, esc, ros] = bichinhoPorId("ovelha").cores;
    return { sentar: "agachar", passo: "andar", partes: [
      { id: "corpo", pai: null, pivo: [0, 0.22, 0], caixas: [cx(0.36, 0.3, 0.44, 0, 0.32, 0, la), cx(0.3, 0.1, 0.34, 0, 0.51, -0.02, la), cx(0.2, 0.08, 0.2, -0.06, 0.58, -0.05, la), cx(0.2, 0.08, 0.2, 0.07, 0.57, 0.08, la), cx(0.2, 0.1, 0.12, 0, 0.3, -0.25, la)] },
      { id: "cabeca", pai: "corpo", pivo: [0, 0.4, 0.2], caixas: [cx(0.19, 0.21, 0.19, 0, 0.5, 0.32, esc), cx(0.23, 0.07, 0.19, 0, 0.64, 0.3, la), cx(0.12, 0.06, 0.04, 0, 0.45, 0.425, ros), cx(0.04, 0.03, 0.02, 0, 0.47, 0.43, C.tinta), ...olhos(0.54, 0.42, 0.055, 0.035)] },
      { id: "orelhaE", pai: "cabeca", pivo: [-0.1, 0.55, 0.3], caixas: [cx(0.12, 0.05, 0.07, -0.16, 0.54, 0.3, esc, 0, 0, 0.3)] },
      { id: "orelhaD", pai: "cabeca", pivo: [0.1, 0.55, 0.3], caixas: [cx(0.12, 0.05, 0.07, 0.16, 0.54, 0.3, esc, 0, 0, -0.3)] },
      { id: "cauda", pai: "corpo", pivo: [0, 0.3, -0.24], caixas: [cx(0.08, 0.08, 0.08, 0, 0.3, -0.31, la)] },
      perna("pernaFE", -0.1, 0.14, 0.18, 0.18, esc, null, 0.075), perna("pernaFD", 0.1, 0.14, 0.18, 0.18, esc, null, 0.075),
      perna("pernaTE", -0.1, -0.14, 0.18, 0.18, esc, null, 0.075), perna("pernaTD", 0.1, -0.14, 0.18, 0.18, esc, null, 0.075),
      CORACAO] };
  },
  tartaruga() {
    const [ver, cas, bege] = bichinhoPorId("tartaruga").cores;
    return { sentar: "agachar", passo: "devagar", partes: [
      { id: "corpo", pai: null, pivo: [0, 0.14, 0], caixas: [cx(0.38, 0.17, 0.44, 0, 0.24, 0, cas), cx(0.3, 0.07, 0.34, 0, 0.345, 0, cas), cx(0.2, 0.05, 0.22, 0, 0.395, 0, bege), cx(0.4, 0.04, 0.46, 0, 0.17, 0, bege), cx(0.3, 0.02, 0.1, 0, 0.36, 0.1, bege), cx(0.3, 0.02, 0.1, 0, 0.36, -0.1, bege)] },
      { id: "cabeca", pai: "corpo", pivo: [0, 0.22, 0.2], caixas: [cx(0.16, 0.15, 0.18, 0, 0.24, 0.36, ver), ...olhos(0.275, 0.455, 0.05, 0.035), cx(0.05, 0.02, 0.02, 0, 0.215, 0.455, C.rosa)] },
      { id: "cauda", pai: "corpo", pivo: [0, 0.2, -0.22], caixas: [cx(0.06, 0.06, 0.1, 0, 0.19, -0.27, ver)] },
      perna("pernaFE", -0.17, 0.15, 0.15, 0.15, ver, null, 0.1), perna("pernaFD", 0.17, 0.15, 0.15, 0.15, ver, null, 0.1),
      perna("pernaTE", -0.17, -0.15, 0.15, 0.15, ver, null, 0.1), perna("pernaTD", 0.17, -0.15, 0.15, 0.15, ver, null, 0.1),
      CORACAO] };
  },
};

const _m = new THREE.Matrix4(), _p = new THREE.Matrix4(), _t1 = new THREE.Matrix4(), _t2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Matrix3();
let materialVC = null;
const material = () => (materialVC ??= plasticoVC({ specular: new THREE.Color(0x2c2c2c), shininess: 36, side: THREE.FrontSide }));

export function criarModeloBichinho(id) {
  const modelo = MODELOS[id]?.() ?? MODELOS.cachorro();
  const partes = modelo.partes, pos = [], nrm = [], uv = [], cor = [], faixa = {};
  const c = new THREE.Color();
  for (const p of partes) {
    faixa[p.id] = { ini: pos.length / 3, fim: 0 };
    for (const [w, h, d, x, y, z, hex, rx, ry, rz] of p.caixas) {
      const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
      if (rx || ry || rz) g.applyMatrix4(_m.makeRotationFromEuler(_e.set(rx, ry, rz)));
      g.translate(x, y, z);
      pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array);
      c.setHex(hex);
      for (let i = 0; i < g.attributes.position.count; i++) cor.push(c.r, c.g, c.b);
      g.dispose();
    }
    faixa[p.id].fim = pos.length / 3;
  }
  const base = new Float32Array(pos), baseN = new Float32Array(nrm);
  const geo = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(new Float32Array(pos), 3).setUsage(THREE.DynamicDrawUsage);
  const aNrm = new THREE.BufferAttribute(new Float32Array(nrm), 3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", aPos); geo.setAttribute("normal", aNrm);
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.4, 0), 1.1); // a pose mexe nos vértices: caixa fixa e folgada
  const malha = new THREE.Mesh(geo, material());
  malha.castShadow = false; malha.receiveShadow = true; malha.userData.dinamico = true;
  const grupo = new THREE.Group();
  grupo.add(malha);

  const ordem = partes.map((p) => p.id);
  const porId = Object.fromEntries(partes.map((p) => [p.id, p]));
  const mats = Object.fromEntries(ordem.map((k) => [k, new THREE.Matrix4()]));
  const pose = Object.fromEntries(ordem.map((k) => [k, { rx: 0, ry: 0, rz: 0, dx: 0, dy: 0, dz: 0, s: 1, sy: 1 }]));
  const limpar = () => { for (const k of ordem) Object.assign(pose[k], { rx: 0, ry: 0, rz: 0, dx: 0, dy: 0, dz: 0, s: 1, sy: 1 }); };
  let ultima = "";

  function posar(e = {}) {
    const { fase = 0, vel = 0, sentado = 0, pulo = 0, flip = 0, olhar = 0, abanar = 0, coracao = 0, t = 0, recolher = 0 } = e;
    const chave = JSON.stringify([fase.toFixed(2), vel, sentado.toFixed(2), pulo.toFixed(3), flip.toFixed(2), olhar.toFixed(2), abanar.toFixed(2), coracao.toFixed(2), t.toFixed(2), recolher.toFixed(2)]);
    if (chave === ultima) return;
    ultima = chave;
    limpar();
    const P = pose, tem = (k) => Boolean(porId[k]), s = sentado, andar = vel > 0 ? Math.min(1, vel) : 0;
    const amp = vel >= 2 ? 0.95 : 0.55;
    const respira = Math.sin(t * 2.2) * 0.012;
    // ----- andar: patas em diagonal
    const tipo = modelo.passo;
    if (andar && tipo !== "pulinhos") {
      const a = Math.sin(fase) * amp * (tipo === "devagar" ? 0.7 : 1) * (1 - s);
      if (tem("pernaFE")) { P.pernaFE.rx = a; P.pernaTD.rx = a; P.pernaFD.rx = -a; P.pernaTE.rx = -a; }
      if (tem("pernaE")) { P.pernaE.rx = a * 1.1; P.pernaD.rx = -a * 1.1; }
      P.corpo.dy = Math.abs(Math.sin(fase)) * (vel >= 2 ? 0.04 : 0.018) * (tipo === "devagar" ? 0.3 : 1);
      if (vel >= 2 && tipo !== "devagar") P.corpo.rx = Math.sin(fase * 2) * 0.05;
      if (tipo === "gingado") { P.corpo.rz = Math.sin(fase) * 0.14; P.cabeca.rz = -Math.sin(fase) * 0.1; }
      if (tem("asaE") && vel >= 2) { P.asaE.rz = 0.9 + Math.sin(fase * 3) * 0.4; P.asaD.rz = -0.9 - Math.sin(fase * 3) * 0.4; }
      if (tem("peE")) { P.peE.rx = -Math.max(0, Math.sin(fase)) * 0.5; P.peD.rx = Math.max(0, -Math.sin(fase)) * -0.5; }
    } else if (andar && tipo === "pulinhos") {
      const h = Math.max(0, Math.sin(fase * (vel >= 2 ? 0.75 : 0.62)));
      P.corpo.dy = h * (vel >= 2 ? 0.2 : 0.13); P.corpo.rx = -h * 0.28 * (1 - s);
      P.pernaFE.rx = P.pernaFD.rx = h * 0.7; P.pernaTE.rx = P.pernaTD.rx = -h * 0.9;
      P.cabeca.rx = h * 0.2;
    }
    // ----- cabeça: respira, olha para o Rabisco, balança o rabo e as orelhas
    P.cabeca.ry = Math.max(-0.9, Math.min(0.9, olhar));
    P.cabeca.rx += Math.sin(t * 1.6) * 0.03 + (andar && tipo === "gingado" ? Math.sin(fase * 2) * 0.1 : 0);
    if (tem("cauda")) { P.cauda.ry = Math.sin(t * 9) * 0.55 * abanar + Math.sin(t * 1.3) * 0.08; P.cauda.rx = abanar * -0.2; }
    if (tem("orelhaE")) { const o = Math.sin(t * 7) * 0.12 * abanar; P.orelhaE.rz = o + (andar ? Math.sin(fase) * 0.1 : 0); P.orelhaD.rz = -o - (andar ? Math.sin(fase) * 0.1 : 0); }
    P.corpo.sy = 1 + respira;
    // ----- sentar
    if (s > 0) {
      if (modelo.sentar === "cao") {
        const ang = id === "coelho" ? 0.85 : 0.75;
        P.corpo.rx -= ang * s; P.corpo.dy -= (id === "coelho" ? 0.075 : 0.065) * s;
        P.pernaFE.rx += ang * s; P.pernaFD.rx += ang * s;
        P.pernaTE.rx += (-ang - 0.4 + (id === "coelho" ? 0.5 : 0)) * s; P.pernaTD.rx += (-ang - 0.4 + (id === "coelho" ? 0.5 : 0)) * s;
        P.cabeca.rx += ang * 0.8 * s;
        if (tem("cauda")) P.cauda.rx += 0.5 * s;
      } else { // agachar: o corpo desce e as patas dobram (ficam curtinhas)
        P.corpo.dy -= (id === "tartaruga" ? 0.045 : 0.09) * s;
        for (const k of ["pernaFE", "pernaFD", "pernaTE", "pernaTD", "pernaE", "pernaD"]) if (tem(k)) { P[k].sy = 1 - 0.55 * s; P[k].dy = -0.045 * s; }
        if (tem("peE")) { P.peE.dy = -0.06 * s; P.peD.dy = -0.06 * s; }
        if (tem("asaE")) { P.asaE.rz = 0.25 * s; P.asaD.rz = -0.25 * s; }
      }
    }
    // tartaruga encolhe a cabeça no casco quando fica quietinha (descansando) e na cambalhota
    if (id === "tartaruga") { const r = Math.max(recolher, s * 0.5); P.cabeca.dz = -0.13 * r; P.cabeca.s = 1 - 0.25 * r; }
    // ----- pulo e cambalhota
    P.corpo.dy += pulo;
    if (flip) { P.corpo.rx += flip; P.corpo.dy += 0.12 * Math.sin(Math.min(1, Math.abs(flip) / (Math.PI * 2)) * Math.PI); }
    // ----- coração
    P.coracao.s = Math.max(0.001, coracao); P.coracao.dy = coracao * 0.1 + (coracao > 0 ? Math.sin(t * 6) * 0.01 : 0) + P.corpo.dy * 0.4;

    // ----- aplica: matriz de cada parte = matriz do pai × (T(pivô + d) · R · S · T(-pivô))
    for (const k of ordem) {
      const p = porId[k], q = pose[k];
      _t1.makeTranslation(p.pivo[0] + q.dx, p.pivo[1] + q.dy, p.pivo[2] + q.dz);
      _m.makeRotationFromEuler(_e.set(q.rx, q.ry, q.rz, "YXZ"));
      _s.set(q.s, q.s * q.sy, q.s);
      _m.scale(_s);
      _t2.makeTranslation(-p.pivo[0], -p.pivo[1], -p.pivo[2]);
      mats[k].copy(_t1).multiply(_m).multiply(_t2);
      if (p.pai) mats[k].premultiply(mats[p.pai]);
      const { ini, fim } = faixa[k], M = mats[k].elements;
      _n.setFromMatrix4(mats[k]);
      const N = _n.elements, A = aPos.array, B = aNrm.array;
      for (let i = ini * 3; i < fim * 3; i += 3) {
        const x = base[i], y = base[i + 1], z = base[i + 2], u = baseN[i], v = baseN[i + 1], w = baseN[i + 2];
        A[i] = M[0] * x + M[4] * y + M[8] * z + M[12]; A[i + 1] = M[1] * x + M[5] * y + M[9] * z + M[13]; A[i + 2] = M[2] * x + M[6] * y + M[10] * z + M[14];
        B[i] = N[0] * u + N[3] * v + N[6] * w; B[i + 1] = N[1] * u + N[4] * v + N[7] * w; B[i + 2] = N[2] * u + N[5] * v + N[8] * w;
      }
    }
    aPos.needsUpdate = true; aNrm.needsUpdate = true;
  }
  posar({});
  const liberar = () => { geo.dispose(); grupo.removeFromParent(); };
  return { id, grupo, malha, posar, liberar, tipoPasso: modelo.passo };
}
