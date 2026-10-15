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
import { lugar } from "./mapa.js";
import { gatinho, bau, foguinho, portico, placaNumero, caixaFrutas, caixaCorreio, texturaEnvelope, tapeteOracao, alvara } from "./missoes-objetos.js";
const OBJETOS_MAO = { alvara };

// figurinha redonda com emoji (itens, buraquinhos da horta)
const texEmoji = new Map();
function spriteEmoji(emoji, escala = 1.2, cor = null) {
  if (cor != null) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaEnvelope(cor) })); s.scale.setScalar(escala); return s; }
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

// quem fica na porta de uma casa (casa: n) ou da Educarte da idade da criança (escola: [dx, dz]; com unidade: "kids2" fica sempre naquela) ganha a posição na hora
// (as casas vêm de mundo.js; a idade, do cadastro ou de ?idade=N). Também os itens com casa: n.
export function escolaDaIdade(idade) { return idade != null && idade <= 4 ? "kids1" : "kids2"; }
function posicionarNaCidade(ctx) {
  const casas = ctx.casas?.() ?? [];
  const naCasa = (o, lado = 1.6) => { const c = casas.find((k) => k.lote.numero === o.casa); if (!c) return; o.x = c.porta[0] + lado; o.z = c.porta[1] - 0.6 * c.lote.dir[1]; o.rot = c.lote.rot; };
  const esc = lugar(escolaDaIdade(ctx.idade?.() ?? null));
  const escDe = (d) => (d.unidade ? lugar(d.unidade) : esc); // unidade: "kids2" fixa a escola do npc, sem olhar a idade
  for (const M of MISSOES) {
    for (const d of Object.values(M.npcs)) {
      if (d.casa != null) naCasa(d, d.lado ?? 1.6);
      const e = d.escola && escDe(d);
      if (e) { d.x = e.x + d.escola[0]; d.z = e.z + d.escola[1]; d.rot = e.rot; }
    }
    for (const E of M.etapas) for (const it of E.itens ?? []) if (it.casa != null) { naCasa(it, 0); it.z += casas.find((k) => k.lote.numero === it.casa)?.lote.dir[1] * 1.2 || 0; }
  }
}
export function criarMissoes(ctx) {
  const { cena, falar, dizer, sons, salvo, salvar, pos, rabisco, vovo, veiculoAtual, raio } = ctx;
  posicionarNaCidade(ctx);
  const grupo = new THREE.Group(); grupo.name = "missoes"; cena.add(grupo);
  const npcs = new Map(); // `${missao}:${id}` → { m (morador) | bicho, g, extras, marca, dados, M, quem }
  const itens = []; // { missao, id, sprite, x, z, pego }
  const plantas = []; // { missao, x, z, sprite, broto, feito }
  let ativa = null, etapa = 0, levando = [], carona = null, aviso = 0, tChecar = 0;
  let carroEscolhido = null; // o carro novo da J.E (vira um veículo de verdade)
  let ultimoReceptor = null; // nas entregas em qualquer ordem, quem recebeu por último diz o "fim"
  let est = {}; // estado da etapa atual (etapas que vieram da Rabiscópolis)
  const fila = []; // quem vem atrás do Rabisco em fila (gatinhos achados, amigos convidados)
  const gotas = []; // água do bombeiro (bolinhas azuis)
  const feitas = new Set(salvo.missoesFeitas ?? []);
  const sobreCabeca = new THREE.Group(); // o que o Rabisco carrega (fica em cima da cabeça)
  rabisco.grupo.add(sobreCabeca); sobreCabeca.position.y = 2.35 / (rabisco.grupo.scale.y || 1);
  // o que o Rabisco leva na mão (o alvará com selo): objeto 3D preso na mão direita
  let naMao = null;
  function segurar(tipo) {
    soltarMao();
    const cot = rabisco.bracoD?.cotovelo; if (!cot || !OBJETOS_MAO[tipo]) return false;
    naMao = OBJETOS_MAO[tipo](); naMao.userData.item = tipo;
    cot.updateMatrixWorld(true); const esc = cot.getWorldScale(new THREE.Vector3()).x || 1;
    naMao.scale.setScalar(1 / esc); naMao.position.set(-0.12, -1.02, 0.12); naMao.rotation.set(0, -Math.PI / 2 + 0.5, 0); // de lado, para fora: aparece de trás e da frente
    cot.add(naMao); return true;
  }
  function soltarMao() {
    if (!naMao) return;
    naMao.removeFromParent(); naMao.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); naMao = null;
  }

  // monta um personagem (só quando precisa)
  function npcDe(M, id) {
    const k = `${M.id}:${id}`;
    if (npcs.has(k)) return npcs.get(k);
    const d = M.npcs[id];
    // "mesmo": é a mesma pessoa de outra missão (a Professora Lápis Turquesa da Hora da Aula recebe o presente)
    if (d.mesmo) { const [mid, nid] = d.mesmo.split(":"); return npcDe(MISSOES.find((x) => x.id === mid), nid); }
    const n = { dados: d, M, id, quem: id === M.quem, festa: 0 };
    if (d.tipo === "vovo") Object.assign(n, { m: vovo, g: vovo.grupo, fixo: true });
    else if (["ovelha", "coelho", "piquenique", "gato"].includes(d.tipo)) {
      n.g = d.tipo === "gato" ? gatinho(d.cor) : bichinho(d.tipo); n.bicho = true; n.g.position.set(d.x, 0.03, d.z); n.g.rotation.y = d.rot ?? Math.PI;
      if (d.tipo === "piquenique") {
        n.amigos = [criarMorador("lapis", { cor: 0xec2e8c, semente: 20 }), criarMorador("giz", { cor: 0x00b5f0, semente: 21 }), criarMorador("cola", { semente: 22 })];
        n.amigos.forEach((a, i) => { a.grupo.position.set(-1.3 + i * 1.3, 0.04, -1.7); n.g.add(a.grupo); });
      }
      grupo.add(n.g);
    } else {
      const m = criarMorador(d.tipo, { cor: d.cor ?? 0xec2e8c, nome: d.nome, semente: d.nome.length + 3, escala: d.escala ?? 0.78, acessorio: d.acessorio, corAcessorio: d.corAcessorio, tenis: d.tenis });
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
    // caixinha de correio da cor da carta, do lado de quem recebe
    if (d.caixa != null) {
      n.extras = new THREE.Group(); grupo.add(n.extras);
      const cx = caixaCorreio(d.caixa), [px, pz] = d.tipo === "vovo" ? [vovo.grupo.position.x, vovo.grupo.position.z] : [d.x, d.z];
      cx.position.set(px - 1.1, 0.03, pz); n.extras.add(cx);
      n.casaExtras = [px, pz];
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
    n.casa = d.tipo === "vovo" ? [vovo.grupo.position.x, vovo.grupo.position.z] : [d.x, d.z];
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
    ativa = M; etapa = 0; levando = []; carona = null; aviso = 0; // missão nova: as dicas podem aparecer na hora
    for (const nid of Object.keys(M.npcs)) voltarAoLugar(npcDe(M, nid));
    clearTimeout(concluir.t2);
    const nm = ctx.nome?.();
    if (M.voz?.pedidoNome) {
      // a anfitriã chama a criança pelo nome: "Alice, o alvará da escola venceu! ..." (sem nome no banco: a fala neutra)
      Promise.resolve(ctx.falarNome?.(null, M.voz.pedidoNome)).then((ok) => { if (!ok) falar(M.voz.pedido); });
      dizer(M.npcs[M.quem].nome, nm && M.pedidoComNome ? M.pedidoComNome.replace("{nome}", nm) : M.pedido, 6500);
    } else {
      falar(M.voz?.pedido ?? `rp-m-${M.id}-pedido`);
      dizer(M.npcs[M.quem].nome, M.pedido, 6500);
    }
    prepararEtapa();
    return true;
  }
  function prepararEtapa() {
    const E = ativa.etapas[etapa];
    if (!E) return concluir();
    if (E.tipo === "pegar") for (const it of E.itens) { const s = spriteEmoji(it.emoji, 1.2, it.cor); s.position.set(it.x, 1.3, it.z); grupo.add(s); itens.push({ missao: ativa.id, ...it, sprite: s, pego: false }); }
    if (E.tipo === "plantar") for (const p of E.pontos) { const s = spriteEmoji("🕳️", 0.9); s.position.set(p.x, 1.0, p.z); grupo.add(s); plantas.push({ missao: ativa.id, ...p, sprite: s, feito: false }); }
    prepararNova(E);
  }
  function avancar() {
    const E = ativa.etapas[etapa];
    if (E?.tipo === "pegar" && E.fala) { dizer(nomeDe(E.quemFala ?? ativa.quem), E.fala, 3200); if (E.voz) falar(E.voz); if (E.quemFala) { const n = npcDe(ativa, E.quemFala); n.m?.acenar(2.5); n.m?.pular(); } }
    limparEst();
    etapa++; prepararEtapa();
  }
  // tira tudo o que a missão pôs na cidade (itens, buraquinhos, brotos) e o que o Rabisco carrega
  function limparItens(mid) {
    for (let i = itens.length - 1; i >= 0; i--) if (itens[i].missao === mid) { grupo.remove(itens[i].sprite); itens[i].sprite.material.dispose(); itens.splice(i, 1); }
    for (let i = plantas.length - 1; i >= 0; i--) if (plantas[i].missao === mid) { const pl = plantas[i]; grupo.remove(pl.sprite); pl.sprite.material.dispose(); if (pl.broto) { grupo.remove(pl.broto); pl.broto.traverse((o) => o.geometry?.dispose()); } plantas.splice(i, 1); }
    for (const s of sobreCabeca.children.slice()) { sobreCabeca.remove(s); s.material.dispose(); }
    soltarMao();
  }
  function concluir() {
    const M = ativa;
    limparEst(); fila.length = 0;
    feitas.add(M.id);
    salvo.missoesFeitas = [...feitas]; salvo.selos = [...new Set([...(salvo.selos ?? []), M.id])]; salvar(salvo);
    for (const s of sobreCabeca.children.slice()) { sobreCabeca.remove(s); s.material.dispose(); }
    soltarMao();
    for (let i = itens.length - 1; i >= 0; i--) if (itens[i].missao === M.id) { grupo.remove(itens[i].sprite); itens[i].sprite.material.dispose(); itens.splice(i, 1); }
    for (const pl of plantas) if (pl.missao === M.id && pl.sprite.parent) grupo.remove(pl.sprite); // os brotos ficam crescendo na horta
    levando = []; carona = null;
    const ult = M.etapas.at(-1), destino = ult.ate ?? M.quem;
    clearTimeout(concluir.t); clearTimeout(concluir.t2);
    if (M.agradece) {
      // quem recebeu agradece com o nome da criança ("Obrigada, Alice! ..."); depois a anfitriã diz o fim
      const A = M.agradece, nm = ctx.nome?.();
      dizer(M.npcs[destino]?.nome ?? "Rabiscolândia", nm ? A.texto.replace("{nome}", nm) : A.textoSem, A.ms);
      Promise.resolve(ctx.falarNome?.(A.pre, A.pos)).then((ok) => { if (!ok) falar(A.neutra); });
      concluir.t2 = setTimeout(() => { falar(M.voz?.fim ?? `rp-m-${M.id}-fim`); dizer("Rabiscolândia", M.fim, 6500); }, A.ms);
    } else {
      falar(M.voz?.fim ?? `rp-m-${M.id}-fim`);
      dizer(ultimoReceptor ?? M.npcs[destino]?.nome ?? "Rabiscolândia", M.fim, 5200);
    }
    ultimoReceptor = null;
    if (M.verso) concluir.t = setTimeout(() => { falar(`rp-m-${M.id}-verso`); dizer(`📖 ${M.titulo}`, `${M.verso.texto} <i>(${M.verso.ref})</i>`, 7500); }, 5400);
    ativa = null; etapa = 0;
    api.ultimaConcluida = M.id;
    ctx.aoConcluir?.(M);
  }

  // o que a ação faz agora (só a pé; tem prioridade sobre veículos, lugares e casas)
  // p: de quem é a ação (o Rabisco, ou o jogador 2 a pé: os dois podem fazer missões)
  function contexto(p = null) {
    if (!p && veiculoAtual()) return null;
    p ??= pos();
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
    if (E.tipo === "levar") { const n = npcDe(ativa, E.ate); const [x, z] = npcPos(n); if (Math.hypot(p.x - x, p.z - z) < 3.2) return { rotulo: `${E.icone ?? "🎁"} Entregar para ${nomeDe(E.ate)}`, fazer: () => { reagir(n); avancar(); } }; }
    if (E.tipo === "dirigir" && !carona && ctx.chamarCarro) { const n = npcDe(ativa, E.passageiro); const [x, z] = npcPos(n); if (Math.hypot(p.x - x, p.z - z) < 3.2) return { rotulo: "📱 Chamar um carro", fazer: () => ctx.chamarCarro() }; }
    return contextoNovo(E, p);
  }
  function pegar(it) {
    it.pego = true; grupo.remove(it.sprite);
    const s = spriteEmoji(it.emoji, 0.6, it.cor); s.position.set(((levando.length % 3) - 1) * 0.5, Math.floor(levando.length / 3) * 0.5, 0); s.userData.item = it.id; sobreCabeca.add(s);
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
      const daMissao = n.quem || ativa === n.M || (feitas.has(n.M.id) && !n.dados.soNaMissao) || n.festa > 0;
      const vis = n === caronaNpc() || (daMissao && Math.hypot(p.x - x, p.z - z) < R);
      if (!n.fixo) n.g.visible = vis;
      if (n.extras) n.extras.visible = Math.hypot(p.x - n.casa[0], p.z - n.casa[1]) < R && (n.casaExtras ? ativa === n.M : daMissao);
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
    animarGotas(dt);
    if (!ativa || ctx.ocupado?.()) return; // dentro de casa ou de um lugar: quem segue espera na porta
    const E = ativa.etapas[etapa];
    if (!E) return;
    atualizarNova(E, dt, t, p);
    // seguir / faixa: quem a gente achou vem atrás do Rabisco (a ovelhinha, os coelhinhos, o Zaqueu, o Caderninho)
    if (E.tipo === "seguir" || E.tipo === "faixa") {
      const quem = E.quem ?? E.com, n = npcDe(ativa, quem);
      const [nx, nz] = npcPos(n);
      const p2 = ctx.pos2?.();
      if (!n.seguindo && !veiculoAtual() && (Math.hypot(p.x - nx, p.z - nz) < 3.2 || (p2 && Math.hypot(p2.x - nx, p2.z - nz) < 3.2))) {
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
    const novo = alvoNovo(E); if (novo !== undefined) return novo;
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
    }[E?.tipo] ?? textoNovo(E);
    return { icone: ativa.icone, titulo: ativa.titulo, passo: t };
  }
  function largar() {
    clearTimeout(concluir.t2);
    if (!ativa) return;
    const M = ativa;
    if (est.orando) ctx.pararOracao?.();
    limparEst(); fila.length = 0;
    limparItens(M.id);
    for (const nid of Object.keys(M.npcs)) { const n = npcs.get(`${M.id}:${nid}`); if (n) voltarAoLugar(n); }
    ativa = null; etapa = 0; levando = []; carona = null;
  }
  // ================================================================== etapas que vieram da Rabiscópolis
  const temp = (o) => { grupo.add(o); (est.objs ??= []).push(o); return o; };
  function limparEst() {
    const soltar = (o) => { o.removeFromParent(); o.traverse((q) => { if (q.isSprite) q.material.dispose(); if (q.geometry && !q.geometry.userData.compartilhada) q.geometry.dispose(); }); };
    for (const o of est.objs ?? []) soltar(o);
    if (est.carga) soltar(est.carga);
    if (est.patos) for (const q of est.patos) q.p.visible = true; // os patinhos do lago voltam todos
    for (const n of npcs.values()) if (n.coracao) { n.coracao.removeFromParent(); n.coracao = null; }
    est = {};
  }
  const pendentes = (E) => (E.bichos ?? E.quem).filter((id) => !est.juntos.has(id));
  function prepararNova(E) {
    est = { t: 0 };
    if (E.tipo === "achar" || E.tipo === "seguirVarios") {
      est.juntos = new Set(); fila.length = 0;
      if (E.tipo === "seguirVarios") for (const id of E.quem) { const n = npcDe(ativa, id); n.coracao = spriteEmoji("💗", 0.85); n.coracao.renderOrder = 5; n.coracao.material.depthTest = false; grupo.add(n.coracao); }
    }
    if (E.tipo === "contar") {
      const todos = ctx.patos?.() ?? [];
      const n = Math.min(todos.length || E.max, E.min + Math.floor(Math.random() * (E.max - E.min + 1)));
      est.n = n; est.patos = todos;
      todos.forEach((q, i) => (q.p.visible = i < n));
      const d = npcDe(ativa, E.ate), [dx, dz] = d.casa;
      const opcoes = [n - 1, n, n + 1].sort(() => Math.random() - 0.5);
      est.placas = opcoes.map((v, i) => { const g = temp(placaNumero(v)); const x = dx - 3 + i * 3, z = dz - 3.6; g.position.set(x, 0.03, z); return { n: v, x, z, g, dentro: false }; });
    }
    if (E.tipo === "bandeiras") {
      est.prox = 0; est.t0 = null;
      est.porticos = E.pontos.map(([x, z, giro], i) => { const g = temp(portico(i + 1)); g.position.set(x, 0.03, z); g.rotation.y = giro ? Math.PI / 2 : 0; return { x, z, g }; });
    }
    if (E.tipo === "levarVeiculo") {
      est.carregado = !E.de; est.veiculo = null;
      if (E.de && E.carga.modelo === "frutas") { const n = npcDe(ativa, E.de); est.carga = caixaFrutas(); est.carga.position.set(n.casa[0] + 1.3, 0.03, n.casa[1] + 0.4); grupo.add(est.carga); }
    }
    if (E.tipo === "apagar") est.fogos = E.fogos.map(([x, z]) => { const g = temp(foguinho()); g.position.set(x, 0.03, z); return { x, z, g, agua: 0, jato: 0, perto: 0, apagado: false, fumaca: 0 }; });
    if (E.tipo === "pistas") { est.i = 0; est.baus = E.pistas.map((q) => { const g = temp(bau()); g.position.set(q.x, 0.03, q.z); g.rotation.y = Math.PI * 0.15; g.visible = false; return { ...q, g, aberto: 0 }; }); }
    if (E.tipo === "entregar") est.feitas = new Set();
    if (E.tipo === "evento") est.evento = E.evento;
    if (E.tipo === "escolherCarro") { ctx.patioJE?.devolver(); carroEscolhido = null; }
    if (E.tipo === "orar") { const g = temp(tapeteOracao()); g.position.set(E.tapete[0], 0.03, E.tapete[1]); g.rotation.y = E.olhar; est.orando = false; }
  }
  const veiculoServe = (E, v) => v && (E.veiculos === "escolhido" ? v === carroEscolhido : E.veiculos === "porta-malas" ? !["bici", "patinete", "barco", "heli"].includes(v.tipo) : E.veiculos.includes(v.tipo));
  function avisar(quem, texto, voz = null, cada = 6) { if (aviso > 0) return; aviso = cada; dizer(quem, texto, 3200); if (voz) falar(voz); }
  function juntar(E, n) {
    est.juntos.add(n.id); fila.push(n); n.seguindo = true;
    sons.moeda?.(); n.m?.acenar(2); n.m?.pular?.();
    if (n.coracao) { n.coracao.removeFromParent(); n.coracao = null; }
    const todos = !pendentes(E).length;
    if (todos && E.falaTodos) { dizer(n.dados.nome, E.falaTodos, 3800); if (E.vozTodos) falar(E.vozTodos); }
    else { dizer(n.dados.nome, E.fala ?? "Oba! Vou com você.", 2600); if (E.voz) falar(E.voz); }
  }
  function contextoNovo(E, p) {
    const perto = (x, z, r) => Math.hypot(p.x - x, p.z - z) < r;
    if (E.tipo === "achar" || E.tipo === "seguirVarios") {
      for (const id of pendentes(E)) { const n = npcDe(ativa, id); if (perto(n.g.position.x, n.g.position.z, 2.8)) return { rotulo: E.rotulo ?? "💌 Convidar", fazer: () => juntar(E, n) }; }
    }
    if (E.tipo === "contar") for (const pl of est.placas) if (perto(pl.x, pl.z, 1.7)) return { rotulo: `🔢 São ${pl.n}!`, fazer: () => escolherNumero(E, pl) };
    if (E.tipo === "levarVeiculo" && !est.carregado && E.de && ctx.chamarCarro) { const n = npcDe(ativa, E.de); if (perto(n.casa[0], n.casa[1], 3.4)) return { rotulo: "📱 Chamar um carro", fazer: () => { ctx.chamarCarro(); } }; }
    if (E.tipo === "apagar") for (const f of est.fogos) if (!f.apagado && perto(f.x, f.z, 3.6)) return { rotulo: "💧 Jogar água", fazer: () => { f.jato = 1.4; sons.pulo?.(); } };
    if (E.tipo === "pistas") { const b = est.baus[est.i]; if (b && !b.aberto && perto(b.x, b.z, 2.6)) return { rotulo: "🗝️ Abrir o baú", fazer: () => abrirBau(E, b) }; }
    if (E.tipo === "entregar") for (const en of E.entregas) {
      if (est.feitas.has(en.item) || !levando.includes(en.item)) continue;
      const n = npcDe(ativa, en.ate), [x, z] = npcPos(n), it = E.entregas && itensDa(en.item);
      if (perto(x, z, 3.2)) return { rotulo: `✉️ Entregar a ${it?.nome ?? "carta"}`, fazer: () => entregarItem(E, en, n) };
    }
    if (E.tipo === "voltar") { const n = npcDe(ativa, E.ate), [x, z] = npcPos(n); if (perto(x, z, 3.2)) return { rotulo: `🙌 Contar para ${nomeDe(E.ate)}`, fazer: () => { reagir(n); avancar(); } }; }
    if (E.tipo === "escolherCarro" && ctx.patioJE && !est.escolheu) for (const [i, vg] of ctx.patioJE.vagas.entries()) {
      if (ctx.patioJE.escolhidos.includes(i)) continue;
      if (perto(vg.x, vg.z, 3.4)) return { rotulo: `⭐ Quero este! (${vg.cor})`, fazer: () => escolherCarro(E, i, vg) };
    }
    return null;
  }
  const itensDa = (id) => ativa.etapas.flatMap((e) => e.itens ?? []).find((it) => it.id === id);
  function escolherCarro(E, i, vg) {
    est.escolheu = true; sons.vitoria?.(); falar(`cid-je-${vg.cor}`);
    dizer("Rabisco", `Quero este! O carro ${vg.cor}! ⭐`, 2200);
    const M = ativa;
    setTimeout(() => {
      if (ativa !== M) return;
      ctx.patioJE.escolher(i);
      carroEscolhido = ctx.adicionarVeiculo?.(vg) ?? null;
      const n = npcDe(ativa, E.de); n.m?.acenar(3); n.m?.pular();
      dizer(n.dados.nome, E.fala, 4200); if (E.voz) falar(E.voz);
      const s = spriteEmoji("🔑", 0.6); s.userData.item = "chave"; sobreCabeca.add(s); levando.push("chave");
      avancar();
    }, 1900);
  }
  function entregarItem(E, en, n) {
    est.feitas.add(en.item);
    const s = sobreCabeca.children.find((q) => q.userData.item === en.item); if (s) { sobreCabeca.remove(s); s.material.dispose(); }
    levando = levando.filter((x) => x !== en.item);
    reagir(n);
    if (est.feitas.size === E.entregas.length) { ultimoReceptor = n.dados.nome; avancar(); return; }
    dizer(n.dados.nome, E.fala ?? "Obrigado!", 2600); if (E.voz) falar(E.voz);
  }
  function escolherNumero(E, pl) {
    if (pl.n === est.n) { sons.moeda?.(); reagir(npcDe(ativa, E.ate)); avancar(); }
    else { sons.erro?.(); aviso = 0; avisar(nomeDe(E.ate), E.erro ?? "Conte de novo, devagarinho.", E.vozErro, 2.5); }
  }
  function abrirBau(E, b) {
    b.aberto = 0.01; sons.porta?.() ?? sons.moeda?.();
    const prox = E.pistas[est.i + 1];
    if (prox) { dizer("Pista do tesouro", prox.texto, 6000); if (prox.voz) falar(prox.voz); }
    else { b.g.userData.brilho.visible = true; dizer("Tesouro!", E.achou ?? "Você achou o tesouro!", 6000); ctx.confete?.(); sons.vitoria?.(); }
    setTimeout(() => { if (ativa && est.baus?.includes(b)) { est.i++; if (prox) b.g.visible = false; else avancar(); } }, prox ? 1600 : 2200);
  }
  function soltarGota(de, para) {
    if (gotas.length > 40) return;
    const m = malha(new THREE.SphereGeometry(0.09, 6, 4), mat(0x4fc3ff), { sombra: false });
    m.position.copy(de); grupo.add(m);
    const dx = para.x - de.x, dz = para.z - de.z, T = 0.45 + Math.random() * 0.15;
    gotas.push({ m, v: new THREE.Vector3(dx / T + (Math.random() - 0.5), (para.y - de.y) / T + 9.8 * T * 0.5, dz / T + (Math.random() - 0.5)), vida: T });
  }
  function animarGotas(dt) {
    for (let i = gotas.length - 1; i >= 0; i--) {
      const g = gotas[i]; g.vida -= dt; g.v.y -= 9.8 * dt; g.m.position.addScaledVector(g.v, dt);
      if (g.vida <= 0) { g.m.removeFromParent(); g.m.geometry.dispose(); gotas.splice(i, 1); }
    }
  }
  const _de = new THREE.Vector3(), _para = new THREE.Vector3();
  function atualizarNova(E, dt, t, p) {
    aviso -= dt; est.t += dt;
    const v = veiculoAtual(), p2 = ctx.pos2?.();
    // fila: cada um vai atrás do anterior (o Rabisco é o primeiro); de carro, vão de carona (somem até ele descer)
    if ((E.tipo === "achar" || E.tipo === "seguirVarios") && fila.length) {
      let ant = { x: p.x, z: p.z };
      for (const n of fila) {
        const g = n.g;
        if (v) { g.position.x = p.x; g.position.z = p.z; n.andando = false; ant = { x: p.x, z: p.z }; continue; }
        const dx = ant.x - g.position.x, dz = ant.z - g.position.z, d = Math.hypot(dx, dz);
        if (d > 16) { const a = rabisco.grupo.rotation.y; g.position.x = ant.x - Math.sin(a) * 1.6; g.position.z = ant.z - Math.cos(a) * 1.6; }
        else if (d > 1.5) { const vel = Math.min(7, (d - 1.5) * 3.2) * dt; g.position.x += (dx / d) * vel; g.position.z += (dz / d) * vel; g.rotation.y = Math.atan2(dx, dz); n.andando = true; }
        else n.andando = false;
        ant = { x: g.position.x, z: g.position.z };
      }
      const dest = npcDe(ativa, E.ate), [dx2, dz2] = npcPos(dest);
      if (!pendentes(E).length && !v && Math.hypot(p.x - dx2, p.z - dz2) < 4.5) {
        // chegaram: cada um fica em volta de quem esperava
        fila.forEach((n, i) => { const a = (i - (fila.length - 1) / 2) * 0.8 + Math.atan2(p.x - dx2, p.z - dz2); n.g.position.set(dx2 + Math.sin(a) * 1.6, n.g.position.y, dz2 + Math.cos(a) * 1.6); n.g.rotation.y = Math.atan2(dx2 - n.g.position.x, dz2 - n.g.position.z); n.seguindo = false; n.andando = false; reagir(n); });
        fila.length = 0; reagir(dest); avancar(); return;
      }
    }
    if (E.tipo === "achar" || E.tipo === "seguirVarios") for (const n of fila) if (n.g) n.g.visible = !v;
    // coraçõezinhos em cima de quem ainda falta convidar
    for (const n of npcs.values()) if (n.coracao) { n.coracao.position.set(n.g.position.x, n.g.position.y + (n.m?.altura ?? 1.2) + 0.7 + Math.sin(t * 4) * 0.1, n.g.position.z); n.coracao.visible = n.g.visible; }
    if (E.tipo === "achar") for (const id of pendentes(E)) { const n = npcDe(ativa, id); if (n.g.userData.rabo) n.g.userData.rabo.rotation.z = Math.sin(t * 5 + n.casa[0]) * 0.5; }
    if (E.tipo === "contar") {
      for (const q of est.patos) q.p.visible = est.patos.indexOf(q) < est.n;
      for (const pl of est.placas) {
        pl.g.visible = Math.hypot(p.x - pl.x, p.z - pl.z) < raio();
        const em = !v && (Math.hypot(p.x - pl.x, p.z - pl.z) < 1.05 || (p2 && Math.hypot(p2.x - pl.x, p2.z - pl.z) < 1.05));
        if (em && !pl.dentro) { pl.dentro = true; escolherNumero(E, pl); return; }
        pl.dentro = em;
      }
    }
    if (E.tipo === "bandeiras") {
      est.porticos.forEach((b, i) => { b.g.visible = i >= est.prox && i <= est.prox + 1 && Math.hypot(p.x - b.x, p.z - b.z) < 140; b.g.userData.num.position.y = 4.3 + (i === est.prox ? Math.sin(t * 5) * 0.25 : 0); b.g.userData.num.scale.setScalar(i === est.prox ? 2.4 + Math.sin(t * 8) * 0.15 : 1.8); });
      const b = est.porticos[est.prox];
      if (b) {
        if (v && Math.hypot(v.pos.x - b.x, v.pos.z - b.z) < 7.5) {
          est.prox++; sons.moeda?.(); falar(`cid-num-${est.prox}`);
          if (est.prox === 1) est.t0 = est.t;
          if (est.prox === est.porticos.length) {
            const seg = Math.round(est.t - est.t0);
            reagir(npcDe(ativa, E.ate)); avancar();
            setTimeout(() => dizer("Corrida dos números", `1, 2, 3, 4, 5! Você fez a volta em ${seg} segundos. 🏁`, 3600), 5300);
            return;
          }
        } else if (!v && est.prox === 0 && Math.hypot(p.x - b.x, p.z - b.z) < 9) avisar(nomeDe(E.ate), "A corrida é de carro! Chame um carro no Rabifone 📱 e passe por baixo da bandeira.", "rp-corrida-pe");
      }
    }
    if (E.tipo === "levarVeiculo") {
      const dest = npcDe(ativa, E.ate), [dx2, dz2] = npcPos(dest);
      if (!est.carregado) {
        const n = npcDe(ativa, E.de);
        if (v && veiculoServe(E, v) && Math.abs(v.vel) < 2 && Math.hypot(v.pos.x - n.casa[0], v.pos.z - n.casa[1]) < 9) {
          est.carregado = true; est.veiculo = v;
          if (est.carga) { v.g.add(est.carga); est.carga.position.set(0, 1.0, -v.comp * 0.6); est.carga.rotation.set(0, 0, 0); est.carga.scale.setScalar(0.85 / (v.g.scale.x || 1)); }
          sons.moeda?.(); n.m?.acenar(2); dizer(n.dados.nome, E.carregou ?? "Está no carro!", 3200); if (E.vozCarregou) falar(E.vozCarregou);
        } else if (!v && Math.hypot(p.x - n.casa[0], p.z - n.casa[1]) < 3.4) avisar(n.dados.nome, E.aPe ?? "Venha de carro!", E.vozAPe, 7);
        else if (v && !veiculoServe(E, v) && Math.hypot(v.pos.x - n.casa[0], v.pos.z - n.casa[1]) < 9) avisar(n.dados.nome, "Aqui não cabe a caixa! Venha de carro. 🚗", null, 6);
      } else {
        if (E.portao && !est.passouPortao && v && v === carroEscolhido && Math.hypot(v.pos.x - E.portao[0], v.pos.z - E.portao[1]) < 6) { est.passouPortao = true; dizer(ativa.npcs[ativa.quem].nome, E.falaPortao, 4200); if (E.vozPortao) falar(E.vozPortao); }
        const certo = E.de ? v === est.veiculo : veiculoServe(E, v);
        const pousou = !E.pousar || (v && v.alt - (ctx.chaoHeli?.(v.pos.x, v.pos.z) ?? 0) < 0.4);
        if (certo && Math.abs(v.vel) < 2 && pousou && Math.hypot(v.pos.x - dx2, v.pos.z - dz2) < (E.pousar ? 16 : 12)) {
          if (est.carga) { est.carga.removeFromParent(); est.carga.traverse((q) => q.geometry?.dispose()); est.carga = null; }
          for (const s of sobreCabeca.children.slice()) { sobreCabeca.remove(s); s.material.dispose(); }
          levando = []; reagir(dest); avancar(); return;
        }
        if (!v && E.aPe && Math.hypot(p.x - dx2, p.z - dz2) < 4) avisar(nomeDe(E.ate), E.aPe, E.vozAPe, 7);
      }
    }
    if (E.tipo === "apagar") {
      let falta = 0;
      for (const f of est.fogos) {
        const vis = Math.hypot(p.x - f.x, p.z - f.z) < raio() + 10; f.g.visible = vis;
        if (f.apagado) { if (f.fumaca > 0) { f.fumaca -= dt; f.g.userData.fumaca.position.y = 1.2 + (2 - f.fumaca) * 0.5; f.g.userData.fumaca.visible = f.fumaca > 0; } continue; }
        falta++;
        const resta = Math.max(0.12, 1 - f.agua / 1.2);
        f.g.userData.chamas.children.forEach((c, i) => c.scale.set(resta * (1 + Math.sin(t * 12 + i) * 0.12), resta * (1 + Math.sin(t * 9 + i * 2) * 0.2), resta * (1 + Math.cos(t * 11 + i) * 0.12)));
        // a pé, esperando pertinho, a água sai sozinha (para os pequenos)
        if (!v && Math.hypot(p.x - f.x, p.z - f.z) < 3.6) { f.perto += dt; if (f.perto > 3) f.jato = Math.max(f.jato, 0.1); } else f.perto = 0;
        // caminhão de bombeiro com o jato ligado, de frente para o foguinho
        if (v?.jatoLigado) { const fx = Math.sin(v.ang), fz = Math.cos(v.ang), ex = f.x - v.pos.x, ez = f.z - v.pos.z, d = Math.hypot(ex, ez); if (d < 12 && (ex * fx + ez * fz) / (d || 1) > 0.5) { f.agua += dt * 0.9; if (Math.random() < 0.8) soltarGota(_de.set(v.pos.x + fx * v.comp, 2.2, v.pos.z + fz * v.comp), _para.set(f.x, 1.2, f.z)); } }
        if (f.jato > 0) { f.jato -= dt; f.agua += dt; if (Math.random() < 0.8) soltarGota(_de.set(p.x, 1.3, p.z), _para.set(f.x, 1.2, f.z)); }
        if (f.agua >= 1.2) {
          f.apagado = true; f.g.userData.chamas.visible = false; f.fumaca = 2; f.g.userData.fumaca.visible = true; falta--;
          const k = est.fogos.filter((q) => q.apagado).length;
          sons.moeda?.(); if (E.voz) falar(E.voz); dizer(ativa.npcs[ativa.quem].nome, `${E.fala ?? "Fogo apagado!"} (${k} de ${est.fogos.length})`, 2600);
        }
      }
      if (!falta) { avancar(); return; }
    }
    if (E.tipo === "orar" && !est.orando && !v && ctx.orar && Math.hypot(p.x - E.tapete[0], p.z - E.tapete[1]) < 1.3) {
      // no tapete: começa a oração (jogo.js cuida da tela, da pose e das vozes); no fim, o Tio comemora
      est.orando = true;
      const M = ativa;
      ctx.orar({ x: E.tapete[0], z: E.tapete[1], olhar: E.olhar }, () => { if (ativa === M && est.orando) { reagir(npcDe(ativa, E.ate)); avancar(); } });
    }
    if (E.tipo === "pistas") {
      est.baus.forEach((b, i) => {
        if (i !== est.i) return;
        b.g.visible = Math.hypot(p.x - b.x, p.z - b.z) < raio() + 5;
        if (b.aberto) { b.aberto = Math.min(1, b.aberto + dt * 2.5); b.g.userData.tampa.rotation.x = -1.6 * b.aberto; }
        else b.g.position.y = 0.03 + Math.abs(Math.sin(t * 3)) * 0.12;
      });
    }
  }
  function alvoNovo(E) {
    const npcAlvo = (id) => { const n = npcDe(ativa, id), [x, z] = n.fixo ? npcPos(n) : n.casa; return { x, z, emoji: ativa.icone }; };
    if (E.tipo === "achar" || E.tipo === "seguirVarios") {
      const falta = pendentes(E);
      if (!falta.length) return npcAlvo(E.ate);
      const p = pos(), n = falta.map((id) => npcDe(ativa, id)).sort((a, b) => Math.hypot(a.g.position.x - p.x, a.g.position.z - p.z) - Math.hypot(b.g.position.x - p.x, b.g.position.z - p.z))[0];
      return { x: n.g.position.x, z: n.g.position.z, emoji: E.tipo === "achar" ? "🐱" : "💌" };
    }
    if (E.tipo === "contar") return { ...npcAlvo(E.ate), emoji: "🦆" };
    if (E.tipo === "bandeiras") { const b = est.porticos[est.prox]; return b ? { x: b.x, z: b.z, emoji: String(est.prox + 1) } : null; }
    if (E.tipo === "levarVeiculo") return est.carregado ? { ...npcAlvo(E.ate), emoji: E.pousar ? "🚁" : "📦" } : { ...npcAlvo(E.de), emoji: "📦" };
    if (E.tipo === "apagar") { const p = pos(), f = est.fogos.filter((q) => !q.apagado).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; return f ? { x: f.x, z: f.z, emoji: "🔥" } : null; }
    if (E.tipo === "pistas") { const b = est.baus[est.i]; return b ? { x: b.x, z: b.z, emoji: "🗝️" } : null; }
    if (E.tipo === "entregar") { const p = pos(); const n = E.entregas.filter((en) => !est.feitas.has(en.item)).map((en) => npcDe(ativa, en.ate)).sort((a, b) => Math.hypot(npcPos(a)[0] - p.x, npcPos(a)[1] - p.z) - Math.hypot(npcPos(b)[0] - p.x, npcPos(b)[1] - p.z))[0]; if (!n) return null; const [x, z] = npcPos(n); return { x, z, emoji: "✉️" }; }
    if (E.tipo === "voltar") return npcAlvo(E.ate);
    if (E.tipo === "orar") return { x: E.tapete[0], z: E.tapete[1], emoji: "🙏" };
    if (E.tipo === "evento") { const l = lugar(E.lugar); return l ? { x: l.x, z: l.z, emoji: "🚪" } : null; }
    if (E.tipo === "escolherCarro") { const p = pos(), vg = ctx.patioJE?.vagas.filter((q, i) => !ctx.patioJE.escolhidos.includes(i)).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; return vg ? { x: vg.x, z: vg.z, emoji: "🚗" } : null; }
    if (E.tipo === "levarVeiculo" && E.veiculos === "escolhido" && carroEscolhido && veiculoAtual() !== carroEscolhido) return { x: carroEscolhido.pos.x, z: carroEscolhido.pos.z, emoji: "🔑" };
    return undefined;
  }
  function textoNovo(E) {
    if (!E) return "";
    const n = (E.bichos ?? E.quem ?? []).length, k = est.juntos?.size ?? 0;
    if (E.tipo === "achar") return k < n ? `Ache os gatinhos: ${k} de ${n}` : `Leve todos até ${nomeDe(E.ate)}`;
    if (E.tipo === "seguirVarios") return k < n ? `Convide os amigos: ${k} de ${n}` : `Leve todos até ${nomeDe(E.ate)}`;
    if (E.tipo === "contar") return "Conte os patinhos do lago e pise no número certo";
    if (E.tipo === "bandeiras") return est.prox === 0 ? (veiculoAtual() ? "Passe por baixo da bandeira 1" : "Pegue um carro e vá até a bandeira 1") : `Bandeira ${est.prox + 1} de ${E.pontos.length} · ⏱️ ${Math.floor(est.t - est.t0)} s`;
    if (E.tipo === "levarVeiculo") return !est.carregado ? `Venha de carro buscar a ${E.carga.nome}` : E.pousar ? `Voe e pouse perto de ${nomeDe(E.ate)}` : `Leve de carro até ${nomeDe(E.ate)}`;
    if (E.tipo === "apagar") return `Apague os foguinhos: ${est.fogos.filter((f) => f.apagado).length} de ${est.fogos.length}`;
    if (E.tipo === "pistas") return `Pista ${est.i + 1} de ${E.pistas.length}: ache o baú`;
    if (E.tipo === "entregar") return `Entregue as cartas: ${est.feitas.size} de ${E.entregas.length}`;
    if (E.tipo === "voltar") return `Volte e conte para ${nomeDe(E.ate)}`;
    if (E.tipo === "evento") return E.texto;
    if (E.tipo === "escolherCarro") return "Entre no pátio e escolha o seu carro";
    if (E.tipo === "levarVeiculo" && E.veiculos === "escolhido") return veiculoAtual() === carroEscolhido ? `Saia pelo portão e leve o carro até ${nomeDe(E.ate)}` : "Entre no seu carro novo";
    if (E.tipo === "orar") return est.orando ? "Orando juntos o Pai Nosso 🙏" : "Pise no tapete azul na porta da igreja";
    return "";
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
    // estado da etapa atual (testes): fila, contagem, bandeiras, carga, foguinhos, baús, entregas
    get naMao() { return naMao?.userData.item ?? null; },
    get carroNovo() { return carroEscolhido ? { cor: carroEscolhido.cor, x: carroEscolhido.pos.x, z: carroEscolhido.pos.z } : null; },
    // algo aconteceu lá dentro de um lugar (embrulhou o presente, terminou o treino): a etapa "evento" anda
    evento(nome, dados = {}) {
      const E = ativa?.etapas[etapa];
      if (!E || E.tipo !== "evento" || E.evento !== nome) return false;
      if (E.item) {
        // na mão (objeto 3D, ex.: o alvará) ou na cabeça (figurinha)
        if (!(E.item.objeto && segurar(E.item.objeto))) { const s = spriteEmoji(E.item.emoji, 0.6); s.position.set(0, 0, 0); s.userData.item = E.item.id; sobreCabeca.add(s); }
        levando.push(E.item.id);
      }
      est.dados = dados; sons.moeda?.(); avancar(); return true;
    },
    etapaInfo: () => ({ tipo: ativa?.etapas[etapa]?.tipo ?? null, fila: fila.map((n) => n.id), juntos: [...(est.juntos ?? [])], n: est.n, placas: est.placas?.map((q) => ({ n: q.n, x: q.x, z: q.z })), prox: est.prox,
      carregado: est.carregado, fogos: est.fogos?.map((f) => ({ x: f.x, z: f.z, apagado: f.apagado })), bau: est.baus?.[est.i] ? { x: est.baus[est.i].x, z: est.baus[est.i].z, i: est.i } : null,
      entregues: [...(est.feitas ?? [])], patosVisiveis: est.patos?.filter((q) => q.p.visible).length }),
  };
  return api;
}
