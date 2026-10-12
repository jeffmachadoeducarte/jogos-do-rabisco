// Teste da Banda do Rabisco: abertura, controle, fase 1 completa via window.teste e fase 10 carregando.
import { abrir, espera } from "./cdp.mjs";
const BASE = process.argv[2] || "http://localhost:8082";
let falhou = false;
const ok = (cond, msg) => { console.log(`${cond ? "✓" : "✗"} ${msg}`); if (!cond) falhou = true; };

const t = await abrir(`${BASE}/jogos/banda-do-rabisco/?teste`, { mobile: true, largura: 1180, altura: 820 });
await espera(3500);
ok(t.erros.length === 0, `abre sem erros ${t.erros.join(" | ")}`);
ok(await t.ev(`!!document.querySelector(".botao-voltar")`), "abertura tem botão voltar");
ok(await t.ev(`document.querySelectorAll(".casca-nivel").length === 10`), "10 fases na abertura");

await t.toque(".casca-nivel");
await espera(800);
ok(await t.ev(`teste.jogo.estado === "jogando" && teste.jogo.nivel === 1`), "fase 1 começa pelo botão de nível");
ok(await t.ev(`document.querySelectorAll("#palco .bd-tecla").length === 2`), "fase 1 tem 2 teclas");

// controle: direcional move o foco entre os botões do palco e A toca
await t.conecta();
await t.botao(15);
const f1 = await t.ev(`document.activeElement?.className || ""`);
await t.botao(15);
const f2 = await t.ev(`document.activeElement?.className || ""`);
ok(/bd-|casca/.test(f1 + f2), `controle move o foco (${f1} → ${f2})`);
await t.botao(0);
ok(t.erros.length === 0, "A do controle toca sem erro");

// espera o Rabisco tocar a primeira sequência e completa a fase
await espera(2500);
ok(await t.ev(`teste.sequencia().length >= 1`), "o Rabisco montou uma sequência");
let vitoria = false;
for (let i = 0; i < 20 && !vitoria; i++) {
  await t.ev(`teste.repetirCerto()`);
  await espera(2200);
  vitoria = await t.ev(`!document.querySelector(".casca-vitoria").classList.contains("escondido")`);
}
ok(vitoria, "fase 1 completa mostra a vitória");
// estrelas: 3 sem erros, 2 com até 2, 1 com mais (o A do controle pode ter tocado errado antes)
ok(await t.ev(`(() => { const e = teste.erros, esp = e === 0 ? 3 : e <= 2 ? 2 : 1;
  return document.querySelectorAll(".casca-vitoria .estrelas span:not(.apagada)").length === esp; })()`), "estrelas conforme os erros");

// erro não pune: toca a peça errada e o Rabisco repete
await t.ev(`location.href = location.pathname + "?teste&nivel=2"`);
await espera(5000);
const errou = await t.ev(`(async () => {
  for (let i = 0; i < 40 && teste.modo !== "vez"; i++) await new Promise(r => setTimeout(r, 200));
  const s = teste.sequencia(); const n = document.querySelectorAll("#palco .bd-tecla").length;
  teste.tocar((s[0] + 1) % n); // peça errada
  const balancou = document.querySelector(".balanca") !== null;
  for (let i = 0; i < 40 && teste.modo !== "ouvindo"; i++) await new Promise(r => setTimeout(r, 100));
  return balancou && teste.erros === 1 && teste.modo === "ouvindo" && teste.sequencia().join() === s.join();
})()`);
ok(errou, "erro balança o botão e o Rabisco repete a mesma sequência");

await t.ev(`location.href = location.pathname + "?teste&nivel=10"`);
await espera(3500);
ok(await t.ev(`teste.jogo.nivel === 10 && document.querySelectorAll("#palco .bd-tecla").length === 8 && !!document.querySelector(".holofote")`), "fase 10 carrega (8 teclas, palco com holofotes)");
ok(!(await t.transborda()), "sem rolagem lateral");
ok(t.erros.length === 0, `sem erros no fim ${t.erros.join(" | ")}`);
await t.fechar();
process.exit(falhou ? 1 : 0);
