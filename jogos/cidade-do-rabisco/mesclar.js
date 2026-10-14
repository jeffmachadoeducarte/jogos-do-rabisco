// Junta malhas de material igual numa só (menos chamadas de desenho por quadro, o que pesa na TV e no celular).
// Usado pela montagem da cidade (cidade.js · mesclarEstaticos) e pelos veículos (carros e helicóptero).
import { THREE } from "../../src/motor3d/toon.js";

export function chaveMaterial(m) {
  const c = (v) => (v?.isColor ? v.getHexString() : "");
  return [m.type, c(m.color), m.map?.uuid ?? "", c(m.emissive), m.emissiveIntensity ?? "", m.emissiveMap?.uuid ?? "", m.roughness ?? "", m.metalness ?? "",
    m.transparent, m.opacity, m.side, m.flatShading, m.vertexColors, m.alphaTest, m.depthWrite, m.gradientMap?.uuid ?? ""].join("|");
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
    const k = `${chaveMaterial(o.material)}#${o.castShadow}${o.receiveShadow}#${Object.keys(o.geometry.attributes).sort().join(",")}#${o.renderOrder}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push({ o, m });
  });
  const tirar = [];
  for (const lista of grupos.values()) {
    if (lista.length < 2) continue;
    const geo = juntarGeometrias(lista.map(({ o, m }) => ({ o, ini: 0, n: o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count, m })));
    const o0 = lista[0].o, nova = new THREE.Mesh(geo, o0.material);
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
        if (nome === "position") { v.fromBufferAttribute(a, k).applyMatrix4(m); dst.set([v.x, v.y, v.z], (v0 + k) * 3); }
        else if (nome === "normal") { v.fromBufferAttribute(a, k).applyMatrix3(nm).normalize(); dst.set([v.x, v.y, v.z], (v0 + k) * 3); }
        else for (let c = 0; c < tam; c++) dst[(v0 + k) * tam + c] = a.array[k * tam + c];
      }
    }
    for (let k = 0; k < nIdx; k++) indice[i0 + k] = (g.index ? g.index.getX(ini + k) : ini + k) + v0;
    i0 += nIdx; v0 += n;
  }
  const geo = new THREE.BufferGeometry();
  for (const nome of nomes) geo.setAttribute(nome, new THREE.BufferAttribute(saida[nome], malhas[0].o.geometry.attributes[nome].itemSize));
  geo.setIndex(new THREE.BufferAttribute(indice, 1));
  geo.computeBoundingSphere(); geo.computeBoundingBox();
  return geo;
}
