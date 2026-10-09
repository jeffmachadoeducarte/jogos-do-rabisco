// Casca comum dos jogos 2D do Rabisco. Monta a abertura (título, Rabisco, níveis), o topo
// (sair, placar, som), a pausa, a tela de vitória, o controle, o teclado e o celular.
// O jogo só desenha dentro de `jogo.palco` e avisa quando a criança venceu.
//
//   const jogo = criarCasca({
//     titulo: "Memória da Turma", sub: "Ache os pares!", faixa: "pequenos",
//     niveis: [{ nome: "Nível 1", desc: "6 cartas" }, ...],         // ou null: um botão "Jogar ▶"
//     dica: { teclado: "Setas e Enter", toque: "Toque nas cartas", controle: "Direcional e A" },
//     aoComecar: (nivel) => { ...desenha em jogo.palco... },
//   });
//   jogo.placar("⭐ 3");  jogo.aviso("Muito bem!", "bom");  jogo.vencer({ estrelas: 3, texto: "Você achou todos!" });

import { sons, musica } from "./sons.js";
import { falar, preCarregarFalas } from "./voz.js";
import { criarPausa } from "./pausa.js";
import { ligarControle, navegarComTeclado, moverFoco } from "./controle.js";
import { prepararCelular } from "./celular.js";
import { botaoVoltar, linkPortal } from "./voltar.js";

const RAIZ = "../..";
const el = (tag, props = {}, filhos = []) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "texto") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const f of filhos) e.append(f);
  return e;
};
export { el };

export function criarCasca({
  id = location.pathname.split("/").filter(Boolean).at(-1),
  titulo, sub = "", faixa = "", cor = null,
  niveis = null, dica = {}, deitado = false, musicaFundo = null,
  pose = "apresentando", falas = {}, teclado = true, menuNoJogo = true,
  aoComecar = () => {}, aoSair = () => {}, aoPausar = () => {}, aoContinuar = () => {}, aoVoltar = () => {},
  aoControle = null, // (leitura) a cada quadro durante o jogo: para jogos que usam os botões direto
}) {
  if (cor) document.documentElement.style.setProperty("--cor", cor);
  document.title = titulo;
  preCarregarFalas(Object.values(falas).filter(Boolean));
  const chaveEstrelas = `rabisco-${id}-niveis`;
  const lerFeitos = () => { try { return JSON.parse(localStorage.getItem(chaveEstrelas) || "{}"); } catch { return {}; } };

  // ---------- DOM
  const palco = el("main", { id: "palco", class: "escondido" });
  const placar = el("div", { class: "casca-placar", "aria-live": "polite" });
  const btnSair = el("button", { class: "casca-redondo", "aria-label": "Sair do jogo", texto: "✕", onclick: () => sair() });
  const btnSom = el("button", { class: "casca-redondo", "aria-label": "Ligar ou desligar o som", texto: sons.mudo ? "🔇" : "🔊", onclick: () => { btnSom.textContent = sons.alternarMudo() ? "🔇" : "🔊"; } });
  const topo = el("div", { class: "casca-topo" }, [el("div", { style: "display:flex;gap:10px;align-items:center" }, [btnSair, placar]), btnSom]);
  const avisoEl = el("div", { class: "casca-aviso", "aria-live": "assertive" });

  const conteudoAbertura = el("div", { class: "conteudo" }, [
    el("img", { class: "logo", src: `${RAIZ}/assets/marca/logos/azul-icone-rosa.png`, alt: "Educarte Escola Cristã" }),
    el("h1", { texto: titulo }),
    el("p", { class: "sub", texto: sub }),
  ]);
  const nivelBotoes = [];
  if (niveis?.length) {
    const grupo = el("div", { class: "casca-niveis", role: "group", "aria-label": "Escolha o nível" });
    niveis.forEach((n, i) => {
      const b = el("button", { class: "casca-nivel", html: `<b>${n.nome ?? `Nível ${i + 1}`}</b>${n.desc ? `<span>${n.desc}</span>` : ""}`, onclick: () => comecar(i + 1) });
      nivelBotoes.push(b);
      grupo.append(b);
    });
    conteudoAbertura.append(grupo);
  } else {
    conteudoAbertura.append(el("button", { class: "botao respira", texto: "JOGAR ▶", onclick: () => comecar(1) }));
  }
  const dicaEl = el("p", { class: "casca-dica" });
  dicaEl.innerHTML = [
    dica.teclado && `<span class="so-teclado">${dica.teclado}</span>`,
    dica.toque && `<span class="so-toque">${dica.toque}</span>`,
    `<span class="so-controle">${dica.controle || "Direcional para escolher · A para confirmar · Start para pausar"}</span>`,
  ].filter(Boolean).join("");
  if (dica.teclado || dica.toque) conteudoAbertura.append(dicaEl);
  const abertura = el("section", { class: "casca-tela casca-abertura" }, [
    botaoVoltar({ raiz: RAIZ, faixa }),
    el("img", { class: "rabisco", src: `${RAIZ}/assets/rabisco/poses/${pose}.png`, alt: "Rabisco" }),
    conteudoAbertura,
  ]);

  const vitTitulo = el("div", { class: "titulo" });
  const vitEstrelas = el("div", { class: "estrelas", "aria-hidden": "true" });
  const vitTexto = el("div", { class: "texto" });
  const vitExtra = el("div", { class: "extra" });
  const btnProximo = el("button", { class: "botao", texto: "Próximo nível ▶", onclick: () => { esconderVitoria(); comecar(Math.min(niveis?.length || 1, nivel + 1)); } });
  const btnDeNovo = el("button", { class: "botao ciano", texto: "Jogar de novo ↻", onclick: () => { esconderVitoria(); comecar(nivel); } });
  const btnVitSair = el("button", { class: "botao branco", texto: "Sair", onclick: () => sair() });
  const vitoria = el("section", { class: "casca-tela casca-vitoria escondido" }, [
    el("div", { class: "casca-cartao", role: "dialog", "aria-label": "Vitória" }, [
      vitTitulo, el("img", { class: "rabisco-feliz", src: `${RAIZ}/assets/rabisco/poses/frente.png`, alt: "" }), vitEstrelas, vitTexto, vitExtra,
      el("div", { class: "botoes" }, [btnProximo, btnDeNovo, btnVitSair]),
    ]),
  ]);
  document.body.append(palco, topo, avisoEl, abertura, vitoria);
  topo.classList.add("escondido");

  // ---------- Estado
  let estado = "abertura";
  let nivel = 1;
  const marcarFeitos = () => { const f = lerFeitos(); nivelBotoes.forEach((b, i) => b.classList.toggle("feito", Boolean(f[i + 1]))); };
  marcarFeitos();

  function comecar(n) {
    nivel = n;
    estado = "jogando";
    sons.destravar();
    abertura.classList.add("escondido");
    vitoria.classList.add("escondido");
    palco.classList.remove("escondido");
    topo.classList.remove("escondido");
    palco.innerHTML = "";
    placar.textContent = "";
    if (musicaFundo) musica.tocar(musicaFundo);
    aoComecar(n);
  }
  function esconderVitoria() { vitoria.classList.add("escondido"); }
  function irParaAbertura() {
    estado = "abertura";
    musica.parar();
    palco.classList.add("escondido");
    topo.classList.add("escondido");
    vitoria.classList.add("escondido");
    abertura.classList.remove("escondido");
    marcarFeitos();
    aoSair();
  }
  function sair() {
    if (estado !== "abertura") { irParaAbertura(); return; }
    location.href = linkPortal(RAIZ, faixa);
  }

  function aviso(texto, tipo = "", ms = 1800) {
    avisoEl.textContent = texto;
    avisoEl.className = `casca-aviso ativo ${tipo}`;
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => avisoEl.classList.remove("ativo"), ms);
  }

  function confete() {
    const cores = ["#00b5f0", "#ec2e8c", "#ff7a00", "#ffcc1f", "#1fc08e", "#8e6cff"];
    for (let i = 0; i < 70; i++) {
      const c = el("div", { class: "casca-confete" });
      c.style.left = `${Math.random() * 100}vw`;
      c.style.background = cores[i % cores.length];
      c.style.animationDuration = `${1.8 + Math.random() * 1.8}s`;
      c.style.animationDelay = `${Math.random() * 0.6}s`;
      document.body.append(c);
      setTimeout(() => c.remove(), 4500);
    }
  }

  // estrelas: 0 a 3 (ou null para esconder); texto: frase curta; extra: elemento ou HTML opcional
  function vencer({ titulo: t = "Muito bem!", estrelas = 3, texto = "", extra = "", fala = falas.vitoria, proximo = true } = {}) {
    if (estado !== "jogando") return;
    estado = "vitoria";
    musica.parar();
    const f = lerFeitos(); f[nivel] = true;
    try { localStorage.setItem(chaveEstrelas, JSON.stringify(f)); } catch { /* sem armazenamento */ }
    vitTitulo.textContent = t;
    vitEstrelas.innerHTML = estrelas == null ? "" : [1, 2, 3].map((k) => `<span class="${k <= estrelas ? "" : "apagada"}" style="animation-delay:${0.3 + k * 0.25}s">⭐</span>`).join("");
    vitTexto.textContent = texto;
    vitExtra.innerHTML = "";
    if (extra instanceof Node) vitExtra.append(extra); else vitExtra.innerHTML = extra;
    btnProximo.hidden = !proximo || !niveis || nivel >= niveis.length;
    setTimeout(() => {
      vitoria.classList.remove("escondido");
      sons.vitoria();
      confete();
      if (fala) setTimeout(() => falar(fala), 400);
      (btnProximo.hidden ? btnDeNovo : btnProximo).focus({ preventScroll: true });
    }, 700);
  }

  // ---------- Pausa, controle, teclado e celular
  const pausa = criarPausa({
    podePausar: () => estado === "jogando",
    aoPausar: () => { musica.parar(); aoPausar(); },
    aoContinuar: () => { if (musicaFundo) musica.tocar(musicaFundo); aoContinuar(); },
    aoRecomecar: () => comecar(nivel),
    aoSair: () => irParaAbertura(),
  });
  const telaDoMenu = () => (estado === "abertura" ? abertura : estado === "vitoria" ? vitoria : menuNoJogo ? palco : null);
  const controle = ligarControle({
    mapa: {},
    pausa,
    menu: telaDoMenu,
    aoStart: () => { if (estado === "abertura") comecar(1); },
    aoVoltar: () => { if (estado === "jogando") aoVoltar(); },
  });
  addEventListener("keydown", (e) => {
    if (pausa.ativa) return;
    if (estado === "jogando" && !teclado) return;
    navegarComTeclado(telaDoMenu(), e);
  });
  prepararCelular({ deitado });
  const laco = () => {
    const leitura = controle.atualizar();
    if (aoControle && estado === "jogando" && !pausa.ativa) aoControle(leitura);
    pausa.atualizar();
    requestAnimationFrame(laco);
  };
  requestAnimationFrame(laco);
  if (falas.titulo) addEventListener("pointerdown", () => falar(falas.titulo), { once: true });

  // ?nivel=2 (ou ?jogar) começa direto, para testes e links do portal
  const params = new URLSearchParams(location.search);
  if (params.has("nivel") || params.has("jogar")) queueMicrotask(() => comecar(Number(params.get("nivel")) || 1));

  return {
    palco, pausa, controle,
    get estado() { return estado; },
    get nivel() { return nivel; },
    get pausado() { return pausa.ativa; },
    placar(html) { placar.innerHTML = html; },
    aviso, vencer, confete, falar, sair,
    voltarAoInicio: irParaAbertura,
    focarPrimeiro: () => moverFoco(palco, 0, 0),
  };
}

// Grade que cabe na tela: escolhe o número de colunas que deixa os itens maiores.
// aspecto = largura / altura de cada item. Recalcula sozinha quando a tela muda.
// colunas: número fixo de colunas (ex.: grade de letras); reservar: px a descontar da altura do pai.
export function ajustarGrade(grade, n, { aspecto = 0.78, folga = 10, maxLado = 220, colunas = null, reservar = 0, reservarLargura = 0 } = {}) {
  const calcular = () => {
    const pai = grade.parentElement;
    const cs = getComputedStyle(pai);
    const W = pai.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - reservarLargura;
    const H = pai.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - (grade.dataset.reservar ? Number(grade.dataset.reservar) : reservar);
    let melhor = { w: 0, cols: 1 };
    for (let cols = colunas ?? 1; cols <= (colunas ?? n); cols++) {
      const linhas = Math.ceil(n / cols);
      const w = Math.min((W - folga * (cols - 1)) / cols, ((H - folga * (linhas - 1)) / linhas) * aspecto, maxLado * aspecto);
      if (w > melhor.w) melhor = { w, cols };
    }
    grade.style.display = "grid";
    grade.style.gap = `${folga}px`;
    grade.style.gridTemplateColumns = `repeat(${melhor.cols}, ${Math.floor(melhor.w)}px)`;
    grade.style.setProperty("--lado", `${Math.floor(melhor.w)}px`);
  };
  calcular();
  const ro = new ResizeObserver(calcular);
  ro.observe(grade.parentElement);
  return () => ro.disconnect();
}
