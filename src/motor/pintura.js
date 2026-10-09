// Jogo de pintar livre (Colorir Mágico e Ateliê do Rabisco): escolhe a cor e toca na parte do desenho;
// a tinta nunca sai da linha. O Ateliê liga também o pincel livre, os adesivos e o pote de misturar cores.
//
//   jogoDePintar({ titulo, faixa, cores: ["vermelho", ...], ferramentas: true, misturar: true, ... })

import { criarCasca, el } from "./casca.js";
import { montarDesenho, misturar } from "./colorir.js";
import { DESENHOS, corPorId } from "./desenhos.js";
import { sons } from "./sons.js";
import { falar } from "./voz.js";
import { focar } from "./controle.js";

// misturas que a criança descobre no Ateliê (a fala diz o resultado)
const MISTURAS = { // chave: os dois ids em ordem alfabética
  "amarelo+azul": "verde", "amarelo+vermelho": "laranja", "azul+vermelho": "roxo", "branco+vermelho": "rosa",
  "branco+preto": "cinza", "azul+branco": "ciano", "branco+marrom": "bege", "laranja+preto": "marrom", "branco+verde": "verde-claro",
};
const ADESIVOS = ["⭐", "❤️", "🌸", "🦋", "☀️", "🌈", "🐞", "🎈"];
const NS = "http://www.w3.org/2000/svg";

export function jogoDePintar({ titulo, sub, faixa, cor, cores, ferramentas = false, pote = false, falas = {}, tam = 56 }) {
  const ids = Object.keys(DESENHOS);
  let desenho = null, corAtual = corPorId[cores[0]].hex, ferramenta = "balde", adesivo = ADESIVOS[0];
  let paleta = [...cores];
  let pinceis = [];

  const jogo = criarCasca({
    titulo, sub, faixa, cor,
    niveis: ids.map((id) => ({ nome: DESENHOS[id].nome, desc: "" })),
    dica: {
      teclado: "Setas para escolher · Enter para pintar · P para pausar",
      toque: "Escolha a cor e toque no desenho",
      controle: "Direcional para escolher · A para pintar · Start para pausar",
    },
    falas,
    aoComecar: (n) => montar(ids[n - 1]),
  });

  function montar(id) {
    paleta = [...cores];
    const mesa = el("div", { class: "mesa-colorir" });
    const quadro = el("div", { class: "quadro" });
    const lado = el("div", { class: "lado" });
    mesa.append(quadro, lado);
    jogo.palco.append(mesa);
    desenho = montarDesenho(quadro, id, { aoTocar: tocar });
    pinceis = [];

    // pincel livre (Ateliê): uma camada de traços por cima do desenho, presa à mesma moldura
    if (ferramentas) {
      const camada = document.createElementNS(NS, "g");
      camada.setAttribute("class", "tracos");
      desenho.svg.append(camada);
      ligarPincel(desenho.svg, camada);
    }
    desenharLado(lado);
    jogo.placar(`🖍️ ${DESENHOS[id].nome}`);
    falar(DESENHOS[id].fala);
  }

  function desenharLado(lado) {
    lado.innerHTML = "";
    if (ferramentas) {
      const barra = el("div", { class: "ferramentas", role: "group", "aria-label": "Ferramentas" });
      for (const [f, ic, nome] of [["balde", "🪣", "Balde de tinta"], ["pincel", "🖌️", "Pincel"], ["adesivo", "⭐", "Adesivos"]]) {
        barra.append(el("button", { class: `ferramenta ${ferramenta === f ? "escolhida" : ""}`, "aria-label": nome, texto: ic, onclick: () => { ferramenta = f; desenharLado(lado); sons.bipe(); } }));
      }
      lado.append(barra);
      if (ferramenta === "adesivo") {
        const ads = el("div", { class: "adesivos" });
        for (const a of ADESIVOS) ads.append(el("button", { class: `adesivo ${a === adesivo ? "escolhida" : ""}`, texto: a, "aria-label": `Adesivo ${a}`, onclick: () => { adesivo = a; desenharLado(lado); } }));
        lado.append(ads);
      }
    }
    if (ferramenta !== "adesivo") {
      const pal = el("div", { class: "paleta", role: "group", "aria-label": "Cores" });
      pal.style.setProperty("--tam", `${tam}px`);
      for (const id of paleta) {
        const c = corPorId[id] ?? { id, nome: "cor nova", hex: id };
        const b = el("button", { class: `cor ${c.hex === corAtual ? "escolhida" : ""}`, "aria-label": c.nome, style: `background:${c.hex}`, onclick: () => escolherCor(c, b) });
        pal.append(b);
      }
      lado.append(pal);
    }
    if (pote) {
      lado.append(el("button", { class: "botao-pote", html: "🧪 Misturar", onclick: abrirPote }));
    }
    lado.append(el("button", { class: "botao pronto", texto: "Pronto ✓", onclick: terminar }));
  }

  function escolherCor(c, b) {
    corAtual = c.hex;
    for (const x of document.querySelectorAll(".paleta .cor")) x.classList.toggle("escolhida", x === b);
    sons.bipe();
    if (corPorId[c.id]) falar(`cor-${c.id}`);
  }

  // toque/clique de verdade tem e.detail ≥ 1; controle e teclado chegam com 0
  function tocar(parte, e) {
    if (jogo.pausado) return;
    const deVerdade = e?.detail > 0;
    if (ferramenta === "adesivo") { if (!deVerdade) colarAdesivo(centroDe(parte)); return; } // com o dedo, o adesivo vai onde tocou
    if (ferramenta === "pincel" && deVerdade) return; // com o dedo, o pincel desenha traços
    desenho.pintar(parte, corAtual);
    sons.pulo();
  }

  const centroDe = (parte) => { const b = parte.getBBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  function colarAdesivo([x, y]) {
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("class", "adesivo-colado");
    t.textContent = adesivo;
    desenho.svg.querySelector(".tracos").append(t);
    sons.moeda();
  }

  // traços livres com o dedo ou o mouse (só no modo pincel)
  function ligarPincel(svg, camada) {
    let traco = null;
    const ponto = (e) => { const r = svg.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 400, ((e.clientY - r.top) / r.height) * 300]; };
    svg.addEventListener("pointerdown", (e) => {
      if (ferramenta === "adesivo") { colarAdesivo(ponto(e)); return; }
      if (ferramenta !== "pincel" || jogo.pausado) return;
      e.preventDefault();
      svg.setPointerCapture(e.pointerId);
      const [x, y] = ponto(e);
      traco = document.createElementNS(NS, "path");
      traco.setAttribute("class", "traco");
      traco.setAttribute("stroke", corAtual);
      traco.setAttribute("d", `M${x.toFixed(1)},${y.toFixed(1)} l0.1,0`);
      camada.append(traco);
      pinceis.push(traco);
    });
    svg.addEventListener("pointermove", (e) => {
      if (!traco) return;
      const [x, y] = ponto(e);
      traco.setAttribute("d", `${traco.getAttribute("d")} L${x.toFixed(1)},${y.toFixed(1)}`);
    });
    const fim = () => { traco = null; };
    svg.addEventListener("pointerup", fim);
    svg.addEventListener("pointercancel", fim);
  }

  // pote de misturar: escolhe duas cores e descobre a nova
  function abrirPote() {
    const escolha = [];
    const fundo = el("div", { class: "pote-fundo" });
    const cartao = el("div", { class: "casca-cartao pote", role: "dialog", "aria-label": "Misturar cores" });
    const titulo = el("div", { class: "titulo", texto: "Misturar" });
    const potes = el("div", { class: "potes" }, [el("div", { class: "pote-cor" }), el("span", { texto: "+" }), el("div", { class: "pote-cor" }), el("span", { texto: "=" }), el("div", { class: "pote-cor resultado", texto: "?" })]);
    const pal = el("div", { class: "paleta" });
    for (const id of paleta) {
      const c = corPorId[id] ?? { id, nome: "cor nova", hex: id };
      pal.append(el("button", { class: "cor", "aria-label": c.nome, style: `background:${c.hex}`, onclick: () => pegar(c) }));
    }
    const fechar = el("button", { class: "botao branco", texto: "Voltar", onclick: () => { fundo.remove(); } });
    cartao.append(titulo, potes, pal, el("div", { class: "botoes" }, [fechar]));
    fundo.append(cartao);
    jogo.palco.append(fundo);
    focar(pal.querySelector("button"));
    function pegar(c) {
      if (escolha.length >= 2) return;
      escolha.push(c);
      const p = potes.querySelectorAll(".pote-cor")[escolha.length - 1];
      p.style.background = c.hex;
      sons.bipe();
      if (escolha.length < 2) return;
      const [a, b] = escolha;
      const chave = [a.id, b.id].sort().join("+");
      const nome = MISTURAS[chave];
      const nova = nome ? corPorId[nome] : { id: misturar(a.hex, b.hex), nome: "cor nova", hex: misturar(a.hex, b.hex) };
      const r = potes.querySelector(".resultado");
      setTimeout(() => {
        r.style.background = nova.hex; r.textContent = ""; r.classList.add("mexe");
        sons.vitoria();
        if (nome) { jogo.aviso(`${a.nome} + ${b.nome} = ${nova.nome}!`, "bom", 2600); falar(`mix-${chave}`); }
        else jogo.aviso("Uma cor nova!", "bom");
        if (!paleta.includes(nova.id)) paleta.push(nova.id);
        if (!corPorId[nova.id]) corPorId[nova.id] = nova;
        corAtual = nova.hex;
        setTimeout(() => { fundo.remove(); desenharLado(document.querySelector(".mesa-colorir .lado")); }, 1900);
      }, 500);
    }
  }

  function terminar() {
    const pintadas = desenho.partes.filter((p) => p.dataset.pintada).length;
    if (pintadas === 0 && !pinceis.length) { jogo.aviso("Pinte um pouquinho primeiro!"); return; }
    // o desenho pronto vai junto para o cartão da vitória
    const copia = desenho.svg.cloneNode(true);
    copia.classList.add("miniatura");
    for (const x of copia.querySelectorAll(".controle-foco")) x.classList.remove("controle-foco");
    jogo.vencer({ titulo: "Que obra de arte!", estrelas: null, texto: "Ficou lindo!", extra: copia, proximo: true });
  }

  return jogo;
}
