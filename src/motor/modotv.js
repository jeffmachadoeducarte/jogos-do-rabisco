// Modo TV: para quando o aparelho está espelhado na TV (AirPlay, Chromecast, cabo HDMI...).
// A interface fica "limpa para TV": HUD mínimo e maior, botões de toque viram zonas quase invisíveis
// (metade esquerda = mover, direita = ação/pulo). Lembra a escolha no aparelho (localStorage "rabisco.modoTV").
//
// Páginas web não conseguem saber com certeza se a tela está espelhada (a Apple não expõe isso). Então:
//   1. a ⚙️ (src/motor/engrenagem.js: portal, casca, pausa e Kart) → "Jogar na TV" → "Jogar aqui mesmo" liga; "Voltar ao normal" desliga;
//   2. detecção oportunista, onde a API existir: screen.isExtended + evento "change" (Chrome/Android),
//      Presentation API (há uma tela de apresentação disponível) e mudança brusca de tamanho/densidade da tela.
//      Qualquer sinal só SUGERE ("Parece que você conectou numa TV — ativar o Modo TV?"). No iPhone não há sinal:
//      fica o botão. Nada aqui quebra se a API não existir.
//
//   import { ModoTV, botaoTV } from "../../src/motor/modotv.js";
//   ModoTV.ativo; ModoTV.ligar(); ModoTV.desligar(); ModoTV.alternar(); ModoTV.aoMudar(cb);
//   document.body.append(botaoTV({ classe: "meu-botao" }));

import { SALA_JOGOS } from "../config.js";
import { emModoTV } from "./salatv.js";

const CHAVE = "rabisco.modoTV";
const CHAVE_SUGERIU = "rabisco.modoTV.sugeriu";
const ler = () => { try { return localStorage.getItem(CHAVE) === "1"; } catch { return false; } };
// Jogo aberto pela página tv/ (TV como tela, src/motor/salatv.js): Modo TV ligado nesta página, sem gravar a escolha
let ativo = emModoTV || ler();
const ouvintes = new Set();
const botoes = new Set();

// Regras de "TV": valem em todos os jogos que carregam este módulo (via pausa.js) e no portal
const CSS = `
.tv-toast { position: fixed; z-index: 95; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px; max-width: min(640px, calc(100vw - 32px)); font: 700 16px "Baloo 2", system-ui, sans-serif; color: #151515;
  background: #fff; border: 4px solid #151515; border-radius: 22px; box-shadow: 0 6px 0 #151515; padding: 8px 12px 8px 14px; }
.tv-toast .ic { font-size: 30px; }
.tv-toast b { display: block; font-size: 18px; }
.tv-toast button { font: 800 16px "Baloo 2", system-ui, sans-serif; border: 3px solid #151515; border-radius: 999px; padding: 2px 14px 4px; cursor: pointer; background: #fff; color: #151515; white-space: nowrap; }
.tv-toast button.sim { background: #ec2e8c; color: #fff; }
.tv-toast .botoes { display: flex; gap: 6px; flex-wrap: wrap; }
html.modo-tv .casca-dica, html.modo-tv .so-teclado, html.modo-tv #dica, html.modo-tv .casca-topo .remap-botao { display: none !important; }
html.modo-tv .casca-placar { font-size: clamp(26px, 3.8vw, 44px); min-height: 64px; }
html.modo-tv .casca-topo .casca-redondo, html.modo-tv .pausa-botao { opacity: 0.35; }
html.modo-tv .casca-aviso { font-size: clamp(34px, 6vw, 72px) !important; }
/* Kart: sem minimapa; posição e volta maiores; botões ◀ ▶ viram as duas metades da tela, quase invisíveis */
html.modo-tv #mapa, html.modo-tv .remap-kart { display: none !important; }
html.modo-tv #posicao { font-size: clamp(80px, 13vw, 150px); }
html.modo-tv #volta { font-size: clamp(30px, 4.4vw, 48px); }
html.modo-tv body.touch .toque { inset: 0; padding: 0; }
html.modo-tv .toque button { width: 50%; height: 100%; border-radius: 0; border: none; background: rgba(255, 255, 255, 0.04); font-size: 0; box-shadow: none; }
html.modo-tv .toque button.apertado { background: rgba(255, 255, 255, 0.1); transform: none; }
/* Cidade (e jogos 3D de andar): só os selos e a bússola; joystick sem dica; pulo vira a zona do canto direito */
html.modo-tv .mapa-cidade, html.modo-tv .hud-cidade ul, html.modo-tv .jd-dica { display: none !important; }
html.modo-tv .selos-cidade { font-size: 26px; }
html.modo-tv .bussola-cidade { transform: translateX(-50%) scale(1.35); transform-origin: top center; }
html.modo-tv .balao-cidade { font-size: 22px; }
html.modo-tv .jd-pulo { right: 0; bottom: 0; width: 50%; height: 48%; border-radius: 0; border: none; background: rgba(255, 255, 255, 0.04); font-size: 0; }
html.modo-tv .jd-pulo.apertado { background: rgba(255, 255, 255, 0.1); transform: none; }
html.modo-tv .acao-cidade { opacity: 0.55; transform: scale(1.25); transform-origin: bottom right; }
.tv-botao[aria-pressed="true"] { background: #ffcc1f !important; }
/* TV como tela (página tv/): ninguém toca na TV. Some tudo que é de toque; o ⏸ do celular ou o Start do controle pausam */
html.sala-tv body .toque, html.sala-tv .jd-camada, html.sala-tv .acao-cidade, html.sala-tv .pausa-botao, html.sala-tv #som,
html.sala-tv .casca-topo .casca-redondo, html.sala-tv .so-toque, html.sala-tv .gire-celular { display: none !important; }
html.sala-tv .jog-tv-nota { font-size: clamp(18px, 2.4vw, 26px); }
html.sala-tv .controle-foco { outline-width: 8px !important; }
`;
let cssPronto = false;
function garantirCss() {
  if (cssPronto) return;
  cssPronto = true;
  const s = document.createElement("style");
  s.dataset.modotv = "";
  s.textContent = CSS;
  document.head.append(s);
}

function aplicar() {
  document.documentElement.classList.toggle("modo-tv", ativo);
  for (const b of botoes) desenharBotao(b);
  for (const cb of ouvintes) { try { cb(ativo); } catch { /* ouvinte com erro */ } }
}
function gravar() { if (emModoTV) return; try { localStorage.setItem(CHAVE, ativo ? "1" : "0"); } catch { /* modo privado */ } }

let toastEl = null;
function toast(html, botoesToast = [], ms = 5200) {
  garantirCss();
  toastEl?.remove();
  const t = document.createElement("div");
  t.className = "tv-toast";
  t.setAttribute("role", "status");
  t.innerHTML = `<span class="ic" aria-hidden="true">📺</span><span class="txt">${html}</span>`;
  if (botoesToast.length) {
    const g = document.createElement("span");
    g.className = "botoes";
    for (const { texto, classe = "", acao } of botoesToast) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = texto; if (classe) b.className = classe;
      b.addEventListener("click", (e) => { e.stopPropagation(); t.remove(); acao?.(); });
      g.append(b);
    }
    t.append(g);
  }
  document.body.append(t);
  toastEl = t;
  if (ms) setTimeout(() => t.remove(), ms);
  return t;
}

function ligar({ avisar = true } = {}) {
  ativo = true; gravar(); aplicar();
  // "Modo TV ligado!" ainda não está gravada (ferramentas/gerar_vozes.py: tv-ligado): por enquanto, balão de texto
  if (avisar) toast(`<b>Modo TV ligado!</b>${SALA_JOGOS ? "Sua TV tem navegador? Abra o site nela e use o celular de controle!" : "Sua TV tem navegador? Em breve: jogar na TV com o celular de controle."}`);
}
function desligar({ avisar = true } = {}) {
  ativo = false; gravar(); aplicar();
  if (avisar) toast("<b>Modo TV desligado.</b>", [], 2200);
}
const alternar = () => (ativo ? desligar() : ligar());

function desenharBotao(b) {
  b.setAttribute("aria-pressed", String(ativo));
  b.setAttribute("aria-label", ativo ? "Modo TV ligado. Desligar" : "Ligar o Modo TV");
  b.title = ativo ? "Modo TV: ligado" : "Modo TV";
  if (b.dataset.rotulo) b.textContent = ativo ? "📺 Modo TV: ligado" : "📺 Modo TV";
}
export function botaoTV({ classe = "", rotulo = false } = {}) {
  garantirCss();
  const b = document.createElement("button");
  b.type = "button";
  b.className = `tv-botao ${classe}`.trim();
  b.textContent = "📺";
  if (rotulo) b.dataset.rotulo = "1";
  b.addEventListener("click", (e) => { e.stopPropagation(); alternar(); });
  botoes.add(b);
  desenharBotao(b);
  return b;
}

// ------------------------------------------------------------------ Detecção oportunista (só sugere)
let sugeriu = (() => { try { return sessionStorage.getItem(CHAVE_SUGERIU) === "1"; } catch { return false; } })();
const sinais = [];
function sugerir(motivo) {
  sinais.push(motivo);
  if (ativo || sugeriu) return;
  sugeriu = true;
  try { sessionStorage.setItem(CHAVE_SUGERIU, "1"); } catch { /* ok */ }
  const texto = motivo === "apresentacao" ? "<b>Tem uma TV por perto?</b>Parece que você pode jogar numa TV — ativar o Modo TV?" : "<b>Parece que você conectou numa TV</b>Ativar o Modo TV?";
  const t = toast(texto, [{ texto: "Ativar", classe: "sim", acao: () => ligar() }, { texto: "Agora não" }], 12000);
  t.classList.add("tv-sugestao");
  setTimeout(() => t.querySelector("button.sim")?.focus({ preventScroll: true }), 50);
}
function detectar() {
  // 1. Window Management: tela estendida (Chrome/Android com segunda tela)
  try {
    if (screen.isExtended) sugerir("isExtended");
    screen.addEventListener?.("change", () => { if (screen.isExtended) sugerir("isExtended"); });
  } catch { /* sem a API */ }
  // 2. Presentation API: existe uma tela de apresentação (cast) disponível
  try {
    if ("PresentationRequest" in window) {
      const req = new PresentationRequest([location.href]);
      req.getAvailability?.().then((d) => { const f = () => { if (d.value) sugerir("apresentacao"); }; d.addEventListener?.("change", f); f(); }).catch(() => {});
    }
  } catch { /* sem a API */ }
  // 3. mudança brusca de tamanho ou de densidade da tela, sem ser só "girar o celular", para algo com cara de TV (16:9 grande)
  let w = innerWidth, hh = innerHeight, dpr = devicePixelRatio || 1;
  addEventListener("resize", () => {
    const a0 = w / hh, a1 = innerWidth / innerHeight;
    const girou = (a0 > 1) !== (a1 > 1);
    const salto = Math.abs(innerWidth * innerHeight - w * hh) / (w * hh);
    const dprMudou = Math.abs((devicePixelRatio || 1) - dpr) > 0.25;
    const cara16x9 = Math.abs(a1 - 16 / 9) < 0.08;
    if (!girou && cara16x9 && (salto > 0.6 || dprMudou) && innerWidth >= 960) sugerir("tamanho");
    w = innerWidth; hh = innerHeight; dpr = devicePixelRatio || 1;
  });
}

export const ModoTV = {
  get ativo() { return ativo; }, get sinais() { return [...sinais]; },
  ligar, desligar, alternar, botao: botaoTV, toast,
  aoMudar(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); },
};
window.ModoTV = ModoTV;

garantirCss();
if (emModoTV) document.documentElement.classList.add("sala-tv");
if (document.documentElement) aplicar();
if (!emModoTV) detectar();
export default ModoTV;
