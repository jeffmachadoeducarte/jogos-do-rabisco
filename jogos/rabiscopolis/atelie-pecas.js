// Rabiscolândia: as peças do Ateliê Ponta do Lápis (a loja de visual, paga em Rabiscoins). Entram no mesmo sistema do
// Meu Rabisco (meu-rabisco.js): cada opção tem id, nome, amostra e monta(rb) → grupos presos nas articulações; as da loja
// também têm `preco` (em Rabiscoins) e `temporada` (null = o ano todo; "natal", "pascoa"... = só aparece na loja na época,
// veja TEMPORADAS em atelie.js; quem já comprou continua tendo).
//
// Slots novos (só na loja): camiseta e chapeu. Slots que já existiam e ganham opções pagas: mochila e oculos.
//  · camiseta: a parte de baixo do lápis (do barrado, 2,3, até a gola, 3,5) é a camiseta do Rabisco. A peça nova é uma
//    "capa" de torno um tiquinho maior que o corpo, por BAIXO do adesivo da logo (que fica a 0,55 do eixo) e sem passar do
//    barrado: a logo, o rosto, a ponta e as proporções nunca mudam. As mangas (rosa) e os punhos (ciano) ganham capas também.
//  · chapeu: bonés de outra cor (só trocam o material do boné e da aba: não custa nada desenhar) e chapéus por cima da
//    ponta do lápis (escondem a aba quando cobririam ela). Uniforme de profissão e capacete da moto mandam na cabeça.
// As capas não fazem sombra (a sombra da peça de baixo já é igual): menos chamadas de desenho.
//
// Para acrescentar uma peça (ex.: roupas de Natal): ponha a opção na lista do slot com { preco, temporada: "natal" } e o
// item aparece sozinho na loja (atelie.js monta o catálogo daqui). Para pintura de veículo, um item em PINTURAS.
//
//   pecasDaLoja(ajudantes) → { camiseta: { nome, icone, original, opcoes }, chapeu: {...}, mochila: { opcoes }, oculos: { opcoes } }

import { THREE as G, toon } from "../../src/motor3d/toon.js";
import { ROUPAS } from "../../src/motor3d/roupas3d.js";

// cores do Rabisco 3D (as mesmas de meu-rabisco.js) e algumas a mais da paleta da escola
const C = { ciano: 0x00bdff, rosa: 0xf14ba8, laranja: 0xff6400, pele: 0xffe5cf, branco: 0xffffff, tinta: 0x151515, escuro: 0x2a2a33, verde: 0x2bb24c, roxo: 0x8e6cff, amarelo: 0xffcc1f, marinho: 0x2f3d8c, dourado: 0xf2b81f };
export const CORES_LOJA = C;

// ---------------------------------------------------------------- camisetas
// o mesmo perfil do lápis (rabisco3d.js), só a parte da camiseta
const PERFIL = [[0.545, 2.2], [0.55, 2.3], [0.54, 3.0], [0.535, 3.48], [0.52, 3.52]];
function raioCorpo(y) {
  for (let i = 1; i < PERFIL.length; i++) { const [r0, y0] = PERFIL[i - 1], [r1, y1] = PERFIL[i]; if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0); }
  return PERFIL.at(-1)[0];
}
const torno = (y0, y1, folga, passos = 12) => {
  const pts = [new G.Vector2(raioCorpo(y0) - 0.02, y0 - 2.15)];
  for (let i = 0; i <= passos; i++) { const y = y0 + ((y1 - y0) * i) / passos; pts.push(new G.Vector2(raioCorpo(y) * folga + 0.001, y - 2.15)); }
  pts.push(new G.Vector2(raioCorpo(y1) - 0.02, y1 - 2.15));
  return new G.LatheGeometry(pts, 48);
};
function capa(geo, cor, pai, { x = 0, y = 0, z = 0 } = {}) {
  const m = new G.Mesh(geo, toon(cor));
  m.castShadow = false; m.receiveShadow = true;
  m.position.set(x, y, z);
  pai.add(m);
  return m;
}
function camiseta(rb, { corpo, manga, punho, listras = null, listraCor = C.branco }) {
  const g = new G.Group(); rb.tronco.add(g);
  capa(torno(2.29, 3.495, 1.012), corpo, g);
  // listras: faixas finas um pouco mais altas, longe da logo (2,95 a 3,29)
  for (const [ya, yb] of listras ?? []) capa(torno(ya, yb, 1.022, 2), listraCor, g);
  const grupos = [g];
  for (const b of [rb.bracoE, rb.bracoD]) {
    const gb = new G.Group(); b.ombro.add(gb); grupos.push(gb);
    capa(new G.CylinderGeometry(0.168, 0.158, 0.505, 20), manga, gb, { y: -0.22 });
    capa(new G.CylinderGeometry(0.164, 0.164, 0.11, 20), punho, gb, { y: -0.51 });
  }
  return grupos;
}

// ---------------------------------------------------------------- chapéus
function pc(geo, cor, pai, { borda = 0.03, x = 0, y = 0, z = 0, comContorno } = {}) {
  const m = new G.Mesh(geo, toon(cor));
  m.castShadow = true;
  if (borda && comContorno) comContorno(m, borda);
  m.position.set(x, y, z);
  pai.add(m);
  return m;
}
const noTronco = (rb, y) => { const g = new G.Group(); g.position.y = y - 2.15; rb.tronco.add(g); return g; };
// boné de outra cor: troca só o material do boné e da aba (os originais ficam guardados em rb.rp.boneOrig)
function trocarBone(rb, cor) {
  if (!rb.bone || !rb.aba) return [];
  rb.rp.boneOrig ??= { bone: rb.bone.material, aba: rb.aba.material };
  const m = toon(cor);
  rb.bone.material = m; rb.aba.material = m;
  return [];
}
function voltarBone(rb) {
  const o = rb.rp?.boneOrig;
  if (!o) return;
  rb.bone.material = o.bone; rb.aba.material = o.aba;
}
// cartola de mágico: aba larga, copa alta (cobre a ponta do lápis), faixa rosa e uma estrelinha
function cartola(rb, ajuda) {
  const g = noTronco(rb, 4.76), b = { comContorno: ajuda.comContorno };
  pc(new G.CylinderGeometry(0.98, 0.98, 0.07, 40), C.escuro, g, { ...b, borda: 0.035 });
  pc(new G.CylinderGeometry(0.64, 0.6, 1.5, 36), C.escuro, g, { ...b, borda: 0.04, y: 0.78 });
  pc(new G.CylinderGeometry(0.645, 0.635, 0.26, 36), C.rosa, g, { ...b, borda: 0, y: 0.22 });
  const estrela = new G.ExtrudeGeometry(ajuda.formaEstrela(0.2), { depth: 0.05, bevelEnabled: false });
  const e = pc(estrela, C.amarelo, g, { ...b, borda: 0.015, y: 0.95, z: 0.63 });
  e.rotation.z = 0.15;
  return [g];
}

export function pecasDaLoja(ajuda) {
  const { mochilaRetangular, oculos, lenteOval, lenteRetangular } = ajuda;
  return {
    camiseta: { nome: "Camiseta", icone: "👕", original: "original", dica: "A logo e o rostinho ficam sempre iguais", opcoes: [
      { id: "original", nome: "Azul original", amostra: [C.ciano, C.rosa] },
      { id: "rosa", nome: "Camiseta rosa", amostra: [C.rosa, C.ciano], preco: 30, monta: (rb) => camiseta(rb, { corpo: C.rosa, manga: C.ciano, punho: C.rosa }) },
      { id: "laranja", nome: "Camiseta laranja", amostra: [C.laranja, C.ciano], preco: 30, monta: (rb) => camiseta(rb, { corpo: C.laranja, manga: C.ciano, punho: C.laranja }) },
      { id: "verde", nome: "Camiseta verde", amostra: [C.verde, C.amarelo], preco: 45, monta: (rb) => camiseta(rb, { corpo: C.verde, manga: C.amarelo, punho: C.verde }) },
      { id: "roxa", nome: "Camiseta roxa", amostra: [C.roxo, C.rosa], preco: 60, monta: (rb) => camiseta(rb, { corpo: C.roxo, manga: C.rosa, punho: C.roxo }) },
      { id: "listrada", nome: "Listrada de marinheiro", amostra: [C.marinho, C.branco], preco: 90, monta: (rb) => camiseta(rb, { corpo: C.marinho, manga: C.branco, punho: C.marinho, listras: [[2.46, 2.53], [2.66, 2.73], [2.84, 2.9], [3.36, 3.42]] }) },
    ] },
    chapeu: { nome: "Chapéu", icone: "🧢", original: "original", dica: "Boné de outra cor ou chapéu por cima", opcoes: [
      { id: "original", nome: "Boné laranja", amostra: [C.laranja, C.laranja] },
      { id: "bone-rosa", nome: "Boné rosa", amostra: [C.rosa, C.rosa], preco: 20, monta: (rb) => trocarBone(rb, C.rosa), desmonta: voltarBone },
      { id: "bone-verde", nome: "Boné verde", amostra: [C.verde, C.verde], preco: 20, monta: (rb) => trocarBone(rb, C.verde), desmonta: voltarBone },
      { id: "bone-roxo", nome: "Boné roxo", amostra: [C.roxo, C.roxo], preco: 35, monta: (rb) => trocarBone(rb, C.roxo), desmonta: voltarBone },
      { id: "chapeu-sol", nome: "Chapéu de sol", amostra: [0xf3d27a, C.rosa], preco: 70, escondeAba: true, monta: (rb) => ROUPAS["chapeu-palha"].monta(rb, {}) },
      { id: "cartola", nome: "Cartola de mágico", amostra: [C.escuro, C.rosa], preco: 120, escondeAba: true, monta: (rb) => cartola(rb, ajuda) },
      { id: "coroa", nome: "Coroa dourada", amostra: [C.amarelo, C.rosa], preco: 200, monta: (rb) => ROUPAS.coroa.monta(rb, {}) },
    ] },
    mochila: { opcoes: [
      { id: "dino", nome: "Mochila dinossauro", amostra: [C.verde, C.laranja], preco: 100, monta: (rb) => [mochilaDino(rb, ajuda)] },
      { id: "foguete", nome: "Mochila foguete", amostra: [C.branco, C.laranja], preco: 180, monta: (rb) => [mochilaFoguete(rb, ajuda)] },
    ] },
    oculos: { opcoes: [
      { id: "grandao", nome: "Óculos grandão", amostra: [0xbfe9ff, C.rosa], preco: 40, monta: (rb) => [oculos(rb, { forma: () => lenteOval(0x9fdcff, C.rosa, { r: 0.25, esticar: 1.1 }), aro: C.rosa })] },
      { id: "tresd", nome: "Óculos 3D", amostra: [0xe8413c, C.ciano], preco: 60, monta: (rb) => { let i = 0; return [oculos(rb, { forma: () => lenteRetangular(i++ % 2 ? 0xe8413c : 0x19c3e6, C.branco), aro: C.branco, brilho: false })]; } },
      { id: "piloto", nome: "Óculos de piloto", amostra: [0x1d2633, C.dourado], preco: 90, monta: (rb) => [oculos(rb, { forma: () => lenteOval(0x24313f, C.dourado, { r: 0.23, esticar: 1.32 }), aro: C.dourado })] },
    ] },
  };
  function mochilaDino(rb, a) {
    const g = mochilaRetangular(rb, { corpo: C.verde, bolso: 0x7ed957, alca: C.laranja });
    // espinhos laranja do alto das costas até embaixo, e um olhinho de cada lado
    const ZM = -0.96;
    [[3.42, 0.2], [3.22, 0.17], [3.02, 0.15], [2.82, 0.13]].forEach(([y, r]) => {
      const e = pc(new G.ConeGeometry(r, r * 1.8, 4), C.laranja, g, { comContorno: a.comContorno, borda: 0.02, y: y - 2.15 + (y === 3.42 ? 0.14 : 0), z: y === 3.42 ? -0.74 : ZM - 0.04 });
      if (y !== 3.42) e.rotation.x = -Math.PI / 2;
    });
    for (const s of [-1, 1]) pc(new G.SphereGeometry(0.05, 10, 8), C.tinta, g, { borda: 0, x: s * 0.24, y: 2.72 - 2.15, z: ZM + 0.01 });
    return g;
  }
  function mochilaFoguete(rb, a) {
    const g = noTronco(rb, 2.15), b = { comContorno: a.comContorno };
    pc(new G.CapsuleGeometry(0.3, 0.75, 6, 18), C.branco, g, { ...b, borda: 0.035, y: 2.75 - 2.15, z: -0.86 });
    pc(new G.ConeGeometry(0.3, 0.42, 18), C.rosa, g, { ...b, borda: 0.03, y: 3.5 - 2.15, z: -0.86 });
    pc(new G.CylinderGeometry(0.17, 0.17, 0.05, 18), C.ciano, g, { ...b, borda: 0.015, y: 2.95 - 2.15, z: -1.13 }).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) {
      const asa = pc(new G.BoxGeometry(0.06, 0.4, 0.32), C.laranja, g, { ...b, borda: 0.02, x: s * 0.33, y: 2.38 - 2.15, z: -0.86 });
      asa.rotation.z = s * 0.35;
      // labareda (laranja e amarela) saindo de baixo
      pc(new G.ConeGeometry(0.11, 0.3, 10), C.amarelo, g, { borda: 0, x: s * 0.13, y: 2.0 - 2.15, z: -0.86 }).rotation.x = Math.PI;
    }
    pc(new G.ConeGeometry(0.17, 0.42, 12), C.laranja, g, { borda: 0, y: 1.95 - 2.15, z: -0.86 }).rotation.x = Math.PI;
    a.alcasDeOmbro(g, C.rosa);
    return g;
  }
}
export { voltarBone };

// ---------------------------------------------------------------- pintura dos veículos
// cor (lataria) e cor2 (detalhe: faixa do helicóptero, borda do barquinho). Valem para o veículo chamado pelo Rabifone.
export const PINTURAS = [
  { id: "carro-verde", veiculo: "carro", nome: "Carro verde-limão", cor: 0x7ed321, preco: 40 },
  { id: "carro-roxo", veiculo: "carro", nome: "Carro roxo", cor: 0x8e6cff, preco: 60 },
  { id: "carro-dourado", veiculo: "carro", nome: "Carro dourado", cor: 0xf2b81f, preco: 160 },
  { id: "moto-azul", veiculo: "moto", nome: "Moto azul", cor: 0x1f7fe0, preco: 60 },
  { id: "barco-rosa", veiculo: "barco", nome: "Barquinho rosa", cor: 0xf59ac0, cor2: 0xffffff, preco: 30 },
  { id: "heli-laranja", veiculo: "heli", nome: "Helicóptero laranja", cor: 0xff7a00, cor2: 0xffcc1f, preco: 120 },
];
export const VEICULOS_PINTAVEIS = { carro: { nome: "Carro", icone: "🚗", original: 0xec2e8c }, moto: { nome: "Moto", icone: "🏍️", original: 0xc8141c }, barco: { nome: "Barquinho", icone: "🚣", original: 0xffcc1f }, heli: { nome: "Helicóptero", icone: "🚁", original: 0x00b5f0 } };
