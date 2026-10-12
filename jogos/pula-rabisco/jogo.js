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
let cena = null, camadaNuvens = null, camadaMorros = null, bufferAte = 0; // bufferAte: toque dado com o Rabisco ocupado ainda vale por 350 ms

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
  cena = el("div", { class: "cena-pulo", style: `--ceu1:${F.ceu[0]}; --ceu2:${F.ceu[1]}; --chao:${F.chao}` });
  rabisco = el("img", { class: "rabisco-pulo", src: "../../assets/rabisco/poses/frente.png", alt: "Rabisco" });
  estrela = el("div", { class: "estrela-alvo", texto: F.pega });
  // parallax: nuvens (andam pouco) e morros (andam mais) deslizam ao contrário do Rabisco
  camadaNuvens = el("div", { class: "camada nuvens", html: "<i>☁️</i><i>☁️</i><i>☁️</i>" });
  camadaMorros = el("div", { class: "camada morros", html: "<i></i><i></i><i></i>" });
  cena.append(camadaNuvens, camadaMorros, el("div", { class: "chao-blocos" }), rabisco, estrela);
  jogo.palco.append(cena);
  bufferAte = 0;
  posicionar();
  novaEstrela();
  jogo.placar(`${F.pega} 0/${META}`);
  jogo.aviso(`Pegue ${META} ${F.pega}!`, "bom", 1800); // objetivo da fase, grande e curto
}
const posicionar = () => {
  rabisco.style.left = `${xRabisco}%`;
  const d = xRabisco - 50;
  camadaNuvens.style.transform = `translate3d(${-d * 0.25}vw,0,0)`;
  camadaMorros.style.transform = `translate3d(${-d * 0.6}vw,0,0)`;
};
// confete + "+1" onde a estrela foi pega (partículas leves, somem sozinhas)
function festa() {
  const cores = ["#ffd23f", "#ff5fa2", "#00b5f0", "#7be04a", "#fff"];
  const x = Number(estrela.dataset.x);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r = 9 + Math.random() * 9;
    const c = el("i", { class: "confete", style: `left:${x}%; background:${cores[i % cores.length]}; --dx:${Math.cos(a) * r}vmin; --dy:${Math.sin(a) * r}vmin` });
    cena.append(c); setTimeout(() => c.remove(), 700);
  }
  const mais = el("b", { class: "mais-um", style: `left:${x}%`, texto: "+1" });
  cena.append(mais); setTimeout(() => mais.remove(), 900);
}
function novaEstrela() {
  const x = 15 + Math.random() * 70;
  estrela.style.left = `${x}%`;
  estrela.dataset.x = x;
  estrela.classList.remove("pega"); void estrela.offsetWidth; estrela.classList.add("aparece");
}

addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) pular(); });
addEventListener("keydown", (e) => { if (!e.repeat && !["p", "P", "Escape"].includes(e.key)) pular(); });

function pular() {
  if (jogo.estado !== "jogando" || jogo.pausado) return;
  if (ocupado) { bufferAte = performance.now() + 350; return; } // buffer: o toque cedo demais não se perde
  ocupado = true; bufferAte = 0;
  // anda até embaixo da estrela e pula
  xRabisco = Number(estrela.dataset.x);
  rabisco.classList.add("andando");
  posicionar();
  setTimeout(() => {
    rabisco.classList.remove("andando");
    rabisco.classList.add("pulando");
    sons.pulo();
  }, 380);
  setTimeout(() => {
    estrela.classList.remove("aparece"); estrela.classList.add("pega");
    festa();
    sons.moeda();
    estrelas++;
    jogo.placar(`${F.pega} ${estrelas}/${META}`);
    if (estrelas % 3 === 0) falar("pr-eba");
  }, 700);
  setTimeout(() => {
    rabisco.classList.remove("pulando");
    ocupado = false;
    if (estrelas >= META) jogo.vencer({ titulo: "Eba!", estrelas: null, texto: `${F.nome}: o Rabisco pegou tudo!`, proximo: true });
    else { novaEstrela(); if (performance.now() < bufferAte) pular(); }
  }, 1130);
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, pular, get estrelas() { return estrelas; } };
