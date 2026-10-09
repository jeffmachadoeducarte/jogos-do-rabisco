// Caça-Palavras (6 a 8 anos): ache as palavras escondidas na grade. Toque na primeira e na última
// letra (ou arraste o dedo por cima delas). Nível 1: só na horizontal; nível 2: também na vertical;
// nível 3: também na diagonal. Temas da escola e da natureza.

import { criarCasca, el, ajustarGrade } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

const NIVEIS = [
  { nome: "Nível 1", desc: "Na escola · ➡️", lado: 7, direcoes: [[1, 0]], palavras: ["BOLA", "LIVRO", "SALA", "LUPA", "COLA", "GIZ", "MESA", "PAPEL"], quantas: 5 },
  { nome: "Nível 2", desc: "Material · ➡️ ⬇️", lado: 8, direcoes: [[1, 0], [0, 1]], palavras: ["ESCOLA", "MOCHILA", "CADERNO", "CANETA", "TESOURA", "BORRACHA", "ESTOJO", "PINCEL"], quantas: 6 },
  { nome: "Nível 3", desc: "Natureza · ➡️ ⬇️ ↘️", lado: 10, direcoes: [[1, 0], [0, 1], [1, 1]], palavras: ["FLORESTA", "CACHOEIRA", "MONTANHA", "OCEANO", "PLANETA", "ESTRELA", "BORBOLETA", "JARDIM", "NUVEM", "SEMENTE"], quantas: 7 },
];
const LETRAS = "ABCDEFGHIJLMNOPQRSTUVXZ";
let grade = [], celulas = [], palavras = [], achadas = new Set(), inicio = null, arrastando = false, lado = 0, soltar = null;

const jogo = criarCasca({
  titulo: "Caça-Palavras",
  sub: "Ache as palavras escondidas!",
  faixa: "alfabetizacao",
  cor: "#00B5F0",
  niveis: NIVEIS,
  dica: { teclado: "Setas para andar · Enter na primeira e na última letra", toque: "Toque na primeira e na última letra (ou arraste)", controle: "Direcional para andar · A na primeira e na última letra" },
  falas: { titulo: "cp2-titulo", vitoria: "cp2-vitoria" },
  aoComecar: montar,
});

const embaralhar = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// coloca as palavras na grade (tenta de novo até caber todas)
function gerar(cfg) {
  for (let t = 0; t < 300; t++) {
    const g = Array.from({ length: cfg.lado }, () => Array(cfg.lado).fill(""));
    const escolhidas = embaralhar(cfg.palavras.filter((p) => p.length <= cfg.lado)).slice(0, cfg.quantas).sort((a, b) => b.length - a.length);
    const postas = [];
    let ok = true;
    for (const p of escolhidas) {
      let colocou = false;
      for (let k = 0; k < 200 && !colocou; k++) {
        const [dx, dy] = cfg.direcoes[Math.floor(Math.random() * cfg.direcoes.length)];
        const x0 = Math.floor(Math.random() * (cfg.lado - dx * (p.length - 1)));
        const y0 = Math.floor(Math.random() * (cfg.lado - dy * (p.length - 1)));
        if ([...p].every((c, i) => [c, ""].includes(g[y0 + dy * i][x0 + dx * i]))) {
          [...p].forEach((c, i) => { g[y0 + dy * i][x0 + dx * i] = c; });
          postas.push({ p, x0, y0, dx, dy });
          colocou = true;
        }
      }
      if (!colocou) { ok = false; break; }
    }
    if (!ok) continue;
    for (const linha of g) for (let x = 0; x < linha.length; x++) if (!linha[x]) linha[x] = LETRAS[Math.floor(Math.random() * LETRAS.length)];
    return { g, postas };
  }
  throw new Error("não coube");
}

function montar(n) {
  const cfg = NIVEIS[n - 1];
  lado = cfg.lado;
  const { g, postas } = gerar(cfg);
  grade = g; palavras = postas; achadas = new Set(); inicio = null;
  const mesa = el("div", { class: "mesa-palavras" });
  const quadro = el("div", { class: "quadro-letras" });
  const tab = el("div", { class: "letras", role: "grid", "aria-label": "Grade de letras" });
  celulas = [];
  g.forEach((linha, y) => linha.forEach((c, x) => {
    const b = el("button", { class: "letra", texto: c, "aria-label": `${c}, linha ${y + 1}, coluna ${x + 1}` });
    b.dataset.x = x; b.dataset.y = y;
    // dedo/mouse: aperta numa letra e solta em outra (ou toca uma e depois a outra)
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.releasePointerCapture?.(e.pointerId); escolher(b); arrastando = true; });
    b.addEventListener("pointerenter", () => { if (arrastando && inicio) marcarCaminho(inicio, b); });
    b.addEventListener("click", (e) => { if (e.detail === 0) escolher(b); }); // controle e teclado
    tab.append(b);
    celulas.push(b);
  }));
  quadro.append(tab);
  const lista = el("ul", { class: "lista-palavras", "aria-label": "Palavras para achar" });
  for (const p of postas) lista.append(el("li", { texto: p.p, "data-p": p.p }));
  mesa.append(quadro, lista);
  jogo.palco.append(mesa);
  soltar?.();
  soltar = ajustarGrade(tab, lado * lado, { aspecto: 1, folga: 4, maxLado: 60, colunas: lado, reservar: 34, reservarLargura: 34 });
  atualizarPlacar();
  falar("cp2-inicio");
}
addEventListener("pointerup", (e) => {
  if (!arrastando) return;
  arrastando = false;
  const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest(".letra");
  if (alvo && inicio && alvo !== inicio) escolher(alvo);
});

const cel = (x, y) => celulas[y * lado + x];
function caminho(a, b) {
  const x0 = +a.dataset.x, y0 = +a.dataset.y, x1 = +b.dataset.x, y1 = +b.dataset.y;
  const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  if (!(x0 === x1 || y0 === y1 || Math.abs(x1 - x0) === Math.abs(y1 - y0))) return null; // só em linha reta
  return Array.from({ length: n + 1 }, (_, i) => cel(x0 + dx * i, y0 + dy * i));
}
function marcarCaminho(a, b) {
  for (const c of celulas) c.classList.remove("caminho");
  for (const c of caminho(a, b) ?? [a]) c.classList.add("caminho");
}

function escolher(b) {
  if (jogo.pausado || jogo.estado !== "jogando") return;
  if (!inicio) { inicio = b; b.classList.add("inicio"); sons.bipe(); return; }
  if (b === inicio) { limparEscolha(); return; }
  const c = caminho(inicio, b);
  const texto = c?.map((x) => x.textContent).join("");
  const achou = c && palavras.find((p) => !achadas.has(p.p) && (p.p === texto || p.p === [...texto].reverse().join("")));
  if (achou) {
    achadas.add(achou.p);
    const cor = ["#ffcc1f", "#9fe08a", "#7fd6ff", "#ffb3d4", "#ffc58a", "#cbb8ff", "#b5f0d8"][achadas.size % 7];
    for (const x of c) { x.classList.add("achada"); x.style.setProperty("--cor-achada", cor); }
    document.querySelector(`.lista-palavras [data-p="${achou.p}"]`).classList.add("riscada");
    sons.letra();
    falar(`cp2-${achou.p.toLowerCase()}`);
    jogo.aviso(achou.p, "bom", 1200);
    atualizarPlacar();
    if (achadas.size === palavras.length) setTimeout(() => jogo.vencer({ estrelas: 3, texto: `Você achou as ${palavras.length} palavras!` }), 900);
  } else if (c) sons.erro();
  limparEscolha();
}
function limparEscolha() {
  inicio = null;
  for (const c of celulas) c.classList.remove("inicio", "caminho");
}
const atualizarPlacar = () => jogo.placar(`🔎 ${achadas.size}/${palavras.length}`);

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, get palavras() { return palavras; }, cel, escolher, get achadas() { return achadas; } };
