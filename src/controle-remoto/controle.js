// Celular de controle (abre pelo QR da tela do jogo: src/controle-remoto/?s=CÓDIGO).
// Entra na sala do relay (contrato em .claude/tmp/protocolo-sala.md), mostra um controle grande no layout que o jogo
// pedir ("kart", "cidade", "plataforma", "padrao") e manda o que a criança aperta: { x, y, pulo, acao, baixo, seq },
// com y = +1 para CIMA. Reconecta sozinho (voltar + token guardado nesta aba) quando a tela apaga ou a rede cai.
// Nada de nome, foto ou dado pessoal sai daqui: o nome que aparece no topo vem da tela do jogo.

import { SALA_JOGOS } from "../config.js";

const $ = (id) => document.getElementById(id);
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ";
const CHAVE = "rabisco.controleRemoto"; // { codigo, id, token } desta aba (sessionStorage)
const params = new URLSearchParams(location.search);

const guardado = () => { try { return JSON.parse(sessionStorage.getItem(CHAVE)) || null; } catch { return null; } };
const guardar = (v) => { try { v ? sessionStorage.setItem(CHAVE, JSON.stringify(v)) : sessionStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ } };
const limparCodigo = (c) => [...String(c || "").toUpperCase()].filter((l) => ALFABETO.includes(l)).join("").slice(0, 4);

// ------------------------------------------------------------------ Telas
function mostrar(qual) {
  $("tela-entrar").hidden = qual !== "entrar";
  $("tela-recado").hidden = qual !== "recado";
  $("pad").hidden = qual !== "pad";
}
function recado(titulo, texto = "", { roda = true, botao = false } = {}) {
  $("recado-titulo").textContent = titulo;
  $("recado-texto").textContent = texto;
  $("recado-roda").classList.toggle("parada", !roda);
  $("recado-botao").hidden = !botao;
  mostrar("recado");
}
function telaEntrar(erro = "") {
  $("erro-entrar").textContent = erro;
  $("codigo").value = codigo || "";
  mostrar("entrar");
  setTimeout(() => $("codigo").focus(), 50);
}
const sinal = (e) => { $("sinal").dataset.estado = e; };

// ------------------------------------------------------------------ Conexão
let ws = null, codigo = limparCodigo(params.get("s")), sessao = guardado(), tentativas = 0, tReconectar = 0;
let parado = false; // sala acabou de vez (fim do jogo, sala expirou, código errado): não tenta mais sozinho
let hostFora = false;

function conectar() {
  clearTimeout(tReconectar);
  if (parado || !codigo) return;
  if (!SALA_JOGOS) { recado("Ainda não dá para jogar pelo celular", "O servidor de salas não está ligado. Use um controle 🎮 na tela do jogo.", { roda: false }); return; }
  sinal("conectando");
  let s;
  try { s = new WebSocket(SALA_JOGOS); } catch { agendar(); return; }
  ws = s;
  s.onopen = () => {
    if (sessao?.codigo === codigo && sessao.id && sessao.token) enviar({ t: "voltar", codigo, id: sessao.id, token: sessao.token });
    else enviar({ t: "entrar", codigo });
  };
  s.onmessage = (ev) => { if (s === ws) { let m; try { m = JSON.parse(ev.data); } catch { return; } tratar(m); } };
  s.onerror = () => {};
  s.onclose = (ev) => {
    if (s !== ws) return;
    ws = null;
    sinal("caiu");
    if (ev.reason === "sala-expirou") { fimDaSala("A sala do jogo fechou", "Leia o QR code de novo na tela do jogo."); return; }
    if (parado) return;
    if (!$("pad").hidden || tentativas > 0) mostrarAviso("Sem conexão… tentando de novo");
    agendar();
  };
}
function enviar(m) { if (ws?.readyState === 1) { try { ws.send(JSON.stringify(m)); return true; } catch { /* */ } } return false; }
function agendar() {
  if (parado) return;
  clearTimeout(tReconectar);
  const ms = Math.min(8000, 400 * 2 ** tentativas) * (0.8 + Math.random() * 0.4);
  tentativas++;
  tReconectar = setTimeout(conectar, ms);
  if ($("pad").hidden && $("tela-entrar").hidden) recado("Conectando…", "Procurando a sala do jogo.");
}
function fimDaSala(titulo, texto) {
  parado = true; guardar(null); sessao = null;
  try { ws?.close(); } catch { /* */ }
  ws = null;
  sinal("caiu");
  recado(titulo, texto, { roda: false, botao: true });
}

function tratar(m) {
  switch (m.t) {
    case "entrou":
      sessao = { codigo, id: m.id, token: m.token };
      guardar(sessao);
      tentativas = 0;
      sinal("ok");
      history.replaceState(null, "", `?s=${codigo}${params.get("sala") ? "&sala=" + encodeURIComponent(params.get("sala")) : ""}`);
      if (!hostFora) mostrarAviso("");
      mostrar("pad");
      montar(layout);
      enviarEstado(true);
      manterAcesa();
      break;
    case "erro":
      if (m.motivo === "token-invalido") { sessao = null; guardar(null); enviar({ t: "entrar", codigo }); } // vaga antiga expirou: entra de novo
      else if (m.motivo === "sala-nao-existe") {
        // estava jogando e a sala sumiu, ou o código está errado
        const estava = Boolean(sessao);
        sessao = null; guardar(null); parado = true;
        try { ws?.close(); } catch { /* */ }
        telaEntrar(estava ? "A sala do jogo fechou. Confira o código novo na tela do jogo." : "Sala não encontrada, confira o código.");
      } else if (m.motivo === "sala-cheia") { parado = true; telaEntrar("Essa sala já está cheia de celulares."); }
      else if (m.motivo === "codigo-invalido") { parado = true; telaEntrar("Esse código não existe. São 4 letras, como na tela do jogo."); }
      break;
    case "host-saiu":
      hostFora = true;
      mostrarAviso("O jogo saiu, esperando voltar…");
      break;
    case "host-voltou":
      hostFora = false;
      mostrarAviso("");
      break;
    case "do-host": doHost(m.d || {}); break;
  }
}

// recados da tela do jogo: layout, nome, cor, vibrar, msg, fim, pausar (mostra o botão ⏸)
function doHost(d) {
  if (typeof d.nome === "string" && d.nome) { $("chip-nome").textContent = d.nome.slice(0, 20); $("chip").hidden = false; document.title = `Controle · ${d.nome.slice(0, 20)}`; }
  if (typeof d.cor === "string" && /^#[0-9a-f]{3,8}$/i.test(d.cor)) document.documentElement.style.setProperty("--cor", d.cor);
  if (typeof d.layout === "string" && d.layout !== layout) montar(d.layout);
  if (typeof d.pausar === "boolean") $("pausar").hidden = !d.pausar;
  if (Number(d.vibrar) > 0) vibrar(Math.min(1000, Number(d.vibrar)));
  if (typeof d.msg === "string") { recadoDoJogo = d.msg.slice(0, 120); mostrarAviso(avisoAtual); }
  if (d.fim) fimDaSala("Obrigado por jogar! 💙", recadoDoJogo || "O jogo terminou.");
}
let recadoDoJogo = "", avisoAtual = "";
// faixa no alto do controle: problema de conexão tem prioridade sobre o recado do jogo
function mostrarAviso(texto) {
  avisoAtual = texto;
  const t = texto || recadoDoJogo;
  $("recado-jogo").textContent = t;
  $("recado-jogo").hidden = !t;
}
const vibrar = (ms) => { try { navigator.vibrate?.(ms); } catch { /* sem vibração (iPhone) */ } };

// ------------------------------------------------------------------ Estado da entrada
const estado = { x: 0, y: 0, pulo: false, acao: false, baixo: false, esq: false, dir: false, start: false };
let seq = 0, ultimoEnvio = 0, tEnvio = 0, ultimoTexto = "";
function enviarEstado(forcar = false) {
  const x = estado.esq || estado.dir ? (estado.dir ? 1 : 0) - (estado.esq ? 1 : 0) : estado.x;
  const d = { x: Math.round(x * 100) / 100, y: Math.round(estado.y * 100) / 100, pulo: estado.pulo, acao: estado.acao, baixo: estado.baixo };
  if (estado.start) d.start = true; // ⏸ apertado
  const txt = JSON.stringify(d);
  if (!forcar && txt === ultimoTexto) return;
  // até ~30 por segundo (o relay aceita 60): o joystick não entope a rede
  const agora = performance.now();
  if (!forcar && agora - ultimoEnvio < 33) { clearTimeout(tEnvio); tEnvio = setTimeout(() => enviarEstado(), 34); return; }
  if (enviar({ t: "in", d: { ...d, seq: ++seq } })) { ultimoTexto = txt; ultimoEnvio = agora; }
}
setInterval(() => { if (ws?.readyState === 1 && sessao) enviarEstado(true); }, 1000); // batimento: a tela sabe que o celular está vivo

// ------------------------------------------------------------------ Layouts
let layout = "padrao";
const LAYOUTS = {
  kart: { esq: ["esq", "dir"], dir: [["acao", "🎺", "Buzina"]] },
  cidade: { esq: ["joy"], dir: [["acao", "👋", "Ação"], ["pulo", "⬆", "Pulo", "menor"]] },
  plataforma: { esq: ["esq", "dir"], dir: [["pulo", "⬆", "Pulo"], ["baixo", "⬇", "", "baixo"]] },
  padrao: { esq: ["joy"], dir: [["pulo", "⬆", "Pulo"], ["acao", "⭐", "Ação", "menor"]] },
};
function botao(nome, ic, rotulo, extra = "") {
  const b = document.createElement("div");
  b.className = `btn ${nome} ${extra}`.trim();
  b.dataset.btn = nome;
  b.setAttribute("role", "button");
  b.setAttribute("aria-label", rotulo || nome);
  b.innerHTML = `<span><span class="ic">${ic}</span>${rotulo ? `<small>${rotulo}</small>` : ""}</span>`;
  return b;
}
function montar(qual) {
  layout = LAYOUTS[qual] ? qual : "padrao";
  const L = LAYOUTS[layout];
  soltarTudo();
  $("pad").dataset.layout = layout;
  const ze = $("zona-esq"), zd = $("zona-dir");
  ze.replaceChildren(); zd.replaceChildren();
  for (const e of L.esq) {
    if (e === "joy") { const j = document.createElement("div"); j.className = "joy"; j.dataset.joy = ""; j.innerHTML = '<div class="pino"></div>'; ze.append(j); }
    else ze.append(botao(e, e === "esq" ? "◀" : "▶", "", "seta"));
  }
  const col = L.dir.length > 1 ? document.createElement("div") : zd;
  if (col !== zd) { col.className = "coluna"; zd.append(col); }
  for (const [n, ic, r, extra] of L.dir) col.append(botao(n, ic, r, extra));
}

// ------------------------------------------------------------------ Toque (vários dedos ao mesmo tempo)
const dedos = new Map(); // pointerId → { tipo: "btn"|"joy", el, nome }
function aplicarBotoes() {
  const ativos = new Set([...dedos.values()].filter((d) => d.tipo === "btn").map((d) => d.nome));
  for (const k of ["esq", "dir", "pulo", "acao", "baixo"]) estado[k] = ativos.has(k);
  for (const b of document.querySelectorAll(".btn")) b.classList.toggle("apertado", ativos.has(b.dataset.btn));
  enviarEstado();
}
function moverJoy(d, ev) {
  const r = d.el.getBoundingClientRect();
  const raio = r.width * 0.36;
  let dx = (ev.clientX - (r.left + r.width / 2)) / raio, dy = (ev.clientY - (r.top + r.height / 2)) / raio;
  const m = Math.hypot(dx, dy);
  if (m > 1) { dx /= m; dy /= m; }
  if (m < 0.15) dx = dy = 0; // zona morta no meio
  estado.x = dx; estado.y = -dy; // y = +1 para cima
  d.el.querySelector(".pino").style.transform = `translate(${dx * raio}px, ${dy * raio}px)`;
  enviarEstado();
}
function soltarJoy(d) {
  estado.x = estado.y = 0;
  const p = d?.el?.querySelector(".pino");
  if (p) p.style.transform = "";
  enviarEstado();
}
const alvo = (x, y) => document.elementFromPoint(x, y)?.closest?.("[data-btn], [data-joy]");
$("pad").addEventListener("pointerdown", (ev) => {
  const el = alvo(ev.clientX, ev.clientY);
  if (!el) return;
  ev.preventDefault();
  try { $("pad").setPointerCapture(ev.pointerId); } catch { /* */ }
  if (el.dataset.joy !== undefined) { const d = { tipo: "joy", el }; dedos.set(ev.pointerId, d); moverJoy(d, ev); }
  else { dedos.set(ev.pointerId, { tipo: "btn", el, nome: el.dataset.btn }); vibrar(12); aplicarBotoes(); }
});
$("pad").addEventListener("pointermove", (ev) => {
  const d = dedos.get(ev.pointerId);
  if (!d) return;
  if (d.tipo === "joy") { moverJoy(d, ev); return; }
  // arrastar o dedo de ◀ para ▶ troca de botão (sem levantar)
  const el = alvo(ev.clientX, ev.clientY);
  const nome = el?.dataset.btn;
  if (nome && nome !== d.nome && el.classList.contains("seta") === d.el.classList.contains("seta")) { d.el = el; d.nome = nome; vibrar(8); aplicarBotoes(); }
});
const soltar = (ev) => {
  const d = dedos.get(ev.pointerId);
  if (!d) return;
  dedos.delete(ev.pointerId);
  if (d.tipo === "joy") soltarJoy(d); else aplicarBotoes();
};
$("pad").addEventListener("pointerup", soltar);
$("pad").addEventListener("pointercancel", soltar);
$("pad").addEventListener("contextmenu", (e) => e.preventDefault());
function soltarTudo() {
  dedos.clear();
  Object.assign(estado, { x: 0, y: 0, pulo: false, acao: false, baixo: false, esq: false, dir: false, start: false });
  $("pausar").classList.remove("apertado");
  for (const b of document.querySelectorAll(".btn.apertado")) b.classList.remove("apertado");
  enviarEstado();
}
addEventListener("blur", soltarTudo);

// ⏸ (jogando na TV): segura = Start apertado; vale como o Start do controle (pausa e continua)
{
  const b = $("pausar");
  const liga = (e) => { e.preventDefault(); estado.start = true; b.classList.add("apertado"); vibrar(12); enviarEstado(true); };
  const desliga = () => { if (!estado.start) return; estado.start = false; b.classList.remove("apertado"); enviarEstado(true); };
  b.addEventListener("pointerdown", liga);
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) b.addEventListener(ev, desliga);
  b.addEventListener("contextmenu", (e) => e.preventDefault());
}

// ------------------------------------------------------------------ Tela sempre acesa (Wake Lock) e volta da tela apagada
let trava = null;
async function manterAcesa() {
  try { if (!trava && "wakeLock" in navigator && !document.hidden) { trava = await navigator.wakeLock.request("screen"); trava.addEventListener("release", () => { trava = null; }); } } catch { /* sem permissão: segue */ }
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { soltarTudo(); return; }
  manterAcesa();
  if (!parado && codigo && (!ws || ws.readyState > 1)) { tentativas = 0; conectar(); }
});
addEventListener("online", () => { if (!parado && codigo && (!ws || ws.readyState > 1)) { tentativas = 0; conectar(); } });

// ------------------------------------------------------------------ Entrar com o código
$("codigo").addEventListener("input", (e) => { e.target.value = limparCodigo(e.target.value); });
$("form-codigo").addEventListener("submit", (e) => {
  e.preventDefault();
  const c = limparCodigo($("codigo").value);
  if (c.length !== 4) { $("erro-entrar").textContent = "O código tem 4 letras."; return; }
  if (c !== codigo) { sessao = null; guardar(null); }
  codigo = c; parado = false; tentativas = 0;
  try { document.documentElement.requestFullscreen?.({ navigationUI: "hide" })?.catch?.(() => {}); } catch { /* iPhone não tem */ }
  manterAcesa();
  recado("Conectando…", "Procurando a sala do jogo.");
  conectar();
});
$("recado-botao").addEventListener("click", () => telaEntrar(""));

// ------------------------------------------------------------------ Começo
montar("padrao");
if (!SALA_JOGOS) recado("Ainda não dá para jogar pelo celular", "O servidor de salas não está ligado. Use um controle 🎮 na tela do jogo.", { roda: false });
else if (codigo.length === 4) { recado("Conectando…", "Procurando a sala do jogo."); conectar(); }
else telaEntrar("");
// primeiro toque em qualquer lugar: pede a tela acesa (o navegador só deixa depois de um toque)
addEventListener("pointerdown", manterAcesa, { once: true });

// para o teste automático (ferramentas/teste/qr-controle.mjs)
window.controleTeste = {
  get estado() { return { ...estado }; },
  get layout() { return layout; },
  get conectado() { return ws?.readyState === 1 && Boolean(sessao) && !$("pad").hidden; },
  get sessao() { return sessao ? { codigo: sessao.codigo, id: sessao.id } : null; },
  derrubar() { try { ws?.close(); } catch { /* */ } }, // simula a rede caindo (reconecta sozinho)
};
