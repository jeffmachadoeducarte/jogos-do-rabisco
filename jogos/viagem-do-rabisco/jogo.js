// Viagem do Rabisco (4 e 5 anos, geografia): o Rabisco viaja pelo mundo visitando amigos e levando
// presentes. Em cada rodada a voz pede algo (uma paisagem, um transporte, uma região do Brasil, um
// ponto cardeal...) e a criança toca na opção certa. Acerto: o Rabisco anda até o amigo e a paisagem
// muda. Erro: o botão balança e dá para tentar de novo, sem punição.

import { criarCasca, el, ajustarGrade } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar, preCarregarFalas } from "../../src/motor/voz.js";

const RAIZ = "../..";
const RODADAS = 6;

// ---------- Paisagens do cartão postal: céu, chão, água e enfeites [emoji, esquerda %, baixo %, tamanho]
const PAISAGENS = {
  praia: { nome: "Praia", emoji: "🏖️", ceu: ["#38b6ff", "#c9f1ff"], chao: "#f4d58d", agua: "#1f9be0", decor: [["🌴", 4, 22, 1.5], ["⛱️", 70, 20, 1.1], ["🐚", 42, 4, 0.6], ["☀️", 84, 70, 1], ["⛵", 55, 34, 0.7]] },
  floresta: { nome: "Floresta", emoji: "🌳", ceu: ["#58c4ff", "#d8f7e0"], chao: "#2f9e44", decor: [["🌳", 2, 20, 1.6], ["🌲", 22, 24, 1.2], ["🌳", 66, 22, 1.4], ["🦜", 48, 66, 0.7], ["🍄", 40, 6, 0.6], ["🌲", 86, 24, 1.2]] },
  cidade: { nome: "Cidade", emoji: "🏙️", ceu: ["#7fc8ff", "#eaf6ff"], chao: "#9aa5b1", decor: [["🏢", 2, 22, 1.5], ["🏙️", 24, 22, 1.3], ["🏬", 62, 22, 1.3], ["🚦", 46, 18, 0.8], ["🏢", 84, 22, 1.3], ["☁️", 36, 72, 0.8]] },
  campo: { nome: "Campo", emoji: "🌾", ceu: ["#5fb8ff", "#fff4d6"], chao: "#8bd16a", decor: [["🏡", 4, 22, 1.3], ["🌾", 30, 14, 0.9], ["🐄", 58, 18, 1], ["🌻", 44, 4, 0.7], ["🌾", 82, 16, 0.9], ["☀️", 80, 70, 0.9]] },
  montanha: { nome: "Montanha", emoji: "🏔️", ceu: ["#6aa8ff", "#e7f0ff"], chao: "#7cb46b", decor: [["🏔️", 0, 20, 2.2], ["⛰️", 56, 20, 1.9], ["🌲", 40, 10, 0.8], ["🦅", 40, 70, 0.7]] },
  rio: { nome: "Rio", emoji: "🏞️", ceu: ["#4fb0ff", "#dff6ff"], chao: "#6cc24a", rio: "#2a8fd6", decor: [["🌳", 2, 24, 1.3], ["🐟", 44, 6, 0.6], ["🛶", 60, 10, 0.8], ["🌳", 84, 24, 1.3], ["☁️", 60, 72, 0.8]] },
  deserto: { nome: "Deserto", emoji: "🏜️", ceu: ["#ffb347", "#ffe8b0"], chao: "#e9b96e", decor: [["🌵", 4, 20, 1.4], ["🐪", 58, 18, 1.2], ["🌵", 86, 20, 1], ["☀️", 46, 70, 1.1]] },
  gelo: { nome: "Gelo", emoji: "🧊", ceu: ["#9fd8ff", "#f2fbff"], chao: "#eef8ff", decor: [["🏔️", 2, 20, 1.6], ["🐧", 58, 18, 0.9], ["⛄", 84, 20, 1], ["❄️", 40, 70, 0.6], ["❄️", 70, 76, 0.5]] },
  mar: { nome: "Mar", emoji: "🌊", ceu: ["#3aa8ff", "#d4f2ff"], chao: "#f4d58d", agua: "#1479c9", decor: [["🐋", 54, 30, 1], ["⛵", 20, 36, 0.8], ["🐠", 76, 26, 0.6], ["☀️", 84, 72, 0.9]] },
};
const p = (id) => ({ id, emoji: PAISAGENS[id].emoji, nome: PAISAGENS[id].nome });

const TRANSPORTES = [
  { id: "navio", emoji: "🚢", nome: "Navio", fala: "vg-tr-mar", texto: "Para atravessar o mar, vai de quê?", vai: "mar" },
  { id: "aviao", emoji: "✈️", nome: "Avião", fala: "vg-tr-longe", texto: "Para voar bem longe, vai de quê?", vai: "montanha" },
  { id: "onibus", emoji: "🚌", nome: "Ônibus", fala: "vg-tr-cidade", texto: "Para passear pela cidade, vai de quê?", vai: "cidade" },
  { id: "trem", emoji: "🚆", nome: "Trem", fala: "vg-tr-trilhos", texto: "O que anda pelos trilhos?", vai: "campo" },
  { id: "barco", emoji: "🛶", nome: "Barco", fala: "vg-tr-rio", texto: "Para remar pelo rio, vai de quê?", vai: "rio" },
  { id: "bicicleta", emoji: "🚲", nome: "Bicicleta", fala: "vg-tr-perto", texto: "Para ir pertinho de casa, vai de quê?", vai: "campo" },
];
const MORADORES = [
  { id: "peixe", emoji: "🐟", texto: "Onde vive o peixe?", certo: "mar" },
  { id: "camelo", emoji: "🐪", texto: "Onde vive o camelo?", certo: "deserto" },
  { id: "macaco", emoji: "🐒", texto: "Onde vive o macaco?", certo: "floresta" },
  { id: "vaca", emoji: "🐄", texto: "Onde vive a vaca?", certo: "campo" },
  { id: "pinguim", emoji: "🐧", texto: "Onde vive o pinguim?", certo: "gelo" },
  { id: "onibus", emoji: "🚌", texto: "Onde anda o ônibus?", certo: "cidade" },
];
const LUGARES_MORADORES = ["mar", "deserto", "floresta", "campo", "gelo", "cidade"];
const MEIOS = [
  { id: "terra", emoji: "🌍", nome: "Terra" },
  { id: "agua", emoji: "🌊", nome: "Água" },
  { id: "ar", emoji: "☁️", nome: "Ar" },
];
const SERES = {
  terra: [["cachorro", "🐕", "O cachorro"], ["arvore", "🌳", "A árvore"], ["cavalo", "🐎", "O cavalo"]],
  agua: [["peixe", "🐟", "O peixe"], ["baleia", "🐋", "A baleia"], ["polvo", "🐙", "O polvo"]],
  ar: [["passaro", "🐦", "O pássaro"], ["nuvem", "☁️", "A nuvem"], ["borboleta", "🦋", "A borboleta"]],
};
// do menor (pertinho) para o maior (bem longe): um lugar fica dentro do outro
const ESCALA = [
  { id: "casa", emoji: "🏠", nome: "Casa", texto: "Vamos começar pela nossa casa! Toque na casa." },
  { id: "rua", emoji: "🛣️", nome: "Rua", texto: "A casa fica numa rua. Toque na rua!" },
  { id: "bairro", emoji: "🏘️", nome: "Bairro", texto: "Muitas ruas formam o bairro. Toque no bairro!" },
  { id: "cidade", emoji: "🏙️", nome: "Cidade", texto: "Muitos bairros formam a cidade. Toque na cidade!" },
  { id: "brasil", emoji: "🇧🇷", nome: "Brasil", texto: "A cidade fica no Brasil, o nosso país. Toque no Brasil!" },
  { id: "planeta", emoji: "🌍", nome: "Planeta Terra", texto: "E o Brasil fica no planeta Terra! Toque no planeta!" },
];
const REGIOES = [
  { id: "norte", nome: "Norte", cor: "#2bb24c", fala: "vg-regiao-norte", texto: "Toque na região Norte, onde fica a floresta Amazônica!", vai: "floresta",
    d: "M20 160 L40 120 L120 60 L180 50 L230 30 L260 80 L275 100 L258 150 L245 205 L205 195 L130 190 L110 215 L60 200 Z", rotulo: [140, 130], enfeite: ["🌳", 95, 160] },
  { id: "nordeste", nome: "Nordeste", cor: "#ff7a00", fala: "vg-regiao-nordeste", texto: "Toque na região Nordeste, cheia de praias e sol!", vai: "praia",
    d: "M275 100 L320 110 L370 135 L388 165 L372 205 L345 240 L332 280 L295 258 L258 238 L245 205 L258 150 Z", rotulo: [318, 182], enfeite: ["☀️", 350, 225] },
  { id: "centro", nome: "Centro-Oeste", cor: "#ffcc1f", fala: "vg-regiao-centro", texto: "Toque na região Centro-Oeste, bem no meio do Brasil!", vai: "campo",
    d: "M110 215 L130 190 L205 195 L245 205 L258 238 L250 268 L215 300 L185 320 L160 300 L140 260 Z", rotulo: [190, 245], enfeite: ["🐄", 165, 285] },
  { id: "sudeste", nome: "Sudeste", cor: "#1d6fe0", fala: "vg-regiao-sudeste", texto: "Toque na região Sudeste, onde ficam São Paulo e o Rio!", vai: "cidade",
    d: "M258 238 L295 258 L332 280 L325 300 L300 318 L260 335 L225 330 L215 300 L250 268 Z", rotulo: [278, 295], enfeite: ["🏙️", 300, 325] },
  { id: "sul", nome: "Sul", cor: "#8e6cff", fala: "vg-regiao-sul", texto: "Toque na região Sul, onde faz mais frio!", vai: "montanha",
    d: "M185 320 L215 300 L225 330 L260 335 L248 352 L236 375 L212 398 L182 382 L168 355 Z", rotulo: [212, 355], enfeite: ["🧣", 238, 385] },
];
const CARDEAIS = [
  { id: "norte", nome: "Norte", letra: "N", seta: "⬆️", fala: "vg-norte", texto: "O Rabisco quer ir para o Norte. Toque no Norte!" },
  { id: "sul", nome: "Sul", letra: "S", seta: "⬇️", fala: "vg-sul", texto: "O Rabisco quer ir para o Sul. Toque no Sul!" },
  { id: "leste", nome: "Leste", letra: "L", seta: "➡️", fala: "vg-leste", texto: "Para o Leste, onde o sol nasce. Toque no Leste!" },
  { id: "oeste", nome: "Oeste", letra: "O", seta: "⬅️", fala: "vg-oeste", texto: "Para o Oeste, onde o sol se põe. Toque no Oeste!" },
];
const TEMPOS = [
  { id: "sol", emoji: "☀️", nome: "Sol", leva: "chapeu", fala: "vg-cm-sol", texto: "Que sol forte! O que levar na mala?", vai: "praia" },
  { id: "chuva", emoji: "🌧️", nome: "Chuva", leva: "guarda", fala: "vg-cm-chuva", texto: "Está chovendo! O que levar na mala?", vai: "floresta" },
  { id: "neve", emoji: "❄️", nome: "Neve", leva: "casaco", fala: "vg-cm-neve", texto: "Está nevando! O que levar na mala?", vai: "gelo" },
  { id: "vento", emoji: "💨", nome: "Vento", leva: "pipa", fala: "vg-cm-vento", texto: "Que ventania! O que levar para brincar?", vai: "campo" },
];
const MALA = [
  { id: "chapeu", emoji: "👒", nome: "Chapéu" },
  { id: "guarda", emoji: "☂️", nome: "Guarda-chuva" },
  { id: "casaco", emoji: "🧥", nome: "Casaco" },
  { id: "pipa", emoji: "🪁", nome: "Pipa" },
];
// amigos que o Rabisco visita (um por rodada) e os presentes que ele leva
const AMIGOS = [["Lia", "👧"], ["Davi", "👦"], ["Vovó Rosa", "👵"], ["Tom", "🧒"], ["Bia", "👧🏽"], ["Caio", "👦🏾"]];
const PRESENTES = ["🎁", "🧸", "🍎", "📚", "🌻", "⚽"];

// ---------- utilidades
const embaralhar = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const sortear = (a) => a[Math.floor(Math.random() * a.length)];
// 6 pedidos sem repetir o mesmo duas vezes seguidas, cobrindo todos antes de repetir
function sequencia(ids, n = RODADAS) {
  const r = [];
  while (r.length < n) for (const x of embaralhar(ids)) { if (r.length < n && x !== r.at(-1)) r.push(x); }
  return r;
}

// ---------- geradores de rodada: cada um devolve { tipo, fala, texto, opcoes, certo, item?, vai? }
const rodadaPaisagem = (id, opcoesIds) => ({
  tipo: "grade", fala: `vg-${id}`, texto: `Toque ${["praia", "floresta", "cidade", "montanha"].includes(id) ? "na" : "no"} ${PAISAGENS[id].nome.toLowerCase()}!`,
  opcoes: embaralhar(opcoesIds).map(p), certo: id, vai: id,
});
const rodadaMorador = (m) => ({ tipo: "grade", fala: `vg-onde-${m.id}`, texto: m.texto, item: m.emoji, opcoes: embaralhar(LUGARES_MORADORES).map(p), certo: m.certo, vai: m.certo });
const rodadaTransporte = (t) => ({ tipo: "grade", fala: t.fala, texto: t.texto, opcoes: embaralhar(TRANSPORTES), certo: t.id, vai: t.vai });
const rodadaRegiao = (r, fala = r.fala, texto = r.texto) => ({ tipo: "mapa", fala, texto, opcoes: REGIOES, certo: r.id, vai: r.vai });
const rodadaCardeal = (c, fala = c.fala, texto = c.texto) => ({ tipo: "bussola", fala, texto, opcoes: CARDEAIS, certo: c.id });
const rodadaTempo = (t) => ({ tipo: "grade", fala: t.fala, texto: t.texto, item: t.emoji, opcoes: embaralhar(MALA), certo: t.leva, vai: t.vai });

const FASES = [
  { nome: "Paisagens", cena: "praia", fundo: ["#38b6ff", "#d6f3ff"], criacao: true,
    rodadas: () => sequencia(["praia", "floresta", "cidade", "campo"]).map((id) => rodadaPaisagem(id, ["praia", "floresta", "cidade", "campo"])) },
  { nome: "Mais paisagens", cena: "montanha", fundo: ["#6aa8ff", "#eaf1ff"],
    rodadas: () => {
      const novas = embaralhar(["montanha", "rio", "deserto", "gelo"]);
      const ids = [...novas, ...embaralhar(["praia", "floresta", "cidade", "campo"]).slice(0, 2)];
      return embaralhar(ids).map((id) => {
        const outras = embaralhar(Object.keys(PAISAGENS).filter((k) => k !== id && k !== "mar")).slice(0, 5);
        return rodadaPaisagem(id, [id, ...outras]);
      });
    } },
  { nome: "Quem mora onde?", cena: "floresta", fundo: ["#2f9e44", "#c9f7d0"], rodadas: () => embaralhar(MORADORES).map(rodadaMorador) },
  { nome: "Como viajar?", cena: "cidade", fundo: ["#ff8a3d", "#ffe5c7"], rodadas: () => embaralhar(TRANSPORTES).map(rodadaTransporte) },
  { nome: "Terra, água e ar", cena: "mar", fundo: ["#0077b6", "#9fe3ff"], criacao: true,
    rodadas: () => embaralhar(Object.entries(SERES).flatMap(([meio, l]) => embaralhar(l).slice(0, 2).map((s) => ({ meio, s })))).map(({ meio, s }) => ({
      tipo: "grade", fala: `vg-cl-${s[0]}`, texto: `${s[2]} é da terra, da água ou do ar?`, item: s[1], opcoes: MEIOS, certo: meio,
      vai: meio === "agua" ? "mar" : meio === "ar" ? "montanha" : "campo",
    })) },
  { nome: "Perto ou longe de casa", cena: "cidade", fundo: ["#ec2e8c", "#ffd6ea"],
    rodadas: () => { const ordem = embaralhar(ESCALA); return ESCALA.map((e) => ({ tipo: "ordem", fala: `vg-pl-${e.id}`, texto: e.texto, opcoes: ordem, certo: e.id })); } },
  { nome: "Mapa do Brasil", cena: "floresta", fundo: ["#1fc08e", "#e3fff3"],
    rodadas: () => [...embaralhar(REGIOES).map((r) => rodadaRegiao(r)), rodadaRegiao(REGIOES[0], "vg-regiao-amazonia", "Onde fica a floresta Amazônica? Toque na região!")] },
  { nome: "Pontos cardeais", cena: "montanha", fundo: ["#8e6cff", "#e9e2ff"],
    rodadas: () => [...embaralhar(CARDEAIS).map((c) => rodadaCardeal(c)),
      rodadaCardeal(CARDEAIS[1], "vg-sul-embaixo", "O Sul fica embaixo no mapa. Toque no Sul!"),
      rodadaCardeal(CARDEAIS[0], "vg-norte-cima", "O Norte fica em cima no mapa. Toque no Norte!")] },
  { nome: "Clima e roupa", cena: "gelo", fundo: ["#5d7fa8", "#dbe9f7"],
    rodadas: () => [...embaralhar(TEMPOS).map(rodadaTempo), ...embaralhar([
      { tipo: "grade", fala: "vg-cm-guarda", texto: "O guarda-chuva é para qual tempo?", item: "☂️", opcoes: embaralhar(TEMPOS), certo: "chuva", vai: "floresta" },
      { tipo: "grade", fala: "vg-cm-casaco", texto: "O casaco é para qual tempo?", item: "🧥", opcoes: embaralhar(TEMPOS), certo: "neve", vai: "gelo" },
    ])] },
  { nome: "Volta ao mundo", cena: "praia", fundo: ["#ffcc1f", "#fff6cf"], criacao: true, final: true,
    rodadas: () => {
      const pais = sortear(Object.keys(PAISAGENS).filter((k) => k !== "mar"));
      return embaralhar([
        rodadaPaisagem(pais, [pais, ...embaralhar(Object.keys(PAISAGENS).filter((k) => k !== pais && k !== "mar")).slice(0, 5)]),
        rodadaTransporte(sortear(TRANSPORTES)),
        rodadaRegiao(sortear(REGIOES)),
        rodadaCardeal(sortear(CARDEAIS)),
        rodadaMorador(sortear(MORADORES)),
        rodadaTempo(sortear(TEMPOS)),
      ]);
    } },
];

// ---------- estado
let F = FASES[0], lista = [], rodada = 0, erros = 0, ocupado = true, geracao = 0, soltarGrade = null, feitos = [];
let cena = null;

preCarregarFalas(["vg-isso", "vg-ops", "vg-criacao", "vg-final"]);

const jogo = criarCasca({
  titulo: "Viagem do Rabisco",
  sub: "Vamos conhecer o mundo?",
  faixa: "pequenos",
  cor: "#8E6CFF",
  pose: "lado",
  niveis: FASES.map((f, i) => ({ nome: `${i + 1}`, desc: f.nome })),
  dica: { teclado: "Setas para escolher · Enter para tocar", toque: "Ouça e toque no lugar certo", controle: "Direcional para escolher · A para tocar" },
  falas: { titulo: "vg-titulo", vitoria: "vg-vitoria" },
  menuNoJogo: true,
  teclado: true,
  aoComecar: montar,
  aoSair: () => { geracao++; soltarGrade?.(); },
});
document.body.classList.add("vg");

// timers que esperam a pausa acabar e morrem quando a fase muda
function depois(ms, fn) {
  const g = geracao;
  const rodar = () => { if (g !== geracao) return; if (jogo.pausado) { setTimeout(rodar, 300); return; } fn(); };
  setTimeout(rodar, ms);
}

function montar(n) {
  geracao++;
  F = FASES[n - 1];
  lista = F.rodadas();
  rodada = 0; erros = 0; feitos = []; ocupado = true;
  document.body.style.setProperty("--f1", F.fundo[0]);
  document.body.style.setProperty("--f2", F.fundo[1]);

  const trilha = el("div", { class: "trilha", "aria-hidden": "true" }, Array.from({ length: RODADAS }, () => el("span", { class: "ponto" })));
  const postal = el("div", { class: "postal" }, [
    el("div", { class: "ceu" }), el("div", { class: "agua" }), el("div", { class: "chao" }), el("div", { class: "decor" }),
    el("div", { class: "amigo" }, [el("span", { class: "cara" }), el("span", { class: "nome" })]),
    el("div", { class: "item-grande", "aria-hidden": "true" }),
    el("img", { class: "rabisco-vg", src: `${RAIZ}/assets/rabisco/poses/frente.png`, alt: "Rabisco" }),
    el("span", { class: "presente", "aria-hidden": "true" }),
    trilha,
    el("img", { class: "logo-jogo", src: `${RAIZ}/assets/marca/logos/azul-icone-rosa.png`, alt: "Educarte" }),
  ]);
  cena = el("div", { class: "cena-vg" }, [
    el("div", { class: "pedido", "aria-live": "polite" }, [el("span", { class: "pedido-texto" })]),
    el("div", { class: "meio" }, [postal, el("div", { class: "painel" })]),
  ]);
  jogo.palco.append(cena);
  pintarPaisagem(F.cena);
  if (F.final) { falar("vg-presente"); jogo.aviso("🎁 Presentes para os amigos!", "bom", 2200); depois(3600, proximaRodada); }
  else depois(700, proximaRodada);
}

function pintarPaisagem(id) {
  const P = PAISAGENS[id];
  const postal = cena.querySelector(".postal");
  postal.dataset.p = id;
  postal.style.setProperty("--ceu1", P.ceu[0]);
  postal.style.setProperty("--ceu2", P.ceu[1]);
  postal.style.setProperty("--chao", P.chao);
  postal.style.setProperty("--agua", P.agua || P.rio || "transparent");
  postal.classList.toggle("tem-mar", Boolean(P.agua));
  postal.classList.toggle("tem-rio", Boolean(P.rio));
  const decor = postal.querySelector(".decor");
  decor.innerHTML = "";
  for (const [e, x, y, t] of P.decor) decor.append(el("span", { texto: e, style: `left:${x}%; bottom:${y}%; --t:${t}` }));
}

function proximaRodada() {
  if (rodada >= RODADAS) { vencer(); return; }
  const R = lista[rodada];
  const [nomeAmigo, caraAmigo] = AMIGOS[rodada % AMIGOS.length];
  const postal = cena.querySelector(".postal");
  postal.querySelector(".amigo .cara").textContent = caraAmigo;
  postal.querySelector(".amigo .nome").textContent = `${PRESENTES[rodada]} ${nomeAmigo}`;
  postal.querySelector(".amigo").classList.remove("feliz");
  const presente = postal.querySelector(".presente");
  presente.textContent = PRESENTES[rodada];
  presente.classList.remove("entregue");
  const item = postal.querySelector(".item-grande");
  item.textContent = R.item || "";
  item.hidden = !R.item;
  postal.querySelectorAll(".trilha .ponto").forEach((pt, i) => { pt.className = `ponto ${i < rodada ? "feito" : i === rodada ? "agora" : ""}`; });
  cena.querySelector(".pedido-texto").textContent = R.texto;
  jogo.placar(`⭐ ${rodada}/${RODADAS}`);
  desenharPainel(R);
  falar(R.fala);
  ocupado = true;
  depois(900, () => { ocupado = false; });
}

// ---------- painel de opções: grade de botões, mapa do Brasil ou rosa dos ventos
function desenharPainel(R) {
  const painel = cena.querySelector(".painel");
  soltarGrade?.(); soltarGrade = null;
  painel.innerHTML = "";
  painel.className = `painel painel-${R.tipo}`;
  if (R.tipo === "mapa") { painel.append(mapaBrasil()); return; }
  if (R.tipo === "bussola") { painel.append(rosaDosVentos()); return; }
  const grade = el("div", { class: "grade-vg" });
  for (const o of R.opcoes) {
    const ordem = feitos.indexOf(o.id);
    const b = el("button", { class: `op${ordem >= 0 ? " feito" : ""}`, "data-id": o.id, "aria-label": o.nome, onclick: () => escolher(o.id, b) }, [
      el("span", { class: "emoji", texto: o.emoji }), el("span", { class: "nome", texto: o.nome }),
    ]);
    if (ordem >= 0) { b.disabled = true; b.append(el("span", { class: "numero", texto: `${ordem + 1}º` })); }
    grade.append(b);
  }
  painel.append(grade);
  soltarGrade = ajustarGrade(grade, R.opcoes.length, { aspecto: 0.92, folga: 14, maxLado: 270 });
}

function mapaBrasil() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 400 410");
  svg.setAttribute("class", "mapa-brasil");
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "Mapa do Brasil com as cinco regiões");
  const mar = document.createElementNS(NS, "rect");
  Object.entries({ x: 0, y: 0, width: 400, height: 410, rx: 24, class: "mar-mapa" }).forEach(([k, v]) => mar.setAttribute(k, v));
  svg.append(mar);
  for (const r of REGIOES) {
    const g = document.createElementNS(NS, "path");
    g.setAttribute("d", r.d);
    g.setAttribute("fill", r.cor);
    g.setAttribute("class", "regiao");
    g.setAttribute("data-foco", "");
    g.setAttribute("data-id", r.id);
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", `Região ${r.nome}`);
    g.addEventListener("click", () => escolher(r.id, g));
    svg.append(g);
  }
  // rótulos e enfeites por cima, sem pegar o toque
  for (const r of REGIOES) {
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", r.rotulo[0]); t.setAttribute("y", r.rotulo[1]);
    t.setAttribute("class", "rotulo");
    t.textContent = r.nome;
    const e = document.createElementNS(NS, "text");
    e.setAttribute("x", r.enfeite[1]); e.setAttribute("y", r.enfeite[2]);
    e.setAttribute("class", "enfeite");
    e.textContent = r.enfeite[0];
    svg.append(t, e);
  }
  return svg;
}

function rosaDosVentos() {
  const rosa = el("div", { class: "rosa" }, [el("div", { class: "estrela-rosa", "aria-hidden": "true" }), el("div", { class: "miolo", "aria-hidden": "true", texto: "🧭" })]);
  for (const c of CARDEAIS) {
    const b = el("button", { class: `cardeal c-${c.id}`, "data-id": c.id, "aria-label": c.nome, onclick: () => escolher(c.id, b) }, [
      el("span", { class: "seta", texto: c.seta }), el("span", { class: "nome", texto: `${c.letra} · ${c.nome}` }),
    ]);
    rosa.append(b);
  }
  return rosa;
}

// ---------- escolha: acerto anda, erro balança
function escolher(id, alvo) {
  if (ocupado || jogo.pausado || jogo.estado !== "jogando") return;
  const R = lista[rodada];
  if (id !== R.certo) {
    erros++;
    sons.erro();
    falar("vg-ops");
    jogo.aviso("Ops! Tente de novo.", "", 1200);
    alvo.classList.remove("balanca"); void alvo.getBoundingClientRect(); alvo.classList.add("balanca");
    ocupado = true;
    depois(600, () => { ocupado = false; alvo.classList.remove("balanca"); });
    return;
  }
  ocupado = true;
  sons.moeda();
  falar("vg-isso");
  const nome = window.Familia?.crianca?.()?.nome;
  jogo.aviso(nome ? `Isso, ${nome}! Vamos lá!` : "Isso! Vamos lá!", "bom", 1300);
  alvo.classList.add("certo");
  if (R.tipo === "ordem") feitos.push(id);
  // o Rabisco anda até o amigo e entrega o presente
  const postal = cena.querySelector(".postal");
  const rb = postal.querySelector(".rabisco-vg");
  rb.src = `${RAIZ}/assets/rabisco/poses/lado.png`;
  rb.classList.add("anda");
  depois(1100, () => {
    sons.pulo();
    postal.querySelector(".presente").classList.add("entregue");
    postal.querySelector(".amigo").classList.add("feliz");
  });
  depois(1900, () => {
    rodada++;
    jogo.placar(`⭐ ${rodada}/${RODADAS}`);
    if (R.vai) pintarPaisagem(R.vai);
    postal.classList.remove("troca"); void postal.offsetWidth; postal.classList.add("troca");
    rb.classList.remove("anda");
    rb.src = `${RAIZ}/assets/rabisco/poses/frente.png`;
    depois(400, proximaRodada);
  });
}

function vencer() {
  const estrelas = erros <= 1 ? 3 : erros <= 3 ? 2 : 1;
  const nome = window.Familia?.crianca?.()?.nome;
  const titulo = nome ? `Muito bem, ${nome}!` : "Muito bem!";
  if (F.final) {
    jogo.vencer({ titulo, estrelas, texto: "Você deu a volta ao mundo e entregou todos os presentes!", extra: `<p class="vg-criacao">🌎 Que linda a natureza que Deus criou! Obrigado pela viagem!</p>`, fala: "vg-final" });
  } else if (F.criacao) {
    jogo.vencer({ titulo, estrelas, texto: `${F.nome}: você é um grande viajante!`, extra: `<p class="vg-criacao">🌎 Que linda a natureza que Deus criou!</p>`, fala: "vg-criacao" });
  } else {
    jogo.vencer({ titulo, estrelas, texto: `${F.nome}: você é um grande viajante!` });
  }
}

if (new URLSearchParams(location.search).has("teste")) {
  window.teste = {
    jogo,
    pedido: () => lista[rodada]?.certo,
    get rodada() { return rodada; },
    get erros() { return erros; },
    // espera a fala/animação acabar e toca na opção certa
    async acertar() {
      for (let i = 0; i < 60 && (ocupado || jogo.pausado) && jogo.estado === "jogando"; i++) await new Promise((r) => setTimeout(r, 100));
      if (jogo.estado !== "jogando") return false;
      const id = lista[rodada]?.certo;
      const alvo = cena.querySelector(`.painel [data-id="${id}"]`);
      if (!alvo) return false;
      escolher(id, alvo);
      return true;
    },
  };
}
