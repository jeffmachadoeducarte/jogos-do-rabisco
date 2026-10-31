// Rabiscolândia: os veículos que o Rabisco dirige, de blocos. A lataria nasce de um perfil lateral fatiado em colunas
// (corpoExtrudado), com o recorte das rodas; as rodas têm 8 lados, para rolar de verdade.
//  - carroFofo(cor): conversível de brinquedo, capô com faixa, faróis quadrados, grade de sorriso em degraus, para-choques,
//    retrovisores, para-brisa com moldura, interior (bancos com friso rosa, painel, volante) e calota colorida.
//  - helicoptero(): azul e rosa, cabine de vidro, rotor de 4 pás e hélice na cauda (giram), esquis brancos.
//  - onibusFofo(): o ônibus amarelo da escola com a logo da Educarte; fica inteiro (teto e janelas de vidro) e o
//    Rabisco aparece sentado no banco do motorista, por dentro das janelas.
// Mesma interface do carroAberto de cidade.js: frente = +z; g.userData = { rodas, seta, motorista, carona, volante }.
// O que não mexe vira poucas malhas (mesclar); rodas, volante e seta ficam soltos.

import { THREE, matNovo, mat, malha, caixa, caixaRedonda, mesclar, texturaCanvas } from "./base3d.js";
import { emBlocos, cx as pc, prisma, geoCaixas } from "./blocos.js";
import { carregarTextura } from "../../src/motor3d/toon.js";

const R_RODA = 0.44;
const vidro = matNovo({ color: 0xbfeaff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
const farol = matNovo({ color: 0xfffbe6, emissive: 0xfff2c0, emissiveIntensity: 0.6 });
const lanterna = mat(0xff3b3b); // cor lisa: entra na malha única do carro
// roda de 8 lados: pneu, calota clara, miolo colorido e cruz de raios; gira em x (rotation.x)
const geoPneu = prisma(R_RODA, R_RODA, 0.34, 8).rotateZ(Math.PI / 2), geoAro = prisma(0.28, 0.28, 0.38, 8).rotateZ(Math.PI / 2);
geoPneu.userData.compartilhada = geoAro.userData.compartilhada = true;
function roda(corMiolo) {
  const g = new THREE.Group(), f = { sombra: false };
  g.add(malha(geoPneu, mat(0x262626)), malha(geoAro, mat(0xf4f4f4), f));
  pc(g, 0.42, 0.36, 0.1, 0xb8c0cc, 0, 0, 0, f); pc(g, 0.42, 0.1, 0.36, 0xb8c0cc, 0, 0, 0, f); pc(g, 0.44, 0.17, 0.17, corMiolo, 0, 0, 0, f);
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
// a silhueta lateral vira colunas de blocos: cada fatia de `passo` cruza a forma (arcos de roda inclusos) e sai uma caixa
// para cada trecho cheio, de altura arredondada em degraus; colunas iguais em sequência viram uma caixa só
function corpoExtrudado(forma, largura, material, _chanfro = 0, { passo = 0.34, degrau = 0.14 } = {}) {
  const pts = forma.getPoints(8), xs = pts.map((p) => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const n = Math.round((x1 - x0) / passo), p = (x1 - x0) / n, ar = (v) => Math.round(v / degrau) * degrau, abertos = new Map(), lista = [];
  const fecha = (k, q) => { lista.push([largura, q.y1 - q.y0, q.fim - q.ini, 0, (q.y0 + q.y1) / 2, (q.ini + q.fim) / 2]); abertos.delete(k); };
  for (let i = 0; i < n; i++) {
    const z = x0 + p * (i + 0.5), cruza = [], vivos = new Set();
    for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length]; if ((a.x <= z) !== (b.x <= z)) cruza.push(a.y + ((z - a.x) / (b.x - a.x)) * (b.y - a.y)); }
    cruza.sort((a, b) => a - b);
    for (let k = 0; k + 1 < cruza.length; k += 2) {
      const y0 = ar(cruza[k]), y1 = ar(cruza[k + 1]); if (y1 - y0 < 0.1) continue;
      const c = `${y0}|${y1}`; vivos.add(c);
      if (abertos.has(c)) abertos.get(c).fim = x0 + p * (i + 1); else abertos.set(c, { y0, y1, ini: x0 + p * i, fim: x0 + p * (i + 1) });
    }
    for (const [c, q] of [...abertos]) if (!vivos.has(c)) fecha(c, q);
  }
  for (const [c, q] of [...abertos]) fecha(c, q);
  return malha(geoCaixas(lista), material);
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
  const saia = caixaRedonda(2.32, 0.2, 2.6, claro); saia.position.set(0, 0.5, 0); g.add(saia);
  // para-choques redondos
  for (const z of [2.46, -2.48]) { const p = malha(new THREE.CapsuleGeometry(0.16, 1.7, 4, 10), mat(0xf4f4f4)); p.rotation.z = Math.PI / 2; p.position.set(0, 0.52, z); g.add(p); }
  // faróis com aro cromado e lanternas
  for (const x of [-0.68, 0.68]) {
    const aro = malha(new THREE.TorusGeometry(0.2, 0.06, 8, 18), mat(0xdfe6ee)); aro.position.set(x, 0.88, 2.45); g.add(aro);
    const f = malha(new THREE.CircleGeometry(0.2, 18), farol, { sombra: false }); f.position.set(x, 0.88, 2.46); g.add(f);
    const brilho = malha(new THREE.CircleGeometry(0.06, 10), mat(0xffffff), { sombra: false }); brilho.position.set(x - 0.07, 0.95, 2.47); g.add(brilho);
    const l = malha(new THREE.CircleGeometry(0.15, 14), lanterna, { sombra: false }); l.position.set(x, 0.9, -2.48); l.rotation.y = Math.PI; g.add(l);
  }
  // grade sorridente em degraus
  for (const [w, x, y] of [[0.5, 0, 0.62], [0.12, -0.31, 0.68], [0.12, 0.31, 0.68], [0.12, -0.42, 0.76], [0.12, 0.42, 0.76]]) pc(g, w, 0.1, 0.06, 0x262626, x, y + 0.04, 2.5, { sombra: false });
  // placa
  const pl = caixa(0.7, 0.24, 0.04, mat(0xffffff), { sombra: false }); pl.position.set(0, 0.7, -2.5); g.add(pl);
  // para-brisa com moldura de blocos
  const pbG = new THREE.Group(); pbG.position.set(0, 1.27, 0.72); pbG.rotation.x = -0.3; g.add(pbG);
  pc(pbG, 2.0, 0.1, 0.1, 0xdfe6ee, 0, 0.72, 0); for (const s of [-1, 1]) pc(pbG, 0.1, 0.72, 0.1, 0xdfe6ee, s * 0.95, 0.36, 0);
  const pb = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 0.68), vidro); pb.position.y = 0.36; pb.renderOrder = 3; pbG.add(pb);
  // retrovisores
  for (const s of [-1, 1]) { const r = malha(new THREE.SphereGeometry(0.13, 10, 8), lata); r.scale.set(1, 0.7, 0.6); r.position.set(s * 1.2, 1.32, 0.55); g.add(r); }
  // interior: assoalho, painel, bancos com friso rosa
  const piso = caixa(1.9, 0.08, 1.75, mat(0x3a3f4c), { sombra: false }); piso.position.set(0, 1.12, -0.22); g.add(piso);
  const painel = caixaRedonda(1.95, 0.32, 0.4, mat(0x2f3440)); painel.position.set(0, 1.28, 0.42); g.add(painel);
  const assentos = [];
  for (const x of [0.5, -0.5]) {
    const a = caixaRedonda(0.78, 0.24, 0.8, mat(0xfff4e0)); a.position.set(x, 1.24, -0.45); g.add(a);
    const e = caixaRedonda(0.78, 0.62, 0.2, mat(0xfff4e0)); e.position.set(x, 1.6, -0.92); e.rotation.x = -0.12; g.add(e);
    const friso = caixa(0.8, 0.07, 0.22, mat(0xec2e8c), { sombra: false }); friso.position.set(x, 1.87, -0.95); g.add(friso);
    assentos.push(new THREE.Vector3(x, 1.32, -0.42));
  }
  // volante (solto: o jogo encaixa nas mãos do Rabisco)
  const volante = malha(new THREE.TorusGeometry(0.24, 0.05, 8, 18), mat(0x262626)); volante.position.set(0.5, 1.62, 0.25); volante.rotation.x = -1.0; volante.userData.dinamico = true; g.add(volante);
  // rodas
  const rodas = [];
  for (const [x, z] of [[-1.08, 1.42], [1.08, 1.42], [-1.08, -1.42], [1.08, -1.42]]) { const r = roda(cor); r.position.set(x, R_RODA, z); g.add(r); rodas.push(r); }
  // seta "entre aqui"
  const seta = new THREE.Mesh(emBlocos(new THREE.ConeGeometry(0.45, 0.9, 4)), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); seta.rotation.x = Math.PI; seta.position.y = 3.2; seta.userData.dinamico = true; g.add(seta);
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
  for (const s of [-1, 1]) { const lg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.75), matNovo({ map: texLogo, transparent: true, alphaTest: 0.3 })); lg.position.set(s * (W / 2 + 0.02), 0.82, -0.3); lg.rotation.y = s * Math.PI / 2; g.add(lg); }
  for (const z of [L / 2 + 0.08, -L / 2 - 0.08]) { const p = malha(new THREE.CapsuleGeometry(0.17, W - 0.6, 4, 10), mat(0x2f3440)); p.rotation.z = Math.PI / 2; p.position.set(0, 0.62, z); g.add(p); }
  for (const x of [-0.95, 0.95]) {
    const f = malha(new THREE.CircleGeometry(0.22, 16), farol, { sombra: false }); f.position.set(x, 1.0, L / 2 + 0.07); g.add(f);
    const l = malha(new THREE.CircleGeometry(0.18, 14), lanterna, { sombra: false }); l.position.set(x, 1.0, -L / 2 - 0.07); l.rotation.y = Math.PI; g.add(l);
  }
  // interior: piso, bancos e o banco do motorista
  const piso = caixa(W - 0.3, 0.1, L - 0.6, mat(0x3a3f4c), { sombra: false }); piso.position.y = 1.86; g.add(piso);
  const assentos = [];
  for (let i = 0; i < 4; i++) for (const x of [-0.75, 0.75]) { const b = caixaRedonda(0.9, 0.5, 0.25, mat(0x2f6fc0)); b.position.set(x, 2.3, 1.2 - i * 1.5); g.add(b); }
  const bm = caixaRedonda(0.8, 0.28, 0.8, mat(0xfff4e0)); bm.position.set(0.7, 2.05, 2.9); g.add(bm);
  assentos.push(new THREE.Vector3(0.7, 2.12, 2.95), new THREE.Vector3(-0.7, 2.12, 2.95));
  const painel = caixaRedonda(W - 0.4, 0.5, 0.4, mat(0x2f3440)); painel.position.set(0, 2.15, L / 2 - 0.35); g.add(painel);
  // parte de cima (janelas e teto): fica sempre no lugar, o Rabisco dirige lá dentro
  const cima = new THREE.Group(); cima.userData.dinamico = true; cima.userData.cima = true; g.add(cima);
  const vid = new THREE.Mesh(new THREE.BoxGeometry(W - 0.15, 1.2, L - 0.4), matNovo({ color: 0xbfeaff, transparent: true, opacity: 0.55 })); vid.position.y = 2.5; cima.add(vid);
  for (const z of [-L / 2 + 0.25, -1.4, 1.4]) for (const s of [-1, 1]) { const c = caixa(0.2, 1.25, 0.24, mat(AMARELO)); c.position.set(s * (W / 2 - 0.12), 2.5, z); g.add(c); }
  const traseira = caixa(W - 0.05, 1.25, 0.2, mat(AMARELO)); traseira.position.set(0, 2.5, -L / 2 + 0.2); g.add(traseira);
  const teto = caixaRedonda(W + 0.05, 0.4, L + 0.05, mat(0xfff4e0)); teto.position.y = 3.25; cima.add(teto);
  const volante = malha(new THREE.TorusGeometry(0.26, 0.05, 8, 18), mat(0x262626)); volante.position.set(0.7, 2.45, 3.6); volante.rotation.x = -1.0; volante.userData.dinamico = true; g.add(volante);
  const rodas = [];
  for (const [x, z] of [[-1.25, 2.7], [1.25, 2.7], [-1.25, -2.7], [1.25, -2.7]]) { const r = roda(0x2f6fc0); r.position.set(x, R_RODA + 0.06, z); r.scale.setScalar(1.15); g.add(r); rodas.push(r); }
  const seta = new THREE.Mesh(emBlocos(new THREE.ConeGeometry(0.5, 1, 4)), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); seta.rotation.x = Math.PI; seta.position.y = 5.2; seta.userData.dinamico = true; g.add(seta);
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
  // cabine de blocos: assoalho, paredes baixas azuis com faixa rosa, nariz em degraus e a caixa de vidro por cima
  // (o Rabisco aparece pilotando de qualquer lado). Por dentro é oca: banco e painel ficam à mostra.
  pc(g, 2.4, 0.4, 3.0, AZUL, 0, 0.98, 0); pc(g, 2.0, 0.3, 0.5, AZUL, 0, 1.0, 1.7); pc(g, 1.4, 0.3, 0.4, ROSA, 0, 1.3, 2.3);
  for (const s of [-1, 1]) pc(g, 0.2, 0.75, 3.4, AZUL, s * 1.32, 1.5, 0);
  pc(g, 2.84, 0.75, 0.2, AZUL, 0, 1.5, 1.8); pc(g, 2.84, 0.75, 0.2, AZUL, 0, 1.5, -1.8); pc(g, 2.2, 0.5, 0.4, AZUL, 0, 1.55, 2.1);
  for (const [w, d, z] of [[2.9, 3.86, 0.0]]) { pc(g, w, 0.14, d, ROSA, 0, 1.94, z, { sombra: false }); }
  const cupula = pc(g, 2.56, 1.3, 3.5, 0, 0, 2.62, 0, { material: vidro, sombra: false }); cupula.renderOrder = 3;
  for (const [x, z] of [[-1.26, 1.72], [1.26, 1.72], [-1.26, -1.72], [1.26, -1.72]]) pc(g, 0.14, 1.34, 0.14, ROSA, x, 2.62, z, { sombra: false });
  pc(g, 2.7, 0.24, 3.6, AZUL, 0, 3.36, 0); pc(g, 1.4, 0.2, 1.8, ROSA, 0, 3.55, 0, { sombra: false });
  // banco e painel
  const banco = caixaRedonda(1.6, 0.25, 0.8, mat(0xfff4e0)); banco.position.set(0, 1.55, -0.3); g.add(banco);
  const encosto = caixaRedonda(1.6, 0.45, 0.2, mat(0xfff4e0)); encosto.position.set(0, 1.85, -0.75); g.add(encosto); // baixinho: o Rabisco aparece por trás
  const painel = caixaRedonda(1.6, 0.35, 0.35, mat(0x2f3440)); painel.position.set(0, 1.75, 1.25); g.add(painel);
  // cauda afinando em degraus, com aleta rosa e hélice traseira
  for (const [w, comp, z] of [[0.86, 1.5, -2.5], [0.62, 1.4, -3.9], [0.42, 1.3, -5.1]]) pc(g, w, w, comp, AZUL, 0, 2.25 + (0.86 - w) * 0.3, z);
  const aleta = caixaRedonda(0.14, 1.3, 0.9, mat(ROSA)); aleta.position.set(0, 2.8, -5.4); g.add(aleta);
  const aletaH = caixaRedonda(1.6, 0.12, 0.6, mat(ROSA)); aletaH.position.set(0, 2.3, -5.2); g.add(aletaH);
  const rotorCauda = new THREE.Group(); rotorCauda.position.set(0.2, 2.75, -5.55); g.add(rotorCauda);
  for (let i = 0; i < 2; i++) { const p = caixa(0.05, 1.1, 0.16, mat(0xffffff), { sombra: false }); p.rotation.x = i * Math.PI / 2; rotorCauda.add(p); }
  // esquis
  for (const s of [-1, 1]) {
    const esqui = malha(new THREE.CapsuleGeometry(0.1, 3.4, 4, 10), mat(0xf4f4f4)); esqui.rotation.x = Math.PI / 2; esqui.position.set(s * 1.1, 0.12, 0.1); g.add(esqui);
    for (const z of [-0.8, 1.0]) { const h = malha(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), mat(0xf4f4f4)); h.position.set(s * 0.95, 0.6, z); h.rotation.z = s * 0.3; g.add(h); }
  }
  // mastro e rotor principal de 4 pás com ponta rosa
  const mastro = malha(new THREE.BoxGeometry(0.3, 0.5, 0.3), mat(0x2f3440)); mastro.position.y = 3.72; g.add(mastro);
  const rotor = new THREE.Group(); rotor.position.y = 4.0; g.add(rotor);
  const cubo = malha(new THREE.SphereGeometry(0.28, 12, 8), mat(ROSA)); rotor.add(cubo);
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Group(); p.rotation.y = (i / 4) * Math.PI * 2; rotor.add(p);
    const pa = caixaRedonda(0.42, 0.06, 4.0, mat(0x2f3440)); pa.position.z = 2.1; p.add(pa);
    const ponta = caixa(0.44, 0.07, 0.5, mat(ROSA), { sombra: false }); ponta.position.z = 3.9; p.add(ponta);
  }
  const seta = new THREE.Mesh(emBlocos(new THREE.ConeGeometry(0.5, 1, 4)), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); seta.rotation.x = Math.PI; seta.position.y = 5.4; seta.userData.dinamico = true; g.add(seta);
  mesclar(g, { juntas: new Set([rotor, rotorCauda]) });
  Object.assign(g.userData, { rodas: [], rotor, rotorCauda, seta, volante: null, motorista: new THREE.Vector3(0.35, 1.68, -0.25), carona: new THREE.Vector3(-0.45, 1.68, -0.25) });
  return g;
}

// ================================================================== Fatia 4: mais veículos
// Mesma interface: frente = +z; userData = { rodas, seta, motorista, carona, volante, cima? (some ao dirigir),
// especial: "buzina" | "sirene" | "musica" | "agua", luzes? (sirene), canhao? (bombeiro) }.
const seta3D = (y) => { const s = new THREE.Mesh(emBlocos(new THREE.ConeGeometry(0.45, 0.9, 4)), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); s.rotation.x = Math.PI; s.position.y = y; s.userData.dinamico = true; return s; };
const texto3D = (txt, cor, w = 1.6, h = 0.5) => { const t = texturaCanvas(256, 80, (c, W, H) => { c.fillStyle = "#ffffff"; c.beginPath(); c.roundRect(0, 0, W, H, 18); c.fill(); c.fillStyle = cor; c.font = "900 50px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, W / 2, H / 2 + 3); }); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), matNovo({ map: t, transparent: true, alphaTest: 0.4 })); };
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
  const santo = malha(new THREE.TorusGeometry(1.0, 0.08, 8, 20, Math.PI), mat(0x1d1d1d)); santo.rotation.y = Math.PI / 2; santo.position.set(0, 1.1, -1.1); santo.scale.set(1, 0.8, 1); g.add(santo);
  const selo = texto3D("J.E", "#1d1d1d", 0.9, 0.3); selo.rotation.x = -Math.PI / 2 + 0.1; selo.position.set(0, 1.27, 1.6); g.add(selo);
  for (const x of [-0.7, 0.7]) { const f = malha(new THREE.CircleGeometry(0.19, 16), farol, { sombra: false }); f.position.set(x, 0.95, 2.35); g.add(f); }
  const para = malha(new THREE.CapsuleGeometry(0.15, 1.8, 4, 10), mat(0x1d1d1d)); para.rotation.z = Math.PI / 2; para.position.set(0, 0.55, 2.35); g.add(para);
  const assentos = [];
  for (const x of [0.5, -0.5]) { const a = caixaRedonda(0.78, 0.24, 0.8, mat(0x1d1d1d)); a.position.set(x, 1.12, -0.5); g.add(a); const e = caixaRedonda(0.78, 0.6, 0.2, mat(0x1d1d1d)); e.position.set(x, 1.45, -0.95); g.add(e); assentos.push(new THREE.Vector3(x, 1.22, -0.45)); }
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
  const caixaCima = caixaRedonda(2.4, 1.3, 2.4, mat(cor)); caixaCima.position.set(0, 2.15, -1.3); cima.add(caixaCima);
  const pb = caixaRedonda(2.3, 1.0, 0.12, vidro); pb.position.set(0, 2.05, 1.25); pb.rotation.x = -0.35; cima.add(pb);
  for (const s of [-1, 1]) {
    const lado = caixa(0.06, 1.0, 1.1, vidro, { sombra: false }); lado.position.set(s * 1.15, 2.1, 0.6); cima.add(lado);
    for (const z of [0.05, 1.15]) { const c = caixa(0.14, 1.3, 0.14, mat(cor)); c.position.set(s * 1.15, 2.15, z); cima.add(c); }
  }
  const teto = caixaRedonda(2.5, 0.18, 3.8, mat(corTeto)); teto.position.set(0, 2.85, -0.7); cima.add(teto);
  for (const x of [-0.75, 0.75]) { const f = malha(new THREE.CircleGeometry(0.2, 16), farol, { sombra: false }); f.position.set(x, 0.95, 2.6); g.add(f); const l = malha(new THREE.CircleGeometry(0.16, 14), lanterna, { sombra: false }); l.position.set(x, 1.0, -2.62); l.rotation.y = Math.PI; g.add(l); }
  const assentos = [];
  for (const x of [0.55, -0.55]) { const a = caixaRedonda(0.8, 0.26, 0.8, mat(0xfff4e0)); a.position.set(x, 1.5, 0.6); g.add(a); assentos.push(new THREE.Vector3(x, 1.63, 0.65)); }
  const painel = caixaRedonda(2.2, 0.3, 0.4, mat(0x2f3440)); painel.position.set(0, 1.6, 1.7); g.add(painel);
  const volante = malha(new THREE.TorusGeometry(0.24, 0.05, 8, 18), mat(0x262626)); volante.position.set(0.55, 2.0, 1.2); volante.rotation.x = -1.0; volante.userData.dinamico = true; g.add(volante);
  const rodas = rodasPadrao(g, [[-1.15, null, 1.6], [1.15, null, 1.6], [-1.15, null, -1.6], [1.15, null, -1.6]], 0.5, 0xdfe6ee);
  const seta = seta3D(4.2); g.add(seta);
  return { g, cima, rodas, seta, volante, assentos };
}
export function ambulancia() {
  const { g, cima, rodas, seta, volante, assentos } = van({ cor: 0xffffff, faixaCor: 0xe8413c });
  for (const s of [-1, 1]) { const c1 = caixa(0.05, 0.6, 0.2, mat(0xe8413c), { sombra: false }); c1.position.set(s * 1.23, 2.2, -1.2); cima.add(c1); const c2 = caixa(0.05, 0.2, 0.6, mat(0xe8413c), { sombra: false }); c2.position.set(s * 1.23, 2.2, -1.2); cima.add(c2); }
  // sirene: duas luzes (vermelha e azul) que piscam no teto
  const luzes = [0xff2020, 0x2f6fff].map((c, i) => { const m = new THREE.Mesh(emBlocos(new THREE.SphereGeometry(0.2, 12, 8)), matNovo({ color: c, emissive: c, emissiveIntensity: 0 })); m.position.set(i ? 0.45 : -0.45, 3.05, 0.6); m.userData.dinamico = true; g.add(m); return m; });
  mesclar(g, { juntas: new Set(rodas) }); mesclar(cima);
  Object.assign(g.userData, { rodas, seta, volante, cima, luzes, motorista: assentos[0], carona: assentos[1], especial: "sirene" });
  return g;
}
export function vanSorvete() {
  const { g, cima, rodas, seta, volante, assentos } = van({ cor: 0xffb3d4, corTeto: 0x8fe3cf });
  const casq = malha(new THREE.ConeGeometry(0.45, 1.2, 14), mat(0xe8a85a)); casq.rotation.x = Math.PI; casq.position.set(0, 3.55, -1.3); cima.add(casq);
  [[0xff8cc0, 0], [0x8fe3cf, 0.45]].forEach(([c, y]) => { const b = malha(new THREE.SphereGeometry(0.5 - y * 0.2, 14, 10), mat(c)); b.position.set(0, 4.3 + y, -1.3); cima.add(b); });
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
  const bau = caixaRedonda(2.5, 1.2, 4.4, mat(0xe8413c)); bau.position.set(0, 1.7, -1.3); g.add(bau);
  const faixa = caixa(2.54, 0.2, 7.0, mat(0xffffff), { sombra: false }); faixa.position.set(0, 1.0, 0); g.add(faixa);
  const pb = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.6), vidro); pb.position.set(0, 2.0, 2.6); pb.rotation.x = -0.4; g.add(pb);
  // escada em cima
  for (const s of [-0.55, 0.55]) { const tr = caixa(0.12, 0.12, 4.2, mat(0xdfe6ee)); tr.position.set(s, 2.45, -1.3); g.add(tr); }
  for (let i = 0; i < 9; i++) { const d = caixa(1.1, 0.08, 0.08, mat(0xdfe6ee), { sombra: false }); d.position.set(0, 2.45, -3.2 + i * 0.48); g.add(d); }
  const canhao = new THREE.Group(); canhao.position.set(0, 2.4, -3.0); canhao.userData.dinamico = true; g.add(canhao);
  const base = malha(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 14), mat(0x2f3440)); canhao.add(base);
  const cano = malha(new THREE.CylinderGeometry(0.11, 0.14, 1.2, 12), mat(0xffcc1f)); cano.rotation.x = Math.PI / 2 - 0.35; cano.position.set(0, 0.35, 0.45); canhao.add(cano);
  const jato = new THREE.Group(); jato.visible = false; canhao.add(jato);
  for (let i = 0; i < 18; i++) { const gt = new THREE.Mesh(emBlocos(new THREE.SphereGeometry(0.12, 8, 6)), matNovo({ color: 0x7fd6ff })); jato.add(gt); }
  const assentos = [new THREE.Vector3(0.55, 1.55, 1.9), new THREE.Vector3(-0.55, 1.55, 1.9)];
  for (const a of assentos) { const s = caixaRedonda(0.8, 0.24, 0.8, mat(0x2f3440)); s.position.set(a.x, 1.42, a.z - 0.05); g.add(s); }
  const volante = malha(new THREE.TorusGeometry(0.24, 0.05, 8, 18), mat(0x262626)); volante.position.set(0.55, 1.95, 2.5); volante.rotation.x = -1.0; volante.userData.dinamico = true; g.add(volante);
  for (const x of [-0.8, 0.8]) { const f = malha(new THREE.CircleGeometry(0.2, 16), farol, { sombra: false }); f.position.set(x, 1.0, 3.56); g.add(f); }
  const luzes = [0xff2020, 0xff2020].map((c, i) => { const m = new THREE.Mesh(emBlocos(new THREE.SphereGeometry(0.2, 12, 8)), matNovo({ color: c, emissive: c, emissiveIntensity: 0 })); m.position.set(i ? 0.6 : -0.6, 1.75, 3.0); m.userData.dinamico = true; g.add(m); return m; });
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
  const tubo = (a, b, c = cor) => { const v = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)); const m = malha(new THREE.CylinderGeometry(0.045, 0.045, v.length(), 8), mat(c)); m.position.set(...a).add(v.clone().multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); g.add(m); };
  tubo([0, 0.42, -0.75], [0, 0.95, -0.15]); tubo([0, 0.95, -0.15], [0, 0.95, 0.55]); tubo([0, 0.42, -0.75], [0, 0.5, 0.0]); tubo([0, 0.5, 0.0], [0, 0.95, 0.55]); tubo([0, 0.42, 0.75], [0, 1.15, 0.6], 0x00b5f0);
  const guidao = malha(new THREE.CapsuleGeometry(0.04, 0.6, 4, 8), mat(0x262626)); guidao.rotation.z = Math.PI / 2; guidao.position.set(0, 1.18, 0.6); g.add(guidao);
  const selim = caixaRedonda(0.22, 0.08, 0.32, mat(0x262626)); selim.position.set(0, 1.02, -0.18); g.add(selim);
  const cesta = caixaRedonda(0.36, 0.22, 0.28, mat(0xffcc1f)); cesta.position.set(0, 1.0, 0.85); g.add(cesta);
  const seta = seta3D(2.6); g.add(seta);
  mesclar(g, { juntas: new Set(rodas) });
  Object.assign(g.userData, { rodas, seta, volante: null, motorista: new THREE.Vector3(0, 1.08, -0.15), carona: null, especial: "buzina", leve: true });
  return g;
}
export function patinete(cor = 0x00b5f0) {
  const g = new THREE.Group();
  const deck = caixaRedonda(0.3, 0.08, 1.0, mat(cor)); deck.position.y = 0.2; g.add(deck);
  const col = malha(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 8), mat(0xdfe6ee)); col.position.set(0, 0.68, 0.48); col.rotation.x = -0.15; g.add(col);
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
  // casco oco em degraus: fundo, costado amarelo e borda ciano
  pc(g, 1.9, 0.2, 2.7, 0xffcc1f, 0, 0.12, 0); pc(g, 2.3, 0.28, 3.2, 0xffcc1f, 0, 0.3, 0);
  for (const s of [-1, 1]) { pc(g, 0.24, 0.26, 3.5, 0xffcc1f, s * 1.2, 0.56, 0); pc(g, 0.3, 0.12, 3.6, 0x00b5f0, s * 1.2, 0.74, 0); }
  for (const s of [-1, 1]) { pc(g, 2.6, 0.26, 0.24, 0xffcc1f, 0, 0.56, s * 1.7); pc(g, 2.7, 0.12, 0.3, 0x00b5f0, 0, 0.74, s * 1.7); }
  const banco = caixaRedonda(1.6, 0.18, 0.5, mat(0xffffff)); banco.position.set(0, 0.55, -0.3); g.add(banco);
  const pescoco = malha(new THREE.CapsuleGeometry(0.18, 0.6, 4, 10), mat(0xffcc1f)); pescoco.position.set(0, 1.0, 1.55); pescoco.rotation.x = 0.3; g.add(pescoco);
  const cab = malha(new THREE.SphereGeometry(0.32, 14, 10), mat(0xffcc1f)); cab.position.set(0, 1.45, 1.75); g.add(cab);
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
  g.add(corpoExtrudado(casco, 1.1, mat(0xffffff), 0, { passo: 0.2, degrau: 0.1 }));
  const faixa = caixaRedonda(1.14, 0.18, 2.5, mat(cor)); faixa.position.set(0, 0.55, -0.05); g.add(faixa);
  const capo = malha(new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(cor)); capo.scale.set(1, 0.6, 1.4); capo.position.set(0, 0.82, 0.75); g.add(capo);
  const banco = caixaRedonda(0.5, 0.22, 1.35, mat(0x2f3440)); banco.position.set(0, 0.9, -0.5); g.add(banco);
  const coluna = malha(new THREE.CylinderGeometry(0.06, 0.08, 0.45, 8), mat(0x2f3440)); coluna.position.set(0, 1.02, 0.42); coluna.rotation.x = -0.4; g.add(coluna);
  const guidao = malha(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), mat(0x262626)); guidao.rotation.z = Math.PI / 2; guidao.position.set(0, 1.18, 0.5); g.add(guidao);
  for (const s of [-1, 1]) { const m = malha(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8), mat(cor)); m.rotation.z = Math.PI / 2; m.position.set(s * 0.42, 1.18, 0.5); g.add(m); }
  const parabrisa = malha(new THREE.PlaneGeometry(0.6, 0.3), vidro); parabrisa.position.set(0, 1.12, 0.78); parabrisa.rotation.x = -0.6; g.add(parabrisa);
  for (const s of [-1, 1]) { const p = caixaRedonda(0.18, 0.08, 0.7, mat(0x2f3440)); p.position.set(s * 0.52, 0.62, -0.45); g.add(p); } // apoio dos pés
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
  g.add(corpoExtrudado(casco, 2.56, mat(0xffffff), 0, { passo: 0.3, degrau: 0.12 }));
  for (const s of [-1, 1]) { const f = caixa(0.06, 0.22, 5.6, mat(cor), { sombra: false }); f.position.set(s * 1.29, 0.62, 0.05); g.add(f); }
  // convés (assoalho) mais baixo que a borda: o Rabisco fica DENTRO
  const piso = caixa(2.0, 0.08, 4.2, mat(0xc98a4b), { sombra: false }); piso.position.set(0, 0.62, -0.6); g.add(piso);
  for (let i = 0; i < 4; i++) pc(g, 2.3 - i * 0.56, 0.1, 0.42, cor, 0, 1.1, 1.75 + i * 0.42); // proa em degraus
  // painel, para-brisa e bancos
  const painel = caixaRedonda(2.0, 0.55, 0.5, mat(0xf4f4f4)); painel.position.set(0, 1.15, 1.15); g.add(painel);
  const parabrisa = malha(new THREE.PlaneGeometry(2.0, 0.6), vidro); parabrisa.position.set(0, 1.62, 1.32); parabrisa.rotation.x = -0.45; g.add(parabrisa);
  pc(g, 2.1, 0.08, 0.1, 0x2f3440, 0, 1.9, 1.2, { sombra: false });
  for (const x of [0.48, -0.48]) {
    const assento = caixaRedonda(0.7, 0.3, 0.65, mat(0xffffff)); assento.position.set(x, 0.86, 0.15); g.add(assento);
    const encosto = caixaRedonda(0.7, 0.6, 0.2, mat(cor)); encosto.position.set(x, 1.25, -0.2); g.add(encosto);
  }
  const atras = caixaRedonda(2.0, 0.35, 0.8, mat(0xffffff)); atras.position.set(0, 0.85, -2.2); g.add(atras);
  const motor = caixaRedonda(0.6, 0.8, 0.5, mat(0x2f3440)); motor.position.set(0, 0.85, -3.25); g.add(motor);
  const boia = malha(new THREE.TorusGeometry(0.32, 0.11, 8, 16), mat(0xff5a3c)); boia.position.set(-1.25, 1.15, -1.3); boia.rotation.y = Math.PI / 2; g.add(boia);
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
  const capo = caixaRedonda(1.3, 1.0, 2.0, mat(0x3c9a4a)); capo.position.set(0, 1.1, 0.9); g.add(capo);
  const grade = caixa(1.0, 0.7, 0.05, mat(0x2f3440), { sombra: false }); grade.position.set(0, 1.1, 1.92); g.add(grade);
  const chamine = malha(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8), mat(0x2f3440)); chamine.position.set(0.35, 1.95, 1.3); g.add(chamine);
  const assento = caixaRedonda(0.7, 0.2, 0.6, mat(0xffcc1f)); assento.position.set(0, 1.35, -0.6); g.add(assento);
  const enc = caixaRedonda(0.7, 0.5, 0.15, mat(0xffcc1f)); enc.position.set(0, 1.6, -0.95); g.add(enc);
  const volante = malha(new THREE.TorusGeometry(0.22, 0.04, 8, 16), mat(0x262626)); volante.position.set(0, 1.85, -0.05); volante.rotation.x = -0.8; volante.userData.dinamico = true; g.add(volante);
  const rodas = [];
  for (const [x, z, r] of [[-0.85, -0.6, 0.85], [0.85, -0.6, 0.85], [-0.7, 1.4, 0.45], [0.7, 1.4, 0.45]]) { const rd = roda(0xffcc1f); rd.position.set(x, r, z); rd.scale.setScalar(r / R_RODA); g.add(rd); rodas.push(rd); }
  const seta = seta3D(3.4); g.add(seta);
  mesclar(g, { juntas: new Set(rodas) });
  Object.assign(g.userData, { rodas, seta, volante, motorista: new THREE.Vector3(0, 1.45, -0.55), carona: null, especial: "buzina" });
  return g;
}

// Carro da rua (trânsito da cidade), de blocos, em três formatos que se alternam. veiculos.js mescla o grupo.
let nCarro = 0;
export function carro(cor) {
  const g = new THREE.Group(), lata = cor, f = { sombra: false }, tipo = nCarro++ % 3;
  const escuro = new THREE.Color(cor).multiplyScalar(0.72).getHex(), vidroRua = 0x7fbfe6;
  pc(g, 2.1, 0.74, 4.4, lata, 0, 0.8, 0); pc(g, 2.14, 0.22, 4.44, escuro, 0, 0.5, 0, f);
  if (tipo === 1) { // picape: cabine curta e caçamba
    pc(g, 1.9, 0.8, 1.9, vidroRua, 0, 1.56, 0.5); pc(g, 1.96, 0.16, 2.0, lata, 0, 2.02, 0.5);
    pc(g, 1.8, 0.12, 1.9, 0x2f3440, 0, 1.2, -1.2, f); for (const s of [-1, 1]) pc(g, 0.16, 0.4, 2.0, lata, s * 0.97, 1.36, -1.2, f); pc(g, 2.1, 0.4, 0.16, lata, 0, 1.36, -2.14, f);
  } else {
    const comp = tipo === 2 ? 3.2 : 2.3, z = tipo === 2 ? -0.5 : -0.2;
    pc(g, 1.86, 0.84, comp, vidroRua, 0, 1.58, z); pc(g, 1.96, 0.16, comp + 0.1, lata, 0, 2.06, z);
    for (const s of [-1, 1]) pc(g, 0.08, 0.84, 0.16, lata, s * 0.94, 1.58, z, f);
  }
  pc(g, 2.16, 0.24, 0.26, 0xf4f4f4, 0, 0.56, 2.26, f); pc(g, 2.16, 0.24, 0.26, 0xf4f4f4, 0, 0.56, -2.26, f);
  for (const x of [-0.68, 0.68]) { pc(g, 0.42, 0.26, 0.08, 0xfff2a8, x, 0.96, 2.2, f); pc(g, 0.42, 0.24, 0.08, 0xe8302a, x, 0.96, -2.2, f); }
  for (const [x, z] of [[-1.03, 1.4], [1.03, 1.4], [-1.03, -1.4], [1.03, -1.4]]) { const r = malha(geoPneu, mat(0x262626)); r.position.set(x, 0.44, z); g.add(r); pc(g, 0.38, 0.3, 0.3, 0xdfe6ee, x * 1.02, 0.44, z, f); }
  return g;
}
