// Rabiscolândia: uniformes das profissões. Usa as roupas prontas de src/motor3d/roupas3d.js (jaleco, estetoscópio,
// capacete e jaqueta de bombeiro, chapéu de chef, avental...) e acrescenta as que faltavam, montadas aqui mesmo
// (sem mexer no roupas3d.js): jaleco verde, óculos redondos, crachá, boné listrado, avental listrado, avental verde,
// colete e beca do coral. As peças novas ficam em rb.roupasRP (slot → grupo) e não se misturam com rb.roupas.
//
//   vestirProfissao(rb, "medico");  tirarProfissao(rb);  profissaoAtual(rb)

import { THREE, toon, comContorno } from "../../src/motor3d/toon.js";
import { vestir, tirar } from "../../src/motor3d/roupas3d.js";

const G = THREE;
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
const listras = new Map();
function texListras(c1, c2, vertical = true) {
  const k = `${c1}|${c2}|${vertical}`;
  if (!listras.has(k)) {
    const cv = document.createElement("canvas"); cv.width = 64; cv.height = 64;
    const x = cv.getContext("2d"); x.fillStyle = c1; x.fillRect(0, 0, 64, 64); x.fillStyle = c2;
    for (let i = 0; i < 4; i++) vertical ? x.fillRect(i * 16, 0, 8, 64) : x.fillRect(0, i * 16, 64, 8);
    const t = new G.CanvasTexture(cv); t.colorSpace = G.SRGBColorSpace; t.wrapS = t.wrapT = G.RepeatWrapping; t.repeat.set(3, 1);
    listras.set(k, t);
  }
  return listras.get(k);
}
// "saia" de pano em volta do corpo do lápis (avental, beca, jaleco curto): cilindro aberto do ombro até yBaixo
function pano(rb, { cor, yTopo = 3.35, yBaixo = 1.55, raio = 0.62, map = null, aberto = false }) {
  const g = noTronco(rb, (yTopo + yBaixo) / 2);
  const geo = new G.CylinderGeometry(raio, raio * 1.06, yTopo - yBaixo, 28, 1, true, aberto ? 0.35 : 0, aberto ? Math.PI * 2 - 0.7 : Math.PI * 2);
  const m = new G.Mesh(geo, map ? toon(0xffffff, { map, side: G.DoubleSide }) : toon(cor, { side: G.DoubleSide }));
  m.castShadow = true; comContorno(m, 0.03); g.add(m);
  return g;
}
// peças novas (slot → monta)
export const PECAS_RP = {
  "jaleco-verde": { slot: "corpo", monta: (rb) => [pano(rb, { cor: 0x7ed9b8, aberto: true }), gola(rb, 0x7ed9b8)] },
  "avental-listrado": { slot: "corpo", monta: (rb) => [pano(rb, { cor: 0xffffff, map: texListras("#ff8cc0", "#ffffff"), yTopo: 3.0, yBaixo: 1.6, raio: 0.64 })] },
  "avental-verde": { slot: "corpo", monta: (rb) => [pano(rb, { cor: 0x2bb24c, yTopo: 3.0, yBaixo: 1.6, raio: 0.64 })] },
  "avental-marrom": { slot: "corpo", monta: (rb) => [pano(rb, { cor: 0xa86b3c, yTopo: 3.0, yBaixo: 1.6, raio: 0.64 })] },
  "colete": { slot: "corpo", monta: (rb) => [pano(rb, { cor: 0x8e6cff, yTopo: 3.3, yBaixo: 2.2, raio: 0.63, aberto: true })] },
  "beca": { slot: "corpo", monta: (rb) => [pano(rb, { cor: 0x2f6fc0, yTopo: 3.4, yBaixo: 1.0, raio: 0.66 }), gola(rb, 0xffcc1f)] },
  "oculos-redondo": { slot: "rosto", monta: (rb) => {
    const g = noTronco(rb, 4.13);
    for (const a of [-0.62, 0.47]) {
      const o = pc(new G.TorusGeometry(0.17, 0.035, 8, 24), 0x6b4a2f, g, { borda: 0, x: Math.sin(a) * 0.58, z: Math.cos(a) * 0.58 });
      o.rotation.y = a;
    }
    pc(new G.CylinderGeometry(0.02, 0.02, 0.32, 6), 0x6b4a2f, g, { borda: 0, x: -0.07, y: 0.05, z: 0.6 }).rotation.z = Math.PI / 2;
    return [g];
  } },
  "cracha": { slot: "peito", monta: (rb, o) => {
    const g = noTronco(rb, 2.9);
    const c = pc(new G.BoxGeometry(0.34, 0.24, 0.04), 0xffffff, g, { borda: 0.02, x: -0.25, z: 0.62 });
    pc(new G.BoxGeometry(0.34, 0.07, 0.045), o.cor ?? 0xec2e8c, g, { borda: 0, x: -0.25, y: 0.09, z: 0.625 });
    c.rotation.y = -0.35;
    return [g];
  } },
  "bone-listrado": { slot: "cabeca", escondeAba: true, monta: (rb) => {
    const g = noTronco(rb, 4.74);
    const copa = new G.Mesh(new G.SphereGeometry(0.64, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffffff, { map: texListras("#ff8cc0", "#ffffff") }));
    copa.scale.y = 0.75; comContorno(copa, 0.04); g.add(copa);
    const aba = pc(new G.CylinderGeometry(0.42, 0.42, 0.05, 24, 1, false, -Math.PI / 2, Math.PI), 0xff8cc0, g, { borda: 0.02, z: 0.45 });
    aba.scale.z = 1.4;
    pc(new G.SphereGeometry(0.1, 10, 8), 0xff8cc0, g, { borda: 0.02, y: 0.48 });
    return [g];
  } },
};
function gola(rb, cor) {
  const g = noTronco(rb, 3.42);
  const t = pc(new G.TorusGeometry(0.6, 0.09, 8, 28), cor, g, { borda: 0.02 }); t.rotation.x = Math.PI / 2;
  return g;
}

// profissões: lista de peças (as do roupas3d.js pelo id dele; as novas pelo id daqui)
export const PROFISSOES = {
  medico: { nome: "Médico", pecas: ["jaleco", "estetoscopio", "maleta"] },
  veterinario: { nome: "Veterinário", pecas: ["jaleco-verde", "estetoscopio", "oculos-redondo"] },
  professor: { nome: "Professor", pecas: ["oculos-redondo", "cracha", "colete"] },
  bombeiro: { nome: "Bombeiro", pecas: ["capacete-bombeiro", "jaqueta-bombeiro", "botas-bombeiro", "mangueira"] },
  padeiro: { nome: "Padeiro", pecas: ["touca-chef", "avental-marrom", "colher"] },
  sorveteiro: { nome: "Sorveteiro", pecas: ["bone-listrado", "avental-listrado"] },
  caixa: { nome: "Caixa do mercado", pecas: ["avental-verde", "cracha"] },
  bibliotecario: { nome: "Bibliotecário", pecas: ["oculos-redondo", "colete", "cracha"] },
  coral: { nome: "Cantor do coral", pecas: ["beca"] },
};

export function tirarProfissao(rb) {
  for (const s of Object.keys(rb.roupas ?? {})) tirar(rb, s);
  for (const [slot, objs] of Object.entries(rb.roupasRP ?? {})) { for (const o of objs) { o.removeFromParent(); o.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); } delete rb.roupasRP[slot]; }
  if (rb.pivoAba) rb.pivoAba.visible = !(rb.roupas?.cabeca);
  rb.profissao = null;
}
export function vestirProfissao(rb, id) {
  tirarProfissao(rb);
  const p = PROFISSOES[id];
  if (!p) return;
  rb.roupasRP ??= {};
  let escondeAba = false;
  for (const peca of p.pecas) {
    const nova = PECAS_RP[peca];
    if (nova) { rb.roupasRP[nova.slot] = nova.monta(rb, {}); if (nova.escondeAba) escondeAba = true; }
    else vestir(rb, peca);
  }
  if (escondeAba && rb.pivoAba) rb.pivoAba.visible = false;
  rb.profissao = id;
}
export const profissaoAtual = (rb) => rb.profissao ?? null;
