// Rabiscolândia: prédios das parceiras sem foto de fachada. TODA fachada e todo letreiro aqui são invenção (nada de foto,
// rede social ou logotipo real): a arte do letreiro está em src/parceiros-arte.js.
// Convenção igual à de predios.js: frente em z = 0, olhando para +z, até z = -fundo; devolve { grupo, solidos }.
// As vitrines são vãos de verdade na parede (com o que tem dentro), cobertos por um vidro transparente só.
// S.porta: [x, z] local da entrada · S.pessoa: quem fica na porta (pessoas.js), se houver.
// O topo da colisão é medido do próprio prédio (fechar): é o que o helicóptero enxerga como telhado.
// Fachadas: FACHADAS, por tipo de parceira (src/parceiros.js), usado em mundo.js.

import { THREE, matNovo, malha, mat, MAT, texturaCanvas } from "./base3d.js";
import { cx as pc, claro, escuro, telhadoDegraus } from "./blocos.js";
import { novo, sol, janelas, porta, toldo } from "./predios.js";
import { desenharLetreiro } from "../../src/parceiros-arte.js";
import { PARCEIROS } from "../../src/parceiros.js";

const F = { sombra: false };
const D_ = { sombra: false, detalhe: true };
const VIDRO = matNovo({ color: 0xcfeaff, transparent: true, opacity: 0.16, specular: 0xffffff, shininess: 120, depthWrite: false });
const VIDRO_FORTE = matNovo({ color: 0x9fdcf5, transparent: true, opacity: 0.42, specular: 0xffffff, shininess: 120, depthWrite: false });

// corpo atrás dos vãos, telhado com mureta e rodapé. prof: fundo dos vãos (o corpo começa atrás deles)
function casco(g, { W, H, D, prof = 0, cor, beiral, rodape = null }) {
  pc(g, W, H, D - prof, cor, 0, H / 2, -prof - (D - prof) / 2);
  pc(g, W + 0.6, 0.4, D + 0.6, beiral, 0, H + 0.2, -D / 2);
  for (const [w, d, x, z] of [[W + 0.6, 0.35, 0, 0.13], [W + 0.6, 0.35, 0, -D - 0.13], [0.35, D + 0.6, -W / 2 - 0.13, -D / 2], [0.35, D + 0.6, W / 2 + 0.13, -D / 2]]) pc(g, w, 0.35, d, claro(beiral, 0.14), x, H + 0.57, z, F);
  pc(g, W - 0.5, 0.1, D - 0.5, 0xb6bcc6, 0, H + 0.42, -D / 2, F);
  if (rodape != null) { // rodapé dos lados e do fundo (a frente tem o seu, na parede com vãos)
    for (const s of [-1, 1]) pc(g, 0.14, 0.7, D, rodape, s * (W / 2 + 0.02), 0.35, -D / 2, F);
    pc(g, W + 0.14, 0.7, 0.14, rodape, 0, 0.35, -D - 0.02, F);
  }
}
// faixa de parede de y0 a y1 com vãos ({ x, w, a, b }: x no meio, a e b = altura do vão), de z = 0 a z = -prof
function parede(g, { W, y0 = 0, y1, prof, cor, vaos = [] }) {
  let xa = -W / 2;
  const h = y1 - y0, ym = (y0 + y1) / 2;
  for (const v of [...vaos].sort((p, q) => p.x - q.x)) {
    const e = v.x - v.w / 2, d = v.x + v.w / 2;
    if (e - xa > 0.01) pc(g, e - xa, h, prof, cor, (xa + e) / 2, ym, -prof / 2);
    if (v.a > y0 + 0.01) pc(g, v.w, v.a - y0, prof, cor, v.x, (y0 + v.a) / 2, -prof / 2);
    if (v.b < y1 - 0.01) pc(g, v.w, y1 - v.b, prof, cor, v.x, (v.b + y1) / 2, -prof / 2);
    xa = d;
  }
  if (W / 2 - xa > 0.01) pc(g, W / 2 - xa, h, prof, cor, (xa + W / 2) / 2, ym, -prof / 2);
}
function moldura(g, x, y0, y1, w, cor, e = 0.2, z = 0.05, q = 0.14) {
  const h = y1 - y0, ym = (y0 + y1) / 2;
  pc(g, w + e * 2, e, q, cor, x, y1 + e / 2, z, F); pc(g, w + e * 2, e, q, cor, x, y0 - e / 2, z, F);
  for (const s of [-1, 1]) pc(g, e, h, q, cor, x + (s * (w + e)) / 2, ym, z, F);
}
// vitrine: moldura, luz no teto do vão, vidro e divisórias
function vitrine(g, { x, w, a, b, cor, prof, divisoes = 0, luz = true }) {
  moldura(g, x, a, b, w, cor);
  pc(g, w, b - a, 0.04, 0, x, (a + b) / 2, -0.04, { ...F, material: VIDRO });
  for (let i = 1; i <= divisoes; i++) pc(g, 0.09, b - a, 0.09, cor, x - w / 2 + (w * i) / (divisoes + 1), (a + b) / 2, -0.03, F);
  if (luz) pc(g, w - 0.5, 0.1, 0.3, 0, x, b - 0.06, -prof / 2, { ...F, material: MAT.lampada });
}
// letreiro: caixa com moldura e a arte inventada, que brilha um pouco para ler de longe e de noite
export function letreiro(g, id, { w, h, x = 0, y, z = 0, cor }) {
  const op = { instagram: PARCEIROS.find((q) => q.id === id)?.instagram ?? null };
  pc(g, w + 0.44, h + 0.44, 0.32, cor, x, y, z + 0.16, F);
  const larg = 1024, alt = Math.round((larg * h) / w);
  const t = texturaCanvas(larg, alt, (c, a, b) => desenharLetreiro(c, id, a, b, op));
  // o nome usa a fonte do jogo: se ela ainda estava chegando, redesenha
  if (document.fonts?.status !== "loaded") document.fonts?.ready.then(() => { desenharLetreiro(t.image.getContext("2d"), id, larg, alt, op); t.needsUpdate = true; });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matNovo({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.5 }));
  p.position.set(x, y, z + 0.33); g.add(p);
  return p;
}
// janelas nos lados e no fundo: o prédio não fica liso quando visto de outros ângulos
function janelasEmVolta(g, W, D, { andares = 1, y0 = 3, cor = 0xffffff, zFrente = 0, alt = 3.2 }) {
  const fundo = new THREE.Group(); fundo.position.z = -D - 0.02; fundo.rotation.y = Math.PI; g.add(fundo);
  janelas(fundo, { w: W - 1, andares, z: 0, y0, alt, cor, colunas: Math.max(2, Math.floor(W / 5)) });
  const dUtil = D - zFrente;
  for (const s of [-1, 1]) {
    const lado = new THREE.Group(); lado.position.set(s * (W / 2 + 0.02), 0, -zFrente - dUtil / 2); lado.rotation.y = (s * Math.PI) / 2; g.add(lado);
    janelas(lado, { w: dUtil - 1, andares, z: 0, y0, alt, cor, colunas: Math.max(1, Math.floor(dUtil / 4)) });
  }
}
// piso na frente do prédio, da parede até a calçada (o recuo)
const piso = (g, W, cor = 0xd5d2c8) => pc(g, W, 0.09, 1.7, cor, 0, 0.045, 0.85, F);
function vaso(g, x, z, cor, folha = 0x4cb83f, flor = null) {
  pc(g, 0.8, 0.7, 0.8, cor, x, 0.4, z, F); pc(g, 0.92, 0.12, 0.92, claro(cor, 0.25), x, 0.78, z, F);
  pc(g, 0.7, 0.55, 0.7, folha, x, 1.1, z, F); pc(g, 0.42, 0.34, 0.42, claro(folha, 0.2), x, 1.5, z, F);
  if (flor != null) for (const [a, b] of [[0.28, 0.28], [-0.28, 0.2], [0.05, -0.3]]) pc(g, 0.16, 0.16, 0.16, flor, x + a, 1.38, z + b, D_);
}
function fechar(S, W, D) {
  S.grupo.updateMatrixWorld(true);
  const topo = new THREE.Box3().setFromObject(S.grupo).max.y;
  sol(S, -W / 2 - 0.3, W / 2 + 0.3, -D - 0.3, 0.3, Math.ceil(topo * 10) / 10);
  S.topo = topo;
  return S;
}

// ==================================================================== Gala Presentes: loja de presentes, caixa gigante no telhado
function caixaPresente(g, x, y, z, s, cor, fita = 0xf2b632, f = F) {
  pc(g, s, s * 0.8, s, cor, x, y + s * 0.4, z, f);
  pc(g, s * 1.1, s * 0.2, s * 1.1, escuro(cor, 0.86), x, y + s * 0.88, z, f);
  pc(g, s * 0.2, s * 1.0, s * 1.14, fita, x, y + s * 0.5, z, f); pc(g, s * 1.14, s * 1.0, s * 0.2, fita, x, y + s * 0.5, z, f);
}
// cesta de presente: palha com alça, recheada de frutas, doces e um laço (nada de bebida: o jogo é infantil)
function cesta(g, x, y, z, s, fita) {
  const PA = 0xc08a4a;
  pc(g, 0.96 * s, 0.44 * s, 0.6 * s, PA, x, y + 0.22 * s, z, F);
  for (const q of [0.1, 0.26, 0.4]) pc(g, 0.99 * s, 0.05 * s, 0.63 * s, escuro(PA, 0.74), x, y + q * s, z, F);
  pc(g, 1.06 * s, 0.1 * s, 0.68 * s, claro(PA, 0.25), x, y + 0.48 * s, z, F);
  for (const q of [-1, 1]) pc(g, 0.08 * s, 0.56 * s, 0.1 * s, PA, x + q * 0.48 * s, y + 0.78 * s, z, F);
  pc(g, 1.04 * s, 0.09 * s, 0.1 * s, PA, x, y + 1.08 * s, z, F);
  [[-0.26, 0xe0342b], [0, 0xffb01f], [0.26, 0x58c43a], [-0.12, 0xff7a3d], [0.13, 0xec2e8c]].forEach(([dx, c], i) => pc(g, 0.26 * s, 0.26 * s, 0.26 * s, c, x + dx * s, y + (i < 3 ? 0.62 : 0.8) * s, z + (i < 3 ? 0.1 : -0.04) * s, F));
  laco(g, x, y + 1.1 * s, z + 0.08 * s, 0.44 * s, fita);
}
// buquê: papel de embrulho abrindo para cima, flores de blocos em cima e laço na cintura
function buque(g, x, y, z, s, flor) {
  [[0.14, 0], [0.24, 0.16], [0.36, 0.32], [0.48, 0.48], [0.58, 0.64]].forEach(([w, q], i) => pc(g, w * s, 0.17 * s, w * 0.7 * s, i % 2 ? 0xf7e9c8 : 0xe9d6a8, x, y + (q + 0.08) * s, z, F));
  pc(g, 0.72 * s, 0.14 * s, 0.5 * s, 0x4cb83f, x, y + 0.86 * s, z, F);
  [[-0.26, 0.98, flor], [0.26, 0.98, flor], [0, 1.0, 0xff5fa2], [-0.13, 1.16, 0xffffff], [0.14, 1.16, flor], [0, 1.28, flor]].forEach(([dx, h, c]) => {
    pc(g, 0.26 * s, 0.22 * s, 0.26 * s, c, x + dx * s, y + h * s, z, F);
    pc(g, 0.09 * s, 0.09 * s, 0.28 * s, 0xffcf33, x + dx * s, y + h * s, z + 0.01, F);
  });
  laco(g, x, y + 0.34 * s, z + 0.14 * s, 0.34 * s, 0xc8234f);
}
function laco(g, x, y, z, s, cor) {
  for (const q of [-1, 1]) {
    pc(g, 0.62 * s, 0.34 * s, 0.14 * s, cor, x + q * 0.38 * s, y + 0.06 * s, z, { ...F, rz: q * 0.36 });
    pc(g, 0.16 * s, 0.56 * s, 0.1 * s, escuro(cor, 0.86), x + q * 0.2 * s, y - 0.32 * s, z, { ...F, rz: q * 0.3 });
  }
  pc(g, 0.26 * s, 0.26 * s, 0.2 * s, claro(cor, 0.2), x, y, z + 0.01, F);
}
export function galaPresentes(l) {
  const S = novo(), g = S.grupo, W = 16, H = 7.4, D = 8.5, prof = 1.1, CR = 0xfff1d6, VM = 0xc8234f, OU = 0xf2b632;
  const vaos = [{ x: -5, w: 5, a: 0.9, b: 3.45 }, { x: 5, w: 5, a: 0.9, b: 3.45 }];
  casco(g, { W, H, D, prof, cor: CR, beiral: VM, rodape: escuro(CR, 0.72) });
  parede(g, { W, y1: H, prof, cor: CR, vaos });
  pc(g, W + 0.14, 0.7, 0.14, escuro(CR, 0.72), 0, 0.35, 0.04, F);
  piso(g, W);
  for (const v of vaos) {
    vitrine(g, { ...v, cor: OU, prof, divisoes: 1 });
    // prateleira rosa: à esquerda as cestas de presente, à direita os buquês; laços pendurados no alto
    pc(g, v.w, 0.12, prof - 0.08, 0xffd9e4, v.x, v.a + 0.06, -prof / 2);
    pc(g, v.w, b(v), 0.1, 0xffe6ee, v.x, (v.a + v.b) / 2, -prof + 0.06, F);
    const y0 = v.a + 0.12, z0 = -prof / 2;
    if (v.x < 0) { cesta(g, v.x - 1.35, y0, z0, 1, 0xec2e8c); cesta(g, v.x + 0.1, y0, z0, 0.82, 0x2f8fe8); caixaPresente(g, v.x + 1.45, y0, z0, 0.72, 0x8e6cff, 0xfff1a8); }
    else { buque(g, v.x - 1.5, y0, z0, 1.1, 0xff5f8f); buque(g, v.x, y0, z0, 1.25, 0xffcc1f); buque(g, v.x + 1.5, y0, z0, 1.1, 0xfff4f8); }
    for (const dx of [-1.5, 0, 1.5]) laco(g, v.x + dx, v.b - 0.42, z0 - 0.1, 0.42, dx ? VM : OU);
  }
  porta(g, { z: 0.05, w: 2.6, h: 3.2, cor: VM });
  const t = toldo(W - 0.6, VM, 0xfff6e0); t.position.set(0, 4.5, 0.08); g.add(t);
  // letreiro, com faixas de fita dourada nos cantos (parede embrulhada)
  letreiro(g, "gala-presentes", { w: 12.4, h: 2.3, y: 5.95, cor: OU });
  for (const s of [-1, 1]) { pc(g, 0.5, H, 0.1, OU, s * (W / 2 - 0.25), H / 2, 0.05, F); laco(g, s * (W / 2 - 0.25), 5.95, 0.14, 1.05, VM); }
  for (const s of [-1, 1]) vaso(g, s * 2, 0.85, VM, 0x4cb83f, 0xffcc1f);
  // a caixa gigante no telhado, com laço de duas orelhas
  const Y = H + 0.45, Z = -D / 2, s = 3.5;
  pc(g, s, s * 0.74, s, VM, 0, Y + s * 0.37, Z); pc(g, s * 1.12, s * 0.2, s * 1.12, escuro(VM, 0.86), 0, Y + s * 0.8, Z);
  pc(g, s * 0.2, s * 0.92, s * 1.15, OU, 0, Y + s * 0.46, Z); pc(g, s * 1.15, s * 0.92, s * 0.2, OU, 0, Y + s * 0.46, Z);
  for (const q of [-1, 1]) { pc(g, 1.5, 0.62, 0.42, OU, q * 0.82, Y + s * 1.03, Z, { rz: q * 0.42 }); pc(g, 0.62, 0.34, 0.46, claro(OU, 0.3), q * 1.2, Y + s * 1.12, Z, { ...F, rz: q * 0.42 }); }
  pc(g, 0.62, 0.62, 0.62, escuro(OU, 0.86), 0, Y + s * 0.99, Z);
  janelasEmVolta(g, W, D, { y0: 3.6, cor: OU, zFrente: prof });
  S.porta = [0, 0.6];
  return fechar(S, W, D);
}
const b = (v) => v.b - v.a;

// ==================================================================== See Love Semijoias: loja de semijoias e acessórios, azul-noite e dourada, diamante no alto
export function seeLoveJoias(l) {
  const S = novo(), g = S.grupo, W = 14, H = 7.8, D = 8.5, prof = 1.0, NV = 0x1f2a44, OU = 0xd9b35a;
  const vaos = [{ x: -4.4, w: 3.8, a: 1.05, b: 3.9 }, { x: 4.4, w: 3.8, a: 1.05, b: 3.9 }];
  casco(g, { W, H, D, prof, cor: NV, beiral: OU, rodape: 0x141c33 });
  parede(g, { W, y1: H, prof, cor: NV, vaos });
  pc(g, W + 0.14, 0.7, 0.14, 0x141c33, 0, 0.35, 0.04, F);
  piso(g, W, 0xe9e4d6);
  // colunas douradas nos cantos e dos lados da porta
  for (const x of [-W / 2 + 0.35, W / 2 - 0.35, -1.95, 1.95]) { pc(g, 0.44, 4.6, 0.3, OU, x, 2.3, 0.1, F); pc(g, 0.7, 0.24, 0.42, claro(OU, 0.25), x, 4.68, 0.1, F); pc(g, 0.7, 0.24, 0.42, claro(OU, 0.25), x, 0.2, 0.1, F); }
  pc(g, W + 0.1, 0.22, 0.26, OU, 0, 4.82, 0.08, F);
  for (const v of vaos) {
    vitrine(g, { ...v, cor: OU, prof });
    pc(g, v.w, b(v), 0.1, 0x2b1b3d, v.x, (v.a + v.b) / 2, -prof + 0.06, F); // veludo do fundo
    pc(g, v.w, 0.1, prof - 0.1, 0x3a2553, v.x, v.a + 0.05, -prof / 2, F);
    // pedestais com semijoias e acessórios: anel, colar e brincos (peças pequenas de blocos)
    for (const [dx, a, tipo] of [[-1.15, 0.7, 0], [0, 1.1, 1], [1.15, 0.7, 2]]) {
      const yp = v.a + 0.1, zj = -prof / 2;
      pc(g, 0.72, a, 0.56, 0xf1e6cf, v.x + dx, yp + a / 2, zj, F); pc(g, 0.86, 0.09, 0.66, OU, v.x + dx, yp + a + 0.04, zj, F);
      const yj = yp + a + 0.27;
      if (tipo === 0) { pc(g, 0.36, 0.07, 0.07, 0xf6d774, v.x + dx, yj - 0.15, zj, F); pc(g, 0.36, 0.07, 0.07, 0xf6d774, v.x + dx, yj + 0.15, zj, F); for (const q of [-1, 1]) pc(g, 0.07, 0.36, 0.07, 0xf6d774, v.x + dx + q * 0.15, yj, zj, F); pc(g, 0.15, 0.15, 0.1, 0x9fe6ff, v.x + dx, yj + 0.27, zj, { ...F, rz: Math.PI / 4 }); }
      else if (tipo === 1) { for (let i = -3; i <= 3; i++) pc(g, 0.09, 0.09, 0.09, 0xfff0c8, v.x + dx + i * 0.11, yj + 0.5 - Math.abs(i) * -0.12 - 0.72, zj, F); pc(g, 0.2, 0.2, 0.1, 0xff5f8f, v.x + dx, yj - 0.28, zj, { ...F, rz: Math.PI / 4 }); }
      else for (const q of [-1, 1]) { // par de brincos de argola com pingente
        const xb = v.x + dx + q * 0.17;
        pc(g, 0.2, 0.05, 0.06, 0xf6d774, xb, yj + 0.08, zj, F); pc(g, 0.2, 0.05, 0.06, 0xf6d774, xb, yj - 0.08, zj, F);
        for (const k of [-1, 1]) pc(g, 0.05, 0.16, 0.06, 0xf6d774, xb + k * 0.08, yj, zj, F);
        pc(g, 0.11, 0.11, 0.08, 0xff8fb5, xb, yj - 0.18, zj, { ...F, rz: Math.PI / 4 });
      }
    }
  }
  porta(g, { z: 0.05, w: 2.4, h: 3.5, cor: OU });
  letreiro(g, "see-love-joias", { w: 10.8, h: 2.15, y: 6.25, cor: OU });
  // lanterninhas ao lado da porta e cordão dourado de entrada
  for (const s of [-1, 1]) { pc(g, 0.3, 0.5, 0.3, OU, s * 2.7, 3.2, 0.25, F); pc(g, 0.2, 0.34, 0.2, 0, s * 2.7, 3.2, 0.27, { ...F, material: MAT.lampada }); vaso(g, s * 2.7, 0.9, OU, 0x2f7f49); }
  // diamante gigante de blocos sobre uma base: silhueta de brilhante (ponta em baixo, coroa em cima), com faces mais claras no meio
  const Y = H + 0.42, Z = -2.6, DM = 0x6fd3f2;
  pc(g, 2.6, 0.3, 1.5, OU, 0, Y + 0.15, Z); pc(g, 0.5, 0.34, 0.5, escuro(OU, 0.8), 0, Y + 0.46, Z);
  [0.4, 0.9, 1.4, 1.9, 2.4, 2.9, 3.4, 3.4, 2.7, 2.0].forEach((w, i) => {
    const y = Y + 0.76 + i * 0.3, topo = i >= 7;
    pc(g, w, 0.3, 0.8, topo ? claro(DM, 0.25) : DM, 0, y, Z);
    pc(g, w * 0.5, 0.3, 0.86, topo ? claro(DM, 0.75) : claro(DM, 0.45), 0, y, Z, F);
    pc(g, w * 0.14, 0.3, 0.9, 0xeffcff, -w * 0.13, y, Z, F);
  });
  janelasEmVolta(g, W, D, { y0: 3.9, cor: OU, zFrente: prof });
  S.porta = [0, 0.6];
  return fechar(S, W, D);
}

// ==================================================================== Bella Company: fábrica de uniformes, carretel gigante, araras de uniforme
function camisaBlocos(g, x, y, z, cor, gola, escala = 1) {
  const s = escala;
  pc(g, 0.66 * s, 0.84 * s, 0.14, cor, x, y - 0.42 * s, z, F);
  for (const q of [-1, 1]) pc(g, 0.26 * s, 0.34 * s, 0.14, cor, x + q * 0.44 * s, y - 0.2 * s, z, F);
  pc(g, 0.36 * s, 0.14 * s, 0.17, gola, x, y - 0.03 * s, z, F);
  pc(g, 0.1 * s, 0.1 * s, 0.17, gola, x + 0.17 * s, y - 0.28 * s, z, F);
  pc(g, 0.05, 0.16, 0.05, 0x8a93a3, x, y + 0.08, z, F);
}
export function bellaCompany(l) {
  const S = novo(), g = S.grupo, W = 18, H = 7.6, D = 9.5, prof = 1.15, CL = 0xdff1f7, AZ = 0x1f6fa8, RS = 0xec2e8c;
  const vaos = [{ x: -5.7, w: 5.7, a: 0.85, b: 3.55 }, { x: 5.7, w: 5.7, a: 0.85, b: 3.55 }];
  casco(g, { W, H, D, prof, cor: CL, beiral: AZ, rodape: AZ });
  parede(g, { W, y1: H, prof, cor: CL, vaos });
  pc(g, W + 0.14, 0.7, 0.14, AZ, 0, 0.35, 0.04, F);
  piso(g, W);
  for (const v of vaos) {
    vitrine(g, { ...v, cor: AZ, prof, divisoes: 1 });
    pc(g, v.w, b(v), 0.1, 0x8cc0dc, v.x, (v.a + v.b) / 2, -prof + 0.06, F);
    pc(g, v.w, 0.1, prof - 0.1, 0x6f9fba, v.x, v.a + 0.05, -prof / 2, F);
    // arara com uniformes (camisas e casacos da escola, sem pessoa e sem logotipo)
    pc(g, v.w - 0.5, 0.08, 0.08, 0x6b7a88, v.x, v.b - 0.5, -prof / 2, F);
    for (let i = 0; i < 5; i++) {
      const x = v.x - 2 + i, azul = i % 2 === 1;
      camisaBlocos(g, x, v.b - 0.62, -prof / 2, azul ? 0x2f8fe8 : 0xffffff, azul ? 0xffffff : RS);
    }
  }
  porta(g, { z: 0.05, w: 2.8, h: 3.2, cor: AZ });
  const t = toldo(W - 0.6, AZ, 0xffffff); t.position.set(0, 4.55, 0.08); g.add(t);
  letreiro(g, "bella-company", { w: 14.2, h: 2.3, y: 6.05, cor: 0xffffff });
  // fita métrica correndo pela fachada (amarela com marcas)
  pc(g, W, 0.3, 0.08, 0xffd23f, 0, 4.6, 0.03, F);
  for (let x = -W / 2 + 0.5; x < W / 2; x += 1) pc(g, 0.06, 0.18, 0.1, 0x151515, x, 4.65, 0.04, F);
  for (const s of [-1, 1]) vaso(g, s * 2.2, 0.85, AZ, 0x4cb83f, 0xffffff);
  // carretel gigante no telhado, de pé: discos de madeira e linha rosa, com a agulha
  const Y = H + 0.42, Z = -D / 2, MD = 0xb97f46;
  const disco = (raio, a, cor, y) => { const m = malha(new THREE.CylinderGeometry(raio, raio, a, 12), mat(cor), { sombra: true }); m.position.set(-2.2, y, Z); g.add(m); };
  disco(1.55, 0.3, MD, Y + 0.15); disco(1.15, 1.5, RS, Y + 1.05); disco(1.55, 0.3, MD, Y + 1.95); disco(0.34, 0.14, 0x7a5232, Y + 2.15);
  for (let i = 0; i < 4; i++) { const m = malha(new THREE.CylinderGeometry(1.17, 1.17, 0.07, 12), mat(claro(RS, 0.3)), { sombra: false }); m.position.set(-2.2, Y + 0.5 + i * 0.36, Z); g.add(m); }
  // camisa gigante de uniforme num cabide, ao lado do carretel (sem logotipo)
  const cz = Z + 1.2;
  pc(g, 0.18, 0.9, 0.18, 0x6b7a88, 2.6, Y + 0.45, cz); pc(g, 2.4, 0.16, 0.5, 0x6b7a88, 2.6, Y + 0.08, cz);
  camisaBlocos(g, 2.6, Y + 3.25, cz, 0xffffff, RS, 3);
  pc(g, 2.0, 0.34, 0.2, AZ, 2.6, Y + 1.0, cz, F); // barra azul
  janelasEmVolta(g, W, D, { y0: 3.8, cor: AZ, zFrente: prof });
  S.porta = [0, 0.6];
  return fechar(S, W, D);
}

// ==================================================================== Marlon Máquinas: galpão com o portão aberto e a máquina de picar PET
export function marlonMaquinas(l) {
  const S = novo(), g = S.grupo, W = 23, H = 8.2, D = 15.5, prof = 7.4, CZ = 0x7f96a3, VD = 0x2e9e57, CN = 0xf2f4f5, LJ = 0xef7d1a;
  const PX = -3.5, PW = 14, PH = 5.3;
  const lado = (x, w) => pc(g, w, H, prof, CZ, x, H / 2, -prof / 2);
  casco(g, { W, H, D, prof, cor: CZ, beiral: VD, rodape: 0x4c5c67 });
  lado((-W / 2 + PX - PW / 2) / 2, PX - PW / 2 + W / 2); lado((PX + PW / 2 + W / 2) / 2, W / 2 - (PX + PW / 2));
  pc(g, PW, H - PH, prof, CZ, PX, (H + PH) / 2, -prof / 2); // verga em cima do portão
  pc(g, PW, 0.12, prof, 0x9aa3a8, PX, 0.06, -prof / 2); // piso de concreto, entrando até a rua
  pc(g, PW, 0.08, 1.8, 0x9aa3a8, PX, 0.05, 0.9, F); pc(g, W - PW, 0.09, 1.7, 0xd5d2c8, PX + PW / 2 + (W - PW) / 2, 0.045, 0.85, F); // rampa do portão e calçadinha
  pc(g, PW, H, 0.1, 0x3b444b, PX, H / 2, -prof + 0.04, F); // parede do fundo, escura: a máquina salta
  // chapas onduladas nas paredes da frente (e o beiral), riscos verticais
  for (let x = -W / 2 + 0.3; x < W / 2; x += 0.75) {
    if (x > PX - PW / 2 - 0.2 && x < PX + PW / 2 + 0.2) { pc(g, 0.26, H - PH - 0.25, 0.06, escuro(CZ, 0.86), x, (H + PH + 0.25) / 2, 0.01, F); continue; }
    pc(g, 0.26, H, 0.06, escuro(CZ, 0.86), x, H / 2, 0.01, F);
  }
  for (const s of [-1, 1]) { // chapas também nos lados e fundo
    for (let z = -0.4; z > -D; z -= 0.9) pc(g, 0.06, H, 0.3, escuro(CZ, 0.86), s * (W / 2 + 0.01), H / 2, z, F);
  }
  for (let x = -W / 2 + 0.4; x < W / 2; x += 0.9) pc(g, 0.3, H, 0.06, escuro(CZ, 0.86), x, H / 2, -D - 0.01, F);
  // batentes do portão listrados de amarelo e preto, verga e porta de enrolar recolhida no alto
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) pc(g, 0.34, 0.76, 0.2, i % 2 ? 0x17181c : 0xffd23f, PX + s * (PW / 2 + 0.17), 0.38 + i * 0.76, 0.09, F);
  pc(g, PW + 0.7, 0.42, 0.5, 0x3b444b, PX, PH + 0.2, 0.05, F);
  for (let i = 0; i < 3; i++) pc(g, PW - 0.1, 0.2, 0.08, 0xa8b4bd, PX, PH - 0.12 - i * 0.24, -0.16, F);
  for (const x of [-5, 0, 5]) pc(g, 2.4, 0.12, 0.5, 0, PX + x, PH - 0.1, -3, { ...F, material: MAT.lampada });
  // letreiro acima do portão
  letreiro(g, "marlon-maquinas", { w: 13.6, h: 2.05, x: PX, y: 6.8, cor: 0xffd23f });
  // ---- a máquina: um container laranja de picar garrafa PET, com funil em cima, esteira e saco de flocos
  const mx = PX - 0.9, mz = -4.3, CW = 7.8, CH = 2.8, CD = 2.8;
  pc(g, CW, CH, CD, LJ, mx, 0.12 + CH / 2 + 0.25, mz);
  pc(g, CW + 0.3, 0.25, CD + 0.3, 0x2a2d31, mx, 0.24, mz, F);
  for (let i = 0; i < 14; i++) pc(g, 0.2, CH - 0.34, 0.06, escuro(LJ, 0.78), mx - CW / 2 + 0.4 + i * ((CW - 0.8) / 13), 0.37 + CH / 2, mz + CD / 2 + 0.02, F);
  for (const q of [-1, 1]) for (const k of [0, 1]) pc(g, 0.32, 0.32, 0.1, 0xc9ced8, mx + q * (CW / 2 - 0.2), 0.55 + k * (CH - 0.4), mz + CD / 2 + 0.06, F); // cantoneiras do container
  // painel de controle e botão verde/vermelho, placa PET
  pc(g, 1.4, 1.1, 0.14, 0xe7ecef, mx + 2.3, 1.75, mz + CD / 2 + 0.1, F);
  pc(g, 0.26, 0.26, 0.08, 0x2fbf4f, mx + 2.0, 1.95, mz + CD / 2 + 0.2, F); pc(g, 0.26, 0.26, 0.08, 0xe0342b, mx + 2.6, 1.95, mz + CD / 2 + 0.2, F); pc(g, 1.0, 0.24, 0.08, 0x2a2d31, mx + 2.3, 1.48, mz + CD / 2 + 0.2, F);
  // letras PET de blocos na lateral do container (sem textura)
  const letra = (x0, m) => m.forEach((ln, i) => [...ln].forEach((c, j) => { if (c === "#") pc(g, 0.17, 0.17, 0.06, 0xffffff, x0 + j * 0.18, 2.55 - i * 0.18, mz + CD / 2 + 0.08, F); }));
  letra(mx - 2.7, ["###", "# #", "###", "#  ", "#  "]); letra(mx - 1.8, ["###", "#  ", "## ", "#  ", "###"]); letra(mx - 0.9, ["###", " # ", " # ", " # ", " # "]);
  // funil, de cima para baixo cada vez mais estreito
  const fx = mx - 2.2, ft = 0.37 + CH;
  [[2.8, 2.4], [2.4, 2.1], [2.0, 1.7], [1.5, 1.3]].forEach(([w, d], i) => pc(g, w, 0.28, d, 0xc9d2da, fx, ft + 1.0 - i * 0.28, mz));
  pc(g, 2.2, 0.08, 1.9, 0x2a3036, fx, ft + 1.19, mz, F); // boca do funil, escura
  for (let i = 0; i < 12; i++) { // garrafas caindo no funil
    const x = fx - 0.95 + (i % 4) * 0.62, z = mz - 0.6 + (Math.floor(i / 4) * 0.55), c = [0x7fd3f2, 0x58c43a, 0xbfe6ff][i % 3];
    pc(g, 0.2, 0.5, 0.2, c, x, ft + 1.42 + (i % 2) * 0.12, z, { ...F, rz: i % 2 ? 0.6 : -0.3 }); pc(g, 0.1, 0.1, 0.1, 0x2f6fc0, x + (i % 2 ? -0.17 : 0.09), ft + 1.69 + (i % 2) * 0.12, z, F);
  }
  // esteira subindo da frente até o funil
  const ang = 0.5, comp = 5.2, ecx = fx - 3.05, ecy = ft + 1.15 - (Math.sin(ang) * comp) / 2, ez = mz + 0.15;
  pc(g, comp, 0.12, 1.15, 0x24262b, ecx + 0.55, ecy, ez, { rz: ang });
  for (let i = 0; i < 8; i++) pc(g, 0.2, 0.06, 1.18, i % 2 ? 0x3d4148 : 0x7f868f, ecx + 0.55 + (i - 3.5) * 0.6 * Math.cos(ang), ecy + 0.08 + (i - 3.5) * 0.6 * Math.sin(ang), ez, { ...F, rz: ang });
  for (const q of [-1, 1]) pc(g, comp, 0.2, 0.08, 0xffd23f, ecx + 0.55, ecy + 0.1, ez + q * 0.6, { ...F, rz: ang });
  for (const [k, a] of [[-0.75, 0.75], [0, 1.5]]) for (const q of [-1, 1]) pc(g, 0.14, a, 0.14, 0x4c5c67, ecx + 0.55 + k * 2 * Math.cos(ang), 0.12 + a / 2, ez + q * 0.52, F);
  // saída: bica e saco grande (big bag) com os flocos de plástico picado
  pc(g, 0.9, 0.6, 1.0, 0x3b444b, mx + CW / 2 + 0.25, 1.15, mz + 0.4, F);
  pc(g, 2.1, 1.55, 1.9, 0xf0f2f4, mx + CW / 2 + 1.2, 0.9, mz + 1.25);
  pc(g, 2.02, 0.2, 1.82, 0x58b6e8, mx + CW / 2 + 1.2, 1.74, mz + 1.25, F);
  for (let i = 0; i < 16; i++) pc(g, 0.12, 0.07, 0.12, [0x7fd3f2, 0x58c43a, 0xffffff][i % 3], mx + CW / 2 + 0.45 + (i % 4) * 0.48, 1.86, mz + 0.65 + Math.floor(i / 4) * 0.4, F);
  for (const q of [-1, 1]) pc(g, 0.1, 0.5, 0.1, 0xf0f2f4, mx + CW / 2 + 1.2 + q * 0.95, 1.9, mz + 2.1, F);
  // garrafas PET em monte na entrada, à esquerda
  const garrafas = [[-5.6, -1.5], [-5.2, -1.2], [-4.8, -1.45], [-4.4, -1.15], [-4.0, -1.5], [-3.6, -1.15], [-5.4, -0.8], [-5.0, -0.7], [-4.6, -0.85], [-4.2, -0.65], [-3.8, -0.85], [-5.1, -1.8], [-4.5, -1.9], [-3.9, -1.85]];
  garrafas.forEach(([dxg, zg], i) => { const c = [0x7fd3f2, 0x58c43a, 0xbfe6ff, 0x4fa8d8][i % 4], yb = 0.27 + (i % 3) * 0.22; pc(g, 0.2, 0.46, 0.2, c, PX + dxg, yb, zg, { ...F, rz: i % 2 ? 1.2 : 0.2 }); });
  // fardos prensados e dois tambores no fundo, à direita do portão
  for (const [dxf, y, c] of [[4.3, 0.55, 0x4fa8d8], [5.5, 0.55, 0x58c43a], [4.9, 1.45, 0x7fd3f2]]) { pc(g, 1.15, 0.86, 1.05, c, PX + dxf, y + 0.05, -1.7); for (const q of [-0.25, 0.25]) pc(g, 1.18, 0.05, 1.08, 0x2a2d31, PX + dxf, y + 0.05 + q, -1.7, F); }
  for (const dxf of [5.8, 4.9]) { const m = malha(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 10), mat(0x2f6fc0)); m.position.set(PX + dxf, 0.67, -3.4); g.add(m); }
  // ---- escritório, à direita do portão: porta verde, janela e telhadinho
  const ox = 8.4;
  porta(g, { x: ox, z: 0.07, w: 2.2, h: 2.9, cor: VD });
  const esc = new THREE.Group(); esc.position.x = ox; g.add(esc);
  janelas(esc, { w: 4, andares: 1, z: 0.07, y0: 3.75, jw: 2.8, jh: 1.3, colunas: 1, cor: 0xffffff, alt: 3 });
  pc(g, 3.8, 0.2, 1.1, VD, ox, 3.2, 0.55, { rx: 0.14 });
  vaso(g, ox - 2.1, 0.8, 0x2f6fc0, 0x4cb83f);
  // telhado do galpão, em arco de degraus, com claraboias e frontão
  telhadoDegraus(g, W, D, VD, H + 0.42, -D / 2, { camadas: 4, alt: 0.5, beiral: 0.25 });
  for (const q of [-1, 1]) for (const k of [0.3, 0.7]) pc(g, 2.2, 0.08, 3, 0xbfe6ff, q * 5.5, H + 1.02, -D * k, F);
  for (const q of [-1, 1]) { const ch = malha(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 10), mat(0xc9d2da)); ch.position.set(q * 7.5, H + 1.7, -D * 0.72); g.add(ch); pc(g, 1, 0.14, 1, 0x7f96a3, q * 7.5, H + 2.56, -D * 0.72, F); }
  S.porta = [PX, 1.2]; S.portao = [PX, 1.2];
  S.pessoa = { id: "marlon", x: 3.9, z: 1.25 };
  return fechar(S, W, D);
}

// ==================================================================== Café com Deus Pai Kids: livraria infantil e cantinho de leitura
function livroGrande(g, x, y, z, s, ry = 0) {
  const a = new THREE.Group(); a.position.set(x, y, z); a.rotation.set(0.85, ry, 0); g.add(a);
  for (const q of [-1, 1]) {
    pc(a, 1.5 * s, 0.12 * s, 1.3 * s, 0x3f9fd0, q * 0.78 * s, 0, 0, { rz: q * 0.22 });
    pc(a, 1.32 * s, 0.11 * s, 1.14 * s, 0xffffff, q * 0.74 * s, 0.12 * s, 0, { ...F, rz: q * 0.22 });
    for (let i = 0; i < 4; i++) pc(a, 0.96 * s, 0.03 * s, 0.05 * s, 0xf28a2e, q * 0.74 * s, 0.18 * s + (0.74 * 0.22 * s) * 0.5, -0.36 * s + i * 0.24 * s, { ...F, rz: q * 0.22 });
  }
}
function estanteLivros(g, x, y0, z, w, h, cor = 0xb0702f) {
  pc(g, w, h, 0.34, cor, x, y0 + h / 2, z - 0.12);
  const CL = [0xe8413c, 0x2f8fe8, 0x58c43a, 0xffb01f, 0x8e6cff, 0xec2e8c, 0x1fc08e];
  const nivel = Math.floor(h / 0.72);
  for (let n = 0; n < nivel; n++) {
    const yb = y0 + 0.1 + n * 0.72; let xa = x - w / 2 + 0.12, i = n * 3;
    pc(g, w, 0.08, 0.4, escuro(cor, 0.82), x, yb - 0.04, z + 0.02, F);
    while (xa < x + w / 2 - 0.3) { const lw = 0.14 + (i % 3) * 0.05, lh = 0.4 + (i % 4) * 0.05; pc(g, lw, lh, 0.28, CL[i % CL.length], xa + lw / 2, yb + lh / 2, z + 0.04, F); xa += lw + 0.015; i++; }
  }
}
export function cafeComDeusPaiKids(l) {
  const S = novo(), g = S.grupo, W = 16, H = 6.6, D = 9.5, prof = 1.5, AM = 0xffe9b8, AZ = 0x3f9fd0, LJ = 0xf28a2e, MD = 0xb0702f;
  const vaos = [{ x: -5.1, w: 5.2, a: 0.8, b: 3.6 }, { x: 5.1, w: 5.2, a: 0.8, b: 3.6 }];
  casco(g, { W, H, D, prof, cor: AM, beiral: AZ, rodape: MD });
  parede(g, { W, y1: H, prof, cor: AM, vaos });
  pc(g, W + 0.14, 0.7, 0.14, MD, 0, 0.35, 0.04, F);
  piso(g, W, 0xe9dcc0);
  for (const v of vaos) { vitrine(g, { ...v, cor: AZ, prof }); pc(g, v.w, b(v), 0.1, 0xfff9e8, v.x, (v.a + v.b) / 2, -prof + 0.06, F); pc(g, v.w, 0.1, prof - 0.1, 0xd7a86a, v.x, v.a + 0.05, -prof / 2, F); }
  // vitrine da esquerda: estante cheia de livros; da direita: cantinho de leitura com tapete, pufes e estante baixa
  const E = vaos[0], C = vaos[1], fv = -prof + 0.34;
  estanteLivros(g, E.x, E.a + 0.1, fv, E.w - 0.4, 2.45);
  pc(g, C.w, 0.05, prof - 0.2, 0xff9ec0, C.x, C.a + 0.12, -prof / 2, F);
  pc(g, 1.7, 0.56, 0.74, LJ, C.x - 1.25, C.a + 0.42, -prof / 2 - 0.1); pc(g, 1.3, 0.3, 0.6, claro(LJ, 0.3), C.x - 1.25, C.a + 0.8, -prof / 2 - 0.1, F); // pufe
  pc(g, 1.7, 0.56, 0.74, AZ, C.x + 1.3, C.a + 0.42, -prof / 2 - 0.1); pc(g, 1.3, 0.3, 0.6, claro(AZ, 0.3), C.x + 1.3, C.a + 0.8, -prof / 2 - 0.1, F); // pufe
  estanteLivros(g, C.x, C.a + 1.32, fv, C.w - 0.6, 1.4);
  pc(g, 0.9, 0.08, 0.5, 0xffffff, C.x, C.a + 0.92, -prof / 2 - 0.05, { ...F, rz: 0.1 }); pc(g, 0.8, 0.5, 0.7, 0xffd23f, C.x, C.a + 0.42, -prof / 2 - 0.05);
  pc(g, 0.15, 0.15, 0.2, MD, C.x - 0.3, C.a + 1.05, -prof / 2, F); // caneca no apoio
  // porta de madeira com vidro e arquinho em degraus
  porta(g, { z: 0.05, w: 2.4, h: 3.1, cor: MD, vidro: false });
  [[3.2, 3.32], [2.6, 3.54], [1.8, 3.74]].forEach(([w, y]) => pc(g, w, 0.22, 0.16, AZ, 0, y, 0.08, F));
  letreiro(g, "cafe-com-deus-pai-kids", { w: 12.4, h: 2.15, y: 5.0, cor: AZ });
  // telhado de casinha em degraus (duas águas), telhas azuis e frontão amarelo
  telhadoDegraus(g, W, D, AZ, H + 0.42, -D / 2, { camadas: 5, alt: 0.55, beiral: 0.3 });
  // livro aberto gigante, inclinado para a rua, no alto do telhado, em cima de um suporte
  pc(g, 0.34, 1.1, 0.34, MD, 0, H + 3.5, -D / 2 + 1.5, F);
  livroGrande(g, 0, H + 4.35, -D / 2 + 1.6, 1.7);
  // banquinho de leitura e floreiras
  pc(g, 2.6, 0.14, 0.6, MD, -5.1, 0.62, 0.9, F); for (const q of [-1, 1]) pc(g, 0.16, 0.56, 0.5, escuro(MD, 0.8), -5.1 + q * 1.05, 0.3, 0.9, F);
  [[-5.8, 0xe8413c], [-5.3, 0x2f8fe8]].forEach(([x, c]) => pc(g, 0.45, 0.1, 0.34, c, x, 0.74, 0.9, F));
  for (const q of [-1, 1]) vaso(g, q * 2.1, 0.85, AZ, 0x4cb83f, 0xffffff);
  janelasEmVolta(g, W, D, { y0: 3.2, cor: AZ, zFrente: prof });
  S.porta = [0, 0.6];
  return fechar(S, W, D);
}

// ==================================================================== Ballet e Cia: a mais caprichada. Teatrinho com cortina de palco na
// entrada, janelões de sala de dança com barra e espelho no andar de cima, e sapatilhas gigantes penduradas no letreiro.
function sapatilha3D(g, x, y, z, s, lado = 1, cor = 0xff9ec0) {
  // de lado, em pixels de blocos (o desenho é o mesmo do letreiro): bico para o lado "lado", abertura clara em cima, fita subindo
  const P = ["....OOO........", "...OiiiO.......", "..OOOOOOOO.....", "..OOOOOOOOOOO..", ".OOOOOOOOOOOOO.", ".OOOOOOOOOOOOOO", "..SSSSSSSSSSSS."];
  const t = 0.2 * s, n = P[0].length;
  P.forEach((ln, i) => [...ln].forEach((q, j) => {
    if (q === ".") return;
    const c = q === "i" ? claro(cor, 0.72) : q === "S" ? escuro(cor, 0.72) : i < 2 ? claro(cor, 0.2) : cor;
    pc(g, t, t, 0.62 * s, c, x + lado * (j - n / 2) * t, y + (P.length - i) * t, z, { sombra: i === 3 && j % 3 === 0 });
  }));
  // fitas subindo do tornozelo
  for (const q of [-1, 1]) pc(g, 0.09 * s, 0.9 * s, 0.07, 0xffc7d9, x + lado * (4.5 - n / 2) * t + q * 0.16 * s, y + (P.length + 1) * t + 0.4 * s, z, { ...F, rz: q * 0.2 });
}
export function balletECia(l) {
  const S = novo(), g = S.grupo, W = 20, H = 9.2, D = 11.5, R = 0xfbe4ec, RS = 0xb5447e, VN = 0x7d1f4f, OU = 0xe5bd5a, BR = 0xfff7f2;
  const T = 4.55, prof = 1.5; // altura do térreo e fundo dos vãos
  const PW = 7.2, PH = 4.05; // boca de palco
  const vaosT = [{ x: -7.15, w: 3.5, a: 0.95, b: 3.75 }, { x: 0, w: PW, a: 0, b: PH }, { x: 7.15, w: 3.5, a: 0.95, b: 3.75 }];
  const vaosS = [{ x: -6.3, w: 5, a: T + 0.42, b: H - 0.75 }, { x: 0, w: 5, a: T + 0.42, b: H - 0.75 }, { x: 6.3, w: 5, a: T + 0.42, b: H - 0.75 }];
  casco(g, { W, H, D, prof, cor: R, beiral: VN, rodape: VN });
  parede(g, { W, y1: T, prof, cor: R, vaos: vaosT });
  parede(g, { W, y0: T, y1: H, prof, cor: claro(R, 0.3), vaos: vaosS });
  for (const q of [-1, 1]) pc(g, (W - PW) / 2 + 0.07, 0.7, 0.14, VN, q * (PW / 2 + (W - PW) / 4), 0.35, 0.04, F);
  piso(g, W, 0xf1e7dc);
  // cinta e cornija dourada entre os andares; pilastras brancas com capitel
  pc(g, W + 0.2, 0.3, 0.3, OU, 0, T + 0.02, 0.1, F); pc(g, W + 0.4, 0.14, 0.42, claro(OU, 0.35), 0, T + 0.22, 0.14, F);
  for (const x of [-W / 2 + 0.36, -4.55, 4.55, W / 2 - 0.36]) { pc(g, 0.5, T, 0.26, BR, x, T / 2, 0.08, F); pc(g, 0.72, 0.26, 0.36, OU, x, T - 0.28, 0.08, F); pc(g, 0.72, 0.26, 0.36, OU, x, 0.16, 0.08, F); }
  // ---- boca de palco: moldura dourada, lâmpadas, chão de tábuas, cortina vinho e a porta ao fundo
  const pz = -prof + 0.06;
  moldura(g, 0, 0.01, PH, PW, OU, 0.34, 0.08, 0.26);
  pc(g, PW, 0.12, prof, 0xc98a4b, 0, 0.09, -prof / 2); for (let i = 1; i < 5; i++) pc(g, 0.04, 0.02, prof, 0x8a5a2c, -PW / 2 + (PW * i) / 5, 0.16, -prof / 2, F); // tablado
  pc(g, PW + 0.5, 0.12, 0.8, 0xfff0d8, 0, 0.06, 0.45, F); pc(g, PW - 0.6, 0.1, 0.7, 0xeed9b8, 0, 0.13, 0.5, F); // degraus do palco, na frente
  pc(g, PW, PH, 0.1, 0x2a0d24, 0, PH / 2, pz, F); // fundo escuro
  porta(g, { z: pz + 0.06, w: 2.5, h: 3.2, cor: 0x5e1f4c });
  // cortina: panos dobrados dos dois lados e bandô em cima, com franja dourada
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
    const larg = 0.48, x = s * (PW / 2 - 0.25 - i * larg), recuo = -0.42 - (i % 2) * 0.12, topo = PH, base = 0.1;
    const altura = topo - base - Math.max(0, i - 2) * 0.6; // abre em leque: pano do meio termina mais alto
    pc(g, larg + 0.02, altura, 0.3, i % 2 ? VN : 0xa82a60, x, topo - altura / 2, recuo, F);
    if (altura < topo - base) pc(g, larg + 0.02, 0.12, 0.34, OU, x, topo - altura + 0.03, recuo, F);
  }
  pc(g, PW, 0.72, 0.3, VN, 0, PH - 0.38, -0.2, F);
  for (let i = 0; i < 12; i++) pc(g, PW / 12 - 0.04, 0.17, 0.32, i % 2 ? 0xa82a60 : VN, -PW / 2 + (PW / 12) * (i + 0.5), PH - 0.82, -0.2, F);
  pc(g, PW, 0.09, 0.34, OU, 0, PH - 0.95, -0.2, F);
  // lâmpadas de camarim ao redor da boca
  for (let i = 0; i < 11; i++) pc(g, 0.22, 0.22, 0.14, 0, -PW / 2 + (PW * i) / 10, PH + 0.14, 0.24, { ...F, material: MAT.lampada });
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) pc(g, 0.22, 0.22, 0.14, 0, s * (PW / 2 + 0.18), 0.6 + i * 0.75, 0.24, { ...F, material: MAT.lampada });
  // ---- vitrines do térreo: tutu num manequim de costura (só a saia) e par de sapatilhas num pedestal
  for (const [i, v] of [vaosT[0], vaosT[2]].entries()) {
    vitrine(g, { ...v, cor: RS, prof });
    pc(g, v.w, b(v), 0.1, 0xfff5f8, v.x, (v.a + v.b) / 2, pz, F); pc(g, v.w, 0.1, prof - 0.1, 0xe9c9d6, v.x, v.a + 0.05, -prof / 2, F);
    if (i === 0) { // tutu: discos de tule abertos num cabide de pé, sem corpo
      const yt = v.a + 1.45;
      pc(g, 0.08, 1.8, 0.08, 0x8a93a3, v.x, v.a + 0.95, -prof / 2, F); pc(g, 0.7, 0.08, 0.5, 0x8a93a3, v.x, v.a + 0.14, -prof / 2, F);
      pc(g, 0.4, 0.26, 0.24, VN, v.x, yt + 0.32, -prof / 2, F); pc(g, 0.54, 0.3, 0.26, VN, v.x, yt + 0.6, -prof / 2, F); // corpete no cabide
      for (const q of [-1, 1]) pc(g, 0.07, 0.3, 0.1, VN, v.x + q * 0.2, yt + 0.88, -prof / 2, F);
      pc(g, 0.5, 0.06, 0.08, 0x8a93a3, v.x, yt + 1.05, -prof / 2, F);
      for (const [w, y, c] of [[2.3, 0, 0xffd3e2], [2.0, 0.08, 0xffc1d6], [1.6, 0.16, 0xffadc8], [1.1, 0.24, 0xff9ec0]]) pc(g, w, 0.08, 0.3 + w * 0.3, c, v.x, yt + y, -prof / 2, F);
    } else {
      pc(g, 1.3, 0.55, 0.8, 0xfff8ee, v.x, v.a + 0.37, -prof / 2, F); pc(g, 1.5, 0.08, 0.92, OU, v.x, v.a + 0.68, -prof / 2, F);
      sapatilha3D(g, v.x, v.a + 0.75, -prof / 2 - 0.2, 0.32, -1); sapatilha3D(g, v.x, v.a + 0.75, -prof / 2 + 0.2, 0.32, -1);
    }
  }
  // ---- janelões do 1º andar: sala de dança com espelho, barra dourada e bailarina nenhuma (só a sala)
  for (const v of vaosS) {
    moldura(g, v.x, v.a, v.b, v.w, BR, 0.26, 0.06, 0.18);
    pc(g, v.w + 0.6, 0.16, 0.44, OU, v.x, v.a - 0.3, 0.12, F); // peitoril
    pc(g, v.w, v.b - v.a, 0.1, 0xc9e8f4, v.x, (v.a + v.b) / 2, pz, F); // parede de espelho, lá no fundo
    for (let i = 1; i < 4; i++) pc(g, 0.05, v.b - v.a, 0.12, 0xe9f6fb, v.x - v.w / 2 + (v.w * i) / 4, (v.a + v.b) / 2, pz + 0.03, F);
    pc(g, v.w, 0.1, prof - 0.1, 0xc98a4b, v.x, v.a + 0.05, -prof / 2, F); // piso da sala
    pc(g, v.w - 0.2, 0.1, 0.1, 0xe5bd5a, v.x, v.a + 1.15, -0.72, F); // barra de ballet
    for (const q of [-1, 1]) { pc(g, 0.09, 1.15, 0.09, 0x9a7a3a, v.x + q * (v.w / 2 - 0.5), v.a + 0.58, -0.72, F); pc(g, 0.09, 0.09, 0.62, 0x9a7a3a, v.x + q * (v.w / 2 - 0.5), v.a + 1.0, -1.03, F); }
    pc(g, v.w, b(v), 0.04, 0, v.x, (v.a + v.b) / 2, -0.04, { ...F, material: VIDRO });
    for (const q of [-1, 1]) pc(g, 0.1, v.b - v.a, 0.1, BR, v.x + (q * v.w) / 6, (v.a + v.b) / 2, -0.02, F); // caixilho
    pc(g, v.w, 0.1, 0.1, BR, v.x, v.b - 0.62, -0.02, F);
    pc(g, v.w - 0.5, 0.1, 0.3, 0, v.x, v.b - 0.05, -0.75, { ...F, material: MAT.lampada });
  }
  // ---- letreiro acima do telhado, entre dois frontões em degraus, com as sapatilhas gigantes penduradas nas pontas
  const Ly = H + 2.0, Lw = 13.4, Lh = 2.5;
  for (const q of [-1, 1]) pc(g, 0.5, 2.5, 0.5, VN, q * (Lw / 2 - 1), H + 1.1, -0.45);
  letreiro(g, "ballet-e-cia", { w: Lw, h: Lh, y: Ly, z: -0.2, cor: OU });
  [[Lw + 1.8, 0.34], [Lw - 1.4, 0.3], [6.2, 0.3], [2.6, 0.32]].forEach(([w, a], i) => pc(g, w, a, 0.42, i % 2 ? claro(OU, 0.35) : OU, 0, Ly + Lh / 2 + 0.38 + i * 0.32, -0.2, F));
  laco(g, 0, Ly + Lh / 2 + 1.95, -0.18, 1.5, 0xff9ec0); // laço de fita no alto do frontão
  // braços que saem do letreiro, com a sapatilha gigante pendurada (par: uma em cada ponta do prédio)
  for (const q of [-1, 1]) {
    pc(g, 2.9, 0.26, 0.26, OU, q * (Lw / 2 + 0.95), H + 2.95, 0.05, F);
    pc(g, 0.34, 0.34, 0.34, claro(OU, 0.35), q * (Lw / 2 + 2.35), H + 2.95, 0.05, F);
    sapatilha3D(g, q * (Lw / 2 + 1.65), H + 0.95, 0.05, 0.8, -q);
  }
  // sacadinha com balaustrada no meio do 1º andar e bandeirolas de fita
  for (const q of [-1, 1]) { pc(g, 0.4, 0.4, 0.4, OU, q * (W / 2 - 0.25), H + 0.72, 0.05, F); }
  // floreiras e postes de teatro na calçada, na entrada
  for (const q of [-1, 1]) {
    vaso(g, q * (PW / 2 + 1.25), 0.85, RS, 0x4cb83f, 0xffc7d9);
    pc(g, 0.16, 2.2, 0.16, OU, q * (PW / 2 + 0.55), 1.1, 1.0, F); pc(g, 0.42, 0.42, 0.42, 0, q * (PW / 2 + 0.55), 2.35, 1.0, { ...F, material: MAT.lampada }); pc(g, 0.52, 0.1, 0.52, OU, q * (PW / 2 + 0.55), 2.61, 1.0, F);
  }
  janelasEmVolta(g, W, D, { andares: 2, y0: 1.5, alt: 4.1, cor: OU, zFrente: prof });
  S.porta = [0, 1.0];
  S.pessoa = { id: "samira", x: 2.7, z: 1.42 };
  return fechar(S, W, D);
}
// ==================================================================== BT Models: agência de publicidade e moda. Entrada com passarela e
// tapete, cartazes de campanha em arte abstrata (só formas, nunca pessoa) e refletores sobre a passarela.
function cartazAbstrato(g, x, y, w, h, z, fundo, a, c, tipo) {
  pc(g, w + 0.26, h + 0.26, 0.12, 0xf4f1e6, x, y, z, F);
  pc(g, w, h, 0.14, fundo, x, y, z + 0.02, F);
  if (tipo === 0) { // quadrados em diagonal e faixa em escada (só formas: nada que lembre uma figura)
    for (let i = 0; i < 3; i++) pc(g, w * 0.2, h * 0.2, 0.17, a, x - w * 0.28 + i * w * 0.28, y + h * 0.3 - i * h * 0.16, z + 0.02, F);
    for (let i = 0; i < 4; i++) pc(g, w * (0.25 + i * 0.25), h * 0.08, 0.17, c, x - w / 2 + (w * (0.25 + i * 0.25)) / 2, y - h / 2 + h * 0.05 + (3 - i) * h * 0.08, z + 0.02, F);
  } else if (tipo === 1) { // barras de alturas diferentes
    [0.65, 0.3, 0.85, 0.5].forEach((q, i) => pc(g, w * 0.17, h * q, 0.17, i % 2 ? c : a, x - w * 0.33 + i * w * 0.22, y - h / 2 + (h * q) / 2 + 0.03, z + 0.02, F));
  } else { // quadrados encaixados
    pc(g, w * 0.7, h * 0.48, 0.16, a, x, y, z + 0.02, F); pc(g, w * 0.42, h * 0.28, 0.18, c, x, y, z + 0.02, F); pc(g, w * 0.16, h * 0.11, 0.2, fundo, x, y, z + 0.02, F);
  }
}
function refletor(g, x, y, z, ang = 0.5, lente = true) {
  pc(g, 0.09, 0.5, 0.09, 0x2a2b31, x, y + 0.2, z, F);
  pc(g, 0.48, 0.42, 0.56, 0x17181c, x, y - 0.12, z, { ...F, rx: ang });
  if (lente) pc(g, 0.34, 0.3, 0.06, 0, x, y - 0.22, z + 0.26, { ...F, rx: ang, material: MAT.lampada });
}
export function btModels(l) {
  const S = novo(), g = S.grupo, W = 18, H = 10, D = 10.5, GR = 0x23242b, OU = 0xe7c35a, VL = 0xa01a3c, BR = 0xf4f1e6;
  const T = 4.75, prof = 3.2, CW = 6.4, CH = 4.2;
  const vaosT = [{ x: -6.2, w: 3.6, a: 0.8, b: 4.0 }, { x: 0, w: CW, a: 0, b: CH }, { x: 6.2, w: 3.6, a: 0.8, b: 4.0 }];
  casco(g, { W, H, D, prof, cor: GR, beiral: OU, rodape: 0x111216 });
  parede(g, { W, y1: T, prof, cor: 0x2c2d35, vaos: vaosT });
  parede(g, { W, y0: T, y1: H, prof: 0.4, cor: GR });
  pc(g, W, H - T, prof - 0.4, GR, 0, (H + T) / 2, -0.4 - (prof - 0.4) / 2); // recheio do 1º andar, atrás da frente
  pc(g, (W - CW) / 2, 0.7, 0.14, 0x111216, -CW / 2 - (W - CW) / 4, 0.35, 0.04, F); pc(g, (W - CW) / 2, 0.7, 0.14, 0x111216, CW / 2 + (W - CW) / 4, 0.35, 0.04, F);
  pc(g, W, 0.09, 1.7, 0xdedbd0, 0, 0.045, 0.85, F);
  pc(g, W + 0.14, 0.24, 0.24, OU, 0, T + 0.02, 0.07, F);
  // ---- a entrada: chão escuro, refletores no teto, fundo de painéis coloridos, passarela elevada e tapete até a calçada
  pc(g, CW, 0.14, prof, 0x17181c, 0, 0.07, -prof / 2);
  moldura(g, 0, 0.01, CH, CW, OU, 0.22, 0.06, 0.14);
  pc(g, CW, CH, 0.1, 0x191a20, 0, CH / 2, -prof + 0.06, F);
  porta(g, { z: -prof + 0.12, w: 2.3, h: 3.05, cor: OU });
  for (const q of [-1, 1]) { // painéis de arte abstrata nas paredes de fundo, dos dois lados da porta
    cartazAbstrato(g, q * 2.22, 2.0, 1.3, 2.3, -prof + 0.14, q < 0 ? 0xe6396b : 0x2f8fe8, q < 0 ? 0xffd23f : 0xffffff, q < 0 ? 0x17181c : OU, q < 0 ? 2 : 1);
  }
  // passarela elevada, com beirada dourada e luzinhas, descendo em degrau até o tapete na calçada
  const pw = 2.3;
  pc(g, pw + 0.26, 0.26, prof - 0.1, OU, 0, 0.21, -prof / 2 + 0.03);
  pc(g, pw, 0.09, prof - 0.1, VL, 0, 0.38, -prof / 2 + 0.03, F);
  for (const q of [-1, 1]) for (let i = 0; i < 5; i++) pc(g, 0.13, 0.11, 0.13, 0, q * (pw / 2 + 0.2), 0.42, -0.35 - i * 0.62, { ...F, material: MAT.lampada });
  pc(g, pw + 0.26, 0.14, 0.5, OU, 0, 0.09, 0.28, F); pc(g, pw, 0.05, 0.5, VL, 0, 0.18, 0.28, F);
  pc(g, pw, 0.03, 1.1, VL, 0, 0.11, 1.2, F); // tapete
  for (const q of [-1, 1]) { pc(g, 0.08, 0.03, 1.1, OU, q * (pw / 2 + 0.04), 0.115, 1.2, F); }
  // pedestais de cordão dos dois lados da entrada
  for (const q of [-1, 1]) {
    for (const z of [0.5, 1.5]) { pc(g, 0.3, 0.06, 0.3, OU, q * 1.75, 0.13, z, F); pc(g, 0.08, 0.95, 0.08, OU, q * 1.75, 0.6, z, F); pc(g, 0.16, 0.16, 0.16, claro(OU, 0.35), q * 1.75, 1.13, z, F); }
    pc(g, 0.07, 0.07, 1.0, VL, q * 1.75, 0.92, 1.0, F);
  }
  // refletores de desfile no teto da entrada e trilho
  pc(g, CW - 0.4, 0.1, 0.1, 0x45464d, 0, CH - 0.12, -1.0, F);
  for (const x of [-2, -0.7, 0.7, 2]) refletor(g, x, CH - 0.34, -1.0, -0.5);
  // ---- vitrines laterais com cartazes de campanha (só formas, nenhuma pessoa)
  for (const [i, v] of [vaosT[0], vaosT[2]].entries()) {
    vitrine(g, { ...v, cor: OU, prof: 1.6 });
    pc(g, v.w, b(v), 0.1, 0xefece2, v.x, (v.a + v.b) / 2, -prof + 0.06, F);
    pc(g, v.w, 0.1, prof - 0.1, 0x5a5b63, v.x, v.a + 0.05, -prof / 2, F);
    cartazAbstrato(g, v.x + (i ? 0.45 : -0.45), v.a + 1.65, 1.5, 2.2, -prof + 0.14, i ? 0x17181c : 0xffb01f, i ? OU : VL, i ? 0xec2e8c : 0xffffff, i ? 0 : 1);
    cartazAbstrato(g, v.x + (i ? -1.0 : 1.0), v.a + 1.1, 0.95, 1.4, -1.7, i ? 0x58c43a : 0x8e6cff, 0xffffff, 0xffd23f, 2);
    pc(g, 1.05, 0.1, 0.4, 0x5a5b63, v.x + (i ? -1.0 : 1.0), v.a + 0.35, -1.7, F); pc(g, 0.08, 0.3, 0.08, 0x5a5b63, v.x + (i ? -1.0 : 1.0), v.a + 0.2, -1.7, F);
  }
  // ---- 1º andar: painéis de campanha gigantes em arte abstrata e letreiro
  const CY = T + 1.42;
  [[-6.2, 0xe6396b, 0xffd23f, 0x17181c, 2], [-2.1, 0x2f8fe8, 0xffffff, OU, 1], [2.1, 0xffb01f, 0x17181c, 0xec2e8c, 0], [6.2, 0x7a4fd1, 0xe7ffd8, 0xffd23f, 1]]
    .forEach(([x, f, a, c, t]) => { cartazAbstrato(g, x, CY, 3.3, 2.15, 0.06, f, a, c, t); pc(g, 3.7, 0.08, 0.26, 0, x, CY + 1.27, 0.18, { ...F, material: MAT.lampada }); });
  letreiro(g, "bt-models", { w: 11, h: 1.72, y: H - 1.02, cor: OU });
  for (const q of [-1, 1]) pc(g, 0.2, H - T, 0.2, OU, q * (W / 2 - 0.12), (H + T) / 2, 0.04, F);
  // no telhado, torre de refletores (de campanha) com a treliça
  const Y = H + 0.42, Z = -D / 2;
  pc(g, 7.4, 0.2, 1.1, 0x34353c, 0, Y + 2.05, Z); pc(g, 7.8, 0.14, 0.2, OU, 0, Y + 2.2, Z + 0.45, F);
  for (const q of [-1, 1]) { pc(g, 0.22, 2.1, 0.22, 0x45464d, q * 3.2, Y + 1.02, Z); for (let i = 0; i < 3; i++) pc(g, 0.06, 0.74, 0.06, 0x707178, q * 3.2 + 0.18, Y + 0.35 + i * 0.6, Z, { ...F, rz: i % 2 ? 0.5 : -0.5 }); }
  for (const x of [-2.4, -0.8, 0.8, 2.4]) refletor(g, x, Y + 1.72, Z + 0.1, 0.42);
  janelasEmVolta(g, W, D, { andares: 2, y0: 1.5, alt: 3.8, cor: OU, zFrente: prof });
  S.porta = [0, 1.0];
  return fechar(S, W, D);
}

// ==================================================================== Speedy Soluções: box, esquadrias, vidros temperados, espelhos e guarda-corpo. A própria frente é a
// vitrine do serviço: pele de vidro com perfis, oficina à vista por trás e placas de vidro em cavaletes na entrada.
function cavalete(g, x, z) {
  const a = new THREE.Group(); a.position.set(x, 0.09, z); g.add(a);
  const MD = 0x8a6a48;
  for (const q of [-1, 1]) { pc(a, 0.14, 2.2, 0.14, MD, q * 0.85, 1.05, -0.3, { rx: 0.2 }); pc(a, 0.14, 2.2, 0.14, MD, q * 0.85, 1.05, 0.14, { ...F, rx: -0.2 }); }
  pc(a, 2.1, 0.14, 0.34, MD, 0, 0.26, 0.28, F);
  // duas placas encostadas, com a borda clara: vidro de verdade (transparente) e uma linha de brilho
  for (const [dz, w, h] of [[0.32, 1.7, 1.75], [0.22, 1.4, 1.95]]) {
    pc(a, w, h, 0.05, 0, 0, 0.36 + h / 2, dz, { ...F, material: VIDRO_FORTE, rx: -0.2 });
    pc(a, w + 0.05, 0.05, 0.07, 0xdfe7ee, 0, 0.36 + h * 0.98, dz - h * 0.2 + 0.01, { ...F, rx: -0.2 });
  }
}
export function speedySolucoes(l) {
  const S = novo(), g = S.grupo, W = 17, H = 7.8, D = 9.5, prof = 2.1, GF = 0x3a4653, AL = 0xc3ccd4, T = 4.6;
  casco(g, { W, H, D, prof, cor: GF, beiral: AL, rodape: 0x262e36 });
  // térreo: vão de ponta a ponta com a oficina atrás da pele de vidro; em cima, painéis de vidro azulado (opaco por fora)
  for (const q of [-1, 1]) pc(g, 0.4, H, prof, GF, q * (W / 2 - 0.2), H / 2, -prof / 2);
  pc(g, W - 0.8, H - T, prof, GF, 0, (H + T) / 2, -prof / 2);
  pc(g, W, 0.14, prof, 0x8f979e, 0, 0.07, -prof / 2);
  pc(g, W - 0.8, T, 0.1, 0xe4e9ec, 0, T / 2, -prof + 0.06, F);
  pc(g, W, 0.09, 1.7, 0xd9dcdc, 0, 0.045, 0.85, F);
  // ---- o que se vê lá dentro: bancada com perfis, rack com vidros em pé
  pc(g, 4.2, 0.14, 1.0, 0xb08a5a, -5.3, 1.05, -1.3); for (const q of [-1, 1]) pc(g, 0.14, 1.0, 0.8, 0x4c5660, -5.3 + q * 1.9, 0.55, -1.3, F);
  for (let i = 0; i < 4; i++) pc(g, 3.6, 0.09, 0.09, 0x8e98a2, -5.3, 1.17, -1.65 + i * 0.22, F);
  pc(g, 0.7, 0.5, 0.6, 0x2f6fc0, -6.5, 1.37, -1.05, F); pc(g, 0.36, 0.18, 0.1, 0xeef2f5, -6.5, 1.37, -0.72, F); // máquina de corte
  pc(g, 4.2, 0.2, 1.0, 0x4c5660, 5.3, 0.24, -1.15);
  for (const q of [-1, 1]) pc(g, 0.14, 2.6, 0.14, 0x4c5660, 5.3 + q * 1.9, 1.4, -1.15, F);
  pc(g, 4.0, 0.12, 0.12, 0x4c5660, 5.3, 2.66, -1.15, F);
  for (let i = 0; i < 4; i++) { pc(g, 3.5, 2.3, 0.05, 0, 5.3, 1.45, -1.42 + i * 0.16, { ...F, material: VIDRO_FORTE }); pc(g, 3.5, 0.05, 0.08, 0xdff3fb, 5.3, 2.6, -1.42 + i * 0.16, F); }
  pc(g, W - 1, 0.1, 0.3, 0, 0, T - 0.08, -1, { ...F, material: MAT.lampada });
  // espelho de amostra na parede do fundo, com moldura de alumínio
  pc(g, 1.5, 2.9, 0.08, AL, -2.75, 2.1, -prof + 0.14, F); pc(g, 1.3, 2.7, 0.1, 0xdff4fb, -2.75, 2.1, -prof + 0.15, F); pc(g, 0.3, 2.4, 0.11, 0xffffff, -3.05, 2.2, -prof + 0.16, { ...F, rz: 0.12 });
  // ---- a pele de vidro: um vidro só, com grade de perfis de alumínio e porta dupla no meio
  pc(g, W - 0.8, T, 0.05, 0, 0, T / 2, -0.05, { ...F, material: VIDRO });
  const colunas = 8, ww = W - 0.8;
  for (let i = 0; i <= colunas; i++) pc(g, i % 2 ? 0.1 : 0.16, T, 0.2, AL, -ww / 2 + (ww * i) / colunas, T / 2, 0.02, F);
  for (const y of [0.1, 1.65, T - 0.08]) { for (const q of [-1, 1]) pc(g, (ww - 3.86) / 2, 0.14, 0.2, AL, q * (1.93 + (ww - 3.86) / 4), y, 0.02, F); }
  // porta: dois vidros com puxador comprido e o pórtico mais grosso
  pc(g, 0.26, 3.4, 0.28, AL, -1.8, 1.7, 0.04, F); pc(g, 0.26, 3.4, 0.28, AL, 1.8, 1.7, 0.04, F); pc(g, 3.86, 0.26, 0.28, AL, 0, 3.4, 0.04, F);
  pc(g, 3.4, 3.28, 0.06, 0, 0, 1.68, 0.06, { ...F, material: VIDRO_FORTE }); pc(g, 0.08, 3.28, 0.1, AL, 0, 1.68, 0.06, F);
  for (const q of [-1, 1]) pc(g, 0.09, 1.3, 0.14, 0x20262c, q * 0.34, 1.65, 0.15, F);
  // marquise de vidro e alumínio sobre a porta
  pc(g, 6, 0.1, 1.5, 0, 0, 3.8, 0.75, { ...F, material: VIDRO_FORTE }); pc(g, 6.1, 0.14, 0.12, AL, 0, 3.8, 1.5, F);
  for (const q of [-1, 1]) pc(g, 0.12, 0.14, 1.5, AL, q * 3, 3.8, 0.75, F);
  // andar de cima: painéis azulados (espelho) com grade de perfis, e o letreiro por cima
  const pa = T + 0.05, pb = H - 0.2;
  pc(g, W - 0.2, pb - pa, 0.08, 0x6fb5dd, 0, (pa + pb) / 2, 0.03, F);
  for (let i = 0; i <= colunas; i++) pc(g, i % 2 ? 0.08 : 0.14, pb - pa, 0.14, AL, -ww / 2 + (ww * i) / colunas, (pa + pb) / 2, 0.06, F);
  pc(g, W - 0.2, 0.14, 0.16, AL, 0, pa, 0.05, F); pc(g, W - 0.2, 0.14, 0.16, AL, 0, pb, 0.05, F);
  letreiro(g, "speedy-solucoes", { w: 11.4, h: 2.05, y: (pa + pb) / 2 + 0.05, z: 0.08, cor: AL });
  // cavaletes com placas de vidro dos dois lados da entrada
  cavalete(g, -5.4, 0.72); cavalete(g, 5.4, 0.72);
  // perfis de alumínio empilhados no telhado e um cavalete grande com vidros
  const Y = H + 0.42, Z = -D / 2;
  pc(g, 4.2, 0.2, 2.4, 0x4c5660, -3, Y + 0.1, Z);
  for (let k = 0; k < 3; k++) for (let i = 0; i < 6 - k; i++) pc(g, 3.9, 0.14, 0.18, AL, -3, Y + 0.3 + k * 0.17, Z - 0.9 + i * 0.36 + k * 0.17, F);
  pc(g, 3.2, 0.2, 1.2, 0x4c5660, 3.6, Y + 0.1, Z - 0.1); pc(g, 3, 0.12, 0.12, 0x4c5660, 3.6, Y + 2.1, Z - 0.1, F);
  for (const q of [-1, 1]) pc(g, 0.12, 2, 0.12, 0x4c5660, 3.6 + q * 1.45, Y + 1.1, Z - 0.1, F);
  for (const q of [0, 1, 2]) pc(g, 2.6, 1.8, 0.06, 0, 3.6, Y + 1.1, Z - 0.4 + q * 0.3, { ...F, material: VIDRO_FORTE });
  janelasEmVolta(g, W, D, { y0: 3.7, cor: AL, zFrente: prof });
  S.porta = [0, 0.6];
  return fechar(S, W, D);
}

export const FACHADAS = { presentes: galaPresentes, joias: seeLoveJoias, confeccao: bellaCompany, reciclagem: marlonMaquinas, livraria: cafeComDeusPaiKids, ballet: balletECia, agencia: btModels, vidracaria: speedySolucoes };
