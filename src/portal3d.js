// Cena de entrada do portal, no capricho "ultra realista": a mesma escola Educarte, o ônibus e o
// Rabisco aprovado, agora com luz de fim de manhã (sol quente + o próprio céu como luz ambiente),
// materiais físicos (tinta com verniz, vidro que reflete o céu, borracha, metal), grama com tufos,
// árvores frondosas, estacionamento, nuvens macias e neblina de distância.
//
// O Rabisco (src/motor3d/rabisco3d.js) entra como está: nada da anatomia nem do material dele muda.
// Só o entorno ganha realismo. Os objetos de objetos.js também não são editados: aqui eles são
// "revestidos" (troca de material na cópia montada para esta cena) e ganham detalhes extras.
//
// Leve no celular: carregado sob demanda pelo app.js (a foto pré-renderizada da cena aparece antes),
// sombras menores, menos tufos de grama, pausa quando o painel de jogos cobre a tela.

import { THREE, COR3D, carregarTextura, aleatorio, texturaCanvas } from "./motor3d/toon.js";
import { escolaEducarte3D, onibus3D, sombraBlob, particulasAmbiente } from "./motor3d/objetos.js";
import { Rabisco3D } from "./motor3d/rabisco3d.js";

const G = THREE;
const SOL = new G.Vector3(-20, 30, 24).normalize();

// ------------------------------------------------------------------ céu (shader barato, sem textura)
// Degradê zênite → horizonte, brilho em volta do sol e um "chão" esverdeado abaixo da linha do horizonte
// (só aparece no reflexo dos vidros). `exibir` converte para sRGB quando vai direto para a tela.
function materialCeu(exibir) {
  const lin = (h) => new G.Color(h); // cores em espaço linear (o three converte do hex sRGB)
  return new G.ShaderMaterial({
    side: G.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: {
      zenite: { value: lin(0x2f7fd6) }, meio: { value: lin(0x7fbcf0) }, horizonte: { value: lin(0xe4f3ff) },
      chao: { value: lin(0x6f8f4a) }, sol: { value: SOL.clone() }, corSol: { value: lin(0xfff1d0) },
      exibir: { value: exibir ? 1 : 0 },
    },
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }",
    fragmentShader: `
      uniform vec3 zenite, meio, horizonte, chao, sol, corSol; uniform float exibir; varying vec3 vD;
      void main(){
        vec3 d = normalize(vD);
        float h = d.y;
        vec3 c = mix(horizonte, meio, smoothstep(0.0, 0.18, h));
        c = mix(c, zenite, smoothstep(0.15, 0.85, h));
        c = mix(c, chao, smoothstep(0.0, -0.08, h));
        float s = max(dot(d, normalize(sol)), 0.0);
        c += corSol * (pow(s, 900.0) * 6.0 + pow(s, 28.0) * 0.32 + pow(s, 5.0) * 0.08);
        if (exibir > 0.5) c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

// ------------------------------------------------------------------ texturas desenhadas em canvas
function texturaGrama() {
  const t = texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#5fa83a"; c.fillRect(0, 0, w, h);
    const r = aleatorio(31);
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, l = 3 + r() * 7;
      const v = 0.75 + r() * 0.5;
      c.strokeStyle = `rgb(${Math.round(70 * v)},${Math.round(150 * v)},${Math.round(45 * v)})`;
      c.lineWidth = 1 + r();
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 3, y - l); c.stroke();
    }
  }, { repetir: true });
  return t;
}
function texturaAsfalto() {
  return texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#55595f"; c.fillRect(0, 0, w, h);
    const r = aleatorio(12);
    for (let i = 0; i < 5000; i++) {
      const v = 60 + r() * 60;
      c.fillStyle = `rgba(${v},${v},${v + 4},0.55)`;
      c.fillRect(r() * w, r() * h, 1.4, 1.4);
    }
  }, { repetir: true });
}
function texturaNuvem(semente) {
  return texturaCanvas(256, 128, (c, w, h) => {
    const r = aleatorio(semente);
    for (let i = 0; i < 22; i++) {
      const x = w * (0.18 + r() * 0.64), y = h * (0.42 + r() * 0.3), raio = h * (0.16 + r() * 0.22);
      const g = c.createRadialGradient(x, y - raio * 0.3, raio * 0.1, x, y, raio);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.6, "rgba(246,250,255,0.75)");
      g.addColorStop(1, "rgba(225,236,248,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, raio, 0, Math.PI * 2); c.fill();
    }
  }, { anisotropia: 1 });
}
// ------------------------------------------------------------------ geometria: juntar várias em uma (menos chamadas de desenho)
function juntar(lista) {
  const partes = lista.map(([geo, m, cor]) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    if (!g.attributes.color) {
      const cs = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { cs[i * 3] = cor.r; cs[i * 3 + 1] = cor.g; cs[i * 3 + 2] = cor.b; }
      g.setAttribute("color", new G.BufferAttribute(cs, 3));
    }
    return g;
  });
  const total = partes.reduce((s, g) => s + g.attributes.position.count, 0);
  const out = new G.BufferGeometry();
  for (const nome of ["position", "normal", "color"]) {
    const arr = new Float32Array(total * 3);
    let k = 0;
    for (const g of partes) { arr.set(g.attributes[nome].array, k); k += g.attributes[nome].array.length; }
    out.setAttribute(nome, new G.BufferAttribute(arr, 3));
  }
  return out;
}
const mat4 = (x, y, z, sx = 1, sy = sx, sz = sx, ry = 0) =>
  new G.Matrix4().compose(new G.Vector3(x, y, z), new G.Quaternion().setFromEuler(new G.Euler(0, ry, 0)), new G.Vector3(sx, sy, sz));

// Copa "fofa": icosaedro com os vértices empurrados por ruído e cor mais escura embaixo (sombra interna)
function bolaFolhas(r, rnd, base) {
  const geo = new G.IcosahedronGeometry(r, 3).toNonIndexed();
  const p = geo.attributes.position;
  const fx = rnd() * 10, fz = rnd() * 10;
  const mapa = new Map();
  const nor = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const chave = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    if (!mapa.has(chave)) {
      const n = Math.sin(x * 2.1 + fx) * Math.cos(z * 1.9 + fz) * Math.sin(y * 2.3) * 0.16 + (rnd() - 0.5) * 0.12;
      mapa.set(chave, 1 + n);
    }
    const f = mapa.get(chave);
    p.setXYZ(i, x * f, y * f * 0.86, z * f);
    // normal suave (da esfera original): a copa fica macia em vez de facetada
    const l = Math.hypot(x, y / 0.86, z) || 1;
    nor[i * 3] = x / l; nor[i * 3 + 1] = y / 0.86 / l; nor[i * 3 + 2] = z / l;
  }
  geo.setAttribute("normal", new G.BufferAttribute(nor, 3));
  const cs = new Float32Array(p.count * 3);
  const c = new G.Color();
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) / r + 1) / 2; // 0 embaixo, 1 em cima
    c.copy(base).multiplyScalar(0.42 + t * 0.7);
    cs[i * 3] = c.r; cs[i * 3 + 1] = c.g; cs[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new G.BufferAttribute(cs, 3));
  return geo;
}

// ------------------------------------------------------------------ "revestir": materiais físicos nos objetos de desenho animado
const VIDRO = 0x9be7ff;
function revestir(raiz, { pintura = {}, vidro, envMapIntensity = 0.55 } = {}) {
  const cache = new Map();
  raiz.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    // casca preta do contorno de desenho: some (o realismo vem da luz)
    if (m.isMeshBasicMaterial && m.side === G.BackSide && !m.map) { o.visible = false; return; }
    if (!cache.has(m)) {
      let novo = m;
      if (m.isMeshBasicMaterial && m.map) {
        novo = m.clone(); novo.toneMapped = false; // logos: cor da marca exata, sem o filtro de cinema
        if (m.side !== G.DoubleSide) decalque(novo); // a bandeira (dois lados, solta no ar) não é adesivo
      } else if (m.isMeshToonMaterial) {
        const hex = m.color.getHex();
        if (hex === VIDRO) novo = vidro;
        else {
          const extra = pintura[hex] || {};
          const p = {
            color: m.color.clone(), map: m.map || null, transparent: m.transparent, opacity: m.opacity,
            vertexColors: m.vertexColors, side: m.side, roughness: 0.66, metalness: 0, envMapIntensity,
            ...extra,
          };
          if (hex === 0x333333) Object.assign(p, { color: new G.Color(0x1b1b1d), roughness: 0.9 }); // pneu
          if (hex === COR3D.tinta) Object.assign(p, { roughness: 0.45 });
          if (hex === 0xb0662e) Object.assign(p, { roughness: 0.5, color: new G.Color(0x9c5a2a) }); // porta de madeira envernizada
          if (hex === 0xe8ddc8) Object.assign(p, { roughness: 0.95 }); // pedras do caminho
          novo = p.clearcoat ? new G.MeshPhysicalMaterial(p) : new G.MeshStandardMaterial(p);
        }
      }
      cache.set(m, novo);
    }
    o.material = cache.get(m);
    o.receiveShadow = true;
    if (o.material.userData.decalque) o.renderOrder = Math.max(o.renderOrder, 2);
  });
}
// Logo/adesivo colado numa superfície: sempre "ganha" da parede/placa atrás (deslocamento de polígono
// em unidades do próprio buffer de profundidade, vale em qualquer aparelho), não escreve profundidade
// (o retângulo transparente da imagem não recorta nada) e não projeta sombra quadrada.
function decalque(m) {
  m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -8;
  m.depthWrite = false;
  m.userData.decalque = true;
  return m;
}
const ehDecalque = (o) => !!o.material?.userData?.decalque;
// retângulo de cantos redondos (placas)
function cantos(w, h, r) {
  const f = new G.Shape();
  f.moveTo(-w / 2 + r, -h / 2); f.lineTo(w / 2 - r, -h / 2); f.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  f.lineTo(w / 2, h / 2 - r); f.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); f.lineTo(-w / 2 + r, h / 2);
  f.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); f.lineTo(-w / 2, -h / 2 + r); f.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return f;
}

// ------------------------------------------------------------------ cena
export function iniciarCena(canvas, { raiz = ".", leve = false, quieto = false, foto = false, aoPronto = () => {} } = {}) {
  const renderer = new G.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: foto });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, foto ? 2 : leve ? 1.5 : 2));
  renderer.outputColorSpace = G.SRGBColorSpace;
  renderer.toneMapping = G.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = G.PCFSoftShadowMap;

  const cena = new G.Scene();
  const corNevoa = new G.Color(0xd9ecf7);
  cena.fog = new G.Fog(corNevoa, 55, 230);
  // perto = 1 (nada da cena fica a menos de ~12 m da câmera): mais precisão de profundidade para as peças finas
  const camera = new G.PerspectiveCamera(40, 16 / 9, 1, 900);

  // céu visível + o mesmo céu como luz ambiente e reflexo (PMREM: uma vez só, na abertura)
  const ceu = new G.Mesh(new G.SphereGeometry(500, 32, 16), materialCeu(true));
  ceu.frustumCulled = false;
  ceu.renderOrder = -10;
  cena.add(ceu);
  const cenaAmbiente = new G.Scene();
  cenaAmbiente.add(new G.Mesh(new G.SphereGeometry(50, 32, 16), materialCeu(false)));
  const pmrem = new G.PMREMGenerator(renderer);
  const ambiente = pmrem.fromScene(cenaAmbiente, 0.02, 0.1, 200);
  cena.environment = ambiente.texture;
  pmrem.dispose();

  // sol quente de fim de manhã + um preenchimento frio do céu
  const sol = new G.DirectionalLight(0xfff0d6, 3.4);
  sol.position.copy(SOL).multiplyScalar(60);
  sol.castShadow = true;
  const ms = foto ? 4096 : leve ? 1024 : 2048;
  sol.shadow.mapSize.set(ms, ms);
  Object.assign(sol.shadow.camera, { left: -34, right: 34, top: 28, bottom: -24, near: 10, far: 140 });
  sol.shadow.camera.updateProjectionMatrix();
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.05;
  cena.add(sol, sol.target, new G.HemisphereLight(0xcfe6ff, 0x5c7a34, 0.2));

  const texLogo = carregarTextura(`${raiz}/assets/marca/logos/azul-icone-rosa.png`);
  const texIcone = carregarTextura(`${raiz}/assets/marca/logos/icone-branco.png`);
  const rnd = aleatorio(21);

  // ---------------- chão: grama com manchas de cor (vértice) e textura de folhinhas
  const texG = texturaGrama();
  texG.repeat.set(70, 70);
  const geoChao = new G.PlaneGeometry(460, 460, 48, 48);
  geoChao.rotateX(-Math.PI / 2);
  {
    const p = geoChao.attributes.position, cs = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const n = Math.sin(x * 0.07 + 1.3) * Math.cos(z * 0.09 + 0.4) * 0.5 + Math.sin(x * 0.23 + z * 0.17) * 0.25;
      const f = 0.86 + n * 0.16;
      cs[i * 3] = 0.93 * f; cs[i * 3 + 1] = 1.0 * f; cs[i * 3 + 2] = 0.82 * f;
    }
    geoChao.setAttribute("color", new G.BufferAttribute(cs, 3));
  }
  const chao = new G.Mesh(geoChao, new G.MeshStandardMaterial({ map: texG, vertexColors: true, roughness: 1, color: 0xd8f0b8, envMapIntensity: 0.4 }));
  chao.receiveShadow = true;
  cena.add(chao);

  // ---------------- morros ao fundo (a neblina dá a distância)
  for (let i = 0; i < 8; i++) {
    const r = 45 + rnd() * 35;
    const m = new G.Mesh(new G.SphereGeometry(r, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new G.MeshStandardMaterial({ color: i % 2 ? 0x6fae4a : 0x86bf5a, roughness: 1, envMapIntensity: 0.5 }));
    m.scale.y = 0.32 + rnd() * 0.15;
    m.position.set(-150 + i * 44 + rnd() * 10, -1, -110 - rnd() * 40);
    cena.add(m);
  }

  // ---------------- escola: revestida com tinta, vidro espelhado e telhas
  // Só nesta cena: prédio todo azul-claro, todos os telhados rosa e os dois lápis da entrada laranja
  // (nos jogos a escola continua com as cores de sempre). A placa segue branca com a logo de texto azul
  // e ícone rosa: contrasta com a parede azul-clara.
  const AZUL_CLARO = 0x9ad6f8, TELHA_ROSA = COR3D.rosa;
  const vidro = new G.MeshStandardMaterial({ color: 0x8fb7cc, roughness: 0.05, metalness: 0.9, envMapIntensity: 1.5 });
  const escola = escolaEducarte3D(texLogo, texIcone, {
    paredes: AZUL_CLARO, alaEsquerda: AZUL_CLARO, alaDireita: AZUL_CLARO, torre: AZUL_CLARO,
    telhado: TELHA_ROSA, telhadoEsquerda: TELHA_ROSA, telhadoDireita: TELHA_ROSA,
    lapis: [COR3D.laranja, COR3D.laranja],
  });
  escola.position.set(3, 0, -6);
  revestir(escola, {
    vidro,
    pintura: {
      [COR3D.ciano]: { roughness: 0.42 }, [COR3D.laranja]: { roughness: 0.42 }, [COR3D.roxo]: { roughness: 0.42 },
      [AZUL_CLARO]: { roughness: 0.88 },
    },
  });
  escola.traverse((o) => { if (o.isMesh && o.visible && !ehDecalque(o)) o.castShadow = true; });
  cena.add(escola);
  // calçada clara na frente do prédio
  const calcada = new G.Mesh(new G.BoxGeometry(37, 0.12, 1.8), new G.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.92, envMapIntensity: 0.7 }));
  calcada.position.set(3, 0.06, -0.9);
  calcada.receiveShadow = true;
  cena.add(calcada);

  // ---------------- cerca-viva e canteiros de flores na frente da escola (uma malha só)
  {
    const partes = [];
    const verde = new G.Color(0x3f8f2e);
    for (const [x0, x1] of [[-14.5, -1.4], [7.4, 17]]) {
      for (let x = x0; x <= x1; x += 1.05) {
        const r = 0.62 + rnd() * 0.18;
        partes.push([bolaFolhas(r, rnd, verde.clone().offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.05)), mat4(x, r * 0.75, -2.55 + (rnd() - 0.5) * 0.2, 1, 1, 1, rnd() * 6), null]);
      }
    }
    const cerca = new G.Mesh(juntar(partes), new G.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, envMapIntensity: 0.45 }));
    cerca.castShadow = cerca.receiveShadow = true;
    cena.add(cerca);
  }

  // ---------------- árvores frondosas (todas as copas numa malha, todos os troncos em outra)
  {
    const copas = [], troncos = [];
    const lugares = [
      [-24, -4, 1], [-21, 6, 0.85], [23, -3, 1.05], [27, 7, 0.85], [-31, 13, 0.8], [33, 15, 0.75],
      [-38, -12, 1.2], [40, -10, 1.1], [-12, -20, 1.1], [16, -21, 1.2], [-52, 2, 1], [55, 4, 1],
      [-28, -26, 1.3], [32, -28, 1.3], [0, -34, 1.4], [-60, -20, 1.2], [62, -22, 1.2],
    ];
    const casca = new G.Color(0x6b4a33);
    for (const [x, z, e] of lugares) {
      const h = 5.2 * e;
      troncos.push([new G.CylinderGeometry(0.35 * e, 0.6 * e, h, 9), mat4(x, h / 2, z), casca]);
      const base = new G.Color().setHSL(0.27 + (rnd() - 0.5) * 0.04, 0.55, 0.36 + rnd() * 0.05);
      const bolas = [[0, 7.6, 0, 3.4], [2.3, 6.6, 0.7, 2.6], [-2.2, 6.8, -0.4, 2.7], [0.3, 9.6, 0.2, 2.5], [0, 6.6, 2.1, 2.4], [-0.6, 6.9, -2, 2.3]];
      for (const [bx, by, bz, br] of bolas) {
        copas.push([bolaFolhas(br * e, rnd, base), mat4(x + bx * e, by * e, z + bz * e, 1, 1, 1, rnd() * 6), null]);
      }
    }
    const copa = new G.Mesh(juntar(copas), new G.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, envMapIntensity: 0.45 }));
    const tronco = new G.Mesh(juntar(troncos), new G.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    for (const m of [copa, tronco]) { m.castShadow = m.receiveShadow = true; cena.add(m); }
  }

  // ---------------- estacionamento e ônibus escolar com acabamento de carro de verdade
  const posBus = new G.Vector3(-14, 0, 9), rotBus = -1.1;
  {
    const texA = texturaAsfalto();
    texA.repeat.set(3, 5);
    const patio = new G.Mesh(new G.PlaneGeometry(10, 18), new G.MeshStandardMaterial({ map: texA, roughness: 0.88, envMapIntensity: 0.6 }));
    patio.rotation.set(-Math.PI / 2, 0, rotBus);
    patio.position.set(posBus.x, 0.025, posBus.z);
    patio.receiveShadow = true;
    cena.add(patio);
    // meio-fio e faixas brancas da vaga
    const guia = new G.MeshStandardMaterial({ color: 0xdedbd3, roughness: 0.9 });
    const faixa = new G.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.7 });
    const grupoVaga = new G.Group();
    for (const lado of [-1, 1]) {
      const m = new G.Mesh(new G.BoxGeometry(0.35, 0.22, 18.2), guia);
      m.position.set(lado * 5.1, 0.11, 0); m.receiveShadow = true; m.castShadow = true;
      const f = new G.Mesh(new G.PlaneGeometry(0.16, 15), faixa);
      f.rotation.x = -Math.PI / 2; f.position.set(lado * 3.6, 0.035, 0);
      grupoVaga.add(m, f);
    }
    grupoVaga.rotation.y = rotBus;
    grupoVaga.position.copy(posBus);
    cena.add(grupoVaga);
  }
  const bus = onibus3D(texLogo);
  revestir(bus, {
    vidro: new G.MeshStandardMaterial({ color: 0x5f7f90, roughness: 0.04, metalness: 0.95, envMapIntensity: 1.6 }),
    pintura: {
      [COR3D.amarelo]: { roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, color: new G.Color(0xffc21a) },
      [COR3D.tinta]: { roughness: 0.4 },
    },
  });
  {
    const metal = new G.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.25, metalness: 1, envMapIntensity: 1.2 });
    const preto = new G.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.55 });
    const vidroFrente = new G.MeshStandardMaterial({ color: 0x46606e, roughness: 0.03, metalness: 0.95, envMapIntensity: 1.7 });
    const add = (geo, m, x, y, z, ry = 0, rx = 0) => { const o = new G.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, 0); o.castShadow = true; o.receiveShadow = true; bus.add(o); return o; };
    add(new G.PlaneGeometry(4.3, 2.1), vidroFrente, 0, 4.75, 7.02);                       // para-brisa
    add(new G.PlaneGeometry(4.0, 1.7), vidroFrente, 0, 4.75, -7.02, Math.PI);             // vidro traseiro
    add(new G.BoxGeometry(5.3, 0.55, 0.45), preto, 0, 1.35, 7.15);                         // para-choques
    add(new G.BoxGeometry(5.3, 0.55, 0.45), preto, 0, 1.35, -7.15);
    add(new G.BoxGeometry(4.7, 0.18, 13.4), new G.MeshStandardMaterial({ color: 0xf6f2e6, roughness: 0.5 }), 0, 6.15, 0); // teto claro
    const farol = new G.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3c4, emissiveIntensity: 1.4, roughness: 0.1 });
    const lanterna = new G.MeshStandardMaterial({ color: 0xff3a2a, emissive: 0xff2010, emissiveIntensity: 0.8, roughness: 0.2 });
    for (const lado of [-1, 1]) {
      add(new G.CircleGeometry(0.36, 20), farol, lado * 1.8, 2.25, 7.03);
      add(new G.CircleGeometry(0.3, 20), lanterna, lado * 1.9, 2.25, -7.03, Math.PI);
      add(new G.BoxGeometry(0.12, 0.7, 0.4), preto, lado * 2.85, 4.9, 6.6);                // retrovisores
      for (const z of [-4.5, 4.5]) {
        add(new G.CylinderGeometry(0.55, 0.55, 0.06, 24), metal, lado * 2.72, 1.1, z, 0, 0).rotation.z = Math.PI / 2; // calotas
      }
    }
  }
  // Logo do ônibus: no objeto original ela fica no MESMO plano da faixa preta (x = 2,53 nos dois) e por
  // cima das janelas (2,52): a placa de vidro/tinta e a logo disputavam o mesmo pixel e a logo piscava.
  // Aqui ela sai dali e vai para uma plaquinha branca com borda ciano, entre a faixa e as janelas.
  bus.traverse((o) => { if (o.isMesh && o.material?.map === texLogo) o.visible = false; });
  {
    const PZ = 1.5, PY = 3.0;
    const borda = new G.Mesh(new G.ExtrudeGeometry(cantos(3.5, 1.5, 0.36), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 2 }),
      new G.MeshPhysicalMaterial({ color: COR3D.ciano, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 0.6 }));
    const fundo = new G.Mesh(new G.ExtrudeGeometry(cantos(3.2, 1.22, 0.28), { depth: 0.04, bevelEnabled: false }),
      new G.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, envMapIntensity: 0.5 }));
    const logo = new G.Mesh(new G.PlaneGeometry(2.3, 2.3 * 252 / 481), decalque(new G.MeshBasicMaterial({ map: texLogo, transparent: true, toneMapped: false })));
    for (const [m, x] of [[borda, 2.53], [fundo, 2.6], [logo, 2.66]]) {
      m.rotation.y = Math.PI / 2; // a frente da forma (+z) vira para o lado do ônibus (+x)
      m.position.set(x, PY, PZ);
      m.receiveShadow = !ehDecalque(m);
      bus.add(m);
    }
    logo.renderOrder = 2;
  }
  bus.scale.setScalar(0.75);
  bus.rotation.y = rotBus;
  bus.position.copy(posBus);
  bus.traverse((o) => { if (o.isMesh && o.visible && !ehDecalque(o)) o.castShadow = true; });
  cena.add(bus);
  const sombraBus = sombraBlob(1, 0.45);
  sombraBus.scale.set(3.2, 7.2, 1);
  sombraBus.rotation.z = rotBus;
  sombraBus.position.set(posBus.x, 0.05, posBus.z);
  cena.add(sombraBus);

  // ---------------- tufos de grama e florzinhas no gramado da frente (instanciados: 2 chamadas de desenho)
  {
    const lamina = (() => {
      const pos = [], cor = [];
      const base = new G.Color(0x3f7f26), ponta = new G.Color(0x9fd45a);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.3, inc = 0.18 + (k % 2) * 0.12, alt = 0.38 + (k % 3) * 0.1;
        const cx = Math.cos(a) * 0.05, cz = Math.sin(a) * 0.05, px = Math.cos(a + 1.57) * 0.022, pz = Math.sin(a + 1.57) * 0.022;
        const tx = Math.cos(a) * inc, tz = Math.sin(a) * inc;
        pos.push(cx - px, 0, cz - pz, cx + px, 0, cz + pz, cx + tx, alt, cz + tz);
        cor.push(base.r, base.g, base.b, base.r, base.g, base.b, ponta.r, ponta.g, ponta.b);
      }
      const g = new G.BufferGeometry();
      g.setAttribute("position", new G.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new G.Float32BufferAttribute(cor, 3));
      g.computeVertexNormals();
      return g;
    })();
    const n = leve ? 2600 : 6500;
    const tufos = new G.InstancedMesh(lamina, new G.MeshStandardMaterial({ vertexColors: true, side: G.DoubleSide, roughness: 0.9, envMapIntensity: 0.4 }), n);
    const o = new G.Object3D();
    const livre = (x, z) => {
      if (z < 0.5) return false;                                           // calçada e cerca
      if (Math.abs(x - 3) < 1.6 && z < 8) return false;                    // caminho de pedras
      const dx = x - posBus.x, dz = z - posBus.z;                          // estacionamento (girado)
      const lx = dx * Math.cos(rotBus) - dz * Math.sin(rotBus), lz = dx * Math.sin(rotBus) + dz * Math.cos(rotBus);
      return !(Math.abs(lx) < 5.4 && Math.abs(lz) < 9.4);
    };
    let i = 0;
    while (i < n) {
      const x = (rnd() - 0.5) * 70, z = rnd() * 24;
      if (!livre(x, z)) continue;
      o.position.set(x, 0, z);
      o.rotation.y = rnd() * 6.3;
      o.scale.set(0.4 + rnd() * 0.35, 0.35 + rnd() * 0.45, 0.4 + rnd() * 0.35);
      o.updateMatrix();
      tufos.setMatrixAt(i, o.matrix);
      const c = new G.Color().setHSL(0.24 + (rnd() - 0.5) * 0.05, 0.5, 0.42 + rnd() * 0.12);
      tufos.setColorAt(i, c);
      i++;
    }
    tufos.receiveShadow = true;
    cena.add(tufos);
    const nf = leve ? 60 : 110;
    const flores = new G.InstancedMesh(new G.IcosahedronGeometry(0.07, 1), new G.MeshStandardMaterial({ roughness: 0.6 }), nf);
    const coresFlor = [0xffffff, 0xffe04a, 0xffffff, 0xff9cc8, 0xfff3a0];
    for (let k = 0; k < nf;) {
      const x = (rnd() - 0.5) * 60, z = rnd() * 22;
      if (!livre(x, z)) continue;
      o.position.set(x, 0.16 + rnd() * 0.08, z);
      o.scale.setScalar(0.8 + rnd() * 0.6);
      o.rotation.y = 0;
      o.updateMatrix();
      flores.setMatrixAt(k, o.matrix);
      flores.setColorAt(k, new G.Color(coresFlor[k % coresFlor.length]));
      k++;
    }
    cena.add(flores);
  }

  // ---------------- nuvens macias (sprites com textura desenhada; não pesam)
  const nuvens = [];
  for (let i = 0; i < 9; i++) {
    const s = new G.Sprite(new G.SpriteMaterial({ map: texturaNuvem(40 + i), transparent: true, depthWrite: false, fog: false, toneMapped: false, opacity: 0.92 }));
    const larg = 60 + rnd() * 60;
    s.scale.set(larg, larg * 0.42, 1);
    s.position.set(-220 + i * 55 + rnd() * 20, 55 + rnd() * 45, -230 - rnd() * 60);
    s.userData.vel = 0.6 + rnd() * 0.8;
    nuvens.push(s);
    cena.add(s);
  }

  // ---------------- pólen no ar (só em aparelho forte)
  const polen = leve || quieto ? null : particulasAmbiente(90, { cor: 0xfff4c2, tamanho: 0.08, area: [44, 7, 26], velocidade: 0.12 });
  if (polen) { polen.position.set(0, 0.2, 0); cena.add(polen); }

  // ---------------- Rabisco aprovado, acenando na frente da escola (sem mexer nele)
  const rabisco = new Rabisco3D({ raiz, altura: 4.6 });
  rabisco.grupo.position.set(-4.5, 0, 12.5);
  rabisco.grupo.rotation.y = 0.35;
  cena.add(rabisco.grupo);
  const sombraR = sombraBlob(1.5, 0.42);
  sombraR.position.set(-4.5, 0.04, 12.5);
  cena.add(sombraR);

  // ------------------------------------------------------------------ tela, laço e controles
  const alvoCam = new G.Vector3(-1, 2.6, 4);
  const alvo = new G.Vector3();
  function ajustarTela() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    if (parado) desenhar(0);
  }
  addEventListener("resize", ajustarTela);

  const relogio = new G.Clock();
  let modoRabisco = "acenar", modoAte = 0, t = 0;
  let pausado = false, lento = false, impar = false, raf = 0, parado = false;
  function posicionarCamera() {
    const tc = quieto || foto ? 0 : t;
    const longe = camera.aspect < 0.9 ? 1.6 : 1;
    camera.position.set(-3 + Math.sin(tc * 0.12) * 4, 5.2 + Math.sin(tc * 0.2) * 0.3, 4 + 25 * longe);
    // em pé (celular/tablet) a câmera mira um pouco mais baixo: a cena sobe e o Rabisco fica acima do
    // destaque da Rabiscolândia e das idades, que ocupam o pé da tela
    alvo.copy(alvoCam);
    if (longe > 1) alvo.y -= 2.4;
    camera.lookAt(alvo);
  }
  function desenhar(dt) {
    if (t > modoAte) modoRabisco = "acenar";
    rabisco.atualizar(dt, { modo: modoRabisco });
    if (!quieto) {
      rabisco.grupo.rotation.y = 0.35 + Math.sin(t * 0.5) * 0.08;
      escola.userData.balanco.rotation.x = Math.sin(t * 1.6) * 0.35;
      escola.userData.bandeira.rotation.y = Math.sin(t * 2) * 0.12;
      for (const s of nuvens) { s.position.x += s.userData.vel * dt; if (s.position.x > 260) s.position.x = -260; }
      polen?.userData.atualizar(dt);
    }
    posicionarCamera();
    renderer.render(cena, camera);
  }
  function quadro() {
    raf = 0;
    if (pausado) return;
    raf = requestAnimationFrame(quadro);
    const dt = Math.min(relogio.getDelta(), 1 / 20);
    if (!foto) t += dt;
    // painel aberto no computador: metade dos quadros (a lista rola mais solta)
    if (lento && (impar = !impar)) return;
    desenhar(dt);
  }

  // movimento reduzido: desenha só quando precisa (abertura, comemoração e mudança de tamanho)
  let quadrosQuietos = 0;
  function quadroQuieto() {
    const dt = Math.min(relogio.getDelta(), 1 / 20);
    t += dt;
    desenhar(dt);
    if (--quadrosQuietos > 0) requestAnimationFrame(quadroQuieto);
  }
  function animarUmPouco(n) { const ia = quadrosQuietos > 0; quadrosQuietos = Math.max(quadrosQuietos, n); if (!ia) requestAnimationFrame(quadroQuieto); }

  ajustarTela();
  if (foto) window.__portal = { renderer, cena, sol, camera };
  let avisou = false;
  const pronto = () => {
    if (avisou) return;
    avisou = true;
    desenhar(0);
    requestAnimationFrame(() => { aoPronto(); window.__cenaPronta = true; });
  };
  // espera as texturas (Rabisco, logos) para aparecer já completa; no máximo 5 s
  const gerente = G.DefaultLoadingManager;
  const antes = gerente.onLoad;
  gerente.onLoad = () => { antes?.(); pronto(); };
  setTimeout(pronto, 5000);

  if (quieto) { parado = true; animarUmPouco(30); } else raf = requestAnimationFrame(quadro);

  return {
    comemorar() {
      modoRabisco = "comemorar"; modoAte = t + 1.6;
      if (quieto) animarUmPouco(100);
    },
    // pausa total (o painel cobre a tela no celular) e "meio ritmo" (painel aberto no computador)
    pausar(sim) {
      if (quieto || sim === pausado) return;
      pausado = sim;
      if (!sim && !raf) { relogio.getDelta(); raf = requestAnimationFrame(quadro); }
    },
    lento(sim) { lento = sim; },
  };
}
