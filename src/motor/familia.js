// Família: o RESPONSÁVEL (nome completo, telefone, e-mail, PIN da área dos pais e o consentimento) e a ponte para os
// JOGADORES deste aparelho (cada filho e, se quiser, o próprio responsável), que moram em src/motor/perfis.js.
// Fica neste aparelho (localStorage `rabisco.familia` + `rabisco.perfis`) e o CADASTRO (responsável + primeiro nome e
// nascimento de cada criança + consentimentos) vai por POST JSON para `API_CADASTRO` (src/config.js), servidor da
// Educarte, só depois do consentimento do responsável legal (data/hora e versão do termo). Nunca a foto nem o progresso.
//
//   import { Familia } from "../../src/motor/familia.js";   // também em window.Familia
//   Familia.crianca()        → jogador ATIVO { id, nome, nascimento, idade, genero, foto, tipo } ou null (sem nome ainda)
//   Familia.temFoto()        → true/false
//   Familia.completo()       → cadastro feito neste aparelho (responsável + consentimento + 1 jogador com nome)
//   Familia.aoMudar(cb)      → chama cb() quando o cadastro ou o jogador ativo mudam
//   await Familia.abrirCadastro({ obrigatorio: true })  → não abre tela; resolve true na hora (o jogo segue)
//   await Familia.abrirCadastro()  → portão dos pais + área dos pais (src/motor/perfis-ui.js)
//
// As telas (cadastro da 1ª entrada, "Quem vai jogar?", área dos pais) ficam em src/motor/perfis-ui.js.
// Portão dos pais: o PIN de 4 números criado no cadastro (sem PIN, uma conta difícil de fazer de cabeça).
// Foto: até 3 tentativas com orientação; o rosto é achado NO APARELHO (FaceDetector nativa ou o módulo opcional
// DETECTOR_ROSTO de src/config.js), só vale foto com exatamente 1 rosto de tamanho razoável, e só o rostinho é
// recortado em círculo (256 px): o resto da imagem é descartado na hora. Sem detector no navegador (ex.: iPhone),
// o responsável posiciona um círculo sobre o rosto e aprova. A foto nunca sai do aparelho.

import { API_CADASTRO, VERSAO_APP, DETECTOR_ROSTO } from "../config.js";
import { Perfis } from "./perfis.js";

const CHAVE = "rabisco.familia";
const CHAVE_FILA = "rabisco.familia.fila";
// versão do termo de consentimento / política (privacidade.html): mudou o texto, sobe a data
export const VERSAO_TERMO = "2026-11-06";
const RAIZ = new URL("../..", import.meta.url).href.replace(/\/$/, "");
export const URL_PRIVACIDADE = `${RAIZ}/privacidade.html`;

const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

// cadastro antigo (v1: whatsapp, consentimento { novidades, em }) → v2
function normalizar(f) {
  if (!f || typeof f !== "object") return null;
  const R = f.responsavel || {}, c = f.consentimento || {};
  const novidades = c.novidades && typeof c.novidades === "object" ? { aceito: Boolean(c.novidades.aceito), em: c.novidades.em || "" } : { aceito: Boolean(c.novidades), em: c.novidades ? c.em || "" : "" };
  const legal = c.responsavelLegal?.aceito ? { aceito: true, em: c.responsavelLegal.em || "", versaoTermo: c.responsavelLegal.versaoTermo || "" } : null;
  const resp = { nome: String(R.nome || ""), email: String(R.email || ""), telefone: String(R.telefone || R.whatsapp || "") };
  if (R.cidade) resp.cidade = String(R.cidade);
  if (R.uf) resp.uf = String(R.uf);
  return { v: 2, id: typeof f.id === "string" ? f.id : "", segredo: typeof f.segredo === "string" ? f.segredo : "", responsavel: resp, pin: f.pin?.h && f.pin?.sal ? { sal: f.pin.sal, h: f.pin.h } : null, consentimento: { responsavelLegal: legal, novidades }, criadoEm: f.criadoEm || "", atualizadoEm: f.atualizadoEm || "" };
}
let familia = normalizar(ler(CHAVE, null));
if (familia && ler(CHAVE, {})?.v !== 2) gravar(CHAVE, familia);
const ouvintes = new Set();
const avisar = () => { for (const cb of ouvintes) { try { cb(obterPerfil()); } catch { /* ouvinte com erro não trava o cadastro */ } } };
Perfis.aoMudar(avisar);

// ------------------------------------------------------------------ API
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
  const p = Perfis.ativo();
  if (!p?.nome) return null;
  return { id: p.id, nome: p.nome, nascimento: p.nascimento || null, idade: idadeDe(p.nascimento), genero: p.genero || null, foto: p.foto || null, tipo: p.tipo };
}
export function obterPerfil() { const c = crianca(); return familia ? { ...structuredClone(familia), crianca: c } : (c ? { crianca: c } : null); }
export const responsavel = () => (familia?.responsavel ? { ...familia.responsavel } : null);
export const consentimento = () => (familia ? structuredClone(familia.consentimento) : null);
export const temFoto = () => Boolean(Perfis.ativo()?.foto);
export const completo = () => Boolean(familia?.responsavel?.nome && familia.consentimento?.responsavelLegal?.aceito && Perfis.lista().some((p) => p.nome));
export const cadastroFeito = completo;
export function aoMudar(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); }

// Salva o responsável e o consentimento (chamado pela tela do cadastro, depois de validar)
export function salvarCadastro({ responsavel: R, pin = undefined, novidades = false, consentiu = false, enviar = true }) {
  const antes = familia || {};
  const agora = new Date().toISOString();
  const legalAntes = antes.consentimento?.responsavelLegal;
  familia = {
    v: 2,
    id: antes.id || uuid(), segredo: antes.segredo || segredoNovo(),
    responsavel: { ...(antes.responsavel || {}), nome: R.nome, email: R.email, telefone: R.telefone },
    pin: pin === undefined ? antes.pin || null : pin ? cifrarPin(pin) : null,
    consentimento: {
      responsavelLegal: consentiu ? (legalAntes?.aceito && legalAntes.versaoTermo === VERSAO_TERMO ? legalAntes : { aceito: true, em: agora, versaoTermo: VERSAO_TERMO }) : null,
      novidades: novidades ? (antes.consentimento?.novidades?.aceito ? antes.consentimento.novidades : { aceito: true, em: agora }) : { aceito: false, em: "" },
    },
    criadoEm: antes.criadoEm || agora,
    atualizadoEm: agora,
  };
  gravar(CHAVE, familia);
  avisar();
  if (enviar) enfileirar();
  return true;
}

// ------------------------------------------------------------------ PIN dos pais (guardado só como "impressão", com sal)
const fnv = (s) => { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const impressao = (pin, sal) => { let x = `${sal}:${pin}`; for (let i = 0; i < 2000; i++) x = fnv(`${x}|${sal}|${i}`); return x; };
function cifrarPin(pin) { const sal = Math.random().toString(36).slice(2, 10); return { sal, h: impressao(String(pin), sal) }; }
export const temPin = () => Boolean(familia?.pin?.h);
export const conferirPin = (pin) => Boolean(familia?.pin?.h) && impressao(String(pin), familia.pin.sal) === familia.pin.h;
export function definirPin(pin) { if (!familia) return false; familia.pin = cifrarPin(pin); familia.atualizadoEm = new Date().toISOString(); gravar(CHAVE, familia); return true; }
export const conferirEmail = (e) => Boolean(familia?.responsavel?.email) && String(e).trim().toLowerCase() === familia.responsavel.email.trim().toLowerCase();
export const PINS_FACEIS = new Set(["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234", "4321", "0123", "1212"]);

// "Apagar todos os dados deste aparelho": cadastro, fila de envio, perfis, fotos e progresso de todos
// e pede ao servidor da Educarte para apagar o cadastro (DELETE com o segredo; se falhar, tenta de novo depois)
export function apagarTudo() {
  const quem = familia?.id && familia?.segredo ? { id: familia.id, segredo: familia.segredo } : null;
  const pendentes = ler(CHAVE_EXCLUIR, []);
  Perfis.apagarTudo();
  familia = null;
  let envio = Promise.resolve(false);
  if (API_CADASTRO && (quem || pendentes.length)) { gravar(CHAVE_EXCLUIR, [...pendentes.filter((x) => x.id !== quem?.id), ...(quem ? [quem] : [])]); envio = sincronizar(); }
  avisar();
  return envio; // resolve quando o pedido de exclusão terminou (ou falhou: fica pendente e tenta de novo depois)
}

// ------------------------------------------------------------------ Envio do cadastro para a Educarte (API_CADASTRO)
// Só o cadastro: responsável + primeiro nome e nascimento de cada criança + consentimentos. Nunca a foto, nunca o
// progresso. O `id` (UUID gerado no aparelho) faz o servidor ATUALIZAR em vez de duplicar; o `segredo` (aleatório, do
// aparelho; o servidor guarda só o hash) autoriza a exclusão: DELETE <API_CADASTRO>/<id> com o cabeçalho X-Segredo.
// Sem internet ou servidor fora: guarda o último pacote e tenta de novo depois (ao abrir, ao voltar a internet), sem
// travar o jogo. Vazio em src/config.js = nada sai do aparelho.
const CHAVE_EXCLUIR = "rabisco.familia.excluir"; // exclusões pendentes [{ id, segredo }] (sobrevivem ao "apagar tudo")
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("");
const uuid = () => crypto.randomUUID?.() || (() => { const x = hex(16); return `${x.slice(0, 8)}-${x.slice(8, 12)}-4${x.slice(13, 16)}-a${x.slice(17, 20)}-${x.slice(20, 32)}`; })();
const segredoNovo = () => hex(24);
export function pacote() {
  if (!familia?.consentimento?.responsavelLegal?.aceito || !familia.id) return null;
  const L = familia.consentimento.responsavelLegal, N = familia.consentimento.novidades;
  return {
    id: familia.id, segredo: familia.segredo,
    responsavel: { nome: familia.responsavel.nome, telefone: familia.responsavel.telefone || "", email: familia.responsavel.email || "" },
    criancas: Perfis.lista().filter((p) => p.tipo === "crianca" && p.nome).map((p) => ({ nome: p.nome.split(" ")[0], nascimento: p.nascimento || "" })),
    consentimento: { privacidade: true, versao: L.versaoTermo, em: L.em },
    marketing: { aceito: Boolean(N?.aceito), em: N?.aceito && N.em ? N.em : null }, // servidor: em = data ISO ou null
    origem: "jogos-do-rabisco", app: VERSAO_APP,
  };
}
// guarda o pacote atual para envio (o mais novo substitui o anterior: o servidor atualiza pelo id) e tenta mandar
export function enfileirar() {
  if (!API_CADASTRO) return false; // vazio = nada sai do aparelho
  const p = pacote();
  if (!p) return false;
  gravar(CHAVE_FILA, p);
  sincronizar();
  return true;
}
const tirar = (k) => { try { localStorage.removeItem(k); } catch { /* */ } };
let sincronizando = null;
export function sincronizar() {
  if (!API_CADASTRO) return Promise.resolve(false);
  if (sincronizando) return sincronizando;
  sincronizando = (async () => {
    try {
      // 1) exclusões pendentes ("Apagar todos os dados")
      let excluir = ler(CHAVE_EXCLUIR, []);
      for (const x of [...excluir]) {
        try {
          const r = await fetch(`${API_CADASTRO.replace(/\/$/, "")}/${encodeURIComponent(x.id)}`, { method: "DELETE", headers: { "X-Segredo": x.segredo }, keepalive: true });
          if (r.ok || (r.status < 500 && r.status !== 429)) excluir = excluir.filter((y) => y.id !== x.id); // feito (ou já não existe)
        } catch { /* sem rede: tenta depois */ }
      }
      if (excluir.length) gravar(CHAVE_EXCLUIR, excluir); else tirar(CHAVE_EXCLUIR);
      // 2) cadastro pendente
      const p = ler(CHAVE_FILA, null);
      if (!p || Array.isArray(p)) { if (Array.isArray(p)) tirar(CHAVE_FILA); return true; } // (fila antiga, do webhook)
      try {
        const r = await fetch(API_CADASTRO, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p), keepalive: true });
        // enviado, ou recusado de vez (dado inválido): não repete; 5xx/429: tenta depois
        if (r.ok || (r.status < 500 && r.status !== 429)) { if (JSON.stringify(ler(CHAVE_FILA, null)) === JSON.stringify(p)) tirar(CHAVE_FILA); }
      } catch { /* sem rede: fica guardado */ }
      return true;
    } catch { return false; }
  })();
  // limpa DEPOIS de guardar a promessa (se tudo terminar na hora, um finally lá dentro rodaria antes da atribuição)
  const esta = sincronizando;
  esta.then(() => { if (sincronizando === esta) sincronizando = null; });
  return esta;
}
if (API_CADASTRO) { addEventListener("online", () => sincronizar()); setTimeout(() => sincronizar(), 3000); }

// ------------------------------------------------------------------ Fale com a gente (WhatsApp da Educarte)
export const WHATSAPP = "5547999236042";
export function linkWhatsApp() {
  const nome = (familia?.responsavel?.nome || "").trim().split(/\s+/)[0];
  const filhos = Perfis.lista().filter((p) => p.tipo === "crianca" && p.nome).map((p) => p.nome.split(" ")[0]);
  const lista = filhos.length > 1 ? `${filhos.slice(0, -1).join(", ")} e ${filhos.at(-1)}` : filhos[0] || "";
  const texto = nome
    ? `Olá! Sou ${nome}${lista ? `, responsável por ${lista},` : ""} e vim pelo Jogo do Rabisco 🎨. Queria falar sobre: `
    : "Olá! Vim pelo Jogo do Rabisco 🎨 e queria falar sobre: ";
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

// ------------------------------------------------------------------ Telas (src/motor/perfis-ui.js, carregado sob demanda)
const ui = () => import("./perfis-ui.js");
// obrigatorio: true não abre nada e resolve true (os jogos funcionam sem cadastro). Sem obrigatorio: portão dos pais
// e a área dos pais (editar o responsável, adicionar/editar/apagar jogadores, apagar tudo).
export function abrirCadastro(opcoes = {}) {
  if (opcoes.obrigatorio) return Promise.resolve(true);
  return ui().then((m) => m.abrirAreaDosPais());
}
export function portaoDosPais(opcoes = {}) { return ui().then((m) => m.portaoDosPais(opcoes)); }

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

// ------------------------------------------------------------------ Máscara de telefone (BR): (11) 99999-9999
export function mascaraWhats(v) {
  const d = v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ------------------------------------------------------------------ Telas: CSS e montagem de elementos (sem innerHTML com dado do cadastro)
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

export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export { h, garantirCss };

export const Familia = {
  obterPerfil, crianca, responsavel, consentimento, temFoto, completo, cadastroFeito, aoMudar, abrirCadastro, abrirEtapaFoto, portaoDosPais,
  salvarCadastro, temPin, conferirPin, definirPin, conferirEmail, apagarTudo, sincronizar, pacote, enfileirar, linkWhatsApp, WHATSAPP, idadeDe, mascaraWhats, mascaraTelefone: mascaraWhats, emailOk,
  VERSAO_TERMO, URL_PRIVACIDADE,
};
window.Familia = Familia;
export default Familia;

// "👤 Quem vai jogar?" no ⚙️ de cada jogo (e do portal): troca o jogador ativo
ui().then((m) => m.ligarNaEngrenagem()).catch(() => { /* sem a tela: o jogo segue */ });
