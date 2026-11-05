// Rabiscolândia: cenas das missões das parceiras na rua (etapa { tipo: "cena" } de missoes-dados.js). O Rabisco chega na marca,
// fica parado nela e o botão faz cada parte, com uma câmera de cena.
//   "pet"  · Marlon Máquinas: cada garrafa sobe a esteira, entra no container e sai separada em três caixas (rótulo, tampa, flocos)
//   "obra" · Speedy Soluções: andaime e poeira; sai a frente antiga, entram os perfis de alumínio e depois a pele de vidro da Kids II
//   "ale" · Sítio Floresça: pegar a pata Ale que fugiu e soltar no lago · "duck" · tirar o Duck do lago e levar até a Tia Regina
//   "comida" · milho para as galinhas e os patos · "horta" · regar, colher e entregar · "rocar" · o roçador na grama alta ·
//   "kids" · as crianças da Kids II de ônibus até o sítio (frutas e balanço de pneu) e de volta para a escola ·
//   "pesca" · pescaria com o Junior no píer da casa-container (pega, mostra e solta o peixe)
//   "presepio" · Natal: as 7 peças do presépio entram uma por vez na praça, com a história do nascimento de Jesus
// Só anda enquanto é a etapa atual: fim() desfaz tudo que for da cena (também quando a criança larga a missão).
//
//   const c = criarCena("pet", ctx);   c.contexto(p)  c.atualizar(dt, t, p)  c.alvo()  c.texto()  c.info()  c.fim()

import { THREE, mat, malha, texturaCanvas, mesclar } from "./base3d.js";
import { cx as pc } from "./blocos.js";
import { PRESEPIO } from "./natal.js";
import { criarMorador } from "./personagens.js";
import { SITIO } from "./sitio-dados.js";

// grupo com o mesmo lugar e giro do prédio: dentro dele vale a coordenada da fachada (frente em +z)
function noPredio(ctx, lugarId) {
  const l = ctx.lugares().find((q) => q.id === lugarId), [ox, oz, rot] = l.origem;
  const g = new THREE.Group(); g.position.set(ox, 0, oz); g.rotation.y = rot;
  const mundo = (x, z) => [ox + x * Math.cos(rot) + z * Math.sin(rot), oz - x * Math.sin(rot) + z * Math.cos(rot)];
  return { g, mundo, rot, l };
}
// marca brilhante no chão, onde o Rabisco para
function marcaChao(cor = 0xffcc1f) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 28), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.14; m.userData.dinamico = true;
  return m;
}
const onda = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
// para onde os braços do Rabisco vão quando ele solta uma garrafa ou trabalha na obra
function bracos(rb, k) {
  rb.bracoE.ombro.rotation.set(-1.5 * k, 0, 0.2); rb.bracoD.ombro.rotation.set(-1.5 * k, 0, -0.2);
  rb.bracoE.cotovelo.rotation.x = -0.25 * k; rb.bracoD.cotovelo.rotation.x = -0.25 * k;
}

// ------------------------------------------------------------------ a máquina do seu Marlon
function cenaPet(ctx) {
  const { g, mundo } = noPredio(ctx, "parceiro-marlon-maquinas");
  ctx.temp(g);
  const { E, sons, falar, dizer } = ctx;
  const AZ = 0x2f6fc0, VM = 0xe0342b, VD = 0x58c43a;
  const LOCAL_MARCA = [-7.5, 1.9], [mx, mz] = mundo(...LOCAL_MARCA);
  const marca = marcaChao(0x58c43a); marca.position.set(LOCAL_MARCA[0], 0.14, LOCAL_MARCA[1]); g.add(marca);
  // as três caixas na frente do container, cada uma com o nome na frente (uma textura só, cortada em três)
  const caixas = [{ x: -6.2, cor: VM, nome: "RÓTULO" }, { x: -4.5, cor: AZ, nome: "TAMPA" }, { x: -2.8, cor: VD, nome: "FLOCOS" }];
  const zc = -1.55, fixas = new THREE.Group(); g.add(fixas);
  const tex = texturaCanvas(768, 128, (c, w, h) => {
    caixas.forEach((q, i) => {
      c.fillStyle = "#ffffff"; c.fillRect((i * w) / 3 + 6, 6, w / 3 - 12, h - 12);
      c.font = "900 54px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = `#${new THREE.Color(q.cor).getHexString()}`; c.fillText(q.nome, (i + 0.5) * (w / 3), h / 2 + 3);
    });
  });
  const matNome = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  for (const [i, q] of caixas.entries()) {
    pc(fixas, 1.46, 0.12, 1.1, q.cor, q.x, 0.2, zc, { sombra: false });
    for (const [w, d, x, z] of [[1.46, 0.1, 0, 0.5], [1.46, 0.1, 0, -0.5], [0.1, 1.1, -0.68, 0], [0.1, 1.1, 0.68, 0]]) pc(fixas, w, 0.86, d, q.cor, q.x + x, 0.57, zc + z, { sombra: false });
    // a boca da saída no container, em cima de cada caixa
    pc(fixas, 0.78, 0.5, 0.2, 0x2a2d31, q.x, 1.32, -2.86, { sombra: false }); pc(fixas, 0.78, 0.08, 0.72, 0x7f868f, q.x, 1.06, -2.5, { sombra: false, rx: 0.4 });
    const pl = new THREE.PlaneGeometry(1.36, 0.46), uv = pl.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) + i) / 3);
    const n = new THREE.Mesh(pl, matNome); n.position.set(q.x, 0.56, zc + 0.56); fixas.add(n);
  }
  mesclar(fixas);
  // o que enche cada caixa e o que voa: a garrafa, o rótulo, a tampa e os flocos
  const montes = caixas.map((q, i) => { const m = malha(new THREE.BoxGeometry(1.2, 0.5, 0.84), mat([0xffb3a8, 0x6db8ff, 0xcdeeff][i]), { sombra: false }); m.position.set(q.x, 0.3, zc); m.scale.y = 0.01; g.add(m); return m; });
  const garrafa = new THREE.Group(); g.add(garrafa); garrafa.visible = false; garrafa.scale.setScalar(1.9);
  { const d = new THREE.Group(); garrafa.add(d);
    pc(d, 0.26, 0.48, 0.26, 0x7fd3f2, 0, 0.24, 0, { sombra: false }); pc(d, 0.2, 0.08, 0.2, 0x7fd3f2, 0, 0.52, 0, { sombra: false }); pc(d, 0.1, 0.08, 0.1, 0xbfe6ff, 0, 0.59, 0, { sombra: false });
    pc(d, 0.27, 0.2, 0.27, VM, 0, 0.26, 0, { sombra: false }); pc(d, 0.12, 0.08, 0.12, AZ, 0, 0.66, 0, { sombra: false }); mesclar(d); }
  const rotulo = malha(new THREE.BoxGeometry(0.72, 0.42, 0.05), mat(VM), { sombra: false }), tampa = malha(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 10), mat(AZ), { sombra: false });
  rotulo.visible = tampa.visible = false; g.add(rotulo, tampa);
  const N_FL = 14, flocos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.07, 0.2), mat(0xffffff), N_FL);
  flocos.userData.dinamico = true; flocos.visible = false; flocos.frustumCulled = false; g.add(flocos);
  const cores = [0x7fd3f2, 0xbfe6ff, 0xffffff], _c = new THREE.Color(), _o = new THREE.Object3D();
  for (let i = 0; i < N_FL; i++) flocos.setColorAt(i, _c.set(cores[i % 3]));
  const sorteio = Array.from({ length: N_FL }, (_, i) => [((i * 37) % 11) / 11 - 0.5, ((i * 53) % 13) / 13 - 0.5, ((i * 19) % 7) / 7]);
  // luz no container, que pisca enquanto ele pica
  const luz = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0x3a1a10 })); luz.position.set(-1.3, 3.5, -3); g.add(luz);

  const total = ctx.M.etapas[0].itens.length;
  let preso = false, feitas = 0, ciclo = -1, tRonco = 0, tBraco = 0, tFecha = 0, disse = false, cicloFixo = null;
  const posEsteira = (k) => [-10.2 + 3.45 * k, 2.42 + 1.9 * k, -4.15]; // sobe do pé da esteira até a boca do funil
  const camera = () => { const [cx, cz] = mundo(-3.9, 7.4), [ax, az] = mundo(-4.9, -3.4); return { pos: [cx, 4.7, cz], alvo: [ax, 2.1, az] }; };
  function colocar() {
    if (ciclo >= 0 || feitas >= total) return;
    ciclo = 0; tBraco = 0.45;
    ctx.tirarDaCabeca(`pet${feitas + 1}`);
    sons.pulo?.();
    garrafa.visible = true; garrafa.rotation.set(0, 0, 0); disse = false;
    ctx.npc("marlon").m.acenar?.(1.2);
  }
  function chegar() {
    preso = true; marca.visible = false;
    ctx.vista(camera());
    const dirR = Math.atan2(...(() => { const [ax, az] = mundo(-8, -4); return [ax - mx, az - mz]; })());
    ctx.travar({ x: mx, z: mz, dir: dirR, modo: "parado", segundos: 1e6, rotulo: "♻️ Colocar a garrafa", aoAcao: colocar, posar: (rb, dt) => { tBraco = Math.max(0, tBraco - dt); bracos(rb, Math.sin(Math.min(1, tBraco / 0.45) * Math.PI)); } });
    const f = E.falas[0]; dizer("Rabiscolândia", f.texto, 6200); falar(f.voz);
  }
  return {
    contexto(p) { return !preso && Math.hypot(p.x - mx, p.z - mz) < 2.4 ? { rotulo: "♻️ Ver a máquina do seu Marlon", fazer: chegar } : null; },
    atualizar(dt, t) {
      marca.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
      for (const [i, m] of montes.entries()) { const alvo = Math.max(0.01, (feitas + (ciclo > 3.2 ? 1 : 0)) / total) * (i === 2 ? 1.5 : 1.25); m.scale.y += (alvo - m.scale.y) * Math.min(1, dt * 3); m.position.y = 0.26 + m.scale.y * 0.25; }
      if (tFecha > 0) { tFecha -= dt; if (tFecha <= 0) ctx.fim(); return; }
      if (ciclo < 0) return;
      ciclo = cicloFixo ?? ciclo + dt;
      // 0–0,45 s: voa da mão do Rabisco até o pé da esteira · até 1,9 s: sobe · até 2,3 s: cai no funil
      const [lx, lz] = LOCAL_MARCA;
      if (ciclo < 0.45) { const k = ciclo / 0.45, p = posEsteira(0); garrafa.position.set(lx + (p[0] - lx) * k, 1.5 + (p[1] - 1.5) * k + Math.sin(k * Math.PI) * 1.2, lz + (p[2] - lz) * k); garrafa.rotation.z = k * 2; }
      else if (ciclo < 1.9) { const p = posEsteira((ciclo - 0.45) / 1.45); garrafa.position.set(...p); garrafa.rotation.z = -1.1; }
      else if (ciclo < 2.3) { const k = (ciclo - 1.9) / 0.4, p = posEsteira(1); garrafa.position.set(p[0] + k * 0.25, p[1] - k * 1.1, p[2]); garrafa.rotation.z = -1.1 - k; garrafa.scale.setScalar(1.9 * (1 - k * 0.5)); }
      else if (garrafa.visible) { garrafa.visible = false; garrafa.scale.setScalar(1.9); }
      // pica por dentro: luz piscando e o barulhinho da máquina, bem espaçado (não é por quadro)
      const picando = ciclo > 2.2 && ciclo < 3.7;
      luz.material.color.setHex(picando && Math.floor(ciclo * 9) % 2 ? 0xffa21f : 0x3a1a10);
      if (picando) { tRonco -= dt; if (tRonco <= 0) { tRonco = 0.16; sons.bloco?.(); } }
      // sai em três: rótulo, tampa e flocos, cada um pela sua boca e na sua caixa
      const caiu = (q, a, b, o, yBoca = 1.25) => { const k = onda(ciclo, a, b); o.visible = k > 0 && k < 1; o.position.set(q.x, yBoca - (yBoca - 0.5) * k * k, -2.72 + (zc + 2.72) * k); o.rotation.y = k * 6; o.rotation.x = k * 3; };
      caiu(caixas[0], 3.3, 3.85, rotulo); caiu(caixas[1], 3.55, 4.05, tampa);
      const kf = onda(ciclo, 3.3, 4.3); flocos.visible = kf > 0 && kf < 1;
      if (flocos.visible) { for (let i = 0; i < N_FL; i++) { const k = Math.max(0, Math.min(1, (kf - sorteio[i][2] * 0.5) * 2)), [a, b] = sorteio[i]; _o.position.set(caixas[2].x + a * 1.0 * k, 1.25 - 0.8 * k * k, -2.72 + (zc + 2.72 + b * 0.7) * k); _o.rotation.set(k * 8 + i, k * 5, 0); _o.scale.setScalar(k > 0 ? 1 : 0.001); _o.updateMatrix(); flocos.setMatrixAt(i, _o.matrix); } flocos.instanceMatrix.needsUpdate = true; }
      if (!disse && ciclo > 3.9) { disse = true; sons.moeda?.(); }
      if (ciclo > 4.4) {
        ciclo = -1; feitas++;
        if (feitas === 1) { const f = E.falas[1]; dizer("Rabiscolândia", f.texto, 5600); falar(f.voz); }
        if (feitas >= total) tFecha = 1.2;
      }
    },
    alvo() { return preso ? null : { x: mx, z: mz, emoji: "♻️" }; },
    texto() { return preso ? `Coloque as garrafas na esteira: ${feitas} de ${total}` : "Vá até a marca verde, no portão do galpão"; },
    info() { return { x: mx, z: mz, preso, feitas, total, ciclo }; },
    fixarCiclo(c) { cicloFixo = c; }, // testes: para a animação num instante, para fotografar
    fim() { if (preso) { ctx.destravar(); ctx.vista(null); } matNome.dispose(); tex.dispose(); flocos.dispose?.(); },
  };
}

// ------------------------------------------------------------------ a obra da frente da Educarte Kids II
// andaime (some no fim) e uma nuvem de poeira em pontinhos, uma chamada só
function poeiraObra() {
  const N = 60, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const tex = texturaCanvas(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, "rgba(255,250,240,0.95)"); g.addColorStop(1, "rgba(255,250,240,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  const m = new THREE.PointsMaterial({ map: tex, size: 2.4, transparent: true, opacity: 0, depthWrite: false, color: 0xe9ded0 });
  const pts = new THREE.Points(geo, m); pts.frustumCulled = false; pts.userData.dinamico = true;
  const dados = Array.from({ length: N }, (_, i) => [((i * 37) % 60) / 60, ((i * 13) % 17) / 17, ((i * 7) % 11) / 11]);
  return { pts, m, geo, tex, mexer(k, w, h, z0, tRel) {
    for (let i = 0; i < N; i++) { const [a, b, c] = dados[i]; pos[i * 3] = (a - 0.5) * w + Math.sin(tRel * 2 + i) * 0.4; pos[i * 3 + 1] = b * h + tRel * (0.3 + c * 0.7); pos[i * 3 + 2] = z0 + c * 2.5; }
    geo.attributes.position.needsUpdate = true; m.opacity = k;
  } };
}
function andaime() {
  const g = new THREE.Group(), T = 0x5a6b7a, TB = 0xc99a4a, f = { sombra: false };
  for (const x of [-8.6, -4.4, 0, 4.4, 8.6]) for (const z of [4.4, 5.6]) pc(g, 0.13, 7.5, 0.13, T, x, 3.75, z, f);
  for (const y of [2.4, 4.8, 7.2]) { for (const z of [4.4, 5.6]) pc(g, 17.4, 0.1, 0.1, T, 0, y, z, f); pc(g, 17.2, 0.08, 1.1, TB, 0, y - 0.06, 5, f); }
  for (const [x, s] of [[-6.5, 1], [-2.2, -1], [2.2, 1], [6.5, -1]]) for (const y of [1.2, 3.6]) pc(g, 0.08, 4.8, 0.08, T, x, y, 5.6, { ...f, rz: s * 1.05 });
  mesclar(g);
  return g;
}
function cenaObra(ctx) {
  const { g, mundo } = noPredio(ctx, "kids2");
  ctx.temp(g);
  const { E, sons, falar, dizer, M } = ctx;
  const jaFeita = ctx.salvo.missoesFeitas?.includes(M.id);
  // o corpo da escola: mesma escala e deslocamento de predios.js (0,9716 e −12,87), para o andaime e a poeira caírem na frente dela
  const e = new THREE.Group(); e.scale.setScalar(0.9716); e.position.z = -12.87; g.add(e);
  const LOCAL = [0, -4.6], [mx, mz] = mundo(...LOCAL);
  const marca = marcaChao(0x00b5f0); marca.position.set(LOCAL[0], 0.14, LOCAL[1]); g.add(marca);
  const estrutura = andaime(); estrutura.visible = false; e.add(estrutura);
  const po = poeiraObra(); e.add(po.pts);
  let preso = false, fase = 0, tPo = 0, tFecha = 0, tBraco = 0, ocupada = 0;
  const camera = () => { const [cx, cz] = mundo(0, 3.2), [ax, az] = mundo(0, -9); return { pos: [cx, 7.4, cz], alvo: [ax, 2.3, az] }; };
  // obra: fase 1 tira a antiga, 2 monta os perfis, 3 põe o vidro (e fecha a missão)
  function bater() {
    if (ocupada > 0 || fase >= 3) return;
    fase++; ocupada = 2.2; tPo = 2.2; tBraco = 0.6; sons.bloco?.();
    if (fase === 1) { ctx.frenteKids2(1); const f = E.falas[1]; dizer("Rabiscolândia", f.texto, 4200); falar(f.voz); }
    if (fase === 2) { ctx.frenteKids2(2); const f = E.falas[2]; dizer("Rabiscolândia", f.texto, 4200); falar(f.voz); }
    if (fase === 3) { ctx.frenteKids2(3); sons.moeda?.(); estrutura.visible = true; tFecha = 2.4; }
  }
  function chegar() {
    preso = true; marca.visible = false; estrutura.visible = true;
    ctx.vista(camera());
    const [ax, az] = mundo(0, -9);
    ctx.travar({ x: mx, z: mz, dir: Math.atan2(ax - mx, az - mz), modo: "parado", segundos: 1e6, rotulo: "🔨 Trabalhar na obra", aoAcao: bater, posar: (rb, dt) => { tBraco = Math.max(0, tBraco - dt); bracos(rb, Math.abs(Math.sin(tBraco * 9)) * 0.7); } });
    const f = E.falas[0]; dizer("Rabiscolândia", f.texto, 5200); falar(f.voz);
  }
  return {
    contexto(p) { return !preso && Math.hypot(p.x - mx, p.z - mz) < 2.6 ? { rotulo: "🚧 Começar a obra", fazer: chegar } : null; },
    atualizar(dt, t) {
      marca.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
      ocupada = Math.max(0, ocupada - dt);
      if (tPo > 0) { tPo -= dt; po.mexer(Math.min(1, tPo) * 0.8, 17, 7, 3.6, 2.2 - tPo); if (Math.floor(tPo * 3) !== Math.floor((tPo + dt) * 3)) sons.bloco?.(); } else po.m.opacity = 0;
      if (tFecha > 0) { tFecha -= dt; if (tFecha < 0.6) estrutura.visible = false; if (tFecha <= 0) ctx.fim(); }
    },
    alvo() { return preso ? null : { x: mx, z: mz, emoji: "🚧" }; },
    texto() { return preso ? `Obra da frente nova: parte ${Math.min(3, fase + (ocupada > 0 ? 0 : 1))} de 3` : "Vá até a marca azul, na frente da escola"; },
    info() { return { x: mx, z: mz, preso, fase, ocupada: ocupada > 0, frente: fase }; },
    fim() {
      if (preso) { ctx.destravar(); ctx.vista(null); }
      po.geo.dispose(); po.m.dispose(); po.tex.dispose();
      // largou no meio da obra: volta o que estava (na 1ª vez, a frente antiga; depois de feita, a de vidro)
      const fechou = fase >= 3;
      ctx.frenteKids2(fechou || jaFeita ? 3 : 0);
    },
  };
}

// ------------------------------------------------------------------ o presépio da praça (modo Natal: natal-cidade.js monta as peças)
// O Rabisco fica na marca dourada, de frente para o estábulo; cada botão põe a próxima peça (com um pulinho) e a anfitriã conta
// aquele pedaço da história. Entre uma peça e outra, um tempinho para a fala (sem pressa e sem errar). Largou no meio: as peças
// saem de novo (ou voltam todas, se o presépio já tinha sido montado antes).
const ORDEM_PRESEPIO = ["maria", "jose", "menino", "pastores", "ovelhas", "estrela", "magos"];
function cenaPresepio(ctx) {
  const N = ctx.natal?.(), { E, sons, falar, dizer, M } = ctx;
  const jaFeita = ctx.salvo.missoesFeitas?.includes(M.id);
  const [mx, mz] = PRESEPIO.marca, centro = [PRESEPIO.x, PRESEPIO.z];
  const g = new THREE.Group(); ctx.temp(g);
  const marca = marcaChao(0xffcc1f); marca.position.set(mx, 0.14, mz); g.add(marca);
  N?.presepio.esconderTudo();
  let preso = false, feitas = 0, ocupada = 0, tFecha = 0, tBraco = 0;
  const total = ORDEM_PRESEPIO.length;
  const camera = () => ({ pos: [centro[0] + 4.2, 4.3, centro[1] + 11.5], alvo: [centro[0] - 0.4, 1.9, centro[1] + 0.6] });
  function colocar() {
    if (ocupada > 0 || feitas >= total) return;
    const id = ORDEM_PRESEPIO[feitas], f = E.falas[feitas + 1];
    ctx.tirarDaCabeca(id);
    N?.presepio.mostrar(feitas);
    feitas++; tBraco = 0.5; sons.moeda?.();
    dizer("Rabiscolândia", f.texto, 6200); falar(f.voz);
    ocupada = Math.min(5.5, 1.6 + f.texto.length * 0.035);
    if (feitas >= total) { tFecha = ocupada + 0.4; sons.vitoria?.(); ctx.confete?.(); }
  }
  function chegar() {
    preso = true; marca.visible = false;
    ctx.vista(camera());
    ctx.travar({ x: mx, z: mz, dir: Math.PI, modo: "parado", segundos: 1e6, rotulo: "⭐ Colocar a peça", aoAcao: colocar, posar: (rb, dt) => { tBraco = Math.max(0, tBraco - dt); bracos(rb, Math.sin(Math.min(1, tBraco / 0.5) * Math.PI) * 0.8); } });
    const f = E.falas[0]; dizer("Rabiscolândia", f.texto, 5600); falar(f.voz);
    ocupada = 2.2;
  }
  return {
    contexto(p) { return !preso && Math.hypot(p.x - mx, p.z - mz) < 2.6 ? { rotulo: "⭐ Montar o presépio", fazer: chegar } : null; },
    atualizar(dt, t) {
      marca.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
      ocupada = Math.max(0, ocupada - dt);
      if (tFecha > 0) { tFecha -= dt; if (tFecha <= 0) ctx.fim(); }
    },
    alvo() { return preso ? null : { x: mx, z: mz, emoji: "⭐" }; },
    texto() { return preso ? `Monte o presépio: ${feitas} de ${total}` : "Vá até a marca dourada, na frente do presépio"; },
    info() { return { x: mx, z: mz, preso, feitas, total, ocupada: ocupada > 0 }; },
    fim() {
      if (preso) { ctx.destravar(); ctx.vista(null); }
      // largou no meio: as peças saem (ou voltam todas, se já tinha montado antes)
      if (feitas < total) { N?.presepio.esconderTudo(); if (jaFeita) N?.presepio.mostrarTudo(); }
    },
  };
}

// ------------------------------------------------------------------ Sítio Floresça (sitio.js): a pata Ale e o Duck
// Quem se mexe é do sítio (mundo.sitio): a cena só diz o que o botão faz, para onde a seta aponta e quando termina.
const sitioDe = (ctx) => ctx.lugares().find((l) => l.sitio)?.sitio;
// "ale": a Ale foge pelo gramado (a Tia Regina ajuda); o Rabisco pega a Ale e solta no lago, pelo portãozinho
function cenaAle(ctx) {
  const s = sitioDe(ctx), f = ctx.E.falas[0];
  let pegou = false, soltou = false;
  s.aleFugir();
  return {
    contexto(p) {
      if (!pegou && s.perto(p, s.aleMundo(), 2.4)) return { rotulo: "🦆 Pegar a Ale", fazer: () => { if (!s.pegarAle(ctx.rabisco)) return; pegou = true; s.mostrarMarca(true); ctx.sons.bichinho?.("quack"); ctx.dizer("Rabiscolândia", f.texto, 3800); ctx.falar(f.voz); } };
      if (pegou && !soltou && s.perto(p, s.marcaLagoMundo(), 2.4)) return { rotulo: "🦆 Soltar a Ale no lago", fazer: () => { soltou = true; s.mostrarMarca(false); s.soltarAle(() => ctx.fim()); } };
      return null;
    },
    atualizar() {},
    alvo() { return pegou ? { ...s.marcaLagoMundo(), emoji: "🦆" } : { ...s.aleMundo(), emoji: "🦆" }; },
    texto() { return soltou ? "A Ale voltou para o lago!" : pegou ? "Leve a Ale até o portãozinho do lago" : "Pegue a pata Ale (a Tia Regina ajuda)"; },
    info() { return { pegou, soltou, ale: s.ale, onde: s.aleMundo() }; },
    fim() { if (!soltou) s.cancelarAle(); s.mostrarMarca(false); },
  };
}
// "duck": o Duck está no lago; no portãozinho o Rabisco pega o Duck (ele sai, se sacode) e leva até a Tia Regina
function cenaDuck(ctx) {
  const s = sitioDe(ctx), f = ctx.E.falas[0];
  let estado = "lago"; // lago → saindo → seguindo → entregue
  s.duckNoLago(); s.mostrarMarca(true);
  return {
    contexto(p) {
      if (estado === "lago" && s.duck === "lago" && s.perto(p, s.marcaLagoMundo(), 2.4)) return { rotulo: "🐕 Pegar o Duck", fazer: () => {
        if (!s.chamarDuck(() => { estado = "seguindo"; ctx.dizer("Rabiscolândia", f.texto, 3800); ctx.falar(f.voz); })) return;
        estado = "saindo"; s.mostrarMarca(false); ctx.sons.bichinho?.("au");
      } };
      return null;
    },
    atualizar(dt, t, p) {
      if (estado !== "seguindo") return;
      const r = s.reginaMundo();
      if (s.perto(p, r, 3.6) && s.perto(s.duckMundo(), r, 4.6)) { estado = "entregue"; s.duckEntregar(); ctx.fim(); }
    },
    alvo() { return estado === "seguindo" ? { ...s.reginaMundo(), emoji: "🐕" } : { ...s.marcaLagoMundo(), emoji: "🐕" }; },
    texto() { return estado === "seguindo" ? "Leve o Duck até a Tia Regina" : estado === "saindo" ? "O Duck está saindo do lago…" : "Vá até o portãozinho do lago e pegue o Duck"; },
    info() { return { estado, duck: s.duckMundo() }; },
    fim() { if (estado !== "entregue") s.cancelarDuck(); s.mostrarMarca(false); },
  };
}


// ------------------------------------------------------------------ Sítio Floresça: as quatro missões depois do Duck
const falaDe = (ctx) => (i, ms = 4200) => { const f = ctx.E.falas[i]; if (!f) return; ctx.dizer("Rabiscolândia", f.texto, ms); ctx.falar(f.voz); };
// "comida": pegar o balde de milho no galinheiro → jogar milho para as galinhas (elas vêm correndo e bicam) → jogar para
// os patos do lago (eles nadam até o milho)
function cenaComida(ctx) {
  const s = sitioDe(ctx), Q = SITIO, fala = falaDe(ctx), GL = Q.galinheiro;
  let fase = "balde", tFala = 0, tFim = 0;
  const pGal = [GL.x1 + 1.1, Q.milhoGalinhas[1]];
  s.mostrarMarca(true, [Q.balde[0] + 0.9, Q.balde[1]]);
  const daMao = () => { const o = s.objetoMundo("balde") ?? ctx.pos(); return [o.x, 1.2, o.z]; };
  return {
    contexto(p) {
      if (fase === "balde" && s.perto(p, s.pontoMundo(...Q.balde), 2.3)) return { rotulo: "🪣 Pegar o balde de milho", fazer: () => { s.pegar("balde", ctx.rabisco); fase = "galinhas"; ctx.sons.moeda?.(); s.mostrarMarca(true, pGal); fala(0); } };
      if (fase === "galinhas" && s.perto(p, s.pontoMundo(...pGal), 2.4)) return { rotulo: "🌽 Jogar milho para as galinhas", fazer: () => {
        s.jogarDe(...daMao(), Q.milhoGalinhas, { n: 16, cores: [0xf2c232, 0xffd84a, 0xe8a91f], espalha: 0.6, fica: 9 }); s.milhoGalinhas(10);
        fase = "patos"; s.mostrarMarca(true, Q.marcaLago); tFala = 1.6;
      } };
      if (fase === "patos" && s.perto(p, s.marcaLagoMundo(), 2.4)) return { rotulo: "🌽 Jogar milho para os patos", fazer: () => {
        s.jogarDe(...daMao(), [Q.dentroLago[0] + 0.3, Q.dentroLago[1]], { n: 16, cores: [0xf2c232, 0xffd84a, 0xe8a91f], espalha: 0.8, fica: 8, py: 0.07 }); s.milhoPatos(10);
        fase = "comendo"; s.mostrarMarca(false); tFim = 4.5;
      } };
      return null;
    },
    atualizar(dt) {
      if (tFala > 0) { tFala -= dt; if (tFala <= 0) fala(1); }
      if (tFim > 0) { tFim -= dt; if (tFim <= 0) { fase = "fim"; s.largar("balde"); ctx.fim(); } }
    },
    alvo() { return fase === "balde" ? { ...s.pontoMundo(...Q.balde), emoji: "🪣" } : fase === "galinhas" ? { ...s.pontoMundo(...pGal), emoji: "🐔" } : fase === "patos" ? { ...s.marcaLagoMundo(), emoji: "🦆" } : null; },
    texto() { return fase === "balde" ? "Pegue o balde de milho, no galinheiro" : fase === "galinhas" ? "Jogue milho para as galinhas" : fase === "patos" ? "Leve o balde até o lago e jogue milho para os patos" : "Os bichinhos estão comendo…"; },
    info() { return { fase, balde: s.naMao("balde"), comendo: s.comendo }; },
    fim() { s.largar("balde"); s.mostrarMarca(false); },
  };
}
// "horta": pegar o regador → regar os três canteiros (as plantas crescem) → colher → levar a cesta até a Tia Regina
function cenaHorta(ctx) {
  const s = sitioDe(ctx), Q = SITIO, fala = falaDe(ctx);
  let fase = "regador", tFala = 0, entregou = false;
  const regados = new Set();
  s.replantar();
  s.mostrarMarca(true, [Q.regador[0] + 0.2, Q.regador[1] + 1.1]);
  const proximo = () => [0, 1, 2].find((i) => !regados.has(i));
  const marcaCanteiro = (i) => s.mostrarMarca(true, [Q.horta.x1 + 1.0, Q.horta.z[i]]);
  return {
    contexto(p) {
      if (fase === "regador" && s.perto(p, s.pontoMundo(Q.regador[0], Q.regador[1] + 0.2), 2.3)) return { rotulo: "🚿 Pegar o regador", fazer: () => { s.pegar("regador", ctx.rabisco); fase = "regar"; ctx.sons.moeda?.(); marcaCanteiro(0); fala(0); } };
      if (fase === "regar") for (const i of [0, 1, 2]) if (!regados.has(i) && s.perto(p, s.canteiroMundo(i), 2.2)) return { rotulo: "💧 Regar o canteiro", fazer: () => {
        regados.add(i); s.regar(i); ctx.sons.pulo?.();
        const n = proximo();
        if (n != null) marcaCanteiro(n); else { fase = "crescendo"; s.mostrarMarca(false); tFala = 1.6; }
      } };
      if (fase === "colher" && [0, 1, 2].some((i) => s.perto(p, s.canteiroMundo(i), 2.4))) return { rotulo: "🥬 Colher as alfaces e as cenouras", fazer: () => {
        s.colher(); s.largar("regador"); s.pegar("cestaHorta", ctx.rabisco); ctx.sons.moeda?.(); fase = "levar"; s.mostrarMarca(false); fala(2);
      } };
      return null;
    },
    atualizar(dt, t, p) {
      if (tFala > 0) { tFala -= dt; if (tFala <= 0) { fase = "colher"; marcaCanteiro(1); fala(1); } }
      if (fase === "levar" && !entregou && s.perto(p, s.reginaMundo(), 3.2)) { entregou = true; s.largar("cestaHorta"); ctx.npc("regina")?.m?.comemorar?.(2.5); ctx.fim(); }
    },
    alvo() {
      if (fase === "regador") return { ...s.pontoMundo(...Q.regador), emoji: "🚿" };
      if (fase === "regar") return { ...s.canteiroMundo(proximo() ?? 0), emoji: "💧" };
      if (fase === "colher" || fase === "crescendo") return { ...s.canteiroMundo(1), emoji: "🥬" };
      return fase === "levar" ? { ...s.reginaMundo(), emoji: "🧺" } : null;
    },
    texto() { return fase === "regador" ? "Pegue o regador, na torneirinha da hortinha" : fase === "regar" ? `Regue os canteiros: ${regados.size} de 3` : fase === "crescendo" ? "A hortinha está crescendo…" : fase === "colher" ? "Colha as alfaces e as cenouras" : "Leve a colheita até a Tia Regina"; },
    info() { return { fase, regados: [...regados], horta: s.horta, regador: s.naMao("regador"), cesta: s.naMao("cestaHorta") }; },
    fim() { s.largar("regador"); s.largar("cestaHorta"); s.mostrarMarca(false); s.replantar(); },
  };
}
// "rocar": subir no roçador e passar por cima de cada trecho de grama alta (ele fica baixinho); a faixa conta quantos faltam
function cenaRocar(ctx) {
  const s = sitioDe(ctx), fala = falaDe(ctx);
  s.capimMostrar(true);
  const rocador = () => ctx.veiculos?.().find((v) => v.tipo === "rocador");
  let subiu = false, tFim = 0, falouFalta = false;
  const total = s.capimMundo().length;
  const restam = () => s.capimMundo().filter((q) => !q.cortado);
  return {
    contexto() { return null; }, // é tudo dirigindo (a ação de subir é a do próprio roçador)
    atualizar(dt) {
      const r = rocador(), v = ctx.veiculoAtual?.();
      if (tFim > 0) { tFim -= dt; if (tFim <= 0) ctx.fim(); return; }
      if (!r || v !== r) return;
      if (!subiu) { subiu = true; fala(0, 3800); }
      for (const q of restam()) if (Math.hypot(r.pos.x - q.x, r.pos.z - q.z) < SITIO.capimR + 0.4) s.cortarCapim(q.i);
      const n = restam().length;
      if (n === 1 && !falouFalta) { falouFalta = true; fala(1, 2600); }
      if (n === 0) { tFim = 1.4; ctx.sons.vitoria?.(); }
    },
    alvo() {
      const r = rocador(), v = ctx.veiculoAtual?.();
      if (r && v !== r) return { x: r.pos.x, z: r.pos.z, emoji: "🚜" };
      const p = r?.pos ?? ctx.pos(), q = restam().sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      return q ? { x: q.x, z: q.z, emoji: "🌾" } : null;
    },
    texto() {
      const n = restam().length, r = rocador();
      if (r && ctx.veiculoAtual?.() !== r) return "Suba no roçador, no gramado do sítio";
      return n ? `Grama alta: faltam ${n} de ${total} ${"▮".repeat(total - n)}${"▯".repeat(n)}` : "Gramado roçadinho!";
    },
    info() { const r = rocador(); return { subiu, restam: restam().length, total, rocador: r ? { x: r.pos.x, z: r.pos.z, limite: r.limite ?? null } : null }; },
    fim() { s.capimMostrar(false); },
  };
}
// "kids": buscar as crianças da Educarte Kids II de ônibus → no sítio, colher frutas em três frutíferas e brincar no
// balanço de pneu → todo mundo de volta para o ônibus → de volta para a escola (a Diretora Sabrina recebe na porta).
// As crianças são bonecos-lápis genéricos (personagens.js, simples: 2 malhas cada); no ônibus vão sentadas nos bancos.
const CORES_KIDS = [[0x2f8fe8, "bone"], [0xec2e8c, "laco"], [0x58c43a, null], [0xff8a1f, "laco"]];
const TREES_KIDS = [0, 2, 3]; // as frutíferas da colheita (mangueira, goiabeira e pitangueira); o balanço é o da laranjeira
function cenaKids(ctx) {
  const s = sitioDe(ctx), Q = SITIO, fala = falaDe(ctx);
  const gk = new THREE.Group(); gk.userData.dinamico = true; ctx.grupo.add(gk);
  const g = new THREE.Group(); ctx.temp(g);
  const dir = ctx.npc("diretora"), escola = () => { const [x, z] = ctx.npcPos(dir); return { x, z }; };
  const e0 = escola();
  const kids = CORES_KIDS.map(([cor, acessorio], i) => {
    const m = criarMorador("lapis", { cor, semente: 30 + i, escala: 0.6, acessorio, simples: true });
    gk.add(m.grupo);
    const k = { m, i, x: e0.x + 1.4 + i * 0.9, z: e0.z + 1.2 + (i % 2) * 0.7, rot: Math.PI, modo: "chao", alvo: null, vel: 0 };
    m.grupo.position.set(k.x, 0.04, k.z);
    return k;
  });
  const parada = s.pontoMundo(...Q.estacionaOnibus);
  const marca = marcaChao(0xffcc1f); marca.visible = false; marca.position.set(parada.x, 0.14, parada.z); g.add(marca);
  let fase = "escola", bus = null, tFase = 0, colhidas = new Set(), balancou = 0, noBalanco = null, tBal = 0, aviso = 0, tFim = 0;
  const perto = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
  let ultimoP = null; // as crianças sobem e descem do lado do ônibus em que o Rabisco está
  const ladoDoBus = (k, z0 = 0) => { const a = bus.ang, fx = Math.sin(a), fz = Math.cos(a); let lx = Math.cos(a), lz = -Math.sin(a); if (ultimoP && (ultimoP.x - bus.pos.x) * lx + (ultimoP.z - bus.pos.z) * lz < -0.5) { lx = -lx; lz = -lz; } const lado = bus.larg + 0.8; return [bus.pos.x + lx * lado + fx * (z0 + 1.6 - k * 0.9), bus.pos.z + lz * lado + fz * (z0 + 1.6 - k * 0.9)]; };
  const sentar = (k) => { k.modo = "onibus"; bus.g.add(k.m.grupo); k.m.grupo.position.set(k.i % 2 ? 0.75 : -0.75, 2.3, 0.95 - Math.floor(k.i / 2) * 1.5); k.m.grupo.rotation.set(0, 0, 0); };
  const descer = (lado) => kids.forEach((k) => { const [x, z] = ladoDoBus(k.i); gk.add(k.m.grupo); k.modo = "chao"; k.x = x; k.z = z; k.alvo = null; k.m.grupo.position.set(x, 0.04, z); k.m.pular(); void lado; });
  const embarcar = () => { for (const k of kids) { k.modo = "indo"; } fase = fase === "escola" ? "embarcando" : "embarcando2"; };
  const todosNoBus = () => kids.every((k) => k.modo === "onibus");
  function chamarOnibus() {
    const v = ctx.chamarVeiculo?.("onibus", 0xffcc1f);
    if (!v) return;
    bus = v; embarcar();
  }
  // andar: vai até [ax, az] (devolve a distância que falta)
  const andar = (k, ax, az, dt, vmax = 4.5) => { const dx = ax - k.x, dz = az - k.z, d = Math.hypot(dx, dz); if (d > 0.08) { const v = Math.min(vmax, 1.5 + d * 1.6), q = Math.min(d, v * dt); k.x += (dx / d) * q; k.z += (dz / d) * q; k.rot = Math.atan2(dx, dz); k.vel = v; } else k.vel = 0; return d; };
  function atualizarKids(dt, p) {
    let lider = { x: p.x, z: p.z };
    for (const k of kids) {
      if (k.modo === "onibus" || k.modo === "balanco") { k.m.atualizar(dt, { vel: 0 }); continue; }
      k.vel = 0;
      if (k.modo === "indo" && bus) { const [x, z] = ladoDoBus(0); if (andar(k, x, z, dt, 5) < 0.7) sentar(k); }
      else if (k.modo === "seguir") { const d = Math.hypot(lider.x - k.x, lider.z - k.z), gap = k === kids[0] ? 1.5 : 1.05; if (d > gap) { const f = (d - gap) / d; andar(k, k.x + (lider.x - k.x) * f, k.z + (lider.z - k.z) * f, dt, 6); } lider = k; }
      else if (k.alvo) andar(k, k.alvo[0], k.alvo[1], dt, 4.5);
      if (k.vel < 0.2) { const ang = Math.atan2(p.x - k.x, p.z - k.z); let d = ang - k.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); k.rot += d * Math.min(1, dt * 4); }
      k.m.grupo.position.set(k.x, 0.04, k.z); k.m.grupo.rotation.y = k.rot;
      k.m.grupo.visible = Math.hypot(p.x - k.x, p.z - k.z) < 70;
      k.m.atualizar(dt, { vel: k.vel });
    }
  }
  const seguir = () => kids.forEach((k) => { if (k.modo === "chao") k.modo = "seguir"; });
  const comemorar = () => kids.forEach((k, i) => setTimeout(() => k.m.pular(), i * 120));
  const arvores = () => s.frutiferasMundo().filter((a) => TREES_KIDS.includes(a.i));
  const balanco = () => s.balancosMundo()[0];
  function colher(a, p) {
    colhidas.add(a.i); ctx.sons.moeda?.(); comemorar();
    if (!s.naMao("cestaFrutas")) s.pegar("cestaFrutas", ctx.rabisco);
    const [lx, lz] = s.paraLocal(p.x, p.z);
    s.jogarDe(a.tx, 3.6, a.tz, [lx, lz], { n: 7, cores: s.frutasDe(a.i), espalha: 0.25, fica: 0.1, tam: 1.8, alto: 0.6, py: 1.1 });
    kids.forEach((k, i) => { k.modo = "chao"; k.alvo = [a.x + Math.cos(i * 1.6) * 1.6, a.z + Math.sin(i * 1.6) * 1.6]; });
    if (colhidas.size === TREES_KIDS.length) { fase = "balanco"; tFase = 1.4; } else setTimeout(seguir, 1600);
  }
  // a criança desce do pneu (acabou o tempo, ou o Rabisco empurrou de novo para a próxima): conta uma balançada
  function descerDoBalanco() {
    const k = noBalanco, b = balanco(); if (!k) return;
    s.soltar(b.i); gk.add(k.m.grupo); k.x = b.x + 1.2; k.z = b.z + 0.6; k.modo = "seguir"; k.m.pular(); noBalanco = null; balancou++;
    if (balancou >= 2) { fase = "voltar"; fala(3); }
  }
  // o botão vale sempre (mesmo com alguém no pneu: essa criança desce e a próxima sobe), para nunca travar numa máquina lenta
  function balancar() {
    if (noBalanco) descerDoBalanco();
    if (fase !== "balancoPronto") return;
    const k = kids[balancou % kids.length], b = balanco();
    noBalanco = k; k.modo = "balanco"; s.sentar(b.i, k.m.grupo); s.empurrar(b.i, 3.2); tBal = 3.2; comemorar(); ctx.sons.pulo?.();
  }
  return {
    contexto(p) {
      if (fase === "escola" && perto(p, escola(), 7)) return { rotulo: "🚌 Chamar o ônibus da escola", fazer: chamarOnibus };
      if (fase === "frutas") for (const a of arvores()) if (!colhidas.has(a.i) && perto(p, a, 2.8)) return { rotulo: "🍊 Colher frutas com as crianças", fazer: () => colher(a, p) };
      if (fase === "balancoPronto" && perto(p, balanco(), 3)) return { rotulo: "🛞 Empurrar o balanço", fazer: balancar };
      return null;
    },
    atualizar(dt, t, p) {
      const v = ctx.veiculoAtual?.();
      ultimoP = { x: p.x, z: p.z };
      aviso -= dt; marca.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
      if (bus && !ctx.veiculos?.().includes(bus)) { // o ônibus foi embora (chamou outro veículo no Rabisfone): todo mundo desce e espera
        kids.forEach((k) => { if (k.modo === "onibus" || k.modo === "indo") { gk.add(k.m.grupo); k.modo = "seguir"; k.x = p.x + 1; k.z = p.z + 1; } });
        bus = null; if (["embarcando", "ida", "parado", "embarcando2", "volta"].includes(fase)) fase = fase === "ida" || fase === "embarcando" || fase === "parado" ? "escola" : "voltar";
      }
      // na escola de ônibus (veio dirigindo um): as crianças sobem nele
      if ((fase === "escola" || fase === "voltar") && v?.tipo === "onibus" && Math.abs(v.vel) < 1.5 && perto(v.pos, fase === "escola" ? escola() : p, 16) && kids.some((k) => perto(k, v.pos, 18))) { bus = v; embarcar(); }
      if (fase === "embarcando" && todosNoBus()) { fase = "ida"; fala(0); }
      if (fase === "ida") {
        marca.visible = true;
        if (bus && v === bus && perto(bus.pos, parada, 7.5) && Math.abs(bus.vel) < 1.8) { // estaciona certinho na calçada larga, fora da avenida
          bus.pos.set(parada.x, bus.pos.y, parada.z); bus.ang = Math.sin(bus.ang) >= 0 ? Math.PI / 2 : -Math.PI / 2; bus.vel = 0;
          fase = "parado"; marca.visible = false; s.abrirJa();
        }
      } else marca.visible = false;
      if (fase === "parado" && v !== bus) { descer(); seguir(); fase = "frutas"; fala(1, 5200); }
      if (fase === "balanco") { tFase -= dt; if (tFase <= 0) { fase = "balancoPronto"; fala(2); seguir(); } }
      if (noBalanco) { tBal -= dt; if (tBal <= 0) descerDoBalanco(); }
      if (fase === "voltar" && bus && !v && perto(p, bus.pos, 9)) { s.largar("cestaFrutas"); embarcar(); }
      if (fase === "embarcando2" && todosNoBus()) { fase = "volta"; fala(4); }
      if (fase === "volta" && bus && perto(bus.pos, escola(), 16) && Math.abs(bus.vel) < 1.5) {
        descer(); const e = escola(); kids.forEach((k, i) => { k.alvo = [e.x + 1.2 + i * 0.8, e.z + 1.4 + (i % 2) * 0.6]; });
        fase = "chegou"; tFim = 3; comemorar();
      }
      if (fase === "chegou") { tFim -= dt; if (tFim <= 0) { fase = "fim"; ctx.fim(); } }
      if (fase === "escola" && v && v.tipo !== "onibus" && perto(v.pos, escola(), 14) && aviso <= 0) { aviso = 7; ctx.dizer("Rabiscolândia", "Desça e chame o ônibus da escola, na porta da Kids II.", 3000); }
      atualizarKids(dt, p);
    },
    alvo() {
      if (fase === "escola") return { ...escola(), emoji: "🏫" };
      if (fase === "embarcando" || fase === "embarcando2") return bus ? { x: bus.pos.x, z: bus.pos.z, emoji: "🚌" } : null;
      if (fase === "ida") return { ...parada, emoji: "🌳" };
      if (fase === "parado") return null;
      if (fase === "frutas") { const p = ctx.pos(), a = arvores().filter((q) => !colhidas.has(q.i)).sort((x, y) => Math.hypot(x.x - p.x, x.z - p.z) - Math.hypot(y.x - p.x, y.z - p.z))[0]; return a ? { x: a.x, z: a.z, emoji: "🍊" } : null; }
      if (fase === "balanco" || fase === "balancoPronto") return { ...balanco(), emoji: "🛞" };
      if (fase === "voltar") return bus ? { x: bus.pos.x, z: bus.pos.z, emoji: "🚌" } : { ...escola(), emoji: "🏫" };
      if (fase === "volta") return { ...escola(), emoji: "🏫" };
      return null;
    },
    texto() {
      return { escola: "Vá até a Educarte Kids II e chame o ônibus", embarcando: "As crianças estão subindo no ônibus…", ida: "Dirija o ônibus até o Sítio Floresça", parado: "Desça do ônibus", frutas: `Colha frutas com as crianças: ${colhidas.size} de ${TREES_KIDS.length}`,
        balanco: "Hora do balanço!", balancoPronto: `Empurre o balanço de pneu: ${balancou} de 2`, voltar: bus ? "Leve as crianças de volta para o ônibus" : "Chame o ônibus da escola no Rabisfone", embarcando2: "As crianças estão subindo no ônibus…", volta: "Leve as crianças de volta para a Educarte Kids II", chegou: "As crianças chegaram!", fim: "" }[fase] ?? "";
    },
    info() { return { fase, bus: bus ? { x: bus.pos.x, z: bus.pos.z, ang: bus.ang, i: ctx.veiculos?.().indexOf(bus) } : null, kids: kids.map((k) => ({ modo: k.modo, x: k.x, z: k.z })), colhidas: [...colhidas], balancou, parada, escola: escola() }; },
    fim() {
      if (noBalanco) s.soltar(balanco().i);
      for (const k of kids) k.m.grupo.removeFromParent();
      gk.removeFromParent(); s.largar("cestaFrutas");
    },
  };
}

// "pesca": pegar a vara no deck → jogar a linha da ponta do píer → a boia afunda (o peixe beliscou) → puxar → mostrar o peixe
// para o Junior → soltar o peixe de volta no lago. Se não puxar a tempo, o peixe belisca de novo (nunca trava, nunca perde)
function cenaPesca(ctx) {
  const s = sitioDe(ctx), Q = SITIO, fala = falaDe(ctx), Y = Q.alturaDeck + 0.02;
  let fase = "vara", tEspera = 0, tBelisca = 0, tFim = 0;
  s.mostrarMarca(true, [Q.vara[0], Q.vara[1] + 0.9], Y);
  const ponto = (q) => s.pontoMundo(q[0], q[1]);
  const marcaPesca = () => s.mostrarMarca(true, Q.pesca, Y);
  return {
    contexto(p) {
      if (fase === "vara" && s.perto(p, ponto(Q.vara), 2.4)) return { rotulo: "🎣 Pegar a vara de pescar", fazer: () => { s.pegar("vara", ctx.rabisco); ctx.sons.moeda?.(); s.junior.acenar(2); fase = "jogar"; marcaPesca(); fala(0); } };
      if (fase === "jogar" && s.perto(p, ponto(Q.pesca), 2.2)) return { rotulo: "🎣 Jogar a linha", fazer: () => { s.boia("boiando"); s.mostrarMarca(false); fase = "esperando"; tEspera = 2.2 + Math.random() * 1.2; } };
      if (fase === "beliscando" && s.perto(p, ponto(Q.pesca), 3)) return { rotulo: "🐟 Puxar o peixe!", fazer: () => {
        s.boia("fora"); fase = "voando"; ctx.sons.vitoria?.();
        s.peixeVoa(ctx.rabisco, false, () => { fase = "mostrar"; fala(2, 3600); });
      } };
      if (fase === "mostrar" && s.perto(p, s.juniorMundo(), 3)) return { rotulo: "🐟 Mostrar o peixe para o Junior", fazer: () => {
        s.junior.comemorar(2.5); fase = "soltando"; ctx.sons.moeda?.();
        s.peixeVoa(ctx.rabisco, true, () => { fala(3, 5200); tFim = 3.2; });
      } };
      return null;
    },
    atualizar(dt) {
      if (fase === "esperando") { tEspera -= dt; if (tEspera <= 0) { fase = "beliscando"; tBelisca = 6; s.boia("beliscando"); ctx.sons.bichinho?.("plim"); fala(1, 3000); } }
      else if (fase === "beliscando") { tBelisca -= dt; if (tBelisca <= 0) { fase = "esperando"; tEspera = 1.5; s.boia("boiando"); } } // escapou: belisca de novo daqui a pouco
      if (tFim > 0) { tFim -= dt; if (tFim <= 0) { fase = "fim"; s.largar("vara"); ctx.fim(); } }
    },
    alvo() { return fase === "vara" ? { ...ponto(Q.vara), emoji: "🎣" } : ["jogar", "esperando", "beliscando"].includes(fase) ? { ...ponto(Q.pesca), emoji: "🎣" } : fase === "mostrar" ? { ...s.juniorMundo(), emoji: "🐟" } : null; },
    texto() { return { vara: "Pegue a vara de pescar, no deck da casa-container", jogar: "Vá até a ponta do píer e jogue a linha", esperando: "Espere o peixe beliscar…", beliscando: "A boia afundou: puxe o peixe!", voando: "Pegou!", mostrar: "Mostre o peixe para o Junior", soltando: "Soltando o peixe de volta no lago…", fim: "" }[fase] ?? ""; },
    info() { return { fase, boia: s.estadoBoia, vara: s.naMao("vara"), peixe: s.naMao("peixe") }; },
    fim() { s.boia("fora"); s.largar("vara"); s.largar("peixe"); s.mostrarMarca(false); },
  };
}

export function criarCena(nome, ctx) { return ({ pet: cenaPet, obra: cenaObra, presepio: cenaPresepio, ale: cenaAle, duck: cenaDuck, comida: cenaComida, horta: cenaHorta, rocar: cenaRocar, kids: cenaKids, pesca: cenaPesca })[nome](ctx); }
