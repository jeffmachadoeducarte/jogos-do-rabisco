// Etiqueta de nome sobre a cabeça (o "quem é quem"): um balãozinho arredondado na cor do jogador, com bolinha branca e
// ícone à esquerda, nome em Baloo 2 branco com contorno suave, brilho em cima, sombra macia e uma pontinha que aponta
// para a cabeça. 1 sprite por jogador (1 chamada de desenho), sempre do mesmo tamanho na tela (sizeAttenuation: false),
// flutua de leve (bob), apaga com a distância da câmera e, dentro de um veículo, sobe para cima do teto do veículo.
//   const p = criarPlacaNome({ nome: "Alice", estilo: "j1", altura: 1.97, veiculo: () => dentro });
//   rabisco.grupo.add(p.sprite);  p.definir("Alice");  p.estado → { visivel, nome, acima, opacidade, yMundo }
// O canvas é desenhado em alta resolução (devicePixelRatio, mín. 2) para a borda não ficar serrilhada.
import { THREE } from "./base3d.js";

export const ESTILOS = {
  j1: { de: "#2fd0ff", ate: "#0096dc", borda: "#ffffff", contorno: "rgba(0,70,120,0.55)", anel: "#ec2e8c", icone: "⭐" }, // ciano do Rabisco, anel rosa
  j2: { de: "#b48cff", ate: "#7047e6", borda: "#ffffff", contorno: "rgba(50,20,110,0.55)", anel: "#ffcc1f", icone: "🎮" }, // lilás, anel amarelo
};
const H_TELA = { tv: 0.06, toque: 0.078 }; // altura da etiqueta: fração da altura da tela a 1 m (fov 55 ≈ 1,04 de altura)

function desenhar(nome, e, icone) {
  const ppx = Math.min(3, Math.max(2, globalThis.devicePixelRatio || 1));
  const H = 64, pill = 46, ponta = 9, sombra = 6, fonte = "800 27px 'Baloo 2', system-ui, sans-serif";
  const med = document.createElement("canvas").getContext("2d"); med.font = fonte;
  const tw = Math.ceil(med.measureText(nome).width), R = pill / 2, bol = pill - 10;
  const W = Math.max(pill * 2, 7 + bol + 9 + tw + 18) + sombra * 2;
  const c = document.createElement("canvas"); c.width = Math.round(W * ppx); c.height = Math.round(H * ppx);
  const x = c.getContext("2d"); x.scale(ppx, ppx);
  const x0 = sombra, x1 = W - sombra, y0 = 3, y1 = y0 + pill, cx = W / 2;
  // balão + pontinha num caminho só (a sombra sai junto)
  const forma = () => {
    x.beginPath();
    x.moveTo(x0 + R, y0); x.lineTo(x1 - R, y0); x.arc(x1 - R, y0 + R, R, -Math.PI / 2, Math.PI / 2);
    x.lineTo(cx + ponta, y1); x.quadraticCurveTo(cx + 1.5, y1 + ponta * 0.7, cx, y1 + ponta + 1); x.quadraticCurveTo(cx - 1.5, y1 + ponta * 0.7, cx - ponta, y1);
    x.lineTo(x0 + R, y1); x.arc(x0 + R, y0 + R, R, Math.PI / 2, Math.PI * 1.5); x.closePath();
  };
  x.save(); forma(); x.shadowColor = "rgba(0,0,0,0.28)"; x.shadowBlur = 7; x.shadowOffsetY = 3;
  const gr = x.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, e.de); gr.addColorStop(1, e.ate);
  x.fillStyle = gr; x.fill(); x.restore();
  forma(); x.lineWidth = 3; x.strokeStyle = e.borda; x.stroke();
  // brilho de plástico na metade de cima
  x.save(); forma(); x.clip();
  const br = x.createLinearGradient(0, y0, 0, y0 + pill * 0.55); br.addColorStop(0, "rgba(255,255,255,0.45)"); br.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = br; x.beginPath(); x.roundRect(x0 + 10, y0 + 3, x1 - x0 - 20, pill * 0.42, pill * 0.21); x.fill(); x.restore();
  // bolinha branca com anel e o ícone
  const bx = x0 + 5 + bol / 2, by = y0 + pill / 2;
  x.beginPath(); x.arc(bx, by, bol / 2, 0, Math.PI * 2); x.fillStyle = "#ffffff"; x.fill(); x.lineWidth = 2.5; x.strokeStyle = e.anel; x.stroke();
  x.font = `${Math.round(bol * 0.62)}px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(icone, bx, by + 1.5);
  // nome: branco com contorno suave
  x.font = fonte; x.textAlign = "left"; x.lineJoin = "round";
  const tx = bx + bol / 2 + 8 + (W - sombra - (bx + bol / 2 + 8) - 14 - tw) / 2, ty = by + 2;
  x.lineWidth = 5; x.strokeStyle = e.contorno; x.strokeText(nome, tx, ty);
  x.fillStyle = "#ffffff"; x.fillText(nome, tx, ty);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex, aspecto: W / H };
}

// topo do veículo (acima de g.position.y), só com o que está visível (a seta "entre aqui" some ao entrar)
const caixa = new THREE.Box3(), cxTmp = new THREE.Box3();
function topoDo(g) {
  if (g.userData.topoPlaca != null) return g.userData.topoPlaca;
  g.updateWorldMatrix(true, true); caixa.makeEmpty();
  g.traverseVisible((o) => { if (!o.isMesh || !o.geometry) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); cxTmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); caixa.union(cxTmp); });
  const gp = new THREE.Vector3(); g.getWorldPosition(gp);
  return (g.userData.topoPlaca = caixa.isEmpty() ? 2.5 : Math.min(6, caixa.max.y - gp.y));
}

export function criarPlacaNome({ nome = "", estilo = "j1", icone, altura = 2, veiculo = () => null, toque = false, degrau = 0 } = {}) {
  const e = ESTILOS[estilo] ?? ESTILOS.j1;
  const mat = new THREE.SpriteMaterial({ depthTest: false, depthWrite: false, transparent: true, sizeAttenuation: false });
  const sprite = new THREE.Sprite(mat);
  sprite.center.set(0.5, 0); // a pontinha (embaixo) fica no ponto da cabeça
  sprite.renderOrder = 8; sprite.frustumCulled = false;
  sprite.position.y = altura;
  const hTela = toque ? H_TELA.toque : H_TELA.tv;
  let aspecto = 4, sobe = 0, opac = 1;
  const estado = { visivel: false, nome: null, acima: false, opacidade: 1, yMundo: 0 };
  const pw = new THREE.Vector3(), cp = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let ultimo = performance.now();
  sprite.onBeforeRender = (_r, _s, cam) => {
    const agora = performance.now(), dt = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora;
    const pai = sprite.parent; if (!pai) return;
    pw.copy(sprite.position); pai.localToWorld(pw); // (na cabeça: position.y = altura)
    const v = veiculo(), g = v ? (v.g ?? v) : null;
    // no veículo: a etiqueta vai para cima do teto (e o 2º jogador um degrau acima, para não cobrir a do 1º)
    cam.getWorldPosition(cp); const d = cp.distanceTo(pw), hMundo = hTela * d;
    let alvo = 0;
    if (g) { const gp = g.getWorldPosition(cp.clone()), topo = gp.y + topoDo(g) + 0.2 + degrau * hMundo * 1.15; alvo = Math.max(0, topo - pw.y); }
    sobe += (alvo - sobe) * Math.min(1, dt * 8);
    // apaga de leve de longe (a câmera solta / o mapa) e um pouco quando a câmera encosta
    const alvoOp = THREE.MathUtils.clamp((60 - d) / 25, 0, 1) * THREE.MathUtils.clamp((d - 1.2) / 1.5, 0, 1);
    opac += (alvoOp - opac) * Math.min(1, dt * 6);
    mat.opacity = opac;
    const bob = Math.sin(agora / 1000 * 2.4) * 0.07 * hMundo;
    pw.y += sobe + bob + 0.04 * hMundo;
    q.identity(); sc.set(hTela * aspecto, hTela, 1);
    sprite.matrixWorld.compose(pw, q, sc);
    Object.assign(estado, { acima: Boolean(g) && sobe > 0.05, opacidade: opac, yMundo: pw.y });
  };
  function definir(n, ic = icone ?? e.icone) {
    if (!n) { sprite.visible = false; estado.visivel = false; return; }
    if (estado.nome !== n || estado.icone !== ic) {
      mat.map?.dispose();
      const r = desenhar(n, e, ic);
      mat.map = r.tex; aspecto = r.aspecto; mat.needsUpdate = true;
      estado.nome = n; estado.icone = ic;
    }
    sprite.visible = true; estado.visivel = true;
  }
  // a fonte do jogo pode chegar depois: redesenha
  document.fonts?.ready.then(() => { if (estado.nome) { const n = estado.nome; estado.nome = null; definir(n, estado.icone); } });
  if (nome) definir(nome);
  return { sprite, definir, estado, esconder() { sprite.visible = false; estado.visivel = false; }, dispose() { mat.map?.dispose(); mat.dispose(); } };
}
