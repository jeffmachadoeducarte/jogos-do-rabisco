// Rabiscolândia: Desafios de obstáculos (jogos/rabiscopolis/desafios.js e desafios-dados.js).
//  - dados: 3 desafios, 8 a 10 argolas, 6 a 8 boias, degraus e vãos que criança de 6 a 10 anos pula, longe da praça e das portas, medalhas
//    10/15/25, falas gravadas, nenhuma fala com "comprar";
//  - Pula-telhados: um trecho real de pulo (a pé, teclado), cair volta ao último checkpoint, checkpoints, chegada;
//  - Argolas do helicóptero: voo real pela argola da largada e pela 1ª, as outras com teletransporte curto antes de cada argola;
//  - Corrida de barco: volta inteira de verdade no lago, guiada por um piloto automático;
//  - medalha e pagamento só na 1ª vez de cada medalha, recorde salvo e conferido depois de recarregar, placa de recordes;
//  - orçamento de desenho: TV ≤ 250 e celular ≤ 180 (praça e cada desafio), e o que os desafios custam;
//  - fotos (cada desafio visto pelo jogador e a tela da medalha).
// Uso: python3 -m http.server 8758 &  node --experimental-websocket ferramentas/teste/rabiscopolis-desafios.mjs http://localhost:8758 [pasta das fotos]
//      PARTES=dados,pula,heli,barco,pagamento,desenho,celular para rodar só algumas.
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8758";
const FOTOS = (process.argv[3] || fileURLToPath(new URL("../../.claude/tmp/desafios/", import.meta.url))).replace(/\/?$/, "/");
mkdirSync(FOTOS, { recursive: true });
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
let falhas = 0;
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 30 * 60 * 1000);
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; return Boolean(c); };
const ate = async (t, expr, ms = 40000, passo = 120) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const CELULAR = { mobile: true, largura: 844, altura: 390, agente: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1" };
const TV = { largura: 1280, altura: 720 };
const PARTES = (process.env.PARTES ?? "dados,pula,heli,barco,pagamento,desenho,celular").split(",");
const modulo = (arq) => import(`data:text/javascript,${encodeURIComponent(readFileSync(arq, "utf8"))}`);
const DAD = await modulo(`${RAIZ}jogos/rabiscopolis/desafios-dados.js`);
const { CAMPO_PULA: C, PLATAFORMAS_PULA, CHECKPOINTS_PULA, CHEGADA_PULA, LARGADA_PULA, HELI, BARCO } = DAD;
const lx = C.x0 + LARGADA_PULA.u, lz = C.z0 + LARGADA_PULA.v;
const PLAT = PLATAFORMAS_PULA.map(([u0, u1, v0, v1, h, tipo]) => ({ x0: C.x0 + u0, x1: C.x0 + u1, z0: C.z0 + v0, z1: C.z0 + v1, h, tipo }));
const esperaJogo = async (t, seg) => { const t0 = await t.ev("teste.tempo"); while ((await t.ev("teste.tempo")) - t0 < seg) await espera(40); };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/nomes\/|favicon|fonts\.g/.test(e));

async function abrirJogo(opcoes, extra = "", limpar = true) {
  const t = await abrir("about:blank", opcoes);
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await ate(t, "document.readyState === 'complete'");
  if (limpar) await t.ev(`localStorage.clear(); ${FAMILIA}`);
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo&natal=0${extra}` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo && !!teste.desafios", 120000), `carregou (${opcoes.mobile ? "celular" : "TV"})`);
  await espera(2000);
  return t;
}
async function parte(nome, opcoes, f, extra = "") {
  if (!PARTES.includes(nome)) return;
  console.log(`--- ${nome}`);
  let t = null;
  try { t = await abrirJogo(opcoes, extra); await f(t); const er = errosDeVerdade(t); ok(!er.length, `sem erro de console ${er.slice(0, 4).join(" ; ")}`); }
  catch (e) { ok(false, `erro em ${nome}: ${e.stack?.split("\n").slice(0, 3).join(" | ") ?? e.message}`); }
  if (t) await t.fechar();
}
const tecla = (t, code, abaixo) => t.ev(`dispatchEvent(new KeyboardEvent('${abaixo ? "keydown" : "keyup"}', { code: '${code}', key: '${code}', bubbles: true }))`);
const OCULTA_UI = `(() => { const s = document.createElement("style"); s.id = "ocultaui"; s.textContent = ".minimapa-rp, .btn-fone-rp, .casca-topo, .casca-dica, .engrenagem-pausa, .pausa-botao { visibility: hidden !important }"; document.head.append(s); })()`;
// a pé: um piloto automático que roda DENTRO do jogo, a cada passo da física (a máquina do teste é lenta para reagir de fora):
// segura W para o leste (+x) e aperta o pulo na beira de cada plataforma, como uma criança faria
async function trechoReal(t, de, ate_) {
  await t.ev(`(() => {
    const PLAT = ${JSON.stringify(PLAT)}, ALVO = ${ate_}, DE = ${de};
    const key = (c, d) => dispatchEvent(new KeyboardEvent(d ? 'keydown' : 'keyup', { code: c, key: c, bubbles: true }));
    const D = teste.desafios, orig = D.__orig ?? D.atualizar; D.__orig = orig;
    let seguro = 0, espera = 0; window.__botFim = false; window.__botPulos = 0;
    key('KeyW', true);
    D.atualizar = (dt, t) => {
      orig(dt, t);
      const p = teste.j.pos, no = teste.j.noChao;
      if (seguro > 0 && --seguro === 0) key('Space', false);
      if (espera > 0) espera--;
      teste.olhar(Math.PI / 2);
      const idx = PLAT.findIndex((q) => p.x > q.x0 && p.x < q.x1 && p.z > q.z0 && p.z < q.z1 && p.y > q.h - 0.2);
      if (idx >= ALVO && no) { window.__botFim = true; key('KeyW', false); D.atualizar = orig; return; }
      const prox = PLAT[idx >= 0 ? idx + 1 : DE + 1];
      const beira = idx >= 0 ? PLAT[idx].x1 - 0.45 : prox.x0 - 0.9;
      if (no && p.x > beira && espera === 0 && seguro === 0) { key('Space', true); seguro = 9; espera = 22; window.__botPulos++; }
    };
  })()`);
  const chegou = await ate(t, "window.__botFim === true", 40000, 100);
  await tecla(t, "KeyW", false);
  return chegou;
}
async function comecarPula(t) {
  await t.ev(`teste.ir(${lx - 4}, ${lz}); teste.olhar(Math.PI / 2)`); await espera(500);
  await t.ev(`teste.ir(${lx}, ${lz})`);
  return ate(t, "teste.desafios.ativo?.id === 'pula'", 8000);
}
async function corridaPula(t, tempo) {
  ok(await comecarPula(t), "  largou pelo pórtico");
  for (const k of [1, 2]) { await t.ev(`teste.desafios.teleportar('pula', ${k})`); if (!(await ate(t, `teste.desafios.ativo?.prox === ${k}`, 6000))) ok(false, `  checkpoint ${k}`); }
  await t.ev(`teste.desafios.forcarTempo(${tempo})`);
  await t.ev("teste.desafios.teleportar('pula', 3)");
  await ate(t, "teste.desafios.ativo === null", 6000);
  await esperaJogo(t, 3.3);
}

// ================================================================ dados
await (async () => {
  if (!PARTES.includes("dados")) return;
  console.log("--- dados");
  const { DESAFIOS, PREMIO_MEDALHA, FALAS_DESAFIOS, medalhaDe } = DAD;
  ok(DESAFIOS.length === 3 && ["pula", "heli", "barco"].every((i) => DESAFIOS.some((d) => d.id === i)), "3 desafios: Pula-telhados, Argolas do helicóptero e Corrida de barco");
  ok(HELI.argolas.length >= 8 && HELI.argolas.length <= 10, `${HELI.argolas.length} argolas (8 a 10)`);
  ok(BARCO.boias.length >= 6 && BARCO.boias.length <= 8, `${BARCO.boias.length} boias (6 a 8)`);
  ok(PREMIO_MEDALHA.bronze === 10 && PREMIO_MEDALHA.prata === 15 && PREMIO_MEDALHA.ouro === 25, "medalhas pagam 10, 15 e 25");
  ok(DESAFIOS.every((d) => d.tempos.ouro < d.tempos.prata && d.tempos.prata < d.tempos.bronze), "tempos: ouro < prata < bronze");
  ok(medalhaDe("pula", 50) === "ouro" && medalhaDe("pula", 70) === "prata" && medalhaDe("pula", 100) === "bronze" && medalhaDe("pula", 200) === null, "o tempo vira a medalha certa");
  const falas = Object.entries(FALAS_DESAFIOS);
  ok(falas.length === 6 && falas.every(([, f]) => f.length < 130), "6 falas curtas (3 de largada e 3 de medalha)");
  ok(!falas.some(([, f]) => /compra/i.test(f)) && !/compra/i.test(readFileSync(`${RAIZ}jogos/rabiscopolis/desafios.js`, "utf8")), 'nenhuma fala ou texto com "comprar"');
  const { existsSync } = await import("node:fs");
  ok(falas.every(([k]) => existsSync(`${RAIZ}assets/voz/${k}.mp3`)), "os 6 MP3 das falas existem");
  const fj = JSON.parse(readFileSync(`${RAIZ}jogos/rabiscopolis/falas.json`, "utf8")).pt;
  ok(falas.every(([k, f]) => fj[k] === f), "falas.json tem o mesmo texto");
  // degraus e vãos do Pula-telhados: pulo da criança vai a 1,8 m de altura e uns 4 m de distância
  let max = { sobe: 0, vao: 0 };
  const seq = [[0, 5], [6, 5 + 7], [13, 19], [14, 19]];
  void seq;
  const ordem = PLAT.map((p, i) => i);
  for (let i = 1; i < ordem.length; i++) {
    const a = PLAT[i - 1], b = PLAT[i];
    const vx = Math.max(0, Math.max(b.x0 - a.x1, a.x0 - b.x1)), vz = Math.max(0, Math.max(b.z0 - a.z1, a.z0 - b.z1)), vao = Math.hypot(vx, vz);
    max.sobe = Math.max(max.sobe, b.h - a.h); max.vao = Math.max(max.vao, vao);
  }
  ok(max.sobe <= 0.65 && max.vao <= 3.05, `degrau máximo ${max.sobe.toFixed(2)} m (≤ 0,65) e vão máximo ${max.vao.toFixed(2)} m (≤ 3,05) entre plataformas seguidas`);
  ok(Math.max(...PLAT.map((p) => p.h)) <= 2.7 && PLAT[0].h <= 0.7, `alturas de 0,6 a ${Math.max(...PLAT.map((p) => p.h))} m, a 1ª plataforma baixinha`);
  ok(CHECKPOINTS_PULA.length === 2 && PLAT[CHEGADA_PULA].tipo === "pad", "2 checkpoints e a chegada em plataformas grandes");
})();

// ================================================================ cenário (onde ficam, colisões)
await parte("dados", TV, async (t) => {
  const r = await t.ev(`(() => {
    const L = teste.LUGARES, S = teste.mundo.solidos, meus = S.filter((s) => s.desafio);
    const pontos = { pula: [${C.x0 + C.w / 2}, ${C.z0 + C.d / 2}], heli: [${HELI.bandeira.x}, ${HELI.bandeira.z}], barco: [${BARCO.bandeira.x}, ${BARCO.bandeira.z}] };
    const dl = {}; for (const [k, [x, z]] of Object.entries(pontos)) dl[k] = Math.min(...L.filter((l) => !l.id.startsWith("heliponto") && !l.id.startsWith("praia")).map((l) => Math.hypot(l.x - x, l.z - z)));
    const dp = Object.fromEntries(Object.entries(pontos).map(([k, [x, z]]) => [k, Math.hypot(x, z - 12)]));
    const dpo = {}; for (const [k, [x, z]] of Object.entries(pontos)) dpo[k] = Math.min(...L.filter((l) => l.parceiro || l.loja || /^(kids|hospital|mercado|padaria|sorveteria|igreja|biblioteca|bombeiros)/.test(l.id)).map((l) => Math.hypot(l.x - x, l.z - z)));
    // plataformas dentro de outro sólido, ou em cima de árvore / prédio
    const sobre = meus.filter((m) => S.some((s) => !s.desafio && s.x1 > m.x0 - 0.3 && s.x0 < m.x1 + 0.3 && s.z1 > m.z0 - 0.3 && s.z0 < m.z1 + 0.3)).length;
    const circ = meus.filter((m) => teste.mundo.circulos.some((c) => c.x > m.x0 - c.r && c.x < m.x1 + c.r && c.z > m.z0 - c.r && c.z < m.z1 + c.r)).length;
    // prédios sob o caminho das argolas: o mais alto dentro da caixa que as contém
    const A = ${JSON.stringify([HELI.largada, ...HELI.argolas.map(([x, z, alt]) => ({ x, z, alt }))])}.map((a) => Array.isArray(a) ? { x: a[0], z: a[1], alt: a[2] } : a);
    const topo = Math.max(...S.filter((s) => !s.desafio && (s.topo ?? s.y1) < 60 && A.some((a) => Math.hypot((s.x0 + s.x1) / 2 - a.x, (s.z0 + s.z1) / 2 - a.z) < 60)).map((s) => s.topo ?? s.y1));
    const baixa = Math.min(...A.map((a) => a.alt));
    const emRua = ${JSON.stringify(PLAT.map((p) => [(p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2]))}.filter(([x, z]) => teste.distRua(x, z).d < 3).length;
    const naAgua = ${JSON.stringify(BARCO.boias)}.filter((b) => Math.hypot(b.x - 0, b.z - 202) > 24 - 0.5 - 1.6 - 2).length;
    return { dl, dp, dpo, sobre, circ, topo, baixa, emRua, naAgua, n: meus.length };
  })()`);
  console.log("   ", JSON.stringify(r));
  ok(r.n === PLAT.length, `${r.n} plataformas viraram colisão`);
  ok(Object.values(r.dp).every((d) => d > 80), `longe da praça central: ${Object.entries(r.dp).map(([k, d]) => `${k} ${Math.round(d)} m`).join(", ")} (> 80)`);
  ok(Object.values(r.dpo).every((d) => d > 40), `longe de lojas, parceiros e escolas: ${Object.entries(r.dpo).map(([k, d]) => `${k} ${Math.round(d)} m`).join(", ")} (> 40)`);
  ok(Object.values(r.dl).every((d) => d > 25), `longe das portas dos lugares: ${Object.entries(r.dl).map(([k, d]) => `${k} ${Math.round(d)} m`).join(", ")} (> 25)`);
  ok(r.sobre === 0 && r.circ === 0 && r.emRua === 0, `nenhuma plataforma em cima de prédio (${r.sobre}), árvore (${r.circ}) ou rua (${r.emRua})`);
  ok(r.baixa >= r.topo + 1.5, `as argolas (a mais baixa a ${r.baixa} m) passam acima do prédio mais alto perto delas (${r.topo.toFixed(1)} m)`);
  ok(r.naAgua === 0, "todas as boias dentro da água do lago, com folga para o barquinho");
});

// ================================================================ Pula-telhados
await parte("pula", TV, async (t) => {
  await t.ev(OCULTA_UI);
  await t.ev(`teste.ir(${lx - 7}, ${lz - 1}); teste.olhar(Math.PI / 2 + 0.25)`); await espera(1500);
  await t.foto(`${FOTOS}pula-1-largada.png`);
  await t.ev(`teste.ir(${lx - 3.6}, ${lz + 2}); teste.olhar(-Math.PI / 2 + 0.3)`); await espera(900); // olhando para o oeste: a placa
  await t.ev(`teste.ir(${lx - 7}, ${lz + 4.6}); teste.olhar(-Math.PI / 2 + Math.PI)`); await espera(900);
  await t.ev(`teste.ir(${lx - 6.5}, ${lz + 4.6}); teste.olhar(-Math.PI / 2 + Math.PI)`);
  await espera(800); await t.foto(`${FOTOS}pula-2-placa-de-recordes.png`);
  // largada de verdade: andando pelo pórtico
  await t.ev(`teste.ir(${lx - 4}, ${lz}); teste.olhar(Math.PI / 2)`); await espera(500);
  await tecla(t, "KeyW", true);
  ok(await ate(t, "teste.desafios.ativo?.id === 'pula'", 6000, 40), "andando pelo pórtico a corrida começa sozinha");
  await tecla(t, "KeyW", false);
  const hud = await t.ev("document.querySelector('.des-hud').textContent");
  ok(/Pula-telhados/.test(hud) && /⏱/.test(hud) && /Checkpoint 0\/2/.test(hud), `HUD com tempo e checkpoint: "${hud}"`);
  ok(await t.ev("teste.desafios.ativo.t") >= 0, "o cronômetro corre");
  const [t1, j1] = await t.ev("[teste.desafios.ativo.t, teste.tempo]"); await esperaJogo(t, 1.0); const [t2, j2] = await t.ev("[teste.desafios.ativo.t, teste.tempo]");
  ok(Math.abs((t2 - t1) - (j2 - j1)) < 0.12 && t2 > t1, `o cronômetro anda junto com o tempo de jogo (${(t2 - t1).toFixed(2)} s contra ${(j2 - j1).toFixed(2)} s)`);
  const falaVista = await t.ev("teste.salvo.desafios?.pula?.visto === true");
  ok(falaVista, "a fala de largada tocou na 1ª vez (marcada como vista)");

  // trecho REAL de pulo: do chão até a 4ª plataforma (3 pulos de caixa em caixa)
  await t.ev(`teste.ir(${lx + 0.5}, ${lz})`);
  const pulou = await trechoReal(t, -1, 3);
  const pos = await t.ev("({ x: teste.j.pos.x, y: teste.j.pos.y })");
  ok(pulou && pos.y > 1.0, `trecho real: do chão até a 4ª plataforma, só andando e pulando (${await t.ev("window.__botPulos")} pulos, x ${pos.x.toFixed(1)}, altura ${pos.y.toFixed(2)} m)`);
  await t.foto(`${FOTOS}pula-3-nas-plataformas.png`);
  const emJogo = await t.ev("teste.desafios.ativo");
  ok(emJogo?.id === "pula" && emJogo.prox === 0, "pulou pelas plataformas e a corrida segue valendo");

  // cair: volta ao início (ainda sem checkpoint), sem castigo e com o tempo correndo
  ok(await ate(t, "teste.desafios.ativo?.armado === true", 4000, 40), "em pé numa plataforma, o jogo passa a vigiar a queda");
  await t.ev(`teste.j.pos.set(${PLAT[3].x1 + 1.2}, 1.9, ${(PLAT[3].z0 + PLAT[3].z1) / 2}); teste.j.vel.set(0, 0, 0)`);
  ok(await ate(t, `Math.hypot(teste.j.pos.x - ${C.x0 + 1.4}, teste.j.pos.z - ${lz}) < 0.8 && teste.j.pos.y < 0.5`, 6000, 40), "caiu no chão: voltou ao ponto de largada");
  const aviso = await t.ev("document.querySelector('.des-aviso').textContent");
  ok(/Volta|volta/.test(aviso) && (await t.ev("teste.desafios.ativo?.id")) === "pula", `sem castigo: "${aviso}" e a corrida continua`);
  const tAntes = await t.ev("teste.desafios.ativo.t");
  ok(tAntes > 0, "o tempo não zera ao cair");

  // checkpoint 1: chegar nele, cair e voltar nele
  await t.ev("teste.desafios.teleportar('pula', 1)");
  ok(await ate(t, "teste.desafios.ativo?.prox === 1", 5000, 40), "checkpoint 1 pego (HUD 1/2)");
  ok(/Checkpoint 1\/2/.test(await t.ev("document.querySelector('.des-hud').textContent")), "o HUD mostra Checkpoint 1/2");
  await espera(400);
  const cp1 = PLAT[CHECKPOINTS_PULA[0]];
  await t.ev(`teste.j.pos.set(${cp1.x1 + 1.5}, ${cp1.h + 0.3}, ${(cp1.z0 + cp1.z1) / 2}); teste.j.vel.set(0, 0, 0)`);
  ok(await ate(t, `Math.abs(teste.j.pos.x - ${(cp1.x0 + cp1.x1) / 2}) < 0.8 && teste.j.pos.y > ${cp1.h - 0.1}`, 6000, 40), "caiu depois do checkpoint 1: voltou em cima do checkpoint 1");
  // checkpoint 2 e chegada
  await t.ev("teste.desafios.teleportar('pula', 2)");
  ok(await ate(t, "teste.desafios.ativo?.prox === 2", 5000, 40), "checkpoint 2 pego");
  const cp2 = PLAT[CHECKPOINTS_PULA[1]];
  await t.ev(`teste.j.pos.set(${cp2.x1 + 1.5}, 0.9, ${(cp2.z0 + cp2.z1) / 2}); teste.j.vel.set(0, 0, 0)`);
  ok(await ate(t, `Math.abs(teste.j.pos.x - ${(cp2.x0 + cp2.x1) / 2}) < 0.8 && teste.j.pos.y > ${cp2.h - 0.1}`, 6000, 40), "caiu depois do checkpoint 2: voltou em cima do checkpoint 2");
  await t.ev(`teste.desafios.forcarTempo(52)`);
  await t.ev("teste.desafios.teleportar('pula', 3)");
  ok(await ate(t, "teste.desafios.ativo === null && teste.desafios.cartaoAberto", 6000, 40), "chegada: aparece o cartão da medalha");
  const u = await t.ev("teste.desafios.ultimo");
  ok(u.medalha === "ouro" && u.ganhou === 25 && u.recordeNovo, `52 s = ouro, +25 Rabiscoins, novo recorde (${JSON.stringify(u)})`);
  await t.ev(OCULTA_UI.replace("ocultaui", "ocultaui2").replace("btn-fone-rp,", "btn-fone-rp, .chip-rp,"));
  await espera(600); await t.foto(`${FOTOS}pula-4-medalha.png`);
  ok(/Medalha de ouro/.test(await t.ev("document.querySelector('.des-card').textContent")), "o cartão diz Medalha de ouro");
  ok(Math.abs((await t.ev("teste.salvo.desafios.pula.melhor")) - 52) < 1, "recorde de ~52 s guardado");
});

// ================================================================ Argolas do helicóptero
await parte("heli", TV, async (t) => {
  await t.ev(OCULTA_UI);
  const iheli = await t.ev("teste.veiculos.findIndex((v) => v.tipo === 'heli')");
  ok(iheli >= 0, "há helicóptero (o do Rabifone/Heliponto)");
  // a bandeira, o pórtico e a placa, vistos do Heliponto
  await t.ev(`teste.ir(${HELI.bandeira.x}, ${HELI.bandeira.z + 8}); teste.olhar(Math.PI)`); await espera(1500);
  await t.foto(`${FOTOS}heli-1-bandeira-e-placa.png`);
  await t.ev(`teste.entrar(${iheli})`);
  ok(await ate(t, "teste.dentro?.tipo === 'heli'", 5000), "dentro do helicóptero");
  // voo real: sobe, passa pela argola de largada e vai até a argola 1 (altitudes diferentes)
  await t.ev(`(() => { const v = teste.dentro; v.pos.set(${HELI.largada.x}, ${HELI.largada.alt}, ${HELI.largada.z + 14}); v.alt = ${HELI.largada.alt}; v.ang = Math.PI; v.vel = 0; v.vs = 0; v.rotor = 1; teste.j.pos.set(v.pos.x, v.alt + 0.07, v.pos.z); })()`);
  await t.ev("teste.olhar(Math.PI)");
  await t.ev("teste.volante(1, 0)");
  ok(await ate(t, "teste.desafios.ativo?.id === 'heli'", 12000, 40), "voando de verdade pela argola de largada a corrida começa");
  const alvoAlt = HELI.argolas[0][2];
  let argola1 = false;
  const fim = Date.now() + 25000;
  while (Date.now() < fim) {
    const alt = await t.ev("teste.dentro.alt");
    await t.ev(`teste.voar(${alt < alvoAlt - 0.4}, ${alt > alvoAlt + 1.0})`);
    if (await t.ev("teste.desafios.ativo?.prox >= 1")) { argola1 = true; break; }
    await espera(80);
  }
  ok(argola1, "voando de verdade pela argola 1 (checkpoint)");
  await t.ev("teste.olhar(Math.PI)");
  await espera(300); await t.foto(`${FOTOS}heli-2-voando-argola.png`);
  const hud = await t.ev("document.querySelector('.des-hud').textContent");
  ok(/Argolas do helicóptero/.test(hud) && /Argola 1\/9/.test(hud), `HUD: "${hud}"`);
  // as outras: teletransporte curto antes de cada argola, voando para a frente
  for (let k = 2; k <= HELI.argolas.length; k++) {
    await t.ev(`teste.desafios.teleportar('heli', ${k}); teste.dentro.vel = 9; teste.volante(1, 0); teste.voar(false, false)`);
    const passou = await ate(t, `(teste.desafios.ativo?.prox ?? ${HELI.argolas.length}) >= ${k} || teste.desafios.ultimo?.id === 'heli'`, 6000, 40);
    if (!passou) { ok(false, `argola ${k}`); break; }
    if (k === 5) { await t.ev("teste.olhar(teste.dentro.ang)"); await espera(300); await t.foto(`${FOTOS}heli-3-argolas-no-ceu.png`); }
    if (k === HELI.argolas.length - 1) await t.ev("teste.desafios.forcarTempo(98)");
  }
  ok(await ate(t, "teste.desafios.ativo === null && teste.desafios.cartaoAberto", 8000, 60), "passou pela última argola: chegada e cartão da medalha");
  await t.ev("teste.volante(null)");
  const u = await t.ev("teste.desafios.ultimo");
  ok(u.id === "heli" && u.medalha === "prata" && u.ganhou === 15, `~100 s = prata, +15 Rabiscoins (${JSON.stringify(u)})`);
  await espera(500); await t.foto(`${FOTOS}heli-4-medalha.png`);
  // sair do helicóptero no meio de uma corrida cancela
  await t.ev("teste.desafios.fecharCartao()");
});

// ================================================================ Corrida de barco
await parte("barco", TV, async (t) => {
  await t.ev(OCULTA_UI);
  await t.ev(`teste.ir(${BARCO.bandeira.x}, ${BARCO.bandeira.z - 7}); teste.olhar(0); teste.rabisco.grupo.visible = false`); await espera(500);
  await t.ev(`teste.vista([${BARCO.bandeira.x + 4}, 3.2, ${BARCO.bandeira.z - 7}], [${BARCO.bandeira.x + 1}, 2.4, ${BARCO.bandeira.z + 3}])`); await espera(1200);
  await t.foto(`${FOTOS}barco-1-bandeira-e-placa.png`);
  await t.ev("teste.vista(null); teste.rabisco.grupo.visible = true");
  const ib = await t.ev(`teste.veiculos.findIndex((v) => v.tipo === 'barco' && Math.hypot(v.pos.x, v.pos.z - 202) < 24)`);
  ok(ib >= 0, "há barquinho no lago da Praia");
  await t.ev(`teste.entrar(${ib})`);
  ok(await ate(t, "teste.dentro?.tipo === 'barco'", 5000), "dentro do barquinho");
  await t.ev("teste.desafios.teleportar('barco', 0)");
  await t.ev("teste.olhar(0)");
  // piloto automático DENTRO do jogo (a cada passo da física): aponta para a próxima boia (ou para o pórtico, antes de largar)
  await t.ev(`(() => {
    const D = teste.desafios, orig = D.__orig ?? D.atualizar; D.__orig = orig, B = ${JSON.stringify(BARCO.boias)};
    window.__largou = false;
    D.atualizar = (dt, t) => { orig(dt, t); const v = teste.dentro; if (!v) return; const a = D.ativo; if (a) window.__largou = true;
      const al = a ? B[Math.min(a.prox, B.length - 1)] : { x: ${BARCO.largada.x}, z: ${BARCO.largada.z + 3} };
      let d = Math.atan2(al.x - v.pos.x, al.z - v.pos.z) - v.ang; d = Math.atan2(Math.sin(d), Math.cos(d));
      teste.volante(Math.abs(d) > 1.2 ? 0.45 : 1, -Math.max(-1, Math.min(1, d * 2.2))); teste.olhar(v.ang); };
  })()`.replace("D.__orig = orig, B =", "D.__orig = orig; const B ="));
  let fotos = 0;
  const fim = Date.now() + 150000;
  while (Date.now() < fim) {
    if (!fotos && await t.ev("teste.desafios.ativo?.prox >= 3")) { fotos = 1; await t.foto(`${FOTOS}barco-2-boias.png`); }
    if (await t.ev("Boolean(teste.desafios.ultimo)")) break;
    await espera(400);
  }
  const largou = await t.ev("window.__largou");
  await t.ev("teste.volante(null)");
  ok(largou, "a corrida começou ao passar pelo pórtico flutuante");
  const u = await t.ev("teste.desafios.ultimo");
  ok(!!u && u.id === "barco", `volta inteira de verdade pelas 7 boias: ${u ? `${u.tempo.toFixed(1)} s, ${u.medalha ?? "sem medalha"}, +${u.ganhou}` : "não terminou"}`);
  ok(!u || u.medalha === null || u.ganhou === { bronze: 10, prata: 15, ouro: 25 }[u.medalha], "pagamento da 1ª vez bate com a medalha");
  await espera(700); await t.foto(`${FOTOS}barco-3-chegada.png`);
});

// ================================================================ pagamento, recorde e recarga
await (async () => {
  if (!PARTES.includes("pagamento")) return;
  console.log("--- pagamento");
  let t = null;
  try {
    t = await abrirJogo(TV, "");
    const saldo = () => t.ev("teste.Rabiscoins.saldo()");
    ok(await saldo() === 0, "carteira começa zerada");
    // 1ª corrida: bronze (100 s)
    await corridaPula(t, 100);
    let u = await t.ev("teste.desafios.ultimo");
    ok(u.medalha === "bronze" && u.ganhou === 10 && await saldo() === 10, `1ª vez, bronze: +10 (saldo ${await saldo()})`);
    // 2ª: bronze de novo, não paga
    await corridaPula(t, 110);
    u = await t.ev("teste.desafios.ultimo");
    ok(u.medalha === "bronze" && u.ganhou === 0 && await saldo() === 10, `bronze outra vez: não paga (saldo ${await saldo()})`);
    // 3ª: prata paga 15
    await corridaPula(t, 75);
    u = await t.ev("teste.desafios.ultimo");
    ok(u.medalha === "prata" && u.ganhou === 15 && await saldo() === 25, `1ª prata: +15 (saldo ${await saldo()})`);
    // 4ª: sem medalha (tempo alto) não paga e não estraga o recorde
    await corridaPula(t, 200);
    u = await t.ev("teste.desafios.ultimo");
    ok(u.medalha === null && u.ganhou === 0 && !u.recordeNovo && await saldo() === 25, "tempo sem medalha: não paga e não é recorde");
    // 5ª: ouro paga 25
    await corridaPula(t, 54);
    u = await t.ev("teste.desafios.ultimo");
    ok(u.medalha === "ouro" && u.ganhou === 25 && u.recordeNovo && await saldo() === 50, `1º ouro: +25 (saldo ${await saldo()}) e novo recorde`);
    // 6ª: ouro de novo não paga; mas é recorde melhor
    await corridaPula(t, 50);
    u = await t.ev("teste.desafios.ultimo");
    ok(u.medalha === "ouro" && u.ganhou === 0 && u.recordeNovo && await saldo() === 50, "ouro outra vez: não paga, mas bate o recorde");
    const ganhos = await t.ev("teste.Rabiscoins.carteira().ganhos");
    ok(ganhos["rabiscolandia:desafio:pula:bronze"] === 1 && ganhos["rabiscolandia:desafio:pula:prata"] === 1 && ganhos["rabiscolandia:desafio:pula:ouro"] === 1, `cada medalha foi paga uma vez só: ${JSON.stringify(ganhos)}`);
    const reg = await t.ev("teste.salvo.desafios.pula");
    ok(reg.top.map(Math.round).join() === "50,54,75", `recordes guardados (os 3 melhores): ${reg.top.map((x) => x.toFixed(1)).join(", ")}`);
    // o Rabifone lista os desafios
    await t.ev("teste.fone.abrir('desafios')"); await espera(500);
    const itens = await t.ev("[...document.querySelectorAll('.rabifone .rf-lista .rf-item')].map((e) => e.textContent)");
    ok(itens.length === 3 && /Pula-telhados/.test(itens[0]) && /Recorde 5\d\.\d/.test(itens[0]), `Rabifone, app Desafios: ${JSON.stringify(itens)}`);
    await t.ev("teste.fone.fechar()");
  } catch (e) { ok(false, `erro em pagamento: ${e.stack?.split("\n").slice(0, 3).join(" | ")}`); }
  if (t) await t.fechar();
})();

// ================================================================ recorde depois de recarregar (mesmo navegador)
await parte("pagamento", TV, async (t) => {
  await t.ev(OCULTA_UI);
  await corridaPula(t, 61);
  const antes = await t.ev("JSON.stringify([teste.salvo.desafios.pula, teste.Rabiscoins.saldo()])");
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo&natal=0` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.desafios", 120000), "recarregou o jogo");
  await espera(1500);
  const depois = await t.ev("JSON.stringify([teste.salvo.desafios.pula, teste.Rabiscoins.saldo()])");
  ok(antes === depois, `recorde, medalhas e saldo iguais depois de recarregar: ${depois}`);
  ok(Math.round(await t.ev("teste.desafios.lista().find((d) => d.id === 'pula').melhor")) === 61, "a lista do Rabifone mostra o recorde guardado (61 s)");
  // placa de recordes (textura) mostra o recorde: confere pelo canvas da placa
  const txt = await t.ev(`(() => { const m = teste.desafios.placa('pula'); const c = m.material.map.image; return { w: c.width, h: c.height, ink: (() => { const d = c.getContext('2d').getImageData(20, 230, 300, 50).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 80) n++; return n; })() }; })()`);
  ok(txt.w === 512 && txt.ink > 300, `a placa de recordes foi desenhada com os tempos (tinta ${txt.ink})`);
  await t.ev(`teste.ir(${lx - 6.5}, ${lz + 4.6}); teste.olhar(Math.PI / 2 + Math.PI)`); await espera(1200);
  await t.foto(`${FOTOS}pula-5-placa-depois-de-recarregar.png`);
  await t.ev(`teste.ir(${lx - 6}, ${lz}); teste.olhar(Math.PI / 2)`);
  // 2ª vez no pula: a fala de largada não repete
  const visto = await t.ev("teste.salvo.desafios.pula.visto");
  ok(visto === true, "a fala de largada fica marcada como já falada");
  // o tempo de uma volta guardada de outro desafio não aparece nesta placa
  ok((await t.ev("teste.desafios.lista().find((d) => d.id === 'heli').melhor")) === null, "cada desafio tem o seu recorde");
}, "");

// ================================================================ orçamento de desenho
async function medidas(t, teto, rotuloTela) {
  const ev = (s) => t.ev(s);
  const pontos = {
    "praça": async () => { await ev("teste.ir(0, 33); teste.olhar(Math.PI)"); },
    "Pula-telhados": async () => { await ev(`teste.ir(${lx - 3}, ${lz}); teste.olhar(Math.PI / 2)`); },
    "Pula-telhados, no alto": async () => { const p = PLAT[8]; await ev(`teste.ir(${(p.x0 + p.x1) / 2}, ${(p.z0 + p.z1) / 2}); teste.j.pos.y = ${p.h + 0.07}; teste.olhar(-Math.PI / 2)`); },
    "largada do helicóptero": async () => { await ev(`teste.ir(${HELI.bandeira.x}, ${HELI.bandeira.z + 6}); teste.olhar(Math.PI)`); },
    "Corrida de barco": async () => { await ev(`teste.ir(${BARCO.bandeira.x}, ${BARCO.bandeira.z - 6}); teste.olhar(0)`); },
  };
  const res = {};
  for (const [nome, ir] of Object.entries(pontos)) {
    await ir(); await espera(900);
    await ev("teste.medir(); 0"); // esquenta (o passe de sombra do 1º quadro depois de andar não conta para comparar)
    const com = await ev("teste.medir().total");
    // o mesmo quadro sem os desafios (esconde os grupos e para de atualizar a visibilidade)
    const sem = await ev(`(() => { const g = Object.values(teste.desafios.grupos), ant = g.map((x) => x.visible); g.forEach((x) => (x.visible = false)); const r = teste.medir().total; g.forEach((x, i) => (x.visible = ant[i])); return r; })()`);
    const d = com.calls - sem.calls;
    res[nome] = `${com.calls} (${d >= 0 ? "+" : ""}${d})`;
    ok(com.calls <= teto, `${rotuloTela}, ${nome}: ${com.calls} chamadas (≤ ${teto}); os desafios custam ${d}`);
    ok(d <= 14, `${rotuloTela}, ${nome}: os desafios acrescentam no máximo 14 chamadas (acrescentam ${d})`);
    if (nome === "praça") ok(d === 0, "na praça os desafios não custam nenhuma chamada (somem de longe)");
  }
  // no ar, entre as argolas, e no barco
  const iheli = await ev("teste.veiculos.findIndex((v) => v.tipo === 'heli')");
  await ev(`teste.entrar(${iheli})`); await espera(300);
  await ev(`(() => { const v = teste.dentro; const [x, z, y] = [${HELI.argolas[1].join(",")}]; v.pos.set(x - 12, y, z); v.alt = y; v.ang = Math.PI / 2; v.vel = 0; teste.j.pos.set(v.pos.x, y + 0.07, v.pos.z); })()`); await espera(1200);
  const h = await ev("teste.medir().total");
  ok(h.calls <= teto, `${rotuloTela}, voando entre as argolas: ${h.calls} chamadas (≤ ${teto})`);
  await ev("teste.sair()"); await espera(300);
  return res;
}
await (async () => {
  for (const [nome, op, teto] of [["tv", TV, 250], ["celular", CELULAR, 180]]) {
    if (!PARTES.includes(nome === "celular" ? "celular" : "desenho")) continue;
    console.log(`--- desenho (${nome})`);
    let t = null;
    try { t = await abrirJogo(op, ""); const r = await medidas(t, teto, nome === "tv" ? "TV" : "celular"); console.log("   ", JSON.stringify(r)); const er = errosDeVerdade(t); ok(!er.length, `sem erro de console ${er.slice(0, 3).join(" ; ")}`); }
    catch (e) { ok(false, `erro em desenho ${nome}: ${e.stack?.split("\n").slice(0, 3).join(" | ")}`); }
    if (t) await t.fechar();
  }
})();

clearTimeout(vigia);
console.log(falhas ? `\n✗ ${falhas} falha(s)` : "\n✓ tudo certo");
process.exit(falhas ? 1 : 0);
