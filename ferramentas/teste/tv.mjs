// Tela da TV (<site>/tv): sobe o relay real (servidor/sala.mjs), abre /tv como a TV (1280×720, sem toque), entra com
// controle (gamepad simulado) e com "celulares" simulados (página do controle de verdade, toques de verdade) e confere:
//  (a) /tv mostra QR (decodificado = atalho curto /c/) e o código;  (b) controle aperta botão → vaga 1 (Rabisco), celular → vaga 2;
//  (c) sem controle, 2 celulares → vagas 1 e 2;  (d) escolhe o Kart pelas setas + celular → jogo em modo TV, cada kart só pelo seu celular;
//  (e) celular cai e volta na mesma vaga;  (f) "Voltar ao menu da TV" (pela pausa, só com o celular) volta com os jogadores;  (g) Cidade em modo TV.
// Uso: node --experimental-websocket ferramentas/teste/tv.mjs [http://localhost:8080]
// Fotos em .claude/tmp/tv/.
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
const BASE = process.argv[2] || "http://localhost:8080";
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const PASTA = RAIZ + ".claude/tmp/tv/";
mkdirSync(PASTA, { recursive: true });
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 20000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const foto = (t, nome) => t.foto(PASTA + nome);
// vozes da Cidade e do banco de nomes ainda não geradas não contam como erro (igual ao qr-controle.mjs)
const errosDe = (t) => t.erros.filter((e) => !/assets\/voz\/(cid-|nomes\/)/.test(e));

// ------------------------------------------------------------------ Relay real
const portaLivre = () => new Promise((r) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const PORTA = await portaLivre();
const SALA = `ws://localhost:${PORTA}`;
if (!existsSync(RAIZ + "servidor/sala.mjs") || !existsSync(RAIZ + "servidor/node_modules/ws")) {
  console.log("✗ servidor/sala.mjs (com node_modules) não encontrado: rode `cd servidor && npm ci` antes");
  process.exit(1);
}
const relay = spawn(process.execPath, ["sala.mjs"], { cwd: RAIZ + "servidor", env: { ...process.env, PORT: String(PORTA), ORIGENS: "" }, stdio: ["ignore", "pipe", "inherit"] });
let relayLog = "";
relay.stdout.on("data", (b) => { relayLog += b; });
const encerrar = () => { try { relay.kill(); } catch { /* já saiu */ } };
process.on("exit", encerrar);
let saude = null;
for (let i = 0; i < 40 && !saude; i++) { await espera(150); try { saude = await (await fetch(`http://localhost:${PORTA}/saude`)).json(); } catch { /* subindo */ } }
ok(saude?.ok === true, `relay real de servidor/ no ar na porta ${PORTA}`);

// ------------------------------------------------------------------ TV e celulares simulados
// 2 gamepads simulados; quantos estão "ligados" fica no sessionStorage da aba (sobrevive à troca /tv → jogo, como na TV de verdade)
const PADS = `
  window.__pads = [0, 1].map((i) => ({ index: i, id: "teste " + i, connected: true, mapping: "standard", timestamp: 0,
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }));
  window.__nPads = Number(sessionStorage.getItem("__nPads") || 0);
  navigator.getGamepads = () => window.__pads.map((p, i) => (i < window.__nPads && p.connected ? p : null));
  window.__liga = (n) => { window.__nPads = n; sessionStorage.setItem("__nPads", n); dispatchEvent(Object.assign(new Event("gamepadconnected"), { gamepad: window.__pads[n - 1] })); };
  window.__btn = (p, i, v) => { window.__pads[p].buttons[i].pressed = v; window.__pads[p].buttons[i].value = v ? 1 : 0; };
`;
const CADASTRO = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t.com" }, crianca: { nome: "Alice Souza", genero: "menina" } }));`;
async function telaTV(url) {
  const t = await abrir("about:blank", { largura: 1280, altura: 720 });
  // a TV é a janela em foco: sem isto, uma tecla mandada pelo CDP deixa a página "escondida" no Chrome sem janela (e o jogo pausa)
  await t.cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: PADS + CADASTRO });
  await t.cmd("Page.navigate", { url });
  return t;
}
// celular na mão da criança: página em foco (sem isto o Chrome sem janela pode "esconder" a página e atrasar os envios)
async function celular(url) {
  const c = await abrir("about:blank", { mobile: true, largura: 390, altura: 844 });
  await c.cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  await c.cmd("Page.navigate", { url });
  return c;
}
const centro = (t, sel) => t.ev(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
async function segurar(t, sel, ms, durante = null) {
  const [x, y] = await centro(t, sel);
  await t.cmd("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await espera(ms);
  const r = durante ? await durante() : null;
  await t.cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await espera(250);
  return r;
}
// segura o botão do celular até a TV mostrar o efeito (a TV sem janela roda a poucos quadros por segundo), no máximo 4 s
async function segurarAte(c, sel, tv, cond, medir, ms = 4000) {
  const [x, y] = await centro(c, sel);
  await c.cmd("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await espera(600);
  await ate(tv, cond, ms, 150);
  const r = await tv.ev(medir);
  await c.cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await espera(250);
  return r;
}
// joystick do celular: arrasta do centro na direção (dx, dy) e segura
async function joystick(c, dx, dy, ms = 300, durante = null) {
  const [x, y] = await centro(c, ".joy");
  await c.cmd("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let k = 1; k <= 6; k++) { await c.cmd("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * k) / 6, y: y + (dy * k) / 6 }] }); await espera(16); }
  await espera(ms);
  const r = durante ? await durante() : null;
  await c.cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await espera(300);
  return r;
}
const tecla = async (t, key, code, kc) => {
  await t.cmd("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc, ...(key === "Enter" ? { text: "\r" } : {}) });
  await t.cmd("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
  await espera(250);
};
const lerQr = (t) => t.ev(`(async () => {
  if (!("BarcodeDetector" in window)) return null;
  const svg = document.querySelector("#qr svg"); if (!svg) return "";
  const img = new Image(); img.src = "data:image/svg+xml," + encodeURIComponent(svg.outerHTML); await img.decode();
  const c = document.createElement("canvas"); c.width = c.height = 400; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, 400, 400);
  return (await new BarcodeDetector({ formats: ["qr_code"] }).detect(c))[0]?.rawValue ?? "";
})()`);
const vagas = (t) => t.ev("JSON.stringify(window.tvTeste?.vagas ?? Jogadores.salaTV?.vagas)").then((s) => JSON.parse(s || "[]"));

// ------------------------------------------------------------------ (a) + (b): QR e código; controle → vaga 1, celular → vaga 2
{
  // "/tv" sem barra e sem nada no aparelho: o caminho curto tem que abrir a tela da TV
  const t = await telaTV(`${BASE}/tv?teste&sala=${encodeURIComponent(SALA)}`);
  ok(await ate(t, "location.pathname.endsWith('/tv/') && window.tvTeste?.sala?.estado === 'aberta'"), "(a) /tv abre a tela da TV e a sala")
  ok(await ate(t, "!!document.querySelector('#qr svg')"), "(a) QR grande na tela");
  const codigo = await t.ev("document.getElementById('codigo').textContent");
  ok(/^[ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(codigo), `(a) código de 4 letras gigante (${codigo})`);
  const tam = await t.ev("[document.querySelector('#qr').getBoundingClientRect().width, parseFloat(getComputedStyle(document.getElementById('codigo')).fontSize)]");
  ok(tam[0] >= 160 && tam[1] >= 56, `(a) QR e código grandes para ver de longe (QR ${Math.round(tam[0])} px, código ${Math.round(tam[1])} px)`);
  const link = await t.ev("tvTeste.sala.link");
  ok(link === `${BASE}/c/?s=${codigo}&sala=${encodeURIComponent(SALA)}`, `(a) QR leva ao atalho curto /c/ (${link})`);
  const lido = await lerQr(t);
  if (lido === null) console.log("  (sem BarcodeDetector neste Chrome: QR não decodificado)");
  else ok(lido === link, "(a) QR decodificado = link do controle");
  ok(await t.ev(`document.getElementById('endereco').textContent.includes('localhost:8080/c ')`) || await t.ev(`document.getElementById('endereco').textContent.includes('/c e digite')`), "(a) texto 'ou abra <host>/c e digite o código'");
  ok(await t.ev("document.getElementById('vaga-1').textContent.includes('1 · Rabisco') && document.getElementById('vaga-2').textContent.includes('2 · Alice')"), "(a) vagas '1 · Rabisco' e '2 · Alice' (nome da criança do cadastro)");
  ok(await t.ev("!document.getElementById('dica-controle').hidden && document.getElementById('dica-controle').textContent.includes('Aperte qualquer botão do controle')"), "(a) dica '🎮 Aperte qualquer botão do controle'");
  ok(await t.ev("tvTeste.foco === 'rabisco-kart'"), "(a) o foco já começa no primeiro jogo");
  ok(!(await t.ev("document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1")), "(a) tudo cabe na tela da TV (sem rolagem)");
  await foto(t, "tv-menu-vazio.png");

  // (b) controle físico: aperta A → ganha a vaga 1 (e esse aperto não abre o jogo)
  await t.ev("__liga(1); __btn(0, 0, true)");
  await espera(300);
  await t.ev("__btn(0, 0, false)");
  ok(await ate(t, "tvTeste.vagas[0].tipo === 'controle' && tvTeste.vagas[0].conectado", 3000), "(b) controle apertou um botão → vaga 1 (Rabisco) 🎮");
  await espera(400);
  ok(await t.ev("location.pathname.endsWith('/tv/') && document.getElementById('vaga-1').textContent.includes('🎮')"), "(b) o aperto que ganhou a vaga não abriu o jogo; vaga 1 mostra 🎮");
  // celular pelo atalho curto sem barra (/c?s=...) → vaga 2
  const c = await celular(`${BASE}/c?s=${codigo}&sala=${encodeURIComponent(SALA)}`);
  ok(await ate(c, "window.controleTeste?.conectado === true"), "(b) celular entrou pelo atalho /c (sem barra)");
  ok(await ate(t, "tvTeste.vagas[1].tipo === 'celular' && tvTeste.vagas[1].conectado", 5000), "(b) celular → vaga 2 (companheiro) 📱");
  ok(await ate(c, "controleTeste.layout === 'padrao' && document.getElementById('chip-nome').textContent === 'Alice'"), "(b) celular no menu: layout 'padrao' e só o primeiro nome (Alice)");
  ok(await t.ev("document.getElementById('vaga-2').textContent.includes('📱') && document.getElementById('dica-controle').hidden"), "(b) vaga 2 mostra 📱 e a dica some (vagas cheias)");
  // controle navega o menu: direcional → foco no 2º jogo
  await t.ev("__btn(0, 15, true)"); await espera(200); await t.ev("__btn(0, 15, false)"); await espera(250);
  ok(await t.ev("tvTeste.foco === 'cidade-do-rabisco'"), "(b) direcional do controle move o foco entre os jogos");
  // celular navega o menu: joystick para a esquerda → volta ao Kart
  await joystick(c, -90, 0, 250);
  ok(await ate(t, "tvTeste.foco === 'rabisco-kart'", 3000), "(b) joystick do celular move o foco no menu da TV");
  await espera(1900); // o recado "entrou" some
  await foto(t, "tv-menu.png");
  await foto(c, "controle-menu.png");
  ok(!errosDe(t).length, "(a/b) TV sem erros " + errosDe(t).join(" ; "));
  ok(!c.erros.length, "(b) celular sem erros " + c.erros.join(" ; "));
  await c.fechar();
  await t.fechar();
}

// ------------------------------------------------------------------ (c) sem controle: 2 celulares → vagas 1 e 2
const t = await telaTV(`${BASE}/tv/?teste&sala=${encodeURIComponent(SALA)}`);
await ate(t, "window.tvTeste?.sala?.estado === 'aberta'");
const link = await t.ev("tvTeste.sala.link");
const c1 = await celular(link);
ok(await ate(t, "tvTeste.vagas[0].tipo === 'celular' && tvTeste.vagas[0].conectado", 8000), "(c) 1º celular → vaga 1 (Rabisco)");
ok(await ate(c1, "document.getElementById('chip-nome').textContent === 'Rabisco'"), "(c) 1º celular mostra 'Rabisco'");
const c2 = await celular(link);
ok(await ate(t, "tvTeste.vagas[1].tipo === 'celular' && tvTeste.vagas[1].conectado", 8000), "(c) 2º celular → vaga 2 (Alice)");
ok(await ate(c2, "document.getElementById('chip-nome').textContent === 'Alice'"), "(c) 2º celular mostra 'Alice'");
const v0 = await vagas(t);

// ------------------------------------------------------------------ (d) escolhe o Kart pelas setas (controle remoto da TV) e o celular confirma
await tecla(t, "ArrowRight", "ArrowRight", 39);
ok(await t.ev("tvTeste.foco === 'cidade-do-rabisco'"), "(d) seta → (controle remoto da TV) move o foco");
await tecla(t, "ArrowLeft", "ArrowLeft", 37);
ok(await t.ev("tvTeste.foco === 'rabisco-kart'"), "(d) seta ← volta ao Kart");
await segurar(c1, ".btn[data-btn=pulo]", 150); // botão do celular confirma (como o A do controle)
ok(await ate(t, "location.pathname.includes('/jogos/rabisco-kart/') && new URLSearchParams(location.search).get('tv') === '1'", 10000), "(d) Kart abriu em modo TV (?tv=1)");
ok(await ate(t, "!!window.teste && window.Jogadores?.tv === true", 30000), "(d) jogo sabe que está na TV");
ok(await ate(t, "Jogadores.salaTV.vagas.every((v) => v.tipo === 'celular' && v.conectado) && Jogadores.salaTV.sala.codigo === " + JSON.stringify(link.match(/s=(\w+)/)[1]), 10000), "(d) mesma sala da TV: os 2 celulares voltaram nas mesmas vagas");
const v1 = await vagas(t);
ok(v1[0].cel === v0[0].cel && v1[1].cel === v0[1].cel, `(d) celular 1 = Rabisco, celular 2 = companheiro (${v1.map((v) => v.cel).join(", ")})`);
ok(await ate(c1, "controleTeste.layout === 'kart' && !document.getElementById('pausar').hidden") && await ate(c2, "controleTeste.layout === 'kart'"), "(d) celulares passaram sozinhos para o layout 'kart' (com ⏸)");
ok(await t.ev("Jogadores.modo === 2 && Jogadores.j1.entrada === 'celular' && Jogadores.j2.entrada === 'celular'"), "(d) 2 jogadores: Rabisco 📱 e Alice 📱");
ok(await t.ev("getComputedStyle(document.querySelector('.toque')).display === 'none' && getComputedStyle(document.getElementById('som')).display === 'none' && document.documentElement.classList.contains('modo-tv')"), "(d) sem botões de toque na tela (HUD limpo do Modo TV)");
ok(await ate(t, "document.activeElement?.id === 'jogar'", 3000), "(d) foco já no 'CORRER'");
await segurar(c1, ".btn[data-btn=acao]", 120); // buzina = confirma no menu
ok(await ate(t, "teste.estado === 'corrida' && teste.dividida && teste.j2?.humano === 2", 30000), "(d) corrida em 2 (tela dividida) começou pelo celular");
await espera(800);
const e1 = await segurarAte(c1, ".btn[data-btn=esq]", t, "teste.jogador.virar > 0.3", "[teste.jogador.virar, teste.j2.virar]");
ok(e1[0] > 0.3 && Math.abs(e1[1]) < 0.3, `(d) ◀ no celular 1 vira só o kart do Rabisco (j1 ${e1[0].toFixed(2)}, j2 ${e1[1].toFixed(2)})`);
await espera(1800); // o volante do Rabisco volta ao meio aos poucos
const e2 = await segurarAte(c2, ".btn[data-btn=dir]", t, "teste.j2.virar < -0.3", "[teste.jogador.virar, teste.j2.virar]");
ok(e2[1] < -0.3 && Math.abs(e2[0]) < 0.3, `(d) ▶ no celular 2 vira só o kart da Alice (j1 ${e2[0].toFixed(2)}, j2 ${e2[1].toFixed(2)})`);
await tecla(t, "ArrowLeft", "ArrowLeft", 37);
await t.cmd("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 });
await espera(500);
const tecl = await t.ev("teste.jogador.virar");
await t.cmd("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 });
ok(Math.abs(tecl) < 0.3, `(d) teclado da TV não pilota o Rabisco (${tecl.toFixed(2)})`);
await espera(400);
await foto(t, "tv-kart.png");
await foto(c1, "controle-kart-tv.png");

// ------------------------------------------------------------------ (e) celular 2 cai e volta na mesma vaga
const antes = await c2.ev("controleTeste.sessao");
await c2.ev("controleTeste.derrubar()");
ok(await ate(t, "!!document.querySelector('.jog-aviso:not([hidden])')?.textContent.includes('celular da Alice Souza desconectou')", 3000, 50), "(e) celular da Alice caiu → aviso amigável na TV");
await foto(t, "tv-kart-celular-caiu.png");
ok(await ate(t, "!document.querySelector('.jog-aviso:not([hidden])') && Jogadores.salaTV.vagas[1].conectado", 8000), "(e) celular voltou sozinho e o aviso fechou");
ok(await ate(c2, "controleTeste.conectado", 5000) && JSON.stringify(await c2.ev("controleTeste.sessao")) === JSON.stringify(antes) && (await vagas(t))[1].cel === v0[1].cel, "(e) voltou na mesma vaga (mesmo id)");
const e3 = await segurarAte(c2, ".btn[data-btn=esq]", t, "teste.j2.virar > 0.3", "teste.j2.virar");
ok(e3 > 0.3, `(e) depois de voltar, o celular 2 ainda pilota o kart da Alice (${e3.toFixed(2)})`);
// celular 1 cai também: pausa e aviso com o nome do Rabisco
await c1.ev("controleTeste.derrubar()");
ok(await ate(t, "!!document.querySelector('.jog-aviso:not([hidden])')?.textContent.includes('celular do Rabisco desconectou') && !document.querySelector('.pausa-tela').hidden", 3000, 50), "(e) celular do Rabisco caiu → pausa + aviso");
ok(await ate(t, "!document.querySelector('.jog-aviso:not([hidden])') && Jogadores.salaTV.vagas[0].conectado", 8000), "(e) celular do Rabisco voltou e o aviso fechou");

// ------------------------------------------------------------------ (f) "Voltar ao menu da TV" pela pausa, só com o celular 1
await ate(c1, "controleTeste.conectado", 5000);
if (!(await t.ev("!document.querySelector('.pausa-tela').hidden"))) await segurar(c1, "#pausar", 150); // ⏸ do celular
ok(await ate(t, "!document.querySelector('.pausa-tela').hidden", 3000), "(f) ⏸ do celular pausa o jogo na TV");
ok(await t.ev("!!document.querySelector('.pausa-tela .voltar-tv')"), "(f) pausa tem '📺 Voltar ao menu da TV'");
// um toque por vez: espera o foco andar antes do próximo (a TV sem janela roda a poucos quadros por segundo)
for (let i = 0; i < 6 && !(await t.ev("document.activeElement?.classList.contains('voltar-tv')")); i++) {
  const antesFoco = await t.ev("document.activeElement?.className || ''");
  await segurar(c1, ".btn[data-btn=dir]", 150);
  await ate(t, `(document.activeElement?.className || '') !== ${JSON.stringify(antesFoco)}`, 2500, 100);
}
await espera(600);
ok(await t.ev("document.activeElement?.classList.contains('voltar-tv')"), "(f) ▶ do celular leva o foco até 'Voltar ao menu da TV'");
await foto(t, "tv-kart-pausa.png");
await segurar(c1, ".btn[data-btn=acao]", 120);
ok(await ate(t, "location.pathname.endsWith('/tv/') && !!window.tvTeste", 10000), "(f) voltou para /tv");
ok(await ate(t, "tvTeste.vagas.every((v) => v.tipo === 'celular' && v.conectado)", 10000), "(f) os 2 jogadores continuam conectados nas mesmas vagas");
ok(JSON.stringify((await vagas(t)).map((v) => v.cel)) === JSON.stringify(v0.map((v) => v.cel)), "(f) mesmos celulares, mesmas vagas");
ok(await ate(c1, "controleTeste.layout === 'padrao' && document.getElementById('pausar').hidden") && await ate(c2, "controleTeste.layout === 'padrao'"), "(f) celulares voltaram ao layout 'padrao' do menu");
await foto(t, "tv-menu-de-volta.png");

// ------------------------------------------------------------------ (g) Cidade em modo TV com os 2 celulares
await tecla(t, "ArrowRight", "ArrowRight", 39);
ok(await t.ev("tvTeste.foco === 'cidade-do-rabisco'"), "(g) seta → foca a Cidade");
await tecla(t, "Enter", "Enter", 13); // OK do controle remoto da TV
ok(await ate(t, "location.pathname.includes('/jogos/cidade-do-rabisco/') && !!window.teste && window.Jogadores?.tv === true", 30000), "(g) Cidade abriu em modo TV");
ok(await ate(t, "Jogadores.salaTV.vagas.every((v) => v.tipo === 'celular' && v.conectado)", 10000), "(g) os 2 celulares voltaram nas vagas");
ok(await ate(c1, "controleTeste.layout === 'cidade'") && await ate(c2, "controleTeste.layout === 'cidade'"), "(g) celulares no layout 'cidade' (joystick + ação)");
ok(await ate(t, "document.activeElement?.tagName === 'BUTTON' && document.activeElement.textContent.includes('JOGAR')", 3000), "(g) foco já no 'JOGAR'");
await segurar(c1, ".btn[data-btn=acao]", 120);
ok(await ate(t, "teste.dois && !!teste.companheiro && Jogadores.modo === 2", 40000), "(g) Cidade em 2: Rabisco + Alice");
ok(await t.ev("getComputedStyle(document.querySelector('.jd-camada')).display === 'none' && getComputedStyle(document.querySelector('.casca-topo .casca-redondo')).display === 'none'"), "(g) sem joystick nem botões de toque na tela");
await espera(3500);
const p0 = await t.ev("[teste.j.pos.x, teste.j.pos.z, teste.amigo.pos.x, teste.amigo.pos.z]");
await joystick(c2, 0, -90, 2500);
const p1 = await t.ev("[teste.j.pos.x, teste.j.pos.z, teste.amigo.pos.x, teste.amigo.pos.z]");
const andouJ1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), andouJ2 = Math.hypot(p1[2] - p0[2], p1[3] - p0[3]);
ok(andouJ2 > 1 && andouJ1 < 0.3, `(g) joystick do celular 2 move só a Alice (Alice ${andouJ2.toFixed(1)} m, Rabisco ${andouJ1.toFixed(1)} m)`);
await joystick(c1, 0, -90, 2500);
const p2 = await t.ev("[teste.j.pos.x, teste.j.pos.z]");
ok(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) > 0.5, `(g) joystick do celular 1 move o Rabisco (${Math.hypot(p2[0] - p1[0], p2[1] - p1[1]).toFixed(1)} m)`);
await foto(t, "tv-cidade.png");
await foto(c2, "controle-cidade-tv.png");

ok(!errosDe(t).length, "TV: sem erros " + errosDe(t).join(" ; "));
ok(!c1.erros.length && !c2.erros.length, "celulares: sem erros " + [...c1.erros, ...c2.erros].join(" ; "));
await c1.fechar(); await c2.fechar(); await t.fechar();

ok(!/Alice|"in"|"x":/.test(relayLog), "relay não registra conteúdo das mensagens");
encerrar();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo", "· fotos em", PASTA);
process.exit(falhas ? 1 : 0);
