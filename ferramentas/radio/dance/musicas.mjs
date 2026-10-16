// Rádio Rabisco (gospel dance): as melodias de DOMÍNIO PÚBLICO e as cifras de cada faixa.
// Tempos em batidas (semínimas), compasso 4/4 já alinhado com o bumbo: a batida 0 é o 1º tempo do 1º compasso.
// Cada nota: [início, duração, nota MIDI]. Cifras: [início, "C" | "Am" | "F" ...] (tríades; as cores vêm no arranjo).
//
// Melodias tiradas das edições de domínio público (src/radio/hinos.js, Open Hymnal) ou escritas aqui
// (Quando os Santos, tradicional; Hino à Alegria, Beethoven 1824). Os arranjos (ritmo, baixo, sintetizadores,
// viradas) são originais: nada é copiado de gravação nenhuma.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const RAIZ = new URL("../../../", import.meta.url);

export function lerHinos() {
  const s = readFileSync(new URL("src/radio/hinos.js", RAIZ), "utf8").replace(/export const/g, "const");
  return new Function(s + ";return HINOS")();
}
const trios = (l) => { const o = []; for (let i = 0; i < l.length; i += 3) o.push([l[i], l[i + 1], l[i + 2]]); return o; };

// ------------------------------------------------------------------ cifras automáticas a partir das 4 vozes
const NOMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MAIOR = [0, 2, 4, 5, 7, 9, 11];
function soando(notas, t) { return notas.find(([i, d]) => i <= t + 1e-6 && t < i + d - 1e-6); }
// janela de 2 batidas: pesa as classes de nota pela duração; o baixo do começo da janela vale mais
export function cifrasDasVozes(vozes, baixo, total, tonica, janela = 2) {
  const todas = vozes.flat();
  const out = [];
  let ant = null;
  for (let w = 0; w < total; w += janela) {
    const peso = new Array(12).fill(0);
    for (const [i, d, m] of todas) {
      const sob = Math.min(i + d, w + janela) - Math.max(i, w);
      if (sob > 0) peso[m % 12] += sob;
    }
    const b = soando(baixo, w) || soando(baixo, w + 0.5);
    const pb = b ? b[2] % 12 : null;
    if (pb != null) peso[pb] += 1.5;
    let melhor = null, nota = -Infinity;
    for (let r = 0; r < 12; r++) for (const menor of [false, true]) {
      const pcs = [r, (r + (menor ? 3 : 4)) % 12, (r + 7) % 12];
      let s = 0;
      for (let p = 0; p < 12; p++) s += pcs.includes(p) ? peso[p] : -0.7 * peso[p];
      if (pb === r) s += 1.5; else if (pcs.includes(pb)) s += 0.3;
      const grau = (r - tonica + 12) % 12;
      const diat = MAIOR.includes(grau) && (menor ? [2, 4, 9].includes(grau) : [0, 5, 7].includes(grau));
      if (!diat) s -= grau === 2 && !menor ? 0.5 : grau === 4 && !menor ? 0.7 : 1.6; // II e III maiores (dominantes secundárias) passam
      const nome = NOMES[r] + (menor ? "m" : "");
      if (nome === ant) s += 0.35;
      if (s > nota) { nota = s; melhor = nome; }
    }
    if (melhor !== ant) out.push([w, melhor]);
    ant = melhor;
  }
  return out;
}

// remapeia o tempo (para encaixar no 4/4 do arranjo) e estende a nota que termina uma frase
function remapear(notas, f, fimDe = null) {
  return notas.map(([i, d, m]) => { const a = f(i), b = fimDe ? fimDe(i, i + d) : f(i + d); return [a, Math.max(0.25, b - a), m]; });
}

// ------------------------------------------------------------------ as faixas
// estrutura: intro 4 compassos · A (melodia inteira, mais leve) · subida 4 · DROP · final 4
// drop: { de, ate } em compassos da melodia, tocado "vezes" vezes
export function faixas() {
  const H = lerHinos();
  const lista = [];

  // 1) Quando os Santos (When the Saints Go Marching In) — spiritual tradicional, séc. XIX. Escrita em Dó, toca em Sol.
  {
    const C = 72, D = 74, E = 76, F = 77, G = 79;
    const mel = [
      [1, 1, C], [2, 1, E], [3, 1, F], [4, 4, G],
      [9, 1, C], [10, 1, E], [11, 1, F], [12, 4, G],
      [17, 1, C], [18, 1, E], [19, 1, F], [20, 2, G], [22, 2, E], [24, 2, C], [26, 2, E], [28, 3, D],
      [33, 1, E], [34, 1, E], [35, 1, D], [36, 3, C], [39, 1, C], [40, 2, E], [42, 2, G], [44, 1, G], [45, 3, F],
      [50, 1, E], [51, 1, F], [52, 2, G], [54, 2, E], [56, 2, C], [58, 2, D], [60, 4, C],
    ];
    const cif = [[0, "C"], [8, "C"], [12, "Am"], [16, "F"], [20, "C"], [24, "Am"], [28, "G"], [32, "C"], [36, "C"], [40, "F"], [44, "Fm"], [48, "C"], [52, "Am"], [56, "G"], [60, "C"]];
    lista.push({ id: "santos", nome: "Quando os Santos", hino: "When the Saints Go Marching In", autor: "spiritual tradicional (séc. XIX)", ano: "tradicional",
      bpm: 126, transp: -5, mel, cifras: cif, compassos: 16, drop: { de: 0, ate: 16, vezes: 1 }, semente: 11, cor: "a" });
  }

  // 2) Alegria (Hino à Alegria) — Ludwig van Beethoven, 9ª Sinfonia (1824). Em Dó.
  {
    const G3 = 67, C = 72, D = 74, E = 76, F = 77, G = 79;
    const q = (t, m, d = 1) => [t, d, m];
    const l1 = (o) => [q(o, E), q(o + 1, E), q(o + 2, F), q(o + 3, G), q(o + 4, G), q(o + 5, F), q(o + 6, E), q(o + 7, D), q(o + 8, C), q(o + 9, C), q(o + 10, D), q(o + 11, E)];
    const mel = [
      ...l1(0), q(12, E, 1.5), q(13.5, D, 0.5), q(14, D, 2),
      ...l1(16), q(28, D, 1.5), q(29.5, C, 0.5), q(30, C, 2),
      q(32, D), q(33, D), q(34, E), q(35, C), q(36, D), q(37, E, 0.5), q(37.5, F, 0.5), q(38, E), q(39, C),
      q(40, D), q(41, E, 0.5), q(41.5, F, 0.5), q(42, E), q(43, D), q(44, C), q(45, D), q(46, G3, 2),
      ...l1(48), q(60, D, 1.5), q(61.5, C, 0.5), q(62, C, 2),
    ];
    const cif = [[0, "C"], [4, "G"], [8, "Am"], [10, "F"], [12, "G"], [16, "C"], [20, "G"], [24, "Am"], [26, "F"], [28, "G"], [30, "C"],
      [32, "G"], [34, "C"], [36, "G"], [38, "C"], [40, "G"], [42, "Am"], [44, "D"], [46, "G"], [48, "C"], [52, "G"], [56, "Am"], [58, "F"], [60, "G"], [62, "C"]];
    lista.push({ id: "alegria", nome: "Alegria", hino: "Hino à Alegria (Ode an die Freude)", autor: "Ludwig van Beethoven (1770–1827)", ano: 1824,
      bpm: 128, transp: 0, mel, cifras: cif, compassos: 16, drop: { de: 0, ate: 16, vezes: 1 }, semente: 23, cor: "b" });
  }

  // 3) Jesus Me Ama (Jesus Loves Me) — William B. Bradbury, 1862. Mi bemol → Fá.
  {
    const h = H["jesus-me-ama"];
    const mel = trios(h.mel), voz = trios(h.voz), baixo = trios(h.baixo);
    lista.push({ id: "jesus-me-ama", nome: "Jesus Me Ama", hino: "Jesus Loves Me", autor: h.autor, ano: h.ano,
      bpm: 124, transp: 2, mel, cifras: cifrasDasVozes([mel, voz, baixo], baixo, 64, 3), compassos: 16, drop: { de: 0, ate: 16, vezes: 1 }, semente: 37, cor: "c" });
  }

  // 4) Castelo Forte (Ein feste Burg) — Martinho Lutero, 1529. Ré.
  {
    const h = H["castelo-forte"];
    const mel = trios(h.mel), voz = trios(h.voz), baixo = trios(h.baixo);
    lista.push({ id: "castelo-forte", nome: "Castelo Forte", hino: "Ein feste Burg ist unser Gott", autor: h.autor, ano: h.ano,
      bpm: 125, transp: 0, mel, cifras: cifrasDasVozes([mel, voz, baixo], baixo, 64, 2), compassos: 16, drop: { de: 0, ate: 16, vezes: 1 }, semente: 41, cor: "d" });
  }

  // 5) Que Amigo em Cristo Temos (What a Friend) — Charles C. Converse, 1868. Fá → Lá.
  {
    const h = H["que-amigo"];
    const mel = trios(h.mel), voz = trios(h.voz), baixo = trios(h.baixo);
    lista.push({ id: "que-amigo", nome: "Que Amigo em Cristo", hino: "What a Friend We Have in Jesus", autor: h.autor, ano: h.ano,
      bpm: 122, transp: 4, mel, cifras: cifrasDasVozes([mel, voz, baixo], baixo, 64, 5), compassos: 16, drop: { de: 0, ate: 16, vezes: 1 }, semente: 53, cor: "e" });
  }

  // 6) Sou Feliz com Jesus (It Is Well with My Soul, melodia Ville du Havre) — Philip P. Bliss, 1876. Ré bemol → Mi.
  //    a anacruse vira o último tempo do compasso 0; o drop é o refrão ("sou feliz...") duas vezes.
  {
    const h = H["sou-feliz"];
    const f = (t) => t + 3;
    const fim = (i, e) => (e >= 84 - 1e-6 ? 88 : f(e));
    const mel = remapear(trios(h.mel), f, fim), voz = remapear(trios(h.voz), f, fim), baixo = remapear(trios(h.baixo), f, fim);
    lista.push({ id: "sou-feliz", nome: "Sou Feliz com Jesus", hino: "It Is Well with My Soul (Ville du Havre)", autor: h.autor, ano: h.ano,
      bpm: 128, transp: 3, mel, cifras: cifrasDasVozes([mel, voz, baixo], baixo, 88, 1), compassos: 22, drop: { de: 14, ate: 22, vezes: 2 }, semente: 67, cor: "f" });
  }

  // 7) Doxologia (Old Hundredth) — Louis Bourgeois, 1551. Sol → Si bemol. Cada verso (13 tempos) vira 4 compassos.
  {
    const h = H["doxologia"];
    const f = (t) => { const k = Math.min(3, Math.floor((t + 1e-6) / 13)); return 16 * k + (t - 13 * k); };
    // a nota que fecha o verso (começa 10 tempos depois do início dele) segura até o fim dos 4 compassos
    const fim = (i, e) => { const k = Math.min(3, Math.floor((i + 1e-6) / 13)); return i - 13 * k >= 10 - 1e-6 ? 16 * (k + 1) : f(e); };
    const mel = remapear(trios(h.mel), f, fim), voz = remapear(trios(h.voz), f, fim), baixo = remapear(trios(h.baixo), f, fim);
    lista.push({ id: "doxologia", nome: "Doxologia", hino: "Old Hundredth", autor: h.autor, ano: h.ano,
      bpm: 126, transp: 3, mel, cifras: cifrasDasVozes([mel, voz, baixo], baixo, 64, 7), compassos: 16, drop: { de: 0, ate: 16, vezes: 1 }, semente: 79, cor: "g" });
  }
  return lista;
}

// teste rápido: node ferramentas/radio/dance/musicas.mjs  → mostra as cifras
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const f of faixas()) {
    const fimMel = Math.max(...f.mel.map(([i, d]) => i + d));
    console.log(f.id, `${f.compassos} compassos, melodia até ${fimMel}`, "\n  ", f.cifras.map(([t, c]) => `${t}:${c}`).join(" "));
  }
}
