// Controles de toque para jogos 3D de andar livre (Cidade do Rabisco, Cores da Criação):
// - joystick dinâmico: aparece onde o dedo toca na metade esquerda da tela e some ao soltar;
// - arrastar na metade direita gira a câmera;
// - botão de pulo no canto direito.
// Tudo com Pointer Events, vários dedos ao mesmo tempo, e saída em -1..1.
//
//   const toque = criarJoystick(elemento);
//   toque.x, toque.y      // joystick: x para a direita, y para cima (frente)
//   toque.girar()         // quanto girou a câmera desde a última leitura (em px)
//   toque.pulo / toque.puloNovo

export function criarJoystick(onde, { pulo = true } = {}) {
  const estilo = document.createElement("style");
  estilo.textContent = `
  .jd-camada { position: absolute; inset: 0; z-index: 6; touch-action: none; display: none; }
  body.touch .jd-camada { display: block; }
  .jd-base { position: absolute; width: 132px; height: 132px; margin: -66px 0 0 -66px; border-radius: 50%; pointer-events: none;
    background: rgba(255,255,255,0.28); border: 5px solid rgba(21,21,21,0.45); opacity: 0; transition: opacity 0.15s; }
  .jd-base.ativo { opacity: 1; }
  .jd-pino { position: absolute; left: 50%; top: 50%; width: 62px; height: 62px; margin: -31px 0 0 -31px; border-radius: 50%;
    background: rgba(255,255,255,0.92); border: 4px solid #151515; }
  .jd-dica { position: absolute; left: 22px; bottom: 22px; width: 110px; height: 110px; border-radius: 50%; pointer-events: none;
    border: 4px dashed rgba(255,255,255,0.7); display: grid; place-items: center; font: 800 14px "Baloo 2", sans-serif; color: #fff;
    text-shadow: 0 1px 2px #000; text-align: center; transition: opacity 0.3s; }
  .jd-pulo { position: absolute; right: 26px; bottom: 26px; width: 112px; height: 112px; border-radius: 50%; font-size: 48px; touch-action: none;
    background: rgba(255,255,255,0.55); border: 6px solid rgba(21,21,21,0.55); }
  .jd-pulo.apertado { background: rgba(255,255,255,0.92); transform: scale(0.94); }
  @media (max-height: 520px) { .jd-base { width: 110px; height: 110px; margin: -55px 0 0 -55px; } .jd-pino { width: 50px; height: 50px; margin: -25px 0 0 -25px; }
    .jd-pulo { width: 88px; height: 88px; font-size: 38px; right: 18px; bottom: 18px; } .jd-dica { width: 88px; height: 88px; left: 14px; bottom: 14px; font-size: 12px; } }`;
  document.head.append(estilo);

  const camada = document.createElement("div");
  camada.className = "jd-camada";
  camada.innerHTML = `<div class="jd-dica">arraste<br>para andar</div><div class="jd-base"><div class="jd-pino"></div></div>${pulo ? '<button class="jd-pulo" aria-label="Pular">⤒</button>' : ""}`;
  onde.append(camada);
  const base = camada.querySelector(".jd-base"), pino = camada.querySelector(".jd-pino"), dica = camada.querySelector(".jd-dica");
  const botao = camada.querySelector(".jd-pulo");
  const api = { x: 0, y: 0, pulo: false, puloNovo: false, giro: 0, girar() { const g = this.giro; this.giro = 0; return g; } };
  let dedoAndar = null, dedoGirar = null, ox = 0, oy = 0, gx = 0;
  const RAIO = 56;

  camada.addEventListener("pointerdown", (e) => {
    if (e.target === botao) return;
    const r = camada.getBoundingClientRect();
    if (e.clientX - r.left < r.width / 2 && dedoAndar === null) {
      dedoAndar = e.pointerId; ox = e.clientX; oy = e.clientY;
      base.style.left = `${ox - r.left}px`; base.style.top = `${oy - r.top}px`;
      base.classList.add("ativo"); dica.style.opacity = "0";
    } else if (dedoGirar === null) {
      dedoGirar = e.pointerId; gx = e.clientX;
    }
    camada.setPointerCapture(e.pointerId);
  });
  camada.addEventListener("pointermove", (e) => {
    if (e.pointerId === dedoAndar) {
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const d = Math.hypot(dx, dy);
      if (d > RAIO) { dx *= RAIO / d; dy *= RAIO / d; }
      api.x = dx / RAIO; api.y = -dy / RAIO;
      pino.style.transform = `translate(${dx}px, ${dy}px)`;
    } else if (e.pointerId === dedoGirar) {
      api.giro += e.clientX - gx; gx = e.clientX;
    }
  });
  const soltar = (e) => {
    if (e.pointerId === dedoAndar) { dedoAndar = null; api.x = api.y = 0; pino.style.transform = ""; base.classList.remove("ativo"); }
    if (e.pointerId === dedoGirar) dedoGirar = null;
  };
  camada.addEventListener("pointerup", soltar);
  camada.addEventListener("pointercancel", soltar);
  if (botao) {
    botao.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); if (!api.pulo) api.puloNovo = true; api.pulo = true; botao.classList.add("apertado"); navigator.vibrate?.(12); });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) botao.addEventListener(ev, () => { api.pulo = false; botao.classList.remove("apertado"); });
  }
  api.zerar = () => { api.x = api.y = 0; api.pulo = api.puloNovo = false; api.giro = 0; dedoAndar = dedoGirar = null; base.classList.remove("ativo"); pino.style.transform = ""; };
  return api;
}
