// Rabiscolândia: a orla do Mar Azul (sul) e a Ilha da Alegria. O mar, a areia e a ilha são uma malha só para a cidade
// toda (ficam fora dos blocos: a neblina esconde o que está longe); píeres, coqueiros, guarda-sóis, o posto
// salva-vidas, o quiosque, o farol e a roda-gigante vão para o bloco de onde estão (mundo.js).
// Convenção igual à de predios.js: cada função devolve { grupo, solidos } (frente em z = 0 local, olhando para +z).
// A roda-gigante gira de verdade: o aro é um grupo à parte (dinâmico) e as 8 cabines são malhas instanciadas
// (4 chamadas de desenho para todas), sempre de pé; posCabine(i) diz onde está cada uma (o Rabisco anda nelas).

import { THREE, mat, malha, caixa, caixaRedonda, MAT, MAT_AGUA, TEX, letreiro, mesclar } from "./base3d.js";
import { cx as pc, viga, aro, geoCaixas, disco } from "./blocos.js";
import { aleatorio } from "../../src/motor3d/toon.js";
import { coqueiro, guardaSol } from "./predios.js";
import { MAR, ORLA, ILHA, PIERS, RODA } from "./mapa.js";

const rnd = aleatorio(9157); // semente própria: não mexe na ordem do resto da cidade
const novo = () => ({ grupo: new THREE.Group(), solidos: [] });

// ---------- mar, areia da orla e ilha (coordenadas do mundo)
// plano com o uv em metros: a textura da água fica do mesmo tamanho em qualquer pedaço
const emMetros = (w, d) => { const q = new THREE.PlaneGeometry(w, d), u = q.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * w, u.getY(i) * d); return q; };
export function marEAreia() {
  const g = new THREE.Group();
  const plano = (w, d, cor, x, z, y, extra = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(cor, extra)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m; };
  const largura = MAR.x1 - MAR.x0;
  TEX.agua.repeat.set(1 / 16, 1 / 16); // 16 m por repetição (o uv do mar vai em metros)
  const mar = plano(largura, MAR.z1 - MAR.costa, 0xffffff, (MAR.x0 + MAR.x1) / 2, (MAR.costa + MAR.z1) / 2, 0.0);
  mar.material = MAT_AGUA; mar.geometry = emMetros(largura, MAR.z1 - MAR.costa);
  mar.userData.dinamico = true; // material próprio (a água brilha um pouquinho de noite)
  plano(largura, ORLA.z1 - ORLA.z0 + 2, 0xf6e0a6, (MAR.x0 + MAR.x1) / 2, (ORLA.z0 + ORLA.z1) / 2, 0.04); // areia
  plano(largura, 6, 0x9fe6f5, (MAR.x0 + MAR.x1) / 2, MAR.costa + 3, 0.03); // água rasinha na beira
  plano(largura, 1.1, 0xf4fbff, (MAR.x0 + MAR.x1) / 2, MAR.costa + 0.5, 0.035); // espuma encostando na areia
  // ilha: água rasa, areia e grama no meio, em discos de pixels
  const anel = (r0, r1, cor, y, passo = 2) => { const m = new THREE.Mesh(disco(r1, { furo: r0, passo }), mat(cor)); m.rotation.x = -Math.PI / 2; m.position.set(ILHA.x, y, ILHA.z); m.receiveShadow = true; g.add(m); };
  anel(ILHA.r, ILHA.r + 6, 0x9fe6f5, 0.03);
  anel(0, ILHA.r, 0xf6e0a6, 0.05);
  anel(0, ILHA.r - 8, 0x67c957, 0.065);
  // (as ondinhas agora são da textura; os sorteios ficam, para coqueiros e guarda-sóis não mudarem de lugar)
  for (let i = 0; i < 40; i++) { const x = MAR.x0 + 40 + rnd() * (largura - 80), z = MAR.costa + 14 + rnd() * (MAR.z1 - MAR.costa - 30); if (Math.hypot(x - ILHA.x, z - ILHA.z) >= ILHA.r + 9) rnd(); }
  mesclar(g);
  return { grupo: g, mar };
}

// ---------- píer de madeira (deck rente ao chão para o Rabisco andar; postes só nas pontas, para os barcos encostarem)
export function pier(P) {
  const S = novo(), g = S.grupo;
  const comp = P.z1 - P.z0, w = P.x1 - P.x0, cx = (P.x0 + P.x1) / 2;
  const madeira = mat(0xc98a4b), escura = mat(0x9a6232);
  for (let z = P.z0, i = 0; z < P.z1 - 0.01; z += 1.2, i++) {
    const t = caixa(w, 0.12, 1.1, i % 2 ? madeira : escura, { sombra: false }); t.position.set(cx, 0.06, z + 0.6); g.add(t);
  }
  for (const x of [P.x0 + 0.2, P.x1 - 0.2]) for (const z of [P.z0 + 0.4, P.z1 - 0.4]) {
    const p = malha(new THREE.CylinderGeometry(0.16, 0.18, 1.4, 8), escura); p.position.set(x, 0.5, z); g.add(p);
    S.solidos.push({ x0: x - 0.2, x1: x + 0.2, z0: z - 0.2, z1: z + 0.2, y1: 1.2 });
  }
  // boia salva-vidas pendurada no poste da ponta
  const boia = malha(new THREE.TorusGeometry(0.45, 0.15, 8, 18), mat(0xff5a3c)); boia.position.set(P.x1 - 0.2, 0.9, P.z1 - 0.62); g.add(boia);
  void comp;
  return S;
}

// ---------- posto salva-vidas: torre de madeira listrada, com escadinha, bandeira e boias
export function postoSalvaVidas() {
  const S = novo(), g = S.grupo;
  const branco = mat(0xffffff), vermelho = mat(0xe8413c);
  for (const [x, z] of [[-1.8, -0.6], [1.8, -0.6], [-1.8, -4.2], [1.8, -4.2]]) { const p = malha(new THREE.CylinderGeometry(0.14, 0.16, 3, 8), branco); p.position.set(x, 1.5, z); g.add(p); }
  const piso = caixaRedonda(4.4, 0.25, 4.4, mat(0xc98a4b)); piso.position.set(0, 3, -2.4); g.add(piso);
  const cabine = caixaRedonda(3.4, 2, 3.2, branco); cabine.position.set(0, 4.1, -2.6); g.add(cabine);
  for (let i = 0; i < 3; i++) { const f = caixa(3.46, 0.3, 3.26, vermelho, { sombra: false }); f.position.set(0, 3.5 + i * 0.6, -2.6); g.add(f); }
  const janela = caixa(2.4, 0.8, 0.1, MAT.janela, { sombra: false }); janela.position.set(0, 4.5, -0.98); g.add(janela);
  const teto = malha(new THREE.ConeGeometry(2.9, 1.3, 4), vermelho); teto.rotation.y = Math.PI / 4; teto.position.set(0, 5.75, -2.6); g.add(teto);
  // escadinha na frente (enfeite: sobe-se pela história, não de verdade)
  for (let i = 0; i < 6; i++) { const d = caixa(1.2, 0.08, 0.3, mat(0xc98a4b), { sombra: false }); d.position.set(1.3, 0.45 + i * 0.45, 0.4 - i * 0.18); g.add(d); }
  const mastro = malha(new THREE.CylinderGeometry(0.06, 0.06, 3, 8), branco); mastro.position.set(-1.6, 7, -2.6); g.add(mastro);
  const band = malha(new THREE.PlaneGeometry(1.2, 0.8), mat(0xffcc1f, { side: THREE.DoubleSide }), { sombra: false }); band.position.set(-1, 8, -2.6); g.add(band);
  for (const x of [-0.9, 0.9]) { const b = malha(new THREE.TorusGeometry(0.4, 0.13, 8, 18), mat(0xff5a3c)); b.position.set(x, 4.3, -0.92); g.add(b); }
  const pl = letreiro("Salva-Vidas", 3.2, { cor: "#e8413c" }); pl.position.set(0, 5.35, -0.9); g.add(pl);
  S.solidos.push({ x0: -2, x1: 2, z0: -4.6, z1: -0.2, y1: 6 });
  return S;
}

// ---------- quiosque de água de coco: casinha redonda com teto de palha
export function quiosqueCoco() {
  const S = novo(), g = S.grupo;
  const base = malha(new THREE.CylinderGeometry(2.6, 2.8, 2.6, 16), mat(0xfff4e0)); base.position.set(0, 1.3, -3); g.add(base);
  const balcao = caixaRedonda(4.6, 0.3, 1, mat(0xc98a4b)); balcao.position.set(0, 1.3, -0.6); g.add(balcao);
  for (const x of [-2.2, 2.2]) { const p = malha(new THREE.CylinderGeometry(0.12, 0.12, 2.8, 8), mat(0x9a6232)); p.position.set(x, 1.4, -0.6); g.add(p); }
  const teto = malha(new THREE.ConeGeometry(4.2, 2.2, 12), mat(0xe8b25a)); teto.position.set(0, 3.9, -2.4); g.add(teto);
  for (let i = 0; i < 4; i++) { const c = malha(new THREE.SphereGeometry(0.3, 10, 8), mat(0x6fbf3a)); c.position.set(-1.4 + i * 0.9, 1.65, -0.6); g.add(c); }
  const pl = letreiro("Água de Coco", 3.6, { cor: "#3c9a4a" }); pl.position.set(0, 2.55, -0.25); g.add(pl);
  S.solidos.push({ x0: -2.9, x1: 2.9, z0: -5.8, z1: -0.1, y1: 20 });
  return S;
}

// ---------- farol da ilha: torre listrada com a luz que acende de noite
export function farol() {
  const S = novo(), g = S.grupo;
  for (let i = 0; i < 5; i++) { const t = malha(new THREE.CylinderGeometry(1.6 - (i + 1) * 0.15, 1.6 - i * 0.15, 2, 16), mat(i % 2 ? 0xe8413c : 0xffffff)); t.position.y = 1 + i * 2; g.add(t); }
  const sacada = malha(new THREE.CylinderGeometry(1.4, 1.4, 0.25, 16), mat(0x2f3440)); sacada.position.y = 10.1; g.add(sacada);
  const luz = malha(new THREE.CylinderGeometry(0.7, 0.7, 1.2, 12), MAT.lampada, { sombra: false }); luz.position.y = 10.8; g.add(luz);
  const teto = malha(new THREE.ConeGeometry(1, 1, 12), mat(0xe8413c)); teto.position.y = 11.9; g.add(teto);
  S.solidos.push({ x0: -1.6, x1: 1.6, z0: -1.6, z1: 1.6, y1: 20 });
  return S;
}

// ---------- roda-gigante de blocos: duas pernas em A, o aro de trechos retos com raios e luzinhas (gira) e 8 cabines de pé,
// abertas dos lados (o Rabisco senta dentro, sem mudar de tamanho). Centro local (0, 0); o aro gira no plano x-y.
export function rodaGigante() {
  const S = novo(), g = S.grupo;
  const { h, r, cabines: n } = RODA, azul = 0x2f6fc0, f = { sombra: false };
  for (const z of [-2.4, 2.4]) for (const x of [-6, 6]) { viga(g, [x, 0, z], [0, h, z * 0.5], 0.62, azul); pc(g, 1.4, 0.4, 1.4, 0x24568f, x, 0.2, z); S.solidos.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5, y1: 20 }); }
  for (const z of [-2.4, 2.4]) { viga(g, [-4.6, 3, z], [4.6, 3, z], 0.42, 0xffffff); viga(g, [-2.2, 8.6, z * 0.75], [2.2, 8.6, z * 0.75], 0.36, 0xffffff); }
  // plataforma de embarque (embaixo de onde as cabines passam)
  pc(g, 6.8, 0.3, 6.8, 0xf3c99a, 0, 0.15, 0, f); pc(g, 7.4, 0.14, 7.4, 0xd9a970, 0, 0.07, 0, f);
  S.solidos.push({ x0: -2.2, x1: 2.2, z0: -1.8, z1: 1.8, y1: 2.4 });
  // o aro (gira): dois anéis, raios, eixo e luzinhas
  const aroG = new THREE.Group(); aroG.position.set(0, h, 0); aroG.userData.dinamico = true; g.add(aroG);
  for (const z of [-1.2, 1.2]) {
    const anel = malha(aro(r, 0.46, 28), mat(0xec2e8c)); anel.position.z = z; aroG.add(anel);
    const meio = malha(aro(r * 0.55, 0.26, 16), mat(0xffcc1f)); meio.position.z = z; aroG.add(meio);
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; const c = pc(aroG, r, 0.15, 0.15, 0xffffff, (Math.cos(a) * r) / 2, (Math.sin(a) * r) / 2, z); c.rotation.z = a; }
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; pc(aroG, 0.3, 0.3, 0.3, 0, Math.cos(a) * (r + 0.36), Math.sin(a) * (r + 0.36), z, { ...f, material: MAT.lampada }); }
  }
  pc(aroG, 1.1, 1.1, 3.8, 0x2f3440, 0, 0, 0); pc(aroG, 1.7, 1.7, 0.3, 0xffcc1f, 0, 0, 1.95, f); pc(aroG, 1.7, 1.7, 0.3, 0xffcc1f, 0, 0, -1.95, f);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pc(aroG, 0.18, 0.18, 2.6, 0xffffff, Math.cos(a) * r, Math.sin(a) * r, 0); }
  mesclar(aroG);
  // cabines: meia parede de blocos, 4 colunas, teto em degraus e a haste que pendura no aro; uma instância por cabine
  const cores = [0xec2e8c, 0x00b5f0, 0xffcc1f, 0x58c43a, 0xff7a00, 0x8e6cff, 0x2ec4b6, 0xe8413c];
  const geoBalde = geoCaixas([[2.3, 0.95, 0.16, 0, -2.75, 1.07], [2.3, 0.95, 0.16, 0, -2.75, -1.07], [0.16, 0.95, 2.3, 1.07, -2.75, 0], [0.16, 0.95, 2.3, -1.07, -2.75, 0]]);
  const geoFundo = new THREE.BoxGeometry(2.1, 0.14, 2.1); geoFundo.translate(0, -3.2, 0);
  const geoTeto = geoCaixas([[2.5, 0.22, 2.5, 0, -1.2, 0], [1.8, 0.22, 1.8, 0, -0.98, 0], [1.0, 0.2, 1.0, 0, -0.77, 0]]);
  const geoColuna = new THREE.BoxGeometry(0.13, 1.2, 0.13);
  const balde = new THREE.InstancedMesh(geoBalde, mat(0xffffff), n);
  const teto = new THREE.InstancedMesh(geoTeto, mat(0xffffff), n);
  const fundo = new THREE.InstancedMesh(geoFundo, mat(0xf3c99a), n);
  const colunas = new THREE.InstancedMesh(geoColuna, mat(0xffffff), n * 5); // 4 colunas + a haste
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) { balde.setColorAt(i, c.setHex(cores[i % cores.length])); teto.setColorAt(i, c.setHex(cores[(i + 3) % cores.length])); }
  for (const m of [balde, teto, fundo, colunas]) { m.userData.dinamico = true; m.frustumCulled = false; m.castShadow = true; g.add(m); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), um = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  let giro = 0;
  // centro (ponto de pendurar) da cabine i, em coordenadas locais da roda-gigante
  const pivo = (i, out = new THREE.Vector3()) => { const a = giro + (i / n) * Math.PI * 2 - Math.PI / 2; return out.set(Math.cos(a) * r, h + Math.sin(a) * r, 0); };
  function girar(a) {
    giro = a; aroG.rotation.z = a;
    for (let i = 0; i < n; i++) {
      pivo(i, p);
      m4.compose(p, q, um); balde.setMatrixAt(i, m4); teto.setMatrixAt(i, m4); fundo.setMatrixAt(i, m4);
      [[0.8, 0.8], [-0.8, 0.8], [0.8, -0.8], [-0.8, -0.8], [0, 0]].forEach(([x, z], k) => { m4.compose(new THREE.Vector3(p.x + x * 1.3, p.y - (k === 4 ? 0.35 : 1.75), p.z + z * 1.3), q, k === 4 ? new THREE.Vector3(1, 0.6, 1) : um); colunas.setMatrixAt(i * 5 + k, m4); });
    }
    for (const m of [balde, teto, fundo, colunas]) m.instanceMatrix.needsUpdate = true;
  }
  girar(0);
  Object.assign(S, { aro: aroG, girar, pivo, piso: -3.14 }); // piso: altura do chão da cabine abaixo do pivô
  Object.defineProperty(S, "giro", { get: () => giro }); // quanto o aro já girou (rad)
  return S;
}

// ---------- enfeites da orla e da ilha (cada um vai para o bloco de onde está): [{ S, x, z, rot }]
export function enfeitesOrla(livre) {
  const itens = [];
  // coqueiros ao longo da areia (desviando do píer, do posto e do quiosque)
  for (let x = -385; x <= 385; x += 21) {
    const px = x + (rnd() - 0.5) * 6, pz = ORLA.z0 + 4 + rnd() * 3;
    if (!livre(px, pz, 4)) continue;
    const S = novo(); S.grupo.add(coqueiro(5.5 + rnd() * 2.5)); S.grupo.rotation.y = rnd() * 6; S.solidos.push({ x0: -0.4, x1: 0.4, z0: -0.4, z1: 0.4, y1: 6 });
    itens.push({ S, x: px, z: pz, rot: 0 });
  }
  // guarda-sóis perto da água
  const cores = [[0xec2e8c, 0xffffff], [0x00b5f0, 0xffffff], [0xffcc1f, 0xff7a00], [0x58c43a, 0xffffff], [0x8e6cff, 0xffffff]];
  for (let i = 0, x = -330; x <= 330; x += 48, i++) {
    const px = x + (rnd() - 0.5) * 10, pz = MAR.costa - 7 + rnd() * 2;
    if (!livre(px, pz, 5)) continue;
    const S = novo(); S.grupo.add(guardaSol(...cores[i % cores.length])); S.solidos.push({ x0: -0.15, x1: 0.15, z0: -0.15, z1: 0.15, y1: 3 });
    itens.push({ S, x: px, z: pz, rot: rnd() * 6 });
  }
  // ilha: coqueiros em volta, guarda-sóis e o farol
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2, px = ILHA.x + Math.cos(a) * (ILHA.r - 4), pz = ILHA.z + Math.sin(a) * (ILHA.r - 4);
    if (Math.abs(px) < 8 && pz < ILHA.z) continue; // a chegada do píer fica livre
    if (Math.hypot(px - 20, pz - 386) < 6) continue; // lugar do farol
    const S = novo(); S.grupo.add(coqueiro(5 + rnd() * 2.5)); S.grupo.rotation.y = rnd() * 6; S.solidos.push({ x0: -0.4, x1: 0.4, z0: -0.4, z1: 0.4, y1: 6 });
    itens.push({ S, x: px, z: pz, rot: 0 });
  }
  for (const [px, pz, k] of [[-16, 360, 0], [15, 358, 2], [-20, 378, 4]]) { const S = novo(); S.grupo.add(guardaSol(...cores[k])); S.solidos.push({ x0: -0.15, x1: 0.15, z0: -0.15, z1: 0.15, y1: 3 }); itens.push({ S, x: px, z: pz, rot: k }); }
  itens.push({ S: farol(), x: 20, z: 386, rot: 0 });
  return itens;
}
export { PIERS };
