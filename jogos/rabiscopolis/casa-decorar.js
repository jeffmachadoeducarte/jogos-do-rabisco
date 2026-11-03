// Rabiscolândia: o modo Decorar da casa. A câmera mostra a casa inteira por cima, a grade aparece no chão e a criança
// põe, gira, move e guarda móveis encaixando em quadradinhos (sem sobrepor: casa-dados.js decide o que cabe).
//   teclado: setas/WASD movem (o móvel na mão ou o cursor) · Q/E giram · F/Enter/Espaço põem ou pegam · X/Delete guardam
//            no baú · C muda a cor (no quadro, o versículo) · Tab/B abrem o baú e o catálogo · Esc sai (e salva)
//   toque: tocar num móvel pega; tocar no chão leva o móvel até lá; tocar no móvel na mão põe; arrastar move e põe ao soltar;
//          botões grandes embaixo (baú, girar, cor, guardar, pôr, pronto)
//   controle: direcional/alavanca movem · A põe/pega · X/Y giram · LB/RB mudam a cor · B guarda (sem nada na mão: sai) · Select = baú
// Sair do modo salva (salvo.casaDeco). Os móveis postos viram uma malha por material (casa-3d.js: mostrarMoveis).
//
//   const deco = criarModoDecorar(caixa, { casa, estado(), salvar(est), data(), camera(), canvas, r3, saldo(), comprados(),
//     trocar(item), falar(k), dizer(t, txt, ms), confete(), aoEntrar(), aoSair(), mudou() });

import { THREE } from "./base3d.js";
import { itemCasa, cabe, prender, pegada, centroDe, celulasDe, GRADE, quantosTem, postosPorId, naEpoca, proximaTroca, celulaBloqueada } from "./casa-dados.js";
import { colocarNoLugar, miniatura } from "./casa-3d.js";
import { criarCatalogoCasa } from "./casa-catalogo-ui.js";
import { VERSICULOS } from "./moveis.js";
import { tocar8bit } from "../../src/motor/rabiscoins-ui.js";

const hz = (s) => 440 * 2 ** (s / 12);
// sons 8-bit próprios (curtinhos): pegar sobe, pôr desce com "toc", girar desliza, guardar faz "plop", não cabe faz "nã-nã"
const SOM = {
  pegar: () => tocar8bit([[hz(7), 0, 0.06, "square", 0.05], [hz(14), 0.06, 0.08, "square", 0.05]]),
  por: () => tocar8bit([[hz(19), 0, 0.06, "square", 0.05], [hz(12), 0.06, 0.1, "square", 0.05], [hz(0), 0.04, 0.16, "triangle", 0.12]]),
  girar: () => tocar8bit([[hz(10), 0, 0.05, "triangle", 0.1], [hz(15), 0.05, 0.06, "triangle", 0.1]]),
  andar: () => tocar8bit([[hz(22), 0, 0.03, "square", 0.025]]),
  guardar: () => tocar8bit([[hz(12), 0, 0.07, "square", 0.05], [hz(5), 0.07, 0.12, "triangle", 0.1]]),
  cor: () => tocar8bit([[hz(16), 0, 0.05, "square", 0.04], [hz(21), 0.05, 0.05, "square", 0.04], [hz(24), 0.1, 0.07, "square", 0.04]]),
  nao: () => tocar8bit([[hz(3), 0, 0.1, "square", 0.05], [hz(2), 0.13, 0.16, "square", 0.05]]),
};
const MOTIVO = { passagem: "Aqui é passagem: deixe livre para andar!", fora: "Fica fora da casa.", ocupado: "Já tem um móvel aí.", "parede-do-meio": "Não passa pela parede do meio." };

export function criarModoDecorar(onde, cb) {
  const { casa } = cb;
  const raiz = document.createElement("div");
  raiz.className = "casa-deco-rp";
  raiz.hidden = true;
  raiz.innerHTML = `<div class="cd-topo"><span class="cd-titulo">🛋️ Decorando</span></div>
    <div class="cd-dica" aria-live="polite"></div>
    <div class="cd-barra">
      <button type="button" data-a="catalogo" class="cd-bau" aria-label="Baú e catálogo de móveis">🧺<span>Baú</span></button>
      <button type="button" data-a="girarE" aria-label="Girar para a esquerda">⟲<span>Girar</span></button>
      <button type="button" data-a="girarD" aria-label="Girar para a direita">⟳<span>Girar</span></button>
      <button type="button" data-a="cor" aria-label="Mudar a cor">🎨<span>Cor</span></button>
      <button type="button" data-a="tirar" aria-label="Guardar no baú">📦<span>Guardar</span></button>
      <button type="button" data-a="acao" class="cd-acao" aria-label="Pôr ou pegar">✋<span>Pôr</span></button>
      <button type="button" data-a="pronto" class="cd-pronto" aria-label="Pronto: sair e salvar">✓<span>Pronto</span></button>
    </div>`;
  onde.append(raiz);
  const dicaEl = raiz.querySelector(".cd-dica");
  let ativo = false, est = null, mao = null, cursor = { gx: 6, gz: 6 }, arraste = null, tAnda = 0, tPad = 0, padAntes = {}, aviso = 0;
  const alvo = { pos: new THREE.Vector3(), rot: 0 };
  const data = () => cb.data();
  const tem = (id) => quantosTem(id, cb.comprados(), est?.ganhos ?? {});
  const postos = (id) => (est ? postosPorId(est.moveis)[id] ?? 0 : 0);
  const noBau = (id) => Math.max(0, tem(id) - postos(id) - (mao && mao.origem < 0 && mao.p.id === id ? 1 : 0));

  const catalogo = criarCatalogoCasa(onde, {
    saldo: () => cb.saldo(), tem, postos: (id) => postos(id) + (mao && mao.origem < 0 && mao.p.id === id ? 1 : 0),
    papel: () => est.papel, piso: () => est.piso, data, figura: (id) => miniatura(cb.r3, id, itemCasa(id).cores[0]),
    trocar: (it) => { const id = it.tipo ? `rabiscolandia:casa:${it.id}` : proximaTroca(it.id, cb.comprados()); return cb.trocar({ ...it, idCarteira: id }); },
    aoPor: (id) => doBau(id),
    aoUsar: (it) => { if (it.tipo === "papel") { est.papel = it.id; casa.papel(it.id); } else { est.piso = it.id; casa.piso(it.id); } guardar(); },
    falar: (k) => cb.falar(k), confete: () => cb.confete?.(),
    aoFechar: () => desenhar(),
  });

  // ---------------------------------------------------------------- o que está onde
  const naCasa = () => est.moveis.map((p, n) => ({ p, n })).filter(({ p, n }) => n !== mao?.origem && naEpoca(itemCasa(p.id), data()));
  function itemEm(gx, gz) {
    // na parede (gz = -1) só os de parede; no chão primeiro os móveis, depois os tapetes
    const ordem = gz < 0 ? ["parede"] : ["movel", "chao"];
    for (const camada of ordem) for (const { p, n } of naCasa()) {
      if (itemCasa(p.id).camada !== camada) continue;
      if (celulasDe(p).some(([i, k]) => i === gx && (gz < 0 || k === gz))) return n;
    }
    return -1;
  }
  const temCor = (it) => (it.variantes ?? 0) > 1 || it.cores.length > 1;
  function refazer() { casa.mostrarMoveis(est.moveis, data(), mao?.origem ?? -1); cb.mudou?.(); }
  function guardar() { cb.salvar(est); }
  function falarUmaVez(k, texto, ms = 4600) { if (est.falou[k]) return; est.falou[k] = true; cb.falar(`rp-casa-${k}`); if (texto) cb.dizer("Minha casa", texto, ms); guardar(); }

  // ---------------------------------------------------------------- mão (o móvel que está sendo levado)
  function segurar(p, origem) {
    mao = { p: prender({ ...p }), origem, antes: origem >= 0 ? { ...est.moveis[origem] } : null };
    const g = casa.pegar(mao.p);
    const [x, z] = centroDe(mao.p); alvo.pos.set(x, 0, z); alvo.rot = g.rotation.y;
    g.position.y = 0.2;
    refazer();
    desenhar();
  }
  function pegar(n) { if (n < 0) return false; SOM.pegar(); segurar(est.moveis[n], n); return true; }
  // do baú para a mão: perto do cursor, no primeiro lugar livre (se tiver)
  function doBau(id) {
    const it = itemCasa(id); if (!it || noBau(id) <= 0) return false;
    if (mao) devolver();
    const p = { id, cor: it.cores[0], variante: 0, gx: cursor.gx, gz: Math.max(0, cursor.gz), rot: 0 };
    const livre = lugarLivre(p);
    SOM.pegar(); segurar(livre ?? p, -1);
    return true;
  }
  function lugarLivre(p) {
    const ocupados = est.moveis.filter((q, n) => n !== mao?.origem);
    for (let r = 0; r < 30; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
      const q = prender({ ...p, gx: p.gx + a, gz: p.gz + b });
      if (cabe(ocupados, q, -1, data()).ok) return q;
    }
    return null;
  }
  // não pôs: volta para onde estava (ou para o baú)
  function devolver() { if (!mao) return; mao = null; casa.soltar(); refazer(); }
  function por() {
    if (!mao) return false;
    const r = cabe(est.moveis, mao.p, mao.origem, data());
    if (!r.ok) { naoCabe(r.motivo); return false; }
    const p = { ...mao.p }, era = mao.origem;
    if (era >= 0) est.moveis[era] = p; else est.moveis.push(p);
    mao = null; casa.soltar(); refazer(); SOM.por(); guardar(); desenhar();
    const it = itemCasa(p.id);
    if (it.id === "quadro" && era < 0) { const v = VERSICULOS[p.variante % VERSICULOS.length]; cb.falar(`rp-versiculo-${(p.variante % VERSICULOS.length) + 1}`); cb.dizer("Quadro novo", `${v.texto} (${v.ref})`, 4800); }
    else if (it.temporada === "natal") falarUmaVez("natal", "Que lindo! No Natal a gente festeja o nascimento de Jesus. 🎄");
    return true;
  }
  function naoCabe(motivo) {
    SOM.nao(); aviso = 0.5;
    mostrarDica(`🚫 ${MOTIVO[motivo] ?? "Aqui não cabe."}`, 2200);
    raiz.querySelector(".cd-acao").classList.remove("treme"); void raiz.offsetWidth; raiz.querySelector(".cd-acao").classList.add("treme");
  }
  function tirar() {
    if (mao) {
      const era = mao.origem; mao = null; casa.soltar();
      if (era >= 0) est.moveis.splice(era, 1);
      refazer(); SOM.guardar(); guardar(); desenhar(); mostrarDica("📦 Guardado no baú de móveis.", 1800);
      return true;
    }
    const n = itemEm(cursor.gx, cursor.gz);
    if (n < 0) { SOM.nao(); return false; }
    est.moveis.splice(n, 1); refazer(); SOM.guardar(); guardar(); desenhar(); mostrarDica("📦 Guardado no baú de móveis.", 1800);
    return true;
  }
  function mover(dx, dz) {
    if (mao) {
      const it = itemCasa(mao.p.id);
      if (it.camada === "parede" && dz) { if (dz > 0) { mao.p.gz = 0; } return; }
      mao.p.gx += dx; if (it.camada !== "parede") mao.p.gz += dz;
      prender(mao.p); SOM.andar(); desenhar();
      return;
    }
    cursor.gx = Math.max(0, Math.min(GRADE.colunas - 1, cursor.gx + dx));
    cursor.gz = Math.max(-1, Math.min(GRADE.linhas - 1, cursor.gz + dz)); // -1 = a parede do fundo
    SOM.andar(); desenhar();
  }
  function girar(s) {
    if (!mao) { const n = itemEm(cursor.gx, cursor.gz); if (n < 0) return false; pegar(n); }
    const it = itemCasa(mao.p.id);
    if (it.camada === "parede") { mostrarDica("O que fica na parede não gira.", 1600); return false; }
    // gira em volta do meio do móvel
    // o meio fica guardado enquanto só gira: girar para um lado e voltar devolve o móvel ao mesmo lugar
    const [w0, d0] = pegada(it, mao.p.rot);
    if (!mao.meio || mao.meio.de !== `${mao.p.gx},${mao.p.gz},${mao.p.rot}`) mao.meio = { cx: mao.p.gx + w0 / 2, cz: mao.p.gz + d0 / 2 };
    const { cx, cz } = mao.meio;
    mao.p.rot = (mao.p.rot + s + 4) % 4;
    const [w1, d1] = pegada(it, mao.p.rot);
    mao.p.gx = Math.round(cx - w1 / 2); mao.p.gz = Math.round(cz - d1 / 2);
    prender(mao.p); mao.meio.de = `${mao.p.gx},${mao.p.gz},${mao.p.rot}`;
    alvo.rot += -s * Math.PI / 2;
    SOM.girar(); desenhar();
    return true;
  }
  function pintar(s = 1) {
    const n = mao ? null : itemEm(cursor.gx, cursor.gz);
    const p = mao ? mao.p : n >= 0 ? est.moveis[n] : null;
    if (!p) return false;
    const it = itemCasa(p.id);
    if (!temCor(it)) return false;
    if ((it.variantes ?? 0) > 1) p.variante = (p.variante + s + it.variantes) % it.variantes;
    else { const i = it.cores.indexOf(p.cor); p.cor = it.cores[(Math.max(0, i) + s + it.cores.length) % it.cores.length]; }
    if (mao) { const g = casa.pegar(mao.p); g.position.copy(alvo.pos).setY(0.2); g.rotation.y = alvo.rot; }
    else { refazer(); guardar(); }
    if (it.id === "quadro") { const v = VERSICULOS[p.variante % VERSICULOS.length]; mostrarDica(`📖 ${v.texto}`, 2600); }
    SOM.cor(); desenhar();
    return true;
  }
  function acao() {
    if (mao) return por();
    const n = itemEm(cursor.gx, cursor.gz);
    if (n >= 0) return pegar(n);
    abrirCatalogo();
    return true;
  }
  function abrirCatalogo(aba = null) { if (!catalogo.aberto) catalogo.abrir(aba); }

  // ---------------------------------------------------------------- toque e mouse: raio da câmera até o chão (ou a parede do fundo)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), chao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const fundo = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ponto = new THREE.Vector3();
  function celulaDaTela(x, y) {
    const r = cb.canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cb.camera());
    const [ox, oz] = casa.origem;
    fundo.constant = -(oz + GRADE.z0);
    if (ray.ray.intersectPlane(chao, ponto)) {
      const lx = ponto.x - ox, lz = ponto.z - oz;
      if (lz >= GRADE.z0) return [Math.floor((lx - GRADE.x0) / GRADE.passo), Math.floor((lz - GRADE.z0) / GRADE.passo)];
    }
    if (ray.ray.intersectPlane(fundo, ponto) && ponto.y > 0.4 && ponto.y < 3.2) return [Math.floor((ponto.x - ox - GRADE.x0) / GRADE.passo), -1];
    return null;
  }
  const dentroDaMao = (gx, gz) => mao && (itemCasa(mao.p.id).camada === "parede" ? gz < 0 : true) && celulasDe(mao.p).some(([i, k]) => i === gx && (gz < 0 || k === gz));
  function levarMaoPara(gx, gz, ofs = [0, 0]) {
    const it = itemCasa(mao.p.id), [w, d] = pegada(it, mao.p.rot);
    mao.p.gx = gx - (ofs[0] ?? Math.floor(w / 2)); if (it.camada !== "parede") mao.p.gz = Math.max(0, gz) - (ofs[1] ?? Math.floor(d / 2));
    prender(mao.p); desenhar();
  }
  raiz.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault(); e.stopPropagation();
    const c = celulaDaTela(e.clientX, e.clientY); if (!c) return;
    const [gx, gz] = c;
    try { raiz.setPointerCapture(e.pointerId); } catch { /* dedo simulado */ }
    if (mao) {
      if (dentroDaMao(gx, gz)) arraste = { x: e.clientX, y: e.clientY, ofs: [gx - mao.p.gx, Math.max(0, gz) - mao.p.gz], mexeu: false, tocouNaMao: true };
      else { levarMaoPara(gx, gz, [null, null]); SOM.andar(); const [w, d] = pegada(itemCasa(mao.p.id), mao.p.rot); arraste = { x: e.clientX, y: e.clientY, ofs: [Math.floor(w / 2), Math.floor(d / 2)], mexeu: false, tocouNaMao: false }; }
      return;
    }
    cursor = { gx: Math.max(0, Math.min(GRADE.colunas - 1, gx)), gz: Math.max(-1, Math.min(GRADE.linhas - 1, gz)) };
    const n = itemEm(cursor.gx, cursor.gz);
    if (n >= 0) { pegar(n); arraste = { x: e.clientX, y: e.clientY, ofs: [gx - mao.p.gx, Math.max(0, gz) - mao.p.gz], mexeu: false, tocouNaMao: false, pegou: true }; }
    else desenhar();
  });
  raiz.addEventListener("pointermove", (e) => {
    if (!arraste || !mao) return;
    if (Math.hypot(e.clientX - arraste.x, e.clientY - arraste.y) > 12) arraste.mexeu = true;
    if (!arraste.mexeu) return;
    const c = celulaDaTela(e.clientX, e.clientY); if (!c) return;
    const antes = `${mao.p.gx},${mao.p.gz}`;
    levarMaoPara(c[0], c[1], arraste.ofs);
    if (antes !== `${mao.p.gx},${mao.p.gz}`) SOM.andar();
  });
  const soltar = () => {
    const a = arraste; arraste = null;
    if (!a || !mao) return;
    if (a.mexeu) { if (!por()) { /* não coube: continua na mão, vermelho */ } }
    else if (a.tocouNaMao) por(); // tocou no móvel que está na mão: põe
  };
  raiz.addEventListener("pointerup", soltar); raiz.addEventListener("pointercancel", () => { arraste = null; });
  for (const b of raiz.querySelectorAll("button[data-a]")) b.addEventListener("click", (e) => { e.stopPropagation(); botao(b.dataset.a); });
  raiz.addEventListener("click", (e) => e.stopPropagation());
  function botao(a) {
    if (a === "catalogo") abrirCatalogo();
    else if (a === "girarE") girar(-1);
    else if (a === "girarD") girar(1);
    else if (a === "cor") pintar(1);
    else if (a === "tirar") tirar();
    else if (a === "acao") acao();
    else if (a === "pronto") api.sair();
  }

  // ---------------------------------------------------------------- desenho (HUD e marcador)
  let dicaAte = 0, dicaFixa = "";
  function mostrarDica(t, ms) { dicaFixa = t; dicaAte = performance.now() + ms; dicaEl.textContent = t; }
  function desenhar() {
    if (!ativo || !est) return;
    const toque = document.body.classList.contains("touch"), n = mao ? -1 : itemEm(cursor.gx, cursor.gz);
    const alvoP = mao ? mao.p : n >= 0 ? est.moveis[n] : null, it = alvoP ? itemCasa(alvoP.id) : null;
    const bAcao = raiz.querySelector(".cd-acao");
    bAcao.innerHTML = mao ? "✋<span>Pôr</span>" : n >= 0 ? "✋<span>Pegar</span>" : "🧺<span>Escolher</span>";
    raiz.querySelector("[data-a=cor]").disabled = !it || !temCor(it);
    raiz.querySelector("[data-a=cor] span").textContent = it?.variantes ? "Versículo" : "Cor";
    for (const a of ["girarE", "girarD"]) raiz.querySelector(`[data-a=${a}]`).disabled = !it || it.camada === "parede";
    raiz.querySelector("[data-a=tirar]").disabled = !alvoP;
    if (performance.now() > dicaAte) {
      const t = mao ? (toque ? `${it.nome}: arraste ou toque onde quer pôr` : `${it.nome}: setas movem · Q/E giram · F põe · X guarda · C muda a cor`)
        : n >= 0 ? (toque ? `Toque no ${it.nome.toLowerCase()} para pegar` : `${it.nome}: F pega · X guarda · C muda a cor`)
          : toque ? "Toque num móvel para pegar, ou no 🧺 Baú para escolher um novo" : "Setas andam · F no chão vazio abre o 🧺 Baú · Esc = pronto";
      if (dicaEl.textContent !== t) dicaEl.textContent = t;
    } else if (dicaEl.textContent !== dicaFixa) dicaEl.textContent = dicaFixa;
    // marcador: o lugar do móvel na mão (verde cabe, vermelho não cabe) ou o cursor (amarelo)
    if (mao) casa.marcar({ p: mao.p, estado: cabe(est.moveis, mao.p, mao.origem, data()).ok ? "ok" : "nao" });
    else if (n >= 0) casa.marcar({ p: est.moveis[n], estado: "cursor" });
    else casa.marcar({ p: { gx: cursor.gx, gz: Math.max(0, cursor.gz) }, estado: celulaBloqueada(cursor.gx, cursor.gz) && cursor.gz >= 0 ? "nao" : "cursor" });
  }

  // ---------------------------------------------------------------- api
  const api = {
    raiz, catalogo,
    get ativo() { return ativo; },
    get mao() { return mao ? { ...mao.p, origem: mao.origem, cabe: cabe(est.moveis, mao.p, mao.origem, data()).ok } : null; },
    get cursor() { return { ...cursor }; },
    get estado() { return est; },
    noBau, tem, postos,
    // aplica o que está guardado (ao entrar na casa e ao recarregar). Os de Natal fora da época voltam para o baú.
    carregar(e) {
      est = e;
      const fora = est.moveis.filter((p) => !naEpoca(itemCasa(p.id), data()));
      if (fora.length) est.moveis = est.moveis.filter((p) => naEpoca(itemCasa(p.id), data()));
      casa.papel(est.papel); casa.piso(est.piso);
      mao = null; casa.soltar(); refazer();
      return fora.length;
    },
    entrar(perto = null) {
      if (ativo || !est) return;
      ativo = true; raiz.hidden = false; casa.grade(true); onde.classList.add("decorando");
      if (perto) { const c = [Math.floor((perto[0] - casa.origem[0] - GRADE.x0) / GRADE.passo), Math.floor((perto[1] - casa.origem[1] - GRADE.z0) / GRADE.passo)]; cursor = { gx: Math.max(0, Math.min(GRADE.colunas - 1, c[0])), gz: Math.max(0, Math.min(GRADE.linhas - 1, c[1] - 2)) }; }
      raiz.classList.toggle("toque", document.body.classList.contains("touch"));
      cb.aoEntrar?.();
      desenhar();
      falarUmaVez("dica", "Escolha um móvel no 🧺 Baú, leve até um lugar livre e aperte Pôr. Dá para girar, mudar a cor e guardar de volta.", 6000);
    },
    sair() {
      if (!ativo) return;
      if (catalogo.aberto) catalogo.fechar();
      if (mao) { if (!por()) devolver(); }
      ativo = false; raiz.hidden = true; casa.grade(false); casa.marcar(null); onde.classList.remove("decorando");
      guardar();
      cb.aoSair?.();
      cb.falar("rp-casa-pronto"); cb.dizer("Minha casa", "Que casa linda! Ficou tudo guardado. 💛", 3000);
    },
    // câmera da casa inteira, um pouco por cima
    vista() { const [ox, oz] = casa.origem; return { pos: [ox, 12.2, oz + 9.6], alvo: [ox, 0, oz + 0.6] }; },
    passo(dt, t) {
      if (!ativo) return;
      const g = casa.soltos.children[0];
      if (mao && g) {
        const it = itemCasa(mao.p.id), [x, z] = centroDe(mao.p), k = Math.min(1, dt * 14);
        alvo.pos.set(x, 0, it.camada === "parede" ? GRADE.z0 + 0.02 : z);
        g.position.x += (alvo.pos.x - g.position.x) * k; g.position.z += (alvo.pos.z - g.position.z) * k;
        g.position.y = (it.camada === "parede" ? 0.05 : 0.18) + Math.sin(t * 4) * 0.03;
        const alvoRot = it.camada === "parede" ? 0 : -(mao.p.rot) * Math.PI / 2;
        let dr = alvoRot - g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        g.rotation.y += dr * Math.min(1, dt * 12);
        if (aviso > 0) { aviso -= dt; g.position.x += Math.sin(t * 60) * 0.04 * aviso; }
      }
      if (dicaAte && performance.now() > dicaAte) { dicaAte = 0; desenhar(); }
    },
    // ---- teclado e controle
    tecla(e) {
      if (catalogo.aberto) {
        const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] };
        if (m[e.code]) catalogo.navegar(...m[e.code]);
        else if (["Enter", "Space", "KeyF"].includes(e.code)) catalogo.confirmar();
        else if (["Escape", "Backspace", "Tab", "KeyB"].includes(e.code)) catalogo.voltar();
        else return false;
        return true;
      }
      const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] };
      if (m[e.code]) mover(...m[e.code]);
      else if (e.repeat) return true;
      else if (e.code === "KeyQ") girar(-1);
      else if (e.code === "KeyE") girar(1);
      else if (["KeyF", "Enter", "Space"].includes(e.code)) acao();
      else if (["KeyX", "Delete", "Backspace"].includes(e.code)) tirar();
      else if (e.code === "KeyC") pintar(1);
      else if (["Tab", "KeyB"].includes(e.code)) abrirCatalogo();
      else if (e.code === "Escape") { if (mao) devolver(), desenhar(); else api.sair(); }
      else return false;
      return true;
    },
    controle({ apertou }) {
      if (catalogo.aberto) {
        if (apertou.esq) catalogo.navegar(-1, 0); if (apertou.dir) catalogo.navegar(1, 0);
        if (apertou.cima) catalogo.navegar(0, -1); if (apertou.baixo) catalogo.navegar(0, 1);
        if (apertou.confirma) catalogo.confirmar(); else if (apertou.voltar || apertou.select) catalogo.voltar();
        return;
      }
      if (apertou.esq) mover(-1, 0); if (apertou.dir) mover(1, 0); if (apertou.cima) mover(0, -1); if (apertou.baixo) mover(0, 1);
      // alavanca: anda um quadradinho e repete enquanto segura
      // (só a alavanca de verdade: o direcional já andou pelo "apertou")
      let eixoX = 0, eixoY = 0;
      for (const p of navigator.getGamepads?.() ?? []) if (p) { eixoX = p.axes[0] ?? 0; eixoY = p.axes[1] ?? 0; break; }
      const ax = Math.abs(eixoX) > 0.55 ? Math.sign(eixoX) : 0, ay = Math.abs(eixoY) > 0.55 ? Math.sign(eixoY) : 0, agora = performance.now();
      if ((ax || ay) && agora > tPad) { mover(ax, ay); tPad = agora + (padAntes.eixo ? 140 : 320); padAntes.eixo = true; } else if (!ax && !ay) { padAntes.eixo = false; tPad = 0; }
      if (apertou.confirma) acao();
      if (apertou.acao) girar(1);
      if (apertou.voltar) { if (mao || itemEm(cursor.gx, cursor.gz) >= 0) tirar(); else api.sair(); }
      if (apertou.select) abrirCatalogo();
      for (const p of navigator.getGamepads?.() ?? []) {
        if (!p) continue;
        const lb = Boolean(p.buttons[4]?.pressed), rb = Boolean(p.buttons[5]?.pressed);
        if (lb && !padAntes.lb) pintar(-1); if (rb && !padAntes.rb) pintar(1);
        padAntes.lb = lb; padAntes.rb = rb; break;
      }
    },
    // para os testes
    acao, por, tirar, mover, girar, pintar, doBau, pegar, itemEm, abrirCatalogo, celulaDaTela, botao,
    irPara(gx, gz) { cursor = { gx, gz }; if (mao) levarMaoPara(gx, gz, [0, 0]); desenhar(); },
  };
  return api;
}
