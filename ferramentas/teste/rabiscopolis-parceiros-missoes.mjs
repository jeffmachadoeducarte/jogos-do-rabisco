// Rabiscolândia: as 4 missões especiais das parceiras (Marlon Máquinas, Ballet e Cia, BT Models, Speedy Soluções).
//  - a frente da Educarte Kids II começa antiga, troca ao concluir a missão da Speedy e continua trocada depois de recarregar;
//  - largar a missão no meio da obra devolve a frente antiga;
//  - o minijogo do ballet só anda com o botão no tempo; o desfile chama cada amigo só na luz verde; fora do tempo não acontece nada;
//  - orçamento de desenho (TV ≤ 250, celular ≤ 180) perto da Kids II, na apresentação do ballet e no desfile;
//  - fotos em .claude/tmp/parceiros-missoes/.
// Uso: python3 -m http.server 8103 &  node --experimental-websocket ferramentas/teste/rabiscopolis-parceiros-missoes.mjs http://localhost:8103
//      PARTES=kids,galpao,ballet,desfile,celular para rodar só algumas (cada uma abre o jogo do zero).
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8103";
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
const FOTOS = fileURLToPath(new URL("../../.claude/tmp/parceiros-missoes/", import.meta.url));
mkdirSync(FOTOS, { recursive: true });
let falhas = 0;
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 20 * 60 * 1000);
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; return Boolean(c); };
const ate = async (t, expr, ms = 40000, passo = 120) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
async function abrirJogo(opcoes) {
  const t = await abrir("about:blank", opcoes);
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await ate(t, "document.readyState === 'complete'");
  await t.ev(`localStorage.clear(); ${FAMILIA}`);
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo", 90000), `carregou (${opcoes.mobile ? "celular" : "TV"})`);
  await espera(2000);
  return t;
}
const FRENTE = `(() => { const f = teste.mundo.lugares.find((l) => l.id === "kids2").frente; return { antiga: f.antiga.visible, perfis: f.perfis.visible, vidro: f.vidro.visible }; })()`;
const custo = (t) => t.ev("teste.medir().total");
const VISTA_KIDS2 = "teste.vista([195, 6.5, 8], [195, 4.2, -22])";
const SPEEDY = "parceiro-speedy-solucoes";

const PARTES = (process.env.PARTES ?? "kids,galpao,ballet,desfile,celular").split(",");
const SEM_FALHA = (t) => { const erros = t.erros.filter((e) => !/assets\/voz\/nomes\//.test(e)); ok(!erros.length, `sem erro de console ${erros.slice(0, 6).join(" ; ")}`); };
async function parte(nome, opcoes, f) {
  if (!PARTES.includes(nome)) return;
  console.log(`--- ${nome}`);
  const t = await abrirJogo(opcoes);
  try { await f(t, (s) => t.ev(s)); SEM_FALHA(t); } catch (e) { ok(false, `erro em ${nome}: ${e.message}`); }
  await t.fechar();
}
const TV = { largura: 1280, altura: 720 };
const INFO = "teste.missoes.etapaInfo().cena";

// ---------------------------------------------------------------- Kids II e a obra da Speedy
await parte("kids", TV, async (t, ev) => {
  await ev("teste.ir(195, -6); teste.olhar(Math.PI)"); await espera(1500);
  let f = await ev(FRENTE);
  ok(f.antiga && !f.perfis && !f.vidro, `Kids II começa com a frente antiga (${JSON.stringify(f)})`);
  const c0 = await custo(t);
  ok(c0.calls <= 250, `perto da Kids II, antes: ${c0.calls} chamadas, ${Math.round(c0.tris / 1000)} mil triângulos (≤ 250)`);
  await ev(VISTA_KIDS2); await espera(900); await t.foto(`${FOTOS}kids2-antes.png`); await ev("teste.vista(null)");
  const pedir = async () => {
    ok(await ev(`teste.missoes.aceitar(${JSON.stringify(SPEEDY)})`), "missão da Speedy aceita"); await espera(400);
    return ev(`teste.missoes.npc(${JSON.stringify(SPEEDY)}, "vidraceiro")`);
  };
  const levar = async (vid) => {
    const i = await ev("teste.veiculos.findIndex((v) => v.tipo === 'carro')");
    await ev(`teste.entrar(${i}); teste.posVeiculo(${i}, ${vid.x + 2.5}, ${vid.z + 4}, 0); teste.volante(null)`);
    ok(await ate(t, "teste.missoes.etapaInfo().carregado", 8000), "os vidros foram para o carro");
    return i;
  };
  const chegar = async (i) => {
    await ev(`teste.posVeiculo(${i}, 201, -3, 0); teste.volante(null)`);
    ok(await ate(t, "teste.missoes.etapa === 1", 8000), "chegou na Diretora Sabrina: começa a obra");
    await ev("teste.sair()"); await espera(300);
    const ci = await ev(INFO);
    await ev(`teste.ir(${ci.x + 0.6}, ${ci.z})`); await espera(800);
    return ci;
  };
  const bater = async (fase) => { await ate(t, `!${INFO}.ocupada`, 15000); await ev("teste.acao()"); ok(await ate(t, `${INFO}.fase === ${fase}`, 6000), `obra: parte ${fase}`); };
  // ---- largar no meio da obra devolve a antiga
  const vid = await pedir();
  await ev(`teste.ir(${vid.x + 1.6}, ${vid.z + 1.5}); teste.olhar(Math.PI)`); await espera(1200);
  await t.foto(`${FOTOS}speedy-vidraceiro.png`);
  let i = await levar(vid);
  await espera(500);
  await ev(`teste.vista([${vid.x + 3}, 3.2, ${vid.z - 3.5}], [${vid.x + 2.5}, 0.8, ${vid.z + 4}])`); await espera(600); await t.foto(`${FOTOS}speedy-carga-no-carro.png`); await ev("teste.vista(null)");
  await chegar(i);
  ok((await ev("teste.contexto"))?.includes("obra"), "na marca aparece o botão da obra");
  await ev("teste.acao()"); ok(await ate(t, "teste.trava != null", 4000), "o Rabisco fica na marca durante a obra");
  await espera(800); await t.foto(`${FOTOS}obra-1-andaime.png`);
  await bater(1); await espera(1000);
  f = await ev(FRENTE);
  ok(!f.antiga && !f.perfis && !f.vidro, "obra 1: saiu a frente antiga");
  await t.foto(`${FOTOS}obra-2-sem-frente.png`);
  await ev("teste.missoes.largar()"); await espera(500);
  f = await ev(FRENTE);
  ok(f.antiga && !f.vidro && (await ev("teste.trava")) == null, "largou a missão no meio: a frente antiga voltou e o Rabisco ficou solto");
  ok(!(await ev("teste.missoes.feitas")).includes(SPEEDY), "a missão não ficou como feita");
  // ---- a obra inteira
  await pedir(); i = await levar(vid); await chegar(i);
  f = await ev(FRENTE);
  ok(f.antiga && !f.vidro, "antes da obra, ainda é a frente antiga");
  await ev("teste.acao()"); await ate(t, "teste.trava != null", 4000);
  await bater(1); await bater(2); await espera(900);
  f = await ev(FRENTE);
  ok(f.perfis && !f.vidro, "obra 2: perfis de alumínio, sem vidro ainda");
  await t.foto(`${FOTOS}obra-3-perfis.png`);
  ok(!(await ev("teste.missoes.feitas")).includes(SPEEDY), "ainda não concluiu");
  await bater(3); await espera(500);
  await t.foto(`${FOTOS}obra-4-vidro.png`);
  ok(await ate(t, `teste.missoes.feitas.includes(${JSON.stringify(SPEEDY)})`, 10000), "obra 3: missão da Speedy concluída");
  await espera(500);
  f = await ev(FRENTE);
  ok(!f.antiga && f.perfis && f.vidro, `a frente trocou (${JSON.stringify(f)})`);
  ok((await ev("teste.trava")) == null, "o Rabisco ficou solto de novo");
  await ev("teste.ir(195, -6); teste.olhar(Math.PI)"); await espera(1500);
  const c1 = await custo(t);
  ok(c1.calls <= 250, `perto da Kids II, depois: ${c1.calls} chamadas, ${Math.round(c1.tris / 1000)} mil triângulos (≤ 250; antes ${c0.calls})`);
  await ev(VISTA_KIDS2); await espera(900); await t.foto(`${FOTOS}kids2-depois.png`);
  await ev("teste.vista([195, 3.4, -9], [195, 3.5, -20])"); await espera(700); await t.foto(`${FOTOS}kids2-depois-perto.png`);
  await ev("teste.hora(21)"); await espera(800); await t.foto(`${FOTOS}kids2-depois-noite.png`); await ev("teste.hora(10)");
  await ev("teste.vista(null)");
  // ---- depois de recarregar continua trocada
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  await espera(800);
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo", 90000), "recarregou");
  await espera(1500);
  f = await ev(FRENTE);
  ok(!f.antiga && f.vidro && f.perfis && (await ev(`teste.missoes.feitas.includes(${JSON.stringify(SPEEDY)})`)), `continua trocada depois de recarregar (${JSON.stringify(f)})`);
});

// ---------------------------------------------------------------- galpão do Marlon
await parte("galpao", TV, async (t, ev) => {
  const M = "parceiro-marlon-maquinas";
  const mar = await ev(`teste.missoes.npc("${M}", "marlon")`);
  ok(Math.abs(mar.x + 109.9) < 0.1, "o seu Marlon da missão é o boneco da porta (um só)");
  await ev(`teste.ir(${mar.x + 1.5}, ${mar.z - 1.2}); teste.olhar(0)`); await espera(1300);
  ok((await ev("teste.contexto"))?.includes("garrafas"), "na porta do galpão o seu Marlon tem a missão");
  await t.foto(`${FOTOS}galpao-marlon-porta.png`);
  await ev("teste.acao()"); await espera(500);
  for (const it of await ev(`teste.missoes.itensDe("${M}")`)) {
    ok(!(await ev(`teste.fis.bate(${it.x}, ${it.z}, 0.1, 0.32)`)) && (await ev(`teste.distRua(${it.x}, ${it.z}).d`)) > 0, `garrafa ${it.id} na calçada, fora do asfalto (${it.x}, ${it.z})`);
    await ev(`teste.ir(${it.x + 0.6}, ${it.z})`); await espera(500); await ev("teste.acao()"); await espera(350);
  }
  ok(await ate(t, "teste.missoes.etapa === 1", 3000), "juntou as 4 garrafas");
  const cp = await ev(INFO);
  await ev(`teste.ir(${cp.x}, ${cp.z}); teste.olhar(0)`); await espera(1000);
  ok((await ev("teste.contexto"))?.includes("máquina"), "na marca do portão aparece a máquina");
  await ev("teste.acao()"); await ate(t, "teste.trava != null", 4000); await espera(600);
  await ev("teste.acao()");
  ok(await ate(t, `${INFO}.ciclo > 0`, 6000, 40), "a garrafa foi para a esteira");
  await ev("teste.missoes.cena.fixarCiclo(1.2)"); await espera(1200); await t.foto(`${FOTOS}galpao-1-esteira.png`);
  const c = await custo(t);
  ok(c.calls <= 250, `na máquina do galpão: ${c.calls} chamadas (≤ 250)`);
  await ev("teste.missoes.cena.fixarCiclo(3.7)"); await espera(1200); await t.foto(`${FOTOS}galpao-2-separando.png`);
  await ev("teste.missoes.cena.fixarCiclo(null)");
  ok(await ate(t, `${INFO}.feitas === 1`, 20000), "garrafa 1 separada");
  for (let n = 2; n <= 4; n++) { await ev("teste.acao()"); ok(await ate(t, `${INFO}.feitas === ${n}`, 30000), `garrafa ${n} separada`); if (n === 3) { await espera(1500); await t.foto(`${FOTOS}galpao-3-caixas-enchendo.png`); } }
  ok(await ate(t, `teste.missoes.feitas.includes("${M}")`, 10000), "missão do Marlon concluída");
  ok((await ev("teste.trava")) == null, "o Rabisco ficou solto de novo");
});

// ---------------------------------------------------------------- ballet
await parte("ballet", TV, async (t, ev) => {
  await ev("teste.entrarLugar('parceiro-ballet-e-cia')"); await espera(1200);
  await t.foto(`${FOTOS}ballet-1-teatro.png`);
  const cT = await custo(t);
  ok(cT.calls <= 250, `no teatro: ${cT.calls} chamadas (≤ 250)`);
  await ev("teste.irAoInterativo('dancar')"); await espera(600);
  ok((await ev("teste.contexto"))?.includes("palco"), "na estrela aparece subir no palco");
  await ev("teste.acao()"); await ate(t, "teste.trava != null", 4000); await espera(500);
  ok((await ev("teste.contexto")) === "🩰 Passo!", "no ensaio o botão vira \"Passo!\"");
  await t.foto(`${FOTOS}ballet-2-ensaio.png`);
  // o mesmo botão no teclado (F) e no controle (X); no tempo errado não conta passo
  await ate(t, "teste.emLugar.est.ritmo.longe", 3000, 20);
  await ev("dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', key: 'f' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyF', key: 'f' }))");
  ok(await ate(t, "teste.emLugar.est.ritmo.apertos >= 1", 4000, 40), "o teclado (F) aperta o botão do passo");
  await t.botao(2);
  ok(await ate(t, "teste.emLugar.est.ritmo.apertos >= 2", 5000, 40), "o controle aperta o botão do passo");
  await ev("teste.emLugar.est.sonda = () => { if (teste.emLugar?.est.ritmo?.janela) teste.acao(); }");
  ok(await ate(t, "teste.emLugar.est.ritmo.acertos >= 1", 10000, 40), "botão no tempo conta o passo");
  await espera(450); await t.foto(`${FOTOS}ballet-3-passo.png`);
  ok(await ate(t, "teste.emLugar.est.ritmo.acertos >= 5", 20000, 40), "cinco passos no tempo");
  await espera(450); await t.foto(`${FOTOS}ballet-4-arabesque.png`);
  const cE = await custo(t);
  ok(cE.calls <= 250, `no ensaio: ${cE.calls} chamadas (≤ 250)`);
  ok(await ate(t, "teste.emLugar.est.ritmo.fase === 'fecha'", 40000), "completou os passos: a cortina fecha");
  await ate(t, "teste.emLugar.est.ritmo.t > 2.2", 6000); await t.foto(`${FOTOS}ballet-5-cortina.png`);
  ok(await ate(t, "teste.emLugar.est.ritmo.fase === 'show'", 8000), "a apresentação começou");
  for (const [n, s] of [["abrindo", 2.2], ["v", 6], ["circulo", 12], ["saltos", 17.5], ["final", 21.5]]) {
    await ate(t, `teste.emLugar.est.ritmo.t > ${s}`, 25000, 40);
    await t.foto(`${FOTOS}ballet-6-show-${n}.png`);
    const c = await custo(t);
    ok(c.calls <= 250 && c.tris <= 350000, `apresentação (${n}): ${c.calls} chamadas, ${Math.round(c.tris / 1000)} mil triângulos (≤ 250)`);
  }
  ok(await ate(t, "teste.trava === null", 60000), "fim da apresentação: o Rabisco fica solto e desce do palco");
  await espera(800); await t.foto(`${FOTOS}ballet-7-fim.png`);
  ok((await ev("teste.j.pos.y")) < 0.2, "ele está no chão de novo");
  await ev("teste.emLugar.est.sonda = null");
});

// ---------------------------------------------------------------- desfile
await parte("desfile", TV, async (t, ev) => {
  await ev("teste.entrarLugar('parceiro-bt-models')"); await espera(1200);
  await t.foto(`${FOTOS}desfile-1-salao.png`);
  await ev("teste.irAoInterativo('comecar')"); await espera(500); await ev("teste.acao()"); await espera(500);
  ok((await ev("teste.trava")) == null, "sem preparar a passarela o desfile não começa");
  for (const iid of ["tapete", "luz", "bandeiras"]) { await ev(`teste.irAoInterativo("${iid}")`); await espera(500); await ev("teste.acao()"); await espera(1300); }
  ok(await ev("Object.values(teste.emLugar.est.preparou).every(Boolean)"), "tapete, refletores e bandeirinhas prontos");
  await t.foto(`${FOTOS}desfile-2-pronto.png`);
  await ev("teste.irAoInterativo('comecar')"); await espera(600); await ev("teste.acao()"); await ate(t, "teste.trava != null", 4000); await espera(400);
  ok((await ev("teste.contexto"))?.includes("Chamar"), "na mesa o botão vira \"Chamar o amigo\"");
  await ev("teste.acao()"); await espera(300);
  ok((await ev("teste.emLugar.est.chamados")) === 0, "chamar fora da luz verde não traz ninguém");
  ok(await ate(t, "teste.emLugar.est.ritmo.luzes >= 1", 15000, 30), "as luzes do portal contam antes da chamada");
  await t.foto(`${FOTOS}desfile-3-luz-contando.png`);
  await ev("teste.emLugar.est.sonda = () => { if (teste.emLugar?.est.ritmo?.janela) teste.acao(); }");
  ok(await ate(t, "teste.emLugar.est.chamados === 1", 10000, 30), "na luz verde o primeiro amigo entra");
  await espera(2600); await t.foto(`${FOTOS}desfile-4-lapis-capa.png`);
  for (const [n, nome] of [[2, "giz-festa"], [3, "borracha-cartola"], [4, "caderno-asas"], [5, "cola-coroa"]]) {
    ok(await ate(t, `teste.emLugar.est.chamados === ${n}`, 30000, 40), `amigo ${n} chamado na luz verde`);
    await espera(3000); await t.foto(`${FOTOS}desfile-5-${nome}.png`);
    const c = await custo(t);
    ok(c.calls <= 250, `desfile com ${n} amigos: ${c.calls} chamadas (≤ 250)`);
  }
  ok(await ate(t, "teste.emLugar.est.ritmo?.fase === 'rabisco'", 25000), "por último entra o Rabisco");
  await espera(4000); await t.foto(`${FOTOS}desfile-6-rabisco.png`);
  await espera(4000); await t.foto(`${FOTOS}desfile-7-final.png`);
  const cF = await custo(t);
  ok(cF.calls <= 250 && cF.tris <= 350000, `final do desfile: ${cF.calls} chamadas, ${Math.round(cF.tris / 1000)} mil triângulos (≤ 250)`);
  ok(await ate(t, "teste.trava === null", 60000), "fim do desfile: o Rabisco fica solto");
  await ev("teste.emLugar.est.sonda = null");
});

// ---------------------------------------------------------------- celular (orçamento menor; toque no botão de verdade)
await parte("celular", { mobile: true, largura: 844, altura: 390 }, async (c, evc) => {
  await evc("teste.ir(195, -6); teste.olhar(Math.PI)"); await espera(1500);
  const k0 = await custo(c);
  ok(k0.calls <= 180, `celular, Kids II com a frente antiga: ${k0.calls} chamadas (≤ 180)`);
  await evc("teste.mundo.frenteKids2(3)"); await espera(500);
  const k1 = await custo(c);
  ok(k1.calls <= 180, `celular, Kids II com a pele de vidro: ${k1.calls} chamadas (≤ 180)`);
  await evc("teste.entrarLugar('parceiro-ballet-e-cia')"); await espera(1000);
  await evc("teste.irAoInterativo('dancar')"); await espera(600);
  await c.toque(".rp-acao"); await ate(c, "teste.trava != null", 4000);
  ok((await evc("teste.trava")) != null, "celular: o botão de toque sobe no palco");
  await espera(500); await c.foto(`${FOTOS}celular-ballet-ensaio.png`);
  // o dedo no botão ✋ de verdade chega no passo; os acertos no tempo ficam com a sonda (os quadros aqui são lentos)
  await c.toque(".rp-acao");
  ok(await ate(c, "teste.emLugar.est.ritmo.apertos >= 1", 5000, 40), "celular: o dedo no botão aperta o passo");
  await evc("teste.emLugar.est.sonda = () => { if (teste.emLugar?.est.ritmo?.janela) teste.acao(); }");
  ok(await ate(c, "teste.emLugar.est.ritmo.acertos >= 2", 20000, 60), "celular: passos no tempo");
  const k2 = await custo(c);
  ok(k2.calls <= 180, `celular, ensaio: ${k2.calls} chamadas (≤ 180)`);
  await ate(c, "teste.emLugar.est.ritmo.fase === 'show'", 50000);
  await ate(c, "teste.emLugar.est.ritmo.t > 12", 25000); await c.foto(`${FOTOS}celular-ballet-show.png`);
  const k3 = await custo(c);
  ok(k3.calls <= 180, `celular, apresentação: ${k3.calls} chamadas, ${Math.round(k3.tris / 1000)} mil triângulos (≤ 180)`);
  ok(await ate(c, "teste.trava === null", 90000), "celular: fim da apresentação");
  await evc("teste.emLugar.est.sonda = null; teste.sairLugar()"); await espera(1000);
  await evc("teste.entrarLugar('parceiro-bt-models')"); await espera(1000);
  for (const iid of ["tapete", "luz", "bandeiras"]) { await evc(`teste.irAoInterativo("${iid}")`); await espera(400); await evc("teste.acao()"); await espera(700); }
  await evc("teste.irAoInterativo('comecar')"); await espera(500); await c.toque(".rp-acao"); await ate(c, "teste.trava != null", 4000);
  await evc("teste.emLugar.est.sonda = () => { if (teste.emLugar?.est.ritmo?.janela) teste.acao(); }");
  ok(await ate(c, "teste.emLugar.est.chamados === 5", 90000), "celular: os 5 amigos chamados");
  ok(await ate(c, "teste.emLugar.est.ritmo?.fase === 'rabisco'", 30000), "celular: desfile até o Rabisco");
  await espera(7500); await c.foto(`${FOTOS}celular-desfile-final.png`);
  const k4 = await custo(c);
  ok(k4.calls <= 180, `celular, final do desfile: ${k4.calls} chamadas, ${Math.round(k4.tris / 1000)} mil triângulos (≤ 180)`);
  await evc("teste.emLugar.est.sonda = null");
});
clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
