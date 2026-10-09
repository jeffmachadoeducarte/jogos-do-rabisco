// Celular comum a todos os jogos: no primeiro toque pede tela cheia (some a barra do navegador)
// e, nos jogos que precisam de tela deitada, mostra "Gire o celular" enquanto ele estiver em pé.
//
//   prepararCelular({ deitado: true });   // plataforma e corrida
//   prepararCelular();                    // jogos que funcionam em pé (colorir, memória...)

const CSS = `
.gire-celular {
  position: fixed; inset: 0; z-index: 100; display: none;
  flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 24px;
  background: #00b5f0; color: #fff; text-align: center;
  font: 800 28px "Baloo 2", system-ui, sans-serif;
}
.gire-celular .icone { font-size: 90px; animation: gire-celular 1.8s ease-in-out infinite; }
.gire-celular small { font-size: 18px; font-weight: 600; opacity: 0.9; }
@keyframes gire-celular { 0%, 20% { transform: rotate(0); } 60%, 100% { transform: rotate(-90deg); } }
@media (orientation: portrait) and (max-width: 820px) {
  body.so-deitado .gire-celular { display: flex; }
}
`;

export function prepararCelular({ deitado = false } = {}) {
  const toque = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (toque) document.body.classList.add("touch");
  if (!toque) return;

  if (deitado) {
    const estilo = document.createElement("style");
    estilo.textContent = CSS;
    document.head.appendChild(estilo);
    const aviso = document.createElement("div");
    aviso.className = "gire-celular";
    aviso.innerHTML = `<div class="icone">📱</div><div>Gire o celular para jogar!</div><small>O Rabisco precisa da tela deitada.</small>`;
    document.body.append(aviso);
    document.body.classList.add("so-deitado");
  }

  // tela cheia no primeiro toque (o navegador só deixa depois de um gesto); no iPhone não existe: tudo bem
  const cheia = async () => {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
      if (deitado) await screen.orientation?.lock?.("landscape");
    } catch { /* sem permissão: segue normal */ }
  };
  addEventListener("pointerup", cheia, { once: true });
}
