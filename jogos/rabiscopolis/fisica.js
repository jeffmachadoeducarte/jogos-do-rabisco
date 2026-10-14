// Rabiscolândia: física do Rabisco a pé (andar relativo à câmera, pulo com "coyote time" e buffer, chão de cima
// dos sólidos baixos) e do veículo (acelera, freia, ré, vira proporcional à velocidade, bate e volta).
// Copiado e adaptado de jogos/cidade-do-rabisco/jogo.js (chaoEm, bate, livre, moverJogador, carroBate, dirigirCarro).

import { BORDA } from "./mapa.js";

export const VEL = 6.5, PULO = 9.6, GRAV = 25, LARG = 0.35;

export function criarFisica(mundo) {
  const { solidos, circulos } = mundo;
  const chaoEm = (x, z, y) => {
    let h = 0.03;
    for (const s of solidos) if (s.y1 <= y + 0.4 && x > s.x0 - LARG && x < s.x1 + LARG && z > s.z0 - LARG && z < s.z1 + LARG && s.y1 > h) h = s.y1;
    return h;
  };
  const bate = (x, z, y, larg = LARG) => solidos.some((s) => y < s.y1 - 0.05 && x > s.x0 - larg && x < s.x1 + larg && z > s.z0 - larg && z < s.z1 + larg)
    || circulos.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + larg);
  // ponto livre perto do pedido (para nascer/sair do carro sem ficar dentro de nada)
  const livre = (x, z, folga = 0.9) => {
    for (let r = 0; r < 14; r += 0.7) for (let a = 0; a < 6.28; a += r ? 0.5 / r + 0.3 : 7) {
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (!bate(px, pz, 0.1, folga)) return [px, pz];
    }
    return [x, z];
  };
  // j = { pos, vel, noChao, coyote, buffer, dir }; ent = { ix, iy (−1..1), pular (novo), segura }; camYaw
  function andar(j, ent, camYaw, dt) {
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    const wx = fx * ent.iy - fz * ent.ix, wz = fz * ent.iy + fx * ent.ix;
    const k = Math.min(1, dt * (j.noChao ? 12 : 5));
    j.vel.x += (wx * VEL - j.vel.x) * k;
    j.vel.z += (wz * VEL - j.vel.z) * k;
    j.coyote = j.noChao ? 0.1 : j.coyote - dt;
    j.buffer = ent.pular ? 0.14 : j.buffer - dt;
    let pulou = false;
    if (j.buffer > 0 && j.coyote > 0) { j.vel.y = PULO; j.buffer = j.coyote = 0; j.noChao = false; pulou = true; }
    if (!ent.segura && j.vel.y > 4) j.vel.y = 4;
    j.vel.y -= GRAV * dt;
    const nx = j.pos.x + j.vel.x * dt;
    if (!bate(nx, j.pos.z, j.pos.y) && Math.abs(nx) < BORDA + 8) j.pos.x = nx; else j.vel.x = 0;
    const nz = j.pos.z + j.vel.z * dt;
    if (!bate(j.pos.x, nz, j.pos.y) && Math.abs(nz) < BORDA + 8) j.pos.z = nz; else j.vel.z = 0;
    const chao = chaoEm(j.pos.x, j.pos.z, j.pos.y);
    j.pos.y += j.vel.y * dt;
    if (j.pos.y <= chao) { j.pos.y = chao; j.vel.y = 0; j.noChao = true; } else j.noChao = j.pos.y - chao < 0.03;
    const v = Math.hypot(j.vel.x, j.vel.z);
    if (v > 0.4) { let d = Math.atan2(j.vel.x, j.vel.z) - j.dir; d = Math.atan2(Math.sin(d), Math.cos(d)); j.dir += d * Math.min(1, dt * 12); }
    return { v, pulou };
  }
  // colisão do veículo: círculos ao longo do comprimento, contra prédios, árvores, lago e outros carros
  function veiculoBate(v, x, z, ang, outros = []) {
    const fx = Math.sin(ang), fz = Math.cos(ang), L = v.larg + 0.05;
    const passos = v.comp > 3 ? [-v.comp + 1.4, -v.comp / 2, 0, v.comp / 2, v.comp - 1.4] : [-1.5, 0, 1.5];
    for (const k of passos) {
      const px = x + fx * k, pz = z + fz * k;
      if (solidos.some((s) => s.y1 > 0.6 && px > s.x0 - L && px < s.x1 + L && pz > s.z0 - L && pz < s.z1 + L)) return true;
      if (circulos.some((c) => Math.hypot(px - c.x, pz - c.z) < c.r + L)) return true;
    }
    for (const o of outros) if (o !== v && Math.hypot(o.x - x, o.z - z) < (o.raio ?? 2.4) + v.larg + 0.6) return true;
    return Math.abs(x) > BORDA + 6 || Math.abs(z) > BORDA + 6;
  }
  // ent = { ix, iy } · devolve true se bateu forte
  function dirigir(v, ent, dt, outros) {
    let iy = Math.abs(ent.iy) < 0.15 ? 0 : ent.iy;
    if (iy > 0) v.vel += iy * 9 * dt * (v.vel < 0 ? 2.2 : 1);
    else if (iy < 0) v.vel += iy * (v.vel > 0 ? 18 : 6) * dt;
    else v.vel -= Math.sign(v.vel) * Math.min(Math.abs(v.vel), 5 * dt);
    v.vel = Math.max(-5, Math.min(v.vmax, v.vel));
    v.virar += (ent.ix - v.virar) * Math.min(1, dt * 8);
    v.ang -= v.virar * (v.tipo === "onibus" ? 1.3 : 1.9) * dt * Math.max(-1, Math.min(1, v.vel / 6));
    const nx = v.pos.x + Math.sin(v.ang) * v.vel * dt, nz = v.pos.z + Math.cos(v.ang) * v.vel * dt;
    v.batida -= dt;
    let forte = false;
    if (veiculoBate(v, nx, nz, v.ang, outros)) {
      if (Math.abs(v.vel) > 4 && v.batida <= 0) { forte = true; v.batida = 0.8; }
      v.vel *= -0.25;
    } else { v.pos.x = nx; v.pos.z = nz; }
    return forte;
  }
  // Helicóptero: subir/descer, frente/ré e virar. O chão embaixo dele é o topo do que estiver ali (dá para pousar
  // num telhado); não atravessa prédios (bate de leve e para), não cai e não explode; pousa devagar.
  const R_HELI = 2.6;
  const chaoHeli = (x, z) => {
    let h = 0.03;
    for (const s of solidos) if (x > s.x0 - R_HELI && x < s.x1 + R_HELI && z > s.z0 - R_HELI && z < s.z1 + R_HELI && s.y1 > h && s.y1 < 40) h = s.y1;
    return h;
  };
  const heliBate = (x, z, alt) => solidos.some((s) => s.y1 > alt + 0.3 && x > s.x0 - R_HELI && x < s.x1 + R_HELI && z > s.z0 - R_HELI && z < s.z1 + R_HELI)
    || (alt < 1 && circulos.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + R_HELI)) || Math.abs(x) > BORDA + 4 || Math.abs(z) > BORDA + 4;
  // ent = { ix, iy, subir, descer } · devolve { pousado }
  function voar(v, ent, dt) {
    v.rotor += (1 - v.rotor) * Math.min(1, dt * 1.5); // motor ligado enquanto o Rabisco pilota
    const chao = chaoHeli(v.pos.x, v.pos.z);
    const noAr = v.alt > chao + 0.08;
    const vsAlvo = ent.subir && v.rotor > 0.6 ? 5.5 : ent.descer ? (v.alt - chao < 3 ? -1.4 : -4.5) : 0; // perto do chão desce devagar
    v.vs += (vsAlvo - v.vs) * Math.min(1, dt * 3);
    v.alt = Math.min(55, v.alt + v.vs * dt);
    if (v.alt <= chao) { v.alt = chao; v.vs = Math.max(0, v.vs); }
    const velAlvo = noAr ? (ent.iy > 0.15 ? ent.iy * v.vmax : ent.iy < -0.15 ? ent.iy * 5 : 0) : 0;
    v.vel += (velAlvo - v.vel) * Math.min(1, dt * 1.6);
    v.virar += (ent.ix - v.virar) * Math.min(1, dt * 6);
    if (noAr || Math.abs(ent.ix) > 0.1) v.ang -= v.virar * 1.5 * dt * (noAr ? 1 : 0.4);
    const nx = v.pos.x + Math.sin(v.ang) * v.vel * dt, nz = v.pos.z + Math.cos(v.ang) * v.vel * dt;
    if (heliBate(nx, nz, v.alt)) v.vel *= -0.2; else { v.pos.x = nx; v.pos.z = nz; }
    v.pos.y = v.alt;
    return { pousado: v.alt - chaoHeli(v.pos.x, v.pos.z) < 0.15 };
  }
  // motor desligando quando ninguém pilota
  function pararHeli(v, dt) { v.rotor = Math.max(0, v.rotor - dt * 0.5); v.vel = 0; v.vs = 0; }
  return { chaoEm, bate, livre, andar, dirigir, veiculoBate, voar, pararHeli, chaoHeli };
}
