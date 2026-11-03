// Rabiscolândia: o Ateliê Ponta do Lápis (loja de visual, inventada; nenhuma marca real). Aqui fica o catálogo da loja
// (montado das peças pagas de meu-rabisco.js/atelie-pecas.js e das pinturas de veículo), as categorias, as temporadas e
// quanto cada brincadeira rende em Rabiscoins. A carteira é a do portal (src/motor/rabiscoins.js).
//
// Item: { id (o da carteira), cat, nome, preco, temporada, amostra, slot+opcao (roupa) | veiculo+pintura (veículo) }
// Temporada: null = o ano todo. As de época (TEMPORADAS) só aparecem na loja durante a época; quem comprou continua tendo.
// O que está vestido fica em salvo.meuRabisco (salvar.js); a pintura de cada veículo em salvo.pinturas = { carro: id, ... }.

import { PECAS, SLOTS, opcaoDe, idLoja } from "./meu-rabisco.js";
import { PINTURAS, VEICULOS_PINTAVEIS } from "./atelie-pecas.js";
import { tem, comprados } from "../../src/motor/rabiscoins.js";

export const NOME_LOJA = "Ateliê Ponta do Lápis";
// ganhos: concluir missão (a 1ª vez rende mais; repetir, um pouquinho). Item barato sai em 1 ou 2 missões; o mais caro, em umas 10.
export const GANHO = { missao: { primeira: 20, repetida: 5 } };
export const motivoMissao = (id) => `rabiscolandia:missao:${id}`;

// épocas do ano (mês 0 = janeiro). Quem acrescentar roupas de época põe { temporada: "<id>" } na peça.
export const TEMPORADAS = {
  natal: { nome: "Natal", selo: "🎄", ativa: (d) => d.getMonth() === 11 || (d.getMonth() === 0 && d.getDate() <= 6) },
  pascoa: { nome: "Páscoa", selo: "🐣", ativa: (d) => d.getMonth() === 2 || d.getMonth() === 3 },
  festaJunina: { nome: "Festa Junina", selo: "🌽", ativa: (d) => d.getMonth() === 5 || d.getMonth() === 6 },
  criancas: { nome: "Dia das Crianças", selo: "🎈", ativa: (d) => d.getMonth() === 9 },
};
export const temporadaAtiva = (t, data = new Date()) => !t || Boolean(TEMPORADAS[t]?.ativa(data));

export const CATEGORIAS = [
  { id: "camiseta", nome: "Camisetas", icone: "👕" },
  { id: "chapeu", nome: "Chapéus", icone: "🧢" },
  { id: "oculos", nome: "Óculos", icone: "🕶️" },
  { id: "mochila", nome: "Mochilas", icone: "🎒" },
  { id: "veiculo", nome: "Pinturas", icone: "🎨" },
];

// catálogo inteiro (todas as temporadas): roupas pagas de cada slot + pinturas
export function catalogo() {
  const itens = [];
  for (const slot of SLOTS) for (const o of PECAS[slot].opcoes) {
    if (!o.preco) continue;
    itens.push({ id: idLoja(slot, o.id), cat: slot, slot, opcao: o.id, nome: o.nome, preco: o.preco, temporada: o.temporada ?? null, amostra: o.amostra });
  }
  for (const p of PINTURAS) itens.push({ id: `rabiscolandia:pintura:${p.id}`, cat: "veiculo", veiculo: p.veiculo, pintura: p.id, nome: p.nome, preco: p.preco, temporada: p.temporada ?? null, amostra: [p.cor, p.cor2 ?? 0xffffff] });
  return itens;
}
// o que aparece na loja agora: fora de época só se já foi comprado
// o "hoje" da loja: o relógio do aparelho; para testar, ?natal=1 vale 10 de dezembro e ?teste&hoje=AAAA-MM-DD vale aquele dia
export function dataDaLoja(busca = globalThis.location?.search ?? "", agora = new Date()) {
  const p = new URLSearchParams(busca);
  if (p.has("teste") && /^\d{4}-\d{2}-\d{2}$/.test(p.get("hoje") ?? "")) { const [a, m, d] = p.get("hoje").split("-").map(Number); return new Date(a, m - 1, d, 12); }
  if (p.get("natal") === "1") return new Date(agora.getFullYear(), 11, 10, 12);
  return agora;
}
export const itensDaLoja = (data = dataDaLoja()) => { const meus = comprados(); return catalogo().filter((i) => temporadaAtiva(i.temporada, data) || meus.has(i.id)); };
// roupa do Ateliê: comprou? (as de graça valem sempre)
export const possui = (slot, id) => { const o = opcaoDe(slot, id); return Boolean(o) && (!o.preco || tem(idLoja(slot, id))); };
export const pinturaPorId = (id) => PINTURAS.find((p) => p.id === id) ?? null;
// pintura que vale para o veículo (a escolhida e comprada) ou null (a de fábrica)
export function pinturaDe(salvo, veiculo) {
  const id = salvo?.pinturas?.[veiculo], p = pinturaPorId(id);
  return p && p.veiculo === veiculo && tem(`rabiscolandia:pintura:${p.id}`) ? p : null;
}
export { VEICULOS_PINTAVEIS, PINTURAS };
