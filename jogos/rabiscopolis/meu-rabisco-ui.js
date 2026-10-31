// Rabiscolândia: a tela "Meu Rabisco". O Rabisco em 3D gira de um lado; do outro ficam as abas (mochila, fone, sapatos,
// calça e óculos de sol) com as opções de cada uma e, se a família não cadastrou o nome da criança, o campo opcional
// "Como você se chama?" (até 12 letras, vira a plaquinha em cima do Rabisco). Toda escolha vale na hora (no Rabisco da tela
// e no da cidade) e fica guardada. Funciona no toque, no mouse, no teclado (setas, Enter, Esc) e no controle (direcional,
// A confirma, B volta), como o Rabifone: os itens têm data-foco.
//
//   const mr = criarMeuRabisco(caixa, { escolha(), nomeCadastro(), nomeSalvo(), aoEscolher(slot, id), aoNome(texto), aoAbrir(), aoFechar() });
//   mr.abrir(); mr.navegar(dx, dy); mr.confirmar(); mr.voltar(); mr.fechar();

import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
import { criarPalco3D, THREE } from "../../src/motor3d/palco3d.js";
import { toon, comContorno } from "../../src/motor3d/toon.js";
import { PECAS, ORDEM, vestirPecas, prepararRoupa } from "./meu-rabisco.js";

const hex = (c) => `#${c.toString(16).padStart(6, "0")}`;
const ALTURA = 2.2; // do Rabisco da tela (pés em y = 0)
// enquadramento de cada aba: [posição da câmera, alvo] (mochila: de costas; fone e óculos: o rosto de perto; sapatos e calça: as pernas)
const VISTAS = {
  inteiro: [[0, 1.2, 4.9], [0, 1.08, 0]],
  mochila: [[0, 1.05, 4.4], [0, 1.0, 0]],
  fone: [[0, 1.55, 3.3], [0, 1.5, 0]],
  sapatos: [[0, 0.55, 3.8], [0, 0.4, 0]],
  calca: [[0, 0.8, 4.2], [0, 0.75, 0]],
  oculos: [[0, 1.55, 3.0], [0, 1.5, 0]],
};

export function criarMeuRabisco(onde, cb) {
  const raiz = document.createElement("div");
  raiz.className = "meu-rb";
  raiz.hidden = true;
  raiz.innerHTML = `<div class="mrb-cartao" role="dialog" aria-label="Meu Rabisco">
    <div class="mrb-vista"></div>
    <div class="mrb-painel">
      <div class="mrb-titulo">✏️ Meu Rabisco</div>
      <div class="mrb-abas" role="tablist"></div>
      <div class="mrb-opcoes"></div>
      <small class="mrb-dica"></small>
      <div class="mrb-nome"></div>
      <div class="mrb-acoes"><button class="mrb-ok deco-ok" data-foco>✓ Pronto</button></div>
    </div></div>`;
  onde.append(raiz);
  raiz.addEventListener("pointerdown", (e) => e.stopPropagation());
  const vista = raiz.querySelector(".mrb-vista"), abasEl = raiz.querySelector(".mrb-abas"), opcoesEl = raiz.querySelector(".mrb-opcoes");
  let aba = ORDEM[0], palco = null, rb = null, foco = null, giro = 0, parado = 0, alvoVista = "inteiro", camAtual = null, arrastando = null;
  let escolha = {};

  const botao = (html, cls, aoClicar) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.setAttribute("data-foco", ""); b.innerHTML = html; b.addEventListener("click", (e) => { e.stopPropagation(); aoClicar(); }); return b; };
  function desenharAbas() {
    abasEl.replaceChildren(...ORDEM.map((s) => {
      const b = botao(`<span class="mrb-ic">${PECAS[s].icone}</span><span class="mrb-rot">${PECAS[s].nome}</span>`, `mrb-aba${s === aba ? " ativa" : ""}`, () => { aba = s; desenharAbas(); desenharOpcoes(); vistaDaAba(); focar(abasEl.querySelector(".ativa")); });
      b.dataset.aba = s; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(s === aba));
      return b;
    }));
  }
  function desenharOpcoes() {
    const p = PECAS[aba];
    opcoesEl.replaceChildren(...p.opcoes.map((o) => {
      const sel = escolha[aba] === o.id;
      const b = botao(`<span class="mrb-amostra" style="background:linear-gradient(135deg, ${hex(o.amostra[0])} 50%, ${hex(o.amostra[1])} 50%)"></span><span class="mrb-on">${o.nome}</span>${sel ? '<span class="mrb-ok-sel">✓</span>' : ""}`, `mrb-op${sel ? " escolhida" : ""}`, () => escolher(aba, o.id));
      b.dataset.id = o.id; b.dataset.slot = aba; b.setAttribute("aria-pressed", String(sel));
      return b;
    }));
    raiz.querySelector(".mrb-dica").textContent = p.dica ?? "";
  }
  function desenharNome() {
    const el = raiz.querySelector(".mrb-nome");
    const cad = cb.nomeCadastro?.();
    if (cad) { el.innerHTML = `<span>Seu nome na plaquinha: <b></b></span>`; el.querySelector("b").textContent = cad; return; }
    el.innerHTML = `<label>Como você se chama? <small>(se quiser)</small><input class="mrb-campo" maxlength="12" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Seu nome" data-foco></label>`;
    const inp = el.querySelector("input");
    inp.value = cb.nomeSalvo?.() ?? "";
    inp.addEventListener("input", () => cb.aoNome?.(inp.value.trim().replace(/\s+/g, " ").slice(0, 12)));
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === "Escape") { e.stopPropagation(); inp.blur(); } });
  }
  function escolher(slot, id) {
    if (escolha[slot] === id) return;
    escolha = { ...escolha, [slot]: id };
    if (rb) vestirPecas(rb, escolha);
    cb.aoEscolher?.(slot, id);
    desenharOpcoes();
    focar(opcoesEl.querySelector(`[data-id="${id}"]`));
  }
  raiz.querySelector(".mrb-ok").addEventListener("click", (e) => { e.stopPropagation(); api.fechar(); });
  raiz.addEventListener("click", (e) => { if (e.target === raiz) api.fechar(); });

  // ---- a vista 3D: o Rabisco gira num pedestal; arrastar com o dedo/mouse vira na mão
  function montar3D() {
    palco = criarPalco3D(vista, { camera: { pos: VISTAS.inteiro[0], alvo: VISTAS.inteiro[1], fov: 32 }, chao: null, sombra: false, classe: "mrb-palco" });
    rb = new Rabisco3D({ raiz: "../..", altura: ALTURA });
    prepararRoupa(rb);
    vestirPecas(rb, escolha);
    // pedestal redondo, no estilo da cidade (contorno preto)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.05, 0.14, 40), toon(0xffffff));
    comContorno(base, 0.05); base.position.y = -0.07;
    const aro = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.04, 8, 48), toon(0xec2e8c));
    aro.rotation.x = Math.PI / 2; aro.position.y = 0.0;
    palco.cena.add(base, aro, rb.grupo);
    rb.grupo.rotation.y = 0.5;
    camAtual = { pos: new THREE.Vector3(...VISTAS.inteiro[0]), alvo: new THREE.Vector3(...VISTAS.inteiro[1]) };
    palco.aoQuadro((dt) => {
      rb.atualizar(dt, { modo: "parado" });
      if (arrastando) return;
      parado = Math.max(0, parado - dt);
      if (giro != null && !parado) rb.grupo.rotation.y += dt * 0.75;
      const [p, a] = VISTAS[alvoVista];
      const k = Math.min(1, dt * 5);
      if (camAtual.pos.distanceToSquared(new THREE.Vector3(...p)) > 1e-4 || camAtual.alvo.distanceToSquared(new THREE.Vector3(...a)) > 1e-4) {
        camAtual.pos.lerp(new THREE.Vector3(...p), k); camAtual.alvo.lerp(new THREE.Vector3(...a), k);
        palco.olhar(camAtual.pos.toArray(), camAtual.alvo.toArray());
      }
    });
    vista.addEventListener("pointerdown", (e) => { arrastando = { x: e.clientX, y0: rb.grupo.rotation.y }; vista.setPointerCapture?.(e.pointerId); });
    vista.addEventListener("pointermove", (e) => { if (arrastando) rb.grupo.rotation.y = arrastando.y0 + (e.clientX - arrastando.x) * 0.012; });
    const solta = () => { if (arrastando) { arrastando = null; parado = 2.5; } };
    vista.addEventListener("pointerup", solta); vista.addEventListener("pointercancel", solta);
  }
  function desmontar3D() { palco?.destruir(); palco = null; rb = null; vista.replaceChildren(); }
  function vistaDaAba() { alvoVista = VISTAS[aba] ? aba : "inteiro"; }

  function focar(el) {
    foco?.classList.remove("rf-foco");
    foco = el;
    if (el) { el.classList.add("rf-foco"); el.focus({ preventScroll: true }); }
  }
  const api = {
    raiz,
    get aberto() { return !raiz.hidden; },
    get aba() { return aba; },
    get rabisco() { return rb; },
    get palco() { return palco; },
    abrir(qual = null) {
      escolha = { ...cb.escolha() };
      if (qual && PECAS[qual]) aba = qual;
      raiz.hidden = false;
      desenharAbas(); desenharOpcoes(); desenharNome(); vistaDaAba();
      montar3D();
      focar(abasEl.querySelector(".ativa"));
      cb.aoAbrir?.();
    },
    fechar() {
      if (raiz.hidden) return;
      raiz.hidden = true; foco = null;
      desmontar3D();
      cb.aoFechar?.();
    },
    voltar() { api.fechar(); },
    escolher,
    // para os testes e as fotos: gira para um ângulo fixo (null volta a girar sozinho)
    girar(ang) { if (!rb) return; if (ang == null) { giro = 0; parado = 0; } else { giro = null; rb.grupo.rotation.y = ang; } },
    confirmar() { foco?.click(); },
    // anda o foco pela tela: pega o item mais perto na direção pedida
    navegar(dx, dy) {
      const itens = [...raiz.querySelectorAll("[data-foco]")].filter((e) => e.offsetParent !== null);
      if (!foco || !itens.includes(foco)) { focar(itens[0]); return; }
      const a = foco.getBoundingClientRect(), ax = a.x + a.width / 2, ay = a.y + a.height / 2;
      let melhor = null, dm = Infinity;
      for (const e of itens) {
        if (e === foco) continue;
        const b = e.getBoundingClientRect(), bx = b.x + b.width / 2 - ax, by = b.y + b.height / 2 - ay;
        const frente = bx * dx + by * dy;
        if (frente <= 4) continue;
        const d = frente + Math.abs(bx * dy - by * dx) * 2;
        if (d < dm) { dm = d; melhor = e; }
      }
      if (melhor) focar(melhor);
    },
  };
  return api;
}
