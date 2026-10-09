// Camarim das Profissões (4 e 5 anos): vista o Rabisco de bombeiro, médico, chef ou astronauta
// e veja ele trabalhar. Peças de outras profissões estão misturadas no guarda-roupa.

import { jogoDeVestir } from "../../src/motor/vestir.js";

const jogo = jogoDeVestir({
  titulo: "Camarim das Profissões",
  sub: "O que o Rabisco vai ser hoje?",
  faixa: "pequenos",
  cor: "#8E6CFF",
  prefixoFala: "cp",
  falas: { titulo: "cp-titulo", vitoria: "cp-vitoria" },
  fases: [
    { nome: "Bombeiro", desc: "🚒", cena: "profissao", pedido: "Vamos ser bombeiro! 🚒", fala: "cp-bombeiro",
      certas: ["capacete-bombeiro", "farda-bombeiro", "calca-bombeiro", "botas-bombeiro", "mangueira"], erradas: ["chapeu-chef", "jaleco"],
      naoServe: "Isso não é de bombeiro!", falaNao: "cp-nao", falaPronto: "cp-pronto-bombeiro", pronto: "O bombeiro apagou o fogo!", titulo: "Fogo apagado!",
      efeito: { emojis: ["💧", "💦", "🔥"], de: [0.95, 0.62], para: [1.9, 0.4], n: 18 } },
    { nome: "Médico", desc: "🩺", cena: "profissao", pedido: "Vamos ser médico! 🩺", fala: "cp-medico",
      certas: ["jaleco", "estetoscopio", "calca-jeans"], erradas: ["capacete-astronauta", "colher-pau", "mangueira"],
      naoServe: "Isso não é de médico!", falaNao: "cp-nao", falaPronto: "cp-pronto-medico", pronto: "O médico cuidou de todo mundo!",
      efeito: { emojis: ["❤️", "💖", "🩹"], de: [0.5, 0.45], para: [0.5, -0.1], n: 14 } },
    { nome: "Chef", desc: "🍳", cena: "profissao", pedido: "Vamos ser chef de cozinha! 🍳", fala: "cp-chef",
      certas: ["chapeu-chef", "dolma-chef", "colher-pau"], erradas: ["capacete-bombeiro", "estetoscopio", "traje-astronauta"],
      naoServe: "Isso não é de chef!", falaNao: "cp-nao", falaPronto: "cp-pronto-chef", pronto: "O chef fez um bolo delicioso!",
      efeito: { emojis: ["🎂", "🍰", "✨"], de: [1.0, 0.45], para: [1.5, 0.1], n: 12 } },
    { nome: "Astronauta", desc: "🚀", cena: "profissao", pedido: "Vamos ser astronauta! 🚀", fala: "cp-astronauta",
      certas: ["capacete-astronauta", "traje-astronauta", "calca-astronauta", "botas-astronauta"], erradas: ["chapeu-chef", "farda-bombeiro"],
      naoServe: "Isso não vai para o espaço!", falaNao: "cp-nao", falaPronto: "cp-pronto-astronauta", pronto: "Rumo às estrelas!",
      efeito: { emojis: ["🚀", "⭐", "🌙", "🪐"], de: [0.5, 0.9], para: [0.5, -0.4], n: 14 } },
  ],
});
if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo };
