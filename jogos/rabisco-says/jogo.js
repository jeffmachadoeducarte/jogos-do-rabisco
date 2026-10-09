// Rabisco Says (4 e 5 anos, inglês): "Rabisco says: touch red!" A criança toca a cor (ou a figura)
// que o Rabisco pedir em inglês. No nível 3 vem a pegadinha: se ele não disser "Rabisco says",
// não pode tocar — é só esperar a barrinha acabar.

import { criarCasca, el, ajustarGrade } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

const CORES = { red: "#e63946", blue: "#1d6fe0", yellow: "#ffcc1f", green: "#2bb24c", pink: "#ec2e8c", orange: "#ff7a00" };
const FORMAS = { star: "★", heart: "♥", circle: "●", square: "■" };
const NIVEIS = [
  { nome: "Nível 1", desc: "Colors", tipo: "cor", n: 4 },
  { nome: "Nível 2", desc: "Colors and shapes", tipo: "forma", n: 6 },
  { nome: "Nível 3", desc: "Rabisco didn't say!", tipo: "cor", n: 6, pegadinha: true },
];
const RODADAS = 8;
let ordem = null, rodada = 0, acertos = 0, timer = null, esperando = false, alvos = [], soltar = null;

const jogo = criarCasca({
  titulo: "Rabisco Says",
  sub: "Listen and touch!",
  faixa: "pequenos",
  cor: "#8E6CFF",
  niveis: NIVEIS,
  dica: { teclado: "Setas para escolher · Enter para tocar", toque: "Ouça e toque na cor certa", controle: "Direcional para escolher · A para tocar" },
  falas: { titulo: "rs-titulo", vitoria: "en-great-job" },
  aoComecar: montar,
  aoSair: () => clearTimeout(timer),
  aoPausar: () => clearTimeout(timer),
  aoContinuar: () => { if (esperando) proximaRodada(true); },
});

function montar(n) {
  const cfg = NIVEIS[n - 1];
  rodada = 0; acertos = 0; clearTimeout(timer);
  const cena = el("div", { class: "cena-says" });
  const fala = el("div", { class: "comando", "aria-live": "polite" });
  const barra = el("div", { class: "barra" }, [el("div", { class: "enche" })]);
  const grade = el("div", { class: "alvos" });
  const nomes = Object.keys(CORES).slice(0, cfg.n);
  alvos = cfg.tipo === "cor"
    ? nomes.map((c) => ({ cor: c, forma: "circle" }))
    : nomes.map((c, i) => ({ cor: c, forma: Object.keys(FORMAS)[i % 4] }));
  for (const a of alvos) {
    const b = el("button", { class: `alvo-cor forma-${a.forma}`, style: `--c:${CORES[a.cor]}`, "aria-label": `${a.cor} ${a.forma}`, texto: cfg.tipo === "forma" ? FORMAS[a.forma] : "", onclick: () => tocar(a, b) });
    grade.append(b);
  }
  cena.append(el("img", { class: "rabisco-says", src: "../../assets/rabisco/poses/apresentando.png", alt: "Rabisco" }), el("div", { class: "lado" }, [fala, barra, grade]));
  jogo.palco.append(cena);
  soltar?.();
  grade.dataset.reservar = String(fala.offsetHeight + 70); // o comando e a barra ficam acima da grade
  soltar = ajustarGrade(grade, alvos.length, { aspecto: 1, folga: 14, maxLado: 150 });
  setTimeout(() => proximaRodada(), 900);
}

function proximaRodada(repetir = false) {
  const cfg = NIVEIS[jogo.nivel - 1];
  if (!repetir) {
    if (rodada >= RODADAS) {
      const estrelas = acertos >= RODADAS ? 3 : acertos >= RODADAS - 2 ? 2 : 1;
      jogo.vencer({ titulo: "Great job!", estrelas, texto: `Você acertou ${acertos} de ${RODADAS}!` });
      return;
    }
    rodada++;
    const a = alvos[Math.floor(Math.random() * alvos.length)];
    ordem = { ...a, disse: !cfg.pegadinha || Math.random() < 0.65 };
  }
  const texto = cfg.tipo === "forma" ? `touch the <b style="color:${CORES[ordem.cor]}">${ordem.cor} ${ordem.forma}</b>!` : `touch <b style="color:${CORES[ordem.cor]}">${ordem.cor}</b>!`;
  document.querySelector(".comando").innerHTML = ordem.disse ? `Rabisco says: ${texto}` : texto[0].toUpperCase() + texto.slice(1);
  falar(`en-rs-${ordem.disse ? "says-" : ""}${cfg.tipo === "forma" ? `${ordem.cor}-${ordem.forma}` : ordem.cor}`);
  jogo.placar(`⭐ ${acertos}/${RODADAS}`);
  esperando = true;
  // barra de tempo: na pegadinha, esperar até o fim é o certo
  const barra = document.querySelector(".barra .enche");
  barra.style.transition = "none"; barra.style.width = "100%"; void barra.offsetWidth;
  const tempo = ordem.disse ? 7000 : 4000;
  barra.style.transition = `width ${tempo}ms linear`; barra.style.width = "0%";
  document.querySelector(".barra").hidden = !NIVEIS[jogo.nivel - 1].pegadinha;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!esperando || jogo.pausado) return;
    esperando = false;
    if (!ordem.disse) { acertos++; sons.moeda(); jogo.aviso("Good! Rabisco didn't say!", "bom", 1500); falar("en-rs-didnt-say"); }
    else { sons.erro(); jogo.aviso("Too slow!", "", 1200); }
    setTimeout(() => proximaRodada(), 1700);
  }, tempo);
}

function tocar(a, botao) {
  if (!esperando || jogo.pausado) return;
  esperando = false;
  clearTimeout(timer);
  const certo = ordem.disse && a.cor === ordem.cor && a.forma === ordem.forma;
  if (certo) { acertos++; sons.moeda(); botao.classList.add("certo"); jogo.aviso("Yes!", "bom", 1000); falar("en-rs-yes"); }
  else if (!ordem.disse) { sons.erro(); botao.classList.add("errado"); jogo.aviso("Oops! Rabisco didn't say!", "", 1700); falar("en-rs-oops-didnt"); }
  else { sons.erro(); botao.classList.add("errado"); jogo.aviso(`Oops! That's ${a.cor}`, "", 1500); falar("en-rs-oops"); }
  setTimeout(() => { botao.classList.remove("certo", "errado"); proximaRodada(); }, 1800);
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, get ordem() { return ordem; }, get acertos() { return acertos; }, alvos: () => alvos };
