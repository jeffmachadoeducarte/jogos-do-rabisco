// Rabiscolândia: Desafios de obstáculos na cidade (dados puros, sem three.js: mapa.js, falas.mjs e os testes leem este arquivo).
// Três desafios, cada um com bandeira e pórtico na largada, cronômetro, checkpoints e chegada:
//  - Pula-telhados (a pé): plataformas, caixas e telhados baixos, longe da praça, no Nordeste.
//  - Argolas do helicóptero: 9 argolas no céu, acima dos prédios, perto do Heliponto.
//  - Corrida de barco: 7 boias no lago da Praia (o barquinho só anda nos lagos).
// Medalha de tempo paga Rabiscoins só na 1ª vez de cada medalha (bronze 10, prata 15, ouro 25). Caiu? Volta ao último checkpoint, sem castigo.

export const PREMIO_MEDALHA = { bronze: 10, prata: 15, ouro: 25 };
export const MEDALHAS = ["bronze", "prata", "ouro"];
export const NOME_MEDALHA = { bronze: "Bronze", prata: "Prata", ouro: "Ouro" };
export const ICONE_MEDALHA = { bronze: "🥉", prata: "🥈", ouro: "🥇" };
export const motivoMedalha = (id, medalha) => `rabiscolandia:desafio:${id}:${medalha}`;

// ---------- Pula-telhados: o campo é um retângulo no Nordeste (longe da praça, das lojas e das parceiras)
// u = metros a partir de x0, v = metros a partir de z0. Cada plataforma: [u0, u1, v0, v1, altura, tipo]
// tipo: caixa | telhado | pad. Degraus de no máximo 0,6 m e vãos de até 3 m (o pulo da criança vai a 1,8 m de altura e uns 4 m de distância).
export const CAMPO_PULA = { x0: 178, z0: -134, w: 52, d: 30 };
const fila = (u, v0, passo, hs, tipos, len = 3.5, prof = 3.5) => hs.map((h, i) => [u + i * passo, u + i * passo + len, v0, v0 + prof, h, tipos[i % tipos.length]]);
export const PLATAFORMAS_PULA = [
  ...fila(6, 4, 6, [0.6, 1.0, 1.5, 1.1, 1.6, 2.0], ["caixa", "caixa", "telhado"]),     // fila A, para o leste
  [42, 49, 3, 10, 1.6, "pad"],                                                          // checkpoint 1
  ...fila(43, 13, -6, [2.0, 1.4, 1.9, 1.3, 1.8, 2.2], ["caixa", "telhado", "caixa"]),  // fila B, para o oeste
  [3.5, 10.5, 12, 19, 1.8, "pad"],                                                      // checkpoint 2
  ...fila(5, 22, 6, [2.2, 1.6, 2.1, 2.6, 2.0, 2.5], ["telhado", "caixa", "caixa"]),    // fila C, para o leste
  [41, 47.5, 21, 28, 2.0, "pad"],                                                       // chegada
];
// índices (na lista acima) dos pads: checkpoints e chegada
export const CHECKPOINTS_PULA = [6, 13];
export const CHEGADA_PULA = PLATAFORMAS_PULA.length - 1;
export const LARGADA_PULA = { u: 3, v: 6 }; // pórtico no chão, antes da 1ª caixa

// ---------- Argolas do helicóptero: x, z, altura (m). Todas acima do prédio mais alto da região (26 m), a mais baixa a 30 m
export const HELI = {
  bandeira: { x: 30, z: -206 }, // no chão, ao norte do Heliponto (30, -190)
  largada: { x: 30, z: -216, alt: 30 },
  argolas: [
    [30, -250, 31], [75, -280, 34], [125, -282, 36], [165, -250, 33], [150, -205, 31],
    [105, -185, 34], [60, -200, 31], [15, -232, 30], [-25, -205, 31],
  ],
  raio: 4.6, // a argola desenhada; vale quem passar a até raio + 1 do centro
};

// ---------- Corrida de barco: lago da Praia (centro 0, 202; raio 24). O barquinho nasce na beira norte.
export const BARCO = {
  bandeira: { x: -5.5, z: 177.5 }, // na grama, na beira norte do lago
  largada: { x: 0, z: 188 },       // pórtico flutuante (postes em x ± 3,5)
  boias: [[10.5, 192.5], [-9, 197], [14.5, 207], [-12, 211], [9, 217], [-8, 220], [0, 210.5]].map(([x, z]) => ({ x, z })),
  raio: 3.4,
};

// ---------- os três desafios. tempos: segundos para cada medalha
export const DESAFIOS = [
  { id: "pula", nome: "Pula-telhados", icone: "🏃", meio: "a pé", emoji: "🏁", tempos: { ouro: 55, prata: 80, bronze: 120 },
    x: CAMPO_PULA.x0 + LARGADA_PULA.u - 2.5, z: CAMPO_PULA.z0 + LARGADA_PULA.v, partes: "checkpoint", total: 2 },
  { id: "heli", nome: "Argolas do helicóptero", icone: "🚁", meio: "de helicóptero", emoji: "🏁", tempos: { ouro: 75, prata: 100, bronze: 140 },
    x: HELI.bandeira.x, z: HELI.bandeira.z, partes: "argola", total: HELI.argolas.length },
  { id: "barco", nome: "Corrida de barco", icone: "🚣", meio: "de barquinho", emoji: "🏁", tempos: { ouro: 50, prata: 65, bronze: 95 },
    x: BARCO.bandeira.x, z: BARCO.bandeira.z, partes: "boia", total: BARCO.boias.length },
];
export const desafio = (id) => DESAFIOS.find((d) => d.id === id);
// medalha de um tempo (null = sem medalha)
export const medalhaDe = (id, seg) => { const t = desafio(id).tempos; return seg <= t.ouro ? "ouro" : seg <= t.prata ? "prata" : seg <= t.bronze ? "bronze" : null; };
export const formatarTempo = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? "0" : ""}${r.toFixed(1)}`; };

// retângulos reservados (nova: true): sem árvore, prédio de enchimento ou poste em cima. Lidos por mapa.js.
export const AREAS_DESAFIOS = [
  { id: "desafio-pula", x0: CAMPO_PULA.x0 - 4, x1: CAMPO_PULA.x0 + CAMPO_PULA.w + 1, z0: CAMPO_PULA.z0 - 1, z1: CAMPO_PULA.z0 + CAMPO_PULA.d + 1 },
  { id: "desafio-heli-bandeira", x0: HELI.bandeira.x - 5, x1: HELI.bandeira.x + 5, z0: HELI.bandeira.z - 3, z1: HELI.bandeira.z + 3 },
  { id: "desafio-barco-bandeira", x0: BARCO.bandeira.x - 5, x1: BARCO.bandeira.x + 5, z0: BARCO.bandeira.z - 3, z1: BARCO.bandeira.z + 3 },
];

// ---------- falas da anfitriã (viram MP3 em falas.mjs). Curtas.
export const FALAS_DESAFIOS = {
  "rp-des-pula": "Pula-telhados! Passe pelo pórtico e pule de telhado em telhado. Se cair, volta ao último checkpoint.",
  "rp-des-heli": "Argolas do helicóptero! Suba bem alto e voe por todas as argolas.",
  "rp-des-barco": "Corrida de barco! Passe pelo pórtico e contorne todas as boias no lago.",
  "rp-des-bronze": "Medalha de bronze! Muito bem!",
  "rp-des-prata": "Medalha de prata! Que rápido!",
  "rp-des-ouro": "Medalha de ouro! Você é um campeão!",
};
