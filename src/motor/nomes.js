// "Qual é o seu nome?" rápido para quem vai jogar em 2 (TV como tela, ou o aparelho espelhado com um 2º controle).
// Um jogador por vez: campo grande, teclado na tela (setas/direcional + OK/A, para quem só tem controle), "OK" e "Pular".
// Se o jogador está num celular de controle, o celular também pergunta (recado { pedirNome: true, sugestao, n } pela sala)
// e a resposta chega por aqui (receber). O que vier primeiro (celular, teclado da tela, toque) vale.
//
// Os nomes valem só nesta aba (sessionStorage "rabisco.nomes") e ficam presos a QUEM está na vaga ("quem": id do
// celular, "pad:0" do controle, "toque" do próprio aparelho): se outra pessoa entra na vaga, pergunta de novo.
// Nada disto sai do aparelho além do primeiro nome que a tela já mandava para o chip do celular.
//
//   import { nomeGuardado, pedirNomes, receberNome } from "./nomes.js";
//   nomeGuardado(1, "c3") → "Alice" | "" (pulou) | null (nunca perguntou para esse jogador)
//   await pedirNomes([{ n: 1, quem: "c3", cor: "#00b5f0", sugestao: "Alice", celular: (d) => sala.enviar(...) }, ...]);

import { definirModal, focar } from "./controle.js";

const CHAVE = "rabisco.nomes";
const ler = () => { try { return JSON.parse(sessionStorage.getItem(CHAVE)) || {}; } catch { return {}; } };
const gravar = (v) => { try { sessionStorage.setItem(CHAVE, JSON.stringify(v)); } catch { /* sem armazenamento: pergunta de novo na próxima página */ } };
// só letras (com acento), espaço, hífen e apóstrofo; até 14 letras: cabe no HUD e no chip do celular
export const limparNome = (t) => String(t ?? "").normalize("NFC").replace(/[^\p{L}\p{M} '-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 14);

export function nomeGuardado(n, quem) {
  const r = ler()[n];
  if (!r || (quem != null && r.quem !== String(quem))) return null;
  return r.nome;
}
export function guardarNome(n, quem, nome) {
  const t = ler();
  t[n] = { quem: String(quem), nome: limparNome(nome) };
  gravar(t);
  for (const cb of ouvintes) { try { cb(n, t[n].nome); } catch { /* ouvinte com erro */ } }
}
export function esquecerNomes() { try { sessionStorage.removeItem(CHAVE); } catch { /* */ } }
const ouvintes = new Set();
export const aoMudarNome = (cb) => { ouvintes.add(cb); return () => ouvintes.delete(cb); };

// ------------------------------------------------------------------ Tela
const CSS = `
.nomes-tela { position: fixed; inset: 0; z-index: 120; display: flex; align-items: center; justify-content: center; padding: 12px;
  background: rgba(10, 42, 74, 0.72); font-family: "Baloo 2", system-ui, sans-serif; }
.nomes-tela[hidden] { display: none; }
.nomes-cartao { background: #fff; border: 6px solid var(--nc, #151515); border-radius: 30px; box-shadow: 8px 10px 0 #151515; padding: 14px 22px 18px;
  display: flex; flex-direction: column; align-items: center; gap: 10px; width: min(760px, 100%); max-height: 100%; overflow: auto; }
.nomes-quem { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: clamp(18px, 2.6vw, 26px); color: var(--nc); }
.nomes-quem i { width: 22px; height: 22px; border-radius: 50%; background: var(--nc); border: 3px solid #151515; }
.nomes-cartao h2 { margin: 0; font-size: clamp(26px, 4.4vw, 46px); line-height: 1.05; color: #151515; }
.nomes-campo { font: 800 clamp(28px, 4.6vw, 48px) "Baloo 2", system-ui, sans-serif; text-align: center; width: min(520px, 100%); color: #151515;
  border: 5px solid #151515; border-radius: 20px; padding: 2px 14px 6px; background: #fff8d6; }
.nomes-campo:focus { outline: 6px solid var(--nc); outline-offset: 2px; }
.nomes-sugestao { font: 800 clamp(18px, 2.6vw, 26px) "Baloo 2", system-ui, sans-serif; background: #e9f6fd; color: #151515; border: 4px solid #151515;
  border-radius: 999px; padding: 2px 18px 4px; box-shadow: 0 4px 0 #151515; cursor: pointer; }
.nomes-teclado { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px; width: 100%; }
.nomes-teclado button { font: 800 clamp(16px, 2.4vw, 24px) "Baloo 2", system-ui, sans-serif; min-height: 44px; padding: 0; color: #151515; background: #fff;
  border: 3px solid #151515; border-radius: 12px; box-shadow: 0 3px 0 #151515; cursor: pointer; }
.nomes-teclado button.largo { grid-column: span 2; }
.nomes-botoes { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.nomes-botoes button { font: 800 clamp(20px, 3vw, 30px) "Baloo 2", system-ui, sans-serif; min-width: 170px; border: 4px solid #151515; border-radius: 999px;
  padding: 2px 24px 6px; box-shadow: 0 5px 0 #151515; cursor: pointer; }
.nomes-ok { background: #ec2e8c; color: #fff; }
.nomes-pular { background: #fff; color: #151515; }
.nomes-dica { margin: 0; font-weight: 700; color: #444; font-size: clamp(14px, 1.8vw, 18px); text-align: center; }
.nomes-tela .controle-foco { outline: 6px solid #ffcc1f !important; outline-offset: 3px; }
/* aparelho de toque: o teclado do próprio aparelho é melhor que o da tela */
.nomes-tela.toque .nomes-teclado { display: none; }
@media (max-height: 560px) { .nomes-teclado button { min-height: 34px; } .nomes-cartao { gap: 6px; padding: 8px 16px 12px; } }
`;
let cssPronto = false;
function garantirCss() {
  if (cssPronto) return;
  cssPronto = true;
  const s = document.createElement("style");
  s.dataset.nomes = "";
  s.textContent = CSS;
  document.head.append(s);
}
const ehToque = () => ("ontouchstart" in window || navigator.maxTouchPoints > 0) && !document.documentElement.classList.contains("sala-tv");
const LETRAS = "QWERTYUIOPASDFGHJKLÇZXCVBNM".split("");

let atual = null; // { n, quem, resolver, campo, el, celular }
export const nomesAbertos = () => Boolean(atual);

// pergunta um jogador; devolve o nome ("" = pulou)
function perguntar({ n, quem, cor = "#151515", sugestao = "", celular = null, titulo = null }) {
  garantirCss();
  return new Promise((resolver) => {
    const el = document.createElement("div");
    el.className = `nomes-tela${ehToque() ? " toque" : ""}`;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", `Nome do jogador ${n}`);
    el.dataset.jogador = n;
    const campo = document.createElement("input");
    campo.className = "nomes-campo";
    campo.maxLength = 14;
    campo.autocomplete = "off";
    campo.spellcheck = false;
    campo.setAttribute("autocapitalize", "words");
    campo.setAttribute("aria-label", "Seu nome");
    campo.placeholder = n === 1 ? "Seu nome" : `Jogador ${n}`;
    campo.value = sugestao ? limparNome(sugestao) : "";
    const teclado = document.createElement("div");
    teclado.className = "nomes-teclado";
    for (const l of LETRAS) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = l; b.dataset.letra = l;
      teclado.append(b);
    }
    const apagar = Object.assign(document.createElement("button"), { type: "button", textContent: "⌫", className: "largo" });
    apagar.dataset.tecla = "apagar"; apagar.setAttribute("aria-label", "Apagar");
    const espaco = Object.assign(document.createElement("button"), { type: "button", textContent: "espaço", className: "largo" });
    espaco.dataset.tecla = "espaco";
    teclado.append(espaco, apagar);
    teclado.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      let v = campo.value;
      if (b.dataset.letra) v = (v.length === 0 || v.endsWith(" ") ? b.dataset.letra : v + b.dataset.letra.toLowerCase());
      else if (b.dataset.tecla === "apagar") v = v.slice(0, -1);
      else if (b.dataset.tecla === "espaco" && v && !v.endsWith(" ")) v += " ";
      campo.value = v.slice(0, 14);
    });
    const ok = Object.assign(document.createElement("button"), { type: "button", className: "nomes-ok", textContent: "OK ✓" });
    const pular = Object.assign(document.createElement("button"), { type: "button", className: "nomes-pular", textContent: "Pular" });
    const sug = sugestao ? Object.assign(document.createElement("button"), { type: "button", className: "nomes-sugestao", textContent: `✓ Sou ${limparNome(sugestao)}` }) : null;
    const cartao = document.createElement("div");
    cartao.className = "nomes-cartao";
    cartao.style.setProperty("--nc", cor);
    cartao.innerHTML = `<div class="nomes-quem"><i></i>Jogador ${n}</div><h2>${titulo ?? "Qual é o seu nome?"}</h2>`;
    const dica = document.createElement("p");
    dica.className = "nomes-dica";
    dica.textContent = celular ? "Escreva no seu celular 📱 ou aqui na tela." : "Escreva o nome e aperte OK. Pode pular!";
    const botoes = document.createElement("div");
    botoes.className = "nomes-botoes";
    botoes.append(ok, pular);
    cartao.append(campo, ...(sug ? [sug] : []), teclado, botoes, dica);
    el.append(cartao);
    document.body.append(el);

    const fim = (nome) => {
      if (atual?.el !== el) return;
      atual = null;
      el.remove();
      definirModal(null);
      try { celular?.({ pedirNome: false }); } catch { /* celular fora */ }
      resolver(limparNome(nome));
    };
    ok.addEventListener("click", () => fim(campo.value));
    pular.addEventListener("click", () => fim(""));
    sug?.addEventListener("click", () => fim(sugestao));
    campo.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); fim(campo.value); } e.stopPropagation(); });
    atual = { n, quem: String(quem), el, fim };
    definirModal(el, { aoVoltar: () => fim("") });
    try { celular?.({ pedirNome: true, n, sugestao: sugestao ? limparNome(sugestao) : "", cor }); } catch { /* celular fora */ }
    // toque: o teclado do aparelho; TV/controle: o foco começa na sugestão (um OK e pronto) ou na primeira letra
    setTimeout(() => { if (atual?.el !== el) return; if (ehToque()) campo.focus(); else focar(sug || (campo.value ? ok : teclado.querySelector("button"))); }, 60);
  });
}

// resposta vinda do celular de controle (src/controle-remoto/): só vale para quem está sendo perguntado agora
export function receberNome(quem, nome) {
  if (!atual || atual.quem !== String(quem)) return false;
  atual.fim(nome);
  return true;
}

// pergunta, em fila, cada jogador que ainda não tem nome guardado para quem está na vaga
let fila = Promise.resolve();
export function pedirNomes(jogadores, { forcar = false } = {}) {
  fila = fila.then(async () => {
    for (const j of jogadores) {
      if (!forcar && nomeGuardado(j.n, j.quem) != null) continue;
      const nome = await perguntar(j);
      guardarNome(j.n, j.quem, nome);
    }
  });
  return fila;
}

// Nome de cada jogador para mostrar (vagas, HUD, avisos): o que ele escreveu; sem nome, o jogador 1 é o "Rabisco" e o
// jogador 2 é a criança do cadastro — a não ser que ela já seja o jogador 1 (ou o 2 tenha pulado): aí "Jogador 2".
const primeiro = (t) => String(t || "").trim().split(/\s+/)[0] || "";
export function nomeDoJogador(n, quem, cadastro = "") {
  const g = nomeGuardado(n, quem);
  if (g) return g;
  if (n === 1) return "Rabisco";
  if (g === "") return "Jogador 2";
  const n1 = ler()[1]?.nome;
  return cadastro && primeiro(n1).toLowerCase() !== primeiro(cadastro).toLowerCase() ? cadastro : "Jogador 2";
}
// o jogador digitou um nome (não é o Rabisco nem o nome do cadastro que já vinha)
export const temNomeProprio = (n, quem) => Boolean(nomeGuardado(n, quem));
