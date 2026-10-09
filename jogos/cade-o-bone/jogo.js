// Cadê o Boné? (bebês): esconde-esconde com o Rabisco. Um toque fecha a cortina ("Cadê?");
// outro toque abre e o Rabisco aparece com um chapéu diferente ("Achou!"). Qualquer botão também serve.

import { criarCasca, el } from "../../src/motor/casca.js";
import { montarRabisco } from "../../src/motor/camarim.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

const CHAPEUS = [null, "coroa", "chapeu-chef", "capacete-bombeiro", "gorro", "chapeu-sol", "sueste", "capacete-astronauta", "bone-time"];
const RODADAS = 8;
let rabisco = null, cortina = null, fechada = false, vez = 0, achados = 0, ocupado = false;

const jogo = criarCasca({
  titulo: "Cadê o Boné?",
  sub: "Toque para esconder e achar o Rabisco!",
  faixa: "bebes",
  cor: "#FFB13B",
  dica: { teclado: "Qualquer tecla esconde e acha", toque: "Toque em qualquer lugar", controle: "Qualquer botão esconde e acha" },
  falas: { titulo: "cb-titulo", vitoria: "cb-vitoria" },
  menuNoJogo: false,
  teclado: false,
  aoComecar: montar,
  aoControle: ({ apertou }) => { if (Object.values(apertou).some(Boolean) && !apertou.start) alternar(); },
});

function montar() {
  achados = 0; fechada = false; ocupado = false;
  const cena = el("div", { class: "cena-cortina" });
  jogo.palco.append(cena);
  rabisco = montarRabisco(cena);
  cortina = el("div", { class: "cortina" }, [el("div", { class: "pano esq" }), el("div", { class: "pano dir" })]);
  cena.append(cortina);
  jogo.placar(`🙈 0/${RODADAS}`);
}

addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) alternar(); });
addEventListener("keydown", (e) => { if (!e.repeat && !["p", "P", "Escape"].includes(e.key)) alternar(); });

function alternar() {
  if (jogo.estado !== "jogando" || jogo.pausado || ocupado) return;
  ocupado = true;
  setTimeout(() => { ocupado = false; }, 700);
  if (!fechada) {
    fechada = true;
    cortina.classList.add("fechada");
    sons.cano();
    setTimeout(() => falar("cb-cade"), 300);
    // troca o chapéu enquanto ninguém vê
    setTimeout(() => {
      vez = (vez + 1) % CHAPEUS.length;
      const c = CHAPEUS[vez];
      if (c) rabisco.vestir(c); else rabisco.tirar("cabeca");
    }, 500);
  } else {
    fechada = false;
    cortina.classList.remove("fechada");
    sons.vitoria();
    rabisco.animar("pula");
    setTimeout(() => falar("cb-achou"), 250);
    achados++;
    jogo.placar(`🙈 ${achados}/${RODADAS}`);
    if (achados >= RODADAS) setTimeout(() => jogo.vencer({ titulo: "Achou!", estrelas: null, texto: "Você achou o Rabisco!", proximo: false }), 1200);
  }
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, alternar, get achados() { return achados; } };
