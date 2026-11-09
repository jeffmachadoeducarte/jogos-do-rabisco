// Rabiscolândia (Mundo Vivo, etapa 10): conquistas com selo. Cada uma tem uma condição sobre o estado do jogo
// (estado() vem de jogo.js: missões feitas, nível, figurinhas, parceiras visitadas, medalhas, presente, monte, casa,
// itens da mochila). verificar() destrava o que passou a valer (uma vez só, salvo.conquistas), avisa (aoNova) e cada
// conquista rende XP (nivel.js). Aparecem no menu Conquistas do HUD e no app Conquistas do Rabisfone (montar).
//   const C = criarConquistas({ salvo, salvar, estado(), aoNova(c) });  C.verificar() → novas[]  C.lista() → [{ ...c, feita }]
import { MISSOES } from "./missoes-dados.js";
import { PARCEIROS } from "../../src/parceiros.js";

const BIBLICAS = MISSOES.filter((m) => m.tipo === "biblica").length;
export const CONQUISTAS = [
  { id: "primeira-missao", nome: "Primeira missão", emoji: "🌟", desc: "Concluiu a primeira missão da cidade", cond: (e) => e.missoes >= 1 },
  { id: "cinco-missoes", nome: "Cinco missões", emoji: "✋", desc: "Cinco missões concluídas", cond: (e) => e.missoes >= 5 },
  { id: "dez-missoes", nome: "Dez missões", emoji: "🔟", desc: "Dez missões concluídas", cond: (e) => e.missoes >= 10 },
  { id: "vinte-missoes", nome: "Ajudante da cidade", emoji: "🏙️", desc: "Vinte missões concluídas", cond: (e) => e.missoes >= 20 },
  { id: "biblia", nome: "Histórias da Bíblia", emoji: "📖", desc: `Todas as ${BIBLICAS} histórias da Bíblia`, cond: (e) => e.biblicas >= BIBLICAS },
  { id: "nivel-3", nome: "Nível 3", emoji: "🎈", desc: "Chegou ao nível 3", cond: (e) => e.nivel >= 3 },
  { id: "nivel-5", nome: "Nível 5", emoji: "⭐", desc: "Chegou ao nível 5", cond: (e) => e.nivel >= 5 },
  { id: "nivel-10", nome: "Nível 10", emoji: "🌠", desc: "Chegou ao nível 10", cond: (e) => e.nivel >= 10 },
  { id: "parceiras", nome: "Amigo das parceiras", emoji: "🏪", desc: `Visitou as ${PARCEIROS.length} lojas parceiras`, cond: (e) => e.parceirasVisitadas >= PARCEIROS.length },
  { id: "monte", nome: "No alto do monte", emoji: "⛰️", desc: "Subiu ao Monte da Oração", cond: (e) => Boolean(e.monte) },
  { id: "casa", nome: "Minha casa", emoji: "🏠", desc: "Escolheu uma casa para morar", cond: (e) => Boolean(e.casa) },
  { id: "figurinhas-10", nome: "Colecionador", emoji: "📒", desc: "Dez figurinhas no álbum", cond: (e) => e.figurinhas >= 10 },
  { id: "figurinhas-30", nome: "Colecionador de ouro", emoji: "🏅", desc: "Trinta figurinhas no álbum", cond: (e) => e.figurinhas >= 30 },
  { id: "pagina", nome: "Página completa", emoji: "✅", desc: "Completou uma página do álbum", cond: (e) => e.paginas >= 1 },
  { id: "medalha", nome: "Primeira medalha", emoji: "🥉", desc: "Ganhou uma medalha num desafio", cond: (e) => e.medalhas >= 1 },
  { id: "ouro", nome: "Medalha de ouro", emoji: "🥇", desc: "Medalha de ouro num desafio", cond: (e) => e.ouro >= 1 },
  { id: "sete-dias", nome: "Sete dias seguidos", emoji: "🎁", desc: "Abriu o presente sete dias seguidos", cond: (e) => e.presenteSeq >= 7 },
  { id: "mochila", nome: "Mochila cheia", emoji: "🎒", desc: "Seis itens na mochila", cond: (e) => e.itens >= 6 },
];

export function criarConquistas({ salvo, salvar, estado, aoNova = null }) {
  const feitas = () => { const s = salvo(); if (!Array.isArray(s.conquistas)) s.conquistas = []; return s.conquistas; };
  const guardar = () => { try { salvar(); } catch { /* sem armazenamento */ } };
  function verificar({ quieto = false } = {}) {
    let e; try { e = estado() ?? {}; } catch { return []; }
    const F = feitas(), novas = [];
    for (const c of CONQUISTAS) { if (F.includes(c.id)) continue; let ok = false; try { ok = Boolean(c.cond(e)); } catch { ok = false; } if (ok) { F.push(c.id); novas.push(c); } }
    if (novas.length) { guardar(); if (!quieto) for (const c of novas) aoNova?.(c); }
    return novas;
  }
  const lista = () => { const F = feitas(); return CONQUISTAS.map((c) => ({ id: c.id, nome: c.nome, emoji: c.emoji, desc: c.desc, feita: F.includes(c.id) })); };
  // tela do Rabisfone (app Conquistas): os selos, os feitos coloridos e os que faltam apagados
  function montar(tela, listaEl, { botao }) {
    const L = lista(), n = L.filter((c) => c.feita).length;
    const p = document.createElement("p"); p.innerHTML = `Conquistas: <b>${n} de ${L.length}</b>. Jogue, ajude e explore para ganhar os selos!`; tela.insertBefore(p, listaEl);
    for (const c of L) { const b = botao(`<span class="rf-emoji rf-selo-conq${c.feita ? "" : " falta"}">${c.feita ? c.emoji : "🔒"}</span><span class="rf-missao">${c.nome}<small>${c.desc}</small></span><span class="rf-selo${c.feita ? " feito" : ""}">${c.feita ? "🏅" : ""}</span>`, () => {}, "rf-item-missao"); b.dataset.conquista = c.id; if (!c.feita) b.classList.add("rf-item-falta"); listaEl.append(b); }
    return true;
  }
  return { CONQUISTAS, verificar, lista, montar, feitas: () => [...feitas()] };
}
