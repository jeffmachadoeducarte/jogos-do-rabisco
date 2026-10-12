// As 10 páginas do Livro da Criação. Todas têm os mesmos objetivos (que sempre dá para completar):
// achar 3 bichinhos perdidos e levar ao personagem do fim, encaixar 3 objetos no portão, apertar o
// botão da cor para as flores virarem ponte e achar 3 estrelas escondidas. Aqui ficam as cores, o céu,
// os bichos e o objeto de cada página; o layout e as mecânicas de cada uma (ilhas, túnel, terraços,
// labirinto, plataformas que andam...) ficam em cenarios.js. A dificuldade sobe com mais borrachas.
// A fala do fim lembra, de leve, uma passagem da Bíblia sobre aquela parte da Criação.
//
// bicho/item: modelos em pagina.js · arvore: "arvore" | "pinheiro" | "palmeira" | "pinheiro-neve" | "cacto"

export const PAGINAS = [
  { id: "jardim", nome: "O Jardim", desc: "Página 1",
    ceu: [0xa8dcff, 0xcdeeff], chao: { grama: "#62c845", caminho: "#f3d9a4", margem: "#7fd36a" }, morros: [0x7dd36a, 0x9fe08a],
    arvore: "arvore", flores: ["rosa", "amarelo", "branco", "roxo", "laranja", "ciano"],
    personagem: { nome: "Lápis Verde", cor: "verde" }, bicho: "ovelha", bichos: "ovelhinhas", item: "semente", botao: "vermelho", borrachas: 3 },
  { id: "mar", nome: "O Mar", desc: "Página 2",
    ceu: [0x7fd0ff, 0xe8f8ff], chao: { grama: "#f3dca0", caminho: "#fff0c8", margem: "#7fd6ff" }, morros: [0x3ab0e8, 0x7fd6ff],
    arvore: "palmeira", flores: ["rosa", "laranja", "branco"],
    personagem: { nome: "Lápis Azul", cor: "azul" }, bicho: "pato", bichos: "patinhos", item: "concha", botao: "azul", borrachas: 3 },
  { id: "pomar", nome: "O Pomar", desc: "Página 3",
    ceu: [0x9fd8ff, 0xf0faff], chao: { grama: "#79cf4f", caminho: "#e8c48a", margem: "#8fd860" }, morros: [0x6fc04a, 0x9fd45f],
    arvore: "arvore", frutas: true, flores: ["branco", "rosa", "amarelo"],
    personagem: { nome: "Lápis Laranja", cor: "laranja" }, bicho: "pintinho", bichos: "pintinhos", item: "maca", botao: "amarelo", borrachas: 4 },
  { id: "floresta", nome: "A Floresta dos Bichos", desc: "Página 4",
    ceu: [0x8fc8e8, 0xd6eedd], chao: { grama: "#3fa83a", caminho: "#c8a26a", margem: "#2f8a2c" }, morros: [0x2f8a2c, 0x46a83d],
    arvore: "pinheiro", flores: ["amarelo", "roxo", "branco"],
    personagem: { nome: "Lápis Marrom", cor: "marrom" }, bicho: "coelho", bichos: "coelhinhos", item: "noz", botao: "verde", borrachas: 4 },
  { id: "fazenda", nome: "A Fazenda", desc: "Página 5",
    ceu: [0x9fd4ff, 0xf6fbe8], chao: { grama: "#8ad15a", caminho: "#d9a96a", margem: "#a8dd70" }, morros: [0x9fd45f, 0xc4e27a],
    arvore: "arvore", flores: ["amarelo", "branco", "laranja"],
    personagem: { nome: "Lápis Amarelo", cor: "amarelo" }, bicho: "porco", bichos: "porquinhos", item: "cenoura", botao: "laranja", borrachas: 5 },
  { id: "ceu", nome: "O Céu", desc: "Página 6",
    ceu: [0x5fb8ff, 0xffffff], chao: { grama: "#eef6ff", caminho: "#ffffff", margem: "#d6ecff" }, morros: [0xffffff, 0xe6f2ff],
    arvore: "nuvem", flores: ["amarelo", "branco", "ciano"],
    personagem: { nome: "Lápis Ciano", cor: "ciano" }, bicho: "passaro", bichos: "passarinhos", item: "pena", botao: "rosa", borrachas: 5 },
  { id: "neve", nome: "A Montanha de Neve", desc: "Página 7",
    ceu: [0xbfdcff, 0xf6fbff], chao: { grama: "#f4f8ff", caminho: "#dbe8f6", margem: "#ffffff" }, morros: [0xffffff, 0xe6f0fa],
    arvore: "pinheiro-neve", flores: ["branco", "ciano", "roxo"],
    personagem: { nome: "Lápis Branco", cor: "branco" }, bicho: "pinguim", bichos: "pinguinzinhos", item: "floco", botao: "roxo", borrachas: 6 },
  { id: "deserto", nome: "O Oásis", desc: "Página 8",
    ceu: [0x8fc8ff, 0xfde7c2], chao: { grama: "#eac27a", caminho: "#f6deA0", margem: "#e2b66a" }, morros: [0xd99a52, 0xe8b06a],
    arvore: "cacto", flores: ["rosa", "amarelo", "laranja"],
    personagem: { nome: "Lápis Vermelho", cor: "vermelho" }, bicho: "camelo", bichos: "camelinhos", item: "gota", botao: "ciano", borrachas: 6 },
  { id: "noite", nome: "A Noite Estrelada", desc: "Página 9",
    ceu: [0x2a3f86, 0x4a5fa6], chao: { grama: "#2f7a3a", caminho: "#8a7aa8", margem: "#245e2d" }, morros: [0x1f4a5a, 0x2a5a6a], noite: true,
    arvore: "arvore", flores: ["branco", "amarelo", "ciano"],
    personagem: { nome: "Lápis Roxo", cor: "roxo" }, bicho: "coruja", bichos: "corujinhas", item: "estrelinha", botao: "branco", borrachas: 7 },
  { id: "descanso", nome: "O Descanso", desc: "Página 10",
    ceu: [0xa8dcff, 0xfff1d6], chao: { grama: "#62c845", caminho: "#f3d9a4", margem: "#7fd36a" }, morros: [0x7dd36a, 0xf7a8c8],
    arvore: "arvore", frutas: true, flores: ["rosa", "amarelo", "branco", "roxo", "laranja", "ciano"],
    personagem: { nome: "Lápis Rosa", cor: "rosa" }, bicho: "ovelha", bichos: "ovelhinhas", item: "livro", botao: "verde", borrachas: 7 },
];

export const CORES = {
  vermelho: 0xe8413c, azul: 0x1d6fe0, amarelo: 0xffcc1f, verde: 0x58c43a, laranja: 0xff7a00, rosa: 0xec2e8c,
  roxo: 0x8e6cff, branco: 0xffffff, ciano: 0x00b5f0, marrom: 0x9a6232,
};

export function paginaAtual(n) {
  const i = Math.min(PAGINAS.length, Math.max(1, n)) - 1;
  return { numero: i + 1, ...PAGINAS[i] };
}
