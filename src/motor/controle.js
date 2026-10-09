// Controle (gamepad) comum a todos os jogos: Xbox, PlayStation, Switch Pro ou genérico via USB/Bluetooth.
// O navegador só mostra o controle depois que a criança aperta algum botão nele com a página aberta.
// O jogo chama `controle.ler()` uma vez por quadro e recebe o que está apertado e o que acabou de ser apertado;
// nas telas de menu, `controle.navegar(tela, apertou)` move o foco entre os botões com o direcional e clica com A.
//
//   const controle = criarControle({ aoConectar: () => aviso("Controle conectado!") });
//   const { segura, apertou, soltou } = controle.ler();
//   if (apertou.pulo) ...

const CSS = `.controle-foco { outline: 6px solid #ffcc1f !important; outline-offset: 4px; }`;

// Layout "standard" do Gamepad API: 0 A/✕, 1 B/◯, 2 X/▢, 3 Y/△, 8 Select, 9 Start, 12–15 direcional
// no jogo A e B pulam; nos menus A confirma e B volta
const BOTOES = { pulo: [0, 1], confirma: [0], voltar: [1], cima: [12], baixo: [13], esq: [14], dir: [15], start: [9], select: [8] };
const ZONA_MORTA = 0.5;

export function criarControle({ aoConectar = () => {}, aoDesconectar = () => {} } = {}) {
  const estilo = document.createElement("style");
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  const vazio = () => ({ pulo: false, confirma: false, voltar: false, cima: false, baixo: false, esq: false, dir: false, start: false, select: false });
  let antes = vazio();

  // body.com-controle: o CSS do jogo pode trocar as dicas de toque pelas do controle
  addEventListener("gamepadconnected", (e) => { document.body.classList.add("com-controle"); aoConectar(e.gamepad); });
  addEventListener("gamepaddisconnected", (e) => { if (!api.conectado) document.body.classList.remove("com-controle"); aoDesconectar(e.gamepad); });

  const api = {
    get conectado() { return [...(navigator.getGamepads?.() ?? [])].some(Boolean); },

    // segura: apertado agora · apertou: apertado neste quadro · soltou: largado neste quadro · eixoX: alavanca
    ler() {
      const segura = vazio();
      let eixoX = 0, eixoY = 0; // alavanca esquerda de -1 a 1 (kart vira aos poucos; aventura 3D anda em qualquer direção)
      for (const g of navigator.getGamepads?.() ?? []) {
        if (!g) continue;
        for (const [nome, idx] of Object.entries(BOTOES)) {
          if (idx.some((i) => g.buttons[i]?.pressed)) segura[nome] = true;
        }
        const [x = 0, y = 0] = g.axes; // alavanca esquerda
        if (Math.abs(x) > 0.15 && Math.abs(x) > Math.abs(eixoX)) eixoX = x;
        if (Math.abs(y) > 0.15 && Math.abs(y) > Math.abs(eixoY)) eixoY = y;
        if (x < -ZONA_MORTA) segura.esq = true;
        if (x > ZONA_MORTA) segura.dir = true;
        if (y < -ZONA_MORTA) segura.cima = true;
        if (y > ZONA_MORTA) segura.baixo = true;
      }
      const apertou = vazio(), soltou = vazio();
      for (const k in segura) {
        apertou[k] = segura[k] && !antes[k];
        soltou[k] = !segura[k] && antes[k];
      }
      antes = segura;
      return { segura, apertou, soltou, eixoX, eixoY };
    },

    // Menu na tela: direcional anda entre os itens visíveis, A clica no que está em foco
    navegar(tela, apertou) {
      if (!tela) return;
      const dx = (apertou.dir ? 1 : 0) - (apertou.esq ? 1 : 0);
      const dy = (apertou.baixo ? 1 : 0) - (apertou.cima ? 1 : 0);
      if (dx || dy) moverFoco(tela, dx, dy);
      else if (apertou.confirma) {
        const atual = focoEm(tela);
        if (atual) clicar(atual);
        else moverFoco(tela, 0, 0);
      }
    },

    focar,
  };
  return api;
}

// ------------------------------------------------------------------ Foco (controle e teclado)
// Itens que recebem foco: botões, links, campos e qualquer elemento com data-foco (inclusive SVG).
const SELETOR = "button, a[href], input, [data-foco]";
const visivel = (el) => !el.hidden && !el.disabled && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
const itens = (tela) => [...tela.querySelectorAll(SELETOR)].filter(visivel);
const focoEm = (tela) => {
  const a = document.querySelector(".controle-foco") || document.activeElement;
  return a && a !== document.body && tela.contains(a) && visivel(a) ? a : null;
};

export function focar(el) {
  for (const b of document.querySelectorAll(".controle-foco")) b.classList.remove("controle-foco");
  el.classList.add("controle-foco");
  if (el.hasAttribute("data-foco") && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus?.({ preventScroll: true });
  el.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  el.addEventListener("blur", () => el.classList.remove("controle-foco"), { once: true });
}

export function clicar(el) {
  if (typeof el.click === "function" && !(el instanceof SVGElement)) el.click();
  else el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

// Anda para o item mais perto na direção (dx, dy); sem nenhum naquela direção, segue a ordem da página.
export function moverFoco(tela, dx, dy) {
  const lista = itens(tela);
  if (!lista.length) return null;
  const atual = focoEm(tela);
  if (!atual || (!dx && !dy)) { focar(lista[0]); return lista[0]; }
  const centro = (el) => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; };
  const [cx, cy] = centro(atual);
  let melhor = null, nota = Infinity;
  for (const el of lista) {
    if (el === atual) continue;
    const [x, y] = centro(el);
    const ao = (x - cx) * dx + (y - cy) * dy;          // quanto anda na direção pedida
    const lado = Math.abs((x - cx) * dy - (y - cy) * dx); // quanto sai para o lado
    if (ao <= 4) continue;
    const n = ao + lado * 2.2;
    if (n < nota) { nota = n; melhor = el; }
  }
  if (!melhor) {
    const i = lista.indexOf(atual);
    const passo = dx + dy > 0 ? 1 : -1;
    melhor = lista[(i + passo + lista.length) % lista.length];
  }
  focar(melhor);
  return melhor;
}

// Teclado nas telas de menu e nos jogos de tocar: setas andam, Enter/Espaço clica.
export function navegarComTeclado(tela, e) {
  if (!tela) return false;
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (d) { e.preventDefault(); moverFoco(tela, ...d); return true; }
  if ((e.key === "Enter" || e.key === " ") && document.querySelector(".controle-foco")) {
    const atual = focoEm(tela);
    if (atual && atual.matches("[data-foco]")) { e.preventDefault(); clicar(atual); return true; }
  }
  return false;
}

// Ligação pronta para os jogos: o controle escreve no mesmo objeto `entrada` do teclado e do toque.
// mapa: nome no controle → chave em `entrada` (se existir `entrada.<chave>Novo`, ele marca o aperto).
// Start pausa/continua (ou chama aoStart fora do jogo); nas telas, o direcional escolhe e A confirma.
//
//   const ctrl = ligarControle({ entrada, pausa, menu: () => estado === "abertura" ? $("abertura") : null, aoStart: comecar });
//   function quadro() { ctrl.atualizar(); pausa.atualizar(); ... }
// aoVoltar: B fora do jogo (ex.: fechar um painel); na tela de pause, B continua o jogo.
export function ligarControle({ entrada = {}, mapa = { esq: "esq", dir: "dir", baixo: "baixo", pulo: "pulo" }, pausa = null, menu = () => null, aoStart = () => {}, aoVoltar = () => {}, aoConectar = () => {}, aoDesconectar = () => {} }) {
  const soltarTudo = () => { for (const k of Object.values(mapa)) { entrada[k] = false; if (`${k}Novo` in entrada) entrada[`${k}Novo`] = false; } };
  const controle = criarControle({
    aoConectar,
    aoDesconectar: (g) => { soltarTudo(); pausa?.pausar(); aoDesconectar(g); },
  });
  return {
    controle,
    atualizar() {
      const leitura = controle.ler();
      const { apertou, soltou } = leitura;
      // só mexe na entrada quando o botão muda, para não apagar o que vem do teclado ou do toque
      const emMenu = pausa?.ativa || Boolean(menu()); // apertos no menu não viram pulo quando o jogo volta
      for (const [nome, k] of Object.entries(mapa)) {
        if (apertou[nome] && !emMenu) { if (`${k}Novo` in entrada && !entrada[k]) entrada[`${k}Novo`] = true; entrada[k] = true; }
        if (soltou[nome]) entrada[k] = false;
      }
      if (apertou.start) {
        if (pausa?.ativa) pausa.continuar();
        else if (pausa && pausa.podePausar()) pausa.pausar();
        else aoStart();
      } else if (apertou.voltar && pausa?.ativa) {
        pausa.continuar();
      } else {
        const tela = pausa?.ativa ? document.querySelector(".pausa-tela") : menu();
        if (apertou.voltar && tela) aoVoltar();
        else controle.navegar(tela, apertou);
      }
      return leitura;
    },
  };
}
