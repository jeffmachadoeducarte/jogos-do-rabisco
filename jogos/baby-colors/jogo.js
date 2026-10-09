// Baby Colors (bebês): balões grandes sobem pela tela; cada toque estoura um e a voz diz a cor em
// inglês (red, blue, yellow...). Qualquer tecla ou botão do controle estoura o balão mais baixo.

import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

const CORES = [["red", "#e63946"], ["blue", "#1d6fe0"], ["yellow", "#ffcc1f"], ["green", "#2bb24c"], ["pink", "#ec2e8c"], ["orange", "#ff7a00"], ["purple", "#8e6cff"]];
const META = 12;
let estourados = 0, timer = null;

const jogo = criarCasca({
  titulo: "Baby Colors",
  sub: "Pop the balloons!",
  faixa: "bebes",
  cor: "#FFB13B",
  dica: { teclado: "Qualquer tecla estoura um balão", toque: "Toque nos balões", controle: "Qualquer botão estoura um balão" },
  falas: { titulo: "en-bc-titulo", vitoria: "en-bc-vitoria" },
  menuNoJogo: false,
  teclado: false,
  aoComecar: montar,
  aoSair: () => clearInterval(timer),
  aoControle: ({ apertou }) => { if (Object.entries(apertou).some(([k, v]) => v && k !== "start")) estourarMaisBaixo(); },
});

function montar() {
  estourados = 0;
  clearInterval(timer);
  jogo.palco.append(el("div", { class: "ceu-baloes" }));
  jogo.placar(`🎈 0/${META}`);
  for (let i = 0; i < 3; i++) setTimeout(soltarBalao, i * 700);
  timer = setInterval(() => { if (!jogo.pausado && jogo.estado === "jogando" && document.querySelectorAll(".balao-cor").length < 5) soltarBalao(); }, 1300);
}

function soltarBalao() {
  const ceu = document.querySelector(".ceu-baloes");
  if (!ceu) return;
  const [nome, hex] = CORES[Math.floor(Math.random() * CORES.length)];
  const b = el("button", { class: "balao-cor", "aria-label": `Balão ${nome}`, style: `--c:${hex}; left:${8 + Math.random() * 76}%; animation-duration:${7 + Math.random() * 3}s` });
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
  if (estourados >= META) { clearInterval(timer); setTimeout(() => jogo.vencer({ titulo: "Yay!", estrelas: null, texto: "Você estourou todos os balões!", proximo: false }), 900); }
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, estourarMaisBaixo, get estourados() { return estourados; } };
