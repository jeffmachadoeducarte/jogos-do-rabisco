// Gerador de QR code enxuto, feito para os Jogos do Rabisco (sem CDN, roda no aparelho).
// Modo byte (UTF-8), versões 1 a 10, correção de erro L/M/Q/H, escolha automática da máscara.
// Algoritmo do padrão ISO/IEC 18004, na mesma linha do "QR Code generator" de Project Nayuki (MIT).
//
//   import { qrMatriz, qrSvg } from "../../vendor/qr.js";
//   el.innerHTML = qrSvg("https://exemplo/?s=KXQM", { nivel: "M" });   // <svg> nítido em qualquer tamanho
//   qrMatriz(texto) → array de linhas, cada linha um array de booleanos (true = quadradinho preto)

const NIVEIS = { L: 0, M: 1, Q: 2, H: 3 };
const BITS_NIVEL = [1, 0, 3, 2]; // L, M, Q, H no campo de formato
// por nível e versão (índice 0 não usado)
const ECC_POR_BLOCO = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
];
const BLOCOS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
];

function modulosDeDados(v) {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) {
    const n = Math.floor(v / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (v >= 7) r -= 36;
  }
  return r;
}
const palavrasDeDados = (v, n) => Math.floor(modulosDeDados(v) / 8) - ECC_POR_BLOCO[n][v] * BLOCOS[n][v];

// ------------------------------------------------------------------ Reed-Solomon em GF(256)
function mul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
  return z;
}
function divisor(grau) {
  const r = new Array(grau).fill(0);
  r[grau - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grau; i++) {
    for (let j = 0; j < r.length; j++) { r[j] = mul(r[j], raiz); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
    raiz = mul(raiz, 2);
  }
  return r;
}
function resto(dados, div) {
  const r = div.map(() => 0);
  for (const b of dados) {
    const f = b ^ r.shift();
    r.push(0);
    div.forEach((c, i) => { r[i] ^= mul(c, f); });
  }
  return r;
}

// ------------------------------------------------------------------ Montagem
export function qrMatriz(texto, { nivel = "M" } = {}) {
  const n = NIVEIS[nivel] ?? 1;
  const bytes = [...new TextEncoder().encode(String(texto))];
  let v = 1;
  for (; v <= 10; v++) if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= palavrasDeDados(v, n) * 8) break;
  if (v > 10) throw new Error("qr: texto grande demais");

  // bits: modo byte, tamanho, dados, terminador, preenchimento
  const bits = [];
  const por = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  por(4, 4); por(bytes.length, v < 10 ? 8 : 16);
  for (const b of bytes) por(b, 8);
  const cap = palavrasDeDados(v, n) * 8;
  por(0, Math.min(4, cap - bits.length));
  por(0, (8 - (bits.length % 8)) % 8);
  for (let p = 0xec; bits.length < cap; p ^= 0xec ^ 0x11) por(p, 8);
  const dados = [];
  for (let i = 0; i < bits.length; i += 8) dados.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  // blocos com correção de erro, intercalados
  const nb = BLOCOS[n][v], ecc = ECC_POR_BLOCO[n][v], brutos = Math.floor(modulosDeDados(v) / 8);
  const curtos = nb - (brutos % nb), lenCurto = Math.floor(brutos / nb), div = divisor(ecc);
  const blocos = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const d = dados.slice(k, k + lenCurto - ecc + (i < curtos ? 0 : 1));
    k += d.length;
    const e = resto(d, div);
    if (i < curtos) d.push(0);
    blocos.push(d.concat(e));
  }
  const final = [];
  for (let i = 0; i < blocos[0].length; i++) for (let j = 0; j < nb; j++) if (i !== lenCurto - ecc || j >= curtos) final.push(blocos[j][i]);

  // padrões fixos
  const tam = v * 4 + 17;
  const m = Array.from({ length: tam }, () => new Array(tam).fill(false));
  const fixo = Array.from({ length: tam }, () => new Array(tam).fill(false));
  const pos = (x, y, cor) => { m[y][x] = cor; fixo[y][x] = true; };
  for (let i = 0; i < tam; i++) { pos(6, i, i % 2 === 0); pos(i, 6, i % 2 === 0); }
  const localizador = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < tam && y >= 0 && y < tam) pos(x, y, d !== 2 && d !== 4);
    }
  };
  localizador(3, 3); localizador(tam - 4, 3); localizador(3, tam - 4);
  if (v > 1) {
    const na = Math.floor(v / 7) + 2, passo = Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2;
    const ps = [6];
    for (let p = tam - 7; ps.length < na; p -= passo) ps.splice(1, 0, p);
    for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) pos(ps[i] + dx, ps[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  const formato = (mascara) => {
    const d = (BITS_NIVEL[n] << 3) | mascara;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412;
    const bit = (i) => ((b >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) pos(8, i, bit(i));
    pos(8, 7, bit(6)); pos(8, 8, bit(7)); pos(7, 8, bit(8));
    for (let i = 9; i < 15; i++) pos(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) pos(tam - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) pos(8, tam - 15 + i, bit(i));
    pos(8, tam - 8, true);
  };
  formato(0); // reserva a área do formato
  if (v >= 7) {
    let r = v;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) {
      const c = ((b >>> i) & 1) !== 0, a = tam - 11 + (i % 3), bb = Math.floor(i / 3);
      pos(a, bb, c); pos(bb, a, c);
    }
  }

  // dados em zigue-zague
  let i = 0;
  for (let dir = tam - 1; dir >= 1; dir -= 2) {
    if (dir === 6) dir = 5;
    for (let vert = 0; vert < tam; vert++) for (let j = 0; j < 2; j++) {
      const x = dir - j, sobe = ((dir + 1) & 2) === 0, y = sobe ? tam - 1 - vert : vert;
      if (!fixo[y][x] && i < final.length * 8) { m[y][x] = ((final[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
    }
  }

  // máscara: testa as 8 e fica com a de menor penalidade
  const MASCARAS = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const aplicar = (k) => { for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) if (!fixo[y][x] && MASCARAS[k](x, y)) m[y][x] = !m[y][x]; };
  let melhor = 0, menor = Infinity;
  for (let k = 0; k < 8; k++) {
    aplicar(k); formato(k);
    const p = penalidade(m, tam);
    if (p < menor) { menor = p; melhor = k; }
    aplicar(k); // desfaz (XOR)
  }
  aplicar(melhor); formato(melhor);
  return m;
}

// penalidade simplificada: sequências da mesma cor, blocos 2x2, padrão parecido com o localizador e equilíbrio claro/escuro
function penalidade(m, tam) {
  let p = 0, escuros = 0;
  const linha = (get) => {
    let corrida = 1;
    for (let i = 1; i < tam; i++) {
      if (get(i) === get(i - 1)) { corrida++; if (corrida === 5) p += 3; else if (corrida > 5) p++; }
      else corrida = 1;
    }
    for (let i = 0; i + 6 < tam; i++) {
      if (get(i) && !get(i + 1) && get(i + 2) && get(i + 3) && get(i + 4) && !get(i + 5) && get(i + 6)) p += 40;
    }
  };
  for (let y = 0; y < tam; y++) { linha((x) => m[y][x]); linha((x) => m[x][y]); }
  for (let y = 0; y < tam - 1; y++) for (let x = 0; x < tam - 1; x++) {
    const c = m[y][x];
    if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
  }
  for (const l of m) for (const c of l) if (c) escuros++;
  const total = tam * tam;
  p += Math.floor(Math.abs(escuros * 20 - total * 10) / total) * 10;
  return p;
}

// <svg> com borda branca (zona quieta) de 4 módulos
export function qrSvg(texto, { nivel = "M", borda = 4, cor = "#151515", fundo = "#fff" } = {}) {
  const m = qrMatriz(texto, { nivel });
  const t = m.length + borda * 2;
  let d = "";
  m.forEach((l, y) => l.forEach((c, x) => { if (c) d += `M${x + borda},${y + borda}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges" role="img"><rect width="${t}" height="${t}" fill="${fundo}"/><path d="${d}" fill="${cor}"/></svg>`;
}
