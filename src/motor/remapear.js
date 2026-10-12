// Configurações de controles: a criança (ou o adulto) troca as teclas do teclado e os botões do controle
// de cada ação do jogo. Fica guardado no aparelho (localStorage "rabisco.controles.<jogo>") e tem
// "Restaurar padrão". Em celular e tablet (toque) nada aparece: toque não se remapeia.
//
//   const remap = criarRemapear({ id: "rabisco-kart", acoes: [
//     { id: "esq", nome: "Virar à esquerda", teclas: ["ArrowLeft", "KeyA"], botoes: [14], controle: "esq" },
//     { id: "buzina", nome: "Buzina", teclas: ["KeyH"], botoes: [2], controle: "acao" },
//   ] });
//   document.body.append(remap.botao);       // ⚙️ (null no celular)
//   remap.naPausa();                          // também um botão "Controles" na tela de pause
//   remap.acaoDaTecla(e.code)                 // "esq" | null
//   remap.segura("esq", teclasApertadas)      // alguma tecla da ação está apertada?
//
// `controle`: nome do botão em src/motor/controle.js (pulo, acao, esq, dir, select...). Os botões trocados
// valem para o `ligarControle` do jogo (definirBotoes). Botões de menu (A confirma, B volta, Start pausa) não mudam.

import { definirBotoes, bloquearControle, moverFoco, focar, clicar } from "./controle.js";

const NOMES_BOTOES = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "Select", "Start", "L3", "R3", "↑", "↓", "←", "→", "Home"];
const NOMES_TECLAS = {
  ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Space: "Espaço", Enter: "Enter", ShiftLeft: "Shift", ShiftRight: "Shift dir.",
  ControlLeft: "Ctrl", ControlRight: "Ctrl dir.", AltLeft: "Alt", AltRight: "Alt dir.", Tab: "Tab", Backspace: "⌫", MetaLeft: "⌘", MetaRight: "⌘",
};
export const nomeTecla = (code) => NOMES_TECLAS[code] || code.replace(/^Key/, "").replace(/^Digit/, "").replace(/^Numpad/, "Num ");
export const nomeBotao = (i) => NOMES_BOTOES[i] ?? `B${i}`;
const RESERVADAS = ["Escape", "KeyP"]; // pause (src/motor/pausa.js)

export const ehToque = () => "ontouchstart" in window || navigator.maxTouchPoints > 0;

export function criarRemapear({ id, titulo = "Controles", acoes, aoAbrir = () => {}, aoFechar = () => {} }) {
  const CHAVE = `rabisco.controles.${id}`;
  const padrao = () => Object.fromEntries(acoes.map((a) => [a.id, { teclas: [...(a.teclas || [])], botoes: [...(a.botoes || [])] }]));
  let mapa = padrao();
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (salvo) for (const a of acoes) if (salvo[a.id]) mapa[a.id] = { teclas: [...(salvo[a.id].teclas || mapa[a.id].teclas)], botoes: [...(salvo[a.id].botoes || mapa[a.id].botoes)] };
  } catch { /* sem armazenamento: fica o padrão */ }
  const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(mapa)); } catch { /* modo privado */ } };
  // botões do controle valem para o ligarControle do jogo
  const aplicar = () => {
    const parcial = {};
    for (const a of acoes) if (a.controle) parcial[a.controle] = [...(parcial[a.controle] || []), ...mapa[a.id].botoes];
    definirBotoes(parcial);
  };
  aplicar();

  const disponivel = !ehToque();
  const api = {
    disponivel, botao: null, aberto: false,
    teclas: (acao) => mapa[acao]?.teclas ?? [],
    botoes: (acao) => mapa[acao]?.botoes ?? [],
    acaoDaTecla: (code) => acoes.find((a) => mapa[a.id].teclas.includes(code))?.id ?? null,
    segura: (acao, apertadas) => (mapa[acao]?.teclas ?? []).some((k) => apertadas.has(k)),
    rotulo: (acao) => { const t = mapa[acao]?.teclas[0]; return t ? nomeTecla(t) : ""; },
    rotuloBotao: (acao) => { const b = mapa[acao]?.botoes[0]; return b != null ? nomeBotao(b) : ""; },
    abrir, fechar, naPausa, restaurar,
  };
  if (!disponivel) { // celular/tablet: nenhuma tela, nenhum botão (só valem as teclas/botões padrão ou os já gravados)
    api.abrir = api.fechar = api.naPausa = () => {};
    return api;
  }

  // ---------- tela
  if (!document.querySelector("link[data-remapear]")) {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = new URL("./remapear.css", import.meta.url).href; l.dataset.remapear = "";
    document.head.append(l);
  }
  const h = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; };
  const botao = h("button", "remap-botao", "⚙️");
  botao.setAttribute("aria-label", "Configurar teclas e botões do controle");
  botao.addEventListener("click", (e) => { e.stopPropagation(); abrir(); });
  api.botao = botao;

  const tela = h("div", "remap-tela");
  tela.hidden = true;
  tela.setAttribute("role", "dialog");
  tela.setAttribute("aria-label", titulo);
  const cartao = h("div", "remap-cartao");
  const aviso = h("p", "remap-aviso", "Clique numa tecla ou botão para trocar.");
  const tabela = h("div", "remap-tabela");
  const rodape = h("div", "remap-rodape");
  const btnPadrao = h("button", "remap-padrao", "Restaurar padrão ↺");
  const btnFechar = h("button", "remap-fechar", "Pronto ✔");
  rodape.append(btnPadrao, btnFechar);
  cartao.append(h("h2", null, `⚙️ ${titulo}`), aviso, tabela, rodape);
  tela.append(cartao);
  document.body.append(tela);
  btnPadrao.addEventListener("click", () => restaurar());
  btnFechar.addEventListener("click", () => fechar());
  tela.addEventListener("click", (e) => { if (e.target === tela) fechar(); });

  let esperando = null; // { acao, tipo: "tecla" | "botao", el, antes: Set de botões já apertados }
  function desenhar() {
    tabela.innerHTML = "";
    tabela.append(h("span", "remap-cab", "Ação"), h("span", "remap-cab", "⌨️ Teclado"), h("span", "remap-cab", "🎮 Controle"));
    for (const a of acoes) {
      tabela.append(h("span", "remap-nome", a.nome));
      const bt = h("button", "remap-tecla", mapa[a.id].teclas.map(nomeTecla).join(" · ") || "—");
      bt.dataset.acao = a.id; bt.dataset.tipo = "tecla";
      bt.addEventListener("click", () => esperar(a.id, "tecla", bt));
      tabela.append(bt);
      if (a.controle) {
        const bb = h("button", "remap-tecla", mapa[a.id].botoes.map(nomeBotao).join(" · ") || "—");
        bb.dataset.acao = a.id; bb.dataset.tipo = "botao";
        bb.addEventListener("click", () => esperar(a.id, "botao", bb));
        tabela.append(bb);
      } else tabela.append(h("span", "remap-fixo", "alavanca"));
    }
  }
  function esperar(acao, tipo, el) {
    esperando = { acao, tipo, el, antes: botoesApertados() };
    el.classList.add("esperando");
    el.textContent = tipo === "tecla" ? "aperte uma tecla…" : "aperte um botão…";
    aviso.textContent = tipo === "tecla" ? "Aperte a nova tecla (Esc cancela)." : "Aperte o novo botão no controle (Start cancela).";
  }
  function trocar(acao, tipo, valor) {
    const campo = tipo === "tecla" ? "teclas" : "botoes";
    // a mesma tecla/botão não fica em duas ações
    for (const a of acoes) if (a.id !== acao) mapa[a.id][campo] = mapa[a.id][campo].filter((v) => v !== valor);
    mapa[acao][campo] = [valor];
    gravar(); aplicar();
    aviso.textContent = `Pronto! ${acoes.find((a) => a.id === acao).nome}: ${tipo === "tecla" ? nomeTecla(valor) : nomeBotao(valor)}.`;
    esperando = null;
    desenhar();
    const el = tabela.querySelector(`[data-acao="${acao}"][data-tipo="${tipo}"]`);
    if (el) focar(el);
  }
  function restaurar() {
    mapa = padrao();
    try { localStorage.removeItem(CHAVE); } catch { /* ok */ }
    aplicar();
    esperando = null;
    if (api.aberto) { desenhar(); aviso.textContent = "Teclas e botões de volta ao padrão."; }
  }
  const botoesApertados = () => {
    const s = new Set();
    for (const g of navigator.getGamepads?.() ?? []) if (g) g.buttons.forEach((b, i) => { if (b?.pressed) s.add(i); });
    return s;
  };

  // teclado: enquanto aberta, a tela fica com todas as teclas (o jogo e o pause não recebem nada)
  addEventListener("keydown", (e) => {
    if (!api.aberto) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (esperando?.tipo === "tecla") {
      if (e.code === "Escape") { esperando = null; desenhar(); aviso.textContent = "Nada mudou."; return; }
      if (RESERVADAS.includes(e.code)) { aviso.textContent = "Essa tecla é do pause. Escolha outra."; return; }
      trocar(esperando.acao, "tecla", e.code);
      return;
    }
    if (e.code === "Escape") { fechar(); return; }
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (d) moverFoco(cartao, ...d);
    else if (e.key === "Enter" || e.key === " ") { const f = document.activeElement; if (f && cartao.contains(f)) clicar(f); }
  }, true);
  addEventListener("keyup", (e) => { if (api.aberto) { e.stopImmediatePropagation(); } }, true);

  // controle: direcional anda, A escolhe, B fecha; esperando, o próximo botão novo vira o da ação
  let antes = new Set();
  function laco() {
    if (!api.aberto) return;
    const agora = botoesApertados();
    const novo = [...agora].filter((i) => !antes.has(i));
    if (esperando?.tipo === "botao") {
      const n = novo.find((i) => !esperando.antes.has(i) && i !== 9 && i !== 16);
      if (novo.includes(9)) { esperando = null; desenhar(); aviso.textContent = "Nada mudou."; }
      else if (n != null) { trocar(esperando.acao, "botao", n); antes = agora; requestAnimationFrame(laco); return; }
      for (const i of esperando?.antes ?? []) if (!agora.has(i)) esperando.antes.delete(i);
    } else if (!esperando) {
      const d = { 12: [0, -1], 13: [0, 1], 14: [-1, 0], 15: [1, 0] };
      for (const i of novo) {
        if (d[i]) moverFoco(cartao, ...d[i]);
        else if (i === 0) { const f = document.activeElement; if (f && cartao.contains(f)) clicar(f); else moverFoco(cartao, 0, 0); }
        else if (i === 1 || i === 9) fechar();
      }
    }
    antes = agora;
    requestAnimationFrame(laco);
  }

  function abrir() {
    if (api.aberto) return;
    api.aberto = true;
    bloquearControle(true);
    aoAbrir();
    desenhar();
    aviso.textContent = "Clique numa tecla ou botão para trocar.";
    tela.hidden = false;
    antes = botoesApertados();
    focar(tabela.querySelector(".remap-tecla"));
    requestAnimationFrame(laco);
  }
  function fechar() {
    if (!api.aberto) return;
    api.aberto = false;
    esperando = null;
    tela.hidden = true;
    // solta o controle no próximo quadro (o B/Start que fechou a tela não vira ação no jogo)
    setTimeout(() => bloquearControle(false), 120);
    aoFechar();
  }
  // botão "Controles" dentro da tela de pause (src/motor/pausa.js): dá para chegar com o controle
  function naPausa() {
    const cartoes = document.querySelectorAll(".pausa-cartao");
    const c = cartoes[cartoes.length - 1];
    if (!c || c.querySelector(".remap-na-pausa")) return;
    const b = h("button", "remap-na-pausa", "⚙️ Controles");
    b.addEventListener("click", () => abrir());
    c.append(b);
  }
  return api;
}
