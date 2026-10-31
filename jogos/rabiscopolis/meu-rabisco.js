// Rabiscolândia: o "Meu Rabisco". A criança veste o Rabisco dela com peças trocáveis: mochila, fone, sapatos, calça e
// óculos de sol. Cada peça tem o "original" (o Rabisco de sempre, sem mexer em nada) e mais 4 opções (os óculos, 5),
// todas de graça. O corpo de lápis, a ponta, o rosto, a logo e as proporções nunca mudam, e as cores ficam na paleta
// do Rabisco (ciano, rosa, laranja, pele) mais branco e tinta.
//
// Como as peças entram no boneco (o mesmo jeito do capacete da moto e dos uniformes):
//  · mochila: a original é embrulhada num grupo (rabisco3d.js marca as peças em rb.partes) e some quando se escolhe outra;
//  · fone, sapatos e calça: a peça nova é um pouco MAIOR e cobre a original (como as galochas do roupas3d.js), então
//    nada precisa sumir e o original continua igualzinho, com o mesmo custo de desenho;
//  · óculos: não há original, só se acrescenta.
// Cada peça nova vai para a articulação certa (pe, quadril, joelho, tronco) e acompanha a animação. No jogo, cada uma
// é mesclada em poucas malhas (mesclar, de base3d.js), como os uniformes.
//
// Uniforme de profissão por cima: a peça do uniforme manda no mesmo lugar (botas de bombeiro escondem os sapatos
// escolhidos; os óculos redondos do professor e do veterinário escondem os de sol). O resto convive: capacete da moto,
// chapéus e jalecos cobrem a cabeça e o tronco, não o fone, a calça nem a mochila.
//
//   prepararRoupa(rb);  vestirPecas(rb, { mochila: "rosa", fone: "ciano" }, { juntar: true });  ajustarUniforme(rb);
//   escolhaSalva(salvo) → escolha válida (o que não existe volta para o original)

import { THREE, toon, comContorno } from "../../src/motor3d/toon.js";
import { mesclar } from "./base3d.js";

const G = THREE;
// cores do próprio Rabisco 3D (rabisco3d.js): assim a peça nova parece do mesmo desenho
const C = { ciano: 0x00bdff, rosa: 0xf14ba8, laranja: 0xff6400, pele: 0xffe5cf, branco: 0xffffff, tinta: 0x151515, escuro: 0x2a2a33 };

function pc(geo, cor, pai, { borda = 0.03, x = 0, y = 0, z = 0, extra } = {}) {
  const m = new G.Mesh(geo, toon(cor, extra));
  m.castShadow = true;
  if (borda) comContorno(m, borda);
  m.position.set(x, y, z);
  pai.add(m);
  return m;
}
// grupo preso ao tronco, com y na medida do corpo inteiro (igual ao roupas3d: 2,15 é a altura do tronco)
function noTronco(rb, y = 2.15) { const g = new G.Group(); g.position.y = y - 2.15; rb.tronco.add(g); return g; }
const linha = (pts, raio, cor, pai) => pc(new G.TubeGeometry(new G.CatmullRomCurve3(pts.map((p) => new G.Vector3(...p))), 32, raio, 8, false), cor, pai, { borda: 0 });
function retanguloRedondo(w, h, r) {
  const s = new G.Shape();
  s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
  return s;
}

// ---------------------------------------------------------------- mochilas (nas costas, como a original: z negativo)
// retangular: corpo, bolso da frente com zíper em arco, alça de mão e as duas alças em volta dos ombros
function mochilaRetangular(rb, { corpo, bolso, alca, detalhe = C.tinta }) {
  const g = noTronco(rb);
  const geo = new G.ExtrudeGeometry(retanguloRedondo(0.42, 0.72, 0.2), { depth: 0.24, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 });
  geo.center();
  pc(geo, corpo, g, { borda: 0.04, z: -0.72, y: 2.68 - 2.15 });
  const ZM = -0.925;
  const bgeo = new G.ExtrudeGeometry(retanguloRedondo(0.27, 0.2, 0.08), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 });
  const b = pc(bgeo, bolso, g, { borda: 0.035, z: ZM + 0.01, y: 2.48 - 2.15 });
  b.rotation.y = Math.PI;
  linha([[-0.17, 2.6 - 2.15, ZM - 0.075], [-0.08, 2.53 - 2.15, ZM - 0.08], [0, 2.51 - 2.15, ZM - 0.08], [0.08, 2.53 - 2.15, ZM - 0.08], [0.17, 2.6 - 2.15, ZM - 0.075]], 0.016, detalhe, g);
  linha([[-0.36, 3.12 - 2.15, ZM], [-0.18, 3.18 - 2.15, ZM - 0.01], [0, 3.2 - 2.15, ZM - 0.015], [0.18, 3.18 - 2.15, ZM - 0.01], [0.36, 3.12 - 2.15, ZM]], 0.014, detalhe, g);
  pc(new G.TorusGeometry(0.09, 0.025, 8, 20, Math.PI), alca, g, { borda: 0.012, z: -0.74, y: 3.47 - 2.15 });
  alcasDeOmbro(g, alca);
  return g;
}
// o mesmo laço da mochila original em volta de cada ombro (por fora da camiseta)
function alcasDeOmbro(g, cor) {
  for (const sx of [-1, 1]) {
    const R = 0.585;
    const p = (graus, y, r = R) => { const t = (graus * Math.PI) / 180; return new G.Vector3(sx * r * Math.sin(t), y - 2.15, r * Math.cos(t)); };
    const pts = [p(150, 3.3, 0.62), p(120, 3.5, 0.6), p(95, 3.58, 0.62), p(76, 3.48), p(70, 3.3), p(74, 3.12), p(92, 3.02), p(118, 2.94), p(146, 2.86, 0.62)];
    pc(new G.TubeGeometry(new G.CatmullRomCurve3(pts, false, "centripetal"), 64, 0.055, 10, false), cor, g, { borda: 0 });
  }
}
// gatinho: mochila clara com orelhas e carinha (a criança vê a carinha de costas)
function mochilaGatinho(rb) {
  const g = mochilaRetangular(rb, { corpo: C.branco, bolso: C.rosa, alca: C.rosa });
  const y = 3.5 - 2.15;
  for (const sx of [-1, 1]) {
    const orelha = pc(new G.ConeGeometry(0.15, 0.3, 4), C.branco, g, { borda: 0.03, x: sx * 0.27, y: y + 0.02, z: -0.72 });
    orelha.rotation.z = -sx * 0.18;
    const dentro = pc(new G.ConeGeometry(0.08, 0.17, 4), C.rosa, g, { borda: 0, x: sx * 0.27, y: y - 0.02, z: -0.8 });
    dentro.rotation.z = -sx * 0.18;
  }
  // carinha no alto das costas (acima do bolso rosa): olhos, focinho e bigodes
  const ZR = -0.972;
  for (const sx of [-1, 1]) pc(new G.SphereGeometry(0.05, 12, 8), C.tinta, g, { borda: 0, x: sx * 0.16, y: 2.98 - 2.15, z: ZR });
  pc(new G.SphereGeometry(0.045, 10, 8), C.rosa, g, { borda: 0, y: 2.88 - 2.15, z: ZR - 0.005 });
  for (const sx of [-1, 1]) for (const dy of [0.015, -0.035]) linha([[sx * 0.1, 2.87 - 2.15 + dy, ZR], [sx * 0.34, 2.87 - 2.15 + dy * 2.4, ZR + 0.01]], 0.009, C.tinta, g);
  return g;
}
// capa de herói: pano rosa nas costas, preso nos ombros por dois botões, com a barra laranja
function mochilaCapa(rb) {
  const g = noTronco(rb);
  const yTopo = 3.42, yBaixo = 1.95, len = 1.9;
  const geo = new G.CylinderGeometry(0.62, 0.76, yTopo - yBaixo, 24, 1, true, Math.PI - len / 2, len);
  const m = new G.Mesh(geo, toon(C.rosa, { side: G.DoubleSide }));
  m.castShadow = true; comContorno(m, 0.03);
  m.position.y = (yTopo + yBaixo) / 2 - 2.15; g.add(m);
  // barra laranja na ponta de baixo
  const a0 = Math.PI - len / 2;
  const barra = [];
  for (let i = 0; i <= 14; i++) { const a = a0 + (len * i) / 14; barra.push([0.76 * Math.sin(a) * 1.005, yBaixo - 2.15, 0.76 * Math.cos(a) * 1.005]); }
  linha(barra, 0.035, C.laranja, g);
  // botões nos ombros e gola
  for (const sx of [-1, 1]) pc(new G.SphereGeometry(0.075, 14, 10), C.laranja, g, { borda: 0.02, x: sx * 0.5, y: yTopo - 2.15 + 0.04, z: -0.3 });
  return g;
}

// ---------------------------------------------------------------- fones (cobrem o original: conchas e haste um pouco maiores)
function fone(rb, { concha, almofada, tampa, haste, raio = 0.2, bola = false, aro = null }) {
  const g = noTronco(rb, 4.09);
  for (const s of [-1, 1]) {
    if (bola) {
      const b = pc(new G.SphereGeometry(raio + 0.03, 24, 16), concha, g, { borda: 0.03, x: s * 0.6 });
      b.scale.x = 0.78;
    } else {
      const c = pc(new G.CylinderGeometry(raio, raio, 0.21, 28), concha, g, { borda: 0.03, x: s * 0.59 });
      c.rotation.z = Math.PI / 2;
    }
    const a = pc(new G.CylinderGeometry(raio * 0.72, raio * 0.72, 0.06, 24), almofada, g, { borda: 0.015, x: s * (bola ? 0.5 : 0.49) });
    a.rotation.z = Math.PI / 2;
    const t = pc(new G.CylinderGeometry(raio * 0.5, raio * 0.5, 0.04, 20), tampa, g, { borda: 0.01, x: s * (bola ? 0.7 : 0.7) });
    t.rotation.z = Math.PI / 2;
    if (aro != null) {
      const r = pc(new G.TorusGeometry(raio * 0.78, 0.022, 8, 28), aro, g, { borda: 0, x: s * 0.705 });
      r.rotation.y = Math.PI / 2;
    }
  }
  // haste: o mesmo caminho da original (por trás da cabeça), só um pouco mais grossa
  const caminho = new G.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => {
    const a = (i / 12) * Math.PI;
    return new G.Vector3(0.56 * Math.cos(a), -0.24 * Math.sin(a), -0.56 * Math.sin(a));
  }));
  pc(new G.TubeGeometry(caminho, 48, 0.06, 10, false), haste, g, { borda: 0 });
  return g;
}

// ---------------------------------------------------------------- sapatos (cobrem o tênis original, um pouco maiores)
function tenis(rb, { cabedal, biqueira, sola, cadarco, cano = 0, faixa = null }) {
  const grupos = [];
  for (const perna of [rb.pernaE, rb.pernaD]) {
    const g = new G.Group();
    perna.pe.add(g);
    grupos.push(g);
    const elipse = (sx, sy, sz, cor, x, y, z, borda = 0.03) => { const m = pc(new G.SphereGeometry(1, 28, 18), cor, g, { borda, x, y, z }); m.scale.set(sx, sy, sz); return m; };
    elipse(0.335, 0.11, 0.57, sola, 0, -0.66, 0.08);          // sola
    elipse(0.31, 0.275, 0.53, cabedal, 0, -0.49, 0.06);       // cabedal (cobre o tênis original)
    if (biqueira != null) elipse(0.285, 0.18, 0.24, biqueira, 0, -0.56, 0.38, 0.025);
    // cano baixo que cobre a gola do original (e a barra da calça, que entra por dentro)
    const base = -0.55, topo = -0.15 + cano;
    pc(new G.CylinderGeometry(0.235, 0.24, topo - base, 24), cabedal, g, { borda: 0.03, y: (topo + base) / 2 });
    if (faixa != null) pc(new G.CylinderGeometry(0.245, 0.245, 0.07, 24), faixa, g, { borda: 0, y: topo - 0.1 });
    for (let i = 0; i < 3; i++) {
      const c = pc(new G.CapsuleGeometry(0.035, 0.28, 4, 8), cadarco, g, { borda: 0.02, y: -0.25 - i * 0.05, z: 0.14 + i * 0.08 });
      c.rotation.z = Math.PI / 2; c.rotation.x = -0.5;
    }
  }
  return grupos;
}

// ---------------------------------------------------------------- calças (cobrem a bermuda original; a barra nunca fica mais fina que ela)
// bermuda: o mesmo desenho da original, numa cor nova. Calça: coxa larga, afina no joelho e vai até o sapato.
function calca(rb, { cor, barra, comprida = false }) {
  const grupos = [];
  const gc = new G.Group();
  rb.corpo.add(gc);
  const cintura = pc(new G.CylinderGeometry(0.575, 0.585, 0.46, 40), cor, gc, { borda: 0.03, y: 2.1, z: -0.06 });
  cintura.scale.z = 0.62;
  grupos.push(gc);
  for (const perna of [rb.pernaE, rb.pernaD]) {
    const g = new G.Group();
    perna.quadril.add(g);
    grupos.push(g);
    if (!comprida) {
      const c = pc(new G.CylinderGeometry(0.31, 0.335, 0.62, 28), cor, g, { borda: 0.03, y: -0.26 });
      c.scale.z = 1.15;
      const b = pc(new G.TorusGeometry(0.335, 0.02, 6, 32), C.tinta, g, { borda: 0, y: -0.57 });
      b.rotation.x = Math.PI / 2; b.scale.y = 1.15;
      continue;
    }
    // coxa (cobre a bermuda) e depois afina até o joelho
    const coxa = pc(new G.CylinderGeometry(0.31, 0.335, 0.62, 28), cor, g, { borda: 0.03, y: -0.26 });
    coxa.scale.z = 1.15;
    const afina = pc(new G.CylinderGeometry(0.335, 0.215, 0.3, 28), cor, g, { borda: 0.03, y: -0.72 });
    afina.scale.z = 1.12;
    // canela: grupo no joelho (dobra junto)
    const gj = new G.Group();
    perna.joelho.add(gj);
    grupos.push(gj);
    pc(new G.SphereGeometry(0.225, 18, 12), cor, gj, { borda: 0.025 }).scale.z = 1.1;
    pc(new G.CylinderGeometry(0.215, 0.2, 0.62, 24), cor, gj, { borda: 0.03, y: -0.31 });
    const bainha = pc(new G.TorusGeometry(0.205, 0.04, 8, 24), barra, gj, { borda: 0.015, y: -0.63 });
    bainha.rotation.x = Math.PI / 2;
  }
  return grupos;
}

// ---------------------------------------------------------------- óculos de sol (só se acrescentam; os olhos ficam à vista pelas lentes escuras)
const LENTES = [-0.62, 0.47]; // ângulo de cada olho em volta da cabeça (o mesmo do roupas3d.js)
function formaCoracao() {
  const s = new G.Shape();
  s.moveTo(0, -0.2); s.bezierCurveTo(-0.34, 0.02, -0.26, 0.26, -0.1, 0.24); s.bezierCurveTo(-0.04, 0.23, 0, 0.18, 0, 0.14);
  s.bezierCurveTo(0, 0.18, 0.04, 0.23, 0.1, 0.24); s.bezierCurveTo(0.26, 0.26, 0.34, 0.02, 0, -0.2);
  return s;
}
function formaEstrela(r = 0.25) {
  const s = new G.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, k = i % 2 ? r * 0.48 : r; s[i ? "lineTo" : "moveTo"](Math.cos(a) * k, Math.sin(a) * k); }
  s.closePath();
  return s;
}
function oculos(rb, { forma, aro, brilho = true, ponte = aro }) {
  const g = noTronco(rb, 4.13);
  for (const a of LENTES) {
    const p = new G.Group(); p.rotation.y = a; g.add(p);
    const l = forma();
    p.add(l);
    l.position.z = 0.64;
    if (brilho) {
      const b = new G.Mesh(new G.CircleGeometry(0.035, 10), new G.MeshBasicMaterial({ color: 0xffffff }));
      b.position.set(-0.09, 0.09, 0.69); p.add(b);
    }
  }
  const R = 0.66;
  const ponto = (a, y = 0) => [Math.sin(a) * R, y, Math.cos(a) * R];
  linha([ponto(LENTES[0] + 0.3, 0.05), ponto((LENTES[0] + LENTES[1]) / 2, 0.09), ponto(LENTES[1] - 0.3, 0.05)], 0.028, ponte, g);
  linha([ponto(LENTES[0] - 0.3), [-0.62, 0, 0.2], [-0.6, -0.04, 0]], 0.026, aro, g);
  linha([ponto(LENTES[1] + 0.3), [0.62, 0, 0.2], [0.6, -0.04, 0]], 0.026, aro, g);
  return g;
}
// lente com aro: oval ou redonda (cilindro achatado + toro)
function lenteOval(cor, aro, { r = 0.22, esticar = 1.2 } = {}) {
  const g = new G.Group();
  const l = pc(new G.CylinderGeometry(r, r, 0.04, 28), cor, g, { borda: 0 });
  l.rotation.x = Math.PI / 2; l.scale.z = esticar;
  const t = pc(new G.TorusGeometry(r + 0.005, 0.035, 8, 28), aro, g, { borda: 0, z: 0.02 });
  t.scale.y = esticar;
  return g;
}
// lente em forma de coração ou estrela: placa extrudada com borda
function lenteForma(forma, cor, aro, escala = 1) {
  const g = new G.Group();
  const geo = new G.ExtrudeGeometry(forma, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 2 });
  geo.translate(0, 0, -0.03);
  const l = pc(geo, cor, g, { borda: 0 });
  l.scale.setScalar(escala);
  const contorno = pc(geo, aro, g, { borda: 0 });
  contorno.scale.set(escala * 1.12, escala * 1.12, 0.6);
  contorno.position.z = -0.012;
  return g;
}
function lenteRetangular(cor, aro) {
  const g = new G.Group();
  const geo = new G.ExtrudeGeometry(retanguloRedondo(0.23, 0.15, 0.07), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.02, bevelSegments: 2 });
  geo.translate(0, 0, -0.03);
  pc(geo, cor, g, { borda: 0 });
  const af = pc(geo, aro, g, { borda: 0 });
  af.scale.set(1.14, 1.2, 0.6); af.position.z = -0.012;
  return g;
}

// ---------------------------------------------------------------- o catálogo
// amostra: as cores que aparecem no botãozinho da tela Meu Rabisco
export const PECAS = {
  mochila: { nome: "Mochila", icone: "🎒", original: "original", dica: "Veja de costas!", opcoes: [
    { id: "original", nome: "Original", amostra: [C.laranja, C.laranja] },
    { id: "rosa", nome: "Rosa", amostra: [C.rosa, C.laranja], monta: (rb) => [mochilaRetangular(rb, { corpo: C.rosa, bolso: C.laranja, alca: C.laranja })] },
    { id: "ciano", nome: "Ciano", amostra: [C.ciano, C.rosa], monta: (rb) => [mochilaRetangular(rb, { corpo: C.ciano, bolso: C.rosa, alca: C.rosa })] },
    { id: "gatinho", nome: "Gatinho", amostra: [C.branco, C.rosa], monta: (rb) => [mochilaGatinho(rb)] },
    { id: "capa", nome: "Capa de herói", amostra: [C.rosa, C.laranja], monta: (rb) => [mochilaCapa(rb)] },
  ] },
  fone: { nome: "Fone", icone: "🎧", original: "original", dica: "Escolha a cor do fone", opcoes: [
    { id: "original", nome: "Original", amostra: [C.rosa, C.ciano] },
    { id: "ciano", nome: "Ciano", amostra: [C.ciano, C.rosa], monta: (rb) => [fone(rb, { concha: C.ciano, almofada: C.rosa, tampa: C.branco, haste: C.ciano })] },
    { id: "laranja", nome: "Laranja", amostra: [C.laranja, C.ciano], monta: (rb) => [fone(rb, { concha: C.laranja, almofada: C.ciano, tampa: C.branco, haste: C.laranja })] },
    { id: "fofinho", nome: "Fofinho", amostra: [C.branco, C.rosa], monta: (rb) => [fone(rb, { concha: C.branco, almofada: C.rosa, tampa: C.rosa, haste: C.rosa, raio: 0.2, bola: true })] },
    { id: "gamer", nome: "Gamer", amostra: [C.escuro, C.rosa], monta: (rb) => [fone(rb, { concha: C.escuro, almofada: C.rosa, tampa: C.escuro, haste: C.escuro, aro: C.ciano })] },
  ] },
  sapatos: { nome: "Sapatos", icone: "👟", original: "original", dica: "Escolha o par", opcoes: [
    { id: "original", nome: "Original", amostra: [C.ciano, C.rosa] },
    { id: "rosa", nome: "Tênis rosa", amostra: [C.rosa, C.ciano], monta: (rb) => tenis(rb, { cabedal: C.rosa, biqueira: C.branco, sola: C.ciano, cadarco: C.branco }) },
    { id: "laranja", nome: "Tênis laranja", amostra: [C.laranja, C.branco], monta: (rb) => tenis(rb, { cabedal: C.laranja, biqueira: C.branco, sola: C.escuro, cadarco: C.branco }) },
    { id: "branco", nome: "Tênis branco", amostra: [C.branco, C.rosa], monta: (rb) => tenis(rb, { cabedal: C.branco, biqueira: C.ciano, sola: C.rosa, cadarco: C.laranja }) },
    { id: "bota", nome: "Bota de chuva", amostra: [C.laranja, C.escuro], monta: (rb) => tenis(rb, { cabedal: C.laranja, biqueira: null, sola: C.escuro, cadarco: C.laranja, cano: 0.28, faixa: C.branco }) },
  ] },
  calca: { nome: "Calça", icone: "👖", original: "original", dica: "Bermuda ou calça comprida", opcoes: [
    { id: "original", nome: "Bermuda original", amostra: [C.rosa, C.rosa] },
    { id: "bermuda-laranja", nome: "Bermuda laranja", amostra: [C.laranja, C.escuro], monta: (rb) => calca(rb, { cor: C.laranja, barra: C.tinta }) },
    { id: "calca-rosa", nome: "Calça rosa", amostra: [C.rosa, C.branco], monta: (rb) => calca(rb, { cor: C.rosa, barra: C.branco, comprida: true }) },
    { id: "calca-laranja", nome: "Calça laranja", amostra: [C.laranja, C.tinta], monta: (rb) => calca(rb, { cor: C.laranja, barra: C.tinta, comprida: true }) },
    { id: "calca-preta", nome: "Calça escura", amostra: [C.escuro, C.rosa], monta: (rb) => calca(rb, { cor: C.escuro, barra: C.rosa, comprida: true }) },
  ] },
  oculos: { nome: "Óculos de sol", icone: "🕶️", original: "nenhum", dica: "Nenhum é o jeito de sempre", opcoes: [
    { id: "nenhum", nome: "Sem óculos", amostra: [C.pele, C.pele] },
    { id: "preto", nome: "Pretinho", amostra: [C.tinta, C.rosa], monta: (rb) => [oculos(rb, { forma: () => lenteRetangular(0x1d2633, C.rosa), aro: C.rosa })] },
    { id: "redondo", nome: "Redondo", amostra: [0x1d2633, C.laranja], monta: (rb) => [oculos(rb, { forma: () => lenteOval(0x1d2633, C.laranja, { r: 0.21, esticar: 1.05 }), aro: C.laranja })] },
    { id: "coracao", nome: "Coração", amostra: [C.rosa, C.tinta], monta: (rb) => [oculos(rb, { forma: () => lenteForma(formaCoracao(), C.rosa, C.tinta, 1.05), aro: C.tinta, ponte: C.tinta, brilho: false })] },
    { id: "estrela", nome: "Estrela", amostra: [C.laranja, C.tinta], monta: (rb) => [oculos(rb, { forma: () => lenteForma(formaEstrela(0.26), C.laranja, C.tinta, 1), aro: C.tinta, ponte: C.tinta, brilho: false })] },
    { id: "espelhado", nome: "Espelhado", amostra: [0x8ee8ff, C.rosa], monta: (rb) => [oculos(rb, { forma: () => lenteOval(0x8ee8ff, C.rosa, { r: 0.22, esticar: 1.25 }), aro: C.rosa })] },
  ] },
};
export const ORDEM = ["mochila", "fone", "sapatos", "calca", "oculos"];
export const ESCOLHA_PADRAO = Object.freeze(Object.fromEntries(ORDEM.map((s) => [s, PECAS[s].original])));

// sem opção inventada: o que não existe (ou veio de uma versão antiga) volta para o original
export function escolhaSalva(salvo) {
  const e = { ...ESCOLHA_PADRAO };
  for (const s of ORDEM) { const v = salvo?.meuRabisco?.[s]; if (PECAS[s].opcoes.some((o) => o.id === v)) e[s] = v; }
  return e;
}

// ---------------------------------------------------------------- vestir no boneco
// Antes do primeiro mesclar: embrulha a mochila original (rabisco3d.js marca em rb.partes) num grupo para poder escondê-la.
// Devolve o grupo (entra no `juntas` do mesclar: a mochila fica em malhas próprias, que dá para esconder depois).
export function prepararRoupa(rb) {
  rb.rp = { atual: { ...ESCOLHA_PADRAO }, grupos: {}, mochila: null };
  const partes = rb.partes?.mochila ?? [];
  if (!partes.length) return null;
  const g = new G.Group();
  rb.tronco.add(g);
  for (const m of partes) g.add(m);
  rb.rp.mochila = g;
  return g;
}
function soltar(grupos) {
  for (const g of grupos) { g.removeFromParent(); g.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); }
}
// aplica a escolha (só mexe no que mudou). juntar: mescla cada peça nova em poucas malhas (o jogo); sem isso as peças ficam
// soltas (a prévia da tela Meu Rabisco, que não tem pressa)
export function vestirPecas(rb, escolha, { juntar = false } = {}) {
  if (!rb.rp) prepararRoupa(rb);
  for (const slot of ORDEM) {
    const id = escolha?.[slot] ?? ESCOLHA_PADRAO[slot];
    if (rb.rp.atual[slot] === id) continue;
    soltar(rb.rp.grupos[slot] ?? []); delete rb.rp.grupos[slot];
    const op = PECAS[slot].opcoes.find((o) => o.id === id);
    if (!op) continue;
    if (op.monta) {
      const gs = op.monta(rb);
      rb.rp.grupos[slot] = gs;
      if (juntar) for (const g of gs) mesclar(g);
    }
    rb.rp.atual[slot] = id;
  }
  if (rb.rp.mochila) rb.rp.mochila.visible = rb.rp.atual.mochila === "original";
  ajustarUniforme(rb);
}
// uniforme de profissão por cima: botas escondem os sapatos escolhidos; óculos do uniforme escondem os de sol
export function ajustarUniforme(rb) {
  if (!rb.rp) return;
  const botas = Boolean(rb.roupas?.pes);
  const rosto = Boolean(rb.roupas?.rosto || rb.roupasRP?.rosto);
  for (const g of rb.rp.grupos.sapatos ?? []) g.visible = !botas;
  for (const g of rb.rp.grupos.oculos ?? []) g.visible = !rosto;
}
export const escolhaAtual = (rb) => ({ ...(rb.rp?.atual ?? ESCOLHA_PADRAO) });
