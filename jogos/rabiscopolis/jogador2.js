// Rabiscolândia (Fatia 7): o jogador 2. Com 1 jogador só o Rabisco existe; quando o jogador 2 entra (controle, celular
// pelo QR ou teclado dividido: src/motor/jogadores.js), ele escolhe quem quer ser — a criança do cadastro
// (src/motor3d/companheiro3d.js, com o rosto/foto e o crachá) ou um amigo do estojo (personagens.js) — e passeia junto:
//   · a pé: anda relativo à câmera, pula e acena. Câmera compartilhada (couch co-op): mira o meio dos dois, afasta e sobe
//     sozinha até caber os dois (enquadrar); passando de RAIO_SUAVE m uma "coleira" macia segura, e em RAIO_J2 trava;
//   · a ação dele também faz missões (pegar, entregar, plantar, chamar quem pede);
//   · segurar a ação 1 s longe do Rabisco = "vir para perto" (aparece do lado dele);
//   · veículo: se o Rabisco entra com ele perto, vai de carona; longe, continua a pé (pode chegar perto do veículo parado
//     e entrar de carona com a ação). Na carona: pulo = buzina, tocar a ação = acenar, segurar a ação (parado) = descer. Se o veículo
//     vai longe demais, ele "vem junto" sozinho. Sem banco (bicicleta, patinete, trator) ele vem correndo atrás;
//   · na tela: crachá com cor e nome sobre a cabeça dos dois e uma seta na borda apontando quem saiu do quadro;
//   · casa e lugares por dentro: entra junto (aparece do lado do Rabisco).
//
//   const J2 = criarJogador2(ctx);  J2.quadro(dt) (uma vez por quadro: lê o controle)  J2.passo(dt)  J2.ativo  J2.pos

import { THREE, mesclar } from "./base3d.js";
import { criarMorador } from "./personagens.js";
import { criarCompanheiro3D } from "../../src/motor3d/companheiro3d.js";
import { criarPlacaNome } from "./placa-nome.js";

export const RAIO_J2 = 17;      // a coleira trava aqui (antes eram 11 m: agora os dois podem ficar mais longe)
export const RAIO_SUAVE = 13;   // daqui em diante a coleira puxa de volta, macio
const PERTO_CARONA = 7;         // o Rabisco entrou no veículo com o jogador 2 até aqui: vai de carona junto
const SEGURAR_VIR = 1;          // segundos segurando a ação para "vir para perto"
const SEGURAR_DESCER = 0.8;     // segundos segurando a ação (veículo parado) para descer da carona
// amigos do estojo que o jogador 2 pode ser (a criança do cadastro entra na frente quando existe)
export const AMIGOS_J2 = [
  { id: "lapis", tipo: "lapis", nome: "Lápis Rosa", cor: 0xec2e8c, emoji: "✏️" },
  { id: "giz", tipo: "giz", nome: "Giz Azul", cor: 0x00b5f0, emoji: "🖍️" },
  { id: "borracha", tipo: "borracha", nome: "Borrachinha", cor: 0xffffff, emoji: "🩷" },
  { id: "cola", tipo: "cola", nome: "Colinha", cor: 0xffffff, emoji: "🧴" },
  { id: "regua", tipo: "regua", nome: "Régua", cor: 0xffd34d, emoji: "📏" },
  { id: "caderno", tipo: "caderno", nome: "Caderninho", cor: 0x8e6cff, emoji: "📒" },
  { id: "clipe", tipo: "clipe", nome: "Clipe Verde", cor: 0x58c43a, emoji: "📎" },
  { id: "pincel", tipo: "pincel", nome: "Pincel", cor: 0xff7a00, emoji: "🖌️" },
];
const hex = (c) => `#${c.toString(16).padStart(6, "0")}`;

// etiqueta lilás do jogador 2 (o "quem é quem" na tela): a mesma do Rabisco (placa-nome.js), com o emoji do personagem;
// dentro de um veículo sobe um degrau acima da do jogador 1. O "🎮1" do Rabisco (só a 2) é a mesma etiqueta, ciano
const cracha = (nome, emoji, altura, veiculo) => criarPlacaNome({ nome, estilo: "j2", icone: emoji, altura, veiculo, toque: document.body.classList.contains("touch"), degrau: 1 });

export function criarJogador2(ctx) {
  const { cena, caixa, fis, J, j, sons, dizer } = ctx;
  const st = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), noChao: true, coyote: 0, buffer: 0, dir: 0 };
  let orando = null;
  let modelo = null, escolha = null, ui = null, foco = 0, opcoes = [], acena = 0, buzina = 0, assento = null, seguindo = false;
  let ent = { x: 0, y: 0, pulo: false, puloNovo: false, acao: false, acaoNova: false };
  let ctxAcao = null;
  let fora = false;       // o Rabisco está num veículo e o jogador 2 escolheu ficar a pé
  let segurando = 0;      // segundos segurando a ação (vir para perto)
  let zoom = 0;           // metros a mais da câmera compartilhada (cresce até caber os dois)
  let cracha1 = null, veic1 = null; // etiqueta ciano "🎮 Rabisco" do jogador 1 (só a 2; placa-nome.js), sobe no teto do veículo
  let setas = null;       // setas na borda da tela (quem saiu do quadro)

  // ---------- escolha do personagem (o jogador 2 escolhe com o controle/teclado dele, ou tocando)
  function listaOpcoes() {
    const c = ctx.crianca();
    return [...(c?.nome ? [{ id: "crianca", nome: c.nome, emoji: "🧒", cor: 0x58c43a, crianca: true }] : []), ...AMIGOS_J2];
  }
  function abrirEscolha() {
    opcoes = listaOpcoes();
    const ult = opcoes.findIndex((o) => o.id === ctx.salvo().j2);
    foco = ult >= 0 ? ult : 0;
    ui?.remove();
    ui = document.createElement("div");
    ui.className = "escolha-j2-rp";
    ui.innerHTML = `<div class="ej2-cartao"><div class="ej2-titulo">🎮2 Jogador 2: quem você quer ser?</div><div class="ej2-grade"></div><div class="ej2-dica">◀ ▶ escolhe · ${J.tecladoDividido ? "F ou Espaço" : "A ou X"} confirma</div></div>`;
    ui.addEventListener("pointerdown", (e) => e.stopPropagation());
    const grade = ui.querySelector(".ej2-grade");
    opcoes.forEach((o, i) => {
      const b = document.createElement("button");
      b.className = "ej2-op"; b.dataset.p = o.id;
      b.innerHTML = `<span class="ej2-bola" style="background:${hex(o.cor)}">${o.emoji}</span><span>${o.nome}</span>`;
      b.addEventListener("click", (e) => { e.stopPropagation(); foco = i; confirmar(); });
      grade.append(b);
    });
    caixa.append(ui);
    desenharFoco();
  }
  function desenharFoco() { ui?.querySelectorAll(".ej2-op").forEach((b, i) => b.classList.toggle("foco", i === foco)); }
  function confirmar() {
    const o = opcoes[foco];
    if (!o) return;
    ui?.remove(); ui = null;
    escolher(o.id);
  }
  function escolher(id) {
    remover();
    const o = listaOpcoes().find((x) => x.id === id) ?? AMIGOS_J2[0];
    escolha = o.id;
    const s = ctx.salvo(); s.j2 = o.id; ctx.salvar(s);
    if (o.crianca) {
      const c = criarCompanheiro3D({ raiz: ctx.raiz, altura: 1.55 });
      ctx.otimizar?.(c.rabisco);
      c.grupo.add(cracha(o.nome, o.emoji, 1.72, () => assento).sprite);
      modelo = { tipo: "crianca", grupo: c.grupo, c, nome: o.nome, escala: c.escala, altura: 1.55,
        atualizar: (dt, { modo, vel }) => { c.atualizar(dt, { modo, vel, vmax: 6.5 }); },
        acenar: () => {}, pular: () => {} };
    } else {
      const m = criarMorador(o.tipo, { cor: o.cor, nome: o.nome, semente: 7, escala: 0.86 });
      m.grupo.add(cracha(o.nome, o.emoji, (m.altura / 0.86) + 0.3, () => assento).sprite);
      modelo = { tipo: "estojo", grupo: m.grupo, m, nome: o.nome, altura: m.altura,
        atualizar: (dt, { vel }) => m.atualizar(dt, { vel }), acenar: (s) => m.acenar(s), pular: () => m.pular() };
    }
    cena.add(modelo.grupo);
    if (!cracha1) cracha1 = criarPlacaNome({ nome: ctx.nome1?.() || "Rabisco", estilo: "j1", icone: "🎮", altura: 0, veiculo: () => veic1, toque: document.body.classList.contains("touch") });
    cena.add(cracha1.sprite);
    // a legenda "quem é quem" embaixo passa a mostrar o personagem escolhido
    if (J.j2) { J.j2.nome = o.nome; J.legenda?.(); }
    caixa.classList.add("dois-rp");
    // aparece do lado do Rabisco (ou no banco do carona, se ele estiver dirigindo)
    const v = ctx.veiculo();
    colocarPerto();
    if (v) entrar(v, true);
    sons.vitoria?.();
    dizer("Jogador 2", `${o.nome} chegou para passear junto! 🎮2`, 2600);
  }
  function remover() {
    if (!modelo) return;
    modelo.grupo.removeFromParent();
    cracha1?.sprite.removeFromParent();
    if (setas) for (const e of setas) e.hidden = true;
    caixa.classList.remove("dois-rp");
    modelo = null; assento = null; seguindo = false; fora = false; zoom = 0;
  }
  // ao lado do Rabisco, num ponto livre que ele ALCANÇA andando em linha reta: ao entrar numa sala o Rabisco nasce de
  // costas para a porta, e "atrás e ao lado" caía no vão da porta, do lado de fora da parede (o jogador 2 ficava preso)
  function colocarPerto() {
    const a = j.dir, sa = Math.sin(a), ca = Math.cos(a);
    const alcanca = (x, z) => { const d = Math.hypot(x - j.pos.x, z - j.pos.z), n = Math.ceil(d / 0.2); for (let k = 0; k <= n; k++) { const f = k / n; if (fis.bate(j.pos.x + (x - j.pos.x) * f, j.pos.z + (z - j.pos.z) * f, 0.1)) return false; } return true; };
    const opcoes = [[-1.2, 1.4], [-1.2, -1.4], [0, 1.4], [0, -1.4], [0.9, 1.4], [0.9, -1.4]].map(([tras, lado]) => [j.pos.x + sa * tras + ca * lado, j.pos.z + ca * tras - sa * lado]);
    const boa = opcoes.find(([x, z]) => !fis.bate(x, z, 0.1, 0.5) && alcanca(x, z));
    const [lx, lz] = boa ?? fis.livre(j.pos.x - sa * 1.2 + ca * 1.4, j.pos.z - ca * 1.2 - sa * 1.4, 0.5);
    st.pos.set(lx, j.pos.y, lz); st.vel.set(0, 0, 0); st.dir = j.dir; st.noChao = true;
    if (modelo) { cena.add(modelo.grupo); modelo.grupo.position.copy(st.pos); modelo.grupo.rotation.set(0, st.dir, 0); }
  }

  // ---------- veículo: banco do carona (ou correndo atrás)
  // o Rabisco acabou de entrar: só vai junto se estiver perto. forcar = entra de qualquer jeito (ação, "vem junto")
  function entrar(v, forcar = false) {
    if (!modelo) return;
    if (!forcar && Math.hypot(st.pos.x - v.pos.x, st.pos.z - v.pos.z) > PERTO_CARONA) { fora = true; return; }
    fora = false;
    const a = v.g.userData.carona;
    if (!a) { seguindo = true; assento = null; return; }
    assento = v; seguindo = false;
    v.g.add(modelo.grupo);
    sentar(v);
  }
  function sentar(v) {
    const a = v.g.userData.carona;
    // o amigo da missão "Os amigos que ajudam" vai no banco da frente: o jogador 2 passa para o banco de trás
    const tras = ctx.caronaDaMissao?.() ? -1.05 : 0;
    if (modelo.tipo === "crianca") modelo.grupo.position.set(a.x, a.y - 2.0 * modelo.escala + (tras ? 0.12 : 0), a.z + tras);
    else modelo.grupo.position.set(a.x, a.y - 0.3 + (tras ? 0.12 : 0), a.z + 0.05 + tras);
    modelo.grupo.rotation.set(0, 0, 0);
  }
  function sair(v, x, z) {
    if (!modelo) return;
    fora = false;
    if (!assento && !seguindo) return; // estava a pé por conta própria: fica onde está
    seguindo = false;
    if (assento) { assento = null; cena.add(modelo.grupo); }
    const [lx, lz] = fis.livre(x, z, 0.5);
    st.pos.set(lx, 0.07, lz); st.vel.set(0, 0, 0); st.dir = v?.ang ?? j.dir; st.noChao = true;
    modelo.grupo.position.copy(st.pos); modelo.grupo.rotation.set(0, st.dir, 0);
  }

  // ---------- uma vez por quadro: o controle do jogador 2 (as bordas "apertou" valem uma vez)
  function quadro() {
    const quer = J.ativo && J.j2Pronto;
    if (!quer) { if (modelo || ui) { remover(); ui?.remove(); ui = null; escolha = null; } return; }
    ent = J.ler2();
    if (!modelo && !ui) abrirEscolha();
    if (ui) {
      quadro.mx = quadro.mx ?? 0;
      const dx = Math.abs(ent.x) > 0.5 ? Math.sign(ent.x) : 0;
      if (dx && dx !== quadro.mx) { foco = (foco + dx + opcoes.length) % opcoes.length; desenharFoco(); sons.bipe?.(false); }
      quadro.mx = dx;
      if (ent.acaoNova || ent.puloNovo) confirmar();
      ent = { x: 0, y: 0, pulo: false, puloNovo: false, acao: false, acaoNova: false };
    }
  }

  // ---------- passo da física (pode rodar mais de uma vez por quadro)
  function passo(dt, t) {
    if (!modelo) return;
    if (orando) { // Pai Nosso: ajoelhadinho do lado do Rabisco, de mãos juntas
      st.pos.set(orando.x, 0.07, orando.z); st.vel.set(0, 0, 0); st.dir = orando.dir;
      modelo.grupo.position.copy(st.pos); modelo.grupo.rotation.set(0, st.dir, 0);
      modelo.atualizar(dt, { modo: "parado", vel: 0 });
      modelo.m?.orar(true);
      ent.puloNovo = ent.acaoNova = false;
      return;
    }
    const v = ctx.veiculo();
    acena -= dt; buzina -= dt;
    if (assento) {
      if (assento !== v) { sair(assento, j.pos.x + 1.5, j.pos.z + 1.5); return; }
      sentar(v);
      if (ent.puloNovo && buzina <= 0) { sons.buzina(); buzina = 0.8; J.vibrar2?.(40); }
      // tocar a ação = acenar; SEGURAR a ação com o veículo parado = descer (fica a pé, independente). Segurar, para
      // ninguém descer sem querer num sinal vermelho.
      segurando = ent.acao && paradoV(v) ? segurando + dt : 0;
      if (segurando >= SEGURAR_DESCER) { segurando = 0; ent.puloNovo = ent.acaoNova = false; descer(v); return; }
      if (ent.acaoNova) { acena = 1.6; modelo.acenar(2); }
      ent.puloNovo = ent.acaoNova = false;
      if (modelo.tipo === "crianca") {
        modelo.atualizar(dt, { modo: "dirigir", vel: 0 });
        if (acena > 0) { const rb = modelo.c.rabisco; rb.bracoE.ombro.rotation.set(-0.25, 0, 2.55); rb.bracoE.cotovelo.rotation.x = -0.35 + Math.sin(t * 7) * 0.45; }
      } else modelo.atualizar(dt, { vel: 0 });
      return;
    }
    if (!v) { seguindo = false; fora = false; }
    else if (!seguindo && !fora) entrar(v, true); // (ex.: escolheu o personagem com o Rabisco já dirigindo)
    let ix = ent.x, iy = ent.y, puloNovo = ent.puloNovo, segura = ent.pulo;
    // sem banco (bicicleta, patinete, trator): corre atrás do Rabisco sozinho
    if (seguindo) {
      const ax = j.pos.x - Math.sin(v.ang) * (v.comp + 1.6), az = j.pos.z - Math.cos(v.ang) * (v.comp + 1.6);
      const dx = ax - st.pos.x, dz = az - st.pos.z, d = Math.hypot(dx, dz);
      const vel = d > 0.5 ? Math.min(d * 3, Math.max(6.5, Math.abs(v.vel) + 2)) : 0;
      st.vel.set(d > 0.01 ? (dx / d) * vel : 0, st.vel.y, d > 0.01 ? (dz / d) * vel : 0);
      const nx = st.pos.x + st.vel.x * dt, nz = st.pos.z + st.vel.z * dt;
      if (!fis.bate(nx, st.pos.z, st.pos.y)) st.pos.x = nx;
      if (!fis.bate(st.pos.x, nz, st.pos.y)) st.pos.z = nz;
      if (vel > 0.4) st.dir = Math.atan2(dx, dz);
      ix = iy = 0; puloNovo = false;
      if (ent.puloNovo && buzina <= 0) { sons.buzina(); buzina = 0.8; }
    } else {
      const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
      if (ctx.travado?.()) ix = iy = 0;
      const { pulou } = fis.andar(st, { ix, iy, pular: puloNovo, segura }, ctx.yaw(), dt);
      if (pulou) { sons.pulo(); J.vibrar2?.(20); }
      // a câmera é dos dois: coleira macia a partir de RAIO_SUAVE (puxa de volta) e firme em RAIO_J2
      const dx = st.pos.x - j.pos.x, dz = st.pos.z - j.pos.z, d = Math.hypot(dx, dz);
      if (!v && d > RAIO_SUAVE && d < RAIO_J2 + 5) { // (com o Rabisco dirigindo não arrasta: passou de RAIO_J2, vem junto)
        const alvoD = Math.min(RAIO_J2, RAIO_SUAVE + (d - RAIO_SUAVE) * Math.exp(-dt * 3));
        const nx = j.pos.x + (dx / d) * alvoD, nz = j.pos.z + (dz / d) * alvoD;
        if (!fis.bate(nx, nz, st.pos.y)) { st.pos.x = nx; st.pos.z = nz; }
      }
      // a ação: missão perto dele; entrar de carona; senão, acena
      if (ent.acaoNova) {
        if (ctxAcao) ctxAcao.fazer(); else { acena = 1.4; modelo.acenar(2); }
      }
      // segurar a ação longe do Rabisco = "vir para perto"
      segurando = ent.acao && d > 5 && !(v && !paradoV(v)) ? segurando + dt : 0;
      if (segurando >= SEGURAR_VIR) { segurando = 0; virParaPerto(); }
    }
    // longe demais (o Rabisco entrou numa casa, num lugar, foi chamado pelo Rabifone ou o veículo foi embora): vem junto
    if (!assento && Math.hypot(st.pos.x - j.pos.x, st.pos.z - j.pos.z) > RAIO_J2 + (v && !seguindo ? 0 : 5)) { if (v && !seguindo) entrar(v, true); else colocarPerto(); }
    ent.puloNovo = ent.acaoNova = false;
    modelo.grupo.position.copy(st.pos);
    modelo.grupo.rotation.set(0, st.dir, 0);
    const vel = Math.hypot(st.vel.x, st.vel.z);
    const modo = !st.noChao ? "pular" : vel > 0.6 ? "andar" : acena > 0 ? "acenar" : "parado";
    modelo.atualizar(dt, { modo, vel });
  }
  // o que a ação do jogador 2 faria agora (missões); o rótulo aparece no balãozinho rosa
  function regras(contextoDe) {
    const v = ctx.veiculo();
    ctxAcao = null;
    if (!modelo || orando) return null;
    if (assento) {
      if (paradoV(assento)) ctxAcao = { rotulo: "Segure para descer ⬇️", fazer: () => {} };
      return ctxAcao;
    }
    if (seguindo) return null;
    ctxAcao = contextoDe(st.pos);
    // o Rabisco está num veículo parado e o jogador 2 chegou perto: entra de carona (ou vai junto correndo)
    if (!ctxAcao && v && fora && paradoV(v) && Math.hypot(st.pos.x - v.pos.x, st.pos.z - v.pos.z) < (v.comp ?? 2) + 2.6) {
      const banco = Boolean(v.g.userData.carona);
      ctxAcao = { rotulo: banco ? "🚗 Entrar de carona" : "🏃 Ir junto", fazer: () => { entrar(v, true); dizer("Jogador 2", banco ? `${modelo.nome} entrou de carona! 🚗` : `${modelo.nome} vai junto! 🏃`, 1800); } };
    }
    return ctxAcao;
  }
  function paradoV(v) { return Math.abs(v?.vel ?? 0) < 1.2 && (v?.tipo !== "heli" || (v.alt ?? 0) < 0.6); }
  function descer(v) {
    const lado = (v.larg ?? 1.2) + 1.1;
    sair(v, v.pos.x - Math.cos(v.ang) * lado, v.pos.z + Math.sin(v.ang) * lado);
    fora = true;
    dizer("Jogador 2", `${modelo.nome} desceu para passear a pé 👟`, 1800);
  }
  function virParaPerto() {
    const v = ctx.veiculo();
    if (v) entrar(v, true); else colocarPerto(); // o Rabisco num veículo parado: vem de carona (nunca dentro do carro)
    sons.vitoria?.();
    J.vibrar2?.(60);
    dizer("Jogador 2", `${modelo.nome} veio para perto! ✨`, 1600);
  }
  // câmera compartilhada: centro e afastamento para caber os dois. O afastamento cresce até os dois caberem com folga no
  // quadro (medido na câmera do quadro anterior) e volta devagar quando eles se aproximam. Nunca menos que pela distância.
  const _p = new THREE.Vector3();
  function enquadrar(dt = 1 / 30) {
    if (!modelo || assento || seguindo) { zoom = Math.max(0, zoom - dt * 6); return null; }
    const d = Math.hypot(st.pos.x - j.pos.x, st.pos.z - j.pos.z);
    const minimo = Math.max(0, d - 2.5) * 0.55;
    const cam = ctx.cam?.();
    let m = 0;
    if (cam && dt > 0) for (const [x, y, z] of [[j.pos.x, j.pos.y, j.pos.z], [st.pos.x, st.pos.y, st.pos.z]]) {
      for (const h of [0.2, 1.9]) { _p.set(x, y + h, z).project(cam); m = Math.max(m, _p.z > 1 ? 2 : Math.max(Math.abs(_p.x), Math.abs(_p.y))); }
    }
    if (m > 0.8) zoom += dt * (3 + (Math.min(m, 2) - 0.8) * 14);
    else if (m < 0.55) zoom -= dt * 1.6;
    zoom = Math.min(14, Math.max(minimo, zoom));
    return { x: (st.pos.x + j.pos.x) / 2, y: (st.pos.y + j.pos.y) / 2, z: (st.pos.z + j.pos.z) / 2, afastar: zoom, d };
  }
  // crachás sobre a cabeça e setas na borda (uma vez por quadro, depois da câmera)
  const _q = new THREE.Vector3();
  function hud(cam, { alturaRabisco = 1.6, veiculo = null } = {}) {
    if (!modelo) return;
    if (cracha1) {
      veic1 = veiculo; cracha1.definir(ctx.nome1?.() || "Rabisco");
      const b = veiculo ? veiculo.g.position : null; // no veículo a etiqueta vai para cima do teto (placa-nome.js)
      if (b) cracha1.sprite.position.set(b.x, b.y, b.z); else cracha1.sprite.position.set(j.pos.x, j.pos.y + alturaRabisco + 0.37, j.pos.z);
    }
    if (!setas) setas = [1, 2].map((n) => { const e = document.createElement("div"); e.className = `seta-outro-rp j${n}`; e.hidden = true; caixa.append(e); return e; });
    const quem = [
      { e: setas[0], p: veiculo ? veiculo.pos : j.pos, nome: ctx.nome1?.() || "Rabisco", n: 1, some: false },
      { e: setas[1], p: st.pos, nome: modelo.nome, n: 2, some: Boolean(assento) },
    ];
    const W = caixa.clientWidth || innerWidth, H = caixa.clientHeight || innerHeight;
    for (const q of quem) {
      if (q.some) { q.e.hidden = true; continue; }
      _q.set(q.p.x, q.p.y + 1.2, q.p.z).project(cam);
      const atras = _q.z > 1;
      let x = atras ? -_q.x : _q.x, y = atras ? -_q.y : _q.y;
      if (!atras && Math.abs(x) < 0.94 && Math.abs(y) < 0.94) { q.e.hidden = true; continue; }
      const k = 0.86 / Math.max(Math.abs(x), Math.abs(y), 1e-3);
      x *= k; y *= k;
      const ang = (Math.atan2(-y, x) * 180) / Math.PI;
      const html = `<span class="ponta" style="transform:rotate(${ang.toFixed(0)}deg)">➤</span><span class="nome">${q.n} · ${q.nome}</span>`;
      if (q.e.dataset.h !== html) { q.e.innerHTML = html; q.e.dataset.h = html; }
      q.e.style.left = `${(((x + 1) / 2) * W).toFixed(0)}px`;
      q.e.style.top = `${(((1 - y) / 2) * H).toFixed(0)}px`;
      q.e.hidden = false;
    }
  }

  return {
    quadro, passo, regras, enquadrar, hud, entrar, sair, escolher, colocarPerto, virParaPerto, descer,
    orar(o) { if (!o) { orando = null; modelo?.m?.orar(false); return; } if (!modelo || assento) return; orando = o; },
    get ativo() { return Boolean(modelo); }, get escolhendo() { return Boolean(ui); }, get escolha() { return escolha; },
    get pos() { return modelo ? st.pos : null; }, get st() { return st; }, get modelo() { return modelo; },
    get sentado() { return Boolean(assento); }, get seguindo() { return seguindo; }, get acena() { return acena; }, get buzina() { return buzina; },
    get aPe() { return Boolean(modelo) && !assento && !seguindo; },
    get fora() { return fora; }, get zoom() { return zoom; }, get segurando() { return segurando; },
    get setas() { return setas ? setas.map((e) => !e.hidden) : [false, false]; },
    get cracha1() { return cracha1 ? { visivel: cracha1.sprite.visible && Boolean(cracha1.sprite.parent), ...cracha1.estado } : null; },
    // dica no balãozinho: longe do Rabisco → "segure para vir para perto"
    get longe() { return Boolean(modelo) && !assento && !seguindo && Math.hypot(st.pos.x - j.pos.x, st.pos.z - j.pos.z) > RAIO_SUAVE - 2; },
    get acao() { return ctxAcao?.rotulo ?? null; },
    opcoes: () => listaOpcoes().map((o) => o.id),
    navegar(dx) { if (ui) { foco = (foco + dx + opcoes.length) % opcoes.length; desenharFoco(); } },
    confirmar,
  };
}
