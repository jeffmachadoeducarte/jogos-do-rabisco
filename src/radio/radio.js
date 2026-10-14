// Rádio gospel do carro: hinos de DOMÍNIO PÚBLICO (e 3 melodias originais) em ARRANJOS INSTRUMENTAIS
// gravados em MP3 (assets/radio/<estacao>/<hino>.mp3), renderizados com instrumentos amostrados por
// ferramentas/radio/gerar_radio.py (FluidSynth + SoundFont GeneralUser GS — créditos em assets/radio/CREDITOS.md).
// Só baixa a faixa da estação que está tocando (e pré-carrega a próxima). Se a faixa não carregar
// (sem internet), cai na RESERVA: as mesmas melodias sintetizadas aqui mesmo (Web Audio), a partir de ./hinos.js.
//
//   import { criarRadio } from "../../src/radio/radio.js";
//   const radio = criarRadio({ audioCtx });   // usa o AudioContext do jogo, se houver (senão cria um ao ligar)
//   radio.ligar();  radio.desligar();  radio.proxima();  radio.anterior();  radio.volume(0.6);
//   radio.estacaoAtual()  → { nome, cor, hino: { nome, rotulo, autor, ano } }
//   radio.onMudar((info) => ...)       // liga/desliga, troca de estação ou de hino
//   radio.pausarPorFala(true/false)    // "ducking": abaixa ~70% enquanto a anfitriã fala
//   radio.vigiarFalas()                // ducking automático para os MP3 de assets/voz tocados por src/motor/voz.js
//
// Faixas: um único <audio> (destravado no toque que liga o rádio, o que o iPhone exige) ligado ao
// AudioContext por MediaElementSource → ganho da faixa → ducking → volume mestre.
// Reserva sintetizada: 1 oscilador + 1 ganho por nota (envelopes sem clique), um filtro e um eco por estação,
// agendamento com antecedência (lookahead) no relógio do AudioContext. Em OfflineAudioContext usa sempre a reserva.

import { HINOS } from "./hinos.js";
import { sons } from "../motor/sons.js";

export const ESTACOES = [
  { id: "jesus-me-ama", nome: "Rádio Jesus Me Ama", cor: "#ff6fae", estilo: "caixinha", hinos: ["jesus-me-ama", "manjedoura", "formoso-jesus"] },
  { id: "hinos-de-fe", nome: "Rádio Hinos de Fé", cor: "#8e6cff", estilo: "orgao", hinos: ["castelo-forte", "santo-santo-santo", "doxologia"] },
  { id: "paz", nome: "Rádio Paz", cor: "#2fa8e0", estilo: "piano", hinos: ["sou-feliz", "que-amigo", "mais-perto", "graca"] },
  { id: "alegria", nome: "Rádio Alegria", cor: "#ff9f1a", estilo: "alegre", hinos: ["pulando", "bom-dia-sol", "palminhas"] },
];
// vinheta falada (voz Francisca, gerada por ferramentas/gerar_vozes.py, BLOCO Rádio): duas variações por estação
const urlVoz = (chave) => new URL(`../../assets/voz/${chave}.mp3`, import.meta.url).href;
const VINHETAS = Object.fromEntries(ESTACOES.map((e) => [e.id, [`radio-${e.id}`, `radio-${e.id}-2`]]));
// faixas gravadas: assets/radio/<estação>/<hino>.mp3 e assets/radio/<estação>/vinheta-1|2.mp3 (fundo musical + a mesma voz)
const urlFaixa = (estacao, nome) => new URL(`../../assets/radio/${estacao}/${nome}.mp3`, import.meta.url).href;
const NIVEL_FAIXA = 1.0;      // ganho das faixas (masterizadas a -18 LUFS)
const ESPERA_FAIXA = 9000;    // ms sem começar a tocar → usa a reserva sintetizada
const PAUSA_RESERVA = 30000;  // depois de uma falha, as trocas de estação vão direto para a reserva por 30 s

const ANTECEDENCIA = 0.35; // s agendados à frente
const PASSO = 60;          // ms entre agendamentos
const VEZES = 2;           // cada hino toca duas vezes (duas estrofes)
const DUCK = 0.3;          // volume enquanto a anfitriã fala (abaixa 70%)
// batidas de ruído: [frequência, tipo de filtro] e [pico, decaimento]
const FILTRO_PERC = { chocalho: [7500, "highpass"], palma: [1600, "bandpass"], chiado: [2200, "bandpass"] };
const PERC = { chocalho: [0.022, 0.02], palma: [0.045, 0.035], chiado: [0.05, 0.12] };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ------------------------------------------------------------------ Timbres
// harmônicos (série de senos) de cada instrumento sintetizado
const ONDAS = {
  piano: [0, 1, 0.55, 0.32, 0.2, 0.13, 0.08, 0.05, 0.035, 0.02],
  orgao: [0, 1, 0.7, 0.22, 0.42, 0.04, 0.18, 0, 0.2],
  caixinha: [0, 1, 0.04, 0.22, 0, 0.07, 0, 0.03],
  pad: [0, 1, 0.18, 0.07, 0.02],
  baixo: [0, 1, 0.32, 0.08],
  marimba: [0, 1, 0, 0, 0.3, 0, 0, 0, 0, 0.06],
};
// p: percussivo (decai sozinho) ou sustentado; vol = pico; decai = constante de tempo (s); solta = soltura (s)
const INSTR = {
  pianoMel: { onda: "piano", vol: 0.15, ataque: 0.006, decai: 0.9, solta: 0.12, p: true },
  pianoVoz: { onda: "piano", vol: 0.065, ataque: 0.008, decai: 0.8, solta: 0.12, p: true },
  pianoBaixo: { onda: "piano", vol: 0.1, ataque: 0.008, decai: 1.2, solta: 0.15, p: true },
  orgaoMel: { onda: "orgao", vol: 0.075, ataque: 0.035, sustem: 0.9, decai: 0.25, solta: 0.07, legato: 0.93, vibrato: true },
  orgaoVoz: { onda: "orgao", vol: 0.05, ataque: 0.04, sustem: 0.9, decai: 0.25, solta: 0.07, legato: 0.95, vibrato: true },
  orgaoBaixo: { onda: "orgao", vol: 0.065, ataque: 0.05, sustem: 0.9, decai: 0.25, solta: 0.09, legato: 0.95 },
  caixinhaMel: { onda: "caixinha", vol: 0.13, ataque: 0.004, decai: 0.45, solta: 0.25, p: true, oitava: 12 },
  padMel: { onda: "pad", vol: 0.03, ataque: 0.06, sustem: 0.8, decai: 0.3, solta: 0.2, legato: 0.9 },
  padVoz: { onda: "pad", vol: 0.032, ataque: 0.09, sustem: 0.75, decai: 0.4, solta: 0.25, legato: 0.95 },
  baixoMacio: { onda: "baixo", vol: 0.1, ataque: 0.02, sustem: 0.7, decai: 0.5, solta: 0.15, legato: 0.85 },
  marimba: { onda: "marimba", vol: 0.15, ataque: 0.003, decai: 0.2, solta: 0.08, p: true },
  flauta: { onda: "pad", vol: 0.03, ataque: 0.03, sustem: 0.8, decai: 0.2, solta: 0.08, legato: 0.85 },
  baixoPulo: { onda: "baixo", vol: 0.12, ataque: 0.008, decai: 0.25, solta: 0.06, p: true },
  teclas: { onda: "piano", vol: 0.04, ataque: 0.005, decai: 0.18, solta: 0.05, p: true },
};
// cada estação: instrumento da melodia (e dobra), das vozes do meio e do baixo; filtro e eco
const ESTILOS = {
  caixinha: { mel: ["caixinhaMel", "padMel"], voz: "padVoz", baixo: "baixoMacio", filtro: 4200, eco: 0.2 },
  orgao: { mel: ["orgaoMel"], voz: "orgaoVoz", baixo: "orgaoBaixo", filtro: 3000, eco: 0.24 },
  piano: { mel: ["pianoMel"], voz: "pianoVoz", baixo: "pianoBaixo", filtro: 3200, eco: 0.16 },
  alegre: { mel: ["marimba", "flauta"], filtro: 5000, eco: 0.1 },
};

// cifra → notas (raiz no 3º oitava)
const RAIZ = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function acorde(cifra) {
  const m = /^([A-G])([#b]?)(m?)(7?)$/.exec(cifra);
  let r = RAIZ[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  r = ((r % 12) + 12) % 12;
  const terca = m[3] ? 3 : 4;
  const notas = [r, r + terca, r + 7];
  if (m[4]) notas.push(r + 10);
  return { raiz: 36 + r, notas: notas.map((n) => 55 + ((n - 55 % 12 + 24) % 12)) }; // tríade entre G3 e F#4
}

// ------------------------------------------------------------------ Ducking automático (MP3 da anfitriã)
const ouvintesFala = new Set();
let vigiaInstalada = false;
function instalarVigia() {
  if (vigiaInstalada || typeof HTMLMediaElement === "undefined") return;
  vigiaInstalada = true;
  const original = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    const r = original.apply(this, args);
    try {
      const src = this.currentSrc || this.src || "";
      if (/\/assets\/voz\//.test(src) && !/\/voz\/radio-/.test(src)) {
        const el = this;
        for (const f of ouvintesFala) f(el, true);
        const fim = () => { for (const ev of ["ended", "pause", "error", "emptied"]) el.removeEventListener(ev, fim); for (const f of ouvintesFala) f(el, false); };
        for (const ev of ["ended", "pause", "error", "emptied"]) el.addEventListener(ev, fim);
        r?.catch?.(fim); // navegador bloqueou: não fica abaixado para sempre
      }
    } catch { /* nunca atrapalha a fala */ }
    return r;
  };
}

// ------------------------------------------------------------------ Rádio
export function criarRadio({ audioCtx = null, saida = null, volume: volInicial = 0.55, estacao = 0 } = {}) {
  let ctx = audioCtx;
  const offline = typeof OfflineAudioContext !== "undefined" && ctx instanceof OfflineAudioContext;
  let mestre = null, duck = null, ondas = null, ruido = null, lfo = null, lfoGanho = null;
  let ligado = false, timer = null, vol = volInicial;
  let est = ((estacao % ESTACOES.length) + ESTACOES.length) % ESTACOES.length;
  const posicao = ESTACOES.map(() => 0);     // próximo hino de cada estação
  const vinhetaN = ESTACOES.map(() => 0);
  let sessao = null;                          // { bus, bloco, tProx, proximo }
  let hinoAtual = null;
  const ouvintes = new Set();
  const duckFontes = new Set();
  const buffers = new Map();                  // chave → AudioBuffer | null | Promise
  let vozesAtivas = 0, notasDoHino = 0;
  // faixas gravadas
  let player = null, ganhoFaixa = null;       // <audio> único + seu ganho no grafo
  let faixa = null;                           // { sessao, tipo, url, proximo, tocando, timer, preProx }
  let faixaSessao = 0, falhouEm = -Infinity, modo = "faixas", ultimaFalha = null;
  const preCarregadas = new Set();

  function prepararContexto() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended" && !offline) ctx.resume().catch(() => {});
    if (mestre) return;
    ondas = {};
    for (const [nome, harm] of Object.entries(ONDAS)) {
      const re = new Float32Array(harm.length), im = Float32Array.from(harm);
      ondas[nome] = ctx.createPeriodicWave(re, im);
    }
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    duck = ctx.createGain();
    mestre = ctx.createGain();
    mestre.gain.value = 0;
    duck.connect(mestre).connect(saida || ctx.destination);
  }

  const ganhoAlvo = () => (ligado && !sons.mudo ? vol * vol * 1.6 : 0); // curva suave: 0.55 → ~0.48
  function aplicarVolume(tc = 0.08) { if (mestre) mestre.gain.setTargetAtTime(ganhoAlvo(), ctx.currentTime, tc); }
  function aplicarDuck() { if (duck) duck.gain.setTargetAtTime(duckFontes.size ? DUCK : 1, ctx.currentTime, duckFontes.size ? 0.08 : 0.35); }

  function carregarVoz(chave) {
    if (buffers.has(chave)) return;
    buffers.set(chave, null);
    fetch(urlVoz(chave)).then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((ab) => (ab ? ctx.decodeAudioData(ab) : null))
      .then((b) => buffers.set(chave, b || null)).catch(() => buffers.set(chave, null));
  }

  // ---------- síntese de uma nota (envelope ADSR sem cliques)
  function nota(destino, ins, midi, t, dur) {
    const p = INSTR[ins];
    const o = ctx.createOscillator();
    o.setPeriodicWave(ondas[p.onda]);
    o.frequency.value = hz(midi + (p.oitava || 0));
    if (p.vibrato && lfoGanho) lfoGanho.connect(o.detune);
    const g = ctx.createGain();
    const ataque = Math.min(p.ataque, dur * 0.4);
    const solte = Math.max(t + ataque + 0.01, t + dur * (p.legato || 1));
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(p.vol, t + ataque);
    if (p.p) g.gain.setTargetAtTime(0, t + ataque, p.decai * (midi < 52 ? 1.6 : midi > 76 ? 0.7 : 1));
    else g.gain.setTargetAtTime(p.vol * p.sustem, t + ataque, p.decai);
    g.gain.setTargetAtTime(0, solte, p.solta);
    const fim = p.p ? Math.min(solte + p.solta * 6, t + ataque + p.decai * 7) : solte + p.solta * 6;
    o.connect(g).connect(destino);
    o.start(t);
    o.stop(Math.max(fim, t + 0.05));
    vozesAtivas++;
    o.onended = () => { vozesAtivas--; try { g.disconnect(); if (p.vibrato && lfoGanho) lfoGanho.disconnect(o.detune); } catch { /* já solto */ } };
  }
  // percussão leve da Rádio Alegria e o chiado de troca de estação
  function batida(destino, tipo, t) {
    if (tipo === "bumbo") {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.01, 0.06);
      o.connect(g).connect(destino); o.start(t); o.stop(t + 0.4);
      vozesAtivas++; o.onended = () => { vozesAtivas--; g.disconnect(); };
      return;
    }
    // ruído: uma única fonte em loop por estação, com um "portão" (ganho) por tipo de batida.
    // (criar um AudioBufferSource por batida derrubava o Chrome sem janela depois de alguns segundos)
    const g = sessao?.portoes[tipo];
    if (!g) return;
    const [pico, tau] = PERC[tipo];
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(pico, t + 0.003);
    g.gain.setTargetAtTime(0, t + 0.005, tau);
  }

  // ---------- blocos de programação: [vinheta] → hino → vinheta → hino ...
  function blocoHino(id, T0) {
    const h = HINOS[id];
    const st = ESTILOS[ESTACOES[est].estilo];
    const spb = 60 / h.bpm;
    const ev = [];
    const volta = h.total + 1; // um tempo de respiro entre as estrofes
    for (let k = 0; k < VEZES; k++) {
      const base = k * volta;
      const ultima = k === VEZES - 1;
      const lista = (arr, ins) => {
        for (let i = 0; i < arr.length; i += 3) {
          let d = arr[i + 1];
          if (ultima && arr[i] + d >= h.total) d += 1.5; // fermata no fim
          ev.push({ t: T0 + (base + arr[i]) * spb, d: d * spb, m: arr[i + 2], ins });
        }
      };
      for (const ins of st.mel) lista(h.mel, ins);
      if (h.original) {
        // acompanhamento alegre a partir das cifras: baixo pulando, acordes nos contratempos, bateria leve
        for (let a = 0; a < h.acordes.length; a++) {
          const [ini, cifra] = h.acordes[a];
          const fimA = h.acordes[a + 1]?.[0] ?? h.total;
          const { raiz, notas } = acorde(cifra);
          for (let b = Math.ceil(ini); b < fimA; b++) {
            const t = T0 + (base + b) * spb, bb = b % 4;
            if (bb === 0 || bb === 2) {
              ev.push({ t, d: spb * 0.9, m: bb === 0 ? raiz : raiz + 7, ins: "baixoPulo" });
              ev.push({ t, bat: "bumbo" });
            } else {
              for (const n of notas.slice(0, 3)) ev.push({ t, d: spb * 0.45, m: n, ins: "teclas" });
              ev.push({ t, bat: "palma" });
            }
            ev.push({ t: t + spb / 2, bat: "chocalho" });
          }
        }
      } else {
        lista(h.voz, st.voz);
        lista(h.baixo, st.baixo);
      }
    }
    ev.sort((a, b) => a.t - b.t);
    return { tipo: "hino", id, ev, i: 0, fim: T0 + (VEZES * volta - 1 + 1.5) * spb + 0.6, T0 };
  }
  function blocoVinheta(T0) {
    const e = ESTACOES[est];
    const ev = [];
    // plim-plim da estação (caixinha) + a voz dizendo o nome
    const tom = { "jesus-me-ama": 72, "hinos-de-fe": 67, paz: 69, alegria: 74 }[e.id];
    [0, 4, 7, 12].forEach((s, i) => ev.push({ t: T0 + i * 0.12, d: 0.5, m: tom + s, ins: "caixinhaMel" }));
    const chaves = VINHETAS[e.id];
    const chave = chaves[vinhetaN[est]++ % chaves.length];
    const buf = buffers.get(chave) || buffers.get(chaves[0]);
    let fim = T0 + 1.3;
    if (buf) { ev.push({ t: T0 + 0.55, buf }); fim = T0 + 0.55 + buf.duration + 0.5; }
    return { tipo: "vinheta", ev, i: 0, fim };
  }
  function proximoBloco(T0) {
    if (sessao.proximo === "vinheta") { sessao.proximo = "hino"; return blocoVinheta(T0); }
    sessao.proximo = "vinheta";
    const e = ESTACOES[est];
    const id = e.hinos[posicao[est] % e.hinos.length];
    posicao[est]++;
    hinoAtual = id;
    notasDoHino = 0;
    const b = blocoHino(id, T0);
    const avisar = () => { if (sessao && sessao.bloco === b) emitir(); };
    if (offline) avisar(); else setTimeout(avisar, Math.max(0, (T0 - ctx.currentTime) * 1000));
    return b;
  }
  function disparar(ev) {
    const bus = sessao.bus;
    if (ev.buf) {
      const s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = ev.buf; g.gain.value = 0.9;
      s.connect(g).connect(sessao.seco); s.start(ev.t);
      vozesAtivas++; s.onended = () => { vozesAtivas--; g.disconnect(); };
    } else if (ev.bat) batida(bus, ev.bat, ev.t);
    else { nota(bus, ev.ins, ev.m, ev.t, ev.d); if (sessao.bloco?.tipo === "hino") notasDoHino++; }
  }
  function agendarAte(limite) {
    if (!sessao) return;
    for (let guarda = 0; guarda < 8; guarda++) {
      if (!sessao.bloco) sessao.bloco = proximoBloco(sessao.tProx);
      const b = sessao.bloco;
      while (b.i < b.ev.length && b.ev[b.i].t < limite) disparar(b.ev[b.i++]);
      if (b.i >= b.ev.length && b.fim < limite) { sessao.tProx = b.fim; sessao.bloco = null; continue; }
      break;
    }
  }
  function laco() {
    if (!ligado) return;
    aplicarVolume(0.15); // acompanha o mudo do jogo (sons.mudo)
    agendarAte(ctx.currentTime + ANTECEDENCIA);
  }

  // ---------- faixas gravadas (MP3)
  const agora = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const podeFaixas = () => !offline && typeof Audio !== "undefined" && typeof ctx?.createMediaElementSource === "function";
  function prepararPlayer() {
    if (player) return true;
    try {
      const el = new Audio();
      el.preload = "auto";
      const fonte = ctx.createMediaElementSource(el);
      ganhoFaixa = ctx.createGain();
      ganhoFaixa.gain.value = 0;
      fonte.connect(ganhoFaixa).connect(duck);
      el.addEventListener("ended", () => { if (faixa) tocarProximaFaixa(); });
      el.addEventListener("error", () => { if (faixa && el.getAttribute("src")) falhaFaixa("erro de rede/arquivo"); });
      el.addEventListener("playing", () => { if (faixa) { clearTimeout(faixa.timer); faixa.tocando = true; } });
      el.addEventListener("timeupdate", () => {
        // perto do fim do hino: pré-carrega o hino seguinte da estação (a vinheta já foi pré-carregada)
        if (faixa?.tipo === "hino" && !faixa.preProx && el.duration - el.currentTime < 25) {
          faixa.preProx = true;
          const e = ESTACOES[est];
          preCarregar(urlFaixa(e.id, e.hinos[posicao[est] % e.hinos.length]));
        }
      });
      player = el;
      return true;
    } catch { player = null; return false; }
  }
  function preCarregar(url) {
    if (preCarregadas.has(url) || typeof fetch === "undefined") return;
    preCarregadas.add(url);
    fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status)))).catch(() => preCarregadas.delete(url));
  }
  function rampaFaixa(alvo, dur) {
    const t = ctx.currentTime, g = ganhoFaixa.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(alvo, t + dur);
  }
  // chiadinho de sintonia ao trocar de estação (uma fonte só, que se desliga sozinha)
  function chiadoTroca() {
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = ruido; f.type = "bandpass"; f.frequency.value = 2200;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.01);
    g.gain.setTargetAtTime(0, t + 0.03, 0.1);
    s.connect(f).connect(g).connect(duck);
    s.start(t); s.stop(t + 0.5);
    s.onended = () => { try { g.disconnect(); f.disconnect(); } catch { /* ok */ } };
  }
  function abrirFaixas({ vinheta = true, chiado = true } = {}) {
    fecharSessao();
    const tocandoAntes = faixa && !player.paused;
    clearTimeout(faixa?.timer);
    faixa = { sessao: ++faixaSessao, proximo: vinheta ? "vinheta" : "hino", tocando: false };
    modo = "faixas";
    if (chiado) chiadoTroca();
    if (!tocandoAntes) { tocarProximaFaixa(); return; } // direto: mantém o "toque" do usuário (iPhone)
    rampaFaixa(0, 0.12);
    const s = faixa.sessao;
    setTimeout(() => { if (faixa?.sessao === s) tocarProximaFaixa(); }, 140);
  }
  function tocarProximaFaixa() {
    const e = ESTACOES[est];
    if (faixa.proximo === "vinheta") {
      faixa.tipo = "vinheta";
      faixa.url = urlFaixa(e.id, `vinheta-${(vinhetaN[est]++ % 2) + 1}`);
      faixa.proximo = "hino";
    } else {
      const id = e.hinos[posicao[est] % e.hinos.length];
      posicao[est]++;
      hinoAtual = id;
      faixa.tipo = "hino";
      faixa.url = urlFaixa(e.id, id);
      faixa.proximo = "vinheta";
    }
    faixa.tocando = false; faixa.preProx = false;
    const s = faixa.sessao;
    clearTimeout(faixa.timer);
    faixa.timer = setTimeout(() => { if (faixa?.sessao === s && !faixa.tocando) falhaFaixa("demorou para carregar"); }, ESPERA_FAIXA);
    player.src = faixa.url;
    rampaFaixa(NIVEL_FAIXA, 0.06);
    const p = player.play();
    p?.catch?.((err) => { if (faixa?.sessao === s && err?.name !== "AbortError") falhaFaixa(err?.name || "play"); });
    if (faixa.tipo === "hino") {
      emitir();
      preCarregar(urlFaixa(e.id, `vinheta-${(vinhetaN[est] % 2) + 1}`));
    } else {
      preCarregar(urlFaixa(e.id, e.hinos[posicao[est] % e.hinos.length]));
    }
  }
  function pararFaixa() {
    if (!faixa) return;
    clearTimeout(faixa.timer);
    faixa = null;
    if (!player) return;
    rampaFaixa(0, 0.1);
    const s = faixaSessao;
    setTimeout(() => { if (!faixa && faixaSessao === s) player.pause(); }, 160);
  }
  // sem internet (ou arquivo faltando): a mesma estação continua com a reserva sintetizada
  function falhaFaixa(motivo) {
    if (!faixa) return;
    const f = faixa;
    clearTimeout(f.timer);
    faixa = null;
    ultimaFalha = motivo;
    falhouEm = agora();
    try { player.pause(); player.removeAttribute("src"); player.load(); } catch { /* ok */ }
    if (f.tipo === "hino") posicao[est] = Math.max(0, posicao[est] - 1); // repete o mesmo hino na reserva
    if (ligado) abrirSessaoSint({ vinheta: f.tipo === "vinheta", chiado: false });
  }

  function abrirSessao(opcoes = {}) {
    if (podeFaixas() && agora() - falhouEm > PAUSA_RESERVA && prepararPlayer()) abrirFaixas(opcoes);
    else { pararFaixa(); abrirSessaoSint(opcoes); }
  }

  // cada estação toca no seu próprio "barramento" (filtro + eco), que some suave na troca
  function abrirSessaoSint({ vinheta = true, chiado = true } = {}) {
    fecharSessao();
    modo = "sintetizado";
    for (const chs of Object.values(VINHETAS)) for (const c of chs) carregarVoz(c);
    const st = ESTILOS[ESTACOES[est].estilo];
    const t = ctx.currentTime;
    const entrada = ctx.createGain();
    entrada.gain.setValueAtTime(0, t);
    entrada.gain.linearRampToValueAtTime(1, t + 0.08);
    const bus = ctx.createBiquadFilter();
    bus.type = "lowpass"; bus.frequency.value = st.filtro; bus.Q.value = 0.4;
    // eco curtinho (mais barato que reverb de convolução)
    const atraso = ctx.createDelay(1), volta = ctx.createGain(), molhado = ctx.createGain(), corte = ctx.createBiquadFilter();
    atraso.delayTime.value = 0.21; volta.gain.value = 0.28; molhado.gain.value = st.eco;
    corte.type = "lowpass"; corte.frequency.value = 1800;
    bus.connect(entrada);
    bus.connect(atraso); atraso.connect(corte).connect(volta).connect(atraso); corte.connect(molhado).connect(entrada);
    entrada.connect(duck);
    const fonteRuido = ctx.createBufferSource();
    fonteRuido.buffer = ruido; fonteRuido.loop = true;
    const portoes = {}, nos = [bus, atraso, volta, molhado, corte, entrada, fonteRuido];
    for (const [tipo, [freq, tipoF]] of Object.entries(FILTRO_PERC)) {
      if (tipo !== "chiado" && st !== ESTILOS.alegre) continue;
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = tipoF; f.frequency.value = freq; g.gain.value = 0;
      fonteRuido.connect(f).connect(g).connect(bus);
      portoes[tipo] = g; nos.push(f, g);
    }
    fonteRuido.start(t);
    sessao = { bus, seco: entrada, entrada, nos, fonteRuido, portoes, bloco: null, tProx: t + 0.1, proximo: vinheta ? "vinheta" : "hino" };
    if (chiado && !offline) { batida(bus, "chiado", t); batida(bus, "chiado", t + 0.09); sessao.tProx = t + 0.3; }
    if (st === ESTILOS.orgao && !lfo) {
      lfo = ctx.createOscillator(); lfo.frequency.value = 5.2; lfoGanho = ctx.createGain(); lfoGanho.gain.value = 5;
      lfo.connect(lfoGanho); lfo.start();
    }
    agendarAte(ctx.currentTime + ANTECEDENCIA);
  }
  function fecharSessao() {
    if (!sessao) return;
    const s = sessao; sessao = null;
    const t = ctx.currentTime;
    try { s.fonteRuido.stop(t + 0.3); } catch { /* ok */ }
    s.entrada.gain.cancelScheduledValues(t);
    s.entrada.gain.setValueAtTime(s.entrada.gain.value, t);
    s.entrada.gain.linearRampToValueAtTime(0, t + 0.15);
    // as notas já agendadas terminam em silêncio; os nós saem depois do fade
    setTimeout(() => { for (const n of s.nos) try { n.disconnect(); } catch { /* ok */ } }, offline ? 0 : 1500);
  }

  function info() {
    const e = ESTACOES[est];
    const h = hinoAtual && HINOS[hinoAtual];
    return {
      ligado, indice: est, id: e.id, nome: e.nome, cor: e.cor,
      hino: h ? { id: hinoAtual, nome: h.nome, rotulo: h.rotulo, autor: h.autor, ano: h.ano, texto: `${h.nome} — ${h.rotulo}` } : null,
    };
  }
  function emitir() { const i = info(); for (const cb of ouvintes) try { cb(i); } catch (e) { console.warn("rádio:", e); } }

  function trocar(passo) {
    est = (est + passo + ESTACOES.length) % ESTACOES.length;
    hinoAtual = ESTACOES[est].hinos[posicao[est] % ESTACOES[est].hinos.length];
    if (ligado) abrirSessao();
    emitir();
    return info();
  }

  const radio = {
    estacoes: ESTACOES,
    ligar({ estacao: e = null, vinheta = true } = {}) {
      if (e != null) est = ((e % ESTACOES.length) + ESTACOES.length) % ESTACOES.length;
      if (ligado) { if (e != null) abrirSessao({ vinheta }); return info(); }
      prepararContexto();
      ligado = true;
      aplicarVolume(0.05);
      aplicarDuck();
      hinoAtual = ESTACOES[est].hinos[posicao[est] % ESTACOES[est].hinos.length];
      abrirSessao({ vinheta, chiado: false });
      if (!offline) { clearInterval(timer); timer = setInterval(laco, PASSO); }
      emitir();
      return info();
    },
    desligar() {
      if (!ligado) return;
      ligado = false;
      clearInterval(timer); timer = null;
      aplicarVolume(0.06);
      fecharSessao();
      pararFaixa();
      if (lfo) { const l = lfo; lfo = null; setTimeout(() => { try { l.stop(); lfoGanho.disconnect(); } catch { /* ok */ } }, 1500); }
      emitir();
    },
    alternar() { if (ligado) radio.desligar(); else radio.ligar(); return ligado; },
    get ligado() { return ligado; },
    proxima: () => trocar(1),
    anterior: () => trocar(-1),
    volume(v) {
      if (v == null) return vol;
      vol = Math.max(0, Math.min(1, Number(v) || 0));
      aplicarVolume();
      return vol;
    },
    estacaoAtual: info,
    onMudar(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); },
    pausarPorFala(sim, fonte = "manual") {
      if (sim) duckFontes.add(fonte); else duckFontes.delete(fonte);
      aplicarDuck();
    },
    // abaixa sozinho enquanto um MP3 de assets/voz toca (falar(), falarNome()...). Devolve função para parar.
    vigiarFalas() {
      instalarVigia();
      const f = (el, sim) => radio.pausarPorFala(sim, el);
      ouvintesFala.add(f);
      return () => { ouvintesFala.delete(f); for (const k of [...duckFontes]) if (k !== "manual") duckFontes.delete(k); aplicarDuck(); };
    },
    get contexto() { return ctx; },
    // para testes e renderização offline
    agendarAte(t) { agendarAte(t); },
    estado() {
      return {
        ...info(), modo: ligado ? modo : null, notasDoHino, vozesAtivas, abaixado: duckFontes.size > 0, ganhoDuck: duck?.gain.value ?? 1, ganhoMestre: mestre?.gain.value ?? 0,
        faixa: faixa ? { tipo: faixa.tipo, src: player?.currentSrc || faixa.url, tocando: !!player && !player.paused && faixa.tocando, tempo: player ? Math.round(player.currentTime * 10) / 10 : 0 } : null,
        audioTocando: !!player && !player.paused, ultimaFalha,
      };
    },
  };
  return radio;
}
