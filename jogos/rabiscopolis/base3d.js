// Rabiscolândia: peças 3D de base. Parte delas foi COPIADA de jogos/cidade-do-rabisco/cidade.js (que é de outro
// jogo e não deve ser editado daqui): densificar, normais, fita e semaforo. Cada cópia diz de onde veio e o que mudou.
// O resto (materiais de plástico, árvores de blocos, letreiros, a mesclagem de malhas estáticas por material, que
// corta as chamadas de desenho) é novo. O que é peça de blocos pura mora em blocos.js.

import { THREE, texturaCanvas, aleatorio } from "../../src/motor3d/toon.js";
import { LOJA_MAX } from "./mapa.js";
import { plastico, plasticoNovo, plasticoVC, emBlocos, geoCaixa, cx, claro, escuro, placaBloco, comRecorte } from "./blocos.js";

export const r = aleatorio(2027);
export { THREE, texturaCanvas };

// ---------- materiais: plástico liso (blocos.js)
// "mat" compartilhado por cor (a mesclagem junta tudo que usa o mesmo material numa malha só)
export const mat = (cor, extra = {}) => plastico(cor, extra);
// vidro das janelas: de noite acende (ceu.js liga emissiveIntensity). MAT.vidro nunca acende: nem toda janela tem gente
// em casa (e, por não ter emissivo, entra na mesclagem de cores).
export const MAT = {
  janela: plasticoNovo({ color: 0x8fd0f7, emissive: 0xffe0a0, emissiveIntensity: 0, specular: 0x8a8a8a, shininess: 90 }),
  janelaQuente: plasticoNovo({ color: 0xa6dcfa, emissive: 0xffb84d, emissiveIntensity: 0, specular: 0x8a8a8a, shininess: 90 }),
  lampada: plasticoNovo({ color: 0xfff6d8, emissive: 0xffe39a, emissiveIntensity: 0.15 }),
};
for (const m of Object.values(MAT)) m.userData.noite = true;
MAT.vidro = plastico(0x7fc4ee, { specular: 0x8a8a8a, shininess: 90 });
// poça de luz no chão embaixo dos postes (só de noite: ceu.js apaga o material de dia)
const texPoca = texturaCanvas(64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); g.addColorStop(0, "rgba(255,226,160,0.75)"); g.addColorStop(0.55, "rgba(255,214,140,0.28)"); g.addColorStop(1, "rgba(255,214,140,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); });
MAT.pocaLuz = new THREE.MeshBasicMaterial({ map: texPoca, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, visible: false });
MAT.pocaLuz.userData.noite = true;
// metal e vidro polidos (std) também viram plástico: mesmos parâmetros de antes, com mais ou menos brilho
export const std = (cor, { metalness = 0, roughness = 0.85, ...extra } = {}) => plastico(cor, { ...extra, shininess: Math.round(10 + (1 - roughness) * 90), specular: metalness > 0.1 ? 0x666666 : 0x2c2c2c });
// material de plástico com opções próprias (o que antes era um material toon solto)
export const matNovo = (op = {}) => plasticoNovo(op);

// malha com sombra. A forma redonda vira forma de blocos aqui (emBlocos), na hora de montar cada peça
export function malha(geo, material, { sombra = true } = {}) {
  const m = new THREE.Mesh(emBlocos(geo), material);
  m.castShadow = sombra; m.receiveShadow = true;
  return m;
}
// "caixa redonda" do traço antigo: no mundo de blocos, caixa reta com a mesma medida
export const geoCaixaRedonda = (w, h, d) => geoCaixa(w, h, d);
export const caixaRedonda = (w, h, d, material, { sombra = true } = {}) => malha(geoCaixa(w, h, d), material, { sombra });
export const caixa = (w, h, d, material, { sombra = true } = {}) => malha(geoCaixa(w, h, d), material, { sombra });

// ---------- texturas: chão, rua e calçada em placas, com pinos discretos (mesmo tom da placa, um nada mais claro)
const pino = (c, x, y, r, topo, lado) => { c.fillStyle = lado; c.beginPath(); c.arc(x + r * 0.1, y + r * 0.16, r, 0, Math.PI * 2); c.fill(); c.fillStyle = topo; c.beginPath(); c.arc(x, y, r * 0.9, 0, Math.PI * 2); c.fill(); };
// semente fixa: o chão sai sempre igual
const rt = aleatorio(4242);
export const TEX = {
  // placas de 2,5 m (4 × 4 pinos) em três verdes bem próximos; a junta fina entre as placas
  grama: texturaCanvas(512, 512, (c, w, h) => {
    const verdes = [["#5dbb50", "#63c156", "#56b24a"], ["#59b64c", "#5fbc52", "#52ad46"], ["#61bf54", "#67c55a", "#5ab64e"]];
    for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) {
      const [base, topo, lado] = verdes[Math.floor(rt() * 3)], x0 = i * 128, y0 = k * 128;
      c.fillStyle = base; c.fillRect(x0, y0, 128, 128);
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) pino(c, x0 + 16 + a * 32, y0 + 16 + b * 32, 7, topo, lado);
      c.strokeStyle = lado; c.lineWidth = 2; c.strokeRect(x0 + 1, y0 + 1, 126, 126);
    }
  }, { repetir: true }),
  asfalto: texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#565a64"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#5b5f6a"; c.fillRect(8, 8, w - 16, h - 16);
    c.strokeStyle = "#4c5059"; c.lineWidth = 3; c.strokeRect(0, 0, w, h);
  }, { repetir: true }),
  // calçada: u = 0 na beira da rua (meio-fio claro com sombrinha) e placas com pinos no resto
  calcada: texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#dfe2e8"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) pino(c, 50 + i * 35, 21 + k * 43, 7, "#e5e8ee", "#cfd3db");
    c.fillStyle = "#f8f9fc"; c.fillRect(0, 0, 26, h);
    c.fillStyle = "#9aa3b4"; c.fillRect(26, 0, 5, h);
    c.strokeStyle = "#c3c8d2"; c.lineWidth = 3; c.strokeRect(31, 0, w - 31, h);
  }, { repetir: true }),
  linha: texturaCanvas(32, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = "#f6f7fb"; for (let y = 0; y < h; y += 64) c.fillRect(0, y, w, 34); }, { repetir: true }),
  // água: tracinhos claros em fileiras, como ondas de blocos (mundo.js escorrega a textura devagar)
  agua: texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#3f9fd2"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const x = Math.floor(rt() * 15) * 16, y = Math.floor(rt() * 15) * 16, l = 24 + Math.floor(rt() * 3) * 16; c.fillStyle = i % 3 ? "#4dabdc" : "#6cc0e6"; c.fillRect(x, y, l, 6); if (x + l > w) c.fillRect(x - w, y, l, 6); }
  }, { repetir: true }),
  terra: texturaCanvas(128, 128, (c, w, h) => { c.fillStyle = "#c98a52"; c.fillRect(0, 0, w, h); c.strokeStyle = "#b0763f"; c.lineWidth = 3; c.strokeRect(0, 0, w, h); }, { repetir: true }),
};

// água (mar, lago e chafariz): um material só, de brilho alto, que clareia um pouco de noite para não sumir
export const MAT_AGUA = plasticoNovo({ map: TEX.agua, emissive: 0x0b3a5a, emissiveIntensity: 0.2, specular: 0x666666, shininess: 70 });
MAT_AGUA.userData.noite = true;
// água lisa (lago e chafariz): os discos de pixels têm um uv por fileira, sem textura
export const MAT_LAGO = new THREE.MeshPhongMaterial({ color: 0x45a8d8, emissive: 0x0b3a5a, emissiveIntensity: 0.2, specular: 0x777777, shininess: 70 });
MAT_LAGO.userData.noite = true;

// ---------- placa de texto e letreiro em 3D (placa reta com moldura, presa numa fachada; largura em metros)
export const placa = (texto, op = {}) => placaBloco(texto, op);
export function letreiro(texto, largura = 8, opcoes = {}) {
  const prop = (opcoes.w ?? 512) / (opcoes.h ?? 128), alt = largura / prop;
  const g = new THREE.Group();
  const corHex = new THREE.Color(opcoes.cor ?? "#00b5f0").getHex();
  cx(g, largura + 0.24, alt + 0.24, 0.2, corHex, 0, 0, -0.04, { sombra: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, alt), matNovo({ map: placa(texto, { fundo: "#ffffff", ...opcoes, cor: opcoes.fundo ?? "#ffffff" }), emissive: 0xffffff, emissiveIntensity: 0.14 }));
  m.material.emissiveMap = m.material.map;
  m.position.z = 0.075;
  g.add(m);
  return g;
}

// ---------- fitas ao longo de linhas (copiado de cidade.js · densificar, normais e fita, sem mudança de lógica;
// a fita agora devolve a malha sem pôr na cena, para a montagem decidir o bloco)
export function densificar(pts, fechada, passo = 4) {
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
export function normais(pts, fechada) {
  const n = pts.length, ns = [];
  for (let i = 0; i < n; i++) {
    const a = pts[fechada ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[fechada ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    ns.push([-dz / l, dx / l]); // direita de quem anda no sentido da linha
  }
  return ns;
}
export function fita(pts, fechada, a, b, y, material, repV, pular = null) {
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
      // face sempre para cima: o plástico de lado de trás escurece (a normal inverte)
      if (b > a) ind.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); else ind.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
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
  // normais sempre para cima
  const nrm = geo.attributes.normal;
  for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  return m;
}

// ---------- árvores de blocos. escala 1 ≈ 5,5 m. Quatro tipos: copa de cubos, pinheiro de camadas, ipê florido e
// copa alta. Tudo caixa: entra na mesclagem e custa bem menos que as bolas de antes.
const VERDES = [0x42c92d, 0x35b83a, 0x58d63a, 0x2fae45];
const IPES = [0xff6fb0, 0xffd21f];
export function arvoreReal(escala = 1, tipo = 0) {
  const g = new THREE.Group();
  const verde = VERDES[tipo % VERDES.length], o = { sombra: true }, f = { sombra: false };
  if (tipo % 5 === 4) { // ipê: tronco fino e copa baixa e larga, toda florida
    const flor = IPES[tipo % 10 === 4 ? 0 : 1];
    cx(g, 0.56, 3, 0.56, 0x7f5128, 0, 1.5, 0, f);
    cx(g, 3.5, 1.15, 3.5, flor, 0, 3.4, 0, o); cx(g, 2.5, 0.9, 2.5, claro(flor, 0.18), 0.2, 4.4, -0.1, o); cx(g, 1.4, 0.7, 1.4, claro(flor, 0.34), -0.2, 5.1, 0.2, f);
    cx(g, 1.0, 0.7, 1.0, escuro(flor, 0.9), 1.5, 2.8, 0.8, f);
  } else if (tipo % 3 === 2) { // pinheiro de camadas
    cx(g, 0.62, 2.2, 0.62, 0x7f5128, 0, 1.1, 0, f);
    [[3.3, 1.0, 2.4], [2.6, 1.0, 3.3], [1.9, 1.0, 4.2], [1.1, 0.9, 5.1], [0.5, 0.6, 5.8]].forEach(([w, h, y], i) => cx(g, w, h, w, i % 2 ? claro(verde, 0.09) : escuro(verde, 0.92), 0, y, 0, i < 2 ? o : f));
  } else if (tipo % 4 === 1) { // copa alta de cubos deslocados
    cx(g, 0.62, 3.2, 0.62, 0x8a5426, 0, 1.6, 0, f);
    cx(g, 2.5, 2.2, 2.5, verde, 0, 4.0, 0, o); cx(g, 1.7, 1.4, 1.7, claro(verde, 0.12), -0.5, 5.5, 0.3, f); cx(g, 1.3, 1.1, 1.3, claro(verde, 0.05), 1.3, 3.5, -0.7, f); cx(g, 1.2, 1.0, 1.2, escuro(verde, 0.88), -1.2, 3.3, 0.9, f);
  } else { // copa de cubos
    cx(g, 0.72, 2.7, 0.72, 0x8a5426, 0, 1.35, 0, f);
    cx(g, 3.3, 2.4, 3.3, verde, 0, 3.8, 0, o); cx(g, 2.1, 1.4, 2.1, claro(verde, 0.12), 0.3, 5.5, -0.2, f); cx(g, 1.3, 1.2, 1.3, claro(verde, 0.2), 1.9, 3.1, 0.7, f); cx(g, 1.2, 1.0, 1.2, escuro(verde, 0.86), -1.9, 3.4, -0.6, f);
  }
  g.scale.setScalar(escala);
  return g;
}

// ---------- semáforo (copiado de cidade.js · semaforo; de blocos, com as luzes quadradas na caixa e viseiras)
export function semaforo() {
  const g = new THREE.Group();
  cx(g, 0.2, 4.2, 0.2, 0x2f3440, 0, 2.1, 0);
  cx(g, 0.42, 0.3, 0.42, 0x4a5262, 0, 0.15, 0);
  cx(g, 0.78, 1.95, 0.55, 0x23262e, 0, 4.6, 0);
  const luzes = {};
  [["vermelho", 0xff2a2a, 5.15], ["amarelo", 0xffc21a, 4.6], ["verde", 0x2aff6a, 4.05]].forEach(([nome, cor, y]) => {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshPhongMaterial({ color: 0x333333, emissive: cor, emissiveIntensity: 0 }));
    l.position.set(0, y, 0.285);
    g.add(l);
    luzes[nome] = l;
    cx(g, 0.56, 0.06, 0.2, 0x15171c, 0, y + 0.25, 0.37, { sombra: false }); // viseira
  });
  // bonequinho de pedestre (verde = pode atravessar)
  const ped = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), new THREE.MeshPhongMaterial({ color: 0x222222, emissive: 0xff3030, emissiveIntensity: 1 }));
  ped.position.set(0, 3.2, 0.13);
  cx(g, 0.6, 0.6, 0.2, 0x23262e, 0, 3.2, 0);
  g.add(ped);
  for (const l of Object.values(luzes)) l.userData.dinamico = true;
  ped.userData.dinamico = true;
  g.userData = { luzes, ped };
  return g;
}

// ---------- loja de empresa parceira: prédio de blocos com a marca reconhecível. A logo REAL (recortada do arquivo em
// assets/parceiros) é o letreiro; cada marca tem a sua fachada, baseada no prédio de verdade. Enquanto a imagem não
// chega (ou se ela falhar), o letreiro mostra o nome em texto. aoMudar(largura) avisa a largura (colisão).
export const LOJA = { altura: 8, d: 7.5, larguraMax: LOJA_MAX };
// recorte: pedaço da imagem que é a logo; w: largura do prédio
const MARCAS = {
  "J.E Multimarcas": { parede: 0xf4f2ee, faixa: 0x17181c, acento: 0xe8413c, acento2: 0x1f5fd6, placa: "#17181c", texto: "#ffffff", w: 19.5, h: 7.6, recorte: [0, 0, 1, 0.375] },
  "Bella Cat Make Biju": { parede: 0xf2e6ff, faixa: 0xffffff, acento: 0xec2e8c, acento2: 0xbfe9e6, placa: "#ffffff", texto: "#ec2e8c", w: 15, h: 8.2, recorte: [0, 0.03, 1, 0.335] },
  "Academia Rise Up": { parede: 0xe8d9b8, faixa: 0x24272e, acento: 0xff7a00, acento2: 0xffe0a0, placa: "#17191e", texto: "#ff7a00", w: 19, h: 8.6, recorte: [0.42, 0.39, 0.68, 0.655] },
};
export function lojaParceira(p, aoMudar, { foto = p.foto, d = LOJA.d, larguraMax = LOJA.larguraMax } = {}) {
  const g = new THREE.Group();
  const m = MARCAS[p.nome] ?? MARCAS["J.E Multimarcas"];
  const w = Math.min(larguraMax, m.w), h = m.h;
  const z = (x, y, ww, hh, q = 0.2) => cx(g, ww, hh, q, 0xffffff, x, y, q / 2 - 0.02, { sombra: false }); // moldura
  cx(g, w, h, d, m.parede, 0, h / 2, -d / 2);
  cx(g, w + 0.2, 0.6, d + 0.2, escuro(m.parede, 0.74), 0, 0.3, -d / 2);       // rodapé
  cx(g, w + 0.7, 0.5, d + 0.7, m.faixa === 0xffffff ? m.acento : m.faixa, 0, h + 0.25, -d / 2);    // beiral
  cx(g, w - 2, 0.5, d - 2, escuro(m.parede, 0.9), 0, h + 0.65, -d / 2);        // caixas do telhado
  cx(g, 2.4, 1.1, 2.0, 0xc9ced8, w / 4, h + 1.45, -d / 2); cx(g, 1.2, 0.8, 1.2, 0xdfe3ea, -w / 4, h + 1.3, -d / 2 - 0.6);
  // letreiro: caixa da marca com a logo real
  const lw = p.nome === "Academia Rise Up" ? 7 : p.nome === "Bella Cat Make Biju" ? w - 0.6 : w - 0.4;
  const lh = p.nome === "Academia Rise Up" ? 3.3 : p.nome === "Bella Cat Make Biju" ? 3.2 : 2.9;
  const ly = h - lh / 2 - 0.2 - (p.nome === "Academia Rise Up" ? 0.55 : 0);
  cx(g, lw + 0.3, lh + 0.3, 0.5, m.faixa, 0, ly, 0.24);
  const matL = matNovo({ map: placa(p.nome, { cor: m.placa, fundo: m.placa, tinta: m.texto, w: 1024, h: Math.round(1024 * lh / lw) }) });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), matL); logo.position.set(0, ly, 0.5); logo.userData.dinamico = true; g.add(logo);
  g.userData.fotoOk = false;
  comRecorte(matL, `../../${foto}`, m.recorte, (t) => { g.userData.fotoOk = true; g.userData.aoFoto?.(t); }, () => g.userData.aoFalhar?.());
  // térreo: vitrines de ponta a ponta com porta no meio, cada marca com um detalhe da fachada real
  const yV = 1.95, nV = p.nome === "Bella Cat Make Biju" ? 2 : 3, hV = ly - lh / 2 - 1.05;
  for (let i = 0; i < nV; i++) {
    const x = nV === 3 ? (i - 1) * (w / 3.1) : (i ? 1 : -1) * w * 0.31, lV = nV === 3 ? w / 3.7 : w * 0.26;
    z(x, 0.65 + hV / 2 + 0.15, lV + 0.3, hV + 0.3, 0.16);
    cx(g, lV, hV, 0.14, 0, x, 0.8 + hV / 2, 0.14, { material: i % 2 ? MAT.janelaQuente : MAT.janela, sombra: false });
    cx(g, 0.1, hV, 0.08, 0xffffff, x, 0.8 + hV / 2, 0.22, { sombra: false });
  }
  if (p.nome === "J.E Multimarcas") { // risquinhas de cor da marca e luminárias
    [m.acento2, 0x2fa7e8, m.acento].forEach((c, i) => cx(g, 0.5, 0.6, 0.12, c, -w / 2 + 0.7 + i * 0.6, 0.3 + yV + 1.4, 0.04, { sombra: false }));
    for (const s of [-1, 0, 1]) cx(g, 0.5, 0.26, 0.4, 0, s * w / 3.1, 0.8 + hV + 0.32, 0.2, { material: MAT.lampada, sombra: false });
  } else if (p.nome === "Bella Cat Make Biju") { // loja aberta: porta larga, vitrines claras e árvore de flores
    cx(g, w * 0.3, hV + 0.2, 0.14, 0x1d1f27, 0, 0.8 + hV / 2 - 0.1, 0.1, { sombra: false });
    cx(g, w * 0.26, 0.5, 0.2, 0xff9ec4, 0, 1.5, 0.18, { sombra: false }); cx(g, 1.3, 1.4, 0.3, 0xffd6e8, w * 0.1, 1.6, 0.25, { sombra: false }); cx(g, 1.3, 1.4, 0.3, 0xffc0da, -w * 0.08, 1.6, 0.25, { sombra: false });
  } else { // academia: pórtico escuro com a logo, luzes quentes e pesos na janela
    cx(g, 8, h - 0.5, 0.7, m.faixa, 0, (h - 0.5) / 2, 0.1);
    cx(g, 3.4, 2.7, 0.3, 0, 0, 1.4, 0.42, { material: MAT.janelaQuente, sombra: false });
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) cx(g, 0.5, 0.26, 0.36, 0, s * (5.6 + i * 2.6), 0.8 + hV + 0.3, 0.2, { material: MAT.lampada, sombra: false });
  }
  g.userData.largura = w; g.userData.alturaFoto = h;
  aoMudar?.(w, h);
  return g;
}

// ---------- mesclagem: junta as malhas estáticas de um grupo numa malha por material (uma chamada de desenho cada).
// Cores lisas (plástico sem textura nem emissivo) viram cor por vértice num material único: dezenas de cores,
// uma chamada só. Pula o que tiver userData.dinamico (no próprio objeto ou num pai) e o que já foi mesclado.
// juntas: Set de nós que se mexem (ex.: ombro e cotovelo do Rabisco). Cada malha vai para a junta mais próxima
// acima dela (ou para a raiz), então o que gira continua girando. Também junta as peças "pintadas" do Rabisco
// (ShaderMaterial com corBase), passando corBase/pesoLado para atributos por vértice.
const matVC = new Map();
function materialVC(m) {
  if (m.isMeshPhongMaterial) {
    const k = `phong|${m.specular.getHex()}|${m.shininess}|${m.side}`;
    if (!matVC.has(k)) matVC.set(k, plasticoVC(m));
    return matVC.get(k);
  }
  if (m.isMeshToonMaterial) {
    const k = `toon|${m.gradientMap?.uuid}|${m.side}`;
    if (!matVC.has(k)) matVC.set(k, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: m.gradientMap, side: m.side }));
    return matVC.get(k);
  }
  const k = `std|${m.roughness}|${m.metalness}|${m.side}`;
  if (!matVC.has(k)) matVC.set(k, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: m.roughness, metalness: m.metalness, side: m.side }));
  return matVC.get(k);
}
const corLisa = (m) => (m.isMeshPhongMaterial || m.isMeshToonMaterial || m.isMeshStandardMaterial) && !m.map && !m.emissiveMap && !m.transparent && !m.alphaTest && !m.vertexColors && !m.userData.noite
  && (!m.emissive || m.emissive.getHex() === 0 || m.emissiveIntensity === 0);
const projecao = (m) => m.isShaderMaterial && m.uniforms?.corBase && m.uniforms?.texFrente;
const matProj = new Map();
function materialProj(m) {
  const k = m.uniforms.texFrente.value.uuid;
  if (!matProj.has(k)) {
    const vert = m.vertexShader.replace("void main() {", "attribute vec3 aCorBase;\nattribute float aPesoLado;\nvarying vec3 vCorBase;\nvarying float vPesoLado;\nvoid main() {\n  vCorBase = aCorBase; vPesoLado = aPesoLado;");
    const frag = m.fragmentShader.replace(/uniform vec3 corBase;/, "varying vec3 vCorBase;\n#define corBase vCorBase").replace(/uniform float pesoLado;/, "varying float vPesoLado;\n#define pesoLado vPesoLado");
    const u = m.uniforms;
    matProj.set(k, new THREE.ShaderMaterial({ uniforms: { texFrente: u.texFrente, texCostas: u.texCostas, texLado: u.texLado }, vertexShader: vert, fragmentShader: frag }));
  }
  return matProj.get(k);
}
export function mesclar(raiz, { juntas = null } = {}) {
  raiz.updateMatrixWorld(true);
  const baldes = new Map();
  const remover = [];
  const m4 = new THREE.Matrix4();
  const invs = new Map();
  const alvoDe = (o) => { for (let p = o.parent; p; p = p.parent) { if (p === raiz || juntas?.has(p)) return p; } return raiz; };
  const dinamico = (o) => { for (let p = o; p && p !== raiz; p = p.parent) if (p.userData.dinamico) return true; return false; };
  // detalhe: peça pequena que some de longe (flores, cercas, moitas, bancos); vira malha à parte
  const detalhe = (o) => { for (let p = o; p && p !== raiz; p = p.parent) if (p.userData.detalhe) return true; return false; };
  const c = new THREE.Color();
  raiz.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.mesclada || dinamico(o) || o.geometry.morphAttributes?.position) return;
    if (juntas?.has(o)) return;
    let visivel = true; for (let q = o; q && q !== raiz; q = q.parent) if (!q.visible) visivel = false;
    if (!visivel) { remover.push(o); return; }
    const alvo = alvoDe(o);
    if (!invs.has(alvo)) invs.set(alvo, new THREE.Matrix4().copy(alvo.matrixWorld).invert());
    m4.multiplyMatrices(invs.get(alvo), o.matrixWorld);
    const base = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    base.applyMatrix4(m4);
    if (m4.determinant() < 0) { // espelhado: desvira os triângulos
      const p = base.attributes.position;
      for (let i = 0; i < p.count; i += 3) for (const at of Object.values(base.attributes)) {
        for (let k = 0; k < at.itemSize; k++) { const a = at.getComponent(i + 1, k); at.setComponent(i + 1, k, at.getComponent(i + 2, k)); at.setComponent(i + 2, k, a); }
      }
    }
    if (!base.attributes.normal) base.computeVertexNormals();
    const pedacos = Array.isArray(o.material)
      ? (o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: base.attributes.position.count, materialIndex: 0 }]).map((gr) => [o.material[gr.materialIndex], gr.start, gr.count])
      : [[o.material, 0, base.attributes.position.count]];
    for (const [material, ini, qtd] of pedacos) {
      if (!material || qtd <= 0) continue;
      const tipo = projecao(material) ? "proj" : corLisa(material) ? "vc" : "mat";
      const mat = tipo === "proj" ? materialProj(material) : tipo === "vc" ? materialVC(material) : material;
      const det = detalhe(o);
      const chave = `${alvo.uuid}|${mat.uuid}|${o.castShadow ? 1 : 0}|${det ? 1 : 0}`;
      if (!baldes.has(chave)) baldes.set(chave, { alvo, material: mat, tipo, det, sombra: o.castShadow, pos: [], nrm: [], uv: [], cor: [], pr: [], nr: [], cb: [], pl: [] });
      const b = baldes.get(chave);
      const A = base.attributes, P = A.position, N = A.normal, U = A.uv;
      if (tipo === "vc") c.copy(material.color);
      if (tipo === "proj") c.copy(material.uniforms.corBase.value);
      const peso = tipo === "proj" ? material.uniforms.pesoLado?.value ?? 1 : 0;
      for (let i = ini; i < ini + qtd; i++) {
        b.pos.push(P.getX(i), P.getY(i), P.getZ(i));
        b.nrm.push(N.getX(i), N.getY(i), N.getZ(i));
        if (tipo === "proj") { b.pr.push(A.posRef.getX(i), A.posRef.getY(i), A.posRef.getZ(i)); b.nr.push(A.nrmRef.getX(i), A.nrmRef.getY(i), A.nrmRef.getZ(i)); b.cb.push(c.r, c.g, c.b); b.pl.push(peso); }
        else if (U) b.uv.push(U.getX(i), U.getY(i)); else b.uv.push(0, 0);
        if (tipo === "vc") b.cor.push(c.r, c.g, c.b);
      }
    }
    base.dispose();
    remover.push(o);
  });
  for (const o of remover) o.removeFromParent();
  // limpa grupos vazios
  const vazios = [];
  raiz.traverse((o) => { if (o !== raiz && !o.isMesh && !o.isLight && !o.isSprite && !o.isPoints && o.children.length === 0 && !o.userData.dinamico && !juntas?.has(o)) vazios.push(o); });
  for (const o of vazios) o.removeFromParent();
  for (const b of baldes.values()) {
    const geo = new THREE.BufferGeometry();
    const F = (a, n) => new THREE.Float32BufferAttribute(a, n);
    geo.setAttribute("position", F(b.pos, 3));
    geo.setAttribute("normal", F(b.nrm, 3));
    if (b.tipo === "proj") { geo.setAttribute("posRef", F(b.pr, 3)); geo.setAttribute("nrmRef", F(b.nr, 3)); geo.setAttribute("aCorBase", F(b.cb, 3)); geo.setAttribute("aPesoLado", F(b.pl, 1)); }
    else geo.setAttribute("uv", F(b.uv, 2));
    if (b.tipo === "vc") geo.setAttribute("color", F(b.cor, 3));
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, b.material);
    m.castShadow = b.sombra; m.receiveShadow = true;
    m.userData.mesclada = true;
    m.userData.detalhe = b.det;
    b.alvo.add(m);
  }
  return baldes.size;
}

// rosto no traço do Rabisco (olhos grandes de contorno grosso, íris colorida, brilho, sobrancelha e boca aberta
// com a língua rosa), desenhado em canvas transparente. fechado = piscando (olhos em arquinho feliz).
const rostos = new Map();
export function texturaRosto({ iris = "#00b5f0", fechado = false, boca = "aberta", bochecha = true } = {}) {
  const k = `${iris}|${fechado}|${boca}|${bochecha}`;
  if (rostos.has(k)) return rostos.get(k);
  const t = texturaCanvas(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.lineCap = c.lineJoin = "round";
    const olho = (x) => {
      if (fechado) { c.lineWidth = 11; c.strokeStyle = "#151515"; c.beginPath(); c.arc(x, 112, 26, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); return; }
      c.lineWidth = 9; c.strokeStyle = "#151515"; c.fillStyle = "#ffffff";
      c.beginPath(); c.ellipse(x, 108, 34, 44, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = iris; c.beginPath(); c.ellipse(x + 4, 116, 22, 28, 0, 0, Math.PI * 2); c.fill();
      c.lineWidth = 4; c.stroke();
      c.fillStyle = "#151515"; c.beginPath(); c.ellipse(x + 5, 118, 13, 18, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ffffff"; c.beginPath(); c.arc(x - 3, 106, 6.5, 0, Math.PI * 2); c.fill();
    };
    olho(84); olho(172);
    // sobrancelhas grossas, curvinhas
    c.fillStyle = "#151515";
    for (const [x, s] of [[80, -1], [176, 1]]) {
      c.beginPath(); c.ellipse(x, 50, 26, 9, s * 0.18, Math.PI, Math.PI * 2); c.lineWidth = 12; c.strokeStyle = "#151515"; c.stroke();
    }
    if (bochecha) { c.fillStyle = "rgba(255,120,160,0.45)"; for (const x of [44, 212]) { c.beginPath(); c.ellipse(x, 170, 16, 10, 0, 0, Math.PI * 2); c.fill(); } }
    // boca
    if (boca === "aberta") {
      c.fillStyle = "#151515"; c.beginPath(); c.moveTo(86, 176); c.quadraticCurveTo(128, 186, 172, 172); c.quadraticCurveTo(160, 236, 128, 236); c.quadraticCurveTo(96, 236, 86, 176); c.fill();
      c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(94, 182); c.quadraticCurveTo(128, 190, 164, 179); c.lineTo(161, 192); c.quadraticCurveTo(128, 200, 97, 194); c.fill();
      c.fillStyle = "#f45aa6"; c.beginPath(); c.ellipse(130, 222, 20, 10, 0, 0, Math.PI * 2); c.fill();
    } else {
      c.lineWidth = 9; c.strokeStyle = "#151515"; c.beginPath(); c.arc(128, 168, 30, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
    }
  });
  rostos.set(k, t);
  return t;
}
