// Rabiscolândia: câmera compartilhada de 2 jogadores e câmera por tamanho de veículo (2 controles simulados).
//  2 jogadores: perto → câmera normal (um pouco mais alta); longe → afasta e sobe até caber os dois; coleira macia (≤ 17 m);
//  seta na borda quando alguém sai do quadro; crachá azul do Rabisco; segurar X = "vir para perto"; carro independente
//  (longe = fica a pé; perto do carro parado, X entra de carona; parado, X desce); orçamento ≤ 250 chamadas.
//  1 jogador: a pé → carro → ônibus → caminhão da Marlon Máquinas: a câmera afasta e sobe com o tamanho do veículo, sem pulo.
// Uso: node --experimental-websocket ferramentas/teste/rabiscolandia-camera.mjs [http://localhost:8080] [pasta-das-fotos] [dois,veiculos]
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const BASE = process.argv[2] || "http://localhost:8080";
const PASTA = (process.argv[3] || fileURLToPath(new URL("../../.claude/tmp/rabiscolandia-camera/", import.meta.url))).replace(/\/?$/, "/");
const SO = (process.argv[4] || "").split(",").filter(Boolean);
const quer = (n) => !SO.length || SO.includes(n);
mkdirSync(PASTA, { recursive: true });
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 20000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosRP = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|cid-|nomes\/)/.test(e));
const PADS = (n) => `
  window.__pads = [0, 1].map((i) => ({ index: i, id: "teste " + i, connected: true, mapping: "standard", timestamp: 0,
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }));
  window.__nPads = ${n};
  navigator.getGamepads = () => window.__pads.map((p, i) => (i < window.__nPads && p.connected ? p : null));
  window.__btn = (p, i, v) => { window.__pads[p].buttons[i].pressed = v; window.__pads[p].buttons[i].value = v ? 1 : 0; };
  window.__eixo = (p, x, y) => { window.__pads[p].axes[0] = x; window.__pads[p].axes[1] = y; };
`;
const CADASTRO = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t.com" }, crianca: { nome: "Alice Souza", genero: "menina" } }));`;
async function abrir2(url, pads) {
  const t = await abrir("about:blank", { largura: 1280, altura: 720 });
  await t.cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: PADS(pads) + CADASTRO });
  await t.cmd("Page.navigate", { url });
  return t;
}
const URL_RP = `${BASE}/jogos/rabiscopolis/?teste&fixo`;
const comecar = async (t) => { await ate(t, "!!window.teste && !!document.querySelector('.casca-abertura .botao')"); await t.ev(`document.querySelector('.casca-abertura .botao.respira, .casca-abertura .casca-nivel').click()`); };
const aperta = async (t, p, b, ms = 450) => { await t.ev(`__btn(${p}, ${b}, true)`); await espera(ms); await t.ev(`__btn(${p}, ${b}, false)`); await espera(150); };
const dist12 = "Math.hypot(teste.j2.pos.x - teste.j.pos.x, teste.j2.pos.z - teste.j.pos.z)";
const foto = (t, n) => t.foto(PASTA + n);

// ------------------------------------------------------------------ 2 jogadores
if (quer("dois")) {
  const t = await abrir2(URL_RP, 2);
  await ate(t, "!!window.teste && !!document.querySelector('[data-jogadores]')");
  await t.ev(`document.querySelector('[data-jogadores="2"]').click()`); await espera(300);
  await comecar(t);
  ok(await ate(t, "teste.vivo && teste.j2.escolhendo", 40000), "o jogador 2 entra e escolhe");
  await espera(800); await aperta(t, 1, 0);
  ok(await ate(t, "teste.dois", 4000), "jogador 2 escolheu (Alice)");
  // perto
  await t.ev("teste.ir(0, 33); teste.olhar(Math.PI); teste.j2.colocarPerto()"); await espera(2500);
  ok((await t.ev("teste.naTela")).every(Boolean) && await t.ev("teste.j2.cracha1?.visivel === true"), "perto: os dois na tela, crachá azul do Rabisco e rosa do jogador 2");
  const cp = await t.ev("teste.camDist");
  await foto(t, "jogo2-perto.png");
  // longe: o jogador 2 a 15 m, de lado → a câmera afasta e sobe até caber os dois
  await t.ev(`(() => { const y = teste.camYaw, rx = Math.cos(y), rz = -Math.sin(y); teste.j2.st.pos.set(teste.j.pos.x + rx * 15, 0.07, teste.j.pos.z + rz * 15); })()`);
  await ate(t, "teste.naTela.every(Boolean) && teste.j2.zoom > 3", 15000, 300); await espera(1500);
  const cl = await t.ev("teste.camDist"), zl = await t.ev("teste.j2.zoom"), dl = await t.ev(dist12);
  ok((await t.ev("teste.naTela")).every(Boolean) && cl.alt > cp.alt + 2 && zl > 3, `longe (${dl.toFixed(1)} m): a câmera afastou e subiu (alt ${cp.alt.toFixed(1)} → ${cl.alt.toFixed(1)} m, zoom ${zl.toFixed(1)}) e os dois cabem`);
  const m = await t.ev("teste.medir()");
  ok(m.total.calls <= 250, `orçamento TV com os dois longe: ${m.total.calls} chamadas com sombra (${m.semSombra.calls} sem), ${Math.round(m.total.tris / 1000)} mil triângulos`);
  await foto(t, "jogo2-longe.png");
  // coleira: o jogador 2 continua indo para longe e para em ~17 m
  await t.ev(`(() => { const y = teste.camYaw; window.__lado = [Math.cos(y), -Math.sin(y)]; })()`);
  await t.ev("__eixo(1, 1, 0)"); await espera(3500); await t.ev("__eixo(1, 0, 0)");
  const dc = await t.ev(dist12);
  ok(dc <= 17.3 && dc >= 12, `coleira macia: o jogador 2 para a ${dc.toFixed(1)} m (máx. 17)`);
  ok(await t.ev("document.querySelector('.acao-j2-rp:not([hidden])')?.textContent.includes('vir para perto')"), "longe: balão do jogador 2 ensina 'Segure para vir para perto'");
  // seta: o jogador 2 atrás da câmera (fora do quadro) → seta rosa na borda
  await t.ev(`(() => { const y = teste.camYaw, fx = Math.sin(y), fz = Math.cos(y); teste.j2.st.pos.set(teste.j.pos.x - fx * 16, 0.07, teste.j.pos.z - fz * 16); teste.j2.hud(teste.cam, {}); })()`);
  const seta = await t.ev("teste.j2.setas[1]");
  await foto(t, "jogo2-seta-indicador.png");
  ok(seta, "jogador 2 fora do quadro: seta rosa '2 · Alice' na borda");
  await ate(t, "teste.naTela.every(Boolean)", 8000, 300);
  ok(await t.ev("teste.naTela.every(Boolean)"), "e a câmera volta a enquadrar os dois");
  // vir para perto: segurar X 1 s
  await t.ev(`(() => { const y = teste.camYaw, rx = Math.cos(y), rz = -Math.sin(y); teste.j2.st.pos.set(teste.j.pos.x + rx * 12, 0.07, teste.j.pos.z + rz * 12); })()`); await espera(500);
  await t.ev("__btn(1, 2, true)"); await ate(t, `${dist12} < 4`, 6000, 200); await t.ev("__btn(1, 2, false)");
  ok(await t.ev(`${dist12} < 4`), `segurar X = 'vir para perto' (${(await t.ev(dist12)).toFixed(1)} m)`);
  // veículo independente: o Rabisco entra no carro com o jogador 2 longe → o 2 fica a pé
  await t.ev("teste.ir(4, 33)"); await espera(600);
  await t.ev(`(() => { const v = teste.veiculos[0]; teste.j2.st.pos.set(v.pos.x + 11, 0.07, v.pos.z); teste.entrar(0); })()`); await espera(900);
  ok(await t.ev("!teste.j2.sentado && teste.j2.aPe && teste.j2.fora"), "Rabisco entrou no carro com o jogador 2 longe: o 2 continua a pé");
  ok((await t.ev("teste.naTela")).every(Boolean), "câmera enquadra o carro e o jogador 2 a pé");
  await foto(t, "jogo2-carro-e-a-pe.png");
  await t.ev(`(() => { const v = teste.dentro; teste.j2.st.pos.set(v.pos.x + Math.cos(v.ang) * (v.larg + 1.4), 0.07, v.pos.z - Math.sin(v.ang) * (v.larg + 1.4)); })()`); await espera(900);
  const rot = await t.ev("document.querySelector('.acao-j2-rp:not([hidden])')?.textContent || ''");
  await aperta(t, 1, 2);
  ok(rot.includes("carona") && await ate(t, "teste.j2.sentado", 3000), `perto do carro parado: X entra de carona ("${rot.trim()}")`);
  await espera(600);
  await aperta(t, 1, 2);
  ok(await t.ev("teste.j2.sentado && teste.j2.acena > 0"), "na carona: tocar X acena (não desce sem querer)");
  await t.ev("__btn(1, 2, true)"); await ate(t, "teste.j2.aPe && teste.j2.fora", 5000, 200); await t.ev("__btn(1, 2, false)");
  ok(await t.ev("teste.j2.aPe && teste.j2.fora"), "carro parado: segurar X desce (o jogador 2 passeia a pé)");
  ok(!errosRP(t).length, "2 jogadores: sem erros " + errosRP(t).join(" ; "));
  await t.fechar();
}

// ------------------------------------------------------------------ 1 jogador: câmera por veículo
if (quer("veiculos")) {
  const t = await abrir2(`${URL_RP}&jogadores=1`, 1);
  await comecar(t);
  await ate(t, "teste.vivo", 40000);
  await t.ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(2500);
  ok(await t.ev("!teste.dois"), "1 jogador: só o Rabisco");
  const medidas = {};
  medidas.pe = await t.ev("teste.camDist");
  await foto(t, "camera-1-a-pe.png");
  for (const [tipo, nome] of [["carro", "carro"], ["onibus", "onibus"], ["reciclagem", "caminhao-marlon"]]) {
    await t.ev("teste.sair(); teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(600);
    await t.ev(`teste.garagem(${JSON.stringify(tipo)})`); await espera(600);
    const i = await t.ev(`(() => { let m = -1, d = 1e9; teste.veiculos.forEach((v, k) => { if (v.tipo !== ${JSON.stringify(tipo)}) return; const e = Math.hypot(v.pos.x - teste.j.pos.x, v.pos.z - teste.j.pos.z); if (e < d) { d = e; m = k; } }); return m; })()`);
    ok(i >= 0, `${nome}: veículo na garagem`);
    if (i < 0) continue;
    await t.ev(`(() => { const v = teste.veiculos[${i}]; teste.posVeiculo(${i}, 0, 30, Math.PI); teste.entrar(${i}); })()`);
    // transição sem pulo: a câmera anda no máximo ~2,5 m por amostra (≈ 0,1 s) ao entrar
    let antes = await t.ev("[teste.cam.position.x, teste.cam.position.y, teste.cam.position.z]"), salto = 0;
    for (let k = 0; k < 15; k++) { await espera(100); const p = await t.ev("[teste.cam.position.x, teste.cam.position.y, teste.cam.position.z]"); salto = Math.max(salto, Math.hypot(p[0] - antes[0], p[1] - antes[1], p[2] - antes[2])); antes = p; }
    await espera(2500);
    medidas[nome] = await t.ev("teste.camDist");
    ok(salto < 3, `${nome}: transição suave ao entrar (maior passo da câmera ${salto.toFixed(2)} m)`);
    await foto(t, `camera-2-${nome}.png`);
  }
  console.log("  câmera (distância atrás / altura):", Object.entries(medidas).map(([k, v]) => `${k} ${v.dist.toFixed(1)}/${v.alt.toFixed(1)}`).join(" · "));
  ok(medidas.carro && medidas.carro.dist > medidas.pe.dist, "carro: câmera um pouco mais longe que a pé");
  ok(medidas.onibus && medidas.onibus.dist > medidas.carro.dist + 2 && medidas.onibus.alt > medidas.carro.alt + 1.5, "ônibus: bem mais longe e mais alta que o carro");
  ok(medidas["caminhao-marlon"] && medidas["caminhao-marlon"].dist > medidas.carro.dist + 1.5 && medidas["caminhao-marlon"].alt > medidas.carro.alt + 1, "caminhão da Marlon Máquinas: mais longe e mais alta que o carro");
  await t.ev("teste.sair()"); await espera(1500);
  const volta = await t.ev("teste.camDist");
  ok(Math.abs(volta.dist - medidas.pe.dist) < 2.5, `saiu do veículo: a câmera volta para perto (${volta.dist.toFixed(1)} m)`);
  ok(!errosRP(t).length, "veículos: sem erros " + errosRP(t).join(" ; "));
  await t.fechar();
}
console.log(falhas ? `${falhas} falha(s)` : "tudo certo", "· fotos em", PASTA);
process.exit(falhas ? 1 : 0);
