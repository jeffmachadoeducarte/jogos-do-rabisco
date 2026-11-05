// Rabiscolândia: o Sítio Floresça, Escola de Campo Educarte (parceira "sitio-floresca", da Tia Regina). Dados puros, sem
// three.js e sem import (falas.mjs e os testes leem este arquivo no node).
//
// Tudo em coordenadas LOCAIS do terreno (a convenção das fachadas: o portão em z = 0, olhando para +z, para a Avenida da
// Alegria; o terreno vai até z = -D, lá no fundo). No mundo o terreno fica girado de 180° (mundo.js · mundoDe), no canto
// sudoeste da cidade, entre a Avenida do Horizonte e a Rua dos Ipês. Para quem entra pelo portão (andando para -z), a
// esquerda é -x.
//
// Tudo o que é construído fica do LADO ESQUERDO, encostado na divisa, em fila, da frente para o fundo:
//   casa de tijolinho → o salão comprido de treliça (continuação da casa) → espaço verde com a hortinha → galinheiro → lago
//   comprido cercado (com o pinheiro ao lado) → no fundo, a casa-container branca do Junior, com o deck que vira píer no
//   lago. O lado DIREITO é gramado livre, com a fileira de árvores frutíferas na divisa
//   (algumas com balanço de pneu). Não tem celeiro.
export const SITIO = {
  W: 56, D: 138, // largura (x) e fundo (z) do terreno cercado
  portao: { meia: 2.2, alto: 1.55 }, // duas folhas de 2,2 m (de x = -2,2 a 2,2), abrindo para dentro
  campainha: [2.95, 0.36], // no palanque da direita do portão, do lado de fora
  // onde a Tia Regina fica: na calçada da casa (portão fechado), logo depois do portão (missão da Ale) e na frente do
  // salão, no gramado, esperando (missões depois da Ale)
  regina: { casa: [-15.6, -16.5], portao: [3.2, -3.8], espera: [-9, -40] },
  estrada: { larg: 3.2, z1: -21 }, // do portão até a altura da porta da casa (e a trilha até a calçada)
  casa: { x0: -26, x1: -17, z0: -25, z1: -9, h: 3.0, cume: 2.5 },
  // o salão (varanda comprida de treliça, das aulas): o comprimento ao longo de z, a frente (treliça) olhando para +x
  salao: { x0: -27, x1: -19, z0: -55.5, z1: -27.5, h: 3.0, frente: -16.4 },
  horta: { x0: -25, x1: -17.5, z: [-58.7, -61.5, -64.3], larg: 1.6 }, // três canteiros ao longo de x
  regador: [-15.6, -57.2], // a torneirinha e o regador, na ponta dos canteiros
  galinheiro: { x0: -27, x1: -16, z0: -75.5, z1: -66 },
  balde: [-15, -68.5], // o balde de milho, encostado na tela do galinheiro (por fora)
  milhoGalinhas: [-19.5, -71], // onde o milho cai, dentro do cercadinho
  // o lago comprido (três vezes o de antes), indo para o fundo; a cerca; a água fica 1,4 m para dentro
  lago: { x0: -27, x1: -9, z0: -129, z1: -77, x: -18, z: -103, borda: 1.4 },
  marcaLago: [-7.2, -103], // na frente do portãozinho do lago (lado do gramado), por fora da cerca
  dentroLago: [-12.4, -103], // logo depois do portãozinho, já na água
  pinheiro: [-5.4, -117],
  // a casa-container do Junior, no fundo (comprimento em x, a porta de vidro olhando para o lago), em cima de calços; o deck
  // passa na frente da porta (com a escada na ponta da direita) e vira o píer que entra no lago
  container: { x0: -26.2, x1: -14, z0: -134.1, z1: -131.66, base: 0.8, h: 2.6, porta: [-21.3, 4.6] }, // porta: centro em x e largura
  deck: { x0: -27, x1: -13, z0: -131.6, z1: -129.3, y: 0.8 },
  escada: [[-13, -12.2, 0.54], [-12.2, -11.4, 0.27]], // degraus: [x0, x1, altura]
  pier: { x0: -22.5, x1: -20.9, z1: -123.4 }, // do deck até z1, por cima da água
  junior: [-18.6, -130.4], // em pé no deck, perto da porta
  vara: [-16.2, -130.6], // a vara de pescar encostada no container
  pesca: [-21.7, -124.2], // a ponta do píer
  boia: [-21.7, -120.2], // onde a linha cai na água
  // árvores frutíferas na divisa da direita (x = +24): [z, tipo, balanço?]
  frutiferas: [[-14, "manga", 0], [-27, "laranja", 1], [-40, "goiaba", 0], [-53, "pitanga", 0], [-66, "manga", 1], [-79, "laranja", 0], [-92, "goiaba", 0], [-105, "pitanga", 0], [-118, "manga", 1], [-130, "laranja", 0]],
  frutX: 24,
  // grama alta para roçar (missão "Roçar a grama"): trechos no lado direito
  capim: [[8, -22], [15, -38], [6, -54], [16, -70], [7, -86], [15, -102]],
  capimR: 2.3,
  rocador: [9, -12], // onde o roçador fica estacionado (bico para o fundo)
  estacionaOnibus: [8.5, 2.6], // na calçada larga em frente ao sítio, fora da avenida (o ônibus da Kids II para aqui)
  fuga: { x0: 3, x1: 20, z0: -60, z1: -10 }, // onde a Ale corre pelo gramado
  patio: { x0: -4, x1: 20, z0: -90, z1: -8 }, // onde o Duck brinca
  alturaDeck: 0.8,
};

// falas da anfitriã (viram MP3 em falas.mjs). A Tia Regina NÃO fala: a anfitriã narra, em terceira pessoa.
export const FALAS_SITIO = {
  "rp-sitio-campainha": "Ding-dong! A Tia Regina já vem abrir o portão.",
  "rp-sitio-entrou": "Portão aberto! Bem-vindo ao Sítio Floresça, a Escola de Campo Educarte.",
};
