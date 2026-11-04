// Tela de abertura: a Rabiscolândia como jogo de verdade. A escola Educarte em 3D (src/portal3d.js) com
// sobrevoo da câmera até o Rabisco, que acena com o balão "Oi, <nome>!"; à esquerda o logo do jogo e o
// JOGAR enorme (toque, Enter, A do controle ou Start). Ao jogar: som 8-bit, o Rabisco comemora, a câmera
// avança até a porta e uma íris cobre a tela enquanto a cidade abre.
//
// O jogo da abertura é o primeiro de JOGOS_NO_AR (src/catalogo.js). Se voltar a ter mais jogos no ar,
// os outros aparecem em miniatura embaixo dos botões (#mais-jogos), sem mexer aqui.
//
// Abertura rápida: a foto pré-renderizada da cena (assets/portal-entrada-*.webp) aparece na hora;
// a cena viva (three.js) só carrega depois que a página abriu e entra com um esmaecer suave.

import { jogosNoAr, estilos } from "./catalogo.js";
import { CAPAS } from "./portal-capas.js";
import { falar, preCarregarFalas, saudar } from "./motor/voz.js";
import { Familia } from "./motor/familia.js";
import { sons } from "./motor/sons.js";
import { ligarControle, focar, moverFoco, modalAtivo } from "./motor/controle.js";
import { registrarApp, pedirInstalacao, jaInstalado } from "./motor/instalar.js";
import { saldo } from "./motor/rabiscoins.js";
import "./motor/modotv.js"; // Modo TV (layout limpo) e a sugestão quando parece ligado numa TV
import { botaoEngrenagem } from "./motor/engrenagem.js";

const RAIZ = ".";
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const toque = matchMedia("(pointer: coarse)").matches;
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ------------------------------------------------------------------ o jogo da abertura
const destaque = jogosNoAr[0]?.jogo;
const btnJogar = $("jogar");
if (destaque) {
  btnJogar.href = `jogos/${destaque.id}/`;
  btnJogar.setAttribute("aria-label", `Jogar ${destaque.nome}`);
  if (destaque.id !== "rabiscopolis") {
    // outro jogo na abertura: o título e o slogan vêm do catálogo
    $("titulo-jogo").textContent = destaque.nome;
    $("titulo-jogo").removeAttribute("aria-label");
    $("slogan").textContent = destaque.desc;
    $("destaques").hidden = true;
  }
}
// outros jogos no ar: miniaturas com a capa
const outros = jogosNoAr.slice(1);
if (outros.length) {
  const nav = $("mais-jogos");
  nav.hidden = false;
  nav.innerHTML = outros.map(({ jogo: j }) => {
    const est = estilos[j.estilo] || estilos.extra;
    const capa = CAPAS.has(j.id) ? `<img src="assets/portal-capas/${j.id}.webp?v=${CAPAS.versao}" alt="" width="96" height="60" loading="lazy" decoding="async">` : `<span class="arte">${est.icone}</span>`;
    return `<a class="mini" href="jogos/${j.id}/">${capa}<span>${esc(j.nome)}</span></a>`;
  }).join("");
}

// ------------------------------------------------------------------ Cena 3D (sob demanda)
// "leve": celular/tablet ou aparelho modesto (menos grama, sombra menor, resolução 1,5x)
const leve = matchMedia("(max-width: 900px), (pointer: coarse)").matches
  || (navigator.deviceMemory || 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
const economia = navigator.connection?.saveData && !params.has("foto-cena");
let cena = null;
if (params.has("foto-cena")) document.body.classList.add("foto-cena");

// balão do Rabisco: acompanha a cabeça dele (a cena avisa a posição a cada quadro)
const balao = $("balao");
let balaoX = -1, balaoY = -1, balaoVisivel = false;
function seguirBalao({ x, y, chegou }) {
  const mostra = chegou && !document.body.classList.contains("saindo");
  if (mostra !== balaoVisivel) { balaoVisivel = mostra; balao.classList.toggle("visivel", mostra); }
  if (!mostra) return;
  if (Math.abs(x - balaoX) < 0.4 && Math.abs(y - balaoY) < 0.4) return;
  balaoX = x; balaoY = y;
  balao.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
}

function carregarCena() {
  import("./portal3d.js").then(({ iniciarCena }) => {
    cena = iniciarCena($("cena"), {
      raiz: RAIZ, leve: leve && !params.has("foto-cena"), quieto: reduzido, foto: params.has("foto-cena"),
      aoPronto: () => document.body.classList.add("cena-viva"),
      aoQuadro: params.has("foto-cena") ? null : seguirBalao,
    });
    ajustarRitmo();
  }).catch((e) => { console.warn("Cena 3D indisponível; fica a foto da escola.", e); });
}
if (!economia) {
  const ir = () => ("requestIdleCallback" in window ? requestIdleCallback(carregarCena, { timeout: 1200 }) : setTimeout(carregarCena, 150));
  if (document.readyState === "complete") ir(); else addEventListener("load", ir, { once: true });
}
// a cena para quando a aba fica em segundo plano
function ajustarRitmo() { cena?.pausar(document.hidden); }
document.addEventListener("visibilitychange", ajustarRitmo);

// ------------------------------------------------------------------ saudação com o nome da criança
function desenharSaudacao() {
  const c = Familia.crianca();
  const nome = c?.nome?.trim().split(/\s+/)[0];
  balao.innerHTML = `<div class="balao-corpo">${nome ? `Oi, <b>${esc(nome)}</b>!` : "Oi!"}<small>Vamos brincar?</small></div>`;
}

// ------------------------------------------------------------------ JOGAR (com transição)
// O clique é tratado no documento (depois de qualquer outro ouvinte do link): se alguém já barrou o
// clique, não faz nada. Ctrl/⌘/botão do meio abrem em outra aba como um link comum.
let saindo = false;
function jogar(origem = btnJogar) {
  if (saindo) return;
  saindo = true;
  const destino = btnJogar.href;
  const r = origem.getBoundingClientRect();
  const cortina = $("cortina");
  cortina.style.setProperty("--cx", `${Math.round(r.left + r.width / 2)}px`);
  cortina.style.setProperty("--cy", `${Math.round(r.top + r.height / 2)}px`);
  const aro = document.querySelector(".cortina-aro");
  aro.style.setProperty("--cx", cortina.style.getPropertyValue("--cx"));
  aro.style.setProperty("--cy", cortina.style.getPropertyValue("--cy"));
  document.body.classList.add("saindo");
  try { sons.destravar(); sons.porta(); } catch { /* sem som */ }
  cena?.entrar();
  const espera = reduzido ? 120 : 1150;
  setTimeout(() => cortina.classList.add("fechada"), reduzido ? 0 : 520);
  setTimeout(() => location.assign(destino), espera);
}
document.addEventListener("click", (e) => {
  const a = e.target.closest?.("a.jogar");
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  jogar(a);
});
// voltou pelo "voltar" do navegador e a página veio guardada: tudo de volta no lugar
addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  saindo = false;
  document.body.classList.remove("saindo");
  $("cortina").classList.remove("fechada");
  cena?.reiniciar();
});

// dica embaixo do JOGAR: muda com o jeito de jogar (toque, teclado ou controle)
const dica = $("dica");
function desenharDica(jeito) {
  dica.dataset.jeito = jeito;
  dica.innerHTML = jeito === "controle" ? `Aperte <kbd class="a">A</kbd> para entrar na cidade`
    : jeito === "toque" ? "Toque em JOGAR para entrar na cidade"
      : `Aperte <kbd>Enter</kbd> para entrar na cidade`;
}
desenharDica(toque ? "toque" : "teclado");

// ⚙️ Configurações (src/motor/engrenagem.js): som liga/desliga (M no teclado) e "📺 Jogar na TV" com os 3 jeitos.
const eng = botaoEngrenagem({ classe: "sec", id: "som", atalhoM: true });
eng.innerHTML = `<span class="ico" aria-hidden="true">⚙️</span><span class="rot">Configurações</span>`;
$("som").replaceWith(eng);

// A narradora dá "oi" no primeiro toque (o navegador só deixa tocar som depois de um toque):
// com a criança cadastrada, chama pelo nome; antes do cadastro, boas-vindas neutras gravadas.
preCarregarFalas(["portal-oi", "portal-idade"]);
let cumprimentou = false;
addEventListener("pointerdown", (e) => {
  if (cumprimentou || e.target.closest(".familia-tela, #familia, a.jogar")) return;
  cumprimentou = true;
  sons.destravar();
  Promise.resolve(saudar({ gravada: false })).then((ok) => { if (!ok) falar("portal-oi"); }).catch(() => {});
});

// ------------------------------------------------------------------ Família e progresso (canto de cima)
const btnFamilia = $("familia");
function desenharFamilia() {
  const c = Familia.crianca();
  btnFamilia.innerHTML = `<span class="roda">${c?.foto ? `<img src="${c.foto}" alt="">` : "🧒"}</span><span class="nome">${c ? esc(c.nome.trim().split(/\s+/)[0]) : "Família"}</span>`;
  btnFamilia.setAttribute("aria-label", c ? `Família: ${c.nome}. Editar cadastro` : "Cadastrar a família");
  desenharSaudacao();
}
desenharFamilia();
Familia.aoMudar(desenharFamilia);
btnFamilia.addEventListener("click", () => Familia.abrirCadastro({ obrigatorio: false, titulo: "Nossa família" }));
if (params.has("cadastro")) Familia.abrirCadastro({ obrigatorio: params.get("cadastro") !== "editar" });

// Rabiscoins guardadas neste aparelho (só aparece quando já tem alguma)
try {
  const s = saldo();
  if (s > 0) { const m = $("moedas"); m.hidden = false; m.innerHTML = `<span class="moeda" aria-hidden="true"></span>${s.toLocaleString("pt-BR")}`; m.title = "Rabiscoins"; }
} catch { /* sem armazenamento */ }

// ------------------------------------------------------------------ Controle e teclado
// Direcional anda entre JOGAR, os botões e o perfil; A clica; Start joga direto.
const controle = ligarControle({
  menu: () => document.body,
  aoStart: () => { if (!modalAtivo()) jogar(); },
  aoConectar: () => {
    sons.destravar();
    desenharDica("controle");
    if (!modalAtivo() && !document.querySelector(".controle-foco")) focar(btnJogar);
  },
});
(function lerControle() { controle.atualizar(); requestAnimationFrame(lerControle); })();

addEventListener("keydown", (e) => {
  if (saindo || modalAtivo() || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target?.matches?.("input, textarea, select, [contenteditable]") || e.target?.closest?.(".familia-tela, .eng-tela")) return;
  if (/^Arrow/.test(e.key)) {
    e.preventDefault();
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!document.querySelector(".controle-foco") && document.activeElement === document.body) focar(btnJogar);
    else moverFoco(document.body, ...d);
    return;
  }
  // Enter/Espaço sem nada em foco: joga (com algo em foco, o próprio botão recebe o clique)
  if ((e.key === "Enter" || e.key === " ") && (document.activeElement === document.body || !document.activeElement)) {
    e.preventDefault();
    jogar();
  }
});

// App: instala na tela inicial (o pedido aparece assim que a pessoa entra)
registrarApp();
pedirInstalacao();
if (!jaInstalado()) {
  const b = $("instalar");
  b.hidden = false;
  b.addEventListener("click", () => pedirInstalacao({ forcar: true }));
}
