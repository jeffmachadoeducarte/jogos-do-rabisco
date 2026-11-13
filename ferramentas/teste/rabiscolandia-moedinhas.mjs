// Rabiscolândia: moedinhas pela cidade, faíscas, botão "Sair da missão", crianças de uniforme e o chão da praça.
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/rabiscolandia-moedinhas.mjs [http://localhost:8097]
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8097";
const FOTOS = fileURLToPath(new URL("../../.claude/tmp/moedinhas/", import.meta.url));
mkdirSync(FOTOS, { recursive: true });
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 40000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(250); } return false; };

const t = await abrir(`${BASE}/jogos/rabiscopolis/?teste&jogar&semcadastro`, { largura: 1280, altura: 720 });
ok(await ate(t, "Boolean(window.teste?.vivo && teste.moedasCidade)"), "o jogo abriu com as moedinhas");
await espera(1500);
const total = await t.ev("teste.moedasCidade.total");
ok(total >= 100, `${total} moedinhas espalhadas (pelo menos 100)`);
ok(await t.ev("teste.moedasCidade.pontos.every((p) => !teste.dentroDeSolido(p.x, p.z))"), "nenhuma moedinha dentro de parede, árvore ou poste");
// chão da praça: o Rabisco fica em cima do gramado, e dá para passar entre o canteiro e a árvore
await t.ev("teste.ir(8, 12)"); await espera(500);
ok(Math.abs((await t.ev("teste.j.pos.y")) - 0.18) < 0.02, "na praça o Rabisco pisa em cima do gramado (0,18 m)");
ok(await t.ev("(() => { for (let k = -3; k <= 3; k += 0.25) if (teste.dentroDeSolido(8.24 + k * 0.707, 20.24 - k * 0.707)) return false; return true; })()"), "passagem livre entre o canteiro e a árvore da praça");
// pegar uma moedinha a pé
const saldo0 = await t.ev("teste.Rabiscoins.saldo()");
await t.ev("(() => { const p = teste.moedasCidade.pontos[20]; teste.ir(p.x + 6, p.z); teste.olhar(Math.PI / 2); })()"); await espera(900);
ok((await t.ev("teste.moedasCidade.visiveis")) > 0, "moedinhas aparecem perto do Rabisco");
await t.foto(`${FOTOS}moedinha-perto.png`);
await t.ev("(() => { const p = teste.moedasCidade.pontos[20]; teste.ir(p.x, p.z); })()"); await espera(700);
ok((await t.ev("teste.moedasCidade.pegasHoje")) >= 1, "encostou: pegou a moedinha");
ok((await t.ev("teste.Rabiscoins.saldo()")) === saldo0 + (await t.ev("teste.moedasCidade.pegasHoje")), "cada moedinha vale 1 Rabiscoin");
await t.foto(`${FOTOS}moedinha-pega.png`);
const pegas = await t.ev("teste.moedasCidade.pegasHoje");
await t.ev("(() => { const p = teste.moedasCidade.pontos[20]; teste.ir(p.x + 3, p.z); })()"); await espera(500);
await t.ev("(() => { const p = teste.moedasCidade.pontos[20]; teste.ir(p.x, p.z); })()"); await espera(600);
ok((await t.ev("teste.moedasCidade.pegasHoje")) === pegas, "a mesma moedinha não vale duas vezes no dia");
ok(await t.ev("(teste.salvo.moedasCidade?.ids ?? []).includes(20)"), "o que foi pego fica guardado no aparelho");
// orçamento de desenho na praça (o ponto mais pesado)
await t.ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(1200);
const m = await t.ev("teste.medir().total");
ok(m.calls <= 250, `praça com moedinhas e crianças: ${m.calls} chamadas de desenho (≤ 250)`);
// crianças de uniforme
await t.ev("(() => { const ms = teste.moradores; ms.slice(0, 7).forEach((m, i) => { m.parado = 999; m.p.grupo.position.set((i - 3) * 1.05, 0.03, 40); m.p.grupo.rotation.y = 0; m.p.grupo.visible = true; }); teste.ir(-20, 60); teste.vista([0.3, 1.3, 45.4], [0, 0.75, 40]); })()");
await espera(300);
await t.ev("(() => { teste.moradores.slice(0, 7).forEach((m, i) => { m.p.grupo.position.set((i - 3) * 1.05, 0.03, 40); m.p.grupo.rotation.y = 0; m.p.grupo.visible = true; }); teste.r3.render(teste.cena, teste.cam); })()");
await t.foto(`${FOTOS}criancas-uniforme.png`);
await t.ev("teste.vista(null)");
// botão Sair da missão
await t.ev("teste.ir(0, 33)"); await espera(300);
ok(await t.ev("teste.missoes.aceitar(teste.missoes.MISSOES[0].id)"), "missão aceita");
ok(await ate(t, "document.querySelector('.missao-rp:not([hidden]) .sair-missao-rp')?.textContent.includes('Sair da missão')", 5000), 'aparece o botão "Sair da missão"');
await t.foto(`${FOTOS}sair-da-missao.png`);
await t.ev("document.querySelector('.sair-missao-rp').click()"); await espera(600);
ok((await t.ev("teste.missoes.ativa")) === null, "tocar no botão sai da missão sem terminar");
ok(await t.ev("document.querySelector('.missao-rp').hidden"), "a faixa da missão some");
// igreja: coral de beca; cantar veste a beca, orar guarda
await t.ev("teste.entrarLugar('igreja')"); await espera(1500);
await t.ev("teste.irAoInterativo('coral')"); await espera(200); await t.ev("teste.acao()"); await espera(600);
ok((await t.ev("teste.profissao")) === "coral", "cantar no coral veste a beca");
await t.foto(`${FOTOS}igreja-coral.png`);
await t.ev("teste.irAoInterativo('orar')"); await espera(200); await t.ev("teste.acao()"); await espera(800);
ok((await t.ev("teste.profissao")) === null, "para orar o Pai Nosso a beca é guardada");
ok(!/quiet/i.test(await t.ev("teste.oracao.texto")), "a oração não manda ficar quietinho");
ok(t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e)).length === 0, `sem erro de console ${t.erros.slice(0, 3).join(" | ")}`);
await t.fechar();
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
