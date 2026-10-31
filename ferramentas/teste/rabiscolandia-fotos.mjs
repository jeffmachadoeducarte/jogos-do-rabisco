// Rabiscolândia: fotos das mesmas cenas para comparar versões, e medidas de custo (chamadas, triângulos, carregamento).
// Uso: python3 -m http.server 8901 &  node --experimental-websocket ferramentas/teste/rabiscolandia-fotos.mjs http://localhost:8901 [pasta] [prefixo] [cena ...]
// Saída: <pasta>/<prefixo>-<cena>.png e, com a cena "medidas", <pasta>/<prefixo>-medidas.json
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const [BASE = "http://localhost:8901", PASTA = fileURLToPath(new URL("../../.claude/tmp/blocos-final/", import.meta.url)), PREF = "depois", ...SO] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const OUT = PASTA.endsWith("/") ? PASTA : `${PASTA}/`;
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const ocultaHud = `(() => { const s = document.createElement("style"); s.textContent = ".cena-rp > *:not(canvas), canvas.minimapa-rp, .casca-redondo, .pausa-botao, .engrenagem-pausa, [class*='radio'], .casca-topo, .casca-dica, .casca-aviso, .casca-abertura, .casca-placar{display:none!important}"; document.head.append(s); })()`;
const ate = async (t, expr, ms = 90000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(120); } return false; };
const veic = (tipo, ang = 0.7, dist = 7.5, alt = 3.2, cor = "0xff7a00") => `
  teste.ir(-96, 2); const d = teste.garagem(${JSON.stringify(tipo)}, ${cor});
  const v = teste.veiculos.findLast((q) => q.tipo === ${JSON.stringify(tipo)}) ?? teste.veiculos.at(-1);
  const X = v.pos.x, Z = v.pos.z; teste.olhar(0); teste.ir(X + 4, Z + 4);
  teste.vista([X + Math.sin(v.ang + ${ang}) * ${dist}, ${alt}, Z + Math.cos(v.ang + ${ang}) * ${dist}], [X, 1.2, Z]);`;
// vista de frente de um lugar do mapa
const lugar = (id, dist = 22, alt = 8) => `const l = teste.LUGARES.find((q) => q.id === ${JSON.stringify(id)}); const X = l.x + l.dir[0] * 8 + 1, Z = l.z + l.dir[1] * 8 + 1; teste.ir(X, Z); teste.vista([l.x + l.dir[0] * ${dist} + l.dir[1] * 7, ${alt}, l.z + l.dir[1] * ${dist} + l.dir[0] * 7], [l.x - l.dir[0] * 6, 4, l.z - l.dir[1] * 6]);`;
const CENAS = {
  "cena-1-praca": `teste.ir(9, 38); teste.olhar(Math.PI * 0.9); teste.vista([14, 11, 51], [2, 3, 14]);`,
  "cena-2-casas": `teste.ir(-66, 5.2); teste.olhar(Math.PI * 1.5); teste.vista([-52, 8, 1], [-110, 1, 0]);`,
  "cena-3-escola": `teste.ir(201, -4.5); teste.olhar(Math.PI * 0.9); teste.vista([197, 6.5, 4], [196, 5, -12]);`,
  "cena-3b-parceiro": `teste.ir(150, -45); teste.olhar(Math.PI); teste.vista([153, 7.5, -17], [166, 4, -58]);`,
  "cena-3c-igreja": `teste.ir(0, 2); teste.olhar(Math.PI); teste.vista([6, 7, 12], [0, 6, -24]);`,
  ...Object.fromEntries(["hospital", "bombeiros", "mercado", "padaria", "sorveteria", "biblioteca", "kids1", "veterinario", "correios", "estudio", "lavarapido", "museu", "observatorio", "floricultura", "pizzaria", "farmacia", "brinquedos", "mirante"].map((id) => [`cena-3l-${id}`, lugar(id)])),
  "cena-3m-torres": `teste.ir(330, -200); teste.olhar(0); teste.vista([330, 14, -150], [330, 10, -240]);`,
  "cena-3n-fazenda": `const l = teste.LUGARES.find((q) => q.id === "fazendinha"); teste.ir(l.x, l.z); teste.vista([l.x + 18, 12, l.z - 2], [l.x - 8, 2, l.z - 34]);`,
  "cena-3o-parque": `const l = teste.LUGARES.find((q) => q.id === "parque"); teste.ir(l.x, l.z); teste.vista([l.x + 12, 11, l.z + 16], [l.x, 1, l.z - 24]);`,
  "cena-4-carro": `teste.ir(-20, 56); teste.olhar(Math.PI / 2);
    teste.posVeiculo(0, -12, 52.8, Math.PI / 2); teste.entrar(0); teste.posVeiculo(0, -12, 52.8, Math.PI / 2);
    const T = teste.transito; const pos = [[6, 52.8, 1], [22, 52.8, 1], [10, 47.2, -1], [-6, 47.2, -1], [34, 47.2, -1]];
    T.forEach((k, i) => { const p = pos[i]; if (p) { k.g.position.set(p[0], 0.03, p[1]); k.g.rotation.y = p[2] > 0 ? Math.PI / 2 : -Math.PI / 2; k.g.visible = true; } else k.g.position.set(0, -50, 0); });
    teste.vista([-25, 4.6, 56], [-4, 1.6, 51.5]);`,
  "cena-5-orla": `teste.ir(40, 250); teste.olhar(Math.PI); teste.vista([22, 11, 244], [12, 11, 372], false);`,
  "cena-6-rabisco": `teste.ir(-66.8, 5.2); teste.olhar(Math.PI);
    const m = teste.moradores[0].p.grupo; m.position.set(-68.7, 0.07, 5.1); m.rotation.y = Math.PI + 0.3; m.visible = true;
    teste.rabisco.grupo.position.set(-66.6, 0.07, 5.2); teste.rabisco.grupo.rotation.y = Math.PI - 0.3;
    teste.vista([-64.4, 1.9, -1.6], [-67.4, 1.1, 5.3]);`,
  "cena-7-noite": `teste.hora(22); teste.ir(9, 38); teste.olhar(Math.PI * 0.9); teste.vista([14, 11, 51], [2, 3, 14]);`,
  "cena-7b-noite-casas": `teste.hora(22); teste.ir(-66, 5.2); teste.olhar(Math.PI * 1.5); teste.vista([-52, 8, 1], [-110, 1, 0]);`,
  "cena-8-interior-casa": `teste.entrarCasa(1);`,
  "cena-8b-interior-escola": `teste.entrarLugar("kids2");`,
  "cena-8c-interior-padaria": `teste.entrarLugar("padaria");`,
  "cena-8d-interior-rise": `teste.entrarLugar("parceiro-rise-up");`,
  "cena-8e-interior-crescente": `teste.entrarLugar("parceiro-crescente-contabilidade");`,
  "cena-8f-interior-igreja": `teste.entrarLugar("igreja");`,
  "cena-9a-onibus": veic("onibus", 0.7, 13, 4.5),
  "cena-9b-heli": veic("heli", 0.7, 11, 4.5),
  "cena-9c-moto": veic("moto", 0.8, 5, 2.2, "0xec2e8c"),
  "cena-9d-ambulancia": veic("ambulancia"),
  "cena-9e-bombeiro": veic("bombeiro", 0.7, 11, 4),
  "cena-9f-sorvete": veic("sorvete"),
  "cena-9g-trator": veic("trator"),
  "cena-9h-bici": veic("bici", 0.8, 4, 2, "0x00b5f0"),
  "cena-9i-je": veic("je"),
  "cena-9j-lancha": `teste.ir(-30, 300); const q = teste.veiculos.find((v) => v.tipo === "lancha"); teste.vista([q.pos.x + 8, 4, q.pos.z + 8], [q.pos.x, 1, q.pos.z], false);`,
  "cena-9k-jetski": `teste.ir(-30, 300); const q = teste.veiculos.find((v) => v.tipo === "jetski"); teste.vista([q.pos.x + 5, 2.5, q.pos.z + 5], [q.pos.x, 0.8, q.pos.z], false);`,
  "cena-9l-barco": `teste.ir(-30, 300); const q = teste.veiculos.find((v) => v.tipo === "barco"); teste.vista([q.pos.x + 6, 3, q.pos.z + 6], [q.pos.x, 0.8, q.pos.z], false);`,
  // por último: congela o jogo para os amigos do estojo ficarem em fila (os moradores andam sozinhos a cada quadro)
  "cena-11-moradores": `teste.ir(-3, 34); teste.olhar(0); teste.vista([1, 1.9, 35], [1, 1.1, 41]); window.requestAnimationFrame = () => 0;
    setTimeout(() => { const vist = new Set(); let i = 0;
      for (const q of teste.moradores) { const t = q.p.tipo, g = q.p.grupo; g.visible = false; if (vist.has(t)) continue; vist.add(t); g.visible = true; g.position.set(-5 + i * 1.5, 0.07, 41); g.rotation.y = Math.PI; i++; }
      teste.r3.render(teste.cena, teste.cam); teste.r3.render(teste.cena, teste.cam); }, 500);`,
};
const pedidas = Object.keys(CENAS).filter((c) => !SO.length || SO.some((s) => c.includes(s)));

async function abrirJogo({ mobile = false } = {}) {
  const dim = mobile ? { mobile: true, largura: 844, altura: 390 } : { largura: 1280, altura: 720 };
  const t = await abrir("about:blank", dim);
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: FAMILIA });
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo` });
  if (!(await ate(t, "Boolean(window.teste?.mundo && window.teste.rabisco)", 60000))) { const e = t.erros.join(" | "); await t.fechar(); throw new Error("o jogo não abriu: " + e); }
  return t;
}
// cada cena num jogo aberto: uma de cada vez, voltando para a rua e o dia
const t = await abrirJogo();
await espera(2000);
await t.ev(ocultaHud);
for (const c of pedidas) {
  try {
    await t.ev(`try { if (teste.emLugar) teste.sairLugar(); if (teste.emCasa) teste.sairCasa(); teste.vista(null); teste.hora(11); teste.sair?.(); } catch {} 1`);
    await t.ev(`(() => { ${CENAS[c]} })()`);
    await espera(c.includes("interior") ? 3500 : 2800);
    await t.foto(`${OUT}${PREF}-${c}.png`);
    console.log("✓", c);
  } catch (e) { console.log("✗", c, e.message.slice(0, 160)); }
}
const erros = t.erros.filter((e) => !/assets\/voz\//.test(e));
if (erros.length) console.log("avisos:", [...new Set(erros)].slice(0, 6).join(" | "));
await t.fechar();
if (!SO.length || SO.includes("celular")) {
  const c = await abrirJogo({ mobile: true });
  await espera(3000);
  await c.ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(2500); await c.foto(`${OUT}${PREF}-cena-10-celular.png`);
  await c.ev("teste.ir(-66, 5.2); teste.olhar(Math.PI * 1.5)"); await espera(2500); await c.foto(`${OUT}${PREF}-cena-10b-celular-casas.png`);
  await c.fechar(); console.log("✓ celular");
}
if (!SO.length || SO.includes("medidas")) {
  const m = { carregar: [] }; let p;
  for (let i = 0; i < 3; i++) { const g = await abrirJogo(); m.carregar.push(await g.ev("Math.round(performance.now())")); p = g; if (i < 2) await g.fechar(); }
  const PONTOS = { praca: "teste.ir(0, 33); teste.olhar(Math.PI)", casas: "teste.ir(-96, 2); teste.olhar(Math.PI * 0.82)", je: "teste.ir(147, -82.5); teste.olhar(-Math.PI / 2)", orla: "teste.ir(40, 250); teste.olhar(Math.PI)", horizonte: "teste.ir(300, -260); teste.olhar(1)" };
  for (const [k, cmd] of Object.entries(PONTOS)) { await p.ev(cmd); await espera(1200); m[k] = await p.ev("teste.medir()"); }
  await p.fechar();
  const cel = await abrirJogo({ mobile: true });
  for (const [k, cmd] of Object.entries(PONTOS)) { await cel.ev(cmd); await espera(1200); m[`cel_${k}`] = (await cel.ev("teste.medir()")).total; }
  await cel.fechar();
  writeFileSync(`${OUT}${PREF}-medidas.json`, JSON.stringify(m, null, 1));
  console.log(JSON.stringify(m));
}
process.exit(0);
