// Rabisco Kart: Grande Prêmio da Escola (6 a 8 anos)
// Corrida 3D no estilo Mario Kart. A matemática fica nos pórticos: passar pelo
// número certo da conta dá turbo. Errar não tira nada, só não ganha o turbo.

import { THREE, COR3D, toon, peca, texturaCanvas, aleatorio } from "../../src/motor3d/toon.js";
import { lapis3D, arvore3D, nuvem3D, morro3D, escola3D, onibus3D, livros3D, kart3D, pilotoLapis, texturaNumero, barreiraGiz } from "../../src/motor3d/objetos.js";
import { sons, musica, motor } from "../../src/motor/sons.js";
import { falar, preCarregarFalas } from "../../src/motor/voz.js";
import { criarPausa } from "../../src/motor/pausa.js";
import { ligarControle } from "../../src/motor/controle.js";
import { prepararCelular } from "../../src/motor/celular.js";
import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
import { modoAtual } from "./modos.js";
import { botaoVoltar } from "../../src/motor/voltar.js";

const RAIZ = "../..";
const MEIA_PISTA = 9;          // metade da largura do asfalto
const ZEBRA = 1.6;             // largura da zebra
const LIMITE_MURO = MEIA_PISTA + 11;
const MODO = modoAtual();      // contas, cores, onibus, ingles-jr, gp ou ingles (ver modos.js)
const VOLTAS = MODO.voltas;
const VMAX = MODO.vmax;
const TURBO = 1.6;
const AMOSTRAS = 1400;
const ALTURA_RABISCO = 4.1;   // Rabisco 3D oficial (altura em pé); sentado no kart ele é o destaque da tela
const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ Pista
const PONTOS = [
  [0, 0], [60, -10], [115, -42], [160, -18], [178, 34], [146, 84], [92, 92], [64, 132], [86, 182],
  [44, 224], [-30, 212], [-72, 160], [-58, 104], [-110, 72], [-134, 12], [-92, -30], [-42, -22],
].map(([x, z]) => new THREE.Vector3(x * 1.35, 0, z * 1.35));
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const cena = new THREE.Scene();
cena.fog = new THREE.Fog(0xd8f5ff, 220, 720);
const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 1600);

function ajustarTela() {
  const w = window.innerWidth, h = window.innerHeight;
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
      uniforms: { topo: { value: new THREE.Color(0x1fa9ff) }, horizonte: { value: new THREE.Color(0xd8f5ff) } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 topo; uniform vec3 horizonte; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6, 0.0, 1.0); gl_FragColor = vec4(mix(horizonte, topo, pow(h,0.7)), 1.0); }",
    }),
  );
  cena.add(ceu);
  cena.userData.ceu = ceu;
}

const sol = new THREE.DirectionalLight(0xffffff, 2.4);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 });
sol.shadow.bias = -0.0005;
sol.shadow.normalBias = 0.04;
cena.add(sol, sol.target);
cena.add(new THREE.HemisphereLight(0xd6f3ff, 0x5aa83a, 1.6));

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
    c.fillStyle = "#62c845"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#58b93d"; c.fillRect(0, 0, w, h / 2);
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
    c.fillStyle = "#47a933"; c.fillRect(0, 0, w, h);
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

  // Decoração espalhada (sempre igual, por causa da semente)
  const rnd = aleatorio(42);
  const coresLapis = [COR3D.roxo, COR3D.vermelho, COR3D.amarelo, 0x2f7de1, COR3D.verde, COR3D.laranja, COR3D.rosa];
  const livre = (p, folga) => {
    const k = amostraGlobal(p);
    return Math.hypot(p.x - centro[k].x, p.z - centro[k].z) > MEIA_PISTA + folga && p.distanceTo(lugarEscola) > 34 && p.distanceTo(bus.position) > 14;
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
  sortear(30, 16, (i) => {
    const l = lapis3D(coresLapis[i % coresLapis.length], 14 + rnd() * 18, 1.4 + rnd() * 0.8);
    l.rotation.z = (rnd() - 0.5) * 0.3;
    return l;
  });
  sortear(42, 14, () => arvore3D(0.8 + rnd() * 0.6));
  sortear(10, 14, () => livros3D());
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 520 + rnd() * 160;
    const m = morro3D(90 + rnd() * 80, i % 2 ? 0x7dd36a : 0x9fe08a);
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
  p.perguntado = false;
}

// ------------------------------------------------------------------ Karts
const karts = [];

function criarKart({ nome, corKart, piloto, ehJogador, linhaLargada, colunaLargada, img, cores }) {
  const g = kart3D(corKart, ehJogador ? img.texIcone : null, cores);
  const chassi = g.userData.chassi;
  let rabisco = null;
  if (ehJogador) {
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
  const kart = { nome, g, chassi, rabisco, ehJogador, cor: piloto ?? corKart, linhaLargada, colunaLargada };
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
    turbo: 0, foraDaPista: false, giroRoda: 0, habilidade: 0.9 + Math.random() * 0.07, faixaAlvo: (Math.random() - 0.5) * 8,
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
document.querySelector("#abertura .sub").textContent = MODO.sub;
for (const s of document.querySelectorAll(".dica-modo")) s.textContent = MODO.dica;
if (MODO.amigos) $("amigos").hidden = false;
const entrada = { esq: false, dir: false, eixo: 0 }; // eixo: alavanca do controle, de -1 a 1

addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") entrada.esq = true;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") entrada.dir = true;
  if ((e.key === "Enter" || e.key === " ") && estado === "abertura") comecar();
});
addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") entrada.esq = false;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") entrada.dir = false;
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
  for (const k of karts) naLargada(k);
  for (const p of porticos) trocarConta(p);
  tempoCorrida = 0; acertos = 0; perguntasFeitas = 0; amigos = 0; atualizarAmigos();
  estado = "abertura";
  $("resultado").classList.add("escondido");
  $("hud").classList.add("escondido");
  $("pergunta").classList.remove("ativa");
  $("contagem").textContent = "";
}
$("de-novo").addEventListener("click", () => { reiniciarCorrida(); comecar(); });
$("sair").addEventListener("click", () => {
  if (RAIZ === ".") { reiniciarCorrida(); $("abertura").classList.remove("escondido"); }
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
  sons.destravar();
  estado = "contagem";
  $("abertura").classList.add("escondido");
  $("hud").classList.remove("escondido");
  motor.ligar();
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

  if (k.ehJogador) {
    virar = (entrada.esq ? 1 : 0) - (entrada.dir ? 1 : 0);
    if (entrada.eixo) virar = -entrada.eixo; // alavanca: vira aos poucos
    // assistência para crianças: olha um pouco à frente na pista e puxa de volta para o asfalto
    const adiante = tangente[idx(k.amostra + 14)];
    const lat = lateral(k.pos, k.amostra);
    const alvoAng = anguloDe(adiante) - THREE.MathUtils.clamp(lat * 0.045, -0.6, 0.6);
    k.ang += difAngulo(alvoAng, k.ang) * Math.min(1, dt * (virar ? 0.6 : 2.6) * (MODO.ajuda || 1)); // modos dos pequenos: mais ajuda
  } else {
    const alvo = idx(k.amostra + 26);
    k.faixaAlvo += (Math.random() - 0.5) * dt * 3;
    k.faixaAlvo = THREE.MathUtils.clamp(k.faixaAlvo, -6, 6);
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
    if (k.ehJogador && k.cooldownBatida <= 0) { sons.batida(); k.cooldownBatida = 0.6; }
  }
  k.cooldownBatida -= dt;

  // voltas
  if (k.amostra > AMOSTRAS * 0.45 && k.amostra < AMOSTRAS * 0.55) k.passouMeio = true;
  if (anterior > AMOSTRAS * 0.9 && k.amostra < AMOSTRAS * 0.1 && k.passouMeio) {
    k.volta++;
    k.passouMeio = false;
    if (k.volta >= VOLTAS && !k.terminou) { k.terminou = true; k.tempoFinal = tempoCorrida; if (k.ehJogador) terminar(); }
    else if (k.ehJogador) {
      sons.volta();
      if (k.volta === VOLTAS - 1) { falar("volta-final"); mensagem("Última volta!", "acerto"); }
      else { falar(`volta-${k.volta + 1}`); mensagem(`Volta ${k.volta + 1}!`); }
    }
  }
  k.progresso = k.volta * AMOSTRAS + k.amostra;

  // pórticos
  const prox = porticos[k.proximoPortico];
  if (prox && passou(anterior, k.amostra, prox.i)) {
    if (k.ehJogador) responder(prox, lat2);
    else if (Math.random() < 0.45) k.turbo = 1.6;
    k.proximoPortico = (k.proximoPortico + 1) % porticos.length;
  }
}

const passou = (de, ate, alvo) => {
  const a = idx(alvo - de), b = idx(ate - de);
  return a > 0 && a <= b && b < AMOSTRAS / 2;
};

function responder(p, lat) {
  const faixa = lat > MEIA_PISTA * 0.31 ? 0 : lat < -MEIA_PISTA * 0.31 ? 2 : 1;
  const c = p.conta;
  perguntasFeitas++;
  if (faixa === c.certa) {
    acertos++;
    jogador.turbo = 2.4;
    sons.letra();
    sons.turbo();
    setTimeout(() => falar(`acerto-${1 + Math.floor(Math.random() * 3)}`), 250);
    mensagem(`${c.resposta}  TURBO!`, "acerto");
    if (c.ganho) { amigos += c.ganho; atualizarAmigos(); }
    for (let n = 0; n < 18; n++) {
      soltar(jogador.pos.clone().setY(2), {
        tex: texEstrela, vel: new THREE.Vector3((Math.random() - 0.5) * 14, 6 + Math.random() * 8, (Math.random() - 0.5) * 14),
        vida: 0.9, tam: 1.3, gravidade: 18,
      });
    }
  } else {
    sons.erro();
    if (c.quase) falar(c.quase);
    mensagem(`Quase! ${c.resposta}`, "quase", 2200);
  }
  $("pergunta").classList.remove("ativa");
  setTimeout(() => trocarConta(p), 400);
}

function perguntar(dt) {
  const prox = porticos[jogador.proximoPortico];
  if (!prox || jogador.terminou) return;
  const faltam = idx(prox.i - jogador.amostra) * PASSO;
  if (!prox.perguntado && faltam < Math.max(140, jogador.vel * 6.5)) {
    prox.perguntado = true;
    $("pergunta").innerHTML = prox.conta.hud;
    $("pergunta").classList.add("ativa");
    if (prox.conta.fala) falar(prox.conta.fala);
  }
  void dt;
}

function colisoes() {
  for (let a = 0; a < karts.length; a++) {
    for (let b = a + 1; b < karts.length; b++) {
      const A = karts[a], B = karts[b];
      const dx = B.pos.x - A.pos.x, dz = B.pos.z - A.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 2.6 && d > 0.001) {
        const empurra = (2.6 - d) / 2;
        A.pos.x -= (dx / d) * empurra; A.pos.z -= (dz / d) * empurra;
        B.pos.x += (dx / d) * empurra; B.pos.z += (dz / d) * empurra;
        if ((A.ehJogador || B.ehJogador) && (A.cooldownBatida ?? 0) <= 0) { sons.batida(); A.cooldownBatida = 0.5; }
      }
    }
  }
}

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
  if (k.turbo > 0 && k.ehJogador) riscar(k, dt);
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
const camPos = new THREE.Vector3();
const camAlvo = new THREE.Vector3();
let anguloOrbita = 0;

function atualizarCamera(dt, t) {
  const k = jogador;
  const frente = new THREE.Vector3(Math.sin(k.ang), 0, Math.cos(k.ang));
  let desejoPos, desejoAlvo;
  if (estado === "abertura" || estado === "fim") {
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
    desejoAlvo = k.pos.clone().addScaledVector(frente, 6).setY(1.9);
  }
  const s = estado === "contagem" ? 2.2 : estado === "corrida" ? 12 : 4;
  camPos.lerp(desejoPos, 1 - Math.exp(-dt * s));
  camAlvo.lerp(desejoAlvo, 1 - Math.exp(-dt * s * 1.4));
  camera.position.copy(camPos);
  camera.lookAt(camAlvo);
  const fov = 62 + (k.turbo > 0 ? 12 : 0) + Math.min(1, k.vel / VMAX) * 4;
  camera.fov += (fov - camera.fov) * Math.min(1, dt * 4);
  camera.updateProjectionMatrix();

  // adversário colado na câmera (ex.: no turbo) some para não tapar a tela
  for (const o of karts) if (o !== k) o.g.visible = camera.position.distanceTo(o.pos) > 5;

  sol.position.copy(k.pos).add(new THREE.Vector3(60, 110, 30));
  sol.target.position.copy(k.pos);
  cena.userData.ceu.position.copy(camera.position);
  $("linhas-turbo").classList.toggle("ativa", k.turbo > 0 && estado === "corrida");
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
  for (const k of [...karts].sort((a) => (a.ehJogador ? 1 : -1))) {
    const [x, z] = P(k.pos);
    mapa.beginPath();
    mapa.arc(x, z, k.ehJogador ? 9 : 6.5, 0, Math.PI * 2);
    mapa.fillStyle = `#${new THREE.Color(k.cor).getHexString()}`;
    mapa.fill();
    mapa.lineWidth = 3; mapa.strokeStyle = "#151515"; mapa.stroke();
  }
}

function lugarDoJogador() {
  const ordem = [...karts].sort((a, b) => {
    if (a.terminou && b.terminou) return a.tempoFinal - b.tempoFinal;
    if (a.terminou) return -1;
    if (b.terminou) return 1;
    return b.progresso - a.progresso;
  });
  return ordem.indexOf(jogador) + 1;
}

let hudT = 0;
function atualizarHud(dt) {
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 0.1;
  $("posicao").textContent = `${lugarDoJogador()}º`;
  $("volta").textContent = `Volta ${Math.min(VOLTAS, jogador.volta + 1)}/${VOLTAS}`;
  desenharMapa();
}

// ------------------------------------------------------------------ Fim
function terminar() {
  estado = "fim";
  const lugar = lugarDoJogador();
  musica.parar();
  motor.desligar();
  sons.vitoria();
  $("hud").classList.add("escondido");
  setTimeout(() => {
    $("res-lugar").textContent = `${lugar}º lugar!`;
    $("res-trofeu").textContent = ["🏆", "🥈", "🥉", "🏁"][lugar - 1];
    $("res-acertos").textContent = MODO.amigos ? `Você levou ${amigos} amigos para a escola!` : `Você acertou ${acertos} de ${perguntasFeitas} ${MODO.unidade}!`;
    $("resultado").classList.remove("escondido");
    falar(`chegada-${lugar}`);
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

// ------------------------------------------------------------------ Laço principal
const relogio = new THREE.Clock();
function quadro() {
  const dt = Math.min(relogio.getDelta(), 1 / 20);
  entrada.eixo = controle.atualizar().eixoX;
  pausa.atualizar();
  if (pausa.ativa) { renderer.render(cena, camera); requestAnimationFrame(quadro); return; }
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

  renderer.render(cena, camera);
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
  const img = {
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
  if (params.has("teste")) window.teste = { get jogador() { return jogador; }, karts, porticos, get estado() { return estado; }, renderer };
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
