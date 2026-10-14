// Rabiscolândia: controles de toque (só aparecem com body.touch, celular/tablet deitado).
//  - a pé: joystick dinâmico à esquerda (src/motor/joystick.js, que também gira a câmera arrastando à direita e
//    tem o botão de pulo) + botões Ação e 📱 (Rabifone) à direita;
//  - no carro: ◀ ▶ à esquerda; ▲ (frente), ▼ (ré) e Sair à direita.
// Leitura: t.x, t.y (andar), t.girar(), t.puloNovo/t.pulo, t.carro = { esq, dir, frente, re }, t.acaoNova, t.foneNovo, t.sairNovo.

import { criarJoystick } from "../../src/motor/joystick.js";

export function criarToque(caixa) {
  const js = criarJoystick(caixa, { pulo: true });
  const camada = document.createElement("div");
  camada.className = "rp-toque";
  camada.innerHTML = `
    <div class="rp-pe"><button class="rp-acao" data-b="acao" aria-label="Ação">✋</button><button class="rp-fone" data-b="fone" aria-label="Rabifone">📱</button></div>
    <div class="rp-carro">
      <div class="rp-volante"><button data-b="esq" aria-label="Virar à esquerda">◀</button><button data-b="dir" aria-label="Virar à direita">▶</button></div>
      <div class="rp-pedais"><button class="rp-sair" data-b="sair" aria-label="Sair do carro">Sair</button><button data-b="frente" aria-label="Acelerar">▲</button><button data-b="re" aria-label="Ré">▼</button><button class="rp-fone" data-b="fone" aria-label="Rabifone">📱</button></div>
    </div>`;
  caixa.append(camada);
  const api = {
    get x() { return js.x; }, get y() { return js.y; },
    get pulo() { return js.pulo; },
    get puloNovo() { return js.puloNovo; }, set puloNovo(v) { js.puloNovo = v; },
    girar: () => js.girar(),
    carro: { esq: false, dir: false, frente: false, re: false },
    acaoNova: false, foneNovo: false, sairNovo: false,
    elAcao: camada.querySelector(".rp-acao"),
    // modo "pe" | "carro": troca o que aparece
    modo(m) { caixa.classList.toggle("rp-no-carro", m === "carro"); if (m !== "carro") Object.keys(api.carro).forEach((k) => (api.carro[k] = false)); },
    zerar() { js.zerar(); Object.keys(api.carro).forEach((k) => (api.carro[k] = false)); api.acaoNova = api.foneNovo = api.sairNovo = false; },
  };
  for (const b of camada.querySelectorAll("button[data-b]")) {
    const nome = b.dataset.b;
    const solta = () => { b.classList.remove("apertado"); if (nome in api.carro) api.carro[nome] = false; };
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation();
      b.classList.add("apertado");
      try { b.setPointerCapture(e.pointerId); } catch { /* dedo simulado */ }
      navigator.vibrate?.(10);
      if (nome in api.carro) api.carro[nome] = true;
      else if (nome === "acao") api.acaoNova = true;
      else if (nome === "fone") api.foneNovo = true;
      else if (nome === "sair") api.sairNovo = true;
    });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, solta);
    b.addEventListener("click", (e) => e.preventDefault());
  }
  return api;
}
