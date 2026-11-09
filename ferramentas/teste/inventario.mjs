// Rabiscolândia (Mundo Vivo, etapa 10): o inventário de verdade (inventario.js) e a barra de itens do HUD.
//  - começa vazio; o que a missão manda pegar entra na mochila na hora (e na barra) e sai ao largar a missão;
//  - concluir uma missão deixa presentes guardados (o semeador dá as sementes; história da Bíblia dá a Bíblia);
//  - tocar num item da barra mostra o nome e para que serve; a Bíblia mostra um versículo aprendido;
//  - o app Mochila do Rabisfone lista tudo; fica no save do perfil e volta ao recarregar;
//  - save antigo com missões feitas recebe os presentes delas ao entrar.
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/inventario.mjs [http://localhost:8097] [pasta-das-fotos]
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:8097";
const FOTOS = process.argv[3] || null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
let falhas = 0;
const vigia = setTimeout(() => { console.log("✗ o teste travou (o navegador caiu?)"); process.exit(2); }, 12 * 60 * 1000);
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 90000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e));
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const CARREGOU = "Boolean(window.teste?.vivo && window.teste.inventario && window.teste.hud)";
const SLOTS = `[...document.querySelectorAll(".hud-barra .hud-slot[data-item]")].map((s) => s.dataset.item)`;

const t = await abrir("about:blank", { largura: 1280, altura: 720 });
await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: FAMILIA });
await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
ok(await ate(t, CARREGOU), "carregou com inventário e HUD");
await espera(1500);
ok((await t.ev("teste.inventario.lista().length")) === 0 && (await t.ev(SLOTS)).length === 0, "começa com a mochila vazia e a barra sem itens");
// ---------- missão "O lanche repartido": pegar a cesta de pães → entra na mochila e na barra; largar → sai
ok(await t.ev('teste.missoes.aceitar("lanche")'), "aceitou a missão do lanche");
for (let k = 0; k < 6; k++) {
  const tipo = await t.ev("teste.missoes.etapaInfo().tipo");
  if (tipo === "pegar" && (await t.ev("teste.inventario.carregando().length")) > 0) break;
  const a = await t.ev("teste.missoes.alvo()"); if (!a) break;
  await t.ev(`teste.ir(${a.x}, ${a.z})`); await espera(700);
  await t.ev("teste.acao()"); await espera(700);
}
const carregando = await t.ev("teste.inventario.carregando()"), slots = await t.ev(SLOTS);
ok(carregando.length >= 1 && slots.includes(carregando[0]), `pegou "${carregando[0]}": está na mochila e na barra (${slots.join(", ")})`);
ok(await t.ev("teste.missoes.etapaInfo().tipo") === "pegar", "a missão continua na etapa de pegar (a mochila não muda a jogabilidade)");
if (FOTOS) await t.foto(`${FOTOS}/barra-carregando.png`);
await t.ev("teste.missoes.largar()"); await espera(500);
ok((await t.ev("teste.inventario.carregando().length")) === 0 && (await t.ev(SLOTS)).length === 0, "largar a missão tira o que estava sendo carregado");
// ---------- missão concluída deixa presentes guardados: o semeador dá as sementes e a Bíblia (história da Bíblia)
await t.ev('teste.ganharMissao("semeador")'); await espera(1500);
ok(await t.ev('teste.inventario.tem("sementes") && teste.inventario.tem("biblia")'), "o semeador deixa as sementes e a Bíblia na mochila");
ok(await t.ev('teste.falasDitas.includes("rp-item")'), 'a anfitriã avisa do item novo ("rp-item")');
const s2 = await t.ev(SLOTS);
ok(s2.includes("sementes") && s2.includes("biblia"), `a barra mostra os itens guardados (${s2.join(", ")})`);
// tocar num item: nome e para que serve; a Bíblia mostra um versículo que a criança já aprendeu
await t.ev('document.querySelector(\'.hud-barra .hud-slot[data-item="sementes"]\').click()'); await espera(400);
let info = await t.ev(`(() => { const e = document.querySelector(".hud-item-info"); return e && !e.hidden ? e.textContent : ""; })()`);
ok(/Sementes/.test(info) && /semeador|terra/i.test(info), `tocar nas sementes mostra o nome e o que faz (${info.replace(/\\s+/g, " ").trim().slice(0, 70)})`);
await t.ev('document.querySelector(\'.hud-barra .hud-slot[data-item="biblia"]\').click()'); await espera(400);
info = await t.ev(`(() => { const e = document.querySelector(".hud-item-info"); return e && !e.hidden ? e.textContent : ""; })()`);
ok(/Bíblia/.test(info) && /«.+»/.test(info), `a Bíblia mostra um versículo aprendido (${info.replace(/\\s+/g, " ").trim().slice(0, 80)})`);
if (FOTOS) await t.foto(`${FOTOS}/barra-biblia.png`);
await t.ev('document.querySelector(\'.hud-barra .hud-slot[data-item="biblia"]\').click()'); await espera(300);
ok(await t.ev('document.querySelector(".hud-item-info").hidden'), "tocar de novo fecha a informação");
// ---------- app Mochila do Rabisfone
await t.ev('document.querySelector(\'.hud-btn[data-hud="inventario"]\').click()'); await espera(600);
const app = await t.ev(`({ app: document.querySelector(".rf-aparelho")?.dataset.app, itens: [...document.querySelectorAll(".rf-tela [data-item]")].map((b) => b.dataset.item) })`);
ok(app.app === "inventario" && app.itens.includes("sementes") && app.itens.includes("biblia"), `app Mochila lista os itens (${app.itens.join(", ")})`);
await t.ev('document.querySelector(\'.rf-tela [data-item="sementes"]\').click()'); await espera(300);
ok(/Sementes/.test(await t.ev('document.querySelector(".rf-inv-info")?.textContent ?? ""')), "no app, tocar no item mostra a descrição");
if (FOTOS) await t.foto(`${FOTOS}/app-mochila.png`);
await t.ev("teste.fone.fechar()"); await espera(300);
// ---------- fica no save do perfil e volta ao recarregar
ok(await t.ev('Boolean(teste.salvo.inventario?.itens?.sementes)'), "o inventário está no save do perfil");
await t.cmd("Page.reload"); await ate(t, CARREGOU); await espera(1500);
ok(await t.ev('teste.inventario.tem("sementes") && teste.inventario.tem("biblia")') && (await t.ev(SLOTS)).includes("sementes"), "depois de recarregar a mochila continua igual");
// ---------- save antigo: missões feitas antes da mochila existir dão os presentes ao entrar
await t.ev(`(() => { const s = teste.salvo; delete s.inventario; s.missoesFeitas = ["rute", "fogo"]; s.selos = s.missoesFeitas; teste.gravarSalvo(s); })()`);
await t.cmd("Page.reload"); await ate(t, CARREGOU); await espera(1500);
ok(await t.ev('teste.inventario.tem("espiga") && teste.inventario.tem("extintor") && teste.inventario.tem("biblia")'), "save antigo: Rute dá a espiga e a Bíblia, os bombeiros dão o extintor");
ok(!(await t.ev('teste.falasDitas.includes("rp-item")')), "save antigo: sem a fala de item novo ao entrar");
const erros = errosDeVerdade(t);
ok(!erros.length, `sem erros no console (${erros.slice(0, 2).join(" | ")})`);
await t.fechar();

clearTimeout(vigia);
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
