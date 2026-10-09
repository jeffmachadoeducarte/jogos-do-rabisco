// Bi-bi, Ônibus! (bebês): toque no ônibus da escola e ele anda, buzina ("bi-bi!") e acende luzes
// coloridas. Cada toque faz uma coisa diferente. Qualquer tecla ou botão do controle também serve.

import { criarCasca, el } from "../../src/motor/casca.js";
import { montarDesenho } from "../../src/motor/colorir.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

const META = 9;
let vez = 0, toques = 0, ocupado = false, onibus = null;

const jogo = criarCasca({
  titulo: "Bi-bi, Ônibus!",
  sub: "Toque no ônibus da escola!",
  faixa: "bebes",
  cor: "#FFB13B",
  dica: { teclado: "Qualquer tecla", toque: "Toque no ônibus", controle: "Qualquer botão" },
  falas: { titulo: "bb-titulo", vitoria: "bb-vitoria" },
  menuNoJogo: false,
  teclado: false,
  aoComecar: montar,
  aoControle: ({ apertou }) => { if (Object.entries(apertou).some(([k, v]) => v && k !== "start")) tocar(); },
});

function montar() {
  toques = 0; ocupado = false;
  const rua = el("div", { class: "rua" });
  onibus = el("div", { class: "onibus-bebe" });
  rua.append(onibus);
  jogo.palco.append(rua);
  // o ônibus é o desenho de colorir, já pintado
  const d = montarDesenho(onibus, "onibus", { comCores: true });
  for (const p of d.partes) { p.removeAttribute("data-foco"); p.removeAttribute("tabindex"); }
  for (const s of d.svg.querySelectorAll('[data-parte="céu"], [data-parte="rua"], [data-parte="faixa"], [data-parte="sol"]')) s.remove();
  d.svg.querySelectorAll('[data-parte="roda"], [data-parte="detalhe"]').forEach((r) => r.classList.add("roda"));
  d.svg.querySelector('[data-parte="farol"]').classList.add("farol");
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
    if (toques >= META) jogo.vencer({ titulo: "Bi-bi!", estrelas: null, texto: "O ônibus chegou na escola!", proximo: false });
  }, 1500);
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, tocar, get toques() { return toques; } };
