// Rabiscolândia: os carros novos da Garagem do Rabisfone, no mesmo mundo de blocos dos outros veículos (carros.js),
// e a animação das rodas de todos os veículos que o Rabisco dirige.
//  - fusquinha(cor): carro clássico arredondado (besouro dos anos 60/70), azul, sem marca nenhuma: capô e traseira
//    curvos, para-lamas salientes e redondos com os faróis redondos em cima, para-choques cromados de lâmina na frente e
//    atrás, estribo entre os para-lamas, teto em cúpula e janelas pequenas de cantos arredondados (o Rabisco aparece
//    pelos vidros e a ponta do lápis cabe embaixo do teto).
//  - formulaRabisco(cor): carro de Fórmula 1 laranja: bico fino, asa dianteira e traseira, rodas grandes expostas e
//    cockpit aberto (o Rabisco sentado com a cabeça para fora). Um lugar só (sem carona).
//  - GARAGEM_NOVOS[tipo] = { fab(cor), medidas: [meio comprimento, meia largura, velocidade máxima] } (veiculos.js)
//  - animarRodas(v, dt): todas as rodas giram conforme a velocidade (frente e ré, cada uma pelo seu raio) e as
//    dianteiras dos veículos de 3+ rodas esterçam com o comando de direção (suave, até ~30°, voltam ao centro).
// Interface de veículo igual à de carros.js: frente = +z; userData = { rodas, seta, volante, motorista, carona, especial }.
// O que não mexe vira poucas malhas (mesclar); rodas, volante e seta ficam soltos.

import { THREE, matNovo, mat, malha, caixa, mesclar } from "./base3d.js";
import { emBlocos, cx as pc, prisma, geoCaixas, disco } from "./blocos.js";

const vidro = matNovo({ color: 0xbfeaff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
const farol = matNovo({ color: 0xfffbe6, emissive: 0xfff2c0, emissiveIntensity: 0.6 });
const CROMO = 0xdfe6ee, PNEU = 0x262626;

// perfil lateral (z para a frente, y para cima): pontos da frente para trás por cima ([z, y] reta, [cz, cy, z, y] curva)
// e o arco de cada roda recortado embaixo (raio rArco, centro na altura yBase)
function perfil(pontos, arcos, yBase, rArco) {
  const f = new THREE.Shape();
  f.moveTo(...pontos[0]);
  for (let i = 1; i < pontos.length; i++) { const p = pontos[i]; if (p.length === 4) f.quadraticCurveTo(p[0], p[1], p[2], p[3]); else f.lineTo(p[0], p[1]); }
  for (const z of [...arcos].sort((a, b) => a - b)) { f.lineTo(z - rArco, yBase); f.absarc(z, yBase, rArco, Math.PI, 0, true); }
  f.closePath();
  return f;
}
// a silhueta vira colunas de blocos (como o corpoExtrudado de carros.js, com passo e degrau mais finos: curva mais redonda)
function corpoBlocos(forma, largura, x = 0, { passo = 0.16, degrau = 0.08 } = {}) {
  const pts = forma.getPoints(10), xs = pts.map((p) => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const n = Math.round((x1 - x0) / passo), p = (x1 - x0) / n, ar = (v) => Math.round(v / degrau) * degrau, abertos = new Map(), lista = [];
  const fecha = (k, q) => { lista.push([largura, q.y1 - q.y0, q.fim - q.ini, x, (q.y0 + q.y1) / 2, (q.ini + q.fim) / 2]); abertos.delete(k); };
  for (let i = 0; i < n; i++) {
    const z = x0 + p * (i + 0.5), cruza = [], vivos = new Set();
    for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length]; if ((a.x <= z) !== (b.x <= z)) cruza.push(a.y + ((z - a.x) / (b.x - a.x)) * (b.y - a.y)); }
    cruza.sort((a, b) => a - b);
    for (let k = 0; k + 1 < cruza.length; k += 2) {
      const y0 = ar(cruza[k]), y1 = ar(cruza[k + 1]); if (y1 - y0 < 0.06) continue;
      const c = `${y0}|${y1}`; vivos.add(c);
      if (abertos.has(c)) abertos.get(c).fim = x0 + p * (i + 1); else abertos.set(c, { y0, y1, ini: x0 + p * i, fim: x0 + p * (i + 1) });
    }
    for (const [c, q] of [...abertos]) if (!vivos.has(c)) fecha(c, q);
  }
  for (const [c, q] of [...abertos]) fecha(c, q);
  return lista;
}
// roda de 8 lados centrada no próprio pivô (gira em x, esterça em y): pneu, aro, cruz de raios e miolo
function roda(raio, larg, corAro, corMiolo) {
  const g = new THREE.Group(), f = { sombra: false };
  g.add(malha(prisma(raio, raio, larg, 8).rotateZ(Math.PI / 2), mat(PNEU)));
  g.add(malha(prisma(raio * 0.62, raio * 0.62, larg + 0.04, 8).rotateZ(Math.PI / 2), mat(corAro), f));
  pc(g, larg + 0.08, raio * 0.8, raio * 0.22, 0xb8c0cc, 0, 0, 0, f); pc(g, larg + 0.08, raio * 0.22, raio * 0.8, 0xb8c0cc, 0, 0, 0, f);
  pc(g, larg + 0.1, raio * 0.36, raio * 0.36, corMiolo, 0, 0, 0, f);
  return g;
}
const seta3D = (y) => { const s = new THREE.Mesh(emBlocos(new THREE.ConeGeometry(0.45, 0.9, 4)), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); s.rotation.x = Math.PI; s.position.y = y; s.userData.dinamico = true; return s; };
const volante3D = (r, x, y, z) => { const v = malha(new THREE.TorusGeometry(r, 0.05, 8, 18), mat(PNEU)); v.position.set(x, y, z); v.rotation.x = -1.0; v.userData.dinamico = true; return v; };
// disco redondo "de pixels" virado para a frente (+z) ou para trás
function redondo(g, r, material, x, y, z, { tras = false, inclina = 0, furo = 0 } = {}) {
  const m = new THREE.Mesh(disco(r, { furo, passo: r / 4.5 }), material);
  m.position.set(x, y, z); m.rotation.set(inclina, tras ? Math.PI : 0, 0); g.add(m);
  return m;
}
function terminar(g, rodas, extra) {
  mesclar(g, { juntas: new Set(rodas) });
  for (const r of rodas) r.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  Object.assign(g.userData, { rodas, especial: "buzina", ...extra });
  return g;
}

// ------------------------------------------------------------------ Fusquinha azul
const FZ = 1.35, FX = 1.0, FR = 0.44; // eixos, bitola e raio das rodas
export function fusquinha(cor = 0x00b5f0) {
  const g = new THREE.Group(), lata = mat(cor), claro = new THREE.Color(cor).lerp(new THREE.Color(0xffffff), 0.5).getHex();
  // carroceria de baixo: capô curvo descendo para a frente, linha de cintura e a traseira redonda do motor
  const corpo = perfil([[2.2, 0.42], [2.38, 0.6, 2.3, 0.86], [2.2, 1.16, 1.7, 1.3], [0.8, 1.4], [-0.95, 1.42], [-1.8, 1.4, -2.2, 1.02], [-2.38, 0.72, -2.24, 0.42]], [FZ, -FZ], 0.42, 0.62);
  const caixas = corpoBlocos(corpo, 1.8);
  // para-lamas salientes e redondos (mais largos que a carroceria), com o arco da roda
  const fd = perfil([[FZ + 0.9, 0.46], [FZ + 0.98, 0.86], [FZ + 0.8, 1.22, FZ + 0.05, 1.24], [FZ - 0.72, 1.2, FZ - 0.82, 0.46]], [FZ], 0.44, 0.54);
  const ft = perfil([[-FZ + 0.82, 0.46], [-FZ + 0.72, 1.2, -FZ - 0.05, 1.24], [-FZ - 0.8, 1.22, -FZ - 0.98, 0.86], [-FZ - 0.9, 0.46]], [-FZ], 0.44, 0.54);
  for (const s of [-1, 1]) for (const f of [fd, ft]) caixas.push(...corpoBlocos(f, 0.36, s * 1.06));
  // cabine: colunas, moldura de cima e os cantinhos que arredondam as janelas; teto em cúpula de 3 degraus
  const W = 1.62, yC = 1.4, yT = 2.32; // largura da cabine, cintura e teto (a ponta do lápis do Rabisco fica a 2,21)
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.06);
    caixas.push([0.12, yT - yC, 0.16, x, (yC + yT) / 2, 0.68]); // coluna da frente
    caixas.push([0.12, yT - yC, 0.18, x, (yC + yT) / 2, -0.22]); // coluna do meio
    caixas.push([0.12, yT - yC, 0.42, x, (yC + yT) / 2, -0.98]); // coluna de trás (larga, como no besouro)
    caixas.push([0.12, 0.1, 1.9, x, yT - 0.05, -0.15]); // moldura de cima
    for (const [z, d] of [[0.56, 1], [-0.1, -1], [-0.34, 1], [-0.73, -1]]) { // cantinhos redondos de cada janela (em cima e embaixo)
      caixas.push([0.12, 0.12, 0.12, x, yT - 0.16, z + d * 0.02]);
      caixas.push([0.12, 0.08, 0.08, x, yC + 0.06, z + d * 0.02]);
    }
  }
  caixas.push([W, yT - yC, 0.14, 0, (yC + yT) / 2, -1.16]); // fundo da cabine (o vidro de trás é pequeno, embaixo do teto)
  caixas.push([W, 0.12, 0.14, 0, yT - 0.06, 0.7]); caixas.push([W, 0.08, 0.14, 0, yC + 0.04, 0.72]); // moldura do para-brisa
  caixas.push([W + 0.04, 0.12, 2.0, 0, yT + 0.06, -0.2], [W - 0.2, 0.1, 1.7, 0, yT + 0.17, -0.25], [W - 0.6, 0.08, 1.2, 0, yT + 0.26, -0.28]);
  g.add(malha(geoCaixas(caixas), lata));
  // vidros: para-brisa, laterais e o vidrinho de trás (o Rabisco aparece dirigindo)
  const vid = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, yT - yC - 0.04, 1.8), vidro); vid.position.set(0, (yC + yT) / 2, -0.24); vid.renderOrder = 3; g.add(vid);
  // estribo entre os para-lamas, de cada lado
  for (const s of [-1, 1]) pc(g, 0.34, 0.08, 1.1, 0x2f3440, s * 1.04, 0.5, 0);
  // para-choques cromados de lâmina na frente e atrás, com as garras
  for (const z of [2.44, -2.44]) {
    pc(g, 2.06, 0.13, 0.1, CROMO, 0, 0.5, z);
    for (const s of [-1, 1]) pc(g, 0.1, 0.3, 0.14, CROMO, s * 0.62, 0.56, z - Math.sign(z) * 0.03);
  }
  // capô com o friso cromado, saia clara embaixo e as grelhas do motor atrás
  pc(g, 0.14, 0.05, 1.0, CROMO, 0, 1.33, 1.42, { sombra: false, rx: 0.12 });
  pc(g, 1.86, 0.1, 2.9, claro, 0, 0.5, 0, { sombra: false });
  for (let i = 0; i < 4; i++) pc(g, 0.7, 0.05, 0.06, 0x2f3440, 0, 1.2 - i * 0.09, -2.06 - i * 0.03, { sombra: false });
  // faróis redondos com aro cromado em cima dos para-lamas da frente; lanternas redondas atrás
  const aroM = mat(CROMO), lant = mat(0xff3b3b);
  for (const s of [-1, 1]) {
    redondo(g, 0.24, aroM, s * 1.06, 0.98, FZ + 0.99, { inclina: -0.25, furo: 0.15 });
    redondo(g, 0.17, farol, s * 1.06, 0.98, FZ + 0.98, { inclina: -0.25 });
    redondo(g, 0.13, lant, s * 1.06, 0.98, -FZ - 1.0, { tras: true, inclina: 0.25 });
    pc(g, 0.06, 0.06, 0.18, CROMO, s * 0.86, 1.5, 0.66, { sombra: false }); // retrovisor
    pc(g, 0.2, 0.14, 0.06, CROMO, s * 1.0, 1.5, 0.66, { sombra: false });
  }
  // placa (sem marca nenhuma)
  pc(g, 0.6, 0.2, 0.04, 0xffffff, 0, 0.78, -2.42, { sombra: false });
  // interior: bancos claros (aparecem pelas janelas) e painel
  for (const x of [0.45, -0.45]) { pc(g, 0.68, 0.2, 0.7, 0xfff4e0, x, 0.88, -0.2); pc(g, 0.68, 0.7, 0.16, 0xfff4e0, x, 1.3, -0.6); }
  pc(g, W - 0.2, 0.22, 0.3, 0x2f3440, 0, 1.4, 0.55);
  const volante = volante3D(0.22, 0.45, 1.55, 0.32); g.add(volante);
  const rodas = [];
  for (const [x, z] of [[-FX, FZ], [FX, FZ], [-FX, -FZ], [FX, -FZ]]) { const r = roda(FR, 0.3, 0xf4f4f4, CROMO); r.position.set(x, FR, z); g.add(r); rodas.push(r); }
  const seta = seta3D(3.3); g.add(seta);
  return terminar(g, rodas, { seta, volante, motorista: new THREE.Vector3(0.45, 1.0, -0.15), carona: new THREE.Vector3(-0.45, 1.0, -0.15) });
}

// ------------------------------------------------------------------ Fórmula Rabisco (F1 laranja)
export function formulaRabisco(cor = 0xff7a00) {
  const g = new THREE.Group(), lata = mat(cor), PRETO = 0x1d1f24, CIANO = 0x00b5f0, BRANCO = 0xffffff;
  const caixas = [];
  // bico fino: afina e desce em degraus até a asa da frente
  for (let i = 0; i < 6; i++) { const k = i / 5; caixas.push([0.86 - k * 0.5, 0.46 - k * 0.24, 0.34, 0, 0.62 - k * 0.2, 0.78 + i * 0.32]); }
  // cockpit (monocoque), laterais (sidepods) e a tampa do motor afinando para trás
  caixas.push([0.96, 0.52, 1.6, 0, 0.6, -0.1]);
  for (const s of [-1, 1]) caixas.push([0.42, 0.44, 1.4, s * 0.68, 0.48, -0.4], [0.3, 0.12, 1.1, s * 0.64, 0.76, -0.55]);
  caixas.push([0.78, 0.5, 0.7, 0, 0.75, -1.05], [0.6, 0.4, 0.6, 0, 0.66, -1.7], [0.4, 0.3, 0.4, 0, 0.56, -2.15]);
  caixas.push([0.36, 0.34, 0.46, 0, 1.15, -1.0]); // tomada de ar atrás da cabeça
  g.add(malha(geoCaixas(caixas), lata));
  // abertura do cockpit (escura) com a borda branca
  pc(g, 0.64, 0.04, 0.96, PRETO, 0, 0.87, -0.12, { sombra: false });
  for (const s of [-1, 1]) pc(g, 0.08, 0.08, 1.0, BRANCO, s * 0.36, 0.9, -0.12, { sombra: false });
  pc(g, 0.36, 0.2, 0.06, PRETO, 0, 1.2, -0.76, { sombra: false }); // boca da tomada de ar
  // faixa branca no bico e números redondos (sem marca)
  pc(g, 0.16, 0.03, 1.4, BRANCO, 0, 0.82, 1.3, { sombra: false, rx: 0.15 });
  for (const s of [-1, 1]) { const d = redondo(g, 0.2, mat(BRANCO), s * 0.895, 0.5, -0.4); d.rotation.y = s * Math.PI / 2; }
  // entradas de ar das laterais e retrovisores
  for (const s of [-1, 1]) { pc(g, 0.36, 0.3, 0.05, PRETO, s * 0.68, 0.5, 0.31, { sombra: false }); pc(g, 0.2, 0.1, 0.06, PRETO, s * 0.56, 1.0, 0.3, { sombra: false }); pc(g, 0.04, 0.12, 0.04, PRETO, s * 0.5, 0.93, 0.3, { sombra: false }); }
  // asa da frente: duas lâminas e as placas das pontas (com a faixa ciano do Rabisco)
  pc(g, 2.5, 0.07, 0.52, PRETO, 0, 0.2, 2.5); pc(g, 2.3, 0.06, 0.28, cor, 0, 0.3, 2.42);
  for (const s of [-1, 1]) { pc(g, 0.07, 0.34, 0.66, CIANO, s * 1.25, 0.3, 2.48); }
  // asa de trás: plano principal, aba de cima, placas laterais e o pilar
  pc(g, 1.96, 0.09, 0.5, cor, 0, 1.42, -2.36); pc(g, 1.96, 0.07, 0.3, PRETO, 0, 1.56, -2.46);
  for (const s of [-1, 1]) { pc(g, 0.07, 0.8, 0.78, PRETO, s * 1.0, 1.2, -2.38); pc(g, 0.08, 0.12, 0.78, CIANO, s * 1.0, 1.55, -2.38, { sombra: false }); }
  pc(g, 0.12, 0.62, 0.26, PRETO, 0, 1.08, -2.24);
  pc(g, 1.1, 0.24, 0.4, PRETO, 0, 0.3, -2.25); // difusor
  pc(g, 0.12, 0.1, 0.06, 0xff3b3b, 0, 0.36, -2.47, { sombra: false }); // luz de chuva
  // suspensão: braços finos do corpo até as rodas
  for (const [z, x0] of [[1.55, 0.3], [-1.55, 0.3]]) for (const y of [0.42, 0.6]) pc(g, 0.82, 0.05, 0.08, PRETO, 0.5 + x0 * 0.6, y, z, { sombra: false }), pc(g, 0.82, 0.05, 0.08, PRETO, -(0.5 + x0 * 0.6), y, z, { sombra: false });
  const volante = volante3D(0.16, 0, 1.08, 0.32); g.add(volante);
  // rodas grandes expostas: as de trás mais largas
  const rodas = [];
  for (const [x, z, r, w] of [[-1.16, 1.55, 0.48, 0.42], [1.16, 1.55, 0.48, 0.42], [-1.2, -1.55, 0.54, 0.58], [1.2, -1.55, 0.54, 0.58]]) { const rd = roda(r, w, 0xf4f4f4, cor); rd.position.set(x, r, z); g.add(rd); rodas.push(rd); }
  const seta = seta3D(3.0); g.add(seta);
  return terminar(g, rodas, { seta, volante, motorista: new THREE.Vector3(0, 0.74, -0.12), carona: null });
}

// tipo da Garagem → fábrica e medidas (meio comprimento, meia largura, velocidade máxima)
export const GARAGEM_NOVOS = {
  fusca: { fab: (cor) => fusquinha(cor), medidas: [2.45, 1.25, 14] },
  f1: { fab: (cor) => formulaRabisco(cor), medidas: [2.7, 1.45, 17] },
};

// ------------------------------------------------------------------ rodas: giram e esterçam
const ESTERCO_MAX = 0.52; // ~30°
export function animarRodas(v, dt) {
  const rodas = v.g.userData.rodas;
  if (!rodas?.length) return;
  // as dianteiras (frente = +z) esterçam nos veículos de 3+ rodas: virar > 0 vira para a direita (ang diminui)
  const alvo = rodas.length >= 3 ? -Math.max(-1, Math.min(1, v.virar ?? 0)) * ESTERCO_MAX : 0;
  v.esterco = dt > 0 && v.esterco != null ? v.esterco + (alvo - v.esterco) * Math.min(1, dt * 10) : alvo;
  for (const r of rodas) {
    const ud = r.userData;
    if (ud.raio == null) { ud.raio = Math.max(0.08, r.position.y); ud.frente = r.position.z > 0.05; ud.giro = 0; r.rotation.order = "YXZ"; }
    ud.giro = (ud.giro + ((v.vel ?? 0) * dt) / ud.raio) % (Math.PI * 2);
    r.rotation.x = ud.giro; // rola para a frente com vel > 0 e para trás na ré
    r.rotation.y = ud.frente && rodas.length >= 3 ? v.esterco : 0;
  }
}
