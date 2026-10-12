// Um cenário diferente para cada página do Livro da Criação. pagina.js lê esta definição e monta o
// mundo; jogo.js aplica as mecânicas. Tudo em unidades do mundo (o Rabisco tem 1,8 de altura e anda
// para +z). Cada página tem o tema de um "dia da Criação" e um jeito próprio de andar:
//
//   jardim    caminho clássico com rio e ponte de flores (como no começo do jogo)
//   mar       ilhas de areia ligadas por pontes de tábuas e bancos que a maré cobre
//   pomar     floresta densa com trilha em zigue-zague, maçãs em ordem e caixa para empurrar
//   floresta  túnel de pedra guiado por um coelho e pedras que rolam
//   fazenda   campos cercados: pise na placa para abrir cada cancela
//   ceu       ilhas de nuvem com plataformas que se mexem (cair = voltar à bandeira)
//   neve      montanha em terraços, zigue-zague entre muros de neve e bolas que rolam
//   deserto   lago com pedras para pular, dunas e camelos que passeiam
//   noite     labirinto de sebes com portinha de interruptor e vagalumes
//   descanso  vila com casas, praça, carrinho que anda e um pouco de tudo
//
// Campos (todos opcionais, menos limites/inicio): ver `padrao()` e `montarPagina` em pagina.js.
// Alturas: objetos ficam em cima do terraço do lugar (y relativo), então só se põe y para subir em caixa.

const R = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
const dentro = (r, x, z) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1;

function padrao(extra) {
  return {
    limites: { x0: -12, x1: 12, z0: -6, z1: 94 },
    inicio: [0, 0],
    caminho: (x, z) => x >= -4 && x < 4,   // ladrilho bege (o resto é grama)
    agua: [], buracos: [], mare: null, terracos: [], muros: [], plataformas: [], moveis: [], empurraveis: [],
    interruptores: [], rolantes: [], guia: null, vagam: false, itensEmOrdem: false, cercas: true, morros: true,
    portao: { x: 0, z: 30 }, botao: [-6, 33.5], ponte: { x: -6, z0: 36, z1: 42 },
    bichos: [], itens: [], estrelas: [], bandeiras: [[0, 1]], borrachas: [],
    pastor: [-3, 85], cercado: R(-10.5, -5, 83, 90), escola: [3, 100],
    arvores: [], flores: [], pedras: [],
    ...extra,
  };
}

// ---------- 1. O Jardim: o caminho clássico
const jardim = () => padrao({
  agua: [R(-12, 12, 36, 42)],
  plataformas: [[4, 18, 3, 1.4, 3], [5, 46, 3, 1.2, 3], [7, 49.5, 3, 2.4, 3], [9, 53, 3, 3.6, 3], [-5, 66, 3, 1.2, 3], [-8, 69.5, 3, 2.4, 3]],
  bichos: [[-9, 0, 13], [-9.5, 0, 50.5], [-8, 2.4, 69.5]],
  itens: [[6, 0.6, 8], [-7, 0.6, 22], [4, 2.0, 18]],
  estrelas: [[10.6, 0.9, 27.5], [9, 4.5, 53], [10.5, 0.9, 82]],
  bandeiras: [[0, 1], [0, 32.5], [0, 56], [0, 74]],
  borrachas: [[62, -6, 6], [70, -6, 4], [80, -5, 7]],
  arvores: [[-9, 4, 0.3], [9, 6, 0.34], [-10, 18, 0.28], [10, 14, 0.3], [9.5, 25, 0.36], [-9, 27, 0.3], [9, 46, 0.3], [-10, 58, 0.34], [10, 62, 0.3], [-9, 76, 0.3], [9, 80, 0.32], [-6, 44, 0.26]],
  flores: [[-6, 6], [6, 10], [-5, 16], [7, 22], [-7, 33], [5, 44], [-4, 52], [7, 58], [-6, 63], [6, 72], [-3, 80], [8, 88]],
  pedras: [[5, 3, 1], [-6, 11, 1.2], [6, 28, 0.9], [3, 47, 1], [-8, 64, 1.3], [7, 75, 1]],
});

// ---------- 2. O Mar: ilhas, pontes de tábuas e maré
const mar = () => {
  const ilhas = [R(-8, 8, -6, 14), R(-14, -2, 24, 40), R(-2, 14, 48, 64), R(-12, 14, 72, 94)];
  const L = { x0: -16, x1: 16, z0: -6, z1: 94 };
  // tudo que não é ilha nem banco de maré é água
  const banco = R(-8, 4, 34, 46);   // alinhado à grade de 4 (x desde -16, z desde -6) e encostado na ilha 2
  const agua = [];
  for (let z = L.z0; z < L.z1; z += 4) for (let x = L.x0; x < L.x1; x += 4) {
    const cx = x + 2, cz = z + 2;
    if (!ilhas.some((i) => dentro(i, cx, cz)) && !dentro(banco, cx, cz)) agua.push(R(x, x + 4, z, z + 4));
  }
  return padrao({
    limites: L, cercas: false, agua, mare: { rects: [banco], periodo: 10 },
    caminho: (x, z) => dentro(banco, x, z),
    tabuas: [[-6, 14, 24]],                              // ponte de tábuas: x, z0, z1 (ilha 1 → ilha 2)
    plataformas: [[10, 58, 3, 1.4, 3]],
    portao: { x: -8, z: 34, cerca: [-16, -2] }, botao: [6, 58], ponte: { x: 4, z0: 62, z1: 70 },
    bichos: [[-4, 0, 8], [-12, 0, 30], [10, 1.4, 58]],
    itens: [[5, 0.6, 10], [-6, 0.6, 26], [-13, 0.6, 31]],
    estrelas: [[-6, 1.6, 19], [0, 0.9, 42], [-10, 0.9, 90]],
    bandeiras: [[0, 1], [-8, 26], [6, 50], [0, 74]],
    borrachas: [[8, -4, 4], [30, -12, -4], [56, 0, 10]],
    pastor: [-3, 85], cercado: R(-10.5, -5, 83, 90), escola: [3, 100],
    arvores: [[-6, -3, 0.3], [7, 12, 0.32], [-13, 27, 0.3], [-12, 36, 0.28], [10, 52, 0.3], [0, 60, 0.3], [-10, 76, 0.32], [10, 80, 0.3], [8, 90, 0.28]],
    flores: [[-5, 4], [4, 12], [-10, 36], [-5, 30], [8, 52], [4, 60], [-8, 78], [6, 86]],
    pedras: [[6, 2, 1], [-12, 25, 1.1], [8, 61, 0.9], [-6, 92, 1.2]],
  });
};

// ---------- 3. O Pomar: trilha em zigue-zague na floresta de frutas
const pomar = () => {
  const cx = (z) => (z < 20 ? 0 : z < 44 ? -8 * (z - 20) / 24 : z < 70 ? -8 + 16 * (z - 44) / 26 : 8 - 8 * (z - 70) / 24);
  const arvores = [];
  for (let z = -4; z < 92; z += 6) for (const lado of [-1, 1]) {
    const x = cx(z) + lado * (7 + ((z / 6) % 2) * 1.5);
    if (x > -13 && x < 13 && !(z > 41 && z < 56)) arvores.push([x, z, 0.26 + ((z / 6) % 3) * 0.03]);
  }
  return padrao({
    limites: { x0: -14, x1: 14, z0: -6, z1: 94 },
    caminho: (x, z) => Math.abs(x - cx(z)) < 4,
    agua: [R(-14, 14, 46, 54)],
    itensEmOrdem: true,
    plataformas: [[-10, 38, 3, 2.4, 3], [8, 60, 3, 1.4, 3], [-6, 80, 3, 1.2, 3], [-9, 83, 3, 2.4, 3], [-12, 86, 3, 3.6, 3]],
    empurraveis: [[-6, 38, 1.2]],                     // degrau para a caixa alta (dá para empurrar e encostar)
    portao: { x: -8, z: 44 }, botao: [-10, 45], ponte: { x: -5, z0: 46, z1: 54 },
    bichos: [[-6, 0, 16], [-12, 0, 28], [10, 0, 78]],
    itens: [[0, 0.6, 10], [-8, 0.6, 30], [-10, 3.0, 38]],
    estrelas: [[12, 0.9, 24], [-12, 4.5, 86], [8, 2.3, 60]],
    bandeiras: [[0, 1], [-6, 30], [-4, 56], [6, 74]],
    borrachas: [[14, -3, 3], [40, -12, -4], [66, 2, 10], [80, 0, 8]],
    pastor: [2, 85], cercado: R(5, 10.5, 83, 90), escola: [3, 100],
    arvores,
    flores: [[3, 6], [-3, 14], [-6, 26], [-10, 40], [-1, 58], [6, 66], [9, 74], [2, 88]],
    pedras: [[-5, 4, 1], [6, 20, 1.1], [-12, 56, 1.2], [10, 70, 0.9]],
  });
};

// ---------- 4. A Floresta dos Bichos: túnel de pedra, coelho guia e pedras que rolam
const floresta = () => padrao({
  caminho: (x, z) => x >= -3 && x < 3,
  muros: [[-12, -3, 20, 44, 5, 0x6e6a73], [3, 12, 20, 44, 5, 0x6e6a73], [-3, 1, 28, 32, 5, 0x6e6a73], [-1, 3, 36, 40, 5, 0x6e6a73]],
  rolantes: [{ x: -5, z: 46, eixo: "z", a0: 46, a1: 66, vel: 4.5, r: 1 }, { x: 5, z: 66, eixo: "z", a0: 46, a1: 66, vel: 4, r: 1 }, { x: 0, z: 56, eixo: "z", a0: 46, a1: 66, vel: 5.5, r: 0.9 }],
  guia: { trajeto: [[4, 8], [-1, 14], [2, 20], [-2, 26], [2, 30], [-2, 34], [-2, 38], [0, 44]] },
  agua: [R(-12, 12, 74, 82)],
  plataformas: [[-7, 88, 3, 1.4, 3]],
  portao: { x: 0, z: 70 }, botao: [6, 72], ponte: { x: -6, z0: 74, z1: 82 },
  bichos: [[-9, 0, 4], [-2, 0, 41], [10, 0, 56]],
  itens: [[6, 0.6, 12], [2, 0.6, 30], [-8, 0.6, 50]],
  estrelas: [[-10, 0.9, 16], [0, 0.9, 56], [10, 0.9, 88]],
  bandeiras: [[0, 1], [0, 46], [0, 68], [0, 84]],
  borrachas: [[12, -8, 8], [50, -10, -6], [62, 6, 10], [86, -4, 4]],
  arvores: [[-9, 8, 0.3], [9, 4, 0.32], [-10, 16, 0.3], [10, 14, 0.3], [-10, 50, 0.3], [10, 60, 0.32], [-9, 86, 0.3], [9, 86, 0.3], [-10, 66, 0.28]],
  flores: [[5, 6], [-5, 16], [-9, 48], [9, 50], [-4, 70], [6, 84], [-6, 90]],
  pedras: [[-6, 2, 1], [7, 18, 1.1], [-8, 46, 1], [8, 68, 1.2], [-6, 46, 0.8]],
});

// ---------- 5. A Fazenda: campos cercados e placas que abrem as cancelas
const fazenda = () => padrao({
  limites: { x0: -14, x1: 14, z0: -6, z1: 94 },
  cancelas: [{ z: 20, abre: [-3, 3] }, { z: 48, abre: [-3, 3] }],       // cerca de lado a lado com cancela no meio
  interruptores: [{ x: -8, z: 14, cancela: 0 }, { x: 10, z: 44, cancela: 1 }],
  muros: [[6, 12, 24, 30, 3, 0xe8413c, "telhado"]],
  plataformas: [[8, 34, 3, 1.2, 3], [10, 37, 3, 2.4, 3]],
  agua: [R(-14, 14, 70, 78)],
  vagam: true,
  portao: { x: 0, z: 64 }, botao: [6, 67], ponte: { x: -6, z0: 70, z1: 78 },
  bichos: [[-10, 0, 10], [10, 2.4, 37], [-10, 0, 56]],
  itens: [[5, 0.6, 6], [-8, 0.6, 26], [4, 0.6, 54]],
  estrelas: [[12, 0.9, 16], [-12, 0.9, 30], [-10, 0.9, 88]],
  bandeiras: [[0, 1], [0, 22], [0, 50], [0, 80]],
  borrachas: [[10, -8, 8], [30, -12, 4], [42, -6, 8], [58, -10, 10], [84, -4, 4]],
  arvores: [[-12, 4, 0.3], [12, 8, 0.32], [-12, 36, 0.3], [12, 54, 0.3], [-12, 62, 0.3], [12, 84, 0.32], [-12, 78, 0.3]],
  flores: [[-5, 8], [6, 12], [-8, 30], [4, 40], [-6, 56], [8, 60], [-4, 80], [6, 88]],
  pedras: [[-6, 2, 1], [12, 42, 0.9], [-12, 66, 1.1]],
});

// ---------- 6. O Céu: ilhas de nuvem e plataformas que se mexem
const ceu = () => {
  const ilhas = [R(-6, 6, -6, 12), R(-12, -2, 18, 30), R(2, 12, 30, 42), R(-8, 8, 46, 60), R(-12, 12, 66, 94)];
  const L = { x0: -14, x1: 14, z0: -6, z1: 94 };
  const buracos = [];
  for (let z = L.z0; z < L.z1; z += 4) for (let x = L.x0; x < L.x1; x += 4) if (!ilhas.some((i) => dentro(i, x + 2, z + 2))) buracos.push(R(x, x + 4, z, z + 4));
  return padrao({
    limites: L, cercas: false, morros: false, buracos,
    caminho: () => true,
    moveis: [{ x: -4, z: 15, w: 4, h: 0.5, d: 6, eixo: "x", amp: 4, vel: 0.9 }, { x: 0, z: 30, w: 4, h: 0.5, d: 4, eixo: "z", amp: 3, vel: 1.1 }, { x: 6, z: 44, w: 3, h: 0.5, d: 3, eixo: "x", amp: 4, vel: 1.3 }],
    plataformas: [[8, 38, 3, 1.4, 3]],
    portao: { x: 0, z: 56, cerca: [-10, 6] }, botao: [4, 52], ponte: { x: -4, z0: 58, z1: 66 },
    bichos: [[-4, 0, 6], [-10, 0, 27], [8, 1.4, 38]],
    itens: [[4, 0.6, 8], [-6, 0.6, 22], [4, 0.6, 50]],
    estrelas: [[-5, 2.6, 14], [9, 0.9, 33], [-10, 0.9, 90]],
    bandeiras: [[0, 1], [-7, 20], [0, 48], [0, 70]],
    borrachas: [[6, -4, 4], [24, -10, -4], [36, 4, 10], [52, -6, 6], [80, -8, 8]],
    pastor: [-3, 85], cercado: R(-10.5, -5, 83, 90), escola: [3, 100],
    arvores: [[-5, -4, 0.3], [5, -3, 0.3], [-11, 28, 0.3], [9, 41, 0.3], [-8, 52, 0.3], [9, 76, 0.32], [-11, 80, 0.3]],
    flores: [[3, 4], [-3, 2], [-8, 24], [7, 34], [-5, 50], [3, 54], [6, 76], [-6, 88]],
    pedras: [[4, 2, 0.9], [-10, 22, 1], [6, 68, 1.1]],
  });
};

// ---------- 7. A Montanha de Neve: terraços, zigue-zague e bolas de neve
const neve = () => padrao({
  limites: { x0: -14, x1: 14, z0: -6, z1: 94 },
  caminho: (x, z) => (z < 16 ? x >= -4 && x < 4 : z < 40 ? x >= 2 : z < 64 ? x < -2 : x >= -4 && x < 4),
  terracos: [[-14, 14, 16, 40, 1.2], [-14, 14, 40, 64, 2.4], [-14, 14, 64, 76, 3.6], [-14, 14, 80, 94, 3.6]],
  muros: [[-14, 6, 26, 28, 2, 0xffffff], [-6, 14, 50, 52, 2, 0xffffff]],
  rolantes: [{ x: 0, z: 34, eixo: "x", a0: -12, a1: 12, vel: 5, r: 1 }, { x: -6, z: 46, eixo: "x", a0: -12, a1: 12, vel: 6, r: 1 }, { x: 6, z: 58, eixo: "x", a0: -12, a1: 12, vel: 5, r: 0.9 }],
  agua: [R(-14, 14, 76, 80)],
  portao: { x: 0, z: 64 }, botao: [6, 72], ponte: { x: -6, z0: 76, z1: 80, y: 3.6 },
  bichos: [[-10, 0, 8], [10, 0, 36], [-10, 0, 56]],
  itens: [[6, 0.6, 6], [-8, 0.6, 22], [8, 0.6, 54]],
  estrelas: [[12, 0.9, 30], [-12, 0.9, 62], [10, 0.9, 90]],
  bandeiras: [[0, 1], [8, 30], [-8, 54], [0, 82]],
  borrachas: [[10, -8, 8], [20, 4, 12], [42, -12, -4], [56, -12, 0], [70, -6, 6], [86, -4, 4]],
  arvores: [[-10, 4, 0.3], [10, 6, 0.32], [-12, 20, 0.3], [-10, 36, 0.3], [12, 44, 0.3], [12, 60, 0.3], [-12, 70, 0.3], [12, 86, 0.32], [-12, 88, 0.3]],
  flores: [[-5, 6], [5, 12], [8, 20], [-8, 44], [-4, 68], [6, 84]],
  pedras: [[5, 2, 1], [-6, 12, 1.1], [12, 24, 1], [-12, 46, 1.2], [8, 70, 1]],
});

// ---------- 8. O Oásis: lago com pedras para pular, dunas e camelos que passeiam
const deserto = () => padrao({
  limites: { x0: -14, x1: 14, z0: -6, z1: 94 },
  agua: [R(-14, 14, 18, 46), R(-14, 14, 70, 78)],
  pedrasLago: [[0, 21], [2, 24.5], [0, 28], [-3, 31], [-3, 34.5], [0, 38], [2, 41.5], [0, 45], [6, 28]],   // pedras de pular: x, z (2x2, 0,3 de altura; vãos de até 1,5)
  terracos: [[-14, -4, 56, 66, 0.3], [-14, -8, 58, 64, 0.6], [6, 14, 50, 58, 0.3], [10, 14, 52, 56, 0.6]],
  vagam: true,
  portao: { x: 0, z: 50 }, botao: [6, 68], ponte: { x: -6, z0: 70, z1: 78 },
  bichos: [[-10, 0, 8], [10, 0, 62], [-8, 0, 80]],
  itens: [[6, 0.6, 10], [-3, 0.9, 34.5], [-10, 0.6, 48]],
  estrelas: [[-12, 0.9, 14], [6, 1.2, 28], [12, 0.9, 88]],
  bandeiras: [[0, 1], [0, 47], [0, 66], [0, 80]],
  borrachas: [[8, -8, 8], [14, -4, 6], [48, -10, -4], [56, -2, 4], [62, 4, 12], [86, -4, 4]],
  arvores: [[-9, 4, 0.3], [9, 8, 0.32], [-10, 16, 0.3], [10, 16, 0.3], [-10, 48, 0.3], [10, 46, 0.3], [-12, 62, 0.3], [10, 64, 0.3], [-10, 84, 0.3], [10, 86, 0.32]],
  flores: [[-5, 6], [6, 12], [-6, 48], [8, 48], [-10, 62], [4, 62], [-4, 84], [6, 88]],
  pedras: [[5, 3, 1], [-7, 12, 1.2], [8, 52, 0.9], [-12, 68, 1.1], [10, 78, 1]],
});

// ---------- 9. A Noite Estrelada: labirinto de sebes
const noite = () => {
  const sebe = 0x2f7a3a, h = 2.2;
  return padrao({
    limites: { x0: -14, x1: 14, z0: -6, z1: 94 },
    caminho: (x, z) => z < 14 || z > 62 ? x >= -4 && x < 4 : false,
    muros: [
      [-14, 4, 14, 16, h, sebe], [-2, 0, 16, 23, h, sebe],                 // entra pela direita e passa por cima do divisor
      [-6, 14, 26, 28, h, sebe], [6, 8, 30, 38, h, sebe],                  // volta pela esquerda
      [-14, -2, 38, 40, h, sebe], [2, 14, 38, 40, h, sebe],                // meio fechado por cancela
      [-6, 14, 50, 52, h, sebe], [-8, -6, 42, 50, h, sebe],                // último corredor (contorna por baixo)
    ],
    cancelas: [{ z: 39, abre: [-2, 2], soMeio: true }],
    interruptores: [{ x: -12, z: 34, cancela: 0 }],
    agua: [R(-14, 14, 70, 74)],
    portao: { x: 0, z: 64 }, botao: [-8, 67], ponte: { x: 6, z0: 70, z1: 74 },
    bichos: [[-10, 0, 8], [10, 0, 32], [-8, 0, 58]],
    itens: [[8, 0.6, 20], [-10, 0.6, 44], [4, 0.6, 56]],
    estrelas: [[-12, 0.9, 24], [12, 0.9, 46], [10, 0.9, 88]],
    bandeiras: [[0, 1], [2, 32], [0, 42], [0, 76]],
    borrachas: [[20, 2, 12], [32, -12, 4], [46, -13, -9], [46, 4, 12], [56, -4, 12], [80, -8, 8], [88, -4, 4]],
    arvores: [[-9, 4, 0.3], [9, 6, 0.32], [-12, 10, 0.3], [12, 10, 0.3], [-12, 61, 0.3], [12, 61, 0.3], [-10, 80, 0.3], [10, 84, 0.32]],
    flores: [[-5, 6], [6, 10], [-10, 22], [10, 34], [-10, 46], [4, 56], [-4, 78], [8, 88]],
    pedras: [[5, 3, 1], [-6, 10, 1.1], [12, 66, 1], [-12, 86, 1.2]],
    vagalumes: true,
  });
};

// ---------- 10. O Descanso: a vila com praça e um pouco de tudo
const descanso = () => padrao({
  limites: { x0: -16, x1: 16, z0: -6, z1: 94 },
  caminho: (x, z) => (x >= -4 && x < 4) || (z >= 40 && z < 56 && x >= -8 && x < 8),
  muros: [[-14, -8, 10, 16, 3.2, 0xffcc1f, "telhado"], [8, 14, 12, 18, 3.2, 0x00b5f0, "telhado"], [-14, -8, 28, 34, 3.2, 0xec2e8c, "telhado"], [8, 14, 30, 36, 3.2, 0x58c43a, "telhado"]],
  agua: [R(-4, 4, 46, 50), R(-16, 16, 74, 82)],
  moveis: [{ x: 6, z: 22, w: 4, h: 0.6, d: 3, eixo: "x", amp: 2.5, vel: 1 }],
  plataformas: [[-9, 62, 3, 2.4, 3], [12, 22, 3, 1.4, 3]],
  empurraveis: [[-6, 61, 1.2]],
  cancelas: [{ z: 58, abre: [-3, 3] }],
  interruptores: [{ x: 12, z: 44, cancela: 0 }],
  portao: { x: 0, z: 70 }, botao: [-8, 72], ponte: { x: 0, z0: 74, z1: 82 },
  bichos: [[-11, 0, 8], [11, 0, 26], [-6, 0, 52]],
  itens: [[0, 0.6, 8], [0, 0.6, 38], [4, 0.6, 66]],
  estrelas: [[-9, 3.3, 62], [12, 2.3, 22], [12, 0.9, 90]],
  bandeiras: [[0, 1], [0, 24], [0, 60], [0, 84]],
  borrachas: [[6, -6, 6], [20, -6, 4], [26, 0, 8], [44, -8, 8], [52, -8, 8], [64, -4, 4], [86, -4, 4]],
  pastor: [-3, 85], cercado: R(-10.5, -5, 83, 90), escola: [3, 100],
  arvores: [[-14, 4, 0.3], [14, 6, 0.32], [-14, 22, 0.3], [14, 40, 0.3], [-12, 42, 0.3], [12, 54, 0.3], [-14, 66, 0.3], [14, 84, 0.32], [-14, 86, 0.3]],
  flores: [[-6, 6], [6, 8], [-6, 20], [6, 28], [-6, 44], [6, 52], [-6, 66], [8, 88], [-10, 54]],
  pedras: [[5, 3, 1], [-6, 12, 1.1], [10, 44, 0.9], [-12, 70, 1.2]],
});

const FABRICAS = { jardim, mar, pomar, floresta, fazenda, ceu, neve, deserto, noite, descanso };

export function cenarioDa(id) {
  return (FABRICAS[id] ?? jardim)();
}
