// Ajudante de teste: abre o Chrome sem janela, simula controle (gamepad), toque e celular, e tira fotos.
// Uso (Node 20+): node --experimental-websocket ferramentas/teste/<script>.mjs
//   const t = await abrir(url, { mobile: true, largura: 844, altura: 390 });
//   await t.ev("expressão"); await t.botao(0); await t.toque(".seletor"); await t.foto("x.png"); await t.fechar();
// CHROME_ARGS="--host-resolver-rules=MAP host ip" para testar um domínio novo antes do DNS local atualizar.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let porta = 9400 + Math.floor(Math.random() * 400);

export async function abrir(url, { mobile = false, largura = 1280, altura = 800, agente = null } = {}) {
  const perfil = mkdtempSync(join(tmpdir(), "rabisco-teste-"));
  const p = porta++;
  const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${p}`, `--user-data-dir=${perfil}`, "--use-gl=swiftshader", "--enable-unsafe-swiftshader",
    // sem o Chaveiro do Mac: com ele trancado, o Chrome travava esperando a senha
    "--use-mock-keychain", "--password-store=basic",
    "--autoplay-policy=no-user-gesture-required", ...(process.env.CHROME_ARGS ? [process.env.CHROME_ARGS] : []), "about:blank"], { stdio: "ignore" });
  let alvo;
  for (let i = 0; i < 60 && !alvo; i++) { await espera(250); try { alvo = (await (await fetch(`http://127.0.0.1:${p}/json`)).json()).find((t) => t.type === "page"); } catch { /* subindo */ } }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0; const pend = {}; const erros = [];
  ws.addEventListener("message", (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    if (d.method === "Runtime.exceptionThrown") erros.push("EXC " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300));
    if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") erros.push("ERR " + d.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300));
    if (d.method === "Network.loadingFailed" && !d.params.canceled) erros.push("NET " + d.params.errorText);
    if (d.method === "Network.responseReceived" && d.params.response.status >= 400 && !d.params.response.url.endsWith("favicon.ico")) erros.push(`HTTP ${d.params.response.status} ${d.params.response.url}`);
  });
  const cmd = (method, params = {}) => new Promise((r) => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
  const ev = async (expr) => {
    const r = await cmd("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error("ev: " + expr.slice(0, 120) + " → " + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
    return r.result?.result?.value;
  };
  await cmd("Runtime.enable"); await cmd("Page.enable"); await cmd("Network.enable");
  await cmd("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: mobile ? 2 : 1, mobile });
  if (mobile) await cmd("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  if (agente) await cmd("Emulation.setUserAgentOverride", { userAgent: agente });
  await cmd("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__pad = { buttons: Array.from({length: 17}, () => ({ pressed: false, value: 0 })), axes: [0,0,0,0], mapping: "standard", connected: true, id: "teste" };
    navigator.getGamepads = () => [window.__pad];
    window.__aperta = (i, v) => { window.__pad.buttons[i].pressed = v; };
    window.__conecta = () => dispatchEvent(Object.assign(new Event("gamepadconnected"), { gamepad: window.__pad }));
  ` });
  await cmd("Page.navigate", { url });
  const centro = (sel) => ev(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
  const tocar = async (x, y, ms = 80) => {
    await cmd("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await espera(ms);
    await cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await espera(200);
  };
  return {
    erros, cmd, ev, espera,
    async botao(i, ms = 300) { await ev(`__aperta(${i}, true)`); await espera(ms); await ev(`__aperta(${i}, false)`); await espera(300); },
    conecta: () => ev("__conecta()"),
    foco: () => ev(`(document.activeElement?.textContent || "").trim().slice(0, 40)`),
    async toque(sel, ms) { const [x, y] = await centro(sel); await tocar(x, y, ms); },
    tocaXY: tocar,
    async arrasta(x0, y0, x1, y1, passos = 12, segurar = 0) {
      await cmd("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
      for (let k = 1; k <= passos; k++) { await cmd("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * k) / passos, y: y0 + ((y1 - y0) * k) / passos }] }); await espera(16); }
      if (segurar) await espera(segurar);
      await cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await espera(150);
    },
    async foto(arquivo) { const r = await cmd("Page.captureScreenshot", { format: "png" }); writeFileSync(arquivo, Buffer.from(r.result.data, "base64")); },
    transborda: () => ev("document.documentElement.scrollWidth > innerWidth + 1"),
    async fechar() { try { ws.close(); } catch { /* já fechou */ } chrome.kill("SIGKILL"); await espera(300); rmSync(perfil, { recursive: true, force: true }); },
  };
}
