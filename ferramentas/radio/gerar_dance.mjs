#!/usr/bin/env node
// Rádio Rabisco (gospel dance do carro da Rabiscolândia): renderiza as faixas em arquivos AAC leves.
//
// Arranjos ORIGINAIS em estilo dance/eletrônico gospel (≈122–128 BPM, bumbo 4x4, baixo pulsante, supersaw,
// pluck, piano "house" FM, palmas, chimbal, subida e drop) sobre melodias de hinos de DOMÍNIO PÚBLICO
// (dance/musicas.mjs). Tudo é sintetizado aqui (dance/dsp.mjs): nenhuma amostra ou gravação de terceiros.
//
// Estrutura de cada faixa: intro 4 compassos · A (melodia inteira no pluck, 2ª metade mais cheia) ·
// subida 4 (rufo, ruído subindo, filtro abrindo) · DROP (lead supersaw, baixo rolando, palmas) · final 4 ("Amém": IV → I).
// Mixagem: sidechain no bumbo, reverb (Freeverb) e eco ping-pong, compressor de cola, limitador
// (pico ≤ -1,5 dBFS) e loudness de -16 LUFS. Saída: assets/radio/rabisco/<id>.m4a (AAC-LC, ≤ ~590 KB).
//
// Requisitos: Node 20+ e o afconvert do macOS (vem no sistema). Sem afconvert: use --wav e converta à parte.
// Uso: node ferramentas/radio/gerar_dance.mjs [--so santos,alegria] [--wav /pasta/para/wav]

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, statSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { faixas } from "./dance/musicas.mjs";
import * as D from "./dance/dsp.mjs";

const SR = D.SR;
const SAIDA = process.env.SAIDA_RADIO || fileURLToPath(new URL("../../assets/radio/rabisco/", import.meta.url));
const ALVO_LUFS = -16, TETO = Math.pow(10, -1.5 / 20), LIMITE_KB = 585;

// ------------------------------------------------------------------ cifras
const RAIZ = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function cifra(c, transp = 0) {
  const m = /^([A-G])([#b]?)(m?)$/.exec(c);
  if (!m) throw new Error("cifra? " + c);
  const r = (RAIZ[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + transp + 120) % 12;
  return { r, menor: m[3] === "m" };
}
const grau = (tonica, semis, menor = false) => ({ r: (tonica + semis) % 12, menor });
const pcsDe = (c) => [c.r, (c.r + (c.menor ? 3 : 4)) % 12, (c.r + 7) % 12];
// encadeamento de vozes: a inversão mais perto do acorde anterior (entre Sol3 e Mi5)
function voicing(c, ant) {
  const pcs = pcsDe(c);
  let melhor = null, custo = Infinity;
  for (let inv = 0; inv < 3; inv++) {
    let n = 53; while (n % 12 !== pcs[inv]) n++;
    const v = [n];
    for (let k = 1; k < 3; k++) { let m = v[k - 1] + 1; while (m % 12 !== pcs[(inv + k) % 3]) m++; v.push(m); }
    for (const desl of [0, 12]) {
      const w = v.map((x) => x + desl);
      if (w[0] < 55 || w[2] > 76) continue;
      const cst = w.reduce((s, x, i) => s + Math.abs(x - ant[i]), 0);
      if (cst < custo) { custo = cst; melhor = w; }
    }
  }
  return melhor;
}

// ------------------------------------------------------------------ arranjo + render
function renderizar(fx) {
  D.semear(fx.semente);
  const r = D.rng(fx.semente * 7 + 1);
  const spb = 60 / fx.bpm;
  const S = (b) => Math.round(b * spb * SR);
  const P = fx.compassos, dr = fx.drop, Pd = (dr.ate - dr.de) * dr.vezes;
  const SEC = [["intro", 0, 4], ["A", 4, 4 + P], ["subida", 4 + P, 8 + P], ["drop", 8 + P, 8 + P + Pd], ["fim", 8 + P + Pd, 12 + P + Pd]];
  const totalCompassos = 12 + P + Pd;
  const n = S(totalCompassos * 4) + Math.floor(3.2 * SR);
  const mono = () => new Float32Array(n), st = () => [new Float32Array(n), new Float32Array(n)];
  const bus = { bumbo: mono(), baixo: mono(), palma: mono(), chimbal: st(), fx: st(), pad: st(), lead: st(), pluck: st(), piano: st() };
  const bumbos = [];
  const secao = (c) => { for (const [nome, a, b] of SEC) if (c >= a && c < b) return { nome, k: c - a, len: b - a, ini: a }; return null; };

  const T = fx.transp;
  const ult = cifra(fx.cifras[fx.cifras.length - 1][1], T);
  const ton = ult.r;
  const mel = fx.mel.map(([i, d, m]) => [i, d, m + T]);
  const media = mel.reduce((s, x) => s + x[2] * x[1], 0) / mel.reduce((s, x) => s + x[1], 0);
  const oit = 12 * Math.round((74 - media) / 12);
  const cifraMel = (b) => { let c = fx.cifras[0][1]; for (const [t, nm] of fx.cifras) if (t <= b + 1e-6) c = nm; return cifra(c, T); };

  // linha do tempo dos acordes (batidas globais)
  const segs = [];
  const I = grau(ton, 0), vi = grau(ton, 9, true), IV = grau(ton, 5), V = grau(ton, 7);
  [I, vi, IV, V].forEach((c, k) => segs.push([k * 4, c]));
  for (const [t, nm] of fx.cifras) if (t < P * 4) segs.push([16 + t, cifra(nm, T)]);
  const sub0 = (4 + P) * 4;
  [IV, IV, V, V].forEach((c, k) => segs.push([sub0 + k * 4, c]));
  const drop0 = (8 + P) * 4, voltaD = (dr.ate - dr.de) * 4;
  for (let v = 0; v < dr.vezes; v++) {
    const base = drop0 + v * voltaD;
    segs.push([base, cifraMel(dr.de * 4)]);
    for (const [t, nm] of fx.cifras) if (t > dr.de * 4 + 1e-6 && t < dr.ate * 4) segs.push([base + t - dr.de * 4, cifra(nm, T)]);
  }
  const fim0 = (8 + P + Pd) * 4;
  [IV, IV, I, I].forEach((c, k) => segs.push([fim0 + k * 4, c]));
  segs.sort((a, b) => a[0] - b[0]);
  const acordes = [];
  let ant = [60, 64, 67];
  for (let i = 0; i < segs.length; i++) {
    const [t, c] = segs[i], fimSeg = segs[i + 1]?.[0] ?? totalCompassos * 4;
    if (fimSeg <= t) continue;
    const v = voicing(c, ant); ant = v;
    acordes.push({ t, fim: fimSeg, c, v });
  }
  const acordeEm = (b) => { let a = acordes[0]; for (const x of acordes) if (x.t <= b + 1e-6) a = x; return a; };
  const raizBaixo = (c) => 36 + c.r;

  // ---------- notas da melodia: parte A (pluck + sino na 2ª metade) e drop (lead)
  const A0 = 16;
  for (const [i, d, m] of mel) {
    if (i >= P * 4) continue;
    const s0 = S(A0 + i), nS = S(Math.max(0.2, d * 0.92));
    D.pluck(...bus.pluck, s0, nS, m + oit, 0.62, { pan: 0.08 });
    if (i >= P * 2) D.sino(...bus.pluck, s0, nS, m + oit + 12, 0.07, 0.3);
  }
  for (let v = 0; v < dr.vezes; v++) for (const [i, d, m] of mel) {
    if (i < dr.de * 4 - 1e-6 || i >= dr.ate * 4) continue;
    const b = drop0 + v * voltaD + i - dr.de * 4;
    D.lead(...bus.lead, S(b), S(Math.max(0.2, d * 0.96)), m + oit, 0.5);
    if (v === dr.vezes - 1 && b >= drop0 + Pd * 2) D.sino(...bus.pluck, S(b), S(d), m + oit + 12, 0.05, -0.3);
  }

  // ---------- pads (supersaw), por acorde e por seção
  for (const a of acordes) {
    const ini = a.t, fim = a.fim;
    const sc = secao(Math.floor(ini / 4 + 1e-6));
    let vel = { intro: 0.55, A: 0.45, subida: 0.75, drop: 0.95, fim: 0.8 }[sc.nome];
    if (sc.nome === "A" && sc.k >= sc.len / 2) vel = 0.62;
    const notas = [...a.v, a.v[0] + 12];
    if (sc.nome === "subida" && sc.k >= 2) {
      for (let b = ini; b < fim - 1e-6; b += 0.5) { if (b >= sub0 + 15.5) break; for (const m of notas) D.supersaw(...bus.pad, S(b), S(0.4), m, vel * 0.9, { ataque: 0.003, solta: 0.05 }); }
      continue;
    }
    let dur = fim - ini;
    if (sc.nome === "subida" && fim >= sub0 + 16) dur = sub0 + 15.5 - ini; // respiro antes do drop
    const ultimo = fim >= totalCompassos * 4 - 1e-6;
    for (const m of notas) D.supersaw(...bus.pad, S(ini), S(dur), m, vel, { ataque: sc.nome === "intro" ? 0.2 : 0.012, solta: ultimo ? 1.2 : 0.16 });
  }

  // ---------- bateria, baixo, piano e efeitos, compasso a compasso
  const PIANO = [[[0, 2], [3, 2], [6, 2], [10, 2], [12, 3]], [[0, 2], [3, 2], [6, 2], [8, 2], [11, 2], [14, 2]]];
  const OFF = [[0.5, 0.42, 0]], OFF2 = [[0.5, 0.3, 0], [0.75, 0.2, 12]], ROLA = [[0.25, 0.22, 0], [0.5, 0.22, 12], [0.75, 0.22, 0]];
  const [HL, HR] = bus.chimbal, [FL, FR] = bus.fx;
  for (let c = 0; c < totalCompassos; c++) {
    const sc = secao(c), B0 = c * 4, k = sc.k, nome = sc.nome;
    const metade2 = k >= sc.len / 2;
    const ultimoDaSecao = k === sc.len - 1;
    // bumbo
    const temBumbo = nome === "intro" || nome === "A" || nome === "drop" || (nome === "subida" && k < 2) || (nome === "fim" && k < 3);
    // a energia cresce até o drop: intro e parte A mais contidas, drop com tudo
    const forca = { intro: 0.78, A: metade2 ? 0.88 : 0.8, subida: 0.85, drop: 1, fim: 0.9 }[nome];
    for (let b = 0; b < 4; b++) if (temBumbo || (nome === "fim" && k === 3 && b === 0)) { const s = S(B0 + b); D.bumbo(bus.bumbo, s, forca, r); bumbos.push(s); }
    // palmas
    if ((nome === "intro" && k >= 2) || nome === "A" || nome === "drop" || (nome === "fim" && k < 2)) {
      for (const b of [1, 3]) { D.palma(bus.palma, S(B0 + b), nome === "drop" ? 0.95 : nome === "A" && !metade2 ? 0.55 : 0.75, r); if (nome === "drop") D.caixa(bus.palma, S(B0 + b), 0.45, r); }
      if (nome === "drop" && k >= sc.len - 4) for (const b of [0, 2]) D.palma(bus.palma, S(B0 + b), 0.5, r); // palmas em todos os tempos
    }
    if (nome === "subida" && k < 2) for (let b = 0; b < 4; b++) D.palma(bus.palma, S(B0 + b), 0.55 + 0.1 * b, r);
    // chimbal e chocalho
    const hats16 = (nome === "intro" && k >= 2) || nome === "A" || nome === "drop" || (nome === "subida" && k < 3) || (nome === "fim" && k < 2);
    for (let s16 = 0; s16 < 16; s16++) {
      const b = B0 + s16 / 4, pos = s16 % 4;
      if (hats16) D.chimbal(HL, HR, S(b), [0.42, 0.22, 0.62, 0.26][pos] * (0.9 + 0.2 * r()) * (nome === "drop" ? 1 : 0.75), r);
      else if (nome === "intro" && pos === 2) D.chimbal(HL, HR, S(b), 0.55, r);
      if (pos === 2 && ((nome === "A" && metade2) || nome === "drop")) D.chimbal(HL, HR, S(b), 0.5, r, true, -0.12);
      if ((nome === "A" || nome === "drop") && pos !== 0) D.chocalho(HL, HR, S(b), pos === 2 ? 0.5 : 0.3, r);
    }
    // viradas e rufo
    if (nome === "A" && ultimoDaSecao) for (let s16 = 8; s16 < 16; s16++) D.caixa(bus.palma, S(B0 + s16 / 4), 0.25 + 0.05 * (s16 - 8), r, true);
    if (nome === "drop" && ultimoDaSecao) for (let s16 = 12; s16 < 16; s16++) D.caixa(bus.palma, S(B0 + s16 / 4), 0.3 + 0.08 * (s16 - 12), r, true);
    if (nome === "subida") {
      const passo = [1, 0.5, 0.25, 0.125][k];
      for (let b = 0; b < (k === 3 ? 3.5 : 4) - 1e-6; b += passo) D.caixa(bus.palma, S(B0 + b), 0.25 + 0.6 * ((k * 4 + b) / 16), r, true);
    }
    // pratos, subidas e impacto
    if (k === 0 && (nome === "A" || nome === "drop" || nome === "fim")) D.prato(FL, FR, S(B0), nome === "drop" ? 0.55 : 0.4, r);
    if (nome === "drop" && k > 0 && k % 8 === 0) D.prato(FL, FR, S(B0), 0.45, r);
    if (nome === "drop" && k === 0) D.impacto(FL, FR, S(B0), 0.8, r);
    if (nome === "intro" && k === 2) D.subida(FL, FR, S(B0), S(8), 0.35, r, 400, 6000);
    if (nome === "subida" && k === 0) D.subida(FL, FR, S(B0), S(16), 0.85, r, 250, 10000);
    // baixo
    let padrao = null, abre = 1000;
    if (nome === "intro" && k >= 2) { padrao = OFF; abre = 650; }
    if (nome === "A") { padrao = metade2 ? OFF2 : OFF; abre = metade2 ? 1100 : 850; }
    if (nome === "subida" && k < 2) padrao = OFF;
    if (nome === "drop") { padrao = ROLA; abre = 1500; }
    if (nome === "fim" && k < 2) padrao = OFF;
    if (padrao) for (let b = 0; b < 4; b++) for (const [o, d, oc] of padrao) {
      const a = acordeEm(B0 + b + o);
      D.baixo(bus.baixo, S(B0 + b + o), S(d), raizBaixo(a.c) + oc, nome === "drop" ? 0.9 : nome === "A" && !metade2 ? 0.62 : 0.7, abre);
    }
    if (nome === "fim" && k === 3) D.baixo(bus.baixo, S(B0), S(3.5), raizBaixo(acordeEm(B0).c), 0.9, 600);
    // piano gospel (contratempos que "balançam")
    let velP = 0;
    if (nome === "intro") velP = 0.85;
    if (nome === "A" && metade2) velP = 0.5;
    if (nome === "drop") velP = 0.42;
    if (nome === "fim" && k < 2) velP = 0.7;
    if (velP) for (const [p16, d16] of PIANO[c % 2]) {
      const b = B0 + p16 / 4, a = acordeEm(b);
      for (const m of [...a.v, a.v[0] + 12]) D.piano(...bus.piano, S(b), S(d16 / 4 * 0.9), m, velP * 0.5);
    }
    if (nome === "fim" && k === 2) { const a = acordeEm(B0); for (const m of [...a.v, a.v[0] + 12]) D.piano(...bus.piano, S(B0), S(7.5), m, 0.4); }
    // arpejo (subida e 2ª metade do drop)
    if ((nome === "subida" && k >= 2) || (nome === "drop" && k >= sc.len / 2)) {
      for (let s16 = 0; s16 < 16; s16++) {
        const b = B0 + s16 / 4; if (nome === "subida" && b >= sub0 + 15.5) break;
        const a = acordeEm(b), notas = [...a.v, a.v[0] + 12, a.v[1] + 12];
        const m = notas[(c * 16 + s16) % notas.length] + 12;
        D.pluck(...bus.pluck, S(b), S(0.2), m, nome === "subida" ? 0.12 + 0.02 * s16 : 0.13, { pan: s16 % 2 ? 0.45 : -0.45, decai: 0.09, sustem: 0, brilho: 4200 });
      }
    }
    // final: sino na tônica
    if (nome === "fim" && k === 3) [0, 4, 7, 12].forEach((s, i) => D.sino(...bus.pluck, S(B0 + i * 0.5), S(2), 72 + ((ton + 120) % 12) + s - (ton > 5 ? 12 : 0) + 12, 0.1, i % 2 ? 0.3 : -0.3));
  }

  // ---------- processamento dos barramentos
  const barDe = (i) => i / (spb * SR * 4);
  const corte = (i) => {
    const c = barDe(i), sc = secao(Math.floor(c)) || { nome: "fim", k: 3, len: 4, ini: totalCompassos - 4 };
    const x = (c - sc.ini) / sc.len;
    if (sc.nome === "intro") return 450 * Math.pow(2600 / 450, x);
    if (sc.nome === "A") return c - sc.ini < sc.len / 2 ? 2300 : 3800;
    if (sc.nome === "subida") return 700 * Math.pow(13000 / 700, x * x);
    if (sc.nome === "drop") return 12500;
    return 12500 * Math.pow(1800 / 12500, Math.min(1, x));
  };
  D.filtrarBus(...bus.pad, corte, 190);
  D.passaAlta(bus.baixo, 32);
  D.passaAlta(bus.palma, 160);
  const curva = D.curvaSidechain(n, bumbos, spb * 0.62);
  const curvaCurta = D.curvaSidechain(n, bumbos, spb * 0.32);
  D.aplicarSidechain(bus.pad, curva, 0.7);
  D.aplicarSidechain([bus.baixo], curvaCurta, 0.6);
  D.aplicarSidechain(bus.lead, curvaCurta, 0.22);
  D.aplicarSidechain(bus.pluck, curvaCurta, 0.25);
  D.aplicarSidechain(bus.piano, curvaCurta, 0.3);

  // níveis e envios (reverb / eco)
  const G = { bumbo: 0.78, baixo: 0.5, palma: 0.9, chimbal: 0.36, fx: 0.32, pad: 0.19, lead: 0.8, pluck: 1.0, piano: 0.34 };
  const REV = { palma: 0.22, fx: 0.35, pad: 0.14, lead: 0.2, pluck: 0.3, piano: 0.22 };
  const ECO = { lead: 0.14, pluck: 0.3, piano: 0.07 };
  const L = new Float32Array(n), R = new Float32Array(n), rvL = new Float32Array(n), rvR = new Float32Array(n), ecL = new Float32Array(n), ecR = new Float32Array(n);
  const estat = {};
  // RMS de cada barramento por trecho (para conferir o equilíbrio da mixagem sem ouvir)
  const zonas = { intro: [0, 16], A1: [16, 16 + P * 2], A2: [16 + P * 2, 16 + P * 4], subida: [sub0, sub0 + 16], drop: [drop0, drop0 + Pd * 4], fim: [fim0, fim0 + 16] };
  for (const [nome, b] of Object.entries(bus)) {
    const [l, rr] = b instanceof Float32Array ? [b, b] : b;
    const g = G[nome], gv = (REV[nome] || 0) * g, ge = (ECO[nome] || 0) * g;
    for (let i = 0; i < n; i++) {
      L[i] += l[i] * g; R[i] += rr[i] * g;
      if (gv) { rvL[i] += l[i] * gv; rvR[i] += rr[i] * gv; }
      if (ge) { ecL[i] += l[i] * ge; ecR[i] += rr[i] * ge; }
    }
    estat[nome] = Object.fromEntries(Object.entries(zonas).map(([z, [a, b2]]) => {
      let q = 0; const i0 = S(a), i1 = Math.min(n, S(b2));
      for (let i = i0; i < i1; i++) q += (l[i] * g) ** 2 + (rr[i] * g) ** 2;
      return [z, Math.round(10 * Math.log10(q / (2 * (i1 - i0)) + 1e-12))];
    }));
  }
  const [eL, eR] = D.ecoPingPong(ecL, ecR, spb * 0.75, 0.38);
  for (let i = 0; i < n; i++) { rvL[i] += eL[i] * 0.25; rvR[i] += eR[i] * 0.25; L[i] += eL[i] * 0.8; R[i] += eR[i] * 0.8; }
  const [wL, wR] = D.reverb(rvL, rvR, { sala: 0.84, amortece: 0.3 });
  const sc2 = curvaCurta;
  for (let i = 0; i < n; i++) { const g = 1 - 0.3 * sc2[i]; L[i] += wL[i] * g * 1.1; R[i] += wR[i] * g * 1.1; }

  // master: passa-alta, cola, loudness e limitador
  D.passaAlta(L, 24); D.passaAlta(R, 24);
  D.compressor(L, R, { limiar: -13, razao: 1.8 });
  const fade = Math.floor(2.4 * SR);
  for (let i = 0; i < fade; i++) { const g = Math.pow(1 - i / fade, 1.5); L[n - fade + i] *= g; R[n - fade + i] *= g; }
  let ganho = Math.pow(10, (ALVO_LUFS - D.lufs(L, R) + 1.2) / 20);
  let oL, oR, medido;
  for (let it = 0; it < 3; it++) {
    oL = L.map((x) => x * ganho); oR = R.map((x) => x * ganho);
    D.limitador(oL, oR, TETO);
    medido = D.lufs(oL, oR);
    if (Math.abs(medido - ALVO_LUFS) < 0.3) break;
    ganho *= Math.pow(10, (ALVO_LUFS - medido) / 20);
  }
  let pico = 0; for (let i = 0; i < n; i++) pico = Math.max(pico, Math.abs(oL[i]), Math.abs(oR[i]));
  return { L: oL, R: oR, dur: n / SR, lufs: medido, pico: 20 * Math.log10(pico), estat, oit, acordes: acordes.length };
}

// ------------------------------------------------------------------ main
const args = process.argv.slice(2);
const so = args.includes("--so") ? args[args.indexOf("--so") + 1].split(",") : null;
const pastaWav = args.includes("--wav") ? args[args.indexOf("--wav") + 1] : null;
mkdirSync(SAIDA, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "radio-rabisco-"));
let total = 0;
for (const fx of faixas()) {
  if (so && !so.includes(fx.id)) continue;
  const t0 = Date.now();
  const res = renderizar(fx);
  const wav = join(pastaWav || tmp, `${fx.id}.wav`);
  if (pastaWav) mkdirSync(pastaWav, { recursive: true });
  writeFileSync(wav, D.wav16(res.L, res.R));
  const kbps = Math.max(48, Math.min(64, Math.floor((LIMITE_KB * 1024 * 8) / res.dur / 1000 / 8) * 8));
  const destino = join(SAIDA, `${fx.id}.m4a`);
  try {
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", String(kbps * 1000), "-s", "1", "-q", "127", wav, destino]);
  } catch (e) { console.error("afconvert falhou (só no macOS); WAV em", wav); throw e; }
  const kb = statSync(destino).size / 1024;
  total += kb;
  console.log(`${fx.id.padEnd(14)} ${res.dur.toFixed(1)} s  ${fx.bpm} BPM  ${res.lufs.toFixed(1)} LUFS  pico ${res.pico.toFixed(1)} dBFS  ${kbps} kbps  ${kb.toFixed(0)} KB  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (args.includes("--mix")) for (const [k, v] of Object.entries(res.estat)) console.log("   ", k.padEnd(8), Object.entries(v).map(([z, d]) => `${z} ${d}`).join("  "));
}
if (!pastaWav) rmSync(tmp, { recursive: true, force: true });
console.log(`total ${total.toFixed(0)} KB`);
