// Tela da TV (<site>/tv): QR + código para os celulares, as 2 vagas (1 · Rabisco, 2 · criança) com o jeito de cada um
// entrar (🎮 controle / 📱 celular) e a escolha do jogo. Navega com o controle remoto da TV (setas + OK), com o
// direcional + A do controle físico e com o celular (joystick move o foco, botão confirma).
// As vagas e a sala ficam em src/motor/salatv.js; ao abrir um jogo a sala continua a mesma (sessionStorage + voltarHost).

import { iniciarSalaTV, urlJogoTV } from "../src/motor/salatv.js";
import { ligarControle, focar, navegarComTeclado } from "../src/motor/controle.js";
import { qrSvg } from "../vendor/qr.js";
import { SALA_JOGOS } from "../src/config.js";
import { CAPAS } from "../src/portal-capas.js";
import "../src/motor/familia.js"; // window.Familia: nome e foto da criança (a foto só aparece aqui, nunca sai do aparelho)

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const crianca = () => { try { return window.Familia?.crianca?.() || null; } catch { return null; } };
const temGamepad = typeof navigator.getGamepads === "function"; // Smart TV Samsung/LG costuma não ter: aí é tudo pelo QR

// Jogos com 2 jogadores ao mesmo tempo (por enquanto). Capas do portal (assets/portal-capas/).
const JOGOS = [
  { id: "rabisco-kart", nome: "Rabisco Kart", dois: "🏁 Corrida a 2" },
  { id: "cidade-do-rabisco", nome: "Cidade do Rabisco", dois: "🏙️ Passeio a 2" },
  { id: "rabiscopolis", nome: "Rabiscolândia", dois: "🏙️ Passeio a 2" },
];

// ------------------------------------------------------------------ Sala e vagas
const tv = iniciarSalaTV({ layout: "padrao", pausar: false, liberarCaidos: true, nomeJ2: () => crianca()?.nome || "Jogador 2" });
window.Familia?.aoMudar?.(() => { tv.renomear(); desenharVagas(); });

// ------------------------------------------------------------------ Cards dos jogos
$("cards").innerHTML = JOGOS.map((j) => `
  <button class="card" type="button" data-jogo="${j.id}" aria-label="Jogar ${esc(j.nome)}">
    <span class="capa" style="${CAPAS.has(j.id) ? `background-image:url('../assets/portal-capas/${j.id}.webp?v=${CAPAS.versao}')` : ""}">
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

let saindo = false;
function abrirJogo(id) {
  if (saindo) return;
  const [v1, v2] = tv.vagas;
  if (!v1.tipo && !v2.tipo) {
    recado(SALA_JOGOS ? "Primeiro, alguém entra: aperte um botão do controle 🎮 ou leia o QR com o celular 📱" : "Primeiro, aperte um botão do controle 🎮");
    return;
  }
  if (quantos() === 2 && !(v1.tipo && v2.tipo)) {
    recado(`Faltam dois jogadores aqui: ${SALA_JOGOS ? "leia o QR 📱 ou aperte o controle 🎮" : "ligue outro controle 🎮"} — ou escolha 1 jogador`, 4000);
    return;
  }
  if (!v1.tipo) tv.subirVaga2(); // só tem o jogador 2: ele vira o Rabisco
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
const nomeJ2 = () => crianca()?.nome?.trim().split(/\s+/)[0] || "Jogador 2";
function rosto(n) {
  if (n === 1) return '<span class="rosto" style="background-image:url(\'../assets/rabisco/poses/frente.png\');background-size:250%;background-position:50% 27%"></span>';
  const f = crianca()?.foto;
  return f ? `<span class="rosto" style="background-image:url('${esc(f)}')"></span>` : '<span class="rosto" aria-hidden="true">🧒</span>';
}
function como(v) {
  if (!v.tipo) return { ic: "⏳", txt: SALA_JOGOS ? "Esperando: controle 🎮 ou celular 📱" : "Esperando um controle 🎮", classe: "livre" };
  if (v.tipo === "controle") {
    if (v.conectado) return { ic: "🎮", txt: `Controle ${v.pad + 1}`, selo: "✅" };
    if (v.caiu) return { ic: "🎮", txt: "O controle desconectou. Ligue de novo!", classe: "caiu" };
    return { ic: "🎮", txt: "Aperte um botão do controle", classe: "caiu" };
  }
  if (v.conectado) return { ic: "📱", txt: "Celular", selo: "✅" };
  return { ic: "📱", txt: "O celular desconectou… esperando voltar", classe: "caiu" };
}
function desenharVagas() {
  const n = quantos();
  for (const b of $("quantos").children) b.setAttribute("aria-pressed", String(Number(b.dataset.jogadores) === n));
  for (const v of tv.vagas) {
    const el = $(`vaga-${v.n}`);
    const c = n === 1 && v.n === 2 && !v.tipo ? { ic: "➕", txt: SALA_JOGOS ? "Quer entrar? Leia o QR 📱 (ou aperte o controle 🎮)" : "Quer entrar? Ligue outro controle 🎮", classe: "livre" } : como(v);
    el.className = `vaga ${c.classe ?? ""}${n === 1 && v.n === 2 && v.tipo ? " fora" : ""}`.trim();
    el.dataset.tipo = v.tipo ?? "";
    el.dataset.conectado = String(Boolean(v.conectado));
    el.innerHTML = `${rosto(v.n)}<span><span class="nome">${v.n} · ${esc(v.n === 1 ? "Rabisco" : nomeJ2())}</span>
      <span class="como"><span class="ic" aria-hidden="true">${c.ic}</span>${esc(c.txt)}</span></span>${c.selo ? `<span class="selo" aria-hidden="true">${c.selo}</span>` : ""}`;
  }
  // dica do controle: o navegador só "vê" o controle depois que alguém aperta um botão nele
  const livre = tv.vagas.some((v) => !v.tipo || (v.tipo === "controle" && !v.conectado));
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
    if (agora !== antes[i] && v.conectado && !saindo) recado(`${v.n === 1 ? "Rabisco" : nomeJ2()} entrou ${v.tipo === "controle" ? "com o controle 🎮" : "pelo celular 📱"}!${v.n === 2 && quantos() === 2 ? " Vão jogar 2!" : ""}`, 1800);
    antes[i] = agora;
  });
}

tv.on("mudou", () => { desenharSala(); desenharVagas(); anunciarEntradas(); });
tv.on("recado", (t) => recado(t, 4000));
desenharSala();
desenharVagas();

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
};
