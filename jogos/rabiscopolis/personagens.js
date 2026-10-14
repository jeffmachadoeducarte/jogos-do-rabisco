// Rabiscolândia: os moradores são amigos do estojo (lápis de cor, borracha, apontador, giz de cera, cola, régua,
// pincel, caderno, clipe) no mesmo traço do Rabisco: formas arredondadas, contorno preto, olhos grandes de
// desenho animado (íris colorida, brilho, sobrancelha grossa e boca aberta com língua rosa), bracinhos e tênis.
// Andam dando pulinhos (estica e achata), piscam, olham em volta e acenam quando o Rabisco chega perto.
//
//   const m = criarMorador("lapis", { cor: 0xe8413c });   cena.add(m.grupo);
//   m.atualizar(dt, { vel, acenar, olhar });               // vel em m/s (0 = parado)

import { THREE, mat, malha, comContorno, geoCaixaRedonda, texturaRosto, texturaCanvas, mesclar, MAT } from "./base3d.js";
import { borracha3D, sombraBlob } from "../../src/motor3d/objetos.js";

const PELE = 0xfce3c6, MADEIRA = 0xf3c99a, TINTA = 0x151515;
const IRIS = ["#00b5f0", "#58c43a", "#8e6cff", "#ff7a00", "#ec2e8c", "#2f8fe8", "#1fc08e"];

// perfil de lápis/tubo com fundo arredondado (LatheGeometry), raio r e altura h
function geoTubo(r, h, seg = 20, arred = 0.14) {
  const pts = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * (Math.PI / 2); pts.push(new THREE.Vector2(r - arred + Math.sin(a) * arred, arred - Math.cos(a) * arred)); }
  pts.push(new THREE.Vector2(r, h));
  pts.push(new THREE.Vector2(0.0001, h));
  return new THREE.LatheGeometry(pts, seg);
}
// rosto curvo em volta de um cilindro de raio r (centro na frente, +z), altura em metros
function rostoCurvo(r, largura, altura, material) {
  const th = largura / r;
  const geo = new THREE.CylinderGeometry(r, r, altura, 18, 1, true, -th / 2, th);
  const m = new THREE.Mesh(geo, material);
  m.renderOrder = 2;
  return m;
}
const rostoPlano = (largura, altura, material) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, altura), material); m.renderOrder = 2; return m; };
// o rosto brilha um pouquinho (emissivo) para o branco dos olhos não ficar cinza na sombra
const matRosto = (iris) => { const t = texturaRosto({ iris }); return new THREE.MeshToonMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35, transparent: true, alphaTest: 0.35 }); };

// faixa de papel do giz de cera (zigue-zague nas pontas)
const texPapelGiz = (cor) => texturaCanvas(256, 128, (c, w, h) => {
  c.fillStyle = "#fffaf0"; c.fillRect(0, 0, w, h);
  c.fillStyle = cor;
  for (const y0 of [0, h]) { c.beginPath(); c.moveTo(0, y0); for (let x = 0; x <= w; x += 16) c.lineTo(x, y0 + (y0 ? -1 : 1) * (x % 32 ? 22 : 10)); c.lineTo(w, y0); c.fill(); }
});
const texRegua = texturaCanvas(64, 512, (c, w, h) => {
  c.fillStyle = "#ffd84a"; c.fillRect(0, 0, w, h);
  c.fillStyle = "#151515";
  for (let i = 0; i < 40; i++) { const y = 8 + i * 12.4; c.fillRect(0, y, i % 5 ? 12 : 24, 2.5); }
});
const texRotuloCola = texturaCanvas(256, 96, (c, w, h) => {
  c.fillStyle = "#00b5f0"; c.fillRect(0, 0, w, h);
  c.fillStyle = "#ffcc1f"; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10);
});

// ---------- corpos (cada um devolve { corpo, ombro: y dos ombros, quadril, larg, rosto } com a frente em +z)
const CORPOS = {
  lapis(c, cor) {
    const r = 0.36, h = 0.92;
    c.add(malha(geoTubo(r, h, 12), mat(cor), { contorno: 0.05 }));
    const madeira = malha(new THREE.CylinderGeometry(0.1, r, 0.42, 12), mat(MADEIRA), { contorno: 0.05 }); madeira.position.y = h + 0.21; c.add(madeira);
    const ponta = malha(new THREE.ConeGeometry(0.1, 0.18, 12), mat(cor), { contorno: 0.04 }); ponta.position.y = h + 0.5; c.add(ponta);
    const faixa = malha(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.07, 12, 1, true), mat(0xffffff)); faixa.position.y = h - 0.08; c.add(faixa);
    return { r, ombro: 0.5, quadril: 0.06, rostoY: 0.6, larg: r, alto: h + 0.6 };
  },
  giz(c, cor) {
    const r = 0.4, h = 0.86;
    c.add(malha(geoTubo(r, h, 18), mat(cor), { contorno: 0.05 }));
    const papel = malha(new THREE.CylinderGeometry(r + 0.015, r + 0.015, 0.62, 18, 1, true), new THREE.MeshToonMaterial({ map: texPapelGiz(`#${new THREE.Color(cor).getHexString()}`) }));
    papel.position.y = 0.42; c.add(papel);
    const topo = malha(new THREE.CylinderGeometry(0.22, r, 0.26, 18), mat(cor), { contorno: 0.05 }); topo.position.y = h + 0.13; c.add(topo);
    const bolinha = malha(new THREE.SphereGeometry(0.22, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(cor), { contorno: 0.04 }); bolinha.position.y = h + 0.26; c.add(bolinha);
    return { r: r + 0.02, ombro: 0.5, quadril: 0.06, rostoY: 0.46, larg: r, alto: h + 0.45 };
  },
  cola(c) {
    const r = 0.36, h = 0.98;
    c.add(malha(geoTubo(r, h, 20, 0.16), mat(0xfdfdfd), { contorno: 0.05 }));
    const rotulo = malha(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.26, 20, 1, true), new THREE.MeshToonMaterial({ map: texRotuloCola })); rotulo.position.y = 0.2; c.add(rotulo);
    const tampa = malha(new THREE.CylinderGeometry(0.24, 0.3, 0.22, 18), mat(0xff7a00), { contorno: 0.05 }); tampa.position.y = h + 0.11; c.add(tampa);
    const bico = malha(new THREE.ConeGeometry(0.12, 0.26, 16), mat(0xff7a00), { contorno: 0.04 }); bico.position.y = h + 0.34; c.add(bico);
    return { r, ombro: 0.48, quadril: 0.07, rostoY: 0.62, larg: r, alto: h + 0.48 };
  },
  apontador(c, cor) {
    const w = 0.82, h = 0.78, d = 0.62;
    const b = malha(geoCaixaRedonda(w, h, d, 0.16), mat(cor), { contorno: 0.05 }); b.position.y = h / 2; c.add(b);
    const lamina = malha(geoCaixaRedonda(w * 0.7, 0.06, d * 0.6, 0.02), mat(0xd9e2ec), { contorno: 0.03 }); lamina.position.set(0, h + 0.02, 0); c.add(lamina);
    const parafuso = malha(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), mat(0x9aa3ad)); parafuso.position.set(0.22, h + 0.06, 0); c.add(parafuso);
    for (const s of [-1, 1]) { const furo = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), mat(0x24324a)); furo.position.set(s * (w / 2 + 0.003), h * 0.55, 0); furo.rotation.y = s * Math.PI / 2; c.add(furo); }
    return { plano: d / 2 + 0.005, ombro: 0.46, quadril: 0.06, rostoY: 0.42, larg: w / 2, alto: h + 0.1 };
  },
  regua(c) {
    const w = 0.52, h = 1.42, d = 0.16;
    const b = malha(geoCaixaRedonda(w, h, d, 0.07), mat(0xffd84a), { contorno: 0.04 }); b.position.y = h / 2; c.add(b);
    const marcas = new THREE.Mesh(new THREE.PlaneGeometry(0.13, h - 0.16), new THREE.MeshToonMaterial({ map: texRegua, transparent: true }));
    marcas.position.set(-w / 2 + 0.08, h / 2, d / 2 + 0.004); c.add(marcas);
    return { plano: d / 2 + 0.006, ombro: 0.62, quadril: 0.06, rostoY: 1.04, larg: w / 2, alto: h, rostoX: 0.06, rostoL: 0.42 };
  },
  pincel(c, cor) {
    const cabo = malha(geoTubo(0.2, 0.55, 16, 0.1), mat(0xc97a3a), { contorno: 0.04 }); c.add(cabo);
    const virola = malha(new THREE.CylinderGeometry(0.34, 0.26, 0.62, 18), mat(0xc8d0da), { contorno: 0.05 }); virola.position.y = 0.82; c.add(virola);
    const pelos = malha(new THREE.SphereGeometry(0.34, 18, 12), mat(0x6b4a2f), { contorno: 0.05 }); pelos.scale.set(1, 1.15, 1); pelos.position.y = 1.2; c.add(pelos);
    const tinta = malha(new THREE.SphereGeometry(0.24, 16, 10), mat(cor), { contorno: 0.04 }); tinta.scale.set(1, 1.2, 1); tinta.position.y = 1.44; c.add(tinta);
    return { r: 0.315, ombro: 0.62, quadril: 0.06, rostoY: 0.84, larg: 0.32, alto: 1.7 };
  },
  caderno(c, cor) {
    const w = 0.92, h = 1.08, d = 0.3;
    const capa = malha(geoCaixaRedonda(w, h, d, 0.08), mat(cor), { contorno: 0.05 }); capa.position.y = h / 2; c.add(capa);
    const folhas = malha(new THREE.BoxGeometry(w - 0.1, h - 0.1, d + 0.02), mat(0xfffdf5)); folhas.position.set(0.04, h / 2, 0); folhas.scale.z = 0.7; c.add(folhas);
    const etiqueta = malha(geoCaixaRedonda(0.5, 0.18, 0.02, 0.05), mat(0xffffff), { contorno: 0.02 }); etiqueta.position.set(0.06, h - 0.2, d / 2 + 0.01); c.add(etiqueta);
    for (let i = 0; i < 6; i++) { const a = malha(new THREE.TorusGeometry(0.07, 0.022, 6, 14), mat(0xb8c0cc)); a.rotation.y = Math.PI / 2; a.position.set(-w / 2, 0.14 + i * 0.16, 0); c.add(a); }
    return { plano: d / 2 + 0.012, ombro: 0.5, quadril: 0.06, rostoY: 0.5, larg: w / 2, alto: h, rostoX: 0.06 };
  },
  clipe(c, cor) {
    const r = 0.36, h = 0.95;
    c.add(malha(geoTubo(r, h, 20, 0.3), mat(cor), { contorno: 0.05 }));
    const topo = malha(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(cor), { contorno: 0.05 }); topo.position.y = h; c.add(topo);
    // o arame do clipe virou um topete
    const arame = new THREE.Group(); arame.position.y = h + r - 0.05;
    const curva = new THREE.CatmullRomCurve3([[0, 0, 0], [0, 0.35, 0], [0.16, 0.48, 0], [0.3, 0.35, 0], [0.3, 0.05, 0], [0.12, 0.05, 0], [0.12, 0.3, 0]].map(([x, y, z]) => new THREE.Vector3(x - 0.15, y, z)));
    arame.add(malha(new THREE.TubeGeometry(curva, 40, 0.035, 8), mat(0xc8d0da), { contorno: 0.02 }));
    c.add(arame);
    return { r, ombro: 0.5, quadril: 0.06, rostoY: 0.6, larg: r, alto: h + 0.8 };
  },
};

// ---------- montagem do morador
// corAcessorio: cor do laço (padrão rosa) · tenis: cor do tênis (padrão: pela semente)
export function criarMorador(tipo = "lapis", { cor = 0xe8413c, iris = null, nome = "", semente = 0, vovo = false, escala = 0.78, acessorio = null, corAcessorio = null, tenis = null } = {}) {
  const grupo = new THREE.Group();
  grupo.scale.setScalar(escala); // um pouco menores que o Rabisco (ele é o herói)
  const raiz = new THREE.Group(); // pulinho, estica e achata
  grupo.add(raiz);
  const corpo = new THREE.Group();
  raiz.add(corpo);
  const corIris = iris ?? IRIS[semente % IRIS.length];
  const mRosto = matRosto(corIris);
  const texAberto = mRosto.map, texFechado = texturaRosto({ iris: corIris, fechado: true });
  let info;
  if (tipo === "borracha") {
    // borracha3D (src/motor3d/objetos.js) sem as sobrancelhas bravas, os olhos e a boca dela: ganha o rosto feliz
    const b = borracha3D();
    b.scale.setScalar(1.35);
    b.userData.corpo.traverse((o) => { if (o.isMesh && (o.geometry.type === "BoxGeometry" && o.geometry.parameters.width < 0.25 || o.geometry.type === "SphereGeometry" || o.geometry.type === "TorusGeometry")) o.visible = false; });
    for (const o of b.userData.olhos) o.visible = false;
    for (const pe of b.userData.pes) pe.visible = false;
    b.position.y = -0.02;
    corpo.add(b);
    info = { plano: 0.47 * 1.35 + 0.01, rostoX: 0.05 * 1.35, ombro: 0.52, quadril: 0.1, rostoY: 0.72, larg: 0.62, alto: 1.2, rostoL: 0.62 };
  } else {
    info = (CORPOS[tipo] ?? CORPOS.lapis)(corpo, cor);
  }
  const PERNA = 0.36; // o corpo fica em cima das perninhas
  corpo.position.y = PERNA;
  // rosto
  const L = info.rostoL ?? 0.56;
  const rosto = info.plano ? rostoPlano(L, L, mRosto) : rostoCurvo(info.r + 0.012, L, L, mRosto);
  if (info.plano) rosto.position.set(info.rostoX ?? 0, PERNA + info.rostoY, info.plano);
  else rosto.position.set(0, PERNA + info.rostoY, 0);
  raiz.add(rosto);

  // Vovó Lápis: coque grisalho, óculos redondos e xale
  if (vovo) {
    const cinza = mat(0xd9d9e0);
    const coque = malha(new THREE.SphereGeometry(0.2, 16, 12), cinza, { contorno: 0.04 }); coque.position.set(0, PERNA + 1.22, -0.18); raiz.add(coque);
    const franja = malha(new THREE.SphereGeometry(0.31, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), cinza, { contorno: 0.04 }); franja.position.set(0, PERNA + 0.98, 0); franja.scale.set(1.16, 0.6, 1.16); raiz.add(franja);
    const aro = mat(0x6b4a2f);
    for (const s of [-1, 1]) { const o = malha(new THREE.TorusGeometry(0.105, 0.016, 8, 24), aro); o.position.set(s * 0.115, PERNA + info.rostoY + 0.05, info.r + 0.06); raiz.add(o); }
    const ponte = malha(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), aro); ponte.rotation.z = Math.PI / 2; ponte.position.set(0, PERNA + info.rostoY + 0.07, info.r + 0.06); raiz.add(ponte);
    const xale = malha(new THREE.CylinderGeometry(info.r + 0.08, info.r + 0.2, 0.32, 20, 1, true), mat(0xb58ad9, { side: THREE.DoubleSide }), { contorno: 0.04 }); xale.position.y = PERNA + 0.36; raiz.add(xale);
    const laco = malha(new THREE.SphereGeometry(0.08, 10, 8), mat(0x8e5cc9), { contorno: 0.02 }); laco.position.set(0, PERNA + 0.3, info.r + 0.2); raiz.add(laco);
  }

  // acessórios (vieram da Rabiscópolis): laço, óculos, gravata, chapéu de palha, boné, capacete de bombeiro, touca de chef
  if (acessorio) enfeitarMorador(raiz, acessorio, info, PERNA, corAcessorio);

  // bracinhos (pivô no ombro) e perninhas com tênis (pivô no quadril)
  const braco = (s) => {
    const p = new THREE.Group(); p.position.set(s * (info.larg + 0.04), PERNA + info.ombro, 0);
    const b = malha(new THREE.CapsuleGeometry(0.065, 0.28, 4, 10), mat(PELE), { contorno: 0, sombra: false }); b.position.y = -0.2; p.add(b);
    const mao = malha(new THREE.SphereGeometry(0.105, 14, 10), mat(PELE), { contorno: 0, sombra: false }); mao.position.y = -0.42; p.add(mao);
    p.rotation.z = s * 0.25;
    raiz.add(p);
    return p;
  };
  const corTenis = tenis ?? [0x00b5f0, 0xec2e8c, 0xff7a00, 0x58c43a, 0x8e6cff][semente % 5];
  const perna = (s) => {
    const p = new THREE.Group(); p.position.set(s * 0.15, PERNA, 0);
    const l = malha(new THREE.CapsuleGeometry(0.07, 0.18, 4, 10), mat(PELE), { contorno: 0, sombra: false }); l.position.y = -0.15; p.add(l);
    const tenis = malha(new THREE.SphereGeometry(1, 16, 10), mat(corTenis), { contorno: 0, sombra: false }); tenis.scale.set(0.13, 0.1, 0.2); tenis.position.set(0, -0.3, 0.06); p.add(tenis);
    const sola = malha(new THREE.SphereGeometry(1, 16, 8), mat(0xffffff), { sombra: false }); sola.scale.set(0.135, 0.05, 0.21); sola.position.set(0, -0.35, 0.06); p.add(sola);
    raiz.add(p);
    return p;
  };
  const bE = braco(1), bD = braco(-1), pE = perna(1), pD = perna(-1);
  for (const parte of [corpo, bE, bD, pE, pD]) mesclar(parte); // por dentro nada mexe: vira poucas malhas
  grupo.traverse((o) => { if (o.isMesh) o.castShadow = false; }); // a sombrinha redonda basta
  const sombra = sombraBlob(0.55, 0.3);
  grupo.add(sombra);
  grupo.userData = { tipo, nome, altura: (PERNA + info.alto) * escala };

  let fase = semente * 1.7, tempo = semente * 3.1, piscar = 2 + (semente % 3), aceno = 0, pulinho = 0, vy = 0, py = 0, juntas = false;
  const api = {
    grupo, nome, tipo, altura: (PERNA + info.alto) * escala,
    pular() { if (py <= 0.001) { vy = 3.4; pulinho = 1; } },
    acenar(s = 1.8) { aceno = Math.max(aceno, s); },
    // mãos juntinhas na frente do peito (orar): os dois bracinhos vêm para o meio
    orar(sim = true) { juntas = sim; },
    atualizar(dt, { vel = 0 } = {}) {
      tempo += dt;
      // piscar
      piscar -= dt;
      if (piscar <= 0) { mRosto.map = mRosto.emissiveMap = texFechado; if (piscar < -0.12) { mRosto.map = mRosto.emissiveMap = texAberto; piscar = 2.2 + Math.random() * 3; } }
      const andando = vel > 0.2;
      // pulinho de vez em quando, parado
      if (!andando && py <= 0.001 && Math.random() < dt * 0.08) api.pular();
      vy -= 14 * dt; py = Math.max(0, py + vy * dt); if (py === 0) vy = Math.max(vy, 0);
      let y = py, sy = 1;
      if (andando) {
        fase += dt * (5 + vel * 1.6);
        const s = Math.sin(fase);
        y += Math.abs(s) * 0.13;
        sy = 1 + Math.cos(fase * 2) * 0.05;
        pE.rotation.x = s * 0.75; pD.rotation.x = -s * 0.75;
        bE.rotation.x = -s * 0.8; bD.rotation.x = s * 0.8;
        raiz.rotation.x = 0.07; raiz.rotation.z = Math.sin(fase) * 0.06;
      } else {
        const k = Math.min(1, dt * 8);
        pE.rotation.x *= 1 - k; pD.rotation.x *= 1 - k; bE.rotation.x *= 1 - k; bD.rotation.x *= 1 - k;
        raiz.rotation.x *= 1 - k; raiz.rotation.z = Math.sin(tempo * 1.3) * 0.03;
        sy = 1 + Math.sin(tempo * 2.4) * 0.025; // respirando
        if (py > 0) sy = 1 + Math.min(0.12, vy * 0.03);
      }
      aceno -= dt;
      if (juntas && aceno <= 0) {
        const k = Math.min(1, dt * 8);
        bE.rotation.x += (-0.95 - bE.rotation.x) * k; bD.rotation.x += (-0.95 - bD.rotation.x) * k;
        bE.rotation.z += (-0.55 - bE.rotation.z) * k; bD.rotation.z += (0.55 - bD.rotation.z) * k;
      } else if (aceno > 0) { bD.rotation.z = -2.5 + Math.sin(tempo * 12) * 0.35; bD.rotation.x = 0; }
      else { bD.rotation.z += (-0.25 - bD.rotation.z) * Math.min(1, dt * 8); bE.rotation.z += (0.25 - bE.rotation.z) * Math.min(1, dt * 8); }
      raiz.position.y = y;
      raiz.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
      sombra.scale.setScalar(1 - Math.min(0.4, y * 0.6));
      pulinho = Math.max(0, pulinho - dt);
    },
  };
  return api;
}

// ---------- acessórios dos moradores das missões (no traço da cidade, com contorno)
function enfeitarMorador(raiz, qual, info, PERNA, corA = null) {
  const r = info.r ?? info.larg, topo = PERNA + info.rostoY + 0.36, frente = info.plano ?? r;
  const g = new THREE.Group(); raiz.add(g);
  if (qual === "laco") {
    const fita = mat(corA ?? 0xff4f9a);
    for (const s of [-1, 1]) { const a = malha(new THREE.SphereGeometry(0.11, 10, 8), fita, { contorno: 0.02 }); a.scale.set(1.3, 0.8, 0.5); a.position.set(r * 0.55 + s * 0.12, topo + 0.06, 0.1); a.rotation.z = s * 0.4; g.add(a); }
    const no = malha(new THREE.SphereGeometry(0.06, 8, 6), fita, { contorno: 0.02 }); no.position.set(r * 0.55, topo + 0.06, 0.12); g.add(no);
  } else if (qual === "oculos") {
    const aro = mat(0x3a2a1c);
    for (const s of [-1, 1]) { const o = malha(new THREE.TorusGeometry(0.1, 0.016, 8, 22), aro); o.position.set(s * 0.115, PERNA + info.rostoY + 0.05, frente + 0.05); g.add(o); }
    const ponte = malha(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), aro); ponte.rotation.z = Math.PI / 2; ponte.position.set(0, PERNA + info.rostoY + 0.07, frente + 0.05); g.add(ponte);
  } else if (qual === "gravata") {
    const gr = malha(new THREE.ConeGeometry(0.08, 0.32, 4), mat(0x1f3a8a), { contorno: 0.02 }); gr.rotation.x = Math.PI; gr.position.set(0, PERNA + info.ombro - 0.12, frente + 0.03); gr.scale.z = 0.35; g.add(gr);
    const no = malha(new THREE.SphereGeometry(0.05, 8, 6), mat(0x1f3a8a)); no.position.set(0, PERNA + info.ombro + 0.06, frente + 0.03); g.add(no);
  } else if (qual === "chapeu" || qual === "bone" || qual === "capacete" || qual === "chef") {
    const cor = { chapeu: 0xf2d27a, bone: 0x00b5f0, capacete: 0xe63946, chef: 0xffffff }[qual];
    const aba = malha(new THREE.CylinderGeometry(r + (qual === "chapeu" ? 0.2 : 0.06), r + (qual === "chapeu" ? 0.2 : 0.06), 0.05, 20), mat(cor), { contorno: 0.025 });
    aba.position.y = topo; if (qual === "bone") { aba.scale.set(0.8, 1, 1.25); aba.position.z = 0.12; } g.add(aba);
    const copa = malha(new THREE.SphereGeometry(r + 0.02, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(cor), { contorno: 0.03 });
    copa.position.y = topo; if (qual === "chef") copa.scale.set(1, 1.9, 1); g.add(copa);
    if (qual === "capacete") { const placa = malha(geoCaixaRedonda(0.2, 0.16, 0.04, 0.03), mat(0xffcc1f), { contorno: 0.015 }); placa.position.set(0, topo + 0.14, r + 0.02); g.add(placa); }
  }
  mesclar(g);
}

// ---------- Vovó Lápis (para as entregas: fica esperando na porta de casa e reage quando recebe)
export const criarVovo = () => criarMorador("lapis", { cor: 0xb58ad9, iris: "#8e6cff", nome: "Vovó Lápis", semente: 3, vovo: true });
export { MAT };
void comContorno; void TINTA;
