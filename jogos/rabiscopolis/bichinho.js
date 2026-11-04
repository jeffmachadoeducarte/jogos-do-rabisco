// Rabiscolândia: o bichinho que acompanha o Rabisco (modelos em bichinho-modelo.js; escolhido no Pet Shop do Ateliê).
// Comportamento:
//  · anda atrás do Rabisco, um pouquinho de lado (fora do caminho); anda ou corre conforme o Rabisco, nunca atravessa
//    prédio nem entra na água (usa as mesmas colisões do Rabisco: fis.bate) e, se ficar longe ou preso, reaparece perto dele;
//  · Rabisco parado: depois de uns segundos ele senta, olha para o Rabisco, abana o rabinho e, de vez em quando, faz carinho
//    (aproxima, pula de alegria e solta um coração);
//  · Rabisco pula: ele pula junto; de vez em quando dá um pulinho sozinho;
//  · toque nele ou a ação perto dele faz um truque (giro, cambalhota ou festinha) com um som 8-bit;
//  · veículo: vai sentado no banco do carona (moto: na garupa); onde não tem lugar (bicicleta, patinete) some e reaparece
//    pulando quando o Rabisco desce;
//  · plaquinha com o nome, menor que a do Rabisco (uma única chamada de desenho a mais; o bichinho todo custa 2 no máximo).
//
//   const b = criarBichinho(cena, { j, fis, sons, salvo: () => salvo });
//   b.definir(id|null, nome); b.atualizar(dt, t, { dentro, emCasa, emLugar, roda, j2ativo, noChao }); b.truque(); b.perto(raio)

import { THREE } from "./base3d.js";
import { criarModeloBichinho, bichinhoPorId } from "./bichinho-modelo.js";

const ESCALA = 1.0;
const angDif = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const TRUQUES = ["giro", "flip", "festa"];

export function criarBichinho(cena, { j, fis, sons, cam }) {
  const raiz = new THREE.Group();
  raiz.visible = false;
  cena.add(raiz);
  let mod = null, id = null, nome = "";
  // estado do bichinho
  const e = { x: 0, z: 0, y: 0, yaw: 0, vel: 0, fase: 0, sentado: 0, yoff: 0, vy: 0, olhar: 0, abanar: 0.3, coracao: 0, flip: 0, giro: 0, recolher: 0 };
  let quieto = 0, rv = 0, anterior = null, seguindo = false, preso = 0, tCarinho = 20, carinho = null, truque = null, nTruque = 0;
  let tPulo = 7, noChaoAntes = true, naCarona = null, escondido = false, ultimoModo = "rua", t0 = 0;
  const lado = 1;

  // a plaquinha do nome é um quadrilátero dentro da malha do bichinho (bichinho-modelo.js): não custa chamada de desenho
  const plaqueta = () => { mod?.definirNome(nome); };
  const olharPlaca = (y) => mod?.plaqueta(cam, y);
  function definir(novo, nomeNovo = "") {
    if (novo && !bichinhoPorId(novo)) novo = null;
    const mudou = novo !== id;
    nome = (nomeNovo || "").trim();
    if (mudou) {
      if (mod) { mod.liberar(); mod = null; }
      id = novo;
      if (id) { mod = criarModeloBichinho(id); mod.grupo.scale.setScalar(ESCALA); raiz.add(mod.grupo); reaparecer(true); }
      else raiz.visible = false;
    }
    plaqueta();
  }
  // põe o bichinho ao lado do Rabisco (num ponto livre)
  function reaparecer(pular = false) {
    if (!mod) return;
    const fx = Math.sin(j.dir), fz = Math.cos(j.dir);
    const [lx, lz] = fis.livre(j.pos.x - fx * 1.0 + fz * 0.8 * lado, j.pos.z - fz * 1.0 - fx * 0.8 * lado, 0.4);
    e.x = lx; e.z = lz; e.y = Math.max(0.03, fis.chaoEm(lx, lz, j.pos.y)); e.yaw = j.dir; e.vel = 0; e.sentado = 0; e.yoff = 0; e.vy = pular ? 3.4 : 0; preso = 0; seguindo = false;
    anterior = null;
  }
  function pular(v = 3.4) { if (e.yoff <= 0.001) e.vy = v; }

  function truqueAgora() {
    if (!mod || truque || naCarona) return false;
    const tipo = id === "tartaruga" && TRUQUES[nTruque % 3] === "flip" ? "festa" : TRUQUES[nTruque++ % 3];
    truque = { tipo, t: 0, dur: tipo === "festa" ? 1.5 : 1.15 };
    carinho = null; e.sentado = 0;
    sons.bichinho?.(bichinhoPorId(id)?.som);
    return true;
  }

  function atualizar(dt, t, ctx = {}) {
    if (!mod) { raiz.visible = false; return; }
    t0 = t;
    // sumir de vez: roda-gigante e quando o jogo pede
    const sumir = Boolean(ctx.roda);
    if (sumir !== escondido) { escondido = sumir; if (!sumir) reaparecer(true); }
    raiz.visible = !escondido && !(naCarona === "oculto");
    if (escondido) return;
    // velocidade do Rabisco (pelo deslocamento: vale a pé e de veículo)
    if (anterior) { const v = Math.hypot(j.pos.x - anterior[0], j.pos.z - anterior[1]) / Math.max(dt, 1e-3); rv += (Math.min(v, 30) - rv) * Math.min(1, dt * 8); } else rv = 0;
    anterior = [j.pos.x, j.pos.z];
    if (ctx.dentro) return carona(dt, ctx);
    if (naCarona) descer();
    // mudou de lugar (entrou/saiu de casa ou de loja): vem junto
    const modo = ctx.emCasa ? "casa" : ctx.emLugar ? "lugar" : "rua";
    if (modo !== ultimoModo) { ultimoModo = modo; reaparecer(); }
    mod.grupo.rotation.set(0, 0, 0);
    comportamento(dt, t, ctx);
    montar(t);
  }

  function comportamento(dt, t, ctx) {
    const dx = j.pos.x - e.x, dz = j.pos.z - e.z, distR = Math.hypot(dx, dz);
    quieto = rv < 0.25 ? quieto + dt : 0;
    // longe demais (teleporte, Rabisfone, pulou de veículo) ou preso: aparece perto do Rabisco
    if (distR > 16) reaparecer(true);
    // alvo: atrás do Rabisco e um pouco de lado (fora do caminho)
    const fx = Math.sin(j.dir), fz = Math.cos(j.dir), atras = 0.95 + Math.min(0.9, rv * 0.18);
    let tx = j.pos.x - fx * atras + fz * 0.75 * lado, tz = j.pos.z - fz * atras - fx * 0.75 * lado;
    if (carinho) { tx = j.pos.x + fx * 0.65 + fz * 0.3; tz = j.pos.z + fz * 0.65 - fx * 0.3; }
    const d = Math.hypot(tx - e.x, tz - e.z);
    if (d > 0.95 || (carinho && d > 0.15)) seguindo = true; else if (d < 0.22) seguindo = false;
    const ocupado = Boolean(truque);
    // sentar quando o Rabisco para um tempinho e o bichinho já chegou
    const querSentar = quieto > 2.2 && !seguindo && !truque && !carinho;
    e.sentado += ((querSentar ? 1 : 0) - e.sentado) * Math.min(1, dt * (querSentar ? 3.2 : 7));
    if (e.sentado < 0.01) e.sentado = 0;
    // andar
    let alvoVel = 0;
    if (seguindo && e.sentado < 0.4 && !ocupado) {
      const rapido = Math.min(9, 2.4 + rv * 1.05);
      alvoVel = Math.min(rapido * (d > 2.5 ? 1.5 : 1), 1.1 + d * 2.6);
      if (id === "tartaruga") alvoVel *= 0.62;
    }
    e.vel += (alvoVel - e.vel) * Math.min(1, dt * 7);
    if (e.vel > 0.05 && !ocupado) {
      const ang = Math.atan2(tx - e.x, tz - e.z);
      e.yaw += angDif(e.yaw, ang) * Math.min(1, dt * 9);
      const nx = e.x + Math.sin(e.yaw) * e.vel * dt, nz = e.z + Math.cos(e.yaw) * e.vel * dt, y = e.y + 0.1;
      let moveu = false;
      if (!fis.bate(nx, nz, y, 0.22)) { e.x = nx; e.z = nz; moveu = true; }
      else if (!fis.bate(nx, e.z, y, 0.22)) { e.x = nx; moveu = true; }
      else if (!fis.bate(e.x, nz, y, 0.22)) { e.z = nz; moveu = true; }
      if (!moveu) { preso += dt; e.vel *= 0.5; } else preso = Math.max(0, preso - dt);
      if (preso > 1.6 && distR > 2.2) reaparecer();
      e.fase += dt * (id === "coelho" ? 8 : 3.5 + e.vel * 2.0);
    } else if (!ocupado && e.sentado < 0.5) {
      // parado: vira de frente para o Rabisco
      const ang = Math.atan2(dx, dz);
      if (distR > 0.5) e.yaw += angDif(e.yaw, ang) * Math.min(1, dt * 3.5);
    }
    // não fica em cima do Rabisco: se ele esbarra, o bichinho se afasta
    if (distR < 0.55 && !carinho) {
      const k = (0.55 - distR) * 5 * dt, nx = e.x - (dx / (distR || 1)) * k, nz = e.z - (dz / (distR || 1)) * k;
      if (!fis.bate(nx, nz, e.y + 0.1, 0.22)) { e.x = nx; e.z = nz; }
    }
    // chão (degraus/calçadas baixas)
    const chao = Math.max(0.03, fis.chaoEm(e.x, e.z, e.y + 0.1));
    e.y += (chao - e.y) * Math.min(1, dt * 14);
    // pulo (junto com o Rabisco, sozinho de vez em quando, ou na festa)
    const noChao = j.noChao !== false;
    if (noChaoAntes && !noChao && !ocupado) pular(3.6);
    noChaoAntes = noChao;
    tPulo -= dt;
    if (tPulo <= 0) { tPulo = 6 + Math.random() * 9; if (rv > 1 && e.sentado < 0.2 && !ocupado && !carinho) pular(2.8); }
    if (e.yoff > 0 || e.vy > 0) { e.vy -= 15 * dt; e.yoff = Math.max(0, e.yoff + e.vy * dt); if (e.yoff === 0 && e.vy < 0) e.vy = 0; }
    // carinho: de vez em quando (Rabisco parado ou passeando devagar), o bichinho vem, pula de alegria e solta um coração
    tCarinho -= dt;
    if (tCarinho <= 0 && !truque && !carinho && e.sentado < 0.9) {
      if (rv < 1.2) { carinho = { t: 0, dur: 2.4, pulou: 0 }; tCarinho = 24 + Math.random() * 18; } else tCarinho = 3;
    }
    if (carinho) {
      carinho.t += dt;
      if (carinho.t > 0.9 && carinho.pulou < 2 && Math.floor((carinho.t - 0.9) / 0.5) >= carinho.pulou) { carinho.pulou++; pular(2.2); }
      if (carinho.t >= carinho.dur) carinho = null;
    }
    // olhar para o Rabisco e abanar
    const paraRab = angDif(e.yaw, Math.atan2(dx, dz));
    e.olhar += ((distR > 0.4 ? paraRab : 0) - e.olhar) * Math.min(1, dt * 5);
    const feliz = carinho || truque ? 1 : e.sentado > 0.5 ? 0.8 : e.vel > 0.5 ? 0.45 : 0.25;
    e.abanar += (feliz - e.abanar) * Math.min(1, dt * 4);
    const alvoCor = carinho ? Math.sin(Math.min(1, Math.max(0, (carinho.t - 0.15) / (carinho.dur - 0.3))) * Math.PI) : truque && truque.tipo === "festa" ? Math.sin(Math.min(1, truque.t / truque.dur) * Math.PI) : 0;
    e.coracao += (alvoCor - e.coracao) * Math.min(1, dt * 10);
    // truque
    e.flip = 0; e.giro = 0; e.recolher = 0;
    if (truque) {
      truque.t += dt;
      const k = Math.min(1, truque.t / truque.dur);
      if (truque.tipo === "giro") { e.giro = k * Math.PI * 2; if (truque.t < 0.06) pular(4.2); }
      else if (truque.tipo === "flip") { e.flip = id === "tartaruga" ? 0 : -k * Math.PI * 2; if (truque.t < 0.06) pular(4.6); }
      else { // festinha: dois pulinhos e uma voltinha
        e.giro = Math.sin(k * Math.PI) * 0.6 * (k < 0.5 ? 1 : -1);
        if (truque.t > 0.05 && !truque.p1) { truque.p1 = 1; pular(3.2); }
        if (truque.t > 0.55 && !truque.p2) { truque.p2 = 1; pular(3.2); }
      }
      if (id === "tartaruga") e.recolher = Math.sin(k * Math.PI);
      if (k >= 1) truque = null;
    }
  }

  function montar(t) {
    const g = mod.grupo;
    raiz.position.set(e.x, e.y + e.yoff, e.z);
    raiz.rotation.y = e.yaw + e.giro;
    mod.posar({ fase: e.fase, vel: e.vel > 3.8 ? 2 : e.vel > 0.25 ? 1 : 0, sentado: e.sentado, pulo: 0, flip: e.flip, olhar: e.olhar, abanar: e.abanar, coracao: e.coracao, t, recolher: e.recolher });
    olharPlaca(0.92 - e.sentado * 0.1);
    g.visible = true;
  }

  // ---- veículo: sentado no banco do carona (ou na garupa da moto); onde não há lugar, some e volta pulando
  function carona(dt, ctx) {
    const v = ctx.dentro, a = v.g.userData.carona ?? (v.tipo === "moto" ? { x: 0, y: (v.g.userData.motorista?.y ?? 1.2) - 0.05, z: (v.g.userData.motorista?.z ?? 0) - 0.62 } : null);
    if (!a || ctx.j2ativo || v.tipo === "heli" && false) {
      naCarona = "oculto"; raiz.visible = false;
      e.x = v.pos.x; e.z = v.pos.z; e.y = 0.03; e.vel = 0;
      return;
    }
    if (naCarona !== v) {
      naCarona = v; v.g.add(raiz); raiz.scale.setScalar(0.85);
      e.sentado = 0; carinho = null; truque = null;
    }
    raiz.visible = true;
    e.sentado += (1 - e.sentado) * Math.min(1, dt * 6);
    // carro: entre os bancos, acima do encosto (senão o banco esconde ele); moto: na garupa, em cima do banco de trás
    if (v.tipo === "moto") raiz.position.set(a.x, a.y + 0.24, a.z - 0.1);
    else raiz.position.set(v.g.userData.carona ? 0 : a.x, a.y + 0.45, a.z - 0.15);
    raiz.rotation.set(0, 0, 0);
    e.x = v.pos.x; e.z = v.pos.z;
    // olha para a frente; abana o rabinho quando o veículo anda
    e.fase += dt * Math.abs(v.vel) * 0.3;
    e.abanar += ((Math.abs(v.vel) > 2 ? 1 : 0.3) - e.abanar) * Math.min(1, dt * 4);
    mod.posar({ fase: 0, vel: 0, sentado: e.sentado, olhar: Math.sin(t0 * 0.7) * 0.25, abanar: e.abanar, coracao: 0, t: t0 });
    olharPlaca(0.82);
  }
  function descer() {
    if (naCarona && naCarona !== "oculto") { naCarona.g.remove(raiz); cena.add(raiz); }
    naCarona = null; raiz.scale.setScalar(1);
    raiz.visible = true; reaparecer(true);
  }

  // o toque na tela acertou o bichinho? (projeta o bichinho na tela e compara com o dedo)
  const _v = new THREE.Vector3();
  function tocou(cx, cy, cam, canvas) {
    if (!mod || !raiz.visible || naCarona || escondido) return false;
    const r = canvas.getBoundingClientRect();
    _v.set(e.x, e.y + 0.3, e.z).project(cam);
    if (_v.z > 1) return false;
    const px = r.left + (_v.x * 0.5 + 0.5) * r.width, py = r.top + (-_v.y * 0.5 + 0.5) * r.height;
    return Math.hypot(px - cx, py - cy) < 46;
  }
  function perto(raio = 3) { return Boolean(mod) && raiz.visible && !naCarona && !escondido && Math.hypot(e.x - j.pos.x, e.z - j.pos.z) < raio; }
  function liberar() { if (mod) mod.liberar(); raiz.removeFromParent(); mod = null; }
  return {
    definir, atualizar, truque: truqueAgora, perto, tocou, liberar, reaparecer,
    get id() { return id; }, get nome() { return nome; }, get raiz() { return raiz; }, get modelo() { return mod; },
    get info() { return mod ? { id, nome, x: e.x, z: e.z, y: e.y, yaw: e.yaw, vel: e.vel, sentado: e.sentado, visivel: raiz.visible, naCarona: naCarona ? (naCarona === "oculto" ? "oculto" : naCarona.tipo) : null, truque: truque?.tipo ?? null, carinho: Boolean(carinho), coracao: e.coracao, rv, placa: mod.comNome ? { y: 0.9, w: 0.5 } : null } : null; },
    // para os testes: força o carinho agora
    carinho() { if (mod && !carinho) { carinho = { t: 0, dur: 2.4, pulou: 0 }; } },
  };
}
