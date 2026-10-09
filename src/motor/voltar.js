// Botão "← Voltar" das telas de abertura: leva de volta ao portal, já na faixa de idade do jogo.
// É um link de verdade (funciona com toque, mouse, teclado e o direcional do controle).
//
//   tela.append(botaoVoltar({ raiz: "../..", faixa: "pequenos" }));

const CSS = `
.botao-voltar {
  position: absolute; z-index: 25; top: calc(env(safe-area-inset-top, 0px) + 12px); left: calc(env(safe-area-inset-left, 0px) + 12px);
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 18px 8px; text-decoration: none; width: auto !important; margin: 0 !important;
  font: 800 20px "Baloo 2", system-ui, sans-serif; color: #151515; background: #fff;
  border: 4px solid #151515; border-radius: 999px; box-shadow: 0 5px 0 #151515;
}
.botao-voltar:active { transform: translateY(3px); box-shadow: 0 2px 0 #151515; }
@media (max-height: 520px) and (orientation: landscape) { .botao-voltar { font-size: 16px; padding: 3px 12px 5px; border-width: 3px; top: 8px; left: 8px; } }
`;
let estiloPosto = false;

export function linkPortal(raiz, faixa) {
  return `${raiz}/index.html${faixa ? `#/faixa/${faixa}` : ""}`;
}

export function botaoVoltar({ raiz = "../..", faixa = "" } = {}) {
  if (!estiloPosto) {
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.append(s);
    estiloPosto = true;
  }
  const a = document.createElement("a");
  a.className = "botao-voltar";
  a.href = linkPortal(raiz, faixa);
  a.setAttribute("aria-label", "Voltar para os jogos");
  a.textContent = "← Voltar";
  return a;
}
