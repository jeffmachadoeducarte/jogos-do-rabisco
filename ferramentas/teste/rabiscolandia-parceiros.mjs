// Rabiscolândia: fachadas das parceiras novas. Tira foto de frente, nas duas diagonais e de cima de cada prédio, foto de cada boneco
// na prévia, e mede as chamadas de desenho (TV e celular) num ponto típico e perto de cada parceira.
// Uso: node --experimental-websocket ferramentas/teste/rabiscolandia-parceiros.mjs <http://localhost:porta> [pasta] [so-medidas|ids...]
// Saída: <pasta>/<id>-frente.png, -diagonal-e.png, -diagonal-d.png, -topo.png, boneco-*.png, medidas.json. Falha se estourar o orçamento.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const [BASE = "http://localhost:8099", PASTA = fileURLToPath(new URL("../../.claude/tmp/parceiros/", import.meta.url)), ...SO] = process.argv.slice(2);
const OUT = PASTA.endsWith("/") ? PASTA : `${PASTA}/`;
mkdirSync(OUT, { recursive: true });
const soMedidas = SO.includes("so-medidas"), semFotos = soMedidas;
const IDS = SO.filter((s) => s !== "so-medidas");
const NOVOS = ["gala-presentes", "see-love-joias", "bella-company", "marlon-maquinas", "cafe-com-deus-pai-kids", "ballet-e-cia", "bt-models", "speedy-solucoes"];
// os mesmos pontos valem para medir a cidade de antes: as coordenadas ficam aqui, sem depender dos lugares do mapa
const PONTOS = { "gala-presentes": [-41, 30, -1, 0], "see-love-joias": [59, -120, -1, 0], "bella-company": [216, 59.5, 0, -1], "marlon-maquinas": [-106, 149.5, 0, -1], "cafe-com-deus-pai-kids": [-41, -162, -1, 0], "ballet-e-cia": [-165, 59.5, 0, -1], "bt-models": [98, 149.5, 0, -1], "speedy-solucoes": [-116, -149.5, 0, 1] };
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const OCULTA = `(() => { const s = document.createElement("style"); s.textContent = ".cena-rp > *:not(canvas), canvas.minimapa-rp, .casca-redondo, .pausa-botao, .engrenagem-pausa, [class*='radio'], .casca-topo, .casca-dica, .casca-aviso, .casca-balao { display: none !important; }"; document.head.append(s); })()`;
const ate = async (t, expr, ms = 90000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(150); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)|favicon|fonts\.g/.test(e));
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };

async function abrirJogo(opcoes) {
  const t = await abrir("about:blank", opcoes);
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: FAMILIA });
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo` });
  if (!(await ate(t, "Boolean(window.teste?.mundo && window.teste.rabisco)"))) throw new Error("o jogo não abriu: " + t.erros.join(" | "));
  await espera(2500);
  return t;
}
async function medir(t, rotulo, teto) {
  const m = {};
  const pontos = { "praça": [0, 33, Math.PI], "Bairro das Casas": [-96, 2, Math.PI * 0.82], "Rua do Comércio": [105, 2, 0] };
  for (const [id, [x, z, dx, dz]] of Object.entries(PONTOS)) { pontos[`rua em frente: ${id}`] = [x + dx * 10, z + dz * 10, Math.atan2(-dx, -dz)]; pontos[`porta: ${id}`] = [x + dx * 2, z + dz * 2, Math.atan2(-dx, -dz)]; }
  for (const [nome, [x, z, yaw]] of Object.entries(pontos)) {
    await t.ev(`teste.ir(${x}, ${z}); teste.olhar(${yaw})`);
    await espera(900);
    m[nome] = await t.ev("teste.medir().total");
    if (teto) ok(m[nome].calls <= teto && m[nome].tris <= 350000, `${rotulo}, ${nome}: ${m[nome].calls} chamadas (≤ ${teto}), ${Math.round(m[nome].tris / 1000)} mil triângulos`);
  }
  return m;
}

const medidas = {};
const tv = await abrirJogo({ largura: 1920, altura: 1080 });
const novo = await tv.ev("teste.PARCEIROS.length > 4");
medidas.tv = await medir(tv, "TV", novo ? 250 : 0);
if (novo) {
  ok(await tv.ev("teste.PARCEIROS.length") === 12, "12 parceiras");
  const lg = await tv.ev(`(${JSON.stringify(NOVOS)}).map((id) => { const l = teste.mundo.lugares.find((q) => q.id === "parceiro-" + id); return l ? [id, l.x, l.z, l.topo, l.porta] : [id, null]; })`);
  for (const [id, x, z, topo, porta] of lg) { ok(x != null && topo > 6 && topo < 30, `${id}: em (${x}, ${z}), topo ${topo?.toFixed(1)} m, porta em (${porta?.map((v) => +v.toFixed(1))})`); }
  ok(await tv.ev("teste.mundo.anima.pessoas.length") === 2, "Marlon e Samira na porta dos prédios");
  if (!semFotos) {
    await tv.ev(OCULTA);
    for (const id of NOVOS) {
      if (IDS.length && !IDS.includes(id)) continue;
      const [x, z, dx, dz] = PONTOS[id];
      await tv.ev(`teste.ir(${x + dx * 3}, ${z + dz * 3}); teste.olhar(0);`);
      await espera(500);
      const lx = dz, lz = dx; // eixo ao longo da fachada
      const alto = await tv.ev(`teste.mundo.lugares.find((q) => q.id === "parceiro-${id}").topo`), d = Math.max(13.5, alto * 1.1), ALVO = `[${x - dx * 2}, ${(alto * 0.42).toFixed(1)}, ${z - dz * 2}]`;
      const vistas = { frente: [x + dx * d, 4, z + dz * d], "diagonal-e": [x + dx * d * 0.72 - lx * d * 0.72, 5, z + dz * d * 0.72 - lz * d * 0.72], "diagonal-d": [x + dx * d * 0.72 + lx * d * 0.72, 5, z + dz * d * 0.72 + lz * d * 0.72], perto: [x + dx * 6.5, 2.2, z + dz * 6.5], topo: [x + dx * 14 + lx * 7, 20, z + dz * 14 + lz * 7], fundo: [x - dx * 32 + lx * 12, 8, z - dz * 32 + lz * 12] };
      for (const [nome, pos] of Object.entries(vistas)) {
        await tv.ev(`teste.vista(${JSON.stringify(pos)}, ${ALVO})`);
        await espera(450);
        await tv.foto(`${OUT}${id}-${nome}.png`);
      }
      await tv.ev("teste.vista(null)");
    }
    // o mapa da cidade, para ver a distribuição
    await tv.ev(`teste.ir(0, 33); teste.vista([0, 640, 40], [0, 0, 0], false)`);
    await espera(1500);
    await tv.foto(`${OUT}cidade-de-cima.png`);
    await tv.ev("teste.vista(null)");
  }
  const er = errosDeVerdade(tv);
  ok(!er.length, `sem erro de console ${er.slice(0, 3).join(" | ")}`);
}
await tv.fechar();
const cel = await abrirJogo({ mobile: true, largura: 844, altura: 390, agente: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1" });
medidas.celular = await medir(cel, "celular", novo ? 180 : 0);
await cel.fechar();
writeFileSync(`${OUT}medidas.json`, JSON.stringify(medidas, null, 1));
for (const [perfil, m] of Object.entries(medidas)) console.log(perfil, Object.entries(m).map(([k, v]) => `${k}: ${v.calls}`).join(" · "));

if (novo && !semFotos) {
  const p = await abrir(`${BASE}/jogos/rabiscopolis/previa-pessoas.html`, { largura: 1000, altura: 900 });
  await ate(p, "!!window.previa");
  await espera(1200);
  await p.ev(`document.querySelectorAll(".barra,.titulo,.info").forEach((e) => e.style.display = "none")`);
  for (const id of ["marlon", "samira"]) {
    await p.ev(`previa.mostrar(${JSON.stringify(id)})`);
    for (const [nome, ang, op] of [["frente", 0, {}], ["diagonal", 0.75, {}], ["costas", Math.PI, {}], ["rosto", 0.3, { dist: 2.2, alt: 1.95, alvoY: 1.85 }], ["maos", 0.45, { dist: 1.6, alt: 0.95, alvoY: 0.85 }]]) {
      await p.ev(`previa.vista(${ang}, ${JSON.stringify(op)})`);
      await espera(500);
      await p.foto(`${OUT}boneco-${id}-${nome}.png`);
    }
  }
  await p.ev(`previa.mostrar("juntas"); previa.vista(0.1, { dist: 12, alt: 2.5, alvoY: 1.1 })`);
  await espera(800);
  await p.foto(`${OUT}bonecos-todos.png`);
  ok(!errosDeVerdade(p).length, `prévia sem erro ${errosDeVerdade(p).slice(0, 2).join("|")}`);
  await p.fechar();
}
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
