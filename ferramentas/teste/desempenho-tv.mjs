// Desempenho na TV: mede o tempo de carregamento e os quadros por segundo da tela da TV (/tv) e do Kart em modo TV
// (?tv=1, como quando a TV abre o jogo), simulando aparelho fraco (CPU 4× e 6× mais lenta pelo Chrome) em 1920×1080 e 1280×720.
// Uso: node --experimental-websocket ferramentas/teste/desempenho-tv.mjs [http://localhost:8080] [rótulo]
// Resultado em .claude/tmp/tv/desempenho-<rótulo>.json (e na tela). Só mede: não falha.
// Obs.: o Chrome sem janela desenha o 3D por software (SwiftShader), então os números servem para comparar antes/depois,
// não como o FPS exato de uma TV de verdade.
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
const BASE = process.argv[2] || "http://localhost:8080";
const ROTULO = process.argv[3] || "agora";
const PASTA = fileURLToPath(new URL("../../.claude/tmp/tv/", import.meta.url));
mkdirSync(PASTA, { recursive: true });
// relay de salas local (servidor/sala.mjs), para não falar com o de produção
const portaLivre = () => new Promise((r) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const PORTA = await portaLivre();
const SALA = encodeURIComponent(`ws://localhost:${PORTA}`);
const relay = spawn(process.execPath, ["sala.mjs"], { cwd: fileURLToPath(new URL("../../servidor/", import.meta.url)), env: { ...process.env, PORT: String(PORTA), ORIGENS: "" }, stdio: "ignore" });
process.on("exit", () => { try { relay.kill(); } catch { /* já saiu */ } });
await espera(800);
const ate = async (t, expr, ms = 60000, passo = 200) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };

// conta quadros (requestAnimationFrame) durante ms e devolve o FPS médio e o pior intervalo
const medirFps = (t, ms) => t.ev(`new Promise((ok) => { let n = 0, pior = 0, ult = performance.now(); const ini = ult;
  const f = (agora) => { n++; pior = Math.max(pior, agora - ult); ult = agora; if (agora - ini < ${ms}) requestAnimationFrame(f); else ok({ fps: +(n * 1000 / (agora - ini)).toFixed(1), piorMs: Math.round(pior) }); };
  requestAnimationFrame(f); })`);
// quanto do tempo a linha principal ficou ocupada (TaskDuration do Chrome) num intervalo
async function ocupado(t, ms) {
  const m0 = Object.fromEntries((await t.cmd("Performance.getMetrics")).result.metrics.map((m) => [m.name, m.value]));
  await espera(ms);
  const m1 = Object.fromEntries((await t.cmd("Performance.getMetrics")).result.metrics.map((m) => [m.name, m.value]));
  return Math.round(((m1.TaskDuration - m0.TaskDuration) / ((m1.Timestamp - m0.Timestamp) || 1)) * 100);
}

const TV_GUARDADA = `sessionStorage.setItem("rabisco.tv", JSON.stringify({ codigo: null, token: null, vagas: [{ tipo: "controle", pad: 0 }, { tipo: null }], jogadores: 1 }));`;
async function abrirMedindo(url, { largura, altura, cpu, antes = "" }) {
  const t = await abrir("about:blank", { largura, altura });
  await t.cmd("Performance.enable");
  await t.cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  await t.cmd("Emulation.setCPUThrottlingRate", { rate: cpu });
  if (antes) await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: antes });
  const t0 = Date.now();
  await t.cmd("Page.navigate", { url });
  return { t, t0 };
}

const resultado = { rotulo: ROTULO, quando: new Date().toISOString(), medidas: [] };
for (const [largura, altura] of [[1920, 1080], [1280, 720]]) {
  for (const cpu of [4, 6]) {
    // ---- menu da TV
    {
      const { t, t0 } = await abrirMedindo(`${BASE}/tv/?teste&sala=${SALA}`, { largura, altura, cpu });
      await ate(t, "!!window.tvTeste && document.fonts.status === 'loaded' && document.readyState === 'complete'");
      const carregou = Date.now() - t0;
      await espera(1500);
      const fps = await medirFps(t, 5000);
      const cpuPct = await ocupado(t, 3000);
      resultado.medidas.push({ tela: "menu /tv", res: `${largura}x${altura}`, cpu: `${cpu}x`, carregarMs: carregou, ...fps, linhaPrincipal: `${cpuPct}%` });
      await t.fechar();
    }
    // ---- Kart em modo TV: abertura (menu do jogo) e corrida
    {
      const { t, t0 } = await abrirMedindo(`${BASE}/jogos/rabisco-kart/?tv=1&teste&sala=${SALA}`, { largura, altura, cpu, antes: TV_GUARDADA });
      await ate(t, "!!window.teste && window.Jogadores?.tv === true", 120000);
      const carregou = Date.now() - t0;
      await espera(2000);
      const abertura = await medirFps(t, 5000);
      const cpuAb = await ocupado(t, 3000);
      resultado.medidas.push({ tela: "Kart TV · abertura", res: `${largura}x${altura}`, cpu: `${cpu}x`, carregarMs: carregou, ...abertura, linhaPrincipal: `${cpuAb}%` });
      await t.ev("document.getElementById('jogar').click()");
      await ate(t, "teste.estado === 'corrida'", 30000);
      await espera(1500);
      const corrida = await medirFps(t, 6000);
      const cpuCo = await ocupado(t, 3000);
      const px = await t.ev("[teste.renderer.getPixelRatio(), teste.renderer.shadowMap.enabled, teste.renderer.info.render.calls]").catch(() => null);
      resultado.medidas.push({ tela: "Kart TV · corrida", res: `${largura}x${altura}`, cpu: `${cpu}x`, ...corrida, linhaPrincipal: `${cpuCo}%`, pixelRatio: px?.[0], sombras: px?.[1], drawCalls: px?.[2] });
      await t.fechar();
    }
  }
}
console.table(resultado.medidas);
writeFileSync(`${PASTA}desempenho-${ROTULO}.json`, JSON.stringify(resultado, null, 2));
console.log("salvo em", `${PASTA}desempenho-${ROTULO}.json`);
process.exit(0);
