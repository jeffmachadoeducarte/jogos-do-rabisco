// Painel de entrada: a escola Educarte com o Rabisco acenando na frente (cena 3D "ultra realista"
// em src/portal3d.js). Por cima, os cartões de idade; cada um abre a grade de jogos daquela faixa
// (src/catalogo.js), com capa, selos e profundidade 3D (inclina ao passar o mouse ou tocar).
//
// Abertura rápida: a foto pré-renderizada da cena (assets/portal-entrada-*.webp) aparece na hora;
// a cena viva (three.js) só carrega depois que a página abriu e entra com um esmaecer suave.

import { faixas, estilos } from "./catalogo.js";
import { CAPAS } from "./portal-capas.js";
import { falar, preCarregarFalas, saudar } from "./motor/voz.js";
import { Familia } from "./motor/familia.js";
import { sons } from "./motor/sons.js";
import { ligarControle } from "./motor/controle.js";
import { registrarApp, pedirInstalacao, jaInstalado } from "./motor/instalar.js";
import "./motor/modotv.js"; // Modo TV (layout limpo) e a sugestão quando parece ligado numa TV
import { botaoEngrenagem } from "./motor/engrenagem.js";

const RAIZ = ".";
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ------------------------------------------------------------------ Cena 3D (sob demanda)
// "leve": celular/tablet ou aparelho modesto (menos grama, sombra menor, resolução 1,5x)
const leve = matchMedia("(max-width: 900px), (pointer: coarse)").matches
  || (navigator.deviceMemory || 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
const economia = navigator.connection?.saveData && !params.has("foto-cena");
let cena = null;
if (params.has("foto-cena")) document.body.classList.add("foto-cena");
function carregarCena() {
  import("./portal3d.js").then(({ iniciarCena }) => {
    cena = iniciarCena($("cena"), {
      raiz: RAIZ, leve: leve && !params.has("foto-cena"), quieto: reduzido, foto: params.has("foto-cena"),
      aoPronto: () => document.body.classList.add("cena-viva"),
    });
    ajustarRitmo();
  }).catch((e) => { console.warn("Cena 3D indisponível; fica a foto da escola.", e); });
}
if (!economia) {
  const ir = () => ("requestIdleCallback" in window ? requestIdleCallback(carregarCena, { timeout: 1200 }) : setTimeout(carregarCena, 150));
  if (document.readyState === "complete") ir(); else addEventListener("load", ir, { once: true });
}
const comemorar = () => cena?.comemorar();
// painel de jogos aberto: no celular ele cobre a cena (pausa); no computador, meio ritmo (rola mais liso)
function ajustarRitmo() {
  if (!cena) return;
  const cobre = !!faixaAberta && innerWidth <= 560;
  cena.pausar(cobre || document.hidden);
  cena.lento(!!faixaAberta);
}
addEventListener("resize", ajustarRitmo);
document.addEventListener("visibilitychange", ajustarRitmo);

// ------------------------------------------------------------------ Cartões de idade e jogos
const soIngles = $("so-ingles");
const filtrar = (jogos) => (soIngles.checked ? jogos.filter((j) => j.ingles) : jogos);
let faixaAberta = null;

function desenharFaixas() {
  $("faixas").innerHTML = faixas.map((f) => {
    const n = filtrar(f.jogos).length;
    return `<button class="faixa ${faixaAberta === f.id ? "aberta" : ""}" data-faixa="${f.id}" style="--cor:${f.cor}">
      <span class="emoji" aria-hidden="true">${f.emoji}</span>
      <strong>${f.nome}</strong>
      <span class="idade">${f.idade}</span>
      <span class="contagem">${n} ${n === 1 ? "jogo" : "jogos"}</span>
    </button>`;
  }).join("");
}

// Cartão de jogo: capa (foto do jogo ou arte com o ícone do estilo), selos de estilo/idade/inglês,
// botão de jogar sobre a capa, nome, descrição curta e a habilidade trabalhada.
// Qualquer jogo novo do catálogo funciona: sem capa em assets/portal-capas/, entra a arte de reserva.
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function cartaoJogo(j, f, i) {
  const pronto = j.status === "pronto";
  const est = estilos[j.estilo] || estilos.extra;
  const temCapa = CAPAS.has(j.id);
  const capa = temCapa
    ? `<img class="capa-foto" src="assets/portal-capas/${j.id}.webp?v=${CAPAS.versao}" alt="" width="640" height="400" loading="${i < 2 ? "eager" : "lazy"}" decoding="async">`
    : `<span class="capa-arte" aria-hidden="true">${est.icone}</span>`;
  const conteudo = `
    <div class="capa ${temCapa ? "" : "sem-foto"}" data-estilo="${esc(j.estilo)}">
      ${capa}
      <span class="capa-luz" aria-hidden="true"></span>
      <div class="selos">
        <span class="selo estilo">${est.icone} ${esc(est.nome)}</span>
        ${j.ingles ? '<span class="selo ingles">English</span>' : ""}
      </div>
      <span class="selo idade">${esc(f.idade)}</span>
      <span class="selo ${pronto ? "pronto" : "breve"}">${pronto ? "Jogar ▶" : "Em breve"}</span>
    </div>
    <div class="corpo">
      <h3>${esc(j.nome)}</h3>
      <p>${esc(j.desc)}</p>
      <span class="habilidade">${esc(j.habilidade)}</span>
    </div>`;
  const estilo = `style="--i:${Math.min(i, 8)}"`;
  return pronto
    ? `<a class="jogo pronto" href="jogos/${j.id}/" ${estilo} aria-label="${esc(j.nome)}: ${esc(j.habilidade)}">${conteudo}</a>`
    : `<div class="jogo breve" ${estilo}>${conteudo}</div>`;
}

// Profundidade 3D: o cartão inclina na direção do ponteiro (mouse) ou do dedo (ao tocar), com um
// brilho que acompanha. Um cartão por vez, atualizado no máximo uma vez por quadro.
function ligarInclinacao(lista) {
  if (reduzido) return;
  let ativo = null, px = 0, py = 0, pedido = 0;
  const aplicar = () => {
    pedido = 0;
    if (!ativo) return;
    const r = ativo.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (px - r.left) / r.width)), y = Math.min(1, Math.max(0, (py - r.top) / r.height));
    const s = ativo.style;
    s.setProperty("--rx", `${((0.5 - y) * 9).toFixed(2)}deg`);
    s.setProperty("--ry", `${((x - 0.5) * 11).toFixed(2)}deg`);
    s.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    s.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    s.setProperty("--dx", `${((0.5 - x) * 10).toFixed(1)}px`);
    s.setProperty("--dy", `${((0.5 - y) * 8).toFixed(1)}px`);
  };
  const soltar = () => {
    if (!ativo) return;
    ativo.classList.remove("inclinado");
    for (const v of ["--rx", "--ry", "--mx", "--my", "--dx", "--dy"]) ativo.style.removeProperty(v);
    ativo = null;
  };
  const mirar = (e) => {
    const c = e.target.closest?.(".jogo");
    if (c !== ativo) { soltar(); ativo = c; ativo?.classList.add("inclinado"); }
    px = e.clientX; py = e.clientY;
    if (ativo && !pedido) pedido = requestAnimationFrame(aplicar);
  };
  lista.addEventListener("pointermove", (e) => { if (e.pointerType !== "touch") mirar(e); });
  lista.addEventListener("pointerdown", mirar);
  lista.addEventListener("pointerleave", soltar);
  for (const fim of ["pointerup", "pointercancel"]) lista.addEventListener(fim, (e) => { if (e.pointerType === "touch") soltar(); });
  lista.addEventListener("scroll", soltar, { passive: true });
}
ligarInclinacao($("jogos"));

function abrirFaixa(id) {
  const f = faixas.find((x) => x.id === id);
  if (!f) return;
  faixaAberta = id;
  $("painel").style.setProperty("--cor", f.cor);
  $("painel-titulo").textContent = `${f.emoji} ${f.nome}`;
  $("painel-idade").textContent = f.idade;
  $("painel-nota").hidden = !f.nota;
  $("painel-nota").textContent = f.nota || "";
  const jogos = filtrar(f.jogos);
  $("painel-contagem").textContent = `${jogos.length} ${jogos.length === 1 ? "jogo" : "jogos"}`;
  $("jogos").innerHTML = jogos.length ? jogos.map((j, i) => cartaoJogo(j, f, i)).join("") : '<p class="vazio">Ainda não tem jogo de inglês nesta idade.</p>';
  $("jogos").scrollTop = 0;
  $("painel").hidden = false;
  $("boas-vindas").classList.add("recolhida");
  $("destaque").classList.add("recolhida");
  desenharFaixas();
  comemorar();
  sons.destravar();
  falar("portal-idade");
  ajustarRitmo();
}

function fecharPainel() {
  faixaAberta = null;
  $("painel").hidden = true;
  $("boas-vindas").classList.remove("recolhida");
  $("destaque").classList.remove("recolhida");
  desenharFaixas();
  ajustarRitmo();
}

$("faixas").addEventListener("click", (e) => {
  const b = e.target.closest("[data-faixa]");
  if (b) (faixaAberta === b.dataset.faixa ? fecharPainel() : abrirFaixa(b.dataset.faixa));
});
$("fechar").addEventListener("click", fecharPainel);
addEventListener("keydown", (e) => { if (e.key === "Escape") fecharPainel(); });
soIngles.addEventListener("change", () => { desenharFaixas(); if (faixaAberta) abrirFaixa(faixaAberta); });
// ⚙️ Configurações (src/motor/engrenagem.js): som liga/desliga (M no teclado) e "📺 Jogar na TV" com os 3 jeitos
// (aqui mesmo, + celular de controle, só controles). Fica no lugar do antigo 🔊.
$("som").replaceWith(botaoEngrenagem({ classe: "som", id: "som", atalhoM: true }));

// A narradora dá "oi" no primeiro toque (o navegador só deixa tocar som depois de um toque):
// com a criança cadastrada, chama pelo nome; antes do cadastro, boas-vindas neutras gravadas.
preCarregarFalas(["portal-oi", "portal-idade"]);
let cumprimentou = false;
addEventListener("pointerdown", (e) => {
  if (cumprimentou || e.target.closest("[data-faixa], .familia-tela, #familia")) return;
  cumprimentou = true;
  sons.destravar();
  if (!saudar({ gravada: false })) falar("portal-oi");
});

// ------------------------------------------------------------------ Família (cadastro antes do primeiro jogo)
const btnFamilia = $("familia");
function desenharFamilia() {
  const c = Familia.crianca();
  btnFamilia.innerHTML = `<span class="roda">${c?.foto ? `<img src="${c.foto}" alt="">` : "🧒"}</span><span>${c ? c.nome : "Família"}</span>`;
  btnFamilia.setAttribute("aria-label", c ? `Família: ${c.nome}. Editar cadastro` : "Cadastrar a família");
}
desenharFamilia();
Familia.aoMudar(desenharFamilia);
btnFamilia.addEventListener("click", () => Familia.abrirCadastro({ obrigatorio: false, titulo: "Nossa família" }));
// um jogo só abre depois do cadastro (uma vez por aparelho); o link segue depois de salvar
const pedirCadastroAntes = (seletor) => async (e) => {
  const a = e.target.closest(seletor);
  if (!a || Familia.completo() || params.has("semcadastro")) return;
  e.preventDefault();
  const salvou = await Familia.abrirCadastro({ obrigatorio: true });
  if (salvou) { comemorar(); setTimeout(() => { location.href = a.href; }, 350); }
};
$("jogos").addEventListener("click", pedirCadastroAntes("a.jogo.pronto"));
// destaque da tela inicial (Rabiscolândia): mesma regra do cadastro
$("destaque").addEventListener("click", pedirCadastroAntes("a.destaque"));
$("destaque").querySelector("img").src = `assets/portal-capas/rabiscopolis.webp?v=${CAPAS.versao}`;
// no celular em pé e no tablet o destaque fica logo acima das idades: acompanha a altura delas
if ("ResizeObserver" in window) {
  new ResizeObserver(([e]) => document.documentElement.style.setProperty("--faixas-h", `${Math.round(e.target.getBoundingClientRect().height)}px`)).observe($("faixas"));
}
if (params.has("cadastro")) Familia.abrirCadastro({ obrigatorio: params.get("cadastro") !== "editar" });

// Controle: direcional escolhe a idade ou o jogo, A abre, B volta para as idades
const controle = ligarControle({
  menu: () => (faixaAberta ? $("painel") : document.body),
  aoVoltar: () => { if (faixaAberta) { const id = faixaAberta; fecharPainel(); const b = document.querySelector(`[data-faixa="${id}"]`); if (b) controle.controle.focar(b); } },
  aoConectar: () => { sons.destravar(); },
});

// o controle (gamepad) é lido a cada quadro, com ou sem a cena 3D
(function lerControle() { controle.atualizar(); requestAnimationFrame(lerControle); })();

desenharFaixas();
// voltando de um jogo (index.html#/faixa/pequenos), o painel daquela idade já abre
const faixaDoEndereco = () => location.hash.match(/^#\/faixa\/([\w-]+)/)?.[1];
if (faixaDoEndereco()) abrirFaixa(faixaDoEndereco());
addEventListener("hashchange", () => { const f = faixaDoEndereco(); if (f) abrirFaixa(f); });

// App: instala na tela inicial (o pedido aparece assim que a pessoa entra)
registrarApp();
pedirInstalacao();
if (!jaInstalado()) {
  const b = $("instalar");
  b.hidden = false;
  b.addEventListener("click", () => pedirInstalacao({ forcar: true }));
}
