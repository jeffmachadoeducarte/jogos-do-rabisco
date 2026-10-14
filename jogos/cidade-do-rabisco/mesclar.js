// Junta malhas de material igual numa só (menos chamadas de desenho por quadro, o que pesa na TV e no celular).
// Usado pela montagem da cidade (cidade.js · mesclarEstaticos) e pelos veículos (carros e helicóptero).
import { THREE } from "../../src/motor3d/toon.js";

export function chaveMaterial(m) {
  const c = (v) => (v?.isColor ? v.getHexString() : "");
  return [m.type, c(m.color), m.map?.uuid ?? "", c(m.emissive), m.emissiveIntensity ?? "", m.emissiveMap?.uuid ?? "", m.roughness ?? "", m.metalness ?? "",
    m.transparent, m.opacity, m.side, m.flatShading, m.vertexColors, m.alphaTest, m.depthWrite, m.gradientMap?.uuid ?? ""].join("|");
}
// material de cor lisa (sem textura, opaco): peças assim, de cores diferentes mas com o mesmo "acabamento", viram
// uma malha só com a cor de cada peça gravada nos vértices (o desenho fica igual: a cor do vértice multiplica o
// branco do material)
export function corLisa(m) {
  return (m.isMeshStandardMaterial || m.isMeshToonMaterial) && !m.map && !m.emissiveMap && !m.vertexColors && !m.transparent && !m.alphaTest && m.opacity === 1;
}
export function chaveVC(m) {
  const c = (v) => (v?.isColor ? v.getHexString() : "");
  return ["VC", m.type, c(m.emissive), m.emissiveIntensity ?? "", m.roughness ?? "", m.metalness ?? "", m.side, m.flatShading, m.depthWrite, m.gradientMap?.uuid ?? ""].join("|");
}
const matsVC = new Map();
export function materialVC(m) {
  const k = chaveVC(m);
  if (!matsVC.has(k)) { const n = m.clone(); n.color = new THREE.Color(0xffffff); n.vertexColors = true; n.needsUpdate = true; matsVC.set(k, n); }
  return matsVC.get(k);
}
// junta, dentro de um grupo que se move inteiro (carro, helicóptero), as peças de material igual (ex.: as 4 rodas do
// carro da rua viram 1 malha), com a posição relativa ao grupo; "manter" (e o que estiver dentro deles, ou marcado
// userData.dinamico) fica separado: rodas que giram, volante, seta, rotor
export function mesclarLocal(g, manter = []) {
  const fora = new Set(manter);
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const grupos = new Map();
  g.traverse((o) => {
    if (o === g || !o.isMesh || Array.isArray(o.material) || o.isInstancedMesh) return;
    for (let p = o; p && p !== g; p = p.parent) if (fora.has(p) || p.userData.dinamico) return;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    if (m.determinant() <= 0) return;
    const vc = corLisa(o.material);
    const k = `${vc ? chaveVC(o.material) : chaveMaterial(o.material)}#${o.castShadow}${o.receiveShadow}#${Object.keys(o.geometry.attributes).sort().join(",")}#${o.renderOrder}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push({ o, m, cor: vc ? o.material.color : null });
  });
  const tirar = [];
  for (const lista of grupos.values()) {
    if (lista.length < 2) continue;
    const geo = juntarGeometrias(lista.map(({ o, m, cor }) => ({ o, ini: 0, n: o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count, m, cor })));
    const o0 = lista[0].o, nova = new THREE.Mesh(geo, lista[0].cor ? materialVC(o0.material) : o0.material);
    nova.castShadow = o0.castShadow; nova.receiveShadow = o0.receiveShadow; nova.renderOrder = o0.renderOrder;
    for (const { o } of lista) tirar.push(o);
    g.add(nova);
  }
  // tira as peças juntadas (os filhos delas que ficaram de fora sobem para o grupo, na mesma posição)
  for (const o of tirar) { for (const f of [...o.children]) if (!tirar.includes(f)) g.attach(f); o.removeFromParent(); }
  return g;
}
export function juntarGeometrias(malhas) {
  const nomes = Object.keys(malhas[0].o.geometry.attributes);
  let nv = 0, ni = 0;
  for (const { o, n } of malhas) { nv += o.geometry.attributes.position.count; ni += n; }
  const saida = {}; for (const n of nomes) saida[n] = new Float32Array(nv * malhas[0].o.geometry.attributes[n].itemSize);
  const indice = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let v0 = 0, i0 = 0;
  const nm = new THREE.Matrix3(), v = new THREE.Vector3();
  for (const { o, ini, n: nIdx, m } of malhas) {
    const g = o.geometry, n = g.attributes.position.count;
    nm.getNormalMatrix(m);
    for (const nome of nomes) {
      const a = g.attributes[nome], tam = a.itemSize, dst = saida[nome];
      for (let k = 0; k < n; k++) {
        // escreve direto no destino (sem criar um array por vértice: bem mais rápido em aparelho fraco)
        if (nome === "position") { v.fromBufferAttribute(a, k).applyMatrix4(m); const o = (v0 + k) * 3; dst[o] = v.x; dst[o + 1] = v.y; dst[o + 2] = v.z; }
        else if (nome === "normal") { v.fromBufferAttribute(a, k).applyMatrix3(nm).normalize(); const o = (v0 + k) * 3; dst[o] = v.x; dst[o + 1] = v.y; dst[o + 2] = v.z; }
        else for (let c = 0; c < tam; c++) dst[(v0 + k) * tam + c] = a.array[k * tam + c];
      }
    }
    for (let k = 0; k < nIdx; k++) indice[i0 + k] = (g.index ? g.index.getX(ini + k) : ini + k) + v0;
    i0 += nIdx; v0 += n;
  }
  const geo = new THREE.BufferGeometry();
  for (const nome of nomes) geo.setAttribute(nome, new THREE.BufferAttribute(saida[nome], malhas[0].o.geometry.attributes[nome].itemSize));
  if (malhas[0].cor) { // cor de cada peça gravada nos vértices (materialVC)
    const cores = new Float32Array(nv * 3); let k = 0;
    for (const { o, cor } of malhas) for (let i = 0; i < o.geometry.attributes.position.count; i++) { cores[k++] = cor.r; cores[k++] = cor.g; cores[k++] = cor.b; }
    geo.setAttribute("color", new THREE.BufferAttribute(cores, 3));
  }
  geo.setIndex(new THREE.BufferAttribute(indice, 1));
  geo.computeBoundingSphere(); geo.computeBoundingBox();
  return geo;
}
