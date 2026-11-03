// Rabiscolândia: a casa decorável em 3D. Um interior só (sala e quarto), montado longe da cidade (z = 1000) e visto em
// corte (sem teto, frente baixinha), como as outras casas. A grade de decorar é a de casa-dados.js (quadradinhos de 0,5 m).
//
//   const casa = montarCasa();     // { grupo, solidos, porta, entrada, origem, ... }
//   casa.mostrarMoveis(lista, data)  // junta os móveis postos numa malha por material (poucas chamadas de desenho)
//   casa.papel(id) · casa.piso(id) · casa.grade(true|false) · casa.solidosMoveis(lista)
//   fazerMovel(id, cor, variante)  // o grupo de um móvel (frente para +z, chão em y = 0), já no tamanho dos quadradinhos
//   miniatura(r3, id, cor, variante) → dataURL (a figurinha do catálogo)

import { THREE, mat, malha, caixa, caixaRedonda, MAT, mesclar, texturaCanvas, matNovo } from "./base3d.js";
import { claro, escuro } from "./blocos.js";
import { movel } from "./moveis.js";
import { GRADE, DIVISORIA, PORTA_RUA, itemCasa, pegada, centroDe, celulaBloqueada, naEpoca, PAPEL_PADRAO, PISO_PADRAO } from "./casa-dados.js";

export const ORIGEM_CASA = [-120, 0, 1000];
const ALT = 3, ESP = 0.3, BRANCO = 0xfffdf6, MADEIRA = 0xc98a4b, MADEIRA_ESCURA = 0x8a5a32;
const L = { x0: GRADE.x0, x1: GRADE.x0 + GRADE.colunas * GRADE.passo, z0: GRADE.z0, z1: GRADE.z0 + GRADE.linhas * GRADE.passo };
const XD = GRADE.x0 + (DIVISORIA.coluna + 0.5) * GRADE.passo; // meio da parede do meio (x = 1,25)
const ZP = [GRADE.z0 + DIVISORIA.passagem[0] * GRADE.passo, GRADE.z0 + (DIVISORIA.passagem[1] + 1) * GRADE.passo]; // passagem do meio
const hex = (c) => `#${c.toString(16).padStart(6, "0")}`;

// ------------------------------------------------------------------ texturas de parede e piso (1 m por ladrilho)
const texturas = new Map();
export function texturaDe(id) {
  if (texturas.has(id)) return texturas.get(id);
  const it = itemCasa(id), [a, b] = it.cores;
  const t = texturaCanvas(256, 256, (c, w, h) => {
    c.fillStyle = hex(a); c.fillRect(0, 0, w, h);
    c.fillStyle = hex(b);
    if (it.padrao === "liso") { c.globalAlpha = 0.35; for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 3, h); }
    else if (it.padrao === "listras") for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 30, h);
    else if (it.padrao === "bolinhas") for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.beginPath(); c.arc(32 + x * 64 + (y % 2) * 32, 32 + y * 64, 11, 0, 7); c.fill(); }
    else if (it.padrao === "estrelas") for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) estrela(c, 64 + x * 128 + (y % 2) * 64, 64 + y * 128, 22);
    else if (it.padrao === "tabuas") { // tábuas de 0,5 m (a junta cai na linha da grade)
      for (let y = 0; y < 4; y++) { c.fillStyle = y % 2 ? hex(b) : hex(a); c.fillRect(0, y * 64, w, 64); c.fillStyle = hex(escuro(b, 0.86)); c.fillRect(0, y * 64 + 61, w, 3); c.fillRect(((y * 3) % 4) * 64 + 20, y * 64, 3, 64); }
    } else if (it.padrao === "placas") {
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { c.fillStyle = (x + y) % 2 ? hex(b) : hex(a); c.fillRect(x * 128, y * 128, 128, 128); c.strokeStyle = hex(escuro(b, 0.85)); c.lineWidth = 4; c.strokeRect(x * 128 + 2, y * 128 + 2, 124, 124); }
    } else if (it.padrao === "xadrez") for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { c.fillStyle = (x + y) % 2 ? hex(b) : hex(a); c.fillRect(x * 128, y * 128, 128, 128); }
    c.globalAlpha = 1;
  }, { repetir: true });
  texturas.set(id, t);
  return t;
}
function estrela(c, x, y, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fill(); }
const materiais = new Map();
const matTextura = (id) => { if (!materiais.has(id)) materiais.set(id, matNovo({ map: texturaDe(id) })); return materiais.get(id); };
// plano com uv em metros (o desenho repete a cada 1 m, sem esticar)
function plano(w, h, material) { const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h); const m = new THREE.Mesh(g, material); m.receiveShadow = true; return m; }

// ------------------------------------------------------------------ o interior
export function montarCasa() {
  const [ox, , oz] = ORIGEM_CASA;
  const g = new THREE.Group(); g.position.set(ox, 0, oz);
  const fixo = new THREE.Group(); g.add(fixo);
  const solidosL = [];
  const bloco = (w, h, d, cor, x, y, z, solido = false, sombra = true) => { const b = caixa(w, h, d, mat(cor), { sombra }); b.position.set(x, y, z); fixo.add(b); if (solido) solidosL.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y1: y + h / 2 }); return b; };
  // gramado em volta, calçadinha na porta
  const grama = malha(new THREE.PlaneGeometry(60, 50), mat(0x59b64c), { sombra: false }); grama.rotation.x = -Math.PI / 2; grama.position.y = -0.02; fixo.add(grama);
  bloco(1.8, 0.04, 2.2, 0xe8e2d6, PORTA_RUA.x, 0.0, L.z1 + 1.3, false, false);
  // paredes: fundo, lados, frente baixinha com o vão da porta, parede do meio (alta no fundo, baixinha na frente)
  const COR_PAREDE = 0xfff7ea;
  bloco(L.x1 - L.x0 + ESP * 2, ALT, ESP, COR_PAREDE, 0, ALT / 2, L.z0 - ESP / 2, true);
  for (const s of [-1, 1]) bloco(ESP, ALT, L.z1 - L.z0 + ESP, COR_PAREDE, s * (L.x1 + ESP / 2), ALT / 2, (L.z0 + L.z1) / 2 - ESP / 2, true);
  const v0 = PORTA_RUA.x - 0.85, v1 = PORTA_RUA.x + 0.85;
  bloco(v0 - L.x0 + ESP, 0.6, ESP, 0xffffff, (L.x0 - ESP + v0) / 2, 0.3, L.z1 + ESP / 2, true);
  bloco(L.x1 + ESP - v1, 0.6, ESP, 0xffffff, (v1 + L.x1 + ESP) / 2, 0.3, L.z1 + ESP / 2, true);
  for (const x of [v0, v1]) bloco(0.2, 0.9, ESP + 0.06, 0xffcc1f, x, 0.45, L.z1 + ESP / 2); // batentes da porta da rua
  bloco(0.3, ALT, ZP[0] - L.z0, COR_PAREDE, XD, ALT / 2, (L.z0 + ZP[0]) / 2, true);
  bloco(0.3, 1.1, L.z1 - ZP[1], COR_PAREDE, XD, 0.55, (ZP[1] + L.z1) / 2, true);
  bloco(0.44, 0.24, ZP[1] - ZP[0] + 0.44, 0xffcc1f, XD, 2.42, (ZP[0] + ZP[1]) / 2); // verga da passagem
  bloco(0.44, 2.3, 0.2, 0xffcc1f, XD, 1.15, ZP[0] - 0.1); bloco(0.44, 1.2, 0.2, 0xffcc1f, XD, 0.6, ZP[1] + 0.1);
  // cimalha em cima das paredes altas e rodapé por dentro
  bloco(L.x1 - L.x0 + ESP * 2 + 0.1, 0.18, ESP + 0.1, 0xffcc1f, 0, ALT + 0.06, L.z0 - ESP / 2, false, false);
  for (const s of [-1, 1]) bloco(ESP + 0.1, 0.18, L.z1 - L.z0 + ESP, 0xffcc1f, s * (L.x1 + ESP / 2), ALT + 0.06, (L.z0 + L.z1) / 2 - ESP / 2, false, false);
  bloco(L.x1 - L.x0, 0.18, 0.05, BRANCO, 0, 0.09, L.z0 + 0.025, false, false);
  for (const s of [-1, 1]) bloco(0.05, 0.18, L.z1 - L.z0, BRANCO, s * (L.x1 - 0.025), 0.09, 0, false, false);
  // janelas nas paredes dos lados (a do fundo fica livre para os quadros e a guirlanda)
  const janela = (x, z, rot) => {
    const j = new THREE.Group(); j.position.set(x, 1.75, z); j.rotation.y = rot; fixo.add(j);
    const moldura = caixa(1.5, 1.3, 0.1, mat(0xffffff)); j.add(moldura);
    const vidro = caixa(1.3, 1.1, 0.06, MAT.janela, { sombra: false }); vidro.position.z = 0.03; j.add(vidro);
    for (const [w, h] of [[0.08, 1.1], [1.3, 0.08]]) { const t = caixa(w, h, 0.05, mat(0xffffff), { sombra: false }); t.position.z = 0.07; j.add(t); }
    const peit = caixa(1.6, 0.1, 0.25, mat(0xffcc1f), { sombra: false }); peit.position.set(0, -0.7, 0.1); j.add(peit);
  };
  janela(L.x0 + 0.06, -1.6, Math.PI / 2); janela(L.x0 + 0.06, 1.8, Math.PI / 2); janela(L.x1 - 0.06, -0.6, -Math.PI / 2);
  // tapetinho de entrada
  bloco(1.4, 0.03, 0.6, 0xec2e8c, PORTA_RUA.x, 0.03, L.z1 - 0.45, false, false);
  mesclar(fixo);

  // papel de parede (por dentro: fundo, lados e os dois lados da parede do meio) e piso: trocam de material
  const papelG = new THREE.Group(); g.add(papelG);
  const pp = (w, h, x, y, z, rot) => { const p = plano(w, h, matTextura(PAPEL_PADRAO)); p.position.set(x, y, z); p.rotation.y = rot; papelG.add(p); };
  const hp = ALT - 0.18, yp = 0.18 + hp / 2;
  pp(XD - 0.15 - L.x0, hp, (L.x0 + XD - 0.15) / 2, yp, L.z0 + 0.005, 0);
  pp(L.x1 - XD - 0.15, hp, (XD + 0.15 + L.x1) / 2, yp, L.z0 + 0.005, 0);
  pp(L.z1 - L.z0, hp, L.x0 + 0.005, yp, 0, Math.PI / 2);
  pp(L.z1 - L.z0, hp, L.x1 - 0.005, yp, 0, -Math.PI / 2);
  for (const s of [-1, 1]) pp(ZP[0] - L.z0, hp, XD + s * 0.155, yp, (L.z0 + ZP[0]) / 2, s * Math.PI / 2);
  mesclar(papelG);
  const piso = plano(L.x1 - L.x0, L.z1 - L.z0, matTextura(PISO_PADRAO)); piso.rotation.x = -Math.PI / 2; piso.position.set((L.x0 + L.x1) / 2, 0.02, (L.z0 + L.z1) / 2); g.add(piso);

  // grade de decorar: linhas brancas e os quadradinhos que ficam sempre livres (passagens) em listrinhas
  const S = 32;
  const texGrade = texturaCanvas(GRADE.colunas * S, GRADE.linhas * S, (c) => {
    for (let i = 0; i < GRADE.colunas; i++) for (let k = 0; k < GRADE.linhas; k++) {
      if (celulaBloqueada(i, k)) { c.fillStyle = "rgba(255,90,90,0.28)"; c.fillRect(i * S, k * S, S, S); }
      c.strokeStyle = "rgba(255,255,255,0.75)"; c.lineWidth = 2; c.strokeRect(i * S + 1, k * S + 1, S - 2, S - 2);
    }
  }, { anisotropia: 4 });
  const grade = new THREE.Mesh(new THREE.PlaneGeometry(L.x1 - L.x0, L.z1 - L.z0), new THREE.MeshBasicMaterial({ map: texGrade, transparent: true, depthWrite: false }));
  grade.rotation.x = -Math.PI / 2; grade.position.set(0, 0.035, 0); grade.visible = false; grade.renderOrder = 2; g.add(grade);
  // marcador do lugar (verde = cabe, vermelho = não cabe, amarelo = cursor) no chão ou na parede
  const texMarca = texturaCanvas(64, 64, (c, w, h) => { c.fillStyle = "rgba(255,255,255,0.45)"; c.fillRect(0, 0, w, h); c.strokeStyle = "#fff"; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); });
  const marca = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texMarca, color: 0x58c43a, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  marca.visible = false; marca.renderOrder = 3; g.add(marca);

  const moveisG = new THREE.Group(); g.add(moveisG);
  const soltos = new THREE.Group(); g.add(soltos); // o móvel que está na mão (não entra na mesclagem)
  const solidos = solidosL.map((s) => ({ x0: s.x0 + ox, x1: s.x1 + ox, z0: s.z0 + oz, z1: s.z1 + oz, y1: s.y1 }));
  const liberar = (o) => o.traverse((q) => { if (q.isMesh && q.geometry && !q.geometry.userData.compartilhada) q.geometry.dispose(); });
  const casa = {
    id: "M", grupo: g, solidos, origem: [ox, oz], moveisG, soltos, marca, gradeMalha: grade,
    entrada: [ox + PORTA_RUA.x, oz + L.z1 - 2.4], porta: [ox + PORTA_RUA.x, oz + L.z1 - 0.4],
    centro: [ox, oz], limites: { ...L },
    papelAtual: PAPEL_PADRAO, pisoAtual: PISO_PADRAO,
    papel(id) { const m = matTextura(itemCasa(id)?.tipo === "papel" ? id : PAPEL_PADRAO); papelG.traverse((o) => { if (o.isMesh) o.material = m; }); casa.papelAtual = id; },
    piso(id) { piso.material = matTextura(itemCasa(id)?.tipo === "piso" ? id : PISO_PADRAO); casa.pisoAtual = id; },
    grade(sim) { grade.visible = sim; },
    // os móveis postos (menos o índice `exceto`, que está na mão) numa malha por material
    mostrarMoveis(lista, data = new Date(), exceto = -1) {
      for (const o of [...moveisG.children]) { o.removeFromParent(); liberar(o); }
      lista.forEach((p, n) => {
        if (n === exceto || !naEpoca(itemCasa(p.id), data)) return;
        const m = fazerMovel(p.id, p.cor, p.variante); colocarNoLugar(m, p); moveisG.add(m);
      });
      return mesclar(moveisG);
    },
    // colisão dos móveis de chão (tapete e parede não batem), em coordenadas do mundo
    solidosMoveis(lista, data = new Date(), exceto = -1) {
      const out = [];
      lista.forEach((p, n) => {
        const it = itemCasa(p.id); if (n === exceto || !it || it.camada !== "movel" || !naEpoca(it, data)) return;
        const [w, d] = pegada(it, p.rot), x0 = GRADE.x0 + p.gx * GRADE.passo, z0 = GRADE.z0 + p.gz * GRADE.passo;
        out.push({ x0: ox + x0 + 0.06, x1: ox + x0 + w * GRADE.passo - 0.06, z0: oz + z0 + 0.06, z1: oz + z0 + d * GRADE.passo - 0.06, y1: 1.6 });
      });
      return out;
    },
    // o móvel na mão: um grupo só, solto (anda e gira com suavidade em casa-decorar.js)
    pegar(p) { casa.soltar(); const m = fazerMovel(p.id, p.cor, p.variante); colocarNoLugar(m, p); soltos.add(m); return m; },
    soltar() { for (const o of [...soltos.children]) { o.removeFromParent(); liberar(o); } },
    // marcador: { p, estado: "ok" | "nao" | "cursor" } ou null
    marcar(info) {
      if (!info) { marca.visible = false; return; }
      const it = itemCasa(info.p.id);
      const [w, d] = it ? pegada(it, info.p.rot ?? 0) : [1, 1], parede = it?.camada === "parede";
      const [cx, cz] = it ? centroDe(info.p) : [GRADE.x0 + (info.p.gx + 0.5) * GRADE.passo, GRADE.z0 + (info.p.gz + 0.5) * GRADE.passo];
      marca.visible = true;
      marca.material.color.setHex(info.estado === "ok" ? 0x58c43a : info.estado === "nao" ? 0xff3b3b : 0xffcc1f);
      if (parede) { marca.rotation.set(0, 0, 0); marca.scale.set(w * GRADE.passo, 1.3, 1); marca.position.set(cx, 1.65, L.z0 + 0.02); }
      else { marca.rotation.set(-Math.PI / 2, 0, 0); marca.scale.set(w * GRADE.passo, d * GRADE.passo, 1); marca.position.set(cx, 0.045, cz); }
    },
  };
  return casa;
}
// põe o grupo do móvel no lugar dele (centro dos quadradinhos; parede: encostado no fundo)
export function colocarNoLugar(m, p) {
  const it = itemCasa(p.id), [x, z] = centroDe(p);
  m.position.set(x, 0, it.camada === "parede" ? GRADE.z0 + 0.02 : z);
  m.rotation.y = it.camada === "parede" ? 0 : -(p.rot ?? 0) * Math.PI / 2;
  return m;
}

// ------------------------------------------------------------------ os móveis
const DE_MOVEIS = { cama: "cama", beliche: "beliche", escrivaninha: "estudo", sofa: "sofa", poltrona: "poltrona", estante: "estante", piano: "piano", tapete: "tapete", abajur: "abajur", vaso: "planta", quadro: "quadro-versiculo", "bau-brinquedos": "bau", cavalinho: "cavalinho", aquario: "aquario" };
const FOGO = [0xff7a00, 0xffcc1f, 0xe8413c].map((c) => matNovo({ color: c, emissive: c, emissiveIntensity: 0.6 }));
const novoG = (w, d) => { const g = new THREE.Group(); g.userData.pegada = [w, d]; return g; };
const cx = (g, w, h, d, cor, x, y, z, sombra = true) => { const b = caixa(w, h, d, typeof cor === "number" ? mat(cor) : cor, { sombra }); b.position.set(x, y, z); g.add(b); return b; };
const perna = (g, x, z, h, cor = MADEIRA_ESCURA, r = 0.05) => cx(g, r * 1.8, h, r * 1.8, cor, x, h / 2, z);
const NOVOS = {
  mesa(cor) {
    const g = novoG(1.4, 0.9);
    cx(g, 1.4, 0.1, 0.9, cor, 0, 0.75, 0); cx(g, 1.3, 0.04, 0.8, claro(cor, 0.25), 0, 0.815, 0, false);
    for (const [x, z] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]]) perna(g, x, z, 0.72, escuro(cor, 0.75));
    cx(g, 0.5, 0.03, 0.3, 0xffffff, -0.25, 0.83, 0.05, false); // toalhinha
    const f = cx(g, 0.14, 0.14, 0.14, 0xe8413c, 0.3, 0.88, 0); f.rotation.y = 0.5; cx(g, 0.1, 0.1, 0.1, 0xffcc1f, 0.42, 0.86, 0.12);
    return g;
  },
  cadeira(cor) {
    const g = novoG(0.46, 0.46);
    cx(g, 0.44, 0.07, 0.44, cor, 0, 0.45, 0); cx(g, 0.44, 0.5, 0.06, cor, 0, 0.72, -0.19);
    cx(g, 0.3, 0.06, 0.07, claro(cor, 0.3), 0, 0.85, -0.15, false);
    for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) perna(g, x, z, 0.44, escuro(cor, 0.7), 0.03);
    return g;
  },
  pufe(cor) {
    const g = novoG(0.5, 0.5);
    cx(g, 0.46, 0.36, 0.46, cor, 0, 0.18, 0); cx(g, 0.5, 0.1, 0.5, claro(cor, 0.25), 0, 0.4, 0); cx(g, 0.12, 0.03, 0.12, escuro(cor, 0.7), 0, 0.46, 0, false);
    return g;
  },
  "cama-pet"(cor) {
    const g = novoG(0.95, 0.85);
    cx(g, 0.95, 0.12, 0.85, cor, 0, 0.06, 0);
    cx(g, 0.95, 0.3, 0.14, cor, 0, 0.2, -0.36); for (const s of [-1, 1]) cx(g, 0.14, 0.24, 0.7, cor, s * 0.41, 0.17, 0.02);
    cx(g, 0.66, 0.1, 0.6, 0xfff4e0, 0, 0.16, 0.04);
    cx(g, 0.18, 0.05, 0.18, 0x00b5f0, -0.24, 0.22, 0.2); // potinho
    // gatinho dormindo, enroladinho
    cx(g, 0.42, 0.16, 0.3, 0xffb066, 0.02, 0.29, -0.04); cx(g, 0.2, 0.17, 0.18, 0xffb066, 0.2, 0.3, 0.08);
    for (const s of [-1, 1]) cx(g, 0.05, 0.07, 0.04, 0xff9a3d, 0.2 + s * 0.06, 0.41, 0.08, false);
    cx(g, 0.34, 0.07, 0.08, 0xff9a3d, -0.02, 0.24, 0.13, false); cx(g, 0.12, 0.03, 0.02, 0x151515, 0.2, 0.32, 0.175, false);
    return g;
  },
  cristaleira(cor) {
    const g = novoG(1.3, 0.48);
    cx(g, 1.3, 0.8, 0.46, cor, 0, 0.4, 0); cx(g, 1.3, 1.1, 0.4, cor, 0, 1.35, -0.03); cx(g, 1.4, 0.1, 0.5, escuro(cor, 0.85), 0, 1.95, -0.02);
    const vidro = cx(g, 1.14, 0.95, 0.04, MAT.vidro, 0, 1.35, 0.18, false); void vidro;
    cx(g, 1.14, 0.04, 0.3, 0xffffff, 0, 1.3, -0.02, false);
    const louca = [0xffffff, 0x00b5f0, 0xec2e8c, 0xffcc1f];
    for (let i = 0; i < 4; i++) { cx(g, 0.18, 0.18, 0.04, louca[i], -0.42 + i * 0.28, 1.45, -0.12, false); cx(g, 0.12, 0.12, 0.12, louca[(i + 2) % 4], -0.42 + i * 0.28, 0.98, 0, false); }
    for (const s of [-1, 1]) { cx(g, 0.6, 0.6, 0.02, escuro(cor, 0.9), s * 0.32, 0.42, 0.235, false); cx(g, 0.06, 0.06, 0.04, 0xffcc1f, s * 0.08, 0.45, 0.25, false); }
    return g;
  },
  "tapete-listras"(cor) {
    const g = novoG(1.9, 1.4);
    cx(g, 1.9, 0.03, 1.4, 0xfff4e0, 0, 0.02, 0, false);
    for (let i = 0; i < 4; i++) cx(g, 1.9, 0.035, 0.18, i % 2 ? claro(cor, 0.4) : cor, 0, 0.022, -0.45 + i * 0.3, false);
    for (let i = 0; i < 8; i++) for (const s of [-1, 1]) cx(g, 0.05, 0.02, 0.1, cor, -0.84 + i * 0.24, 0.015, s * 0.74, false);
    return g;
  },
  samambaia(cor) {
    const g = novoG(0.9, 0.9);
    cx(g, 0.6, 0.5, 0.6, cor, 0, 0.25, 0); cx(g, 0.68, 0.1, 0.68, escuro(cor, 0.85), 0, 0.52, 0); cx(g, 0.5, 0.05, 0.5, 0x6b4a2c, 0, 0.575, 0, false);
    const folha = [0x3ea83a, 0x58c43a, 0x2f8f2c];
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, f = cx(g, 0.16, 0.7 + (i % 3) * 0.15, 0.16, folha[i % 3], Math.cos(a) * 0.18, 0.95 + (i % 2) * 0.1, Math.sin(a) * 0.18); f.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); }
    cx(g, 0.2, 0.9, 0.2, 0x4cb83f, 0, 1.05, 0);
    return g;
  },
  "arvore-natal"(cor) {
    const g = novoG(0.95, 0.95);
    cx(g, 0.5, 0.35, 0.5, 0xe8413c, 0, 0.175, 0); cx(g, 0.56, 0.06, 0.56, 0xffcc1f, 0, 0.36, 0, false);
    cx(g, 0.14, 0.2, 0.14, MADEIRA_ESCURA, 0, 0.48, 0);
    [[0.9, 0.4, 0.62], [0.7, 0.36, 0.95], [0.5, 0.32, 1.25], [0.3, 0.28, 1.5]].forEach(([w, h, y], i) => cx(g, w, h, w, i % 2 ? escuro(cor, 0.85) : cor, 0, y, 0));
    const bolas = [0xe8413c, 0xffcc1f, 0x00b5f0, 0xec2e8c, 0xffffff];
    [[0.42, 0.62, 0.2], [-0.4, 0.66, -0.1], [0.1, 0.62, 0.44], [0.32, 0.95, -0.2], [-0.25, 0.98, 0.3], [0.2, 1.25, 0.24], [-0.2, 1.22, -0.18]].forEach(([x, y, z], i) => cx(g, 0.1, 0.1, 0.1, bolas[i % 5], x, y, z, false));
    const e = cx(g, 0.2, 0.2, 0.06, MAT.lampada, 0, 1.76, 0, false); e.rotation.z = Math.PI / 4;
    for (const [x, z, c] of [[0.36, 0.3, 0x00b5f0], [-0.34, 0.32, 0xec2e8c]]) { cx(g, 0.24, 0.2, 0.24, c, x, 0.1, z); cx(g, 0.26, 0.05, 0.05, 0xffcc1f, x, 0.2, z, false); }
    return g;
  },
  guirlanda(cor) {
    const g = novoG(0.9, 0.12);
    const n = 12, R = 0.36;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; cx(g, 0.2, 0.2, 0.1, i % 2 ? 0x2f9e44 : 0x1f7a3a, Math.cos(a) * R, 1.85 + Math.sin(a) * R, 0.06); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; cx(g, 0.07, 0.07, 0.07, i % 2 ? 0xffcc1f : 0xe8413c, Math.cos(a) * R, 1.85 + Math.sin(a) * R, 0.12, false); }
    cx(g, 0.22, 0.14, 0.06, cor, 0, 1.85 - R - 0.05, 0.13, false); for (const s of [-1, 1]) { const f = cx(g, 0.07, 0.22, 0.04, cor, s * 0.08, 1.85 - R - 0.18, 0.13, false); f.rotation.z = s * 0.3; }
    return g;
  },
  lareira(cor) {
    const g = novoG(1.5, 0.48);
    cx(g, 1.5, 1.1, 0.46, cor, 0, 0.55, 0); cx(g, 1.65, 0.12, 0.54, 0xfff4e0, 0, 1.16, 0.02);
    cx(g, 0.8, 0.6, 0.06, 0x2a2a2a, 0, 0.36, 0.22, false);
    FOGO.forEach((m, i) => cx(g, 0.16, 0.26 - i * 0.05, 0.05, m, -0.18 + i * 0.18, 0.2, 0.25, false));
    for (let r = 0; r < 2; r++) cx(g, 1.5, 0.03, 0.47, escuro(cor, 0.85), 0, 0.75 + r * 0.2, 0.001, false); // juntas dos tijolos
    const meias = [0xe8413c, 0x58c43a, 0x00b5f0];
    meias.forEach((c, i) => { const x = -0.45 + i * 0.45; cx(g, 0.16, 0.3, 0.06, c, x, 0.92, 0.29, false); cx(g, 0.24, 0.1, 0.06, c, x + 0.04, 0.78, 0.29, false); cx(g, 0.18, 0.08, 0.07, 0xffffff, x, 1.06, 0.29, false); });
    return g;
  },
};
// o grupo do móvel no tamanho dos quadradinhos dele (os maiores que a pegada encolhem um pouco, sem passar do lugar)
export function fazerMovel(id, cor, variante = 0) {
  const it = itemCasa(id);
  const base = DE_MOVEIS[id] ? movel(DE_MOVEIS[id]).fazer(cor ?? it.cores[0], variante) : NOVOS[id](cor ?? it.cores[0], variante);
  const [pw, pd] = base.userData.pegada ?? [1, 1], [w, d] = it.celulas;
  const k = Math.min(1, (w * GRADE.passo - 0.04) / pw, it.camada === "parede" ? 1 : (d * GRADE.passo - 0.04) / pd);
  const g = new THREE.Group(); g.add(base);
  if (k < 0.999) base.scale.setScalar(k);
  if (it.camada === "parede") base.position.y = (1 - k) * 1.6; // o quadro encolhido continua na altura do olho
  g.userData.id = id;
  return g;
}

// ------------------------------------------------------------------ figurinhas do catálogo (desenhadas uma vez)
const figurinhas = new Map();
let palcoMini = null;
const T = 256;
export function miniatura(r3, id, cor, variante = 0) {
  const it = itemCasa(id); if (!it) return "";
  const k = `${id}|${cor}|${variante}`;
  if (figurinhas.has(k)) return figurinhas.get(k);
  let url = "";
  if (it.tipo) { const img = texturaDe(id).image; const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"); x.drawImage(img, 0, 0, 256, 256, 0, 0, 128, 128); url = c.toDataURL("image/png"); }
  else {
    try {
      if (!palcoMini) {
        const cena = new THREE.Scene();
        cena.add(new THREE.HemisphereLight(0xffffff, 0xb8a890, 1.6));
        const sol = new THREE.DirectionalLight(0xffffff, 1.8); sol.position.set(3, 6, 5); cena.add(sol);
        const alvo = new THREE.WebGLRenderTarget(T, T); alvo.texture.colorSpace = THREE.SRGBColorSpace;
        palcoMini = { cena, cam: new THREE.PerspectiveCamera(30, 1, 0.05, 50), alvo, px: new Uint8Array(T * T * 4) };
      }
      const P = palcoMini, m = fazerMovel(id, cor ?? it.cores[0], variante);
      P.cena.add(m); m.updateMatrixWorld(true);
      const caixa3 = new THREE.Box3().setFromObject(m), c3 = caixa3.getCenter(new THREE.Vector3()), tam = caixa3.getSize(new THREE.Vector3());
      const raio = Math.max(tam.x, tam.y, tam.z) * 0.62 + 0.05, dist = raio / Math.tan((P.cam.fov * Math.PI) / 360);
      const dir = it.camada === "parede" ? new THREE.Vector3(0.18, 0.12, 1) : new THREE.Vector3(0.7, 0.75, 1);
      P.cam.position.copy(c3).addScaledVector(dir.normalize(), dist); P.cam.lookAt(c3);
      const antes = r3.getRenderTarget(), corLimpa = r3.getClearColor(new THREE.Color()), alfa = r3.getClearAlpha();
      r3.setRenderTarget(P.alvo); r3.setClearColor(0x000000, 0); r3.clear(); r3.render(P.cena, P.cam);
      r3.readRenderTargetPixels(P.alvo, 0, 0, T, T, P.px);
      r3.setRenderTarget(antes); r3.setClearColor(corLimpa, alfa);
      P.cena.remove(m); m.traverse((o) => { if (o.isMesh && !o.geometry.userData.compartilhada) o.geometry.dispose(); });
      const c = document.createElement("canvas"); c.width = c.height = T; const x = c.getContext("2d"), dados = x.createImageData(T, T);
      for (let y = 0; y < T; y++) dados.data.set(P.px.subarray((T - 1 - y) * T * 4, (T - y) * T * 4), y * T * 4); // de cabeça para cima
      x.putImageData(dados, 0, 0);
      const f = document.createElement("canvas"); f.width = f.height = T / 2; const fx = f.getContext("2d"); fx.imageSmoothingQuality = "high"; fx.drawImage(c, 0, 0, T / 2, T / 2); // metade do tamanho: borda lisa
      url = f.toDataURL("image/png");
    } catch { url = ""; }
  }
  figurinhas.set(k, url);
  return url;
}
