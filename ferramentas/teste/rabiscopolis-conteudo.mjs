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
ok(bib.length >= 9 && cid.length >= 11 && MISSOES.length === bib.length + cid.length, `${MISSOES.length} missões: ${bib.length} bíblicas e ${cid.length} de cidadania (as da Rabiscópolis vieram junto)`);
ok(new Set(MISSOES.map((m) => m.id)).size === MISSOES.length, "ids das missões sem repetir");
const semVerso = bib.filter((m) => !m.verso || !/^baseado em [1-3]?\s?[A-ZÁ-Ú][a-zá-ú]+ \d+\.\d+(-\d+)?$/.test(m.verso.ref) || m.verso.texto.length < 20);
ok(semVerso.length === 0, `toda bíblica tem versículo em paráfrase com "baseado em Livro c.v"${semVerso.length ? ": falta em " + semVerso.map((m) => m.id).join(", ") : ""}`);
const TIPOS = new Set(["lapis", "giz", "borracha", "cola", "regua", "caderno", "clipe", "apontador", "pincel", "vovo", "ovelha", "coelho", "piquenique", "gato", "pessoa"]);
// bonecos de pessoas de verdade (pessoas.js) usados nas missões
const PESSOAS = new Set(["sabrina", "elaine", "carina", "aurelio", "camila", "riseup-dono"]);
const ETAPAS = new Set(["falar", "pegar", "levar", "seguir", "plantar", "dirigir", "faixa", "achar", "seguirVarios", "contar", "bandeiras", "levarVeiculo", "apagar", "pistas", "entregar", "voltar", "orar", "evento", "escolherCarro"]);
const vozesUsadas = new Set();
for (const m of MISSOES) {
  const ids = Object.keys(m.npcs);
  const ult = m.etapas.at(-1);
  const destino = ult.ate ?? ult.entregas?.at(-1)?.ate;
  const quemEspera = destino && m.npcs[destino];
  // quem espera no fim é uma pessoa/bichinho da missão que não é carregado: fica parado no destino e reage
  const carregado = m.etapas.some((e) => (e.quem ?? e.com ?? e.passageiro) === destino && e.tipo !== "falar");
  const erros = [];
  if (!quemEspera || carregado) erros.push("ninguém esperando no destino");
  if (!m.etapas.every((e) => ETAPAS.has(e.tipo))) erros.push("etapa desconhecida");
  for (const e of m.etapas) for (const k of ["com", "ate", "quem", "passageiro", "bichos", "de"]) for (const id of [].concat(e[k] ?? [])) if (!m.npcs[id]) erros.push(`${k}=${id} não existe`);
  for (const e of m.etapas) for (const en of e.entregas ?? []) { if (!m.npcs[en.ate]) erros.push(`entrega para ${en.ate} não existe`); if (!m.etapas.some((q) => q.itens?.some((it) => it.id === en.item))) erros.push(`item ${en.item} não é pego antes`); }
  // falas gravadas reaproveitadas (cid-*): a chave precisa existir em assets/voz
  for (const k of [m.voz?.pedido, m.voz?.fim, ...m.etapas.flatMap((e) => [e.voz, e.vozErro, e.vozCarregou, e.vozAPe, e.vozTodos, ...(e.pistas ?? []).map((q) => q.voz)])]) if (k) vozesUsadas.add(k);
  if (!ids.every((i) => TIPOS.has(m.npcs[i].tipo))) erros.push("tipo de personagem desconhecido");
  for (const i of ids) if (m.npcs[i].tipo === "pessoa" && !PESSOAS.has(m.npcs[i].pessoa)) erros.push(`pessoa desconhecida: ${m.npcs[i].pessoa}`);
  for (const i of ids) if (m.npcs[i].mesmo) { const [mid, nid] = m.npcs[i].mesmo.split(":"); if (!MISSOES.find((x) => x.id === mid)?.npcs[nid]) erros.push(`mesmo=${m.npcs[i].mesmo} não existe`); }
  if (!m.pedido || !m.fim || !m.titulo || !m.icone) erros.push("falta texto");
  const pontos = m.etapas.flatMap((e) => [...(e.itens ?? []).filter((it) => it.x != null), ...(e.pontos ?? []).map((q) => (Array.isArray(q) ? { x: q[0], z: q[1] } : q)), ...(e.pistas ?? []), ...(e.fogos ?? []).map(([x, z]) => ({ x, z }))]).concat(ids.map((i) => m.npcs[i]).filter((n) => n.tipo !== "vovo" && n.casa == null && !n.escola && !n.mesmo));
  if (pontos.some((p) => Math.abs(p.x) > 236 || Math.abs(p.z) > 236)) erros.push("ponto fora da cidade");
  ok(erros.length === 0, `missão ${m.icone} ${m.id}: ${erros.length ? erros.join("; ") : `termina com ${quemEspera.nome} esperando (${ult.tipo})`}`);
}

// ---- vozes: toda fala rp-* (inclusive as das missões) tem o MP3
const faltam = Object.keys(falas.pt).filter((k) => !existsSync(`${RAIZ}assets/voz/${k}.mp3`));
ok(faltam.length === 0, `${Object.keys(falas.pt).length} falas rp-* com MP3${faltam.length ? " — faltam: " + faltam.join(", ") : ""}`);
const semMp3 = [...vozesUsadas].filter((k) => !existsSync(`${RAIZ}assets/voz/${k}.mp3`));
ok(semMp3.length === 0, `${vozesUsadas.size} falas gravadas reaproveitadas (cid-*/rp-*) existem${semMp3.length ? " — faltam: " + semMp3.join(", ") : ""}`);
const chavesM = MISSOES.flatMap((m) => [m.voz?.pedido ? null : `rp-m-${m.id}-pedido`, m.voz?.fim ? null : `rp-m-${m.id}-fim`, ...(m.verso ? [`rp-m-${m.id}-verso`] : [])]).filter(Boolean);
ok(chavesM.every((k) => falas.pt[k]), `${chavesM.length} falas das missões no falas.json (pedido, fim e versículo)`);
// parabéns/oração com o nome da criança: fimNome tem {nome} e as duas partes gravadas (pre + nome + pos); o fim neutro não tem nome nem "Rabisco"
const comNome = MISSOES.filter((m) => m.fimNome);
ok(comNome.length >= 2 && comNome.every((m) => m.fimNome.includes("{nome}") && falas.pt[`rp-m-${m.id}-fim-pre`] && falas.pt[`rp-m-${m.id}-fim-pos`] && !/Rabisco|\{nome\}/.test(m.fim)), `${comNome.length} missões com fim no nome da criança (${comNome.map((m) => m.id).join(", ")}) e fim neutro sem nome`);
ok(!MISSOES.some((m) => /\{nome\}/.test(m.pedido)) && !MISSOES.some((m) => m.pedidoComNome), "pedido de missão (ir/fazer) nunca usa o nome da criança: é sempre \"Rabisco\"");

console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
