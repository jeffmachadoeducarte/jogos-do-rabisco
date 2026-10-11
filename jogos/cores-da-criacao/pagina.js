// Uma página do Livro da Criação (ver paginas.js). Monta o cenário de artesanato (feltro com costura, caixas
// de papelão), as colisões e as coisas com que o Rabisco interage: bichinhos perdidos, objetos do
// portão, botão colorido da ponte de flores, estrelas escondidas, bandeirinhas e o personagem do fim.
// Unidade: o Rabisco tem 1,8 de altura. Ele anda para +z (para longe da câmera).

import { THREE, toon, peca, texturaCanvas, COR3D, aleatorio, carregarTextura } from "../../src/motor3d/toon.js";
import { arvore3D, nuvem3D, morro3D, flor3D, cerca3D, pilotoLapis, borracha3D, escola3D } from "../../src/motor3d/objetos.js";
import { decoracao } from "../rabisco-kart/pistas.js";
import { PAGINAS, CORES } from "./paginas.js";

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

// ---------- peças
function caixaPapelao(w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(0xffffff, { map: texPapelao }));
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
function bichinho(tipo) {
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

export function montarPagina(cena, cores, P = PAGINAS[0]) {
  const caixas = [];     // colisores: { x0, x1, y0, y1, z0, z1, ativo }
  const cilindros = [];  // árvores e pedras: { x, z, r }
  const solido = (x0, x1, y0, y1, z0, z1) => { const c = { x0, x1, y0, y1, z0, z1, ativo: true }; caixas.push(c); return c; };
  const r = aleatorio(31);

  // ---------- chão de feltro em ladrilhos (o caminho é bege, a grama verde)
  const texGrama = feltro(P.chao.grama), texCaminho = feltro(P.chao.caminho), texMargem = feltro(P.chao.margem, { costura: false });
  for (let z = LIMITES.z0; z < LIMITES.z1; z += 4) {
    if (z + 4 > RIO.z0 && z < RIO.z1) continue;
    for (let x = LIMITES.x0; x < LIMITES.x1; x += 4) {
      const caminho = x >= -4 && x < 4;
      const lad = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 4), toon(0xffffff, { map: caminho ? texCaminho : texGrama }));
      lad.position.set(x + 2, -0.3, z + 2);
      lad.receiveShadow = true;
      cena.add(lad);
      cores.registrar(lad, { raio: 7, som: false });
    }
  }
  // margem além das cercas e morros ao fundo
  const margem = new THREE.Mesh(new THREE.PlaneGeometry(200, 220), toon(0xffffff, { map: texMargem }));
  margem.rotation.x = -Math.PI / 2; margem.position.set(0, -0.62, 44);
  texMargem.wrapS = texMargem.wrapT = THREE.RepeatWrapping; texMargem.repeat.set(30, 30);
  cena.add(margem);
  for (let i = 0; i < 14; i++) {
    const m = morro3D(14 + r() * 10, P.morros[i % 2]);
    const lado = i % 2 ? 1 : -1;
    m.position.set(lado * (30 + r() * 16), -0.6, -10 + i * 9);
    cena.add(m);
    cores.registrar(m, { raio: 26, som: false });
  }
  for (let i = 0; i < 9; i++) {
    const n = nuvem3D(0.35 + r() * 0.2);
    n.position.set(-26 + r() * 52, 16 + r() * 6, i * 12);
    cena.add(n);
  }
  // cercas nas laterais (com colisão)
  for (const x of [LIMITES.x0, LIMITES.x1]) {
    for (let z = LIMITES.z0; z < LIMITES.z1; z += 10) {
      if (z + 10 > RIO.z0 && z < RIO.z1) continue;
      const c = cerca3D(Math.min(10, LIMITES.z1 - z));
      c.rotation.y = -Math.PI / 2; c.position.set(x, 0, z);
      cena.add(c);
      cores.registrar(c, { raio: 7, som: false, centro: new THREE.Vector3(x, 0, z + 5) });
    }
    solido(x - (x < 0 ? 2 : 0), x + (x > 0 ? 2 : 0), -5, 10, LIMITES.z0, LIMITES.z1);
  }
  solido(LIMITES.x0, LIMITES.x1, -5, 10, LIMITES.z0 - 2, LIMITES.z0);
  solido(LIMITES.x0, LIMITES.x1, -5, 10, LIMITES.z1, LIMITES.z1 + 2);

  // ---------- natureza: árvores, flores e pedras
  const arvores = []; // a câmera esconde a árvore que ficar na frente do Rabisco
  // árvore de cada página (as dos outros temas vêm da decoração do Kart, em escala menor)
  const novaArvore = (e) => {
    if (P.arvore === "arvore") return arvore3D(e);
    if (P.arvore === "nuvem") { const n = new THREE.Group(); const nv = nuvem3D(0.16 * e / 0.32); nv.position.y = 2.6; const haste = peca(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), 0xffffff, { contorno: 0.03 }); haste.position.y = 1.3; n.add(haste, nv); return n; }
    const d = decoracao(P.arvore, r);
    d.scale.setScalar(0.27 * e / 0.32);
    return d;
  };
  const arvore = (x, z, e = 0.32) => { const a = novaArvore(e);
    if (P.frutas && P.arvore === "arvore") for (let k = 0; k < 6; k++) { const f = peca(new THREE.SphereGeometry(0.75, 10, 8), k % 2 ? COR3D.vermelho : COR3D.laranja, { contorno: 0.15 }); f.position.set((r() - 0.5) * 6, 6.5 + r() * 3, (r() - 0.5) * 6); a.add(f); } a.position.set(x, 0, z); a.rotation.y = r() * 6; cena.add(a); cores.registrar(a, { raio: 7.5 }); cilindros.push({ x, z, r: 0.9 * e / 0.32 }); arvores.push(a); return a; };
  const flores = (x, z, n = 7, cor = null) => {
    const coresFlor = P.flores.map((c) => CORES[c]);
    for (let i = 0; i < n; i++) {
      const f = flor3D(cor ?? coresFlor[Math.floor(r() * coresFlor.length)]);
      f.scale.setScalar(1.6 + r() * 0.8);
      f.position.set(x + (r() - 0.5) * 3, 0, z + (r() - 0.5) * 3);
      cena.add(f);
      cores.registrar(f, { raio: 6 });
    }
  };
  const pedra = (x, z, s = 1) => { const p = peca(new THREE.DodecahedronGeometry(0.6 * s, 0), 0x9aa3ad, { contorno: 0.06 }); p.position.set(x, 0.3 * s, z); p.scale.y = 0.7; cena.add(p); cores.registrar(p, { raio: 4.5 }); cilindros.push({ x, z, r: 0.6 * s }); };
  for (const [x, z, e] of [[-9, 4, 0.3], [9, 6, 0.34], [-10, 18, 0.28], [10, 14, 0.3], [9.5, 25, 0.36], [-9, 27, 0.3], [9, 46, 0.3], [-10, 58, 0.34], [10, 62, 0.3], [-9, 76, 0.3], [9, 80, 0.32], [-6, 44, 0.26]]) arvore(x, z, e);
  for (const [x, z] of [[-6, 6], [6, 10], [-5, 16], [7, 22], [-7, 33], [5, 44], [-4, 52], [7, 58], [-6, 63], [6, 72], [-3, 80], [8, 88]]) flores(x, z);
  for (const [x, z, s] of [[5, 3, 1], [-6, 11, 1.2], [6, 28, 0.9], [3, 47, 1], [-8, 64, 1.3], [7, 75, 1]]) pedra(x, z, s);

  // ---------- caixas de papelão (plataformas)
  const plataforma = (x, z, w, h, d) => {
    const c = caixaPapelao(w, h, d);
    c.position.set(x, h / 2, z);
    cena.add(c);
    cores.registrar(c, { raio: 5 });
    solido(x - w / 2, x + w / 2, 0, h, z - d / 2, z + d / 2);
    return c;
  };
  plataforma(4, 18, 3, 1.4, 3);                                        // semente 3 em cima
  plataforma(5, 46, 3, 1.2, 3); plataforma(7, 49.5, 3, 2.4, 3); plataforma(9, 53, 3, 3.6, 3); // escada da estrela 2
  plataforma(-5, 66, 3, 1.2, 3); plataforma(-8, 69.5, 3, 2.4, 3);      // ovelha 3 lá em cima

  // ---------- rio com água que mexe, e as margens
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(LIMITES.x1 - LIMITES.x0, RIO.z1 - RIO.z0), toon(0xffffff, { map: texAgua }));
  texAgua.repeat.set(6, 1.5);
  agua.rotation.x = -Math.PI / 2;
  agua.position.set(0, -0.55, (RIO.z0 + RIO.z1) / 2);
  cena.add(agua);
  cores.registrar(agua, { raio: 7, centro: new THREE.Vector3(0, 0, RIO.z0) });

  // ---------- portão de sementes (z = 30): fecha o caminho até receber as 3 sementes
  const zPortao = 30;
  for (const [x0, x1] of [[LIMITES.x0, -3], [3, LIMITES.x1]]) {
    const c = cerca3D(x1 - x0);
    c.position.set(x0, 0, zPortao);
    cena.add(c);
    cores.registrar(c, { raio: 7, som: false, centro: new THREE.Vector3((x0 + x1) / 2, 0, zPortao) });
    solido(x0, x1, 0, 3, zPortao - 0.3, zPortao + 0.3);
  }
  const portao = new THREE.Group();
  portao.position.set(0, 0, zPortao);
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
  // placa com três encaixes para as sementes (sem números: a criança vê os buracos vazios)
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
  const caixaPortao = solido(-3, 3, 0, 3, zPortao - 0.3, zPortao + 0.3);

  // ---------- botão vermelho e a ponte de flores vermelhas
  const botao = new THREE.Group();
  const baseBotao = peca(new THREE.CylinderGeometry(0.7, 0.8, 0.2, 20), 0x9aa3ad, { contorno: 0.04 });
  baseBotao.position.y = 0.1;
  const capa = peca(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 20), CORES[P.botao], { contorno: 0.04 });
  capa.position.y = 0.3;
  botao.add(baseBotao, capa);
  botao.position.set(-6, 0, 33.5);
  botao.userData.capa = capa;
  cena.add(botao);
  cores.registrar(botao, { raio: 5 });
  const ponte = new THREE.Group();
  const petalas = [];
  for (let i = 0; i < 4; i++) {
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
    vitoria.position.set(-6, -0.4, RIO.z0 + 0.75 + i * 1.5);
    vitoria.scale.setScalar(0.001);
    ponte.add(vitoria);
    petalas.push(vitoria);
  }
  cena.add(ponte);
  const caixaPonte = solido(-7.6, -4.4, -1, 0, RIO.z0 - 0.2, RIO.z1 + 0.2);
  caixaPonte.ativo = false;
  // botões e flores vermelhas pequenas na margem, para a criança ligar a cor
  flores(-6, 34.8, 4, CORES[P.botao]);

  // ---------- coisas para achar
  const ovelhas = [[-9, 0, 13], [-9.5, 0, 50.5], [-8, 2.4, 69.5]].map(([x, y, z]) => {
    const g = bichinho(P.bicho);
    g.scale.setScalar(0.85);
    g.position.set(x, y, z);
    g.rotation.y = Math.PI * (0.5 + r());
    cena.add(g);
    return { g, estado: "perdida", base: new THREE.Vector3(x, y, z), fase: r() * 6 };
  });
  const sementes = [[6, 0.6, 8], [-7, 0.6, 22], [4, 2.0, 18]].map(([x, y, z]) => { const g = itemDoPortao(P.item); g.position.set(x, y, z); cena.add(g); return { g, y0: y, pega: false }; });
  const estrelas = [[10.6, 0.9, 27.5], [9, 4.5, 53], [10.5, 0.9, 82]].map(([x, y, z]) => { const g = estrela3D(); g.position.set(x, y, z); cena.add(g); return { g, y0: y, pega: false }; });
  const bandeiras = [[2.5, 0, 1], [2.5, 0, 32.5], [2.5, 0, 56], [2.5, 0, 74]].map(([x, y, z], i) => {
    const g = bandeira();
    g.position.set(x, y, z);
    cena.add(g);
    cores.registrar(g, { raio: 4, som: false });
    return { g, ponto: new THREE.Vector3(0, 0, z), ativa: i === 0 };
  });
  // borrachas: 3 no Jardim e mais a cada página (sempre nos trechos depois da ponte)
  const borrachas = [[62, -6, 6], [70, -6, 4], [80, -5, 7], [58, -8, 2], [75, -2, 8], [48, -9, -3], [54, -8, -1]].slice(0, P.borrachas).map(([z, x0, x1], i) => {
    const g = borracha3D();
    g.scale.setScalar(0.85);
    g.position.set(x0, 0, z);
    cena.add(g);
    return { g, z, x0, x1, dir: i % 2 ? -1 : 1, viva: true, morte: 0, t: r() * 6 };
  });

  // ---------- fim: o Lápis Verde pastor, o cercado e a escola ao fundo
  const pastor = pilotoLapis(CORES[P.personagem.cor]);
  pastor.scale.setScalar(0.85);
  pastor.position.set(-3, 0, 85);
  pastor.rotation.y = Math.PI * 0.85;
  cena.add(pastor);
  cores.registrar(pastor, { raio: 6 });
  cilindros.push({ x: -3, z: 85, r: 0.45 });
  const cercado = { x0: -10.5, x1: -5, z0: 83, z1: 90 };
  for (const [x, z, comp, rot] of [[cercado.x0, cercado.z0, cercado.x1 - cercado.x0, 0], [cercado.x0, cercado.z1, cercado.x1 - cercado.x0, 0], [cercado.x0, cercado.z0, cercado.z1 - cercado.z0, -Math.PI / 2]]) {
    const c = cerca3D(comp);
    c.rotation.y = rot;
    c.position.set(x, 0, z);
    cena.add(c);
    cores.registrar(c, { raio: 7, som: false });
  }
  const escola = escola3D(carregarTextura("../../assets/marca/logos/azul-icone-rosa.png"));
  escola.scale.setScalar(0.55);
  escola.position.set(3, 0, 100);
  escola.rotation.y = Math.PI;
  cena.add(escola);
  cores.registrar(escola, { raio: 20 });

  return {
    caixas, cilindros, arvores, ovelhas, sementes, estrelas, bandeiras, borrachas, pastor, cercado,
    portao: { folhas, encaixes, caixa: caixaPortao, z: zPortao, aberto: false, colocadas: 0, grupo: portao },
    botao: { g: botao, apertado: false }, ponte: { petalas, caixa: caixaPonte },
    agua: { tex: texAgua },
    inicio: new THREE.Vector3(0, 0, 0),
    montarSemente: () => itemDoPortao(P.item),
  };
}
