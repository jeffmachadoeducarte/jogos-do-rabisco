// Arca de Noé (1 ano e meio a 3 anos): os animais estão espalhados; toque em dois iguais e o casal
// entra na arca. Com todos os pares dentro, vem o arco-íris.

import { criarCasca, el, ajustarGrade } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar } from "../../src/motor/voz.js";

const ANIMAIS = [["leao", "🦁"], ["elefante", "🐘"], ["girafa", "🦒"], ["zebra", "🦓"], ["macaco", "🐒"], ["coelho", "🐰"], ["urso", "🐻"], ["pato", "🦆"], ["porco", "🐷"], ["vaca", "🐮"]];
const NIVEIS = [{ nome: "Nível 1", desc: "3 pares", pares: 3 }, { nome: "Nível 2", desc: "4 pares", pares: 4 }, { nome: "Nível 3", desc: "6 pares", pares: 6 }];
let escolhido = null, dentro = 0, total = 0, arca = null, soltar = null;

const jogo = criarCasca({
  titulo: "Arca de Noé",
  sub: "Ajude Noé a achar os pares!",
  faixa: "bem-pequenos",
  cor: "#FF5FA2",
  niveis: NIVEIS,
  dica: { teclado: "Setas para escolher · Enter para tocar", toque: "Toque em dois animais iguais", controle: "Direcional para escolher · A para tocar" },
  falas: { titulo: "an-titulo", vitoria: "an-vitoria" },
  aoComecar: montar,
});

const embaralhar = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function montar(n) {
  total = NIVEIS[n - 1].pares; dentro = 0; escolhido = null;
  const cena = el("div", { class: "cena-arca" });
  const campo = el("div", { class: "campo" });
  const grade = el("div", { class: "animais" });
  for (const [id, e] of embaralhar(embaralhar(ANIMAIS).slice(0, total).flatMap((a) => [a, a]))) {
    const b = el("button", { class: "animal", texto: e, "aria-label": id, onclick: () => tocar(b) });
    b.dataset.id = id;
    grade.append(b);
  }
  campo.append(grade);
  arca = el("div", { class: "arca", html: `<div class="casco"></div><div class="casinha"></div><div class="dentro"></div>` });
  cena.append(campo, arca);
  jogo.palco.append(cena);
  soltar?.();
  soltar = ajustarGrade(grade, total * 2, { aspecto: 1, folga: 10, maxLado: 140 });
  jogo.placar(`🚢 0/${total}`);
  falar("an-inicio");
}

function tocar(b) {
  if (jogo.pausado || b.classList.contains("embarcou")) return;
  falar(`an-${b.dataset.id}`);
  sons.pulo();
  if (!escolhido) { escolhido = b; b.classList.add("escolhido"); return; }
  if (escolhido === b) { b.classList.remove("escolhido"); escolhido = null; return; }
  const a = escolhido;
  escolhido = null;
  a.classList.remove("escolhido");
  if (a.dataset.id !== b.dataset.id) {
    sons.erro();
    for (const x of [a, b]) { x.classList.remove("balanca"); void x.offsetWidth; x.classList.add("balanca"); }
    return;
  }
  // o casal anda até a arca
  for (const x of [a, b]) { x.classList.add("embarcou"); x.disabled = true; }
  sons.moeda();
  dentro++;
  jogo.placar(`🚢 ${dentro}/${total}`);
  setTimeout(() => { arca.querySelector(".dentro").append(el("span", { texto: a.textContent + a.textContent })); arca.classList.remove("balanca"); void arca.offsetWidth; arca.classList.add("balanca"); }, 600);
  if (dentro === total) {
    setTimeout(() => { arca.classList.add("arco-iris"); sons.vitoria(); }, 900);
    setTimeout(() => jogo.vencer({ titulo: "Todos na arca!", estrelas: null, texto: "Você achou todos os pares!" }), 2600);
  } else jogo.aviso("Par!", "bom", 900);
}

if (new URLSearchParams(location.search).has("teste")) window.teste = { jogo, tocar };
