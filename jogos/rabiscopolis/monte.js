// Rabiscolândia (Mundo Vivo, etapa 7): o Monte da Oração, um lugar novo e visitável no canto noroeste da cidade.
// Um morro de blocos em 5 patamares (pedra com tampo de grama), uma trilha de escadinhas que dá a volta no morro
// (degraus de 0,3 m: o Rabisco sobe andando, como no Mirante), uma cachoeira de blocos que desce pelo lado leste até
// um lago no pé do morro (água de MAT_AGUA: a textura corre sozinha, como no mar e nos lagos) e, no topo, uma cruz
// que acende de noite (MAT.lampada, o mesmo vidro dos postes). Tudo caixa de cor lisa: entra na mesclagem do bloco
// (0 chamadas); a água é 1 chamada só quando o bloco está à vista.
// Convenção dos lugares: a frente fica em z = 0 (local) olhando para +z e o morro vai para −z.
//   const S = monteOracao(l) → { grupo, solidos, topo: [x, z] (local, onde fica a cruz), alturaTopo }

import { THREE, mat, malha, caixa, MAT, MAT_AGUA, letreiro, arvoreReal } from "./base3d.js";
import { aleatorio } from "../../src/motor3d/toon.js";
import { banco } from "./predios.js";

export const MONTE = { meia: 22, centroZ: -23, andar: 2.4, patamares: [22, 17.5, 13, 9, 5.2] }; // meia largura de cada patamar
const ROCHA = [0x9a8b7a, 0x8d7e6e, 0xa49585], GRAMA = [0x5fb44f, 0x69bf58, 0x58ad49], DEGRAU = [0xd8d2c4, 0xe8e2d6];

export function monteOracao() {
  const rnd = aleatorio(7121); // sorteio próprio: o resto da cidade não muda de lugar
  const grupo = new THREE.Group(), solidos = [];
  const { andar: H, centroZ: CZ, patamares: R } = MONTE;
  const sol = (x0, x1, z0, z1, y1) => solidos.push({ x0, x1, z0: z0 + CZ, z1: z1 + CZ, y1 });
  const bloco = (w, h, d, cor, x, y, z, op) => { const m = caixa(w, h, d, mat(cor), op); m.position.set(x, y, z + CZ); grupo.add(m); return m; };
  const topo = (i) => H * (i + 1); // altura do tampo do patamar i (0..4)

  // ---------- patamares: pedra com um tampo de grama um nada maior (a borda verde aparece de longe)
  R.forEach((r, i) => {
    bloco(r * 2, H, r * 2, ROCHA[i % 3], 0, topo(i) - H / 2, 0);
    bloco(r * 2 + 0.3, 0.26, r * 2 + 0.3, GRAMA[i % 3], 0, topo(i) - 0.13, 0, { sombra: false });
    sol(-r, r, -r, r, topo(i));
  });

  // ---------- trilha: uma escadinha por patamar, dando a volta (sul → oeste → norte → leste → sul)
  // cada escada fica no patamar de baixo, encostada na parede do de cima: 8 degraus de 0,3 m × 0,8 m, 1,8 m de largura
  const LADOS = ["S", "O", "N", "L", "S"], POS = [-6, 4, 5, -5, -1]; // posição ao longo da parede (do meio); a do leste fica longe da cachoeira
  const N = 8, PASSO = H / N, FUNDO = 0.8, LARG = 1.8;
  R.forEach((r, i) => {
    const lado = LADOS[i], p = POS[i], base = i ? topo(i - 1) : 0;
    for (let k = 1; k <= N; k++) {
      const y1 = base + PASSO * k, a0 = p - (N * FUNDO) / 2 + FUNDO * (k - 1), a1 = a0 + FUNDO, cor = DEGRAU[k % 2];
      // (a, b): a = ao longo da parede, b = para fora da parede
      const b0 = r, b1 = r + LARG;
      const caixaDe = (x0, x1, z0, z1) => { bloco(x1 - x0, y1 - base, z1 - z0, cor, (x0 + x1) / 2, base + (y1 - base) / 2, (z0 + z1) / 2); sol(x0, x1, z0, z1, y1); };
      if (lado === "S") caixaDe(a0, a1, b0, b1);
      else if (lado === "N") caixaDe(-a1, -a0, -b1, -b0);
      else if (lado === "L") caixaDe(b0, b1, -a1, -a0);
      else caixaDe(-b1, -b0, a0, a1);
    }
  });

  // ---------- cachoeira (lado leste, z = −7): nasce no tampo do 3º patamar, cai e corre pelos patamares até o lago
  const ZC = -7, LA = 2.6;
  const agua = (w, h, d, x, y, z) => { const m = malha(new THREE.BoxGeometry(w, h, d), MAT_AGUA, { sombra: false }); m.position.set(x, y, z + CZ); grupo.add(m); return m; };
  // nascente: pedras e um olho d'água no tampo do patamar 2 (x de 10 a 13)
  agua(3.2, 0.3, LA + 0.6, R[2] - 1.6, topo(2) + 0.1, ZC);
  for (const [dx, dz, s] of [[-2.2, -1.9, 1.1], [-2.0, 1.9, 0.9], [-3.2, 0.4, 0.8]]) bloco(s, s, s, ROCHA[1], R[2] + dx, topo(2) + s / 2, ZC + dz);
  for (let i = 2; i >= 0; i--) {
    agua(0.6, H + 0.4, LA, R[i] + 0.3, topo(i) - H / 2 + 0.1, ZC); // queda pela parede do patamar i
    if (i > 0) agua(R[i - 1] - R[i] + 0.4, 0.24, LA, (R[i] + R[i - 1]) / 2 + 0.2, topo(i - 1) + 0.12, ZC); // corre pelo patamar de baixo
  }
  // lago no pé do morro, com borda de pedra (parede baixa: ninguém entra na água)
  const PX0 = R[0] + 0.4, PX1 = R[0] + 7.4, PZ0 = ZC - 4, PZ1 = ZC + 4;
  agua(PX1 - PX0, 0.5, PZ1 - PZ0, (PX0 + PX1) / 2, 0.25, (PZ0 + PZ1) / 2);
  for (const [x0, x1, z0, z1] of [[PX0 - 0.5, PX1 + 0.5, PZ0 - 0.5, PZ0], [PX0 - 0.5, PX1 + 0.5, PZ1, PZ1 + 0.5], [PX1, PX1 + 0.5, PZ0, PZ1]]) {
    bloco(x1 - x0, 0.7, z1 - z0, 0xb8aca0, (x0 + x1) / 2, 0.35, (z0 + z1) / 2); sol(x0, x1, z0, z1, 0.7);
  }
  sol(PX0, PX1, PZ0, PZ1, 0.6);

  // ---------- cruz iluminada no topo (pedestal de pedra; a cruz é do vidro dos postes: acende de noite)
  const T = topo(4);
  bloco(1.6, 0.5, 1.6, 0xb8aca0, 0, T + 0.25, 0); sol(-0.8, 0.8, -0.8, 0.8, T + 0.5);
  for (const [w, h, d, y] of [[0.5, 4.4, 0.5, T + 0.5 + 2.2], [2.6, 0.5, 0.5, T + 3.6]]) { const m = malha(new THREE.BoxGeometry(w, h, d), MAT.lampada); m.position.set(0, y, CZ); grupo.add(m); }
  // banquinho para sentar e olhar a cidade, e florzinhas no topo
  { const b = banco(); b.position.set(-2.6, T, CZ); b.rotation.y = Math.PI / 2; b.userData.detalhe = false; grupo.add(b); sol(-3.0, -2.2, -1.4, 1.4, T + 1.2); }
  // ---------- pedras nas bordas dos patamares e flores (as flores somem de longe: detalhe)
  const flores = new THREE.Group(); flores.userData.detalhe = true; grupo.add(flores);
  const FLOR = [0xff5fa2, 0xffcc1f, 0xffffff, 0x8e6cff];
  // (x, z) no quadro do centro do morro; livre = longe das escadas, pedras e da cachoeira (os patamares inteiros não contam)
  const livre = (x, z, folga = 1.2) => { const zw = z + CZ; return !solidos.some((s) => s.y1 > 0.7 && (s.x1 - s.x0 < 3 || s.z1 - s.z0 < 3) && x > s.x0 - folga && x < s.x1 + folga && zw > s.z0 - folga && zw < s.z1 + folga) && Math.abs(z - ZC) > 2.5; };
  R.forEach((r, i) => {
    const rPed = i < 4 ? R[i + 1] : 0; // o patamar de cima ocupa até rPed
    for (let k = 0; k < 10; k++) {
      // ponto na faixa do patamar (entre rPed e r), por fora: só na beirada externa
      const ang = rnd() * Math.PI * 2, d = r - 0.9 - rnd() * 0.6, x = Math.max(-r + 0.6, Math.min(r - 0.6, Math.cos(ang) * d * 1.42)), z = Math.max(-r + 0.6, Math.min(r - 0.6, Math.sin(ang) * d * 1.42));
      if (Math.max(Math.abs(x), Math.abs(z)) < rPed + 1.2 || !livre(x, z)) continue;
      if (k % 3 === 0) { const s = 0.7 + rnd() * 0.6; bloco(s, s, s, ROCHA[(i + k) % 3], x, topo(i) + s / 2 - 0.1, z); sol(x - s / 2, x + s / 2, z - s / 2, z + s / 2, topo(i) + s - 0.1); }
      else { const f = caixa(0.24, 0.24, 0.24, mat(FLOR[(i + k) % 4]), { sombra: false }); f.position.set(x, topo(i) + 0.14, z + CZ); flores.add(f); }
    }
  });
  // árvores nos dois patamares largos (cerejeiras e verdes), longe das escadas e da cachoeira
  for (const [x, z, esc, tipo] of [[-17, 17, 0.8, 2], [17, 17, 0.75, 7], [-17, -17, 0.8, 4], [17, -16, 0.7, 1], [-12, 12.5, 0.65, 9], [15, 14, 0.6, 3]]) {
    const m = Math.max(Math.abs(x), Math.abs(z)); let i = 0; while (i + 1 < R.length && m < R[i + 1] - 0.6) i++; // em cima de que patamar fica
    if (!livre(x, z, 2)) continue;
    const a = arvoreReal(esc, tipo); a.position.set(x, topo(i) - 0.05, z + CZ); a.rotation.y = rnd() * 6; grupo.add(a);
    sol(x - 0.45, x + 0.45, z - 0.45, z + 0.45, topo(i) + 6);
  }

  // ---------- placa de madeira na entrada, ao lado da primeira escada ("Monte da Oração")
  { const g = new THREE.Group(); g.position.set(POS[0] - 5.2, 0.07, 0.6);
    for (const s of [-1, 1]) { const p = malha(new THREE.CylinderGeometry(0.1, 0.12, 3.2, 8), mat(0x9a6232)); p.position.set(s * 2.6, 1.6, 0); g.add(p); }
    const pl = caixa(6, 1.3, 0.2, mat(0xf3c99a)); pl.position.y = 2.9; g.add(pl);
    const l = letreiro("Monte da Oração", 5.4, { cor: "#8e6cff" }); l.position.set(0, 2.9, 0.12); g.add(l);
    grupo.add(g); solidos.push({ x0: g.position.x - 2.8, x1: g.position.x + 2.8, z0: g.position.z - 0.3, z1: g.position.z + 0.3, y1: 0.6 }); }

  return { grupo, solidos, topo: [0, CZ], alturaTopo: T, entrada: [POS[0], 2.5] };
}
