// Rabiscolândia: o motor das profissões curtas (dados em profissoes-dados.js). Um turno por vez: veste o uniforme,
// chama o veículo do trabalho (o carro da Speedy já vem com o cavalete de vidros; o caminhão da reciclagem tem caçamba),
// mostra só a tarefa de agora (objetos montados na hora e desmontados depois: orçamento de desenho), aponta a setinha
// e conta no HUD. Cada tarefa rende na hora; o turno completo dá o bônus. Sair no meio: fica com o que já ganhou.
//
//   const P = criarProfissoes(ctx);  P.atualizar(dt, t);  P.contexto() → { rotulo, fazer } | null;  P.alvo();  P.texto()
//   P.comecar(id) → true | "motivo";  P.terminar();  P.ativa → id | null;  P.lista() (Rabifone);  P.info() (testes)
// ctx: { cena, sons, falar, aguardarFim, dizer, pos, veiculoAtual, chamarVeiculo(tipo, cor), vestir(id), tirar(),
//   ganhar(qtd, motivo, rotulo), propaganda(id), confete, raio(), casaFrente(n), ocupado(), missaoAtiva(), salvo(), salvar() }

import { THREE, mat, malha, caixaRedonda, texturaCanvas, mesclar, arvoreReal } from "./base3d.js";
import { gatinho, rackVidros } from "./missoes-objetos.js";
import { tocarNotas } from "./lugares-dentro.js";
import { TRABALHOS, trabalho, montarTurno, valorTarefa, tempoFolgado, PAGA } from "./profissoes-dados.js";
import { PARCEIROS } from "../../src/parceiros.js";

// sons 8-bit originais (onda quadrada; notas MIDI em tempo de batida: [início, duração, nota, ...])
const SOM = {
  comecar: [0, 0.5, 67, 0.5, 0.5, 72, 1, 1, 79],
  tarefa: [0, 0.4, 76, 0.4, 0.4, 79, 0.8, 0.4, 84, 1.2, 1, 88],
  turno: [0, 0.5, 72, 0.5, 0.5, 76, 1, 0.5, 79, 1.5, 0.5, 84, 2, 0.5, 79, 2.5, 1.5, 84, 2.5, 1.5, 88],
  agua: [0, 0.25, 84, 0.25, 0.25, 81, 0.5, 0.25, 77],
  saiu: [0, 0.5, 72, 0.5, 0.5, 67, 1, 1, 72],
};
const texEmoji = new Map();
function figurinha(emoji, escala = 1.6) {
  if (!texEmoji.has(emoji)) texEmoji.set(emoji, texturaCanvas(128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.fillStyle = "#ffffff"; c.beginPath(); c.arc(64, 64, 56, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = "#151515"; c.stroke();
    c.font = "70px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(emoji, 64, 70);
  }));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEmoji.get(emoji) }));
  s.scale.setScalar(escala);
  return s;
}
// argola brilhante no chão (onde parar)
function argola(cor, r = 2.4) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.78, r, 36), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.12; m.material.userData.proprio = true;
  return m;
}
// ---------- peças 3D das tarefas (de blocos, poucas malhas)
// obra: cones listrados e uma pilha de tijolos
function obra() {
  const g = new THREE.Group();
  for (const [x, z] of [[-1.2, 0.6], [1.2, 0.6]]) {
    const c = malha(new THREE.ConeGeometry(0.28, 0.75, 8), mat(0xff7a00)); c.position.set(x, 0.38, z); g.add(c);
    const f = malha(new THREE.CylinderGeometry(0.2, 0.22, 0.12, 8), mat(0xffffff), { sombra: false }); f.position.set(x, 0.42, z); g.add(f);
  }
  for (let i = 0; i < 6; i++) { const t = caixaRedonda(0.5, 0.25, 0.25, mat(0xc8553d)); t.position.set(-0.3 + (i % 3) * 0.3, 0.13 + Math.floor(i / 3) * 0.26, -0.6); g.add(t); }
  mesclar(g);
  return g;
}
// ponto de coleta: caixote com garrafas e uma pilha de papelão
const CORES_PET = [0x7fd3f2, 0x58c43a, 0xbfe6ff];
function garrafa(cor) {
  const g = new THREE.Group();
  const b = caixaRedonda(0.22, 0.5, 0.22, mat(cor)); b.position.y = 0.25; g.add(b);
  const t = caixaRedonda(0.12, 0.12, 0.12, mat(0x2f6fc0)); t.position.y = 0.56; g.add(t);
  return g;
}
function pontoColeta() {
  const g = new THREE.Group();
  const cx = caixaRedonda(1.3, 0.55, 0.9, mat(0x2e9e57)); cx.position.y = 0.28; g.add(cx);
  for (let i = 0; i < 6; i++) { const b = garrafa(CORES_PET[i % 3]); b.position.set(-0.45 + (i % 3) * 0.45, 0.5, -0.2 + Math.floor(i / 3) * 0.4); b.rotation.z = (i % 2 ? 0.3 : -0.2); g.add(b); }
  for (let i = 0; i < 3; i++) { const p = caixaRedonda(0.9, 0.12, 0.7, mat(0xc49a6c)); p.position.set(1.3, 0.07 + i * 0.13, 0.1); p.rotation.y = i * 0.2; g.add(p); }
  mesclar(g);
  return g;
}
// fumaça colorida de mentira: caixote de papelão com fumaça rosa, lilás, azul e amarela (uma malha instanciada só)
const PUFS = 9, CORES_PUF = [0xff8cc0, 0xb69cff, 0x7fd3f2, 0xffe066];
function focoColorido() {
  const g = new THREE.Group();
  const cx = caixaRedonda(0.9, 0.55, 0.7, mat(0xc49a6c)); cx.position.y = 0.28; g.add(cx);
  const aba = caixaRedonda(0.9, 0.06, 0.32, mat(0xb08455), { sombra: false }); aba.position.set(0, 0.6, -0.42); aba.rotation.x = 0.6; g.add(aba);
  mesclar(g);
  const puf = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, depthWrite: false }), PUFS);
  const c = new THREE.Color();
  for (let i = 0; i < PUFS; i++) puf.setColorAt(i, c.setHex(CORES_PUF[i % CORES_PUF.length]));
  puf.userData.dinamico = true; puf.frustumCulled = false; puf.material.userData.proprio = true; g.add(puf);
  g.userData.puf = puf;
  return g;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function animarFumaca(g, t, forca) {
  const puf = g.userData.puf;
  for (let i = 0; i < PUFS; i++) {
    const f = ((t * 0.35 + i / PUFS) % 1), a = i * 2.4 + t * 0.8;
    _v.set(Math.sin(a) * (0.25 + f * 0.6), 0.7 + f * 2.6 * (0.4 + 0.6 * forca), Math.cos(a) * (0.25 + f * 0.6));
    _s.setScalar(Math.max(0.001, (0.5 + f * 0.9) * forca * (1 - f * 0.45)));
    puf.setMatrixAt(i, _m4.compose(_v, _q, _s));
  }
  puf.instanceMatrix.needsUpdate = true;
}
// árvore com o gatinho em cima e a escadinha (que só aparece quando o bombeiro chega)
function arvoreGatinho() {
  const g = new THREE.Group();
  const a = arvoreReal(1, 0); g.add(a); mesclar(a);
  const esc = new THREE.Group(); esc.visible = false; esc.userData.dinamico = true; g.add(esc);
  const madeira = mat(0xd9a14a);
  for (const s of [-1, 1]) { const tr = caixaRedonda(0.1, 3.9, 0.1, madeira); tr.position.set(2.75, 1.95, 0.7 + s * 0.25); esc.add(tr); }
  for (let i = 0; i < 8; i++) { const d = caixaRedonda(0.08, 0.08, 0.5, madeira, { sombra: false }); d.position.set(2.75, 0.35 + i * 0.45, 0.7); esc.add(d); }
  esc.rotation.z = 0.12; mesclar(esc);
  const gato = gatinho(0xff9f43); gato.position.set(1.9, 3.72, 0.7); gato.rotation.y = Math.PI / 2; g.add(gato);
  g.userData.escada = esc; g.userData.gato = gato;
  return g;
}
// gotas d'água da mangueira e do jato: uma malha instanciada (1 chamada de desenho)
const GOTAS = 28;

export function criarProfissoes(ctx) {
  const { cena, sons, falar, dizer } = ctx;
  const grupo = new THREE.Group(); grupo.name = "profissoes"; cena.add(grupo);
  const tocar = (k, bpm = 300) => { if (!sons?.mudo) tocarNotas(SOM[k], bpm, { onda: "square", vol: 0.045 }); };
  // gotas
  const gotas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshBasicMaterial({ color: 0x4fc3ff }), GOTAS);
  gotas.frustumCulled = false; gotas.count = 0; grupo.add(gotas);
  const gotaV = Array.from({ length: GOTAS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), vida: 0 }));
  let proxGota = 0;
  function soltarGota(de, para) {
    const q = gotaV[proxGota]; proxGota = (proxGota + 1) % GOTAS;
    const T = 0.45 + Math.random() * 0.15;
    q.p.copy(de); q.v.set((para.x - de.x) / T + (Math.random() - 0.5), (para.y - de.y) / T + 9.8 * T * 0.5, (para.z - de.z) / T + (Math.random() - 0.5)); q.vida = T;
  }
  function animarGotas(dt) {
    let n = 0;
    for (const q of gotaV) {
      if (q.vida <= 0) continue;
      q.vida -= dt; q.v.y -= 9.8 * dt; q.p.addScaledVector(q.v, dt);
      if (q.vida > 0) gotas.setMatrixAt(n++, _m4.compose(q.p, _q, _s.setScalar(1)));
    }
    gotas.count = n; gotas.instanceMatrix.needsUpdate = true; gotas.visible = n > 0;
  }
  const _de = new THREE.Vector3(), _para = new THREE.Vector3();

  // pontos 💼 de cada base: figurinha e argola, montados só de perto
  const bases = TRABALHOS.map((T) => {
    const g = new THREE.Group(); g.position.set(T.base[0], 0, T.base[1]); g.visible = false;
    const s = figurinha("💼", 1.3); s.position.y = 2.4; g.add(s);
    const sel = figurinha(T.icone, 0.8); sel.position.set(0.75, 2.95, 0); g.add(sel);
    g.add(argola(0xffcc1f, 1.3));
    grupo.add(g);
    return { T, g, s, sel };
  });

  let ativa = null; // { T, tarefas, i, ganhou, t, est, veiculo, rack, fim }
  let aviso = 0;
  const salvoTrab = () => { const s = ctx.salvo?.(); if (!s) return { vistos: [], turnos: {} }; s.trabalhos ??= { vistos: [], turnos: {} }; return s.trabalhos; };
  const veiculoServe = (T, v) => {
    if (!v || !T.veiculoServe) return false;
    if (T.veiculoServe === "porta-malas") return !["bici", "patinete", "barco", "heli", "moto", "jetski", "lancha"].includes(v.tipo);
    return T.veiculoServe.includes(v.tipo);
  };

  function comecar(id) {
    const T = trabalho(id);
    if (!T) return "nao-existe";
    if (ativa) { dizer("Rabiscolândia", "Você já está trabalhando! Termine o turno pelo Rabifone para escolher outro.", 3200); return "ja-trabalhando"; }
    if (ctx.ocupado?.()) { dizer("Rabiscolândia", "Saia para a rua para começar o turno.", 3000); return "ocupado"; }
    if (ctx.missaoAtiva?.()) { dizer("Rabiscolândia", "Termine ou largue a missão de agora antes de começar um turno.", 3600); return "missao"; }
    const vAgora = ctx.veiculoAtual?.();
    let veiculo = null;
    if (T.veiculo) {
      if (vAgora && veiculoServe(T, vAgora)) veiculo = vAgora;
      else if (vAgora) { dizer("Rabiscolândia", "Saia do veículo para começar: o veículo do trabalho chega do seu lado.", 3400); return "no-veiculo"; }
      else { veiculo = ctx.chamarVeiculo?.(T.veiculo.tipo, T.veiculo.cor) ?? null; if (!veiculo) return "sem-lugar"; }
    } else if (vAgora && vAgora.tipo !== "bombeiro") { dizer("Rabiscolândia", "Saia do veículo para começar: o bombeiro mirim trabalha a pé ou no caminhão de bombeiro.", 3600); return "no-veiculo"; }
    const p = ctx.pos();
    const tarefas = montarTurno(T, [p.x, p.z], ctx.casaFrente);
    ativa = { T, tarefas, i: 0, ganhou: 0, t: 0, est: null, veiculo, rack: null };
    if (T.id === "entregador" && veiculo) { const r = rackVidros(); r.name = "cavalete-speedy"; r.position.set(0, 1.0, -veiculo.comp * 0.6); r.scale.setScalar(0.85 / (veiculo.g.scale.x || 1)); veiculo.g.add(r); ativa.rack = r; }
    ctx.vestir?.(T.uniforme);
    const S = salvoTrab(), primeira = !S.vistos.includes(T.id);
    if (primeira) { S.vistos.push(T.id); ctx.salvar?.(); }
    // primeira vez: a anfitriã explica a profissão; depois, só o "turno começou"
    falar(primeira ? `rp-trab-${T.id}-explica` : "rp-trab-comecou");
    dizer("Rabiscolândia", primeira ? T.explica : `${T.icone} ${T.titulo}: turno começou! Siga a setinha até a primeira tarefa.`, primeira ? 9000 : 3600);
    tocar("comecar");
    aviso = primeira ? 9 : 3;
    prepararTarefa();
    return true;
  }
  function limparTarefa() {
    const e = ativa?.est;
    if (!e) return;
    for (const o of e.objs) { o.removeFromParent(); o.traverse((q) => { if (q.geometry && !q.geometry.userData.compartilhada) q.geometry.dispose(); if (q.isSprite || q.material?.userData?.proprio) q.material.dispose(); }); }
    ativa.est = null;
  }
  function prepararTarefa() {
    limparTarefa();
    const tf = ativa.tarefas[ativa.i];
    if (!tf) return;
    const e = { tf, objs: [], t: 0, feito: false, agua: 0, jato: 0, perto: 0, anim: 0 };
    const add = (o, x = tf.x, z = tf.z) => { o.position.x += x; o.position.z += z; grupo.add(o); e.objs.push(o); return o; };
    const p = ctx.pos();
    if (tf.tipo === "entrega") { e.prazo = tempoFolgado(Math.hypot(tf.x - p.x, tf.z - p.z)); add(argola(0x2f8fe8)); if (tf.destino === "obra") add(obra()); e.fig = add(figurinha(tf.emoji)); e.fig.position.y = 3; }
    if (tf.tipo === "coleta") { add(argola(0x58c43a)); e.pilha = add(pontoColeta()); e.fig = add(figurinha("♻️")); e.fig.position.y = 2.8; }
    if (tf.tipo === "galpao") { add(argola(0x58c43a, 3.2)); e.fig = add(figurinha("🏭")); e.fig.position.y = 3.4; }
    if (tf.tipo === "foco") { e.foco = add(focoColorido()); add(argola(0xff8cc0, 1.6)); }
    if (tf.tipo === "gatinho") { e.arvore = add(arvoreGatinho()); add(argola(0xffcc1f, 1.4), tf.x + 2.9, tf.z + 0.7); e.pe = [tf.x + 2.9, tf.z + 0.7]; }
    ativa.est = e;
  }
  // tarefa feita: rende na hora, toca o som e a fala; a próxima aparece um pouquinho depois
  function concluirTarefa(noTempo = false) {
    const e = ativa.est, tf = e.tf, T = ativa.T;
    e.feito = true;
    const qtd = valorTarefa(T, tf, noTempo);
    ativa.ganhou += qtd;
    ctx.ganhar?.(qtd, `rabiscolandia:trabalho:${T.id}`, noTempo ? "⏱️ no tempo" : T.icone);
    tocar("tarefa");
    const FALA = { entrega: "rp-trab-entregou", coleta: "rp-trab-coletou", galpao: "rp-trab-galpao", foco: "rp-trab-apagou", gatinho: "rp-trab-gatinho" }[tf.tipo];
    const k = ativa.i + 1, n = ativa.tarefas.length;
    const ultima = k >= n;
    if (!ultima) { falar(FALA); dizer("Rabiscolândia", `${textoFala(FALA)} +${qtd} Rabiscoins${noTempo ? " (chegou no tempo!)" : ""} · ${k} de ${n}`, 3000); }
    // a próxima tarefa vem no tempo do JOGO (animarFeito), não no relógio: em aparelho lento a animação termina antes
    e.espera = ultima ? 1.7 : 1.8;
  }
  const textoFala = (k) => ({ "rp-trab-entregou": "Entrega feita! Os vidros chegaram inteirinhos.", "rp-trab-coletou": "Recicláveis no caminhão!", "rp-trab-galpao": "Tudo descarregado no galpão! Agora vira coisa nova.", "rp-trab-apagou": "Fumaça apagada! Muito bem.", "rp-trab-gatinho": "O gatinho desceu da árvore, bem tranquilo!" })[k];
  // fim do turno: bônus, festa e a fala de fim; na Speedy e no Marlon, depois da fala, a propaganda já gravada
  function fimDoTurno() {
    const M = ativa, T = M.T;
    ctx.ganhar?.(PAGA.bonus, `rabiscolandia:trabalho:${T.id}:turno`, "⭐ Turno completo");
    M.ganhou += PAGA.bonus;
    const S = salvoTrab(); S.turnos[T.id] = (S.turnos[T.id] ?? 0) + 1; ctx.salvar?.();
    ultimo = { id: T.id, ganhou: M.ganhou, completo: true, tarefas: M.tarefas.length };
    desmontar();
    tocar("turno", 260); ctx.confete?.();
    falar(`rp-trab-${T.id}-fim`);
    dizer("Rabiscolândia", `${T.fim} <b>+${M.ganhou} Rabiscoins</b>`, 9000);
    if (T.parceiro) {
      const parc = PARCEIROS.find((q) => q.id === T.parceiro);
      const minha = ++seriePropaganda;
      Promise.resolve(ctx.aguardarFim?.()).then((acabou) => new Promise((r) => setTimeout(r, acabou ? 400 : 800 + T.fim.length * 95)))
        .then(() => { if (minha === seriePropaganda && !ativa && parc) { ctx.propaganda?.(T.parceiro); propagandas.push(T.parceiro); } });
    }
  }
  let seriePropaganda = 0, ultimo = null;
  const propagandas = [];
  function desmontar() {
    limparTarefa();
    if (ativa?.rack) { ativa.rack.removeFromParent(); ativa.rack.traverse((q) => q.geometry?.dispose()); }
    const carga = ativa?.veiculo?.g.userData.carga; if (carga) for (const c of [...carga.children]) c.removeFromParent();
    ativa = null;
    ctx.tirar?.();
  }
  // sair no meio: o que já fez ficou na carteira; sem bônus
  function terminar() {
    if (!ativa) return false;
    const M = ativa;
    ultimo = { id: M.T.id, ganhou: M.ganhou, completo: false, tarefas: M.i };
    seriePropaganda++;
    desmontar();
    tocar("saiu");
    falar("rp-trab-saiu");
    dizer("Rabiscolândia", `Turno encerrado! ${M.ganhou ? `Você ganhou ${M.ganhou} Rabiscoins com o que fez.` : "Volte quando quiser."}`, 4200);
    return true;
  }

  function atualizar(dt, t) {
    const p = ctx.pos(), R = ctx.raio?.() ?? 45, livre = !ctx.ocupado?.();
    for (const b of bases) { b.g.visible = livre && !ativa && Math.hypot(p.x - b.T.base[0], p.z - b.T.base[1]) < R; if (b.g.visible) { b.s.position.y = 2.4 + Math.sin(t * 3) * 0.15; b.sel.position.y = b.s.position.y + 0.55; } }
    animarGotas(dt);
    if (!ativa || !livre) return;
    aviso -= dt; ativa.t += dt;
    const e = ativa.est; if (!e) return;
    const tf = e.tf, v = ctx.veiculoAtual?.(), T = ativa.T;
    const vis = Math.hypot(p.x - tf.x, p.z - tf.z) < R + 10;
    for (const o of e.objs) o.visible = vis;
    if (e.fig) e.fig.position.y = (tf.tipo === "galpao" ? 3.4 : 3) + Math.sin(t * 3) * 0.2;
    if (e.feito) { animarFeito(e, dt, t, v); return; }
    e.t += dt;
    const dV = v ? Math.hypot(v.pos.x - tf.x, v.pos.z - tf.z) : Infinity, dP = Math.hypot(p.x - tf.x, p.z - tf.z);
    if (tf.tipo === "entrega" || tf.tipo === "coleta" || tf.tipo === "galpao") {
      const raioPara = tf.tipo === "galpao" ? 12 : 9;
      if (v && veiculoServe(T, v) && Math.abs(v.vel) < 2 && dV < raioPara) {
        e.veiculo = v;
        if (tf.tipo === "entrega") { e.voa = voando(placaVidro(), v, tf, 1.0); concluirTarefa(e.t <= e.prazo); }
        else if (tf.tipo === "coleta") { e.voa = voando(e.pilha, v, tf, 1.2, true); concluirTarefa(); }
        else { const carga = v.g.userData.carga; e.descarga = carga ? [...carga.children] : []; concluirTarefa(); }
        return;
      }
      if (!v && dP < 7 && aviso <= 0) { aviso = 7; falar("rp-trab-veiculo"); dizer("Rabiscolândia", "Para este trabalho, entre no veículo do trabalho: ele está esperando do seu lado.", 3200); }
    }
    if (tf.tipo === "foco") {
      const forca = Math.max(0.15, 1 - e.agua / 1.2);
      animarFumaca(e.foco, t, forca);
      if (!v && dP < 3.6) { e.perto += dt; if (e.perto > 3) e.jato = Math.max(e.jato, 0.1); } else e.perto = 0;
      if (v?.jatoLigado) { const fx = Math.sin(v.ang), fz = Math.cos(v.ang), ex = tf.x - v.pos.x, ez = tf.z - v.pos.z, d = Math.hypot(ex, ez); if (d < 12 && (ex * fx + ez * fz) / (d || 1) > 0.5) { e.agua += dt * 0.9; if (Math.random() < 0.7) soltarGota(_de.set(v.pos.x + fx * v.comp, 2.2, v.pos.z + fz * v.comp), _para.set(tf.x, 1.0, tf.z)); } }
      if (e.jato > 0) { e.jato -= dt; e.agua += dt; if (Math.random() < 0.7) soltarGota(_de.set(p.x, 1.3, p.z), _para.set(tf.x, 1.0, tf.z)); }
      if (e.agua >= 1.2) concluirTarefa();
    }
    if (tf.tipo === "gatinho") { const ud = e.arvore.userData; ud.gato.userData.rabo.rotation.z = Math.sin(t * 5) * 0.4; }
  }
  // depois de feita: o vidro voa até a obra, as garrafas voam para a caçamba, a carga desce no galpão, a fumaça some,
  // o gatinho desce pela escadinha
  function proxima(e) {
    if (e.voa) e.voa(99); // termina a animação de uma vez (a carga entra na caçamba)
    if (e.descarga) { for (const c of e.descarga) c.removeFromParent(); e.descarga = null; }
    ativa.i++;
    if (ativa.i >= ativa.tarefas.length) fimDoTurno(); else prepararTarefa();
  }
  function animarFeito(e, dt, t, v) {
    e.anim += dt;
    if (e.anim >= e.espera) { proxima(e); return; }
    const tf = e.tf;
    if (e.voa) e.voa(dt);
    if (tf.tipo === "galpao" && e.descarga) { for (const c of e.descarga) { c.position.y += dt * 2; c.scale.multiplyScalar(Math.max(0, 1 - dt * 1.6)); } if (e.anim > 1.2) { for (const c of e.descarga) c.removeFromParent(); e.descarga = null; } }
    if (tf.tipo === "foco") { animarFumaca(e.foco, t, Math.max(0.001, 0.15 * (1 - e.anim))); }
    if (tf.tipo === "gatinho") {
      const ud = e.arvore.userData, k = Math.min(1, e.anim / 1.4);
      ud.escada.visible = true;
      ud.gato.position.set(1.9 + k * 1.1, 3.72 * (1 - k) + 0.03, 0.7 + k * 0.6);
      ud.gato.userData.rabo.rotation.z = Math.sin(t * 9) * 0.5;
    }
  }
  const tmpV = new THREE.Vector3();
  // um objeto voa do veículo até o destino (ou do destino para a caçamba): devolve o passo da animação
  function voando(obj, v, tf, dur, paraCacamba = false) {
    let k = 0;
    const de = paraCacamba ? new THREE.Vector3(tf.x, 0.03, tf.z) : v.g.localToWorld(tmpV.set(0, 1.4, -v.comp * 0.6)).clone();
    const ate = paraCacamba ? null : new THREE.Vector3(tf.x, 0.4, tf.z);
    if (!paraCacamba) { obj.position.copy(de); grupo.add(obj); ativa.est.objs.push(obj); }
    return (dt) => {
      if (k >= 1) return;
      k = Math.min(1, k + dt / dur);
      if (paraCacamba) {
        const alvo = v.g.localToWorld(tmpV.set(0, 1.6, -v.comp * 0.36));
        obj.position.set(de.x + (alvo.x - de.x) * k, Math.sin(k * Math.PI) * 3 + (alvo.y - de.y) * k, de.z + (alvo.z - de.z) * k);
        obj.scale.setScalar(1 - k * 0.5);
        if (k >= 1) { obj.visible = false; const carga = v.g.userData.carga; if (carga) { for (let q = 0; q < 3; q++) { const n = carga.children.length, b = garrafa(CORES_PET[n % 3]); b.scale.setScalar(1.5); b.position.set(-0.8 + (n % 5) * 0.4, 0, -1.6 + Math.floor(n / 5) * 0.55); mesclar(b); carga.add(b); } } }
      } else obj.position.set(de.x + (ate.x - de.x) * k, de.y + (ate.y - de.y) * k + Math.sin(k * Math.PI) * 1.5, de.z + (ate.z - de.z) * k);
    };
  }
  function placaVidro() {
    const g = new THREE.Group();
    const v = caixaRedonda(1.0, 0.8, 0.04, mat(0x9fdcf5), { sombra: false }); v.position.y = 0.4; g.add(v);
    const a = caixaRedonda(1.1, 0.06, 0.06, mat(0xc9d2da), { sombra: false }); a.position.set(0, 0.84, 0); g.add(a);
    mesclar(g);
    return g;
  }

  function contexto() {
    if (ctx.veiculoAtual?.()) return null;
    const p = ctx.pos();
    if (!ativa) {
      for (const b of bases) if (Math.hypot(p.x - b.T.base[0], p.z - b.T.base[1]) < 2.6) return { rotulo: `💼 Trabalhar: ${b.T.curto}`, fazer: () => comecar(b.T.id) };
      return null;
    }
    const e = ativa.est; if (!e || e.feito) return null;
    const tf = e.tf;
    if (tf.tipo === "foco" && Math.hypot(p.x - tf.x, p.z - tf.z) < 3.6) return { rotulo: "💧 Mangueira", fazer: () => { e.jato = 1.4; tocar("agua", 480); } };
    if (tf.tipo === "gatinho" && Math.hypot(p.x - e.pe[0], p.z - e.pe[1]) < 3) return { rotulo: "🪜 Ajudar o gatinho", fazer: () => concluirTarefa() };
    return null;
  }
  function alvo() {
    if (!ativa?.est) return null;
    const tf = ativa.est.tf, v = ctx.veiculoAtual?.(), V = ativa.veiculo;
    // precisa do veículo e está a pé: a setinha mostra onde ele ficou
    if (ativa.T.veiculo && !v && V && Math.hypot(V.pos.x - ctx.pos().x, V.pos.z - ctx.pos().z) > 4) return { x: V.pos.x, z: V.pos.z, emoji: ativa.T.veiculo.tipo === "carro" ? "🚗" : "🚛" };
    if (tf.tipo === "gatinho") return { x: ativa.est.pe[0], z: ativa.est.pe[1], emoji: tf.emoji };
    return { x: tf.x, z: tf.z, emoji: tf.emoji };
  }
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function texto() {
    if (!ativa) return null;
    const e = ativa.est, n = ativa.tarefas.length, k = Math.min(n, ativa.i + 1), tf = e?.tf ?? ativa.tarefas.at(-1);
    const oque = { entrega: `Entregue ${tf.nome}`, coleta: "Recolha no ponto de coleta", galpao: "Leve tudo até o galpão", foco: "Apague a fumaça colorida", gatinho: "Ajude o gatinho a descer" }[tf.tipo];
    const tempo = tf.tipo === "entrega" && e && !e.feito ? (e.t <= e.prazo ? ` · ⏱️ ${mmss(e.prazo - e.t)}` : " · ⏱️ sem pressa") : "";
    return { icone: ativa.T.icone, titulo: ativa.T.titulo, passo: `Tarefa ${k} de ${n}: ${oque}${tempo} · 🪙 ${ativa.ganhou}` };
  }
  // Rabifone (app Trabalhar)
  function lista() {
    const S = salvoTrab();
    return { ativa: ativa ? { id: ativa.T.id, titulo: ativa.T.titulo, icone: ativa.T.icone, feitas: ativa.i, total: ativa.tarefas.length, ganhou: ativa.ganhou } : null,
      lista: TRABALHOS.map((T) => { const parc = PARCEIROS.find((q) => q.id === T.parceiro); return { id: T.id, titulo: T.titulo, icone: T.icone, resumo: T.resumo, turnos: S.turnos[T.id] ?? 0, insta: parc?.instagram ?? null, rende: T.tarefas.n ?? T.tarefas.focos + T.tarefas.gatinhos }; }),
      bonus: PAGA.bonus };
  }
  function caminhoBase(id) { const T = trabalho(id); return T ? { x: T.base[0], z: T.base[1], emoji: "💼" } : null; }

  return {
    TRABALHOS, comecar, terminar, atualizar, contexto, alvo, texto, lista, caminhoBase, grupo,
    get ativa() { return ativa?.T.id ?? null; },
    get ultimo() { return ultimo; },
    get propagandas() { return [...propagandas]; },
    // testes: estado do turno de agora
    info: () => ativa && { id: ativa.T.id, i: ativa.i, total: ativa.tarefas.length, ganhou: ativa.ganhou, tarefa: ativa.est ? { ...ativa.est.tf, feito: ativa.est.feito, prazo: ativa.est.prazo ?? null, agua: ativa.est.agua, pe: ativa.est.pe ?? null } : null,
      tarefas: ativa.tarefas.map((q) => ({ ...q })), veiculo: ativa.veiculo ? { tipo: ativa.veiculo.tipo, x: ativa.veiculo.pos.x, z: ativa.veiculo.pos.z } : null, rack: Boolean(ativa.rack?.parent), carga: ativa.veiculo?.g.userData.carga?.children.length ?? 0 },
    bases: () => bases.map((b) => ({ id: b.T.id, x: b.T.base[0], z: b.T.base[1], visivel: b.g.visible })),
  };
}
