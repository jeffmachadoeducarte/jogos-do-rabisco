// Rabiscópolis: veículos. O Rabisco dirige o carro fofo (carroFofo, em carros.js) ou o ônibus da escola (onibusFofo).
// Os carros da cidade (carro, de ../cidade-do-rabisco/cidade.js) andam sozinhos nas ROTAS, na faixa da direita, param
// no sinal fechado e quando tem alguém na frente. A IA de trânsito foi copiada e adaptada de
// jogos/cidade-do-rabisco/jogo.js (faixaDireita, pontoNaRota, atualizarCarros, luzDe).

import { THREE, mesclar } from "./base3d.js";
import { carro } from "../cidade-do-rabisco/cidade.js";
import { carroFofo, onibusFofo } from "./carros.js";
import { ROTAS } from "./mapa.js";

export const CORES_CARRO = [0xec2e8c, 0x00b5f0, 0xff7a00, 0x58c43a, 0x8e6cff, 0xffcc1f];
// veículo que o Rabisco pode dirigir: { g, tipo, pos, ang, vel, virar, giro, comp (meio comprimento), larg }
export function criarVeiculo(tipo = "carro", cor = CORES_CARRO[0]) {
  const g = tipo === "onibus" ? onibusFofo() : carroFofo(cor);
  return { g, tipo, cor, pos: new THREE.Vector3(), ang: 0, vel: 0, virar: 0, giro: 0, batida: 0, buzina: 0, comp: tipo === "onibus" ? 4.4 : 2.4, larg: tipo === "onibus" ? 1.5 : 1.2, vmax: tipo === "onibus" ? 11 : 15 };
}
export function animarVeiculo(v, dt, t) {
  v.g.position.copy(v.pos);
  v.g.rotation.y = v.ang;
  v.giro += (v.vel * dt) / 0.44;
  for (const r of v.g.userData.rodas) r.rotation.x = v.giro;
  if (v.g.userData.seta.visible) v.g.userData.seta.position.y = (v.tipo === "onibus" ? 5.2 : 3.2) + Math.sin(t * 4) * 0.2;
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
      if (ah > 0 && ah < 10 && l < a.raio + 1.3) alvoVel = Math.min(alvoVel, Math.max(0, (ah - a.raio - 3) * 2));
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
