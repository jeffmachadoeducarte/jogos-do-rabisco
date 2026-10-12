// Uma página do Livro da Criação (ver paginas.js e cenarios.js). Monta o cenário de artesanato (feltro
// com costura, caixas de papelão) a partir da definição do cenário da página, as colisões e as coisas com
// que o Rabisco interage: bichinhos perdidos, objetos do portão, botão colorido da ponte de flores,
// estrelas escondidas, bandeirinhas, mecânicas da página (plataformas que andam, caixas de empurrar,
// placas que abrem cancelas, pedras que rolam, maré, bicho guia) e o personagem do fim.
// Unidade: o Rabisco tem 1,8 de altura. Ele anda para +z (para longe da câmera).

import { THREE, toon, peca, texturaCanvas, COR3D, aleatorio, carregarTextura } from "../../src/motor3d/toon.js";
import { arvore3D, nuvem3D, morro3D, flor3D, cerca3D, pilotoLapis, borracha3D, escola3D, ceuGradiente, nuvensLeves, chaoVariado, aguaOndulante, particulasAmbiente, balancar } from "../../src/motor3d/objetos.js";
import { decoracao } from "../rabisco-kart/pistas.js";
import { PAGINAS, CORES } from "./paginas.js";
import { cenarioDa } from "./cenarios.js";

// mantidos por compatibilidade (o jogo agora pergunta ao mundo: mundo.aguaEm(x, z))
export const LIMITES = { x0: -12, x1: 12, z0: -6, z1: 94 };
export const RIO = { z0: 36, z1: 42 };

// ---------- texturas de artesanato
function feltro(cor, { costura = true } = {}) {
  return texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = cor; c.fillRect(0, 0, w, h);
    const r = aleatorio(cor.length * 7);
    for (let i = 0; i < 900; i++) { c.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.07)"; c.fillRect(r() * w, r() * h, 2, 2); }
    if (costura) {
      c.strokeStyle = "rgba(255,255,255,0.75)"; c.lineWidth = 5; c.setLineDash([16, 12]);
      c.strokeRect(14, 14, w - 28, h - 28);
    }
  });
}
const texPapelao = texturaCanvas(256, 256, (c, w, h) => {
  c.fillStyle = "#c98b4f"; c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(90,50,20,0.25)"; c.lineWidth = 3;
  for (let x = 0; x < w; x += 14) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  c.fillStyle = "rgba(255,230,170,0.55)"; c.fillRect(0, h / 2 - 18, w, 36); // fita adesiva
  c.strokeStyle = "#151515"; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
});
const texAgua = texturaCanvas(256, 256, (c, w, h) => {
  c.fillStyle = "#3aa7f0"; c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(255,255,255,0.6)"; c.lineWidth = 6; c.lineCap = "round";
  for (let y = 20; y < h; y += 48) for (let x = (y / 48) % 2 ? 0 : 40; x < w; x += 90) { c.beginPath(); c.arc(x, y, 18, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
}, { repetir: true });
const texTabua = texturaCanvas(128, 128, (c, w, h) => {
  c.fillStyle = "#d9a066"; c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(90,50,20,0.5)"; c.lineWidth = 4;
  for (let y = 0; y < h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
}, { repetir: true });

// ---------- peças
function caixaPapelao(w, h, d, cor = null) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cor == null ? toon(0xffffff, { map: texPapelao }) : toon(cor));
  m.castShadow = m.receiveShadow = true;
  return m;
}
function ovelha() {
  const g = new THREE.Group();
  const corpo = new THREE.Group();
  for (const [x, y, z, r] of [[0, 0.62, 0, 0.42], [0.28, 0.66, 0.15, 0.3], [-0.28, 0.66, 0.15, 0.3], [0.25, 0.66, -0.22, 0.3], [-0.25, 0.66, -0.22, 0.3], [0, 0.9, 0, 0.3]]) {
    const b = peca(new THREE.IcosahedronGeometry(r, 1), 0xffffff, { contorno: 0.05 });
    b.position.set(x, y, z);
    corpo.add(b);
  }
  const cabeca = peca(new THREE.SphereGeometry(0.22, 14, 10), 0x3b3b3b, { contorno: 0.04 });
  cabeca.position.set(0, 0.82, 0.48);
  cabeca.scale.set(1, 1.1, 1.15);
  for (const x of [-0.08, 0.08]) {
    const olho = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), toon(0xffffff));
    olho.position.set(x, 0.06, 0.17);
    const pupila = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), toon(COR3D.tinta));
    pupila.position.z = 0.04;
    olho.add(pupila);
    cabeca.add(olho);
  }
  for (const x of [-0.2, 0.2]) {
    const orelha = peca(new THREE.SphereGeometry(0.09, 8, 6), 0x3b3b3b, { contorno: 0.03 });
    orelha.scale.set(1.6, 0.6, 0.8);
    orelha.position.set(x, 0.08, -0.02);
    cabeca.add(orelha);
  }
  const pernas = [];
  for (const [x, z] of [[-0.2, 0.22], [0.2, 0.22], [-0.2, -0.22], [0.2, -0.22]]) {
    const p = peca(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), 0x2b2b2b, { contorno: 0.03 });
    p.position.set(x, 0.2, z);
    corpo.add(p);
    pernas.push(p);
  }
  corpo.add(cabeca);
  g.add(corpo);
  g.userData = { corpo, cabeca, pernas };
  return g;
}
// Bichinhos das páginas: corpo, cabeça e detalhes simples no traço do Rabisco
export function bichinho(tipo) {
  if (tipo === "ovelha") return ovelha();
  const T = {
    pato: { corpo: 0xffffff, cabeca: 0xffffff, bico: COR3D.laranja, escala: 0.9 },
    pintinho: { corpo: COR3D.amarelo, cabeca: COR3D.amarelo, bico: COR3D.laranja, escala: 0.7 },
    coelho: { corpo: 0xf2f2f2, cabeca: 0xf2f2f2, orelhas: "longas", escala: 0.9 },
    porco: { corpo: 0xffb3c8, cabeca: 0xffb3c8, focinho: 0xff8fb0, escala: 1 },
    passaro: { corpo: COR3D.ciano, cabeca: COR3D.ciano, bico: COR3D.amarelo, escala: 0.75 },
    pinguim: { corpo: 0x2b2b2b, barriga: 0xffffff, cabeca: 0x2b2b2b, bico: COR3D.laranja, escala: 0.95, empe: true },
    camelo: { corpo: 0xd9a65a, cabeca: 0xd9a65a, corcova: true, escala: 1.05 },
    coruja: { corpo: 0x9a6232, barriga: 0xf3d9a4, cabeca: 0x9a6232, bico: COR3D.amarelo, olhosGrandes: true, escala: 0.85, empe: true },
  }[tipo];
  const g = new THREE.Group(), corpo = new THREE.Group();
  const tronco = peca(new THREE.SphereGeometry(0.42, 16, 12), T.corpo, { contorno: 0.05 });
  tronco.scale.set(T.empe ? 0.85 : 1, T.empe ? 1.2 : 0.85, T.empe ? 0.85 : 1.2);
  tronco.position.y = T.empe ? 0.55 : 0.5;
  corpo.add(tronco);
  if (T.barriga) { const b = peca(new THREE.SphereGeometry(0.3, 14, 10), T.barriga, { contorno: 0 }); b.position.set(0, 0.5, 0.18); b.scale.set(1, 1.3, 0.6); corpo.add(b); }
  if (T.corcova) { const c = peca(new THREE.SphereGeometry(0.25, 12, 10), T.corpo, { contorno: 0.04 }); c.position.set(0, 0.88, -0.05); corpo.add(c); }
  const cabeca = peca(new THREE.SphereGeometry(0.26, 14, 10), T.cabeca, { contorno: 0.04 });
  cabeca.position.set(0, T.empe ? 1.05 : 0.85, T.empe ? 0.05 : 0.42);
  for (const x of [-0.1, 0.1]) {
    const olho = new THREE.Mesh(new THREE.SphereGeometry(T.olhosGrandes ? 0.1 : 0.06, 10, 8), toon(0xffffff));
    olho.position.set(x, 0.06, 0.21);
    const pupila = new THREE.Mesh(new THREE.SphereGeometry(T.olhosGrandes ? 0.05 : 0.03, 8, 6), toon(COR3D.tinta));
    pupila.position.z = T.olhosGrandes ? 0.07 : 0.04;
    olho.add(pupila);
    cabeca.add(olho);
  }
  if (T.bico) { const b = peca(new THREE.ConeGeometry(0.08, 0.2, 8), T.bico, { contorno: 0.02 }); b.rotation.x = Math.PI / 2; b.position.set(0, -0.03, 0.3); cabeca.add(b); }
  if (T.focinho) { const f = peca(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), T.focinho, { contorno: 0.02 }); f.rotation.x = Math.PI / 2; f.position.set(0, -0.04, 0.26); cabeca.add(f); }
  if (T.orelhas === "longas") for (const x of [-0.09, 0.09]) { const o = peca(new THREE.CapsuleGeometry(0.06, 0.32, 4, 8), T.cabeca, { contorno: 0.02 }); o.position.set(x, 0.36, -0.02); cabeca.add(o); }
  const pernas = [];
  for (const [x, z] of T.empe ? [[-0.15, 0.05], [0.15, 0.05]] : [[-0.2, 0.22], [0.2, 0.22], [-0.2, -0.22], [0.2, -0.22]]) {
    const p = peca(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), T.bico ?? 0x2b2b2b, { contorno: 0.02 });
    p.position.set(x, 0.15, z);
    corpo.add(p);
    pernas.push(p);
  }
  corpo.add(cabeca);
  g.add(corpo);
  g.scale.setScalar(T.escala);
  g.userData = { corpo, cabeca, pernas };
  return g;
}

// Objetos do portão (no lugar das sementes do Jardim)
function itemDoPortao(tipo) {
  if (tipo === "semente") return semente();
  const g = new THREE.Group();
  const T = {
    concha: [new THREE.ConeGeometry(0.25, 0.4, 10), 0xffb3c8], maca: [new THREE.SphereGeometry(0.24, 14, 10), COR3D.vermelho],
    noz: [new THREE.SphereGeometry(0.22, 12, 10), 0x9a6232], cenoura: [new THREE.ConeGeometry(0.14, 0.5, 10), COR3D.laranja],
    pena: [new THREE.CapsuleGeometry(0.07, 0.4, 4, 8), COR3D.ciano], floco: [new THREE.IcosahedronGeometry(0.24, 0), 0xffffff],
    gota: [new THREE.SphereGeometry(0.22, 14, 10), 0x3aa7f0], estrelinha: [new THREE.OctahedronGeometry(0.26, 0), COR3D.amarelo],
    livro: [new THREE.BoxGeometry(0.4, 0.5, 0.14), COR3D.rosa],
  }[tipo];
  const m = peca(T[0], T[1], { contorno: 0.04 });
  if (tipo === "cenoura") m.rotation.z = Math.PI;
  if (tipo === "pena") m.rotation.z = 0.6;
  g.add(m);
  if (tipo === "maca" || tipo === "cenoura") { const f = peca(new THREE.SphereGeometry(0.08, 8, 6), COR3D.verde, { contorno: 0.02 }); f.scale.set(1.6, 0.5, 0.8); f.position.y = tipo === "maca" ? 0.26 : 0.3; g.add(f); }
  return g;
}

function semente() {
  const g = new THREE.Group();
  const s = peca(new THREE.SphereGeometry(0.22, 14, 10), 0x9a6232, { contorno: 0.04 });
  s.scale.set(0.8, 1.15, 0.8);
  const broto = peca(new THREE.SphereGeometry(0.1, 8, 6), COR3D.verde, { contorno: 0.03 });
  broto.scale.set(1.6, 0.5, 0.8);
  broto.position.set(0.08, 0.28, 0);
  g.add(s, broto);
  return g;
}
function estrela3D() {
  const forma = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.2 : 0.46, a = (i / 10) * Math.PI * 2 + Math.PI / 2; forma[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); }
  const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.14, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 });
  geo.center();
  return peca(geo, COR3D.amarelo, { contorno: 0.05 });
}
function bandeira() {
  const g = new THREE.Group();
  const mastro = peca(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), COR3D.amarelo, { contorno: 0.03 });
  mastro.position.y = 1.2;
  const madeira = peca(new THREE.ConeGeometry(0.08, 0.22, 6), COR3D.madeira, { contorno: 0.02 });
  madeira.position.y = 2.51;
  const pano = peca(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.9, -0.3, 0), new THREE.Vector3(0, -0.6, 0)]), COR3D.rosa, { contorno: 0 });
  pano.geometry.computeVertexNormals();
  pano.material = toon(0xbdbdbd, { side: THREE.DoubleSide });
  pano.position.set(0.08, 1.0, 0);
  g.add(mastro, madeira, pano);
  g.userData.pano = pano;
  return g;
}
// placa redonda de pisar (botão da ponte e interruptores das cancelas)
function placaDePisar(cor) {
  const g = new THREE.Group();
  const base = peca(new THREE.CylinderGeometry(0.7, 0.8, 0.2, 20), 0x9aa3ad, { contorno: 0.04 });
  base.position.y = 0.1;
  const capa = peca(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 20), cor, { contorno: 0.04 });
  capa.position.y = 0.3;
  g.add(base, capa);
  g.userData.capa = capa;
  return g;
}

export function montarPagina(cena, cores, P = PAGINAS[0]) {
  const C = P.cenario ?? cenarioDa(P.id);
  const L = C.limites;
  const caixas = [];     // colisores: { x0, x1, y0, y1, z0, z1, ativo }
  const cilindros = [];  // árvores e pedras: { x, z, r }
  const solido = (x0, x1, y0, y1, z0, z1) => { const c = { x0, x1, y0, y1, z0, z1, ativo: true }; caixas.push(c); return c; };
  const r = aleatorio(31);
  const dentro = (q, x, z) => x >= q.x0 && x < q.x1 && z >= q.z0 && z < q.z1;
  // altura do terreno num ponto (os terraços da montanha): os objetos ficam em cima
  const alt = (x, z) => C.terracos.reduce((h, [x0, x1, z0, z1, th]) => (x >= x0 && x < x1 && z >= z0 && z < z1 ? Math.max(h, th) : h), 0);
  const semChao = (x, z) => C.agua.some((q) => dentro(q, x, z)) || C.buracos.some((q) => dentro(q, x, z));
  // um ladrilho 4x4 some se encostar em água/vazio: nunca fica chão desenhado onde a física diz "água"
  const toca = (q, x0, x1, z0, z1) => x0 < q.x1 && x1 > q.x0 && z0 < q.z1 && z1 > q.z0;
  const ladrilhoSome = (x0, z0) => [...C.agua, ...C.buracos].some((q) => toca(q, x0, x0 + 4, z0, z0 + 4));
  const mare = C.mare ? { rects: C.mare.rects, periodo: C.mare.periodo, alta: false, nivel: 0, malhas: [] } : null;
  const aguaEm = (x, z) => semChao(x, z) || (mare?.alta && mare.rects.some((q) => dentro(q, x, z)));
  const animados = []; // coisas com userData.atualizar(dt, t)

  // ---------- céu em degradê, sol, nuvens leves e partículas do tema (efeitos baratos do motor3d)
  const ceu = ceuGradiente({ topo: P.ceu[0], horizonte: P.ceu[1], raio: 190, sol: P.noite ? { cor: 0xfff6d0, posicao: [-60, 80, 140], raio: 6 } : { cor: 0xfff1a8, posicao: [70, 90, 150], raio: 9 } });
  ceu.position.set(0, 0, (L.z0 + L.z1) / 2);
  cena.add(ceu);
  const nuvens = nuvensLeves(P.id === "ceu" ? 16 : 10, { raio: 110, altura: P.id === "ceu" ? [-6, 30] : [18, 30], escala: 1.3, semente: 3 });
  nuvens.position.set(0, 0, (L.z0 + L.z1) / 2);
  cena.add(nuvens);
  animados.push(nuvens);
  const particulas = { neve: [160, 0xffffff, 0.16, 0.9], noite: [70, 0xfff07a, 0.14, 0.15], pomar: [40, 0xfff3b0, 0.1, 0.25], mar: [30, 0xffffff, 0.08, 0.6] }[P.id];
  if (particulas) {
    const [n, cor, tam, vel] = particulas;
    const pts = particulasAmbiente(n, { cor, tamanho: tam, area: [L.x1 - L.x0 + 10, P.id === "noite" ? 3 : 14, L.z1 - L.z0], velocidade: vel, semente: 9 });
    pts.position.set(0, P.id === "noite" ? 0.6 : 0, L.z0);
    cena.add(pts);
    animados.push(pts);
  }

  // ---------- chão de feltro em ladrilhos (o caminho é bege, a grama verde; água e buracos ficam vazios)
  const texGrama = feltro(P.chao.grama), texCaminho = feltro(P.chao.caminho), texMolhado = feltro(P.chao.margem, { costura: false });
  const geoLad = new THREE.BoxGeometry(4, 0.6, 4);
  for (let z = L.z0; z < L.z1; z += 4) for (let x = L.x0; x < L.x1; x += 4) {
    const cx = x + 2, cz = z + 2;
    if (ladrilhoSome(x, z)) continue;
    const naMare = mare && mare.rects.some((q) => toca(q, x, x + 4, z, z + 4));
    const lad = new THREE.Mesh(geoLad, toon(0xffffff, { map: naMare ? texMolhado : C.caminho(cx, cz) ? texCaminho : texGrama }));
    lad.position.set(cx, -0.3, cz);
    lad.receiveShadow = true;
    cena.add(lad);
    cores.registrar(lad, { raio: 7, som: false });
  }
  // terraços (montanha): blocos de feltro com colisão; dá para subir pulando (até 1,2 de degrau)
  for (const [x0, x1, z0, z1, h] of C.terracos) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h + 0.6, z1 - z0), toon(0xffffff, { map: texGrama }));
    b.position.set((x0 + x1) / 2, h / 2 - 0.3, (z0 + z1) / 2);
    b.receiveShadow = b.castShadow = true;
    cena.add(b);
    cores.registrar(b, { raio: 9, som: false, centro: new THREE.Vector3((x0 + x1) / 2, h, z0) });
    solido(x0, x1, -1, h, z0, z1);
  }
  // margem além das cercas (chão com cor variada por vértice) e morros ao fundo
  if (C.morros || C.agua.length) {
    const margem = chaoVariado(220, 240, { cor: new THREE.Color(P.chao.margem).getHex(), variacao: 0.1, segmentos: 20, semente: 5 });
    margem.position.set(0, -0.62, (L.z0 + L.z1) / 2);
    cena.add(margem);
  }
  if (C.morros) for (let i = 0; i < 14; i++) {
    const m = morro3D(14 + r() * 10, P.morros[i % 2]);
    const lado = i % 2 ? 1 : -1;
    m.position.set(lado * (34 + r() * 16), -0.6, -10 + i * 9);
    cena.add(m);
    cores.registrar(m, { raio: 26, som: false });
  }
  // cercas nas laterais (com colisão); sem cercas, as laterais são paredes invisíveis
  for (const x of [L.x0, L.x1]) {
    if (C.cercas) for (let z = L.z0; z < L.z1; z += 10) {
      if (semChao(x < 0 ? x + 1 : x - 1, z + 5)) continue;
      const c = cerca3D(Math.min(10, L.z1 - z));
      c.rotation.y = -Math.PI / 2; c.position.set(x, alt(x < 0 ? x + 1 : x - 1, z + 5), z);
      cena.add(c);
      cores.registrar(c, { raio: 7, som: false, centro: new THREE.Vector3(x, 0, z + 5) });
    }
    solido(x - (x < 0 ? 2 : 0), x + (x > 0 ? 2 : 0), -5, 12, L.z0, L.z1);
  }
  solido(L.x0, L.x1, -5, 12, L.z0 - 2, L.z0);
  solido(L.x0, L.x1, -5, 12, L.z1, L.z1 + 2);

  // ---------- água: um plano ondulante embaixo de tudo aparece onde os ladrilhos faltam
  const aguaMalhas = [];
  if (C.agua.length || mare) {
    const a = aguaOndulante(L.x1 - L.x0 + 8, L.z1 - L.z0 + 8, { cor: 0xffffff, segmentos: 18, amplitude: 0.05, textura: texAgua });
    texAgua.repeat.set(6, 12);
    a.position.set((L.x0 + L.x1) / 2, -0.5, (L.z0 + L.z1) / 2);
    cena.add(a);
    aguaMalhas.push(a);
    // a água ganha cor assim que o Rabisco dá os primeiros passos (um plano só para a página inteira)
    cores.registrar(a, { raio: 8, centro: new THREE.Vector3(C.inicio[0], 0, C.inicio[1] + 6) });
  }
  if (mare) for (const q of mare.rects) {
    const a = aguaOndulante(q.x1 - q.x0, q.z1 - q.z0, { cor: 0x7fd6ff, segmentos: 8, amplitude: 0.04 });
    a.position.set((q.x0 + q.x1) / 2, -0.5, (q.z0 + q.z1) / 2);
    cena.add(a);
    mare.malhas.push(a);
    aguaMalhas.push(a);
  }

  // ---------- natureza: árvores, flores e pedras
  const arvores = []; // a câmera esconde a árvore que ficar na frente do Rabisco
  const novaArvore = (e) => {
    if (P.arvore === "arvore") return arvore3D(e);
    if (P.arvore === "nuvem") { const n = new THREE.Group(); const nv = nuvem3D(0.16 * e / 0.32); nv.position.y = 2.6; const haste = peca(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), 0xffffff, { contorno: 0.03 }); haste.position.y = 1.3; n.add(haste, nv); return n; }
    const d = decoracao(P.arvore, r);
    d.scale.setScalar(0.27 * e / 0.32);
    return d;
  };
  const arvore = (x, z, e = 0.32) => { const a = novaArvore(e);
    if (P.frutas && P.arvore === "arvore") for (let k = 0; k < 6; k++) { const f = peca(new THREE.SphereGeometry(0.75, 10, 8), k % 2 ? COR3D.vermelho : COR3D.laranja, { contorno: 0.15 }); f.position.set((r() - 0.5) * 6, 6.5 + r() * 3, (r() - 0.5) * 6); a.add(f); } a.position.set(x, alt(x, z), z); a.rotation.y = r() * 6; cena.add(a); cores.registrar(a, { raio: 7.5 }); cilindros.push({ x, z, r: 0.9 * e / 0.32 }); arvores.push(a); return a; };
  const flores = (x, z, n = 7, cor = null) => {
    const coresFlor = P.flores.map((c) => CORES[c]);
    for (let i = 0; i < n; i++) {
      const f = flor3D(cor ?? coresFlor[Math.floor(r() * coresFlor.length)]);
      f.scale.setScalar(1.6 + r() * 0.8);
      const fx = x + (r() - 0.5) * 3, fz = z + (r() - 0.5) * 3;
      f.position.set(fx, alt(fx, fz), fz);
      cena.add(f);
      cores.registrar(f, { raio: 6 });
    }
  };
  const pedra = (x, z, s = 1) => { const p = peca(new THREE.DodecahedronGeometry(0.6 * s, 0), 0x9aa3ad, { contorno: 0.06 }); p.position.set(x, alt(x, z) + 0.3 * s, z); p.scale.y = 0.7; cena.add(p); cores.registrar(p, { raio: 4.5 }); cilindros.push({ x, z, r: 0.6 * s }); };
  for (const [x, z, e] of C.arvores) arvore(x, z, e);
  for (const [x, z] of C.flores) flores(x, z);
  for (const [x, z, s] of C.pedras) pedra(x, z, s);

  // ---------- caixas de papelão (plataformas), pontes de tábuas, pedras do lago, muros e casas
  const plataforma = (x, z, w, h, d, cor = null) => {
    const y = alt(x, z);
    const c = caixaPapelao(w, h, d, cor);
    c.position.set(x, y + h / 2, z);
    cena.add(c);
    cores.registrar(c, { raio: 5 });
    solido(x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2);
    return c;
  };
  for (const [x, z, w, h, d] of C.plataformas) plataforma(x, z, w, h, d, P.arvore === "nuvem" ? 0xffffff : null);
  for (const [x, z0, z1] of C.tabuas ?? []) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, z1 - z0), toon(0xffffff, { map: texTabua }));
    texTabua.repeat.set(1, (z1 - z0) / 2);
    t.position.set(x, 0.15, (z0 + z1) / 2);
    t.castShadow = t.receiveShadow = true;
    cena.add(t);
    cores.registrar(t, { raio: 6, centro: new THREE.Vector3(x, 0, z0) });
    solido(x - 1.2, x + 1.2, -1, 0.3, z0, z1);
  }
  for (const [x, z] of C.pedrasLago ?? []) {
    const p = peca(new THREE.CylinderGeometry(1.1, 1.4, 0.9, 7), 0x9aa3ad, { contorno: 0.06 });
    p.position.set(x, -0.15, z);
    cena.add(p);
    cores.registrar(p, { raio: 4 });
    solido(x - 1, x + 1, -1, 0.3, z - 1, z + 1);
  }
  for (const [x0, x1, z0, z1, h, cor, telhado] of C.muros) {
    const y = alt((x0 + x1) / 2, (z0 + z1) / 2);
    const tex = feltro("#" + new THREE.Color(cor).getHexString(), { costura: !telhado });
    const m = peca(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), 0xffffff, { contorno: 0.08, extra: { map: tex } });
    m.position.set((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2);
    cena.add(m);
    if (telhado) {
      const t = peca(new THREE.ConeGeometry(Math.max(x1 - x0, z1 - z0) * 0.78, h * 0.55, 4), COR3D.vermelho, { contorno: 0.08 });
      t.rotation.y = Math.PI / 4;
      t.position.set((x0 + x1) / 2, y + h + h * 0.27, (z0 + z1) / 2);
      cena.add(t);
      cores.registrar(t, { raio: 8 });
      const porta = peca(new THREE.BoxGeometry(0.2, 1.8, 1.1), COR3D.madeira, { contorno: 0.04 });
      porta.position.set(x0 < 0 ? x1 : x0, y + 0.9, (z0 + z1) / 2); // porta virada para o caminho
      cena.add(porta);
    }
    cores.registrar(m, { raio: 8, centro: new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2) });
    solido(x0, x1, y - 1, y + h, z0, z1);
  }

  // ---------- plataformas que andam, caixas de empurrar, pedras que rolam
  const moveis = C.moveis.map((m) => {
    const g = plataforma(m.x, m.z, m.w, m.h, m.d, P.arvore === "nuvem" ? 0xffffff : null);
    return { g, caixa: caixas[caixas.length - 1], ...m, y: alt(m.x, m.z), fase: r() * 6 };
  });
  const empurraveis = C.empurraveis.map(([x, z, s]) => {
    const g = plataforma(x, z, s, s, s);
    return { g, caixa: caixas[caixas.length - 1], s };
  });
  const rolantes = C.rolantes.map((o) => {
    const g = peca(new THREE.SphereGeometry(o.r, 12, 10), P.id === "neve" ? 0xffffff : 0x8a8f99, { contorno: 0.08 });
    const y = alt(o.x, o.z) + o.r;
    g.position.set(o.x, y, o.z);
    cena.add(g);
    cores.registrar(g, { raio: 6 });
    return { g, ...o, y, dir: 1 };
  });

  // ---------- cancelas (cerca de lado a lado com uma portinha) e as placas que as abrem
  const cancelas = (C.cancelas ?? []).map((k) => {
    const y = alt(0, k.z);
    if (!k.soMeio) for (const [x0, x1] of [[L.x0, k.abre[0]], [k.abre[1], L.x1]]) {
      const c = cerca3D(x1 - x0);
      c.position.set(x0, y, k.z);
      cena.add(c);
      cores.registrar(c, { raio: 7, som: false, centro: new THREE.Vector3((x0 + x1) / 2, 0, k.z) });
      solido(x0, x1, y, y + 3, k.z - 0.3, k.z + 0.3);
    }
    const g = new THREE.Group();
    const porta = cerca3D(k.abre[1] - k.abre[0]);
    porta.position.x = k.abre[0];
    g.add(porta);
    for (const x of k.abre) { const p = peca(new THREE.CylinderGeometry(0.16, 0.16, 1.8, 8), 0xc87a3c, { contorno: 0.04 }); p.position.set(x, 0.9, 0); g.add(p); }
    g.position.set(0, y, k.z);
    cena.add(g);
    cores.registrar(g, { raio: 6, centro: new THREE.Vector3((k.abre[0] + k.abre[1]) / 2, 0, k.z) });
    return { g, y, caixa: solido(k.abre[0], k.abre[1], y, y + 3, k.z - 0.3, k.z + 0.3), aberta: false, abrindo: 0 };
  });
  const interruptores = C.interruptores.map((i) => {
    const g = placaDePisar(COR3D.verde);
    const y = alt(i.x, i.z);
    g.position.set(i.x, y, i.z);
    cena.add(g);
    cores.registrar(g, { raio: 5 });
    return { g, y, cancela: cancelas[i.cancela], apertado: false };
  });

  // ---------- portão (fecha o caminho até receber os 3 objetos)
  const zPortao = C.portao.z, xPortao = C.portao.x, yPortao = alt(xPortao, zPortao);
  const cercaPortao = C.portao.cerca ?? [L.x0, L.x1];
  for (const [x0, x1] of [[cercaPortao[0], xPortao - 3], [xPortao + 3, cercaPortao[1]]]) {
    if (x1 - x0 < 0.6) continue;
    const c = cerca3D(x1 - x0);
    c.position.set(x0, yPortao, zPortao);
    cena.add(c);
    cores.registrar(c, { raio: 7, som: false, centro: new THREE.Vector3((x0 + x1) / 2, 0, zPortao) });
    solido(x0, x1, yPortao, yPortao + 3, zPortao - 0.3, zPortao + 0.3);
  }
  const portao = new THREE.Group();
  portao.position.set(xPortao, yPortao, zPortao);
  const folhas = [];
  for (const lado of [-1, 1]) {
    const dobradica = new THREE.Group();
    dobradica.position.x = lado * 3;
    const folha = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const ripa = peca(new THREE.BoxGeometry(0.5, 1.6, 0.14), 0xe2914f, { contorno: 0.04 });
      ripa.position.set(-lado * (0.35 + i * 0.58), 0.85, 0);
      folha.add(ripa);
    }
    const trave = peca(new THREE.BoxGeometry(3, 0.16, 0.18), 0xc87a3c, { contorno: 0.04 });
    trave.position.set(-lado * 1.5, 1.2, 0.05);
    folha.add(trave);
    dobradica.add(folha);
    portao.add(dobradica);
    folhas.push(dobradica);
  }
  // placa com três encaixes para os objetos (sem números: a criança vê os buracos vazios)
  const placa = peca(new THREE.BoxGeometry(3.2, 1.1, 0.2), 0xf3d9a4, { contorno: 0.05 });
  placa.position.set(0, 2.6, 0);
  const postes = [-3.2, 3.2].map((x) => { const p = peca(new THREE.CylinderGeometry(0.16, 0.16, 3.2, 8), 0xc87a3c, { contorno: 0.04 }); p.position.set(x, 1.6, 0); return p; });
  portao.add(placa, ...postes);
  const encaixes = [-1, 0, 1].map((k) => {
    const buraco = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), toon(0x6b4423));
    buraco.position.set(k * 0.95, 2.6, -0.11);
    buraco.rotation.y = Math.PI;
    portao.add(buraco);
    return buraco;
  });
  cena.add(portao);
  cores.registrar(portao, { raio: 7 });
  const caixaPortao = solido(xPortao - 3, xPortao + 3, yPortao, yPortao + 3, zPortao - 0.3, zPortao + 0.3);

  // ---------- botão da cor e a ponte de flores (atravessa a água ou o vazio)
  const [bx, bz] = C.botao, by = alt(bx, bz);
  const botao = placaDePisar(CORES[P.botao]);
  botao.position.set(bx, by, bz);
  cena.add(botao);
  cores.registrar(botao, { raio: 5 });
  const ponte = new THREE.Group();
  const petalas = [];
  const PT = C.ponte, yPonte = PT.y ?? alt(PT.x, PT.z0 - 1), nPet = Math.max(2, Math.round((PT.z1 - PT.z0) / 1.5));
  for (let i = 0; i < nPet; i++) {
    const vitoria = new THREE.Group();
    const folha = peca(new THREE.CylinderGeometry(1.5, 1.5, 0.18, 18), COR3D.verde, { contorno: 0.05 });
    vitoria.add(folha);
    for (let k = 0; k < 6; k++) {
      const pet = peca(new THREE.SphereGeometry(0.42, 10, 8), CORES[P.botao], { contorno: 0.04 });
      const a = (k / 6) * Math.PI * 2;
      pet.scale.set(1, 0.4, 1.6);
      pet.position.set(Math.cos(a) * 0.7, 0.2, Math.sin(a) * 0.7);
      pet.rotation.y = -a;
      vitoria.add(pet);
    }
    const miolo = peca(new THREE.SphereGeometry(0.35, 12, 8), COR3D.amarelo, { contorno: 0.04 });
    miolo.position.y = 0.3;
    vitoria.add(miolo);
    vitoria.position.set(PT.x, yPonte - 0.4, PT.z0 + 0.75 + i * ((PT.z1 - PT.z0) / nPet));
    vitoria.scale.setScalar(0.001);
    ponte.add(vitoria);
    petalas.push(vitoria);
  }
  cena.add(ponte);
  const caixaPonte = solido(PT.x - 1.6, PT.x + 1.6, yPonte - 1, yPonte, PT.z0 - 0.2, PT.z1 + 0.2);
  caixaPonte.ativo = false;
  // flores pequenas da mesma cor perto do botão, para a criança ligar a cor
  flores(bx + 1.6, bz, 4, CORES[P.botao]);

  // ---------- coisas para achar
  const ovelhas = C.bichos.map(([x, y, z]) => {
    const g = bichinho(P.bicho);
    g.scale.setScalar(0.85);
    const ya = alt(x, z) + y;
    g.position.set(x, ya, z);
    g.rotation.y = Math.PI * (0.5 + r());
    cena.add(g);
    return { g, estado: "perdida", base: new THREE.Vector3(x, ya, z), fase: r() * 6, passeio: C.vagam && y === 0 ? { alvo: new THREE.Vector3(x, ya, z), espera: r() * 3 } : null };
  });
  const sementes = C.itens.map(([x, y, z]) => { const g = itemDoPortao(P.item); const ya = alt(x, z) + y; g.position.set(x, ya, z); cena.add(g); return { g, y0: ya, pega: false }; });
  const estrelas = C.estrelas.map(([x, y, z]) => { const g = estrela3D(); const ya = alt(x, z) + y; g.position.set(x, ya, z); cena.add(g); return { g, y0: ya, pega: false }; });
  const bandeiras = C.bandeiras.map(([x, z], i) => {
    const g = bandeira();
    const y = alt(x, z);
    g.position.set(x + 2.5, y, z);
    cena.add(g);
    cores.registrar(g, { raio: 4, som: false });
    return { g, ponto: new THREE.Vector3(x, y, z), ativa: i === 0 };
  });
  const borrachas = C.borrachas.slice(0, P.borrachas).map(([z, x0, x1], i) => {
    const g = borracha3D();
    g.scale.setScalar(0.85);
    const y = alt((x0 + x1) / 2, z);
    g.position.set(x0, y, z);
    cena.add(g);
    return { g, z, x0, x1, y, dir: i % 2 ? -1 : 1, viva: true, morte: 0, t: r() * 6 };
  });
  // bicho guia: um bichinho a mais que anda na frente mostrando o caminho (espera se o Rabisco ficar longe)
  let guia = null;
  if (C.guia) {
    const g = bichinho(P.bicho);
    g.scale.setScalar(0.85);
    const [gx, gz] = C.guia.trajeto[0];
    g.position.set(gx, alt(gx, gz), gz);
    cena.add(g);
    guia = { g, trajeto: C.guia.trajeto.map(([x, z]) => new THREE.Vector3(x, alt(x, z), z)), i: 0, fim: false };
  }

  // ---------- fim: o personagem, o cercado e a escola ao fundo
  const [px, pz] = C.pastor;
  const pastor = pilotoLapis(CORES[P.personagem.cor]);
  pastor.scale.setScalar(0.85);
  pastor.position.set(px, alt(px, pz), pz);
  pastor.rotation.y = Math.PI * 0.85;
  cena.add(pastor);
  cores.registrar(pastor, { raio: 6 });
  cilindros.push({ x: px, z: pz, r: 0.45 });
  const cercado = C.cercado;
  const yCercado = alt((cercado.x0 + cercado.x1) / 2, (cercado.z0 + cercado.z1) / 2);
  const ladoFechado = cercado.x0 < px ? cercado.x0 : cercado.x1; // a cerca lateral fica do lado oposto ao personagem
  for (const [x, z, comp, rot] of [[cercado.x0, cercado.z0, cercado.x1 - cercado.x0, 0], [cercado.x0, cercado.z1, cercado.x1 - cercado.x0, 0], [ladoFechado, cercado.z0, cercado.z1 - cercado.z0, -Math.PI / 2]]) {
    const c = cerca3D(comp);
    c.rotation.y = rot;
    c.position.set(x, yCercado, z);
    cena.add(c);
    cores.registrar(c, { raio: 7, som: false });
  }
  const escola = escola3D(carregarTextura("../../assets/marca/logos/azul-icone-rosa.png"));
  escola.scale.setScalar(0.55);
  escola.position.set(C.escola[0], alt(C.escola[0], Math.min(C.escola[1], L.z1 - 1)), C.escola[1]);
  escola.rotation.y = Math.PI;
  cena.add(escola);
  cores.registrar(escola, { raio: 20 });

  // ---------- ambiente: nuvens girando, água ondulando, árvores balançando, partículas
  const ambiente = {
    atualizar(dt, t) {
      for (const a of animados) a.userData.atualizar?.(dt, t);
      for (const a of aguaMalhas) a.userData.atualizar?.(t);
      balancar(arvores, t, { forca: P.id === "ceu" ? 0.015 : 0.025, velocidade: 1.1 });
    },
  };

  return {
    caixas, cilindros, arvores, ovelhas, sementes, estrelas, bandeiras, borrachas, pastor, cercado, cenario: C,
    portao: { folhas, encaixes, caixa: caixaPortao, z: zPortao, x: xPortao, y: yPortao, aberto: false, colocadas: 0, grupo: portao },
    botao: { g: botao, apertado: false }, ponte: { petalas, caixa: caixaPonte },
    agua: { tex: texAgua }, aguaEm, alt, ambiente,
    moveis, empurraveis, rolantes, cancelas, interruptores, mare, guia, itensEmOrdem: C.itensEmOrdem,
    inicio: new THREE.Vector3(C.inicio[0], alt(C.inicio[0], C.inicio[1]), C.inicio[1]),
    montarSemente: () => itemDoPortao(P.item),
  };
}
