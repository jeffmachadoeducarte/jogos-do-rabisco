// Interiores da Cidade do Rabisco (Academia Rise Up, Bella Cat): salas leves montadas só na primeira vez que o
// Rabisco entra, longe da cidade (o jogo leva o Rabisco até lá com um fade curtinho e esconde a sala quando ele sai).
// Sem luzes extras (a luz é a do sol da cena, que atravessa o teto) e com peças simples que repetem a mesma
// geometria. Coordenadas locais: a porta fica na parede da frente (+z), o Rabisco entra olhando para -z.
// Cada montagem devolve { g, solidos (retângulos locais), entrada, saida, pontos... } (ver jogo.js: SALAS).

import { THREE, texturaCanvas } from "../../src/motor3d/toon.js";

const std = (cor, extra = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, ...extra });
const GEO = {
  caixa: new THREE.BoxGeometry(1, 1, 1),
  cil: new THREE.CylinderGeometry(1, 1, 1, 16),
  esfera: new THREE.SphereGeometry(1, 14, 10),
  plano: new THREE.PlaneGeometry(1, 1),
};
function bloco(pai, w, h, d, mat, x, y, z, sombra = true) {
  const m = new THREE.Mesh(GEO.caixa, mat);
  m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = sombra; m.receiveShadow = true;
  pai.add(m);
  return m;
}
function cilindro(pai, r, h, mat, x, y, z, sombra = true) {
  const m = new THREE.Mesh(GEO.cil, mat);
  m.scale.set(r, h, r); m.position.set(x, y, z); m.castShadow = sombra;
  pai.add(m);
  return m;
}
function bola(pai, r, mat, x, y, z) {
  const m = new THREE.Mesh(GEO.esfera, mat);
  m.scale.setScalar(r); m.position.set(x, y, z); m.castShadow = true;
  pai.add(m);
  return m;
}
// quadro na parede: plano com textura (sem sombra); rotY gira para olhar para dentro da sala
function quadro(pai, tex, w, h, x, y, z, rotY = 0, extra = {}) {
  const m = new THREE.Mesh(GEO.plano, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, ...extra }));
  m.scale.set(w, h, 1); m.position.set(x, y, z); m.rotation.y = rotY;
  pai.add(m);
  return m;
}
const texto = (c, t, x, y, tam, cor, peso = 800, max = 9999) => {
  c.font = `${peso} ${tam}px 'Baloo 2', sans-serif`;
  while (c.measureText(t).width > max && tam > 10) { tam -= 2; c.font = `${peso} ${tam}px 'Baloo 2', sans-serif`; }
  c.fillStyle = cor; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(t, x, y);
};

// janela com céu e nuvens (brilha sozinha: dia lá fora)
const texJanela = () => texturaCanvas(256, 256, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#5fb0f0"); g.addColorStop(1, "#d8f0ff");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(255,255,255,0.9)";
  for (const [x, y, r] of [[60, 70, 26], [90, 64, 32], [122, 74, 24], [180, 150, 20], [204, 144, 26], [228, 152, 18]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  c.fillStyle = "#6cbf55"; c.fillRect(0, h * 0.82, w, h * 0.18);
  c.fillStyle = "#4f9a3a"; for (let x = 0; x < w; x += 34) { c.beginPath(); c.arc(x + 12, h * 0.82, 20, Math.PI, 0); c.fill(); }
});
// espelho de mentirinha: prata azulada com reflexos inclinados
const texEspelho = () => texturaCanvas(256, 256, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#e9f3fb"); g.addColorStop(0.5, "#b9cddd"); g.addColorStop(1, "#dde9f3");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(255,255,255,0.55)";
  for (const [x, l] of [[40, 26], [86, 10], [160, 34], [206, 12]]) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + l, h); c.lineTo(x + l + 120, 0); c.lineTo(x + 120, 0); c.fill(); }
});
function janela(pai, w, h, x, y, z, rotY, moldura = 0xffffff) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; pai.add(g);
  const vidro = new THREE.Mesh(GEO.plano, new THREE.MeshBasicMaterial({ map: texJanela() }));
  vidro.scale.set(w, h, 1); g.add(vidro);
  const m = std(moldura, { roughness: 0.5 });
  bloco(g, w + 0.24, 0.14, 0.12, m, 0, h / 2, 0.04, false); bloco(g, w + 0.24, 0.14, 0.12, m, 0, -h / 2, 0.04, false);
  bloco(g, 0.14, h, 0.12, m, -w / 2, 0, 0.04, false); bloco(g, 0.14, h, 0.12, m, w / 2, 0, 0.04, false);
  bloco(g, 0.08, h, 0.08, m, 0, 0, 0.04, false); bloco(g, w, 0.08, 0.08, m, 0, 0, 0.04, false);
  bloco(g, w + 0.4, 0.1, 0.3, m, 0, -h / 2 - 0.08, 0.12, false); // peitoril
  return g;
}
// casca da sala: piso, teto com luminárias, quatro paredes (a da frente com a porta para a rua)
function casca({ w, d, h, piso, parede, fundo = parede, teto = 0xfbfbf7, porta = 0x9fd8ff, faixa = null }) {
  const g = new THREE.Group();
  const solidos = [];
  const chao = new THREE.Mesh(GEO.plano, piso); chao.scale.set(w, d, 1); chao.rotation.x = -Math.PI / 2; chao.position.y = 0.035; chao.receiveShadow = true; g.add(chao);
  const forro = new THREE.Mesh(GEO.plano, std(teto, { roughness: 0.95, emissive: teto, emissiveIntensity: 0.25 })); forro.scale.set(w, d, 1); forro.rotation.x = Math.PI / 2; forro.position.y = h; g.add(forro);
  // luminárias no teto (só brilho, sem luz de verdade)
  const luz = new THREE.MeshBasicMaterial({ color: 0xfffbea });
  for (let x = -w / 2 + w / 6; x < w / 2; x += w / 3) for (let z = -d / 2 + d / 4; z < d / 2; z += d / 2) bloco(g, 1.8, 0.06, 0.7, luz, x, h - 0.04, z, false);
  const mp = std(parede, { emissive: parede, emissiveIntensity: 0.3 }), mf = std(fundo, { emissive: fundo, emissiveIntensity: 0.3 });
  const E = 0.3;
  bloco(g, w + E * 2, h, E, mf, 0, h / 2, -d / 2 - E / 2, false);
  bloco(g, E, h, d, mp, -w / 2 - E / 2, h / 2, 0, false);
  bloco(g, E, h, d, mp, w / 2 + E / 2, h / 2, 0, false);
  const PW = 2.6, PH = 3.2; // vão da porta
  const lado = (w - PW) / 2;
  bloco(g, lado, h, E, mp, -(PW + lado) / 2, h / 2, d / 2 + E / 2, false);
  bloco(g, lado, h, E, mp, (PW + lado) / 2, h / 2, d / 2 + E / 2, false);
  bloco(g, PW, h - PH, E, mp, 0, PH + (h - PH) / 2, d / 2 + E / 2, false);
  // porta de vidro com a luz do dia lá fora e o tapete de saída
  const vidro = std(porta, { emissive: 0xeaf6ff, emissiveIntensity: 0.9, roughness: 0.2 });
  bloco(g, PW, PH, 0.08, vidro, 0, PH / 2, d / 2 + 0.1, false);
  const batente = std(0x3a3a3a, { roughness: 0.5 });
  bloco(g, 0.14, PH, 0.2, batente, -PW / 2, PH / 2, d / 2 + 0.05, false); bloco(g, 0.14, PH, 0.2, batente, PW / 2, PH / 2, d / 2 + 0.05, false);
  bloco(g, PW + 0.28, 0.16, 0.2, batente, 0, PH, d / 2 + 0.05, false); bloco(g, 0.06, PH, 0.1, batente, 0, PH / 2, d / 2 + 0.02, false);
  const placaSaida = quadro(g, texturaCanvas(256, 96, (c, W, H) => { c.fillStyle = "#2bb24c"; c.fillRect(0, 0, W, H); texto(c, "SAÍDA ➜", W / 2, H / 2 + 4, 56, "#fff"); }), 1.3, 0.5, 0, PH + 0.45, d / 2 - 0.02, Math.PI, { emissive: 0xffffff, emissiveIntensity: 0.25 });
  placaSaida.material.emissiveMap = placaSaida.material.map;
  const tapete = bloco(g, 2.2, 0.04, 1.2, std(0x2bb24c, { roughness: 1 }), 0, 0.05, d / 2 - 0.75, false);
  if (faixa) for (const [x, z, ww, dd, ry] of [[0, -d / 2 + 0.01, w, 0, 0], [-w / 2 + 0.01, 0, d, 0, Math.PI / 2], [w / 2 - 0.01, 0, d, 0, -Math.PI / 2]]) { const f = new THREE.Mesh(GEO.plano, std(faixa, { emissive: faixa, emissiveIntensity: 0.2 })); f.scale.set(ww, 0.35, 1); f.position.set(x, 1.15, z); f.rotation.y = ry; g.add(f); void dd; }
  solidos.push({ x0: -w / 2 - 1, x1: w / 2 + 1, z0: -d / 2 - 1, z1: -d / 2, y1: 6 }, { x0: -w / 2 - 1, x1: -w / 2, z0: -d / 2 - 1, z1: d / 2 + 1, y1: 6 },
    { x0: w / 2, x1: w / 2 + 1, z0: -d / 2 - 1, z1: d / 2 + 1, y1: 6 }, { x0: -w / 2 - 1, x1: w / 2 + 1, z0: d / 2, z1: d / 2 + 1, y1: 6 });
  return { g, solidos, tapete, entrada: { x: 0, z: d / 2 - 5 }, saida: { x: 0, z: d / 2 - 0.75 } };
}
// planta de vaso (palmeirinha)
function planta(pai, x, z, escala = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(escala); pai.add(g);
  cilindro(g, 0.32, 0.6, std(0xf4f1ea, { roughness: 0.5 }), 0, 0.3, 0);
  cilindro(g, 0.06, 1.1, std(0x7a5a3a), 0, 1.1, 0);
  const folha = std(0x3f9a45, { roughness: 0.9, flatShading: true });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const f = bola(g, 1, folha, Math.cos(a) * 0.38, 1.62, Math.sin(a) * 0.38); f.scale.set(0.5, 0.12, 0.2); f.rotation.y = -a; f.rotation.z = -0.4; }
  return g;
}

// ------------------------------------------------------------------ Academia Rise Up
// piso emborrachado, espelho no fundo, 3 esteiras olhando o espelho (a do meio é a da missão), halteres na
// estante da direita com o colchonete laranja (onde o Rabisco levanta o halter), barra com anilhas, colchonetes
// coloridos, bola de pilates, janelas à esquerda e a faixa "Seu corpo é presente de Deus".
export function montarAcademia() {
  const W = 18, D = 16, H = 5;
  const texPiso = texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#3a3d42"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { c.fillStyle = ["#4a4e55", "#2f3237", "#ff7a00", "#5a5e66"][i % 4 === 2 && i % 12 ? 0 : i % 4]; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    c.strokeStyle = "rgba(0,0,0,0.45)"; c.lineWidth = 3; c.strokeRect(0, 0, w, h);
  }, { repetir: true });
  texPiso.repeat.set(W / 2, D / 2);
  const S = casca({ w: W, d: D, h: H, piso: std(0xffffff, { map: texPiso, roughness: 0.95 }), parede: 0xf1ebe0, fundo: 0xe9e2d6, faixa: 0xff7a00 });
  const g = S.g;
  // espelho grande no fundo e o letreiro RISE UP em cima
  const espelho = quadro(g, texEspelho(), 11, 2.9, -2, 1.85, -D / 2 + 0.03, 0, { roughness: 0.15, metalness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.12 });
  espelho.material.emissiveMap = espelho.material.map;
  bloco(g, 11.3, 0.14, 0.1, std(0x222222), -2, 3.35, -D / 2 + 0.06, false);
  const logo = texturaCanvas(512, 160, (c, w, h) => {
    c.fillStyle = "#151515"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#ff7a00"; c.beginPath(); c.moveTo(128, 46); c.lineTo(154, 92); c.lineTo(102, 92); c.closePath(); c.fill();
    texto(c, "RISE UP", 300, 76, 92, "#ffffff", 900);
    texto(c, "SAÚDE E BEM-ESTAR", 256, 134, 26, "#ff9a3c", 700);
  });
  const lg = quadro(g, logo, 4.2, 1.3, -2, 4.1, -D / 2 + 0.04, 0, { emissive: 0xffffff, emissiveIntensity: 0.4 }); lg.material.emissiveMap = logo;
  // faixa cristã na parede da direita
  const faixa = texturaCanvas(1024, 160, (c, w, h) => {
    c.fillStyle = "#ff7a00"; c.fillRect(0, 0, w, h); c.fillStyle = "#fff6ea"; c.fillRect(10, 10, w - 20, h - 20);
    texto(c, "Seu corpo é presente de Deus: cuide bem dele! ♥", w / 2, h / 2 + 4, 60, "#3a2a1a", 800, w - 60);
  });
  const fx = quadro(g, faixa, 8, 1.25, W / 2 - 0.03, 3.7, -1, -Math.PI / 2, { emissive: 0xffffff, emissiveIntensity: 0.45 }); fx.material.emissiveMap = faixa;
  // janelas à esquerda
  for (const z of [-4.5, 0, 4.5]) janela(g, 2.6, 1.9, -W / 2 + 0.03, 2.5, z, Math.PI / 2);
  // esteiras
  const preto = std(0x26282c, { roughness: 0.6 }), cinza = std(0xb9bec6, { metalness: 0.5, roughness: 0.35 }), laranja = std(0xff7a00, { roughness: 0.5 });
  const esteiras = [];
  for (const x of [-6.2, -3.6, -1.0]) {
    const e = new THREE.Group(); e.position.set(x, 0, -5); g.add(e);
    bloco(e, 1.0, 0.24, 2.5, preto, 0, 0.12, 0);
    const texCinta = texturaCanvas(64, 256, (c, w, h) => { c.fillStyle = "#1b1c1f"; c.fillRect(0, 0, w, h); c.fillStyle = "#33363b"; for (let y = 0; y < h; y += 32) c.fillRect(0, y, w, 6); }, { repetir: true });
    texCinta.repeat.set(1, 2.5);
    const cinta = new THREE.Mesh(GEO.plano, std(0xffffff, { map: texCinta, roughness: 0.9 })); cinta.scale.set(0.76, 2.2, 1); cinta.rotation.x = -Math.PI / 2; cinta.position.set(0, 0.245, 0.08); cinta.receiveShadow = true; e.add(cinta);
    for (const s of [-1, 1]) {
      bloco(e, 0.1, 0.07, 2.3, cinza, s * 0.45, 0.27, 0.05);
      const poste = bloco(e, 0.08, 1.35, 0.08, cinza, s * 0.42, 0.9, -1.05); poste.rotation.x = -0.12;
      bloco(e, 0.07, 0.07, 0.7, preto, s * 0.46, 1.2, -0.72);
    }
    const painel = bloco(e, 1.0, 0.36, 0.22, laranja, 0, 1.56, -1.15); painel.rotation.x = 0.55;
    const tela = new THREE.Mesh(GEO.plano, new THREE.MeshBasicMaterial({ color: 0x7fd6ff })); tela.scale.set(0.5, 0.18, 1); tela.position.set(0, 1.62, -1.03); tela.rotation.x = -0.55; e.add(tela);
    esteiras.push({ g: e, x, z: -5, cinta: texCinta });
    S.solidos.push({ x0: x - 0.55, x1: x + 0.55, z0: -6.3, z1: -3.8, y1: 1.6 });
  }
  // estante de halteres (direita) com pares coloridos de 1 a 5
  const estante = new THREE.Group(); estante.position.set(W / 2 - 0.9, 0, -4.4); g.add(estante);
  bloco(estante, 0.9, 0.08, 3.6, preto, 0, 0.55, 0); bloco(estante, 0.9, 0.08, 3.6, preto, 0, 1.05, 0);
  for (const z of [-1.7, 1.7]) bloco(estante, 0.9, 1.1, 0.1, preto, 0, 0.55, z);
  const coresHalter = [0xe63946, 0x1d6fe0, 0xffcc1f, 0x2bb24c, 0x8e6cff];
  coresHalter.forEach((cor, i) => {
    const m = std(cor, { roughness: 0.45 });
    for (const [y, dz] of [[0.68, -0.28], [1.18, 0.28]]) {
      const h = halter(m, 0.85 + i * 0.05); h.position.set(0, y, -1.35 + i * 0.68 + dz * 0.3); h.rotation.y = Math.PI / 2; estante.add(h);
    }
  });
  S.solidos.push({ x0: W / 2 - 1.4, x1: W / 2, z0: -6.3, z1: -2.5, y1: 1.6 });
  // colchonete laranja da missão com o halter grande (rosa e azul, as cores do Rabisco)
  const posPeso = { x: 4.6, z: -3.2 };
  bloco(g, 1.4, 0.08, 2.2, std(0xff7a00, { roughness: 0.95 }), posPeso.x, 0.07, posPeso.z, false);
  const halterChao = new THREE.Group(); halterChao.position.set(posPeso.x + 0.1, 0.25, posPeso.z - 0.75); g.add(halterChao);
  for (const [dx, cor] of [[-0.18, 0xec2e8c], [0.18, 0x1d6fe0]]) { const h = halter(std(cor, { roughness: 0.4 }), 1.25); h.position.x = dx; h.rotation.y = Math.PI / 2; halterChao.add(h); }
  // barra com anilhas no canto do fundo à direita
  const barra = new THREE.Group(); barra.position.set(5.6, 0, -7); g.add(barra);
  for (const s of [-1, 1]) { bloco(barra, 0.12, 1.5, 0.12, preto, s * 1.0, 0.75, 0); bloco(barra, 0.5, 0.06, 0.5, preto, s * 1.0, 0.03, 0); }
  const barraCil = cilindro(barra, 0.04, 2.8, cinza, 0, 1.45, 0.06); barraCil.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) for (const [k, r] of [[0, 0.42], [0.14, 0.32]]) { const a = cilindro(barra, r, 0.1, s > 0 ? std(0xe63946) : std(0xe63946), s * (1.2 + k), 1.45, 0.06); a.rotation.z = Math.PI / 2; }
  S.solidos.push({ x0: 4.2, x1: 7.0, z0: -7.5, z1: -6.5, y1: 1.6 });
  // colchonetes coloridos, bola de pilates, banco e plantas
  [[0xec2e8c, -6.6], [0x1d6fe0, -5.0], [0x58c43a, -3.4]].forEach(([cor, x]) => bloco(g, 1.2, 0.06, 2.2, std(cor, { roughness: 0.95 }), x, 0.06, 3.4, false));
  bola(g, 0.5, std(0x8e6cff, { roughness: 0.4 }), -7.6, 0.53, 0.8);
  bola(g, 0.4, std(0xffcc1f, { roughness: 0.4 }), -7.9, 0.43, 2.0);
  S.solidos.push({ x0: -8.2, x1: -7.0, z0: 0.2, z1: 2.5, y1: 1 });
  bloco(g, 2.6, 0.12, 0.7, preto, 5.2, 0.6, 3.6); for (const x of [4.2, 6.2]) bloco(g, 0.12, 0.6, 0.5, cinza, x, 0.3, 3.6);
  S.solidos.push({ x0: 3.8, x1: 6.6, z0: 3.2, z1: 4.0, y1: 0.7 });
  planta(g, -W / 2 + 0.8, D / 2 - 0.8); planta(g, W / 2 - 0.8, D / 2 - 0.8);
  S.solidos.push({ x0: -W / 2, x1: -W / 2 + 1.4, z0: D / 2 - 1.4, z1: D / 2, y1: 2 }, { x0: W / 2 - 1.4, x1: W / 2, z0: D / 2 - 1.4, z1: D / 2, y1: 2 });
  // bebedouro (água depois do exercício)
  bloco(g, 0.7, 1.1, 0.5, std(0xe8eef4, { metalness: 0.3, roughness: 0.3 }), W / 2 - 0.6, 0.55, 1.6);
  cilindro(g, 0.22, 0.6, std(0x7fd6ff, { transparent: true, opacity: 0.7, roughness: 0.1 }), W / 2 - 0.6, 1.4, 1.6, false);
  S.solidos.push({ x0: W / 2 - 1.0, x1: W / 2, z0: 1.3, z1: 1.9, y1: 2 });
  return { ...S, esteiras, esteira: esteiras[1], peso: { ...posPeso, halter: halterChao }, treinadora: { x: -6.0, z: -2.2 }, treinadoraPeso: { x: 3.0, z: -4.7 } };
}
// halter: barra e duas anilhas (eixo x)
export function halter(mat, escala = 1) {
  const g = new THREE.Group();
  const barra = new THREE.Mesh(GEO.cil, std(0x9aa0a8, { metalness: 0.6, roughness: 0.3 })); barra.scale.set(0.035, 0.42, 0.035); barra.rotation.z = Math.PI / 2; g.add(barra);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(GEO.cil, mat); p.scale.set(0.11, 0.1, 0.11); p.rotation.z = Math.PI / 2; p.position.x = s * 0.17; p.castShadow = true; g.add(p); }
  g.scale.setScalar(escala);
  return g;
}

// ------------------------------------------------------------------ Bella Cat Make Biju
// prateleiras rosa e lilás com laços, colares, pulseiras, bolsinhas e tiaras; cinco acessórios nos pedestais do meio
// (os da missão), balcão de embrulhar presente, espelho de camarim com lampadinhas, cerejeira rosa (como na loja de
// verdade) e luminárias-balão.
export const ACESSORIOS_BELLA = [
  { id: "laco", nome: "laço rosa", art: "o", cor: 0xec2e8c },
  { id: "colar", nome: "colar de pérolas", art: "o", cor: 0xf4f0ea },
  { id: "pulseira", nome: "pulseira azul", art: "a", cor: 0x1fb5d6 },
  { id: "bolsa", nome: "bolsinha roxa", art: "a", cor: 0x8e5bd8 },
  { id: "tiara", nome: "tiara amarela", art: "a", cor: 0xffc928 },
];
export function acessorio(id) {
  const g = new THREE.Group();
  const A = ACESSORIOS_BELLA.find((a) => a.id === id);
  const m = std(A.cor, { roughness: 0.35, metalness: id === "tiara" ? 0.4 : 0.05 });
  if (id === "laco") {
    for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 10), m); a.rotation.z = s * Math.PI / 2; a.position.x = s * 0.17; g.add(a); }
    bola(g, 0.09, m, 0, 0, 0);
    for (const s of [-1, 1]) { const f = bloco(g, 0.06, 0.24, 0.03, m, s * 0.07, -0.16, 0); f.rotation.z = s * 0.3; }
  } else if (id === "colar") {
    const n = 16;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; bola(g, 0.045, m, Math.cos(a) * 0.24, Math.sin(a) * 0.28, 0); }
    bola(g, 0.08, std(0xec2e8c, { roughness: 0.3 }), 0, -0.3, 0.02);
  } else if (id === "pulseira") {
    const n = 12;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; bola(g, 0.05, i % 3 ? m : std(0xffffff, { roughness: 0.3 }), Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0); }
  } else if (id === "bolsa") {
    bloco(g, 0.42, 0.3, 0.16, m, 0, 0, 0);
    const alca = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 16, Math.PI), m); alca.position.y = 0.15; g.add(alca);
    bola(g, 0.04, std(0xffcc1f, { metalness: 0.5, roughness: 0.3 }), 0, 0.04, 0.09);
  } else {
    const arco = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 6, 20, Math.PI), m); g.add(arco);
    for (const [x, y, r, cor] of [[0, 0.27, 0.07, 0xec2e8c], [-0.13, 0.22, 0.05, 0x1fb5d6], [0.13, 0.22, 0.05, 0x1fb5d6]]) bola(g, r, std(cor, { roughness: 0.2, metalness: 0.2 }), x, y, 0.01);
  }
  return g;
}
export function montarBellaCat() {
  const W = 14, D = 12, H = 4.6;
  const texPiso = texturaCanvas(256, 256, (c, w, h) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? "#fbeef5" : "#ffffff"; c.fillRect(x * 64, y * 64, 64, 64); }
    c.strokeStyle = "rgba(200,160,190,0.5)"; c.lineWidth = 2; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); }
  }, { repetir: true });
  texPiso.repeat.set(W / 3, D / 3);
  const S = casca({ w: W, d: D, h: H, piso: std(0xffffff, { map: texPiso, roughness: 0.3 }), parede: 0xf9dbe9, fundo: 0xe6d6f5, teto: 0xfff8fb });
  const g = S.g;
  // letreiro Bella Cat no fundo (coração-gatinho + nome)
  const marca = texturaCanvas(768, 256, (c, w, h) => {
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h);
    c.lineWidth = 12; c.strokeStyle = "#ec2e8c"; c.beginPath(); c.moveTo(120, 210); c.bezierCurveTo(10, 140, 30, 40, 120, 80); c.bezierCurveTo(210, 40, 230, 140, 120, 210); c.stroke();
    c.fillStyle = "#ec2e8c"; c.beginPath(); c.moveTo(150, 60); c.lineTo(170, 25); c.lineTo(185, 70); c.fill();
    texto(c, "Bella Cat", 470, 100, 120, "#ec2e8c", 700);
    texto(c, "MAKE BIJU", 470, 200, 60, "#333333", 800);
  });
  const lm = quadro(g, marca, 5.4, 1.8, 0, 3.4, -D / 2 + 0.04, 0, { emissive: 0xffffff, emissiveIntensity: 0.35 }); lm.material.emissiveMap = marca;
  // prateleiras nas paredes com produtinhos (uma malha instanciada por parede)
  const prat = std(0xffffff, { roughness: 0.5 }), lilas = std(0xc9b3e6, { roughness: 0.6 });
  const cores = [0xec2e8c, 0xf7a8c8, 0xa98ce0, 0xffffff, 0xffcc1f, 0x7fd6ff, 0xd94a7a, 0xe6d6f5];
  const produtos = (n) => { const im = new THREE.InstancedMesh(GEO.caixa, std(0xffffff, { roughness: 0.45 }), n); im.castShadow = false; return im; };
  const montarEstante = (x0, z0, comp, rotY) => {
    const e = new THREE.Group(); e.position.set(x0, 0, z0); e.rotation.y = rotY; g.add(e);
    bloco(e, comp, 2.9, 0.12, lilas, 0, 1.45, -0.3, false);
    for (const y of [0.5, 1.15, 1.8, 2.45]) bloco(e, comp, 0.06, 0.55, prat, 0, y, 0, false);
    const n = Math.floor(comp / 0.32) * 4;
    const im = produtos(n);
    const mat = new THREE.Matrix4(), cor = new THREE.Color();
    let k = 0;
    for (const y of [0.5, 1.15, 1.8, 2.45]) for (let x = -comp / 2 + 0.2; x < comp / 2 - 0.1 && k < n; x += 0.32, k++) {
      const alto = 0.15 + ((k * 7) % 5) * 0.05;
      mat.compose(new THREE.Vector3(x, y + 0.03 + alto / 2, 0.05), new THREE.Quaternion(), new THREE.Vector3(0.2, alto, 0.2));
      im.setMatrixAt(k, mat); im.setColorAt(k, cor.setHex(cores[(k * 5) % cores.length]));
    }
    im.count = k; e.add(im);
  };
  montarEstante(-W / 2 + 0.35, -2.2, 6, Math.PI / 2); montarEstante(W / 2 - 0.35, -2.6, 5.2, -Math.PI / 2);
  montarEstante(-3.8, -D / 2 + 0.35, 4.4, 0); montarEstante(3.8, -D / 2 + 0.35, 4.4, 0);
  S.solidos.push({ x0: -W / 2, x1: -W / 2 + 0.8, z0: -5.2, z1: 0.8, y1: 3 }, { x0: W / 2 - 0.8, x1: W / 2, z0: -5.2, z1: 0, y1: 3 }, { x0: -W / 2, x1: W / 2, z0: -D / 2, z1: -D / 2 + 0.8, y1: 3 });
  // pedestais com os 5 acessórios da missão (em arco no meio da loja)
  const pedestais = ACESSORIOS_BELLA.map((A, i) => {
    const x = -4 + i * 2, z = -1.6 - Math.cos(((i - 2) / 4) * Math.PI) * 0.6;
    const p = new THREE.Group(); p.position.set(x, 0, z); g.add(p);
    cilindro(p, 0.42, 1.0, std(0xffffff, { roughness: 0.35 }), 0, 0.5, 0);
    cilindro(p, 0.48, 0.08, std(0xf7a8c8, { roughness: 0.4 }), 0, 1.04, 0);
    const anel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); anel.rotation.x = Math.PI / 2; anel.position.y = 1.1; anel.visible = false; p.add(anel);
    const obj = acessorio(A.id); obj.position.y = 1.45; p.add(obj);
    S.solidos.push({ x0: x - 0.45, x1: x + 0.45, z0: z - 0.45, z1: z + 0.45, y1: 1.2 });
    return { ...A, x, z, obj, anel, g: p };
  });
  // balcão de presente (direita, perto da porta): caixinhas, rolo de fita e a vendedora atrás
  const balcao = { x: 4.6, z: 2.6 };
  bloco(g, 0.9, 1.1, 3.2, std(0xf7a8c8, { roughness: 0.5 }), balcao.x, 0.55, balcao.z);
  bloco(g, 1.05, 0.08, 3.35, std(0xffffff, { roughness: 0.3 }), balcao.x, 1.14, balcao.z);
  for (const [dz, cor, s] of [[0.9, 0xa98ce0, 0.35], [1.2, 0xec2e8c, 0.28], [1.05, 0xffcc1f, 0.2]]) bloco(g, s, s, s, std(cor, { roughness: 0.6 }), balcao.x, 1.18 + s / 2 + (cor === 0xffcc1f ? 0.3 : 0), balcao.z + dz);
  const rolo = cilindro(g, 0.12, 0.5, std(0xec2e8c, { roughness: 0.4 }), balcao.x, 1.3, balcao.z - 1.1); rolo.rotation.x = Math.PI / 2;
  S.solidos.push({ x0: balcao.x - 0.5, x1: balcao.x + 0.5, z0: balcao.z - 1.65, z1: balcao.z + 1.65, y1: 1.2 });
  // espelho de camarim com lampadinhas (parede da esquerda, perto da porta) e penteadeira
  const ex = -W / 2 + 0.05, ez = 3.0;
  const esp = quadro(g, texEspelho(), 1.7, 1.3, ex, 1.95, ez, Math.PI / 2, { roughness: 0.15, metalness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.12 }); esp.material.emissiveMap = esp.material.map;
  const lamp = new THREE.MeshBasicMaterial({ color: 0xfff1b8 });
  for (let i = 0; i < 6; i++) { bola(g, 0.07, lamp, ex + 0.06, 1.25 + i * 0.28, ez - 0.95); bola(g, 0.07, lamp, ex + 0.06, 1.25 + i * 0.28, ez + 0.95); }
  for (let i = 0; i < 6; i++) bola(g, 0.07, lamp, ex + 0.06, 2.72, ez - 0.75 + i * 0.3);
  bloco(g, 0.7, 0.08, 1.8, std(0xffffff, { roughness: 0.4 }), ex + 0.4, 0.95, ez); bloco(g, 0.6, 0.9, 0.08, std(0xffffff), ex + 0.4, 0.45, ez - 0.8); bloco(g, 0.6, 0.9, 0.08, std(0xffffff), ex + 0.4, 0.45, ez + 0.8);
  for (const [dz, cor] of [[-0.4, 0xec2e8c], [0, 0xd94a7a], [0.3, 0xa98ce0]]) cilindro(g, 0.05, 0.22, std(cor, { roughness: 0.3 }), ex + 0.45, 1.1, ez + dz);
  S.solidos.push({ x0: -W / 2, x1: -W / 2 + 0.8, z0: ez - 1, z1: ez + 1, y1: 1.2 });
  // cerejeira rosa no canto do fundo à direita (como a da loja de verdade)
  const arv = new THREE.Group(); arv.position.set(W / 2 - 1.2, 0, -D / 2 + 1.4); g.add(arv);
  cilindro(arv, 0.18, 0.4, std(0xffffff), 0, 0.2, 0);
  const tronco = cilindro(arv, 0.09, 2.4, std(0x6b4a3a), 0, 1.4, 0); tronco.rotation.z = 0.12;
  const flor = std(0xf7a8c8, { roughness: 0.9, flatShading: true }), flor2 = std(0xffd0e4, { roughness: 0.9, flatShading: true });
  for (const [x, y, z, r, m] of [[0, 2.8, 0, 0.7, flor], [-0.6, 2.5, 0.3, 0.5, flor2], [0.5, 2.6, -0.3, 0.55, flor2], [0.2, 3.3, 0.2, 0.5, flor], [-0.3, 3.1, -0.4, 0.45, flor]]) bola(arv, r, m, x, y, z);
  S.solidos.push({ x0: W / 2 - 1.8, x1: W / 2, z0: -D / 2, z1: -D / 2 + 2.2, y1: 3 });
  // luminárias-balão penduradas
  const fio = std(0x444444);
  [[-3, -0.5, 0xf7a8c8], [-1, 0.6, 0xe6d6f5], [1, -0.5, 0xffffff], [3, 0.6, 0xf7a8c8], [-2, 2.6, 0xa98ce0], [2, 2.6, 0xffd0e4]].forEach(([x, z, cor]) => {
    bloco(g, 0.02, 0.9, 0.02, fio, x, H - 0.45, z, false);
    const b = bola(g, 0.3, std(cor, { emissive: cor, emissiveIntensity: 0.6, roughness: 0.4 }), x, H - 1.05, z); b.castShadow = false;
  });
  // vitrines de vidro dos dois lados da porta (luz do dia) e plantinhas
  for (const s of [-1, 1]) { const v = quadro(g, texJanela(), 3.4, 2.2, s * 4.2, 1.9, D / 2 - 0.02, Math.PI); v.material = new THREE.MeshBasicMaterial({ map: v.material.map }); }
  planta(g, -2.3, D / 2 - 0.9, 0.8);
  S.solidos.push({ x0: -2.8, x1: -1.8, z0: D / 2 - 1.4, z1: D / 2, y1: 2 });
  return { ...S, pedestais, balcao, vendedora: { x: 5.8, z: 1.7 }, embrulho: { x: balcao.x, y: 1.4, z: balcao.z + 0.75 } };
}

// ------------------------------------------------------------------ Salas de aula da Educarte (aulas.js)
// Kids II (5 a 12 anos): piso de madeira, lousa verde (o jogo escreve nela a tarefa da vez), alfabeto em cima da
// lousa, números de 1 a 10 e "Jesus te ama" na parede, carteiras em duas fileiras, mesa da professora (com a cesta
// onde as maçãs são entregues), bandeja de maçãs, estante de livros e o tapete de atividades com os lugares (vagas)
// onde aparecem os objetos de cada aula. Kids I (berçário até 4 anos): tons suaves, piso de EVA, quadro branco
// colorido, arco-íris na parede, berço, ursinho, blocos macios, mesinhas baixas e o mesmo tapete de atividades.
export const PROFESSORA_AULA = { x: -2.8, z: -4.6 }; // onde a professora fica na sala de aula (perto da lousa)
const COR_LETRA = ["#ec2e8c", "#ff9f43", "#ffcc1f", "#58c43a", "#00b5f0", "#8e6cff"];
export function montarSalaAula({ kids1 = false } = {}) {
  const W = 16, D = 14, H = 4.6;
  const texPiso = kids1
    ? texturaCanvas(256, 256, (c) => { const cs = ["#f7c6d9", "#c4ecd9", "#c6e2f7", "#fff0b3"]; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = cs[(x + y * 2) % 4]; c.fillRect(x * 64, y * 64, 64, 64); c.strokeStyle = "rgba(255,255,255,0.7)"; c.lineWidth = 3; c.strokeRect(x * 64, y * 64, 64, 64); } }, { repetir: true })
    : texturaCanvas(256, 256, (c, w, h) => { for (let y = 0; y < 8; y++) { const v = 176 + ((y * 37) % 30); c.fillStyle = `rgb(${v},${Math.round(v * 0.72)},${Math.round(v * 0.45)})`; c.fillRect(0, y * 32, w, 31); c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(((y * 97) % 200) + 20, y * 32, 3, 31); } void h; }, { repetir: true });
  texPiso.repeat.set(W / 4, D / 4);
  const S = casca({ w: W, d: D, h: H, piso: std(0xffffff, { map: texPiso, roughness: kids1 ? 0.95 : 0.7 }), parede: kids1 ? 0xfde4ee : 0xfdf3dc, fundo: kids1 ? 0xdff5ea : 0xdcefe0, teto: 0xfffdf7 });
  const g = S.g;
  // lousa (Kids II: verde de giz) ou quadro branco (Kids I); o jogo redesenha com escrever(texto, sub)
  const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 384;
  const texLousa = new THREE.CanvasTexture(canvas); texLousa.colorSpace = THREE.SRGBColorSpace;
  const escrever = (texto = "", sub = "") => {
    const c = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
    if (kids1) { c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { c.fillStyle = COR_LETRA[i]; c.beginPath(); c.arc(40 + i * 188, h - 18, 10, 0, 7); c.fill(); } }
    else { c.fillStyle = "#2f5d46"; c.fillRect(0, 0, w, h); c.fillStyle = "rgba(255,255,255,0.05)"; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * w, Math.random() * h, 60, 3); }
    let tam = 150; c.font = `900 ${tam}px 'Baloo 2', sans-serif`;
    while (c.measureText(texto).width > w - 80 && tam > 40) { tam -= 6; c.font = `900 ${tam}px 'Baloo 2', sans-serif`; }
    c.textAlign = "center"; c.textBaseline = "middle";
    if (kids1) { // letras coloridas, uma de cada cor
      let x = (w - c.measureText(texto).width) / 2; c.textAlign = "left";
      [...texto].forEach((l, i) => { c.fillStyle = COR_LETRA[i % COR_LETRA.length]; c.fillText(l, x, sub ? 150 : 192); x += c.measureText(l).width; });
      c.textAlign = "center";
    } else { c.fillStyle = "#f8f6ec"; c.fillText(texto, w / 2, sub ? 150 : 192); }
    if (sub) { c.font = "700 64px 'Baloo 2', sans-serif"; c.fillStyle = kids1 ? "#8e6cff" : "#ffe9a8"; c.fillText(sub, w / 2, 300); }
    texLousa.needsUpdate = true;
  };
  escrever(kids1 ? "Educarte Kids I" : "Educarte Kids II", kids1 ? "Bem-vindo, Rabisco!" : "Bem-vindo à sala de aula!");
  const moldura = std(kids1 ? 0xf7b5cf : 0x9a6232, { roughness: 0.6 });
  bloco(g, 6.9, 2.75, 0.14, moldura, 0, 2.35, -D / 2 + 0.08, false);
  const lousa = quadro(g, texLousa, 6.6, 2.475, 0, 2.35, -D / 2 + 0.16, 0, { roughness: kids1 ? 0.3 : 0.9, emissive: 0xffffff, emissiveMap: texLousa, emissiveIntensity: kids1 ? 0.3 : 0.15 });
  bloco(g, 6.9, 0.1, 0.3, moldura, 0, 1.06, -D / 2 + 0.2, false); // aparador do giz
  // alfabeto (Kids II) ou arco-íris (Kids I) em cima
  if (kids1) {
    const arco = texturaCanvas(512, 160, (c, w, h) => { c.clearRect(0, 0, w, h); ["#ff6b6b", "#ff9f43", "#ffd84a", "#58c43a", "#4aa3df", "#8e6cff"].forEach((cor, i) => { c.strokeStyle = cor; c.lineWidth = 16; c.beginPath(); c.arc(w / 2, h + 40, 220 - i * 16, Math.PI, 0); c.stroke(); }); c.fillStyle = "#fff"; for (const x of [70, 442]) { c.beginPath(); c.arc(x, 140, 30, 0, 7); c.arc(x + 30, 130, 26, 0, 7); c.arc(x - 28, 132, 24, 0, 7); c.fill(); } });
    quadro(g, arco, 5.5, 1.7, 0, 4.1, -D / 2 + 0.05, 0, { transparent: true, emissive: 0xffffff, emissiveMap: arco, emissiveIntensity: 0.3 });
  } else {
    const abc = texturaCanvas(2048, 128, (c, w, h) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h); const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; c.font = "900 92px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; [...L].forEach((l, i) => { c.fillStyle = COR_LETRA[i % 6]; c.fillText(l, 40 + i * 76.5, h / 2 + 6); }); });
    quadro(g, abc, 13, 0.82, 0, 4.05, -D / 2 + 0.05, 0, { emissive: 0xffffff, emissiveMap: abc, emissiveIntensity: 0.3 });
  }
  // parede da direita: números 1 a 10 (com bolinhas) e "Jesus te ama"; esquerda: janelas
  const nums = texturaCanvas(1024, 256, (c, w, h) => {
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h);
    for (let n = 1; n <= 10; n++) { const x = 52 + (n - 1) * 102; c.fillStyle = COR_LETRA[n % 6]; c.font = "900 96px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.fillText(String(n), x, 110); for (let k = 0; k < n; k++) { c.beginPath(); c.arc(x - 30 + (k % 5) * 15, 170 + Math.floor(k / 5) * 30, 6, 0, 7); c.fill(); } }
  });
  quadro(g, nums, kids1 ? 4.2 : 6.4, kids1 ? 1.05 : 1.6, W / 2 - 0.04, 3.4, -2.2, -Math.PI / 2, { emissive: 0xffffff, emissiveMap: nums, emissiveIntensity: 0.25 });
  const jesus = texturaCanvas(512, 256, (c, w, h) => { c.fillStyle = "#fff6fa"; c.fillRect(0, 0, w, h); c.lineWidth = 12; c.strokeStyle = "#ec2e8c"; c.strokeRect(6, 6, w - 12, h - 12); c.font = "900 78px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#1d6fe0"; c.fillText("Jesus te ama", w / 2, 100); c.fillStyle = "#ec2e8c"; c.font = "900 90px 'Baloo 2', sans-serif"; c.fillText("♥", w / 2, 190); });
  quadro(g, jesus, 2.4, 1.2, W / 2 - 0.04, 2.0, 3.3, -Math.PI / 2, { emissive: 0xffffff, emissiveMap: jesus, emissiveIntensity: 0.25 });
  for (const z of [-3.5, 2.5]) janela(g, 2.8, 1.9, -W / 2 + 0.03, 2.5, z, Math.PI / 2);
  // mesa da professora (com a cesta das maçãs) e a bandeja de maçãs
  const madeira = std(kids1 ? 0xffe0b8 : 0xb07a4a, { roughness: 0.6 });
  const mesa = { x: -5.0, z: -4.3 }, bandeja = { x: 5.2, z: -4.3 };
  bloco(g, 2.4, 0.12, 1.1, madeira, mesa.x, 0.92, mesa.z); for (const [dx, dz] of [[-1.05, -0.45], [1.05, -0.45], [-1.05, 0.45], [1.05, 0.45]]) bloco(g, 0.1, 0.9, 0.1, madeira, mesa.x + dx, 0.45, mesa.z + dz);
  const cesta = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.36, 16, 1, true), std(0xc98a3c, { side: THREE.DoubleSide, roughness: 0.9 })); cesta.position.set(mesa.x + 0.4, 1.16, mesa.z); g.add(cesta);
  const globo = bola(g, 0.26, std(0x4aa3df, { roughness: 0.5 }), mesa.x - 0.7, 1.26, mesa.z - 0.1); void globo;
  S.solidos.push({ x0: mesa.x - 1.25, x1: mesa.x + 1.25, z0: mesa.z - 0.6, z1: mesa.z + 0.6, y1: 1.2 });
  bloco(g, 1.5, 0.1, 0.9, madeira, bandeja.x, 0.8, bandeja.z); for (const [dx, dz] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]]) bloco(g, 0.08, 0.8, 0.08, madeira, bandeja.x + dx, 0.4, bandeja.z + dz);
  const macasBandeja = [];
  for (let i = 0; i < 10; i++) { const m = maca(); m.position.set(bandeja.x - 0.55 + (i % 5) * 0.27, 0.98, bandeja.z - 0.15 + Math.floor(i / 5) * 0.3); g.add(m); macasBandeja.push(m); }
  S.solidos.push({ x0: bandeja.x - 0.8, x1: bandeja.x + 0.8, z0: bandeja.z - 0.5, z1: bandeja.z + 0.5, y1: 1 });
  // carteiras (Kids II) ou mesinhas baixas com cadeirinhas (Kids I), longe do tapete
  const tampo = std(kids1 ? 0xffffff : 0xd9b98c, { roughness: 0.6 }), ferro = std(kids1 ? 0xa9d6f5 : 0x3d7ad9, { roughness: 0.5 });
  const cadeiraCor = [0xec2e8c, 0xffcc1f, 0x58c43a, 0x00b5f0, 0x8e6cff, 0xff9f43];
  let k = 0;
  for (const z of [2.4, 4.6]) for (const x of [-5.2, -2.7, 2.7, 5.2]) { // corredor livre no meio (da porta até o tapete)
    const alt = kids1 ? 0.5 : 0.75;
    bloco(g, 1.4, 0.08, 0.8, tampo, x, alt, z); for (const s of [-1, 1]) bloco(g, 0.08, alt, 0.7, ferro, x + s * 0.6, alt / 2, z);
    const cad = std(cadeiraCor[k++ % 6], { roughness: 0.5 });
    bloco(g, 0.6, 0.08, 0.55, cad, x, alt * 0.6, z + 0.75); bloco(g, 0.6, 0.55, 0.08, cad, x, alt * 0.6 + 0.3, z + 1.02);
    S.solidos.push({ x0: x - 0.75, x1: x + 0.75, z0: z - 0.45, z1: z + 1.1, y1: 1.1 });
  }
  // tapete de atividades (redondo, colorido)
  const texTap = texturaCanvas(256, 256, (c, w, h) => { const cs = kids1 ? ["#f7b5cf", "#a8e6cf", "#a9d6f5", "#ffe08a"] : ["#ec2e8c", "#ffcc1f", "#58c43a", "#00b5f0"]; for (let i = 0; i < 8; i++) { c.fillStyle = cs[i % 4]; c.beginPath(); c.moveTo(w / 2, h / 2); c.arc(w / 2, h / 2, w / 2, (i / 8) * 6.283, ((i + 1) / 8) * 6.283); c.fill(); } c.fillStyle = "#ffffff"; c.beginPath(); c.arc(w / 2, h / 2, 40, 0, 7); c.fill(); });
  const tap = new THREE.Mesh(new THREE.CircleGeometry(4.6, 40), std(0xffffff, { map: texTap, roughness: 0.95 })); tap.rotation.x = -Math.PI / 2; tap.scale.y = 0.55; tap.position.set(0, 0.045, -1.4); tap.receiveShadow = true; g.add(tap);
  // decoração: estante de livros (Kids II) / berço, ursinho e blocos macios (Kids I); plantinha e relógio
  if (kids1) {
    const berco = new THREE.Group(); berco.position.set(-W / 2 + 1.4, 0, D / 2 - 2.6); g.add(berco);
    const bc = std(0xffffff, { roughness: 0.5 });
    bloco(berco, 1.4, 0.1, 2.0, bc, 0, 0.5, 0); for (const [x, z] of [[-0.65, -0.95], [0.65, -0.95], [-0.65, 0.95], [0.65, 0.95]]) bloco(berco, 0.08, 1.0, 0.08, bc, x, 0.5, z);
    for (const x of [-0.65, 0.65]) for (let i = 0; i < 7; i++) bloco(berco, 0.04, 0.45, 0.04, bc, x, 0.78, -0.8 + i * 0.27);
    bloco(berco, 1.2, 0.12, 1.8, std(0xa9d6f5), 0, 0.6, 0);
    S.solidos.push({ x0: -W / 2 + 0.6, x1: -W / 2 + 2.2, z0: D / 2 - 3.7, z1: D / 2 - 1.5, y1: 1.2 });
    const urso = new THREE.Group(); urso.position.set(W / 2 - 1.3, 0, D / 2 - 2.0); g.add(urso);
    const mar = std(0xc98a5a, { roughness: 0.9 });
    bola(urso, 0.45, mar, 0, 0.45, 0); bola(urso, 0.32, mar, 0, 1.05, 0); for (const s of [-1, 1]) { bola(urso, 0.12, mar, s * 0.24, 1.3, 0); bola(urso, 0.14, mar, s * 0.42, 0.55, 0.15); bola(urso, 0.05, std(0x151515), s * 0.1, 1.1, 0.28); }
    bola(urso, 0.1, std(0xffd0b0), 0, 0.98, 0.29);
    S.solidos.push({ x0: W / 2 - 1.9, x1: W / 2 - 0.6, z0: D / 2 - 2.6, z1: D / 2 - 1.4, y1: 1.5 });
    [[-6.6, -5.6, 0xf7b5cf], [-6.0, -5.9, 0xa8e6cf], [-6.3, -5.5, 0xffe08a]].forEach(([x, z, c], i) => bloco(g, 0.5, 0.5, 0.5, std(c, { roughness: 0.9 }), x, 0.25 + (i === 2 ? 0.5 : 0), z));
    // móbile de estrelinhas
    for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; bloco(g, 0.02, 0.6, 0.02, std(0xdddddd), -W / 2 + 1.4 + Math.cos(a) * 0.5, H - 0.3, D / 2 - 2.6 + Math.sin(a) * 0.5, false); const e = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), std(COR_LETRA[i].replace ? 0xffd84a : 0xffd84a, { emissive: 0xffd84a, emissiveIntensity: 0.3 })); e.position.set(-W / 2 + 1.4 + Math.cos(a) * 0.5, H - 0.7, D / 2 - 2.6 + Math.sin(a) * 0.5); g.add(e); }
  } else {
    const est = new THREE.Group(); est.position.set(-W / 2 + 0.5, 0, -D / 2 + 2.2); est.rotation.y = Math.PI / 2; g.add(est);
    bloco(est, 2.6, 2.2, 0.5, std(0xb07a4a), 0, 1.1, 0);
    const lom = new THREE.InstancedMesh(GEO.caixa, std(0xffffff, { roughness: 0.6 }), 36), m4 = new THREE.Matrix4(), cor = new THREE.Color();
    for (let i = 0; i < 36; i++) { const fila = Math.floor(i / 12), col = i % 12; m4.compose(new THREE.Vector3(-1.1 + col * 0.2, 0.55 + fila * 0.65, 0.2), new THREE.Quaternion(), new THREE.Vector3(0.16, 0.42 + (i % 3) * 0.06, 0.3)); lom.setMatrixAt(i, m4); lom.setColorAt(i, cor.setHex(cadeiraCor[(i * 7) % 6])); }
    est.add(lom);
    S.solidos.push({ x0: -W / 2, x1: -W / 2 + 1.0, z0: -D / 2 + 0.8, z1: -D / 2 + 3.6, y1: 2.4 });
  }
  planta(g, W / 2 - 0.8, D / 2 - 0.8, 0.9); S.solidos.push({ x0: W / 2 - 1.4, x1: W / 2, z0: D / 2 - 1.4, z1: D / 2, y1: 2 });
  const relogio = texturaCanvas(128, 128, (c) => { c.fillStyle = "#fff"; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = "#ec2e8c"; c.stroke(); c.lineWidth = 6; c.strokeStyle = "#151515"; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 24); c.moveTo(64, 64); c.lineTo(92, 74); c.stroke(); });
  const rel = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), new THREE.MeshBasicMaterial({ map: relogio })); rel.position.set(3.0, 3.9, D / 2 - 0.02); rel.rotation.y = Math.PI; g.add(rel);
  // vagas dos objetos da aula: duas fileiras no tapete (6 na da frente da lousa e 5 atrás)
  const vagas = [...[-5, -3, -1, 1, 3, 5].map((x) => ({ x, z: -2.6 })), ...[-4, -2, 0, 2, 4].map((x) => ({ x, z: -0.4 }))];
  return { ...S, escrever, lousa, mesa: { x: mesa.x + 0.4, z: mesa.z + 0.9, cesta }, bandeja: { x: bandeja.x, z: bandeja.z + 0.9 }, macasBandeja, vagas, professora: PROFESSORA_AULA, kids1 };
}
export function maca() {
  const g = new THREE.Group();
  bola(g, 0.14, std(0xe53935, { roughness: 0.4 }), 0, 0, 0);
  const cab = new THREE.Mesh(GEO.cil, std(0x6b4a2f)); cab.scale.set(0.015, 0.08, 0.015); cab.position.y = 0.15; g.add(cab);
  const folha = bola(g, 1, std(0x58c43a), 0.05, 0.16, 0); folha.scale.set(0.06, 0.02, 0.035);
  return g;
}
// objetos das aulas (aulas.js): livro colorido, bichinho de pelúcia, bola, forma, bloco de letra
const COR_OBJ = { vermelho: 0xe53935, azul: 0x1e6fe0, amarelo: 0xffc928, verde: 0x2bb24c };
export function objetoAula({ tipo, valor }) {
  const g = new THREE.Group();
  if (tipo === "livro") {
    const capa = std(COR_OBJ[valor], { roughness: 0.6 });
    const l = new THREE.Group(); l.position.y = 0.5; l.rotation.y = 0.35; g.add(l);
    bloco(l, 0.62, 0.84, 0.08, capa, 0, 0, -0.07); bloco(l, 0.62, 0.84, 0.08, capa, 0, 0, 0.07);
    bloco(l, 0.58, 0.8, 0.12, std(0xfffbee), 0.02, 0, 0); bloco(l, 0.06, 0.84, 0.22, capa, -0.31, 0, 0);
    const est = new THREE.Mesh(GEO.plano, std(0xffffff, { roughness: 0.6 })); est.scale.set(0.3, 0.3, 1); est.position.set(0, 0.12, 0.112); l.add(est);
  } else if (tipo === "bicho") {
    const cor = { gato: 0xff9f43, cachorro: 0x9a6232, pato: 0xffd84a }[valor];
    const m = std(cor, { roughness: 0.9 }), preto = std(0x151515);
    if (valor === "pato") {
      const c = bola(g, 0.36, m, 0, 0.34, 0); c.scale.set(1, 0.8, 1.25); bola(g, 0.24, m, 0, 0.78, 0.18);
      const bico = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), std(0xff8a1f)); bico.rotation.x = Math.PI / 2; bico.position.set(0, 0.76, 0.46); g.add(bico);
      for (const s of [-1, 1]) { bola(g, 0.065, std(0xffffff), s * 0.1, 0.85, 0.35); bola(g, 0.035, preto, s * 0.1, 0.86, 0.41); }
    } else {
      const c = bola(g, 0.34, m, 0, 0.36, 0); c.scale.set(1, 0.9, 1.1); bola(g, 0.27, m, 0, 0.82, 0.12);
      for (const s of [-1, 1]) {
        if (valor === "gato") { const o = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), m); o.position.set(s * 0.14, 1.07, 0.1); g.add(o); }
        else { const o = bola(g, 1, std(0x6b4224), s * 0.26, 0.8, 0.08); o.scale.set(0.07, 0.17, 0.11); }
        bola(g, 0.07, std(0xffffff), s * 0.1, 0.88, 0.33); bola(g, 0.04, preto, s * 0.1, 0.89, 0.39);
      }
      bola(g, 0.05, valor === "gato" ? std(0xec2e8c) : preto, 0, 0.8, 0.39);
      const rabo = new THREE.Mesh(GEO.cil, m); rabo.scale.set(0.04, 0.4, 0.04); rabo.position.set(0, 0.5, -0.38); rabo.rotation.x = -0.7; g.add(rabo);
    }
  } else if (tipo === "bola") {
    bola(g, 0.38, std(COR_OBJ[valor], { roughness: 0.35 }), 0, 0.4, 0);
    const f = new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.03, 6, 24), std(0xffffff)); f.position.y = 0.4; g.add(f);
  } else if (tipo === "forma") {
    const cor = { circulo: 0xe53935, quadrado: 0x1e6fe0, triangulo: 0xffc928 }[valor];
    const m = std(cor, { roughness: 0.5 });
    let geo;
    if (valor === "triangulo") { const t = new THREE.Shape([new THREE.Vector2(0, 0.46), new THREE.Vector2(-0.48, -0.36), new THREE.Vector2(0.48, -0.36)]); geo = new THREE.ExtrudeGeometry(t, { depth: 0.14, bevelEnabled: false }); geo.translate(0, 0, -0.07); }
    else if (valor === "circulo") { geo = new THREE.CylinderGeometry(0.42, 0.42, 0.14, 28); geo.rotateX(Math.PI / 2); }
    else geo = new THREE.BoxGeometry(0.72, 0.72, 0.14);
    const f = new THREE.Mesh(geo, m); f.position.y = 0.66; f.castShadow = true; g.add(f);
    bloco(g, 0.5, 0.1, 0.3, std(0xffffff), 0, 0.05, 0); bloco(g, 0.06, 0.2, 0.06, std(0xffffff), 0, 0.18, 0);
  } else if (tipo === "letra") {
    const tex = texturaCanvas(128, 128, (c, w, h) => { c.fillStyle = "#fffaf0"; c.fillRect(0, 0, w, h); c.lineWidth = 10; c.strokeStyle = COR_LETRA[valor.charCodeAt(0) % 6]; c.strokeRect(5, 5, w - 10, h - 10); c.font = "900 96px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = COR_LETRA[valor.charCodeAt(0) % 6]; c.fillText(valor, w / 2, h / 2 + 6); });
    const cubo = bloco(g, 0.7, 0.7, 0.7, std(0xffffff, { map: tex, roughness: 0.7 }), 0, 0.36, 0); cubo.rotation.y = 0.2;
  }
  const anel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 6, 28), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); anel.rotation.x = Math.PI / 2; anel.position.y = 0.06; anel.visible = false; g.add(anel);
  g.userData.anel = anel;
  return g;
}
