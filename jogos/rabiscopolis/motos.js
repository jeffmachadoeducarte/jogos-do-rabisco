// Rabiscolândia: moto esportiva "naked" inspirada na Honda CB 600F Hornet (sem logo nem nome de marca): tanque
// musculoso com abas laterais, farol redondo compacto, guidão reto, banco em dois níveis, rabeta curta e alta,
// escapamento curto do lado direito, quadro e motor de 4 cilindros à mostra (radiador, coletores), rodas de 3 raios,
// garfo dianteiro com discos de freio duplos e monoamortecedor traseiro. Escala do Rabisco (~1,15× a real).
// Mesmos materiais e mesclagem dos carros da J.E (carros-je.js): parada = ≤ 6 chamadas de desenho.
// Interface de veículo (veiculos.js / jogo.js): frente = +z; g.userData = { rodas, seta, motorista, carona: null,
// moto: true, posar(rabisco, v), aoEntrar(rabisco), aoSair(rabisco), descanso, fazerParado }.
// Ao pilotar: o Rabisco senta inclinado para a frente, mãos no guidão, pés nas pedaleiras e de CAPACETE (o capacete
// é um objeto preso ao tronco dele; aparece ao subir e some ao descer — rabisco3d.js não muda).

import { THREE } from "./base3d.js";
import { materiaisJE, pecaJE, mesclarPorMaterial } from "./carros-je.js";

const R = 0.345, EF = 0.86, ET = -0.8; // raio da roda, eixo da frente e de trás (z)
const MOTORISTA = new THREE.Vector3(0, 0.96, -0.1);

const tubo = (pts, r, seg = 10) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 6, false);
// peça "em perfil": contorno [[z, y], ...] extrudado na largura (x), com a largura podendo afinar ao longo de z
function perfil(contorno, largura, { bevel = 0.02, afina = null } = {}) {
  const s = new THREE.Shape(contorno.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: largura - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -(largura - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2); // x do contorno → z; extrusão → x
  if (afina) { const P = g.attributes.position; for (let i = 0; i < P.count; i++) P.setX(i, P.getX(i) * afina(P.getZ(i), P.getY(i))); g.computeVertexNormals(); }
  return g;
}
function rodaMoto(largura, discoDuplo) {
  const g = new THREE.Group();
  const pneu = new THREE.LatheGeometry([[0.27, -largura * 0.8], [0.31, -largura], [0.338, -largura * 0.75], [R, 0], [0.338, largura * 0.75], [0.31, largura], [0.27, largura * 0.8]].map(([a, b]) => new THREE.Vector2(a, b)), 16);
  pneu.rotateZ(Math.PI / 2); g.add(pecaJE(pneu, "escuro", 0x151618));
  const aro = new THREE.CylinderGeometry(0.272, 0.272, largura * 1.5, 18, 1, true); aro.rotateZ(Math.PI / 2); g.add(pecaJE(aro, "metal", 0x202226));
  for (const s of [-1, 1]) { const l = new THREE.RingGeometry(0.255, 0.275, 18); l.rotateY(Math.PI / 2); l.translate(s * largura * 0.76, 0, 0); if (s < 0) l.rotateY(Math.PI); g.add(pecaJE(l, "pintura", 0xc8141c)); }
  // 3 raios largos (fundidos), retos do cubo ao aro
  for (let i = 0; i < 3; i++) {
    const r = new THREE.BoxGeometry(largura * 0.55, 0.21, 0.06); r.translate(0, 0.165, 0);
    const P = r.attributes.position; for (let k = 0; k < P.count; k++) P.setZ(k, P.getZ(k) * (1.6 - P.getY(k) * 2.6)); // mais largo no cubo
    r.rotateX((i / 3) * Math.PI * 2); g.add(pecaJE(r, "metal", 0x3a3d43));
  }
  const cubo = new THREE.CylinderGeometry(0.06, 0.06, largura * 1.2, 10); cubo.rotateZ(Math.PI / 2); g.add(pecaJE(cubo, "metal", 0x9aa0a8));
  for (const s of discoDuplo ? [-1, 1] : [-1]) { const d = new THREE.RingGeometry(0.07, 0.17, 16); d.rotateY(Math.PI / 2); d.translate(s * (largura * 0.62 + 0.012), 0, 0); g.add(pecaJE(d, "metal", 0xb4bac2)); const d2 = d.clone(); d2.rotateY(Math.PI); d2.translate(0, 0, 0); g.add(pecaJE(d2, "metal", 0xb4bac2)); }
  return g;
}

export function motoEsportiva(cor = 0xc8141c, { parado = false } = {}) {
  materiaisJE();
  const g = new THREE.Group();
  const P = (geo, mk, c) => { const m = pecaJE(geo, mk, c); g.add(m); return m; };
  const PRETO = 0x17181b, PRATA = 0x9ba1a9, CROMO = 0xdfe3e8;
  // ---- quadro (tubos prateados) e balança traseira
  for (const s of [-1, 1]) {
    P(tubo([[0, 1.05, 0.6], [s * 0.13, 1.0, 0.3], [s * 0.15, 0.93, -0.1], [s * 0.13, 0.62, -0.22], [s * 0.12, 0.5, -0.24]], 0.032), "metal", PRATA);
    P(tubo([[s * 0.12, 0.92, -0.12], [s * 0.1, 0.98, -0.5], [s * 0.07, 1.03, -0.85]], 0.018, 6), "metal", PRATA);
    const b = new THREE.BoxGeometry(0.045, 0.08, 0.6); b.rotateX(-Math.atan2(0.5 - R, 0.56)); b.translate(s * 0.12, (0.5 + R) / 2, (-0.24 + ET) / 2); P(b, "metal", PRATA);
  }
  // monoamortecedor (mola vermelha)
  { const m = new THREE.CylinderGeometry(0.035, 0.035, 0.34, 8); m.rotateX(0.5); m.translate(0, 0.72, -0.33); P(m, "pintura", 0xd01a1a); const h = new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6); h.rotateX(0.5); h.translate(0, 0.72, -0.33); P(h, "metal", CROMO); }
  // ---- motor 4 cilindros (preto) com tampas laterais, cabeçote inclinado e radiador
  { const b = new THREE.BoxGeometry(0.4, 0.3, 0.42); b.translate(0, 0.46, 0.12); P(b, "escuro", 0x232428);
    const c = new THREE.BoxGeometry(0.38, 0.26, 0.24); c.rotateX(0.45); c.translate(0, 0.72, 0.28); P(c, "escuro", 0x2c2e33);
    for (let i = 0; i < 4; i++) { const a = new THREE.BoxGeometry(0.4, 0.012, 0.25); a.rotateX(0.45); a.translate(0, 0.66 + i * 0.045, 0.27 - i * 0.02); P(a, "metal", 0x6c7179); }
    const tc = new THREE.BoxGeometry(0.34, 0.08, 0.2); tc.rotateX(0.45); tc.translate(0, 0.86, 0.22); P(tc, "metal", 0x8d939b);
    for (const s of [-1, 1]) { const t = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 14); t.rotateZ(Math.PI / 2); t.translate(s * 0.215, 0.44, s > 0 ? 0.05 : 0.18); P(t, "metal", 0x7a8088); }
    const rad = new THREE.BoxGeometry(0.36, 0.3, 0.06); rad.rotateX(-0.25); rad.translate(0, 0.74, 0.5); P(rad, "escuro", 0x101113);
    const grade = new THREE.BoxGeometry(0.32, 0.26, 0.01); grade.rotateX(-0.25); grade.translate(0, 0.745, 0.535); P(grade, "metal", 0x3a3e44);
  }
  // coletores (4 tubos descendo na frente do motor) e escapamento curto do lado direito (−x)
  for (const x of [-0.13, -0.045, 0.045, 0.13]) P(tubo([[x, 0.66, 0.43], [x, 0.4, 0.48], [x * 0.6, 0.2, 0.36], [x * 0.3, 0.16, 0.1]], 0.024, 8), "metal", CROMO);
  P(tubo([[0, 0.16, 0.12], [-0.06, 0.17, -0.15], [-0.18, 0.26, -0.38]], 0.04, 8), "metal", CROMO);
  { const m = new THREE.CylinderGeometry(0.075, 0.085, 0.42, 12); m.rotateX(Math.PI / 2 - 0.35); m.translate(-0.2, 0.34, -0.55); P(m, "metal", 0x8b9199);
    const p = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10); p.rotateX(Math.PI / 2 - 0.35); p.translate(-0.2, 0.41, -0.755); P(p, "escuro", 0x0a0a0b); }
  // ---- tanque musculoso (pintura) com abas laterais e faixa preta
  { const t = new THREE.SphereGeometry(1, 20, 12); t.scale(0.2, 0.15, 0.3); t.rotateX(-0.12); t.translate(0, 1.07, 0.25);
    const A = t.attributes.position; for (let i = 0; i < A.count; i++) { const y = A.getY(i); if (y < 1.0) A.setY(i, 1.0 - (1.0 - y) * 0.6); const z = A.getZ(i); A.setX(i, A.getX(i) * (1 + Math.max(0, z - 0.2) * 0.9)); } t.computeVertexNormals();
    P(t, "pintura", cor);
    for (const s of [-1, 1]) { const ab = perfil([[0.52, 1.02], [0.2, 1.06], [0.02, 0.98], [0.1, 0.86], [0.44, 0.84]], 0.05, { bevel: 0.015 }); ab.translate(s * 0.215, 0, 0); ab.rotateY(s * 0.08); P(ab, "pintura", cor);
      const f = perfil([[0.46, 0.9], [0.12, 0.9], [0.12, 0.875], [0.46, 0.875]], 0.01, { bevel: 0 }); f.translate(s * 0.245, 0, 0); P(f, "escuro", PRETO); }
    const tampa = new THREE.CylinderGeometry(0.04, 0.04, 0.012, 10); tampa.translate(0, 1.205, 0.28); P(tampa, "metal", CROMO);
  }
  // ---- banco em dois níveis e rabeta curta e alta (pintura) com lanterna
  P(perfil([[0.0, 1.03], [-0.12, 0.96], [-0.46, 0.94], [-0.52, 0.99], [-0.52, 0.9], [-0.0, 0.92]], 0.27, { bevel: 0.03, afina: (z) => 1 - Math.max(0, -z - 0.3) * 0.5 }), "escuro", 0x1b1c1f);
  P(perfil([[-0.5, 1.04], [-0.78, 1.08], [-0.78, 0.99], [-0.5, 0.97]], 0.2, { bevel: 0.03 }), "escuro", 0x1b1c1f);
  P(perfil([[-0.3, 0.97], [-0.52, 0.99], [-0.82, 1.06], [-1.0, 1.12], [-1.02, 1.06], [-0.84, 0.95], [-0.4, 0.86]], 0.26, { bevel: 0.025, afina: (z) => Math.max(0.45, 1 + (z + 0.4) * 0.8) }), "pintura", cor);
  { const l = new THREE.BoxGeometry(0.11, 0.045, 0.02); l.translate(0, 1.08, -1.025); P(l, "luz", 0xd01822);
    const pl = new THREE.BoxGeometry(0.2, 0.14, 0.01); pl.rotateX(0.35); pl.translate(0, 0.86, -1.02); P(pl, "escuro", 0xf2f2f2);
    const fx = new THREE.BoxGeometry(0.2, 0.025, 0.012); fx.rotateX(0.35); fx.translate(0, 0.925, -1.0); P(fx, "escuro", 0x1f4fb5);
    const sup = new THREE.BoxGeometry(0.06, 0.22, 0.04); sup.rotateX(0.5); sup.translate(0, 0.9, -0.93); P(sup, "escuro", PRETO);
    for (const s of [-1, 1]) { const sl = new THREE.SphereGeometry(0.03, 8, 6); sl.translate(s * 0.13, 0.94, -0.96); P(sl, "luz", 0xff9a2a); } }
  // para-lama traseiro curtinho (hugger) e dianteiro
  { const h = new THREE.CylinderGeometry(R + 0.04, R + 0.04, 0.16, 12, 1, true, -0.2, 1.4); h.rotateZ(Math.PI / 2); h.translate(0, R, ET); P(h, "escuro", PRETO);
    const f = new THREE.CylinderGeometry(R + 0.04, R + 0.04, 0.14, 12, 1, true, 0.3, 1.15); f.rotateZ(Math.PI / 2); f.rotateX(0.0); f.translate(0, R, EF); P(f, "pintura", cor); }
  // ---- frente: garfo (tubos dourados), mesas, farol redondo, painel, guidão reto, manetes e retrovisores
  const topoGarfo = [0, 1.12, 0.6], dir = new THREE.Vector3(0, R - 1.12, EF - 0.6);
  for (const s of [-1, 1]) {
    const len = dir.length();
    const ga = new THREE.CylinderGeometry(0.03, 0.03, len * 0.55, 10); const gb = new THREE.CylinderGeometry(0.042, 0.042, len * 0.5, 10);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const m4 = (t) => new THREE.Matrix4().compose(new THREE.Vector3(s * 0.1, topoGarfo[1] + dir.y * t, topoGarfo[2] + dir.z * t), q, new THREE.Vector3(1, 1, 1));
    ga.applyMatrix4(m4(0.28)); gb.applyMatrix4(m4(0.74)); P(ga, "metal", CROMO); P(gb, "metal", 0xc9a227);
    const pin = new THREE.BoxGeometry(0.04, 0.11, 0.08); pin.translate(s * 0.135, R + 0.1, EF - 0.08); P(pin, "pintura", 0xd01a1a);
  }
  { const mesa = new THREE.BoxGeometry(0.28, 0.035, 0.1); mesa.translate(0, 1.13, 0.6); P(mesa, "metal", PRATA);
    const mesa2 = mesa.clone(); mesa2.translate(0, -0.13, 0.05); P(mesa2, "metal", PRATA);
    // farol redondo compacto
    const casco = new THREE.SphereGeometry(0.105, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62); casco.rotateX(-Math.PI / 2); casco.translate(0, 1.04, 0.74); P(casco, "pintura", PRETO);
    const lente = new THREE.CircleGeometry(0.092, 16); lente.translate(0, 1.04, 0.775 + 0.04); P(lente, "metal", 0xd8dee6);
    const lamp = new THREE.CircleGeometry(0.045, 12); lamp.translate(0, 1.04, 0.82); P(lamp, "luz", 0xfff8e6);
    for (const s of [-1, 1]) { const sp = new THREE.SphereGeometry(0.03, 8, 6); sp.translate(s * 0.15, 1.0, 0.7); P(sp, "luz", 0xff9a2a); }
    const painel = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14); painel.rotateX(-1.1); painel.translate(0, 1.2, 0.62); P(painel, "escuro", PRETO);
    const vis = new THREE.CircleGeometry(0.06, 12); vis.rotateX(-1.1 + Math.PI / 2 - Math.PI / 2); vis.rotateX(-0.47); vis.translate(0, 1.225, 0.61); P(vis, "metal", 0x5d6670);
    const guidao = new THREE.CylinderGeometry(0.018, 0.018, 0.74, 8); guidao.rotateZ(Math.PI / 2); guidao.translate(0, 1.17, 0.5); P(guidao, "escuro", 0x2a2b2f);
    for (const s of [-1, 1]) {
      const m = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8); m.rotateZ(Math.PI / 2); m.translate(s * 0.33, 1.17, 0.5); P(m, "escuro", 0x0f1012);
      const mn = new THREE.BoxGeometry(0.16, 0.012, 0.02); mn.rotateY(s * 0.25); mn.translate(s * 0.25, 1.16, 0.57); P(mn, "metal", PRATA);
      P(tubo([[s * 0.24, 1.18, 0.51], [s * 0.27, 1.3, 0.5], [s * 0.3, 1.36, 0.48]], 0.008, 4), "escuro", PRETO);
      const esp = new THREE.SphereGeometry(0.055, 10, 6); esp.scale(1, 0.62, 0.35); esp.translate(s * 0.31, 1.38, 0.48); P(esp, "escuro", PRETO);
    }
  }
  // pedaleiras (piloto e garupa)
  for (const s of [-1, 1]) for (const [z, y] of [[-0.16, 0.5], [-0.55, 0.56]]) { const p = new THREE.CylinderGeometry(0.018, 0.018, 0.12, 6); p.rotateZ(Math.PI / 2); p.translate(s * 0.2, y, z); P(p, "escuro", 0x2b2c30); }
  // sombrinha no chão
  { const s = new THREE.PlaneGeometry(0.75, 2.3); s.rotateX(-Math.PI / 2); s.translate(0, 0.012, 0.03); P(s, "sombra"); }
  // descanso lateral (do lado esquerdo do piloto, +x): aparece com a moto parada
  const descanso = new THREE.Group(); g.add(descanso);
  { const d = tubo([[0.12, 0.42, -0.12], [0.2, 0.2, -0.06], [0.28, 0.0, 0.0]], 0.016, 4); const m = pecaJE(d, "escuro", 0x2b2c30); descanso.add(m); }
  // rodas
  const rodas = [];
  for (const [z, larg, duplo] of [[EF, 0.065, true], [ET, 0.09, false]]) { const r = new THREE.Group(); r.position.set(0, R, z); r.add(rodaMoto(larg, duplo)); g.add(r); rodas.push(r); }
  if (parado) {
    mesclarPorMaterial(g);
    g.rotation.z = -0.12;
    Object.assign(g.userData, { moto: true, rodas: [], motorista: MOTORISTA.clone(), carona: null });
    return g;
  }
  for (const r of rodas) mesclarPorMaterial(r, { sombra: [] });
  descanso.userData.dinamico = true; // fica solto (some quando alguém sobe)
  mesclarPorMaterial(g, { juntas: new Set(rodas) });
  const seta = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 4), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); seta.rotation.x = Math.PI; seta.position.y = 2.6; seta.userData.dinamico = true; g.add(seta);
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
function soltarPose(rb) {
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
