// Rabiscolândia: o Sítio Floresça (Escola de Campo Educarte, da Tia Regina), do portão à propaganda.
//  - o portão começa fechado (a colisão segura o Rabisco do lado de fora) e a Tia Regina fica na varanda da casa;
//  - o Rabisco toca a CAMPAINHA: a anfitriã avisa, a Tia Regina vem andando e abre o portão (a colisão sai);
//  - missão "A pata Ale fugiu": a Ale foge pelo gramado (a Tia Regina corre atrás dela), o Rabisco pega a Ale e solta no
//    lago cercado, pelo portãozinho; ela sai nadando. Sem propaganda aqui (fica para o fim da segunda);
//  - o Duck vai para o lago sozinho (arteiro); missão "Duck no lago": o Rabisco pega o Duck no portãozinho, ele sai e se
//    sacode, vem atrás do Rabisco e é entregue à Tia Regina; depois do versículo, a propaganda do @florescaondestiver;
//  - depois do Duck, as quatro missões novas, em fila: "Hora de dar comida" (balde de milho → galinhas → patos), "Cuidar da
//    hortinha" (regador → três canteiros → colher → Tia Regina), "Roçar a grama" (o roçador não sai do sítio; seis trechos
//    de grama alta) e "Dia no sítio com a Kids II" (ônibus na escola → frente do sítio → frutas e balanço de pneu → de volta
//    para a Diretora Sabrina), com a propaganda só no fim da última; figurinhas e versículos de cada uma;
//  - o layout: tudo à esquerda em fila (casa → salão → hortinha → galinheiro → lago quadrado), frutíferas à direita, sem celeiro;
//  - a Tia Regina não fala (o balão é sempre da anfitriã), é mais baixa que o Rabisco; figurinhas no álbum;
//  - chamadas de desenho: TV ≤ 250 e celular ≤ 180 perto do sítio; o carro nunca fica preso e a rua continua livre;
//  - fotos em <pasta> (padrão .claude/tmp/sitio/).
// Uso: python3 -m http.server 8131 &  node --experimental-websocket ferramentas/teste/rabiscopolis-sitio.mjs http://localhost:8131 [pasta]
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8131";
const PASTA = process.argv[3] || fileURLToPath(new URL("../../.claude/tmp/sitio/", import.meta.url));
const OUT = PASTA.endsWith("/") ? PASTA : `${PASTA}/`;
mkdirSync(OUT, { recursive: true });
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
const A = "parceiro-sitio-floresca", B = "parceiro-sitio-floresca-duck";
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; return Boolean(c); };
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 22 * 60 * 1000);
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const OCULTA = `(() => { const s = document.createElement("style"); s.id = "oculta"; s.textContent = ".cena-rp > *:not(canvas):not(.balao-rp), canvas.minimapa-rp, .casca-redondo, .pausa-botao, .engrenagem-pausa, [class*='radio'], .casca-topo, .casca-dica, .casca-aviso { display: none !important; }"; document.head.append(s); })()`;
const VOZ = `window.__voz = []; { const p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__voz.push(this.src.replace(/^.*\\/voz\\//, "")); return p.call(this); }; }`;
async function abrirJogo(op) {
  const t = await abrir("about:blank", op);
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await ate(t, "document.readyState === 'complete'");
  await t.ev(`localStorage.clear(); ${FAMILIA}`);
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo?.sitio", 90000), `carregou (${op.mobile ? "celular" : "TV"})`);
  await espera(2000);
  await t.ev(VOZ); await t.ev("teste.hora(11)");
  return t;
}
const ate = async (t, expr, ms = 40000, passo = 150) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const S = "teste.mundo.sitio";
const custo = async (t) => (await t.ev("teste.medir()")).total;
const semErro = (t) => { const e = t.erros.filter((x) => !/assets\/voz\/nomes\//.test(x)); ok(!e.length, `sem erro de console ${e.slice(0, 5).join(" ; ")}`); };

// ---------------------------------------------------------------- TV: o caminho inteiro
const t = await abrirJogo({ largura: 1280, altura: 720 });
const ev = (s) => t.ev(s);
const foto = async (nome) => { await ev(OCULTA); await espera(150); await t.foto(`${OUT}${nome}.png`); await ev(`document.getElementById("oculta")?.remove()`); };
try {
  const lugar = await ev(`(() => { const l = teste.mundo.lugares.find((q) => q.id === "parceiro-sitio-floresca"); return { x: l.x, z: l.z, topo: l.topo, bairro: l.bairro, pessoa: l.pessoaNaPorta?.m.grupo.userData.id }; })()`);
  ok(lugar.pessoa === "regina" && lugar.x < -300 && lugar.z > 50, `o sítio fica no canto sudoeste, em (${lugar.x}, ${lugar.z}), ${lugar.bairro}; a Tia Regina é o boneco do lugar`);
  const P = await ev(`${S}.pontos()`), cb = await ev(`${S}.campainhaMundo()`);
  let info = await ev(`${S}.info()`);
  ok(!info.aberto && info.regina === "casa", `portão fechado e a Tia Regina na casa (${JSON.stringify(info)})`);
  // o portão segura do lado de fora
  ok(await ev(`teste.dentroDeSolido(-352, 60.4)`), "o portão fechado é uma parede (colisão)");
  // ---- custo e fotos do portão, com a campainha
  await ev(`teste.ir(${cb.x + 1.5}, ${cb.z - 5}); teste.olhar(0)`); await espera(2200);
  const c0 = await custo(t); ok(c0.calls <= 250, `TV, na frente do portão: ${c0.calls} chamadas, ${Math.round(c0.tris / 1000)} mil triângulos (≤ 250)`);
  await foto("01-portao");
  await ev(`teste.vista([${cb.x - 2.2}, 1.9, ${cb.z - 3.2}], [${cb.x + 0.3}, 1.2, ${cb.z + 0.4}])`); await espera(800); await foto("02-campainha"); await ev("teste.vista(null)");
  // ---- a campainha
  await ev(`teste.ir(${cb.x}, ${cb.z - 0.6}); teste.olhar(0)`); await espera(700);
  ok((await ev("teste.contexto"))?.includes("Tocar a campainha"), `na campainha aparece o botão (${await ev("teste.contexto")})`);
  await ev("teste.acao()"); await espera(500);
  ok((await ev("window.__voz")).includes("rp-sitio-campainha.mp3"), "a anfitriã fala o ding-dong da campainha");
  ok(await ate(t, `${S}.info().regina === "vindo"`, 3000), "a Tia Regina sai da casa e vem para o portão");
  await espera(3500);
  await ev(`teste.vista([${cb.x + 4}, 4, ${cb.z - 7}], [-352, 0.8, 66])`); await espera(400); await foto("03-regina-vindo"); await ev("teste.vista(null)");
  ok(await ate(t, `${S}.aberto`, 60000), "a Tia Regina abre o portão");
  ok(!(await ev(`teste.dentroDeSolido(-352, 60.4)`)), "portão aberto: dá para entrar");
  ok(await ate(t, `window.__voz.includes("rp-sitio-entrou.mp3")`, 3000), "a anfitriã dá as boas-vindas");
  ok(!(await ev(`document.querySelector(".balao-rp")?.textContent ?? ""`)).startsWith("Tia Regina"), "a Tia Regina não fala (o balão é da anfitriã)");
  await espera(2500);
  await ev(`teste.vista([-350, 2.6, 56], [-353, 1.2, 66])`); await espera(500); await foto("04-portao-aberto"); await ev("teste.vista(null)");
  // ---- a Tia Regina ao lado do Rabisco (ela é mais baixa)
  const r0 = await ev(`${S}.reginaMundo()`);
  await ev(`teste.ir(${r0.x + 1.1}, ${r0.z - 0.2}); teste.olhar(Math.PI)`); await espera(1200);
  const alt = await ev(`({ regina: teste.mundo.lugares.find((q) => q.id === "parceiro-sitio-floresca").pessoaNaPorta.m.altura, rabisco: 1.8 })`);
  ok(alt.regina < alt.rabisco, `a Tia Regina (${alt.regina.toFixed(2)} m) é mais baixa que o Rabisco (~${alt.rabisco} m)`);
  await ev(`teste.vista([${r0.x + 0.5}, 1.5, ${r0.z + 4.2}], [${r0.x + 0.55}, 1.0, ${r0.z - 0.1}])`); await espera(800); await foto("05-regina-e-rabisco"); await ev("teste.vista(null)");
  // ---- missão A: a pata Ale
  await ev(`teste.ir(${r0.x + 1.4}, ${r0.z + 0.6})`); await espera(900);
  ok((await ev("teste.contexto"))?.includes("A pata Ale fugiu"), `com a Tia Regina aparece a missão (${await ev("teste.contexto")})`);
  await ev("teste.acao()"); await espera(600);
  ok((await ev("teste.missoes.ativa")) === A, "missão da Ale aceita");
  ok((await ev("window.__voz")).includes(`rp-m-${A}-pedido.mp3`), "a anfitriã fala o pedido");
  ok(await ate(t, `${S}.ale === "fugida"`, 3000), "a Ale foge pelo gramado");
  const custoA = await custo(t); ok(custoA.calls <= 250, `TV, no gramado com a Ale: ${custoA.calls} chamadas (≤ 250)`);
  // a Tia Regina corre atrás da Ale
  await ev(`teste.ir(${r0.x + 3}, ${r0.z - 3})`); await espera(4000);
  let al = await ev(`${S}.aleMundo()`), rg = await ev(`${S}.reginaMundo()`);
  ok(Math.hypot(al.x - rg.x, al.z - rg.z) < 14 && Math.hypot(rg.x - r0.x, rg.z - r0.z) > 2, `a Tia Regina sai do portão e corre atrás da Ale (${Math.round(Math.hypot(al.x - rg.x, al.z - rg.z))} m dela)`);
  await ev(`teste.vista([${al.x + 6}, 3.2, ${al.z - 5}], [${al.x}, 0.6, ${al.z}])`); await espera(500); await foto("06-ale-fugindo"); await ev("teste.vista(null)");
  // pegar a Ale: chega pertinho dela
  let pegou = false;
  for (let i = 0; i < 40 && !pegou; i++) {
    al = await ev(`${S}.aleMundo()`);
    await ev(`teste.ir(${al.x + 0.9}, ${al.z + 0.4})`); await espera(160);
    if ((await ev("teste.contexto"))?.includes("Pegar a Ale")) { await ev("teste.acao()"); await espera(300); pegou = (await ev(`${S}.ale`)) === "colo"; }
  }
  ok(pegou, "o Rabisco pegou a Ale (vai no colo)");
  ok(await ate(t, `window.__voz.includes("rp-m-${A}-pegou.mp3")`, 3000), "a anfitriã avisa: agora leve até o lago");
  const mk = await ev(`${S}.marcaLagoMundo()`);
  const alvo = await ev("teste.missoes.alvo()");
  ok(alvo && Math.hypot(alvo.x - mk.x, alvo.z - mk.z) < 0.5, "a seta aponta para o portãozinho do lago");
  await ev(`teste.ir(${mk.x}, ${mk.z - 0.3}); teste.olhar(0)`); await espera(1000);
  await foto("07-ale-no-colo");
  ok((await ev("teste.contexto"))?.includes("Soltar a Ale"), `no portãozinho: ${await ev("teste.contexto")}`);
  await ev("teste.acao()");
  ok(await ate(t, `teste.missoes.feitas.includes("${A}")`, 20000), "missão da Ale concluída");
  ok((await ev(`${S}.ale`)) === "lago", "a Ale está dentro do lago cercado");
  const aleLago = await ev(`${S}.aleMundo()`), lg = await ev(`${S}.pontos().lago`);
  ok(Math.hypot(aleLago.x - lg[0], aleLago.z - lg[1]) < 8.5, `a Ale nada dentro do lago (${Math.round(Math.hypot(aleLago.x - lg[0], aleLago.z - lg[1]) * 10) / 10} m do centro)`);
  await espera(1500);
  await ev(`teste.vista([${lg[0] + 9}, 5, ${lg[1] - 12}], [${lg[0]}, 0, ${lg[1]}])`); await espera(700); await foto("08-ale-no-lago"); await ev("teste.vista(null)");
  ok(await ate(t, `window.__voz.includes("rp-m-${A}-verso.mp3")`, 40000), "o versículo da missão (Gênesis 1.31)");
  await espera(5000);
  ok(!(await ev("window.__voz")).includes("rp-prop-sitio-floresca.mp3"), "sem propaganda no fim da primeira missão");
  // ---- o Duck pula no lago sozinho; a Tia Regina vai para o meio da estradinha
  ok(await ate(t, `${S}.duck === "lago"`, 30000), "o Duck (arteiro) foi para o lago");
  ok(await ate(t, `${S}.duckMundo().molhado`, 2000), "dentro do lago, o Duck fica molhado (só a cabeça e o peito para fora)");
  await ev(`teste.vista([${lg[0] + 7}, 3.5, ${lg[1] - 10}], [${lg[0]}, 0, ${lg[1]}])`); await espera(700); await foto("09-duck-no-lago"); await ev("teste.vista(null)");
  ok(await ate(t, `(() => { const r = ${S}.reginaMundo(), [x, z] = ${S}.paraMundo(-9, -40); return Math.hypot(r.x - x, r.z - z) < 0.6; })()`, 40000), "a Tia Regina espera no gramado, na frente do salão");
  // ---- missão B: Duck no lago
  rg = await ev(`${S}.reginaMundo()`);
  await ev(`teste.ir(${rg.x + 1.2}, ${rg.z + 0.6})`); await espera(900);
  ok((await ev("teste.contexto"))?.includes("Duck no lago"), `agora a Tia Regina tem a missão do Duck (${await ev("teste.contexto")})`);
  await ev("teste.acao()"); await espera(600);
  ok((await ev("teste.missoes.ativa")) === B, "missão do Duck aceita");
  ok((await ev("window.__voz")).includes(`rp-m-${B}-pedido.mp3`), "a anfitriã fala o pedido do Duck");
  await ev(`teste.ir(${mk.x}, ${mk.z - 0.3}); teste.olhar(0)`); await espera(900);
  ok((await ev("teste.contexto"))?.includes("Pegar o Duck"), `no portãozinho: ${await ev("teste.contexto")}`);
  await ev("teste.acao()");
  ok(await ate(t, `${S}.duck === "sacudir"`, 20000, 60), "o Duck sai do lago e se sacode");
  await ev(`teste.vista([${mk.x + 3.5}, 2.2, ${mk.z - 3.5}], [${mk.x}, 0.7, ${mk.z + 0.6}])`); await espera(250); await foto("10-duck-sacudindo"); await ev("teste.vista(null)");
  ok(await ate(t, `${S}.duck === "seguir"`, 10000), "o Duck vem atrás do Rabisco");
  ok(await ate(t, `window.__voz.includes("rp-m-${B}-saiu.mp3")`, 3000), "a anfitriã: leve o Duck até a Tia Regina");
  // anda até a Tia Regina (o Duck segue)
  for (const k of [0.25, 0.5, 0.75]) { await ev(`teste.ir(${mk.x + (rg.x - mk.x) * k}, ${mk.z + (rg.z - mk.z) * k})`); await espera(1500); await ate(t, `(() => { const d = ${S}.duckMundo(); return Math.hypot(d.x - teste.j.pos.x, d.z - teste.j.pos.z) < 5; })()`, 15000); } // máquina lenta: espera o Duck alcançar
  const dk = await ev(`${S}.duckMundo()`), eu = await ev("({ x: teste.j.pos.x, z: teste.j.pos.z })");
  ok(Math.hypot(dk.x - eu.x, dk.z - eu.z) < 6, `o Duck acompanha o Rabisco (${Math.round(Math.hypot(dk.x - eu.x, dk.z - eu.z) * 10) / 10} m)`);
  await ev(`teste.vista([${eu.x + 4}, 2.6, ${eu.z + 4}], [${eu.x}, 0.7, ${eu.z}])`); await espera(400); await foto("11-duck-seguindo"); await ev("teste.vista(null)");
  await ev(`teste.ir(${rg.x + 1.6}, ${rg.z - 1.2})`);
  ok(await ate(t, `teste.missoes.feitas.includes("${B}")`, 20000), "o Duck foi entregue à Tia Regina: missão concluída");
  await espera(1500);
  await ev(`teste.vista([${rg.x + 3.5}, 2.2, ${rg.z - 4}], [${rg.x}, 0.8, ${rg.z}])`); await espera(500); await foto("12-duck-entregue"); await ev("teste.vista(null)");
  ok(await ate(t, `window.__voz.includes("rp-prop-sitio-floresca.mp3")`, 70000, 250), "a propaganda do Sítio Floresça toca no fim");
  const arroba = await ev(`document.querySelector(".balao-rp .prop-insta")?.textContent ?? ""`);
  ok(arroba.includes("@florescaondestiver"), `o balão mostra "${arroba}"`);
  const vz = await ev("window.__voz");
  ok(vz.lastIndexOf(`rp-m-${B}-verso.mp3`) >= 0 && vz.lastIndexOf("rp-prop-sitio-floresca.mp3") > vz.lastIndexOf(`rp-m-${B}-verso.mp3`), "a propaganda vem depois do versículo");
  // ---- figurinhas
  const figs = await ev("teste.salvo.album?.figs ?? []");
  for (const id of ["p:sitio-floresca", "a:pessoa-regina", `a:${A}`, `a:${B}`, `v:${A}`, `v:${B}`]) ok(figs.includes(id), `figurinha ${id} no álbum`);
  // ================================================================ as quatro missões novas, em fila, com a Tia Regina
  const pegarMissao = async (id, titulo) => {
    await ate(t, "!teste.missoes.ativa", 20000);
    await espera(1500);
    const r = await ev(`${S}.reginaMundo()`);
    await ev(`teste.ir(${r.x + 1.2}, ${r.z + 0.6})`); await espera(900);
    ok((await ev("teste.contexto"))?.includes(titulo), `a Tia Regina tem a missão "${titulo}" (${await ev("teste.contexto")})`);
    await ev("teste.acao()"); await espera(700);
    ok((await ev("teste.missoes.ativa")) === id, `missão "${titulo}" aceita`);
    ok((await ev("window.__voz")).includes(`rp-m-${id}-pedido.mp3`), "a anfitriã fala o pedido");
  };
  const botao = async (x, z, texto, yaw = null) => {
    await ev(`teste.ir(${x}, ${z})${yaw != null ? `; teste.olhar(${yaw})` : ""}`); await espera(700);
    const c = await ev("teste.contexto");
    ok(c?.includes(texto), `aparece "${texto}" (${c})`);
    await ev("teste.acao()"); await espera(400);
  };
  const L = (x, z) => ev(`${S}.pontoMundo(${x}, ${z})`);
  const cena = () => ev("teste.missoes.cena?.info() ?? null");
  const vozAntes = (await ev("window.__voz")).length;
  const C = "parceiro-sitio-floresca-comida", Dh = "parceiro-sitio-floresca-horta", Er = "parceiro-sitio-floresca-rocar", Fk = "parceiro-sitio-floresca-kids";
  // ---- 3. Hora de dar comida
  await pegarMissao(C, "Hora de dar comida");
  { const b = await L(-15, -76.5); await botao(b.x - 0.9, b.z, "Pegar o balde de milho"); }
  ok((await cena())?.balde, "o balde de milho está na mão do Rabisco");
  { const g = await L(-14.9, -80); await botao(g.x - 0.3, g.z, "Jogar milho para as galinhas", -Math.PI / 2); }
  ok((await ev(`${S}.comendo`)).galinhas, "as galinhas vêm correndo para o milho");
  { const m0 = await L(-19.5, -80); await ate(t, `${S}.galinhasMundo().filter((q) => Math.hypot(q.x - ${m0.x}, q.z - ${m0.z}) < 1.4).length >= 2`, 12000); }
  { const m = await L(-19.5, -80), gs = await ev(`${S}.galinhasMundo()`); ok(gs.filter((q) => Math.hypot(q.x - m.x, q.z - m.z) < 1.4).length >= 2, `as galinhas bicam o milho (${gs.map((q) => Math.round(Math.hypot(q.x - m.x, q.z - m.z) * 10) / 10).join(", ")} m)`);
    await ev(`teste.vista([${m.x - 5}, 3.4, ${m.z - 3}], [${m.x}, 0.4, ${m.z}])`); await espera(500); await foto("50-comida-galinhas"); await ev("teste.vista(null)"); }
  ok(await ate(t, `window.__voz.includes("rp-m-${C}-galinhas.mp3")`, 5000), "a anfitriã: agora leve o balde até o lago");
  { const mk2 = await ev(`${S}.marcaLagoMundo()`); await botao(mk2.x, mk2.z, "Jogar milho para os patos", Math.PI / 2); }
  ok((await ev(`${S}.comendo`)).patos, "os patos nadam até o milho");
  { const d0 = await L(-12.1, -100.5); await ate(t, `${S}.patosMundo().filter((q) => Math.hypot(q.x - ${d0.x}, q.z - ${d0.z}) < 1.8).length >= 2`, 12000); }
  { const d = await L(-12.1, -100.5), ps = await ev(`${S}.patosMundo()`); ok(ps.filter((q) => Math.hypot(q.x - d.x, q.z - d.z) < 1.8).length >= 2, `os patos bicam o milho na água (${ps.map((q) => Math.round(Math.hypot(q.x - d.x, q.z - d.z) * 10) / 10).join(", ")} m)`);
    await ev(`teste.vista([${d.x - 7}, 4, ${d.z + 3}], [${d.x + 1}, 0, ${d.z}])`); await espera(400); await foto("51-comida-patos"); await ev("teste.vista(null)"); }
  ok(await ate(t, `teste.missoes.feitas.includes("${C}")`, 8000), "missão \"Hora de dar comida\" concluída");
  ok(await ate(t, `window.__voz.includes("rp-m-${C}-verso.mp3")`, 40000), "o versículo (Mateus 6.26)");
  // ---- 4. Cuidar da hortinha
  await pegarMissao(Dh, "Cuidar da hortinha");
  { const r = await L(-15.6, -58.4); await botao(r.x, r.z + 0.3, "Pegar o regador"); }
  ok((await cena())?.regador, "o regador está na mão do Rabisco");
  for (const i of [0, 1, 2]) { const c = await ev(`${S}.canteiroMundo(${i})`); await botao(c.x, c.z, "Regar o canteiro", -Math.PI / 2); if (i === 0) { await espera(250); await ev(`teste.vista([${c.x - 4}, 2.6, ${c.z - 3.5}], [${c.x + 3}, 0.4, ${c.z}])`); await espera(250); await foto("52-horta-regando"); await ev("teste.vista(null)"); } }
  ok(await ate(t, `teste.missoes.cena?.info().fase === "colher"`, 8000), "regou os três canteiros: a hortinha cresceu");
  ok((await ev(`${S}.horta`)).cresce.every((v) => v > 0.95), "as alfaces e as cenouras estão prontas");
  { const c = await ev(`${S}.canteiroMundo(1)`); await ev(`teste.vista([${c.x - 4.5}, 3, ${c.z - 4}], [${c.x + 3.5}, 0.3, ${c.z}])`); await espera(400); await foto("53-horta-pronta"); await ev("teste.vista(null)");
    await botao(c.x, c.z, "Colher as alfaces e as cenouras"); }
  ok((await cena())?.cesta, "a cesta da colheita está na mão do Rabisco");
  ok(await ate(t, `window.__voz.includes("rp-m-${Dh}-colheu.mp3")`, 3000), "a anfitriã: leve a colheita até a Tia Regina");
  { const r = await ev(`${S}.reginaMundo()`); await ev(`teste.ir(${r.x + 1.4}, ${r.z + 0.4})`); }
  ok(await ate(t, `teste.missoes.feitas.includes("${Dh}")`, 6000), "entregou a colheita: missão \"Cuidar da hortinha\" concluída");
  // ---- 5. Roçar a grama
  await pegarMissao(Er, "Roçar a grama");
  const iR = await ev(`teste.veiculos.findIndex((v) => v.tipo === "rocador")`);
  ok(iR >= 0, "o roçador está no sítio");
  let ci = await cena(); ok(ci.restam === 6 && ci.rocador?.limite, `6 trechos de grama alta e o roçador com limite (${JSON.stringify(ci.rocador?.limite)})`);
  { const r = ci.rocador; await ev(`teste.ir(${r.x + 1.6}, ${r.z})`); await espera(500); ok((await ev("teste.contexto"))?.includes("Subir no roçador"), `perto do roçador: ${await ev("teste.contexto")}`);
    await ev(`teste.vista([${r.x + 5}, 2.8, ${r.z - 3}], [${r.x}, 0.6, ${r.z}])`); await espera(500); await foto("54-rocador"); await ev("teste.vista(null)"); }
  await ev(`teste.entrar(${iR})`); await espera(600);
  ok(await ate(t, `window.__voz.includes("rp-m-${Er}-subiu.mp3")`, 3000), "subiu no roçador: a anfitriã explica");
  // o limite: dirigindo para fora (para o portão), ele para na cerca
  { const p0 = await L(3, -6), p1 = await L(3, -7); const ang = Math.atan2(p0.x - p1.x, p0.z - p1.z); await ev(`teste.posVeiculo(${iR}, ${p0.x}, ${p0.z}, ${ang}); teste.volante(1, 0)`); await espera(3500); await ev("teste.volante(0, 0)");
    const v = await ev(`({ x: teste.veiculos[${iR}].pos.x, z: teste.veiculos[${iR}].pos.z })`), lim = ci.rocador.limite;
    ok(v.x >= lim.x0 && v.x <= lim.x1 && v.z >= lim.z0 && v.z <= lim.z1, `o roçador não sai do sítio (parou em ${v.x.toFixed(1)}, ${v.z.toFixed(1)})`); }
  const caps = await ev(`${S}.capimMundo()`);
  for (const [k, q] of caps.entries()) {
    await ev(`teste.posVeiculo(${iR}, ${q.x + 4}, ${q.z}, ${-Math.PI / 2}); teste.volante(0.7, 0)`); await espera(1300); await ev("teste.volante(0, 0)"); await espera(300);
    if (k === 2) { await ev(`teste.vista([${q.x - 6}, 4, ${q.z + 6}], [${q.x + 2}, 0.5, ${q.z}])`); await espera(300); await foto("55-rocando"); await ev("teste.vista(null)"); }
  }
  ci = await cena(); ok(ci.restam === 0, `roçou todos os trechos (faltam ${ci.restam})`);
  ok(await ate(t, `teste.missoes.feitas.includes("${Er}")`, 6000), "missão \"Roçar a grama\" concluída");
  await ev("teste.sair()"); await espera(800);
  // ---- 6. Dia no sítio com a Kids II
  await pegarMissao(Fk, "Dia no sítio com a Kids II");
  ci = await cena(); const esc = ci.escola;
  await ev(`teste.ir(${esc.x + 2}, ${esc.z + 2.5})`); await espera(1500);
  ok((await ev("teste.contexto"))?.includes("Chamar o ônibus da escola"), `na porta da Kids II: ${await ev("teste.contexto")}`);
  { const c2 = await custo(t); ok(c2.calls <= 250, `TV, na Kids II com as crianças: ${c2.calls} chamadas (≤ 250)`); }
  await ev(`teste.vista([${esc.x + 7}, 3, ${esc.z + 7}], [${esc.x + 1}, 0.9, ${esc.z}])`); await espera(500); await foto("56-kids-escola"); await ev("teste.vista(null)");
  await ev("teste.acao()");
  ok(await ate(t, `teste.missoes.cena?.info().fase === "ida"`, 15000), "as crianças subiram no ônibus");
  ok(await ate(t, `window.__voz.includes("rp-m-${Fk}-embarcou.mp3")`, 3000), "a anfitriã: dirija até o Sítio Floresça");
  ci = await cena(); const iB = ci.bus.i;
  await ev(`teste.vista([${ci.bus.x + 6}, 5, ${ci.bus.z + 6}], [${ci.bus.x}, 1.8, ${ci.bus.z}])`); await espera(500); await foto("57-kids-onibus"); await ev("teste.vista(null)");
  const alvoIda = await ev("teste.missoes.alvo()"); ok(alvoIda && Math.hypot(alvoIda.x - ci.parada.x, alvoIda.z - ci.parada.z) < 0.5, "a seta aponta para a frente do sítio");
  await ev(`teste.entrar(${iB})`); await espera(500);
  await ev(`teste.posVeiculo(${iB}, ${ci.parada.x + 3}, ${ci.parada.z - 1}, ${Math.PI / 2})`); await espera(1500);
  ok(await ate(t, `teste.missoes.cena?.info().fase === "parado"`, 5000), "o ônibus estacionou na frente do sítio (fora da avenida)");
  { const b = (await cena()).bus, d = await ev(`teste.distRua(${b.x}, ${b.z}).d`); ok(d > 0, `o ônibus parado fica fora da avenida, na calçada larga (${b.x.toFixed(1)}, ${b.z.toFixed(1)}; ${d.toFixed(1)} m além da borda da rua)`); }
  await ev("teste.sair()"); await espera(800);
  ok(await ate(t, `teste.missoes.cena?.info().fase === "frutas"`, 4000), "as crianças desceram do ônibus");
  ok(await ate(t, `${S}.aberto`, 40000), "o portão do sítio está aberto");
  ok(await ate(t, `window.__voz.includes("rp-m-${Fk}-chegou.mp3")`, 3000), "a anfitriã: colher frutas nas árvores");
  // andando até as frutíferas (as crianças vêm atrás)
  const arv = (await ev(`${S}.frutiferasMundo()`)).filter((a) => [0, 2, 3].includes(a.i));
  for (const [k, a] of arv.entries()) {
    const pt = await L(k === 0 ? 4 : 14, -10 - k * 14); await ev(`teste.ir(${pt.x}, ${pt.z})`); await espera(1400);
    await botao(a.x, a.z, "Colher frutas com as crianças");
    if (k === 0) { const c3 = await custo(t); ok(c3.calls <= 250, `TV, colhendo frutas com as crianças: ${c3.calls} chamadas (≤ 250)`); }
    await espera(600);
    if (k === 1) { await ev(`teste.vista([${a.x + 6}, 3.4, ${a.z + 4}], [${a.tx}, 1.6, ${a.tz}])`); await espera(400); await foto("58-kids-frutas"); await ev("teste.vista(null)"); }
    await espera(1300);
  }
  ok(await ate(t, `teste.missoes.cena?.info().fase === "balancoPronto"`, 6000), "colheu frutas nas três árvores");
  const bal = (await ev(`${S}.balancosMundo()`))[0];
  for (let k = 0; k < 2; k++) {
    await ev(`teste.ir(${bal.x + 1.6}, ${bal.z + 0.4})`);
    await ate(t, `(teste.contexto ?? "").includes("Empurrar o balanço")`, 10000); // máquina lenta: espera o botão
    await botao(bal.x + 1.6, bal.z + 0.4, "Empurrar o balanço");
    await espera(1400);
    if (k === 0) { const bm = (await ev(`${S}.balancosMundo()`))[0]; ok(bm.sentado && bm.amp > 0.25, `uma criança no balanço de pneu, indo alto (amplitude ${bm.amp.toFixed(2)})`); await ev(`teste.vista([${bal.x + 6}, 2.6, ${bal.z - 5}], [${bal.x}, 1.4, ${bal.z}])`); await espera(400); await foto("59-kids-balanco"); await ev("teste.vista(null)"); }
    await espera(3600);
  }
  ok(await ate(t, `teste.missoes.cena?.info().fase === "voltar"`, 15000), "brincaram no balanço: hora de voltar");
  // de volta para o ônibus (as crianças vêm atrás e sobem)
  { const pt = await L(0, -6); await ev(`teste.ir(${pt.x}, ${pt.z})`); await espera(2500); const b = (await cena()).bus; await ev(`teste.ir(${b.x}, ${b.z + 2.9})`); }
  ok(await ate(t, `teste.missoes.cena?.info().fase === "volta"`, 40000), "as crianças subiram no ônibus de novo");
  ok(await ate(t, `window.__voz.includes("rp-m-${Fk}-volta.mp3")`, 3000), "a anfitriã: leve as crianças de volta para a Kids II");
  ok((await ev("teste.missoes.alvo()"))?.emoji === "🏫", "a seta aponta para a escola");
  await ev(`teste.entrar(${iB})`); await espera(500);
  await ev(`teste.posVeiculo(${iB}, ${esc.x + 3}, ${esc.z + 7}, ${Math.PI / 2})`); await espera(1200);
  ok(await ate(t, `teste.missoes.cena?.info().fase === "chegou"`, 5000), "chegou à Kids II: as crianças descem e correm para a Diretora Sabrina");
  await espera(600); await ev("teste.sair()"); await espera(300);
  await ev(`teste.vista([${esc.x + 7}, 3, ${esc.z + 8}], [${esc.x + 1}, 0.9, ${esc.z + 1}])`); await espera(700); await foto("60-kids-volta"); await ev("teste.vista(null)");
  ok(await ate(t, `teste.missoes.feitas.includes("${Fk}")`, 25000), "missão \"Dia no sítio com a Kids II\" concluída");
  ok(await ate(t, `window.__voz.lastIndexOf("rp-prop-sitio-floresca.mp3") > window.__voz.lastIndexOf("rp-m-${Fk}-verso.mp3") && window.__voz.includes("rp-m-${Fk}-verso.mp3")`, 70000, 250), "no fim do dia com a Kids II, a propaganda do sítio de novo (depois do versículo)");
  const vzN = (await ev("window.__voz")).slice(vozAntes), nProp = vzN.filter((k) => k === "rp-prop-sitio-floresca.mp3").length;
  ok(nProp === 1, `nas quatro missões novas, a propaganda tocou só no fim da última (${nProp} vez)`);
  const figs2 = await ev("teste.salvo.album?.figs ?? []");
  for (const id of [C, Dh, Er, Fk]) { ok(figs2.includes(`a:${id}`), `figurinha a:${id} no álbum`); ok(figs2.includes(`v:${id}`), `versículo v:${id} no álbum`); }

  // ---- custo pelos cantos do sítio e fotos de cada parte
  let pior = 0;
  for (const [nome, [x, z]] of Object.entries(P)) {
    const [dx, dz] = { lago: [0, -13], portao: [0, -4] }[nome] ?? [1.5, -6]; // sempre do lado de fora (do lago, do cercadinho)
    await ev(`teste.ir(${x + dx}, ${z + dz}); teste.olhar(0)`); await espera(1100);
    const c = await custo(t); pior = Math.max(pior, c.calls);
    ok(c.calls <= 250, `TV, perto de ${nome}: ${c.calls} chamadas (≤ 250)`);
  }
  console.log(`  pior caso na TV: ${pior} chamadas`);
  // vistas em coordenadas do terreno ([x, y, z] da câmera e do alvo): a fila da esquerda (casa → salão → hortinha →
  // galinheiro → lago quadrado), as frutíferas com balanço à direita e o sítio inteiro de cima
  const VL = { casa: [[-6, 4, 4], [-20, 1.6, -14]], "casa-salao": [[-6, 5, -16], [-22, 2, -34]], salao: [[-6, 4.5, -36], [-20, 2, -44]], "salao-dentro": [[-17.6, 1.5, -29], [-17.6, 1.3, -54]],
    horta: [[-9, 4, -56], [-21, 0.6, -64]], galinheiro: [[-8, 4, -74], [-21, 0.6, -81]], lago: [[-2, 7, -92], [-18, 0, -102]], "fila-esquerda": [[8, 26, 6], [-18, 0, -62]],
    frutiferas: [[14, 6, -6], [24, 3, -40]], balanco: [[16, 3, -23], [21.7, 1.5, -27]], aereo: [[60, 110, -40], [0, 0, -69]], "aereo-alto": [[0.5, 170, -69], [0, 0, -69]] };
  for (const [n, [pos, alvo2]] of Object.entries(VL)) {
    const [px, pz] = await ev(`${S}.paraMundo(${pos[0]}, ${pos[2]})`), [ax, az] = await ev(`${S}.paraMundo(${alvo2[0]}, ${alvo2[2]})`);
    await ev(`teste.vista(${JSON.stringify([px, pos[1], pz])}, ${JSON.stringify([ax, alvo2[1], az])}, ${!n.startsWith("aereo") && n !== "fila-esquerda"})`); await espera(900); await foto(`20-${n}`);
  }
  await ev("teste.vista(null)");
  // ---- o trânsito não para nem prende o carro do jogador: a avenida em frente ao portão continua livre
  ok(!(await ev("teste.dentroDeSolido(-352, 50)")) && !(await ev("teste.dentroDeSolido(-352, 55)")), "a Avenida da Alegria em frente ao sítio continua livre");
  semErro(t);
} catch (e) { ok(false, `erro: ${e.message}`); }
await t.fechar();

// ---------------------------------------------------------------- celular: o custo perto do sítio
{
  const c = await abrirJogo({ mobile: true, largura: 844, altura: 390 });
  try {
    for (const [x, z, yaw] of [[-354, 54, 0], [-350, 90, 0], [-352, 140, 0], [-362, 168, Math.PI]]) {
      await c.ev(`teste.ir(${x}, ${z}); teste.olhar(${yaw})`); await espera(1500);
      const k = await custo(c); ok(k.calls <= 180, `celular, em (${x}, ${z}): ${k.calls} chamadas (≤ 180)`);
    }
    await c.ev(OCULTA); await c.foto(`${OUT}30-celular.png`);
    semErro(c);
  } catch (e) { ok(false, `erro no celular: ${e.message}`); }
  await c.fechar();
}
// ---------------------------------------------------------------- a Tia Regina de perto (prévia das pessoas), sozinha e com o Rabisco
{
  const p = await abrir(`${BASE}/jogos/rabiscopolis/previa-pessoas.html`, { largura: 900, altura: 900 });
  try {
    await ate(p, "!!window.previa", 30000); await espera(1200);
    await p.ev(`document.querySelectorAll(".barra,.titulo,.info,#barra,#titulo,#info").forEach((e) => e.style.display = "none")`);
    await p.ev(`previa.mostrar("regina")`);
    for (const [nome, ang, op] of [["frente", 0, {}], ["diagonal", 0.75, {}], ["costas", Math.PI, {}], ["rosto", 0.3, { dist: 1.9, alt: 1.55, alvoY: 1.45 }], ["com-rabisco", 0.2, { rabisco: true, dist: 6 }], ["com-rabisco-lado", 1.35, { rabisco: true, dist: 6 }]]) {
      await p.ev(`previa.vista(${ang}, ${JSON.stringify(op)})`); await espera(700); await p.foto(`${OUT}40-regina-${nome}.png`);
    }
  } catch (e) { ok(false, `erro na prévia: ${e.message}`); }
  await p.fechar();
}
clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
