// Sons no estilo dos videogames 8-bit clássicos (canais de pulso, triângulo e ruído),
// gerados na hora com Web Audio. Efeitos e músicas são composições próprias.

let ctx = null;
let mestre = null;
let mudo = false;
const ondas = {};
let bufferRuido = null;

function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    mestre = ctx.createGain();
    mestre.gain.value = 0.5;
    const filtro = ctx.createBiquadFilter(); // tira o chiado agudo, deixa mais "console"
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

// Onda de pulso com ciclo de trabalho (duty) como nos consoles 8-bit
function ondaPulso(duty) {
  const n = 64;
  const re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * 2;
  // forma real: série de Fourier do pulso (parte em cosseno)
  for (let k = 1; k < n; k++) { re[k] = im[k]; im[k] = 0; }
  return ctx.createPeriodicWave(re, im);
}

function nota(freq, inicio, dur, { onda = 0.5, vol = 0.12, ate = null, solta = 0.04, saida = mestre } = {}) {
  const a = audio();
  const t = a.currentTime + inicio;
  const o = a.createOscillator();
  const g = a.createGain();
  if (onda === "tri") o.type = "triangle";
  else o.setPeriodicWave(ondas[onda]);
  o.frequency.setValueAtTime(freq, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol, t + Math.max(0, dur - solta));
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(saida);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function ruido(inicio, dur, { vol = 0.15, freq = 4000 } = {}) {
  const a = audio();
  const t = a.currentTime + inicio;
  const s = a.createBufferSource();
  s.buffer = bufferRuido;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(mestre);
  s.start(t);
  s.stop(t + dur + 0.02);
}

const N = (nome) => {
  // "C5", "F#4" -> Hz
  const m = /^([A-G])(#?)(\d)$/.exec(nome);
  const semis = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
};

export const sons = {
  destravar() { audio(); },
  alternarMudo() {
    mudo = !mudo;
    audio();
    mestre.gain.value = mudo ? 0 : 0.5;
    return mudo;
  },
  get mudo() { return mudo; },

  bipe(final = false) { nota(final ? N("A5") : N("A4"), 0, final ? 0.6 : 0.22, { onda: 0.5, vol: 0.1, solta: final ? 0.4 : 0.06 }); },
  turbo() { nota(N("C4"), 0, 0.5, { onda: 0.125, vol: 0.08, ate: N("C7") }); ruido(0, 0.5, { vol: 0.08, freq: 3000 }); },
  batida() { ruido(0, 0.18, { vol: 0.2, freq: 600 }); nota(N("C3"), 0, 0.12, { onda: "tri", vol: 0.4, ate: N("C2") }); },
  volta() { ["C5", "G5", "C6"].forEach((n, i) => nota(N(n), i * 0.1, 0.18, { onda: 0.25, vol: 0.09 })); },
  erro() { nota(N("E4"), 0, 0.14, { onda: 0.5, vol: 0.06 }); nota(N("C4"), 0.14, 0.25, { onda: 0.5, vol: 0.06 }); },
  cano() { ["G4", "D4", "G3", "D3", "G2"].forEach((n, i) => nota(N(n), i * 0.07, 0.09, { onda: 0.5, vol: 0.08 })); ruido(0, 0.35, { vol: 0.05, freq: 800 }); },
  pulo() { nota(N("C4"), 0, 0.2, { onda: 0.25, vol: 0.1, ate: N("C6"), solta: 0.08 }); },
  buzina() { for (const t of [0, 0.32]) { nota(N("F4"), t, 0.22, { onda: 0.5, vol: 0.09 }); nota(N("A4"), t, 0.22, { onda: 0.25, vol: 0.07 }); } },
  estouro() { ruido(0, 0.12, { vol: 0.25, freq: 2500 }); nota(N("C6"), 0, 0.1, { onda: 0.125, vol: 0.06, ate: N("C4") }); },
  nota(i) { const escala = ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6"]; nota(N(escala[i % escala.length]), 0, 0.25, { onda: 0.25, vol: 0.09, solta: 0.2 }); },
  moeda() {
    nota(N("B5"), 0, 0.08, { onda: 0.25, vol: 0.09, solta: 0.01 });
    nota(N("E6"), 0.08, 0.42, { onda: 0.25, vol: 0.09, solta: 0.38 });
  },
  letra() {
    ["C5", "E5", "G5", "C6", "E6", "G6"].forEach((n, i) => nota(N(n), i * 0.045, 0.09, { onda: 0.125, vol: 0.09 }));
    nota(N("C7"), 0.27, 0.35, { onda: 0.125, vol: 0.07, solta: 0.3 });
  },
  bloco() { nota(N("G2"), 0, 0.12, { onda: "tri", vol: 0.5, ate: N("C2") }); ruido(0, 0.06, { vol: 0.1, freq: 900 }); },
  pisao() { nota(N("C5"), 0, 0.08, { onda: 0.5, vol: 0.1, ate: N("C3") }); ruido(0.02, 0.1, { vol: 0.12, freq: 1500 }); },
  dano() {
    ["E5", "C5", "A4", "F4"].forEach((n, i) => nota(N(n), i * 0.07, 0.08, { onda: 0.5, vol: 0.08 }));
  },
  porta() {
    ["G4", "C5", "E5", "G5", "C6"].forEach((n, i) => nota(N(n), i * 0.08, 0.14, { onda: 0.25, vol: 0.09 }));
    nota(N("E6"), 0.42, 0.5, { onda: 0.25, vol: 0.07, solta: 0.45 });
  },
  vitoria() {
    // fanfarra de fim de fase (composição própria)
    const lead = [["G4", 0.1], ["C5", 0.1], ["E5", 0.1], ["G5", 0.1], ["C6", 0.1], ["E6", 0.1], ["G6", 0.35], ["E6", 0.35],
      ["G#4", 0.1], ["C5", 0.1], ["D#5", 0.1], ["G#5", 0.1], ["C6", 0.1], ["D#6", 0.1], ["G#6", 0.35], ["D#6", 0.35],
      ["A#4", 0.1], ["D5", 0.1], ["F5", 0.1], ["A#5", 0.1], ["D6", 0.1], ["F6", 0.1], ["A#6", 0.3], ["A#6", 0.1], ["A#6", 0.1], ["A#6", 0.1], ["C7", 0.8]];
    let t = 0;
    for (const [n, d] of lead) { nota(N(n), t, d, { onda: 0.5, vol: 0.07 }); nota(N(n) / 2, t, d, { onda: 0.25, vol: 0.05 }); t += d; }
    [["C3", 0.95], ["G#2", 0.95], ["A#2", 0.85], ["C3", 0.8]].reduce((acc, [n, d]) => { nota(N(n), acc, d, { onda: "tri", vol: 0.35 }); return acc + d; }, 0);
  },
};

// Músicas originais em loop: pulso (melodia) + triângulo (baixo) + ruído (bateria)
// [nota | null, duração em colcheias]; cada compasso tem 8 colcheias
const MUSICAS = {
  fase: {
    bpm: 150, estilo: "pulando",
    melodia: [
      ["C5", 1], ["E5", 1], ["G5", 1], ["E5", 1], ["A5", 2], ["G5", 2],
      ["G4", 2], [null, 2], ["C5", 1], ["D5", 1], ["E5", 1], ["C5", 1],
      ["A4", 1], ["C5", 1], ["D5", 2], ["F5", 1], ["E5", 1], ["D5", 2],
      ["C5", 1], ["E5", 1], ["G5", 1], ["A5", 1], ["G5", 2], [null, 2],
      ["D5", 1], ["F5", 1], ["A5", 1], ["F5", 1], ["B5", 2], ["A5", 2],
      ["G5", 2], [null, 2], ["E5", 1], ["F5", 1], ["G5", 1], ["E5", 1],
      ["D5", 1], ["E5", 1], ["F5", 2], ["D5", 1], ["B4", 1], ["G4", 2],
      ["C5", 2], ["G4", 1], ["E4", 1], ["C4", 2], [null, 2],
    ],
    baixo: ["C3", "G2", "A2", "E2", "F2", "C3", "G2", "C3"],
  },
  corrida: {
    bpm: 172, estilo: "galope",
    melodia: [
      ["A4", 1], ["C5", 1], ["E5", 1], ["A5", 2], ["G5", 1], ["E5", 2],
      ["F5", 2], ["E5", 1], ["D5", 1], ["E5", 2], ["C5", 2],
      ["D5", 1], ["E5", 1], ["F5", 1], ["A5", 2], ["G5", 1], ["F5", 2],
      ["E5", 3], ["D5", 1], ["C5", 2], ["B4", 2],
      ["A4", 1], ["C5", 1], ["E5", 1], ["A5", 2], ["B5", 1], ["C6", 2],
      ["B5", 2], ["A5", 1], ["G5", 1], ["A5", 2], ["E5", 2],
      ["F5", 1], ["G5", 1], ["A5", 1], ["F5", 1], ["G5", 2], ["B4", 2],
      ["A4", 4], [null, 2], ["E5", 1], ["G#5", 1],
    ],
    baixo: ["A2", "F2", "D2", "E2", "A2", "E2", "F2", "E2"],
  },
};
let musicaTimer = null;
let musicaGanho = null;

export const musica = {
  tocar(nome = "fase") {
    if (musicaTimer) return;
    const m = MUSICAS[nome];
    const col = 60 / m.bpm / 2;
    const a = audio();
    musicaGanho = a.createGain();
    musicaGanho.gain.value = 0.55;
    musicaGanho.connect(mestre);
    const g = musicaGanho;
    const total = m.melodia.reduce((s, [, d]) => s + d, 0) * col;
    const tocarUma = () => {
      let t = 0.05;
      for (const [n, d] of m.melodia) {
        if (n) nota(N(n), t, d * col * 0.92, { onda: 0.25, vol: 0.06, saida: g });
        t += d * col;
      }
      m.baixo.forEach((n, c) => {
        const ini = 0.05 + c * 8 * col;
        if (m.estilo === "galope") {
          // baixo pulsando em colcheias, alternando oitava
          for (let i = 0; i < 8; i++) nota(i % 2 ? N(n) * 2 : N(n), ini + i * col, col * 0.85, { onda: "tri", vol: 0.24, saida: g });
          for (const b of [0, 4]) nota(150, ini + b * col, 0.12, { onda: "tri", vol: 0.5, ate: 50, saida: g }); // bumbo
          for (const b of [2, 6]) ruido(ini + b * col, 0.12, { vol: 0.07, freq: 2500 }); // caixa
        } else {
          for (let i = 0; i < 4; i++) nota(i % 2 ? N(n) * 1.5 : N(n), ini + i * 2 * col, col * 1.6, { onda: "tri", vol: 0.22, saida: g });
        }
        for (let i = 0; i < 4; i++) ruido(ini + (i * 2 + 1) * col, 0.03, { vol: 0.03, freq: 7000 });
      });
    };
    tocarUma();
    musicaTimer = setInterval(tocarUma, total * 1000);
  },
  parar() {
    clearInterval(musicaTimer);
    musicaTimer = null;
    if (musicaGanho) { musicaGanho.gain.setTargetAtTime(0, ctx.currentTime, 0.05); musicaGanho = null; }
  },
};

// Ronco do motor do kart: pulso grave que sobe com a velocidade
let motorOsc = null, motorOsc2 = null, motorGanho = null;
export const motor = {
  ligar() {
    if (motorOsc) return;
    const a = audio();
    motorGanho = a.createGain();
    motorGanho.gain.value = 0.0;
    motorOsc = a.createOscillator();
    motorOsc.setPeriodicWave(ondas[0.125]);
    motorOsc2 = a.createOscillator();
    motorOsc2.type = "triangle";
    motorOsc.connect(motorGanho);
    motorOsc2.connect(motorGanho);
    motorGanho.connect(mestre);
    motorOsc.start();
    motorOsc2.start();
  },
  // ritmo de 0 (parado) a 1 (máxima); turbo pode passar de 1
  atualizar(ritmo) {
    if (!motorOsc) return;
    const t = ctx.currentTime;
    const f = 55 + ritmo * 75;
    motorOsc.frequency.setTargetAtTime(f, t, 0.08);
    motorOsc2.frequency.setTargetAtTime(f * 0.5, t, 0.08);
    motorGanho.gain.setTargetAtTime(0.025 + ritmo * 0.03, t, 0.1);
  },
  desligar() {
    if (!motorOsc) return;
    motorGanho.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    const o1 = motorOsc, o2 = motorOsc2;
    setTimeout(() => { o1.stop(); o2.stop(); }, 400);
    motorOsc = motorOsc2 = null;
  },
};
