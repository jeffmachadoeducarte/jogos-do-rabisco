// Rabiscolândia: traçado da cidade em dados puros (sem three.js), usado pela montagem 3D (mundo.js), pelo minimapa,
// pela física e pelo teste em node (ferramentas/teste/rabiscopolis-mapa.mjs).
//
// A cidade tem ~800 × 800 m, dividida em 9 × 9 blocos de 100 m (de -450 a 450) (só o bloco atual e os vizinhos ficam visíveis).
// O miolo (±250, dentro da Estrada da Serra) é a cidade de antes, com as MESMAS coordenadas; em volta, os bairros novos
// até a Avenida do Horizonte (±390) e, no sul, a orla do Mar Azul com a Ilha da Alegria:
//
//            x: -400 ···· -250 ····· -150 ····· -50 ······ 50 ······ 150 ····· 250 ···· 400
//   z -400   ┌─────────┬─────────────────────────────────────────────────────┬─────────┐
//            │         │ Jardim das Estrelas: Praça das Estrelas, Museu,       │ Torres  │  Avenida do Horizonte (±390)
//            │  Vila   │ Observatório (Rua do Arco-Íris, z = -315)             │   do    │
//   -250     │   dos   ├─────────┬──────────┬───────────┬──────────┬─────────┤Horizonte│
//            │  Ipês   │ Bosque  │ Bosque   │ Mirante + │ Bosque   │ Bosque  │         │
//   -150     │ (Rua    ├─────────┼──────────┼ Heliponto ┼──────────┼─────────┤ Bairro  │
//            │  dos    │Veterin. │ Morro    │ Biblioteca│ Torres   │ Estúdio │  das    │
//    -50     │  Ipês,  ├─────────┼──────────┼───────────┼──────────┼─────────┤Palmeiras│
//            │  x =    │Kids I   │ Bairro   │ Centro    │ Comércio │ Kids II │ (Rua das│
//     50     │  -315)  ├─────────┼──────────┼───────────┼──────────┼─────────┤Palmeiras│
//            │         │Lava-ráp.│Fazendinha│ Parque    │ Esportes │ Correios│ x = 315)│
//    150     │         ├─────────┼──────────┼───────────┼──────────┼─────────┤         │
//            │         │ Bosque  │ Bosque   │ Praia     │ Bosque   │ Bosque  │         │
//    250     ├─────────┴─────────┴──────────┴───────────┴──────────┴─────────┴─────────┤
//            │ Orla do Mar Azul: areia, píer, posto salva-vidas, quiosque               │
//    270     │ ~~~~~~~~~~~~~~~~~~~~~ Mar Azul ~~~~~~ Ilha da Alegria (roda-gigante) ~~~~~ │
//    400     └──────────────────────────────────────────────────────────────────────────┘
// Avenida do Contorno (anel de dentro, ±140), Estrada da Serra (±240) e Avenida do Horizonte (±390, aberta no sul:
// as pontas descem até a orla e encostam na Serra), com cantos arredondados. As avenidas e ruas de antes continuam
// até o Horizonte. As duas escolas ficam em lados opostos: Educarte Kids I (bebês de 4 meses a 4 anos) no oeste e
// Educarte Kids II (5 a 12 anos) no leste, a 390 m uma da outra.
//
// Unidade: o Rabisco tem 1,8 de altura. x para a direita, z para baixo (vista de cima). dir = para onde a fachada olha.

import { PARCEIROS } from "../../src/parceiros.js";

export const BORDA = 400;
// a grade dos blocos começa em -450 (9 × 9): assim as divisas do miolo continuam em ±50, ±150 e ±250, como antes
// (na praça, por exemplo, aparecem os mesmos blocos de antes e o orçamento de desenho não muda)
export const NBLOCOS = 9;
export const GRADE0 = -450;
export const BORDA_ANTIGA = 250; // a cidade de antes (o miolo): o que é dela é montado igual, na mesma ordem
export const BLOCO = 100;
export const CALCADA = 3; // largura da calçada dos dois lados de cada rua

// bloco (0..8, 0..8) de um ponto
export const blocoDe = (x, z) => [Math.max(0, Math.min(NBLOCOS - 1, Math.floor((x - GRADE0) / BLOCO))), Math.max(0, Math.min(NBLOCOS - 1, Math.floor((z - GRADE0) / BLOCO)))];

const arco = (cx, cz, r, a0, a1, n) => {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return pts;
};
function retanguloArredondado(x0, z0, x1, z1, r) {
  const n = 6;
  return [
    ...arco(x1 - r, z0 + r, r, -Math.PI / 2, 0, n),
    ...arco(x1 - r, z1 - r, r, 0, Math.PI / 2, n),
    ...arco(x0 + r, z1 - r, r, Math.PI / 2, Math.PI, n),
    ...arco(x0 + r, z0 + r, r, Math.PI, Math.PI * 1.5, n),
  ];
}

// ---------- ruas (w: largura do asfalto · fechada: volta para o começo)
const CONTORNO = retanguloArredondado(-140, -140, 140, 140, 24);
const SERRA = retanguloArredondado(-240, -240, 240, 240, 32);
// Avenida do Horizonte: anel de fora (±390), aberto no sul (lá é o mar): as pontas descem até a orla e encostam na
// Estrada da Serra, em z = 240
const HORIZONTE = [[-200, 240], ...arco(-358, 208, 32, Math.PI / 2, Math.PI, 6), ...arco(-358, -358, 32, Math.PI, Math.PI * 1.5, 6),
  ...arco(358, -358, 32, -Math.PI / 2, 0, 6), ...arco(358, 208, 32, 0, Math.PI / 2, 6), [200, 240]];
export const RUAS = [
  { id: "contorno", nome: "Avenida do Contorno", w: 12, fechada: true, pts: CONTORNO },
  { id: "serra", nome: "Estrada da Serra", w: 12, fechada: true, pts: SERRA },
  { id: "av-norte", nome: "Avenida da Esperança", w: 12, pts: [[-240, -50], [240, -50]] },
  { id: "av-sul", nome: "Avenida da Alegria", w: 12, pts: [[-240, 50], [240, 50]] },
  { id: "oeste", nome: "Rua do Sol", w: 11, pts: [[-50, -240], [-50, 240]] },
  { id: "leste", nome: "Rua da Lua", w: 11, pts: [[50, -240], [50, 240]] },
  { id: "casas", nome: "Rua das Casas", w: 9, pts: [[-240, 0], [-50, 0]] },
  { id: "comercio", nome: "Rua do Comércio", w: 10, pts: [[50, 0], [240, 0]] },
  { id: "mirante", nome: "Rua do Mirante", w: 10, pts: [[0, -140], [0, -240]] },
  { id: "flores", nome: "Rua das Flores", w: 9, pts: [[-140, -95], [-50, -95]] },
  // bairros novos (nova: true): as avenidas e ruas de antes continuam até o Horizonte, mais três ruas dos bairros
  { id: "horizonte", nome: "Avenida do Horizonte", w: 12, pts: HORIZONTE, nova: true },
  { id: "av-norte-o", nome: "Avenida da Esperança", w: 12, pts: [[-390, -50], [-240, -50]], nova: true },
  { id: "av-norte-l", nome: "Avenida da Esperança", w: 12, pts: [[240, -50], [390, -50]], nova: true },
  { id: "av-sul-o", nome: "Avenida da Alegria", w: 12, pts: [[-390, 50], [-240, 50]], nova: true },
  { id: "av-sul-l", nome: "Avenida da Alegria", w: 12, pts: [[240, 50], [390, 50]], nova: true },
  { id: "casas-o", nome: "Rua das Casas", w: 9, pts: [[-390, 0], [-240, 0]], nova: true },
  { id: "comercio-l", nome: "Rua do Comércio", w: 10, pts: [[240, 0], [390, 0]], nova: true },
  { id: "oeste-n", nome: "Rua do Sol", w: 11, pts: [[-50, -240], [-50, -390]], nova: true },
  { id: "leste-n", nome: "Rua da Lua", w: 11, pts: [[50, -240], [50, -390]], nova: true },
  { id: "mirante-n", nome: "Rua do Mirante", w: 10, pts: [[0, -240], [0, -390]], nova: true },
  { id: "arcoiris", nome: "Rua do Arco-Íris", w: 9, pts: [[-390, -315], [390, -315]], nova: true },
  { id: "ipes", nome: "Rua dos Ipês", w: 9, pts: [[-315, -390], [-315, 240]], nova: true },
  { id: "palmeiras", nome: "Rua das Palmeiras", w: 9, pts: [[315, -390], [315, 240]], nova: true },
];

// ---------- geometria
function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
export function segmentos(rua) {
  const s = [];
  const n = rua.pts.length;
  for (let i = 0; i < (rua.fechada ? n : n - 1); i++) s.push([rua.pts[i], rua.pts[(i + 1) % n]]);
  return s;
}
// distância até a beira do asfalto (negativa = em cima da rua)
export function distRua(x, z, ignorar = null) {
  let melhor = Infinity, qual = null;
  for (const r of RUAS) {
    if (r === ignorar) continue;
    for (const [[ax, az], [bx, bz]] of segmentos(r)) {
      const d = distSeg(x, z, ax, az, bx, bz) - r.w / 2;
      if (d < melhor) { melhor = d; qual = r; }
    }
  }
  return { d: melhor, rua: qual };
}
export const naRua = (x, z) => distRua(x, z).d < 0;

// retângulo (x0..x1, z0..z1) da pegada de algo com a frente em (x, z) olhando para dir, w de largura e d de fundo,
// começando `recuo` metros para trás da frente (dir é sempre um dos 4 eixos)
export function pegadaDe(x, z, dir, w, d, recuo = 0) {
  const [dx, dz] = dir;
  const fx = x - dx * recuo, fz = z - dz * recuo;      // meio da fachada
  const cx = fx - dx * (d / 2), cz = fz - dz * (d / 2); // centro do prédio
  const deitado = Math.abs(dx) > 0.5;
  const sx = (deitado ? d : w) / 2, sz = (deitado ? w : d) / 2;
  return { x0: cx - sx, x1: cx + sx, z0: cz - sz, z1: cz + sz, cx, cz };
}

// ---------- lugares (o ponto x, z fica na calçada, na frente da porta; o prédio começa `recuo` m para trás)
// pegada: [largura, fundo] do prédio · raio: até onde conta "estou neste lugar" · foto: fachada de foto real
const L = (id, nome, x, z, dx, dz, extra = {}) => ({ id, nome, x, z, dir: [dx, dz], rot: Math.atan2(dx, dz), raio: 12, recuo: 1.5, pegada: null, bairro: "", ...extra });
export const LUGARES = [
  // Centro: a praça e a Igreja Reviver (a igreja da escola), de frente para a praça
  L("praca", "Praça da Paz", 0, 12, 0, 1, { raio: 17, recuo: 0, bairro: "Centro" }),
  L("igreja", "Igreja Reviver", 0, -17, 0, 1, { recuo: 4, pegada: [26, 16], raio: 14, bairro: "Centro", foto: "assets/parceiros/igreja-reviver.webp?v=2", proporcao: 1024 / 550 }),
  // Escola, Hospital e Bombeiros: de frente para a Avenida da Esperança
  L("hospital", "Hospital Cuidar", -28, -59.5, 0, 1, { pegada: [18, 15], bairro: "Escola" }),
  L("biblioteca", "Biblioteca Ler é Bom", 0, -59.5, 0, 1, { pegada: [26, 16], raio: 14, bairro: "Escola" }),
  L("bombeiros", "Bombeiros", 29, -59.5, 0, 1, { pegada: [16, 15], bairro: "Escola" }),
  // Comércio: lado norte da Rua do Comércio
  L("mercado", "Mercado Cesta Cheia", 70, -9, 0, 1, { pegada: [20, 14], bairro: "Comércio" }),
  L("padaria", "Padaria Pão Quentinho", 93, -9, 0, 1, { pegada: [15, 12], bairro: "Comércio" }),
  L("sorveteria", "Sorveteria Geladinho", 115, -9, 0, 1, { pegada: [15, 12], bairro: "Comércio" }),
  // Parque com lago e Fazendinha (de frente para a Avenida da Alegria)
  L("parque", "Parque do Lago", 0, 59.5, 0, -1, { raio: 16, recuo: 0, bairro: "Parque" }),
  // Esportes (sudeste): campo de futebol com arquibancada; quadra e horta comunitária (nordeste)
  L("campo", "Campo de Futebol", 95, 59.5, 0, -1, { raio: 18, recuo: 0, bairro: "Esportes" }),
  L("quadra", "Quadra da Alegria", 98, -117, -1, 0, { raio: 14, recuo: 0, bairro: "Esportes" }),
  L("horta", "Horta Comunitária", 115, -101, 0, 1, { raio: 12, recuo: 0, bairro: "Esportes" }),
  // bairros de fora: as duas escolas (uma em cada lado da cidade), veterinário, lava-rápido, estúdio de música,
  // correios, mirante com heliponto e a praia do lago
  L("kids1", "Educarte Kids I", -195, -8.5, 0, 1, { pegada: [34, 22], recuo: 2, raio: 18, bairro: "Educarte Kids I (bebês até 4 anos)" }),
  L("kids2", "Educarte Kids II", 195, -8.5, 0, 1, { pegada: [32, 20], recuo: 2, raio: 18, bairro: "Educarte Kids II (5 a 12 anos)" }),
  L("veterinario", "Veterinário Amigo Bicho", -195, -59.5, 0, 1, { pegada: [20, 15], bairro: "Oeste" }),
  L("lavarapido", "Lava-Rápido Bolhinha", -195, 59.5, 0, -1, { pegada: [22, 14], bairro: "Oeste" }),
  L("estudio", "Estúdio de Música Dó-Ré-Mi", 195, -59.5, 0, 1, { pegada: [18, 14], bairro: "Leste" }),
  L("correios", "Correios", 195, 59.5, 0, -1, { pegada: [18, 14], bairro: "Leste" }),
  L("mirante", "Mirante da Serra", -9.5, -190, 1, 0, { pegada: [18, 18], recuo: 1, raio: 14, bairro: "Norte" }),
  L("heliponto", "Heliponto", 9.5, -190, -1, 0, { raio: 12, recuo: 0, bairro: "Norte" }),
  L("praia", "Praia do Lago", 0, 149.5, 0, -1, { raio: 20, recuo: 0, bairro: "Sul" }),
  L("fazendinha", "Fazendinha", -95, 59.5, 0, -1, { raio: 18, recuo: 3, pegada: [44, 30], bairro: "Fazendinha" }),
];

// lojas das empresas parceiras (src/parceiros.js), na ordem da lista. A J.E Multimarcas (a 1ª, loja de carros) fica
// na Avenida da Esperança, bairro Leste, com o pátio cercado de carros atrás (PATIO_JE); as outras no lado sul da Rua do Comércio.
// Sobrando parceira, os pontos livres ficam reservados. A loja tem no máximo LOJA_MAX m de largura.
export const LOJA_MAX = 19;
// A Crescente Contabilidade (a 4ª) fica longe das outras, no oeste: lado sul da Avenida da Esperança, entre a Avenida do
// Contorno e a Educarte Kids I, num prédio-escritório maior (PEGADA_ESCRITORIO).
export const PONTOS_PARCEIROS = [[164, -59.5, 0, 1], [93, 9, 0, -1], [116, 9, 0, -1], [-160, -40.5, 0, -1], [118, -59.5, 0, 1]];
export const PEGADA_ESCRITORIO = [16, 12];
// pátio da J.E (atrás da loja, no bairro Leste, longe da praça: de lá não se vê nem custa nada): cercado, com o portão
// aberto para a Avenida do Contorno (no lado x0, de z = portao[0] a portao[1]) e 5 carros em leque, cada um com o bico
// para o portão (o escolhido sai dirigindo por ele)
const PORTAO_JE = [152, -82.5];
export const PATIO_JE = {
  x0: 152, x1: 176, z0: -94, z1: -71, portao: [-86, -79], saida: [148.5, -82.5],
  // a J.E só vende carro popular rebaixado (modelos em carros-je.js); o 1º do leque é o hatch preto
  vagas: [[-0.6, "preto", 0x0b0c0e, "hatch-g5"], [-0.3, "prata", 0x9aa0a7, "seda"], [0, "branco", 0xeef0f2, "celta"], [0.3, "vermelho", 0xb0101a, "quadrado"], [0.6, "grafite", 0x464b52, "medio"]].map(([a, cor, hex, modelo]) => {
    const x = PORTAO_JE[0] + Math.cos(a) * 12, z = PORTAO_JE[1] + Math.sin(a) * 12;
    return { x, z, cor, hex, modelo, ang: Math.atan2(PORTAO_JE[0] - x, PORTAO_JE[1] - z) };
  }),
};
PARCEIROS.slice(0, PONTOS_PARCEIROS.length).forEach((p, i) => {
  const [x, z, dx, dz] = PONTOS_PARCEIROS[i];
  const escritorio = p.tipo === "contabilidade";
  LUGARES.push(L(`parceiro-${p.id}`, p.nome, x, z, dx, dz, { parceiro: p, pegada: escritorio ? PEGADA_ESCRITORIO : [LOJA_MAX, 7.5], recuo: 1, bairro: escritorio ? "Oeste" : "Comércio" }));
});
// bairros novos (novo: true: montados depois de tudo o que já existia, para a cidade de antes ficar igualzinha)
const N = (id, nome, x, z, dx, dz, extra) => L(id, nome, x, z, dx, dz, { novo: true, ...extra });
LUGARES.push(
  // Vila dos Ipês (oeste, na Rua dos Ipês)
  N("pracaIpes", "Praça dos Ipês", -352, -150, 0, 1, { raio: 17, recuo: 0, bairro: "Vila dos Ipês" }),
  N("floricultura", "Floricultura Florzinha", -306, -120, -1, 0, { pegada: [16, 12], bairro: "Vila dos Ipês" }),
  N("pizzaria", "Pizzaria Forno Feliz", -324, -190, 1, 0, { pegada: [16, 12], bairro: "Vila dos Ipês" }),
  // Bairro das Palmeiras (leste, na Rua das Palmeiras)
  N("pracaPalmeiras", "Praça das Palmeiras", 352, 150, 0, 1, { raio: 17, recuo: 0, bairro: "Bairro das Palmeiras" }),
  N("farmacia", "Farmácia Saúde", 306, 120, 1, 0, { pegada: [16, 12], bairro: "Bairro das Palmeiras" }),
  N("brinquedos", "Loja de Brinquedos Pião", 324, -120, -1, 0, { pegada: [16, 12], bairro: "Bairro das Palmeiras" }),
  // Jardim das Estrelas (norte, na Rua do Arco-Íris e na Rua do Mirante)
  N("pracaEstrelas", "Praça das Estrelas", -150, -352, 0, 1, { raio: 17, recuo: 0, bairro: "Jardim das Estrelas" }),
  N("museu", "Museu dos Dinossauros", 150, -323.5, 0, 1, { pegada: [24, 16], recuo: 2, raio: 14, bairro: "Jardim das Estrelas" }),
  N("observatorio", "Observatório Estrelinha", -9, -355, 1, 0, { pegada: [16, 16], bairro: "Jardim das Estrelas" }),
  // Orla do Mar Azul (sul, na areia entre a Estrada da Serra e o mar) e a Ilha da Alegria
  N("orla", "Praia do Mar Azul", -70, 258, 0, 1, { raio: 22, recuo: 0, bairro: "Orla do Mar Azul" }),
  N("salvavidas", "Posto Salva-Vidas", -24, 262, 0, 1, { pegada: [5, 5], recuo: 0, raio: 10, bairro: "Orla do Mar Azul" }),
  N("pier", "Píer do Mar Azul", 28, 258, 0, 1, { raio: 10, recuo: 0, bairro: "Orla do Mar Azul" }),
  N("quiosque", "Quiosque Água de Coco", 70, 258, 0, 1, { pegada: [8, 6], recuo: 0, raio: 10, bairro: "Orla do Mar Azul" }),
  N("ilha", "Ilha da Alegria", 0, 344, 0, -1, { raio: 16, recuo: 0, bairro: "Ilha da Alegria" }),
  N("roda", "Roda-Gigante Alegria", 0, 370, 0, -1, { raio: 10, recuo: 0, bairro: "Ilha da Alegria" }),
);
export const lugar = (id) => LUGARES.find((l) => l.id === id);
// praças dos bairros novos (iguais à do Centro: chafariz, canteiros, bancos e árvores)
export const PRACAS_NOVAS = ["pracaIpes", "pracaPalmeiras", "pracaEstrelas"].map((id) => ({ id, x: lugar(id).x, z: lugar(id).z, r: 16 }));

// ---------- Bairro das Casas: 8 lotes na Rua das Casas (4 de cada lado), porta virada para a rua
const CORES_CASA = [
  { cor: "rosa", hex: 0xf59ac0, telhado: 0xc2477a }, { cor: "azul", hex: 0x8cc8f5, telhado: 0x2f6fc0 },
  { cor: "amarela", hex: 0xffd86b, telhado: 0xe0662e }, { cor: "verde", hex: 0x9ee08a, telhado: 0x3c9a4a },
  { cor: "lilás", hex: 0xc8b0f5, telhado: 0x7a52c9 }, { cor: "laranja", hex: 0xffb27a, telhado: 0xb8452a },
  { cor: "menta", hex: 0x8fe3cf, telhado: 0x1f8a7a }, { cor: "creme", hex: 0xfff0c9, telhado: 0xd94a3d },
];
export const LOTE = { w: 15, d: 22, recuo: 1 }; // largura, fundo (inclui quintal) e recuo da cerca até a calçada
// Bairro das Casas (Rua das Casas, lotes 1 a 8) e Vila das Flores (Rua das Flores, lotes 9 a 16)
export const LOTES = [
  ...[-121, -103, -85, -67].flatMap((x, i) => [
    { numero: i * 2 + 1, x, z: -8.5, dir: [0, 1], bairro: "Bairro das Casas" },
    { numero: i * 2 + 2, x, z: 8.5, dir: [0, -1], bairro: "Bairro das Casas" },
  ]),
  ...[-120, -102, -84, -66].flatMap((x, i) => [
    { numero: 9 + i * 2, x, z: -103.5, dir: [0, 1], bairro: "Vila das Flores" },
    { numero: 10 + i * 2, x, z: -86.5, dir: [0, -1], bairro: "Vila das Flores" },
  ]),
  // bairros novos: Vila dos Ipês (lotes 17 a 24, Rua dos Ipês) e Bairro das Palmeiras (lotes 25 a 32, Rua das Palmeiras)
  ...[-32, -16.5, 16.5, 32].flatMap((z, i) => [
    { numero: 17 + i * 2, x: -306, z, dir: [-1, 0], bairro: "Vila dos Ipês" },
    { numero: 18 + i * 2, x: -324, z, dir: [1, 0], bairro: "Vila dos Ipês" },
  ]),
  ...[-32, -16.5, 16.5, 32].flatMap((z, i) => [
    { numero: 25 + i * 2, x: 306, z, dir: [1, 0], bairro: "Bairro das Palmeiras" },
    { numero: 26 + i * 2, x: 324, z, dir: [-1, 0], bairro: "Bairro das Palmeiras" },
  ]),
].map((l, i) => ({ ...l, ...CORES_CASA[(i * 3) % CORES_CASA.length], ...(i < 8 ? CORES_CASA[i] : {}), id: `lote-${l.numero}`, rot: Math.atan2(l.dir[0], l.dir[1]) }));

// ---------- parque, praça e fazendinha
export const PRACA = { x: 0, z: 12, r: 16 };
export const LAGO = { x: 8, z: 104, r: 15 };
export const PLAYGROUND = { x: -26, z: 84 };
export const PARQUE = { x0: -40, x1: 40, z0: 62, z1: 128 };
export const FAZENDA = { x0: -128, x1: -62, z0: 62, z1: 128 };
export const CAMPO = { x: 95, z: 92, w: 30, d: 46 };            // campo de futebol (gol no norte e no sul)
export const ESPORTES = { x0: 62, x1: 130, z0: 62, z1: 130 };    // campo, arquibancada e vestiário
export const QUADRA = { x0: 100, x1: 130, z0: -130, z1: -104 };  // quadra poliesportiva
export const HORTA = { x0: 100, x1: 130, z0: -98, z1: -72 };     // horta comunitária
export const PARQUINHO_BEBE = { x0: -213, x1: -177, z0: 11, z1: 35 }; // pátio da Educarte Kids I
export const PATIO_KIDS2 = { x0: 179, x1: 211, z0: 11, z1: 35 };     // quadra da Educarte Kids II
export const HELIPONTO = { x: 30, z: -190, r: 10 };
export const PRAIA = { x0: -44, x1: 44, z0: 157, z1: 230 };
export const LAGO2 = { x: 0, z: 202, r: 24 };
// Mar Azul (sul): a água começa em z = costa e vai até depois da borda (o horizonte); a areia da orla fica entre a
// calçada da Estrada da Serra e a costa. A Ilha da Alegria é um círculo de areia e grama no meio do mar, com a
// roda-gigante; os píeres (na orla e na ilha) são de madeira e dá para andar neles.
export const MAR = { costa: 270, x0: -BORDA - 180, x1: BORDA + 180, z1: BORDA + 170 };
export const ORLA = { x0: -BORDA, x1: BORDA, z0: 249, z1: MAR.costa };
export const ILHA = { x: 0, z: 368, r: 30 };
export const PIERS = [{ id: "pier", x0: 26, x1: 30, z0: 256, z1: 300 }, { id: "pier-ilha", x0: -2, x1: 2, z0: 322, z1: 341 }];
export const RODA = { x: 0, z: 377, h: 14.8, r: 11, cabines: 8 }; // centro (eixo a h m), raio do aro e cabines
// água do mar (fora da ilha e dos píeres)? m = folga (o casco de um barco, por exemplo)
export const dentroPier = (x, z, m = 0) => PIERS.some((p) => x > p.x0 - m && x < p.x1 + m && z > p.z0 - m && z < p.z1 + m);
export const naIlha = (x, z, m = 0) => Math.hypot(x - ILHA.x, z - ILHA.z) < ILHA.r + m;
export const naMar = (x, z) => z > MAR.costa && !naIlha(x, z) && !dentroPier(x, z);

// ---------- vagas dos veículos que o Rabisco pode dirigir (fora do asfalto, na beira da rua)
// tipo: "carro" (conversível) | "onibus" · ang: para onde a frente aponta (0 = +z)
export const VAGAS = [
  { x: 16, z: 37, ang: Math.PI / 2, tipo: "carro", cor: 0xec2e8c },
  { x: -18, z: 37, ang: -Math.PI / 2, tipo: "carro", cor: 0x00b5f0 },
  { x: 30, z: -40, ang: Math.PI / 2, tipo: "onibus" },
  { x: HELIPONTO.x, z: HELIPONTO.z, ang: -Math.PI / 2, tipo: "heli" },
  // Fatia 4: cada veículo perto do lugar dele
  { x: 164, z: -40.5, ang: Math.PI / 2, tipo: "je" },                // carro da J.E Multimarcas, do outro lado da avenida
  { x: -40, z: -40.5, ang: Math.PI / 2, tipo: "ambulancia" },        // ambulância, do outro lado da rua do hospital
  { x: 14, z: -40.5, ang: Math.PI / 2, tipo: "bombeiro" },           // caminhão de bombeiro
  { x: 127, z: -20, ang: 0, tipo: "sorvete" },                       // van de sorvete, ao lado da sorveteria
  { x: -8, z: 32, ang: Math.PI, tipo: "bici", cor: 0xec2e8c },       // bicicleta e patinete na praça
  { x: -11, z: 32, ang: Math.PI, tipo: "patinete", cor: 0x00b5f0 },
  { x: LAGO.x, z: LAGO.z + LAGO.r - 3, ang: Math.PI, tipo: "barco" }, // barquinhos: só andam no lago
  { x: LAGO2.x, z: LAGO2.z - LAGO2.r + 3, ang: 0, tipo: "barco" },
  { x: -75, z: 108, ang: Math.PI, tipo: "trator" },                  // trator da Fazendinha
  { x: 202.5, z: 57.3, ang: Math.PI / 2, tipo: "moto", cor: 0xc8141c }, // moto esportiva na calçada dos Correios
  // Mar Azul: jet ski e lancha encostados no píer da orla (só andam no mar)
  { x: 33.6, z: 284, ang: 0, tipo: "jetski", cor: 0xec2e8c },
  { x: 21.5, z: 289, ang: 0, tipo: "lancha", cor: 0x2f6fc0 },
];
export const LARGADA = { x: 0, z: 33, dir: Math.PI }; // na frente da praça, olhando para a igreja

// ---------- prédios de enchimento (sempre iguais, pela semente): onde não tem lugar, lote, parque nem fazenda
function semente(s) {
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const sobrepoe = (a, b, folga = 0) => a.x0 < b.x1 + folga && a.x1 > b.x0 - folga && a.z0 < b.z1 + folga && a.z1 > b.z0 - folga;
export const PEGADAS_FIXAS = [
  ...LUGARES.filter((l) => l.pegada).map((l) => ({ id: l.id, ...pegadaDe(l.x, l.z, l.dir, l.pegada[0], l.pegada[1], l.recuo) })),
  ...LOTES.map((l) => ({ id: l.id, ...pegadaDe(l.x, l.z, l.dir, LOTE.w, LOTE.d, LOTE.recuo) })),
  { id: "praca", x0: PRACA.x - PRACA.r - 2, x1: PRACA.x + PRACA.r + 2, z0: PRACA.z - PRACA.r - 2, z1: PRACA.z + PRACA.r + 2 },
  ...PRACAS_NOVAS.map((p) => ({ id: p.id, x0: p.x - p.r - 2, x1: p.x + p.r + 2, z0: p.z - p.r - 2, z1: p.z + p.r + 2 })),
  { id: "parque", ...PARQUE }, { id: "fazenda", ...FAZENDA },
  { id: "esportes", ...ESPORTES }, { id: "quadra-area", ...QUADRA }, { id: "horta-area", ...HORTA },
  { id: "parquinho-bebe", ...PARQUINHO_BEBE }, { id: "patio-je", x0: PATIO_JE.x0, x1: PATIO_JE.x1, z0: PATIO_JE.z0, z1: PATIO_JE.z1 }, { id: "patio-kids2", ...PATIO_KIDS2 }, { id: "praia-area", ...PRAIA },
  { id: "heliponto-area", x0: HELIPONTO.x - HELIPONTO.r, x1: HELIPONTO.x + HELIPONTO.r, z0: HELIPONTO.z - HELIPONTO.r, z1: HELIPONTO.z + HELIPONTO.r },
  // pontos de parceira ainda livres ficam reservados (a próxima parceira já tem lugar)
  ...PONTOS_PARCEIROS.slice(PARCEIROS.length).map(([x, z, dx, dz], i) => ({ id: `reserva-parceira-${i}`, ...pegadaDe(x, z, [dx, dz], LOJA_MAX, 7.5, 1) })),
  ...VAGAS.map((v, i) => [v, i]).filter(([v]) => !["heli", "barco", "trator", "jetski", "lancha"].includes(v.tipo)).map(([v, i]) => { const [meioC, meioL] = { onibus: [7.5, 3], bombeiro: [3.8, 1.4], ambulancia: [2.9, 1.4], sorvete: [2.9, 1.4], bici: [1.0, 0.5], patinete: [0.8, 0.4], moto: [1.1, 0.45] }[v.tipo] ?? [2.6, 1.4]; const deitado = Math.abs(Math.sin(v.ang)) > 0.5; return { id: `vaga-${i}`, x0: v.x - (deitado ? meioC : meioL), x1: v.x + (deitado ? meioC : meioL), z0: v.z - (deitado ? meioL : meioC), z1: v.z + (deitado ? meioL : meioC) }; }),
  { id: "largada", x0: LARGADA.x - 3, x1: LARGADA.x + 3, z0: LARGADA.z - 3, z1: LARGADA.z + 3 },
];
export const PREDIOS = [];
{
  const r = semente(2027);
  const cores = ["#f6d2a8", "#bfe0f2", "#f5c4c4", "#c9eabf", "#fbe3a6", "#d8cdf2", "#ffd9b8", "#c4ece6"];
  const ocupado = (p) => [...PEGADAS_FIXAS, ...PREDIOS].some((o) => sobrepoe(p, o, 3));
  for (let gx = -232; gx <= 232; gx += 17) for (let gz = -232; gz <= 232; gz += 17) {
    const x = gx + (r() - 0.5) * 3, z = gz + (r() - 0.5) * 3;
    const centro = Math.abs(x) < 50 && Math.abs(z) < 50;
    const fora = Math.abs(gx) > 140 || Math.abs(gz) > 140; // anel de fora: menos prédios (bosques e casas)
    if (fora && r() < 0.55) continue;
    const w = centro ? 11 + r() * 3 : 12 + r() * 5, d = centro ? 9 + r() * 2 : 11 + r() * 4;
    // fachada para a rua mais perto
    const gxR = distRua(x + 1, z).d - distRua(x - 1, z).d, gzR = distRua(x, z + 1).d - distRua(x, z - 1).d;
    const dir = Math.abs(gxR) > Math.abs(gzR) ? [-Math.sign(gxR), 0] : [0, -Math.sign(gzR)];
    const deitado = Math.abs(dir[0]) > 0.5;
    const p = { x0: x - (deitado ? d : w) / 2, x1: x + (deitado ? d : w) / 2, z0: z - (deitado ? w : d) / 2, z1: z + (deitado ? w : d) / 2 };
    const cantos = [[p.x0, p.z0], [p.x1, p.z0], [p.x1, p.z1], [p.x0, p.z1]];
    if (cantos.some(([cx, cz]) => distRua(cx, cz).d < CALCADA + 1.5 || Math.abs(cx) > 228 || Math.abs(cz) > 228)) continue;
    if (ocupado(p)) continue;
    const andares = centro ? 2 + Math.floor(r() * 2) : 3 + Math.floor(r() * 5);
    PREDIOS.push({ id: `predio-${PREDIOS.length}`, ...p, cx: x, cz: z, w, d, dir, rot: Math.atan2(dir[0], dir[1]), andares, cor: cores[Math.floor(r() * cores.length)], tipo: r() < (fora ? 0.7 : 0.3) ? "sobrado" : "predio" });
  }
}
// prédios dos bairros novos (outra semente, depois dos de antes: os de antes não mudam). Cada bairro com o seu jeito:
// Vila dos Ipês (oeste) e Bairro das Palmeiras (leste) com mais sobrados; Jardim das Estrelas (norte) misturado; as
// Torres do Horizonte (nordeste) com prédios altos. Nada no sul (areia e mar).
export const PREDIOS_NOVOS = [];
{
  const r = semente(4049);
  const cores = ["#f6d2a8", "#bfe0f2", "#f5c4c4", "#c9eabf", "#fbe3a6", "#d8cdf2", "#ffd9b8", "#c4ece6"];
  const ocupado = (p) => [...PEGADAS_FIXAS, ...PREDIOS, ...PREDIOS_NOVOS].some((o) => sobrepoe(p, o, 3));
  for (let gx = -382; gx <= 382; gx += 17) for (let gz = -382; gz <= 230; gz += 17) {
    if (Math.max(Math.abs(gx), Math.abs(gz)) < 256) continue; // dentro da Serra: a cidade de antes
    const x = gx + (r() - 0.5) * 3, z = gz + (r() - 0.5) * 3;
    const torres = x > 240 && z < -240, norte = z < -249 && !torres;
    if (r() < (torres ? 0.25 : norte ? 0.4 : 0.45)) continue;
    const w = 12 + r() * 5, d = 11 + r() * 4;
    const gxR = distRua(x + 1, z).d - distRua(x - 1, z).d, gzR = distRua(x, z + 1).d - distRua(x, z - 1).d;
    const dir = Math.abs(gxR) > Math.abs(gzR) ? [-Math.sign(gxR), 0] : [0, -Math.sign(gzR)];
    const deitado = Math.abs(dir[0]) > 0.5;
    const p = { x0: x - (deitado ? d : w) / 2, x1: x + (deitado ? d : w) / 2, z0: z - (deitado ? w : d) / 2, z1: z + (deitado ? w : d) / 2 };
    const cantos = [[p.x0, p.z0], [p.x1, p.z0], [p.x1, p.z1], [p.x0, p.z1]];
    if (cantos.some(([cx, cz]) => distRua(cx, cz).d < CALCADA + 1.5 || Math.abs(cx) > 378 || cz < -378 || cz > 236)) continue;
    if (ocupado(p)) continue;
    const andares = torres ? 6 + Math.floor(r() * 5) : norte ? 3 + Math.floor(r() * 4) : 2 + Math.floor(r() * 3);
    PREDIOS_NOVOS.push({ id: `predio-novo-${PREDIOS_NOVOS.length}`, ...p, cx: x, cz: z, w, d, dir, rot: Math.atan2(dir[0], dir[1]), andares, cor: cores[Math.floor(r() * cores.length)], tipo: r() < (torres ? 0 : norte ? 0.45 : 0.7) ? "sobrado" : "predio" });
  }
}

// ---------- semáforos nos cruzamentos das avenidas com as ruas do Sol e da Lua
export const SEMAFOROS = [[-50, -50], [50, -50], [-50, 50], [50, 50]].map(([x, z]) => ({ x, z, wX: 12, wZ: 11 }));

// ---------- rotas fechadas dos carros (sentido de quem dirige; a faixa da direita é calculada na hora)
export const ROTAS = [
  { id: "contorno", pts: CONTORNO, carros: 4 },
  { id: "centro", pts: [[-50, -50], [50, -50], [50, 50], [-50, 50]], carros: 3 },
  { id: "leste", pts: [[50, -50], [140, -50], [140, 50], [50, 50]], carros: 2 },
  { id: "oeste", pts: [[-140, -50], [-50, -50], [-50, 50], [-140, 50]], carros: 2 },
  { id: "comercio", pts: [[50, 0], [140, 0], [140, 50], [50, 50]], carros: 1 },
  { id: "flores", pts: [[-140, -95], [-50, -95], [-50, -50], [-140, -50]], carros: 1 },
  { id: "serra", pts: SERRA, carros: 5 },
  { id: "leste-fora", pts: [[140, -50], [240, -50], [240, 50], [140, 50]], carros: 1 },
  { id: "oeste-fora", pts: [[-240, -50], [-140, -50], [-140, 50], [-240, 50]], carros: 1 },
  // bairros novos (a volta do Horizonte fecha pela Estrada da Serra, na orla)
  { id: "horizonte", pts: HORIZONTE, carros: 4 },
  { id: "norte-fora", pts: [[-50, -240], [-50, -390], [50, -390], [50, -240]], carros: 1 },
  { id: "arcoiris", pts: [[-315, -390], [315, -390], [315, -315], [-315, -315]], carros: 2 },
  { id: "ipes", pts: [[-390, -50], [-315, -50], [-315, 50], [-390, 50]], carros: 1 },
  { id: "palmeiras", pts: [[390, -50], [315, -50], [315, 50], [390, 50]], carros: 1 },
];

// ---------- moradores do estojo: em que rua caminham (calçada) e de que tipo são
export const MORADORES = [
  { tipo: "lapis", cor: 0xe8413c, nome: "Lápis Vermelho", rua: "av-sul", lado: 1 },
  { tipo: "borracha", nome: "Borrachinha", rua: "casas", lado: -1 },
  { tipo: "apontador", cor: 0x2f8fe8, nome: "Apontador Azul", rua: "comercio", lado: 1 },
  { tipo: "giz", cor: 0xffa21f, nome: "Giz de Cera Laranja", rua: "oeste", lado: 1 },
  { tipo: "cola", nome: "Colinha", rua: "av-norte", lado: 1 },
  { tipo: "regua", nome: "Régua Rui", rua: "leste", lado: -1 },
  { tipo: "pincel", cor: 0x8e6cff, nome: "Pincel Roxo", rua: "av-sul", lado: -1 },
  { tipo: "caderno", cor: 0x1fc08e, nome: "Caderninho", rua: "comercio", lado: -1 },
  { tipo: "clipe", cor: 0xec2e8c, nome: "Clipe Rosa", rua: "casas", lado: 1 },
  { tipo: "lapis", cor: 0x58c43a, nome: "Lápis Verde", rua: "av-norte", lado: -1 },
  { tipo: "giz", cor: 0x2f8fe8, nome: "Giz de Cera Azul", rua: "mirante", lado: 1 },
  { tipo: "borracha", nome: "Borrachão", rua: "serra", lado: -1 },
  { tipo: "caderno", cor: 0xff7a00, nome: "Caderno Laranja", rua: "av-sul", lado: 1 },
  { tipo: "pincel", cor: 0x1fc08e, nome: "Pincel Verde", rua: "comercio", lado: 1 },
  // bairros novos
  { tipo: "clipe", cor: 0xffcc1f, nome: "Clipe Amarelo", rua: "ipes", lado: 1 },
  { tipo: "apontador", cor: 0xec2e8c, nome: "Apontador Rosa", rua: "palmeiras", lado: -1 },
  { tipo: "regua", nome: "Reguinha", rua: "arcoiris", lado: 1 },
  { tipo: "lapis", cor: 0x8e6cff, nome: "Lápis Roxo", rua: "horizonte", lado: 1 },
];
