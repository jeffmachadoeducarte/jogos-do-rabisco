// ⚙️ Configurações: um ponto só, reaproveitado pelo portal, pela casca (todos os jogos dela, inclusive Rabiscópolis e
// Rabiscolândia), pela pausa e pelo Kart. Dentro, botões grandes e linguagem de pai/criança:
//   🔊 Som: ligado / desligado (lembrado no aparelho, localStorage "rabisco.som"; atalho M no teclado onde o jogo não usa o M)
//   📺 Jogar na TV, pensando no aparelho espelhado (AirPlay/Chromecast) ou no cabo HDMI, com 3 jeitos:
//      👆 "Jogar aqui mesmo": o aparelho continua sendo o controle por toque (1 jogador; 2 com um controle 🎮 a mais);
//      📱 "Mais um controle pelo celular": QR para o jogador 2, o aparelho segue no toque para o jogador 1;
//      🎮 "Usar só controles": o aparelho vira só a tela (como a página tv/): 2 controles com ou sem fio e/ou celulares
//         pelo QR; toque e botões da tela somem. É a mesma página/jogo, recarregada com ?tv=1 (src/motor/salatv.js).
//   ↩️ "Voltar ao normal": desfaz qualquer um dos três.
//   Extras do jogo (ex.: "🎮 Trocar botões" do src/motor/remapear.js) entram com Engrenagem.extra({ texto, acao }).
//
//   import { Engrenagem, botaoEngrenagem } from "./engrenagem.js";
//   topo.append(botaoEngrenagem({ classe: "casca-redondo", atalhoM: true }));
//   Engrenagem.abrir(); Engrenagem.abrir("tv");
//
// O modo do aparelho (aqui / mais1) fica nesta aba (sessionStorage "rabisco.telaTV"): os jogos seguintes já abrem nele
// (src/motor/jogadores.js lê com telaLocal()). O layout limpo para TV é o Modo TV de src/motor/modotv.js.

import { sons } from "./sons.js";
import { ModoTV } from "./modotv.js";
import { emModoTV, urlTV } from "./salatv.js";
import { definirModal, focar } from "./controle.js";
import { pausaAtual } from "./pausa.js";
import { qrSvg } from "../../vendor/qr.js";
import { SALA_JOGOS } from "../config.js";

const CHAVE_SOM = "rabisco.som";
const CHAVE_TELA = "rabisco.telaTV";
const RAIZ = new URL("../..", import.meta.url).href.replace(/\/$/, "");

// ------------------------------------------------------------------ Som (lembrado no aparelho)
function somGuardadoDesligado() { try { return localStorage.getItem(CHAVE_SOM) === "0"; } catch { return false; } }
if (somGuardadoDesligado() && !sons.mudo) sons.alternarMudo();
export function alternarSom() {
  const mudo = sons.alternarMudo();
  try { localStorage.setItem(CHAVE_SOM, mudo ? "0" : "1"); } catch { /* modo privado: vale só agora */ }
  desenharTudo();
  return mudo;
}

// ------------------------------------------------------------------ Modo do aparelho na TV
export function telaLocal() { try { const v = sessionStorage.getItem(CHAVE_TELA); return v === "aqui" || v === "mais1" ? v : null; } catch { return null; } }
function definirTelaLocal(v) { try { v ? sessionStorage.setItem(CHAVE_TELA, v) : sessionStorage.removeItem(CHAVE_TELA); } catch { /* */ } }
const naPaginaTV = () => /\/tv\/?$/.test(location.pathname);
const noJogo = () => /\/jogos\/[^/]+\//.test(location.pathname);
const jogadores = () => window.Jogadores || null; // só existe nos jogos (src/motor/jogadores.js)
// algum "Jogar na TV" ligado neste aparelho?
const naTV = () => emModoTV || naPaginaTV() || Boolean(telaLocal()) || ModoTV.ativo;

// leva esta página para "só controles" (TV como tela): guarda a TV desta aba e recarrega com ?tv=1
function irParaSoControles() {
  try {
    const t = JSON.parse(sessionStorage.getItem("rabisco.tv") || "null");
    if (!t?.vagas) sessionStorage.setItem("rabisco.tv", JSON.stringify({ codigo: null, token: null, vagas: [{ tipo: null }, { tipo: null }], jogadores: null }));
  } catch { /* sem armazenamento: a página tv/ abre do zero */ }
  definirTelaLocal(null);
  if (!noJogo()) { location.href = urlTV(); return; }
  const u = new URL(location.href);
  u.searchParams.set("tv", "1");
  for (const k of ["jogar", "nivel", "auto", "jogadores"]) u.searchParams.delete(k);
  location.href = u.href;
}
function voltarAoNormal() {
  definirTelaLocal(null);
  if (ModoTV.ativo && !emModoTV) ModoTV.desligar({ avisar: false });
  try { localStorage.setItem("rabisco.modoTV", "0"); sessionStorage.removeItem("rabisco.tv"); } catch { /* */ }
  if (emModoTV) { const u = new URL(location.href); u.searchParams.delete("tv"); location.href = u.href; return true; }
  if (naPaginaTV()) { location.href = `${RAIZ}/`; return true; }
  const J = jogadores();
  if (J && !J.tv && J.modo === 2) J.definirModo(1);
  return false;
}
// "aqui" / "mais1": o aparelho continua no toque; se a página está como TV (só controles), volta a ser normal primeiro
function jogarNoAparelho(qual) {
  definirTelaLocal(qual);
  if (emModoTV || naPaginaTV()) {
    try { sessionStorage.removeItem("rabisco.tv"); localStorage.setItem("rabisco.modoTV", "1"); } catch { /* */ }
    if (emModoTV) { const u = new URL(location.href); u.searchParams.delete("tv"); location.href = u.href; }
    else location.href = `${RAIZ}/`;
    return true;
  }
  if (!ModoTV.ativo) ModoTV.ligar({ avisar: false });
  const J = jogadores();
  if (J) J.definirModo(qual === "mais1" ? 2 : J.modo);
  return false;
}

// ------------------------------------------------------------------ Estilo
const CSS = `
.eng-botao { cursor: pointer; }
.eng-tela { position: fixed; inset: 0; z-index: 110; display: flex; align-items: center; justify-content: center; padding: 12px;
  background: rgba(10, 42, 74, 0.6); font-family: "Baloo 2", system-ui, sans-serif; color: #151515; }
.eng-tela[hidden] { display: none; }
.eng-cartao { position: relative; background: #fff; border: 5px solid #151515; border-radius: 30px; box-shadow: 8px 10px 0 #151515;
  padding: 16px 20px 18px; width: min(680px, 100%); max-height: 100%; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
.eng-cartao h2 { margin: 0 44px 0 0; font-size: clamp(24px, 4vw, 34px); line-height: 1.1; }
.eng-cartao p { margin: 0; font-weight: 700; font-size: clamp(15px, 2vw, 18px); }
.eng-fechar { position: absolute; top: 10px; right: 10px; width: 46px; height: 46px; border-radius: 50%; font-size: 22px; line-height: 1; padding: 0;
  background: #fff; color: #151515; border: 4px solid #151515; box-shadow: 0 4px 0 #151515; cursor: pointer; }
.eng-grande { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; cursor: pointer; color: #151515;
  font: 800 clamp(20px, 3vw, 28px) "Baloo 2", system-ui, sans-serif; background: #fff; border: 4px solid #151515; border-radius: 22px;
  box-shadow: 0 5px 0 #151515; padding: 8px 16px 10px; min-height: 64px; }
.eng-grande:active { transform: translateY(3px); box-shadow: 0 2px 0 #151515; }
.eng-grande .ic { font-size: 1.5em; line-height: 1; flex: none; }
.eng-grande small { display: block; font-size: 0.6em; font-weight: 700; color: #444; line-height: 1.2; }
.eng-grande.ligado { background: #ffcc1f; }
.eng-grande.ciano { background: #00b5f0; color: #fff; } .eng-grande.ciano small { color: #eafaff; }
.eng-grande.rosa { background: #ec2e8c; color: #fff; } .eng-grande.rosa small { color: #ffe6f2; }
.eng-grande.laranja { background: #ff7a00; color: #fff; } .eng-grande.laranja small { color: #fff1e3; }
.eng-grande.escolhido { outline: 5px dashed #151515; outline-offset: 3px; }
.eng-qr { display: flex; align-items: center; gap: 14px; background: #fff8d6; border: 4px solid #151515; border-radius: 20px; padding: 10px 14px; }
.eng-qr .qr-img { width: 150px; height: 150px; flex: none; border: 3px solid #151515; border-radius: 12px; overflow: hidden; background: #fff; }
.eng-qr .qr-img svg { display: block; width: 100%; height: 100%; }
.eng-qr .codigo { font: 900 44px "Baloo 2", system-ui, sans-serif; letter-spacing: 6px; line-height: 1; }
.eng-qr .ok { color: #0a8a3a; font-weight: 800; font-size: 22px; }
.eng-tela .controle-foco { outline: 6px solid #ffcc1f !important; outline-offset: 3px; }
.eng-tela .eng-grande.ligado.controle-foco { outline-color: #ec2e8c !important; }
@media (max-height: 560px) { .eng-grande { min-height: 50px; padding: 4px 12px 6px; } .eng-cartao { gap: 8px; padding: 10px 14px 12px; } .eng-qr .qr-img { width: 110px; height: 110px; } }
`;
let cssPronto = false;
function garantirCss() {
  if (cssPronto) return;
  cssPronto = true;
  const s = document.createElement("style");
  s.dataset.engrenagem = "";
  s.textContent = CSS;
  document.head.append(s);
}
const h = (tag, props = {}, filhos = []) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "texto") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos) if (f) e.append(f);
  return e;
};
function botaoGrande(ic, titulo, sub, classe, acao, dados = {}) {
  const b = h("button", { type: "button", class: `eng-grande ${classe || ""}`.trim(), ...dados },
    [h("span", { class: "ic", "aria-hidden": "true", texto: ic }), h("span", { html: `${titulo}${sub ? `<small>${sub}</small>` : ""}` })]);
  b.addEventListener("click", (e) => { e.stopPropagation(); acao(); });
  return b;
}

// ------------------------------------------------------------------ Painel
let tela = null, cartao = null, vista = "principal", pausouAqui = false, desligarOuvinte = null;
const extras = [];
function montar() {
  garantirCss();
  if (tela) return;
  tela = h("div", { class: "eng-tela", role: "dialog", "aria-modal": "true", "aria-label": "Configurações", hidden: true });
  cartao = h("div", { class: "eng-cartao" });
  tela.append(cartao);
  tela.addEventListener("click", (e) => { if (e.target === tela) fechar(); });
  document.body.append(tela);
}
function desenhar() {
  if (!cartao) return;
  desligarOuvinte?.(); desligarOuvinte = null;
  const fecharB = h("button", { type: "button", class: "eng-fechar", "aria-label": "Fechar", texto: "✕", onclick: () => fechar() });
  const filhos = [];
  if (vista === "principal") {
    filhos.push(h("h2", { texto: "⚙️ Configurações" }));
    const mudo = sons.mudo;
    filhos.push(botaoGrande(mudo ? "🔇" : "🔊", mudo ? "Som: DESLIGADO" : "Som: LIGADO", mudo ? "Toque para ligar o som" : "Toque para desligar o som", mudo ? "" : "ligado", () => alternarSom(), { "data-eng": "som", "aria-pressed": String(!mudo) }));
    const atual = emModoTV ? "Agora: este aparelho é só a tela" : telaLocal() === "mais1" ? "Agora: aqui + celular de controle" : telaLocal() === "aqui" || ModoTV.ativo ? "Agora: jogando aqui, na TV" : "Celular ou tablet espelhado ou no cabo";
    filhos.push(botaoGrande("📺", "Jogar na TV", atual, "ciano", () => { vista = "tv"; desenhar(); }, { "data-eng": "tv" }));
    for (const x of extras) if (x.mostrar?.() !== false) filhos.push(botaoGrande(x.ic || "🎮", x.texto, x.sub || "", "", () => { fechar(); x.acao(); }, { "data-eng": x.id || "extra" }));
    if (naTV()) filhos.push(botaoGrande("↩️", "Voltar ao normal", "Sair do jeito TV", "", () => { if (!voltarAoNormal()) { vista = "principal"; desenhar(); } }, { "data-eng": "normal" }));
  } else if (vista === "tv") {
    filhos.push(h("h2", { texto: "📺 Jogar na TV" }));
    filhos.push(h("p", { texto: "Ligou o celular ou tablet na TV (espelhando ou no cabo)? Escolha como vão jogar:" }));
    const t = telaLocal();
    filhos.push(botaoGrande("👆", "Jogar aqui mesmo", "Vocês olham a TV e jogam tocando neste aparelho. Dá para ligar um controle 🎮 para o 2º jogador.", `rosa${t === "aqui" ? " escolhido" : ""}`, () => escolher("aqui"), { "data-eng": "aqui" }));
    filhos.push(botaoGrande("📱", "Mais um controle pelo celular", "Você joga no toque e o 2º jogador entra lendo o QR com o celular.", `ciano${t === "mais1" ? " escolhido" : ""}`, () => escolher("mais1"), { "data-eng": "mais1" }));
    filhos.push(botaoGrande("🎮", "Usar só controles", "Este aparelho vira só a tela. Jogam com controles 🎮 (com ou sem fio) ou celulares 📱.", `laranja${emModoTV ? " escolhido" : ""}`, () => escolher("controles"), { "data-eng": "controles" }));
    if (naTV()) filhos.push(botaoGrande("↩️", "Voltar ao normal", "", "", () => { if (!voltarAoNormal()) { vista = "principal"; desenhar(); } }, { "data-eng": "normal" }));
    filhos.push(botaoGrande("←", "Voltar", "", "", () => { vista = "principal"; desenhar(); }, { "data-eng": "voltar" }));
  } else if (vista === "pronto-aqui") {
    filhos.push(h("h2", { texto: "👆 Pronto! Jogue aqui mesmo" }));
    filhos.push(h("p", { texto: "Olhem a TV e joguem tocando neste aparelho. Os botões da tela ficam quase invisíveis: a metade esquerda e a direita da tela continuam funcionando." }));
    filhos.push(h("p", { texto: "Para um 2º jogador: ligue um controle 🎮 (Bluetooth ou USB) e aperte um botão nele." }));
    filhos.push(botaoGrande("✓", "Entendi, vamos jogar!", "", "rosa", () => fechar(), { "data-eng": "ok" }));
  } else if (vista === "pronto-mais1") {
    filhos.push(h("h2", { texto: "📱 Jogador 2 pelo celular" }));
    const caixa = h("div", { class: "eng-qr", "aria-live": "polite" });
    filhos.push(caixa);
    const J = jogadores();
    const desenharQr = () => {
      const s = J?.sala, conectado = J?.celular?.conectado || J?.j2?.entrada === "controle";
      if (!J) { caixa.replaceChildren(h("p", { texto: "Pronto! Escolha um jogo de 2 jogadores (🏁 Rabisco Kart, Rabiscópolis ou Rabiscolândia): o QR para o celular aparece na abertura do jogo." })); return; }
      if (J.tipo !== "simultaneo") { caixa.replaceChildren(h("p", { texto: "Neste jogo vocês jogam um de cada vez, neste mesmo aparelho. Vale para os dois!" })); return; }
      if (conectado) { caixa.replaceChildren(h("span", { class: "ok", texto: `${J.j2.entrada === "controle" ? "🎮 Controle" : "📱 Celular"} do jogador 2 conectado ✓` })); return; }
      if (!SALA_JOGOS) { caixa.replaceChildren(h("p", { texto: "O celular de controle ainda não está disponível. Ligue um controle 🎮 para o jogador 2." })); return; }
      if (!s?.codigo || s.estado !== "aberta") { caixa.replaceChildren(h("p", { texto: "Preparando o QR code…" })); return; }
      if (caixa.dataset.codigo === s.codigo) return;
      caixa.dataset.codigo = s.codigo;
      const img = h("span", { class: "qr-img", role: "img", "aria-label": `QR code do controle, código ${s.codigo}` });
      try { img.innerHTML = qrSvg(s.link, { nivel: "M" }); } catch { img.textContent = "QR"; }
      const u = new URL(s.link);
      caixa.replaceChildren(img, h("span", {}, [
        h("p", { html: "Jogador 2: leia o QR com a câmera do celular." }),
        h("span", { class: "codigo eng-codigo", texto: s.codigo }),
        h("p", { texto: `ou abra ${u.host}${u.pathname.replace(/\/$/, "")} e digite o código` }),
      ]));
    };
    desenharQr();
    if (J?.aoMudar) desligarOuvinte = J.aoMudar(() => { if (vista === "pronto-mais1") desenharQr(); });
    filhos.push(botaoGrande("✓", "Pronto, vamos jogar!", "", "rosa", () => fechar(), { "data-eng": "ok" }));
  }
  cartao.replaceChildren(fecharB, ...filhos);
  // foco no primeiro botão grande (controle e setas já andam dentro do painel)
  setTimeout(() => { if (tela && !tela.hidden) { const b = cartao.querySelector(".eng-grande"); if (b) focar(b); } }, 30);
}
function escolher(qual) {
  if (qual === "controles") { if (emModoTV) { fechar(); return; } irParaSoControles(); return; }
  if (jogarNoAparelho(qual)) return; // recarregando a página
  vista = qual === "aqui" ? "pronto-aqui" : "pronto-mais1";
  desenhar();
}

export function abrir(qual = "principal") {
  montar();
  vista = qual;
  // no meio da partida, pausa enquanto mexe nas configurações (e continua ao fechar)
  const p = pausaAtual();
  pausouAqui = false;
  if (p && !p.ativa && p.podePausar?.()) { p.pausar(); pausouAqui = true; }
  tela.hidden = false;
  definirModal(tela, { aoVoltar: () => (vista === "principal" ? fechar() : (vista = "principal", desenhar())) });
  desenhar();
}
export function fechar() {
  if (!tela || tela.hidden) return;
  tela.hidden = true;
  desligarOuvinte?.(); desligarOuvinte = null;
  definirModal(null);
  if (pausouAqui) { pausouAqui = false; pausaAtual()?.continuar(); }
  for (const b of botoes) if (b.isConnected) { try { b.focus({ preventScroll: true }); } catch { /* */ } break; }
}

// ------------------------------------------------------------------ Botão ⚙️
const botoes = new Set();
function desenharTudo() {
  if (tela && !tela.hidden) desenhar();
  for (const b of botoes) b.title = sons.mudo ? "Configurações (som desligado)" : "Configurações";
}
let atalho = false;
export function botaoEngrenagem({ classe = "", atalhoM = false, id = null, rotulo = false } = {}) {
  garantirCss();
  const b = document.createElement("button");
  b.type = "button";
  b.className = `eng-botao ${classe}`.trim();
  if (id) b.id = id;
  b.textContent = rotulo ? "⚙️ Configurações" : "⚙️";
  b.setAttribute("aria-label", "Configurações: som e jogar na TV");
  b.addEventListener("click", (e) => { e.stopPropagation(); abrir(); });
  botoes.add(b);
  desenharTudo();
  if (atalhoM) ligarAtalhoM();
  return b;
}
// M liga/desliga o som (só onde o jogo não usa o M para outra coisa; o jogo decide ao pedir o botão)
export function ligarAtalhoM() {
  if (atalho) return;
  atalho = true;
  addEventListener("keydown", (e) => {
    if (e.code !== "KeyM" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target?.matches?.("input, textarea, select, [contenteditable]")) return;
    sons.destravar();
    alternarSom();
  });
}

export const Engrenagem = {
  abrir, fechar, alternarSom, telaLocal, botao: botaoEngrenagem,
  get aberta() { return Boolean(tela && !tela.hidden); },
  get vista() { return vista; },
  // item a mais no painel (ex.: "🎮 Trocar botões"); mostrar: () => bool
  extra(item) { extras.push(item); if (tela && !tela.hidden) desenhar(); },
};
window.Engrenagem = Engrenagem;
export default Engrenagem;
