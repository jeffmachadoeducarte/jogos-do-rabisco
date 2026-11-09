// Rabiscolândia (Mundo Vivo, etapa 10): nível e XP (nivel.js) e as conquistas (conquistas.js).
//  - começa no nível 1 com a barra vazia; concluir uma missão dá XP (missão + figurinhas) e a conquista "Primeira missão";
//  - a mesma chave nunca conta duas vezes; subir de nível atualiza o HUD, toca a festinha e a anfitriã fala "rp-nivel-N";
//  - o XP fica no save do perfil e volta depois de recarregar; o presente do dia dá XP;
//  - save antigo (sem xp, com missões feitas e figurinhas) entra com o XP calculado e as conquistas, sem festinha;
//  - o app Conquistas do Rabisfone lista os selos (feitos e por fazer) e o menu Conquistas do HUD leva até ele.
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/xp.mjs [http://localhost:8097] [pasta-das-fotos]
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
const CARREGOU = "Boolean(window.teste?.vivo && window.teste.nivel && window.teste.conquistas && window.teste.hud)";
const INFO = "teste.nivel.info()";
const HUD = `({ nivel: document.querySelector(".hud-niv i").textContent, xp: document.querySelector(".hud-xp i").style.width })`;

const t = await abrir("about:blank", { largura: 1280, altura: 720 });
await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: FAMILIA });
await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
ok(await ate(t, CARREGOU), "carregou com nível, conquistas e HUD");
await espera(1500);
let i = await t.ev(INFO), h = await t.ev(HUD);
ok(i.nivel === 1 && i.total === 0 && i.meta === 80 && h.nivel === "1" && (h.xp === "0%" || h.xp === ""), `começa no nível 1 com 0 XP (meta 80); HUD nível ${h.nivel}, barra ${h.xp || "0%"}`);
// ---------- missão concluída: XP da missão + figurinhas + conquista "Primeira missão"
await t.ev('teste.ganharMissao("ovelha")'); await espera(1200);
i = await t.ev(INFO); h = await t.ev(HUD);
const XP = await t.ev("teste.nivel.XP");
ok(await t.ev('teste.nivel.tem("missao:ovelha")') && i.total >= XP.missao, `missão concluída rende XP: ${i.total} pontos (missão ${XP.missao} + figurinhas + conquista)`);
ok(await t.ev('teste.conquistas.feitas().includes("primeira-missao")') && await t.ev('teste.nivel.tem("conquista:primeira-missao")'), `conquista "Primeira missão" destravada e valendo ${XP.conquista} XP`);
ok(parseInt(h.xp) > 0 && parseInt(h.xp) === Math.round((i.xp / i.meta) * 100), `a barra do HUD acompanha: ${h.xp} (${i.xp} de ${i.meta})`);
const antes = i.total;
await t.ev('teste.ganharMissao("ovelha")'); await espera(600);
i = await t.ev(INFO);
ok(i.total === antes, `a mesma missão de novo não conta de novo (${i.total} = ${antes})`);
// ---------- subir de nível: HUD, festinha e a fala "rp-nivel-2"
await t.ev('teste.nivel.creditar("teste:subir", 120)'); await espera(250);
const comemora = await t.ev('document.querySelector(".hud-jog").classList.contains("sobe") || /Nível 2/.test(document.querySelector(".balao-rp")?.textContent ?? "")');
await espera(700);
i = await t.ev(INFO); h = await t.ev(HUD);
ok(i.nivel === 2 && h.nivel === "2", `subiu para o nível ${i.nivel} (HUD: ${h.nivel})`);
ok(await t.ev('teste.falasDitas.includes("rp-nivel-2")'), `a anfitriã falou "rp-nivel-2" (${await t.ev("teste.falasDitas.join(', ')")})`);
ok(comemora, "o painel comemora (classe sobe ou balão com Nível 2)");
if (FOTOS) await t.foto(`${FOTOS}/nivel-subiu.png`);
// ---------- presente do dia dá XP
const hoje = await t.ev("teste.hoje");
const r = await t.ev("teste.abrirPresente()");
if (r) { await t.ev("teste.adiantarBau(6)"); await espera(600); ok(await t.ev(`teste.nivel.tem("presente:${hoje}")`), `o presente do dia (${hoje}) rende ${XP.presente} XP`); } else ok(true, "sem baú fechado agora: presente pulado");
// ---------- fica no save do perfil e volta ao recarregar
const antesR = await t.ev(INFO);
ok(await t.ev("teste.salvo.xp.total") === antesR.total, `o XP está no save do perfil (${antesR.total})`);
await t.cmd("Page.reload"); await ate(t, CARREGOU); await espera(1500);
i = await t.ev(INFO); h = await t.ev(HUD);
ok(i.total === antesR.total && i.nivel === antesR.nivel && h.nivel === String(antesR.nivel), `depois de recarregar continua: ${i.total} XP, nível ${i.nivel} (antes ${antesR.total}, nível ${antesR.nivel})`);
ok(!(await t.ev('teste.falasDitas.some((k) => k.startsWith("rp-nivel"))')), "recarregar não repete a festinha de nível");
// ---------- app Conquistas e o menu do HUD
await t.ev('document.querySelector(\'.hud-btn[data-hud="conquistas"]\').click()'); await espera(400);
const itens = await t.ev(`[...document.querySelectorAll(".hud-menu .hud-menu-item span:nth-child(2)")].map((e) => e.textContent.trim())`);
ok(itens.includes("Passaporte") && itens.includes("Desafios") && itens.includes("Conquistas"), `menu Conquistas: ${itens.join(" · ")}`);
await t.ev('[...document.querySelectorAll(".hud-menu .hud-menu-item")].find((b) => /Conquistas/.test(b.textContent)).click()'); await espera(600);
const app = await t.ev(`({ app: document.querySelector(".rf-aparelho")?.dataset.app, feitas: document.querySelectorAll(".rf-tela [data-conquista]:not(.rf-item-falta)").length, total: document.querySelectorAll(".rf-tela [data-conquista]").length })`);
ok(app.app === "conquistas" && app.feitas >= 1 && app.total >= 10, `app Conquistas: ${app.feitas} de ${app.total} selos feitos`);
if (FOTOS) await t.foto(`${FOTOS}/conquistas.png`);
await t.ev("teste.fone.fechar()"); await espera(300);
// ---------- save antigo: 5 missões feitas e 2 figurinhas, sem xp → entra calculado, com conquistas e sem festinha
await t.ev(`(() => { const s = teste.salvo; delete s.xp; delete s.conquistas; delete s.inventario; s.missoesFeitas = ["ovelha", "lanche", "vizinho", "noe", "zaqueu"]; s.selos = s.missoesFeitas; s.album = { figs: ["l:praca", "l:igreja"], paginas: [] }; teste.gravarSalvo(s); })()`);
await t.cmd("Page.reload"); await ate(t, CARREGOU); await espera(1800);
i = await t.ev(INFO);
const esperado = 5 * XP.missao + 2 * XP.figurinha; // + conquistas (primeira, cinco, nível 3) por cima
ok(i.total >= esperado && await t.ev('teste.nivel.tem("missao:zaqueu") && teste.nivel.tem("fig:l:igreja")'), `save antigo entra com o XP calculado: ${i.total} (≥ ${esperado}), nível ${i.nivel}`);
ok(await t.ev('teste.conquistas.feitas().includes("cinco-missoes") && teste.conquistas.feitas().includes("primeira-missao")'), "as conquistas do que já foi feito vêm junto");
ok(!(await t.ev('teste.falasDitas.some((k) => k.startsWith("rp-nivel") || k === "rp-conquista")')), "save antigo: sem festinha nem fala de nível/conquista ao entrar");
const erros = errosDeVerdade(t);
ok(!erros.length, `sem erros no console (${erros.slice(0, 2).join(" | ")})`);
await t.fechar();

clearTimeout(vigia);
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
