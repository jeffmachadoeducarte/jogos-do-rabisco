// Base visual 3D no traço do Rabisco: sombreamento em tons chapados (cel shading)
// e contorno preto em volta dos objetos.

import * as THREE from "../../vendor/three.module.min.js";

export const COR3D = {
  ciano: 0x00b5f0, rosa: 0xec2e8c, laranja: 0xff7a00, pele: 0xfce3c6, tinta: 0x151515,
  branco: 0xffffff, amarelo: 0xffcc1f, verde: 0x58c43a, verdeEscuro: 0x3a9a2a, roxo: 0x8e6cff,
  vermelho: 0xe8413c, marrom: 0x9a6232, madeira: 0xf3c99a, grafite: 0x2a2a2a, cinza: 0x9aa3ad,
};

// 3 tons: sombra, meio-tom e luz, como pintura de desenho animado
const gradiente = (() => {
  const dados = new Uint8Array([165, 165, 165, 255, 220, 220, 220, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(dados, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const materiais = new Map();
export function toon(cor, extra = {}) {
  const chave = `${cor}-${JSON.stringify(extra)}`;
  if (!materiais.has(chave) || extra.map) {
    materiais.set(chave, new THREE.MeshToonMaterial({ color: cor, gradientMap: gradiente, ...extra }));
  }
  return materiais.get(chave);
}

const matContorno = new THREE.MeshBasicMaterial({ color: COR3D.tinta, side: THREE.BackSide });

// Contorno por "casca invertida": uma cópia um pouco maior, preta, vista por dentro.
export function comContorno(malha, espessura = 0.06) {
  const casca = new THREE.Mesh(malha.geometry, matContorno);
  malha.geometry.computeBoundingBox();
  const tam = new THREE.Vector3();
  malha.geometry.boundingBox.getSize(tam);
  casca.scale.set(1 + espessura / Math.max(tam.x, 0.01), 1 + espessura / Math.max(tam.y, 0.01), 1 + espessura / Math.max(tam.z, 0.01));
  casca.raycast = () => {};
  malha.add(casca);
  return malha;
}

// Atalho: malha toon com contorno e sombra
export function peca(geo, cor, { contorno = 0.08, sombra = true, extra } = {}) {
  const m = new THREE.Mesh(geo, toon(cor, extra));
  if (contorno) comContorno(m, contorno);
  m.castShadow = sombra;
  m.receiveShadow = true;
  return m;
}

// Textura desenhada em canvas
export function texturaCanvas(w, h, desenhar, { repetir = false, anisotropia = 8 } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  desenhar(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropia;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function carregarTextura(url) {
  const t = new THREE.TextureLoader().load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Gerador aleatório com semente (o cenário sai sempre igual)
export function aleatorio(semente = 7) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { THREE };
