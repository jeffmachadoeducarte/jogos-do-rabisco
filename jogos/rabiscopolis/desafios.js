// Rabiscolândia: Desafios de obstáculos (dados em desafios-dados.js). Largada com bandeira e pórtico, cronômetro, checkpoints,
// chegada, medalha de tempo (paga Rabiscoins só na 1ª vez de cada medalha), recorde pessoal e placa de recordes (só neste aparelho).
// Orçamento de desenho: tudo que é parado de cada desafio é juntado numa malha só (mesclar), as argolas e as boias são
// instâncias de uma malha, e o grupo inteiro some quando o Rabisco está longe. Sem DOM fora do HUD e do cartão da medalha.
//
//   const D = criarDesafios(cena, { caixa, mundo, jogador, veiculo, salvo, salvar, falar, dizer, sons, pagar, vezes, alvo, camYaw, ocupado });
//   D.atualizar(dt, t) a cada passo · D.destruir() · D.lista() · D.ativo (estado) · D.teleportar(id, k) e D.forcarTempo(s) (só testes)

import { THREE, mesclar, texturaCanvas } from "./base3d.js";
import { cx } from "./blocos.js";
import {
  DESAFIOS, desafio, CAMPO_PULA, PLATAFORMAS_PULA, CHECKPOINTS_PULA, CHEGADA_PULA, LARGADA_PULA, HELI, BARCO,
  PREMIO_MEDALHA, ICONE_MEDALHA, NOME_MEDALHA, MEDALHAS, motivoMedalha, medalhaDe, formatarTempo,
} from "./desafios-dados.js";

const CSS = `
.des-hud{position:absolute;top:56px;left:50%;transform:translateX(-50%);z-index:6;display:none;gap:10px;align-items:center;padding:8px 16px;border-radius:999px;background:rgba(21,21,21,.78);color:#fff;font:700 clamp(14px,2.2vw,20px)/1 system-ui,sans-serif;box-shadow:0 3px 0 rgba(0,0,0,.35);pointer-events:none;white-space:nowrap}
.des-hud.on{display:flex}.des-hud .t{font-variant-numeric:tabular-nums;color:#ffd84a;min-width:3.6em}
.des-aviso{position:absolute;top:104px;left:50%;transform:translateX(-50%);z-index:6;padding:8px 16px;border-radius:14px;background:#ec2e8c;color:#fff;font:700 clamp(14px,2vw,18px)/1.2 system-ui,sans-serif;display:none;pointer-events:none;text-align:center}
.des-aviso.on{display:block}
.des-card{position:absolute;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}
.des-card.on{display:flex}
.des-card .c{background:#fff;color:#151515;border:4px solid #151515;border-radius:22px;padding:22px 30px;text-align:center;font:600 clamp(15px,2.4vw,20px)/1.35 system-ui,sans-serif;max-width:min(88vw,420px);box-shadow:0 6px 0 rgba(0,0,0,.4)}
.des-card .m{font-size:clamp(56px,11vw,92px);line-height:1}.des-card h2{margin:6px 0 2px;font-size:clamp(20px,3.4vw,30px)}
.des-card .moedas{color:#b07a00;font-weight:800}.des-card .novo{color:#ec2e8c;font-weight:800}
.des-card button{margin-top:12px;padding:10px 22px;border:3px solid #151515;border-radius:14px;background:#ffd84a;font:800 18px system-ui,sans-serif;cursor:pointer}
`;

const COR = { madeira: 0xd9953a, madeira2: 0xf2b866, rosa: 0xec2e8c, azul: 0x00b5f0, verde: 0x58c43a, laranja: 0xff7a00, creme: 0xfff0c9, telha: 0xd94a3d, escuro: 0x2b2b33, branco: 0xffffff, amarelo: 0xffcc1f, roxo: 0x8e6cff };
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const toNum = (n) => Number.isFinite(n) ? n : 0;

export function criarDesafios(cena, ctx) {
  const { mundo, jogador: j } = ctx;
  const hojeSalvo = () => { const s = ctx.salvo(); s.desafios ??= {}; return s.desafios; };
  const reg = (id) => { const d = hojeSalvo(); d[id] ??= { melhor: null, top: [], medalhas: {}, visto: false }; return d[id]; };

  const estilo = document.createElement("style"); estilo.textContent = CSS; document.head.append(estilo);
  const hud = document.createElement("div"); hud.className = "des-hud"; ctx.caixa.append(hud);
  const aviso = document.createElement("div"); aviso.className = "des-aviso"; ctx.caixa.append(aviso);
  const card = document.createElement("div"); card.className = "des-card"; card.innerHTML = `<div class="c"></div>`; ctx.caixa.append(card);
  card.addEventListener("click", () => card.classList.remove("on"));
  let tAviso = 0, tCard = 0;
  const falaAviso = (txt, s = 2.4) => { aviso.textContent = txt; aviso.classList.add("on"); tAviso = s; };

  // ---------- 3D
  const raiz = new THREE.Group(); cena.add(raiz);
  const solidosMeus = [];
  const geos = [], mats = [], texs = [];
  const guardar = (o) => { if (o.isMesh) { geos.push(o.geometry); mats.push(o.material); } return o; };

  function bandeira(g, x, z, cor) {
    cx(g, 0.14, 4.2, 0.14, COR.escuro, x, 2.1, z, { sombra: false });
    cx(g, 1.5, 0.9, 0.08, cor, x + 0.8, 3.7, z, { sombra: false });
    cx(g, 0.7, 0.45, 0.08, COR.branco, x + 0.5, 3.7, z + 0.01, { sombra: false });
    cx(g, 0.6, 0.12, 0.6, COR.escuro, x, 0.06, z, { sombra: false });
  }
  // pórtico de largada/chegada com faixa quadriculada: eixo ao longo de "ang" (0 = vão aberto em z), larg = vão livre
  function portico(g, x, y, z, larg, alt, ang, cor) {
    const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = ang;
    cx(p, 0.4, alt, 0.4, cor, -larg / 2 - 0.2, alt / 2, 0, { sombra: false });
    cx(p, 0.4, alt, 0.4, cor, larg / 2 + 0.2, alt / 2, 0, { sombra: false });
    const n = Math.max(6, Math.round(larg / 0.5));
    for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) cx(p, larg / n, 0.35, 0.3, (i + k) % 2 ? COR.branco : COR.escuro, -larg / 2 + (i + 0.5) * larg / n, alt - 0.18 - k * 0.35, 0, { sombra: false });
    g.add(p);
  }
  const letreiro = (texto, w, h, cor, fundo = "#ffffff") => {
    const tex = texturaCanvas(512, Math.round(512 * h / w), (c, cw, ch) => { c.fillStyle = fundo; c.fillRect(0, 0, cw, ch); c.strokeStyle = cor; c.lineWidth = 14; c.strokeRect(7, 7, cw - 14, ch - 14); c.fillStyle = cor; c.font = `800 ${Math.round(ch * 0.5)}px system-ui,sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(texto, cw / 2, ch / 2 + 4); });
    texs.push(tex);
    // placa de dois lados numa malha só: a face de trás é a mesma placa girada meia-volta (com DoubleSide o texto saía espelhado de um lado)
    const frente = new THREE.PlaneGeometry(w, h), tras = new THREE.PlaneGeometry(w, h).rotateY(Math.PI), geo = new THREE.BufferGeometry();
    for (const nome of ["position", "normal", "uv"]) {
      const a = frente.attributes[nome], b = tras.attributes[nome], arr = new Float32Array(a.array.length + b.array.length);
      arr.set(a.array); arr.set(b.array, a.array.length); geo.setAttribute(nome, new THREE.BufferAttribute(arr, a.itemSize));
    }
    const n = frente.attributes.position.count;
    geo.setIndex([...frente.index.array, ...Array.from(tras.index.array, (i) => i + n)]);
    frente.dispose(); tras.dispose();
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
    m.userData.doisLados = texto; m.castShadow = false; return guardar(m);
  };

  // placa de recordes: em pé, ao lado da bandeira, virada para onde a criança chega
  const placas = {};
  function desenharPlaca(id) {
    const P = placas[id], D = desafio(id), r = reg(id), c = P.ctx2d, W = 512, H = 400;
    c.clearRect(0, 0, W, H); c.fillStyle = "#fff8e1"; c.fillRect(0, 0, W, H);
    c.strokeStyle = "#151515"; c.lineWidth = 12; c.strokeRect(6, 6, W - 12, H - 12);
    c.fillStyle = "#ec2e8c"; c.fillRect(12, 12, W - 24, 70);
    c.fillStyle = "#fff"; c.font = "800 38px system-ui,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(`${D.icone} ${D.nome}`, W / 2, 49);
    c.fillStyle = "#151515"; c.font = "700 27px system-ui,sans-serif"; c.textAlign = "left";
    c.fillText("Medalhas:", 28, 118);
    c.font = "700 26px system-ui,sans-serif";
    c.fillText(`${ICONE_MEDALHA.ouro} ${formatarTempo(D.tempos.ouro)}   ${ICONE_MEDALHA.prata} ${formatarTempo(D.tempos.prata)}   ${ICONE_MEDALHA.bronze} ${formatarTempo(D.tempos.bronze)}`, 28, 154);
    c.font = "700 27px system-ui,sans-serif"; c.fillText("Seus recordes:", 28, 204);
    c.font = "700 30px system-ui,sans-serif";
    for (let i = 0; i < 3; i++) c.fillText(`${i + 1}º  ${r.top[i] != null ? formatarTempo(r.top[i]) : "--"}`, 40, 250 + i * 40);
    const melhorMed = MEDALHAS.filter((m) => r.medalhas[m]).pop();
    c.textAlign = "right"; c.font = "70px system-ui,sans-serif"; c.fillText(melhorMed ? ICONE_MEDALHA[melhorMed] : "🏁", W - 36, 290);
    c.textAlign = "center"; c.font = "600 20px system-ui,sans-serif"; c.fillStyle = "#555"; c.fillText(`Vá ${D.meio} até o pórtico para começar`, W / 2, 378);
    P.tex.needsUpdate = true;
  }
  function criarPlaca(id, x, z, ang) {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 400;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; texs.push(tex);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.03), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    m.position.set(x, 2.9, z); m.rotation.y = ang; m.castShadow = false;
    placas[id] = { tex, ctx2d: cv.getContext("2d"), malha: guardar(m) };
    desenharPlaca(id);
    return m;
  }
  function postesPlaca(g, x, z, ang) {
    for (const s of [-1.2, 1.2]) cx(g, 0.16, 3.0, 0.16, COR.madeira, x + Math.cos(ang) * s, 1.5, z - Math.sin(ang) * s, { sombra: false });
  }

  const fechar = (est) => { mesclar(est); est.traverse((o) => { if (o.isMesh) o.castShadow = false; }); };
  const D3 = {}; // por desafio: { grupo, centro, raio }
  // ---- Pula-telhados
  const C = CAMPO_PULA, lx = C.x0 + LARGADA_PULA.u, lz = C.z0 + LARGADA_PULA.v;
  const plat = PLATAFORMAS_PULA.map(([u0, u1, v0, v1, h, tipo]) => ({ x0: C.x0 + u0, x1: C.x0 + u1, z0: C.z0 + v0, z1: C.z0 + v1, h, tipo, cx: C.x0 + (u0 + u1) / 2, cz: C.z0 + (v0 + v1) / 2 }));
  {
    const g = new THREE.Group(), est = new THREE.Group();
    plat.forEach((p, i) => {
      const w = p.x1 - p.x0, d = p.z1 - p.z0, ehCp = CHECKPOINTS_PULA.includes(i), ehFim = i === CHEGADA_PULA;
      if (p.tipo === "pad") {
        cx(est, w, p.h - 0.12, d, 0x3b4a6b, p.cx, (p.h - 0.12) / 2, p.cz);
        cx(est, w, 0.12, d, ehFim ? COR.branco : COR.azul, p.cx, p.h - 0.06, p.cz);
        if (ehFim) for (let a = 0; a < Math.round(w / 0.8); a++) for (let b = 0; b < Math.round(d / 0.8); b++) if ((a + b) % 2) cx(est, w / Math.round(w / 0.8), 0.04, d / Math.round(d / 0.8), COR.escuro, p.x0 + (a + 0.5) * w / Math.round(w / 0.8), p.h + 0.02, p.z0 + (b + 0.5) * d / Math.round(d / 0.8), { sombra: false });
      } else if (p.tipo === "caixa") {
        const cor = [COR.madeira, COR.rosa, COR.laranja, COR.verde][i % 4];
        cx(est, w, p.h, d, cor, p.cx, p.h / 2, p.cz);
        cx(est, w + 0.1, 0.16, d + 0.1, COR.madeira2, p.cx, p.h - 0.08, p.cz);
        cx(est, 0.14, p.h, d + 0.02, COR.escuro, p.cx, p.h / 2, p.cz); cx(est, w + 0.02, p.h, 0.14, COR.escuro, p.cx, p.h / 2, p.cz);
      } else { // telhado: casinha baixa de blocos com laje de telha
        cx(est, w - 0.2, p.h - 0.25, d - 0.2, [COR.creme, 0xc8b0f5, 0x8fe3cf][i % 3], p.cx, (p.h - 0.25) / 2, p.cz);
        cx(est, w + 0.3, 0.25, d + 0.3, COR.telha, p.cx, p.h - 0.125, p.cz);
        cx(est, 0.8, 0.9, 0.05, COR.azul, p.cx, 0.55, p.z0 - 0.07 + 0.1, { sombra: false });
      }
      if (ehCp) { /* o disco do checkpoint é instanciado abaixo */ }
      const s = { x0: p.x0, x1: p.x1, z0: p.z0, z1: p.z1, y1: p.h, desafio: true };
      mundo.solidos.push(s); solidosMeus.push(s);
    });
    bandeira(est, lx - 2.2, lz - 3.2, COR.rosa);
    portico(est, lx, 0, lz, 4.2, 3.6, Math.PI / 2, COR.rosa);
    postesPlaca(est, lx - 3.2, lz + 4.6, -Math.PI / 2);
    fechar(est);
    g.add(est);
    g.add(guardar(criarPlaca("pula", lx - 3.2, lz + 4.6, -Math.PI / 2)));
    const pL = letreiro("LARGADA", 3.6, 0.7, "#ec2e8c"); pL.position.set(lx, 3.7, lz); pL.rotation.y = -Math.PI / 2; g.add(pL);
    const pC = letreiro("CHEGADA", 3.6, 0.7, "#151515"); pC.position.set(plat[CHEGADA_PULA].cx, plat[CHEGADA_PULA].h + 2.2, plat[CHEGADA_PULA].z0); g.add(pC);
    cx(g, 0.12, 2.0, 0.12, COR.escuro, plat[CHEGADA_PULA].cx - 1.9, plat[CHEGADA_PULA].h + 1.0, plat[CHEGADA_PULA].z0, { sombra: false });
    cx(g, 0.12, 2.0, 0.12, COR.escuro, plat[CHEGADA_PULA].cx + 1.9, plat[CHEGADA_PULA].h + 1.0, plat[CHEGADA_PULA].z0, { sombra: false });
    // discos dos checkpoints (instâncias: viram verdes quando a criança passa)
    const geo = new THREE.CylinderGeometry(1.6, 1.6, 0.06, 12), mt = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const im = new THREE.InstancedMesh(geo, mt, CHECKPOINTS_PULA.length); im.frustumCulled = false; im.castShadow = false;
    CHECKPOINTS_PULA.forEach((pi, k) => { const p = plat[pi]; im.setMatrixAt(k, new THREE.Matrix4().makeTranslation(p.cx, p.h + 0.05, p.cz)); im.setColorAt(k, new THREE.Color(0xffd84a)); });
    g.add(guardar(im)); D3.pula = { grupo: g, centro: [C.x0 + C.w / 2, C.z0 + C.d / 2], raio: 85, discos: im };
    raiz.add(g);
  }
  // ---- Argolas do helicóptero
  const L = HELI.largada;
  const pontosHeli = [[L.x, L.z, L.alt], ...HELI.argolas];
  const normalHeli = pontosHeli.map((p, i) => { const a = pontosHeli[Math.max(0, i - 1)], b = pontosHeli[Math.min(pontosHeli.length - 1, i + 1)]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; });
  {
    const g = new THREE.Group(), est = new THREE.Group(), B = HELI.bandeira;
    bandeira(est, B.x - 3, B.z, COR.azul);
    postesPlaca(est, B.x + 2.5, B.z, 0);
    cx(est, 0.5, 0.6, 3.5, COR.azul, B.x - 3, 0.3, B.z, { sombra: false });
    fechar(est); g.add(est);
    g.add(guardar(criarPlaca("heli", B.x + 2.5, B.z, 0)));
    const geo = new THREE.TorusGeometry(HELI.raio, 0.38, 6, 14), mt = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const im = new THREE.InstancedMesh(geo, mt, pontosHeli.length); im.frustumCulled = false; im.castShadow = false;
    g.add(guardar(im)); D3.heli = { grupo: g, centro: [70, -230], raio: 190, aneis: im };
    raiz.add(g);
  }
  // ---- Corrida de barco
  const GB = BARCO.largada;
  {
    const g = new THREE.Group(), est = new THREE.Group(), B = BARCO.bandeira;
    bandeira(est, B.x - 2.2, B.z, COR.laranja);
    postesPlaca(est, B.x + 2.6, B.z, Math.PI);
    portico(est, GB.x, 0, GB.z, 7, 4, 0, COR.laranja);
    fechar(est); g.add(est);
    g.add(guardar(criarPlaca("barco", B.x + 2.6, B.z, Math.PI)));
    const pL = letreiro("LARGADA", 4.2, 0.8, "#ff7a00"); pL.position.set(GB.x, 4.6, GB.z); pL.rotation.y = Math.PI; g.add(pL); // lido dos dois lados (o barquinho sai da beira)
    const geo = new THREE.CylinderGeometry(0.55, 0.8, 1.5, 8), mt = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const im = new THREE.InstancedMesh(geo, mt, BARCO.boias.length); im.frustumCulled = false; im.castShadow = false;
    g.add(guardar(im)); D3.barco = { grupo: g, centro: [0, 200], raio: 70, boias: im };
    raiz.add(g);
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();
  const matriz = (im, i, x, y, z, rotY, esc) => { _q.setFromEuler(_e.set(0, rotY, 0)); im.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q, _s.set(esc, esc, esc))); };

  // ---------- estado do desafio em andamento
  let A = null; // { id, t, prox, cp: {x,z,y}, armado, ficou }
  const prev = { x: 0, y: 0, z: 0, heli: false, ini: { pula: false, heli: false, barco: false } };
  let cooldown = 0;

  function pintarProgresso() {
    if (!A) return;
    if (A.id === "pula") {
      const im = D3.pula.discos;
      CHECKPOINTS_PULA.forEach((_, k) => { im.setColorAt(k, _c.set(k < A.prox ? 0x58c43a : 0xffd84a)); });
      im.instanceColor.needsUpdate = true;
    }
  }
  function pintarHeli(t) {
    const im = D3.heli.aneis;
    pontosHeli.forEach(([x, z, y], i) => {
      const ehLargada = i === 0, k = i - 1; // k = índice da argola (0..8)
      const proxima = A && (A.prox === i - 0 ? !ehLargada : false);
      const feita = A ? (ehLargada ? true : k < A.prox - 0) : false;
      let cor, esc = 1;
      if (ehLargada) cor = A ? 0x58c43a : 0xffffff;
      else if (feita) { cor = 0x58c43a; esc = 0.001; } else if (A && k === A.prox) { cor = 0xffd84a; esc = 1 + Math.sin(t * 6) * 0.07; } else cor = [0xff7a00, 0xec2e8c, 0x00b5f0][k % 3];
      void proxima;
      matriz(im, i, x, y, z, Math.atan2(normalHeli[i][0], normalHeli[i][1]), esc);
      im.setColorAt(i, _c.set(cor));
    });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  }
  function pintarBoias(t) {
    const im = D3.barco.boias;
    BARCO.boias.forEach((b, k) => {
      const feita = A && k < A.prox, proxima = A && k === A.prox;
      matriz(im, k, b.x, 0.5 + Math.sin(t * 2 + k) * 0.06, b.z, 0, proxima ? 1.35 + Math.sin(t * 6) * 0.1 : 1);
      im.setColorAt(k, _c.set(feita ? 0x58c43a : proxima ? 0xffd84a : k % 2 ? 0xffffff : 0xec2e8c));
    });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  }

  const alvoDe = (id, prox) => {
    if (id === "pula") { const i = prox < CHECKPOINTS_PULA.length ? CHECKPOINTS_PULA[prox] : CHEGADA_PULA; return { x: plat[i].cx, z: plat[i].cz, emoji: prox < CHECKPOINTS_PULA.length ? "🚩" : "🏁" }; }
    if (id === "heli") { const a = HELI.argolas[prox]; return { x: a[0], z: a[1], emoji: "⭕" }; }
    const b = BARCO.boias[prox]; return { x: b.x, z: b.z, emoji: "🛟" };
  };
  const total = (id) => desafio(id).total;
  const textoHud = () => {
    const D = desafio(A.id), nome = { pula: "Checkpoint", heli: "Argola", barco: "Boia" }[A.id];
    const feitos = A.id === "pula" ? Math.min(A.prox, total(A.id)) : A.prox;
    const h = `<span>${D.icone} ${D.nome}</span><span class="t">⏱ ${formatarTempo(A.t)}</span><span>🚩 ${nome} ${feitos}/${total(A.id)}</span>`;
    if (h !== hudTxt) { hudTxt = h; hud.innerHTML = h; }
  };
  let hudTxt = "";

  function comecar(id) {
    if (A) return;
    const r = reg(id), D = desafio(id);
    A = { id, t: 0, prox: 0, cp: id === "pula" ? { x: C.x0 + 1.4, z: lz, y: 0.07 } : null, armado: false, fora: 0 };
    cooldown = 0; card.classList.remove("on");
    hud.classList.add("on"); textoHud();
    ctx.alvo?.(alvoDe(id, 0));
    ctx.sons?.checkpoint?.();
    if (!r.visto) { r.visto = true; ctx.salvar?.(); ctx.falar?.(`rp-des-${id}`); ctx.dizer?.("Anfitriã", `${D.icone} ${D.nome}: valendo!`, 3200); }
    else falaAviso(`${D.icone} ${D.nome}: valendo!`, 1.8);
    pintarProgresso();
  }
  function cancelar(msg) {
    if (!A) return;
    A = null; hud.classList.remove("on"); ctx.alvo?.(null);
    if (msg) falaAviso(msg, 2.2);
  }
  function passouParte() {
    A.prox++;
    const id = A.id;
    if (A.prox >= total(id) + (id === "pula" ? 1 : 0)) return terminar();
    ctx.sons?.checkpoint?.();
    if (id === "pula") { const p = plat[CHECKPOINTS_PULA[A.prox - 1]]; A.cp = { x: p.cx, z: p.cz, y: p.h + 0.07 }; A.armado = false; falaAviso("🚩 Checkpoint! Se cair, volta aqui.", 2); }
    ctx.alvo?.(alvoDe(id, Math.min(A.prox, id === "pula" ? CHECKPOINTS_PULA.length : total(id) - 1)));
    pintarProgresso(); textoHud();
  }
  function terminar() {
    const id = A.id, t = A.t, D = desafio(id), r = reg(id);
    ctx.sons?.chegada?.();
    const med = medalhaDe(id, t);
    const recordeNovo = r.melhor == null || t < r.melhor;
    r.top = [...r.top, t].sort((a, b) => a - b).slice(0, 3);
    r.melhor = r.top[0];
    let ganhou = 0, primeira = false;
    if (med) {
      primeira = !r.medalhas[med] && ctx.vezes(motivoMedalha(id, med)) === 0;
      r.medalhas[med] = true;
      if (primeira) ganhou = ctx.pagar(PREMIO_MEDALHA[med], motivoMedalha(id, med), `${ICONE_MEDALHA[med]} Medalha`) ?? PREMIO_MEDALHA[med];
    }
    ctx.salvar?.();
    desenharPlaca(id);
    hud.classList.remove("on"); ctx.alvo?.(null);
    A = null; cooldown = 3;
    const c = card.querySelector(".c");
    c.innerHTML = `<div class="m">${med ? ICONE_MEDALHA[med] : "🏁"}</div><h2>${med ? `Medalha de ${NOME_MEDALHA[med].toLowerCase()}!` : "Você chegou!"}</h2>
      <div>${D.icone} ${D.nome}</div><div><b>⏱ ${formatarTempo(t)}</b>${recordeNovo ? ' <span class="novo">· Novo recorde!</span>' : ""}</div>
      ${ganhou ? `<div class="moedas">+${ganhou} Rabiscoins</div>` : med ? "<div>Essa medalha você já tinha. Que tal uma melhor?</div>" : "<div>Tente de novo para ganhar uma medalha!</div>"}
      <div>Recorde: ${formatarTempo(r.melhor)}</div><button type="button">Legal!</button>`;
    c.querySelector("button").addEventListener("click", (e) => { e.stopPropagation(); card.classList.remove("on"); });
    card.classList.add("on"); tCard = 9;
    if (med) { ctx.falar?.(`rp-des-${med}`); ctx.dizer?.("Anfitriã", `${ICONE_MEDALHA[med]} Medalha de ${NOME_MEDALHA[med].toLowerCase()}! ${formatarTempo(t)}`, 3500); }
    ultimo = { id, tempo: t, medalha: med, ganhou, recordeNovo };
  }
  let ultimo = null;

  // atravessou o plano da argola (qualquer sentido) a até raio + 1 do centro?
  function cruzou(i, p, q) {
    const [x, z, y] = pontosHeli[i], [nx, nz] = normalHeli[i];
    const s0 = (p.x - x) * nx + (p.z - z) * nz, s1 = (q.x - x) * nx + (q.z - z) * nz;
    if (!((s0 < 0 && s1 >= 0) || (s0 > 0 && s1 <= 0))) return false;
    const f = s0 / (s0 - s1 || 1), mx = p.x + (q.x - p.x) * f, my = p.y + (q.y - p.y) * f, mz = p.z + (q.z - p.z) * f;
    return Math.hypot(mx - x, mz - z, my - y) < HELI.raio + 1.2;
  }

  function atualizar(dt, t) {
    const v = ctx.veiculo(), pos = v ? v.pos : j.pos, alt = v ? (v.tipo === "heli" ? v.alt : 0) : j.pos.y;
    const P = { x: pos.x, y: v?.tipo === "heli" ? alt : j.pos.y, z: pos.z };
    // some de longe (poucas chamadas de desenho)
    for (const k of Object.keys(D3)) { const d = D3[k], dd = dist2(pos.x, pos.z, d.centro[0], d.centro[1]); d.grupo.visible = dd < d.raio + 60; }
    if (tAviso > 0 && (tAviso -= dt) <= 0) aviso.classList.remove("on");
    if (tCard > 0 && (tCard -= dt) <= 0) card.classList.remove("on");
    if (cooldown > 0) cooldown -= dt;
    const aPe = !v && !ctx.ocupado();
    // ---- largadas
    const noP = aPe && Math.abs(P.x - lx) < 1.7 && Math.abs(P.z - lz) < 2.6 && P.y < 1.4;
    const noB = v?.tipo === "barco" && Math.abs(P.x - GB.x) < 3.6 && Math.abs(P.z - GB.z) < 2.2;
    const cruzouHeli = v?.tipo === "heli" && prev.heli && cruzou(0, prev, P);
    if (!A && cooldown <= 0) {
      if (noP && !prev.ini.pula) comecar("pula");
      else if (noB && !prev.ini.barco) comecar("barco");
      else if (cruzouHeli) comecar("heli");
    }
    prev.ini.pula = noP; prev.ini.barco = noB;
    // ---- andamento
    if (A) {
      A.t += dt;
      const id = A.id;
      if (id === "pula") {
        if (v || ctx.ocupado() || dist2(pos.x, pos.z, D3.pula.centro[0], D3.pula.centro[1]) > 80) cancelar("Desafio cancelado.");
        else {
          const alvoI = A.prox < CHECKPOINTS_PULA.length ? CHECKPOINTS_PULA[A.prox] : CHEGADA_PULA, p = plat[alvoI];
          if (P.y > 0.5 && j.noChao) A.armado = true; // só vale "cair" depois de ficar em pé numa plataforma (pular no chão perto da largada não reinicia)
          if (P.x > p.x0 + 0.2 && P.x < p.x1 - 0.2 && P.z > p.z0 + 0.2 && P.z < p.z1 - 0.2 && P.y > p.h - 0.25 && P.y < p.h + 0.8 && j.noChao) passouParte();
          else if (A.armado && P.y < 0.4) { // caiu: volta ao último checkpoint, sem castigo
            j.pos.set(A.cp.x, A.cp.y, A.cp.z); j.vel.set(0, 0, 0); A.armado = false; ctx.sons?.erro?.();
            falaAviso("Opa! Volta para o último checkpoint. Sem problema!", 2.2);
          }
        }
      } else if (id === "heli") {
        if (v?.tipo !== "heli") { A.fora += dt; if (A.fora > 2.5) cancelar("Desafio cancelado: volte ao helicóptero.");
        } else {
          A.fora = 0;
          if (prev.heli && cruzou(A.prox + 1, prev, P)) passouParte();
        }
      } else if (id === "barco") {
        if (v?.tipo !== "barco") { A.fora += dt; if (A.fora > 2.5) cancelar("Desafio cancelado: volte ao barquinho."); }
        else { A.fora = 0; const b = BARCO.boias[A.prox]; if (dist2(P.x, P.z, b.x, b.z) < BARCO.raio) passouParte(); }
      }
      if (A) { textoHud(); }
    }
    prev.x = P.x; prev.y = P.y; prev.z = P.z; prev.heli = v?.tipo === "heli";
    if (D3.heli.grupo.visible) pintarHeli(t);
    if (D3.barco.grupo.visible) pintarBoias(t);
    if (D3.pula.grupo.visible && !A) { /* discos parados */ }
  }

  // ---------- testes e Rabisfone
  function teleportar(id, k) {
    // k = 0: largada · k > 0: o k-ésimo checkpoint/argola/boia (põe o jogador logo antes de passar por ele)
    const v = ctx.veiculo();
    if (id === "pula") {
      const p = k === 0 ? null : plat[k <= CHECKPOINTS_PULA.length ? CHECKPOINTS_PULA[k - 1] : CHEGADA_PULA];
      if (!p) { j.pos.set(lx - 4, 0.07, lz); } else { j.pos.set(p.cx, p.h + 0.07, p.cz); }
      j.vel.set(0, 0, 0);
    } else if (id === "heli" && v) {
      const [x, z, y] = pontosHeli[k]; const [nx, nz] = normalHeli[k];
      v.pos.set(x - nx * 3, y, z - nz * 3); v.alt = y; v.ang = Math.atan2(nx, nz); v.vel = 0; v.vs = 0; v.rotor = 1; j.pos.set(v.pos.x, y + 0.07, v.pos.z);
      prev.x = v.pos.x; prev.y = y; prev.z = v.pos.z; prev.heli = true;
    } else if (id === "barco" && v) {
      const pts = [{ x: GB.x, z: GB.z - 6 }, GB, ...BARCO.boias], a = pts[k], b = pts[k + 1];
      const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
      v.pos.set(k === 0 ? a.x : b.x - (dx / l) * 4, 0.03, k === 0 ? a.z : b.z - (dz / l) * 4); v.ang = Math.atan2(dx, dz); v.vel = 0; j.pos.set(v.pos.x, 0.07, v.pos.z);
    }
  }
  const lista = () => DESAFIOS.map((d) => { const r = reg(d.id); const med = MEDALHAS.filter((m) => r.medalhas[m]).pop() ?? null; return { id: d.id, nome: d.nome, icone: d.icone, x: d.x, z: d.z, melhor: r.melhor, medalha: med, tempos: d.tempos }; });

  function destruir() {
    cancelar();
    for (const s of solidosMeus) { const i = mundo.solidos.indexOf(s); if (i >= 0) mundo.solidos.splice(i, 1); }
    cena.remove(raiz);
    raiz.traverse((o) => { if (o.isMesh) { if (!o.geometry?.userData?.compartilhada) o.geometry?.dispose?.(); const m = o.material; for (const mm of Array.isArray(m) ? m : [m]) mm?.dispose?.(); } });
    for (const t of texs) t.dispose();
    void geos; void mats; void toNum;
    hud.remove(); aviso.remove(); card.remove(); estilo.remove();
  }
  return {
    atualizar, destruir, lista, teleportar, comecar,
    get ativo() { return A ? { id: A.id, t: A.t, prox: A.prox, total: total(A.id), cp: A.cp, armado: A.armado } : null; },
    get ultimo() { return ultimo; },
    forcarTempo(s) { if (A) A.t = s; },
    get grupos() { return Object.fromEntries(Object.entries(D3).map(([k, d]) => [k, d.grupo])); },
    plataformas: plat, pontosHeli, normalHeli,
    get cartaoAberto() { return card.classList.contains("on"); }, fecharCartao() { card.classList.remove("on"); },
    placa: (id) => placas[id]?.malha, hud,
  };
}
