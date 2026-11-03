// Empresas parceiras que aparecem na Rabiscolândia (e no Rabisco Kart): cada uma ganha um prédio cuja frente inteira é a foto
// real da fachada, nos pontos de PONTOS_PARCEIROS (jogos/rabiscopolis/mapa.js), na ordem desta lista.
// Para incluir uma parceira nova: pôr a foto em assets/parceiros/ (webp leve, recortada só na fachada: de canto
// a canto e do chão ao topo, sem céu nem rua) e acrescentar uma linha aqui. O prédio pega a proporção da foto.
// Trocou a foto de uma parceira? Suba o número do ?v= dela.
//  - instagram (opcional): só com o @ confirmado pelo dono do jogo. Na Rabiscolândia aparece na placa da fachada (jogos/rabiscopolis/placas-instagram.js).
//  - nome: como aparece no passaporte e no mapa · foto: caminho a partir da raiz do site
//  - larguraMax (opcional): largura máxima do prédio (a J.E é mais estreita para caber o pátio de carros ao lado)
//  - tipo: "carros" | "academia" | "moda" | "contabilidade" | "presentes" | "joias" | "confeccao" | "reciclagem" |
//    "livraria" | "ballet" | "agencia" | "vidracaria" (cor das laterais e do telhado; na Rabiscolândia, também a fachada própria)
// As parceiras depois da Crescente não têm foto real nem logotipo: a "foto" delas é arte inventada, gerada por
// ferramentas/gerar_fotos_parceiros.mjs, e a fachada delas na cidade está em jogos/rabiscopolis/predios-parceiros.js.
export const PARCEIROS = [
  { id: "je-multimarcas", nome: "J.E Multimarcas", foto: "assets/parceiros/je-multimarcas.webp?v=3", tipo: "carros", larguraMax: 20, instagram: "jemultimarcasitajai" },
  { id: "bella-cat", nome: "Bella Cat Make Biju", foto: "assets/parceiros/bella-cat.webp?v=1", tipo: "moda", instagram: "bellacat_itajai" },
  { id: "rise-up", nome: "Academia Rise Up", foto: "assets/parceiros/rise-up.webp?v=1", tipo: "academia", instagram: "academiariseup" },
  // a Crescente não tem foto de fachada: a "foto" é o banner da marca. Na Rabiscolândia vira um prédio-escritório
  // marrom e dourado com o banner de letreiro (predios.js · escritorioCrescente); no Kart e na Cidade do Rabisco o
  // banner é a frente da loja, como nas outras
  { id: "crescente-contabilidade", nome: "Crescente Contabilidade", foto: "assets/parceiros/crescente-contabilidade.webp?v=1", tipo: "contabilidade", instagram: "contabilidadecrescente" },
  { id: "gala-presentes", nome: "Gala Presentes", foto: "assets/parceiros/gala-presentes.webp?v=1", tipo: "presentes", instagram: "gala.presentes" },
  { id: "see-love-joias", nome: "See Love Semijoias", foto: "assets/parceiros/see-love-joias.webp?v=1", tipo: "joias", instagram: "seelovesemijoias" },
  // não confundir com a Bella Cat Make Biju (id bella-cat): esta é a fábrica de uniformes escolares e vestuário profissional,
  // de Itajaí, que tem a Educarte entre os clientes. A fachada é inventada, sem o logotipo real.
  { id: "bella-company", nome: "Bella Company", foto: "assets/parceiros/bella-company.webp?v=1", tipo: "confeccao", instagram: "somosbellacompany" },
  { id: "marlon-maquinas", nome: "Marlon Máquinas", foto: "assets/parceiros/marlon-maquinas.webp?v=1", tipo: "reciclagem", instagram: "marlonmaquinas" },
  { id: "cafe-com-deus-pai-kids", nome: "Café com Deus Pai Kids", foto: "assets/parceiros/cafe-com-deus-pai-kids.webp?v=1", tipo: "livraria", instagram: "cafecomdeuspai" },
  { id: "ballet-e-cia", nome: "Ballet e Cia", foto: "assets/parceiros/ballet-e-cia.webp?v=1", tipo: "ballet", instagram: "balleteciaitajai" },
  { id: "bt-models", nome: "BT Models", foto: "assets/parceiros/bt-models.webp?v=1", tipo: "agencia", instagram: "btmodels.agency" },
  { id: "speedy-solucoes", nome: "Speedy Soluções", foto: "assets/parceiros/speedy-solucoes.webp?v=1", tipo: "vidracaria", instagram: "speedysolucoes.sc" },
];

// cores das laterais/fundo (parede) e do telhado (beiral) por tipo de loja
export const ESTILO_PARCEIRO = {
  carros: { parede: "#f2f2f2", beiral: "#1d1d1d" },
  academia: { parede: "#e3d2b4", beiral: "#2a2522" },
  moda: { parede: "#f4eef8", beiral: "#c9b3e6" },
  contabilidade: { parede: "#813d18", beiral: "#d4a937" }, // marrom e dourado da Crescente
  presentes: { parede: "#fff1d6", beiral: "#c8234f" },
  joias: { parede: "#1f2a44", beiral: "#d9b35a" },
  confeccao: { parede: "#dff1f7", beiral: "#1f6fa8" },
  reciclagem: { parede: "#7f96a3", beiral: "#2e9e57" },
  livraria: { parede: "#ffe9b8", beiral: "#3f9fd0" },
  ballet: { parede: "#fbe4ec", beiral: "#b5447e" },
  agencia: { parede: "#23242b", beiral: "#e7c35a" },
  vidracaria: { parede: "#3a4653", beiral: "#b8c2cc" },
  igreja: { parede: "#a9a8a3", beiral: "#f4f4f1" }, // concreto cinza com a moldura branca da Igreja Reviver
};

// A Igreja Reviver (lugar "igreja" de mapa.js) usa o mesmo prédio das lojas parceiras: a frente inteira é a foto
// real da fachada (recorte: da borda de cima da moldura branca até o chão do pátio, de ponta a ponta do prédio).
// Ela é maior que as lojas (altura, fundo e largura máxima próprios). Enquanto a foto não carrega (ou se faltar),
// a frente é um desenho provisório na mesma proporção (proporcao): concreto, moldura branca, arco azul-marinho
// e vidro espelhado. Trocou a foto? Suba o ?v=.
export const IGREJA = {
  id: "igreja-reviver", nome: "Igreja Reviver", foto: "assets/parceiros/igreja-reviver.webp?v=2", tipo: "igreja",
  altura: 12, d: 14, larguraMax: 26, proporcao: 1024 / 550,
};
