// Rabiscópolis: os prédios dos lugares (Igreja Reviver, hospital, bombeiros, escola, mercado, padaria,
// sorveteria), os prédios de enchimento, a praça (chafariz e coreto), o parque (lago, patinhos, parquinho),
// a Fazendinha (celeiro, silo, bichinhos) e os postes de luz. Tudo no traço de desenho animado: cantos
// arredondados, contorno preto e cores fortes. Janelas usam MAT.janela (acendem de noite).
// Convenção: cada prédio tem a frente em z = 0 (local), olhando para +z, e vai até z = -fundo.
// Cada função devolve { grupo, solidos } com os retângulos de colisão em coordenadas locais.

import { THREE, mat, malha, caixa, caixaRedonda, geoCaixaRedonda, MAT, TEX, letreiro, lojaParceira, arvoreReal, texturaCanvas, mesclar, r as rnd } from "./base3d.js";
import { escolaEducarte3D, onibus3D } from "../../src/motor3d/objetos.js";
import { carregarTextura } from "../../src/motor3d/toon.js";
import { ESTILO_PARCEIRO } from "../cidade-do-rabisco/parceiros.js";
import { cerquinha } from "./casas.js";

const BRANCO = 0xfffdf6;
const repetida = (t, x, y) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
const MAT_CALCADA = mat(0xffffff, { map: repetida(TEX.calcada, 9, 9) }), MAT_TERRA = mat(0xffffff, { map: repetida(TEX.terra, 1, 10) });
const novo = () => ({ grupo: new THREE.Group(), solidos: [] });
const sol = (S, x0, x1, z0, z1, y1 = 20) => S.solidos.push({ x0, x1, z0, z1, y1 });

// fileira de janelas na fachada (+z) de uma parede de largura w, em z (frente da parede)
function janelas(g, { w, andares, z, y0 = 1.2, alt = 3.2, jw = 1.4, jh = 1.5, cor = BRANCO, colunas = null, emX = false }) {
  const n = colunas ?? Math.max(1, Math.floor((w - 1) / 3));
  const geoM = new THREE.BoxGeometry(jw + 0.3, jh + 0.3, 0.14), geoV = new THREE.BoxGeometry(jw, jh, 0.16);
  for (let a = 0; a < andares; a++) for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w / n) * (i + 0.5), y = y0 + a * alt + jh / 2;
    const m = malha(geoM, mat(cor), { sombra: false }); const v = malha(geoV, a % 2 && i % 3 === 1 ? MAT.janelaQuente : MAT.janela, { sombra: false });
    if (emX) { m.position.set(z, y, x); v.position.set(z + 0.02 * Math.sign(z), y, x); m.rotation.y = v.rotation.y = Math.PI / 2; }
    else { m.position.set(x, y, z); v.position.set(x, y, z + 0.02); }
    g.add(m, v);
  }
}
// toldo listrado (meio cilindro deitado) de largura w na frente
const texListras = new Map();
function toldo(w, cor1, cor2) {
  const k = `${cor1}${cor2}`;
  if (!texListras.has(k)) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 16;
    const x = c.getContext("2d"); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? cor2 : cor1; x.fillRect(i * 32, 0, 32, 16); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; texListras.set(k, t);
  }
  const t = texListras.get(k).clone(); t.needsUpdate = true; t.repeat.set(w / 4, 1);
  const geo = new THREE.CylinderGeometry(1.2, 1.2, w, 20, 1, true, 0, Math.PI / 2);
  // as listras correm ao longo do comprimento: troca u/v
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v * (w / 4), u); }
  const m = malha(geo, new THREE.MeshToonMaterial({ map: t, side: THREE.DoubleSide }), { contorno: 0.05 });
  t.repeat.set(1, 1);
  m.rotation.z = Math.PI / 2; m.scale.set(1, 1, 0.8);
  return m;
}
function porta(g, { x = 0, z, w = 2.6, h = 3.2, cor = 0x2f6fc0, vidro = true }) {
  const mold = caixaRedonda(w + 0.4, h + 0.25, 0.2, mat(BRANCO), { raio: 0.08, contorno: 0.04 }); mold.position.set(x, h / 2, z); g.add(mold);
  const p = caixaRedonda(w, h, 0.22, vidro ? MAT.janela : mat(cor), { raio: 0.06 }); p.position.set(x, h / 2, z + 0.03); g.add(p);
  const meio = caixa(0.1, h, 0.25, mat(cor)); meio.position.set(x, h / 2, z + 0.04); g.add(meio);
}
// corpo de prédio: caixa arredondada com rodapé e beiral
function corpo(g, w, h, d, cor, { beiral = 0xffffff, rodape = null } = {}) {
  const c = caixaRedonda(w, h, d, mat(cor), { raio: 0.3, contorno: 0.12 }); c.position.set(0, h / 2, -d / 2); g.add(c);
  const b = caixaRedonda(w + 0.7, 0.55, d + 0.7, mat(beiral), { raio: 0.2, contorno: 0.06 }); b.position.set(0, h + 0.2, -d / 2); g.add(b);
  if (rodape != null) { const r = caixaRedonda(w + 0.15, 0.7, d + 0.15, mat(rodape), { raio: 0.2 }); r.position.set(0, 0.35, -d / 2); g.add(r); }
}
// placa com o nome em cima da porta
function nome(g, texto, { y, largura = 9, cor = "#00b5f0", z = 0.15 }) { const l = letreiro(texto, largura, { cor }); l.position.set(0, y, z); g.add(l); }

// ---------- poste de luz (lâmpada acende de noite)
export function posteLuz() {
  const g = new THREE.Group();
  const p = malha(new THREE.CylinderGeometry(0.09, 0.13, 4.6, 10), mat(0x2f3d5c), { contorno: 0.04, sombra: false }); p.position.y = 2.3; g.add(p);
  const base = malha(new THREE.CylinderGeometry(0.22, 0.26, 0.4, 10), mat(0x2f3d5c), { contorno: 0.03, sombra: false }); base.position.y = 0.2; g.add(base);
  const cupula = malha(new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x2f3d5c), { contorno: 0.04, sombra: false }); cupula.position.y = 4.95; g.add(cupula);
  const luz = malha(new THREE.SphereGeometry(0.3, 14, 10), MAT.lampada, { sombra: false }); luz.position.y = 4.75; g.add(luz);
  return g;
}
export function banco() {
  const g = new THREE.Group();
  g.userData.detalhe = true;
  const madeira = mat(0xd98a46);
  for (let i = 0; i < 3; i++) { const t = caixa(2.6, 0.1, 0.22, madeira, { contorno: 0.03, sombra: false }); t.position.set(0, 0.62, -0.25 + i * 0.25); g.add(t); }
  for (let i = 0; i < 2; i++) { const t = caixa(2.6, 0.22, 0.08, madeira, { contorno: 0.03, sombra: false }); t.position.set(0, 0.95 + i * 0.3, -0.4); g.add(t); }
  for (const x of [-1.1, 1.1]) { const pe = caixa(0.12, 0.62, 0.6, mat(0x2f3d5c), { sombra: false }); pe.position.set(x, 0.31, -0.1); g.add(pe); }
  return g;
}
export function canteiro(w, d) {
  const g = new THREE.Group();
  const flores = new THREE.Group(); flores.userData.detalhe = true; g.add(flores);
  const borda = caixaRedonda(w, 0.45, d, mat(0xe8dcc6), { raio: 0.15, contorno: 0.04 }); borda.position.y = 0.22; g.add(borda);
  const terra = caixa(w - 0.4, 0.1, d - 0.4, mat(0x7a5232)); terra.position.y = 0.46; g.add(terra);
  const cores = [0xff5fa2, 0xffcc1f, 0xffffff, 0xff7a3d, 0xb08cff, 0x4fb6ff];
  const n = Math.floor((w * d) / 0.7);
  for (let i = 0; i < n; i++) {
    const f = malha(new THREE.IcosahedronGeometry(0.16, 0), mat(cores[i % cores.length]), { sombra: false });
    f.position.set((rnd() - 0.5) * (w - 0.7), 0.62 + rnd() * 0.15, (rnd() - 0.5) * (d - 0.7)); flores.add(f);
    if (i % 2) { const fo = malha(new THREE.IcosahedronGeometry(0.2, 0), mat(0x4cb83f), { sombra: false }); fo.position.set(f.position.x + 0.15, 0.55, f.position.z); flores.add(fo); }
  }
  return g;
}

// ---------- Igreja Reviver: a frente é a foto (assets/parceiros/igreja-reviver.webp). Sem a foto, um prédio digno
// branco com detalhes azul-marinho (#1f3a8a), cruz, vitrais e o nome; quando a foto chega, ela vira a fachada.
export function igrejaReviver(l) {
  const S = novo(), g = S.grupo;
  const [W, D] = l.pegada;
  const MARINHO = 0x1f3a8a;
  // frente de foto (proporção ~1480 × 620): a mesma peça das lojas parceiras, maior
  const frente = lojaParceira({ nome: l.nome, tipo: "igreja" }, null, { foto: l.foto, estilo: ESTILO_PARCEIRO.igreja ?? { parede: 0xf4f6fb, beiral: MARINHO }, altura: 12, larguraMax: W - 2, d: D - 2 });
  g.add(frente);
  // fachada de reserva (some quando a foto chega)
  const reserva = new THREE.Group();
  reserva.userData.dinamico = true;
  const alt = Math.min(12, (W - 2) / (l.proporcao ?? 1.86)), larg = alt * (l.proporcao ?? 1.86);
  const faixa = caixaRedonda(larg + 0.2, 0.8, 0.3, mat(MARINHO), { raio: 0.1, contorno: 0.05 }); faixa.position.set(0, alt - 0.9, 0.12); reserva.add(faixa);
  const rod = caixaRedonda(larg + 0.2, 0.7, 0.3, mat(MARINHO), { raio: 0.1 }); rod.position.set(0, 0.35, 0.12); reserva.add(rod);
  for (const x of [-larg / 2 + 0.6, larg / 2 - 0.6, -3.2, 3.2]) { const c = caixaRedonda(0.9, alt - 1.4, 0.4, mat(0xe6eaf5), { raio: 0.12, contorno: 0.05 }); c.position.set(x, (alt - 1.4) / 2 + 0.3, 0.15); reserva.add(c); }
  porta(reserva, { z: 0.2, w: 4.2, h: 4.4, cor: MARINHO, vidro: false });
  for (const s of [-1, 1]) for (const k of [0, 1]) {
    const v = caixaRedonda(1.6, 2.6, 0.2, MAT.janelaQuente, { raio: 0.5, contorno: 0.05 }); v.position.set(s * (6 + k * 3.2), alt / 2 + 0.2, 0.18); reserva.add(v);
  }
  const placaNome = letreiro("Igreja Reviver", 9, { cor: "#1f3a8a", tinta: "#1f3a8a" }); placaNome.position.set(0, alt - 0.9, 0.32); reserva.add(placaNome);
  g.add(reserva);
  frente.userData.aoFoto = () => { reserva.visible = false; };
  // cruz no alto (aparece com ou sem foto) e torre baixinha atrás
  const torre = caixaRedonda(5, alt + 5, 5, mat(0xf4f6fb), { raio: 0.3, contorno: 0.1 }); torre.position.set(0, (alt + 5) / 2, -D + 4); g.add(torre);
  const teto = malha(new THREE.ConeGeometry(3.8, 3.2, 4), mat(MARINHO), { contorno: 0.1 }); teto.rotation.y = Math.PI / 4; teto.position.set(0, alt + 6.6, -D + 4); g.add(teto);
  const cruzV = caixaRedonda(0.4, 2.6, 0.4, mat(0xffd36b), { raio: 0.1, contorno: 0.05 }); cruzV.position.set(0, alt + 9.4, -D + 4); g.add(cruzV);
  const cruzH = caixaRedonda(1.6, 0.4, 0.4, mat(0xffd36b), { raio: 0.1, contorno: 0.05 }); cruzH.position.set(0, alt + 9.8, -D + 4); g.add(cruzH);
  // escadaria larga na frente
  for (let i = 0; i < 3; i++) { const d = caixaRedonda(10 - i * 1.2, 0.22, 1.2 - i * 0.25, mat(0xe8e2d6), { raio: 0.06, contorno: 0.03 }); d.position.set(0, 0.11 + i * 0.22, 0.9 - i * 0.3); g.add(d); }
  sol(S, -W / 2 + 1, W / 2 - 1, -D + 2, 0, 20);
  S.foto = frente;
  return S;
}

export function hospital(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const h = 11;
  corpo(g, W, h, D - 2, 0xf7fbff, { beiral: 0x4fb6ff, rodape: 0x8fd0ff });
  janelas(g, { w: W - 1, andares: 3, z: 0.02, y0: 1.4, alt: 3.3, colunas: 4 });
  // cruz vermelha arredondada e marquise de entrada
  const c1 = caixaRedonda(3.2, 1.1, 0.4, mat(0xe8413c), { raio: 0.3, contorno: 0.06 }), c2 = caixaRedonda(1.1, 3.2, 0.4, mat(0xe8413c), { raio: 0.3, contorno: 0.06 });
  c1.position.set(0, h - 1.6, 0.25); c2.position.set(0, h - 1.6, 0.25); g.add(c1, c2);
  const marq = caixaRedonda(7, 0.35, 3, mat(0x4fb6ff), { raio: 0.12, contorno: 0.05 }); marq.position.set(0, 3.9, 1.3); g.add(marq);
  for (const x of [-3.2, 3.2]) { const p = malha(new THREE.CylinderGeometry(0.15, 0.15, 3.8, 10), mat(BRANCO), { contorno: 0.03 }); p.position.set(x, 1.9, 2.5); g.add(p); }
  porta(g, { z: 0.05, w: 3.2, h: 3.2 });
  nome(g, "Hospital Cuidar", { y: 5.1, largura: 7.5, cor: "#e8413c" });
  sol(S, -W / 2, W / 2, -D + 2, 0, 20);
  return S;
}
export function bombeiros(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const h = 7.5;
  corpo(g, W, h, D - 2, 0xe8413c, { beiral: 0xffffff, rodape: 0xb83228 });
  for (const x of [-3.6, 3.6]) {
    const port = caixaRedonda(5.4, 5, 0.3, mat(0xf2f2f2), { raio: 0.2, contorno: 0.05 }); port.position.set(x, 2.6, 0.08); g.add(port);
    for (let i = 0; i < 6; i++) { const f = caixa(5.2, 0.08, 0.32, mat(0xc8ccd2)); f.position.set(x, 0.6 + i * 0.75, 0.1); g.add(f); }
    const arco = malha(new THREE.TorusGeometry(2.7, 0.18, 8, 24, Math.PI), mat(0xffcc1f), { contorno: 0.03 }); arco.position.set(x, 5.1, 0.2); g.add(arco);
  }
  // torre do sino de alarme
  const torre = caixaRedonda(3.4, 4, 3.4, mat(0xe8413c), { raio: 0.25, contorno: 0.08 }); torre.position.set(W / 2 - 2.4, h + 2, -D + 4); g.add(torre);
  const sino = malha(new THREE.SphereGeometry(0.75, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.6), mat(0xffcc1f), { contorno: 0.05 }); sino.position.set(W / 2 - 2.4, h + 4.6, -D + 4); g.add(sino);
  const tt = malha(new THREE.ConeGeometry(2.6, 1.6, 4), mat(0xffffff), { contorno: 0.06 }); tt.rotation.y = Math.PI / 4; tt.position.set(W / 2 - 2.4, h + 5.9, -D + 4); g.add(tt);
  nome(g, "Bombeiros", { y: 6.5, largura: 6.5, cor: "#e8413c" });
  sol(S, -W / 2, W / 2, -D + 2, 0, 20);
  return S;
}
// a escola oficial (escolaEducarte3D), encaixada na pegada
export function escola(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const e = escolaEducarte3D(carregarTextura("../../assets/marca/logos/azul-icone-rosa.png"), carregarTextura("../../assets/marca/logos/icone-branco.png"));
  const caixaE = new THREE.Box3().setFromObject(e);
  const k = Math.min(W / (caixaE.max.x - caixaE.min.x), D / (caixaE.max.z - caixaE.min.z));
  e.scale.setScalar(k);
  e.position.set(-(caixaE.min.x + caixaE.max.x) / 2 * k, 0, -caixaE.max.z * k);
  g.add(e);
  // colisão só no prédio (corpo e alas: x ±15, z ±3.5 na escala original)
  const zc = e.position.z, z0 = zc - 3.6 * k, z1 = zc + 3.8 * k;
  sol(S, -15 * k, 15 * k, z0, z1, 20);
  if (e.userData.balanco) e.userData.balanco.parent.userData.dinamico = true;
  return S;
}
export function mercado(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const h = 6.5;
  corpo(g, W, h, D, 0xd9f2c9, { beiral: 0x2bb24c, rodape: 0x9ad58a });
  const vitrine = caixaRedonda(W - 3, 2.8, 0.2, MAT.janela, { raio: 0.1, contorno: 0.05 }); vitrine.position.set(0, 1.9, 0.06); g.add(vitrine);
  const t = toldo(W - 1, "#2bb24c", "#ffffff"); t.position.set(0, 4.1, 0.1); g.add(t);
  porta(g, { z: 0.2, w: 3, h: 3.1, cor: 0x2bb24c });
  nome(g, "Mercado Cesta Cheia", { y: 5.6, largura: 10, cor: "#2bb24c" });
  // caixotes de frutas na calçada
  const cores = [0xe8413c, 0xff9f1c, 0xffd84a, 0x58c43a];
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + 2 + i * 1.6;
    const cx = caixaRedonda(1.3, 0.7, 0.9, mat(0xc98a4b), { raio: 0.06, contorno: 0.03 }); cx.position.set(x, 0.35, 1.0); g.add(cx);
    for (let k = 0; k < 6; k++) { const f = malha(new THREE.SphereGeometry(0.2, 10, 8), mat(cores[i]), { sombra: false }); f.position.set(x - 0.4 + (k % 3) * 0.4, 0.82, 0.8 + Math.floor(k / 3) * 0.35); g.add(f); }
  }
  sol(S, -W / 2, W / 2, -D, 0, 20); sol(S, -W / 2 + 1.2, -W / 2 + 7.2, 0.4, 1.6, 0.9);
  return S;
}
export function padaria(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const h = 6;
  corpo(g, W, h, D, 0xfbe6c4, { beiral: 0x8a4b2a, rodape: 0xd9a46b });
  const vitrine = caixaRedonda(W - 6.5, 2.2, 0.2, MAT.janelaQuente, { raio: 0.1, contorno: 0.05 }); vitrine.position.set(-2, 1.9, 0.06); g.add(vitrine);
  const t = toldo(W - 1, "#8a4b2a", "#fbe6c4"); t.position.set(0, 3.9, 0.1); g.add(t);
  porta(g, { x: W / 2 - 2.6, z: 0.2, w: 2.4, h: 3, cor: 0x8a4b2a });
  // pãozão em cima do letreiro
  const pao = malha(new THREE.CapsuleGeometry(0.8, 2.4, 6, 16), mat(0xe0a050), { contorno: 0.08 }); pao.rotation.z = Math.PI / 2; pao.position.set(0, h + 1.3, -1); g.add(pao);
  for (let i = -1; i <= 1; i++) { const c = caixa(0.12, 0.5, 1.4, mat(0xfbe6c4)); c.position.set(i * 0.8, h + 2.0, -1); c.rotation.z = 0.5; g.add(c); }
  nome(g, "Padaria", { y: 5.2, largura: 7, cor: "#8a4b2a" });
  sol(S, -W / 2, W / 2, -D, 0, 20);
  return S;
}
export function sorveteria(l) {
  const S = novo(), g = S.grupo; const [W, D] = l.pegada;
  const h = 5.8;
  corpo(g, W, h, D, 0xffd6e8, { beiral: 0x7fe0d0, rodape: 0xff9cc8 });
  const vitrine = caixaRedonda(W - 6.5, 2.2, 0.2, MAT.janela, { raio: 0.1, contorno: 0.05 }); vitrine.position.set(2, 1.9, 0.06); g.add(vitrine);
  const t = toldo(W - 1, "#ff6fae", "#ffffff"); t.position.set(0, 3.9, 0.1); g.add(t);
  porta(g, { x: -W / 2 + 2.6, z: 0.2, w: 2.4, h: 3, cor: 0xff6fae });
  // casquinha gigante no telhado
  const casq = malha(new THREE.ConeGeometry(1.1, 3, 18), mat(0xe8a85a), { contorno: 0.08 }); casq.rotation.x = Math.PI; casq.position.set(0, h + 2.1, -2); g.add(casq);
  const bolas = [[0xff8cc0, 0], [0x8fe3cf, 1.05], [0xfff0c9, 1.95]];
  for (const [c, y] of bolas) { const b = malha(new THREE.SphereGeometry(1.15 - y * 0.12, 18, 14), mat(c), { contorno: 0.08 }); b.position.set(0, h + 3.8 + y, -2); g.add(b); }
  const cer = malha(new THREE.SphereGeometry(0.32, 12, 10), mat(0xe8213a), { contorno: 0.04 }); cer.position.set(0, h + 6.95, -2); g.add(cer);
  nome(g, "Sorveteria", { y: 5.0, largura: 7, cor: "#ff6fae" });
  sol(S, -W / 2, W / 2, -D, 0, 20);
  return S;
}
export function lojaDeParceiro(l, aoMudar) {
  const S = novo();
  const loja = lojaParceira(l.parceiro, aoMudar);
  S.grupo.add(loja);
  S.loja = loja;
  return S;
}

// ---------- prédios de enchimento (moradias): prédio de janelas com sacadas ou sobrado de telhado
export function predioEnchimento(p) {
  const S = novo(), g = S.grupo;
  const { w, d, andares, cor } = p;
  const c = new THREE.Color(cor).getHex();
  if (p.tipo === "sobrado") {
    const h = 6.4;
    corpo(g, w, h, d, c, { beiral: 0xffffff, rodape: new THREE.Color(cor).multiplyScalar(0.8).getHex() });
    const tel = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.5, 0), new THREE.Vector2(w / 2 + 0.5, 0), new THREE.Vector2(0, 3)]);
    const geo = new THREE.ExtrudeGeometry(tel, { depth: d + 0.8, bevelEnabled: false }); geo.translate(0, 0, -(d + 0.8) / 2);
    const t = malha(geo, mat([0xd94a3d, 0x2f6fc0, 0x3c9a4a, 0x7a52c9][Math.floor(rnd() * 4)]), { contorno: 0.1 }); t.position.set(0, h + 0.45, -d / 2); g.add(t);
    janelas(g, { w, andares: 2, z: 0.02, y0: 1.1, alt: 3.0, colunas: 3 });
    porta(g, { z: 0.1, w: 1.8, h: 2.6, cor: 0x8a4b2a, vidro: false });
  } else {
    const h = andares * 3.2 + 0.6;
    corpo(g, w, h, d, c, { beiral: 0xffffff, rodape: new THREE.Color(cor).multiplyScalar(0.8).getHex() });
    janelas(g, { w, andares, z: 0.02, y0: 1.0, alt: 3.2, colunas: Math.max(2, Math.floor(w / 3.4)) });
    for (const s of [-1, 1]) {
      const lado = new THREE.Group(); lado.position.set(s * (w / 2 + 0.02), 0, -d / 2); lado.rotation.y = s * Math.PI / 2; g.add(lado);
      janelas(lado, { w: d - 1, andares, z: 0, y0: 1.0, alt: 3.2, colunas: Math.max(1, Math.floor(d / 4)) });
    }
    // sacadas coloridas
    const corSac = [0xff7a00, 0x00b5f0, 0xec2e8c, 0x58c43a][Math.floor(rnd() * 4)];
    for (let a = 1; a < andares; a++) { const s = caixaRedonda(w * 0.5, 0.9, 1.0, mat(corSac), { raio: 0.12, contorno: 0.04 }); s.position.set(0, a * 3.2 + 0.45, 0.5); g.add(s); }
    porta(g, { z: 0.1, w: 2.2, h: 2.8, cor: 0x2f3d5c });
    // caixa d'água no teto
    const cx = caixaRedonda(2.4, 1.6, 2.4, mat(0xdfe6ee), { raio: 0.2, contorno: 0.05 }); cx.position.set(w / 4, h + 1.2, -d / 2); g.add(cx);
  }
  sol(S, -w / 2, w / 2, -d, 0, 30);
  return S;
}

// ---------- praça: piso, chafariz, coreto, canteiros, bancos, postes e árvores (centro em 0,0 local)
export function praca(raio) {
  const S = novo(), g = S.grupo;
  const piso = new THREE.Mesh(new THREE.CircleGeometry(raio, 48), MAT_CALCADA); piso.rotation.x = -Math.PI / 2; piso.position.y = 0.06; piso.receiveShadow = true; g.add(piso);
  const grama = new THREE.Mesh(new THREE.RingGeometry(raio - 6.2, raio - 2.2, 48), mat(0x7ccf52)); grama.rotation.x = -Math.PI / 2; grama.position.y = 0.075; grama.receiveShadow = true; g.add(grama);
  // chafariz de três pratos
  const pedra = mat(0xe8e2d6);
  const borda = malha(new THREE.CylinderGeometry(4.2, 4.4, 0.9, 36), pedra, { contorno: 0.08 }); borda.position.y = 0.45; g.add(borda);
  const agua = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.2, 36), new THREE.MeshToonMaterial({ color: 0x4fc3ff, emissive: 0x0a3a66, emissiveIntensity: 0.3 })); agua.position.y = 0.82; agua.userData.dinamico = true; g.add(agua);
  const col = malha(new THREE.CylinderGeometry(0.45, 0.7, 2.6, 16), pedra, { contorno: 0.05 }); col.position.y = 1.6; g.add(col);
  const prato = malha(new THREE.CylinderGeometry(1.7, 1.1, 0.35, 24), pedra, { contorno: 0.05 }); prato.position.y = 2.9; g.add(prato);
  const prato2 = malha(new THREE.CylinderGeometry(0.9, 0.55, 0.3, 20), pedra, { contorno: 0.04 }); prato2.position.y = 3.9; g.add(prato2);
  const col2 = malha(new THREE.CylinderGeometry(0.22, 0.3, 1.0, 12), pedra); col2.position.y = 3.4; g.add(col2);
  const jato = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 14, 1, true), new THREE.MeshToonMaterial({ color: 0xc8f0ff, transparent: true, opacity: 0.7 })); jato.position.y = 4.8; jato.userData.dinamico = true; g.add(jato);
  sol(S, -4.4, 4.4, -4.4, 4.4, 1.0);
  S.agua = agua; S.jato = jato;
  // canteiros, bancos e postes em volta
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const cx = Math.sin(a) * 9.5, cz = Math.cos(a) * 9.5;
    const c = canteiro(3.6, 2.2); c.position.set(cx, 0, cz); c.rotation.y = a; g.add(c);
    sol(S, cx - 1.9, cx + 1.9, cz - 1.9, cz + 1.9, 0.6);
    const b = banco(); b.position.set(Math.sin(a + Math.PI / 4) * 7.2, 0.06, Math.cos(a + Math.PI / 4) * 7.2); b.rotation.y = a + Math.PI / 4 + Math.PI; g.add(b);
    const p = posteLuz(); p.position.set(Math.sin(a + 0.38) * 13.5, 0.06, Math.cos(a + 0.38) * 13.5); g.add(p);
    sol(S, p.position.x - 0.25, p.position.x + 0.25, p.position.z - 0.25, p.position.z + 0.25, 5);
    const t = arvoreReal(1.15, i); t.position.set(Math.sin(a) * 13.8, 0.06, Math.cos(a) * 13.8); g.add(t);
    sol(S, t.position.x - 0.5, t.position.x + 0.5, t.position.z - 0.5, t.position.z + 0.5, 6);
  }
  return S;
}

// ---------- patinho (para o lago)
export function patinho(cor = 0xffd84a) {
  const g = new THREE.Group();
  const c = malha(new THREE.SphereGeometry(0.42, 14, 10), mat(cor), { contorno: 0.04 }); c.scale.set(1, 0.72, 1.3); c.position.y = 0.2; g.add(c);
  const cab = malha(new THREE.SphereGeometry(0.27, 14, 10), mat(cor), { contorno: 0.04 }); cab.position.set(0, 0.62, 0.36); g.add(cab);
  const bico = malha(new THREE.SphereGeometry(0.12, 10, 8), mat(0xff8a1f), { contorno: 0.02 }); bico.scale.set(1.2, 0.5, 1.4); bico.position.set(0, 0.58, 0.62); g.add(bico);
  for (const s of [-1, 1]) { const o = malha(new THREE.SphereGeometry(0.06, 8, 6), mat(0x151515), { sombra: false }); o.position.set(s * 0.13, 0.7, 0.55); g.add(o); }
  mesclar(g); // por dentro nada mexe
  g.userData.dinamico = true;
  return g;
}
// ---------- parque: lago com patinhos e pontinha de pedras, parquinho, caminhos, bancos e muitas árvores
export function parque(P, lago, play) {
  const S = novo(), g = S.grupo;
  const cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;
  void cx; void cz;
  // caminho de terra até o lago
  const cam = new THREE.Mesh(new THREE.PlaneGeometry(3.2, lago.z - lago.r - P.z0 + 1), MAT_TERRA); cam.rotation.x = -Math.PI / 2; cam.position.set(0, 0.045, (P.z0 + lago.z - lago.r) / 2); g.add(cam);
  const areia = new THREE.Mesh(new THREE.RingGeometry(lago.r - 0.4, lago.r + 1.6, 48), mat(0xf0dca0)); areia.rotation.x = -Math.PI / 2; areia.position.set(lago.x, 0.05, lago.z); g.add(areia);
  const agua = new THREE.Mesh(new THREE.CircleGeometry(lago.r, 48), new THREE.MeshToonMaterial({ color: 0x3fb6f5, emissive: 0x0a3a66, emissiveIntensity: 0.25 })); agua.rotation.x = -Math.PI / 2; agua.position.set(lago.x, 0.07, lago.z); agua.userData.dinamico = true; g.add(agua);
  // pedrinhas na beira e vitórias-régias
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; const p = malha(new THREE.IcosahedronGeometry(0.45 + rnd() * 0.3, 0), mat(0xc9c2b4), { contorno: 0.04, sombra: false }); p.scale.y = 0.55; p.userData.detalhe = true; p.position.set(lago.x + Math.cos(a) * (lago.r + 0.6), 0.15, lago.z + Math.sin(a) * (lago.r + 0.6)); g.add(p); }
  for (let i = 0; i < 6; i++) { const a = rnd() * 6.28, rr = 4 + rnd() * (lago.r - 6); const f = malha(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 14, 1, false, 0.4, 5.6), mat(0x4cb83f), { sombra: false }); f.position.set(lago.x + Math.cos(a) * rr, 0.1, lago.z + Math.sin(a) * rr); g.add(f); }
  S.solidos.push({ circulo: true, x: lago.x, z: lago.z, r: lago.r - 0.4 });
  const patos = [];
  for (let i = 0; i < 5; i++) { const p = patinho(i === 2 ? 0xffffff : 0xffd84a); p.position.set(lago.x, 0.12, lago.z); g.add(p); patos.push({ p, a: (i / 5) * 6.28, r: 4 + (i % 3) * 2.5, v: 0.12 + i * 0.03 }); }
  S.patos = patos; S.agua = agua; S.lago = lago;
  // parquinho: balanço, escorregador e gira-gira em areia
  const piso = new THREE.Mesh(new THREE.CircleGeometry(8, 32), mat(0xf0dca0)); piso.rotation.x = -Math.PI / 2; piso.position.set(play.x, 0.045, play.z); g.add(piso);
  const metal = mat(0xec2e8c);
  for (const x of [-2.2, 2.2]) for (const z of [-0.8, 0.8]) { const p = malha(new THREE.CylinderGeometry(0.12, 0.12, 4, 8), metal, { contorno: 0.03 }); p.position.set(play.x - 3 + x, 2, play.z + z); p.rotation.x = z > 0 ? -0.2 : 0.2; g.add(p); }
  const trave = malha(new THREE.CylinderGeometry(0.13, 0.13, 4.8, 8), metal, { contorno: 0.03 }); trave.rotation.z = Math.PI / 2; trave.position.set(play.x - 3, 3.9, play.z); g.add(trave);
  for (const x of [-1, 1]) { const a = caixaRedonda(0.9, 0.12, 0.5, mat(0xffcc1f), { raio: 0.05, contorno: 0.03 }); a.position.set(play.x - 3 + x, 1.1, play.z); g.add(a); for (const s of [-0.35, 0.35]) { const c = caixa(0.04, 2.7, 0.04, mat(0x9aa3ad)); c.position.set(play.x - 3 + x + s, 2.5, play.z); g.add(c); } }
  sol(S, play.x - 5.6, play.x - 0.4, play.z - 1.2, play.z + 1.2, 4.5);
  const torre = caixaRedonda(1.8, 2.6, 1.8, mat(0xff7a00), { raio: 0.2, contorno: 0.06 }); torre.position.set(play.x + 3, 1.3, play.z - 1.5); g.add(torre);
  const tetoT = malha(new THREE.ConeGeometry(1.6, 1.4, 4), mat(0x00b5f0), { contorno: 0.05 }); tetoT.rotation.y = Math.PI / 4; tetoT.position.set(play.x + 3, 3.3, play.z - 1.5); g.add(tetoT);
  const esc = caixaRedonda(1.2, 0.18, 4.6, mat(0x00b5f0), { raio: 0.08, contorno: 0.04 }); esc.position.set(play.x + 3, 1.35, play.z + 1.5); esc.rotation.x = 0.55; g.add(esc);
  sol(S, play.x + 2, play.x + 4, play.z - 2.5, play.z - 0.5, 2.6);
  const gira = malha(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 24), mat(0x58c43a), { contorno: 0.04 }); gira.position.set(play.x, 0.45, play.z + 4); g.add(gira);
  // bancos e postes em volta do lago, e árvores pelo parque
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; const b = banco(); b.position.set(lago.x + Math.cos(a) * (lago.r + 4), 0.04, lago.z + Math.sin(a) * (lago.r + 4)); b.rotation.y = -a - Math.PI / 2; g.add(b); const p = posteLuz(); p.position.set(lago.x + Math.cos(a + 0.4) * (lago.r + 4.5), 0.04, lago.z + Math.sin(a + 0.4) * (lago.r + 4.5)); g.add(p); }
  for (let n = 0; n < 34; n++) {
    const x = P.x0 + 2 + rnd() * (P.x1 - P.x0 - 4), z = P.z0 + 3 + rnd() * (P.z1 - P.z0 - 5);
    if (Math.hypot(x - lago.x, z - lago.z) < lago.r + 6 || Math.hypot(x - play.x, z - play.z) < 10 || Math.abs(x) < 3) continue;
    const a = arvoreReal(0.9 + rnd() * 0.5, n); a.position.set(x, 0.03, z); g.add(a);
    sol(S, x - 0.5, x + 0.5, z - 0.5, z + 0.5, 6);
  }
  return S;
}

// ---------- Fazendinha: celeiro vermelho, silo, cercado com vaquinha, ovelhinhas e galinhas, e a horta
function bicho(tipo) {
  const g = new THREE.Group();
  g.userData.dinamico = true;
  if (tipo === "vaca") {
    const c = malha(geoCaixaRedonda(1.3, 1.0, 2.0, 0.4), mat(0xffffff), { contorno: 0.05 }); c.position.y = 1.0; g.add(c);
    for (const [x, z, s] of [[0.3, 0.3, 0.35], [-0.4, -0.4, 0.3], [0.2, -0.7, 0.25]]) { const m = malha(new THREE.SphereGeometry(s, 10, 8), mat(0x2a2a2a)); m.scale.set(0.5, 1, 1); m.position.set(0.62 * Math.sign(x), 1.05, z); g.add(m); }
    const cab = malha(geoCaixaRedonda(0.85, 0.8, 0.8, 0.3), mat(0xffffff), { contorno: 0.05 }); cab.position.set(0, 1.5, 1.2); g.add(cab);
    const foc = malha(geoCaixaRedonda(0.8, 0.4, 0.3, 0.15), mat(0xffb6c8), { contorno: 0.03 }); foc.position.set(0, 1.3, 1.62); g.add(foc);
    for (const s of [-1, 1]) { const ch = malha(new THREE.ConeGeometry(0.08, 0.3, 8), mat(0xfff0c9)); ch.position.set(s * 0.32, 2.0, 1.15); ch.rotation.z = -s * 0.4; g.add(ch); const o = malha(new THREE.SphereGeometry(0.09, 8, 6), mat(0x151515)); o.position.set(s * 0.2, 1.62, 1.6); g.add(o); }
    for (const [x, z] of [[-0.4, 0.6], [0.4, 0.6], [-0.4, -0.6], [0.4, -0.6]]) { const p = malha(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 8), mat(0xffffff), { contorno: 0.03 }); p.position.set(x, 0.3, z); g.add(p); }
  } else if (tipo === "ovelha") {
    for (let i = 0; i < 7; i++) { const b = malha(new THREE.SphereGeometry(0.42, 12, 10), mat(0xfdfdfd), { contorno: 0.04 }); b.position.set((i % 3 - 1) * 0.35, 0.85 + (i > 4 ? 0.25 : 0), (Math.floor(i / 3) - 1) * 0.35); g.add(b); }
    const cab = malha(new THREE.SphereGeometry(0.3, 12, 10), mat(0x3a3a3a), { contorno: 0.04 }); cab.scale.z = 1.2; cab.position.set(0, 1.0, 0.7); g.add(cab);
    for (const s of [-1, 1]) { const o = malha(new THREE.SphereGeometry(0.07, 8, 6), mat(0xffffff)); o.position.set(s * 0.12, 1.08, 0.98); g.add(o); }
    for (const [x, z] of [[-0.25, 0.3], [0.25, 0.3], [-0.25, -0.3], [0.25, -0.3]]) { const p = malha(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), mat(0x3a3a3a)); p.position.set(x, 0.25, z); g.add(p); }
  } else {
    const c = malha(new THREE.SphereGeometry(0.3, 12, 10), mat(0xffffff), { contorno: 0.03 }); c.scale.set(0.9, 1, 1.1); c.position.y = 0.42; g.add(c);
    const cab = malha(new THREE.SphereGeometry(0.18, 10, 8), mat(0xffffff), { contorno: 0.03 }); cab.position.set(0, 0.78, 0.2); g.add(cab);
    const crista = malha(new THREE.SphereGeometry(0.08, 8, 6), mat(0xe8213a)); crista.scale.set(0.6, 1.2, 1.2); crista.position.set(0, 0.98, 0.2); g.add(crista);
    const bico = malha(new THREE.ConeGeometry(0.06, 0.14, 6), mat(0xffa21f)); bico.rotation.x = Math.PI / 2; bico.position.set(0, 0.76, 0.42); g.add(bico);
    for (const s of [-1, 1]) { const p = malha(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 5), mat(0xffa21f)); p.position.set(s * 0.1, 0.1, 0); g.add(p); }
  }
  g.userData.dinamico = false; mesclar(g); g.userData.dinamico = true; // por dentro nada mexe
  return g;
}
export function fazendinha(l, F) {
  const S = novo(), g = S.grupo;
  // chão de terra/grama do sítio (coordenadas do mundo; o grupo fica na origem)
  const cx = (F.x0 + F.x1) / 2, cz = (F.z0 + F.z1) / 2;
  void cx; void cz;
  // celeiro
  const bx = F.x0 + 16, bz = F.z0 + 22;
  const cel = new THREE.Group(); cel.position.set(bx, 0, bz); cel.rotation.y = Math.PI; g.add(cel);
  const W = 14, D = 12, H = 7;
  const paredes = caixaRedonda(W, H, D, mat(0xd6402f), { raio: 0.3, contorno: 0.12 }); paredes.position.set(0, H / 2, -D / 2); cel.add(paredes);
  const tel = new THREE.Shape([new THREE.Vector2(-W / 2 - 0.6, 0), new THREE.Vector2(-W / 2 + 1.5, 3.2), new THREE.Vector2(0, 4.4), new THREE.Vector2(W / 2 - 1.5, 3.2), new THREE.Vector2(W / 2 + 0.6, 0)]);
  const geoT = new THREE.ExtrudeGeometry(tel, { depth: D + 1, bevelEnabled: false }); geoT.translate(0, 0, -(D + 1) / 2);
  const t = malha(geoT, mat(0x4a4f5c), { contorno: 0.12 }); t.position.set(0, H, -D / 2); cel.add(t);
  const fr = new THREE.Shape([new THREE.Vector2(-W / 2 + 0.2, 0), new THREE.Vector2(-W / 2 + 1.6, 3.1), new THREE.Vector2(0, 4.2), new THREE.Vector2(W / 2 - 1.6, 3.1), new THREE.Vector2(W / 2 - 0.2, 0)]);
  const f = malha(new THREE.ExtrudeGeometry(fr, { depth: 0.2, bevelEnabled: false }), mat(0xd6402f)); f.position.set(0, H, -0.1); cel.add(f);
  const portao = caixaRedonda(5, 5, 0.3, mat(0xffffff), { raio: 0.15, contorno: 0.05 }); portao.position.set(0, 2.6, 0.1); cel.add(portao);
  const portaoV = caixaRedonda(4.2, 4.3, 0.34, mat(0xd6402f), { raio: 0.1 }); portaoV.position.set(0, 2.5, 0.12); cel.add(portaoV);
  for (const s of [-1, 1]) { const x = caixa(0.3, 5.6, 0.36, mat(0xffffff)); x.position.set(0, 2.5, 0.14); x.rotation.z = s * 0.75; cel.add(x); }
  const jan = caixaRedonda(2, 1.6, 0.3, MAT.janelaQuente, { raio: 0.2, contorno: 0.05 }); jan.position.set(0, H + 1.6, 0.05); cel.add(jan);
  S.solidos.push({ x0: bx - W / 2, x1: bx + W / 2, z0: bz, z1: bz + D, y1: 20 });
  // silo
  const silo = malha(new THREE.CylinderGeometry(2.4, 2.4, 10, 24), mat(0xdfe6ee), { contorno: 0.1 }); silo.position.set(bx + 10, 5, bz + 6); g.add(silo);
  const cup = malha(new THREE.SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd6402f), { contorno: 0.1 }); cup.position.set(bx + 10, 10, bz + 6); g.add(cup);
  for (let i = 0; i < 4; i++) { const a = malha(new THREE.TorusGeometry(2.42, 0.07, 6, 32), mat(0x9aa3ad)); a.rotation.x = Math.PI / 2; a.position.set(bx + 10, 2 + i * 2.2, bz + 6); g.add(a); }
  S.solidos.push({ circulo: true, x: bx + 10, z: bz + 6, r: 2.5 });
  // cercado com bichinhos
  const cx0 = F.x0 + 32, cz0 = F.z0 + 8, cw = 26, cd = 22;
  const madeira = 0xc98a4b;
  for (const [x, z, comp, rot] of [[cx0, cz0, cw, 0], [cx0, cz0 + cd, cw, 0], [cx0, cz0, cd, -Math.PI / 2], [cx0 + cw, cz0, cd, -Math.PI / 2]]) {
    const c = cerquinha(comp, { cor: madeira, altura: 1.2 }); c.position.set(x, 0.03, z); c.rotation.y = rot; g.add(c);
  }
  S.solidos.push({ x0: cx0 - 0.2, x1: cx0 + cw + 0.2, z0: cz0 - 0.25, z1: cz0 + 0.25, y1: 1.3 }, { x0: cx0 - 0.2, x1: cx0 + cw + 0.2, z0: cz0 + cd - 0.25, z1: cz0 + cd + 0.25, y1: 1.3 });
  S.solidos.push({ x0: cx0 - 0.25, x1: cx0 + 0.25, z0: cz0, z1: cz0 + cd, y1: 1.3 }, { x0: cx0 + cw - 0.25, x1: cx0 + cw + 0.25, z0: cz0, z1: cz0 + cd, y1: 1.3 });
  const bichos = [];
  for (const [tipo, n] of [["vaca", 2], ["ovelha", 3], ["galinha", 5]]) for (let i = 0; i < n; i++) {
    const b = bicho(tipo); const x = cx0 + 3 + rnd() * (cw - 6), z = cz0 + 3 + rnd() * (cd - 6);
    b.position.set(x, 0.03, z); b.rotation.y = rnd() * 6.28; g.add(b);
    bichos.push({ g: b, tipo, x0: cx0 + 2, x1: cx0 + cw - 2, z0: cz0 + 2, z1: cz0 + cd - 2, alvo: [x, z], v: tipo === "galinha" ? 1.6 : 0.7, fase: rnd() * 6 });
  }
  S.bichos = bichos;
  // horta: canteiros de terra com cenouras e repolhos (verduras somem de longe)
  const horta = new THREE.Group(); horta.userData.detalhe = true; g.add(horta);
  for (let k = 0; k < 5; k++) {
    const hx = F.x0 + 5, hz = F.z0 + 40 + k * 4.5;
    const terra = caixaRedonda(24, 0.4, 2.4, mat(0x8a5a32), { raio: 0.15, contorno: 0.04 }); terra.position.set(hx + 12, 0.2, hz); g.add(terra);
    for (let i = 0; i < 10; i++) {
      const vx = hx + 1.4 + i * 2.3;
      if (k % 2) { const c = malha(new THREE.IcosahedronGeometry(0.45, 1), mat(0x7ed957), { sombra: false }); c.position.set(vx, 0.65, hz); horta.add(c); }
      else { const fo = malha(new THREE.ConeGeometry(0.25, 0.7, 5), mat(0x4cb83f), { sombra: false }); fo.position.set(vx, 0.75, hz); horta.add(fo); const ce = malha(new THREE.ConeGeometry(0.16, 0.4, 6), mat(0xff8a1f), { sombra: false }); ce.rotation.x = Math.PI; ce.position.set(vx, 0.45, hz); horta.add(ce); }
    }
  }
  // espantalho simpático e fardos de feno
  for (let i = 0; i < 4; i++) { const fe = malha(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 16), mat(0xf2cf5b), { contorno: 0.06 }); fe.rotation.z = Math.PI / 2; fe.position.set(bx - 4 + i * 2.1, 0.9, bz - 3); g.add(fe); }
  S.solidos.push({ x0: bx - 5, x1: bx + 3.4, z0: bz - 4, z1: bz - 2, y1: 1.8 });
  // árvores em volta
  for (let n = 0; n < 10; n++) { const x = F.x0 + 2 + rnd() * (F.x1 - F.x0 - 4), z = F.z1 - 2 - rnd() * 8; const a = arvoreReal(1 + rnd() * 0.4, n); a.position.set(x, 0.03, z); g.add(a); S.solidos.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5, y1: 6 }); }
  return S;
}
// ---------- Esportes: campo de futebol (gramado listrado com linhas, gols com rede, bandeirinhas, bola,
// arquibancada colorida e vestiário), quadra poliesportiva (piso azul e laranja, tabelas de basquete) e horta
const texCampo = (w, d) => texturaCanvas(256, Math.round((256 * d) / w), (c, W, H) => {
  const k = W / w;
  for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? "#5cc443" : "#6fd257"; c.fillRect(0, (i * H) / 10, W, H / 10 + 1); }
  c.strokeStyle = "#ffffff"; c.lineWidth = Math.max(2, 0.18 * k);
  const m = 1.2 * k;
  c.strokeRect(m, m, W - 2 * m, H - 2 * m);
  c.beginPath(); c.moveTo(m, H / 2); c.lineTo(W - m, H / 2); c.stroke();
  c.beginPath(); c.arc(W / 2, H / 2, 4.5 * k, 0, 7); c.stroke();
  for (const y of [m, H - m]) { const s = y < H / 2 ? 1 : -1; c.strokeRect(W / 2 - 8 * k, y, 16 * k, s * 6 * k); c.strokeRect(W / 2 - 3.5 * k, y, 7 * k, s * 2.2 * k); }
  c.fillStyle = "#ffffff"; c.beginPath(); c.arc(W / 2, H / 2, 0.4 * k, 0, 7); c.fill();
});
const texRede = texturaCanvas(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = "rgba(255,255,255,0.95)"; c.lineWidth = 3; for (let i = 0; i <= 64; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } }, { repetir: true });
const texBola = texturaCanvas(128, 64, (c, w, h) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h); c.fillStyle = "#151515"; for (const [x, y] of [[16, 16], [48, 40], [80, 16], [112, 40], [32, 56], [96, 56], [64, 4]]) { c.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283; c.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); } c.fill(); } });
export function campoFutebol(C, E) {
  const S = novo(), g = S.grupo;
  const gram = new THREE.Mesh(new THREE.PlaneGeometry(C.w + 4, C.d + 4), new THREE.MeshToonMaterial({ map: texCampo(C.w + 4, C.d + 4) }));
  gram.rotation.x = -Math.PI / 2; gram.position.set(C.x, 0.05, C.z); gram.receiveShadow = true; g.add(gram);
  // gols (traves redondas brancas e rede)
  const matRede = new THREE.MeshToonMaterial({ map: texRede, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  texRede.repeat.set(6, 2);
  for (const s of [-1, 1]) {
    const z = C.z + s * (C.d / 2 - 0.2), gol = new THREE.Group(); gol.position.set(C.x, 0, z); gol.rotation.y = s > 0 ? Math.PI : 0; g.add(gol);
    for (const x of [-3, 3]) { const p = malha(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 10), mat(0xffffff), { contorno: 0.03 }); p.position.set(x, 1.2, 0); gol.add(p); }
    const tr = malha(new THREE.CylinderGeometry(0.12, 0.12, 6.24, 10), mat(0xffffff), { contorno: 0.03 }); tr.rotation.z = Math.PI / 2; tr.position.set(0, 2.4, 0); gol.add(tr);
    const fundo = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.4), matRede); fundo.position.set(0, 1.2, -1.6); gol.add(fundo);
    const teto = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.6), matRede); teto.rotation.x = Math.PI / 2; teto.position.set(0, 2.4, -0.8); gol.add(teto);
    for (const x of [-3, 3]) { const lado = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), matRede); lado.rotation.y = Math.PI / 2; lado.position.set(x, 1.2, -0.8); gol.add(lado); }
    S.solidos.push({ x0: C.x - 3.2, x1: C.x - 2.8, z0: z - 0.2, z1: z + 0.2, y1: 2.5 }, { x0: C.x + 2.8, x1: C.x + 3.2, z0: z - 0.2, z1: z + 0.2, y1: 2.5 });
  }
  // bandeirinhas de escanteio
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = malha(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), mat(0xffffff), { sombra: false }); p.position.set(C.x + sx * (C.w / 2 + 0.8), 0.75, C.z + sz * (C.d / 2 + 0.8)); g.add(p);
    const b = malha(new THREE.PlaneGeometry(0.5, 0.35), mat(0xff7a00, { side: THREE.DoubleSide }), { sombra: false }); b.position.set(p.position.x + 0.25, 1.35, p.position.z); g.add(b);
  }
  // bola no meio
  const bola = malha(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshToonMaterial({ map: texBola }), { contorno: 0.03 }); bola.position.set(C.x, 0.4, C.z); bola.userData.dinamico = true; g.add(bola);
  S.bola = bola;
  // arquibancada (degraus coloridos) no lado oeste
  const cores = [0x00b5f0, 0xec2e8c, 0xffcc1f, 0x58c43a];
  const ax = C.x - C.w / 2 - 7.5;
  for (let i = 0; i < 4; i++) {
    const d = caixaRedonda(2.2, 0.7 * (i + 1), C.d - 8, mat(0xe8e2d6), { raio: 0.12, contorno: 0.06 }); d.position.set(ax - i * 2.2, 0.35 * (i + 1), C.z); g.add(d);
    const banco = caixaRedonda(1.6, 0.25, C.d - 9, mat(cores[i]), { raio: 0.1, contorno: 0.04 }); banco.position.set(ax - i * 2.2 + 0.2, 0.7 * (i + 1) + 0.12, C.z); g.add(banco);
  }
  const cob = caixaRedonda(10, 0.4, C.d - 6, mat(0x2f6fc0), { raio: 0.15, contorno: 0.06 }); cob.position.set(ax - 3.3, 5.6, C.z); g.add(cob);
  for (const z of [C.z - C.d / 2 + 5, C.z + C.d / 2 - 5]) { const p = malha(new THREE.CylinderGeometry(0.15, 0.15, 5.4, 8), mat(0xffffff), { contorno: 0.03 }); p.position.set(ax - 7.6, 2.7, z); g.add(p); }
  S.solidos.push({ x0: ax - 8, x1: ax + 1.1, z0: C.z - C.d / 2 + 4, z1: C.z + C.d / 2 - 4, y1: 20 });
  // vestiário com placa, no canto sudeste
  const vx = E.x1 - 9, vz = E.z1 - 7;
  const vest = new THREE.Group(); vest.position.set(vx, 0, vz); vest.rotation.y = -Math.PI / 2; g.add(vest);
  corpo(vest, 10, 4.2, 7, 0xfff4e0, { beiral: 0x00b5f0, rodape: 0x9fd8ff });
  porta(vest, { z: 0.1, w: 2, h: 2.8, cor: 0x00b5f0, vidro: false });
  nome(vest, "Vestiário", { y: 3.6, largura: 5, cor: "#00b5f0" });
  S.solidos.push({ x0: vx, x1: vx + 7, z0: vz - 5, z1: vz + 5, y1: 20 });
  return S;
}
const texQuadra = (w, d) => texturaCanvas(256, Math.round((256 * d) / w), (c, W, H) => {
  const k = W / w;
  c.fillStyle = "#2f8fe8"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#ff8a3d"; c.fillRect(2 * k, 2 * k, W - 4 * k, H - 4 * k);
  c.strokeStyle = "#ffffff"; c.lineWidth = Math.max(2, 0.12 * k);
  c.strokeRect(2 * k, 2 * k, W - 4 * k, H - 4 * k);
  c.beginPath(); c.moveTo(W / 2, 2 * k); c.lineTo(W / 2, H - 2 * k); c.stroke();
  c.beginPath(); c.arc(W / 2, H / 2, 2.2 * k, 0, 7); c.stroke();
  for (const x of [2 * k, W - 2 * k]) { c.beginPath(); c.arc(x, H / 2, 6 * k, -Math.PI / 2, Math.PI / 2, x > W / 2); c.stroke(); c.fillStyle = "#2f8fe8"; c.fillRect(x > W / 2 ? x - 5 * k : x, H / 2 - 2 * k, 5 * k, 4 * k); }
});
export function quadra(Q) {
  const S = novo(), g = S.grupo;
  const w = Q.x1 - Q.x0, d = Q.z1 - Q.z0, cx = (Q.x0 + Q.x1) / 2, cz = (Q.z0 + Q.z1) / 2;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(w - 2, d - 2), new THREE.MeshToonMaterial({ map: texQuadra(w - 2, d - 2) }));
  piso.rotation.x = -Math.PI / 2; piso.position.set(cx, 0.06, cz); piso.receiveShadow = true; g.add(piso);
  // tabelas de basquete nas pontas
  for (const s of [-1, 1]) {
    const x = cx + s * (w / 2 - 1.6);
    const poste = malha(new THREE.CylinderGeometry(0.14, 0.16, 3.6, 10), mat(0x2f3440), { contorno: 0.03 }); poste.position.set(x, 1.8, cz); g.add(poste);
    const tabela = caixaRedonda(0.15, 1.3, 2, mat(0xffffff), { raio: 0.06, contorno: 0.04 }); tabela.position.set(x - s * 0.4, 3.7, cz); g.add(tabela);
    const quad = caixa(0.17, 0.5, 0.7, mat(0xe8413c), { sombra: false }); quad.position.set(x - s * 0.4, 3.5, cz); g.add(quad);
    const aro = malha(new THREE.TorusGeometry(0.3, 0.04, 6, 18), mat(0xff7a00), { sombra: false }); aro.rotation.x = Math.PI / 2; aro.position.set(x - s * 0.8, 3.15, cz); g.add(aro);
    S.solidos.push({ x0: x - 0.3, x1: x + 0.3, z0: cz - 0.3, z1: cz + 0.3, y1: 4 });
  }
  // alambrado baixinho e bancos
  for (const [x, z, comp, rot] of [[Q.x0, Q.z0, w, 0], [Q.x0, Q.z1, w, 0]]) { const c = cerquinha(comp, { cor: 0x2f6fc0, altura: 1 }); c.position.set(x, 0.03, z); c.rotation.y = rot; g.add(c); S.solidos.push({ x0: x, x1: x + comp, z0: z - 0.25, z1: z + 0.25, y1: 1.2 }); }
  for (const s of [-1, 1]) { const b = banco(); b.position.set(cx + s * 5, 0.06, Q.z1 - 1.4); b.rotation.y = Math.PI; g.add(b); }
  return S;
}
export function hortaComunitaria(H) {
  const S = novo(), g = S.grupo;
  const w = H.x1 - H.x0, d = H.z1 - H.z0;
  const terra = new THREE.Mesh(new THREE.PlaneGeometry(w - 1, d - 1), MAT_TERRA); terra.rotation.x = -Math.PI / 2; terra.position.set((H.x0 + H.x1) / 2, 0.04, (H.z0 + H.z1) / 2); g.add(terra);
  const verduras = new THREE.Group(); verduras.userData.detalhe = true; g.add(verduras);
  const cores = [0xe8413c, 0xff8a1f, 0x7ed957, 0xb07ce8];
  for (let k = 0; k < 4; k++) {
    const z = H.z0 + 4 + k * 4.6;
    const cant = caixaRedonda(w - 12, 0.5, 2.4, mat(0xc98a4b), { raio: 0.1, contorno: 0.04 }); cant.position.set(H.x0 + 2 + (w - 12) / 2, 0.25, z); g.add(cant);
    S.solidos.push({ x0: H.x0 + 2, x1: H.x0 + w - 10, z0: z - 1.2, z1: z + 1.2, y1: 0.55 });
    for (let i = 0; i < 8; i++) {
      const x = H.x0 + 3.5 + i * ((w - 15) / 7);
      const pe = malha(new THREE.IcosahedronGeometry(0.42, 0), mat(0x4cb83f), { sombra: false }); pe.position.set(x, 0.75, z); verduras.add(pe);
      const fruto = malha(new THREE.IcosahedronGeometry(0.17, 1), mat(cores[k]), { sombra: false }); fruto.position.set(x + 0.2, 0.95, z + 0.2); verduras.add(fruto);
    }
  }
  // casinha de ferramentas, regador e placa
  const cx = H.x1 - 5, cz = H.z0 + 6;
  const casinha = new THREE.Group(); casinha.position.set(cx, 0, cz + 3); g.add(casinha);
  corpo(casinha, 5, 3.2, 5, 0xc98a4b, { beiral: 0x3c9a4a });
  porta(casinha, { z: 0.1, w: 1.6, h: 2.3, cor: 0x3c9a4a, vidro: false });
  S.solidos.push({ x0: cx - 2.6, x1: cx + 2.6, z0: cz - 2.1, z1: cz + 3.1, y1: 20 });
  const reg = malha(new THREE.CylinderGeometry(0.35, 0.4, 0.6, 12), mat(0x00b5f0), { contorno: 0.03 }); reg.position.set(cx - 3.5, 0.3, cz + 5); g.add(reg);
  const bico = malha(new THREE.CylinderGeometry(0.05, 0.08, 0.7, 8), mat(0x00b5f0)); bico.rotation.z = 0.9; bico.position.set(cx - 3.95, 0.55, cz + 5); g.add(bico);
  nome(casinha, "Horta", { y: 3.0, largura: 3.5, cor: "#3c9a4a" });
  return S;
}
export { onibus3D };
