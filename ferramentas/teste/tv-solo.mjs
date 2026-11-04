// TV (/tv) com UM jogador na Rabiscolândia, por cada caminho de entrada:
//  (a) 1 controle físico (Gamepad API simulada) + "1 jogador" → JOGAR → abre e o controle anda com o Rabisco;
//  (b) o caso da falha: a vaga 1 ficou com um celular que caiu (troca de página) e só há 1 controle → o controle vira
//      o Rabisco (antes ele ia para a vaga 2, "de fora", e o jogo parava esperando o celular);
//  (c) só teclado (computador no HDMI / controle remoto da TV): JOGAR → vaga 1 "teclado" → as setas andam com o Rabisco;
//  (d) só o celular pelo QR (página do controle de verdade, toques de verdade) → o joystick anda com o Rabisco.
// Uso: node --experimental-websocket ferramentas/teste/tv-solo.mjs [http://localhost:8080] [pasta-das-fotos]   (SO=ab roda só (a) e (b))
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
const BASE = process.argv[2] || "http://localhost:8080";
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const PASTA = (process.argv[3] || RAIZ + ".claude/tmp/tv-solo").replace(/\/?$/, "/");
mkdirSync(PASTA, { recursive: true });
let falhas = 0;
const quer = (k) => !process.env.SO || process.env.SO.includes(k);
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 20000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDe = (t) => t.erros.filter((e) => !/assets\/voz\/(cid-|rp-|nomes\/)/.test(e));

const portaLivre = () => new Promise((r) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const PORTA = await portaLivre();
const SALA = `ws://localhost:${PORTA}`;
if (!existsSync(RAIZ + "servidor/node_modules/ws")) { console.log("✗ servidor/node_modules não encontrado: rode `cd servidor && npm ci`"); process.exit(1); }
const relay = spawn(process.execPath, ["sala.mjs"], { cwd: RAIZ + "servidor", env: { ...process.env, PORT: String(PORTA), ORIGENS: "" }, stdio: "ignore" });
process.on("exit", () => { try { relay.kill(); } catch { /* já saiu */ } });
await espera(1200);

const PADS = `
  window.__pads = [0, 1].map((i) => ({ index: i, id: "teste " + i, connected: true, mapping: "standard", timestamp: 0,
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }));
  window.__nPads = Number(sessionStorage.getItem("__nPads") || 0);
  navigator.getGamepads = () => window.__pads.map((p, i) => (i < window.__nPads && p.connected ? p : null));
  window.__liga = (n) => { window.__nPads = n; sessionStorage.setItem("__nPads", n); dispatchEvent(Object.assign(new Event("gamepadconnected"), { gamepad: window.__pads[n - 1] })); };
  window.__btn = (p, i, v) => { window.__pads[p].buttons[i].pressed = v; window.__pads[p].buttons[i].value = v ? 1 : 0; };
`;
async function telaTV(url, antes = "") {
  const t = await abrir("about:blank", { largura: 1280, altura: 720 });
  await t.cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: PADS + antes });
  await t.cmd("Page.navigate", { url });
  return t;
}
const URL_TV = `${BASE}/tv/?teste&sala=${encodeURIComponent(SALA)}`;
const aperta = async (t, b, ms = 400) => { await t.ev(`__btn(0, ${b}, true)`); await espera(ms); await t.ev(`__btn(0, ${b}, false)`); await espera(200); };
const tecla = async (t, key, code, kc, tipo) => t.cmd("Input.dispatchKeyEvent", { type: tipo, key, code, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc, ...(key === "Enter" && tipo === "keyDown" ? { text: "\r" } : {}) });
const pos = (t) => t.ev("[teste.j.pos.x, teste.j.pos.z]");
const andou = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
// abre a Rabiscolândia pelo JOGAR, confere modo TV em 1 jogador e começa (o "JOGAR ▶" da abertura já vem em foco)
async function jogar(t, comecar) {
  ok(await ate(t, "location.pathname.includes('/jogos/rabiscopolis/') && !!window.teste && window.Jogadores?.tv === true", 40000), "abriu a Rabiscolândia em modo TV");
  ok(await t.ev("Jogadores.modo === 1 && !Jogadores.j2Pronto"), `1 jogador: só o Rabisco (vagas ${await t.ev("JSON.stringify(Jogadores.salaTV.vagas.map((v) => v.tipo + ':' + v.conectado))")})`);
  await ate(t, "document.activeElement?.classList.contains('botao')", 4000);
  await comecar();
  ok(await ate(t, "teste.jogo.estado === 'jogando' && teste.vivo", 40000), "começou a jogar");
  await espera(2500);
  ok(await t.ev("!document.querySelector('.jog-aviso:not([hidden])')"), "sem aviso de 'desconectou' segurando o jogo");
}

// ------------------------------------------------------------------ (a) 1 controle + 1 jogador
if (quer("a")) {
  const t = await telaTV(URL_TV);
  await ate(t, "window.tvTeste?.sala?.estado === 'aberta'");
  await t.ev("__liga(1)"); await aperta(t, 0);
  ok(await ate(t, "tvTeste.vagas[0].tipo === 'controle' && tvTeste.vagas[0].conectado", 4000), "(a) o controle ganhou a vaga 1 (Rabisco)");
  ok(await t.ev("tvTeste.jogadores === 1 && tvTeste.foco === 'rabiscopolis'"), "(a) 1 jogador e o foco no JOGAR Rabiscolândia");
  await aperta(t, 0); // A no JOGAR
  await jogar(t, () => aperta(t, 0));
  const p0 = await pos(t);
  await t.ev("__pads[0].axes[1] = -1"); await ate(t, `Math.hypot(teste.j.pos.x - ${p0[0]}, teste.j.pos.z - ${p0[1]}) > 1.2`, 8000, 200); await t.ev("__pads[0].axes[1] = 0");
  const d = andou(p0, await pos(t));
  ok(d > 1.2, `(a) a alavanca do controle anda com o Rabisco (${d.toFixed(1)} m)`);
  await t.foto(PASTA + "solo-controle.png");
  ok(!errosDe(t).length, "(a) sem erros " + errosDe(t).join(" ; "));
  await t.fechar();
}

// ------------------------------------------------------------------ (b) vaga 1 com celular que caiu + 1 controle (a falha relatada)
if (quer("b")) {
  const FANTASMA = `if (!sessionStorage.getItem("rabisco.tv")) sessionStorage.setItem("rabisco.tv", JSON.stringify({ vagas: [{ tipo: "celular", cel: "celular-que-saiu" }, { tipo: null }], jogadores: 1 }));`;
  const t = await telaTV(URL_TV, FANTASMA);
  await ate(t, "window.tvTeste?.sala?.estado === 'aberta'");
  ok(await t.ev("tvTeste.vagas[0].tipo === 'celular' && !tvTeste.vagas[0].conectado"), "(b) a vaga 1 está com um celular desconectado");
  await t.ev("__liga(1)"); await aperta(t, 0);
  ok(await ate(t, "tvTeste.vagas[0].tipo === 'controle' && tvTeste.vagas[0].conectado && !tvTeste.vagas[1].tipo", 4000), `(b) o controle assume a vaga 1 (o Rabisco), não a 2 (${await t.ev("JSON.stringify(tvTeste.vagas.map((v) => v.tipo))")})`);
  await t.foto(PASTA + "solo-controle-assumiu.png");
  await aperta(t, 0);
  await jogar(t, () => aperta(t, 0));
  const p0 = await pos(t);
  await t.ev("__pads[0].axes[0] = 1"); await ate(t, `Math.hypot(teste.j.pos.x - ${p0[0]}, teste.j.pos.z - ${p0[1]}) > 1.2`, 8000, 200); await t.ev("__pads[0].axes[0] = 0");
  const d = andou(p0, await pos(t));
  ok(d > 1.2, `(b) o controle anda com o Rabisco (${d.toFixed(1)} m)`);
  ok(!errosDe(t).length, "(b) sem erros " + errosDe(t).join(" ; "));
  await t.fechar();
}

// ------------------------------------------------------------------ (c) só teclado / controle remoto da TV
if (quer("c")) {
  const t = await telaTV(URL_TV);
  await ate(t, "window.tvTeste?.sala?.estado === 'aberta' && tvTeste.foco === 'rabiscopolis'");
  await tecla(t, "Enter", "Enter", 13, "keyDown"); await tecla(t, "Enter", "Enter", 13, "keyUp");
  await jogar(t, async () => { await tecla(t, "Enter", "Enter", 13, "keyDown"); await tecla(t, "Enter", "Enter", 13, "keyUp"); });
  ok(await t.ev("Jogadores.j1.entrada === 'teclado'"), "(c) o Rabisco é do teclado");
  const p0 = await pos(t);
  await tecla(t, "ArrowUp", "ArrowUp", 38, "keyDown");
  await ate(t, `Math.hypot(teste.j.pos.x - ${p0[0]}, teste.j.pos.z - ${p0[1]}) > 1.2`, 8000, 200);
  await tecla(t, "ArrowUp", "ArrowUp", 38, "keyUp");
  const d = andou(p0, await pos(t));
  ok(d > 1.2, `(c) a seta ↑ anda com o Rabisco (${d.toFixed(1)} m)`);
  await t.foto(PASTA + "solo-teclado.png");
  ok(!errosDe(t).length, "(c) sem erros " + errosDe(t).join(" ; "));
  await t.fechar();
}

// ------------------------------------------------------------------ (d) só o celular pelo QR
if (quer("d")) {
  const t = await telaTV(URL_TV);
  await ate(t, "window.tvTeste?.sala?.estado === 'aberta'");
  const link = await t.ev("tvTeste.sala.link");
  const c = await abrir("about:blank", { mobile: true, largura: 844, altura: 390 });
  await c.cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  await c.cmd("Page.navigate", { url: link });
  ok(await ate(t, "tvTeste.vagas[0].tipo === 'celular' && tvTeste.vagas[0].conectado", 30000), "(d) o celular entrou na vaga 1 (Rabisco)");
  await t.ev("tvTeste.abrir('rabiscopolis')");
  const centro = (sel) => c.ev(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
  const tocar = async (sel) => { const [x, y] = await centro(sel); await c.cmd("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }); await espera(500); await c.cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await espera(300); };
  await jogar(t, async () => {
    await ate(c, "!!document.querySelector('.btn[data-btn=pulo]')", 15000);
    // o botão do celular confirma o "JOGAR ▶" em foco (como o A do controle)
    for (let k = 0; k < 4 && (await t.ev("teste.jogo.estado !== 'jogando'")); k++) { await tocar(".btn[data-btn=pulo]"); await espera(800); }
  });
  await ate(c, "!!document.querySelector('.joy')", 10000);
  const [x, y] = await centro(".joy");
  const p0 = await pos(t);
  await c.cmd("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let k = 1; k <= 6; k++) { await c.cmd("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - (60 * k) / 6 }] }); await espera(16); }
  await ate(t, `Math.hypot(teste.j.pos.x - ${p0[0]}, teste.j.pos.z - ${p0[1]}) > 1.2`, 10000, 200);
  await c.cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const d = andou(p0, await pos(t));
  ok(d > 1.2, `(d) o joystick do celular anda com o Rabisco (${d.toFixed(1)} m)`);
  await t.foto(PASTA + "solo-celular.png");
  ok(!errosDe(t).length, "(d) sem erros " + errosDe(t).join(" ; "));
  await c.fechar();
  await t.fechar();
}
console.log(falhas ? `${falhas} falha(s)` : "tudo certo", "· fotos em", PASTA);
process.exit(falhas ? 1 : 0);
