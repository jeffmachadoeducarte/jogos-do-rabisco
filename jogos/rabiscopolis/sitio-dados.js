// Rabiscolândia: o Sítio Floresça, Escola de Campo Educarte (parceira "sitio-floresca", da Tia Regina). Dados puros, sem
// three.js e sem import (falas.mjs e os testes leem este arquivo no node).
//
// Tudo em coordenadas LOCAIS do terreno (a convenção das fachadas: o portão em z = 0, olhando para +z, para a Avenida da
// Alegria; o terreno vai até z = -D, lá no fundo). No mundo o terreno fica girado de 180° (mundo.js · mundoDe), no canto
// sudoeste da cidade, entre a Avenida do Horizonte e a Rua dos Ipês. Para quem entra pelo portão (andando para -z), a
// esquerda é -x: a casa de tijolinho fica ali, à esquerda da estradinha.
//
//   portão (z = 0) → gramado → casa (esquerda) · galinheiro → celeiro de madeira + varanda de treliça (fundos) → lago cercado
export const SITIO = {
  W: 56, D: 138, // largura (x) e fundo (z) do terreno cercado
  portao: { meia: 2.2, alto: 1.55 }, // duas folhas de 2,2 m (de x = -2,2 a 2,2), abrindo para dentro
  campainha: [2.95, 0.36], // no palanque da direita do portão, do lado de fora
  // onde a Tia Regina fica: na varanda da casa (portão fechado), logo depois do portão (missão da Ale) e no meio da
  // estradinha esperando o Duck (missão do Duck)
  regina: { casa: [-9.6, -22], portao: [3.2, -3.8], espera: [2.6, -60] },
  estrada: { larg: 3.2, z1: -93 },
  casa: { x0: -20, x1: -11, z0: -32, z1: -16, h: 3.0, cume: 2.5 },
  galinheiro: { x0: -26, x1: -17, z0: -58, z1: -47 },
  celeiro: { x0: -8, x1: 4, z0: -106, z1: -94, h: 3.8, cume: 3.2 },
  varanda: { x0: -26, x1: -8, z0: -106, z1: -98, h: 3.0, frente: -95.4 },
  lago: { x: 16, z: -122, r: 8.5, cerca: 10.5 },
  marcaLago: [16, -109.4], // na frente do portãozinho do lago, por fora da cerca
  fuga: { x0: 5, x1: 24, z0: -58, z1: -10 }, // onde a Ale corre pelo gramado
  patio: { x0: -6, x1: 22, z0: -88, z1: -8 }, // onde o Duck brinca
  pinheiro: [4.6, -128],
};

// falas da anfitriã (viram MP3 em falas.mjs). A Tia Regina NÃO fala: a anfitriã narra, em terceira pessoa.
export const FALAS_SITIO = {
  "rp-sitio-campainha": "Ding-dong! A Tia Regina já vem abrir o portão.",
  "rp-sitio-entrou": "Portão aberto! Bem-vindo ao Sítio Floresça, a Escola de Campo Educarte.",
};
