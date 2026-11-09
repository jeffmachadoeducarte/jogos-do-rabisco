// Rabiscolândia (Mundo Vivo, etapa 9): a interface nova por cima do 3D (só DOM: nenhuma chamada de desenho).
//  - painel do jogador (em cima à esquerda, dentro do .hud-rp): retrato (emoji do perfil da família ou o Rabisco), nome,
//    nível e barra de XP (a etapa 10 alimenta: hud.nivel({ nivel, xp, meta })); tocar nele abre o Meu Rabisco;
//  - "+" ao lado do contador de moedas: abre a loja (Ateliê);
//  - fileira de botões grandes (em cima à direita): Missões, Minha Casa, Inventário, Loja (menu: Ateliê e Móveis) e
//    Conquistas (menu: Passaporte, Desafios e o que a etapa 10 acrescentar). Cada um abre o que já existe no Rabisfone;
//  - botão do Mapa (embaixo à esquerda).
// Posições e tamanhos em hud.css (celular deitado, em pé e TV). O Rabisfone continua existindo e fazendo tudo isso também.
//
//   const hud = criarHud(caixa, hudRp, { perfil() → { nome, emoji }, abrirApp(id), abrirMapa(), moveis(), meuRabisco(),
//     menuExtra?(id) → [{ ic, nome, sub?, acao }], aoAbrir?() });
//   hud.atualizar(); hud.nivel({ nivel, xp, meta }); hud.ocultar(bool); hud.fecharMenu(); hud.menuAberto; hud.marcar(id, n)

const BOTOES = [
  { id: "missoes", ic: "📘", nome: "Missões", app: "passaporte" },
  { id: "casa", ic: "🏠", nome: "Minha Casa", app: "casa" },
  { id: "inventario", ic: "🎒", nome: "Inventário", app: "inventario" },
  { id: "loja", ic: "🛍️", nome: "Loja", menu: [{ ic: "🎨", nome: "Ateliê", sub: "roupas e pinturas", app: "atelie" }, { ic: "🛋️", nome: "Móveis", sub: "para a sua casa", acao: "moveis" }] },
  { id: "conquistas", ic: "🏆", nome: "Conquistas", menu: [{ ic: "📘", nome: "Passaporte", sub: "selos das missões", app: "passaporte" }, { ic: "🏁", nome: "Desafios", sub: "medalhas", app: "desafios" }] },
];

export function criarHud(caixa, hudRp, cb) {
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  // ---- painel do jogador, dentro do chip de cima
  const chip = hudRp.querySelector(".chip-rp");
  chip.classList.add("hud-jog");
  chip.setAttribute("role", "button"); chip.setAttribute("aria-label", "Meu Rabisco");
  chip.innerHTML = `<span class="hud-avatar"></span><span class="hud-txt"><b class="hud-nome"></b><span class="hud-niv">Nível <i>1</i></span><span class="hud-xp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></span></span>`;
  chip.addEventListener("click", (e) => { e.stopPropagation(); fecharMenu(); cb.meuRabisco?.(); });
  // ---- "+" da loja, logo depois do contador de moedas (criado antes por jogo.js)
  const mais = el("button", "hud-mais", "+");
  mais.setAttribute("aria-label", "Loja: ganhe e gaste Rabiscoins");
  mais.addEventListener("click", (e) => { e.stopPropagation(); fecharMenu(); cb.abrirApp?.("atelie"); });
  const contador = hudRp.querySelector(".rbc-contador");
  if (contador) contador.after(mais); else hudRp.append(mais);
  // ---- fileira de botões e o menu
  const fileira = el("div", "hud-botoes");
  fileira.setAttribute("role", "toolbar"); fileira.setAttribute("aria-label", "Atalhos");
  const menu = el("div", "hud-menu"); menu.hidden = true; menu.setAttribute("role", "menu");
  let menuDe = null;
  const botoes = {};
  for (const b of BOTOES) {
    const bt = el("button", "hud-btn", `<span class="ic">${b.ic}</span><small>${b.nome}</small><i class="hud-bolinha" aria-hidden="true"></i>`);
    bt.dataset.hud = b.id; bt.setAttribute("aria-label", b.nome);
    if (b.menu) { bt.setAttribute("aria-haspopup", "menu"); bt.setAttribute("aria-expanded", "false"); }
    bt.addEventListener("click", (e) => { e.stopPropagation(); if (b.menu) abrirMenu(b, bt); else { fecharMenu(); cb.abrirApp?.(b.app); } });
    fileira.append(bt); botoes[b.id] = bt;
  }
  function abrirMenu(b, bt) {
    if (menuDe === b.id) return fecharMenu();
    fecharMenu();
    menuDe = b.id; bt.setAttribute("aria-expanded", "true");
    menu.replaceChildren();
    for (const it of [...b.menu, ...(cb.menuExtra?.(b.id) ?? [])]) {
      const m = el("button", "hud-menu-item", `<span class="ic">${it.ic}</span><span>${it.nome}</span>${it.sub ? `<small>${it.sub}</small>` : ""}`);
      m.setAttribute("role", "menuitem"); if (it.id) m.dataset.item = it.id;
      m.addEventListener("click", (e) => { e.stopPropagation(); fecharMenu(); if (it.app) cb.abrirApp?.(it.app); else if (typeof it.acao === "function") it.acao(); else cb[it.acao]?.(); });
      menu.append(m);
    }
    menu.hidden = false;
    cb.aoAbrir?.();
  }
  function fecharMenu() {
    if (!menuDe) return;
    botoes[menuDe]?.setAttribute("aria-expanded", "false");
    menuDe = null; menu.hidden = true;
  }
  // ---- botão do Mapa
  const mapa = el("button", "hud-mapa", `<span class="ic">🗺️</span><small>Mapa</small>`);
  mapa.setAttribute("aria-label", "Abrir o mapa");
  mapa.addEventListener("click", (e) => { e.stopPropagation(); fecharMenu(); cb.abrirMapa?.(); });
  // ---- barra de itens (etapa 10): ESPACOS espaços; com mais itens, o último vira "+n" e abre a Mochila
  const ESPACOS = 6;
  const barra = el("div", "hud-barra"); barra.setAttribute("role", "toolbar"); barra.setAttribute("aria-label", "Mochila"); barra.hidden = true;
  const infoItem = el("div", "hud-item-info"); infoItem.hidden = true; infoItem.setAttribute("aria-live", "polite");
  let itensBarra = [], itemAberto = null, novos = new Set();
  function barraDe(itens) {
    itensBarra = itens ?? [];
    barra.replaceChildren();
    barra.hidden = !itensBarra.length; caixa.classList.toggle("com-barra", itensBarra.length > 0);
    if (!itensBarra.length) { infoItem.hidden = true; itemAberto = null; return; }
    const mostra = itensBarra.length > ESPACOS ? itensBarra.slice(0, ESPACOS - 1) : itensBarra;
    for (const it of mostra) {
      const s = el("button", `hud-slot${it.carregando ? " carregando" : ""}${novos.has(it.id) ? " novo" : ""}`, `${it.emoji}${it.qtd > 1 ? `<i class="hud-qtd">${it.qtd}</i>` : ""}`);
      s.dataset.item = it.id; s.setAttribute("aria-label", it.nome);
      s.addEventListener("click", (e) => { e.stopPropagation(); fecharMenu(); novos.delete(it.id); s.classList.remove("novo"); mostrarItem(it.id); });
      barra.append(s);
    }
    if (itensBarra.length > ESPACOS) { const m = el("button", "hud-slot mais", `+${itensBarra.length - (ESPACOS - 1)}`); m.setAttribute("aria-label", "Ver a mochila inteira"); m.addEventListener("click", (e) => { e.stopPropagation(); cb.abrirApp?.("inventario"); }); barra.append(m); }
    for (let k = itensBarra.length; k < ESPACOS; k++) { const v = el("span", "hud-slot"); v.setAttribute("aria-hidden", "true"); barra.append(v); }
    if (itemAberto && !itensBarra.some((q) => q.id === itemAberto)) { infoItem.hidden = true; itemAberto = null; }
  }
  // tocar num item: nome e o que faz (a Bíblia mostra um versículo); tocar de novo fecha
  function mostrarItem(id) {
    if (itemAberto === id) { infoItem.hidden = true; itemAberto = null; return; }
    const d = cb.descreverItem?.(id) ?? itensBarra.find((q) => q.id === id);
    if (!d) return;
    itemAberto = id;
    infoItem.innerHTML = `<b>${d.emoji} ${d.nome}</b>${d.desc ?? ""}`;
    infoItem.hidden = false;
    clearTimeout(mostrarItem.t); mostrarItem.t = setTimeout(() => { if (itemAberto === id) { infoItem.hidden = true; itemAberto = null; } }, 9000);
  }
  caixa.append(fileira, menu, mapa, barra, infoItem);
  // tocar fora fecha o menu e a informação do item; Esc também
  caixa.addEventListener("pointerdown", (e) => { if (menuDe && !menu.contains(e.target) && !fileira.contains(e.target)) fecharMenu(); if (itemAberto && !barra.contains(e.target) && !infoItem.contains(e.target)) { infoItem.hidden = true; itemAberto = null; } }, true);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && (menuDe || itemAberto)) { fecharMenu(); infoItem.hidden = true; itemAberto = null; e.stopPropagation(); } }, true);

  const api = {
    fileira, menu, mapa, painel: chip, botoes,
    get menuAberto() { return menuDe; },
    fecharMenu,
    // nome e retrato (perfil da família: 👧/👦; sem cadastro: o Rabisco)
    atualizar() {
      const p = cb.perfil?.() ?? {};
      chip.querySelector(".hud-avatar").textContent = p.emoji || "✏️";
      chip.querySelector(".hud-nome").textContent = (p.nome || "Rabisco").trim().split(/\s+/)[0];
    },
    // nível e barra de XP (etapa 10); até lá fica no nível 1 com a barra vazia
    nivel({ nivel = 1, xp = 0, meta = 1 } = {}) {
      chip.querySelector(".hud-niv i").textContent = String(nivel);
      const pct = Math.max(0, Math.min(100, Math.round((xp / Math.max(1, meta)) * 100)));
      const barra = chip.querySelector(".hud-xp"); barra.querySelector("i").style.width = `${pct}%`;
      barra.setAttribute("aria-valuenow", String(pct)); barra.title = `${xp} de ${meta} XP`;
    },
    // bolinha com um número num botão (ex.: itens novos no inventário); 0 esconde
    marcar(id, n) { const b = botoes[id]?.querySelector(".hud-bolinha"); if (!b) return; b.textContent = String(n); b.classList.toggle("ativa", n > 0); },
    // barra de itens (etapa 10): a lista da mochila (inventario.lista()); novo(id) marca o item com uma estrelinha até ser tocado
    barra: barraDe, mostrarItem, get itemAberto() { return itemAberto; },
    novo(id) { novos.add(id); barraDe(itensBarra); api.marcar("inventario", novos.size); },
    // "+n XP" voando do painel e, ao subir de nível, o painel comemora
    xpGanho(n) { if (!(n > 0)) return; const r = chip.getBoundingClientRect(), c = caixa.getBoundingClientRect(); const f = el("div", "hud-xp-mais", `+${n} XP`); f.style.left = `${r.right - c.left - 10}px`; f.style.top = `${r.top - c.top + 4}px`; caixa.append(f); setTimeout(() => f.remove(), 1500); },
    subiu() { chip.classList.remove("sobe"); void chip.offsetWidth; chip.classList.add("sobe"); setTimeout(() => chip.classList.remove("sobe"), 1300); },
    // uma tela por cima (Rabisfone, mapa grande, Ateliê...): a fileira, o menu, o Mapa e a barra somem
    ocultar(sim) { caixa.classList.toggle("hud-oculto", Boolean(sim)); if (sim) { fecharMenu(); if (itemAberto) { infoItem.hidden = true; itemAberto = null; } } },
    destruir() { fileira.remove(); menu.remove(); mapa.remove(); mais.remove(); barra.remove(); infoItem.remove(); caixa.classList.remove("com-barra"); },
  };
  api.atualizar(); api.nivel();
  return api;
}
