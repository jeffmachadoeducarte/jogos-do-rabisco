// Rabiscolândia: o Álbum de figurinhas na tela. O app "Álbum" do Rabifone (páginas, contagem "x de y", figurinha em tamanho
// grande), o "cartão voando" quando chega figurinha nova (com som 8-bit original) e as falas da anfitriã, que são só duas:
// na primeira figurinha de todas e ao completar uma página. Parceiros e pessoas de verdade não falam.
// O estado fica em album.js; os desenhos, em album-arte.js. Tudo aqui é DOM (não entra na conta de chamadas de desenho do 3D).
//
//   const U = criarAlbumUI({ caixa, salvo, salvar, ganhar, falar, aguardarFim, contador: () => contadorMoedas, confete, hoje });
//   U.montar(tela, lista, { botao }) (chamado pelo Rabifone)      U.visitou(lugarId) · U.missao(id) · U.bau()      U.album (o estado)
import { criarAlbum } from "./album.js";
import { PAGINAS, FIGURINHAS, RARIDADES, BONUS_PAGINA } from "./album-dados.js";
import { desenharFigurinha, TAMANHO } from "./album-arte.js";
import { tocar8bit } from "../../src/motor/rabiscoins-ui.js";

const hz = (semi) => 440 * 2 ** (semi / 12);
// figurinha nova: três notinhas subindo e um "plim" no fim (a raridade mais alta ganha mais um degrau)
export function somFigurinha(estrelas = 1) {
  const n = [hz(12), hz(16), hz(19)].map((f, i) => [f, i * 0.08, 0.09, "square", 0.05]);
  n.push([hz(24), 0.26, 0.3, "square", 0.045], [hz(0), 0, 0.26, "triangle", 0.1]);
  if (estrelas >= 3) n.push([hz(28), 0.4, 0.34, "square", 0.04], [hz(31), 0.5, 0.4, "square", 0.04]);
  tocar8bit(n);
}
// página completa: fanfarrinha curta
export function somPagina() {
  const n = [hz(7), hz(12), hz(16), hz(19), hz(24)].map((f, i) => [f, i * 0.1, 0.12, "square", 0.05]);
  n.push([hz(28), 0.52, 0.5, "square", 0.045], [hz(16), 0.52, 0.5, "square", 0.03], [hz(-5), 0.52, 0.5, "triangle", 0.12]);
  tocar8bit(n);
}

const FALAS = { primeira: "rp-album-primeira", pagina: (id) => `rp-album-pagina-${id}` };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let estiloPronto = false;
function estilo() {
  if (estiloPronto || typeof document === "undefined") return;
  estiloPronto = true;
  const s = document.createElement("style");
  s.dataset.album = "";
  s.textContent = `
.alb-resumo { margin: 0 0 6px; }
.alb-abas { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
.alb-abas .rf-item { display: flex; flex-direction: column; align-items: center; gap: 0; padding: 4px 2px; font-size: 13px; line-height: 1.1; border-width: 3px; border-radius: 14px; box-shadow: 0 3px 0 var(--tinta); }
.alb-abas .rf-item small { font-size: 12px; font-weight: 800; opacity: .75; }
.alb-abas .rf-item.atual { background: #fff3b0; }
.alb-abas .rf-item.completa small { color: #1c7a1c; opacity: 1; }
.alb-grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 8px; }
.alb-fig { padding: 0; border: 0; background: none; cursor: pointer; border-radius: 12px; line-height: 0; }
.alb-fig canvas { width: 100%; height: auto; display: block; filter: drop-shadow(0 3px 0 rgba(0,0,0,.35)); }
.alb-fig.falta canvas { opacity: .85; }
.alb-fig.rf-foco, .alb-fig:focus-visible { outline: 5px solid var(--amarelo); outline-offset: 2px; transform: scale(1.05); }
.alb-detalhe { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.alb-detalhe canvas { width: min(100%, 220px); height: auto; filter: drop-shadow(0 4px 0 rgba(0,0,0,.35)); }
.alb-detalhe .alb-texto { margin: 0; background: #fff; border: 3px solid var(--tinta); border-radius: 14px; padding: 6px 10px; font-weight: 800; }
.alb-completa { background: #d8f5c8; border: 3px solid var(--tinta); border-radius: 14px; padding: 4px 8px; margin: 0 0 8px; font-weight: 800; font-size: 13px; }
.alb-voa { position: absolute; z-index: 40; left: 0; top: 0; pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.alb-voa canvas { width: 132px; height: 185px; filter: drop-shadow(0 6px 0 rgba(0,0,0,.35)); }
.alb-voa b { font: 800 22px var(--texto); color: #fff; -webkit-text-stroke: 5px #151515; paint-order: stroke fill; text-align: center; white-space: nowrap; }
.alb-voa.pagina b { color: #ffe36a; }
@media (max-height: 520px) {
  .alb-abas { gap: 4px; margin-bottom: 5px; } .alb-abas .rf-item { font-size: 11px; padding: 2px 1px; } .alb-abas .rf-item small { font-size: 10px; }
  .alb-grade { grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 6px; }
  .alb-dica { display: none; }
  .alb-voa canvas { width: 96px; height: 134px; } .alb-voa b { font-size: 17px; -webkit-text-stroke-width: 4px; }
  .rf-tela[data-app="album"] { padding: 8px; } .rf-tela[data-app="album"] h3 { font-size: 16px; margin-bottom: 3px; }
  .rf-tela[data-app="album"] p { font-size: 11px; margin-bottom: 4px; }
  .alb-detalhe canvas { width: min(100%, 130px); }
}
html.modo-tv .alb-voa canvas { width: 170px; height: 238px; }
`;
  document.head.append(s);
}

export function criarAlbumUI({ caixa, salvo, salvar, ganhar, falar, aguardarFim, contador, confete, hoje = () => "" }) {
  estilo();
  const album = criarAlbum({ salvo, salvar, ganhar });
  const fila = []; let rodando = false;
  const reduz = () => matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const cartao = (fig, tem = true, largura = TAMANHO.w) => {
    const c = document.createElement("canvas");
    c.width = largura; c.height = Math.round(largura * TAMANHO.h / TAMANHO.w);
    desenharFigurinha(c.getContext("2d"), fig, { tem, w: c.width, h: c.height });
    return c;
  };

  // ---------------------------------------------------------------- o app do Rabifone
  let aba = "parceiros";
  function montar(tela, lista, { botao }) {
    lista.replaceChildren();
    const resumo = document.createElement("p"); resumo.className = "alb-resumo";
    const abas = document.createElement("div"); abas.className = "alb-abas"; abas.setAttribute("role", "tablist");
    const corpo = document.createElement("div");
    lista.append(resumo, abas, corpo);
    const todas = () => `Figurinhas: <b>${FIGURINHAS.filter((f) => album.tem(f.id)).length} de ${FIGURINHAS.length}</b>.<span class="alb-dica"> Ganhe visitando lugares e lojas, concluindo missões e abrindo o presente do dia!</span>`;
    function pintarAbas() {
      abas.replaceChildren();
      for (const P of PAGINAS) {
        const c = album.contagem(P.id);
        const b = botao(`<span>${P.icone} ${P.curto ?? P.nome}</span><small>${c.tem} de ${c.total}${c.tem === c.total ? " ✅" : ""}</small>`, () => { aba = P.id; pintar(); b.focus?.(); }, `alb-aba${aba === P.id ? " atual" : ""}${c.tem === c.total ? " completa" : ""}`);
        b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(aba === P.id)); b.dataset.pagina = P.id;
        abas.append(b);
      }
    }
    function pintar() {
      resumo.innerHTML = todas();
      pintarAbas();
      const P = PAGINAS.find((p) => p.id === aba), c = album.contagem(P.id);
      corpo.replaceChildren();
      const cab = document.createElement("p"); cab.className = c.tem === c.total ? "alb-completa" : "";
      cab.innerHTML = c.tem === c.total ? `⭐ Página completa! <span data-pag-contagem>${c.tem} de ${c.total}</span>` : `<b>${P.icone} ${P.nome}:</b> <span data-pag-contagem>${c.tem} de ${c.total}</span>`;
      corpo.append(cab);
      const grade = document.createElement("div"); grade.className = "alb-grade"; grade.dataset.pagina = P.id;
      for (const f of P.figs) {
        const tem = album.tem(f.id);
        const b = botao("", () => detalhe(f), `alb-fig${tem ? " tem" : " falta"}`);
        b.classList.remove("rf-item");
        b.dataset.fig = f.id; b.setAttribute("aria-label", tem ? `${f.nome}, ${f.sub}` : `Figurinha que falta: ${f.nome}. ${f.dica}`);
        b.append(cartao(f, tem, 160));
        grade.append(b);
      }
      corpo.append(grade);
    }
    function detalhe(f) {
      const tem = album.tem(f.id);
      corpo.replaceChildren(); abas.hidden = true; resumo.hidden = true;
      const d = document.createElement("div"); d.className = "alb-detalhe";
      d.append(cartao(f, tem, 260));
      const t = document.createElement("p"); t.className = "alb-texto";
      t.textContent = !tem ? f.dica : f.texto ? `${f.texto} (${f.sub})` : `${f.nome} · ${f.sub}`;
      const v = botao(`<span class="rf-emoji">◀</span>Voltar ao álbum`, () => { abas.hidden = false; resumo.hidden = false; pintar(); tela.querySelector(`[data-fig="${f.id}"]`)?.focus?.(); });
      d.append(t, v); corpo.append(d);
      v.focus?.();
    }
    pintar();
  }

  // ---------------------------------------------------------------- figurinha nova: o cartão voa, toca o som e a anfitriã fala
  function alvoDoVoo() {
    const fone = document.querySelector(".rp-fone");
    const el = fone && fone.offsetParent !== null ? fone : document.querySelector(".rbc-contador");
    const cx = caixa.getBoundingClientRect();
    if (!el) return { x: cx.width - 60, y: 50 };
    const r = el.getBoundingClientRect();
    return { x: r.left - cx.left + r.width / 2, y: r.top - cx.top + r.height / 2 };
  }
  async function esperarFala() {
    for (let i = 0; i < 8; i++) { if (!(await aguardarFim().catch(() => false))) break; await espera(350); }
  }
  async function mostrar(r) {
    const R = RARIDADES[r.fig.raridade];
    somFigurinha(R.estrelas);
    const el = document.createElement("div"); el.className = "alb-voa"; el.dataset.fig = r.fig.id;
    el.append(cartao(r.fig, true, 200));
    const rot = document.createElement("b"); rot.textContent = r.primeira ? "Sua primeira figurinha!" : "Figurinha nova!"; el.append(rot);
    const cx = caixa.getBoundingClientRect(), W = cx.width, H = cx.height, alvo = alvoDoVoo();
    const x0 = W / 2, y0 = H * 0.46;
    el.style.left = `${x0}px`; el.style.top = `${y0}px`;
    caixa.append(el);
    const ate = () => { el.remove(); };
    if (reduz() || !el.animate) { el.style.transform = "translate(-50%, -50%)"; await espera(1800); ate(); }
    else {
      const dx = alvo.x - x0, dy = alvo.y - y0;
      const a = el.animate([
        { transform: "translate(-50%, 40%) scale(.2) rotate(-12deg)", opacity: 0 },
        { transform: "translate(-50%, -50%) scale(1.12) rotate(4deg)", opacity: 1, offset: 0.2 },
        { transform: "translate(-50%, -50%) scale(1) rotate(0deg)", opacity: 1, offset: 0.34 },
        { transform: "translate(-50%, -50%) scale(1) rotate(0deg)", opacity: 1, offset: 0.7 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.12) rotate(18deg)`, opacity: 0.2 },
      ], { duration: 2600, easing: "ease-in-out", fill: "forwards" });
      await Promise.race([a.finished.catch(() => 0), espera(6000)]); // 6 s: só para não ficar preso se a animação não terminar
      ate();
    }
    if (r.pagina) {
      somPagina(); confete?.();
      contador()?.ganhou(r.pagina.bonus, { rotulo: "📒 Página!" });
    }
  }
  // roda uma figurinha por vez; a fala (se houver) espera a anfitriã terminar o que estiver dizendo
  async function rodar() {
    if (rodando) return; rodando = true;
    try {
      while (fila.length) {
        const { r, atraso, calada } = fila.shift();
        if (atraso) await espera(atraso);
        // figurinha que vem da missão: fica calada (o cartão voa igual); a fala da conclusão, o versículo e a propaganda
        // tocam em fila e nada pode entrar no meio nem depois delas
        const fala = calada ? null : r.pagina ? FALAS.pagina(r.pagina.id) : r.primeira ? FALAS.primeira : null;
        await mostrar(r);
        if (fala) { await esperarFala(); falar?.(fala); }
      }
    } finally { rodando = false; }
  }
  // resultados de album.ganhar(): só as novas entram na fila
  function chegou(lista, atraso = 0, calada = false) {
    for (const r of lista) if (r?.nova) fila.push({ r, atraso, calada });
    if (fila.length) rodar();
  }
  return {
    album, montar, chegou,
    visitou: (lugarId) => chegou(album.visitou(lugarId), 600),
    missao: (id) => chegou(album.missao(id), 3200, true),
    // o baú do dia: uma figurinha surpresa (depois da animação do baú e do ganho de moedas)
    bau: () => { const id = album.surpresa(hoje()); if (id) chegou([album.ganhar(id)], 3000); },
    get emFila() { return fila.length + (rodando ? 1 : 0); },
    BONUS_PAGINA,
  };
}
