// Veste o Rabisco (1 ano e meio a 3 anos): está chovendo? Hora da capa e da galocha!
// Cada fase é um clima; a criança veste o Rabisco com as roupas certas para ele.

import { jogoDeVestir } from "../../src/motor/vestir.js";

const jogo = jogoDeVestir({
  titulo: "Veste o Rabisco",
  sub: "Que roupa combina com o tempo?",
  faixa: "bem-pequenos",
  cor: "#FF5FA2",
  prefixoFala: "vr",
  falas: { titulo: "vr-titulo", vitoria: "vr-vitoria" },
  fases: [
    { nome: "Chuva", desc: "🌧️", cena: "chuva", pedido: "Está chovendo! 🌧️", fala: "vr-chuva",
      certas: ["capa-chuva", "galochas", "guarda-chuva", "sueste"], erradas: ["oculos-sol", "boia"],
      naoServe: "Com chuva, não!", falaNao: "vr-nao-chuva", falaPronto: "vr-pronto-chuva", pronto: "Pronto para a chuva!",
      efeito: { emojis: ["💧", "💦"], de: [0.5, 0.05], para: [0.5, 0.9], n: 16 } },
    { nome: "Praia", desc: "☀️", cena: "sol", pedido: "Que sol! Vamos à praia! ☀️", fala: "vr-sol",
      certas: ["oculos-sol", "chapeu-sol", "boia"], erradas: ["gorro", "casaco", "galochas"],
      naoServe: "Na praia, não!", falaNao: "vr-nao-sol", falaPronto: "vr-pronto-sol", pronto: "Pronto para a praia!",
      efeito: { emojis: ["☀️", "🐚", "🌊"], de: [0.5, 0.5], para: [0.5, 0.0], n: 12 } },
    { nome: "Frio", desc: "❄️", cena: "frio", pedido: "Brrr! Que frio! ❄️", fala: "vr-frio",
      certas: ["gorro", "cachecol", "casaco", "botas-neve"], erradas: ["boia", "oculos-sol"],
      naoServe: "No frio, não!", falaNao: "vr-nao-frio", falaPronto: "vr-pronto-frio", pronto: "Quentinho no frio!",
      efeito: { emojis: ["❄️", "⛄"], de: [0.5, 0.0], para: [0.5, 0.95], n: 14 } },
  ],
});
if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo };
