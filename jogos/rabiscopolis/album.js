// Rabiscolândia: o estado do Álbum de figurinhas (sem DOM, sem som). Fica em salvo.album, no salvamento da Rabiscolândia:
//   { figs: [ids na ordem em que chegaram], paginas: [páginas já completas, com o bônus pago], fala: true depois da 1ª figurinha }
// Nunca repete: ganhar uma figurinha que a criança já tem não muda nada. Completar uma página rende BONUS_PAGINA Rabiscoins, uma vez.
//
//   const A = criarAlbum({ salvo: () => salvo, salvar: () => salvar(salvo), ganhar: (qtd, motivo) => … });
//   A.ganhar(id) → { nova, fig, primeira, pagina: { id, nome, bonus } | null }      A.tem(id)
//   A.contagem(pagina) → { tem, total }      A.surpresa(semente) → id de uma figurinha que falta, ou null
//   A.visitou(lugarId) · A.missao(missaoId) → lista de resultados de ganhar()      A.recuperar() → figurinhas de missões já concluídas
import { PAGINAS, FIGURINHAS, figurinha, paginaDe, idDoLugar, BONUS_PAGINA, MOTIVO_PAGINA } from "./album-dados.js";

export function criarAlbum({ salvo, salvar, ganhar }) {
  const dados = () => {
    const s = salvo();
    if (!s.album || typeof s.album !== "object" || Array.isArray(s.album)) s.album = {};
    const A = s.album;
    if (!Array.isArray(A.figs)) A.figs = [];
    if (!Array.isArray(A.paginas)) A.paginas = [];
    return A;
  };
  const guardar = () => { try { salvar(); } catch { /* sem armazenamento: vale só até fechar */ } };
  const tem = (id) => dados().figs.includes(id);
  const contagem = (pag) => { const P = paginaDe(pag); return { tem: P.figs.filter((f) => tem(f.id)).length, total: P.figs.length }; };
  function ganharFig(id) {
    const fig = figurinha(id), A = dados();
    if (!fig || A.figs.includes(id)) return { nova: false, fig, primeira: false, pagina: null };
    const primeira = A.figs.length === 0 && !A.fala;
    A.figs.push(id);
    let pagina = null;
    const P = paginaDe(fig.pagina), c = contagem(P.id);
    if (c.tem === c.total && !A.paginas.includes(P.id)) {
      A.paginas.push(P.id);
      ganhar?.(BONUS_PAGINA, MOTIVO_PAGINA(P.id));
      pagina = { id: P.id, nome: P.nome, bonus: BONUS_PAGINA };
    }
    if (primeira) A.fala = true;
    guardar();
    return { nova: true, fig, primeira, pagina };
  }
  // o baú do dia: uma figurinha que ainda falta, escolhida pela semente (a data), sem repetir
  function surpresa(semente = "") {
    const faltam = FIGURINHAS.filter((f) => !tem(f.id));
    if (!faltam.length) return null;
    let h = 2166136261;
    for (const ch of `${semente}|${dados().figs.length}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return faltam[h % faltam.length].id;
  }
  const visitou = (lugarId) => { const id = idDoLugar(lugarId); return id ? [ganharFig(id)] : []; };
  // pessoas de verdade: uma figurinha só, vale qualquer uma das missões dela
  const dePessoa = (mid) => FIGURINHAS.filter((f) => f.missoes?.includes(mid)).map((f) => f.id);
  const missao = (mid) => [`a:${mid}`, `v:${mid}`, ...dePessoa(mid)].filter((id) => figurinha(id)).map(ganharFig);
  // save antigo: quem concluiu a missão antes da figurinha existir recebe agora (sem duplicar, sem animação)
  function recuperar() {
    const feitas = salvo().missoesFeitas;
    if (!Array.isArray(feitas)) return [];
    return FIGURINHAS.filter((f) => f.missoes?.some((m) => feitas.includes(m)) && !tem(f.id)).map((f) => ganharFig(f.id)).filter((r) => r.nova);
  }
  return { ganhar: ganharFig, tem, contagem, surpresa, visitou, missao, recuperar, paginas: () => PAGINAS, total: () => dados().figs.length, completas: () => [...dados().paginas] };
}
