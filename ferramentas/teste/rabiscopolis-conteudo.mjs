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
  for (const k of [m.voz?.pedido, m.voz?.fim, ...m.etapas.flatMap((e) => [e.voz, e.vozErro, e.vozCarregou, e.vozAPe, e.vozTodos, e.vozErrado, e.vozCarona, e.vozAchou, e.vozPortao, ...(e.pistas ?? []).map((q) => q.voz)])]) if (k) vozesUsadas.add(k);
  if (!ids.every((i) => TIPOS.has(m.npcs[i].tipo))) erros.push("tipo de personagem desconhecido");
  for (const i of ids) if (m.npcs[i].tipo === "pessoa" && !PESSOAS.has(m.npcs[i].pessoa)) erros.push(`pessoa desconhecida: ${m.npcs[i].pessoa}`);
  for (const i of ids) if (m.npcs[i].mesmo) { const [mid, nid] = m.npcs[i].mesmo.split(":"); if (!MISSOES.find((x) => x.id === mid)?.npcs[nid]) erros.push(`mesmo=${m.npcs[i].mesmo} não existe`); }
  if (!m.pedido || !m.fim || !m.titulo || !m.icone) erros.push("falta texto");
  const pontos = m.etapas.flatMap((e) => [...(e.itens ?? []).filter((it) => it.x != null), ...(e.pontos ?? []).map((q) => (Array.isArray(q) ? { x: q[0], z: q[1] } : q)), ...(e.pistas ?? []), ...(e.fogos ?? []).map(([x, z]) => ({ x, z }))]).concat(ids.map((i) => m.npcs[i]).filter((n) => n.tipo !== "vovo" && n.casa == null && !n.escola && !n.mesmo));
  // dentro da Avenida do Horizonte (±396); no sul, o Mar Azul vai até depois da borda (a regata passa por lá)
  if (pontos.some((p) => Math.abs(p.x) > 396 || p.z < -396 || p.z > 420)) erros.push("ponto fora da cidade");
  ok(erros.length === 0, `missão ${m.icone} ${m.id}: ${erros.length ? erros.join("; ") : `termina com ${quemEspera.nome} esperando (${ult.tipo})`}`);
}

// ---- vozes: toda fala rp-* (inclusive as das missões) tem o MP3
const faltam = Object.keys(falas.pt).filter((k) => !existsSync(`${RAIZ}assets/voz/${k}.mp3`));
ok(faltam.length === 0, `${Object.keys(falas.pt).length} falas rp-* com MP3${faltam.length ? " — faltam: " + faltam.join(", ") : ""}`);
const semMp3 = [...vozesUsadas].filter((k) => !existsSync(`${RAIZ}assets/voz/${k}.mp3`));
ok(semMp3.length === 0, `${vozesUsadas.size} falas gravadas reaproveitadas (cid-*/rp-*) existem${semMp3.length ? " — faltam: " + semMp3.join(", ") : ""}`);
const chavesM = MISSOES.flatMap((m) => [m.voz?.pedido ? null : `rp-m-${m.id}-pedido`, m.voz?.fim ? null : `rp-m-${m.id}-fim`, ...(m.verso ? [`rp-m-${m.id}-verso`] : [])]).filter(Boolean);
ok(chavesM.every((k) => falas.pt[k]), `${chavesM.length} falas das missões no falas.json (pedido, fim e versículo)`);

// ---- missões dos bairros novos e do Mar Azul (cidade 2x maior): o dobro de missões, espalhadas, e as do mar só de barco
{
  const parceirosUrl = `data:text/javascript,${encodeURIComponent(readFileSync(`${RAIZ}src/parceiros.js`, "utf8"))}`;
  const M2 = await import(`data:text/javascript,${encodeURIComponent(readFileSync(`${JOGO}mapa.js`, "utf8").replace(/from\s+["']\.\.\/\.\.\/src\/parceiros\.js["']/, `from "${parceirosUrl}"`))}`);
  const ANTES = 26; // missões que existiam antes da cidade crescer
  ok(MISSOES.length >= ANTES * 2, `${MISSOES.length} missões (eram ${ANTES}: pelo menos o dobro)`);
  const novas = MISSOES.slice(ANTES);
  // onde fica cada ponto da missão: npc (x, z) e itens/pontos/pistas
  const pontosDe = (m) => [...Object.values(m.npcs).filter((n) => n.x != null), ...m.etapas.flatMap((e) => [...(e.itens ?? []).filter((it) => it.x != null), ...(e.pistas ?? []), ...(e.pontos ?? []).map((q) => (Array.isArray(q) ? { x: q[0], z: q[1] } : q))])];
  const fora = (p) => Math.max(Math.abs(p.x), Math.abs(p.z)) > M2.BORDA_ANTIGA;
  const casaNova = (m) => Object.values(m.npcs).some((n) => n.casa > 16);
  const longe = novas.filter((m) => !casaNova(m) && !pontosDe(m).some(fora)).map((m) => m.id);
  ok(!longe.length, `as ${novas.length} missões novas acontecem nos bairros novos ou no mar ${longe.join(", ")}`);
  const regiao = (p) => (p.z > M2.ORLA.z0 - 1 ? (M2.naIlha(p.x, p.z, 2) ? "ilha" : "orla/mar") : p.x < -M2.BORDA_ANTIGA ? "Vila dos Ipês" : p.x > M2.BORDA_ANTIGA ? "Bairro das Palmeiras" : p.z < -M2.BORDA_ANTIGA ? "Jardim das Estrelas" : "miolo");
  const porRegiao = {};
  for (const m of novas) for (const r of new Set([...pontosDe(m).filter(fora).map(regiao), ...(casaNova(m) ? [Object.values(m.npcs).find((n) => n.casa > 16).casa > 24 ? "Bairro das Palmeiras" : "Vila dos Ipês"] : [])])) porRegiao[r] = (porRegiao[r] ?? 0) + 1;
  ok(["Vila dos Ipês", "Bairro das Palmeiras", "Jardim das Estrelas", "orla/mar", "ilha"].every((r) => porRegiao[r] >= 3), `missões novas por região: ${JSON.stringify(porRegiao)}`);
  // as do mar: só de jet ski ou de lancha (levarVeiculo/bandeiras com veiculos do mar, ou carona de barco), e pelo menos 3 terminam na ilha
  const DO_MAR = ["jetski", "lancha"];
  const deBarco = novas.filter((m) => m.etapas.some((e) => (Array.isArray(e.veiculos) && e.veiculos.every((v) => DO_MAR.includes(v))) || (e.tipo === "dirigir" && Object.values(m.npcs).some((n) => n.naAgua))));
  const naIlhaFim = deBarco.filter((m) => m.etapas.some((e) => e.tipo === "levarVeiculo" && m.npcs[e.ate] && M2.naIlha(m.npcs[e.ate].x, m.npcs[e.ate].z)));
  ok(deBarco.length >= 5 && naIlhaFim.length >= 3, `${deBarco.length} missões só de barco (${deBarco.map((m) => m.id).join(", ")}); ${naIlhaFim.length} levam até a ilha`);
  ok(novas.some((m) => Object.values(m.npcs).some((n) => n.naAgua) && m.etapas.some((e) => e.tipo === "dirigir")), "tem um resgate de alguém na água (carona de barco até a areia)");
  ok(novas.some((m) => m.etapas.some((e) => e.tipo === "evento" && e.evento === "roda")), "tem missão de andar na roda-gigante da ilha");
  // ninguém em cima do mar (só quem está na água de propósito) e nada de chão dentro da água
  const noMar = novas.flatMap((m) => [...Object.entries(m.npcs).filter(([, n]) => n.x != null && !n.naAgua && M2.naMar(n.x, n.z)).map(([id]) => `${m.id}:${id}`), ...m.etapas.flatMap((e) => [...(e.itens ?? []), ...(e.pistas ?? [])]).filter((p) => p.x != null && M2.naMar(p.x, p.z)).map(() => `${m.id}:item`)]);
  ok(!noMar.length, `ninguém em pé no mar e nenhum item na água ${noMar.join(", ")}`);
  ok(novas.filter((m) => Object.values(m.npcs).some((n) => n.naAgua)).every((m) => Object.values(m.npcs).filter((n) => n.naAgua).every((n) => M2.naMar(n.x, n.z))), "quem está na água está mesmo no mar");
  // tipos de missão: reaproveita os que já existiam (nenhum tipo de etapa novo)
  const usados = [...new Set(novas.flatMap((m) => m.etapas.map((e) => e.tipo)))];
  ok(usados.every((t) => ETAPAS.has(t)), `as missões novas só usam tipos de etapa que já existiam: ${usados.join(", ")}`);
  // as falas novas: quem dá ordem ou explica chama o boneco de Rabisco (o nome da criança só na oração e no parabéns)
  const textosNovos = novas.flatMap((m) => [m.pedido, ...m.etapas.flatMap((e) => [e.fala, e.falaTodos, e.carregou, e.aPe, e.errado, e.falaCarona, e.achou, ...(e.pistas ?? []).map((q) => q.texto)])]).filter(Boolean);
  ok(textosNovos.every((t) => !/\{nome\}/.test(t)) && novas.every((m) => !m.voz?.pedidoNome && !m.agradece), `nenhuma fala nova usa o nome da criança (${textosNovos.length} textos)`);
  ok(novas.filter((m) => /Rabisco/.test(m.pedido)).length >= novas.length * 0.6, "os pedidos novos chamam o boneco de Rabisco");
  // cada fala com voz própria (rp-*) das etapas novas tem o texto no falas.json e o MP3
  const vozesNovas = novas.flatMap((m) => [`rp-m-${m.id}-pedido`, `rp-m-${m.id}-fim`, ...(m.verso ? [`rp-m-${m.id}-verso`] : []), ...m.etapas.flatMap((e) => [e.voz, e.vozTodos, e.vozCarregou, e.vozAPe, e.vozErrado, e.vozCarona, e.vozAchou, ...(e.pistas ?? []).map((q) => q.voz)]).filter((k) => k?.startsWith("rp-"))]);
  const semAudio = vozesNovas.filter((k) => !falas.pt[k] || !existsSync(`${RAIZ}assets/voz/${k}.mp3`));
  ok(!semAudio.length, `${vozesNovas.length} falas das missões novas com texto e MP3${semAudio.length ? " — faltam: " + semAudio.join(", ") : ""}`);
  // fala de etapa sem voz: avisa (o balão aparece calado)
  const calados = novas.flatMap((m) => m.etapas.flatMap((e) => [["fala", "voz"], ["falaTodos", "vozTodos"], ["carregou", "vozCarregou"], ["aPe", "vozAPe"], ["errado", "vozErrado"], ["falaCarona", "vozCarona"], ["achou", "vozAchou"]].filter(([t, v]) => e[t] && !e[v]).map(([t]) => `${m.id}.${t}`)).concat(m.etapas.flatMap((e) => (e.pistas ?? []).filter((q) => q.texto && !q.voz).map(() => `${m.id}.pista`))));
  ok(!calados.length, `toda fala das etapas novas tem voz ${calados.join(", ")}`);
}

console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
