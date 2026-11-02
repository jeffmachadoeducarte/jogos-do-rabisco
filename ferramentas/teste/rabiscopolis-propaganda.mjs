// Rabiscolândia: a propaganda das empresas parceiras (jogos/rabiscopolis/propaganda.js).
//  - cada parceira de src/parceiros.js tem entrada na tabela, fala no falas.json e MP3 rp-prop-<id>;
//  - o balão mostra o nome e o @ exatos de PARCEIROS e a voz certa toca;
//  - a propaganda só vem depois de acabar a fala de fim e o versículo (durações reais dos MP3);
//  - uma missão que já existia (Carro novo da J.E), jogada de ponta a ponta, termina na propaganda, sem travar o jogo.
// Uso: python3 -m http.server 8102 &  node --experimental-websocket ferramentas/teste/rabiscopolis-propaganda.mjs http://localhost:8102
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8102";
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const modulo = (arq) => import(`data:text/javascript,${encodeURIComponent(readFileSync(`${RAIZ}${arq}`, "utf8"))}`);
const { PROPAGANDA, falaDaPropaganda } = await modulo("jogos/rabiscopolis/propaganda.js");
const { PARCEIROS } = await modulo("src/parceiros.js");
const falas = JSON.parse(readFileSync(`${RAIZ}jogos/rabiscopolis/falas.json`, "utf8")).pt;
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; return Boolean(c); };
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 8 * 60 * 1000);

// ---------------------------------------------------------------- tabela e vozes (sem navegador)
ok(PARCEIROS.length === 12 && Object.keys(PROPAGANDA).length === 12, `12 parceiras e 12 entradas na tabela (${PARCEIROS.length} e ${Object.keys(PROPAGANDA).length})`);
for (const p of PARCEIROS) {
  const k = `rp-prop-${p.id}`;
  ok(PROPAGANDA[p.id] && falas[k] === falaDaPropaganda(p.id) && existsSync(`${RAIZ}assets/voz/${k}.mp3`) && /\barroba\b/.test(falas[k]), `${p.nome}: fala e MP3 ${k}`);
}
ok(!/revenda|revend|comiss|consultor/i.test(`${falas["rp-prop-see-love-joias"]} ${PROPAGANDA["see-love-joias"].texto}`), "See Love: nada de revenda, comissão ou consultora");
ok(!PROPAGANDA["crescente-contabilidade"].texto && /^No Instagram/.test(falas["rp-prop-crescente-contabilidade"]), "Crescente: só o Instagram (o agradecimento já está no fim da missão)");

// ---------------------------------------------------------------- no jogo
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
const t = await abrir("about:blank", { largura: 1280, altura: 720 });
const ev = (s) => t.ev(s);
const ate = async (expr, ms = 40000, passo = 200) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const balao = () => ev(`document.querySelector(".balao-rp").textContent`);
const ativo = () => ev(`document.querySelector(".balao-rp").classList.contains("ativo")`);
try {
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await ate("document.readyState === 'complete'");
  await ev(`localStorage.clear(); localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`);
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  ok(await ate("!!window.teste?.vivo && !!teste.mundo", 90000), "o jogo carregou");
  await espera(2000);
  // anota cada MP3 que começa a tocar (a voz é HTMLAudio; o Chrome de teste está sempre com --mute-audio)
  await ev(`window.__voz = []; { const p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__voz.push(this.src.replace(/^.*\\/voz\\//, "")); return p.call(this); }; }`);

  // ---- as 12: balão e voz
  for (const p of PARCEIROS) {
    await ev("window.__voz.length = 0");
    const mostrou = await ev(`teste.missoes.mostrarPropaganda(${JSON.stringify(p.id)})`);
    await espera(250);
    const b = await balao(), voz = await ev("window.__voz");
    const arroba = await ev(`document.querySelector(".balao-rp .prop-insta")?.textContent ?? ""`);
    ok(mostrou && arroba.includes(`@${p.instagram}`) && arroba.includes(p.nome) && b.startsWith("Rabiscolândia") && voz.includes(`rp-prop-${p.id}.mp3`), `${p.id}: balão "${arroba}" e voz ${voz.join(",")}`);
  }

  // ---- a propaganda não corta nada: atraso ≥ duração real do fim (ou do versículo)
  const dur = (k) => ev(`new Promise((r) => { const a = new Audio("/assets/voz/${k}.mp3"); a.onloadedmetadata = () => r(a.duration); a.onerror = () => r(-1); })`);
  const comParceiro = await ev("teste.missoes.MISSOES.filter((m) => m.parceiro).map((m) => ({ id: m.id, parceiro: m.parceiro, verso: !!m.verso, fimVoz: m.voz?.fim ?? `rp-m-${m.id}-fim`, ms: m.agradece?.ms ?? 0, atraso: teste.missoes.atrasoPropaganda(m) }))");
  for (const m of comParceiro) {
    const dFim = await dur(m.fimVoz), dVerso = m.verso ? await dur(`rp-m-${m.id}-verso`) : 0, precisa = (m.verso ? 5.4 + dVerso : m.ms / 1000 + dFim) * 1000;
    ok(PROPAGANDA[m.parceiro] && dFim > 0 && dVerso >= 0 && m.atraso >= precisa - 150, `${m.id} (${m.parceiro}): propaganda em ${(m.atraso / 1000).toFixed(1)} s; fim ${dFim.toFixed(1)} s${m.verso ? `, versículo ${dVerso.toFixed(1)} s a partir de 5,4 s` : ""}`);
  }

  // ---- missão que já existia, de ponta a ponta: Carro novo da J.E
  const M = await ev(`(() => { const m = teste.missoes.MISSOES.find((x) => x.id === "carroNovo"); return { parceiro: m.parceiro, etapas: m.etapas }; })()`);
  const J = PARCEIROS.find((p) => p.id === M.parceiro);
  ok(J?.id === "je-multimarcas", "Carro novo da J.E tem parceiro je-multimarcas");
  const npc = (id) => ev(`teste.missoes.npc("carroNovo", ${JSON.stringify(id)})`);
  const q = await npc("vendedor");
  await ev(`teste.ir(${q.x + 1.2}, ${q.z})`); await espera(1100);
  await ev("teste.acao()"); await espera(500);
  ok((await ev("teste.missoes.ativa")) === "carroNovo", "J.E: missão aceita");
  const vg = await ev("teste.patioJE.vagas[3]");
  await ev(`teste.ir(${vg.x + 2.2}, ${vg.z})`); await espera(800);
  await ev("teste.acao()");
  ok(await ate("teste.missoes.etapa === 1", 8000), "J.E: escolheu o carro");
  const iv = await ev("teste.veiculos.findIndex((v) => v.cor === teste.missoes.carroNovo.cor && Math.hypot(v.pos.x - teste.missoes.carroNovo.x, v.pos.z - teste.missoes.carroNovo.z) < 0.1)");
  await ev(`teste.entrar(${iv})`); await espera(400);
  const d = await npc("verde");
  await ev(`teste.posVeiculo(${iv}, ${d.x + 1}, ${d.z - 8}, 0); teste.volante(null)`);
  ok(await ate(`teste.missoes.ativa === null && teste.missoes.feitas.includes("carroNovo")`, 15000), "J.E: concluída");
  const t0 = Date.now(), fim = await balao();
  ok(/que carro lindo/i.test(fim) && !fim.includes("@"), `J.E: primeiro a fala de fim ("${fim.slice(0, 60)}"), sem o @`);
  ok(await ate(`(document.querySelector(".balao-rp .prop-insta")?.textContent ?? "").includes("@${J.instagram}")`, 20000), `J.E: depois o balão mostra @${J.instagram} (${((Date.now() - t0) / 1000).toFixed(1)} s depois do fim)`);
  const voz = await ev("window.__voz");
  ok(voz.at(-1) === "rp-prop-je-multimarcas.mp3", `J.E: a última voz é a da propaganda (${voz.at(-1)})`);
  ok(await ativo() && (await balao()).includes(J.nome), `J.E: balão com o nome: "${await balao()}"`);
  // sem bloquear o jogo: o Rabisco continua andando enquanto o balão está na tela
  await ev("teste.sair(); teste.volante(1, 0)"); const z0 = await ev("[teste.j.pos.x, teste.j.pos.z]"); await espera(700);
  const z1 = await ev("[teste.j.pos.x, teste.j.pos.z]"); await ev("teste.volante(null)");
  ok(Math.hypot(z1[0] - z0[0], z1[1] - z0[1]) > 0.5, "o jogo segue: o Rabisco anda com a propaganda na tela");

  // ---- Carina: na porta ela some enquanto a missão dela está em andamento, e volta depois
  const c0 = await ev(`teste.missoes.pessoaPorta("carina")`);
  await ev(`teste.ir(${c0.x + 2}, ${c0.z + 1.5})`); await espera(1200);
  ok((await ev(`teste.missoes.pessoaPorta("carina").visivel`)) === true, "Carina: visível na porta da Kids I, sem missão");
  await ev(`teste.missoes.aceitar("uniformesCarina")`); await espera(800);
  ok((await ev(`teste.missoes.pessoaPorta("carina").visivel`)) === false && (await npc2()), "Carina: com a missão, só o boneco da missão (sem dois bonecos no mesmo lugar)");
  await ev("teste.missoes.largar()"); await espera(800);
  ok((await ev(`teste.missoes.pessoaPorta("carina").visivel`)) === true, "Carina: largou a missão, volta a ficar na porta");
  const erros = t.erros.filter((e) => !/assets\/voz\/nomes\//.test(e));
  ok(!erros.length, `sem erro de console nem fala faltando ${erros.slice(0, 4).join(" ; ")}`);
} catch (e) { ok(false, `erro no teste: ${e.message}`); }
async function npc2() { return ev(`teste.missoes.npc("uniformesCarina", "carina").visivel`); }
await t.fechar();
clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
