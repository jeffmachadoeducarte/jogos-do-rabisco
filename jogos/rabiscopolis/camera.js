// Rabiscolândia: câmera em terceira pessoa que segue o Rabisco (ou o veículo), gira com Q/E, alavanca direita ou
// arrastando à direita da tela, volta sozinha para trás dele ao andar e encurta quando tem prédio no caminho.
// Copiado e adaptado de jogos/cidade-do-rabisco/jogo.js (posicionarCamera).

import { THREE } from "./base3d.js";

export function criarCamera(cam, solidos) {
  const alvo = new THREE.Vector3(), posCam = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpP = new THREE.Vector3();
  const st = { yaw: 0, manual: 0, vista: null, dist: null, alt: null };
  const caixa = new THREE.Box3(), tmpB = new THREE.Box3();
  // altura do veículo (caixa das malhas dele, sem o Rabisco, o jogador 2 e a seta "entre aqui"), medida uma vez por veículo
  function alturaDe(v, pular = []) {
    if (v.alturaCam != null) return v.alturaCam;
    const fora = new Set([v.g.userData.seta, ...pular].filter(Boolean));
    const dentroDeFora = (o) => { for (let p = o; p; p = p.parent) if (fora.has(p)) return true; return false; };
    v.g.updateMatrixWorld(true);
    caixa.makeEmpty();
    v.g.traverse((o) => {
      if (!o.isMesh || !o.geometry || dentroDeFora(o)) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      caixa.union(tmpB.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
    });
    const h = caixa.isEmpty() ? 1.6 : caixa.max.y - Math.max(v.g.position.y, caixa.min.y);
    v.alturaCam = Math.min(6, Math.max(1, h));
    return v.alturaCam;
  }
  // P = posição do jogador (com 2 jogadores, o meio dos dois) · ref = para onde ele/veículo olha · giro: −1..1 por segundo
  // · comp: meio comprimento do veículo (a câmera não entra nele) · arrasto: px · afastar: metros a mais de distância para caber os dois na tela
  // · dois: 2 jogadores na rua (câmera compartilhada): começa um pouco mais longe e mais alta, sobe mais ao afastar e mira o
  //   meio dos dois (sem olhar "à frente"), para nenhum dos dois sair do quadro
  // · veiculo: o que o Rabisco dirige — a distância e a altura crescem com o tamanho dele (comprimento e altura da caixa):
  //   carro um pouco mais longe que a pé, caminhão e ônibus bem mais longe e mais altos (o veículo inteiro e a rua à frente).
  //   A distância/altura mudam devagar ao entrar e sair (sem pulo); o prédio no caminho continua encurtando na hora.
  function posicionar({ P, ref, dirigindo, andando, giro = 0, arrasto = 0, onibus = false, comp = 0, heli = false, afastar = 0, dois = false, veiculo = null, pular = [] }, k, dt) {
    if (st.vista) { cam.position.set(...st.vista.pos); cam.lookAt(...st.vista.alvo); return; }
    if (giro || arrasto) { st.yaw -= giro * dt * 2.2 + arrasto * 0.008; st.manual = 2.5; }
    st.manual -= dt;
    if (st.manual <= 0 && (andando || dirigindo)) { let d = ref - st.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); st.yaw += d * Math.min(1, dt * (dirigindo ? (dois ? 1.2 : 2.5) : dois ? 0.35 : 1.2)); } // a 2, gira devagar: o "para frente" do outro não muda de repente
    const longe = cam.aspect < 1.2 ? 1.25 : 1;
    const hV = dirigindo && veiculo && !heli ? alturaDe(veiculo, pular) : 0;
    const base = dirigindo ? (heli ? 11 : veiculo ? 4.0 + comp * 1.9 + hV * 0.5 : onibus ? 9.6 : 8.6) : 6.4;
    const baseAlt = dirigindo ? (heli ? 6.2 : veiculo ? 1.4 + hV * 1.4 + comp * 0.35 : onibus ? 6.4 : 3.8) : 3.0;
    // a base anda devagar até o valor novo (entrar no ônibus afasta em ~1 s); posicionar(…, 1, 0) é um corte: vai direto
    // (suave e com limite de velocidade: mesmo numa TV box lenta, poucos quadros por segundo, a câmera não pula)
    const f = dt > 0 ? 1 - Math.exp(-dt * 2.2) : 1;
    const ir = (atual, alvo, vmax) => (atual == null || dt <= 0 ? alvo : atual + Math.max(-vmax * dt, Math.min(vmax * dt, (alvo - atual) * f)));
    st.dist = ir(st.dist, base, 5);
    st.alt = ir(st.alt, baseAlt, 3);
    let dist = st.dist * longe + afastar + (dois ? 1.6 : 0);
    const alt = st.alt + (dois ? 1.8 + afastar * 0.62 : afastar * 0.45);
    st.encurtou = false; // prédio atrás: a câmera chegou mais perto (para o teste saber)
    for (let s = 1; s <= 10; s++) {
      const d = (dist * s) / 10;
      const x = P.x - Math.sin(st.yaw) * d, z = P.z - Math.cos(st.yaw) * d;
      if (solidos.some((o) => o.y1 > 3 && o.y1 > P.y + alt - 1 && x > o.x0 - 0.3 && x < o.x1 + 0.3 && z > o.z0 - 0.3 && z < o.z1 + 0.3)) { dist = Math.max(dirigindo ? comp + 1.5 : 1.2, d - 0.6); st.encurtou = true; break; } // dirigindo, a câmera nunca entra no veículo
    }
    const frente = dois ? (dirigindo ? 1.5 : 0.4) : dirigindo ? (veiculo && !heli ? 2.4 + comp * 0.7 : 4) : 2;
    const altAlvo = heli ? 2.2 : dirigindo && veiculo ? 0.8 + hV * 0.4 : onibus ? 2.2 : dirigindo ? 1.4 : 1.3;
    alvo.lerp(tmpA.set(P.x + Math.sin(st.yaw) * frente, P.y + altAlvo, P.z + Math.cos(st.yaw) * frente), k);
    posCam.lerp(tmpP.set(P.x - Math.sin(st.yaw) * dist, P.y + alt * longe, P.z - Math.cos(st.yaw) * dist), k);
    cam.position.copy(posCam);
    cam.lookAt(alvo);
  }
  return { st, posicionar };
}
