// Rabiscolândia: a casa decorável (dados puros, sem three.js: falas.mjs e os testes leem este arquivo no node).
// A casa da criança tem um interior só (sala e quarto), igual em qualquer lote: trocar de casa leva os móveis junto.
// O chão é uma grade de quadradinhos de 0,5 m (GRADE). Cada móvel ocupa um retângulo de quadradinhos numa camada:
//   "movel"  = no chão, com colisão (cama, sofá, mesa...)    "chao" = tapetes (os móveis podem ficar em cima)
//   "parede" = na parede do fundo (quadro, guirlanda): só anda para os lados
// Dois itens da mesma camada nunca se sobrepõem; a parede do meio, a passagem da porta do meio e a frente da porta da
// rua ficam sempre livres.
//
// Catálogo (MOVEIS_CASA): { id, nome, cat, preco, gratis (quantos já vêm no baú), celulas: [largura, fundo], camada,
//   cores (a 1ª é a de fábrica), variantes (quadro: um versículo por variante), temporada ("natal" = só na época) }.
// Papel de parede e cor do piso (cat "paredes") valem para a casa inteira: { tipo: "papel" | "piso", gratis: true|preco }.
// Os móveis são trocados por Rabiscoins (src/motor/rabiscoins.js). Cada troca é UM móvel a mais no baú de móveis:
// a carteira guarda "rabiscolandia:casa:<id>:<n>" (n = 1, 2, 3...). Papel e piso: "rabiscolandia:casa:<id>".
// O que está posto fica em salvo.casaDeco (salvar.js): { moveis: [{ id, cor, variante, gx, gz, rot }], papel, piso, ganhos, falou }.

import { ehEpocaDeNatal } from "./natal.js";

export const GRADE = { x0: -7, z0: -4, passo: 0.5, colunas: 28, linhas: 16 };
// parede do meio (coluna 16: x de 1,0 a 1,5) com a passagem nas linhas 9 a 11 (z de 0,5 a 2,0)
export const DIVISORIA = { coluna: 16, passagem: [9, 11] };
// porta da rua no meio da sala (x = -4), na frente (z = +4)
export const PORTA_RUA = { x: -4, colunas: [4, 7], linhas: [13, 15] };
export const COMODOS = [
  { id: "sala", nome: "Sala", colunas: [0, 15] },
  { id: "quarto", nome: "Quarto", colunas: [17, 27] },
];

export const CATEGORIAS_CASA = [
  { id: "bau", nome: "Meu baú", icone: "🧺" },
  { id: "quarto", nome: "Quarto", icone: "🛏️" },
  { id: "sala", nome: "Sala", icone: "🛋️" },
  { id: "enfeites", nome: "Enfeites", icone: "🪴" },
  { id: "brinquedos", nome: "Brinquedos", icone: "🧸" },
  { id: "paredes", nome: "Parede e piso", icone: "🖌️" },
  { id: "natal", nome: "Natal", icone: "🎄", temporada: "natal" },
];
const MADEIRA = [0xc98a4b, 0x9a6232, 0xfff4e0, 0xec2e8c, 0x00b5f0, 0x58c43a];
const VIVAS = [0x00b5f0, 0xec2e8c, 0xffcc1f, 0x58c43a, 0x8e6cff, 0xff7a00, 0xfff4e0];

export const MOVEIS_CASA = [
  // ---- quarto
  { id: "cama", nome: "Cama", emoji: "🛏️", cat: "quarto", gratis: 1, preco: 30, celulas: [3, 4], camada: "movel", cores: [0x00b5f0, 0xec2e8c, 0xffcc1f, 0x58c43a, 0x8e6cff] },
  { id: "beliche", nome: "Beliche", emoji: "🛏️", cat: "quarto", preco: 80, celulas: [3, 4], camada: "movel", cores: [0xec2e8c, 0x00b5f0, 0x58c43a, 0xff7a00] },
  { id: "escrivaninha", nome: "Escrivaninha com caderno", emoji: "📒", cat: "quarto", preco: 55, celulas: [3, 2], camada: "movel", cores: [0xfff4e0, 0x00b5f0, 0xec2e8c, 0xc98a4b] },
  { id: "pufe", nome: "Pufe", emoji: "🟣", cat: "quarto", preco: 15, celulas: [1, 1], camada: "movel", cores: [0x8e6cff, 0xec2e8c, 0xffcc1f, 0x00b5f0, 0x58c43a] },
  { id: "cama-pet", nome: "Caminha do pet", emoji: "🐾", cat: "quarto", preco: 30, celulas: [2, 2], camada: "movel", cores: [0xff7a00, 0x00b5f0, 0xec2e8c, 0x58c43a] },
  // ---- sala
  { id: "mesa", nome: "Mesa", emoji: "🍽️", cat: "sala", gratis: 1, preco: 20, celulas: [3, 2], camada: "movel", cores: MADEIRA },
  { id: "cadeira", nome: "Cadeira", emoji: "🪑", cat: "sala", gratis: 2, preco: 15, celulas: [1, 1], camada: "movel", cores: MADEIRA },
  { id: "sofa", nome: "Sofá", emoji: "🛋️", cat: "sala", preco: 60, celulas: [5, 2], camada: "movel", cores: [0x00b5f0, 0xec2e8c, 0x58c43a, 0x8e6cff, 0xff7a00, 0xffcc1f] },
  { id: "poltrona", nome: "Poltrona", emoji: "💺", cat: "sala", preco: 40, celulas: [2, 2], camada: "movel", cores: [0xec2e8c, 0x00b5f0, 0xffcc1f, 0x58c43a, 0x8e6cff] },
  { id: "estante", nome: "Estante de livros", emoji: "📚", cat: "sala", preco: 50, celulas: [3, 1], camada: "movel", cores: [0xc98a4b, 0xfff4e0, 0x00b5f0, 0xec2e8c] },
  { id: "cristaleira", nome: "Cristaleira", emoji: "🫖", cat: "sala", preco: 90, celulas: [3, 1], camada: "movel", cores: [0xfff4e0, 0xc98a4b, 0x8fd0f7, 0xffcc1f] },
  { id: "piano", nome: "Piano", emoji: "🎹", cat: "sala", preco: 150, celulas: [3, 2], camada: "movel", cores: [0x2a2a2a, 0xfff4e0, 0xec2e8c, 0x00b5f0] },
  // ---- enfeites
  { id: "tapete", nome: "Tapete redondo", emoji: "⭕", cat: "enfeites", preco: 20, celulas: [4, 4], camada: "chao", cores: [0xec2e8c, 0x00b5f0, 0xffcc1f, 0x58c43a, 0x8e6cff] },
  { id: "tapete-listras", nome: "Tapete listrado", emoji: "🟥", cat: "enfeites", preco: 25, celulas: [4, 3], camada: "chao", cores: [0x00b5f0, 0xec2e8c, 0xffcc1f, 0x58c43a, 0x8e6cff] },
  { id: "abajur", nome: "Abajur", emoji: "💡", cat: "enfeites", preco: 25, celulas: [1, 1], camada: "movel", cores: [0xffcc1f, 0xec2e8c, 0x00b5f0, 0xfff4e0] },
  { id: "vaso", nome: "Vaso de flor", emoji: "🌷", cat: "enfeites", preco: 15, celulas: [1, 1], camada: "movel", cores: [0xff7a00, 0xec2e8c, 0x00b5f0, 0xffcc1f, 0xfff4e0] },
  { id: "samambaia", nome: "Planta grande", emoji: "🪴", cat: "enfeites", preco: 30, celulas: [2, 2], camada: "movel", cores: [0xfff4e0, 0xc98a4b, 0x00b5f0, 0xec2e8c] },
  { id: "quadro", nome: "Quadro com versículo", emoji: "🖼️", cat: "enfeites", preco: 20, celulas: [3, 1], camada: "parede", cores: [0x8e6cff, 0x00b5f0, 0xec2e8c, 0x58c43a], variantes: 6 },
  // ---- brinquedos
  { id: "bau-brinquedos", nome: "Baú de brinquedos", emoji: "🧸", cat: "brinquedos", preco: 35, celulas: [2, 1], camada: "movel", cores: [0xff7a00, 0x00b5f0, 0xec2e8c, 0x58c43a] },
  { id: "cavalinho", nome: "Cavalinho de balanço", emoji: "🐴", cat: "brinquedos", preco: 45, celulas: [2, 1], camada: "movel", cores: [0xffcc1f, 0xec2e8c, 0x00b5f0, 0xfff4e0] },
  { id: "aquario", nome: "Aquário", emoji: "🐠", cat: "brinquedos", preco: 120, celulas: [2, 1], camada: "movel", cores: [0xc98a4b, 0xfff4e0, 0x00b5f0, 0xec2e8c] },
  // ---- parede e piso (valem para a casa toda)
  { id: "papel-liso", nome: "Parede creme", emoji: "🧱", cat: "paredes", tipo: "papel", gratis: true, preco: 0, padrao: "liso", cores: [0xfff1d6, 0xd8f5ea] },
  { id: "papel-listras", nome: "Papel de listras", emoji: "🧱", cat: "paredes", tipo: "papel", preco: 40, padrao: "listras", cores: [0xffe3ef, 0xffc2dc] },
  { id: "papel-bolinhas", nome: "Papel de bolinhas", emoji: "🧱", cat: "paredes", tipo: "papel", preco: 40, padrao: "bolinhas", cores: [0xd6efff, 0xffffff] },
  { id: "papel-estrelas", nome: "Papel de estrelas", emoji: "⭐", cat: "paredes", tipo: "papel", preco: 60, padrao: "estrelas", cores: [0xe2d4ff, 0xffd84a] },
  { id: "piso-madeira", nome: "Piso de madeira", emoji: "🟫", cat: "paredes", tipo: "piso", gratis: true, preco: 0, padrao: "tabuas", cores: [0xe9c79a, 0xd8b07c] },
  { id: "piso-azul", nome: "Piso azul", emoji: "🟦", cat: "paredes", tipo: "piso", preco: 25, padrao: "placas", cores: [0xa9dcf7, 0x92cff1] },
  { id: "piso-rosa", nome: "Piso rosa", emoji: "🟪", cat: "paredes", tipo: "piso", preco: 25, padrao: "placas", cores: [0xffcfe3, 0xffbdd8] },
  { id: "piso-xadrez", nome: "Piso xadrez", emoji: "🏁", cat: "paredes", tipo: "piso", preco: 35, padrao: "xadrez", cores: [0xfff8ea, 0xffd27a] },
  // ---- Natal (só aparecem na época: de 1º de dezembro a 6 de janeiro)
  { id: "arvore-natal", nome: "Arvorezinha de Natal", emoji: "🎄", cat: "natal", temporada: "natal", preco: 50, celulas: [2, 2], camada: "movel", cores: [0x2f9e44, 0x1f7a3a] },
  { id: "guirlanda", nome: "Guirlanda", emoji: "🎀", cat: "natal", temporada: "natal", preco: 25, celulas: [2, 1], camada: "parede", cores: [0xe8413c, 0xffcc1f] },
  { id: "lareira", nome: "Lareira com meias", emoji: "🧦", cat: "natal", temporada: "natal", preco: 80, celulas: [3, 1], camada: "movel", cores: [0xd9764a, 0xfff4e0] },
];
export const itemCasa = (id) => MOVEIS_CASA.find((m) => m.id === id) ?? null;
export const PAPEL_PADRAO = "papel-liso", PISO_PADRAO = "piso-madeira";

// ---------- época
const TEMPORADAS_CASA = { natal: (d) => ehEpocaDeNatal(d) };
export const naEpoca = (item, data = new Date()) => !item?.temporada || Boolean(TEMPORADAS_CASA[item.temporada]?.(data));
export const categoriasDaEpoca = (data = new Date()) => CATEGORIAS_CASA.filter((c) => !c.temporada || TEMPORADAS_CASA[c.temporada]?.(data));
export const itensDaEpoca = (data = new Date()) => MOVEIS_CASA.filter((i) => naEpoca(i, data));

// ---------- carteira (Rabiscoins): quantos de cada móvel a criança tem
export const ID_CARTEIRA = "rabiscolandia:casa:";
export const idDaTroca = (id, n) => (itemCasa(id)?.tipo ? `${ID_CARTEIRA}${id}` : `${ID_CARTEIRA}${id}:${n}`);
// comprados = Set dos ids da carteira; ganhos = { id: n } (móveis que vieram da casa antiga)
export function quantosTem(id, comprados, ganhos = {}) {
  const it = itemCasa(id);
  if (!it) return 0;
  if (it.tipo) return it.gratis || comprados.has(`${ID_CARTEIRA}${id}`) ? 1 : 0;
  let n = 0; const pre = `${ID_CARTEIRA}${id}:`;
  for (const c of comprados) if (c.startsWith(pre)) n++;
  return (it.gratis ?? 0) + n + (ganhos[id] ?? 0);
}
// próxima troca do mesmo móvel: o número que ainda não está na carteira
export function proximaTroca(id, comprados) { let n = 1; while (comprados.has(idDaTroca(id, n))) n++; return idDaTroca(id, n); }

// ---------- grade
// pegada girada: rot 0 e 2 = [largura, fundo]; 1 e 3 = [fundo, largura]. Parede não gira.
export const pegada = (item, rot = 0) => { const [w, d] = item.celulas; return item.camada !== "parede" && rot % 2 ? [d, w] : [w, d]; };
// quadradinho livre para móvel de chão? (parede do meio, passagem e porta da rua sempre livres)
export function celulaBloqueada(i, k) {
  if (i < 0 || k < 0 || i >= GRADE.colunas || k >= GRADE.linhas) return true;
  if (i === DIVISORIA.coluna) return true;
  if (k >= DIVISORIA.passagem[0] && k <= DIVISORIA.passagem[1] && Math.abs(i - DIVISORIA.coluna) <= 1) return true;
  if (i >= PORTA_RUA.colunas[0] && i <= PORTA_RUA.colunas[1] && k >= PORTA_RUA.linhas[0]) return true;
  return false;
}
export const comodoDe = (i) => COMODOS.find((c) => i >= c.colunas[0] && i <= c.colunas[1]) ?? null;
// os quadradinhos de um item posto { id, gx, gz, rot }
export function celulasDe(p) {
  const it = itemCasa(p.id); if (!it) return [];
  const [w, d] = pegada(it, p.rot ?? 0), out = [];
  for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) out.push([p.gx + a, it.camada === "parede" ? 0 : p.gz + b]);
  return out;
}
// cabe ali? postos = os itens já na casa; ignorar = índice do item que está sendo movido. → { ok, motivo, com }
export function cabe(postos, p, ignorar = -1, data = new Date()) {
  const it = itemCasa(p.id);
  if (!it || it.tipo) return { ok: false, motivo: "nao-e-movel" };
  const cel = celulasDe(p);
  if (it.camada === "parede") {
    const [w] = pegada(it); // na parede: dentro de um cômodo só, sem passar pela parede do meio
    if (p.gx < 0 || p.gx + w > GRADE.colunas) return { ok: false, motivo: "fora" };
    const c0 = comodoDe(p.gx), c1 = comodoDe(p.gx + w - 1);
    if (!c0 || c0 !== c1) return { ok: false, motivo: "parede-do-meio" };
  } else {
    for (const [i, k] of cel) if (celulaBloqueada(i, k)) return { ok: false, motivo: i < 0 || k < 0 || i >= GRADE.colunas || k >= GRADE.linhas ? "fora" : "passagem" };
  }
  const minhas = new Set(cel.map(([i, k]) => `${i},${k}`));
  for (let n = 0; n < postos.length; n++) {
    if (n === ignorar) continue;
    const q = postos[n], iq = itemCasa(q.id);
    if (!iq || iq.camada !== it.camada || !naEpoca(iq, data)) continue;
    if (celulasDe(q).some(([i, k]) => minhas.has(`${i},${k}`))) return { ok: false, motivo: "ocupado", com: n };
  }
  return { ok: true };
}
// prende o item dentro da grade (sem checar sobreposição): usado ao andar com ele
export function prender(p) {
  const it = itemCasa(p.id); if (!it) return p;
  const [w, d] = pegada(it, p.rot ?? 0);
  p.gx = Math.max(0, Math.min(GRADE.colunas - w, p.gx));
  p.gz = it.camada === "parede" ? 0 : Math.max(0, Math.min(GRADE.linhas - d, p.gz));
  return p;
}
// centro do item em metros (coordenadas locais da casa)
export function centroDe(p) {
  const it = itemCasa(p.id), [w, d] = pegada(it, p.rot ?? 0), s = GRADE.passo;
  return [GRADE.x0 + (p.gx + w / 2) * s, GRADE.z0 + (it.camada === "parede" ? 0 : (p.gz + d / 2) * s)];
}
export const celulaDoPonto = (x, z) => [Math.floor((x - GRADE.x0) / GRADE.passo), Math.floor((z - GRADE.z0) / GRADE.passo)];

// ---------- o que fica guardado (salvo.casaDeco)
export const casaVazia = () => ({ moveis: [], papel: PAPEL_PADRAO, piso: PISO_PADRAO, ganhos: {}, falou: {} });
export function lerCasa(salvo) {
  const c = salvo?.casaDeco && typeof salvo.casaDeco === "object" ? salvo.casaDeco : {};
  const moveis = Array.isArray(c.moveis) ? c.moveis.filter((m) => m && itemCasa(m.id) && !itemCasa(m.id).tipo && Number.isInteger(m.gx) && Number.isInteger(m.gz))
    .map((m) => ({ id: m.id, cor: Number.isFinite(m.cor) ? m.cor : itemCasa(m.id).cores[0], variante: Number.isInteger(m.variante) ? m.variante : 0, gx: m.gx, gz: m.gz, rot: ((m.rot | 0) % 4 + 4) % 4 })) : [];
  const papel = itemCasa(c.papel)?.tipo === "papel" ? c.papel : PAPEL_PADRAO, piso = itemCasa(c.piso)?.tipo === "piso" ? c.piso : PISO_PADRAO;
  return { moveis, papel, piso, ganhos: c.ganhos && typeof c.ganhos === "object" ? { ...c.ganhos } : {}, falou: c.falou && typeof c.falou === "object" ? { ...c.falou } : {}, migrado: Boolean(c.migrado) };
}
// quantos de cada móvel estão postos
export function postosPorId(moveis) { const n = {}; for (const m of moveis) n[m.id] = (n[m.id] ?? 0) + 1; return n; }
// a casa antiga (decoração por pontos fixos: salvo.moveis[lote][ponto] = { id }) vira móveis no baú, de presente
const DA_CASA_ANTIGA = { sofa: "sofa", poltrona: "poltrona", tapete: "tapete", estante: "estante", abajur: "abajur", planta: "vaso", "quadro-versiculo": "quadro", aquario: "aquario", beliche: "beliche", bau: "bau-brinquedos", cavalinho: "cavalinho", estudo: "escrivaninha", piano: "piano" };
export function migrarCasaAntiga(antigos) {
  const ganhos = {};
  for (const casa of Object.values(antigos && typeof antigos === "object" ? antigos : {})) for (const e of Object.values(casa ?? {})) {
    const id = DA_CASA_ANTIGA[e?.id]; if (id) ganhos[id] = Math.min(3, (ganhos[id] ?? 0) + 1);
  }
  return ganhos;
}

// ---------- falas da anfitriã (viram MP3 por falas.mjs → gerar_vozes.py)
export const FALAS_CASA = {
  "rp-casa-boasvindas": "Bem-vindo à sua casa! Aqui tem a sala e o quarto, prontinhos para você deixar do seu jeito.",
  "rp-casa-dica": "Para decorar, escolha um móvel no baú, leve até um lugar livre e aperte Pôr. Dá para girar, mudar a cor e guardar de volta.",
  "rp-casa-trocou": "Móvel novo! Ele já está no seu baú de móveis.",
  "rp-casa-pronto": "Que casa linda! Ficou tudo guardado.",
  "rp-casa-natal": "Que lindo! No Natal a gente festeja o nascimento de Jesus.",
};
