// Rabiscolândia: o carrossel de decoração. Num ponto da casa, a criança passa os móveis (◀ ▶), troca a cor (▲ ▼)
// e confirma (✓). Funciona no toque, no teclado (setas, Enter, Esc) e no controle (direcional, A, B).
// A prévia aparece no lugar na hora; "Pronto" guarda, "Voltar" desfaz.
//
//   const deco = criarDecorar(caixa, { aoTrocar(escolha), aoConfirmar(escolha), aoCancelar() });
//   deco.abrir(opcoes, escolhaAtual, cores);  deco.navegar(dx, dy); deco.confirmar(); deco.cancelar();

export function criarDecorar(onde, cb) {
  const raiz = document.createElement("div");
  raiz.className = "deco-rp";
  raiz.hidden = true;
  raiz.innerHTML = `<div class="deco-cartao" role="dialog" aria-label="Decorar">
    <div class="deco-titulo">🛋️ <span class="deco-comodo"></span></div>
    <div class="deco-linha"><button class="deco-bt" data-d="esq" aria-label="Móvel anterior">◀</button><div class="deco-nome"></div><button class="deco-bt" data-d="dir" aria-label="Próximo móvel">▶</button></div>
    <div class="deco-cores"></div>
    <div class="deco-acoes"><button class="deco-ok" data-d="ok">✓ Pronto</button><button class="deco-voltar" data-d="voltar">Voltar</button></div>
    <small class="deco-dica"></small></div>`;
  onde.append(raiz);
  let opcoes = [], i = 0, cores = [], c = 0, original = null;
  const atual = () => (opcoes[i]?.id ? { id: opcoes[i].id, variante: opcoes[i].variante ?? 0, cor: cores[c] } : null);
  function desenhar() {
    raiz.querySelector(".deco-nome").textContent = opcoes[i]?.nome ?? "";
    const cc = raiz.querySelector(".deco-cores");
    cc.replaceChildren(...cores.map((cor, k) => { const b = document.createElement("button"); b.className = `deco-cor${k === c ? " ativa" : ""}`; b.style.background = `#${cor.toString(16).padStart(6, "0")}`; b.setAttribute("aria-label", `Cor ${k + 1}`); b.onclick = (e) => { e.stopPropagation(); c = k; mudou(); }; return b; }));
    cc.hidden = !opcoes[i]?.id;
  }
  function mudou() { desenhar(); cb.aoTrocar?.(atual()); }
  raiz.addEventListener("pointerdown", (e) => e.stopPropagation());
  for (const b of raiz.querySelectorAll("[data-d]")) b.addEventListener("click", (e) => { e.stopPropagation(); acao(b.dataset.d); });
  function acao(d) {
    if (d === "esq") { i = (i - 1 + opcoes.length) % opcoes.length; mudou(); }
    else if (d === "dir") { i = (i + 1) % opcoes.length; mudou(); }
    else if (d === "ok") api.confirmar();
    else if (d === "voltar") api.cancelar();
  }
  const api = {
    raiz,
    get aberto() { return !raiz.hidden; },
    abrir({ titulo, lista, escolha, paleta, dica }) {
      opcoes = [{ id: null, nome: "— vazio —" }, ...lista];
      cores = paleta; original = escolha;
      i = Math.max(0, opcoes.findIndex((o) => escolha && o.id === escolha.id && (o.variante ?? 0) === (escolha.variante ?? 0)));
      c = Math.max(0, escolha ? cores.indexOf(escolha.cor) : 0);
      raiz.querySelector(".deco-comodo").textContent = titulo;
      raiz.querySelector(".deco-dica").textContent = dica ?? "";
      raiz.hidden = false;
      desenhar();
    },
    navegar(dx, dy) { if (dx) acao(dx < 0 ? "esq" : "dir"); if (dy && opcoes[i]?.id) { c = (c + (dy > 0 ? 1 : -1) + cores.length) % cores.length; mudou(); } },
    confirmar() { if (raiz.hidden) return; raiz.hidden = true; cb.aoConfirmar?.(atual()); },
    cancelar() { if (raiz.hidden) return; raiz.hidden = true; cb.aoCancelar?.(original); },
    get escolha() { return atual(); },
  };
  return api;
}
