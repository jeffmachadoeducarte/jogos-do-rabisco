// Rabiscolândia: Presente do dia (baú) e Missão do dia (diario.js, diario-bau.js). Datas simuladas: ?teste&hoje=AAAA-MM-DD
// na URL (primeira entrada) e teste.hoje = "AAAA-MM-DD" com o jogo aberto. Confere, num aparelho novo:
//  - o baú aparece na praça (sem casa) e na porta da casa escolhida, abre pela ação ("🎁 Abrir o presente") e paga 10;
//  - não paga 2 vezes no mesmo dia (nem recarregando); a sequência de 7 dias rende 10, 12, 14, 16, 18, 20 e 40 (bônus) e recomeça;
//  - faltar 1 dia só volta a sequência para o dia 1 (as moedas continuam); relógio voltando no tempo não dá baú nem extra;
//  - a Missão do dia muda com a data, nunca repete a do dia anterior, é das missões que dá para fazer e paga +15 só na
//    primeira conclusão do dia (repetir rende só o normal); a estrela ⭐ aparece no marcador e no Rabifone;
//  - a anfitriã avisa do presente na primeira entrada do dia (depois da fala de boas-vindas, sem cortar) e não repete;
//  - tudo continua depois de recarregar; o calendário de 7 dias no Rabifone; chamadas de desenho (TV ≤ 250, celular ≤ 180)
//    na praça e onde o baú aparece; sem erro de console.
// Uso: node --experimental-websocket ferramentas/teste/rabiscopolis-diario.mjs <http://localhost:porta> [pasta das fotos]
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const [BASE = "http://localhost:8751", PASTA = fileURLToPath(new URL("../../.claude/tmp/diario/", import.meta.url))] = process.argv.slice(2);
const OUT = PASTA.endsWith("/") ? PASTA : `${PASTA}/`;
mkdirSync(OUT, { recursive: true });
const URL_DIA = (d) => `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo&hoje=${d}`;
const CEL = { mobile: true, largura: 844, altura: 390, agente: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1" };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)|favicon|fonts\.g/.test(e));
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; return Boolean(c); };
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 12 * 60 * 1000);
const ate = async (t, expr, ms = 90000, passo = 150) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
async function esperarJogo(t) {
  if (!(await ate(t, "Boolean(window.teste?.vivo && window.teste.mundo && window.teste.rabisco)"))) throw new Error("o jogo não abriu: " + t.erros.join(" | "));
  await espera(2000);
}
// grava o começo e o fim de cada MP3 (a fala do aviso não pode cortar nem ser cortada)
const INSTRUMENTO = `window.__voz = []; { const p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () {
  const e = { src: this.src.replace(/^.*\\/voz\\//, ""), ini: performance.now(), fim: null, cortada: false }; window.__voz.push(e);
  const acabou = () => { if (e.fim == null) { e.fim = performance.now(); e.cortada = !this.ended; } };
  this.addEventListener("ended", acabou, { once: true }); this.addEventListener("pause", acabou, { once: true }); return p.call(this); }; }`;
const SALDO = "teste.Rabiscoins.saldo()";
const DIA = (n) => { const d = new Date(Date.UTC(2026, 10, 3 + n)); return d.toISOString().slice(0, 10); }; // DIA(0) = 2026-11-03
const mudarDia = async (t, d) => { await t.ev("teste.adiantarBau(6)"); await t.ev(`teste.hoje = "${d}"`); await espera(150); };
// abre o baú do dia pelo caminho de verdade (chegar perto e apertar a ação) e espera a animação
async function abrirPelaAcao(t) {
  const b = await t.ev("teste.bau");
  await t.ev(`teste.ir(${b.x - 1.5}, ${b.z + 1.3}); teste.olhar(Math.atan2(1.5, -1.3) + 0.45)`); await espera(500);
  const rot = await t.ev("teste.contexto");
  await t.ev("teste.acao()"); await espera(300);
  return rot;
}
const medir = async (t, rotulo, teto, pontos) => {
  for (const [nome, [x, z, yaw]] of Object.entries(pontos)) {
    await t.ev(`teste.ir(${x}, ${z}); teste.olhar(${yaw})`); await espera(900);
    const c = (await t.ev("teste.medir().total")).calls;
    ok(c <= teto, `${rotulo}, ${nome}: ${c} chamadas de desenho (≤ ${teto})`);
  }
};

let mdDia0 = null;
// ================================================================ TV/computador
{
  const t = await abrir("about:blank", { largura: 1280, altura: 720 });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: INSTRUMENTO });
  await t.cmd("Page.navigate", { url: URL_DIA(DIA(0)) });
  await esperarJogo(t);

  // ---- 1º dia: o baú está na praça, a anfitriã avisa, a ação abre e paga 10
  mdDia0 = await t.ev("teste.missaoDoDia");
  const b0 = await t.ev("teste.bau");
  ok(b0?.estado === "fechado" && Math.hypot(b0.x - 0, b0.z - 12) > 10 && !(b0.x > 18.5 && b0.x < 25 && b0.z > 13 && b0.z < 27), `sem casa, o baú aparece na praça (${b0?.x}, ${b0?.z}), fora do meio (árvore de Natal) e da frente do Ateliê`);
  ok(await ate(t, "window.__voz.some((e) => e.src.startsWith('rp-presente-aviso'))", 30000), "a anfitriã avisa: “Tem presente do dia esperando por você!”");
  ok(await ate(t, "/presente do dia esperando/i.test(document.querySelector('.balao-rp')?.textContent ?? '')", 3000), "o balão mostra o aviso do presente");
  const vozes = await t.ev("window.__voz");
  const intro = vozes.find((e) => e.src.startsWith("rp-intro")), aviso = vozes.find((e) => e.src.startsWith("rp-presente-aviso"));
  ok(intro && aviso && intro.fim != null && aviso.ini >= intro.fim - 30 && !intro.cortada, "o aviso só começa depois que a fala de boas-vindas acaba (sem cortar)");
  await t.ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(900);
  ok(await t.ev("teste.bau.visivel"), "de onde a criança começa (largada), o baú está à vista");
  await t.ev("teste.fone.abrir()"); await espera(400);
  ok(await t.ev("Boolean(document.querySelector('.rabifone .rf-bolinha'))"), "no Rabifone, o app Presente tem a bolinha de presente esperando");
  await t.ev("teste.fone.abrir('presente')"); await espera(500);
  ok(await t.ev("document.querySelectorAll('.rf-dias .rf-dia').length === 7 && document.querySelector('.rf-dia.hoje')?.dataset.dia === '1'"), "o calendário tem 7 dias e hoje é o dia 1");
  await t.foto(`${OUT}rabifone-presente-dia1.png`);
  await t.ev("teste.fone.fechar()");

  const s0 = await t.ev(SALDO);
  const b = await t.ev("teste.bau");
  await t.ev(`teste.ir(${b.x - 1.5}, ${b.z + 1.3}); teste.olhar(Math.atan2(1.5, -1.3) + 0.45)`); await espera(900);
  await t.foto(`${OUT}bau-fechado.png`);
  const rot = await t.ev("teste.contexto");
  ok(rot === "🎁 Abrir o presente", `perto do baú, a ação vira “${rot}”`);
  await t.ev("teste.acao()");
  ok(await ate(t, "teste.bau.estado === 'abrindo' && teste.bau.tampa > 1", 15000, 60), "a tampa abre (animação)");
  await espera(250);
  await t.foto(`${OUT}bau-abrindo.png`);
  ok(await t.ev(SALDO) === s0 + 10, `abrir no 1º dia paga 10 Rabiscoins (${s0} → ${await t.ev(SALDO)})`);
  ok(await ate(t, "Number(document.querySelector('.rbc-contador b')?.textContent) === teste.Rabiscoins.saldo()", 15000), "o contador do HUD sobe com as moedinhas");
  ok(await ate(t, "teste.bau.estado === 'fora'", 40000), "depois da festa o baú afunda e some");
  ok(!(await t.ev("teste.dentroDeSolido(" + b.x + ", " + b.z + ")")), "a colisão do baú saiu junto");

  // ---- mesmo dia: não paga de novo
  await t.ev(`teste.hoje = "${DIA(0)}"`); await espera(200);
  ok(await t.ev("teste.abrirPresente()") === null && await t.ev(SALDO) === s0 + 10 && (await t.ev("teste.bau")).estado === "fora", "no mesmo dia, não tem baú nem paga de novo");
  await t.ev("teste.fone.abrir('presente')"); await espera(400);
  ok(await t.ev("document.querySelector('.rf-dia[data-dia=\"1\"]').classList.contains('pego') && !document.querySelector('.rf-dia.hoje')"), "o calendário marca o dia 1 como pego");
  await t.ev("teste.fone.fechar()");

  // ---- sequência de 7 dias com bônus, e recomeça
  const premios = [];
  for (let n = 1; n <= 7; n++) {
    await mudarDia(t, DIA(n));
    if (!(await ate(t, "teste.bau?.estado === 'fechado'", 5000))) { ok(false, `dia ${DIA(n)}: o baú não apareceu`); break; }
    const antes = await t.ev(SALDO);
    if (n === 6) ok(await abrirPelaAcao(t) === "🎁 Abrir o presente", "no 7º dia o baú abre pela ação também");
    else await t.ev("teste.abrirPresente()");
    premios.push((await t.ev(SALDO)) - antes);
    if (n === 6) { ok(await ate(t, "teste.bau.tampa > 1", 15000, 60), "no 7º dia a tampa abre"); await espera(250); await t.foto(`${OUT}bau-abrindo-dia7.png`); }
  }
  ok(JSON.stringify(premios.slice(0, 6)) === "[12,14,16,18,20,40]", `dias seguidos: 10 → ${premios.slice(0, 6).join(" → ")} (o 7º com bônus: 40)`);
  ok(premios[6] === 10 && (await t.ev("teste.presente")).seq === 1, `depois do 7º dia a sequência recomeça (dia 8 rende ${premios[6]})`);
  await t.ev("teste.fone.abrir('presente')"); await espera(400);
  ok(await t.ev("document.querySelectorAll('.rf-dia.pego').length") === 1, "o calendário voltou ao começo (só o dia 1 pego)");
  await t.ev("teste.fone.fechar()");

  // ---- falta de 1 dia: zera a sequência sem perder nada
  await mudarDia(t, DIA(8));
  await t.ev("teste.abrirPresente()"); // dia 2 da volta nova
  const antesFalta = await t.ev(SALDO);
  await mudarDia(t, DIA(10)); // pulou DIA(9)
  const p = await t.ev("teste.presente");
  ok(p.disponivel && p.seq === 1 && p.premio === 10 && p.pegos.every((x) => !x), "faltou 1 dia: a sequência volta para o dia 1 (calendário limpo)");
  ok(await t.ev(SALDO) === antesFalta, `faltar não tira nenhuma moeda (${antesFalta})`);
  await t.ev("teste.abrirPresente()");
  ok(await t.ev(SALDO) === antesFalta + 10, "e o presente de hoje rende 10");

  // ---- relógio voltando no tempo: nada de baú nem de extra
  await mudarDia(t, DIA(5));
  const v = await t.ev("teste.presente"), saldoV = await t.ev(SALDO);
  ok(v.voltou && !v.disponivel && (await t.ev("teste.bau")).estado === "fora" && await t.ev("teste.abrirPresente()") === null, "relógio voltou para um dia já passado: não aparece baú e não paga");
  ok(await t.ev("teste.missaoDoDia") === null, "relógio voltou: não tem Missão do dia");
  ok(await t.ev("teste.missoes.concluirParaTeste('lanche')") && (await t.ev(SALDO)) - saldoV === 20, "relógio voltou: concluir missão rende só o normal (sem extra)");
  await espera(2600);

  // ---- Missão do dia: muda com a data, não repete a anterior, só das que dá para fazer
  const cand = await t.ev("teste.candidatosDoDia()");
  ok(cand.length >= 10, `${cand.length} missões que dá para fazer agora entram no sorteio`);
  const seq = [];
  for (let n = 11; n <= 30; n++) { await t.ev(`teste.hoje = "${DIA(n)}"`); seq.push(await t.ev("teste.missaoDoDia")); }
  ok(seq.every((id) => cand.includes(id)), "a Missão do dia é sempre uma das que dá para fazer");
  ok(seq.every((id, i) => i === 0 || id !== seq[i - 1]), "nunca repete a missão do dia anterior (20 dias seguidos)");
  ok(new Set(seq).size >= 8, `muda com a data: ${new Set(seq).size} missões diferentes em 20 dias`);

  // extra só na 1ª conclusão do dia
  await mudarDia(t, DIA(31));
  const md = await t.ev("teste.missaoDoDia"), feitas = await t.ev("teste.missoes.feitas");
  const base = feitas.includes(md) ? 5 : 20;
  let s = await t.ev(SALDO);
  // a estrela no marcador de quem pede
  const onde = await t.ev(`teste.missoes.ondePede("${md}")`);
  await t.ev(`teste.ir(${onde.x + 0.5}, ${onde.z + 5.5}); teste.olhar(Math.PI)`); await espera(1800);
  const estrelas = await t.ev("(() => { let n = 0; teste.missoes.grupo.traverse((o) => { if (o.isSprite && o.visible && o.material.map === teste.texMarcaDoDia) n++; }); return n; })()");
  ok(estrelas === 1, `a estrela ⭐ aparece no marcador de quem pede a Missão do dia (${md})`);
  // foto de cima e de lado, para a parede de nenhum prédio tapar
  const npcY = await t.ev(`teste.missoes.npc("${md}", Object.keys(teste.missoes.MISSOES.find((m) => m.id === "${md}").npcs)[0]).y`).catch(() => 0);
  const rotNpc = await t.ev(`(() => { const M = teste.missoes.MISSOES.find((m) => m.id === "${md}"); return M.npcs[Object.keys(M.npcs)[0]].rot ?? 0; })()`);
  const fx = Math.sin(rotNpc), fz = Math.cos(rotNpc); // de frente para quem pede (do lado da rua)
  await t.ev(`teste.vista([${onde.x + fx * 7 + fz * 2}, ${npcY + 3}, ${onde.z + fz * 7 - fx * 2}], [${onde.x}, ${npcY + 1.6}, ${onde.z}])`); await espera(900);
  await t.foto(`${OUT}missao-do-dia-selo.png`);
  await t.ev("teste.vista(null)");
  await t.ev("teste.fone.abrir('passaporte')"); await espera(400);
  ok(await t.ev(`document.querySelector('.rf-lista .rf-item-missao')?.dataset.missao === "${md}" && /Missão do dia/.test(document.querySelector('.rf-item-dodia')?.textContent ?? '')`), "no Passaporte a Missão do dia vem primeiro, com a estrela e o extra");
  await t.foto(`${OUT}rabifone-passaporte-missao-do-dia.png`);
  await t.ev("teste.fone.fechar()");
  ok(await t.ev(`teste.missoes.concluirParaTeste("${md}")`), `concluir a Missão do dia (${md})`);
  ok((await t.ev(SALDO)) - s === base + 15, `a 1ª conclusão do dia paga o normal + 15 (${(await t.ev(SALDO)) - s})`);
  ok(await ate(t, "/Missão do dia/.test(document.querySelector('.rbc-mais')?.textContent ?? '')", 8000, 100), "o “⭐ Missão do dia +15” aparece no ganho");
  await espera(2000);
  s = await t.ev(SALDO);
  await t.ev(`teste.missoes.concluirParaTeste("${md}")`);
  ok((await t.ev(SALDO)) - s === 5, "repetir no mesmo dia rende só o normal (5), sem extra");
  ok((await t.ev("teste.presente")).missao.feita, "o Rabifone mostra a Missão do dia como feita hoje");
  const feitas2 = await t.ev("teste.missoes.feitas"), outra = cand.find((id) => id !== md && !feitas2.includes(id)) ?? cand.find((id) => id !== md);
  s = await t.ev(SALDO);
  await t.ev(`teste.missoes.concluirParaTeste("${outra}")`);
  ok((await t.ev(SALDO)) - s === (feitas2.includes(outra) ? 5 : 20), `outra missão (${outra}) rende só o normal, sem extra`);
  await espera(2600);
  await mudarDia(t, DIA(32));
  const md2 = await t.ev("teste.missaoDoDia");
  s = await t.ev(SALDO);
  await t.ev(`teste.missoes.concluirParaTeste("${md2}")`);
  const ganho2 = (await t.ev(SALDO)) - s;
  ok(md2 !== md && (ganho2 === 20 + 15 || ganho2 === 5 + 15), `no dia seguinte a Missão do dia é outra (${md2}) e o extra volta (+${ganho2})`);
  await espera(2600);

  // ---- persiste depois de recarregar (mesmo dia): moedas, sequência, baú já aberto e extra já pago
  await mudarDia(t, DIA(33));
  await t.ev("teste.abrirPresente()"); await t.ev("teste.adiantarBau(6)");
  const antesRec = { saldo: await t.ev(SALDO), p: await t.ev("teste.presente") };
  await t.cmd("Page.navigate", { url: URL_DIA(DIA(33)) });
  await esperarJogo(t);
  const depois = { saldo: await t.ev(SALDO), p: await t.ev("teste.presente") };
  ok(depois.saldo === antesRec.saldo && depois.p.pegoHoje && depois.p.seq === antesRec.p.seq && (await t.ev("teste.bau")).estado === "fora", `recarregando no mesmo dia: ${depois.saldo} Rabiscoins, dia ${depois.p.seq} da sequência, sem baú de novo`);
  await t.cmd("Page.navigate", { url: URL_DIA(DIA(34)) });
  await esperarJogo(t);
  ok((await t.ev("teste.presente")).seq === 2 && (await t.ev("teste.bau")).estado === "fechado", "no dia seguinte (recarregando) a sequência continua: dia 2, baú esperando");
  ok(await ate(t, "window.__voz.some((e) => e.src.startsWith('rp-presente-aviso'))", 30000), "dia novo: a anfitriã avisa do presente");
  await t.cmd("Page.navigate", { url: URL_DIA(DIA(34)) });
  await esperarJogo(t);
  await espera(6000);
  ok(!(await t.ev("window.__voz.some((e) => e.src.startsWith('rp-presente-aviso'))")) && (await t.ev("teste.bau")).estado === "fechado", "segunda entrada no mesmo dia: o baú continua esperando, mas a anfitriã não repete o aviso");
  await t.ev("teste.fone.abrir('presente')"); await espera(500);
  await t.foto(`${OUT}rabifone-presente-dia2.png`);
  await t.ev("teste.fone.fechar()");

  // ---- desenho na praça (com o baú)
  await medir(t, "TV", 250, { "praça (largada)": [0, 33, Math.PI], "baú na praça": [2, 28, Math.PI - 0.3], "praça de lado": [-14, 26, 2.2] });

  // ---- com casa: o baú aparece na porta da casa escolhida
  const casa = 3;
  await t.ev(`(() => { const k = "rabisco.rabiscopolis.v1", d = JSON.parse(localStorage.getItem(k)); d.casa = ${casa}; localStorage.setItem(k, JSON.stringify(d)); })()`);
  await t.cmd("Page.navigate", { url: URL_DIA(DIA(35)) });
  await esperarJogo(t);
  const bc = await t.ev("teste.bau"), frente = await t.ev(`teste.casaFrente(${casa})`);
  ok(bc.estado === "fechado" && Math.hypot(bc.x - frente[0], bc.z - frente[1]) < 9, `com casa, o baú aparece na porta da casa ${casa} (${bc.x.toFixed(1)}, ${bc.z.toFixed(1)})`);
  const lote = await t.ev(`teste.LOTES.find((l) => l.numero === ${casa}).dir`);
  await t.ev(`teste.ir(${bc.x + lote[0] * 1.6}, ${bc.z + lote[1] * 1.6}); teste.olhar(${Math.atan2(-lote[0], -lote[1])})`); await espera(900);
  ok(await t.ev("teste.contexto") === "🎁 Abrir o presente", "dá para chegar no baú da casa pela calçada e abrir");
  ok(!(await t.ev(`teste.dentroDeSolido(${bc.x + lote[0] * 1.6}, ${bc.z + lote[1] * 1.6})`)), "a frente do baú da casa está livre");
  await t.ev(`teste.vista([${bc.x + lote[0] * 6 + lote[1] * 3}, 3.4, ${bc.z + lote[1] * 6 - lote[0] * 3}], [${bc.x}, 0.8, ${bc.z}])`); await espera(900);
  await t.foto(`${OUT}bau-casa.png`);
  await t.ev("teste.vista(null)");
  await medir(t, "TV", 250, { "baú na casa": [bc.x + lote[0] * 3.5, bc.z + lote[1] * 3.5, Math.atan2(-lote[0], -lote[1])] });

  const e = errosDeVerdade(t);
  ok(e.length === 0, `TV sem erro de console${e.length ? ": " + e.slice(0, 4).join(" | ") : ""}`);
  await t.fechar();
}

// ================================================================ celular
{
  const t = await abrir(URL_DIA(DIA(0)), CEL);
  await esperarJogo(t);
  ok((await t.ev("teste.bau")).estado === "fechado", "celular: o baú aparece");
  ok(await t.ev("teste.missaoDoDia") === mdDia0, `outro aparelho, mesma data: a mesma Missão do dia (${mdDia0}) — sorteio pela data`);
  await medir(t, "celular", 180, { "praça (largada)": [0, 33, Math.PI], "baú na praça": [2, 28, Math.PI - 0.3], "praça de lado": [-14, 26, 2.2] });
  await t.ev("teste.fone.abrir('presente')"); await espera(600);
  ok(!(await t.transborda()), "celular: a tela do Presente do dia cabe sem rolar para o lado");
  await t.foto(`${OUT}celular-rabifone-presente.png`);
  await t.ev("teste.fone.fechar()");
  const b = await t.ev("teste.bau");
  await t.ev(`teste.ir(${b.x - 1.5}, ${b.z + 1.3}); teste.olhar(Math.atan2(1.5, -1.3) + 0.45)`); await espera(900);
  ok(await ate(t, "document.querySelector('.rp-acao')?.textContent.includes('Abrir o presente')", 3000), "celular: o botão ✋ mostra “Abrir o presente”");
  await t.foto(`${OUT}celular-bau.png`);
  const casa = 12;
  await t.ev(`(() => { const k = "rabisco.rabiscopolis.v1", d = JSON.parse(localStorage.getItem(k)); d.casa = ${casa}; localStorage.setItem(k, JSON.stringify(d)); })()`);
  await t.cmd("Page.navigate", { url: URL_DIA(DIA(1)) });
  await esperarJogo(t);
  const bc = await t.ev("teste.bau"), lote = await t.ev(`teste.LOTES.find((l) => l.numero === ${casa}).dir`);
  ok(bc.estado === "fechado", `celular: com casa, o baú aparece na porta da casa ${casa}`);
  await medir(t, "celular", 180, { "baú na casa": [bc.x + lote[0] * 3.5, bc.z + lote[1] * 3.5, Math.atan2(-lote[0], -lote[1])] });
  const e = errosDeVerdade(t);
  ok(e.length === 0, `celular sem erro de console${e.length ? ": " + e.slice(0, 4).join(" | ") : ""}`);
  await t.fechar();
}

clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo!");
process.exit(falhas ? 1 : 0);
