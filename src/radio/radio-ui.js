// Painel do rádio do carro: aparece só enquanto a criança está dirigindo, num canto (abaixo do minimapa),
// sem tapar a estrada nem os botões de toque. Mostra a estação e o hino ("Castelo Forte — hino de 1529").
//
//   import { criarRadio } from "../../src/radio/radio.js";
//   import { criarRadioUI } from "../../src/radio/radio-ui.js";
//   const radio = criarRadio();
//   const radioUI = criarRadioUI({ radio });
//   radioUI.entrarNoCarro();   // ao entrar no carro: mostra o painel e liga (se a criança não tinha desligado)
//   radioUI.sairDoCarro();     // ao sair: desliga e esconde
//
// Teclado (só com o painel visível): R liga/desliga · [ e ] trocam a estação.
// Controle: RB = próxima estação · LB = anterior · R3 (apertar a alavanca direita) = liga/desliga.
// Toque: botões ⏻ ◀ ▶ com área de toque de 44 px.
// A escolha (ligado, estação, volume) fica guardada neste aparelho (localStorage, opcional).

const CHAVE = "rabisco-radio";
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { return {}; } };
const gravar = (v) => { try { localStorage.setItem(CHAVE, JSON.stringify({ ...ler(), ...v })); } catch { /* sem armazenamento */ } };

export function criarRadioUI({
  radio, pai = document.body, teclas = true, controle = true,
  botoes = { proxima: [5], anterior: [4], ligar: [11] }, vigiarFalas = true,
} = {}) {
  if (!document.querySelector('link[data-radio-css]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.dataset.radioCss = "";
    css.href = new URL("./radio.css", import.meta.url).href;
    document.head.appendChild(css);
  }
  const el = document.createElement("div");
  el.className = "radio-carro desligado";
  el.hidden = true;
  el.innerHTML = `
    <button type="button" class="radio-bt radio-liga" aria-label="Ligar ou desligar o rádio" title="Liga/desliga (R)">⏻</button>
    <button type="button" class="radio-bt radio-ant" aria-label="Estação anterior" title="Estação anterior ([)">◀</button>
    <div class="radio-visor" aria-live="polite">
      <span class="radio-ondas" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <b class="radio-estacao"></b>
      <small class="radio-hino"></small>
    </div>
    <button type="button" class="radio-bt radio-prox" aria-label="Próxima estação" title="Próxima estação (])">▶</button>
    <span class="radio-teclas" aria-hidden="true">R ⏻ · [ ] estação</span>`;
  pai.appendChild(el);
  const $ = (s) => el.querySelector(s);
  // o toque no painel não vira "olhar/andar" no jogo
  for (const ev of ["pointerdown", "touchstart", "mousedown"]) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });

  const pref = ler();
  if (pref.volume != null) radio.volume(pref.volume);
  const desliga = vigiarFalas ? radio.vigiarFalas() : () => {};

  function desenhar(i = radio.estacaoAtual()) {
    el.style.setProperty("--radio-cor", i.cor);
    el.classList.toggle("desligado", !i.ligado);
    $(".radio-estacao").innerHTML = `<span class="radio-prefixo">Rádio </span>${i.nome.replace(/^Rádio /, "")}`;
    const h = $(".radio-hino");
    if (!i.ligado || !i.hino) h.textContent = i.ligado ? "" : "Rádio desligado";
    else {
      // no celular deitado o rótulo encolhe para "Castelo Forte · 1529" (CSS)
      h.textContent = "";
      const parte = (cls, txt) => { const s = document.createElement("span"); s.className = cls; s.textContent = txt; h.appendChild(s); };
      parte("radio-hino-nome", i.hino.nome);
      parte("radio-rotulo", ` — ${i.hino.rotulo}`);
      parte("radio-ano", i.hino.rotulo.includes("original") ? " · original" : ` · ${i.hino.ano}`);
    }
    $(".radio-liga").setAttribute("aria-pressed", String(i.ligado));
  }
  const tirar = radio.onMudar((i) => { desenhar(i); gravar({ estacao: i.indice }); });

  const acoes = {
    ligar() { const lig = radio.alternar(); gravar({ ligado: lig }); },
    proxima() { if (!radio.ligado) { radio.ligar(); gravar({ ligado: true }); } radio.proxima(); },
    anterior() { if (!radio.ligado) { radio.ligar(); gravar({ ligado: true }); } radio.anterior(); },
  };
  $(".radio-liga").addEventListener("click", acoes.ligar);
  $(".radio-prox").addEventListener("click", acoes.proxima);
  $(".radio-ant").addEventListener("click", acoes.anterior);

  function teclado(e) {
    if (el.hidden || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || "") || e.target?.isContentEditable) return;
    const k = e.key;
    if (k === "r" || k === "R") acoes.ligar();
    else if (k === "]" || k === "}") acoes.proxima();
    else if (k === "[" || k === "{") acoes.anterior();
    else return;
    e.preventDefault();
  }
  if (teclas) addEventListener("keydown", teclado);

  // controle físico: só lê enquanto o painel está visível (dirigindo)
  let raf = 0, antes = {};
  function lerControle() {
    raf = requestAnimationFrame(lerControle);
    const agora = {};
    for (const g of navigator.getGamepads?.() ?? []) {
      if (!g) continue;
      for (const [acao, idx] of Object.entries(botoes)) if (idx.some((i) => g.buttons[i]?.pressed)) agora[acao] = true;
    }
    for (const acao of Object.keys(botoes)) if (agora[acao] && !antes[acao]) acoes[acao]();
    antes = agora;
  }

  const ui = {
    el,
    mostrar() {
      el.hidden = false; desenhar();
      if (controle && !raf) { antes = { proxima: true, anterior: true, ligar: true }; raf = requestAnimationFrame(lerControle); }
    },
    esconder() { el.hidden = true; cancelAnimationFrame(raf); raf = 0; },
    // ao entrar no carro: liga na última estação (a não ser que a criança tenha desligado da última vez)
    entrarNoCarro() {
      const p = ler();
      ui.mostrar();
      if (p.ligado !== false && !radio.ligado) radio.ligar({ estacao: p.estacao ?? 0 });
      desenhar();
    },
    sairDoCarro() { radio.desligar(); ui.esconder(); },
    destruir() { ui.esconder(); tirar(); desliga(); removeEventListener("keydown", teclado); el.remove(); },
  };
  desenhar();
  return ui;
}
