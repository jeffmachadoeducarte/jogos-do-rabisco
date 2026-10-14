// Efeitos 8-bit próprios do Rabisco e a Arca (composições originais, geradas na hora com Web Audio).
// Respeitam o mudo do jogo (sons.mudo de src/motor/sons.js). Os sons comuns (pulo, dano, porta,
// vitória) continuam vindo de src/motor/sons.js.

import { sons } from "../../src/motor/sons.js";

let ctx = null, mestre = null;
const ondas = {};

function audio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    mestre = ctx.createGain();
    mestre.gain.value = 0.5;
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 8000;
    mestre.connect(filtro).connect(ctx.destination);
    for (const duty of [0.125, 0.25, 0.5]) {
      const n = 48, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) re[k] = (4 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      ondas[duty] = ctx.createPeriodicWave(re, im);
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

const NOTAS = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
const N = (n) => { const [, nome, oit] = n.match(/^([A-G]#?)(\d)$/); return 440 * 2 ** ((NOTAS[nome] + (Number(oit) + 1) * 12 - 69) / 12); };

function nota(freq, inicio, dur, { onda = 0.25, vol = 0.08, ate = null, solta = 0.05 } = {}) {
  if (sons.mudo) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime + inicio;
  const o = a.createOscillator();
  if (onda === "tri") o.type = "triangle"; else o.setPeriodicWave(ondas[onda]);
  o.frequency.setValueAtTime(freq, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - solta));
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(mestre);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const seq = (lista, { onda = 0.25, vol = 0.08, passo = 0.1, baixo = false } = {}) => {
  let t = 0;
  for (const [n, d = 1] of lista) {
    if (n) {
      nota(N(n), t, passo * d * 0.95, { onda, vol });
      if (baixo) nota(N(n) / 4, t, passo * d * 0.95, { onda: "tri", vol: 0.22 });
    }
    t += passo * d;
  }
};

export const efeitos = {
  destravar() { audio(); },
  // ficha no fliperama (tela PRESS START)
  ficha() { nota(N("E6"), 0, 0.06, { onda: 0.5, vol: 0.07 }); nota(N("B6"), 0.06, 0.32, { onda: 0.5, vol: 0.07, solta: 0.28 }); },
  // vinheta de começo de fase (composição própria, ~2 s)
  vinheta() {
    seq([["G4"], ["C5"], ["E5"], ["G5", 2], ["E5"], ["G5", 3], [null], ["A4"], ["D5"], ["F5"], ["A5", 2], ["F5"], ["A5", 3], [null], ["B5"], ["C6", 4]], { onda: 0.5, vol: 0.06, passo: 0.085 });
    seq([["C3", 8], ["D3", 8], ["G3", 2], ["C3", 4]], { onda: "tri", vol: 0.25, passo: 0.085 });
  },
  // Manchinha joga um barril: "blop" que desce
  arremesso() { nota(N("A4"), 0, 0.16, { onda: 0.5, vol: 0.05, ate: N("A2") }); },
  // passinhos do Rabisco (bem baixinhos, como nos fliperamas)
  passo(alto) { nota(alto ? N("C4") : N("G3"), 0, 0.045, { onda: 0.125, vol: 0.025 }); },
  degrau(alto) { nota(alto ? N("E5") : N("C5"), 0, 0.05, { onda: 0.125, vol: 0.03 }); },
  // pegou o item certo
  pegou() {
    seq([["C5"], ["E5"], ["G5"], ["C6"], ["E6"], ["G6", 3]], { onda: 0.25, vol: 0.075, passo: 0.055 });
    nota(N("C3"), 0, 0.3, { onda: "tri", vol: 0.25 });
  },
  // pegou outro: dois "bups" suaves, sem bronca
  outro() { nota(N("G4"), 0, 0.1, { onda: 0.5, vol: 0.05 }); nota(N("E4"), 0.11, 0.18, { onda: 0.5, vol: 0.05 }); },
  // o pedido em inglês vai começar
  chamada() { nota(N("A5"), 0, 0.07, { onda: 0.125, vol: 0.05 }); nota(N("D6"), 0.08, 0.14, { onda: 0.125, vol: 0.05 }); },
  // arco-íris se abrindo: escada de notas brilhantes
  arcoIris() {
    ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6", "G6", "A6", "C7"].forEach((n, i) => nota(N(n), i * 0.07, 0.3, { onda: 0.125, vol: 0.045, solta: 0.25 }));
  },
  // ovelhinha salva
  bee() { nota(N("D5"), 0, 0.12, { onda: 0.125, vol: 0.05 }); nota(N("C5"), 0.13, 0.3, { onda: 0.125, vol: 0.05, ate: N("A4") }); },
  // o bônus entra na pontuação
  bonus(i) { nota(N(["C6", "E6", "G6"][i % 3]), 0, 0.04, { onda: 0.5, vol: 0.035 }); },
};
