// Teste do Resgate no Parquinho: abre, começa a fase 1, anda e pula com o controle, vence pelo atalho
// de teste e abre as fases 6 (elevadores) e 10. Com FOTOS=pasta também salva as fotos para avaliação.
// Uso: node --experimental-websocket ferramentas/teste/resgate-no-parquinho.mjs http://localhost:8082
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8082";
const FOTOS = process.env.FOTOS || "";
const foto = async (t, nome) => { if (FOTOS) await t.foto(`${FOTOS}/resgate-no-parquinho-${nome}.png`); };
let falhas = 0;
// espera uma condição (a máquina de testes pode estar lenta): devolve o último valor
const ate = async (t, expr, ms = 15000) => { let v; for (let i = 0; i < ms / 250; i++) { try { v = await t.ev(expr); } catch { v = null; } if (v) return v; await espera(250); } return v; };
const ok = (cond, txt) => { console.log(`${cond ? "✓" : "✗"} ${txt}`); if (!cond) falhas++; };
const URL_JOGO = `${BASE}/jogos/resgate-no-parquinho/?teste`;

const t = await abrir(URL_JOGO, { mobile: true, largura: 1180, altura: 820 });
await ate(t, "document.querySelectorAll('.casca-nivel').length === 10 && !!document.querySelector('.botao-voltar')");
await espera(800);
ok(t.erros.length === 0, `abre sem erros ${t.erros.join(" | ")}`);
ok(await t.ev("!!document.querySelector('.botao-voltar')"), "abertura tem o botão voltar");
ok(await t.ev("document.querySelectorAll('.casca-nivel').length") === 10, "10 fases na abertura");
await foto(t, "abertura");

await t.toque(".casca-nivel");
await ate(t, "window.teste?.estado() && document.querySelector('.rg-mundo canvas') && window.teste.jogo.estado === 'jogando'");
await espera(1000);
ok(await t.ev("window.teste.jogo.estado") === "jogando", "fase 1 começa pelo botão de nível");
ok(await t.ev("!!document.querySelector('.rg-mundo canvas')"), "canvas do Phaser montado");
const m1 = await t.ev("JSON.stringify(window.teste.mundo())");
ok(m1 && JSON.parse(m1).escadas >= 3 && JSON.parse(m1).itens === 4, `fase 1 tem escadas e as 4 letras ${m1}`);

// controle: segura o direcional ~1 s (para o lado do meio) e o Rabisco anda
await t.conecta();
await espera(300);
const e0 = await t.ev("window.teste.estado()");
const lado = e0.x > 440 ? 14 : 15; // anda para o meio da tela
await t.ev(`__aperta(${lado}, true)`);
await espera(1500);
await t.ev(`__aperta(${lado}, false)`);
await espera(300);
const e1 = await t.ev("window.teste.estado()");
ok(Math.abs(e1.x - e0.x) > 60, `direcional anda o Rabisco (x ${e0.x.toFixed(0)} → ${e1.x.toFixed(0)})`);

// A: pula (y sobe no meio do pulo)
await t.ev("__aperta(0, true)");
await ate(t, `window.teste.estado().pulos > ${e1.pulos}`, 5000);
await espera(300);
await t.ev("__aperta(0, false)");
const e2 = await t.ev("window.teste.estado()");
ok(e2.pulos > e1.pulos && e2.maiorPulo > 20, `A faz o Rabisco pular (subiu ${e2.maiorPulo.toFixed(0)} unidades)`);
ok(await ate(t, "window.teste.estado().chao", 5000), "Rabisco pousa de novo no chão");
ok(await ate(t, "window.teste.bolas() >= 1", 12000), "bolas rolando pela torre");
ok(await t.ev("window.teste.rabiscoOk()"), "Rabisco 2D continua inteiro e visível depois de andar e pular");
await foto(t, "fase1");

// vence pelo atalho de teste
await t.ev("window.teste.subirAoTopo()");
ok(await ate(t, "!document.querySelector('.casca-vitoria')?.classList.contains('escondido')"), "vitória aparece ao chegar no gatinho");
await espera(1500);
await foto(t, "vitoria");
ok(t.erros.length === 0, `fase 1 sem erros ${t.erros.join(" | ")}`);
await t.fechar();

// fase 6: elevadores
const s = await abrir(`${URL_JOGO}&nivel=6`, { mobile: true, largura: 1180, altura: 820 });
await ate(s, "window.teste?.mundo()");
const m6 = await s.ev("JSON.stringify(window.teste.mundo())");
ok(m6 && JSON.parse(m6).colunas === 2, `fase 6 tem as duas colunas de elevador ${m6}`);
ok(await s.ev("window.teste.jogo.estado") === "jogando", "fase 6 carrega jogando");
ok(s.erros.length === 0, `fase 6 sem erros ${s.erros.join(" | ")}`);
await s.fechar();

// fase 8 (noite) para a foto avançada
if (FOTOS) {
  const o = await abrir(`${URL_JOGO}&nivel=8`, { mobile: true, largura: 1180, altura: 820 });
  await ate(o, "window.teste?.bolas() >= 2", 20000);
  await foto(o, "fase8");
  ok(o.erros.length === 0, `fase 8 sem erros ${o.erros.join(" | ")}`);
  await o.fechar();
  // celular deitado
  const c = await abrir(`${URL_JOGO}&nivel=1`, { mobile: true, largura: 740, altura: 375 });
  await ate(c, "window.teste?.bolas() >= 1", 20000);
  await foto(c, "celular");
  ok(!(await c.transborda()), "celular deitado sem rolagem lateral");
  ok(c.erros.length === 0, `celular sem erros ${c.erros.join(" | ")}`);
  await c.fechar();
}

// fase 10: o topo da escola
const d = await abrir(`${URL_JOGO}&nivel=10`, { mobile: true, largura: 1180, altura: 820 });
await ate(d, "window.teste?.mundo() && window.teste.jogo.estado === 'jogando'");
ok(await d.ev("window.teste.jogo.estado") === "jogando", "fase 10 carrega jogando");
await d.ev("window.teste.coletarTudo()");
await d.ev("window.teste.subirAoTopo()");
ok(await ate(d, "!document.querySelector('.casca-vitoria')?.classList.contains('escondido')", 15000), "fase 10 termina em vitória");
ok(await d.ev("document.querySelector('.casca-vitoria')?.textContent.includes('Deus')"), "vitória da fase 10 fala do cuidado com os animais que Deus criou");
ok(d.erros.length === 0, `fase 10 sem erros ${d.erros.join(" | ")}`);
await d.fechar();

console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo!");
process.exit(falhas ? 1 : 0);
