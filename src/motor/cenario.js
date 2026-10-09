// Texturas do cenário desenhadas em código, no traço do Rabisco:
// contorno preto grosso, cores chapadas da paleta Educarte e uma sombra simples.

export const COR = {
  ciano: "#00b5f0", rosa: "#ec2e8c", laranja: "#ff7a00", pele: "#fce3c6",
  tinta: "#151515", branco: "#ffffff", amarelo: "#ffcc1f", verde: "#58c43a",
  verdeEscuro: "#3a9a2a", roxo: "#8e6cff", vermelho: "#e8413c", marrom: "#9a6232",
};
const TRACO = 5;

function tex(scene, chave, w, h, desenhar) {
  if (scene.textures.exists(chave)) return;
  const t = scene.textures.createCanvas(chave, w, h);
  const c = t.getContext();
  c.lineJoin = "round";
  c.lineCap = "round";
  desenhar(c, w, h);
  t.refresh();
}

function retRed(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function pintar(c, cor, traco = TRACO) {
  c.fillStyle = cor;
  c.fill();
  if (traco) { c.lineWidth = traco; c.strokeStyle = COR.tinta; c.stroke(); }
}

function escurecer(hex, f = 0.8) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

export function criarTexturas(scene) {
  // Nuvem
  tex(scene, "nuvem", 280, 130, (c) => {
    c.beginPath();
    c.arc(80, 80, 45, Math.PI * 0.5, Math.PI * 1.5);
    c.arc(130, 50, 45, Math.PI, Math.PI * 1.9);
    c.arc(195, 62, 40, Math.PI * 1.2, Math.PI * 0.1);
    c.arc(220, 90, 32, Math.PI * 1.5, Math.PI * 0.5);
    c.closePath();
    c.fillStyle = "#ffffff";
    c.fill();
    c.fillStyle = "rgba(0,120,200,0.10)";
    c.fillRect(40, 100, 200, 20);
  });

  // Morros (faixa que se repete)
  tex(scene, "morros", 1600, 300, (c, w, h) => {
    const morro = (base, amp, per, fase, cor) => {
      c.beginPath();
      c.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) c.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin((x / w) * Math.PI * 2 * per + fase)));
      c.lineTo(w, h);
      c.closePath();
      c.fillStyle = cor;
      c.fill();
    };
    morro(170, 110, 2, 0.4, "#9fe08a");
    morro(240, 90, 3, 1.7, "#7dd36a");
  });

  // Árvore
  tex(scene, "arvore", 240, 320, (c) => {
    c.beginPath(); c.moveTo(105, 318); c.lineTo(110, 190); c.lineTo(132, 190); c.lineTo(138, 318); c.closePath();
    pintar(c, COR.marrom);
    c.beginPath();
    c.arc(70, 150, 55, 0, Math.PI * 2); c.moveTo(220, 140);
    c.arc(170, 140, 55, 0, Math.PI * 2); c.moveTo(180, 80);
    c.arc(120, 85, 65, 0, Math.PI * 2);
    c.fillStyle = COR.tinta; c.fill();
    c.beginPath();
    c.arc(70, 150, 50, 0, Math.PI * 2); c.moveTo(215, 140);
    c.arc(170, 140, 50, 0, Math.PI * 2); c.moveTo(175, 80);
    c.arc(120, 85, 60, 0, Math.PI * 2);
    c.fillStyle = COR.verde; c.fill();
    c.fillStyle = "rgba(255,255,255,0.25)";
    c.beginPath(); c.arc(100, 60, 18, 0, Math.PI * 2); c.fill();
  });

  // Lápis gigantes do fundo (como na arte de divulgação do Rabisco)
  const coresLapis = { roxo: COR.roxo, vermelho: COR.vermelho, amarelo: COR.amarelo, azul: "#2f7de1", verde: COR.verde };
  for (const [nome, cor] of Object.entries(coresLapis)) {
    tex(scene, `lapis-${nome}`, 110, 460, (c) => {
      c.beginPath(); c.moveTo(55, 6); c.lineTo(100, 120); c.lineTo(10, 120); c.closePath();
      pintar(c, "#f3c99a");
      c.beginPath(); c.moveTo(55, 6); c.lineTo(68, 38); c.lineTo(42, 38); c.closePath();
      pintar(c, cor, 0);
      c.beginPath(); c.rect(10, 120, 90, 336);
      pintar(c, cor);
      c.fillStyle = escurecer(cor, 0.82); c.fillRect(70, 123, 27, 330);
      c.fillStyle = "rgba(255,255,255,0.25)"; c.fillRect(18, 123, 14, 330);
      c.strokeStyle = COR.tinta; c.lineWidth = 6;
      for (const y of [150, 170, 420]) { c.beginPath(); c.moveTo(10, y); c.lineTo(100, y); c.stroke(); }
    });
  }

  // Cerca de madeira
  tex(scene, "cerca", 256, 110, (c) => {
    c.beginPath(); c.rect(0, 40, 256, 16); pintar(c, "#e2914f", 4);
    c.beginPath(); c.rect(0, 78, 256, 16); pintar(c, "#e2914f", 4);
    for (let x = 8; x < 256; x += 42) {
      c.beginPath(); c.moveTo(x, 110); c.lineTo(x, 22); c.lineTo(x + 15, 6); c.lineTo(x + 30, 22); c.lineTo(x + 30, 110);
      pintar(c, "#f2a35e", 4);
    }
  });

  // Chão: grama + terra (repete na horizontal)
  tex(scene, "chao", 128, 140, (c, w, h) => {
    c.fillStyle = "#b8743c"; c.fillRect(0, 24, w, h);
    c.fillStyle = "#a5652f";
    for (const [x, y, r] of [[20, 70, 9], [80, 60, 7], [50, 110, 11], [110, 100, 6], [95, 128, 8]]) {
      c.beginPath(); c.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = COR.verde;
    c.beginPath(); c.moveTo(0, 0);
    for (let x = 0; x <= w; x += 16) c.quadraticCurveTo(x + 8, 40, x + 16, 30);
    c.lineTo(w, 0); c.closePath(); c.fill();
    c.fillStyle = "#7fe05c"; c.fillRect(0, 0, w, 8);
    c.strokeStyle = COR.tinta; c.lineWidth = 5;
    c.beginPath(); c.moveTo(0, 2); c.lineTo(w, 2); c.stroke();
  });

  // Bloco "?"
  const bloco = (chave, cor, interrogacao) => tex(scene, chave, 68, 68, (c) => {
    retRed(c, 3, 3, 62, 62, 10); pintar(c, cor);
    c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(10, 9, 48, 6);
    c.fillStyle = COR.tinta;
    for (const [x, y] of [[13, 13], [55, 13], [13, 55], [55, 55]]) { c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI * 2); c.fill(); }
    if (interrogacao) {
      c.font = "900 44px 'Baloo 2', system-ui";
      c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 7; c.strokeStyle = COR.tinta; c.strokeText("?", 34, 38);
      c.fillStyle = "#fff"; c.fillText("?", 34, 38);
    }
  });
  bloco("bloco", COR.laranja, true);
  bloco("bloco-vazio", "#c98a55", false);

  // Borracha (inimigo): metade rosa, metade azul
  tex(scene, "borracha", 96, 64, (c) => {
    retRed(c, 4, 10, 88, 50, 12); pintar(c, "#ff8fbf");
    c.save(); retRed(c, 4, 10, 88, 50, 12); c.clip();
    c.fillStyle = "#4fb6ff"; c.fillRect(56, 0, 50, 70);
    c.restore();
    retRed(c, 4, 10, 88, 50, 12); c.lineWidth = TRACO; c.strokeStyle = COR.tinta; c.stroke();
    c.beginPath(); c.moveTo(56, 12); c.lineTo(56, 58); c.stroke();
    for (const x of [24, 42]) {
      c.beginPath(); c.ellipse(x, 32, 7, 9, 0, 0, Math.PI * 2); pintar(c, "#fff", 3);
      c.beginPath(); c.arc(x - 2, 33, 3.5, 0, Math.PI * 2); c.fillStyle = COR.tinta; c.fill();
    }
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(15, 19); c.lineTo(29, 23); c.stroke();
    c.beginPath(); c.moveTo(51, 19); c.lineTo(37, 23); c.stroke();
  });

  // Bolha da letra
  tex(scene, "bolha", 104, 104, (c) => {
    c.beginPath(); c.arc(52, 52, 46, 0, Math.PI * 2);
    c.fillStyle = "rgba(255,255,255,0.85)"; c.fill();
    c.lineWidth = 6; c.strokeStyle = COR.rosa; c.stroke();
    c.beginPath(); c.arc(36, 32, 10, 0, Math.PI * 2); c.fillStyle = "rgba(255,255,255,0.9)"; c.fill();
  });

  // Escola
  tex(scene, "escola", 640, 520, (c) => {
    // torre
    c.beginPath(); c.rect(260, 70, 120, 200); pintar(c, "#ffd27a");
    c.beginPath(); c.moveTo(245, 80); c.lineTo(320, 6); c.lineTo(395, 80); c.closePath(); pintar(c, COR.vermelho);
    c.beginPath(); c.arc(320, 140, 30, 0, Math.PI * 2); pintar(c, "#9be7ff");
    c.beginPath(); c.moveTo(320, 110); c.lineTo(320, 170); c.moveTo(290, 140); c.lineTo(350, 140); c.lineWidth = 4; c.stroke();
    // prédio
    c.beginPath(); c.rect(40, 200, 560, 316); pintar(c, "#ffe3a3");
    c.beginPath(); c.moveTo(10, 215); c.lineTo(320, 120); c.lineTo(630, 215); c.closePath(); pintar(c, COR.vermelho);
    c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(42, 218, 556, 20);
    // janelas
    for (const x of [90, 470]) {
      for (const y of [270, 390]) {
        c.beginPath(); c.rect(x, y, 80, 70); pintar(c, "#9be7ff");
        c.beginPath(); c.moveTo(x + 40, y); c.lineTo(x + 40, y + 70); c.moveTo(x, y + 35); c.lineTo(x + 80, y + 35); c.lineWidth = 4; c.stroke();
      }
    }
    // degraus e batente da porta
    c.beginPath(); c.rect(230, 496, 180, 20); pintar(c, "#d9d9d9", 4);
    c.beginPath(); c.moveTo(245, 498); c.lineTo(245, 360); c.arc(320, 360, 75, Math.PI, 0); c.lineTo(395, 498); c.closePath();
    pintar(c, "#3b2a20");
  });

  // Porta (abre girando)
  tex(scene, "porta", 140, 210, (c) => {
    c.beginPath(); c.moveTo(4, 206); c.lineTo(4, 70); c.arc(70, 70, 66, Math.PI, 0); c.lineTo(136, 206); c.closePath();
    pintar(c, "#b0662e");
    c.strokeStyle = "rgba(0,0,0,0.25)"; c.lineWidth = 3;
    for (const x of [36, 70, 104]) { c.beginPath(); c.moveTo(x, 20); c.lineTo(x, 200); c.stroke(); }
    c.beginPath(); c.arc(112, 130, 7, 0, Math.PI * 2); pintar(c, COR.amarelo, 3);
  });

  // Ônibus escolar
  tex(scene, "onibus", 420, 230, (c) => {
    retRed(c, 6, 20, 400, 170, 26); pintar(c, COR.amarelo);
    c.beginPath(); c.rect(330, 90, 84, 100); pintar(c, COR.amarelo);
    c.fillStyle = COR.tinta; c.fillRect(8, 140, 404, 12);
    for (let i = 0; i < 4; i++) { retRed(c, 28 + i * 72, 42, 58, 56, 8); pintar(c, "#9be7ff", 4); }
    retRed(c, 330, 42, 60, 80, 8); pintar(c, "#9be7ff", 4);
    c.beginPath(); c.rect(396, 150, 20, 16); pintar(c, "#fff6a0", 3);
    for (const x of [90, 320]) {
      c.beginPath(); c.arc(x, 192, 32, 0, Math.PI * 2); pintar(c, "#333");
      c.beginPath(); c.arc(x, 192, 13, 0, Math.PI * 2); pintar(c, "#cfcfcf", 4);
    }
    c.font = "800 30px 'Baloo 2', system-ui"; c.textAlign = "center";
    c.fillStyle = COR.tinta; c.fillText("ESCOLAR", 170, 132);
  });

  // Livros (plataformas) — uma textura por largura
  // (criadas sob demanda por texturaLivros)

  // Partículas
  tex(scene, "brilho", 16, 16, (c) => {
    c.beginPath(); c.arc(8, 8, 6, 0, Math.PI * 2); c.fillStyle = "#fff"; c.fill();
  });
  tex(scene, "estrela", 40, 40, (c) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 8 : 18, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      c.lineTo(20 + Math.cos(a) * r, 20 + Math.sin(a) * r);
    }
    c.closePath(); pintar(c, COR.amarelo, 3);
  });
  tex(scene, "confete", 12, 20, (c) => { c.fillStyle = "#fff"; c.fillRect(0, 0, 12, 20); });
  tex(scene, "flor", 40, 46, (c) => {
    c.strokeStyle = COR.verdeEscuro; c.lineWidth = 4; c.beginPath(); c.moveTo(20, 46); c.lineTo(20, 22); c.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      c.beginPath(); c.arc(20 + Math.cos(a) * 9, 16 + Math.sin(a) * 9, 7, 0, Math.PI * 2); pintar(c, "#fff", 2.5);
    }
    c.beginPath(); c.arc(20, 16, 6, 0, Math.PI * 2); pintar(c, COR.amarelo, 2.5);
  });
}

const CORES_LIVRO = [COR.ciano, COR.rosa, COR.laranja, COR.roxo, COR.verde, COR.vermelho];

// Pilha de dois livros com a largura pedida (altura 60). Topo plano para pisar.
export function texturaLivros(scene, w, semente = 0) {
  const chave = `livros-${w}-${semente % CORES_LIVRO.length}`;
  tex(scene, chave, w + 8, 66, (c) => {
    const livro = (x, y, lw, lh, cor) => {
      retRed(c, x, y, lw, lh, 6); pintar(c, cor);
      c.fillStyle = "#fffaf0"; c.fillRect(x + lw - 16, y + 6, 10, lh - 12);
      c.strokeStyle = "rgba(0,0,0,0.25)"; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + lw - 15 + i * 3.5, y + 7); c.lineTo(x + lw - 15 + i * 3.5, y + lh - 7); c.stroke(); }
      c.fillStyle = "rgba(255,255,255,0.3)"; c.fillRect(x + 14, y + 7, lw * 0.35, 5);
    };
    const a = CORES_LIVRO[semente % CORES_LIVRO.length];
    const b = CORES_LIVRO[(semente + 2) % CORES_LIVRO.length];
    livro(10, 32, w - 14, 30, b);
    livro(4, 3, w - 6, 30, a);
  });
  return chave;
}
