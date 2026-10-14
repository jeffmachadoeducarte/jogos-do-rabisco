// Rabisco e a Arca: fases, itens em inglês e versículos.
// As falas gravadas saem daqui: `node jogos/rabisco-e-a-arca/falas.mjs` reescreve falas.json, que o
// ferramentas/gerar_vozes.py lê (bloco "Rabisco e a Arca") para gravar os MP3 em assets/voz.
//
// Chaves das falas em inglês (voz en-US-AnaNeural):
//   en-arca-find-<id>   "Find the lion!"          (o pedido)
//   en-arca-yes-<id>    "Yes! The lion!"          (pegou o certo)
//   en-arca-thats-<id>  "Oops! That's the zebra." (pegou outro: aprende o nome desse também)
//   en-arca-frase-<id>  "It has a long neck. Who is it?" (fases de frases)
// Em português (pt-BR-FranciscaNeural): arca-* (instruções e versículos).

// tipo: "animal" | "cor" | "numero"; en: como aparece escrito; fala: como a voz diz no pedido
export const ITENS = {
  lion: { tipo: "animal", emoji: "🦁", en: "LION" },
  elephant: { tipo: "animal", emoji: "🐘", en: "ELEPHANT" },
  giraffe: { tipo: "animal", emoji: "🦒", en: "GIRAFFE" },
  zebra: { tipo: "animal", emoji: "🦓", en: "ZEBRA" },
  monkey: { tipo: "animal", emoji: "🐒", en: "MONKEY" },
  rabbit: { tipo: "animal", emoji: "🐰", en: "RABBIT" },
  bear: { tipo: "animal", emoji: "🐻", en: "BEAR" },
  cow: { tipo: "animal", emoji: "🐄", en: "COW" },
  duck: { tipo: "animal", emoji: "🦆", en: "DUCK" },
  horse: { tipo: "animal", emoji: "🐴", en: "HORSE" },
  pig: { tipo: "animal", emoji: "🐷", en: "PIG" },
  turtle: { tipo: "animal", emoji: "🐢", en: "TURTLE" },
  bird: { tipo: "animal", emoji: "🐦", en: "BIRD" },
  dog: { tipo: "animal", emoji: "🐶", en: "DOG" },
  cat: { tipo: "animal", emoji: "🐱", en: "CAT" },
  red: { tipo: "cor", cor: 0xe8413c, en: "RED" },
  orange: { tipo: "cor", cor: 0xff7a00, en: "ORANGE" },
  yellow: { tipo: "cor", cor: 0xffcc1f, en: "YELLOW" },
  green: { tipo: "cor", cor: 0x3fae4a, en: "GREEN" },
  blue: { tipo: "cor", cor: 0x1e7bff, en: "BLUE" },
  purple: { tipo: "cor", cor: 0x8e6cff, en: "PURPLE" },
  pink: { tipo: "cor", cor: 0xff6fb5, en: "PINK" },
};
const NUM = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
NUM.forEach((n, i) => { ITENS[n] = { tipo: "numero", num: i + 1, en: n.toUpperCase() }; });

// frases (fases 5 e 6): ouvir a pista e achar o animal
export const FRASES = {
  giraffe: "It has a long neck.",
  cow: "It says moo.",
  duck: "It says quack.",
  rabbit: "It has long ears.",
  turtle: "It is very slow.",
  zebra: "It has black and white stripes.",
  monkey: "It likes bananas.",
  lion: "It says roar.",
  bird: "It can fly.",
  elephant: "It is very big.",
};

// Versículos curtos (fim de cada fase): português (lido pela Francisca) e inglês (lido pela Ana)
export const VERSICULOS = [
  { ref: "Gênesis 1:31", refEn: "Genesis 1:31", pt: "Deus viu tudo o que havia feito, e era muito bom.", en: "God saw all that he had made, and it was very good.",
    falaPt: "Deus viu tudo o que havia feito, e era muito bom! Gênesis um, trinta e um.", falaEn: "God saw all that he had made, and it was very good. Genesis one, thirty-one." },
  { ref: "Gênesis 6:22", refEn: "Genesis 6:22", pt: "Noé fez tudo como Deus tinha mandado.", en: "Noah did everything just as God commanded him.",
    falaPt: "Noé fez tudo como Deus tinha mandado. Gênesis seis, vinte e dois.", falaEn: "Noah did everything just as God commanded him. Genesis six, twenty-two." },
  { ref: "Salmo 104:24", refEn: "Psalm 104:24", pt: "Quantas são as tuas obras, Senhor!", en: "How many are your works, Lord!",
    falaPt: "Quantas são as tuas obras, Senhor! Salmo cento e quatro, vinte e quatro.", falaEn: "How many are your works, Lord! Psalm one hundred four, twenty-four." },
  { ref: "Gênesis 7:9", refEn: "Genesis 7:9", pt: "Os animais entraram na arca de dois em dois.", en: "Two by two they came to Noah and entered the ark.",
    falaPt: "Os animais entraram na arca de dois em dois. Gênesis sete, nove.", falaEn: "Two by two they came to Noah and entered the ark. Genesis seven, nine." },
  { ref: "Provérbios 12:10", refEn: "Proverbs 12:10", pt: "Quem é justo cuida bem dos seus animais.", en: "The righteous care for the needs of their animals.",
    falaPt: "Quem é justo cuida bem dos seus animais. Provérbios doze, dez.", falaEn: "The righteous care for the needs of their animals. Proverbs twelve, ten." },
  { ref: "Gênesis 9:13", refEn: "Genesis 9:13", pt: "Coloquei o meu arco-íris nas nuvens.", en: "I have set my rainbow in the clouds.",
    falaPt: "Coloquei o meu arco-íris nas nuvens. Gênesis nove, treze.", falaEn: "I have set my rainbow in the clouds. Genesis nine, thirteen." },
];

// 6 fases: animais → cores → números → frases. andares ≤ 4 para os itens caberem entre as vigas.
// alvos: o que a voz pede, em ordem (um andar por vez, de baixo para cima); outros: os itens "de enfeite" no caminho
export const FASES = [
  { nome: "Animals", sub: "Animais", modo: "nome", andares: 3, inclina: 8, vel: 56, intervalo: 6.2, extras: 1,
    alvos: ["lion", "elephant", "giraffe"], outros: ["zebra", "monkey", "rabbit", "bear"], tema: "manha", falaPt: "arca-inicio" },
  { nome: "More animals", sub: "Mais animais", modo: "nome", andares: 4, inclina: 12, vel: 66, intervalo: 5.2, extras: 1,
    alvos: ["zebra", "monkey", "rabbit", "bear"], outros: ["lion", "cow", "duck", "horse", "pig"], tema: "tarde", falaPt: "arca-mais" },
  { nome: "Colors", sub: "Cores", modo: "nome", andares: 4, inclina: 12, vel: 72, intervalo: 4.8, extras: 1, descem: 0.15,
    alvos: ["red", "yellow", "green", "blue"], outros: ["orange", "purple", "pink"], tema: "nublado", falaPt: "arca-cores" },
  { nome: "Numbers", sub: "Números", modo: "nome", andares: 4, inclina: 14, vel: 78, intervalo: 4.4, extras: 2, descem: 0.2,
    alvos: ["three", "seven", "five", "ten"], outros: ["one", "two", "four", "six", "eight", "nine"], tema: "tarde", falaPt: "arca-numeros" },
  { nome: "Who is it?", sub: "Frases", modo: "frase", andares: 4, inclina: 14, vel: 84, intervalo: 4.0, extras: 2, descem: 0.25, pulam: 0.25,
    alvos: ["giraffe", "cow", "duck", "rabbit"], outros: ["lion", "zebra", "elephant", "monkey", "turtle", "pig", "horse", "bear"], tema: "por-do-sol", falaPt: "arca-frases" },
  { nome: "Before the rain", sub: "Antes da chuva", modo: "frase", andares: 4, inclina: 16, vel: 90, intervalo: 3.6, extras: 2, descem: 0.3, pulam: 0.35,
    alvos: ["turtle", "zebra", "monkey", "lion", "bird"], outros: ["cow", "duck", "giraffe", "elephant", "rabbit", "pig", "horse", "bear", "dog", "cat"], tema: "chuva", falaPt: "arca-chuva" },
];

// Falas em português (Francisca)
export const FALAS_PT = {
  "arca-titulo": "Rabisco e a Arca! A chuva vai chegar. Ajude o Rabisco a levar os animais até a arca!",
  "arca-inicio": "Ouça o pedido em inglês e pule para pegar o certo. Cuidado com os barris da Manchinha!",
  "arca-mais": "Mais animais chegando! Ouça em inglês e pule para pegar.",
  "arca-cores": "Agora, as cores do arco-íris! Ouça a cor em inglês.",
  "arca-numeros": "Agora, os números em inglês! Ouça e ache o número certo.",
  "arca-frases": "Agora é uma pista em inglês. Ouça e descubra qual é o animal!",
  "arca-chuva": "As primeiras gotinhas! Vamos depressa levar todos para a arca!",
  "arca-porta-fechada": "A porta da arca ainda está fechada. Ache todos primeiro!",
  "arca-porta": "A porta da arca abriu! Agora suba até a ovelhinha!",
  "arca-quase": "Quase! Tente de novo!",
  "arca-recomeca": "Vamos começar de novo, lá de baixo. Você consegue!",
  "arca-pulo": "Boa! Pulou o barril!",
  "arca-pule": "Pule para pegar!",
};
VERSICULOS.forEach((v, i) => { FALAS_PT[`arca-v${i + 1}`] = v.falaPt; });

// Falas em inglês (Ana)
export const FALAS_EN = { "en-arca-great": "Great job! All the animals are safe!", "en-arca-lets-go": "Let's go!" };
for (const [id, it] of Object.entries(ITENS)) {
  const palavra = it.en.toLowerCase();
  if (it.tipo === "animal") {
    FALAS_EN[`en-arca-find-${id}`] = `Find the ${palavra}!`;
    FALAS_EN[`en-arca-yes-${id}`] = `Yes! The ${palavra}!`;
    FALAS_EN[`en-arca-thats-${id}`] = `Oops! That's the ${palavra}.`;
  } else if (it.tipo === "cor") {
    FALAS_EN[`en-arca-find-${id}`] = `Find ${palavra}!`;
    FALAS_EN[`en-arca-yes-${id}`] = `Yes! ${it.en[0]}${palavra.slice(1)}!`;
    FALAS_EN[`en-arca-thats-${id}`] = `Oops! That's ${palavra}.`;
  } else {
    FALAS_EN[`en-arca-find-${id}`] = `Find number ${palavra}!`;
    FALAS_EN[`en-arca-yes-${id}`] = `Yes! ${it.en[0]}${palavra.slice(1)}!`;
    FALAS_EN[`en-arca-thats-${id}`] = `Oops! That's ${palavra}.`;
  }
}
for (const [id, f] of Object.entries(FRASES)) FALAS_EN[`en-arca-frase-${id}`] = `${f} Who is it?`;
VERSICULOS.forEach((v, i) => { FALAS_EN[`en-arca-v${i + 1}`] = v.falaEn; });
