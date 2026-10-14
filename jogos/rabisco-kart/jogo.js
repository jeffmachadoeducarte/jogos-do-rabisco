// Rabisco Kart: Grande Prêmio da Escola (6 a 8 anos)
// Corrida 3D no estilo Mario Kart. A matemática fica nos pórticos: passar pelo
// número certo da conta dá turbo. Errar não tira nada, só não ganha o turbo.

import { THREE, COR3D, toon, peca, texturaCanvas, aleatorio } from "../../src/motor3d/toon.js";
import { lapis3D, arvore3D, nuvem3D, morro3D, escola3D, onibus3D, livros3D, kart3D, pilotoLapis, texturaNumero, barreiraGiz } from "../../src/motor3d/objetos.js";
import { sons, musica, motor } from "../../src/motor/sons.js";
import { falar, preCarregarFalas, saudar, parabenizar, falarNome } from "../../src/motor/voz.js";
import "../../src/motor/familia.js"; // window.Familia: nome e foto da criança
import { criarCompanheiro3D } from "../../src/motor3d/companheiro3d.js";
import { criarPausa } from "../../src/motor/pausa.js";
import { ligarControle } from "../../src/motor/controle.js";
import { prepararCelular } from "../../src/motor/celular.js";
import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
import { modoAtual } from "./modos.js";
import { pistaAtual, PISTAS, decoracao, estrelas } from "./pistas.js";
import { botaoVoltar } from "../../src/motor/voltar.js";
import { criarRemapear } from "../../src/motor/remapear.js";
import { Jogadores, CODIGOS_J2, COR_J2 } from "../../src/motor/jogadores.js";
import { PARCEIROS, ESTILO_PARCEIRO } from "../../src/parceiros.js";

const RAIZ = "../..";
const MEIA_PISTA = 9;          // metade da largura do asfalto
const ZEBRA = 1.6;             // largura da zebra
const LIMITE_MURO = MEIA_PISTA + 11;
const PARC = { altura: 11, larguraMax: 30, prof: 8, outdoorAlt: 7, outdoorLarg: 17, pe: 4 }; // lojas parceiras na beira da pista (metros)
const MODO = modoAtual();      // contas, cores, onibus, ingles-jr, gp ou ingles (ver modos.js)
const VOLTAS = MODO.voltas;
const VMAX = MODO.vmax;
const TURBO = 1.6;
const AMOSTRAS = 1400;
const ALTURA_RABISCO = 4.1;   // Rabisco 3D oficial (altura em pé); sentado no kart ele é o destaque da tela
const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ Pista
const PISTA = pistaAtual();       // 1 a 10 (ver pistas.js): traçado, céu, grama e decoração
const TEMA = PISTA.cfg;
const PONTOS = PISTA.pontos;
const curva = new THREE.CatmullRomCurve3(PONTOS, true, "centripetal");
const COMPRIMENTO = curva.getLength();
const PASSO = COMPRIMENTO / AMOSTRAS;

const centro = [], tangente = [], lado = [];
for (let i = 0; i < AMOSTRAS; i++) {
  const u = i / AMOSTRAS;
  centro.push(curva.getPointAt(u));
  const t = curva.getTangentAt(u).setY(0).normalize();
  tangente.push(t);
  lado.push(new THREE.Vector3(t.z, 0, -t.x)); // aponta para a esquerda de quem dirige
}
const idx = (i) => ((i % AMOSTRAS) + AMOSTRAS) % AMOSTRAS;

function amostraMaisProxima(p, palpite, janela = 60) {
  let melhor = palpite, menor = Infinity;
  for (let k = -janela; k <= janela * 2; k++) {
    const i = idx(palpite + k);
    const d = (centro[i].x - p.x) ** 2 + (centro[i].z - p.z) ** 2;
    if (d < menor) { menor = d; melhor = i; }
  }
  return melhor;
}
function amostraGlobal(p) {
  let melhor = 0, menor = Infinity;
  for (let i = 0; i < AMOSTRAS; i += 2) {
    const d = (centro[i].x - p.x) ** 2 + (centro[i].z - p.z) ** 2;
    if (d < menor) { menor = d; melhor = i; }
  }
  return melhor;
}
const lateral = (p, i) => (p.x - centro[i].x) * lado[i].x + (p.z - centro[i].z) * lado[i].z;
const anguloDe = (v) => Math.atan2(v.x, v.z);
const difAngulo = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ------------------------------------------------------------------ Render
const canvas = $("cena");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
let dividida = false; // tela dividida (2 jogadores)
const semToque = navigator.maxTouchPoints === 0; // TV e computador de mesa: caminho mais leve (menos pixels e sombra mais barata)
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = semToque ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;

const cena = new THREE.Scene();
cena.fog = new THREE.Fog(TEMA.neblina, 220, 720);
const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 1600);

// Sem toque (TV): até 1,25× com uma tela e 1× dividida, e no máximo ~1920×1080 pixels desenhados
function ajustarPixelRatio(w, h) {
  const teto = dividida ? 1 : semToque ? 1.25 : 1.75;
  let dpr = Math.min(window.devicePixelRatio, teto);
  if (semToque) dpr *= Math.min(1, Math.sqrt((1920 * 1080) / (w * h * dpr * dpr)));
  renderer.setPixelRatio(dpr);
}
function ajustarTela() {
  const w = window.innerWidth, h = window.innerHeight;
  ajustarPixelRatio(w, h);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", ajustarTela);
ajustarTela();

// Céu em degradê
{
  const ceu = new THREE.Mesh(
    new THREE.SphereGeometry(1200, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { topo: { value: new THREE.Color(TEMA.ceu[0]) }, horizonte: { value: new THREE.Color(TEMA.ceu[1]) } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 topo; uniform vec3 horizonte; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6, 0.0, 1.0); gl_FragColor = vec4(mix(horizonte, topo, pow(h,0.7)), 1.0); }",
    }),
  );
  cena.add(ceu);
  cena.userData.ceu = ceu;
}

const sol = new THREE.DirectionalLight(TEMA.corLuz ?? 0xffffff, TEMA.luz);
sol.castShadow = true;
sol.shadow.mapSize.set(semToque ? 1024 : 2048, semToque ? 1024 : 2048);
Object.assign(sol.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 });
sol.shadow.bias = -0.0005;
sol.shadow.normalBias = 0.04;
cena.add(sol, sol.target);
cena.add(new THREE.HemisphereLight(TEMA.corLuz ?? 0xd6f3ff, 0x5aa83a, TEMA.ambiente ?? 1.6));
if (TEMA.estrelas) estrelas(cena);

// ------------------------------------------------------------------ Carregamento
const carregarImagem = (url) => new Promise((ok, erro) => {
  const im = new Image();
  im.onload = () => ok(im);
  im.onerror = erro;
  im.src = url;
});

// ------------------------------------------------------------------ Mundo
function construirMundo(img) {
  // Grama listrada (cortada), como nos jogos de kart
  const grama = texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = TEMA.grama[0]; c.fillRect(0, 0, w, h);
    c.fillStyle = TEMA.grama[1]; c.fillRect(0, 0, w, h / 2);
    c.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 300; i++) c.fillRect(Math.random() * w, Math.random() * h, 2, 3);
  }, { repetir: true });
  grama.repeat.set(90, 90);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), toon(0xffffff, { map: grama }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.set(30, 0, 120);
  chao.receiveShadow = true;
  cena.add(chao);

  // Asfalto, zebras e linha de chegada
  const asfalto = texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#6b7280"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const v = 90 + Math.random() * 40;
      c.fillStyle = `rgb(${v},${v + 4},${v + 12})`;
      c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    c.fillStyle = "#ffffff";
    c.fillRect(8, 0, 6, h); c.fillRect(w - 14, 0, 6, h);
    c.fillRect(w / 2 - 3, 0, 6, h * 0.45);
  }, { repetir: true });
  const zebra = texturaCanvas(64, 128, (c, w, h) => {
    c.fillStyle = "#ec2e8c"; c.fillRect(0, 0, w, h / 2);
    c.fillStyle = "#ffffff"; c.fillRect(0, h / 2, w, h / 2);
  }, { repetir: true });

  const faixa = (de, ate, textura, y, repV) => {
    const pos = [], uv = [], ind = [];
    for (let i = 0; i <= AMOSTRAS; i++) {
      const k = idx(i);
      const a = centro[k].clone().addScaledVector(lado[k], de);
      const b = centro[k].clone().addScaledVector(lado[k], ate);
      pos.push(a.x, y, a.z, b.x, y, b.z);
      const v = (i * PASSO) / repV;
      uv.push(0, v, 1, v);
      if (i < AMOSTRAS) {
        const n = i * 2;
        ind.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(ind);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, toon(0xffffff, { map: textura, side: THREE.DoubleSide }));
    m.receiveShadow = true;
    cena.add(m);
  };
  faixa(MEIA_PISTA, -MEIA_PISTA, asfalto, 0.05, 18);
  faixa(MEIA_PISTA + ZEBRA, MEIA_PISTA, zebra, 0.07, 4);
  faixa(-MEIA_PISTA, -MEIA_PISTA - ZEBRA, zebra, 0.07, 4);

  // acostamento de grama mais escura com florzinhas, para a pista "saltar" da tela
  const acostamento = texturaCanvas(128, 128, (c, w, h) => {
    c.fillStyle = TEMA.acost; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      c.fillStyle = ["#ffffff", "#ffcc1f", "#ff8fbf"][i % 3];
      c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 2.5, 0, Math.PI * 2); c.fill();
    }
  }, { repetir: true });
  faixa(MEIA_PISTA + ZEBRA + 6, MEIA_PISTA + ZEBRA, acostamento, 0.04, 8);
  faixa(-MEIA_PISTA - ZEBRA, -MEIA_PISTA - ZEBRA - 6, acostamento, 0.04, 8);

  // barreira de gizes de cera deitados nas duas beiradas (o estojo do Rabisco)
  const coresGiz = [COR3D.rosa, COR3D.ciano, COR3D.laranja, COR3D.amarelo];
  const passoGiz = Math.round(4.1 / PASSO);
  const lugares = [];
  for (let i = 0; i < AMOSTRAS; i += passoGiz) {
    if (i < 40 || i > AMOSTRAS - 30) continue; // livre perto da largada
    for (const s of [1, -1]) lugares.push([i, s]);
  }
  const { malhas, contorno } = barreiraGiz(lugares.length, coresGiz);
  const aux = new THREE.Object3D();
  const usados = coresGiz.map(() => 0);
  lugares.forEach(([i, s], n) => {
    aux.position.copy(centro[i]).addScaledVector(lado[i], s * (LIMITE_MURO + 1.2)).setY(0.55);
    aux.rotation.set(0, anguloDe(tangente[i]) - Math.PI / 2, 0);
    aux.scale.setScalar(1);
    aux.updateMatrix();
    const cor = (n >> 1) % coresGiz.length;
    malhas[cor].setMatrixAt(usados[cor]++, aux.matrix);
    aux.scale.set(1.05, 1.12, 1.12);
    aux.updateMatrix();
    contorno.setMatrixAt(n, aux.matrix);
  });
  malhas.forEach((m, k) => { m.count = usados[k]; cena.add(m); });
  cena.add(contorno);

  const xadrez = texturaCanvas(256, 64, (c, w, h) => {
    for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) {
      c.fillStyle = (x + y) % 2 ? "#151515" : "#ffffff";
      c.fillRect(x * 16, y * 16, 16, 16);
    }
  });
  const chegada = new THREE.Mesh(new THREE.PlaneGeometry(MEIA_PISTA * 2, 3), toon(0xffffff, { map: xadrez }));
  chegada.rotation.x = -Math.PI / 2;
  chegada.rotation.z = anguloDe(tangente[0]) + Math.PI;
  chegada.position.copy(centro[0]).setY(0.09);
  cena.add(chegada);

  // Pórtico de largada: dois lápis gigantes com faixa da Educarte
  const faixaLargada = texturaCanvas(1024, 256, (c, w, h) => {
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h);
    for (let x = 0; x < 64; x++) for (let y = 0; y < 2; y++) {
      c.fillStyle = (x + y) % 2 ? "#151515" : "#ffffff";
      c.fillRect(x * 16, y * 16, 16, 16);
      c.fillRect(x * 16, h - 32 + y * 16, 16, 16);
    }
    const lh = 150, lw = (img.logo.width / img.logo.height) * lh;
    c.drawImage(img.logo, 60, 53, lw, lh);
    c.font = "800 120px 'Baloo 2', sans-serif";
    c.textBaseline = "middle"; c.textAlign = "center";
    c.lineWidth = 14; c.strokeStyle = "#151515"; c.strokeText("LARGADA", 660, 134);
    c.fillStyle = "#ff7a00"; c.fillText("LARGADA", 660, 134);
  });
  portico(0, faixaLargada, [COR3D.vermelho, COR3D.amarelo]);

  // Ônibus da escola estacionado perto da largada
  const bus = onibus3D(img.texLogo);
  const kb = idx(AMOSTRAS - 40);
  bus.position.copy(centro[kb]).addScaledVector(lado[kb], -(MEIA_PISTA + 14));
  bus.rotation.y = anguloDe(tangente[kb]);
  cena.add(bus);

  // Escola no meio do circuito
  const escola = escola3D(img.texLogo);
  const lugarEscola = acharLugar(new THREE.Vector3(30, 0, 125), 34);
  escola.position.copy(lugarEscola);
  const kEsc = amostraGlobal(lugarEscola);
  escola.rotation.y = Math.atan2(centro[kEsc].x - lugarEscola.x, centro[kEsc].z - lugarEscola.z);
  cena.add(escola);

  // Lojas parceiras (fonte única: src/parceiros.js): um prédio de cada uma logo depois da largada
  // e outdoors espalhados pela beira da pista. A textura de cada parceira carrega UMA vez e é reaproveitada;
  // sem sombra e com material simples, para não pesar em TV e tela dividida.
  const ocupados = [{ x: lugarEscola.x, z: lugarEscola.z, r: 34 }, { x: bus.position.x, z: bus.position.z, r: 14 }];
  const FOLGA_PARCEIRO = 27; // do centro da pista à parte mais próxima (muro invisível e barreira de gizes ficam dentro disso)
  const cabe = (x, z, rot, w, d) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let a = 0; a <= 4; a++) for (let b = 0; b <= 2; b++) {
      const la = (a / 4 - 0.5) * w, lb = (b / 2 - 0.5) * d;
      const px = x + la * c + lb * s, pz = z - la * s + lb * c;
      for (let i = 0; i < AMOSTRAS; i += 3) if (Math.hypot(px - centro[i].x, pz - centro[i].z) < FOLGA_PARCEIRO) return false;
    }
    const r = Math.hypot(w, d) / 2 + 2;
    return ocupados.every((o) => Math.hypot(x - o.x, z - o.z) > o.r + r);
  };
  const lojas = PARCEIROS.map((p) => {
    const e = ESTILO_PARCEIRO[p.tipo] ?? ESTILO_PARCEIRO.carros;
    const o = {
      p, prop: PARC.larguraMax / PARC.altura, ajustes: [],
      frente: new THREE.MeshBasicMaterial({ color: e.parede }),
      lado: new THREE.MeshLambertMaterial({ color: e.parede }),
      beiral: new THREE.MeshLambertMaterial({ color: e.beiral }),
    };
    new THREE.TextureLoader().load(`${RAIZ}/${p.foto}`, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      o.frente.map = t; o.frente.color.set(0xffffff); o.frente.needsUpdate = true;
      o.prop = t.image.width / t.image.height;
      o.ajustes.forEach((f) => f(o.prop));
    }, undefined, () => console.warn(`foto da parceira ${p.nome} não carregou`));
    return o;
  });
  const CAIXA = new THREE.BoxGeometry(1, 1, 1), POSTE = new THREE.CylinderGeometry(0.35, 0.45, 1, 8);
  const matPoste = new THREE.MeshLambertMaterial({ color: 0x6b7280 }), matVerso = new THREE.MeshLambertMaterial({ color: 0x4b5563 });
  function predioParceiro(o) {
    const g = new THREE.Group(), l = o.lado;
    const corpo = new THREE.Mesh(CAIXA, [l, l, l, l, o.frente, l]); // face +z = frente
    const beiral = new THREE.Mesh(CAIXA, o.beiral);
    g.add(corpo, beiral);
    const ajustar = (prop) => {
      const w = Math.min(PARC.larguraMax, PARC.altura * prop), h = w / prop;
      corpo.scale.set(w, h, PARC.prof); corpo.position.set(0, h / 2, 0);
      beiral.scale.set(w + 1, 0.9, PARC.prof + 1.2); beiral.position.set(0, h + 0.45, 0.3);
    };
    ajustar(o.prop); o.ajustes.push(ajustar);
    return g;
  }
  function outdoorParceiro(o) {
    const g = new THREE.Group();
    const painel = new THREE.Mesh(CAIXA, [matVerso, matVerso, matVerso, matVerso, o.frente, matVerso]);
    const postes = [new THREE.Mesh(POSTE, matPoste), new THREE.Mesh(POSTE, matPoste)];
    g.add(painel, ...postes);
    const ajustar = (prop) => {
      const w = Math.min(PARC.outdoorLarg, PARC.outdoorAlt * prop), h = w / prop;
      painel.scale.set(w, h, 0.5); painel.position.set(0, PARC.pe + h / 2, 0);
      postes.forEach((p, k) => { p.scale.set(1, PARC.pe + h / 2, 1); p.position.set((k ? 1 : -1) * (w / 2 - 1.3), (PARC.pe + h / 2) / 2, -0.5); });
    };
    ajustar(o.prop); o.ajustes.push(ajustar);
    return g;
  }
  // acha um lugar perto da amostra i0 (alternando lado e deslocando ao longo da pista), de frente para a pista
  function colocarParceiro(o, criar, w, d, i0, ladoPreferido, recuos) {
    for (const desl of [0, 14, -14, 28, -28, 45, -45, 70, -70, 100, -100, 140, -140]) {
      const i = idx(i0 + desl);
      for (const s of [ladoPreferido, -ladoPreferido]) for (const recuo of recuos) {
        const alvo = centro[i].clone().addScaledVector(lado[i], s * (recuo + d / 2));
        // de frente para a pista, virado um pouco para quem chega (a frente fica mais legível ao passar)
        const dir = lado[i].clone().multiplyScalar(-s).addScaledVector(tangente[i], -0.45).normalize();
        const rot = Math.atan2(dir.x, dir.z);
        if (!cabe(alvo.x, alvo.z, rot, w, d)) continue;
        const obj = criar(o);
        obj.position.set(alvo.x, 0.02, alvo.z); obj.rotation.y = rot;
        cena.add(obj);
        ocupados.push({ x: alvo.x, z: alvo.z, r: Math.hypot(w, d) / 2 + 2 });
        return true;
      }
    }
    return false;
  }
  lojas.forEach((o, k) => colocarParceiro(o, predioParceiro, PARC.larguraMax, PARC.prof, 30 + Math.round((k * AMOSTRAS) / lojas.length), 1, [30, 36, 44, 56]));
  for (let k = 0; k < 9; k++) {
    colocarParceiro(lojas[(k + 1) % lojas.length], outdoorParceiro, PARC.outdoorLarg, 1, Math.round(((k + 0.5) / 9) * AMOSTRAS) + 140, k % 2 ? -1 : 1, [30, 36, 46]);
  }

  // Decoração espalhada (sempre igual, por causa da semente)
  const rnd = aleatorio(42);
  const coresLapis = [COR3D.roxo, COR3D.vermelho, COR3D.amarelo, 0x2f7de1, COR3D.verde, COR3D.laranja, COR3D.rosa];
  const livre = (p, folga) => {
    const k = amostraGlobal(p);
    return Math.hypot(p.x - centro[k].x, p.z - centro[k].z) > MEIA_PISTA + folga && p.distanceTo(lugarEscola) > 34 && p.distanceTo(bus.position) > 14
      && ocupados.every((o) => Math.hypot(p.x - o.x, p.z - o.z) > o.r + 5);
  };
  const sortear = (n, folga, criar) => {
    let feitos = 0, tentativas = 0;
    while (feitos < n && tentativas++ < n * 40) {
      const p = new THREE.Vector3(-260 + rnd() * 560, 0, -150 + rnd() * 520);
      if (!livre(p, folga)) continue;
      const o = criar(feitos);
      o.position.copy(p);
      o.rotation.y = rnd() * Math.PI * 2;
      cena.add(o);
      feitos++;
    }
  };
  if (PISTA.tema === "escola") {
    sortear(30, 16, (i) => {
      const l = lapis3D(coresLapis[i % coresLapis.length], 14 + rnd() * 18, 1.4 + rnd() * 0.8);
      l.rotation.z = (rnd() - 0.5) * 0.3;
      return l;
    });
    sortear(42, 14, () => arvore3D(0.8 + rnd() * 0.6));
    sortear(10, 14, () => livros3D());
  } else {
    // cada tema tem três tipos de enfeite (ver pistas.js)
    TEMA.deco.forEach((tipo, k) => sortear(k === 0 ? 34 : 22, tipo === "predio" || tipo === "celeiro" ? 22 : 14, () => {
      if (tipo === "arvore") return arvore3D(0.8 + rnd() * 0.6);
      if (tipo === "lapis") return lapis3D(coresLapis[Math.floor(rnd() * coresLapis.length)], 14 + rnd() * 18, 1.4 + rnd() * 0.8);
      const d = decoracao(tipo, rnd);
      d.scale.setScalar(0.9 + rnd() * 0.5);
      return d;
    }));
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 520 + rnd() * 160;
    const m = morro3D(90 + rnd() * 80, TEMA.morros[i % 2]);
    m.position.set(30 + Math.cos(a) * r, 0, 120 + Math.sin(a) * r);
    cena.add(m);
  }
  for (let i = 0; i < 16; i++) {
    const n = nuvem3D(1.4 + rnd() * 1.6);
    n.position.set(-300 + rnd() * 660, 70 + rnd() * 60, -200 + rnd() * 640);
    cena.add(n);
  }
}

function acharLugar(desejado, folga) {
  for (let r = 0; r < 200; r += 6) {
    for (let a = 0; a < Math.PI * 2; a += 0.5) {
      const p = desejado.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      const k = amostraGlobal(p);
      if (Math.hypot(p.x - centro[k].x, p.z - centro[k].z) > MEIA_PISTA + folga) return p;
    }
  }
  return desejado;
}

// Pórtico: dois lápis e uma faixa por cima da pista
function portico(i, textura, cores) {
  const g = new THREE.Group();
  for (const [s, cor] of [[1, cores[0]], [-1, cores[1]]]) {
    const l = lapis3D(cor, 12, 1.2);
    l.position.x = s * (MEIA_PISTA + ZEBRA + 1.6);
    g.add(l);
  }
  if (textura) {
    const faixa = peca(new THREE.BoxGeometry(MEIA_PISTA * 2 + 6, 4.2, 0.5), 0xffffff, { contorno: 0.3 });
    faixa.material = [toon(0xffffff), toon(0xffffff), toon(0xffffff), toon(0xffffff),
      toon(0xffffff, { map: textura }), toon(0xffffff, { map: textura })];
    faixa.position.y = 11;
    g.add(faixa);
  }
  g.position.copy(centro[i]);
  g.rotation.y = anguloDe(tangente[i]);
  cena.add(g);
  return g;
}

// ------------------------------------------------------------------ Pórticos da matemática
// Pórticos nos trechos mais retos da pista (a criança vê as três placas bem de frente)
const POSICOES_PORTICO = (() => {
  const curva = (i) => Math.abs(difAngulo(anguloDe(tangente[idx(i + 1)]), anguloDe(tangente[idx(i)])));
  const nota = [];
  for (let i = 0; i < AMOSTRAS; i++) {
    let soma = 0;
    for (let k = -90; k <= 25; k++) soma += curva(i + k); // reta antes do pórtico (aproximação) e logo depois
    nota.push(soma);
  }
  const escolhidos = [];
  const ordem = [...nota.keys()].sort((a, b) => nota[a] - nota[b]);
  const longe = (a, b) => Math.min(idx(a - b), idx(b - a));
  for (const i of ordem) {
    if (longe(i, 0) < 120) continue; // longe da largada
    if (escolhidos.every((e) => longe(e, i) > AMOSTRAS / 5)) escolhidos.push(i);
    if (escolhidos.length === 3) break;
  }
  return escolhidos.sort((a, b) => a - b);
})();
const FAIXAS = [MEIA_PISTA * 0.62, 0, -MEIA_PISTA * 0.62]; // esquerda, meio, direita
const porticos = [];

const novaConta = () => MODO.pergunta();

function criarPorticos() {
  for (const i of POSICOES_PORTICO) {
    const g = portico(i, null, [COR3D.ciano, COR3D.rosa]);
    // trave de livros por cima
    const trave = peca(new THREE.BoxGeometry(MEIA_PISTA * 2 + 6, 1.2, 2.2), COR3D.laranja, { contorno: 0.25 });
    trave.position.y = 12.2;
    g.add(trave);
    const placas = FAIXAS.map((lat) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }));
      m.position.set(lat, 8.6, 0);
      m.rotation.y = Math.PI; // de frente para quem chega
      const corda = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), toon(COR3D.tinta));
      corda.position.set(lat, 11.3, 0);
      g.add(m, corda);
      return m;
    });
    // listras no chão mostrando as três faixas
    for (const lat of [MEIA_PISTA * 0.31, -MEIA_PISTA * 0.31]) {
      const linha = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 26), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
      linha.rotation.x = -Math.PI / 2;
      linha.position.set(lat, 0.1, -13);
      g.add(linha);
    }
    const p = { i, grupo: g, placas, conta: null };
    trocarConta(p);
    porticos.push(p);
  }
}

function trocarConta(p) {
  p.conta = novaConta();
  p.placas.forEach((m, k) => {
    m.material.map?.dispose();
    m.material.map = MODO.placa(p.conta.lista[k]);
    m.material.needsUpdate = true;
  });
  p.perguntado = false; p.perguntou = {};
}

// ------------------------------------------------------------------ Karts
const karts = [];

function criarKart({ nome, corKart, piloto, ehJogador, humano = 0, linhaLargada, colunaLargada, img, cores }) {
  const g = kart3D(corKart, ehJogador || humano ? img.texIcone : null, cores);
  const chassi = g.userData.chassi;
  let rabisco = null, motorista2 = null;
  if (humano === 2) {
    // jogador 2: a criança-companheira pilota o próprio kart (rosto = foto do cadastro; sem cadastro, a criança genérica)
    const c = window.Familia?.crianca?.();
    motorista2 = criarCompanheiro3D({ raiz: RAIZ, altura: ALTURA_RABISCO * 0.9, cracha: true, crianca: c?.nome ? c : { nome } });
    rabisco = motorista2.rabisco; // mesma API do Rabisco3D: o volante encaixa nas mãos dela
    motorista2.grupo.position.set(0, 1.0 - 2.0 * motorista2.escala, -0.55);
    chassi.add(motorista2.grupo);
  } else if (ehJogador) {
    // Rabisco 3D oficial sentado no banco, mãos no volante
    rabisco = new Rabisco3D({ raiz: RAIZ, altura: ALTURA_RABISCO });
    rabisco.grupo.position.set(0, 1.0 - 2.0 * rabisco.escala, -0.55); // quadril (y 2,0 do modelo) no banco
    chassi.add(rabisco.grupo);
  } else {
    const p = pilotoLapis(piloto);
    p.position.set(0, 0.9, -0.7);
    p.scale.setScalar(1.05);
    chassi.add(p);
  }
  cena.add(g);
  const kart = { nome, g, chassi, rabisco, motorista2, ehJogador, humano: ehJogador ? 1 : humano, cor: piloto ?? corKart, linhaLargada, colunaLargada };
  naLargada(kart);
  karts.push(kart);
  return kart;
}

// Coloca o kart no grid de largada com tudo zerado (também usado para correr de novo sem recarregar a página)
function naLargada(kart) {
  const k0 = idx(-14 - kart.linhaLargada * 9);
  Object.assign(kart, {
    pos: centro[k0].clone().addScaledVector(lado[k0], kart.colunaLargada ? -3.4 : 3.4),
    ang: anguloDe(tangente[k0]), vel: 0, virar: 0,
    amostra: k0, volta: 0, passouMeio: false, progresso: 0, terminou: false, tempoFinal: 0,
    turbo: 0, foraDaPista: false, giroRoda: 0, habilidade: 0.88 + PISTA.numero * 0.007 + Math.random() * 0.06, // pistas mais adiante: amigos um pouco mais rápidos
    faixaAlvo: (Math.random() - 0.5) * 8, // (estava dentro do comentário acima: virava NaN e os adversários sumiam)
    proximoPortico: 0, cooldownBatida: 0,
  });
}

// Partículas simples (poeira, fogo do turbo, estrelinhas)
const texBolinha = texturaCanvas(64, 64, (c) => {
  const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
});
const texEstrela = texturaCanvas(64, 64, (c) => {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 12 : 28, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  c.closePath(); c.fillStyle = "#ffcc1f"; c.fill(); c.lineWidth = 4; c.strokeStyle = "#151515"; c.stroke();
});
const particulas = [];
function soltar(pos, { cor = 0xffffff, tex = texBolinha, vel = new THREE.Vector3(), vida = 0.6, tam = 1, aditivo = false, gravidade = 0 }) {
  let p = particulas.find((q) => q.vida <= 0);
  if (!p) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    cena.add(s);
    p = { s };
    particulas.push(p);
  }
  p.s.material.map = tex;
  p.s.material.color.set(cor);
  p.s.material.blending = aditivo ? THREE.AdditiveBlending : THREE.NormalBlending;
  p.s.material.needsUpdate = true;
  p.s.position.copy(pos);
  p.s.visible = true;
  Object.assign(p, { vel: vel.clone(), vida, vidaTotal: vida, tam, gravidade });
}
function atualizarParticulas(dt) {
  for (const p of particulas) {
    if (p.vida <= 0) continue;
    p.vida -= dt;
    p.vel.y -= p.gravidade * dt;
    p.s.position.addScaledVector(p.vel, dt);
    const f = Math.max(0, p.vida / p.vidaTotal);
    p.s.material.opacity = f;
    p.s.scale.setScalar(p.tam * (0.5 + (1 - f) * 0.8));
    if (p.vida <= 0) p.s.visible = false;
  }
}

// Rastro de rabisco: no turbo, o kart do Rabisco risca a pista como um lápis
const rastros = [];
const geoRisco = new THREE.PlaneGeometry(0.55, 1.7);
let tempoRisco = 0;
function riscar(k, dt) {
  tempoRisco -= dt;
  if (tempoRisco > 0) return;
  tempoRisco = 0.035;
  let r = rastros.find((q) => q.vida <= 0);
  if (!r) {
    const m = new THREE.Mesh(geoRisco, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.order = "YXZ";
    cena.add(m);
    r = { m };
    rastros.push(r);
  }
  const zigue = Math.sin(tempoCorrida * 38) * 0.55; // traço em zigue-zague, de rabisco
  const tras = new THREE.Vector3(-Math.sin(k.ang), 0, -Math.cos(k.ang));
  const ladoK = new THREE.Vector3(Math.cos(k.ang), 0, -Math.sin(k.ang));
  r.m.position.copy(k.pos).addScaledVector(tras, 1.6).addScaledVector(ladoK, zigue).setY(0.12);
  r.m.rotation.set(-Math.PI / 2, 0, 0);
  r.m.rotation.y = k.ang + Math.cos(tempoCorrida * 38) * 0.5;
  r.m.material.color.set(Math.floor(tempoCorrida * 12) % 2 ? COR3D.rosa : COR3D.ciano);
  r.m.material.opacity = 0.9;
  r.m.visible = true;
  r.vida = 2.5;
}
function atualizarRastros(dt) {
  for (const r of rastros) {
    if (r.vida <= 0) continue;
    r.vida -= dt;
    r.m.material.opacity = Math.min(0.9, r.vida / 1.2);
    if (r.vida <= 0) r.m.visible = false;
  }
}

// ------------------------------------------------------------------ Estado do jogo
let estado = "abertura"; // abertura | contagem | corrida | fim
let jogador = null;
let tempoCorrida = 0;
let acertos = 0;
let perguntasFeitas = 0;
let amigos = 0; // Corrida do Ônibus: amigos que subiram
function atualizarAmigos() { $("amigos").textContent = `🚌 ${amigos}`; }

// Título, dica e tela de abertura de cada modo
document.title = MODO.titulo.replace(/<[^>]+>/g, "");
document.querySelector("#abertura h1").innerHTML = MODO.titulo;
$("abertura").append(botaoVoltar({ raiz: RAIZ, faixa: MODO.faixa }));

// ------------------------------------------------------------------ Pistas (10 por modo) e medalhas
const CHAVE_MEDALHAS = `kart-${MODO.nome}-medalhas`;
const lerMedalhas = () => { try { return JSON.parse(localStorage.getItem(CHAVE_MEDALHAS) || "{}"); } catch { return {}; } };
function irParaPista(n) {
  const q = new URLSearchParams(location.search);
  q.set("pista", n);
  location.replace(`${location.pathname}?${q}`);
}
{
  const medalhas = lerMedalhas();
  PISTAS.forEach((p, i) => {
    const n = i + 1, m = medalhas[n];
    const b = document.createElement("button");
    b.className = `pista ${n === PISTA.numero ? "atual" : ""}`;
    b.setAttribute("aria-label", `Pista ${n}: ${p.nome}${m ? `, chegou em ${m}º` : ""}`);
    b.innerHTML = `<span class="em">${p.emoji}</span><b>${n}</b>${m ? `<span class="medalha">${["🥇", "🥈", "🥉", "🏁"][m - 1]}</span>` : ""}`;
    b.addEventListener("click", () => { if (n !== PISTA.numero) irParaPista(n); });
    $("pistas").append(b);
  });
}
$("proxima-pista").hidden = PISTA.numero >= PISTAS.length;
$("proxima-pista").addEventListener("click", () => irParaPista(PISTA.numero + 1));
document.querySelector("#abertura .sub").textContent = `${MODO.sub} · ${PISTA.emoji} ${PISTA.nome}`;
for (const s of document.querySelectorAll(".dica-modo")) s.textContent = MODO.dica;
if (MODO.amigos) $("amigos").hidden = false;
const entrada = { esq: false, dir: false, eixo: 0 }; // eixo: alavanca do controle, de -1 a 1
const entradaJ2 = { eixo: 0 };                        // jogador 2 (src/motor/jogadores.js): alavanca, direcional ou A/D
// "Quantos vão jogar?": com 2, o jogador 2 pilota o kart da criança-companheira (tela dividida)
Jogadores.configurar({ tipo: "simultaneo", layout: "kart", aoMudarModo: (n) => { if (n === 1 && kartJ2) { kartJ2.humano = 0; dividida = false; ajustarTelaDividida(); } } });
$("abertura").insertBefore(Jogadores.escolha(), $("jogar"));

// teclas e botões que a criança pode trocar (⚙️ na abertura e na pausa; no celular/tablet não aparece)
const remap = criarRemapear({
  id: "rabisco-kart",
  acoes: [
    { id: "esq", nome: "Virar à esquerda", teclas: ["ArrowLeft", "KeyA"], botoes: [14], controle: "esq" },
    { id: "dir", nome: "Virar à direita", teclas: ["ArrowRight", "KeyD"], botoes: [15], controle: "dir" },
    { id: "buzina", nome: "Buzina", teclas: ["KeyH"], botoes: [2, 3], controle: "acao" },
  ],
  aoAbrir: () => { entrada.esq = entrada.dir = false; if (estado === "corrida" && !pausa.ativa) pausa.pausar(); },
});
if (remap.botao) { remap.botao.classList.add("remap-kart"); $("abertura").append(remap.botao); }
let buzinaEspera = 0, buzinaEspera2 = 0;
function buzinar() { if (estado !== "corrida" || buzinaEspera > 0) return; buzinaEspera = 0.8; sons.buzina(); }
function buzinar2() { if (estado !== "corrida" || buzinaEspera2 > 0) return; buzinaEspera2 = 0.8; sons.buzina(); navigator.vibrate?.(15); Jogadores.vibrar2(60); } // vibra também o celular do jogador 2
addEventListener("keydown", (e) => {
  // TV como tela (página tv/): os karts são dos controles e celulares; o teclado/controle remoto da TV só começa a corrida
  if (Jogadores.tv) { if ((e.key === "Enter" || e.key === " ") && estado === "abertura" && !document.activeElement?.closest?.(".pista")) comecar(); return; }
  if (Jogadores.tecladoDividido && CODIGOS_J2.has(e.code)) return; // A/D/F/Espaço são do jogador 2
  const acao = remap.acaoDaTecla(e.code);
  if (acao === "esq") entrada.esq = true;
  if (acao === "dir") entrada.dir = true;
  if (acao === "buzina" && !e.repeat) buzinar();
  if ((e.key === "Enter" || e.key === " ") && estado === "abertura") comecar();
});
addEventListener("keyup", (e) => {
  if (Jogadores.tv) return;
  if (Jogadores.tecladoDividido && CODIGOS_J2.has(e.code)) return;
  const acao = remap.acaoDaTecla(e.code);
  if (acao === "esq") entrada.esq = false;
  if (acao === "dir") entrada.dir = false;
});
prepararCelular({ deitado: true }); // toque, tela cheia e "gire o celular"
for (const [id, chave] of [["btn-esq", "esq"], ["btn-dir", "dir"]]) {
  const b = $(id);
  const liga = (e) => { e.preventDefault(); entrada[chave] = true; b.classList.add("apertado"); };
  const desliga = (e) => { e.preventDefault(); entrada[chave] = false; b.classList.remove("apertado"); };
  b.addEventListener("pointerdown", liga);
  b.addEventListener("pointerup", desliga);
  b.addEventListener("pointercancel", desliga);
  b.addEventListener("pointerleave", desliga);
}
$("som").addEventListener("click", () => { $("som").textContent = sons.alternarMudo() ? "🔇" : "🔊"; });
$("jogar").addEventListener("click", () => comecar());
// Correr de novo / sair: tudo na própria página (em páginas publicadas recarregar é bloqueado)
function reiniciarCorrida() {
  Jogadores.emJogo(false);
  clearTimeout(esperaSegundo);
  for (const k of karts) naLargada(k);
  for (const p of porticos) trocarConta(p);
  tempoCorrida = 0; acertos = 0; perguntasFeitas = 0; amigos = 0; atualizarAmigos();
  estado = "abertura";
  $("resultado").classList.add("escondido");
  $("hud").classList.add("escondido");
  $("pergunta").classList.remove("ativa");
  $("pergunta-j2")?.classList.remove("ativa");
  $("contagem").textContent = "";
}
$("de-novo").addEventListener("click", () => { reiniciarCorrida(); comecar(); });
$("sair").addEventListener("click", () => {
  if (Jogadores.tv) Jogadores.voltarParaTV(); // veio da TV: volta ao menu da TV com os jogadores conectados
  else if (RAIZ === ".") { reiniciarCorrida(); $("abertura").classList.remove("escondido"); }
  else location.href = `${RAIZ}/index.html#/faixa/${MODO.faixa}`;
});

function mensagem(texto, classe = "", ms = 1600) {
  const m = $("mensagem");
  m.textContent = texto;
  m.className = `ativa ${classe}`;
  clearTimeout(mensagem.t);
  mensagem.t = setTimeout(() => (m.className = classe), ms);
}

function comecar() {
  if (estado !== "abertura") return;
  if (Jogadores.ativo && !Jogadores.j2Pronto) { Jogadores.avisar(Jogadores.textoFaltaJ2, COR_J2); return; }
  ajustarDois();
  if (kartJ2) { Jogadores.emJogo(true); Jogadores.mostrarQuemEQuem(3200, { comLegenda: false }); } // as etiquetas ficam em cada metade da tela
  sons.destravar();
  estado = "contagem";
  $("abertura").classList.add("escondido");
  $("hud").classList.remove("escondido");
  motor.ligar();
  if (!saudou) { saudou = true; saudar({ gravada: false }); } // a narradora chama a criança pelo nome (só com cadastro)
  const passos = [["3", "contagem-3"], ["2", "contagem-2"], ["1", "contagem-1"], ["JÁ!", "contagem-ja"]];
  passos.forEach(([txt, fala], n) => setTimeout(() => {
    const c = $("contagem");
    c.textContent = txt;
    c.classList.remove("pulsa"); void c.offsetWidth; c.classList.add("pulsa");
    sons.bipe(n === 3);
    falar(fala);
    if (n === 3) {
      estado = "corrida";
      musica.tocar("corrida");
      setTimeout(() => (c.textContent = ""), 900);
    }
  }, 900 + n * 1000));
}

// ------------------------------------------------------------------ Física
function dirigir(k, dt) {
  const t = tangente[k.amostra];
  let virar = 0;
  let alvoVel = VMAX;

  if (k.humano) {
    if (k.humano === 2) virar = -entradaJ2.eixo;
    else {
      virar = (entrada.esq ? 1 : 0) - (entrada.dir ? 1 : 0);
      if (entrada.eixo) virar = -entrada.eixo; // alavanca: vira aos poucos
    }
    // assistência para crianças: olha um pouco à frente na pista e puxa de volta para o asfalto
    const adiante = tangente[idx(k.amostra + 14)];
    const lat = lateral(k.pos, k.amostra);
    const alvoAng = anguloDe(adiante) - THREE.MathUtils.clamp(lat * 0.045, -0.6, 0.6);
    k.ang += difAngulo(alvoAng, k.ang) * Math.min(1, dt * (virar ? 0.6 : 2.6) * (MODO.ajuda || 1)); // modos dos pequenos: mais ajuda
  } else {
    const alvo = idx(k.amostra + 26);
    k.faixaAlvo += (Math.random() - 0.5) * dt * 3;
    // tem kart logo à frente na mesma faixa? passa para o lado com mais espaço (ultrapassagem, sem atravessar)
    for (const o of karts) {
      if (o === k) continue;
      const frente = idx(o.amostra - k.amostra);
      if (frente > 0 && frente < 14 / PASSO && o.vel < k.vel + 2) {
        const latO = lateral(o.pos, o.amostra), latK = lateral(k.pos, k.amostra);
        if (Math.abs(latO - latK) < 3) k.faixaAlvo += (latO > 0 ? -1 : 1) * dt * 9;
      }
    }
    k.faixaAlvo = THREE.MathUtils.clamp(k.faixaAlvo, -6.5, 6.5);
    const ponto = centro[alvo].clone().addScaledVector(lado[alvo], k.faixaAlvo);
    const desejado = Math.atan2(ponto.x - k.pos.x, ponto.z - k.pos.z);
    virar = THREE.MathUtils.clamp(difAngulo(desejado, k.ang) * 2.5, -1, 1);
    // borracha: espera ou acelera para a corrida ficar emocionante
    const atraso = (jogador.progresso - k.progresso) / AMOSTRAS;
    alvoVel *= k.habilidade * THREE.MathUtils.clamp(1 + atraso * 0.9, 0.82, 1.1);
  }
  if (estado !== "corrida" || k.terminou) {
    alvoVel = k.terminou ? VMAX * 0.5 : 0;
    if (!k.ehJogador && k.terminou) alvoVel = VMAX * 0.5;
  }

  k.virar += (virar - k.virar) * Math.min(1, dt * 8);
  const ritmo = Math.min(1, k.vel / VMAX);
  k.ang += k.virar * 1.75 * dt * Math.min(1, ritmo * 1.6);

  if (k.turbo > 0) { k.turbo -= dt; alvoVel *= TURBO; }
  const lat = lateral(k.pos, k.amostra);
  k.foraDaPista = Math.abs(lat) > MEIA_PISTA + ZEBRA;
  if (k.foraDaPista && k.turbo <= 0) alvoVel *= 0.55;

  const acel = alvoVel > k.vel ? (k.turbo > 0 ? 3 : 0.9) : 2.2;
  k.vel += (alvoVel - k.vel) * Math.min(1, dt * acel);

  k.pos.x += Math.sin(k.ang) * k.vel * dt;
  k.pos.z += Math.cos(k.ang) * k.vel * dt;

  // muro invisível: devolve para perto da pista
  const anterior = k.amostra;
  k.amostra = amostraMaisProxima(k.pos, k.amostra);
  const lat2 = lateral(k.pos, k.amostra);
  if (Math.abs(lat2) > LIMITE_MURO) {
    const s = Math.sign(lat2);
    k.pos.addScaledVector(lado[k.amostra], -(Math.abs(lat2) - LIMITE_MURO) * s);
    k.vel = Math.max(k.vel * 0.92, 10);
    k.ang += difAngulo(anguloDe(tangente[idx(k.amostra + 10)]), k.ang) * 0.5;
    if (k.humano && k.cooldownBatida <= 0) { sons.batida(); k.cooldownBatida = 0.6; }
  }
  k.cooldownBatida -= dt;

  // voltas
  if (k.amostra > AMOSTRAS * 0.45 && k.amostra < AMOSTRAS * 0.55) k.passouMeio = true;
  if (anterior > AMOSTRAS * 0.9 && k.amostra < AMOSTRAS * 0.1 && k.passouMeio) {
    k.volta++;
    k.passouMeio = false;
    if (k.volta >= VOLTAS && !k.terminou) { k.terminou = true; k.tempoFinal = tempoCorrida; if (k.humano) chegou(k); }
    else if (k.humano) {
      sons.volta();
      const quem = k.humano === 2 ? `${k.nome}: ` : kartJ2?.humano ? "Rabisco: " : "";
      if (k.volta === VOLTAS - 1) { falar("volta-final"); mensagem(`${quem}Última volta!`, "acerto"); }
      else { falar(`volta-${k.volta + 1}`); mensagem(`${quem}Volta ${k.volta + 1}!`); }
    }
  }
  k.progresso = k.volta * AMOSTRAS + k.amostra;

  // pórticos
  const prox = porticos[k.proximoPortico];
  if (prox && passou(anterior, k.amostra, prox.i)) {
    if (k.humano) responder(prox, lat2, k);
    else if (Math.random() < 0.45) k.turbo = 1.6;
    k.proximoPortico = (k.proximoPortico + 1) % porticos.length;
  }
}

const passou = (de, ate, alvo) => {
  const a = idx(alvo - de), b = idx(ate - de);
  return a > 0 && a <= b && b < AMOSTRAS / 2;
};

function responder(p, lat, k = jogador) {
  const quem = k.humano === 2 ? `${k.nome}: ` : "";
  const faixa = lat > MEIA_PISTA * 0.31 ? 0 : lat < -MEIA_PISTA * 0.31 ? 2 : 1;
  const c = p.conta;
  perguntasFeitas++;
  if (faixa === c.certa) {
    acertos++;
    k.turbo = 2.4;
    sons.letra();
    sons.turbo();
    setTimeout(() => falar(`acerto-${1 + Math.floor(Math.random() * 3)}`), 250);
    mensagem(`${quem}${c.resposta}  TURBO!`, "acerto");
    if (c.ganho) { amigos += c.ganho; atualizarAmigos(); }
    for (let n = 0; n < 18; n++) {
      soltar(k.pos.clone().setY(2), {
        tex: texEstrela, vel: new THREE.Vector3((Math.random() - 0.5) * 14, 6 + Math.random() * 8, (Math.random() - 0.5) * 14),
        vida: 0.9, tam: 1.3, gravidade: 18,
      });
    }
  } else {
    sons.erro();
    if (c.quase) falar(c.quase);
    mensagem(`${quem}Quase! ${c.resposta}`, "quase", 2200);
  }
  balaoDe(k).classList.remove("ativa");
  setTimeout(() => trocarConta(p), 400);
}

function perguntar(dt) {
  for (const h of [jogador, kartJ2?.humano ? kartJ2 : null]) if (h) perguntarPara(h);
  void dt;
}
// balão do pedido: um por jogador (o do jogador 2 fica na metade dele, dentro do #hud-j2)
const balaoDe = (k) => (k === kartJ2 && kartJ2?.humano ? $("pergunta-j2") : null) || $("pergunta");
// 🔊 no balão: repete a palavra em inglês
$("hud").addEventListener("click", (e) => { const b = e.target.closest?.(".ouvir"); if (b?.dataset.fala) falar(b.dataset.fala); });
function perguntarPara(jogador) {
  const prox = porticos[jogador.proximoPortico];
  if (!prox || jogador.terminou) return;
  const faltam = idx(prox.i - jogador.amostra) * PASSO;
  const quem = jogador.humano || 1; // cada jogador é perguntado uma vez em cada pórtico
  if (!prox.perguntou?.[quem] && faltam < Math.max(140, jogador.vel * 6.5)) {
    (prox.perguntou ??= {})[quem] = true;
    prox.perguntado = true;
    const balao = balaoDe(jogador);
    balao.innerHTML = prox.conta.hud;
    balao.classList.add("ativa");
    if (prox.conta.fala) falar(prox.conta.fala);
  }
}

// Colisão entre karts: cada kart é uma cápsula (dois círculos, frente e trás). Ninguém atravessa ninguém:
// os dois são afastados até encostar; quem bate por trás perde velocidade e o da frente ganha um empurrãozinho;
// de lado é uma raspada (cada um gira um pouquinho para fora). Faíscas e "tuc" quando o Rabisco está na batida.
const R_KART = 1.15, MEIO_KART = 0.85;
let menorDistancia = Infinity; // ?teste: menor distância entre centros depois de resolver (nunca < 2·R_KART)
function colisoes() {
  for (let passe = 0; passe < 8; passe++) {
    for (let a = 0; a < karts.length; a++) {
      for (let b = a + 1; b < karts.length; b++) {
        const A = karts[a], B = karts[b];
        if (Math.abs(A.pos.x - B.pos.x) > 6 || Math.abs(A.pos.z - B.pos.z) > 6) continue;
        // pares de círculos: o mais fundo manda
        let pior = null;
        for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
          const ax = A.pos.x + Math.sin(A.ang) * sa * MEIO_KART, az = A.pos.z + Math.cos(A.ang) * sa * MEIO_KART;
          const bx = B.pos.x + Math.sin(B.ang) * sb * MEIO_KART, bz = B.pos.z + Math.cos(B.ang) * sb * MEIO_KART;
          const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
          const fundo = 2 * R_KART - d;
          if (fundo > 0 && (!pior || fundo > pior.fundo)) pior = { fundo, nx: d > 1e-4 ? dx / d : 1, nz: d > 1e-4 ? dz / d : 0, px: (ax + bx) / 2, pz: (az + bz) / 2 };
        }
        if (!pior) continue;
        const { fundo, nx, nz } = pior;
        A.pos.x -= nx * fundo / 2; A.pos.z -= nz * fundo / 2;
        B.pos.x += nx * fundo / 2; B.pos.z += nz * fundo / 2;
        if (passe) continue;
        // velocidades ao longo da batida
        const vA = (Math.sin(A.ang) * nx + Math.cos(A.ang) * nz) * A.vel, vB = (Math.sin(B.ang) * nx + Math.cos(B.ang) * nz) * B.vel;
        const aproxima = vA - vB;
        if (aproxima > 0.5) {
          const frontal = Math.abs(Math.sin(A.ang) * nx + Math.cos(A.ang) * nz) > 0.7; // por trás/frente ou de lado
          if (frontal) {
            const atras = idx(B.amostra - A.amostra) < AMOSTRAS / 2 ? A : B, frente = atras === A ? B : A;
            atras.vel *= 0.72; frente.vel = Math.min(VMAX * 1.15, frente.vel + aproxima * 0.35);
          } else {
            A.vel *= 0.93; B.vel *= 0.93;
          }
          // raspada: cada um gira um pouquinho para longe do outro
          const lado = (k, sx, sz) => Math.sign(Math.cos(k.ang) * sx - Math.sin(k.ang) * sz) || 1;
          A.ang += 0.06 * lado(A, -nx, -nz); B.ang += 0.06 * lado(B, nx, nz);
          if (A.ehJogador || B.ehJogador) {
            const eu = A.ehJogador ? A : B;
            if ((eu.cooldownBatida ?? 0) <= 0) { sons.batida(); eu.cooldownBatida = 0.45; navigator.vibrate?.(25); }
            for (let n = 0; n < 6; n++) soltar(new THREE.Vector3(pior.px, 0.9, pior.pz), { cor: n % 2 ? 0xffe14a : 0xffffff, aditivo: true, vel: new THREE.Vector3((Math.random() - 0.5) * 8, 3 + Math.random() * 4, (Math.random() - 0.5) * 8), vida: 0.35, tam: 0.7, gravidade: 12 });
          }
          batidas++;
        }
      }
    }
  }
  for (let a = 0; a < karts.length; a++) for (let b = a + 1; b < karts.length; b++) menorDistancia = Math.min(menorDistancia, karts[a].pos.distanceTo(karts[b].pos));
}
let batidas = 0;

// ------------------------------------------------------------------ Visual dos karts
function animarKart(k, dt, t) {
  const g = k.g;
  g.position.copy(k.pos);
  g.rotation.y = k.ang;
  const ritmo = k.vel / VMAX;
  // inclina nas curvas e treme na grama
  k.chassi.rotation.z = THREE.MathUtils.lerp(k.chassi.rotation.z, -k.virar * 0.09 * ritmo, Math.min(1, dt * 8));
  k.chassi.rotation.x = THREE.MathUtils.lerp(k.chassi.rotation.x, k.turbo > 0 ? -0.06 : 0, Math.min(1, dt * 5));
  const tremor = k.foraDaPista ? 0.07 : 0.015;
  k.chassi.position.y = Math.abs(Math.sin(t * 28 + k.amostra)) * tremor * ritmo;
  k.giroRoda += (k.vel * dt) / 0.45;
  for (const r of g.userData.rodas) {
    r.children[0].rotation.x = k.giroRoda;
    r.children[1].rotation.x = k.giroRoda;
    if (r.userData.frente) r.rotation.y = k.virar * 0.35;
  }
  if (k.rabisco) {
    const comemora = estado === "fim";
    k.rabisco.atualizar(dt, { modo: comemora ? "comemorarSentado" : "dirigir", virar: k.virar });
    // volante encaixado nas mãos do Rabisco (centro entre as mãos, gira com a curva)
    const vol = g.userData.volante;
    if (!comemora) {
      g.updateMatrixWorld(true);
      const mE = k.rabisco.bracoE.cotovelo.localToWorld(new THREE.Vector3(0, -0.82, 0));
      const mD = k.rabisco.bracoD.cotovelo.localToWorld(new THREE.Vector3(0, -0.82, 0));
      const meio = mE.clone().add(mD).multiplyScalar(0.5);
      k.chassi.worldToLocal(meio);
      vol.position.copy(meio);
      const raio = mE.distanceTo(mD) / 2;
      vol.scale.setScalar(Math.max(0.6, raio / 0.28));
      vol.rotation.set(-1.05, 0, k.virar * 0.6);
    }
  }
  // fogo do turbo (e o rabisco na pista, se for o Rabisco)
  if (k.turbo > 0 && k.humano) riscar(k, dt);
  if (k.turbo > 0) {
    for (const e of g.userData.escapes) {
      const p = new THREE.Vector3();
      e.getWorldPosition(p);
      const tras = new THREE.Vector3(-Math.sin(k.ang), 0, -Math.cos(k.ang));
      soltar(p.addScaledVector(tras, 0.4), {
        cor: Math.random() < 0.5 ? 0xffa21f : 0xfff06a, aditivo: true,
        vel: tras.multiplyScalar(6).add(new THREE.Vector3(0, 1.5, 0)), vida: 0.22, tam: 1.1,
      });
    }
  }
  // poeira na grama
  if (k.foraDaPista && k.vel > 6 && Math.random() < 0.5) {
    soltar(k.pos.clone().setY(0.4), {
      cor: 0xc9a46b, vel: new THREE.Vector3((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3), vida: 0.6, tam: 1.6,
    });
  }
}

// ------------------------------------------------------------------ Câmera
// Fade do adversário: os materiais dele são clonados só na primeira vez (cada kart com os seus) e só ficam
// transparentes enquanto ele está esmaecido; de volta a 100%, voltam a ser opacos (sem custo extra no celular).
function esmaecer(o, alvo, dt) {
  o.opacidade ??= 1;
  o.opacidade += (alvo - o.opacidade) * Math.min(1, dt * 8);
  if (Math.abs(o.opacidade - 1) < 0.01) o.opacidade = 1;
  if (o.opacidade === 1 && !o.esmaecido) return;
  if (!o.mats) {
    o.mats = [];
    o.g.traverse((m) => {
      if (!m.material || Array.isArray(m.material)) return;
      m.material = m.material.clone();
      o.mats.push({ m: m.material, base: m.material.opacity, transp: m.material.transparent, depth: m.material.depthWrite });
    });
  }
  const opaco = o.opacidade === 1;
  for (const q of o.mats) {
    const transp = q.transp || !opaco;
    if (q.m.transparent !== transp) { q.m.transparent = transp; q.m.needsUpdate = true; }
    q.m.opacity = q.base * o.opacidade;
    q.m.depthWrite = opaco ? q.depth : false;
  }
  o.esmaecido = !opaco;
}

// ------------------------------------------------------------------ Câmera (posição)
const camPos = new THREE.Vector3();
const camAlvo = new THREE.Vector3();
let anguloOrbita = 0, anguloTeste = null;

function atualizarCamera(dt, t) {
  const k = jogador;
  const frente = new THREE.Vector3(Math.sin(k.ang), 0, Math.cos(k.ang));
  let desejoPos, desejoAlvo;
  if (anguloTeste != null) {
    // ?teste: `teste.angulo = rad` gira a câmera em volta do kart (fotos de vários lados)
    const a2 = k.ang + anguloTeste;
    desejoPos = k.pos.clone().add(new THREE.Vector3(Math.sin(a2) * 7, 2.6, Math.cos(a2) * 7));
    desejoAlvo = k.pos.clone().setY(1.8);
  } else if (estado === "abertura" || estado === "fim") {
    // de frente, para mostrar o rosto do Rabisco e a logo no peito
    anguloOrbita += dt * 0.3;
    const a2 = k.ang + Math.sin(anguloOrbita) * (estado === "fim" ? 0.35 : 0.6);
    const dist = estado === "fim" ? 8 : 10;
    desejoPos = k.pos.clone().add(new THREE.Vector3(Math.sin(a2) * dist, 2.8, Math.cos(a2) * dist));
    desejoAlvo = k.pos.clone().setY(1.9);
    {
      // Rabisco à esquerda da tela (o título / o cartão do resultado ficam à direita)
      const esquerdaDoKart = new THREE.Vector3(Math.cos(k.ang), 0, -Math.sin(k.ang));
      desejoAlvo.addScaledVector(esquerdaDoKart, 3);
    }
  } else {
    desejoPos = k.pos.clone().addScaledVector(frente, -7).setY(3.3);
    desejoAlvo = k.pos.clone().addScaledVector(frente, 6).setY(2.5); // olha um pouco mais alto: pista e pórticos descem na tela, longe do balão do pedido
  }
  const s = anguloTeste != null ? 30 : estado === "contagem" ? 2.2 : estado === "corrida" ? 12 : 4;
  camPos.lerp(desejoPos, 1 - Math.exp(-dt * s));
  camAlvo.lerp(desejoAlvo, 1 - Math.exp(-dt * s * 1.4));
  camera.position.copy(camPos);
  camera.lookAt(camAlvo);
  const fov = (dividida && !ladoALado() ? 48 : 62) + (k.turbo > 0 ? 12 : 0) + Math.min(1, k.vel / VMAX) * 4;
  camera.fov += (fov - camera.fov) * Math.min(1, dt * 4);
  camera.updateProjectionMatrix();

  // adversário entre a câmera e o Rabisco (ou colado na câmera) fica semitransparente, com fade suave
  const cx = camera.position.x, cz = camera.position.z, ax = k.pos.x - cx, az = k.pos.z - cz, L2 = ax * ax + az * az || 1;
  for (const o of karts) {
    if (o === k) continue;
    if (dividida && o.humano) { esmaecer(o, 1, dt); continue; }
    if (dividida && camera2Tapa(o)) { esmaecer(o, 0.25, dt); continue; }
    const ox = o.pos.x - cx, oz = o.pos.z - cz, d = Math.hypot(ox, oz);
    const ao = (ox * ax + oz * az) / L2, lat = Math.abs(ox * az - oz * ax) / Math.sqrt(L2);
    const tapa = (ao > -0.2 && ao < 0.95 && lat < 3.2) || d < 5.5;
    esmaecer(o, tapa ? 0.25 : 1, dt);
    o.g.visible = d > 1.2; // dentro da câmera: some de vez
  }

  sol.position.copy(k.pos).add(new THREE.Vector3(60, 110, 30));
  sol.target.position.copy(k.pos);
  cena.userData.ceu.position.copy(camera.position);
  $("linhas-turbo").classList.toggle("ativa", k.turbo > 0 && estado === "corrida");
  if (dividida) atualizarCamera2(dt);
}

// ------------------------------------------------------------------ 2 jogadores: kart da criança e tela dividida
// Decisão: TELA DIVIDIDA (não câmera compartilhada). Numa pista em circuito os karts se separam por meia volta,
// e uma câmera só teria de se afastar até ninguém enxergar nada. Cada um tem sua câmera de perseguição:
// celular deitado (tela bem larga, ≥ 2:1) divide lado a lado; TV, tablet e computador dividem em cima/embaixo.
// Desempenho: a sombra é calculada uma vez por quadro (não por tela) e, no toque, a resolução cai para 1×.
let kartJ2 = null, imgKart = null;
const camera2 = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 1600);
const camPos2 = new THREE.Vector3(), camAlvo2 = new THREE.Vector3();
const ladoALado = () => innerWidth / innerHeight >= 2.0;
function ajustarDois() {
  const quer = Jogadores.ativo && Jogadores.j2Pronto;
  if (quer && !kartJ2) {
    kartJ2 = criarKart({ nome: Jogadores.j2.nome, corKart: COR3D.rosa, cores: { capo: COR3D.amarelo, detalhe: COR3D.ciano }, ehJogador: false, humano: 2, linhaLargada: 2, colunaLargada: 1, img: imgKart });
    camPos2.copy(kartJ2.pos).add(new THREE.Vector3(0, 3, -8)); camAlvo2.copy(kartJ2.pos);
  } else if (!quer && kartJ2) {
    cena.remove(kartJ2.g); karts.splice(karts.indexOf(kartJ2), 1); kartJ2 = null;
  }
  if (kartJ2) kartJ2.humano = 2;
  dividida = Boolean(kartJ2);
  ajustarTelaDividida();
}
let hudJ2 = null;
function ajustarTelaDividida() {
  ajustarTela();
  document.body.classList.toggle("kart-dividido", dividida);
  document.body.classList.toggle("kart-lado", dividida && ladoALado());
  if (dividida && !hudJ2) {
    hudJ2 = document.createElement("div");
    hudJ2.id = "hud-j2";
    hudJ2.innerHTML = `<div class="divisoria"></div><div id="pergunta-j2" class="pergunta"></div><div class="tag tag-j1"></div><div class="tag tag-j2"></div><div class="placar-j2"><div class="pos"></div><div class="volta"></div></div>`;
    $("hud").append(hudJ2);
  }
  if (hudJ2) {
    hudJ2.hidden = !dividida;
    const ic = { controle: "🎮", teclado: "⌨️", toque: "👆", celular: "📱" };
    hudJ2.querySelector(".tag-j1").innerHTML = `<i></i>1 · Rabisco ${ic[Jogadores.j1.entrada] ?? ""}`;
    hudJ2.querySelector(".tag-j2").innerHTML = `<i></i>2 · ${Jogadores.j2.nome} ${ic[Jogadores.j2.entrada] ?? ""}`;
  }
}
addEventListener("resize", () => { if (dividida) ajustarTelaDividida(); });
Jogadores.aoMudar(() => { if (hudJ2 && dividida) ajustarTelaDividida(); });
function atualizarCamera2(dt) {
  const k = kartJ2;
  const frente = new THREE.Vector3(Math.sin(k.ang), 0, Math.cos(k.ang));
  camPos2.lerp(k.pos.clone().addScaledVector(frente, -7).setY(3.3), 1 - Math.exp(-dt * (estado === "contagem" ? 2.2 : 12)));
  camAlvo2.lerp(k.pos.clone().addScaledVector(frente, 6).setY(2.5), 1 - Math.exp(-dt * (estado === "contagem" ? 3 : 16)));
  camera2.position.copy(camPos2);
  camera2.lookAt(camAlvo2);
  const fov = (ladoALado() ? 62 : 48) + (k.turbo > 0 ? 12 : 0) + Math.min(1, k.vel / VMAX) * 4;
  camera2.fov += (fov - camera2.fov) * Math.min(1, dt * 4);
  camera2.updateProjectionMatrix();
}
// adversário entre a câmera do jogador 2 e o kart dele (ou colado na câmera): também fica semitransparente
function camera2Tapa(o) {
  const k = kartJ2, cx = camera2.position.x, cz = camera2.position.z, ax = k.pos.x - cx, az = k.pos.z - cz, L2 = ax * ax + az * az || 1;
  const ox = o.pos.x - cx, oz = o.pos.z - cz, d = Math.hypot(ox, oz);
  const ao = (ox * ax + oz * az) / L2, lat = Math.abs(ox * az - oz * ax) / Math.sqrt(L2);
  return (ao > -0.2 && ao < 0.95 && lat < 3.2) || d < 5.5;
}
// desenha a cena: tela cheia (1 jogador, abertura e fim) ou dividida em duas câmeras
function desenhar() {
  const W = innerWidth, H = innerHeight;
  if (!dividida || estado === "abertura" || estado === "fim") {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    if (Math.abs(camera.aspect - W / H) > 1e-3) { camera.aspect = W / H; camera.updateProjectionMatrix(); }
    renderer.shadowMap.autoUpdate = true;
    for (const o of karts) if (o.humano === 2) o.g.visible = true;
    renderer.render(cena, camera);
    return;
  }
  const lado = ladoALado();
  const vistas = lado ? [[0, 0, W / 2, H], [W / 2, 0, W / 2, H]] : [[0, H / 2, W, H / 2], [0, 0, W, H / 2]];
  renderer.setScissorTest(true);
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true; // sombra uma vez por quadro, não uma por tela
  [[camera, jogador], [camera2, kartJ2]].forEach(([c, dono], i) => {
    const [x, y, w, h] = vistas[i];
    renderer.setViewport(x, y, w, h);
    renderer.setScissor(x, y, w, h);
    if (Math.abs(c.aspect - w / h) > 1e-3) { c.aspect = w / h; c.updateProjectionMatrix(); }
    for (const o of karts) if (o.humano) o.g.visible = o === dono || o.pos.distanceTo(c.position) > 1.2;
    cena.userData.ceu.position.copy(c.position);
    renderer.render(cena, c);
  });
  renderer.setScissorTest(false);
}
// 2 jogadores: a corrida acaba quando os dois chegam (ou 25 s depois do primeiro)
let esperaSegundo = null;
function chegou(k) {
  if (!kartJ2?.humano) { if (k === jogador) terminar(); return; }
  const outro = k === jogador ? kartJ2 : jogador;
  if (outro.terminou) { clearTimeout(esperaSegundo); terminar(); return; }
  mensagem(`${k === jogador ? "Rabisco" : k.nome} chegou! 🏁`, "acerto", 2400);
  sons.volta();
  esperaSegundo = setTimeout(() => { if (estado === "corrida") terminar(); }, 25000);
}

// ------------------------------------------------------------------ HUD
const mapa = $("mapa").getContext("2d");
let caixaMapa = null;
function desenharMapa() {
  if (!caixaMapa) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const c of centro) { minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x); minZ = Math.min(minZ, c.z); maxZ = Math.max(maxZ, c.z); }
    const esc = 180 / Math.max(maxX - minX, maxZ - minZ);
    caixaMapa = { minX, minZ, esc, ox: (220 - (maxX - minX) * esc) / 2, oz: (220 - (maxZ - minZ) * esc) / 2 };
  }
  const { minX, minZ, esc, ox, oz } = caixaMapa;
  const P = (p) => [220 - (ox + (p.x - minX) * esc), oz + (p.z - minZ) * esc];
  mapa.clearRect(0, 0, 220, 220);
  mapa.lineJoin = "round";
  for (const [larg, cor] of [[16, "#151515"], [10, "#6b7280"]]) {
    mapa.beginPath();
    centro.forEach((c, i) => (i ? mapa.lineTo(...P(c)) : mapa.moveTo(...P(c))));
    mapa.closePath();
    mapa.lineWidth = larg; mapa.strokeStyle = cor; mapa.stroke();
  }
  const [lx, lz] = P(centro[0]);
  mapa.fillStyle = "#fff"; mapa.fillRect(lx - 5, lz - 5, 10, 10);
  for (const k of [...karts].sort((a) => (a.humano ? 1 : -1))) {
    const [x, z] = P(k.pos);
    mapa.beginPath();
    mapa.arc(x, z, k.humano ? 9 : 6.5, 0, Math.PI * 2);
    mapa.fillStyle = `#${new THREE.Color(k.cor).getHexString()}`;
    mapa.fill();
    mapa.lineWidth = 3; mapa.strokeStyle = "#151515"; mapa.stroke();
  }
}

function lugarDoJogador(quem = jogador) {
  const ordem = [...karts].sort((a, b) => {
    if (a.terminou && b.terminou) return a.tempoFinal - b.tempoFinal;
    if (a.terminou) return -1;
    if (b.terminou) return 1;
    return b.progresso - a.progresso;
  });
  return ordem.indexOf(quem) + 1;
}

let hudT = 0;
function atualizarHud(dt) {
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 0.1;
  $("posicao").textContent = `${lugarDoJogador()}º`;
  $("volta").textContent = `Volta ${Math.min(VOLTAS, jogador.volta + 1)}/${VOLTAS}`;
  if (dividida && hudJ2) {
    hudJ2.querySelector(".pos").textContent = `${lugarDoJogador(kartJ2)}º`;
    hudJ2.querySelector(".volta").textContent = `Volta ${Math.min(VOLTAS, kartJ2.volta + 1)}/${VOLTAS}`;
  }
  desenharMapa();
}

// ------------------------------------------------------------------ Fim
let saudou = false;
function terminar() {
  estado = "fim";
  clearTimeout(esperaSegundo);
  Jogadores.emJogo(false);
  const lugar = lugarDoJogador();
  const lugar2 = kartJ2?.humano ? lugarDoJogador(kartJ2) : null;
  musica.parar();
  motor.desligar();
  sons.vitoria();
  $("hud").classList.add("escondido");
  setTimeout(() => {
    $("res-lugar").textContent = `${lugar}º lugar!`;
    const med = lerMedalhas();
    if (!med[PISTA.numero] || lugar < med[PISTA.numero]) { med[PISTA.numero] = lugar; try { localStorage.setItem(CHAVE_MEDALHAS, JSON.stringify(med)); } catch { /* sem armazenamento */ } }
    $("res-trofeu").textContent = ["🏆", "🥈", "🥉", "🏁"][lugar - 1];
    $("res-acertos").textContent = MODO.amigos ? `Você levou ${amigos} amigos para a escola!` : `Você acertou ${acertos} de ${perguntasFeitas} ${MODO.unidade}!`;
    if (lugar2) $("res-acertos").textContent = `Rabisco: ${lugar}º · ${kartJ2.nome}: ${lugar2}º${kartJ2.terminou ? "" : " (ainda correndo)"} — ${MODO.amigos ? `${amigos} amigos na escola!` : `${acertos} de ${perguntasFeitas} ${MODO.unidade} certos!`}`;
    $("resultado").classList.remove("escondido");
    falar(`chegada-${lugar}`);
    // narradora com o nome da criança, depois da fala da chegada (fila da voz)
    if (lugar <= 3) parabenizar({ gravada: false }); else falarNome("cor-pre", "cor-pos");
  }, 900);
}

// ------------------------------------------------------------------ Pause
const pausa = criarPausa({
  podePausar: () => estado === "corrida",
  aoPausar: () => { musica.parar(); motor.desligar(); entrada.esq = entrada.dir = false; entrada.eixo = 0; },
  aoContinuar: () => { musica.tocar("corrida"); motor.ligar(); },
  aoRecomecar: () => { musica.parar(); reiniciarCorrida(); comecar(); },
  aoSair: () => { musica.parar(); reiniciarCorrida(); $("abertura").classList.remove("escondido"); },
  lugar: { top: "calc(env(safe-area-inset-top, 0px) + 150px)", left: "18px" }, // abaixo da posição (o meio é da conta)
});

remap.naPausa();

// ------------------------------------------------------------------ Controle
// Direcional ou alavanca vira (a alavanca vira aos poucos), Start pausa; nas telas o direcional escolhe e A confirma
const controle = ligarControle({
  entrada,
  mapa: { esq: "esq", dir: "dir" },
  pausa,
  menu: () => (estado === "abertura" ? $("abertura") : estado === "fim" ? $("resultado") : null),
  aoStart: () => { if (estado === "abertura") comecar(); },
  aoConectar: () => { $("dica").textContent = `Controle: direcional ou alavanca para virar · ${MODO.dica} · Start para pausar`; },
});
// TV como tela: o foco já começa no "CORRER" (o primeiro A do controle ou a buzina do celular larga a corrida)
if (Jogadores.tv) setTimeout(() => { if (estado === "abertura") controle.controle.focar($("jogar")); }, 300);

// ------------------------------------------------------------------ Laço principal
const relogio = new THREE.Clock();
function quadro() {
  const dt = Math.min(relogio.getDelta(), 1 / 20);
  const leitura = controle.atualizar();
  entrada.eixo = leitura.eixoX;
  if (leitura.apertou.acao) buzinar();
  buzinaEspera -= dt; buzinaEspera2 -= dt;
  if (kartJ2?.humano) {
    const e = Jogadores.ler2();
    entradaJ2.eixo = pausa.ativa ? 0 : e.x;
    if (!pausa.ativa && (e.acaoNova || e.puloNovo)) buzinar2();
  }
  pausa.atualizar();
  if (pausa.ativa) { desenhar(); requestAnimationFrame(quadro); return; }
  const t = relogio.elapsedTime;
  if (estado === "corrida") tempoCorrida += dt;

  for (const k of karts) dirigir(k, dt);
  colisoes();
  for (const k of karts) animarKart(k, dt, t);
  if (estado === "corrida") perguntar(dt);
  atualizarParticulas(dt);
  atualizarRastros(dt);
  atualizarCamera(dt, t);
  if (estado !== "abertura") atualizarHud(dt);
  motor.atualizar(estado === "corrida" ? Math.min(1.3, jogador.vel / VMAX) : 0.05);

  desenhar();
  requestAnimationFrame(quadro);
}

// ------------------------------------------------------------------ Início
async function iniciar() {
  await Promise.race([
    Promise.all([document.fonts.load("800 40px 'Baloo 2'"), document.fonts.load("900 40px 'Neulis Cursive'")]),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => {});
  const [logo, icone] = await Promise.all([
    carregarImagem(`${RAIZ}/assets/marca/logos/azul-icone-rosa.png`),
    carregarImagem(`${RAIZ}/assets/marca/logos/icone-branco.png`),
  ]);
  const img = imgKart = {
    logo,
    texLogo: texturaCanvas(logo.width, logo.height, (c) => c.drawImage(logo, 0, 0)),
    texIcone: texturaCanvas(icone.width, icone.height, (c) => c.drawImage(icone, 0, 0)),
  };

  construirMundo(img);
  criarPorticos();
  createGrid(img);

  preCarregarFalas(["contagem-3", "contagem-2", "contagem-1", "contagem-ja", "acerto-1", "acerto-2", "acerto-3", "volta-2", "volta-final"]);
  camPos.copy(jogador.pos).add(new THREE.Vector3(0, 3, 10));
  camAlvo.copy(jogador.pos);
  requestAnimationFrame(quadro);

  if (params.has("auto")) comecar();
  if (params.has("fim")) { comecar(); setTimeout(() => { jogador.volta = VOLTAS; jogador.terminou = true; terminar(); }, 5000); }
  if (params.has("porticos")) { const k = jogador; const i = idx(POSICOES_PORTICO[Number(params.get("porticos"))] - 60); k.pos.copy(centro[i]); k.amostra = i; k.ang = anguloDe(tangente[i]); }
  if (params.has("teste")) window.teste = { get jogador() { return jogador; }, get j2() { return kartJ2; }, get dividida() { return dividida; }, karts, porticos, cena, get estado() { return estado; }, renderer, set angulo(a) { anguloTeste = a; },
    get menorDistancia() { return menorDistancia; }, zerarDistancia() { menorDistancia = Infinity; }, get batidas() { return batidas; }, idx, centro, lado, tangente, AMOSTRAS, PASSO,
    colocar(k, i, lat, vel = 0) { const a = idx(i); k.pos.copy(centro[a]).addScaledVector(lado[a], lat); k.amostra = a; k.ang = anguloDe(tangente[a]); k.vel = vel; } };
}

function createGrid(img) {
  const rivais = [
    { nome: "Verdinho", corKart: COR3D.verde, piloto: COR3D.verde, cores: { capo: COR3D.amarelo } },
    { nome: "Roxinha", corKart: COR3D.roxo, piloto: COR3D.roxo, cores: { capo: 0xffffff } },
    { nome: "Amarelinho", corKart: COR3D.amarelo, piloto: COR3D.amarelo, cores: { capo: COR3D.vermelho } },
  ];
  criarKart({ ...rivais[0], linhaLargada: 0, colunaLargada: 0, img });
  criarKart({ ...rivais[1], linhaLargada: 0, colunaLargada: 1, img });
  criarKart({ ...rivais[2], linhaLargada: 1, colunaLargada: 0, img });
  // kart nas cores do Rabisco: camiseta ciano, short rosa, boné laranja
  jogador = criarKart({ nome: "Rabisco", corKart: COR3D.ciano, cores: { capo: COR3D.rosa, detalhe: COR3D.laranja }, ehJogador: true, linhaLargada: 1, colunaLargada: 1, img });
}

iniciar();
