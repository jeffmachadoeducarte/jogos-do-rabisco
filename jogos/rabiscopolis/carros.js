// Rabiscolândia: os veículos que o Rabisco dirige, no traço de desenho animado da cidade.
//  - carroFofo(cor): conversível arredondado (perfil com curvas extrudado com chanfro grande), para-lamas que
//    abraçam as rodas, capô curvo com faixa, faróis redondos com aro cromado, grade sorridente, para-choques
//    redondos, retrovisores, para-brisa com moldura, interior (bancos com friso rosa, painel, volante) e rodas
//    de pneu redondo com calota colorida.
//  - helicoptero(): azul e rosa, bolha de vidro, rotor de 4 pás e hélice na cauda (giram), esquis brancos.
//  - onibusFofo(): o ônibus amarelo da escola com a logo da Educarte; o teto e as janelas somem quando o Rabisco
//    está dirigindo (dá para ver ele no banco do motorista).
// Mesma interface do carroAberto de cidade.js: frente = +z; g.userData = { rodas, seta, motorista, carona, volante }.
// O que não mexe vira poucas malhas (mesclar); rodas, volante e seta ficam soltos.

import { THREE, mat, malha, caixa, caixaRedonda, mesclar, MAT } from "./base3d.js";
import { carregarTextura } from "../../src/motor3d/toon.js";

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
  return g;
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
  mesclar(g, { juntas: new Set(rodas) });
  for (const r of rodas) r.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  Object.assign(g.userData, { rodas, seta, volante, motorista: assentos[0], carona: assentos[1] });
  return g;
}

let texLogo = null;
export function onibusFofo() {
  texLogo ??= carregarTextura("../../assets/marca/logos/azul-icone-rosa.png");
  const g = new THREE.Group();
  const AMARELO = 0xffc61f, W = 2.9, L = 8.6;
  const forma = perfil([[L / 2 - 0.1, 0.5], [L / 2 + 0.05, 0.8, L / 2, 1.5], [L / 2 - 0.05, 1.85], [-L / 2 + 0.05, 1.85], [-L / 2 - 0.05, 1.5, -L / 2, 0.5]], [2.7, -2.7], 0.5);
  const corpo = corpoExtrudado(forma, W, mat(AMARELO), 0.25); g.add(corpo);
  const faixa = caixa(W + 0.04, 0.16, L - 0.4, mat(0x151515), { sombra: false }); faixa.position.y = 1.2; g.add(faixa);
  // logo da escola nos dois lados
  for (const s of [-1, 1]) { const lg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.75), new THREE.MeshToonMaterial({ map: texLogo, transparent: true, alphaTest: 0.3 })); lg.position.set(s * (W / 2 + 0.02), 0.82, -0.3); lg.rotation.y = s * Math.PI / 2; g.add(lg); }
  for (const z of [L / 2 + 0.08, -L / 2 - 0.08]) { const p = malha(new THREE.CapsuleGeometry(0.17, W - 0.6, 4, 10), mat(0x2f3440), { contorno: 0.04 }); p.rotation.z = Math.PI / 2; p.position.set(0, 0.62, z); g.add(p); }
  for (const x of [-0.95, 0.95]) {
    const f = malha(new THREE.CircleGeometry(0.22, 16), farol, { sombra: false }); f.position.set(x, 1.0, L / 2 + 0.07); g.add(f);
    const l = malha(new THREE.CircleGeometry(0.18, 14), lanterna, { sombra: false }); l.position.set(x, 1.0, -L / 2 - 0.07); l.rotation.y = Math.PI; g.add(l);
  }
  // interior: piso, bancos e o banco do motorista
  const piso = caixa(W - 0.3, 0.1, L - 0.6, mat(0x3a3f4c), { sombra: false }); piso.position.y = 1.86; g.add(piso);
  const assentos = [];
  for (let i = 0; i < 4; i++) for (const x of [-0.75, 0.75]) { const b = caixaRedonda(0.9, 0.5, 0.25, mat(0x2f6fc0), { raio: 0.08, contorno: 0.03 }); b.position.set(x, 2.3, 1.2 - i * 1.5); g.add(b); }
  const bm = caixaRedonda(0.8, 0.28, 0.8, mat(0xfff4e0), { raio: 0.1, contorno: 0.03 }); bm.position.set(0.7, 2.05, 2.9); g.add(bm);
  assentos.push(new THREE.Vector3(0.7, 2.12, 2.95), new THREE.Vector3(-0.7, 2.12, 2.95));
  const painel = caixaRedonda(W - 0.4, 0.5, 0.4, mat(0x2f3440), { raio: 0.12, contorno: 0.03 }); painel.position.set(0, 2.15, L / 2 - 0.35); g.add(painel);
  // parte de cima (janelas e teto): some quando o Rabisco dirige
  const cima = new THREE.Group(); cima.userData.dinamico = true; g.add(cima);
  const vid = new THREE.Mesh(new THREE.BoxGeometry(W - 0.15, 1.2, L - 0.4), new THREE.MeshToonMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.55 })); vid.position.y = 2.5; cima.add(vid);
  for (const z of [-L / 2 + 0.25, -1.4, 1.4]) for (const s of [-1, 1]) { const c = caixa(0.2, 1.25, 0.24, mat(AMARELO), { contorno: 0.04 }); c.position.set(s * (W / 2 - 0.12), 2.5, z); g.add(c); }
  const traseira = caixa(W - 0.05, 1.25, 0.2, mat(AMARELO), { contorno: 0.04 }); traseira.position.set(0, 2.5, -L / 2 + 0.2); g.add(traseira);
  const teto = caixaRedonda(W + 0.05, 0.4, L + 0.05, mat(0xfff4e0), { raio: 0.18, contorno: 0.06 }); teto.position.y = 3.25; cima.add(teto);
  const volante = malha(new THREE.TorusGeometry(0.26, 0.05, 8, 18), mat(0x262626)); volante.position.set(0.7, 2.45, 3.6); volante.rotation.x = -1.0; volante.userData.dinamico = true; g.add(volante);
  const rodas = [];
  for (const [x, z] of [[-1.25, 2.7], [1.25, 2.7], [-1.25, -2.7], [1.25, -2.7]]) { const r = roda(0x2f6fc0); r.position.set(x, R_RODA + 0.06, z); r.scale.setScalar(1.15); g.add(r); rodas.push(r); }
  const seta = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 4), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); seta.rotation.x = Math.PI; seta.position.y = 5.2; seta.userData.dinamico = true; g.add(seta);
  mesclar(g, { juntas: new Set(rodas) });
  mesclar(cima);
  Object.assign(g.userData, { rodas, seta, volante, cima, motorista: assentos[0], carona: assentos[1] });
  return g;
}
// helicoptero(): azul e rosa (cores do Rabisco), cabine redonda com bolha de vidro, cauda com hélice traseira,
// esquis brancos e rotor de 4 pás. userData: rotor, rotorCauda (giram), rodas = [], seta, motorista, carona, volante.
export function helicoptero() {
  const g = new THREE.Group();
  const AZUL = 0x00b5f0, ROSA = 0xec2e8c;
  // cabine: esfera achatada azul com faixa rosa
  // metade de baixo azul; em cima, uma cúpula de vidro inteira (o Rabisco aparece pilotando de qualquer lado)
  const cab = malha(new THREE.SphereGeometry(1.5, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(AZUL, { side: THREE.DoubleSide }), { contorno: 0.06 }); cab.scale.set(1, 0.9, 1.35); cab.position.y = 2.0; g.add(cab);
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(1.48, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), vidro); cupula.scale.set(1, 0.95, 1.35); cupula.position.y = 2.0; cupula.renderOrder = 3; g.add(cupula);
  const arco = malha(new THREE.TorusGeometry(1.42, 0.08, 6, 24, Math.PI), mat(ROSA), { contorno: 0.02 }); arco.rotation.y = Math.PI / 2; arco.scale.set(1.35, 0.95, 1); arco.position.y = 2.0; g.add(arco);
  const faixa = malha(new THREE.TorusGeometry(1.48, 0.12, 8, 32), mat(ROSA), { sombra: false }); faixa.rotation.y = Math.PI / 2; faixa.scale.set(1, 0.9, 1.35); faixa.position.y = 2.0; g.add(faixa);
  // bolha de vidro na frente (o Rabisco aparece dentro)
  // banco e painel
  const banco = caixaRedonda(1.6, 0.25, 0.8, mat(0xfff4e0), { raio: 0.1, contorno: 0.03 }); banco.position.set(0, 1.55, -0.3); g.add(banco);
  const encosto = caixaRedonda(1.6, 0.45, 0.2, mat(0xfff4e0), { raio: 0.1, contorno: 0.03 }); encosto.position.set(0, 1.85, -0.75); g.add(encosto); // baixinho: o Rabisco aparece por trás
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
  mesclar(g, { juntas: new Set([rotor, rotorCauda]) });
  Object.assign(g.userData, { rodas: [], rotor, rotorCauda, seta, volante: null, motorista: new THREE.Vector3(0.35, 1.68, -0.25), carona: new THREE.Vector3(-0.45, 1.68, -0.25) });
  return g;
}
void MAT;
