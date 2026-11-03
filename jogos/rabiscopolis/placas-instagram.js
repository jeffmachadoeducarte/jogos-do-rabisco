// Rabiscolândia: a placa do @ do Instagram na frente do prédio de cada parceira (src/parceiros.js).
// Mesma placa nas 12: moldura de blocos na cor da parceira, ícone do Instagram (desenhado em vetor) e o @ escuro em fundo claro.
// Cada uma fica numa faixa livre da fachada, na altura que a câmera da rua enxerga (sem cobrir letreiro, porta nem janela).
// Custo: todas usam UMA textura e UM material; a mesclagem de cada bloco junta a placa numa malha só, então cada placa na
// tela é no máximo uma chamada de desenho a mais. A moldura entra na malha de cores lisas do bloco (nenhuma chamada a mais).
//   placaInstagram(grupo, id): põe a placa no grupo do prédio (frente em z = 0, olhando para +z).

import { THREE, matNovo, texturaCanvas } from "./base3d.js";
import { cx as pc, escuro } from "./blocos.js";
import { PARCEIROS } from "../../src/parceiros.js";

const F = { sombra: false };
const FONTE = "'Baloo 2', 'Trebuchet MS', sans-serif";
const ESCURO = "#14161c", CLARO = "#fffbef";
const BORDA = 0.16, FUNDO = 0.2; // grossura da moldura e profundidade da caixa, em metros
const PX_M = 128, MARGEM = 8; // nitidez (pixels por metro) e folga entre as placas na textura

// por parceira: x, y (centro) e z (parede onde encosta) no prédio; w, h: área clara da placa; cor: moldura e etiqueta
const PLACAS = {
  "je-multimarcas": { x: 0, y: 3.73, z: 0.02, w: 9.6, h: 0.9, cor: 0xe8413c },
  "bella-cat": { x: 0, y: 4.05, z: 0.02, w: 7.6, h: 0.88, cor: 0xec2e8c },
  "rise-up": { x: 0, y: 3.6, z: 0.46, w: 7.3, h: 0.98, cor: 0xff7a00 },
  "crescente-contabilidade": { x: 0, y: 4.1, z: 0.22, w: 9.4, h: 0.76, cor: 0xd4a937 },
  "gala-presentes": { x: 0, y: 4.15, z: 0, w: 7.6, h: 0.92, cor: 0xc8234f },
  "see-love-joias": { x: 0, y: 4.45, z: 0.32, w: 8.2, h: 0.94, cor: 0xd9b35a },
  "bella-company": { x: 0, y: 4.265, z: 0.1, w: 8.6, h: 0.88, cor: 0x1f6fa8 },
  "marlon-maquinas": { x: -3.5, y: 5.135, z: 0.05, w: 7.6, h: 0.91, cor: 0x2e9e57 },
  "cafe-com-deus-pai-kids": { x: 0, y: 4.475, z: 0, w: 7.6, h: 0.92, cor: 0x3f9fd0 },
  "ballet-e-cia": { x: 0, y: 5.5, z: 0, w: 8.6, h: 0.98, cor: 0x7d1f4f },
  "bt-models": { x: 0, y: 5.85, z: 0, w: 7.6, h: 0.98, cor: 0xe7c35a },
  "speedy-solucoes": { x: 0, y: 4.43, z: 0.14, w: 8, h: 0.84, cor: 0x2f8fe8 },
};

// glifo do Instagram em vetor: quadrado de cantos redondos com degradê (amarelo embaixo à esquerda → rosa → roxo em cima à direita),
// contorno branco, círculo central só de contorno e o pontinho no canto de cima
function iconeInstagram(c, x, y, a) {
  const g = c.createLinearGradient(x, y + a, x + a, y);
  g.addColorStop(0, "#fdc830"); g.addColorStop(0.25, "#f7771c"); g.addColorStop(0.5, "#e1306c");
  g.addColorStop(0.75, "#c13584"); g.addColorStop(1, "#5851db");
  c.fillStyle = g;
  c.beginPath(); c.roundRect(x, y, a, a, a * 0.28); c.fill();
  c.strokeStyle = c.fillStyle = "#ffffff"; c.lineCap = "round";
  c.lineWidth = a * 0.075;
  const m = a * 0.14;
  c.beginPath(); c.roundRect(x + m, y + m, a - m * 2, a - m * 2, a * 0.2); c.stroke();
  c.beginPath(); c.arc(x + a / 2, y + a / 2, a * 0.2, 0, 7); c.stroke();
  c.beginPath(); c.arc(x + a * 0.73, y + a * 0.27, a * 0.05, 0, 7); c.fill();
}
// a fonte é o maior tamanho em que o @ cabe (na largura e na altura): nunca corta nem espreme
function medirTexto(c, t, largura, altura) {
  let px = Math.floor(altura), m;
  for (; px > 8; px--) {
    c.font = `800 ${px}px ${FONTE}`;
    m = c.measureText(t);
    if (m.width <= largura && m.actualBoundingBoxAscent + m.actualBoundingBoxDescent <= altura) break;
  }
  return { px, m };
}
// uma placa na textura, a partir de (x0, y0) em pixels. Devolve o tamanho da fonte e quanto o texto ocupou (para o teste)
function desenharPlaca(c, x0, y0, w, h, cor, arroba) {
  c.save();
  c.beginPath(); c.rect(x0, y0, w, h); c.clip();
  c.fillStyle = CLARO; c.fillRect(x0, y0, w, h);
  // o ícone do Instagram encostado na esquerda, bem grande; a cor da parceira fica na moldura de blocos
  const et = h * 1.08, ic = h * 0.88;
  iconeInstagram(c, x0 + (et - ic) / 2, y0 + (h - ic) / 2, ic);
  // o @, centrado no que sobra
  const folga = h * 0.2, area = w - et - folga * 2, alto = h * 0.84;
  const { px, m } = medirTexto(c, arroba, area, alto);
  const altura = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  c.textAlign = "left"; c.textBaseline = "alphabetic"; c.fillStyle = ESCURO;
  c.fillText(arroba, x0 + et + folga + (area - m.width) / 2, y0 + (h - altura) / 2 + m.actualBoundingBoxAscent);
  c.restore();
  return { px, largura: m.width, area };
}

// as 12 placas numa textura só, em prateleiras
const encaixe = new Map();
const larguraT = 2048; let alturaT = 0;
{
  let x = 0, y = 0, alto = 0;
  for (const p of PARCEIROS) {
    const P = PLACAS[p.id]; if (!P || !p.instagram) continue;
    const w = Math.round(P.w * PX_M), h = Math.round(P.h * PX_M);
    if (x + w + MARGEM > larguraT) { x = 0; y += alto + MARGEM; alto = 0; }
    encaixe.set(p.id, { x, y, w, h, cor: P.cor, arroba: `@${p.instagram}` });
    x += w + MARGEM; alto = Math.max(alto, h);
  }
  alturaT = y + alto;
}
export const medidasPlacas = {}; // id → { px, largura, area }: tamanho da fonte, largura do texto e largura disponível, em pixels
function desenharTudo(c) {
  c.clearRect(0, 0, larguraT, alturaT);
  for (const [id, e] of encaixe) medidasPlacas[id] = { arroba: e.arroba, ...desenharPlaca(c, e.x, e.y, e.w, e.h, e.cor, e.arroba) };
}
let material = null;
function materialPlacas() {
  if (material) return material;
  const t = texturaCanvas(larguraT, alturaT, (c) => desenharTudo(c), { anisotropia: 16 });
  // a fonte do jogo pode ainda estar chegando: quando chegar, redesenha tudo (o tamanho é medido de novo)
  document.fonts?.load?.(`800 64px 'Baloo 2'`).then(() => { desenharTudo(t.image.getContext("2d")); t.needsUpdate = true; }).catch(() => {});
  // brilha um pouco por conta própria: dá para ler na sombra do prédio e de noite. Sem reflexo, para o sol não lavar o texto
  material = matNovo({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.5, specular: 0x000000, shininess: 1 });
  return material;
}

export function placaInstagram(g, id) {
  const P = PLACAS[id], e = encaixe.get(id);
  if (!P || !e) return;
  const { x, y, z, w, h, cor } = P, zc = z + FUNDO / 2;
  // moldura de blocos, de canto em degrau; atrás, a sombra escura dá o destaque sobre qualquer parede
  pc(g, w + BORDA * 2, h + BORDA * 2 - 0.16, FUNDO, cor, x, y, zc, F);
  pc(g, w + BORDA * 2 - 0.16, h + BORDA * 2, FUNDO, cor, x, y, zc, F);
  pc(g, w + BORDA * 2 + 0.1, h + BORDA * 2 - 0.26, FUNDO * 0.6, escuro(cor, 0.62), x, y, z + FUNDO * 0.3, F);
  // a parte clara: um plano com o pedaço certo da textura (v da imagem é de baixo para cima)
  const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
  const u0 = e.x / larguraT, u1 = (e.x + e.w) / larguraT, v1 = 1 - e.y / alturaT, v0 = 1 - (e.y + e.h) / alturaT;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
  const m = new THREE.Mesh(geo, materialPlacas());
  m.position.set(x, y, z + FUNDO + 0.01); m.castShadow = false; m.receiveShadow = false;
  g.add(m);
}
