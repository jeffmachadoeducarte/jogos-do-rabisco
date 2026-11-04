// Arte INVENTADA das parceiras que não têm foto no jogo: nada aqui copia logotipo, fachada ou imagem de terceiros, é só o
// nome em texto e desenhos de canvas feitos para o jogo.
//  - desenharLetreiro: a placa de cada prédio na Rabiscolândia (jogos/rabiscopolis/predios-parceiros.js);
//  - desenharFoto: a fachada inteira, em desenho, que vira a "foto" do Kart (assets/parceiros/<id>.webp, gerada por
//    ferramentas/gerar_fotos_parceiros.mjs). Mudou um desenho? Rode o script e suba o ?v= em src/parceiros.js.
// Sem imports: roda no jogo e na página em branco do script.

const BALOO = "'Baloo 2', 'Trebuchet MS', sans-serif";
const SERIFA = "Georgia, 'Times New Roman', serif";

// escreve o texto no maior tamanho que couber em largura maxW (e altura tam)
function texto(c, t, x, y, maxW, tam, { fonte = BALOO, peso = 800, cor = "#fff", estilo = "", contorno = null, espaco = 0 } = {}) {
  let n = tam;
  const pega = () => { c.font = `${estilo} ${peso} ${n}px ${fonte}`; if ("letterSpacing" in c) c.letterSpacing = `${espaco}px`; };
  pega();
  while (c.measureText(t).width > maxW && n > 8) { n -= 2; pega(); }
  c.textAlign = "center"; c.textBaseline = "middle";
  if (contorno) { c.lineJoin = "round"; c.lineWidth = n * 0.14; c.strokeStyle = contorno; c.strokeText(t, x, y); }
  c.fillStyle = cor; c.fillText(t, x, y);
  if ("letterSpacing" in c) c.letterSpacing = "0px";
}
function moldura(c, w, h, e, cor) { c.lineWidth = e; c.strokeStyle = cor; c.strokeRect(e / 2, e / 2, w - e, h - e); }

// ---------------------------------------------------------------- desenhinhos (s = altura aproximada, em px)
function presente(c, x, y, s, cx = "#fff1d6", laco = "#f2b632") {
  c.fillStyle = cx; c.fillRect(x - s * 0.5, y - s * 0.25, s, s * 0.72);
  c.fillRect(x - s * 0.58, y - s * 0.42, s * 1.16, s * 0.22);
  c.fillStyle = laco; c.fillRect(x - s * 0.09, y - s * 0.42, s * 0.18, s * 0.89);
  c.beginPath(); c.ellipse(x - s * 0.22, y - s * 0.55, s * 0.24, s * 0.13, 0.5, 0, 7); c.ellipse(x + s * 0.22, y - s * 0.55, s * 0.24, s * 0.13, -0.5, 0, 7); c.fill();
}
function diamante(c, x, y, s, cor = "#e7c873") {
  c.strokeStyle = cor; c.lineWidth = s * 0.07; c.lineJoin = "round";
  c.beginPath(); c.moveTo(x - s * 0.5, y - s * 0.15); c.lineTo(x - s * 0.28, y - s * 0.45); c.lineTo(x + s * 0.28, y - s * 0.45); c.lineTo(x + s * 0.5, y - s * 0.15); c.lineTo(x, y + s * 0.5); c.closePath(); c.stroke();
  c.beginPath(); c.moveTo(x - s * 0.5, y - s * 0.15); c.lineTo(x + s * 0.5, y - s * 0.15); c.moveTo(x - s * 0.16, y - s * 0.15); c.lineTo(x, y + s * 0.5); c.lineTo(x + s * 0.16, y - s * 0.15); c.stroke();
}
function camisa(c, x, y, s, cor = "#ffffff", gola = "#ec2e8c") {
  c.fillStyle = cor;
  c.beginPath(); c.moveTo(x - s * 0.2, y - s * 0.5); c.lineTo(x - s * 0.58, y - s * 0.3); c.lineTo(x - s * 0.44, y - s * 0.05); c.lineTo(x - s * 0.3, y - s * 0.12); c.lineTo(x - s * 0.3, y + s * 0.5); c.lineTo(x + s * 0.3, y + s * 0.5); c.lineTo(x + s * 0.3, y - s * 0.12); c.lineTo(x + s * 0.44, y - s * 0.05); c.lineTo(x + s * 0.58, y - s * 0.3); c.lineTo(x + s * 0.2, y - s * 0.5); c.closePath(); c.fill();
  c.fillStyle = gola; c.beginPath(); c.moveTo(x - s * 0.2, y - s * 0.5); c.lineTo(x, y - s * 0.26); c.lineTo(x + s * 0.2, y - s * 0.5); c.closePath(); c.fill();
}
// três setas em roda (desenho genérico de "reaproveitar", feito aqui)
function setasRoda(c, x, y, s, cor = "#ffd23f") {
  c.strokeStyle = cor; c.fillStyle = cor; c.lineWidth = s * 0.16; c.lineCap = "butt";
  for (let i = 0; i < 3; i++) {
    const a0 = (i * Math.PI * 2) / 3 - 1.4, a1 = a0 + 1.45, r = s * 0.38;
    c.beginPath(); c.arc(x, y, r, a0, a1); c.stroke();
    const px = x + Math.cos(a1) * r, py = y + Math.sin(a1) * r, t = a1 + Math.PI / 2;
    c.beginPath(); c.moveTo(px + Math.cos(t) * s * 0.2, py + Math.sin(t) * s * 0.2); c.lineTo(px + Math.cos(t + 2.2) * s * 0.17, py + Math.sin(t + 2.2) * s * 0.17); c.lineTo(px + Math.cos(t - 2.2) * s * 0.17, py + Math.sin(t - 2.2) * s * 0.17); c.closePath(); c.fill();
  }
}
function livroAberto(c, x, y, s) {
  c.fillStyle = "#3f9fd0"; c.beginPath(); c.moveTo(x, y + s * 0.42); c.lineTo(x - s * 0.72, y + s * 0.26); c.lineTo(x - s * 0.72, y - s * 0.3); c.lineTo(x, y - s * 0.14); c.lineTo(x + s * 0.72, y - s * 0.3); c.lineTo(x + s * 0.72, y + s * 0.26); c.closePath(); c.fill();
  c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(x, y + s * 0.3); c.lineTo(x - s * 0.63, y + s * 0.15); c.lineTo(x - s * 0.63, y - s * 0.34); c.lineTo(x, y - s * 0.2); c.lineTo(x + s * 0.63, y - s * 0.34); c.lineTo(x + s * 0.63, y + s * 0.15); c.closePath(); c.fill();
  c.strokeStyle = "#f28a2e"; c.lineWidth = s * 0.05; for (const [a, b] of [[-0.5, -0.14], [-0.5, -0.02], [0.14, 0.5]]) { c.beginPath(); c.moveTo(x + s * a, y + (a < 0 ? s * 0.07 : s * 0.1) + b * 0); c.lineTo(x + s * b, y + s * 0.14); c.stroke(); }
  c.fillStyle = "#ffcf33"; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; c.beginPath(); c.arc(x + Math.cos(a) * s * 0.62, y - s * 0.2 + Math.sin(a) * s * 0.62, s * 0.065, 0, 7); c.fill(); }
}
// sapatilha de ponta, de lado: bico à direita, fita subindo do tornozelo
function sapatilha(c, x, y, s, flip = false) {
  c.save(); c.translate(x, y); if (flip) c.scale(-1, 1);
  c.strokeStyle = "#ffb6cf"; c.lineWidth = s * 0.05; c.lineCap = "round";
  c.beginPath(); c.moveTo(-s * 0.25, -s * 0.1); c.bezierCurveTo(-s * 0.55, -s * 0.5, -s * 0.05, -s * 0.5, -s * 0.2, -s * 0.72); c.stroke();
  c.beginPath(); c.moveTo(-s * 0.15, -s * 0.1); c.bezierCurveTo(s * 0.15, -s * 0.4, -s * 0.3, -s * 0.5, s * 0.05, -s * 0.74); c.stroke();
  c.fillStyle = "#ff9ec0";
  c.beginPath(); c.moveTo(-s * 0.48, s * 0.05); c.bezierCurveTo(-s * 0.5, -s * 0.2, -s * 0.2, -s * 0.2, -s * 0.05, -s * 0.05); c.bezierCurveTo(s * 0.15, -s * 0.03, s * 0.42, s * 0.03, s * 0.54, s * 0.14); c.bezierCurveTo(s * 0.58, s * 0.26, s * 0.34, s * 0.3, s * 0.08, s * 0.28); c.bezierCurveTo(-s * 0.16, s * 0.28, -s * 0.46, s * 0.28, -s * 0.48, s * 0.05); c.fill();
  c.fillStyle = "#ffd5e3"; c.beginPath(); c.ellipse(-s * 0.26, -s * 0.03, s * 0.17, s * 0.075, 0.1, 0, 7); c.fill();
  c.restore();
}
function estrela(c, x, y, r, cor) {
  c.fillStyle = cor; c.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, q = i % 2 ? r * 0.28 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  c.closePath(); c.fill();
}

// ferramentas da vitrine da Construrenova (desenhos simples feitos aqui): martelete, betoneira, gerador, escada e furadeira
function ferramenta(c, qual, x, y, s) {
  c.save(); c.translate(x, y); c.lineCap = c.lineJoin = "round";
  const L = "#f07a1a", E = "#2b2d31", A = "#8e98a2";
  if (qual === "martelete") { c.fillStyle = L; c.fillRect(-s * 0.18, -s * 0.42, s * 0.36, s * 0.42); c.fillStyle = E; c.fillRect(-s * 0.32, -s * 0.48, s * 0.64, s * 0.1); c.fillRect(-s * 0.05, 0, s * 0.1, s * 0.4); c.fillStyle = A; c.beginPath(); c.moveTo(-s * 0.05, s * 0.4); c.lineTo(s * 0.05, s * 0.4); c.lineTo(0, s * 0.5); c.fill(); }
  if (qual === "betoneira") { c.fillStyle = L; c.beginPath(); c.ellipse(0, -s * 0.08, s * 0.3, s * 0.24, -0.5, 0, 7); c.fill(); c.fillStyle = E; c.beginPath(); c.ellipse(s * 0.18, -s * 0.24, s * 0.1, s * 0.07, -0.5, 0, 7); c.fill(); c.strokeStyle = E; c.lineWidth = s * 0.06; c.beginPath(); c.moveTo(-s * 0.3, s * 0.42); c.lineTo(0, s * 0.12); c.lineTo(s * 0.3, s * 0.42); c.stroke(); c.fillStyle = E; c.beginPath(); c.arc(-s * 0.3, s * 0.42, s * 0.07, 0, 7); c.fill(); }
  if (qual === "gerador") { c.strokeStyle = E; c.lineWidth = s * 0.06; c.strokeRect(-s * 0.4, -s * 0.3, s * 0.8, s * 0.6); c.fillStyle = L; c.fillRect(-s * 0.3, -s * 0.2, s * 0.6, s * 0.36); c.fillStyle = E; c.fillRect(-s * 0.16, -s * 0.12, s * 0.32, s * 0.2); }
  if (qual === "escada") { c.strokeStyle = A; c.lineWidth = s * 0.06; c.beginPath(); c.moveTo(-s * 0.2, s * 0.48); c.lineTo(-s * 0.08, -s * 0.48); c.moveTo(s * 0.2, s * 0.48); c.lineTo(s * 0.08, -s * 0.48); for (let i = 0; i < 5; i++) { const q = -0.36 + i * 0.2; c.moveTo(-s * (0.17 - q * 0.12) , s * q); c.lineTo(s * (0.17 - q * 0.12), s * q); } c.stroke(); }
  if (qual === "furadeira") { c.fillStyle = L; c.fillRect(-s * 0.32, -s * 0.22, s * 0.48, s * 0.2); c.fillStyle = E; c.fillRect(-s * 0.14, -s * 0.04, s * 0.14, s * 0.38); c.fillStyle = A; c.fillRect(s * 0.16, -s * 0.15, s * 0.22, s * 0.06); }
  c.restore();
}

// figurinha redonda de item de missão (missoes.js): a betoneira e o carrinho de mão alugados na Construrenova
export function desenharItemObra(c, qual, x, y, s) {
  if (qual !== "carrinho") { ferramenta(c, qual, x, y, s); return; }
  c.save(); c.translate(x, y); c.lineCap = c.lineJoin = "round";
  c.fillStyle = "#4f5660"; c.beginPath(); c.moveTo(-s * 0.46, -s * 0.2); c.lineTo(s * 0.2, -s * 0.2); c.lineTo(s * 0.08, s * 0.14); c.lineTo(-s * 0.3, s * 0.14); c.fill();
  c.strokeStyle = "#2b2d31"; c.lineWidth = s * 0.07; c.beginPath(); c.moveTo(-s * 0.1, s * 0.12); c.lineTo(s * 0.46, s * 0.02); c.moveTo(-s * 0.2, s * 0.14); c.lineTo(-s * 0.16, s * 0.36); c.stroke();
  c.fillStyle = "#f07a1a"; c.beginPath(); c.arc(-s * 0.38, s * 0.28, s * 0.13, 0, 7); c.fill(); c.fillStyle = "#2b2d31"; c.beginPath(); c.arc(-s * 0.38, s * 0.28, s * 0.05, 0, 7); c.fill();
  c.restore();
}

// ---------------------------------------------------------------- letreiros
const LETREIROS = {
  "gala-presentes": (c, w, h) => {
    c.fillStyle = "#b81a46"; c.fillRect(0, 0, w, h); moldura(c, w, h, h * 0.06, "#f2b632");
    presente(c, h * 0.62, h * 0.54, h * 0.56);
    texto(c, "Gala Presentes", w / 2 + h * 0.36, h * 0.54, w - h * 1.5, h * 0.62, { cor: "#fff6e0" });
  },
  "see-love-joias": (c, w, h) => {
    c.fillStyle = "#141c33"; c.fillRect(0, 0, w, h); moldura(c, w, h, h * 0.05, "#d9b35a");
    diamante(c, h * 0.62, h * 0.5, h * 0.5);
    texto(c, "See Love", w / 2 + h * 0.3, h * 0.38, w - h * 1.5, h * 0.48, { fonte: SERIFA, peso: 700, estilo: "italic", cor: "#f6dc98" });
    texto(c, "SEMIJOIAS", w / 2 + h * 0.3, h * 0.72, w * 0.32, h * 0.18, { fonte: SERIFA, peso: 700, cor: "#ffffff", espaco: h * 0.03 });
  },
  "bella-company": (c, w, h) => {
    c.fillStyle = "#155a8c"; c.fillRect(0, 0, w, h);
    c.setLineDash([h * 0.09, h * 0.06]); c.lineWidth = h * 0.028; c.strokeStyle = "#ffffff"; c.strokeRect(h * 0.07, h * 0.07, w - h * 0.14, h * 0.86); c.setLineDash([]);
    camisa(c, h * 0.66, h * 0.52, h * 0.58);
    texto(c, "Bella Company", w / 2 + h * 0.36, h * 0.54, w - h * 1.5, h * 0.58, { cor: "#ffffff" });
  },
  "marlon-maquinas": (c, w, h) => {
    c.fillStyle = "#123f26"; c.fillRect(0, 0, w, h);
    for (let x = -h; x < w; x += h * 0.34) { c.fillStyle = "#ffd23f"; c.beginPath(); c.moveTo(x, h); c.lineTo(x + h * 0.17, h); c.lineTo(x + h * 0.29, h * 0.9); c.lineTo(x + h * 0.12, h * 0.9); c.fill(); }
    setasRoda(c, h * 0.6, h * 0.44, h * 0.72);
    texto(c, "Marlon Máquinas", w / 2 + h * 0.36, h * 0.45, w - h * 1.5, h * 0.62, { cor: "#ffffff" });
  },
  "cafe-com-deus-pai-kids": (c, w, h) => {
    c.fillStyle = "#fff6d8"; c.fillRect(0, 0, w, h); moldura(c, w, h, h * 0.06, "#3f9fd0");
    livroAberto(c, h * 0.72, h * 0.58, h * 0.6);
    texto(c, "Café com Deus Pai", w / 2 + h * 0.46, h * 0.36, w - h * 1.8, h * 0.4, { cor: "#1d4f7a" });
    texto(c, "Kids", w / 2 + h * 0.46, h * 0.72, w * 0.5, h * 0.44, { cor: "#e8641f" });
  },
  "ballet-e-cia": (c, w, h) => {
    const f = c.createLinearGradient(0, 0, 0, h); f.addColorStop(0, "#6d1f58"); f.addColorStop(1, "#47123a");
    c.fillStyle = f; c.fillRect(0, 0, w, h); moldura(c, w, h, h * 0.05, "#e5bd5a");
    sapatilha(c, h * 0.68, h * 0.56, h * 0.82);
    sapatilha(c, w - h * 0.68, h * 0.56, h * 0.82, true);
    texto(c, "Ballet e Cia", w / 2, h * 0.5, w - h * 2.5, h * 0.66, { fonte: SERIFA, peso: 700, estilo: "italic", cor: "#fff0f5" });
    for (const [x, y, r] of [[0.22, 0.2, 0.05], [0.78, 0.2, 0.05], [0.28, 0.84, 0.035], [0.72, 0.84, 0.035]]) estrela(c, w * x, h * y, h * r, "#f4d27a");
  },
  "bt-models": (c, w, h) => {
    c.fillStyle = "#121318"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#e7c35a"; c.fillRect(h * 0.1, h * 0.84, w - h * 0.2, h * 0.025); c.fillRect(h * 0.1, h * 0.1, w - h * 0.2, h * 0.025);
    texto(c, "BT Models", w / 2, h * 0.43, w - h * 0.7, h * 0.56, { fonte: SERIFA, peso: 700, cor: "#f8e3a0", espaco: h * 0.012 });
    texto(c, "PUBLICIDADE  ·  MODA", w / 2, h * 0.71, w * 0.62, h * 0.13, { fonte: BALOO, peso: 700, cor: "#ffffff", espaco: h * 0.012 });
  },
  "speedy-solucoes": (c, w, h) => {
    c.fillStyle = "#12263a"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#b8c2cc"; c.fillRect(0, 0, w, h * 0.05); c.fillRect(0, h * 0.95, w, h * 0.05);
    // caixilho de quatro vidros e riscos de velocidade (desenho feito aqui)
    const q = h * 0.56, x0 = h * 0.5, y0 = h * 0.22;
    c.fillStyle = "#8fd8f5"; c.fillRect(x0, y0, q, q);
    c.fillStyle = "rgba(255,255,255,0.65)"; c.beginPath(); c.moveTo(x0 + q * 0.1, y0 + q); c.lineTo(x0 + q * 0.55, y0); c.lineTo(x0 + q * 0.8, y0); c.lineTo(x0 + q * 0.35, y0 + q); c.fill();
    c.strokeStyle = "#e6ecf1"; c.lineWidth = h * 0.05; c.strokeRect(x0, y0, q, q);
    c.beginPath(); c.moveTo(x0 + q / 2, y0); c.lineTo(x0 + q / 2, y0 + q); c.moveTo(x0, y0 + q / 2); c.lineTo(x0 + q, y0 + q / 2); c.stroke();
    c.fillStyle = "#6fd0f2"; for (const [y, a] of [[0.34, 0.18], [0.5, 0.26], [0.66, 0.18]]) c.fillRect(h * 0.1, h * y - h * 0.018, h * a, h * 0.036);
    texto(c, "Speedy Soluções", w / 2 + h * 0.5, h * 0.46, w - h * 1.6, h * 0.62, { peso: 800, estilo: "italic", cor: "#ffffff" });
  },
  // faixa preta com CONSTRU (branco) RENOVA (laranja) e os serviços nas pontas; embaixo, a faixa clara da vitrine com as
  // ferramentas desenhadas. Sem telefone e sem mascote
  construrenova: (c, w, h) => {
    const fh = h * 0.64; // a faixa preta
    c.fillStyle = "#141416"; c.fillRect(0, 0, w, fh);
    c.fillStyle = "#f07a1a"; c.fillRect(0, fh - h * 0.035, w, h * 0.035);
    const lado = Math.min(w * 0.17, fh * 2.1), m = fh * 0.12;
    for (const [x, a] of [[m + lado / 2, "LOCAÇÃO DE"], [w - m - lado / 2, "VENDA DE"]]) {
      texto(c, a, x, fh * 0.34, lado, fh * 0.28, { cor: "#ffffff" });
      texto(c, "MÁQUINAS", x, fh * 0.66, lado, fh * 0.28, { cor: "#ffffff" });
    }
    c.fillStyle = "#f07a1a"; for (const x of [m * 2 + lado, w - m * 2 - lado]) c.fillRect(x - fh * 0.02, fh * 0.16, fh * 0.04, fh * 0.64);
    // CONSTRU + RENOVA no mesmo tamanho, juntos no meio
    const area = w - (m * 3 + lado) * 2;
    let n = fh * 0.82;
    const pega = () => { c.font = `800 ${n}px ${BALOO}`; };
    pega(); while (c.measureText("CONSTRURENOVA").width > area && n > 8) { n -= 2; pega(); }
    const a = c.measureText("CONSTRU").width, b = c.measureText("RENOVA").width, x0 = w / 2 - (a + b) / 2;
    c.textAlign = "left"; c.textBaseline = "middle";
    c.fillStyle = "#ffffff"; c.fillText("CONSTRU", x0, fh * 0.54);
    c.fillStyle = "#f07a1a"; c.fillText("RENOVA", x0 + a, fh * 0.54);
    // faixa da vitrine: painéis claros com as ferramentas
    const y0 = fh, vh = h - fh;
    c.fillStyle = "#eef1f3"; c.fillRect(0, y0, w, vh);
    const qs = ["martelete", "betoneira", "gerador", "escada", "furadeira", "martelete", "gerador", "betoneira", "escada", "furadeira"];
    const n2 = Math.max(4, Math.min(qs.length, Math.round(w / (vh * 1.5))));
    c.fillStyle = "#c3c9ce"; for (let i = 1; i < 3; i++) c.fillRect((w * i) / 3 - 2, y0, 4, vh);
    for (let i = 0; i < n2; i++) ferramenta(c, qs[i], (w * (i + 0.5)) / n2, y0 + vh * 0.5, vh * 0.78);
  },
  // Sítio Floresça: placa de madeira da porteira, com o nome da escola em cima, o do sítio grande no meio e "Festas e
  // eventos" embaixo; florzinhas nos cantos. Arte inventada (sem logotipo)
  "sitio-floresca": (c, w, h) => {
    c.fillStyle = "#7a4e2c"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#8a5a34"; for (let i = 0; i < 4; i++) c.fillRect(0, (h * i) / 4 + 2, w, h / 4 - 4); // tábuas
    c.strokeStyle = "rgba(60,34,16,0.45)"; c.lineWidth = Math.max(2, h * 0.012); for (let i = 0; i < 9; i++) { const y = ((i * 37) % 97) / 97 * h; c.beginPath(); c.moveTo((i * 131) % w, y); c.quadraticCurveTo(w / 2, y + h * 0.04, ((i * 211) % w), y + h * 0.02); c.stroke(); }
    moldura(c, w, h, h * 0.06, "#4f3018");
    texto(c, "ESCOLA DE CAMPO EDUCARTE", w / 2, h * 0.2, w * 0.82, h * 0.15, { cor: "#ffe9b0", espaco: 2 });
    texto(c, "Sítio Floresça", w / 2, h * 0.52, w * 0.78, h * 0.4, { cor: "#ffffff", contorno: "#3f2412" });
    texto(c, "Festas e eventos", w / 2, h * 0.83, w * 0.6, h * 0.15, { cor: "#bfe88a" });
    for (const [x, y, cor] of [[h * 0.2, h * 0.24, "#ff7ab0"], [w - h * 0.2, h * 0.24, "#ffd23f"], [h * 0.2, h * 0.76, "#ffd23f"]]) {
      c.fillStyle = cor; for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * h * 0.06, y + Math.sin(a) * h * 0.06, h * 0.055, 0, 7); c.fill(); }
      c.fillStyle = "#fff6c8"; c.beginPath(); c.arc(x, y, h * 0.045, 0, 7); c.fill();
    }
  },
};
// etiqueta do @ no canto de baixo do letreiro, só na "foto" do Kart. Na Rabiscolândia o @ tem placa própria na fachada
// (jogos/rabiscopolis/placas-instagram.js)
function etiquetaInstagram(c, w, h, instagram) {
  if (!instagram) return;
  const t = `@${instagram}`, a = h * 0.17;
  c.font = `700 ${a * 0.7}px ${BALOO}`;
  const lg = c.measureText(t).width + a * 0.8, x = w - lg - h * 0.05, y = h - a - h * 0.05;
  c.fillStyle = "#ffffff"; c.beginPath(); c.roundRect(x, y, lg, a, a / 2); c.fill();
  c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#151515"; c.fillText(t, x + lg / 2, y + a / 2 + a * 0.04);
}
export function desenharLetreiro(c, id, w, h) { c.clearRect(0, 0, w, h); LETREIROS[id](c, w, h); }

// ---------------------------------------------------------------- fachada inteira, para a foto do Kart
function vitrine(c, x, y, w, h, moldurar, fundo = "#a9dcf7") {
  c.fillStyle = moldurar; c.fillRect(x - 8, y - 8, w + 16, h + 16);
  c.fillStyle = fundo; c.fillRect(x, y, w, h);
  c.fillStyle = "rgba(255,255,255,0.35)"; c.beginPath(); c.moveTo(x + w * 0.12, y + h); c.lineTo(x + w * 0.42, y); c.lineTo(x + w * 0.6, y); c.lineTo(x + w * 0.3, y + h); c.fill();
}
function portaDesenho(c, x, y, w, h, cor, vidro = "#bfe6ff") {
  c.fillStyle = "#ffffff"; c.fillRect(x - 8, y - 8, w + 16, h + 8);
  c.fillStyle = cor; c.fillRect(x, y, w, h);
  c.fillStyle = vidro; c.fillRect(x + w * 0.1, y + h * 0.08, w * 0.34, h * 0.6); c.fillRect(x + w * 0.56, y + h * 0.08, w * 0.34, h * 0.6);
  c.fillStyle = "#ffcf33"; c.fillRect(x + w * 0.44, y + h * 0.48, w * 0.12, h * 0.05);
}
function toldoDesenho(c, x, y, w, h, a, b) {
  const n = Math.round(w / 56);
  for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? b : a; c.fillRect(x + (w / n) * i, y, w / n + 1, h); c.beginPath(); c.arc(x + (w / n) * (i + 0.5), y + h, w / n / 2, 0, Math.PI); c.fill(); }
}
function lacoDesenho(c, x, y, s, cor) {
  c.fillStyle = cor;
  for (const q of [-1, 1]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + q * s * 0.55, y - s * 0.26); c.lineTo(x + q * s * 0.55, y + s * 0.26); c.closePath(); c.fill(); }
  c.fillRect(x - s * 0.1, y - s * 0.12, s * 0.2, s * 0.24);
}
function cestaDesenho(c, x, y, s, fita) {
  c.strokeStyle = "#a8743a"; c.lineWidth = s * 0.08; c.beginPath(); c.arc(x, y + s * 0.12, s * 0.5, Math.PI, 0); c.stroke();
  [["#e0342b", -0.28], ["#ffb01f", 0], ["#58c43a", 0.28]].forEach(([k, d]) => { c.fillStyle = k; c.beginPath(); c.arc(x + d * s, y + s * 0.1, s * 0.17, 0, 7); c.fill(); });
  c.fillStyle = "#c08a4a"; c.fillRect(x - s * 0.55, y + s * 0.16, s * 1.1, s * 0.56);
  c.fillStyle = "#8f6330"; for (const q of [0.3, 0.46, 0.6]) c.fillRect(x - s * 0.55, y + s * q, s * 1.1, s * 0.04);
  lacoDesenho(c, x, y + s * 0.14, s * 0.5, fita);
}
function buqueDesenho(c, x, y, s, flor) {
  c.fillStyle = "#4cb83f"; c.beginPath(); c.arc(x, y + s * 0.08, s * 0.44, 0, 7); c.fill();
  [[-0.28, 0.02, flor], [0.28, 0.02, flor], [0, -0.18, "#ff5fa2"], [-0.14, 0.22, "#ffffff"], [0.16, 0.22, flor]].forEach(([a, b, k]) => { c.fillStyle = k; c.beginPath(); c.arc(x + a * s, y + b * s, s * 0.17, 0, 7); c.fill(); c.fillStyle = "#ffcf33"; c.beginPath(); c.arc(x + a * s, y + b * s, s * 0.06, 0, 7); c.fill(); });
  c.fillStyle = "#f2e2b8"; c.beginPath(); c.moveTo(x - s * 0.42, y + s * 0.3); c.lineTo(x + s * 0.42, y + s * 0.3); c.lineTo(x + s * 0.08, y + s * 1.05); c.lineTo(x - s * 0.08, y + s * 1.05); c.fill();
  lacoDesenho(c, x, y + s * 0.72, s * 0.5, "#c8234f");
}
const FOTOS = {
  "gala-presentes": (c, W, H) => {
    c.fillStyle = "#fff1d6"; c.fillRect(0, 0, W, H);
    const fy = H * 0.5; toldoDesenho(c, 30, fy - 16, W - 60, 44, "#c8234f", "#fff6e0");
    vitrine(c, 70, fy + 62, 300, 200, "#f2b632", "#ffe7ee"); vitrine(c, W - 370, fy + 62, 300, 200, "#f2b632", "#ffe7ee");
    cestaDesenho(c, 150, fy + 150, 100, "#ec2e8c"); cestaDesenho(c, 295, fy + 165, 84, "#2f8fe8");
    buqueDesenho(c, W - 300, fy + 140, 92, "#ff5f8f"); buqueDesenho(c, W - 200, fy + 130, 104, "#ffcc1f"); buqueDesenho(c, W - 110, fy + 145, 88, "#ffffff");
    portaDesenho(c, W / 2 - 80, fy + 62, 160, H - fy - 62, "#c8234f");
  },
  "see-love-joias": (c, W, H) => {
    c.fillStyle = "#1f2a44"; c.fillRect(0, 0, W, H);
    for (const x of [40, W - 70]) { c.fillStyle = "#d9b35a"; c.fillRect(x, H * 0.42, 30, H); }
    const fy = H * 0.5;
    vitrine(c, 120, fy + 40, 260, 230, "#d9b35a", "#2b1b3d"); vitrine(c, W - 380, fy + 40, 260, 230, "#d9b35a", "#2b1b3d");
    // semijoias e acessórios: brincos, colar, pulseira e anel, cada um no seu pedestal
    const Dx = "#f6d774";
    for (const x of [190, 310, W - 310, W - 190]) { c.fillStyle = "#d9b35a"; c.fillRect(x - 40, fy + 205, 80, 12); }
    c.strokeStyle = Dx; c.lineWidth = 7;
    for (const q of [-22, 22]) { c.beginPath(); c.arc(190 + q, fy + 145, 18, 0, 7); c.stroke(); c.fillStyle = "#ff8fb5"; c.beginPath(); c.arc(190 + q, fy + 173, 9, 0, 7); c.fill(); }
    c.beginPath(); c.arc(310, fy + 120, 42, 0.2, Math.PI - 0.2); c.stroke(); diamante(c, 310, fy + 178, 34, "#bff0ff");
    c.beginPath(); c.ellipse(W - 310, fy + 160, 44, 24, 0, 0, 7); c.stroke(); c.fillStyle = "#bff0ff"; for (const a of [0, 1.05, 2.1, 3.15, 4.2, 5.25]) { c.beginPath(); c.arc(W - 310 + Math.cos(a) * 44, fy + 160 + Math.sin(a) * 24, 6, 0, 7); c.fill(); }
    c.beginPath(); c.arc(W - 190, fy + 165, 26, 0, 7); c.stroke(); diamante(c, W - 190, fy + 124, 36, "#bff0ff");
    portaDesenho(c, W / 2 - 75, fy + 30, 150, H - fy - 30, "#d9b35a", "#141c33");
  },
  "bella-company": (c, W, H) => {
    c.fillStyle = "#dff1f7"; c.fillRect(0, 0, W, H);
    const fy = H * 0.5; toldoDesenho(c, 30, fy - 16, W - 60, 40, "#1f6fa8", "#ffffff");
    vitrine(c, 60, fy + 60, 310, 210, "#1f6fa8", "#8cc0dc"); vitrine(c, W - 370, fy + 60, 310, 210, "#1f6fa8", "#8cc0dc");
    for (const x of [130, 215, 300, W - 300, W - 215, W - 130]) camisa(c, x, fy + 165, 82, "#ffffff", "#ec2e8c");
    for (const x of [60, W - 370]) { c.fillStyle = "#6b7a88"; c.fillRect(x, fy + 96, 310, 7); }
    portaDesenho(c, W / 2 - 80, fy + 58, 160, H - fy - 58, "#1f6fa8");
  },
  "marlon-maquinas": (c, W, H) => {
    c.fillStyle = "#7f96a3"; c.fillRect(0, 0, W, H);
    c.fillStyle = "#6c8391"; for (let x = 0; x < W; x += 34) c.fillRect(x, 0, 12, H);
    const fy = H * 0.42, px = 60, pw = 640;
    c.fillStyle = "#2e3338"; c.fillRect(px, fy, pw, H - fy);
    for (let x = px - 22, i = 0; x < px + pw + 20; x += pw + 22, i++) for (let y = fy; y < H; y += 44) { c.fillStyle = (Math.floor(y / 44) % 2) ? "#ffd23f" : "#17181c"; c.fillRect(x, y, 22, 44); }
    c.fillStyle = "#ef7d1a"; c.fillRect(px + 90, H - 200, 450, 190);
    c.fillStyle = "#c85f0a"; for (let x = px + 110; x < px + 530; x += 46) c.fillRect(x, H - 188, 16, 166);
    c.fillStyle = "#c9d2da"; c.beginPath(); c.moveTo(px + 140, H - 290); c.lineTo(px + 300, H - 290); c.lineTo(px + 260, H - 200); c.lineTo(px + 180, H - 200); c.fill();
    texto(c, "UNIKA", px + 390, H - 110, 220, 74, { cor: "#ffffff", contorno: "#7a3b05" });
    for (let i = 0; i < 7; i++) { c.fillStyle = ["#7fd3f2", "#58c43a", "#bfe6ff"][i % 3]; c.fillRect(px + 170 + i * 15, H - 322 + (i % 2) * 14, 11, 34); }
    vitrine(c, 760, fy + 40, 210, 130, "#ffffff"); portaDesenho(c, 800, fy + 190, 130, H - fy - 190, "#2e9e57");
  },
  "cafe-com-deus-pai-kids": (c, W, H) => {
    c.fillStyle = "#ffe9b8"; c.fillRect(0, 0, W, H);
    const fy = H * 0.5;
    vitrine(c, 70, fy + 40, 300, 240, "#3f9fd0", "#fff9e8"); vitrine(c, W - 370, fy + 40, 300, 240, "#3f9fd0", "#fff9e8");
    const CL = ["#e8413c", "#2f8fe8", "#58c43a", "#ffb01f", "#8e6cff", "#ec2e8c"];
    for (const y of [fy + 100, fy + 180, fy + 262]) for (let i = 0; i < 11; i++) { c.fillStyle = CL[(i * 2 + y) % 6]; c.fillRect(84 + i * 25, y - 44, 21, 44); }
    c.fillStyle = "#e8641f"; c.beginPath(); c.ellipse(W - 270, fy + 240, 70, 40, 0, 0, 7); c.fill(); c.fillStyle = "#3f9fd0"; c.beginPath(); c.ellipse(W - 150, fy + 240, 70, 40, 0, 0, 7); c.fill();
    livroAberto(c, W - 210, fy + 120, 72);
    portaDesenho(c, W / 2 - 75, fy + 30, 150, H - fy - 30, "#b0702f");
  },
  "ballet-e-cia": (c, W, H) => {
    c.fillStyle = "#fbe4ec"; c.fillRect(0, 0, W, H);
    const fy = H * 0.44, pw = 440, px = W / 2 - pw / 2;
    c.fillStyle = "#e5bd5a"; c.fillRect(px - 16, fy - 16, pw + 32, H - fy + 16);
    c.fillStyle = "#2a0d24"; c.fillRect(px, fy, pw, H - fy);
    for (let i = 0; i < 10; i++) { const k = i < 5 ? i : 9 - i; c.fillStyle = i % 2 ? "#8c1f50" : "#a82a60"; const x = i < 5 ? px + i * 28 : px + pw - (10 - i) * 28; c.fillRect(x, fy, 28, H - fy); void k; }
    c.fillStyle = "#8c1f50"; c.fillRect(px, fy, pw, 36); c.fillStyle = "#e5bd5a"; c.fillRect(px, fy + 36, pw, 10);
    portaDesenho(c, W / 2 - 65, fy + 90, 130, H - fy - 90, "#5e1f4c", "#ffe7ee");
    for (const x of [90, W - 90]) { vitrine(c, x - 80, fy + 50, 160, 190, "#b5447e", "#fff5f8"); sapatilha(c, x, fy + 150, 110); }
    for (let i = 0; i < 9; i++) { c.fillStyle = "#fff4c4"; c.beginPath(); c.arc(px + 20 + i * (pw - 40) / 8, fy - 8, 7, 0, 7); c.fill(); }
  },
  "bt-models": (c, W, H) => {
    c.fillStyle = "#23242b"; c.fillRect(0, 0, W, H);
    c.fillStyle = "#e7c35a"; c.fillRect(0, H * 0.4, W, 7);
    const fy = H * 0.43;
    // cartazes de campanha: só formas abstratas
    const cartaz = (x, y, w, h, a, b, d) => { c.fillStyle = "#ffffff"; c.fillRect(x - 6, y - 6, w + 12, h + 12); c.fillStyle = a; c.fillRect(x, y, w, h); c.fillStyle = b; c.fillRect(x + w * 0.16, y + h * 0.14, w * 0.68, h * 0.3); c.fillStyle = a; c.fillRect(x + w * 0.32, y + h * 0.21, w * 0.36, h * 0.16); c.fillStyle = d; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + w, y + h * 0.56); c.lineTo(x + w, y + h); c.fill(); };
    cartaz(50, fy + 30, 190, 280, "#e6396b", "#ffd23f", "#17181c");
    cartaz(W - 240, fy + 30, 190, 280, "#2f8fe8", "#ffffff", "#e7c35a");
    // entrada com a passarela e o tapete
    const px = W / 2 - 200; c.fillStyle = "#101116"; c.fillRect(px, fy + 16, 400, H - fy);
    c.fillStyle = "#d9d3c4"; c.fillRect(px + 110, fy + 60, 180, 120);
    c.fillStyle = "#a01a3c"; c.beginPath(); c.moveTo(W / 2 - 50, fy + 180); c.lineTo(W / 2 + 50, fy + 180); c.lineTo(W / 2 + 150, H); c.lineTo(W / 2 - 150, H); c.fill();
    c.strokeStyle = "#e7c35a"; c.lineWidth = 7; c.beginPath(); c.moveTo(W / 2 - 50, fy + 180); c.lineTo(W / 2 - 150, H); c.moveTo(W / 2 + 50, fy + 180); c.lineTo(W / 2 + 150, H); c.stroke();
    c.fillStyle = "#e7c35a"; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const q = 70 + i * 40; c.fillRect(W / 2 + s * (70 + i * 34) - 3, fy + 180 + i * 50, 7, 40 + i * 6); c.beginPath(); c.arc(W / 2 + s * (70 + i * 34), fy + 180 + i * 50, 7, 0, 7); c.fill(); void q; }
    c.fillStyle = "#fff4c4"; for (const x of [-140, -60, 60, 140]) { c.beginPath(); c.arc(W / 2 + x, fy + 32, 11, 0, 7); c.fill(); }
  },
  "speedy-solucoes": (c, W, H) => {
    c.fillStyle = "#3a4653"; c.fillRect(0, 0, W, H);
    const fy = H * 0.38, cols = 7, lin = 3, m = 40, w = (W - m * 2) / cols, h = (H - fy) / lin;
    c.fillStyle = "#7cc6ea"; c.fillRect(m, fy, W - m * 2, H - fy);
    c.fillStyle = "rgba(255,255,255,0.28)"; for (let i = 0; i < 5; i++) { const x = m + 60 + i * 190; c.beginPath(); c.moveTo(x, H); c.lineTo(x + 120, fy); c.lineTo(x + 170, fy); c.lineTo(x + 50, H); c.fill(); }
    c.fillStyle = "#d3dae0"; for (let i = 0; i <= cols; i++) c.fillRect(m + i * w - 5, fy, 10, H - fy); for (let k = 0; k <= lin; k++) c.fillRect(m, fy + k * h - 5, W - m * 2, 10);
    portaDesenho(c, W / 2 - 90, H - 180, 180, 180, "#b8c2cc", "#bfe6ff");
    for (const x of [130, W - 130]) { c.strokeStyle = "#5a4630"; c.lineWidth = 12; c.beginPath(); c.moveTo(x - 40, H); c.lineTo(x, H - 170); c.lineTo(x + 40, H); c.stroke(); c.fillStyle = "rgba(180,228,250,0.92)"; c.fillRect(x - 54, H - 150, 108, 134); c.strokeStyle = "#e6ecf1"; c.lineWidth = 7; c.strokeRect(x - 54, H - 150, 108, 134); }
  },
};
// Construrenova (fora do FOTOS acima por ser a mais longa): galpão cinza-claro de painéis, pele de vidro com a moldura laranja
// à esquerda, portão do galpão com toldo à direita; na calçada, betoneira laranja e carrinhos de mão
FOTOS.construrenova = (c, W, H) => {
  c.fillStyle = "#d9dcdf"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#c4c8cc"; for (let y = 40; y < H; y += 58) c.fillRect(0, y, W, 4);
  const fx = 24, fw = 600, fy = H * 0.4;
  c.fillStyle = "#f07a1a"; c.fillRect(fx, fy - 30, fw, H - fy + 30);
  c.fillStyle = "#33414d"; c.fillRect(fx + 30, fy, fw - 60, 120);
  c.fillStyle = "rgba(255,255,255,0.18)"; for (let i = 0; i < 4; i++) { const x = fx + 70 + i * 140; c.beginPath(); c.moveTo(x, fy + 120); c.lineTo(x + 70, fy); c.lineTo(x + 105, fy); c.lineTo(x + 35, fy + 120); c.fill(); }
  c.fillStyle = "#1c242c"; for (let i = 1; i < 6; i++) c.fillRect(fx + 30 + ((fw - 60) * i) / 6 - 3, fy, 6, 120); c.fillRect(fx + 30, fy + 58, fw - 60, 5);
  const vy = fy + 120, vh = H - vy;
  c.fillStyle = "#cfd8de"; c.fillRect(fx + 30, vy, fw - 60, vh);
  c.strokeStyle = "#7d868e"; c.lineWidth = 3;
  for (let x = fx + 30; x <= fx + fw - 30; x += 22) { c.beginPath(); c.moveTo(x, vy + 10); c.lineTo(x, H); c.stroke(); }
  for (let y = vy + 10; y <= H; y += 22) { c.beginPath(); c.moveTo(fx + 30, y); c.lineTo(fx + fw - 30, y); c.stroke(); }
  c.fillStyle = "#2b2f35"; c.fillRect(fx + 250, vy + 10, 100, vh - 10);
  // portão do galpão e o toldo
  const px = 700, pw = 290, py = H * 0.5;
  c.fillStyle = "#3a3f45"; c.fillRect(px, py, pw, H - py);
  c.fillStyle = "#4c535a"; c.fillRect(px + 14, py + 14, pw - 28, H - py - 14);
  c.fillStyle = "#a7adb3"; c.beginPath(); c.moveTo(px - 16, py - 6); c.lineTo(px + pw + 16, py - 6); c.lineTo(px + pw + 30, py + 36); c.lineTo(px - 30, py + 36); c.fill();
  c.fillStyle = "#8e959b"; for (let x = px - 20; x < px + pw + 20; x += 18) c.fillRect(x, py - 4, 6, 40);
  // betoneira e carrinhos de mão na calçada
  ferramenta(c, "betoneira", fx + 420, H - 60, 120);
  for (const x of [fx + 80, fx + 175]) {
    c.fillStyle = "#3c4148"; c.beginPath(); c.moveTo(x - 46, H - 70); c.lineTo(x + 40, H - 70); c.lineTo(x + 24, H - 34); c.lineTo(x - 30, H - 34); c.fill();
    c.strokeStyle = "#2b2d31"; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 30, H - 40); c.lineTo(x + 70, H - 26); c.stroke();
    c.fillStyle = "#f07a1a"; c.beginPath(); c.arc(x - 36, H - 22, 14, 0, 7); c.fill();
  }
};
// Sítio Floresça: gramado, a estradinha de terra até o celeiro de madeira com portas amarelas, a casa de tijolinho à
// esquerda, o portão de tela com palanques e o pinheiro alto
FOTOS["sitio-floresca"] = (c, W, H) => {
  const g = c.createLinearGradient(0, 0, 0, H * 0.6); g.addColorStop(0, "#7cc8f2"); g.addColorStop(1, "#d8f0ff");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = "#3f7d3a"; for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(i * 80 + 20, H * 0.5, 70 + (i % 3) * 18, 0, 7); c.fill(); } // mata ao fundo
  c.fillStyle = "#6cbf4a"; c.fillRect(0, H * 0.56, W, H * 0.44); // gramado
  c.fillStyle = "#b9a27a"; c.beginPath(); c.moveTo(W * 0.47, H * 0.6); c.lineTo(W * 0.53, H * 0.6); c.lineTo(W * 0.66, H); c.lineTo(W * 0.34, H); c.fill(); // estradinha
  // celeiro de madeira: tábuas, telha laranja e as portas amarelas
  const bx = W * 0.5, by = H * 0.6;
  c.fillStyle = "#9a7350"; c.fillRect(bx - 20, by - 110, 260, 110);
  c.strokeStyle = "#6e4f34"; c.lineWidth = 3; for (let x = bx - 14; x < bx + 240; x += 14) { c.beginPath(); c.moveTo(x, by - 110); c.lineTo(x, by); c.stroke(); }
  c.fillStyle = "#d0643a"; c.beginPath(); c.moveTo(bx - 34, by - 106); c.lineTo(bx + 110, by - 176); c.lineTo(bx + 254, by - 106); c.fill();
  c.fillStyle = "#e8b547"; for (const x of [bx + 60, bx + 112]) { c.fillRect(x, by - 74, 48, 74); c.strokeStyle = "#a87a25"; c.lineWidth = 5; c.beginPath(); c.moveTo(x, by - 74); c.lineTo(x + 48, by); c.moveTo(x + 48, by - 74); c.lineTo(x, by); c.stroke(); }
  // casa de tijolinho à esquerda: telha escura e janelas de moldura escura
  const hx = W * 0.06, hy = H * 0.66;
  c.fillStyle = "#b5583a"; c.fillRect(hx, hy - 120, 300, 120);
  c.strokeStyle = "#d8c8b0"; c.lineWidth = 2; for (let y = hy - 112; y < hy; y += 12) { c.beginPath(); c.moveTo(hx, y); c.lineTo(hx + 300, y); c.stroke(); }
  c.fillStyle = "#3e302c"; c.beginPath(); c.moveTo(hx - 16, hy - 116); c.lineTo(hx + 150, hy - 196); c.lineTo(hx + 316, hy - 116); c.fill();
  c.fillStyle = "#2d2622"; for (const x of [hx + 30, hx + 130, hx + 230]) c.fillRect(x, hy - 92, 44, 54);
  c.fillStyle = "#c9a46a"; c.fillRect(hx + 136, hy - 168, 28, 24); // caixinha de madeira no oitão
  // pinheiro alto
  c.fillStyle = "#6b4a2e"; c.fillRect(W * 0.88, H * 0.12, 14, H * 0.5);
  c.fillStyle = "#2f6a35"; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(W * 0.88 + 7, H * 0.16 + i * 48, 60 - i * 4, 24, 0, 0, 7); c.fill(); }
  // cerca de tela com palanques e o portão de moldura metálica
  c.strokeStyle = "#8a6440"; c.lineWidth = 10; for (let x = 20; x < W; x += 110) { c.beginPath(); c.moveTo(x, H * 0.78); c.lineTo(x, H); c.stroke(); }
  c.strokeStyle = "rgba(160,170,176,0.7)"; c.lineWidth = 2; for (let x = 0; x < W; x += 16) { c.beginPath(); c.moveTo(x, H * 0.8); c.lineTo(x, H); c.stroke(); } for (let y = H * 0.8; y < H; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.strokeStyle = "#d9dee2"; c.lineWidth = 7; for (const x of [W * 0.38, W * 0.5]) c.strokeRect(x, H * 0.8, W * 0.12, H * 0.2);
};
// a foto: fachada desenhada, com o letreiro em cima (legível de longe na beira da pista)
export function desenharFoto(c, id, W, H, { instagram = null } = {}) {
  FOTOS[id](c, W, H);
  const lh = H * 0.34, lw = W - 60, ly = 18;
  c.save(); c.translate(30, ly);
  LETREIROS[id](c, lw, lh); etiquetaInstagram(c, lw, lh, instagram);
  c.restore();
}
export const IDS_ARTE = Object.keys(LETREIROS);
