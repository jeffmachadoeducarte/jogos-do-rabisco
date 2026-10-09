// Pinte pelos Números (6 a 8 anos): cada parte do desenho tem uma continha; o resultado é o número
// da cor. Escolha a cor numerada e toque na parte: se a conta bater, ela se pinta e a figura aparece.

import { criarCasca, el } from "../../src/motor/casca.js";
import { montarDesenho } from "../../src/motor/colorir.js";
import { DESENHOS, corPorId } from "../../src/motor/desenhos.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

const NIVEIS = [
  { nome: "Nível 1", desc: "Somas até 10", conta: (r) => { const a = Math.floor(Math.random() * r); return `${a}+${r - a}`; } },
  { nome: "Nível 2", desc: "Somas e subtrações", conta: (r) => Math.random() < 0.5 ? (() => { const a = Math.floor(Math.random() * (r + 1)); return `${a}+${r - a}`; })() : (() => { const b = 1 + Math.floor(Math.random() * 9); return `${r + b}−${b}`; })() },
  { nome: "Nível 3", desc: "Contas maiores", conta: (r) => { const b = 6 + Math.floor(Math.random() * 10); return `${r + b}−${b}`; } },
];
const IDS = Object.keys(DESENHOS);
let desenho = null, numeros = [], escolhido = null, erros = 0, ultimo = -1;

const jogo = criarCasca({
  titulo: "Pinte pelos Números",
  sub: "Resolva a conta para saber a cor!",
  faixa: "alfabetizacao",
  cor: "#00B5F0",
  niveis: NIVEIS,
  dica: { teclado: "Setas para escolher · Enter para pintar · P para pausar", toque: "Escolha a cor do número e toque na parte com a conta", controle: "Direcional para escolher · A para pintar · Start para pausar" },
  falas: { titulo: "pn-titulo", vitoria: "pn-vitoria" },
  aoComecar: montar,
});

function montar(n) {
  let k; do { k = Math.floor(Math.random() * IDS.length); } while (k === ultimo && IDS.length > 1);
  ultimo = k;
  const id = new URLSearchParams(location.search).get("desenho") ?? IDS[k]; // ?desenho=casa escolhe o desenho
  erros = 0; escolhido = null;
  // cada cor usada no desenho ganha um número (1, 2, 3...)
  const usadas = [...new Set(DESENHOS[id].partes.filter((p) => !p.includes("data-fixa")).map((p) => p.match(/data-cor="([^"]+)"/)[1]))];
  numeros = usadas.map((cor, i) => ({ n: i + 1, cor: corPorId[cor] }));
  const numDe = (cor) => numeros.find((x) => x.cor.id === cor).n;

  const mesa = el("div", { class: "mesa-colorir" });
  const quadro = el("div", { class: "quadro" });
  const lado = el("div", { class: "lado" });
  mesa.append(quadro, lado);
  jogo.palco.append(mesa);
  desenho = montarDesenho(quadro, id, { aoTocar: tocar, rotulos: (parte) => NIVEIS[n - 1].conta(numDe(parte.dataset.cor)) });
  const pal = el("div", { class: "paleta numerada", role: "group", "aria-label": "Cores numeradas" });
  for (const x of numeros) {
    const b = el("button", { class: "cor", "aria-label": `Cor ${x.n}: ${x.cor.nome}`, style: `background:${x.cor.hex}`, html: `<span class="num">${x.n}</span>`, onclick: () => escolher(x, b) });
    pal.append(b);
  }
  lado.append(pal);
  atualizarPlacar();
}

function atualizarPlacar() {
  const feitas = desenho.partes.filter((p) => p.dataset.pintada).length;
  jogo.placar(`🖍️ ${feitas}/${desenho.partes.length}`);
}

function escolher(x, b) {
  escolhido = x;
  for (const c of document.querySelectorAll(".paleta .cor")) c.classList.toggle("escolhida", c === b);
  sons.bipe();
}

function tocar(parte) {
  if (jogo.pausado || parte.dataset.pintada) return;
  if (!escolhido) { jogo.aviso("Escolha uma cor primeiro!"); falar("pn-escolha"); return; }
  if (escolhido.cor.id !== parte.dataset.cor) {
    erros++;
    sons.erro();
    parte.classList.remove("errou"); void parte.getBBox(); parte.classList.add("errou");
    jogo.aviso(`${parte._rotulo.textContent.replace("−", " − ").replace("+", " + ")} não dá ${escolhido.n}`, "", 1600);
    return;
  }
  desenho.pintar(parte, escolhido.cor.hex);
  sons.moeda();
  atualizarPlacar();
  if (desenho.todasPintadas()) {
    const estrelas = erros === 0 ? 3 : erros <= 3 ? 2 : 1;
    const copia = desenho.svg.cloneNode(true);
    copia.classList.add("miniatura");
    for (const x of copia.querySelectorAll(".controle-foco")) x.classList.remove("controle-foco");
    jogo.vencer({ estrelas, texto: `É ${desenho.des.nome.toLowerCase()}! ${erros ? `${erros} ${erros === 1 ? "conta errada" : "contas erradas"}.` : "Nenhum erro!"}`, extra: copia });
  }
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, get desenho() { return desenho; }, get numeros() { return numeros; } };
