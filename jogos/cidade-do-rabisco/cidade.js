// A Cidade do Rabisco em 3D, montada a partir do traçado de mapa.js: avenida com canteiro e rotatória
// (praça com chafariz no meio), ruas retas e uma rua de curvas, semáforos com faixa de pedestre, os lugares
// da cidade (escola, Igreja Reviver, biblioteca, padaria, hospital, bombeiros, correio, mercado, parque com lago e
// roda-gigante), casas coloridas e prédios de morar preenchendo o resto. Materiais com luz física (PBR) e
// texturas desenhadas na hora; o Rabisco continua no traço de desenho animado, como um brinquedo na cidade.
// Unidade: o Rabisco tem 1,8 de altura.

import { THREE, texturaCanvas, aleatorio, carregarTextura } from "../../src/motor3d/toon.js";
import { escolaEducarte3D, pilotoLapis } from "../../src/motor3d/objetos.js";
import { RUAS, CALCADA, distRua, LUGARES, CASAS, SEMAFOROS, PARQUE, LAGO, PLAYGROUND, PRACA, VAGAS, LARGADA, PATIO_JE, HELIPONTO } from "./mapa.js";
import { ESTILO_PARCEIRO, IGREJA } from "./parceiros.js";
import { chaveMaterial, juntarGeometrias, mesclarLocal } from "./mesclar.js";

export { BORDA } from "./mapa.js";
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
const fachadas = new Map();
function texFachada(cor, { andares = 6, colunas = 4, luzes = 0.15 } = {}) {
  const chave = `${cor}|${andares}|${colunas}|${luzes}`;
  if (!fachadas.has(chave)) fachadas.set(chave, desenharFachada(cor, { andares, colunas, luzes }));
  const t = fachadas.get(chave).clone(); // mesma imagem; só a repetição muda
  t.needsUpdate = true;
  return t;
}
function desenharFachada(cor, { andares, colunas, luzes }) {
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
// loja de empresa parceira (e a Igreja Reviver): a frente inteira do prédio (de canto a canto, do chão ao topo)
// é a foto real da fachada; o prédio se adapta à proporção da foto (altura fixa, largura = altura × proporção,
// sem esticar). Laterais, fundo e telhado em cor sólida que combina com a foto. A foto carrega sem travar o jogo:
// até lá (ou se ela falhar) fica um prédio liso do mesmo tipo, ou o desenho provisório da fachada (p.provisoria).
// p.altura / p.d / p.larguraMax / p.proporcao trocam as medidas padrão (LOJA). aoMudar(largura) avisa a nova
// largura (colisão).
const LOJA = { altura: 9, d: 7, frente: 3.08, larguraMax: 24 };
const medidas = (p) => ({ ...LOJA, ...Object.fromEntries(["altura", "d", "larguraMax"].filter((k) => p[k]).map((k) => [k, p[k]])) });
function lojaParceira(p, aoMudar) {
  const M = medidas(p);
  const g = new THREE.Group();
  const estilo = ESTILO_PARCEIRO[p.tipo] ?? ESTILO_PARCEIRO.carros;
  const parede = std(estilo.parede, { roughness: 0.8 });
  const matFrente = std(estilo.parede, { roughness: 0.75 });
  if (p.provisoria) {
    const t = p.provisoria(); t.colorSpace = THREE.SRGBColorSpace;
    Object.assign(matFrente, { map: t, emissiveMap: t, emissiveIntensity: 0.35 }); matFrente.color.set(0xffffff); matFrente.emissive.set(0xffffff);
  }
  const corpo = caixa(1, 1, M.d, [parede, parede, parede, parede, matFrente, parede]); // 4 = face +z (rua)
  const beiral = caixa(1, 0.35, M.d + 0.4, std(estilo.beiral, { roughness: 0.7 }));
  g.add(corpo, beiral);
  const montar = (prop) => {
    const w = Math.min(M.larguraMax, M.altura * prop), h = w / prop;
    corpo.scale.set(w, h, 1); corpo.position.set(0, h / 2, M.frente - M.d / 2);
    beiral.scale.set(w + 0.4, 1, 1); beiral.position.set(0, h + 0.17, M.frente - M.d / 2 - 0.2);
    aoMudar?.(w);
  };
  montar(p.proporcao ?? M.larguraMax / M.altura); // começa na proporção prevista (ou na largura máxima) e se ajusta quando a foto chega
  new THREE.TextureLoader().load(`../../${p.foto}`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    // a foto também "brilha" um pouco (emissiva): fica legível mesmo com o sol de lado ou na sombra
    Object.assign(matFrente, { map: t, emissiveMap: t, emissiveIntensity: 0.35 });
    matFrente.color.set(0xffffff); matFrente.emissive.set(0xffffff); matFrente.needsUpdate = true;
    montar(t.image.width / t.image.height);
  }, undefined, () => console.warn(`foto de ${p.nome} não carregou`));
  return g;
}
// frente provisória da Igreja Reviver (enquanto a foto não chega): concreto, moldura branca, letreiro,
// vidro espelhado com o arco azul-marinho e a marquise, na proporção prevista da foto
function fachadaIgreja() {
  const W = 1024, H = Math.round(W / IGREJA.proporcao);
  return texturaCanvas(W, H, (c) => {
    c.fillStyle = "#f4f4f1"; c.fillRect(0, 0, W, H); // moldura branca
    c.fillStyle = "#a9a8a3"; c.fillRect(W * 0.06, H * 0.07, W * 0.88, H * 0.66); // concreto
    ruido(c, W, H * 0.7, 5000, ["rgba(0,0,0,0.05)", "rgba(255,255,255,0.07)"]);
    // vidro espelhado (céu refletido) com arco azul-marinho no canto de cima
    const x0 = W * 0.4, x1 = W * 0.91, y0 = H * 0.17, y1 = H * 0.73, r = H * 0.14;
    const vidro = c.createLinearGradient(0, y0, 0, y1);
    vidro.addColorStop(0, "#5f8fc9"); vidro.addColorStop(0.55, "#a8c6e4"); vidro.addColorStop(1, "#4d6f57");
    c.beginPath(); c.moveTo(x0, y1); c.lineTo(x0, y0 + r); c.quadraticCurveTo(x0, y0, x0 + r, y0); c.lineTo(x1, y0); c.lineTo(x1, y1); c.closePath();
    c.fillStyle = vidro; c.fill();
    c.strokeStyle = "rgba(20,30,50,0.55)"; c.lineWidth = 2;
    for (let x = x0 + 40; x < x1; x += 46) { c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); }
    for (let y = y0 + 40; y < y1; y += 44) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
    c.lineWidth = 16; c.strokeStyle = "#1f3a8a";
    c.beginPath(); c.moveTo(x0, y1); c.lineTo(x0, y0 + r); c.quadraticCurveTo(x0, y0, x0 + r, y0); c.lineTo(W * 0.965, y0); c.stroke();
    // marquise branca e letreiro
    c.fillStyle = "#f4f4f1"; c.fillRect(W * 0.04, H * 0.47, W * 0.72, H * 0.04);
    c.fillStyle = "#ffffff"; c.textBaseline = "alphabetic"; c.textAlign = "left";
    c.font = `600 ${Math.round(H * 0.06)}px 'Baloo 2', sans-serif`; c.fillText("igreja", W * 0.19, H * 0.31);
    c.font = `800 ${Math.round(H * 0.12)}px 'Baloo 2', sans-serif`; c.fillText("reviver", W * 0.19, H * 0.42);
    // porta de vidro escura, canteiro e pátio
    c.fillStyle = "#1c2230"; c.fillRect(W * 0.36, H * 0.55, W * 0.04, H * 0.18);
    c.fillStyle = "#3f7a3a"; c.fillRect(W * 0.06, H * 0.62, W * 0.29, H * 0.11);
    c.fillStyle = "#bdb8ae"; c.fillRect(0, H * 0.75, W, H * 0.25);
    ruido(c, W, H, 3000, ["rgba(0,0,0,0.06)"]);
  });
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
  return mesclarLocal(g);
}

// Carro aberto (conversível) que o Rabisco dirige: motorista à esquerda, carona à direita (mão brasileira).
// Sem capota, para o Rabisco e a criança aparecerem de qualquer ângulo. Frente do carro = +z local.
export function carroAberto(cor) {
  const g = new THREE.Group();
  const lata = std(cor, { metalness: 0.35, roughness: 0.35 });
  const preto = std(0x1d1d1d, { roughness: 0.9 });
  const banco = std(0xf4efe4, { roughness: 0.7 });
  const corpo = caixa(2.3, 0.8, 4.6, lata); corpo.position.y = 0.75;
  const capo = caixa(2.2, 0.25, 1.5, lata); capo.position.set(0, 1.25, 1.45);
  const porta = caixa(2.3, 0.3, 0.9, lata); porta.position.set(0, 1.27, -1.75); // porta-malas
  g.add(corpo, capo, porta);
  // laterais um pouco mais altas (as portas) e o vidro da frente transparente
  for (const s of [-1, 1]) { const l = caixa(0.18, 0.35, 2.2, lata); l.position.set(s * 1.06, 1.3, -0.25); g.add(l); }
  const vidro = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.42), std(0xbfe6ff, { transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide }));
  vidro.position.set(0, 1.55, 0.7); vidro.rotation.x = -0.35; g.add(vidro);
  const moldura = caixa(2.1, 0.08, 0.08, preto); moldura.position.set(0, 1.75, 0.63); g.add(moldura);
  // dois bancos (assento + encosto)
  const assentos = [];
  for (const x of [0.5, -0.5]) {
    const a = caixa(0.8, 0.22, 0.8, banco); a.position.set(x, 1.05, -0.45);
    const e = caixa(0.8, 0.42, 0.2, banco); e.position.set(x, 1.3, -0.95); // encosto baixo: os dois aparecem de trás
    g.add(a, e);
    assentos.push(new THREE.Vector3(x, 1.16, -0.38));
  }
  // volante do lado do motorista (esquerda = +x)
  const volante = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 8, 16), preto);
  volante.position.set(0.5, 1.55, 0.25); volante.rotation.x = -1.0;
  g.add(volante);
  g.userData.rodas = [];
  for (const [x, z] of [[-1.1, 1.45], [1.1, 1.45], [-1.1, -1.45], [1.1, -1.45]]) {
    const roda = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.32, 16), preto);
    roda.rotation.z = Math.PI / 2; roda.position.set(x, 0.44, z); roda.castShadow = true;
    g.add(roda); g.userData.rodas.push(roda);
    const calota = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 12), std(0xdddddd, { metalness: 0.6, roughness: 0.3 }));
    calota.rotation.z = Math.PI / 2; calota.position.set(x, 0.44, z); g.add(calota);
  }
  for (const x of [-0.75, 0.75]) {
    const farol = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 0.7 }));
    farol.position.set(x, 0.95, 2.31); g.add(farol);
    const lanterna = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0xff2020, emissiveIntensity: 0.4 }));
    lanterna.position.set(x, 0.95, -2.31); lanterna.rotation.y = Math.PI; g.add(lanterna);
  }
  // seta flutuante "entre aqui" (o jogo mostra quando o Rabisco está a pé)
  const seta = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xffcc1f }));
  seta.rotation.x = Math.PI; seta.position.y = 3.2;
  g.add(seta);
  Object.assign(g.userData, { motorista: assentos[0], carona: assentos[1], volante, seta, cor });
  return mesclarLocal(g, [corpo, ...g.userData.rodas, volante, seta]); // o corpo fica separado: o minimapa e o pátio usam a cor dele
}

// Pátio de carros da J.E Multimarcas (PATIO_JE, mapa.js): piso de bloquinhos, cerca baixa com o portão aberto
// para a Rua Leste (arco preto com o letreiro), mastros nos cantos e bandeirolas coloridas (uma malha só, com cor
// por vértice). Os carros expostos são do jogo (jogo.js), porque o escolhido vira carro de dirigir.
function patioJE(cena, solido) {
  const P = PATIO_JE, w = P.x1 - P.x0, d = P.z1 - P.z0, cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;
  const g = new THREE.Group(); cena.add(g);
  const texPiso = texturaCanvas(256, 256, (c, W, H) => {
    c.fillStyle = "#9a9a96"; c.fillRect(0, 0, W, H);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { const v = 176 + Math.floor(Math.random() * 30); c.fillStyle = `rgb(${v},${v - 2},${v - 8})`; c.fillRect(x * 64 + (y % 2) * 32 + 2, y * 32 + 2, 60, 28); }
  }, { repetir: true });
  texPiso.repeat.set(w / 4, d / 4);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(0xffffff, { map: texPiso, roughness: 0.9 }));
  piso.rotation.x = -Math.PI / 2; piso.position.set(cx, 0.045, cz); piso.receiveShadow = true; g.add(piso);
  // cerca: postes (uma malha instanciada) e duas travessas brancas por lado; o lado da rua tem o vão do portão
  const [p0, p1] = P.portao;
  const lados = [[[P.x0, P.z0], [P.x1, P.z0]], [[P.x1, P.z0], [P.x1, P.z1]], [[P.x1, P.z1], [P.x0, P.z1]], [[P.x0, P.z1], [P.x0, p1]], [[P.x0, p0], [P.x0, P.z0]]];
  const branco = std(0xffffff, { roughness: 0.5 }), preto = std(0x1d1d1d, { roughness: 0.5 });
  const postes = [];
  for (const [[ax, az], [bx, bz]] of lados) {
    const l = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(l / 2.2));
    for (let i = 0; i <= n; i++) postes.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
    for (const y of [0.55, 1.05]) { const t = caixa(Math.abs(bx - ax) + 0.12, 0.1, Math.abs(bz - az) + 0.12, branco); t.position.set((ax + bx) / 2, y, (az + bz) / 2); t.castShadow = false; g.add(t); }
    solidos(ax, az, bx, bz);
  }
  function solidos(ax, az, bx, bz) { solido((ax + bx) / 2, (az + bz) / 2, Math.abs(bx - ax) + 0.3, Math.abs(bz - az) + 0.3, 2.5); }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.3, 0.14), preto, postes.length);
  const m4 = new THREE.Matrix4();
  postes.forEach(([x, z], i) => { m4.makeTranslation(x, 0.65, z); im.setMatrixAt(i, m4); });
  im.castShadow = true; g.add(im);
  // portão: dois pilares, o arco com o letreiro (de frente para a Rua Leste) e as folhas abertas para dentro
  for (const z of [p0, p1]) { const pil = caixa(0.6, 3.6, 0.6, preto); pil.position.set(P.x0, 1.8, z); g.add(pil); solido(P.x0, z, 0.7, 0.7, 4); }
  const viga = caixa(0.4, 0.5, p1 - p0 + 0.6, preto); viga.position.set(P.x0, 3.75, (p0 + p1) / 2); g.add(viga);
  const texArco = texturaCanvas(1024, 160, (c, W, H) => {
    c.fillStyle = "#151515"; c.fillRect(0, 0, W, H);
    for (const [x, cor] of [[40, "#1e6fe0"], [80, "#3fa9f5"], [120, "#e53935"]]) { c.fillStyle = cor; c.beginPath(); c.moveTo(x + 30, 30); c.lineTo(x + 60, 30); c.lineTo(x + 30, 130); c.lineTo(x, 130); c.fill(); }
    c.font = "900 92px 'Baloo 2', sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillStyle = "#ffffff"; c.fillText("J.E Multimarcas", 210, 86);
    c.font = "800 34px 'Baloo 2', sans-serif"; c.fillStyle = "#ffcc1f"; c.textAlign = "right"; c.fillText("★ pátio ★", W - 30, 40);
  });
  const arco = new THREE.Mesh(new THREE.PlaneGeometry(p1 - p0 - 0.6, 1.5), std(0xffffff, { map: texArco, emissive: 0xffffff, emissiveMap: texArco, emissiveIntensity: 0.3 }));
  arco.position.set(P.x0 - 0.25, 4.4, (p0 + p1) / 2); arco.rotation.y = -Math.PI / 2; g.add(arco);
  const costas = arco.clone(); costas.position.x = P.x0 + 0.25; costas.rotation.y = Math.PI / 2; g.add(costas);
  const texGrade = texturaCanvas(128, 64, (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = "#1d1d1d"; c.fillRect(0, 0, W, 6); c.fillRect(0, H - 6, W, 6); c.fillRect(0, 0, 6, H); c.fillRect(W - 6, 0, 6, H); for (let x = 16; x < W; x += 16) c.fillRect(x, 0, 3, H); });
  const folhaMat = std(0xffffff, { map: texGrade, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  for (const [z, s] of [[p0, 1], [p1, -1]]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), folhaMat); f.position.set(P.x0 + 1.4, 0.75, z + s * 0.35); g.add(f); }
  // mastros nos cantos e bandeirolas penduradas (cordões com triângulos coloridos numa malha só)
  const topos = [[P.x0, P.z0], [P.x1, P.z0], [P.x1, P.z1], [P.x0, P.z1]].map(([x, z]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.2, 8), branco); m.position.set(x, 2.6, z); g.add(m); return [x, 5.1, z]; });
  const portaoTopo = [[P.x0, 4.1, p0], [P.x0, 4.1, p1]];
  const cordoes = [[topos[0], portaoTopo[0]], [portaoTopo[1], topos[3]], [topos[0], topos[1]], [topos[1], topos[2]], [topos[2], topos[3]], [topos[0], topos[2]], [topos[3], topos[1]]];
  const CORES = [0xe53935, 0xffc928, 0x1e6fe0, 0x2bb24c, 0xec2e8c, 0xff7a00].map((c) => new THREE.Color(c));
  const pos = [], cor = [], linha = [];
  let k = 0;
  for (const [a, b] of cordoes) {
    const l = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(2, Math.floor(l / 0.9));
    const ponto = (f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f - Math.sin(Math.PI * f) * Math.min(1.2, l * 0.05), a[2] + (b[2] - a[2]) * f];
    for (let i = 0; i < n; i++) linha.push(...ponto(i / n), ...ponto((i + 1) / n));
    for (let i = 1; i < n; i++) {
      const p = ponto(i / n), q = ponto((i + 0.6) / n), c = CORES[k++ % CORES.length];
      const meio = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 0.5, (p[2] + q[2]) / 2];
      pos.push(...p, ...q, ...meio);
      for (let v = 0; v < 3; v++) cor.push(c.r, c.g, c.b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3)); geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 })));
  const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(linha, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x333333 })));
  return g;
}

// Heliponto (HELIPONTO, mapa.js): piso redondo com o "H", anel amarelo, luzinhas e a biruta laranja
function heliponto(cena) {
  const g = new THREE.Group(); g.position.set(HELIPONTO.x, 0, HELIPONTO.z); cena.add(g);
  const tex = texturaCanvas(512, 512, (c, w, h) => {
    c.fillStyle = "#5c6470"; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
    c.lineWidth = 34; c.strokeStyle = "#ffcc1f"; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 40, 0, 7); c.stroke();
    c.fillStyle = "#ffffff"; c.font = "900 300px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("H", w / 2, h / 2 + 20);
  });
  const piso = new THREE.Mesh(new THREE.CylinderGeometry(HELIPONTO.r, HELIPONTO.r + 0.2, 0.14, 40), [std(0x5c6470), std(0xffffff, { map: tex, roughness: 0.8 }), std(0x5c6470)]);
  piso.position.y = 0.07; piso.receiveShadow = true; g.add(piso);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x7fd6ff : 0x2bff7a })); l.position.set(Math.cos(a) * (HELIPONTO.r + 0.35), 0.2, Math.sin(a) * (HELIPONTO.r + 0.35)); g.add(l); }
  const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4, 8), std(0xffffff)); mastro.position.set(HELIPONTO.r + 2, 2, -HELIPONTO.r + 1); g.add(mastro);
  const biruta = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 12, 1, true), std(0xff7a00, { side: THREE.DoubleSide })); biruta.rotation.z = Math.PI / 2 - 0.15; biruta.position.set(HELIPONTO.r + 2.8, 3.8, -HELIPONTO.r + 1); g.add(biruta);
  return g;
}
// Placa de pé na frente das escolas: nome e idade (Kids I bem colorida e fofinha, Kids II no azul da Educarte)
function totemEscola(texto, idade, cores) {
  const g = new THREE.Group();
  const tex = texturaCanvas(512, 256, (c, w, h) => {
    c.fillStyle = cores.borda; c.beginPath(); c.roundRect(0, 0, w, h, 48); c.fill();
    c.fillStyle = cores.fundo; c.beginPath(); c.roundRect(14, 14, w - 28, h - 28, 38); c.fill();
    let tam = 92; c.font = `900 ${tam}px 'Baloo 2', sans-serif`;
    while (c.measureText(texto).width > w - 60) { tam -= 4; c.font = `900 ${tam}px 'Baloo 2', sans-serif`; }
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = cores.texto; c.fillText(texto, w / 2, 100);
    c.font = "800 44px 'Baloo 2', sans-serif"; c.fillStyle = cores.idade; c.fillText(idade, w / 2, 190);
  });
  const placaM = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), std(0xffffff, { map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
  placaM.position.y = 2.5; g.add(placaM);
  for (const x of [-1.5, 1.5]) { const p = caixa(0.16, 1.7, 0.16, std(0xffffff)); p.position.set(x, 0.85, -0.02); g.add(p); }
  return g;
}
// Educarte Kids I (berçário até 4 anos): prédio térreo creme com três telhados em tons suaves (rosa, menta e azul
// bebê), janelas redondas, porta amarela em arco com o letreiro, e ao lado o parquinho de bebê cercado: piso de
// EVA colorido, escorregador baixinho, piscina de bolinhas, patinho de balanço e caixa de areia.
function escolaKids1() {
  const g = new THREE.Group();
  const creme = std(0xfff3e0), W = 16, D = 9, H = 4.2;
  const corpo = caixa(W, H, D, creme); corpo.position.set(0, H / 2, 3.08 - D / 2); g.add(corpo);
  [[-5.4, 0xf7b5cf], [0, 0xa8e6cf], [5.4, 0xa9d6f5]].forEach(([x, cor]) => { const t = telhado(5.2, D, 2.4, cor); t.position.set(x, H, 3.08 - D / 2); g.add(t); });
  // janelas redondas com moldura colorida
  [[-5.6, 0xf7b5cf], [-3.2, 0xffe08a], [3.2, 0xa8e6cf], [5.6, 0xa9d6f5]].forEach(([x, cor]) => {
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.14, 8, 24), std(cor, { roughness: 0.5 })); aro.position.set(x, 2.3, 3.12); g.add(aro);
    const vidro = new THREE.Mesh(new THREE.CircleGeometry(0.78, 24), std(0x9fd6ff, { roughness: 0.2, emissive: 0x9fd6ff, emissiveIntensity: 0.2 })); vidro.position.set(x, 2.3, 3.1); g.add(vidro);
  });
  // porta amarela em arco
  const porta = caixa(1.8, 2.0, 0.2, std(0xffd36b, { roughness: 0.5 })); porta.position.set(0, 1.0, 3.12); g.add(porta);
  const arco = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 20, 1, false, 0, Math.PI), std(0xffd36b, { roughness: 0.5 })); arco.rotation.set(Math.PI / 2, Math.PI / 2, 0); arco.position.set(0, 2.0, 3.12); g.add(arco);
  // letreiro com a logo
  const texL = texturaCanvas(768, 192, (c, w, h) => {
    c.fillStyle = "#ffffff"; c.beginPath(); c.roundRect(0, 0, w, h, 60); c.fill();
    c.lineWidth = 10; c.strokeStyle = "#f7b5cf"; c.beginPath(); c.roundRect(5, 5, w - 10, h - 10, 56); c.stroke();
    c.font = "900 88px 'Baloo 2', sans-serif"; c.textAlign = "left"; c.textBaseline = "middle";
    const partes = [["E", "#ec2e8c"], ["d", "#ff9f43"], ["u", "#ffcc1f"], ["c", "#58c43a"], ["a", "#00b5f0"], ["r", "#8e6cff"], ["t", "#ec2e8c"], ["e", "#ff9f43"]];
    let x = 60; for (const [l, cor] of partes) { c.fillStyle = cor; c.fillText(l, x, 82); x += c.measureText(l).width + 2; }
    c.fillStyle = "#3d7ad9"; c.font = "900 80px 'Baloo 2', sans-serif"; c.textAlign = "right"; c.fillText("Kids I", w - 50, 84); c.textAlign = "center";
    c.fillStyle = "#9a7ab8"; c.font = "700 32px 'Baloo 2', sans-serif"; c.fillText("berçário · 4 meses a 4 anos", w / 2, 160);
  });
  const let1 = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.2), std(0xffffff, { map: texL, emissive: 0xffffff, emissiveMap: texL, emissiveIntensity: 0.25 })); let1.position.set(0, 3.6, 3.2); g.add(let1);
  // parquinho de bebê ao lado (lado +x local)
  const pq = new THREE.Group(); pq.position.set(W / 2 + 4.6, 0, 0); g.add(pq);
  const texEva = texturaCanvas(256, 256, (c) => { const cs = ["#f7b5cf", "#a8e6cf", "#a9d6f5", "#ffe08a"]; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = cs[(x + y) % 4]; c.fillRect(x * 64, y * 64, 64, 64); } }, { repetir: true });
  texEva.repeat.set(2, 3);
  const eva = new THREE.Mesh(new THREE.PlaneGeometry(8, 12), std(0xffffff, { map: texEva, roughness: 0.95 })); eva.rotation.x = -Math.PI / 2; eva.position.set(0, 0.05, -1.6); eva.receiveShadow = true; pq.add(eva);
  // cerquinha baixa
  const cerca = std(0xffffff, { roughness: 0.5 });
  for (const [x, z, w2, d2] of [[0, -7.6, 8, 0.1], [4, -1.6, 0.1, 12], [-4, -1.6, 0.1, 12]]) { const c = caixa(w2, 0.7, d2, cerca); c.position.set(x, 0.35, z); pq.add(c); }
  // escorregador baixinho
  const esc = caixa(1.0, 0.1, 2.6, std(0xf7b5cf, { roughness: 0.3 })); esc.position.set(-2, 0.65, -4.6); esc.rotation.x = 0.42; pq.add(esc);
  const tor = caixa(1.2, 1.1, 1.2, std(0xa9d6f5)); tor.position.set(-2, 0.55, -6.3); pq.add(tor);
  // piscina de bolinhas (uma malha instanciada)
  const borda = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.6, 24, 1, true), std(0xa8e6cf, { side: THREE.DoubleSide })); borda.position.set(1.6, 0.3, -4.2); pq.add(borda);
  const bolas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), std(0xffffff, { roughness: 0.4 }), 60);
  const m4 = new THREE.Matrix4(), cor = new THREE.Color(), cs = [0xf7b5cf, 0xa8e6cf, 0xa9d6f5, 0xffe08a, 0xffffff];
  for (let i = 0; i < 60; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 1.4; m4.makeTranslation(1.6 + Math.cos(a) * rr, 0.35 + r() * 0.15, -4.2 + Math.sin(a) * rr); bolas.setMatrixAt(i, m4); bolas.setColorAt(i, cor.setHex(cs[i % 5])); }
  pq.add(bolas);
  // patinho de balanço (mola) e caixa de areia
  const mola = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8), std(0x999999, { metalness: 0.5 })); mola.position.set(-2, 0.25, 0.6); pq.add(mola);
  const pato = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), std(0xffd84a, { roughness: 0.5 })); pato.scale.set(0.8, 0.7, 1.2); pato.position.set(-2, 0.75, 0.6); pq.add(pato);
  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), std(0xffd84a)); cab.position.set(-2, 1.2, 1.0); pq.add(cab);
  const bico = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 8), std(0xff8a1f)); bico.rotation.x = Math.PI / 2; bico.position.set(-2, 1.18, 1.35); pq.add(bico);
  const areia = caixa(2.6, 0.25, 2.6, std(0xf2dca0, { roughness: 1 })); areia.position.set(1.6, 0.13, 0.6); pq.add(areia);
  for (const [x, z, c] of [[1.2, 0.3, 0xec2e8c], [2.0, 0.9, 0x00b5f0]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.25, 10), std(c)); b.position.set(x, 0.38, z); pq.add(b); }
  return g;
}

// ---------- montagem
// Fita ao longo de uma linha (asfalto, calçada, faixa amarela): de "a" até "b" de distância lateral.
// pular(x, z): não desenha aquele pedacinho (ex.: calçada em cima de outra rua).
function densificar(pts, fechada, passo = 4) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < (fechada ? n : n - 1); i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n];
    const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / passo));
    for (let s = 0; s < k; s++) out.push([ax + ((bx - ax) * s) / k, az + ((bz - az) * s) / k]);
  }
  if (!fechada) out.push(pts[n - 1]);
  return out;
}
function normais(pts, fechada) {
  const n = pts.length, ns = [];
  for (let i = 0; i < n; i++) {
    const a = pts[fechada ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[fechada ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    ns.push([-dz / l, dx / l]); // direita de quem anda no sentido da linha
  }
  return ns;
}
function fita(cena, pts, fechada, a, b, y, mat, repV, pular = null) {
  const p = densificar(pts, fechada), ns = normais(p, fechada);
  const pos = [], uv = [], ind = [];
  let v = 0, n = 0;
  const total = fechada ? p.length : p.length - 1;
  for (let i = 0; i < total; i++) {
    const j = (i + 1) % p.length;
    const seg = Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1]);
    const mx = (p[i][0] + p[j][0]) / 2 + ns[i][0] * (a + b) / 2, mz = (p[i][1] + p[j][1]) / 2 + ns[i][1] * (a + b) / 2;
    if (!pular || !pular(mx, mz)) {
      for (const [k, vv] of [[i, v], [j, v + seg / repV]]) {
        pos.push(p[k][0] + ns[k][0] * a, y, p[k][1] + ns[k][1] * a, p[k][0] + ns[k][0] * b, y, p[k][1] + ns[k][1] * b);
        uv.push(0, vv, 1, vv);
      }
      ind.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
      n += 4;
    }
    v += seg / repV;
  }
  if (!n) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(ind);
  geo.computeVertexNormals();
  // a ordem dos vértices pode virar a face para baixo: desenha dos dois lados
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  cena.add(m);
  return m;
}

// roda-gigante do parque: ponto de referência que aparece de longe
function rodaGigante() {
  const g = new THREE.Group();
  const metal = std(0xffffff, { metalness: 0.3, roughness: 0.4 });
  for (const s of [-1, 1]) for (const k of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 12.5, 8), metal);
    p.position.set(k * 3.2, 6, s * 1.4); p.rotation.z = -k * 0.26; p.castShadow = true; g.add(p);
  }
  const roda = new THREE.Group();
  roda.position.y = 11.6;
  const aro = new THREE.Mesh(new THREE.TorusGeometry(8, 0.22, 8, 40), std(0xec2e8c, { metalness: 0.3, roughness: 0.4 }));
  roda.add(aro);
  const cores = [0x00b5f0, 0xffcc1f, 0xff7a00, 0x58c43a, 0x8e6cff, 0xec2e8c, 0xe63946, 0x1fc08e];
  const cabines = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const raio = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 8, 6), metal);
    raio.rotation.z = a; roda.add(raio);
    const cab = caixa(1.3, 1.2, 1.3, std(cores[i], { roughness: 0.5 }));
    cab.position.set(Math.cos(a) * 8, Math.sin(a) * 8 - 0.7, 0);
    roda.add(cab); cabines.push(cab);
  }
  g.add(roda);
  g.userData = { roda, cabines };
  return g;
}

// ---------- desempenho: junta as peças paradas da cidade (prédios, casas, árvores, ruas, calçadas, cercas...) em
// poucas malhas, por quadrado de CELULA metros e por "material igual" (mesma cor, textura, brilho...). O visual não
// muda (cada peça vira triângulos com a posição de mundo já aplicada) e o número de desenhos por quadro cai muito.
// Cada quadrado continua sendo cortado pela câmera (o que está fora da tela não é desenhado). Ficam de fora as peças
// que mudam durante o jogo (userData.dinamico: semáforos, roda-gigante, caixas de correio, lojas com foto).
const CELULA = 60;
function mesclarEstaticos(cena, objetos) {
  const grupos = new Map();
  const tirar = [];
  for (const raiz of objetos) {
    raiz.updateMatrixWorld(true);
    raiz.traverse((o) => {
      if (o.userData.dinamico) return;
      if (!o.isMesh || o.isInstancedMesh || !o.visible || o.matrixWorld.determinant() <= 0) return;
      for (let p = o.parent; p; p = p.parent) if (p.userData.dinamico) return;
      const g = o.geometry;
      if (!g.attributes.position || g.morphAttributes?.position) return;
      if (!g.boundingBox) g.computeBoundingBox();
      const centro = g.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld);
      const cel = `${Math.floor(centro.x / CELULA)},${Math.floor(centro.z / CELULA)}`;
      const attrs = Object.keys(g.attributes).sort().join(",");
      // malha com vários materiais (ex.: prédio com fachada nos lados e cinza em cima): cada pedaço vai para o seu grupo
      const total = g.index ? g.index.count : g.attributes.position.count;
      const pedacos = Array.isArray(o.material) ? g.groups.map((q) => ({ mat: o.material[q.materialIndex], ini: q.start, n: Math.min(q.count, total - q.start) })) : [{ mat: o.material, ini: 0, n: total }];
      if (!pedacos.length || pedacos.some((q) => !q.mat)) return;
      for (const q of pedacos) {
        const k = `${cel}#${chaveMaterial(q.mat)}#${o.castShadow}${o.receiveShadow}#${attrs}#${o.renderOrder}`;
        if (!grupos.has(k)) grupos.set(k, { mat: q.mat, sombra: o.castShadow, recebe: o.receiveShadow, ordem: o.renderOrder, malhas: [] });
        grupos.get(k).malhas.push({ o, ini: q.ini, n: q.n });
      }
      tirar.push(o);
    });
  }
  for (const gr of grupos.values()) {
    const geo = juntarGeometrias(gr.malhas.map((q) => ({ ...q, m: q.o.matrixWorld })));
    const m = new THREE.Mesh(geo, gr.mat);
    m.castShadow = gr.sombra; m.receiveShadow = gr.recebe; m.renderOrder = gr.ordem; m.matrixAutoUpdate = false;
    cena.add(m);
  }
  for (const o of tirar) o.removeFromParent();
  // grupos que ficaram vazios saem da cena (menos coisa para percorrer a cada quadro)
  for (const raiz of objetos) { let vazio = true; raiz.traverse((o) => { if (o.isMesh || o.isLine || o.isSprite || o.isLight) vazio = false; }); if (vazio) raiz.removeFromParent(); }
}

export function montarCidade(cena) {
  const antes = new Set(cena.children);
  const solidos = [];     // { x0, x1, z0, z1, y1 } — prédios, muros e coisas grandes
  const circulos = [];    // { x, z, r } — lago e chafariz (não dá para entrar)
  const lugares = [];     // { id, nome, x, z, raio, dir } — para o passaporte e o mapa
  const casas = [];       // { cor, numero, correio, x, z, vovo }
  const semaforos = [];   // { x, z, postes, fase, wX, wZ }
  const faixas = [];      // { x0, x1, z0, z1, atravessa, cruz, largura }
  const arvores = [];
  const tex = { logo: carregarTextura("../../assets/marca/logos/azul-icone-rosa.png"), icone: carregarTextura("../../assets/marca/logos/icone-branco.png") };
  const solido = (cx, cz, w, d, h = 20) => solidos.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, y1: h });
  const ocupado = (x, z, folga = 0) => solidos.some((s) => x > s.x0 - folga && x < s.x1 + folga && z > s.z0 - folga && z < s.z1 + folga);
  // local (lx, lz) de um grupo girado em rot (múltiplos de 90°) → mundo
  const mundoDe = (ox, oz, rot, lx, lz) => [ox + lx * Math.cos(rot) + lz * Math.sin(rot), oz - lx * Math.sin(rot) + lz * Math.cos(rot)];
  const solidoGirado = (ox, oz, rot, lx, lz, w, d, h = 20) => {
    const [x, z] = mundoDe(ox, oz, rot, lx, lz);
    const deitado = Math.abs(Math.sin(rot)) > 0.5;
    solido(x, z, deitado ? d : w, deitado ? w : d, h);
  };

  // ---------- chão
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), std(0xffffff, { map: texGrama }));
  texGrama.repeat.set(140, 140);
  chao.rotation.x = -Math.PI / 2; chao.position.y = -0.02; chao.receiveShadow = true;
  cena.add(chao);

  // ---------- ruas: calçada (embaixo), asfalto e faixa amarela (só fora dos cruzamentos)
  texAsfalto.repeat.set(1, 1);
  const matAsfalto = std(0xffffff, { map: texAsfalto, roughness: 0.95, side: THREE.DoubleSide });
  const matCalcada = std(0xffffff, { map: texCalcada, roughness: 0.9, side: THREE.DoubleSide });
  texCalcada.repeat.set(1, 1);
  const linhas = texturaCanvas(64, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#f2c230"; for (let y = 0; y < h; y += 64) c.fillRect(0, y, w, 36);
  }, { repetir: true });
  const matLinhas = new THREE.MeshStandardMaterial({ map: linhas, transparent: true, roughness: 0.6, side: THREE.DoubleSide });
  const dentroDeOutra = (rua, folga) => (x, z) => distRua(x, z, rua).d < folga;
  RUAS.forEach((rua, i) => {
    for (const s of [1, -1]) fita(cena, rua.pts, rua.fechada, s * rua.w / 2, s * (rua.w / 2 + CALCADA), 0.03, matCalcada, 3, dentroDeOutra(rua, 0.4));
    fita(cena, rua.pts, rua.fechada, -rua.w / 2, rua.w / 2, 0.04 + i * 0.002, matAsfalto, 7);
    if (!rua.canteiro && rua.id !== "rotatoria") fita(cena, rua.pts, rua.fechada, -0.25, 0.25, 0.08, matLinhas, 11.5, dentroDeOutra(rua, 1.5));
  });
  // canteiro da avenida: ilha verde com árvores (baixinho: dá para pisar)
  const matCanteiro = std(0xffffff, { map: texGrama });
  for (const rua of RUAS.filter((r) => r.canteiro)) {
    const [[ax], [bx]] = rua.pts;
    const ini = Math.min(ax, bx), fim = Math.max(ax, bx);
    for (let x = ini; x < fim; x += 2) {
      const meio = x + 1;
      if (SEMAFOROS.some((s) => Math.abs(s.x - meio) < s.wZ / 2 + 5) || Math.abs(meio) > 116 || Math.abs(meio) < 24) continue;
      const c = new THREE.Mesh(new THREE.BoxGeometry(2, 0.25, 2.2), matCanteiro);
      c.position.set(meio, 0.12, 0); c.receiveShadow = true; cena.add(c);
      if (Math.round(meio) % 12 === 0) { const a = arvoreReal(0.85); a.position.set(meio, 0.2, 0); cena.add(a); arvores.push(a); solido(meio, 0, 0.8, 0.8, 6); }
    }
  }

  // ---------- cruzamentos com semáforo: faixas de pedestre nos 4 braços e um poste em cada esquina
  const matFaixa = std(0xf4f4f4, { roughness: 0.6 });
  for (const s of SEMAFOROS) {
    const grupo = new THREE.Group();
    // faixas na rua que corre em z (atravessa andando em x)
    for (const lado of [-1, 1]) {
      const zc = s.z + lado * (s.wX / 2 + 1.8);
      for (let x = -s.wZ / 2 + 0.8; x <= s.wZ / 2 - 0.6; x += 1.35) {
        const listra = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 3), matFaixa);
        listra.rotation.x = -Math.PI / 2; listra.position.set(s.x + x, 0.09, zc); cena.add(listra);
      }
      faixas.push({ x0: s.x - s.wZ / 2, x1: s.x + s.wZ / 2, z0: zc - 1.6, z1: zc + 1.6, atravessa: "z", cruz: s, largura: s.wZ });
      const xc = s.x + lado * (s.wZ / 2 + 1.8);
      for (let z = -s.wX / 2 + 0.8; z <= s.wX / 2 - 0.6; z += 1.35) {
        if (Math.abs(z) < 1.3 && s.wX > 14) continue; // canteiro da avenida
        const listra = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.8), matFaixa);
        listra.rotation.x = -Math.PI / 2; listra.position.set(xc, 0.09, s.z + z); cena.add(listra);
      }
      faixas.push({ x0: xc - 1.6, x1: xc + 1.6, z0: s.z - s.wX / 2, z1: s.z + s.wX / 2, atravessa: "x", cruz: s, largura: s.wX });
    }
    const postes = [];
    for (const [sx, sz, rot] of [[1, 1, Math.PI], [-1, -1, 0], [1, -1, -Math.PI / 2], [-1, 1, Math.PI / 2]]) {
      const p = semaforo();
      p.position.set(s.x + sx * (s.wZ / 2 + 0.8), 0.03, s.z + sz * (s.wX / 2 + 0.8));
      p.rotation.y = rot;
      p.userData.eixo = rot === 0 || rot === Math.PI ? "z" : "x";
      grupo.add(p);
      postes.push(p);
      solido(p.position.x, p.position.z, 0.4, 0.4, 5);
    }
    cena.add(grupo);
    semaforos.push({ ...s, postes, fase: (s.x + s.z) % 2 ? 0 : 6 });
  }

  // ---------- os lugares da cidade
  const info = {
    biblioteca: ["Biblioteca", "#c9b28a", 3, "#8e6cff"], padaria: ["Padaria", "#f2d0a4", 2, "#ff7a00"], hospital: ["Hospital", "#f4f4f4", 4, "#e63946"],
    bombeiros: ["Bombeiros", "#d94a3d", 2, "#e63946"], correio: ["Correio", "#f2d34c", 2, "#1d6fe0"], mercado: ["Mercado", "#cfe3c9", 2, "#2bb24c"],
  };
  for (const l of LUGARES) {
    lugares.push({ ...l });
    // lojas parceiras e a Igreja Reviver: frente com a foto real da fachada
    const fotoReal = l.parceiro ?? (l.id === "igreja" ? { ...IGREJA, provisoria: fachadaIgreja } : null);
    if (fotoReal) {
      const M = medidas(fotoReal);
      const ox = l.x - l.dir[0] * l.recuo, oz = l.z - l.dir[1] * l.recuo;
      // colisão: o mesmo retângulo é ajustado quando a foto chega e o prédio muda de largura
      const s = { x0: 0, x1: 0, z0: 0, z1: 0, y1: 20 };
      solidos.push(s);
      const loja = lojaParceira(fotoReal, (w) => {
        const [cx, cz] = mundoDe(ox, oz, l.rot, 0, M.frente - M.d / 2);
        const deitado = Math.abs(Math.sin(l.rot)) > 0.5, sx = (deitado ? M.d : w) / 2 + 0.2, sz = (deitado ? w : M.d) / 2 + 0.2;
        Object.assign(s, { x0: cx - sx, x1: cx + sx, z0: cz - sz, z1: cz + sz });
      });
      loja.position.set(ox, 0.03, oz); loja.rotation.y = l.rot; loja.userData.dinamico = true; // a foto chega depois e muda o tamanho
      cena.add(loja);
      continue;
    }
    if (!["escola", "kids1", ...Object.keys(info)].includes(l.id)) continue;
    const ox = l.x - l.dir[0] * l.recuo, oz = l.z - l.dir[1] * l.recuo;
    const grupo = new THREE.Group();
    grupo.position.set(ox, 0.03, oz);
    grupo.rotation.y = l.rot;
    cena.add(grupo);
    if (l.id === "escola") {
      const e = escolaEducarte3D(tex.logo, tex.icone);
      e.scale.setScalar(0.42); e.position.z = -2; grupo.add(e);
      solidoGirado(ox, oz, l.rot, 0, -2, 24, 12);
      const t = totemEscola("Educarte Kids II", "5 a 12 anos", { borda: "#1d6fe0", fundo: "#ffffff", texto: "#1d6fe0", idade: "#ec2e8c" }); t.position.set(-9, 0, 5.4); grupo.add(t);
    } else if (l.id === "kids1") {
      grupo.add(escolaKids1());
      solidoGirado(ox, oz, l.rot, 0, 3.08 - 4.5, 16.4, 9.4, 8);
      for (const [x, z, w, d] of [[12.6, -7.6, 8, 0.4], [16.6, -1.6, 0.4, 12], [8.6, -1.6, 0.4, 12]]) solidoGirado(ox, oz, l.rot, x, z, w, d, 1.2);
      const t = totemEscola("Educarte Kids I", "4 meses a 4 anos", { borda: "#f7b5cf", fundo: "#fffaf2", texto: "#ec2e8c", idade: "#3d9a7a" }); t.position.set(-7, 0, 5.4); grupo.add(t);
    } else {
      const [nome, cor, andares, corPlaca] = info[l.id];
      const { g: pr, h } = predio(20, 14, andares, cor, 0.1);
      pr.position.z = -4; grupo.add(pr);
      letreiro(grupo, nome, { y: Math.min(h - 1, 5.2), z: 3.08, largura: 10, cor: corPlaca });
      porta(grupo, { z: 3.08, w: 3, h: 3.4, cor: 0x5a3a20 });
      solidoGirado(ox, oz, l.rot, 0, -4, 20.4, 14.4);
      if (l.id === "hospital") { const c1 = caixa(3, 0.9, 0.2, std(0xe63946)); const c2 = caixa(0.9, 3, 0.2, std(0xe63946)); c1.position.set(0, h - 2, 3.1); c2.position.set(0, h - 2, 3.1); grupo.add(c1, c2); }
      if (l.id === "bombeiros") { const gar = caixa(6, 4, 0.3, std(0xeeeeee, { metalness: 0.3, roughness: 0.4 })); gar.position.set(5.5, 2, 3.1); grupo.add(gar); }
    }
  }

  // ---------- casas coloridas (com caixa de correio da cor da casa) e a casa da Vovó
  for (const c of CASAS) {
    const ox = c.x - c.dir[0] * 5.5, oz = c.z - c.dir[1] * 5.5, rot = Math.atan2(c.dir[0], c.dir[1]);
    const h = casa(c.hex, c.numero % 2 ? 0x7a3a2a : 0x5a4a3a, c.numero);
    h.position.set(ox, 0.03, oz); h.rotation.y = rot;
    cena.add(h);
    solido(ox, oz, 7.4, 7.4, 7);
    const [mx, mz] = mundoDe(ox, oz, rot, 2.8, 5.4);
    casas.push({ cor: c.cor, numero: c.numero, correio: h.userData.correio, x: mx, z: mz, vovo: Boolean(c.vovo), porta: [c.x, c.z] });
  }

  // ---------- praça na ilha da rotatória: piso, chafariz, bancos e árvores
  const piso = new THREE.Mesh(new THREE.CircleGeometry(PRACA.r, 40), std(0xffffff, { map: texCalcada, roughness: 0.9 }));
  piso.rotation.x = -Math.PI / 2; piso.position.set(PRACA.x, 0.05, PRACA.z); piso.receiveShadow = true; cena.add(piso);
  const ch = chafariz(); ch.position.set(PRACA.x, 0.05, PRACA.z); cena.add(ch);
  circulos.push({ x: PRACA.x, z: PRACA.z, r: 4.4 });
  for (const a of [0, 1, 2, 3]) {
    const ang = a * Math.PI / 2 + Math.PI / 4;
    const b = banco(); b.position.set(Math.sin(ang) * 8, 0.05, Math.cos(ang) * 8); b.rotation.y = ang + Math.PI; cena.add(b);
    const t = arvoreReal(1.1); t.position.set(Math.sin(ang + Math.PI / 4) * 10, 0.05, Math.cos(ang + Math.PI / 4) * 10); cena.add(t); arvores.push(t);
    solido(t.position.x, t.position.z, 0.8, 0.8, 6);
  }

  // ---------- parque: lago com patos, playground, roda-gigante e bosque
  const lago = new THREE.Mesh(new THREE.CircleGeometry(LAGO.r, 40), std(0x3aa7f0, { roughness: 0.15, metalness: 0.1 }));
  lago.rotation.x = -Math.PI / 2; lago.position.set(LAGO.x, 0.06, LAGO.z); cena.add(lago);
  const areia = new THREE.Mesh(new THREE.RingGeometry(LAGO.r, LAGO.r + 1.4, 40), std(0xe8d9a8, { roughness: 1 }));
  areia.rotation.x = -Math.PI / 2; areia.position.set(LAGO.x, 0.05, LAGO.z); cena.add(areia);
  circulos.push({ x: LAGO.x, z: LAGO.z, r: LAGO.r - 0.3 });
  const pg = playground(); pg.position.set(PLAYGROUND.x, 0.03, PLAYGROUND.z); pg.rotation.y = Math.PI; cena.add(pg);
  const roda = rodaGigante(); roda.position.set(58, 0, 104); roda.rotation.y = Math.PI / 2; cena.add(roda);
  solido(58, 104, 4.5, 9, 13);
  for (let n = 0; n < 16; n++) {
    const x = PARQUE.x0 + 3 + r() * (PARQUE.x1 - PARQUE.x0 - 6), z = PARQUE.z0 + 3 + r() * (PARQUE.z1 - PARQUE.z0 - 6);
    if (Math.hypot(x - LAGO.x, z - LAGO.z) < LAGO.r + 3 || Math.hypot(x - PLAYGROUND.x, z - PLAYGROUND.z) < 8 || Math.hypot(x - 58, z - 104) < 9 || distRua(x, z).d < CALCADA + 1) continue;
    const a = arvoreReal(1 + r() * 0.5); a.position.set(x, 0, z); cena.add(a); arvores.push(a);
    solido(x, z, 0.8, 0.8, 6);
  }
  for (const [x, z, rot] of [[LAGO.x - 13, LAGO.z, Math.PI / 2], [LAGO.x, LAGO.z - 13, 0]]) { const b = banco(); b.position.set(x, 0.03, z); b.rotation.y = rot; cena.add(b); }

  heliponto(cena);

  // ---------- pátio de carros da J.E (antes dos prédios de enchimento, que desviam da cerca)
  if (LUGARES.some((l) => l.parceiro?.id === "je-multimarcas")) patioJE(cena, solido);

  // ---------- prédios de morar e casinhas preenchendo o resto (sempre iguais, pela semente)
  const coresPredio = ["#d9c7a8", "#c9d6e3", "#e3c9c9", "#cfe3c9", "#e8dcc4", "#d4cce6", "#f0e0c0"];
  const coresCasa = [0xd9a3c9, 0x9fd0e8, 0xf2d49b, 0xb6dba0, 0xf0b49a];
  const reservado = (x, z) =>
    (x > PARQUE.x0 - 4 && x < PARQUE.x1 + 4 && z > PARQUE.z0 - 6 && z < PARQUE.z1 + 4) || Math.hypot(x, z) < 34 ||
    LUGARES.some((l) => Math.hypot(x - (l.x - l.dir[0] * (l.recuo + 6)), z - (l.z - l.dir[1] * (l.recuo + 6))) < 20) ||
    CASAS.some((c) => Math.hypot(x - c.x, z - c.z) < 12) || VAGAS.some((v) => Math.hypot(x - v.x, z - v.z) < 9) || Math.hypot(x - LARGADA.x, z - LARGADA.z) < 9;
  for (let gx = -114; gx <= 114; gx += 15) for (let gz = -114; gz <= 114; gz += 15) {
    const x = gx + (r() - 0.5) * 3, z = gz + (r() - 0.5) * 3;
    if (reservado(x, z)) continue;
    // fachada para a rua mais perto
    const d0 = distRua(x, z).d;
    if (d0 < CALCADA + 7) continue;
    const gxR = distRua(x + 1, z).d - distRua(x - 1, z).d, gzR = distRua(x, z + 1).d - distRua(x, z - 1).d;
    const dir = Math.abs(gxR) > Math.abs(gzR) ? [-Math.sign(gxR), 0] : [0, -Math.sign(gzR)];
    const rot = Math.atan2(dir[0], dir[1]);
    const ehCasa = z > 20 && r() < 0.5;
    const w = ehCasa ? 7.4 : 10 + r() * 3, d = ehCasa ? 7.4 : 10 + r() * 2;
    const cantos = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([lx, lz]) => mundoDe(x, z, rot, lx, lz));
    if (cantos.some(([cx, cz]) => distRua(cx, cz).d < CALCADA + 1.5 || ocupado(cx, cz, 1.5) || Math.abs(cx) > 118 || Math.abs(cz) > 118)) continue;
    if (ocupado(x, z, 2)) continue;
    let g;
    if (ehCasa) g = casa(coresCasa[Math.floor(r() * coresCasa.length)], r() < 0.5 ? 0x7a3a2a : 0x5a4a3a, 10 + Math.floor(r() * 80));
    else g = predio(w, d, 3 + Math.floor(r() * 7), coresPredio[Math.floor(r() * coresPredio.length)], 0.2).g;
    g.position.set(x, 0.03, z); g.rotation.y = rot;
    cena.add(g);
    const deitado = Math.abs(Math.sin(rot)) > 0.5;
    solido(x, z, (deitado ? d : w) + 0.4, (deitado ? w : d) + 0.4, ehCasa ? 7 : 30);
  }

  // ---------- árvores nas calçadas
  for (const rua of RUAS) {
    if (rua.id === "rotatoria" || rua.canteiro) continue;
    const pts = densificar(rua.pts, rua.fechada, 15), ns = normais(pts, rua.fechada);
    pts.forEach(([x, z], i) => {
      for (const s of [1, -1]) {
        const ax = x + ns[i][0] * s * (rua.w / 2 + CALCADA - 0.7), az = z + ns[i][1] * s * (rua.w / 2 + CALCADA - 0.7);
        if (distRua(ax, az, rua).d < 2.5 || ocupado(ax, az, 1) || SEMAFOROS.some((q) => Math.hypot(q.x - ax, q.z - az) < 14) || Math.hypot(ax, az) < 30) continue;
        if (VAGAS.some((v) => Math.hypot(v.x - ax, v.z - az) < 5) || LUGARES.some((l) => Math.hypot(l.x - ax, l.z - az) < 6) || CASAS.some((c) => Math.hypot(c.x - ax, c.z - az) < 4)) continue;
        if (Math.hypot(ax - LARGADA.x, az - LARGADA.z) < 6) continue;
        if (ax > PATIO_JE.x0 - 4 && ax < PATIO_JE.x1 && az > PATIO_JE.z0 && az < PATIO_JE.z1) continue; // portão do pátio da J.E
        const a = arvoreReal(0.9 + r() * 0.3); a.position.set(ax, 0.03, az); cena.add(a); arvores.push(a);
        solido(ax, az, 0.9, 0.9, 6);
      }
    });
  }

  // ---------- morros e árvores fora da cidade
  for (let n = 0; n < 70; n++) {
    const a = arvoreReal(1.2 + r());
    const ang = r() * Math.PI * 2, dist = 142 + r() * 60;
    a.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
    cena.add(a);
  }
  for (let n = 0; n < 16; n++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(45 + r() * 30, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x6fae4f, { roughness: 1 }));
    const ang = (n / 16) * Math.PI * 2;
    m.position.set(Math.cos(ang) * 270, -6, Math.sin(ang) * 270);
    m.scale.y = 0.45;
    cena.add(m);
  }
  // peças que mudam no jogo ficam de fora da junção
  for (const s of semaforos) for (const p of s.postes) { for (const l of Object.values(p.userData.luzes)) l.userData.dinamico = true; p.userData.ped.userData.dinamico = true; }
  roda.userData.dinamico = true;
  for (const c of casas) c.correio.userData.dinamico = true;
  mesclarEstaticos(cena, cena.children.filter((o) => !antes.has(o)));
  return { solidos, circulos, lugares, casas, semaforos, faixas, arvores, roda };
}

export function morador(cor) {
  const p = pilotoLapis(cor);
  p.scale.setScalar(0.7);
  return p;
}
