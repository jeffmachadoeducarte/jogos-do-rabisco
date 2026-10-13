// Dois jogadores no mesmo aparelho. O Rabisco é SEMPRE o jogador 1 (protagonista); o jogador 2 é a
// criança-companheira (src/motor/companheiro.js / src/motor3d/companheiro3d.js, rosto = foto do cadastro).
//
// Entrada do jogador 2, por prioridade (recalculada ao vivo quando um controle conecta/desconecta):
//   1. um controle físico (Gamepad API, Bluetooth/USB): com 2 controles, o 2º é do jogador 2; com 1 controle,
//      ele é do jogador 2 e o jogador 1 fica com o toque (celular/tablet) ou com as setas (computador);
//   2. no computador, teclado dividido: jogador 1 = setas (+ Enter / Shift direito), jogador 2 = WASD + Espaço + F;
//   3. celular de controle por QR code (src/motor/sala.js + página src/controle-remoto/): precisa do servidor de salas
//      (SALA_JOGOS em src/config.js). Vazio = "em breve". Com o celular conectado ele vale como o controle do jogador 2
//      (no computador, passa na frente do teclado dividido); se um controle físico conectar, o controle físico assume.
//
// Dois tipos de jogo:
//   - "simultaneo": os dois jogam ao mesmo tempo (Cidade, Kart). O jogo lê o jogador 2 com `Jogadores.ler2()`.
//   - "revezamento": todo jogo da casca (src/motor/casca.js) sem editar o jogo: "Agora é a vez de {nome}!" a cada
//     fase/rodada, placar dos dois no fim. Cada um joga na sua vez com o mesmo toque/teclado/controle.
//
//   import { Jogadores } from "../../src/motor/jogadores.js";
//   Jogadores.configurar({ tipo: "simultaneo" });
//   abertura.append(Jogadores.escolha());       // "Quantos vão jogar?" + quem é quem
//   Jogadores.ativo / Jogadores.j2Pronto / Jogadores.tecladoDividido
//   const j2 = Jogadores.ler2();                // { x, y, pulo, puloNovo, acao, acaoNova }
//
// TV como tela (página tv/ → jogo com ?tv=1, src/motor/salatv.js): os DOIS jogadores são remotos (controle físico ou
// celular), cada um na sua vaga da sala da TV. Jogadores.tv = true, Jogadores.ler1() lê o jogador 1 como o ler2() lê o 2,
// o modo (1 ou 2) vem de quem está nas vagas e a abertura mostra só "quem é quem". Fora da TV nada disso muda.

import { reservarGamepad, lerGamepad } from "./controle.js";
import { pausaAtual } from "./pausa.js";
import { falar, falarSequencia, audioDoNome } from "./voz.js";
import { criarCompanheiro } from "./companheiro.js";
import { SALA_JOGOS } from "../config.js";
import { criarSala } from "./sala.js";
import { qrSvg } from "../../vendor/qr.js";
import { emModoTV, iniciarSalaTV, voltarParaTV } from "./salatv.js";

const RAIZ = new URL("../..", import.meta.url).href.replace(/\/$/, "");
const CHAVE = "rabisco.jogadores"; // 1 ou 2, lembrado só nesta visita (sessionStorage) e SÓ onde não é aparelho de toque
export const COR_J1 = "#00b5f0", COR_J2 = "#ec2e8c";
// teclado dividido (computador): o jogador 2 fica com estas teclas; o jogador 1 com as setas e as teclas do remapear que sobrarem
export const TECLAS_J2 = { esq: ["KeyA"], dir: ["KeyD"], cima: ["KeyW"], baixo: ["KeyS"], pulo: ["Space"], acao: ["KeyF"] };
export const CODIGOS_J2 = new Set(Object.values(TECLAS_J2).flat());
export const TECLAS_J1_EXTRA = { pulo: ["ShiftRight", "Numpad0"], acao: ["Enter"] };

const ehToque = () => "ontouchstart" in window || navigator.maxTouchPoints > 0;
const crianca = () => { try { return window.Familia?.crianca?.() || null; } catch { return null; } };
// Celular/tablet (toque) SEMPRE abre em 1 jogador: ali o jogador 2 depende de controle ou QR, e lembrar o "2" de outro jogo
// fazia o próximo pedir "conecte um controle" a quem só queria jogar pelo toque. No computador o teclado dividido não pede nada.
const lerModo = () => { if (ehToque()) return 1; try { return Number(sessionStorage.getItem(CHAVE)) === 2 ? 2 : 1; } catch { return 1; } };
const params = new URLSearchParams(location.search);

const ICONES = { controle: "🎮", teclado: "⌨️", toque: "👆", qr: "📱", celular: "📱", revezar: "🔄" };
const ROTULOS = {
  controle: (j) => `Controle ${j.pad != null ? j.pad + 1 : ""}`.trim(),
  teclado: (j) => (j.n === 1 ? "Setas · Enter · Shift dir." : "W A S D · Espaço · F"),
  toque: () => "Toque na tela",
  qr: () => (SALA_JOGOS ? "Celular de controle (QR)" : "Celular de controle: em breve"),
  celular: () => "Celular de controle ✓",
};
// layout dos botões no celular, por jogo (o jogo pode mandar o seu em Jogadores.configurar({ layout }))
const layoutDoCaminho = () => (/rabisco-kart/.test(location.pathname) ? "kart" : /cidade-do-rabisco/.test(location.pathname) ? "cidade" : /super-rabisco/.test(location.pathname) ? "plataforma" : "padrao");

// ------------------------------------------------------------------ Estado
let tipo = "revezamento";
let modo = params.has("jogadores") ? (params.get("jogadores") === "2" ? 2 : 1) : lerModo();
let emJogo = false;
const j1 = { n: 1, nome: "Rabisco", cor: COR_J1, entrada: "toque", pad: null };
const j2 = { n: 2, nome: "Jogador 2", cor: COR_J2, entrada: "qr", pad: null, foto: null };
const ouvintes = new Set();
let aoDesconectarJ2 = null; // o jogo pode pausar; a casca/o Kart já pausam no gamepaddisconnected
let layout = layoutDoCaminho();
// celular de controle do jogador 2 (via sala): { id, nome, d: última entrada, visto: ms, puloPend, acaoPend }
let sala = null, cel = null;

function padsConectados() {
  return [...(navigator.getGamepads?.() ?? [])].filter((g) => g && g.connected !== false).map((g, i) => g.index ?? i).sort((a, b) => a - b);
}
function atribuir() {
  const c = crianca();
  j2.nome = c?.nome || "Jogador 2";
  j2.foto = c?.foto || null;
  if (tv) { atribuirTV(); return; }
  const pads = padsConectados();
  const toque = ehToque();
  // no meio da partida, o controle do jogador 1 continua dele (se o do jogador 2 cair, não "pula" para o outro)
  if (emJogo && modo === 2 && j1.entrada === "controle" && pads.includes(j1.pad)) {
    const outros = pads.filter((p) => p !== j1.pad);
    j2.entrada = outros.length ? "controle" : cel ? "celular" : toque ? "qr" : "teclado"; j2.pad = outros[0] ?? null;
  } else if (pads.length >= 2) { j1.entrada = "controle"; j1.pad = pads[0]; j2.entrada = "controle"; j2.pad = pads[1]; }
  else if (pads.length === 1) { j1.entrada = toque ? "toque" : "teclado"; j1.pad = null; j2.entrada = "controle"; j2.pad = pads[0]; }
  else { j1.entrada = toque ? "toque" : "teclado"; j1.pad = null; j2.entrada = cel ? "celular" : toque ? "qr" : "teclado"; j2.pad = null; }
  aplicarReserva();
  cuidarDaSala();
  // o celular fica sabendo quando um controle físico assume (e quando volta a valer)
  if (cel && sala) {
    const vale = j2.entrada === "celular";
    if (vale !== cel.vale) { cel.vale = vale; sala.enviar(cel.id, { msg: vale ? "" : "Um controle 🎮 assumiu o jogador 2. Pode descansar o celular!" }); }
  }
  for (const cb of ouvintes) { try { cb(api); } catch { /* ouvinte com erro não trava */ } }
}
// ------------------------------------------------------------------ Sala do celular de controle (QR)
// Só abre com servidor configurado e no modo 2 jogadores simultâneo; voltou para 1 jogador = fecha.
const querSala = () => Boolean(SALA_JOGOS) && modo === 2 && tipo === "simultaneo" && !emModoTV;
const primeiroNome = (n) => String(n || "").trim().split(/\s+/)[0].slice(0, 20); // só o nome curto vai para o celular
const celularNovo = (c) => ({ id: c.id, nome: c.nome, d: { x: 0, y: 0, pulo: false, acao: false, baixo: false }, visto: 0, puloPend: false, acaoPend: false, vale: undefined });
function cuidarDaSala() {
  if (querSala()) { if (!sala) abrirSala(); return; }
  if (!sala) return;
  const s = sala;
  sala = null; cel = null;
  s.enviar("*", { msg: "O jogo voltou para 1 jogador. Obrigado por jogar!", fim: true });
  setTimeout(() => s.fechar(), 300);
}
function configurarCelular() {
  if (cel && sala) sala.enviar(cel.id, { layout, nome: primeiroNome(j2.nome), cor: j2.cor, vibrar: 80, msg: "" });
}
function abrirSala() {
  const s = criarSala();
  if (!s) return;
  sala = s;
  const minha = () => s === sala;
  s.on("estado", () => { if (minha()) atribuir(); });
  s.on("chegou", (c) => {
    if (!minha()) return;
    if (cel && cel.id !== c.id) { s.enviar(c.id, { nome: "Espere a vez", msg: "Já tem um celular jogando. Espere a vez dele terminar!" }); return; }
    const voltou = avisoAberto("celular");
    cel = celularNovo(c);
    atribuir();
    configurarCelular();
    if (voltou && j2.entrada === "celular") {
      fecharAviso();
      mostrarBanner([h("h2", { texto: `Celular ${artigo(j2)} ${j2.nome} de volta! 📱` })], j2.cor, 1600);
      legenda();
    }
  });
  s.on("saiu", (c) => {
    if (!minha() || cel?.id !== c.id) return;
    const caiu = modo === 2 && tipo === "simultaneo" && emJogo && j2.entrada === "celular";
    cel = null;
    const outro = s.controles.find((x) => x.id !== c.id); // outro celular esperando a vez assume
    if (outro) cel = celularNovo(outro);
    atribuir();
    if (outro) configurarCelular();
    if (caiu && j2.entrada !== "celular" && j2.entrada !== "controle") { aoDesconectarJ2?.(); avisoDesconectou("celular"); }
    else if (emJogo) legenda();
  });
  s.on("in", (c, d) => {
    if (!minha() || cel?.id !== c.id) return;
    if (d.pulo && !cel.d.pulo) cel.puloPend = true;
    if (d.acao && !cel.d.acao) cel.acaoPend = true;
    cel.d = d; cel.visto = performance.now();
  });
}

function aplicarReserva() {
  // durante a partida simultânea, o controle do jogador 2 não move o Rabisco
  reservarGamepad(emJogo && modo === 2 && tipo === "simultaneo" && j2.entrada === "controle" ? [j2.pad] : []);
  tv?.reservar(emJogo && modo === 2 && tipo === "simultaneo" ? 2 : null); // TV: o celular do jogador 2 também
}

// ------------------------------------------------------------------ TV como tela (src/motor/salatv.js)
// tv = sala da TV desta página (só existe com ?tv=1 e a TV guardada nesta aba). Abre no primeiro configurar().
let tv = null;
function ligarTV() {
  if (tv || !emModoTV) return;
  tv = iniciarSalaTV({ layout, pausar: true, permitirNovos: () => !emJogo, nomeJ2: () => crianca()?.nome || "Jogador 2" });
  tv.on("mudou", () => atribuir());
  tv.on("caiu", (v) => {
    if (!emJogo) return;
    const j = v.n === 1 ? j1 : j2;
    if (v.n === 2 && modo !== 2) return;
    if (v.n === 2) aoDesconectarJ2?.(); else pausaDoJogo?.();
    avisoDesconectou(v.tipo === "celular" ? "celular" : "controle", j);
  });
  tv.on("voltou", (v) => {
    const j = v.n === 1 ? j1 : j2;
    if (avisoAberto() && aviso.j === j) {
      fecharAviso();
      mostrarBanner([h("h2", { texto: `${v.tipo === "celular" ? "Celular" : "Controle"} ${artigo(j)} ${j.nome} de volta! ${v.tipo === "celular" ? "📱" : "🎮"}` })], j.cor, 1600);
    }
  });
  tv.on("recado", (t) => mostrarBanner([h("h2", { texto: t, style: "font-size:clamp(22px,3.4vw,34px)" })], "#151515", 4000));
  document.documentElement.classList.add("sala-tv");
}
function atribuirTV() {
  const [v1, v2] = tv.vagas;
  j1.entrada = v1.tipo || "qr"; j1.pad = v1.tipo === "controle" ? v1.pad : null;
  j2.entrada = v2.tipo || "qr"; j2.pad = v2.tipo === "controle" ? v2.pad : null;
  // o modo vem da escolha na TV (1 jogador) ou das vagas: com alguém na vaga 2 são 2 jogadores (durante a partida não muda sozinho)
  if (!emJogo) modo = tv.jogadores;
  aplicarReserva();
  for (const cb of ouvintes) { try { cb(api); } catch { /* ouvinte com erro não trava */ } }
}
// pausa do jogo quando o jogador 1 cai na TV (o jogo informa em configurar({ aoPausar }); senão, a pausa comum)
let pausaDoJogo = null;

// ------------------------------------------------------------------ Leitura do jogador 2 (simultâneo)
const teclas = new Set();
addEventListener("keydown", (e) => { if (CODIGOS_J2.has(e.code)) teclas.add(e.code); });
addEventListener("keyup", (e) => teclas.delete(e.code));
addEventListener("blur", () => teclas.clear());
let antes = { pulo: false, acao: false };
function ler2() {
  const r = { x: 0, y: 0, pulo: false, puloNovo: false, acao: false, acaoNova: false, giro: 0 };
  if (modo !== 2) return r;
  if (tv) return tv.ler(2);
  if (j2.entrada === "controle") {
    const g = lerGamepad(j2.pad);
    r.x = g.eixoX || ((g.segura.dir ? 1 : 0) - (g.segura.esq ? 1 : 0));
    r.y = -(g.eixoY || ((g.segura.baixo ? 1 : 0) - (g.segura.cima ? 1 : 0)));
    r.pulo = g.segura.pulo; r.acao = g.segura.acao; r.giro = g.eixoGX;
  } else if (j2.entrada === "teclado") {
    const tem = (k) => TECLAS_J2[k].some((c) => teclas.has(c));
    r.x = (tem("dir") ? 1 : 0) - (tem("esq") ? 1 : 0);
    r.y = (tem("cima") ? 1 : 0) - (tem("baixo") ? 1 : 0);
    r.pulo = tem("pulo"); r.acao = tem("acao");
  } else if (j2.entrada === "celular" && cel) {
    // sem notícia do celular há 3,5 s (o batimento é de 1 s): solta tudo, para o kart não seguir virando sozinho
    const d = performance.now() - cel.visto < 3500 ? cel.d : null;
    if (d) { r.x = d.x; r.y = d.y; }
    // toque rápido (apertou e soltou entre dois quadros) ainda conta uma vez
    r.pulo = Boolean(d?.pulo) || cel.puloPend; r.acao = Boolean(d?.acao) || cel.acaoPend;
    cel.puloPend = cel.acaoPend = false;
  }
  r.puloNovo = r.pulo && !antes.pulo;
  r.acaoNova = r.acao && !antes.acao;
  antes = { pulo: r.pulo, acao: r.acao };
  return r;
}

// Jogador 1 lido do mesmo jeito (o Rabisco): na TV vem da vaga 1 (controle ou celular); fora da TV, só do controle dele
const antes1 = { pulo: false, acao: false };
function ler1() {
  if (tv) return tv.ler(1);
  const r = { x: 0, y: 0, pulo: false, puloNovo: false, acao: false, acaoNova: false, giro: 0 };
  if (j1.entrada === "controle" && j1.pad != null) {
    const g = lerGamepad(j1.pad);
    r.x = g.eixoX || ((g.segura.dir ? 1 : 0) - (g.segura.esq ? 1 : 0));
    r.y = -(g.eixoY || ((g.segura.baixo ? 1 : 0) - (g.segura.cima ? 1 : 0)));
    r.pulo = g.segura.pulo; r.acao = g.segura.acao; r.giro = g.eixoGX;
  }
  r.puloNovo = r.pulo && !antes1.pulo; r.acaoNova = r.acao && !antes1.acao;
  antes1.pulo = r.pulo; antes1.acao = r.acao;
  return r;
}

// ------------------------------------------------------------------ Estilo (injetado: vale na casca, no Kart e onde mais usar)
const CSS = `
.jog-escolha { display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 6px 0 2px; font-family: "Baloo 2", system-ui, sans-serif; }
.jog-pergunta { margin: 0; font-weight: 800; font-size: clamp(15px, 2vw, 19px); color: #151515; background: rgba(255,255,255,0.85); border-radius: 999px; padding: 0 12px; }
.jog-opcoes { display: flex; gap: 10px; }
.jog-opcoes button { font: 800 clamp(16px, 2.2vw, 21px) "Baloo 2", system-ui, sans-serif; cursor: pointer; color: #151515;
  background: #fff; border: 4px solid #151515; border-radius: 999px; padding: 2px 16px 4px; box-shadow: 0 4px 0 #151515; min-height: 46px; }
.jog-opcoes button[aria-pressed="true"] { background: #ffcc1f; }
.jog-opcoes button:active { transform: translateY(3px); box-shadow: 0 1px 0 #151515; }
.jog-quem { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.jog-quem[hidden] { display: none; }
.jog-cartao { display: flex; align-items: center; gap: 8px; background: #fff; border: 4px solid var(--jc); border-radius: 18px; padding: 4px 12px 4px 4px;
  box-shadow: 0 4px 0 #151515; text-align: left; min-width: 0; }
.jog-cartao .rosto { width: 46px; height: 46px; border-radius: 50%; border: 3px solid var(--jc); background: #e9f6fd center/cover no-repeat; flex: none; }
.jog-cartao b { display: block; font-size: 17px; line-height: 1.1; color: var(--jc); }
.jog-cartao small { display: flex; align-items: center; gap: 4px; font-weight: 700; font-size: 13px; color: #333; line-height: 1.2; }
.jog-cartao small .ic { font-size: 18px; }
.jog-cartao.falta { border-style: dashed; }
.jog-qr { display: none; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; color: #333; background: rgba(255,255,255,0.92); border-radius: 14px; padding: 4px 10px 4px 4px; max-width: 460px; text-align: left; }
.jog-qr.ativo { display: flex; }
.jog-qr .qr-img { width: 118px; height: 118px; flex: none; border: 3px solid #151515; border-radius: 10px; overflow: hidden; background: #fff; }
.jog-qr .qr-img svg { display: block; width: 100%; height: 100%; }
.jog-qr .qr-txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.jog-qr .codigo { font: 900 34px "Baloo 2", system-ui, sans-serif; letter-spacing: 5px; color: #151515; line-height: 1; }
.jog-qr .codigo small { font-size: 13px; letter-spacing: 0; font-weight: 700; color: #555; margin-right: 6px; }
.jog-qr .site { font-size: 12px; color: #555; overflow-wrap: anywhere; }
.jog-qr .conectado { color: #0a8a3a; font-weight: 800; font-size: 18px; padding: 4px 8px; }
.jog-aviso .qr-img { width: 110px; height: 110px; border: 3px solid #151515; border-radius: 10px; overflow: hidden; background: #fff; }
.jog-aviso .qr-img svg { display: block; width: 100%; height: 100%; }
.jog-qr .caixa { width: 54px; height: 54px; border: 3px dashed #999; border-radius: 10px; display: grid; place-items: center; font: 800 12px "Baloo 2", sans-serif; color: #999; flex: none; }
.jog-banner { position: fixed; z-index: 45; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(0.6); opacity: 0; pointer-events: none;
  display: flex; flex-direction: column; align-items: center; gap: 8px; transition: transform 0.25s, opacity 0.25s; font-family: "Baloo 2", system-ui, sans-serif; }
.jog-banner.ativo { transform: translate(-50%, -50%) scale(1); opacity: 1; }
.jog-banner .jbc { background: #fff; border: 6px solid var(--jc, #151515); border-radius: 30px; box-shadow: 8px 10px 0 #151515; padding: 14px 26px 18px; text-align: center; }
.jog-banner .jbc > .rosto { display: block; width: 110px; height: 110px; border-radius: 50%; border: 6px solid var(--jc); background: #e9f6fd center/cover no-repeat; margin: 0 auto 6px; }
.jog-banner h2 { margin: 0; font-family: "Neulis Cursive", "Baloo 2", system-ui, sans-serif; font-weight: 900; font-size: clamp(30px, 5vw, 54px); line-height: 1.05; color: var(--jc); text-shadow: 3px 3px 0 #151515; }
.jog-banner .dupla { display: flex; gap: 14px; }
.jog-banner .dupla .jog-cartao { font-size: 20px; }
.jog-legenda { position: fixed; z-index: 7; left: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 8px); pointer-events: none;
  display: flex; gap: 8px; font: 800 14px "Baloo 2", system-ui, sans-serif; }
.jog-legenda span { background: rgba(255,255,255,0.9); border: 3px solid var(--jc); border-radius: 999px; padding: 0 10px; color: #151515; white-space: nowrap; }
.jog-legenda i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: var(--jc); margin-right: 4px; border: 2px solid #151515; vertical-align: -1px; }
.modo-tv .jog-legenda { display: none; }
.jog-vez-chip { display: inline-flex; align-items: center; gap: 6px; font: 800 16px "Baloo 2", system-ui, sans-serif; background: #fff; border: 4px solid var(--jc); border-radius: 999px; padding: 2px 12px 2px 3px; box-shadow: 0 4px 0 #151515; }
.jog-vez-chip .rosto { width: 36px; height: 36px; border-radius: 50%; background: #e9f6fd center/cover no-repeat; border: 2px solid var(--jc); }
.jog-placar { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin: 6px 0; }
.jog-placar .jog-cartao b { font-size: 18px; }
.jog-placar .pontos { font: 800 24px "Baloo 2", system-ui, sans-serif; color: #151515; margin-left: 4px; }
.jog-proxima { margin: 2px 0 0; font-weight: 800; color: #151515; }
.jog-aviso { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; background: rgba(10, 42, 74, 0.6); padding: 16px; font-family: "Baloo 2", system-ui, sans-serif; }
.jog-aviso[hidden] { display: none; }
.jog-aviso .jac { background: #fff; border: 5px solid #151515; border-radius: 30px; box-shadow: 8px 10px 0 #151515; padding: 18px 26px 22px; text-align: center; max-width: 520px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.jog-aviso h2 { margin: 0; font-size: clamp(24px, 4vw, 34px); line-height: 1.1; color: #ec2e8c; }
.jog-aviso p { margin: 0; font-weight: 700; }
.jog-aviso button { font: 800 20px "Baloo 2", system-ui, sans-serif; border: 3px solid #151515; border-radius: 999px; padding: 4px 22px 6px; cursor: pointer; background: #fff; box-shadow: 0 5px 0 #151515; color: #151515; }
.jog-aviso button.principal { background: #ec2e8c; color: #fff; }
@media (max-height: 520px) {
  .jog-escolha { margin: 2px 0 0; gap: 4px; }
  .jog-pergunta { display: none; }
  .jog-opcoes button { min-height: 38px; font-size: 15px; padding: 0 12px 2px; }
  .jog-cartao { padding: 2px 10px 2px 2px; border-width: 3px; }
  .jog-cartao .rosto { width: 32px; height: 32px; }
  .jog-cartao b { font-size: 14px; } .jog-cartao small { font-size: 11px; }
  .jog-qr .qr-img { width: 88px; height: 88px; } .jog-qr .codigo { font-size: 26px; } .jog-qr .site { display: none; }
}`;
let cssPronto = false;
function garantirCss() {
  if (cssPronto) return;
  cssPronto = true;
  const s = document.createElement("style");
  s.dataset.jogadores = "";
  s.textContent = CSS;
  document.head.append(s);
}
const h = (tag, props = {}, filhos = []) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "texto") e.textContent = v;
    else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos) if (f) e.append(f);
  return e;
};

// Rosto de cada jogador: o Rabisco oficial; a criança = foto do cadastro ou o bonequinho 2D no estilo do Rabisco
let rostoGenerico = null;
function rostoDe(j) {
  if (j.n === 1) return `${RAIZ}/assets/rabisco/poses/frente.png`;
  if (j.foto) return j.foto;
  if (!rostoGenerico) {
    try {
      const c = document.createElement("canvas"); c.width = c.height = 96;
      const x = c.getContext("2d");
      x.fillStyle = "#e9f6fd"; x.fillRect(0, 0, 96, 96);
      criarCompanheiro({ crianca: { nome: j.nome } })?.desenhar(x, 48, 176, 1.15);
      rostoGenerico = c.toDataURL();
    } catch { rostoGenerico = ""; }
  }
  return rostoGenerico;
}
// "do Rabisco", "da Alice" (menina), "do Pedro" (menino), "de Sam" (sem gênero no cadastro)
const artigo = (j) => (j.n === 1 ? "do" : ({ menina: "da", menino: "do" })[crianca()?.genero] ?? (j.nome === "Jogador 2" ? "do" : "de"));
const fundoRosto = (j) => { const u = rostoDe(j); return u ? `background-image:url("${u}");${j.n === 1 ? "background-size:250%;background-position:50% 27%;" : ""}` : ""; };

function cartao(j, { revezar = false } = {}) {
  const entrada = revezar ? "revezar" : j.entrada;
  const rot = revezar ? "Joga na sua vez" : ROTULOS[entrada]?.(j) ?? "";
  const falta = !revezar && j.n === 2 && j.entrada === "qr";
  return h("div", { class: `jog-cartao${falta ? " falta" : ""}`, style: `--jc:${j.cor}`, "data-jogador": j.n, "data-entrada": entrada }, [
    h("span", { class: "rosto", style: fundoRosto(j), "aria-hidden": "true" }),
    h("span", {}, [h("b", { texto: `${j.n === 1 ? "1" : "2"} · ${j.nome}` }), h("small", { html: `<span class="ic" aria-hidden="true">${ICONES[entrada]}</span>${rot}` })]),
  ]);
}

// ------------------------------------------------------------------ "Quantos vão jogar?" (na abertura do jogo)
function escolha() {
  garantirCss();
  if (tv) return escolhaTV();
  const b1 = h("button", { type: "button", "data-jogadores": "1", "aria-pressed": String(modo === 1), html: "🙋 1 jogador" });
  const b2 = h("button", { type: "button", "data-jogadores": "2", "aria-pressed": String(modo === 2), html: "👫 2 jogadores" });
  const quem = h("div", { class: "jog-quem", "aria-live": "polite", hidden: modo !== 2 });
  const qr = h("div", { class: "jog-qr", "aria-live": "polite" });
  let qrDe = null; // código já desenhado (não refaz o QR a cada mudança)
  const desenharQr = () => {
    let est = !SALA_JOGOS ? "embreve" : j2.entrada === "celular" ? "conectado" : sala?.estado === "aberta" && sala.codigo ? "aberta" : sala?.estado === "caiu" || sala?.estado === "cheio" ? sala.estado : "conectando";
    const chave = est === "aberta" ? `${est}:${sala.codigo}:${j2.entrada}` : est;
    if (chave === qrDe) return;
    qrDe = chave;
    qr.dataset.estado = est;
    if (est === "embreve") {
      qr.replaceChildren(h("span", { class: "caixa", texto: "QR" }), h("span", { html: "<b>Em breve:</b> o jogador 2 entra lendo um QR code com o celular. Por enquanto, conecte um <b>controle</b> 🎮 (Bluetooth ou USB) e aperte um botão nele." }));
    } else if (est === "conectado") {
      qr.replaceChildren(h("span", { class: "conectado", texto: "📱 Celular conectado ✓" }));
    } else if (est === "aberta") {
      const link = sala.link;
      const img = h("span", { class: "qr-img", role: "img", "aria-label": `QR code para o celular do jogador 2, código ${sala.codigo}` });
      try { img.innerHTML = qrSvg(link, { nivel: "M" }); } catch { img.textContent = "QR"; }
      qr.replaceChildren(img, h("span", { class: "qr-txt" }, [
        h("span", { html: `<b>${j2.entrada === "teclado" ? "Ou jogue pelo celular" : "Jogador 2 pelo celular"}:</b> leia o QR com a câmera.` }),
        h("span", { class: "codigo", html: `<small>Código</small><span class="jog-qr-codigo">${sala.codigo}</span>` }),
        h("span", { class: "site", texto: `ou abra ${new URL(link).host}${new URL(link).pathname.replace(/\/$/, "")} e digite o código` }),
      ]));
    } else {
      qr.replaceChildren(h("span", { class: "caixa", texto: "…" }), h("span", { texto: est === "cheio" ? "Muita gente jogando agora. Tentando de novo em instantes… (ou conecte um controle 🎮)" : est === "caiu" ? "Sem conexão com a sala do celular. Tentando de novo… (ou conecte um controle 🎮)" : "Preparando o QR code do celular…" }));
    }
  };
  const raiz = h("div", { class: "jog-escolha", role: "group", "aria-label": "Quantos vão jogar?" }, [
    h("p", { class: "jog-pergunta", texto: "Quantos vão jogar?" }), h("div", { class: "jog-opcoes" }, [b1, b2]), quem, qr,
  ]);
  const desenhar = () => {
    b1.setAttribute("aria-pressed", String(modo === 1));
    b2.setAttribute("aria-pressed", String(modo === 2));
    quem.hidden = modo !== 2;
    quem.innerHTML = "";
    const revezar = tipo === "revezamento";
    if (modo === 2) quem.append(cartao(j1, { revezar }), cartao(j2, { revezar }));
    const mostraQr = modo === 2 && !revezar && (j2.entrada === "qr" || j2.entrada === "celular" || (j2.entrada === "teclado" && Boolean(SALA_JOGOS)));
    qr.classList.toggle("ativo", mostraQr);
    if (mostraQr) desenharQr();
  };
  b1.addEventListener("click", (e) => { e.stopPropagation(); definirModo(1); });
  b2.addEventListener("click", (e) => { e.stopPropagation(); definirModo(2); });
  ouvintes.add(desenhar);
  desenhar();
  return raiz;
}
// Na TV não tem "quantos vão jogar?": quem está nas vagas joga. Mostra quem é quem (com 🎮/📱) e o código da sala.
function escolhaTV() {
  const quem = h("div", { class: "jog-quem", "aria-live": "polite" });
  const nota = h("p", { class: "jog-pergunta jog-tv-nota" });
  const desenhar = () => {
    quem.replaceChildren(cartao(j1), ...(modo === 2 ? [cartao(j2)] : []));
    const s = tv.sala;
    nota.textContent = `📺 Jogando na TV${s?.codigo ? ` · sala ${s.codigo}` : ""}`;
  };
  ouvintes.add(desenhar);
  desenhar();
  return h("div", { class: "jog-escolha jog-escolha-tv", role: "group", "aria-label": "Quem vai jogar" }, [nota, quem]);
}
function definirModo(n) {
  if (tv) { atribuir(); return; } // na TV o modo vem das vagas
  modo = n === 2 ? 2 : 1;
  if (!ehToque()) { try { sessionStorage.setItem(CHAVE, String(modo)); } catch { /* sem armazenamento */ } }
  atribuir();
}

// ------------------------------------------------------------------ Banner, legenda e aviso
let banner = null;
function mostrarBanner(conteudo, cor, ms = 2400) {
  garantirCss();
  banner?.remove();
  banner = h("div", { class: "jog-banner", style: `--jc:${cor}`, role: "status", "aria-live": "assertive" }, [h("div", { class: "jbc" }, conteudo)]);
  document.body.append(banner);
  const b = banner;
  requestAnimationFrame(() => b.classList.add("ativo"));
  setTimeout(() => { b.classList.remove("ativo"); setTimeout(() => b.remove(), 300); }, ms);
}
// Simultâneo: "quem é quem" no começo da partida (cor, nome e ícone da entrada de cada um)
function mostrarQuemEQuem(ms = 3200, { comLegenda = true } = {}) {
  atribuir();
  mostrarBanner([h("h2", { texto: "Quem é quem?", style: "--jc:#151515;color:#151515;text-shadow:none;font-size:clamp(24px,3.5vw,36px);margin-bottom:8px" }), h("div", { class: "dupla" }, [cartao(j1), cartao(j2)])], "#151515", ms);
  if (comLegenda) legenda();
}
let legendaEl = null;
function legenda() {
  garantirCss();
  legendaEl?.remove();
  if (modo !== 2 || tipo !== "simultaneo") { legendaEl = null; return; }
  legendaEl = h("div", { class: "jog-legenda", "aria-hidden": "true" }, [j1, j2].map((j) => h("span", { style: `--jc:${j.cor}`, html: `<i></i>${j.nome} ${ICONES[j.entrada]}` })));
  document.body.append(legendaEl);
}

const aviso = { el: null, tipo: null, j: null };
const avisoAberto = (tipo) => Boolean(aviso.el && !aviso.el.hidden && (!tipo || aviso.tipo === tipo));
function avisoDesconectou(tipoEntrada = "controle", j = j2) {
  garantirCss();
  if (!aviso.el) {
    aviso.el = h("div", { class: "jog-aviso", role: "alertdialog", "aria-modal": "true", hidden: true });
    document.body.append(aviso.el);
  }
  aviso.el.innerHTML = "";
  aviso.tipo = tipoEntrada;
  aviso.j = j;
  const celular = tipoEntrada === "celular";
  const s = tv ? tv.sala : sala; // na TV, o QR é o da sala da TV
  const qrVolta = celular && s?.codigo ? h("span", { class: "qr-img", html: qrSvg(s.link, { nivel: "M" }) }) : null;
  // na TV: o jogador 1 caiu → dá para voltar ao menu da TV; o 2 caiu → seguir só com o Rabisco (a vaga 2 fica livre)
  const so1 = tv && j.n === 1
    ? h("button", { type: "button", texto: "📺 Voltar ao menu da TV", onclick: () => voltarParaTV() })
    : h("button", { type: "button", texto: "Continuar só com o Rabisco", onclick: () => { fecharAviso(); if (tv) { tv.liberar(2); modo = 1; atribuir(); } else definirModo(1); legenda(); aoMudarModoNoJogo?.(1); } });
  aviso.el.append(h("div", { class: "jac", style: `--jc:${j.cor}` }, [
    h("div", { class: "jog-cartao", style: `--jc:${j.cor}` }, [h("span", { class: "rosto", style: fundoRosto(j) }), h("span", {}, [h("b", { texto: j.nome }), h("small", { html: celular ? '<span class="ic">📱</span>sem celular' : '<span class="ic">🎮</span>sem controle' })])]),
    h("h2", { texto: `O ${celular ? "celular" : "controle"} ${artigo(j)} ${j.nome} desconectou` }),
    h("p", { texto: celular ? "Tudo bem! Acenda a tela do celular de novo (ele volta sozinho) ou leia o QR outra vez e a brincadeira continua." : "Tudo bem! Ligue o controle de novo (ou aperte um botão nele) e a brincadeira continua." }),
    qrVolta, celular && s?.codigo ? h("p", { html: `Código da sala: <b class="jog-qr-codigo" style="font-size:26px;letter-spacing:4px">${s.codigo}</b>` }) : null,
    so1,
  ]));
  aviso.el.hidden = false;
  setTimeout(() => so1.focus({ preventScroll: true }), 30);
}
function fecharAviso() { if (aviso.el) aviso.el.hidden = true; }
let aoMudarModoNoJogo = null;

let padJ2Antes = null;
addEventListener("gamepadconnected", () => {
  if (tv) return; // na TV quem cuida das vagas é a sala da TV
  const estava = aviso.el && !aviso.el.hidden;
  atribuir();
  if (estava && j2.entrada === "controle") {
    fecharAviso();
    mostrarBanner([h("h2", { texto: `Controle ${artigo(j2)} ${j2.nome} de volta! 🎮` })], j2.cor, 1600);
    legenda();
  }
});
addEventListener("gamepaddisconnected", (e) => {
  if (tv) return;
  padJ2Antes = j2.entrada === "controle" ? j2.pad : null;
  const caiuJ2 = modo === 2 && tipo === "simultaneo" && emJogo && padJ2Antes != null && (e.gamepad?.index ?? padJ2Antes) === padJ2Antes;
  atribuir();
  if (caiuJ2 && j2.entrada !== "controle") { aoDesconectarJ2?.(); avisoDesconectou(); }
  else if (emJogo) legenda();
});

// ------------------------------------------------------------------ Revezamento ("Agora é a vez de {nome}!")
const rev = { vez: 0, pontos: [0, 0], rodadas: [0, 0] };
const jogadorDaVez = () => (rev.vez === 0 ? j1 : j2);
async function falarVez(j) {
  // frases já gravadas: "Rabisco!" (mem-rabisco) ou o nome da criança (banco de nomes) + "Agora é a sua vez!" (bd-sua-vez)
  try {
    if (j.n === 1) { if (await falarSequencia(["mem-rabisco", "bd-sua-vez"])) return; }
    else {
      const c = crianca();
      const chave = c?.nome ? await audioDoNome(c.nome) : null;
      if (chave && await falarSequencia([chave, "bd-sua-vez"])) return;
    }
    falar("bd-sua-vez");
  } catch { /* sem áudio: fica o balão */ }
}
function anunciarVez() {
  atribuir();
  const j = jogadorDaVez();
  mostrarBanner([h("span", { class: "rosto", style: `${fundoRosto(j)};--jc:${j.cor}` }), h("h2", { texto: `Agora é a vez ${artigo(j)} ${j.nome}!` })], j.cor, 2200);
  setTimeout(() => falarVez(j), 150);
  return j;
}
function chipVez() {
  const j = jogadorDaVez();
  return h("span", { class: "jog-vez-chip", style: `--jc:${j.cor}`, title: `Vez de ${j.nome}` }, [h("span", { class: "rosto", style: fundoRosto(j) }), document.createTextNode(`Vez: ${j.nome}`)]);
}
function marcar(pontos = 1) { rev.pontos[rev.vez] += Math.max(0, pontos ?? 1); rev.rodadas[rev.vez]++; }
function proximaVez() { rev.vez = 1 - rev.vez; }
function placar({ proxima = false, titulo = null } = {}) {
  garantirCss();
  const caixa = h("div", { class: "jog-placar-caixa" });
  if (titulo) caixa.append(h("p", { class: "jog-proxima", texto: titulo }));
  caixa.append(h("div", { class: "jog-placar" }, [j1, j2].map((j, i) => {
    const c = cartao(j, { revezar: true });
    c.querySelector("small").innerHTML = `${rev.rodadas[i]} ${rev.rodadas[i] === 1 ? "rodada" : "rodadas"}`;
    c.append(h("span", { class: "pontos", texto: `⭐ ${rev.pontos[i]}` }));
    return c;
  })));
  if (proxima) caixa.append(h("p", { class: "jog-proxima", texto: `Agora é a vez ${artigo(jogadorDaVez())} ${jogadorDaVez().nome}!` }));
  return caixa;
}
let fimContagem = 0;
// Placar final ao sair do jogo (depois de pelo menos uma rodada): quem fez mais estrelas, ou empate; fé leve 1 em 3
function placarFinal({ aoFechar = () => {} } = {}) {
  if (!rev.rodadas[0] && !rev.rodadas[1]) { aoFechar(); return false; }
  garantirCss();
  const [a, b] = rev.pontos;
  const vencedor = a === b ? null : a > b ? j1 : j2;
  fimContagem++;
  const frase = fimContagem % 3 === 1 ? "Que bênção brincar juntos! Obrigado, Deus, pelos amigos!" : vencedor ? "Vocês jogaram muito bem!" : "Empate! Os dois mandaram muito bem!";
  const el = h("div", { class: "jog-aviso", role: "dialog", "aria-modal": "true", "aria-label": "Placar final" });
  const ok = h("button", { type: "button", class: "principal", texto: "Legal! ✓", onclick: () => { el.remove(); zerar(); aoFechar(); } });
  el.append(h("div", { class: "jac" }, [
    h("h2", { texto: vencedor ? `🏆 ${vencedor.nome} fez mais estrelas!` : "🤝 Empate!" }),
    placar(), h("p", { texto: frase }), ok,
  ]));
  document.body.append(el);
  setTimeout(() => ok.focus({ preventScroll: true }), 30);
  return true;
}
function zerar() { rev.vez = 0; rev.pontos = [0, 0]; rev.rodadas = [0, 0]; }

// ------------------------------------------------------------------ API
const api = {
  configurar({ tipo: t = "revezamento", aoDesconectar = null, aoMudarModo = null, layout: l = null, aoPausar = null } = {}) {
    tipo = t; aoDesconectarJ2 = aoDesconectar; aoMudarModoNoJogo = aoMudarModo; layout = l || layoutDoCaminho();
    pausaDoJogo = aoPausar || (() => pausaAtual()?.pausar());
    garantirCss();
    ligarTV();
    tv?.definirLayout(layout, { pausar: true });
    atribuir();
    return api;
  },
  // TV como tela (src/motor/salatv.js): true quando o jogo veio da página tv/
  get tv() { return Boolean(tv); },
  // para o teste e para quem quiser mostrar: as vagas da TV ({ n, tipo, pad, cel, conectado }) ou null
  get salaTV() { return tv ? { sala: tv.sala, vagas: tv.vagas.map(({ n, tipo, pad, cel, conectado }) => ({ n, tipo, pad, cel, conectado })) } : null; },
  voltarParaTV,
  get tipo() { return tipo; },
  get modo() { return modo; },
  get ativo() { return modo === 2; },
  get j1() { return j1; },
  get j2() { return j2; },
  // o jogador 2 tem com o que jogar ao mesmo tempo (controle, celular ou teclado dividido)?
  get j2Pronto() { return modo === 2 && (j2.entrada === "controle" || j2.entrada === "celular" || j2.entrada === "teclado"); },
  // recado quando falta o jogador 2 entrar (para o jogo mostrar ao apertar "Jogar")
  get textoFaltaJ2() {
    return SALA_JOGOS ? `Leia o QR com o celular ou conecte um controle 🎮 para o jogador 2 (${j2.nome}) — ou escolha 1 jogador.`
      : `Conecte um controle 🎮 para o jogador 2 (${j2.nome}) ou escolha 1 jogador.`;
  },
  // sala do celular (para o teste e para quem quiser mostrar o estado): { estado, codigo, link } ou null
  get sala() { return sala ? { estado: sala.estado, codigo: sala.codigo, link: sala.link } : null; },
  get celular() { return cel ? { id: cel.id, conectado: j2.entrada === "celular" } : null; },
  // recados para o celular do jogador 2: vibrar (ms) e/ou um texto curto
  vibrar2(ms = 60) { if (tv) { if (j2.entrada === "celular") tv.vibrar(2, ms); return; } if (cel && sala && j2.entrada === "celular") sala.enviar(cel.id, { vibrar: ms }); },
  recado2(texto) { if (cel && sala) sala.enviar(cel.id, { msg: String(texto ?? "").slice(0, 120) }); },
  get tecladoDividido() { return modo === 2 && tipo === "simultaneo" && j2.entrada === "teclado"; },
  get padJ2() { return modo === 2 && j2.entrada === "controle" ? j2.pad : null; },
  get vez() { return rev.vez; },
  get pontos() { return [...rev.pontos]; },
  get rodadas() { return [...rev.rodadas]; },
  definirModo, atribuir, ler1, ler2, escolha, mostrarQuemEQuem, legenda, anunciarVez, chipVez, marcar, proximaVez, placar, placarFinal, zerar,
  jogadorDaVez, rostoDe, artigo,
  avisar(texto, cor = "#151515", ms = 3000) { mostrarBanner([h("h2", { texto, style: "font-size:clamp(22px,3.4vw,34px)" })], cor, ms); },
  // durante a partida: reserva o controle do jogador 2 (ele não move o Rabisco) e mostra a legenda
  emJogo(v) {
    emJogo = Boolean(v);
    aplicarReserva();
    if (tv) atribuir(); // na TV o modo pode mudar entre uma partida e outra (alguém entrou ou saiu da vaga 2)
    if (!emJogo) { legendaEl?.remove(); legendaEl = null; fecharAviso(); }
  },
  aoMudar(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); },
};
export const Jogadores = api;
window.Jogadores = api;
export default api;
