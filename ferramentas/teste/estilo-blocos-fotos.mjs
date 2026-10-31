// Protótipo "estilo de blocos" da Rabiscolândia: tira as fotos de ANTES (jogo de hoje) e DEPOIS (?estilo=blocos) das
// mesmas cenas, no mesmo ângulo e na mesma hora, e monta as comparações lado a lado. Só para gerar imagens.
// Uso: python3 -m http.server 8601 &  node --experimental-websocket ferramentas/teste/estilo-blocos-fotos.mjs [http://localhost:8601] [cena ...]
// Saída: .claude/tmp/estilo-blocos/ (antes-*.png, depois-*.png, comparacao-*.png)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:8601";
const SO = process.argv.slice(2).filter((a) => !a.startsWith("http"));
const OUT = fileURLToPath(new URL("../../.claude/tmp/estilo-blocos/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const HORA = 11;

// Cada cena: o que rodar no jogo (igual nos dois) para posar tudo e olhar. O jogo é congelado antes da foto.
const CENAS = {
  "cena-1-praca": { nome: "Praça central", js: `
    teste.ir(9, 38); teste.olhar(Math.PI * 0.9);
    teste.vista([14, 11, 51], [2, 3, 14]);` },
  "cena-2-casas": { nome: "Rua com casas", js: `
    teste.ir(-66, 5.2); teste.olhar(Math.PI * 1.5);
    teste.vista([-52, 8, 1], [-110, 1, 0]);` },
  "cena-3-escola": { nome: "Escola Educarte Kids II", js: `
    teste.ir(201, -4.5); teste.olhar(Math.PI * 0.9);
    teste.vista([197, 6.5, 4], [196, 5, -12]);` },
  "cena-3b-parceiro": { nome: "Parceiro J.E Multimarcas", js: `
    teste.ir(150, -45); teste.olhar(Math.PI);
    teste.vista([153, 7.5, -17], [166, 4, -58]);` },
  "cena-4-carro": { nome: "Carro na avenida", js: `
    teste.ir(-20, 56); teste.olhar(Math.PI / 2);
    teste.posVeiculo(0, -12, 52.8, Math.PI / 2); teste.entrar(0); teste.posVeiculo(0, -12, 52.8, Math.PI / 2);
    const T = teste.transito; const pos = [[6, 52.8, 1], [22, 52.8, 1], [10, 47.2, -1], [-6, 47.2, -1], [34, 47.2, -1]];
    T.forEach((k, i) => { const p = pos[i]; if (p) { k.g.position.set(p[0], 0.03, p[1]); k.g.rotation.y = p[2] > 0 ? Math.PI / 2 : -Math.PI / 2; k.g.visible = true; } else k.g.position.set(0, -50, 0); });
    teste.vista([-25, 4.6, 56], [-4, 1.6, 51.5]);` },
  "cena-5-orla": { nome: "Orla, píer, ilha e roda-gigante", js: `
    teste.ir(40, 250); teste.olhar(Math.PI);
    teste.vista([22, 11, 244], [12, 11, 372], false);` },
  "cena-6-rabisco": { nome: "Rabisco com um morador", js: `
    teste.ir(-66.8, 5.2); teste.olhar(Math.PI);
    const m = teste.moradores[0].p.grupo; m.position.set(-68.7, 0.07, 5.1); m.rotation.y = Math.PI + 0.3; m.visible = true;
    teste.rabisco.grupo.position.set(-66.6, 0.07, 5.2); teste.rabisco.grupo.rotation.y = Math.PI - 0.3;
    teste.vista([-64.4, 1.9, -1.6], [-67.4, 1.1, 5.3]);` },
};

const ocultaHud = `(() => { const s = document.createElement("style"); s.textContent = ".cena-rp > *:not(canvas), canvas.minimapa-rp, .casca-redondo, .pausa-botao, .engrenagem-pausa, [class*='radio'], .casca-topo, .casca-dica, .casca-aviso, .casca-abertura, .casca-placar{display:none!important}"; document.head.append(s); })()`;
const ate = async (t, expr, ms = 60000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(300); } return false; };

async function foto(nome, cena, depois) {
  const t = await abrir(`${BASE}/jogos/rabiscopolis/?teste&jogar&fixo${depois ? "&estilo=blocos" : ""}`, { largura: 1280, altura: 720 });
  try {
    await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: FAMILIA });
    await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo${depois ? "&estilo=blocos" : ""}` });
    if (!(await ate(t, "Boolean(window.teste?.mundo && window.teste.rabisco)"))) throw new Error("o jogo não abriu: " + t.erros.join(" | "));
    await espera(2500);
    await t.ev(ocultaHud);
    await t.ev(`teste.hora(${HORA})`);
    await t.ev(CENAS[cena].js);
    await espera(3500); // fotos das fachadas e texturas chegam
    // congela: nenhum quadro novo (o trânsito e os moradores ficam onde foram postos) e desenha um quadro final
    await t.ev(`window.requestAnimationFrame = () => 0; window.__blocos?.aplicar?.(); teste.r3.render(teste.cena, teste.cam); teste.r3.render(teste.cena, teste.cam); 1`);
    await espera(400);
    const arq = `${OUT}${depois ? "depois" : "antes"}-${cena}.png`;
    await t.foto(arq);
    const erros = t.erros.filter((e) => !/assets\/voz\//.test(e));
    if (erros.length) console.log(`  (${nome} ${depois ? "depois" : "antes"}) avisos: ${erros.slice(0, 4).join(" | ")}`);
    return arq;
  } finally { await t.fechar(); }
}

const lista = Object.keys(CENAS).filter((c) => !SO.length || SO.some((s) => c.includes(s)));
const so = process.env.SO_LADO; // "antes" ou "depois"
for (const c of lista) {
  for (const depois of [false, true]) {
    if (so && (so === "depois") !== depois) continue;
    const a = await foto(CENAS[c].nome, c, depois);
    console.log("✓", a);
  }
}
process.exit(0);
