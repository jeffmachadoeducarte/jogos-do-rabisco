// Rabiscolândia: os carros da J.E Multimarcas, em blocos. A loja vende carro POPULAR e REBAIXADO: aqui os carros têm
// proporções mais "de verdade" que o carroFofo (bem baixos, rodas grandes de aro colorido, para-choque e saia), pintura
// mais brilhante e vidro escuro. Nenhum tem logo nem nome de marca. Cinco modelos genéricos:
//   hatch, sedã, hatch pequeno, hatch quadradinho e hatch médio (silhuetas diferentes na mesma receita).
// Desempenho: tudo é cor por vértice em 5 materiais (lataria, vidro, escuro, metal, luzes) + a sombrinha no chão:
// parado = ≤ 6 chamadas de desenho (e vários carros parados juntos continuam 6: mesclarPorMaterial).
//   carroJE(id, cor)                → carro dirigível (rodas que giram, volante, seta) — mesma interface do carroFofo
//   carroJE(id, cor, { parado })    → o mesmo carro já mesclado (sem nada solto)
//   mesclarPorMaterial(grupo)       → junta várias peças/carros numa malha por material

import { THREE } from "./base3d.js";
import { comArestas, prisma, emBlocos } from "./blocos.js";

// ---------------------------------------------------------------- materiais
let texSombra = null;
function sombraChao() {
  if (texSombra) return texSombra;
  const c = document.createElement("canvas"); c.width = 64; c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 64, 4, 32, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.75)"); g.addColorStop(0.55, "rgba(0,0,0,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
  x.save(); x.scale(1, 1); x.fillStyle = g; x.fillRect(0, 0, 64, 128); x.restore();
  texSombra = new THREE.CanvasTexture(c);
  return texSombra;
}
const M = {};
export function materiaisJE() {
  if (M.pintura) return M;
  const fosco = { specular: 0x222222, shininess: 24 };
  M.pintura = comArestas(new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0x6a6a6a, shininess: 80 }));
  M.vidro = new THREE.MeshPhongMaterial({ color: 0x16262f, specular: 0xbbbbbb, shininess: 110, transparent: true, opacity: 0.74, depthWrite: false });
  M.escuro = comArestas(new THREE.MeshPhongMaterial({ vertexColors: true, ...fosco }));
  M.metal = comArestas(new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0x8a8a8a, shininess: 100 }));
  M.luz = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  M.sombra = new THREE.MeshBasicMaterial({ map: sombraChao(), color: 0x000000, transparent: true, depthWrite: false, opacity: 0.85 });
  return M;
}
const ORDEM = ["pintura", "escuro", "metal", "luz", "vidro", "sombra"];

// peça: malha com o material da família (mk) e a cor gravada nos vértices
const cor3 = new THREE.Color();
export function pecaJE(geo, mk, cor = 0xffffff) {
  materiaisJE();
  if (geo.index) geo = geo.toNonIndexed();
  cor3.set(cor);
  const n = geo.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = cor3.r; c[i * 3 + 1] = cor3.g; c[i * 3 + 2] = cor3.b; }
  geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M[mk]);
  m.userData.mk = mk;
  m.castShadow = false; m.receiveShadow = mk !== "vidro" && mk !== "sombra";
  return m;
}

// junta todas as peças (userData.mk) de um grupo numa malha por material; o que tiver userData.dinamico (ou estiver
// dentro de um nó em "juntas") fica de fora. Devolve o grupo com as malhas novas (userData.mesclada = true).
export function mesclarPorMaterial(raiz, { juntas = null, sombra = ["pintura"] } = {}) {
  raiz.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(raiz.matrixWorld).invert(), m4 = new THREE.Matrix4(), nm = new THREE.Matrix3();
  const baldes = new Map(), tirar = [];
  const fora = (o) => { for (let p = o; p && p !== raiz; p = p.parent) if (p.userData.dinamico || juntas?.has(p)) return true; return false; };
  raiz.traverse((o) => {
    if (!o.isMesh || !o.userData.mk || (o.userData.mesclada && o.parent === raiz) || fora(o)) return; // (já mesclada aqui: fica)
    let vis = true; for (let p = o; p && p !== raiz; p = p.parent) if (!p.visible) vis = false;
    tirar.push(o); if (!vis) return;
    m4.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m4);
    const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color, U = g.attributes.uv;
    if (!baldes.has(o.userData.mk)) baldes.set(o.userData.mk, { pos: [], nrm: [], cor: [], uv: [] });
    const b = baldes.get(o.userData.mk), v = new THREE.Vector3(), n = new THREE.Vector3();
    const ordem = m4.determinant() < 0 ? [0, 2, 1] : [0, 1, 2]; // espelhado: desvira os triângulos
    for (let t = 0; t < P.count; t += 3) for (const k of ordem) {
      const i = t + k;
      v.fromBufferAttribute(P, i).applyMatrix4(m4); b.pos.push(v.x, v.y, v.z);
      n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); b.nrm.push(n.x, n.y, n.z);
      if (C) b.cor.push(C.getX(i), C.getY(i), C.getZ(i)); else b.cor.push(1, 1, 1);
      if (U) b.uv.push(U.getX(i), U.getY(i)); else b.uv.push(0, 0);
    }
  });
  for (const o of tirar) o.removeFromParent();
  for (const mk of ORDEM) {
    const b = baldes.get(mk); if (!b) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(b.nrm, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(b.cor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(b.uv, 2));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, M[mk]);
    Object.assign(m.userData, { mk, mesclada: true });
    m.castShadow = sombra.includes(mk); m.receiveShadow = mk !== "vidro" && mk !== "sombra";
    if (mk === "vidro") m.renderOrder = 2;
    raiz.add(m);
  }
  return raiz;
}

// ---------------------------------------------------------------- modelos
// cotas: z para a frente, y para cima, x para a esquerda do motorista (+x = lado do motorista). capo: [fim da frente da
// cabine, altura]; teto: [início, fim, altura]; porta-malas: altura da traseira (sedã)
const R_RODA = 0.36, TRILHA = 0.835, CINTA = 0.98;
export const MODELOS_JE = {
  "hatch-g5": { nome: "Hatch rebaixado", zF: 2.3, zR: -2.28, larg: 1.97, eixos: [1.4, -1.5], cabine: [0.98, -2.1], teto: [0.22, -1.45, 1.68], assento: [0.42, 0.44, 0.04], aro: 0xcfd3d8, aerofolio: true },
  seda: { nome: "Sedã rebaixado", sedan: true, zF: 2.42, zR: -2.5, larg: 1.98, eixos: [1.47, -1.55], cabine: [0.98, -1.7], teto: [0.1, -1.05, 1.68], assento: [0.42, 0.44, 0.04], aro: 0x2a2c31 },
  celta: { nome: "Hatch pequeno", zF: 2.16, zR: -2.14, larg: 1.92, eixos: [1.3, -1.33], cabine: [0.9, -1.98], teto: [0.2, -1.35, 1.7], assento: [0.41, 0.43, 0], aro: 0xffcc1f },
  quadrado: { nome: "Hatch quadradinho", zF: 2.06, zR: -2.06, larg: 1.9, eixos: [1.25, -1.3], cabine: [1.1, -2.0], teto: [0.62, -1.85, 1.76], assento: [0.41, 0.48, -0.1], aro: 0xdfe3e8 },
  medio: { nome: "Hatch médio", zF: 2.38, zR: -2.3, larg: 2.0, eixos: [1.45, -1.5], cabine: [1.0, -2.05], teto: [0.2, -1.2, 1.66], assento: [0.42, 0.42, -0.12], aro: 0xe8413c, aerofolio: true },
};
export const ID_JE = Object.keys(MODELOS_JE);
const caixaJ = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d).toNonIndexed(); b.translate(x, y, z); return b; };
function rodaJE(corAro) {
  const g = new THREE.Group();
  const pneu = prisma(R_RODA, R_RODA, 0.32, 8); pneu.rotateZ(Math.PI / 2); g.add(pecaJE(pneu, "escuro", 0x17181b));
  const aro = prisma(0.27, 0.27, 0.36, 8); aro.rotateZ(Math.PI / 2); g.add(pecaJE(aro, "metal", corAro));
  g.add(pecaJE(caixaJ(0.4, 0.34, 0.08, 0, 0, 0), "metal", 0x2a2c31), pecaJE(caixaJ(0.4, 0.08, 0.34, 0, 0, 0), "metal", 0x2a2c31));
  return g;
}
export function carroJE(id = "hatch-g5", cor = 0x0b0c0e, { parado = false } = {}) {
  materiaisJE();
  const S = MODELOS_JE[id], { zF, zR, larg: L, eixos, cabine: [cF, cR], teto: [tF, tR, tA] } = S;
  const g = new THREE.Group(), P = (w, h, d, x, y, z, mk = "pintura", c = cor) => g.add(pecaJE(caixaJ(w, h, d, x, y, z), mk, c));
  const comp = zF - zR, zM = (zF + zR) / 2, escuro = 0x1b1c1f;
  // saia baixa, lataria inferior, capô em dois degraus e traseira
  P(L, 0.14, comp - 0.1, 0, 0.26, zM, "escuro", escuro);
  // frente (motor) e traseira cheias; no meio só as laterais e o assoalho, para o Rabisco ir sentado por dentro
  P(L, 0.68, zF - cF, 0, 0.65, (zF + cF) / 2); P(L, 0.68, cR - zR, 0, 0.65, (cR + zR) / 2);
  for (const s of [-1, 1]) P(0.16, 0.68, cF - cR, (s * (L - 0.16)) / 2, 0.65, (cF + cR) / 2);
  P(L - 0.1, 0.1, zF - cF, 0, 1.03, (zF + cF) / 2); P(L - 0.24, 0.1, zF - cF - 0.3, 0, 1.13, (zF + cF) / 2 - 0.1);
  if (S.sedan) P(L - 0.1, 0.16, cR - zR, 0, 1.07, (cR + zR) / 2);
  // cabine: vidro em três degraus (a inclinação do para-brisa e da traseira), teto e colunas
  const cz = (cF + cR) / 2, n = 3, aV = (tA - CINTA) / n;
  for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, f = cF + (tF - cF) * k, t = cR + (tR - cR) * k; g.add(pecaJE(caixaJ(L - 0.16, aV, f - t, 0, CINTA + aV * (i + 0.5), (f + t) / 2), "vidro")); }
  P(L - 0.14, 0.14, tF - tR, 0, tA + 0.03, (tF + tR) / 2);
  for (const s of [-1, 1]) {
    for (const z of [tF - 0.04, (tF + tR) / 2 - 0.1, tR + 0.04]) P(0.1, tA - CINTA, 0.14, (s * (L - 0.1)) / 2, (tA + CINTA) / 2, z);
    P(0.14, 0.08, 0.22, s * (L / 2 + 0.05), 1.08, cF - 0.3); // retrovisor
    P(0.03, 0.05, 0.3, s * (L / 2 + 0.005), 0.74, cz, "metal", 0xdfe3e8); // maçaneta
    // caixa de roda escura
    for (const z of eixos) P(0.06, 0.5, 1.0, s * (L / 2 + 0.002), 0.5, z, "escuro", 0x101113);
    // saia lateral
    P(0.1, 0.1, comp * 0.42, s * (L / 2 + 0.02), 0.26, (eixos[0] + eixos[1]) / 2, "escuro", 0x2a2c31);
  }
  // frente: faróis, grade e para-choque; trás: lanternas, para-choque e placa
  for (const s of [-1, 1]) { P(0.56, 0.2, 0.06, s * 0.62, 0.68, zF + 0.01, "luz", 0xfff6d8); P(0.56, 0.18, 0.06, s * 0.62, 0.68, zR - 0.01, "luz", 0xe0202a); }
  P(0.7, 0.16, 0.06, 0, 0.7, zF + 0.012, "escuro", 0x101113); P(L + 0.02, 0.22, 0.12, 0, 0.38, zF + 0.04, "pintura", cor); P(L - 0.5, 0.1, 0.1, 0, 0.3, zF + 0.06, "escuro", 0x101113);
  P(L + 0.02, 0.22, 0.12, 0, 0.38, zR - 0.04, "pintura", cor); P(0.56, 0.16, 0.04, 0, 0.6, zR - 0.015, "escuro", 0xf2f2f2);
  if (S.aerofolio) P(L - 0.3, 0.08, 0.4, 0, tA + 0.03, tR - 0.1);
  // interior baixo (bancos e painel, aparecem pelo vidro)
  const [ax, ay, az] = S.assento;
  for (const x of [ax, -ax]) { P(0.6, 0.16, 0.6, x, 0.42, az, "escuro", 0x26282d); P(0.6, 0.8, 0.14, x, 0.86, az - 0.34, "escuro", 0x26282d); }
  P(L - 0.34, 0.34, 0.3, 0, 0.84, cF - 0.2, "escuro", 0x17181b);
  // sombrinha de contato no chão (o carro rebaixado "senta" no asfalto)
  { const s = new THREE.PlaneGeometry(L + 0.35, comp + 0.4); s.rotateX(-Math.PI / 2); s.translate(0, 0.012, zM); g.add(pecaJE(s, "sombra")); }
  // rodas
  const rodas = [];
  for (const ez of eixos) for (const s of [1, -1]) { const r = new THREE.Group(); r.position.set(TRILHA * s, R_RODA, ez); r.add(rodaJE(S.aro)); g.add(r); rodas.push(r); }
  const motorista = new THREE.Vector3(ax, ay, az), carona = new THREE.Vector3(-ax, ay, az);
  if (parado) {
    mesclarPorMaterial(g);
    Object.assign(g.userData, { modelo: id, motorista, carona, rodas: [] });
    return g;
  }
  // dirigível: rodas giram (cada uma vira poucas malhas), volante e seta soltos
  for (const r of rodas) mesclarPorMaterial(r, { sombra: [] });
  mesclarPorMaterial(g, { juntas: new Set(rodas) });
  // vidro próprio: fica mais claro quando tem gente dentro (para ver o Rabisco dirigindo)
  const vidro = M.vidro.clone();
  g.traverse((o) => { if (o.isMesh && o.userData.mk === "vidro") o.material = vidro; });
  const volante = pecaJE(emBlocos(new THREE.TorusGeometry(0.24, 0.032, 8, 20)).clone(), "escuro", 0x111214); volante.position.set(ax, ay + 0.3, az + 0.45); volante.rotation.x = -1.0; volante.userData.dinamico = true; g.add(volante);
  const seta = new THREE.Mesh(emBlocos(new THREE.ConeGeometry(0.45, 0.9, 4)), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); seta.rotation.x = Math.PI; seta.position.y = 3.0; seta.userData.dinamico = true; g.add(seta);
  const nPecas = g.children.length;
  Object.assign(g.userData, { modelo: id, rodas, seta, volante, motorista, carona, vidro, nPecas, raioRoda: R_RODA, fazerParado: () => carroJE(id, cor, { parado: true }) });
  return g;
}
