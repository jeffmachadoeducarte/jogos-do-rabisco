// Rabiscolândia: veículos. O Rabisco dirige o carro fofo (carroFofo, em carros.js) ou o ônibus da escola (onibusFofo).
// Os carros da cidade (carro, em carros.js) andam sozinhos nas ROTAS, na faixa da direita, param
// no sinal fechado e quando tem alguém na frente. A IA de trânsito foi copiada e adaptada de
// jogos/cidade-do-rabisco/jogo.js (faixaDireita, pontoNaRota, atualizarCarros, luzDe).

import { THREE, mesclar } from "./base3d.js";
import { carro, carroFofo, onibusFofo, helicoptero, carroJE, ambulancia, vanSorvete, caminhaoBombeiro, bicicleta, patinete, barquinho, trator } from "./carros.js";
import { motoEsportiva } from "./motos.js";
import { ROTAS } from "./mapa.js";

export const CORES_CARRO = [0xec2e8c, 0x00b5f0, 0xff7a00, 0x58c43a, 0x8e6cff, 0xffcc1f];
// veículo que o Rabisco pode dirigir: { g, tipo, pos, ang, vel, virar, giro, comp (meio comprimento), larg }
export function criarVeiculo(tipo = "carro", cor = CORES_CARRO[0], enfeite = null) {
  const fab = { onibus: onibusFofo, heli: helicoptero, je: carroJE, ambulancia, sorvete: vanSorvete, bombeiro: caminhaoBombeiro, bici: () => bicicleta(cor), patinete: () => patinete(cor), barco: barquinho, trator, moto: () => motoEsportiva(cor) }[tipo];
  const g0 = fab ? fab() : carroFofo(cor);
  const g = enfeite?.(g0) ?? g0; // o enfeite pode trocar o carro (ex.: o carro novo da J.E sai igual ao do pátio)
  if (tipo === "heli") g.rotation.order = "YXZ"; // inclina para a frente/lados sem embolar o giro
  // meio comprimento, meia largura e velocidade máxima de cada um
  const medidas = { onibus: [4.4, 1.5, 11], heli: [3.0, 1.9, 14], carro: [2.4, 1.2, 15], je: [2.3, 1.25, 16], ambulancia: [2.7, 1.3, 13], sorvete: [2.7, 1.3, 11], bombeiro: [3.6, 1.35, 11], bici: [0.85, 0.35, 8], patinete: [0.55, 0.3, 6], barco: [1.9, 1.3, 4.5], trator: [1.8, 1.0, 7], moto: [1.25, 0.45, 17] }[tipo] ?? [2.4, 1.2, 15];
  let parado = g.userData.fazerParado?.(); // carros da J.E: a versão parada já vem mesclada (com os materiais de verdade)
  if (!parado) {
    const ud = g.userData; g.userData = {}; // (o userData do grupo tem objetos: não entra na cópia)
    parado = g.clone(true);
    g.userData = ud;
    parado.traverse((o) => { if (o.userData.dinamico && o !== parado && !o.userData.cima) o.visible = false; });
    for (const o of [...parado.children]) if (!o.visible) parado.remove(o);
    mesclar(parado);
  }
  parado.visible = false;
  if (tipo === "heli") parado.rotation.order = "YXZ";
  return { g, parado, tipo, cor: tipo === "heli" ? 0x00b5f0 : cor, pos: new THREE.Vector3(), ang: 0, vel: 0, virar: 0, giro: 0, batida: 0, buzina: 0, comp: medidas[0], larg: medidas[1], vmax: medidas[2], alt: 0.03, vs: 0, rotor: 0 };
}
export function animarVeiculo(v, dt, t) {
  v.g.position.copy(v.pos);
  v.g.rotation.y = v.ang;
  v.parado.position.copy(v.g.position); v.parado.rotation.copy(v.g.rotation);
  if (v.tipo === "heli") {
    // hélices giram com o motor; inclina um pouco para onde vai
    v.g.userData.rotor.rotation.y += v.rotor * dt * 28;
    v.g.userData.rotorCauda.rotation.x += v.rotor * dt * 40;
    v.g.rotation.x += (Math.min(0.25, v.vel * 0.015) - v.g.rotation.x) * Math.min(1, dt * 4);
    v.g.rotation.z += (v.virar * 0.18 * Math.min(1, v.rotor) - v.g.rotation.z) * Math.min(1, dt * 4);
  }
  v.giro += (v.vel * dt) / (v.g.userData.raioRoda ?? 0.44);
  // vidro com insulfilm (carros da J.E): fica mais claro com gente dentro, para ver quem está dirigindo
  const vd = v.g.userData.vidro; if (vd) vd.opacity = v.g.children.length > v.g.userData.nPecas ? 0.42 : 0.74;
  for (const r of v.g.userData.rodas) r.rotation.x = v.giro;
  if (v.tipo === "moto") { // inclina nas curvas; parada, apoia no descanso lateral
    const pilotando = v.g.children.length > v.g.userData.nPecas, alvo = pilotando ? v.virar * Math.min(1, Math.abs(v.vel) / 7) * 0.4 : -0.12;
    v.inclina = dt ? (v.inclina ?? alvo) + (alvo - (v.inclina ?? alvo)) * Math.min(1, dt * 5) : alvo;
    v.g.rotation.z = v.parado.rotation.z = v.inclina; v.g.userData.descanso.visible = !pilotando;
  }
  if (v.g.userData.seta.visible) v.g.userData.seta.position.y = (v.tipo === "onibus" ? 5.2 : v.tipo === "heli" ? 5.6 : v.tipo === "bombeiro" ? 4.0 : ["ambulancia", "sorvete"].includes(v.tipo) ? 4.2 : 3.0) + Math.sin(t * 4) * 0.2;
  if (v.tipo === "barco") { v.g.position.y = 0.05 + Math.sin(t * 2) * 0.05; v.g.rotation.z = Math.sin(t * 1.6) * 0.04; }
  // sirene (ambulância e bombeiro): luzes piscando enquanto liga
  const lz = v.g.userData.luzes;
  if (lz) { const on = v.sirene > 0; if (on) v.sirene -= dt; lz.forEach((m, i) => (m.material.emissiveIntensity = on && Math.floor(t * 6 + i) % 2 ? 2.5 : 0)); }
  // canhão d'água do caminhão de bombeiro
  const jt = v.g.userData.jato;
  if (jt) { jt.visible = v.jatoLigado; if (jt.visible) jt.children.forEach((gt, i) => { const f = (t * 1.6 + i / jt.children.length) % 1; gt.position.set(0, 0.6 + f * 3 - f * f * 3.4, 1 + f * 7); gt.scale.setScalar(0.6 + f); }); }
}

// ---------- trânsito
// cada cruzamento: verde para o eixo z (7 s), amarelo (2 s), verde para o eixo x (7 s), amarelo (2 s)
const CICLO = 18;
export function luzDe(s, eixo, t) {
  const f = (t + s.fase) % CICLO;
  const verdeZ = f < 7, amareloZ = f >= 7 && f < 9, verdeX = f >= 9 && f < 16;
  if (eixo === "z") return verdeZ ? "verde" : amareloZ ? "amarelo" : "vermelho";
  return verdeX ? "verde" : !verdeZ && !amareloZ && !verdeX ? "amarelo" : "vermelho";
}
export function atualizarSemaforos(semaforos, t) {
  for (const s of semaforos) for (const p of s.postes) {
    const luz = luzDe(s, p.userData.eixo, t);
    for (const [nome, m] of Object.entries(p.userData.luzes)) m.material.emissiveIntensity = nome === luz ? 2.2 : 0;
    p.userData.ped.material.emissive.setHex(luz === "vermelho" ? 0x30ff60 : 0xff3030);
  }
}
// rota com a faixa da direita (mão brasileira): desloca cada ponto para a direita de quem dirige
function faixaDireita(pts, desloc) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const d1 = [b[0] - a[0], b[1] - a[1]], d2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(...d1) || 1, l2 = Math.hypot(...d2) || 1;
    const n1 = [-d1[1] / l1, d1[0] / l1], n2 = [-d2[1] / l2, d2[0] / l2];
    let nx = n1[0] + n2[0], nz = n1[1] + n2[1];
    const ln = Math.hypot(nx, nz) || 1; nx /= ln; nz /= ln;
    const k = 1 / Math.max(0.5, nx * n1[0] + nz * n1[1]);
    out.push([b[0] + nx * desloc * k, b[1] + nz * desloc * k]);
  }
  const acum = [0];
  for (let i = 0; i < n; i++) acum.push(acum[i] + Math.hypot(out[(i + 1) % n][0] - out[i][0], out[(i + 1) % n][1] - out[i][1]));
  return { pts: out, acum, total: acum[n] };
}
function pontoNaRota(r, s) {
  s = ((s % r.total) + r.total) % r.total;
  let i = 0;
  while (r.acum[i + 1] < s) i++;
  const a = r.pts[i], b = r.pts[(i + 1) % r.pts.length], seg = r.acum[i + 1] - r.acum[i] || 1, f = (s - r.acum[i]) / seg;
  return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, dx: (b[0] - a[0]) / seg, dz: (b[1] - a[1]) / seg };
}
export function criarTransito(cena) {
  const cores = [0xd94a3d, 0x3d7ad9, 0xf2c94c, 0xffffff, 0x4cae5a, 0x8e6cff, 0xff7a00, 0x7fd6ff, 0xb5651d, 0xec2e8c];
  const carros = [];
  let c = 0;
  for (const rota of ROTAS) {
    const r = faixaDireita(rota.pts, 2.8);
    for (let i = 0; i < rota.carros; i++) {
      const g = carro(cores[c++ % cores.length]);
      mesclar(g); // o carro da cidade não mexe por dentro: poucas chamadas de desenho
      cena.add(g);
      const k = { g, rota: r, s: (r.total * i) / rota.carros + 7 * c, vel: 9, vAtual: 9 };
      const p = pontoNaRota(r, k.s);
      g.position.set(p.x, 0.03, p.z); g.rotation.y = Math.atan2(p.dx, p.dz);
      carros.push(k);
    }
  }
  return carros;
}
// alvos = [{ x, z, raio }] (o Rabisco a pé, os veículos parados e o que ele dirige): o carro para antes
export function atualizarTransito(carros, semaforos, alvos, dt, t) {
  for (const k of carros) {
    const p = pontoNaRota(k.rota, k.s);
    const { x: px, z: pz } = p;
    const dx = Math.sin(k.g.rotation.y), dz = Math.cos(k.g.rotation.y);
    const eixo = Math.abs(p.dx) > Math.abs(p.dz) ? "x" : "z";
    let alvoVel = k.vel;
    for (const s of semaforos) {
      const ahead = (s.x - px) * p.dx + (s.z - pz) * p.dz, lado = Math.abs((s.x - px) * p.dz - (s.z - pz) * p.dx);
      const parada = (eixo === "z" ? s.wX : s.wZ) / 2 + 4.6;
      if (lado < 8 && ahead > parada - 1.5 && ahead < parada + 14 && luzDe(s, eixo, t) !== "verde") alvoVel = Math.min(alvoVel, Math.max(0, (ahead - parada) * 1.6));
    }
    for (const a of alvos) {
      const ah = (a.x - px) * dx + (a.z - pz) * dz, l = Math.abs((a.x - px) * dz - (a.z - pz) * dx);
      if (ah > 0 && ah < 10 && l < a.raio + 1.3) alvoVel = Math.min(alvoVel, Math.max(0, (ah - a.raio - (a.comp ?? 0) - 3) * 2));
    }
    for (const o of carros) {
      if (o === k) continue;
      const a = (o.g.position.x - px) * dx + (o.g.position.z - pz) * dz, l = Math.abs((o.g.position.x - px) * dz - (o.g.position.z - pz) * dx);
      if (a > 0 && a < 9 && l < 1.8) alvoVel = Math.min(alvoVel, Math.max(0, (a - 5.5) * 2));
    }
    k.vAtual += (alvoVel - k.vAtual) * Math.min(1, dt * 3);
    k.s += k.vAtual * dt;
    k.g.position.set(px, 0.03, pz);
    const ang = Math.atan2(p.dx, p.dz);
    let d = ang - k.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    k.g.rotation.y += d * Math.min(1, dt * 6);
  }
}
