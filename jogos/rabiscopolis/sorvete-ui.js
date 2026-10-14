// Rabiscolândia: balcão da sorveteria. A criança escolhe 2 bolas (na ordem: a de baixo e a de cima) e entrega.
// Toque/mouse nos botões; teclado e controle andam pelos sabores (◀ ▶ ▲ ▼), A/Enter escolhe, B/Esc fecha.
//
//   const ui = criarSorveteUI(caixa);  ui.abrir(sabores, (escolha) => certo);  ui.navegar(dx, dy); ui.confirmar(); ui.fechar()

export function criarSorveteUI(onde) {
  const raiz = document.createElement("div");
  raiz.className = "sorvete-rp";
  raiz.hidden = true;
  raiz.innerHTML = `<div class="deco-cartao"><div class="deco-titulo">🍦 Monte a casquinha</div>
    <div class="sv-escolha" aria-live="polite"></div><div class="sv-sabores"></div>
    <div class="deco-acoes"><button class="deco-ok sv-entregar">Entregar</button><button class="deco-voltar sv-limpar">Limpar</button><button class="deco-voltar sv-fechar">Fechar</button></div></div>`;
  onde.append(raiz);
  raiz.addEventListener("pointerdown", (e) => e.stopPropagation());
  let sabores = [], escolha = [], cb = null, foco = 0;
  const botoes = () => [...raiz.querySelectorAll("button")];
  function desenhar() {
    raiz.querySelector(".sv-escolha").innerHTML = escolha.length ? escolha.map((s) => `<span class="sv-bola" style="background:#${s.cor.toString(16).padStart(6, "0")}"></span>${s.nome}`).join(" + ") : "Escolha 2 sabores";
    botoes().forEach((b, i) => b.classList.toggle("rf-foco", i === foco));
  }
  function escolher(s) { if (escolha.length >= 2) escolha = []; escolha.push(s); desenhar(); }
  raiz.querySelector(".sv-entregar").addEventListener("click", (e) => { e.stopPropagation(); entregar(); });
  raiz.querySelector(".sv-limpar").addEventListener("click", (e) => { e.stopPropagation(); escolha = []; desenhar(); });
  raiz.querySelector(".sv-fechar").addEventListener("click", (e) => { e.stopPropagation(); api.fechar(); });
  function entregar() {
    if (escolha.length < 2) return;
    const certo = cb?.(escolha);
    escolha = [];
    if (certo) api.fechar(); else desenhar();
  }
  const api = {
    raiz,
    get aberto() { return !raiz.hidden; },
    get escolha() { return escolha.map((s) => s.id); },
    abrir(lista, aoEntregar) {
      sabores = lista; cb = aoEntregar; escolha = []; foco = 0;
      const box = raiz.querySelector(".sv-sabores");
      box.replaceChildren(...sabores.map((s) => { const b = document.createElement("button"); b.className = "sv-sabor"; b.dataset.sabor = s.id; b.innerHTML = `<span class="sv-bola" style="background:#${s.cor.toString(16).padStart(6, "0")}"></span>${s.nome}`; b.addEventListener("click", (e) => { e.stopPropagation(); escolher(s); }); return b; }));
      raiz.hidden = false; desenhar();
    },
    escolher(id) { const s = sabores.find((x) => x.id === id); if (s) escolher(s); },
    entregar,
    navegar(dx, dy) { const n = botoes().length; foco = (foco + (dx || dy * 3) + n) % n; desenhar(); },
    confirmar() { botoes()[foco]?.click(); },
    fechar() { raiz.hidden = true; },
  };
  return api;
}
