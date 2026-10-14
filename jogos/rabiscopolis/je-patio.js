// Rabiscolândia: o pátio cercado da J.E Multimarcas (a loja de carros parceira), atrás da loja (bairro Leste, Avenida da
// Esperança). Cinco carros fofos expostos em leque, cada um com um enfeite (aerofólio, santantônio com estepe,
// florzinha, prancha de surfe, frisos cromados) e a plaquinha de "preço" de brincadeira ("R$ 1 sorriso", "R$ 2
// abraços"...). O portão abre para a avenida. A J.E vende SÓ carros.
// Orçamento: montado só quando o Rabisco chega perto (~70 m) e mesclado em poucas malhas (cerca + chão numa, os 5
// carros noutra, as plaquinhas numa textura só); quando um carro é escolhido, o grupo dos carros é refeito sem ele e
// sai um carro de verdade (com rodas que giram) no lugar.
//   const P = criarPatioJE(cena, { solidos });  P.atualizar(x, z);  P.escolher(i) → { cor, hex, modelo, x, z, ang }

import { THREE, mat, malha, caixa, caixaRedonda, texturaCanvas, mesclar } from "./base3d.js";
import { carroFofo } from "./carros.js";
import { PATIO_JE } from "./mapa.js";

export const PRECOS = ["R$ 1 sorriso", "R$ 2 abraços", "R$ 3 obrigados", "R$ 4 sorrisos", "R$ 5 abraços"];
// enfeite de cada modelo (copiado e adaptado de jogos/cidade-do-rabisco/jogo.js · enfeitarCarro)
export function enfeitarCarro(g, modelo) {
  const branco = mat(0xffffff), preto = mat(0x262626), cromo = mat(0xdfe6ee);
  const peca = (geo, m, x, y, z, c = 0.02) => { const b = malha(geo, m, { contorno: c, sombra: false }); b.position.set(x, y, z); g.add(b); return b; };
  const bx = (w, h, d, m, x, y, z) => { const b = caixaRedonda(w, h, d, m, { raio: Math.min(w, h, d) * 0.3, contorno: 0.02, sombra: false }); b.position.set(x, y, z); g.add(b); return b; };
  if (modelo === 0) { bx(2.1, 0.08, 0.45, preto, 0, 1.62, -2.15); for (const x of [-0.75, 0.75]) bx(0.08, 0.36, 0.12, preto, x, 1.42, -2.1); }
  else if (modelo === 1) { peca(new THREE.TorusGeometry(0.95, 0.07, 8, 20, Math.PI), preto, 0, 1.15, -1.25); peca(new THREE.TorusGeometry(0.28, 0.13, 6, 16), preto, 0, 1.0, -2.65); peca(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 12), branco, 0, 1.0, -2.65).rotation.x = Math.PI / 2; }
  else if (modelo === 2) { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; peca(new THREE.SphereGeometry(0.13, 10, 8), branco, Math.cos(a) * 0.17, 1.24, 1.55 + Math.sin(a) * 0.17, 0).scale.y = 0.4; } peca(new THREE.SphereGeometry(0.11, 10, 8), mat(0xec2e8c), 0, 1.27, 1.55, 0).scale.y = 0.5; }
  else if (modelo === 3) { for (const z of [-1.3, -2.1]) bx(2.0, 0.06, 0.1, preto, 0, 1.45, z); const p = peca(new THREE.SphereGeometry(1, 16, 8), mat(0xffcc1f), 0, 1.55, -1.7); p.scale.set(0.35, 0.06, 1.5); }
  else { for (const s of [-1, 1]) bx(0.04, 0.08, 3.8, cromo, s * 1.17, 0.78, 0); peca(new THREE.OctahedronGeometry(0.16), mat(0xffd84a), 0, 1.36, 2.05); }
}
// plaquinhas: as 5 numa textura só (cada uma usa um pedaço da imagem)
let texPlacas = null;
function texturaPlacas() {
  return (texPlacas ??= texturaCanvas(1280, 176, (c) => {
    PATIO_JE.vagas.forEach((vg, i) => {
      const x0 = i * 256, cor = `#${new THREE.Color(vg.hex).getHexString()}`;
      c.fillStyle = "#ffffff"; c.fillRect(x0, 0, 256, 176); c.lineWidth = 10; c.strokeStyle = "#151515"; c.strokeRect(x0 + 5, 5, 246, 166);
      c.fillStyle = cor; c.fillRect(x0 + 10, 10, 236, 62);
      c.font = "900 44px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 6; c.strokeText(vg.cor.toUpperCase(), x0 + 128, 44); c.fillStyle = "#ffffff"; c.fillText(vg.cor.toUpperCase(), x0 + 128, 44);
      c.font = "800 32px 'Baloo 2', sans-serif"; c.fillStyle = "#151515"; c.fillText(PRECOS[i], x0 + 128, 108);
      c.fillStyle = "#ffb300"; c.font = "900 30px 'Baloo 2', sans-serif"; c.fillText("★ ★ ★", x0 + 128, 146);
    });
  }));
}
function plaquinha(i) {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(1.5, 1.03); const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / 5);
  const m = new THREE.MeshToonMaterial({ map: texturaPlacas(), emissive: 0xffffff, emissiveMap: texturaPlacas(), emissiveIntensity: 0.3, side: THREE.DoubleSide });
  const placa = new THREE.Mesh(geo, m); g.add(placa);
  const haste = malha(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), mat(0x333333), { sombra: false }); haste.position.y = -0.85; g.add(haste);
  g.position.set(0, 2.35, 1.0);
  return g;
}
export function carroExposto(vg) {
  const g = carroFofo(vg.hex);
  enfeitarCarro(g, vg.modelo);
  g.userData.seta.visible = false;
  g.add(plaquinha(vg.modelo));
  return g;
}

export function criarPatioJE(cena, { solidos }) {
  const P = PATIO_JE, raiz = new THREE.Group(); raiz.visible = false; cena.add(raiz);
  let fixo = null, carros = null; const escolhidos = new Set();
  // cerca (com o portão aberto para a avenida) fica sempre como colisão; os carros também, até sair
  const cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;
  const muros = [];
  const [g0, g1] = P.portao; // vão do portão no lado x0 (de frente para a Avenida do Contorno), de z = g0 a g1
  muros.push({ x0: P.x0, x1: P.x1, z0: P.z0 - 0.15, z1: P.z0 + 0.15 }, { x0: P.x0, x1: P.x1, z0: P.z1 - 0.15, z1: P.z1 + 0.15 }, { x0: P.x1 - 0.15, x1: P.x1 + 0.15, z0: P.z0, z1: P.z1 });
  muros.push({ x0: P.x0 - 0.15, x1: P.x0 + 0.15, z0: P.z0, z1: g0 }, { x0: P.x0 - 0.15, x1: P.x0 + 0.15, z0: g1, z1: P.z1 });
  for (const m of muros) solidos.push({ ...m, y1: 1.2 });
  const solidosCarros = P.vagas.map((vg) => { const sa = Math.abs(Math.sin(vg.ang)), ca = Math.abs(Math.cos(vg.ang)); const hx = (sa * 2.3 + ca * 1.15) * 0.9, hz = (ca * 2.3 + sa * 1.15) * 0.9; const s = { x0: vg.x - hx, x1: vg.x + hx, z0: vg.z - hz, z1: vg.z + hz, y1: 1.0 }; solidos.push(s); return s; });
  function montarFixo() {
    fixo = new THREE.Group(); raiz.add(fixo);
    const piso = caixa(P.x1 - P.x0, 0.06, P.z1 - P.z0, mat(0xd9dde3), { sombra: false }); piso.position.set(cx, 0.03, cz); fixo.add(piso);
    // faixas brancas das vagas
    for (const vg of P.vagas) { const f = caixa(0.12, 0.02, 5.2, mat(0xffffff), { sombra: false }); f.position.set(vg.x - Math.cos(vg.ang) * 1.6, 0.07, vg.z + Math.sin(vg.ang) * 1.6); f.rotation.y = vg.ang; fixo.add(f); }
    // cerca baixinha branca com postes pretos e bandeirinhas coloridas
    for (const m of muros) {
      const w = m.x1 - m.x0, d = m.z1 - m.z0, long = Math.max(w, d);
      const trilho = caixaRedonda(Math.max(w, 0.12), 0.12, Math.max(d, 0.12), mat(0xffffff), { raio: 0.04, contorno: 0.02 }); trilho.position.set((m.x0 + m.x1) / 2, 0.95, (m.z0 + m.z1) / 2); fixo.add(trilho);
      const n = Math.max(2, Math.round(long / 2.2));
      for (let i = 0; i <= n; i++) { const t = i / n, x = m.x0 + (m.x1 - m.x0) * t, z = m.z0 + (m.z1 - m.z0) * t; const p = caixa(0.18, 1.2, 0.18, mat(0x1d1d1d), { sombra: false }); p.position.set(w > d ? x : (m.x0 + m.x1) / 2, 0.6, w > d ? (m.z0 + m.z1) / 2 : z); fixo.add(p); }
    }
    const cores = [0xec2e8c, 0x00b5f0, 0xffcc1f, 0x58c43a, 0x8e6cff];
    for (const [x, z] of [[P.x0, g0], [P.x0, g1]]) { const p = caixaRedonda(0.3, 2.6, 0.3, mat(0x1d1d1d), { raio: 0.08, contorno: 0.03 }); p.position.set(x, 1.3, z); fixo.add(p); }
    for (let i = 0; i < 12; i++) { const t = i / 11, z = g0 + (g1 - g0) * t; const b = malha(new THREE.ConeGeometry(0.2, 0.36, 3), mat(cores[i % 5]), { sombra: false }); b.rotation.x = Math.PI; b.position.set(P.x0, 2.35 - Math.sin(t * Math.PI) * 0.35, z); fixo.add(b); }
    // fita entre os postes do portão (as bandeirinhas penduradas)
    const fita = caixa(0.05, 0.05, g1 - g0, mat(0x1d1d1d), { sombra: false }); fita.position.set(P.x0, 2.5, (g0 + g1) / 2); fixo.add(fita);
    mesclar(fixo);
    const semContorno = []; fixo.traverse((o) => { if (o.isMesh) { o.castShadow = false; if (o.userData.contorno && o.geometry.attributes.position.count > 3000) semContorno.push(o); } });
    for (const o of semContorno) { o.removeFromParent(); o.geometry.dispose(); } // contorno dos postinhos: pesado e não faz falta
  }
  function montarCarros() {
    if (carros) { carros.removeFromParent(); carros.traverse((o) => { if (o.geometry && !o.geometry.userData.compartilhada) o.geometry.dispose(); }); }
    carros = new THREE.Group(); raiz.add(carros);
    P.vagas.forEach((vg, i) => { if (escolhidos.has(i)) return; const g = carroExposto(vg); g.position.set(vg.x, 0.03, vg.z); g.rotation.y = vg.ang; carros.add(g); });
    carros.traverse((o) => { if (o.userData.dinamico) o.userData.dinamico = false; });
    mesclar(carros);
    // orçamento (≤ 350 mil triângulos): no pátio os carros parados não fazem sombra própria e o contorno preto só fica
    // no carro que sai dirigindo (de longe ninguém nota; de perto a cerca e a plaquinha chamam mais atenção)
    const tirar = []; carros.traverse((o) => { if (o.isMesh) { o.castShadow = false; if (o.userData.contorno) tirar.push(o); } });
    for (const o of tirar) { o.removeFromParent(); o.geometry.dispose(); }
  }
  return {
    raiz, vagas: P.vagas,
    atualizar(x, z) {
      const perto = Math.hypot(x - cx, z - cz) < 75;
      if (perto && !fixo) { montarFixo(); montarCarros(); }
      raiz.visible = perto;
    },
    // o carro i sai do pátio (o jogo põe um carro de verdade no lugar)
    escolher(i) { escolhidos.add(i); const s = solidosCarros[i], k = solidos.indexOf(s); if (k >= 0) solidos.splice(k, 1); if (fixo) montarCarros(); return P.vagas[i]; },
    devolver() { for (const i of escolhidos) if (!solidos.includes(solidosCarros[i])) solidos.push(solidosCarros[i]); escolhidos.clear(); if (fixo) montarCarros(); },
    get escolhidos() { return [...escolhidos]; },
  };
}
