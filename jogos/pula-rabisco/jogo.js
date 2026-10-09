// Pula, Rabisco! (bebês): toque em qualquer lugar e o Rabisco corre até a estrela e dá um pulo para
// pegá-la, com som de moedinha. Qualquer tecla ou botão do controle também faz ele pular.

import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

const META = 10;
let estrelas = 0, ocupado = false, rabisco = null, estrela = null, xRabisco = 50;

const jogo = criarCasca({
  titulo: "Pula, Rabisco!",
  sub: "Toque para o Rabisco pular!",
  faixa: "bebes",
  cor: "#FFB13B",
  pose: "frente",
  dica: { teclado: "Qualquer tecla faz o Rabisco pular", toque: "Toque em qualquer lugar", controle: "Qualquer botão faz o Rabisco pular" },
  falas: { titulo: "pr-titulo", vitoria: "pr-vitoria" },
  menuNoJogo: false,
  teclado: false,
  aoComecar: montar,
  aoControle: ({ apertou }) => { if (Object.entries(apertou).some(([k, v]) => v && k !== "start")) pular(); },
});

function montar() {
  estrelas = 0; ocupado = false; xRabisco = 50;
  const cena = el("div", { class: "cena-pulo" });
  rabisco = el("img", { class: "rabisco-pulo", src: "../../assets/rabisco/poses/frente.png", alt: "Rabisco" });
  estrela = el("div", { class: "estrela-alvo", texto: "⭐" });
  cena.append(el("div", { class: "chao-blocos" }), rabisco, estrela);
  jogo.palco.append(cena);
  posicionar();
  novaEstrela();
  jogo.placar(`⭐ 0/${META}`);
}
const posicionar = () => { rabisco.style.left = `${xRabisco}%`; };
function novaEstrela() {
  const x = 15 + Math.random() * 70;
  estrela.style.left = `${x}%`;
  estrela.dataset.x = x;
  estrela.classList.remove("pega"); void estrela.offsetWidth; estrela.classList.add("aparece");
}

addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) pular(); });
addEventListener("keydown", (e) => { if (!e.repeat && !["p", "P", "Escape"].includes(e.key)) pular(); });

function pular() {
  if (jogo.estado !== "jogando" || jogo.pausado || ocupado) return;
  ocupado = true;
  // anda até embaixo da estrela e pula
  xRabisco = Number(estrela.dataset.x);
  rabisco.classList.add("andando");
  posicionar();
  setTimeout(() => {
    rabisco.classList.remove("andando");
    rabisco.classList.add("pulando");
    sons.pulo();
  }, 500);
  setTimeout(() => {
    estrela.classList.remove("aparece"); estrela.classList.add("pega");
    sons.moeda();
    estrelas++;
    jogo.placar(`⭐ ${estrelas}/${META}`);
    if (estrelas % 3 === 0) falar("pr-eba");
  }, 780);
  setTimeout(() => {
    rabisco.classList.remove("pulando");
    ocupado = false;
    if (estrelas >= META) jogo.vencer({ titulo: "Eba!", estrelas: null, texto: "O Rabisco pegou todas as estrelas!", proximo: false });
    else novaEstrela();
  }, 1250);
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, pular, get estrelas() { return estrelas; } };
