// Aulas na sala da Educarte (dados puros, sem three.js): as três matérias por nível de idade.
// Níveis: "bebe" (Kids I, até 4 anos: cores, sons dos bichos, formas, contar até 3), e na Kids II "k5" (5–6 anos),
// "k7" (7–8 anos, o do meio, usado também quando a idade é desconhecida) e "k9" (9–12 anos).
// Cada aula tem rodadas; cada rodada é de um tipo:
//  - achar: aparecem objetos na sala (opcoes) e o Rabisco aperta Ação no certo; o errado só dá dica e repete;
//  - letras: blocos com letras; pegar na ordem da palavra (a lousa vai preenchendo); letra errada só dá dica;
//  - contar: pegar maçãs na bandeja (uma por vez, contando) e entregar na mesa da professora; quantidade errada
//    devolve as maçãs e conta de novo.
// fala: chaves de voz (cid-* na Francisca, en-cid-* em inglês) tocadas em sequência.

export function nivelDaIdade(idade) {
  if (idade == null || !Number.isFinite(idade)) return "k7";
  if (idade <= 4) return "bebe";
  if (idade <= 6) return "k5";
  if (idade <= 8) return "k7";
  return "k9";
}
export const NOME_NIVEL = { bebe: "Kids I · até 4 anos", k5: "Kids II · 5 e 6 anos", k7: "Kids II · 7 e 8 anos", k9: "Kids II · 9 a 12 anos" };

export const CORES = { vermelho: { hex: 0xe53935, en: "red" }, azul: { hex: 0x1e6fe0, en: "blue" }, amarelo: { hex: 0xffc928, en: "yellow" }, verde: { hex: 0x2bb24c, en: "green" } };
export const BICHOS = { gato: { som: "miau", en: "cat" }, cachorro: { som: "au-au", en: "dog" }, pato: { som: "quá-quá", en: "duck" } };
const sortear = (lista, n, aleatorio) => { const l = [...lista]; for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(aleatorio() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l.slice(0, n); };

const livros = () => Object.keys(CORES).map((c) => ({ tipo: "livro", valor: c, nome: `o livro ${c}` }));
const bichos = () => Object.keys(BICHOS).map((b) => ({ tipo: "bicho", valor: b, nome: `o ${b}` }));
const bolas = () => ["vermelho", "azul", "amarelo"].map((c) => ({ tipo: "bola", valor: c, nome: `a bola ${c === "vermelho" ? "vermelha" : c === "amarelo" ? "amarela" : c}` }));
const formas = () => [{ tipo: "forma", valor: "circulo", nome: "o círculo" }, { tipo: "forma", valor: "quadrado", nome: "o quadrado" }, { tipo: "forma", valor: "triangulo", nome: "o triângulo" }];

// ---------- inglês
function ingles(nivel, aleatorio) {
  if (nivel === "bebe") return sortear(["vermelho", "azul", "amarelo"], 3, aleatorio).map((c) => ({
    tipo: "achar", opcoes: bolas(), certo: c, lousa: `${CORES[c].en.toUpperCase()}!`, sub: `Ache a bola ${c === "vermelho" ? "vermelha" : c === "amarelo" ? "amarela" : c}`,
    fala: [`en-cid-${CORES[c].en}`, `cid-aula-bola-${c}`],
  }));
  if (nivel === "k5") return sortear(["vermelho", "azul", "amarelo", "verde"], 3, aleatorio).map((c) => ({
    tipo: "achar", opcoes: livros(), certo: c, lousa: `${CORES[c].en.toUpperCase()}!`, sub: `Find the ${CORES[c].en} book!`, fala: [`en-cid-book-${CORES[c].en}`],
  }));
  if (nivel === "k7") {
    const [c1, c2] = sortear(Object.keys(CORES), 2, aleatorio), [b] = sortear(Object.keys(BICHOS), 1, aleatorio);
    const todos = () => [...livros(), ...bichos()];
    return [
      { tipo: "achar", opcoes: todos(), certo: c1, lousa: `Find the ${CORES[c1].en.toUpperCase()} book!`, fala: [`en-cid-book-${CORES[c1].en}`] },
      { tipo: "achar", opcoes: todos(), certo: b, lousa: `Where is the ${BICHOS[b].en.toUpperCase()}?`, fala: [`en-cid-where-${BICHOS[b].en}`] },
      { tipo: "achar", opcoes: todos(), certo: c2, lousa: `Find the ${CORES[c2].en.toUpperCase()} book!`, fala: [`en-cid-book-${CORES[c2].en}`] },
    ];
  }
  // k9: perguntas em inglês (a resposta é um objeto da sala)
  const perguntas = [
    { certo: "azul", lousa: "Find the book that is the color of the sky!", fala: "en-cid-q-sky" },
    { certo: "amarelo", lousa: "Find the book that is the color of the sun!", fala: "en-cid-q-sun" },
    { certo: "verde", lousa: "Find the book that is the color of the grass!", fala: "en-cid-q-grass" },
    { certo: "vermelho", lousa: "Find the book that is the color of a strawberry!", fala: "en-cid-q-strawberry" },
    { certo: "cachorro", lousa: "What animal says WOOF? Find it!", fala: "en-cid-q-woof" },
    { certo: "gato", lousa: "What animal says MEOW? Find it!", fala: "en-cid-q-meow" },
    { certo: "pato", lousa: "Which animal can swim and says QUACK?", fala: "en-cid-q-quack" },
  ];
  const cor = sortear(perguntas.slice(0, 4), 2, aleatorio), bicho = sortear(perguntas.slice(4), 1, aleatorio);
  return [cor[0], bicho[0], cor[1]].map((p) => ({ tipo: "achar", opcoes: [...livros(), ...bichos()], certo: p.certo, lousa: p.lousa, fala: [p.fala] }));
}

// ---------- português
export const PALAVRAS = { k5: ["SOL", "LUA", "BOLA", "PATO"], k7: ["GATO", "CASA", "LIVRO", "ESCOLA"], k9: ["CADERNO", "AMIZADE", "BORBOLETA"] };
const DISTRAI = "BMRTUEIO";
function portugues(nivel, aleatorio) {
  if (nivel === "bebe") return sortear(Object.keys(BICHOS), 3, aleatorio).map((b) => ({
    tipo: "achar", opcoes: bichos(), certo: b, lousa: `${BICHOS[b].som.toUpperCase()}!`, sub: `Quem faz ${BICHOS[b].som}?`, fala: [`cid-som-${b}`],
  }));
  const [palavra] = sortear(PALAVRAS[nivel], 1, aleatorio);
  const unicas = [...new Set(palavra)];
  const extra = sortear([...DISTRAI].filter((l) => !unicas.includes(l)), nivel === "k5" ? 2 : 3, aleatorio);
  return [{ tipo: "letras", palavra, blocos: sortear([...unicas, ...extra], unicas.length + extra.length, aleatorio), lousa: palavra, fala: [`cid-palavra-${palavra.toLowerCase()}`] }];
}

// ---------- matemática
export const CONTAS = {
  k7: [["2 + 3", 5, "cid-soma-2-3"], ["4 + 1", 5, "cid-soma-4-1"], ["3 + 3", 6, "cid-soma-3-3"], ["5 + 2", 7, "cid-soma-5-2"], ["4 + 4", 8, "cid-soma-4-4"]],
  k9: [["2 × 3", 6, "cid-vezes-2-3"], ["2 × 4", 8, "cid-vezes-2-4"], ["3 × 3", 9, "cid-vezes-3-3"], ["5 × 2", 10, "cid-vezes-5-2"], ["6 + 4", 10, "cid-soma-6-4"]],
};
function matematica(nivel, aleatorio) {
  if (nivel === "bebe") {
    const [f1, f2] = sortear(["circulo", "quadrado", "triangulo"], 2, aleatorio);
    const nomes = { circulo: "CÍRCULO", quadrado: "QUADRADO", triangulo: "TRIÂNGULO" };
    return [
      { tipo: "achar", opcoes: formas(), certo: f1, lousa: nomes[f1], fala: [`cid-forma-${f1}`] },
      { tipo: "achar", opcoes: formas(), certo: f2, lousa: nomes[f2], fala: [`cid-forma-${f2}`] },
      { tipo: "contar", n: 3, lousa: "1  2  3", fala: ["cid-conta-3"] },
    ];
  }
  if (nivel === "k5") return sortear([3, 4, 5], 2, aleatorio).map((n) => ({ tipo: "contar", n, lousa: `${n} maçãs`, fala: [`cid-conta-${n}`] }));
  return sortear(CONTAS[nivel], 2, aleatorio).map(([conta, n, fala]) => ({ tipo: "contar", n, lousa: `${conta} = ?`, fala: [fala] }));
}

export const MATERIAS = [
  { id: "aulaIngles", nome: "Aula de Inglês", icone: "🔤", gerar: ingles },
  { id: "aulaPortugues", nome: "Aula de Português", icone: "✏️", gerar: portugues },
  { id: "aulaMatematica", nome: "Aula de Matemática", icone: "🔢", gerar: matematica },
];
