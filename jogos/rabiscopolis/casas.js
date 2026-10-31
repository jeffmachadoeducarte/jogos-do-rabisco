// Rabiscolândia: as casas do Bairro das Casas. Cada lote tem gramado, cerquinha branca com portão, caminho de
// pedras, caixa de correio, placa na frente (vira "Casa da/do {nome}" quando a criança escolhe morar ali),
// e a casa de blocos: paredes, telhado em degraus (três modelos, pelo número do lote), chaminé, toldo e degraus,
// janelas com moldura, venezianas e floreira, janela no sótão e lampião que acende de noite.
// Frente do lote em z = 0 (local), olhando para +z; o lote vai até z = -LOTE.d.

import { THREE, matNovo, mat, MAT, placa, arvoreReal } from "./base3d.js";
import { cx, claro, degraus, telhadoDegraus, frontaoDegraus } from "./blocos.js";
import { LOTE } from "./mapa.js";

const BRANCO = 0xfffdf6, f = { sombra: false };
// cerquinha de ripas com ponta em degrau (só caixas: entra na mesclagem)
export function cerquinha(comprimento, { cor = BRANCO, altura = 1.05 } = {}) {
  const g = new THREE.Group();
  g.userData.detalhe = true;
  for (const y of [0.35, 0.78]) cx(g, comprimento, 0.12, 0.08, cor, comprimento / 2, y * (altura / 1.05), -0.06, f);
  const n = Math.max(2, Math.round(comprimento / 0.6));
  for (let i = 0; i <= n; i++) {
    const x = (comprimento * i) / n;
    cx(g, 0.22, altura, 0.09, cor, x, altura / 2, 0, f);
    cx(g, 0.11, 0.12, 0.09, cor, x, altura + 0.06, 0, f);
  }
  return g;
}
function janela(w, h, corVeneziana) {
  const g = new THREE.Group();
  cx(g, w + 0.36, h + 0.36, 0.18, BRANCO, 0, 0, 0);
  cx(g, w, h, 0.14, 0, 0, 0, 0.08, { ...f, material: MAT.janela });
  cx(g, 0.09, h, 0.08, BRANCO, 0, 0, 0.16, f); cx(g, w, 0.09, 0.08, BRANCO, 0, 0, 0.16, f);
  for (const s of [-1, 1]) {
    cx(g, w * 0.42, h + 0.2, 0.1, corVeneziana, s * (w / 2 + 0.42), 0, 0.03);
    for (let i = 0; i < 3; i++) cx(g, w * 0.36, 0.06, 0.04, claro(corVeneziana, 0.22), s * (w / 2 + 0.42), -h * 0.3 + i * h * 0.3, 0.09, f);
  }
  // floreira com florzinhas (some de longe)
  cx(g, w + 0.5, 0.32, 0.46, 0xb85c28, 0, -h / 2 - 0.36, 0.24);
  const flores = new THREE.Group(); flores.userData.detalhe = true; g.add(flores);
  [0xff4fa0, 0xffcc1f, 0xffffff, 0xff7a3d, 0xb08cff].forEach((c, i) => { const x = -w / 2 + 0.05 + (i * (w - 0.1)) / 4; cx(flores, 0.26, 0.2, 0.26, 0x3fae4a, x, -h / 2 - 0.13, 0.26, f); cx(flores, 0.22, 0.22, 0.22, c, x + 0.04, -h / 2 + 0.04, 0.3, f); });
  return g;
}
// placa de madeira na frente do lote (a textura troca quando a criança escolhe a casa)
function placaLote(texto) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) cx(g, 0.14, 1.5, 0.14, 0x6b4a2f, s * 0.75, 0.75, 0);
  cx(g, 1.95, 0.84, 0.12, 0xf3c99a, 0, 1.35, 0);
  const matTexto = matNovo({ map: placa(texto, { cor: "#ec2e8c", fundo: "#fff6e3", w: 512, h: 200 }) });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 0.7), matTexto); face.position.set(0, 1.35, 0.075); g.add(face);
  face.userData.dinamico = true;
  g.userData = { definir(t, cor = "#ec2e8c") { matTexto.map.dispose(); matTexto.map = placa(t, { cor, fundo: "#fff6e3", w: 512, h: 200 }); matTexto.needsUpdate = true; } };
  return g;
}

// casa do lote (cor/telhado do mapa). Devolve o grupo e as colisões em coordenadas locais.
export function casa(lote) {
  const g = new THREE.Group();
  const solidos = [];
  const sol = (x0, x1, z0, z1, y1) => solidos.push({ x0, x1, z0, z1, y1 });
  const W = LOTE.w, D = LOTE.d;
  const modelo = lote.numero % 3;
  // caminho de placas até a porta
  for (let i = 0; i < 4; i++) cx(g, 1.1, 0.1, 0.8, 0xdcd8cf, i % 2 ? 0.28 : -0.28, 0.07, -0.7 - i * 0.95, { ...f, detalhe: true });
  // cerquinha na frente com portão aberto no meio, e cerca viva de cubos dos lados
  const vao = 2.4;
  for (const s of [-1, 1]) {
    const c = cerquinha(W / 2 - vao / 2 - 0.2); c.position.set(s < 0 ? -W / 2 + 0.1 : vao / 2 + 0.1, 0.03, -0.3); g.add(c);
    sol(s < 0 ? -W / 2 : vao / 2, s < 0 ? -vao / 2 : W / 2, -0.45, -0.15, 1.2);
    for (let z = -1.8, i = 0; z > -D + 1.5; z -= 2.2, i++) cx(g, 1.3, 1.1 + (i % 3) * 0.22, 1.9, i % 2 ? 0x35b83a : 0x42c92d, s * (W / 2 - 0.5), 0.6, z, { ...f, detalhe: true });
    sol(s * (W / 2 - 0.45) - 0.45, s * (W / 2 - 0.45) + 0.45, -D + 0.3, -0.9, 1.1);
  }
  // casa
  const CW = 9, CH = 4.3, CD = 8, Z0 = -4.2; // frente da casa em z = Z0
  const zc = Z0 - CD / 2;
  // paredes num grupo à parte (mesclado sozinho): dá para trocar a cor da casa por fora sem remontar o bairro
  const paredes = new THREE.Group(); paredes.userData = { dinamico: true, cor: lote.hex }; g.add(paredes);
  cx(paredes, CW, CH, CD, lote.hex, 0, CH / 2 + 0.05, zc);
  cx(paredes, CW + 0.16, 0.5, CD + 0.16, new THREE.Color(lote.hex).multiplyScalar(0.75).getHex(), 0, 0.3, zc);
  sol(-CW / 2, CW / 2, Z0 - CD, Z0, 9);
  // cantoneiras brancas na frente
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) cx(g, i % 2 ? 0.4 : 0.66, 0.5, 0.1, BRANCO, s * (CW / 2 - (i % 2 ? 0.2 : 0.33)), 1.0 + i * 1.15, Z0 + 0.03, f);
  if (modelo === 1) { // telhado de quatro águas em degraus, sem frontão; lucarna na frente
    const t = new THREE.Mesh(degraus(CW + 1.3, CD + 1.3, 2.7, 5, { fim: 0.3 }), mat(lote.telhado)); t.castShadow = t.receiveShadow = true; t.position.set(0, CH + 1.4, zc); g.add(t);
    cx(paredes, 2.2, 1.4, 1.2, lote.hex, 0, CH + 1.1, Z0 - 0.7); cx(g, 2.7, 0.3, 1.7, lote.telhado, 0, CH + 1.95, Z0 - 0.7);
    cx(g, 1.3, 0.9, 0.2, BRANCO, 0, CH + 1.05, Z0 - 0.06, f); cx(g, 1.0, 0.65, 0.2, 0, 0, CH + 1.05, Z0 - 0.01, { ...f, material: MAT.janelaQuente });
  } else { // duas águas em degraus; o modelo 2 tem a cumeeira virada e um telhadinho na frente
    telhadoDegraus(g, CW, CD, lote.telhado, CH + 0.05, zc, { camadas: 5, alt: 0.62, beiral: 0.6 });
    frontaoDegraus(paredes, CW - 0.2, lote.hex, CH + 0.05, Z0 - 0.15, { camadas: 4, alt: 0.62 });
    cx(g, 1.05, 1.05, 0.2, BRANCO, 0, CH + 1.25, Z0 + 0.1, f); cx(g, 0.76, 0.76, 0.16, 0, 0, CH + 1.25, Z0 + 0.2, { ...f, material: MAT.janelaQuente });
    if (modelo === 2) { cx(g, 3.2, 0.3, 1.5, claro(lote.telhado, 0.12), 0, 3.85, Z0 + 0.7); cx(g, 2.5, 0.28, 1.1, lote.telhado, 0, 4.12, Z0 + 0.5, f); }
  }
  // chaminé com tampa e tijolinhos
  cx(g, 1.0, 2.2, 1.0, 0xc8553a, 2.6, CH + 2.3, Z0 - CD + 2.2); cx(g, 1.3, 0.3, 1.3, BRANCO, 2.6, CH + 3.55, Z0 - CD + 2.2);
  for (let i = 0; i < 2; i++) cx(g, 0.5, 0.14, 1.04, 0xa7432c, 2.6 + (i ? 0.2 : -0.2), CH + 2.1 + i * 0.5, Z0 - CD + 2.2, f);
  // porta com moldura, maçaneta, toldo e degraus
  const corPorta = new THREE.Color(lote.telhado).multiplyScalar(0.85).getHex();
  cx(g, 2.2, 3.2, 0.2, BRANCO, 0, 1.65, Z0 + 0.02); cx(g, 1.6, 2.9, 0.2, corPorta, 0, 1.5, Z0 + 0.1);
  for (const y of [0.9, 2.1]) cx(g, 1.1, 0.8, 0.08, claro(corPorta, 0.2), 0, y, Z0 + 0.22, f);
  cx(g, 0.2, 0.2, 0.2, 0xffcc1f, 0.56, 1.5, Z0 + 0.3, f);
  if (modelo !== 2) { cx(g, 2.9, 0.4, 1.3, lote.telhado, 0, 3.4, Z0 + 0.6); cx(g, 2.5, 0.16, 0.9, claro(lote.telhado, 0.2), 0, 3.66, Z0 + 0.5, f); }
  for (let i = 0; i < 2; i++) cx(g, 2.8 - i * 0.5, 0.22, 1.0 - i * 0.35, 0xe3ddd0, 0, 0.14 + i * 0.22, Z0 + 0.55 - i * 0.2, f);
  // lampião ao lado da porta
  cx(g, 0.4, 0.5, 0.35, 0, -1.55, 2.8, Z0 + 0.3, { ...f, material: MAT.lampada }); cx(g, 0.5, 0.12, 0.45, 0x2f3440, -1.55, 3.1, Z0 + 0.3, f);
  // janelas da frente e dos lados
  for (const s of [-1, 1]) { const j = janela(1.5, 1.35, lote.telhado); j.position.set(s * 2.95, 2.5, Z0 + 0.06); g.add(j); }
  for (const s of [-1, 1]) { const j = janela(1.3, 1.2, lote.telhado); j.position.set(s * (CW / 2 + 0.05), 2.5, zc); j.rotation.y = s * Math.PI / 2; g.add(j); }
  // caixa de correio no portão
  cx(g, 0.14, 1.1, 0.14, 0x6b4a2f, 1.65, 0.55, 0.15); cx(g, 0.5, 0.45, 0.8, lote.telhado, 1.65, 1.25, 0.15); cx(g, 0.05, 0.34, 0.12, 0xe8413c, 1.95, 1.45, 0.1, f);
  sol(1.4, 1.9, -0.1, 0.5, 1.5);
  // placa do lote
  const pl = placaLote(`Casa ${lote.numero}`); pl.position.set(-2.4, 0.03, 0.2); g.add(pl);
  sol(-3.25, -1.55, 0.1, 0.3, 2);
  // árvore no quintal e moitas de cubos na frente da casa
  const arv = arvoreReal(0.75, lote.numero); arv.position.set(lote.numero % 2 ? 4.8 : -4.8, 0.03, -D + 3); g.add(arv);
  sol(arv.position.x - 0.4, arv.position.x + 0.4, -D + 2.6, -D + 3.4, 6);
  for (const s of [-1, 1]) { cx(g, 1.4, 0.9, 1.2, 0x42c92d, s * 4.9, 0.5, Z0 + 0.8, { ...f, detalhe: true }); cx(g, 0.5, 0.4, 0.5, 0xff6fb0, s * 4.7, 1.05, Z0 + 0.8, { ...f, detalhe: true }); }
  g.userData.placa = pl;
  g.userData.paredes = paredes;
  g.userData.porta = [0, Z0 + 1.2]; // onde o Rabisco fica para "Morar aqui?"
  return { grupo: g, solidos };
}
// troca a cor das paredes já mescladas (cor por vértice): parede e frontão na cor nova, rodapé um tom abaixo
export function recolorirParedes(paredes, novaHex) {
  const de = new THREE.Color(paredes.userData.cor), deR = new THREE.Color(new THREE.Color(paredes.userData.cor).multiplyScalar(0.75).getHex());
  const para = new THREE.Color(novaHex), paraR = new THREE.Color(new THREE.Color(novaHex).multiplyScalar(0.75).getHex());
  const perto = (a, r, g, b) => Math.abs(a.r - r) + Math.abs(a.g - g) + Math.abs(a.b - b) < 0.03;
  paredes.traverse((m) => {
    const c = m.isMesh && m.geometry.attributes.color; if (!c) return;
    for (let i = 0; i < c.count; i++) {
      const r = c.getX(i), g2 = c.getY(i), b = c.getZ(i);
      if (perto(de, r, g2, b)) c.setXYZ(i, para.r, para.g, para.b); else if (perto(deR, r, g2, b)) c.setXYZ(i, paraR.r, paraR.g, paraR.b);
    }
    c.needsUpdate = true;
  });
  paredes.userData.cor = novaHex;
}
