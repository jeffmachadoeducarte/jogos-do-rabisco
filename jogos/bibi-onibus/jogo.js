// Bi-bi, Ônibus! (bebês): toque no ônibus da escola e ele anda, buzina ("bi-bi!") e acende luzes
// coloridas. Cada toque faz uma coisa diferente. Qualquer tecla ou botão do controle também serve.

import { criarCasca, el } from "../../src/motor/casca.js";
import { montarDesenho } from "../../src/motor/colorir.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

// 10 passeios: um cenário e uma cor de ônibus em cada
const FASES = [
  { nome: "Escola", ceu: ["#2f9bff", "#d6f3ff"], grama: "#7dd36a", onibus: "#ffcc1f" },
  { nome: "Cidade", ceu: ["#4a9ee6", "#e5eef7"], grama: "#9aa3ad", onibus: "#e63946" },
  { nome: "Praia", ceu: ["#22b8ff", "#fff4d6"], grama: "#f3d9a4", onibus: "#00b5f0" },
  { nome: "Fazenda", ceu: ["#3aa7ff", "#f2f8e6"], grama: "#8ad15a", onibus: "#ff7a00" },
  { nome: "Neve", ceu: ["#8fc4ff", "#f4fbff"], grama: "#ffffff", onibus: "#2bb24c" },
  { nome: "Chuva", ceu: ["#5b7a99", "#9db4c8"], grama: "#5fa85a", onibus: "#8e6cff" },
  { nome: "Deserto", ceu: ["#46a8f0", "#fde7c2"], grama: "#e2b66a", onibus: "#ec2e8c" },
  { nome: "Montanha", ceu: ["#6aa8e8", "#e6eef8"], grama: "#58b46a", onibus: "#1d6fe0" },
  { nome: "Pôr do sol", ceu: ["#6a4fc4", "#ffb27a"], grama: "#7cbf4a", onibus: "#ffcc1f" },
  { nome: "Noite", ceu: ["#0b1b4a", "#2a3f86"], grama: "#2f7a3a", onibus: "#ff7a00" },
];
let F = FASES[0];
const META = 9;
let vez = 0, toques = 0, ocupado = false, onibus = null;

const jogo = criarCasca({
  titulo: "Bi-bi, Ônibus!",
  sub: "Toque no ônibus da escola!",
  faixa: "bebes",
  cor: "#FFB13B",
  dica: { teclado: "Qualquer tecla", toque: "Toque no ônibus", controle: "Qualquer botão" },
  niveis: FASES.map((f, i) => ({ nome: `${i + 1}`, desc: f.nome })),
  falas: { titulo: "bb-titulo", vitoria: "bb-vitoria" },
  menuNoJogo: false,
  teclado: false,
  aoComecar: montar,
  aoControle: ({ apertou }) => { if (Object.entries(apertou).some(([k, v]) => v && k !== "start")) tocar(); },
});

function montar(n) {
  F = FASES[n - 1];
  toques = 0; ocupado = false;
  const rua = el("div", { class: "rua", style: `--ceu1:${F.ceu[0]}; --ceu2:${F.ceu[1]}; --grama:${F.grama}` });
  onibus = el("div", { class: "onibus-bebe" });
  rua.append(onibus);
  jogo.palco.append(rua);
  // o ônibus é o desenho de colorir, já pintado
  const d = montarDesenho(onibus, "onibus", { comCores: true });
  for (const p of d.partes) { p.removeAttribute("data-foco"); p.removeAttribute("tabindex"); }
  for (const s of d.svg.querySelectorAll('[data-parte="céu"], [data-parte="rua"], [data-parte="faixa"], [data-parte="sol"]')) s.remove();
  d.svg.querySelectorAll('[data-parte="roda"], [data-parte="detalhe"]').forEach((r) => r.classList.add("roda"));
  d.svg.querySelector('[data-parte="farol"]').classList.add("farol");
  d.svg.querySelector('[data-parte="ônibus"]').style.fill = F.onibus;
  d.svg.querySelectorAll('[data-parte="janela"], [data-parte="para-brisa"]').forEach((j, i) => { j.classList.add("janela-luz"); j.style.setProperty("--i", i); });
  jogo.placar(`🚌 0/${META}`);
}

addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) tocar(); });
addEventListener("keydown", (e) => { if (!e.repeat && !["p", "P", "Escape"].includes(e.key)) tocar(); });

function tocar() {
  if (jogo.estado !== "jogando" || jogo.pausado || ocupado) return;
  ocupado = true;
  const acao = ["anda", "buzina", "luzes"][vez++ % 3];
  onibus.classList.remove("anda", "buzina", "luzes"); void onibus.offsetWidth; onibus.classList.add(acao);
  if (acao === "anda") { sons.turbo(); falar("bb-vrum"); }
  if (acao === "buzina") { sons.buzina(); setTimeout(() => falar("bb-bibi"), 650); }
  if (acao === "luzes") { [0, 1, 2, 3, 4, 5].forEach((i) => setTimeout(() => sons.nota(i), i * 160)); falar("bb-luzes"); }
  toques++;
  jogo.placar(`🚌 ${toques}/${META}`);
  setTimeout(() => {
    ocupado = false;
    if (toques >= META) jogo.vencer({ titulo: "Bi-bi!", estrelas: null, texto: `Passeio ${F.nome}: o ônibus chegou!`, proximo: true });
  }, 1500);
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, tocar, get toques() { return toques; } };
