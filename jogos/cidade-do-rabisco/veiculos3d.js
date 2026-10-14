// Veículos fofinhos da Cidade do Rabisco, COPIADOS de jogos/rabiscopolis/carros.js (Rabiscolândia, outro jogo, que
// não é editado daqui): carroFofo (conversível arredondado, usado nos 5 carros do pátio da J.E Multimarcas) e
// helicoptero (azul e rosa, do heliponto do hospital). Mudanças da cópia: a cabine do helicóptero tem a metade de
// cima toda de vidro (o Rabisco aparece pilotando); a junção de malhas usa mesclarLocal
// (./mesclar.js) no lugar do "mesclar" da Rabiscolândia, e as peças de base (mat, malha, caixa, caixaRedonda) vêm
// daqui mesmo (cópia de jogos/rabiscopolis/base3d.js). Mesma interface do carroAberto (cidade.js): frente = +z;
// g.userData = { rodas, seta, motorista, carona, volante, cor } (o helicóptero tem ainda rotor e rotorCauda).

import { THREE, toon, comContorno } from "../../src/motor3d/toon.js";
import { mesclarLocal } from "./mesclar.js";

const mat = (cor, extra = {}) => toon(cor, extra);
function malha(geo, material, { contorno = 0, sombra = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = sombra; m.receiveShadow = true;
  if (contorno) comContorno(m, contorno);
  return m;
}
const geoRedondas = new Map();
function geoCaixaRedonda(w, h, d, raio = 0.2, seg = 2) {
  const k = [w, h, d, raio, seg].map((v) => +v.toFixed(3)).join("|");
  if (geoRedondas.has(k)) return geoRedondas.get(k);
  const rr = Math.min(raio, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
  const ww = w / 2 - rr, hh = h / 2 - rr, c = Math.min(rr, ww, hh) * 0.6;
  const f = new THREE.Shape();
  f.moveTo(-ww + c, -hh); f.lineTo(ww - c, -hh); f.quadraticCurveTo(ww, -hh, ww, -hh + c);
  f.lineTo(ww, hh - c); f.quadraticCurveTo(ww, hh, ww - c, hh); f.lineTo(-ww + c, hh);
  f.quadraticCurveTo(-ww, hh, -ww, hh - c); f.lineTo(-ww, -hh + c); f.quadraticCurveTo(-ww, -hh, -ww + c, -hh);
  const geo = new THREE.ExtrudeGeometry(f, { depth: Math.max(0.01, d - 2 * rr), bevelEnabled: true, bevelThickness: rr, bevelSize: rr, bevelSegments: seg, curveSegments: 3 });
  geo.center();
  geoRedondas.set(k, geo);
  return geo;
}
const caixaRedonda = (w, h, d, material, { raio = 0.2, contorno = 0, sombra = true } = {}) => malha(geoCaixaRedonda(w, h, d, raio), material, { contorno, sombra });
const caixa = (w, h, d, material, { contorno = 0, sombra = true } = {}) => malha(new THREE.BoxGeometry(w, h, d), material, { contorno, sombra });

const R_RODA = 0.44;
const vidro = new THREE.MeshToonMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
const farol = new THREE.MeshToonMaterial({ color: 0xfffbe6, emissive: 0xfff2c0, emissiveIntensity: 0.6 });
const lanterna = mat(0xff3b3b); // cor lisa: entra na malha única do carro
// roda: pneu redondo (toro), calota branca com miolo colorido e 5 raios; gira em x (rotation.x)
function roda(corMiolo) {
  const g = new THREE.Group();
  const pneu = malha(new THREE.TorusGeometry(R_RODA - 0.15, 0.15, 6, 16), mat(0x262626), { sombra: true }); pneu.rotation.y = Math.PI / 2; pneu.scale.z = 1.25; g.add(pneu);
  const aro = malha(new THREE.CylinderGeometry(0.27, 0.27, 0.3, 18), mat(0xf4f4f4)); aro.rotation.z = Math.PI / 2; g.add(aro);
  const miolo = malha(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 12), mat(corMiolo)); miolo.rotation.z = Math.PI / 2; g.add(miolo);
  for (let i = 0; i < 5; i++) { const r = caixa(0.32, 0.05, 0.08, mat(0xb8c0cc), { sombra: false }); r.rotation.x = (i / 5) * Math.PI * 2; r.position.x = 0; const p = new THREE.Group(); p.add(r); r.position.y = 0.13; p.rotation.x = (i / 5) * Math.PI * 2; g.add(p); }
  return mesclarLocal(g); // a roda gira inteira: pneu, aro, miolo e raios viram poucas malhas
}
// perfil lateral (z para a frente, y para cima) com os arcos das rodas recortados
function perfil(pontos, arcos, yBase) {
  const f = new THREE.Shape();
  f.moveTo(...pontos[0]);
  for (let i = 1; i < pontos.length; i++) {
    const p = pontos[i];
    if (p.length === 4) f.quadraticCurveTo(p[0], p[1], p[2], p[3]); else f.lineTo(p[0], p[1]);
  }
  // fundo, de trás para a frente, subindo em arco por cima de cada roda
  for (const z of [...arcos].sort((a, b) => a - b)) { f.lineTo(z - 0.7, yBase); f.absarc(z, yBase, 0.7, Math.PI, 0, true); }
  f.closePath();
  return f;
}
function corpoExtrudado(forma, largura, material, chanfro = 0.22) {
  const geo = new THREE.ExtrudeGeometry(forma, { depth: largura - chanfro * 2, bevelEnabled: true, bevelThickness: chanfro, bevelSize: chanfro, bevelSegments: 2, curveSegments: 6 });
  geo.translate(0, 0, -(largura - chanfro * 2) / 2);
  geo.rotateY(-Math.PI / 2); // largura vira x, o perfil fica em z (frente) e y
  return malha(geo, material, { contorno: 0.06 });
}

export function carroFofo(cor = 0xec2e8c) {
  const g = new THREE.Group();
  const lata = mat(cor);
  const claro = mat(new THREE.Color(cor).lerp(new THREE.Color(0xffffff), 0.55).getHex());
  // carroceria: porta-malas arredondado, banco aberto no meio, capô curvo descendo para a frente
  const forma = perfil([
    [2.2, 0.42], [2.32, 0.62, 2.3, 0.86], [2.22, 1.02, 1.95, 1.08], [1.0, 1.16], [0.7, 1.16],
    [0.62, 0.98], [-1.05, 0.98], [-1.15, 1.18], [-1.9, 1.2], [-2.32, 1.1, -2.34, 0.8], [-2.3, 0.42],
  ], [1.42, -1.42], 0.42);
  const corpo = corpoExtrudado(forma, 2.25, lata, 0.12); corpo.position.y = 0; g.add(corpo);
  // faixa no capô e no porta-malas
  for (const [z, comp, y] of [[1.45, 1.0, 1.25], [-1.55, 0.7, 1.33]]) { const f = caixa(0.4, 0.04, comp, mat(0xffffff), { sombra: false }); f.position.set(0, y, z); f.rotation.x = z > 0 ? 0.09 : 0; g.add(f); }
  // saia clara embaixo (dá o "tom de brinquedo")
  const saia = caixaRedonda(2.32, 0.2, 2.6, claro, { raio: 0.08 }); saia.position.set(0, 0.5, 0); g.add(saia);
  // para-choques redondos
  for (const z of [2.46, -2.48]) { const p = malha(new THREE.CapsuleGeometry(0.16, 1.7, 4, 10), mat(0xf4f4f4), { contorno: 0.04 }); p.rotation.z = Math.PI / 2; p.position.set(0, 0.52, z); g.add(p); }
  // faróis com aro cromado e lanternas
  for (const x of [-0.68, 0.68]) {
    const aro = malha(new THREE.TorusGeometry(0.2, 0.06, 8, 18), mat(0xdfe6ee), { contorno: 0.02 }); aro.position.set(x, 0.88, 2.45); g.add(aro);
    const f = malha(new THREE.CircleGeometry(0.2, 18), farol, { sombra: false }); f.position.set(x, 0.88, 2.46); g.add(f);
    const brilho = malha(new THREE.CircleGeometry(0.06, 10), mat(0xffffff), { sombra: false }); brilho.position.set(x - 0.07, 0.95, 2.47); g.add(brilho);
    const l = malha(new THREE.CircleGeometry(0.15, 14), lanterna, { sombra: false }); l.position.set(x, 0.9, -2.48); l.rotation.y = Math.PI; g.add(l);
  }
  // grade sorridente
  const sorriso = malha(new THREE.TorusGeometry(0.32, 0.05, 6, 16, Math.PI), mat(0x262626), { sombra: false }); sorriso.rotation.z = Math.PI; sorriso.position.set(0, 0.84, 2.5); g.add(sorriso);
  // placa
  const pl = caixa(0.7, 0.24, 0.04, mat(0xffffff), { contorno: 0.02, sombra: false }); pl.position.set(0, 0.7, -2.5); g.add(pl);
  // para-brisa com moldura
  const moldura = malha(new THREE.TorusGeometry(0.98, 0.06, 6, 20, Math.PI), mat(0xdfe6ee), { contorno: 0.02 }); moldura.scale.set(1, 0.42, 1); moldura.position.set(0, 1.27, 0.72); moldura.rotation.x = -0.35; g.add(moldura);
  const pb = new THREE.Mesh(new THREE.CircleGeometry(0.98, 20, 0, Math.PI), vidro); pb.scale.set(1, 0.42, 1); pb.position.set(0, 1.27, 0.72); pb.rotation.x = -0.35; pb.renderOrder = 3; g.add(pb);
  // retrovisores
  for (const s of [-1, 1]) { const r = malha(new THREE.SphereGeometry(0.13, 10, 8), lata, { contorno: 0.02 }); r.scale.set(1, 0.7, 0.6); r.position.set(s * 1.2, 1.32, 0.55); g.add(r); }
  // interior: assoalho, painel, bancos com friso rosa
  const piso = caixa(1.9, 0.08, 1.75, mat(0x3a3f4c), { sombra: false }); piso.position.set(0, 1.12, -0.22); g.add(piso);
  const painel = caixaRedonda(1.95, 0.32, 0.4, mat(0x2f3440), { raio: 0.12, contorno: 0.03 }); painel.position.set(0, 1.28, 0.42); g.add(painel);
  const assentos = [];
  for (const x of [0.5, -0.5]) {
    const a = caixaRedonda(0.78, 0.24, 0.8, mat(0xfff4e0), { raio: 0.1, contorno: 0.03 }); a.position.set(x, 1.24, -0.45); g.add(a);
    const e = caixaRedonda(0.78, 0.62, 0.2, mat(0xfff4e0), { raio: 0.1, contorno: 0.03 }); e.position.set(x, 1.6, -0.92); e.rotation.x = -0.12; g.add(e);
    const friso = caixa(0.8, 0.07, 0.22, mat(0xec2e8c), { sombra: false }); friso.position.set(x, 1.87, -0.95); g.add(friso);
    assentos.push(new THREE.Vector3(x, 1.32, -0.42));
  }
  // volante (solto: o jogo encaixa nas mãos do Rabisco)
  const volante = malha(new THREE.TorusGeometry(0.24, 0.05, 8, 18), mat(0x262626)); volante.position.set(0.5, 1.62, 0.25); volante.rotation.x = -1.0; volante.userData.dinamico = true; g.add(volante);
  // rodas
  const rodas = [];
  for (const [x, z] of [[-1.08, 1.42], [1.08, 1.42], [-1.08, -1.42], [1.08, -1.42]]) { const r = roda(cor); r.position.set(x, R_RODA, z); g.add(r); rodas.push(r); }
  // seta "entre aqui"
  const seta = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); seta.rotation.x = Math.PI; seta.position.y = 3.2; seta.userData.dinamico = true; g.add(seta);
  mesclarLocal(g, [...rodas, volante, seta]);
  for (const r of rodas) r.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  Object.assign(g.userData, { rodas, seta, volante, motorista: assentos[0], carona: assentos[1], cor });
  return g;
}

export function helicoptero() {
  const g = new THREE.Group();
  const AZUL = 0x00b5f0, ROSA = 0xec2e8c;
  // cabine: esfera achatada azul com faixa rosa
  // (mudança da cópia: a cabine azul é só a metade de baixo e a de cima é toda de vidro, para o Rabisco aparecer pilotando)
  const cab = malha(new THREE.SphereGeometry(1.5, 24, 16, 0, Math.PI * 2, Math.PI * 0.47, Math.PI * 0.53), mat(AZUL), { contorno: 0.06 }); cab.scale.set(1, 0.9, 1.35); cab.position.y = 2.0; g.add(cab);
  const faixa = malha(new THREE.TorusGeometry(1.48, 0.12, 8, 32), mat(ROSA), { sombra: false }); faixa.rotation.y = Math.PI / 2; faixa.scale.set(1, 0.9, 1.35); faixa.position.y = 2.0; g.add(faixa);
  // bolha de vidro na frente (o Rabisco aparece dentro)
  const bolha = new THREE.Mesh(new THREE.SphereGeometry(1.5, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.47), vidro); bolha.scale.set(1, 0.9, 1.35); bolha.position.y = 2.0; bolha.renderOrder = 3; g.add(bolha);
  // banco e painel
  const banco = caixaRedonda(1.6, 0.25, 0.8, mat(0xfff4e0), { raio: 0.1, contorno: 0.03 }); banco.position.set(0, 1.55, -0.3); g.add(banco);
  const encosto = caixaRedonda(1.6, 0.8, 0.2, mat(0xfff4e0), { raio: 0.1, contorno: 0.03 }); encosto.position.set(0, 2.0, -0.75); g.add(encosto);
  const painel = caixaRedonda(1.6, 0.35, 0.35, mat(0x2f3440), { raio: 0.1 }); painel.position.set(0, 1.75, 1.25); g.add(painel);
  // cauda afinando, com aleta rosa e hélice traseira
  const cauda = malha(new THREE.CylinderGeometry(0.22, 0.55, 4.2, 14), mat(AZUL), { contorno: 0.05 }); cauda.rotation.x = Math.PI / 2; cauda.position.set(0, 2.25, -3.6); g.add(cauda);
  const aleta = caixaRedonda(0.14, 1.3, 0.9, mat(ROSA), { raio: 0.06, contorno: 0.04 }); aleta.position.set(0, 2.8, -5.4); g.add(aleta);
  const aletaH = caixaRedonda(1.6, 0.12, 0.6, mat(ROSA), { raio: 0.05, contorno: 0.03 }); aletaH.position.set(0, 2.3, -5.2); g.add(aletaH);
  const rotorCauda = new THREE.Group(); rotorCauda.position.set(0.2, 2.75, -5.55); g.add(rotorCauda);
  for (let i = 0; i < 2; i++) { const p = caixa(0.05, 1.1, 0.16, mat(0xffffff), { sombra: false }); p.rotation.x = i * Math.PI / 2; rotorCauda.add(p); }
  // esquis
  for (const s of [-1, 1]) {
    const esqui = malha(new THREE.CapsuleGeometry(0.1, 3.4, 4, 10), mat(0xf4f4f4), { contorno: 0.03 }); esqui.rotation.x = Math.PI / 2; esqui.position.set(s * 1.1, 0.12, 0.1); g.add(esqui);
    for (const z of [-0.8, 1.0]) { const h = malha(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), mat(0xf4f4f4)); h.position.set(s * 0.95, 0.6, z); h.rotation.z = s * 0.3; g.add(h); }
  }
  // mastro e rotor principal de 4 pás com ponta rosa
  const mastro = malha(new THREE.CylinderGeometry(0.15, 0.2, 0.7, 10), mat(0x2f3440), { contorno: 0.03 }); mastro.position.y = 3.5; g.add(mastro);
  const rotor = new THREE.Group(); rotor.position.y = 3.9; g.add(rotor);
  const cubo = malha(new THREE.SphereGeometry(0.28, 12, 8), mat(ROSA)); rotor.add(cubo);
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Group(); p.rotation.y = (i / 4) * Math.PI * 2; rotor.add(p);
    const pa = caixaRedonda(0.42, 0.06, 4.0, mat(0x2f3440), { raio: 0.03 }); pa.position.z = 2.1; p.add(pa);
    const ponta = caixa(0.44, 0.07, 0.5, mat(ROSA), { sombra: false }); ponta.position.z = 3.9; p.add(ponta);
  }
  const seta = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 4), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); seta.rotation.x = Math.PI; seta.position.y = 5.4; seta.userData.dinamico = true; g.add(seta);
  mesclarLocal(g, [rotor, rotorCauda, seta]);
  Object.assign(g.userData, { rodas: [], rotor, rotorCauda, seta, volante: null, motorista: new THREE.Vector3(0.35, 1.68, -0.25), carona: new THREE.Vector3(-0.45, 1.68, -0.25), cor: AZUL });
  return g;
}
