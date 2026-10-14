// Rabiscolândia: as casas do Bairro das Casas. Cada lote tem gramado, cerquinha branca com portão, caminho de
// pedras, caixa de correio, placa na frente (vira "Casa da/do {nome}" quando a criança escolhe morar ali),
// e a casa: paredes fofas de cantos arredondados, telhado com beiral, chaminé, porta de arco com toldo e
// degraus, janelas com moldura, venezianas e floreira, janela redonda no sótão e lampião que acende de noite.
// Frente do lote em z = 0 (local), olhando para +z; o lote vai até z = -LOTE.d.

import { THREE, mat, malha, caixaRedonda, caixa, geoCaixaRedonda, MAT, TEX, placa, arvoreReal } from "./base3d.js";
import { LOTE } from "./mapa.js";

const BRANCO = 0xfffdf6;
// cerquinha branca de ripas com ponta (só caixas: entra na mesclagem)
export function cerquinha(comprimento, { cor = BRANCO, altura = 1.05 } = {}) {
  const g = new THREE.Group();
  g.userData.detalhe = true;
  const m = mat(cor);
  for (const y of [0.35, 0.78]) { const t = caixa(comprimento, 0.1, 0.07, m, { contorno: 0.03, sombra: false }); t.position.set(comprimento / 2, y, -0.06); g.add(t); }
  const n = Math.max(2, Math.round(comprimento / 0.55));
  const geo = new THREE.BoxGeometry(0.2, altura, 0.07);
  const ponta = new THREE.ConeGeometry(0.14, 0.18, 4);
  for (let i = 0; i <= n; i++) {
    const x = (comprimento * i) / n;
    const r = malha(geo, m, { contorno: 0.025, sombra: false }); r.position.set(x, altura / 2, 0); g.add(r);
    const p = malha(ponta, m, { sombra: false }); p.position.set(x, altura + 0.09, 0); p.rotation.y = Math.PI / 4; g.add(p);
  }
  return g;
}
// telhado de duas águas (prisma) com beiral: largura w (x), fundo d (z), altura h
function telhado(w, d, h, cor) {
  const forma = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.55, -0.05), new THREE.Vector2(w / 2 + 0.55, -0.05), new THREE.Vector2(0, h)]);
  const geo = new THREE.ExtrudeGeometry(forma, { depth: d + 1.0, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2 });
  geo.translate(0, 0, -(d + 1.0) / 2);
  return malha(geo, mat(cor), { contorno: 0.12 });
}
// porta com arco em cima
function geoPorta(w, h) {
  const f = new THREE.Shape();
  f.moveTo(-w / 2, 0); f.lineTo(w / 2, 0); f.lineTo(w / 2, h - w / 2); f.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); f.lineTo(-w / 2, 0);
  const geo = new THREE.ExtrudeGeometry(f, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
  return geo;
}
function janela(w, h, corVeneziana) {
  const g = new THREE.Group();
  const moldura = caixa(w + 0.3, h + 0.3, 0.16, mat(BRANCO), { contorno: 0.04 }); g.add(moldura);
  const vidro = caixa(w, h, 0.1, MAT.janela); vidro.position.z = 0.06; g.add(vidro);
  const cruzV = caixa(0.08, h, 0.06, mat(BRANCO)); cruzV.position.z = 0.12; g.add(cruzV);
  const cruzH = caixa(w, 0.08, 0.06, mat(BRANCO)); cruzH.position.z = 0.12; g.add(cruzH);
  for (const s of [-1, 1]) { const v = caixa(w * 0.48, h + 0.2, 0.08, mat(corVeneziana), { contorno: 0.03 }); v.position.set(s * (w / 2 + 0.38), 0, 0.02); g.add(v); }
  // floreira com florzinhas (some de longe)
  const flores = new THREE.Group(); flores.userData.detalhe = true; g.add(flores);
  const vaso = caixa(w + 0.4, 0.3, 0.38, mat(0xb8653a), { contorno: 0.03 }); vaso.position.set(0, -h / 2 - 0.3, 0.2); g.add(vaso);
  const cores = [0xff5fa2, 0xffcc1f, 0xffffff, 0xff7a3d, 0xb08cff];
  for (let i = 0; i < 5; i += 2) {
    const f = malha(new THREE.IcosahedronGeometry(0.14, 0), mat(cores[i % cores.length]), { sombra: false });
    f.position.set(-w / 2 + 0.05 + (i * (w - 0.1)) / 4, -h / 2 - 0.05, 0.22); flores.add(f);
    const folha = malha(new THREE.IcosahedronGeometry(0.1, 0), mat(0x4cb83f), { sombra: false }); folha.position.set(-w / 2 + 0.2 + (i * (w - 0.1)) / 4, -h / 2 - 0.14, 0.26); flores.add(folha);
  }
  return g;
}
// placa de madeira na frente do lote (a textura troca quando a criança escolhe a casa)
function placaLote(texto) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) { const p = malha(new THREE.CylinderGeometry(0.06, 0.07, 1.5, 8), mat(0x9a6232), { contorno: 0.02 }); p.position.set(s * 0.75, 0.75, 0); g.add(p); }
  const tabua = caixaRedonda(1.9, 0.8, 0.1, mat(0xf3c99a), { raio: 0.06, contorno: 0.04 }); tabua.position.y = 1.35; g.add(tabua);
  const matTexto = new THREE.MeshToonMaterial({ map: placa(texto, { cor: "#ec2e8c", fundo: "#fff6e3", w: 512, h: 200 }), transparent: true, alphaTest: 0.4 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 0.7), matTexto); face.position.set(0, 1.35, 0.06); g.add(face);
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
  // gramado do lote (um pouquinho mais verde) e caminho de pedras
  for (let i = 0; i < 4; i++) {
    const p = malha(new THREE.CylinderGeometry(0.45, 0.5, 0.08, 10), mat(0xe8e0d0), { sombra: false }); p.userData.detalhe = true;
    p.position.set((i % 2 ? 0.25 : -0.25), 0.06, -0.7 - i * 0.95); p.scale.z = 0.75; g.add(p);
  }
  // cerquinha na frente com portão aberto no meio, e cerca viva dos lados
  const vao = 2.4;
  for (const s of [-1, 1]) {
    const c = cerquinha(W / 2 - vao / 2 - 0.2); c.position.set(s < 0 ? -W / 2 + 0.1 : vao / 2 + 0.1, 0.03, -0.3); g.add(c);
    sol(s < 0 ? -W / 2 : vao / 2, s < 0 ? -vao / 2 : W / 2, -0.45, -0.15, 1.2);
    // cerca viva: moitas redondinhas enfileiradas
    for (let z = -1.8, i = 0; z > -D + 1.5; z -= 2.7, i++) {
      const m = malha(new THREE.SphereGeometry(0.85, 7, 5), mat(i % 2 ? 0x4cb83f : 0x5cc443), { contorno: 0.06, sombra: false });
      m.scale.set(0.75, 0.85 + (i % 3) * 0.1, 1.75); m.userData.detalhe = true; m.position.set(s * (W / 2 - 0.5), 0.62, z); g.add(m);
    }
    sol(s * (W / 2 - 0.45) - 0.45, s * (W / 2 - 0.45) + 0.45, -D + 0.3, -0.9, 1.1);
  }
  // casa
  const CW = 9, CH = 4.3, CD = 8, Z0 = -4.2; // frente da casa em z = Z0
  // paredes num grupo à parte (mesclado sozinho): dá para trocar a cor da casa por fora sem remontar o bairro
  const paredes = new THREE.Group(); paredes.userData = { dinamico: true, cor: lote.hex }; g.add(paredes);
  const parede = caixaRedonda(CW, CH, CD, mat(lote.hex), { raio: 0.35, contorno: 0.1 });
  parede.position.set(0, CH / 2 + 0.05, Z0 - CD / 2); paredes.add(parede);
  // rodapé mais escuro
  const rodape = caixaRedonda(CW + 0.12, 0.5, CD + 0.12, mat(new THREE.Color(lote.hex).multiplyScalar(0.75).getHex()), { raio: 0.2 });
  rodape.position.set(0, 0.3, Z0 - CD / 2); paredes.add(rodape);
  sol(-CW / 2, CW / 2, Z0 - CD, Z0, 9);
  const t = telhado(CW, CD, 3.1, lote.telhado); t.position.set(0, CH, Z0 - CD / 2); g.add(t);
  // frontão (triângulo da parede) com janelinha redonda
  const frontao = new THREE.Shape([new THREE.Vector2(-CW / 2 + 0.1, 0), new THREE.Vector2(CW / 2 - 0.1, 0), new THREE.Vector2(0, 2.9)]);
  const geoFr = new THREE.ExtrudeGeometry(frontao, { depth: 0.2, bevelEnabled: false });
  const fr = malha(geoFr, mat(lote.hex)); fr.position.set(0, CH, Z0 - 0.05); paredes.add(fr);
  const olho = malha(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 24), mat(BRANCO), { contorno: 0.04 }); olho.rotation.x = Math.PI / 2; olho.position.set(0, CH + 1.1, Z0 + 0.22); g.add(olho);
  const olhoV = malha(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 24), MAT.janela); olhoV.rotation.x = Math.PI / 2; olhoV.position.set(0, CH + 1.1, Z0 + 0.27); g.add(olhoV);
  // chaminé
  const cham = caixaRedonda(0.9, 2.2, 0.9, mat(0xd2694a), { raio: 0.12, contorno: 0.06 }); cham.position.set(2.6, CH + 2.3, Z0 - CD + 2.2); g.add(cham);
  const tampa = caixaRedonda(1.15, 0.25, 1.15, mat(BRANCO), { raio: 0.08, contorno: 0.04 }); tampa.position.set(2.6, CH + 3.45, Z0 - CD + 2.2); g.add(tampa);
  // porta com arco, maçaneta, toldo e degraus
  const corPorta = new THREE.Color(lote.telhado).multiplyScalar(0.85).getHex();
  const moldura = malha(geoPorta(1.9, 3.0), mat(BRANCO), { contorno: 0.05 }); moldura.position.set(0, 0.35, Z0 - 0.02); g.add(moldura);
  const porta = malha(geoPorta(1.5, 2.75), mat(corPorta)); porta.position.set(0, 0.4, Z0 + 0.06); g.add(porta);
  const mac = malha(new THREE.SphereGeometry(0.09, 10, 8), mat(0xffcc1f)); mac.position.set(0.48, 1.7, Z0 + 0.26); g.add(mac);
  const toldo = malha(new THREE.CylinderGeometry(1.0, 1.0, 2.6, 16, 1, false, 0, Math.PI / 2), mat(lote.telhado, { side: THREE.DoubleSide }), { contorno: 0.05 });
  toldo.rotation.z = Math.PI / 2; toldo.scale.set(1, 1, 0.7); toldo.position.set(0, 3.3, Z0 + 0.05); g.add(toldo);
  for (let i = 0; i < 2; i++) { const d = caixaRedonda(2.6 - i * 0.4, 0.2, 0.9 - i * 0.35, mat(0xe8e0d0), { raio: 0.06, contorno: 0.03 }); d.position.set(0, 0.12 + i * 0.2, Z0 + 0.45 - i * 0.18); g.add(d); }
  // lampião ao lado da porta
  const lamp = caixaRedonda(0.3, 0.45, 0.3, MAT.lampada, { raio: 0.08, contorno: 0.03 }); lamp.position.set(-1.35, 2.75, Z0 + 0.25); g.add(lamp);
  // janelas da frente
  for (const s of [-1, 1]) { const j = janela(1.5, 1.35, lote.telhado); j.position.set(s * 2.85, 2.45, Z0 + 0.04); g.add(j); }
  // janelas dos lados
  for (const s of [-1, 1]) { const j = janela(1.3, 1.2, lote.telhado); j.position.set(s * (CW / 2 + 0.03), 2.45, Z0 - CD / 2); j.rotation.y = s * Math.PI / 2; g.add(j); }
  // caixa de correio no portão
  const posteC = malha(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), mat(0x6b4a2f), { contorno: 0.02 }); posteC.position.set(1.65, 0.55, 0.15); g.add(posteC);
  const correio = caixaRedonda(0.45, 0.42, 0.75, mat(lote.telhado), { raio: 0.16, contorno: 0.04 }); correio.position.set(1.65, 1.25, 0.15); g.add(correio);
  const bandeira = caixa(0.04, 0.32, 0.1, mat(0xe8413c)); bandeira.position.set(1.9, 1.45, 0.1); g.add(bandeira);
  sol(1.4, 1.9, -0.1, 0.5, 1.5);
  // placa do lote
  const pl = placaLote(`Casa ${lote.numero}`); pl.position.set(-2.4, 0.03, 0.2); g.add(pl);
  sol(-3.25, -1.55, 0.1, 0.3, 2);
  // árvore no quintal e moitas na frente da casa
  const arv = arvoreReal(0.75, lote.numero); arv.position.set(lote.numero % 2 ? 4.8 : -4.8, 0.03, -D + 3); g.add(arv);
  sol(arv.position.x - 0.4, arv.position.x + 0.4, -D + 2.6, -D + 3.4, 6);
  for (const s of [-1, 1]) { const m = malha(new THREE.IcosahedronGeometry(0.7, 1), mat(0x5cc443), { contorno: 0.06, sombra: false }); m.userData.detalhe = true; m.scale.set(1.2, 0.8, 0.9); m.position.set(s * 4.9, 0.5, Z0 + 0.8); g.add(m); }
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
void TEX;
