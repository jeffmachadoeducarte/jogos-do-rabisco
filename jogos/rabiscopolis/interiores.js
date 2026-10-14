// Rabiscolândia: a casa por dentro. Cada casa tem uma planta (A no Bairro das Casas, B na Vila das Flores), montada
// longe da cidade (em z = 1000) e vista "em corte" (casa de bonecas: sem teto e com a parede da frente baixinha).
// A decoração é por pontos fixos: em cada ponto (anel brilhante no chão ou na parede) a criança escolhe o móvel e a
// cor num carrossel. Os móveis só entram no ponto se couberem (nada atravessa parede).
//
//   const casa = montarInterior(planta, { corAcento });   // { grupo, solidos, pontos, comodos, porta, entrada }
//   colocar(casa, pontoId, { id, cor, variante })          // troca o móvel do ponto (libera o anterior)

import { THREE, mat, malha, caixa, caixaRedonda, MAT, texturaCanvas, mesclar } from "./base3d.js";
import { MOVEIS, movel } from "./moveis.js";

export const ORIGEM_INTERIOR = { A: [0, 0, 1000], B: [120, 0, 1000] };
const ALTURA = 3, ESP = 0.25;

// cômodos em coordenadas locais (x0..x1, z0..z1); a frente da casa é +z (parede baixinha)
export const PLANTAS = {
  A: {
    nome: "Casa do Bairro", limites: { x0: -8, x1: 8, z0: -4, z1: 4 },
    comodos: [
      { id: "sala", nome: "Sala", x0: -8, x1: -2, z0: -4, z1: 4, piso: 0xe9c79a, parede: 0xfff1d6 },
      { id: "cozinha", nome: "Cozinha", x0: -2, x1: 3, z0: -4, z1: 4, piso: 0xdfe6ee, parede: 0xd8f5ea },
      { id: "quarto", nome: "Quarto", x0: 3, x1: 8, z0: -4, z1: 4, piso: 0xe9c79a, parede: 0xe2d4ff },
    ],
    // paredes de dentro: [x, z0, z1] com vão de porta de z = 0,4 a 2,2
    divisorias: [{ x: -2, vao: [0.4, 2.2] }, { x: 3, vao: [0.4, 2.2] }],
    porta: [-5, 4], // porta da rua (vão na parede da frente)
    pontos: [
      { id: "sala-sofa", comodo: "sala", x: -5, z: -3.2, rot: 0, max: [2.6, 1.3] },
      { id: "sala-lado", comodo: "sala", x: -7.2, z: -0.6, rot: Math.PI / 2, max: [2.2, 1.1] },
      { id: "sala-meio", comodo: "sala", x: -4.6, z: -0.4, rot: 0, max: [2.3, 2.3] },
      { id: "sala-canto", comodo: "sala", x: -2.75, z: -3.3, rot: 0, max: [0.9, 0.9] },
      { id: "sala-quadro", comodo: "parede", x: -5, z: -3.85, rot: 0, max: [1.4, 0.4], parede: true },
      { id: "coz-fundo", comodo: "cozinha", x: -0.6, z: -3.3, rot: 0, max: [1.6, 0.9] },
      { id: "coz-fundo2", comodo: "cozinha", x: 1.7, z: -3.3, rot: 0, max: [1.6, 0.9] },
      { id: "coz-meio", comodo: "cozinha", x: 0.5, z: 0.2, rot: 0, max: [2.0, 2.0] },
      { id: "coz-parede", comodo: "parede", x: 0.5, z: -3.85, rot: 0, max: [1.5, 0.45], parede: true },
      { id: "qto-cama", comodo: "quarto", x: 5.6, z: -2.65, rot: 0, max: [1.6, 2.3] },
      { id: "qto-lado", comodo: "quarto", x: 7.35, z: 0.9, rot: -Math.PI / 2, max: [1.7, 0.75] },
      { id: "qto-canto", comodo: "quarto", x: 3.7, z: -3.35, rot: 0, max: [1.1, 0.8] },
      { id: "qto-frente", comodo: "quarto", x: 5.4, z: 2.6, rot: Math.PI, max: [1.4, 0.8] },
      { id: "qto-quadro", comodo: "parede", x: 7.2, z: -3.85, rot: 0, max: [1.3, 0.4], parede: true },
    ],
  },
  B: {
    nome: "Casa da Vila", limites: { x0: -7, x1: 7, z0: -5, z1: 5 },
    comodos: [
      { id: "sala", nome: "Sala e cozinha", x0: -7, x1: 0, z0: -5, z1: 5, piso: 0xe9c79a, parede: 0xffe3ef },
      { id: "quarto", nome: "Quarto", x0: 0, x1: 7, z0: -5, z1: 0, piso: 0xe9c79a, parede: 0xcfe9ff },
      { id: "bebe", nome: "Quarto do bebê", x0: 0, x1: 7, z0: 0, z1: 5, piso: 0xf3dca0, parede: 0xfff0a8 },
    ],
    divisorias: [{ x: 0, vao: [-3.2, -1.4], vao2: [1.4, 3.2] }, { z: 0, x0: 0, x1: 7, vao: [4.2, 6] }],
    porta: [-3.5, 5],
    pontos: [
      { id: "sala-sofa", comodo: "sala", x: -3.5, z: -4.2, rot: 0, max: [2.6, 1.3] },
      { id: "sala-lado", comodo: "sala", x: -6.2, z: -1.2, rot: Math.PI / 2, max: [2.2, 1.1] },
      { id: "sala-meio", comodo: "sala", x: -3.6, z: -1.4, rot: 0, max: [2.3, 2.3] },
      { id: "coz-fundo", comodo: "cozinha", x: -6.2, z: 2.6, rot: Math.PI / 2, max: [1.6, 0.9] },
      { id: "coz-meio", comodo: "cozinha", x: -3.2, z: 2.4, rot: 0, max: [2.0, 2.0] },
      { id: "sala-quadro", comodo: "parede", x: -3.5, z: -4.85, rot: 0, max: [1.4, 0.4], parede: true },
      { id: "qto-cama", comodo: "quarto", x: 3.5, z: -3.65, rot: 0, max: [1.6, 2.3] },
      { id: "qto-lado", comodo: "quarto", x: 6.35, z: -1.4, rot: -Math.PI / 2, max: [1.7, 0.75] },
      { id: "qto-quadro", comodo: "parede", x: 5.8, z: -4.85, rot: 0, max: [1.3, 0.4], parede: true },
      { id: "bebe-berco", comodo: "quarto", x: 6.0, z: 2.6, rot: -Math.PI / 2, max: [1.6, 1.5] },
      { id: "bebe-canto", comodo: "quarto", x: 1.6, z: 4.0, rot: Math.PI, max: [1.3, 0.8] },
      { id: "bebe-meio", comodo: "sala", x: 3.4, z: 2.4, rot: 0, max: [2.2, 2.2] },
    ],
  },
};

// piso de tábuas desenhado
const texPiso = texturaCanvas(256, 256, (c, w, h) => {
  c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"; c.fillRect(0, i * 32, w, 32); c.fillStyle = "rgba(0,0,0,0.18)"; c.fillRect(0, i * 32 + 31, w, 1.5); c.fillRect(((i * 97) % 200) + 20, i * 32, 1.5, 32); }
}, { repetir: true });
const pisoMats = new Map();
const matPiso = (cor) => { if (!pisoMats.has(cor)) { const t = texPiso.clone(); t.needsUpdate = true; t.repeat.set(2, 2); pisoMats.set(cor, new THREE.MeshToonMaterial({ color: cor, map: t })); } return pisoMats.get(cor); };

// parede de um ponto a outro, com vãos (portas) ao longo dela
function parede(g, solidos, eixo, fixo, a, b, vaos, cor, altura = ALTURA) {
  const trechos = [];
  let ini = a;
  for (const [v0, v1] of [...vaos].sort((p, q) => p[0] - q[0])) { if (v0 > ini) trechos.push([ini, v0]); ini = Math.max(ini, v1); }
  if (b > ini) trechos.push([ini, b]);
  for (const [t0, t1] of trechos) {
    const comp = t1 - t0, meio = (t0 + t1) / 2;
    const p = caixaRedonda(eixo === "x" ? comp : ESP, altura, eixo === "x" ? ESP : comp, mat(cor), { raio: 0.06, contorno: 0.04 });
    p.position.set(eixo === "x" ? meio : fixo, altura / 2, eixo === "x" ? fixo : meio); g.add(p);
    const rod = caixa(eixo === "x" ? comp : ESP + 0.06, 0.18, eixo === "x" ? ESP + 0.06 : comp, mat(0xffffff), { sombra: false }); rod.position.set(p.position.x, 0.09, p.position.z); g.add(rod);
    if (eixo === "x") solidos.push({ x0: t0, x1: t1, z0: fixo - ESP / 2, z1: fixo + ESP / 2, y1: altura });
    else solidos.push({ x0: fixo - ESP / 2, x1: fixo + ESP / 2, z0: t0, z1: t1, y1: altura });
  }
  // batentes das portas
  for (const [v0, v1] of vaos) {
    const v = caixaRedonda(eixo === "x" ? v1 - v0 + 0.3 : ESP + 0.1, 0.3, eixo === "x" ? ESP + 0.1 : v1 - v0 + 0.3, mat(0xffffff), { raio: 0.05, contorno: 0.02 });
    v.position.set(eixo === "x" ? (v0 + v1) / 2 : fixo, altura > 1 ? 2.3 : altura, eixo === "x" ? fixo : (v0 + v1) / 2); if (altura > 1) g.add(v);
  }
}

// monta a planta (vazia: os móveis entram pelos pontos). Devolve tudo em coordenadas do mundo.
export function montarInterior(idPlanta) {
  const P = PLANTAS[idPlanta], [ox, , oz] = ORIGEM_INTERIOR[idPlanta];
  const g = new THREE.Group(); g.position.set(ox, 0, oz);
  const fixo = new THREE.Group(); g.add(fixo);
  const solidosL = [];
  const L = P.limites;
  // gramado em volta e o piso de cada cômodo
  const grama = malha(new THREE.PlaneGeometry(60, 50), mat(0x7ccf52), { sombra: false }); grama.rotation.x = -Math.PI / 2; grama.position.y = -0.02; fixo.add(grama);
  for (const c of P.comodos) {
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(c.x1 - c.x0, c.z1 - c.z0), matPiso(c.piso)); piso.rotation.x = -Math.PI / 2; piso.position.set((c.x0 + c.x1) / 2, 0.02, (c.z0 + c.z1) / 2); piso.receiveShadow = true; fixo.add(piso);
    // parede de fundo e laterais com a cor do cômodo
    parede(fixo, solidosL, "x", L.z0, c.x0, c.x1, [], c.parede);
    // janela na parede do fundo
    const jan = caixaRedonda(1.4, 1.1, 0.12, MAT.janela, { raio: 0.06, contorno: 0.03 }); jan.position.set((c.x0 + c.x1) / 2 + (c.x1 - c.x0) * 0.25, 1.9, L.z0 + 0.15); fixo.add(jan);
  }
  parede(fixo, solidosL, "z", L.x0, L.z0, L.z1, [], P.comodos[0].parede);
  parede(fixo, solidosL, "z", L.x1, L.z0, L.z1, [], P.comodos.at(-1).parede);
  // parede da frente baixinha (corte), com o vão da porta
  parede(fixo, solidosL, "x", L.z1, L.x0, L.x1, [[P.porta[0] - 1, P.porta[0] + 1]], 0xffffff, 0.7);
  // divisórias com vãos de porta
  for (const d of P.divisorias) {
    if (d.x != null) parede(fixo, solidosL, "z", d.x, L.z0, L.z1, [d.vao, ...(d.vao2 ? [d.vao2] : [])], P.comodos.find((c) => c.x0 === d.x)?.parede ?? 0xffffff);
    else parede(fixo, solidosL, "x", d.z, d.x0, d.x1, [d.vao], 0xffffff);
  }
  // tapetinho de entrada
  const cap = caixa(1.6, 0.03, 0.9, mat(0xec2e8c), { sombra: false }); cap.position.set(P.porta[0], 0.03, L.z1 - 0.8); fixo.add(cap);
  mesclar(fixo);
  // pontos de decoração: anel no chão (ou moldura tracejada na parede)
  const pontos = P.pontos.map((p) => {
    const marca = new THREE.Mesh(p.parede ? new THREE.RingGeometry(0.35, 0.45, 24) : new THREE.RingGeometry(0.42, 0.55, 28), new THREE.MeshBasicMaterial({ color: 0xffcc1f, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    if (p.parede) marca.position.set(p.x, 1.6, p.z + 0.1); else { marca.rotation.x = -Math.PI / 2; marca.position.set(p.x, 0.05, p.z); }
    g.add(marca);
    const lugar = new THREE.Group(); lugar.position.set(p.x, 0, p.z); lugar.rotation.y = p.rot; g.add(lugar);
    // onde a criança fica para decorar: na frente do ponto (do quadro, um passo da parede)
    const recuo = p.parede ? 0.9 : p.max[1] / 2 + 0.6;
    const pe = [ox + p.x + Math.sin(p.rot) * recuo, oz + p.z + Math.cos(p.rot) * recuo];
    return { ...p, marca, lugar, movel: null, escolha: null, mundo: [ox + p.x, oz + p.z], pe };
  });
  const solidos = solidosL.map((s) => ({ x0: s.x0 + ox, x1: s.x1 + ox, z0: s.z0 + oz, z1: s.z1 + oz, y1: s.y1 }));
  return { id: idPlanta, planta: P, grupo: g, solidos, pontos, entrada: [ox + P.porta[0], oz + L.z1 - 1.6], porta: [ox + P.porta[0], oz + L.z1 - 0.6], origem: [ox, oz], solidosMoveis: [] };
}

// cabe? (pegada do móvel girada, dentro do máximo do ponto)
export const cabe = (m, p) => { const [w, d] = m.pegada; return w <= p.max[0] + 0.01 && d <= p.max[1] + 0.01; };
const pegadas = new Map();
export function pegadaDoMovel(id) {
  if (!pegadas.has(id)) { const m = movel(id); const g = m.fazer(0xffffff, 0); pegadas.set(id, g.userData.pegada); g.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.userData.compartilhada) o.geometry.dispose(); }); }
  return pegadas.get(id);
}
// troca o móvel de um ponto. escolha = { id, cor, variante } ou null (vazio). Libera a geometria do anterior.
export function colocar(casa, ponto, escolha) {
  if (ponto.movel) { ponto.lugar.remove(ponto.movel); ponto.movel.traverse((o) => { if (o.isMesh && !o.geometry.userData.compartilhada) o.geometry.dispose(); }); ponto.movel = null; }
  ponto.escolha = escolha;
  ponto.marca.visible = !escolha;
  if (!escolha) return;
  const m = movel(escolha.id);
  const g = m.fazer(escolha.cor, escolha.variante ?? 0);
  ponto.lugar.add(g);
  ponto.movel = g;
}
// colisões dos móveis colocados (o tapete não bate)
export function solidosDosMoveis(casa) {
  const out = [];
  for (const p of casa.pontos) {
    if (!p.escolha || p.parede) continue;
    const m = movel(p.escolha.id); if (m.baixo) continue;
    const [w, d] = pegadaDoMovel(p.escolha.id), deitado = Math.abs(Math.sin(p.rot)) > 0.5;
    const sx = (deitado ? d : w) / 2, sz = (deitado ? w : d) / 2;
    out.push({ x0: p.mundo[0] - sx, x1: p.mundo[0] + sx, z0: p.mundo[1] - sz, z1: p.mundo[1] + sz, y1: 2.2 });
  }
  return out;
}
// retângulo (no chão, coordenadas locais) que o ponto pode ocupar
export function areaDoPonto(p, [w, d] = p.max) {
  const deitado = Math.abs(Math.sin(p.rot)) > 0.5, sx = (deitado ? d : w) / 2, sz = (deitado ? w : d) / 2;
  // móvel encostado na parede: a pegada vai da frente (z local = +d/2) para trás; o centro é o ponto
  return { x0: p.x - sx, x1: p.x + sx, z0: p.z - sz, z1: p.z + sz };
}
// confere a planta: cada ponto cabe inteiro no seu cômodo (sem entrar na parede) e não invade outro ponto nem a
// passagem das portas. Devolve a lista de problemas (vazia = tudo certo).
export function verificar(idPlanta) {
  const P = PLANTAS[idPlanta], prob = [];
  const meia = ESP / 2 + 0.02;
  const comodoDe = (x, z) => P.comodos.find((c) => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1);
  for (const p of P.pontos) {
    const a = areaDoPonto(p), c = comodoDe(p.x, p.z);
    if (!c) { prob.push(`${p.id}: fora dos cômodos`); continue; }
    if (p.parede) { if (a.x0 < c.x0 + meia || a.x1 > c.x1 - meia) prob.push(`${p.id}: quadro passa da parede`); continue; }
    if (a.x0 < c.x0 + meia - 1e-6 || a.x1 > c.x1 - meia + 1e-6 || a.z0 < c.z0 + meia - 1e-6 || a.z1 > c.z1 - meia + 1e-6) prob.push(`${p.id}: atravessa a parede do cômodo ${c.id}`);
    for (const d of P.divisorias) if (d.z != null && a.x1 > d.x0 && a.x0 < d.x1 && a.z0 < d.z + meia && a.z1 > d.z - meia) prob.push(`${p.id}: atravessa a divisória`);
    // porta da rua: deixa 1,6 m livres na frente dela
    if (a.x1 > P.porta[0] - 1 && a.x0 < P.porta[0] + 1 && a.z1 > P.limites.z1 - 1.6) prob.push(`${p.id}: tapa a porta da rua`);
  }
  const chao = P.pontos.filter((p) => !p.parede);
  for (let i = 0; i < chao.length; i++) for (let k = i + 1; k < chao.length; k++) {
    const a = areaDoPonto(chao[i]), b = areaDoPonto(chao[k]);
    if (a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0) prob.push(`${chao[i].id} × ${chao[k].id}`);
  }
  return prob;
}
export { MOVEIS, ESP };
