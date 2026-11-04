// Rabiscolândia: o mapa grande (2D: um canvas + HTML; não gasta nenhuma chamada de desenho do 3D).
// Cada lugar vira um alfinete redondo com o emoji e a cor da categoria (escolas, igreja, parceiras, lojas, passeios e a
// casa do jogador). Os nomes nunca se sobrepõem: os alfinetes muito juntos viram um só, com um "+n" (tocar nele
// aproxima), e cada nome procura um lado livre do alfinete (direita, esquerda, cima, baixo...); sem lado livre, o nome
// fica escondido até aproximar. Dá para arrastar, fazer pinça, rodinha do mouse e os botões + e −.
// Ao lado (ou embaixo, no celular em pé) fica a lista de lugares com busca e filtros por categoria (que também são a
// legenda). Escolher um lugar (no mapa ou na lista) mostra o cartão com "Ir para lá": o mapa fecha e a setinha guia.
// Teclado e controle andam pelos botões (setas/direcional), Enter/A confirma, Esc/B volta; + e − aproximam.
//
//   const ui = criarMapaUI(caixa, { fundo(S), vivos(c, P, u), jogador() → { x, z, dir }, casa() → { x, z, nome } | null,
//     destino() → alvo | null, irPara(item), cancelar(), aoAbrir() });
//   ui.abrir(); ui.fechar(); ui.atualizar(); ui.navegar(dx, dy); ui.confirmar(); ui.voltar(); ui.selecionar(id); ui.zoom(f)
import { LUGARES, BORDA } from "./mapa.js";

const W = BORDA + 8; // o mapa vai de -W a W nos dois eixos (o mesmo do minimapa)
export const CATEGORIAS = [
  { id: "casa", nome: "Sua casa", cor: "#ec2e8c", ic: "🏠" },
  { id: "escola", nome: "Escolas", cor: "#00b5f0", ic: "🏫" },
  { id: "igreja", nome: "Igreja", cor: "#8e6cff", ic: "⛪" },
  { id: "parceira", nome: "Parceiras", cor: "#ffcc1f", ic: "⭐" },
  { id: "loja", nome: "Lojas e serviços", curto: "Lojas", cor: "#ff7a00", ic: "🛍️" },
  { id: "passeio", nome: "Passeios", cor: "#58c43a", ic: "🌳" },
];
const CAT = Object.fromEntries(CATEGORIAS.map((c, i) => [c.id, { ...c, prio: i }]));
const LOJAS = new Set(["hospital", "biblioteca", "bombeiros", "mercado", "padaria", "sorveteria", "veterinario", "lavarapido", "estudio", "correios", "floricultura", "pizzaria", "farmacia", "brinquedos", "atelie", "quiosque"]);
const EMOJI = {
  praca: "⛲", igreja: "⛪", hospital: "🏥", biblioteca: "📚", bombeiros: "🚒", mercado: "🛒", padaria: "🥖", sorveteria: "🍦",
  parque: "🌳", campo: "⚽", quadra: "🏀", horta: "🥕", kids1: "🏫", kids2: "🏫", veterinario: "🐾", lavarapido: "🧽",
  estudio: "🎵", correios: "✉️", mirante: "🏔️", heliponto: "🚁", praia: "🏖️", fazendinha: "🐄", pracaIpes: "⛲",
  floricultura: "🌷", pizzaria: "🍕", pracaPalmeiras: "⛲", farmacia: "💊", brinquedos: "🧸", pracaEstrelas: "⛲",
  museu: "🦖", observatorio: "🔭", orla: "🌊", salvavidas: "🛟", pier: "⚓", quiosque: "🥥", ilha: "🏝️", roda: "🎡", atelie: "🎨",
};
const EMOJI_TIPO = { carros: "🚗", academia: "🏋️", moda: "💄", contabilidade: "📊", presentes: "🎁", joias: "💍", confeccao: "👗", reciclagem: "⚙️", livraria: "📖", ballet: "🩰", agencia: "📸", vidracaria: "🪟", locacao: "🏗️", sitio: "🦆" };
// nome curto no mapa (na lista e no cartão vai o nome inteiro)
const CURTO = {
  biblioteca: "Biblioteca", hospital: "Hospital", mercado: "Mercado", padaria: "Padaria", sorveteria: "Sorveteria", veterinario: "Veterinário",
  lavarapido: "Lava-Rápido", estudio: "Estúdio Dó-Ré-Mi", floricultura: "Floricultura", pizzaria: "Pizzaria", farmacia: "Farmácia",
  brinquedos: "Brinquedos Pião", observatorio: "Observatório", museu: "Museu", salvavidas: "Salva-Vidas", quiosque: "Quiosque",
  atelie: "Ateliê", horta: "Horta", quadra: "Quadra", campo: "Campo", pier: "Píer", roda: "Roda-Gigante", orla: "Praia do Mar Azul",
  "parceiro-bella-cat": "Bella Cat", "parceiro-rise-up": "Rise Up", "parceiro-crescente-contabilidade": "Crescente", "parceiro-cafe-com-deus-pai-kids": "Café com Deus Pai", "parceiro-sitio-floresca": "Sítio Floresça",
};
// nomes dos bairros, bem clarinhos, só quando sobra espaço
const BAIRROS = [
  { nome: "Vila dos Ipês", x: -352, z: 95 }, { nome: "Bairro das Palmeiras", x: 352, z: -75 }, { nome: "Jardim das Estrelas", x: 70, z: -385 },
  { nome: "Mar Azul", x: -250, z: 335 }, { nome: "Centro", x: 0, z: 44 }, { nome: "Bairro das Casas", x: -94, z: -30 },
];
const sem = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const categoria = (l) => (l.parceiro ? "parceira" : l.id === "igreja" ? "igreja" : l.id === "kids1" || l.id === "kids2" ? "escola" : LOJAS.has(l.id) ? "loja" : "passeio");

export function itensDoMapa(casa = null) {
  const itens = LUGARES.map((l) => {
    const cat = categoria(l);
    return { id: l.id, nome: l.nome, curto: CURTO[l.id] ?? l.nome, x: l.x, z: l.z, cat, bairro: l.bairro || "Rabiscolândia",
      emoji: l.parceiro ? EMOJI_TIPO[l.parceiro.tipo] ?? "⭐" : EMOJI[l.id] ?? "📍", busca: sem(`${l.nome} ${l.bairro ?? ""}`) };
  });
  if (casa) itens.unshift({ id: "casa", nome: casa.nome, curto: "Sua casa", x: casa.x, z: casa.z, cat: "casa", bairro: casa.bairro ?? "Sua casa", emoji: "🏠", busca: sem(`${casa.nome} sua casa minha casa`) });
  return itens;
}

export function criarMapaUI(onde, cb) {
  const raiz = document.createElement("div");
  raiz.className = "mapa-grande-rp";
  raiz.hidden = true;
  raiz.innerHTML = `<div class="mp-janela" role="dialog" aria-label="Mapa da Rabiscolândia">
    <div class="mp-topo"><h2>🗺️ Mapa da Rabiscolândia</h2><button class="mp-fechar" data-foco aria-label="Fechar o mapa">✕</button></div>
    <div class="mp-corpo">
      <div class="mp-area"><canvas class="mp-tela" aria-label="Mapa: toque num lugar para escolher"></canvas>
        <div class="mp-zoom"><button data-foco data-zoom="1" aria-label="Aproximar">+</button><button data-foco data-zoom="-1" aria-label="Afastar">−</button><button data-foco data-zoom="0" aria-label="Mostrar onde estou">◎</button></div>
        <div class="mp-norte" aria-hidden="true">N<i>▲</i></div>
        <div class="mp-cartao" hidden></div>
      </div>
      <div class="mp-lado">
        <div class="mp-destino" hidden></div>
        <input class="mp-busca" type="search" data-foco placeholder="🔎 Procurar um lugar…" aria-label="Procurar um lugar" autocomplete="off" spellcheck="false">
        <div class="mp-filtros" role="tablist" aria-label="Filtrar por categoria"></div>
        <div class="mp-lista" role="list"></div>
      </div>
    </div></div>`;
  onde.append(raiz);
  const $ = (s) => raiz.querySelector(s);
  const tela = $(".mp-tela"), area = $(".mp-area"), cartao = $(".mp-cartao"), lista = $(".mp-lista"), busca = $(".mp-busca"), filtrosEl = $(".mp-filtros"), destinoEl = $(".mp-destino");
  const c = tela.getContext("2d");
  let itens = [], filtro = "todos", texto = "", sel = null, foco = null;
  let larg = 0, alt = 0, dpr = 1;
  const v = { cx: 0, cz: 20, esc: 1 }; // centro (m) e escala (px de tela por metro)
  let anim = null, pedido = false, ultimoDesenho = { pinos: [], rotulos: [] };

  // ------------------------------------------------------------ eventos
  // o toque e o mouse no mapa não chegam ao jogo (nem ao arrastar da câmera); o teclado chega (é ele que anda o foco)
  for (const ev of ["pointerdown", "pointermove", "pointerup", "touchstart", "touchmove", "touchend", "wheel"]) raiz.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
  raiz.addEventListener("click", (e) => { if (e.target === raiz) api.fechar(); });
  $(".mp-fechar").addEventListener("click", (e) => { e.stopPropagation(); api.fechar(); });
  for (const b of raiz.querySelectorAll("[data-zoom]")) b.addEventListener("click", (e) => { e.stopPropagation(); const z = Number(b.dataset.zoom); if (z) api.zoom(z > 0 ? 1.6 : 1 / 1.6); else { const p = cb.jogador(); animarPara(p.x, p.z, Math.max(v.esc, escMin() * 3)); } });
  busca.addEventListener("input", () => { texto = sem(busca.value.trim()); montarLista(); pedirDesenho(); });
  busca.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") { e.preventDefault(); if (busca.value) { busca.value = ""; texto = ""; montarLista(); pedirDesenho(); } else { busca.blur(); api.voltar(); } }
    else if (e.key === "ArrowDown" || e.key === "Enter") { e.preventDefault(); const p = lista.querySelector(".mp-item"); if (p) { busca.blur(); focar(p); if (e.key === "Enter") p.click(); } }
  });
  // arrastar, pinça, rodinha e toque
  const dedos = new Map(); let gesto = null;
  tela.addEventListener("pointerdown", (e) => {
    tela.setPointerCapture?.(e.pointerId); dedos.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    anim = null;
    gesto = { moveu: dedos.size > 1 ? true : false, x0: e.offsetX, y0: e.offsetY, cx: v.cx, cz: v.cz, esc: v.esc, d0: distDedos(), m0: meioDedos() };
  });
  tela.addEventListener("pointermove", (e) => {
    if (!dedos.has(e.pointerId) || !gesto) return;
    dedos.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (dedos.size >= 2) {
      gesto.moveu = true;
      const d = distDedos(), m = meioDedos();
      if (!gesto.d0) { gesto.d0 = d; gesto.m0 = m; gesto.cx = v.cx; gesto.cz = v.cz; gesto.esc = v.esc; }
      const esc = limitarEsc(gesto.esc * (d / gesto.d0));
      // o ponto do mundo sob o meio dos dedos no começo fica sob o meio dos dedos agora
      const wx = gesto.cx + (gesto.m0.x - larg / 2) / gesto.esc, wz = gesto.cz + (gesto.m0.y - alt / 2) / gesto.esc;
      v.esc = esc; v.cx = wx - (m.x - larg / 2) / esc; v.cz = wz - (m.y - alt / 2) / esc;
    } else {
      const dx = e.offsetX - gesto.x0, dy = e.offsetY - gesto.y0;
      if (Math.hypot(dx, dy) > 7) gesto.moveu = true;
      if (gesto.moveu) { v.cx = gesto.cx - dx / v.esc; v.cz = gesto.cz - dy / v.esc; }
    }
    limitar(); pedirDesenho();
  });
  const soltar = (e) => {
    if (!dedos.has(e.pointerId)) return;
    dedos.delete(e.pointerId);
    if (gesto && !gesto.moveu && e.type === "pointerup") tocarEm(e.offsetX, e.offsetY);
    if (dedos.size === 1) { const [p] = dedos.values(); gesto = { moveu: true, x0: p.x, y0: p.y, cx: v.cx, cz: v.cz, esc: v.esc, d0: 0 }; } else if (!dedos.size) gesto = null;
  };
  tela.addEventListener("pointerup", soltar); tela.addEventListener("pointercancel", soltar);
  tela.addEventListener("wheel", (e) => { e.preventDefault(); zoomEm(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.25 : 1 / 1.25); }, { passive: false });
  function distDedos() { const p = [...dedos.values()]; return p.length >= 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0; }
  function meioDedos() { const p = [...dedos.values()]; return p.length >= 2 ? { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 } : p[0] ?? { x: 0, y: 0 }; }
  new ResizeObserver(() => { if (!raiz.hidden) { const antes = escMin(); medir(); if (v.esc <= antes * 1.01) v.esc = escMin(); limitar(); pedirDesenho(); } }).observe(area);

  // ------------------------------------------------------------ vista
  const escMin = () => Math.min(larg, alt) / (W * 2) * 0.98 || 0.4;
  const escMax = () => 5;
  const limitarEsc = (e) => Math.min(escMax(), Math.max(escMin(), e));
  function limitar() {
    v.esc = limitarEsc(v.esc);
    const fx = Math.max(0, W - larg / 2 / v.esc), fz = Math.max(0, W - alt / 2 / v.esc);
    v.cx = Math.max(-fx, Math.min(fx, v.cx)); v.cz = Math.max(-fz, Math.min(fz, v.cz));
  }
  function zoomEm(sx, sy, f) {
    anim = null;
    const wx = v.cx + (sx - larg / 2) / v.esc, wz = v.cz + (sy - alt / 2) / v.esc;
    v.esc = limitarEsc(v.esc * f); v.cx = wx - (sx - larg / 2) / v.esc; v.cz = wz - (sy - alt / 2) / v.esc;
    limitar(); pedirDesenho();
  }
  function animarPara(cx, cz, esc) {
    const de = { ...v }, para = { cx, cz, esc: limitarEsc(esc) }, t0 = performance.now(), dur = 320;
    anim = (agora) => {
      const k = Math.min(1, (agora - t0) / dur), e = 1 - (1 - k) ** 3;
      v.esc = de.esc * (para.esc / de.esc) ** e; v.cx = de.cx + (para.cx - de.cx) * e; v.cz = de.cz + (para.cz - de.cz) * e;
      limitar();
      return k < 1;
    };
    pedirDesenho();
  }
  function medir() {
    const r = area.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    larg = Math.max(1, Math.round(r.width)); alt = Math.max(1, Math.round(r.height));
    if (tela.width !== Math.round(larg * dpr) || tela.height !== Math.round(alt * dpr)) { tela.width = Math.round(larg * dpr); tela.height = Math.round(alt * dpr); }
  }
  const P = (x, z) => [larg / 2 + (x - v.cx) * v.esc, alt / 2 + (z - v.cz) * v.esc];
  function pedirDesenho() {
    if (pedido || raiz.hidden) return;
    pedido = true;
    requestAnimationFrame((agora) => { pedido = false; if (anim && !anim(agora)) anim = null; desenhar(); if (anim) pedirDesenho(); });
  }

  // ------------------------------------------------------------ desenho
  const tv = () => document.documentElement.classList.contains("modo-tv");
  const medidas = new Map();
  function largura(txt, fonte) { const k = fonte + txt; if (!medidas.has(k)) { c.font = fonte; medidas.set(k, c.measureText(txt).width); } return medidas.get(k); }
  const cruza = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const visiveis = () => itens.filter((it) => (filtro === "todos" || it.cat === filtro) && (!texto || it.busca.includes(texto)));
  function pilula(x, y, w, h, fundo, borda, lw) {
    const r = h / 2;
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    c.fillStyle = fundo; c.fill(); c.lineWidth = lw; c.strokeStyle = borda; c.stroke();
  }
  function desenhar() {
    if (raiz.hidden) return;
    medir();
    const f = tv() ? 1.3 : larg < 520 ? 0.9 : 1;
    const R = 14 * f, t = performance.now() / 1000;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, larg, alt);
    // papel em volta e a cidade (o fundo vem pronto do jogo: chão, água, ruas e prédios)
    c.fillStyle = "#3fa9ef"; c.fillRect(0, 0, larg, alt);
    const [x0, y0] = P(-W, -W), lado = W * 2 * v.esc;
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    c.drawImage(cb.fundo(2048), x0, y0, lado, lado);
    c.lineWidth = 3; c.strokeStyle = "#151515"; c.strokeRect(x0, y0, lado, lado);
    c.save(); c.translate(0, 0); cb.vivos?.(c, P, R, v.esc); c.restore();
    // nomes dos bairros (bem clarinhos), linha até o destino, alfinetes, nomes, o Rabisco
    const ocupados = [];
    // os botões por cima do mapa (+, −, ◎, o N e o cartão) também contam: nome nenhum fica escondido atrás deles
    { const a = area.getBoundingClientRect(); for (const el of raiz.querySelectorAll(".mp-zoom, .mp-norte, .mp-cartao:not([hidden])")) { const b = el.getBoundingClientRect(); if (b.width) ocupados.push({ x0: b.left - a.left - 4, x1: b.right - a.left + 4, y0: b.top - a.top - 4, y1: b.bottom - a.top + 4, botao: true }); } }
    const jog = cb.jogador();
    const [jx, jy] = P(jog.x, jog.z);
    const dest = cb.destino?.();
    if (dest) {
      const [dx, dy] = P(dest.x, dest.z);
      c.save(); c.setLineDash([10 * f, 8 * f]); c.lineDashOffset = -t * 30; c.lineCap = "round";
      c.strokeStyle = "#ffffff"; c.lineWidth = 7 * f; c.beginPath(); c.moveTo(jx, jy); c.lineTo(dx, dy); c.stroke();
      c.strokeStyle = "#ff2a6a"; c.lineWidth = 4 * f; c.stroke(); c.restore();
    }
    ocupados.push({ x0: jx - R * 1.2, x1: jx + R * 1.2, y0: jy - R * 1.2, y1: jy + R * 1.2, rabisco: true });
    // agrupa: em ordem de importância, o alfinete que encostaria num já posto entra no grupo dele
    const lista2 = visiveis().sort((a, b) => (a === sel ? -1 : b === sel ? 1 : CAT[a.cat].prio - CAT[b.cat].prio));
    const pinos = [];
    for (const it of lista2) {
      const [sx, sy] = P(it.x, it.z);
      if (sx < -R || sy < -R || sx > larg + R || sy > alt + R) continue;
      const perto = it === sel ? null : pinos.find((p) => Math.hypot(p.sx - sx, p.sy - sy) < (p.r + R) * 1.12);
      if (perto) { perto.grupo.push(it); continue; }
      pinos.push({ it, sx, sy, grupo: [], r: it === sel ? R * 1.22 : R });
    }
    for (const p of pinos) ocupados.push({ x0: p.sx - p.r - 2, x1: p.sx + p.r + 2 + (p.grupo.length ? 10 * f : 0), y0: p.sy - p.r - 2 - (p.grupo.length ? 8 * f : 0), y1: p.sy + p.r + 5 });
    // nomes: cada um procura um lado livre do alfinete, dentro da tela, sem cruzar nome nem alfinete
    const fonte = `800 ${Math.round(13 * f)}px 'Baloo 2', system-ui, sans-serif`;
    const H = Math.round(20 * f), PAD = 8 * f;
    const rotulos = [];
    const caixaVoce = (() => { const w = largura("Você", fonte) + PAD * 2; return { x0: jx - w / 2, x1: jx + w / 2, y0: jy + R * 1.25, y1: jy + R * 1.25 + H }; })();
    const cabe = (b) => b.x0 >= 3 && b.y0 >= 3 && b.x1 <= larg - 3 && b.y1 <= alt - 3 && !ocupados.some((o) => cruza(o, b)) && !rotulos.some((o) => cruza(o, b));
    if (cabe(caixaVoce)) rotulos.push({ ...caixaVoce, txt: "Você", voce: true });
    // 1º os importantes (casa, escolas, igreja, parceiras) colados no alfinete; sem lado livre, um pouco mais longe com
    // uma linhazinha até o alfinete; depois os outros lugares, só colados
    const importante = (p) => CAT[p.it.cat].prio <= CAT.parceira.prio || p.it === sel;
    const porNome = (p, longe) => {
      if (rotulos.some((r) => r.p === p)) return;
      const txt = p.it.curto, w = largura(txt, fonte) + PAD * 2, g = p.r + 4 + (longe ? 16 * f : 0), d = longe ? 12 * f : 0;
      const lados = [[g, -H / 2], [-g - w, -H / 2], [-w / 2, -g - H - 2], [-w / 2, g + 4], [g - d, -p.r - H - d], [-g - w + d, -p.r - H - d], [g - d, p.r + d], [-g - w + d, p.r + d]];
      for (const [ox, oy] of lados) {
        const b = { x0: p.sx + ox, y0: p.sy + oy, x1: p.sx + ox + w, y1: p.sy + oy + H };
        if (cabe(b)) { rotulos.push({ ...b, txt, p, linha: longe }); return; }
      }
    };
    for (const p of pinos) if (importante(p)) porNome(p, false);
    for (const p of pinos) if (importante(p)) porNome(p, true);
    for (const p of pinos) if (!importante(p)) porNome(p, false);
    // linhazinhas dos nomes que ficaram mais longe (por baixo dos alfinetes e dos nomes)
    c.lineWidth = 2; c.strokeStyle = "#151515"; c.lineCap = "round";
    for (const r of rotulos) if (r.linha) {
      const qx = Math.max(r.x0 + 6, Math.min(r.x1 - 6, r.p.sx)), qy = Math.max(r.y0 + 4, Math.min(r.y1 - 4, r.p.sy));
      c.beginPath(); c.moveTo(r.p.sx, r.p.sy); c.lineTo(qx, qy); c.stroke();
    }
    // bairros: só onde não encosta em nada
    const fonteB = `800 ${Math.round(15 * f)}px 'Baloo 2', system-ui, sans-serif`;
    const bairros = [];
    if (!texto && filtro === "todos") for (const B of BAIRROS) {
      const [bx, by] = P(B.x, B.z), w = largura(B.nome.toUpperCase(), fonteB) + 6;
      const b = { x0: bx - w / 2, x1: bx + w / 2, y0: by - 11 * f, y1: by + 11 * f };
      if (cabe(b)) { bairros.push({ ...b, txt: B.nome.toUpperCase(), cx: bx, cy: by }); rotulos.push({ ...b, txt: B.nome, bairro: true }); }
    }
    c.font = fonteB; c.textAlign = "center"; c.textBaseline = "middle";
    for (const b of bairros) { c.lineWidth = 4; c.strokeStyle = "rgba(255,255,255,0.55)"; c.strokeText(b.txt, b.cx, b.cy); c.fillStyle = "rgba(21,21,21,0.42)"; c.fillText(b.txt, b.cx, b.cy); }
    // alfinetes
    const fonteE = `${Math.round(R * 1.15)}px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif`;
    for (const p of pinos) {
      const cat = CAT[p.it.cat], eSel = p.it === sel, eDest = dest && Math.hypot(dest.x - p.it.x, dest.z - p.it.z) < 1;
      const r = eSel ? R * 1.22 : R;
      if (eSel || eDest) { c.beginPath(); c.arc(p.sx, p.sy, r + 6 + Math.sin(t * 5) * 2, 0, 7); c.fillStyle = "rgba(255,42,106,0.28)"; c.fill(); c.lineWidth = 3; c.strokeStyle = "#ff2a6a"; c.stroke(); }
      c.beginPath(); c.arc(p.sx + 1.5, p.sy + 3, r, 0, 7); c.fillStyle = "rgba(21,21,21,0.55)"; c.fill(); // sombrinha de desenho
      c.beginPath(); c.arc(p.sx, p.sy, r, 0, 7); c.fillStyle = "#fff"; c.fill();
      c.lineWidth = 4 * f; c.strokeStyle = cat.cor; c.stroke();
      c.beginPath(); c.arc(p.sx, p.sy, r + 2 * f, 0, 7); c.lineWidth = 1.6; c.strokeStyle = "#151515"; c.stroke();
      c.font = fonteE; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#151515";
      c.fillText(p.it.emoji, p.sx, p.sy + 1);
      if (p.grupo.length) {
        const bx = p.sx + p.r * 0.8, by = p.sy - p.r * 0.8, br = 8.5 * f;
        c.beginPath(); c.arc(bx, by, br, 0, 7); c.fillStyle = "#ec2e8c"; c.fill(); c.lineWidth = 2; c.strokeStyle = "#151515"; c.stroke();
        c.font = `800 ${Math.round(11 * f)}px 'Baloo 2', system-ui, sans-serif`; c.fillStyle = "#fff"; c.fillText(`+${p.grupo.length}`, bx, by + 1);
      }
    }
    // nomes
    c.font = fonte; c.textAlign = "center"; c.textBaseline = "middle";
    for (const r of rotulos) {
      if (r.bairro) continue;
      const eSel = r.p && r.p.it === sel;
      const fundo = r.voce ? "#ec2e8c" : eSel ? "#151515" : "#ffffff", cor = r.voce || eSel ? "#ffffff" : "#151515";
      pilula(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, fundo, "#151515", 2.2);
      c.fillStyle = cor; c.fillText(r.txt, (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2 + 1);
    }
    // o Rabisco por cima de tudo: seta rosa com contorno
    c.save(); c.translate(jx, jy); c.rotate(-jog.dir + Math.PI);
    const e = R * 1.05;
    c.beginPath(); c.moveTo(0, -e); c.lineTo(e * 0.8, e * 0.8); c.lineTo(0, e * 0.4); c.lineTo(-e * 0.8, e * 0.8); c.closePath();
    c.lineJoin = "round"; c.lineWidth = 6; c.strokeStyle = "#fff"; c.stroke(); c.fillStyle = "#ec2e8c"; c.fill(); c.lineWidth = 2.2; c.strokeStyle = "#151515"; c.stroke();
    c.restore();
    ultimoDesenho = { pinos, rotulos, larg, alt, R };
  }
  function tocarEm(sx, sy) {
    const { pinos, rotulos, R = 14 } = ultimoDesenho;
    let alvo = null, dm = R + 10;
    for (const p of pinos) { const d = Math.hypot(p.sx - sx, p.sy - sy); if (d < dm) { dm = d; alvo = p; } }
    if (!alvo) alvo = rotulos.find((r) => r.p && sx >= r.x0 && sx <= r.x1 && sy >= r.y0 && sy <= r.y1)?.p ?? null;
    if (!alvo) { if (sel) { sel = null; mostrarCartao(); marcarLista(); pedirDesenho(); } return; }
    if (alvo.grupo.length && v.esc < escMax() * 0.95) {
      // grupo: aproxima até separar
      const todos = [alvo.it, ...alvo.grupo], mx = todos.reduce((s, i) => s + i.x, 0) / todos.length, mz = todos.reduce((s, i) => s + i.z, 0) / todos.length;
      animarPara(mx, mz, v.esc * 2.4);
      return;
    }
    selecionar(alvo.it, { mover: false });
  }

  // ------------------------------------------------------------ lista, filtros, cartão
  function montarFiltros() {
    filtrosEl.replaceChildren();
    const opcoes = [{ id: "todos", nome: "Todos", cor: "#151515", ic: "✨" }, ...CATEGORIAS.filter((k) => itens.some((i) => i.cat === k.id))];
    for (const o of opcoes) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "mp-filtro"; b.setAttribute("data-foco", ""); b.setAttribute("role", "tab"); b.dataset.cat = o.id;
      b.style.setProperty("--cor", o.cor);
      b.innerHTML = `<i></i>${o.curto ?? o.nome}`;
      b.setAttribute("aria-selected", String(filtro === o.id));
      b.addEventListener("click", (e) => { e.stopPropagation(); filtro = o.id; for (const x of filtrosEl.children) x.setAttribute("aria-selected", String(x.dataset.cat === filtro)); montarLista(); pedirDesenho(); });
      filtrosEl.append(b);
    }
  }
  const metros = (it) => { const p = cb.jogador(); const d = Math.hypot(it.x - p.x, it.z - p.z); return d < 1000 ? `${Math.round(d / 5) * 5} m` : `${(d / 1000).toFixed(1)} km`; };
  function montarLista() {
    lista.replaceChildren();
    const vis = visiveis();
    if (!vis.length) { const p = document.createElement("p"); p.className = "mp-vazio"; p.textContent = "Nenhum lugar com esse nome. Tente outra palavra!"; lista.append(p); return; }
    for (const k of CATEGORIAS) {
      const daqui = vis.filter((i) => i.cat === k.id);
      if (!daqui.length) continue;
      const h = document.createElement("h3"); h.className = "mp-grupo"; h.style.setProperty("--cor", k.cor); h.innerHTML = `<i></i>${k.nome}`; lista.append(h);
      for (const it of daqui.sort((a, b) => a.nome.localeCompare(b.nome, "pt"))) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "mp-item"; b.setAttribute("data-foco", ""); b.setAttribute("role", "listitem"); b.dataset.id = it.id;
        b.style.setProperty("--cor", k.cor);
        b.innerHTML = `<span class="mp-ic">${it.emoji}</span><span class="mp-nome">${it.nome}<small>${it.bairro}</small></span><span class="mp-dist">${metros(it)}</span>`;
        b.addEventListener("click", (e) => { e.stopPropagation(); selecionar(it); if (foco === b || !matchMedia("(pointer: coarse)").matches) focar($(".mp-ir") ?? b); });
        lista.append(b);
      }
    }
    marcarLista();
  }
  function marcarLista() { for (const b of lista.querySelectorAll(".mp-item")) b.classList.toggle("escolhido", b.dataset.id === sel?.id); }
  function mostrarCartao() {
    if (!sel) { cartao.hidden = true; return; }
    const k = CAT[sel.cat], d = cb.destino?.();
    const ehDestino = d && Math.hypot(d.x - sel.x, d.z - sel.z) < 1;
    cartao.style.setProperty("--cor", k.cor);
    cartao.innerHTML = `<span class="mp-ic">${sel.emoji}</span><span class="mp-nome"><b>${sel.nome}</b><small>${k.nome} · ${sel.bairro} · ${metros(sel)}</small></span>
      ${ehDestino ? `<button class="mp-cancelar" data-foco>✕ Cancelar</button>` : `<button class="mp-ir" data-foco>🧭 Ir para lá</button>`}<button class="mp-x" data-foco aria-label="Fechar o cartão">✕</button>`;
    cartao.hidden = false;
    cartao.querySelector(".mp-ir")?.addEventListener("click", (e) => { e.stopPropagation(); api.ir(sel.id); });
    cartao.querySelector(".mp-cancelar")?.addEventListener("click", (e) => { e.stopPropagation(); cb.cancelar?.(); mostrarDestino(); mostrarCartao(); pedirDesenho(); });
    cartao.querySelector(".mp-x").addEventListener("click", (e) => { e.stopPropagation(); const id = sel?.id; sel = null; mostrarCartao(); marcarLista(); pedirDesenho(); focar(lista.querySelector(`[data-id="${id}"]`)); });
  }
  function mostrarDestino() {
    const d = cb.destino?.();
    if (!d) { destinoEl.hidden = true; return; }
    destinoEl.hidden = false;
    destinoEl.innerHTML = `<span>${d.emoji ?? "📍"} Indo para <b>${d.nome ?? "o lugar marcado"}</b></span><button class="mp-cancelar" data-foco>✕ Cancelar</button>`;
    destinoEl.querySelector("button").addEventListener("click", (e) => { e.stopPropagation(); cb.cancelar?.(); mostrarDestino(); mostrarCartao(); pedirDesenho(); });
  }
  function selecionar(it, { mover = true } = {}) {
    sel = it; mostrarCartao(); marcarLista();
    if (mover) {
      const [sx, sy] = P(it.x, it.z), m = 60;
      const fora = sx < m || sy < m || sx > larg - m || sy > alt - m;
      if (fora || v.esc < escMin() * 2.2) animarPara(it.x, it.z, Math.max(v.esc, escMin() * 2.6)); else pedirDesenho();
    } else pedirDesenho();
  }

  // ------------------------------------------------------------ foco (teclado e controle)
  function focar(el) {
    if (foco) foco.classList.remove("rf-foco");
    foco = el;
    if (!el) return;
    el.classList.add("rf-foco");
    if (el !== busca) el.focus({ preventScroll: true });
    el.scrollIntoView?.({ block: "nearest" });
  }
  const focaveis = () => [...raiz.querySelectorAll("[data-foco]")].filter((e) => e.offsetParent !== null);

  const api = {
    raiz,
    get aberto() { return !raiz.hidden; },
    get selecionado() { return sel?.id ?? null; },
    get itens() { return itens; },
    get vista() { return { ...v, larg, alt, min: escMin(), max: escMax() }; },
    // para os testes: o que foi desenhado (alfinetes e caixas dos nomes, em px da tela do mapa)
    get desenho() { return { pinos: ultimoDesenho.pinos.map((p) => ({ id: p.it.id, x: p.sx, y: p.sy, r: p.r, grupo: p.grupo.map((g) => g.id) })), rotulos: ultimoDesenho.rotulos.map(({ x0, x1, y0, y1, txt, bairro, voce }) => ({ x0, x1, y0, y1, txt, bairro: Boolean(bairro), voce: Boolean(voce), id: null })), larg, alt }; },
    abrir() {
      itens = itensDoMapa(cb.casa?.());
      if (sel) sel = itens.find((i) => i.id === sel.id) ?? null;
      raiz.hidden = false; document.documentElement.classList.add("mapa-rp-aberto"); // os botões do topo da casca saem da frente
      medir();
      if (!api._viu) { api._viu = true; v.esc = escMin(); v.cx = 0; v.cz = 0; }
      limitar();
      montarFiltros(); montarLista(); mostrarDestino(); mostrarCartao();
      cb.aoAbrir?.();
      desenhar(); pedirDesenho();
      focar(sel ? lista.querySelector(`[data-id="${sel.id}"]`) : lista.querySelector(".mp-item"));
    },
    fechar() { if (raiz.hidden) return; raiz.hidden = true; document.documentElement.classList.remove("mapa-rp-aberto"); busca.blur(); if (foco) foco.classList.remove("rf-foco"); foco = null; cb.aoFechar?.(); },
    atualizar() { if (!raiz.hidden) pedirDesenho(); },
    selecionar(id) { const it = itens.find((i) => i.id === id); if (it) selecionar(it); return Boolean(it); },
    ir(id) { const it = itens.find((i) => i.id === id); if (!it) return false; sel = null; cb.irPara?.(it); return true; },
    buscar(t) { busca.value = t; texto = sem(t.trim()); montarLista(); pedirDesenho(); },
    filtrar(cat) { filtro = cat; montarFiltros(); montarLista(); pedirDesenho(); },
    zoom(f) { zoomEm(larg / 2, alt / 2, f); },
    tocar: (sx, sy) => tocarEm(sx, sy),
    voltar() { if (sel) { const id = sel.id; sel = null; mostrarCartao(); marcarLista(); pedirDesenho(); focar(lista.querySelector(`[data-id="${id}"]`) ?? lista.querySelector(".mp-item")); } else api.fechar(); },
    confirmar() { if (foco === busca) { busca.focus(); return; } foco?.click(); },
    // anda o foco pelo item mais perto na direção pedida (como no Rabifone); na lista, mostra o lugar no mapa
    navegar(dx, dy) {
      const els = focaveis();
      if (!foco || !els.includes(foco)) { focar(lista.querySelector(".mp-item") ?? els[0]); return; }
      const a = foco.getBoundingClientRect(), ax = a.x + a.width / 2, ay = a.y + a.height / 2;
      let melhor = null, dm = Infinity;
      for (const e of els) {
        if (e === foco) continue;
        const b = e.getBoundingClientRect(), bx = b.x + b.width / 2 - ax, by = b.y + b.height / 2 - ay;
        const frente = bx * dx + by * dy;
        if (frente <= 4) continue;
        const d = frente + Math.abs(bx * dy - by * dx) * 2;
        if (d < dm) { dm = d; melhor = e; }
      }
      if (!melhor) return;
      focar(melhor);
      if (melhor.classList.contains("mp-item")) { const it = itens.find((i) => i.id === melhor.dataset.id); if (it) selecionar(it); }
    },
  };
  return api;
}
