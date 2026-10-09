// Motor de colorir: põe um desenho de desenhos.js na tela e pinta as partes.
// Cada parte vira um item do controle (data-foco), então dá para pintar com toque, mouse, teclado ou controle.
//
//   const d = montarDesenho(jogo.palco, "casa", { aoTocar: (parte) => d.pintar(parte, "#e63946") });
//   d.partes  → as partes pintáveis (sem os detalhes fixos)

import { DESENHOS, corPorId } from "./desenhos.js";

const NS = "http://www.w3.org/2000/svg";

export function montarDesenho(onde, id, { aoTocar = () => {}, rotulos = null, comCores = false } = {}) {
  const des = DESENHOS[id];
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 400 300");
  svg.setAttribute("class", "desenho");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Desenho para colorir: ${des.nome}`);
  svg.innerHTML = `<g class="partes">${des.partes.join("")}</g><g class="rotulos"></g>`;
  onde.append(svg);

  const partes = [];
  for (const el of svg.querySelectorAll("[data-parte]")) {
    if (el.hasAttribute("data-fixa")) { el.style.fill = corPorId[el.dataset.cor].hex; continue; }
    el.style.fill = comCores ? corPorId[el.dataset.cor].hex : "#ffffff";
    el.setAttribute("data-foco", "");
    el.setAttribute("tabindex", "-1");
    el.setAttribute("aria-label", el.dataset.parte);
    el.addEventListener("click", (e) => aoTocar(el, e)); // e.detail = 0: veio do controle ou do teclado
    partes.push(el);
  }

  // rótulos (Pinte pelos Números): um texto no ponto mais "aberto" da parte que aparece na tela
  if (rotulos) {
    const g = svg.querySelector(".rotulos");
    const todas = [...svg.querySelectorAll("[data-parte]")];
    for (const el of [...partes]) {
      const [x, y, folga] = pontoLivre(svg, el, todas.slice(todas.indexOf(el) + 1));
      // parte pequena demais para uma conta: vem pintada, como os detalhes
      if (folga < 7.5) {
        el.style.fill = corPorId[el.dataset.cor].hex;
        el.removeAttribute("data-foco"); el.removeAttribute("tabindex");
        el.style.pointerEvents = "none";
        partes.splice(partes.indexOf(el), 1);
        continue;
      }
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", x);
      t.setAttribute("y", y);
      const texto = rotulos(el);
      t.textContent = texto;
      t.setAttribute("font-size", Math.max(10, Math.min(22, (folga * 2.1) / Math.max(2, texto.length * 0.62))));
      t.setAttribute("class", "rotulo");
      el._rotulo = t;
      g.append(t);
    }
  }

  return {
    svg, partes, des,
    pintar(el, hex) {
      el.style.fill = hex;
      el.dataset.pintada = hex;
      el.classList.remove("pinta"); void el.getBBox(); el.classList.add("pinta");
      if (el._rotulo) el._rotulo.classList.add("feito");
    },
    corCerta: (el) => corPorId[el.dataset.cor],
    todasPintadas: () => partes.every((el) => el.dataset.pintada),
    remover: () => svg.remove(),
  };
}

// Procura, numa grade de pontos, o lugar da parte que está mais longe das bordas e das partes por cima dela.
// Volta [x, y, distância até a borda mais perto].
function pontoLivre(svg, el, porCima) {
  const b = el.getBBox();
  const passo = Math.max(3, Math.min(b.width, b.height) / 14);
  const pt = svg.createSVGPoint();
  const dentro = (x, y) => {
    pt.x = x; pt.y = y;
    if (!el.isPointInFill(pt)) return false;
    return !porCima.some((o) => o.isPointInFill(pt));
  };
  const bons = [], ruins = [];
  for (let y = b.y - passo; y <= b.y + b.height + passo; y += passo) {
    for (let x = b.x - passo; x <= b.x + b.width + passo; x += passo) (dentro(x, y) ? bons : ruins).push([x, y]);
  }
  // as bordas da parte (e do desenho) também contam como limite
  for (let t = 0; t <= 1.0001; t += 0.05) {
    ruins.push([b.x + b.width * t, b.y], [b.x + b.width * t, b.y + b.height], [b.x, b.y + b.height * t], [b.x + b.width, b.y + b.height * t]);
  }
  if (!bons.length) return [b.x + b.width / 2, b.y + b.height / 2, 8];
  let melhor = bons[0], maior = -1;
  for (const [x, y] of bons) {
    let menor = Infinity;
    for (const [rx, ry] of ruins) { const d = (rx - x) ** 2 + (ry - y) ** 2; if (d < menor) menor = d; }
    if (menor > maior) { maior = menor; melhor = [x, y]; }
  }
  return [melhor[0], melhor[1], Math.sqrt(maior)];
}

// Mistura de duas cores (Ateliê): média das cores com um pouco mais de saturação
export function misturar(a, b) {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  const hex = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  return `#${hex((r1 + r2) / 2)}${hex((g1 + g2) / 2)}${hex((b1 + b2) / 2)}`;
}
