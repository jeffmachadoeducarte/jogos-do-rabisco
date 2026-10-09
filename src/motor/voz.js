// Voz do jogo: falas gravadas em assets/voz (geradas por ferramentas/gerar_vozes.py).
// Cada fala é um MP3 com nome fixo; dá para trocar por gravações de verdade mantendo os nomes.

import { sons } from "./sons.js";

const cache = new Map();
let tocando = null;

function arquivo(chave) {
  if (!cache.has(chave)) {
    const a = new Audio(new URL(`../../assets/voz/${chave}.mp3`, import.meta.url).href);
    a.preload = "auto";
    cache.set(chave, a);
  }
  return cache.get(chave);
}

export function preCarregarFalas(chaves) {
  for (const c of chaves) arquivo(c);
}

export function falar(chave) {
  if (sons.mudo) return;
  if (tocando) { tocando.pause(); tocando.currentTime = 0; }
  const a = arquivo(chave);
  a.currentTime = 0;
  a.volume = 1;
  tocando = a;
  a.play().catch(() => { /* navegador bloqueou antes do primeiro toque */ });
}

export const falarLetra = (letra) => falar(`letra-${letra}`);
