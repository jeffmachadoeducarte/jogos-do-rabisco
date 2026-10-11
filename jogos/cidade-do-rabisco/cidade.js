// A Cidade do Rabisco: ruas em grade com faixas de pedestre e semáforos, quarteirões com prédios,
// casas coloridas e os lugares da cidade (escola, igreja, praça, biblioteca, padaria, hospital,
// bombeiros, correio, mercado, parque). Visual mais realista: materiais com luz física (PBR) e texturas
// desenhadas na hora; o Rabisco continua no traço de desenho animado, como um brinquedo na cidade.
// Unidade: o Rabisco tem 1,8 de altura. Ruas a cada 46 unidades; quarteirões de 34 × 34.

import { THREE, texturaCanvas, aleatorio, carregarTextura } from "../../src/motor3d/toon.js";
import { escolaEducarte3D, pilotoLapis } from "../../src/motor3d/objetos.js";

export const PASSO = 46, RUA = 12, QUART = PASSO - RUA; // 34
export const RUAS = [-92, -46, 0, 46, 92];              // centro das ruas (x e z)
export const BORDA = 98;
const r = aleatorio(2026);
const std = (cor, extra = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85, metalness: 0, ...extra });

// ---------- texturas
const ruido = (c, w, h, n, cores) => { for (let i = 0; i < n; i++) { c.fillStyle = cores[i % cores.length]; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } };
const texAsfalto = texturaCanvas(512, 512, (c, w, h) => {
  c.fillStyle = "#4a4e55"; c.fillRect(0, 0, w, h);
  ruido(c, w, h, 9000, ["#3f434a", "#565a61", "#5e636b", "#44484f"]);
  c.strokeStyle = "rgba(30,30,30,0.35)"; c.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) { c.beginPath(); let x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; c.lineTo(x, y); } c.stroke(); }
}, { repetir: true });
const texCalcada = texturaCanvas(256, 256, (c, w, h) => {
  c.fillStyle = "#c9c4ba"; c.fillRect(0, 0, w, h);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const v = 190 + Math.floor(Math.random() * 25);
    c.fillStyle = `rgb(${v},${v - 4},${v - 12})`; c.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
  }
  ruido(c, w, h, 1500, ["rgba(0,0,0,0.06)", "rgba(255,255,255,0.08)"]);
}, { repetir: true });
const texGrama = texturaCanvas(256, 256, (c, w, h) => {
  c.fillStyle = "#5fa83f"; c.fillRect(0, 0, w, h);
  ruido(c, w, h, 6000, ["#4f9433", "#6cb84a", "#7cc456", "#57a03a"]);
}, { repetir: true });
function texFachada(cor, { andares = 6, colunas = 4, luzes = 0.15 } = {}) {
  return texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = cor; c.fillRect(0, 0, w, h);
    ruido(c, w, h, 1200, ["rgba(0,0,0,0.05)", "rgba(255,255,255,0.06)"]);
    const jw = w / colunas, jh = h / andares;
    for (let y = 0; y < andares; y++) for (let x = 0; x < colunas; x++) {
      c.fillStyle = "rgba(0,0,0,0.18)"; c.fillRect(x * jw + jw * 0.18, y * jh + jh * 0.2, jw * 0.64, jh * 0.6);
      const g = c.createLinearGradient(0, y * jh, 0, y * jh + jh);
      const acesa = Math.random() < luzes;
      g.addColorStop(0, acesa ? "#ffe9a8" : "#a9cfe8"); g.addColorStop(1, acesa ? "#f5c96a" : "#5d87a8");
      c.fillStyle = g; c.fillRect(x * jw + jw * 0.22, y * jh + jh * 0.24, jw * 0.56, jh * 0.52);
      c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(x * jw + jw * 0.22, y * jh + jh * 0.24, jw * 0.56, 3);
    }
  });
}
function placa(texto, { cor = "#00b5f0", w = 512, h = 128 } = {}) {
  return texturaCanvas(w, h, (c) => {
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h);
    c.fillStyle = cor; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14);
    let tam = 74; c.font = `800 ${tam}px 'Baloo 2', sans-serif`;
    while (c.measureText(texto).width > w - 40) { tam -= 4; c.font = `800 ${tam}px 'Baloo 2', sans-serif`; }
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#151515"; c.fillText(texto, w / 2, h / 2 + 4);
  });
}

// ---------- peças
const caixa = (w, h, d, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = m.receiveShadow = true; return m; };
function telhado(w, d, h, cor) {
  const forma = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.4, 0), new THREE.Vector2(w / 2 + 0.4, 0), new THREE.Vector2(0, h)]);
  const geo = new THREE.ExtrudeGeometry(forma, { depth: d + 0.8, bevelEnabled: false });
  geo.translate(0, 0, -(d + 0.8) / 2);
  const m = new THREE.Mesh(geo, std(cor, { roughness: 0.7 }));
  m.castShadow = m.receiveShadow = true;
  return m;
}
function letreiro(grupo, texto, { y, z, largura = 8, cor }) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(largura, largura / 4), new THREE.MeshStandardMaterial({ map: placa(texto, { cor }), roughness: 0.6 }));
  p.position.set(0, y, z);
  grupo.add(p);
  return p;
}
function porta(grupo, { z, cor = 0x7a4a2a, w = 2.2, h = 3.4 }) {
  const p = caixa(w, h, 0.2, std(cor, { roughness: 0.6 }));
  p.position.set(0, h / 2, z);
  grupo.add(p);
}

function predio(w, d, andares, cor, luzes) {
  const g = new THREE.Group();
  const h = andares * 3.2;
  const tex = texFachada(cor, { andares: 4, colunas: 4, luzes });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(1, Math.round(w / 6)), andares / 4);
  const fachada = std(0xffffff, { map: tex, roughness: 0.7 });
  const corpo = caixa(w, h, d, [fachada, fachada, std(0x6b6b6b), std(0x6b6b6b), fachada, fachada]);
  corpo.position.y = h / 2;
  const beiral = caixa(w + 0.6, 0.5, d + 0.6, std(0xe8e2d6));
  beiral.position.y = h + 0.25;
  g.add(corpo, beiral);
  return { g, h };
}
function casa(cor, telhadoCor, numero) {
  const g = new THREE.Group();
  const corpo = caixa(7, 4.4, 7, std(cor, { roughness: 0.8 }));
  corpo.position.y = 2.2;
  const t = telhado(7, 7, 2.8, telhadoCor);
  t.position.y = 4.4;
  g.add(corpo, t);
  porta(g, { z: 3.55 });
  for (const x of [-2.2, 2.2]) { const j = caixa(1.4, 1.3, 0.15, std(0x9fd6ff, { roughness: 0.2, metalness: 0.1 })); j.position.set(x, 2.8, 3.55); g.add(j); }
  letreiro(g, String(numero), { y: 3.9, z: 3.62, largura: 1.6 });
  // caixa de correio da cor da casa (a missão das cartas)
  const poste = caixa(0.15, 1.1, 0.15, std(0x555555)); poste.position.set(2.8, 0.55, 5.4);
  const correio = caixa(0.8, 0.6, 1, std(cor, { roughness: 0.5 })); correio.position.set(2.8, 1.35, 5.4);
  g.add(poste, correio);
  g.userData.correio = correio;
  return g;
}
function arvoreReal(escala = 1) {
  const g = new THREE.Group();
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 8), std(0x6b4a2f));
  tronco.position.y = 1.5;
  tronco.castShadow = true;
  g.add(tronco);
  const folha = std([0x3f8f3a, 0x4a9a3f, 0x2f7f35][Math.floor(r() * 3)], { roughness: 0.95, flatShading: true });
  for (const [x, y, z, s] of [[0, 3.6, 0, 1.6], [0.7, 3.2, 0.3, 1.1], [-0.6, 3.3, -0.4, 1.15], [0.1, 4.5, 0.1, 1.1]]) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), folha);
    b.position.set(x, y, z);
    b.castShadow = true;
    g.add(b);
  }
  g.scale.setScalar(escala);
  return g;
}
function igreja() {
  const g = new THREE.Group();
  const nave = caixa(10, 6, 16, std(0xf4efe4));
  nave.position.y = 3;
  const t = telhado(10, 16, 4, 0x8b3a2a);
  t.rotation.y = Math.PI / 2;
  t.position.y = 6;
  t.rotation.y = 0;
  const torre = caixa(4, 12, 4, std(0xf4efe4));
  torre.position.set(0, 6, 9);
  const topo = new THREE.Mesh(new THREE.ConeGeometry(3, 4, 4), std(0x8b3a2a));
  topo.rotation.y = Math.PI / 4; topo.position.set(0, 14, 9); topo.castShadow = true;
  const cruzV = caixa(0.3, 2, 0.3, std(0xffd36b, { metalness: 0.4, roughness: 0.4 })); cruzV.position.set(0, 17, 9);
  const cruzH = caixa(1.2, 0.3, 0.3, std(0xffd36b, { metalness: 0.4, roughness: 0.4 })); cruzH.position.set(0, 17.4, 9);
  const vitral = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), std(0x7fb8ff, { emissive: 0x223355, roughness: 0.3 }));
  vitral.position.set(0, 9, 11.05);
  g.add(nave, t, torre, topo, cruzV, cruzH, vitral);
  porta(g, { z: 11.1, cor: 0x6b3a1a, w: 2.4, h: 3.6 });
  return g;
}
function chafariz() {
  const g = new THREE.Group();
  const borda = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.3, 0.9, 32), std(0xd8d2c4));
  borda.position.y = 0.45; borda.castShadow = borda.receiveShadow = true;
  const agua = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.2, 32), std(0x4aa3df, { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }));
  agua.position.y = 0.8;
  const coluna = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.6, 16), std(0xd8d2c4));
  coluna.position.y = 1.6; coluna.castShadow = true;
  const prato = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.2, 0.3, 24), std(0xd8d2c4));
  prato.position.y = 2.9;
  const jato = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 12, 1, true), std(0xbfe6ff, { transparent: true, opacity: 0.6, roughness: 0.1 }));
  jato.position.y = 3.9;
  g.add(borda, agua, coluna, prato, jato);
  g.userData.agua = agua;
  return g;
}
function banco() {
  const g = new THREE.Group();
  const madeira = std(0x9a6232, { roughness: 0.7 });
  const assento = caixa(3, 0.15, 0.8, madeira); assento.position.y = 0.9;
  const costas = caixa(3, 0.8, 0.12, madeira); costas.position.set(0, 1.4, -0.35);
  for (const x of [-1.3, 1.3]) { const pe = caixa(0.12, 0.9, 0.7, std(0x333333)); pe.position.set(x, 0.45, 0); g.add(pe); }
  g.add(assento, costas);
  return g;
}
function playground() {
  const g = new THREE.Group();
  const metal = std(0xec2e8c, { metalness: 0.3, roughness: 0.5 });
  for (const x of [-2, 2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 8), metal); p.position.set(x, 2, 0); p.rotation.z = x > 0 ? -0.15 : 0.15; g.add(p); }
  const trave = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.8, 8), metal); trave.rotation.z = Math.PI / 2; trave.position.y = 3.9; g.add(trave);
  for (const x of [-0.9, 0.9]) {
    for (const s of [-0.3, 0.3]) { const c = caixa(0.04, 2.6, 0.04, std(0x999999)); c.position.set(x + s, 2.6, 0); g.add(c); }
    const assento = caixa(0.9, 0.12, 0.45, std(0xffcc1f)); assento.position.set(x, 1.3, 0); g.add(assento);
  }
  const escorrega = caixa(1.2, 0.15, 5, std(0x00b5f0, { roughness: 0.3 })); escorrega.position.set(5, 1.4, 0); escorrega.rotation.x = 0.55; g.add(escorrega);
  const torre = caixa(1.6, 2.8, 1.6, std(0xff7a00)); torre.position.set(5, 1.4, -2.6); g.add(torre);
  return g;
}
function semaforo() {
  const g = new THREE.Group();
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.2, 8), std(0x333333, { metalness: 0.5, roughness: 0.4 }));
  poste.position.y = 2.1; poste.castShadow = true;
  const caixaLuz = caixa(0.7, 1.9, 0.6, std(0x222222));
  caixaLuz.position.y = 4.6;
  const luzes = {};
  [["vermelho", 0xff2a2a, 5.15], ["amarelo", 0xffc21a, 4.6], ["verde", 0x2aff6a, 4.05]].forEach(([nome, cor, y]) => {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: cor, emissiveIntensity: 0 }));
    l.position.set(0, y, 0.31);
    g.add(l);
    luzes[nome] = l;
  });
  // bonequinho de pedestre (verde = pode atravessar)
  const ped = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xff3030, emissiveIntensity: 1 }));
  ped.position.set(0, 3.2, 0.13);
  const pedCaixa = caixa(0.6, 0.6, 0.2, std(0x222222)); pedCaixa.position.set(0, 3.2, 0);
  g.add(poste, caixaLuz, pedCaixa, ped);
  g.userData = { luzes, ped };
  return g;
}
export function carro(cor) {
  const g = new THREE.Group();
  const lata = std(cor, { metalness: 0.4, roughness: 0.35 });
  const corpo = caixa(2.2, 0.9, 4.4, lata); corpo.position.y = 0.85;
  const cabine = caixa(1.9, 0.8, 2.3, std(0x9fc8e8, { metalness: 0.2, roughness: 0.15 })); cabine.position.set(0, 1.65, -0.2);
  const teto = caixa(1.95, 0.12, 2.0, lata); teto.position.set(0, 2.08, -0.2);
  g.add(corpo, cabine, teto);
  for (const [x, z] of [[-1.05, 1.4], [1.05, 1.4], [-1.05, -1.4], [1.05, -1.4]]) {
    const roda = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), std(0x1d1d1d, { roughness: 0.9 }));
    roda.rotation.z = Math.PI / 2; roda.position.set(x, 0.42, z); roda.castShadow = true;
    g.add(roda);
  }
  for (const x of [-0.7, 0.7]) {
    const farol = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 0.6 }));
    farol.position.set(x, 0.95, 2.21); g.add(farol);
    const lanterna = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0xff2020, emissiveIntensity: 0.4 }));
    lanterna.position.set(x, 0.95, -2.21); lanterna.rotation.y = Math.PI; g.add(lanterna);
  }
  return g;
}

// ---------- montagem
export function montarCidade(cena) {
  const solidos = [];     // { x0, x1, z0, z1, y1 } — prédios, muros e coisas grandes
  const lugares = [];     // { id, nome, x, z, raio } — para o passaporte e o mapa
  const casas = [];       // { cor, nome, correio, x, z }
  const semaforos = [];   // { x, z, grupo (4 postes), fase }
  const faixas = [];      // { x0, x1, z0, z1, eixo: "x"|"z", cruzamento }
  const tex = { logo: carregarTextura("../../assets/marca/logos/azul-icone-rosa.png"), icone: carregarTextura("../../assets/marca/logos/icone-branco.png") };
  const solido = (cx, cz, w, d, h = 20) => solidos.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, y1: h });

  // chão: grama nos quarteirões, calçadas e ruas
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), std(0xffffff, { map: texGrama }));
  texGrama.repeat.set(120, 120);
  chao.rotation.x = -Math.PI / 2; chao.position.y = -0.02; chao.receiveShadow = true;
  cena.add(chao);
  const matAsfalto = std(0xffffff, { map: texAsfalto, roughness: 0.95 });
  texAsfalto.repeat.set(1, 30);
  const linhas = texturaCanvas(64, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#f2c230"; for (let y = 0; y < h; y += 64) c.fillRect(w / 2 - 3, y, 6, 36);
  }, { repetir: true });
  linhas.repeat.set(1, 18);
  const matLinhas = new THREE.MeshStandardMaterial({ map: linhas, transparent: true, roughness: 0.6 });
  const total = BORDA * 2 + RUA;
  for (const v of RUAS) {
    for (const eixo of ["x", "z"]) {
      const rua = new THREE.Mesh(new THREE.PlaneGeometry(RUA, total), matAsfalto);
      rua.rotation.x = -Math.PI / 2;
      if (eixo === "x") { rua.rotation.z = Math.PI / 2; rua.position.set(0, 0.01, v); } else rua.position.set(v, 0.012, 0);
      rua.receiveShadow = true;
      cena.add(rua);
      const faixaCentro = new THREE.Mesh(new THREE.PlaneGeometry(0.6, total), matLinhas);
      faixaCentro.rotation.x = -Math.PI / 2;
      if (eixo === "x") { faixaCentro.rotation.z = Math.PI / 2; faixaCentro.position.set(0, 0.03, v); } else faixaCentro.position.set(v, 0.031, 0);
      cena.add(faixaCentro);
    }
  }
  // calçadas (um degrau baixinho em volta de cada quarteirão) e faixas de pedestre
  const matCalcada = std(0xffffff, { map: texCalcada, roughness: 0.9 });
  texCalcada.repeat.set(9, 9);
  const matFaixa = std(0xf4f4f4, { roughness: 0.6 });
  const blocos = [];
  for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) {
    const cx = RUAS[i] + PASSO / 2, cz = RUAS[k] + PASSO / 2;
    blocos.push({ cx, cz, i, k });
    const anel = new THREE.Mesh(new THREE.BoxGeometry(QUART, 0.18, QUART), matCalcada);
    anel.position.set(cx, 0.09, cz); anel.receiveShadow = true;
    cena.add(anel);
    const miolo = new THREE.Mesh(new THREE.PlaneGeometry(QUART - 6, QUART - 6), std(0xffffff, { map: texGrama }));
    miolo.rotation.x = -Math.PI / 2; miolo.position.set(cx, 0.19, cz); miolo.receiveShadow = true;
    cena.add(miolo);
  }
  // cruzamentos do meio: faixa de pedestre nos 4 lados e semáforo nas esquinas
  for (const x of [-46, 0, 46]) for (const z of [-46, 0, 46]) {
    const grupo = new THREE.Group();
    for (const [dx, dz, eixo] of [[0, -RUA / 2 - 1.6, "x"], [0, RUA / 2 + 1.6, "x"], [-RUA / 2 - 1.6, 0, "z"], [RUA / 2 + 1.6, 0, "z"]]) {
      for (let s = -4; s <= 4; s++) {
        const listra = new THREE.Mesh(new THREE.PlaneGeometry(eixo === "x" ? 0.8 : 3, eixo === "x" ? 3 : 0.8), matFaixa);
        listra.rotation.x = -Math.PI / 2;
        listra.position.set(x + dx + (eixo === "x" ? s * 1.35 : 0), 0.04, z + dz + (eixo === "z" ? s * 1.35 : 0));
        listra.receiveShadow = true;
        cena.add(listra);
      }
      // a faixa "eixo x" atravessa uma rua que corre em z, e vice-versa
      faixas.push({ x0: x + dx - (eixo === "x" ? RUA / 2 : 1.6), x1: x + dx + (eixo === "x" ? RUA / 2 : 1.6), z0: z + dz - (eixo === "z" ? RUA / 2 : 1.6), z1: z + dz + (eixo === "z" ? RUA / 2 : 1.6), atravessa: eixo === "x" ? "z" : "x", cruz: { x, z } });
    }
    const postes = [];
    for (const [sx, sz, rot] of [[1, 1, Math.PI], [-1, -1, 0], [1, -1, -Math.PI / 2], [-1, 1, Math.PI / 2]]) {
      const s = semaforo();
      s.position.set(x + sx * (RUA / 2 + 0.8), 0.18, z + sz * (RUA / 2 + 0.8));
      s.rotation.y = rot;
      s.userData.eixo = rot === 0 || rot === Math.PI ? "z" : "x"; // de frente para os carros que andam neste eixo
      grupo.add(s);
      postes.push(s);
    }
    cena.add(grupo);
    semaforos.push({ x, z, postes, fase: (x + z) % 92 === 0 ? 0 : 6 });
  }

  // ---------- quarteirões: o que fica em cada um
  const usos = {
    "1,1": "escola", "2,1": "praca", "1,2": "igreja", "2,2": "parque",
    "0,1": "biblioteca", "3,1": "padaria", "0,2": "hospital", "3,2": "bombeiros",
    "1,0": "correio", "2,0": "mercado", "1,3": "casas", "2,3": "casas2",
    "0,0": "predios", "3,0": "predios", "0,3": "predios", "3,3": "predios",
  };
  const coresPredio = ["#d9c7a8", "#c9d6e3", "#e3c9c9", "#cfe3c9", "#e8dcc4", "#d4cce6", "#f0e0c0"];
  const coresCasa = [["vermelha", 0xd94a3d], ["azul", 0x3d7ad9], ["amarela", 0xf2c94c], ["verde", 0x4cae5a]];
  for (const { cx, cz, i, k } of blocos) {
    const uso = usos[`${i},${k}`];
    const grupo = new THREE.Group();
    grupo.position.set(cx, 0.18, cz);
    cena.add(grupo);
    // fachada principal virada para a rua de baixo (z menor) ou de cima, conforme o quarteirão
    const frente = k <= 1 ? 1 : -1;  // 1: porta para +z
    grupo.rotation.y = frente === 1 ? 0 : Math.PI;
    const lugar = (id, nome, raio = 12) => lugares.push({ id, nome, x: cx, z: cz + frente * 9, raio, cx, cz, frente });
    if (uso === "escola") {
      const e = escolaEducarte3D(tex.logo, tex.icone);
      e.scale.setScalar(0.42);
      e.position.z = -2;
      grupo.add(e);
      solido(cx, cz - 2 * frente, 24, 12);
      lugar("escola", "Escola Educarte");
    } else if (uso === "igreja") {
      const ig = igreja(); ig.position.z = -6; grupo.add(ig);
      solido(cx, cz - 6 * frente, 10.5, 16.5); solido(cx, cz + 3 * frente, 4.5, 4.5);
      lugar("igreja", "Igreja");
    } else if (uso === "praca") {
      const ch = chafariz(); grupo.add(ch); grupo.userData.agua = ch.userData.agua;
      solidos.push({ x0: cx - 4.3, x1: cx + 4.3, z0: cz - 4.3, z1: cz + 4.3, y1: 0.9 });
      for (const [x, z, rot] of [[-8, 0, Math.PI / 2], [8, 0, -Math.PI / 2], [0, -8, 0], [0, 8, Math.PI]]) { const b = banco(); b.position.set(x, 0, z); b.rotation.y = rot; grupo.add(b); }
      for (const [x, z] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) { const a = arvoreReal(1.3); a.position.set(x, 0, z); grupo.add(a); solidos.push({ x0: cx + x - 0.5, x1: cx + x + 0.5, z0: cz + x * 0 + z * frente - 0.5, z1: cz + z * frente + 0.5, y1: 6 }); }
      lugar("praca", "Praça", 13);
    } else if (uso === "parque") {
      const pg = playground(); pg.position.set(-3, 0, 0); grupo.add(pg);
      for (let n = 0; n < 7; n++) { const a = arvoreReal(1 + r() * 0.5); a.position.set(-13 + r() * 26, 0, -13 + r() * 6); grupo.add(a); }
      lugar("parque", "Parque", 13);
    } else if (uso === "casas" || uso === "casas2") {
      coresCasa.forEach(([nome, cor], n) => {
        if (uso === "casas2" && n > 1) return;
        const lado = uso === "casas" ? n : n + 4;
        const h = casa(cor, n % 2 ? 0x7a3a2a : 0x5a4a3a, lado + 1);
        const x = uso === "casas" ? -12 + n * 8 : -8 + n * 16;
        h.position.set(x, 0, -4);
        grupo.add(h);
        solido(cx + x * frente, cz - 4 * frente, 7.4, 7.4, 7);
        if (uso === "casas") casas.push({ cor: nome, numero: lado + 1, correio: h.userData.correio, x: cx + (x + 2.8) * frente, z: cz + (-4 + 5.4) * frente });
      });
      if (uso === "casas2") { const pg = arvoreReal(1.4); pg.position.set(0, 0, 6); grupo.add(pg); }
      lugar(uso, uso === "casas" ? "Rua das Casas Coloridas" : "Vila", 14);
    } else {
      // prédios com letreiro: biblioteca, padaria, hospital, bombeiros, correio, mercado e prédios de morar
      const info = {
        biblioteca: ["Biblioteca", "#c9b28a", 3, "#8e6cff"], padaria: ["Padaria", "#f2d0a4", 2, "#ff7a00"], hospital: ["Hospital", "#f4f4f4", 4, "#e63946"],
        bombeiros: ["Bombeiros", "#d94a3d", 2, "#e63946"], correio: ["Correio", "#f2d34c", 2, "#1d6fe0"], mercado: ["Mercado", "#cfe3c9", 2, "#2bb24c"],
      }[uso];
      if (info) {
        const [nome, cor, andares, corPlaca] = info;
        const { g: pr, h } = predio(20, 14, andares, cor, 0.1);
        pr.position.z = -4;
        grupo.add(pr);
        letreiro(grupo, nome, { y: Math.min(h - 1, 5.2), z: 3.08, largura: 10, cor: corPlaca });
        porta(grupo, { z: 3.08, w: 3, h: 3.4, cor: 0x5a3a20 });
        solido(cx, cz - 4 * frente, 20.4, 14.4);
        lugar(uso, nome);
        if (uso === "hospital") { const cruz1 = caixa(3, 0.9, 0.2, std(0xe63946)); const cruz2 = caixa(0.9, 3, 0.2, std(0xe63946)); cruz1.position.set(0, h - 2, 3.1); cruz2.position.set(0, h - 2, 3.1); grupo.add(cruz1, cruz2); }
        if (uso === "bombeiros") { const garagem = caixa(6, 4, 0.3, std(0xeeeeee, { metalness: 0.3, roughness: 0.4 })); garagem.position.set(5.5, 2, 3.1); grupo.add(garagem); }
      } else {
        // prédios de morar: dois ou três de alturas diferentes
        const n = 2 + Math.floor(r() * 2);
        for (let q = 0; q < n; q++) {
          const w = QUART / n - 3, andares = 4 + Math.floor(r() * 8);
          const { g: pr } = predio(w, 14, andares, coresPredio[Math.floor(r() * coresPredio.length)], 0.2);
          const x = -QUART / 2 + 1.5 + w / 2 + q * (w + 3);
          pr.position.set(x, 0, -3);
          grupo.add(pr);
          solido(cx + x * frente, cz - 3 * frente, w + 0.4, 14.4);
        }
      }
    }
    // árvores nas calçadas (em volta do quarteirão)
    for (const [x, z] of [[-14, 14.5], [14, 14.5], [-14, -14.5], [14, -14.5]]) {
      if (uso === "praca") continue;
      const a = arvoreReal(0.9 + r() * 0.3);
      a.position.set(x, 0, z);
      grupo.add(a);
      solidos.push({ x0: cx + x * frente - 0.45, x1: cx + x * frente + 0.45, z0: cz + z * frente - 0.45, z1: cz + z * frente + 0.45, y1: 6 });
    }
  }
  // morros e árvores fora da cidade, para não acabar "no nada"
  for (let n = 0; n < 60; n++) {
    const a = arvoreReal(1.2 + r());
    const ang = r() * Math.PI * 2, dist = 112 + r() * 60;
    a.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
    cena.add(a);
  }
  for (let n = 0; n < 14; n++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(40 + r() * 30, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x6fae4f, { roughness: 1 }));
    const ang = (n / 14) * Math.PI * 2;
    m.position.set(Math.cos(ang) * 230, -6, Math.sin(ang) * 230);
    m.scale.y = 0.45;
    cena.add(m);
  }
  return { solidos, lugares, casas, semaforos, faixas, blocos };
}

export function morador(cor) {
  const p = pilotoLapis(cor);
  p.scale.setScalar(0.7);
  return p;
}
