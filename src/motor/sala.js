// Sala do celular de controle, lado da TELA DO JOGO (host). Fala com o relay de servidor/ (contrato em
// .claude/tmp/protocolo-sala.md): cria a sala (código de 4 letras para o QR), recebe os celulares que entram/saem
// e o que eles apertam, manda recados para eles (layout dos botões, nome, cor, vibrar) e reconecta sozinha.
// Sem SALA_JOGOS (src/config.js) ou sem WebSocket: `criarSala()` devolve null e o recurso some sem barulho.
//
//   import { criarSala, linkDoControle } from "./sala.js";
//   const sala = criarSala();                     // null = sem servidor de salas
//   sala.on("estado", (s) => s.estado, s.codigo); // "conectando" | "aberta" | "caiu" | "cheio" | "fechada"
//   sala.on("chegou", (c) => ...);                // c = { id, nome }
//   sala.on("saiu", (c) => ...);
//   sala.on("in", (c, d) => ...);                 // d = { x, y, pulo, acao, baixo, seq } (já conferido)
//   sala.enviar("c1", { layout: "kart", nome: "Alice", cor: "#ec2e8c", vibrar: 80 });  // "*" = todos
//   sala.fechar();
//   criarSala({ retomar: { codigo, token } })    // volta a ser a tela de uma sala que já existe (voltarHost), ex.: /tv → jogo
//
// Entrada do controle (d): x e y de -1 a 1 com y = +1 para CIMA (mesmo sentido do Jogadores.ler2()).
// Nada de foto nem dado pessoal passa por aqui: só o nome curto do jogador que o jogo decide mandar.

import { SALA_JOGOS } from "../config.js";

const RAIZ = new URL("../..", import.meta.url).href.replace(/\/$/, "");

// endereço da página do controle (o que vai no QR). Em teste (?sala= / localStorage), leva o mesmo servidor junto.
// Usa o atalho curto /c/ (pasta c/, que leva para src/controle-remoto/ com o mesmo ?s=): QR menor e fácil de digitar.
export function linkDoControle(codigo) {
  const u = new URL(`${RAIZ}/c/`);
  if (codigo) u.searchParams.set("s", codigo);
  let deTeste = new URLSearchParams(location.search).get("sala");
  try { deTeste ||= localStorage.getItem("rabisco.salaTeste"); } catch { /* sem armazenamento */ }
  if (SALA_JOGOS && deTeste === SALA_JOGOS) u.searchParams.set("sala", SALA_JOGOS);
  return u.href;
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0);
// o que vem do celular passa por aqui: só números de -1 a 1 e sim/não
// start: botão ⏸ do celular (só aparece quando a tela pede, ex.: jogando na TV)
// nome: resposta ao "Qual é o seu nome?" (recado { pedirNome: true } da tela; src/motor/nomes.js). "" = pulou.
const limpar = (d) => {
  const r = { x: num(d?.x), y: num(d?.y), pulo: d?.pulo === true, acao: d?.acao === true, baixo: d?.baixo === true, start: d?.start === true, seq: Number(d?.seq) || 0 };
  if (typeof d?.nome === "string") r.nome = d.nome.normalize("NFC").replace(/[^\p{L}\p{M} '-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 14);
  return r;
};

export function criarSala({ url = SALA_JOGOS, retomar = null } = {}) {
  if (!url || typeof WebSocket === "undefined") return null;
  const ouvintes = { estado: new Set(), chegou: new Set(), saiu: new Set(), in: new Set() };
  const emitir = (ev, ...a) => { for (const cb of ouvintes[ev]) { try { cb(...a); } catch (e) { console.warn("sala:", e); } } };
  const controles = new Map(); // id → { id, nome }
  let ws = null, codigo = retomar?.codigo || null, token = retomar?.token || null, estado = "conectando", fechada = false;
  let tentativas = 0, tReconectar = 0, tPing = 0, ultimaMsg = 0;

  const api = {
    get estado() { return estado; },
    get codigo() { return codigo; },
    get token() { return token; }, // segredo do host: só para guardar nesta aba (sessionStorage) e voltar à mesma sala
    get link() { return codigo ? linkDoControle(codigo) : null; },
    get controles() { return [...controles.values()]; },
    on(ev, cb) { ouvintes[ev]?.add(cb); return () => ouvintes[ev]?.delete(cb); },
    enviar(id, d) { return mandar({ t: "para", id, d }); },
    fechar() {
      fechada = true;
      clearTimeout(tReconectar); clearInterval(tPing);
      removeEventListener("online", acordar); document.removeEventListener("visibilitychange", acordar);
      try { ws?.close(1000, "fim"); } catch { /* já fechou */ }
      ws = null;
      mudar("fechada");
    },
  };

  function mudar(e) { estado = e; emitir("estado", api); }
  function mandar(m) {
    if (ws?.readyState !== 1) return false;
    try { ws.send(JSON.stringify(m)); return true; } catch { return false; }
  }

  function conectar() {
    if (fechada) return;
    clearTimeout(tReconectar);
    let s;
    try { s = new WebSocket(url); } catch { agendar(); return; }
    ws = s;
    s.onopen = () => {
      ultimaMsg = Date.now();
      mandar(codigo && token ? { t: "voltarHost", codigo, token } : { t: "criar" });
    };
    s.onmessage = (ev) => {
      if (s !== ws) return;
      ultimaMsg = Date.now();
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      tratar(m);
    };
    s.onerror = () => {};
    s.onclose = () => {
      if (s !== ws || fechada) return;
      ws = null;
      // a tela perdeu a sala: os celulares ficam "fora" até o servidor mandar o "chegou" de novo
      for (const c of [...controles.values()]) { controles.delete(c.id); emitir("saiu", c); }
      if (estado !== "cheio") mudar("caiu");
      agendar();
    };
  }
  function tratar(m) {
    switch (m?.t) {
      case "sala":
        codigo = m.codigo; token = m.token; tentativas = 0;
        mudar("aberta");
        break;
      case "erro":
        if (m.motivo === "sala-nao-existe") { codigo = token = null; mandar({ t: "criar" }); } // sala expirou: abre outra (QR novo)
        else if (m.motivo === "servidor-cheio") { mudar("cheio"); try { ws?.close(); } catch { /* */ } }
        break;
      case "chegou": {
        const c = { id: String(m.id), nome: typeof m.nome === "string" ? m.nome.slice(0, 30) : "" };
        controles.set(c.id, c);
        emitir("chegou", c);
        break;
      }
      case "saiu": {
        const c = controles.get(String(m.id));
        if (c) { controles.delete(c.id); emitir("saiu", c); }
        break;
      }
      case "in": {
        const c = controles.get(String(m.id));
        if (c) emitir("in", c, limpar(m.d));
        break;
      }
    }
  }
  // espera crescente entre tentativas (0,5 s, 1 s, 2 s... até 10 s), com um pouco de sorteio para não chegar todo mundo junto
  function agendar() {
    if (fechada) return;
    clearTimeout(tReconectar);
    const base = estado === "cheio" ? 10000 : Math.min(10000, 500 * 2 ** tentativas);
    tentativas++;
    tReconectar = setTimeout(conectar, base * (0.8 + Math.random() * 0.4));
  }
  // voltou a internet ou a tela acendeu: tenta já
  function acordar() {
    if (fechada || document.hidden) return;
    if (!ws || ws.readyState > 1) { tentativas = 0; conectar(); }
  }
  addEventListener("online", acordar);
  document.addEventListener("visibilitychange", acordar);
  // batimento: mantém a conexão viva em proxies e percebe conexão muda (sem resposta em 40 s → reconecta)
  tPing = setInterval(() => {
    if (ws?.readyState !== 1) return;
    if (Date.now() - ultimaMsg > 40000) { try { ws.close(); } catch { /* */ } ws.onclose?.(); return; }
    mandar({ t: "ping" });
  }, 15000);

  conectar();
  return api;
}
