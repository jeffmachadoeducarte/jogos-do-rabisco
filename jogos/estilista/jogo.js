// Rabisco Estilista (9 a 12 anos): monte o uniforme do time (cabeça, camisa, calça e calçado) sem
// passar do orçamento. As peças têm desconto em porcentagem: para comprar, calcule quanto cada uma fica.

import { criarCasca, el } from "../../src/motor/casca.js";
import { ROUPAS, montarRabisco, miniatura } from "../../src/motor/camarim.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";
import { focar } from "../../src/motor/controle.js";

const CATEGORIAS = [
  { slot: "cabeca", nome: "Cabeça", itens: ["bone-time", "chapeu-sol", "coroa"] },
  { slot: "corpo", nome: "Camisa", itens: ["camisa-time", "camisa-listrada", "casaco"] },
  { slot: "pernas", nome: "Calça", itens: ["short-time", "calca-jeans"] },
  { slot: "pes", nome: "Calçado", itens: ["chuteira", "galochas", "botas-neve"] },
];
const NIVEIS = [
  { nome: "Nível 1", desc: "10% e 50%", orcamento: 120, precos: [20, 30, 40, 50, 60], descontos: [0, 10, 50] },
  { nome: "Nível 2", desc: "20% e 25%", orcamento: 100, precos: [20, 40, 60, 80], descontos: [0, 20, 25] },
  { nome: "Nível 3", desc: "15%, 30% e 40%", orcamento: 90, precos: [20, 40, 60, 80, 100], descontos: [15, 30, 40] },
];
const real = (v) => `R$ ${Number.isInteger(v) ? v : v.toFixed(2).replace(".", ",")}`;
const final = (p) => Math.round(p.preco * (100 - p.desconto)) / 100;

let rabisco = null, pecas = {}, compras = {}, erros = 0, orcamento = 0, saldoEl = null;

const jogo = criarCasca({
  titulo: "Rabisco Estilista",
  sub: "Monte o uniforme do time sem estourar o orçamento!",
  faixa: "maiores",
  cor: "#1FC08E",
  niveis: NIVEIS,
  dica: { teclado: "Setas para escolher · Enter para comprar · P para pausar", toque: "Toque numa peça e calcule o preço com desconto", controle: "Direcional para escolher · A para comprar · Start para pausar" },
  falas: { titulo: "es-titulo", vitoria: "es-vitoria" },
  aoComecar: montar,
});

function sortear(n) {
  const cfg = NIVEIS[n - 1];
  for (let t = 0; t < 200; t++) {
    const p = {};
    for (const c of CATEGORIAS) for (const id of c.itens) p[id] = { id, slot: c.slot, preco: cfg.precos[Math.floor(Math.random() * cfg.precos.length)], desconto: cfg.descontos[Math.floor(Math.random() * cfg.descontos.length)] };
    // dá para montar o uniforme dentro do orçamento, mas não com qualquer peça
    const baratas = CATEGORIAS.reduce((s, c) => s + Math.min(...c.itens.map((id) => final(p[id]))), 0);
    const caras = CATEGORIAS.reduce((s, c) => s + Math.max(...c.itens.map((id) => final(p[id]))), 0);
    if (baratas <= cfg.orcamento && caras > cfg.orcamento) return p;
  }
  throw new Error("não achei preços que fecham");
}

function montar(n) {
  erros = 0; compras = {};
  orcamento = NIVEIS[n - 1].orcamento;
  pecas = sortear(n);
  const palco = el("div", { class: "palco-camarim" });
  const lado = el("div", { class: "lado-rabisco" });
  saldoEl = el("div", { class: "balao saldo" });
  lado.append(saldoEl);
  rabisco = montarRabisco(lado);
  const vitrine = el("div", { class: "vitrine" });
  for (const c of CATEGORIAS) {
    const linha = el("div", { class: "categoria" }, [el("h3", { texto: c.nome })]);
    const grade = el("div", { class: "guarda-roupa" });
    for (const id of c.itens) {
      const p = pecas[id];
      const b = el("button", { class: "peca", "aria-label": `${ROUPAS[id].nome}, ${real(p.preco)}${p.desconto ? `, ${p.desconto}% de desconto` : ""}`, onclick: () => perguntar(p, b) });
      b.dataset.id = id;
      b.append(miniatura(id), el("span", { class: "preco", html: p.desconto ? `<s>${real(p.preco)}</s>` : real(p.preco) }));
      if (p.desconto) b.append(el("span", { class: "desconto", texto: `−${p.desconto}%` }));
      grade.append(b);
    }
    linha.append(grade);
    vitrine.append(linha);
  }
  palco.append(lado, vitrine);
  jogo.palco.append(palco);
  atualizarSaldo();
  falar("es-inicio");
}

const gasto = () => Object.values(compras).reduce((s, p) => s + final(p), 0);
function atualizarSaldo() {
  const resta = Math.round((orcamento - gasto()) * 100) / 100;
  saldoEl.innerHTML = `Orçamento: <b>${real(orcamento)}</b><br>Sobra: <b class="${resta < 0 ? "negativo" : ""}">${real(resta)}</b>`;
  jogo.placar(`👕 ${Object.keys(compras).length}/${CATEGORIAS.length}`);
}

function perguntar(p, botao) {
  if (jogo.pausado || jogo.estado !== "jogando") return;
  if (compras[p.slot]?.id === p.id) return;
  if (!p.desconto) return comprar(p, botao);
  const certo = final(p);
  const valorDesconto = Math.round(p.preco * p.desconto) / 100;
  const opcoes = new Set([certo]);
  for (const d of [p.preco - p.desconto, valorDesconto, certo + 10, certo - 10, Math.round(p.preco * (100 - p.desconto / 2)) / 100]) if (opcoes.size < 3 && d > 0 && d !== certo) opcoes.add(d);
  const fundo = el("div", { class: "pote-fundo" });
  const grupo = el("div", { class: "opcoes-troco" });
  for (const v of [...opcoes].sort(() => Math.random() - 0.5)) {
    grupo.append(el("button", { class: "botao ciano", texto: real(v), onclick: (e) => {
      if (v === certo) { fundo.remove(); comprar(p, botao); }
      else {
        erros++; sons.erro(); e.currentTarget.disabled = true;
        dica.textContent = `Dica: ${p.desconto}% de ${real(p.preco)} são ${real(valorDesconto)}. Tire isso do preço!`;
      }
    } }));
  }
  const dica = el("p", { class: "dica-conta" });
  const cartao = el("div", { class: "casca-cartao", role: "dialog", "aria-label": "Calcule o desconto" }, [
    miniatura(p.id),
    el("div", { class: "conta-desconto", html: `${ROUPAS[p.id].nome}: <b>${real(p.preco)}</b> com <b class="rosa">${p.desconto}%</b> de desconto` }),
    el("div", { class: "pergunta-troco", texto: "Quanto fica?" }),
    grupo, dica,
    el("button", { class: "botao branco pequeno", texto: "Voltar", onclick: () => { fundo.remove(); focar(botao); } }),
  ]);
  fundo.append(cartao);
  jogo.palco.append(fundo);
  focar(grupo.querySelector("button"));
}

function comprar(p, botao) {
  const antes = compras[p.slot];
  const novoGasto = gasto() - (antes ? final(antes) : 0) + final(p);
  if (novoGasto > orcamento + 0.001) {
    sons.erro();
    rabisco.animar("nao");
    jogo.aviso("Passa do orçamento! Escolha outra peça", "", 2200);
    falar("es-caro");
    focar(botao);
    return;
  }
  compras[p.slot] = p;
  rabisco.vestir(p.id);
  sons.moeda();
  for (const b of document.querySelectorAll(".peca")) b.classList.toggle("vestida", Object.values(compras).some((c) => c.id === b.dataset.id));
  atualizarSaldo();
  focar(botao);
  if (Object.keys(compras).length === CATEGORIAS.length) {
    rabisco.animar("pula");
    const sobra = Math.round((orcamento - gasto()) * 100) / 100;
    const estrelas = erros === 0 ? 3 : erros <= 2 ? 2 : 1;
    setTimeout(() => jogo.vencer({ titulo: "Uniforme pronto!", estrelas, texto: `Gastou ${real(gasto())} e sobrou ${real(sobra)}.` }), 900);
  }
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, get pecas() { return pecas; }, get compras() { return compras; }, final, get orcamento() { return orcamento; } };
