// Rabiscolândia: controles de toque (só aparecem com body.touch, celular/tablet deitado).
// Desenho pensado para criança de 4 a 12 anos (pesquisa: Roblox, Mario Kart Tour, GTA mobile, AirConsole):
//  - a pé: alavanca flutuante na metade esquerda (src/motor/joystick.js: aparece onde o dedo toca e segue o dedo),
//    arrastar à direita gira a câmera; PULAR, AÇÃO e 📱 no arco do polegar direito;
//  - no carro (e ônibus, moto, bici, barco...): faixa ◀ ▶ grande à esquerda (dá para deslizar de um lado para o outro
//    sem levantar o dedo), pedal ACELERAR grande e RÉ à direita, "Acelerar sozinho" opcional; SAIR fica lá em cima,
//    longe dos pedais (e o jogo freia sozinho antes de sair);
//  - no helicóptero: ◀ ▶ à esquerda; SUBIR, DESCER e VOAR (para a frente) à direita; SAIR em cima.
// Tudo respeita as áreas seguras (notch) e some quando um controle físico é usado (volta ao tocar a tela).
// Leitura: t.x, t.y (andar), t.girar(), t.puloNovo/t.pulo, t.carro = { esq, dir, frente, re, subir, descer, voar, especial },
// t.auto (acelerar sozinho), t.acaoNova, t.foneNovo, t.sairNovo.

import { criarJoystick } from "../../src/motor/joystick.js";

const CHAVE_AUTO = "rabisco.rp.acelerarSozinho";
const lerAuto = () => { try { return localStorage.getItem(CHAVE_AUTO) === "1"; } catch { return false; } };
const guardarAuto = (v) => { try { localStorage.setItem(CHAVE_AUTO, v ? "1" : "0"); } catch { /* sem armazenamento */ } };
const vibrar = (ms) => { try { navigator.vibrate?.(ms); } catch { /* iPhone não vibra */ } };
const rot = (ic, txt) => `<span class="ic">${ic}</span><small>${txt}</small>`;

export function criarToque(caixa) {
  const js = criarJoystick(caixa, { pulo: true });
  caixa.classList.add("rp-com-toque");
  const pulo = caixa.querySelector(".jd-pulo");
  if (pulo) pulo.innerHTML = rot("⬆", "Pular");
  const volante = (onde) => `<div class="rp-volante" data-volante aria-label="Virar ${onde}"><span class="rp-seta" data-lado="esq">◀</span><span class="rp-seta" data-lado="dir">▶</span></div>`;
  const camada = document.createElement("div");
  camada.className = "rp-toque";
  camada.innerHTML = `
    <div class="rp-pe"><button class="rp-acao" data-b="acao" aria-label="Ação">✋</button><button class="rp-fone" data-b="fone" aria-label="Rabisfone">📱</button></div>
    <div class="rp-carro">
      ${volante("o carro")}
      <button class="rp-sair" data-b="sair" aria-label="Sair do veículo">🚪 Sair</button>
      <button class="rp-pedal rp-acel" data-b="frente" aria-label="Acelerar">${rot("⬆", "Acelerar")}</button>
      <button class="rp-pedal rp-re" data-b="re" aria-label="Freio e ré">${rot("⬇", "Ré")}</button>
      <button class="rp-auto" data-b="auto" aria-label="Acelerar sozinho" aria-pressed="false">${rot("🔁", "Sozinho")}</button>
      <button class="rp-fone" data-b="fone" aria-label="Rabisfone">📱</button>
      <button class="rp-especial" data-b="especial" aria-label="Buzina" hidden>📯</button>
    </div>
    <div class="rp-heli">
      ${volante("o helicóptero")}
      <button class="rp-sair" data-b="sair" aria-label="Sair do helicóptero">🚪 Sair</button>
      <button class="rp-pedal rp-subir" data-b="subir" aria-label="Subir">${rot("⬆", "Subir")}</button>
      <button class="rp-pedal rp-descer" data-b="descer" aria-label="Descer">${rot("⬇", "Descer")}</button>
      <button class="rp-pedal rp-voar" data-b="voar" aria-label="Voar para a frente">${rot("➤", "Voar")}</button>
      <button class="rp-fone" data-b="fone" aria-label="Rabisfone">📱</button>
    </div>`;
  caixa.append(camada);
  const btnAuto = camada.querySelector(".rp-auto");
  const api = {
    get x() { return js.x; }, get y() { return js.y; },
    get pulo() { return js.pulo; },
    get puloNovo() { return js.puloNovo; }, set puloNovo(v) { js.puloNovo = v; },
    girar: () => js.girar(),
    carro: { esq: false, dir: false, frente: false, re: false, subir: false, descer: false, voar: false, especial: false },
    auto: lerAuto(),
    especialNovo: false,
    // botão especial do veículo (📯 buzina, 🚨 sirene, 🎵 música, 💧 água) ou null para esconder
    especial(rotulo) { const b = camada.querySelector(".rp-especial"); b.hidden = !rotulo; if (rotulo) b.textContent = rotulo; },
    acaoNova: false, foneNovo: false, sairNovo: false,
    elAcao: camada.querySelector(".rp-acao"),
    // modo "pe" | "carro" | "heli": troca o que aparece
    modo(m) { caixa.classList.toggle("rp-no-carro", m === "carro"); caixa.classList.toggle("rp-no-heli", m === "heli"); soltarTudo(); },
    zerar() { js.zerar(); soltarTudo(); api.acaoNova = api.foneNovo = api.sairNovo = false; },
  };
  const mostrarAuto = () => { btnAuto.classList.toggle("ligado", api.auto); btnAuto.setAttribute("aria-pressed", String(api.auto)); };
  mostrarAuto();

  // ---- faixa ◀ ▶: um dedo (ou dois) em qualquer ponto dela; a metade em que o dedo está vale, e deslizar troca o lado
  const dedosVolante = new Map(); // pointerId → { el, lado }
  function aplicarVolante() {
    const lados = new Set([...dedosVolante.values()].map((d) => d.lado));
    const esq = lados.has("esq") && !lados.has("dir"), dir = lados.has("dir") && !lados.has("esq");
    api.carro.esq = esq; api.carro.dir = dir;
    for (const s of camada.querySelectorAll(".rp-seta")) s.classList.toggle("apertado", s.dataset.lado === "esq" ? esq : dir);
  }
  const ladoDe = (el, x) => { const r = el.getBoundingClientRect(); return x < r.left + r.width / 2 ? "esq" : "dir"; };
  for (const v of camada.querySelectorAll("[data-volante]")) {
    v.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation();
      try { v.setPointerCapture(e.pointerId); } catch { /* dedo simulado */ }
      dedosVolante.set(e.pointerId, { el: v, lado: ladoDe(v, e.clientX) });
      vibrar(12); aplicarVolante();
    });
    v.addEventListener("pointermove", (e) => {
      const d = dedosVolante.get(e.pointerId);
      if (!d) return;
      const lado = ladoDe(v, e.clientX);
      if (lado !== d.lado) { d.lado = lado; vibrar(8); aplicarVolante(); }
    });
    const solta = (e) => { if (dedosVolante.delete(e.pointerId)) aplicarVolante(); };
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) v.addEventListener(ev, solta);
  }

  function soltarTudo() {
    Object.keys(api.carro).forEach((k) => (api.carro[k] = false));
    dedosVolante.clear(); aplicarVolante();
    for (const b of camada.querySelectorAll("button.apertado")) b.classList.remove("apertado");
  }

  // ---- botões e pedais: segurar = apertado (o dedo pode escorregar para fora: o botão continua apertado até soltar)
  for (const b of camada.querySelectorAll("button[data-b]")) {
    const nome = b.dataset.b;
    const solta = () => { b.classList.remove("apertado"); if (nome in api.carro) api.carro[nome] = false; };
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation();
      b.classList.add("apertado");
      try { b.setPointerCapture(e.pointerId); } catch { /* dedo simulado */ }
      vibrar(nome === "sair" ? 25 : 10);
      if (nome === "especial") api.especialNovo = true;
      if (nome === "auto") { api.auto = !api.auto; guardarAuto(api.auto); mostrarAuto(); }
      else if (nome in api.carro) { api.carro[nome] = true; if (nome === "re" && api.auto) { api.auto = false; guardarAuto(false); mostrarAuto(); } } // ré/freio desliga o "sozinho"
      else if (nome === "acao") api.acaoNova = true;
      else if (nome === "fone") api.foneNovo = true;
      else if (nome === "sair") api.sairNovo = true;
    });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, solta);
    b.addEventListener("click", (e) => e.preventDefault());
  }
  // toque longo não abre menu, nem seleciona texto, nem amplia (iPhone e Android)
  for (const el of [camada, caixa.querySelector(".jd-camada")].filter(Boolean)) {
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("touchstart", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  }

  // ---- controle físico (Gamepad/TV) em uso: some com os botões da tela; tocar a tela traz de volta
  addEventListener("pointerdown", (e) => { if (e.pointerType === "touch" && document.body.classList.contains("toque-oculto")) document.body.classList.remove("toque-oculto"); }, { capture: true });
  api.controleEmUso = () => { if (!document.body.classList.contains("toque-oculto")) { document.body.classList.add("toque-oculto"); api.zerar(); } };
  return api;
}
