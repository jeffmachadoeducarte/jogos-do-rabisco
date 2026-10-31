// Rabiscolândia: os veículos que o Rabisco dirige, no traço de desenho animado da cidade.
//  - carroFofo(cor): conversível arredondado (perfil com curvas extrudado com chanfro grande), para-lamas que
//    abraçam as rodas, capô curvo com faixa, faróis redondos com aro cromado, grade sorridente, para-choques
//    redondos, retrovisores, para-brisa com moldura, interior (bancos com friso rosa, painel, volante) e rodas
//    de pneu redondo com calota colorida.
//  - helicoptero(): azul e rosa, bolha de vidro, rotor de 4 pás e hélice na cauda (giram), esquis brancos.
//  - onibusFofo(): o ônibus amarelo da escola com a logo da Educarte; fica inteiro (teto e janelas de vidro) e o
//    Rabisco aparece sentado no banco do motorista, por dentro das janelas.
// Mesma interface do carroAberto de cidade.js: frente = +z; g.userData = { rodas, seta, motorista, carona, volante }.
// O que não mexe vira poucas malhas (mesclar); rodas, volante e seta ficam soltos.

import { THREE, mat, std, malha, caixa, caixaRedonda, mesclar, MAT, texturaCanvas } from "./base3d.js";
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
  if (window.__blocos?.carroFofo) return window.__blocos.carroFofo(cor);
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
  // parte de cima (janelas e teto): fica sempre no lugar, o Rabisco dirige lá dentro
  const cima = new THREE.Group(); cima.userData.dinamico = true; cima.userData.cima = true; g.add(cima);
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

// ================================================================== Fatia 4: mais veículos
// Mesma interface: frente = +z; userData = { rodas, seta, motorista, carona, volante, cima? (some ao dirigir),
// especial: "buzina" | "sirene" | "musica" | "agua", luzes? (sirene), canhao? (bombeiro) }.
const seta3D = (y) => { const s = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); s.rotation.x = Math.PI; s.position.y = y; s.userData.dinamico = true; return s; };
const texto3D = (txt, cor, w = 1.6, h = 0.5) => { const t = texturaCanvas(256, 80, (c, W, H) => { c.fillStyle = "#ffffff"; c.beginPath(); c.roundRect(0, 0, W, H, 18); c.fill(); c.fillStyle = cor; c.font = "900 50px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, W / 2, H / 2 + 3); }); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshToonMaterial({ map: t, transparent: true, alphaTest: 0.4 })); };
function rodasPadrao(g, pos, raio = R_RODA, cor = 0xffffff) {
  const rodas = [];
  for (const [x, y, z] of pos) { const r = roda(cor); r.position.set(x, y ?? raio, z); r.scale.setScalar(raio / R_RODA); g.add(r); rodas.push(r); }
  return rodas;
}
// carro da J.E Multimarcas (só carros!): jipinho conversível branco e preto, santantônio e o selo "J.E" no capô
export function carroJE() {
  const g = new THREE.Group();
  const forma = perfil([[2.1, 0.45], [2.2, 0.6, 2.2, 0.95], [2.1, 1.2], [0.9, 1.25], [0.75, 1.0], [-1.6, 1.0], [-1.7, 1.25], [-2.2, 1.25], [-2.3, 1.0, -2.25, 0.45]], [1.4, -1.4], 0.45);
  const corpo = corpoExtrudado(forma, 2.3, mat(0xf4f4f4), 0.14); g.add(corpo);
  const faixa = caixa(2.32, 0.18, 4.3, mat(0x1d1d1d), { sombra: false }); faixa.position.y = 0.8; g.add(faixa);
  const santo = malha(new THREE.TorusGeometry(1.0, 0.08, 8, 20, Math.PI), mat(0x1d1d1d), { contorno: 0.02 }); santo.rotation.y = Math.PI / 2; santo.position.set(0, 1.1, -1.1); santo.scale.set(1, 0.8, 1); g.add(santo);
  const selo = texto3D("J.E", "#1d1d1d", 0.9, 0.3); selo.rotation.x = -Math.PI / 2 + 0.1; selo.position.set(0, 1.27, 1.6); g.add(selo);
  for (const x of [-0.7, 0.7]) { const f = malha(new THREE.CircleGeometry(0.19, 16), farol, { sombra: false }); f.position.set(x, 0.95, 2.35); g.add(f); }
  const para = malha(new THREE.CapsuleGeometry(0.15, 1.8, 4, 10), mat(0x1d1d1d), { contorno: 0.03 }); para.rotation.z = Math.PI / 2; para.position.set(0, 0.55, 2.35); g.add(para);
  const assentos = [];
  for (const x of [0.5, -0.5]) { const a = caixaRedonda(0.78, 0.24, 0.8, mat(0x1d1d1d), { raio: 0.1, contorno: 0.03 }); a.position.set(x, 1.12, -0.5); g.add(a); const e = caixaRedonda(0.78, 0.6, 0.2, mat(0x1d1d1d), { raio: 0.1, contorno: 0.03 }); e.position.set(x, 1.45, -0.95); g.add(e); assentos.push(new THREE.Vector3(x, 1.22, -0.45)); }
  const volante = malha(new THREE.TorusGeometry(0.24, 0.05, 8, 18), mat(0x262626)); volante.position.set(0.5, 1.55, 0.25); volante.rotation.x = -1.0; volante.userData.dinamico = true; g.add(volante);
  const rodas = rodasPadrao(g, [[-1.12, null, 1.4], [1.12, null, 1.4], [-1.12, null, -1.4], [1.12, null, -1.4]], 0.5, 0x1d1d1d);
  const seta = seta3D(3.2); g.add(seta);
  mesclar(g, { juntas: new Set(rodas) });
  Object.assign(g.userData, { rodas, seta, volante, motorista: assentos[0], carona: assentos[1], especial: "buzina" });
  return g;
}
// van (ambulância e van de sorvete): inteira, com teto; a cabine tem vidros (o Rabisco aparece sentado) e só a caixa de trás é fechada
function van({ cor, corTeto = 0xffffff, faixaCor = null }) {
  const g = new THREE.Group();
  const forma = perfil([[2.5, 0.5], [2.6, 0.8, 2.55, 1.2], [2.2, 1.45], [-2.5, 1.45], [-2.6, 1.2, -2.55, 0.5]], [1.6, -1.6], 0.5);
  const corpo = corpoExtrudado(forma, 2.4, mat(cor), 0.16); g.add(corpo);
  if (faixaCor) { const f = caixa(2.44, 0.22, 5.0, mat(faixaCor), { sombra: false }); f.position.y = 1.0; g.add(f); }
  const cima = new THREE.Group(); cima.userData.dinamico = true; cima.userData.cima = true; g.add(cima);
  // só a caixa de trás é fechada; a cabine (z > 0) tem vidros dos lados e na frente, com colunas nos cantos
  const caixaCima = caixaRedonda(2.4, 1.3, 2.4, mat(cor), { raio: 0.3, contorno: 0.06 }); caixaCima.position.set(0, 2.15, -1.3); cima.add(caixaCima);
  const pb = caixaRedonda(2.3, 1.0, 0.12, vidro, { raio: 0.1 }); pb.position.set(0, 2.05, 1.25); pb.rotation.x = -0.35; cima.add(pb);
  for (const s of [-1, 1]) {
    const lado = caixa(0.06, 1.0, 1.1, vidro, { sombra: false }); lado.position.set(s * 1.15, 2.1, 0.6); cima.add(lado);
    for (const z of [0.05, 1.15]) { const c = caixa(0.14, 1.3, 0.14, mat(cor), { contorno: 0.03 }); c.position.set(s * 1.15, 2.15, z); cima.add(c); }
  }
  const teto = caixaRedonda(2.5, 0.18, 3.8, mat(corTeto), { raio: 0.08, contorno: 0.04 }); teto.position.set(0, 2.85, -0.7); cima.add(teto);
  for (const x of [-0.75, 0.75]) { const f = malha(new THREE.CircleGeometry(0.2, 16), farol, { sombra: false }); f.position.set(x, 0.95, 2.6); g.add(f); const l = malha(new THREE.CircleGeometry(0.16, 14), lanterna, { sombra: false }); l.position.set(x, 1.0, -2.62); l.rotation.y = Math.PI; g.add(l); }
  const assentos = [];
  for (const x of [0.55, -0.55]) { const a = caixaRedonda(0.8, 0.26, 0.8, mat(0xfff4e0), { raio: 0.1, contorno: 0.03 }); a.position.set(x, 1.5, 0.6); g.add(a); assentos.push(new THREE.Vector3(x, 1.63, 0.65)); }
  const painel = caixaRedonda(2.2, 0.3, 0.4, mat(0x2f3440), { raio: 0.1 }); painel.position.set(0, 1.6, 1.7); g.add(painel);
  const volante = malha(new THREE.TorusGeometry(0.24, 0.05, 8, 18), mat(0x262626)); volante.position.set(0.55, 2.0, 1.2); volante.rotation.x = -1.0; volante.userData.dinamico = true; g.add(volante);
  const rodas = rodasPadrao(g, [[-1.15, null, 1.6], [1.15, null, 1.6], [-1.15, null, -1.6], [1.15, null, -1.6]], 0.5, 0xdfe6ee);
  const seta = seta3D(4.2); g.add(seta);
  return { g, cima, rodas, seta, volante, assentos };
}
export function ambulancia() {
  const { g, cima, rodas, seta, volante, assentos } = van({ cor: 0xffffff, faixaCor: 0xe8413c });
  for (const s of [-1, 1]) { const c1 = caixa(0.05, 0.6, 0.2, mat(0xe8413c), { sombra: false }); c1.position.set(s * 1.23, 2.2, -1.2); cima.add(c1); const c2 = caixa(0.05, 0.2, 0.6, mat(0xe8413c), { sombra: false }); c2.position.set(s * 1.23, 2.2, -1.2); cima.add(c2); }
  // sirene: duas luzes (vermelha e azul) que piscam no teto
  const luzes = [0xff2020, 0x2f6fff].map((c, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshToonMaterial({ color: c, emissive: c, emissiveIntensity: 0 })); m.position.set(i ? 0.45 : -0.45, 3.05, 0.6); m.userData.dinamico = true; g.add(m); return m; });
  mesclar(g, { juntas: new Set(rodas) }); mesclar(cima);
  Object.assign(g.userData, { rodas, seta, volante, cima, luzes, motorista: assentos[0], carona: assentos[1], especial: "sirene" });
  return g;
}
export function vanSorvete() {
  const { g, cima, rodas, seta, volante, assentos } = van({ cor: 0xffb3d4, corTeto: 0x8fe3cf });
  const casq = malha(new THREE.ConeGeometry(0.45, 1.2, 14), mat(0xe8a85a), { contorno: 0.05 }); casq.rotation.x = Math.PI; casq.position.set(0, 3.55, -1.3); cima.add(casq);
  [[0xff8cc0, 0], [0x8fe3cf, 0.45]].forEach(([c, y]) => { const b = malha(new THREE.SphereGeometry(0.5 - y * 0.2, 14, 10), mat(c), { contorno: 0.04 }); b.position.set(0, 4.3 + y, -1.3); cima.add(b); });
  const placa = texto3D("Sorvete!", "#ff6fae", 2.0, 0.6); placa.position.set(1.23, 2.0, -0.8); placa.rotation.y = Math.PI / 2; cima.add(placa);
  mesclar(g, { juntas: new Set(rodas) }); mesclar(cima);
  Object.assign(g.userData, { rodas, seta, volante, cima, motorista: assentos[0], carona: assentos[1], especial: "musica" });
  return g;
}
// caminhão de bombeiro: cabine na frente, escada no teto e o canhão d'água atrás (gira e solta o jato)
export function caminhaoBombeiro() {
  const g = new THREE.Group();
  const cab = perfil([[3.4, 0.5], [3.55, 0.9, 3.5, 1.4], [3.2, 1.6], [1.4, 1.6], [1.3, 1.1], [-3.4, 1.1], [-3.5, 0.5]], [2.3, -2.2], 0.5);
  const corpo = corpoExtrudado(cab, 2.5, mat(0xe8413c), 0.16); g.add(corpo);
  const bau = caixaRedonda(2.5, 1.2, 4.4, mat(0xe8413c), { raio: 0.2, contorno: 0.06 }); bau.position.set(0, 1.7, -1.3); g.add(bau);
  const faixa = caixa(2.54, 0.2, 7.0, mat(0xffffff), { sombra: false }); faixa.position.set(0, 1.0, 0); g.add(faixa);
  const pb = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.6), vidro); pb.position.set(0, 2.0, 2.6); pb.rotation.x = -0.4; g.add(pb);
  // escada em cima
  for (const s of [-0.55, 0.55]) { const tr = caixa(0.12, 0.12, 4.2, mat(0xdfe6ee), { contorno: 0.02 }); tr.position.set(s, 2.45, -1.3); g.add(tr); }
  for (let i = 0; i < 9; i++) { const d = caixa(1.1, 0.08, 0.08, mat(0xdfe6ee), { sombra: false }); d.position.set(0, 2.45, -3.2 + i * 0.48); g.add(d); }
  const canhao = new THREE.Group(); canhao.position.set(0, 2.4, -3.0); canhao.userData.dinamico = true; g.add(canhao);
  const base = malha(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 14), mat(0x2f3440), { contorno: 0.03 }); canhao.add(base);
  const cano = malha(new THREE.CylinderGeometry(0.11, 0.14, 1.2, 12), mat(0xffcc1f), { contorno: 0.03 }); cano.rotation.x = Math.PI / 2 - 0.35; cano.position.set(0, 0.35, 0.45); canhao.add(cano);
  const jato = new THREE.Group(); jato.visible = false; canhao.add(jato);
  for (let i = 0; i < 18; i++) { const gt = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshToonMaterial({ color: 0x7fd6ff })); jato.add(gt); }
  const assentos = [new THREE.Vector3(0.55, 1.55, 1.9), new THREE.Vector3(-0.55, 1.55, 1.9)];
  for (const a of assentos) { const s = caixaRedonda(0.8, 0.24, 0.8, mat(0x2f3440), { raio: 0.1, contorno: 0.03 }); s.position.set(a.x, 1.42, a.z - 0.05); g.add(s); }
  const volante = malha(new THREE.TorusGeometry(0.24, 0.05, 8, 18), mat(0x262626)); volante.position.set(0.55, 1.95, 2.5); volante.rotation.x = -1.0; volante.userData.dinamico = true; g.add(volante);
  for (const x of [-0.8, 0.8]) { const f = malha(new THREE.CircleGeometry(0.2, 16), farol, { sombra: false }); f.position.set(x, 1.0, 3.56); g.add(f); }
  const luzes = [0xff2020, 0xff2020].map((c, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshToonMaterial({ color: c, emissive: c, emissiveIntensity: 0 })); m.position.set(i ? 0.6 : -0.6, 1.75, 3.0); m.userData.dinamico = true; g.add(m); return m; });
  const rodas = rodasPadrao(g, [[-1.2, null, 2.3], [1.2, null, 2.3], [-1.2, null, -2.2], [1.2, null, -2.2]], 0.55, 0xdfe6ee);
  const seta = seta3D(4.0); g.add(seta);
  mesclar(g, { juntas: new Set(rodas) });
  Object.assign(g.userData, { rodas, seta, volante, luzes, canhao, jato, motorista: assentos[0], carona: assentos[1], especial: "agua" });
  return g;
}
// bicicleta e patinete: leves, cabem na calçada (o Rabisco pedala / fica em pé)
export function bicicleta(cor = 0xec2e8c) {
  const g = new THREE.Group();
  const rodas = [];
  for (const z of [0.75, -0.75]) { const r = new THREE.Group(); r.position.set(0, 0.42, z); g.add(r); const pneu = malha(new THREE.TorusGeometry(0.38, 0.05, 8, 24), mat(0x262626)); pneu.rotation.y = Math.PI / 2; r.add(pneu); for (let i = 0; i < 4; i++) { const raio = caixa(0.02, 0.72, 0.02, mat(0xdfe6ee), { sombra: false }); raio.rotation.x = (i / 4) * Math.PI; r.add(raio); } rodas.push(r); }
  const tubo = (a, b, c = cor) => { const v = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)); const m = malha(new THREE.CylinderGeometry(0.045, 0.045, v.length(), 8), mat(c), { contorno: 0.015 }); m.position.set(...a).add(v.clone().multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); g.add(m); };
  tubo([0, 0.42, -0.75], [0, 0.95, -0.15]); tubo([0, 0.95, -0.15], [0, 0.95, 0.55]); tubo([0, 0.42, -0.75], [0, 0.5, 0.0]); tubo([0, 0.5, 0.0], [0, 0.95, 0.55]); tubo([0, 0.42, 0.75], [0, 1.15, 0.6], 0x00b5f0);
  const guidao = malha(new THREE.CapsuleGeometry(0.04, 0.6, 4, 8), mat(0x262626)); guidao.rotation.z = Math.PI / 2; guidao.position.set(0, 1.18, 0.6); g.add(guidao);
  const selim = caixaRedonda(0.22, 0.08, 0.32, mat(0x262626), { raio: 0.03 }); selim.position.set(0, 1.02, -0.18); g.add(selim);
  const cesta = caixaRedonda(0.36, 0.22, 0.28, mat(0xffcc1f), { raio: 0.04, contorno: 0.02 }); cesta.position.set(0, 1.0, 0.85); g.add(cesta);
  const seta = seta3D(2.6); g.add(seta);
  mesclar(g, { juntas: new Set(rodas) });
  Object.assign(g.userData, { rodas, seta, volante: null, motorista: new THREE.Vector3(0, 1.08, -0.15), carona: null, especial: "buzina", leve: true });
  return g;
}
export function patinete(cor = 0x00b5f0) {
  const g = new THREE.Group();
  const deck = caixaRedonda(0.3, 0.08, 1.0, mat(cor), { raio: 0.03, contorno: 0.02 }); deck.position.y = 0.2; g.add(deck);
  const col = malha(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 8), mat(0xdfe6ee), { contorno: 0.015 }); col.position.set(0, 0.68, 0.48); col.rotation.x = -0.15; g.add(col);
  const guidao = malha(new THREE.CapsuleGeometry(0.035, 0.45, 4, 8), mat(0x262626)); guidao.rotation.z = Math.PI / 2; guidao.position.set(0, 1.15, 0.55); g.add(guidao);
  const rodas = [];
  for (const z of [0.45, -0.45]) { const r = new THREE.Group(); r.position.set(0, 0.11, z); g.add(r); const p = malha(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 14), mat(0xec2e8c)); p.rotation.z = Math.PI / 2; r.add(p); rodas.push(r); }
  const seta = seta3D(2.4); g.add(seta);
  mesclar(g, { juntas: new Set(rodas) });
  Object.assign(g.userData, { rodas, seta, volante: null, motorista: new THREE.Vector3(0, 0.24 + 2.0 * 0.296, 0), carona: null, especial: "buzina", emPe: true, leve: true });
  return g;
}
// barquinho de pedal (só anda no lago): casco redondo amarelo com faixa ciano e um patinho na frente
export function barquinho() {
  const g = new THREE.Group();
  const casco = malha(new THREE.SphereGeometry(1.3, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xffcc1f, { side: THREE.DoubleSide }), { contorno: 0.05 }); casco.scale.set(1, 0.55, 1.5); casco.position.y = 0.55; g.add(casco);
  const borda = malha(new THREE.TorusGeometry(1.25, 0.12, 8, 28), mat(0x00b5f0), { contorno: 0.03 }); borda.rotation.x = Math.PI / 2; borda.scale.set(1, 1.5, 1); borda.position.y = 0.55; g.add(borda);
  const banco = caixaRedonda(1.6, 0.18, 0.5, mat(0xffffff), { raio: 0.06, contorno: 0.03 }); banco.position.set(0, 0.55, -0.3); g.add(banco);
  const pescoco = malha(new THREE.CapsuleGeometry(0.18, 0.6, 4, 10), mat(0xffcc1f), { contorno: 0.03 }); pescoco.position.set(0, 1.0, 1.55); pescoco.rotation.x = 0.3; g.add(pescoco);
  const cab = malha(new THREE.SphereGeometry(0.32, 14, 10), mat(0xffcc1f), { contorno: 0.03 }); cab.position.set(0, 1.45, 1.75); g.add(cab);
  const bico = malha(new THREE.ConeGeometry(0.12, 0.3, 10), mat(0xff8a1f)); bico.rotation.x = Math.PI / 2; bico.position.set(0, 1.4, 2.1); g.add(bico);
  for (const s of [-1, 1]) { const o = malha(new THREE.SphereGeometry(0.06, 8, 6), mat(0x151515)); o.position.set(s * 0.14, 1.52, 2.0); g.add(o); }
  const seta = seta3D(3.0); g.add(seta);
  mesclar(g);
  Object.assign(g.userData, { rodas: [], seta, volante: null, motorista: new THREE.Vector3(0.4, 0.68, -0.25), carona: new THREE.Vector3(-0.4, 0.68, -0.25), especial: "buzina", barco: true });
  return g;
}
// esteira de espuma atrás dos barcos do mar (aparece com a velocidade: veiculos.js estica pela velocidade)
function esteira(largura, z) {
  const forma = new THREE.Shape([new THREE.Vector2(-largura / 2, 0), new THREE.Vector2(largura / 2, 0), new THREE.Vector2(largura * 1.3, -4), new THREE.Vector2(-largura * 1.3, -4)]);
  const geo = new THREE.ShapeGeometry(forma); geo.rotateX(Math.PI / 2); // o V vai para trás (z negativo)
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(0, 0.08, z); m.userData.dinamico = true; m.renderOrder = 2;
  return m;
}
// jet ski (só no mar): casco rosa e branco, banco comprido (o Rabisco senta de pernas abertas, como na moto, e um amigo
// cabe atrás), guidão e um bico pontudo na frente
export function jetSki(cor = 0xec2e8c) {
  const g = new THREE.Group();
  const casco = new THREE.Shape([new THREE.Vector2(-1.35, 0.1), new THREE.Vector2(1.0, 0.1), new THREE.Vector2(1.55, 0.45), new THREE.Vector2(1.2, 0.7), new THREE.Vector2(-1.3, 0.7)]);
  const geo = new THREE.ExtrudeGeometry(casco, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 3, curveSegments: 6 });
  geo.translate(0, 0, -0.4); geo.rotateY(-Math.PI / 2);
  g.add(malha(geo, mat(0xffffff), { contorno: 0.05 }));
  const faixa = caixaRedonda(1.14, 0.18, 2.5, mat(cor), { raio: 0.08, contorno: 0.03 }); faixa.position.set(0, 0.55, -0.05); g.add(faixa);
  const capo = malha(new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(cor), { contorno: 0.04 }); capo.scale.set(1, 0.6, 1.4); capo.position.set(0, 0.82, 0.75); g.add(capo);
  const banco = caixaRedonda(0.5, 0.22, 1.35, mat(0x2f3440), { raio: 0.1, contorno: 0.03 }); banco.position.set(0, 0.9, -0.5); g.add(banco);
  const coluna = malha(new THREE.CylinderGeometry(0.06, 0.08, 0.45, 8), mat(0x2f3440), { contorno: 0.02 }); coluna.position.set(0, 1.02, 0.42); coluna.rotation.x = -0.4; g.add(coluna);
  const guidao = malha(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), mat(0x262626), { contorno: 0.02 }); guidao.rotation.z = Math.PI / 2; guidao.position.set(0, 1.18, 0.5); g.add(guidao);
  for (const s of [-1, 1]) { const m = malha(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8), mat(cor)); m.rotation.z = Math.PI / 2; m.position.set(s * 0.42, 1.18, 0.5); g.add(m); }
  const parabrisa = malha(new THREE.PlaneGeometry(0.6, 0.3), vidro); parabrisa.position.set(0, 1.12, 0.78); parabrisa.rotation.x = -0.6; g.add(parabrisa);
  for (const s of [-1, 1]) { const p = caixaRedonda(0.18, 0.08, 0.7, mat(0x2f3440), { raio: 0.03 }); p.position.set(s * 0.52, 0.62, -0.45); g.add(p); } // apoio dos pés
  const seta = seta3D(2.6); g.add(seta);
  const espuma = esteira(0.9, -1.4); g.add(espuma);
  mesclar(g);
  Object.assign(g.userData, { rodas: [], seta, volante: null, motorista: new THREE.Vector3(0, 0.98, -0.3), carona: new THREE.Vector3(0, 0.98, -0.95), especial: "buzina", barco: true, esteira: espuma, jetski: true });
  return g;
}
// lancha (só no mar): casco branco com faixa azul, para-brisa, banco do piloto com volante (o Rabisco senta lá dentro,
// do mesmo tamanho de sempre) e banco de trás para os amigos
export function lancha(cor = 0x2f6fc0) {
  const g = new THREE.Group();
  const casco = new THREE.Shape([new THREE.Vector2(-3.0, 0.15), new THREE.Vector2(2.0, 0.15), new THREE.Vector2(3.25, 0.7), new THREE.Vector2(3.1, 1.0), new THREE.Vector2(-3.0, 1.0)]);
  const geo = new THREE.ExtrudeGeometry(casco, { depth: 2.2, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.18, bevelSegments: 3, curveSegments: 6 });
  geo.translate(0, 0, -1.1); geo.rotateY(-Math.PI / 2);
  g.add(malha(geo, mat(0xffffff), { contorno: 0.06 }));
  for (const s of [-1, 1]) { const f = caixa(0.06, 0.22, 5.6, mat(cor), { sombra: false }); f.position.set(s * 1.29, 0.62, 0.05); g.add(f); }
  // convés (assoalho) mais baixo que a borda: o Rabisco fica DENTRO
  const piso = caixa(2.0, 0.08, 4.2, mat(0xc98a4b), { sombra: false }); piso.position.set(0, 0.62, -0.6); g.add(piso);
  const proa = malha(new THREE.ConeGeometry(1.15, 1.6, 4), mat(cor), { contorno: 0.05 }); proa.rotation.set(Math.PI / 2, Math.PI / 4, 0); proa.scale.set(1, 1, 0.35); proa.position.set(0, 1.08, 2.4); g.add(proa);
  // painel, para-brisa e bancos
  const painel = caixaRedonda(2.0, 0.55, 0.5, mat(0xf4f4f4), { raio: 0.12, contorno: 0.04 }); painel.position.set(0, 1.15, 1.15); g.add(painel);
  const parabrisa = malha(new THREE.PlaneGeometry(2.0, 0.6), vidro); parabrisa.position.set(0, 1.62, 1.32); parabrisa.rotation.x = -0.45; g.add(parabrisa);
  for (const x of [0.48, -0.48]) {
    const assento = caixaRedonda(0.7, 0.3, 0.65, mat(0xffffff), { raio: 0.12, contorno: 0.03 }); assento.position.set(x, 0.86, 0.15); g.add(assento);
    const encosto = caixaRedonda(0.7, 0.6, 0.2, mat(cor), { raio: 0.1, contorno: 0.03 }); encosto.position.set(x, 1.25, -0.2); g.add(encosto);
  }
  const atras = caixaRedonda(2.0, 0.35, 0.8, mat(0xffffff), { raio: 0.12, contorno: 0.03 }); atras.position.set(0, 0.85, -2.2); g.add(atras);
  const motor = caixaRedonda(0.6, 0.8, 0.5, mat(0x2f3440), { raio: 0.12, contorno: 0.04 }); motor.position.set(0, 0.85, -3.25); g.add(motor);
  const boia = malha(new THREE.TorusGeometry(0.32, 0.11, 8, 16), mat(0xff5a3c), { contorno: 0.03 }); boia.position.set(-1.25, 1.15, -1.3); boia.rotation.y = Math.PI / 2; g.add(boia);
  const volante = malha(new THREE.TorusGeometry(0.22, 0.045, 8, 18), mat(0x262626)); volante.position.set(0.48, 1.45, 0.82); volante.rotation.x = -1.0; volante.userData.dinamico = true; g.add(volante);
  const seta = seta3D(3.4); g.add(seta);
  const espuma = esteira(2.0, -3.3); g.add(espuma);
  mesclar(g);
  Object.assign(g.userData, { rodas: [], seta, volante, motorista: new THREE.Vector3(0.48, 1.12, 0.1), carona: new THREE.Vector3(-0.48, 1.12, 0.1), especial: "buzina", barco: true, esteira: espuma });
  return g;
}
// trator da Fazendinha: rodas grandes atrás, capô verde e a buzina de "mu"
export function trator() {
  const g = new THREE.Group();
  const capo = caixaRedonda(1.3, 1.0, 2.0, mat(0x3c9a4a), { raio: 0.25, contorno: 0.05 }); capo.position.set(0, 1.1, 0.9); g.add(capo);
  const grade = caixa(1.0, 0.7, 0.05, mat(0x2f3440), { sombra: false }); grade.position.set(0, 1.1, 1.92); g.add(grade);
  const chamine = malha(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8), mat(0x2f3440), { contorno: 0.02 }); chamine.position.set(0.35, 1.95, 1.3); g.add(chamine);
  const assento = caixaRedonda(0.7, 0.2, 0.6, mat(0xffcc1f), { raio: 0.08, contorno: 0.03 }); assento.position.set(0, 1.35, -0.6); g.add(assento);
  const enc = caixaRedonda(0.7, 0.5, 0.15, mat(0xffcc1f), { raio: 0.06, contorno: 0.03 }); enc.position.set(0, 1.6, -0.95); g.add(enc);
  const volante = malha(new THREE.TorusGeometry(0.22, 0.04, 8, 16), mat(0x262626)); volante.position.set(0, 1.85, -0.05); volante.rotation.x = -0.8; volante.userData.dinamico = true; g.add(volante);
  const rodas = [];
  for (const [x, z, r] of [[-0.85, -0.6, 0.85], [0.85, -0.6, 0.85], [-0.7, 1.4, 0.45], [0.7, 1.4, 0.45]]) { const rd = roda(0xffcc1f); rd.position.set(x, r, z); rd.scale.setScalar(r / R_RODA); g.add(rd); rodas.push(rd); }
  const seta = seta3D(3.4); g.add(seta);
  mesclar(g, { juntas: new Set(rodas) });
  Object.assign(g.userData, { rodas, seta, volante, motorista: new THREE.Vector3(0, 1.45, -0.55), carona: null, especial: "buzina" });
  return g;
}

void MAT;

// Carro da rua (trânsito da cidade): COPIADO de jogos/cidade-do-rabisco/cidade.js (carro), para a Rabiscolândia
// não depender daquele jogo. Mudou: usa o std de base3d.js e não chama mesclarLocal (veiculos.js mescla o grupo).
export function carro(cor) {
  if (window.__blocos?.carro) return window.__blocos.carro(cor);
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
    const farolC = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 0.6 }));
    farolC.position.set(x, 0.95, 2.21); g.add(farolC);
    const lant = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0xff2020, emissiveIntensity: 0.4 }));
    lant.position.set(x, 0.95, -2.21); lant.rotation.y = Math.PI; g.add(lant);
  }
  return g;
}
