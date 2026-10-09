// Ateliê do Rabisco (4 e 5 anos): balde de tinta, pincel livre e adesivos. Começa só com as cores
// primárias, o branco e o preto; no pote, a criança mistura duas cores e descobre as outras
// (azul + amarelo = verde). As cores descobertas entram na paleta.

import { jogoDePintar } from "../../src/motor/pintura.js";

const jogo = jogoDePintar({
  titulo: "Ateliê do Rabisco",
  sub: "Misture as cores e pinte do seu jeito!",
  faixa: "pequenos",
  cor: "#8E6CFF",
  cores: ["vermelho", "amarelo", "azul", "branco", "preto"],
  ferramentas: true,
  pote: true,
  tam: 54,
  falas: { titulo: "at-titulo", vitoria: "at-vitoria" },
});
if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo };
