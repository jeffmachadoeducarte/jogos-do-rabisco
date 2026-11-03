// Rabiscoins: a moedinha do portal. Uma carteira só para todos os jogos, guardada NESTE aparelho (localStorage
// "rabisco.rabiscoins.v1"); nada vai para a rede, não tem dinheiro de verdade nem compra fora do jogo.
// A criança ganha brincando (concluir missão na Rabiscolândia; repetir rende menos) e gasta no Ateliê (roupas e pinturas).
// Sem DOM e sem som (dá para testar em node): o contador e a animação ficam em rabiscoins-ui.js.
//
//   import { carteira, saldo, recompensa, comprar, tem, aoMudar } from "../../src/motor/rabiscoins.js";
//   recompensa("rabiscolandia:missao:padaria", { primeira: 20, repetida: 5 }) → { ganhou: 20, primeira: true, saldo }
//   comprar("rabiscolandia:chapeu:coroa", 200) → { ok: true, saldo } | { ok: false, motivo: "sem-saldo", falta: 35 } | { ok: false, motivo: "ja-tem" }
//
// Formato guardado: { saldo, ganhos: { [motivo]: vezes }, comprados: [id], total (tudo o que já ganhou) }

const CHAVE = "rabisco.rabiscoins.v1";
export const MAXIMO = 99999; // ninguém precisa de mais que isso (e o contador cabe na tela)
const VAZIA = () => ({ saldo: 0, ganhos: {}, comprados: [], total: 0 });
const ouvintes = new Set();

function ler() {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE));
    if (!d || typeof d !== "object") return VAZIA();
    const saldo = Number.isFinite(d.saldo) ? Math.max(0, Math.min(MAXIMO, Math.floor(d.saldo))) : 0;
    return { ...VAZIA(), ...d, saldo, ganhos: d.ganhos && typeof d.ganhos === "object" ? d.ganhos : {}, comprados: Array.isArray(d.comprados) ? d.comprados.filter((x) => typeof x === "string") : [] };
  } catch { return VAZIA(); }
}
function gravar(d, motivo) {
  try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch { /* sem armazenamento: vale só até fechar */ }
  for (const fn of ouvintes) { try { fn(d, motivo); } catch { /* quem ouve não derruba a carteira */ } }
  return d;
}

export const carteira = () => ler();
export const saldo = () => ler().saldo;
export const tem = (id) => ler().comprados.includes(id);
export const comprados = () => new Set(ler().comprados);
export const vezes = (motivo) => ler().ganhos[motivo] ?? 0;

// soma qtd ao saldo (motivo é só para lembrar quantas vezes aquilo já rendeu)
export function ganhar(qtd, motivo = "brincar") {
  const d = ler(), n = Math.max(0, Math.floor(qtd) || 0);
  const antes = d.saldo;
  d.saldo = Math.min(MAXIMO, d.saldo + n);
  d.total = (d.total ?? 0) + (d.saldo - antes);
  d.ganhos[motivo] = (d.ganhos[motivo] ?? 0) + 1;
  gravar(d, { tipo: "ganhou", qtd: d.saldo - antes, motivo });
  return { ganhou: d.saldo - antes, saldo: d.saldo };
}
// a 1ª vez rende `primeira`; as outras, `repetida`
export function recompensa(motivo, { primeira = 20, repetida = 5 } = {}) {
  const ja = vezes(motivo) > 0;
  const r = ganhar(ja ? repetida : primeira, motivo);
  return { ...r, primeira: !ja };
}
export function comprar(id, preco) {
  const d = ler();
  if (d.comprados.includes(id)) return { ok: false, motivo: "ja-tem", saldo: d.saldo };
  const p = Math.max(0, Math.floor(preco) || 0);
  if (d.saldo < p) return { ok: false, motivo: "sem-saldo", falta: p - d.saldo, saldo: d.saldo };
  d.saldo -= p;
  d.comprados.push(id);
  gravar(d, { tipo: "comprou", id, preco: p });
  return { ok: true, saldo: d.saldo };
}
// avisa quando o saldo ou as compras mudam (aqui ou em outra aba do mesmo aparelho); devolve a função para parar de ouvir
export function aoMudar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); }
if (typeof addEventListener === "function") addEventListener("storage", (e) => { if (e.key === CHAVE) { const d = ler(); for (const fn of ouvintes) { try { fn(d, { tipo: "outra-aba" }); } catch { /* idem */ } } } });

// só para os testes e para "começar de novo" na família
export function zerar() { try { localStorage.removeItem(CHAVE); } catch { /* idem */ } for (const fn of ouvintes) { try { fn(VAZIA(), { tipo: "zerou" }); } catch { /* idem */ } } }
export { CHAVE };
