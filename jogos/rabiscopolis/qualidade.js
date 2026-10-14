// Rabiscópolis: perfis de qualidade. Toque (celular/tablet): pixelRatio até 1,3. TV/computador: até 1,25 e no
// máximo ~1080p desenhados. Sombra 1024. Nos 3 primeiros segundos mede o FPS e, se estiver baixo, baixa o
// pixelRatio (até 0,75) e, no pior caso, desliga as sombras.

export function perfil() {
  const toque = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  return { toque, dprMax: toque ? 1.3 : 1.25, sombra: 1024, limite1080: !toque };
}

export function criarQualidade(r3, ajustarTamanho) {
  const p = perfil();
  let escala = 1, medindo = 0, quadros = 0, t0 = 0, feito = false;
  const api = {
    perfil: p,
    get dpr() { return api.calcular(innerWidth, innerHeight); },
    fps: 0,
    calcular(w, h) {
      let dpr = Math.min(devicePixelRatio || 1, p.dprMax) * escala;
      if (p.limite1080) dpr *= Math.min(1, Math.sqrt((1920 * 1080) / (w * h * dpr * dpr)));
      return Math.max(0.6, dpr);
    },
    // chamar a cada quadro com o tempo (s): ajusta uma vez só, depois de 3 s
    medir(agora) {
      if (feito) return;
      if (!t0) { t0 = agora; return; }
      quadros++;
      medindo = agora - t0;
      if (medindo < 3) return;
      feito = true;
      api.fps = quadros / medindo;
      if (api.fps < 24) { escala = 0.7; api.aoSemSombra?.(); }
      else if (api.fps < 40) escala = 0.85;
      if (escala < 1) ajustarTamanho();
    },
  };
  return api;
}
