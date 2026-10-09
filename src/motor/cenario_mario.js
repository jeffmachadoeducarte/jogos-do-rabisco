// Cenário no estilo dos jogos clássicos de plataforma (tijolos, blocos "?", canos,
// morros, arbustos, mastro e castelo), desenhado em código no traço do Rabisco:
// contorno preto, cores chapadas e um brilho simples. Tudo em blocos de 64 px.

export const T = 64;
const TINTA = "#151515";

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

// Bloco com chanfro: luz em cima/esquerda, sombra embaixo/direita
function blocoChanfrado(c, x, y, s, base, luz, sombra) {
  c.fillStyle = base; c.fillRect(x, y, s, s);
  c.fillStyle = luz;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + s, y); c.lineTo(x + s - 7, y + 7); c.lineTo(x + 7, y + 7); c.lineTo(x + 7, y + s - 7); c.lineTo(x, y + s); c.fill();
  c.fillStyle = sombra;
  c.beginPath(); c.moveTo(x + s, y); c.lineTo(x + s, y + s); c.lineTo(x, y + s); c.lineTo(x + 7, y + s - 7); c.lineTo(x + s - 7, y + s - 7); c.lineTo(x + s - 7, y + 7); c.fill();
}

function parede(c, x0, y0, w, h, base, rejunte, alturaTijolo = 22, larguraTijolo = 44) {
  c.fillStyle = base; c.fillRect(x0, y0, w, h);
  c.strokeStyle = rejunte; c.lineWidth = 3;
  for (let y = y0, linha = 0; y < y0 + h; y += alturaTijolo, linha++) {
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke();
    const desloc = linha % 2 ? larguraTijolo / 2 : 0;
    for (let x = x0 + desloc; x < x0 + w; x += larguraTijolo) {
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, Math.min(y + alturaTijolo, y0 + h)); c.stroke();
    }
  }
}

export function criarTexturasMario(scene) {
  // Chão de blocos
  tex(scene, "chao-m", T, T, (c) => {
    blocoChanfrado(c, 0, 0, T, "#d9773a", "#f4a464", "#a14f1c");
    c.strokeStyle = "#7a3510"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(18, 16); c.lineTo(30, 26); c.lineTo(26, 40); c.stroke();
    c.beginPath(); c.moveTo(44, 36); c.lineTo(52, 48); c.stroke();
    c.strokeStyle = TINTA; c.lineWidth = 2; c.strokeRect(1, 1, T - 2, T - 2);
  });
  // Faixa de grama por cima do chão
  tex(scene, "grama-m", T, 24, (c, w) => {
    c.fillStyle = "#5fd13a";
    c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w, 12);
    for (let x = w; x >= 0; x -= 16) c.quadraticCurveTo(x - 8, 26, x - 16, 12);
    c.closePath(); c.fill();
    c.fillStyle = "#9cf06a"; c.fillRect(0, 0, w, 5);
    c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 2); c.lineTo(w, 2); c.stroke();
  });

  // Tijolo
  tex(scene, "tijolo", T, T, (c) => {
    parede(c, 0, 0, T, T, "#cf5f2a", "#4a1d08", 16, 32);
    c.fillStyle = "rgba(255,255,255,0.22)"; c.fillRect(3, 3, T - 6, 4);
    c.strokeStyle = TINTA; c.lineWidth = 4; c.strokeRect(2, 2, T - 4, T - 4);
  });

  // Bloco "?" (dois quadros para piscar) e bloco usado
  const blocoQ = (chave, base, luz) => tex(scene, chave, T, T, (c) => {
    retRed(c, 2, 2, T - 4, T - 4, 8);
    c.fillStyle = base; c.fill();
    c.fillStyle = luz; c.fillRect(8, 7, T - 16, 6);
    c.fillStyle = "#b85a00";
    for (const [x, y] of [[11, 11], [53, 11], [11, 53], [53, 53]]) { c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI * 2); c.fill(); }
    c.font = "900 44px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#b85a00"; c.fillText("?", 35, 37);
    c.lineWidth = 6; c.strokeStyle = TINTA; c.strokeText("?", 32, 34);
    c.fillStyle = "#ffffff"; c.fillText("?", 32, 34);
    retRed(c, 2, 2, T - 4, T - 4, 8); c.lineWidth = 4; c.strokeStyle = TINTA; c.stroke();
  });
  blocoQ("bloco-q", "#ffb81c", "#ffe08a");
  blocoQ("bloco-q2", "#ffcc4d", "#fff1c2");
  tex(scene, "bloco-usado", T, T, (c) => {
    blocoChanfrado(c, 2, 2, T - 4, "#a8663a", "#c98a55", "#7a4520");
    c.fillStyle = "#5a3215";
    for (const [x, y] of [[11, 11], [53, 11], [11, 53], [53, 53]]) { c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = TINTA; c.lineWidth = 4; c.strokeRect(2, 2, T - 4, T - 4);
  });
  // Bloco duro (escada)
  tex(scene, "duro", T, T, (c) => {
    blocoChanfrado(c, 0, 0, T, "#c8743c", "#eaa66b", "#8d4518");
    c.strokeStyle = TINTA; c.lineWidth = 3; c.strokeRect(1.5, 1.5, T - 3, T - 3);
  });

  // Cano verde: boca e corpo (o corpo repete na vertical)
  const verdeCano = (c, x, w, h, y = 0) => {
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "#2f9a2f"); g.addColorStop(0.18, "#8fe86a"); g.addColorStop(0.32, "#4fc93f");
    g.addColorStop(0.75, "#36a836"); g.addColorStop(1, "#1d6e22");
    c.fillStyle = g; c.fillRect(x, y, w, h);
  };
  tex(scene, "cano-boca", 140, T, (c, w, h) => {
    verdeCano(c, 3, w - 6, h - 6, 3);
    c.strokeStyle = TINTA; c.lineWidth = 5; c.strokeRect(3, 3, w - 6, h - 6);
  });
  tex(scene, "cano-corpo", 120, T, (c, w, h) => {
    verdeCano(c, 3, w - 6, h);
    c.fillStyle = TINTA; c.fillRect(0, 0, 5, h); c.fillRect(w - 5, 0, 5, h);
  });

  // Nuvem com contorno
  tex(scene, "nuvem-m", 300, 150, (c) => {
    const bolhas = [[70, 95, 42], [120, 70, 52], [185, 66, 48], [235, 95, 40], [150, 105, 45]];
    c.fillStyle = TINTA;
    for (const [x, y, r] of bolhas) { c.beginPath(); c.arc(x, y, r + 5, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = "#ffffff";
    for (const [x, y, r] of bolhas) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = "#d6efff";
    c.beginPath(); c.ellipse(150, 122, 95, 14, 0, 0, Math.PI * 2); c.fill();
  });

  // Morros arredondados com pintinhas
  const morro = (chave, w, h, cor, escura) => tex(scene, chave, w, h, (c) => {
    c.beginPath();
    c.moveTo(4, h);
    c.bezierCurveTo(4, h * 0.25, w * 0.25, 6, w / 2, 6);
    c.bezierCurveTo(w * 0.75, 6, w - 4, h * 0.25, w - 4, h);
    c.closePath();
    c.fillStyle = cor; c.fill();
    c.lineWidth = 6; c.strokeStyle = TINTA; c.stroke();
    c.fillStyle = escura;
    for (const [fx, fy, rx, ry] of [[0.36, 0.42, 0.05, 0.12], [0.62, 0.5, 0.05, 0.12], [0.5, 0.75, 0.04, 0.09], [0.28, 0.78, 0.04, 0.09], [0.72, 0.8, 0.04, 0.09]]) {
      c.beginPath(); c.ellipse(w * fx, h * fy, w * rx, h * ry, 0, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = "rgba(255,255,255,0.25)";
    c.beginPath(); c.ellipse(w * 0.4, h * 0.2, w * 0.12, h * 0.05, -0.4, 0, Math.PI * 2); c.fill();
  });
  morro("morro-grande", 520, 300, "#5cc13a", "#3a9227");
  morro("morro-pequeno", 300, 170, "#79d24f", "#4ea533");

  // Arbusto
  tex(scene, "arbusto", 280, 96, (c) => {
    const bolhas = [[60, 62, 38], [118, 46, 48], [178, 50, 44], [226, 64, 34]];
    c.fillStyle = TINTA;
    for (const [x, y, r] of bolhas) { c.beginPath(); c.arc(x, y, r + 5, 0, Math.PI * 2); c.fill(); }
    c.fillRect(20, 62, 244, 34);
    c.fillStyle = "#4fd23a";
    for (const [x, y, r] of bolhas) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    c.fillRect(26, 62, 232, 34);
    c.fillStyle = "#8cf06a";
    for (const [x, y] of [[100, 30], [165, 34], [55, 52]]) { c.beginPath(); c.ellipse(x, y, 12, 6, -0.4, 0, Math.PI * 2); c.fill(); }
  });

  // Mastro (com bola no topo) e bandeira da Educarte
  tex(scene, "mastro", 40, 7 * T, (c, w, h) => {
    c.fillStyle = TINTA; c.fillRect(w / 2 - 8, 24, 16, h - 24);
    c.fillStyle = "#c8f5c0"; c.fillRect(w / 2 - 5, 24, 10, h - 24);
    c.fillStyle = "#ffffff"; c.fillRect(w / 2 - 3, 24, 3, h - 24);
    c.beginPath(); c.arc(w / 2, 20, 17, 0, Math.PI * 2); c.fillStyle = TINTA; c.fill();
    c.beginPath(); c.arc(w / 2, 20, 13, 0, Math.PI * 2); c.fillStyle = "#3fbf3f"; c.fill();
    c.beginPath(); c.arc(w / 2 - 4, 15, 4, 0, Math.PI * 2); c.fillStyle = "#b9f5a0"; c.fill();
  });
  if (scene.textures.exists("icone-branco")) {
    tex(scene, "bandeira", 120, 84, (c) => {
      c.beginPath(); c.moveTo(4, 4); c.lineTo(116, 42); c.lineTo(4, 80); c.closePath();
      c.fillStyle = "#ec2e8c"; c.fill(); c.lineWidth = 5; c.strokeStyle = TINTA; c.stroke();
      c.drawImage(scene.textures.get("icone-branco").getSourceImage(), 14, 22, 40, 40);
    });
  }

  // Castelo-escola
  tex(scene, "castelo", 640, 560, (c) => {
    const tijolo = "#d98a4e", rejunte = "#7a3c14";
    const ameias = (x0, y, w, n) => {
      const largura = w / (n * 2 - 1);
      for (let i = 0; i < n; i++) {
        const x = x0 + i * largura * 2;
        c.fillStyle = TINTA; c.fillRect(x - 3, y - 3, largura + 6, 46);
        parede(c, x, y, largura, 40, tijolo, rejunte, 20, 30);
      }
    };
    // torre central
    ameias(190, 30, 260, 5);
    c.fillStyle = TINTA; c.fillRect(186, 66, 268, 210);
    parede(c, 190, 70, 260, 206, tijolo, rejunte);
    c.beginPath(); c.moveTo(290, 200); c.lineTo(290, 150); c.arc(320, 150, 30, Math.PI, 0); c.lineTo(350, 200); c.closePath();
    c.fillStyle = TINTA; c.fill();
    // corpo principal
    ameias(20, 236, 600, 9);
    c.fillStyle = TINTA; c.fillRect(16, 272, 608, 288);
    parede(c, 20, 276, 600, 284, tijolo, rejunte);
    // janelas em arco
    for (const x of [110, 530]) {
      c.beginPath(); c.moveTo(x - 30, 420); c.lineTo(x - 30, 360); c.arc(x, 360, 30, Math.PI, 0); c.lineTo(x + 30, 420); c.closePath();
      c.fillStyle = TINTA; c.fill();
      c.fillStyle = "#ffe08a"; c.fillRect(x - 3, 340, 6, 80);
    }
    // portão em arco
    c.beginPath(); c.moveTo(250, 560); c.lineTo(250, 440); c.arc(320, 440, 70, Math.PI, 0); c.lineTo(390, 560); c.closePath();
    c.fillStyle = TINTA; c.fill();
    // brilho
    c.fillStyle = "rgba(255,255,255,0.12)"; c.fillRect(20, 276, 600, 10);
  });
}
