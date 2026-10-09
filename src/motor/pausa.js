// Pause comum a todos os jogos: botão ⏸ na tela, teclas P / Esc e a tela "Pausado"
// com Continuar, Recomeçar e Sair. O jogo informa quando pode pausar e o que fazer em cada botão;
// no laço principal, enquanto `pausa.ativa`, ele só desenha a cena (nada se mexe).
//
//   const pausa = criarPausa({ podePausar: () => estado === "jogando", aoPausar, aoContinuar, aoRecomecar, aoSair });
//   if (pausa.ativa) { renderer.render(cena, camera); return requestAnimationFrame(quadro); }

const CSS = `
.pausa-botao {
  position: fixed; z-index: 30; top: calc(env(safe-area-inset-top, 0px) + 16px); left: 50%; transform: translateX(-50%);
  width: 58px; height: 58px; border-radius: 50%; font-size: 26px; line-height: 1; cursor: pointer;
  background: rgba(255, 255, 255, 0.85); border: 4px solid #151515; box-shadow: 0 5px 0 #151515;
}
.pausa-botao[hidden] { display: none; }
.pausa-tela {
  position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; padding: 16px;
  background: rgba(10, 42, 74, 0.55);
}
.pausa-tela[hidden] { display: none; }
.pausa-cartao {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  background: #fff; border: 5px solid #151515; border-radius: 34px; box-shadow: 8px 10px 0 #151515;
  padding: 22px 34px 26px; font-family: "Baloo 2", system-ui, sans-serif; text-align: center;
}
.pausa-cartao h2 {
  margin: 0; font-family: "Neulis Cursive", "Baloo 2", system-ui, sans-serif; font-weight: 900;
  font-size: clamp(44px, 7vw, 72px); line-height: 1; color: #00b5f0; text-shadow: 4px 5px 0 #ec2e8c;
}
.pausa-cartao p { margin: 0; font-weight: 700; color: #151515; }
.pausa-cartao button {
  font: 800 clamp(22px, 3vw, 30px) "Baloo 2", system-ui, sans-serif; min-width: 240px;
  border: none; border-radius: 999px; padding: 6px 28px 10px; cursor: pointer;
  color: #fff; box-shadow: 0 7px 0 #151515;
}
.pausa-cartao button:active { transform: translateY(4px); box-shadow: 0 3px 0 #151515; }
.pausa-cartao .continuar { background: #ec2e8c; }
.pausa-cartao .recomecar { background: #00b5f0; }
.pausa-cartao .sair { background: #fff; color: #151515; border: 3px solid #151515; }
`;

export function criarPausa({ podePausar, aoPausar = () => {}, aoContinuar = () => {}, aoRecomecar = null, aoSair = null, lugar = null }) {
  const estilo = document.createElement("style");
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  const botao = document.createElement("button");
  botao.className = "pausa-botao";
  botao.setAttribute("aria-label", "Pausar o jogo");
  botao.textContent = "⏸";
  botao.hidden = true;
  if (lugar) Object.assign(botao.style, { transform: "none", left: "auto", ...lugar }); // ex.: { top: "150px", left: "16px" }

  const tela = document.createElement("div");
  tela.className = "pausa-tela";
  tela.hidden = true;
  tela.innerHTML = `<div class="pausa-cartao" role="dialog" aria-label="Jogo pausado">
      <h2>Pausado</h2>
      <p>O Rabisco está esperando você!</p>
      <button class="continuar">Continuar ▶</button>
      ${aoRecomecar ? '<button class="recomecar">Recomeçar ↻</button>' : ""}
      ${aoSair ? '<button class="sair">Sair</button>' : ""}
    </div>`;
  document.body.append(botao, tela);

  const api = {
    ativa: false,
    podePausar,
    pausar() {
      if (api.ativa || !podePausar()) return;
      api.ativa = true;
      tela.hidden = false;
      botao.hidden = true;
      aoPausar();
      tela.querySelector(".continuar").focus();
    },
    continuar() {
      if (!api.ativa) return;
      api.ativa = false;
      tela.hidden = true;
      aoContinuar();
    },
    // chamado a cada quadro: o botão só aparece quando dá para pausar
    atualizar() { botao.hidden = api.ativa || !podePausar(); },
  };

  botao.addEventListener("click", () => api.pausar());
  tela.querySelector(".continuar").addEventListener("click", () => api.continuar());
  tela.querySelector(".recomecar")?.addEventListener("click", () => { api.ativa = false; tela.hidden = true; aoRecomecar(); });
  tela.querySelector(".sair")?.addEventListener("click", () => { api.ativa = false; tela.hidden = true; aoSair(); });
  addEventListener("keydown", (e) => {
    if (e.key === "p" || e.key === "P" || e.key === "Escape") { e.preventDefault(); api.ativa ? api.continuar() : api.pausar(); }
  });
  // trocou de aba ou bloqueou o tablet no meio do jogo: pausa sozinho
  document.addEventListener("visibilitychange", () => { if (document.hidden) api.pausar(); });
  return api;
}
