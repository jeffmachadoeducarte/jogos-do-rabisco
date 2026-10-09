// Lojinha do Camarim (6 a 8 anos): o Rabisco quer comprar roupas novas. Nível 1: pague o preço certinho
// tocando nas moedas e notas. Nível 2: pague com uma nota de R$ 20 e escolha o troco. Nível 3: preços
// com centavos. Cada compra vai direto para o Rabisco.

import { criarCasca, el } from "../../src/motor/casca.js";
import { ROUPAS, montarRabisco, miniatura } from "../../src/motor/camarim.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";
import { focar } from "../../src/motor/controle.js";

const COMPRAS = 5;
const LOJA = ["coroa", "chapeu-sol", "oculos-sol", "cachecol", "camisa-listrada", "camisa-time", "calca-jeans", "short-time", "galochas", "chuteira", "bola", "guarda-chuva", "gorro", "bone-time", "botas-neve"];
const DINHEIRO = [{ v: 1, tipo: "moeda" }, { v: 2, tipo: "nota", cor: "#7fb3e6" }, { v: 5, tipo: "nota", cor: "#c9a5e0" }, { v: 10, tipo: "nota", cor: "#f0a17a" }];
const NIVEIS = [
  { nome: "Nível 1", desc: "Pague certinho" },
  { nome: "Nível 2", desc: "Troco de R$ 20" },
  { nome: "Nível 3", desc: "Com centavos" },
];
const real = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const realCurto = (v) => (Number.isInteger(v) ? `R$ ${v}` : real(v));

let rabisco = null, fila = [], atual = null, pago = 0, erros = 0, feitas = 0, area = null;

const jogo = criarCasca({
  titulo: "Lojinha do Camarim",
  sub: "Dá para pagar? Quanto é o troco?",
  faixa: "alfabetizacao",
  cor: "#00B5F0",
  niveis: NIVEIS,
  dica: { teclado: "Setas para escolher · Enter para pagar · P para pausar", toque: "Toque nas moedas e notas para pagar", controle: "Direcional para escolher · A para pagar · Start para pausar" },
  falas: { titulo: "lj-titulo", vitoria: "lj-vitoria" },
  aoComecar: montar,
});

function montar(n) {
  erros = 0; feitas = 0;
  fila = [...LOJA].sort(() => Math.random() - 0.5).slice(0, COMPRAS);
  const palco = el("div", { class: "palco-camarim" });
  const lado = el("div", { class: "lado-rabisco" });
  rabisco = montarRabisco(lado);
  area = el("div", { class: "vitrine loja" });
  palco.append(lado, area);
  jogo.palco.append(palco);
  proxima(n);
}

function preco(n) {
  if (n === 1) return 2 + Math.floor(Math.random() * 9);            // 2 a 10
  if (n === 2) return 3 + Math.floor(Math.random() * 16);           // 3 a 18
  return (2 + Math.floor(Math.random() * 15)) + [0.5, 0.25, 0.75, 0.5][Math.floor(Math.random() * 4)]; // 2,25 a 16,75
}

function proxima(n = jogo.nivel) {
  if (!fila.length) {
    const estrelas = erros === 0 ? 3 : erros <= 2 ? 2 : 1;
    rabisco.animar("pula");
    jogo.vencer({ estrelas, texto: `O Rabisco comprou ${COMPRAS} roupas novas!` });
    return;
  }
  const id = fila.shift();
  atual = { id, preco: preco(n) };
  pago = 0;
  area.innerHTML = "";
  const etiqueta = el("div", { class: "produto" });
  etiqueta.append(miniatura(id), el("div", { class: "nome", texto: ROUPAS[id].nome }), el("div", { class: "etiqueta", texto: realCurto(atual.preco) }));
  area.append(el("div", { class: "balao", texto: `Quero comprar: ${ROUPAS[id].nome}!` }), etiqueta);
  jogo.placar(`🛍️ ${feitas}/${COMPRAS}`);
  if (n === 1) pagarCerto(); else pagarComNota(n);
}

// Nível 1: junta moedas e notas até dar o preço
function pagarCerto() {
  const caixa = el("div", { class: "caixa-pagar" });
  const total = el("div", { class: "pago", texto: `Você pagou: ${realCurto(0)}` });
  const carteira = el("div", { class: "carteira", role: "group", "aria-label": "Moedas e notas" });
  for (const d of DINHEIRO) carteira.append(dinheiro(d, () => { pago += d.v; sons.moeda(); conferir(); }));
  const limpar = el("button", { class: "botao branco pequeno", texto: "Recomeçar ↺", onclick: () => { pago = 0; atualizar(); } });
  caixa.append(total, carteira, limpar);
  area.append(caixa);
  falar("lj-pague");
  const atualizar = () => { total.textContent = `Você pagou: ${realCurto(pago)}`; total.classList.toggle("passou", pago > atual.preco); };
  function conferir() {
    atualizar();
    if (pago === atual.preco) comprou();
    else if (pago > atual.preco) { erros++; sons.erro(); jogo.aviso("Passou do preço!", "", 1500); setTimeout(() => { pago = 0; atualizar(); }, 1200); }
  }
}

// Níveis 2 e 3: paga com uma nota e escolhe o troco
function pagarComNota(n) {
  const nota = n === 2 ? 20 : atual.preco > 10 ? 20 : 10;
  const troco = Math.round((nota - atual.preco) * 100) / 100;
  const opcoes = new Set([troco]);
  const passo = n === 2 ? 1 : 0.5;
  while (opcoes.size < 3) { const d = Math.round((troco + (Math.random() < 0.5 ? -1 : 1) * passo * (1 + Math.floor(Math.random() * 3))) * 100) / 100; if (d >= 0) opcoes.add(d); }
  const caixa = el("div", { class: "caixa-pagar" });
  caixa.append(el("div", { class: "pago", html: `Você paga com ${notaHtml(nota)}` }), el("div", { class: "pergunta-troco", texto: "Quanto é o troco?" }));
  const grupo = el("div", { class: "opcoes-troco", role: "group" });
  for (const v of [...opcoes].sort(() => Math.random() - 0.5)) {
    grupo.append(el("button", { class: "botao ciano", texto: real(v), onclick: (e) => {
      if (Math.abs(v - troco) < 0.001) comprou(`Troco: ${real(troco)}`);
      else { erros++; sons.erro(); e.currentTarget.disabled = true; jogo.aviso(`${real(nota)} − ${real(atual.preco)} não dá ${real(v)}`, "", 2000); }
    } }));
  }
  caixa.append(grupo);
  area.append(caixa);
  falar("lj-troco");
  focar(grupo.querySelector("button"));
}

const notaHtml = (v) => `<span class="nota" style="background:${DINHEIRO.find((d) => d.v === v)?.cor ?? "#a5d6a7"}">${realCurto(v)}</span>`;
function dinheiro(d, ao) {
  return el("button", { class: d.tipo, style: d.cor ? `background:${d.cor}` : "", "aria-label": `${d.v} ${d.v === 1 ? "real" : "reais"}`, texto: `R$ ${d.v}`, onclick: ao });
}

function comprou(msg = "Pagou certinho!") {
  feitas++;
  sons.vitoria();
  rabisco.vestir(atual.id);
  jogo.aviso(msg, "bom", 1500);
  falar("lj-obrigado");
  jogo.placar(`🛍️ ${feitas}/${COMPRAS}`);
  for (const b of area.querySelectorAll("button")) b.disabled = true;
  setTimeout(() => proxima(), 1600);
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, get atual() { return atual; }, get pago() { return pago; } };
