// Voz do jogo: falas gravadas em assets/voz (geradas por ferramentas/gerar_vozes.py, voz Francisca).
// Cada fala é um MP3 com nome fixo; dá para trocar por gravações de verdade mantendo os nomes.
//
// A Francisca é a narradora/anfitriã dos jogos (ela não "é" o Rabisco). TODA fala é pré-gravada com ela:
// nada de voz do navegador (speechSynthesis), que soa robotizada. Para chamar a criança pelo nome
// (src/motor/familia.js) existe um banco de nomes gravados em assets/voz/nomes/<nome>.mp3 ("Alice!"):
// as frases com nome são tocadas em partes emendadas sem intervalo via Web Audio
// (ex.: "Parabéns," + "Alice!" + "Você mandou muito bem!"). Só o MP3 do nome cadastrado é baixado.
// Se o nome não estiver no banco, vale a frase neutra inteira (saudacao-1..3, parabens-1..3).
//
//   falar("acerto-1");                 // MP3 gravado (cala qualquer outra fala)
//   saudar();                          // "Oi! Que bom ter você aqui, Alice! A aventura já vai começar!"
//   parabenizar();                     // "Parabéns, Alice! Você mandou muito bem!"
//   falarNome("cor-pre", "cor-pos");   // "Boa corrida, Alice! Vamos tentar de novo?" (false sem nome no banco)
//   audioDoNome("Maria Clara")         // Promise<chave | null>: existe gravação para esse nome?

import { sons } from "./sons.js";

const cache = new Map();
let tocando = null;

function arquivo(chave) {
  if (!cache.has(chave)) {
    const a = new Audio(urlDe(chave));
    a.preload = "auto";
    cache.set(chave, a);
  }
  return cache.get(chave);
}
const urlDe = (chave) => new URL(`../../assets/voz/${chave}.mp3`, import.meta.url).href;

export function preCarregarFalas(chaves) {
  for (const c of chaves) arquivo(c);
}

export function falar(chave) {
  if (sons.mudo) return;
  pararSequencia();
  if (tocando) { tocando.pause(); tocando.currentTime = 0; }
  const a = arquivo(chave);
  a.currentTime = 0;
  a.volume = 1;
  tocando = a;
  a.play().catch(() => { /* navegador bloqueou antes do primeiro toque */ });
}

export const falarLetra = (letra) => falar(`letra-${letra}`);

// ------------------------------------------------------------------ Sequências emendadas (Web Audio)
let ctx = null;
const buffers = new Map(); // chave → Promise<AudioBuffer | null>
let fontesAtivas = [];
let geracao = 0;
function contexto() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
  if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
function bufferDe(chave) {
  if (!buffers.has(chave)) {
    buffers.set(chave, fetch(urlDe(chave)).then((r) => (r.ok ? r.arrayBuffer() : null)).then((ab) => (ab && contexto() ? ctx.decodeAudioData(ab) : null)).catch(() => null));
  }
  return buffers.get(chave);
}
function pararSequencia() {
  geracao++;
  for (const f of fontesAtivas) { try { f.stop(); } catch { /* já parou */ } }
  fontesAtivas = [];
}
// Fim do trecho sem o silêncio de cauda do MP3 (para a emenda não ter "buraco")
function fimSemSilencio(b) {
  const d = b.getChannelData(0), passo = Math.floor(b.sampleRate / 200);
  let i = d.length - 1;
  while (i > 0) { let m = 0; for (let k = 0; k < passo && i - k >= 0; k++) m = Math.max(m, Math.abs(d[i - k])); if (m > 0.012) break; i -= passo; }
  return Math.max(0.05, i / b.sampleRate + 0.03);
}
const mp3Tocando = () => tocando && !tocando.paused && !tocando.ended;

// Toca as chaves em sequência, emendadas. Espera um MP3 solto que estiver no ar acabar. Resolve false se faltar algum trecho.
export async function falarSequencia(chaves) {
  if (sons.mudo || !contexto()) return false;
  const minha = ++geracao;
  const lista = await Promise.all(chaves.map(bufferDe));
  if (lista.some((b) => !b) || minha !== geracao) return false;
  if (mp3Tocando()) await new Promise((r) => { tocando.addEventListener("ended", r, { once: true }); tocando.addEventListener("pause", r, { once: true }); });
  if (minha !== geracao) return false;
  let t = ctx.currentTime + 0.03;
  for (const b of lista) {
    const f = ctx.createBufferSource();
    f.buffer = b;
    f.connect(ctx.destination);
    const dur = fimSemSilencio(b);
    f.start(t, 0, dur);
    t += dur - 0.01; // leve sobreposição: emenda sem clique nem buraco
    fontesAtivas.push(f);
  }
  return true;
}

// ------------------------------------------------------------------ Banco de nomes
// "Maria Clara" → tenta "maria-clara" e depois "maria"; "Théo" → "theo"
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function chavesDoNome(nome) {
  const partes = semAcento(String(nome || "").trim()).replace(/[^a-z ]+/g, " ").split(/\s+/).filter(Boolean);
  if (!partes.length) return [];
  const c = [];
  if (partes.length > 1) c.push(`nomes/${partes.slice(0, 2).join("-")}`);
  c.push(`nomes/${partes[0]}`);
  return c;
}
const existe = new Map(); // chave → Promise<boolean>
function existeAudio(chave) {
  if (!existe.has(chave)) existe.set(chave, fetch(urlDe(chave), { method: "HEAD" }).then((r) => r.ok).catch(() => false));
  return existe.get(chave);
}
// Chave do MP3 do nome, se o banco tiver (baixa só esse arquivo); null se não tiver.
export async function audioDoNome(nome) {
  for (const c of chavesDoNome(nome)) if (await existeAudio(c)) return c;
  return null;
}

// ------------------------------------------------------------------ Frases da narradora com o nome da criança
const dadosCrianca = () => { try { return window.Familia?.crianca?.() || null; } catch { return null; } };
let ultima = null;
const sortear = (lista) => {
  let f = lista[Math.floor(Math.random() * lista.length)];
  if (lista.length > 1 && f === ultima) f = lista[(lista.indexOf(f) + 1) % lista.length];
  ultima = f;
  return f;
};
// Toque leve de fé e gratidão: as variações marcadas com `fe` entram no máximo 1 vez a cada 3 falas
let contagem = 0;
function sortearSuave(lista) {
  contagem++;
  const normais = lista.filter((f) => !f.fe), fe = lista.filter((f) => f.fe);
  return contagem % 3 === 0 && fe.length ? sortear(fe) : sortear(normais.length ? normais : lista);
}
const n = (pre, pos = null) => ({ pre, pos }), fe = (pre, pos = null) => ({ pre, pos, fe: true });

// Saudações: "pre" + nome + "pos" (pos muda com o gênero; sem gênero, neutra)
const SAUDACOES = [n("sau-pre-1", "sau-pos-1"), n("sau-pre-2", "sau-pos-2"), fe("sau-pre-3", "sau-pos-2")];
const SAUDACOES_GENERO = (g) => { const pos = g === "menina" ? "sau-pos-pronta" : "sau-pos-pronto"; return [n("sau-pre-1", pos), n("sau-pre-2", pos), fe("sau-pre-3", pos)]; };
const SAUDACOES_CURTAS = [n("sau-pre-1"), n("sau-pre-2"), fe("sau-pre-3")];
const PARABENS = [n("par-pre-1", "par-pos-1"), n("par-pre-2", "par-pos-2"), n("par-pre-3", "par-pos-1"), fe("par-pre-1", "par-pos-3"), fe("par-pre-2", "par-pos-4")];
const PARABENS_CURTOS = [n("par-pre-1"), n("par-pre-2"), fe("par-pre-1", "par-pos-3")];
const MP3_SAUDACAO = [{ pre: "saudacao-1" }, { pre: "saudacao-2" }, { pre: "saudacao-3", fe: true }];
const MP3_PARABENS = [{ pre: "parabens-1" }, { pre: "parabens-2" }, { pre: "parabens-3", fe: true }];

// Toca pre + nome + pos com o nome da criança cadastrada. Resolve false (sem tocar nada) se não houver
// cadastro ou se o nome não estiver no banco: o jogo então usa a fala neutra.
export async function falarNome(pre, pos = null) {
  const c = dadosCrianca();
  if (!c || sons.mudo) return false;
  const nome = await audioDoNome(c.nome);
  if (!nome) return false;
  return falarSequencia([pre, nome, pos].filter(Boolean));
}
const pequena = (c) => c?.idade != null && c.idade < 4; // crianças pequenas ouvem frases mais curtas
async function comOuSemNome(lista, neutras, gravada) {
  const f = sortearSuave(lista);
  if (await falarNome(f.pre, f.pos)) return true;
  if (gravada) falar(sortearSuave(neutras).pre);
  return false;
}
// Saudação ao abrir um jogo: com nome no banco, emendada; senão (gravada = true) o MP3 neutro da narradora.
export function saudar({ gravada = true } = {}) {
  const c = dadosCrianca();
  const lista = pequena(c) ? SAUDACOES_CURTAS : c?.genero === "menina" || c?.genero === "menino" ? SAUDACOES_GENERO(c.genero) : SAUDACOES;
  return comOuSemNome(lista, MP3_SAUDACAO, gravada);
}
// Parabéns ao vencer uma fase: idem. Se o jogo acabou de tocar um MP3 de vitória, a fala com nome espera ele acabar.
export function parabenizar({ gravada = true } = {}) {
  const c = dadosCrianca();
  return comOuSemNome(pequena(c) ? PARABENS_CURTOS : PARABENS, MP3_PARABENS, gravada);
}
