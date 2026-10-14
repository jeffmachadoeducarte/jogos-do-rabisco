// Rabiscópolis: céu, sol, luz ambiente e neblina, com dia e noite. hora(h) de 0 a 24 muda tudo junto:
// cor do céu (degradê), posição e força do sol, estrelas e lua de noite, e as janelas/postes que acendem
// (materiais MAT de base3d.js com emissiveIntensity). Nenhuma luz extra: as "luzes" da noite são emissivas.

import { THREE, MAT } from "./base3d.js";

const PALETAS = [
  // hora, topo, horizonte, neblina, sol (cor), força do sol, luz ambiente
  [0, 0x0a1440, 0x23336e, 0x1d2a58, 0x8fa8ff, 0.3, 0.8],
  [5.5, 0x1d2a6e, 0xf2a37a, 0x6b6a9a, 0xffb27a, 0.6, 0.7],
  [7.5, 0x4aa8f0, 0xdff2ff, 0xcfeaff, 0xfff0d6, 2.4, 1.25],
  [12, 0x3d9ae8, 0xe6f6ff, 0xd8efff, 0xfff6e6, 2.8, 1.35],
  [16.5, 0x4aa0ea, 0xfde6c8, 0xf0e2cf, 0xffe2b8, 2.4, 1.2],
  [18.5, 0x3a3f8f, 0xff9a6a, 0xb3889a, 0xff9a5a, 0.9, 0.8],
  [20, 0x101b4f, 0x2c3a78, 0x26346a, 0x9fb0ff, 0.35, 0.8],
  [24, 0x0a1440, 0x23336e, 0x1d2a58, 0x8fa8ff, 0.3, 0.8],
];
const c1 = new THREE.Color(), c2 = new THREE.Color();
function misturar(h, i) {
  let k = 0;
  while (k < PALETAS.length - 2 && PALETAS[k + 1][0] <= h) k++;
  const a = PALETAS[k], b = PALETAS[k + 1];
  const f = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0])));
  if (i >= 5) return a[i] + (b[i] - a[i]) * f;
  return c1.setHex(a[i]).lerp(c2.setHex(b[i]), f).clone();
}

export function criarCeu(cena, { sombra = 1024 } = {}) {
  const uni = { topo: { value: new THREE.Color() }, horizonte: { value: new THREE.Color() }, dirSol: { value: new THREE.Vector3(0.5, 0.55, 0.65).normalize() }, noite: { value: 0 } };
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: uni,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform vec3 topo; uniform vec3 horizonte; uniform vec3 dirSol; uniform float noite; varying vec3 vP;
      void main(){ float h = clamp(vP.y*1.5, 0.0, 1.0); vec3 c = mix(horizonte, topo, pow(h,0.6));
        float s = max(dot(normalize(vP), dirSol), 0.0); c += vec3(1.0,0.9,0.7) * (pow(s, 600.0) * 1.6 + pow(s, 14.0) * 0.2) * (1.0 - noite);
        vec3 l = normalize(vec3(-0.5, 0.6, -0.6)); float m = max(dot(normalize(vP), l), 0.0); c += vec3(1.0,0.97,0.85) * smoothstep(0.9993, 0.9996, m) * noite;
        gl_FragColor = vec4(c, 1.0); }`,
  }));
  esfera.renderOrder = -10;
  cena.add(esfera);
  // estrelas (um Points só)
  const n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, y = 0.12 + Math.random() * 0.88, r = Math.sqrt(1 - y * y); pos.set([Math.cos(a) * r * 560, y * 560, Math.sin(a) * r * 560], i * 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const estrelas = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  cena.add(estrelas);

  const sol = new THREE.DirectionalLight(0xfff2dc, 2.6);
  sol.castShadow = sombra > 0;
  sol.shadow.mapSize.set(sombra || 512, sombra || 512);
  Object.assign(sol.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 170 });
  sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.05;
  const amb = new THREE.HemisphereLight(0xdff0ff, 0x7cbf5a, 1.3);
  cena.add(sol, sol.target, amb);
  cena.fog = new THREE.Fog(0xd8efff, 60, 140);

  let horaAtual = 10;
  const dirSol = new THREE.Vector3();
  const api = {
    sol, amb, esfera, estrelas,
    get horaAtual() { return horaAtual; },
    get noite() { return uni.noite.value; },
    hora(h) {
      horaAtual = ((h % 24) + 24) % 24;
      const H = horaAtual;
      uni.topo.value.copy(misturar(H, 1)); uni.horizonte.value.copy(misturar(H, 2));
      cena.fog.color.copy(misturar(H, 3));
      sol.color.copy(misturar(H, 4)); sol.intensity = misturar(H, 5); amb.intensity = misturar(H, 6);
      const dia = H >= 6 && H <= 18.5;
      // de noite a "luz" vem da lua: mesma direção alta, azulada
      const a = dia ? ((H - 6) / 12.5) * Math.PI : 0.8;
      dirSol.set(Math.cos(a) * 0.8, Math.max(0.35, Math.sin(a)), 0.55).normalize();
      uni.dirSol.value.copy(dirSol);
      const noite = H < 5.5 || H > 19.5 ? 1 : H < 7 ? 1 - (H - 5.5) / 1.5 : H > 18 ? (H - 18) / 1.5 : 0;
      uni.noite.value = noite;
      estrelas.material.opacity = noite * 0.9;
      amb.color.setHex(noite > 0.5 ? 0x8fa0e0 : 0xdff0ff); amb.groundColor.setHex(noite > 0.5 ? 0x2a3a5a : 0x7cbf5a);
      // janelas, lampiões e postes acendem
      const acesa = Math.max(0, Math.min(1, noite * 1.3));
      MAT.janela.emissiveIntensity = acesa * 1.1; MAT.janelaQuente.emissiveIntensity = acesa * 1.4;
      MAT.lampada.emissiveIntensity = 0.15 + acesa * 2.2;
      MAT.janela.color.setHex(acesa > 0.3 ? 0x5a6a90 : 0x9fd8ff);
      api.aoMudar?.(H, noite);
    },
    // a luz do sol segue o jogador (sombra só em volta dele)
    seguir(x, z) {
      sol.position.set(x + dirSol.x * 80, dirSol.y * 80, z + dirSol.z * 80);
      sol.target.position.set(x, 0, z);
      esfera.position.set(x, 0, z); estrelas.position.set(x, 0, z);
    },
  };
  api.hora(10);
  return api;
}
