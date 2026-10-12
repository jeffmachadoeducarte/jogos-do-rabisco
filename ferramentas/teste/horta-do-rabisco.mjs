// Teste da Horta do Rabisco: abertura, controle nos alvos 3D, fase 1 completa até a vitória, fases 6 e 10.
// Uso: node --experimental-websocket ferramentas/teste/horta-do-rabisco.mjs http://localhost:8082
import { abrir, espera } from "./cdp.mjs";
const BASE = process.argv[2] || "http://localhost:8082";
let falhas = 0;
const ok = (cond, msg, extra = "") => { console.log(cond ? "✓" : "✗", msg, cond ? "" : extra); if (!cond) falhas++; };
const esperaQue = async (t, expr, ms = 8000) => { for (let i = 0; i < ms / 200; i++) { if (await t.ev(expr).catch(() => false)) return true; await espera(200); } return false; };

let t = await abrir(`${BASE}/jogos/horta-do-rabisco/?teste`, { mobile: true, largura: 1180, altura: 820 });
await espera(3500);
ok(await t.ev(`!!document.querySelector(".botao-voltar")`), "abertura tem o botão Voltar");
ok(await t.ev(`document.querySelectorAll(".casca-nivel").length === 10`), "10 fases na abertura");
await t.toque(".casca-nivel");
await espera(5000);
ok(await esperaQue(t, "window.teste.pronto"), "fase 1 começa com objetos para tocar");
ok(await t.ev(`document.querySelectorAll(".alvo3d").length === 3`), "3 alvos na rodada 1");
ok(await t.ev(`!!document.querySelector(".cena3d canvas")`), "cena 3D montada");
await espera(1500);
const objs = await t.ev(`window.teste.objetos()`);
ok(objs.length === 3 && objs.every((o) => o.vis && o.s > 0.5 && o.dentro), "objetos 3D visíveis dentro dos aros (escala > 0.5, na câmera)", JSON.stringify(objs));

// controle: o direcional leva o foco para um alvo 3D e o A escolhe
await t.conecta();
await t.botao(15);
const focoAlvo = await t.ev(`!!document.querySelector(".alvo3d.controle-foco")`);
ok(focoAlvo, "direcional do controle move o foco para um alvo");
const antes = await t.ev(`window.teste.erros + window.teste.rodada`);
await t.botao(0);
await espera(400);
const depois = await t.ev(`window.teste.erros + window.teste.rodada`);
ok(depois > antes, "botão A escolhe o objeto em foco (acerto ou erro conta)");

// completa a fase 1 acertando sempre
for (let i = 0; i < 12 && (await t.ev(`window.teste.jogo.estado`)) === "jogando"; i++) {
  await esperaQue(t, `window.teste.pronto || window.teste.jogo.estado !== "jogando"`, 8000);
  await t.ev(`window.teste.acertar()`);
  await espera(600);
}
await esperaQue(t, `!document.querySelector(".casca-vitoria").classList.contains("escondido")`, 8000);
ok(await t.ev(`!document.querySelector(".casca-vitoria").classList.contains("escondido")`), "vitória da fase 1 aparece");
ok(await t.ev(`window.teste.estagio === 5`), "a planta chegou ao fruto (estágio 5)");
ok(t.erros.length === 0, "sem erros na fase 1", t.erros.join(" ; "));
await t.fechar();

for (const n of [6, 10]) {
  t = await abrir(`${BASE}/jogos/horta-do-rabisco/?teste&nivel=${n}`, { mobile: true, largura: 1180, altura: 820 });
  await espera(5000);
  ok(await esperaQue(t, "window.teste.pronto"), `fase ${n} carrega e pede um objeto`);
  await espera(1500);
  const ob = await t.ev(`window.teste.objetos()`);
  ok(ob.length >= 3 && ob.every((o) => o.vis && o.s > 0.5 && o.dentro), `fase ${n}: objetos visíveis na câmera`, JSON.stringify(ob));
  ok(await t.ev(`window.teste.acertar()`), `fase ${n}: acerto funciona`);
  await espera(3000);
  ok(await t.ev(`window.teste.rodada === 1`), `fase ${n}: rodada avançou`);
  ok(t.erros.length === 0, `fase ${n} sem erros`, t.erros.join(" ; "));
  await t.fechar();
}

console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
