// Cadê o Boné? (bebês): esconde-esconde com o Rabisco. Um toque fecha a cortina ("Cadê?");
// outro toque abre e o Rabisco aparece com um chapéu diferente ("Achou!"). Qualquer botão também serve.

import { criarCasca, el } from "../../src/motor/casca.js";
import { montarRabisco } from "../../src/motor/camarim.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

// 10 fases: cada uma é um teatrinho com cortina, fundo e chapéus próprios
const FASES = [
  { nome: "Teatro", cortina: ["#c1121f", "#e63946"], fundo: ["#fff6d8", "#ffd27a"], chapeus: [null, "coroa", "chapeu-chef", "gorro"] },
  { nome: "Praia", cortina: ["#0077b6", "#00b4d8"], fundo: ["#fff3c4", "#7fd6ff"], chapeus: [null, "chapeu-sol", "oculos-sol", "boia"] },
  { nome: "Bombeiro", cortina: ["#9d0208", "#dc2f02"], fundo: ["#ffe8d6", "#ffb38a"], chapeus: [null, "capacete-bombeiro", "farda-bombeiro", "mangueira"] },
  { nome: "Cozinha", cortina: ["#2a9d8f", "#52b788"], fundo: ["#ffffff", "#ffe5ec"], chapeus: [null, "chapeu-chef", "dolma-chef", "colher-pau"] },
  { nome: "Chuva", cortina: ["#3a0ca3", "#4361ee"], fundo: ["#dfe7f2", "#9db4c8"], chapeus: [null, "sueste", "capa-chuva", "guarda-chuva"] },
  { nome: "Neve", cortina: ["#4895ef", "#90e0ef"], fundo: ["#ffffff", "#cfe9ff"], chapeus: [null, "gorro", "cachecol", "casaco"] },
  { nome: "Espaço", cortina: ["#240046", "#5a189a"], fundo: ["#3c096c", "#10002b"], chapeus: [null, "capacete-astronauta", "traje-astronauta", "botas-astronauta"] },
  { nome: "Futebol", cortina: ["#2d6a4f", "#40916c"], fundo: ["#d8f3dc", "#95d5b2"], chapeus: [null, "bone-time", "camisa-time", "bola"] },
  { nome: "Médico", cortina: ["#0096c7", "#48cae4"], fundo: ["#ffffff", "#caf0f8"], chapeus: [null, "jaleco", "estetoscopio", "oculos-sol"] },
  { nome: "Festa", cortina: ["#d63384", "#ff8fab"], fundo: ["#fff0f6", "#ffc2d1"], chapeus: [null, "coroa", "camisa-listrada", "chapeu-sol", "gorro", "bone-time"] },
];
let CHAPEUS = FASES[0].chapeus;
const RODADAS = 6;
let rabisco = null, cortina = null, fechada = false, vez = 0, achados = 0, ocupado = false;

const jogo = criarCasca({
  titulo: "Cadê o Boné?",
  sub: "Toque para esconder e achar o Rabisco!",
  faixa: "bebes",
  cor: "#FFB13B",
  dica: { teclado: "Qualquer tecla esconde e acha", toque: "Toque em qualquer lugar", controle: "Qualquer botão esconde e acha" },
  niveis: FASES.map((f, i) => ({ nome: `${i + 1}`, desc: f.nome })),
  falas: { titulo: "cb-titulo", vitoria: "cb-vitoria" },
  menuNoJogo: false,
  teclado: false,
  aoComecar: montar,
  aoControle: ({ apertou }) => { if (Object.values(apertou).some(Boolean) && !apertou.start) alternar(); },
});

function montar(n) {
  const F = FASES[n - 1];
  CHAPEUS = F.chapeus; vez = 0;
  achados = 0; fechada = false; ocupado = false;
  const cena = el("div", { class: "cena-cortina", style: `--fundo1:${F.fundo[0]}; --fundo2:${F.fundo[1]}; --pano1:${F.cortina[0]}; --pano2:${F.cortina[1]}` });
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
      rabisco.limpar();
      if (c) rabisco.vestir(c);
    }, 500);
  } else {
    fechada = false;
    cortina.classList.remove("fechada");
    sons.vitoria();
    rabisco.animar("pula");
    setTimeout(() => falar("cb-achou"), 250);
    achados++;
    jogo.placar(`🙈 ${achados}/${RODADAS}`);
    if (achados >= RODADAS) setTimeout(() => jogo.vencer({ titulo: "Achou!", estrelas: null, texto: "Você achou o Rabisco!", proximo: true }), 1200);
  }
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, alternar, get achados() { return achados; } };
