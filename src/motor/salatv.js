// Sala da TV: a TV (navegador do notebook/mini PC no HDMI, TV box ou Smart TV) é SÓ a tela; os jogadores controlam
// com controle físico (Gamepad API, Bluetooth/USB) e/ou celular pelo QR (src/motor/sala.js + src/controle-remoto/).
// Usado pela página tv/ (menu) e, dentro dos jogos, por src/motor/jogadores.js quando a página veio da TV (?tv=1).
//
// Duas vagas: 1 = Rabisco (sempre), 2 = criança-companheira. Regras:
//   - cada controle físico que aperta um botão ganha a primeira vaga livre (o navegador só "vê" o controle depois de um botão);
//   - celular que entra pelo QR fica com a vaga que sobrar; sem vaga, espera ("as duas vagas já estão ocupadas");
//   - caiu (controle desligou, tela do celular apagou): a vaga fica guardada e volta sozinha (mesmo controle ou mesmo celular);
//     um controle novo também pode assumir uma vaga que caiu.
//
// A sala sobrevive à troca de página /tv → jogo → /tv: o código e o segredo do host ficam no sessionStorage desta aba
// (chave "rabisco.tv", junto com quem está em cada vaga) e a página nova volta como host da MESMA sala (voltarHost).
// O relay manda o "chegou" de cada celular de novo e eles caem nas mesmas vagas (pelo id do celular).
// Sem servidor de salas (SALA_JOGOS vazio) tudo segue só com controles físicos.
//
//   import { emModoTV, iniciarSalaTV, urlTV } from "./salatv.js";
//   const tv = iniciarSalaTV({ layout: "kart", pausar: true });
//   tv.vagas → [{ n, tipo: null|"controle"|"celular", pad, cel, conectado, caiu }, ...]
//   tv.ler(1) / tv.ler(2) → { x, y, pulo, puloNovo, acao, acaoNova, giro }  (y = +1 para cima)
//   tv.on("mudou" | "caiu" | "voltou", cb)

import { SALA_JOGOS } from "../config.js";
import { criarSala } from "./sala.js";
import { lerGamepad, adicionarFonte, definirFiltroGamepad } from "./controle.js";
import { nomeDoJogador, pedirNomes, receberNome, aoMudarNome } from "./nomes.js";

const RAIZ = new URL("../..", import.meta.url).href.replace(/\/$/, "");
const CHAVE = "rabisco.tv";
export const CORES_TV = ["#00b5f0", "#ec2e8c"];
const params = new URLSearchParams(location.search);

const lerGuardado = () => { try { return JSON.parse(sessionStorage.getItem(CHAVE)) || null; } catch { return null; } };
// Jogo aberto a partir da TV: veio com ?tv=1 e esta aba tem a TV guardada. Fora disso, nada muda nos jogos.
export const emModoTV = params.has("tv") && Boolean(lerGuardado()?.vagas);

// ?sala=ws://... (servidor de teste) e ?teste (ganchos dos testes automáticos) vão junto quando a TV troca de página
function comSalaDeTeste(u) {
  for (const k of ["sala", "teste"]) if (params.has(k)) u.searchParams.set(k, params.get(k));
  return u.href;
}
export const urlTV = () => comSalaDeTeste(new URL(`${RAIZ}/tv/`));
export const urlJogoTV = (id) => { const u = new URL(`${RAIZ}/jogos/${id}/`); u.searchParams.set("tv", "1"); return comSalaDeTeste(u); };
export function voltarParaTV() { location.href = urlTV(); }
// quem está numa vaga (para o nome ficar preso à pessoa): id do celular, "pad:0" do controle
export const quemDaVaga = (v) => (v?.tipo === "celular" ? String(v.cel) : v?.tipo === "controle" ? `pad:${v.pad}` : null);

const primeiroNome = (n) => String(n || "").trim().split(/\s+/)[0].slice(0, 20); // para o celular vai só o primeiro nome

let instancia = null;
export function iniciarSalaTV({ layout = "padrao", pausar = false, permitirNovos = () => true, liberarCaidos = false, nomeJ2 = () => "Jogador 2" } = {}) {
  if (instancia) return instancia;
  const salvo = lerGuardado() || {};
  const vagas = [1, 2].map((n) => {
    const v = salvo.vagas?.[n - 1] || {};
    const tipo = v.tipo === "controle" || v.tipo === "celular" ? v.tipo : null;
    return { n, tipo, pad: tipo === "controle" ? Number(v.pad) : null, cel: tipo === "celular" ? String(v.cel) : null, conectado: false, visto: false, caiu: 0,
      d: { x: 0, y: 0, pulo: false, acao: false, baixo: false, start: false }, recebido: 0, pf: {}, pl: {}, antes: { pulo: false, acao: false } };
  });
  const espera = new Set(); // celulares a mais (as duas vagas ocupadas)
  const ouvintes = { mudou: new Set(), caiu: new Set(), voltou: new Set(), recado: new Set() };
  const emitir = (ev, ...a) => { for (const cb of ouvintes[ev]) { try { cb(...a); } catch (e) { console.warn("salaTV:", e); } } };
  const inicio = performance.now();
  let reservada = null; // vaga cujo celular não mexe no jogador 1 (o do jogador 2 durante a partida)
  let codigoSala = salvo.codigo || null;
  // "Quantos vão jogar?" na TV: 1 = só o Rabisco (a vaga 2 pode até estar ocupada, mas fica de fora); 2 = os dois; null = ainda sem escolha
  // (vale o que as vagas dizem: alguém na vaga 2 → 2 jogadores). Sobrevive à troca /tv → jogo → /tv junto com as vagas.
  let escolhido = salvo.jogadores === 1 || salvo.jogadores === 2 ? salvo.jogadores : null;
  const novosPads = new Set(); // gamepadconnected desde o último quadro

  function guardar() {
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify({
        codigo: sala?.codigo || codigoSala, token: sala?.token || salvo.token || null,
        vagas: vagas.map((v) => ({ tipo: v.tipo, pad: v.pad, cel: v.cel })),
        jogadores: escolhido,
      }));
    } catch { /* sem armazenamento: a TV funciona, só não lembra ao trocar de página */ }
  }
  const mudou = () => { guardar(); emitir("mudou", api); };
  const zerar = (v) => { v.tipo = null; v.pad = null; v.cel = null; v.conectado = false; v.visto = false; v.caiu = 0; v.d = { x: 0, y: 0, pulo: false, acao: false, baixo: false, start: false }; };

  // ------------------------------------------------------------------ Celulares (sala do relay)
  const sala = SALA_JOGOS ? criarSala({ retomar: salvo.codigo && salvo.token ? { codigo: salvo.codigo, token: salvo.token } : null }) : null;
  // nome no chip do celular: o que o jogador escreveu (src/motor/nomes.js) ou "Rabisco" / o primeiro nome do cadastro
  const nomeDaVaga = (v) => primeiroNome(nomeDoJogador(v.n, quemDaVaga(v), nomeJ2())) || (v.n === 1 ? "Rabisco" : "Jogador 2");
  function configurar(v) {
    if (sala && v.tipo === "celular" && v.conectado) sala.enviar(v.cel, { layout, nome: nomeDaVaga(v), cor: CORES_TV[v.n - 1], pausar, vibrar: 80, msg: "" });
  }
  // escolhe a vaga de quem chega: livre (se pode entrar gente nova agora) → a de um celular que caiu → a de um controle que caiu
  function vagaPara(quem) {
    const livre = permitirNovos() ? vagas.find((v) => !v.tipo) : null;
    if (quem === "controle") return vagas.find((v) => v.tipo === "controle" && !v.conectado) || livre || vagas.find((v) => v.tipo === "celular" && !v.conectado && v.caiu);
    return livre || vagas.find((v) => v.tipo === "celular" && !v.conectado && v.caiu);
  }
  if (sala) {
    sala.on("estado", (s) => {
      if (s.estado === "aberta" && s.codigo) {
        if (codigoSala && s.codigo !== codigoSala) {
          // a sala antiga expirou e o relay abriu outra: os celulares precisam ler o QR novo
          for (const v of vagas) if (v.tipo === "celular") { zerar(v); emitir("recado", "A sala da TV foi renovada: leiam o QR code de novo."); }
          espera.clear();
        }
        codigoSala = s.codigo;
      }
      mudou();
    });
    sala.on("chegou", (c) => {
      let v = vagas.find((x) => x.tipo === "celular" && x.cel === c.id);
      if (!v) {
        v = vagaPara("celular");
        if (!v) {
          espera.add(c.id);
          sala.enviar(c.id, { layout: "padrao", nome: "Espere a vez", pausar: false, msg: "As duas vagas já estão ocupadas. Espere a vez!" });
          return;
        }
        zerar(v);
        v.tipo = "celular"; v.cel = c.id;
      }
      espera.delete(c.id);
      const estavaCaida = Boolean(v.caiu);
      v.conectado = true; v.visto = true; v.caiu = 0; v.recebido = 0;
      configurar(v);
      mudou();
      if (estavaCaida) emitir("voltou", v);
    });
    sala.on("saiu", (c) => {
      espera.delete(c.id);
      const v = vagas.find((x) => x.tipo === "celular" && x.cel === c.id);
      if (!v || !v.conectado) return;
      v.conectado = false; v.caiu = performance.now(); v.pf = {}; v.pl = {};
      mudou();
      emitir("caiu", v);
    });
    sala.on("in", (c, d) => {
      const v = vagas.find((x) => x.tipo === "celular" && x.cel === c.id && x.conectado);
      if (!v) return;
      if (typeof d.nome === "string") { receberNome(v.cel, d.nome); return; } // resposta ao "Qual é o seu nome?"
      for (const k of ["pulo", "acao", "start"]) if (d[k] && !v.d[k]) { v.pf[k] = true; v.pl[k] = true; } // toque rápido entre dois quadros ainda conta
      // direção também: numa TV box lenta (poucos quadros por segundo) um toque curto no ▶ ainda move o foco do menu
      const a = direcoes(v.d), b = direcoes(d);
      for (const k in b) if (b[k] && !a[k]) v.pf[k] = true;
      v.d = d; v.recebido = performance.now();
    });
  }
  const direcoes = (d) => ({ esq: d.x < -0.5, dir: d.x > 0.5, cima: d.y > 0.5, baixo: d.y < -0.5 });
  const fresco = (v) => v.tipo === "celular" && v.conectado && performance.now() - v.recebido < 3500; // batimento do celular é de 1 s

  // ------------------------------------------------------------------ Controles físicos
  addEventListener("gamepadconnected", (e) => { if (e.gamepad) novosPads.add(e.gamepad.index); });
  // o aperto que dá a vaga não vale como clique: o controle sem vaga e o que acabou de ganhar uma (até soltar os botões)
  // ficam fora do controle comum (menus e jogador 1)
  const soltando = new Set();
  definirFiltroGamepad((g) => soltando.has(g.index) || !vagas.some((v) => v.tipo === "controle" && v.pad === g.index));
  const padsVisiveis = () => [...(navigator.getGamepads?.() ?? [])].filter((g) => g && g.connected !== false);
  const algumBotao = (g) => g.buttons?.some((b) => b?.pressed);
  function vigiar() {
    const pads = padsVisiveis();
    const indices = new Set(pads.map((g) => g.index));
    let mexeu = false;
    for (const v of vagas) {
      if (v.tipo !== "controle") continue;
      const agora = indices.has(v.pad);
      if (agora === v.conectado) continue;
      v.conectado = agora; mexeu = true;
      if (agora) { const voltou = Boolean(v.caiu); v.visto = true; v.caiu = 0; if (voltou) emitir("voltou", v); }
      else if (v.visto) { v.caiu = performance.now(); emitir("caiu", v); }
    }
    // controle que ninguém tem: aperta um botão (ou acabou de aparecer) → ganha uma vaga
    for (const g of pads) {
      if (vagas.some((v) => v.tipo === "controle" && v.pad === g.index)) continue;
      if (!novosPads.has(g.index) && !algumBotao(g)) continue;
      const v = vagaPara("controle");
      if (!v) continue;
      const voltou = Boolean(v.caiu) || (v.tipo === "controle" && !v.visto);
      if (v.tipo === "celular" && v.cel && sala) { sala.enviar(v.cel, { msg: "Um controle 🎮 assumiu a sua vaga. Pode descansar o celular!" }); }
      zerar(v);
      v.tipo = "controle"; v.pad = g.index; v.conectado = true; v.visto = true;
      api.ultimaEntrada = { n: v.n, pad: g.index, em: performance.now() };
      soltando.add(g.index);
      mexeu = true;
      if (voltou) emitir("voltou", v);
    }
    novosPads.clear();
    for (const i of soltando) { const g = pads.find((p) => p.index === i); if (!g || !algumBotao(g)) soltando.delete(i); }
    const agora = performance.now();
    for (const v of vagas) {
      // celular que estava na vaga e não voltou depois da troca de página (6 s): avisa como queda
      if (v.tipo === "celular" && !v.conectado && !v.caiu && agora - inicio > 6000) { v.caiu = agora; mexeu = true; emitir("caiu", v); }
      // no menu da TV, vaga de celular caído há mais de 2 min (o relay já esqueceu) volta a ficar livre
      if (liberarCaidos && v.tipo === "celular" && !v.conectado && v.caiu && agora - v.caiu > 125000) { zerar(v); mexeu = true; }
    }
    if (mexeu) mudou();
    requestAnimationFrame(vigiar);
  }
  requestAnimationFrame(vigiar);

  // celulares entram no controle comum (src/motor/controle.js) como mais um controle: menus, pausa e o jogador 1
  adicionarFonte(() => vagas.filter(fresco).map((v) => {
    const { x, y } = v.d, dir = direcoes(v.d);
    const nivel = { ...dir, pulo: v.d.pulo, acao: v.d.acao, start: v.d.start };
    // aperto que chegou entre dois quadros (pendente): conta uma vez. Se no quadro anterior o botão já estava "apertado",
    // solta neste quadro e aperta no próximo, para o controle comum ver um aperto novo (TV box lenta, toques seguidos)
    const segura = {}, pend = {};
    for (const k in nivel) {
      if (v.pf[k] && v.ult?.[k]) { segura[k] = false; pend[k] = true; }
      else segura[k] = Boolean(nivel[k] || v.pf[k]);
    }
    v.pf = pend; v.ult = segura;
    segura.confirma = segura.pulo || segura.acao;
    return { reservado: reservada === v.n, segura, eixoX: Math.abs(x) > 0.15 ? x : 0, eixoY: Math.abs(y) > 0.15 ? -y : 0 };
  }));

  // ------------------------------------------------------------------ Leitura de uma vaga (igual ao Jogadores.ler2())
  function ler(n) {
    const v = vagas[n - 1];
    const r = { x: 0, y: 0, pulo: false, puloNovo: false, acao: false, acaoNova: false, giro: 0 };
    if (!v) return r;
    if (v.tipo === "controle" && v.pad != null) {
      const g = lerGamepad(v.pad);
      r.x = g.eixoX || ((g.segura.dir ? 1 : 0) - (g.segura.esq ? 1 : 0));
      r.y = -(g.eixoY || ((g.segura.baixo ? 1 : 0) - (g.segura.cima ? 1 : 0)));
      r.pulo = g.segura.pulo; r.acao = g.segura.acao; r.giro = g.eixoGX;
    } else if (fresco(v)) {
      r.x = v.d.x; r.y = v.d.y;
      r.pulo = v.d.pulo || Boolean(v.pl.pulo); r.acao = v.d.acao || Boolean(v.pl.acao);
      v.pl = {};
    }
    r.puloNovo = r.pulo && !v.antes.pulo;
    r.acaoNova = r.acao && !v.antes.acao;
    v.antes = { pulo: r.pulo, acao: r.acao };
    return r;
  }

  const api = {
    get vagas() { return vagas; },
    get espera() { return espera.size; },
    get escolhido() { return escolhido; },
    // quantos jogam de fato: escolheu 1 → 1; senão, 2 só se a vaga 2 tem alguém
    get jogadores() { return escolhido === 1 ? 1 : vagas[1].tipo ? 2 : 1; },
    escolher(n) { escolhido = n === 1 ? 1 : n === 2 ? 2 : null; mudou(); },
    get sala() { return sala ? { estado: sala.estado, codigo: sala.codigo, link: sala.link } : null; },
    get temSala() { return Boolean(sala); },
    ultimaEntrada: null,
    on(ev, cb) { ouvintes[ev]?.add(cb); return () => ouvintes[ev]?.delete(cb); },
    ler,
    // durante a partida: o celular desta vaga não mexe no jogador 1 (só o ⏸ vale)
    reservar(n) { reservada = n ?? null; },
    definirLayout(l, { pausar: p = pausar } = {}) { layout = l; pausar = p; for (const v of vagas) configurar(v); },
    enviar(n, d) { const v = vagas[n - 1]; if (sala && v?.tipo === "celular" && v.conectado) sala.enviar(v.cel, d); },
    vibrar(n, ms = 60) { api.enviar(n, { vibrar: ms }); },
    // o nome da criança mudou (cadastro): atualiza o chip do celular da vaga 2
    renomear() { configurar(vagas[1]); },
    liberar(n) {
      const v = vagas[n - 1];
      if (!v) return;
      if (v.tipo === "celular" && sala) sala.enviar(v.cel, { nome: "Obrigado!", msg: "O jogo seguiu sem este celular. Leia o QR de novo para voltar." });
      zerar(v); mudou();
    },
    // jogador 1 saiu e só o 2 ficou: o 2 vira o Rabisco
    subirVaga2() {
      const [a, b] = vagas;
      if (a.tipo || !b.tipo) return;
      for (const k of ["tipo", "pad", "cel", "conectado", "visto", "caiu", "d", "recebido"]) { a[k] = b[k]; }
      zerar(b);
      configurar(a);
      mudou();
    },
    guardar,
    // "Qual é o seu nome?" para cada jogador nas vagas que ainda não tem nome (1 por vez; o celular também pergunta)
    // sugestao1: primeiro nome do cadastro para o jogador 1. Devolve uma Promise que termina quando todos responderam.
    pedirNomes({ sugestao1 = "", quantos = api.jogadores } = {}) {
      const lista = vagas.filter((v) => v.tipo && v.n <= quantos).map((v) => ({
        n: v.n, quem: quemDaVaga(v), cor: CORES_TV[v.n - 1], sugestao: v.n === 1 ? primeiroNome(sugestao1) : "",
        celular: v.tipo === "celular" && sala ? (d) => { if (v.conectado) sala.enviar(v.cel, d); } : null,
      }));
      return pedirNomes(lista);
    },
    nomeDe(n) { return nomeDoJogador(n, quemDaVaga(vagas[n - 1]), nomeJ2()); },
  };
  aoMudarNome(() => { for (const v of vagas) configurar(v); emitir("mudou", api); });
  instancia = api;
  guardar();
  return api;
}
