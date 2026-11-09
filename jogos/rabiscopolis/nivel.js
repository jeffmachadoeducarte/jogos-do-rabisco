// Rabiscolândia (Mundo Vivo, etapa 10): nível e XP (dados puros, sem DOM: dá para testar em node).
// A criança ganha XP ao concluir missões, desafios (medalhas), figurinhas do álbum, o presente do dia, o Monte da
// Oração e as conquistas. Cada ganho tem uma CHAVE ("missao:ovelha", "fig:l:praca", "desafio:praca:ouro",
// "presente:2026-11-09", "monte", "conquista:primeira-missao") e vale uma vez só: o livro de ganhos (salvo.xp.ganhos)
// não repete. Por isso o save antigo entra certo: ao abrir, jogo.js credita o que já foi feito (missões, figurinhas,
// medalhas...) pelas mesmas chaves, sem festinha, e o XP "começa calculado".
// Cada nível pede um pouco mais: do nível n para o n+1 são metaDoNivel(n) pontos (80, 125, 170, ...).
//   const N = criarNivel({ salvo, salvar, aoMudar(info, ganho), aoSubir(info, antes) });
//   N.creditar(chave, pontos, { quieto }) → { novo, pontos, total, subiu }   N.info() → { nivel, xp, meta, total }

export const XP = { missao: 40, figurinha: 6, presente: 15, monte: 60, conquista: 25, desafio: { bronze: 20, prata: 30, ouro: 45 } };
export const metaDoNivel = (n) => 80 + (Math.max(1, n) - 1) * 45;
export const NIVEL_MAX = 50;

// nível pelo total de XP: { nivel, xp (dentro do nível), meta (do nível atual), total }
export function nivelDe(total) {
  let nivel = 1, resto = Math.max(0, Math.floor(total || 0));
  while (nivel < NIVEL_MAX && resto >= metaDoNivel(nivel)) { resto -= metaDoNivel(nivel); nivel++; }
  return { nivel, xp: nivel >= NIVEL_MAX ? metaDoNivel(nivel) : resto, meta: metaDoNivel(nivel), total: Math.max(0, Math.floor(total || 0)) };
}

export function criarNivel({ salvo, salvar, aoMudar = null, aoSubir = null }) {
  const dados = () => {
    const s = salvo();
    if (!s.xp || typeof s.xp !== "object" || Array.isArray(s.xp)) s.xp = {};
    if (!s.xp.ganhos || typeof s.xp.ganhos !== "object") s.xp.ganhos = {};
    if (!Number.isFinite(s.xp.total)) s.xp.total = Object.values(s.xp.ganhos).reduce((a, b) => a + (Number(b) || 0), 0);
    return s.xp;
  };
  const guardar = () => { try { salvar(); } catch { /* sem armazenamento: vale até fechar */ } };
  const info = () => nivelDe(dados().total);
  // pontos por uma chave; a mesma chave nunca conta duas vezes. quieto = sem festinha (save antigo entrando)
  function creditar(chave, pontos, { quieto = false } = {}) {
    const X = dados();
    if (!chave || !(pontos > 0) || X.ganhos[chave]) return { novo: false, pontos: 0, total: X.total, subiu: false, info: info() };
    const antes = nivelDe(X.total);
    X.ganhos[chave] = pontos; X.total += pontos;
    const depois = nivelDe(X.total);
    guardar();
    const subiu = depois.nivel > antes.nivel;
    if (!quieto) { aoMudar?.(depois, { chave, pontos }); if (subiu) aoSubir?.(depois, antes); }
    return { novo: true, pontos, total: X.total, subiu, info: depois };
  }
  return { XP, creditar, info, tem: (chave) => Boolean(dados().ganhos[chave]), get total() { return dados().total; }, ganhos: () => ({ ...dados().ganhos }), metaDoNivel, nivelDe };
}
