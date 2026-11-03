// Rabiscolândia: o baú do Presente do dia, de blocos (desenho próprio). Corpo de madeira com cintas douradas, fechadura,
// tampa em degraus com laço rosa e, flutuando em cima, a plaquinha com o presente (vê-se de longe, como o "!" das missões).
// Parado, a tampa dá umas sacudidinhas de vez em quando (tem coisa lá dentro!). Ao abrir: o baú treme, a tampa abre para
// trás com um pulinho, sai luz de dentro e as moedinhas de bloco voam para cima, girando, e caem de volta; depois o baú
// afunda no chão e some. Som 8-bit original (Web Audio, pela saída de src/motor/sons.js: o mudo da casca vale aqui).
// Orçamento: corpo (1 malha) + tampa (1) + plaquinha (1); abrindo, mais a luz de dentro, o facho e as moedas (1 cada).
//
//   const B = criarBau(cena);  B.colocar(x, z, rot);  B.mostrar(true);  B.atualizar(dt, t, pos, raio);  B.abrir(aoPagar)
//   B.estado ("fora" | "fechado" | "abrindo")  B.pos  B.perto(pos)  texMarcaDoDia() (a estrela das missões do dia)

import { THREE, mesclar, texturaCanvas } from "./base3d.js";
import { cx as pc, claro, escuro, plasticoNovo } from "./blocos.js";
import { tocar8bit } from "../../src/motor/rabiscoins-ui.js";

const MADEIRA = 0xc9803f, OURO = 0xffcc1f, ROSA = 0xec2e8c, TINTA = 0x151515;

// ---------- texturas (canvas, desenho próprio)
let texPresente = null, texEstrela = null;
// plaquinha do baú: círculo rosa com contorno preto e um presentinho amarelo de laço ciano
const marcaPresente = () => (texPresente ??= texturaCanvas(128, 128, (c) => {
  c.fillStyle = "#ec2e8c"; c.strokeStyle = "#151515"; c.lineWidth = 8; c.beginPath(); c.arc(64, 64, 54, 0, 7); c.fill(); c.stroke();
  c.lineWidth = 5; c.lineJoin = "round";
  c.fillStyle = "#ffcc1f"; c.fillRect(36, 60, 56, 36); c.strokeRect(36, 60, 56, 36); // caixa
  c.fillRect(31, 46, 66, 16); c.strokeRect(31, 46, 66, 16); // tampa
  c.fillStyle = "#00b5f0"; c.fillRect(58, 46, 12, 50); c.strokeRect(58, 46, 12, 50); // fita
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(64 + s * 13, 36, 13, 9, s * 0.5, 0, 7); c.fill(); c.stroke(); } // laço
  c.fillRect(58, 30, 12, 12); c.strokeRect(58, 30, 12, 12);
}));
// selo da Missão do dia: estrela amarela de contorno preto com o "!" no meio (no lugar do "!" redondo)
export const texMarcaDoDia = () => (texEstrela ??= texturaCanvas(128, 128, (c) => {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 26 : 60; c.lineTo(64 + Math.cos(a) * r, 68 + Math.sin(a) * r); }
  c.closePath(); c.fillStyle = "#ffcc1f"; c.strokeStyle = "#151515"; c.lineWidth = 8; c.lineJoin = "round"; c.fill(); c.stroke();
  c.font = "900 54px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#151515"; c.fillText("!", 64, 74);
}));

// ---------- sons (composição própria)
const hz = (semi) => 440 * 2 ** (semi / 12);
// tremidinha (três batidas graves de pulso) e a tampa abrindo (subida rápida) com o brilho de dentro (arpejo em triângulo)
export function somAbrir() {
  const n = [[hz(-17), 0, 0.06, "square", 0.05], [hz(-15), 0.1, 0.06, "square", 0.05], [hz(-13), 0.2, 0.06, "square", 0.05]];
  for (let i = 0; i < 6; i++) n.push([hz(-5 + i * 3), 0.42 + i * 0.035, 0.05, "square", 0.04]);
  for (const [k, s] of [[0, 7], [1, 12], [2, 16], [3, 19], [4, 24]]) n.push([hz(s), 0.66 + k * 0.07, 0.16, "triangle", 0.1]);
  n.push([hz(-5), 0.66, 0.5, "triangle", 0.12]);
  tocar8bit(n);
}
// 7º dia: uma fanfarrinha a mais por cima
export function somBonus() {
  tocar8bit([[hz(12), 0, 0.1, "square", 0.04], [hz(16), 0.1, 0.1, "square", 0.04], [hz(19), 0.2, 0.1, "square", 0.04], [hz(24), 0.3, 0.45, "square", 0.04], [hz(16), 0.3, 0.45, "square", 0.03], [hz(0), 0.3, 0.45, "triangle", 0.12]]);
}

// ---------- o baú
function montar() {
  const g = new THREE.Group();
  const f = {}; // tudo com sombra: cada parte (corpo, tampa) vira UMA malha só na mesclagem
  // corpo: madeira com rodapé, cintas douradas, borda de cima e a fechadura
  pc(g, 1.4, 0.7, 0.94, MADEIRA, 0, 0.45, 0);
  pc(g, 1.48, 0.12, 1.02, escuro(MADEIRA, 0.7), 0, 0.06, 0, f);
  for (const x of [-0.46, 0.46]) pc(g, 0.16, 0.74, 0.98, OURO, x, 0.45, 0, f);
  pc(g, 1.44, 0.08, 0.98, OURO, 0, 0.8, 0, f);
  for (const x of [-0.25, 0.25]) pc(g, 0.04, 0.5, 0.02, escuro(MADEIRA, 0.82), x, 0.45, 0.475, f); // tábuas
  pc(g, 0.34, 0.36, 0.1, OURO, 0, 0.6, 0.5, f);
  pc(g, 0.08, 0.15, 0.02, TINTA, 0, 0.57, 0.555, f);
  // tampa: gira na dobradiça de trás (topo do corpo, z = -0.47); três degraus, cintas e o laço rosa do presente
  const tampa = new THREE.Group(); tampa.position.set(0, 0.84, -0.47); g.add(tampa);
  const T = (w, h, d, cor, x, y, z, o = f) => pc(tampa, w, h, d, cor, x, y, z + 0.47, o);
  T(1.44, 0.2, 0.98, MADEIRA, 0, 0.1, 0);
  T(1.22, 0.16, 0.76, claro(MADEIRA, 0.12), 0, 0.28, 0);
  T(0.92, 0.12, 0.5, claro(MADEIRA, 0.22), 0, 0.42, 0);
  for (const x of [-0.46, 0.46]) { T(0.16, 0.24, 1.0, OURO, x, 0.1, 0); T(0.16, 0.18, 0.78, OURO, x, 0.28, 0); }
  T(0.34, 0.2, 0.1, OURO, 0, 0.02, 0.5);
  T(1.0, 0.07, 0.16, ROSA, 0, 0.5, 0); T(0.16, 0.07, 0.6, ROSA, 0, 0.5, 0);
  for (const s of [-1, 1]) T(0.3, 0.18, 0.12, ROSA, s * 0.17, 0.6, 0, { ...f, rz: s * 0.5 });
  T(0.14, 0.14, 0.14, claro(ROSA, 0.2), 0, 0.58, 0);
  // luz de dentro (aparece ao abrir)
  const luz = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.76), plasticoNovo({ color: 0xfff0a0, emissive: 0xffd84a, emissiveIntensity: 1 }));
  luz.position.y = 0.79; luz.visible = false; luz.userData.dinamico = true; g.add(luz);
  mesclar(g, { juntas: new Set([tampa]) });
  return { g, tampa, luz };
}

const N_MOEDAS = 14;
export function criarBau(cena) {
  const raiz = new THREE.Group(); raiz.name = "bau-do-dia"; raiz.visible = false; cena.add(raiz);
  const { g, tampa, luz } = montar(); raiz.add(g);
  // plaquinha com o presente, flutuando (sem depthTest: aparece por cima de folha e de poste, como o "!")
  const marca = new THREE.Sprite(new THREE.SpriteMaterial({ map: marcaPresente(), depthTest: false }));
  marca.scale.setScalar(1.05); marca.renderOrder = 6; raiz.add(marca);
  // facho de luz que sobe do baú aberto
  const facho = new THREE.Mesh(new THREE.BoxGeometry(1.0, 3.2, 0.6), new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0, depthWrite: false }));
  facho.position.y = 2.4; facho.visible = false; raiz.add(facho);
  // moedinhas de bloco (uma malha só, instanciada)
  const moedas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.3, 0.07), plasticoNovo({ color: OURO, emissive: 0x6a4800, emissiveIntensity: 0.5 }), N_MOEDAS);
  moedas.frustumCulled = false; moedas.visible = false; raiz.add(moedas);
  const voo = Array.from({ length: N_MOEDAS }, (_, i) => {
    const a = (i / N_MOEDAS) * Math.PI * 2 + (i % 3) * 0.4, r = 0.9 + (i % 4) * 0.35;
    return { vx: Math.cos(a) * r, vz: Math.sin(a) * r * 0.8 + 0.4, vy: 5.2 + (i % 5) * 0.55, giro: 7 + (i % 4) * 2.5, atraso: (i % 7) * 0.035 };
  });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), esc = new THREE.Vector3();
  let estado = "fora", ta = 0, aoPagar = null, pago = false, sacode = 2.2;
  const pos = { x: 0, z: 0 };
  const solido = { x0: 0, x1: 0, z0: 0, z1: 0, y1: 1.3 };

  function pousarMoedas(k) {
    for (let i = 0; i < N_MOEDAS; i++) {
      const o = voo[i], tt = Math.max(0, k - o.atraso);
      const y = 0.85 + o.vy * tt - 6.5 * tt * tt;
      const s = tt <= 0 ? 0 : Math.min(1, tt * 6) * (y < 0.4 ? Math.max(0, y / 0.4) : 1);
      v.set(o.vx * tt, Math.max(0.05, y), o.vz * tt);
      e.set(0.3, o.giro * tt, 0.2 * Math.sin(tt * 5)); q.setFromEuler(e); esc.setScalar(Math.max(0.001, s));
      moedas.setMatrixAt(i, m4.compose(v, q, esc));
    }
    moedas.instanceMatrix.needsUpdate = true;
  }
  const api = {
    grupo: raiz, pos,
    get estado() { return estado; },
    get tampa() { return -tampa.rotation.x; },
    colocar(x, z, rot = 0) {
      pos.x = x; pos.z = z; raiz.position.set(x, 0.03, z); raiz.rotation.y = rot;
      // colisão do tamanho do baú (girado de 90° troca largura e fundo)
      const deLado = Math.abs(Math.sin(rot)) > 0.7, hw = deLado ? 0.52 : 0.74, hd = deLado ? 0.74 : 0.52;
      Object.assign(solido, { x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd });
    },
    // solidos: a lista de colisões do mundo (o baú entra e sai dela)
    mostrar(sim, solidos = null) {
      estado = sim ? "fechado" : "fora";
      raiz.visible = sim; g.scale.setScalar(1); g.position.y = 0; g.rotation.set(0, 0, 0);
      tampa.rotation.x = 0; luz.visible = false; facho.visible = false; moedas.visible = false; marca.visible = sim;
      if (solidos) { const i = solidos.indexOf(solido); if (sim && i < 0) solidos.push(solido); if (!sim && i >= 0) solidos.splice(i, 1); }
      api.solidos = solidos ?? api.solidos;
    },
    perto: (p, d = 2.1) => estado === "fechado" && Math.hypot(p.x - pos.x, p.z - pos.z) < d,
    // aoPagar: chamado no meio da animação, quando as moedinhas saem (o contador do HUD faz a festa dele)
    abrir(cb) {
      if (estado !== "fechado") return false;
      estado = "abrindo"; ta = 0; aoPagar = cb; pago = false;
      marca.visible = false;
      somAbrir();
      return true;
    },
    atualizar(dt, t, p, R) {
      if (estado === "fora") return;
      raiz.visible = Math.hypot(p.x - pos.x, p.z - pos.z) < R;
      if (estado === "fechado") {
        marca.position.set(0, 2.15 + Math.sin(t * 3.2) * 0.12, 0);
        // de vez em quando a tampa pula duas vezes (tem coisa lá dentro!)
        sacode -= dt;
        const k = sacode < 0 ? -sacode : 0;
        tampa.rotation.x = k > 0 && k < 0.42 ? -Math.abs(Math.sin(k * 15)) * 0.13 * (1 - k / 0.42) : 0;
        if (sacode < -0.42) sacode = 2.6 + (Math.sin(t * 7.1) + 1) * 0.9;
        return;
      }
      // abrindo
      ta += dt;
      if (ta < 0.42) { // treme
        const k = ta / 0.42;
        g.rotation.z = Math.sin(ta * 46) * 0.06 * (1 - k); g.position.y = Math.abs(Math.sin(ta * 23)) * 0.05;
        tampa.rotation.x = -Math.abs(Math.sin(ta * 30)) * 0.12;
      } else if (ta < 0.9) { // a tampa abre com um pulinho (passa um pouco e volta)
        g.rotation.z = 0; g.position.y = 0;
        const k = (ta - 0.42) / 0.48, c1 = 1.7, c3 = c1 + 1, s = 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2;
        tampa.rotation.x = -1.95 * s;
        if (!luz.visible) { luz.visible = true; facho.visible = true; moedas.visible = true; }
      } else tampa.rotation.x = -1.95;
      if (luz.visible) {
        const k = ta - 0.42;
        luz.material.emissiveIntensity = 0.7 + Math.sin(ta * 9) * 0.3;
        facho.material.opacity = Math.max(0, Math.min(0.5, k * 2) - Math.max(0, k - 1.0) * 0.35);
        facho.scale.set(1, 0.4 + Math.min(1, k * 2.5) * 0.6, 1); facho.position.y = 0.85 + 1.6 * facho.scale.y;
        pousarMoedas(Math.max(0, ta - 0.5));
      }
      if (!pago && ta > 0.75) { pago = true; aoPagar?.(); }
      // afunda no chão e some
      if (ta > 3.4) { const k = Math.min(1, (ta - 3.4) / 0.7); g.scale.setScalar(1 - k * k * 0.98); g.position.y = -k * 0.3; luz.visible = k < 0.5; moedas.visible = false; facho.visible = false; }
      if (ta > 4.1) api.mostrar(false, api.solidos);
    },
    // para os testes
    info: () => ({ estado, x: pos.x, z: pos.z, visivel: raiz.visible, tampa: -tampa.rotation.x, marca: marca.visible }),
  };
  return api;
}
