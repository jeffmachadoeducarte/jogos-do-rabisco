// Sintetizadores e efeitos da Rádio Rabisco (renderização offline em Node, sem dependências).
// Osciladores com PolyBLEP (sem serrilhado), filtro de estado variável (TPT), bumbo, palmas, caixa,
// chimbal, prato, subida de ruído, supersaw, pluck, piano FM e sino; reverb (Freeverb), eco ping-pong,
// sidechain, compressor, limitador com antecipação e medidor de loudness (BS.1770, K-weighting).

export const SR = 44100;
const TAU = Math.PI * 2;
export const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// sorteio com semente (as faixas saem sempre iguais)
let sorte = Math.random;
export function semear(s) { sorte = rng(s); }
export function rng(semente) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

// filtro de estado variável (Zavalishin): lp, bp, hp
export class SVF {
  constructor() { this.ic1 = 0; this.ic2 = 0; this.lp = 0; this.bp = 0; this.hp = 0; this.set(1000, 0.707); }
  set(fc, q) {
    const g = Math.tan(Math.PI * Math.min(Math.max(fc, 10), SR * 0.45) / SR);
    this.k = 1 / q; this.a1 = 1 / (1 + g * (g + this.k)); this.a2 = g * this.a1; this.a3 = g * this.a2;
  }
  run(x) {
    const v3 = x - this.ic2, v1 = this.a1 * this.ic1 + this.a2 * v3, v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1; this.ic2 = 2 * v2 - this.ic2;
    this.lp = v2; this.bp = v1; this.hp = x - this.k * v1 - v2;
    return v2;
  }
}
const panG = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)]; // potência constante
// fim sem clique: rampa curta nos últimos ms
const cauda = (i, n, ms = 6) => { const r = (n - i) / (SR * ms / 1000); return r < 1 ? r : 1; };

// ------------------------------------------------------------------ bateria
export function bumbo(B, s0, vel, r) {
  const n = Math.floor(0.42 * SR);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < B.length; i++) {
    const t = i / SR;
    const f = 47 + 155 * Math.exp(-t / 0.032) + 420 * Math.exp(-t / 0.0035);
    ph += TAU * f / SR;
    const amp = (t < 0.0012 ? t / 0.0012 : 1) * (t < 0.045 ? 1 : Math.exp(-(t - 0.045) / 0.15));
    const corpo = Math.tanh(2.2 * Math.sin(ph)) * 0.78 * amp;
    const clique = (r() * 2 - 1) * Math.exp(-t / 0.0011) * 0.22;
    B[s0 + i] += vel * (corpo + clique) * cauda(i, n, 12);
  }
}
export function palma(B, s0, vel, r) {
  const n = Math.floor(0.4 * SR);
  const bp = new SVF(); bp.set(1250, 1.1);
  const hp = new SVF(); hp.set(700, 0.7);
  const rajadas = [0, 0.0085, 0.0165, 0.025];
  for (let i = 0; i < n && s0 + i < B.length; i++) {
    const t = i / SR;
    let e = 0;
    for (const o of rajadas) if (t >= o) e = Math.max(e, (t - o < 0.0006 ? (t - o) / 0.0006 : 1) * Math.exp(-(t - o) / (o === 0.025 ? 0.075 : 0.0045)));
    const x = r() * 2 - 1;
    bp.run(x); hp.run(bp.bp);
    B[s0 + i] += vel * hp.hp * e * 2.6 * cauda(i, n);
  }
}
export function caixa(B, s0, vel, r, curta = false) {
  const n = Math.floor((curta ? 0.16 : 0.3) * SR);
  const bp = new SVF(); bp.set(3800, 0.6);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < B.length; i++) {
    const t = i / SR;
    ph += TAU * (172 + 40 * Math.exp(-t / 0.01)) / SR;
    const tom = Math.sin(ph) * Math.exp(-t / 0.045) * 0.55;
    bp.run(r() * 2 - 1);
    const ruido = bp.bp * Math.exp(-t / (curta ? 0.05 : 0.11)) * 1.5;
    B[s0 + i] += vel * (tom + ruido) * Math.min(1, t / 0.0008) * cauda(i, n);
  }
}
export function chimbal(L, R, s0, vel, r, aberto = false, pan = 0.15) {
  const n = Math.floor((aberto ? 0.32 : 0.07) * SR);
  const hp = new SVF(); hp.set(aberto ? 6800 : 7800, 0.8);
  const pk = new SVF(); pk.set(10500, 2);
  const [gl, gr] = panG(pan);
  for (let i = 0; i < n && s0 + i < L.length; i++) {
    const t = i / SR;
    hp.run(r() * 2 - 1); pk.run(hp.hp);
    const e = Math.min(1, t / 0.0005) * Math.exp(-t / (aberto ? 0.13 : 0.018));
    const x = vel * (hp.hp * 0.8 + pk.bp * 0.9) * e * cauda(i, n);
    L[s0 + i] += x * gl; R[s0 + i] += x * gr;
  }
}
export function chocalho(L, R, s0, vel, r, pan = -0.35) {
  const n = Math.floor(0.08 * SR);
  const bp = new SVF(); bp.set(6200, 0.9);
  const [gl, gr] = panG(pan);
  for (let i = 0; i < n && s0 + i < L.length; i++) {
    const t = i / SR;
    bp.run(r() * 2 - 1);
    const e = Math.min(1, t / 0.006) * Math.exp(-t / 0.028);
    const x = vel * bp.bp * e * 1.6 * cauda(i, n);
    L[s0 + i] += x * gl; R[s0 + i] += x * gr;
  }
}
export function prato(L, R, s0, vel, r) {
  const n = Math.floor(2.8 * SR);
  const hl = new SVF(), hr = new SVF(); hl.set(4200, 0.7); hr.set(4400, 0.7);
  for (let i = 0; i < n && s0 + i < L.length; i++) {
    const t = i / SR;
    const e = Math.min(1, t / 0.001) * (0.65 * Math.exp(-t / 0.9) + 0.35 * Math.exp(-t / 0.12));
    hl.run(r() * 2 - 1); hr.run(r() * 2 - 1);
    L[s0 + i] += vel * hl.hp * e * cauda(i, n, 30); R[s0 + i] += vel * hr.hp * e * cauda(i, n, 30);
  }
}
// subida de ruído (filtro abrindo e volume crescendo) até o drop
export function subida(L, R, s0, nS, vel, r, de = 300, ate = 9000) {
  const fl = new SVF(), fr = new SVF();
  for (let i = 0; i < nS && s0 + i < L.length; i++) {
    const x = i / nS;
    if ((i & 31) === 0) { const fc = de * Math.pow(ate / de, x); fl.set(fc, 1.6); fr.set(fc * 1.05, 1.6); }
    fl.run(r() * 2 - 1); fr.run(r() * 2 - 1);
    const g = vel * x * x * cauda(i, nS, 20);
    L[s0 + i] += fl.bp * g * 1.4; R[s0 + i] += fr.bp * g * 1.4;
  }
}
// impacto do drop: grave que cai + estalo
export function impacto(L, R, s0, vel, r) {
  const n = Math.floor(1.6 * SR);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < L.length; i++) {
    const t = i / SR;
    ph += TAU * (34 + 50 * Math.exp(-t / 0.18)) / SR;
    const x = vel * (Math.sin(ph) * Math.exp(-t / 0.5) * 0.9 + (r() * 2 - 1) * Math.exp(-t / 0.01) * 0.3) * Math.min(1, t / 0.002) * cauda(i, n, 40);
    L[s0 + i] += x; R[s0 + i] += x;
  }
}

// ------------------------------------------------------------------ sintetizadores
// baixo: serra + quadrada filtradas, com subgrave senoidal, um pouco saturado (aparece no alto-falante do celular)
export function baixo(B, s0, nS, midi, vel, abre = 1400) {
  const f = hz(midi), dt = f / SR;
  const filt = new SVF();
  const rel = Math.floor(0.03 * SR), n = nS + rel;
  let ph = sorte() * 0.01, sub = 0;
  for (let i = 0; i < n && s0 + i < B.length; i++) {
    const t = i / SR;
    if ((i & 15) === 0) filt.set(170 + abre * Math.exp(-t / 0.075) + 260, 1.05);
    ph += dt; if (ph >= 1) ph -= 1;
    const saw = 2 * ph - 1 - blep(ph, dt);
    let sq = ph < 0.5 ? 1 : -1; sq += blep(ph, dt); sq -= blep((ph + 0.5) % 1, dt);
    sub += TAU * f / SR;
    const fl = filt.run(saw * 0.55 + sq * 0.45);
    const env = Math.min(1, t / 0.003) * (0.82 + 0.18 * Math.exp(-t / 0.09)) * (i < nS ? 1 : Math.exp(-(i - nS) / (0.008 * SR)));
    B[s0 + i] += vel * Math.tanh(1.4 * (fl * 0.62 + Math.sin(sub) * 0.62)) * env * cauda(i, n);
  }
}
// supersaw: 7 serras desafinadas espalhadas no estéreo
const DESAF7 = [-21, -13, -6, 0, 6, 13, 21], PAN7 = [-0.95, 0.65, -0.4, 0, 0.4, -0.65, 0.95], AMP7 = [0.62, 0.75, 0.9, 1, 0.9, 0.75, 0.62];
export function supersaw(L, R, s0, nS, midi, vel, { ataque = 0.008, solta = 0.18, vozes = 7, abertura = 1 } = {}) {
  const rel = Math.floor(solta * 4 * SR), n = nS + rel;
  const idx = vozes === 7 ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  const norm = vel / Math.sqrt(idx.length);
  for (const v of idx) {
    const f = hz(midi) * Math.pow(2, DESAF7[v] / 1200), dt = f / SR;
    const [gl, gr] = panG(PAN7[v] * abertura);
    const a = AMP7[v] * norm;
    let ph = sorte();
    for (let i = 0; i < n && s0 + i < L.length; i++) {
      ph += dt; if (ph >= 1) ph -= 1;
      const t = i / SR;
      const env = Math.min(1, t / ataque) * (i < nS ? 1 : Math.exp(-(i - nS) / (solta * SR))) * cauda(i, n);
      const x = (2 * ph - 1 - blep(ph, dt)) * a * env;
      L[s0 + i] += x * gl; R[s0 + i] += x * gr;
    }
  }
}
// lead do drop: 5 serras + quadrada uma oitava acima, filtro com envelope e vibrato nas notas longas
export function lead(L, R, s0, nS, midi, vel) {
  const rel = Math.floor(0.09 * 5 * SR), n = nS + rel;
  const tmpL = new Float32Array(n), tmpR = new Float32Array(n);
  const voz = [[-13, -0.55, 0.7], [-6, 0.3, 0.9], [0, 0, 1], [6, -0.3, 0.9], [13, 0.55, 0.7]];
  for (const [c, p, a] of voz) {
    const [gl, gr] = panG(p);
    let ph = sorte();
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const vib = t > 0.28 ? Math.sin(TAU * 5.4 * t) * 14 * Math.min(1, (t - 0.28) / 0.3) : 0;
      const dt = hz(midi) * Math.pow(2, (c + vib) / 1200) / SR;
      ph += dt; if (ph >= 1) ph -= 1;
      const x = (2 * ph - 1 - blep(ph, dt)) * a * 0.45;
      tmpL[i] += x * gl; tmpR[i] += x * gr;
    }
  }
  { // quadrada +12 (brilho)
    let ph = 0; const dt = hz(midi + 12) / SR;
    for (let i = 0; i < n; i++) { ph += dt; if (ph >= 1) ph -= 1; let sq = ph < 0.5 ? 1 : -1; sq += blep(ph, dt); sq -= blep((ph + 0.5) % 1, dt); tmpL[i] += sq * 0.16; tmpR[i] += sq * 0.16; }
  }
  const fl = new SVF(), fr = new SVF();
  for (let i = 0; i < n && s0 + i < L.length; i++) {
    const t = i / SR;
    if ((i & 15) === 0) { const fc = 1900 + 5200 * Math.exp(-t / 0.22); fl.set(fc, 0.9); fr.set(fc, 0.9); }
    const env = Math.min(1, t / 0.004) * (0.86 + 0.14 * Math.exp(-t / 0.15)) * (i < nS ? 1 : Math.exp(-(i - nS) / (0.09 * SR))) * cauda(i, n);
    L[s0 + i] += vel * fl.run(tmpL[i]) * env; R[s0 + i] += vel * fr.run(tmpR[i]) * env;
  }
}
// pluck da melodia (parte A) e do arpejo
export function pluck(L, R, s0, nS, midi, vel, { pan = 0, decai = 0.42, sustem = 0.32, brilho = 5600, solta = 0.07 } = {}) {
  const rel = Math.floor(solta * 5 * SR), n = nS + rel;
  const [gl, gr] = panG(pan);
  const f = hz(midi);
  const d1 = f * Math.pow(2, 7 / 1200) / SR, d2 = f * Math.pow(2, -7 / 1200) / SR, d3 = f / 2 / SR;
  let p1 = sorte(), p2 = sorte(), p3 = 0;
  const filt = new SVF();
  for (let i = 0; i < n && s0 + i < L.length; i++) {
    const t = i / SR;
    if ((i & 15) === 0) filt.set(280 + brilho * Math.exp(-t / 0.11), 1.25);
    p1 += d1; if (p1 >= 1) p1 -= 1; p2 += d2; if (p2 >= 1) p2 -= 1; p3 += d3; if (p3 >= 1) p3 -= 1;
    let sq = p3 < 0.5 ? 1 : -1; sq += blep(p3, d3); sq -= blep((p3 + 0.5) % 1, d3);
    const x = filt.run((2 * p1 - 1 - blep(p1, d1)) * 0.45 + (2 * p2 - 1 - blep(p2, d2)) * 0.45 + sq * 0.18);
    const env = Math.min(1, t / 0.002) * (sustem + (1 - sustem) * Math.exp(-t / decai)) * (i < nS ? 1 : Math.exp(-(i - nS) / (solta * SR))) * cauda(i, n);
    const y = vel * x * env;
    L[s0 + i] += y * gl; R[s0 + i] += y * gr;
  }
}
// piano FM (estilo "house piano"): ataque com brilho e corpo que decai; esquerda e direita levemente desafinadas
export function piano(L, R, s0, nS, midi, vel) {
  const rel = Math.floor(0.09 * 5 * SR), n = nS + rel;
  const f = hz(midi);
  for (const [c, gl, gr] of [[-3, 0.9, 0.35], [3, 0.35, 0.9]]) {
    const fc = f * Math.pow(2, c / 1200);
    let pc = 0, pm = 0, pt = 0;
    for (let i = 0; i < n && s0 + i < L.length; i++) {
      const t = i / SR;
      pm += TAU * fc / SR; pt += TAU * fc * 14 / SR;
      const indice = 2.4 * Math.exp(-t / 0.28) + 0.35;
      pc += TAU * fc / SR;
      const corpo = Math.sin(pc + indice * Math.sin(pm));
      const tine = Math.sin(pc * 2 + 1.2 * Math.exp(-t / 0.015) * Math.sin(pt)) * 0.18 * Math.exp(-t / 0.06);
      const env = Math.min(1, t / 0.0015) * Math.exp(-t / (midi > 72 ? 0.7 : 0.95)) * (i < nS ? 1 : Math.exp(-(i - nS) / (0.08 * SR))) * cauda(i, n);
      const y = vel * (corpo + tine) * env * 0.55;
      L[s0 + i] += y * gl; R[s0 + i] += y * gr;
    }
  }
}
// sino FM (brilhinho por cima da melodia)
export function sino(L, R, s0, nS, midi, vel, pan = 0.25) {
  const n = nS + Math.floor(1.2 * SR);
  const f = hz(midi), [gl, gr] = panG(pan);
  let pc = 0, pm = 0;
  for (let i = 0; i < n && s0 + i < L.length; i++) {
    const t = i / SR;
    pc += TAU * f / SR; pm += TAU * f * 3.5 / SR;
    const y = vel * Math.sin(pc + 1.6 * Math.exp(-t / 0.4) * Math.sin(pm)) * Math.min(1, t / 0.001) * Math.exp(-t / 0.55) * cauda(i, n, 20);
    L[s0 + i] += y * gl; R[s0 + i] += y * gr;
  }
}

// ------------------------------------------------------------------ efeitos
export function filtrarBus(L, R, cortePorAmostra, hpFc = 0) {
  const fl = new SVF(), fr = new SVF(), hl = new SVF(), hr = new SVF();
  if (hpFc) { hl.set(hpFc, 0.7); hr.set(hpFc, 0.7); }
  for (let i = 0; i < L.length; i++) {
    if ((i & 31) === 0) { const fc = cortePorAmostra(i); fl.set(fc, 0.75); fr.set(fc, 0.75); }
    let l = fl.run(L[i]), r = fr.run(R[i]);
    if (hpFc) { hl.run(l); hr.run(r); l = hl.hp; r = hr.hp; }
    L[i] = l; R[i] = r;
  }
}
export function passaAlta(B, fc) { const f = new SVF(); f.set(fc, 0.7); for (let i = 0; i < B.length; i++) { f.run(B[i]); B[i] = f.hp; } }
export function passaBaixa(B, fc) { const f = new SVF(); f.set(fc, 0.7); for (let i = 0; i < B.length; i++) B[i] = f.run(B[i]); }

// sidechain: envelope de "bombeada" a partir dos tempos do bumbo (em amostras)
export function curvaSidechain(n, bumbos, liberar) {
  const a = new Float32Array(n); // quanto abaixa (0..1)
  const rel = Math.floor(liberar * SR), at = Math.floor(0.003 * SR);
  for (const k of bumbos) for (let i = 0; i < rel && k + i < n; i++) {
    const x = i < at ? i / at : Math.pow(1 - (i - at) / (rel - at), 2);
    if (x > a[k + i]) a[k + i] = x;
  }
  return a;
}
export function aplicarSidechain(bufs, curva, prof) { for (const B of bufs) for (let i = 0; i < B.length; i++) B[i] *= 1 - prof * curva[i]; }

// Freeverb (Jezar), estéreo
export function reverb(inL, inR, { sala = 0.84, amortece = 0.32, largura = 1 } = {}) {
  const CB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], AP = [556, 441, 341, 225], SP = 23;
  const n = inL.length, outL = new Float32Array(n), outR = new Float32Array(n);
  const mk = (len) => ({ b: new Float32Array(len), i: 0, f: 0 });
  const cL = CB.map(mk), cR = CB.map((l) => mk(l + SP)), aL = AP.map(mk), aR = AP.map((l) => mk(l + SP));
  const pre = new SVF(), preR = new SVF(); pre.set(260, 0.7); preR.set(260, 0.7);
  const d1 = amortece, d2 = 1 - amortece;
  for (let i = 0; i < n; i++) {
    pre.run(inL[i]); preR.run(inR[i]);
    const x = (pre.hp + preR.hp) * 0.015;
    let l = 0, r = 0;
    for (const c of cL) { const o = c.b[c.i]; c.f = o * d2 + c.f * d1; c.b[c.i] = x + c.f * sala; if (++c.i >= c.b.length) c.i = 0; l += o; }
    for (const c of cR) { const o = c.b[c.i]; c.f = o * d2 + c.f * d1; c.b[c.i] = x + c.f * sala; if (++c.i >= c.b.length) c.i = 0; r += o; }
    for (const a of aL) { const o = a.b[a.i]; a.b[a.i] = l + o * 0.5; if (++a.i >= a.b.length) a.i = 0; l = o - l; }
    for (const a of aR) { const o = a.b[a.i]; a.b[a.i] = r + o * 0.5; if (++a.i >= a.b.length) a.i = 0; r = o - r; }
    const w1 = 0.5 * (1 + largura), w2 = 0.5 * (1 - largura);
    outL[i] = l * w1 + r * w2; outR[i] = r * w1 + l * w2;
  }
  const lp = new SVF(), lpR = new SVF(); lp.set(8500, 0.7); lpR.set(8500, 0.7);
  for (let i = 0; i < n; i++) { outL[i] = lp.run(outL[i]); outR[i] = lpR.run(outR[i]); }
  return [outL, outR];
}
// eco ping-pong (esquerda → direita → esquerda...)
export function ecoPingPong(inL, inR, tempo, volta = 0.38) {
  const n = inL.length, d = Math.floor(tempo * SR);
  const outL = new Float32Array(n), outR = new Float32Array(n);
  const bl = new Float32Array(d), br = new Float32Array(d);
  const lp = new SVF(), hp = new SVF(); lp.set(4800, 0.7); hp.set(380, 0.7);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const yl = bl[k], yr = br[k];
    const entrada = (inL[i] + inR[i]) * 0.5;
    hp.run(lp.run(yr * volta + entrada));
    bl[k] = hp.hp; br[k] = yl;
    outL[i] = yl; outR[i] = yr;
    if (++k >= d) k = 0;
  }
  return [outL, outR];
}

// compressor de "cola" (RMS, joelho suave) e limitador com antecipação
export function compressor(L, R, { limiar = -16, razao = 2.2, ataque = 0.012, solta = 0.15 } = {}) {
  const ca = Math.exp(-1 / (ataque * SR)), cr = Math.exp(-1 / (solta * SR));
  let env = 0;
  for (let i = 0; i < L.length; i++) {
    const p = (L[i] * L[i] + R[i] * R[i]) * 0.5;
    env = p > env ? ca * env + (1 - ca) * p : cr * env + (1 - cr) * p;
    const db = 10 * Math.log10(env + 1e-12);
    const sobra = db - limiar;
    const gr = sobra <= -3 ? 0 : sobra >= 3 ? sobra * (1 - 1 / razao) : ((sobra + 3) ** 2 / 12) * (1 - 1 / razao);
    const g = Math.pow(10, -gr / 20);
    L[i] *= g; R[i] *= g;
  }
}
export function limitador(L, R, teto = 0.84, antecipa = 0.004, solta = 0.08) {
  const n = L.length, la = Math.floor(antecipa * SR);
  const gr = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = Math.max(Math.abs(L[i]), Math.abs(R[i])); gr[i] = p > teto ? teto / p : 1; }
  // mínimo numa janela para a frente (fila monotônica)
  const mn = new Float32Array(n), fila = new Int32Array(n); let ini = 0, fim = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (fim > ini && gr[fila[fim - 1]] >= gr[i]) fim--;
    fila[fim++] = i;
    while (fila[ini] > i + la) ini++;
    mn[i] = gr[fila[ini]];
  }
  // média móvel para trás (suaviza o ataque sem deixar passar o pico) + soltura exponencial
  const cr = Math.exp(-1 / (solta * SR));
  let soma = 0, g = 1;
  for (let i = 0; i < n; i++) {
    soma += mn[i]; if (i >= la) soma -= mn[i - la];
    const m = soma / Math.min(i + 1, la);
    g = m < g ? m : cr * g + (1 - cr) * m;
    L[i] *= g; R[i] *= g;
    if (L[i] > teto) L[i] = teto; else if (L[i] < -teto) L[i] = -teto;
    if (R[i] > teto) R[i] = teto; else if (R[i] < -teto) R[i] = -teto;
  }
}

// loudness integrada (LUFS) — ITU BS.1770 com portas absoluta e relativa
function biquad(x, [b0, b1, b2, a0, a1, a2]) {
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
function kWeight(x) {
  let w0 = TAU * 1500 / SR, A = Math.pow(10, 4 / 40), al = Math.sin(w0) / (2 * Math.SQRT1_2), c = Math.cos(w0), sA = Math.sqrt(A);
  const shelf = [A * ((A + 1) + (A - 1) * c + 2 * sA * al), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - 2 * sA * al),
    (A + 1) - (A - 1) * c + 2 * sA * al, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - 2 * sA * al];
  w0 = TAU * 38 / SR; al = Math.sin(w0) / (2 * 0.5); c = Math.cos(w0);
  const hp = [(1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al];
  return biquad(biquad(x, shelf), hp);
}
export function lufs(L, R) {
  const kl = kWeight(L), kr = kWeight(R);
  const bloco = Math.floor(0.4 * SR), passo = Math.floor(0.1 * SR);
  const z = [];
  for (let s = 0; s + bloco <= kl.length; s += passo) {
    let a = 0; for (let i = s; i < s + bloco; i++) a += kl[i] * kl[i] + kr[i] * kr[i];
    z.push(a / bloco);
  }
  const ld = (v) => -0.691 + 10 * Math.log10(v + 1e-15);
  const abs = z.filter((v) => ld(v) > -70);
  const media = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const rel = ld(media(abs)) - 10;
  return ld(media(abs.filter((v) => ld(v) > rel)));
}

// WAV 16 bits com dither triangular
export function wav16(L, R) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  const r = rng(99);
  for (let i = 0; i < n; i++) {
    for (const [c, X] of [[0, L], [1, R]]) {
      const v = Math.round(Math.max(-1, Math.min(1, X[i])) * 32767 + (r() - r()));
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, v)), 44 + i * 4 + c * 2);
    }
  }
  return buf;
}
