// Rabiscolândia: duas salas maiores, com câmera e cena próprias (montadas por montarSala na primeira visita, longe da cidade):
//  - o teatro da Ballet e Cia: palco com cortina, holofotes e plateia. O minijogo é seguir os passos no tempo da música: a estrelinha
//    desliza pelo chão do palco e, quando chega no círculo, o botão faz o Rabisco dar o passo junto com as alunas. Sem errar de verdade
//    (a música continua e o passo volta na próxima). Depois vem a apresentação: cortina, holofotes e coreografia com a turma.
//  - o salão da BT Models: desfile de fantasias dos amigos do estojo. A criança estica o tapete, liga os refletores e pendura as
//    bandeirinhas; depois, na mesa do apresentador, chama cada amigo quando a luz do portal fica verde, e por último entra o Rabisco.
// Alunas e participantes são personagens de faz de conta (personagens.js). A Prof. Samira (pessoas.js) não fala: a anfitriã narra.
// O botão é o mesmo de sempre (toque, teclado ou controle), pela trava com aoAcao de jogo.js.
//
//   montarTeatro({ id, def, ox, oz }) / montarSalao({ id, def, ox, oz }) → { id, nome, grupo, solidos, entrada, porta, interativos, npcs, est, vista(p), atualizar(dt, t) }

import { THREE, mat, malha, texturaCanvas, mesclar, MAT } from "./base3d.js";
import { cx as pc, claro } from "./blocos.js";
import { criarMorador } from "./personagens.js";
import { criarPessoa } from "./pessoas.js";
import { letreiro } from "./predios-parceiros.js";
import { criarSequencia, VALSA, VALSA_SHOW, DESFILE } from "./musica-cenas.js";

const NARRA = "Rabiscolândia";
const F = { sombra: false };
const liso = (k) => { const q = Math.max(0, Math.min(1, k)); return q * q * (3 - 2 * q); };
const faixa = (t, a, b) => liso((t - a) / (b - a));
const MAT_LUZ = (cor, op = 0.16) => new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

// paredes, chão e colisão da sala: frente aberta na porta, sem teto (a câmera olha de cima, como nas outras salas)
function salaBase({ ox, oz, W, D, A, piso, parede }) {
  const g = new THREE.Group(); g.position.set(ox, 0, oz);
  const fixo = new THREE.Group(); g.add(fixo);
  const din = new THREE.Group(); din.userData.dinamico = true; g.add(din);
  const solidosL = [], inter = [];
  const grama = malha(new THREE.PlaneGeometry(60, 50), mat(0x59b64c), F); grama.rotation.x = -Math.PI / 2; grama.position.y = -0.02; fixo.add(grama);
  pc(fixo, W, 0.06, D, piso, 0, 0.0, 0, F);
  const P = (x, z, w, d, h = A, c = parede) => { pc(fixo, w, h, d, c, x, h / 2, z); solidosL.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y1: h }); };
  P(0, -D / 2, W, 0.3); P(-W / 2, 0, 0.3, D); P(W / 2, 0, 0.3, D);
  for (const q of [-1, 1]) P(q * (W / 4 + 0.7), D / 2, W / 2 - 1.4, 0.3, 0.7, 0xffffff);
  pc(fixo, 2.4, 0.03, 1, 0xffcc1f, 0, 0.05, D / 2 - 0.8, F);
  const solido = (x, z, w, d, h = 1.2) => solidosL.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y1: h });
  const I = (id, rotulo, x, z, fazer, raio = 1.5) => inter.push({ id, rotulo, local: [x, z], pos: [ox + x, oz + z], raio, fazer });
  const fechar = () => solidosL.map((s) => ({ x0: s.x0 + ox, x1: s.x1 + ox, z0: s.z0 + oz, z1: s.z1 + oz, y1: s.y1 }));
  return { g, fixo, din, solido, I, inter, fechar, entrada: [ox, oz + D / 2 - 1.8], porta: [ox, oz + D / 2 - 0.6] };
}
// marca no chão com a figurinha em cima: anéis e figurinhas somem quando a parte foi feita
const texFigura = new Map();
function figura(emoji) {
  if (!texFigura.has(emoji)) texFigura.set(emoji, texturaCanvas(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.fillStyle = "#ffffff"; c.beginPath(); c.arc(64, 64, 56, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = "#151515"; c.stroke();
    c.font = "70px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(emoji, 64, 70);
  }));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFigura.get(emoji) })); s.scale.setScalar(0.85);
  return s;
}
function marca(din, x, z, emoji, y = 0.08) {
  const m = new THREE.Group(); m.position.set(x, y, z); din.add(m);
  const a = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.92, 28), new THREE.MeshBasicMaterial({ color: 0xffcc1f, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })); a.rotation.x = -Math.PI / 2; m.add(a);
  const s = figura(emoji); s.position.y = 1.6; m.add(s);
  m.userData.anima = (t) => { a.scale.setScalar(1 + Math.sin(t * 4) * 0.07); s.position.y = 1.6 + Math.sin(t * 3) * 0.1; };
  return m;
}
// holofote: cone de luz (só um brilho, sem luz de verdade: não custa nada para os outros) e a poça no chão
function holofote(din, x, y, z, cor = 0xfff0c8, abre = 1.5) {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(abre, 1, 18, 1, true).translate(0, -0.5, 0), MAT_LUZ(cor, 0.09)); cone.position.set(x, y, z); cone.frustumCulled = false; din.add(cone);
  const poca = new THREE.Mesh(new THREE.CircleGeometry(abre, 24), MAT_LUZ(cor, 0.2)); poca.rotation.x = -Math.PI / 2; poca.frustumCulled = false; din.add(poca);
  const lampada = malha(new THREE.BoxGeometry(0.5, 0.5, 0.6), mat(0x17181c), F); lampada.position.set(x, y + 0.2, z); din.add(lampada);
  const baixo = new THREE.Vector3(0, -1, 0), d = new THREE.Vector3();
  return { cone, poca, apontar(tx, ty, tz) { d.set(tx - x, ty - y, tz - z); const l = d.length(); cone.scale.set(1, l, 1); cone.quaternion.setFromUnitVectors(baixo, d.normalize()); poca.position.set(tx, ty + 0.02, tz); }, ligar(sim) { cone.visible = poca.visible = sim; } };
}

// ---- como cada personagem dança (membros, nunca o boneco inteiro balançando; k = 0..1 é a força do passo)
function poseAluna(m, nome, k) {
  const { bE, bD, pE, pD, raiz } = m.partes;
  pE.rotation.z = pD.rotation.z = 0;
  if (nome === "plie") { raiz.position.y -= 0.1 * k; pE.rotation.z = 0.38 * k; pD.rotation.z = -0.38 * k; bE.rotation.z = 0.25 + 0.9 * k; bD.rotation.z = -0.25 - 0.9 * k; }
  else if (nome === "bracos" || nome === "giro") { bE.rotation.z = 0.25 + 2.5 * k; bD.rotation.z = -0.25 - 2.5 * k; raiz.position.y += 0.08 * k; }
  else if (nome === "arabE") { pD.rotation.x = -1.15 * k; bE.rotation.z = 0.25 + 2.5 * k; bD.rotation.z = -0.25 - 1.2 * k; raiz.rotation.x = 0.16 * k; }
  else if (nome === "arabD") { pE.rotation.x = -1.15 * k; bD.rotation.z = -0.25 - 2.5 * k; bE.rotation.z = 0.25 + 1.2 * k; raiz.rotation.x = 0.16 * k; }
  else if (nome === "salto") { pE.rotation.x = 0.8 * k; pD.rotation.x = -0.8 * k; bE.rotation.z = 0.25 + 2.3 * k; bD.rotation.z = -0.25 - 2.3 * k; }
  else if (nome === "reverencia") { raiz.rotation.x = 0.55 * k; bE.rotation.z = 0.25 + 0.5 * k; bD.rotation.z = -0.25 - 0.5 * k; raiz.position.y -= 0.05 * k; }
}
function poseRabisco(rb, nome, k) {
  const q = (b, x, z) => { b.ombro.rotation.set(x, 0, z); };
  const per = (p, qx, qz, j) => { p.quadril.rotation.set(qx, 0, qz); p.joelho.rotation.x = j; };
  rb.tronco.rotation.x = 0; rb.pernaE.quadril.rotation.z = rb.pernaD.quadril.rotation.z = 0;
  if (!k || nome === "nada") return;
  if (nome === "plie") { per(rb.pernaE, -0.55 * k, 0.28 * k, 1.05 * k); per(rb.pernaD, -0.55 * k, -0.28 * k, 1.05 * k); q(rb.bracoE, 0, 0.3 + 1.0 * k); q(rb.bracoD, 0, -0.3 - 1.0 * k); rb.grupo.position.y -= 0.17 * k; }
  else if (nome === "bracos" || nome === "giro") { q(rb.bracoE, 0, 0.17 + 2.75 * k); q(rb.bracoD, 0, -0.17 - 2.75 * k); rb.bracoE.cotovelo.rotation.x = -0.3 * k; rb.bracoD.cotovelo.rotation.x = -0.3 * k; }
  else if (nome === "arabE") { per(rb.pernaD, 0.95 * k, 0, 0.3 * k); q(rb.bracoE, 0, 0.17 + 2.7 * k); q(rb.bracoD, 0, -0.17 - 1.25 * k); rb.tronco.rotation.x = 0.12 * k; }
  else if (nome === "arabD") { per(rb.pernaE, 0.95 * k, 0, 0.3 * k); q(rb.bracoD, 0, -0.17 - 2.7 * k); q(rb.bracoE, 0, 0.17 + 1.25 * k); rb.tronco.rotation.x = 0.12 * k; }
  else if (nome === "salto") { per(rb.pernaE, -0.8 * k, 0, 0.5 * k); per(rb.pernaD, 0.7 * k, 0, 0.5 * k); q(rb.bracoE, 0, 0.17 + 2.5 * k); q(rb.bracoD, 0, -0.17 - 2.5 * k); }
  else if (nome === "reverencia") { rb.tronco.rotation.x = 0.55 * k; q(rb.bracoE, 0.2 * k, 0.17 + 0.4 * k); q(rb.bracoD, 0.2 * k, -0.17 - 0.4 * k); }
}

// ==================================================================== teatro da Ballet e Cia
function criarAluna(cor, i) {
  const m = criarMorador("lapis", { cor, semente: i + 2, acessorio: "laco", corAcessorio: 0xffffff, tenis: 0xffd3e2, iris: "#8e6cff", escala: 0.74 });
  // saia de tule: três discos abertos na cintura, presos no corpo
  const saia = new THREE.Group(); saia.position.y = 0.46; m.partes.raiz.add(saia);
  for (const [r, y, c] of [[0.72, 0, claro(cor, 0.5)], [0.62, 0.07, claro(cor, 0.3)], [0.52, 0.14, cor]]) { const d = malha(new THREE.CylinderGeometry(r, r, 0.05, 14), mat(c), F); d.position.y = y; saia.add(d); }
  mesclar(saia);
  return m;
}
const QUE_PASSO = ["plie", "bracos", "plie", "bracos", "arabE", "arabD", "giro", "bracos"];
const META = 8;
export function montarTeatro({ id, def, ox, oz }) {
  const W = 24, D = 20, A = 8;
  const S = salaBase({ ox, oz, W, D, A, piso: 0x7a4a2a, parede: 0x3a1636 });
  const { g, fixo, din, solido, I } = S;
  const VN = 0x7d1f4f, RS = 0xa82a60, OU = 0xe5bd5a, PALCO = 0.9, ZF = -1.6, ZC = -2.5; // altura do palco, frente dele e linha da cortina
  // ---- palco: tablado, beira dourada, luzes de ribalta e degraus
  pc(fixo, W - 0.3, PALCO, D / 2 + ZF + 0.6, 0x8a5a2c, 0, PALCO / 2, (-D / 2 + ZF) / 2 + 0.15);
  for (let i = -10; i <= 10; i += 2) pc(fixo, 0.06, 0.02, D / 2 + ZF, 0x5f3c1c, i, PALCO + 0.01, (-D / 2 + ZF) / 2, F);
  pc(fixo, W - 0.3, 0.14, 0.24, OU, 0, PALCO, ZF + 0.02, F);
  pc(fixo, W - 0.3, PALCO - 0.14, 0.1, VN, 0, (PALCO - 0.14) / 2, ZF + 0.04, F);
  for (let x = -8; x <= 8; x += 2) { pc(fixo, 0.5, 0.12, 0.16, 0, x, PALCO + 0.1, ZF - 0.12, { ...F, material: MAT.lampada }); }
  solido(0, (-D / 2 + ZF) / 2, W, D / 2 + ZF + 0.8, 3);
  // ---- fundo pintado: céu de amanhecer, montanhas e estrelas (lá no fundo do palco)
  const fundoT = texturaCanvas(1024, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#2b2a6f"); gr.addColorStop(0.55, "#b65a9b"); gr.addColorStop(0.85, "#ffc58a"); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = "#fff7da"; for (let i = 0; i < 46; i++) { const x = (i * 197) % w, y = (i * 71) % (h * 0.55), r = 1.6 + (i % 4); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    c.fillStyle = "#fff0c0"; c.beginPath(); c.arc(w * 0.5, h * 0.74, 66, 0, 7); c.fill();
    c.fillStyle = "#6a3b86"; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 64) c.lineTo(x, h * (0.76 + 0.09 * Math.sin(x / 90))); c.lineTo(w, h); c.fill();
    c.fillStyle = "#3d2460"; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 64) c.lineTo(x, h * (0.88 + 0.05 * Math.sin(x / 60 + 2))); c.lineTo(w, h); c.fill();
  });
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, A - PALCO), new THREE.MeshBasicMaterial({ map: fundoT })); fundo.position.set(0, PALCO + (A - PALCO) / 2, -D / 2 + 0.2); fixo.add(fundo);
  // ---- boca de cena: moldura dourada dos lados e em cima, pano fixo por cima e coxias
  const BW = 9.2, BT = 6.3; // meia largura e altura de cima da boca
  for (const q of [-1, 1]) { pc(fixo, W / 2 - BW + 0.6, A, 0.4, 0x3a1636, q * (BW + (W / 2 - BW) / 2), A / 2, ZC); pc(fixo, 0.5, BT, 0.5, OU, q * BW, BT / 2, ZC + 0.05); }
  pc(fixo, W, A - BT, 0.4, 0x3a1636, 0, (A + BT) / 2, ZC); pc(fixo, BW * 2 + 0.5, 0.5, 0.5, OU, 0, BT, ZC + 0.05);
  // bandô franzido, com franja dourada
  const FAIXAS = 26;
  for (let i = 0; i < FAIXAS; i++) { const x = -BW + (2 * BW * (i + 0.5)) / FAIXAS, h = 0.9 + (i % 2) * 0.16; pc(fixo, (2 * BW) / FAIXAS + 0.02, h, 0.22, i % 2 ? VN : RS, x, BT - h / 2 - 0.2, ZC - 0.1, F); pc(fixo, (2 * BW) / FAIXAS + 0.02, 0.1, 0.24, OU, x, BT - h - 0.2, ZC - 0.1, F); }
  // nome da casa em cima da boca (a arte inventada do letreiro da parceira)
  letreiro(fixo, "ballet-e-cia", { w: 5.4, h: 1, y: BT + 0.9, z: ZC + 0.2, cor: OU });
  // ---- plateia de faz de conta, um bloco de cada lado do corredor
  const CORES = [0xe8413c, 0x00b5f0, 0xffcc1f, 0x58c43a, 0x8e6cff, 0xff7a00, 0xec2e8c, 0x1fc08e];
  for (const q of [-1, 1]) for (let f = 0; f < 3; f++) for (let c = 0; c < 6; c++) {
    const x = q * (2.2 + c * 1.45), z = 1.8 + f * 1.9, cor = CORES[(c * 3 + f * 5 + (q > 0 ? 2 : 0)) % CORES.length];
    pc(fixo, 1.2, 0.5, 1.0, 0x5e1f4c, x, 0.3, z, F); pc(fixo, 1.2, 1.05, 0.2, VN, x, 0.6, z + 0.5, F); // poltrona
    if ((c + f) % 5 !== 3) { pc(fixo, 0.6, 0.72, 0.5, cor, x, 0.82, z + 0.05, F); pc(fixo, 0.6, 0.2, 0.5, 0xf3c99a, x, 1.28, z + 0.05, F); pc(fixo, 0.26, 0.16, 0.24, cor, x, 1.46, z + 0.05, F); }
  }
  for (const q of [-1, 1]) solido(q * 5.8, 3.7, 9.2, 6.2);
  // tapete do corredor até o palco
  pc(fixo, 2.6, 0.03, D / 2 - ZF - 0.4, RS, 0, 0.05, (D / 2 + ZF) / 2 - 0.1, F);
  mesclar(fixo);

  // ---- cortina: dois panos que abrem para os lados (só muda a largura), e as peças que mexem
  const pano = (s) => { const p = new THREE.Group(); p.position.set(s * BW, 0, ZC - 0.32); din.add(p); const n = 16, L = BW / n; for (let i = 0; i < n; i++) pc(p, L + 0.02, BT - PALCO - 0.4, 0.18 + (i % 2) * 0.1, i % 2 ? VN : RS, -s * L * (i + 0.5), PALCO + (BT - PALCO - 0.4) / 2, 0, F); mesclar(p); return p; };
  const panos = [pano(-1), pano(1)];
  let abertura = 1, abrirPara = 1;
  const aplicarCortina = (a) => { for (const p of panos) p.scale.x = 1 - a * 0.9; };
  aplicarCortina(1);
  const spots = [[-7, 0xfff0c8], [-2.4, 0xffb7d8], [2.4, 0xbfe6ff], [7, 0xfff0c8]].map(([x, c]) => holofote(din, x, 6.0, ZC + 0.2, c, 1.35));
  for (const s of spots) s.ligar(false);
  // estrelinha que vem pelo chão e círculo aos pés do Rabisco (só aparecem no ensaio)
  const texEstrela = texturaCanvas(128, 128, (c) => { c.font = "104px 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("⭐", 64, 70); });
  const estrelas = [0, 1, 2].map(() => { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEstrela, transparent: true, depthWrite: false })); e.scale.setScalar(1.0); e.visible = false; din.add(e); return e; });
  const LUGAR = { x: 0, z: -3.9 }, YP = PALCO + 0.02;
  const circulo = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.78, 32), new THREE.MeshBasicMaterial({ color: 0xffe680, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })); circulo.rotation.x = -Math.PI / 2; circulo.position.set(LUGAR.x, YP + 0.04, LUGAR.z + 0.95); circulo.visible = false; din.add(circulo);
  const trilha = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.22), new THREE.MeshBasicMaterial({ color: 0xffe680, transparent: true, opacity: 0.25, depthWrite: false })); trilha.rotation.x = -Math.PI / 2; trilha.position.set(0, YP + 0.03, LUGAR.z + 0.95); trilha.visible = false; din.add(trilha);
  // quantos passos já foram: uma fila de estrelas no pano (canvas só redesenhado a cada acerto)
  const cvMeta = texturaCanvas(512, 72, () => {});
  const desenharMeta = (n) => { const c = cvMeta.image.getContext("2d"); c.clearRect(0, 0, 512, 72); c.font = "50px 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; for (let i = 0; i < META; i++) { c.globalAlpha = i < n ? 1 : 0.22; c.fillText("⭐", 32 + i * 64, 38); } c.globalAlpha = 1; cvMeta.needsUpdate = true; };
  const placarE = new THREE.Sprite(new THREE.SpriteMaterial({ map: cvMeta, transparent: true, depthWrite: false })); placarE.scale.set(6, 0.84, 1); placarE.position.set(0, 4.5, ZC - 0.5); placarE.visible = false; din.add(placarE);
  // ---- quem está no palco
  const alunas = [0xff9ec0, 0xc4a2ee, 0xffc48a, 0x9ee59a].map(criarAluna); // duas de cada lado: nenhuma fica escondida atrás do Rabisco
  const V = [[-3.6, -5.1], [-1.8, -6.1], [1.8, -6.1], [3.6, -5.1]];
  alunas.forEach((m, i) => { m.grupo.position.set(V[i][0], PALCO, V[i][1]); din.add(m.grupo); });
  const samira = criarPessoa("samira"); samira.grupo.position.set(-7.6, 0.03, ZF + 0.9); samira.grupo.rotation.y = 0.9; din.add(samira.grupo);
  const npcs = [samira];
  const est = { dancou: 0, ritmo: null, aoEntrar: () => { samira.calma(); samira.acenar(2.4); } };
  // ---- marca para subir no palco
  const mk = marca(din, 0, ZF + 1.4, "⭐");

  const CAM_LIVRE = (p) => ({ pos: [ox + (p.x - ox) * 0.55, 6.6, Math.min(oz + D / 2 + 3.8, p.z + 10.5)], alvo: [ox + (p.x - ox) * 0.55, 2.2, p.z - 3.2] });
  const CAM_PALCO = { pos: [ox, 3.3, oz + 3.2], alvo: [ox, 2.2, oz - 5] };
  let vista = null, api = null, seq = null;
  // ------------- ensaio: minijogo de passos
  const rit = { apertos: 0, fase: "fora", passo: 0, proxBatida: 0, ultimoPasso: null, ultimoK: 0, acertos: 0, voltas: 0, tBrilho: 0, feitoNaJanela: false, giro: 0 };
  const CONTA = 6, CADA = 3, ANDA = 2; // duas batidas de "vem aí" e o passo a cada compasso
  function passoNo(n) { return QUE_PASSO[n % QUE_PASSO.length]; }
  const batidaDoPasso = (n) => CONTA + n * CADA;
  function comecar(a) {
    if (rit.fase !== "fora") return;
    api = a; rit.fase = "ensaio"; rit.passo = 0; rit.acertos = 0; rit.feitoNaJanela = false; rit.ultimoPasso = null; rit.ultimoK = 0; rit.giro = 0;
    mk.visible = false;
    est.dancou = 0; desenharMeta(0);
    vista = CAM_PALCO;
    abrirPara = 1; abertura = 1; aplicarCortina(1);
    for (const m of alunas) m.grupo.rotation.y = 0;
    alunas.forEach((m, i) => m.grupo.position.set(V[i][0], PALCO, V[i][1]));
    circulo.visible = trilha.visible = placarE.visible = true;
    spots[1].ligar(true); spots[2].ligar(true);
    spots[1].apontar(LUGAR.x, YP, LUGAR.z); spots[2].apontar(LUGAR.x, YP, LUGAR.z - 1.3);
    samira.acenar(2);
    api.dizer(NARRA, "Olhe as estrelinhas! Quando a estrelinha chegar no círculo, aperte o botão e dance no tempo da música, igual às alunas.", 6200);
    api.falar("rp-ballet-passos");
    seq = criarSequencia(VALSA); seq.iniciar(0.6);
    api.travar({ x: ox + LUGAR.x, z: oz + LUGAR.z, dir: 0, modo: "parado", segundos: 1e6, rotulo: "🩰 Passo!", aoAcao: apertou, posar: posarRabisco });
    est.ritmo = { get janela() { return rit.fase === "ensaio" && !rit.feitoNaJanela && Math.abs(seq.batida() - batidaDoPasso(rit.passo)) * seq.seg < 0.3; }, get apertos() { return rit.apertos; }, get acertos() { return rit.acertos; }, get fase() { return rit.fase; }, get t() { return rit.tFase ?? 0; }, get longe() { return Math.abs(seq.batida() - batidaDoPasso(rit.passo)) * seq.seg > 0.6; } };
  }
  const JANELA_S = 0.34;
  function apertou() {
    if (rit.fase !== "ensaio") return;
    rit.apertos++;
    const dif = (seq.batida() - batidaDoPasso(rit.passo)) * seq.seg;
    if (Math.abs(dif) > JANELA_S || rit.feitoNaJanela) return; // fora do tempo: nada acontece (ninguém perde), a próxima estrela já vem
    rit.feitoNaJanela = true; rit.acertos++;
    rit.ultimoPasso = passoNo(rit.passo); rit.tPasso = 0; rit.giro = rit.ultimoPasso === "giro" ? 1 : 0;
    desenharMeta(rit.acertos); api.sons.nota?.(rit.acertos - 1); rit.tBrilho = 0.35;
    if (rit.acertos % 3 === 0) samira.acenar(1);
    est.dancou = rit.acertos;
  }
  function terminarEnsaio() {
    rit.fase = "fecha"; rit.tFase = 0;
    circulo.visible = trilha.visible = false; for (const e of estrelas) e.visible = false;
    placarE.visible = false;
    api.sons.vitoria?.(); samira.comemorar(2);
    api.dizer(NARRA, "Muito bem! A cortina vai abrir de novo. É hora da apresentação!", 3800); api.falar("rp-ballet-show");
    seq.parar(1.6);
    abrirPara = 0;
  }
  function comecarShow() {
    rit.fase = "show"; rit.tFase = 0;
    for (const s of spots) s.ligar(true);
    seq = criarSequencia(VALSA_SHOW); seq.iniciar(0.2);
    abrirPara = 1;
    vista = { pos: [ox, 3.9, oz + 5.2], alvo: [ox, 2.4, oz - 5] };
    alunas.forEach((m, i) => m.grupo.position.set(V[i][0], PALCO, V[i][1]));
  }
  function terminarShow() {
    rit.fase = "fora"; seq.parar(0.8); seq = null;
    for (const s of spots) s.ligar(false);
    for (const m of alunas) { m.acenar(2.4); m.grupo.rotation.y = 0; }
    vista = null; abrirPara = 1;
    alunas.forEach((m, i) => m.grupo.position.set(V[i][0], PALCO, V[i][1]));
    mk.visible = true; est.ritmo = null;
    api.confete?.(); api.sons.vitoria?.(); samira.comemorar(3);
    poseRabisco(api.rabisco, "nada", 0);
    api.destravar(); api.rabisco.grupo.position.y = 0.07;
    // desce para a frente do palco, de costas para o corredor
    const dx = ox, dz = oz + ZF + 1.4; api.teleportar?.(dx, dz);
    api.dizer(NARRA, "Bravo! Que apresentação linda! A plateia inteira aplaudiu.", 4200); api.falar("rp-ballet-bravo");
    est.terminou = (est.terminou ?? 0) + 1;
    api.evento?.("dancou");
  }
  // onde cada aluna está na coreografia (s = segundos de apresentação)
  const CIRC = (i, s) => { const a = (i / alunas.length) * Math.PI * 2 + s * 0.7; return [Math.sin(a) * 3.6, -6.2 + Math.cos(a) * 1.3]; }; // sempre atrás do Rabisco
  const LINHA = (i) => [-4.5 + i * 3, -6.2];
  const FINAL = [[-4.4, -4.7], [-2.2, -5.5], [2.2, -5.5], [4.4, -4.7]];
  const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  function coreografia(s, dt) {
    for (const [i, m] of alunas.entries()) {
      let p = V[i], passo = "bracos", y = 0;
      const b = seq.batida(), c = Math.floor(b / 3), k = Math.pow(Math.sin(((b % 3) / 3) * Math.PI), 0.7);
      passo = ["plie", "bracos", "arabE", "arabD"][c % 4];
      if (s > 8) p = lerp2(V[i], CIRC(i, s), faixa(s, 8, 9.2));
      if (s > 15) p = lerp2(CIRC(i, s), LINHA(i), faixa(s, 15, 16));
      if (s > 16) { p = LINHA(i); passo = "salto"; const q = ((s - 16) * 1.4 + i * 0.2) % 1; y = Math.sin(q * Math.PI) * 0.8; }
      if (s > 19.5) { p = lerp2(LINHA(i), FINAL[i], faixa(s, 19.5, 20.5)); y = 0; passo = "bracos"; }
      if (s > 23) passo = "reverencia";
      const antes = [m.grupo.position.x, m.grupo.position.z], vai = Math.hypot(p[0] - antes[0], p[1] - antes[1]);
      m.grupo.position.set(p[0], PALCO + y, p[1]);
      m.atualizar(dt, { vel: vai > 0.03 && s < 19.5 && s > 8 ? 3 : 0 });
      const forca = s > 23 ? faixa(s, 23, 23.6) : s > 19.5 ? 1 : passo === "salto" ? 1 : k;
      poseAluna(m, passo, forca);
      m.grupo.rotation.y = s > 8.5 && s < 15 ? ((i / alunas.length) * Math.PI * 2 + s * 0.7 + Math.PI / 2) : s > 15 && passo === "bracos" && s < 19.5 ? s * 6 : 0;
    }
    for (const [i, h] of spots.entries()) {
      const fase = s * (0.5 + i * 0.09) + i * 1.3;
      const alvo = s > 19.5 ? [[-3.2, -5], [-0.6, -3.9], [0.6, -3.9], [3.2, -5]][i] : [Math.sin(fase) * 6, -5.2 + Math.cos(fase * 1.2) * 1.6];
      h.apontar(alvo[0], YP, alvo[1]);
    }
  }
  // o Rabisco no meio de tudo, dançando pelo que a música manda (no ensaio, só quando o botão acerta)
  function posarRabisco(rb, dt, tr) {
    rb.grupo.position.y = PALCO;
    if (rit.fase !== "ensaio") tr.aoAcao = null; // na apresentação o botão some: é só assistir e dançar
    if (rit.fase === "ensaio") {
      rit.tPasso = (rit.tPasso ?? 9) + dt;
      if (rit.ultimoPasso) {
        const k = Math.sin(Math.min(1, rit.tPasso / 1.35) * Math.PI);
        poseRabisco(rb, rit.ultimoPasso, k);
        if (rit.giro) rb.grupo.rotation.y = tr.dir + Math.PI * 2 * liso(Math.min(1, rit.tPasso / 1.0));
        if (rit.tPasso > 1.4) { rit.ultimoPasso = null; rit.giro = 0; }
      }
    } else if (rit.fase === "show") {
      const s = rit.tFase, b = seq.batida(), c = Math.floor(b / 3), k = Math.pow(Math.sin(((b % 3) / 3) * Math.PI), 0.7);
      if (s > 23) poseRabisco(rb, "reverencia", faixa(s, 23, 23.6));
      else if (s > 19.5) poseRabisco(rb, "bracos", 1);
      else if (s > 16) { const q = ((s - 16) * 1.4) % 1; rb.grupo.position.y = PALCO + Math.sin(q * Math.PI) * 0.8; poseRabisco(rb, "salto", 1); }
      else if (s > 8.5) { poseRabisco(rb, "giro", 1); rb.grupo.rotation.y = tr.dir + s * 2.4; }
      else poseRabisco(rb, ["plie", "bracos", "arabE", "arabD"][c % 4], k);
    }
  }
  I("dancar", "🩰 Subir no palco", 0, ZF + 1.4, (a) => comecar(a), 1.5);

  const animaMarca = mk.userData.anima;
  return {
    id, nome: def.nome, profissao: null, grupo: g, solidos: S.fechar(), interativos: S.inter, npcs, est,
    entrada: S.entrada, porta: S.porta,
    vista: (p) => vista ?? CAM_LIVRE(p),
    atualizar(dt, t) {
      for (const n of npcs) n.atualizar(dt, { modo: "parado" });
      est.sonda?.(); // testes: aperta o botão de dentro do quadro (no Chrome sem placa de vídeo os quadros são lentos)
      if (mk.visible) animaMarca(t);
      abertura += Math.sign(abrirPara - abertura) * Math.min(Math.abs(abrirPara - abertura), dt * 0.7);
      aplicarCortina(abertura);
      seq?.atualizar();
      if (rit.fase === "show") {
        rit.tFase += dt;
        if (rit.tFase > 23) abrirPara = rit.tFase > 25.5 ? 0 : 1;
        coreografia(rit.tFase, dt);
        if (rit.tFase > 27) terminarShow();
        return;
      }
      if (rit.fase === "fecha") {
        rit.tFase += dt;
        for (const m of alunas) m.atualizar(dt, { vel: 0 });
        if (rit.tFase > 2.8) comecarShow();
        return;
      }
      if (rit.fase !== "ensaio") { for (const m of alunas) { m.atualizar(dt, { vel: 0 }); poseAluna(m, "nada", 0); } return; }
      // ---- ensaio: as alunas dançam cada passo no tempo, mostrando como é
      const b = seq.batida(), nAgora = (b - CONTA) / CADA;
      const nA = Math.floor(nAgora + 0.5), passoAl = passoNo(Math.max(0, nA)), kA = b < CONTA - 0.4 ? 0 : Math.pow(Math.max(0, 1 - Math.abs(nAgora - nA) * 2.2), 0.8);
      alunas.forEach((m) => { m.atualizar(dt, { vel: 0 }); poseAluna(m, passoAl, kA); m.grupo.rotation.y = passoAl === "giro" ? liso(nAgora - nA + 0.5) * Math.PI * 2 : 0; });
      // a estrelinha da vez e as próximas deslizam até o círculo; cada uma vem de um lado
      const n = rit.passo;
      for (const [k, e] of estrelas.entries()) {
        const q = n + k, faltam = batidaDoPasso(q) - b, lado = q % 2 ? 1 : -1;
        if (faltam > ANDA * (k + 1) + 2 || faltam < -0.5) { e.visible = false; continue; }
        e.visible = true;
        const d = Math.max(0, faltam) * 2.05;
        e.position.set(LUGAR.x + lado * Math.min(8, d), YP + 0.42, LUGAR.z + 0.95);
        e.scale.setScalar(k === 0 && Math.abs(faltam) * seq.seg < JANELA_S ? 1.35 : 1.0);
      }
      circulo.scale.setScalar(1 + (rit.tBrilho > 0 ? 0.5 : Math.abs(batidaDoPasso(n) - b) * seq.seg < JANELA_S ? 0.2 : 0));
      circulo.material.color.setHex(rit.tBrilho > 0 ? 0xffffff : 0xffe680);
      rit.tBrilho -= dt;
      // passou o passo (com ou sem acerto): vai para o próximo; a turma não para
      if ((b - batidaDoPasso(n)) * seq.seg > JANELA_S) {
        rit.passo++; rit.feitoNaJanela = false;
        if (rit.acertos >= META || rit.passo >= QUE_PASSO.length * 3) terminarEnsaio();
      }
    },
  };
}

// ==================================================================== salão da BT Models: o desfile de fantasias
// fantasias simples, presas no corpo de cada personagem (uma malha a mais por personagem)
function vestir(m, qual) {
  const g = new THREE.Group(); m.partes.raiz.add(g);
  const a = m.altura / (m.grupo.scale.y || 1);
  if (qual === "capa") { // capa de herói nas costas
    for (let i = 0; i < 4; i++) pc(g, 0.76 + i * 0.09, 0.22, 0.05, i % 2 ? 0x1f6fe0 : 0x2f8fe8, 0, 1.12 - i * 0.22, -0.4 - i * 0.03, F);
    pc(g, 0.82, 0.1, 0.06, 0xffcc1f, 0, 1.22, -0.38, F);
    pc(g, 0.2, 0.2, 0.05, 0xffcc1f, 0, 0.88, 0.37, F); // brasão no peito (uma estrela de faz de conta)
  } else if (qual === "festa") { // chapéu de festa e saia de arco-íris
    const ch = malha(new THREE.ConeGeometry(0.28, 0.62, 12), mat(0xec2e8c), F); ch.position.set(0, a + 0.18, 0); g.add(ch);
    const pomp = malha(new THREE.SphereGeometry(0.1, 8, 6), mat(0xffffff), F); pomp.position.set(0, a + 0.54, 0); g.add(pomp);
    [0xe8413c, 0xff7a00, 0xffcc1f, 0x58c43a, 0x2f8fe8, 0x8e6cff].forEach((c, i) => { const d = malha(new THREE.CylinderGeometry(0.62 - i * 0.03, 0.66 - i * 0.03, 0.07, 14), mat(c), F); d.position.y = 0.34 + i * 0.07; g.add(d); });
  } else if (qual === "cartola") { // cartola e gravata-borboleta grande
    const aba = malha(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 16), mat(0x24252b), F); aba.position.y = a; g.add(aba);
    const copa = malha(new THREE.CylinderGeometry(0.28, 0.3, 0.46, 14), mat(0x24252b), F); copa.position.y = a + 0.25; g.add(copa);
    const fita = malha(new THREE.CylinderGeometry(0.31, 0.31, 0.09, 14), mat(0x8e5bd8), F); fita.position.y = a + 0.08; g.add(fita);
    for (const q of [-1, 1]) { pc(g, 0.26, 0.22, 0.05, 0x8e5bd8, q * 0.16, 0.72, 0.4, { ...F, rz: q * 0.25 }); } pc(g, 0.09, 0.09, 0.07, 0xffcc1f, 0, 0.72, 0.42, F);
  } else if (qual === "asas") { // asas de borboleta
    for (const q of [-1, 1]) {
      pc(g, 0.7, 0.62, 0.05, 0xff7ab8, q * 0.65, 1.04, -0.32, { ...F, rz: q * 0.3 }); pc(g, 0.5, 0.44, 0.05, 0xffcc1f, q * 0.56, 0.5, -0.32, { ...F, rz: -q * 0.28 });
      pc(g, 0.22, 0.22, 0.06, 0xffffff, q * 0.7, 1.05, -0.31, { ...F, rz: q * 0.3 }); pc(g, 0.16, 0.16, 0.06, 0xec2e8c, q * 0.56, 0.5, -0.31, F);
    }
  } else if (qual === "coroa") { // coroa de papel e capa de rainha
    pc(g, 0.62, 0.15, 0.62, 0xffcc1f, 0, a + 0.08, 0, F);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1]]) pc(g, 0.12, 0.17, 0.12, 0xffcc1f, x * 0.25, a + 0.23, z * 0.25, F);
    pc(g, 0.12, 0.12, 0.05, 0xec2e8c, 0, a + 0.09, 0.32, F);
    for (let i = 0; i < 5; i++) pc(g, 0.82 + i * 0.1, 0.2, 0.05, i % 2 ? 0x8e5bd8 : 0x7a4fd1, 0, 1.0 - i * 0.2, -0.4 - i * 0.02, F);
    pc(g, 0.9, 0.08, 0.1, 0xffffff, 0, 1.1, -0.36, F);
  }
  mesclar(g);
}
const DESFILANTES = [
  { tipo: "lapis", cor: 0xe8413c, roupa: "capa", fala: "rp-desfile-1", texto: "Com vocês, o Lápis Vermelho, de capa de herói!" },
  { tipo: "giz", cor: 0xffcc1f, roupa: "festa", fala: "rp-desfile-2", texto: "Agora, o Giz Amarelo, de chapéu de festa e saia de arco-íris!" },
  { tipo: "borracha", cor: 0xff9ec4, roupa: "cartola", fala: "rp-desfile-3", texto: "Olha a Borracha, de cartola e gravata-borboleta!" },
  { tipo: "caderno", cor: 0x58c43a, roupa: "asas", fala: "rp-desfile-4", texto: "Lá vem o Caderno Verde, com asas de borboleta!" },
  { tipo: "cola", cor: 0xffffff, roupa: "coroa", fala: "rp-desfile-5", texto: "E a Cola, de coroa e capa de rainha!" },
];
export function montarSalao({ id, def, ox, oz }) {
  const W = 24, D = 22, A = 8;
  const S = salaBase({ ox, oz, W, D, A, piso: 0x34353c, parede: 0x23242b });
  const { g, fixo, din, solido, I } = S;
  const OU = 0xe7c35a, Y = 0.55, ZI = -8.4, ZF = 4.6, PW = 3.4;
  // ---- passarela
  pc(fixo, PW + 0.3, Y - 0.08, ZF - ZI + 1.1, OU, 0, (Y - 0.08) / 2, (ZI + ZF) / 2 + 0.2);
  pc(fixo, PW, 0.08, ZF - ZI + 1, 0x4a4b53, 0, Y - 0.04, (ZI + ZF) / 2 + 0.2, F);
  for (const q of [-1, 1]) for (let z = ZI + 1; z < ZF; z += 2) pc(fixo, 0.16, 0.08, 0.3, 0, q * (PW / 2 + 0.08), Y + 0.02, z, { ...F, material: MAT.lampada });
  solido(0, (ZI + ZF) / 2 + 0.2, PW + 0.4, ZF - ZI + 1.2, 2.5);
  // ---- portal do fundo: pórtico colorido com cortina de fitas e, na parede, o nome da casa
  const PV = 3.0, PH = 4.4;
  for (const q of [-1, 1]) pc(fixo, 0.6, PH, 0.7, 0x2f8fe8, q * PV, PH / 2, ZI - 0.6);
  pc(fixo, PV * 2 + 0.6, 0.6, 0.7, 0xec2e8c, 0, PH + 0.3, ZI - 0.6);
  [0xe8413c, 0xff7a00, 0xffcc1f, 0x58c43a, 0x00b5f0, 0x8e6cff, 0xec2e8c].forEach((c, i, l) => { for (const q of [0, 1]) pc(fixo, (PV * 2 - 0.6) / l.length / 2 + 0.01, PH - 0.05, 0.1, q ? claro(c, 0.25) : c, -PV + 0.3 + (i + 0.25 + q * 0.5) * ((PV * 2 - 0.6) / l.length), PH / 2 + 0.02, ZI - 0.75, F); });
  pc(fixo, W - 0.4, A, 0.1, 0x2c2d35, 0, A / 2, -D / 2 + 0.4, F);
  letreiro(fixo, "bt-models", { w: 7.2, h: 1.12, y: 6.0, z: ZI - 0.95, cor: OU });
  // ---- arquibancada dos amigos, dos dois lados do corredor
  const CORES = [0xe8413c, 0x00b5f0, 0xffcc1f, 0x58c43a, 0x8e6cff, 0xff7a00, 0xec2e8c, 0x1fc08e];
  for (const q of [-1, 1]) for (let f = 0; f < 3; f++) for (let c = 0; c < 6; c++) {
    const x = q * (5.0 + f * 1.5), z = -6 + c * 1.7, cor = CORES[(c * 5 + f * 3 + (q > 0 ? 1 : 0)) % CORES.length];
    pc(fixo, 1.1, 0.5 + f * 0.4, 1.3, 0x4c4d55, x, (0.5 + f * 0.4) / 2, z, F);
    if ((c + f * 2) % 4 !== 3) { const y0 = 0.5 + f * 0.4; pc(fixo, 0.55, 0.65, 0.55, cor, x, y0 + 0.33, z, F); pc(fixo, 0.55, 0.2, 0.55, 0xf3c99a, x, y0 + 0.75, z, F); pc(fixo, 0.26, 0.15, 0.26, cor, x, y0 + 0.92, z, F); }
  }
  for (const q of [-1, 1]) solido(q * 6.5, -1.75, 4.5, 10.6, 2.5);
  // trilhos dos refletores
  for (const x of [-5, 5]) pc(fixo, 0.16, 0.16, 12, 0x45464d, x, 6.2, -1, F);
  // mesa do apresentador
  pc(fixo, 1.4, 1.0, 0.8, 0x7a4fd1, 3.6, 0.5, -6.2); pc(fixo, 1.6, 0.1, 1, OU, 3.6, 1.05, -6.2, F); pc(fixo, 0.08, 0.34, 0.08, 0x24252b, 3.4, 1.26, -6.2, F); pc(fixo, 0.14, 0.14, 0.14, 0x9aa3ad, 3.4, 1.46, -6.2, F);
  solido(3.6, -6.2, 1.5, 0.9, 1.3);
  mesclar(fixo);
  // ---- o que a criança prepara
  const tapete = new THREE.Group(); tapete.position.set(0, Y + 0.01, ZI - 0.1); din.add(tapete);
  pc(tapete, PW - 0.7, 0.04, ZF - ZI + 0.8, 0xd6204f, 0, 0, (ZF - ZI + 0.8) / 2, F); for (const q of [-1, 1]) pc(tapete, 0.1, 0.05, ZF - ZI + 0.8, OU, q * (PW / 2 - 0.35), 0, (ZF - ZI + 0.8) / 2, F);
  mesclar(tapete); tapete.scale.z = 0.001; tapete.visible = false;
  const refletores = [-5, 5].flatMap((x) => [-5, -1, 3].map((z) => holofote(din, x, 5.8, z, [0xfff0c8, 0xffb7d8, 0xbfe6ff][(x + 5 + z + 5) % 3], 1.2)));
  for (const r of refletores) r.ligar(false);
  const bandeiras = new THREE.Group(); din.add(bandeiras);
  // no alto, acima do letreiro do portal (daqui da câmera do desfile, ele continua à vista)
  for (const z of [-1, 4]) { const n = 16; for (let i = 0; i < n; i++) { const x = -W / 2 + 1 + (i + 0.5) * ((W - 2) / n), y = 7 - Math.sin(((i + 0.5) / n) * Math.PI) * 0.45; pc(bandeiras, 0.5, 0.5, 0.03, CORES[(i + z + 10) % CORES.length], x, y, z, { ...F, rz: i % 2 ? 0.08 : -0.08 }); } pc(bandeiras, W - 2, 0.03, 0.03, 0xffffff, 0, 7.25, z, F); }
  mesclar(bandeiras); bandeiras.visible = false;
  const teto = new THREE.Mesh(new THREE.PlaneGeometry(W, D + 6), new THREE.MeshBasicMaterial({ color: 0x17181f, side: THREE.DoubleSide })); teto.rotation.x = Math.PI / 2; teto.position.set(0, 8.02, 3); teto.visible = false; din.add(teto);
  // luzes do portal: três amarelas contando e a verde (é aí que a criança chama)
  const lampadas = [0, 1, 2, 3].map((i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), new THREE.MeshBasicMaterial({ color: 0x3a3a40 })); m.position.set(-1.65 + i * 1.1, PH + 0.3, ZI - 0.15); din.add(m); return m; });
  const COR_ACESA = [0xffd23f, 0xffd23f, 0xffd23f, 0x35e25f];
  // ---- amigos do estojo
  const estojo = DESFILANTES.map((d, i) => { const m = criarMorador(d.tipo, { cor: d.cor, semente: i + 3, escala: 0.82 }); vestir(m, d.roupa); m.grupo.visible = false; din.add(m.grupo); return { ...d, m, est: "fila", t: 0, flanco: [(i % 2 ? 1 : -1) * 1.15, 3.9 - Math.floor(i / 2) * 2.2] }; });
  const npcs = [];
  const est = { preparou: { tapete: false, luz: false, bandeiras: false }, chamados: 0, ritmo: null };
  // marcas no chão
  const MARCAS = { tapete: marca(din, -2.9, 5.8, "🟥"), luz: marca(din, 2.9, 5.8, "💡"), bandeiras: marca(din, -2.9, -0.8, "🚩"), comecar: marca(din, 2.9, -4.8, "🎬") };
  MARCAS.comecar.visible = false;
  const CAM_LIVRE = (p) => ({ pos: [ox + (p.x - ox) * 0.55, 7.4, Math.min(oz + D / 2 + 4, p.z + 11)], alvo: [ox + (p.x - ox) * 0.55, 1.4, p.z - 2] });
  const CAM_DESFILE = { pos: [ox + 1.3, 4.7, oz + 11.5], alvo: [ox, 1.8, oz - 2.8] };
  let vista = null, api = null, seq = null, fase = "preparar", tTapete = 0, tFim = 0, proxB = 0, chamouNa = -99, tQuase = 0, rabT = 0;
  const pronto = () => est.preparou.tapete && est.preparou.luz && est.preparou.bandeiras;
  const fazerParte = (nome, feito, fala, texto) => (a) => {
    if (est.preparou[nome]) return;
    est.preparou[nome] = true; MARCAS[nome].visible = false; feito(); a.sons.moeda?.(); a.falar(fala); a.dizer(NARRA, texto, 2400);
    if (pronto()) MARCAS.comecar.visible = true;
  };
  I("tapete", "🟥 Esticar o tapete", -2.9, 5.8, fazerParte("tapete", () => { tapete.visible = true; tTapete = 0.001; }, "rp-desfile-tapete", "Tapete esticado!"));
  I("luz", "💡 Ligar os refletores", 2.9, 5.8, fazerParte("luz", () => { const alvo = [[-1.2, -5], [-1.2, -1], [-1.2, 3], [1.2, -5], [1.2, -1], [1.2, 3]]; refletores.forEach((r, i) => { r.ligar(true); r.apontar(alvo[i][0], Y + 0.04, alvo[i][1]); }); }, "rp-desfile-luz", "Refletores ligados!"));
  I("bandeiras", "🚩 Pendurar as bandeirinhas", -2.9, -0.8, fazerParte("bandeiras", () => { bandeiras.visible = true; }, "rp-desfile-band", "Bandeirinhas no lugar!"));
  I("comecar", "🎬 Começar o desfile", 2.9, -4.8, (a) => {
    if (!pronto()) { a.falar("rp-desfile-falta"); a.dizer(NARRA, "Ainda falta preparar a passarela: veja as marcas brilhantes.", 3000); return; }
    if (fase !== "preparar" && fase !== "acabou") return;
    api = a; fase = "desfile"; est.chamados = 0; chamouNa = -99;
    for (const q of estojo) { q.est = "fila"; q.m.grupo.visible = false; }
    MARCAS.comecar.visible = false;
    vista = CAM_DESFILE; teto.visible = true;
    a.dizer(NARRA, "Tudo pronto! Olhe as luzes no alto do portal: um, dois, três... quando a luz ficar verde, aperte o botão e chame o amigo!", 6500);
    a.falar("rp-desfile-comecar");
    seq = criarSequencia(DESFILE); seq.iniciar(0.4);
    proxB = 16; // duas rodadas de explicação antes da primeira chamada
    a.travar({ x: ox + 2.9, z: oz - 4.8, dir: -Math.PI / 2 - 0.4, modo: "parado", segundos: 1e6, rotulo: "📣 Chamar o amigo!", aoAcao: chamar, posar });
    est.ritmo = { get janela() { const dif = (seq.batida() - proxB) * seq.seg; return fase === "desfile" && !andando() && Math.abs(dif) < 0.3; }, get chamados() { return est.chamados; }, get fase() { return fase; }, get luzes() { return lampadas.filter((m) => m.material.color.getHex() !== 0x3a3a40).length; } };
  });
  const andando = () => estojo.some((q) => q.est === "vai");
  const J = 0.42;
  function chamar() {
    if (fase !== "desfile") return;
    const dif = (seq.batida() - proxB) * seq.seg, q = estojo[est.chamados];
    if (!q) return;
    if (andando() || Math.abs(dif) > J) {
      if (tQuase <= 0) { tQuase = 7; api.dizer(NARRA, "Quase! Espere a luz verde.", 1800); api.falar("rp-desfile-quase"); } // sem castigo: a luz volta
      return;
    }
    est.chamados++; api.sons.pulo?.(); chamouNa = seq.batida();
    q.est = "vai"; q.t = 0; q.m.grupo.visible = true; q.m.grupo.position.set(0, Y, ZI); q.m.grupo.rotation.y = 0;
    api.falar(q.fala); api.dizer(NARRA, q.texto, 3600);
    tem(); // próxima chamada depois que este chegar no fim
  }
  function tem() { const b = seq.batida(); proxB = Math.ceil((b + 12) / 8) * 8; }
  function rabiscoEntra() {
    fase = "rabisco"; rabT = 0;
    api.falar("rp-desfile-rabisco"); api.dizer(NARRA, "E quem fecha o desfile é o Rabisco!", 3200);
    for (const m of lampadas) m.material.color.setHex(0x35e25f);
  }
  // o Rabisco anda da mesa até o portal e depois desfila até o fim da passarela, com os membros andando de verdade
  function posar(rb, dt, tr) {
    if (fase === "desfile") { rb.grupo.position.y = 0.07; const a = est.chamados ? Math.max(0, 1 - (seq.batida() - chamouNa) * 0.6) : 0; if (a > 0) { rb.bracoD.ombro.rotation.set(0, 0, -0.17 - 2.6 * a); rb.bracoD.cotovelo.rotation.x = -0.3 * a; } return; }
    if (fase === "rabisco") {
      tr.aoAcao = null;
      rabT += dt;
      const ANTES = [ox + 2.9, oz - 4.8], PORTAL = [ox + 2.1, oz + ZI - 0.1], ENTRADA = [ox, oz + ZI], FIM = [ox, oz + ZF - 0.2];
      const trecho = (a, b, ini, dur) => { const k = Math.min(1, Math.max(0, (rabT - ini) / dur)); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[0] - a[0], b[1] - a[1])]; };
      let p;
      if (rabT < 1.2) p = trecho(ANTES, PORTAL, 0, 1.2);
      else if (rabT < 1.7) p = trecho(PORTAL, ENTRADA, 1.2, 0.5);
      else if (rabT < 6.5) p = trecho(ENTRADA, FIM, 1.7, 4.8);
      else p = [FIM[0], FIM[1], 0];
      tr.x = p[0]; tr.z = p[1]; tr.dir = p[2];
      tr.modo = rabT < 6.5 ? "andar" : "parado"; tr.vel = rabT < 6.5 ? 3 : 0;
      rb.grupo.position.set(p[0], rabT > 1.5 ? Y : 0.07, p[1]); rb.grupo.rotation.y = p[2];
      if (rabT >= 6.5) { rb.grupo.rotation.y = 0; const k = Math.sin(rabT * 7) * 0.3; rb.bracoD.ombro.rotation.set(0, 0, -2.7 - k); rb.bracoE.ombro.rotation.set(0, 0, 2.7 + k); rb.grupo.position.y = Y + Math.abs(Math.sin(rabT * 5)) * 0.2; }
      if (rabT > 6.5 && !tFim) { tFim = 0.001; for (const q of estojo) { q.m.acenar(5); q.m.pular(); } api.confete?.(); api.sons.vitoria?.(); api.dizer(NARRA, "Que festa! Todo mundo junto na passarela. Cada um é especial do seu jeito!", 5200); api.falar("rp-desfile-fim"); }
    }
  }
  function terminar() {
    fase = "acabou"; seq.parar(0.8); seq = null; est.ritmo = null; vista = null; teto.visible = false;
    api.destravar(); api.rabisco.grupo.position.y = 0.07; api.teleportar?.(ox + 2.9, oz + 5.8);
    MARCAS.comecar.visible = true; for (const m of lampadas) m.material.color.setHex(0x3a3a40);
    tFim = 0;
    api.evento?.("desfilou");
  }
  const animaMarcas = Object.values(MARCAS).map((m) => m.userData.anima);
  return {
    id, nome: def.nome, profissao: null, grupo: g, solidos: S.fechar(), interativos: S.inter, npcs, est,
    entrada: S.entrada, porta: S.porta,
    vista: (p) => vista ?? CAM_LIVRE(p),
    atualizar(dt, t) {
      for (const f of animaMarcas) f(t);
      est.sonda?.();
      seq?.atualizar();
      tQuase -= dt;
      if (tTapete > 0 && tTapete < 1) { tTapete = Math.min(1, tTapete + dt * 1.1); tapete.scale.z = Math.max(0.001, liso(tTapete)); }
      // luzes do portal: 3 amarelas nas batidas antes da chamada e a verde na batida da chamada
      if (fase === "desfile") {
        const b = seq.batida(), falta = proxB - b, passou = (b - proxB) * seq.seg;
        for (const [i, m] of lampadas.entries()) { const aceso = !andando() && (i < 3 ? falta <= 3 - i && falta > -0.8 : falta <= 0 && passou < J * 1.3); m.material.color.setHex(aceso ? COR_ACESA[i] : 0x3a3a40); }
        if (!andando() && passou > J * 1.3) proxB += 8; // não chamou: a luz conta de novo
      }
      for (const q of estojo) {
        if (!q.m.grupo.visible) continue;
        const gr = q.m.grupo;
        if (q.est === "vai") {
          q.t += dt; gr.position.z += dt * 3; q.m.atualizar(dt, { vel: 2.4 }); gr.rotation.y = 0;
          if (gr.position.z >= ZF) { gr.position.z = ZF; q.est = "pose"; q.t = 0; q.m.acenar(1.6); q.m.pular(); api.sons.moeda?.(); }
        } else if (q.est === "pose") {
          q.t += dt; q.m.atualizar(dt, { vel: 0 }); gr.rotation.y = liso(q.t / 1.1) * Math.PI * 2; // uma voltinha para mostrar a fantasia
          if (q.t > 1.6) { q.est = "flanco"; q.t = 0; }
        } else if (q.est === "flanco") {
          const dx = q.flanco[0] - gr.position.x, dz = q.flanco[1] - gr.position.z, d = Math.hypot(dx, dz);
          if (d < 0.08) { q.est = "pronto"; gr.rotation.y = q.flanco[0] > 0 ? -Math.PI / 2 + 0.6 : Math.PI / 2 - 0.6; q.m.atualizar(dt, { vel: 0 }); }
          else { gr.position.x += (dx / d) * Math.min(d, dt * 2.6); gr.position.z += (dz / d) * Math.min(d, dt * 2.6); gr.rotation.y = Math.atan2(dx, dz); q.m.atualizar(dt, { vel: 2.2 }); }
        } else q.m.atualizar(dt, { vel: 0 });
      }
      if (fase === "desfile" && est.chamados === estojo.length && estojo.every((q) => q.est === "pronto")) rabiscoEntra();
      if (tFim > 0) { tFim += dt; if (tFim > 5.2) terminar(); }
    },
  };
}
