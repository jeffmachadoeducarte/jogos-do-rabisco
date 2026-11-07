// Rabiscolândia: níveis de qualidade (qualidade.js). Confere os 3 níveis (alta = o visual de antes), o forçar por
// ?qualidade=, a descida automática simulada (tempo de quadro lento → desce; histerese: sobe só folgado e 1× por partida;
// forçado nunca desce), o nível lembrado por aparelho e a contagem de chamadas de desenho DE VERDADE (com o passe de
// sombra) dentro do orçamento: TV/computador ≤ 250, celular ≤ 180.
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/qualidade.mjs [http://localhost:8097]
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8097";
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
let falhas = 0;
const vigia = setTimeout(() => { console.log("✗ o teste travou (o navegador caiu?)"); process.exit(2); }, 25 * 60 * 1000);
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 90000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e));
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const PONTOS = [["praça", "teste.ir(0, 33); teste.olhar(Math.PI)"], ["Bairro das Casas", "teste.ir(-96, 2); teste.olhar(Math.PI * 0.82)"], ["portão do pátio da J.E", "teste.ir(147, -82.5); teste.olhar(-Math.PI / 2)"], ["chegada à Crescente Contabilidade", "teste.ir(-150, -47); teste.olhar(-0.6)"]];
// o estado que o nível aplicou no jogo
const ESTADO = `(() => { const q = teste.qualidade, s = teste.ceu.sol; return { nivel: q.nivel, forcado: q.forcado, inicial: q.aparelho.inicial, lembrado: q.lembrado, dpr: teste.r3.getPixelRatio(), sombra: s.castShadow, mapa: s.shadow.mapSize.x, area: teste.ceu.areaSombra, alcance: teste.mundo.alcance, detalheAte: teste.mundo.detalheAte, semaforoAte: teste.mundo.semaforoAte, sombraAte: Number.isFinite(teste.mundo.sombraAte) ? teste.mundo.sombraAte : "inf", near: teste.cena.fog.near, far: teste.cena.fog.far, tem: ["sombra", "sombraLonge", "adereços", "fundoAnimado"].filter((x) => q.tem(x)), trocas: q.trocas.map((c) => c.de + ">" + c.para + ":" + c.motivo) }; })()`;
// alimenta qualidade.medir() com quadros simulados: `seg` segundos a `fps` quadros por segundo (a partir do último tempo)
const simular = (t, fps, seg) => t.ev(`(() => { const q = teste.qualidade; window.__tq = window.__tq ?? 0; const dt = 1 / ${fps}; for (let i = 0; i < ${seg} * ${fps}; i++) { window.__tq += dt; q.medir(window.__tq); } return q.nivel; })()`);

async function abrirJogo({ mobile = false, query = "", limpar = true } = {}) {
  const t = await abrir("about:blank", mobile ? { mobile: true, largura: 844, altura: 390 } : { largura: 1280, altura: 720 });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: `${limpar ? 'localStorage.removeItem("rabisco.qualidade");' : ""} ${FAMILIA}` });
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo${query}` });
  ok(await ate(t, "Boolean(window.teste?.vivo && window.teste.mundo && window.teste.qualidade)"), `carregou (${mobile ? "celular 844×390" : "TV/computador 1280×720"}${query})`);
  await espera(2500);
  return t;
}
async function orcamento(t, maxCalls, rotulo) {
  const res = [];
  for (const [nome, cmd] of PONTOS) {
    await t.ev(cmd); await espera(1200);
    const m = await t.ev("teste.medir()");
    ok(m.total.calls <= maxCalls && m.total.tris <= 350000, `orçamento real ${rotulo} na ${nome}: ${m.total.calls} chamadas com sombra (${m.semSombra.calls} sem, passe de sombra ${m.passeSombra}; ≤ ${maxCalls}), ${Math.round(m.total.tris / 1000)} mil triângulos`);
    res.push(m);
  }
  return res;
}

// ---------- TV/computador: nível automático = alta (o visual de antes)
{
  const t = await abrirJogo();
  let e = await t.ev(ESTADO);
  console.log(`  aparelho: ${JSON.stringify(await t.ev("teste.qualidade.aparelho"))}`);
  ok(e.nivel === "alta" && e.forcado === null, `nível automático na TV/computador deste aparelho: ${e.nivel} (sugerido ${e.inicial})`);
  ok(e.sombra && e.mapa === 1024 && e.area === 44 && e.sombraAte === "inf", `alta: sombra 1024 em ±44 m em todos os blocos (${e.mapa}, ±${e.area}, até ${e.sombraAte})`);
  ok(e.alcance === 140 && e.detalheAte === 36 && e.semaforoAte === null && e.near === 60 && e.far === 140, `alta: alcance 140, detalhe 36, semáforos até a neblina, neblina 60–140 (${e.alcance}, ${e.detalheAte}, ${e.semaforoAte}, ${e.near}–${e.far})`);
  ok(e.dpr > 0.9 && e.dpr <= 1.25, `alta: pixel ratio até 1,25 (${e.dpr})`);
  ok(e.tem.includes("sombra") && e.tem.includes("sombraLonge") && e.tem.includes("fundoAnimado"), `alta: tem("sombra"), tem("sombraLonge"), tem("fundoAnimado") (${e.tem.join(", ")})`);
  // contagem de verdade
  await t.ev(PONTOS[0][1]); await espera(1200);
  const m = await t.ev("teste.medir()");
  ok(m.passeSombra > 0 && m.total.calls === m.semSombra.calls + m.passeSombra, `teste.medir conta o passe de sombra: ${m.total.calls} com sombra = ${m.semSombra.calls} sem + ${m.passeSombra} da sombra`);
  ok(m.total.calls > m.total.info && m.semSombra.calls === m.semSombra.info, `o renderer.info do Three (${m.total.info}) não conta a sombra; sem sombra bate com o gl (${m.semSombra.calls} = ${m.semSombra.info})`);
  const alta = await orcamento(t, 250, "TV/computador (alta)");
  // descida automática simulada: 5 s de espera do início, depois lento por 4 s seguidos → desce um nível
  await t.ev(PONTOS[0][1]); await espera(500);
  let n = await simular(t, 60, 6); // espera do início (folgado não sobe: já está no nível de partida)
  ok(n === "alta", `6 s folgado no começo: continua alta (${n})`);
  n = await simular(t, 15, 3);
  ok(n === "alta", `3 s lento ainda não desce (${n})`);
  n = await simular(t, 15, 2);
  ok(n === "media", `lento (15 fps) por 4 s seguidos: desce para media (${n})`);
  e = await t.ev(ESTADO);
  ok(e.sombra && e.area === 30 && e.sombraAte === 24 && e.alcance === 120 && e.far === 120 && e.dpr <= 1.0, `media aplicada: sombra ±30 m só até 24 m do bloco, alcance/neblina 120, pixel ratio ≤ 1 (±${e.area}, até ${e.sombraAte}, ${e.alcance}, ${e.far}, ${e.dpr})`);
  ok(!e.tem.includes("sombraLonge") && e.tem.includes("sombra"), `media: tem("sombra") sim, tem("sombraLonge") não`);
  n = await simular(t, 15, 2);
  ok(n === "media", `logo depois da troca (3 s de espera) não desce de novo em 2 s (${n})`);
  n = await simular(t, 15, 6);
  ok(n === "baixa", `lento de novo por mais 6 s: desce para baixa (${n})`);
  e = await t.ev(ESTADO);
  ok(!e.sombra && e.alcance === 95 && e.far === 95 && e.dpr < 0.9 && !e.tem.includes("sombra"), `baixa aplicada: sem sombra, alcance/neblina 95, pixel ratio ×0,7 (${e.sombra}, ${e.alcance}, ${e.far}, ${e.dpr})`);
  const mb = await t.ev("teste.medir()");
  ok(mb.passeSombra === 0 && mb.total.calls <= alta[0].total.calls, `baixa: passe de sombra 0 e ${mb.total.calls} chamadas na praça (alta tinha ${alta[0].total.calls})`);
  ok(JSON.parse(await t.ev('localStorage.getItem("rabisco.qualidade") || "null"'))?.nivel === "baixa", "o nível que o jogo baixou fica lembrado no aparelho");
  // histerese: folgado por pouco tempo não sobe; por 30 s sobe um nível, uma vez só
  n = await simular(t, 60, 20);
  ok(n === "baixa", `folgado (60 fps) por 20 s: ainda não sobe (${n})`);
  n = await simular(t, 60, 18);
  ok(n === "media", `folgado por 30 s seguidos: sobe um nível (${n})`);
  n = await simular(t, 60, 70);
  ok(n === "media", `folgado por mais 70 s: não sobe de novo na mesma partida (${n})`);
  n = await simular(t, 15, 10);
  ok(n === "baixa", `ficou lento de novo: desce (${n})`);
  e = await t.ev(ESTADO);
  console.log(`  trocas: ${e.trocas.join(" · ")}`);
  // o jogo continua vivo e jogável depois das trocas
  await t.ev("teste.ir(10, 33); teste.olhar(Math.PI)"); await espera(600);
  const pos = await t.ev("[teste.j.pos.x, teste.j.pos.z]");
  ok(await t.ev("teste.vivo") && Math.abs(pos[0] - 10) < 1 && Math.abs(pos[1] - 33) < 1, `o jogo continua vivo e o Rabisco se move depois das trocas (${pos.map((v) => v.toFixed(1))})`);
  ok(!errosDeVerdade(t).length, `sem erro de console ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
  await t.fechar();
}
// ---------- TV/computador: nível lembrado (o jogo baixou antes) começa mais baixo; depois limpa
{
  const t = await abrir("about:blank", { largura: 1280, altura: 720 });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: `localStorage.setItem("rabisco.qualidade", JSON.stringify({ nivel: "media", quando: Date.now() })); ${FAMILIA}` });
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  ok(await ate(t, "Boolean(window.teste?.vivo && window.teste.qualidade)"), "carregou com nível lembrado");
  const e = await t.ev(ESTADO);
  ok(e.nivel === "media" && e.lembrado === "media", `começa no nível lembrado media (${e.nivel})`);
  await t.fechar();
}
// ---------- TV/computador: forçar por URL (nunca desce)
for (const [nivel, confere] of [["media", (e) => e.sombra && e.area === 30 && e.sombraAte === 24 && e.alcance === 120 && e.near === 50 && e.dpr <= 1.0], ["baixa", (e) => !e.sombra && e.alcance === 95 && e.near === 40 && e.dpr < 0.9], ["alta", (e) => e.sombra && e.area === 44 && e.alcance === 140]]) {
  const t = await abrirJogo({ query: `&qualidade=${nivel}` });
  let e = await t.ev(ESTADO);
  ok(e.nivel === nivel && e.forcado === nivel && confere(e), `?qualidade=${nivel}: nível ${e.nivel} aplicado (sombra ${e.sombra} ±${e.area} até ${e.sombraAte}, alcance ${e.alcance}, neblina ${e.near}–${e.far}, dpr ${e.dpr})`);
  const n = await simular(t, 12, 20);
  ok(n === nivel, `forçado por URL não desce mesmo lento por 20 s (${n})`);
  if (nivel === "media") { await t.ev(PONTOS[0][1]); await espera(1200); const m = await t.ev("teste.medir()"); console.log(`  media na praça: ${m.total.calls} chamadas com sombra (${m.semSombra.calls} sem, sombra ${m.passeSombra})`); }
  ok(!errosDeVerdade(t).length, `sem erro de console ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
  await t.fechar();
}
// ---------- celular: nível automático cabe no orçamento real (≤ 180 com sombra); media e baixa também, e custam menos
{
  const t = await abrirJogo({ mobile: true });
  const e = await t.ev(ESTADO);
  console.log(`  aparelho: ${JSON.stringify(await t.ev("teste.qualidade.aparelho"))}`);
  ok(["alta", "media"].includes(e.nivel) && e.forcado === null, `nível automático no celular deste aparelho: ${e.nivel}`);
  if (e.nivel === "alta") ok(e.alcance === 95 && e.detalheAte === 35 && e.semaforoAte === 55 && e.near === 40 && e.far === 95 && e.dpr <= 1.3, `alta no celular = o de antes: alcance 95, detalhe 35, semáforos 55, neblina 40–95, dpr ≤ 1,3 (${e.alcance}, ${e.detalheAte}, ${e.semaforoAte}, ${e.near}–${e.far}, ${e.dpr})`);
  const auto = await orcamento(t, 180, `celular (${e.nivel})`);
  ok(!errosDeVerdade(t).length, `sem erro de console ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
  await t.fechar();
  const c = await abrirJogo({ mobile: true, query: "&qualidade=media" });
  const em = await c.ev(ESTADO);
  ok(em.nivel === "media" && em.alcance === 85 && em.far === 85 && em.sombraAte === 24 && em.dpr <= 1.0, `media no celular: alcance/neblina 85, sombra só perto, dpr ≤ 1 (${em.alcance}, ${em.far}, ${em.sombraAte}, ${em.dpr})`);
  const media = await orcamento(c, 180, "celular (media)");
  ok(media[0].total.calls < auto[0].total.calls || e.nivel === "media", `media custa menos que o automático na praça (${media[0].total.calls} < ${auto[0].total.calls})`);
  await c.fechar();
  const b = await abrirJogo({ mobile: true, query: "&qualidade=baixa" });
  const eb = await b.ev(ESTADO);
  ok(eb.nivel === "baixa" && !eb.sombra && eb.alcance === 70 && eb.far === 70, `baixa no celular: sem sombra, alcance/neblina 70 (${eb.sombra}, ${eb.alcance}, ${eb.far})`);
  const baixa = await orcamento(b, 180, "celular (baixa)");
  ok(baixa.every((m) => m.passeSombra === 0) && baixa[0].total.calls < media[0].total.calls, `baixa: passe de sombra 0 e menos chamadas que media na praça (${baixa[0].total.calls} < ${media[0].total.calls})`);
  ok(!errosDeVerdade(b).length, `sem erro de console ${errosDeVerdade(b).slice(0, 4).join(" ; ")}`);
  await b.fechar();
}
clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
