// Rabiscolândia: a base do mundo de blocos. Material de plástico liso (Phong: barato, com brilho de verdade), a linha
// clara na beira de cada peça (o que faz uma caixa parecer peça montada), a sombra de contato perto do chão, a troca
// de formas redondas por formas de blocos e as peças prontas usadas por todo o jogo.
// Tudo original: caixas, pinos discretos e as cores da paleta da Educarte. Nenhuma marca, textura ou nome de terceiros.
// O Rabisco oficial não passa por aqui: ele continua no traço dele (src/motor3d/rabisco3d.js).

import { THREE, texturaCanvas } from "../../src/motor3d/toon.js";

// ------------------------------------------------------------------ material de plástico
// linha clara na beira (só em peça sem textura: usa o uv 0..1 de cada face; some quando a peça fica pequena na tela,
// então de longe não vira ruído) e chão de contato (a peça escurece um pouquinho no último 1,4 m até o chão)
const EXTRA_V = "varying vec2 vUvB;\nvarying float vAltB;\n";
const EXTRA_F = `{
    vec2 dU = fwidth(vUvB), bU = min(vUvB, 1.0 - vUvB);
    vec2 lin = (1.0 - smoothstep(dU * 0.6, dU * 1.6, bU)) * (1.0 - smoothstep(0.035, 0.13, dU));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), max(lin.x, lin.y) * 0.17);
    diffuseColor.rgb *= mix(0.84, 1.0, smoothstep(0.0, 1.4, vAltB));
  }`;
export function comArestas(m) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${EXTRA_V}`)
      .replace("#include <project_vertex>", `#include <project_vertex>
  vUvB = uv;
  #ifdef USE_INSTANCING
    vAltB = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;
  #else
    vAltB = (modelMatrix * vec4(transformed, 1.0)).y;
  #endif`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\n${EXTRA_V}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${EXTRA_F}`);
  };
  m.customProgramCacheKey = () => "bloco-arestas";
  return m;
}
const BRILHO = { specular: 0x2c2c2c, shininess: 36 };
const cache = new Map();
// material novo (sem cache) a partir das opções, para quem precisa de um só seu (textura, emissivo que muda)
export function plasticoNovo(op = {}) {
  const m = new THREE.MeshPhongMaterial({ ...BRILHO, ...op });
  m.userData.plastico = true;
  return op.map ? m : comArestas(m);
}
// plástico compartilhado por cor (a mesclagem junta tudo que usa o mesmo material numa malha só)
export function plastico(cor, extra = {}) {
  const k = `${cor}|${JSON.stringify(extra)}`;
  if (!cache.has(k) || extra.map) cache.set(k, plasticoNovo({ color: cor, ...extra }));
  return cache.get(k);
}
// material por vértice que a mesclagem usa no lugar de dezenas de cores lisas
export const plasticoVC = (m) => comArestas(new THREE.MeshPhongMaterial({ vertexColors: true, specular: m.specular, shininess: m.shininess, side: m.side }));

// ------------------------------------------------------------------ peças básicas
const caixas = new Map();
export function geoCaixa(w, h, d) {
  const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  if (!caixas.has(k)) { const g = new THREE.BoxGeometry(w, h, d); g.userData.compartilhada = true; caixas.set(k, g); }
  return caixas.get(k);
}
// caixa colorida posta num grupo: w h d, cor, posição do CENTRO
export function cx(pai, w, h, d, cor, x, y, z, { sombra = true, material = null, detalhe = false, rx = 0, ry = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(geoCaixa(w, h, d), material ?? plastico(cor));
  m.position.set(x, y, z); m.castShadow = sombra; m.receiveShadow = true;
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  if (detalhe) m.userData.detalhe = true;
  pai.add(m);
  return m;
}
// viga reta entre dois pontos (caixa comprida girada)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0);
export function viga(pai, a, b, e, cor, { sombra = true, material = null, prof = e } = {}) {
  _a.set(...a); _b.set(...b); _d.copy(_b).sub(_a);
  const m = new THREE.Mesh(geoCaixa(e, _d.length(), prof), material ?? plastico(cor));
  m.position.copy(_a).add(_b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(_y, _d.normalize());
  m.castShadow = sombra; m.receiveShadow = true;
  pai.add(m);
  return m;
}
const geoPino = new THREE.CylinderGeometry(0.18, 0.18, 0.11, 6); geoPino.userData.compartilhada = true;
// pinos de peça de montar em cima de uma face (centro x,z; largura w; fundo d; altura y do topo). Discretos: mesma cor
// da peça (um tom acima) e só onde a câmera chega perto.
export function pinos(pai, w, d, x, y, z, cor, passo = 1) {
  const m = plastico(cor), nx = Math.max(1, Math.floor(w / passo)), nz = Math.max(1, Math.floor(d / passo));
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const p = new THREE.Mesh(geoPino, m);
    p.position.set(x - w / 2 + (w / nx) * (i + 0.5), y + 0.05, z - d / 2 + (d / nz) * (k + 0.5));
    p.userData.detalhe = true;
    pai.add(p);
  }
}
const _c = new THREE.Color();
export const claro = (hex, f) => _c.setHex(hex).lerp(new THREE.Color(0xffffff), f).getHex();
export const escuro = (hex, f) => _c.setHex(hex).multiplyScalar(f).getHex();

// ------------------------------------------------------------------ juntar geometrias numa só (sem índice)
export function juntar(geos) {
  const pos = [], nrm = [], uv = [];
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
// várias caixas numa geometria: [[w, h, d, x, y, z, rz?, ry?], ...]
export function geoCaixas(lista) {
  return juntar(lista.map(([w, h, d, x = 0, y = 0, z = 0, rz = 0, ry = 0]) => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.applyMatrix4(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, ry, rz)), _s));
    return g;
  }));
}
// prisma de N lados, de faces planas (cada face com o seu uv 0..1, para a linha da beira sair em cada facet)
export function prisma(rt, rb, h, lados = 8, aberto = false) {
  const pos = [], nrm = [], uv = [];
  const a0 = Math.PI / lados, tri = (a, b, c, n, ua, ub, uc) => { pos.push(...a, ...b, ...c); nrm.push(...n, ...n, ...n); uv.push(...ua, ...ub, ...uc); };
  const y = h / 2;
  for (let i = 0; i < lados; i++) {
    const a = a0 + (i / lados) * Math.PI * 2, b = a0 + ((i + 1) / lados) * Math.PI * 2, m = (a + b) / 2;
    const [ca, sa, cb, sb] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)];
    const A = [ca * rb, -y, sa * rb], B = [cb * rb, -y, sb * rb], C = [cb * rt, y, sb * rt], D = [ca * rt, y, sa * rt];
    const ny = (rb - rt) / h, l = Math.hypot(1, ny), n = [Math.cos(m) / l, ny / l, Math.sin(m) / l];
    tri(A, C, B, n, [0, 0], [1, 1], [1, 0]); tri(A, D, C, n, [0, 0], [0, 1], [1, 1]);
    if (!aberto) {
      const su = (x, z, r) => [x / (2 * r || 1) + 0.5, z / (2 * r || 1) + 0.5];
      if (rt > 0.001) tri([0, y, 0], C, D, [0, 1, 0], [0.5, 0.5], su(C[0], C[2], rt), su(D[0], D[2], rt));
      if (rb > 0.001) tri([0, -y, 0], A, B, [0, -1, 0], [0.5, 0.5], su(A[0], A[2], rb), su(B[0], B[2], rb));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
// disco "de pixels" deitado no plano XY: fileiras retas com a borda em degraus; com furo, vira anel (ring)
export function disco(r, { furo = 0, passo = Math.max(0.5, r / 9) } = {}) {
  const pos = [], nrm = [], uv = [], n = Math.ceil(r / passo);
  const quad = (x0, x1, y0, y1) => { pos.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y0, 0, x1, y1, 0, x0, y1, 0); for (let i = 0; i < 6; i++) nrm.push(0, 0, 1); uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); };
  const degrau = (v) => Math.round(v / passo) * passo;
  for (let i = -n; i < n; i++) {
    const y0 = i * passo, y1 = y0 + passo, ym = (y0 + y1) / 2;
    if (Math.abs(ym) >= r) continue;
    const xo = degrau(Math.sqrt(r * r - ym * ym));
    if (xo <= 0) continue;
    if (Math.abs(ym) < furo) { const xi = degrau(Math.sqrt(furo * furo - ym * ym)); if (xo > xi) { quad(-xo, -xi, y0, y1); quad(xi, xo, y0, y1); } } else quad(-xo, xo, y0, y1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
// pirâmide em degraus: base w × d, altura h, n camadas (o telhado e o cone de blocos)
export function degraus(w, d, h, n = 4, { fim = 0.14 } = {}) {
  const a = h / n, lista = [];
  for (let i = 0; i < n; i++) { const k = 1 - (i / n) * (1 - fim); lista.push([w * k, a, d * k, 0, -h / 2 + a * (i + 0.5), 0]); }
  return geoCaixas(lista);
}
// bola de blocos: três caixas cruzadas (de longe parece redonda; de perto, peças)
export const bola = (r) => geoCaixas([[r * 2, r * 1.3, r * 1.3], [r * 1.3, r * 2, r * 1.3], [r * 1.3, r * 1.3, r * 2]]);
// aro de N trechos retos no plano XY (eixo z), de raio R e tubo e, até o ângulo arco
export function aro(R, e, n = 10, arco = Math.PI * 2) {
  const lista = [], dA = arco / n, comp = 2 * R * Math.tan(dA / 2) + e * 0.6;
  for (let i = 0; i < n; i++) { const a = dA * (i + 0.5); lista.push([comp, e, e, Math.cos(a) * R, Math.sin(a) * R, 0, a + Math.PI / 2]); }
  return geoCaixas(lista);
}

// ------------------------------------------------------------------ forma redonda → forma de blocos (na hora de montar a peça)
// cilindro fino vira caixa, grosso vira prisma de 8 faces; cone vira degraus; esfera vira bola de blocos ou caixa;
// toro vira aro de trechos retos; círculo e anel viram disco de pixels. Geometrias do mesmo tamanho são a mesma.
const trocadas = new Map();
const achar = (k, f) => { if (!trocadas.has(k)) { const g = f(); g.userData.compartilhada = true; trocadas.set(k, g); } return trocadas.get(k); };
const f3 = (...v) => v.map((n) => (+n).toFixed(3)).join("|");
export function emBlocos(g) {
  if (!g || g.userData.compartilhada || !g.parameters) return g;
  const p = g.parameters, t = g.type;
  if (t === "CylinderGeometry" || t === "ConeGeometry") {
    const cone = t === "ConeGeometry", rt = cone ? 0 : p.radiusTop, rb = cone ? p.radius : p.radiusBottom, h = p.height;
    if ((p.thetaLength ?? 7) < 6) { // meio cilindro: duas caixas em degrau, no lado que ele ocupava
      const r = Math.max(rt, rb), giro = (p.thetaStart ?? 0) + (p.thetaLength ?? 0) / 2 - Math.PI / 2;
      return achar(`mcil|${f3(r, h, giro)}`, () => geoCaixas([[r * 0.55, h, r * 1.9, r * 0.28, 0, 0], [r * 0.45, h, r * 1.2, r * 0.75, 0, 0]]).rotateY(-giro));
    }
    if (cone || rt < 0.02) {
      const quatro = p.radialSegments === 4, w = rb * (quatro ? Math.SQRT2 : 1.8);
      return achar(`cone|${f3(w, h)}|${quatro}`, () => { const c = degraus(w, w, h, h < 0.6 ? 2 : h < 2 ? 3 : 4); if (quatro) c.rotateY(-Math.PI / 4); return c; });
    }
    const r = Math.max(rt, rb), m = (rt + rb) / 2;
    if (r < 0.62 || p.openEnded && r < 1) return achar(`cil|${f3(m, h)}`, () => new THREE.BoxGeometry(m * 1.78, h, m * 1.78));
    return achar(`pri|${f3(rt, rb, h)}|${p.openEnded}`, () => prisma(rt, rb, h, 8, p.openEnded));
  }
  if (t === "SphereGeometry") {
    const r = p.radius;
    if (p.thetaLength < 2.2) { // meia esfera: em degraus (de cabeça para baixo, quando era a metade de baixo)
      const baixo = p.thetaStart > 1;
      return achar(`meia|${f3(r)}|${baixo}`, () => { const c = geoCaixas([[r * 2, r * 0.36, r * 2, 0, r * 0.18, 0], [r * 1.6, r * 0.32, r * 1.6, 0, r * 0.52, 0], [r * 1, r * 0.3, r * 1, 0, r * 0.82, 0]]); return baixo ? c.rotateX(Math.PI) : c; });
    }
    return r < 0.38 ? achar(`cubo|${f3(r)}`, () => new THREE.BoxGeometry(r * 1.65, r * 1.65, r * 1.65)) : achar(`bola|${f3(r)}`, () => bola(r));
  }
  if (t === "IcosahedronGeometry" || t === "DodecahedronGeometry" || t === "OctahedronGeometry") {
    const r = p.radius;
    return r < 0.38 ? achar(`cubo|${f3(r)}`, () => new THREE.BoxGeometry(r * 1.6, r * 1.6, r * 1.6)) : achar(`bola|${f3(r)}`, () => bola(r));
  }
  if (t === "CapsuleGeometry") return achar(`cap|${f3(p.radius, p.length)}`, () => new THREE.BoxGeometry(p.radius * 1.9, p.length + p.radius * 2, p.radius * 1.9));
  if (t === "TorusGeometry") {
    const n = Math.max(4, Math.round((p.arc / (Math.PI * 2)) * (p.radius > 3 ? 20 : p.radius > 0.8 ? 12 : 8)));
    return achar(`aro|${f3(p.radius, p.tube, p.arc)}`, () => aro(p.radius, p.tube * 1.8, n, p.arc));
  }
  if (t === "CircleGeometry") {
    const r = p.radius;
    return r < 0.8 ? achar(`quad|${f3(r)}`, () => new THREE.PlaneGeometry(r * 1.8, r * 1.8)) : achar(`disco|${f3(r)}`, () => disco(r));
  }
  if (t === "RingGeometry") return achar(`anel|${f3(p.innerRadius, p.outerRadius)}`, () => disco(p.outerRadius, { furo: p.innerRadius }));
  if (t === "LatheGeometry") {
    let rm = 0, y0 = Infinity, y1 = -Infinity; for (const q of p.points) { rm = Math.max(rm, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    return achar(`lat|${f3(rm, y0, y1)}`, () => new THREE.BoxGeometry(rm * 1.8, y1 - y0, rm * 1.8).translate(0, (y0 + y1) / 2, 0));
  }
  return g;
}

// ------------------------------------------------------------------ placa lisa (retângulo reto) com o texto
export function placaBloco(texto, { cor = "#00b5f0", fundo = "#ffffff", tinta = "#151515", w = 512, h = 128, fonte = 800 } = {}) {
  return texturaCanvas(w, h, (c) => {
    c.fillStyle = cor; c.fillRect(0, 0, w, h);
    c.fillStyle = fundo; c.fillRect(h * 0.09, h * 0.09, w - h * 0.18, h * 0.82);
    let tam = Math.round(h * 0.56); c.font = `${fonte} ${tam}px 'Baloo 2', sans-serif`;
    while (c.measureText(texto).width > w - h * 0.6) { tam -= 3; c.font = `${fonte} ${tam}px 'Baloo 2', sans-serif`; }
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = tinta; c.fillText(texto, w / 2, h / 2 + 2);
  });
}
// recorte de uma imagem real (logo dentro da foto): [x0, y0, x1, y1] em frações, y de cima para baixo. O material só
// ganha o recorte quando a imagem chega; a foto "brilha" um pouco para ler de longe, na sombra e de noite.
export function comRecorte(m, url, [x0, y0, x1, y1] = [0, 0, 1, 1], aoChegar = null, aoFalhar = null) {
  new THREE.TextureLoader().load(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    t.repeat.set(x1 - x0, y1 - y0); t.offset.set(x0, 1 - y1);
    Object.assign(m, { map: t, emissiveMap: t, emissiveIntensity: 0.5 });
    m.color.set(0xffffff); m.emissive.set(0xffffff); m.needsUpdate = true;
    aoChegar?.(t);
  }, undefined, () => aoFalhar?.());
  return m;
}

// ------------------------------------------------------------------ telhados de degraus (cada fiada mais estreita)
export function telhadoDegraus(pai, w, d, cor, y, z, { camadas = 5, alt = 0.6, beiral = 0.5, x = 0, cumeeira = true } = {}) {
  const W = w + beiral * 2, passo = (W - 1.1) / (camadas - 1);
  for (let i = 0; i < camadas; i++) cx(pai, W - i * passo, alt, d + beiral * 2, i % 2 ? claro(cor, 0.08) : cor, x, y + alt / 2 + i * alt, z);
  if (cumeeira) cx(pai, 0.7, 0.2, d + beiral * 2 + 0.2, claro(cor, 0.28), x, y + camadas * alt + 0.1, z, { sombra: false });
}
// frontão: a parede em degraus que fecha o telhado na frente
export function frontaoDegraus(pai, w, cor, y, z, { camadas = 4, alt = 0.6, x = 0, prof = 0.3 } = {}) {
  const passo = (w - 1.1) / camadas;
  for (let i = 0; i < camadas; i++) cx(pai, w - i * passo, alt, prof, cor, x, y + alt / 2 + i * alt, z);
}
