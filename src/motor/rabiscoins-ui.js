// Rabiscoins na tela: o ícone da moeda (desenho próprio: moeda dourada com um lapisinho do Rabisco), o contador discreto
// do HUD, a animação curta de ganho (moedinhas voam até o contador, que conta para cima) e os sons 8-bit originais
// (Web Audio, gerados na hora pela mesma saída de src/motor/sons.js: o mudo da casca vale aqui também).
//
//   const c = criarContador(hud);   c.ganhou(20);   c.atualizar();   c.el
//   c.ganhou(15, { rotulo: "⭐ Missão do dia", alvo })   (rotulo: texto antes do "+15"; alvo: até onde o número conta)
//   somMoedas(qtd) · somCompra() · somFalta() · tocar8bit([[hz, início, duração, tipo, volume]]) · ICONE_MOEDA (svg em texto)

import { sons } from "./sons.js";
import { saldo, aoMudar } from "./rabiscoins.js";

export const ICONE_MOEDA = `<svg class="rbc-moeda" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
<circle cx="16" cy="16" r="14" fill="#ffc61f" stroke="#151515" stroke-width="3"/>
<circle cx="16" cy="16" r="9.6" fill="#ffd95c" stroke="#e8920c" stroke-width="2"/>
<g transform="rotate(-40 16 16)"><rect x="13.2" y="7.4" width="5.6" height="11.6" rx="0.8" fill="#00b5f0" stroke="#151515" stroke-width="1.5"/>
<rect x="13.2" y="6" width="5.6" height="2.6" rx="0.8" fill="#ec2e8c" stroke="#151515" stroke-width="1.5"/>
<path d="M13.2 19 L16 24.6 L18.8 19 Z" fill="#ffe5cf" stroke="#151515" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M15.1 22.8 L16 24.6 L16.9 22.8 Z" fill="#151515"/></g>
<path d="M7.6 12.2 A9.2 9.2 0 0 1 12.4 7.2" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/>
</svg>`;

// ---------- sons (composição própria: arpejos curtos de pulso + triângulo)
function tocar(notas) {
  let s;
  try { s = sons.saida(); } catch { return; }
  const { ctx, mestre } = s;
  if (!ctx || !mestre) return;
  const t0 = ctx.currentTime + 0.01;
  for (const [hz, ini, dur, tipo = "square", vol = 0.06] of notas) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(hz, t0 + ini);
    g.gain.setValueAtTime(0.0001, t0 + ini);
    g.gain.linearRampToValueAtTime(vol, t0 + ini + 0.008);
    g.gain.setValueAtTime(vol, t0 + ini + Math.max(0.01, dur - 0.05));
    g.gain.linearRampToValueAtTime(0.0001, t0 + ini + dur);
    o.connect(g).connect(mestre);
    o.start(t0 + ini); o.stop(t0 + ini + dur + 0.02);
  }
}
export { tocar as tocar8bit };
const hz = (semi) => 440 * 2 ** (semi / 12); // semitons a partir do Lá 4
// ganho: "plim-plim" subindo (D6 F#6 A6), com mais um degrau quando o ganho é grande
export function somMoedas(qtd = 5) {
  const n = [hz(17), hz(21), hz(24)];
  const notas = n.map((f, i) => [f, i * 0.07, 0.09, "square", 0.05]);
  notas.push([hz(29), 0.21, 0.32, "square", 0.045], [hz(5), 0, 0.28, "triangle", 0.12]);
  if (qtd >= 15) notas.push([hz(24), 0.36, 0.08, "square", 0.04], [hz(29), 0.43, 0.08, "square", 0.04], [hz(33), 0.5, 0.4, "square", 0.04]);
  tocar(notas);
}
// compra: fanfarrinha alegre (sol-dó-mi-sol e o acorde), sem parecer caixa registradora
export function somCompra() {
  const notas = [hz(-2), hz(3), hz(7), hz(10)].map((f, i) => [f * 2, i * 0.08, 0.1, "square", 0.05]);
  notas.push([hz(15), 0.34, 0.45, "square", 0.045], [hz(19), 0.34, 0.45, "square", 0.03], [hz(-9), 0.34, 0.45, "triangle", 0.14]);
  tocar(notas);
}
// ainda falta: dois toques suaves descendo (nada de "errou")
export function somFalta() { tocar([[hz(12), 0, 0.12, "triangle", 0.12], [hz(7), 0.13, 0.22, "triangle", 0.12]]); }

// ---------- estilo (vai junto com o módulo: qualquer jogo do portal pode usar o contador)
let estiloPronto = false;
function estilo() {
  if (estiloPronto || typeof document === "undefined") return;
  estiloPronto = true;
  const s = document.createElement("style");
  s.dataset.rabiscoins = "";
  s.textContent = `
.rbc-contador { display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; vertical-align: top; padding: 0 12px 0 4px; height: 34px; background: rgba(255,255,255,0.92); border: 4px solid #151515; border-radius: 999px; box-shadow: 0 4px 0 #151515; font: 800 18px 'Baloo 2', sans-serif; color: #151515; line-height: 1; }
.rbc-contador .rbc-moeda { width: 26px; height: 26px; flex: none; }
.rbc-contador b { min-width: 1.4em; text-align: right; font-variant-numeric: tabular-nums; }
.rbc-contador.pulo { animation: rbc-pulo 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes rbc-pulo { 0% { transform: scale(1); } 35% { transform: scale(1.25); background: #fff4c2; } 100% { transform: scale(1); } }
.rbc-mais { position: absolute; z-index: 30; pointer-events: none; display: flex; align-items: center; gap: 4px; font: 800 30px 'Baloo 2', sans-serif; color: #fff; -webkit-text-stroke: 6px #151515; paint-order: stroke fill; text-shadow: 0 4px 0 #151515; }
.rbc-mais .rbc-moeda { width: 34px; height: 34px; }
.rbc-mais .rbc-rotulo { font-size: 22px; -webkit-text-stroke-width: 5px; margin-right: 4px; }
.rbc-voa { position: absolute; z-index: 30; pointer-events: none; width: 30px; height: 30px; }
.rbc-voa .rbc-moeda { width: 100%; height: 100%; }
@media (max-height: 520px) { .rbc-contador { height: 26px; font-size: 14px; border-width: 3px; padding-right: 9px; } .rbc-contador .rbc-moeda { width: 20px; height: 20px; } .rbc-mais { font-size: 24px; } }
html.modo-tv .rbc-contador { transform: scale(1.2); transform-origin: left center; margin-left: 14px; }
`;
  document.head.append(s);
}

// contador do HUD: mostra o saldo e anima quando ele sobe. `camada` = onde as moedinhas voam (o palco do jogo)
export function criarContador(onde, { camada = onde } = {}) {
  estilo();
  const el = document.createElement("div");
  el.className = "rbc-contador";
  el.setAttribute("role", "status");
  el.innerHTML = `${ICONE_MOEDA}<b>0</b>`;
  onde.append(el);
  const num = el.querySelector("b");
  let mostrado = saldo(), anim = null;
  const pintar = (v) => { num.textContent = String(v); el.setAttribute("aria-label", `Rabiscoins: ${v}`); el.title = `Rabiscoins: ${v}`; };
  pintar(mostrado);
  const contarAte = (alvo) => {
    cancelAnimationFrame(anim);
    const de = mostrado, t0 = performance.now(), dur = Math.min(900, 250 + Math.abs(alvo - de) * 25);
    const passo = (t) => { const k = Math.min(1, (t - t0) / dur); mostrado = Math.round(de + (alvo - de) * k); pintar(mostrado); if (k < 1) anim = requestAnimationFrame(passo); };
    anim = requestAnimationFrame(passo);
  };
  const parar = aoMudar((d, m) => { if (m?.tipo !== "ganhou") { cancelAnimationFrame(anim); mostrado = d.saldo; pintar(mostrado); } });
  const reduz = () => matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const api = {
    el,
    atualizar() { cancelAnimationFrame(anim); mostrado = saldo(); pintar(mostrado); },
    // ganho com festa: "+20" sobe do meio da tela, as moedinhas voam até o contador e o número conta para cima
    ganhou(qtd, { som = true, rotulo = "", alvo: ate = null } = {}) {
      if (som) somMoedas(qtd);
      const alvo = ate ?? saldo();
      const caixa = camada.getBoundingClientRect(), r = el.getBoundingClientRect();
      const cx = caixa.width / 2, cy = caixa.height * 0.42, tx = r.left - caixa.left + 18, ty = r.top - caixa.top + 17;
      const mais = document.createElement("div");
      mais.className = "rbc-mais"; mais.innerHTML = `${rotulo ? `<span class="rbc-rotulo">${rotulo}</span>` : ""}+${qtd} ${ICONE_MOEDA}`;
      mais.style.left = `${cx}px`; mais.style.top = `${cy}px`;
      camada.append(mais);
      // o contador sobe quando as moedinhas chegam (pelo relógio, não pelo fim da animação: aparelho lento não trava o número)
      const fim = () => { el.classList.remove("pulo"); void el.offsetWidth; el.classList.add("pulo"); contarAte(alvo); };
      setTimeout(() => mais.remove(), 1600);
      if (reduz() || !mais.animate) { mais.style.transform = "translate(-50%, -50%)"; fim(); return; }
      setTimeout(fim, 1050);
      mais.animate([{ transform: "translate(-50%, -30%) scale(0.6)", opacity: 0 }, { transform: "translate(-50%, -60%) scale(1.15)", opacity: 1, offset: 0.25 }, { transform: "translate(-50%, -90%) scale(1)", opacity: 1, offset: 0.75 }, { transform: "translate(-50%, -120%) scale(0.9)", opacity: 0 }], { duration: 1400, easing: "ease-out", fill: "forwards" });
      const n = Math.min(7, 2 + Math.ceil(qtd / 6));
      for (let i = 0; i < n; i++) {
        const m = document.createElement("div");
        m.className = "rbc-voa"; m.innerHTML = ICONE_MOEDA;
        m.style.left = `${cx - 15}px`; m.style.top = `${cy - 15}px`;
        camada.append(m);
        const dx = tx - cx, dy = ty - cy, sx = (i - (n - 1) / 2) * 26, atraso = 220 + i * 70;
        m.animate([{ transform: "translate(0, 0) scale(0.4)", opacity: 0 }, { transform: `translate(${sx}px, -50px) scale(1)`, opacity: 1, offset: 0.3 }, { transform: `translate(${dx}px, ${dy}px) scale(0.6)`, opacity: 0 }], { duration: 760, delay: atraso, easing: "cubic-bezier(0.5, 0, 0.6, 1)", fill: "both" });
        setTimeout(() => m.remove(), atraso + 800);
      }
    },
    destruir() { parar(); cancelAnimationFrame(anim); el.remove(); },
  };
  return api;
}
