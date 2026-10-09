// Objetos 3D do mundo do Rabisco, feitos de formas simples no estilo cartoon.
// Frente dos objetos aponta para +z.

import { THREE, COR3D, toon, peca, comContorno, texturaCanvas } from "./toon.js";

const G = THREE;

// Lápis gigante (decoração e pilares de pórtico)
export function lapis3D(cor, altura = 20, raio = 1.6) {
  const g = new G.Group();
  const corpo = peca(new G.CylinderGeometry(raio, raio, altura, 6), cor, { contorno: 0.35 });
  corpo.position.y = altura / 2;
  g.add(corpo);
  // listras perto da ponta
  for (const y of [altura - 1.4, altura - 0.6]) {
    const faixa = new G.Mesh(new G.CylinderGeometry(raio * 1.02, raio * 1.02, 0.25, 6), toon(COR3D.tinta));
    faixa.position.y = y;
    g.add(faixa);
  }
  const madeira = peca(new G.ConeGeometry(raio, raio * 2.4, 6), COR3D.madeira, { contorno: 0.3 });
  madeira.position.y = altura + raio * 1.2;
  g.add(madeira);
  const ponta = new G.Mesh(new G.ConeGeometry(raio * 0.36, raio * 0.86, 6), toon(cor));
  ponta.position.y = altura + raio * 2.4 - raio * 0.43 + 0.02;
  g.add(ponta);
  return g;
}

export function arvore3D(escala = 1) {
  const g = new G.Group();
  const tronco = peca(new G.CylinderGeometry(0.7, 0.9, 6, 8), COR3D.marrom, { contorno: 0.25 });
  tronco.position.y = 3;
  g.add(tronco);
  const copa = [[0, 8.5, 0, 3.6], [2.4, 7.2, 0.6, 2.6], [-2.2, 7.4, -0.4, 2.7], [0.4, 10.6, 0.2, 2.6], [0, 7.4, 2.2, 2.4]];
  for (const [x, y, z, r] of copa) {
    const bola = peca(new G.IcosahedronGeometry(r, 1), COR3D.verde, { contorno: 0.3 });
    bola.position.set(x, y, z);
    g.add(bola);
  }
  g.scale.setScalar(escala);
  return g;
}

export function nuvem3D(escala = 1) {
  const g = new G.Group();
  const mat = toon(0xffffff, { transparent: true, opacity: 0.96 });
  for (const [x, y, z, r] of [[0, 0, 0, 5], [5, -1, 1, 4], [-5, -1, 0, 4], [2, 2.5, -1, 4], [-2, 2, 1, 3.6]]) {
    const b = new G.Mesh(new G.IcosahedronGeometry(r, 2), mat);
    b.position.set(x, y, z);
    g.add(b);
  }
  g.scale.setScalar(escala);
  return g;
}

export function morro3D(raio, cor = 0x7dd36a) {
  const m = new G.Mesh(new G.SphereGeometry(raio, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(cor));
  m.scale.y = 0.45;
  m.receiveShadow = true;
  return m;
}

function placaTexto(texto, { w = 512, h = 128, fundo = "#ffffff", cor = "#ec2e8c", fonte = "800 84px 'Baloo 2', sans-serif" } = {}) {
  return texturaCanvas(w, h, (c) => {
    c.fillStyle = fundo; c.fillRect(0, 0, w, h);
    c.font = fonte; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 10; c.strokeStyle = "#151515"; c.strokeText(texto, w / 2, h / 2 + 6);
    c.fillStyle = cor; c.fillText(texto, w / 2, h / 2 + 6);
  });
}

// Escola Educarte
export function escola3D(texLogo) {
  const g = new G.Group();
  const predio = peca(new G.BoxGeometry(36, 14, 16), 0xffe3a3, { contorno: 0.4 });
  predio.position.y = 7;
  g.add(predio);
  // telhado (prisma)
  const forma = new G.Shape();
  forma.moveTo(-20, 0); forma.lineTo(0, 9); forma.lineTo(20, 0); forma.lineTo(-20, 0);
  const telhado = peca(new G.ExtrudeGeometry(forma, { depth: 18, bevelEnabled: false }), COR3D.vermelho, { contorno: 0.4 });
  telhado.position.set(0, 14, -9);
  g.add(telhado);
  // torre
  const torre = peca(new G.BoxGeometry(8, 12, 8), 0xffd27a, { contorno: 0.3 });
  torre.position.set(0, 26, 0);
  g.add(torre);
  const ponta = peca(new G.ConeGeometry(6.4, 7, 4), COR3D.vermelho, { contorno: 0.3 });
  ponta.position.set(0, 35.5, 0);
  ponta.rotation.y = Math.PI / 4;
  g.add(ponta);
  // janelas e porta (na frente, +z)
  const vidro = toon(0x9be7ff);
  for (const x of [-13, -6.5, 6.5, 13]) {
    for (const y of [4.5, 10]) {
      const j = new G.Mesh(new G.PlaneGeometry(4, 3.4), vidro);
      j.position.set(x, y, 8.02);
      comContorno(j, 0.4);
      g.add(j);
    }
  }
  const porta = new G.Mesh(new G.PlaneGeometry(5.4, 7.6), toon(0xb0662e));
  porta.position.set(0, 3.8, 8.03);
  g.add(porta);
  g.userData.porta = porta;
  // placa com a logo oficial
  const placa = new G.Mesh(new G.PlaneGeometry(14, 7.3), new G.MeshBasicMaterial({ map: texLogo, transparent: true }));
  const fundoPlaca = peca(new G.BoxGeometry(15.4, 8.4, 0.6), 0xffffff, { contorno: 0.4, sombra: false });
  fundoPlaca.position.set(0, 18.6, 8.6);
  placa.position.set(0, 18.6, 8.95);
  g.add(fundoPlaca, placa);
  return g;
}

// Ônibus escolar
export function onibus3D(texLogo) {
  const g = new G.Group();
  const corpo = peca(new G.BoxGeometry(5, 5, 14), COR3D.amarelo, { contorno: 0.3 });
  corpo.position.y = 3.6;
  g.add(corpo);
  const faixa = new G.Mesh(new G.BoxGeometry(5.06, 0.5, 14.06), toon(COR3D.tinta));
  faixa.position.y = 2.6;
  g.add(faixa);
  const vidro = toon(0x9be7ff);
  for (let i = 0; i < 4; i++) {
    for (const lado of [-1, 1]) {
      const j = new G.Mesh(new G.PlaneGeometry(2.4, 1.6), vidro);
      j.position.set(lado * 2.52, 4.6, -4.5 + i * 3);
      j.rotation.y = (lado * Math.PI) / 2;
      g.add(j);
    }
  }
  const logo = new G.Mesh(new G.PlaneGeometry(4.6, 2.4), new G.MeshBasicMaterial({ map: texLogo, transparent: true }));
  logo.position.set(2.53, 3.4, 3.2);
  logo.rotation.y = Math.PI / 2;
  g.add(logo);
  for (const [x, z] of [[-2.3, -4.5], [2.3, -4.5], [-2.3, 4.5], [2.3, 4.5]]) {
    const r = peca(new G.CylinderGeometry(1.1, 1.1, 0.8, 16), 0x333333, { contorno: 0.2 });
    r.rotation.z = Math.PI / 2;
    r.position.set(x, 1.1, z);
    g.add(r);
  }
  return g;
}

// Pilha de livros (decoração)
export function livros3D() {
  const g = new G.Group();
  const cores = [COR3D.ciano, COR3D.rosa, COR3D.laranja, COR3D.roxo];
  let y = 0;
  cores.forEach((cor, i) => {
    const l = peca(new G.BoxGeometry(7 - i * 0.6, 1.4, 5 - i * 0.3), cor, { contorno: 0.2 });
    y += 0.7;
    l.position.y = y;
    y += 0.7;
    l.rotation.y = (i % 2 ? 1 : -1) * 0.15;
    g.add(l);
  });
  return g;
}

// ------------------------------------------------------------------ Karts
export function kart3D(cor, texEmblema, { capo: corCapo = cor, detalhe = COR3D.tinta } = {}) {
  const g = new G.Group();
  const chassi = new G.Group();
  g.add(chassi);
  g.userData.chassi = chassi;

  // banheira arredondada (vista de cima é um retângulo de cantos redondos)
  const forma = new G.Shape();
  const w = 0.9, c = 1.5, r = 0.55;
  forma.moveTo(-w + r, -c);
  forma.lineTo(w - r, -c); forma.quadraticCurveTo(w, -c, w, -c + r);
  forma.lineTo(w, c - r); forma.quadraticCurveTo(w, c, w - r, c);
  forma.lineTo(-w + r, c); forma.quadraticCurveTo(-w, c, -w, c - r);
  forma.lineTo(-w, -c + r); forma.quadraticCurveTo(-w, -c, -w + r, -c);
  const geoBase = new G.ExtrudeGeometry(forma, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.14, bevelSegments: 4, curveSegments: 10 });
  geoBase.rotateX(-Math.PI / 2);
  geoBase.center();
  const base = peca(geoBase, cor, { contorno: 0.1 });
  base.position.y = 0.6;
  chassi.add(base);

  // capô oval
  const capo = peca(new G.SphereGeometry(1, 24, 14), corCapo, { contorno: 0.08 });
  capo.scale.set(0.72, 0.34, 0.95);
  capo.position.set(0, 0.86, 0.75);
  chassi.add(capo);
  if (texEmblema) {
    const emb = new G.Mesh(new G.CircleGeometry(0.36, 24), new G.MeshBasicMaterial({ map: texEmblema, transparent: true }));
    emb.rotation.x = -Math.PI / 2 - 0.25;
    emb.position.set(0, 1.21, 0.62);
    chassi.add(emb);
  }
  // para-choque e laterais
  const pc = peca(new G.CapsuleGeometry(0.2, 1.7, 6, 12), detalhe, { contorno: 0.06 });
  pc.rotation.z = Math.PI / 2;
  pc.position.set(0, 0.42, 1.68);
  chassi.add(pc);
  for (const x of [-1.02, 1.02]) {
    const lateral = peca(new G.CapsuleGeometry(0.27, 1.3, 6, 12), detalhe, { contorno: 0.06 });
    lateral.rotation.x = Math.PI / 2;
    lateral.position.set(x, 0.55, 0);
    chassi.add(lateral);
  }
  // banco baixinho (o Rabisco aparece inteiro de costas)
  const banco = peca(new G.CapsuleGeometry(0.2, 0.8, 4, 10), 0x2b2b2b, { contorno: 0.05 });
  banco.rotation.z = Math.PI / 2;
  banco.position.set(0, 0.95, -1.05);
  chassi.add(banco);
  const volante = new G.Mesh(new G.TorusGeometry(0.28, 0.06, 8, 16), toon(COR3D.tinta));
  volante.position.set(0, 1.3, 0.25);
  volante.rotation.x = -0.9;
  chassi.add(volante);
  g.userData.volante = volante;
  // aerofólio
  const asa = peca(new G.BoxGeometry(2.0, 0.1, 0.5), corCapo, { contorno: 0.05 });
  asa.position.set(0, 1.18, -1.62);
  chassi.add(asa);
  for (const x of [-0.6, 0.6]) {
    const haste = new G.Mesh(new G.BoxGeometry(0.1, 0.45, 0.1), toon(COR3D.tinta));
    haste.position.set(x, 0.95, -1.55);
    chassi.add(haste);
  }
  // escapamentos (de onde sai o turbo)
  g.userData.escapes = [];
  for (const x of [-0.55, 0.55]) {
    const e = peca(new G.CylinderGeometry(0.13, 0.17, 0.5, 10), COR3D.cinza, { contorno: 0.05 });
    e.rotation.x = Math.PI / 2;
    e.position.set(x, 0.6, -1.78);
    chassi.add(e);
    g.userData.escapes.push(e);
  }
  // rodas: pneu gordinho e calota colorida
  g.userData.rodas = [];
  for (const [x, z, rr] of [[-1.12, 1.05, 0.44], [1.12, 1.05, 0.44], [-1.18, -1.05, 0.54], [1.18, -1.05, 0.54]]) {
    const roda = new G.Group();
    const pneu = peca(new G.CylinderGeometry(rr, rr, 0.52, 20), 0x262626, { contorno: 0.06 });
    pneu.rotation.z = Math.PI / 2;
    const calota = new G.Mesh(new G.CylinderGeometry(rr * 0.5, rr * 0.5, 0.54, 12), toon(corCapo));
    calota.rotation.z = Math.PI / 2;
    roda.add(pneu, calota);
    roda.position.set(x, rr, z);
    roda.userData.frente = z > 0;
    g.add(roda);
    g.userData.rodas.push(roda);
  }
  const sombra = new G.Mesh(new G.CircleGeometry(1.7, 24), new G.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.03;
  sombra.scale.z = 1.4;
  g.add(sombra);
  return g;
}

// Barreira de gizes de cera deitados (beira da pista)
export function barreiraGiz(n, cores) {
  const geo = new G.CapsuleGeometry(0.55, 2.6, 2, 8);
  geo.rotateZ(Math.PI / 2);
  const malhas = cores.map((cor) => {
    const m = new G.InstancedMesh(geo, toon(cor), n);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  });
  const contorno = new G.InstancedMesh(geo, new G.MeshBasicMaterial({ color: COR3D.tinta, side: G.BackSide }), n);
  return { malhas, contorno };
}

// Amiguinhos lápis de cor que correm contra o Rabisco
export function pilotoLapis(cor) {
  const g = new G.Group();
  const corpo = peca(new G.CylinderGeometry(0.42, 0.42, 1.5, 6), cor, { contorno: 0.06 });
  corpo.position.y = 0.75;
  g.add(corpo);
  const madeira = peca(new G.ConeGeometry(0.42, 0.75, 6), COR3D.madeira, { contorno: 0.06 });
  madeira.position.y = 1.87;
  g.add(madeira);
  const ponta = new G.Mesh(new G.ConeGeometry(0.15, 0.27, 6), toon(cor));
  ponta.position.y = 2.12;
  g.add(ponta);
  for (const x of [-0.17, 0.17]) {
    const olho = new G.Mesh(new G.SphereGeometry(0.13, 12, 8), toon(0xffffff));
    olho.position.set(x, 1.05, 0.36);
    const pupila = new G.Mesh(new G.SphereGeometry(0.065, 8, 6), toon(COR3D.tinta));
    pupila.position.set(0, 0, 0.09);
    olho.add(pupila);
    g.add(olho);
  }
  const boca = new G.Mesh(new G.TorusGeometry(0.12, 0.03, 6, 12, Math.PI), toon(COR3D.tinta));
  boca.position.set(0, 0.78, 0.4);
  boca.rotation.z = Math.PI;
  g.add(boca);
  return g;
}

// Placa com número (respostas no pórtico)
export function texturaNumero(n, destaque = false) {
  return texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#151515";
    c.beginPath(); c.roundRect(6, 10, w - 12, h - 12, 40); c.fill();
    c.fillStyle = destaque ? "#ffcc1f" : "#ffffff";
    c.beginPath(); c.roundRect(10, 4, w - 20, h - 20, 36); c.fill();
    c.font = "800 170px 'Baloo 2', sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 14; c.strokeStyle = "#151515"; c.strokeText(String(n), w / 2, h / 2 + 8);
    c.fillStyle = "#ec2e8c"; c.fillText(String(n), w / 2, h / 2 + 8);
  });
}

export { placaTexto };

// ------------------------------------------------------------------ Plataforma (Super Rabisco 3D)

const texInterrogacao = () => texturaCanvas(256, 256, (c, w, h) => {
  c.fillStyle = "#ff7a00"; c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(255,255,255,0.3)"; c.fillRect(20, 18, w - 40, 14);
  c.fillStyle = "#151515";
  for (const [x, y] of [[36, 36], [220, 36], [36, 220], [220, 220]]) { c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fill(); }
  c.font = "800 190px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
  c.lineWidth = 22; c.strokeStyle = "#151515"; c.strokeText("?", w / 2, h / 2 + 14);
  c.fillStyle = "#ffffff"; c.fillText("?", w / 2, h / 2 + 14);
});
let _texBloco = null;

// Bloco "?" (vazio = marrom, depois de usado)
export function bloco3D() {
  _texBloco ??= texInterrogacao();
  const m = new G.Mesh(new G.BoxGeometry(1, 1, 1), toon(0xffffff, { map: _texBloco }));
  m.castShadow = m.receiveShadow = true;
  comContorno(m, 0.08);
  m.userData.usar = () => { m.material = toon(0xc98a55); };
  return m;
}

// Moeda = selo oficial da Educarte girando
export function moeda3D(texSelo) {
  const g = new G.Group();
  const mat = new G.MeshBasicMaterial({ map: texSelo, transparent: true, side: G.DoubleSide, alphaTest: 0.4 });
  const frente = new G.Mesh(new G.PlaneGeometry(0.8, 0.8), mat);
  g.add(frente);
  return g;
}

// Bolha com uma letra, sílaba, fruta ou resposta dentro (grande: respostas longas do Super Rabisco 2)
export function bolha3D(texto, { grande = false } = {}) {
  const g = new G.Group();
  const esfera = new G.Mesh(new G.SphereGeometry(0.62, 32, 20), toon(0xffffff, { transparent: true, opacity: 0.3, depthWrite: false }));
  g.add(esfera);
  const anel = new G.Mesh(new G.TorusGeometry(0.62, 0.06, 10, 40), toon(COR3D.rosa));
  g.add(anel);
  const brilho = new G.Mesh(new G.CircleGeometry(0.12, 16), new G.MeshBasicMaterial({ color: 0xffffff }));
  brilho.position.set(-0.25, 0.28, 0.6);
  g.add(brilho);
  const longo = [...texto].length > 4;
  const W = longo ? 768 : 256, H = 256;
  const tex = texturaCanvas(W, H, (c, w, h) => {
    let tam = 210;
    const fonte = (t) => `800 ${t}px 'Baloo 2', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif`;
    c.font = fonte(tam);
    while (c.measureText(texto).width > w - 30 && tam > 40) { tam -= 8; c.font = fonte(tam); }
    c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = Math.max(10, tam / 8); c.strokeStyle = "#ffffff"; c.lineJoin = "round"; c.strokeText(texto, w / 2, h / 2 + tam * 0.085);
    c.fillStyle = "#ec2e8c"; c.fillText(texto, w / 2, h / 2 + tam * 0.085);
  });
  const placa = new G.Mesh(new G.PlaneGeometry(longo ? 2.4 : 0.95, 0.95 * (longo ? 0.8 : 1)), new G.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  placa.position.z = 0.66; // na frente da bolha, sempre legível
  placa.renderOrder = 2;
  g.add(placa);
  if (grande) { esfera.scale.setScalar(1.25); anel.scale.setScalar(1.25); brilho.position.multiplyScalar(1.25); placa.position.z = 0.82; }
  return g;
}

// Borracha (inimiga): metade rosa, metade azul, cinta de papel, olhos bravos e pezinhos que marcham.
// userData: corpo (balança), pes [esq, dir] (andam), olhos (piscam)
export function borracha3D() {
  const g = new G.Group();
  const corpo = new G.Group();
  g.add(corpo);
  g.userData.corpo = corpo;
  const caixa = (w, cor, x) => {
    const f = new G.Shape();
    const ww = w / 2, hh = 0.32, r = 0.14;
    f.moveTo(-ww + r, -hh); f.lineTo(ww - r, -hh); f.quadraticCurveTo(ww, -hh, ww, -hh + r);
    f.lineTo(ww, hh - r); f.quadraticCurveTo(ww, hh, ww - r, hh); f.lineTo(-ww + r, hh);
    f.quadraticCurveTo(-ww, hh, -ww, hh - r); f.lineTo(-ww, -hh + r); f.quadraticCurveTo(-ww, -hh, -ww + r, -hh);
    const geo = new G.ExtrudeGeometry(f, { depth: 0.66, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 4 });
    geo.center();
    const m = peca(geo, cor, { contorno: 0.06 });
    m.position.set(x, 0.5, 0);
    corpo.add(m);
  };
  caixa(0.62, 0xff8fbf, -0.27);
  caixa(0.5, 0x4fb6ff, 0.31);
  // cinta de papel (como nas borrachas de verdade), com um "E" da Educarte
  const cinta = peca(new G.BoxGeometry(0.3, 0.8, 0.94), 0xfff6e0, { contorno: 0.04 });
  cinta.position.set(0.05, 0.5, 0);
  corpo.add(cinta);
  const faixa = new G.Mesh(new G.BoxGeometry(0.31, 0.12, 0.95), toon(COR3D.rosa));
  faixa.position.set(0.05, 0.62, 0);
  corpo.add(faixa);
  // olhos bravos (piscam) com sobrancelhas
  g.userData.olhos = [];
  for (const x of [-0.42, -0.14]) {
    const olho = new G.Mesh(new G.SphereGeometry(0.12, 18, 12), toon(0xffffff));
    olho.scale.z = 0.45;
    olho.position.set(x, 0.6, 0.47);
    comContorno(olho, 0.035);
    const pupila = new G.Mesh(new G.SphereGeometry(0.055, 10, 8), toon(COR3D.tinta));
    pupila.position.set(-0.035, -0.015, 0.1);
    olho.add(pupila);
    corpo.add(olho);
    g.userData.olhos.push(olho);
    const sob = new G.Mesh(new G.BoxGeometry(0.22, 0.05, 0.05), toon(COR3D.tinta));
    sob.position.set(x, 0.77, 0.5);
    sob.rotation.z = x < -0.3 ? -0.4 : 0.4;
    corpo.add(sob);
  }
  const boca = new G.Mesh(new G.TorusGeometry(0.07, 0.02, 6, 12, Math.PI), toon(COR3D.tinta));
  boca.position.set(-0.28, 0.4, 0.5);
  corpo.add(boca);
  // pezinhos
  g.userData.pes = [-0.3, 0.3].map((x) => {
    const pe = peca(new G.CapsuleGeometry(0.09, 0.14, 4, 10), 0x2b2b2b, { contorno: 0.03 });
    pe.rotation.x = Math.PI / 2;
    pe.position.set(x, 0.07, 0.08);
    g.add(pe);
    return pe;
  });
  corpo.position.y = 0.1;
  return g;
}

// Manchinha de Tinta (inimiga surpresa): bolha roxa de tinta, gelatinosa, que pula no lugar.
// Pisada, vira uma poça. userData: corpo (estica e achata), olhos, poca
export function manchinha3D() {
  const g = new G.Group();
  const corpo = new G.Group();
  g.add(corpo);
  g.userData.corpo = corpo;
  const tinta = 0x5b2bb5;
  const gota = peca(new G.SphereGeometry(0.5, 32, 24), tinta, { contorno: 0.06 });
  gota.scale.set(1, 0.9, 0.85);
  gota.position.y = 0.45;
  corpo.add(gota);
  const topo = peca(new G.ConeGeometry(0.22, 0.4, 20), tinta, { contorno: 0.05 }); // biquinho de gota
  topo.position.y = 0.95;
  topo.rotation.z = 0.25;
  corpo.add(topo);
  const brilho = new G.Mesh(new G.SphereGeometry(0.1, 12, 8), new G.MeshBasicMaterial({ color: 0xc9b2ff }));
  brilho.scale.set(1, 1.6, 0.4);
  brilho.position.set(-0.25, 0.7, 0.36);
  corpo.add(brilho);
  for (const x of [-0.17, 0.17]) {
    const olho = new G.Mesh(new G.SphereGeometry(0.15, 18, 12), toon(0xffffff));
    olho.scale.z = 0.5;
    olho.position.set(x, 0.55, 0.38);
    comContorno(olho, 0.03);
    const pupila = new G.Mesh(new G.SphereGeometry(0.07, 10, 8), toon(COR3D.tinta));
    pupila.position.set(0, -0.03, 0.1);
    olho.add(pupila);
    corpo.add(olho);
  }
  const sorriso = new G.Mesh(new G.TorusGeometry(0.1, 0.025, 6, 14, Math.PI), toon(COR3D.tinta));
  sorriso.position.set(0, 0.33, 0.42);
  sorriso.rotation.z = Math.PI;
  corpo.add(sorriso);
  // poça (aparece quando é pisada)
  const poca = new G.Mesh(new G.CircleGeometry(0.8, 28), toon(tinta));
  poca.rotation.x = -Math.PI / 2;
  poca.position.y = 0.02;
  poca.scale.set(1, 0.6, 1);
  poca.visible = false;
  g.add(poca);
  g.userData.poca = poca;
  return g;
}

// Pilha de livros usada como plataforma (largura w, topo em y=0)
export function plataformaLivros(w, semente = 0) {
  const g = new G.Group();
  const cores = [COR3D.ciano, COR3D.rosa, COR3D.laranja, COR3D.roxo, COR3D.verde, COR3D.vermelho];
  const camadas = [[w, cores[semente % 6], -0.25], [w - 0.25, cores[(semente + 2) % 6], -0.75]];
  for (const [lw, cor, y] of camadas) {
    const livro = peca(new G.BoxGeometry(lw, 0.5, 1.8), cor, { contorno: 0.06 });
    livro.position.y = y;
    g.add(livro);
    const paginas = new G.Mesh(new G.BoxGeometry(lw - 0.12, 0.36, 0.06), toon(0xfffaf0));
    paginas.position.set(0, y, 0.91);
    g.add(paginas);
  }
  return g;
}

// Cerca de madeira (comprimento em unidades)
export function cerca3D(comprimento) {
  const g = new G.Group();
  const madeira = 0xf2a35e;
  for (const y of [0.45, 0.95]) {
    const trave = peca(new G.BoxGeometry(comprimento, 0.14, 0.08), 0xe2914f, { contorno: 0.04 });
    trave.position.set(comprimento / 2, y, -0.05);
    g.add(trave);
  }
  const geo = new G.BoxGeometry(0.32, 1.25, 0.08);
  const n = Math.floor(comprimento / 0.6);
  const ripas = new G.InstancedMesh(geo, toon(madeira), n);
  const aux = new G.Object3D();
  for (let i = 0; i < n; i++) {
    aux.position.set(0.3 + i * 0.6, 0.62, 0);
    aux.updateMatrix();
    ripas.setMatrixAt(i, aux.matrix);
  }
  ripas.castShadow = true;
  g.add(ripas);
  return g;
}

export function flor3D(cor = 0xffffff) {
  const g = new G.Group();
  const caule = new G.Mesh(new G.CylinderGeometry(0.025, 0.025, 0.35, 6), toon(COR3D.verdeEscuro));
  caule.position.y = 0.17;
  g.add(caule);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = new G.Mesh(new G.SphereGeometry(0.07, 8, 6), toon(cor));
    p.position.set(Math.cos(a) * 0.09, 0.38 + Math.sin(a) * 0.09, 0);
    g.add(p);
  }
  const miolo = new G.Mesh(new G.SphereGeometry(0.06, 8, 6), toon(COR3D.amarelo));
  miolo.position.set(0, 0.38, 0.03);
  g.add(miolo);
  return g;
}

// ------------------------------------------------------------------ Cenário estilo Mario (1 bloco = 1 unidade)

const TINTA_MARIO = "#151515";
function chanfrado(c, s, base, luz, sombra) {
  c.fillStyle = base; c.fillRect(0, 0, s, s);
  c.fillStyle = luz;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(s, 0); c.lineTo(s - 14, 14); c.lineTo(14, 14); c.lineTo(14, s - 14); c.lineTo(0, s); c.fill();
  c.fillStyle = sombra;
  c.beginPath(); c.moveTo(s, 0); c.lineTo(s, s); c.lineTo(0, s); c.lineTo(14, s - 14); c.lineTo(s - 14, s - 14); c.lineTo(s - 14, 14); c.fill();
}
function tijolos(c, w, h, base, rejunte, ah = 32, lw = 64) {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  c.strokeStyle = rejunte; c.lineWidth = 5;
  for (let y = 0, l = 0; y < h; y += ah, l++) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    for (let x = l % 2 ? lw / 2 : 0; x < w; x += lw) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, Math.min(y + ah, h)); c.stroke(); }
  }
}
const texM = {};
function texMario(nome) {
  if (texM[nome]) return texM[nome];
  const S = 128;
  const t = {
    chao: () => texturaCanvas(S, S, (c) => {
      chanfrado(c, S, "#d9773a", "#f4a464", "#a14f1c");
      c.strokeStyle = "#7a3510"; c.lineWidth = 5;
      c.beginPath(); c.moveTo(36, 32); c.lineTo(60, 52); c.lineTo(52, 80); c.stroke();
      c.beginPath(); c.moveTo(88, 72); c.lineTo(104, 96); c.stroke();
      c.strokeStyle = TINTA_MARIO; c.lineWidth = 4; c.strokeRect(2, 2, S - 4, S - 4);
    }, { repetir: true }),
    chaoAzul: () => texturaCanvas(S, S, (c) => {
      chanfrado(c, S, "#3d63c9", "#7d9cf0", "#243f8f");
      c.strokeStyle = "#16295e"; c.lineWidth = 5;
      c.beginPath(); c.moveTo(36, 32); c.lineTo(60, 52); c.lineTo(52, 80); c.stroke();
      c.strokeStyle = TINTA_MARIO; c.lineWidth = 4; c.strokeRect(2, 2, S - 4, S - 4);
    }, { repetir: true }),
    tijolo: () => texturaCanvas(S, S, (c) => {
      tijolos(c, S, S, "#cf5f2a", "#4a1d08");
      c.fillStyle = "rgba(255,255,255,0.22)"; c.fillRect(6, 6, S - 12, 7);
      c.strokeStyle = TINTA_MARIO; c.lineWidth = 8; c.strokeRect(4, 4, S - 8, S - 8);
    }),
    duro: () => texturaCanvas(S, S, (c) => {
      chanfrado(c, S, "#c8743c", "#eaa66b", "#8d4518");
      c.strokeStyle = TINTA_MARIO; c.lineWidth = 6; c.strokeRect(3, 3, S - 6, S - 6);
    }),
    usado: () => texturaCanvas(S, S, (c) => {
      chanfrado(c, S, "#a8663a", "#c98a55", "#7a4520");
      c.fillStyle = "#5a3215";
      for (const [x, y] of [[22, 22], [106, 22], [22, 106], [106, 106]]) { c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = TINTA_MARIO; c.lineWidth = 8; c.strokeRect(4, 4, S - 8, S - 8);
    }),
    pergunta: () => texturaCanvas(S, S, (c) => {
      c.fillStyle = "#ffb81c"; c.fillRect(0, 0, S, S);
      c.fillStyle = "#ffe08a"; c.fillRect(14, 12, S - 28, 10);
      c.fillStyle = "#b85a00";
      for (const [x, y] of [[22, 22], [106, 22], [22, 106], [106, 106]]) { c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill(); }
      c.font = "900 88px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = "#b85a00"; c.fillText("?", 70, 74);
      c.lineWidth = 12; c.strokeStyle = TINTA_MARIO; c.strokeText("?", 64, 68);
      c.fillStyle = "#fff"; c.fillText("?", 64, 68);
      c.strokeStyle = TINTA_MARIO; c.lineWidth = 8; c.strokeRect(4, 4, S - 8, S - 8);
    }),
    castelo: () => texturaCanvas(S, S, (c) => tijolos(c, S, S, "#d98a4e", "#7a3c14"), { repetir: true }),
  }[nome]();
  texM[nome] = t;
  return t;
}

// Bloco de 1×1×1 com textura em todas as faces (tijolo, duro, ? e usado)
export function blocoMario(tipo) {
  const m = new G.Mesh(new G.BoxGeometry(1, 1, 1), new G.MeshToonMaterial({ map: texMario(tipo) }));
  m.castShadow = m.receiveShadow = true;
  m.userData.trocar = (novo) => { m.material = new G.MeshToonMaterial({ map: texMario(novo) }); };
  return m;
}

// Chão de blocos: caixa comprida com a textura repetida bloco a bloco
export function chaoMario(comprimento, altura = 2, profundidade = 3, tipo = "chao") {
  const tex = texMario(tipo).clone();
  tex.needsUpdate = true;
  tex.repeat.set(comprimento, altura);
  const texTopo = texMario(tipo).clone();
  texTopo.needsUpdate = true;
  texTopo.repeat.set(comprimento, profundidade);
  const lado = new G.MeshToonMaterial({ map: tex }), topo = new G.MeshToonMaterial({ map: texTopo });
  const m = new G.Mesh(new G.BoxGeometry(comprimento, altura, profundidade), [lado, lado, topo, lado, lado, lado]);
  m.receiveShadow = true;
  return m;
}

// Cano verde (altura em blocos; 2 blocos de largura)
export function cano3D(altura) {
  const g = new G.Group();
  const verde = 0x3fbf3f;
  const corpo = peca(new G.CylinderGeometry(0.82, 0.82, altura - 0.5, 32), verde, { contorno: 0.08 });
  corpo.position.y = (altura - 0.5) / 2;
  const boca = peca(new G.CylinderGeometry(1.0, 1.0, 0.5, 32), verde, { contorno: 0.08 });
  boca.position.y = altura - 0.25;
  const furo = new G.Mesh(new G.CircleGeometry(0.78, 32), toon(0x1d4d1d));
  furo.rotation.x = -Math.PI / 2;
  furo.position.y = altura + 0.005;
  for (const [x, z, h] of [[-0.45, 0.62, altura - 0.5], [-0.55, 0.78, 0.5]]) {
    const brilho = new G.Mesh(new G.BoxGeometry(0.14, h, 0.05), toon(0x9cf06a));
    brilho.position.set(x, z === 0.62 ? (altura - 0.5) / 2 : altura - 0.25, z);
    g.add(brilho);
  }
  g.add(corpo, boca, furo);
  return g;
}

// Morro redondo com pintinhas (estilo plataforma clássico)
export function morroMario(raio, cor = 0x5cc13a, pinta = 0x3a9227) {
  const g = new G.Group();
  const m = peca(new G.SphereGeometry(raio, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), cor, { contorno: raio * 0.04, sombra: false });
  m.scale.y = 1.25;
  g.add(m);
  for (const [a, h, s] of [[-0.35, 0.55, 1], [0.3, 0.4, 1], [0, 0.22, 0.8], [-0.55, 0.2, 0.7], [0.6, 0.18, 0.7]]) {
    const p = new G.Mesh(new G.SphereGeometry(raio * 0.09 * s, 16, 12), toon(pinta));
    const phi = Math.acos(h), x = Math.sin(a) * Math.sin(phi), z = Math.cos(a) * Math.sin(phi);
    p.position.set(x * raio, h * raio * 1.25, z * raio);
    p.scale.set(0.8, 1.6, 0.35);
    p.lookAt(p.position.clone().multiplyScalar(2));
    g.add(p);
  }
  return g;
}

export function arbustoMario(escala = 1) {
  const g = new G.Group();
  for (const [x, y, r] of [[-0.9, 0.35, 0.6], [-0.2, 0.55, 0.8], [0.6, 0.5, 0.72], [1.2, 0.3, 0.5]]) {
    const b = peca(new G.IcosahedronGeometry(r, 2), 0x4fd23a, { contorno: 0.08 });
    b.position.set(x, y, 0);
    b.scale.z = 0.7;
    g.add(b);
  }
  g.scale.setScalar(escala);
  return g;
}

export function nuvemMario(escala = 1) {
  const g = new G.Group();
  for (const [x, y, r] of [[-1.2, 0, 0.8], [-0.4, 0.45, 1], [0.6, 0.4, 0.95], [1.4, 0, 0.75], [0.1, -0.1, 0.9]]) {
    const b = peca(new G.IcosahedronGeometry(r, 2), 0xffffff, { contorno: 0.1, sombra: false });
    b.position.set(x, y, 0);
    b.scale.z = 0.6;
    g.add(b);
  }
  g.scale.setScalar(escala);
  return g;
}

// Mastro com a bandeira da Educarte (altura em blocos); userData.bandeira desce na vitória
export function mastro3D(altura, texIcone) {
  const g = new G.Group();
  const haste = peca(new G.CylinderGeometry(0.08, 0.08, altura, 12), 0xc8f5c0, { contorno: 0.04 });
  haste.position.y = altura / 2;
  const bola = peca(new G.SphereGeometry(0.22, 20, 14), 0x3fbf3f, { contorno: 0.05 });
  bola.position.y = altura + 0.15;
  const tex = texturaCanvas(256, 180, (c) => {
    c.beginPath(); c.moveTo(250, 6); c.lineTo(6, 90); c.lineTo(250, 174); c.closePath();
    c.fillStyle = "#ec2e8c"; c.fill(); c.lineWidth = 10; c.strokeStyle = TINTA_MARIO; c.stroke();
    if (texIcone?.image) c.drawImage(texIcone.image, 150, 50, 80, 80);
  });
  const bandeira = new G.Mesh(new G.PlaneGeometry(1.4, 1), new G.MeshBasicMaterial({ map: tex, transparent: true, side: G.DoubleSide }));
  bandeira.position.set(-0.75, altura - 0.6, 0);
  g.add(haste, bola, bandeira);
  g.userData.bandeira = bandeira;
  return g;
}

// Castelo-escola de tijolos: ameias, torre, portão em arco e a placa da Educarte
export function castelo3D(texLogo) {
  const g = new G.Group();
  const parede = (w, h, d, x, y, z = 0) => {
    const tex = texMario("castelo").clone();
    tex.needsUpdate = true;
    tex.repeat.set(w, h);
    const m = new G.Mesh(new G.BoxGeometry(w, h, d), new G.MeshToonMaterial({ map: tex }));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    comContorno(m, 0.08);
    g.add(m);
    return m;
  };
  parede(9, 4, 4, 0, 2);
  for (let i = 0; i < 5; i++) parede(0.9, 0.8, 4, -4.05 + i * 2.025, 4.4);
  parede(4, 3, 3, 0, 5.5);
  for (let i = 0; i < 3; i++) parede(0.8, 0.8, 3, -1.6 + i * 1.6, 7.4);
  const escuro = toon(0x151515);
  const arco = (w, h, x, y, z) => {
    const f = new G.Shape();
    f.moveTo(-w / 2, 0); f.lineTo(-w / 2, h - w / 2); f.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); f.lineTo(w / 2, 0); f.closePath();
    const m = new G.Mesh(new G.ShapeGeometry(f, 16), escuro);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  g.userData.portao = arco(2, 2.6, 0, 0, 2.01);
  arco(0.9, 1.4, -3, 1.6, 2.01);
  arco(0.9, 1.4, 3, 1.6, 2.01);
  arco(0.9, 1.4, 0, 5.2, 1.51);
  // placa arredondada da Educarte (borda ciano, fundo branco) com a logo inteira dentro
  const cantos = (w, h, r) => {
    const f = new G.Shape();
    f.moveTo(-w / 2 + r, -h / 2); f.lineTo(w / 2 - r, -h / 2); f.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    f.lineTo(w / 2, h / 2 - r); f.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); f.lineTo(-w / 2 + r, h / 2);
    f.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); f.lineTo(-w / 2, -h / 2 + r); f.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return f;
  };
  const YP = 3.35;
  const borda = peca(new G.ExtrudeGeometry(cantos(2.75, 1.45, 0.32), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 }), COR3D.ciano, { contorno: 0.06, sombra: false });
  borda.position.set(0, YP, 2.0);
  const fundo = new G.Mesh(new G.ExtrudeGeometry(cantos(2.5, 1.2, 0.24), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), toon(0xffffff));
  fundo.position.set(0, YP, 2.19);
  const logo = new G.Mesh(new G.PlaneGeometry(2.0, 2.0 * 252 / 481), new G.MeshBasicMaterial({ map: texLogo, transparent: true }));
  logo.position.set(0, YP, 2.29);
  g.add(borda, fundo, logo);
  for (const x of [-1.15, 1.15]) { // parafusinhos rosa
    const p = new G.Mesh(new G.SphereGeometry(0.07, 12, 8), toon(COR3D.rosa));
    p.position.set(x, YP + 0.5, 2.27);
    g.add(p);
  }
  return g;
}

// ------------------------------------------------------------------ Escola Educarte (painel de entrada)
// Prédio de dois andares nas cores da marca, entrada com colunas de lápis, torre com relógio,
// placa da Educarte, parquinho (escorregador e balanço), mastro com bandeira e caminho de pedras.
export function escolaEducarte3D(texLogo, texIcone) {
  const g = new G.Group();
  const caixa = (w, h, d, cor, x, y, z, contorno = 0.08) => {
    const m = peca(new G.BoxGeometry(w, h, d), cor, { contorno });
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const CREME = 0xfff1d6, TELHA = COR3D.ciano;
  // corpo principal e alas
  caixa(16, 7, 7, CREME, 0, 3.5, 0);
  caixa(7, 5, 6, 0xffe3ef, -11.5, 2.5, 0.5);
  caixa(7, 5, 6, 0xdff6ff, 11.5, 2.5, 0.5);
  // faixas coloridas (rodapé e entre andares)
  caixa(16.2, 0.5, 7.2, COR3D.rosa, 0, 0.25, 0, 0.04);
  caixa(16.2, 0.35, 7.2, COR3D.laranja, 0, 3.6, 0, 0.04);
  caixa(7.2, 0.5, 6.2, COR3D.ciano, -11.5, 0.25, 0.5, 0.04);
  caixa(7.2, 0.5, 6.2, COR3D.rosa, 11.5, 0.25, 0.5, 0.04);
  // telhados (prismas)
  const telhado = (w, d, h, cor, x, y, z) => {
    const f = new G.Shape();
    f.moveTo(-w / 2, 0); f.lineTo(0, h); f.lineTo(w / 2, 0); f.closePath();
    const geo = new G.ExtrudeGeometry(f, { depth: d, bevelEnabled: false });
    geo.translate(0, 0, -d / 2);
    const m = peca(geo, cor, { contorno: 0.1 });
    m.position.set(x, y, z);
    g.add(m);
  };
  telhado(17.4, 8, 3, TELHA, 0, 7, 0);
  telhado(8.2, 7, 2.2, COR3D.laranja, -11.5, 5, 0.5);
  telhado(8.2, 7, 2.2, COR3D.roxo, 11.5, 5, 0.5);
  // torre com relógio (o "e" da Educarte no mostrador) e ponta de lápis
  caixa(4, 5, 4, 0xffffff, 0, 9.5, 0);
  const ponta = peca(new G.ConeGeometry(3, 4, 4), COR3D.madeira, { contorno: 0.08 });
  ponta.rotation.y = Math.PI / 4;
  ponta.position.set(0, 14, 0);
  const grafite = new G.Mesh(new G.ConeGeometry(0.9, 1.2, 4), toon(COR3D.tinta));
  grafite.rotation.y = Math.PI / 4;
  grafite.position.set(0, 16.2, 0);
  g.add(ponta, grafite);
  const relogio = peca(new G.CylinderGeometry(1.4, 1.4, 0.3, 40), COR3D.rosa, { contorno: 0.06 });
  relogio.rotation.x = Math.PI / 2;
  relogio.position.set(0, 10, 2.1);
  const mostrador = new G.Mesh(new G.CircleGeometry(1.15, 40), toon(0xffffff));
  mostrador.position.set(0, 10, 2.27);
  const iconeRelogio = new G.Mesh(new G.PlaneGeometry(1.5, 1.5), new G.MeshBasicMaterial({ map: texIcone, transparent: true, color: COR3D.rosa }));
  iconeRelogio.position.set(0, 10, 2.29);
  g.add(relogio, mostrador, iconeRelogio);
  // janelas com moldura (2 andares)
  const janela = (x, y, z, w = 1.6, h = 1.8) => {
    const moldura = caixa(w + 0.3, h + 0.3, 0.2, 0xffffff, x, y, z, 0.05);
    const vidro = new G.Mesh(new G.PlaneGeometry(w, h), toon(0x9be7ff));
    vidro.position.set(x, y, z + 0.11);
    const cruz1 = new G.Mesh(new G.PlaneGeometry(0.1, h), toon(0xffffff)); cruz1.position.set(x, y, z + 0.12);
    const cruz2 = new G.Mesh(new G.PlaneGeometry(w, 0.1), toon(0xffffff)); cruz2.position.set(x, y, z + 0.12);
    g.add(vidro, cruz1, cruz2);
    void moldura;
  };
  for (const x of [-6, 6]) janela(x, 5.3, 3.55);           // 2º andar: o meio fica para a placa
  for (const x of [-6, -3.3, 3.3, 6]) janela(x, 1.9, 3.55);
  for (const x of [-13, -10]) janela(x, 2.6, 3.55);
  for (const x of [10, 13]) janela(x, 2.6, 3.55);
  // entrada: porta em arco, toldo e colunas de lápis
  const arco = new G.Shape();
  arco.moveTo(-1.4, 0); arco.lineTo(-1.4, 2.2); arco.absarc(0, 2.2, 1.4, Math.PI, 0, true); arco.lineTo(1.4, 0); arco.closePath();
  const porta = new G.Mesh(new G.ShapeGeometry(arco, 20), toon(0xb0662e));
  porta.position.set(0, 0, 3.52);
  const portaDivisao = new G.Mesh(new G.PlaneGeometry(0.08, 3.4), toon(COR3D.tinta));
  portaDivisao.position.set(0, 1.7, 3.53);
  g.add(porta, portaDivisao);
  const toldo = caixa(5.4, 0.35, 2.4, COR3D.rosa, 0, 3.95, 4.6, 0.06);
  toldo.rotation.x = -0.12;
  const coresLapis = [COR3D.amarelo, COR3D.verde];
  [-2.4, 2.4].forEach((x, i) => {
    const l = lapis3D(coresLapis[i], 3.6, 0.32);
    l.position.set(x, 0, 5.6);
    g.add(l);
  });
  // placa da Educarte (borda ciano, como no castelo)
  const placa = (w, h, r) => {
    const f = new G.Shape();
    f.moveTo(-w / 2 + r, -h / 2); f.lineTo(w / 2 - r, -h / 2); f.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    f.lineTo(w / 2, h / 2 - r); f.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); f.lineTo(-w / 2 + r, h / 2);
    f.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); f.lineTo(-w / 2, -h / 2 + r); f.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return f;
  };
  const borda = peca(new G.ExtrudeGeometry(placa(6.2, 2.4, 0.5), { depth: 0.2, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3 }), COR3D.ciano, { contorno: 0.06, sombra: false });
  borda.position.set(0, 5.45, 3.5);
  const fundo = new G.Mesh(new G.ExtrudeGeometry(placa(5.7, 1.95, 0.4), { depth: 0.08, bevelEnabled: false }), toon(0xffffff));
  fundo.position.set(0, 5.45, 3.75);
  const logo = new G.Mesh(new G.PlaneGeometry(3.4, 3.4 * 252 / 481), new G.MeshBasicMaterial({ map: texLogo, transparent: true }));
  logo.position.set(0, 5.45, 3.85);
  g.add(borda, fundo, logo);
  // mastro com bandeira da Educarte
  const mastro = mastro3D(9, { image: texIcone.image });
  mastro.position.set(9.5, 0, 7);
  mastro.userData.bandeira.position.y = 8.2;
  g.add(mastro);
  g.userData.bandeira = mastro.userData.bandeira;
  // parquinho: escorregador e balanço
  const escorrega = new G.Group();
  const torreE = peca(new G.BoxGeometry(1.4, 2.4, 1.4), COR3D.amarelo, { contorno: 0.06 });
  torreE.position.y = 1.2;
  const rampa = peca(new G.BoxGeometry(1.1, 0.15, 3.8), COR3D.rosa, { contorno: 0.05 });
  rampa.position.set(0, 1.25, 2.4);
  rampa.rotation.x = 0.62;
  escorrega.add(torreE, rampa);
  escorrega.position.set(-15, 0, 8);
  escorrega.rotation.y = 0.5;
  g.add(escorrega);
  const balanco = new G.Group();
  for (const x of [-1.4, 1.4]) {
    const perna = peca(new G.CylinderGeometry(0.1, 0.1, 3.2, 8), COR3D.ciano, { contorno: 0.04 });
    perna.position.set(x, 1.6, 0);
    balanco.add(perna);
  }
  const trave = peca(new G.CylinderGeometry(0.1, 0.1, 3, 8), COR3D.ciano, { contorno: 0.04 });
  trave.rotation.z = Math.PI / 2;
  trave.position.y = 3.2;
  const assento = new G.Group();
  for (const x of [-0.4, 0.4]) {
    const corda = new G.Mesh(new G.CylinderGeometry(0.025, 0.025, 2.2, 6), toon(COR3D.tinta));
    corda.position.set(x, -1.1, 0);
    assento.add(corda);
  }
  const banco = peca(new G.BoxGeometry(1, 0.12, 0.45), COR3D.laranja, { contorno: 0.04 });
  banco.position.y = -2.2;
  assento.add(banco);
  assento.position.y = 3.2;
  balanco.add(trave, assento);
  balanco.position.set(15.5, 0, 8);
  balanco.rotation.y = -0.4;
  g.add(balanco);
  g.userData.balanco = assento;
  // caminho de pedras até a porta
  for (let i = 0; i < 7; i++) {
    const pedra = new G.Mesh(new G.CylinderGeometry(0.55, 0.6, 0.12, 14), toon(0xe8ddc8));
    pedra.position.set(Math.sin(i * 0.9) * 0.4, 0.06, 5 + i * 1.3);
    pedra.scale.z = 0.75;
    pedra.receiveShadow = true;
    g.add(pedra);
  }
  return g;
}
