// Rabiscolândia: o catálogo de móveis da casa (no padrão da loja do Ateliê: abas, cartões, saldo e o botão grande).
// A primeira aba é o baú de móveis (o que a criança já tem e ainda não pôs). Trocar um móvel por Rabiscoins põe um a mais
// no baú; "Pôr na casa" fecha o catálogo com o móvel na mão. Papel de parede e piso valem na hora para a casa toda.
// Funciona no toque, no mouse, no teclado (setas, Enter, Esc) e no controle (direcional, A, B): os botões têm data-foco.
//
//   const cat = criarCatalogoCasa(caixa, { saldo(), tem(id), postos(id), papel(), piso(), data(), figura(id),
//     trocar(item) → resultado de rabiscoins.comprar, aoPor(id), aoUsar(item), falar(chave), confete(), aoFechar() });
//   cat.abrir(aba?); cat.navegar(dx, dy); cat.confirmar(); cat.voltar(); cat.fechar(); cat.aba(id); cat.escolher(id); cat.fazer(); cat.maisUm()

import { MOVEIS_CASA, categoriasDaEpoca, naEpoca, itemCasa } from "./casa-dados.js";
import { ICONE_MOEDA, somCompra, somFalta } from "../../src/motor/rabiscoins-ui.js";

export function criarCatalogoCasa(onde, cb) {
  const raiz = document.createElement("div");
  raiz.className = "casa-cat-rp";
  raiz.hidden = true;
  raiz.innerHTML = `<div class="atl-cartao cc-cartao" role="dialog" aria-label="Móveis da casa">
    <div class="atl-vista cc-vista"><img class="cc-figura" alt=""><div class="cc-sobre"><b class="cc-nome"></b><span class="cc-info"></span></div></div>
    <div class="atl-painel">
      <div class="atl-topo"><div class="atl-titulo cc-titulo">🏠 Móveis da casa</div><div class="atl-saldo" aria-live="polite">${ICONE_MOEDA}<b>0</b></div></div>
      <div class="atl-abas" role="tablist"></div>
      <div class="atl-itens"></div>
      <div class="atl-rodape"><button type="button" class="atl-acao" data-foco></button><button type="button" class="atl-acao cc-mais trocar" data-foco hidden></button><button type="button" class="atl-ok deco-ok" data-foco>✓ Pronto</button></div>
      <small class="atl-dica"></small>
    </div></div>`;
  onde.append(raiz);
  raiz.addEventListener("pointerdown", (e) => e.stopPropagation());
  const abasEl = raiz.querySelector(".atl-abas"), itensEl = raiz.querySelector(".atl-itens"), acaoEl = raiz.querySelector(".atl-acao"), maisEl = raiz.querySelector(".cc-mais");
  const dicaEl = raiz.querySelector(".atl-dica");
  let cat = "bau", sel = null, foco = null;
  const moeda = (n) => `<span class="atl-preco">${ICONE_MOEDA}${n}</span>`;
  const botao = (html, cls, aoClicar) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.setAttribute("data-foco", ""); b.innerHTML = html; b.addEventListener("click", (e) => { e.stopPropagation(); aoClicar(); }); return b; };
  const noBau = (it) => Math.max(0, cb.tem(it.id) - cb.postos(it.id));
  const usando = (it) => it.tipo && (it.tipo === "papel" ? cb.papel() : cb.piso()) === it.id;
  function cartoes() {
    const d = cb.data();
    if (cat === "bau") return MOVEIS_CASA.filter((it) => !it.tipo && naEpoca(it, d) && noBau(it) > 0);
    return MOVEIS_CASA.filter((it) => it.cat === cat && naEpoca(it, d));
  }
  function desenharSaldo() { raiz.querySelector(".atl-saldo b").textContent = String(cb.saldo()); }
  function desenharAbas() {
    abasEl.replaceChildren(...categoriasDaEpoca(cb.data()).map((c) => {
      const b = botao(`<span class="atl-ic">${c.icone}</span><span class="atl-rot">${c.nome}</span>`, `atl-aba${c.id === cat ? " ativa" : ""}`, () => { trocarAba(c.id); focar(abasEl.querySelector(".ativa")); });
      b.dataset.cat = c.id; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(c.id === cat));
      return b;
    }));
  }
  function rodapeDe(it) {
    if (it.tipo) return usando(it) ? `<span class="atl-estado usando">✓ Usando</span>` : cb.tem(it.id) ? `<span class="atl-estado seu">${it.gratis ? "De graça" : "É seu!"}</span>` : moeda(it.preco);
    const n = noBau(it);
    return n > 0 ? `<span class="atl-estado seu">🧺 No baú: ${n}</span>` : moeda(it.preco);
  }
  function desenharItens() {
    const lista = cartoes();
    if (!lista.length) { const p = document.createElement("p"); p.className = "cc-vazio"; p.textContent = "Seu baú está vazio. Escolha uma aba e troque Rabiscoins por móveis novos!"; itensEl.replaceChildren(p); return; }
    itensEl.replaceChildren(...lista.map((it) => {
      const selo = it.temporada ? `<span class="atl-selo" title="Natal">🎄</span>` : "";
      const b = botao(`${selo}<img class="cc-mini" alt="" src="${cb.figura(it.id)}"><span class="atl-nome">${it.nome}</span>${rodapeDe(it)}`,
        `atl-item${sel?.id === it.id ? " selecionado" : ""}${usando(it) ? " usando" : ""}${cb.tem(it.id) ? "" : " a-venda"}`, () => { selecionar(it); focar(acaoEl); });
      b.dataset.id = it.id; b.setAttribute("aria-pressed", String(sel?.id === it.id));
      b.addEventListener("focus", () => { if (sel?.id !== it.id) selecionar(it); });
      return b;
    }));
  }
  function desenharAcao() {
    const it = sel;
    acaoEl.classList.remove("trocar", "falta", "tirar", "vestir"); maisEl.hidden = true;
    if (!it) { acaoEl.hidden = true; dicaEl.textContent = ""; return; }
    acaoEl.hidden = false;
    const s = cb.saldo();
    if (it.tipo) {
      if (usando(it)) { acaoEl.innerHTML = "✓ Já está na casa"; acaoEl.classList.add("vestir"); }
      else if (cb.tem(it.id)) { acaoEl.innerHTML = it.tipo === "papel" ? "🖌️ Usar na parede" : "🖌️ Usar no piso"; acaoEl.classList.add("vestir"); }
      else if (s >= it.preco) { acaoEl.innerHTML = `Trocar por ${moeda(it.preco)}`; acaoEl.classList.add("trocar"); }
      else { acaoEl.innerHTML = `Faltam ${moeda(it.preco - s)}`; acaoEl.classList.add("falta"); }
    } else if (noBau(it) > 0) {
      acaoEl.innerHTML = "🛋️ Pôr na casa"; acaoEl.classList.add("vestir");
      maisEl.hidden = cat === "bau"; maisEl.innerHTML = `＋ Mais um: ${moeda(it.preco)}`;
    } else if (s >= it.preco) { acaoEl.innerHTML = `Trocar por ${moeda(it.preco)}`; acaoEl.classList.add("trocar"); }
    else { acaoEl.innerHTML = `Faltam ${moeda(it.preco - s)}`; acaoEl.classList.add("falta"); }
    dicaEl.textContent = acaoEl.classList.contains("falta") ? "Ajude os amigos nas missões para ganhar Rabiscoins!" : it.tipo ? "Vale para a casa toda" : "Depois de pôr, dá para girar, mover e mudar a cor";
  }
  function desenharVista() {
    const it = sel, img = raiz.querySelector(".cc-figura");
    if (!it) { img.removeAttribute("src"); raiz.querySelector(".cc-nome").textContent = ""; raiz.querySelector(".cc-info").textContent = ""; return; }
    img.src = cb.figura(it.id);
    raiz.querySelector(".cc-nome").textContent = `${it.temporada ? "🎄 " : ""}${it.nome}`;
    raiz.querySelector(".cc-info").textContent = it.tipo ? (it.tipo === "papel" ? "Papel de parede para a casa toda" : "Piso para a casa toda")
      : `${it.camada === "parede" ? "Na parede" : it.camada === "chao" ? "No chão (os móveis ficam em cima)" : `Ocupa ${it.celulas[0]} × ${it.celulas[1]} quadradinhos`} · 🧺 No baú: ${noBau(it)} · 🏠 Na casa: ${cb.postos(it.id)}`;
  }
  function selecionar(it) {
    sel = it;
    for (const b of itensEl.querySelectorAll(".atl-item")) { const s = b.dataset.id === it?.id; b.classList.toggle("selecionado", s); b.setAttribute("aria-pressed", String(s)); }
    desenharAcao(); desenharVista();
  }
  function tremer(el) { el.classList.remove("treme"); void el.offsetWidth; el.classList.add("treme"); }
  function trocar(it) {
    const r = cb.trocar(it);
    if (!r?.ok) { somFalta(); cb.falar?.("rp-atelie-falta"); tremer(acaoEl); return false; }
    somCompra(); cb.confete?.(); cb.falar?.(it.tipo ? "rp-atelie-comprou" : "rp-casa-trocou");
    desenharSaldo();
    return true;
  }
  function fazer() {
    const it = sel; if (!it) return;
    if (it.tipo) {
      if (usando(it)) return;
      const tinha = cb.tem(it.id) > 0;
      if (!tinha && !trocar(it)) return;
      cb.aoUsar(it);
      if (tinha) cb.falar?.("rp-casa-movel");
    } else if (noBau(it) > 0) { api.fechar(); cb.aoPor(it.id); return; }
    else if (!trocar(it)) return;
    desenharItens(); selecionar(it); focar(acaoEl);
  }
  function maisUm() { const it = sel; if (!it || it.tipo) return; if (trocar(it)) { desenharItens(); selecionar(it); focar(acaoEl); } }
  acaoEl.addEventListener("click", (e) => { e.stopPropagation(); fazer(); });
  maisEl.addEventListener("click", (e) => { e.stopPropagation(); maisUm(); });
  raiz.querySelector(".atl-ok").addEventListener("click", (e) => { e.stopPropagation(); api.fechar(); });
  raiz.addEventListener("click", (e) => { if (e.target === raiz) api.fechar(); });
  function trocarAba(c) {
    cat = c; sel = null;
    desenharAbas(); desenharItens();
    selecionar(cartoes()[0] ?? null);
  }
  function focar(el) {
    foco?.classList.remove("rf-foco");
    foco = el;
    if (el) { el.classList.add("rf-foco"); el.focus({ preventScroll: false }); el.scrollIntoView?.({ block: "nearest" }); }
  }
  const api = {
    raiz,
    get aberto() { return !raiz.hidden; },
    get cat() { return cat; },
    get selecionado() { return sel ? { ...sel } : null; },
    abrir(qual = null) {
      const abas = categoriasDaEpoca(cb.data()).map((c) => c.id);
      cat = qual && abas.includes(qual) ? qual : (MOVEIS_CASA.some((it) => !it.tipo && naEpoca(it, cb.data()) && noBau(it) > 0) ? "bau" : "sala");
      if (!abas.includes(cat)) cat = "bau";
      raiz.hidden = false;
      desenharSaldo(); trocarAba(cat);
      focar(itensEl.querySelector(".atl-item") ?? abasEl.querySelector(".ativa"));
      cb.aoAbrir?.();
    },
    fechar() { if (raiz.hidden) return; raiz.hidden = true; foco = null; sel = null; cb.aoFechar?.(); },
    voltar() { api.fechar(); },
    confirmar() { foco?.click(); },
    aba(c) { trocarAba(c); },
    escolher(id) { const it = cartoes().find((i) => i.id === id); if (it) selecionar(it); return Boolean(it); },
    get itens() { return cartoes().map((i) => i.id); },
    get acao() { return acaoEl.textContent.trim(); },
    fazer, maisUm,
    atualizar() { if (!raiz.hidden) { desenharSaldo(); desenharItens(); selecionar(sel ? itemCasa(sel.id) : null); } },
    navegar(dx, dy) {
      const itens = [...raiz.querySelectorAll("[data-foco]")].filter((e) => e.offsetParent !== null && !e.hidden);
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
