// Rabiscolândia (Fatia 7): o jogador 2. Com 1 jogador só o Rabisco existe; quando o jogador 2 entra (controle, celular
// pelo QR ou teclado dividido: src/motor/jogadores.js), ele escolhe quem quer ser — a criança do cadastro
// (src/motor3d/companheiro3d.js, com o rosto/foto e o crachá) ou um amigo do estojo (personagens.js) — e passeia junto:
//   · a pé: anda relativo à câmera, pula e acena; fica a no máximo RAIO m do Rabisco (a câmera enquadra os dois);
//   · a ação dele também faz missões (pegar, entregar, plantar, chamar quem pede);
//   · no veículo do Rabisco vai de passageiro (pulo = buzina, ação = acenar); sem banco (bicicleta, patinete, trator)
//     ele vem correndo atrás;
//   · casa e lugares por dentro: entra junto (aparece do lado do Rabisco).
//
//   const J2 = criarJogador2(ctx);  J2.quadro(dt) (uma vez por quadro: lê o controle)  J2.passo(dt)  J2.ativo  J2.pos

import { THREE, texturaCanvas, mesclar } from "./base3d.js";
import { criarMorador } from "./personagens.js";
import { criarCompanheiro3D } from "../../src/motor3d/companheiro3d.js";

export const RAIO_J2 = 11;
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

// crachá rosa do jogador 2 (o "quem é quem" na tela)
function cracha(nome) {
  const tex = texturaCanvas(512, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.font = "800 56px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    const t = `🎮2 ${nome}`, lw = Math.min(w - 8, c.measureText(t).width + 56);
    c.fillStyle = "#ec2e8c"; c.strokeStyle = "#151515"; c.lineWidth = 8;
    c.beginPath(); c.roundRect((w - lw) / 2, 14, lw, h - 28, 46); c.fill(); c.stroke();
    c.fillStyle = "#ffffff"; c.fillText(t, w / 2, h / 2 + 3);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(3, 0.75, 1); s.renderOrder = 7;
  return s;
}

export function criarJogador2(ctx) {
  const { cena, caixa, fis, J, j, sons, dizer } = ctx;
  const st = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), noChao: true, coyote: 0, buffer: 0, dir: 0 };
  let orando = null;
  let modelo = null, escolha = null, ui = null, foco = 0, opcoes = [], acena = 0, buzina = 0, assento = null, seguindo = false;
  let ent = { x: 0, y: 0, pulo: false, puloNovo: false, acao: false, acaoNova: false };
  let ctxAcao = null;

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
      const c = criarCompanheiro3D({ raiz: ctx.raiz, altura: 1.55, cracha: true });
      ctx.otimizar?.(c.rabisco);
      modelo = { tipo: "crianca", grupo: c.grupo, c, nome: o.nome, escala: c.escala, altura: 1.55,
        atualizar: (dt, { modo, vel }) => { c.atualizar(dt, { modo, vel, vmax: 6.5 }); },
        acenar: () => {}, pular: () => {} };
    } else {
      const m = criarMorador(o.tipo, { cor: o.cor, nome: o.nome, semente: 7, escala: 0.86 });
      const placa = cracha(o.nome); placa.position.y = (m.altura / 0.86) + 0.85; m.grupo.add(placa);
      modelo = { tipo: "estojo", grupo: m.grupo, m, nome: o.nome, altura: m.altura,
        atualizar: (dt, { vel }) => m.atualizar(dt, { vel }), acenar: (s) => m.acenar(s), pular: () => m.pular() };
    }
    cena.add(modelo.grupo);
    // a legenda "quem é quem" embaixo passa a mostrar o personagem escolhido
    if (J.j2) { J.j2.nome = o.nome; J.legenda?.(); }
    caixa.classList.add("dois-rp");
    // aparece do lado do Rabisco (ou no banco do carona, se ele estiver dirigindo)
    const v = ctx.veiculo();
    if (v) entrar(v);
    else colocarPerto();
    sons.vitoria?.();
    dizer("Jogador 2", `${o.nome} chegou para passear junto! 🎮2`, 2600);
  }
  function remover() {
    if (!modelo) return;
    modelo.grupo.removeFromParent();
    caixa.classList.remove("dois-rp");
    modelo = null; assento = null; seguindo = false;
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
  function entrar(v) {
    if (!modelo) return;
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
      if (ent.acaoNova) { acena = 1.6; modelo.acenar(2); }
      ent.puloNovo = ent.acaoNova = false;
      if (modelo.tipo === "crianca") {
        modelo.atualizar(dt, { modo: "dirigir", vel: 0 });
        if (acena > 0) { const rb = modelo.c.rabisco; rb.bracoE.ombro.rotation.set(-0.25, 0, 2.55); rb.bracoE.cotovelo.rotation.x = -0.35 + Math.sin(t * 7) * 0.45; }
      } else modelo.atualizar(dt, { vel: 0 });
      return;
    }
    if (v && !seguindo) entrar(v);
    if (!v && seguindo) seguindo = false;
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
      // a câmera é dos dois: o jogador 2 fica a no máximo RAIO_J2 do Rabisco
      const dx = st.pos.x - j.pos.x, dz = st.pos.z - j.pos.z, d = Math.hypot(dx, dz);
      if (d > RAIO_J2 && d < RAIO_J2 + 5) { const nx = j.pos.x + (dx / d) * RAIO_J2, nz = j.pos.z + (dz / d) * RAIO_J2; if (!fis.bate(nx, nz, st.pos.y)) { st.pos.x = nx; st.pos.z = nz; } }
      // a ação: missão perto dele; senão, acena
      if (ent.acaoNova) {
        if (ctxAcao) ctxAcao.fazer(); else { acena = 1.4; modelo.acenar(2); }
      }
    }
    // longe demais (o Rabisco entrou numa casa, num lugar ou foi chamado pelo Rabifone): aparece do lado dele
    if (Math.hypot(st.pos.x - j.pos.x, st.pos.z - j.pos.z) > RAIO_J2 + 5) colocarPerto();
    ent.puloNovo = ent.acaoNova = false;
    modelo.grupo.position.copy(st.pos);
    modelo.grupo.rotation.set(0, st.dir, 0);
    const vel = Math.hypot(st.vel.x, st.vel.z);
    const modo = !st.noChao ? "pular" : vel > 0.6 ? "andar" : acena > 0 ? "acenar" : "parado";
    modelo.atualizar(dt, { modo, vel });
  }
  // o que a ação do jogador 2 faria agora (missões); o rótulo aparece no balãozinho rosa
  function regras(contextoDe) {
    ctxAcao = modelo && !assento && !seguindo ? contextoDe(st.pos) : null;
    return ctxAcao;
  }
  // centro e afastamento da câmera para caber os dois
  function enquadrar() {
    if (!modelo || assento) return null;
    const d = Math.hypot(st.pos.x - j.pos.x, st.pos.z - j.pos.z);
    return { x: (st.pos.x + j.pos.x) / 2, y: (st.pos.y + j.pos.y) / 2, z: (st.pos.z + j.pos.z) / 2, afastar: Math.max(0, d - 2.5) * 0.75 };
  }

  return {
    quadro, passo, regras, enquadrar, entrar, sair, escolher, colocarPerto,
    orar(o) { if (!o) { orando = null; modelo?.m?.orar(false); return; } if (!modelo || assento) return; orando = o; },
    get ativo() { return Boolean(modelo); }, get escolhendo() { return Boolean(ui); }, get escolha() { return escolha; },
    get pos() { return modelo ? st.pos : null; }, get st() { return st; }, get modelo() { return modelo; },
    get sentado() { return Boolean(assento); }, get seguindo() { return seguindo; }, get acena() { return acena; }, get buzina() { return buzina; },
    get aPe() { return Boolean(modelo) && !assento && !seguindo; },
    get acao() { return ctxAcao?.rotulo ?? null; },
    opcoes: () => listaOpcoes().map((o) => o.id),
    navegar(dx) { if (ui) { foco = (foco + dx + opcoes.length) % opcoes.length; desenharFoco(); } },
    confirmar,
  };
}
