// Horta do Rabisco (4 e 5 anos, Ciências): a voz pede o que a plantinha precisa (água, sol, terra...)
// ou pergunta sobre a natureza (seres vivos, dia e noite, estações, lixo). A criança toca o objeto 3D
// certo, ele voa até a planta e ela cresce um estágio: semente → broto → folhas → flor → fruto.

import { criarCasca, el } from "../../src/motor/casca.js";
import { sons } from "../../src/motor/sons.js";
import { falar, preCarregarFalas } from "../../src/motor/voz.js";
import { criarPalco3D } from "../../src/motor3d/palco3d.js";
import { THREE, COR3D, peca, toon, aleatorio } from "../../src/motor3d/toon.js";
import { nuvem3D, morro3D, flor3D, cerca3D } from "../../src/motor3d/objetos.js";
import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
import * as O from "./objetos.js";

// ---------------------------------------------------------------- objetos que viram opção
const OBJ = {
  agua: ["água", O.gota], sol: ["sol", O.sol], lua: ["lua", O.lua], estrelas: ["estrelas", O.estrelas],
  pedra: ["pedra", O.pedra], terra: ["terra", O.terra], areia: ["areia", O.areia], gelo: ["gelo", O.gelo],
  regador: ["regador", O.regador], minhoca: ["minhoca", O.minhoca], abelha: ["abelha", O.abelha],
  borboleta: ["borboleta", () => O.borboleta()], joaninha: ["joaninha", O.joaninha], coruja: ["coruja", O.coruja],
  travesseiro: ["travesseiro", O.travesseiro], semente: ["semente", O.semente], broto: ["broto", O.broto],
  flor: ["flor", () => O.flor()], fruto: ["fruto", O.fruto], arvore: ["árvore", O.arvore],
  folha: ["folha laranja", O.folhaLaranja], casaco: ["casaco", O.casaco], bola: ["bola", O.bola],
  sapato: ["sapato", O.sapato], carro: ["carro", O.carro], garrafa: ["garrafa", O.garrafa], lata: ["lata", O.lata],
  papel: ["papel amassado", O.papel], banana: ["casca de banana", O.banana], caixinha: ["caixinha de suco", O.caixinha],
  guarda: ["guarda-chuva", guardaChuva],
};
function guardaChuva() {
  const g = new THREE.Group();
  const copa = peca(new THREE.SphereGeometry(0.48, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), COR3D.roxo, { contorno: 0.05, extra: { side: THREE.DoubleSide } });
  copa.scale.y = 0.6; copa.position.y = 0.12;
  const cabo = peca(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), COR3D.tinta, { contorno: 0 });
  cabo.position.y = -0.1;
  const gancho = peca(new THREE.TorusGeometry(0.08, 0.025, 6, 12, Math.PI), COR3D.tinta, { contorno: 0 });
  gancho.position.set(0.08, -0.45, 0); gancho.rotation.z = Math.PI;
  g.add(copa, cabo, gancho);
  g.rotation.z = 0.2;
  return g;
}

// ---------------------------------------------------------------- climas (céu em CSS, chão, luz e enfeites)
const estrelinhas = (() => {
  const r = aleatorio(11), pts = [];
  for (let i = 0; i < 46; i++) pts.push(`radial-gradient(${r() < 0.3 ? 3 : 2}px ${r() < 0.3 ? 3 : 2}px at ${(r() * 100).toFixed(1)}% ${(r() * 45).toFixed(1)}%, #fff 50%, transparent 52%)`);
  return pts.join(",");
})();
const CLIMAS = {
  manha: { ceu: "linear-gradient(#7fd0ff, #e3f7ff 62%)", chao: 0x62c845, arvore: COR3D.verde, borboletas: 3 },
  ensolarado: { ceu: "linear-gradient(#ffcf5c, #fff4cf 62%)", chao: 0x6cc84a, arvore: 0x7cc63a, borboletas: 2, luz: [0xfff2d0, 2.7] },
  nublado: { ceu: "linear-gradient(#9fbcd3, #eef3f7 62%)", chao: 0x5cb84a, arvore: COR3D.verdeEscuro, nuvens: 8, luz: [0xffffff, 2.0] },
  rosado: { ceu: "linear-gradient(#ffb3d9, #fff0f7 62%)", chao: 0x6fd04f, arvore: 0x7fd85a, flores: 14, borboletas: 2 },
  azul: { ceu: "linear-gradient(#45aefc, #d0efff 62%)", chao: 0x58c43a, arvore: COR3D.verde, flores: 16 },
  noite: {
    ceu: `${estrelinhas}, linear-gradient(#0b1440, #2c3f8f 62%)`, chao: 0x2f6b3a, arvore: 0x2f7a35, nuvens: 0,
    luz: [0xc4ceff, 1.6], hemi: [0x8090d0, 0x2a4a34, 1.35], vagalumes: 14,
  },
  entardecer: { ceu: "linear-gradient(#ff8f6b, #ffe0b0 62%)", chao: 0x6ab842, arvore: 0x5fb33a, luz: [0xffe0c0, 2.3], borboletas: 1 },
  limpo: { ceu: "linear-gradient(#6fc6ff, #ecf9ff 62%)", chao: 0x62c845, arvore: COR3D.verde, flores: 8 },
  outono: { ceu: "linear-gradient(#f7a957, #fde6c6 62%)", chao: 0xa7b03e, arvore: 0xf08a24, morro: 0xc9b24a, particulas: "folhas" },
  inverno: { ceu: "linear-gradient(#a9c3de, #f4f8fc 62%)", chao: 0xe9f2f8, arvore: 0xdbe9f4, morro: 0xf4f8fb, particulas: "neve", luz: [0xeef4ff, 2.0], nuvens: 8 },
  primavera: { ceu: "linear-gradient(#84d2ff, #fde6f3 62%)", chao: 0x6fd04f, arvore: 0xf7a8d0, flores: 18, borboletas: 3 },
  verao: { ceu: "linear-gradient(#2ea4ff, #c4ebff 62%)", chao: 0x58c43a, arvore: COR3D.verde, luz: [0xfff6dc, 2.8], nuvens: 2 },
  chuva: { ceu: "linear-gradient(#72849a, #cbd5df 62%)", chao: 0x4fa83a, arvore: COR3D.verdeEscuro, particulas: "chuva", luz: [0xdfe8f2, 1.8], nuvens: 9 },
  dourado: { ceu: "linear-gradient(#ffbe5c, #fff1cc 62%)", chao: 0x66c443, arvore: 0x6fbf3a, flores: 16, borboletas: 3, luz: [0xfff0d0, 2.6] },
};

// ---------------------------------------------------------------- fases
const embaralhar = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
// uma rodada: certo (ou lista de certos), fala, texto do balão e distratores
const R = (certo, fala, texto, distr, extra = {}) => {
  const certos = [].concat(certo);
  return { certos, fala, texto, opcoes: embaralhar([certos[0], ...distr]), ...extra };
};
const BICHOS = ["abelha", "minhoca", "joaninha", "borboleta"];
const PEDIDOS = {
  agua: (d, f = "ht-agua") => R("agua", f, "Toque na água 💧", d),
  sol: (d, f = "ht-sol") => R("sol", f, "Toque no sol ☀️", d),
  terra: (d, f = "ht-terra") => R("terra", f, "Toque na terra 🟤", d),
};

const FASES = [
  {
    nome: "A planta tem sede", clima: "manha", fala: "ht-vitoria", texto: "A plantinha bebeu água e cresceu! 💧🌱",
    gerar: () => [["sol", "pedra"], ["pedra", "bola"], ["sol", "folha"], ["bola", "sol"], ["pedra", "sol"]].map((d, i) => PEDIDOS.agua(d, i % 2 ? "ht-agua-2" : "ht-agua")),
  },
  {
    nome: "Luz do sol", clima: "ensolarado", fala: "ht-criacao", texto: "Que linda a natureza que Deus criou! ☀️🌱",
    gerar: () => [["lua", "pedra"], ["guarda", "pedra"], ["lua", "guarda"], ["pedra", "bola"], ["lua", "agua"]].map((d, i) => PEDIDOS.sol(d, i % 2 ? "ht-sol-2" : "ht-sol")),
  },
  {
    nome: "Terra boa", clima: "nublado", fala: "ht-vitoria", texto: "Terra boa, planta forte! 🌱",
    gerar: () => [["areia", "pedra"], ["gelo", "areia"], ["pedra", "gelo"], ["areia", "pedra", "gelo"], ["gelo", "areia", "pedra"]].map((d, i) => PEDIDOS.terra(d, i % 2 ? "ht-terra-2" : "ht-terra")),
  },
  {
    nome: "Semente que vira planta", clima: "rosado", fala: "ht-vitoria", texto: "Semente, broto, flor e fruto! 🍅",
    gerar: () => {
      const ciclo = ["semente", "broto", "flor", "fruto"];
      const pede = (c, fala, texto) => ({ certos: [c], fala, texto, opcoes: embaralhar(ciclo) });
      return [pede("semente", "ht-semente", "Primeiro: a semente"), pede("broto", "ht-broto", "Depois: o broto 🌱"),
        pede("flor", "ht-flor", "Agora: a flor 🌸"), pede("fruto", "ht-fruto", "Por fim: o fruto 🍅"), pede("semente", "ht-semente-2", "De novo: a semente!")];
    },
  },
  {
    nome: "Amigos da horta", clima: "azul", fala: "ht-criacao", texto: "Que linda a natureza que Deus criou! 🐝🐞",
    gerar: () => {
      const amigo = BICHOS[Math.floor(Math.random() * 4)];
      return [R("abelha", "ht-abelha", "Toque na abelha 🐝", ["sapato", "joaninha"]), R("minhoca", "ht-minhoca", "Toque na minhoca 🪱", ["carro", "borboleta"]),
        R("joaninha", "ht-joaninha", "Toque na joaninha 🐞", ["sapato", "minhoca"]), R("borboleta", "ht-borboleta", "Toque na borboleta 🦋", ["carro", "abelha"]),
        R(amigo, "ht-amigo", "Toque no amigo da horta!", ["sapato", "carro"])];
    },
  },
  {
    nome: "Dia e noite", clima: "noite", fala: "ht-vitoria", texto: "De dia o sol, de noite a lua! 🌙",
    gerar: () => [R("sol", "ht-dia-sol", "De dia: toque no sol ☀️", ["lua", "coruja"]), R("lua", "ht-lua", "De noite: toque na lua 🌙", ["sol", "estrelas"]),
      R("estrelas", "ht-estrelas", "Toque nas estrelas ⭐", ["lua", "travesseiro"]), R("coruja", "ht-coruja", "Toque na coruja 🦉", ["abelha", "borboleta"]),
      R("travesseiro", "ht-dormir", "Hora de dormir: travesseiro", ["bola", "carro"])],
  },
  {
    nome: "Vivo ou não vivo", clima: "entardecer", fala: "ht-vitoria", texto: "Você sabe o que é ser vivo! 🌳",
    gerar: () => [["flor", "pedra", "regador", "bola"], ["minhoca", "lata", "pedra", "sapato"], ["arvore", "carro", "bola", "regador"],
      ["abelha", "pedra", "lata", "carro"], ["joaninha", "sapato", "regador", "bola"]].map(([v, ...d], i) => R(v, i ? "ht-vivo-2" : "ht-vivo", "Toque no ser vivo! 🌱", d)),
  },
  {
    nome: "Cuidar da natureza", clima: "limpo", fala: "ht-lixo-fim", texto: "Lixo no lugar certo! ♻️", lixo: true,
    gerar: () => [["garrafa", "minhoca", "flor"], ["lata", "joaninha", "abelha"], ["papel", "borboleta", "minhoca", "flor"],
      ["banana", "abelha", "joaninha", "flor"], ["caixinha", "minhoca", "borboleta", "joaninha"]].map(([l, ...d], i) => R(l, i ? "ht-lixo-2" : "ht-lixo", "Toque no lixo 🗑️", d)),
  },
  {
    nome: "As estações", clima: "outono", fala: "ht-criacao", texto: "Que linda a natureza que Deus criou! 🍂❄️🌸☀️",
    gerar: () => [R("folha", "ht-outono", "Outono: a folha laranja 🍂", ["flor", "casaco"], { clima: "outono" }),
      R("casaco", "ht-inverno", "Inverno: o casaco 🧥", ["sol", "folha"], { clima: "inverno" }),
      R("flor", "ht-primavera", "Primavera: a flor 🌸", ["casaco", "folha"], { clima: "primavera" }),
      R("sol", "ht-verao", "Verão: o sol ☀️", ["casaco", "lua"], { clima: "verao" }),
      R("agua", "ht-chuva", "Chuva: a gota 💧", ["sol", "pedra"], { clima: "chuva" })],
  },
  {
    nome: "A colheita", clima: "dourado", fala: "ht-colheita", texto: "Colheita feita! Que linda a natureza que Deus criou! 🍅", rapido: true,
    gerar: () => embaralhar([
      () => PEDIDOS.agua(["sol", "pedra", "lua"]), () => PEDIDOS.sol(["lua", "guarda", "pedra"]), () => PEDIDOS.terra(["areia", "gelo", "pedra"]),
      () => R("abelha", "ht-abelha", "Toque na abelha 🐝", ["sapato", "carro", "bola"]), () => R("minhoca", "ht-minhoca", "Toque na minhoca 🪱", ["lata", "pedra", "papel"]),
      () => R("fruto", "ht-fruto", "Toque no fruto 🍅", ["semente", "broto", "flor"]), () => R("garrafa", "ht-lixo", "Toque no lixo 🗑️", ["flor", "abelha", "joaninha"]),
    ]).slice(0, 5).map((f) => f()),
  },
];
const RODADAS = 5;
const TESTE = new URLSearchParams(location.search).has("teste");
const FALAS = ["ht-isso", "ht-isso-2", "ht-isso-3", "ht-ops", "ht-criacao", "ht-colheita", "ht-lixo-fim",
  ...new Set(FASES.flatMap((f) => f.gerar().map((r) => r.fala)))];

// ---------------------------------------------------------------- casca
const jogo = criarCasca({
  titulo: "Horta do Rabisco",
  sub: "Cuide da plantinha e descubra a natureza!",
  faixa: "pequenos",
  cor: "#8E6CFF",
  niveis: FASES.map((f, i) => ({ nome: `${i + 1}`, desc: f.nome })),
  dica: { teclado: "Setas para escolher · Enter para tocar", toque: "Ouça e toque no que a plantinha precisa", controle: "Direcional para escolher · A para tocar" },
  falas: { titulo: "ht-titulo", vitoria: "ht-vitoria" },
  menuNoJogo: true,
  teclado: true,
  aoComecar: montar,
  aoSair: () => { palco?.destruir(); palco = null; },
});
preCarregarFalas(FALAS);

// ---------------------------------------------------------------- estado
let palco = null, rb = null, planta = null, canteiro = null, placa = null, lixeiraObj = null, climaGrupo = null, climaAtual = null;
let fase = null, lista = [], rodada = 0, erros = 0, rodadaAtual = null, opcoes = [], ocupado = true;
let tempo = 0, modoRb = "parado", fimModo = 0, timers = [], pedidoEl = null, enfeites = [];

// timers no tempo do jogo: param junto com a pausa e morrem com o palco
const depois = (s, f) => timers.push({ t: tempo + s, f });

function montar(n) {
  palco?.destruir();
  fase = FASES[n - 1];
  rodada = 0; erros = 0; opcoes = []; ocupado = true; timers = []; tempo = 0; ultimo = 0; emPe = null; climaAtual = null;
  palco = criarPalco3D(jogo.palco, { camera: { pos: [0, 3.2, 9], alvo: [0, 1.3, 0], fov: 35 }, pausado: () => jogo.pausado });
  const { cena } = palco;
  // no teste automático (Chrome sem GPU) a resolução 1x evita perder o contexto WebGL em máquina carregada
  if (TESTE && !location.search.includes("hd")) { palco.renderer.setPixelRatio(1); palco.olhar(); }

  // canteiro de terra com bordas de madeira, a planta e alfaces
  canteiro = new THREE.Group();
  const terra = peca(new THREE.BoxGeometry(2.6, 0.28, 1.5), 0x7a4a22, { contorno: 0.04 });
  terra.position.y = 0.14;
  canteiro.add(terra);
  for (const [w, d, x, z] of [[2.84, 0.12, 0, 0.81], [2.84, 0.12, 0, -0.81], [0.12, 1.5, 1.36, 0], [0.12, 1.5, -1.36, 0]]) {
    const b = peca(new THREE.BoxGeometry(w, 0.38, d), 0xe2914f, { contorno: 0.04 });
    b.position.set(x, 0.19, z);
    canteiro.add(b);
  }
  planta = O.criarPlanta();
  planta.grupo.position.y = 0.28;
  canteiro.add(planta.grupo, O.alface(-0.85, 0.35), O.alface(0.9, -0.3), O.alface(0.95, 0.4));
  cena.add(canteiro);

  // placa com a logo da Educarte
  placa = new THREE.Group();
  const poste = peca(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 8), 0xe2914f, { contorno: 0.04 });
  poste.position.y = 0.6;
  const tabua = peca(new THREE.BoxGeometry(1.36, 0.8, 0.08), 0xffffff, { contorno: 0.05 });
  tabua.position.y = 1.4;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.63), new THREE.MeshBasicMaterial({ map: palco.textura("../../assets/marca/logos/azul-icone-rosa.png"), transparent: true }));
  logo.position.set(0, 1.4, 0.05);
  placa.add(poste, tabua, logo);
  cena.add(placa);

  // cerca no fundo
  const cerca = cerca3D(18);
  cerca.position.set(-9, 0, -3.4);
  cena.add(cerca);

  lixeiraObj = fase.lixo ? O.lixeira() : null;
  if (lixeiraObj) cena.add(lixeiraObj);

  rb = new Rabisco3D({ raiz: "../..", altura: 2.2 });
  cena.add(rb.grupo);
  modoRb = "acenar"; fimModo = 2.2;

  aplicarClima(fase.clima);

  // balão com o pedido e o botão de ouvir de novo (depois do palco: o foco do controle começa nos objetos)
  const repetir = el("button", { class: "ht-ouvir", "aria-label": "Ouvir de novo", texto: "🔊", onclick: () => { if (rodadaAtual) falar(rodadaAtual.fala); } });
  pedidoEl = el("div", { class: "ht-pedido escondido", "aria-live": "polite" }, [el("span", { class: "ht-texto" }), repetir]);
  jogo.palco.append(pedidoEl);

  lista = fase.gerar();
  placar();
  palco.aoQuadro(quadro);
  depois(1.3, novaRodada);
}

const placar = () => jogo.placar(`🌱 ${rodada}/${RODADAS}`);

// ---------------------------------------------------------------- cenário que muda com o clima
function aplicarClima(nome) {
  if (climaAtual === nome) return;
  climaAtual = nome;
  const c = CLIMAS[nome];
  palco.caixa.style.background = c.ceu;
  palco.piso.material = toon(c.chao);
  const [corLuz, forca] = c.luz ?? [0xffffff, 2.4];
  palco.sol.color.setHex(corLuz); palco.sol.intensity = forca;
  const hemi = palco.cena.children.find((o) => o.isHemisphereLight);
  const [ceuH, chaoH, fH] = c.hemi ?? [0xd6f3ff, 0x5aa83a, 1.6];
  hemi.color.setHex(ceuH); hemi.groundColor.setHex(chaoH); hemi.intensity = fH;

  if (climaGrupo) { palco.cena.remove(climaGrupo); }
  climaGrupo = new THREE.Group();
  enfeites = [];
  const r = aleatorio(nome.length * 7 + 3);
  for (const [x, z, raio] of [[-14, -22, 10], [2, -26, 13], [16, -21, 10]]) {
    const m = morro3D(raio, c.morro ?? 0x7dd36a);
    m.position.set(x, 0, z);
    climaGrupo.add(m);
  }
  for (const [x, z, e] of [[-6.2, -5, 0.9], [6.6, -6, 1.05], [-10, -9, 1.2], [10.5, -10, 1.1], [-3.2, -8.5, 0.8], [3.4, -9, 0.85]]) {
    const a = O.arvoreCor(c.arvore, e);
    a.position.set(x, 0, z); a.rotation.y = r() * 6;
    climaGrupo.add(a);
  }
  const coresFlor = [COR3D.rosa, COR3D.amarelo, 0xffffff, COR3D.roxo, COR3D.laranja];
  if (nome !== "inverno") {
    for (let i = 0; i < (c.flores ?? 8); i++) {
      const f = flor3D(coresFlor[i % coresFlor.length]);
      f.scale.setScalar(2.2 + r());
      f.position.set(-7 + r() * 14, 0, -3 + r() * 1.6 - (r() < 0.3 ? 0 : 0.2));
      climaGrupo.add(f);
    }
  }
  for (let i = 0; i < (c.nuvens ?? 4); i++) {
    const n = nuvem3D(0.2 + r() * 0.12);
    n.position.set(-14 + r() * 28, 7 + r() * 3, -16 - r() * 6);
    climaGrupo.add(n);
    enfeites.push({ tipo: "nuvem", obj: n, vel: 0.2 + r() * 0.3 });
  }
  for (let i = 0; i < (c.borboletas ?? 0); i++) {
    const b = O.borboleta(i % 2 ? [COR3D.amarelo, COR3D.laranja] : [COR3D.ciano, COR3D.rosa]);
    b.scale.setScalar(0.42);
    climaGrupo.add(b);
    enfeites.push({ tipo: "borboleta", obj: b, cx: -5 + r() * 10, cy: 1.6 + r() * 1.2, cz: -2.4 + r() * 1.2, raio: 0.8 + r() * 1.2, vel: 0.5 + r() * 0.4, fase: r() * 6 });
  }
  for (let i = 0; i < (c.vagalumes ?? 0); i++) {
    const v = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true }));
    climaGrupo.add(v);
    enfeites.push({ tipo: "vagalume", obj: v, cx: -6 + r() * 12, cy: 0.5 + r() * 2, cz: -3 + r() * 3, fase: r() * 6 });
  }
  if (c.particulas) {
    const cor = { folhas: COR3D.laranja, neve: 0xffffff, chuva: 0x6fb8ff }[c.particulas];
    const geo = c.particulas === "chuva" ? new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4)
      : c.particulas === "folhas" ? new THREE.SphereGeometry(0.1, 8, 6) : new THREE.SphereGeometry(0.06, 8, 6);
    const mat = toon(cor);
    for (let i = 0; i < 60; i++) {
      const p = new THREE.Mesh(geo, mat);
      if (c.particulas === "folhas") p.scale.set(1, 0.3, 0.6);
      p.position.set(-9 + r() * 18, r() * 9, -5 + r() * 7);
      climaGrupo.add(p);
      enfeites.push({ tipo: c.particulas, obj: p, vel: c.particulas === "chuva" ? 7 + r() * 3 : 0.7 + r() * 0.7, fase: r() * 6 });
    }
  }
  palco.cena.add(climaGrupo);
}

// ---------------------------------------------------------------- posições (tela deitada ou em pé)
const retrato = () => palco.cam.aspect < 0.9;
function vagas(n) {
  if (!retrato()) {
    const xs = n === 4 ? [-1.75, 0.05, 1.85, 3.6] : [-1.2, 0.75, 2.7];
    return xs.map((x) => [x, 2.75, 0.6, 1]);
  }
  if (n === 4) return [[-0.95, 4.35, 0.4, 1.1], [0.95, 4.35, 0.4, 1.1], [-0.95, 3.05, 0.4, 1.1], [0.95, 3.05, 0.4, 1.1]];
  return [[-1.4, 3.5, 0.4, 1.05], [0, 3.5, 0.4, 1.05], [1.4, 3.5, 0.4, 1.05]];
}
let emPe = null;
function arrumar() {
  const em = retrato();
  // em pé: câmera mais perto e mais baixa, para a horta encher a tela comprida
  if (em !== emPe) { emPe = em; palco.olhar(em ? [0, 3.0, 7.9] : [0, 3.2, 9], em ? [0, 1.9, 0] : [0, 1.3, 0]); }
  rb.grupo.position.set(em ? -1.35 : -3.1, 0, em ? 1.3 : 0.9);
  rb.grupo.rotation.y = em ? 0.3 : 0.35;
  canteiro.position.set(em ? 0.75 : 0.3, 0, 0.3);
  canteiro.scale.setScalar(em ? 0.8 : 1);
  placa.position.set(em ? 1.55 : 3.75, 0, em ? -0.95 : -1.2);
  if (lixeiraObj) lixeiraObj.position.set(em ? -0.3 : 2.35, 0, em ? -1.9 : -0.6);
}

// ---------------------------------------------------------------- rodadas
function novaRodada() {
  if (jogo.estado !== "jogando") return;
  if (rodada >= RODADAS) return terminar();
  rodadaAtual = lista[rodada];
  if (rodadaAtual.clima) aplicarClima(rodadaAtual.clima);
  const n = rodadaAtual.opcoes.length;
  opcoes = rodadaAtual.opcoes.map((id, i) => {
    const [nome, criar] = OBJ[id];
    const g = new THREE.Group();
    const modelo = criar();
    g.add(modelo);
    const [x, y, z] = vagas(n)[i];
    g.position.set(x, y + 0.6, z);
    g.scale.setScalar(0.0001);
    palco.cena.add(g);
    const op = { id, nome, g, modelo, i, s: 0, v: 0, modo: "ok", balanco: 0, atraso: i * 0.12 };
    op.botao = palco.alvo({
      obj: g, texto: nome,
      tam: (W, H) => pxPorUnidade(g, H) * 1.2 * vagas(n)[i][3],
      aoEscolher: () => escolher(op),
    });
    return op;
  });
  pedidoEl.querySelector(".ht-texto").textContent = rodadaAtual.texto;
  pedidoEl.classList.remove("escondido");
  falar(rodadaAtual.fala);
  placar();
  ocupado = false;
}

const vTmp = new THREE.Vector3();
function pxPorUnidade(obj, H) {
  obj.getWorldPosition(vTmp);
  const d = palco.cam.position.distanceTo(vTmp);
  return H / (2 * d * Math.tan((palco.cam.fov * Math.PI) / 360));
}

function escolher(op) {
  if (ocupado || jogo.pausado || jogo.estado !== "jogando" || op.modo !== "ok") return;
  if (!rodadaAtual.certos.includes(op.id)) {
    erros++;
    sons.erro();
    op.balanco = 0.7;
    jogo.aviso("Hum, tente de novo!", "", 1400);
    falar("ht-ops");
    const r = rodada;
    clearTimeout(escolher.repete);
    escolher.repete = setTimeout(() => { if (r === rodada && !ocupado && rodadaAtual && jogo.estado === "jogando" && !jogo.pausado) falar(rodadaAtual.fala); }, 2200);
    return;
  }
  ocupado = true;
  pedidoEl.classList.add("escondido");
  clearTimeout(escolher.repete);
  sons.moeda();
  const nome = window.Familia?.crianca?.()?.nome;
  jogo.aviso(rodada === 0 && nome ? `Isso, ${nome}! 🌱` : ["Isso! 🌱", "Muito bem! 🌟", "Boa! 💚"][rodada % 3], "bom", 1300);
  falar(["ht-isso", "ht-isso-2", "ht-isso-3"][rodada % 3]);
  faiscas(op.g);
  for (const o of opcoes) { palco.tirarAlvo(o.botao); if (o !== op) o.modo = "some"; }
  // o objeto voa até a planta (ou até a lixeira, na fase do lixo)
  op.modo = "pego"; op.t = 0;
  op.de = op.g.position.clone();
  const destino = lixeiraObj ?? planta.grupo;
  op.para = destino.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, lixeiraObj ? 1.0 : 0.7, 0));
  rodada++;
  const rapido = fase.rapido;
  depois(0.75, () => {
    planta.definir(rodada);
    sons.pulo();
    faiscas(planta.grupo, [0, 1, 0]);
    modoRb = "comemorar"; fimModo = tempo + 1.8;
    placar();
  });
  depois(rapido ? 1.9 : 2.5, () => {
    for (const o of opcoes) palco.cena.remove(o.g);
    opcoes = [];
    if (rodada >= RODADAS) depois(0.6, terminar); else novaRodada();
  });
}

function terminar() {
  ocupado = true;
  pedidoEl.classList.add("escondido");
  modoRb = "comemorar"; fimModo = Infinity;
  const estrelas = erros === 0 ? 3 : erros <= 2 ? 2 : 1;
  const nome = window.Familia?.crianca?.()?.nome;
  jogo.vencer({ titulo: nome ? `Muito bem, ${nome}!` : "Muito bem!", estrelas, texto: fase.texto, fala: fase.fala });
  // na colheita, depois do "obrigado", vem a gratidão pela criação
  if (fase.fala === "ht-colheita") setTimeout(() => { if (jogo.estado === "vitoria") falar("ht-criacao"); }, 4300);
}

// ---------------------------------------------------------------- efeitos
function faiscas(obj, ponto = [0, 0, 0]) {
  const [x, y] = palco.naTela(obj, ponto);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const f = el("div", { class: "ht-faisca", texto: ["✨", "⭐", "💚"][i % 3] });
    f.style.left = `${x}px`; f.style.top = `${y}px`;
    f.style.setProperty("--dx", `${Math.cos(a) * 80}px`);
    f.style.setProperty("--dy", `${Math.sin(a) * 80}px`);
    document.body.append(f);
    setTimeout(() => f.remove(), 900);
  }
}

// ---------------------------------------------------------------- laço
let ultimo = 0;
function quadro() {
  // relógio próprio (o palco limita o passo a 0,05 s): num aparelho lento o jogo não fica em câmera lenta
  const agora = performance.now();
  const dt = ultimo ? Math.min(0.25, (agora - ultimo) / 1000) : 0.016;
  ultimo = agora;
  tempo += dt;
  const prontos = timers.filter((t) => t.t <= tempo);
  timers = timers.filter((t) => t.t > tempo);
  for (const t of prontos) t.f();
  if (!palco) return;

  arrumar();
  if (tempo > fimModo) modoRb = "parado";
  rb.atualizar(dt, { modo: modoRb });
  planta.atualizar(dt, tempo);

  const n = opcoes.length ? rodadaAtual.opcoes.length : 0;
  const vs = n ? vagas(n) : [];
  for (const op of opcoes) {
    const m = op.modelo;
    if (m.userData.gira) m.userData.gira.rotation.z += dt * 0.8;
    if (m.userData.asas) m.userData.asas.forEach((a, k) => { a.rotation.x = (k ? 1 : -1) * (0.4 + Math.sin(tempo * 30) * 0.4); });
    if (m.userData.borboleta) m.userData.borboleta.forEach((a, k) => { a.rotation.y = (k ? -1 : 1) * Math.sin(tempo * 9) * 0.8; });
    if (op.modo === "pego") {
      op.t += dt / 0.7;
      const k = Math.min(1, op.t);
      op.g.position.lerpVectors(op.de, op.para, k);
      op.g.position.y += Math.sin(k * Math.PI) * 1.0;
      op.g.scale.setScalar(Math.max(0.0001, (1 - k) * 1.2 * (1 + Math.sin(k * Math.PI) * 0.3)));
      op.g.rotation.y += dt * 8;
      continue;
    }
    op.atraso = Math.max(0, op.atraso - dt);
    const alvoS = op.modo === "some" ? 0 : op.atraso > 0 ? 0 : vs[op.i][3];
    // mola em passinhos de 1/60 s: com quadros lentos (celular fraco) ela não "explode"
    for (let h = dt; h > 1e-6; h -= 1 / 60) {
      const d = Math.min(h, 1 / 60);
      op.v += ((alvoS - op.s) * 160 - op.v * 12) * d;
      op.s = Math.max(0, op.s + op.v * d);
    }
    op.g.scale.setScalar(Math.max(0.0001, op.s));
    const [x, y, z] = vs[op.i];
    const alvoY = y + Math.sin(tempo * 2 + op.i * 1.7) * 0.08;
    op.g.position.x += (x - op.g.position.x) * Math.min(1, dt * 8);
    op.g.position.y += (alvoY - op.g.position.y) * Math.min(1, dt * 6);
    op.g.position.z = z;
    op.g.rotation.y = Math.sin(tempo * 1.3 + op.i) * 0.3;
    op.balanco = Math.max(0, op.balanco - dt);
    op.g.rotation.z = Math.sin(op.balanco * 30) * 0.35 * (op.balanco / 0.7);
  }

  for (const e of enfeites) {
    const o = e.obj;
    if (e.tipo === "nuvem") { o.position.x += e.vel * dt; if (o.position.x > 16) o.position.x = -16; }
    else if (e.tipo === "borboleta") {
      const a = tempo * e.vel + e.fase;
      o.position.set(e.cx + Math.cos(a) * e.raio, e.cy + Math.sin(a * 2.3) * 0.3, e.cz + Math.sin(a) * e.raio * 0.4);
      o.rotation.y = -a;
      o.userData.borboleta.forEach((asa, k) => { asa.rotation.y = (k ? -1 : 1) * Math.sin(tempo * 12 + e.fase) * 0.9; });
    } else if (e.tipo === "vagalume") {
      o.position.set(e.cx + Math.sin(tempo * 0.6 + e.fase) * 0.8, e.cy + Math.sin(tempo * 0.9 + e.fase) * 0.3, e.cz);
      o.material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(tempo * 2.5 + e.fase));
    } else {
      o.position.y -= e.vel * dt;
      if (e.tipo !== "chuva") { o.position.x += Math.sin(tempo * 1.5 + e.fase) * dt * 0.5; o.rotation.z += dt * 2; }
      if (o.position.y < 0) o.position.y += 9;
    }
  }
}

// ---------------------------------------------------------------- testes automatizados (?teste)
if (TESTE) {
  window.teste = {
    jogo,
    get palco() { return palco; },
    pedido: () => (ocupado ? null : opcoes.find((o) => rodadaAtual.certos.includes(o.id))?.id ?? null),
    acertar() { const o = opcoes.find((x) => rodadaAtual?.certos.includes(x.id)); if (!ocupado && o) o.botao.click(); return !!o; },
    errar() { const o = opcoes.find((x) => !rodadaAtual?.certos.includes(x.id)); if (!ocupado && o) o.botao.click(); return !!o; },
    get rodada() { return rodada; },
    get pronto() { return !ocupado && opcoes.length > 0; },
    get estagio() { return planta?.estagio; },
    get erros() { return erros; },
    // para o teste conferir que cada objeto aparece de verdade: escala e posição dentro da câmera
    objetos: () => opcoes.map((o) => {
      const v = o.g.getWorldPosition(new THREE.Vector3()).project(palco.cam);
      return { id: o.id, s: +o.g.scale.x.toFixed(2), dentro: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1, vis: o.g.visible };
    }),
  };
}
