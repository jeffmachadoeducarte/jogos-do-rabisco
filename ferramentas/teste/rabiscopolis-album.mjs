// Rabiscolândia: o Álbum de figurinhas (app "Álbum" do Rabisfone). Confere, num aparelho novo (perfil do Chrome vazio):
//  - visitar o lugar ou a loja do parceiro dá a figurinha; concluir missão dá a do versículo e a de quem pediu; abrir o baú do dia dá uma surpresa;
//  - nada duplica (repetir não muda a contagem nem paga bônus de novo);
//  - completar uma página rende 30 Rabiscoins uma vez só, e a contagem "x de y" aparece no app;
//  - tudo continua depois de recarregar a página (localStorage pelo salvar.js);
//  - a página de Parceiros tem as 14 lojas com o nome e o @ iguais aos de src/parceiros.js;
//  - o cartão voando aparece com a figurinha nova; chamadas de desenho dentro do orçamento; sem erro de console.
// Uso: node --experimental-websocket ferramentas/teste/rabiscopolis-album.mjs <http://localhost:porta> [pasta das fotos]
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const [BASE = "http://localhost:8099", PASTA = fileURLToPath(new URL("../../.claude/tmp/album/", import.meta.url))] = process.argv.slice(2);
const OUT = PASTA.endsWith("/") ? PASTA : `${PASTA}/`;
mkdirSync(OUT, { recursive: true });
const URL_JOGO = `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo&hoje=2026-11-03`;
const CEL = { mobile: true, largura: 844, altura: 390, agente: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1" };
const ate = async (t, expr, ms = 90000, passo = 150) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)|favicon|fonts\.g/.test(e));
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
async function esperarJogo(t) {
  if (!(await ate(t, "Boolean(window.teste?.vivo && window.teste.mundo && window.teste.rabisco && window.teste.album)"))) throw new Error("o jogo não abriu: " + t.erros.join(" | "));
  await espera(2500);
}
const A = "teste.album.album";
const TEM = (id) => `${A}.tem(${JSON.stringify(id)})`;
const TOTAL = `${A}.total()`;
const SALDO = "teste.Rabiscoins.saldo()";

// ================================================================ TV/computador
{
  const t = await abrir(URL_JOGO, { largura: 1280, altura: 720 });
  await esperarJogo(t);
  ok(await t.ev("teste.album.album.paginas().length") === 4, "o álbum tem 4 páginas");
  const tam = await t.ev("teste.album.album.paginas().map((p) => [p.id, p.figs.length])");
  console.log("páginas:", JSON.stringify(tam));
  ok(await t.ev(`${A}.paginas().find((p) => p.id === 'parceiros').figs.length`) === 14, "página de Parceiros com as 14 lojas");

  // ---- visita: o lugar do mapa
  const antes = await t.ev(TOTAL);
  const pad = await t.ev("(() => { const l = teste.mundo.lugares.find((q) => q.id === 'padaria'); return [l.x, l.z]; })()");
  await t.ev("teste.ir(0, 200); teste.olhar(0)"); await espera(900);
  await t.ev(`teste.ir(${pad[0]}, ${pad[1]})`);
  ok(await ate(t, TEM("l:padaria"), 6000), "chegar na padaria dá a figurinha da Padaria Pão Quentinho");
  ok(await t.ev(TOTAL) > antes, "a contagem subiu");
  // ---- visita: a loja de um parceiro
  const rise = await t.ev("(() => { const l = teste.mundo.lugares.find((q) => q.id === 'parceiro-rise-up'); return [l.x, l.z]; })()");
  await t.ev(`teste.ir(${rise[0]}, ${rise[1]})`);
  ok(await ate(t, TEM("p:rise-up"), 6000), "chegar na loja da Academia Rise Up dá a figurinha dela");

  // ---- missão: versículo + quem pediu
  ok(!(await t.ev(TEM("v:ovelha"))) && !(await t.ev(TEM("a:ovelha"))), "antes da missão não tem as figurinhas da ovelhinha");
  await t.ev("teste.ganharMissao('ovelha')");
  ok(await t.ev(`${TEM("v:ovelha")} && ${TEM("a:ovelha")}`), "concluir a missão dá o versículo e o Pastor Lápis");
  ok(await ate(t, "(() => { const e = document.querySelector('.alb-voa[data-fig=\"v:ovelha\"], .alb-voa[data-fig=\"a:ovelha\"]'); if (!e) return false; e.getAnimations().forEach((a) => { a.pause(); a.currentTime = 1000; }); return true; })()", 30000, 40), "apareceu o cartão voando (da missão)");
  // trava a animação no meio (o computador ocupado atrasa o relógio): o cartão no centro, grande
  await t.ev("document.querySelectorAll('.alb-voa').forEach((e) => e.getAnimations().forEach((a) => { a.pause(); a.currentTime = 1000; }))"); await espera(300);
  await t.foto(`${OUT}1-cartao-chegando-tv.png`);
  await t.ev("document.querySelectorAll('.alb-voa').forEach((e) => e.getAnimations().forEach((a) => a.play()))");

  // ---- baú do dia: figurinha surpresa
  const n0 = await t.ev(TOTAL);
  const r = await t.ev("teste.abrirPresente()");
  ok(r != null && await t.ev(TOTAL) === n0 + 1, "abrir o baú do dia dá 1 figurinha surpresa");
  await t.ev("teste.adiantarBau(8)");

  // ---- não duplica
  const n1 = await t.ev(TOTAL), s1 = await t.ev(SALDO);
  await t.ev("teste.ganharMissao('ovelha')");  await t.ev(`${A}.visitou('padaria'); ${A}.visitou('parceiro-rise-up')`);
  ok(await t.ev(TOTAL) === n1, "repetir missão e visita não duplica figurinha");
  const figs = await t.ev("teste.salvo.album.figs");
  ok(new Set(figs).size === figs.length, "nenhum id repetido no salvamento");

  // ---- página completa: bônus de 30, uma vez só
  const ids = await t.ev(`${A}.paginas().find((p) => p.id === 'lugares').figs.map((f) => f.id)`);
  const faltam = ids.filter((id) => !figs.includes(id));
  const s2 = await t.ev(SALDO);
  for (const id of faltam.slice(0, -1)) await t.ev(`${A}.ganhar(${JSON.stringify(id)})`);
  ok(await t.ev(SALDO) === s2, "faltando uma figurinha, a página ainda não paga bônus");
  const antesUlt = await t.ev(SALDO);
  const ult = await t.ev(`${A}.ganhar(${JSON.stringify(faltam.at(-1))})`);
  ok(ult.pagina?.id === "lugares" && await t.ev(SALDO) === antesUlt + 30, "completar a página de Lugares rende 30 Rabiscoins");
  await t.ev(`teste.album.chegou([${JSON.stringify(ult)}])`); // a festa vem pela tela, como numa visita de verdade
  await t.ev(`${A}.ganhar(${JSON.stringify(faltam.at(-1))})`); await t.ev(`${A}.visitou('padaria')`);
  ok(await t.ev(SALDO) === antesUlt + 30, "repetir não paga o bônus de novo");
  ok(await ate(t, "document.querySelector('.alb-voa') != null || document.querySelector('.rbc-mais') != null", 10000, 80), "a página completa mostra festa (cartão e +30)");
  await espera(5000);

  // ---- pessoas de verdade: UMA figurinha cada na página Amigos (boneco de bloco), ganha com qualquer missão dela
  const PESSOAS = { sabrina: ["alvara", "parceiro-speedy-solucoes"], carina: ["uniformesCarina"], "vovo-leo": ["maletaLeo", "samuelLeo"], marlon: ["parceiro-marlon-maquinas"], samira: ["parceiro-ballet-e-cia"], albino: ["parceiro-construrenova"], regina: ["parceiro-sitio-floresca", "parceiro-sitio-floresca-duck", "parceiro-sitio-floresca-comida", "parceiro-sitio-floresca-horta", "parceiro-sitio-floresca-rocar", "parceiro-sitio-floresca-kids"] };
  const amigosIds = await t.ev(`${A}.paginas().find((p) => p.id === 'amigos').figs.map((f) => f.id)`);
  ok(await t.ev("teste.album.album.paginas().reduce((n, p) => n + p.figs.length, 0)") === 162, "o álbum tem 162 figurinhas no total (139 + 5 pessoas + Construrenova: parceira, Seu Albino, Pedreiro Caderno e versículo + Sítio Floresça: parceira, Tia Regina, pata Ale, Duck e dois versículos + as 4 missões novas do sítio: galinhas, hortinha, roçador, balanço de pneu e quatro versículos)");
  for (const [pes, ms] of Object.entries(PESSOAS)) {
    ok(amigosIds.filter((id) => id === `a:pessoa-${pes}`).length === 1, `a página Amigos tem exatamente 1 figurinha de ${pes}`);
    ok(!(await t.ev(TEM(`a:pessoa-${pes}`))), `${pes}: antes da missão não tem a figurinha`);
    await t.ev(`teste.ganharMissao(${JSON.stringify(ms[0])})`);
    ok(await t.ev(TEM(`a:pessoa-${pes}`)), `${pes}: concluir ${ms[0]} dá a figurinha`);
    for (const m of ms.slice(1)) await t.ev(`teste.ganharMissao(${JSON.stringify(m)})`);
    await t.ev(`teste.ganharMissao(${JSON.stringify(ms[0])})`);
    ok((await t.ev("teste.salvo.album.figs")).filter((x) => x === `a:pessoa-${pes}`).length === 1, `${pes}: outra missão dela (e repetir) não duplica`);
  }
  // save antigo: missão já concluída antes de a figurinha existir; abrir o álbum entrega, uma vez, sem erro
  // (teste.salvo é uma cópia lida do localStorage: o save antigo é escrito lá e o jogo recarregado)
  await t.ev("(() => { const k = 'rabisco.rabiscopolis.v1', s = JSON.parse(localStorage.getItem(k)); s.album.figs = s.album.figs.filter((x) => !x.startsWith('a:pessoa-')); s.missoesFeitas = [...new Set([...(s.missoesFeitas ?? []), 'alvara', 'uniformesCarina', 'maletaLeo', 'samuelLeo', 'parceiro-marlon-maquinas', 'parceiro-ballet-e-cia', 'parceiro-speedy-solucoes', 'parceiro-construrenova', 'parceiro-sitio-floresca', 'parceiro-sitio-floresca-duck', 'parceiro-sitio-floresca-comida', 'parceiro-sitio-floresca-horta', 'parceiro-sitio-floresca-rocar', 'parceiro-sitio-floresca-kids'])]; localStorage.setItem(k, JSON.stringify(s)); })()");
  await t.cmd("Page.reload"); await esperarJogo(t);
  ok(!(await t.ev(TEM("a:pessoa-marlon"))), "save antigo simulado: sem as figurinhas das pessoas");
  ok((await t.ev("teste.salvo.missoesFeitas")).includes("alvara"), "save antigo simulado: missões já concluídas");
  await t.ev("teste.fone.abrir('album')"); await espera(600);
  ok(await t.ev(Object.keys(PESSOAS).map((p) => TEM(`a:pessoa-${p}`)).join(" && ")), "abrir o álbum entrega as figurinhas das pessoas de missões antigas");
  const fg = await t.ev("teste.salvo.album.figs");
  ok(new Set(fg).size === fg.length, "save antigo: nenhum id repetido depois de recuperar");
  await t.ev("document.querySelector('.alb-aba[data-pagina=amigos]').click()"); await espera(2500);
  const cartoes = await t.ev("[...document.querySelectorAll('.alb-fig.tem')].map((b) => b.dataset.fig).filter((id) => id.startsWith('a:pessoa-'))");
  ok(cartoes.length === 7 && new Set(cartoes).size === 7, `a página Amigos mostra os 7 cartões das pessoas (${cartoes.length})`);
  await t.ev("document.querySelector('.rf-tela').scrollTop = 99999"); await espera(300);
  await t.foto(`${OUT}8-amigos-pessoas-tv.png`);
  await t.ev("teste.fone.fechar()");

  // ---- o app no Rabisfone: contagem "x de y" e os @
  await t.ev("teste.fone.abrir('album')"); await espera(600);
  const resumo = await t.ev("document.querySelector('.alb-resumo')?.textContent");
  const total = await t.ev(`teste.album.album.total()`);
  ok(new RegExp(`${total} de \\d+`).test(resumo ?? ""), `o app mostra "x de y": ${resumo?.slice(0, 40)}`);
  const abas = await t.ev("[...document.querySelectorAll('.alb-aba')].map((b) => b.textContent)");
  ok(abas.length === 4 && abas.some((a) => /14 de 14|\d+ de 14/.test(a)), `4 abas com contagem: ${abas.join(" | ")}`);
  ok(abas.some((a) => /Lugares.*(\d+) de \1/.test(a)), "a aba Lugares aparece completa");
  await t.ev("document.querySelector('.alb-aba[data-pagina=parceiros]').click()"); await espera(500);
  const arrobas = await t.ev("[...document.querySelectorAll('.alb-fig')].map((b) => b.getAttribute('aria-label'))");
  const esperado = await t.ev("teste.PARCEIROS.map((p) => [p.nome, p.instagram])");
  ok(arrobas.length === 14, "14 cartões na página de Parceiros");
  const tem = await t.ev("[...document.querySelectorAll('.alb-fig.tem')].map((b) => b.getAttribute('aria-label'))");
  const riseLbl = tem.find((l) => l.startsWith("Academia Rise Up"));
  ok(riseLbl === `Academia Rise Up, @${esperado.find(([n]) => n === "Academia Rise Up")[1]}`, `@ da Rise Up igual ao de src/parceiros.js (${riseLbl})`);
  // todos os 12: o @ de cada um vem de PARCEIROS (confere ganhando todos e lendo os rótulos)
  await t.ev("teste.PARCEIROS.forEach((p) => teste.album.album.ganhar('p:' + p.id))");
  await t.ev("document.querySelector('.alb-aba[data-pagina=amigos]').click(); document.querySelector('.alb-aba[data-pagina=parceiros]').click()"); await espera(400);
  const todos = await t.ev("[...document.querySelectorAll('.alb-fig.tem')].map((b) => b.getAttribute('aria-label'))");
  ok(esperado.every(([n, ig]) => todos.includes(`${n}, @${ig}`)), "os 12 parceiros aparecem com nome e @ exatamente iguais aos de src/parceiros.js");
  await t.foto(`${OUT}2-parceiros-tv.png`);
  await t.ev("document.querySelector('.alb-aba[data-pagina=versiculos]').click()"); await espera(500);
  await t.foto(`${OUT}3-versiculos-tv.png`);
  await t.ev("teste.fone.fechar()");

  // ---- persistência
  const antesRec = await t.ev("JSON.stringify(teste.salvo.album)");
  const saldoRec = await t.ev(SALDO);
  await t.cmd("Page.reload"); await esperarJogo(t);
  ok(await t.ev("JSON.stringify(teste.salvo.album)") === antesRec, "o álbum é o mesmo depois de recarregar");
  ok(await t.ev(`${TEM("l:padaria")} && ${TEM("p:rise-up")} && ${TEM("v:ovelha")}`), "o jogo recarregado lembra das figurinhas");
  ok(await t.ev(SALDO) === saldoRec, "o saldo de Rabiscoins também ficou");
  await t.ev(`${A}.ganhar('l:padaria')`); await t.ev(`${A}.visitou('padaria')`);
  ok(await t.ev(SALDO) === saldoRec, "depois de recarregar, repetir a página completa não paga de novo");

  // ---- orçamento de desenho
  await t.ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(1200);
  const calls = (await t.ev("teste.medir().total")).calls;
  ok(calls <= 250, `TV, praça: ${calls} chamadas (≤ 250)`);
  const er = errosDeVerdade(t);
  ok(!er.length, `TV sem erro de console ${er.slice(0, 3).join(" | ")}`);
  await t.fechar();
}

// ================================================================ celular
{
  const t = await abrir(URL_JOGO, CEL);
  await esperarJogo(t);
  await t.ev("teste.ganharMissao('lanche')");
  ok(await ate(t, "(() => { const e = document.querySelector('.alb-voa[data-fig=\"v:lanche\"], .alb-voa[data-fig=\"a:lanche\"]'); if (!e) return false; e.getAnimations().forEach((a) => { a.pause(); a.currentTime = 1000; }); return true; })()", 30000, 60), "celular: cartão voando (da missão, depois do da praça)");
  await t.ev("document.querySelectorAll('.alb-voa').forEach((e) => e.getAnimations().forEach((a) => { a.pause(); a.currentTime = 1000; }))"); await espera(300);
  await t.foto(`${OUT}4-cartao-chegando-celular.png`);
  await t.ev("document.querySelectorAll('.alb-voa').forEach((e) => e.getAnimations().forEach((a) => a.play()))");
  await t.ev("teste.PARCEIROS.slice(0, 7).forEach((p) => teste.album.album.ganhar('p:' + p.id))");
  await espera(5500);
  await t.ev("teste.fone.abrir('album')"); await espera(700);
  await t.ev("document.querySelector('.rf-tela').scrollTop = 60"); await espera(200);
  await t.foto(`${OUT}5-parceiros-celular.png`);
  await t.ev("document.querySelector('.alb-aba[data-pagina=versiculos]').click()"); await espera(500);
  await t.ev("document.querySelector('.rf-tela').scrollTop = 60"); await espera(200);
  await t.foto(`${OUT}6-versiculos-celular.png`);
  ok(!(await t.transborda()), "celular: a página não rola de lado");
  await t.ev("document.querySelector('.alb-fig').click()"); await espera(500);
  await t.foto(`${OUT}7-detalhe-celular.png`);
  await t.ev("teste.fone.fechar()");
  await t.ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(1200);
  const calls = (await t.ev("teste.medir().total")).calls;
  ok(calls <= 180, `celular, praça: ${calls} chamadas (≤ 180)`);
  const er = errosDeVerdade(t);
  ok(!er.length, `celular sem erro de console ${er.slice(0, 3).join(" | ")}`);
  await t.fechar();
}

console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
