// Rabiscolândia: câmera em terceira pessoa que segue o Rabisco (ou o veículo), gira com Q/E, alavanca direita ou
// arrastando à direita da tela, volta sozinha para trás dele ao andar e encurta quando tem prédio no caminho.
// Copiado e adaptado de jogos/cidade-do-rabisco/jogo.js (posicionarCamera).

import { THREE } from "./base3d.js";

export function criarCamera(cam, solidos) {
  const alvo = new THREE.Vector3(), posCam = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpP = new THREE.Vector3();
  const st = { yaw: 0, manual: 0, vista: null };
  // P = posição do jogador (com 2 jogadores, o meio dos dois) · ref = para onde ele/veículo olha · giro: −1..1 por segundo
  // · comp: meio comprimento do veículo (a câmera não entra nele) · arrasto: px · afastar: metros a mais de distância para caber os dois na tela
  function posicionar({ P, ref, dirigindo, andando, giro = 0, arrasto = 0, onibus = false, comp = 0, heli = false, afastar = 0 }, k, dt) {
    if (st.vista) { cam.position.set(...st.vista.pos); cam.lookAt(...st.vista.alvo); return; }
    if (giro || arrasto) { st.yaw -= giro * dt * 2.2 + arrasto * 0.008; st.manual = 2.5; }
    st.manual -= dt;
    if (st.manual <= 0 && (andando || dirigindo)) { let d = ref - st.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); st.yaw += d * Math.min(1, dt * (dirigindo ? 2.5 : 1.2)); }
    const longe = cam.aspect < 1.2 ? 1.25 : 1;
    let dist = (dirigindo ? (heli ? 11 : onibus ? 9.6 : 8.6) : 6.4) * longe + afastar;
    const alt = (dirigindo ? (heli ? 6.2 : onibus ? 6.4 : 3.8) : 3.0) + afastar * 0.45;
    for (let s = 1; s <= 10; s++) {
      const d = (dist * s) / 10;
      const x = P.x - Math.sin(st.yaw) * d, z = P.z - Math.cos(st.yaw) * d;
      if (solidos.some((o) => o.y1 > 3 && o.y1 > P.y + alt - 1 && x > o.x0 - 0.3 && x < o.x1 + 0.3 && z > o.z0 - 0.3 && z < o.z1 + 0.3)) { dist = Math.max(dirigindo ? comp + 1.5 : 1.2, d - 0.6); break; } // dirigindo, a câmera nunca entra no veículo
    }
    alvo.lerp(tmpA.set(P.x + Math.sin(st.yaw) * (dirigindo ? 4 : 2), P.y + (onibus ? 2.2 : heli ? 2.2 : dirigindo ? 1.4 : 1.3), P.z + Math.cos(st.yaw) * (dirigindo ? 4 : 2)), k);
    posCam.lerp(tmpP.set(P.x - Math.sin(st.yaw) * dist, P.y + alt * longe, P.z - Math.cos(st.yaw) * dist), k);
    cam.position.copy(posCam);
    cam.lookAt(alvo);
  }
  return { st, posicionar };
}
