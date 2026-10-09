// Cores da Criação: o mundo começa desenhado a lápis (cinza com hachura) e cada objeto ganha a cor
// de verdade quando o Rabisco chega perto, com um "pop", brilho e uma nota musical.
//
//   const cores = criarCores(cena);
//   cores.registrar(objeto, { raio: 5 });   // o objeto fica cinza até o Rabisco passar
//   cores.atualizar(dt, posicaoDoRabisco);    // a cada quadro
//   cores.colorirTudo();                      // final: tudo ganha cor em onda

import { THREE, toon, texturaCanvas } from "../../src/motor3d/toon.js";
import { sons } from "../../src/motor/sons.js";

// hachura de lápis: traços diagonais sobre papel
export const texHachura = texturaCanvas(128, 128, (c, w, h) => {
  c.fillStyle = "#f2f2f2"; c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(90, 90, 90, 0.28)"; c.lineWidth = 2.2;
  for (let i = -h; i < w; i += 12) { c.beginPath(); c.moveTo(i, h); c.lineTo(i + h, 0); c.stroke(); }
  c.strokeStyle = "rgba(90, 90, 90, 0.12)"; c.lineWidth = 1.4;
  for (let i = 0; i < w + h; i += 18) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i - h, h); c.stroke(); }
}, { repetir: true });
texHachura.repeat.set(3, 3); // traço fino, como lápis de verdade

const cinzas = new Map();
// versão a lápis de um material: cinza claro conforme a luminosidade da cor original
function versaoLapis(mat) {
  if (!mat || mat.isShaderMaterial || mat.isMeshBasicMaterial) return null; // Rabisco e contornos ficam como são
  if (cinzas.has(mat.uuid)) return cinzas.get(mat.uuid);
  const c = mat.color ?? new THREE.Color(1, 1, 1);
  const lum = mat.map ? 0.8 : 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
  const g = 0.62 + lum * 0.33;
  const cinza = toon(new THREE.Color(g, g, g).getHex(), { map: texHachura, transparent: mat.transparent, opacity: mat.opacity });
  cinzas.set(mat.uuid, cinza);
  return cinza;
}

export function criarCores(cena) {
  const itens = [];           // { obj, raio, colorido, malhas: [[malha, materialColorido]], centro }
  const brilhos = [];
  let nota = 0;
  const texBrilho = texturaCanvas(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,240,150,0.9)"); g.addColorStop(1, "rgba(255,240,150,0)");
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  });
  const CORES_BRILHO = [0xff7a00, 0xec2e8c, 0x00b5f0, 0xffcc1f, 0x58c43a, 0x8e6cff];

  function registrar(obj, { raio = 4.5, centro = null, som = true } = {}) {
    const malhas = [];
    obj.traverse((m) => {
      if (!m.isMesh) return;
      const original = m.material;
      if (Array.isArray(original)) {
        const lapis = original.map(versaoLapis);
        if (lapis.every(Boolean)) { malhas.push([m, original]); m.material = lapis; }
        return;
      }
      const lapis = versaoLapis(original);
      if (lapis) { malhas.push([m, original]); m.material = lapis; }
    });
    const item = { obj, raio, colorido: false, malhas, centro, som, pop: 0, escala: obj.scale.clone() };
    itens.push(item);
    return item;
  }

  const p = new THREE.Vector3();
  function colorir(item, comSom = true) {
    if (item.colorido) return;
    item.colorido = true;
    for (const [m, mat] of item.malhas) m.material = mat;
    item.pop = 0.001;
    item.obj.getWorldPosition(p);
    if (comSom && item.som) { sons.nota(nota++ % 8); }
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrilho, color: CORES_BRILHO[(nota + i) % 6], transparent: true, depthWrite: false }));
      s.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.8 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5));
      s.scale.setScalar(0.38);
      s.userData = { vida: 0.7, vy: 1.5 + Math.random() * 1.5 };
      cena.add(s);
      brilhos.push(s);
    }
  }

  function atualizar(dt, pos) {
    for (const it of itens) {
      if (!it.colorido) {
        if (it.centro) p.copy(it.centro); else it.obj.getWorldPosition(p);
        const dx = p.x - pos.x, dz = p.z - pos.z;
        if (dx * dx + dz * dz < it.raio * it.raio) colorir(it);
      } else if (it.pop > 0) {
        // pop: cresce um pouco e volta
        it.pop += dt;
        const k = Math.min(1, it.pop / 0.35);
        const s = 1 + Math.sin(k * Math.PI) * 0.14;
        it.obj.scale.set(it.escala.x * s, it.escala.y * s, it.escala.z * s);
        if (k >= 1) { it.pop = 0; it.obj.scale.copy(it.escala); }
      }
    }
    for (let i = brilhos.length - 1; i >= 0; i--) {
      const s = brilhos[i];
      s.userData.vida -= dt;
      s.position.y += s.userData.vy * dt;
      s.material.opacity = Math.max(0, s.userData.vida / 0.7);
      if (s.userData.vida <= 0) { cena.remove(s); s.material.dispose(); brilhos.splice(i, 1); }
    }
  }

  // fração do mundo já colorida (0 a 1)
  const progresso = () => (itens.length ? itens.filter((i) => i.colorido).length / itens.length : 1);

  // final: tudo que ficou cinza ganha cor numa onda a partir de um ponto
  function colorirTudo(origem) {
    const resto = itens.filter((i) => !i.colorido).map((i) => { i.obj.getWorldPosition(p); return [i, p.distanceTo(origem)]; }).sort((a, b) => a[1] - b[1]);
    resto.forEach(([i, d], k) => setTimeout(() => colorir(i, k % 3 === 0), d * 35));
  }

  return { registrar, atualizar, colorir, colorirTudo, progresso, itens };
}
