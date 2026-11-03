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
import { BICHINHOS, ID_BICHINHO } from "./bichinho-modelo.js";

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
  { id: "bichinho", nome: "Bichinhos", icone: "🐾" }, // Pet Shop: o 1º bichinho sai de graça (precoBichinho)
];

// catálogo inteiro (todas as temporadas): roupas pagas de cada slot + pinturas
export function catalogo() {
  const itens = [];
  for (const slot of SLOTS) for (const o of PECAS[slot].opcoes) {
    if (!o.preco) continue;
    itens.push({ id: idLoja(slot, o.id), cat: slot, slot, opcao: o.id, nome: o.nome, preco: o.preco, temporada: o.temporada ?? null, amostra: o.amostra });
  }
  for (const p of PINTURAS) itens.push({ id: `rabiscolandia:pintura:${p.id}`, cat: "veiculo", veiculo: p.veiculo, pintura: p.id, nome: p.nome, preco: p.preco, temporada: p.temporada ?? null, amostra: [p.cor, p.cor2 ?? 0xffffff] });
  for (const b of BICHINHOS) itens.push({ id: ID_BICHINHO(b.id), cat: "bichinho", bichinho: b.id, nome: b.nome, preco: b.preco, temporada: null, amostra: [b.cores[0], b.cores[1]] });
  return itens;
}
// bichinho: o primeiro de cada criança sai de graça (quem ainda não tem nenhum paga 0); os outros custam o preço do catálogo
export const temBichinho = () => BICHINHOS.some((b) => tem(ID_BICHINHO(b.id)));
export const precoBichinho = (item) => (temBichinho() ? item.preco : 0);
// o que aparece na loja agora: fora de época só se já foi comprado
export const itensDaLoja = (data = new Date()) => { const meus = comprados(); return catalogo().filter((i) => temporadaAtiva(i.temporada, data) || meus.has(i.id)); };
// roupa do Ateliê: comprou? (as de graça valem sempre)
export const possui = (slot, id) => { const o = opcaoDe(slot, id); return Boolean(o) && (!o.preco || tem(idLoja(slot, id))); };
export const pinturaPorId = (id) => PINTURAS.find((p) => p.id === id) ?? null;
// pintura que vale para o veículo (a escolhida e comprada) ou null (a de fábrica)
export function pinturaDe(salvo, veiculo) {
  const id = salvo?.pinturas?.[veiculo], p = pinturaPorId(id);
  return p && p.veiculo === veiculo && tem(`rabiscolandia:pintura:${p.id}`) ? p : null;
}
export { VEICULOS_PINTAVEIS, PINTURAS };
