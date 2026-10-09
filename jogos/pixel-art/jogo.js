// Pixel Art do Rabisco (9 a 12 anos): monte o desenho numa grade 10 × 10 seguindo as coordenadas,
// como na batalha naval. Nível 1: casas soltas (B3, C3...). Nível 2: trechos de linha (B3 a F3).
// Nível 3: pares ordenados (x, y) no plano cartesiano, com a origem embaixo à esquerda.

import { criarCasca, el, ajustarGrade } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

const CORES = { R: ["vermelho", "#e63946"], Y: ["amarelo", "#ffcc1f"], P: ["preto", "#2b2b2b"], A: ["azul", "#1d6fe0"], G: ["verde", "#2bb24c"], M: ["marrom", "#8b5a2b"], L: ["laranja", "#ff7a00"], C: ["azul-claro", "#7fd6ff"], K: ["rosa", "#ec2e8c"], B: ["bege", "#f6d7b0"] };
// desenhos 10 × 10 (linha de cima primeiro); "." = vazio
const DESENHOS = {
  "um coração": ["..........", "..........", "..RR..RR..", ".RRRRRRRR.", ".RRRRRRRR.", "..RRRRRR..", "...RRRR...", "....RR....", "..........", ".........."],
  "uma carinha feliz": ["..........", "...YYYY...", "..YYYYYY..", ".YYPYYPYY.", ".YYYYYYYY.", ".YPYYYYPY.", ".YYPPPPYY.", "..YYYYYY..", "...YYYY...", ".........."],
  "uma casa": ["....R.....", "...RRR....", "..RRRRR...", ".RRRRRRR..", "..YYYYY...", "..YCYMY...", "..YYYMY...", "..YYYMY...", "GGGGGGGGGG", ".........."],
  "o Rabisco": ["....P.....", "...BBB....", "..LLLLL...", "...AAA....", "...APA....", "...AAA....", "..KKKKK...", "...KKK....", "...B.B....", "...A.A...."],
  "um peixe": ["..........", "..........", "....LLL...", "L..LLLLL..", "LLLLLLPLL.", "LLLLLLLLL.", "L..LLLLL..", "....LLL...", "..........", ".........."],
  "uma árvore": ["...GGGG...", "..GGGGGG..", ".GGGGGGGG.", ".GGGGGGGG.", "..GGGGGG..", "....MM....", "....MM....", "....MM....", "...MMMM...", "GGGGGGGGGG"],
};
const NIVEIS = [
  { nome: "Nível 1", desc: "Casas: B3, C3", modo: "casas" },
  { nome: "Nível 2", desc: "Trechos: B3 a F3", modo: "trechos" },
  { nome: "Nível 3", desc: "Pares (x, y)", modo: "pares" },
];
const COLUNAS = "ABCDEFGHIJ";
let alvo = {}, pintadas = 0, total = 0, erros = 0, corAtual = null, nome = "", ultimo = null, soltar = null;

const jogo = criarCasca({
  titulo: "Pixel Art do Rabisco",
  sub: "Siga as coordenadas e descubra o desenho!",
  faixa: "maiores",
  cor: "#1FC08E",
  niveis: NIVEIS,
  dica: { teclado: "Setas para andar · Enter para pintar · P para pausar", toque: "Escolha a cor e toque nas casas das coordenadas", controle: "Direcional para andar · A para pintar · Start para pausar" },
  falas: { titulo: "px-titulo", vitoria: "px-vitoria" },
  aoComecar: montar,
});

// nome da casa: nos níveis 1 e 2 é letra + número (linha 1 em cima); no 3, (x, y) com y = 0 embaixo
const nomeCasa = (x, y, modo) => (modo === "pares" ? `(${x}, ${9 - y})` : `${COLUNAS[x]}${y + 1}`);

function instrucoes(desenho, modo) {
  const porCor = {};
  desenho.forEach((linha, y) => [...linha].forEach((c, x) => { if (c !== ".") (porCor[c] ??= []).push([x, y]); }));
  return Object.entries(porCor).map(([c, casas]) => {
    let itens;
    if (modo === "trechos") {
      // junta casas vizinhas da mesma linha: B3 a F3
      itens = [];
      for (let i = 0; i < casas.length; i++) {
        let j = i;
        while (j + 1 < casas.length && casas[j + 1][1] === casas[i][1] && casas[j + 1][0] === casas[j][0] + 1) j++;
        itens.push(j > i ? `${nomeCasa(...casas[i], modo)} a ${nomeCasa(...casas[j], modo)}` : nomeCasa(...casas[i], modo));
        i = j;
      }
    } else itens = casas.map((k) => nomeCasa(...k, modo));
    return { c, itens };
  });
}

function montar(n) {
  const modo = NIVEIS[n - 1].modo;
  const nomes = Object.keys(DESENHOS).filter((k) => k !== ultimo);
  nome = new URLSearchParams(location.search).get("desenho") ?? nomes[Math.floor(Math.random() * nomes.length)];
  ultimo = nome;
  const desenho = DESENHOS[nome];
  alvo = {}; pintadas = 0; erros = 0; corAtual = null;
  desenho.forEach((linha, y) => [...linha].forEach((c, x) => { if (c !== ".") alvo[`${x},${y}`] = c; }));
  total = Object.keys(alvo).length;

  const mesa = el("div", { class: "mesa-pixel" });
  const quadro = el("div", { class: "quadro-pixel" });
  const tab = el("div", { class: `tabuleiro modo-${modo}` });
  // cabeçalhos: letras em cima e números do lado (ou eixos x e y no plano cartesiano)
  tab.append(el("div", { class: "canto" }));
  for (let x = 0; x < 10; x++) tab.append(el("div", { class: "eixo", texto: modo === "pares" ? x : COLUNAS[x] }));
  for (let y = 0; y < 10; y++) {
    tab.append(el("div", { class: "eixo", texto: modo === "pares" ? 9 - y : y + 1 }));
    for (let x = 0; x < 10; x++) {
      const b = el("button", { class: "pixel", "aria-label": nomeCasa(x, y, modo) });
      b.dataset.k = `${x},${y}`;
      b.addEventListener("click", () => pintar(b));
      tab.append(b);
    }
  }
  quadro.append(tab);
  const lado = el("div", { class: "lado-pixel" });
  const pal = el("div", { class: "paleta-pixel", role: "group", "aria-label": "Cores" });
  const lista = el("div", { class: "instrucoes" });
  for (const { c, itens } of instrucoes(desenho, modo)) {
    const [nomeCor, hex] = CORES[c];
    const b = el("button", { class: "cor-pixel", style: `--c:${hex}`, html: `<span class="bolinha"></span>${nomeCor}`, onclick: () => escolher(c, b) });
    pal.append(b);
    lista.append(el("p", { html: `<b style="color:${hex}">●</b> <b>${nomeCor}:</b> ${itens.join(", ")}` }));
  }
  lado.append(pal, lista);
  mesa.append(quadro, lado);
  jogo.palco.append(mesa);
  soltar?.();
  soltar = ajustarGrade(tab, 121, { aspecto: 1, folga: 2, maxLado: 46, colunas: 11, reservar: 16, reservarLargura: 16 });
  escolher(instrucoes(desenho, modo)[0].c, pal.querySelector("button"));
  atualizarPlacar();
  falar(`px-nivel-${n}`);
}

function escolher(c, b) {
  corAtual = c;
  for (const x of document.querySelectorAll(".cor-pixel")) x.classList.toggle("escolhida", x === b);
  sons.bipe();
}

function pintar(b) {
  if (jogo.pausado || jogo.estado !== "jogando" || b.classList.contains("cheio")) return;
  const certo = alvo[b.dataset.k];
  if (certo === corAtual) {
    b.style.background = CORES[certo][1];
    b.classList.add("cheio");
    pintadas++;
    sons.pulo();
    atualizarPlacar();
    if (pintadas === total) {
      for (const p of document.querySelectorAll(".pixel:not(.cheio)")) p.classList.add("some");
      const estrelas = erros === 0 ? 3 : erros <= 3 ? 2 : 1;
      setTimeout(() => jogo.vencer({ estrelas, texto: `É ${nome}! ${erros ? `${erros} ${erros === 1 ? "casa errada" : "casas erradas"}.` : "Sem nenhum erro!"}` }), 700);
    }
  } else {
    erros++;
    sons.erro();
    b.classList.remove("errou"); void b.offsetWidth; b.classList.add("errou");
    jogo.aviso(certo ? `${b.getAttribute("aria-label")} é de outra cor` : `${b.getAttribute("aria-label")} fica vazia`, "", 1500);
  }
}
const atualizarPlacar = () => jogo.placar(`🟥 ${pintadas}/${total}`);

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, get alvo() { return alvo; }, escolher: (c) => escolher(c, [...document.querySelectorAll(".cor-pixel")].find((b) => b.textContent === CORES[c][0])) };
