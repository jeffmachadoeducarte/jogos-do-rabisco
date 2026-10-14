// Rabiscolândia: conferência do conteúdo (node, sem navegador).
//   node ferramentas/teste/rabiscopolis-conteudo.mjs
// · nenhuma palavra proibida (armas, crimes, prisão, brigas, sustos, namoro, nomes de outros jogos, dinheiro) em
//   nada que a criança lê ou ouve: falas.json e todos os textos entre aspas dos arquivos do jogo;
// · as 8 missões bíblicas têm versículo em paráfrase com "baseado em <livro capítulo.versículo>";
// · as 4 de cidadania existem; toda missão termina em alguém que espera no destino (personagem da missão);
// · tipos de personagem conhecidos; itens e pontos dentro da cidade; toda fala rp-* tem o MP3 em assets/voz.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const JOGO = `${RAIZ}jogos/rabiscopolis/`;
const modulo = (arq) => import(`data:text/javascript,${encodeURIComponent(readFileSync(arq, "utf8"))}`);
const { MISSOES, PROIBIDAS } = await modulo(`${JOGO}missoes-dados.js`);
let falhas = 0;
const ok = (cond, msg) => { if (cond) console.log(`✓ ${msg}`); else { falhas++; console.log(`✗ ${msg}`); } };

// ---- palavras proibidas
// palavra inteira (sem pegar "armário" por "arma" nem "apagar" por "pagar"); "namor" vale como começo de palavra
const tira = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const regras = PROIBIDAS.map((p) => ({ p, re: new RegExp(`(^|[^a-z])${tira(p).replace(/ /g, "\\s+")}${p === "namor" ? "" : "(?![a-z])"}`) }));
const textos = []; // { onde, texto }
const falas = JSON.parse(readFileSync(`${JOGO}falas.json`, "utf8"));
for (const [k, v] of Object.entries(falas.pt)) textos.push({ onde: `falas.json ${k}`, texto: v });
for (const arq of readdirSync(JOGO).filter((f) => f.endsWith(".js"))) {
  let fonte = readFileSync(JOGO + arq, "utf8");
  if (arq === "missoes-dados.js") fonte = fonte.replace(/export const PROIBIDAS = \[[^\]]*\];/, "");
  fonte = fonte.replace(/^\s*(\/\/|\*|\/\*).*$/gm, ""); // comentários não aparecem para a criança
  for (const m of fonte.matchAll(/"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`|'((?:[^'\\\n]|\\.)*)'/g)) {
    const t = m[1] ?? m[2] ?? m[3];
    if (t && /[a-zà-ú]{3}/i.test(t)) textos.push({ onde: arq, texto: t });
  }
}
const achados = [];
for (const { onde, texto } of textos) { const t = tira(texto); for (const { p, re } of regras) if (re.test(t)) achados.push(`${onde}: "${p}" em “${texto.slice(0, 80)}”`); }
ok(achados.length === 0, `nenhuma palavra proibida em ${textos.length} textos (${PROIBIDAS.length} palavras)${achados.length ? "\n    " + achados.join("\n    ") : ""}`);
// o filtro funciona (controle): pega o que deve e deixa passar armário/apagar/comprimento
ok(["a arma", "foi preso", "Roblox", "namorado"].every((s) => regras.some(({ re }) => re.test(tira(s)))) && !["armário", "apagar o fogo", "comprimento", "preparar"].some((s) => regras.some(({ re }) => re.test(tira(s)))), "o filtro de palavras pega o proibido e deixa passar armário, apagar, comprimento");

// ---- missões
const bib = MISSOES.filter((m) => m.tipo === "biblica"), cid = MISSOES.filter((m) => m.tipo === "cidadania");
ok(bib.length === 8 && cid.length === 4 && MISSOES.length === 12, `12 missões: ${bib.length} bíblicas e ${cid.length} de cidadania`);
ok(new Set(MISSOES.map((m) => m.id)).size === MISSOES.length, "ids das missões sem repetir");
const semVerso = bib.filter((m) => !m.verso || !/^baseado em [1-3]?\s?[A-ZÁ-Ú][a-zá-ú]+ \d+\.\d+(-\d+)?$/.test(m.verso.ref) || m.verso.texto.length < 20);
ok(semVerso.length === 0, `toda bíblica tem versículo em paráfrase com "baseado em Livro c.v"${semVerso.length ? ": falta em " + semVerso.map((m) => m.id).join(", ") : ""}`);
const TIPOS = new Set(["lapis", "giz", "borracha", "cola", "regua", "caderno", "clipe", "apontador", "pincel", "vovo", "ovelha", "coelho", "piquenique"]);
const ETAPAS = new Set(["falar", "pegar", "levar", "seguir", "plantar", "dirigir", "faixa"]);
for (const m of MISSOES) {
  const ids = Object.keys(m.npcs);
  const ult = m.etapas.at(-1);
  const destino = ult.ate;
  const quemEspera = destino && m.npcs[destino];
  // quem espera no fim é uma pessoa/bichinho da missão que não é carregado: fica parado no destino e reage
  const carregado = m.etapas.some((e) => (e.quem ?? e.com ?? e.passageiro) === destino && e.tipo !== "falar");
  const erros = [];
  if (!quemEspera || carregado) erros.push("ninguém esperando no destino");
  if (!m.etapas.every((e) => ETAPAS.has(e.tipo))) erros.push("etapa desconhecida");
  for (const e of m.etapas) for (const k of ["com", "ate", "quem", "passageiro"]) if (e[k] && !m.npcs[e[k]]) erros.push(`${k}=${e[k]} não existe`);
  if (!ids.every((i) => TIPOS.has(m.npcs[i].tipo))) erros.push("tipo de personagem desconhecido");
  if (!m.pedido || !m.fim || !m.titulo || !m.icone) erros.push("falta texto");
  const pontos = m.etapas.flatMap((e) => [...(e.itens ?? []), ...(e.pontos ?? [])]).concat(ids.map((i) => m.npcs[i]).filter((n) => n.tipo !== "vovo"));
  if (pontos.some((p) => Math.abs(p.x) > 236 || Math.abs(p.z) > 236)) erros.push("ponto fora da cidade");
  ok(erros.length === 0, `missão ${m.icone} ${m.id}: ${erros.length ? erros.join("; ") : `termina com ${quemEspera.nome} esperando (${ult.tipo})`}`);
}

// ---- vozes: toda fala rp-* (inclusive as das missões) tem o MP3
const faltam = Object.keys(falas.pt).filter((k) => !existsSync(`${RAIZ}assets/voz/${k}.mp3`));
ok(faltam.length === 0, `${Object.keys(falas.pt).length} falas rp-* com MP3${faltam.length ? " — faltam: " + faltam.join(", ") : ""}`);
const chavesM = MISSOES.flatMap((m) => [`rp-m-${m.id}-pedido`, `rp-m-${m.id}-fim`, ...(m.verso ? [`rp-m-${m.id}-verso`] : [])]);
ok(chavesM.every((k) => falas.pt[k]), `${chavesM.length} falas das missões no falas.json (pedido, fim e versículo)`);

console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
