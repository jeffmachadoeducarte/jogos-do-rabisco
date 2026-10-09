// Colorir Mágico (1 ano e meio a 3 anos): escolha a cor e toque numa parte do desenho;
// ela se pinta sozinha, sem sair da linha. Cores grandes e poucas, para mãos pequenas.

import { jogoDePintar } from "../../src/motor/pintura.js";

const jogo = jogoDePintar({
  titulo: "Colorir Mágico",
  sub: "Toque na cor e depois no desenho!",
  faixa: "bem-pequenos",
  cor: "#FF5FA2",
  cores: ["vermelho", "amarelo", "azul", "verde", "laranja", "rosa", "roxo", "marrom"],
  tam: 64,
  falas: { titulo: "cm-titulo", vitoria: "cm-vitoria" },
});
if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo };
