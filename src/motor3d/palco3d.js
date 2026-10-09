// Palco 3D comum aos jogos de toque com o Rabisco 3D (Camarim, Rabisco Says, Rabisco Robô, bebês...).
// Monta o renderizador dentro de um elemento, com céu transparente (o fundo vem do CSS do jogo),
// luz de desenho animado, chão opcional e câmera. Também cria "alvos": botões invisíveis que seguem
// objetos 3D na tela, para tocar, usar o teclado ou o controle (data-foco) do mesmo jeito.
//
//   const palco = criarPalco3D(jogo.palco, { camera: { pos: [0, 1.6, 6], alvo: [0, 1.1, 0] } });
//   const rb = new Rabisco3D({ altura: 2.2 }); palco.cena.add(rb.grupo);
//   palco.aoQuadro((dt) => rb.atualizar(dt, { modo: "parado" }));
//   palco.alvo({ obj: ladrilho, texto: "vermelho", aoEscolher: () => ... });

import { THREE, toon, carregarTextura } from "./toon.js";

export function criarPalco3D(onde, {
  camera = {}, chao = 0x62c845, raioChao = 30, sombra = true, classe = "cena3d", pausado = () => false,
} = {}) {
  const caixa = document.createElement("div");
  caixa.className = classe;
  caixa.style.cssText = "position:absolute;inset:0;overflow:hidden";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
  caixa.append(canvas);
  onde.append(caixa);

  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.setClearColor(0x000000, 0);
  if (sombra) { r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; }

  const cena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(camera.fov ?? 35, 1, 0.1, 400);
  const pos = new THREE.Vector3(...(camera.pos ?? [0, 1.6, 6]));
  const alvoCam = new THREE.Vector3(...(camera.alvo ?? [0, 1.1, 0]));
  cam.position.copy(pos);
  cam.lookAt(alvoCam);

  const sol = new THREE.DirectionalLight(0xffffff, 2.4);
  sol.position.set(4, 9, 7);
  if (sombra) {
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.03;
    Object.assign(sol.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, far: 40 });
  }
  cena.add(sol, new THREE.HemisphereLight(0xd6f3ff, 0x5aa83a, 1.6));
  let piso = null;
  if (chao != null) {
    piso = new THREE.Mesh(new THREE.CircleGeometry(raioChao, 48), toon(chao));
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    cena.add(piso);
  }

  // ---------- tamanho: segue a caixa (celular girando, painel lateral abrindo...)
  let W = 1, H = 1;
  const ajustar = () => {
    W = Math.max(1, caixa.clientWidth); H = Math.max(1, caixa.clientHeight);
    r.setSize(W, H, false);
    cam.aspect = W / H;
    // tela em pé: afasta a câmera para caber a mesma largura de cena
    const recuo = cam.aspect < 1 ? Math.min(1.9, 1 / cam.aspect) : 1;
    cam.position.copy(alvoCam).addScaledVector(pos.clone().sub(alvoCam), recuo);
    cam.lookAt(alvoCam);
    cam.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(ajustar);
  ro.observe(caixa);
  ajustar();

  // ---------- alvos (botões que seguem objetos 3D)
  const alvos = [];
  const camadaAlvos = document.createElement("div");
  camadaAlvos.style.cssText = "position:absolute;inset:0;pointer-events:none";
  caixa.append(camadaAlvos);
  const v = new THREE.Vector3();
  function alvo({ obj, ponto = [0, 0, 0], tam = 90, texto = "", aoEscolher = () => {}, classe: cl = "alvo3d", html = "" }) {
    const b = document.createElement("button");
    b.className = cl;
    b.setAttribute("aria-label", texto);
    b.setAttribute("data-foco", "");
    b.innerHTML = html;
    b.style.cssText = "position:absolute;pointer-events:auto;transform:translate(-50%,-50%);border-radius:50%;";
    b.addEventListener("click", (e) => { if (!pausado()) aoEscolher(b, e); });
    camadaAlvos.append(b);
    const a = { b, obj, ponto: new THREE.Vector3(...ponto), tam };
    alvos.push(a);
    posicionar(a);
    return b;
  }
  function posicionar(a) {
    a.obj.updateWorldMatrix(true, false);
    v.copy(a.ponto).applyMatrix4(a.obj.matrixWorld).project(cam);
    const t = typeof a.tam === "function" ? a.tam(W, H) : a.tam;
    a.b.style.left = `${((v.x + 1) / 2) * W}px`;
    a.b.style.top = `${((1 - v.y) / 2) * H}px`;
    a.b.style.width = a.b.style.height = `${t}px`;
    a.b.hidden = v.z > 1 || !a.obj.visible;
  }
  const tirarAlvo = (b) => { const i = alvos.findIndex((a) => a.b === b); if (i >= 0) alvos.splice(i, 1); b.remove(); };

  // ponto 3D -> posição na tela (efeitos em HTML por cima da cena)
  function naTela(obj, ponto = [0, 0, 0]) {
    obj.updateWorldMatrix(true, false);
    v.set(...ponto).applyMatrix4(obj.matrixWorld).project(cam);
    const rc = caixa.getBoundingClientRect();
    return [rc.left + ((v.x + 1) / 2) * W, rc.top + ((1 - v.y) / 2) * H];
  }

  // ---------- laço
  const funcoes = [];
  const relogio = new THREE.Clock();
  let vivo = true;
  function quadro() {
    if (!vivo) return;
    const dt = Math.min(relogio.getDelta(), 0.05);
    if (!pausado()) for (const f of funcoes) f(dt);
    for (const a of alvos) posicionar(a);
    r.render(cena, cam);
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);

  return {
    cena, cam, sol, piso, renderer: r, caixa, canvas,
    aoQuadro: (f) => { funcoes.push(f); return () => funcoes.splice(funcoes.indexOf(f), 1); },
    alvo, tirarAlvo, naTela,
    // muda o enquadramento (pos e alvo: [x, y, z])
    olhar(novaPos, novoAlvo) { if (novaPos) pos.set(...novaPos); if (novoAlvo) alvoCam.set(...novoAlvo); ajustar(); },
    textura: carregarTextura,
    destruir() { vivo = false; ro.disconnect(); r.dispose(); caixa.remove(); },
  };
}

// Pose extra por cima do Rabisco3D (depois de rb.atualizar): ângulos de articulação que o jogo quer
// segurar, com transição suave. juntas: { oE: [x, z], oD: [x, z], cE, cD, tronX, qE, qD, jE, jD }
export function posar(rb, juntas, dt, chave = "_extra") {
  const atual = (rb[chave] ??= {});
  const k = Math.min(1, dt * 10);
  // começa de onde o Rabisco está (rb.atual tem os mesmos nomes), então não dá tranco
  const mistura = (nome, alvo) => { const de = atual[nome] ?? rb.atual[nome] ?? alvo; atual[nome] = de + (alvo - de) * k; return atual[nome]; };
  if (juntas.oE) rb.bracoE.ombro.rotation.set(mistura("oEx", juntas.oE[0]), 0, mistura("oEz", juntas.oE[1]));
  if (juntas.oD) rb.bracoD.ombro.rotation.set(mistura("oDx", juntas.oD[0]), 0, mistura("oDz", juntas.oD[1]));
  if (juntas.cE != null) rb.bracoE.cotovelo.rotation.x = mistura("cE", juntas.cE);
  if (juntas.cD != null) rb.bracoD.cotovelo.rotation.x = mistura("cD", juntas.cD);
  if (juntas.tronX != null) rb.tronco.rotation.x = mistura("tronX", juntas.tronX);
  if (juntas.tronZ != null) rb.tronco.rotation.z = mistura("tronZ", juntas.tronZ);
  if (juntas.qE != null) rb.pernaE.quadril.rotation.x = mistura("qE", juntas.qE);
  if (juntas.qD != null) rb.pernaD.quadril.rotation.x = mistura("qD", juntas.qD);
  if (juntas.jE != null) rb.pernaE.joelho.rotation.x = mistura("jE", juntas.jE);
  if (juntas.jD != null) rb.pernaD.joelho.rotation.x = mistura("jD", juntas.jD);
  if (juntas.corpoY != null) rb.corpo.position.y = mistura("corpoY", juntas.corpoY) * rb.escala;
}

// Larga a pose extra: o Rabisco continua a própria animação a partir de onde a pose parou
export function soltarPose(rb, chave = "_extra") {
  if (!rb[chave]) return;
  Object.assign(rb.atual, rb[chave]);
  delete rb[chave];
}

export { THREE };
