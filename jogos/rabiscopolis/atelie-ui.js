// Rabiscolândia: a tela do Ateliê Ponta do Lápis. De um lado o Rabisco (ou o veículo, na aba Pinturas) girando num
// pedestal; do outro o saldo de Rabiscoins, as abas (camisetas, chapéus, óculos, mochilas e pinturas) e as peças.
// Andar pelas peças já PROVA no Rabisco da vitrine; o botão grande de baixo compra, veste ou tira. Nada é comprado sem
// apertar esse botão. Funciona no toque, no mouse, no teclado (setas, Enter, Esc) e no controle (direcional, A, B):
// os itens têm data-foco, como o Rabifone e o Meu Rabisco.
//
//   const loja = criarAtelie(caixa, { escolha(), pinturas(), saldo(), vestir(slot, id), pintar(veiculo, id|null),
//     comprar(item) → resultado de rabiscoins.comprar, aoAbrir(), aoFechar(), falar(chave), confete() });
//   loja.abrir(cat?); loja.navegar(dx, dy); loja.confirmar(); loja.voltar(); loja.fechar();

import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
import { criarPalco3D, THREE } from "../../src/motor3d/palco3d.js";
import { toon, comContorno } from "../../src/motor3d/toon.js";
import { PECAS, vestirPecas, prepararRoupa } from "./meu-rabisco.js";
import { CATEGORIAS, NOME_LOJA, itensDaLoja, pinturaPorId, VEICULOS_PINTAVEIS, TEMPORADAS, precoBichinho, temBichinho } from "./atelie.js";
import { criarModeloBichinho, bichinhoPorId } from "./bichinho-modelo.js";
import { criarVeiculo } from "./veiculos.js";
import { tem } from "../../src/motor/rabiscoins.js";
import { ICONE_MOEDA, somCompra, somFalta } from "../../src/motor/rabiscoins-ui.js";

const hex = (c) => `#${c.toString(16).padStart(6, "0")}`;
const VISTAS = {
  camiseta: [[0, 1.05, 4.3], [0, 0.98, 0]],
  chapeu: [[0, 1.85, 3.9], [0, 1.62, 0]],
  oculos: [[0, 1.55, 3.0], [0, 1.5, 0]],
  mochila: [[0, 1.1, 4.5], [0, 1.0, 0]],
  veiculo: [[6.2, 3.6, 7.6], [0, 1.0, 0]],
  bichinho: [[0, 1.25, 4.4], [0, 0.78, 0]],
};

export function criarAtelie(onde, cb) {
  const raiz = document.createElement("div");
  raiz.className = "atelie-rp";
  raiz.hidden = true;
  raiz.innerHTML = `<div class="atl-cartao" role="dialog" aria-label="${NOME_LOJA}">
    <div class="atl-vista"><span class="atl-provando" aria-live="polite"></span></div>
    <div class="atl-painel">
      <div class="atl-topo"><div class="atl-titulo">🎨 ${NOME_LOJA}</div><div class="atl-saldo" aria-live="polite">${ICONE_MOEDA}<b>0</b></div></div>
      <div class="atl-abas" role="tablist"></div>
      <div class="atl-itens"></div>
      <div class="atl-rodape"><button type="button" class="atl-acao" data-foco></button><button type="button" class="atl-ok deco-ok" data-foco>✓ Pronto</button></div>
      <div class="atl-nomepet" hidden><label>Nome do bichinho <input class="atl-campo" maxlength="10" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Dê um nome" data-foco></label></div>
      <small class="atl-dica"></small>
    </div></div>`;
  onde.append(raiz);
  raiz.addEventListener("pointerdown", (e) => e.stopPropagation());
  const vista = raiz.querySelector(".atl-vista"), abasEl = raiz.querySelector(".atl-abas"), itensEl = raiz.querySelector(".atl-itens");
  const acaoEl = raiz.querySelector(".atl-acao"), dicaEl = raiz.querySelector(".atl-dica"), provandoEl = raiz.querySelector(".atl-provando");
  let cat = CATEGORIAS[0].id, sel = null, foco = null, palco = null, rb = null, carro = null, pet = null, petT = 0, giro = 0, parado = 0, arrastando = null, camAtual = null;

  const botao = (html, cls, aoClicar) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.setAttribute("data-foco", ""); b.innerHTML = html; b.addEventListener("click", (e) => { e.stopPropagation(); aoClicar(); }); return b; };
  const moeda = (n) => `<span class="atl-preco">${ICONE_MOEDA}${n}</span>`;

  // cartões da aba: o original primeiro (de graça) e as peças da loja
  function cartoes() {
    const itens = itensDaLoja();
    if (cat === "bichinho") return itens.filter((i) => i.cat === "bichinho").map((i) => ({ ...i, preco: precoBichinho(i) }));
    if (cat !== "veiculo") {
      const p = PECAS[cat], orig = p.opcoes.find((o) => o.id === p.original);
      return [{ id: `orig:${cat}`, original: true, slot: cat, opcao: orig.id, nome: orig.nome, amostra: orig.amostra, preco: 0 }, ...itens.filter((i) => i.cat === cat)];
    }
    const out = [];
    for (const [v, info] of Object.entries(VEICULOS_PINTAVEIS)) {
      out.push({ id: `orig:${v}`, original: true, veiculo: v, pintura: null, nome: `${info.icone} ${info.nome} de fábrica`, amostra: [info.original, 0xffffff], preco: 0 });
      out.push(...itens.filter((i) => i.cat === "veiculo" && i.veiculo === v));
    }
    return out;
  }
  const comprado = (it) => it.original || tem(it.id);
  const usando = (it) => (it.bichinho ? cb.bichinho?.()?.atual === it.bichinho : it.veiculo ? (cb.pinturas()?.[it.veiculo] ?? null) === it.pintura : cb.escolha()[it.slot] === it.opcao);

  function desenharSaldo() { raiz.querySelector(".atl-saldo b").textContent = String(cb.saldo()); }
  function desenharAbas() {
    abasEl.replaceChildren(...CATEGORIAS.map((c) => {
      const b = botao(`<span class="atl-ic">${c.icone}</span><span class="atl-rot">${c.nome}</span>`, `atl-aba${c.id === cat ? " ativa" : ""}`, () => { trocarAba(c.id); focar(abasEl.querySelector(".ativa")); });
      b.dataset.cat = c.id; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(c.id === cat));
      return b;
    }));
  }
  function desenharItens() {
    const lista = cartoes();
    itensEl.replaceChildren(...lista.map((it) => {
      const meu = comprado(it), uso = usando(it), selec = sel?.id === it.id;
      const selo = it.temporada ? `<span class="atl-selo" title="${TEMPORADAS[it.temporada]?.nome ?? ""}">${TEMPORADAS[it.temporada]?.selo ?? "⭐"}</span>` : "";
      const rodape = uso ? `<span class="atl-estado usando">${it.veiculo ? "✓ Usando" : it.bichinho ? "✓ Com você" : "✓ Vestido"}</span>` : meu ? `<span class="atl-estado seu">${it.original ? "De graça" : "É seu!"}</span>` : it.bichinho && !it.preco ? `<span class="atl-estado seu">🎁 De graça!</span>` : moeda(it.preco);
      const b = botao(`${selo}<span class="mrb-amostra" style="background:linear-gradient(135deg, ${hex(it.amostra[0])} 50%, ${hex(it.amostra[1])} 50%)"></span><span class="atl-nome">${it.nome}</span>${rodape}`,
        `atl-item${selec ? " selecionado" : ""}${uso ? " usando" : ""}${meu ? "" : " a-venda"}`, () => { selecionar(it); focar(acaoEl); });
      b.dataset.id = it.id; b.setAttribute("aria-pressed", String(selec));
      b.addEventListener("focus", () => { if (sel?.id !== it.id) selecionar(it); });
      return b;
    }));
  }
  // o botão grande: depende de ter, estar usando e do saldo
  function desenharAcao() {
    const it = sel;
    acaoEl.classList.remove("trocar", "falta", "tirar", "vestir");
    if (!it) { acaoEl.hidden = true; return; }
    acaoEl.hidden = false;
    const s = cb.saldo();
    if (it.bichinho) {
      if (usando(it)) { acaoEl.innerHTML = "↩ Deixar em casa"; acaoEl.classList.add("tirar"); }
      else if (comprado(it)) { acaoEl.innerHTML = "🐾 Levar comigo"; acaoEl.classList.add("vestir"); }
      else if (!it.preco) { acaoEl.innerHTML = "🎁 Ganhar de graça"; acaoEl.classList.add("trocar"); }
      else if (s >= it.preco) { acaoEl.innerHTML = `Trocar por ${moeda(it.preco)}`; acaoEl.classList.add("trocar"); }
      else { acaoEl.innerHTML = `Faltam ${moeda(it.preco - s)}`; acaoEl.classList.add("falta"); }
      dicaEl.textContent = comprado(it) || s >= it.preco ? "Ele segue o Rabisco pela cidade. Toque nele para ver um truque!" : "Ajude os amigos nas missões para ganhar Rabiscoins!";
      return;
    }
    if (usando(it)) {
      if (it.original) { acaoEl.innerHTML = it.veiculo ? "✓ Já está assim" : "✓ Já está vestido"; acaoEl.classList.add("vestir"); }
      else { acaoEl.innerHTML = it.veiculo ? "↩ Voltar à de fábrica" : "↩ Tirar"; acaoEl.classList.add("tirar"); }
    } else if (comprado(it)) { acaoEl.innerHTML = it.veiculo ? "🎨 Usar esta pintura" : "👕 Vestir"; acaoEl.classList.add("vestir"); }
    else if (s >= it.preco) { acaoEl.innerHTML = `Trocar por ${moeda(it.preco)}`; acaoEl.classList.add("trocar"); }
    else { acaoEl.innerHTML = `Faltam ${moeda(it.preco - s)}`; acaoEl.classList.add("falta"); }
    dicaEl.textContent = comprado(it) || s >= it.preco ? (it.veiculo ? "A pintura vale no veículo chamado pelo Rabifone 📱" : "Arraste o Rabisco para ver de todos os lados") : "Ajude os amigos nas missões para ganhar Rabiscoins!";
  }
  const nomeDoBichinho = (id) => cb.bichinho?.()?.nomes?.[id] ?? "";
  const nomeEl = raiz.querySelector(".atl-nomepet"), campoEl = raiz.querySelector(".atl-campo");
  // o nome do bichinho (plaquinha pequena na cidade): só aparece para os que já são seus
  function desenharNome() {
    const ver = sel?.bichinho && comprado(sel);
    nomeEl.hidden = !ver;
    if (ver) campoEl.value = nomeDoBichinho(sel.bichinho);
  }
  campoEl.addEventListener("input", () => {
    if (!sel?.bichinho) return;
    cb.nomearBichinho?.(sel.bichinho, campoEl.value.trim().replace(/\s+/g, " ").slice(0, 10));
    provandoEl.textContent = nomeDoBichinho(sel.bichinho) || sel.nome;
  });
  function selecionar(it) {
    sel = it;
    for (const b of itensEl.querySelectorAll(".atl-item")) { const s = b.dataset.id === it.id; b.classList.toggle("selecionado", s); b.setAttribute("aria-pressed", String(s)); }
    provandoEl.textContent = it.bichinho ? (comprado(it) ? nomeDoBichinho(it.bichinho) || it.nome : it.nome) : it.original ? "" : comprado(it) ? it.nome : `Provando: ${it.nome}`;
    desenharNome();
    desenharAcao();
    mostrar3D();
  }
  function fazer() {
    const it = sel;
    if (!it) return;
    if (it.bichinho) {
      if (usando(it)) cb.escolherBichinho(null);
      else if (comprado(it)) { cb.escolherBichinho(it.bichinho); cb.falar?.("rp-atelie-vestiu"); }
      else {
        const primeiro = !temBichinho(), r = cb.comprar(it);
        if (!r?.ok) { somFalta(); cb.falar?.("rp-atelie-falta"); acaoEl.classList.remove("treme"); void acaoEl.offsetWidth; acaoEl.classList.add("treme"); return; }
        somCompra(); cb.confete?.();
        cb.escolherBichinho(it.bichinho);
        cb.falar?.(primeiro ? "rp-bichinho-primeiro" : "rp-atelie-comprou");
        desenharSaldo();
      }
      desenharItens(); selecionar(it); focar(acaoEl);
      return;
    }
    if (usando(it)) {
      if (it.original) return;
      if (it.veiculo) cb.pintar(it.veiculo, null); else cb.vestir(it.slot, PECAS[it.slot].original);
    } else if (comprado(it)) {
      if (it.veiculo) cb.pintar(it.veiculo, it.pintura); else cb.vestir(it.slot, it.opcao);
      cb.falar?.("rp-atelie-vestiu");
    } else {
      const r = cb.comprar(it);
      if (!r?.ok) { somFalta(); cb.falar?.("rp-atelie-falta"); acaoEl.classList.remove("treme"); void acaoEl.offsetWidth; acaoEl.classList.add("treme"); return; }
      somCompra(); cb.confete?.();
      if (it.veiculo) cb.pintar(it.veiculo, it.pintura); else cb.vestir(it.slot, it.opcao);
      cb.falar?.(it.veiculo ? "rp-atelie-pintura" : "rp-atelie-comprou");
      desenharSaldo();
    }
    desenharItens(); selecionar(it); focar(acaoEl);
  }
  acaoEl.addEventListener("click", (e) => { e.stopPropagation(); fazer(); });
  raiz.querySelector(".atl-ok").addEventListener("click", (e) => { e.stopPropagation(); api.fechar(); });
  raiz.addEventListener("click", (e) => { if (e.target === raiz) api.fechar(); });
  function trocarAba(c) {
    cat = c; sel = null;
    desenharAbas(); desenharItens();
    const atual = cartoes().find((it) => usando(it)) ?? cartoes()[0];
    selecionar(atual);
  }

  // ---- vitrine 3D: o Rabisco (com o que está vestido + a peça provada) ou o veículo pintado, girando num pedestal
  function montar3D() {
    palco = criarPalco3D(vista, { camera: { pos: VISTAS.camiseta[0], alvo: VISTAS.camiseta[1], fov: 32 }, chao: null, sombra: false, classe: "atl-palco" });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.05, 0.14, 40), toon(0xffffff));
    comContorno(base, 0.05); base.position.y = -0.07;
    const aro = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.04, 8, 48), toon(0xffcc1f));
    aro.rotation.x = Math.PI / 2;
    palco.base = new THREE.Group(); palco.base.add(base, aro); palco.cena.add(palco.base);
    rb = new Rabisco3D({ raiz: "../..", altura: 2.2 });
    prepararRoupa(rb);
    palco.cena.add(rb.grupo);
    rb.grupo.rotation.y = 0.5;
    camAtual = { pos: new THREE.Vector3(...VISTAS.camiseta[0]), alvo: new THREE.Vector3(...VISTAS.camiseta[1]) };
    palco.aoQuadro((dt) => {
      rb.atualizar(dt, { modo: "parado" });
      if (pet && cat === "bichinho") { // o bichinho anda no lugar, para, senta e ganha um coração (ciclo de 9 s)
        petT += dt;
        const c = petT % 9, anda = c < 3.6, senta = c > 4.6 && c < 8.2, k = senta ? Math.min(1, (c - 4.6) * 2.5) : 0;
        pet.posar({ fase: petT * 7, vel: anda ? 1 : 0, sentado: c > 8.2 ? Math.max(0, 1 - (c - 8.2) * 2.5) : k, olhar: Math.sin(petT * 0.8) * 0.5, abanar: senta ? 1 : 0.3, coracao: senta && c > 5.4 && c < 7.8 ? Math.sin((c - 5.4) / 2.4 * Math.PI) : 0, t: petT, recolher: senta ? 0.4 : 0 });
      }
      if (!arrastando) {
        parado = Math.max(0, parado - dt);
        if (giro != null && !parado) giravel().rotation.y += dt * 0.75;
      }
      const [p, a] = VISTAS[cat] ?? VISTAS.camiseta, k = Math.min(1, dt * 5);
      const P = new THREE.Vector3(...p), A = new THREE.Vector3(...a);
      if (camAtual.pos.distanceToSquared(P) > 1e-4 || camAtual.alvo.distanceToSquared(A) > 1e-4) { camAtual.pos.lerp(P, k); camAtual.alvo.lerp(A, k); palco.olhar(camAtual.pos.toArray(), camAtual.alvo.toArray()); }
    });
  }
  // arrastar com o dedo/mouse vira a vitrine na mão (depois de soltar, espera um pouco e volta a girar sozinha)
  const giravel = () => (carro ? carro.g : pet && cat === "bichinho" ? pet.grupo : rb?.grupo);
  vista.addEventListener("pointerdown", (e) => { const g = giravel(); if (!g) return; arrastando = { x: e.clientX, y0: g.rotation.y }; vista.setPointerCapture?.(e.pointerId); });
  vista.addEventListener("pointermove", (e) => { const g = giravel(); if (arrastando && g) g.rotation.y = arrastando.y0 + (e.clientX - arrastando.x) * 0.012; });
  const solta = () => { if (arrastando) { arrastando = null; parado = 2.5; } };
  vista.addEventListener("pointerup", solta); vista.addEventListener("pointercancel", solta);
  function tirarPet() { if (!pet) return; pet.liberar(); pet = null; }
  function tirarCarro() { if (!carro) return; carro.g.removeFromParent(); carro.g.traverse((o) => { if (o.isMesh && !o.geometry.userData.compartilhada) o.geometry.dispose(); }); carro = null; }
  function mostrar3D() {
    if (!palco || !rb) return;
    const it = sel;
    if (cat === "veiculo") {
      rb.grupo.visible = false; palco.base.visible = false;
      const tipo = it?.veiculo ?? "carro", p = it?.pintura ? pinturaPorId(it.pintura) : null;
      if (carro?.chave !== `${tipo}|${p?.id ?? ""}`) {
        const ang = carro?.g.rotation.y ?? 0.6;
        tirarCarro();
        const v = criarVeiculo(tipo, p?.cor ?? VEICULOS_PINTAVEIS[tipo].original, null, p);
        v.g.userData.seta.visible = false;
        const caixa = new THREE.Box3().setFromObject(v.g), tam = caixa.getSize(new THREE.Vector3());
        const esc = 4.6 / Math.max(tam.x, tam.z, 1);
        v.g.scale.setScalar(esc);
        v.g.position.y = tipo === "heli" ? -0.2 : 0;
        v.g.rotation.y = ang;
        palco.cena.add(v.g);
        carro = { g: v.g, chave: `${tipo}|${p?.id ?? ""}` };
      }
      return;
    }
    if (cat === "bichinho") {
      tirarCarro();
      rb.grupo.visible = false; palco.base.visible = true;
      if (it?.bichinho && pet?.id !== it.bichinho) {
        tirarPet();
        pet = criarModeloBichinho(it.bichinho);
        pet.grupo.scale.setScalar(2.5); pet.grupo.rotation.y = 0.6; petT = 0;
        palco.cena.add(pet.grupo);
      }
      return;
    }
    tirarPet();
    tirarCarro();
    rb.grupo.visible = true; palco.base.visible = true;
    const e = { ...cb.escolha() };
    if (it?.slot) e[it.slot] = it.opcao;
    vestirPecas(rb, e);
  }
  function desmontar3D() { tirarPet(); tirarCarro(); palco?.destruir(); palco = null; rb = null; }

  function focar(el) {
    foco?.classList.remove("rf-foco");
    foco = el;
    if (el) { el.classList.add("rf-foco"); el.focus({ preventScroll: false }); el.scrollIntoView?.({ block: "nearest" }); }
  }
  const api = {
    raiz,
    get aberto() { return !raiz.hidden; },
    get cat() { return cat; },
    get selecionado() { return sel ? { ...sel } : null; },
    get rabisco() { return rb; }, get veiculo() { return carro?.g ?? null; }, get palco() { return palco; },
    abrir(qual = null) {
      if (qual && CATEGORIAS.some((c) => c.id === qual)) cat = qual;
      raiz.hidden = false;
      montar3D();
      desenharSaldo(); trocarAba(cat);
      focar(itensEl.querySelector(".selecionado") ?? abasEl.querySelector(".ativa"));
      cb.aoAbrir?.();
    },
    fechar() {
      if (raiz.hidden) return;
      raiz.hidden = true; foco = null; sel = null;
      desmontar3D();
      cb.aoFechar?.();
    },
    voltar() { api.fechar(); },
    confirmar() { foco?.click(); },
    // para os testes e as fotos
    aba(c) { trocarAba(c); },
    escolher(id) { const it = cartoes().find((i) => i.id === id || i.opcao === id || i.pintura === id || i.bichinho === id); if (it) selecionar(it); return Boolean(it); },
    fazer,
    girar(ang) { const g = giravel(); if (!g) return; if (ang == null) { giro = 0; parado = 0; } else { giro = null; g.rotation.y = ang; } },
    // anda o foco pela tela: pega o item mais perto na direção pedida (o item focado já fica provado)
    navegar(dx, dy) {
      const itens = [...raiz.querySelectorAll("[data-foco]")].filter((e) => e.offsetParent !== null && !e.hidden);
      if (!foco || !itens.includes(foco)) { focar(itens[0]); return; }
      const a = foco.getBoundingClientRect(), ax = a.x + a.width / 2, ay = a.y + a.height / 2;
      let melhor = null, dm = Infinity;
      for (const e of itens) {
        if (e === foco) continue;
        const b = e.getBoundingClientRect(), bx = b.x + b.width / 2 - ax, by = b.y + b.height / 2 - ay;
        const frente = bx * dx + by * dy;
        if (frente <= 4) continue;
        const d = frente + Math.abs(bx * dy - by * dx) * 2;
        if (d < dm) { dm = d; melhor = e; }
      }
      if (melhor) focar(melhor);
    },
  };
  return api;
}
