// Tela de abertura: sem card de catálogo e o JOGAR leva à Rabiscolândia (clique, Enter e A do controle).
// Uso: node --experimental-websocket ferramentas/teste/abertura.mjs [http://localhost:8080]
import { abrir, espera } from "./cdp.mjs";
const B = process.argv[2] || "http://localhost:8080";
let falhas = 0;
const ok = (c, m) => { console.log(c ? "✓" : "✗", m); if (!c) falhas++; };
const ate = async (t, e, ms = 15000) => { const f = Date.now() + ms; while (Date.now() < f) { if (await t.ev(e).catch(() => false)) return true; await espera(250); } return false; };
for (const jeito of ["clique", "enter", "controle"]) {
  const t = await abrir(`${B}/index.html?semcadastro`, { largura: 1280, altura: 720 });
  await ate(t, "document.readyState === 'complete'");
  await espera(1200);
  await espera(400);
  // segura a ida para o jogo e guarda o destino (o jogo pesado travaria o navegador de teste)
  await t.ev(`window.__destino = ""; navigation.addEventListener("navigate", (e) => { if (!e.destination.url.includes("#")) { window.__destino = e.destination.url; e.preventDefault(); } }); true`);
  ok(!(await t.ev("!!document.querySelector('.vitrine, .jogo.breve')")), `${jeito}: sem card de catálogo`);
  if (jeito === "clique") await t.ev(`document.getElementById("jogar").click()`);
  if (jeito === "enter") { await t.ev("document.activeElement.blur(); true"); await t.cmd("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); await t.cmd("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); }
  if (jeito === "controle") { await t.conecta(); await espera(500); ok(await t.ev("document.activeElement?.id === 'jogar'"), "controle: foco no JOGAR"); await t.botao(0); }
  ok(await ate(t, "window.__destino.endsWith('/jogos/rabiscopolis/')"), `${jeito}: abriu jogos/rabiscopolis/`);
  ok(!t.erros.filter((e) => !/assets\/voz/.test(e)).length, `${jeito}: sem erros ${t.erros.join(";")}`);
  await t.fechar();
}
console.log(falhas ? `${falhas} FALHA(S)` : "tudo certo, 0 falhas");
process.exit(falhas ? 1 : 0);
