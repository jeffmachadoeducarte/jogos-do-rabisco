// Rabiscolândia: monta a cidade 3D a partir de mapa.js, em 3 × 3 blocos de 100 m. Cada bloco é um grupo com tudo o
// que é fixo (prédios, casas, árvores, postes) mesclado por material; só o bloco do jogador e os vizinhos ficam
// visíveis (com a neblina em 140 m, o resto nem apareceria). Ruas, calçadas e o chão são de todos os blocos.
// Devolve as colisões (retângulos e círculos), os lugares, as casas, os semáforos e o que anima (água, patos, bichos).

import { THREE, mat, malha, caixa, TEX, fita, densificar, normais, arvoreReal, semaforo, mesclar, r as rnd } from "./base3d.js";
import { RUAS, CALCADA, distRua, LUGARES, LOTES, LOTE, PREDIOS, SEMAFOROS, PARQUE, LAGO, PLAYGROUND, PRACA, FAZENDA, CAMPO, ESPORTES, QUADRA, HORTA, PARQUINHO_BEBE, PATIO_KIDS2, HELIPONTO, PRAIA, LAGO2, NBLOCOS, VAGAS, LARGADA, PEGADAS_FIXAS, BORDA, BLOCO, blocoDe, pegadaDe } from "./mapa.js";
import * as P from "./predios.js";
import { casa } from "./casas.js";

// local (lx, lz) de um grupo girado em rot (múltiplos de 90°) → mundo (igual a cidade.js · mundoDe)
export const mundoDe = (ox, oz, rot, lx, lz) => [ox + lx * Math.cos(rot) + lz * Math.sin(rot), oz - lx * Math.sin(rot) + lz * Math.cos(rot)];
function retMundo(ox, oz, rot, s) {
  const cs = [[s.x0, s.z0], [s.x1, s.z0], [s.x1, s.z1], [s.x0, s.z1]].map(([x, z]) => mundoDe(ox, oz, rot, x, z));
  const xs = cs.map((c) => c[0]), zs = cs.map((c) => c[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), y1: s.y1 };
}

export function montarMundo(cena) {
  const solidos = [], circulos = [], lugares = [], casas = [], semaforos = [], anima = { patos: [], bichos: [], aguas: [], jatos: [] };
  const blocos = [];
  for (let i = 0; i < NBLOCOS; i++) for (let j = 0; j < NBLOCOS; j++) { const g = new THREE.Group(); g.userData.bloco = [i, j]; cena.add(g); blocos.push(g); }
  const blocoEm = (x, z) => { const [i, j] = blocoDe(x, z); return blocos[i * NBLOCOS + j]; };
  const ocupado = (x, z, folga = 0) => solidos.some((s) => x > s.x0 - folga && x < s.x1 + folga && z > s.z0 - folga && z < s.z1 + folga) || PEGADAS_FIXAS.some((s) => x > s.x0 - folga && x < s.x1 + folga && z > s.z0 - folga && z < s.z1 + folga);
  // põe um conjunto { grupo, solidos } com a frente em (ox, oz) girado em rot, no bloco certo
  const por = (S, ox, oz, rot, bloco = blocoEm(ox, oz)) => {
    S.grupo.position.set(ox, 0, oz); S.grupo.rotation.y = rot;
    bloco.add(S.grupo);
    for (const s of S.solidos) {
      if (s.circulo) { const [x, z] = mundoDe(ox, oz, rot, s.x, s.z); circulos.push({ x, z, r: s.r }); } else solidos.push(retMundo(ox, oz, rot, s));
    }
    return S;
  };

  // ---------- chão (grama) e morrinhos em volta
  TEX.grama.repeat.set(180, 180);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat(0xffffff, { map: TEX.grama }));
  chao.rotation.x = -Math.PI / 2; chao.position.y = -0.02; chao.receiveShadow = true;
  cena.add(chao);
  const morros = new THREE.Group();
  for (let n = 0; n < 22; n++) {
    const a = (n / 22) * Math.PI * 2, d = 330 + rnd() * 40;
    const m = malha(new THREE.SphereGeometry(40 + rnd() * 25, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat([0x6fc24a, 0x5cb43f, 0x7fd05a][n % 3]), { sombra: false, contorno: 0 });
    m.position.set(Math.cos(a) * d, -4, Math.sin(a) * d); m.scale.y = 0.5; morros.add(m);
  }
  cena.add(morros);
  mesclar(morros);

  // ---------- ruas: calçada, asfalto, faixa branca tracejada (fora dos cruzamentos)
  const ruas = new THREE.Group();
  const matAsfalto = mat(0xffffff, { map: TEX.asfalto, side: THREE.DoubleSide });
  const matCalcada = mat(0xffffff, { map: TEX.calcada, side: THREE.DoubleSide });
  const matLinha = new THREE.MeshToonMaterial({ map: TEX.linha, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  const dentroDeOutra = (rua, folga) => (x, z) => distRua(x, z, rua).d < folga;
  RUAS.forEach((rua, i) => {
    for (const s of [1, -1]) { const f = fita(rua.pts, rua.fechada, s * rua.w / 2, s * (rua.w / 2 + CALCADA), 0.07, matCalcada, 3, dentroDeOutra(rua, 0.3)); if (f) ruas.add(f); }
    const a = fita(rua.pts, rua.fechada, -rua.w / 2, rua.w / 2, 0.04 + i * 0.002, matAsfalto, 6); if (a) ruas.add(a);
    const l = fita(rua.pts, rua.fechada, -0.18, 0.18, 0.09, matLinha, 5, dentroDeOutra(rua, 2)); if (l) ruas.add(l);
  });
  // faixas de pedestre nos cruzamentos com semáforo
  const matFaixa = mat(0xffffff);
  for (const s of SEMAFOROS) {
    for (const lado of [-1, 1]) {
      const zc = s.z + lado * (s.wX / 2 + 1.8);
      for (let x = -s.wZ / 2 + 0.8; x <= s.wZ / 2 - 0.6; x += 1.35) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 3), matFaixa); l.rotation.x = -Math.PI / 2; l.position.set(s.x + x, 0.1, zc); ruas.add(l); }
      const xc = s.x + lado * (s.wZ / 2 + 1.8);
      for (let z = -s.wX / 2 + 0.8; z <= s.wX / 2 - 0.6; z += 1.35) { const l = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.8), matFaixa); l.rotation.x = -Math.PI / 2; l.position.set(xc, 0.1, s.z + z); ruas.add(l); }
    }
    const postes = [];
    const gs = new THREE.Group();
    for (const [sx, sz, rot] of [[1, 1, Math.PI], [-1, -1, 0], [1, -1, -Math.PI / 2], [-1, 1, Math.PI / 2]]) {
      const p = semaforo();
      p.position.set(s.x + sx * (s.wZ / 2 + 0.8), 0.07, s.z + sz * (s.wX / 2 + 0.8));
      p.rotation.y = rot;
      p.userData.eixo = rot === 0 || rot === Math.PI ? "z" : "x";
      gs.add(p); postes.push(p);
      solidos.push({ x0: p.position.x - 0.25, x1: p.position.x + 0.25, z0: p.position.z - 0.25, z1: p.position.z + 0.25, y1: 5 });
    }
    cena.add(gs);
    mesclar(gs); // só as luzes ficam separadas
    semaforos.push({ ...s, postes, fase: (s.x + s.z) % 200 ? 0 : 6 });
  }
  cena.add(ruas);
  mesclar(ruas);

  // ---------- lugares
  const fabrica = { igreja: P.igrejaReviver, hospital: P.hospital, bombeiros: P.bombeiros, biblioteca: P.biblioteca, mercado: P.mercado, padaria: P.padaria, sorveteria: P.sorveteria, kids1: P.educarteKids1, kids2: P.educarteKids2, veterinario: P.veterinario, lavarapido: P.lavaRapido, estudio: P.estudio, correios: P.correios, mirante: P.mirante };
  for (const l of LUGARES) {
    lugares.push({ ...l });
    const ox = l.x - l.dir[0] * l.recuo, oz = l.z - l.dir[1] * l.recuo;
    if (l.parceiro) {
      const s = { x0: 0, x1: 0, z0: 0, z1: 0, y1: 20 };
      solidos.push(s);
      const S = P.lojaDeParceiro(l, (w) => {
        const r = retMundo(ox, oz, l.rot, { x0: -w / 2 - 0.2, x1: w / 2 + 0.2, z0: -7.7, z1: 0.2, y1: 20 });
        Object.assign(s, r);
      });
      por(S, ox, oz, l.rot);
      continue;
    }
    if (fabrica[l.id]) {
      const S = por(fabrica[l.id](l), ox, oz, l.rot);
      if (S.foto) lugares.at(-1).fotoGrupo = S.foto;
    }
  }
  // praça (centro) e parque e fazendinha (em coordenadas do mundo)
  const pr = por(P.praca(PRACA.r), PRACA.x, PRACA.z, 0);
  anima.aguas.push(pr.agua); anima.jatos.push(pr.jato);
  const pq = por(P.parque(PARQUE, LAGO, PLAYGROUND), 0, 0, 0, blocoEm(LAGO.x, LAGO.z));
  anima.patos.push(...pq.patos); anima.aguas.push(pq.agua);
  const fz = por(P.fazendinha(LUGARES.find((l) => l.id === "fazendinha"), FAZENDA), 0, 0, 0, blocoEm((FAZENDA.x0 + FAZENDA.x1) / 2, (FAZENDA.z0 + FAZENDA.z1) / 2));
  anima.bichos.push(...fz.bichos);
  // esportes (sudeste) e quadra + horta (nordeste)
  const cp = por(P.campoFutebol(CAMPO, ESPORTES), 0, 0, 0, blocoEm(CAMPO.x, CAMPO.z));
  anima.bola = cp.bola;
  por(P.quadra(QUADRA), 0, 0, 0, blocoEm(QUADRA.x0, QUADRA.z0));
  por(P.hortaComunitaria(HORTA), 0, 0, 0, blocoEm(HORTA.x0, HORTA.z0));
  // bairros de fora: parquinho de bebê (Kids I), quadra da Kids II, heliponto e praia
  por(P.parquinhoBebe(PARQUINHO_BEBE), 0, 0, 0, blocoEm(PARQUINHO_BEBE.x0, PARQUINHO_BEBE.z0));
  por(P.quadra(PATIO_KIDS2), 0, 0, 0, blocoEm(PATIO_KIDS2.x0, PATIO_KIDS2.z0));
  por(P.heliponto(HELIPONTO), 0, 0, 0, blocoEm(HELIPONTO.x, HELIPONTO.z));
  const pr2 = por(P.praia(PRAIA, LAGO2), 0, 0, 0, blocoEm(LAGO2.x, LAGO2.z));
  anima.aguas.push(pr2.agua); anima.boias = pr2.boias;
  // placa da fazendinha e do parque na calçada
  for (const [id, cor] of [["fazendinha", "#d6402f"], ["parque", "#3c9a4a"], ["campo", "#2f6fc0"], ["praia", "#ff7a00"], ["heliponto", "#2f3440"]]) {
    const l = LUGARES.find((q) => q.id === id);
    const g = new THREE.Group();
    for (const s of [-1, 1]) { const p = malha(new THREE.CylinderGeometry(0.1, 0.12, 3.2, 8), mat(0x9a6232), { contorno: 0.03 }); p.position.set(s * 2.6, 1.6, 0); g.add(p); }
    const placaL = caixa(6, 1.3, 0.2, mat(0xf3c99a), { contorno: 0.05 }); placaL.position.y = 2.9; g.add(placaL);
    const txt = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.1), new THREE.MeshToonMaterial({ map: placaTexto(l.nome, cor), transparent: true, alphaTest: 0.4 }));
    txt.position.set(0, 2.9, 0.12); g.add(txt);
    const [dx, dz] = l.dir, lado = dz ? [1, 0] : [0, 1]; // ao lado da entrada, um pouco para dentro
    g.position.set(l.x + lado[0] * 7 - dx * 1.5, 0.07, l.z + lado[1] * 7 - dz * 1.5); g.rotation.y = l.rot;
    blocoEm(l.x, l.z).add(g);
    const sx = dz ? 2.8 : 0.3, sz = dz ? 0.3 : 2.8;
    solidos.push({ x0: g.position.x - sx, x1: g.position.x + sx, z0: g.position.z - sz, z1: g.position.z + sz, y1: 0.6 });
  }

  // ---------- Bairro das Casas
  for (const l of LOTES) {
    const ox = l.x - l.dir[0] * LOTE.recuo, oz = l.z - l.dir[1] * LOTE.recuo;
    const { grupo, solidos: sl } = casa(l);
    por({ grupo, solidos: sl }, ox, oz, l.rot);
    const [px, pz] = mundoDe(ox, oz, l.rot, ...grupo.userData.porta);
    casas.push({ lote: l, grupo, placa: grupo.userData.placa, porta: [px, pz], frente: [l.x, l.z] });
  }

  // ---------- prédios de enchimento
  for (const p of PREDIOS) {
    const S = P.predioEnchimento(p);
    // frente do prédio: meio da face que olha para dir
    const [dx, dz] = p.dir, deitado = Math.abs(dx) > 0.5;
    const meia = (deitado ? p.x1 - p.x0 : p.z1 - p.z0) / 2;
    por(S, p.cx + dx * meia, p.cz + dz * meia, p.rot);
  }

  // ---------- calçadas: postes de luz e árvores (desviam de tudo), canteiros com florzinhas
  for (const rua of RUAS) {
    const pts = densificar(rua.pts, rua.fechada, 11), ns = normais(pts, rua.fechada);
    pts.forEach(([x, z], i) => {
      for (const s of [1, -1]) {
        const lado = (i + (s > 0 ? 0 : 1)) % 2;
        const off = rua.w / 2 + CALCADA - 0.6;
        const ax = x + ns[i][0] * s * off, az = z + ns[i][1] * s * off;
        if (distRua(ax, az, rua).d < 3 || Math.abs(ax) > BORDA - 4 || Math.abs(az) > BORDA - 4) continue;
        if (ocupado(ax, az, 1.2) || SEMAFOROS.some((q) => Math.hypot(q.x - ax, q.z - az) < 12)) continue;
        if (LUGARES.some((l) => Math.hypot(l.x - ax, l.z - az) < 5) || LOTES.some((l) => Math.abs(l.x - ax) < 2 && Math.abs(l.z - az) < 3)) continue;
        if (Math.hypot(ax - LARGADA.x, az - LARGADA.z) < 6) continue;
        if (lado === 0) {
          const p = P.posteLuz(); p.position.set(ax, 0.07, az); blocoEm(ax, az).add(p);
          solidos.push({ x0: ax - 0.25, x1: ax + 0.25, z0: az - 0.25, z1: az + 0.25, y1: 5 });
        } else {
          const a = arvoreReal(0.8 + rnd() * 0.25, i); a.position.set(ax, 0.07, az); blocoEm(ax, az).add(a);
          solidos.push({ x0: ax - 0.45, x1: ax + 0.45, z0: az - 0.45, z1: az + 0.45, y1: 6 });
        }
      }
    });
  }
  // árvores e moitas nos terrenos vazios (enchem a cidade sem pesar)
  for (let n = 0; n < 560; n++) {
    const x = (rnd() - 0.5) * 2 * (BORDA - 6), z = (rnd() - 0.5) * 2 * (BORDA - 6);
    if (distRua(x, z).d < CALCADA + 2 || ocupado(x, z, 3) || Math.hypot(x - LARGADA.x, z - LARGADA.z) < 8) continue;
    if (VAGAS.some((v) => Math.hypot(v.x - x, v.z - z) < 9)) continue;
    if (rnd() < 0.7) {
      const a = arvoreReal(0.9 + rnd() * 0.6, n); a.position.set(x, 0.03, z); a.rotation.y = rnd() * 6; blocoEm(x, z).add(a);
      solidos.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5, y1: 6 });
    } else {
      const m = malha(new THREE.IcosahedronGeometry(0.9, 1), mat(0x5cc443), { contorno: 0.06, sombra: false }); m.scale.set(1.3, 0.8, 1.1); m.position.set(x, 0.5, z); m.userData.detalhe = true; blocoEm(x, z).add(m);
      for (let k = 0; k < 4; k++) { const f = malha(new THREE.IcosahedronGeometry(0.13, 0), mat([0xff5fa2, 0xffcc1f, 0xffffff][k % 3]), { sombra: false }); f.userData.detalhe = true; f.position.set(x + (rnd() - 0.5) * 2, 0.95 + rnd() * 0.2, z + (rnd() - 0.5) * 1.6); blocoEm(x, z).add(f); }
    }
  }

  // ---------- mescla cada bloco (o que é fixo vira poucas malhas)
  let malhas = 0;
  for (const b of blocos) malhas += mesclar(b);

  // retângulo de cada bloco (para a distância até o jogador)
  for (const g of blocos) { const [i, j] = g.userData.bloco; g.userData.ret = { x0: -BORDA + i * BLOCO, x1: -BORDA + (i + 1) * BLOCO, z0: -BORDA + j * BLOCO, z1: -BORDA + (j + 1) * BLOCO }; }
  const api = {
    solidos, circulos, lugares, casas, semaforos, anima, blocos, malhas,
    alcance: 140, // neblina: além disso não se vê nada
    contornoAte: 24, // contorno preto só nos blocos perto (de longe ele nem aparece e dobra os triângulos)
    detalheAte: 36, // flores, cercas, moitas e bancos só nos blocos perto
    // mostra só o bloco do jogador e os vizinhos que estão dentro da neblina; contorno só perto
    visibilidade(x, z) {
      const [bi, bj] = blocoDe(x, z);
      for (const g of blocos) {
        const [i, j] = g.userData.bloco, r = g.userData.ret;
        const d = Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));
        g.visible = (api.alcance > 1000 || (Math.abs(i - bi) <= 1 && Math.abs(j - bj) <= 1)) && d < api.alcance; // alcance enorme = foto de cima (tudo)
        const perto = d < api.contornoAte, det = d < api.detalheAte;
        if (g.userData.perto !== perto || g.userData.det !== det) {
          g.userData.perto = perto; g.userData.det = det;
          for (const m of g.children) if (m.userData.mesclada) m.visible = (!m.userData.contorno || perto) && (!m.userData.detalhe || det);
        }
      }
    },
    blocosVisiveis: () => blocos.filter((g) => g.visible).length,
    atualizar(dt, t) {
      for (const p of anima.patos) { p.a += p.v * dt; p.p.position.set(LAGO.x + Math.cos(p.a) * p.r, 0.12 + Math.sin(t * 3 + p.r) * 0.03, LAGO.z + Math.sin(p.a) * p.r); p.p.rotation.y = -p.a; }
      for (const j of anima.jatos) j.scale.y = 1 + Math.sin(t * 6) * 0.08;
      if (anima.boias) for (const [i, b] of anima.boias.entries()) b.position.y = 0.2 + Math.sin(t * 1.8 + i) * 0.08;
      if (anima.bola) { anima.bola.rotation.y = t * 0.6; anima.bola.position.y = 0.4 + Math.abs(Math.sin(t * 2.2)) * 0.5; }
      for (const b of anima.bichos) {
        const g = b.g, [ax, az] = b.alvo;
        const dx = ax - g.position.x, dz = az - g.position.z, d = Math.hypot(dx, dz);
        if (d < 0.3 || Math.random() < dt * 0.05) b.alvo = [b.x0 + Math.random() * (b.x1 - b.x0), b.z0 + Math.random() * (b.z1 - b.z0)];
        else if (Math.sin(t * 0.7 + b.fase) > -0.2) {
          g.position.x += (dx / d) * b.v * dt; g.position.z += (dz / d) * b.v * dt;
          g.rotation.y = Math.atan2(dx, dz);
          g.position.y = 0.03 + Math.abs(Math.sin(t * (b.tipo === "galinha" ? 14 : 6) + b.fase)) * (b.tipo === "galinha" ? 0.12 : 0.05);
        }
      }
    },
  };
  return api;
}

// texto de placa simples (nome do lugar)
function placaTexto(texto, cor) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 100;
  const x = c.getContext("2d");
  x.clearRect(0, 0, 512, 100);
  let tam = 66; x.font = `800 ${tam}px 'Baloo 2', sans-serif`;
  while (x.measureText(texto).width > 480) { tam -= 3; x.font = `800 ${tam}px 'Baloo 2', sans-serif`; }
  x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = cor; x.fillText(texto, 256, 54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
void pegadaDe;
