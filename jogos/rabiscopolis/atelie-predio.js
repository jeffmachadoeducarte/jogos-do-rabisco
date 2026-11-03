// Rabiscolândia: o prédio do Ateliê Ponta do Lápis (loja de visual inventada, sem marca real), de blocos, no Centro, ao
// lado da praça. Paredes lilás, beiral roxo, rodapé ciano, toldo listrado rosa e branco, duas vitrines, a porta rosa,
// o nome em letras de bloquinho (sem textura) e, no telhado, um lápis gigante deitado nas cores do Rabisco (corpo ciano,
// ponteira rosa, ponta de madeira e grafite) e um botão de roupa gigante. Na calçada, duas araras com camisetinhas.
// Tudo cor lisa: vira a mesma malha de cores do bloco, então o prédio não acrescenta chamada de desenho.
// Convenção de predios.js: frente em z = 0 olhando para +z, fundo até z = -D; devolve { grupo, solidos, porta }.

import { THREE, mat, malha, MAT } from "./base3d.js";
import { cx as pc, prisma } from "./blocos.js";
import { corpo, porta, toldo, novo } from "./predios.js";

const LILAS = 0xe4d6ff, ROXO = 0x8e6cff, CIANO = 0x00b5f0, ROSA = 0xec2e8c, AMARELO = 0xffcc1f, MADEIRA = 0xffd9a8, GRAFITE = 0x2a2a33, PRATA = 0xc9d2dc;

// letras de bloquinho 5 × 7 (só as do nome), com o acento em 2 linhas por cima
const LETRAS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"], T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"], L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"], P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"], N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"], S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
};
const ACENTOS = { "Ê": ["E", ["00100", "01010"]], "Á": ["A", ["00010", "00100"]] };
// escreve `texto` centrado em x = 0, com a base das letras em y0, cada "pixel" com `px` de lado
function escrever(g, texto, { px, y0, z, cor }) {
  const largura = texto.length * 6 - 1;
  [...texto].forEach((ch, i) => {
    if (ch === " ") return;
    const [base, acento] = ACENTOS[ch] ?? [ch, null];
    const linhas = [...(acento ?? []), ...LETRAS[base]], n = linhas.length;
    linhas.forEach((linha, r) => [...linha].forEach((b, c) => {
      if (b !== "1") return;
      const x = (i * 6 + c - (largura - 1) / 2) * px, y = y0 + (n - 1 - r) * px + px / 2;
      pc(g, px * 0.96, px * 0.96, 0.14, cor, x, y, z, { sombra: false });
    }));
  });
}

// arara de roupa: dois pés, a barra e três camisetinhas (T de blocos) penduradas
function arara(cores) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) { pc(g, 0.12, 2.0, 0.12, GRAFITE, s * 1.0, 1.0, 0, { sombra: false }); pc(g, 0.5, 0.08, 0.5, GRAFITE, s * 1.0, 0.04, 0, { sombra: false }); }
  pc(g, 2.2, 0.1, 0.1, PRATA, 0, 1.95, 0, { sombra: false });
  cores.forEach((c, i) => {
    const x = -0.62 + i * 0.62;
    pc(g, 0.05, 0.22, 0.05, PRATA, x, 1.82, 0, { sombra: false }); // gancho
    pc(g, 0.5, 0.62, 0.12, c, x, 1.36, 0);                           // corpo da camiseta
    pc(g, 0.72, 0.2, 0.12, c, x, 1.62, 0, { sombra: false });        // mangas
    pc(g, 0.18, 0.06, 0.13, 0xffffff, x, 1.7, 0.01, { sombra: false }); // golinha
  });
  return g;
}

export function atelie(l) {
  const S = novo(), g = S.grupo;
  const [W, D] = l.pegada, H = 7;
  corpo(g, W, H, D, LILAS, { beiral: ROXO, rodape: CIANO });
  // vitrines dos dois lados da porta (vidro que acende de noite) com moldura branca e friso amarelo
  for (const s of [-1, 1]) {
    pc(g, 4.9, 2.9, 0.18, 0xffffff, s * 4.4, 2.05, 0.04, { sombra: false });
    pc(g, 4.4, 2.4, 0.2, 0, s * 4.4, 2.05, 0.08, { sombra: false, material: MAT.vidro });
    pc(g, 5.0, 0.18, 0.4, AMARELO, s * 4.4, 0.58, 0.2, { sombra: false });
    // cabides desenhados na vitrine (três triângulos de blocos)
    for (const k of [-1, 0, 1]) pc(g, 0.7, 0.08, 0.06, 0xffffff, s * 4.4 + k * 1.2, 3.0, 0.22, { sombra: false });
  }
  porta(g, { x: 0, z: 0.2, w: 2.6, h: 3.2, cor: ROSA, vidro: false });
  pc(g, 2.8, 0.04, 1.4, ROSA, 0, 0.09, 0.9, { sombra: false }); // tapetinho
  const t = toldo(W - 1.2, "#ec2e8c", "#ffffff"); t.position.set(0, 4.05, 0.1); g.add(t);
  // janelas nas duas laterais (moldura branca e vidro liso)
  for (const s of [-1, 1]) for (const z of [-2.6, -D + 2.6]) for (const y of [2.1, 5.2]) {
    pc(g, 0.16, 1.7, 1.7, 0xffffff, s * (W / 2 + 0.05), y, z, { sombra: false });
    pc(g, 0.2, 1.3, 1.3, 0, s * (W / 2 + 0.07), y, z, { sombra: false, material: MAT.vidro });
  }
  // o nome em letras de bloquinho numa placa branca com moldura roxa: ATELIÊ grande, PONTA DO LÁPIS embaixo
  pc(g, 9.2, 2.85, 0.16, ROXO, 0, 5.56, 0.1, { sombra: false });
  pc(g, 8.9, 2.55, 0.18, 0xffffff, 0, 5.56, 0.13, { sombra: false });
  escrever(g, "ATELIÊ", { px: 0.165, y0: 5.34, z: 0.26, cor: 0x6a3fe0 });
  escrever(g, "PONTA DO LÁPIS", { px: 0.092, y0: 4.42, z: 0.26, cor: ROSA });
  // lápis gigante deitado no telhado (sextavado, como lápis de verdade), apontando para a direita da fachada
  const lapis = new THREE.Group(); lapis.position.set(-0.6, H + 1.35, -D / 2 + 0.6); g.add(lapis);
  const deitar = (geo) => { geo.rotateZ(-Math.PI / 2); return geo; };
  lapis.add(malha(deitar(prisma(0.78, 0.78, 8.4, 6)), mat(CIANO)));
  const anel = malha(deitar(prisma(0.8, 0.8, 0.5, 6)), mat(PRATA)); anel.position.x = -4.45; lapis.add(anel);
  const borracha = malha(deitar(prisma(0.78, 0.78, 0.9, 6)), mat(ROSA)); borracha.position.x = -5.15; lapis.add(borracha);
  const ponta = malha(deitar(prisma(0.12, 0.78, 1.7, 6)), mat(MADEIRA)); ponta.position.x = 5.05; lapis.add(ponta);
  const grafite = malha(deitar(prisma(0.0, 0.14, 0.32, 6)), mat(GRAFITE)); grafite.position.x = 6.05; lapis.add(grafite);
  // faixinha branca e o brilho do lápis
  pc(lapis, 8.4, 0.08, 0.3, 0xffffff, 0, 0.62, 0.3, { sombra: false });
  // apoios do lápis no telhado
  for (const x of [-3, 2.4]) pc(g, 0.7, 0.9, 0.7, ROXO, x - 0.6, H + 0.75, -D / 2 + 0.6, { sombra: false });
  // botão de roupa gigante em pé no telhado, de frente para a praça (4 furinhos e a linha costurada em X)
  const lado = new THREE.Group(); lado.position.set(W / 2 - 1.7, H + 2.3, -1.2); g.add(lado);
  lado.add(malha(prisma(1.25, 1.25, 0.3, 12).rotateX(Math.PI / 2), mat(ROSA)));
  const miolo = malha(prisma(0.95, 0.95, 0.36, 12).rotateX(Math.PI / 2), mat(0xff8cc6)); lado.add(miolo);
  for (const [x, y] of [[-0.32, 0.32], [0.32, 0.32], [-0.32, -0.32], [0.32, -0.32]]) pc(lado, 0.24, 0.24, 0.42, 0x8a1450, x, y, 0, { sombra: false });
  pc(lado, 0.9, 0.12, 0.46, 0xffffff, 0, 0, 0, { sombra: false, rz: Math.PI / 4 }); pc(lado, 0.9, 0.12, 0.46, 0xffffff, 0, 0, 0, { sombra: false, rz: -Math.PI / 4 }); // linha em X
  pc(g, 0.5, 1.6, 0.5, ROXO, W / 2 - 1.7, H + 0.9, -1.45, { sombra: false }); // o pé que segura o botão no telhado
  // araras na calçada, uma de cada lado da porta (um pouco para dentro do terreno)
  [[-4.6, [ROSA, AMARELO, CIANO]], [4.6, [0x2bb24c, ROXO, 0xff6400]]].forEach(([x, cores]) => { const a = arara(cores); a.position.set(x, 0.07, 1.25); g.add(a); });
  S.solidos.push({ x0: -W / 2, x1: W / 2, z0: -D, z1: 0, y1: 20 });
  for (const x of [-4.6, 4.6]) S.solidos.push({ x0: x - 1.15, x1: x + 1.15, z0: 1.0, z1: 1.5, y1: 2.1 });
  S.porta = [0, 0.4];
  return S;
}
