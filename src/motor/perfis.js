// Perfis por aparelho ("Quem vai jogar?"): a família tem 1 responsável (src/motor/familia.js) e N jogadores neste aparelho
// (cada filho e, se quiser, o próprio responsável). Sem senha para criança: troca-se de perfil tocando no avatar.
// Cada perfil tem o SEU progresso: todo jogo lê e grava progresso por `armazem` (mesma cara do localStorage), que põe
// o id do perfil ativo na frente da chave: "rabisco.rabiscoins.v1" → "rabisco.perfil.<id>.rabisco.rabiscoins.v1".
// Sem DOM (as telas ficam em perfis-ui.js). Nada daqui vai para a rede.
//
//   import { armazem, Perfis } from "./perfis.js";      // também em window.Perfis
//   armazem.getItem("rabisco.rabiscoins.v1")  /  armazem.setItem(k, v)  /  armazem.removeItem(k)
//   Perfis.ativo() → { id, nome, tipo: "crianca"|"adulto", nascimento, genero, foto } ;  Perfis.lista()
//   Perfis.criar({...}) · Perfis.atualizar(id, {...}) · Perfis.remover(id) · Perfis.trocar(id) · Perfis.apagarTudo()
//
// Migração automática (roda ao carregar, antes de qualquer jogo ler o progresso): o cadastro antigo de UMA criança
// (`rabisco.familia`.crianca, com foto) vira o 1º perfil, e as chaves de progresso antigas (sem perfil) passam para
// o perfil ativo. Também vale se uma página antiga (cache) gravar a chave sem perfil depois: ela é a mais nova e
// entra no perfil ativo. Assim ninguém perde nada.

export const CHAVE_PERFIS = "rabisco.perfis";
const PREFIXO = "rabisco.perfil.";
const CHAVE_FAMILIA = "rabisco.familia";

// O que é PROGRESSO (de cada jogador). Preferências do aparelho (som, Modo TV, botões trocados, rádio) continuam do aparelho.
const PROGRESSO_FIXO = new Set([
  "rabisco.rabiscopolis.v1",   // Rabiscolândia: casa, móveis, álbum, missões, baú, bichinho, Meu Rabisco, desafios…
  "rabisco.rabiscoins.v1",     // carteira de Rabiscoins (todos os jogos)
  "rabisco-arca-recorde",      // Rabisco e a Arca: recorde
]);
const PROGRESSO_PADROES = [
  /^rabisco-[a-z0-9-]+-niveis$/i,       // estrelas por nível dos jogos da casca (src/motor/casca.js)
  /^superRabisco[A-Za-z]*(-fases)?$/,    // Super Rabisco (letras, sílabas, mini): estrelas e fases
  /^kart-[^.]+-medalhas$/,               // Rabisco Kart: medalhas por modo
];
export const ehProgresso = (k) => typeof k === "string" && !k.startsWith(PREFIXO) && (PROGRESSO_FIXO.has(k) || PROGRESSO_PADROES.some((r) => r.test(k)));

// ------------------------------------------------------------------ armazenamento (tolera modo privado / bloqueado)
const memoria = new Map(); // sem localStorage: vale enquanto a página estiver aberta
const ls = () => { try { const s = globalThis.localStorage; s?.length; return s || null; } catch { return null; } };
const bruto = {
  get(k) { const s = ls(); if (!s) return memoria.has(k) ? memoria.get(k) : null; try { return s.getItem(k); } catch { return null; } },
  set(k, v) { const s = ls(); if (!s) { memoria.set(k, String(v)); return true; } try { s.setItem(k, String(v)); return true; } catch { return false; } },
  del(k) { const s = ls(); memoria.delete(k); if (s) { try { s.removeItem(k); } catch { /* */ } } },
  chaves() { const s = ls(); if (!s) return [...memoria.keys()]; try { return Array.from({ length: s.length }, (_, i) => s.key(i)).filter((k) => k != null); } catch { return []; } },
};
const lerJSON = (k, padrao = null) => { try { return JSON.parse(bruto.get(k)) ?? padrao; } catch { return padrao; } };
const gravarJSON = (k, v) => bruto.set(k, JSON.stringify(v));

// ------------------------------------------------------------------ registro dos perfis
// { v: 1, ativo: id, perfis: [{ id, nome, tipo, nascimento, genero, foto, criadoEm }], migracao: { em, para, chaves } }
const novoId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const limparNome = (s, max = 30) => String(s || "").normalize("NFC").replace(/[^\p{L}\p{M}' -]/gu, "").replace(/\s+/g, " ").trim().slice(0, max);
const GENEROS = new Set(["menina", "menino"]);
function normalizar(p) {
  return {
    id: String(p.id || novoId()),
    nome: limparNome(p.nome, 30),
    tipo: p.tipo === "adulto" ? "adulto" : "crianca",
    nascimento: /^\d{4}-\d{2}-\d{2}$/.test(p.nascimento || "") ? p.nascimento : "",
    genero: GENEROS.has(p.genero) ? p.genero : "",
    foto: typeof p.foto === "string" && p.foto.startsWith("data:image/") ? p.foto : null,
    criadoEm: p.criadoEm || new Date().toISOString(),
  };
}

let reg = lerJSON(CHAVE_PERFIS, null);
if (!reg || !Array.isArray(reg.perfis)) reg = null;
const ouvintes = new Set();
function salvarReg() {
  gravarJSON(CHAVE_PERFIS, reg);
  for (const cb of ouvintes) { try { cb(ativo()); } catch { /* ouvinte com erro não trava */ } }
}

// ------------------------------------------------------------------ migração (uma vez e sempre que achar chave antiga)
export const migradas = []; // chaves antigas trazidas para um perfil nesta carga (para o teste e o relatório)
function migrar() {
  const fam = lerJSON(CHAVE_FAMILIA, null);
  const antiga = fam && typeof fam === "object" && fam.crianca && typeof fam.crianca === "object" ? fam.crianca : null;
  if (!reg) {
    const p = normalizar({ ...(antiga || {}), tipo: "crianca" });
    reg = { v: 1, ativo: p.id, perfis: [p], criadoEm: new Date().toISOString() };
  } else if (antiga?.nome) {
    // cadastro antigo gravado de novo (página antiga ou teste): vale para o perfil ativo
    const i = Math.max(0, reg.perfis.findIndex((p) => p.id === reg.ativo));
    if (reg.perfis[i]) reg.perfis[i] = normalizar({ ...reg.perfis[i], ...antiga, id: reg.perfis[i].id, tipo: reg.perfis[i].tipo });
  }
  if (!reg.perfis.length) { const p = normalizar({ tipo: "crianca" }); reg.perfis.push(p); }
  if (!reg.perfis.some((p) => p.id === reg.ativo)) reg.ativo = reg.perfis[0].id;
  if (antiga) { const { crianca, ...resto } = fam; gravarJSON(CHAVE_FAMILIA, resto); } // a criança agora mora no perfil
  // progresso sem perfil → perfil ativo (copia, confere e só então apaga a antiga)
  const para = reg.ativo;
  for (const k of bruto.chaves()) {
    if (!ehProgresso(k)) continue;
    const v = bruto.get(k);
    if (v == null) continue;
    if (bruto.set(chave(k, para), v) && bruto.get(chave(k, para)) === v) { bruto.del(k); migradas.push(k); }
  }
  if (migradas.length) reg.migracao = { em: new Date().toISOString(), para, chaves: [...new Set([...(reg.migracao?.chaves || []), ...migradas])] };
  gravarJSON(CHAVE_PERFIS, reg);
}

// ------------------------------------------------------------------ API
export const chave = (k, id = reg?.ativo) => `${PREFIXO}${id}.${k}`;
export const armazem = {
  getItem: (k) => bruto.get(chave(k)),
  setItem: (k, v) => { if (!bruto.set(chave(k), v)) throw new DOMException("sem espaço", "QuotaExceededError"); },
  removeItem: (k) => bruto.del(chave(k)),
  chave: (k) => chave(k),
};
export const lista = () => reg.perfis.map((p) => ({ ...p }));
export function ativo() { const p = reg.perfis.find((x) => x.id === reg.ativo) || reg.perfis[0]; return p ? { ...p } : null; }
export const idAtivo = () => reg.ativo;
export const obter = (id) => { const p = reg.perfis.find((x) => x.id === id); return p ? { ...p } : null; };
export function aoMudar(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); }

export function criar(dados = {}) {
  const p = normalizar({ ...dados, id: null });
  reg.perfis.push(p);
  salvarReg();
  return { ...p };
}
export function atualizar(id, dados = {}) {
  const i = reg.perfis.findIndex((p) => p.id === id);
  if (i < 0) return null;
  reg.perfis[i] = normalizar({ ...reg.perfis[i], ...dados, id });
  salvarReg();
  return { ...reg.perfis[i] };
}
// apaga o perfil e TODO o progresso dele; o último perfil não sai (para isso há o "apagar tudo")
export function remover(id) {
  if (reg.perfis.length <= 1 || !reg.perfis.some((p) => p.id === id)) return false;
  for (const k of bruto.chaves()) if (k.startsWith(`${PREFIXO}${id}.`)) bruto.del(k);
  reg.perfis = reg.perfis.filter((p) => p.id !== id);
  if (reg.ativo === id) reg.ativo = reg.perfis[0].id;
  salvarReg();
  return true;
}
// troca o jogador: o estado de cada jogo é lido na carga da página, então recarrega (recarregar: false só nos testes)
export function trocar(id, { recarregar = true } = {}) {
  if (!reg.perfis.some((p) => p.id === id)) return false;
  const mudou = reg.ativo !== id;
  reg.ativo = id;
  salvarReg();
  if (mudou && recarregar) location.reload();
  return mudou;
}
// "Apagar todos os dados deste aparelho": cadastro, fotos, perfis, progresso de todos e preferências dos jogos
export function apagarTudo() {
  for (const k of bruto.chaves()) if (k.startsWith("rabisco") || ehProgresso(k)) bruto.del(k);
  try { for (const k of Object.keys(sessionStorage)) if (k.startsWith("rabisco")) sessionStorage.removeItem(k); } catch { /* */ }
  memoria.clear();
  reg = null;
  migrar();
}

migrar();

export const Perfis = { armazem, chave, lista, ativo, idAtivo, obter, criar, atualizar, remover, trocar, apagarTudo, aoMudar, ehProgresso, migradas, CHAVE_PERFIS };
globalThis.Perfis = Perfis;
export default Perfis;
