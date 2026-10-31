// Rabiscolândia: peças 3D de base. Parte delas foi COPIADA de jogos/cidade-do-rabisco/cidade.js (que é de outro
// jogo e não deve ser editado daqui): placa, densificar, normais, fita, arvoreReal, semaforo e lojaParceira.
// Cada cópia diz de onde veio e o que mudou. O resto (caixa arredondada, materiais toon com contorno e a
// mesclagem de malhas estáticas por material, que corta as chamadas de desenho) é novo.

import { THREE, texturaCanvas, toon, comContorno, aleatorio } from "../../src/motor3d/toon.js";
import { ESTILO_PARCEIRO } from "../../src/parceiros.js";
import { LOJA_MAX } from "./mapa.js";

export const r = aleatorio(2027);
export { THREE, toon, comContorno, texturaCanvas };

// ---------- materiais (toon: tons chapados como desenho animado; o Rabisco e os moradores no mesmo traço)
const cacheStd = new Map();
// "mat" toon compartilhado por cor (a mesclagem junta tudo que usa o mesmo material numa malha só)
export const mat = (cor, extra = {}) => toon(cor, extra);
// material de vidro das janelas: de noite acende (ceu.js liga emissiveIntensity)
export const MAT = {
  janela: new THREE.MeshToonMaterial({ color: 0x9fd8ff, emissive: 0xffd27a, emissiveIntensity: 0 }),
  janelaQuente: new THREE.MeshToonMaterial({ color: 0xbfe6ff, emissive: 0xffb84d, emissiveIntensity: 0 }),
  lampada: new THREE.MeshToonMaterial({ color: 0xfff6d8, emissive: 0xffe39a, emissiveIntensity: 0.15 }),
};
for (const m of Object.values(MAT)) m.userData.noite = true;
export const std = (cor, extra = {}) => {
  const k = `${cor}|${JSON.stringify(extra)}`;
  if (!cacheStd.has(k) || extra.map) cacheStd.set(k, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85, metalness: 0, ...extra }));
  return cacheStd.get(k);
};

// malha com sombra; contorno opcional (casca invertida preta, igual ao Rabisco)
export function malha(geo, material, { contorno = 0, sombra = true } = {}) {
  const m = new THREE.Mesh(window.__blocos?.geo?.(geo) ?? geo, material); // ?estilo=blocos (proto-blocos.js): peças de caixa
  m.castShadow = sombra; m.receiveShadow = true;
  if (contorno && !window.__blocos) comContorno(m, contorno);
  return m;
}
// caixa de cantos arredondados (fofinha, sem quina dura): w × h × d com raio r nas bordas
const geoRedondas = new Map();
export function geoCaixaRedonda(w, h, d, raio = 0.2, seg = 2) {
  if (window.__blocos?.caixaReta) return window.__blocos.caixaReta(w, h, d);
  const k = [w, h, d, raio, seg].map((v) => +v.toFixed(3)).join("|");
  if (geoRedondas.has(k)) return geoRedondas.get(k);
  const rr = Math.min(raio, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
  const ww = w / 2 - rr, hh = h / 2 - rr, c = Math.min(rr, ww, hh) * 0.6;
  const f = new THREE.Shape();
  f.moveTo(-ww + c, -hh); f.lineTo(ww - c, -hh); f.quadraticCurveTo(ww, -hh, ww, -hh + c);
  f.lineTo(ww, hh - c); f.quadraticCurveTo(ww, hh, ww - c, hh); f.lineTo(-ww + c, hh);
  f.quadraticCurveTo(-ww, hh, -ww, hh - c); f.lineTo(-ww, -hh + c); f.quadraticCurveTo(-ww, -hh, -ww + c, -hh);
  const geo = new THREE.ExtrudeGeometry(f, { depth: Math.max(0.01, d - 2 * rr), bevelEnabled: true, bevelThickness: rr, bevelSize: rr, bevelSegments: seg, curveSegments: 3 });
  geo.center();
  geo.userData.compartilhada = true;
  geoRedondas.set(k, geo);
  return geo;
}
export const caixaRedonda = (w, h, d, material, { raio = 0.2, contorno = 0, sombra = true } = {}) => malha(geoCaixaRedonda(w, h, d, raio), material, { contorno, sombra });
export const caixa = (w, h, d, material, { contorno = 0, sombra = true } = {}) => malha(new THREE.BoxGeometry(w, h, d), material, { contorno, sombra });

// ---------- texturas
const ruido = (c, w, h, n, cores) => { for (let i = 0; i < n; i++) { c.fillStyle = cores[i % cores.length]; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } };
export const TEX = {
  asfalto: texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#5b6170"; c.fillRect(0, 0, w, h);
    ruido(c, w, h, 2600, ["#535969", "#646a7a", "#59606f"]);
  }, { repetir: true }),
  // calçada: u = 0 na beira da rua (meio-fio claro com sombrinha) e lajotas no resto
  calcada: texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#efe4d0"; c.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) {
      const v = 228 + Math.floor(Math.random() * 18);
      c.fillStyle = `rgb(${v},${v - 10},${v - 26})`; c.fillRect(34 + x * 74 + 3, y * 64 + 3, 68, 58);
    }
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, 26, h);
    c.fillStyle = "rgba(0,0,0,0.18)"; c.fillRect(26, 0, 6, h);
  }, { repetir: true }),
  grama: texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#7ccf52"; c.fillRect(0, 0, w, h);
    ruido(c, w, h, 2500, ["#72c44a", "#86d75c", "#6fbf45"]);
    // tufinhos desenhados
    c.strokeStyle = "rgba(60,140,40,0.55)"; c.lineWidth = 2;
    for (let i = 0; i < 40; i++) { const x = Math.random() * w, y = Math.random() * h; c.beginPath(); c.moveTo(x - 3, y + 4); c.lineTo(x, y - 3); c.lineTo(x + 3, y + 4); c.stroke(); }
  }, { repetir: true }),
  linha: texturaCanvas(32, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = "#ffffff"; for (let y = 0; y < h; y += 64) c.fillRect(0, y, w, 34); }, { repetir: true }),
  terra: texturaCanvas(128, 128, (c, w, h) => { c.fillStyle = "#c99a62"; c.fillRect(0, 0, w, h); ruido(c, w, h, 900, ["#b88a55", "#d6a96f"]); }, { repetir: true }),
};

// ---------- placa de texto (copiada de cidade.js · placa; aqui com cantos redondos e contorno grosso)
export function placa(texto, { cor = "#00b5f0", fundo = "#ffffff", tinta = "#151515", w = 512, h = 128, fonte = 800 } = {}) {
  if (window.__blocos?.placa) return window.__blocos.placa(texto, { cor, fundo, tinta, w, h, fonte });
  return texturaCanvas(w, h, (c) => {
    c.fillStyle = "#151515"; c.beginPath(); c.roundRect(0, 0, w, h, h * 0.28); c.fill();
    c.fillStyle = fundo; c.beginPath(); c.roundRect(8, 8, w - 16, h - 16, h * 0.22); c.fill();
    c.fillStyle = cor; c.fillRect(8, h - 30, w - 16, 14);
    let tam = Math.round(h * 0.56); c.font = `${fonte} ${tam}px 'Baloo 2', sans-serif`;
    while (c.measureText(texto).width > w - 50) { tam -= 3; c.font = `${fonte} ${tam}px 'Baloo 2', sans-serif`; }
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = tinta; c.fillText(texto, w / 2, h / 2 - 2);
  });
}
// letreiro: placa em 3D (com moldura) presa numa fachada; largura em metros
export function letreiro(texto, largura = 8, opcoes = {}) {
  const prop = (opcoes.w ?? 512) / (opcoes.h ?? 128);
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, largura / prop), new THREE.MeshToonMaterial({ map: placa(texto, opcoes), transparent: true, alphaTest: 0.5 }));
  m.position.z = 0.06;
  g.add(m);
  return g;
}

// ---------- fitas ao longo de linhas (copiado de cidade.js · densificar, normais e fita, sem mudança de lógica;
// a fita agora devolve a malha sem pôr na cena, para a montagem decidir o bloco)
export function densificar(pts, fechada, passo = 4) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < (fechada ? n : n - 1); i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n];
    const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / passo));
    for (let s = 0; s < k; s++) out.push([ax + ((bx - ax) * s) / k, az + ((bz - az) * s) / k]);
  }
  if (!fechada) out.push(pts[n - 1]);
  return out;
}
export function normais(pts, fechada) {
  const n = pts.length, ns = [];
  for (let i = 0; i < n; i++) {
    const a = pts[fechada ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[fechada ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    ns.push([-dz / l, dx / l]); // direita de quem anda no sentido da linha
  }
  return ns;
}
export function fita(pts, fechada, a, b, y, material, repV, pular = null) {
  const p = densificar(pts, fechada), ns = normais(p, fechada);
  const pos = [], uv = [], ind = [];
  let v = 0, n = 0;
  const total = fechada ? p.length : p.length - 1;
  for (let i = 0; i < total; i++) {
    const j = (i + 1) % p.length;
    const seg = Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1]);
    const mx = (p[i][0] + p[j][0]) / 2 + ns[i][0] * (a + b) / 2, mz = (p[i][1] + p[j][1]) / 2 + ns[i][1] * (a + b) / 2;
    if (!pular || !pular(mx, mz)) {
      for (const [k, vv] of [[i, v], [j, v + seg / repV]]) {
        pos.push(p[k][0] + ns[k][0] * a, y, p[k][1] + ns[k][1] * a, p[k][0] + ns[k][0] * b, y, p[k][1] + ns[k][1] * b);
        uv.push(0, vv, 1, vv);
      }
      ind.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
      n += 4;
    }
    v += seg / repV;
  }
  if (!n) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(ind);
  geo.computeVertexNormals();
  // normais sempre para cima (a ordem dos vértices pode virar a face; o material é DoubleSide)
  const nrm = geo.attributes.normal;
  for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  return m;
}

// ---------- árvore (copiada de cidade.js · arvoreReal; aqui em toon, copa de bolas lisas com contorno e
// um tronco mais gordinho, para combinar com o traço do Rabisco). escala 1 ≈ 5,5 m.
const FOLHAS = [0x5cc443, 0x4cb83f, 0x6fd15a, 0x3fae4a];
// copa: bola baixa em polígonos (com o sombreamento em tons chapados fica fofinha e custa pouco)
const copas = new Map();
const geoCopa = (s) => { const k = s.toFixed(2); if (!copas.has(k)) copas.set(k, new THREE.SphereGeometry(s, 7, 5)); return copas.get(k); };
export function arvoreReal(escala = 1, tipo = 0) {
  if (window.__blocos?.arvore) return window.__blocos.arvore(escala, tipo);
  const g = new THREE.Group();
  const tronco = malha(new THREE.CylinderGeometry(0.26, 0.4, 2.6, 8), mat(0x9a6232), { contorno: 0.08, sombra: false });
  tronco.position.y = 1.3;
  g.add(tronco);
  const folha = mat(FOLHAS[tipo % FOLHAS.length]);
  const bolas = tipo % 3 === 2
    ? [[0, 3.2, 0, 1.25], [0, 4.4, 0, 1.0], [0, 5.3, 0, 0.7]] // pinheirinho de bolas
    : [[0, 3.7, 0, 1.65], [0.95, 3.2, 0.35, 1.1], [-0.85, 3.35, -0.4, 1.15]];
  for (const [x, y, z, s] of bolas) {
    const b = malha(geoCopa(s), folha, { contorno: 0.12, sombra: false });
    b.position.set(x, y, z);
    g.add(b);
  }
  g.scale.setScalar(escala);
  return g;
}

// ---------- semáforo (copiado de cidade.js · semaforo; materiais toon e caixa arredondada)
export function semaforo() {
  const g = new THREE.Group();
  const poste = malha(new THREE.CylinderGeometry(0.12, 0.14, 4.2, 10), mat(0x2f3440), { contorno: 0.05 });
  poste.position.y = 2.1;
  const caixaLuz = caixaRedonda(0.75, 1.95, 0.6, mat(0x2a2a2a), { raio: 0.18, contorno: 0.06 });
  caixaLuz.position.y = 4.6;
  const luzes = {};
  [["vermelho", 0xff2a2a, 5.15], ["amarelo", 0xffc21a, 4.6], ["verde", 0x2aff6a, 4.05]].forEach(([nome, cor, y]) => {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: cor, emissiveIntensity: 0 }));
    l.position.set(0, y, 0.31);
    g.add(l);
    luzes[nome] = l;
  });
  // bonequinho de pedestre (verde = pode atravessar)
  const ped = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xff3030, emissiveIntensity: 1 }));
  ped.position.set(0, 3.2, 0.13);
  const pedCaixa = caixa(0.6, 0.6, 0.2, mat(0x2a2a2a)); pedCaixa.position.set(0, 3.2, 0);
  g.add(poste, caixaLuz, pedCaixa, ped);
  for (const l of Object.values(luzes)) l.userData.dinamico = true;
  ped.userData.dinamico = true;
  g.userData = { luzes, ped };
  return g;
}

// ---------- loja de empresa parceira (copiada de cidade.js · lojaParceira; largura máxima LOJA_MAX do mapa,
// marquise e degrau na frente). A frente inteira é a foto real da fachada, na proporção da foto. Até a foto
// chegar (ou se ela falhar) fica um prédio liso do mesmo tipo. aoMudar(largura) avisa a nova largura (colisão).
export const LOJA = { altura: 8, d: 7.5, larguraMax: LOJA_MAX };
export function lojaParceira(p, aoMudar, { foto = p.foto, estilo: est = null, altura = LOJA.altura, d = LOJA.d, larguraMax = LOJA.larguraMax } = {}) {
  if (window.__blocos?.loja) return window.__blocos.loja(p, aoMudar, { altura, d, larguraMax });
  const g = new THREE.Group();
  const estilo = est ?? ESTILO_PARCEIRO[p.tipo] ?? ESTILO_PARCEIRO.carros;
  const parede = mat(estilo.parede);
  const matFrente = new THREE.MeshToonMaterial({ color: estilo.parede });
  // frente = face +z; prédio de z = -d até 0
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(1, 1, d), [parede, parede, parede, parede, matFrente, parede]);
  corpo.castShadow = corpo.receiveShadow = true;
  const beiral = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(estilo.beiral));
  beiral.castShadow = true;
  g.add(corpo, beiral);
  // a geometria é refeita no tamanho certo (assim o contorno fica fino em qualquer largura)
  const refazer = (m, geo) => { m.geometry.dispose(); m.geometry = geo; m.clear(); comContorno(m, 0.1); };
  const montar = (prop) => {
    const w = Math.min(larguraMax, altura * prop), h = w / prop;
    refazer(corpo, new THREE.BoxGeometry(w, h, d)); corpo.position.set(0, h / 2, -d / 2);
    refazer(beiral, geoCaixaRedonda(w + 0.6, 0.45, d + 0.6, 0.15)); beiral.position.set(0, h + 0.22, -d / 2 + 0.1);
    g.userData.largura = w; g.userData.alturaFoto = h;
    aoMudar?.(w, h);
  };
  montar(larguraMax / altura); // começa na largura máxima (reserva o terreno) e encolhe quando a foto chega
  g.userData.dinamico = true; // muda de tamanho depois: fica fora da mesclagem
  g.userData.fotoOk = false;
  new THREE.TextureLoader().load(`../../${foto}`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    // a foto também "brilha" um pouco (emissiva): fica legível mesmo com o sol de lado, na sombra ou de noite
    Object.assign(matFrente, { map: t, emissiveMap: t, emissiveIntensity: 0.45 });
    matFrente.color.set(0xffffff); matFrente.emissive.set(0xffffff); matFrente.needsUpdate = true;
    g.userData.fotoOk = true;
    montar(t.image.width / t.image.height);
    g.userData.aoFoto?.(t);
  }, undefined, () => { g.userData.aoFalhar?.(); });
  return g;
}

// ---------- mesclagem: junta as malhas estáticas de um grupo numa malha por material (uma chamada de desenho cada).
// Cores lisas (toon ou standard sem textura nem brilho) viram cor por vértice num material único: dezenas de cores,
// uma chamada só. Pula o que tiver userData.dinamico (no próprio objeto ou num pai) e o que já foi mesclado.
// juntas: Set de nós que se mexem (ex.: ombro e cotovelo do Rabisco). Cada malha vai para a junta mais próxima
// acima dela (ou para a raiz), então o que gira continua girando. Também junta as peças "pintadas" do Rabisco
// (ShaderMaterial com corBase), passando corBase/pesoLado para atributos por vértice.
const matVC = new Map();
function materialVC(m) {
  if (m.isMeshToonMaterial) {
    const k = `toon|${m.gradientMap?.uuid}|${m.side}`;
    if (!matVC.has(k)) matVC.set(k, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: m.gradientMap, side: m.side }));
    return matVC.get(k);
  }
  const k = `std|${m.roughness}|${m.metalness}|${m.side}`;
  if (!matVC.has(k)) matVC.set(k, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: m.roughness, metalness: m.metalness, side: m.side }));
  return matVC.get(k);
}
const corLisa = (m) => (m.isMeshToonMaterial || m.isMeshStandardMaterial) && !m.map && !m.emissiveMap && !m.transparent && !m.alphaTest && !m.vertexColors && !m.userData.noite
  && (!m.emissive || m.emissive.getHex() === 0 || m.emissiveIntensity === 0);
const projecao = (m) => m.isShaderMaterial && m.uniforms?.corBase && m.uniforms?.texFrente;
const matProj = new Map();
function materialProj(m) {
  const k = m.uniforms.texFrente.value.uuid;
  if (!matProj.has(k)) {
    const vert = m.vertexShader.replace("void main() {", "attribute vec3 aCorBase;\nattribute float aPesoLado;\nvarying vec3 vCorBase;\nvarying float vPesoLado;\nvoid main() {\n  vCorBase = aCorBase; vPesoLado = aPesoLado;");
    const frag = m.fragmentShader.replace(/uniform vec3 corBase;/, "varying vec3 vCorBase;\n#define corBase vCorBase").replace(/uniform float pesoLado;/, "varying float vPesoLado;\n#define pesoLado vPesoLado");
    const u = m.uniforms;
    matProj.set(k, new THREE.ShaderMaterial({ uniforms: { texFrente: u.texFrente, texCostas: u.texCostas, texLado: u.texLado }, vertexShader: vert, fragmentShader: frag }));
  }
  return matProj.get(k);
}
export function mesclar(raiz, { juntas = null } = {}) {
  raiz.updateMatrixWorld(true);
  const baldes = new Map();
  const remover = [];
  const m4 = new THREE.Matrix4();
  const invs = new Map();
  const alvoDe = (o) => { for (let p = o.parent; p; p = p.parent) { if (p === raiz || juntas?.has(p)) return p; } return raiz; };
  const dinamico = (o) => { for (let p = o; p && p !== raiz; p = p.parent) if (p.userData.dinamico) return true; return false; };
  // detalhe: peça pequena que some de longe (flores, cercas, moitas, bancos); vira malha à parte
  const detalhe = (o) => { for (let p = o; p && p !== raiz; p = p.parent) if (p.userData.detalhe) return true; return false; };
  const c = new THREE.Color();
  raiz.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.mesclada || dinamico(o) || o.geometry.morphAttributes?.position) return;
    if (juntas?.has(o)) return;
    let visivel = true; for (let q = o; q && q !== raiz; q = q.parent) if (!q.visible) visivel = false;
    if (!visivel) { remover.push(o); return; }
    const alvo = alvoDe(o);
    if (!invs.has(alvo)) invs.set(alvo, new THREE.Matrix4().copy(alvo.matrixWorld).invert());
    m4.multiplyMatrices(invs.get(alvo), o.matrixWorld);
    const base = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    base.applyMatrix4(m4);
    if (m4.determinant() < 0) { // espelhado: desvira os triângulos
      const p = base.attributes.position;
      for (let i = 0; i < p.count; i += 3) for (const at of Object.values(base.attributes)) {
        for (let k = 0; k < at.itemSize; k++) { const a = at.getComponent(i + 1, k); at.setComponent(i + 1, k, at.getComponent(i + 2, k)); at.setComponent(i + 2, k, a); }
      }
    }
    if (!base.attributes.normal) base.computeVertexNormals();
    const pedacos = Array.isArray(o.material)
      ? (o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: base.attributes.position.count, materialIndex: 0 }]).map((gr) => [o.material[gr.materialIndex], gr.start, gr.count])
      : [[o.material, 0, base.attributes.position.count]];
    for (const [material, ini, qtd] of pedacos) {
      if (!material || qtd <= 0) continue;
      const tipo = projecao(material) ? "proj" : corLisa(material) ? "vc" : "mat";
      const mat = tipo === "proj" ? materialProj(material) : tipo === "vc" ? materialVC(material) : material;
      const det = detalhe(o);
      const chave = `${alvo.uuid}|${mat.uuid}|${o.castShadow ? 1 : 0}|${det ? 1 : 0}`;
      if (!baldes.has(chave)) baldes.set(chave, { alvo, material: mat, tipo, det, sombra: o.castShadow, pos: [], nrm: [], uv: [], cor: [], pr: [], nr: [], cb: [], pl: [] });
      const b = baldes.get(chave);
      const A = base.attributes, P = A.position, N = A.normal, U = A.uv;
      if (tipo === "vc") c.copy(material.color);
      if (tipo === "proj") c.copy(material.uniforms.corBase.value);
      const peso = tipo === "proj" ? material.uniforms.pesoLado?.value ?? 1 : 0;
      for (let i = ini; i < ini + qtd; i++) {
        b.pos.push(P.getX(i), P.getY(i), P.getZ(i));
        b.nrm.push(N.getX(i), N.getY(i), N.getZ(i));
        if (tipo === "proj") { b.pr.push(A.posRef.getX(i), A.posRef.getY(i), A.posRef.getZ(i)); b.nr.push(A.nrmRef.getX(i), A.nrmRef.getY(i), A.nrmRef.getZ(i)); b.cb.push(c.r, c.g, c.b); b.pl.push(peso); }
        else if (U) b.uv.push(U.getX(i), U.getY(i)); else b.uv.push(0, 0);
        if (tipo === "vc") b.cor.push(c.r, c.g, c.b);
      }
    }
    base.dispose();
    remover.push(o);
  });
  for (const o of remover) o.removeFromParent();
  // limpa grupos vazios
  const vazios = [];
  raiz.traverse((o) => { if (o !== raiz && !o.isMesh && !o.isLight && !o.isSprite && !o.isPoints && o.children.length === 0 && !o.userData.dinamico && !juntas?.has(o)) vazios.push(o); });
  for (const o of vazios) o.removeFromParent();
  for (const b of baldes.values()) {
    const geo = new THREE.BufferGeometry();
    const F = (a, n) => new THREE.Float32BufferAttribute(a, n);
    geo.setAttribute("position", F(b.pos, 3));
    geo.setAttribute("normal", F(b.nrm, 3));
    if (b.tipo === "proj") { geo.setAttribute("posRef", F(b.pr, 3)); geo.setAttribute("nrmRef", F(b.nr, 3)); geo.setAttribute("aCorBase", F(b.cb, 3)); geo.setAttribute("aPesoLado", F(b.pl, 1)); }
    else geo.setAttribute("uv", F(b.uv, 2));
    if (b.tipo === "vc") geo.setAttribute("color", F(b.cor, 3));
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, b.material);
    m.castShadow = b.sombra; m.receiveShadow = true;
    m.userData.mesclada = true;
    m.userData.detalhe = b.det;
    if (b.material.side === THREE.BackSide && b.material.isMeshBasicMaterial) m.userData.contorno = true;
    b.alvo.add(m);
  }
  return baldes.size;
}

// rosto no traço do Rabisco (olhos grandes de contorno grosso, íris colorida, brilho, sobrancelha e boca aberta
// com a língua rosa), desenhado em canvas transparente. fechado = piscando (olhos em arquinho feliz).
const rostos = new Map();
export function texturaRosto({ iris = "#00b5f0", fechado = false, boca = "aberta", bochecha = true } = {}) {
  const k = `${iris}|${fechado}|${boca}|${bochecha}`;
  if (rostos.has(k)) return rostos.get(k);
  const t = texturaCanvas(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.lineCap = c.lineJoin = "round";
    const olho = (x) => {
      if (fechado) { c.lineWidth = 11; c.strokeStyle = "#151515"; c.beginPath(); c.arc(x, 112, 26, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); return; }
      c.lineWidth = 9; c.strokeStyle = "#151515"; c.fillStyle = "#ffffff";
      c.beginPath(); c.ellipse(x, 108, 34, 44, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = iris; c.beginPath(); c.ellipse(x + 4, 116, 22, 28, 0, 0, Math.PI * 2); c.fill();
      c.lineWidth = 4; c.stroke();
      c.fillStyle = "#151515"; c.beginPath(); c.ellipse(x + 5, 118, 13, 18, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ffffff"; c.beginPath(); c.arc(x - 3, 106, 6.5, 0, Math.PI * 2); c.fill();
    };
    olho(84); olho(172);
    // sobrancelhas grossas, curvinhas
    c.fillStyle = "#151515";
    for (const [x, s] of [[80, -1], [176, 1]]) {
      c.beginPath(); c.ellipse(x, 50, 26, 9, s * 0.18, Math.PI, Math.PI * 2); c.lineWidth = 12; c.strokeStyle = "#151515"; c.stroke();
    }
    if (bochecha) { c.fillStyle = "rgba(255,120,160,0.45)"; for (const x of [44, 212]) { c.beginPath(); c.ellipse(x, 170, 16, 10, 0, 0, Math.PI * 2); c.fill(); } }
    // boca
    if (boca === "aberta") {
      c.fillStyle = "#151515"; c.beginPath(); c.moveTo(86, 176); c.quadraticCurveTo(128, 186, 172, 172); c.quadraticCurveTo(160, 236, 128, 236); c.quadraticCurveTo(96, 236, 86, 176); c.fill();
      c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(94, 182); c.quadraticCurveTo(128, 190, 164, 179); c.lineTo(161, 192); c.quadraticCurveTo(128, 200, 97, 194); c.fill();
      c.fillStyle = "#f45aa6"; c.beginPath(); c.ellipse(130, 222, 20, 10, 0, 0, Math.PI * 2); c.fill();
    } else {
      c.lineWidth = 9; c.strokeStyle = "#151515"; c.beginPath(); c.arc(128, 168, 30, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
    }
  });
  rostos.set(k, t);
  return t;
}
