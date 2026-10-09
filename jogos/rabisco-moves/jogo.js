// Rabisco Moves (1 ano e meio a 3 anos, inglês): "Head, shoulders, knees and toes". A voz pede uma
// parte do corpo em inglês, ela brilha no Rabisco e, quando a criança toca, ele dança.
// Para os bem pequenos, qualquer tecla ou botão do controle também vale como toque na parte certa.

import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

// posição de cada parte na imagem de frente (284 × 900), em porcentagem
const PARTES = {
  head: [[50, 25]], shoulders: [[17, 44], [83, 44]], knees: [[35, 82], [65, 82]], toes: [[24, 96], [76, 96]],
  eyes: [[50, 32.5]], mouth: [[50, 37.5]], hands: [[8, 65], [92, 65]], tummy: [[50, 56]],
};
const NIVEIS = [
  { nome: "Nível 1", desc: "Head, shoulders, knees, toes", ordem: ["head", "shoulders", "knees", "toes", "knees", "toes"] },
  { nome: "Nível 2", desc: "More body parts", ordem: ["eyes", "mouth", "hands", "tummy", "head", "toes", "shoulders", "knees"] },
];
let fila = [], atual = null, rabisco = null, caixa = null, ocupado = false, feitas = 0;

const jogo = criarCasca({
  titulo: "Rabisco Moves",
  sub: "Touch and dance!",
  faixa: "bem-pequenos",
  cor: "#FF5FA2",
  pose: "frente",
  niveis: NIVEIS,
  dica: { teclado: "Qualquer tecla toca a parte que brilha", toque: "Toque na parte que brilha", controle: "Qualquer botão toca a parte que brilha" },
  falas: { titulo: "rm-titulo", vitoria: "en-great-job" },
  menuNoJogo: false,
  teclado: false,
  aoComecar: montar,
  aoControle: ({ apertou }) => { if (Object.entries(apertou).some(([k, v]) => v && k !== "start")) acertou(); },
});

function montar(n) {
  fila = [...NIVEIS[n - 1].ordem]; feitas = 0; ocupado = false;
  const pista = el("div", { class: "pista-danca" });
  caixa = el("div", { class: "rabisco-danca" });
  rabisco = el("img", { src: "../../assets/rabisco/poses/frente.png", alt: "Rabisco" });
  caixa.append(rabisco);
  for (const [parte, pontos] of Object.entries(PARTES)) {
    for (const [x, y] of pontos) {
      const alvo = el("button", { class: `alvo ${["eyes", "mouth"].includes(parte) ? "pequeno" : ""}`, "aria-label": parte, style: `left:${x}%; top:${y}%` });
      alvo.dataset.parte = parte;
      alvo.addEventListener("pointerdown", (e) => { e.preventDefault(); tocou(parte); });
      caixa.append(alvo);
    }
  }
  pista.append(caixa, el("div", { class: "palavra-en" }));
  jogo.palco.append(pista);
  // tocar fora das partes também conta para os pequenininhos, mas só perto da parte certa
  caixa.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".alvo")) return;
    const r = caixa.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
    if (atual && PARTES[atual].some(([px, py]) => Math.hypot((px - x) * 0.32, py - y) < 9)) acertou();
  });
  setTimeout(proxima, 900);
}

function proxima() {
  if (!fila.length) {
    caixa.classList.add("festa");
    sons.vitoria();
    setTimeout(() => jogo.vencer({ titulo: "Great job!", estrelas: null, texto: "O Rabisco dançou com você!", proximo: true }), 2200);
    return;
  }
  atual = fila.shift();
  for (const a of caixa.querySelectorAll(".alvo")) a.classList.toggle("brilha", a.dataset.parte === atual);
  document.querySelector(".palavra-en").textContent = atual.toUpperCase();
  jogo.placar(`🕺 ${feitas}/${feitas + fila.length + 1}`);
  falar(`en-touch-${atual}`);
}

function tocou(parte) { if (parte === atual) acertou(); else sons.bipe(); }
function acertou() {
  if (jogo.estado !== "jogando" || jogo.pausado || ocupado || !atual) return;
  ocupado = true;
  falar(`en-${atual}`);
  for (let i = 0; i < 4; i++) setTimeout(() => sons.nota(i * 2), i * 120);
  caixa.classList.remove("danca"); void caixa.offsetWidth; caixa.classList.add("danca");
  for (const a of caixa.querySelectorAll(".alvo.brilha")) {
    for (let i = 0; i < 5; i++) {
      const nota = el("span", { class: "notinha", texto: ["🎵", "🎶", "⭐"][i % 3], style: `left:${a.style.left}; top:${a.style.top}; --dx:${(i - 2) * 30}px` });
      caixa.append(nota);
      setTimeout(() => nota.remove(), 1100);
    }
  }
  feitas++;
  atual = null;
  for (const a of caixa.querySelectorAll(".alvo")) a.classList.remove("brilha");
  setTimeout(() => { ocupado = false; proxima(); }, 1500);
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, acertou, get atual() { return atual; } };
