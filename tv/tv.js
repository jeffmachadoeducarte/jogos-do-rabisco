// Tela da TV (<site>/tv): QR + código para os celulares, as 2 vagas (1 · Rabisco, 2 · criança) com o jeito de cada um
// entrar (🎮 controle / 📱 celular) e a escolha do jogo. Navega com o controle remoto da TV (setas + OK), com o
// direcional + A do controle físico e com o celular (joystick move o foco, botão confirma).
// As vagas e a sala ficam em src/motor/salatv.js; ao abrir um jogo a sala continua a mesma (sessionStorage + voltarHost).

import { iniciarSalaTV, urlJogoTV } from "../src/motor/salatv.js";
import { ligarControle, focar, navegarComTeclado } from "../src/motor/controle.js";
import { qrSvg } from "../vendor/qr.js";
import { SALA_JOGOS } from "../src/config.js";
import { botaoEngrenagem } from "../src/motor/engrenagem.js";
import { CAPAS } from "../src/portal-capas.js";
import { JOGOS_NO_AR } from "../src/catalogo.js";
import "../src/motor/familia.js"; // window.Familia: nome e foto da criança (a foto só aparece aqui, nunca sai do aparelho)

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const crianca = () => { try { return window.Familia?.crianca?.() || null; } catch { return null; } };
const temGamepad = typeof navigator.getGamepads === "function"; // Smart TV Samsung/LG costuma não ter: aí é tudo pelo QR

// Jogos com 2 jogadores ao mesmo tempo. Capas do portal (assets/portal-capas/).
// Na TV aparecem só os que estão no ar no portal (src/catalogo.js, JOGOS_NO_AR): o Rabisco Kart está pronto aqui e
// volta sozinho quando "rabisco-kart" voltar para JOGOS_NO_AR. Com um jogo só, o painel vira um botão grande "JOGAR".
const JOGOS_TV = [
  { id: "rabisco-kart", nome: "Rabisco Kart", dois: "🏁 Corrida a 2" },
  { id: "rabiscopolis", nome: "Rabiscolândia", dois: "🏙️ Passeio a 1 ou 2" },
];
const JOGOS = JOGOS_TV.filter((j) => !JOGOS_NO_AR || JOGOS_NO_AR.includes(j.id));

// ------------------------------------------------------------------ Sala e vagas
const tv = iniciarSalaTV({ layout: "padrao", pausar: false, liberarCaidos: true, nomeJ2: () => crianca()?.nome || "Jogador 2" });
window.Familia?.aoMudar?.(() => { tv.renomear(); desenharVagas(); });

// ------------------------------------------------------------------ Cards dos jogos
const capa = (j) => (CAPAS.has(j.id) ? `background-image:url('../assets/portal-capas/${j.id}.webp?v=${CAPAS.versao}')` : "");
const umSo = JOGOS.length === 1;
$("cards").classList.toggle("um-so", umSo);
$("painel-jogos").classList.toggle("um-so", umSo);
$("cards").innerHTML = umSo
  ? JOGOS.map((j) => `
  <button class="card grande" type="button" data-jogo="${j.id}" aria-label="Jogar ${esc(j.nome)}">
    <span class="capa" style="${capa(j)}"></span>
    <span class="rotulo"><span class="play">JOGAR ▶</span><b>${esc(j.nome)}</b><span class="dois-txt">${esc(j.dois)}</span></span>
  </button>`).join("")
  : JOGOS.map((j) => `
  <button class="card" type="button" data-jogo="${j.id}" aria-label="Jogar ${esc(j.nome)}">
    <span class="capa" style="${capa(j)}">
      <span class="dois">${esc(j.dois)}</span><span class="jogar">Jogar ▶</span>
    </span>
    <b>${esc(j.nome)}</b>
  </button>`).join("");
$("cards").addEventListener("click", (e) => {
  const b = e.target.closest("[data-jogo]");
  if (b) abrirJogo(b.dataset.jogo);
});

// 1 ou 2 jogadores: o que a criança escolheu; sem escolha, 2 só se já tem alguém na vaga 2 (começa em 1 com um só conectado)
const quantos = () => tv.escolhido ?? (tv.vagas[1].tipo ? 2 : 1);
$("quantos").addEventListener("click", (e) => {
  const b = e.target.closest("[data-jogadores]");
  if (!b) return;
  const n = Number(b.dataset.jogadores);
  tv.escolher(n);
  if (n === 2 && !tv.vagas[1].tipo) recado(SALA_JOGOS ? "Para jogar a 2, o jogador 2 entra: controle 🎮 ou QR 📱" : "Para jogar a 2, ligue um segundo controle 🎮", 3200);
});

let saindo = false, perguntando = false;
// quem joga de fato: tem vaga E está conectado agora (celular que caiu não conta)
const joga = (v) => Boolean(v.tipo && v.conectado);
function abrirJogo(id, { nomesProntos = false } = {}) {
  if (saindo) return;
  let [v1, v2] = tv.vagas;
  // 1 jogador: quem está conectado vira o Rabisco (a vaga 1 pode ser um celular que caiu, e o controle ter ido para a 2)
  if (quantos() === 1 && !joga(v1) && joga(v2)) { tv.trocarVagas(); [v1, v2] = tv.vagas; }
  if (!v1.tipo && v2.tipo) { tv.subirVaga2(); [v1, v2] = tv.vagas; } // só tem o jogador 2: ele vira o Rabisco
  // ninguém entrou com controle nem celular: 1 jogador pelo teclado (computador no HDMI) / controle remoto da TV
  if (quantos() === 1 && !joga(v1) && (!v1.tipo || v1.tipo === "teclado")) { tv.entrarTeclado(); [v1, v2] = tv.vagas; }
  if (!joga(v1) && !joga(v2)) {
    recado(v1.tipo === "celular" ? "O celular do Rabisco desconectou: abra o controle no celular de novo 📱 ou aperte um botão do controle 🎮"
      : SALA_JOGOS ? "Primeiro, alguém entra: aperte um botão do controle 🎮 ou leia o QR com o celular 📱" : "Primeiro, aperte um botão do controle 🎮", 4000);
    return;
  }
  if (quantos() === 2 && !(joga(v1) && joga(v2))) {
    const falta = !v1.tipo || !v2.tipo;
    recado(falta ? `Faltam dois jogadores aqui: ${SALA_JOGOS ? "leia o QR 📱 ou aperte o controle 🎮" : "ligue outro controle 🎮"} — ou escolha 1 jogador`
      : "Um dos jogadores desconectou: espere voltar — ou escolha 1 jogador", 4000);
    return;
  }
  if (quantos() === 1 && !joga(v1)) { recado("O jogador 1 desconectou: espere voltar ou aperte um botão do controle 🎮", 4000); return; }
  // 2 jogadores: antes de abrir, cada um diz o nome (uma vez por pessoa nesta TV; pode pular)
  if (quantos() === 2 && !nomesProntos && !perguntando) {
    perguntando = true;
    tv.pedirNomes({ sugestao1: crianca()?.nome || "", quantos: 2 }).then(() => { perguntando = false; desenharVagas(); abrirJogo(id, { nomesProntos: true }); });
    return;
  }
  if (perguntando) return;
  saindo = true;
  tv.guardar();
  recado(`Abrindo ${JOGOS.find((j) => j.id === id)?.nome ?? "o jogo"}…`, 4000);
  location.href = urlJogoTV(id);
}

// ------------------------------------------------------------------ QR, código e endereço curto
let qrDe = null;
function desenharSala() {
  const s = tv.sala;
  let chave;
  if (!s) chave = "sem";
  else if (s.estado === "aberta" && s.codigo) chave = `ok:${s.codigo}`;
  else chave = s.estado;
  $("estado-sala").textContent = !s ? "" : s.estado === "aberta" ? "" : s.estado === "caiu" ? "Sem conexão com a sala… tentando de novo" : s.estado === "cheio" ? "Muita gente jogando agora… tentando de novo" : "Abrindo a sala…";
  if (chave === qrDe) return;
  qrDe = chave;
  if (chave === "sem") {
    $("qr").innerHTML = '<span class="sem">Celular de controle: em breve.<br>Por enquanto, use controles 🎮</span>';
    $("codigo").hidden = true;
    $("endereco").textContent = "";
    return;
  }
  if (!chave.startsWith("ok:")) { $("qr").innerHTML = '<span class="sem">Preparando o QR…</span>'; $("codigo").textContent = "····"; return; }
  const link = s.link;
  try { $("qr").innerHTML = qrSvg(link, { nivel: "M" }); } catch { $("qr").innerHTML = '<span class="sem">QR</span>'; }
  $("qr").setAttribute("aria-label", `QR code do controle, código ${s.codigo}`);
  $("codigo").hidden = false;
  $("codigo").textContent = s.codigo;
  const u = new URL(link);
  $("endereco").innerHTML = `Leia o QR com a câmera ou abra<br><b>${esc(u.host + u.pathname.replace(/\/$/, ""))}</b> e digite o código`;
}

// ------------------------------------------------------------------ Vagas
// nome de cada vaga: o que o jogador escreveu (src/motor/nomes.js) ou "Rabisco" / o primeiro nome do cadastro
const nomeVaga = (n) => tv.nomeDe(n).trim().split(/\s+/)[0] || (n === 1 ? "Rabisco" : "Jogador 2");
const nomeJ2 = () => nomeVaga(2);
function rosto(n) {
  if (n === 1) return '<span class="rosto" style="background-image:url(\'../assets/rabisco/poses/frente.png\');background-size:250%;background-position:50% 27%"></span>';
  const f = crianca()?.foto;
  return f ? `<span class="rosto" style="background-image:url('${esc(f)}')"></span>` : '<span class="rosto" aria-hidden="true">🧒</span>';
}
// estado de cada vaga, sempre com textos curtos (cabem numa linha da TV): vazio / celular / controle / desconectou
function como(v, n) {
  if (n === 1 && v.n === 2) {
    if (!v.tipo) return { ic: "➕", txt: SALA_JOGOS ? "Quer jogar junto? Leia o QR ou aperte um controle" : "Quer jogar junto? Ligue outro controle", classe: "livre fora" };
    return { ...como(v, 2), classe: `${como(v, 2).classe ?? ""} fora`, selo: "Fica de fora (1 jogador)", seloClasse: "esperando" };
  }
  if (!v.tipo) return { ic: "⏳", txt: SALA_JOGOS ? "Vazio: aperte um botão do controle ou leia o QR" : "Vazio: aperte um botão do controle", classe: "livre", selo: "" };
  if (v.tipo === "teclado") return { ic: "⌨️", txt: "Teclado ou controle remoto da TV", selo: "✓ Pronto" };
  if (v.tipo === "controle") {
    if (v.conectado) return { ic: "🎮", txt: `Controle ${v.pad + 1}`, selo: "✓ Pronto" };
    if (v.caiu) return { ic: "🎮", txt: "O controle desligou: ligue de novo", classe: "caiu", selo: "Esperando", seloClasse: "esperando" };
    return { ic: "🎮", txt: "Aperte um botão do controle", classe: "caiu", selo: "Esperando", seloClasse: "esperando" };
  }
  if (v.conectado) return { ic: "📱", txt: "Celular", selo: "✓ Pronto" };
  return { ic: "📱", txt: "Celular desconectou: esperando voltar", classe: "caiu", selo: "Esperando", seloClasse: "esperando" };
}
let falsas = null; // tvTeste.simularVagas (fotos de layout)
function desenharVagas() {
  const n = falsas?.n ?? quantos();
  for (const b of $("quantos").children) b.setAttribute("aria-pressed", String(Number(b.dataset.jogadores) === n));
  for (const v of falsas?.vagas ?? tv.vagas) {
    const el = $(`vaga-${v.n}`);
    const c = como(v, n);
    el.className = `vaga ${c.classe ?? ""}`.trim();
    el.dataset.tipo = v.tipo ?? "";
    el.dataset.conectado = String(Boolean(v.conectado));
    el.innerHTML = `${rosto(v.n)}<span class="texto"><span class="nome"><span class="quem">${v.n} · ${esc(nomeVaga(v.n))}</span></span>
      <span class="como"><span class="ic" aria-hidden="true">${c.ic}</span><span class="txt">${esc(c.txt)}</span></span></span><span class="selo ${c.seloClasse ?? ""}">${esc(c.selo ?? "")}</span>`;
  }
  // dica do controle: o navegador só "vê" o controle depois que alguém aperta um botão nele
  const livre = tv.vagas.some((v) => (v.n <= n && !v.tipo) || (v.tipo === "controle" && !v.conectado));
  const d = $("dica-controle");
  d.hidden = !livre && !tv.espera;
  d.classList.toggle("calma", !temGamepad);
  d.textContent = tv.espera ? "📱 As duas vagas estão ocupadas: os outros esperam a vez" : temGamepad ? "🎮 Aperte qualquer botão do controle" : "📱 Nesta TV, jogue com o celular: leia o QR";
}

// ------------------------------------------------------------------ Recado e "fulano entrou!"
let tRecado = 0;
function recado(texto, ms = 2600) {
  const r = $("recado");
  r.textContent = texto;
  r.hidden = false;
  clearTimeout(tRecado);
  tRecado = setTimeout(() => { r.hidden = true; }, ms);
}
const antes = tv.vagas.map((v) => `${v.tipo}:${v.conectado}`);
function anunciarEntradas() {
  tv.vagas.forEach((v, i) => {
    const agora = `${v.tipo}:${v.conectado}`;
    if (agora !== antes[i] && v.conectado && !saindo) recado(`${nomeVaga(v.n)} entrou ${v.tipo === "controle" ? "com o controle 🎮" : "pelo celular 📱"}!${v.n === 2 && quantos() === 2 ? " Vão jogar 2!" : ""}`, 1800);
    antes[i] = agora;
  });
}

tv.on("mudou", () => { desenharSala(); desenharVagas(); anunciarEntradas(); });
tv.on("recado", (t) => recado(t, 4000));
desenharSala();
desenharVagas();

// ⚙️ no canto (som e "Voltar ao normal", para quem transformou o tablet/celular em tela pela engrenagem do portal)
document.querySelector(".topo").append(botaoEngrenagem({ classe: "tv-engrenagem" }));

// ------------------------------------------------------------------ Navegação: controle remoto, gamepad e celular
const menu = $("menu");
const controle = ligarControle({
  menu: () => menu,
  aoStart: () => { const f = document.querySelector(".card.controle-foco, .card:focus"); (f || document.querySelector(".card"))?.click(); },
});
// controle sem dono apertando um botão: esse aperto é para ganhar a vaga, não para escolher o jogo
const padLivreApertando = () => [...(navigator.getGamepads?.() ?? [])].some((g) => g && !tv.vagas.some((v) => v.tipo === "controle" && v.pad === g.index) && g.buttons?.some((b) => b?.pressed));
(function quadro() {
  const recem = tv.ultimaEntrada && performance.now() - tv.ultimaEntrada.em < 500;
  if (recem || padLivreApertando()) controle.controle.ler(); // só atualiza o "antes" dos botões
  else controle.atualizar();
  requestAnimationFrame(quadro);
})();
// teclado e controle remoto da TV (setas + OK/Enter: o OK clica o card em foco, que é um botão de verdade)
addEventListener("keydown", (e) => { navegarComTeclado(menu, e); });
// o foco já começa no primeiro jogo
focar(document.querySelector(".card"));

// para o teste automático (ferramentas/teste/tv.mjs)
window.tvTeste = {
  get vagas() { return tv.vagas.map(({ n, tipo, pad, cel, conectado }) => ({ n, tipo, pad, cel, conectado })); },
  get sala() { return tv.sala; },
  get jogadores() { return quantos(); },
  get foco() { return document.querySelector(".controle-foco")?.dataset.jogo ?? null; },
  abrir: abrirJogo,
  // só para as fotos de layout (ferramentas/teste/tv-layout.mjs): desenha as vagas com um estado inventado; null volta ao real
  simularVagas(f) { falsas = f; desenharVagas(); },
};
