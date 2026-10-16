// Rabiscolândia: PESSOAS de verdade em versão boneco (cartoon arredondado, cabeça oval, contorno preto e olhos
// grandes no traço do Rabisco). Nenhuma foto vai para o jogo: são bonecos inspirados nelas. Elas não falam.
//  - "sabrina": Diretora Sabrina (Educarte Kids II) — cabelo escuro longo e liso repartido de lado, cílios longos,
//    conjunto rosa da Educarte com a logo azul no peito, unhas rosa, brincos e pulseira dourados, scarpin preto;
//  - "elaine": Contadora Elaine (Crescente Contabilidade) — óculos gatinho de armação grossa, cabelo liso com
//    pontas caramelo, blusa creme com listras onduladas azuis, broche azul, colar e argolas douradas, prancheta do alvará;
//  - "carina": Diretora Carina (Educarte Kids I) — cabelo preto cacheado e volumoso, sorriso largo com dentes,
//    olhos apertadinhos, vestido-camisa bege com gola, botões e cinto, colar de contas e brincos pendentes;
//  - "aurelio": Aurélio, assistente da Elaine (Crescente Contabilidade) — um pouco mais alto e gordinho, cabelo curto
//    loiro-grisalho com entradas, óculos retangulares pretos, barba e cavanhaque grisalhos, camiseta preta, jeans;
//  - "camila": Camila, dona da academia Rise Up — loira com raiz castanha e ondas, argolas grandes, regata e legging
//    pretas com "RISE UP" no peito, tênis branco com faixa laranja;
//  - "riseup-dono": o marido dela, também dono da Rise Up (nome a confirmar) — boné preto "RISE UP", careca, barba
//    cheia castanho-escura com fios grisalhos, corpo forte, camiseta dryfit grafite, calça de treino e tênis.
//
// Custo baixo: o corpo inteiro é UMA malha com esqueleto (cada peça presa ao seu osso) e UM material (cores por
// vértice + um atlas desenhado em canvas com rosto, tecido, logo e capa do objeto da mão). O contorno preto é uma
// segunda malha (casca empurrada pela normal no shader). Com a sombrinha redonda: 3 chamadas de desenho.
//
//   import { criarPessoa } from "./pessoas.js";
//   const s = criarPessoa("sabrina");  cena.add(s.grupo);
//   s.atualizar(dt, { modo: "andar", vel });       // modo "parado" | "andar" (vel > 0,2 também anda)
//   s.acenar(2); s.pular(); s.comemorar(2.5); s.orar(true);
//   s.receber(alvara3D);                           // guarda o objeto próprio (prancheta), estica as mãos e segura o alvará
//   s.segurar(null); s.objeto(true); s.calma();     // larga, pega o objeto próprio de volta, encerra aceno/festa

import { THREE, toon, texturaCanvas, aleatorio } from "../../src/motor3d/toon.js";
import { sombraBlob } from "../../src/motor3d/objetos.js";

const V3 = THREE.Vector3;
const sstep = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- atlas (1024 × 1024, coordenadas do canvas)
const ATLAS = 1024;
const REG = {
  rosto: [0, 0, 512, 512],
  logo: [512, 0, 512, 256],
  capa: [512, 256, 192, 256],
  branco: [704, 256, 320, 256],
  // quem tem barba.textura: a casca da barba ocupa o lado direito do branco e a cor lisa vem de um miolo à esquerda
  brancoEstreito: [704, 256, 64, 256],
  barba: [784, 256, 240, 256],
  torso: [0, 512, 512, 512],
  tecido: [512, 512, 512, 512],
};
let regBranco = "branco"; // muda por pessoa (montarPessoa)
const uvReg = (reg, u, v) => { const [x, y, w, h] = REG[reg]; return [(x + u * w) / ATLAS, 1 - (y + (1 - v) * h) / ATLAS]; };

// ---------------------------------------------------------------- montador da malha com esqueleto
class Montador {
  constructor() { this.pos = []; this.nrm = []; this.dir = []; this.uv = []; this.cor = []; this.si = []; this.sw = []; this.esp = []; this.tris = 0; }
  // geo: geometria da peça · osso: índice ou função(p) → [[osso, peso], ...] · regiao: parte do atlas (u, v da peça)
  // uvFn(p, u, v) → [u, v] troca o mapeamento · contorno: espessura da casca preta (0 = sem; ou função(p) por vértice)
  // caixa: contorno de peça com quinas (casca escalada a partir do centro, sem rachar nas arestas)
  add(geo, { cor = 0xffffff, corFn = null, osso = 0, regiao = "branco", uvFn = null, contorno = 0.014, pos = [0, 0, 0], rot = [0, 0, 0], esc = 1, matriz = null, caixa = false } = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const M = matriz ? matriz.clone() : new THREE.Matrix4().compose(new V3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), Array.isArray(esc) ? new V3(...esc) : new V3(esc, esc, esc));
    const P = g.attributes.position, n = P.count;
    let dirs = null;
    if (caixa) {
      g.computeBoundingBox();
      const c = g.boundingBox.getCenter(new V3()), h = g.boundingBox.getSize(new V3()).multiplyScalar(0.5);
      const q = new THREE.Quaternion(); M.decompose(new V3(), q, new V3());
      dirs = [];
      for (let i = 0; i < n; i++) { const d = new V3(P.getX(i), P.getY(i), P.getZ(i)).sub(c); d.set(d.x / h.x, d.y / h.y, d.z / h.z).applyQuaternion(q); dirs.push(d); }
    }
    g.applyMatrix4(M);
    if (!g.attributes.normal) g.computeVertexNormals();
    const N = g.attributes.normal, U = g.attributes.uv;
    const col = new THREE.Color(cor);
    const p = new V3();
    for (let i = 0; i < n; i++) {
      p.set(P.getX(i), P.getY(i), P.getZ(i));
      this.pos.push(p.x, p.y, p.z);
      this.nrm.push(N.getX(i), N.getY(i), N.getZ(i));
      if (dirs) this.dir.push(dirs[i].x, dirs[i].y, dirs[i].z); else this.dir.push(N.getX(i), N.getY(i), N.getZ(i));
      let u = U ? U.getX(i) : 0.5, v = U ? U.getY(i) : 0.5;
      if (uvFn) [u, v] = uvFn(p, u, v);
      const [uu, vv] = regiao === "branco" ? uvReg(regBranco, 0.5, 0.5) : uvReg(regiao, u, v);
      this.uv.push(uu, vv);
      if (corFn) { const cc = corFn(p); this.cor.push(cc.r, cc.g, cc.b); } else this.cor.push(col.r, col.g, col.b);
      const pesos = typeof osso === "function" ? osso(p) : [[osso, 1]];
      for (let k = 0; k < 4; k++) { this.si.push(pesos[k]?.[0] ?? 0); this.sw.push(pesos[k]?.[1] ?? 0); }
      this.esp.push(typeof contorno === "function" ? contorno(p) : contorno);
    }
    this.tris += n / 3;
  }
  geometrias() {
    const g = new THREE.BufferGeometry();
    const pos = new THREE.Float32BufferAttribute(this.pos, 3);
    const si = new THREE.Uint16BufferAttribute(this.si, 4), sw = new THREE.Float32BufferAttribute(this.sw, 4);
    g.setAttribute("position", pos);
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.cor, 3));
    g.setAttribute("skinIndex", si); g.setAttribute("skinWeight", sw);
    // casca do contorno: mesmos vértices; a "normal" é a direção de empurrar e só entram as peças com contorno
    const c = new THREE.BufferGeometry();
    c.setAttribute("position", pos);
    c.setAttribute("normal", new THREE.Float32BufferAttribute(this.dir, 3));
    c.setAttribute("skinIndex", si); c.setAttribute("skinWeight", sw);
    c.setAttribute("contorno", new THREE.Float32BufferAttribute(this.esp, 1));
    const idx = [];
    for (let i = 0; i < this.esp.length; i += 3) if (this.esp[i] > 0) idx.push(i, i + 1, i + 2);
    c.setIndex(idx);
    return { corpo: g, contorno: c, triCorpo: this.esp.length / 3, triContorno: idx.length / 3 };
  }
}

// mecha de cabelo: fita com seção oval ao longo de uma curva, afinando na ponta (fora(P, t) = lado de fora)
function mecha(pts, { w0 = 0.12, w1 = 0.05, d0 = 0.05, d1 = 0.02, lados = 6, passos = 10, fora }) {
  const curva = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const pos = [], nrm = [], uv = [], idx = [];
  for (let i = 0; i <= passos; i++) {
    const t = i / passos, P = curva.getPointAt(t), T = curva.getTangentAt(t);
    const N = fora(P, t).clone(); N.addScaledVector(T, -N.dot(T)).normalize();
    const B = new V3().crossVectors(T, N).normalize();
    const ponta = t > 0.7 ? 1 - Math.pow((t - 0.7) / 0.3, 2) * 0.93 : 1;
    const w = lerp(w0, w1, t) * ponta, d = lerp(d0, d1, t) * ponta;
    for (let k = 0; k <= lados; k++) {
      const a = (k / lados) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pos.push(P.x + B.x * c * w / 2 + N.x * s * d / 2, P.y + B.y * c * w / 2 + N.y * s * d / 2, P.z + B.z * c * w / 2 + N.z * s * d / 2);
      const nn = new V3().addScaledVector(B, c * d).addScaledVector(N, s * w).normalize();
      nrm.push(nn.x, nn.y, nn.z); uv.push(k / lados, t);
    }
  }
  const L = lados + 1;
  for (let i = 0; i < passos; i++) for (let k = 0; k < lados; k++) { const a = i * L + k, b = a + L; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  // confere o sentido dos triângulos (a face tem de olhar para fora, senão o contorno inverte)
  const pa = new V3().fromArray(pos, idx[0] * 3), pb = new V3().fromArray(pos, idx[1] * 3), pc = new V3().fromArray(pos, idx[2] * 3);
  const tri = new V3().crossVectors(pb.clone().sub(pa), pc.clone().sub(pa));
  if (tri.dot(new V3().fromArray(nrm, idx[0] * 3)) < 0) for (let i = 0; i < idx.length; i += 3) { const x = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = x; }
  g.setIndex(idx);
  return g;
}

// ---------------------------------------------------------------- desenhos do atlas
const logos = new Map(); // url → Image (carrega uma vez)
function carregarLogo(url, aoCarregar) {
  if (!logos.has(url)) { const im = new Image(); im.src = url; logos.set(url, { im, fila: [] }); im.onload = () => { for (const f of logos.get(url).fila) f(); }; }
  const l = logos.get(url);
  if (l.im.complete && l.im.naturalWidth) aoCarregar(l.im); else l.fila.push(() => aoCarregar(l.im));
}

// barba cheia desenhada (barba.textura): contorno em graus (azimute, polar) de UM lado do rosto; o outro é espelho.
// A mesma forma pinta o retalho do rosto (frente, bigode e bochechas) e a casca 3D (costeletas, mandíbula, queixo).
const BARBA_LADO = (() => {
  const k = [[0, 110.6], [9, 109.4], [17, 111.4], [24, 111], [32, 109.4], [42, 105], [52, 100.5], [61, 95.5], [68, 88], [71, 79], [74, 72],
    [81, 70], [87, 73], [87, 82], [85, 94], [88, 103], [93, 110], [95, 122], [88, 138], [74, 150], [55, 161], [30, 168], [0, 171]];
  const out = [k[0]];
  for (let i = 1; i < k.length - 1; i++) {
    const a = i === 1 ? k[0] : [(k[i - 1][0] + k[i][0]) / 2, (k[i - 1][1] + k[i][1]) / 2];
    const b = i === k.length - 2 ? k[i + 1] : [(k[i][0] + k[i + 1][0]) / 2, (k[i][1] + k[i + 1][1]) / 2];
    for (let t = 0.125; t <= 1.0001; t += 0.125) {
      const u = 1 - t;
      out.push([u * u * a[0] + 2 * u * t * k[i][0] + t * t * b[0], u * u * a[1] + 2 * u * t * k[i][1] + t * t * b[1]]);
    }
  }
  return out;
})();
// distância (graus) até a barba de um lado: negativa dentro (o eixo az = 0 fecha o contorno)
function distBarba(a, pol) {
  const L = BARBA_LADO;
  let dentro = false, d2 = Infinity;
  for (let i = 0, j = L.length - 1; i < L.length; j = i++) {
    const [x1, y1] = L[j], [x2, y2] = L[i];
    if ((y1 > pol) !== (y2 > pol) && a < x1 + ((pol - y1) / (y2 - y1)) * (x2 - x1)) dentro = !dentro;
    if (i === 0) continue; // o eixo do meio só fecha o contorno: não é borda da barba
    const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((a - x1) * dx + (pol - y1) * dy) / (dx * dx + dy * dy || 1)));
    d2 = Math.min(d2, (a - x1 - t * dx) ** 2 + (pol - y1 - t * dy) ** 2);
  }
  return dentro ? -Math.sqrt(d2) : Math.sqrt(d2);
}
// boca (o sorriso "dentes" do rosto, em graus): distância aproximada, negativa dentro
const distBoca = (a, pol) => { const t = Math.max(0, 1 - (a / 17) ** 2); return Math.max(a - 17, 116 + 1.6 * t - pol, pol - (116 + 10.8 * Math.pow(t, 0.7))); };
// a casca é a barba inteira menos um furo em volta da boca (os lábios ficam à mostra)
const distCascaBarba = (a, pol) => Math.max(distBarba(a, pol), 1.4 - distBoca(a, pol));
function caminhoBarba(c, X, Y, lados) {
  c.beginPath();
  for (const s of lados) for (const [a, pol] of s > 0 ? BARBA_LADO : [...BARBA_LADO].reverse()) c.lineTo(X(s * a), Y(pol));
  c.closePath();
}
// sal e pimenta: fundo castanho e muitos risquinhos curtos (grisalhos, claros e escuros) caindo para baixo
// esc = pixels por grau (o mesmo número de fios por grau no rosto e na casca)
function pintarBarba(c, bb, w, h, esc, semente) {
  const rnd = aleatorio(semente);
  c.fillStyle = bb.cor; c.fillRect(0, 0, w, h);
  // na casca (menos pixels por grau) o risco tem 1 px no mínimo: menos riscos para manter o mesmo tom
  const n = Math.round((w * h) / (esc * esc) * (bb.densidade ?? 1.1) * (esc < 3 ? 0.38 : 1));
  const cinza = ["rgba(216,210,202,0.7)", "rgba(196,188,178,0.7)", "rgba(235,231,225,0.6)", "rgba(179,170,159,0.7)"], escuro = ["rgba(74,58,45,0.5)", "rgba(90,70,54,0.5)", "rgba(138,110,87,0.5)"];
  c.lineCap = "round";
  // mechas: faixas suaves mais claras e mais escuras caindo para baixo (dão o jeito de tufos)
  const nm = Math.round((w * h) / (esc * esc) / 9);
  for (let i = 0; i < nm; i++) {
    const x = rnd() * w, y = rnd() * h, L = esc * (3 + rnd() * 3), ang = Math.PI / 2 + (rnd() - 0.5) * 0.6;
    c.strokeStyle = rnd() < 0.5 ? "rgba(60,44,32,0.22)" : "rgba(170,150,130,0.18)";
    c.lineWidth = esc * (0.8 + rnd() * 0.6);
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(ang) * L * 0.5 + esc * 0.4, y + Math.sin(ang) * L * 0.5, x + Math.cos(ang) * L, y + Math.sin(ang) * L); c.stroke();
  }
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, g = rnd() < (bb.fios ?? 0.45);
    const ang = Math.PI / 2 + (rnd() - 0.5) * 1.1, L = esc * (0.5 + rnd() * 0.6);
    c.strokeStyle = g ? cinza[Math.floor(rnd() * cinza.length)] : escuro[Math.floor(rnd() * escuro.length)];
    c.lineWidth = Math.max(1, esc * 0.26);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L); c.stroke();
  }
}
// textura da casca (240 × 256): |az| 0–112° na horizontal, polar 50–178° na vertical, fora da barba transparente
function desenharBarbaCasca(c, bb) {
  c.clearRect(0, 0, 240, 256);
  const X = (a) => (Math.abs(a) / 112) * 240, Y = (pol) => ((pol - 50) / 128) * 256;
  c.save(); caminhoBarba(c, X, Y, [1]); c.clip();
  pintarBarba(c, bb, 240, 256, 2.07, 23);
  c.restore();
  c.strokeStyle = bb.linha ?? "rgba(60,44,32,0.55)"; c.lineWidth = 1.5; caminhoBarba(c, X, Y, [1]); c.stroke();
  // bigode um pouco mais escuro e o furo da boca
  c.fillStyle = bb.bigode ?? "rgba(50,36,26,0.22)";
  c.beginPath(); c.moveTo(X(0), Y(109.4)); c.quadraticCurveTo(X(19), Y(111), X(21), Y(121)); c.quadraticCurveTo(X(15), Y(115.5), X(0), Y(115.2)); c.closePath(); c.fill();
  const im = c.getImageData(0, 0, 240, 256), px = im.data;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 240; x++) if (distBoca((x + 0.5) / 240 * 112, 50 + (y + 0.5) / 256 * 128) < 1.4) px[(y * 240 + x) * 4 + 3] = 0;
  c.putImageData(im, 0, 0);
}

// rosto: retalho OPACO de esfera (az ±60°, polar 45°–150°) pintado com a cor da pele, então emenda sem marca
const ROSTO = { az: 60, pol0: 45, pol1: 150 };
const hex = (n) => `#${new THREE.Color(n).getHexString()}`;
function desenharRosto(c, p, fechado) {
  const f = p.rosto;
  const kx = 512 / (2 * ROSTO.az), ky = 512 / (ROSTO.pol1 - ROSTO.pol0);
  const X = (az) => 256 + az * kx, Y = (pol) => (pol - ROSTO.pol0) * ky;
  // olhosY / sobrancelhaY: sobe (negativo) ou desce os olhos e as sobrancelhas, em graus (padrão 0)
  const Yo = (pol) => Y(pol + (f.olhosY ?? 0)), Ys = (pol) => Y(pol + (f.sobrancelhaY ?? f.olhosY ?? 0));
  c.fillStyle = hex(p.pele); c.fillRect(0, 0, 512, 512);
  c.lineCap = c.lineJoin = "round";
  // bochechas rosadas (degradê suave: o retalho é opaco)
  for (const s of [-1, 1]) {
    c.save(); c.translate(X(s * 31), Y(112)); c.scale(1, (ky / kx) * 0.62);
    const g = c.createRadialGradient(0, 0, 2, 0, 0, 46);
    g.addColorStop(0, f.bochecha); g.addColorStop(1, "rgba(255,96,130,0)");
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 46, 0, Math.PI * 2); c.fill(); c.restore();
  }
  // cílios longos curvados para cima, saindo do delineado (do meio para a ponta de fora)
  const cilios = (rx, ry, s, cy = 0, esc = 1) => {
    c.strokeStyle = "#151515"; c.lineCap = "round";
    for (const [a, comp, larg] of f.cilios) {
      const aa = s > 0 ? a : Math.PI - a, x0 = Math.cos(aa) * (rx + 1), y0 = cy + Math.sin(aa) * (ry + 1) * esc;
      const nx = Math.cos(aa), ny = Math.sin(aa); // para fora do olho
      const L = comp;
      c.lineWidth = larg;
      c.beginPath(); c.moveTo(x0, y0);
      c.quadraticCurveTo(x0 + nx * L * 0.6, y0 + ny * L * 0.6 - L * 0.1, x0 + nx * L * 0.75 + s * L * 0.35, y0 + ny * L * 0.55 - L * 0.55);
      c.stroke();
    }
  };
  // olhos grandes (no traço do Rabisco: branco com contorno, íris, pupila e brilho) com delineado e cílios
  for (const s of [-1, 1]) {
    const oe = f.olhoEsc ?? 1, ox = X(s * 22), oy = Yo(96), rx = 12 * kx * oe, ry = 13 * ky * 0.84 * oe;
    if (fechado) {
      c.save(); c.translate(ox, oy + 8);
      c.strokeStyle = "#151515"; c.lineWidth = 12;
      c.beginPath(); c.ellipse(0, 0, rx, ry * 0.45, 0, Math.PI * 0.06, Math.PI * 0.94); c.stroke();
      // cílios para baixo quando fecha
      c.lineWidth = 7;
      for (const k of [0, 1, 2]) { const a = s > 0 ? 0.15 + k * 0.28 : Math.PI - 0.15 - k * 0.28; const x0 = Math.cos(a) * rx, y0 = Math.sin(a) * ry * 0.45; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + s * 10 + Math.cos(a) * 8, y0 + 16); c.stroke(); }
      c.restore();
      continue;
    }
    if (f.olhos === "rindo") {
      // olhos apertadinhos de quem está rindo: meia-lua com a íris espiando, pálpebra de cima grossa
      c.save(); c.translate(ox, oy + ry * 0.3); c.rotate(s * -0.05);
      const lua = () => { c.beginPath(); c.moveTo(-rx, 0); c.quadraticCurveTo(0, -ry * 1.15, rx, 0); c.quadraticCurveTo(0, -ry * 0.12, -rx, 0); c.closePath(); };
      cilios(rx, ry * 0.55, s, -ry * 0.02, 1);
      lua(); c.fillStyle = "#ffffff"; c.fill();
      c.save(); lua(); c.clip();
      const gi = c.createRadialGradient(-s * 3, -ry * 0.25, 2, -s * 3, -ry * 0.3, rx * 0.62);
      f.iris.forEach((cor, i) => gi.addColorStop([0, 0.5, 0.85, 1][i], cor));
      c.fillStyle = gi; c.beginPath(); c.arc(-s * 3, -ry * 0.3, rx * 0.62, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#120904"; c.beginPath(); c.arc(-s * 3, -ry * 0.3, rx * 0.32, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ffffff"; c.beginPath(); c.arc(-s * 3 - rx * 0.24, -ry * 0.5, rx * 0.17, 0, Math.PI * 2); c.fill();
      c.restore();
      c.strokeStyle = "#151515"; c.lineWidth = 13;
      c.beginPath(); c.moveTo(-rx - 2, 2); c.quadraticCurveTo(0, -ry * 1.18, rx + 2, 2); c.stroke();
      c.lineWidth = 5; c.beginPath(); c.moveTo(-rx * 0.85, -1); c.quadraticCurveTo(0, -ry * 0.12, rx * 0.85, -1); c.stroke();
      // ruguinha de riso embaixo
      c.strokeStyle = "rgba(120,60,40,0.45)"; c.lineWidth = 4; c.beginPath(); c.moveTo(-rx * 0.6, ry * 0.32); c.quadraticCurveTo(0, ry * 0.5, rx * 0.6, ry * 0.32); c.stroke();
      c.restore();
      continue;
    }
    c.save(); c.translate(ox, oy); c.rotate(s * -0.07);
    cilios(rx, ry, s);
    c.fillStyle = "#ffffff"; c.strokeStyle = "#151515"; c.lineWidth = 7;
    c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    const ix = -s * 4, iy = ry * 0.16, irx = rx * 0.68, iry = ry * 0.68;
    c.save(); c.beginPath(); c.ellipse(0, 0, rx - 3, ry - 3, 0, 0, Math.PI * 2); c.clip();
    const gi = c.createRadialGradient(ix, iy + iry * 0.25, 3, ix, iy, iry);
    f.iris.forEach((cor, i) => gi.addColorStop([0, 0.5, 0.85, 1][i], cor));
    c.fillStyle = gi; c.beginPath(); c.ellipse(ix, iy, irx, iry, 0, 0, Math.PI * 2); c.fill();
    c.lineWidth = 4; c.strokeStyle = "#151515"; c.stroke();
    c.fillStyle = "#120904"; c.beginPath(); c.ellipse(ix, iy + 2, irx * 0.5, iry * 0.52, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffffff";
    c.beginPath(); c.ellipse(ix - irx * 0.36, iy - iry * 0.38, irx * 0.3, iry * 0.26, -0.4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(ix + irx * 0.4, iy + iry * 0.36, irx * 0.13, 0, Math.PI * 2); c.fill();
    c.restore();
    // delineado grosso em cima
    c.strokeStyle = "#151515"; c.lineWidth = 14;
    c.beginPath(); c.ellipse(0, 0, rx + 1, ry + 1, 0, Math.PI * 1.04, Math.PI * 1.96); c.stroke();
    c.restore();
  }
  // sobrancelhas
  c.fillStyle = f.sobrancelha;
  const g2 = f.grossura;
  for (const s of [-1, 1]) {
    const xp = X(s * 24), xo = X(s * 34);
    c.beginPath();
    const ii = f.interno ?? 0;
    c.moveTo(X(s * 8.5), Ys(80.5 - ii));
    c.quadraticCurveTo(X(s * 15), Ys(75.6), xp, Ys(73.8));
    c.quadraticCurveTo(X(s * 30), Ys(73.4), xo, Ys(78.6));
    c.quadraticCurveTo(X(s * 29), Ys(73.4 + 3.2 * g2), xp, Ys(73.8 + 3.1 * g2));
    c.quadraticCurveTo(X(s * 15), Ys(75.6 + 2.4 * g2 - ii * 0.5), X(s * 9), Ys(80.5 + 2.7 * g2 - ii));
    c.closePath(); c.fill();
  }
  // barba rala (pontinhos) no rosto e bigode curto, para quem tem barba
  if (f.barba?.textura) {
    // barba cheia desenhada: cobre bochechas até as maçãs, mandíbula e queixo; bigode cheio ligado à barba
    c.save(); caminhoBarba(c, X, Y, [1, -1]); c.clip();
    pintarBarba(c, f.barba, 512, 512, kx, 17);
    c.fillStyle = f.barba.bigode ?? "rgba(50,36,26,0.22)";
    c.beginPath(); c.moveTo(X(-21), Y(121)); c.quadraticCurveTo(X(-19), Y(111), X(-9), Y(110.2)); c.quadraticCurveTo(X(0), Y(109.4), X(9), Y(110.2));
    c.quadraticCurveTo(X(19), Y(111), X(21), Y(121)); c.quadraticCurveTo(X(15), Y(115.5), X(0), Y(115.2)); c.quadraticCurveTo(X(-15), Y(115.5), X(-21), Y(121)); c.closePath(); c.fill();
    c.restore();
    // linha da barba (contorno de cima definido)
    c.strokeStyle = f.barba.linha ?? "rgba(60,44,32,0.55)"; c.lineWidth = 3; caminhoBarba(c, X, Y, [1, -1]); c.stroke();
  } else if (f.barba) {
    const rnd = aleatorio(11), mxB = X(0), myB = Y(116.5);
    c.fillStyle = f.barba.sombra;
    if (f.barba.cheia) {
      // barba curta: bochechas ralas (sombra suave), mandíbula um pouco mais escura e bigode ligado ao cavanhaque
      c.save(); c.filter = "blur(5px)";
      c.beginPath(); c.moveTo(X(-60), Y(100)); c.lineTo(X(-60), Y(150)); c.lineTo(X(60), Y(150)); c.lineTo(X(60), Y(100));
      c.quadraticCurveTo(X(44), Y(108), X(30), Y(111)); c.quadraticCurveTo(X(12), Y(109), X(0), Y(111)); c.quadraticCurveTo(X(-12), Y(109), X(-30), Y(111)); c.quadraticCurveTo(X(-44), Y(108), X(-60), Y(100));
      c.closePath(); c.fill();
      c.fillStyle = f.barba.mandibula; c.fillRect(X(-60), Y(138), X(60) - X(-60), Y(150) - Y(138));
      c.filter = "blur(2px)"; c.fillStyle = f.barba.cor;
      c.beginPath(); c.moveTo(X(-19), Y(112)); c.quadraticCurveTo(X(-9), Y(108.6), X(0), Y(110)); c.quadraticCurveTo(X(9), Y(108.6), X(19), Y(112));
      c.lineTo(X(21), Y(123)); c.quadraticCurveTo(X(21), Y(138), X(14), Y(146)); c.quadraticCurveTo(X(0), Y(153), X(-14), Y(146)); c.quadraticCurveTo(X(-21), Y(138), X(-21), Y(123)); c.closePath(); c.fill();
      c.restore();
    } else {
    c.beginPath(); c.moveTo(X(-42), Y(108)); c.quadraticCurveTo(X(-36), Y(140), X(0), Y(150)); c.quadraticCurveTo(X(36), Y(140), X(42), Y(108));
    c.quadraticCurveTo(X(22), Y(118), X(0), Y(111)); c.quadraticCurveTo(X(-22), Y(118), X(-42), Y(108)); c.closePath(); c.fill();
    }
    c.fillStyle = f.barba.ponto;
    for (let i = 0; i < (f.barba.pontos ?? 1600); i++) {
      const az = (rnd() - 0.5) * 92, pol = 106 + rnd() * 44;
      const lim = 104 + Math.abs(az) * 0.05 + (Math.abs(az) < 26 ? 8 : 0);
      if (pol < lim) continue;
      c.fillRect(X(az), Y(pol), 2.2, 2.2);
    }
    // bigode
    c.fillStyle = f.barba.cor;
    c.beginPath(); c.moveTo(X(-16), Y(115)); c.quadraticCurveTo(X(-8), Y(109.5), X(0), Y(111)); c.quadraticCurveTo(X(8), Y(109.5), X(16), Y(115));
    c.quadraticCurveTo(X(8), Y(113.2), X(0), Y(113.6)); c.quadraticCurveTo(X(-8), Y(113.2), X(-16), Y(115)); c.closePath(); c.fill();
    void mxB; void myB;
  }
  // nariz: risquinho
  c.strokeStyle = "#b46a52"; c.lineWidth = 6;
  c.beginPath(); c.moveTo(X(-2.8), Y(108.5)); c.quadraticCurveTo(X(0), Y(110.6), X(2.8), Y(108.5)); c.stroke();
  const mx = X(0), my = Y(116.5);
  if (f.boca === "dentes") {
    // sorriso largo de orelha a orelha mostrando os dentes de cima
    const L = 17 * kx, H = 9 * ky, yy = my - 2;
    const boca = () => { c.beginPath(); c.moveTo(mx - L, yy); c.quadraticCurveTo(mx, yy + H * 0.35, mx + L, yy); c.quadraticCurveTo(mx + L * 0.7, yy + H * 1.15, mx, yy + H * 1.2); c.quadraticCurveTo(mx - L * 0.7, yy + H * 1.15, mx - L, yy); c.closePath(); };
    boca(); c.fillStyle = "#5a1a22"; c.fill();
    c.save(); boca(); c.clip();
    c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(mx - L, yy - 6); c.quadraticCurveTo(mx, yy + H * 0.35, mx + L, yy - 6); c.lineTo(mx + L, yy + H * 0.55); c.quadraticCurveTo(mx, yy + H * 0.95, mx - L, yy + H * 0.55); c.closePath(); c.fill();
    c.strokeStyle = "rgba(150,150,160,0.7)"; c.lineWidth = 2.5;
    for (let i = -3; i <= 3; i++) { const x = mx + i * L * 0.24; c.beginPath(); c.moveTo(x, yy); c.lineTo(x, yy + H * 0.62 - Math.abs(i) * 4); c.stroke(); }
    c.fillStyle = "#e46a7c"; c.beginPath(); c.ellipse(mx, yy + H * 1.15, L * 0.4, H * 0.2, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    c.strokeStyle = f.batom; c.lineWidth = 7; boca(); c.stroke();
    c.strokeStyle = "#151515"; c.lineWidth = 5;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(mx + s * (L - 2), yy - 1); c.quadraticCurveTo(mx + s * (L + 8), yy - 4, mx + s * (L + 10), yy - 14); c.stroke(); }
  } else if (f.boca === "aberta") {
    // sorriso largo e aberto, com dentes, língua e batom
    const L = 15 * kx, H = 10.5 * ky;
    const boca = () => { c.beginPath(); c.moveTo(mx - L, my); c.quadraticCurveTo(mx, my + H * 0.22, mx + L, my); c.quadraticCurveTo(mx + L * 0.82, my + H, mx, my + H * 1.02); c.quadraticCurveTo(mx - L * 0.82, my + H, mx - L, my); c.closePath(); };
    boca(); c.fillStyle = "#4a1420"; c.fill();
    c.save(); boca(); c.clip();
    c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(mx - L, my - 4); c.quadraticCurveTo(mx, my + H * 0.22, mx + L, my - 4); c.lineTo(mx + L, my + H * 0.3); c.quadraticCurveTo(mx, my + H * 0.52, mx - L, my + H * 0.3); c.closePath(); c.fill();
    c.fillStyle = "#f2708f"; c.beginPath(); c.ellipse(mx + 4, my + H * 0.98, L * 0.55, H * 0.36, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    c.strokeStyle = f.batom; c.lineWidth = 8; boca(); c.stroke();
    c.strokeStyle = "#151515"; c.lineWidth = 5;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(mx + s * (L - 3), my - 1); c.quadraticCurveTo(mx + s * (L + 7), my - 3, mx + s * (L + 10), my - 13); c.stroke(); }
  } else {
    // sorriso discreto de boca fechada, lábios com batom rosado
    const L = 11 * kx, yy = my + 8;
    c.fillStyle = f.batom;
    c.beginPath(); c.moveTo(mx - L, yy - 2); c.quadraticCurveTo(mx - L * 0.5, yy - 16, mx, yy - 9); c.quadraticCurveTo(mx + L * 0.5, yy - 16, mx + L, yy - 2);
    c.quadraticCurveTo(mx, yy + 26, mx - L, yy - 2); c.closePath(); c.fill();
    c.strokeStyle = "#7a2c3a"; c.lineWidth = 6;
    c.beginPath(); c.moveTo(mx - L - 4, yy - 6); c.quadraticCurveTo(mx, yy + 12, mx + L + 4, yy - 6); c.stroke();
    c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath(); c.ellipse(mx + 8, yy + 9, 9, 3.5, 0, 0, Math.PI * 2); c.fill();
  }
}

// ---------------------------------------------------------------- roupas (textura do torso e do tecido)
const TORSO_Y0 = 0.74, TORSO_Y1 = 1.525, TORSO_Z = 0.74;
function listras(c, w, h, cor) { c.fillStyle = cor; for (let x = 4; x < w; x += 14) c.fillRect(x, 0, 2, h); }
// listras onduladas (tipo zebra) na horizontal
function ondas(c, w, h, r, voltas = 6) {
  c.fillStyle = r.fundo; c.fillRect(0, 0, w, h);
  for (let y0 = 22, i = 0; y0 < h + 40; y0 += 64, i++) {
    const fase = i * 1.7, amp = 9 + (i % 3) * 3;
    const yy = (x) => y0 + Math.sin(x / w * Math.PI * voltas + fase) * amp + ((x / 18 | 0) % 2 ? 2 : -2);
    c.fillStyle = r.onda;
    c.beginPath(); c.moveTo(0, yy(0));
    for (let x = 0; x <= w; x += 8) c.lineTo(x, yy(x));
    for (let x = w; x >= 0; x -= 8) c.lineTo(x, yy(x) + 16 + Math.sin(x / 23 + i) * 5);
    c.closePath(); c.fill();
    c.strokeStyle = r.fio; c.lineWidth = 3;
    c.beginPath(); for (let x = 0; x <= w; x += 8) { const y = yy(x) + 30 + Math.sin(x / 40 + i * 2) * 4; if (x) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
  }
}
// linho liso com trama bem leve e pregas suaves
function linho(c, w, h, r) {
  c.fillStyle = r.fundo; c.fillRect(0, 0, w, h);
  const rnd = aleatorio(7);
  c.fillStyle = r.trama;
  for (let i = 0; i < 900; i++) c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1);
  c.fillStyle = r.prega;
  for (let x = 20; x < w; x += 64) c.fillRect(x + rnd() * 10, 0, 3, h);
}
function desenharTecido(c, p) {
  const r = p.roupa;
  if (r.tipo === "blazer") { c.fillStyle = r.terno; c.fillRect(0, 0, 512, 512); listras(c, 512, 512, r.listra); }
  else if (r.tipo === "vestido" || r.tipo === "camiseta" || r.tipo === "regata") linho(c, 512, 512, r);
  else ondas(c, 512, 512, r, 2);
}
function desenharTorso(c, p) {
  // u em volta (frente = 256, lado esquerdo dela à direita), v de cima (gola) para baixo (barra)
  const r = p.roupa;
  const Y = (y) => ((TORSO_Y1 - y) / (TORSO_Y1 - TORSO_Y0)) * 512;
  if (r.tipo === "regata") {
    // regata/top fitness: ombros e costas de fora, alças largas, decote redondo na frente e nas costas
    linho(c, 512, 512, r);
    const pele = hex(p.pele), yo = Y(1.43);
    c.fillStyle = pele; c.fillRect(0, 0, 512, yo);
    c.fillStyle = r.fundo;
    for (const xc of [256 - 58, 256 + 58, 58, 512 - 58]) c.fillRect(xc - 14, 0, 28, yo + 2);
    c.fillStyle = pele;
    c.beginPath(); c.moveTo(256 - 44, yo - 1); c.quadraticCurveTo(256, Y(1.33), 256 + 44, yo - 1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-1, yo - 1); c.quadraticCurveTo(0, Y(1.36), 44, yo - 1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(513, yo - 1); c.quadraticCurveTo(512, Y(1.36), 512 - 44, yo - 1); c.closePath(); c.fill();
    // vivo colorido na barra e no decote
    c.strokeStyle = r.vivo; c.lineWidth = 5;
    c.beginPath(); c.moveTo(256 - 44, yo - 1); c.quadraticCurveTo(256, Y(1.33), 256 + 44, yo - 1); c.stroke();
    c.lineWidth = 7; c.beginPath(); c.moveTo(0, 500); c.lineTo(512, 500); c.stroke();
    return;
  }
  if (r.tipo === "camiseta") {
    // camiseta lisa: malha, sem estampa; barra embaixo e costuras laterais bem discretas
    linho(c, 512, 512, r);
    c.strokeStyle = r.costura; c.lineWidth = 3;
    for (const x of [128, 384]) { c.beginPath(); c.moveTo(x, 40); c.lineTo(x, 512); c.stroke(); }
    c.lineWidth = 6; c.beginPath(); c.moveTo(0, 500); c.lineTo(512, 500); c.stroke();
    return;
  }
  if (r.tipo === "vestido") {
    linho(c, 512, 512, r);
    // decote em V aberto pela gola, colar de contas (pérola e dourado), carcela com botões
    const vY = Y(1.33);
    c.fillStyle = hex(p.pele);
    c.beginPath(); c.moveTo(256 - 50, 0); c.lineTo(256 + 50, 0); c.lineTo(256, vY); c.closePath(); c.fill();
    c.strokeStyle = r.costura; c.lineWidth = 5; c.beginPath(); c.moveTo(256 - 50, 0); c.lineTo(256, vY); c.lineTo(256 + 50, 0); c.stroke();
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, x = 256 + (t - 0.5) * 70, y = Y(1.505) + Math.sin(t * Math.PI) * 30;
      c.fillStyle = i % 2 ? "#e9b84a" : "#fff8ec"; c.strokeStyle = "rgba(90,60,30,0.6)"; c.lineWidth = 1.5;
      c.beginPath(); c.arc(x, y, i % 2 ? 4.5 : 5.5, 0, Math.PI * 2); c.fill(); c.stroke();
    }
    c.strokeStyle = r.costura; c.lineWidth = 4; c.beginPath(); c.moveTo(256 + 8, vY); c.lineTo(256 + 8, 512); c.stroke();
    for (let y = vY + 40; y < 470; y += 56) { c.fillStyle = r.botao; c.beginPath(); c.arc(256 + 2, y, 7, 0, Math.PI * 2); c.fill(); c.strokeStyle = r.costura; c.lineWidth = 2; c.stroke(); }
    return;
  }
  if (r.tipo === "blusa") {
    ondas(c, 512, 512, r);
    // decote redondo com a pele e o colar fino dourado
    c.fillStyle = hex(p.pele);
    c.beginPath(); c.moveTo(256 - 64, 0); c.quadraticCurveTo(256 - 50, Y(1.44), 256, Y(1.43)); c.quadraticCurveTo(256 + 50, Y(1.44), 256 + 64, 0); c.closePath(); c.fill();
    c.strokeStyle = r.gola; c.lineWidth = 6;
    c.beginPath(); c.moveTo(256 - 64, 0); c.quadraticCurveTo(256 - 50, Y(1.44), 256, Y(1.43)); c.quadraticCurveTo(256 + 50, Y(1.44), 256 + 64, 0); c.stroke();
    c.strokeStyle = "#e7b53c"; c.lineWidth = 5;
    c.beginPath(); c.moveTo(256 - 46, 0); c.quadraticCurveTo(256, Y(1.47) + 10, 256 + 46, 0); c.stroke();
    const yb = Y(r.barra ?? TORSO_Y0) - 5;
    c.lineWidth = 8; c.strokeStyle = r.gola; c.beginPath(); c.moveTo(0, yb); c.lineTo(512, yb); c.stroke();
    return;
  }
  c.fillStyle = r.terno; c.fillRect(0, 0, 512, 512);
  listras(c, 512, 512, r.listra);
  // blusa em V e lapelas com o recorte (gola alfaiate)
  const vY = Y(1.17);
  c.fillStyle = r.blusa;
  c.beginPath(); c.moveTo(256 - 58, 0); c.lineTo(256 + 58, 0); c.lineTo(256, vY); c.closePath(); c.fill();
  c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(256 - 50, 0, 100, 10);
  for (const s of [-1, 1]) {
    c.fillStyle = r.lapela; c.strokeStyle = r.costura; c.lineWidth = 4;
    c.beginPath();
    c.moveTo(256 + s * 58, 0); c.lineTo(256 + s * 2, vY); c.lineTo(256 + s * 30, vY - 40); c.lineTo(256 + s * 92, 92);
    c.lineTo(256 + s * 74, 84); c.lineTo(256 + s * 96, 52); c.lineTo(256 + s * 92, 0);
    c.closePath(); c.fill(); c.stroke();
  }
  // abotoamento e a abertura do blazer embaixo
  c.strokeStyle = r.costura; c.lineWidth = 4;
  c.beginPath(); c.moveTo(256, vY); c.lineTo(256, Y(1.03)); c.quadraticCurveTo(256 - 6, Y(0.9), 256 - 34, 512); c.stroke();
  c.beginPath(); c.moveTo(256, Y(1.03)); c.quadraticCurveTo(256 + 6, Y(0.9), 256 + 34, 512); c.stroke();
  c.fillStyle = r.blusa; c.beginPath(); c.arc(256, Y(1.07), 12, 0, Math.PI * 2); c.fill(); c.stroke();
  // bolsos com aba
  for (const s of [-1, 1]) { c.fillStyle = r.lapela; c.beginPath(); c.roundRect(256 + s * 112 - 38, Y(0.93) - 8, 76, 18, 6); c.fill(); c.stroke(); }
  // barra, costura das costas e das laterais
  c.lineWidth = 3; c.globalAlpha = 0.6;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 512); c.moveTo(512, 0); c.lineTo(512, 512); c.stroke();
  for (const x of [128, 384]) { c.beginPath(); c.moveTo(x, 70); c.lineTo(x, 512); c.stroke(); }
  c.globalAlpha = 1; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 508); c.lineTo(512, 508); c.stroke();
}

// capa do objeto da mão (192 × 256)
function desenharCapa(c, tipo) {
  if (tipo === "biblia") {
    c.fillStyle = "#c41d2a"; c.fillRect(0, 0, 192, 256);
    c.fillStyle = "rgba(0,0,0,0.15)"; c.fillRect(0, 0, 14, 256);
    c.strokeStyle = "#f5c542"; c.lineWidth = 4; c.strokeRect(22, 12, 158, 232);
    c.fillStyle = "#f5c542"; c.fillRect(96 - 9, 40, 18, 92); c.fillRect(96 - 32, 66, 64, 18);
    c.font = "900 38px 'Baloo 2', system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("BÍBLIA", 101, 176);
    c.font = "700 22px 'Baloo 2', system-ui, sans-serif"; c.fillText("Sagrada", 101, 210);
  } else if (tipo === "prancheta") {
    // folha do alvará presa na prancheta: título, linhas e carimbo
    c.fillStyle = "#fffdf6"; c.fillRect(0, 0, 192, 256);
    c.fillStyle = "#1f4fa8"; c.font = "900 34px 'Baloo 2', system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("ALVARÁ", 96, 46);
    c.fillStyle = "#b9c2d0"; for (let i = 0; i < 6; i++) c.fillRect(24, 84 + i * 20, i % 3 === 2 ? 90 : 144, 7);
    c.strokeStyle = "#2a9a4a"; c.lineWidth = 6; c.beginPath(); c.arc(140, 212, 26, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(127, 212); c.lineTo(137, 222); c.lineTo(154, 201); c.stroke();
    c.strokeStyle = "#151515"; c.lineWidth = 3; c.beginPath(); c.moveTo(24, 226); c.quadraticCurveTo(50, 206, 64, 222); c.quadraticCurveTo(76, 234, 96, 214); c.stroke();
  }
}

// selo de texto (ex.: "RISE UP" branco na roupa ou no boné): fundo transparente, só as letras
function desenharSelo(c, selo) {
  c.clearRect(0, 0, 512, 256);
  let tam = 150; c.font = `900 ${tam}px 'Baloo 2', system-ui, sans-serif`;
  while (c.measureText(selo.texto).width > 470) { tam -= 6; c.font = `900 ${tam}px 'Baloo 2', system-ui, sans-serif`; }
  c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round";
  if (selo.borda) { c.strokeStyle = selo.borda; c.lineWidth = 14; c.strokeText(selo.texto, 256, 136); }
  c.fillStyle = selo.cor; c.fillText(selo.texto, 256, 136);
}
function desenharLogo(c, im, borda = "#c51b72", fio = "#f3a3c9") {
  // selo branco bordado: a logo azul precisa de fundo claro para aparecer no rosa
  c.clearRect(0, 0, 512, 256);
  c.fillStyle = borda; c.beginPath(); c.roundRect(4, 4, 504, 248, 54); c.fill();
  c.fillStyle = "#ffffff"; c.beginPath(); c.roundRect(14, 14, 484, 228, 46); c.fill();
  c.setLineDash([10, 8]); c.strokeStyle = fio; c.lineWidth = 3; c.beginPath(); c.roundRect(26, 26, 460, 204, 38); c.stroke(); c.setLineDash([]);
  if (im) { const h = 196, w = (im.naturalWidth / im.naturalHeight) * h; c.drawImage(im, 256 - w / 2, 128 - h / 2 + 2, w, h); }
}

const atlas = new Map(); // id → { aberto, fechado }
function texturasDe(id, p) {
  if (atlas.has(id)) return atlas.get(id);
  const em = (c, reg, fn) => { const [x, y, w, h] = REG[reg]; c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, w, h); c.clip(); fn(); c.restore(); };
  const fazer = (fechado) => texturaCanvas(ATLAS, ATLAS, (c) => {
    c.clearRect(0, 0, ATLAS, ATLAS);
    em(c, "branco", () => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, 320, 256); });
    if (p.rosto.barba?.textura) em(c, "barba", () => desenharBarbaCasca(c, p.rosto.barba));
    em(c, "tecido", () => desenharTecido(c, p));
    em(c, "torso", () => desenharTorso(c, p));
    em(c, "capa", () => desenharCapa(c, p.objeto?.tipo));
    em(c, "logo", () => (p.selo ? desenharSelo(c, p.selo) : desenharLogo(c, null)));
    em(c, "rosto", () => desenharRosto(c, p, fechado));
  });
  const t = { aberto: fazer(false), fechado: fazer(true) };
  for (const tx of [t.aberto, t.fechado]) tx.anisotropy = 4;
  atlas.set(id, t);
  // a logo chega depois: desenha por cima nas duas texturas
  if (p.logo) carregarLogo(p.logo.url, (im) => {
    for (const tx of [t.aberto, t.fechado]) { em(tx.image.getContext("2d"), "logo", () => desenharLogo(tx.image.getContext("2d"), im)); tx.needsUpdate = true; }
  });
  if (p.selo) document.fonts?.ready?.then(() => {
    for (const tx of [t.aberto, t.fechado]) { const c = tx.image.getContext("2d"); em(c, "logo", () => desenharSelo(c, p.selo)); tx.needsUpdate = true; }
  });
  // a fonte da capa pode chegar depois também
  if (p.objeto) document.fonts?.ready?.then(() => {
    for (const tx of [t.aberto, t.fechado]) { const c = tx.image.getContext("2d"); em(c, "capa", () => desenharCapa(c, p.objeto.tipo)); tx.needsUpdate = true; }
  });
  return t;
}

// material do contorno: casca preta empurrada pela "normal" da casca (já com o esqueleto aplicado)
let matContorno = null;
function materialContorno() {
  if (matContorno) return matContorno;
  matContorno = new THREE.MeshBasicMaterial({ color: 0x151515, side: THREE.BackSide });
  matContorno.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float contorno;")
      .replace("#include <skinning_vertex>", "#include <skinning_vertex>\ntransformed += objectNormal * contorno;");
  };
  matContorno.customProgramCacheKey = () => "contorno-pessoa";
  return matContorno;
}

// ---------------------------------------------------------------- ossos (posições de descanso, em metros)
const OSSOS = [
  ["quadril", -1, [0, 0.88, 0]],
  ["tronco", 0, [0, 1.0, 0]],
  ["cabeca", 1, [0, 1.58, 0]],
  ["ombroE", 1, [0.285, 1.4, 0]],
  ["cotoveloE", 3, [0.29, 1.12, 0]],
  ["maoE", 4, [0.29, 0.82, 0]],
  ["objeto", 5, [0.29, 0.82, 0]],
  ["ombroD", 1, [-0.285, 1.4, 0]],
  ["cotoveloD", 7, [-0.29, 1.12, 0]],
  ["maoD", 8, [-0.29, 0.82, 0]],
  ["pernaE", 0, [0.105, 0.88, 0]],
  ["joelhoE", 10, [0.105, 0.5, 0]],
  ["pernaD", 0, [-0.105, 0.88, 0]],
  ["joelhoD", 12, [-0.105, 0.5, 0]],
  ["cabeloTras", 1, [0, 1.64, -0.12]],
];
const O = Object.fromEntries(OSSOS.map(([n], i) => [n, i]));

// ---------------------------------------------------------------- cabeça e tronco (medidas)
const R = 0.25, HC = new V3(0, 1.825, 0), HS = new V3(0.78, 1.08, 0.92); // cabeça oval: raio, centro e achatamento (HS muda por pessoa)
const HS_PADRAO = HS.clone();
let queixo = 0.3; // quanto o queixo afina (0 = cabeça redonda)
// afina o queixo (rosto oval): estreita a parte de baixo da cabeça, mais nos lados que na frente
const afinar = (x, y, z) => {
  const r = Math.hypot(x, y, z) || 1, el = Math.asin(THREE.MathUtils.clamp(y / r, -1, 1));
  const t = sstep(-el, -0.05, 1.25);
  return [x * (1 - queixo * t), y, z * (1 - queixo * 0.33 * t)];
};
function formaCabeca(g) {
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const [x, y, z] = afinar(P.getX(i), P.getY(i), P.getZ(i)); P.setXYZ(i, x, y, z); }
  g.computeVertexNormals();
  return g;
}
const naCabeca = (az, el, k = 1) => {
  const [x, y, z] = afinar(Math.sin(az) * Math.cos(el) * R * k, Math.sin(el) * R * k, Math.cos(az) * Math.cos(el) * R * k);
  return new V3(x * HS.x, y * HS.y, z * HS.z).add(HC);
};
const rTorso = (() => {
  const chaves = [[0.74, 0.236], [0.8, 0.246], [0.9, 0.238], [0.97, 0.222], [1.04, 0.207], [1.14, 0.216], [1.25, 0.238], [1.34, 0.244], [1.41, 0.232], [1.47, 0.192], [1.505, 0.12], [1.525, 0.0]];
  const sp = new THREE.SplineCurve(chaves.map(([y, r]) => new THREE.Vector2(r, y)));
  const am = sp.getPoints(240);
  return (y) => { for (let i = 1; i < am.length; i++) if (am[i].y >= y) { const a = am[i - 1], b = am[i]; return lerp(a.x, b.x, (y - a.y) / Math.max(1e-6, b.y - a.y)); } return 0; };
})();
// ajuste do corpo da pessoa que está sendo montada (cintura mais marcada, barra mais alta)
let corpoAtual = { aperto: 0, barra: TORSO_Y0, gordo: 1, barriga: 0, z: TORSO_Z };
const raio = (y) => rTorso(y) * corpoAtual.gordo * (1 - corpoAtual.aperto * Math.exp(-(((y - 1.07) / 0.13) ** 2)) + corpoAtual.barriga * Math.exp(-(((y - 1.02) / 0.16) ** 2)));
const naRoupa = (a, y, fora = 0) => {
  const r = raio(y);
  const Z = corpoAtual.z, n = new V3(Math.sin(a), 0, Math.cos(a) / Z).normalize();
  return new V3(r * Math.sin(a), y, r * Z * Math.cos(a)).addScaledVector(n, fora);
};
// selo curvo colado na roupa (logo), afastado "fora" metros: sem briga de profundidade
function seloNaRoupa(a0, y0, W, H, fora) {
  const nx = 8, ny = 3, r0 = raio(y0), da = W / (r0 * Math.hypot(Math.cos(a0), corpoAtual.z * Math.sin(a0)));
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const q = naRoupa(a0 + (i / nx - 0.5) * da, y0 + (j / ny - 0.5) * H, fora); pos.push(q.x, q.y, q.z); uv.push(i / nx, j / ny); }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + nx + 1; idx.push(a, a + 1, b + 1, a, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- penteados
// h: { m, cabelo(pontos, opções, peso, contorno, cor), naCabeca, pesoFrente, pesoTras, calota(H, opções) }
const CABELOS = {
  // Sabrina: liso, longo, repartido do lado direito dela com a franja varrida; o lado direito cai na frente do ombro
  sabrinaLado(h) {
    const { cabelo, naCabeca: nc, pesoFrente, pesoTras } = h;
    h.calota((az) => 0.5 - 0.1 * THREE.MathUtils.clamp(az, -1, 1));
    cabelo([nc(-0.5, 1.12, 1.05), nc(-0.18, 0.86, 1.1), nc(0.3, 0.64, 1.11), nc(0.72, 0.48, 1.1), nc(1.0, 0.24, 1.08), nc(1.1, -0.06, 1.05)], { w0: 0.16, w1: 0.1, d0: 0.06, d1: 0.04 });
    cabelo([nc(-0.5, 1.12, 1.05), nc(-0.72, 0.82, 1.1), nc(-0.98, 0.46, 1.1), nc(-1.1, 0.12, 1.07), nc(-1.14, -0.12, 1.04)], { w0: 0.12, w1: 0.08, d0: 0.05, d1: 0.035 });
    cabelo([nc(-1.55, 0.35, 1.02), nc(-1.62, -0.05, 1.08), new V3(-0.23, 1.6, 0.06), new V3(-0.225, 1.48, 0.15), new V3(-0.21, 1.34, 0.2), new V3(-0.2, 1.2, 0.215), new V3(-0.22, 1.13, 0.22)], { w0: 0.15, w1: 0.11, d0: 0.07, d1: 0.04, passos: 12 }, pesoFrente);
    cabelo([nc(-1.85, 0.3, 1.02), nc(-1.9, -0.1, 1.08), new V3(-0.28, 1.6, -0.01), new V3(-0.29, 1.46, 0.08), new V3(-0.285, 1.32, 0.12), new V3(-0.3, 1.24, 0.13)], { w0: 0.12, w1: 0.08, d0: 0.06, d1: 0.035 }, pesoFrente);
    // lado esquerdo dela: por cima do ombro, caindo para trás (deixa a logo à mostra)
    cabelo([nc(1.55, 0.35, 1.02), nc(1.66, -0.05, 1.08), new V3(0.25, 1.6, -0.04), new V3(0.27, 1.5, -0.11), new V3(0.25, 1.34, -0.15), new V3(0.26, 1.24, -0.15)], { w0: 0.15, w1: 0.1, d0: 0.07, d1: 0.04 }, pesoTras);
    h.costas(1.13);
    h.brilho();
  },
  // Carina: preto, cacheado e volumoso até os ombros, repartido do lado direito dela; cachos de bolinhas + espirais
  carinaCachos(h) {
    const { m, naCabeca: nc, cb } = h;
    const H = (az) => 0.56 - 0.08 * THREE.MathUtils.clamp(az, -1, 1);
    h.calota(H, { volume: 0.1 });
    const rnd = aleatorio(31);
    const bola = (P, r, peso) => m.add(new THREE.SphereGeometry(1, 6, 5), { cor: rnd() < 0.55 ? cb.cor : cb.cor2, osso: peso, pos: P.toArray(), esc: [r, r * 0.9, r], rot: [rnd() * 3, rnd() * 3, 0], contorno: 0.008 });
    // casca de cachos em volta da cabeça (espiral de Fibonacci), sem cobrir o rosto
    const N = 46;
    for (let i = 0; i < N; i++) {
      const yy = 1 - ((i + 0.5) / N) * 1.25, el = Math.asin(THREE.MathUtils.clamp(yy, -1, 1)), az = ((i * 2.39996) % (Math.PI * 2)) - Math.PI;
      if (Math.abs(az) < 1.2 && el < H(az) + 0.16) continue;
      bola(nc(az, el, 1.1 + rnd() * 0.07), 0.048 + rnd() * 0.014, O.cabeca);
    }
    // franja de cachos varrida na testa (do lado da risca para o outro)
    for (const [az, el] of [[-0.35, 0.95], [-0.05, 0.86], [0.25, 0.78], [0.55, 0.68], [0.85, 0.52], [1.05, 0.32], [-0.7, 0.8], [-0.95, 0.55]]) bola(nc(az, el, 1.1), 0.05, O.cabeca);
    // volume descendo até os ombros pelos lados e pelas costas
    for (const [y, rr, n] of [[1.75, 0.235, 14], [1.66, 0.26, 14], [1.57, 0.27, 13], [1.49, 0.27, 11]]) {
      for (let k = 0; k < n; k++) {
        const az = -Math.PI + ((k + rnd() * 0.4) / n) * Math.PI * 2;
        if (Math.abs(az) < (y > 1.6 ? 1.15 : 1.35)) continue;
        const P = new V3(Math.sin(az) * rr, y + (rnd() - 0.5) * 0.03, Math.cos(az) * rr * 0.86 - 0.02);
        bola(P, 0.054 + rnd() * 0.016, y > 1.7 ? O.cabeca : Math.cos(az) < -0.2 ? O.cabeloTras : O.tronco);
      }
    }
    // cachos em espiral (molinha) caindo dos lados do rosto e atrás
    for (const [az, y0, comp] of [[-1.22, 1.74, 0.22], [1.2, 1.72, 0.2], [-1.6, 1.66, 0.24], [1.62, 1.66, 0.22], [-2.4, 1.56, 0.17], [2.4, 1.56, 0.17], [3.1, 1.52, 0.16]]) {
      const base = new V3(Math.sin(az) * 0.25, y0, Math.cos(az) * 0.22 - 0.01), pts = [];
      for (let i = 0; i <= 24; i++) { const t = i / 24, th = t * Math.PI * 2 * 2.5; pts.push(base.clone().add(new V3(Math.cos(th) * 0.024, -t * comp, Math.sin(th) * 0.024))); }
      const peso = Math.cos(az) < -0.2 ? h.pesoTras : h.pesoFrente;
      m.add(mecha(pts, { w0: 0.042, w1: 0.03, d0: 0.036, d1: 0.026, lados: 4, passos: 18, fora: (P) => new V3(P.x - base.x, 0.001, P.z - base.z) }), { cor: cb.cor, osso: peso, contorno: 0.007 });
    }
  },
  // careca (o boné, quando tem, vem por cima)
  careca() {},
  // Camila: loira com raiz castanho-clara, comprida, ondas largas nas pontas, repartida de lado e com o volume caindo
  // na frente do ombro direito dela; do lado esquerdo fica atrás da orelha (aparece a argola grande)
  camilaOndas(h) {
    const { cabelo, naCabeca: nc, pesoFrente, pesoTras } = h;
    const onda = (pts, amp = 0.028, fase = 0) => pts.map((q) => (q.y < 1.6 ? q.clone().add(new V3(Math.sin(q.y * 26 + fase) * amp * sstep(1.6 - q.y, 0, 0.15) * Math.sign(q.x || 1), 0, Math.cos(q.y * 26 + fase) * amp * 0.4)) : q));
    h.calota((az) => 0.52 - 0.1 * THREE.MathUtils.clamp(az, -1, 1), { volume: 0.06 });
    cabelo([nc(-0.45, 1.12, 1.05), nc(-0.1, 0.88, 1.11), nc(0.35, 0.64, 1.12), nc(0.75, 0.46, 1.11), nc(1.02, 0.2, 1.09), nc(1.12, -0.12, 1.06)], { w0: 0.17, w1: 0.11, d0: 0.065, d1: 0.045 });
    cabelo([nc(-0.45, 1.12, 1.05), nc(-0.75, 0.8, 1.11), nc(-1.0, 0.42, 1.11), nc(-1.12, 0.06, 1.08), nc(-1.16, -0.2, 1.05)], { w0: 0.13, w1: 0.09, d0: 0.055, d1: 0.04 });
    // volume da frente, do lado direito dela, em ondas
    cabelo(onda([nc(-1.5, 0.35, 1.03), nc(-1.6, -0.1, 1.1), new V3(-0.24, 1.6, 0.07), new V3(-0.24, 1.47, 0.16), new V3(-0.22, 1.33, 0.2), new V3(-0.21, 1.2, 0.22), new V3(-0.24, 1.11, 0.22)]), { w0: 0.17, w1: 0.13, d0: 0.075, d1: 0.05, passos: 14 }, pesoFrente);
    cabelo(onda([nc(-1.82, 0.3, 1.03), nc(-1.9, -0.1, 1.09), new V3(-0.29, 1.6, 0.0), new V3(-0.3, 1.46, 0.08), new V3(-0.29, 1.32, 0.12), new V3(-0.31, 1.2, 0.13)], 0.03, 1.5), { w0: 0.14, w1: 0.1, d0: 0.065, d1: 0.04, passos: 12 }, pesoFrente);
    cabelo(onda([nc(-1.2, 0.2, 1.06), nc(-1.3, -0.3, 1.1), new V3(-0.19, 1.58, 0.1), new V3(-0.17, 1.45, 0.19), new V3(-0.15, 1.32, 0.215), new V3(-0.16, 1.24, 0.22)], 0.022, 2.6), { w0: 0.1, w1: 0.07, d0: 0.05, d1: 0.03, passos: 12 }, pesoFrente);
    // lado esquerdo dela: atrás da orelha, caindo pelas costas em ondas
    cabelo(onda([nc(1.6, 0.35, 1.02), nc(1.72, -0.05, 1.08), new V3(0.25, 1.6, -0.05), new V3(0.27, 1.48, -0.12), new V3(0.25, 1.33, -0.15), new V3(0.27, 1.22, -0.15)]), { w0: 0.15, w1: 0.1, d0: 0.07, d1: 0.04, passos: 12 }, pesoTras);
    for (const [i, aDeg] of [130, 155, 180, 205, 230].entries()) {
      const a = THREE.MathUtils.degToRad(aDeg), sa = Math.sin(a), ca = Math.cos(a), comp = [0, 0.03, -0.02, 0.025, 0][i];
      cabelo(onda([nc(a, 0.5, 1.0), nc(a, -0.15, 1.1), new V3(sa * 0.27, 1.55, ca * 0.26 - 0.04), new V3(sa * 0.27, 1.4, ca * 0.25 - 0.03), new V3(sa * 0.27, 1.24 - comp, ca * 0.25 - 0.02), new V3(sa * 0.3, 1.15 - comp, ca * 0.29 - 0.02)], 0.026, i), { w0: 0.2, w1: 0.13, d0: 0.08, d1: 0.045, passos: 12 }, pesoTras);
    }
    h.brilho(0.92);
  },
  // Aurélio: curto, loiro-grisalho, penteado para o lado, com entradas na testa
  aurelioCurto(h) {
    const { cabelo, naCabeca: nc } = h;
    h.calota((az) => 0.78 + 0.26 * Math.exp(-(((Math.abs(az) - 0.62) / 0.24) ** 2)), { volume: 0.06, k: 1.05 });
    // topete curto varrido para o lado esquerdo dele
    cabelo([nc(-0.55, 1.12, 1.03), nc(-0.15, 1.02, 1.07), nc(0.25, 0.96, 1.075), nc(0.6, 0.86, 1.06)], { w0: 0.15, w1: 0.11, d0: 0.045, d1: 0.03, passos: 7 });
    cabelo([nc(-0.5, 1.2, 1.03), nc(0.05, 1.12, 1.07), nc(0.5, 1.02, 1.07), nc(0.85, 0.82, 1.05)], { w0: 0.13, w1: 0.09, d0: 0.04, d1: 0.028, passos: 7 });
    h.brilho(1.0);
  },
  // Elaine: liso, abaixo dos ombros, risca quase no meio, caindo dos dois lados do rosto; raiz escura e pontas caramelo
  elaineMeio(h) {
    const { cabelo, naCabeca: nc, pesoFrente } = h;
    h.calota((az) => 0.66 - 0.04 * THREE.MathUtils.clamp(az, -1, 1), { volume: 0.06 });
    // as duas "cortinas" que saem da risca e emolduram o rosto
    cabelo([nc(-0.14, 1.2, 1.05), nc(0.25, 0.92, 1.1), nc(0.68, 0.62, 1.11), nc(0.98, 0.28, 1.1), nc(1.12, -0.08, 1.08), nc(1.2, -0.42, 1.08)], { w0: 0.15, w1: 0.1, d0: 0.06, d1: 0.04 });
    cabelo([nc(-0.14, 1.2, 1.05), nc(-0.5, 0.92, 1.1), nc(-0.86, 0.62, 1.11), nc(-1.08, 0.28, 1.1), nc(-1.18, -0.08, 1.08), nc(-1.24, -0.42, 1.08)], { w0: 0.15, w1: 0.1, d0: 0.06, d1: 0.04 });
    // mechas da frente: caem na frente dos dois ombros até o peito
    for (const s of [1, -1]) {
      cabelo([nc(s * 1.3, 0.3, 1.04), nc(s * 1.36, -0.25, 1.1), new V3(s * 0.2, 1.6, 0.07), new V3(s * 0.215, 1.47, 0.15), new V3(s * 0.205, 1.33, 0.2), new V3(s * 0.2, 1.22, 0.215), new V3(s * 0.22, 1.16, 0.22)], { w0: 0.15, w1: 0.11, d0: 0.07, d1: 0.04, passos: 12 }, pesoFrente);
      cabelo([nc(s * 1.75, 0.3, 1.02), nc(s * 1.8, -0.1, 1.08), new V3(s * 0.27, 1.6, 0.0), new V3(s * 0.285, 1.46, 0.07), new V3(s * 0.28, 1.33, 0.1), new V3(s * 0.3, 1.26, 0.11)], { w0: 0.12, w1: 0.08, d0: 0.06, d1: 0.035 }, pesoFrente);
    }
    h.costas(1.18);
    h.brilho(0.9);
  },
};

// ---------------------------------------------------------------- montagem do corpo
function montarPessoa(p) {
  const m = new Montador();
  const cap = (r, l, capSeg = 2, rad = 8) => new THREE.CapsuleGeometry(r, l, capSeg, rad);
  const esf = (ws = 12, hs = 8) => new THREE.SphereGeometry(1, ws, hs);
  const SKIN = p.pele, r = p.roupa;

  // --- tronco (lathe) com a textura da roupa
  const G = { ombros: 1, quadril: 1, gordo: 1, barriga: 0, z: TORSO_Z, braco: 1, perna: 1, pescoco: 0.064, cabeca: HS_PADRAO.toArray(), queixo: 0.3, ...(p.corpo ?? {}) };
  corpoAtual = { aperto: r.aperto ?? 0, barra: r.barra ?? TORSO_Y0, gordo: G.gordo, barriga: G.barriga, z: G.z };
  HS.set(...G.cabeca); queixo = G.queixo; regBranco = p.rosto.barba?.textura ? "brancoEstreito" : "branco";
  const y0 = corpoAtual.barra;
  const pts = [new THREE.Vector2(0.0001, y0)];
  const NP = 22;
  for (let i = 0; i <= NP; i++) { const y = lerp(y0, TORSO_Y1 - 0.004, i / NP); pts.push(new THREE.Vector2(Math.max(0.0001, raio(y) * (y < y0 + 0.03 ? 0.97 : 1)), y)); }
  const torso = new THREE.LatheGeometry(pts, 20, Math.PI, Math.PI * 2);
  torso.scale(1, 1, corpoAtual.z);
  m.add(torso, { osso: (q) => (q.y < 0.92 ? [[O.quadril, 1 - sstep(q.y, 0.82, 0.92)], [O.tronco, sstep(q.y, 0.82, 0.92)]] : [[O.tronco, 1]]), regiao: "torso", uvFn: (q, u) => [u, (q.y - TORSO_Y0) / (TORSO_Y1 - TORSO_Y0)], contorno: 0.016 });
  // vestido: saia evasê até o joelho, cinto na cintura e gola de camisa
  if (r.saia) {
    const sp = [];
    const N = 14, ya = 1.0, yb = r.saia.fim;
    sp.push(new THREE.Vector2(0.0001, yb));
    for (let i = 0; i <= N; i++) { const y = lerp(yb, ya, i / N), t = (ya - y) / (ya - yb); sp.push(new THREE.Vector2(Math.max(raio(y) * 1.03 + 0.006, lerp(raio(ya) + 0.006, r.saia.raio, Math.pow(t, 0.8))), y)); }
    const saia = new THREE.LatheGeometry(sp, 20, Math.PI, Math.PI * 2); saia.scale(1, 1, 0.82);
    m.add(saia, { osso: O.quadril, regiao: "tecido", contorno: 0.016 });
    const rb = raio(1.022) + 0.008;
    const cinto = new THREE.LatheGeometry([new THREE.Vector2(rb - 0.004, 0.998), new THREE.Vector2(rb + 0.004, 1.004), new THREE.Vector2(rb + 0.006, 1.022), new THREE.Vector2(rb + 0.004, 1.04), new THREE.Vector2(rb - 0.004, 1.046)], 20);
    cinto.scale(1, 1, corpoAtual.z * 1.04);
    m.add(cinto, { cor: r.cinto, osso: O.tronco, contorno: 0.006 });
    const fivela = naRoupa(0.55, 1.022, 0.014);
    m.add(esf(10, 6), { cor: p.ouro, osso: O.tronco, pos: fivela.toArray(), rot: [0, 0.55, 0], esc: [0.022, 0.022, 0.01], contorno: 0.004 });
  }
  if (r.gola) {
    const gola = new THREE.TorusGeometry(0.08, 0.014, 5, 16, Math.PI * 2 - 1.0);
    m.add(gola, { cor: r.gola, osso: O.tronco, pos: [0, 1.525, 0], rot: [Math.PI / 2, 0, Math.PI / 2 + 0.5], esc: [1, 1, 1.4], contorno: 0.006 });
    for (const s of [1, -1]) m.add(esf(8, 6), { cor: r.gola, osso: O.tronco, pos: [s * 0.055, 1.5, 0.11], rot: [0.5, s * 0.5, s * 0.7], esc: [0.045, 0.012, 0.035], contorno: 0.006 });
  }
  // quadril da calça
  const calca = r.calcaTecido ? { regiao: "tecido", cor: r.calca } : { cor: r.calca };
  m.add(esf(12, 8), { osso: O.quadril, ...calca, pos: [0, 0.86, 0], esc: [0.205 * G.gordo * G.quadril, 0.11, 0.155 * G.gordo], contorno: 0.014 });
  if (p.selo?.onde === "peito") m.add(seloNaRoupa(0, p.selo.y ?? 1.3, p.selo.w ?? 0.17, (p.selo.w ?? 0.17) / 2, 0.006), { osso: O.tronco, regiao: "logo", contorno: 0 });
  // logo no peito, lado esquerdo dela: selo curvo acompanhando a roupa, 8 mm para fora (sem piscar)
  if (p.logo) m.add(seloNaRoupa(p.logo.a, p.logo.y, p.logo.w, p.logo.w / 2, 0.008), { osso: O.tronco, regiao: "logo", contorno: 0 });
  // broche redondo (Elaine)
  if (p.broche) { const q = naRoupa(p.broche.a, p.broche.y, 0.004), ang = Math.atan2(q.x, q.z / corpoAtual.z); m.add(esf(10, 6), { cor: p.broche.cor, osso: O.tronco, pos: q.toArray(), rot: [0, ang, 0], esc: [0.032, 0.032, 0.014], contorno: 0.006 }); m.add(esf(6, 4), { cor: 0x8fa2e0, osso: O.tronco, pos: naRoupa(p.broche.a - 0.04, p.broche.y + 0.012, 0.016).toArray(), esc: [0.009, 0.006, 0.003], contorno: 0 }); }

  // --- pescoço, colar, cabeça, orelhas, brincos, rosto
  m.add(cap(G.pescoco, 0.05, 2, 8), { cor: SKIN, osso: O.tronco, pos: [0, 1.545, 0], contorno: 0.01 });
  if (p.gargantilha) m.add(new THREE.TorusGeometry(G.pescoco + 0.002, p.corrente ? 0.004 : 0.007, 4, 18), { cor: p.gargantilha, osso: O.tronco, pos: [0, p.corrente ? 1.53 : 1.548, 0.006], rot: [Math.PI / 2 + (p.corrente ? 0.3 : 0.12), 0, 0], contorno: 0 });
  // gola careca da camiseta (ribana)
  if (r.tipo === "camiseta") m.add(new THREE.TorusGeometry(G.pescoco + 0.012, 0.012, 5, 18), { cor: r.ribana, osso: O.tronco, pos: [0, 1.508, 0.004], rot: [Math.PI / 2 + 0.1, 0, 0], esc: [1, 1.15, 1], contorno: 0.006 });
  if (p.cabelo?.estilo === "careca" && p.cabelo.lustro) {
    // careca: brilho suave no alto da cabeça e sombra de cabelo raspado nas laterais e na nuca (malha um pouco mais fina)
    const pele = new THREE.Color(SKIN), luz = new THREE.Color(0xffffff), raspado = new THREE.Color(p.cabelo.raspado ?? 0xc9a48e), q = new V3();
    const corCab = (pp) => {
      q.copy(pp).sub(HC).divide(HS).normalize();
      const az = Math.abs(Math.atan2(q.x, q.z)), el = Math.asin(THREE.MathUtils.clamp(q.y, -1, 1));
      const brilho = sstep(q.dot(new V3(0, 0.88, 0.47)), 0.9, 0.99);
      const sombra = sstep(el, -0.4, -0.15) * (1 - sstep(el, 0.5, 0.85)) * sstep(az, 1.2, 1.6);
      return pele.clone().lerp(raspado, 0.7 * sombra).lerp(luz, 0.3 * brilho);
    };
    m.add(formaCabeca(new THREE.SphereGeometry(R, 34, 22)), { cor: SKIN, corFn: corCab, osso: O.cabeca, pos: HC.toArray(), esc: HS.toArray(), contorno: 0.016 });
  } else m.add(formaCabeca(new THREE.SphereGeometry(R, 28, 18)), { cor: SKIN, osso: O.cabeca, pos: HC.toArray(), esc: HS.toArray(), contorno: 0.016 });
  for (const s of [1, -1]) {
    m.add(esf(8, 6), { cor: SKIN, osso: O.cabeca, pos: naCabeca(s * 1.57, -0.08, 0.97).toArray(), esc: [0.03, 0.054, 0.042], contorno: 0.01 });
    if (p.brinco === "pendente") {
      const b0 = naCabeca(s * 1.53, -0.32, 1.0);
      m.add(esf(8, 6), { cor: p.ouro, osso: O.cabeca, pos: b0.toArray(), esc: 0.014, contorno: 0.004 });
      m.add(cap(0.006, 0.03, 2, 5), { cor: p.ouro, osso: O.cabeca, pos: [b0.x, b0.y - 0.028, b0.z], contorno: 0.003 });
      m.add(esf(8, 6), { cor: p.ouro, osso: O.cabeca, pos: [b0.x, b0.y - 0.058, b0.z], esc: [0.014, 0.02, 0.014], contorno: 0.004 });
    } else if (p.brinco === "argola") m.add(new THREE.TorusGeometry(0.022 * (p.brincoTam ?? 1), 0.005 * Math.sqrt(p.brincoTam ?? 1), 4, 16), { cor: p.ouro, osso: O.cabeca, pos: naCabeca(s * 1.55, -0.36 - 0.12 * ((p.brincoTam ?? 1) - 1), 1.02).toArray(), rot: [0, Math.PI / 2, 0], contorno: 0.004 });
    else if (p.brinco) m.add(esf(8, 6), { cor: p.ouro, osso: O.cabeca, pos: naCabeca(s * 1.53, -0.32, 1.0).toArray(), esc: 0.018, contorno: 0.006 });
  }
  {
    const d2r = THREE.MathUtils.degToRad;
    const rosto = formaCabeca(new THREE.SphereGeometry(R * 1.006, 14, 12, Math.PI / 2 - d2r(ROSTO.az), d2r(2 * ROSTO.az), d2r(ROSTO.pol0), d2r(ROSTO.pol1 - ROSTO.pol0)));
    m.add(rosto, { osso: O.cabeca, regiao: "rosto", pos: HC.toArray(), esc: HS.toArray(), contorno: 0 });
  }
  // barba e cavanhaque: casca colada no queixo e nas laterais do rosto (o resto da casca fica escondido por dentro)
  if (p.rosto.barba?.textura) {
    // barba com volume: casca que sai do rosto na linha da barba e engrossa até o queixo (alguns cm), com relevo de
    // tufos; a cor sal e pimenta vem da textura e o recorte fino (linha da barba, boca) do alfa
    const vol = p.rosto.barba.volume ?? 1, d2r = THREE.MathUtils.degToRad, r2d = THREE.MathUtils.radToDeg;
    const g = new THREE.SphereGeometry(R, 74, 40, Math.PI / 2 - d2r(112), d2r(224), d2r(50), d2r(128));
    const P = g.attributes.position, UV = g.attributes.uv, d = new V3(), D = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) {
      d.set(P.getX(i), P.getY(i), P.getZ(i)).normalize();
      const az = r2d(Math.atan2(d.x, d.z)), a = Math.abs(az), pol = r2d(Math.acos(THREE.MathUtils.clamp(d.y, -1, 1)));
      const dist = D[i] = distCascaBarba(a, pol);
      // espessura (fração do raio): rala na maçã do rosto e na costeleta, cheia na mandíbula e no queixo, bigode médio
      let esp = lerp(0.03, 0.12, sstep(pol, 116, 160)) * (1 - 0.45 * sstep(a, 55, 100));
      esp = Math.max(esp, 0.045 * (1 - sstep(a, 18, 26)) * sstep(pol, 108, 111));
      esp *= lerp(0.45, 1, sstep(pol, 78, 104)); // costeleta fina subindo para o boné
      const sobe = sstep(-dist, 0, 5); // nasce rente ao rosto na borda
      // tufos: ondulação que cai para baixo (variação maior de lado a lado que de cima a baixo)
      const tufo = Math.sin(az * 0.45 + 1.4 * Math.sin(pol * 0.16)) * 0.6 + Math.sin(az * 0.9 - pol * 0.2 + 1.3) * 0.4;
      const k = dist > 0 ? lerp(1.006, 0.97, sstep(dist, 0, 3)) : 1.006 + sobe * vol * (esp + tufo * (0.005 + esp * 0.07));
      P.setXYZ(i, P.getX(i) * k, P.getY(i) * k, P.getZ(i) * k);
      UV.setXY(i, THREE.MathUtils.clamp(a / 112, 0.004, 0.996), THREE.MathUtils.clamp(1 - (pol - 50) / 128, 0.004, 0.996));
    }
    // só os triângulos da barba (o resto ficaria escondido dentro da cabeça)
    const I = g.index.array, so = [];
    for (let t = 0; t < I.length; t += 3) if (Math.min(D[I[t]], D[I[t + 1]], D[I[t + 2]]) < 3) so.push(I[t], I[t + 1], I[t + 2]);
    g.setIndex(so);
    formaCabeca(g);
    // contorno só onde a barba aparece (na borda que afunda ele riscaria o rosto)
    const q = new V3();
    const contornoB = (pp) => {
      q.copy(pp).sub(HC).divide(HS);
      const a = Math.abs(r2d(Math.atan2(q.x, q.z))), pol = r2d(Math.acos(THREE.MathUtils.clamp(q.y / q.length(), -1, 1)));
      return distCascaBarba(a, pol) < -2 ? 0.006 : 0;
    };
    m.add(g, { regiao: "barba", osso: O.cabeca, pos: HC.toArray(), esc: HS.toArray(), contorno: contornoB });
  } else if (p.rosto.barba) {
    const vol = p.rosto.barba.volume ?? 0; // barba mais comprida: casca um pouco maior e queixo mais cheio
    const g = new THREE.SphereGeometry(R * (p.rosto.barba.cheia ? 1.012 + vol * 0.4 : 1.022), 30, 20);
    const P = g.attributes.position, d = new V3();
    for (let i = 0; i < P.count; i++) {
      d.set(P.getX(i), P.getY(i), P.getZ(i)).normalize();
      const az = Math.abs(Math.atan2(d.x, d.z)), el = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
      const ch = p.rosto.barba.cheia;
      const topo = ch ? lerp(-0.45, 0.1, sstep(az, 1.0, 1.45)) : -0.1; // costeleta fina subindo até a orelha
      const lados = sstep(topo - el, 0, 0.2) * sstep(az, ch ? 0.95 : 0.7, ch ? 1.2 : 0.85) * sstep(1.62 - az, 0, 0.2);
      const queixoB = sstep((ch ? -0.72 : -0.68) - el, 0, 0.14) * sstep(1.75 - az, 0, 0.2);
      // barba curta: casca rente ao rosto, só um tiquinho mais cheia no queixo
      const k = lerp(0.86, 1, Math.max(lados, queixoB)) * (1 + (ch ? 0.012 + vol : 0.035) * sstep(-0.75 - el, 0, 0.3) * sstep(0.9 - az, 0, 0.3));
      P.setXYZ(i, P.getX(i) * k, P.getY(i) * k, P.getZ(i) * k);
    }
    formaCabeca(g);
    const bb = p.rosto.barba, base = new THREE.Color(bb.cor3d), fio = new THREE.Color(bb.grisalho ?? bb.cor3d);
    // fios grisalhos espalhados (cor por vértice, sem textura)
    const corB = bb.grisalho ? (q) => { const h = Math.abs(Math.sin(q.x * 912.7 + q.y * 433.1 + q.z * 271.9) * 43758.5) % 1; return base.clone().lerp(fio, h < (bb.fios ?? 0.22) ? (bb.mistura ?? 0.45) : 0); } : null;
    m.add(g, { cor: bb.cor3d, corFn: corB, osso: O.cabeca, pos: HC.toArray(), esc: HS.toArray(), contorno: bb.cheia ? 0.005 : 0.009 });
  }
  // óculos de armação grossa, formato gatinho (pontas de fora levantadas)
  if (p.oculos) {
    const aro = (s) => {
      const pts = [];
      for (let i = 0; i < 20; i++) {
        const t = (i / 20) * Math.PI * 2, cx = Math.cos(t), sy = Math.sin(t);
        // gatinho: topo reto e largo, base arredondada, ponta de fora puxada para cima
        const ret = p.oculos.forma === "retangulo";
        const sc = Math.sign(cx) * Math.pow(Math.abs(cx), ret ? 0.35 : 0.55), ss = Math.sign(sy) * Math.pow(Math.abs(sy), ret ? 0.4 : 0.7); // cantos "quadrados" arredondados
        let az = 19 * sc, el = sy > 0 ? 8.5 * ss : 9.5 * ss;
        const fora = Math.max(0, s * cx);
        if (!ret) { el += 7.5 * Math.pow(fora, 4) * Math.max(0, sy + 0.4); az += s * 4 * Math.pow(fora, 3) * Math.max(0, sy + 0.3); }
        pts.push(naCabeca(THREE.MathUtils.degToRad(s * 22.5 + az), THREE.MathUtils.degToRad(-5.5 + el), 1.08));
      }
      return new THREE.CatmullRomCurve3(pts, true, "centripetal");
    };
    const cor = p.oculos.cor, esp = p.oculos.esp;
    for (const s of [1, -1]) {
      m.add(new THREE.TubeGeometry(aro(s), 40, esp, 5, true), { cor, osso: O.cabeca, contorno: 0.004 });
      // haste até a orelha
      const h0 = naCabeca(THREE.MathUtils.degToRad(s * 42), THREE.MathUtils.degToRad(4), 1.08), h1 = naCabeca(s * 1.2, 0.03, 1.1), h2 = naCabeca(s * 1.55, 0.0, 1.06);
      m.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([h0, h1, h2]), 8, esp * 0.75, 4), { cor, osso: O.cabeca, contorno: 0 });
    }
    const p0 = naCabeca(THREE.MathUtils.degToRad(-6), THREE.MathUtils.degToRad(-2), 1.06), p1 = naCabeca(0, THREE.MathUtils.degToRad(-1), 1.075), p2 = naCabeca(THREE.MathUtils.degToRad(6), THREE.MathUtils.degToRad(-2), 1.06);
    m.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p1, p2]), 6, esp * 0.8, 4), { cor, osso: O.cabeca, contorno: 0 });
  }

  // --- cabelo
  const cb = p.cabelo;
  const [dg0, dg1] = cb.degrade ?? [1.72, 1.2];
  const corCabelo = cb.pontas ? (q) => new THREE.Color(cb.cor).lerp(new THREE.Color(cb.pontas), sstep(q.y, dg0, dg1)) : null;
  const fora = (P) => { const cy = lerp(P.y, HC.y, sstep(P.y, 1.5, 1.78)); return new V3(P.x, P.y - cy, P.z + 0.04); };
  const h = {
    m, naCabeca, fora, cb,
    pesoFrente: (q) => { const w = sstep(q.y, 1.64, 1.42); return [[O.cabeca, 1 - w], [O.tronco, w]]; },
    pesoTras: (q) => { const w = sstep(q.y, 1.76, 1.5); return [[O.cabeca, 1 - w], [O.cabeloTras, w]]; },
    cabelo: (pts, op, peso = O.cabeca, contorno = 0.013, cor = null) => m.add(mecha(pts, { fora, lados: 6, passos: 9, ...op }), { cor: cor ?? cb.cor, corFn: cor ? null : corCabelo, osso: peso, contorno }),
    // calota com a linha do cabelo: H(az) = altura da linha na testa (rad); por baixo da têmpora fica aberto
    calota(H, { volume = 0.04, k: kc = 1.075 } = {}) {
      const g = new THREE.SphereGeometry(R * kc, 24, 16);
      const P = g.attributes.position, d = new V3();
      for (let i = 0; i < P.count; i++) {
        d.set(P.getX(i), P.getY(i), P.getZ(i)).normalize();
        const az = Math.atan2(d.x, d.z), el = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
        const W = lerp(1.78, 1.0, sstep(el, 0.04, 0.26));
        const rosto = sstep(H(az) - el, 0, 0.09) * sstep(W - Math.abs(az), 0, 0.12);
        const queixo = sstep(-0.3 - el, 0, 0.12) * sstep(2.0 - Math.abs(az), 0, 0.2);
        const k = lerp(1, 0.84, Math.max(rosto, queixo)) * (1 + volume * sstep(el, 0.3, 1.2));
        P.setXYZ(i, P.getX(i) * k, P.getY(i) * k, P.getZ(i) * k);
      }
      formaCabeca(g);
      m.add(g, { cor: cb.cor, osso: O.cabeca, pos: HC.toArray(), esc: HS.toArray(), contorno: 0.016 });
    },
    // costas: cortina de mechas até o meio das costas, pontas viradinhas
    costas(fim) {
      for (const [i, aDeg] of [130, 155, 180, 205, 230].entries()) {
        const a = THREE.MathUtils.degToRad(aDeg), s = Math.sin(a), c = Math.cos(a), comp = [0, 0.03, -0.02, 0.025, 0][i];
        h.cabelo([naCabeca(a, 0.5, 1.0), naCabeca(a, -0.15, 1.1), new V3(s * 0.27, 1.55, c * 0.26 - 0.04), new V3(s * 0.27, 1.38, c * 0.25 - 0.03), new V3(s * 0.26, fim + 0.07 - comp, c * 0.25 - 0.02), new V3(s * 0.3, fim - comp, c * 0.29 - 0.02)], { w0: 0.2, w1: 0.13, d0: 0.08, d1: 0.045, passos: 10 }, h.pesoTras);
      }
    },
    // brilho do cabelo (faixa clara de desenho animado)
    brilho(el = 0.95) { for (const s of [1, -1]) h.cabelo([naCabeca(s * 1.2, el, 1.108), naCabeca(s * 1.65, el - 0.12, 1.112), naCabeca(s * 2.1, el - 0.28, 1.108)], { w0: 0.03, w1: 0.026, d0: 0.012, d1: 0.01, lados: 4, passos: 5 }, O.cabeca, 0, cb.brilho); },
  };
  CABELOS[cb.estilo](h);
  // boné de aba curva (copa inclinada para trás, aba na frente) com selo opcional na frente
  if (p.bone) {
    const M = new THREE.Matrix4().compose(HC.clone().add(new V3(0, 0.04, -0.005)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, 0, 0)), HS.clone().multiplyScalar(1.0));
    const Rc = R * 1.085;
    m.add(new THREE.SphereGeometry(Rc, 22, 9, 0, Math.PI * 2, 0, Math.PI * 0.52), { cor: p.bone.cor, osso: O.cabeca, matriz: M, contorno: 0.014 });
    m.add(esf(6, 4), { cor: p.bone.cor, osso: O.cabeca, matriz: M.clone().multiply(new THREE.Matrix4().compose(new V3(0, Rc, 0), new THREE.Quaternion(), new V3(0.022, 0.012, 0.022))), contorno: 0.004 });
    // aba: disco achatado e curvado para baixo nas laterais
    const aba = new THREE.SphereGeometry(1, 18, 6, 0, Math.PI * 2, 0, Math.PI * 0.32);
    m.add(aba, { cor: p.bone.cor, osso: O.cabeca, matriz: new THREE.Matrix4().compose(HC.clone().add(new V3(0, R * HS.y * 0.27, R * HS.z * 0.74)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.38, 0, 0)), new V3(0.205, 0.08, 0.23)), contorno: 0.01 });
    if (p.selo?.onde === "bone") {
      const pos = [], uv = [], idx = [], nx = 8, ny = 3;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
        const az = (i / nx - 0.5) * 0.9, el = 0.13 + (j / ny) * 0.28;
        pos.push(Math.sin(az) * Math.cos(el) * Rc * 1.008, Math.sin(el) * Rc * 1.008, Math.cos(az) * Math.cos(el) * Rc * 1.008); uv.push(i / nx, j / ny);
      }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + nx + 1; idx.push(a, a + 1, b + 1, a, b + 1, b); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      m.add(g, { osso: O.cabeca, regiao: "logo", matriz: M, contorno: 0 });
    }
  }

  // --- braços (descanso: caídos ao lado do corpo)
  for (const s of [1, -1]) {
    const E = s > 0, x = s * 0.29 * G.ombros, br = G.braco;
    const ombro = E ? O.ombroE : O.ombroD, cot = E ? O.cotoveloE : O.cotoveloD, mao = E ? O.maoE : O.maoD;
    if (r.manga === "regata") {
      // sem manga: braço todo de fora
      m.add(esf(10, 8), { cor: SKIN, osso: ombro, pos: [x * 0.96, 1.39, 0], esc: [0.058 * br, 0.06, 0.058 * br], contorno: 0.012 });
      m.add(cap(0.048 * br, 0.26), { cor: SKIN, osso: ombro, pos: [x, 1.25, 0], contorno: 0.012 });
      m.add(cap(0.043 * br, 0.2), { cor: SKIN, osso: cot, pos: [x, 0.975, 0], contorno: 0.011 });
    } else if (r.manga === "curta") {
      // manga curta: só o começo do braço no tecido, com a barra; o resto é braço
      m.add(cap(0.064 * br, 0.07), { osso: ombro, regiao: "tecido", pos: [x, 1.335, 0], contorno: 0.013 });
      m.add(new THREE.TorusGeometry(0.062 * br, 0.012, 5, 12), { cor: r.ribana, osso: ombro, pos: [x, 1.245, 0], rot: [Math.PI / 2, 0, 0], contorno: 0.006 });
      m.add(cap(0.05 * br, 0.12), { cor: SKIN, osso: ombro, pos: [x, 1.2, 0], contorno: 0.012 });
      m.add(cap(0.046 * br, 0.16), { cor: SKIN, osso: cot, pos: [x, 0.98, 0], contorno: 0.012 });
    } else if (r.manga !== "regata") m.add(cap(r.manga === "longa" ? 0.054 : 0.06, 0.18), { osso: ombro, regiao: "tecido", pos: [x, 1.27, 0], contorno: 0.013 });
    if (r.manga === "curta" || r.manga === "regata") { /* já feito */ } else if (r.manga === "dobrada") {
      m.add(cap(0.058, 0.06), { osso: cot, regiao: "tecido", pos: [x, 1.05, 0], contorno: 0.013 });
      m.add(new THREE.TorusGeometry(0.06, 0.02, 5, 12), { cor: r.forro, osso: cot, pos: [x, 0.97, 0], rot: [Math.PI / 2, 0, 0], contorno: 0.008 });
      m.add(cap(0.042, 0.06), { cor: SKIN, osso: cot, pos: [x, 0.9, 0], contorno: 0.01 });
    } else {
      m.add(cap(0.05, 0.17), { osso: cot, regiao: "tecido", pos: [x, 0.985, 0], contorno: 0.012 });
      m.add(new THREE.TorusGeometry(0.047, 0.012, 5, 12), { cor: r.punho, osso: cot, pos: [x, 0.855, 0], rot: [Math.PI / 2, 0, 0], contorno: 0.006 });
    }
    // mão: palma achatada (virada para o corpo), quatro dedinhos separados e levemente dobrados, polegar na frente
    m.add(esf(10, 8), { cor: SKIN, osso: mao, pos: [x, 0.788, 0.004], esc: [0.032 * Math.sqrt(br), 0.048, 0.05 * Math.sqrt(br)], contorno: 0.009 });
    for (const [i, z] of [-0.033, -0.011, 0.011, 0.032].entries()) {
      const comp = [0.026, 0.036, 0.038, 0.03][i], cy = 0.748 - comp * 0.4, xx = x + s * 0.004;
      m.add(cap(0.0102, comp, 2, 6), { cor: SKIN, osso: mao, pos: [xx, cy, z * 1.06], rot: [z * 3, 0, -s * 0.28], contorno: 0.0055 });
      // unha pintada nas costas da ponta do dedo (lado de fora da mão)
      if (p.unhas) m.add(esf(6, 4), { cor: p.unhas, osso: mao, pos: [xx + s * 0.0088 - s * comp * 0.14, cy - comp / 2 + 0.003, z * 1.06 - z * 0.08], rot: [z * 3, 0, -s * 0.28], esc: [0.0055, 0.0125, 0.0092], contorno: 0 });
    }
    m.add(cap(0.0125, 0.022, 2, 6), { cor: SKIN, osso: mao, pos: [x - s * 0.006, 0.772, 0.044], rot: [0.35, 0, -s * 0.35], contorno: 0.0055 });
    if (E && p.pulseira) m.add(new THREE.TorusGeometry(0.048, 0.012, 5, 14), { cor: p.ouro, osso: cot, pos: [x, 0.845, 0], rot: [Math.PI / 2, 0, 0], contorno: 0.006 });
  }

  // --- pernas: calça, tornozelo e sapatilha com saltinho
  for (const s of [1, -1]) {
    const x = s * 0.105 * G.quadril, pr = G.perna, perna = s > 0 ? O.pernaE : O.pernaD, joelho = s > 0 ? O.joelhoE : O.joelhoD;
    m.add(cap(0.09 * pr, 0.2, 2, 10), { osso: perna, ...calca, pos: [x, 0.69, 0], contorno: 0.014 });
    if (p.sapatoFechado) {
      // calça até o sapato e sapato social/tênis fechado, arredondado
      m.add(cap(0.08 * pr, 0.37, 2, 10), { osso: joelho, ...calca, pos: [x, 0.335, 0], contorno: 0.01 });
      m.add(esf(12, 8), { cor: p.sapato, osso: joelho, pos: [x, p.tenis ? 0.056 : 0.048, 0.04], esc: [0.07, 0.052, 0.14], contorno: 0.012 });
      if (p.tenis) {
        // tênis: solado claro e grosso e uma faixa colorida do lado de fora
        m.add(esf(12, 6), { cor: p.tenis.sola, osso: joelho, pos: [x, 0.022, 0.04], esc: [0.074, 0.024, 0.146], contorno: 0.008 });
        m.add(esf(8, 5), { cor: p.tenis.detalhe, osso: joelho, pos: [x + s * 0.06, 0.06, 0.035], rot: [0, 0, s * 0.35], esc: [0.012, 0.022, 0.07], contorno: 0 });
      }
      continue;
    }
    m.add(cap(0.076 * pr, 0.33, 2, 10), { osso: joelho, ...calca, pos: [x, 0.355, 0], contorno: 0.01 });
    m.add(cap(0.04, 0.04, 2, 8), { cor: SKIN, osso: joelho, pos: [x, 0.1, 0.005], contorno: 0.008 });
    // scarpin: bico fino, peito do pé à mostra e saltinho
    m.add(esf(12, 8), { cor: p.sapato, osso: joelho, pos: [x, 0.04, 0.05], esc: [0.058, 0.04, 0.125], contorno: 0.011 });
    m.add(esf(10, 6), { cor: SKIN, osso: joelho, pos: [x, 0.07, 0.03], esc: [0.042, 0.03, 0.06], contorno: 0 });
    m.add(cap(0.017, 0.035, 2, 6), { cor: p.sapato, osso: joelho, pos: [x, 0.03, -0.055], rot: [0.15, 0, 0], contorno: 0.006 });
  }
  return m;
}

// objeto da mão esquerda (osso "objeto"), montado no espaço local do osso
const OBJETOS = {
  biblia(m, M) {
    const peca = (geo, cor, pos, contorno = 0.01) => m.add(geo, { cor, matriz: M.clone().multiply(new THREE.Matrix4().makeTranslation(...pos)), osso: O.objeto, caixa: true, contorno });
    const W = 0.17, H = 0.23, D = 0.055;
    peca(new THREE.BoxGeometry(W, H, 0.009), 0xc41d2a, [0, 0, D / 2 - 0.0045]);
    peca(new THREE.BoxGeometry(W, H, 0.009), 0xc41d2a, [0, 0, -D / 2 + 0.0045]);
    peca(new THREE.BoxGeometry(0.012, H, D), 0xa8141f, [-W / 2 + 0.006, 0, 0]);
    peca(new THREE.BoxGeometry(W - 0.016, H - 0.014, D - 0.016), 0xfff1d0, [0.004, 0, 0], 0.006);
    m.add(new THREE.PlaneGeometry(W - 0.012, H - 0.01), { osso: O.objeto, regiao: "capa", contorno: 0, matriz: M.clone().multiply(new THREE.Matrix4().makeTranslation(0.003, 0, D / 2 + 0.002)) });
  },
  prancheta(m, M) {
    const peca = (geo, cor, pos, contorno = 0.008) => m.add(geo, { cor, matriz: M.clone().multiply(new THREE.Matrix4().makeTranslation(...pos)), osso: O.objeto, caixa: true, contorno });
    const W = 0.2, H = 0.27;
    peca(new THREE.BoxGeometry(W, H, 0.012), 0xb07a45, [0, 0, 0]);
    peca(new THREE.BoxGeometry(0.08, 0.035, 0.022), 0xc8d0da, [0, H / 2 - 0.022, 0.012], 0.006);
    m.add(new THREE.PlaneGeometry(W - 0.03, H - 0.06), { osso: O.objeto, regiao: "capa", contorno: 0, matriz: M.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.012, 0.0075)) });
  },
};

// ---------------------------------------------------------------- receitas das pessoas
const PELE_SABRINA = 0xf2c4a0;
const PESSOAS = {
  sabrina: {
    nome: "Diretora Sabrina", escola: "kids2",
    pele: PELE_SABRINA, ouro: 0xf2bb3d, sapato: 0x1d1c22, unhas: 0xff2d95, gargantilha: 0x2a1a14, brinco: "ponto", pulseira: true,
    rosto: {
      iris: ["#2e1608", "#6e3a18", "#a8652c", "#5a2e12"], sobrancelha: "#22110a", grossura: 1, boca: "aberta", batom: "#b03f5c", bochecha: "rgba(255,96,130,0.5)",
      // cílios BEM longos, curvados para cima: [ângulo no olho, comprimento, espessura]
      cilios: [[-0.95, 30, 6], [-0.62, 40, 7], [-0.32, 46, 7.5], [-0.05, 40, 7], [0.2, 28, 6]],
    },
    cabelo: { estilo: "sabrinaLado", cor: 0x2b1913, brilho: 0x6a4432 },
    roupa: { tipo: "blazer", manga: "dobrada", terno: "#ec2e8c", listra: "rgba(255,175,214,0.3)", blusa: "#ffcfe3", lapela: "#e0207f", costura: "#9e1259", forro: 0xffc2dc, calca: 0xf4f4f4, calcaTecido: true },
    logo: { url: new URL("../../assets/marca/logos/azul.png", import.meta.url).href, a: 0.6, y: 1.245, w: 0.19 },
    objeto: null, // sem nada nas mãos (pedido do Jefferson)
  },
  elaine: {
    nome: "Contadora Elaine", empresa: "Crescente Contabilidade",
    pele: 0xf7d8c4, ouro: 0xe9b949, sapato: 0x1d1c22, brinco: "argola", pulseira: false,
    rosto: {
      iris: ["#2a1608", "#5e3a1c", "#8f6a3a", "#4a2e14"], sobrancelha: "#4a2e1c", grossura: 0.7, interno: 2.5, boca: "discreta", batom: "#d9707f", bochecha: "rgba(255,120,140,0.42)",
      cilios: [[-0.6, 18, 5], [-0.3, 22, 5.5], [-0.05, 18, 5]],
    },
    oculos: { cor: 0x241410, esp: 0.0085 },
    cabelo: { estilo: "elaineMeio", cor: 0x4a2f1f, pontas: 0xb98a55, brilho: 0x8a6444 },
    roupa: { tipo: "blusa", manga: "longa", aperto: 0.12, barra: 0.83, fundo: "#f1e4d2", onda: "#2f3f8f", fio: "#6b5040", gola: "#d9c6ad", punho: 0xe8d8c2, calca: 0x2e3348 },
    broche: { a: -0.42, y: 1.2, cor: 0x1f2a5c },
    objeto: { tipo: "prancheta", pos: [0.06, 0.05, 0.05], rot: [-0.1, 0.25, -0.05] },
  },
  aurelio: {
    nome: "Aurélio", empresa: "Crescente Contabilidade", escala: 1.1,
    pele: 0xf3c2a6, ouro: 0xe2b245, sapato: 0x1a1a1e, sapatoFechado: true, brinco: null, pulseira: false, gargantilha: 0xe2b245, corrente: true,
    corpo: { ombros: 1.12, quadril: 1.06, gordo: 1.1, barriga: 0.07, z: 0.88, braco: 1.25, perna: 1.12, pescoco: 0.074, cabeca: [0.9, 1.03, 0.96], queixo: 0.1 },
    rosto: {
      iris: ["#18242c", "#3a5666", "#7e98a6", "#26363f"], sobrancelha: "#8a7458", grossura: 0.85, interno: 1, boca: "dentes", batom: "#c27a6c", bochecha: "rgba(240,90,90,0.42)",
      cilios: [[-0.3, 9, 4]],
      barba: { sombra: "rgba(150,140,128,0.42)", ponto: "rgba(110,102,92,0.6)", cor: "#a99f90", cor3d: 0xb4ab9c },
    },
    oculos: { forma: "retangulo", cor: 0x141414, esp: 0.0098 },
    cabelo: { estilo: "aurelioCurto", cor: 0x9c8a6a, brilho: 0xd2c4a4 },
    roupa: { tipo: "camiseta", manga: "curta", fundo: "#232328", trama: "rgba(255,255,255,0.05)", prega: "rgba(0,0,0,0)", costura: "#141418", ribana: 0x1b1b1f, calca: 0x2b3b62 },
    objeto: null,
  },
  // Rise Up (academia): Camila e o marido formam um par — mesma paleta fitness (preto + laranja da faixa) e o mesmo
  // selo "RISE UP" branco (no peito dela, no boné dele). Para trocar o nome dele é só mudar "nome" abaixo.
  camila: {
    nome: "Camila", empresa: "Rise Up",
    pele: 0xf7d3bc, ouro: 0xe7b443, brinco: "argola", brincoTam: 1.8, pulseira: false,
    sapato: 0xf6f6f8, sapatoFechado: true, tenis: { sola: 0xd6d8de, detalhe: 0xff5a36 },
    corpo: { ombros: 0.98, quadril: 0.98, gordo: 0.95, z: 0.72, braco: 0.92, perna: 0.92, pescoco: 0.058, cabeca: [0.8, 1.07, 0.92], queixo: 0.24 },
    rosto: {
      iris: ["#2a1608", "#6a4420", "#9a7240", "#4a2e14"], sobrancelha: "#6b4a2e", grossura: 0.95, interno: 1.5, boca: "discreta", batom: "#c98078", bochecha: "rgba(250,110,120,0.4)",
      cilios: [[-0.85, 24, 6], [-0.55, 32, 6.5], [-0.25, 34, 7], [0.0, 28, 6]],
    },
    cabelo: { estilo: "camilaOndas", cor: 0x8a6a48, pontas: 0xead39e, degrade: [1.98, 1.66], brilho: 0xf6e6bd },
    roupa: { tipo: "regata", manga: "regata", aperto: 0.14, barra: 0.84, fundo: "#1b1b20", trama: "rgba(255,255,255,0.05)", prega: "rgba(0,0,0,0)", vivo: "#ff5a36", calca: 0x1b1b20 },
    selo: { texto: "RISE UP", cor: "#ffffff", onde: "peito", y: 1.25, w: 0.15 },
    objeto: null,
  },
  "riseup-dono": {
    nome: "Robert", empresa: "Rise Up", escala: 1.1,
    pele: 0xf1c3a8, ouro: 0xe2b245, brinco: null, pulseira: false,
    sapato: 0x18181c, sapatoFechado: true, tenis: { sola: 0xf2f2f2, detalhe: 0xff5a36 },
    corpo: { ombros: 1.18, quadril: 1.05, gordo: 1.05, barriga: 0, z: 0.8, braco: 1.38, perna: 1.12, pescoco: 0.082, cabeca: [0.86, 1.12, 0.95], queixo: 0.16 },
    rosto: {
      olhoEsc: 0.8, olhosY: -3, sobrancelhaY: 0, iris: ["#1e1208", "#4a3018", "#7a5530", "#342010"], sobrancelha: "#3a2a1e", grossura: 1, interno: 1, boca: "dentes", batom: "#b46f63", bochecha: "rgba(240,90,90,0.38)",
      cilios: [[-0.3, 8, 4]],
      barba: { cheia: true, textura: true, cor: "#735d4b", fios: 0.55, densidade: 1.1, volume: 1 },
    },
    cabelo: { estilo: "careca", cor: 0xf1c3a8, lustro: true, raspado: 0xb89480 },
    bone: null,
    selo: { texto: "RISE UP", cor: "#ffffff", onde: "peito", y: 1.25, w: 0.15 },
    roupa: { tipo: "camiseta", manga: "curta", fundo: "#2e3036", trama: "rgba(255,255,255,0.05)", prega: "rgba(0,0,0,0)", costura: "#202226", ribana: 0x26282d, calca: 0x18181c },
    objeto: null,
  },
  carina: {
    nome: "Diretora Carina", escola: "kids1",
    pele: 0xd9a07a, ouro: 0xe9b84a, sapato: 0x1d1c22, brinco: "pendente", pulseira: false,
    rosto: {
      olhos: "rindo",
      iris: ["#1e0f06", "#4a2a14", "#7a4a26", "#3a200e"], sobrancelha: "#140b07", grossura: 1.05, interno: 2.5, boca: "dentes", batom: "#a85a52", bochecha: "rgba(235,90,100,0.45)",
      cilios: [[-0.35, 20, 6], [-0.1, 16, 5.5]],
    },
    // óculos pretos retangulares (aparecem só numa foto): deixado desligado, para ligar é só descomentar
    oculos: null, // { forma: "retangulo", cor: 0x151515, esp: 0.009 },
    cabelo: { estilo: "carinaCachos", cor: 0x17110e, cor2: 0x2c201a, brilho: 0x3d2c24 },
    roupa: {
      tipo: "vestido", manga: "dobrada", aperto: 0.1, fundo: "#e6d3b3", trama: "rgba(150,120,80,0.18)", prega: "rgba(150,120,80,0.12)", costura: "#b39468", botao: "#f4ead8",
      forro: 0xd8c29e, gola: 0xeadbbf, cinto: 0xcdb28a, calca: 0xd9a07a, saia: { fim: 0.46, raio: 0.3 },
    },
    objeto: null,
  },
};
void PELE_SABRINA;

// ---------------------------------------------------------------- pessoa
export function criarPessoa(id = "sabrina", { escala: esc = null, nome = null } = {}) {
  const p = PESSOAS[id];
  if (!p) throw new Error(`pessoa desconhecida: ${id}`);
  const escala = esc ?? p.escala ?? 1;
  const grupo = new THREE.Group();
  const raiz = new THREE.Group(); // pulo e estica-e-achata
  grupo.add(raiz);

  // esqueleto
  const ossos = OSSOS.map(([n]) => { const b = new THREE.Bone(); b.name = n; return b; });
  // ombros e quadril mais largos para quem tem corpo maior
  const G = { ombros: 1, quadril: 1, ...(p.corpo ?? {}) };
  const mundoOsso = (i) => { const [n, , w] = OSSOS[i]; const k = /ombro|cotovelo|mao|objeto/.test(n) ? G.ombros : /perna|joelho/.test(n) ? G.quadril : 1; return new V3(w[0] * k, w[1], w[2]); };
  OSSOS.forEach(([, pai], i) => { const b = ossos[i]; if (pai >= 0) { ossos[pai].add(b); b.position.copy(mundoOsso(i)).sub(mundoOsso(pai)); } else b.position.copy(mundoOsso(i)); });
  raiz.add(ossos[0]);

  const mont = montarPessoa(p);
  // pose de segurar o objeto: calcula onde ele fica na mão e guarda isso no espaço do osso da mão
  const POSE_OBJ = { oEx: -0.12, oEz: 0.04, cE: -1.0, mEx: 0.25 };
  if (p.objeto) {
    const aplicar = (sim) => {
      ossos[O.ombroE].rotation.set(sim ? POSE_OBJ.oEx : 0, 0, sim ? POSE_OBJ.oEz : 0);
      ossos[O.cotoveloE].rotation.set(sim ? POSE_OBJ.cE : 0, 0, 0);
      ossos[O.maoE].rotation.set(sim ? POSE_OBJ.mEx : 0, 0, 0);
      raiz.updateMatrixWorld(true);
    };
    aplicar(true);
    const maoPose = ossos[O.maoE].matrixWorld.clone();
    const mundo = new THREE.Matrix4().compose(new V3().setFromMatrixPosition(maoPose).add(new V3(...p.objeto.pos)), new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.objeto.rot)), new V3(1, 1, 1));
    const local = maoPose.clone().invert().multiply(mundo);
    aplicar(false);
    OBJETOS[p.objeto.tipo](mont, ossos[O.maoE].matrixWorld.clone().multiply(local));
  }
  const { corpo: geo, contorno: geoC, triCorpo, triContorno } = mont.geometrias();
  const tex = texturasDe(id, p);
  const matCorpo = new THREE.MeshToonMaterial({ map: tex.aberto, vertexColors: true, gradientMap: toon(0xffffff).gradientMap, alphaTest: 0.5 });
  const malha = new THREE.SkinnedMesh(geo, matCorpo);
  const casca = new THREE.SkinnedMesh(geoC, materialContorno());
  const esq = new THREE.Skeleton(ossos);
  raiz.add(malha, casca);
  raiz.updateMatrixWorld(true);
  malha.bind(esq); casca.bind(esq, malha.bindMatrix);
  for (const mm of [malha, casca]) { mm.boundingSphere = new THREE.Sphere(new V3(0, 1.1, 0), 1.5); mm.castShadow = false; mm.receiveShadow = true; }
  casca.raycast = () => {};
  const sombra = sombraBlob(0.5, 0.32);
  grupo.add(sombra);
  grupo.scale.setScalar(escala); // só agora: o objeto e o esqueleto foram medidos em escala 1

  const ALTURA = 2.15;
  grupo.userData = { tipo: "pessoa", id, nome: nome ?? p.nome, altura: ALTURA * escala };

  // ---------------- animação
  const B = (n) => ossos[O[n]];
  const atual = {};
  let tempo = Math.random() * 10, fase = 0, piscar = 2, aceno = 0, festa = 0, recebe = 0, juntas = false;
  let vy = 0, py = 0, objQuer = Boolean(p.objeto), objEsc = objQuer ? 1 : 0, segurando = null, pendente = null, olharAlvo = 0, olharT = 3;
  const k0 = (dt, v) => 1 - Math.exp(-dt * v);

  function pose(andando, vel) {
    const a = { mYE: 0.55, mYD: 0.55, qY: 0, corpoY: 0, tronX: 0, tronY: 0, tronZ: 0, cabX: 0, cabY: 0, cabZ: 0, oEx: 0, oEz: 0.1, cE: -0.12, mEx: 0, oDx: 0, oDz: -0.1, cD: -0.12, mDx: 0, pE: 0, jE: 0, pD: 0, jD: 0, tX: 0, tZ: 0, sq: 1 };
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
      a.oEz = 0.1 + Math.sin(t * 1.6) * 0.015; a.oDz = -0.1 - Math.sin(t * 1.6) * 0.015;
      a.tX = Math.sin(t * 1.1) * 0.02; a.tZ = Math.sin(t * 0.8) * 0.02;
    }
    // objeto na mão esquerda (encostado no quadril)
    if (objQuer && !juntas) { a.oEx = POSE_OBJ.oEx + (andando ? Math.sin(fase) * 0.06 : 0); a.oEz = POSE_OBJ.oEz; a.cE = POSE_OBJ.cE; a.mEx = POSE_OBJ.mEx; a.mYE = 0; }
    // segurando algo na mão direita (ex.: o alvará): mão na frente do corpo
    if (segurando && recebe <= 0) { a.oDx = -0.55; a.oDz = 0.06; a.cD = -0.85; a.mDx = 0.2; a.mYD = 0; }
    if (juntas) { a.oEx = a.oDx = -0.62; a.oEz = -0.52; a.oDz = 0.52; a.cE = a.cD = -1.5; a.mEx = a.mDx = 0; a.mYE = a.mYD = 0; a.cabX = 0.22; a.cabY = 0; }
    if (recebe > 0) { a.oEx = a.oDx = -1.15; a.oEz = -0.14; a.oDz = 0.14; a.cE = a.cD = -0.4; a.mEx = a.mDx = 0.1; a.mYE = a.mYD = 0; a.tronX = 0.08; a.cabX = 0.08; }
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
    custo: { chamadas: 3, triangulos: triCorpo, triangulosContorno: triContorno },
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
      if (matCorpo.map !== mapa) matCorpo.map = mapa;
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
      B("ombroE").rotation.set(A.oEx, 0, A.oEz); B("cotoveloE").rotation.x = A.cE; B("maoE").rotation.set(A.mEx, -A.mYE, -0.1);
      B("ombroD").rotation.set(A.oDx, 0, A.oDz); B("cotoveloD").rotation.x = A.cD; B("maoD").rotation.set(A.mDx, A.mYD, 0.1);
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
