// Toca e Pinta (bebês, 4 meses a 1 ano e meio): cada toque em qualquer lugar pinta mais um pedaço
// do desenho com a cor de verdade, com som e brilho. Qualquer tecla ou botão do controle também pinta.
// Sem erro, sem tempo: quando tudo fica colorido, festa e outro desenho.

import { criarCasca } from "../../src/motor/casca.js";
import { montarDesenho } from "../../src/motor/colorir.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

const ORDEM = ["casa", "peixe", "jardim", "onibus", "foguete", "rabisco"];
let vez = 0, desenho = null, fila = [];

const jogo = criarCasca({
  titulo: "Toca e Pinta",
  sub: "Cada toque pinta um pedaço!",
  faixa: "bebes",
  cor: "#FFB13B",
  dica: { teclado: "Qualquer tecla pinta", toque: "Toque em qualquer lugar", controle: "Qualquer botão pinta" },
  falas: { titulo: "tp-titulo", vitoria: "tp-vitoria" },
  menuNoJogo: false,
  teclado: false,
  aoComecar: montar,
  aoControle: ({ apertou }) => { if (apertou.confirma || apertou.voltar || apertou.esq || apertou.dir || apertou.cima || apertou.baixo) pintarProximo(); },
});

function montar() {
  const id = ORDEM[vez % ORDEM.length];
  vez++;
  const quadro = document.createElement("div");
  quadro.className = "quadro-bebe";
  jogo.palco.append(quadro);
  desenho = montarDesenho(quadro, id, { aoTocar: () => {} });
  // pinta do fundo para a frente, mas os pedaços grandes primeiro deixam a cena "acender" rápido
  fila = [...desenho.partes];
  jogo.placar(`🎨 0/${fila.length}`);
  falar(desenho.des.fala);
}

// toque em qualquer lugar do palco
addEventListener("pointerdown", (e) => {
  if (jogo.estado !== "jogando" || jogo.pausado || e.target.closest("button")) return;
  pintarProximo(e.clientX, e.clientY);
});
addEventListener("keydown", (e) => {
  if (jogo.estado !== "jogando" || jogo.pausado || e.repeat || ["p", "P", "Escape"].includes(e.key)) return;
  pintarProximo();
});

function pintarProximo(x, y) {
  const el = fila.shift();
  if (!el) return;
  desenho.pintar(el, desenho.corCerta(el).hex);
  sons.moeda();
  brilho(x, y);
  const feitas = desenho.partes.length - fila.length;
  jogo.placar(`🎨 ${feitas}/${desenho.partes.length}`);
  if (!fila.length) setTimeout(() => jogo.vencer({ titulo: "Que lindo!", estrelas: null, texto: desenho.des.nome, proximo: false }), 500);
}

// estrelinhas no lugar do toque
function brilho(x = innerWidth / 2, y = innerHeight / 2) {
  for (let i = 0; i < 8; i++) {
    const s = document.createElement("div");
    s.className = "brilho";
    s.textContent = ["⭐", "✨", "💖"][i % 3];
    const a = (i / 8) * Math.PI * 2;
    s.style.left = `${x}px`; s.style.top = `${y}px`;
    s.style.setProperty("--dx", `${Math.cos(a) * 90}px`);
    s.style.setProperty("--dy", `${Math.sin(a) * 90}px`);
    document.body.append(s);
    setTimeout(() => s.remove(), 800);
  }
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, get fila() { return fila; }, pintarProximo };
