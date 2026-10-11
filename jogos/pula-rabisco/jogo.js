// Pula, Rabisco! (bebês): toque em qualquer lugar e o Rabisco corre até a estrela e dá um pulo para
// pegá-la, com som de moedinha. Qualquer tecla ou botão do controle também faz ele pular.

import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

// 10 fases: um cenário e uma coisa diferente para pegar lá no alto
const FASES = [
  { nome: "Escola", ceu: ["#2f9bff", "#d6f3ff"], chao: "#c9773a", pega: "⭐" },
  { nome: "Praia", ceu: ["#22b8ff", "#fff4d6"], chao: "#f3d9a4", pega: "🐚" },
  { nome: "Pomar", ceu: ["#4fb3ff", "#e4f7ff"], chao: "#7cbf4a", pega: "🍎" },
  { nome: "Neve", ceu: ["#8fc4ff", "#f4fbff"], chao: "#f4f8ff", pega: "❄️" },
  { nome: "Fazenda", ceu: ["#3aa7ff", "#f2f8e6"], chao: "#a8743a", pega: "🥕" },
  { nome: "Espaço", ceu: ["#10002b", "#3c096c"], chao: "#9aa3ad", pega: "🪐" },
  { nome: "Fundo do mar", ceu: ["#0077b6", "#7fd6ff"], chao: "#e8c46f", pega: "🐠" },
  { nome: "Cidade", ceu: ["#4a9ee6", "#e5eef7"], chao: "#6b7280", pega: "🎈" },
  { nome: "Deserto", ceu: ["#46a8f0", "#fde7c2"], chao: "#e2b66a", pega: "💧" },
  { nome: "Noite", ceu: ["#0b1b4a", "#2a3f86"], chao: "#2f7a3a", pega: "🌙" },
];
const META = 8;
let F = FASES[0];
let estrelas = 0, ocupado = false, rabisco = null, estrela = null, xRabisco = 50;

const jogo = criarCasca({
  titulo: "Pula, Rabisco!",
  sub: "Toque para o Rabisco pular!",
  faixa: "bebes",
  cor: "#FFB13B",
  pose: "frente",
  dica: { teclado: "Qualquer tecla faz o Rabisco pular", toque: "Toque em qualquer lugar", controle: "Qualquer botão faz o Rabisco pular" },
  niveis: FASES.map((f, i) => ({ nome: `${i + 1}`, desc: f.nome })),
  falas: { titulo: "pr-titulo", vitoria: "pr-vitoria" },
  menuNoJogo: false,
  teclado: false,
  aoComecar: montar,
  aoControle: ({ apertou }) => { if (Object.entries(apertou).some(([k, v]) => v && k !== "start")) pular(); },
});

function montar(n) {
  F = FASES[n - 1];
  estrelas = 0; ocupado = false; xRabisco = 50;
  const cena = el("div", { class: "cena-pulo", style: `--ceu1:${F.ceu[0]}; --ceu2:${F.ceu[1]}; --chao:${F.chao}` });
  rabisco = el("img", { class: "rabisco-pulo", src: "../../assets/rabisco/poses/frente.png", alt: "Rabisco" });
  estrela = el("div", { class: "estrela-alvo", texto: F.pega });
  cena.append(el("div", { class: "chao-blocos" }), rabisco, estrela);
  jogo.palco.append(cena);
  posicionar();
  novaEstrela();
  jogo.placar(`${F.pega} 0/${META}`);
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
    jogo.placar(`${F.pega} ${estrelas}/${META}`);
    if (estrelas % 3 === 0) falar("pr-eba");
  }, 780);
  setTimeout(() => {
    rabisco.classList.remove("pulando");
    ocupado = false;
    if (estrelas >= META) jogo.vencer({ titulo: "Eba!", estrelas: null, texto: `${F.nome}: o Rabisco pegou tudo!`, proximo: true });
    else novaEstrela();
  }, 1250);
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, pular, get estrelas() { return estrelas; } };
