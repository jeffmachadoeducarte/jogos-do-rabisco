// PROTÓTIPO VISUAL (estilo de blocos): moradores de caixa (cabeça cúbica, tronco, braços e pernas retangulares).
// O Rabisco oficial NÃO é redesenhado nem trocado: ele continua sendo o único jogador, como está hoje.

import { THREE, mat } from "./base3d.js";

const COR = { ciano: 0x00b5f0, rosa: 0xec2e8c, laranja: 0xff7a00, pele: 0xfce3c6, tinta: 0x151515, branco: 0xffffff };

const caixas = new Map();
const geo = (w, h, d) => { const k = `${w}|${h}|${d}`; if (!caixas.has(k)) caixas.set(k, new THREE.BoxGeometry(w, h, d)); return caixas.get(k); };
function c(pai, w, h, d, cor, x, y, z, { sombra = true } = {}) {
  const m = new THREE.Mesh(geo(w, h, d), mat(cor)); m.position.set(x, y, z); m.castShadow = sombra; m.receiveShadow = true; pai.add(m); return m;
}

// rosto simples de blocos: olhos quadrados com íris e brilho, sorriso de barra com dentes e língua
function rosto(cab, { z, y = 0, iris = COR.ciano, larg = 0.46 }) {
  for (const s of [-1, 1]) {
    c(cab, 0.15, 0.17, 0.03, COR.branco, s * larg * 0.24, y + 0.06, z, { sombra: false });
    c(cab, 0.095, 0.115, 0.03, iris, s * larg * 0.24 + 0.008, y + 0.045, z + 0.02, { sombra: false });
    c(cab, 0.05, 0.065, 0.03, COR.tinta, s * larg * 0.24 + 0.01, y + 0.04, z + 0.04, { sombra: false });
    c(cab, 0.03, 0.03, 0.03, COR.branco, s * larg * 0.24 - 0.012, y + 0.075, z + 0.06, { sombra: false });
    c(cab, 0.16, 0.035, 0.03, COR.tinta, s * larg * 0.24, y + 0.2, z + 0.01, { sombra: false }); // sobrancelha
  }
  c(cab, 0.24, 0.1, 0.03, COR.tinta, 0, y - 0.14, z, { sombra: false });
  c(cab, 0.2, 0.035, 0.03, COR.branco, 0, y - 0.105, z + 0.02, { sombra: false });
  c(cab, 0.12, 0.04, 0.03, 0xf45aa6, 0, y - 0.18, z + 0.02, { sombra: false });
  for (const s of [-1, 1]) c(cab, 0.07, 0.04, 0.03, 0xff8fb8, s * larg * 0.38, y - 0.06, z, { sombra: false });
}

// pessoa-bloco: cabeça cúbica, tronco, braços e pernas retangulares. Pivôs no ombro e no quadril para animar.
export function pessoaBloco({ pele = COR.pele, cabeca = COR.pele, torso = 0x7c5cff, mangas = null, calca = 0x35456b, sapato = 0xffffff, iris = 0x3a2a1a, rostoOpts = {}, topo = null, escala = 1 } = {}) {
  const grupo = new THREE.Group(); grupo.scale.setScalar(escala);
  const raiz = new THREE.Group(); grupo.add(raiz);
  const perna = (s) => {
    const p = new THREE.Group(); p.position.set(s * 0.17, 0.72, 0); raiz.add(p);
    c(p, 0.27, 0.34, 0.27, calca, 0, -0.17, 0); c(p, 0.23, 0.3, 0.23, pele, 0, -0.49, 0); c(p, 0.29, 0.13, 0.4, sapato, 0, -0.655, 0.05);
    return p;
  };
  const braco = (s) => {
    const p = new THREE.Group(); p.position.set(s * 0.43, 1.34, 0); raiz.add(p);
    c(p, 0.24, 0.28, 0.26, mangas ?? torso, 0, -0.14, 0); c(p, 0.2, 0.34, 0.2, pele, 0, -0.43, 0); c(p, 0.19, 0.17, 0.19, pele, 0, -0.65, 0);
    return p;
  };
  const pE = perna(1), pD = perna(-1), bE = braco(1), bD = braco(-1);
  c(raiz, 0.62, 0.3, 0.34, calca, 0, 0.87, 0); c(raiz, 0.62, 0.46, 0.34, torso, 0, 1.25, 0);
  const cab = new THREE.Group(); cab.position.y = 1.5; raiz.add(cab);
  c(cab, 0.14, 0.1, 0.14, pele, 0, 0.0, 0);
  const crnio = c(cab, 0.5, 0.5, 0.46, cabeca, 0, 0.3, 0);
  rosto(cab, { z: 0.235, y: 0.3, iris, larg: 0.5, ...rostoOpts });
  topo?.(cab, crnio);
  const api = { grupo, raiz, cab, bracoE: bE, bracoD: bD, pernaE: pE, pernaD: pD };
  api.pose = (nome = "parado") => {
    for (const p of [pE, pD, bE, bD]) p.rotation.set(0, 0, 0);
    if (nome === "acenar") { bD.rotation.z = -2.55; bE.rotation.z = 0.12; pE.rotation.x = -0.12; pD.rotation.x = 0.16; }
    if (nome === "parado") { bE.rotation.z = 0.08; bD.rotation.z = -0.08; }
  };
  api.animar = (dt, t, vel = 0) => { const s = Math.sin(t * 7) * Math.min(1, vel); pE.rotation.x = s * 0.7; pD.rotation.x = -s * 0.7; bE.rotation.x = -s * 0.6; bD.rotation.x = s * 0.6; };
  return api;
}

// morador de blocos: os amigos do estojo viram pessoas-bloco na cor deles, com o enfeite de cada tipo
const POR_TIPO = {
  lapis: { cor: 0xe8413c, topo: "ponta" }, giz: { cor: 0xffa21f, topo: "ponta" }, pincel: { cor: 0x8e6cff, topo: "pincel" },
  borracha: { cor: 0xff9ec4, topo: "borracha" }, apontador: { cor: 0x2f8fe8, topo: "apontador" }, cola: { cor: 0xf4f6ff, topo: "cola" },
  regua: { cor: 0xffcc1f, topo: "regua" }, caderno: { cor: 0x1fc08e, topo: "caderno" }, clipe: { cor: 0xec2e8c, topo: "clipe" },
};
export function moradorBloco(tipo = "lapis", { cor = null, nome = "", semente = 0, vovo = false, escala = 0.78 } = {}) {
  const info = POR_TIPO[tipo] ?? POR_TIPO.lapis;
  const base = cor ?? info.cor;
  const tenis = [COR.ciano, COR.rosa, COR.laranja, 0x58c43a, 0x8e6cff][semente % 5];
  const P = pessoaBloco({
    pele: COR.pele, cabeca: base, torso: escuro(base, 0.92), mangas: base, calca: vovo ? 0x8e5cc9 : [0x35456b, 0x2f3440, 0x4b3b8f][semente % 3], sapato: tenis, iris: 0x2a2a2a, escala: escala * 0.74,
    topo: (cab) => {
      const t = info.topo, pele = COR.pele;
      if (t === "ponta") { c(cab, 0.46, 0.14, 0.42, pele, 0, 0.62, 0); c(cab, 0.32, 0.14, 0.28, pele, 0, 0.76, 0); c(cab, 0.18, 0.14, 0.16, base, 0, 0.9, 0); }
      else if (t === "pincel") { c(cab, 0.3, 0.2, 0.3, 0xc8c8d0, 0, 0.65, 0); c(cab, 0.22, 0.26, 0.22, base, 0, 0.88, 0); }
      else if (t === "apontador") { c(cab, 0.4, 0.12, 0.36, 0xc8c8d0, 0, 0.6, 0); }
      else if (t === "regua") { for (let i = 0; i < 4; i++) c(cab, 0.06, 0.1, 0.4, 0x151515, -0.15 + i * 0.1, 0.58, 0, { sombra: false }); }
      else if (t === "clipe") { c(cab, 0.42, 0.08, 0.08, 0xdfe6ee, 0, 0.58, 0.15); c(cab, 0.08, 0.3, 0.08, 0xdfe6ee, 0.17, 0.7, 0.15); }
      else if (t === "caderno") { c(cab, 0.5, 0.14, 0.44, 0xffffff, 0, 0.57, 0); }
    },
  });
  if (vovo) c(P.cab, 0.3, 0.2, 0.3, 0xd9d9e0, 0, 0.62, -0.1);
  P.pose("parado");
  let t = semente * 2.3, aceno = 0, pulo = 0;
  const api = {
    grupo: P.grupo, nome, tipo, altura: 1.6 * escala,
    pular() { pulo = 0.35; }, acenar(s = 1.8) { aceno = Math.max(aceno, s); }, orar() {},
    atualizar(dt, { vel = 0 } = {}) {
      t += dt; aceno -= dt; pulo = Math.max(0, pulo - dt);
      if (vel > 0.2) P.animar(dt, t, 1); else { P.pernaE.rotation.x = P.pernaD.rotation.x = 0; P.bracoE.rotation.x = 0; P.bracoD.rotation.x = 0; }
      P.bracoD.rotation.z = aceno > 0 ? -2.55 + Math.sin(t * 12) * 0.3 : -0.08;
      P.raiz.position.y = pulo > 0 ? Math.sin((pulo / 0.35) * Math.PI) * 0.3 : 0;
    },
  };
  return api;
}
const escuro = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
