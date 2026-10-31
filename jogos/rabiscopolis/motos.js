// Rabiscolândia: moto de blocos (sem logo nem nome de marca): tanque grande pintado, farol quadrado, guidão reto, banco
// em dois níveis, rabeta alta, motor e escapamento à mostra e rodas de 8 lados. Mesmas medidas de antes (escala do
// Rabisco, ~1,15× a real). Mesmos materiais e mesclagem dos carros da J.E (carros-je.js): parada = ≤ 6 chamadas.
// Interface de veículo (veiculos.js / jogo.js): frente = +z; g.userData = { rodas, seta, motorista, carona: null,
// moto: true, posar(rabisco, v), aoEntrar(rabisco), aoSair(rabisco), descanso, fazerParado }.
// Ao pilotar: o Rabisco senta inclinado para a frente, mãos no guidão, pés nas pedaleiras e de CAPACETE (o capacete
// é um objeto preso ao tronco dele; aparece ao subir e some ao descer — rabisco3d.js não muda).

import { THREE } from "./base3d.js";
import { emBlocos, prisma } from "./blocos.js";
import { materiaisJE, pecaJE, mesclarPorMaterial } from "./carros-je.js";

const R = 0.345, EF = 0.86, ET = -0.8; // raio da roda, eixo da frente e de trás (z)
const MOTORISTA = new THREE.Vector3(0, 0.96, -0.1);
const caixaM = (w, h, d, x, y, z, rx = 0) => { const b = new THREE.BoxGeometry(w, h, d).toNonIndexed(); if (rx) b.rotateX(rx); b.translate(x, y, z); return b; };

function rodaMoto(largura) {
  const g = new THREE.Group();
  const pneu = prisma(R, R, largura * 2, 8); pneu.rotateZ(Math.PI / 2); g.add(pecaJE(pneu, "escuro", 0x151618));
  const aro = prisma(0.25, 0.25, largura * 2 + 0.03, 8); aro.rotateZ(Math.PI / 2); g.add(pecaJE(aro, "pintura", 0xc8141c));
  g.add(pecaJE(caixaM(largura * 2 + 0.06, 0.42, 0.07, 0, 0, 0), "metal", 0x3a3d43), pecaJE(caixaM(largura * 2 + 0.06, 0.07, 0.42, 0, 0, 0), "metal", 0x3a3d43), pecaJE(caixaM(largura * 2 + 0.1, 0.13, 0.13, 0, 0, 0), "metal", 0xb4bac2));
  return g;
}

export function motoEsportiva(cor = 0xc8141c, { parado = false } = {}) {
  materiaisJE();
  const g = new THREE.Group();
  const P = (w, h, d, x, y, z, mk, c, rx = 0) => { const m = pecaJE(caixaM(w, h, d, x, y, z, rx), mk, c); g.add(m); return m; };
  const PRETO = 0x17181b, PRATA = 0x9ba1a9, CROMO = 0xdfe3e8;
  // quadro e balança traseira
  for (const s of [-1, 1]) { P(0.06, 0.08, 0.72, s * 0.14, 0.97, 0.1, "metal", PRATA, 0.1); P(0.06, 0.07, 0.62, s * 0.12, 0.43, (ET - 0.2) / 2, "metal", PRATA, -0.16); P(0.05, 0.4, 0.08, s * 0.13, 0.72, -0.2, "metal", PRATA); }
  // motor em blocos: bloco preto, cabeçote com aletas, radiador e escapamento
  P(0.4, 0.3, 0.42, 0, 0.46, 0.12, "escuro", 0x232428); P(0.38, 0.26, 0.26, 0, 0.72, 0.24, "escuro", 0x2c2e33);
  for (let i = 0; i < 3; i++) P(0.41, 0.03, 0.27, 0, 0.66 + i * 0.07, 0.24, "metal", 0x6c7179);
  for (const s of [-1, 1]) P(0.05, 0.2, 0.2, s * 0.22, 0.44, 0.1, "metal", 0x7a8088);
  P(0.36, 0.3, 0.07, 0, 0.74, 0.5, "escuro", 0x101113); P(0.32, 0.25, 0.02, 0, 0.74, 0.54, "metal", 0x3a3e44);
  P(0.1, 0.09, 0.56, -0.13, 0.2, 0.0, "metal", CROMO); P(0.15, 0.15, 0.44, -0.2, 0.33, -0.48, "metal", 0x8b9199, -0.34); P(0.09, 0.09, 0.02, -0.2, 0.4, -0.71, "escuro", 0x0a0a0b, -0.34);
  // tanque grande em degraus (pintura) com abas laterais e faixa preta
  P(0.42, 0.2, 0.62, 0, 1.03, 0.24, "pintura", cor); P(0.34, 0.1, 0.48, 0, 1.17, 0.26, "pintura", cor); P(0.5, 0.2, 0.34, 0, 0.94, 0.3, "pintura", cor); P(0.51, 0.03, 0.34, 0, 0.9, 0.3, "escuro", PRETO);
  P(0.08, 0.03, 0.08, 0, 1.235, 0.28, "metal", CROMO);
  // banco em dois níveis e rabeta alta com lanterna
  P(0.28, 0.1, 0.52, 0, 0.98, -0.24, "escuro", 0x1b1c1f); P(0.22, 0.09, 0.3, 0, 1.06, -0.62, "escuro", 0x1b1c1f);
  P(0.24, 0.12, 0.44, 0, 0.94, -0.72, "pintura", cor); P(0.16, 0.08, 0.22, 0, 1.04, -0.92, "pintura", cor);
  P(0.14, 0.05, 0.02, 0, 1.06, -1.035, "luz", 0xd01822); P(0.2, 0.14, 0.02, 0, 0.84, -1.02, "escuro", 0xf2f2f2);
  for (const s of [-1, 1]) P(0.05, 0.04, 0.04, s * 0.13, 0.95, -0.98, "luz", 0xff9a2a);
  // para-lamas
  P(0.12, 0.04, 0.46, 0, R + R + 0.07, EF, "pintura", cor); P(0.12, 0.04, 0.4, 0, R + R + 0.03, ET + 0.06, "escuro", PRETO);
  // garfo, mesa, farol quadrado, painel e guidão com manoplas e retrovisores
  for (const s of [-1, 1]) { P(0.05, 0.84, 0.05, s * 0.12, 0.8, 0.74, "metal", 0xc0c4ca, -0.15); P(0.06, 0.12, 0.3, s * 0.14, 0.72 - 0.3, 0.5, "escuro", 0); }
  P(0.3, 0.05, 0.1, 0, 1.13, 0.67, "metal", CROMO); P(0.2, 0.2, 0.1, 0, 1.04, 0.88, "escuro", PRETO); P(0.17, 0.16, 0.02, 0, 1.04, 0.94, "luz", 0xfff6d0);
  P(0.14, 0.09, 0.04, 0, 1.17, 0.74, "escuro", 0x101113);
  P(0.72, 0.035, 0.035, 0, 1.2, 0.58, "escuro", PRETO); for (const s of [-1, 1]) { P(0.13, 0.05, 0.05, s * 0.33, 1.2, 0.58, "escuro", 0x2b2c30); P(0.02, 0.2, 0.02, s * 0.27, 1.3, 0.6, "metal", CROMO); P(0.1, 0.06, 0.02, s * 0.3, 1.4, 0.6, "escuro", PRETO); }
  // pedaleiras (o Rabisco apoia os pés) e sombrinha no chão
  for (const s of [-1, 1]) P(0.12, 0.03, 0.05, s * 0.2, 0.5, -0.16, "escuro", 0x2b2c30);
  { const s = new THREE.PlaneGeometry(0.75, 2.3); s.rotateX(-Math.PI / 2); s.translate(0, 0.012, 0.03); g.add(pecaJE(s, "sombra")); }
  // descanso lateral (do lado esquerdo do piloto, +x): aparece com a moto parada
  const descanso = new THREE.Group(); g.add(descanso);
  { const d = caixaM(0.04, 0.46, 0.04, 0.2, 0.21, -0.06); d.rotateZ(0); descanso.add(pecaJE(d, "escuro", 0x2b2c30)); }
  // rodas
  const rodas = [];
  for (const [z, larg] of [[EF, 0.065], [ET, 0.09]]) { const r = new THREE.Group(); r.position.set(0, R, z); r.add(rodaMoto(larg)); g.add(r); rodas.push(r); }
  if (parado) {
    mesclarPorMaterial(g);
    g.rotation.z = -0.12;
    Object.assign(g.userData, { moto: true, rodas: [], motorista: MOTORISTA.clone(), carona: null });
    return g;
  }
  for (const r of rodas) mesclarPorMaterial(r, { sombra: [] });
  descanso.userData.dinamico = true; // fica solto (some quando alguém sobe)
  mesclarPorMaterial(g, { juntas: new Set(rodas) });
  const seta = new THREE.Mesh(emBlocos(new THREE.ConeGeometry(0.4, 0.8, 4)), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); seta.rotation.x = Math.PI; seta.position.y = 2.6; seta.userData.dinamico = true; g.add(seta);
  const nPecas = g.children.length;
  Object.assign(g.userData, { moto: true, rodas, seta, volante: null, motorista: MOTORISTA.clone(), carona: null, especial: "buzina", descanso, nPecas, raioRoda: R,
    fazerParado: () => motoEsportiva(cor, { parado: true }), posar: posarPiloto, aoEntrar: (rb) => capacete(rb, true), aoSair: (rb) => { capacete(rb, false); soltarPose(rb); } });
  return g;
}

// ---------------------------------------------------------------- piloto
// pose de moto (depois do rabisco.atualizar "dirigir"): tronco inclinado para a frente, braços esticados até as manoplas,
// pernas abertas em volta do tanque com os pés nas pedaleiras
export function posarPiloto(rb, v) {
  const vira = v?.virar ?? 0;
  rb.tronco.rotation.x = 0.6; rb.tronco.rotation.z = -vira * 0.06;
  for (const [p, s] of [[rb.pernaE, 1], [rb.pernaD, -1]]) { p.quadril.rotation.set(-0.75, 0, s * 0.22); p.joelho.rotation.x = 1.35; }
  for (const [b, s] of [[rb.bracoE, 1], [rb.bracoD, -1]]) { b.ombro.rotation.set(-1.78, 0, s * 0.36); b.cotovelo.rotation.x = -0.05; }
}
export function soltarPose(rb) {
  rb.tronco.rotation.z = 0;
  for (const p of [rb.pernaE, rb.pernaD]) p.quadril.rotation.z = 0;
}
// capacete: casco branco com faixa vermelha e viseira escura, preso no topo do lápis (cobre o boné e a ponta)
const capacetes = new WeakMap();
export function capacete(rb, por) {
  let c = capacetes.get(rb);
  if (!c && por) {
    materiaisJE();
    c = new THREE.Group();
    const casco = new THREE.SphereGeometry(0.74, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.7); casco.scale(1, 1.1, 1.05);
    c.add(pecaJE(casco, "pintura", 0xf4f4f4));
    const faixa = new THREE.SphereGeometry(0.752, 22, 4, Math.PI / 2 - 0.2, 0.4, 0, Math.PI * 0.62); faixa.scale(1, 1.1, 1.05); faixa.rotateY(0); c.add(pecaJE(faixa, "pintura", 0xc8141c));
    const faixa2 = faixa.clone(); faixa2.rotateY(Math.PI); c.add(pecaJE(faixa2, "pintura", 0xc8141c));
    // viseira: faixa escura na frente, na altura da testa
    const vis = new THREE.SphereGeometry(0.765, 18, 4, Math.PI * 0.5 - 0.95, 1.9, Math.PI * 0.5, Math.PI * 0.16); vis.scale(1, 1.1, 1.05); c.add(pecaJE(vis, "vidro"));
    const borda = new THREE.TorusGeometry(0.6, 0.05, 6, 22); borda.rotateX(Math.PI / 2); borda.translate(0, -0.48, 0); c.add(pecaJE(borda, "escuro", 0x1b1c1f));
    mesclarPorMaterial(c, { sombra: ["pintura"] });
    c.position.set(0, 3.12, 0.02); // tronco local (unidades do Rabisco nativo): cobre o boné (4,77–5,03) e a ponta
    capacetes.set(rb, c);
  }
  if (!c) return;
  if (por) { rb.tronco.add(c); c.userData.aba = rb.pivoAba?.visible; if (rb.pivoAba) rb.pivoAba.visible = false; }
  else { c.removeFromParent(); if (rb.pivoAba && c.userData.aba !== undefined) rb.pivoAba.visible = c.userData.aba; }
}
