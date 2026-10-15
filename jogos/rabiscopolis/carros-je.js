// Rabiscolândia: os carros da J.E Multimarcas. A loja vende carro POPULAR e REBAIXADO, então aqui os carros são mais
// "de verdade" que o carroFofo: proporções reais (na escala do Rabisco, ~1,2× o tamanho real para ele caber sentado),
// pintura brilhante (verniz + reflexo de um céu desenhado), vidro com insulfilm, rodas esportivas grandes com pneu de
// perfil baixo e a caixa de roda quase encostando no pneu. Nenhum tem logo nem nome de marca: são "inspirados".
//   - "hatch-g5":  hatch compacto 4 portas inspirado no Gol geração 5 (2008–2012) — o 1º e mais caprichado
//   - "seda":      sedã compacto (estilo Voyage/Prisma)
//   - "celta":     hatch pequeno e arredondado (estilo Celta/Palio)
//   - "quadrado":  hatch quadradinho de vidro em pé (estilo Uno/Mobi)
//   - "medio":     hatch médio de linhas esticadas (estilo HB20/Onix)
// Como é feito: a lataria é um "loft" (uma seção transversal calculada a cada poucos centímetros ao longo do carro:
// linha do teto, linha de cintura, largura, curvatura das laterais e o recorte das caixas de roda); cada faixa da
// seção vira lataria, vidro ou borracha conforme a posição (para-brisa, janelas, colunas). Faróis, lanternas e
// grades são recortes 2D que "abraçam" a curva da frente/traseira.
// Desempenho: tudo é cor por vértice em 5 materiais (lataria, vidro, escuro, metal, luzes) + a sombrinha no chão:
// parado = ≤ 6 chamadas de desenho (e vários carros parados juntos continuam 6: mesclarPorMaterial).
//   carroJE(id, cor)                → carro dirigível (rodas que giram, volante, seta) — mesma interface do carroFofo
//   carroJE(id, cor, { parado })    → o mesmo carro já mesclado (sem nada solto)
//   mesclarPorMaterial(grupo)       → junta várias peças/carros numa malha por material

import { THREE, geoCaixaRedonda } from "./base3d.js";

// ---------------------------------------------------------------- materiais
let texAmbiente = null;
// céu desenhado para o reflexo (o jogo não tem mapa de ambiente): azul em cima, horizonte claro com silhuetas, chão
function ambiente() {
  if (texAmbiente) return texAmbiente;
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#4f86c6"); g.addColorStop(0.3, "#9cc4ea"); g.addColorStop(0.47, "#eef6ff"); g.addColorStop(0.5, "#ffffff");
  g.addColorStop(0.51, "#9aa1a8"); g.addColorStop(0.62, "#5d636a"); g.addColorStop(1, "#2e3135");
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // nuvens (reflexos claros no capô e no teto)
  x.fillStyle = "rgba(255,255,255,0.75)";
  for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse(rnd() * 512, 25 + rnd() * 70, 30 + rnd() * 50, 8 + rnd() * 10, 0, 0, Math.PI * 2); x.fill(); }
  // prédios e árvores no horizonte (o "desenho" que corre na lataria)
  for (let i = 0; i < 40; i++) { const w = 8 + rnd() * 26, h = 6 + rnd() * 30; x.fillStyle = `rgba(${50 + rnd() * 40},${60 + rnd() * 40},${70 + rnd() * 40},0.8)`; x.fillRect(rnd() * 512, 128 - h, w, h); }
  texAmbiente = new THREE.CanvasTexture(c);
  texAmbiente.mapping = THREE.EquirectangularReflectionMapping;
  texAmbiente.colorSpace = THREE.SRGBColorSpace;
  return texAmbiente;
}
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
  const env = ambiente();
  M.pintura = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.25, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.06, envMap: env, envMapIntensity: 1.15 });
  M.vidro = new THREE.MeshStandardMaterial({ color: 0x0a0e12, metalness: 0.3, roughness: 0.05, envMap: env, envMapIntensity: 1.0, transparent: true, opacity: 0.74, side: THREE.DoubleSide, depthWrite: false });
  M.escuro = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.05, side: THREE.DoubleSide });
  M.metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0.92, envMap: env, envMapIntensity: 1.2 });
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
    if (mk === "sombra") g.setAttribute("uv", new THREE.Float32BufferAttribute(b.uv, 2));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, M[mk]);
    Object.assign(m.userData, { mk, mesclada: true });
    m.castShadow = sombra.includes(mk); m.receiveShadow = mk !== "vidro" && mk !== "sombra";
    if (mk === "vidro") m.renderOrder = 2;
    raiz.add(m);
  }
  return raiz;
}

// ---------------------------------------------------------------- utilidades
const lerp = (a, b, t) => a + (b - a) * t;
const suave = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
// curva por pontos [[z, y], ...] com as quinas arredondadas
function curva(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0]);
  const f = (z) => {
    if (z <= p[0][0]) return p[0][1];
    for (let i = 1; i < p.length; i++) if (z <= p[i][0]) { const [z0, y0] = p[i - 1], [z1, y1] = p[i]; return y0 + ((y1 - y0) * (z - z0)) / (z1 - z0); }
    return p[p.length - 1][1];
  };
  return (z) => (f(z - 0.04) + 2 * f(z) + f(z + 0.04)) / 4;
}

// ---------------------------------------------------------------- lataria (loft)
function montarForma(S) {
  const topo = curva(S.topo), cinta = curva(S.cinta), base = curva(S.base);
  const W = S.larg / 2;
  const hw = (z) => {
    let w = W;
    if (z > S.fz0) w -= S.fRed * ((z - S.fz0) / (S.zF - S.fz0)) ** S.fExp;
    if (z < S.rz0) w -= S.rRed * ((S.rz0 - z) / (S.rz0 - S.zR)) ** S.rExp;
    return w;
  };
  // hatch: a coluna de trás desce até a quina (o vidro de trás quase da largura do carro, sem "degrau" ao lado dele)
  const tumble = (z) => (S.tumble + (z < S.tz ? S.tumbleTras * suave((S.tz - z) / 0.9) : 0)) * (S.sedan ? 1 : lerp(0.25, 1, suave((z - S.zR) / 0.75)));
  const arco = (z) => { let y = -9; for (const ez of S.eixos) { const d = z - ez; if (Math.abs(d) <= S.ra) y = Math.max(y, S.rodaR + Math.sqrt(S.ra * S.ra - d * d)); } return y; };
  const gh = (z) => Math.max(0, topo(z) - S.coroa - cinta(z));
  // seção (lado +x), de baixo (centro) até o topo (centro); t = o que é a faixa até o próximo ponto
  function secao(z) {
    const yb = Math.max(base(z), arco(z)), b = cinta(z), tp = topo(z), w = hw(z), cr = S.coroa;
    const g = gh(z), s = suave(g / 0.25), hB = b - yb;
    const hwE = w - 0.06 - tumble(z) * s, yE = b + g;
    const y0 = b + 0.022 * s, y1 = Math.max(y0, yE - 0.035 * s);
    const x0 = w - 0.065 - 0.02 * s, x1 = Math.min(x0, hwE + 0.014 * s);
    return [
      [0, yb, "x"], [w - 0.13, yb, "p"], [w - 0.03, yb + Math.min(0.05, hB * 0.1), "p"],
      [w + 0.006, yb + hB * 0.25, "p"], [w + 0.014, yb + hB * 0.55, "p"], [w + S.vinco, yb + hB * 0.8, "p"],
      [w - 0.004, yb + hB * 0.88, "p"], [w - 0.035, b, "b"], [x0, y0, "v0"], [x1, y1, "p"],
      [hwE, yE, "t"], [hwE - 0.09, yE + cr * 0.6, "t"], [hwE * 0.55, tp - cr * 0.1, "t"], [0, tp, null],
    ];
  }
  // x da superfície da lateral (região da porta) numa altura y
  const ladoX = (z) => hw(z) + 0.014;
  // z da frente / traseira numa distância x do centro (a curva da quina vista de cima)
  function pontaZ(x, frente) {
    x = Math.abs(x);
    const zEnd = frente ? S.zF : S.zR, z0 = frente ? S.fz0 : S.rz0;
    if (x <= hw(zEnd)) return zEnd;
    let a = z0, b = zEnd; // hw cai de W (em z0) até hw(zEnd)
    for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (hw(m) > x) a = m; else b = m; }
    return (a + b) / 2;
  }
  const hwPonta = (frente) => hw(frente ? S.zF : S.zR);
  const hwTeto = (z) => hw(z) - 0.06 - tumble(z) * suave(gh(z) / 0.25);
  return { topo, cinta, base, hw, gh, arco, secao, ladoX, pontaZ, hwPonta, hwTeto };
}

function lataria(S, F) {
  // estações ao longo do carro: espaçamento base + mais denso nas caixas de roda, nas pontas e nas bordas dos vidros
  const chaves = [S.zF, S.zR, ...S.chaves];
  for (const e of S.eixos) chaves.push(e - S.ra, e + S.ra, e - S.ra - 0.012, e + S.ra + 0.012);
  const zs = [...chaves];
  const add = (z) => { if (z > S.zR && z < S.zF && !zs.some((q) => Math.abs(q - z) < 0.025)) zs.push(z); };
  for (const e of S.eixos) for (let k = -3; k <= 3; k++) add(e + (S.ra * k) / 4);
  for (const d of [0.035, 0.08, 0.14, 0.22]) { add(S.zF - d); add(S.zR + d); }
  for (let z = S.zR; z < S.zF; z += S.passo) add(z);
  const est = [...new Set(zs.map((z) => +z.toFixed(4)))].filter((z) => z >= S.zR && z <= S.zF).sort((a, b) => a - b);
  const secs = est.map((z) => F.secao(z));
  const nL = secs[0].length; // pontos de um lado (o primeiro e o último ficam no centro)
  // anel completo: lado +x de baixo para cima, depois lado −x de cima para baixo (sem repetir os do centro)
  const anelIdx = []; for (let j = 0; j < nL; j++) anelIdx.push([j, 1]); for (let j = nL - 2; j >= 1; j--) anelIdx.push([j, -1]);
  const nA = anelIdx.length;
  const pos = [];
  est.forEach((z, k) => { for (const [j, sx] of anelIdx) { const p = secs[k][j]; pos.push(p[0] * sx, p[1], z); } });
  // tag de cada segmento do anel (de a até a+1)
  const tagSeg = (a) => secs[0][Math.min(anelIdx[a][0], anelIdx[(a + 1) % nA][0])][2]; // a tag é a do ponto de baixo
  const tri = [], matTri = [];
  for (let k = 0; k < est.length - 1; k++) {
    const zm = (est[k] + est[k + 1]) / 2, ghm = F.gh(zm);
    for (let a = 0; a < nA; a++) {
      const tag = tagSeg(a); if (tag === "x" || tag == null) continue;
      let mk = "pintura";
      if (tag === "b") mk = "escuro";
      else if (tag[0] === "v") mk = ghm < 0.06 ? "pintura" : S.lado(zm, +tag[1]);
      else if (tag === "t") mk = S.topoMat(zm);
      const i0 = k * nA + a, i1 = k * nA + ((a + 1) % nA), i2 = (k + 1) * nA + ((a + 1) % nA), i3 = (k + 1) * nA + a;
      tri.push([i0, i3, i2], [i0, i2, i1]); matTri.push(mk, mk);
    }
  }
  // confere o lado de fora (a face do teto aponta para cima)
  const P = (i) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  const kMeio = Math.floor(est.length / 2), aTeto = nL - 2;
  const [t0, t1, t2] = [kMeio * nA + aTeto, (kMeio + 1) * nA + aTeto + 1, kMeio * nA + aTeto + 1];
  void t1; void t2;
  const tt = tri.find((t) => t[0] === t0);
  const flip = new THREE.Vector3().crossVectors(P(tt[1]).sub(P(tt[0])), P(tt[2]).sub(P(tt[0]))).y < 0;
  const idx = []; for (const t of tri) idx.push(...(flip ? [t[0], t[2], t[1]] : t));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const N = geo.attributes.normal;
  const saida = {};
  for (let t = 0; t < tri.length; t++) {
    const mk = matTri[t]; (saida[mk] ??= { p: [], n: [] });
    for (let q = 0; q < 3; q++) { const i = idx[t * 3 + q]; saida[mk].p.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); saida[mk].n.push(N.getX(i), N.getY(i), N.getZ(i)); }
  }
  // tampas da frente e de trás (planas, em pé): leque a partir do meio da seção
  for (const [k, sz] of [[est.length - 1, 1], [0, -1]]) {
    const sec = secs[k], z = est[k];
    const anel = anelIdx.map(([j, sx]) => [sec[j][0] * sx, sec[j][1]]);
    const cy = (sec[0][1] + sec[nL - 1][1]) / 2;
    const o = (saida.pintura ??= { p: [], n: [] });
    for (let a = 0; a < nA; a++) {
      const p1 = anel[a], p2 = anel[(a + 1) % nA];
      const cross = (p1[0] - 0) * (p2[1] - cy) - (p1[1] - cy) * (p2[0] - 0);
      const ord = cross * sz > 0 ? [p1, p2] : [p2, p1];
      o.p.push(0, cy, z, ord[0][0], ord[0][1], z, ord[1][0], ord[1][1], z);
      for (let q = 0; q < 3; q++) o.n.push(0, 0, sz);
    }
  }
  const pecas = [];
  for (const [mk, d] of Object.entries(saida)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(d.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(d.n, 3));
    pecas.push(pecaJE(g, mk, mk === "pintura" ? S.cor : mk === "escuro" ? 0x141518 : 0xffffff));
  }
  return pecas;
}

// ---------------------------------------------------------------- peças da frente/traseira (recortes 2D que abraçam a quina)
// contorno: [[x, y], ...] (lado +x); frente: true/false; prof: espessura; afasta: distância da lataria
function recorte(F, contorno, { frente = true, prof = 0.008, afasta = 0.003, espelhar = true } = {}) {
  // reamostra as bordas (para dobrar certinho na quina)
  const pts = [];
  for (let i = 0; i < contorno.length; i++) {
    const a = contorno[i], b = contorno[(i + 1) % contorno.length], n = Math.max(1, (Math.max(Math.abs(a[0]), Math.abs(b[0])) < F.hwPonta(frente) - 0.02 ? 1 : Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.06)));
    for (let k = 0; k < n; k++) pts.push(new THREE.Vector2(lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)));
  }
  let geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: prof, bevelEnabled: false, curveSegments: 1 });
  if (geo.index) geo = geo.toNonIndexed();
  const P = geo.attributes.position, sz = frente ? 1 : -1;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), zl = P.getZ(i);
    const z = F.pontaZ(x, frente), dz = (F.pontaZ(x + 0.01, frente) - F.pontaZ(x - 0.01, frente)) / 0.02;
    // normal da curva vista de cima (para fora)
    let nx = -dz * sz, nz = 1; const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    const d = afasta + zl;
    P.setXYZ(i, x + nx * d, P.getY(i), z + nz * d * sz);
  }
  if (!frente) { // a extrusão virou para trás (espelhou em z): desvira os triângulos
    const A = geo.attributes.position;
    for (let t = 0; t < A.count; t += 3) for (let k = 0; k < 3; k++) { const a = A.getComponent(t + 1, k); A.setComponent(t + 1, k, A.getComponent(t + 2, k)); A.setComponent(t + 2, k, a); }
  }
  geo.deleteAttribute("normal"); geo.computeVertexNormals();
  return { geo, espelhar };
}
function addRecorte(g, F, contorno, mk, cor, op = {}) {
  const { geo } = recorte(F, contorno, op);
  const a = pecaJE(geo, mk, cor); g.add(a);
  if (op.espelhar !== false) { const b = pecaJE(geo.clone(), mk, cor); b.scale.x = -1; g.add(b); }
}
const caixaG = (w, h, d, r = 0.02) => geoCaixaRedonda(w, h, d, r, 1).clone();

// ---------------------------------------------------------------- rodas
const R_RODA = 0.36;
// estilo: "duplo5" (5 raios duplos), "raios6", "multi10"; acabamento: cor do aro
function roda(estilo, corAro, corLabio) {
  const g = new THREE.Group();
  const perfilPneu = [[0.258, -0.118], [0.33, -0.13], [0.362, -0.07], [0.362, 0.07], [0.33, 0.13], [0.258, 0.118]].map(([r, y]) => new THREE.Vector2(r, y));
  const pneu = new THREE.LatheGeometry(perfilPneu, 14); pneu.rotateZ(Math.PI / 2);
  g.add(pecaJE(pneu, "escuro", 0x16171a));
  // fundo escuro do aro (dá profundidade) e o disco de freio
  const fundo = new THREE.CircleGeometry(0.255, 12); fundo.rotateY(Math.PI / 2); fundo.translate(-0.05, 0, 0);
  g.add(pecaJE(fundo, "escuro", 0x232529));
  const disco = new THREE.RingGeometry(0.06, 0.19, 12); disco.rotateY(Math.PI / 2); disco.translate(0.0, 0, 0);
  g.add(pecaJE(disco, "metal", 0x7d838b));
  // lábio do aro (polido) e tambor
  const labio = new THREE.RingGeometry(0.228, 0.26, 16); labio.rotateY(Math.PI / 2); labio.translate(0.118, 0, 0);
  g.add(pecaJE(labio, "metal", corLabio));
  const tambor = new THREE.CylinderGeometry(0.236, 0.236, 0.17, 12, 1, true); tambor.rotateZ(Math.PI / 2); tambor.translate(0.03, 0, 0);
  g.add(pecaJE(tambor, "metal", 0x4a4e55));
  // raios
  const angs = estilo === "duplo5" ? [0, 1, 2, 3, 4].flatMap((i) => [i * 72 - 9, i * 72 + 9]) : estilo === "raios6" ? [0, 60, 120, 180, 240, 300] : Array.from({ length: 10 }, (_, i) => i * 36);
  const larg = estilo === "duplo5" ? 0.032 : estilo === "raios6" ? 0.06 : 0.026;
  for (const a of angs) {
    const r = new THREE.BoxGeometry(0.03, 0.19, larg); r.translate(0, 0.145, 0); r.rotateZ(0); // ao longo de y
    // leve concavidade: a ponta de fora mais para dentro
    const P = r.attributes.position; for (let i = 0; i < P.count; i++) P.setX(i, P.getX(i) + 0.105 - (P.getY(i) - 0.05) * 0.12);
    r.rotateX((a * Math.PI) / 180);
    g.add(pecaJE(r, "metal", corAro));
  }
  const cubo = new THREE.CylinderGeometry(0.065, 0.075, 0.05, 8); cubo.rotateZ(Math.PI / 2); cubo.translate(0.11, 0, 0);
  g.add(pecaJE(cubo, "metal", corAro));
  const tampa = new THREE.CircleGeometry(0.035, 10); tampa.rotateY(Math.PI / 2); tampa.translate(0.137, 0, 0);
  g.add(pecaJE(tampa, "escuro", 0x1b1c1f));
  return g;
}

// ---------------------------------------------------------------- modelos
// cotas: z para a frente, y para cima, x para a esquerda do motorista (+x = lado do motorista)
const BASE_MODELO = { vinco: 0.018, coroa: 0.045, tumble: 0.22, tumbleTras: 0.04, tz: -0.9, passo: 0.16, rodaR: R_RODA, ra: 0.385, fExp: 2, rExp: 2, trilha: 0.835 };
export const MODELOS_JE = {
  "hatch-g5": {
    nome: "Hatch rebaixado", zF: 2.3, zR: -2.28, larg: 1.97, eixos: [1.4, -1.5], fz0: 1.82, fRed: 0.17, rz0: -1.92, rRed: 0.1,
    topo: [[2.3, 0.8], [2.25, 0.84], [2.12, 0.878], [1.7, 0.925], [1.25, 0.965], [0.98, 1.0], [0.22, 1.64], [0.1, 1.672], [-0.4, 1.695], [-1.0, 1.685], [-1.38, 1.665], [-1.48, 1.645], [-2.18, 1.1], [-2.25, 1.075], [-2.28, 1.045]],
    cinta: [[2.3, 0.72], [2.2, 0.785], [1.95, 0.835], [1.2, 0.915], [0.94, 0.955], [0.0, 0.985], [-1.0, 1.012], [-1.6, 1.03], [-2.0, 1.03], [-2.2, 1.0], [-2.28, 0.97]],
    base: [[2.3, 0.25], [2.22, 0.17], [2.0, 0.165], [1.0, 0.19], [-1.0, 0.19], [-2.0, 0.2], [-2.18, 0.22], [-2.28, 0.28]],
    chaves: [0.26, 0.97, -1.5, -2.17, -0.17, -0.05, 0.76, -1.24],
    topoMat: (z) => ((z > 0.26 && z < 0.97) || (z < -1.5 && z > -2.17) ? "vidro" : "pintura"),
    lado: (z, r) => (z > -0.17 && z < -0.05 ? "escuro" : z > 0.76 && r < 2 ? "escuro" : z < -1.24 ? "pintura" : "vidro"),
    assento: [0.42, 0.44, 0.04], banco: 0x26282d, costura: 0x9c1c22, aro: ["duplo5", 0xcfd3d8, 0xe9ecef],
    detalhes: detalhesG5,
  },
  seda: {
    nome: "Sedã rebaixado", sedan: true, zF: 2.42, zR: -2.5, larg: 1.98, eixos: [1.47, -1.55], fz0: 1.95, fRed: 0.17, rz0: -2.1, rRed: 0.1,
    topo: [[2.42, 0.8], [2.36, 0.84], [2.22, 0.878], [1.8, 0.925], [1.25, 0.97], [0.98, 1.0], [0.12, 1.64], [0.0, 1.67], [-0.45, 1.69], [-0.95, 1.675], [-1.1, 1.645], [-1.75, 1.16], [-1.88, 1.12], [-2.3, 1.105], [-2.44, 1.07], [-2.5, 1.0]],
    cinta: [[2.42, 0.72], [2.32, 0.785], [2.05, 0.835], [1.25, 0.915], [0.98, 0.955], [0.0, 0.985], [-1.0, 1.015], [-1.8, 1.045], [-2.3, 1.05], [-2.45, 1.02], [-2.5, 0.96]],
    base: [[2.42, 0.25], [2.34, 0.17], [2.1, 0.165], [1.0, 0.19], [-1.0, 0.19], [-2.2, 0.2], [-2.4, 0.23], [-2.5, 0.3]],
    chaves: [0.14, 0.96, -1.13, -1.72, -0.17, -0.05, 0.74, -0.96],
    topoMat: (z) => ((z > 0.14 && z < 0.96) || (z < -1.13 && z > -1.72) ? "vidro" : "pintura"),
    lado: (z, r) => (z > -0.17 && z < -0.05 ? "escuro" : z > 0.74 && r < 2 ? "escuro" : z < -0.96 ? "pintura" : "vidro"),
    assento: [0.42, 0.44, 0.04], banco: 0x2a2c31, costura: 0x3b6fb6, aro: ["raios6", 0x2c2f35, 0xd8dce1],
    detalhes: (g, S, F) => detalhesComuns(g, S, F, { farol: "g5", lanterna: "horizontal", grade: "fina", aerofolio: "tampa" }),
  },
  celta: {
    nome: "Hatch pequeno", zF: 2.16, zR: -2.14, larg: 1.92, eixos: [1.3, -1.33], fz0: 1.6, fRed: 0.2, rz0: -1.75, rRed: 0.12, tumble: 0.24,
    topo: [[2.16, 0.78], [2.1, 0.83], [1.95, 0.87], [1.45, 0.93], [0.96, 0.985], [0.5, 1.4], [0.18, 1.62], [0.0, 1.66], [-0.4, 1.68], [-0.9, 1.665], [-1.15, 1.63], [-1.79, 1.12], [-1.95, 1.07], [-2.08, 1.04], [-2.14, 1.0]],
    cinta: [[2.16, 0.7], [2.06, 0.775], [1.85, 0.825], [1.2, 0.905], [0.96, 0.945], [0.0, 0.975], [-1.0, 1.005], [-1.6, 1.03], [-1.95, 1.03], [-2.14, 0.97]],
    base: [[2.16, 0.25], [2.08, 0.18], [1.9, 0.17], [1.0, 0.19], [-1.0, 0.19], [-1.9, 0.2], [-2.05, 0.22], [-2.14, 0.28]],
    chaves: [0.2, 0.93, -1.18, -1.77, -0.2, -0.08, 0.7, -0.98],
    topoMat: (z) => ((z > 0.2 && z < 0.93) || (z < -1.18 && z > -1.77) ? "vidro" : "pintura"),
    lado: (z, r) => (z > -0.2 && z < -0.08 ? "escuro" : z > 0.7 && r < 2 ? "escuro" : z < -0.98 ? "pintura" : "vidro"),
    assento: [0.41, 0.43, 0.0], banco: 0x2b2d32, costura: 0xd8a21c, aro: ["multi10", 0xc9cdd3, 0xe9ecef],
    detalhes: (g, S, F) => detalhesComuns(g, S, F, { farol: "gota", lanterna: "vertical", grade: "fina", aerofolio: "teto" }),
  },
  quadrado: {
    nome: "Hatch quadradinho", zF: 2.06, zR: -2.06, larg: 1.9, eixos: [1.25, -1.3], fz0: 1.78, fRed: 0.1, fExp: 3, rz0: -1.86, rRed: 0.06, rExp: 3, tumble: 0.15, tumbleTras: 0.02, coroa: 0.03,
    topo: [[2.06, 0.85], [2.0, 0.875], [1.8, 0.895], [1.15, 0.93], [0.93, 0.975], [0.36, 1.69], [0.25, 1.715], [-0.6, 1.725], [-1.5, 1.715], [-1.6, 1.69], [-1.82, 1.2], [-1.95, 1.15], [-2.06, 1.12]],
    cinta: [[2.06, 0.8], [1.96, 0.84], [1.75, 0.86], [1.15, 0.905], [0.93, 0.94], [0.0, 0.955], [-1.0, 0.965], [-1.8, 0.98], [-2.06, 0.96]],
    base: [[2.06, 0.26], [2.0, 0.19], [1.85, 0.18], [1.0, 0.2], [-1.0, 0.2], [-1.85, 0.2], [-1.98, 0.22], [-2.06, 0.28]],
    chaves: [0.38, 0.91, -1.6, -1.8, -0.3, -0.18, 0.66, -1.4],
    topoMat: (z) => ((z > 0.38 && z < 0.91) || (z < -1.6 && z > -1.8) ? "vidro" : "pintura"),
    lado: (z, r) => (z > -0.3 && z < -0.18 ? "escuro" : z > 0.66 && r < 2 ? "escuro" : z < -1.4 ? "pintura" : "vidro"),
    assento: [0.41, 0.48, -0.1], banco: 0x2a2b30, costura: 0xc9c9c9, aro: ["raios6", 0xd2d6db, 0xd2d6db],
    detalhes: (g, S, F) => detalhesComuns(g, S, F, { farol: "quadrado", lanterna: "alta", grade: "dupla", aerofolio: "teto" }),
  },
  medio: {
    nome: "Hatch médio", zF: 2.38, zR: -2.3, larg: 2.0, eixos: [1.45, -1.5], fz0: 1.85, fRed: 0.2, rz0: -1.85, rRed: 0.13, tumble: 0.25, tumbleTras: 0.06,
    topo: [[2.38, 0.76], [2.31, 0.815], [2.15, 0.86], [1.6, 0.92], [1.05, 0.985], [0.0, 1.6], [-0.15, 1.635], [-0.55, 1.65], [-1.05, 1.635], [-1.27, 1.6], [-1.95, 1.17], [-2.1, 1.13], [-2.25, 1.09], [-2.3, 1.03]],
    cinta: [[2.38, 0.7], [2.28, 0.77], [2.0, 0.83], [1.3, 0.91], [1.05, 0.95], [0.0, 0.985], [-1.0, 1.03], [-1.6, 1.07], [-1.95, 1.08], [-2.2, 1.06], [-2.3, 1.0]],
    base: [[2.38, 0.24], [2.3, 0.165], [2.05, 0.16], [1.0, 0.19], [-1.0, 0.19], [-2.0, 0.2], [-2.2, 0.22], [-2.3, 0.28]],
    chaves: [0.03, 1.02, -1.3, -1.92, -0.32, -0.2, 0.75, -1.1],
    topoMat: (z) => ((z > 0.03 && z < 1.02) || (z < -1.3 && z > -1.92) ? "vidro" : "pintura"),
    lado: (z, r) => (z > -0.32 && z < -0.2 ? "escuro" : z > 0.75 && r < 2 ? "escuro" : z < -1.1 ? "pintura" : "vidro"),
    assento: [0.42, 0.42, -0.12], banco: 0x25272c, costura: 0xb52a2a, aro: ["duplo5", 0x2a2d33, 0xbfc4ca],
    detalhes: (g, S, F) => detalhesComuns(g, S, F, { farol: "esticado", lanterna: "horizontal", grade: "hexagonal", aerofolio: "teto" }),
  },
};

// ---------------------------------------------------------------- detalhes
function detalhesG5(g, S, F) { detalhesComuns(g, S, F, { farol: "g5", lanterna: "g5", grade: "fina", aerofolio: "teto" }); }

const FAROIS = {
  // G5: alongado na horizontal, mais alto na ponta de fora, dobrando a quina
  g5: { casco: [[0.3, 0.665], [0.6, 0.655], [0.8, 0.648], [0.88, 0.665], [0.895, 0.72], [0.84, 0.765], [0.55, 0.785], [0.3, 0.75]], lentes: [[0.45, 0.718, 0.042], [0.63, 0.714, 0.048]], seta: [[0.76, 0.672], [0.86, 0.68], [0.875, 0.73], [0.77, 0.735]] },
  gota: { casco: [[0.32, 0.67], [0.6, 0.64], [0.84, 0.66], [0.93, 0.74], [0.82, 0.8], [0.5, 0.79], [0.32, 0.74]], lentes: [[0.5, 0.72, 0.055], [0.72, 0.72, 0.05]], seta: [[0.84, 0.67], [0.92, 0.72], [0.88, 0.76], [0.82, 0.72]] },
  quadrado: { casco: [[0.4, 0.66], [0.86, 0.66], [0.9, 0.7], [0.9, 0.82], [0.4, 0.82]], lentes: [[0.55, 0.74, 0.055], [0.73, 0.74, 0.055]], seta: [[0.84, 0.67], [0.89, 0.67], [0.89, 0.81], [0.84, 0.81]] },
  esticado: { casco: [[0.36, 0.66], [0.7, 0.63], [0.9, 0.64], [0.97, 0.7], [0.92, 0.74], [0.6, 0.77], [0.36, 0.74]], lentes: [[0.52, 0.705, 0.045], [0.7, 0.69, 0.045]], seta: [[0.86, 0.645], [0.95, 0.68], [0.93, 0.7], [0.85, 0.67]] },
};
const LANTERNAS = {
  g5: { forma: [[0.56, 0.96], [0.8, 0.965], [0.87, 0.93], [0.875, 0.64], [0.72, 0.64]], meio: [[0.73, 0.77], [0.865, 0.77], [0.865, 0.8], [0.715, 0.8]] },
  vertical: { forma: [[0.6, 0.95], [0.8, 0.95], [0.87, 0.92], [0.88, 0.7], [0.7, 0.7]], meio: [[0.71, 0.8], [0.87, 0.8], [0.87, 0.85], [0.69, 0.85]] },
  alta: { forma: [[0.66, 0.93], [0.84, 0.93], [0.86, 0.9], [0.86, 0.55], [0.66, 0.55]], meio: [[0.67, 0.7], [0.85, 0.7], [0.85, 0.78], [0.67, 0.78]] },
  horizontal: { forma: [[0.42, 0.93], [0.8, 0.93], [0.89, 0.89], [0.9, 0.79], [0.5, 0.8]], meio: [[0.6, 0.84], [0.86, 0.84], [0.86, 0.87], [0.6, 0.87]] },
};
function detalhesComuns(g, S, F, op) {
  const cor = S.cor, zF = S.zF, zR = S.zR;
  const ESC = 0x141518, BORR = 0x1c1d20, CROMO = 0xdfe3e8;
  // ---- frente: faróis, grade, para-choque com entrada de ar, placa, milhas e o "lábio" de rebaixado
  const fa = FAROIS[op.farol];
  const cx = fa.casco.reduce((a, p) => a + p[0], 0) / fa.casco.length, cy = fa.casco.reduce((a, p) => a + p[1], 0) / fa.casco.length;
  addRecorte(g, F, fa.casco, "escuro", 0x0b0c0e, { prof: 0.01 });
  addRecorte(g, F, fa.casco.map(([x, y]) => [cx + (x - cx) * 0.93, cy + (y - cy) * 0.8]), "metal", 0xc9ced5, { afasta: 0.014 });
  for (const [x, y, r] of fa.lentes) {
    const c = []; for (let i = 0; i < 10; i++) c.push([x + Math.cos((i / 10) * Math.PI * 2) * r, y + Math.sin((i / 10) * Math.PI * 2) * r]);
    addRecorte(g, F, c, "escuro", 0x2a2d32, { afasta: 0.024, prof: 0.004 });
    addRecorte(g, F, c.map(([px, py]) => [x + (px - x) * 0.45, y + (py - y) * 0.45]), "luz", 0xfff8ea, { prof: 0.004, afasta: 0.03 });
  }
  addRecorte(g, F, fa.seta, "luz", 0xe89a3c, { prof: 0.005, afasta: 0.024 });
  if (op.grade === "fina") {
    addRecorte(g, F, [[-0.3, 0.68], [0.3, 0.68], [0.3, 0.745], [-0.3, 0.745]], "escuro", 0x0c0d0f, { espelhar: false, afasta: 0.003 });
    addRecorte(g, F, [[-0.29, 0.749], [0.29, 0.749], [0.29, 0.758], [-0.29, 0.758]], "metal", CROMO, { espelhar: false, afasta: 0.008, prof: 0.008 });
  } else if (op.grade === "dupla") {
    for (const y of [0.69, 0.75]) addRecorte(g, F, [[-0.4, y], [0.4, y], [0.4, y + 0.04], [-0.4, y + 0.04]], "escuro", 0x0c0d0f, { espelhar: false, afasta: 0.003 });
  } else { // hexagonal grande (estilo hatch médio)
    addRecorte(g, F, [[-0.34, 0.7], [0.34, 0.7], [0.4, 0.62], [0.36, 0.5], [-0.36, 0.5], [-0.4, 0.62]], "escuro", 0x0c0d0f, { espelhar: false, afasta: 0.003 });
    for (const y of [0.56, 0.62]) addRecorte(g, F, [[-0.36, y], [0.36, y], [0.36, y + 0.012], [-0.36, y + 0.012]], "metal", 0x3b3f45, { espelhar: false, afasta: 0.01, prof: 0.006 });
  }
  // linha do para-choque e entrada de ar inferior (trapézio) com aletas
  const yPc = op.grade === "hexagonal" ? 0.47 : 0.6;
  addRecorte(g, F, [[-0.84, yPc], [0.84, yPc], [0.84, yPc + 0.008], [-0.84, yPc + 0.008]], "escuro", 0x0a0a0c, { espelhar: false, afasta: 0.002, prof: 0.006 });
  addRecorte(g, F, [[-0.62, 0.25], [0.62, 0.25], [0.55, 0.43], [-0.55, 0.43]], "escuro", 0x0c0d0f, { espelhar: false, afasta: 0.003 });
  for (const y of [0.3, 0.36]) addRecorte(g, F, [[-0.58, y], [0.58, y], [0.57, y + 0.015], [-0.57, y + 0.015]], "escuro", 0x2a2c30, { espelhar: false, afasta: 0.013, prof: 0.006 });
  // milhas (faróis de neblina) nos cantos
  addRecorte(g, F, [[0.64, 0.27], [0.8, 0.27], [0.82, 0.38], [0.66, 0.38]], "escuro", 0x0c0d0f, { afasta: 0.003 });
  { const c = []; for (let i = 0; i < 10; i++) c.push([0.73 + Math.cos((i / 10) * Math.PI * 2) * 0.04, 0.325 + Math.sin((i / 10) * Math.PI * 2) * 0.04]); addRecorte(g, F, c, "luz", 0xf5f2e6, { afasta: 0.012, prof: 0.008 }); }
  // placa da frente (Mercosul: branca com a faixa azul, sem letras)
  const yPl = op.grade === "hexagonal" ? 0.36 : 0.47;
  addRecorte(g, F, [[-0.21, yPl], [0.21, yPl], [0.21, yPl + 0.11], [-0.21, yPl + 0.11]], "escuro", 0xf4f4f4, { espelhar: false, afasta: 0.016, prof: 0.008 });
  addRecorte(g, F, [[-0.21, yPl + 0.09], [0.21, yPl + 0.09], [0.21, yPl + 0.11], [-0.21, yPl + 0.11]], "escuro", 0x1f4fb5, { espelhar: false, afasta: 0.025, prof: 0.004 });
  // lábio / spoiler dianteiro de rebaixado

  // ---- traseira: lanternas, placa, para-choque, difusor e ponteira
  const la = LANTERNAS[op.lanterna];
  addRecorte(g, F, la.forma, "luz", 0x9e0d14, { frente: false, prof: 0.016 });
  addRecorte(g, F, la.forma.map(([x, y]) => [x + (x < 0.8 ? 0.015 : -0.012), y + (y > 0.9 ? -0.015 : 0.015)]), "luz", 0xd01822, { frente: false, prof: 0.006, afasta: 0.02 });
  addRecorte(g, F, la.meio, "luz", 0xd9c9c9, { frente: false, prof: 0.006, afasta: 0.027 });
  // placa traseira no meio da tampa, num rebaixo escuro
  addRecorte(g, F, [[-0.26, 0.57], [0.26, 0.57], [0.26, 0.76], [-0.26, 0.76]], "escuro", 0x101113, { frente: false, espelhar: false, afasta: 0.002 });
  addRecorte(g, F, [[-0.21, 0.6], [0.21, 0.6], [0.21, 0.73], [-0.21, 0.73]], "escuro", 0xf4f4f4, { frente: false, espelhar: false, afasta: 0.012, prof: 0.006 });
  addRecorte(g, F, [[-0.21, 0.71], [0.21, 0.71], [0.21, 0.73], [-0.21, 0.73]], "escuro", 0x1f4fb5, { frente: false, espelhar: false, afasta: 0.019, prof: 0.004 });
  addRecorte(g, F, [[-0.24, 0.79], [0.24, 0.79], [0.24, 0.805], [-0.24, 0.805]], "metal", CROMO, { frente: false, espelhar: false, afasta: 0.006, prof: 0.006 });
  addRecorte(g, F, [[-0.86, 0.5], [0.86, 0.5], [0.86, 0.508], [-0.86, 0.508]], "escuro", 0x0a0a0c, { frente: false, espelhar: false, afasta: 0.002, prof: 0.006 });
  addRecorte(g, F, [[-0.7, 0.24], [0.7, 0.24], [0.64, 0.33], [-0.64, 0.33]], "escuro", 0x111214, { frente: false, espelhar: false, afasta: 0.004 });
  { const p = new THREE.CylinderGeometry(0.045, 0.05, 0.16, 12, 1, true); p.rotateX(Math.PI / 2); p.translate(-0.55, 0.23, zR + 0.02); g.add(pecaJE(p, "metal", CROMO)); }
  // ---- aerofólio: no teto (hatch) ou na tampa do porta-malas (sedã)
  if (op.aerofolio === "teto") {
    const z0 = S.chaves[2] ?? -1.4; // começo do vidro traseiro
    const yA = F.topo(z0 + 0.04);
    const asa = new THREE.Shape([new THREE.Vector2(0.06, 0.0), new THREE.Vector2(-0.13, -0.05), new THREE.Vector2(-0.15, -0.075), new THREE.Vector2(0.06, -0.03)]);
    const la = F.hwTeto(z0) * 2 - 0.16;
    const ge = new THREE.ExtrudeGeometry(asa, { depth: la, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
    // perfil em x (comprimento, para trás = −x) e y; a largura é a extrusão (z): gira para o comprimento ficar em z
    ge.translate(0, 0, -la / 2); ge.rotateY(-Math.PI / 2); ge.translate(0, yA - 0.012, z0 + 0.02);
    g.add(pecaJE(ge, "pintura", cor));
  } else if (op.aerofolio === "tampa") {
    const z0 = S.zR + 0.12, y = F.topo(z0);
    const ge = new THREE.BoxGeometry(F.hw(z0) * 2 - 0.3, 0.035, 0.12); ge.translate(0, y + 0.025, z0);
    g.add(pecaJE(ge, "pintura", cor));
  }

  // ---- laterais: retrovisores, maçanetas, frisos das portas, caixas de roda
  const zVidro = S.chaves[1]; // pé do para-brisa
  for (const s of [-1, 1]) {
    // retrovisor (casco na cor do carro, base preta)
    const zr = zVidro - 0.12, yr = F.cinta(zr) + 0.1, xr = (F.hw(zr) - 0.02) * s;
    const base = new THREE.BoxGeometry(0.06, 0.07, 0.14); base.translate(xr, yr - 0.04, zr); g.add(pecaJE(base, "escuro", ESC));
    const casco = caixaG(0.21, 0.12, 0.1, 0.04); casco.translate(xr + s * 0.13, yr + 0.02, zr - 0.01); g.add(pecaJE(casco, "pintura", cor));
    const esp = new THREE.PlaneGeometry(0.17, 0.08); esp.rotateY(Math.PI); esp.translate(xr + s * 0.13, yr + 0.02, zr - 0.062); g.add(pecaJE(esp, "metal", 0x8892a0));
    // maçanetas (2 por lado) e frisos das portas
    for (const zm of [0.2, -0.88].map((z) => z + (S.zF - 2.3) * 0.3)) {
      const ym = F.cinta(zm) - 0.1;
      const m = new THREE.BoxGeometry(0.03, 0.03, 0.17); m.translate((F.ladoX(zm) + 0.006) * s, ym, zm); g.add(pecaJE(m, "metal", 0xaeb4bb));
    }
    const zB = (S.chaves[4] + S.chaves[5]) / 2;
    for (const zf of [S.eixos[0] - S.ra - 0.02, zB, S.chaves[7] - 0.06]) {
      const y0 = Math.max(F.base(zf), F.arco(zf)) + 0.05, y1 = F.cinta(zf) - 0.02;
      const f = new THREE.BoxGeometry(0.006, y1 - y0, 0.01); f.translate((F.ladoX(zf) + 0.003) * s, (y0 + y1) / 2, zf); g.add(pecaJE(f, "escuro", 0x08090a));
    }
    // caixas de roda (forro preto)
    for (const ez of S.eixos) {
      const c = new THREE.CylinderGeometry(S.ra - 0.004, S.ra - 0.004, 0.42, 14, 1, true, 0, Math.PI); c.rotateZ(Math.PI / 2); c.translate((S.larg / 2 - 0.23) * s, S.rodaR, ez);
      g.add(pecaJE(c, "escuro", 0x0d0e10));
      // pinça de freio vermelha (esportivo)
      const p = new THREE.BoxGeometry(0.05, 0.09, 0.14); p.translate(S.trilha * s + 0.02 * s, S.rodaR + 0.13, ez - 0.07); g.add(pecaJE(p, "pintura", 0xc8141c));
    }
  }
  // ---- limpadores, antena
  { const zl = zVidro - 0.06, yl = F.topo(zl) + 0.02;
    for (const x of [0.35, -0.2]) { const l = new THREE.BoxGeometry(0.62, 0.015, 0.02); l.rotateY(x > 0 ? 0.12 : 0.08); l.translate(x, yl, zl); g.add(pecaJE(l, "escuro", ESC)); }
    const zt = S.chaves[3] + 0.12, yt = F.topo(zt) + 0.02; const lt = new THREE.BoxGeometry(0.34, 0.015, 0.02); lt.rotateZ(0.3); lt.translate(0.06, yt, zt); g.add(pecaJE(lt, "escuro", ESC)); }
  { const za = S.chaves[0] + 0.12, ya = F.topo(za);
    const b = new THREE.CylinderGeometry(0.02, 0.03, 0.04, 8); b.translate(0, ya + 0.015, za); g.add(pecaJE(b, "escuro", ESC));
    const h = new THREE.CylinderGeometry(0.005, 0.008, 0.32, 5); h.translate(0, 0.16, 0); h.rotateX(-0.75); h.translate(0, ya + 0.03, za); g.add(pecaJE(h, "escuro", ESC)); }
}

// ---------------------------------------------------------------- interior (visível pelos vidros)
function interior(g, S, F) {
  const [sx, sy, sz] = S.assento, E = 0x1a1b1f;
  const zV = S.chaves[1], zT = S.zR + 0.35, yP = 0.22, yC = F.cinta(0) - 0.02, w = S.larg / 2 - 0.1;
  // "banheira" (piso e laterais por dentro), sem tampa
  const piso = new THREE.PlaneGeometry(w * 2, zV - zT); piso.rotateX(-Math.PI / 2); piso.translate(0, yP, (zV + zT) / 2); g.add(pecaJE(piso, "escuro", E));
  for (const s of [-1, 1]) { const p = new THREE.PlaneGeometry(zV - zT, yC - yP); p.rotateY(Math.PI / 2); p.translate(w * s, (yC + yP) / 2, (zV + zT) / 2); g.add(pecaJE(p, "escuro", 0x232429)); }
  const fundo = new THREE.PlaneGeometry(w * 2, F.cinta(zT) - yP); fundo.translate(0, (F.cinta(zT) + yP) / 2, zT); g.add(pecaJE(fundo, "escuro", E));
  // painel com o "quadro" de instrumentos do lado do motorista
  const pn = new THREE.BoxGeometry(w * 2 - 0.04, 0.2, 0.4); pn.translate(0, F.cinta(zV - 0.25) - 0.04, zV - 0.25); g.add(pecaJE(pn, "escuro", 0x202227));
  const qd = new THREE.BoxGeometry(0.36, 0.1, 0.16); qd.translate(sx, F.cinta(zV - 0.25) + 0.06, zV - 0.38); g.add(pecaJE(qd, "escuro", 0x16171a));
  // bancos dianteiros (concha esportiva com faixa colorida) e o banco de trás
  for (const x of [sx, -sx]) {
    const a = new THREE.BoxGeometry(0.48, 0.12, 0.5); a.translate(x, sy - 0.06, sz + 0.05); g.add(pecaJE(a, "escuro", S.banco));
    const e = new THREE.BoxGeometry(0.48, 0.66, 0.13); e.translate(0, 0.33, 0); e.rotateX(-0.2); e.translate(x, sy - 0.02, sz - 0.27); g.add(pecaJE(e, "escuro", S.banco));
    const f = new THREE.BoxGeometry(0.12, 0.6, 0.135); f.translate(0, 0.33, 0); f.rotateX(-0.2); f.translate(x, sy - 0.02, sz - 0.268); g.add(pecaJE(f, "escuro", S.costura));
  }
  const zb = Math.max(zT + 0.3, sz - 0.95);
  const bt = new THREE.BoxGeometry(w * 2 - 0.15, 0.12, 0.45); bt.translate(0, sy - 0.05, zb); g.add(pecaJE(bt, "escuro", S.banco));
  const ct = new THREE.BoxGeometry(w * 2 - 0.15, 0.55, 0.12); ct.translate(0, sy + 0.25, zb - 0.24); g.add(pecaJE(ct, "escuro", S.banco));
}

// ---------------------------------------------------------------- o carro
export const ID_JE = Object.keys(MODELOS_JE);
export function carroJE(id = "hatch-g5", cor = 0x0b0c0e, { parado = false } = {}) {
  materiaisJE();
  const S = { ...BASE_MODELO, ...MODELOS_JE[id], cor };
  const F = montarForma(S);
  const g = new THREE.Group();
  for (const p of lataria(S, F)) g.add(p);
  S.detalhes(g, S, F);
  interior(g, S, F);
  // sombrinha de contato no chão (o carro rebaixado "senta" no asfalto)
  { const s = new THREE.PlaneGeometry(S.larg + 0.35, S.zF - S.zR + 0.4); s.rotateX(-Math.PI / 2); s.translate(0, 0.012, (S.zF + S.zR) / 2); g.add(pecaJE(s, "sombra")); }
  // rodas
  const rodas = [];
  for (const ez of S.eixos) for (const s of [1, -1]) {
    const r = new THREE.Group(); r.position.set(S.trilha * s, S.rodaR, ez);
    const dentro = roda(S.aro[0], S.aro[1], S.aro[2]); if (s < 0) dentro.rotation.y = Math.PI; r.add(dentro);
    g.add(r); rodas.push(r);
  }
  const [ax, ay, az] = S.assento;
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
  const vt = new THREE.TorusGeometry(0.24, 0.032, 8, 20);
  const volante = pecaJE(vt, "escuro", 0x111214); volante.position.set(ax, ay + 0.3, az + 0.45); volante.rotation.x = -1.0; volante.userData.dinamico = true; g.add(volante);
  const seta = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); seta.rotation.x = Math.PI; seta.position.y = 3.0; seta.userData.dinamico = true; g.add(seta);
  const nPecas = g.children.length;
  Object.assign(g.userData, { modelo: id, rodas, seta, volante, motorista, carona, vidro, nPecas, raioRoda: R_RODA, fazerParado: () => carroJE(id, cor, { parado: true }) });
  return g;
}
