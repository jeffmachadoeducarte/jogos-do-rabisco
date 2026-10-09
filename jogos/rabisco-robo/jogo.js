// Rabisco Robô (9 a 12 anos): programe o caminho do Rabisco até a escola com blocos de comando.
// Nível 1: setas (cima, baixo, esquerda, direita). Nível 2: andar para a frente e virar, como um
// robô de verdade. Nível 3: com o bloco "repetir", para programas mais curtos.
// Monte o programa, aperte ▶ e veja o Rabisco seguir as ordens; bateu, volta para o começo.

import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";
import { focar } from "../../src/motor/controle.js";

// R = começo (olhando para a direita), E = escola, # = pedra, * = estrela (bônus)
const MAPAS = [
  [["R..#..", ".#..#.", "...#..", "##...#", "..#*..", "#...#E"], ["R...#.", "##.#..", "...*.#", ".#.#..", ".#...#", "...#.E"]],
  [["R..#..", "##.#.#", "...*..", ".#.##.", ".#....", "...#.E"], ["R.#...", ".*#.#.", "....#.", "#.#...", "..#.#.", "#....E"]],
  [["R.....", "#####.", "*.....", ".#####", "......", "#####E"], ["R....#", "#.##.#", "#*.#.#", "##.#..", "...##.", ".#...E"]],
];
const NIVEIS = [
  { nome: "Nível 1", desc: "Setas", blocos: ["cima", "baixo", "esq", "dir"], max: 14 },
  { nome: "Nível 2", desc: "Frente e virar", blocos: ["frente", "girar-esq", "girar-dir"], max: 16 },
  { nome: "Nível 3", desc: "Com repetir", blocos: ["frente", "girar-esq", "girar-dir", "rep2", "rep3", "rep5"], max: 16 },
];
const BLOCOS = {
  cima: { ic: "⬆️", nome: "Para cima" }, baixo: { ic: "⬇️", nome: "Para baixo" }, esq: { ic: "⬅️", nome: "Para a esquerda" }, dir: { ic: "➡️", nome: "Para a direita" },
  frente: { ic: "👣", nome: "Andar para a frente" }, "girar-esq": { ic: "↩️", nome: "Virar à esquerda" }, "girar-dir": { ic: "↪️", nome: "Virar à direita" },
  rep2: { ic: "🔁2", nome: "Repetir 2 vezes o próximo bloco", vezes: 2 }, rep3: { ic: "🔁3", nome: "Repetir 3 vezes o próximo bloco", vezes: 3 }, rep5: { ic: "🔁5", nome: "Repetir 5 vezes o próximo bloco", vezes: 5 },
};
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // direita, baixo, esquerda, cima (girar à direita = +1)
let mapa = null, programa = [], rodando = false, tentativas = 0, robo = null, inicio = null, estrela = false, celEls = [], progEl = null;

const jogo = criarCasca({
  titulo: "Rabisco Robô",
  sub: "Programe o caminho até a escola!",
  faixa: "maiores",
  cor: "#1FC08E",
  niveis: NIVEIS,
  dica: { teclado: "Setas para escolher · Enter para pôr o bloco · P para pausar", toque: "Toque nos blocos para montar o programa e aperte ▶", controle: "Direcional para escolher · A para pôr o bloco · B apaga · Start pausa" },
  falas: { titulo: "rr-titulo", vitoria: "rr-vitoria" },
  aoComecar: montar,
  aoVoltar: () => apagar(),
});

function montar(n) {
  const cfg = NIVEIS[n - 1];
  const opcoes = MAPAS[n - 1];
  mapa = opcoes[Math.floor(Math.random() * opcoes.length)].map((l) => [...l]);
  programa = []; rodando = false; tentativas = 0; estrela = false;
  mapa.forEach((l, y) => l.forEach((c, x) => { if (c === "R") inicio = { x, y, d: 0 }; }));
  robo = { ...inicio };

  const mesa = el("div", { class: "mesa-robo" });
  const tab = el("div", { class: "tabuleiro-robo" });
  celEls = [];
  mapa.forEach((l, y) => l.forEach((c, x) => {
    const d = el("div", { class: `casa-robo ${c === "#" ? "pedra" : ""}`, texto: c === "#" ? "🪨" : c === "E" ? "🏫" : c === "*" ? "⭐" : "" });
    d.dataset.k = `${x},${y}`;
    tab.append(d);
    celEls.push(d);
  }));
  const boneco = el("div", { class: "robo", html: `<img src="../../assets/rabisco/poses/frente.png" alt="Rabisco"><span class="seta">➜</span>` });
  tab.append(boneco);

  const lado = el("div", { class: "lado-robo" });
  progEl = el("ol", { class: "programa", "aria-label": "Programa" });
  const blocos = el("div", { class: "blocos", role: "group", "aria-label": "Blocos de comando" });
  for (const b of cfg.blocos) blocos.append(el("button", { class: `bloco bloco-${b}`, texto: BLOCOS[b].ic, "aria-label": BLOCOS[b].nome, title: BLOCOS[b].nome, onclick: () => por(b) }));
  const acoes = el("div", { class: "acoes" }, [
    el("button", { class: "botao rodar", texto: "▶ Rodar", onclick: rodar }),
    el("button", { class: "botao branco", texto: "⌫", "aria-label": "Apagar o último bloco", onclick: apagar }),
    el("button", { class: "botao branco", texto: "🗑️", "aria-label": "Limpar o programa", onclick: limpar }),
  ]);
  lado.append(el("div", { class: "rotulo-prog", texto: `Programa (até ${cfg.max} blocos)` }), progEl, blocos, acoes);
  mesa.append(el("div", { class: "quadro-robo" }, [tab]), lado);
  jogo.palco.append(mesa);
  desenharRobo(false);
  desenharPrograma();
  falar(`rr-nivel-${n}`);
}

function desenharRobo(animar = true) {
  const b = document.querySelector(".robo");
  b.classList.toggle("sem-anim", !animar);
  b.style.setProperty("--x", robo.x);
  b.style.setProperty("--y", robo.y);
  b.querySelector(".seta").style.transform = `rotate(${robo.d * 90}deg)`;
}
function desenharPrograma(ativo = -1) {
  progEl.innerHTML = "";
  programa.forEach((b, i) => progEl.append(el("li", { class: `bloco-prog ${i === ativo ? "ativo" : ""}`, texto: BLOCOS[b].ic, title: BLOCOS[b].nome })));
  if (!programa.length) progEl.append(el("li", { class: "vazio", texto: "Toque nos blocos abaixo" }));
  jogo.placar(`🤖 ${programa.length}/${NIVEIS[jogo.nivel - 1].max}`);
}

function por(b) {
  if (rodando || jogo.pausado) return;
  if (programa.length >= NIVEIS[jogo.nivel - 1].max) { jogo.aviso("Programa cheio!"); sons.erro(); return; }
  programa.push(b); sons.bipe(); desenharPrograma();
}
function apagar() { if (rodando) return; programa.pop(); desenharPrograma(); }
function limpar() { if (rodando) return; programa = []; desenharPrograma(); }

// transforma "repetir" em passos simples: [rep3, frente] → frente, frente, frente
function expandir(prog) {
  const passos = [];
  for (let i = 0; i < prog.length; i++) {
    const vezes = BLOCOS[prog[i]].vezes;
    if (vezes) { const prox = prog[i + 1]; if (prox && !BLOCOS[prox].vezes) { for (let k = 0; k < vezes; k++) passos.push([prox, i]); i++; } }
    else passos.push([prog[i], i]);
  }
  return passos;
}

async function rodar() {
  if (rodando || !programa.length || jogo.pausado) return;
  rodando = true;
  tentativas++;
  robo = { ...inicio }; estrela = false;
  for (const c of celEls) c.classList.remove("rastro");
  desenharRobo(false);
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  await espera(250);
  for (const [b, i] of expandir(programa)) {
    while (jogo.pausado) await espera(200);
    if (jogo.estado !== "jogando") return;
    desenharPrograma(i);
    if (b === "girar-esq") robo.d = (robo.d + 3) % 4;
    else if (b === "girar-dir") robo.d = (robo.d + 1) % 4;
    else {
      const dir = { cima: 3, baixo: 1, esq: 2, dir: 0 }[b] ?? robo.d;
      robo.d = dir;
      const nx = robo.x + DIRS[dir][0], ny = robo.y + DIRS[dir][1];
      if (nx < 0 || ny < 0 || nx > 5 || ny > 5 || mapa[ny][nx] === "#") {
        desenharRobo();
        document.querySelector(".robo").classList.add("bateu");
        sons.batida();
        jogo.aviso(nx < 0 || ny < 0 || nx > 5 || ny > 5 ? "Ops! Saiu do caminho" : "Ops! Bateu na pedra", "", 1800);
        falar("rr-bateu");
        await espera(1300);
        document.querySelector(".robo").classList.remove("bateu");
        return terminarRodada();
      }
      celEls[robo.y * 6 + robo.x].classList.add("rastro");
      robo.x = nx; robo.y = ny;
      sons.pulo();
      if (mapa[ny][nx] === "*" && !estrela) { estrela = true; sons.moeda(); celEls[ny * 6 + nx].textContent = ""; }
    }
    desenharRobo();
    await espera(420);
    if (mapa[robo.y][robo.x] === "E") {
      sons.vitoria();
      const estrelas = Math.max(1, (tentativas === 1 ? 2 : 1) + (estrela ? 1 : 0));
      rodando = false;
      jogo.vencer({ titulo: "Chegou na escola!", estrelas, texto: `${programa.length} blocos · ${tentativas} ${tentativas === 1 ? "tentativa" : "tentativas"}${estrela ? " · pegou a estrela ⭐" : ""}` });
      return;
    }
  }
  jogo.aviso("Ainda não chegou na escola!", "", 1800);
  falar("rr-faltou");
  await espera(1200);
  terminarRodada();
}
function terminarRodada() {
  robo = { ...inicio };
  for (const c of celEls) { c.classList.remove("rastro"); const [x, y] = c.dataset.k.split(",").map(Number); if (mapa[y][x] === "*") c.textContent = "⭐"; }
  desenharRobo(false);
  desenharPrograma();
  rodando = false;
  focar(document.querySelector(".rodar"));
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, get mapa() { return mapa; }, por, rodar, get programa() { return programa; } };
