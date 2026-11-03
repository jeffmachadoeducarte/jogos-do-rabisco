// Rabiscolândia: Natal na cidade (dados puros, sem three.js: falas.mjs e os testes leem este arquivo no node).
// O modo Natal liga sozinho de 1º de dezembro a 6 de janeiro (Dia de Reis), pela data do aparelho. Fora dessa época a
// cidade fica exatamente como sempre foi. Para testar: ?natal=1 liga e ?natal=0 desliga; com ?teste, ?hoje=AAAA-MM-DD
// finge outra data (os testes conferem a cidade "fora da época" mesmo quando rodam em dezembro).
// O que é 3D (luzes, árvore, presépio, enfeites, confete) mora em natal-cidade.js; a música da praça, em musica-cenas.js.

// ---------- quando é Natal
export function ehEpocaDeNatal(data) {
  const m = data.getMonth(), d = data.getDate();
  return m === 11 || (m === 0 && d <= 6); // dezembro inteiro e até 6 de janeiro
}
export function natalAtivo(busca = globalThis.location?.search ?? "", agora = new Date()) {
  const p = new URLSearchParams(busca);
  if (p.get("natal") === "1") return true;
  if (p.get("natal") === "0") return false;
  let data = agora;
  if (p.has("teste") && /^\d{4}-\d{2}-\d{2}$/.test(p.get("hoje") ?? "")) { const [a, m, d] = p.get("hoje").split("-").map(Number); data = new Date(a, m - 1, d, 12); }
  return ehEpocaDeNatal(data);
}

// ---------- onde fica cada coisa (coordenadas do mundo; a praça da Paz tem o centro em 0, 12)
// A árvore grande nasce de dentro da bacia do chafariz (o jato fica escondido no Natal). O presépio fica no gramado do lado
// sul da praça, de frente para a Avenida da Alegria (é o que se vê ao chegar, com a árvore atrás). Em volta da árvore, 20 m livres: é só do presépio.
export const ARVORE = { x: 0, z: 12, base: 1.05, altura: 11.5, raio: 4.1 };
export const PRESEPIO = { x: 0, z: 21.6, rot: 0, marca: [0, 26.9] };
export const LIVRE_ARVORE = 20; // ninguém novo (loja, quiosque) dentro deste raio da árvore
// as luzes coloridas: prédios do Centro e do Comércio (os mais perto da praça), as lojas parceiras e os postes do miolo
export const LUZES = { raioPredios: 125, raioPostes: 140, cores: [0xff3b3b, 0xffd23f, 0x35e25f, 0x2fa8ff, 0xff7ad9, 0xffffff] };

// ---------- falas novas (a anfitriã narra; o texto do balão é o mesmo da voz). Viram MP3 em falas.mjs
export const FALAS_NATAL = {
  "rp-natal-praca": "Feliz Natal, Rabiscolândia! A praça está toda iluminada para celebrar o nascimento de Jesus.",
  // desfile de Natal da BT Models (parceiras-palcos.js): os amigos do estojo fantasiados
  "rp-natal-desfile-entrar": "Bem-vindo à BT Models! Hoje é o desfile de Natal. Chegue nas marcas brilhantes para preparar a passarela.",
  "rp-natal-desfile-1": "Com vocês, o Lápis Vermelho, de gorro de Natal e cachecol!",
  "rp-natal-desfile-2": "Agora, o Giz Amarelo, fantasiado de estrela brilhante!",
  "rp-natal-desfile-3": "Olha a Borracha, de pastorzinho, com manto e cajado!",
  "rp-natal-desfile-4": "Lá vem o Caderno Verde, fantasiado de árvore de Natal!",
  "rp-natal-desfile-5": "E a Cola, de anjinho, com asas e auréola!",
  "rp-natal-desfile-rabisco": "E quem fecha o desfile de Natal é o Rabisco!",
  "rp-natal-desfile-fim": "Que festa de Natal! Todo mundo junto na passarela, celebrando o nascimento de Jesus!",
};
// fantasias do desfile de Natal (mesma ordem e mesmos amigos do desfile de fantasias)
export const DESFILE_NATAL = [
  { tipo: "lapis", cor: 0xe8413c, roupa: "gorro", fala: "rp-natal-desfile-1" },
  { tipo: "giz", cor: 0xffcc1f, roupa: "estrela", fala: "rp-natal-desfile-2" },
  { tipo: "borracha", cor: 0xff9ec4, roupa: "pastor", fala: "rp-natal-desfile-3" },
  { tipo: "caderno", cor: 0x58c43a, roupa: "arvore", fala: "rp-natal-desfile-4" },
  { tipo: "cola", cor: 0xffffff, roupa: "anjo", fala: "rp-natal-desfile-5" },
].map((d) => ({ ...d, texto: FALAS_NATAL[d.fala] }));

// ---------- a história do Natal no presépio (etapa "cena" da missão do presépio): uma peça e uma fala por vez
export const PECAS_PRESEPIO = ["maria", "jose", "menino", "pastores", "ovelhas", "estrela", "magos"];
