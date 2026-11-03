// Rabiscolândia: músicas das cenas das parceiras (a valsa do ensaio e a da apresentação da Ballet e Cia, a marchinha do desfile
// da BT Models) e do Natal (a música da praça e a marchinha do desfile de Natal). Composições próprias, tocadas na hora com osciladores no estilo 8-bit. O relógio é o da página, e cada nota vira
// nós de áudio só quando chega a hora dela (nada por quadro); elas saem por um volume próprio, ligado ao volume geral.
//
//   const m = criarSequencia(VALSA);  m.iniciar();  m.atualizar() (a cada quadro);  m.batida() (em que batida está);  m.parar();

import { sons } from "../../src/motor/sons.js";

const freq = (m) => 440 * 2 ** ((m - 69) / 12);
const ANTECEDE = 0.25; // segundos: quanto adiantado cada nota é marcada

let pulso = null;
function ondaPulso(ac) {
  if (pulso?.ac === ac) return pulso.onda;
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25) * 2;
  pulso = { ac, onda: ac.createPeriodicWave(re, im) };
  return pulso.onda;
}
let chiado = null;
function bufferChiado(ac) {
  if (chiado?.ac === ac) return chiado.b;
  const b = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.25), ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  chiado = { ac, b };
  return b;
}

// trilha: { onda: "tri" | "pulso" | "quadrada" | "chiado", vol, laco (batidas), notas: [batida, duração, midi, ...] }
export function criarSequencia({ bpm, trilhas, volume = 0.75 }) {
  const seg = 60 / bpm;
  let ac = null, saida = null, base = 0, ultimo = 0, ligado = false, off = 0;
  const pos = trilhas.map(() => ({ i: 0, volta: 0 }));
  const agora = () => performance.now() / 1000;
  function tocar(tr, tNota, durS, midi) {
    const at = tNota + off;
    if (at < ac.currentTime - 0.01) return; // o quadro atrasou: essa passou
    const g = ac.createGain(), fim = at + durS;
    g.gain.setValueAtTime(tr.vol, at); g.gain.setValueAtTime(tr.vol, Math.max(at, fim - 0.05)); g.gain.linearRampToValueAtTime(0.0001, fim);
    g.connect(saida);
    let o;
    if (tr.onda === "chiado") { o = ac.createBufferSource(); o.buffer = bufferChiado(ac); const f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = midi; o.connect(f).connect(g); }
    else {
      o = ac.createOscillator();
      if (tr.onda === "tri") o.type = "triangle"; else if (tr.onda === "quadrada") o.type = "square"; else o.setPeriodicWave(ondaPulso(ac));
      o.frequency.setValueAtTime(freq(midi), at); o.connect(g);
    }
    o.start(at); o.stop(fim + 0.02);
    o.onended = () => g.disconnect();
  }
  const api = {
    get ligada() { return ligado; },
    iniciar(atraso = 0.15) {
      try { ({ ctx: ac } = sons.saida()); const { mestre } = sons.saida(); saida = ac.createGain(); saida.gain.value = volume; saida.connect(mestre); } catch { ac = null; }
      base = agora() + atraso; ultimo = agora(); ligado = true;
      pos.forEach((p) => { p.i = 0; p.volta = 0; });
      if (ac) off = ac.currentTime - agora();
      api.atualizar();
    },
    // em que batida está (a contagem nunca depende do áudio: sem som, o minijogo anda igual)
    batida() { return ligado ? (agora() - base) / seg : 0; },
    tempoDaBatida(b) { return b * seg; },
    seg,
    atualizar() {
      if (!ligado) return;
      const t = agora();
      if (t - ultimo > 1.5) { base += t - ultimo; if (ac) off = ac.currentTime - t; } // jogo pausado ou aba escondida: a música espera
      ultimo = t;
      if (!ac) return;
      trilhas.forEach((tr, k) => {
        const p = pos[k];
        for (let guarda = 0; guarda < 64; guarda++) {
          const tN = base + (p.volta * tr.laco + tr.notas[p.i]) * seg;
          if (tN > t + ANTECEDE) break;
          tocar(tr, tN, tr.notas[p.i + 1] * seg * (tr.solto ?? 0.92), tr.notas[p.i + 2]);
          p.i += 3; if (p.i >= tr.notas.length) { p.i = 0; p.volta++; }
        }
      });
    },
    // volume relativo (0 a 1) sobre o volume da música: a da praça sobe e desce com a distância
    volume(v) { if (saida && ac) saida.gain.setTargetAtTime(volume * Math.max(0, Math.min(1, v)), ac.currentTime, 0.15); },
    parar(saidaS = 0.5) {
      ligado = false;
      if (saida && ac) { const s = saida; s.gain.setTargetAtTime(0, ac.currentTime, saidaS / 3); setTimeout(() => s.disconnect(), saidaS * 2000); }
      saida = null;
    },
  };
  return api;
}

// ---- notas: dó = 60. Melodia em [duração, midi], por compasso, e um acorde por compasso
const C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79, A5 = 81, B5 = 83, C6 = 84;
const ACORDES = { C: [48, 64, 67], Am: [45, 64, 69], F: [41, 65, 69], G: [43, 62, 67], Dm: [38, 62, 65], Em: [40, 64, 67] };
const juntar = (compassos, durC, sobe = 0) => {
  const out = []; let b = 0;
  compassos.forEach((notas, c) => { b = c * durC; for (const [d, m] of notas) { out.push(b, d, m + sobe); b += d; } });
  return out;
};
const FRASE_A = [[[2, E5], [1, G5]], [[1, A5], [1, G5], [1, E5]], [[2, F5], [1, A5]], [[3, G5]], [[2, C6], [1, B5]], [[1, A5], [1, F5], [1, D5]], [[1, G5], [1, E5], [1, D5]], [[3, C5]]];
const FRASE_B = [[[1, G5], [1, A5], [1, B5]], [[2, C6], [1, G5]], [[1, F5], [1, G5], [1, A5]], [[2, G5], [1, E5]], [[1, D5], [1, E5], [1, F5]], [[2, E5], [1, C5]], [[1.5, D5], [0.5, E5], [1, D5]], [[3, C5]]];
const HARMONIA = ["C", "Am", "F", "G", "Am", "Dm", "G", "C", "G", "C", "F", "C", "Dm", "Am", "G", "C"];
const baixoValsa = (sobe = 0) => HARMONIA.flatMap((a, c) => [c * 3, 1, ACORDES[a][0] + sobe]);
const dedilhado = (sobe = 0) => HARMONIA.flatMap((a, c) => [c * 3 + 1, 0.7, ACORDES[a][1] + sobe, c * 3 + 2, 0.7, ACORDES[a][2] + sobe]);
const brilho = (sobe = 0) => HARMONIA.flatMap((a, c) => { const [, x, y] = ACORDES[a]; return [c * 3, 0.5, x + 12 + sobe, c * 3 + 0.5, 0.5, y + 12 + sobe, c * 3 + 1, 0.5, x + 24 + sobe, c * 3 + 1.5, 0.5, y + 12 + sobe, c * 3 + 2, 0.5, x + 12 + sobe, c * 3 + 2.5, 0.5, y + sobe]; });

// a valsa do ensaio, de caixinha de música
export const VALSA = { bpm: 108, trilhas: [
  { onda: "pulso", vol: 0.1, laco: 48, notas: juntar([...FRASE_A, ...FRASE_B], 3) },
  { onda: "tri", vol: 0.2, laco: 48, notas: baixoValsa() },
  { onda: "pulso", vol: 0.035, laco: 48, notas: dedilhado() },
] };
// a mesma valsa na apresentação: um tom acima, mais depressa, com arpejo por cima
export const VALSA_SHOW = { bpm: 120, trilhas: [
  { onda: "quadrada", vol: 0.075, laco: 48, notas: juntar([...FRASE_A, ...FRASE_B], 3, 5) },
  { onda: "tri", vol: 0.22, laco: 48, notas: baixoValsa(5) },
  { onda: "pulso", vol: 0.035, laco: 48, notas: dedilhado(5) },
  { onda: "pulso", vol: 0.028, laco: 48, notas: brilho(5), solto: 0.7 },
] };

// a marchinha do desfile, em 4 por 4: cada 8 batidas tem uma chamada
const BAIXO4 = [[36, 43], [41, 48], [45, 52], [43, 50]];
const MELODIA4 = [
  [[0.5, E5], [0.5, G5], [1, C6], [0.5, B5], [0.5, G5], [1, E5]], [[0.5, F5], [0.5, A5], [1, C6], [1, A5], [1, F5]],
  [[0.5, E5], [0.5, A5], [1, C6], [0.5, B5], [0.5, A5], [1, E5]], [[0.5, D5], [0.5, G5], [1, B5], [0.5, A5], [0.5, G5], [1, F5]],
];
export const DESFILE = { bpm: 120, trilhas: [
  { onda: "pulso", vol: 0.075, laco: 16, notas: juntar(MELODIA4, 4) },
  { onda: "tri", vol: 0.22, laco: 16, notas: BAIXO4.flatMap(([a, b], c) => [0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => [c * 4 + i / 2, 0.42, i % 4 === 2 ? b : a])) },
  { onda: "chiado", vol: 0.035, laco: 1, notas: [0.5, 0.12, 7000], solto: 1 },
  { onda: "chiado", vol: 0.05, laco: 2, notas: [1, 0.16, 2600], solto: 1 },
] };

// ---- Natal (modo Natal, natal.js). Composições próprias, nenhuma canção conhecida: melodia, harmonia e ritmo inventados aqui.
// A da praça ("Luzes na Praça"): 4 por 4, em fá maior, 16 compassos; baixo de marchinha, dedilhado e um guizo leve no contratempo.
const NF = { C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, Bb4: 70, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, Bb5: 82, C6: 84 };
const MEL_PRACA = [
  [[1, NF.C5], [1, NF.F5], [0.5, NF.E5], [0.5, NF.F5], [1, NF.G5]], [[1.5, NF.A5], [0.5, NF.G5], [1, NF.F5], [1, NF.D5]],
  [[1, NF.Bb4], [1, NF.D5], [0.5, NF.C5], [0.5, NF.Bb4], [1, NF.A4]], [[1, NF.G4], [0.5, NF.A4], [0.5, NF.Bb4], [2, NF.C5]],
  [[1, NF.C5], [1, NF.F5], [0.5, NF.E5], [0.5, NF.F5], [1, NF.G5]], [[1, NF.A5], [1, NF.C6], [0.5, NF.Bb5], [0.5, NF.A5], [1, NF.G5]],
  [[1, NF.F5], [0.5, NF.E5], [0.5, NF.D5], [1, NF.G5], [1, NF.E5]], [[3, NF.F5]],
  [[1, NF.A5], [0.5, NF.Bb5], [0.5, NF.A5], [1, NF.G5], [1, NF.F5]], [[1, NF.G5], [0.5, NF.A5], [0.5, NF.G5], [1, NF.F5], [1, NF.E5]],
  [[1, NF.F5], [1, NF.D5], [0.5, NF.E5], [0.5, NF.F5], [1, NF.G5]], [[3, NF.C5]],
  [[1, NF.D5], [1, NF.F5], [1.5, NF.Bb5], [0.5, NF.A5]], [[1, NF.G5], [1, NF.E5], [2, NF.C5]],
  [[1, NF.D5], [1, NF.E5], [1, NF.F5], [1, NF.G5]], [[4, NF.F5]],
];
const AC_NATAL = { F: [41, 65, 69, 72], Dm: [38, 62, 65, 69], Bb: [46, 62, 65, 70], C: [36, 64, 67, 70], Gm: [43, 62, 67, 70] };
const HARM_PRACA = ["F", "Dm", "Bb", "C", "F", "F", "C", "F", "F", "C", "Bb", "C", "Bb", "C", "Gm", "F"];
export const NATAL_PRACA = { bpm: 108, volume: 0.6, trilhas: [
  { onda: "pulso", vol: 0.075, laco: 64, notas: juntar(MEL_PRACA, 4) },
  { onda: "tri", vol: 0.2, laco: 64, notas: HARM_PRACA.flatMap((a, c) => [c * 4, 0.9, AC_NATAL[a][0], c * 4 + 2, 0.9, AC_NATAL[a][0] + 7]) },
  { onda: "pulso", vol: 0.026, laco: 64, notas: HARM_PRACA.flatMap((a, c) => [1, 3].flatMap((b) => [c * 4 + b, 0.45, AC_NATAL[a][1] + 12, c * 4 + b + 0.5, 0.45, AC_NATAL[a][2] + 12])), solto: 0.6 },
  // sininho: uma nota bem aguda no começo de cada dois compassos
  { onda: "quadrada", vol: 0.018, laco: 8, notas: [0, 0.25, NF.F5 + 12, 0.5, 0.25, NF.C5 + 24], solto: 0.5 },
  { onda: "chiado", vol: 0.03, laco: 1, notas: [0.5, 0.1, 8000], solto: 1 },
] };
// a do desfile de Natal: a mesma batida da marchinha do desfile (cada 8 batidas tem uma chamada), com melodia de Natal própria
const MEL_DESFILE_NATAL = [
  [[0.5, G5], [0.5, E5], [1, G5], [1, C6], [0.5, B5], [0.5, A5]], [[1, G5], [1, E5], [0.5, F5], [0.5, G5], [1, A5]],
  [[0.5, F5], [0.5, D5], [1, F5], [1, B5], [0.5, A5], [0.5, G5]], [[1, E5], [1, C5], [0.5, D5], [0.5, E5], [1, C5]],
];
export const DESFILE_NATAL = { bpm: 120, trilhas: [
  { onda: "pulso", vol: 0.075, laco: 16, notas: juntar(MEL_DESFILE_NATAL, 4) },
  { onda: "tri", vol: 0.22, laco: 16, notas: [[36, 43], [36, 43], [43, 50], [36, 43]].flatMap(([a, b], c) => [0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => [c * 4 + i / 2, 0.42, i % 4 === 2 ? b : a])) },
  { onda: "quadrada", vol: 0.016, laco: 4, notas: [0, 0.2, 96, 2, 0.2, 91], solto: 0.5 },
  { onda: "chiado", vol: 0.04, laco: 1, notas: [0.5, 0.12, 8500], solto: 1 },
  { onda: "chiado", vol: 0.05, laco: 2, notas: [1, 0.16, 2600], solto: 1 },
] };
