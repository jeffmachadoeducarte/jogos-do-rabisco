// Rabiscolândia: profissões curtas (profissoes.js, profissoes-dados.js). Num aparelho novo, confere:
//  - o app "Trabalhar" do Rabisfone lista as 3 profissões (com o @ exato da Speedy e do Marlon, lido de src/parceiros.js);
//  - Entregador da Speedy Soluções, de ponta a ponta: começa no ponto 💼 da cidade, o carro chega com o cavalete de vidros,
//    5 entregas (casa e obra) parando o carro perto, cada uma rende 6 (+2 chegando no tempo folgado), bônus de 12 no fim,
//    a anfitriã explica na 1ª vez, comemora e depois toca a propaganda já gravada (rp-prop-speedy-solucoes) sem cortar;
//  - Ajudante do Marlon Máquinas: caminhão da reciclagem, 4 coletas (5 cada, as garrafas vão para a caçamba) e o galpão (8),
//    bônus, propaganda rp-prop-marlon-maquinas; a missão do Marlon continua igual;
//  - Bombeiro mirim (começado pelo Rabisfone): sai no meio do turno e fica com o parcial (sem bônus, uniforme tirado);
//    no turno seguinte (sem explicação de novo) apaga 4 focos de fumaça colorida com a mangueira e ajuda o gatinho;
//  - uniforme vestido durante o turno (o chapéu do Ateliê fica escondido, como no capacete da moto) e tirado no fim;
//    o uniforme do turno não fica guardado no aparelho;
//  - setinha e contador no HUD; chamadas de desenho em cada profissão (TV ≤ 250, celular ≤ 180); sem erro de console.
// Uso: node --experimental-websocket ferramentas/teste/rabiscopolis-profissoes.mjs <http://localhost:porta> [pasta das fotos]
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const [BASE = "http://localhost:8756", PASTA = fileURLToPath(new URL("../../.claude/tmp/profissoes/", import.meta.url))] = process.argv.slice(2);
const OUT = PASTA.endsWith("/") ? PASTA : `${PASTA}/`;
mkdirSync(OUT, { recursive: true });
const URL_JOGO = `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo`;
const CEL = { mobile: true, largura: 844, altura: 390, agente: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1" };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(nomes\/)|favicon|fonts\.g/.test(e));
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; return Boolean(c); };
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 12 * 60 * 1000);
const ate = async (t, expr, ms = 20000, passo = 150) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const INSTRUMENTO = `window.__voz = []; { const p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () {
  const e = { src: this.src.replace(/^.*\\/voz\\//, "").replace(/\\.mp3.*$/, ""), ini: performance.now(), fim: null, cortada: false }; window.__voz.push(e);
  const acabou = () => { if (e.fim == null) { e.fim = performance.now(); e.cortada = !this.ended; } };
  this.addEventListener("ended", acabou, { once: true }); this.addEventListener("pause", acabou, { once: true }); return p.call(this); }; }`;
const SALDO = "teste.Rabiscoins.saldo()";
const P = "teste.profissoes";
const insta = Object.fromEntries([...readFileSync(fileURLToPath(new URL("../../src/parceiros.js", import.meta.url)), "utf8").matchAll(/id: "([^"]+)"[^\n]*instagram: "([^"]+)"/g)].map((m) => [m[1], m[2]]));
async function esperarJogo(t) {
  if (!(await ate(t, "Boolean(window.teste?.vivo && window.teste.mundo && window.teste.rabisco && window.teste.profissoes)", 90000))) throw new Error("o jogo não abriu: " + t.erros.join(" | "));
  await espera(2500);
}
const vozes = (t) => t.ev("window.__voz.map((e) => e.src)");
// chamadas de desenho: mediana de 3 quadros (o trânsito e os moradores passando mudam a conta de um quadro para outro)
const calls = async (t) => { const v = []; for (let i = 0; i < 3; i++) { v.push((await t.ev("teste.medir().total")).calls); await espera(350); } return v.sort((a, b) => a - b)[1]; };
// quanto a profissão custa no mesmo quadro: tudo × sem as peças da tarefa, o cavalete e o uniforme
const CUSTO = `(() => { const T = teste, r = T.r3, c = () => { r.render(T.cena, T.cam); return r.info.render.calls; };
  const a = c(); T.profissoes.grupo.visible = false; const cav = T.cena.getObjectByName('cavalete-speedy'); if (cav) cav.visible = false;
  const pecas = [...Object.values(T.rabisco.roupasRP ?? {}).flat(), ...Object.values(T.rabisco.roupas ?? {}).flatMap((q) => q.objs ?? [])];
  for (const o of pecas) o.visible = false; const b = c();
  for (const o of pecas) o.visible = true; if (cav) cav.visible = true; T.profissoes.grupo.visible = true;
  return a - b; })()`;
// estimativa da duração do turno: a rota (do começo, passando por cada tarefa) a ~7 m/s de veículo (ou 4,5 m/s a pé: curvas, sinais,
// procurar o caminho), mais ~15 s por tarefa (parar, a animação, ler o balão) e a fala de começo
const duracao = (tarefas, inicio, veiculo) => { let d = 0, de = inicio; for (const q of tarefas) { d += Math.hypot(q.x - de[0], q.z - de[1]); de = [q.x, q.z]; } return { dist: Math.round(d), seg: Math.round(d / (veiculo ? 7 : 4.5) + tarefas.length * 15 + 10) }; };

let cargas = [];
// faz as tarefas de veículo de um turno: põe o veículo parado em cada destino e espera a tarefa render
async function tarefasDeVeiculo(t, nome, fotos = {}) {
  const idx = await t.ev("teste.veiculos.indexOf(teste.garagemAtual)");
  await t.ev(`teste.entrar(${idx})`); await espera(500);
  const total = await t.ev(`${P}.info().total`);
  const ganhos = []; cargas = [];
  for (let k = 0; k < total; k++) {
    const tf = await t.ev(`${P}.info().tarefa`);
    const alvo = await t.ev("(() => { const b = document.querySelector('.bussola-rp'); return b && !b.hidden ? b.querySelector('.rotulo').textContent : null; })()");
    const hud = await t.ev("document.querySelector('.missao-rp')?.hidden ? null : document.querySelector('.missao-rp').textContent");
    if (k === 0) ok(alvo?.includes(tf.emoji) && hud?.includes(`Tarefa 1 de ${total}`) && hud.includes("🪙"), `${nome}: setinha (“${alvo}”) e contador no HUD (“${hud}”)`);
    const antes = await t.ev(SALDO);
    // para na rua ao lado do destino, de frente pela rua (o lado da rua é o vizinho com a menor distância até ela)
    const L = await t.ev(`(() => { let m = null; for (const [dx, dz] of [[0, -5], [0, 5], [-5, 0], [5, 0]]) { const d = teste.distRua(${tf.x} + dx, ${tf.z} + dz).d; if (!m || d < m.d) m = { dx, dz, d }; } return m; })()`);
    const ang = Math.atan2(L.dz, -L.dx), px = tf.x + L.dx, pz = tf.z + L.dz;
    // chega andando de trás, para a câmera seguir; depois para
    await t.ev(`teste.posVeiculo(${idx}, ${px - Math.sin(ang) * 14}, ${pz - Math.cos(ang) * 14}, ${ang})`); await espera(700);
    if (fotos.antes?.[k]) await t.foto(`${OUT}${fotos.antes[k]}`);
    if (k === 0) { const c = await calls(t), custo = await t.ev(CUSTO); ok(c <= 250, `${nome}, chegando na 1ª tarefa: ${c} chamadas de desenho (TV ≤ 250; a profissão custa ${custo})`); }
    await t.ev(`teste.posVeiculo(${idx}, ${px - Math.sin(ang) * 2}, ${pz - Math.cos(ang) * 2}, ${ang})`);
    if (!(await ate(t, `${P}.info()?.tarefa?.feito || ${P}.info()?.i > ${k} || !${P}.ativa`, 8000))) { ok(false, `${nome}: a tarefa ${k + 1} (${tf.tipo}) não terminou`); return ganhos; }
    await espera(350);
    if (fotos[k]) { await t.foto(`${OUT}${fotos[k]}`); }
    if (tf.tipo === "coleta") { await ate(t, `${P}.info()?.carga >= ${3 * (k + 1)}`, 3000); cargas.push(await t.ev(`${P}.info()?.carga ?? -1`)); }
    if (k === total - 1) await ate(t, `!${P}.ativa`, 9000);
    const c = await calls(t);
    if (c > 250) ok(false, `${nome}, tarefa ${k + 1}: ${c} chamadas de desenho (TV ≤ 250)`);
    ganhos.push((await t.ev(SALDO)) - antes);
    if (k < total - 1) await ate(t, `${P}.info()?.i > ${k}`, 9000);
  }
  return ganhos;
}

// ================================================================ TV/computador
const t = await abrir("about:blank", { largura: 1280, altura: 720 });
try {
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: INSTRUMENTO });
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await esperarJogo(t);
  await t.ev("teste.Rabiscoins.zerar()");

  // ---- Rabisfone: app Trabalhar
  await t.ev("teste.fone.abrir('trabalhar')"); await espera(500);
  const fone = await t.ev(`(() => { const r = document.querySelector('.rabifone'); return { app: r.querySelector('.rf-tela').dataset.app, itens: [...r.querySelectorAll('[data-trabalho]')].map((b) => b.dataset.trabalho), texto: r.querySelector('.rf-tela').textContent }; })()`);
  ok(fone.app === "trabalhar" && fone.itens.join() === "entregador,reciclagem,bombeiro", `Rabisfone › Trabalhar lista as 3 profissões (${fone.itens.join(", ")})`);
  ok(fone.texto.includes(`@${insta["speedy-solucoes"]}`) && fone.texto.includes(`@${insta["marlon-maquinas"]}`) && !/comprar/i.test(fone.texto), `o @ exato da Speedy (@${insta["speedy-solucoes"]}) e do Marlon (@${insta["marlon-maquinas"]}), sem "comprar"`);
  await t.foto(`${OUT}rabifone-trabalhar.png`);
  await t.ev("teste.fone.fechar()");
  const apps = await t.ev("(() => { teste.fone.abrir(); const n = document.querySelectorAll('.rf-app').length; const tem = [...document.querySelectorAll('.rf-app')].some((b) => b.textContent.includes('Trabalhar')); teste.fone.fechar(); return { n, tem }; })()");
  ok(apps.tem && apps.n === 11, `o app 💼 Trabalhar aparece na tela inicial (${apps.n} de 11 apps)`);

  // ---- Entregador da Speedy: ponto 💼 da cidade
  const bases = await t.ev(`${P}.bases()`);
  const bE = bases.find((b) => b.id === "entregador");
  await t.ev(`teste.ir(${bE.x}, ${bE.z + 1}); teste.olhar(Math.PI)`); await espera(700);
  ok((await t.ev(`${P}.bases()`)).find((b) => b.id === "entregador").visivel, "o ponto 💼 do Entregador aparece ao lado da Speedy Soluções");
  const rotE = await t.ev("teste.contexto");
  ok(rotE === "💼 Trabalhar: Entregador", `de perto, a ação é “${rotE}”`);
  const cBase = await calls(t);
  ok(cBase <= 250, `na base da Speedy: ${cBase} chamadas de desenho (TV ≤ 250)`);
  const s0 = await t.ev(SALDO);
  await t.ev("teste.acao()"); await espera(600);
  const infE = await t.ev(`${P}.info()`);
  ok((await t.ev(`${P}.ativa`)) === "entregador" && infE.total === 5 && infE.veiculo?.tipo === "carro" && infE.rack, `turno começou: 5 entregas, carro da Speedy com o cavalete de vidros (${infE.tarefas.map((q) => q.destino).join(", ")})`);
  ok(infE.tarefas.some((q) => q.destino === "casa") && infE.tarefas.some((q) => q.destino === "obra"), "entregas em casas e em obras");
  const uni = await t.ev("({ p: teste.profissao, cab: Boolean(teste.rabisco.roupasRP?.cabeca), chapeu: teste.rabisco.rp?.vis?.chapeu, salvo: teste.salvo.roupas ?? [] })");
  ok(uni.p === "entregador" && uni.cab && uni.chapeu === false && !uni.salvo.includes("entregador"), `uniforme vestido (boné e colete; chapéu do Ateliê escondido: vis.chapeu=${uni.chapeu}); não fica guardado`);
  ok((await vozes(t)).includes("rp-trab-entregador-explica"), "1ª vez: a anfitriã explica a profissão (rp-trab-entregador-explica)");
  const durE = duracao(infE.tarefas, [bE.x, bE.z], true);
  ok(durE.seg >= 150 && durE.seg <= 270, `duração estimada do turno: ${durE.seg} s (${durE.dist} m de rota)`);
  // o prazo é folgado e só para mostrar
  ok(infE.tarefa.prazo >= 45, `tempo folgado da 1ª entrega: ${infE.tarefa.prazo} s`);
  // a pé perto da entrega: lembra de ir de carro
  const gE = await tarefasDeVeiculo(t, "Entregador", { antes: { 1: "entregador-entrega.png" } });
  ok(gE.length === 5 && gE.slice(0, 4).every((g) => g === 8) && gE[4] === 8 + 12, `cada entrega rendeu 6 + 2 no tempo (ganhos: ${gE.join(", ")}; a última inclui o bônus)`);
  await ate(t, `!${P}.ativa`, 9000);
  const fimE = await t.ev(`({ ultimo: ${P}.ultimo, saldo: ${SALDO}, p: teste.profissao, cab: Boolean(teste.rabisco.roupasRP?.cabeca), chapeu: teste.rabisco.rp?.vis?.chapeu })`);
  ok(fimE.ultimo?.completo && fimE.ultimo.ganhou === 5 * 8 + 12 && fimE.saldo - s0 === 52, `turno completo: 5 × 8 + bônus 12 = ${fimE.saldo - s0} Rabiscoins`);
  ok(fimE.p === null && !fimE.cab && fimE.chapeu !== false, "uniforme tirado no fim do turno (o chapéu do Ateliê volta)");
  ok(!(await t.ev("Boolean(teste.garagemAtual?.g.getObjectByName('cavalete-speedy'))")), "o cavalete de vidros saiu do carro");
  ok(await ate(t, `${P}.propagandas.includes('speedy-solucoes')`, 40000), "depois da comemoração, a propaganda da Speedy toca");
  const vE = await t.ev("window.__voz.filter((e) => /rp-trab-entregador-fim|rp-prop-speedy/.test(e.src))");
  const fimV = vE.find((e) => e.src === "rp-trab-entregador-fim"), propV = vE.find((e) => e.src === "rp-prop-speedy-solucoes");
  ok(fimV && propV && !fimV.cortada && propV.ini >= fimV.fim, `comemoração (rp-trab-entregador-fim) e propaganda já gravada (rp-prop-speedy-solucoes) em fila, sem cortar`);
  const balaoE = await t.ev("document.querySelector('.balao-rp').textContent");
  ok(balaoE.includes(`@${insta["speedy-solucoes"]}`), `o balão da propaganda mostra @${insta["speedy-solucoes"]}`);
  await t.ev("teste.sair()"); await espera(300);

  // ---- Ajudante do Marlon Máquinas
  const missaoMarlon = await t.ev("teste.missoes.MISSOES.find((m) => m.id === 'parceiro-marlon-maquinas').etapas.map((e) => e.tipo).join()");
  ok(missaoMarlon === "pegar,cena", "a missão do Marlon continua a mesma (pegar as garrafas e a máquina)");
  const bR = bases.find((b) => b.id === "reciclagem");
  await t.ev(`teste.ir(${bR.x}, ${bR.z - 1}); teste.olhar(0)`); await espera(700);
  ok((await t.ev("teste.contexto")) === "💼 Trabalhar: Ajudante da reciclagem", "ponto 💼 ao lado do galpão da Marlon Máquinas");
  const galpaoLivre = await t.ev("(() => { const g = teste.profissoes.TRABALHOS.find((q) => q.id === 'reciclagem').galpao; return !teste.dentroDeSolido(g[0], g[1]); })()");
  ok(galpaoLivre, "o ponto de descarregar no galpão fica fora de paredes");
  const s1 = await t.ev(SALDO);
  await t.ev("teste.acao()"); await espera(600);
  const infR = await t.ev(`${P}.info()`);
  ok(infR?.id === "reciclagem" && infR.veiculo?.tipo === "reciclagem" && infR.tarefas.map((q) => q.tipo).join() === "coleta,coleta,coleta,coleta,galpao", `turno começou com o caminhão da reciclagem: ${infR?.tarefas.map((q) => q.tipo).join(", ")}`);
  ok((await t.ev("teste.profissao")) === "reciclagem" && (await vozes(t)).includes("rp-trab-reciclagem-explica"), "uniforme de ajudante e a explicação da anfitriã");
  const durR = duracao(infR.tarefas, [bR.x, bR.z], true);
  ok(durR.seg >= 150 && durR.seg <= 270, `duração estimada do turno: ${durR.seg} s (${durR.dist} m de rota)`);
  const gR = await tarefasDeVeiculo(t, "Ajudante do Marlon", { antes: { 0: "reciclagem-coleta.png", 4: "reciclagem-cacamba-cheia.png" }, 4: "reciclagem-galpao.png" });
  ok(cargas.join() === "3,6,9,12", `as garrafas de cada coleta vão para a caçamba (${cargas.join(", ")})`);
  ok(gR.slice(0, 4).every((g) => g === 5) && gR[4] === 8 + 12, `4 coletas de 5, galpão de 8 e bônus de 12 (ganhos: ${gR.join(", ")})`);
  await ate(t, `!${P}.ativa`, 9000);
  const fimR = await t.ev(`({ ultimo: ${P}.ultimo, saldo: ${SALDO}, p: teste.profissao, carga: teste.garagemAtual?.g.userData.carga?.children.length })`);
  ok(fimR.ultimo?.completo && fimR.saldo - s1 === 40 && fimR.p === null && fimR.carga === 0, `turno completo: ${fimR.saldo - s1} Rabiscoins, uniforme tirado, caçamba vazia`);
  ok(await ate(t, `${P}.propagandas.includes('marlon-maquinas')`, 40000), "depois da comemoração, a propaganda do Marlon Máquinas toca (rp-prop-marlon-maquinas)");
  const vR = await t.ev("window.__voz.filter((e) => /rp-trab-reciclagem-fim|rp-prop-marlon/.test(e.src))");
  ok(vR.length === 2 && !vR[0].cortada && vR[1].ini >= vR[0].fim, "comemoração e propaganda em fila, sem cortar");
  ok((await t.ev("document.querySelector('.balao-rp').textContent")).includes(`@${insta["marlon-maquinas"]}`), `o balão mostra @${insta["marlon-maquinas"]}`);
  await t.ev("teste.sair()"); await espera(300);

  // ---- Bombeiro mirim, pelo Rabisfone; sai no meio
  const bB = bases.find((b) => b.id === "bombeiro");
  await t.ev(`teste.ir(${bB.x}, ${bB.z + 2}); teste.olhar(Math.PI)`); await espera(500);
  const s2 = await t.ev(SALDO);
  await t.ev("teste.fone.abrir('trabalhar')"); await espera(300);
  await t.ev("document.querySelector('[data-trabalho=bombeiro]').click()"); await espera(600);
  const infB = await t.ev(`${P}.info()`);
  ok(infB?.id === "bombeiro" && infB.tarefas.map((q) => q.tipo).join() === "foco,foco,foco,foco,gatinho" && (await t.ev("teste.profissao")) === "bombeiro", `Rabisfone começa o Bombeiro mirim: ${infB?.tarefas.map((q) => q.tipo).join(", ")}, de uniforme de bombeiro`);
  ok((await vozes(t)).includes("rp-trab-bombeiro-explica"), "1ª vez: a anfitriã explica o bombeiro mirim");
  const durB = duracao(infB.tarefas, [bB.x, bB.z], false);
  ok(durB.seg >= 150 && durB.seg <= 270, `duração estimada do turno a pé: ${durB.seg} s (${durB.dist} m de rota)`);
  async function apagar(k, foto) {
    const tf = await t.ev(`${P}.info().tarefa`);
    await t.ev(`teste.ir(${tf.x - 3}, ${tf.z + 1.5}); teste.olhar(Math.atan2(3, -1.5))`); await espera(600);
    const rot = await t.ev("teste.contexto");
    if (k === 0) { ok(rot === "💧 Mangueira", `perto da fumaça colorida, a ação é “${rot}”`); const c = await calls(t), custo = await t.ev(CUSTO); ok(c <= 250, `Bombeiro, na fumaça: ${c} chamadas de desenho (TV ≤ 250; a profissão custa ${custo})`); }
    const antes = await t.ev(SALDO);
    await t.ev("teste.acao()"); await espera(250);
    if (foto) await t.foto(`${OUT}${foto}`);
    await ate(t, `${P}.info()?.tarefa?.feito || ${P}.info()?.i > ${k}`, 9000);
    const g = (await t.ev(SALDO)) - antes;
    await ate(t, `${P}.info()?.i > ${k}`, 9000);
    return g;
  }
  const g1 = await apagar(0, "bombeiro-mangueira.png"), g2 = await apagar(1);
  ok(g1 === 6 && g2 === 6, `cada foco apagado rende 6 (${g1}, ${g2})`);
  await t.ev("teste.fone.abrir('trabalhar')"); await espera(300);
  const telaAtiva = await t.ev("document.querySelector('.rf-tela').textContent");
  ok(/2 de 5 tarefas/.test(telaAtiva) && telaAtiva.includes("12"), `com o turno ativo, o Rabisfone mostra o andamento (“${telaAtiva.slice(0, 90)}”)`);
  await t.foto(`${OUT}rabifone-turno-ativo.png`);
  await t.ev("[...document.querySelectorAll('.rf-tela .rf-item')].find((b) => b.textContent.includes('Terminar')).click()"); await espera(600);
  const saiu = await t.ev(`({ ativa: ${P}.ativa, ultimo: ${P}.ultimo, saldo: ${SALDO}, p: teste.profissao })`);
  ok(!saiu.ativa && saiu.ultimo && !saiu.ultimo.completo && saiu.saldo - s2 === 12 && saiu.p === null, `saiu no meio: ficou com o parcial (${saiu.saldo - s2} Rabiscoins, sem bônus) e o uniforme saiu`);
  ok((await vozes(t)).includes("rp-trab-saiu"), "a anfitriã fala que o turno terminou e o que fez ficou com a criança");

  // de novo, até o fim: sem explicação, 4 focos e o gatinho
  await t.ev(`teste.ir(${bB.x}, ${bB.z + 1})`); await espera(400);
  const nExplica = (await vozes(t)).filter((v) => v === "rp-trab-bombeiro-explica").length;
  await t.ev("teste.acao()"); await espera(500);
  ok((await t.ev(`${P}.ativa`)) === "bombeiro" && (await vozes(t)).filter((v) => v === "rp-trab-bombeiro-explica").length === nExplica && (await vozes(t)).includes("rp-trab-comecou"), "2ª vez: sem explicação de novo, só “turno começou”");
  const s3 = await t.ev(SALDO);
  for (let k = 0; k < 4; k++) await apagar(k);
  const tf = await t.ev(`${P}.info().tarefa`);
  ok(tf.tipo === "gatinho", "depois da fumaça, o gatinho na árvore");
  await t.ev(`teste.ir(${tf.pe[0] + 1.5}, ${tf.pe[1] + 2}); teste.olhar(Math.atan2(-4.4, -2.7))`); await espera(600);
  const rotG = await t.ev("teste.contexto");
  ok(rotG === "🪜 Ajudar o gatinho", `perto da árvore, a ação é “${rotG}”`);
  const cG = await calls(t); ok(cG <= 250, `Bombeiro, na árvore do gatinho: ${cG} chamadas de desenho (TV ≤ 250)`);
  await t.ev("teste.acao()"); await espera(800);
  await t.foto(`${OUT}bombeiro-gatinho.png`);
  await ate(t, `!${P}.ativa`, 9000);
  const fimB = await t.ev(`({ ultimo: ${P}.ultimo, saldo: ${SALDO}, p: teste.profissao })`);
  ok(fimB.ultimo?.completo && fimB.saldo - s3 === 4 * 6 + 8 + 12 && fimB.p === null, `turno completo: 4 × 6 + gatinho 8 + bônus 12 = ${fimB.saldo - s3}; uniforme tirado`);
  await espera(1500);
  ok((await vozes(t)).includes("rp-trab-bombeiro-fim") && !(await t.ev(`${P}.propagandas`)).some((x) => !["speedy-solucoes", "marlon-maquinas"].includes(x)), "a anfitriã comemora o fim (bombeiro não tem propaganda)");
  const turnos = await t.ev("teste.salvo.trabalhos");
  ok(turnos?.turnos?.entregador === 1 && turnos.turnos.reciclagem === 1 && turnos.turnos.bombeiro === 1 && turnos.vistos.length === 3, `turnos completos guardados no aparelho: ${JSON.stringify(turnos?.turnos)}`);
  // nenhuma fala de pessoa/parceiro: todo balão das profissões é da anfitriã
  const err = errosDeVerdade(t);
  ok(err.length === 0, `sem erro de console${err.length ? ": " + err.slice(0, 4).join(" | ") : ""}`);
} catch (e) { ok(false, "TV: " + e.message); }
await t.fechar();

// ================================================================ celular: chamadas de desenho em cada profissão
const c = await abrir(URL_JOGO, CEL);
try {
  await esperarJogo(c);
  const bases = await c.ev(`${P}.bases()`);
  for (const b of bases) {
    await c.ev(`teste.sair(); teste.ir(${b.x}, ${b.z + (b.id === "reciclagem" ? -1 : 1)}); teste.olhar(${b.id === "reciclagem" ? 0 : "Math.PI"})`); await espera(900);
    const c0 = await calls(c);
    ok(c0 <= 180, `celular, base ${b.id}: ${c0} chamadas de desenho (≤ 180)`);
    await c.ev(`${P}.comecar("${b.id}")`); await espera(800);
    const tf = await c.ev(`${P}.info().tarefa`);
    const veic = await c.ev(`${P}.info().veiculo`);
    if (veic) {
      const idx = await c.ev("teste.veiculos.indexOf(teste.garagemAtual)");
      const L = await c.ev(`(() => { let m = null; for (const [dx, dz] of [[0, -5], [0, 5], [-5, 0], [5, 0]]) { const d = teste.distRua(${tf.x} + dx, ${tf.z} + dz).d; if (!m || d < m.d) m = { dx, dz, d }; } return m; })()`);
      const ang = Math.atan2(L.dz, -L.dx);
      await c.ev(`teste.entrar(${idx}); teste.posVeiculo(${idx}, ${tf.x + L.dx - Math.sin(ang) * 10}, ${tf.z + L.dz - Math.cos(ang) * 10}, ${ang})`);
    }
    else await c.ev(`teste.ir(${tf.x - 3}, ${tf.z + 1.5}); teste.olhar(Math.atan2(3, -1.5))`);
    await espera(1200);
    const c1 = await calls(c), custo = await c.ev(CUSTO);
    ok(c1 <= 180, `celular, ${b.id} na 1ª tarefa (${tf.tipo}): ${c1} chamadas de desenho (≤ 180; a profissão custa ${custo})`);
    ok(custo <= 16, `celular, ${b.id}: tarefa + uniforme${veic ? " + carga" : ""} custam ${custo} chamadas (≤ 16)`);
    if (b.id === "bombeiro") { await c.foto(`${OUT}celular-bombeiro.png`); }
    await c.ev(`${P}.terminar()`); await espera(300);
  }
  const err = errosDeVerdade(c);
  ok(err.length === 0, `celular sem erro de console${err.length ? ": " + err.slice(0, 4).join(" | ") : ""}`);
} catch (e) { ok(false, "celular: " + e.message); }
await c.fechar();

clearTimeout(vigia);
console.log(`\nfotos em ${OUT}`);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
