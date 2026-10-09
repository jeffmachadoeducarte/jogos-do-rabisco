// Memória da Turma (4 e 5 anos): jogo da memória com o Rabisco, a escola, os materiais e os amigos.
// Cada carta virada fala o nome da figura; achar o par faz festa. Menos tentativas, mais estrelas.

import { criarCasca, el, ajustarGrade } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

const RAIZ = "../..";
// fala: assets/voz/mem-<id>.mp3 (ferramentas/gerar_vozes.py)
const FIGURAS = [
  { id: "rabisco", nome: "Rabisco", img: `${RAIZ}/assets/rabisco/poses/frente.png` },
  { id: "escola", nome: "Escola", e: "🏫" },
  { id: "onibus", nome: "Ônibus", e: "🚌" },
  { id: "lapis", nome: "Lápis", e: "✏️" },
  { id: "mochila", nome: "Mochila", e: "🎒" },
  { id: "livro", nome: "Livro", e: "📚" },
  { id: "tesoura", nome: "Tesoura", e: "✂️" },
  { id: "giz", nome: "Giz de cera", e: "🖍️" },
  { id: "maca", nome: "Maçã", e: "🍎" },
  { id: "bola", nome: "Bola", e: "⚽" },
  { id: "regua", nome: "Régua", e: "📏" },
  { id: "pincel", nome: "Pincel", e: "🖌️" },
];
const NIVEIS = [
  { nome: "Nível 1", desc: "3 pares", pares: 3 },
  { nome: "Nível 2", desc: "6 pares", pares: 6 },
  { nome: "Nível 3", desc: "8 pares", pares: 8 },
];

let cartas = [], abertas = [], travado = false, tentativas = 0, achados = 0, total = 0;

const jogo = criarCasca({
  titulo: "Memória da Turma",
  sub: "Ache os pares de figuras!",
  faixa: "pequenos",
  cor: "#8E6CFF",
  niveis: NIVEIS,
  dica: { teclado: "Setas para escolher · Enter para virar · P para pausar", toque: "Toque nas cartas para virar", controle: "Direcional para escolher · A para virar · Start para pausar" },
  falas: { titulo: "mem-titulo", vitoria: "mem-vitoria" },
  aoComecar: montar,
});

function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

let soltarGrade = null;
function montar(n) {
  const { pares } = NIVEIS[n - 1];
  const escolhidas = embaralhar(FIGURAS).slice(0, pares);
  total = pares; achados = 0; tentativas = 0; abertas = []; travado = false;
  soltarGrade?.();
  const mesa = el("div", { class: "mesa" });
  cartas = embaralhar([...escolhidas, ...escolhidas]).map((f, i) => {
    const frente = f.img ? `<img src="${f.img}" alt="">` : f.e;
    const b = el("button", {
      class: "carta", "aria-label": `Carta ${i + 1}`,
      html: `<div class="gira"><div class="face verso"><img src="${RAIZ}/assets/marca/logos/icone-rosa.png" alt=""></div><div class="face frente">${frente}</div></div>`,
      onclick: () => virar(b),
    });
    b.dataset.fig = f.id;
    b.dataset.nome = f.nome;
    mesa.append(b);
    return b;
  });
  jogo.palco.append(mesa);
  soltarGrade = ajustarGrade(mesa, cartas.length, { aspecto: 0.78, folga: 12, maxLado: 230 });
  atualizarPlacar();
  falar(`mem-nivel-${n}`);
  // no começo, mostra todas por um instante (no nível 1, um pouco mais)
  travado = true;
  setTimeout(() => cartas.forEach((c) => c.classList.add("virada")), 350);
  setTimeout(() => { cartas.forEach((c) => c.classList.remove("virada")); travado = false; jogo.focarPrimeiro(); }, n === 1 ? 2600 : 1900);
}

function atualizarPlacar() {
  jogo.placar(`⭐ ${achados}/${total}`);
}

function virar(c) {
  if (travado || jogo.pausado || c.classList.contains("virada") || c.classList.contains("achada")) return;
  c.classList.add("virada");
  c.setAttribute("aria-label", c.dataset.nome);
  sons.pulo();
  falar(`mem-${c.dataset.fig}`);
  abertas.push(c);
  if (abertas.length < 2) return;
  tentativas++;
  const [a, b] = abertas;
  abertas = [];
  if (a.dataset.fig === b.dataset.fig) {
    travado = true;
    setTimeout(() => {
      a.classList.add("achada"); b.classList.add("achada");
      a.disabled = b.disabled = true;
      sons.moeda();
      achados++;
      atualizarPlacar();
      travado = false;
      if (achados === total) {
        // estrelas: perfeito = 3; até o dobro de tentativas = 2; mais que isso = 1
        const estrelas = tentativas <= total + 1 ? 3 : tentativas <= total * 2 ? 2 : 1;
        jogo.vencer({ estrelas, texto: `Você achou os ${total} pares em ${tentativas} tentativas!` });
      } else {
        jogo.aviso("Achou o par!", "bom", 1100);
        setTimeout(() => falar("mem-par"), 650);
      }
    }, 450);
  } else {
    travado = true;
    setTimeout(() => {
      a.classList.add("balanca"); b.classList.add("balanca");
      sons.erro();
    }, 650);
    setTimeout(() => {
      for (const x of [a, b]) { x.classList.remove("virada", "balanca"); x.setAttribute("aria-label", "Carta"); }
      travado = false;
    }, 1300);
  }
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { get cartas() { return cartas; }, jogo, get tentativas() { return tentativas; } };
