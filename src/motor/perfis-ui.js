// Telas da família e dos jogadores (carregado sob demanda por src/motor/familia.js e pelo portal):
//   · primeiraEntrada()   → na 1ª vez no portal: questionário único e rápido (2 telas): responsável (nome completo,
//                           telefone, e-mail, PIN) + jogadores (primeiro nome, nascimento, menina/menino). Não pede foto;
//                           a foto que já existir num perfil antigo continua aparecendo (avatar e chip).
//                           "adicionar outro filho", "eu também quero jogar" e o consentimento do responsável legal.
//   · abrirQuemJoga()     → "Quem vai jogar?": avatares grandes; tocar troca o jogador (a página recarrega no perfil dele).
//   · abrirAreaDosPais()  → atrás do portão dos pais (PIN): adicionar/editar/apagar jogador, editar o cadastro,
//                           política de privacidade e "Apagar todos os dados deste aparelho".
//   · ligarChip(botão)    → chip "quem está jogando" (topo do portal); ligarNaEngrenagem() → "👤 Quem vai jogar?" no ⚙️.
// Funciona com toque, teclado e controle (o foco anda dentro da janela: src/motor/controle.js). Nome vindo do cadastro
// só entra na tela por textContent (nunca innerHTML).

import { Familia, h, garantirCss as cssFamilia, mascaraWhats, emailOk, idadeDe, PINS_FACEIS, URL_PRIVACIDADE, enfileirar, linkWhatsApp } from "./familia.js";
import { Perfis } from "./perfis.js";
import { definirModal, focar, navegarComTeclado } from "./controle.js";
import { pausaAtual } from "./pausa.js";
import { Engrenagem } from "./engrenagem.js";
import { audioDoNome } from "./voz.js";

const RAIZ = new URL("../..", import.meta.url).href.replace(/\/$/, "");
const CHAVE_DEPOIS = "rabisco.cadastro.depois"; // "Agora não" na 1ª entrada: não pergunta de novo nesta visita (sessionStorage)

let cssPronto = false;
function garantirCss() {
  cssFamilia();
  if (cssPronto) return;
  cssPronto = true;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = new URL("./perfis.css", import.meta.url).href;
  document.head.append(l);
}

// ------------------------------------------------------------------ janelas empilhadas (foco do controle + pausa do jogo)
const pilha = [];
let pausou = false;
function restaurarTopo() {
  const topo = pilha.at(-1);
  if (topo) definirModal(topo.tela, { aoVoltar: topo.aoVoltar });
  else {
    definirModal(null);
    if (pausou) { pausou = false; try { pausaAtual()?.continuar(); } catch { /* */ } }
  }
}
function abrirJanela(tela, aoVoltar) {
  garantirCss();
  if (!pilha.length) {
    const p = pausaAtual();
    pausou = false;
    try { if (p && !p.ativa && p.podePausar?.()) { p.pausar(); pausou = true; } } catch { /* sem pausa: segue */ }
  }
  pilha.push({ tela, aoVoltar });
  definirModal(tela, { aoVoltar });
  // as teclas ficam na janela (o jogo de trás não anda enquanto digita); setas andam entre os botões
  tela.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") { e.preventDefault(); aoVoltar(); return; }
    const campo = e.target?.matches?.("input:not([type=checkbox]):not([type=radio]), select, textarea");
    if (!campo) navegarComTeclado(tela, e);
  });
  for (const tipo of ["keyup", "keypress"]) tela.addEventListener(tipo, (e) => e.stopPropagation());
  document.body.append(tela);
}
function fecharJanela(tela) {
  tela.remove();
  const i = pilha.findIndex((x) => x.tela === tela);
  if (i >= 0) pilha.splice(i, 1);
  restaurarTopo();
}
const janela = (rotulo, classe, filhos) => h("div", { class: `familia-tela perfis-tela ${classe}`, role: "dialog", "aria-modal": "true", "aria-label": rotulo }, [h("div", { class: `familia-cartao ${classe}-cartao` }, filhos)]);
const focarDepois = (el) => setTimeout(() => { if (el?.isConnected) { try { el.focus({ preventScroll: true }); } catch { /* */ } if (el.matches?.("button, a")) focar(el); } }, 60);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ------------------------------------------------------------------ avatar
const emoji = (p) => (p?.tipo === "adulto" ? (p.genero === "menino" ? "👨" : p.genero === "menina" ? "👩" : "🧑") : p?.genero === "menina" ? "👧" : p?.genero === "menino" ? "👦" : "🧒");
function avatar(p, i = 0, classe = "perfil-avatar") {
  const r = h("span", { class: `${classe} cor-${i % 6}`, "aria-hidden": "true" });
  if (p?.foto) r.append(h("img", { src: p.foto, alt: "" })); else r.textContent = emoji(p);
  return r;
}
const idadeTexto = (p) => { if (p.tipo === "adulto") return "Adulto"; const i = idadeDe(p.nascimento); return i == null ? "" : i === 1 ? "1 ano" : `${i} anos`; };

// ------------------------------------------------------------------ chip do jogador (topo do portal)
export function ligarChip(btn) {
  if (!btn || btn.dataset.perfis) return;
  btn.dataset.perfis = "1";
  const desenhar = () => {
    const p = Perfis.ativo(), nome = p?.nome || "";
    const roda = h("span", { class: "roda" });
    if (p?.foto) roda.append(h("img", { src: p.foto, alt: "" })); else roda.textContent = nome ? emoji(p) : "🧒";
    btn.replaceChildren(roda, h("span", { class: "nome", texto: nome ? nome.split(" ")[0] : "Quem joga?" }));
    btn.setAttribute("aria-label", nome ? `Jogando agora: ${nome}. Trocar de jogador` : "Quem vai jogar? Escolher o jogador");
  };
  desenhar();
  Perfis.aoMudar(desenhar);
  Familia.aoMudar(desenhar);
  btn.addEventListener("click", () => abrirQuemJoga());
}

let naEngrenagem = false;
export function ligarNaEngrenagem() {
  if (naEngrenagem) return;
  naEngrenagem = true;
  Engrenagem.extra({
    id: "perfil", ic: "👤", texto: "Quem vai jogar?",
    get sub() { const n = Perfis.ativo()?.nome; return n ? `Agora: ${esc(n)}. Toque para trocar` : "Escolher o jogador"; },
    acao: () => abrirQuemJoga(),
  });
}

// ------------------------------------------------------------------ 1ª entrada no portal
export function primeiraEntrada() {
  if (Familia.completo()) return Promise.resolve(false);
  try { if (sessionStorage.getItem(CHAVE_DEPOIS) || sessionStorage.getItem("rabisco.tv")) return Promise.resolve(false); } catch { /* sem armazenamento: pergunta */ }
  return abrirCadastroCompleto({ primeira: true });
}

// ------------------------------------------------------------------ "Quem vai jogar?"
let quemAberta = null;
export function abrirQuemJoga() {
  if (quemAberta) return quemAberta;
  quemAberta = new Promise((resolver) => {
    const lista = Perfis.lista(), atual = Perfis.idAtivo();
    const fechar = (v = false) => { fecharJanela(tela); quemAberta = null; resolver(v); };
    const escolher = (id) => {
      if (id === atual) { fechar(false); return; }
      fechar(true);
      Perfis.trocar(id); // recarrega a página já com o progresso dele
    };
    const grade = h("div", { class: "quem-grade" }, lista.map((p, i) => h("button", {
      type: "button", class: `quem-item${p.id === atual ? " ativo" : ""}`, "data-perfil": p.id,
      "aria-label": `${p.nome || "Jogador"}${p.id === atual ? ", jogando agora" : ""}`, onclick: () => escolher(p.id),
    }, [avatar(p, i), h("span", { class: "quem-nome", texto: p.nome || "Jogador" }), h("small", { texto: p.id === atual ? "jogando agora" : idadeTexto(p) })])));
    const btnPais = h("button", { type: "button", class: "botao branco", "data-acao": "pais", texto: "🔒 Área dos pais", onclick: () => { fechar(false); abrirAreaDosPais(); } });
    const tela = janela("Quem vai jogar?", "quem", [
      h("img", { class: "quem-rabisco", src: `${RAIZ}/assets/rabisco/poses/apresentando.png`, alt: "" }),
      h("h2", { texto: "Quem vai jogar?" }),
      h("p", { class: "intro", texto: lista.length > 1 ? "Toque em quem vai jogar agora. Cada um tem as suas moedas, a sua casa e o seu álbum!" : "Para cada filho ter o seu progresso, peça a um adulto para adicionar na Área dos pais." }),
      grade,
      h("a", { class: "quem-contato", "data-acao": "whatsapp", href: linkWhatsApp(), target: "_blank", rel: "noopener", texto: "💬 Fale com a gente" }),
      h("div", { class: "familia-acoes" }, [btnPais, h("button", { type: "button", class: "botao", "data-acao": "fechar", texto: "Fechar ✓", onclick: () => fechar(false) })]),
    ]);
    abrirJanela(tela, () => fechar(false));
    focarDepois(grade.querySelector(".quem-item.ativo") || grade.firstChild);
  });
  return quemAberta;
}

// ------------------------------------------------------------------ portão dos pais
// Com PIN: o PIN de 4 números do cadastro (depois de 2 erros, "Esqueci o PIN" pede o e-mail do responsável completo).
// Sem PIN (cadastro antigo ou sem cadastro): uma conta de 2 algarismos × 1 (ex.: 17 × 8), que criança não faz de cabeça rápido.
// 5 erros seguidos: espera 30 segundos.
export function portaoDosPais({ texto = "Esta parte é para os adultos." } = {}) {
  return new Promise((resolver) => {
    let modo = Familia.temPin() ? "pin" : "conta", a = 0, b = 0, erros = 0, travadoAte = 0;
    const pergunta = h("p", { class: "portao-pergunta" });
    const dica = h("p", { class: "portao-dica" });
    const campo = h("input", { id: "portao-resposta", autocomplete: "off", enterkeyhint: "done", "aria-label": "Resposta" });
    const erro = h("p", { class: "erro", role: "alert" });
    const email = Familia.responsavel()?.email || "";
    const btnEsqueci = h("button", { type: "button", class: "portao-esqueci", hidden: true, texto: "Esqueci o PIN", onclick: () => { modo = "email"; preparar(); btnEsqueci.hidden = true; campo.focus(); } });
    const preparar = () => {
      campo.value = ""; erro.textContent = "";
      if (modo === "pin") {
        pergunta.textContent = "Digite o PIN dos pais";
        dica.textContent = "Os 4 números criados no cadastro.";
        Object.assign(campo, { type: "password", inputMode: "numeric", maxLength: 4, pattern: "[0-9]*" });
      } else if (modo === "email") {
        pergunta.textContent = "Digite o e-mail do responsável";
        const [u, d] = email.split("@");
        dica.textContent = `O e-mail completo do cadastro (${u.slice(0, 1)}•••@${d || ""}).`;
        Object.assign(campo, { type: "email", inputMode: "email", maxLength: 80 });
        campo.removeAttribute("pattern");
      } else {
        a = 12 + Math.floor(Math.random() * 8); b = 6 + Math.floor(Math.random() * 4);
        pergunta.replaceChildren(document.createTextNode("Quanto é "), h("b", { class: "portao-conta", texto: `${a} × ${b}` }), document.createTextNode("?"));
        dica.textContent = Familia.completo() ? "Dica: crie um PIN na Área dos pais (Editar cadastro) para entrar mais rápido." : "";
        Object.assign(campo, { type: "text", inputMode: "numeric", maxLength: 3, pattern: "[0-9]*" });
      }
    };
    const form = h("form", { class: "portao-form", novalidate: true }, [
      h("div", { class: "portao-cadeado", "aria-hidden": "true", texto: "🔒" }),
      h("h2", { texto: "Área dos pais" }),
      h("p", { class: "intro", texto }),
      pergunta, dica, campo, erro, btnEsqueci,
      h("div", { class: "familia-acoes" }, [
        h("button", { type: "button", class: "botao branco", texto: "Voltar", onclick: () => fechar(false) }),
        h("button", { type: "submit", class: "botao", texto: "Entrar ✓" }),
      ]),
    ]);
    const tela = janela("Área dos pais", "portao", [form]);
    tela.classList.add("portao-tela");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (Date.now() < travadoAte) { erro.textContent = "Muitas tentativas. Espere 30 segundinhos e tente de novo."; return; }
      const v = campo.value.trim();
      const certo = modo === "pin" ? Familia.conferirPin(v.replace(/\D/g, "")) : modo === "email" ? Familia.conferirEmail(v) : v !== "" && Number(v.replace(/\D/g, "")) === a * b;
      if (certo) { fechar(true); return; }
      erros++;
      if (modo === "conta") preparar();
      campo.value = "";
      erro.textContent = modo === "pin" ? "PIN errado. Esta parte é para os adultos." : modo === "email" ? "Não é esse o e-mail do cadastro." : "Ops! Essa não é. Peça ajuda a um adulto e tente esta outra:";
      if (modo === "pin" && erros >= 2 && email) btnEsqueci.hidden = false;
      if (erros >= 5) { erros = 0; travadoAte = Date.now() + 30000; erro.textContent = "Muitas tentativas. Espere 30 segundinhos e tente de novo."; }
      campo.focus();
    });
    function fechar(ok) { fecharJanela(tela); resolver(ok); }
    preparar();
    abrirJanela(tela, () => fechar(false));
    focarDepois(campo);
  });
}

// ------------------------------------------------------------------ confirmação
function confirmar({ titulo, texto, sim = "Sim", nao = "Cancelar", perigo = false }) {
  return new Promise((resolver) => {
    const bSim = h("button", { type: "button", class: `botao${perigo ? " perigo" : ""}`, "data-acao": "sim", texto: sim, onclick: () => fechar(true) });
    const bNao = h("button", { type: "button", class: "botao branco", "data-acao": "nao", texto: nao, onclick: () => fechar(false) });
    const tela = janela(titulo, "confirmar", [h("h2", { texto: titulo }), h("p", { class: "intro", texto }), h("div", { class: "familia-acoes" }, [bNao, bSim])]);
    function fechar(v) { fecharJanela(tela); resolver(v); }
    abrirJanela(tela, () => fechar(false));
    focarDepois(bNao);
  });
}

// ------------------------------------------------------------------ campos
let seq = 0;
function campo(rotulo, props = {}, { dica = null, largo = false } = {}) {
  const id = props.id || `pf-${++seq}`;
  const input = h("input", { autocomplete: "off", ...props, id });
  const label = h("label", { class: largo ? "largo" : "", for: id }, [document.createTextNode(rotulo), dica && h("small", { texto: dica }), input]);
  return { label, input };
}
// menina/menino (ou pronta/pronto para o adulto) como 2 pílulas grandes
function escolhaGenero(nome, valor, { adulto = false } = {}) {
  const ops = adulto ? [["menina", "👩 Pronta!"], ["menino", "👨 Pronto!"]] : [["menina", "👧 Menina"], ["menino", "👦 Menino"]];
  const caixa = h("div", { class: "pilulas", role: "radiogroup", "aria-label": adulto ? "A narradora diz pronta ou pronto?" : "Menina ou menino?" },
    ops.map(([v, t]) => h("label", { class: "pilula" }, [h("input", { type: "radio", name: nome, value: v, checked: valor === v }), h("span", { texto: t })])));
  return { caixa, valor: () => caixa.querySelector("input:checked")?.value || "", radios: () => [...caixa.querySelectorAll("input")] };
}
const marcar = (el, ruim) => el?.setAttribute("aria-invalid", ruim ? "true" : "false");
const nomeLimpo = (s, max = 20) => String(s || "").replace(/[^\p{L}\p{M}' -]/gu, "").replace(/\s+/g, " ").trim().slice(0, max);
const hoje = () => new Date().toISOString().slice(0, 10);
function validarNascimento(nasc, nome, { adulto = false } = {}) {
  if (!nasc) return `Falta a data de nascimento${nome ? ` de ${nome}` : ""}.`;
  const i = idadeDe(nasc);
  if (i === null) return "A data de nascimento não pode ser no futuro.";
  if (!adulto && i > 17) return `${nome || "Essa pessoa"} tem 18 anos ou mais? Para adulto, marque "Eu também quero jogar".`;
  if (i > 120) return "Confere o ano de nascimento?";
  return null;
}
// aviso: a narradora (voz gravada) tem o nome no banco? (src/motor/voz.js, assets/voz/nomes)
function avisoDoNome() {
  const p = h("p", { class: "aviso-nome", "aria-live": "polite" });
  let vez = 0, t = 0;
  const conferir = (v) => {
    const minha = ++vez;
    clearTimeout(t);
    t = setTimeout(async () => {
      const chave = v.trim() ? await audioDoNome(v).catch(() => null) : null;
      if (minha !== vez) return;
      p.textContent = chave ? `🔊 A narradora vai chamar de ${v.trim().split(/\s+/).slice(0, chave.includes("-") ? 2 : 1).join(" ")}!` : "";
    }, 350);
  };
  return { p, conferir };
}

// ------------------------------------------------------------------ questionário (1ª entrada e "Editar cadastro")
let cadastroAberto = null;
export function abrirCadastroCompleto({ primeira = false } = {}) {
  if (cadastroAberto) return cadastroAberto;
  garantirCss();
  cadastroAberto = new Promise((resolver) => {
    const R = Familia.responsavel() || {};
    const consent = Familia.consentimento();
    const existentes = Perfis.lista();
    const adultoExiste = existentes.find((p) => p.tipo === "adulto");
    const filhos = existentes.filter((p) => p.tipo === "crianca").map((p) => ({ id: p.id, nome: p.nome, nascimento: p.nascimento, genero: p.genero, foto: p.foto }));
    if (!filhos.length) filhos.push({ id: null, nome: "", nascimento: "", genero: "", foto: null });
    const editando = Familia.completo();
    let etapa = 1;

    // ---------- etapa 1: responsável
    const fNome = campo("Seu nome completo *", { value: R.nome || "", autocomplete: "name", maxlength: 80, "data-campo": "resp-nome" }, { largo: true });
    const fTel = campo("Telefone (WhatsApp) *", { type: "tel", value: R.telefone ? mascaraWhats(R.telefone) : "", inputmode: "tel", autocomplete: "tel-national", placeholder: "(11) 99999-9999", "data-campo": "telefone", oninput: (e) => { e.target.value = mascaraWhats(e.target.value); } });
    const fEmail = campo("E-mail *", { type: "email", value: R.email || "", inputmode: "email", autocomplete: "email", placeholder: "voce@exemplo.com", maxlength: 80, "data-campo": "email" });
    const temPin = Familia.temPin();
    const fPin = campo(temPin ? "PIN dos pais" : "Crie um PIN dos pais *", { type: "text", inputmode: "numeric", pattern: "[0-9]*", maxlength: 4, autocomplete: "off", placeholder: temPin ? "••••" : "4 números", "data-campo": "pin", class: "campo-pin", oninput: (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4); } },
      { dica: temPin ? "deixe em branco para manter o atual" : "4 números para entrar na Área dos pais (trocar e apagar jogadores)" });
    const erro1 = h("p", { class: "erro", role: "alert" });
    const etapa1 = h("div", { class: "cad-etapa", "data-etapa": "1" }, [
      h("fieldset", {}, [h("legend", { texto: "👩‍👧 Responsável" }), h("div", { class: "familia-campos" }, [fNome.label, fTel.label, fEmail.label, fPin.label])]),
      h("p", { class: "nota-cpf", texto: "Não pedimos CPF nem RG. O progresso dos jogos fica só neste aparelho." }),
      erro1,
      h("div", { class: "familia-acoes" }, [
        h("button", { type: "button", class: "botao branco", "data-acao": "depois", texto: primeira ? "Agora não" : "Cancelar", onclick: () => fechar(false, true) }),
        h("button", { type: "button", class: "botao", "data-acao": "continuar", texto: "Continuar ▶", onclick: () => irPara2() }),
      ]),
    ]);

    // ---------- etapa 2: jogadores
    const listaFilhos = h("div", { class: "cad-filhos" });
    const btnMais = h("button", { type: "button", class: "botao-mais", "data-acao": "mais-filho", texto: "➕ Adicionar outro filho", onclick: () => { filhos.push({ id: null, nome: "", nascimento: "", genero: "", foto: null }); desenharFilhos(); focarDepois(listaFilhos.lastChild?.querySelector("input")); } });
    const chkAdulto = h("input", { type: "checkbox", id: "cad-adulto", checked: Boolean(adultoExiste), disabled: Boolean(adultoExiste) });
    const gAdulto = escolhaGenero("cad-adulto-g", adultoExiste?.genero || "", { adulto: true });
    const caixaGAdulto = h("div", { class: "cad-adulto-genero", hidden: true }, [h("span", { texto: "A narradora vai dizer:" }), gAdulto.caixa]);
    chkAdulto.addEventListener("change", () => { caixaGAdulto.hidden = !chkAdulto.checked || Boolean(adultoExiste); });
    const chkLgpd = h("input", { type: "checkbox", id: "cad-lgpd", checked: Boolean(consent?.responsavelLegal?.aceito) });
    const chkNovidades = h("input", { type: "checkbox", id: "cad-novidades", checked: Boolean(consent?.novidades?.aceito) });
    const linkPolitica = h("a", { href: URL_PRIVACIDADE, target: "_blank", rel: "noopener", texto: "Política de privacidade" });
    const erro2 = h("p", { class: "erro", role: "alert" });
    const etapa2 = h("div", { class: "cad-etapa", "data-etapa": "2", hidden: true }, [
      h("fieldset", {}, [h("legend", { class: "crianca", texto: "🧒 Quem vai jogar" }), listaFilhos, btnMais]),
      h("label", { class: "familia-check cad-adulto" }, [chkAdulto, h("span", {}, [h("b", { texto: "🙋 Eu também quero jogar" }), document.createTextNode(adultoExiste ? " (você já tem o seu perfil)" : " (um perfil só seu, com as suas missões)")])]),
      caixaGAdulto,
      h("label", { class: "familia-check cad-lgpd" }, [chkLgpd, h("span", {}, [
        h("b", { texto: "Sou o pai, a mãe ou o responsável legal" }),
        document.createTextNode(" e autorizo a Educarte a guardar estes dados (neste aparelho e no servidor da escola) para os jogos chamarem cada criança pelo nome, separarem o progresso e para contato e suporte. Li a "),
        linkPolitica, document.createTextNode(". *"),
      ])]),
      h("label", { class: "familia-check" }, [chkNovidades, h("span", {}, [h("b", { texto: "Aceito receber novidades e pedidos de opinião da Educarte" }), document.createTextNode(" pelo WhatsApp/e-mail (opcional; dá para cancelar quando quiser).")])]),
      erro2,
      h("div", { class: "familia-acoes" }, [
        h("button", { type: "button", class: "botao branco", "data-acao": "voltar", texto: "◀ Voltar", onclick: () => irPara1() }),
        h("button", { type: "submit", class: "botao", "data-acao": "salvar", texto: editando ? "Salvar ✓" : "Começar a brincar ▶" }),
      ]),
    ]);

    function desenharFilhos() {
      listaFilhos.replaceChildren(...filhos.map((f, i) => {
        const aviso = avisoDoNome();
        const nome = campo(i === 0 ? "Primeiro nome da criança *" : "Primeiro nome *", { value: f.nome || "", maxlength: 20, autocomplete: "off", "data-campo": "filho-nome", oninput: (e) => { f.nome = e.target.value; aviso.conferir(e.target.value); } });
        const nasc = campo("Data de nascimento *", { type: "date", value: f.nascimento || "", max: hoje(), min: "1990-01-01", "data-campo": "filho-nasc", oninput: (e) => { f.nascimento = e.target.value; }, onchange: (e) => { f.nascimento = e.target.value; } });
        const g = escolhaGenero(`cad-f${i}-g-${seq}`, f.genero);
        g.caixa.addEventListener("change", () => { f.genero = g.valor(); });
        if (f.nome) aviso.conferir(f.nome);
        const remover = !f.id && filhos.length > 1 ? h("button", { type: "button", class: "cad-remover", "aria-label": "Tirar esta criança", texto: "✕", onclick: () => { filhos.splice(i, 1); desenharFilhos(); } }) : null;
        return h("div", { class: "cad-filho", "data-filho": String(i) }, [
          h("div", { class: "cad-filho-topo" }, [avatar(f, i, "perfil-avatar mini"), h("b", { texto: filhos.length > 1 ? `Criança ${i + 1}` : "Criança" }), remover]),
          h("div", { class: "familia-campos" }, [nome.label, nasc.label,
            h("div", { class: "largo cad-genero" }, [h("span", { class: "rotulo", texto: "Menina ou menino? *" }), g.caixa]),
            aviso.p,
          ]),
        ]);
      }));
    }

    const passos = h("p", { class: "cad-passos", "aria-live": "polite" });
    const titulo = h("h2", { texto: editando ? "Nossa família" : "Olá, família!" });
    const intro = h("p", { class: "intro" });
    const form = h("form", { novalidate: true, class: "familia-form cad-form" }, [
      h("div", { class: "familia-topo" }, [
        h("img", { class: "logo", src: `${RAIZ}/assets/marca/logos/azul-icone-rosa.png`, alt: "Educarte Escola Cristã" }),
        passos,
        h("img", { class: "rabisco", src: `${RAIZ}/assets/rabisco/poses/apresentando.png`, alt: "" }),
      ]),
      titulo, intro, etapa1, etapa2,
    ]);
    const tela = janela("Cadastro da família", "cadastro", [form]);
    form.addEventListener("submit", (e) => { e.preventDefault(); if (etapa === 1) irPara2(); else salvar(); });

    function mostrar(n) {
      etapa = n;
      etapa1.hidden = n !== 1; etapa2.hidden = n !== 2;
      passos.textContent = `${n} de 2`;
      intro.textContent = n === 1
        ? (editando ? "Confira os dados do responsável." : "Um cadastro rapidinho, só uma vez neste aparelho. Depois é só escolher quem vai jogar!")
        : "Agora, quem vai jogar? Cada um tem o seu progresso, as suas moedas e a sua casa.";
      tela.scrollTop = 0; tela.firstChild?.scrollIntoView?.({ block: "start" });
    }
    function irPara1() { mostrar(1); focarDepois(fNome.input); }
    function irPara2() {
      const nome = fNome.input.value.trim().replace(/\s+/g, " "), tel = fTel.input.value.replace(/\D/g, ""), email = fEmail.input.value.trim(), pin = fPin.input.value;
      for (const c of [fNome, fTel, fEmail, fPin]) marcar(c.input, false);
      const falha = (c, t) => { marcar(c.input, true); erro1.textContent = t; c.input.focus(); return false; };
      if (nome.split(" ").filter((x) => x.length >= 2).length < 2) return falha(fNome, "Escreva o seu nome completo (nome e sobrenome), por favor.");
      if (tel.length < 10 || tel.length > 11) return falha(fTel, "O telefone precisa ter DDD e número, como (11) 99999-9999.");
      if (!emailOk(email)) return falha(fEmail, "Esse e-mail parece incompleto. Confere?");
      if (pin || !temPin) {
        if (!/^\d{4}$/.test(pin)) return falha(fPin, "O PIN dos pais tem 4 números.");
        if (PINS_FACEIS.has(pin)) return falha(fPin, "Esse PIN é fácil de adivinhar. Escolha outro (sem 1234 nem números repetidos).");
      }
      erro1.textContent = "";
      if (!listaFilhos.childElementCount) desenharFilhos();
      mostrar(2);
      focarDepois(listaFilhos.querySelector("input"));
      return true;
    }
    function salvar() {
      const falha = (el, t) => { marcar(el, true); erro2.textContent = t; el?.focus?.(); };
      for (const el of listaFilhos.querySelectorAll("input")) marcar(el, false);
      for (let i = 0; i < filhos.length; i++) {
        const f = filhos[i], card = listaFilhos.children[i];
        f.nome = nomeLimpo(f.nome);
        if (!f.nome) return falha(card.querySelector('[data-campo="filho-nome"]'), filhos.length > 1 ? `Qual é o primeiro nome da criança ${i + 1}?` : "Qual é o primeiro nome da criança? É assim que o Rabisco vai chamar!");
        const ruim = validarNascimento(f.nascimento, f.nome);
        if (ruim) return falha(card.querySelector('[data-campo="filho-nasc"]'), ruim);
        if (!f.genero) return falha(card.querySelector(".pilulas input"), `${f.nome} é menina ou menino? (a narradora diz "pronta" ou "pronto")`);
      }
      const querJogar = chkAdulto.checked && !adultoExiste;
      if (querJogar && !gAdulto.valor()) return falha(gAdulto.radios()[0], "Como a narradora te chama: pronta ou pronto?");
      if (!chkLgpd.checked) return falha(chkLgpd, "Para guardar os dados, marque a autorização do responsável legal.");
      erro2.textContent = "";
      const nomeResp = fNome.input.value.trim().replace(/\s+/g, " ");
      Familia.salvarCadastro({
        responsavel: { nome: nomeResp, telefone: mascaraWhats(fTel.input.value), email: fEmail.input.value.trim() },
        pin: fPin.input.value || undefined, novidades: chkNovidades.checked, consentiu: true, enviar: false,
      });
      for (const f of filhos) {
        const dados = { nome: f.nome, nascimento: f.nascimento, genero: f.genero, foto: f.foto || null, tipo: "crianca" };
        if (f.id) Perfis.atualizar(f.id, dados); else f.id = Perfis.criar(dados).id;
      }
      if (querJogar) Perfis.criar({ nome: nomeLimpo(nomeResp.split(" ")[0]), tipo: "adulto", genero: gAdulto.valor() });
      enfileirar(); // manda o cadastro (sem foto) para a Educarte; sem internet, guarda e tenta depois
      fechar(true);
      if (!editando && Perfis.lista().length > 1) setTimeout(() => abrirQuemJoga(), 80);
    }
    function fechar(salvou, depois = false) {
      if (depois && primeira) { try { sessionStorage.setItem(CHAVE_DEPOIS, "1"); } catch { /* */ } }
      fecharJanela(tela);
      cadastroAberto = null;
      resolver(salvou);
    }
    mostrar(1);
    abrirJanela(tela, () => (etapa === 2 ? irPara1() : fechar(false, true)));
    focarDepois(fNome.input);
  });
  return cadastroAberto;
}

// ------------------------------------------------------------------ editar / adicionar um jogador
function editarPerfil(p, tipo = p?.tipo || "crianca") {
  return new Promise((resolver) => {
    const adulto = tipo === "adulto";
    const novo = !p;
    // 1º adulto: já vem com o primeiro nome do responsável; os outros adultos (mãe, pai, avó…) começam em branco
    const primeiroAdulto = adulto && novo && !Perfis.lista().some((x) => x.tipo === "adulto");
    const dados = { nome: p?.nome || (primeiroAdulto ? (Familia.responsavel()?.nome || "").split(" ")[0] : ""), nascimento: p?.nascimento || "", genero: p?.genero || "", foto: p?.foto || null };
    const fNome = campo(adulto ? "Como a narradora te chama *" : "Primeiro nome *", { value: dados.nome, maxlength: 20, "data-campo": "perfil-nome" });
    const fNasc = adulto ? null : campo("Data de nascimento *", { type: "date", value: dados.nascimento, max: hoje(), min: "1990-01-01", "data-campo": "perfil-nasc" });
    const g = escolhaGenero(`perfil-g-${++seq}`, dados.genero, { adulto });
    const erro = h("p", { class: "erro", role: "alert" });
    const form = h("form", { novalidate: true, class: "familia-form" }, [
      h("h2", { texto: novo ? (adulto ? "Novo adulto" : "Novo jogador") : `Editar ${p.nome || "jogador"}` }),
      adulto && novo ? h("p", { class: "intro", texto: "Pai, mãe, avó, tio… cada adulto tem o seu progresso. Só o primeiro nome fica guardado, neste aparelho." }) : null,
      h("div", { class: "familia-campos" }, [fNome.label, fNasc?.label,
        h("div", { class: "largo cad-genero" }, [h("span", { class: "rotulo", texto: adulto ? "A narradora vai dizer: *" : "Menina ou menino? *" }), g.caixa]),
      ]),
      erro,
      h("div", { class: "familia-acoes" }, [
        h("button", { type: "button", class: "botao branco", texto: "Cancelar", onclick: () => fechar(null) }),
        h("button", { type: "submit", class: "botao", "data-acao": "salvar-perfil", texto: "Salvar ✓" }),
      ]),
    ]);
    const tela = janela(novo ? "Novo jogador" : "Editar jogador", "editar", [form]);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nome = nomeLimpo(fNome.input.value);
      const falha = (el, t) => { marcar(el, true); erro.textContent = t; el?.focus?.(); };
      if (!nome) return falha(fNome.input, "Qual é o nome?");
      if (!adulto) { const ruim = validarNascimento(fNasc.input.value, nome); if (ruim) return falha(fNasc.input, ruim); }
      if (!g.valor()) return falha(g.radios()[0], adulto ? "A narradora diz pronta ou pronto?" : `${nome} é menina ou menino?`);
      const d = { nome, nascimento: adulto ? "" : fNasc.input.value, genero: g.valor(), foto: dados.foto || null, tipo };
      const salvo = novo ? Perfis.criar(d) : Perfis.atualizar(p.id, d);
      enfileirar(); // nome/nascimento mudaram: atualiza o cadastro na Educarte (a foto nunca vai)
      fechar(salvo);
    });
    function fechar(v) { fecharJanela(tela); resolver(v); }
    abrirJanela(tela, () => fechar(null));
    focarDepois(fNome.input);
  });
}

// ------------------------------------------------------------------ área dos pais
let areaAberta = null;
export function abrirAreaDosPais() {
  if (areaAberta) return areaAberta;
  areaAberta = (async () => {
    try {
      if (!Familia.completo()) return await abrirCadastroCompleto({ primeira: false }); // sem cadastro: o questionário é a área
      const ok = await portaoDosPais({ texto: "Aqui você adiciona, edita ou apaga jogadores e os dados da família." });
      if (!ok) return false;
      return await painelPais();
    } finally { areaAberta = null; }
  })();
  return areaAberta;
}

function painelPais() {
  return new Promise((resolver) => {
    const idInicial = Perfis.idAtivo();
    const corpo = h("div", { class: "pais-corpo" });
    const tela = janela("Área dos pais", "pais", [corpo]);
    let ocupado = false;
    const acao = (fn) => async () => { if (ocupado) return; ocupado = true; try { await fn(); } finally { ocupado = false; if (tela.isConnected) desenhar(); } };

    function desenhar() {
      const lista = Perfis.lista(), R = Familia.responsavel() || {};
      const linhas = lista.map((p, i) => h("li", { class: "pais-jogador", "data-perfil": p.id }, [
        avatar(p, i, "perfil-avatar mini"),
        h("span", { class: "pais-nome" }, [h("b", { texto: p.nome || "Jogador sem nome" }), h("small", { texto: [idadeTexto(p), p.id === Perfis.idAtivo() ? "jogando agora" : ""].filter(Boolean).join(" · ") })]),
        h("button", { type: "button", class: "pais-mini", "data-acao": "editar", "aria-label": `Editar ${p.nome || "jogador"}`, texto: "✏️ Editar", onclick: acao(() => editarPerfil(p)) }),
        lista.length > 1 ? h("button", { type: "button", class: "pais-mini perigo", "data-acao": "apagar", "aria-label": `Apagar o perfil de ${p.nome || "jogador"}`, texto: "🗑️ Apagar", onclick: acao(async () => {
          const sim = await confirmar({ titulo: `Apagar o perfil de ${p.nome || "jogador"}?`, texto: `O progresso de ${p.nome || "este jogador"} (moedas, casa, álbum, missões e o resto) será apagado deste aparelho. Não dá para desfazer.`, sim: "Sim, apagar", perigo: true });
          if (sim && Perfis.remover(p.id)) enfileirar(); // atualiza o cadastro na Educarte
        }) }) : null,
      ]));
      const politica = h("a", { class: "pais-link", href: URL_PRIVACIDADE, target: "_blank", rel: "noopener", texto: "📄 Política de privacidade" });
      corpo.replaceChildren(
        h("div", { class: "portao-cadeado", "aria-hidden": "true", texto: "🔓" }),
        h("h2", { texto: "Área dos pais" }),
        h("p", { class: "intro", texto: `Responsável: ${R.nome || ""}` }),
        h("h3", { texto: "Jogadores deste aparelho" }),
        h("ul", { class: "pais-lista" }, linhas),
        h("div", { class: "pais-botoes" }, [
          h("button", { type: "button", class: "pais-grande", "data-acao": "novo-filho", texto: "➕ Adicionar filho", onclick: acao(() => editarPerfil(null, "crianca")) }),
          h("button", { type: "button", class: "pais-grande", "data-acao": "novo-adulto", texto: "➕ Adicionar adulto", onclick: acao(() => editarPerfil(null, "adulto")) }),
          h("button", { type: "button", class: "pais-grande", "data-acao": "cadastro", texto: "👩 Editar cadastro e PIN", onclick: acao(() => abrirCadastroCompleto()) }),
        ]),
        h("div", { class: "pais-privacidade" }, [
          h("p", { texto: "🔒 O progresso dos jogos fica só neste aparelho. O cadastro fica guardado na Educarte." }),
          politica,
          h("a", { class: "pais-link", "data-acao": "whatsapp", href: linkWhatsApp(), target: "_blank", rel: "noopener", texto: "💬 Fale com a gente (WhatsApp)" }),
          h("button", { type: "button", class: "pais-grande perigo", "data-acao": "apagar-tudo", texto: "🗑️ Apagar todos os dados deste aparelho", onclick: acao(async () => {
            const sim = await confirmar({ titulo: "Apagar tudo deste aparelho?", texto: "Apaga deste aparelho o cadastro e o progresso de TODOS os jogadores (moedas, casas, álbuns, missões) e pede à Educarte para apagar o cadastro guardado lá. Não dá para desfazer.", sim: "Sim, apagar tudo", perigo: true });
            if (!sim) return;
            // espera o pedido de exclusão ao servidor (até 3 s) antes de recarregar; sem internet, fica pendente
            await Promise.race([Familia.apagarTudo(), new Promise((r) => setTimeout(r, 3000))]);
            fechar(true, true);
          }) }),
        ]),
        h("div", { class: "familia-acoes" }, [h("button", { type: "button", class: "botao", "data-acao": "fechar", texto: "Fechar ✓", onclick: () => fechar(true) })]),
      );
    }
    function fechar(v, recarregar = false) {
      fecharJanela(tela);
      resolver(v);
      // o jogador ativo mudou (perfil apagado) ou apagou tudo: a página volta já com o estado certo
      if (recarregar || Perfis.idAtivo() !== idInicial) location.reload();
    }
    desenhar();
    abrirJanela(tela, () => fechar(true));
    focarDepois(corpo.querySelector(".pais-grande"));
  });
}

export const PerfisUI = { primeiraEntrada, abrirQuemJoga, abrirAreaDosPais, abrirCadastroCompleto, portaoDosPais, ligarChip, ligarNaEngrenagem };
export default PerfisUI;
