// Rabiscolândia: o Álbum de figurinhas (dados puros, sem DOM e sem three.js: dá para testar em node e no navegador).
// Quatro páginas, cada uma com as suas figurinhas e uma raridade (a cor da moldura):
//  - parceiros (dourada): as 12 lojas de src/parceiros.js, com o nome e o @ exatamente como estão lá. Ganha quem visita a loja.
//  - amigos (azul): quem pede ajuda nas missões. Ganha quem conclui a missão. As pessoas de verdade entram com UMA figurinha cada
//    (a:pessoa-<id>), ganha ao concluir qualquer missão em que ela aparece; a arte é o boneco de bloco do jogo (nenhuma foto).
//  - versiculos (roxa): o versículo de cada missão da Bíblia. Ganha quem conclui a missão.
//  - lugares (verde): os lugares do mapa. Ganha quem visita.
// O id de cada figurinha: p:<parceiro> · a:<missão> · v:<missão> · l:<lugar>.
import { PARCEIROS } from "../../src/parceiros.js";
import { LUGARES } from "./mapa.js";
import { MISSOES } from "./missoes-dados.js";

export const BONUS_PAGINA = 30; // Rabiscoins por página completa
export const MOTIVO_PAGINA = (pag) => `rabiscolandia:album-${pag}`;

export const RARIDADES = {
  comum: { nome: "Comum", cor: "#58c43a", brilho: "#c9f0b8", estrelas: 1 },
  rara: { nome: "Rara", cor: "#2f8fe8", brilho: "#bfe0ff", estrelas: 2 },
  epica: { nome: "Épica", cor: "#8e6cff", brilho: "#dccfff", estrelas: 3 },
  dourada: { nome: "Dourada", cor: "#f2b632", brilho: "#fff0b0", estrelas: 4 },
};

const ICONE_LUGAR = {
  praca: "⛲", igreja: "⛪", hospital: "🏥", biblioteca: "📚", bombeiros: "🚒", mercado: "🛒", padaria: "🥖", sorveteria: "🍦",
  parque: "🌳", campo: "⚽", quadra: "🏀", horta: "🥕", kids1: "🧸", kids2: "🎒", veterinario: "🐾", lavarapido: "🫧",
  estudio: "🎵", correios: "✉️", mirante: "🔭", heliponto: "🚁", praia: "🏖️", fazendinha: "🐮", atelie: "🎨",
};

const parceiros = PARCEIROS.map((p) => ({ id: `p:${p.id}`, pagina: "parceiros", nome: p.nome, sub: `@${p.instagram}`, tipo: p.tipo, parceiro: p.id, dica: "Visite a loja" }));
const lugares = LUGARES.filter((l) => !l.parceiro).map((l) => ({ id: `l:${l.id}`, pagina: "lugares", nome: l.nome, sub: l.bairro || "Rabiscolândia", icone: ICONE_LUGAR[l.id] ?? "📍", lugar: l.id, dica: "Visite o lugar" }));
const amigos = [], versiculos = [], pessoasFig = new Map();
for (const M of MISSOES) {
  const q = M.npcs?.[Object.keys(M.npcs ?? {})[0]];
  const gente = Object.values(M.npcs ?? {}).find((n) => n.tipo === "pessoa"); // a pessoa de verdade da missão (não precisa ser a primeira)
  if (gente) {
    const f = pessoasFig.get(gente.pessoa);
    if (f) f.missoes.push(M.id);
    else { const nova = { id: `a:pessoa-${gente.pessoa}`, pagina: "amigos", nome: gente.nome, sub: M.titulo, tipo: "pessoa", pessoa: gente.pessoa, missoes: [M.id], dica: `Missão: ${M.titulo}` }; pessoasFig.set(gente.pessoa, nova); amigos.push(nova); }
  }
  if (q && q.tipo !== "pessoa") amigos.push({ id: `a:${M.id}`, pagina: "amigos", nome: q.nome, sub: M.titulo, tipo: q.tipo, cor: q.cor ?? null, missao: M.id, dica: `Missão: ${M.titulo}` });
  if (M.verso) versiculos.push({ id: `v:${M.id}`, pagina: "versiculos", nome: M.titulo, sub: M.verso.ref, texto: M.verso.texto, icone: M.icone, missao: M.id, dica: `Missão: ${M.titulo}` });
}

export const PAGINAS = [
  { id: "parceiros", nome: "Parceiros", icone: "🏪", raridade: "dourada", figs: parceiros },
  { id: "amigos", nome: "Amigos da cidade", curto: "Amigos", icone: "✏️", raridade: "rara", figs: amigos },
  { id: "versiculos", nome: "Versículos", icone: "📖", raridade: "epica", figs: versiculos },
  { id: "lugares", nome: "Lugares", icone: "🗺️", raridade: "comum", figs: lugares },
];
for (const P of PAGINAS) for (const f of P.figs) f.raridade = P.raridade;
export const FIGURINHAS = PAGINAS.flatMap((P) => P.figs);
export const figurinha = (id) => FIGURINHAS.find((f) => f.id === id) ?? null;
export const paginaDe = (id) => PAGINAS.find((P) => P.id === id) ?? null;
// que figurinha o lugar dá: as lojas dos parceiros (id "parceiro-<id>") ou o lugar do mapa
export const idDoLugar = (lugarId) => {
  if (typeof lugarId !== "string") return null;
  const id = lugarId.startsWith("parceiro-") ? `p:${lugarId.slice(9)}` : `l:${lugarId}`;
  return figurinha(id) ? id : null;
};
