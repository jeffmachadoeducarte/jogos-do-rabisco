// Banda do Rabisco (1,5 a 5 anos): música e ritmo. O Rabisco toca uma sequência no xilofone,
// no tambor e no sino; a criança ouve e repete na mesma ordem. A sequência cresce a cada acerto.
// Errar não pune: o Rabisco só toca de novo. Na fase 9 a sequência vira "Brilha, brilha estrelinha".

import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar, preCarregarFalas } from "../../src/motor/voz.js";
import { instrumentos } from "./notas.js";

const RAIZ = "../..";
// teclas do xilofone: índice na escala Dó5..Dó6 (ver notas.js), com cor e nome
const TECLAS = [
  { nome: "Dó", cor: "#e63946" }, { nome: "Ré", cor: "#ff7a00" }, { nome: "Mi", cor: "#ffcc1f" }, { nome: "Fá", cor: "#1fc08e" },
  { nome: "Sol", cor: "#00b5f0" }, { nome: "Lá", cor: "#1d6fe0" }, { nome: "Si", cor: "#8e6cff" }, { nome: "Dó", cor: "#ec2e8c" },
];
const EXTRAS = {
  tambor: { emoji: "🥁", nome: "Tambor", cor: "#ffb15c" },
  sino: { emoji: "🔔", nome: "Sino", cor: "#ffe27a" },
  chocalho: { emoji: "🪇", nome: "Chocalho", cor: "#9be7c4" },
};
// "Brilha, brilha estrelinha" (domínio público): Dó Dó Sol Sol Lá Lá Sol | Fá Fá Mi Mi Ré Ré Dó
const BRILHA = [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0];

// ritmo: ms entre as notas do Rabisco; cena: cenário (estilo.css)
const FASES = [
  { nome: "Sala de música", teclas: [0, 4], extras: [], min: 1, max: 2, meta: 4, ritmo: 950, cena: "sala" },
  { nome: "No quintal", teclas: [0, 2, 4], extras: [], min: 1, max: 3, meta: 5, ritmo: 900, cena: "quintal" },
  { nome: "Festa com tambor", teclas: [0, 2, 4], extras: ["tambor"], min: 1, max: 3, meta: 5, ritmo: 850, cena: "festa" },
  { nome: "Parquinho", teclas: [0, 2, 4, 5], extras: [], min: 2, max: 4, meta: 5, ritmo: 800, cena: "parque" },
  { nome: "Jardim florido", teclas: [0, 2, 4, 5], extras: ["tambor"], min: 2, max: 4, meta: 5, ritmo: 700, cena: "jardim" },
  { nome: "Pôr do sol", teclas: [0, 1, 2, 4, 5], extras: [], min: 2, max: 5, meta: 5, ritmo: 680, cena: "tarde" },
  { nome: "Circo", teclas: [0, 1, 2, 4, 5], extras: ["tambor", "sino"], min: 2, max: 5, meta: 5, ritmo: 650, cena: "circo" },
  { nome: "Teatro", teclas: [0, 1, 2, 3, 4, 5], extras: [], min: 3, max: 6, meta: 5, ritmo: 560, cena: "teatro" },
  { nome: "Cantiga", teclas: [0, 1, 2, 3, 4, 5, 6], extras: [], ritmo: 620, cena: "noite", fala: "bd-cantiga",
    // a melodia em partes: a criança aprende o começo e vai juntando
    melodias: [[0, 0, 4, 4], [0, 0, 4, 4, 5, 5, 4], [3, 3, 2, 2], [3, 3, 2, 2, 1, 1, 0], [0, 0, 4, 4, 5, 5, 4]] },
  { nome: "Show da banda", teclas: [0, 1, 2, 3, 4, 5, 6, 7], extras: ["tambor"], min: 3, max: 7, meta: 6, ritmo: 480, cena: "palco", fala: "bd-show",
    final: [0, 0, 4, 4, 5, 5, 4] },
];
FASES.forEach((f) => { if (f.melodias) f.meta = f.melodias.length; });

const jogo = criarCasca({
  titulo: "Banda do Rabisco",
  sub: "Ouça a música e toque igual!",
  faixa: "bem-pequenos",
  cor: "#FF5FA2",
  niveis: FASES.map((f, i) => ({ nome: `${i + 1}`, desc: f.nome })),
  dica: { teclado: "Setas e Enter (ou números 1 a 9) para tocar", toque: "Ouça o Rabisco e toque os instrumentos", controle: "Direcional para escolher · A para tocar" },
  falas: { titulo: "bd-titulo", vitoria: "bd-vitoria" },
  menuNoJogo: true,
  teclado: true,
  aoComecar: montar,
  aoSair: () => { clearTimeout(timer); pendente = null; },
  aoPausar: () => clearTimeout(timer),
  aoContinuar: () => { if (pendente) agendar(pendente.fn, pendente.ms); },
});
preCarregarFalas(["bd-ouca", "bd-sua-vez", "bd-isso", "bd-muito-bem", "bd-lindo", "bd-de-novo", "bd-cantiga", "bd-show", "bd-gratidao"]);

let fase = FASES[0], pecas = [], botoes = [], seq = [], pos = 0, rodada = 0, erros = 0;
let modo = "ouvindo"; // ouvindo | vez | espera
let timer = null, pendente = null;
let balao = null, rabisco = null, progresso = null, lado = null;

// Um único timer por vez: a pausa guarda o próximo passo e o retoma ao continuar
function agendar(fn, ms) {
  clearTimeout(timer);
  pendente = { fn, ms };
  if (jogo.pausado) return;
  timer = setTimeout(() => { pendente = null; fn(); }, ms);
}

function montar(n) {
  fase = FASES[n - 1];
  clearTimeout(timer); pendente = null;
  seq = []; pos = 0; rodada = 0; erros = 0; modo = "ouvindo";
  instrumentos.destravar();
  jogo.palco.dataset.cena = fase.cena;
  jogo.palco.classList.add("banda");

  pecas = [...fase.teclas.map((t) => ({ tipo: "tecla", nota: t })), ...fase.extras.map((x) => ({ tipo: x }))];
  const xilo = el("div", { class: "xilofone", style: `--n:${fase.teclas.length}` }, [el("div", { class: "trilho cima" }), el("div", { class: "trilho baixo" })]);
  const extras = el("div", { class: "bd-extras" });
  botoes = pecas.map((p, i) => {
    let b;
    if (p.tipo === "tecla") {
      const t = TECLAS[p.nota];
      // teclas mais agudas são mais curtas, como num xilofone de verdade
      const alt = 100 - (p.nota / 7) * 34;
      b = el("button", { class: "bd-tecla", style: `--c:${t.cor};--alt:${alt}%`, "aria-label": `Tecla ${t.nome}`, html: `<i class="prego"></i><span class="num">${i + 1}</span><i class="prego"></i>` });
      xilo.append(b);
    } else {
      const x = EXTRAS[p.tipo];
      b = el("button", { class: `bd-inst ${p.tipo}`, style: `--c:${x.cor}`, "aria-label": x.nome, html: `<span class="emo">${x.emoji}</span><span class="rot">${x.nome}</span><span class="num">${i + 1}</span>` });
      extras.append(b);
    }
    b.addEventListener("click", () => apertar(i));
    return b;
  });

  balao = el("div", { class: "bd-balao", "aria-live": "polite", texto: "Ouça..." });
  rabisco = el("img", { class: "bd-rabisco", src: `${RAIZ}/assets/rabisco/poses/apresentando.png`, alt: "Rabisco" });
  progresso = el("div", { class: "bd-progresso", "aria-hidden": "true" }, Array.from({ length: fase.meta }, () => el("span", { texto: "♪" })));
  const repetir = el("button", { class: "bd-repetir", "aria-label": "Ouvir de novo", html: "🔁 <span>Ouvir</span>", onclick: () => { if (modo === "vez") ouvir(400); } });
  lado = el("div", { class: "bd-lado" }, [progresso, el("div", { class: "instrumentos" }, [xilo, extras.childElementCount ? extras : ""].filter(Boolean)), repetir]);

  jogo.palco.append(
    cenario(fase.cena),
    el("img", { class: "logo-jogo", src: `${RAIZ}/assets/marca/logos/azul-icone-rosa.png`, alt: "Educarte" }),
    el("div", { class: "cena-banda" }, [el("div", { class: "bd-rabisco-box" }, [balao, rabisco]), lado]),
  );
  placar();
  if (fase.fala) falar(fase.fala); else falar("bd-ouca");
  agendar(novaRodada, fase.fala ? 2600 : 1500);
}

// Decoração do fundo: notas flutuando, cortinas, estrelas, holofotes e enfeites conforme a cena
function cenario(cena) {
  const c = el("div", { class: "bd-cenario", "aria-hidden": "true" });
  c.append(el("div", { class: "chao" }));
  if (["sala", "teatro", "palco", "circo"].includes(cena)) c.append(el("div", { class: "cortina esq" }), el("div", { class: "cortina dir" }), el("div", { class: "sanefa" }));
  if (["festa", "circo", "palco"].includes(cena)) c.append(el("div", { class: "bandeirinhas" }));
  if (cena === "palco") for (let i = 0; i < 3; i++) c.append(el("div", { class: `holofote h${i}` }));
  if (["noite", "palco", "teatro"].includes(cena)) for (let i = 0; i < 18; i++) {
    const s = el("span", { class: "estrela", texto: "✦" });
    s.style.cssText = `left:${(i * 37) % 100}%;top:${4 + ((i * 53) % 40)}%;animation-delay:${(i % 6) * 0.4}s`;
    c.append(s);
  }
  const enfeites = { quintal: "☀️ ☁️ 🌳", parque: "☁️ 🎈 🌳", jardim: "🌻 🌷 🦋", tarde: "🌅 🐦 ☁️", noite: "🌙", festa: "🎈 🎉" }[cena];
  if (enfeites) enfeites.split(" ").forEach((e, i) => c.append(el("span", { class: `enfeite e${i}`, texto: e })));
  for (let i = 0; i < 7; i++) {
    const nt = el("span", { class: "nota-voa", texto: ["♪", "♫", "♩", "♬"][i % 4] });
    nt.style.cssText = `left:${6 + i * 14}%;animation-delay:${i * 1.1}s;animation-duration:${7 + (i % 3)}s`;
    c.append(nt);
  }
  return c;
}

function placar() {
  jogo.placar(`🎵 ${rodada}/${fase.meta}`);
  [...progresso.children].forEach((s, i) => s.classList.toggle("cheia", i < rodada));
}

const sorteia = () => Math.floor(Math.random() * pecas.length);
function novaRodada() {
  if (rodada >= fase.meta) { fimDeFase(); return; }
  if (fase.melodias) seq = fase.melodias[rodada].slice();
  else if (fase.final && rodada === fase.meta - 1) seq = fase.final.slice();
  else {
    // comprimento sobe do mínimo ao máximo ao longo da fase; se cresce, a sequência ganha notas no fim
    const len = Math.round(fase.min + ((fase.max - fase.min) * rodada) / Math.max(1, fase.meta - 1));
    if (len <= seq.length) seq = [];
    while (seq.length < len) {
      let p = sorteia();
      // evita a mesma peça três vezes seguidas (fica sem graça)
      while (pecas.length > 1 && seq.length >= 2 && seq.at(-1) === p && seq.at(-2) === p) p = sorteia();
      seq.push(p);
    }
  }
  ouvir(600);
}

// O Rabisco toca a sequência; nesse tempo a criança só ouve
function ouvir(atraso) {
  modo = "ouvindo"; pos = 0;
  balao.textContent = "Ouça... 👂";
  lado.classList.remove("sua-vez");
  rabisco.classList.add("canta");
  const passo = (k) => {
    if (k >= seq.length) { suaVez(); return; }
    acender(seq[k]);
    agendar(() => passo(k + 1), fase.ritmo);
  };
  agendar(() => passo(0), atraso);
}

function suaVez() {
  modo = "vez"; pos = 0;
  rabisco.classList.remove("canta");
  balao.textContent = "Sua vez! 👆";
  lado.classList.add("sua-vez");
  if (rodada === 0 && erros === 0) falar("bd-sua-vez");
}

function acender(i) {
  const b = botoes[i], p = pecas[i];
  if (p.tipo === "tecla") instrumentos.tecla(p.nota); else instrumentos[p.tipo]();
  b.classList.remove("toca"); void b.offsetWidth;
  b.classList.add("toca");
  setTimeout(() => b.classList.remove("toca"), Math.min(420, fase.ritmo * 0.7));
  // notinha que sai voando do instrumento
  const r = b.getBoundingClientRect();
  const nt = el("span", { class: "nota-sai", texto: ["♪", "♫"][i % 2] });
  nt.style.cssText = `left:${r.x + r.width / 2}px;top:${r.y + 10}px;color:${p.tipo === "tecla" ? TECLAS[p.nota].cor : "#fff"}`;
  document.body.append(nt);
  setTimeout(() => nt.remove(), 900);
}

const ACERTOS = ["bd-isso", "bd-muito-bem", "bd-lindo"];
function apertar(i) {
  if (jogo.estado !== "jogando" || jogo.pausado) return;
  if (modo !== "vez") { if (modo === "ouvindo") jogo.aviso("Ouça... 👂", "", 900); return; }
  acender(i);
  if (seq[pos] === i) {
    pos++;
    if (pos < seq.length) return;
    modo = "espera";
    rodada++;
    placar();
    lado.classList.remove("sua-vez");
    balao.textContent = "Isso! 🎉";
    rabisco.classList.remove("pula"); void rabisco.offsetWidth; rabisco.classList.add("pula");
    setTimeout(() => sons.moeda(), 250);
    jogo.aviso("Isso!", "bom", 1200);
    falar(ACERTOS[(rodada - 1) % ACERTOS.length]);
    agendar(novaRodada, 1700);
  } else {
    modo = "espera";
    erros++;
    const b = botoes[i];
    b.classList.remove("balanca"); void b.offsetWidth; b.classList.add("balanca");
    setTimeout(() => sons.erro(), 150);
    lado.classList.remove("sua-vez");
    balao.textContent = "De novo! 🔁";
    jogo.aviso("Ops! Ouça de novo", "", 1400);
    falar("bd-de-novo");
    agendar(() => ouvir(300), 1900);
  }
}

function fimDeFase() {
  const n = jogo.nivel;
  const estrelas = erros === 0 ? 3 : erros <= 2 ? 2 : 1;
  const nome = window.Familia?.crianca?.()?.nome;
  const fechar = () => {
    const gratidao = n === 5 || n === 10;
    jogo.vencer({
      titulo: nome ? `Muito bem, ${nome}!` : "Muito bem!",
      estrelas,
      texto: gratidao ? "Que alegria cantar e agradecer a Deus pela música! 🎶"
        : n === 9 ? "Você tocou Brilha, brilha estrelinha! ⭐" : `Você tocou ${fase.meta} músicas iguaizinhas! 🎶`,
      fala: gratidao ? "bd-gratidao" : "bd-vitoria",
    });
  };
  // na cantiga, o Rabisco toca a música inteira para comemorar antes da vitória
  if (fase.melodias) {
    modo = "espera";
    balao.textContent = "Escute a música toda! ⭐";
    rabisco.classList.add("canta");
    const passo = (k) => {
      if (k >= BRILHA.length) { rabisco.classList.remove("canta"); fechar(); return; }
      acender(BRILHA[k]);
      agendar(() => passo(k + 1), k % 7 === 6 ? 760 : 380);
    };
    agendar(() => passo(0), 600);
  } else fechar();
}

// teclas 1..9 tocam a peça correspondente (na ordem em que aparecem na tela)
addEventListener("keydown", (e) => {
  if (jogo.estado !== "jogando" || jogo.pausado) return;
  const k = Number(e.key);
  if (k >= 1 && k <= pecas.length) { e.preventDefault(); apertar(k - 1); }
});

if (new URLSearchParams(location.search).has("teste")) {
  window.teste = {
    jogo,
    sequencia: () => seq.slice(),
    tocar: (i) => apertar(i),
    get modo() { return modo; },
    get erros() { return erros; },
    // pula a escuta e toca a sequência inteira certa
    repetirCerto() {
      clearTimeout(timer); pendente = null;
      if (!seq.length) return false;
      suaVez();
      for (const p of seq.slice()) apertar(p);
      return true;
    },
  };
}
