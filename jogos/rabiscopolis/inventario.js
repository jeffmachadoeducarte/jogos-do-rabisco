// Rabiscolândia (Mundo Vivo, etapa 10): o inventário de verdade (a mochila), salvo por perfil em salvo.inventario.
//  - itens GUARDADOS (ficam para sempre): o que a criança ganha ao concluir missões: a Bíblia (1ª história da Bíblia;
//    mostra um versículo que ela já aprendeu), sementes, regador, vara de pescar, picareta, cesta de frutas, espiga,
//    milho, extintor, lanterna, kit de curativo, luneta, conchinha, flor, estrelinha... (PRESENTE_DA_MISSAO);
//  - itens CARREGADOS (enquanto a missão pede): o que o Rabisco pega nas etapas "pegar"/"evento" (cesta de pães, cartas,
//    garrafinhas, o alvará...) entra na mochila na hora e sai quando é entregue ou a missão é largada (missoes.js avisa).
// A barra de itens do HUD (hud.js) mostra o que está na mochila; tocar num item mostra o nome e para que serve.
//   const I = criarInventario({ salvo, salvar, aoMudar(), versiculos() → [{ ref, texto }] });
//   I.lista() → [{ id, nome, emoji, desc, qtd, carregando }]  I.tem(id)  I.dar(id) → nova?  I.carregar({ id, nome, emoji, missao })
//   I.soltar(id | null = tudo)  I.presentesDa(M) → ids  I.migrar(missoesFeitas) → ids novos  I.montar(tela, lista, { botao })
import { MISSOES } from "./missoes-dados.js";

export const ITENS = {
  biblia: { nome: "Bíblia", emoji: "📖", desc: "Os versículos que você já aprendeu nas histórias da Bíblia. Toque para ler um!" },
  sementes: { nome: "Sementes", emoji: "🌱", desc: "Sementinhas do semeador: em terra boa, viram planta." },
  regador: { nome: "Regador", emoji: "🪣", desc: "Para regar a hortinha do Sítio Floresça." },
  vara: { nome: "Vara de pescar", emoji: "🎣", desc: "A vara da pescaria com o Junior, no píer do sítio." },
  picareta: { nome: "Picareta", emoji: "⛏️", desc: "Para cavar e achar ossinhos de dinossauro no museu." },
  cesta: { nome: "Cesta de frutas", emoji: "🧺", desc: "Frutas fresquinhas da fazendinha para repartir." },
  espiga: { nome: "Espiga de trigo", emoji: "🌾", desc: "As espigas que Rute colheu: viram pão quentinho." },
  milho: { nome: "Milho", emoji: "🌽", desc: "Comidinha das galinhas e dos patos do sítio." },
  extintor: { nome: "Extintor", emoji: "🧯", desc: "Dos bombeiros: apaga o foguinho das lixeiras." },
  lanterna: { nome: "Lanterna", emoji: "🔦", desc: "A luz do farol que guia os barquinhos de noite." },
  curativo: { nome: "Kit de curativo", emoji: "🩹", desc: "Para cuidar dos amigos que se machucam." },
  luneta: { nome: "Luneta", emoji: "🔭", desc: "Do observatório: para ver as estrelas de perto." },
  concha: { nome: "Conchinha", emoji: "🐚", desc: "Da praia do Mar Azul: um colar de conchinhas." },
  flor: { nome: "Flor", emoji: "🌼", desc: "Da floricultura: um presente de aniversário cheiroso." },
  estrela: { nome: "Estrelinha", emoji: "⭐", desc: "Uma das estrelinhas que você contou no céu." },
  ovelha: { nome: "Ovelhinha", emoji: "🐑", desc: "A ovelhinha perdida que você achou: agora é sua amiga." },
  chave: { nome: "Chave do carro", emoji: "🔑", desc: "A chave do carro que você escolheu na J.E Multimarcas." },
};
// o que cada missão concluída deixa na mochila (a 1ª vez); toda história da Bíblia dá a Bíblia
export const PRESENTE_DA_MISSAO = {
  ovelha: "ovelha", semeador: "sementes", rute: "espiga", amigos: "curativo", encomenda: "cesta", fogo: "extintor", farol: "lanterna",
  pesca: "vara", "parceiro-sitio-floresca-pesca": "vara", "parceiro-sitio-floresca-horta": "regador", "parceiro-sitio-floresca-comida": "milho",
  dinossauros: "picareta", luneta: "luneta", estrelas: "estrela", conchas: "concha", flores: "flor", lirios: "flor", "parceiro-je-multimarcas": "chave",
};
export const presentesDa = (M) => { const ids = []; const m = typeof M === "string" ? MISSOES.find((q) => q.id === M) : M; if (!m) return ids; if (m.tipo === "biblica") ids.push("biblia"); if (PRESENTE_DA_MISSAO[m.id]) ids.push(PRESENTE_DA_MISSAO[m.id]); return ids; };

export function criarInventario({ salvo, salvar, aoMudar = null, versiculos = () => [] }) {
  const dados = () => {
    const s = salvo();
    if (!s.inventario || typeof s.inventario !== "object" || Array.isArray(s.inventario)) s.inventario = {};
    const I = s.inventario;
    if (!I.itens || typeof I.itens !== "object") I.itens = {};
    if (!Array.isArray(I.carregando)) I.carregando = [];
    if (!Array.isArray(I.ganhos)) I.ganhos = []; // missões cujo presente já foi dado
    return I;
  };
  const guardar = () => { try { salvar(); } catch { /* sem armazenamento */ } };
  const mudou = () => aoMudar?.(lista());
  const tem = (id) => (dados().itens[id] ?? 0) > 0 || dados().carregando.some((c) => c.id === id);
  // item guardado (para sempre); devolve true se é novo
  function dar(id, qtd = 1) {
    if (!ITENS[id]) return false;
    const I = dados(), novo = !(I.itens[id] > 0);
    I.itens[id] = (I.itens[id] ?? 0) + qtd; guardar(); mudou();
    return novo;
  }
  function tirar(id, qtd = 1) { const I = dados(); if (!(I.itens[id] > 0)) return false; I.itens[id] = Math.max(0, I.itens[id] - qtd); if (!I.itens[id]) delete I.itens[id]; guardar(); mudou(); return true; }
  // item da missão em andamento (sai ao entregar/largar)
  function carregar({ id, nome, emoji, missao = null }) { const I = dados(); if (I.carregando.some((c) => c.id === id)) return; I.carregando.push({ id, nome: nome ?? id, emoji: emoji ?? "📦", missao }); guardar(); mudou(); }
  function soltar(id = null) { const I = dados(); const antes = I.carregando.length; I.carregando = id == null ? [] : I.carregando.filter((c) => c.id !== id); if (I.carregando.length !== antes) { guardar(); mudou(); } }
  // presentes de uma missão concluída (a 1ª vez): devolve os ids novos na mochila
  function receber(M) {
    const I = dados(), id = typeof M === "string" ? M : M?.id;
    if (!id || I.ganhos.includes(id)) return [];
    I.ganhos.push(id);
    const novos = presentesDa(id).filter((it) => dar(it));
    guardar(); return novos;
  }
  // save antigo: quem já concluiu missões antes da mochila existir recebe os presentes agora, sem festa
  const migrar = (missoesFeitas) => (Array.isArray(missoesFeitas) ? missoesFeitas.flatMap((id) => receber(id)) : []);
  function lista() {
    const I = dados();
    const guardados = Object.entries(I.itens).filter(([, q]) => q > 0).map(([id, qtd]) => ({ id, ...ITENS[id], qtd, carregando: false }));
    const carregados = I.carregando.map((c) => ({ id: c.id, nome: c.nome, emoji: c.emoji, desc: c.missao ? `Da missão em andamento. Leve até quem está esperando!` : "Você está levando isto agora.", qtd: 1, carregando: true }));
    return [...carregados, ...guardados];
  }
  // texto de um item (a Bíblia mostra um versículo que a criança já aprendeu)
  function descrever(id) {
    const it = lista().find((q) => q.id === id); if (!it) return null;
    if (id === "biblia") { const vs = versiculos() ?? []; if (vs.length) { const v = vs[Math.floor(Math.random() * vs.length)]; return { ...it, desc: `«${v.texto}» (${v.ref})` }; } }
    return it;
  }
  // tela do Rabisfone (app Mochila)
  function montar(tela, listaEl, { botao }) {
    const L = lista();
    const p = document.createElement("p");
    p.textContent = L.length ? `Você tem ${L.length} ${L.length === 1 ? "item" : "itens"} na mochila. Toque para saber para que serve.` : "Sua mochila ainda está vazia. O que você pegar e ganhar nas missões fica guardado aqui!";
    tela.insertBefore(p, listaEl);
    const info = document.createElement("p"); info.className = "rf-inv-info"; info.hidden = true; tela.insertBefore(info, listaEl);
    for (const it of L) {
      const b = botao(`<span class="rf-emoji">${it.emoji}</span><span class="rf-missao">${it.nome}${it.qtd > 1 ? ` ×${it.qtd}` : ""}<small>${it.carregando ? "📦 levando agora" : "🎒 guardado"}</small></span>`, () => { const d = descrever(it.id); info.hidden = false; info.innerHTML = `<b>${d.emoji} ${d.nome}</b><br>${d.desc}`; }, "rf-item-missao");
      b.dataset.item = it.id; listaEl.append(b);
    }
    return true;
  }
  return { ITENS, lista, tem, dar, tirar, carregar, soltar, receber, migrar, descrever, montar, presentesDa, carregando: () => dados().carregando.map((c) => c.id) };
}
