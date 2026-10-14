// Rabiscolândia: física do Rabisco a pé (andar relativo à câmera, pulo com "coyote time" e buffer, chão de cima
// dos sólidos baixos) e do veículo (acelera, freia, ré, vira proporcional à velocidade, bate e volta).
// Copiado e adaptado de jogos/cidade-do-rabisco/jogo.js (chaoEm, bate, livre, moverJogador, carroBate, dirigirCarro).

import { BORDA, LAGO, LAGO2 } from "./mapa.js";

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
    // anti-deadlock a pé: se já está dentro de algo (nasceu/foi empurrado), sai para o ponto livre mais próximo
    if (bate(j.pos.x, j.pos.z, j.pos.y) && (Math.abs(ent.ix) > 0.1 || Math.abs(ent.iy) > 0.1)) { const [lx, lz] = livre(j.pos.x, j.pos.z, LARG + 0.05); j.pos.x = lx; j.pos.z = lz; j.vel.x = j.vel.z = 0; }
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
  // colisão do veículo: círculos ao longo do comprimento, contra prédios, árvores, lago e outros veículos/gente.
  // veiculoPen devolve a PROFUNDIDADE da sobreposição (> 0 = preso dentro de algo; 0 = livre): é o que deixa o
  // anti-deadlock aceitar o movimento que sai de dentro. Carro da IA nunca entra aqui (o jogador o atravessa
  // como fantasma; é a IA que freia): quem monta "outros" não passa o trânsito, e o que vier com fantasma é ignorado.
  const FOLGA = 0.04; // tolerância de encosto: raspar de lado (tangente) não conta como bater
  function veiculoPen(v, x, z, ang, outros = []) {
    const fx = Math.sin(ang), fz = Math.cos(ang), L = v.larg + 0.05;
    const passos = v.comp > 3 ? [-v.comp + 1.4, -v.comp / 2, 0, v.comp / 2, v.comp - 1.4] : v.comp < 1.6 ? [-v.comp * 0.6, 0, v.comp * 0.6] : [-1.5, 0, 1.5];
    let pen = 0;
    for (const k of passos) {
      const px = x + fx * k, pz = z + fz * k;
      for (const s of solidos) {
        if (s.y1 <= 0.3 || px <= s.x0 - L || px >= s.x1 + L || pz <= s.z0 - L || pz >= s.z1 + L) continue;
        const d = Math.min(px - (s.x0 - L), s.x1 + L - px, pz - (s.z0 - L), s.z1 + L - pz);
        if (d > pen) pen = d;
      }
      for (const c of circulos) { const d = c.r + L - Math.hypot(px - c.x, pz - c.z); if (d > pen) pen = d; }
    }
    for (const o of outros) {
      if (o === v || o.fantasma) continue;
      const d = (o.raio ?? 2.4) + v.larg + 0.6 - Math.hypot(o.x - x, o.z - z);
      if (d > pen) pen = d;
    }
    const b = Math.max(Math.abs(x), Math.abs(z)) - (BORDA + 6);
    return b > pen ? b : pen;
  }
  function veiculoBate(v, x, z, ang, outros = []) {
    // barquinho: só na água (todo o casco dentro de um dos lagos)
    if (v.tipo === "barco") {
      const fx = Math.sin(ang), fz = Math.cos(ang), L = v.larg + 0.05;
      const passos = [-1.5, 0, 1.5];
      const naAgua = (px, pz) => [LAGO, LAGO2].some((l) => Math.hypot(px - l.x, pz - l.z) < l.r - 0.5 - L);
      return passos.some((k) => !naAgua(x + fx * k, z + fz * k)) || outros.some((o) => o !== v && !o.fantasma && Math.hypot(o.x - x, o.z - z) < (o.raio ?? 2.4) + v.larg + 0.6);
    }
    return veiculoPen(v, x, z, ang, outros) > FOLGA;
  }
  // ponto livre mais próximo do veículo (mantendo o ângulo) para o empurrãozinho anti-preso: prefere um ponto de
  // onde dá para andar para frente E para trás (folga de 2,6 m nos dois sentidos); senão, o primeiro livre
  function pontoLivreVeiculo(v, outros) {
    let simples = null;
    const fx = Math.sin(v.ang), fz = Math.cos(v.ang);
    for (let r = 0.2; r < 24; r += 0.2) {
      const n = Math.max(8, Math.round(r * 8));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.2832, px = v.pos.x + Math.cos(a) * r, pz = v.pos.z + Math.sin(a) * r;
        if (veiculoBate(v, px, pz, v.ang, outros)) continue;
        if (!simples) simples = [px, pz];
        let limpo = true; // o caminho todo (não só as pontas) tem que estar livre nos dois sentidos
        for (let d = 0.4; d <= 2.6 && limpo; d += 0.4) limpo = !veiculoBate(v, px + fx * d, pz + fz * d, v.ang, outros) && !veiculoBate(v, px - fx * d, pz - fz * d, v.ang, outros);
        if (limpo) return [px, pz];
      }
      if (simples && r > 4) break;
    }
    return simples;
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
    const barco = v.tipo === "barco";
    // anti-deadlock: se já está sobreposto a algo, vale todo movimento que reduz a sobreposição
    const pen0 = barco ? 0 : veiculoPen(v, v.pos.x, v.pos.z, v.ang, outros);
    const pen1 = barco ? (veiculoBate(v, nx, nz, v.ang, outros) ? 1 : 0) : veiculoPen(v, nx, nz, v.ang, outros);
    const sai = pen0 > FOLGA && pen1 < pen0 - 1e-4;
    const dx0 = v.pos.x, dz0 = v.pos.z;
    if (pen1 <= FOLGA || sai) { v.pos.x = nx; v.pos.z = nz; }
    else {
      if (Math.abs(v.vel) > 4 && v.batida <= 0 && pen0 <= FOLGA) { forte = true; v.batida = 0.8; }
      v.vel *= pen0 > FOLGA ? 0.5 : -0.25;
    }
    // anti-deadlock 2: preso (sobreposto, acelerador apertado, quase sem sair do lugar) por 0,5 s: empurra suave
    // para o ponto livre mais próximo
    if (!barco && pen0 > FOLGA && iy !== 0 && Math.hypot(v.pos.x - dx0, v.pos.z - dz0) < 0.4 * dt * 6) v.preso = (v.preso ?? 0) + dt;
    else if (pen0 <= FOLGA || iy === 0) v.preso = 0;
    if (v.preso > 0.5 && !v.saida) { v.saida = pontoLivreVeiculo(v, outros); v.saidaT = 0; v.preso = 0; }
    if (v.saida && iy === 0) v.saida = null;
    if (v.saida) {
      const ex = v.saida[0] - v.pos.x, ez = v.saida[1] - v.pos.z, d = Math.hypot(ex, ez), m = Math.min(d, 7 * dt);
      v.saidaT += dt;
      if (d > 1e-6) { v.pos.x += (ex / d) * m; v.pos.z += (ez / d) * m; }
      v.vel = 0;
      if (d <= 7 * dt || v.saidaT > 3) v.saida = null;
    }
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
  return { chaoEm, bate, livre, andar, dirigir, veiculoBate, veiculoPen, voar, pararHeli, chaoHeli };
}
