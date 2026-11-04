// Tela "Jogar na TV: passo a passo" da ⚙️ (aberta por src/motor/engrenagem.js, vista "guia").
// Detecta o aparelho (iPhone/iPad, Android ou computador) e mostra primeiro o caminho certo; abas para o tipo de TV.
// Funciona com toque, teclado e controle: tudo são <button> (o src/motor/controle.js anda pelos botões do painel).
import { APARELHOS, TVS, DICAS, detectarAparelho, caminho } from "./guia-tv-dados.js";

export const CSS_GUIA = `
.eng-cartao.guia { width: min(900px, 100%); }
.gtv-linha { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.gtv-rotulo { font-weight: 800; font-size: 15px; color: #444; margin-right: 2px; }
.gtv-chip { cursor: pointer; font: 800 clamp(14px, 2vw, 17px) "Baloo 2", system-ui, sans-serif; color: #151515; background: #fff; border: 3px solid #151515;
  border-radius: 999px; padding: 4px 14px 6px; min-height: 44px; box-shadow: 0 3px 0 #151515; }
.gtv-chip[aria-selected="true"], .gtv-chip[aria-pressed="true"] { background: #ffcc1f; }
.gtv-aba[aria-selected="true"] { background: #00b5f0; color: #fff; }
.gtv-chip:active { transform: translateY(2px); box-shadow: 0 1px 0 #151515; }
.gtv-corpo { display: grid; grid-template-columns: 200px 1fr; gap: 14px; align-items: start; }
.gtv-arte { background: #e8f8ff; border: 4px solid #151515; border-radius: 20px; padding: 6px; }
.gtv-arte svg { display: block; width: 100%; height: auto; }
.gtv-corpo h3 { margin: 0 0 6px; font-size: clamp(18px, 2.6vw, 24px); line-height: 1.15; }
.gtv-passos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; counter-reset: p; }
.gtv-passos li { counter-increment: p; position: relative; min-height: 34px; padding: 2px 0 2px 42px; font-weight: 700; font-size: clamp(14px, 1.9vw, 17px); line-height: 1.25; }
.gtv-passos li::before { content: counter(p); position: absolute; left: 0; top: 0; width: 32px; height: 32px; border-radius: 50%; background: #ec2e8c; color: #fff;
  border: 3px solid #151515; font: 900 18px/26px "Baloo 2", system-ui, sans-serif; text-align: center; }
.gtv-aviso { margin-top: 8px; background: #fff3c4; border: 3px dashed #151515; border-radius: 14px; padding: 6px 10px; font-weight: 700; font-size: 15px; }
.gtv-dicas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.gtv-dica { background: #fff8d6; border: 3px solid #151515; border-radius: 16px; padding: 6px 10px 8px; font-size: 14px; font-weight: 700; line-height: 1.2; }
.gtv-dica b { display: block; font-size: 16px; font-weight: 800; }
.gtv-acoes { position: sticky; bottom: -10px; background: #fff; padding: 6px 0 10px; z-index: 2; display: flex; gap: 10px; flex-wrap: wrap; }
.gtv-acoes .eng-grande { width: auto; flex: 1 1 200px; }
@media (max-width: 720px) { .gtv-corpo { grid-template-columns: 1fr; } .gtv-arte { max-width: 220px; } .gtv-dicas { grid-template-columns: 1fr; } }
@media (max-height: 560px) {
  .eng-cartao.guia { gap: 6px; padding: 8px 14px 10px; } .eng-cartao.guia h2 { font-size: 22px; }
  .gtv-rotulo { display: none; } .gtv-linha { gap: 6px; }
  .gtv-corpo { grid-template-columns: 130px 1fr; gap: 10px; } .gtv-passos { gap: 4px; } .gtv-passos li { font-size: 14px; padding-left: 38px; }
  .gtv-dica { font-size: 13px; } .gtv-dica b { font-size: 14px; } .gtv-chip { min-height: 34px; padding: 0 10px 2px; font-size: 14px; box-shadow: 0 2px 0 #151515; }
  .gtv-aviso { font-size: 13px; padding: 4px 8px; } .gtv-corpo h3 { font-size: 18px; }
  .gtv-acoes { bottom: -8px; padding: 4px 0 8px; } .gtv-acoes .eng-grande { min-height: 44px; padding: 0 12px 4px; font-size: 20px; border-width: 3px; }
}
`;

// desenhos simples: celular → ondas → TV (espelhado) ou notebook → cabo → TV
const TV_SVG = `<rect x="86" y="22" width="108" height="68" rx="8" fill="#fff" stroke="#151515" stroke-width="5"/><rect x="96" y="32" width="88" height="48" rx="4" fill="#00b5f0"/><path d="M126 96h28l6 12h-40z" fill="#151515"/><circle cx="140" cy="56" r="10" fill="#ffcc1f" stroke="#151515" stroke-width="3"/>`;
const SVG_ESPELHO = `<svg viewBox="0 0 200 120" role="img" aria-label="Celular mandando a tela para a TV por ondas">
<rect x="10" y="30" width="46" height="62" rx="9" fill="#fff" stroke="#151515" stroke-width="5" transform="rotate(90 33 61)"/><rect x="14" y="46" width="38" height="30" rx="3" fill="#ec2e8c"/>
<path d="M62 52q8 9 0 18M70 46q13 15 0 30" fill="none" stroke="#ff7a00" stroke-width="5" stroke-linecap="round"/>${TV_SVG}</svg>`;
const SVG_CABO = `<svg viewBox="0 0 200 120" role="img" aria-label="Notebook ligado na TV por um cabo">
<rect x="8" y="42" width="52" height="34" rx="4" fill="#fff" stroke="#151515" stroke-width="5"/><rect x="14" y="48" width="40" height="22" rx="2" fill="#ec2e8c"/><path d="M2 82h64l-5 8H7z" fill="#151515"/>
<path d="M62 84q12 24 40 8t-6-28" fill="none" stroke="#ff7a00" stroke-width="5" stroke-linecap="round"/>${TV_SVG}</svg>`;

const h = (tag, props = {}, filhos = []) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "texto") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos) if (f) e.append(f);
  return e;
};

const estado = { aparelho: null, tv: null };

// devolve os elementos da tela. redesenhar(): pede à ⚙️ para montar de novo; voltar/pronto: botões de baixo.
export function montarGuia({ redesenhar, voltar, pronto, botaoGrande }) {
  if (!estado.aparelho) estado.aparelho = detectarAparelho();
  if (!estado.tv) estado.tv = estado.aparelho === "pc" ? "cabo" : "roku";
  const mudar = (k, v) => { estado[k] = v; redesenhar(k === "tv" ? `[data-tv="${v}"]` : `[data-aparelho="${v}"]`); };

  const aparelhos = h("div", { class: "gtv-linha", role: "group", "aria-label": "Qual aparelho você vai usar?" }, [
    h("span", { class: "gtv-rotulo", texto: "Seu aparelho:" }),
    ...APARELHOS.map((a) => h("button", { type: "button", class: "gtv-chip", "data-aparelho": a.id, "aria-pressed": String(estado.aparelho === a.id), texto: `${a.ic} ${a.nome}`, onclick: () => mudar("aparelho", a.id) })),
  ]);
  const abas = h("div", { class: "gtv-linha", role: "tablist", "aria-label": "Tipo de TV" }, TVS.map((t) =>
    h("button", { type: "button", role: "tab", class: "gtv-chip gtv-aba", "data-tv": t.id, "aria-selected": String(estado.tv === t.id), texto: `${t.ic} ${t.nome}`, onclick: () => mudar("tv", t.id) })));

  const c = caminho(estado.tv, estado.aparelho);
  const corpo = h("div", { class: "gtv-corpo", role: "tabpanel" }, [
    h("div", { class: "gtv-arte", html: estado.tv === "cabo" ? SVG_CABO : SVG_ESPELHO }),
    h("div", {}, [
      h("h3", { texto: c.titulo }),
      h("ol", { class: "gtv-passos" }, c.passos.map((p) => h("li", { texto: p }))),
      c.aviso ? h("div", { class: "gtv-aviso", texto: "💡 " + c.aviso }) : null,
    ]),
  ]);
  const dicas = h("div", { class: "gtv-dicas" }, DICAS.map((d) => h("div", { class: "gtv-dica" }, [h("b", { texto: `${d.ic} ${d.titulo}` }), d.texto])));
  const acoes = h("div", { class: "gtv-acoes" }, [
    botaoGrande("✓", "Pronto, jogar!", "", "rosa", pronto, { "data-eng": "ok" }),
    botaoGrande("←", "Voltar", "", "", voltar, { "data-eng": "voltar" }),
  ]);
  return [h("h2", { texto: "📺 Jogar na TV: passo a passo" }), aparelhos, abas, corpo, dicas, acoes];
}
