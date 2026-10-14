// Rabiscolândia: as peças 3D das missões que vieram da Rabiscópolis (gatinhos, baú do tesouro, foguinho na lixeira,
// pórtico numerado da corrida, placas de número, caixa de frutas, maleta, mochila, caixinha de correio colorida,
// envelope colorido). Tudo no traço da cidade (toon com contorno) e mesclado em poucas malhas; só o que mexe
// (tampa do baú, chamas, rabinho) fica solto. Nada disso é montado antes de a missão precisar (missoes.js).

import { THREE, mat, malha, caixaRedonda, texturaCanvas, mesclar } from "./base3d.js";

const CONTORNO = 0.035;
// número grande em canvas (placas e pórticos)
const texNum = new Map();
export function texturaNumero(n, cor = "#ec2e8c") {
  const k = `${n}|${cor}`;
  if (!texNum.has(k)) texNum.set(k, texturaCanvas(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#ffffff"; c.strokeStyle = "#151515"; c.lineWidth = 8; c.beginPath(); c.arc(64, 64, 56, 0, 7); c.fill(); c.stroke();
    c.font = "900 86px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = cor; c.fillText(String(n), 64, 70);
  }));
  return texNum.get(k);
}
// envelope colorido (figurinha das cartas coloridas): o coraçãozinho do selo na cor da carta
const texEnv = new Map();
export function texturaEnvelope(hex) {
  if (!texEnv.has(hex)) texEnv.set(hex, texturaCanvas(128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.fillStyle = "#ffffff"; c.strokeStyle = "#151515"; c.lineWidth = 8; c.beginPath(); c.arc(64, 64, 56, 0, 7); c.fill(); c.stroke();
    const cor = `#${hex.toString(16).padStart(6, "0")}`;
    c.fillStyle = cor; c.lineWidth = 5; c.beginPath(); c.roundRect(24, 38, 80, 54, 8); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(26, 42); c.lineTo(64, 70); c.lineTo(102, 42); c.stroke();
    c.fillStyle = "#ffffff"; c.beginPath(); c.arc(64, 78, 9, 0, 7); c.fill();
  }));
  return texEnv.get(hex);
}

// gatinho sentado (laranja, cinza ou branco), olhos grandes; o rabinho abana (userData.rabo)
export function gatinho(cor = 0xff9f43) {
  const g = new THREE.Group();
  const pelo = mat(cor);
  const corpo = malha(new THREE.SphereGeometry(0.3, 14, 10), pelo, { contorno: CONTORNO, sombra: false }); corpo.scale.set(1, 0.95, 1.25); corpo.position.y = 0.3; g.add(corpo);
  const cab = malha(new THREE.SphereGeometry(0.25, 16, 12), pelo, { contorno: CONTORNO, sombra: false }); cab.position.set(0, 0.68, 0.18); g.add(cab);
  for (const s of [-1, 1]) {
    const o = malha(new THREE.ConeGeometry(0.09, 0.18, 4), pelo, { contorno: 0.02, sombra: false }); o.position.set(s * 0.14, 0.9, 0.16); o.rotation.z = -s * 0.25; g.add(o);
    const dentroO = malha(new THREE.ConeGeometry(0.05, 0.1, 4), mat(0xff9fc0), { sombra: false }); dentroO.position.set(s * 0.14, 0.88, 0.2); dentroO.rotation.z = -s * 0.25; g.add(dentroO);
    const olho = malha(new THREE.SphereGeometry(0.07, 10, 8), mat(0xffffff), { sombra: false }); olho.position.set(s * 0.1, 0.72, 0.39); olho.scale.z = 0.6; g.add(olho);
    const pupila = malha(new THREE.SphereGeometry(0.042, 8, 6), mat(0x151515), { sombra: false }); pupila.position.set(s * 0.1, 0.71, 0.43); g.add(pupila);
    const bigode = malha(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), mat(0x151515), { sombra: false }); bigode.rotation.z = Math.PI / 2 + s * 0.15; bigode.position.set(s * 0.2, 0.6, 0.38); g.add(bigode);
    const pata = malha(new THREE.SphereGeometry(0.08, 8, 6), pelo, { contorno: 0.02, sombra: false }); pata.position.set(s * 0.12, 0.06, 0.28); g.add(pata);
  }
  const nariz = malha(new THREE.SphereGeometry(0.035, 8, 6), mat(0xff6f9a), { sombra: false }); nariz.position.set(0, 0.63, 0.43); g.add(nariz);
  const rabo = new THREE.Group(); rabo.position.set(0, 0.2, -0.32); rabo.userData.dinamico = true; g.add(rabo);
  const r1 = malha(new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), pelo, { contorno: 0.02, sombra: false }); r1.position.y = 0.22; r1.rotation.x = -0.35; rabo.add(r1);
  g.scale.setScalar(1.3); // um pouco maiores: dá para achar de longe
  mesclar(g);
  g.userData.rabo = rabo;
  return g;
}

// baú do tesouro: madeira com faixas douradas; a tampa abre (userData.tampa.rotation.x)
export function bau() {
  const g = new THREE.Group();
  const madeira = mat(0xb9773d), ouro = mat(0xffcc1f, { emissive: 0x332200 });
  const base = caixaRedonda(1.2, 0.66, 0.8, madeira, { raio: 0.08, contorno: CONTORNO }); base.position.y = 0.35; g.add(base);
  for (const x of [-0.42, 0.42]) { const f = caixaRedonda(0.14, 0.7, 0.84, ouro, { raio: 0.04 }); f.position.set(x, 0.36, 0); g.add(f); }
  const fecho = caixaRedonda(0.22, 0.24, 0.08, ouro, { raio: 0.04, contorno: 0.02 }); fecho.position.set(0, 0.6, 0.42); g.add(fecho);
  const tampa = new THREE.Group(); tampa.position.set(0, 0.68, -0.4); tampa.userData.dinamico = true; g.add(tampa);
  const t = malha(new THREE.CylinderGeometry(0.42, 0.42, 1.22, 16, 1, false, 0, Math.PI), madeira, { contorno: CONTORNO, sombra: false }); t.rotation.z = Math.PI / 2; t.scale.set(0.6, 1, 1); t.position.set(0, 0, 0.4); tampa.add(t);
  const brilho = malha(new THREE.SphereGeometry(0.3, 10, 8), mat(0xffe680, { emissive: 0xffd84a, emissiveIntensity: 0.6 }), { sombra: false }); brilho.position.y = 0.62; brilho.scale.set(1.4, 0.4, 0.9); brilho.visible = false; brilho.userData.dinamico = true; g.add(brilho);
  mesclar(g);
  g.userData.tampa = tampa; g.userData.brilho = brilho;
  return g;
}

// foguinho dentro de uma lixeira de rua (nada assustador: chamas de desenho que encolhem com a água)
export function foguinho() {
  const g = new THREE.Group();
  const lixeira = malha(new THREE.CylinderGeometry(0.45, 0.38, 0.85, 14), mat(0x3d8f5a), { contorno: CONTORNO }); lixeira.position.y = 0.43; g.add(lixeira);
  const aro = malha(new THREE.TorusGeometry(0.45, 0.05, 6, 18), mat(0x2b6a42), { sombra: false }); aro.rotation.x = Math.PI / 2; aro.position.y = 0.86; g.add(aro);
  const chamas = new THREE.Group(); chamas.position.y = 0.82; chamas.userData.dinamico = true; g.add(chamas);
  // chamas de desenho: gotas (bojo redondo embaixo, pontinha curva em cima), três línguas de cada cor
  const gota = (r, h) => { const pts = []; for (let i = 0; i <= 12; i++) { const a = i / 12; const y = a * h; const rr = a < 0.35 ? r * Math.sin((a / 0.35) * Math.PI / 2) : r * Math.pow(1 - (a - 0.35) / 0.65, 1.4); pts.push(new THREE.Vector2(Math.max(0.001, rr), y)); } return new THREE.LatheGeometry(pts, 12); };
  // (toneMapped: false para o vermelho, o laranja e o amarelo ficarem vivos como no desenho)
  [[0xe8341c, 0.36, 1.05, 0, -0.05], [0xe8341c, 0.22, 0.72, 0.24, 0.02], [0xe8341c, 0.22, 0.78, -0.22, -0.02], [0xff9a1f, 0.25, 0.78, 0, 0.16], [0xffe14a, 0.14, 0.48, 0.02, 0.3]].forEach(([c, r, h, x, z], i) => {
    const m = new THREE.Mesh(gota(r, h), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    m.position.set(x, -0.05, z); m.rotation.z = -x * 0.8; m.userData.i = i; chamas.add(m);
  });
  const fumaca = new THREE.Group(); fumaca.position.y = 1.2; fumaca.visible = false; fumaca.userData.dinamico = true; g.add(fumaca);
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.2 + i * 0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); s.position.set((i - 1) * 0.15, i * 0.25, 0); fumaca.add(s); }
  mesclar(g);
  g.userData.chamas = chamas; g.userData.fumaca = fumaca;
  return g;
}

// pórtico da corrida: arco colorido por cima da rua com o número (gira devagar quando é o próximo)
export function portico(n) {
  const g = new THREE.Group();
  const cores = [0xec2e8c, 0x00b5f0, 0xffcc1f, 0x58c43a, 0x8e6cff];
  const aro = malha(new THREE.TorusGeometry(4.2, 0.32, 10, 36, Math.PI), mat(cores[(n - 1) % 5], { emissive: cores[(n - 1) % 5], emissiveIntensity: 0.25 }), { contorno: 0.06, sombra: false });
  aro.position.y = 0.1; g.add(aro);
  for (const s of [-1, 1]) { const b = caixaRedonda(0.9, 0.3, 0.9, mat(0xffffff), { raio: 0.1, contorno: 0.03 }); b.position.set(s * 4.2, 0.15, 0); g.add(b); }
  const num = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaNumero(n, `#${cores[(n - 1) % 5].toString(16).padStart(6, "0")}`) }));
  num.scale.setScalar(2.2); num.position.y = 4.3; num.userData.dinamico = true; g.add(num);
  mesclar(g);
  g.userData.num = num;
  return g;
}

// placa redonda de número no chão (contar os patinhos): pisa em cima para escolher
export function placaNumero(n) {
  const g = new THREE.Group();
  const piso = malha(new THREE.CylinderGeometry(1.0, 1.05, 0.12, 24), mat(0x00b5f0), { contorno: 0.03, sombra: false }); piso.position.y = 0.06; g.add(piso);
  const poste = malha(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), mat(0xffffff), { sombra: false }); poste.position.set(0, 0.7, -0.7); g.add(poste);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaNumero(n, "#1d6fe0") }));
  sp.scale.setScalar(1.1); sp.position.set(0, 1.6, -0.7); g.add(sp);
  mesclar(g);
  return g;
}

// caixa de frutas (encomenda): vai no porta-malas
export function caixaFrutas() {
  const g = new THREE.Group();
  const cx = caixaRedonda(1.3, 0.6, 0.9, mat(0xd9a96b), { raio: 0.06, contorno: CONTORNO }); cx.position.y = 0.3; g.add(cx);
  for (const x of [-0.45, 0, 0.45]) { const r = caixaRedonda(0.08, 0.62, 0.92, mat(0xb07a3e), { raio: 0.02 }); r.position.set(x, 0.3, 0); g.add(r); }
  [[-0.35, 0.18, 0xff8a1f], [0, 0.1, 0xffd84a], [0.35, 0.2, 0xff8a1f], [-0.15, -0.2, 0xff8a1f], [0.2, -0.15, 0x58c43a]].forEach(([x, z, c]) => { const f = malha(new THREE.SphereGeometry(0.17, 10, 8), mat(c), { contorno: 0.02, sombra: false }); f.position.set(x, 0.66, z); g.add(f); });
  mesclar(g);
  return g;
}

// caixinha de correio no poste, na cor da carta
export function caixaCorreio(cor) {
  const g = new THREE.Group();
  const poste = malha(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), mat(0x6b4a2f), { sombra: false }); poste.position.y = 0.5; g.add(poste);
  const cx = caixaRedonda(0.42, 0.36, 0.62, mat(cor), { raio: 0.14, contorno: CONTORNO }); cx.position.y = 1.15; g.add(cx);
  const bandeirinha = caixaRedonda(0.04, 0.26, 0.14, mat(0xe8413c), { raio: 0.02 }); bandeirinha.position.set(0.24, 1.32, -0.1); g.add(bandeirinha);
  mesclar(g);
  return g;
}
