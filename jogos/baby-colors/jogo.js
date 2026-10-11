// Baby Colors (bebês): balões grandes sobem pela tela; cada toque estoura um e a voz diz a cor em
// inglês (red, blue, yellow...). Qualquer tecla ou botão do controle estoura o balão mais baixo.

import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

const CORES = [["red", "#e63946"], ["blue", "#1d6fe0"], ["yellow", "#ffcc1f"], ["green", "#2bb24c"], ["pink", "#ec2e8c"], ["orange", "#ff7a00"], ["purple", "#8e6cff"]];
// 10 fases: formas, céus e cada vez mais cores (a voz sempre diz a cor em inglês)
const FASES = [
  { nome: "Balões", forma: "balao", cores: 3, ceu: ["#2f9bff", "#d6f3ff"] },
  { nome: "Bolhas", forma: "bolha", cores: 4, ceu: ["#3fb5ff", "#e8fbff"] },
  { nome: "Estrelas", forma: "estrela", cores: 4, ceu: ["#1b2a6b", "#4a5fa6"] },
  { nome: "Corações", forma: "coracao", cores: 5, ceu: ["#ff8fbf", "#ffe3ef"] },
  { nome: "Pipas", forma: "pipa", cores: 5, ceu: ["#5fb8ff", "#fff4d6"] },
  { nome: "Mais balões", forma: "balao", cores: 6, ceu: ["#6a4fc4", "#ffb27a"] },
  { nome: "Bolhas no mar", forma: "bolha", cores: 6, ceu: ["#0077b6", "#7fd6ff"] },
  { nome: "Estrelas cadentes", forma: "estrela", cores: 7, ceu: ["#10002b", "#3c096c"] },
  { nome: "Corações de festa", forma: "coracao", cores: 7, ceu: ["#d63384", "#ffc2d1"] },
  { nome: "Festa das cores", forma: "mistura", cores: 7, ceu: ["#00b5f0", "#fff1d6"] },
];
const META = 10;
let estourados = 0, timer = null, F = FASES[0];

const jogo = criarCasca({
  titulo: "Baby Colors",
  sub: "Pop the balloons!",
  faixa: "bebes",
  cor: "#FFB13B",
  dica: { teclado: "Qualquer tecla estoura um balão", toque: "Toque nos balões", controle: "Qualquer botão estoura um balão" },
  niveis: FASES.map((f, i) => ({ nome: `${i + 1}`, desc: f.nome })),
  falas: { titulo: "en-bc-titulo", vitoria: "en-bc-vitoria" },
  menuNoJogo: false,
  teclado: false,
  aoComecar: montar,
  aoSair: () => clearInterval(timer),
  aoControle: ({ apertou }) => { if (Object.entries(apertou).some(([k, v]) => v && k !== "start")) estourarMaisBaixo(); },
});

function montar(n) {
  F = FASES[n - 1];
  estourados = 0;
  document.body.style.setProperty("--ceu1", F.ceu[0]);
  document.body.style.setProperty("--ceu2", F.ceu[1]);
  clearInterval(timer);
  jogo.palco.append(el("div", { class: "ceu-baloes" }));
  jogo.placar(`🎈 0/${META}`);
  for (let i = 0; i < 3; i++) setTimeout(soltarBalao, i * 700);
  timer = setInterval(() => { if (!jogo.pausado && jogo.estado === "jogando" && document.querySelectorAll(".balao-cor").length < 5) soltarBalao(); }, 1300);
}

function soltarBalao() {
  const ceu = document.querySelector(".ceu-baloes");
  if (!ceu) return;
  const [nome, hex] = CORES[Math.floor(Math.random() * F.cores)];
  const forma = F.forma === "mistura" ? ["balao", "bolha", "estrela", "coracao", "pipa"][Math.floor(Math.random() * 5)] : F.forma;
  const b = el("button", { class: `balao-cor forma-${forma}`, "aria-label": `${nome}`, style: `--c:${hex}; left:${8 + Math.random() * 76}%; animation-duration:${7 + Math.random() * 3}s` });
  b.dataset.cor = nome;
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); estourar(b); });
  b.addEventListener("click", () => estourar(b)); // teclado ou leitor de tela
  b.addEventListener("animationend", () => b.remove());
  ceu.append(b);
}

function estourarMaisBaixo() {
  const baloes = [...document.querySelectorAll(".balao-cor:not(.estourou)")];
  if (!baloes.length) return;
  estourar(baloes.reduce((a, b) => (a.getBoundingClientRect().top > b.getBoundingClientRect().top ? a : b)));
}
addEventListener("keydown", (e) => { if (jogo.estado === "jogando" && !jogo.pausado && !e.repeat && !["p", "P", "Escape"].includes(e.key)) estourarMaisBaixo(); });

function estourar(b) {
  if (jogo.pausado || b.classList.contains("estourou")) return;
  b.classList.add("estourou");
  sons.estouro();
  falar(`en-${b.dataset.cor}`);
  const r = b.getBoundingClientRect();
  for (let i = 0; i < 10; i++) {
    const p = el("div", { class: "pedaco", style: `--c:${getComputedStyle(b).getPropertyValue("--c")}; left:${r.left + r.width / 2}px; top:${r.top + r.height / 2}px; --dx:${Math.cos(i) * 80}px; --dy:${Math.sin(i) * 80}px` });
    document.body.append(p);
    setTimeout(() => p.remove(), 600);
  }
  setTimeout(() => b.remove(), 250);
  estourados++;
  jogo.placar(`🎈 ${estourados}/${META}`);
  if (estourados >= META) { clearInterval(timer); setTimeout(() => jogo.vencer({ titulo: "Yay!", estrelas: null, texto: `${F.nome}: você estourou tudo!`, proximo: true }), 900); }
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, estourarMaisBaixo, get estourados() { return estourados; } };
