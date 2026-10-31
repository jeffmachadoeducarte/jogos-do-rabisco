// Cadastro da família: responsável (nome, e-mail, WhatsApp, cidade/UF) e criança (nome, nascimento,
// menina/menino, foto). Fica em localStorage (`rabisco.familia`) e, se `WEBHOOK_FAMILIA` (src/config.js)
// estiver preenchido, vai por POST JSON sem a foto, com fila e retentativa quando estiver sem internet.
//
//   import { Familia } from "../../src/motor/familia.js";   // também em window.Familia
//   Familia.crianca()        → { nome, nascimento, idade, genero, foto } ou null
//   Familia.temFoto()        → true/false
//   Familia.completo()       → cadastro mínimo feito neste aparelho
//   Familia.aoMudar(cb)      → chama cb(perfil) sempre que o cadastro for salvo
//   await Familia.abrirCadastro({ obrigatorio: true })  → não abre tela; resolve true na hora (o jogo segue)
//   await Familia.abrirCadastro()  → portão dos pais + tela (botão Família); resolve true se salvou
//
// Privacidade: a foto da criança nunca sai do aparelho (não entra no envio).
// Segurança: o botão Família (editar cadastro e foto) fica atrás do "portão dos pais" (uma conta de multiplicar, números sorteados).
// Tocar num jogo nunca abre cadastro.
// Foto: até 3 tentativas com orientação; o rosto é achado NO APARELHO (FaceDetector nativa ou o módulo opcional
// DETECTOR_ROSTO de src/config.js), só vale foto com exatamente 1 rosto de tamanho razoável, e só o rostinho é
// recortado em círculo (256 px): o resto da imagem é descartado na hora. Sem detector no navegador (ex.: iPhone),
// o responsável posiciona um círculo sobre o rosto e aprova.

import { WEBHOOK_FAMILIA, VERSAO_APP, DETECTOR_ROSTO } from "../config.js";
import { audioDoNome } from "./voz.js";

const CHAVE = "rabisco.familia";
const CHAVE_FILA = "rabisco.familia.fila";
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const RAIZ = new URL("../..", import.meta.url).href.replace(/\/$/, "");

const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

let perfil = ler(CHAVE, null);
const ouvintes = new Set();

// ------------------------------------------------------------------ API
export function obterPerfil() { return perfil ? structuredClone(perfil) : null; }
export function idadeDe(nascimento) {
  if (!nascimento) return null;
  const n = new Date(`${nascimento}T12:00:00`);
  if (Number.isNaN(n.getTime())) return null;
  const hoje = new Date();
  let a = hoje.getFullYear() - n.getFullYear();
  if (hoje.getMonth() < n.getMonth() || (hoje.getMonth() === n.getMonth() && hoje.getDate() < n.getDate())) a--;
  return a >= 0 ? a : null;
}
export function crianca() {
  const c = perfil?.crianca;
  if (!c?.nome) return null;
  return { nome: c.nome, nascimento: c.nascimento || null, idade: idadeDe(c.nascimento), genero: c.genero || null, foto: c.foto || null };
}
export const temFoto = () => Boolean(perfil?.crianca?.foto);
export const completo = () => Boolean(perfil?.responsavel?.nome && (perfil.responsavel.email || perfil.responsavel.whatsapp) && perfil.crianca?.nome);
export function aoMudar(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); }

function salvar(novo) {
  perfil = { ...novo, atualizadoEm: new Date().toISOString() };
  gravar(CHAVE, perfil);
  for (const cb of ouvintes) { try { cb(obterPerfil()); } catch { /* ouvinte com erro não trava o cadastro */ } }
  enfileirar(perfil);
}

// ------------------------------------------------------------------ Envio (sem a foto), com fila
function pacote(p) {
  const ua = navigator.userAgent || "";
  const resumo = (ua.match(/\((.*?)\)/)?.[1] || ua).slice(0, 80);
  return {
    origem: "jogos-do-rabisco", versao: VERSAO_APP, timestamp: new Date().toISOString(), userAgent: resumo,
    responsavel: { nome: p.responsavel.nome, email: p.responsavel.email || "", whatsapp: p.responsavel.whatsapp || "", cidade: p.responsavel.cidade || "", uf: p.responsavel.uf || "" },
    crianca: { nome: p.crianca.nome, nascimento: p.crianca.nascimento || "", genero: p.crianca.genero || "", temFoto: Boolean(p.crianca.foto) },
    consentimento: { novidades: Boolean(p.consentimento?.novidades), em: p.consentimento?.em || "" },
  };
}
function enfileirar(p) {
  if (!WEBHOOK_FAMILIA) return;
  const fila = ler(CHAVE_FILA, []);
  fila.push(pacote(p));
  gravar(CHAVE_FILA, fila.slice(-10));
  sincronizar();
}
let sincronizando = false;
export async function sincronizar() {
  if (!WEBHOOK_FAMILIA || sincronizando || !navigator.onLine) return;
  sincronizando = true;
  try {
    let fila = ler(CHAVE_FILA, []);
    while (fila.length) {
      const r = await fetch(WEBHOOK_FAMILIA, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fila[0]) });
      if (!r.ok && r.status < 500) { fila.shift(); } // pedido recusado: não adianta repetir
      else if (!r.ok) break;                           // servidor fora: tenta depois
      else fila.shift();
      gravar(CHAVE_FILA, fila);
    }
  } catch { /* sem rede: fica na fila */ } finally { sincronizando = false; }
}
addEventListener("online", sincronizar);
setTimeout(sincronizar, 3000);

// ------------------------------------------------------------------ Foto: recorte quadrado centralizado, 256px, JPEG
export function prepararFoto(arquivo, lado = 256) {
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(arquivo);
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = lado;
      const ctx = c.getContext("2d");
      const s = Math.min(im.width, im.height);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, lado, lado);
      ctx.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, lado, lado);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", 0.85));
    };
    im.onerror = () => { URL.revokeObjectURL(url); erro(new Error("imagem inválida")); };
    im.src = url;
  });
}

// ------------------------------------------------------------------ Máscara de WhatsApp (BR)
export function mascaraWhats(v) {
  const d = v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

// ------------------------------------------------------------------ Tela do cadastro
let cssPronto = false;
function garantirCss() {
  if (cssPronto) return;
  cssPronto = true;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = new URL("./familia.css", import.meta.url).href;
  document.head.append(l);
}
const h = (tag, props = {}, filhos = []) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "texto") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos) if (f) e.append(f);
  return e;
};

let telaAberta = null;
// obrigatorio: true não abre nada e resolve true (ver abaixo).
// titulo/intro: textos do topo. Sem obrigatorio (botão Família): antes da tela, o portão dos pais; se a pessoa voltar, nada abre.
let portaoEmCurso = null;
//
// Regra do cadastro "obrigatório" (o que o portal abria sozinho ao tocar num jogo): não existe mais. Com
// obrigatorio: true, abrirCadastro resolve true na hora, sem tela e sem marcar nada: o jogo segue direto.
// Os jogos funcionam sem cadastro (comportamento neutro). Só o botão "Família" (obrigatorio: false) abre,
// atrás do portão dos pais, para informar o nome da criança (a narradora usa) e a foto.
export function abrirCadastro(opcoes = {}) {
  if (telaAberta) return telaAberta.promessa;
  if (portaoEmCurso) return portaoEmCurso;
  const sozinho = Boolean(opcoes.obrigatorio);
  if (sozinho) return Promise.resolve(true); // sem tela: o jogo segue direto
  // botão Família: portão dos pais antes da tela
  portaoEmCurso = portaoDosPais({ texto: "O cadastro e a foto da criança ficam aqui." })
    .then((ok) => { portaoEmCurso = null; return ok ? montarCadastro(opcoes) : false; });
  return portaoEmCurso;
}

// ------------------------------------------------------------------ Portão dos pais
// "Quanto é 7 × 3?" com números sorteados (3 a 9). Errou: outra conta. Teclado numérico no celular.
export function portaoDosPais({ texto = "Esta parte é para os adultos." } = {}) {
  garantirCss();
  return new Promise((resolver) => {
    let a = 0, b = 0;
    const conta = h("b", { class: "portao-conta" });
    const campo = h("input", { id: "portao-resposta", type: "text", inputmode: "numeric", pattern: "[0-9]*", autocomplete: "off", maxlength: "3", enterkeyhint: "done", "aria-label": "Resposta da conta" });
    const erro = h("p", { class: "erro", role: "alert" });
    const sortear = () => { a = 3 + Math.floor(Math.random() * 7); b = 3 + Math.floor(Math.random() * 7); conta.textContent = `${a} × ${b}`; campo.value = ""; };
    const form = h("form", { class: "familia-cartao portao-cartao", novalidate: true }, [
      h("div", { class: "portao-cadeado", "aria-hidden": "true", texto: "🔒" }),
      h("h2", { texto: "Área dos pais" }),
      h("p", { class: "intro", texto }),
      h("p", { class: "portao-pergunta" }, [document.createTextNode("Quanto é "), conta, document.createTextNode("?")]),
      campo, erro,
      h("div", { class: "familia-acoes" }, [
        h("button", { type: "button", class: "botao branco", texto: "Voltar", onclick: () => fechar(false) }),
        h("button", { type: "submit", class: "botao", texto: "Entrar ✓" }),
      ]),
    ]);
    const tela = h("div", { class: "familia-tela portao-tela", role: "dialog", "aria-modal": "true", "aria-label": "Área dos pais" }, [form]);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (Number(campo.value.replace(/\D/g, "")) === a * b && campo.value.trim()) { fechar(true); return; }
      erro.textContent = "Ops! Essa não é. Peça ajuda a um adulto e tente esta outra:";
      sortear();
      campo.focus();
    });
    tela.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); fechar(false); } });
    function fechar(ok) { tela.remove(); resolver(ok); }
    sortear();
    document.body.append(tela);
    setTimeout(() => campo.focus({ preventScroll: true }), 50);
  });
}

// ------------------------------------------------------------------ Foto com segurança (detecção de rosto local)
const paramsFoto = new URLSearchParams(location.search);
// devolve detectar(canvas) → [{ x, y, width, height }] ou null (sem detector: modo manual)
async function obterDetector() {
  if (paramsFoto.get("rosto") === "manual") return null; // testes: força o modo manual
  if ("FaceDetector" in window) {
    try { const fd = new window.FaceDetector({ fastMode: false, maxDetectedFaces: 5 }); return async (c) => (await fd.detect(c)).map((f) => f.boundingBox); } catch { /* sem suporte de verdade */ }
  }
  if (DETECTOR_ROSTO) {
    try { const m = await import(new URL(`../../${DETECTOR_ROSTO}`, import.meta.url).href); if (typeof m.detectar === "function") return m.detectar; } catch { /* módulo ausente */ }
  }
  return null;
}
// arquivo → canvas (lado maior até 1024 px); a URL temporária é revogada na hora
function imagemEmCanvas(arquivo, max = 1024) {
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(arquivo);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height));
      const c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); im.src = "";
      ok(c);
    };
    im.onerror = () => { URL.revokeObjectURL(url); erro(new Error("imagem inválida")); };
    im.src = url;
  });
}
// só o rosto, em círculo, 256 px (fora do círculo fica branco): o resto da foto não é guardado
function recortarRosto(c, cx, cy, r, lado = 256) {
  const o = document.createElement("canvas");
  o.width = o.height = lado;
  const x = o.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, lado, lado);
  x.save(); x.beginPath(); x.arc(lado / 2, lado / 2, lado / 2, 0, Math.PI * 2); x.clip();
  x.drawImage(c, cx - r, cy - r, r * 2, r * 2, 0, 0, lado, lado);
  x.restore();
  return o.toDataURL("image/jpeg", 0.88);
}
const descartar = (c) => { if (c) { c.width = c.height = 0; } };
// Analisa uma foto: exatamente 1 rosto, de tamanho razoável → { ok, recorte, nota } ; senão { ok: false, motivo }
async function analisarFoto(c, detectar) {
  let caixas;
  try { caixas = (await detectar(c)) || []; } catch { return { ok: false, semDetector: true, motivo: "Não deu para procurar o rosto neste aparelho." }; }
  const menor = Math.min(c.width, c.height);
  const visiveis = caixas.filter((b) => Math.max(b.width, b.height) >= Math.max(28, menor * 0.06));
  if (!visiveis.length) return { ok: false, motivo: "Não achei um rostinho nesta foto. Rosto de frente, num lugar claro, por favor." };
  if (visiveis.length > 1) return { ok: false, motivo: `Achei ${visiveis.length} rostos. Só a criança na foto, por favor.` };
  const b = visiveis[0], lado = Math.max(b.width, b.height);
  if (lado < Math.max(60, menor * 0.15)) return { ok: false, motivo: "O rosto ficou pequeno. Chegue mais perto da criança." };
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2 - b.height * 0.04, r = lado * 0.78;
  // nota: rosto maior (até ~35% da foto) e mais centrado é melhor
  const centro = Math.hypot(cx / c.width - 0.5, cy / c.height - 0.5);
  const nota = Math.min(1, lado / (menor * 0.35)) * (1 - Math.min(0.6, centro));
  return { ok: true, recorte: recortarRosto(c, cx, cy, r), nota };
}

// Etapa da foto: resolve com o recorte aprovado (dataURL), null (avatar genérico) ou undefined (cancelou)
export function abrirEtapaFoto() {
  garantirCss();
  return new Promise((resolver) => {
    let detectar = null, pronto = false, tentativas = 0;
    const bons = [];
    const MAX = 3;
    const lista = h("ol", { class: "foto-resultados", "aria-live": "polite" });
    const entrada = h("input", { type: "file", accept: "image/*", onchange: (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) usarArquivo(f); } });
    const btnArquivo = h("label", { class: "botao-arquivo grande" }, [h("span", { class: "txt", texto: "📷 Tirar ou escolher a foto (1 de 3)" }), entrada]);
    const previa = h("div", { class: "foto-previa", hidden: true });
    const recusa = h("div", { class: "foto-recusa", hidden: true });
    const manual = h("div", { class: "foto-manual", hidden: true });
    const status = h("p", { class: "foto-status", "aria-live": "polite" });
    const cartao = h("div", { class: "familia-cartao foto-cartao" }, [
      h("h2", { texto: "Foto da criança" }),
      h("ul", { class: "foto-dicas" }, [
        h("li", { html: "<span>😊</span> Rosto <b>de frente</b>, olhando para a câmera" }),
        h("li", { html: "<span>💡</span> Lugar <b>claro</b>, com a luz de frente (nada de contraluz)" }),
        h("li", { html: "<span>🧢</span> <b>Sem boné</b> e sem óculos escuros" }),
        h("li", { html: "<span>🧒</span> <b>Só a criança</b> na foto" }),
      ]),
      h("p", { class: "foto-privacidade", html: "🔒 A foto fica <b>só neste aparelho</b>: recortamos só o rostinho e o resto da imagem é apagado na hora. Nada é enviado." }),
      btnArquivo, status, lista, manual, previa, recusa,
      h("div", { class: "familia-acoes" }, [h("button", { type: "button", class: "botao branco", texto: "Cancelar", onclick: () => fechar(undefined) })]),
    ]);
    const tela = h("div", { class: "familia-tela foto-tela", role: "dialog", "aria-modal": "true", "aria-label": "Foto da criança" }, [cartao]);
    tela.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); fechar(undefined); } });
    document.body.append(tela);
    obterDetector().then((d) => { detectar = d; pronto = true; if (!d) status.textContent = "Neste aparelho a foto é ajustada à mão: depois de escolher, posicione o círculo sobre o rostinho."; });
    function fechar(v) { tela.remove(); resolver(v); }
    const rotuloBotao = () => { btnArquivo.querySelector(".txt").textContent = `📷 Tirar ou escolher a foto (${Math.min(MAX, tentativas + 1)} de ${MAX})`; btnArquivo.hidden = tentativas >= MAX; };

    async function usarArquivo(arquivo) {
      if (!pronto) detectar = await obterDetector();
      let c;
      try { c = await imagemEmCanvas(arquivo); } catch { status.textContent = "Não consegui abrir essa foto. Tente outra."; return; }
      tentativas++;
      if (!detectar) { ajustarAMao(c); rotuloBotao(); return; }
      status.textContent = "Procurando o rostinho…";
      const r = await analisarFoto(c, detectar);
      descartar(c); // a foto original não fica guardada
      if (r.semDetector) { detectar = null; status.textContent = r.motivo; rotuloBotao(); return; }
      const li = h("li", { class: r.ok ? "bom" : "ruim" }, [
        r.ok ? h("img", { src: r.recorte, alt: "" }) : h("span", { class: "x", texto: "✕" }),
        h("span", { texto: r.ok ? "Rostinho encontrado!" : r.motivo }),
      ]);
      lista.append(li);
      status.textContent = "";
      if (r.ok) bons.push(r);
      rotuloBotao();
      if (bons.length) mostrarPrevia();
      else if (tentativas >= MAX) recusar();
    }
    function mostrarPrevia(recorte = null) {
      const melhor = recorte ?? [...bons].sort((x, y) => y.nota - x.nota)[0].recorte;
      previa.hidden = false; manual.hidden = true;
      previa.innerHTML = "";
      const usar = h("button", { type: "button", class: "botao", texto: "Usar esta foto ✓", onclick: () => fechar(melhor) });
      previa.append(
        h("img", { class: "foto-grande", src: melhor, alt: "Prévia do rosto recortado" }),
        h("div", {}, [
          h("p", { html: `<b>Ficou bom?</b> É assim que o rostinho vai aparecer nos jogos.${bons.length > 1 ? ` Escolhemos a melhor das ${bons.length} fotos.` : ""}` }),
          h("div", { class: "familia-acoes" }, [usar]),
        ]),
      );
      setTimeout(() => usar.focus({ preventScroll: true }), 30);
    }
    function recusar() {
      recusa.hidden = false;
      recusa.innerHTML = "";
      const ok = h("button", { type: "button", class: "botao", texto: "Usar o bonequinho 🙂", onclick: () => fechar(null) });
      recusa.append(h("p", { html: "<b>Não encontramos o rostinho nas fotos.</b> Tudo bem! Por enquanto a criança aparece como o bonequinho no estilo do Rabisco. Dá para tentar de novo outro dia, com mais luz. 💛" }), h("div", { class: "familia-acoes" }, [ok]));
      setTimeout(() => ok.focus({ preventScroll: true }), 30);
    }
    // Sem detector: o responsável arrasta o círculo sobre o rosto e ajusta o tamanho; o recorte só sai quando aprovar
    function ajustarAMao(c) {
      manual.hidden = false; previa.hidden = true;
      manual.innerHTML = "";
      const W = Math.min(320, innerWidth - 80), k = W / c.width, H = Math.round(c.height * k);
      const vis = h("canvas", { width: String(W), height: String(H), class: "foto-ajuste", "aria-label": "Arraste o círculo até o rosto" });
      const menor = Math.min(c.width, c.height);
      const est = { cx: c.width / 2, cy: c.height * 0.42, r: menor * 0.3 };
      const tamanho = h("input", { type: "range", min: "10", max: "50", value: "30", "aria-label": "Tamanho do círculo", oninput: (e) => { est.r = menor * Number(e.target.value) / 100; desenhar(); } });
      const desenhar = () => {
        const x = vis.getContext("2d");
        x.drawImage(c, 0, 0, W, H);
        x.fillStyle = "rgba(10,42,74,0.55)";
        x.beginPath(); x.rect(0, 0, W, H); x.arc(est.cx * k, est.cy * k, est.r * k, 0, Math.PI * 2, true); x.fill();
        x.lineWidth = 4; x.strokeStyle = "#ffcc1f"; x.beginPath(); x.arc(est.cx * k, est.cy * k, est.r * k, 0, Math.PI * 2); x.stroke();
      };
      let arrasto = null;
      vis.addEventListener("pointerdown", (e) => { arrasto = { x: e.clientX, y: e.clientY, cx: est.cx, cy: est.cy }; vis.setPointerCapture(e.pointerId); });
      vis.addEventListener("pointermove", (e) => { if (!arrasto) return; est.cx = arrasto.cx + (e.clientX - arrasto.x) / k; est.cy = arrasto.cy + (e.clientY - arrasto.y) / k; desenhar(); });
      vis.addEventListener("pointerup", () => { arrasto = null; });
      // setas também movem (teclado / controle)
      vis.tabIndex = 0;
      vis.addEventListener("keydown", (e) => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (d) { e.preventDefault(); est.cx += d[0] * menor * 0.03; est.cy += d[1] * menor * 0.03; desenhar(); } });
      const recortar = h("button", { type: "button", class: "botao", texto: "Recortar o rostinho ✓", onclick: () => { const r = recortarRosto(c, est.cx, est.cy, est.r); descartar(c); bons.push({ recorte: r, nota: 1 }); mostrarPrevia(r); } });
      manual.append(
        h("p", { html: "<b>Posicione o círculo sobre o rostinho</b> (arraste) e ajuste o tamanho. Só o que está dentro do círculo fica guardado." }),
        vis, h("label", { class: "foto-tamanho" }, [document.createTextNode("Tamanho"), tamanho]),
        h("div", { class: "familia-acoes" }, [recortar]),
      );
      desenhar();
    }
  });
}

function montarCadastro({ obrigatorio = false, titulo = "Quem vai brincar?", intro = null } = {}) {
  if (telaAberta) return telaAberta.promessa;
  garantirCss();
  const p = perfil || {};
  const R = p.responsavel || {}, C = p.crianca || {};
  const campo = (id, rotulo, props = {}, { largo = false, dica = null } = {}) => {
    const input = h("input", { id: `fam-${id}`, name: id, autocomplete: "off", ...props });
    return h("label", { class: largo ? "largo" : "", for: `fam-${id}` }, [document.createTextNode(rotulo), dica && h("small", { texto: dica }), input]);
  };
  const q = (id) => tela.querySelector(`#fam-${id}`);

  const fotoRoda = h("div", { class: "roda", "aria-hidden": "true" }, [C.foto ? h("img", { src: C.foto, alt: "" }) : document.createTextNode("🙂")]);
  let foto = C.foto || null;
  // a foto passa pela etapa segura (orientação, detecção de rosto local, recorte só do rosto, prévia para aprovar)
  const desenharFoto = () => {
    fotoRoda.innerHTML = "";
    if (foto) fotoRoda.append(h("img", { src: foto, alt: "" })); else fotoRoda.textContent = "🙂";
    btnTirar.hidden = !foto;
    btnFoto.textContent = foto ? "📷 Trocar a foto" : "📷 Foto da criança";
  };
  const btnFoto = h("button", { type: "button", class: "botao-foto", texto: C.foto ? "📷 Trocar a foto" : "📷 Foto da criança", onclick: async () => {
    const r = await abrirEtapaFoto();
    if (r === undefined) return; // cancelou: fica como estava
    foto = r; desenharFoto();
  } });
  const btnTirar = h("button", { type: "button", texto: "✕ Tirar foto", hidden: !C.foto, onclick: () => { foto = null; desenharFoto(); } });

  const selUf = h("select", { id: "fam-uf", name: "uf" }, [h("option", { value: "", texto: "UF" }), ...UFS.map((u) => h("option", { value: u, texto: u, selected: R.uf === u }))]);
  const btnLocal = h("button", { type: "button", class: "pequeno", "aria-label": "Usar minha localização para preencher cidade e estado", title: "Usar minha localização", texto: "📍", onclick: usarLocalizacao });
  const erro = h("p", { class: "erro", role: "alert" });
  const mostrarErro = (t) => { erro.textContent = t; };
  const status = h("span", { class: "status" });
  // aviso sutil: a narradora (voz gravada) tem o nome no banco? (src/motor/voz.js, assets/voz/nomes)
  const avisoNome = h("p", { class: "aviso-nome", "aria-live": "polite" });
  let conferindo = 0;
  const conferirNome = (v) => {
    const minha = ++conferindo;
    clearTimeout(conferirNome.t);
    conferirNome.t = setTimeout(async () => {
      const chave = v.trim() ? await audioDoNome(v) : null;
      if (minha !== conferindo) return;
      avisoNome.textContent = chave ? `🔊 A narradora vai te chamar de ${v.trim().split(/\s+/).slice(0, chave.includes("-") ? 2 : 1).join(" ")}!` : "";
    }, 350);
  };
  if (C.nome) conferirNome(C.nome);

  const form = h("form", { novalidate: true, class: "familia-form" }, [
    h("div", { class: "familia-topo" }, [
      h("img", { class: "logo", src: `${RAIZ}/assets/marca/logos/azul-icone-rosa.png`, alt: "Educarte Escola Cristã" }),
      h("img", { class: "rabisco", src: `${RAIZ}/assets/rabisco/poses/apresentando.png`, alt: "" }),
    ]),
    h("h2", { texto: titulo }),
    h("p", { class: "intro", texto: intro ?? (obrigatorio ? "Um cadastro rapidinho, só uma vez neste aparelho, e o Rabisco já chama a criança pelo nome!" : "Edite os dados da família. A foto fica só neste aparelho.") }),
    h("fieldset", {}, [
      h("legend", { texto: "👩‍👧 Responsável" }),
      h("div", { class: "familia-campos" }, [
        campo("resp-nome", "Seu nome *", { value: R.nome || "", autocomplete: "name", required: true }, { largo: true }),
        campo("email", "E-mail", { type: "email", value: R.email || "", inputmode: "email", autocomplete: "email", placeholder: "voce@exemplo.com" }, { dica: "e-mail ou WhatsApp, pelo menos um" }),
        campo("whats", "WhatsApp", { type: "tel", value: R.whatsapp || "", inputmode: "tel", autocomplete: "tel-national", placeholder: "(11) 99999-9999", oninput: (e) => { e.target.value = mascaraWhats(e.target.value); } }),
        h("div", { class: "familia-local" }, [
          campo("cidade", "Cidade", { value: R.cidade || "", autocomplete: "address-level2" }),
          h("label", { class: "uf", for: "fam-uf" }, [document.createTextNode("Estado"), selUf]),
          btnLocal,
        ]),
      ]),
    ]),
    h("fieldset", {}, [
      h("legend", { class: "crianca", texto: "🧒 Criança" }),
      h("div", { class: "familia-campos" }, [
        campo("crianca-nome", "Nome ou apelido *", { value: C.nome || "", required: true, maxlength: 30, oninput: (e) => conferirNome(e.target.value) }),
        campo("nasc", "Nascimento", { type: "date", value: C.nascimento || "", max: new Date().toISOString().slice(0, 10) }, { dica: "opcional" }),
        h("label", { for: "fam-genero" }, [document.createTextNode("Menina ou menino? *"), h("small", { texto: "para a narradora falar \"pronta\" ou \"pronto\"" }),
          h("select", { id: "fam-genero", name: "genero", required: true }, [
            h("option", { value: "", texto: "Escolha…", disabled: true, selected: !C.genero }),
            ...[["menina", "Menina"], ["menino", "Menino"]].map(([v, t]) => h("option", { value: v, texto: t, selected: C.genero === v }))])]),
        avisoNome,
        h("div", { class: "familia-foto" }, [
          fotoRoda,
          h("div", { class: "botoes" }, [btnFoto, btnTirar]),
        ]),
        h("p", { class: "nota-foto", texto: "A foto é opcional, vira o rostinho da criança dentro dos jogos e fica guardada só neste aparelho. Ela nunca é enviada." }),
      ]),
    ]),
    h("label", { class: "familia-check" }, [
      h("input", { type: "checkbox", id: "fam-consente", checked: Boolean(p.consentimento?.novidades) }),
      h("span", { html: "<b>Quero receber novidades da Educarte</b> por e-mail ou WhatsApp. Seus dados são usados só para isso e você pode cancelar quando quiser. A foto da criança não é enviada." }),
    ]),
    erro,
    h("div", { class: "familia-acoes" }, [
      status,
      h("button", { type: "button", class: "botao branco", texto: "Agora não", onclick: () => fechar(false) }),
      h("button", { type: "submit", class: "botao", texto: obrigatorio ? "Começar a brincar ▶" : "Salvar ✓" }),
    ]),
  ]);
  const tela = h("div", { class: "familia-tela", role: "dialog", "aria-modal": "true", "aria-label": titulo }, [h("div", { class: "familia-cartao" }, [form])]);
  document.body.append(tela);

  async function usarLocalizacao() {
    if (!navigator.geolocation) { mostrarErro("Este aparelho não compartilha localização."); return; }
    status.textContent = "Procurando sua cidade…";
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        // só pedimos cidade e UF; as coordenadas não são guardadas em lugar nenhum
        const { latitude: la, longitude: lo } = pos.coords;
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${la.toFixed(2)}&lon=${lo.toFixed(2)}&accept-language=pt-BR`, { headers: { Accept: "application/json" } });
        const d = await r.json();
        const a = d.address || {};
        const cidade = a.city || a.town || a.village || a.municipality || a.county || "";
        const uf = UFS.find((u) => (a["ISO3166-2-lvl4"] || "").endsWith(`-${u}`)) || "";
        if (cidade) q("cidade").value = cidade;
        if (uf) selUf.value = uf;
        status.textContent = cidade ? "" : "Não achei a cidade, pode digitar.";
      } catch { status.textContent = "Não deu para achar a cidade agora."; }
    }, () => { status.textContent = "Sem permissão para a localização, tudo bem: digite a cidade."; }, { timeout: 8000, maximumAge: 600000 });
  }

  const marcar = (el, ruim) => el.setAttribute("aria-invalid", ruim ? "true" : "false");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = q("resp-nome").value.trim(), email = q("email").value.trim(), whats = q("whats").value.trim();
    const cNome = q("crianca-nome").value.trim();
    marcar(q("resp-nome"), !nome); marcar(q("crianca-nome"), !cNome);
    marcar(q("email"), email && !emailOk(email)); marcar(q("whats"), whats && whats.replace(/\D/g, "").length < 10);
    if (!nome) { mostrarErro("Escreva o seu nome, por favor."); q("resp-nome").focus(); return; }
    if (!email && !whats) { mostrarErro("Deixe um e-mail ou um WhatsApp para a gente falar com você."); marcar(q("email"), true); marcar(q("whats"), true); q("email").focus(); return; }
    if (email && !emailOk(email)) { mostrarErro("Esse e-mail parece incompleto. Confere?"); q("email").focus(); return; }
    if (whats && whats.replace(/\D/g, "").length < 10) { mostrarErro("O WhatsApp precisa ter DDD e número, como (11) 99999-9999."); q("whats").focus(); return; }
    if (!cNome) { mostrarErro("E o nome da criança? É assim que o Rabisco vai chamar ela!"); q("crianca-nome").focus(); return; }
    marcar(q("genero"), !q("genero").value);
    if (!q("genero").value) { mostrarErro("A criança é menina ou menino? Escolha uma opção."); q("genero").focus(); return; }
    const nasc = q("nasc").value;
    if (nasc && idadeDe(nasc) === null) { mostrarErro("A data de nascimento não pode ser no futuro."); q("nasc").focus(); return; }
    mostrarErro("");
    salvar({
      responsavel: { nome, email, whatsapp: whats, cidade: q("cidade").value.trim(), uf: selUf.value },
      crianca: { nome: cNome, nascimento: nasc, genero: q("genero").value, foto },
      consentimento: { novidades: q("consente").checked, em: q("consente").checked ? new Date().toISOString() : (p.consentimento?.em || "") },
      criadoEm: p.criadoEm || new Date().toISOString(),
    });
    fechar(true);
  });
  // Esc fecha (quando não é obrigatório); o foco fica preso dentro do cartão
  const teclas = (e) => {
    if (e.key === "Escape") { e.preventDefault(); fechar(false); }
    if (e.key === "Tab") {
      const f = [...tela.querySelectorAll("input:not([type=file]), select, button")].filter((x) => !x.hidden && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  };
  tela.addEventListener("keydown", teclas);

  let resolver;
  const promessa = new Promise((r) => { resolver = r; });
  function fechar(salvou) { tela.remove(); telaAberta = null; resolver(salvou); }
  telaAberta = { tela, promessa };
  setTimeout(() => (completo() ? q("crianca-nome") : q("resp-nome")).focus({ preventScroll: true }), 50);
  return promessa;
}

export const Familia = { obterPerfil, crianca, temFoto, completo, aoMudar, abrirCadastro, abrirEtapaFoto, portaoDosPais, sincronizar, idadeDe, UFS };
window.Familia = Familia;
export default Familia;
