// PROTÓTIPO VISUAL (só para gerar imagens de antes e depois): a Rabiscolândia em estilo de blocos.
// Carregado só com ?estilo=blocos (jogo.js). Sem o parâmetro este arquivo nem é baixado e o jogo é o de sempre.
//
// Como funciona (o mínimo de mudança nos arquivos existentes):
//  · ganchos de uma linha em base3d.js, casas.js, carros.js, personagens.js, predios.js e orla.js chamam as peças
//    daqui quando window.__blocos existe (prédios, casas, árvores, carros, praça, roda-gigante, placas, moradores);
//  · caixaReta() troca as caixas arredondadas por caixas retas e geo() troca cilindros/esferas por caixas;
//  · aplicar() varre a cena e troca o sombreamento em faixas por plástico liso, apaga o contorno preto do mundo
//    (o contorno do Rabisco oficial fica) e a textura do chão, da rua e da calçada vira placa com pinos.
// Tudo original: caixas, pinos e cores da paleta da Educarte. Nenhuma marca, textura ou nome de terceiros.

import { THREE, mat, caixa, TEX, MAT, mesclar, texturaCanvas } from "./base3d.js";
import { banco, canteiro, posteLuz } from "./predios.js";
import { pessoaBloco, moradorBloco } from "./proto-blocos-moradores.js";

const B = window.__blocos;

// ------------------------------------------------------------------ peças básicas
const caixas = new Map();
export const geoCaixa = (w, h, d) => {
  const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  if (!caixas.has(k)) { const g = new THREE.BoxGeometry(w, h, d); g.userData.compartilhada = true; caixas.set(k, g); }
  return caixas.get(k);
};
// caixa colorida posta num grupo: w h d, cor, posição do CENTRO
export function cx(pai, w, h, d, cor, x, y, z, { sombra = true, material = null } = {}) {
  const m = new THREE.Mesh(geoCaixa(w, h, d), material ?? mat(cor));
  m.position.set(x, y, z); m.castShadow = sombra; m.receiveShadow = true; pai.add(m);
  return m;
}
const geoPino = new THREE.CylinderGeometry(0.19, 0.19, 0.13, 8); geoPino.userData.compartilhada = true;
// fileira de pinos de peça de montar em cima de uma face (centro x,z; largura w; fundo d; altura y do topo)
export function pinos(pai, w, d, x, y, z, cor, passo = 0.95) {
  const m = mat(cor), nx = Math.max(1, Math.floor(w / passo)), nz = Math.max(1, Math.floor(d / passo));
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const p = new THREE.Mesh(geoPino, m);
    p.position.set(x - w / 2 + (w / nx) * (i + 0.5), y + 0.065, z - d / 2 + (d / nz) * (k + 0.5)); p.castShadow = false; pai.add(p);
  }
}
const claro = (hex, f) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), f).getHex();
const escuro = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();

// placa lisa (retângulo reto, sem contorno preto) com o texto da marca
export function placaBloco(texto, { cor = "#00b5f0", fundo = "#ffffff", tinta = "#151515", w = 512, h = 128, fonte = 800 } = {}) {
  return texturaCanvas(w, h, (c) => {
    c.fillStyle = cor; c.fillRect(0, 0, w, h);
    c.fillStyle = fundo; c.fillRect(h * 0.1, h * 0.1, w - h * 0.2, h * 0.8);
    let tam = Math.round(h * 0.54); c.font = `${fonte} ${tam}px 'Baloo 2', sans-serif`;
    while (c.measureText(texto).width > w - h * 0.7) { tam -= 3; c.font = `${fonte} ${tam}px 'Baloo 2', sans-serif`; }
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = tinta; c.fillText(texto, w / 2, h / 2 + 2);
  });
}

// ------------------------------------------------------------------ geometrias: cilindro, esfera e cápsula viram caixa
const trocadas = new Map();
function boxificar(g) {
  const p = g.parameters, t = g.type;
  let nova = null;
  if (t === "CylinderGeometry" && !p.openEnded && p.thetaLength > 6 && p.radiusTop > 0.001) {
    const r = (p.radiusTop + p.radiusBottom) / 2 * 1.78;
    nova = new THREE.BoxGeometry(r, p.height, r);
  } else if (t === "CylinderGeometry" && p.openEnded && p.thetaLength > 6) {
    const r = Math.max(p.radiusTop, p.radiusBottom) * 1.7; nova = new THREE.BoxGeometry(r, p.height, r);
  } else if (t === "SphereGeometry") {
    if (p.thetaLength < 2) { nova = new THREE.BoxGeometry(p.radius * 1.9, p.radius * 0.9, p.radius * 1.9); nova.translate(0, p.radius * 0.45, 0); }
    else nova = new THREE.BoxGeometry(p.radius * 1.65, p.radius * 1.65, p.radius * 1.65);
  } else if (t === "IcosahedronGeometry" && p.radius > 0.1) {
    nova = new THREE.BoxGeometry(p.radius * 1.5, p.radius * 1.5, p.radius * 1.5);
  } else if (t === "CapsuleGeometry") {
    nova = new THREE.BoxGeometry(p.radius * 2, p.length + p.radius * 2, p.radius * 2);
  }
  return nova;
}
function geo(g) {
  if (!g || trocadas.get(g) === null) return g;
  if (trocadas.has(g)) return trocadas.get(g);
  const n = boxificar(g);
  if (n) n.userData.compartilhada = true;
  trocadas.set(g, n ?? null);
  return n ?? g;
}

// ------------------------------------------------------------------ árvore de caixas
const VERDES = [0x42c92d, 0x35b83a, 0x58d63a, 0x2fae45];
function arvore(escala = 1, tipo = 0) {
  const g = new THREE.Group();
  const verde = VERDES[tipo % VERDES.length];
  cx(g, 0.78, 2.7, 0.78, 0x8a5426, 0, 1.35, 0, { sombra: false });
  if (tipo % 3 === 2) { // pinheiro de camadas
    [[3.0, 1.0, 2.7], [2.3, 1.0, 3.6], [1.6, 1.0, 4.5], [0.9, 0.9, 5.4]].forEach(([w, h, y], i) => cx(g, w, h, w, i % 2 ? claro(verde, 0.08) : verde, 0, y, 0, { sombra: false }));
  } else { // copa de cubos
    cx(g, 3.3, 2.7, 3.3, verde, 0, 3.9, 0, { sombra: false });
    cx(g, 2.0, 1.4, 2.0, claro(verde, 0.12), 0.3, 5.6, -0.2, { sombra: false });
    cx(g, 1.2, 1.2, 1.2, claro(verde, 0.2), 1.9, 3.1, 0.6, { sombra: false });
  }
  g.scale.setScalar(escala);
  return g;
}

// ------------------------------------------------------------------ casa de blocos (mesma interface de casas.js)
function cercaBloco(comp, cor = 0xffffff) {
  const g = new THREE.Group(); g.userData.detalhe = true;
  cx(g, comp, 0.14, 0.12, cor, comp / 2, 0.38, -0.06, { sombra: false });
  cx(g, comp, 0.14, 0.12, cor, comp / 2, 0.82, -0.06, { sombra: false });
  const n = Math.max(2, Math.round(comp / 1.0));
  for (let i = 0; i <= n; i++) cx(g, 0.24, 1.05, 0.14, cor, (comp * i) / n, 0.53, 0, { sombra: false });
  return g;
}
function janelaBloco(w, h, corVeneziana) {
  const g = new THREE.Group();
  cx(g, w + 0.4, h + 0.4, 0.2, 0xffffff, 0, 0, 0);
  cx(g, w, h, 0.14, 0, 0, 0, 0.1, { material: MAT.janela });
  cx(g, 0.1, h, 0.08, 0xffffff, 0, 0, 0.18); cx(g, w, 0.1, 0.08, 0xffffff, 0, 0, 0.18);
  for (const s of [-1, 1]) cx(g, w * 0.4, h + 0.2, 0.12, corVeneziana, s * (w / 2 + 0.45), 0, 0.02);
  cx(g, w + 0.5, 0.34, 0.5, 0xb85c28, 0, -h / 2 - 0.42, 0.3);
  const flores = new THREE.Group(); flores.userData.detalhe = true; g.add(flores);
  [0xff4fa0, 0xffcc1f, 0xffffff, 0xff7a3d].forEach((c, i) => cx(flores, 0.26, 0.26, 0.26, c, -w / 2 + 0.15 + (i * (w - 0.3)) / 3, -h / 2 - 0.12, 0.4, { sombra: false }));
  return g;
}
function casa(lote) {
  const g = new THREE.Group(), solidos = [];
  const sol = (x0, x1, z0, z1, y1) => solidos.push({ x0, x1, z0, z1, y1 });
  const W = 15, D = 22, CW = 9, CH = 4.3, CD = 8, Z0 = -4.2;
  // caminho de pedras (placas retas)
  for (let i = 0; i < 4; i++) { const p = cx(g, 1.1, 0.1, 0.8, 0xdcd8cf, i % 2 ? 0.3 : -0.3, 0.07, -0.7 - i * 0.95, { sombra: false }); p.userData.detalhe = true; }
  // cerca na frente (vão de 2,4 m no portão) e cerca viva de cubos nos lados
  const vao = 2.4;
  for (const s of [-1, 1]) {
    const c = cercaBloco(W / 2 - vao / 2 - 0.2); c.position.set(s < 0 ? -W / 2 + 0.1 : vao / 2 + 0.1, 0.03, -0.3); g.add(c);
    sol(s < 0 ? -W / 2 : vao / 2, s < 0 ? -vao / 2 : W / 2, -0.45, -0.15, 1.2);
    for (let z = -1.8, i = 0; z > -D + 1.5; z -= 2.2, i++) {
      const m = cx(g, 1.3, 1.1 + (i % 3) * 0.2, 1.8, i % 2 ? 0x35b83a : 0x42c92d, s * (W / 2 - 0.5), 0.6, z, { sombra: false }); m.userData.detalhe = true;
    }
    sol(s * (W / 2 - 0.45) - 0.45, s * (W / 2 - 0.45) + 0.45, -D + 0.3, -0.9, 1.1);
  }
  // paredes (grupo à parte: a cor da casa é trocada por vértice)
  const paredes = new THREE.Group(); paredes.userData = { dinamico: true, cor: lote.hex }; g.add(paredes);
  cx(paredes, CW, CH, CD, lote.hex, 0, CH / 2 + 0.05, Z0 - CD / 2);
  cx(paredes, CW + 0.16, 0.55, CD + 0.16, escuro(lote.hex, 0.75), 0, 0.33, Z0 - CD / 2);
  sol(-CW / 2, CW / 2, Z0 - CD, Z0, 9);
  // telhado em degraus de tijolo (cada fiada mais estreita), com pinos na cumeeira
  const camadas = 5, alt = 0.62;
  for (let i = 0; i < camadas; i++) {
    const w = CW + 1.2 - i * 1.9;
    cx(g, w, alt, CD + 1.0, lote.telhado, 0, CH + 0.05 + alt / 2 + i * alt, Z0 - CD / 2);
  }
  // frontão em degraus (mesma cor da parede)
  for (let i = 0; i < 4; i++) cx(paredes, CW - 0.2 - i * 2.1, alt, 0.3, lote.hex, 0, CH + 0.05 + alt / 2 + i * alt, Z0 - 0.15);
  pinos(g, 1.2, CD - 1, 0, CH + 0.05 + camadas * alt, Z0 - CD / 2, claro(lote.telhado, 0.25), 0.9);
  // janela do sótão quadrada
  cx(g, 1.0, 1.0, 0.2, 0xffffff, 0, CH + 1.3, Z0 + 0.1); cx(g, 0.72, 0.72, 0.16, 0, 0, CH + 1.3, Z0 + 0.2, { material: MAT.janela });
  // chaminé
  cx(g, 1.0, 2.2, 1.0, 0xc8553a, 2.6, CH + 2.3, Z0 - CD + 2.2); cx(g, 1.3, 0.3, 1.3, 0xffffff, 2.6, CH + 3.55, Z0 - CD + 2.2);
  // porta reta, degraus e toldo de blocos
  const corPorta = escuro(lote.telhado, 0.85);
  cx(g, 2.2, 3.2, 0.2, 0xffffff, 0, 1.65, Z0 + 0.02); cx(g, 1.6, 2.9, 0.2, corPorta, 0, 1.5, Z0 + 0.1);
  cx(g, 0.18, 0.18, 0.18, 0xffcc1f, 0.5, 1.5, Z0 + 0.3);
  cx(g, 2.9, 0.4, 1.3, lote.telhado, 0, 3.4, Z0 + 0.6);
  for (let i = 0; i < 2; i++) cx(g, 2.8 - i * 0.5, 0.22, 1.0 - i * 0.35, 0xe3ddd0, 0, 0.14 + i * 0.22, Z0 + 0.55 - i * 0.2);
  cx(g, 0.4, 0.5, 0.35, 0, -1.55, 2.8, Z0 + 0.3, { material: MAT.lampada });
  for (const s of [-1, 1]) { const j = janelaBloco(1.5, 1.35, lote.telhado); j.position.set(s * 2.85, 2.5, Z0 + 0.06); g.add(j); }
  for (const s of [-1, 1]) { const j = janelaBloco(1.3, 1.2, lote.telhado); j.position.set(s * (CW / 2 + 0.05), 2.5, Z0 - CD / 2); j.rotation.y = s * Math.PI / 2; g.add(j); }
  // caixa de correio
  cx(g, 0.14, 1.1, 0.14, 0x6b4a2f, 1.65, 0.55, 0.15); cx(g, 0.5, 0.45, 0.8, lote.telhado, 1.65, 1.25, 0.15); cx(g, 0.05, 0.34, 0.12, 0xe8413c, 1.95, 1.45, 0.1);
  sol(1.4, 1.9, -0.1, 0.5, 1.5);
  // placa do lote (a textura troca quando a criança escolhe a casa)
  const pl = new THREE.Group();
  cx(pl, 0.12, 1.5, 0.12, 0x6b4a2f, -0.75, 0.75, 0); cx(pl, 0.12, 1.5, 0.12, 0x6b4a2f, 0.75, 0.75, 0); cx(pl, 1.9, 0.8, 0.12, 0xf3c99a, 0, 1.35, 0);
  const matTexto = new THREE.MeshToonMaterial({ map: placaBloco(`Casa ${lote.numero}`, { cor: "#ec2e8c", fundo: "#fff6e3", w: 512, h: 200 }), transparent: true, alphaTest: 0.4 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 0.7), matTexto); face.position.set(0, 1.35, 0.08); face.userData.dinamico = true; pl.add(face);
  pl.userData = { definir(t, cor = "#ec2e8c") { matTexto.map.dispose(); matTexto.map = placaBloco(t, { cor, fundo: "#fff6e3", w: 512, h: 200 }); matTexto.needsUpdate = true; } };
  pl.position.set(-2.4, 0.03, 0.2); g.add(pl); sol(-3.25, -1.55, 0.1, 0.3, 2);
  const arv = arvore(0.75, lote.numero); arv.position.set(lote.numero % 2 ? 4.8 : -4.8, 0.03, -D + 3); g.add(arv);
  sol(arv.position.x - 0.4, arv.position.x + 0.4, -D + 2.6, -D + 3.4, 6);
  for (const s of [-1, 1]) { const m = cx(g, 1.3, 0.9, 1.2, 0x42c92d, s * 4.9, 0.5, Z0 + 0.8, { sombra: false }); m.userData.detalhe = true; }
  g.userData.placa = pl; g.userData.paredes = paredes; g.userData.porta = [0, Z0 + 1.2];
  return { grupo: g, solidos };
}

// ------------------------------------------------------------------ loja parceira / igreja: prédio de blocos com a placa da marca
const MARCAS = {
  "J.E Multimarcas": { parede: 0xf2f2f2, faixa: 0x1d1d1d, acento: 0xe8413c, placa: "#1d1d1d", texto: "#ffffff", acentoHex: "#e8413c" },
  "Bella Cat Make Biju": { parede: 0xf4e4ff, faixa: 0xc9a0f0, acento: 0xec2e8c, placa: "#c9a0f0", texto: "#ffffff", acentoHex: "#ec2e8c" },
  "Academia Rise Up": { parede: 0xf0dcb8, faixa: 0x2a2522, acento: 0xff7a00, placa: "#2a2522", texto: "#ff7a00", acentoHex: "#ff7a00" },
};
function loja(p, aoMudar, { altura, d, larguraMax }) {
  const g = new THREE.Group();
  const w = Math.min(larguraMax, 19), h = Math.min(altura, 8.4);
  if (p.tipo === "igreja") { // a fachada de reserva (já em caixas) é desenhada por predios.js por cima deste corpo
    cx(g, w, h, d, 0xe9edf6, 0, h / 2, -d / 2); cx(g, w + 0.6, 0.6, d + 0.6, 0x1f3a8a, 0, h + 0.3, -d / 2);
    pinos(g, w - 1, d - 1, 0, h + 0.6, -d / 2, 0x3550a8, 1.1);
    g.userData.largura = w; g.userData.alturaFoto = h; aoMudar?.(w, h);
    return g;
  }
  const m = MARCAS[p.nome] ?? MARCAS["J.E Multimarcas"];
  cx(g, w, h, d, m.parede, 0, h / 2, -d / 2);
  cx(g, w + 0.2, 0.9, d + 0.2, m.faixa, 0, 0.45, -d / 2);                // rodapé
  cx(g, w + 0.8, 0.7, d + 0.8, m.faixa, 0, h + 0.35, -d / 2);           // beiral
  pinos(g, w - 1.2, d - 1.2, 0, h + 0.7, -d / 2, claro(m.faixa, 0.2), 1.1);
  // vitrines grandes no térreo e janelas quadradas em cima
  for (const s of [-1, 1]) {
    cx(g, w * 0.3 + 0.5, 3.4, 0.25, 0xffffff, s * w * 0.3, 2.3, 0.05);
    cx(g, w * 0.3, 3.0, 0.2, 0, s * w * 0.3, 2.3, 0.17, { material: MAT.janela });
  }
  cx(g, 2.8, 3.4, 0.25, 0xffffff, 0, 1.9, 0.05); cx(g, 2.3, 3.0, 0.2, 0, 0, 1.75, 0.17, { material: MAT.janelaQuente });
  for (let i = 0; i < 4; i++) { const x = -w / 2 + (w / 4) * (i + 0.5); cx(g, 2.2, 1.4, 0.2, 0xffffff, x, h - 1.6, 0.04); cx(g, 1.8, 1.0, 0.18, 0, x, h - 1.6, 0.16, { material: MAT.janela }); }
  // toldo de blocos listrados sobre as vitrines
  const n = 10; for (let i = 0; i < n; i++) cx(g, w / n, 0.34, 1.6, i % 2 ? 0xffffff : m.acento, -w / 2 + (w / n) * (i + 0.5), 4.15, 0.85);
  // placa grande com o nome da marca (lisa, reta) e uma faixa de acento
  cx(g, w * 0.78, 2.1, 0.4, m.faixa, 0, h - 2.9, 0.2);
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.74, 1.8), new THREE.MeshToonMaterial({ map: placaBloco(p.nome, { cor: m.placa, fundo: m.placa, tinta: m.texto, w: 1024, h: 256 }) }));
  placa.position.set(0, h - 2.9, 0.42); g.add(placa);
  cx(g, w * 0.78, 0.22, 0.46, m.acento, 0, h - 4.05, 0.2);
  g.userData.largura = w; g.userData.alturaFoto = h; g.userData.fotoOk = true;
  aoMudar?.(w, h);
  return g;
}

// ------------------------------------------------------------------ carros de caixa
function roda4(g, cor, rodas, posicoes, R = 0.45) {
  for (const [x, z] of posicoes) {
    const r = new THREE.Group(); r.position.set(x, R, z);
    cx(r, 0.34, R * 2, R * 2, 0x2b2f38, 0, 0, 0, { sombra: false });
    cx(r, 0.38, R * 1.0, R * 1.0, cor, x < 0 ? -0.03 : 0.03, 0, 0, { sombra: false });
    g.add(r); rodas.push(r);
  }
}
function carro(cor) {
  const g = new THREE.Group();
  cx(g, 2.1, 0.85, 4.4, cor, 0, 0.9, 0);
  cx(g, 1.8, 0.9, 2.3, claro(cor, 0.08), 0, 1.75, -0.2);
  cx(g, 1.84, 0.62, 0.1, 0, 0, 1.78, 0.98, { material: MAT.janela }); cx(g, 1.84, 0.62, 0.1, 0, 0, 1.78, -1.38, { material: MAT.janela });
  for (const s of [-1, 1]) cx(g, 0.1, 0.62, 1.7, 0, s * 0.92, 1.78, -0.2, { material: MAT.janela });
  cx(g, 2.2, 0.28, 0.3, 0xf4f4f4, 0, 0.62, 2.25); cx(g, 2.2, 0.28, 0.3, 0xf4f4f4, 0, 0.62, -2.25);
  for (const x of [-0.65, 0.65]) { cx(g, 0.4, 0.28, 0.1, 0xfff2a8, x, 1.0, 2.23, { sombra: false }); cx(g, 0.4, 0.26, 0.1, 0xe8302a, x, 1.0, -2.23, { sombra: false }); }
  const rodas = [];
  roda4(g, 0xdfe6ee, rodas, [[-1.0, 1.4], [1.0, 1.4], [-1.0, -1.4], [1.0, -1.4]]);
  return g;
}
function carroFofo(cor = 0xec2e8c) {
  const g = new THREE.Group();
  const lata = cor, aba = claro(cor, 0.5);
  cx(g, 2.2, 0.62, 4.7, lata, 0, 0.78, 0);                 // chassi
  cx(g, 2.3, 0.3, 4.8, aba, 0, 0.55, 0);                   // saia clara
  cx(g, 2.2, 0.55, 1.6, lata, 0, 1.3, 1.55);               // capô
  cx(g, 2.2, 0.75, 0.9, lata, 0, 1.4, -1.9);               // traseira alta
  for (const s of [-1, 1]) { cx(g, 0.18, 0.5, 2.0, lata, s * 1.08, 1.35, -0.1); }
  cx(g, 1.9, 0.08, 1.9, 0x3a3f4c, 0, 1.12, -0.2, { sombra: false });
  cx(g, 1.95, 0.4, 0.45, 0x2f3440, 0, 1.45, 0.65);          // painel
  // para-brisa reto (moldura + vidro claro)
  cx(g, 2.0, 0.1, 0.12, 0xdfe6ee, 0, 1.95, 0.72); for (const s of [-1, 1]) cx(g, 0.1, 0.75, 0.12, 0xdfe6ee, s * 0.95, 1.6, 0.72);
  cx(g, 1.8, 0.62, 0.06, 0, 0, 1.62, 0.72, { material: MAT.janela });
  const assentos = [];
  for (const x of [0.5, -0.5]) {
    cx(g, 0.8, 0.26, 0.85, 0xfff0d0, x, 1.25, -0.45); cx(g, 0.8, 0.7, 0.22, 0xfff0d0, x, 1.65, -0.92); cx(g, 0.82, 0.1, 0.24, 0xec2e8c, x, 2.0, -0.92);
    assentos.push(new THREE.Vector3(x, 1.32, -0.42));
  }
  for (const x of [-0.7, 0.7]) { cx(g, 0.42, 0.34, 0.12, 0xfff2a8, x, 1.1, 2.4, { sombra: false }); cx(g, 0.4, 0.3, 0.12, 0xe8302a, x, 1.1, -2.42, { sombra: false }); }
  cx(g, 2.35, 0.3, 0.3, 0xf4f4f4, 0, 0.55, 2.55); cx(g, 2.35, 0.3, 0.3, 0xf4f4f4, 0, 0.55, -2.55);
  cx(g, 1.9, 0.12, 0.7, 0xffffff, 0, 1.64, 1.65, { sombra: false }); // faixa no capô
  const volante = new THREE.Group(); volante.position.set(0.5, 1.62, 0.25); volante.rotation.x = -1.0; volante.userData.dinamico = true;
  cx(volante, 0.5, 0.08, 0.08, 0x262626, 0, 0.21, 0); cx(volante, 0.5, 0.08, 0.08, 0x262626, 0, -0.21, 0); cx(volante, 0.08, 0.5, 0.08, 0x262626, 0.21, 0, 0); cx(volante, 0.08, 0.5, 0.08, 0x262626, -0.21, 0, 0);
  g.add(volante);
  const rodas = [];
  roda4(g, 0xffffff, rodas, [[-1.15, 1.5], [1.15, 1.5], [-1.15, -1.5], [1.15, -1.5]], 0.47);
  const seta = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); seta.rotation.x = Math.PI; seta.position.y = 3.2; seta.userData.dinamico = true; g.add(seta);
  mesclar(g, { juntas: new Set(rodas) });
  Object.assign(g.userData, { rodas, seta, volante, motorista: assentos[0], carona: assentos[1] });
  return g;
}

// ------------------------------------------------------------------ praça quadrada de placas, chafariz de degraus
function praca(raio) {
  const g = new THREE.Group(), solidos = [];
  const lado = raio * 2 - 2;
  // piso de placas claras em xadrez + gramado quadrado por dentro
  const n = Math.round(lado / 4);
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
    const x = -lado / 2 + (lado / n) * (i + 0.5), z = -lado / 2 + (lado / n) * (k + 0.5);
    cx(g, lado / n - 0.06, 0.1, lado / n - 0.06, (i + k) % 2 ? 0xe9e6dd : 0xd9d6cd, x, 0.06, z, { sombra: false });
  }
  const gr = lado * 0.72; cx(g, gr, 0.12, gr, 0x4cc83a, 0, 0.1, 0, { sombra: false });
  pinos(g, gr, gr, 0, 0.16, 0, 0x62dd4c, 2.4);
  // chafariz de blocos: bacia, degraus, coluna e jato
  const pedra = 0xe6e0d4;
  cx(g, 8.6, 0.9, 8.6, pedra, 0, 0.55, 0); cx(g, 7.6, 0.25, 7.6, 0x4fc3ff, 0, 1.0, 0, { sombra: false });
  const agua = new THREE.Mesh(geoCaixa(7.4, 0.12, 7.4), new THREE.MeshToonMaterial({ color: 0x35b8ff, emissive: 0x0a3a66, emissiveIntensity: 0.3 })); agua.position.y = 1.16; agua.userData.dinamico = true; g.add(agua);
  cx(g, 1.4, 2.6, 1.4, pedra, 0, 2.2, 0); cx(g, 3.6, 0.5, 3.6, claro(pedra, 0.3), 0, 3.7, 0); cx(g, 2.0, 0.4, 2.0, pedra, 0, 4.2, 0);
  const jato = new THREE.Mesh(geoCaixa(0.7, 1.7, 0.7), new THREE.MeshToonMaterial({ color: 0xbfeeff, transparent: true, opacity: 0.75 })); jato.position.y = 5.3; jato.userData.dinamico = true; g.add(jato);
  solidos.push({ x0: -4.4, x1: 4.4, z0: -4.4, z1: 4.4, y1: 1.0 });
  const S = { grupo: g, solidos, agua, jato };
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, ccx = Math.sin(a) * 9.5, ccz = Math.cos(a) * 9.5;
    const c = canteiro(3.6, 2.2); c.position.set(ccx, 0, ccz); c.rotation.y = a; g.add(c);
    solidos.push({ x0: ccx - 1.9, x1: ccx + 1.9, z0: ccz - 1.9, z1: ccz + 1.9, y1: 0.6 });
    const b = banco(); b.position.set(Math.sin(a + Math.PI / 4) * 7.2, 0.06, Math.cos(a + Math.PI / 4) * 7.2); b.rotation.y = a + Math.PI / 4 + Math.PI; g.add(b);
    const p = posteLuz(); p.position.set(Math.sin(a + 0.38) * 13.5, 0.06, Math.cos(a + 0.38) * 13.5); g.add(p);
    solidos.push({ x0: p.position.x - 0.25, x1: p.position.x + 0.25, z0: p.position.z - 0.25, z1: p.position.z + 0.25, y1: 5 });
    const t = arvore(1.15, i); t.position.set(Math.sin(a) * 13.8, 0.06, Math.cos(a) * 13.8); g.add(t);
    solidos.push({ x0: t.position.x - 0.5, x1: t.position.x + 0.5, z0: t.position.z - 0.5, z1: t.position.z + 0.5, y1: 6 });
  }
  return S;
}

// ------------------------------------------------------------------ roda-gigante de caixas (mesma interface de orla.js)
function rodaGigante() {
  const S = { grupo: new THREE.Group(), solidos: [] }, g = S.grupo;
  const R = { h: 14.8, r: 11, n: 8 }, { h, r, n } = R;
  const azul = 0x2f6fc0;
  const viga = (a, b, e, cor) => { // viga reta entre dois pontos (caixa comprida girada)
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
    const m = new THREE.Mesh(geoCaixa(e, d.length(), e), mat(cor)); m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; g.add(m); return m;
  };
  for (const z of [-2.4, 2.4]) for (const x of [-6, 6]) { viga([x, 0, z], [0, h, z * 0.5], 0.7, azul); S.solidos.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5, y1: 20 }); }
  for (const z of [-2.4, 2.4]) viga([-4.6, 3, z], [4.6, 3, z], 0.45, azul);
  cx(g, 6.8, 0.3, 6.8, 0xf3c99a, 0, 0.15, 0, { sombra: false });
  S.solidos.push({ x0: -2.2, x1: 2.2, z0: -1.8, z1: 1.8, y1: 2.4 });
  const aro = new THREE.Group(); aro.position.set(0, h, 0); aro.userData.dinamico = true; g.add(aro);
  const lados = 16;
  for (const z of [-1.2, 1.2]) {
    for (let i = 0; i < lados; i++) { // aro de 16 trechos retos
      const a0 = (i / lados) * Math.PI * 2, a1 = ((i + 1) / lados) * Math.PI * 2;
      const A = [Math.cos(a0) * r, Math.sin(a0) * r, z], Bp = [Math.cos(a1) * r, Math.sin(a1) * r, z];
      const d = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]);
      const m = new THREE.Mesh(geoCaixa(d + 0.5, 0.55, 0.5), mat(0xec2e8c)); m.position.set((A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2, z); m.rotation.z = (a0 + a1) / 2 + Math.PI / 2; m.castShadow = true; aro.add(m);
    }
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const m = new THREE.Mesh(geoCaixa(r, 0.2, 0.2), mat(0xffffff)); m.position.set(Math.cos(a) * r / 2, Math.sin(a) * r / 2, z); m.rotation.z = a; aro.add(m); }
  }
  cx(aro, 1.3, 1.3, 3.8, 0x2f3440, 0, 0, 0);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; cx(aro, 0.2, 0.2, 2.6, 0xffffff, Math.cos(a) * r, Math.sin(a) * r, 0); }
  mesclar(aro);
  const cores = [0xec2e8c, 0x00b5f0, 0xffcc1f, 0x58c43a, 0xff7a00, 0x8e6cff, 0x2ec4b6, 0xe8413c];
  const cabines = [];
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group(); c.userData.dinamico = true;
    cx(c, 2.3, 0.2, 2.3, 0xf3c99a, 0, -3.2, 0); cx(c, 2.3, 0.2, 2.3, cores[(i + 3) % cores.length], 0, -0.95, 0);
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) cx(c, 0.18, 2.2, 0.18, 0xffffff, sx * 1.05, -2.05, sz * 1.05);
    for (const s of [-1, 1]) { cx(c, 2.3, 0.9, 0.18, cores[i % cores.length], 0, -2.8, s * 1.05); cx(c, 0.18, 0.9, 2.3, cores[i % cores.length], s * 1.05, -2.8, 0); }
    cx(c, 0.2, 0.9, 0.2, 0xffffff, 0, -0.4, 0);
    g.add(c); cabines.push(c);
  }
  let giro = 0;
  const pivo = (i, out = new THREE.Vector3()) => { const a = giro + (i / n) * Math.PI * 2 - Math.PI / 2; return out.set(Math.cos(a) * r, h + Math.sin(a) * r, 0); };
  const girar = (a) => { giro = a; aro.rotation.z = a; cabines.forEach((c, i) => { const p = pivo(i); c.position.copy(p); }); };
  girar(0);
  Object.assign(S, { aro, girar, pivo, piso: -3.1 });
  Object.defineProperty(S, "giro", { get: () => giro });
  return S;
}

// ------------------------------------------------------------------ chão, rua e calçada em placas com pinos
function redesenhar(tex, fn) { const c = tex.image, x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height); fn(x, c.width, c.height); tex.needsUpdate = true; }
function pino(c, x, y, r, topo, lado) {
  c.fillStyle = lado; c.beginPath(); c.arc(x + r * 0.12, y + r * 0.2, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = topo; c.beginPath(); c.arc(x, y, r * 0.92, 0, Math.PI * 2); c.fill();
}
function texturasDeBlocos() {
  redesenhar(TEX.grama, (c, w, h) => {
    c.fillStyle = "#6cc65a"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) pino(c, 16 + i * 32, 16 + k * 32, 8, "#76cd64", "#62b950");
    c.strokeStyle = "#62b950"; c.lineWidth = 2; c.strokeRect(0, 0, w, h);
  });
  redesenhar(TEX.asfalto, (c, w, h) => {
    c.fillStyle = "#52555d"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#585b64"; c.fillRect(6, 6, w - 12, h - 12);
    c.strokeStyle = "#464950"; c.lineWidth = 4; c.strokeRect(0, 0, w, h);
  });
  redesenhar(TEX.calcada, (c, w, h) => {
    c.fillStyle = "#d9dde5"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) pino(c, 48 + i * 36, 21 + k * 43, 8, "#e4e8ef", "#bcc3cf");
    c.fillStyle = "#f6f8fc"; c.fillRect(0, 0, 26, h);
    c.fillStyle = "#9aa3b4"; c.fillRect(26, 0, 5, h);
    c.strokeStyle = "#b7beca"; c.lineWidth = 3; c.strokeRect(31, 0, w - 31, h);
  });
  redesenhar(TEX.terra, (c, w, h) => { c.fillStyle = "#c7824a"; c.fillRect(0, 0, w, h); c.strokeStyle = "#a96a38"; c.lineWidth = 3; c.strokeRect(0, 0, w, h); });
}

// ------------------------------------------------------------------ troca de material (plástico liso) e apagar contornos
const rampa = (() => { const d = new Uint8Array(256 * 4); for (let i = 0; i < 256; i++) { const v = Math.round(115 + (i / 255) * 140); d.set([v, v, v, 255], i * 4); } const t = new THREE.DataTexture(d, 256, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t; })();
const novos = new Map();
const marcado = new WeakSet();
function plastico(m) {
  if (novos.has(m)) return novos.get(m);
  const n = new THREE.MeshStandardMaterial({
    color: m.color, map: m.map, emissive: m.emissive, emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity, transparent: m.transparent,
    opacity: m.opacity, side: m.side, alphaTest: m.alphaTest, vertexColors: m.vertexColors, depthWrite: m.depthWrite, roughness: 0.42, metalness: 0,
  });
  n.userData.plastico = true;
  if (m.map && (m.map === TEX.asfalto || m.map === TEX.calcada)) { // fitas de rua: a face de trás não inverte a normal (senão a rua fica escura)
    n.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\n normal *= faceDirection;\n#endif"); };
    n.customProgramCacheKey = () => "rua-sem-inverter";
  }
  novos.set(m, n); return n;
}
let protegido = null; // o Rabisco oficial (fica como está)
let contornoRabisco = null;
const ehContorno = (m) => m?.isMeshBasicMaterial && m.side === THREE.BackSide;
function aplicar(raiz = B.cena) {
  if (!raiz) return;
  const dentroProtegido = (o) => { for (let p = o; p; p = p.parent) if (p === protegido) return true; return false; };
  raiz.traverse((o) => {
    if (!o.isMesh || marcado.has(o)) return;
    const prot = protegido && dentroProtegido(o);
    const troca = (m) => {
      if (!m) return m;
      if (ehContorno(m)) { if (!prot) m.visible = false; return m; }
      if (prot) return m;
      if (m.userData.noite) { m.gradientMap = rampa; m.needsUpdate = true; return m; }
      if (m.isMeshToonMaterial) return plastico(m);
      if (m.isMeshStandardMaterial && !m.userData.plastico) { m.metalness = 0; m.roughness = Math.min(m.roughness, 0.45); m.userData.plastico = true; }
      return m;
    };
    o.material = Array.isArray(o.material) ? o.material.map(troca) : troca(o.material);
    if (!prot && o.isMesh && o.parent) marcado.add(o);
  });
}

// ------------------------------------------------------------------ nuvens de blocos
function nuvens(cena) {
  const g = new THREE.Group();
  const topo = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), base = new THREE.MeshBasicMaterial({ color: 0xdbe7f6, fog: false });
  let sd = 7;
  const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const nuvem = (L) => {
    const n = new THREE.Group(), e = L / 8;
    const bl = (w, h, d, x, y, z, m) => { const k = new THREE.Mesh(geoCaixa(w, h, d), m); k.position.set(x, y, z); n.add(k); };
    bl(L, e * 1.1, e * 4.2, 0, 0, 0, base);                   // fundo plano, um tom mais frio
    bl(L * 0.92, e * 1.3, e * 4.0, 0, e * 1.1, 0, topo);       // corpo
    bl(L * 0.55, e * 1.5, e * 3.4, -L * 0.12, e * 2.4, 0, topo); // calombo grande
    bl(L * 0.3, e * 1.2, e * 2.8, L * 0.22, e * 2.2, 0, topo);   // calombo menor
    bl(L * 0.22, e * 1.0, e * 2.2, -L * 0.14, e * 3.5, 0, topo);
    return n;
  };
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, d = 170 + rnd() * 330, n = nuvem(60 + rnd() * 60);
    n.position.set(Math.cos(a) * d, 110 + rnd() * 50, 60 + Math.sin(a) * d * 0.9); n.rotation.y = rnd() * 0.5 - 0.25;
    g.add(n);
  }
  cena.add(g);
  return g;
}

// ------------------------------------------------------------------ montagem
function aoMontar(ctx) {
  Object.assign(B, ctx);
  const { cena, ceu, r3 } = ctx;
  protegido = ctx.rabisco.grupo;
  r3.toneMapping = THREE.NoToneMapping;       // cores saturadas, sem o apagado do filme
  r3.shadowMap.type = THREE.PCFShadowMap;
  ceu.sol.shadow.bias = -0.003; ceu.sol.shadow.normalBias = 0.3; // sem "pelo" de sombra nas paredes de plástico
  // luz suave: sombra simples e bastante luz ambiente
  const hora = ceu.hora.bind(ceu);
  ceu.hora = (h) => {
    hora(h);
    if (ceu.noite < 0.5) { // dia de céu limpo e azul (menos lavado) e luz suave
      ceu.sol.intensity *= 1.15; ceu.amb.intensity = 1.55;
      const u = ceu.esfera.material.uniforms; u.topo.value.setHex(0x4a9cee); u.horizonte.value.setHex(0xa6d3f6); cena.fog.color.setHex(0xb3d8f5);
    }
  };
  ceu.hora(ceu.horaAtual);
    B.nuvens = nuvens(cena);
  aplicar(cena);
}
let q = 0;
function aoQuadro() { if (++q % 12 === 0) aplicar(); }

if (B) {
  texturasDeBlocos();
  Object.assign(B, {
    geo, caixaReta: (w, h, d) => geoCaixa(w, h, d), placa: placaBloco, arvore, casa, loja, carro, carroFofo, praca, rodaGigante,
    morador: (tipo, o) => moradorBloco(tipo, o), aoMontar, aoQuadro, aplicar, pessoaBloco,
  });
}
void caixa;
