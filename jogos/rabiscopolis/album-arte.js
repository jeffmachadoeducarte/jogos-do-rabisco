// Rabiscolândia: o desenho das figurinhas do Álbum (canvas 2D, no estilo do jogo: contorno grosso e cores alegres).
// Nada de foto de pessoa: os parceiros são a fachada inventada da loja (e, onde existe, o letreiro de src/parceiros-arte.js),
// os amigos são os personagens do estojo, os versículos um livrinho aberto e os lugares um desenho com o emoji do lugar.
//   desenharFigurinha(ctx, fig, { tem, w, h })   (padrão 200 × 280)     TAMANHO = { w: 200, h: 280 }
import { RARIDADES } from "./album-dados.js";
import { ESTILO_PARCEIRO } from "../../src/parceiros.js";
import { desenharLetreiro, IDS_ARTE } from "../../src/parceiros-arte.js";

export const TAMANHO = { w: 200, h: 280 };
// retratos dos bonecos (album-pessoas.js): quem usa a arte liga o cache aqui; sem ele a figurinha mostra um espaço reservado
let retratos = null;
export const usarRetratos = (fn) => { retratos = fn; };
const TINTA = "#151515";
const FONTE = "'Baloo 2', 'Trebuchet MS', sans-serif";
const EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

function arredondado(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function texto(c, t, x, y, maxW, tam, { cor = TINTA, peso = 800, contorno = null } = {}) {
  let n = tam;
  const pega = () => { c.font = `${peso} ${n}px ${FONTE}`; };
  pega();
  while (c.measureText(t).width > maxW && n > 8) { n -= 1; pega(); }
  c.textAlign = "center"; c.textBaseline = "middle";
  if (contorno) { c.lineJoin = "round"; c.lineWidth = n * 0.2; c.strokeStyle = contorno; c.strokeText(t, x, y); }
  c.fillStyle = cor; c.fillText(t, x, y);
}
const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;
function escurece(cor, f = 0.7) {
  const m = /^#?([0-9a-f]{6})$/i.exec(cor); if (!m) return cor;
  const n = parseInt(m[1], 16);
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`;
}

// ---------------------------------------------------------------- fundos e cenas (cada uma desenha dentro da caixa x, y, w, h)
function ceu(c, x, y, w, h, topo, base) {
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, topo); g.addColorStop(1, base);
  c.fillStyle = g; c.fillRect(x, y, w, h);
}
function nuvem(c, x, y, s) {
  c.fillStyle = "rgba(255,255,255,0.9)"; c.beginPath();
  c.arc(x, y, s * 0.5, 0, 7); c.arc(x + s * 0.55, y + s * 0.1, s * 0.4, 0, 7); c.arc(x - s * 0.5, y + s * 0.12, s * 0.36, 0, 7); c.fill();
}
function chao(c, x, y, w, h, cor) { c.fillStyle = cor; c.fillRect(x, y, w, h); c.fillStyle = "rgba(0,0,0,0.08)"; c.fillRect(x, y, w, 3); }

// loja do parceiro: fachada inventada (toldo listrado, vitrine, porta e a placa com o nome)
function cenaParceiro(c, fig, x, y, w, h) {
  const E = ESTILO_PARCEIRO[fig.tipo] ?? { parede: "#e8e2d6", beiral: "#ec2e8c" };
  ceu(c, x, y, w, h, "#8fd8ff", "#dff3ff"); nuvem(c, x + 34, y + 20, 22); nuvem(c, x + w - 30, y + 30, 16);
  chao(c, x, y + h - 22, w, 22, "#a9b0b8");
  const bx = x + 12, bw = w - 24, by = y + 26, bh = h - 26 - 22;
  c.lineJoin = "round"; c.lineWidth = 4; c.strokeStyle = TINTA;
  c.fillStyle = E.parede; c.fillRect(bx, by, bw, bh); c.strokeRect(bx, by, bw, bh);
  // placa
  const pw = bw - 14, ph = 38, px = bx + 7, py = by + 6;
  c.fillStyle = "#ffffff"; arredondado(c, px, py, pw, ph, 6); c.fill(); c.stroke();
  c.save(); arredondado(c, px + 2, py + 2, pw - 4, ph - 4, 5); c.clip();
  if (IDS_ARTE.includes(fig.parceiro)) { c.translate(px + 2, py + 2); desenharLetreiro(c, fig.parceiro, pw - 4, ph - 4); }
  else { c.fillStyle = E.beiral; c.fillRect(px, py, pw, ph); texto(c, fig.nome, px + pw / 2, py + ph / 2, pw - 12, 17, { cor: "#fff", contorno: TINTA }); }
  c.restore();
  // toldo
  const ty = py + ph + 4, n = 6, tw = bw / n;
  for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? "#ffffff" : E.beiral; c.beginPath(); c.moveTo(bx + i * tw, ty); c.lineTo(bx + (i + 1) * tw, ty); c.lineTo(bx + (i + 1) * tw, ty + 14); c.arc(bx + (i + 0.5) * tw, ty + 14, tw / 2, 0, Math.PI); c.closePath(); c.fill(); }
  c.strokeRect(bx, ty, bw, 14);
  // vitrines e porta
  const vy = ty + 28, vh = by + bh - vy - 2;
  c.fillStyle = "#bfe6ff";
  for (const vx of [bx + 8, bx + bw - 8 - bw * 0.28]) { c.fillRect(vx, vy, bw * 0.28, vh * 0.7); c.strokeRect(vx, vy, bw * 0.28, vh * 0.7); }
  c.fillStyle = escurece(E.beiral, 0.8); const dw = bw * 0.24; c.fillRect(bx + bw / 2 - dw / 2, vy - 2, dw, vh + 2); c.strokeRect(bx + bw / 2 - dw / 2, vy - 2, dw, vh + 2);
  c.fillStyle = "#ffcf33"; c.beginPath(); c.arc(bx + bw / 2 + dw * 0.28, vy + vh * 0.55, 2.4, 0, 7); c.fill();
}

// personagem do estojo (lápis, giz, borracha...): corpo por tipo, rosto sorrindo
const CORES_NOME = [["vermelh", "#e8413c"], ["azul", "#2f8fe8"], ["rosa", "#ec2e8c"], ["verd", "#58c43a"], ["laranj", "#ff8a1f"], ["roxa", "#8e6cff"], ["roxo", "#8e6cff"], ["lilás", "#b58ad9"],
  ["turquesa", "#1fc08e"], ["marrom", "#9a6232"], ["cinza", "#9aa0a7"], ["dourad", "#e7b73d"], ["branca", "#f4f4f4"], ["amarel", "#ffcc1f"], ["pérola", "#f1e6f2"], ["anil", "#4b5fd0"]];
function corDoAmigo(fig) {
  if (fig.cor != null) return hex(fig.cor);
  const nome = fig.nome.toLowerCase();
  for (const [k, v] of CORES_NOME) if (nome.includes(k)) return v;
  return { regua: "#ffd84a", cola: "#ffffff", borracha: "#f7a8c4", caderno: "#1fc08e", apontador: "#2f8fe8", vovo: "#b58ad9" }[fig.tipo] ?? "#ec2e8c";
}
function rosto(c, x, y, s) {
  c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = s * 0.07;
  for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * s * 0.2, y, s * 0.13, 0, 7); c.fill(); c.stroke(); c.fillStyle = TINTA; c.beginPath(); c.arc(x + d * s * 0.2 + s * 0.02, y + s * 0.01, s * 0.06, 0, 7); c.fill(); c.fillStyle = "#fff"; }
  c.strokeStyle = TINTA; c.lineWidth = s * 0.07; c.lineCap = "round"; c.beginPath(); c.arc(x, y + s * 0.16, s * 0.17, 0.2, Math.PI - 0.2); c.stroke();
  c.fillStyle = "rgba(255,90,140,0.45)"; for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * s * 0.36, y + s * 0.2, s * 0.08, 0, 7); c.fill(); }
}
function cenaAmigo(c, fig, x, y, w, h) {
  const cor = corDoAmigo(fig);
  ceu(c, x, y, w, h, "#ffe9a8", "#ffd1e6"); chao(c, x, y + h - 26, w, 26, "#8fd35b");
  c.fillStyle = "rgba(0,0,0,0.15)"; c.beginPath(); c.ellipse(x + w / 2, y + h - 22, 44, 8, 0, 0, 7); c.fill();
  const cx = x + w / 2, base = y + h - 24;
  c.lineJoin = "round"; c.lineWidth = 5; c.strokeStyle = TINTA; c.fillStyle = cor;
  const t = fig.tipo;
  let fy = base - 60;
  if (t === "pata") { // a pata Ale: branquinha, bico e pés laranja, na beira do lago
    c.fillStyle = "#7cc8ef"; c.fillRect(x, base - 6, w, 30);
    c.fillStyle = "#ff9a1f"; for (const d of [-14, 12]) { c.beginPath(); c.ellipse(cx + d, base, 12, 5, 0, 0, 7); c.fill(); c.stroke(); }
    c.fillStyle = "#ffffff"; c.beginPath(); c.ellipse(cx - 6, base - 34, 46, 30, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(cx - 48, base - 44); c.lineTo(cx - 64, base - 62); c.lineTo(cx - 40, base - 56); c.fill(); c.stroke(); // rabinho
    c.beginPath(); c.ellipse(cx + 26, base - 82, 22, 24, 0, 0, 7); c.fill(); c.stroke(); c.fillRect(cx + 14, base - 66, 22, 18);
    c.fillStyle = "#ff9a1f"; c.beginPath(); c.moveTo(cx + 44, base - 88); c.lineTo(cx + 70, base - 80); c.lineTo(cx + 44, base - 72); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.beginPath(); c.arc(cx + 32, base - 88, 4.5, 0, 7); c.fill();
    c.strokeStyle = "#d9d9d9"; c.lineWidth = 3; c.beginPath(); c.arc(cx - 10, base - 36, 22, 3.6, 5.6); c.stroke();
    return;
  }
  if (t === "cachorro") { // o Duck: golden caramelo, peito creme, orelhas caídas e o rabo de pluma
    const ca = "#c8782e", cr = "#f2d6a2";
    c.fillStyle = ca; c.beginPath(); c.moveTo(cx - 44, base - 58); c.quadraticCurveTo(cx - 80, base - 96, cx - 66, base - 104); c.quadraticCurveTo(cx - 52, base - 80, cx - 34, base - 66); c.fill(); c.stroke(); // rabo
    arredondado(c, cx - 50, base - 70, 84, 40, 18); c.fill(); c.stroke();
    for (const d of [-40, -22, 10, 26]) { c.fillStyle = d < 0 ? ca : ca; arredondado(c, cx + d - 6, base - 36, 14, 36, 5); c.fill(); c.stroke(); }
    c.fillStyle = cr; arredondado(c, cx + 8, base - 74, 30, 40, 12); c.fill(); c.stroke(); // peito
    c.fillStyle = ca; arredondado(c, cx + 6, base - 118, 52, 48, 16); c.fill(); c.stroke(); // cabeça
    c.fillStyle = "#b0642a"; arredondado(c, cx + 34, base - 96, 30, 22, 9); c.fill(); c.stroke(); // focinho
    c.fillStyle = TINTA; c.beginPath(); c.ellipse(cx + 60, base - 92, 6, 5, 0, 0, 7); c.fill();
    c.fillStyle = "#a85a22"; arredondado(c, cx + 2, base - 112, 16, 36, 8); c.fill(); c.stroke(); // orelha
    c.fillStyle = "#3a2010"; c.beginPath(); c.arc(cx + 34, base - 104, 5, 0, 7); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(cx + 35.5, base - 106, 1.8, 0, 7); c.fill();
    c.fillStyle = "#ff6f8f"; c.beginPath(); c.ellipse(cx + 48, base - 76, 6, 8, 0, 0, 7); c.fill(); // linguinha
    return;
  }
  if (t === "borracha") {
    arredondado(c, cx - 50, base - 74, 100, 74, 14); c.fill(); c.stroke(); c.fillStyle = "#00b5f0"; arredondado(c, cx - 50, base - 38, 100, 38, 12); c.fill(); c.stroke(); fy = base - 56;
  } else if (t === "giz") {
    arredondado(c, cx - 30, base - 100, 60, 100, 12); c.fill(); c.stroke(); c.fillStyle = "rgba(255,255,255,0.5)"; c.fillRect(cx - 30, base - 100, 60, 12); fy = base - 56;
  } else if (t === "regua") {
    arredondado(c, cx - 30, base - 118, 60, 118, 8); c.fill(); c.stroke(); c.strokeStyle = TINTA; c.lineWidth = 2.5;
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(cx - 30, base - 112 + i * 12); c.lineTo(cx - 30 + (i % 2 ? 9 : 15), base - 112 + i * 12); c.stroke(); } fy = base - 64;
  } else if (t === "caderno") {
    arredondado(c, cx - 44, base - 100, 88, 100, 8); c.fill(); c.stroke(); c.fillStyle = "#fffdf5"; c.fillRect(cx - 36, base - 92, 72, 84);
    c.strokeStyle = TINTA; c.lineWidth = 3; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(cx - 44, base - 88 + i * 20, 4, 0, 7); c.stroke(); } fy = base - 54;
  } else if (t === "cola") {
    c.fillStyle = "#fff"; arredondado(c, cx - 38, base - 90, 76, 90, 18); c.fill(); c.stroke(); c.fillStyle = "#ff8a1f"; c.fillRect(cx - 16, base - 112, 32, 22); c.strokeRect(cx - 16, base - 112, 32, 22); fy = base - 50;
  } else if (t === "apontador") {
    c.beginPath(); c.moveTo(cx - 46, base); c.lineTo(cx - 46, base - 56); c.lineTo(cx - 10, base - 84); c.lineTo(cx + 46, base - 84); c.lineTo(cx + 46, base); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#d9e2ec"; c.beginPath(); c.arc(cx + 18, base - 84, 7, 0, 7); c.fill(); c.stroke(); fy = base - 44;
  } else if (t === "pincel") {
    c.fillStyle = "#c97a3a"; arredondado(c, cx - 14, base - 60, 28, 60, 6); c.fill(); c.stroke(); c.fillStyle = "#c8d0da"; c.fillRect(cx - 20, base - 84, 40, 26); c.strokeRect(cx - 20, base - 84, 40, 26);
    c.fillStyle = cor; c.beginPath(); c.moveTo(cx - 18, base - 84); c.quadraticCurveTo(cx - 20, base - 118, cx, base - 128); c.quadraticCurveTo(cx + 20, base - 118, cx + 18, base - 84); c.closePath(); c.fill(); c.stroke(); fy = base - 36;
  } else if (t === "clipe") {
    arredondado(c, cx - 36, base - 84, 72, 84, 14); c.fill(); c.stroke(); c.strokeStyle = "#c8d0da"; c.lineWidth = 6; c.beginPath(); c.moveTo(cx - 12, base - 84); c.lineTo(cx - 12, base - 112); c.arc(cx + 4, base - 112, 16, Math.PI, 0); c.lineTo(cx + 20, base - 90); c.stroke(); fy = base - 46;
  } else { // lápis (e vovó): corpo comprido, ponta de madeira e borracha
    arredondado(c, cx - 28, base - 108, 56, 108, 6); c.fill(); c.stroke();
    c.fillStyle = "#ffe0b8"; c.beginPath(); c.moveTo(cx - 28, base - 108); c.lineTo(cx, base - 142); c.lineTo(cx + 28, base - 108); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = cor; c.beginPath(); c.moveTo(cx - 10, base - 130); c.lineTo(cx, base - 142); c.lineTo(cx + 10, base - 130); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "#f7a8c4"; c.fillRect(cx - 28, base - 14, 56, 14); c.strokeRect(cx - 28, base - 14, 56, 14); fy = base - 70;
    if (t === "vovo") { c.strokeStyle = TINTA; c.lineWidth = 3; for (const d of [-1, 1]) { c.beginPath(); c.arc(cx + d * 11, fy - 2, 8, 0, 7); c.stroke(); } c.beginPath(); c.moveTo(cx - 3, fy - 2); c.lineTo(cx + 3, fy - 2); c.stroke(); }
  }
  rosto(c, cx, fy, 52);
}

// versículo: livrinho aberto com um brilho em volta e o emoji da história por cima
function cenaVersiculo(c, fig, x, y, w, h) {
  ceu(c, x, y, w, h, "#ffe9a8", "#ffc7e1");
  c.fillStyle = "rgba(255,255,255,0.35)"; for (let i = 0; i < 7; i++) { const a = -Math.PI + (i * Math.PI) / 6; c.beginPath(); c.moveTo(x + w / 2, y + h * 0.78); c.arc(x + w / 2, y + h * 0.78, w, a - 0.09, a + 0.09); c.closePath(); c.fill(); }
  const cx = x + w / 2, by = y + h * 0.84;
  c.lineJoin = "round"; c.lineWidth = 4; c.strokeStyle = TINTA;
  c.fillStyle = "#3f9fd0"; c.beginPath(); c.moveTo(cx, by + 6); c.lineTo(cx - 70, by - 8); c.lineTo(cx - 70, by - 52); c.lineTo(cx, by - 38); c.lineTo(cx + 70, by - 52); c.lineTo(cx + 70, by - 8); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#fffdf5"; c.beginPath(); c.moveTo(cx, by - 2); c.lineTo(cx - 62, by - 14); c.lineTo(cx - 62, by - 54); c.lineTo(cx, by - 42); c.lineTo(cx + 62, by - 54); c.lineTo(cx + 62, by - 14); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = "#f28a2e"; c.lineWidth = 3; c.lineCap = "round";
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(cx - 52, by - 46 + i * 11); c.lineTo(cx - 10, by - 36 + i * 11); c.moveTo(cx + 10, by - 36 + i * 11); c.lineTo(cx + 52, by - 46 + i * 11); c.stroke(); }
  c.font = `64px ${EMOJI}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#000"; c.fillText(fig.icone ?? "✝️", cx, y + h * 0.34);
}

// lugar: céu, colinas e o emoji grande
function cenaLugar(c, fig, x, y, w, h) {
  ceu(c, x, y, w, h, "#8fd8ff", "#e6f7ff"); nuvem(c, x + 40, y + 24, 22); nuvem(c, x + w - 36, y + 40, 16);
  c.fillStyle = "#7fcf4f"; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + h * 0.66); c.quadraticCurveTo(x + w * 0.3, y + h * 0.5, x + w * 0.6, y + h * 0.68); c.quadraticCurveTo(x + w * 0.85, y + h * 0.58, x + w, y + h * 0.66); c.lineTo(x + w, y + h); c.fill();
  chao(c, x, y + h - 26, w, 26, "#58c43a");
  c.font = `84px ${EMOJI}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#000"; c.fillText(fig.icone ?? "📍", x + w / 2, y + h * 0.52);
}

// pessoa de verdade: o boneco de bloco do jogo (retrato em cache de album-pessoas.js); sem ele ainda, reticências
function cenaPessoa(c, fig, x, y, w, h) {
  ceu(c, x, y, w, h, "#ffe9a8", "#ffd1e6"); chao(c, x, y + h - 26, w, 26, "#8fd35b");
  c.fillStyle = "rgba(0,0,0,0.15)"; c.beginPath(); c.ellipse(x + w / 2, y + h - 22, 40, 7, 0, 0, 7); c.fill();
  const r = retratos?.(fig.pessoa);
  if (r) { const k = (h - 6) / r.height; c.drawImage(r, x + (w - r.width * k) / 2, y + h - 16 - r.height * k + 10, r.width * k, r.height * k); }
  else texto(c, "…", x + w / 2, y + h / 2, w, 60, { cor: "#c9a9b8" });
}
const CENAS = { parceiros: cenaParceiro, amigos: (c, fig, ...r) => (fig.tipo === "pessoa" ? cenaPessoa(c, fig, ...r) : cenaAmigo(c, fig, ...r)), versiculos: cenaVersiculo, lugares: cenaLugar };

// a figurinha inteira: moldura da raridade, a cena, o nome e o subtítulo (@ do parceiro, a referência do versículo...)
export function desenharFigurinha(c, fig, { tem = true, w = TAMANHO.w, h = TAMANHO.h } = {}) {
  const R = RARIDADES[fig.raridade] ?? RARIDADES.comum;
  c.save(); c.scale(w / TAMANHO.w, h / TAMANHO.h); c.clearRect(0, 0, TAMANHO.w, TAMANHO.h);
  const W = TAMANHO.w, H = TAMANHO.h;
  const g = c.createLinearGradient(0, 0, W, H); const cor = tem ? R.cor : "#9aa0a7"; g.addColorStop(0, tem ? R.brilho : "#d5d9de"); g.addColorStop(0.5, cor); g.addColorStop(1, escurece(cor, 0.8));
  c.fillStyle = g; arredondado(c, 3, 3, W - 6, H - 6, 22); c.fill(); c.lineWidth = 5; c.strokeStyle = TINTA; c.stroke();
  c.fillStyle = tem ? "#fffaf0" : "#eceff2"; arredondado(c, 12, 12, W - 24, H - 24, 14); c.fill(); c.lineWidth = 3; c.stroke();
  // estrelinhas da raridade
  c.font = `800 15px ${FONTE}`; c.textAlign = "left"; c.textBaseline = "middle"; c.fillStyle = tem ? R.cor : "#9aa0a7";
  c.fillText("★".repeat(R.estrelas), 22, 28);
  c.textAlign = "right"; c.font = `800 13px ${FONTE}`; c.fillText(R.nome.toUpperCase(), W - 22, 28);
  // a cena
  const ax = 20, ay = 42, aw = W - 40, ah = 150;
  c.save(); arredondado(c, ax, ay, aw, ah, 10); c.clip();
  if (tem) CENAS[fig.pagina](c, fig, ax, ay, aw, ah);
  else { c.fillStyle = "#d9dde2"; c.fillRect(ax, ay, aw, ah); texto(c, "?", ax + aw / 2, ay + ah / 2, aw, 96, { cor: "#aab1b9" }); }
  c.restore(); c.lineWidth = 4; c.strokeStyle = TINTA; arredondado(c, ax, ay, aw, ah, 10); c.stroke();
  // nome e subtítulo
  const nome = tem || fig.pagina === "parceiros" || fig.pagina === "lugares" ? fig.nome : "Figurinha secreta";
  texto(c, nome, W / 2, 212, W - 40, 21, { cor: tem ? TINTA : "#7b838c" });
  if (tem) texto(c, fig.sub, W / 2, 238, W - 40, 14, { cor: "#5b6470", peso: 700 });
  else texto(c, fig.dica, W / 2, 238, W - 40, 13, { cor: "#7b838c", peso: 700 });
  c.restore();
}
