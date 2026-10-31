// Rabiscolândia: céu, sol, luz ambiente e neblina, com dia e noite. hora(h) de 0 a 24 muda tudo junto:
// cor do céu (degradê), posição e força do sol, nuvens de blocos, estrelas e lua de noite, e as janelas/postes que
// acendem (materiais MAT de base3d.js com emissiveIntensity). Nenhuma luz extra: as "luzes" da noite são emissivas,
// mais as poças de luz no chão embaixo dos postes.

import { THREE, MAT } from "./base3d.js";
import { aleatorio } from "../../src/motor3d/toon.js";

const PALETAS = [
  // hora, topo, horizonte, neblina, sol (cor), nuvem, força do sol, luz ambiente
  [0, 0x0b1a52, 0x2b4490, 0x223a78, 0x9fb6ff, 0x4a5a94, 0.75, 1.15],
  [5.5, 0x24408a, 0xf6b08c, 0x8a86b0, 0xffb27a, 0xe8b0b0, 0.9, 1.0],
  [7.5, 0x4a9ff0, 0xc8e8fb, 0xc0e2f8, 0xfff0d6, 0xffffff, 2.9, 1.5],
  [12, 0x3f97ee, 0xbfe4fb, 0xb9dff7, 0xfff6e6, 0xffffff, 3.2, 1.6],
  [16.5, 0x4a9dee, 0xf3e6d0, 0xdfe6e2, 0xffe6c0, 0xfff4e4, 2.9, 1.5],
  [18.5, 0x45509f, 0xffa878, 0xc096a6, 0xff9a5a, 0xffc0a0, 1.2, 1.1],
  [20, 0x142364, 0x35488e, 0x2c4080, 0xa6b8ff, 0x505f9a, 0.75, 1.15],
  [24, 0x0b1a52, 0x2b4490, 0x223a78, 0x9fb6ff, 0x4a5a94, 0.75, 1.15],
];
const c1 = new THREE.Color(), c2 = new THREE.Color();
function misturar(h, i) {
  let k = 0;
  while (k < PALETAS.length - 2 && PALETAS[k + 1][0] <= h) k++;
  const a = PALETAS[k], b = PALETAS[k + 1];
  const f = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0])));
  if (i >= 6) return a[i] + (b[i] - a[i]) * f;
  return c1.setHex(a[i]).lerp(c2.setHex(b[i]), f).clone();
}

// nuvens de blocos bem formadas: um mapa de alturas sorteado (fundo reto, topo em degraus) em cada nuvem, com tons por
// face já pintados. Uma malha e uma chamada de desenho para o céu todo.
function nuvens(cena) {
  const rnd = aleatorio(77), pos = [], cor = [], c = new THREE.Color();
  const face = (ny, nx) => (ny > 0.5 ? 1 : ny < -0.5 ? 0.8 : nx !== 0 ? 0.94 : 0.89);
  const caixa = (w, h, d, x, y, z, frio) => {
    const b = new THREE.BoxGeometry(w, h, d).toNonIndexed(); b.translate(x, y, z);
    const P = b.attributes.position, N = b.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      pos.push(P.getX(i), P.getY(i), P.getZ(i));
      const v = face(N.getY(i), N.getX(i)) - frio * 0.06;
      c.setRGB(v * (N.getY(i) < -0.5 ? 0.9 : 1), v * (N.getY(i) < -0.5 ? 0.94 : 1), v);
      cor.push(c.r, c.g, c.b);
    }
  };
  for (let n = 0; n < 24; n++) {
    const a = rnd() * Math.PI * 2, dist = 200 + rnd() * 300, L = 8 + Math.floor(rnd() * 8), F = 4 + Math.floor(rnd() * 3), s = 9 + rnd() * 5;
    const ox = Math.cos(a) * dist, oz = Math.sin(a) * dist, oy = 118 + rnd() * 46;
    const picos = [0, 1, 2].map(() => [(rnd() - 0.5) * L * 0.9, (rnd() - 0.5) * F * 0.5, 1.6 + rnd() * 1.6]);
    for (let i = 0; i < L; i++) for (let k = 0; k < F; k++) {
      const x = i - (L - 1) / 2, z = k - (F - 1) / 2, el = (x * x) / ((L / 2) ** 2) + (z * z) / ((F / 2) ** 2);
      if (el > 1.02) continue;
      let alt = 1 + (1 - el) * 1.2;
      for (const [px, pz, h] of picos) alt += h * Math.max(0, 1 - Math.hypot((x - px) / 2.3, (z - pz) / 1.8));
      alt = Math.max(1, Math.round(alt));
      caixa(s, alt * s * 0.6, s, ox + x * s, oy + (alt * s * 0.6) / 2, oz + z * s, 0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  m.frustumCulled = false; m.renderOrder = -9;
  cena.add(m);
  return m;
}

export function criarCeu(cena, { sombra = 1024 } = {}) {
  const uni = { topo: { value: new THREE.Color() }, horizonte: { value: new THREE.Color() }, dirSol: { value: new THREE.Vector3(0.5, 0.55, 0.65).normalize() }, noite: { value: 0 } };
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: uni,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform vec3 topo; uniform vec3 horizonte; uniform vec3 dirSol; uniform float noite; varying vec3 vP;
      void main(){ float h = clamp(vP.y*1.6, 0.0, 1.0); vec3 c = mix(horizonte, topo, pow(h,0.55));
        float s = max(dot(normalize(vP), dirSol), 0.0); c += vec3(1.0,0.92,0.75) * (smoothstep(0.9975, 0.9985, s) * 1.2 + pow(s, 22.0) * 0.16) * (1.0 - noite);
        vec3 l = normalize(vec3(-0.5, 0.6, -0.6)); float m = max(dot(normalize(vP), l), 0.0); c += vec3(1.0,0.97,0.85) * smoothstep(0.9991, 0.9994, m) * noite;
        gl_FragColor = vec4(c, 1.0); }`,
  }));
  esfera.renderOrder = -10;
  cena.add(esfera);
  const ceuNuvens = nuvens(cena);
  // estrelas (um Points só)
  const n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, y = 0.12 + Math.random() * 0.88, r = Math.sqrt(1 - y * y); pos.set([Math.cos(a) * r * 560, y * 560, Math.sin(a) * r * 560], i * 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const estrelas = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  cena.add(estrelas);

  const sol = new THREE.DirectionalLight(0xfff2dc, 2.6);
  sol.castShadow = sombra > 0;
  sol.shadow.mapSize.set(sombra || 512, sombra || 512);
  const META = 44; // meia largura da área com sombra
  Object.assign(sol.shadow.camera, { left: -META, right: META, top: META, bottom: -META, near: 1, far: 190 });
  // sombra limpa: sem "pelo" nas paredes retas (viés e deslocamento na normal maiores) e borda macia
  sol.shadow.bias = -0.0012; sol.shadow.normalBias = 0.12; sol.shadow.radius = 1.6;
  const amb = new THREE.HemisphereLight(0xf0f6ff, 0xc2b8a6, 1.5);
  cena.add(sol, sol.target, amb);
  cena.fog = new THREE.Fog(0xb9dff7, 60, 140);

  let horaAtual = 10;
  const dirSol = new THREE.Vector3(), alvo = new THREE.Vector3(), dirX = new THREE.Vector3(), dirY = new THREE.Vector3();
  const api = {
    sol, amb, esfera, estrelas, nuvens: ceuNuvens,
    get horaAtual() { return horaAtual; },
    get noite() { return uni.noite.value; },
    hora(h) {
      horaAtual = ((h % 24) + 24) % 24;
      const H = horaAtual;
      uni.topo.value.copy(misturar(H, 1)); uni.horizonte.value.copy(misturar(H, 2));
      cena.fog.color.copy(misturar(H, 3));
      sol.color.copy(misturar(H, 4)); ceuNuvens.material.color.copy(misturar(H, 5));
      sol.intensity = misturar(H, 6); amb.intensity = misturar(H, 7);
      const dia = H >= 6 && H <= 18.5;
      // de noite a "luz" vem da lua: mesma direção alta, azulada
      const a = dia ? ((H - 6) / 12.5) * Math.PI : 0.8;
      dirSol.set(Math.cos(a) * 0.8, Math.max(0.42, Math.sin(a)), 0.55).normalize();
      uni.dirSol.value.copy(dirSol);
      dirX.set(0, 1, 0).cross(dirSol).normalize(); dirY.copy(dirSol).cross(dirX).normalize();
      const noite = H < 5.5 || H > 19.5 ? 1 : H < 7 ? 1 - (H - 5.5) / 1.5 : H > 18 ? (H - 18) / 1.5 : 0;
      uni.noite.value = noite;
      estrelas.material.opacity = noite * 0.9;
      amb.color.setHex(noite > 0.5 ? 0x9db2f0 : 0xf0f6ff); amb.groundColor.setHex(noite > 0.5 ? 0x34466e : 0xc2b8a6);
      // janelas, lampiões e postes acendem
      const acesa = Math.max(0, Math.min(1, noite * 1.3));
      MAT.janela.emissiveIntensity = acesa * 1.05; MAT.janelaQuente.emissiveIntensity = acesa * 1.25;
      MAT.lampada.emissiveIntensity = 0.15 + acesa * 2.2;
      MAT.janela.color.setHex(acesa > 0.3 ? 0x6a78a0 : 0x8fd0f7);
      MAT.pocaLuz.visible = acesa > 0.05; MAT.pocaLuz.opacity = acesa;
      api.aoMudar?.(H, noite);
    },
    // a luz do sol segue o jogador (sombra só em volta dele), andando de texel em texel: a borda da sombra não treme
    seguir(x, z) {
      const t = (META * 2) / sol.shadow.mapSize.x;
      alvo.set(x, 0, z);
      const u = Math.round(alvo.dot(dirX) / t) * t - alvo.dot(dirX), v = Math.round(alvo.dot(dirY) / t) * t - alvo.dot(dirY);
      alvo.addScaledVector(dirX, u).addScaledVector(dirY, v);
      sol.position.copy(alvo).addScaledVector(dirSol, 90);
      sol.target.position.copy(alvo);
      esfera.position.set(x, 0, z); estrelas.position.set(x, 0, z);
      ceuNuvens.position.set(x, 0, z); ceuNuvens.rotation.y = performance.now() * 0.000004; // viajam bem devagar
    },
  };
  api.hora(10);
  return api;
}
