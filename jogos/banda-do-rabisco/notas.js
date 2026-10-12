// Instrumentos 8-bit da Banda do Rabisco. A escala do motor (sons.nota) não tem Fá nem Si,
// e "Brilha, brilha estrelinha" precisa deles; por isso a lógica de Web Audio de
// src/motor/sons.js foi copiada aqui (onda de pulso + triângulo + ruído), sem mexer no motor.
import { sons } from "../../src/motor/sons.js";

let ctx = null, mestre = null, bufferRuido = null;
const ondas = {};

function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    mestre = ctx.createGain();
    mestre.gain.value = 0.5;
    const filtro = ctx.createBiquadFilter(); // tira o chiado agudo, como no motor
    filtro.type = "lowpass";
    filtro.frequency.value = 9000;
    mestre.connect(filtro).connect(ctx.destination);
    for (const duty of [0.125, 0.25, 0.5]) ondas[duty] = ondaPulso(duty);
    bufferRuido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = bufferRuido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function ondaPulso(duty) {
  const n = 64;
  const re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * 2;
  return ctx.createPeriodicWave(re, im);
}

// nota com ataque rápido e queda exponencial (som de tecla batida, tipo xilofone)
function nota(freq, inicio, dur, { onda = 0.25, vol = 0.1, ate = null } = {}) {
  const a = audio();
  const t = a.currentTime + inicio;
  const o = a.createOscillator();
  const g = a.createGain();
  if (onda === "tri" || onda === "sine") o.type = onda === "tri" ? "triangle" : "sine";
  else o.setPeriodicWave(ondas[onda]);
  o.frequency.setValueAtTime(freq, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(mestre);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function ruido(inicio, dur, { vol = 0.15, freq = 4000, tipo = "bandpass" } = {}) {
  const a = audio();
  const t = a.currentTime + inicio;
  const s = a.createBufferSource();
  s.buffer = bufferRuido;
  const f = a.createBiquadFilter();
  f.type = tipo;
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(mestre);
  s.start(t);
  s.stop(t + dur + 0.02);
}

const hz = (semis) => 440 * Math.pow(2, semis / 12);
// Dó5 Ré5 Mi5 Fá5 Sol5 Lá5 Si5 Dó6 (semitons a partir do Lá4)
const ESCALA = [3, 5, 7, 8, 10, 12, 14, 15].map(hz);

export const instrumentos = {
  tecla(i) {
    if (sons.mudo) return;
    const f = ESCALA[i % ESCALA.length];
    nota(f, 0, 0.55, { onda: 0.25, vol: 0.1 });
    nota(f * 2, 0, 0.18, { onda: "tri", vol: 0.06 }); // brilho de baqueta no começo
  },
  tambor() {
    if (sons.mudo) return;
    nota(160, 0, 0.3, { onda: "tri", vol: 0.55, ate: 50 });
    ruido(0, 0.16, { vol: 0.18, freq: 700 });
  },
  sino() {
    if (sons.mudo) return;
    nota(hz(19), 0, 0.9, { onda: "sine", vol: 0.12 });
    nota(hz(26), 0, 0.6, { onda: 0.125, vol: 0.04 });
    nota(hz(31), 0.02, 0.4, { onda: "sine", vol: 0.05 });
  },
  chocalho() {
    if (sons.mudo) return;
    for (const t of [0, 0.09, 0.18]) ruido(t, 0.07, { vol: 0.16, freq: 7000, tipo: "highpass" });
  },
  destravar() { audio(); },
};
