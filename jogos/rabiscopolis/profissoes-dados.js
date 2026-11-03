// Rabiscolândia: profissões curtas de faz de conta (dados puros, sem three.js: falas.mjs e os testes leem no node).
// A criança escolhe no Rabifone (app "Trabalhar") ou no ponto 💼 da cidade, ao lado de cada base, e faz um turno de
// ~3 a 4 minutos com 5 tarefas. Cada tarefa rende Rabiscoins na hora (dá para sair quando quiser e o que fez já
// ficou na carteira); o turno completo dá o bônus. Enquanto trabalha, veste o uniforme (roupas-rp.js), que esconde o
// chapéu do Ateliê do mesmo jeito que o capacete da moto (meu-rabisco.js · ajustarUniforme).
// Quem fala é só a anfitriã: parceiros e pessoas de verdade não falam. Na Speedy e no Marlon, no fim do turno, ela
// toca a propaganda já gravada da parceira (propaganda.js · rp-prop-<id>).
//
// Tarefas (o motor está em profissoes.js):
//   entrega  · de carro: pare perto da obra ou da casa e o vidro vai para lá (tempo folgado só para mostrar: chegar
//              no tempo rende +noTempo; passar do tempo não tira nada)
//   coleta   · de caminhão: pare perto do ponto de coleta e as garrafas e os recicláveis voam para a caçamba
//   galpao   · de caminhão: pare na frente do galpão da Marlon Máquinas (o container UNIKA) e descarregue
//   foco     · a pé (mangueira) ou no caminhão de bombeiro (jato): apague a fumaça colorida de mentira
//   gatinho  · a pé: ajude o gatinho a descer da árvore (a escadinha sobe)

// pontos em que dá para parar (calçada na frente de prédios, conferidos no jogo: fora de sólido e a 1,5–3,5 m da rua)
const OBRAS = [[-188, -59], [-41.5, -155], [-21, -59], [-167, -41], [-7.5, -197], [58.5, -113], [-308, -113], [157, -323], [188, -8], [-41.5, 23]];
const COLETAS = [[-102, 59], [-172, 59], [-202, 59], [-7, 149], [7, 59], [-41.5, 37], [91, 149], [-88, 59], [188, 59], [-188, -8], [63, -8.5], [-21, -59]];
const FOCOS = [[7, -59], [-21, -59], [63, -8.5], [86, -8.5], [-7, 59], [-41.5, 23], [58.5, -113], [88, 59], [-102, 59], [-167, -41], [188, -8], [-188, -59], [209, 59], [-41.5, -155], [105, 149], [-7, 149]];
// árvores com gatinho: gramado das praças e do parque (sem nada em volta num raio de 1,6 m)
const ARVORES = [[-15, 18], [15, 6], [-11, 67], [7, 70], [-104, 69], [-357, -146], [341, 142], [-155, -348]];

export const PAGA = {
  entregador: { entrega: 6, noTempo: 2 },
  reciclagem: { coleta: 5, galpao: 8 },
  bombeiro: { foco: 6, gatinho: 8 },
  bonus: 12, // turno completo
};

export const TRABALHOS = [
  {
    id: "entregador", titulo: "Entregador da Speedy Soluções", curto: "Entregador", icone: "🪟", parceiro: "speedy-solucoes",
    uniforme: "entregador", veiculo: { tipo: "carro", cor: 0x2f8fe8, nome: "carro da Speedy" }, veiculoServe: "porta-malas",
    base: [-109, -149], resumo: "Leve vidros e placas de alumínio de carro até as obras e as casas.",
    // casas: número do lote (a frente da casa na hora; as da rua da praça, 1 a 8, ficam de fora: lá a cidade já desenha
    // muito no celular); obras: pontos fixos. Alterna casa e obra, a mais perto primeiro.
    tarefas: { n: 5, min: 110, tipos: ["casa", "obra"], casas: [9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 21, 23, 25, 27, 29, 31], obras: OBRAS },
    explica: "Agora você é entregador da Speedy Soluções! Leve vidros e placas de alumínio de carro até as obras e as casas. Siga a setinha e pare pertinho de cada entrega. O tempo é folgado: dá para ir com calma.",
    fim: "Turno completo! Todas as entregas chegaram inteirinhas e você ganhou o bônus do turno. Trabalhar com capricho é um jeito de cuidar das pessoas.",
  },
  {
    id: "reciclagem", titulo: "Ajudante do Marlon Máquinas", curto: "Ajudante da reciclagem", icone: "♻️", parceiro: "marlon-maquinas",
    uniforme: "reciclagem", veiculo: { tipo: "reciclagem", cor: 0x2e9e57, nome: "caminhão da reciclagem" }, veiculoServe: ["reciclagem"],
    base: [-99, 149], galpao: [-110, 145.5], resumo: "Recolha garrafas e recicláveis com o caminhão e leve até o galpão.",
    tarefas: { n: 4, min: 100, coletas: COLETAS },
    explica: "Agora você é ajudante do Marlon Máquinas! Dirija o caminhão da reciclagem, pare nos pontos de coleta para recolher as garrafas e os recicláveis e depois leve tudo até o galpão.",
    fim: "Turno completo! Tudo chegou no galpão para virar coisa nova, e você ganhou o bônus do turno. Cuidar da cidade é cuidar do mundo que Deus criou.",
  },
  {
    id: "bombeiro", titulo: "Bombeiro mirim", curto: "Bombeiro mirim", icone: "🚒", parceiro: null,
    uniforme: "bombeiro", veiculo: null, base: [36, -59], resumo: "Apague a fumaça colorida de mentira e ajude o gatinho a descer da árvore.",
    tarefas: { focos: 4, gatinhos: 1, min: 45, pontos: FOCOS, arvores: ARVORES },
    explica: "Agora você é bombeiro mirim! Os focos são de mentira, só fumaça colorida. Chegue pertinho e aperte o botão da mangueira. E tem um gatinho na árvore esperando ajuda!",
    fim: "Turno completo! A fumaça sumiu, o gatinho está no chão, e você ganhou o bônus do turno. Bombeiro cuida de todo mundo.",
  },
];
export const trabalho = (id) => TRABALHOS.find((t) => t.id === id) ?? null;

// falas da anfitriã (o texto que aparece no balão é o mesmo que a voz fala)
export const FALAS_TRABALHO = {
  "rp-trab-comecou": "Turno começou! Siga a setinha até a primeira tarefa.",
  "rp-trab-entregou": "Entrega feita! Os vidros chegaram inteirinhos.",
  "rp-trab-coletou": "Recicláveis no caminhão!",
  "rp-trab-galpao": "Tudo descarregado no galpão! Agora vira coisa nova.",
  "rp-trab-apagou": "Fumaça apagada! Muito bem.",
  "rp-trab-gatinho": "O gatinho desceu da árvore, bem tranquilo!",
  "rp-trab-veiculo": "Para este trabalho, entre no veículo do trabalho: ele está esperando do seu lado.",
  "rp-trab-saiu": "Turno encerrado! As Rabiscoins do que você fez já estão com você. Volte quando quiser.",
};
for (const T of TRABALHOS) { FALAS_TRABALHO[`rp-trab-${T.id}-explica`] = T.explica; FALAS_TRABALHO[`rp-trab-${T.id}-fim`] = T.fim; }

// escolhe os destinos do turno a partir de onde a criança está: cada um o mais perto que fique a pelo menos `min` m
// do anterior (rota de ~3 a 4 minutos, nem curta demais nem atravessando a cidade)
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
// o mais perto que fique a pelo menos `min` metros (a rota não fica curta demais); sem nenhum assim, o mais perto
function maisPerto(de, pool, usados, min = 0) {
  let m = null, dm = Infinity, r = null, dr = Infinity;
  for (const p of pool) { if (usados.has(p)) continue; const d = d2(de, p.xz ?? p); if (d >= min && d < dm) { dm = d; m = p; } if (d < dr) { dr = d; r = p; } }
  m ??= r; if (m) usados.add(m); return m;
}
// casaFrente(n) → [x, z] da frente da casa n (no jogo vem de mundo.casas)
export function montarTurno(T, inicio, casaFrente = null) {
  const lista = [], usados = new Set();
  let de = inicio;
  if (T.id === "entregador") {
    const casas = (T.tarefas.casas ?? []).map((n) => ({ n, xz: casaFrente?.(n) })).filter((c) => c.xz);
    for (let i = 0; i < T.tarefas.n; i++) {
      const querCasa = i % 2 === 0 && casas.length;
      const p = querCasa ? maisPerto(de, casas, usados, T.tarefas.min) : maisPerto(de, T.tarefas.obras, usados, T.tarefas.min);
      const xz = p.xz ?? p;
      lista.push({ tipo: "entrega", destino: p.n ? "casa" : "obra", nome: p.n ? `na casa ${p.n}` : "na obra", x: xz[0], z: xz[1], emoji: p.n ? "🏠" : "🚧" });
      de = xz;
    }
  } else if (T.id === "reciclagem") {
    for (let i = 0; i < T.tarefas.n; i++) { const p = maisPerto(de, T.tarefas.coletas, usados, T.tarefas.min); lista.push({ tipo: "coleta", nome: "o ponto de coleta", x: p[0], z: p[1], emoji: "♻️" }); de = p; }
    lista.push({ tipo: "galpao", nome: "o galpão da Marlon Máquinas", x: T.galpao[0], z: T.galpao[1], emoji: "🏭" });
  } else if (T.id === "bombeiro") {
    for (let i = 0; i < T.tarefas.focos; i++) { const p = maisPerto(de, T.tarefas.pontos, usados, T.tarefas.min); lista.push({ tipo: "foco", nome: "a fumaça colorida", x: p[0], z: p[1], emoji: "💨" }); de = p; }
    for (let i = 0; i < T.tarefas.gatinhos; i++) { const p = maisPerto(de, T.tarefas.arvores, usados, T.tarefas.min); lista.push({ tipo: "gatinho", nome: "o gatinho na árvore", x: p[0], z: p[1], emoji: "🐱" }); de = p; }
  }
  return lista;
}
// quanto rende cada tarefa (noTempo: a entrega chegou dentro do tempo folgado)
export function valorTarefa(T, tarefa, noTempo = false) {
  const P = PAGA[T.id];
  if (tarefa.tipo === "entrega") return P.entrega + (noTempo ? P.noTempo : 0);
  return P[tarefa.tipo] ?? 0;
}
// tempo folgado de cada entrega: o dobro do que leva dirigindo devagar, e nunca menos de 45 s
export const tempoFolgado = (dist) => Math.max(45, Math.round(dist / 4 + 25));
