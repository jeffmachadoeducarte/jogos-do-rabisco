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
  caixa.append(fileira, menu, mapa);
  // tocar fora fecha o menu; Esc também
  caixa.addEventListener("pointerdown", (e) => { if (menuDe && !menu.contains(e.target) && !fileira.contains(e.target)) fecharMenu(); }, true);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menuDe) { fecharMenu(); e.stopPropagation(); } }, true);

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
    // uma tela por cima (Rabisfone, mapa grande, Ateliê...): a fileira, o menu e o Mapa somem
    ocultar(sim) { caixa.classList.toggle("hud-oculto", Boolean(sim)); if (sim) fecharMenu(); },
    destruir() { fileira.remove(); menu.remove(); mapa.remove(); mais.remove(); },
  };
  api.atualizar(); api.nivel();
  return api;
}
