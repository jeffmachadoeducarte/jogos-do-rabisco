// Teste da Viagem do Rabisco: abre, começa a fase 1, usa o controle, completa a fase e abre o mapa (7) e a fase 10.
// Uso: node --experimental-websocket ferramentas/teste/viagem-do-rabisco.mjs http://localhost:8082
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8082";
let falhas = 0;
// espera uma condição na página (a máquina pode estar lenta com outros testes rodando)
async function aguarda(p, expr, ms = 12000) {
  for (let i = 0; i < ms / 250; i++) { try { if (await p.ev(expr)) return true; } catch { /* página carregando */ } await espera(250); }
  return false;
}
const ok = (cond, txt) => { console.log(`${cond ? "✓" : "✗"} ${txt}`); if (!cond) falhas++; };

const t = await abrir(`${BASE}/jogos/viagem-do-rabisco/?teste`, { mobile: true, largura: 1180, altura: 820 });
await espera(3500);
ok(t.erros.length === 0, `abre sem erros ${t.erros.join(" | ")}`);
ok(await t.ev("!!document.querySelector('.botao-voltar')"), "abertura tem o botão voltar");
ok(await t.ev("document.querySelectorAll('.casca-nivel').length") === 10, "10 fases na abertura");

await t.toque(".casca-nivel");
await aguarda(t, "document.querySelectorAll('#palco .op').length === 4");
ok(await t.ev("window.teste.jogo.estado") === "jogando", "fase 1 começa pelo botão de nível");
ok(await t.ev("document.querySelectorAll('#palco .op').length") === 4, "fase 1 tem 4 paisagens");
ok(await t.ev("!!document.querySelector('.postal .rabisco-vg') && !!document.querySelector('.postal .logo-jogo')"), "postal com Rabisco e logo");

// controle: conecta, direcional anda o foco, A toca (pode ser erro ou acerto; os dois contam)
await t.conecta();
await espera(300);
await t.botao(15);
const foco1 = await t.ev("document.activeElement?.dataset?.id || ''");
await t.botao(13);
const foco2 = await t.ev("document.activeElement?.dataset?.id || ''");
ok(Boolean(foco1) && Boolean(foco2) && foco1 !== foco2, `direcional move o foco entre as opções (${foco1} → ${foco2})`);
const antes = await t.ev("window.teste.rodada + window.teste.erros");
await t.botao(0);
await espera(400);
const depois = await t.ev("window.teste.rodada * 1 + window.teste.erros + (document.querySelector('.op.certo, .balanca') ? 1 : 0)");
ok(depois > antes, "A do controle toca na opção");

// completa a fase com acertos forçados
for (let i = 0; i < 10 && (await t.ev("window.teste.jogo.estado")) === "jogando"; i++) await t.ev("window.teste.acertar()");
await aguarda(t, "!document.querySelector('.casca-vitoria')?.classList.contains('escondido')");
ok(await t.ev("!document.querySelector('.casca-vitoria')?.classList.contains('escondido')"), "vitória aparece ao completar a fase 1");
ok(await t.ev("document.querySelector('.casca-vitoria')?.textContent.includes('Deus')"), "vitória da fase 1 agradece pela criação");
ok(t.erros.length === 0, `fase 1 sem erros ${t.erros.join(" | ")}`);
await t.fechar();

// fase 7: mapa do Brasil com 5 regiões tocáveis
const m = await abrir(`${BASE}/jogos/viagem-do-rabisco/?teste&nivel=7`, { mobile: true, largura: 1180, altura: 820 });
ok(await aguarda(m, "document.querySelectorAll('.mapa-brasil .regiao[data-foco]').length === 5"), "fase 7 mostra o mapa com 5 regiões");
ok(await m.ev("window.teste.acertar()"), "fase 7 aceita toque na região certa");
ok(await aguarda(m, "window.teste.rodada === 1"), "fase 7 avança a rodada");
ok(m.erros.length === 0, `fase 7 sem erros ${m.erros.join(" | ")}`);
await m.fechar();

// fase 10: volta ao mundo, completa tudo
const d = await abrir(`${BASE}/jogos/viagem-do-rabisco/?teste&nivel=10`, { mobile: true, largura: 1180, altura: 820 });
ok(await aguarda(d, "window.teste?.jogo.estado === 'jogando' && !!document.querySelector('.painel [data-id]')"), "fase 10 carrega com pedido");
for (let i = 0; i < 10 && (await d.ev("window.teste.jogo.estado")) === "jogando"; i++) await d.ev("window.teste.acertar()");
await aguarda(d, "!document.querySelector('.casca-vitoria')?.classList.contains('escondido')");
ok(await d.ev("!document.querySelector('.casca-vitoria')?.classList.contains('escondido')"), "fase 10 termina em vitória");
ok(d.erros.length === 0, `fase 10 sem erros ${d.erros.join(" | ")}`);
await d.fechar();

console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo!");
process.exit(falhas ? 1 : 0);
