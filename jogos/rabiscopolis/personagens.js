// Rabiscolândia: os moradores são CRIANÇAS de blocos com o uniforme da Educarte (antes eram amigos do estojo: o tipo
// "lapis", "giz"... continua aceito e só varia a aparência). Rosto do traço do Rabisco (olhos grandes de desenho animado,
// íris colorida, brilho, sobrancelha grossa e boca aberta), bracinhos e tênis. No coral da igreja: roupa "coral" (beca).
// Andam dando pulinhos (estica e achata), piscam, olham em volta e acenam quando o Rabisco chega perto.
//
//   const m = criarMorador("lapis", { cor: 0xe8413c });   cena.add(m.grupo);
//   m.atualizar(dt, { vel, acenar, olhar });               // vel em m/s (0 = parado)

import { THREE, matNovo, mat, malha, geoCaixaRedonda, texturaRosto, mesclar, MAT } from "./base3d.js";
import { cx } from "./blocos.js";
import { sombraBlob } from "../../src/motor3d/objetos.js";

const TINTA = 0x151515;
const IRIS = ["#00b5f0", "#58c43a", "#8e6cff", "#ff7a00", "#ec2e8c", "#2f8fe8", "#1fc08e"];

// Rosto e logo da camiseta num desenho só (uma chamada de desenho): a textura tem o rosto em cima (256×256) e a logo
// oficial da Educarte embaixo (256×128); a malha são dois retângulos, um no rosto e outro no peito.
const LOGOS = {}, texRL = new Map();
function logoImg(qual) {
  if (!LOGOS[qual]) { const i = new Image(); const L = (LOGOS[qual] = { img: i, pronto: false, espera: [] }); i.onload = () => { L.pronto = true; for (const f of L.espera) f(); L.espera = []; }; i.src = `../../assets/marca/logos/${qual}.png`; }
  return LOGOS[qual];
}
function texturaRostoLogo(iris, fechado, logo) {
  const k = `${iris}|${fechado}|${logo}`;
  if (texRL.has(k)) return texRL.get(k);
  const c = document.createElement("canvas"); c.width = 256; c.height = 384;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const ctx = c.getContext("2d");
  const pintar = () => { ctx.clearRect(0, 0, 256, 384); ctx.drawImage(texturaRosto({ iris, fechado }).image, 0, 0, 256, 256); const L = logo && logoImg(logo); if (L?.pronto) ctx.drawImage(L.img, 6, 258, 244, 124); t.needsUpdate = true; };
  pintar();
  if (logo && !logoImg(logo).pronto) logoImg(logo).espera.push(pintar);
  texRL.set(k, t);
  return t;
}
// o rosto brilha um pouquinho (emissivo) para o branco dos olhos não ficar cinza na sombra
const matRosto = (t) => matNovo({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35, transparent: true, alphaTest: 0.35 });
// rosto: [x, y, z, lado] · peito: [y, z, largura, altura] (ou null: sem logo)
function geoRostoLogo(rosto, peito) {
  const pos = [], uv = [], ind = [];
  const quad = (x, y, z, w, h, v0, v1) => { const i = pos.length / 3; pos.push(x - w / 2, y - h / 2, z, x + w / 2, y - h / 2, z, x + w / 2, y + h / 2, z, x - w / 2, y + h / 2, z); uv.push(0, v0, 1, v0, 1, v1, 0, v1); ind.push(i, i + 1, i + 2, i, i + 2, i + 3); };
  quad(rosto[0], rosto[1], rosto[2], rosto[3], rosto[3], 1 / 3, 1);
  if (peito) quad(0, peito[0], peito[1], peito[2], peito[3], 0, 1 / 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 2 ? 1 : 0)), 3)); g.setIndex(ind);
  return g;
}

// ---------- corpo: criança de blocos (frente em +z; medidas sem a escala, pés no chão em y = 0)
// Pernas até 0,5 · tronco 0,5–1,05 · cabeça 1,05–1,67 · cabelo até 1,8.
// roupa "uniforme" (regra da escola): camiseta BRANCA com a logo rosa (meninas) ou azul (meninos), ou camiseta LARANJA
// com a logo branca (para os dois); short ou calça rosa (meninas) ou azul (meninos); tênis rosa (meninas) ou azul (meninos).
// roupa "coral" (só dentro da igreja): beca azul comprida, gola branca e estola dourada.
const PELES = [0xfad7b8, 0xe9b98f, 0xc98f62, 0x9a6540, 0xf6c9a4, 0x7a4c2e];
const CABELOS = [0x2b1a12, 0x4a2f1f, 0x151515, 0x8a5a2b, 0xd9a441, 0x5a3a22];
const AZUL_UNIFORME = 0x00a3e6, ROSA_UNIFORME = 0xec2e8c, LARANJA_UNIFORME = 0xff7a00, BECA = 0x2f6fc0;
const PERNA_C = 0.5;
function corpoCrianca(c, { pele, cabelo, menina, roupa, cor, vovo, laranja, calca }) {
  const coral = roupa === "coral", doGenero = menina ? ROSA_UNIFORME : AZUL_UNIFORME;
  const blusa = coral ? BECA : laranja ? LARANJA_UNIFORME : 0xffffff, baixo = coral ? BECA : doGenero;
  cx(c, 0.56, 0.5, 0.36, blusa, 0, 0.3, 0);                  // tronco
  cx(c, 0.58, 0.14, 0.38, baixo, 0, 0.05, 0);                // quadril (short ou beca)
  if (coral) {
    cx(c, 0.66, 0.4, 0.46, BECA, 0, -0.2, 0);                // a beca desce até perto do pé
    cx(c, 0.4, 0.08, 0.38, 0xffffff, 0, 0.53, 0, { sombra: false }); // gola
    for (const s of [-1, 1]) cx(c, 0.09, 0.42, 0.02, 0xffd36b, s * 0.13, 0.3, 0.19, { sombra: false }); // estola
  }
  cx(c, 0.64, 0.62, 0.58, pele, 0, 0.86, 0);                 // cabeça
  // cabelo: topo, nuca, laterais e franja
  cx(c, 0.68, 0.14, 0.62, cabelo, 0, 1.22, 0, { sombra: false });
  cx(c, 0.68, menina ? 0.62 : 0.34, 0.08, cabelo, 0, menina ? 0.9 : 1.02, -0.3, { sombra: false });
  for (const s of [-1, 1]) cx(c, 0.06, menina ? 0.5 : 0.26, 0.44, cabelo, s * 0.33, menina ? 0.94 : 1.04, -0.06, { sombra: false });
  cx(c, 0.6, 0.08, 0.05, cabelo, 0, 1.12, 0.29, { sombra: false });
  if (menina && !vovo) for (const s of [-1, 1]) { cx(c, 0.14, 0.34, 0.14, cabelo, s * 0.4, 0.72, -0.06, { sombra: false }); cx(c, 0.16, 0.07, 0.16, cor, s * 0.4, 0.9, -0.06, { sombra: false }); } // maria-chiquinha com elástico colorido
  return { crianca: true, coral, blusa, baixo, calca: calca && !coral, tenis: doGenero, logo: coral ? null : laranja ? "branco" : menina ? "rosa" : "azul", plano: 0.302, peito: 0.185, ombro: 0.5, quadril: 0.06, rostoY: 0.82, rostoL: 0.52, larg: 0.3, alto: 1.3 };
}

// ---------- montagem do morador
// corAcessorio: cor do laço (padrão rosa) · tenis: só vale com a beca (no uniforme o tênis é rosa ou azul)
// simples: o boneco inteiro vira uma malha de cor + o rosto (sem a sombrinha redonda): para quem só fica parado esperando
// (os que pedem as missões de Natal, num lugar já cheio), custa 2 chamadas de desenho em vez de ~9; os bracinhos não acenam
export function criarMorador(tipo = "lapis", { cor = 0xe8413c, iris = null, nome = "", semente = 0, vovo = false, escala = 0.78, acessorio = null, corAcessorio = null, tenis = null, simples = false, roupa = "uniforme", menina: menina0 = null } = {}) {
  const grupo = new THREE.Group();
  grupo.scale.setScalar(escala); // um pouco menores que o Rabisco (ele é o herói)
  const raiz = new THREE.Group(); // pulinho, estica e achata
  grupo.add(raiz);
  const corpo = new THREE.Group();
  raiz.add(corpo);
  const corIris = iris ?? IRIS[semente % IRIS.length];
  // todo morador é uma criança (o tipo antigo, lápis/giz/cola..., só ajuda a variar); a semente escolhe pele e cabelo
  const menina = menina0 ?? (vovo || acessorio === "laco" || semente % 2 === 1);
  const pele = PELES[(semente * 5 + tipo.length) % PELES.length], cabelo = vovo ? 0xd9d9e0 : CABELOS[(semente * 3 + tipo.length) % CABELOS.length];
  const info = corpoCrianca(corpo, { pele, cabelo, menina, roupa, cor, vovo, laranja: semente % 3 === 0, calca: semente % 4 >= 2 });
  const texAberto = texturaRostoLogo(corIris, false, info.logo), texFechado = texturaRostoLogo(corIris, true, info.logo);
  const mRosto = matRosto(texAberto);
  const PERNA = PERNA_C; // o corpo fica em cima das perninhas
  corpo.position.y = PERNA;
  // rosto
  const L = info.rostoL ?? 0.56;
  const rosto = new THREE.Mesh(geoRostoLogo([info.rostoX ?? 0, PERNA + info.rostoY, info.plano, L], info.logo ? [PERNA + 0.36, info.peito + 0.006, 0.44, 0.22] : null), mRosto);
  rosto.renderOrder = 2;
  raiz.add(rosto);

  // Vovó Lápis: coque grisalho, óculos redondos e xale
  if (vovo) {
    const cinza = mat(0xd9d9e0);
    const coque = malha(new THREE.SphereGeometry(0.2, 16, 12), cinza); coque.position.set(0, PERNA + 1.2, -0.3); raiz.add(coque);
    const aro = mat(0x6b4a2f);
    for (const s of [-1, 1]) { const o = malha(new THREE.TorusGeometry(0.105, 0.016, 8, 24), aro); o.position.set(s * 0.115, PERNA + info.rostoY + 0.05, info.plano + 0.05); raiz.add(o); }
    const ponte = malha(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), aro); ponte.rotation.z = Math.PI / 2; ponte.position.set(0, PERNA + info.rostoY + 0.07, info.plano + 0.05); raiz.add(ponte);
    const xale = malha(new THREE.BoxGeometry(0.7, 0.22, info.peito * 2 + 0.12), mat(0xb58ad9)); xale.position.y = PERNA + 0.44; raiz.add(xale);
    const laco = malha(new THREE.SphereGeometry(0.08, 10, 8), mat(0x8e5cc9)); laco.position.set(0, PERNA + 0.4, info.peito + 0.1); raiz.add(laco);
  }

  // acessórios (vieram da Rabiscópolis): laço, óculos, gravata, chapéu de palha, boné, capacete de bombeiro, touca de chef
  if (acessorio) enfeitarMorador(raiz, acessorio, info, PERNA, corAcessorio, !simples);

  // bracinhos (pivô no ombro) e perninhas com tênis (pivô no quadril)
  const braco = (s) => {
    const p = new THREE.Group(); p.position.set(s * (info.larg + 0.04), PERNA + info.ombro, 0);
    cx(p, 0.16, info.coral ? 0.4 : 0.18, 0.16, info.blusa, 0, info.coral ? -0.18 : -0.07, 0, { sombra: false }); // manga (comprida na beca)
    if (!info.coral) cx(p, 0.12, 0.24, 0.12, pele, 0, -0.26, 0, { sombra: false });
    cx(p, 0.15, 0.13, 0.15, pele, 0, -0.43, 0, { sombra: false });
    p.rotation.z = s * 0.25;
    raiz.add(p);
    return p;
  };
  const corTenis = info.coral ? (tenis ?? 0xffffff) : info.tenis; // uniforme: tênis rosa (meninas) ou azul (meninos)
  const perna = (s) => {
    const p = new THREE.Group(); p.position.set(s * 0.14, PERNA, 0);
    cx(p, 0.22, 0.16, 0.24, info.baixo, 0, -0.08, 0, { sombra: false }); cx(p, info.calca ? 0.2 : 0.15, 0.24, info.calca ? 0.22 : 0.15, info.calca ? info.baixo : pele, 0, -0.26, 0, { sombra: false });
    cx(p, 0.22, 0.12, 0.34, corTenis, 0, -0.41, 0.05, { sombra: false }); cx(p, 0.24, 0.05, 0.36, 0xffffff, 0, -0.475, 0.05, { sombra: false });
    raiz.add(p);
    return p;
  };
  const bE = braco(1), bD = braco(-1), pE = perna(1), pD = perna(-1);
  if (simples) raiz.traverse((o) => { if (o.isMesh) o.castShadow = false; }); // tudo com a mesma sombra: uma malha só
  for (const parte of simples ? [raiz] : [corpo, bE, bD, pE, pD]) mesclar(parte); // por dentro nada mexe: vira poucas malhas
  grupo.traverse((o) => { if (o.isMesh) o.castShadow = false; }); // a sombrinha redonda basta
  const sombra = simples ? new THREE.Object3D() : sombraBlob(0.55, 0.3);
  if (!simples) grupo.add(sombra);
  grupo.userData = { tipo, nome, altura: (PERNA + info.alto) * escala };

  let fase = semente * 1.7, tempo = semente * 3.1, piscar = 2 + (semente % 3), aceno = 0, pulinho = 0, vy = 0, py = 0, juntas = false;
  const api = {
    grupo, nome, tipo, altura: (PERNA + info.alto) * escala, rostoY: PERNA + info.rostoY, rostoZ: info.plano,
    partes: { raiz, bE, bD, pE, pD }, // cenas de dança e de desfile mexem nos membros depois do atualizar
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
function enfeitarMorador(raiz, qual, info, PERNA, corA = null, juntar = true) {
  const r = info.larg, topo = PERNA + info.rostoY + (info.crianca ? 0.47 : 0.36), frente = info.plano ?? r;
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
    const gr = malha(new THREE.ConeGeometry(0.08, 0.32, 4), mat(0x1f3a8a)); gr.rotation.x = Math.PI; gr.position.set(0, PERNA + info.ombro - 0.14, (info.peito ?? frente) + 0.03); gr.scale.z = 0.35; g.add(gr);
    const no = malha(new THREE.SphereGeometry(0.05, 8, 6), mat(0x1f3a8a)); no.position.set(0, PERNA + info.ombro + 0.02, (info.peito ?? frente) + 0.03); g.add(no);
  } else if (qual === "chapeu" || qual === "bone" || qual === "capacete" || qual === "chef") {
    const cor = (qual === "capacete" && corA) || { chapeu: 0xf2d27a, bone: 0x00b5f0, capacete: 0xe63946, chef: 0xffffff }[qual]; // capacete com corA: o amarelo de obra
    const aba = malha(new THREE.CylinderGeometry(r + (qual === "chapeu" ? 0.2 : 0.06), r + (qual === "chapeu" ? 0.2 : 0.06), 0.05, 20), mat(cor));
    aba.position.y = topo; if (qual === "bone") { aba.scale.set(0.8, 1, 1.25); aba.position.z = 0.12; } g.add(aba);
    const copa = malha(new THREE.SphereGeometry(r + 0.02, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(cor));
    copa.position.y = topo; if (qual === "chef") copa.scale.set(1, 1.9, 1); g.add(copa);
    if (qual === "capacete") { const placa = malha(geoCaixaRedonda(0.2, 0.16, 0.04, 0.03), mat(corA ? 0xf07a1a : 0xffcc1f)); placa.position.set(0, topo + 0.14, r + 0.02); g.add(placa); }
  } else if (qual === "gorro") { // gorro de Natal (missões de Natal): barra branca, cone vermelho caindo para o lado e pompom
    const barra = malha(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.14, 16), mat(0xffffff)); barra.position.y = topo + 0.03; g.add(barra);
    const cone = malha(new THREE.ConeGeometry(r * 0.92, 0.6, 12), mat(0xd62839)); cone.position.set(0.07, topo + 0.36, -0.02); cone.rotation.z = -0.38; g.add(cone);
    const pom = malha(new THREE.SphereGeometry(0.1, 8, 6), mat(0xffffff)); pom.position.set(0.22, topo + 0.62, -0.02); g.add(pom);
  }
  if (juntar) mesclar(g);
}

// ---------- Vovó Lápis (para as entregas: fica esperando na porta de casa e reage quando recebe)
export const criarVovo = () => criarMorador("lapis", { cor: 0xb58ad9, iris: "#8e6cff", nome: "Vovó Lápis", semente: 3, vovo: true });
export { MAT };
void TINTA;
