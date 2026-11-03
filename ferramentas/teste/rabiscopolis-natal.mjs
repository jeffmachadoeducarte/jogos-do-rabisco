// Rabiscolândia: Natal na cidade (jogos/rabiscopolis/natal.js, natal-cidade.js e as 3 missões de Natal de missoes-dados.js).
//  - sem navegador: a época (1º/12 a 6/1), ?natal=1 / ?natal=0 / ?teste&hoje=, as 3 missões (versículo, vozes, tipos), as falas
//    novas com MP3, a música original (compassos certos);
//  - fora da época (sem ?natal, ?hoje=2026-11-03): nada natalino na cena, chafariz com jato, missões de sempre;
//  - com ?natal=1: árvore e luzes, presépio vazio, música na praça; as 3 missões de ponta a ponta (presépio, presentes da Gala,
//    desfile de Natal da BT Models) com a propaganda da parceira; o presépio continua montado depois de recarregar;
//  - orçamento de desenho com o Natal ligado: TV ≤ 250 e celular ≤ 180 (praça, Gala, Rua do Comércio, Bairro das Casas, BT), de
//    dia e de noite, e no desfile de Natal;
//  - fotos (praça de dia e de noite, rua com luzes, presépio montado, fachada da Gala, desfile de Natal).
// Uso: python3 -m http.server 8749 &  node --experimental-websocket ferramentas/teste/rabiscopolis-natal.mjs http://localhost:8749 [pasta das fotos]
//      PARTES=dados,fora,natal,presepio,gala,desfile,celular para rodar só algumas (cada uma abre o jogo do zero).
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8749";
const FOTOS = (process.argv[3] || fileURLToPath(new URL("../../.claude/tmp/natal/", import.meta.url))).replace(/\/?$/, "/");
mkdirSync(FOTOS, { recursive: true });
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const JOGO = `${RAIZ}jogos/rabiscopolis/`;
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
let falhas = 0;
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 40 * 60 * 1000);
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; return Boolean(c); };
const ate = async (t, expr, ms = 40000, passo = 150) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const CELULAR = { mobile: true, largura: 844, altura: 390, agente: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1" };
const TV = { largura: 1920, altura: 1080 };
const OCULTA = `(() => { const s = document.createElement("style"); s.id = "oculta"; s.textContent = ".cena-rp > *:not(canvas), .casca-topo, .casca-dica, .casca-aviso, .pausa-botao, .engrenagem-pausa { visibility: hidden !important; }"; document.head.append(s); })()`;
const MOSTRA = `document.getElementById("oculta")?.remove()`;
// foto de alguém sem o Rabisco na frente (ele fica, só não aparece)
const SEM_RB = "teste.rabisco.grupo.visible = false", COM_RB = "teste.rabisco.grupo.visible = true";
const PARTES = (process.env.PARTES ?? "dados,fora,natal,presepio,gala,desfile,celular").split(",");
const modulo = (arq) => import(`data:text/javascript,${encodeURIComponent(readFileSync(arq, "utf8"))}`);

async function abrirJogo(opcoes, extra, limpar = true) {
  const t = await abrir("about:blank", opcoes);
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await ate(t, "document.readyState === 'complete'");
  if (limpar) await t.ev(`localStorage.clear(); ${FAMILIA}`);
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo${extra}` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo", 120000), `carregou (${opcoes.mobile ? "celular" : "TV"}${extra})`);
  await espera(2500);
  return t;
}
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/nomes\/|favicon|fonts\.g/.test(e));
async function parte(nome, opcoes, extra, f) {
  if (!PARTES.includes(nome)) return;
  console.log(`--- ${nome}`);
  let t = null;
  try { t = await abrirJogo(opcoes, extra); await f(t, (s) => t.ev(s)); const er = errosDeVerdade(t); ok(!er.length, `sem erro de console ${er.slice(0, 4).join(" ; ")}`); }
  catch (e) { ok(false, `erro em ${nome}: ${e.message}`); }
  if (t) await t.fechar();
}
// pontos de medida (os mesmos de rabiscolandia-parceiros.mjs, mais o presépio e a BT Models)
const PONTOS = { "praça": [0, 33, Math.PI], "presépio de perto": [0, 29, Math.PI], "Bairro das Casas": [-96, 2, Math.PI * 0.82], "Rua do Comércio": [105, 2, 0], "rua em frente: gala": [-51, 30, Math.PI / 2], "porta: gala": [-43, 30, Math.PI / 2], "rua em frente: bt-models": [98, 139.5, 0], "porta: bt-models": [98, 147.5, 0] };
// o mesmo quadro com e sem o Natal (esconde a malha do Natal e quem pede as missões de Natal; o chafariz volta): o trânsito e os
// moradores andando mudam a conta de um momento para outro, então o que o Natal custa é a diferença no mesmo instante
const SEM_NATAL = `(() => { const N = teste.natal, Q = teste.missoes.MISSOES.filter((m) => m.natal).map((m) => teste.missoes.npc(m.id, Object.keys(m.npcs)[0]));
  const esc = []; for (const o of teste.missoes.grupo.children) { if (!o.visible) continue; const p = o.getWorldPosition(new o.position.constructor()); if (Q.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 0.6)) { o.visible = false; esc.push(o); } }
  N.grupo.visible = false; teste.mundo.anima.jatos[0].visible = teste.mundo.anima.aguas[0].visible = true;
  const r = teste.medir().total; N.grupo.visible = true; teste.mundo.anima.jatos[0].visible = teste.mundo.anima.aguas[0].visible = false; for (const o of esc) o.visible = true; return r; })()`;
async function medir(t, rotulo, teto, pontos = Object.keys(PONTOS), { comparar = false } = {}) {
  const m = {};
  for (const nome of pontos) {
    const [x, z, yaw] = PONTOS[nome];
    await t.ev(`teste.ir(${x}, ${z}); teste.olhar(${yaw})`); await espera(1100);
    const c = await t.ev("teste.medir().total"); m[nome] = c.calls;
    if (!teto) continue;
    if (!comparar) { ok(c.calls <= teto && c.tris <= 350000, `${rotulo}, ${nome}: ${c.calls} chamadas (≤ ${teto}), ${Math.round(c.tris / 1000)} mil triângulos`); continue; }
    const s0 = await t.ev(SEM_NATAL), d = c.calls - s0.calls;
    m[nome] = `${c.calls} (sem Natal ${s0.calls})`;
    // onde está apertado, o Natal não pode custar mais que 1 chamada; onde sobra espaço (≤ 85% do teto), pode
    ok(((c.calls <= teto && (d <= 1 || c.calls <= teto * 0.85)) || (s0.calls > teto && d <= 1)) && c.tris <= 350000, `${rotulo}, ${nome}: ${c.calls} chamadas com Natal, ${s0.calls} sem (o Natal custa ${d >= 0 ? "+" : ""}${d}; teto ${teto}${c.calls > teto ? ": a cidade sem Natal já passava aqui" : ""}), ${Math.round(c.tris / 1000)} mil triângulos`);
  }
  return m;
}
const balao = (t) => t.ev(`document.querySelector(".balao-rp")?.textContent ?? ""`);

// ================================================================ dados (sem navegador)
if (PARTES.includes("dados")) {
  console.log("--- dados");
  const N = await modulo(`${JOGO}natal.js`);
  const quando = (d) => N.natalAtivo("", new Date(d));
  ok(!quando("2026-11-03T12:00") && !quando("2026-11-30T23:00") && quando("2026-12-01T00:30") && quando("2026-12-25T12:00") && quando("2027-01-06T20:00") && !quando("2027-01-07T08:00") && !quando("2027-06-10T12:00"),
    "época do Natal: de 1º de dezembro a 6 de janeiro (30/11 e 7/1 ficam de fora)");
  ok(N.natalAtivo("?natal=1", new Date("2026-11-03T12:00")) && !N.natalAtivo("?natal=0", new Date("2026-12-24T12:00")), "?natal=1 liga fora da época e ?natal=0 desliga no Natal");
  ok(N.natalAtivo("?teste&hoje=2026-12-10", new Date("2026-11-03T12:00")) && !N.natalAtivo("?teste&hoje=2026-11-03", new Date("2026-12-10T12:00")) && !N.natalAtivo("?hoje=2026-12-10", new Date("2026-11-03T12:00")), "?teste&hoje=AAAA-MM-DD finge a data (só no modo de teste)");
  const { MISSOES, MISSOES_NATAL, PROIBIDAS } = await modulo(`${JOGO}missoes-dados.js`);
  const { PROPAGANDA } = await modulo(`${JOGO}propaganda.js`);
  const { PARCEIROS } = await modulo(`${RAIZ}src/parceiros.js`);
  const falas = JSON.parse(readFileSync(`${JOGO}falas.json`, "utf8")).pt;
  ok(MISSOES_NATAL.length === 3 && MISSOES_NATAL.every((m) => m.natal) && !MISSOES.some((m) => m.natal), "3 missões de Natal, à parte das de sempre (fora da época a lista não muda)");
  ok(new Set([...MISSOES, ...MISSOES_NATAL].map((m) => m.id)).size === MISSOES.length + 3, "ids das missões de Natal sem repetir");
  const TIPOS = new Set(["lapis", "giz", "borracha", "cola", "regua", "caderno", "clipe", "apontador", "pincel", "vovo", "ovelha", "coelho", "piquenique", "gato", "pessoa", "anjo"]);
  const ETAPAS = new Set(["falar", "pegar", "levar", "seguir", "plantar", "dirigir", "faixa", "achar", "seguirVarios", "contar", "bandeiras", "levarVeiculo", "apagar", "pistas", "entregar", "voltar", "orar", "evento", "escolherCarro", "cena"]);
  const tira = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const regras = PROIBIDAS.map((p) => new RegExp(`(^|[^a-z])${tira(p).replace(/ /g, "\\s+")}${p === "namor" ? "" : "(?![a-z])"}`));
  for (const m of MISSOES_NATAL) {
    const erros = [];
    if (m.tipo !== "biblica" || !/^baseado em [1-3]?\s?[A-ZÁ-Ú][a-zá-ú]+ \d+\.\d+(-\d+)?$/.test(m.verso?.ref ?? "") || (m.verso?.texto.length ?? 0) < 20) erros.push("versículo");
    if (!Object.values(m.npcs).every((n) => TIPOS.has(n.tipo))) erros.push("tipo de personagem");
    if (!m.etapas.every((e) => ETAPAS.has(e.tipo))) erros.push("etapa");
    const ult = m.etapas.at(-1), destino = ult.ate ?? ult.entregas?.at(-1)?.ate;
    if (!destino || !m.npcs[destino]) erros.push("ninguém esperando no destino");
    if (m.parceiro && (!PARCEIROS.find((p) => p.id === m.parceiro) || !PROPAGANDA[m.parceiro])) erros.push("parceira sem propaganda");
    if (!/Rabisco/.test(m.pedido) || /\{nome\}/.test(m.pedido) || !m.fimNome?.includes("{nome}") || /Rabisco|\{nome\}/.test(m.fim)) erros.push("nome da criança x Rabisco");
    const vozes = [`rp-m-${m.id}-pedido`, `rp-m-${m.id}-fim`, `rp-m-${m.id}-verso`, `rp-m-${m.id}-fim-pre`, `rp-m-${m.id}-fim-pos`, ...m.etapas.flatMap((e) => [e.voz, ...(e.falas ?? []).map((q) => q.voz)]).filter(Boolean)];
    const semVoz = vozes.filter((k) => !falas[k] || !existsSync(`${RAIZ}assets/voz/${k}.mp3`));
    if (semVoz.length) erros.push(`sem fala/MP3: ${semVoz.join(", ")}`);
    const textos = [m.titulo, m.pedido, m.fim, m.fimNome, m.verso.texto, ...m.etapas.flatMap((e) => [e.fala, e.texto, ...(e.falas ?? []).map((q) => q.texto), ...(e.itens ?? []).flatMap((it) => [it.nome, it.rotulo])]), ...Object.values(m.npcs).map((n) => n.nome)].filter(Boolean);
    const ruins = textos.filter((s) => regras.some((re) => re.test(tira(s))));
    if (ruins.length) erros.push(`palavra proibida em: ${ruins.join(" | ")}`);
    ok(!erros.length, `missão ${m.icone} ${m.titulo}: ${erros.length ? erros.join("; ") : `${m.verso.ref}, ${vozes.length} vozes com MP3`}`);
  }
  const presepio = MISSOES_NATAL.find((m) => m.id === "natalPresepio");
  ok(presepio.etapas[0].itens.map((it) => it.id).sort().join() === [...N.PECAS_PRESEPIO].sort().join() && presepio.etapas[1].falas.length === N.PECAS_PRESEPIO.length + 1, "o presépio tem as 7 peças (Maria, José, menino Jesus, pastores, ovelhas, estrela e magos) e uma fala da história por peça");
  ok(presepio.verso.ref === "baseado em Lucas 2.11", "o versículo do presépio é Lucas 2.11");
  ok(MISSOES_NATAL.find((m) => m.id === "natalPresentes").parceiro === "gala-presentes" && MISSOES_NATAL.find((m) => m.id === "natalDesfile").parceiro === "bt-models", "a Gala Presentes e a BT Models participam com uma missão de Natal cada");
  const semMp3 = Object.keys(N.FALAS_NATAL).filter((k) => falas[k] !== N.FALAS_NATAL[k] || !existsSync(`${RAIZ}assets/voz/${k}.mp3`));
  ok(!semMp3.length, `${Object.keys(N.FALAS_NATAL).length} falas novas do Natal (praça e desfile) no falas.json com MP3 ${semMp3.join(", ")}`);
  ok(N.DESFILE_NATAL.length === 5 && N.DESFILE_NATAL.every((d) => d.texto && d.fala), "desfile de Natal: 5 amigos fantasiados, cada um com fala");
  // música: compassos certos e notas dentro do laço
  const MU = await import(`data:text/javascript,${encodeURIComponent(readFileSync(`${JOGO}musica-cenas.js`, "utf8").replace(/^import .*$/m, "const sons = {};"))}`);
  for (const [nome, S] of [["NATAL_PRACA", MU.NATAL_PRACA], ["DESFILE_NATAL", MU.DESFILE_NATAL]]) {
    const ruim = S.trilhas.filter((tr) => { for (let i = 0; i < tr.notas.length; i += 3) if (tr.notas[i] < 0 || tr.notas[i] + tr.notas[i + 1] > tr.laco + 1e-6 || tr.notas[i + 2] < 20 || tr.notas[i + 2] > 9000) return true; return tr.notas.length % 3 !== 0; });
    ok(S.bpm > 60 && S.trilhas.length >= 4 && !ruim.length, `música ${nome}: ${S.trilhas.length} trilhas, ${S.bpm} bpm, notas dentro do laço`);
  }
}

// ================================================================ fora da época: nada natalino
await parte("fora", TV, "&hoje=2026-11-03", async (t, ev) => {
  ok(await ev("teste.natal === null"), "sem ?natal, em 3/11: o modo Natal fica desligado");
  ok(await ev(`(() => { let n = 0; teste.cena.traverse((o) => { if (/natal/i.test(o.name)) n++; }); return n === 0; })()`), "nada natalino na cena");
  ok(await ev("teste.mundo.anima.jatos[0].visible && teste.mundo.anima.aguas[0].visible"), "o chafariz da praça continua com o jato e a água");
  ok(!(await ev("teste.missoes.MISSOES.some((m) => m.natal)")), "as missões de Natal não aparecem");
  await medir(t, "fora da época (antes), TV", 250, ["praça", "Rua do Comércio", "rua em frente: gala"]);
  await ev(OCULTA); await ev("teste.ir(0, 33); teste.vista([9, 7.5, 44], [0, 4.5, 15])"); await espera(900); await t.foto(`${FOTOS}fora-da-epoca-praca.png`);
});

// ================================================================ Natal ligado: árvore, luzes, música, orçamento (TV)
await parte("natal", TV, "&natal=1", async (t, ev) => {
  const info = await ev("teste.natal?.info()");
  ok(info?.ligado, "?natal=1 liga o modo Natal");
  ok(info.arvore.x === 0 && info.arvore.z === 12 && info.arvore.topo > 10, `árvore grande na praça, na bacia do chafariz (topo ${info.arvore.topo.toFixed(1)} m)`);
  ok(!info.jato && (await ev("!teste.mundo.anima.aguas[0].visible")), "o jato e a água do chafariz somem (a árvore está na bacia)");
  ok(info.lampadas > 1500 && info.postes >= 60 && info.travessas >= 8 && info.parceiras === 12 && info.casas === 16 && info.predios >= 8, `luzes: ${info.lampadas} luzinhas (${info.postes} postes, ${info.travessas} cordões atravessando a rua, ${info.predios} prédios, ${info.parceiras} parceiras, ${info.casas} guirlandas nas casas)`);
  ok(info.pecas.length === 0 && !info.montado, "o presépio começa vazio (só o estábulo)");
  ok(await ev("teste.missoes.MISSOES.filter((m) => m.natal).length === 3"), "as 3 missões de Natal entram na lista");
  ok(await ev("teste.natal.malha.geometry.attributes.aFase.count > 50000 && teste.natal.malha.material.customProgramCacheKey() === 'natal-cidade'"), "tudo do Natal numa malha só, com as luzinhas piscando no shader");
  // as luzinhas piscam: o brilho de uma luz muda com o tempo (mesma conta do shader)
  ok(await ev(`(() => { const a = teste.natal.malha.geometry.attributes.aFase, f = [...Array(a.count).keys()].map((i) => a.getX(i)).find((v) => v >= 0); const b = (t) => 0.18 + 0.82 * Math.max(0, Math.min(1, (Math.sin(t * 2.2 + f) + 0.35) / 0.8)); const v = [0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4].map(b); return Math.max(...v) - Math.min(...v) > 0.5 && new Set([...Array(200).keys()].map((i) => a.getX(i * 36)).filter((x) => x >= 0).map((x) => x.toFixed(2))).size > 5; })()`), "as luzinhas piscam (cada uma com a sua fase)");
  // música da praça: perto e a pé toca; longe para
  await ev("teste.ir(0, 30)"); ok(await ate(t, "teste.natal.info().musica && teste.natal.info().volume > 0.3", 8000), "perto da árvore, a pé, toca a música de Natal");
  await ev("teste.ir(195, -6)"); ok(await ate(t, "!teste.natal.info().musica", 45000), "longe da praça a música para");
  const m = await medir(t, "Natal, TV, de dia", 250, Object.keys(PONTOS), { comparar: true });
  await ev("teste.hora(21)"); await espera(500);
  ok(await ev("teste.natal.info().brilho"), "de noite as luzes ganham brilho");
  await medir(t, "Natal, TV, de noite", 250, ["praça", "Rua do Comércio", "rua em frente: gala"]);
  console.log("   medidas TV com Natal:", JSON.stringify(m));
  // fotos
  await ev(OCULTA);
  await ev("teste.hora(10); teste.ir(0, 33)"); await espera(400);
  // [nome, câmera, alvo, hora, onde o Rabisco fica]
  for (const [nome, cam, alvo, h, rb] of [
    ["praca-arvore-dia", [9, 7.5, 44], [0, 4.5, 15], 10, [3, 34]], ["praca-arvore-noite", [9, 7.5, 44], [0, 4.5, 15], 21, [3, 34]], ["arvore-perto", [7, 3.5, 25], [0, 6, 12], 10, [9, 27]],
    ["rua-luzes-dia", [58, 3.2, 1.5], [110, 3.5, 0], 10, [66, 2]], ["rua-luzes-noite", [58, 3.2, 1.5], [110, 3.5, 0], 21, [66, 2]], ["avenida-luzes-noite", [-40, 4, 47], [20, 4, 50], 21, [-30, 47]],
    ["fachada-gala", [-62, 6, 30], [-41, 3, 30], 10, [-55, 34]], ["fachada-gala-noite", [-62, 6, 30], [-41, 3, 30], 21, [-55, 34]], ["fachada-bt-models", [98, 5, 134], [98, 4, 151], 10, [92, 140]],
  ]) {
    await ev(`teste.hora(${h}); teste.ir(${rb[0]}, ${rb[1]}); teste.vista(${JSON.stringify(cam)}, ${JSON.stringify(alvo)})`); await espera(1200);
    await t.foto(`${FOTOS}${nome}.png`);
  }
  await ev("teste.vista(null); teste.hora(10)"); await ev(MOSTRA);
});

// ================================================================ missão do presépio, de ponta a ponta
await parte("presepio", TV, "&natal=1", async (t, ev) => {
  const M = "natalPresepio";
  const anjo = await ev(`teste.missoes.npc("${M}", "anjo")`);
  ok(Math.hypot(anjo.x - 0, anjo.z - 21.6) < 8, `o anjinho do presépio espera ao lado do estábulo (${anjo.x}, ${anjo.z})`);
  await ev(`teste.ir(${anjo.x + 1.4}, ${anjo.z + 0.8}); teste.olhar(Math.PI)`); await espera(900);
  ok((await ev("teste.contexto"))?.includes("presépio"), `perto do anjinho aparece a missão (${await ev("teste.contexto")})`);
  await ev(OCULTA); await ev(SEM_RB); await ev(`teste.vista([${anjo.x + 2.5}, 2.4, ${anjo.z + 5}], [${anjo.x}, 1.2, ${anjo.z}])`); await espera(800); await t.foto(`${FOTOS}anjinho-do-presepio.png`); await ev("teste.vista(null)"); await ev(MOSTRA); await ev(COM_RB);
  await ev("teste.acao()"); ok(await ate(t, `teste.missoes.ativa === "${M}"`, 4000), "missão do presépio aceita");
  for (const it of await ev(`teste.missoes.itensDe("${M}")`)) {
    ok(!(await ev(`teste.fis.bate(${it.x}, ${it.z}, 0.1, 0.32)`)) && (await ev(`teste.distRua(${it.x}, ${it.z}).d`)) > 0, `peça "${it.id}" num lugar livre, fora do asfalto (${it.x}, ${it.z})`);
    await ev(`teste.ir(${it.x + 0.6}, ${it.z})`); await espera(450); await ev("teste.acao()"); await espera(350);
  }
  ok(await ate(t, "teste.missoes.etapa === 1", 4000), "juntou as 7 peças do presépio");
  ok((await ev("teste.missoes.levando")).length === 7, "as 7 peças vão na cabeça do Rabisco");
  const ci = await ev("teste.missoes.etapaInfo().cena");
  await ev(`teste.ir(${ci.x}, ${ci.z}); teste.olhar(Math.PI)`); await espera(800);
  ok((await ev("teste.contexto"))?.includes("presépio"), "na marca dourada aparece \"Montar o presépio\"");
  await ev("teste.acao()"); ok(await ate(t, "teste.trava != null", 4000), "o Rabisco fica na marca, de frente para o estábulo");
  for (let k = 1; k <= 7; k++) {
    await ate(t, "!teste.missoes.etapaInfo().cena?.ocupada", 30000);
    await ev("teste.acao()");
    ok(await ate(t, `teste.natal.info().pecas.length === ${k}`, 5000), `peça ${k} no presépio: ${(await ev("teste.natal.info().pecas")).at(-1)} (a anfitriã conta a história)`);
    if (k === 3) { await espera(900); await ev(OCULTA); await t.foto(`${FOTOS}presepio-montando.png`); await ev(MOSTRA); }
  }
  ok(await ate(t, `teste.missoes.feitas.includes("${M}")`, 30000), "missão do presépio concluída");
  ok((await ev("teste.trava")) == null, "o Rabisco ficou solto de novo");
  ok(await ate(t, `document.querySelector(".balao-rp")?.textContent.includes("Lucas 2.11")`, 40000), `no fim, o versículo: "${(await balao(t)).slice(0, 90)}"`);
  ok((await ev("teste.natal.info().montado")), "o presépio está montado");
  await ev(OCULTA);
  await ev("teste.ir(0, 31)"); await ev("teste.vista([4.2, 4, 33.5], [0, 2, 21])"); await espera(1200); await t.foto(`${FOTOS}presepio-montado.png`);
  await ev("teste.vista([1.5, 2.3, 27], [-0.2, 1.1, 22])"); await espera(900); await t.foto(`${FOTOS}presepio-perto.png`);
  await ev("teste.hora(21); teste.vista([4.2, 4, 33.5], [0, 2, 21])"); await espera(1200); await t.foto(`${FOTOS}presepio-montado-noite.png`);
  await ev("teste.hora(10); teste.vista(null)"); await ev(MOSTRA);
  const c = await ev("teste.medir().total");
  ok(c.calls <= 250, `TV, presépio montado: ${c.calls} chamadas (≤ 250)`);
  // recarrega: continua montado (missão feita fica no aparelho)
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo&natal=1` });
  await espera(800);
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo", 120000), "recarregou");
  await espera(1500);
  ok(await ev("teste.natal.info().montado"), "depois de recarregar, o presépio continua montado");
});

// ================================================================ presentes de Natal da Gala Presentes
await parte("gala", TV, "&natal=1", async (t, ev) => {
  const M = "natalPresentes";
  const q = await ev(`teste.missoes.npc("${M}", "clipe")`);
  await ev(`teste.ir(${q.x - 1.4}, ${q.z + 0.6}); teste.olhar(Math.PI / 2)`); await espera(900);
  ok((await ev("teste.contexto"))?.includes("Presentes de Natal"), `na porta da Gala aparece a missão (${await ev("teste.contexto")})`);
  await ev(OCULTA); await ev(SEM_RB); await ev(`teste.vista([${q.x - 6}, 2.6, ${q.z + 3}], [${q.x}, 1.4, ${q.z}])`); await espera(800); await t.foto(`${FOTOS}gala-clipe-natal.png`); await ev("teste.vista(null)"); await ev(MOSTRA); await ev(COM_RB);
  await ev("teste.acao()"); ok(await ate(t, `teste.missoes.ativa === "${M}"`, 4000), "missão da Gala aceita");
  await espera(400);
  ok((await balao(t)).startsWith("Rabiscolândia"), "quem fala o pedido é a anfitriã (parceira não fala)");
  for (const it of await ev(`teste.missoes.itensDe("${M}")`)) {
    ok(!(await ev(`teste.fis.bate(${it.x}, ${it.z}, 0.1, 0.32)`)) && (await ev(`teste.distRua(${it.x}, ${it.z}).d`)) > 0, `presente "${it.id}" na calçada da Gala (${it.x}, ${it.z})`);
    await ev(`teste.ir(${it.x + 0.6}, ${it.z})`); await espera(450);
    ok((await ev("teste.contexto"))?.includes("Embrulhar"), `o botão diz "${await ev("teste.contexto")}"`);
    await ev("teste.acao()"); await espera(350);
  }
  ok(await ate(t, "teste.missoes.etapa === 1", 4000), "os 3 presentes embrulhados");
  await ev("window.__voz = []; { const p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__voz.push(this.src.replace(/^.*\\/voz\\//, '')); return p.call(this); }; }");
  for (const k of ["k1", "k2", "k3"]) {
    const n = await ev(`teste.missoes.npc("${M}", "${k}")`);
    ok(!(await ev(`teste.fis.bate(${n.x}, ${n.z}, 0.1, 0.2)`)), `criança ${k} num lugar livre (${n.x.toFixed(1)}, ${n.z.toFixed(1)})`);
    await ev(`teste.ir(${n.x + 1.2}, ${n.z + 1.2})`); await espera(700);
    const r = await ev("teste.contexto");
    ok(r?.startsWith("🎁 Entregar"), `perto da criança: "${r}"`);
    if (k === "k1") { await ev(OCULTA); await ev(SEM_RB); await ev(`teste.vista([${n.x + 3}, 2.2, ${n.z + 3}], [${n.x}, 0.9, ${n.z}])`); await espera(700); await t.foto(`${FOTOS}gala-presente-entregue.png`); await ev("teste.vista(null)"); await ev(MOSTRA); await ev(COM_RB); }
    await ev("teste.acao()"); await espera(600);
  }
  ok(await ate(t, `teste.missoes.feitas.includes("${M}")`, 8000), "os 3 presentes entregues: missão da Gala concluída");
  ok(await ate(t, `document.querySelector(".balao-rp .prop-insta")?.textContent.includes("@gala.presentes")`, 70000, 300), `a anfitriã faz a propaganda: "${await ev(`document.querySelector(".balao-rp .prop-insta")?.textContent ?? ""`)}"`);
  ok((await ev("window.__voz")).includes("rp-prop-gala-presentes.mp3"), "com a voz da propaganda da Gala");
  ok(await ev("teste.missoes.feitas.includes('natalPresentes') && teste.salvo.missoesFeitas.includes('natalPresentes')"), "fica guardada no Passaporte");
});

// ================================================================ desfile de Natal da BT Models
await parte("desfile", TV, "&natal=1", async (t, ev) => {
  const M = "natalDesfile";
  const q = await ev(`teste.missoes.npc("${M}", "produtora")`);
  ok(!(await ev(`teste.fis.bate(${q.x}, ${q.z}, 0.1, 0.2)`)), `a produtora espera na porta da BT Models (${q.x.toFixed(1)}, ${q.z.toFixed(1)})`);
  await ev(`teste.ir(${q.x}, ${q.z - 1.6}); teste.olhar(0)`); await espera(900);
  ok((await ev("teste.contexto"))?.includes("Desfile de Natal"), `perto dela aparece a missão (${await ev("teste.contexto")})`);
  await ev("teste.acao()"); ok(await ate(t, `teste.missoes.ativa === "${M}"`, 4000), "missão do desfile de Natal aceita");
  await ev("teste.entrarLugar('parceiro-bt-models')"); await espera(1400);
  ok((await balao(t)).includes("desfile de Natal"), `ao entrar, a anfitriã fala do desfile de Natal: "${(await balao(t)).slice(0, 70)}"`);
  for (const iid of ["tapete", "luz", "bandeiras"]) { await ev(`teste.irAoInterativo("${iid}")`); await espera(500); await ev("teste.acao()"); await espera(1300); }
  await ev("teste.irAoInterativo('comecar')"); await espera(600); await ev("teste.acao()"); await ate(t, "teste.trava != null", 4000); await espera(400);
  ok(await ev("teste.emLugar.est.natal === true"), "o desfile é o de Natal (fantasias de Natal e marchinha de Natal)");
  await ev("teste.emLugar.est.sonda = () => { if (teste.emLugar?.est.ritmo?.janela) teste.acao(); }");
  await ev(OCULTA);
  for (const [n, nome] of [[1, "gorro"], [2, "estrela"], [3, "pastorzinho"], [4, "arvore"], [5, "anjinho"]]) {
    ok(await ate(t, `teste.emLugar.est.chamados === ${n}`, 40000, 40), `amigo ${n} (${nome}) chamado na luz verde`);
    await espera(2900); await t.foto(`${FOTOS}desfile-natal-${n}-${nome}.png`);
    const c = await ev("teste.medir().total");
    ok(c.calls <= 250, `desfile de Natal com ${n} amigos: ${c.calls} chamadas (≤ 250)`);
  }
  ok(await ate(t, "teste.emLugar.est.ritmo?.fase === 'rabisco'", 25000), "por último entra o Rabisco");
  ok(await ate(t, `document.querySelector(".balao-rp")?.textContent.includes("celebrando o nascimento de Jesus")`, 40000, 150), "no fim do desfile, a fala de Natal");
  await espera(600); await t.foto(`${FOTOS}desfile-natal-final.png`);
  await ev(MOSTRA);
  ok(await ate(t, "teste.trava === null", 60000), "fim do desfile: o Rabisco fica solto");
  await ev("teste.emLugar.est.sonda = null");
  ok(await ate(t, "teste.missoes.etapa === 1", 4000), "o desfile conta para a missão");
  await ev("teste.sairLugar()"); await espera(1200);
  await ev(`teste.ir(${q.x}, ${q.z - 1.6})`); await espera(700);
  ok((await ev("teste.contexto"))?.includes("Contar"), "lá fora, contar para a produtora");
  await ev("teste.acao()");
  ok(await ate(t, `teste.missoes.feitas.includes("${M}")`, 6000), "missão do desfile de Natal concluída");
  ok(await ate(t, `document.querySelector(".balao-rp .prop-insta")?.textContent.includes("@btmodels.agency")`, 70000, 300), `a anfitriã faz a propaganda da BT Models: "${await ev(`document.querySelector(".balao-rp .prop-insta")?.textContent ?? ""`)}"`);
});

// ================================================================ celular: orçamento menor
await parte("celular", CELULAR, "&natal=1", async (c, ev) => {
  const m = await medir(c, "Natal, celular, de dia", 180, Object.keys(PONTOS), { comparar: true });
  await ev("teste.hora(21)"); await espera(500);
  const mn = await medir(c, "Natal, celular, de noite", 180, ["praça", "presépio de perto", "rua em frente: gala", "Rua do Comércio"], { comparar: true });
  await ev("teste.hora(10); teste.natal.presepio.mostrarTudo()"); await espera(800);
  await medir(c, "Natal, celular, presépio montado", 180, ["praça", "presépio de perto"], { comparar: true });
  console.log("   medidas celular de noite:", JSON.stringify(mn));
  console.log("   medidas celular com Natal:", JSON.stringify(m));
  await ev(OCULTA); await ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(1000); await c.foto(`${FOTOS}celular-praca.png`); await ev(MOSTRA);
  // o desfile de Natal no celular
  await ev("teste.missoes.aceitar('natalDesfile'); teste.entrarLugar('parceiro-bt-models')"); await espera(1200);
  for (const iid of ["tapete", "luz", "bandeiras"]) { await ev(`teste.irAoInterativo("${iid}")`); await espera(400); await ev("teste.acao()"); await espera(700); }
  await ev("teste.irAoInterativo('comecar')"); await espera(500); await c.toque(".rp-acao"); await ate(c, "teste.trava != null", 4000);
  await ev("teste.emLugar.est.sonda = () => { if (teste.emLugar?.est.ritmo?.janela) teste.acao(); }");
  ok(await ate(c, "teste.emLugar.est.chamados === 5", 120000), "celular: os 5 amigos de Natal chamados");
  ok(await ate(c, "teste.emLugar.est.ritmo?.fase === 'rabisco'", 30000), "celular: desfile até o Rabisco");
  await espera(7000);
  const k = await ev("teste.medir().total");
  ok(k.calls <= 180, `celular, final do desfile de Natal: ${k.calls} chamadas, ${Math.round(k.tris / 1000)} mil triângulos (≤ 180)`);
  await ev("teste.emLugar.est.sonda = null");
});

clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
