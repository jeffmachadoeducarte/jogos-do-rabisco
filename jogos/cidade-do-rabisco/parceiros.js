// Empresas parceiras que aparecem na Cidade do Rabisco: cada uma ganha um prédio cuja frente inteira é a foto
// real da fachada, nos pontos de PONTOS_PARCEIROS (mapa.js), na ordem desta lista.
// Para incluir uma parceira nova: pôr a foto em assets/parceiros/ (webp leve, recortada só na fachada: de canto
// a canto e do chão ao topo, sem céu nem rua) e acrescentar uma linha aqui. O prédio pega a proporção da foto.
// Trocou a foto de uma parceira? Suba o número do ?v= dela.
//  - nome: como aparece no passaporte e no mapa · foto: caminho a partir da raiz do site
//  - tipo: "carros" | "academia" | "moda" (cor das laterais e do telhado)
export const PARCEIROS = [
  { id: "je-multimarcas", nome: "J.E Multimarcas", foto: "assets/parceiros/je-multimarcas.webp?v=3", tipo: "carros", instagram: "jemultimarcasitajai" },
  { id: "bella-cat", nome: "Bella Cat Make Biju", foto: "assets/parceiros/bella-cat.webp?v=1", tipo: "moda" },
  { id: "rise-up", nome: "Academia Rise Up", foto: "assets/parceiros/rise-up.webp?v=1", tipo: "academia" },
];

// cores das laterais/fundo (parede) e do telhado (beiral) por tipo de loja
export const ESTILO_PARCEIRO = {
  carros: { parede: "#f2f2f2", beiral: "#1d1d1d" },
  academia: { parede: "#e3d2b4", beiral: "#2a2522" },
  moda: { parede: "#f4eef8", beiral: "#c9b3e6" },
  igreja: { parede: "#a9a8a3", beiral: "#f4f4f1" }, // concreto cinza com a moldura branca da Igreja Reviver
};

// A Igreja Reviver (lugar "igreja" de mapa.js) usa o mesmo prédio das lojas parceiras: a frente inteira é a foto
// real da fachada (recorte: da borda de cima da moldura branca até o chão do pátio, de ponta a ponta do prédio).
// Ela é maior que as lojas (altura, fundo e largura máxima próprios). Enquanto a foto não carrega (ou se faltar),
// a frente é um desenho provisório na mesma proporção (proporcao): concreto, moldura branca, arco azul-marinho
// e vidro espelhado. Trocou a foto? Suba o ?v=.
export const IGREJA = {
  id: "igreja-reviver", nome: "Igreja Reviver", foto: "assets/parceiros/igreja-reviver.webp?v=1", tipo: "igreja",
  altura: 12, d: 14, larguraMax: 26, proporcao: 1024 / 550,
};
