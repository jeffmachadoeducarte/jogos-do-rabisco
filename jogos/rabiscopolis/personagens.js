// Rabiscolândia: os moradores são amigos do estojo (lápis de cor, borracha, apontador, giz de cera, cola, régua,
// pincel, caderno, clipe) feitos de blocos: cada um continua sendo o que é, com o rosto do traço do Rabisco (olhos grandes
// de desenho animado, íris colorida, brilho, sobrancelha grossa e boca aberta com língua rosa), bracinhos e tênis.
// Andam dando pulinhos (estica e achata), piscam, olham em volta e acenam quando o Rabisco chega perto.
//
//   const m = criarMorador("lapis", { cor: 0xe8413c });   cena.add(m.grupo);
//   m.atualizar(dt, { vel, acenar, olhar });               // vel em m/s (0 = parado)

import { THREE, matNovo, mat, malha, geoCaixaRedonda, texturaRosto, texturaCanvas, mesclar, MAT } from "./base3d.js";
import { cx, degraus, escuro, claro } from "./blocos.js";
import { sombraBlob } from "../../src/motor3d/objetos.js";

const PELE = 0xfce3c6, MADEIRA = 0xf3c99a, TINTA = 0x151515;
const IRIS = ["#00b5f0", "#58c43a", "#8e6cff", "#ff7a00", "#ec2e8c", "#2f8fe8", "#1fc08e"];

const rostoPlano = (largura, altura, material) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, altura), material); m.renderOrder = 2; return m; };
// o rosto brilha um pouquinho (emissivo) para o branco dos olhos não ficar cinza na sombra
const matRosto = (iris) => { const t = texturaRosto({ iris }); return matNovo({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35, transparent: true, alphaTest: 0.35 }); };

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

// ---------- corpos (cada um devolve { plano, ombro: y dos ombros, quadril, larg, rosto } com a frente em +z)
const CORPOS = {
  lapis(c, cor) { // lápis de seção quadrada: arestas mais escuras, faixa branca, madeira em degraus e a ponta da cor dele
    const w = 0.66, h = 0.92, e = escuro(cor, 0.82);
    cx(c, w, h, w, cor, 0, h / 2, 0);
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) cx(c, 0.1, h, 0.1, e, x * (w / 2 - 0.02), h / 2, z * (w / 2 - 0.02), { sombra: false });
    cx(c, w + 0.03, 0.07, w + 0.03, 0xffffff, 0, h - 0.08, 0, { sombra: false });
    const m = malha(degraus(w, w, 0.42, 3, { fim: 0.34 }), mat(MADEIRA)); m.position.y = h + 0.21; c.add(m);
    const p = malha(degraus(0.22, 0.22, 0.2, 2), mat(cor)); p.position.y = h + 0.5; c.add(p);
    return { plano: w / 2 + 0.012, ombro: 0.5, quadril: 0.06, rostoY: 0.56, larg: w / 2, alto: h + 0.6 };
  },
  giz(c, cor) { // giz de cera: papel com zigue-zague e ponta arredondada em degraus
    const w = 0.72, h = 0.86, papel = matNovo({ map: texPapelGiz(`#${new THREE.Color(cor).getHexString()}`) });
    cx(c, w, h, w, cor, 0, h / 2, 0); cx(c, w + 0.03, 0.62, w + 0.03, 0, 0, 0.42, 0, { material: papel });
    const t = malha(degraus(w, w, 0.34, 3, { fim: 0.5 }), mat(cor)); t.position.y = h + 0.17; c.add(t);
    return { plano: w / 2 + 0.03, ombro: 0.5, quadril: 0.06, rostoY: 0.44, larg: w / 2, alto: h + 0.4 };
  },
  cola(c) { // tubo de cola: corpo branco, rótulo, tampa laranja e bico
    const w = 0.66, h = 0.98;
    cx(c, w, h, w, 0xfdfdfd, 0, h / 2, 0); cx(c, w + 0.03, 0.26, w + 0.03, 0, 0, 0.2, 0, { material: matNovo({ map: texRotuloCola }) });
    cx(c, 0.52, 0.22, 0.52, 0xff7a00, 0, h + 0.11, 0); const b = malha(degraus(0.3, 0.3, 0.28, 3, { fim: 0.3 }), mat(0xff7a00)); b.position.y = h + 0.36; c.add(b);
    return { plano: w / 2 + 0.012, ombro: 0.48, quadril: 0.07, rostoY: 0.64, larg: w / 2, alto: h + 0.5 };
  },
  apontador(c, cor) {
    const w = 0.82, h = 0.78, d = 0.62;
    cx(c, w, h, d, cor, 0, h / 2, 0); cx(c, w * 0.7, 0.06, d * 0.6, 0xd9e2ec, 0, h + 0.02, 0); cx(c, 0.12, 0.05, 0.12, 0x9aa3ad, 0.22, h + 0.07, 0, { sombra: false });
    for (const s of [-1, 1]) cx(c, 0.03, 0.3, 0.3, 0x24324a, s * (w / 2 + 0.003), h * 0.55, 0, { sombra: false });
    return { plano: d / 2 + 0.005, ombro: 0.46, quadril: 0.06, rostoY: 0.42, larg: w / 2, alto: h + 0.1 };
  },
  regua(c) {
    const w = 0.52, h = 1.42, d = 0.16;
    cx(c, w, h, d, 0xffd84a, 0, h / 2, 0);
    const marcas = new THREE.Mesh(new THREE.PlaneGeometry(0.13, h - 0.16), matNovo({ map: texRegua, transparent: true }));
    marcas.position.set(-w / 2 + 0.08, h / 2, d / 2 + 0.004); c.add(marcas);
    return { plano: d / 2 + 0.006, ombro: 0.62, quadril: 0.06, rostoY: 1.04, larg: w / 2, alto: h, rostoX: 0.06, rostoL: 0.42 };
  },
  pincel(c, cor) { // cabo de madeira, virola de metal, pelo e a tinta na ponta
    cx(c, 0.36, 0.55, 0.36, 0xc97a3a, 0, 0.275, 0);
    const v = malha(degraus(0.6, 0.6, 0.62, 3, { fim: 0.75 }), mat(0xc8d0da)); v.rotation.x = Math.PI; v.position.y = 0.82; c.add(v);
    cx(c, 0.6, 0.3, 0.6, 0x6b4a2f, 0, 1.28, 0); cx(c, 0.46, 0.2, 0.46, cor, 0, 1.52, 0); cx(c, 0.28, 0.16, 0.28, cor, 0, 1.7, 0);
    return { plano: 0.31, ombro: 0.62, quadril: 0.06, rostoY: 0.84, larg: 0.32, alto: 1.78, rostoL: 0.5 };
  },
  caderno(c, cor) {
    const w = 0.92, h = 1.08, d = 0.3;
    cx(c, w, h, d, cor, 0, h / 2, 0); cx(c, w - 0.1, h - 0.1, d + 0.02, 0xfffdf5, 0.04, h / 2, 0, { sombra: false }); cx(c, w + 0.02, h + 0.02, 0.08, cor, 0, h / 2, 0.13, { sombra: false });
    cx(c, 0.5, 0.18, 0.02, 0xffffff, 0.06, h - 0.2, d / 2 + 0.03, { sombra: false });
    for (let i = 0; i < 6; i++) cx(c, 0.12, 0.05, d + 0.1, 0xb8c0cc, -w / 2, 0.14 + i * 0.16, 0, { sombra: false });
    return { plano: d / 2 + 0.04, ombro: 0.5, quadril: 0.06, rostoY: 0.5, larg: w / 2, alto: h, rostoX: 0.06 };
  },
  clipe(c, cor) { // o corpo é um bloco colorido e o arame do clipe, em trechos retos, virou um topete
    const w = 0.66, h = 1.05, a = 0xc8d0da, e = 0.07;
    cx(c, w, h, w, cor, 0, h / 2, 0); cx(c, w - 0.2, 0.14, w - 0.2, claro(cor, 0.12), 0, h + 0.07, 0);
    for (const [ww, hh, x, y] of [[e, 0.56, -0.16, 0.28], [0.36, e, 0.02, 0.56], [e, 0.46, 0.2, 0.33], [0.24, e, 0.08, 0.1], [e, 0.3, -0.04, 0.25]]) cx(c, ww, hh, e, a, x, h + 0.1 + y, 0);
    return { plano: w / 2 + 0.012, ombro: 0.5, quadril: 0.06, rostoY: 0.6, larg: w / 2, alto: h + 0.8 };
  },
  borracha(c, cor) { // borracha: bloco rosa e a capa de papel na metade de baixo, com a ponta gasta em degrau
    const w = 1.2, d = 0.82, h = 1.0;
    cx(c, w, h, d, cor, 0, h / 2, 0); cx(c, w + 0.04, 0.54, d + 0.04, 0x00b5f0, 0, 0.27, 0); cx(c, w + 0.05, 0.08, d + 0.05, 0xffffff, 0, 0.54, 0, { sombra: false });
    cx(c, w - 0.16, 0.1, d - 0.16, claro(cor, 0.16), 0, h + 0.05, 0);
    return { plano: d / 2 + 0.012, rostoX: 0, ombro: 0.48, quadril: 0.1, rostoY: 0.72, larg: 0.6, alto: 1.15, rostoL: 0.6 };
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
  const info = (CORPOS[tipo] ?? CORPOS.lapis)(corpo, tipo === "borracha" ? 0xff9ec4 : cor);
  const PERNA = 0.36; // o corpo fica em cima das perninhas
  corpo.position.y = PERNA;
  // rosto
  const L = info.rostoL ?? 0.56;
  const rosto = rostoPlano(L, L, mRosto);
  rosto.position.set(info.rostoX ?? 0, PERNA + info.rostoY, info.plano);
  raiz.add(rosto);

  // Vovó Lápis: coque grisalho, óculos redondos e xale
  if (vovo) {
    const cinza = mat(0xd9d9e0);
    const coque = malha(new THREE.SphereGeometry(0.2, 16, 12), cinza); coque.position.set(0, PERNA + 1.22, -0.18); raiz.add(coque);
    const franja = malha(new THREE.SphereGeometry(0.31, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), cinza); franja.position.set(0, PERNA + 0.98, 0); franja.scale.set(1.16, 0.6, 1.16); raiz.add(franja);
    const aro = mat(0x6b4a2f);
    for (const s of [-1, 1]) { const o = malha(new THREE.TorusGeometry(0.105, 0.016, 8, 24), aro); o.position.set(s * 0.115, PERNA + info.rostoY + 0.05, info.plano + 0.05); raiz.add(o); }
    const ponte = malha(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), aro); ponte.rotation.z = Math.PI / 2; ponte.position.set(0, PERNA + info.rostoY + 0.07, info.plano + 0.05); raiz.add(ponte);
    const xale = malha(new THREE.BoxGeometry(info.larg * 2 + 0.14, 0.3, info.plano * 2 + 0.14), mat(0xb58ad9)); xale.position.y = PERNA + 0.36; raiz.add(xale);
    const laco = malha(new THREE.SphereGeometry(0.08, 10, 8), mat(0x8e5cc9)); laco.position.set(0, PERNA + 0.3, info.plano + 0.14); raiz.add(laco);
  }

  // acessórios (vieram da Rabiscópolis): laço, óculos, gravata, chapéu de palha, boné, capacete de bombeiro, touca de chef
  if (acessorio) enfeitarMorador(raiz, acessorio, info, PERNA, corAcessorio);

  // bracinhos (pivô no ombro) e perninhas com tênis (pivô no quadril)
  const braco = (s) => {
    const p = new THREE.Group(); p.position.set(s * (info.larg + 0.04), PERNA + info.ombro, 0);
    cx(p, 0.13, 0.3, 0.13, PELE, 0, -0.18, 0, { sombra: false }); cx(p, 0.18, 0.16, 0.18, PELE, 0, -0.41, 0, { sombra: false });
    p.rotation.z = s * 0.25;
    raiz.add(p);
    return p;
  };
  const corTenis = tenis ?? [0x00b5f0, 0xec2e8c, 0xff7a00, 0x58c43a, 0x8e6cff][semente % 5];
  const perna = (s) => {
    const p = new THREE.Group(); p.position.set(s * 0.15, PERNA, 0);
    cx(p, 0.14, 0.24, 0.14, PELE, 0, -0.13, 0, { sombra: false }); cx(p, 0.24, 0.13, 0.36, corTenis, 0, -0.29, 0.06, { sombra: false }); cx(p, 0.26, 0.05, 0.38, 0xffffff, 0, -0.35, 0.06, { sombra: false });
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

// ---------- acessórios dos moradores das missões
function enfeitarMorador(raiz, qual, info, PERNA, corA = null) {
  const r = info.larg, topo = PERNA + info.rostoY + 0.36, frente = info.plano ?? r;
  const g = new THREE.Group(); raiz.add(g);
  if (qual === "laco") {
    const fita = mat(corA ?? 0xff4f9a);
    for (const s of [-1, 1]) { const a = malha(new THREE.SphereGeometry(0.11, 10, 8), fita); a.scale.set(1.3, 0.8, 0.5); a.position.set(r * 0.55 + s * 0.12, topo + 0.06, 0.1); a.rotation.z = s * 0.4; g.add(a); }
    const no = malha(new THREE.SphereGeometry(0.06, 8, 6), fita); no.position.set(r * 0.55, topo + 0.06, 0.12); g.add(no);
  } else if (qual === "oculos") {
    const aro = mat(0x3a2a1c);
    for (const s of [-1, 1]) { const o = malha(new THREE.TorusGeometry(0.1, 0.016, 8, 22), aro); o.position.set(s * 0.115, PERNA + info.rostoY + 0.05, frente + 0.05); g.add(o); }
    const ponte = malha(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), aro); ponte.rotation.z = Math.PI / 2; ponte.position.set(0, PERNA + info.rostoY + 0.07, frente + 0.05); g.add(ponte);
  } else if (qual === "gravata") {
    const gr = malha(new THREE.ConeGeometry(0.08, 0.32, 4), mat(0x1f3a8a)); gr.rotation.x = Math.PI; gr.position.set(0, PERNA + info.ombro - 0.12, frente + 0.03); gr.scale.z = 0.35; g.add(gr);
    const no = malha(new THREE.SphereGeometry(0.05, 8, 6), mat(0x1f3a8a)); no.position.set(0, PERNA + info.ombro + 0.06, frente + 0.03); g.add(no);
  } else if (qual === "chapeu" || qual === "bone" || qual === "capacete" || qual === "chef") {
    const cor = { chapeu: 0xf2d27a, bone: 0x00b5f0, capacete: 0xe63946, chef: 0xffffff }[qual];
    const aba = malha(new THREE.CylinderGeometry(r + (qual === "chapeu" ? 0.2 : 0.06), r + (qual === "chapeu" ? 0.2 : 0.06), 0.05, 20), mat(cor));
    aba.position.y = topo; if (qual === "bone") { aba.scale.set(0.8, 1, 1.25); aba.position.z = 0.12; } g.add(aba);
    const copa = malha(new THREE.SphereGeometry(r + 0.02, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(cor));
    copa.position.y = topo; if (qual === "chef") copa.scale.set(1, 1.9, 1); g.add(copa);
    if (qual === "capacete") { const placa = malha(geoCaixaRedonda(0.2, 0.16, 0.04, 0.03), mat(0xffcc1f)); placa.position.set(0, topo + 0.14, r + 0.02); g.add(placa); }
  }
  mesclar(g);
}

// ---------- Vovó Lápis (para as entregas: fica esperando na porta de casa e reage quando recebe)
export const criarVovo = () => criarMorador("lapis", { cor: 0xb58ad9, iris: "#8e6cff", nome: "Vovó Lápis", semente: 3, vovo: true });
export { MAT };
void TINTA;
