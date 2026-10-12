// As 10 fases do Super Rabisco (valem para todos os modos: letras, sílabas, Mini e perguntas).
// A fase 1 é a fase original. As fases 2 a 10 saem de um gerador com semente (cada fase é sempre igual):
// trechos de blocos, canos, degraus e campo aberto, com mais inimigos a cada fase. O fim é sempre igual
// (pirâmide, mastro e castelo-escola) e sempre dá para chegar em todas as letras.
// A fase vem de ?fase=N (1 a 10); o jogo recarrega a página ao trocar de fase.

import { aleatorio } from "../../src/motor3d/toon.js";

const ORIGINAL = {
  inicio: 7,
  blocos: [
    [14, 4, "q"],
    [18, 4, "t"], [19, 4, "q"], [20, 4, "t"], [21, 4, "q"], [22, 4, "t"], [20, 8, "q"],
    [58, 4, "t"], [59, 4, "t"], [60, 4, "q"], [61, 4, "t"], [62, 4, "t"], [63, 4, "t"], [60, 8, "q"],
    [78, 4, "q"], [79, 4, "q"],
  ],
  canos: [[27, 2], [36, 3], [45, 2], [83, 3]],        // [coluna da esquerda, altura]
  salaCanos: { entrada: [36, 3], saida: [45, 2] },    // o primeiro leva à sala secreta; a saída devolve pelo segundo
  sala: { x0: 300, x1: 322, entrada: 302, saida: 316 },
  moedas: [
    [9, 1], [10, 1], [11, 1], [12, 1],
    [36.5, 4.3], [37.5, 4.3],
    [58, 6], [59, 6], [61, 6], [62, 6], [63, 6],
    [72, 1], [73, 1], [74, 1],
    [101, 2.4], [102, 3.4], [103, 5.6], [104, 3.4], [105, 2.4],
  ],
  // inimigos: [coluna, mínimo, máximo, tipo] — borracha anda; manchinha de tinta pula
  inimigos: [[32, 29, 35, "b"], [51, 47, 55, "m"], [71, 67, 76, "b"], [94, 90, 97, "m"], [56, 47, 57, "b"]],
  piramide: [100, 4],
  mastro: 114,
  castelo: 121,
  fim: 128,
  letras: [
    [13, 0.9], [16, 0.9], [20, 2.0], [24, 0.9], [30, 0.9], [33, 2.6], [49, 0.9], [54, 2.6],
    [61, 2.0], [66, 2.4], [70, 0.9], [75, 2.6], [79, 2.0], [88, 0.9], [96, 2.4], [103, 4.4],
  ],
};

// céu, neblina e morros de cada fase
export const TEMAS = [
  { nome: "Manhã na escola", ceu: [0x3fa6ff, 0xc4efff], neblina: 0xb8ecff, morros: [0x5cc13a, 0x79d24f, 0x3a9227], luz: 2.4 },
  { nome: "Campo florido", ceu: [0x4fb3ff, 0xe4f7ff], neblina: 0xd8f4ff, morros: [0x6fd04f, 0x8fe06a, 0x4ea533], luz: 2.4 },
  { nome: "Tarde dourada", ceu: [0x4a9ef0, 0xffe9b0], neblina: 0xffe9c4, morros: [0x8cc63f, 0xa8d65a, 0x6a9f2a], luz: 2.5, corLuz: 0xfff0cc },
  { nome: "Dia de vento", ceu: [0x6aa8e8, 0xe6eef8], neblina: 0xdce8f4, morros: [0x58b46a, 0x76c486, 0x3e8c50], luz: 2.1 },
  { nome: "Primavera", ceu: [0x8fb8ff, 0xffe0ef], neblina: 0xffe6f1, morros: [0x7fd36a, 0xf7a8c8, 0x58a94a], luz: 2.3 },
  { nome: "Verão", ceu: [0x1c9cff, 0xbfefff], neblina: 0xbfefff, morros: [0x4fc03a, 0x6fd04f, 0x2f8f22], luz: 2.7 },
  { nome: "Outono", ceu: [0x5a9be0, 0xffe2c4], neblina: 0xffe2c4, morros: [0xe0913a, 0xf0b04a, 0xb8641e], luz: 2.3, corLuz: 0xffe4c4 },
  { nome: "Inverno", ceu: [0x8fc4ff, 0xf4fbff], neblina: 0xf0f8ff, morros: [0xf4f8ff, 0xdde8f6, 0xb8c8de], luz: 2.2 },
  { nome: "Pôr do sol", ceu: [0x6a4fc4, 0xffb27a], neblina: 0xffc79a, morros: [0x8a6fc4, 0xb48ad4, 0x5a4a9a], luz: 1.9, corLuz: 0xffc58a },
  { nome: "Noite estrelada", ceu: [0x0b1b4a, 0x2a3f86], neblina: 0x1d2d66, morros: [0x1f4a5a, 0x2a5a6a, 0x143a48], luz: 1.1, corLuz: 0xaecbff, ambiente: 0.9, estrelas: true },
];

function gerar(n) {
  const r = aleatorio(4000 + n * 97);
  const sorteio = (k) => Math.floor(r() * k);
  const f = { inicio: 7, blocos: [], canos: [], moedas: [[9, 1], [10, 1], [11, 1]], inimigos: [], letras: [], piramide: [100, 4], mastro: 114, castelo: 121, fim: 128, sala: { x0: 300, x1: 322, entrada: 302, saida: 316 } };
  const livres = []; // trechos de chão sem nada em cima: [x0, x1] (para inimigos e letras)
  // sequência de trechos: sempre dois canos (sala secreta), blocos, degraus e campo
  const base = ["cano", "blocos", "campo", "cano", "degraus", "blocos", "campo"];
  const extras = ["blocos", "campo", "cano", "degraus", "blocos", "campo"];
  const seq = [...base];
  for (let i = seq.length - 1; i > 0; i--) { const j = sorteio(i + 1); [seq[i], seq[j]] = [seq[j], seq[i]]; }
  let x = 12;
  let k = 0;
  while (x < 90) {
    const tipo = k < seq.length ? seq[k] : extras[sorteio(extras.length)];
    k++;
    if (tipo === "blocos") {
      const L = 3 + sorteio(4), y = 4;
      for (let i = 0; i < L; i++) f.blocos.push([x + i, y, r() < 0.4 || i === Math.floor(L / 2) ? "q" : "t"]);
      if (r() < 0.5) f.blocos.push([x + Math.floor(L / 2), 8, "q"]);
      for (let i = 0; i < L; i++) if (r() < 0.6) f.moedas.push([x + i, 6]);
      f.letras.push([x + Math.floor(L / 2), 2.0]);
      livres.push([x - 1, x + L + 1]);
      x += L + 3;
    } else if (tipo === "cano") {
      const h = n >= 5 && r() < 0.5 ? 3 : 2 + sorteio(2);
      f.canos.push([x, h]);
      f.moedas.push([x + 0.5, h + 1.3], [x + 1.5, h + 1.3]);
      f.letras.push([x + 4, r() < 0.5 ? 0.9 : 2.4]);
      livres.push([x + 3, x + 6]);
      x += 7;
    } else if (tipo === "degraus") {
      const alt = n >= 6 ? 3 : 2;
      const alturas = alt === 3 ? [1, 2, 3, 3, 2, 1] : [1, 2, 2, 1];
      alturas.forEach((h, i) => { for (let y = 0; y < h; y++) f.blocos.push([x + i, y, "d"]); });
      const topo = Math.floor(alturas.length / 2);
      f.letras.push([x + topo, alt + 1.4]);
      f.moedas.push([x + topo - 1, alt + 1.2], [x + topo + 1, alt + 1.2]);
      x += alturas.length + 3;
    } else {
      const L = 6 + sorteio(4);
      for (let i = 1; i < L - 1; i++) if (i % 2) f.moedas.push([x + i, r() < 0.5 ? 1 : 2.6]);
      f.letras.push([x + 1, 0.9], [x + L - 2, r() < 0.5 ? 2.6 : 0.9]);
      livres.push([x, x + L]);
      x += L;
    }
  }
  // inimigos nos trechos livres (mais a cada fase); manchinhas aparecem a partir da fase 3
  const quantos = Math.min(livres.length, 3 + Math.floor(n / 2));
  const escolhidos = [...livres].sort(() => r() - 0.5).slice(0, quantos);
  for (const [a, b] of escolhidos) {
    if (b - a < 3) continue;
    f.inimigos.push([Math.round((a + b) / 2), a + 0.5, b - 0.5, n >= 3 && r() < 0.35 + n * 0.03 ? "m" : "b"]);
  }
  // sala secreta: entra pelo primeiro cano de altura 3 (ou o primeiro) e sai pelo seguinte
  const entrada = f.canos.find((c) => c[1] >= 2) ?? f.canos[0];
  const saida = f.canos.find((c) => c !== entrada && c[0] > entrada[0]) ?? f.canos.find((c) => c !== entrada);
  f.salaCanos = { entrada, saida };
  // letras: mais as do fim (perto e em cima da pirâmide); precisa de pelo menos 16, em ordem
  f.letras.push([96, 2.4], [103, 4.4]);
  let extra = 15;
  while (f.letras.length < 16) { f.letras.push([extra, 0.9]); extra += 6; }
  f.letras.sort((a, b) => a[0] - b[0]);
  // tira letras que caíram dentro de cano ou de degrau
  const dentro = ([lx, ly]) => f.canos.some(([cx, h]) => lx >= cx - 0.2 && lx <= cx + 2.2 && ly < h + 0.6) || f.blocos.some(([bx, by, t]) => t === "d" && Math.abs(lx - bx) < 0.6 && ly < by + 1.6 && ly > by - 0.8);
  f.letras = f.letras.filter((l) => !dentro(l));
  while (f.letras.length < 16) { const l = [10 + f.letras.length * 5.5, 0.9]; f.letras.push(dentro(l) ? [l[0] + 2.5, 0.9] : l); f.letras.sort((a, b) => a[0] - b[0]); }
  return f;
}

// A fileira de blocos fica na altura 4 (o topo, 5, é mais alto que o pulo: ~3,7 blocos); em cima dela há moedas ou uma caixa "?".
// Para dar para subir em qualquer uma, cada fileira ganha uma escadinha de blocos duros ao lado (alturas 2 e 3, cada degrau < 85% do pulo),
// do lado onde houver espaço livre (sem cano, bloco ou a parede do início); o passeio dos inimigos é encurtado para não atravessar a escadinha.
function escadinhas(f) {
  const cols = [...new Set(f.blocos.filter(([, a]) => a === 4).map(([c]) => c))].sort((x, y) => x - y);
  const fileiras = [];
  for (const c of cols) { const u = fileiras[fileiras.length - 1]; if (u && c === u[1] + 1) u[1] = c; else fileiras.push([c, c]); }
  const ocupa = (c0, c1) => c0 < 3 || f.canos.some(([cx]) => cx < c1 + 1 && cx + 2 > c0) || f.blocos.some(([bx]) => bx < c1 + 1 && bx + 1 > c0)
    || (c1 + 1 > f.piramide[0] - 1);
  for (const [a, b] of fileiras) {
    const esq = !ocupa(a - 2, a - 1), dir = !ocupa(b + 1, b + 2);
    if (!esq && !dir) continue;
    const lado = esq ? [[a - 2, 2], [a - 1, 3]] : [[b + 2, 2], [b + 1, 3]];
    for (const [col, h] of lado) for (let y = 0; y < h; y++) f.blocos.push([col, y, "d"]);
    const c0 = Math.min(lado[0][0], lado[1][0]), c1 = c0 + 2;
    f.moedas = f.moedas.filter(([mx, my]) => !(mx > c0 - 0.3 && mx < c1 + 0.3 && my < 4.5));
    f.inimigos = f.inimigos.map(([ic, ia, ib, it]) => {
      if (!(ia < c1 && ib > c0)) return [ic, ia, ib, it];
      const na = esq ? Math.max(ia, c1 + 0.5) : ia, nb = esq ? ib : Math.min(ib, c0 - 0.5);
      return nb - na < 2 ? null : [Math.min(nb, Math.max(na, ic)), na, nb, it];
    }).filter(Boolean);
    // letras que cairiam dentro da escadinha vão para a primeira coluna livre ao lado dela
    f.letras = f.letras.map(([lx, ly]) => (lx > c0 - 0.3 && lx < c1 + 0.3 && ly < 4 ? [esq ? c0 - 0.6 : c1 + 0.6, ly] : [lx, ly]));
    f.letras.sort((p, q) => p[0] - q[0]);
  }
  return f;
}

export function faseAtual() {
  const n = Math.min(10, Math.max(1, Number(new URLSearchParams(location.search).get("fase")) || 1));
  return { numero: n, tema: TEMAS[n - 1], ...escadinhas(n === 1 ? structuredClone(ORIGINAL) : gerar(n)) };
}
