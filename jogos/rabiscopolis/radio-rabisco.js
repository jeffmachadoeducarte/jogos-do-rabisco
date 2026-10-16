// Rádio Rabisco: a estação gospel dance do carro da Rabiscolândia (e a primeira do painel do rádio).
// Faixas: arranjos ORIGINAIS em estilo dance/eletrônico (bumbo 4x4, baixo pulsante, supersaw, palmas, subida e
// drop) sobre hinos de DOMÍNIO PÚBLICO, só instrumentais, gerados por ferramentas/radio/gerar_dance.mjs em
// assets/radio/rabisco/<id>.m4a (AAC, ~0,5 MB cada; só baixa a que vai tocar).
//
// Embrulha o rádio de src/radio/radio.js com a mesma interface (o painel de src/radio/radio-ui.js funciona igual):
// estação 0 = Rádio Rabisco; ▶ e ◀ passam para as estações de hinos de sempre. Ao entrar no carro liga SEMPRE
// na Rádio Rabisco com uma faixa DIFERENTE da última: "saco embaralhado" guardado no aparelho (localStorage),
// que passa por todas antes de repetir e nunca repete a anterior, nem de um dia para o outro.
// Volume: o do rádio (curva igual) e o 🔊/🔇 da engrenagem (sons.mudo). As falas da anfitriã abaixam a música.
//
//   const radio = criarRadioRabisco({ aoTocar: (faixa) => ... });   // dentro do gesto da criança (entrar no carro)
//   radio.ligar(); radio.desligar(); radio.proxima(); radio.estado()

import { criarRadio, ESTACOES } from "../../src/radio/radio.js";
import { sons } from "../../src/motor/sons.js";

export const FAIXAS = [
  { id: "santos", nome: "Quando os Santos", rotulo: "spiritual tradicional", ano: "tradicional", autor: "spiritual afro-americano (séc. XIX)" },
  { id: "alegria", nome: "Alegria", rotulo: "Beethoven, 1824", ano: 1824, autor: "Ludwig van Beethoven (1770–1827), Hino à Alegria" },
  { id: "jesus-me-ama", nome: "Jesus Me Ama", rotulo: "hino de 1862", ano: 1862, autor: "William B. Bradbury (1816–1868)" },
  { id: "castelo-forte", nome: "Castelo Forte", rotulo: "hino de 1529", ano: 1529, autor: "Martinho Lutero (1483–1546)" },
  { id: "que-amigo", nome: "Que Amigo em Cristo", rotulo: "hino de 1868", ano: 1868, autor: "Charles C. Converse (1832–1918)" },
  { id: "sou-feliz", nome: "Sou Feliz com Jesus", rotulo: "hino de 1876", ano: 1876, autor: "Philip P. Bliss (1838–1876)" },
  { id: "doxologia", nome: "Doxologia", rotulo: "hino de 1551", ano: 1551, autor: "Louis Bourgeois (c.1510–c.1560)" },
];
export const ESTACAO = { id: "rabisco", nome: "Rádio Rabisco", cor: "#12a150" };
const urlFaixa = (id) => new URL(`../../assets/radio/rabisco/${id}.m4a`, import.meta.url).href;
const CHAVE = "rabisco-radio-dance";
const DUCK = 0.3;            // volume enquanto a anfitriã fala
const ESPERA = 9000;         // ms sem começar → cai numa estação de hinos (sem internet)
const RESERVA = ESTACOES.findIndex((e) => e.id === "alegria");

// ------------------------------------------------------------------ saco embaralhado
let memoria = {}; // sem localStorage (modo privado): vale enquanto a página estiver aberta
function lerSaco() { try { const v = JSON.parse(localStorage.getItem(CHAVE)); if (v && typeof v === "object") return v; } catch { /* sem armazenamento */ } return memoria; }
function gravarSaco(v) { memoria = v; try { localStorage.setItem(CHAVE, JSON.stringify(v)); } catch { /* sem armazenamento */ } }
// devolve a próxima faixa: todas tocam antes de repetir; nunca a mesma da vez anterior
export function sortearFaixa(ids = FAIXAS.map((f) => f.id), aleatorio = Math.random) {
  const s = lerSaco();
  const recentes = (Array.isArray(s.recentes) ? s.recentes : []).filter((id) => ids.includes(id));
  const ultima = recentes[recentes.length - 1];
  let saco = (Array.isArray(s.saco) ? s.saco : []).filter((id, i, a) => ids.includes(id) && id !== ultima && a.indexOf(id) === i);
  if (!saco.length) {
    saco = ids.slice();
    for (let i = saco.length - 1; i > 0; i--) { const j = Math.floor(aleatorio() * (i + 1)); [saco[i], saco[j]] = [saco[j], saco[i]]; }
    // as que tocaram por último vão para o fim do saco novo (nunca a mesma em seguida, nem quase)
    const evitar = new Set(recentes.slice(-Math.max(1, Math.floor(ids.length / 2))));
    saco = [...saco.filter((id) => !evitar.has(id)), ...saco.filter((id) => evitar.has(id))];
    if (saco[0] === ultima && saco.length > 1) [saco[0], saco[1]] = [saco[1], saco[0]];
  }
  const id = saco.shift();
  recentes.push(id);
  while (recentes.length > ids.length) recentes.shift();
  gravarSaco({ saco, recentes });
  return id;
}

// ------------------------------------------------------------------ rádio
export function criarRadioRabisco({ aoTocar = null } = {}) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const base = criarRadio({ audioCtx: ctx });
  const estacoes = [ESTACAO, ...ESTACOES];
  let ligado = false, atual = 0, ultimaBase = 0, faixa = null, vol = base.volume();
  let el = null, gFaixa = null, gDuck = null, gMestre = null, timer = null, espera = 0, sessao = 0, ultimaFalha = null;
  const ouvintes = new Set(), duck = new Set(), historico = [];
  const autoSolta = new Map();

  function preparar() {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (el) return;
    el = new Audio();
    el.preload = "auto";
    const fonte = ctx.createMediaElementSource(el);
    gFaixa = ctx.createGain(); gDuck = ctx.createGain(); gMestre = ctx.createGain();
    gFaixa.gain.value = 0; gMestre.gain.value = 0;
    fonte.connect(gFaixa).connect(gDuck).connect(gMestre).connect(ctx.destination);
    el.addEventListener("ended", () => { if (ligado && atual === 0) tocar(sortearFaixa()); });
    el.addEventListener("playing", () => clearTimeout(espera));
    el.addEventListener("error", () => { if (ligado && atual === 0 && el.getAttribute("src")) falhou("arquivo"); });
  }
  const ganhoAlvo = () => (ligado && atual === 0 && !sons.mudo ? vol * vol * 1.6 : 0); // mesma curva do rádio de hinos
  function aplicarVolume(tc = 0.08) { if (gMestre) gMestre.gain.setTargetAtTime(ganhoAlvo(), ctx.currentTime, tc); }
  function aplicarDuck() { if (gDuck) gDuck.gain.setTargetAtTime(duck.size ? DUCK : 1, ctx.currentTime, duck.size ? 0.08 : 0.35); }
  function rampa(alvo, dur) {
    const t = ctx.currentTime, g = gFaixa.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(alvo, t + dur);
  }

  function tocar(id) {
    preparar();
    faixa = id;
    historico.push(id);
    const s = ++sessao;
    clearTimeout(espera);
    espera = setTimeout(() => { if (s === sessao && ligado && atual === 0 && el.paused) falhou("demorou"); }, ESPERA);
    el.src = urlFaixa(id);
    gFaixa.gain.cancelScheduledValues(ctx.currentTime);
    gFaixa.gain.setValueAtTime(0, ctx.currentTime);
    rampa(1, 0.08);
    aplicarVolume(0.05);
    const p = el.play(); // ainda dentro do gesto da criança (o iPhone exige)
    p?.catch?.((e) => { if (s === sessao && e?.name !== "AbortError") falhou(e?.name || "play"); });
    emitir();
    const f = FAIXAS.find((x) => x.id === id);
    try { aoTocar?.(f); } catch (e) { console.warn("rádio:", e); }
  }
  function parar() {
    clearTimeout(espera);
    faixa = null;
    if (!el) return;
    rampa(0, 0.35); // sai com um fade curto
    const s = ++sessao;
    setTimeout(() => { if (s === sessao) el.pause(); }, 420);
  }
  // sem internet ou sem o arquivo: segue numa estação de hinos (que tem reserva sintetizada)
  function falhou(motivo) {
    ultimaFalha = motivo;
    parar();
    if (!ligado) return;
    atual = 1 + RESERVA;
    aplicarVolume();
    base.ligar({ estacao: RESERVA });
  }

  function infoDance() {
    const f = FAIXAS.find((x) => x.id === faixa);
    return {
      ligado, indice: ultimaBase, id: ESTACAO.id, nome: ESTACAO.nome, cor: ESTACAO.cor,
      hino: f ? { id: f.id, nome: f.nome, rotulo: f.rotulo, autor: f.autor, ano: f.ano, texto: `${f.nome} — ${f.rotulo}` } : null,
    };
  }
  const info = () => (atual === 0 ? infoDance() : { ...base.estacaoAtual(), ligado });
  function emitir() { const i = info(); for (const cb of ouvintes) try { cb(i); } catch (e) { console.warn("rádio:", e); } }
  base.onMudar((i) => { if (atual > 0) { ultimaBase = i.indice; emitir(); } });

  // as falas (manuais ou os MP3 vigiados pelo rádio de hinos) abaixam as duas rádios
  const pausarBase = base.pausarPorFala;
  base.pausarPorFala = (sim, fonte = "manual") => {
    pausarBase(sim, fonte);
    if (sim) duck.add(fonte); else duck.delete(fonte);
    clearTimeout(autoSolta.get(fonte));
    if (sim && fonte === "manual") autoSolta.set(fonte, setTimeout(() => radio.pausarPorFala(false, fonte), 8000)); // nunca fica abaixado para sempre
    aplicarDuck();
  };

  function trocar(passo) {
    atual = (atual + passo + estacoes.length) % estacoes.length;
    if (ligado) {
      if (atual === 0) { base.desligar(); aplicarVolume(); tocar(sortearFaixa()); }
      else { if (faixa) parar(); aplicarVolume(); base.ligar({ estacao: atual - 1 }); ultimaBase = atual - 1; }
    }
    emitir();
    return info();
  }

  const radio = {
    estacoes,
    ligar() {
      if (ligado) return info();
      ligado = true;
      atual = 0; // entrar no carro: sempre a Rádio Rabisco, com uma faixa nova
      preparar();
      aplicarDuck();
      tocar(sortearFaixa());
      clearInterval(timer);
      timer = setInterval(() => aplicarVolume(0.15), 250); // acompanha o 🔇 da engrenagem
      return info();
    },
    desligar() {
      if (!ligado) return;
      ligado = false;
      clearInterval(timer); timer = null;
      parar();
      base.desligar();
      emitir();
    },
    alternar() { if (ligado) radio.desligar(); else radio.ligar(); return ligado; },
    get ligado() { return ligado; },
    proxima: () => trocar(1),
    anterior: () => trocar(-1),
    volume(v) {
      if (v == null) return vol;
      vol = base.volume(v);
      aplicarVolume();
      return vol;
    },
    estacaoAtual: info,
    onMudar(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); },
    pausarPorFala: (sim, fonte) => base.pausarPorFala(sim, fonte),
    vigiarFalas() {
      const tirar = base.vigiarFalas(); // chama base.pausarPorFala (o de cima) para cada MP3 de assets/voz
      return () => { tirar(); for (const k of [...duck]) if (k !== "manual") duck.delete(k); aplicarDuck(); };
    },
    get contexto() { return ctx; },
    estado() {
      const b = base.estado();
      return {
        ...info(), modo: !ligado ? null : atual === 0 ? "dance" : b.modo, abaixado: duck.size > 0,
        ganhoDuck: gDuck?.gain.value ?? 1, ganhoMestre: atual === 0 ? gMestre?.gain.value ?? 0 : b.ganhoMestre,
        faixa: atual === 0 && faixa && el ? { id: faixa, src: el.currentSrc || el.src, tocando: !el.paused, tempo: Math.round(el.currentTime * 10) / 10 } : b.faixa,
        audioTocando: atual === 0 ? !!el && !el.paused : b.audioTocando, historico: historico.slice(-10), ultimaFalha,
      };
    },
  };
  return radio;
}

// aviso pequeno no alto da tela: "🎵 Rádio Rabisco: Quando os Santos" por uns 3 s
export function criarAvisoRadio(pai = document.body) {
  const el = document.createElement("div");
  el.className = "rp-radio-aviso";
  el.setAttribute("role", "status");
  el.hidden = true;
  pai.appendChild(el);
  let t = 0;
  return {
    el,
    mostrar(texto, ms = 3000) {
      el.textContent = texto;
      el.hidden = false;
      el.classList.remove("some"); void el.offsetWidth; el.classList.add("entra");
      clearTimeout(t);
      t = setTimeout(() => { el.classList.add("some"); t = setTimeout(() => { el.hidden = true; el.classList.remove("entra", "some"); }, 300); }, ms);
    },
    esconder() { clearTimeout(t); el.hidden = true; el.classList.remove("entra", "some"); },
  };
}
