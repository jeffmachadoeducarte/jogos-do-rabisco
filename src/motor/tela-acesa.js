// Tela não apaga durante a partida (Screen Wake Lock API). Só liga dentro de um jogo (/jogos/...), porque no portal
// ninguém fica parado. Pede de novo quando a aba volta a ficar visível (o navegador solta a trava ao esconder a aba).
// Se o navegador não suporta ou nega, falha em silêncio.
let trava = null;
const noJogo = () => /\/jogos\/[^/]+\//.test(location.pathname);

async function pedir() {
  try {
    if (!noJogo() || document.visibilityState !== "visible" || !navigator.wakeLock?.request || trava) return;
    const t = await navigator.wakeLock.request("screen");
    trava = t;
    t.addEventListener("release", () => { if (trava === t) trava = null; });
  } catch { /* sem suporte, sem permissão ou bateria fraca: segue sem */ }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pedir(); });
  // alguns navegadores só aceitam depois de um toque/tecla: tenta já e de novo na primeira interação
  pedir();
  for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => pedir(), { passive: true });
}
export const telaAcesa = { pedir, get ativa() { return Boolean(trava); } };
window.TelaAcesa = telaAcesa;
