// Celular de controle por QR code: sobe o relay de servidor/sala.mjs numa porta livre, abre o jogo como tela (tablet)
// com a sala de teste (?sala=ws://localhost:PORTA), lê o código na tela, abre a página do controle num "celular"
// simulado e aperta os botões com toques de verdade. Confere que só o jogador 2 se mexe, queda e volta do celular,
// prioridade do controle físico e o QR (decodificado com o BarcodeDetector do Chrome, quando existir).
// Uso: node --experimental-websocket ferramentas/teste/qr-controle.mjs [http://localhost:8080] [kart,cidade]
// Fotos em .claude/tmp/qr-controle/.
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
const BASE = process.argv[2] || "http://localhost:8080";
const SO = (process.argv[3] || "").split(",").filter(Boolean);
const quer = (n) => !SO.length || SO.includes(n);
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const PASTA = RAIZ + ".claude/tmp/qr-controle/";
mkdirSync(PASTA, { recursive: true });
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 20000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const foto = (t, nome) => t.foto(PASTA + nome);
// vozes novas da Cidade ainda não geradas: não contam como erro deste teste (igual ao dois-jogadores.mjs)
// e o nome completo de teste ("Alice Souza", para conferir que só "Alice" vai ao celular) não tem voz gravada no banco de nomes
const errosDe = (t) => t.erros.filter((e) => !/assets\/voz\/(cid-|nomes\/)/.test(e));

// ------------------------------------------------------------------ Relay real (servidor/sala.mjs)
const portaLivre = () => new Promise((ok) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });
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

// tela do jogo como tablet (toque) e SEM controle físico: o jogador 2 vai pelo QR
const PADS = `
  window.__pads = [0, 1].map((i) => ({ index: i, id: "teste " + i, connected: true, mapping: "standard", timestamp: 0,
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }));
  window.__nPads = 0;
  navigator.getGamepads = () => window.__pads.map((p, i) => (i < window.__nPads && p.connected ? p : null));
  window.__liga = (n) => { window.__nPads = n; window.__pads[0].connected = true; dispatchEvent(Object.assign(new Event("gamepadconnected"), { gamepad: window.__pads[0] })); };
  window.__desliga = () => { window.__pads[0].connected = false; window.__nPads = 0; dispatchEvent(Object.assign(new Event("gamepaddisconnected"), { gamepad: window.__pads[0] })); };
`;
const CADASTRO = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t.com" }, crianca: { nome: "Alice Souza", genero: "menina" } }));`;
async function tela(url) {
  const t = await abrir("about:blank", { mobile: true, largura: 1180, altura: 820 });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: PADS + CADASTRO });
  await t.cmd("Page.navigate", { url });
  return t;
}
const celular = (url) => abrir(url, { mobile: true, largura: 844, altura: 390 });
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
// segura o botão até a tela do jogo mostrar o efeito (ou até `max` ms): com a máquina ocupada a tela demora segundos para notar
async function segurarAte(t, sel, ler, bom, max = 40000) {
  const [x, y] = await centro(t, sel);
  await t.cmd("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  let r = await ler(); const fim = Date.now() + max;
  while (!bom(r) && Date.now() < fim) { await espera(150); r = await ler(); }
  await t.cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await espera(250);
  return r;
}
// decodifica o QR desenhado na tela (quando o Chrome tem BarcodeDetector)
const lerQr = (t, sel) => t.ev(`(async () => {
  if (!("BarcodeDetector" in window)) return null;
  const svg = document.querySelector(${JSON.stringify(sel)} + " svg"); if (!svg) return "";
  const img = new Image(); img.src = "data:image/svg+xml," + encodeURIComponent(svg.outerHTML); await img.decode();
  const c = document.createElement("canvas"); c.width = c.height = 400; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, 400, 400);
  return (await new BarcodeDetector({ formats: ["qr_code"] }).detect(c))[0]?.rawValue ?? "";
})()`);
async function conferirQr(t, nome) {
  ok(await ate(t, "Jogadores.sala?.estado === 'aberta' && !!document.querySelector('.jog-qr.ativo[data-estado=aberta] .qr-img svg')"), `${nome}: QR de verdade aparece no lugar da caixa tracejada`);
  const vis = await t.ev(`(() => { const b = document.querySelector('.jog-qr.ativo .qr-img').getBoundingClientRect(); return b.width >= 80 && b.top >= 0 && b.bottom <= innerHeight; })()`);
  ok(vis, `${nome}: QR visível na tela (≥ 80 px, dentro da tela)`);
  const codigo = await t.ev(`document.querySelector('.jog-qr-codigo')?.textContent || ''`);
  ok(/^[ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(codigo), `${nome}: código de 4 letras ao lado do QR (${codigo})`);
  const link = await t.ev("Jogadores.sala.link");
  // atalho curto /c/ (c/index.html leva para src/controle-remoto/ com o mesmo ?s=)
  ok(link === `${BASE}/c/?s=${codigo}&sala=${encodeURIComponent(SALA)}`, `${nome}: link do QR aponta para o atalho curto do controle no mesmo site (${link})`);
  const lido = await lerQr(t, ".jog-qr .qr-img");
  if (lido === null) console.log("  (sem BarcodeDetector neste Chrome: QR não decodificado)");
  else ok(lido === link, `${nome}: QR decodificado = link do controle`);
  return { codigo, link };
}

// ------------------------------------------------------------------ Kart
if (quer("kart")) {
  const t = await tela(`${BASE}/jogos/rabisco-kart/?teste&jogadores=2&sala=${encodeURIComponent(SALA)}`);
  await ate(t, "!!window.teste && !!document.querySelector('[data-jogadores]')");
  ok(await t.ev(`document.querySelector('.jog-quem [data-jogador="2"]')?.dataset.entrada`) === "qr", "Kart: tablet sem controle → jogador 2 pelo QR");
  const { link } = await conferirQr(t, "Kart");
  await foto(t, "host-kart-qr.png");
  // sem celular ainda: não deixa começar com 2
  await t.ev("document.getElementById('jogar').click()");
  await espera(500);
  ok(await t.ev("teste.estado === 'abertura' && document.querySelector('.jog-banner')?.textContent.includes('QR')"), "Kart: sem celular, 'Jogar' pede o QR ou um controle");

  const c = await celular(link);
  ok(await ate(c, "window.controleTeste?.conectado === true"), "Kart: celular entrou na sala");
  ok(await ate(t, "Jogadores.celular?.conectado === true && document.querySelector('.jog-qr')?.dataset.estado === 'conectado'"), "Kart: tela mostra 'Celular conectado ✓'");
  ok(await t.ev(`document.querySelector('.jog-qr')?.textContent.includes('Celular conectado')`), "Kart: texto 'Celular conectado ✓' na abertura");
  ok(await ate(c, "controleTeste.layout === 'kart' && document.getElementById('chip-nome').textContent === 'Alice'"), "Kart: celular recebe layout 'kart' e só o primeiro nome (Alice)");
  ok(await c.ev("!!document.querySelector('.btn[data-btn=esq]') && !!document.querySelector('.btn[data-btn=dir]') && !!document.querySelector('.btn[data-btn=acao]') && !document.querySelector('.joy')"), "Kart: celular com ◀ ▶ e buzina (sem joystick)");
  await foto(t, "host-kart-celular-conectado.png");
  await foto(c, "controle-kart-paisagem.png");
  ok(!(await c.transborda()), "Kart: controle (celular deitado) sem rolagem lateral");
  // em retrato o controle pede para girar o celular; emPe() dispensa o aviso
  await c.cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await espera(500);
  ok(await c.ev(`(() => { const g = document.querySelector('.girar'); return !!g && getComputedStyle(g).display !== 'none' && g.textContent.includes('Gire o celular'); })()`), "Kart: controle em retrato mostra o aviso 'Gire o celular'");
  await foto(c, "controle-kart-retrato.png");
  await c.ev("controleTeste.emPe()");
  await espera(300);
  ok(!(await c.transborda()), "Kart: controle em pé (emPe) sem rolagem lateral");
  await c.cmd("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await espera(300);

  // controle físico tem prioridade: conecta um → ele assume e o QR some; desconecta → volta o celular
  await t.ev("__liga(1)");
  await espera(400);
  ok(await t.ev(`Jogadores.j2.entrada === 'controle' && !document.querySelector('.jog-qr').classList.contains('ativo')`), "Kart: controle físico conectado assume o jogador 2 e o QR some");
  ok(await ate(c, "document.getElementById('recado-jogo').textContent.includes('controle')", 3000), "Kart: celular avisa que o controle 🎮 assumiu");
  await t.ev("__desliga()");
  await espera(400);
  ok(await t.ev("Jogadores.j2.entrada === 'celular'"), "Kart: sem o controle físico, o celular volta a valer");

  await t.ev("document.getElementById('jogar').click()");
  ok(await ate(t, "teste.dividida && teste.j2?.humano === 2 && teste.estado === 'corrida'", 30000), "Kart: corrida em 2 com o kart do jogador 2");
  await espera(800);
  const esq = await segurarAte(c, ".btn[data-btn=esq]", () => t.ev("[teste.j2.virar, teste.jogador.virar]"), (r) => r[0] > 0.3);
  ok(esq[0] > 0.3 && Math.abs(esq[1]) < 0.3, `Kart: ◀ no celular vira só o kart do jogador 2 (j2 ${esq[0].toFixed(2)}, j1 ${esq[1].toFixed(2)})`);
  await ate(t, "Math.abs(teste.j2.virar) < 0.15", 30000, 150); // a tela leva um tempo para endireitar
  const dir = await segurarAte(c, ".btn[data-btn=dir]", () => t.ev("[teste.j2.virar, teste.jogador.virar]"), (r) => r[0] < -0.3);
  ok(dir[0] < -0.3 && Math.abs(dir[1]) < 0.3, `Kart: ▶ no celular vira só o kart do jogador 2 (j2 ${dir[0].toFixed(2)}, j1 ${dir[1].toFixed(2)})`);
  await ate(t, "Math.abs(teste.j2.virar) < 0.3", 30000, 150);
  const solto = await t.ev("teste.j2.virar");
  ok(Math.abs(solto) < 0.3, `Kart: soltou o botão → kart do jogador 2 endireita (${solto.toFixed(2)})`);
  await t.ev("(() => { window.__acoes = 0; const ler = Jogadores.ler2; Jogadores.ler2 = () => { const r = ler(); if (r.acaoNova) window.__acoes++; return r; }; })()");
  await segurar(c, ".btn[data-btn=acao]", 60); // toque rapidinho também conta
  ok(await ate(t, "window.__acoes === 1", 30000, 100), "Kart: ação (buzina) do celular chega uma vez por toque");
  await foto(t, "host-kart-corrida-celular.png");

  // celular cai (tela apagou / rede) → aviso amigável; volta sozinho com o mesmo lugar (voltar + token)
  const antes = await c.ev("controleTeste.sessao");
  // o aviso fecha sozinho quando o celular volta: com a tela lenta ele podia abrir e fechar entre duas olhadas, então um observador anota que apareceu
  await t.ev("(() => { window.__avisou = false; const ver = () => { if (document.querySelector('.jog-aviso:not([hidden])')?.textContent.includes('celular da Alice Souza desconectou')) window.__avisou = true; }; new MutationObserver(ver).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); ver(); })()");
  await c.ev("controleTeste.derrubar()");
  ok(await ate(t, "window.__avisou === true", 30000, 50), "Kart: celular caiu → aviso amigável na tela");
  await foto(t, "host-kart-celular-caiu.png");
  ok(await ate(t, "!document.querySelector('.jog-aviso:not([hidden])') && Jogadores.celular?.conectado === true", 8000), "Kart: celular voltou sozinho e o aviso fechou");
  ok(await ate(c, "controleTeste.conectado", 5000) && JSON.stringify(await c.ev("controleTeste.sessao")) === JSON.stringify(antes), "Kart: reconectou na mesma vaga (mesmo id, sem ler o QR de novo)");
  await espera(400);
  const dir2 = await segurarAte(c, ".btn[data-btn=dir]", () => t.ev("teste.j2.virar"), (r) => r < -0.3);
  ok(dir2 < -0.3, `Kart: depois de voltar, ▶ ainda vira o kart do jogador 2 (${dir2.toFixed(2)})`);

  // controle em paisagem (mesmo celular girado)
  await c.cmd("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await espera(500);
  ok(await c.ev(`(() => { const a = document.querySelector('.btn[data-btn=esq]').getBoundingClientRect(), b = document.querySelector('.btn[data-btn=acao]').getBoundingClientRect(); return a.right < b.left && b.bottom <= innerHeight && a.width >= 90; })()`), "Kart: controle em paisagem: setas à esquerda, buzina à direita, tudo na tela");
  ok(!(await c.transborda()), "Kart: controle em paisagem sem rolagem lateral");
  await foto(c, "controle-kart-paisagem.png");

  ok(!errosDe(t).length, "Kart (tela): sem erros " + errosDe(t).join(" ; "));
  ok(!c.erros.length, "Kart (celular): sem erros " + c.erros.join(" ; "));
  await c.fechar();
  await t.fechar();
}

// sem nenhum dado de conteúdo no log do relay (só contagens)
ok(!/Alice|"in"|"x":/.test(relayLog), "relay não registra conteúdo das mensagens");
encerrar();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo", "· fotos em", PASTA);
process.exit(falhas ? 1 : 0);
