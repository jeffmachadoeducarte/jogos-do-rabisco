// Rabiscolândia: o motor das missões (Fatia 5). Lê missoes-dados.js, põe na cidade quem pede (com um "!" em
// cima), os itens para pegar (figurinhas flutuando) e quem espera no destino; controla as etapas, o que vai na
// cabeça do Rabisco, quem vem atrás dele, a carona no carro e o bonequinho verde da faixa. No fim: quem esperava
// pula e acena, confete, selo no Passaporte e (nas bíblicas) o versículo em paráfrase com "baseado em ...".
//
// Orçamento de desenho: ninguém das missões é montado antes de o Rabisco chegar perto, e tudo some de longe
// (raio do ctx). Quem não é "quem pede" só aparece com a missão ativa (ou depois de feita, no lugar onde ficou).
//
//   const M = criarMissoes(ctx);   M.atualizar(dt, t);   M.contexto() → { rotulo, fazer } ou null
//   M.alvo() → { x, z, emoji } (bússola)   M.texto() (faixa do HUD)   M.ativa   M.feitas   M.aceitar(id)   M.largar()

import { THREE, mat, malha, caixaRedonda, texturaCanvas, arvoreReal, mesclar } from "./base3d.js";
import { criarMorador } from "./personagens.js";
import { MISSOES } from "./missoes-dados.js";

// figurinha redonda com emoji (itens, buraquinhos da horta)
const texEmoji = new Map();
function spriteEmoji(emoji, escala = 1.2) {
  if (!texEmoji.has(emoji)) texEmoji.set(emoji, texturaCanvas(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#ffffff"; c.beginPath(); c.arc(64, 64, 56, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = "#151515"; c.stroke();
    c.font = "70px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(emoji, 64, 70);
  }));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEmoji.get(emoji) }));
  s.scale.setScalar(escala);
  return s;
}
let texMarca = null;
const marcaTex = () => (texMarca ??= texturaCanvas(128, 128, (c) => {
  c.fillStyle = "#ffcc1f"; c.strokeStyle = "#151515"; c.lineWidth = 8; c.beginPath(); c.arc(64, 64, 52, 0, 7); c.fill(); c.stroke();
  c.font = "900 84px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#151515"; c.fillText("!", 64, 70);
}));

// bichinhos, piquenique e a arquinha do Noé (feitos aqui; cada um vira poucas malhas com mesclar)
function bichinho(tipo) {
  const g = new THREE.Group();
  if (tipo === "ovelha") {
    const la = mat(0xfdfdfd);
    g.scale.setScalar(0.62);
    for (let i = 0; i < 8; i++) { const b = malha(new THREE.SphereGeometry(0.34, 10, 8), la, { contorno: 0.04, sombra: false }); b.position.set(((i % 3) - 1) * 0.28, 0.72 + (i > 5 ? 0.22 : 0), (Math.floor(i / 3) - 1) * 0.3); g.add(b); }
    const cab = malha(new THREE.SphereGeometry(0.25, 12, 10), mat(0x3a3a3a), { contorno: 0.04, sombra: false }); cab.scale.z = 1.2; cab.position.set(0, 0.92, 0.58); g.add(cab);
    for (const s of [-1, 1]) {
      const o = malha(new THREE.SphereGeometry(0.07, 8, 6), mat(0xffffff), { sombra: false }); o.position.set(s * 0.1, 1.0, 0.83); g.add(o);
      const p = malha(new THREE.SphereGeometry(0.035, 6, 5), mat(0x151515), { sombra: false }); p.position.set(s * 0.1, 1.0, 0.89); g.add(p);
      const or = malha(new THREE.SphereGeometry(0.1, 8, 6), mat(0x3a3a3a), { sombra: false }); or.scale.set(1.6, 0.6, 0.8); or.position.set(s * 0.28, 0.98, 0.5); g.add(or);
    }
    for (const [x, z] of [[-0.2, 0.25], [0.2, 0.25], [-0.2, -0.25], [0.2, -0.25]]) { const p = malha(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), mat(0x3a3a3a), { sombra: false }); p.position.set(x, 0.22, z); g.add(p); }
  } else if (tipo === "coelho") {
    for (const dx of [-0.45, 0.45]) {
      const cor = mat(dx < 0 ? 0xffffff : 0xd9b38c);
      const c = new THREE.Group(); c.position.x = dx; g.add(c);
      const corpo = malha(new THREE.SphereGeometry(0.3, 12, 10), cor, { contorno: 0.03, sombra: false }); corpo.scale.set(1, 0.9, 1.2); corpo.position.y = 0.3; c.add(corpo);
      const rabo = malha(new THREE.SphereGeometry(0.1, 8, 6), mat(0xffffff), { sombra: false }); rabo.position.set(0, 0.36, -0.36); c.add(rabo);
      const cab = malha(new THREE.SphereGeometry(0.22, 12, 10), cor, { contorno: 0.03, sombra: false }); cab.position.set(0, 0.62, 0.25); c.add(cab);
      const nariz = malha(new THREE.SphereGeometry(0.035, 6, 5), mat(0xff7aa8), { sombra: false }); nariz.position.set(0, 0.62, 0.47); c.add(nariz);
      for (const s of [-1, 1]) {
        const o = malha(new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), cor, { contorno: 0.02, sombra: false }); o.position.set(s * 0.09, 0.95, 0.2); o.rotation.z = s * 0.2; c.add(o);
        const ol = malha(new THREE.SphereGeometry(0.04, 8, 6), mat(0x151515), { sombra: false }); ol.position.set(s * 0.08, 0.68, 0.43); c.add(ol);
      }
    }
  } else if (tipo === "piquenique") {
    const toalha = caixaRedonda(3.2, 0.04, 2.4, mat(0xe8413c), { raio: 0.02, sombra: false }); toalha.position.y = 0.04; g.add(toalha);
    for (let i = 0; i < 6; i++) { const q = caixaRedonda(0.5, 0.05, 0.5, mat(0xffffff), { raio: 0.02, sombra: false }); q.position.set(-1.25 + (i % 3) * 1.25 + (Math.floor(i / 3) ? 0.6 : 0), 0.07, -0.85 + Math.floor(i / 3) * 1.15); g.add(q); }
    const cesta = caixaRedonda(0.6, 0.4, 0.45, mat(0xc98a4b), { raio: 0.06, contorno: 0.03, sombra: false }); cesta.position.set(0.9, 0.25, 0); g.add(cesta);
    for (const [x, z, c] of [[-0.6, 0.2, 0xff4f7a], [-0.2, -0.3, 0xffcc1f], [0.2, 0.3, 0x58c43a]]) { const f = malha(new THREE.SphereGeometry(0.13, 10, 8), mat(c), { contorno: 0.02, sombra: false }); f.position.set(x, 0.17, z); g.add(f); }
  } else if (tipo === "arca") {
    const madeira = mat(0xb9773d), escura = mat(0x8a5527);
    // casco fechado (perfil de barquinho puxado no comprimento): o contorno fica só por fora
    const perfil = new THREE.Shape([new THREE.Vector2(-1.25, 1.7), new THREE.Vector2(1.25, 1.7), new THREE.Vector2(1.05, 0.7), new THREE.Vector2(0.55, 0.15), new THREE.Vector2(-0.55, 0.15), new THREE.Vector2(-1.05, 0.7)]);
    const geoC = new THREE.ExtrudeGeometry(perfil, { depth: 6.2, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 3 }); geoC.translate(0, 0, -3.1);
    const casco = malha(geoC, madeira, { contorno: 0.08 }); casco.rotation.y = Math.PI / 2; g.add(casco);
    for (const y of [0.75, 1.25]) { const f = caixaRedonda(6.7, 0.12, 2.6, escura, { raio: 0.05 }); f.position.y = y; f.scale.z = y < 1 ? 0.82 : 0.98; g.add(f); }
    const conves = caixaRedonda(6.2, 0.2, 2.3, escura, { raio: 0.08 }); conves.position.y = 1.65; g.add(conves);
    const casinha = caixaRedonda(3, 1.5, 1.8, mat(0xe9c28a), { raio: 0.12, contorno: 0.06 }); casinha.position.y = 2.5; g.add(casinha);
    const tel = new THREE.Shape([new THREE.Vector2(-1.8, 0), new THREE.Vector2(0, 1.1), new THREE.Vector2(1.8, 0)]);
    const geoT = new THREE.ExtrudeGeometry(tel, { depth: 2.2, bevelEnabled: false }); geoT.translate(0, 0, -1.1);
    const telhado = malha(geoT, mat(0xd6402f), { contorno: 0.06 }); telhado.rotation.y = Math.PI / 2; telhado.position.y = 3.25; g.add(telhado);
    for (const x of [-0.8, 0.8]) { const j = caixaRedonda(0.6, 0.6, 0.1, mat(0x3a2a1c), { raio: 0.1 }); j.position.set(x, 2.6, 0.92); g.add(j); }
    const rampa = caixaRedonda(1.1, 0.12, 3, escura, { raio: 0.05 }); rampa.position.set(0, 0.8, 2.2); rampa.rotation.x = 0.5; g.add(rampa);
  }
  mesclar(g);
  return g;
}

export function criarMissoes(ctx) {
  const { cena, falar, dizer, sons, salvo, salvar, pos, rabisco, vovo, veiculoAtual, raio } = ctx;
  const grupo = new THREE.Group(); grupo.name = "missoes"; cena.add(grupo);
  const npcs = new Map(); // `${missao}:${id}` → { m (morador) | bicho, g, extras, marca, dados, M, quem }
  const itens = []; // { missao, id, sprite, x, z, pego }
  const plantas = []; // { missao, x, z, sprite, broto, feito }
  let ativa = null, etapa = 0, levando = [], carona = null, aviso = 0, tChecar = 0;
  const feitas = new Set(salvo.missoesFeitas ?? []);
  const sobreCabeca = new THREE.Group(); // o que o Rabisco carrega (fica em cima da cabeça)
  rabisco.grupo.add(sobreCabeca); sobreCabeca.position.y = 2.35 / (rabisco.grupo.scale.y || 1);

  // monta um personagem (só quando precisa)
  function npcDe(M, id) {
    const k = `${M.id}:${id}`;
    if (npcs.has(k)) return npcs.get(k);
    const d = M.npcs[id];
    const n = { dados: d, M, id, quem: id === M.quem, festa: 0 };
    if (d.tipo === "vovo") Object.assign(n, { m: vovo, g: vovo.grupo, fixo: true });
    else if (["ovelha", "coelho", "piquenique"].includes(d.tipo)) {
      n.g = bichinho(d.tipo); n.bicho = true; n.g.position.set(d.x, 0.03, d.z); n.g.rotation.y = d.rot ?? Math.PI;
      if (d.tipo === "piquenique") {
        n.amigos = [criarMorador("lapis", { cor: 0xec2e8c, semente: 20 }), criarMorador("giz", { cor: 0x00b5f0, semente: 21 }), criarMorador("cola", { semente: 22 })];
        n.amigos.forEach((a, i) => { a.grupo.position.set(-1.3 + i * 1.3, 0.04, -1.7); n.g.add(a.grupo); });
      }
      grupo.add(n.g);
    } else {
      const m = criarMorador(d.tipo, { cor: d.cor ?? 0xec2e8c, nome: d.nome, semente: d.nome.length + 3 });
      m.grupo.position.set(d.x, d.naArvore ? 2.45 : 0.07, d.z); m.grupo.rotation.y = d.rot ?? 0;
      grupo.add(m.grupo);
      Object.assign(n, { m, g: m.grupo });
      if (d.acessorio === "cajado") {
        const cj = new THREE.Group(); cj.position.set(-0.62, 0, 0.1); m.grupo.add(cj);
        const haste = malha(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 8), mat(0x9a6232), { contorno: 0.025, sombra: false }); haste.position.y = 1.05; cj.add(haste);
        const curva = malha(new THREE.TorusGeometry(0.2, 0.05, 6, 14, Math.PI), mat(0x9a6232), { contorno: 0.025, sombra: false }); curva.position.set(0.2, 2.1, 0); cj.add(curva);
      }
      if (d.acessorio === "barba") {
        const b = malha(new THREE.SphereGeometry(0.22, 12, 8), mat(0xf4f4f4), { contorno: 0.03, sombra: false }); b.scale.set(1.1, 1, 0.55);
        b.position.set(0, (m.altura / 0.78) * 0.47, 0.34); m.grupo.children[0].add(b);
      }
    }
    // o que fica em volta (não se mexe): a árvore do Zaqueu, a arca do Noé
    if (d.naArvore || d.acessorio === "barba") {
      n.extras = new THREE.Group(); grupo.add(n.extras);
      if (d.naArvore) {
        // árvore atrás e um galho grosso que vem até a frente: o Zaqueu fica sentado na ponta, à vista
        const a = arvoreReal(1.15, 1); a.position.set(d.x, 0.03, d.z - 2.6); n.extras.add(a);
        const galho = malha(new THREE.CylinderGeometry(0.11, 0.17, 2.7, 8), mat(0x9a6232), { contorno: 0.04, sombra: false }); galho.rotation.x = Math.PI / 2 - 0.25; galho.position.set(d.x, 2.25, d.z - 1.2); n.extras.add(galho);
        const folhas = malha(new THREE.SphereGeometry(0.5, 7, 5), mat(0x6fd15a), { contorno: 0.05, sombra: false }); folhas.position.set(d.x - 0.75, 2.9, d.z - 0.9); n.extras.add(folhas);
        mesclar(n.extras);
      }
      else { const a = bichinho("arca"); a.position.set(d.x + 6, 0.03, d.z + 4); a.rotation.y = -0.4; n.extras.add(a); }
    }
    if (n.quem) {
      n.marca = new THREE.Sprite(new THREE.SpriteMaterial({ map: marcaTex(), depthTest: false }));
      n.marca.scale.setScalar(0.95); n.marca.renderOrder = 6; grupo.add(n.marca);
    }
    n.casa = [d.x, d.z];
    npcs.set(k, n);
    return n;
  }
  for (const M of MISSOES) M.quem = Object.keys(M.npcs)[0];

  const npcPos = (n) => (n === caronaNpc() ? [carona.pos.x, carona.pos.z] : [n.g.position.x, n.g.position.z]);
  const caronaNpc = () => (carona && ativa ? npcs.get(`${ativa.id}:${ativa.etapas[etapa]?.passageiro}`) : null);
  const nomeDe = (id) => ativa?.npcs[id]?.nome ?? "";
  function reagir(n) {
    if (n.m) { n.m.pular?.(); n.m.acenar?.(3.5); }
    if (n.amigos) for (const a of n.amigos) { a.pular(); a.acenar(3.5); }
    n.festa = 3; sons.vitoria?.(); ctx.confete?.();
  }
  function voltarAoLugar(n) {
    if (n.fixo) return;
    if (n.g.parent !== grupo) grupo.add(n.g);
    n.g.position.set(n.casa[0], n.dados.naArvore ? 2.45 : n.bicho ? 0.03 : 0.07, n.casa[1]); n.g.rotation.set(0, n.dados.rot ?? (n.bicho ? Math.PI : 0), 0);
    n.seguindo = false; n.andando = false; n.esperou = n.disseVerde = false;
  }

  function aceitar(id) {
    const M = MISSOES.find((x) => x.id === id);
    if (!M || ativa) return false;
    limparItens(M.id); // jogando de novo: os brotos da vez passada saem
    ativa = M; etapa = 0; levando = []; carona = null;
    for (const nid of Object.keys(M.npcs)) voltarAoLugar(npcDe(M, nid));
    falar(`rp-m-${M.id}-pedido`);
    dizer(M.npcs[M.quem].nome, M.pedido, 6500);
    prepararEtapa();
    return true;
  }
  function prepararEtapa() {
    const E = ativa.etapas[etapa];
    if (!E) return concluir();
    if (E.tipo === "pegar") for (const it of E.itens) { const s = spriteEmoji(it.emoji); s.position.set(it.x, 1.3, it.z); grupo.add(s); itens.push({ missao: ativa.id, ...it, sprite: s, pego: false }); }
    if (E.tipo === "plantar") for (const p of E.pontos) { const s = spriteEmoji("🕳️", 0.9); s.position.set(p.x, 1.0, p.z); grupo.add(s); plantas.push({ missao: ativa.id, ...p, sprite: s, feito: false }); }
  }
  function avancar() { etapa++; prepararEtapa(); }
  // tira tudo o que a missão pôs na cidade (itens, buraquinhos, brotos) e o que o Rabisco carrega
  function limparItens(mid) {
    for (let i = itens.length - 1; i >= 0; i--) if (itens[i].missao === mid) { grupo.remove(itens[i].sprite); itens[i].sprite.material.dispose(); itens.splice(i, 1); }
    for (let i = plantas.length - 1; i >= 0; i--) if (plantas[i].missao === mid) { const pl = plantas[i]; grupo.remove(pl.sprite); pl.sprite.material.dispose(); if (pl.broto) { grupo.remove(pl.broto); pl.broto.traverse((o) => o.geometry?.dispose()); } plantas.splice(i, 1); }
    for (const s of sobreCabeca.children.slice()) { sobreCabeca.remove(s); s.material.dispose(); }
  }
  function concluir() {
    const M = ativa;
    feitas.add(M.id);
    salvo.missoesFeitas = [...feitas]; salvo.selos = [...new Set([...(salvo.selos ?? []), M.id])]; salvar(salvo);
    for (const s of sobreCabeca.children.slice()) { sobreCabeca.remove(s); s.material.dispose(); }
    for (let i = itens.length - 1; i >= 0; i--) if (itens[i].missao === M.id) { grupo.remove(itens[i].sprite); itens[i].sprite.material.dispose(); itens.splice(i, 1); }
    for (const pl of plantas) if (pl.missao === M.id && pl.sprite.parent) grupo.remove(pl.sprite); // os brotos ficam crescendo na horta
    levando = []; carona = null;
    falar(`rp-m-${M.id}-fim`);
    const ult = M.etapas.at(-1), destino = ult.ate ?? M.quem;
    dizer(M.npcs[destino]?.nome ?? "Rabiscolândia", M.fim, 5200);
    clearTimeout(concluir.t);
    if (M.verso) concluir.t = setTimeout(() => { falar(`rp-m-${M.id}-verso`); dizer(`📖 ${M.titulo}`, `${M.verso.texto} <i>(${M.verso.ref})</i>`, 7500); }, 5400);
    ativa = null; etapa = 0;
    api.ultimaConcluida = M.id;
    ctx.aoConcluir?.(M);
  }

  // o que a ação faz agora (só a pé; tem prioridade sobre veículos, lugares e casas)
  function contexto() {
    if (veiculoAtual()) return null;
    const p = pos();
    if (!ativa) {
      for (const M of MISSOES) {
        const n = npcs.get(`${M.id}:${M.quem}`); if (!n || !n.g.visible) continue;
        const [x, z] = npcPos(n);
        if (Math.hypot(p.x - x, p.z - z) < 2.8) return { rotulo: `${M.icone} ${feitas.has(M.id) ? "De novo: " : ""}${M.titulo}`, fazer: () => aceitar(M.id) };
      }
      return null;
    }
    const E = ativa.etapas[etapa];
    if (!E) return null;
    if (E.tipo === "falar") { const n = npcDe(ativa, E.com); const [x, z] = npcPos(n); if (Math.hypot(p.x - x, p.z - z) < 3.2) return { rotulo: `💬 Falar com ${nomeDe(E.com)}`, fazer: () => { n.m?.acenar(2); sons.moeda?.(); avancar(); } }; }
    if (E.tipo === "pegar") for (const it of itens) if (!it.pego && it.missao === ativa.id && Math.hypot(p.x - it.x, p.z - it.z) < 2.2) return { rotulo: `${it.emoji} Pegar ${it.nome}`, fazer: () => pegar(it) };
    if (E.tipo === "plantar") for (const pl of plantas) if (!pl.feito && pl.missao === ativa.id && Math.hypot(p.x - pl.x, p.z - pl.z) < 2) return { rotulo: "🌱 Plantar a semente", fazer: () => plantar(pl) };
    if (E.tipo === "levar") { const n = npcDe(ativa, E.ate); const [x, z] = npcPos(n); if (Math.hypot(p.x - x, p.z - z) < 3.2) return { rotulo: `🎁 Entregar para ${nomeDe(E.ate)}`, fazer: () => { reagir(n); avancar(); } }; }
    if (E.tipo === "dirigir" && !carona && ctx.chamarCarro) { const n = npcDe(ativa, E.passageiro); const [x, z] = npcPos(n); if (Math.hypot(p.x - x, p.z - z) < 3.2) return { rotulo: "📱 Chamar um carro", fazer: () => ctx.chamarCarro() }; }
    return null;
  }
  function pegar(it) {
    it.pego = true; grupo.remove(it.sprite);
    const s = spriteEmoji(it.emoji, 0.6); s.position.set(((levando.length % 3) - 1) * 0.5, Math.floor(levando.length / 3) * 0.5, 0); sobreCabeca.add(s);
    levando.push(it.id); sons.moeda?.();
    if (itens.every((x) => x.missao !== ativa.id || x.pego)) avancar();
  }
  function plantar(pl) {
    pl.feito = true; grupo.remove(pl.sprite);
    const b = new THREE.Group(); b.position.set(pl.x, 0.45, pl.z);
    const caule = malha(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6), mat(0x3f9a32), { sombra: false }); caule.position.y = 0.2; b.add(caule);
    for (const s of [-1, 1]) { const f = malha(new THREE.SphereGeometry(0.16, 8, 6), mat(0x6fd15a), { contorno: 0.02, sombra: false }); f.scale.set(1.4, 0.45, 0.8); f.position.set(s * 0.15, 0.45, 0); f.rotation.z = s * 0.4; b.add(f); }
    mesclar(b); grupo.add(b); pl.broto = b; pl.cresce = 0;
    sons.pulo();
    if (plantas.every((x) => x.missao !== ativa.id || x.feito)) avancar();
  }
  const atras = (dist) => { const p = pos(); const a = rabisco.grupo.rotation.y; return [p.x - Math.sin(a) * dist, p.z - Math.cos(a) * dist]; };

  // bonequinho de pedestre: verde quando os carros da rua que vai ser atravessada estão com o sinal vermelho
  function podeAtravessar(x, z, t) {
    const { d, rua } = ctx.distRua(x, z);
    if (d >= 0) return true;
    const s = ctx.semaforos().reduce((a, b) => (Math.hypot(b.x - x, b.z - z) < Math.hypot(a.x - x, a.z - z) ? b : a));
    if (Math.hypot(s.x - x, s.z - z) > 20) return true;
    const [[ax, az], [bx, bz]] = [rua.pts[0], rua.pts[1]];
    const eixo = Math.abs(bx - ax) > Math.abs(bz - az) ? "x" : "z";
    return ctx.luzDe(s, eixo, t) === "vermelho";
  }

  function atualizar(dt, t) {
    const p = pos(), R = raio();
    // quem pede: monta quando o Rabisco chega perto (de uma vez por segundo)
    tChecar -= dt;
    if (tChecar <= 0) { tChecar = 0.5; for (const M of MISSOES) { const d = M.npcs[M.quem]; const x = d.tipo === "vovo" ? vovo.grupo.position.x : d.x, z = d.tipo === "vovo" ? vovo.grupo.position.z : d.z; if (Math.hypot(p.x - x, p.z - z) < R + 8) npcDe(M, M.quem); } }
    for (const it of itens) if (!it.pego) { it.sprite.position.y = 1.3 + Math.sin(t * 3 + it.x) * 0.15; it.sprite.visible = Math.hypot(p.x - it.x, p.z - it.z) < R; }
    for (const pl of plantas) { if (pl.sprite.parent) pl.sprite.visible = Math.hypot(p.x - pl.x, p.z - pl.z) < R; if (pl.broto) { pl.cresce = Math.min(1, pl.cresce + dt * 1.5); pl.broto.scale.setScalar(0.3 + pl.cresce * 0.9); pl.broto.visible = Math.hypot(p.x - pl.x, p.z - pl.z) < R; } }
    for (const n of npcs.values()) {
      const [x, z] = npcPos(n);
      const daMissao = n.quem || ativa === n.M || feitas.has(n.M.id) || n.festa > 0;
      const vis = n === caronaNpc() || (daMissao && Math.hypot(p.x - x, p.z - z) < R);
      if (!n.fixo) n.g.visible = vis;
      if (n.extras) n.extras.visible = Math.hypot(p.x - n.casa[0], p.z - n.casa[1]) < R && daMissao;
      if (n.marca) { const pede = !feitas.has(n.M.id) && !ativa; n.marca.visible = pede && (n.fixo ? n.g.visible : vis); n.marca.position.set(x, n.g.position.y + (n.bicho ? 1.6 : n.m?.altura ?? 1.4) + 0.75 + Math.sin(t * 4) * 0.12, z); }
      if (!vis && !n.fixo) continue;
      if (n.m && !n.fixo) {
        // parado: vira para o Rabisco quando ele chega perto
        if (!n.andando && n !== caronaNpc() && Math.hypot(p.x - x, p.z - z) < 6) { const alvo = Math.atan2(p.x - x, p.z - z); let d = alvo - n.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); n.g.rotation.y += d * Math.min(1, dt * 5); }
        n.m.atualizar(dt, { vel: n.andando ? 4 : 0 });
      }
      if (n.amigos) for (const a of n.amigos) a.atualizar(dt, { vel: 0 });
      if (n.festa > 0) { n.festa -= dt; if (n.bicho) n.g.position.y = 0.03 + Math.abs(Math.sin(t * 9)) * 0.35; if (n.m && !n.fixo && Math.random() < dt * 2) n.m.pular(); }
      else if (n.bicho) n.g.position.y = 0.03 + (n.andando ? Math.abs(Math.sin(t * 12)) * 0.15 : 0);
    }
    if (!ativa || ctx.ocupado?.()) return; // dentro de casa ou de um lugar: quem segue espera na porta
    const E = ativa.etapas[etapa];
    if (!E) return;
    // seguir / faixa: quem a gente achou vem atrás do Rabisco (a ovelhinha, os coelhinhos, o Zaqueu, o Caderninho)
    if (E.tipo === "seguir" || E.tipo === "faixa") {
      const quem = E.quem ?? E.com, n = npcDe(ativa, quem);
      const [nx, nz] = npcPos(n);
      if (!n.seguindo && !veiculoAtual() && Math.hypot(p.x - nx, p.z - nz) < 3.2) {
        n.seguindo = true; sons.pulo(); n.m?.acenar(2);
        if (n.dados.naArvore) { n.g.position.y = 0.07; n.m.pular(); }
        dizer(nomeDe(quem), E.tipo === "faixa" ? "Vamos juntos! Só atravessamos na faixa, com o bonequinho verde." : n.bicho ? "Ela vem pulando atrás de você!" : "Oba! Vou com você.", 3000);
      }
      if (n.seguindo) {
        // perto de quem espera, vai direto para o lado dele; senão, atrás do Rabisco
        const dest = npcDe(ativa, E.ate), [dx2, dz2] = npcPos(dest);
        const chegando = Math.hypot(p.x - dx2, p.z - dz2) < 5;
        const [ax, az] = chegando ? [dx2 + (nx - dx2) / (Math.hypot(nx - dx2, nz - dz2) || 1) * 1.4, dz2 + (nz - dz2) / (Math.hypot(nx - dx2, nz - dz2) || 1) * 1.4] : atras(n.bicho ? 1.6 : 1.9);
        let pode = true;
        if (veiculoAtual()) { pode = false; aviso -= dt; if (aviso <= 0) { aviso = 6; dizer(nomeDe(quem), n.bicho ? "Os bichinhos vão a pé! Desça e venha andando." : "Eu vou a pé! Desça e venha andando comigo."); } }
        else if (E.tipo === "faixa") {
          const dl = Math.hypot(ax - nx, az - nz) || 1, px = nx + ((ax - nx) / dl) * Math.min(dl, 0.9), pz = nz + ((az - nz) / dl) * Math.min(dl, 0.9);
          const naRua = ctx.distRua(px, pz).d < 0, jaNaRua = ctx.distRua(nx, nz).d < 0; // o próximo passo pisa no asfalto?
          if (!jaNaRua) n.atravessando = false;
          if (naRua && !n.atravessando && !podeAtravessar(px, pz, t)) { pode = false; n.esperou = true; aviso -= dt; if (aviso <= 0) { aviso = 4; dizer(nomeDe(quem), "Espera! O bonequinho ainda está vermelho. 🚦"); } }
          else if (naRua) { n.atravessando = true; if (n.esperou && !n.disseVerde) { n.disseVerde = true; dizer(nomeDe(quem), "Ficou verde! Agora podemos atravessar. 🟢", 2400); } }
        }
        if (pode) {
          const dx = ax - nx, dz = az - nz, d = Math.hypot(dx, dz);
          if (d > 0.35) { const v = Math.min(d, (n.bicho ? 7 : 6.5) * dt * Math.max(1, d / 2.5)); n.g.position.x += (dx / d) * v; n.g.position.z += (dz / d) * v; n.g.rotation.y = Math.atan2(dx, dz); n.andando = true; } else n.andando = false;
        } else n.andando = false;
        if (Math.hypot(n.g.position.x - dx2, n.g.position.z - dz2) < 2.2) {
          n.andando = false; n.seguindo = false; n.g.rotation.y = Math.atan2(dx2 - n.g.position.x, dz2 - n.g.position.z);
          reagir(dest); reagir(n); avancar();
        }
      }
    }
    // carona: o amigo entra no carro quando o Rabisco para pertinho dele, e desce perto de quem espera
    if (E.tipo === "dirigir") {
      const n = npcDe(ativa, E.passageiro), v = veiculoAtual();
      if (!carona && v && v.g.userData.carona && Math.abs(v.vel) < 1.5 && Math.hypot(v.pos.x - n.g.position.x, v.pos.z - n.g.position.z) < 6) {
        carona = v; v.g.add(n.g); const a = v.g.userData.carona; n.g.position.set(a.x, a.y - 0.3, a.z + 0.05); n.g.rotation.set(0, 0, 0); n.g.scale.setScalar(0.78 / (v.g.scale.x || 1));
        sons.pisao(); n.m.acenar(2); dizer(nomeDe(E.passageiro), "Obrigado pela carona! Vamos para o hospital. 🏥", 3000);
      } else if (!carona && v && !v.g.userData.carona && Math.hypot(v.pos.x - n.g.position.x, v.pos.z - n.g.position.z) < 6) {
        aviso -= dt; if (aviso <= 0) { aviso = 5; dizer(nomeDe(E.passageiro), "Aqui não cabe eu! Chame um carro no Rabifone. 📱"); }
      }
      if (carona) {
        const dest = npcDe(ativa, E.ate), [dx2, dz2] = npcPos(dest);
        if (Math.abs(carona.vel) < 1.5 && Math.hypot(carona.pos.x - dx2, carona.pos.z - dz2) < 11) {
          grupo.add(n.g); n.g.scale.setScalar(0.78); n.g.position.set(dx2 + 1.3, 0.07, dz2 + 1.2); n.g.rotation.set(0, Math.PI, 0);
          carona = null; reagir(dest); reagir(n); avancar();
        }
      }
    }
  }
  function alvo() {
    if (!ativa) return null;
    const E = ativa.etapas[etapa]; if (!E) return null;
    if (E.tipo === "pegar") { const it = itens.find((x) => !x.pego && x.missao === ativa.id); return it && { x: it.x, z: it.z, emoji: it.emoji }; }
    if (E.tipo === "plantar") { const pl = plantas.find((x) => !x.feito && x.missao === ativa.id); return pl && { x: pl.x, z: pl.z, emoji: "🌱" }; }
    const nid = E.tipo === "falar" ? E.com : E.tipo === "levar" ? E.ate : E.tipo === "dirigir" ? (carona ? E.ate : E.passageiro) : npcDe(ativa, E.quem ?? E.com).seguindo ? E.ate : E.quem ?? E.com;
    const n = npcDe(ativa, nid);
    if (n.fixo) return { x: n.g.position.x, z: n.g.position.z, emoji: ativa.icone };
    return { x: n.casa[0], z: n.casa[1], emoji: ativa.icone };
  }
  function texto() {
    if (!ativa) return null;
    const E = ativa.etapas[etapa];
    const faltam = (E?.itens ?? []).filter((it) => !itens.find((x) => x.id === it.id && x.missao === ativa.id)?.pego).map((it) => it.emoji).join(" ");
    const seguindo = E && (E.quem ?? E.com) && npcs.get(`${ativa.id}:${E.quem ?? E.com}`)?.seguindo;
    const t = {
      falar: `Fale com ${nomeDe(E?.com)}`, pegar: `Pegue: ${faltam}`, levar: `Leve para ${nomeDe(E?.ate)}`,
      seguir: seguindo ? `Leve até ${nomeDe(E?.ate)}` : `Encontre ${nomeDe(E?.quem)}`, plantar: "Plante nos buraquinhos da horta",
      dirigir: carona ? `Leve até ${nomeDe(E?.ate)}` : `Busque ${nomeDe(E?.passageiro)} de carro`,
      faixa: seguindo ? `Atravesse na faixa até ${nomeDe(E?.ate)}` : `Encontre ${nomeDe(E?.com)}`,
    }[E?.tipo];
    return { icone: ativa.icone, titulo: ativa.titulo, passo: t };
  }
  function largar() {
    if (!ativa) return;
    const M = ativa;
    limparItens(M.id);
    for (const nid of Object.keys(M.npcs)) { const n = npcs.get(`${M.id}:${nid}`); if (n) voltarAoLugar(n); }
    ativa = null; etapa = 0; levando = []; carona = null;
  }
  // onde está quem pede cada missão (Passaporte: "mostrar o caminho")
  const ondePede = (id) => { const M = MISSOES.find((x) => x.id === id); const d = M.npcs[M.quem]; return d.tipo === "vovo" ? { x: vovo.grupo.position.x, z: vovo.grupo.position.z } : { x: d.x, z: d.z }; };
  const api = {
    MISSOES, contexto, atualizar, alvo, aceitar, texto, largar, ondePede, grupo,
    get ativa() { return ativa?.id ?? null; }, get etapa() { return etapa; }, get feitas() { return [...feitas]; },
    get levando() { return [...levando]; }, get carona() { return Boolean(carona); },
    npc: (mid, id) => { const n = npcDe(MISSOES.find((x) => x.id === mid), id); const [x, z] = npcPos(n); return { x, z, y: n.g.position.y, festa: n.festa, seguindo: Boolean(n.seguindo), visivel: n.g.visible, montado: true }; },
    montados: () => [...npcs.keys()],
    // quem está à vista vira obstáculo para os veículos (ninguém é atropelado)
    obstaculos: () => [...npcs.values()].filter((n) => !n.fixo && n.g.visible && n !== caronaNpc()).map((n) => ({ x: n.g.position.x, z: n.g.position.z, raio: n.bicho ? 0.8 : 0.5 })),
    visiveis: () => { let c = 0; grupo.traverse((o) => { if ((o.isMesh || o.isSprite) && o.visible) { let v = true; for (let q = o; q; q = q.parent) if (!q.visible) v = false; if (v) c++; } }); return c; },
    itensDe: (mid) => itens.filter((x) => x.missao === mid).map((x) => ({ id: x.id, x: x.x, z: x.z, pego: x.pego })),
    plantasDe: (mid) => plantas.filter((x) => x.missao === mid).map((x) => ({ x: x.x, z: x.z, feito: x.feito })),
  };
  return api;
}
