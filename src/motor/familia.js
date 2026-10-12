// Cadastro da família: responsável (nome, e-mail, WhatsApp, cidade/UF) e criança (nome, nascimento,
// menina/menino, foto). Fica em localStorage (`rabisco.familia`) e, se `WEBHOOK_FAMILIA` (src/config.js)
// estiver preenchido, vai por POST JSON sem a foto, com fila e retentativa quando estiver sem internet.
//
//   import { Familia } from "../../src/motor/familia.js";   // também em window.Familia
//   Familia.crianca()        → { nome, nascimento, idade, genero, foto } ou null
//   Familia.temFoto()        → true/false
//   Familia.completo()       → cadastro mínimo feito neste aparelho
//   Familia.aoMudar(cb)      → chama cb(perfil) sempre que o cadastro for salvo
//   await Familia.abrirCadastro({ obrigatorio: true })  → abre a tela; resolve true se salvou
//
// Privacidade: a foto da criança nunca sai do aparelho (não entra no envio).

import { WEBHOOK_FAMILIA, VERSAO_APP } from "../config.js";
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
// obrigatorio: sem "Agora não" (primeiro jogo). titulo/intro: textos do topo. Resolve true se salvou.
export function abrirCadastro({ obrigatorio = false, titulo = "Quem vai brincar?", intro = null } = {}) {
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
  const trocarFoto = async (arquivo) => {
    if (!arquivo) return;
    try {
      foto = await prepararFoto(arquivo);
      fotoRoda.innerHTML = "";
      fotoRoda.append(h("img", { src: foto, alt: "" }));
      btnTirar.hidden = false;
    } catch { mostrarErro("Não consegui abrir essa foto. Tente outra."); }
  };
  const entradaArquivo = (texto, extra) => h("label", { class: "botao-arquivo" }, [
    document.createTextNode(texto),
    h("input", { type: "file", accept: "image/*", ...extra, onchange: (e) => trocarFoto(e.target.files?.[0]) }),
  ]);
  const btnTirar = h("button", { type: "button", texto: "✕ Tirar foto", hidden: !C.foto, onclick: () => { foto = null; fotoRoda.innerHTML = "🙂"; btnTirar.hidden = true; } });

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
        h("label", { for: "fam-genero" }, [document.createTextNode("Menina ou menino?"), h("small", { texto: "opcional, para falar \"pronta\" ou \"pronto\"" }),
          h("select", { id: "fam-genero", name: "genero" }, [["", "Prefiro não dizer"], ["menina", "Menina"], ["menino", "Menino"]].map(([v, t]) => h("option", { value: v, texto: t, selected: (C.genero || "") === v })))]),
        avisoNome,
        h("div", { class: "familia-foto" }, [
          fotoRoda,
          h("div", { class: "botoes" }, [entradaArquivo("📷 Câmera", { capture: "user" }), entradaArquivo("🖼️ Galeria", {}), btnTirar]),
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
      !obrigatorio && h("button", { type: "button", class: "botao branco", texto: "Agora não", onclick: () => fechar(false) }),
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
    if (e.key === "Escape" && !obrigatorio) { e.preventDefault(); fechar(false); }
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

export const Familia = { obterPerfil, crianca, temFoto, completo, aoMudar, abrirCadastro, sincronizar, idadeDe, UFS };
window.Familia = Familia;
export default Familia;
