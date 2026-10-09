// Modos do Rabisco Kart: a mesma corrida serve vários jogos do portal. Cada modo diz o que vai nas
// três placas de cada pórtico, o que aparece no alto da tela e o que o Rabisco fala.
// O modo vem de <html data-modo="..."> (pastas jogos/<id>/) ou de ?modo= na URL.
//
// pergunta(): { lista: [3 opções], certa: índice, hud: HTML da pergunta, fala, resposta: texto, quase: fala }
// placa(opção): desenha a opção no canvas da placa (256 × 256)

import { texturaCanvas } from "../../src/motor3d/toon.js";

const sorteio = (n) => Math.floor(Math.random() * n);
const embaralhar = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = sorteio(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const tres = (certa, todas) => {
  const outras = embaralhar(todas.filter((x) => x !== certa)).slice(0, 2);
  const lista = embaralhar([certa, ...outras]);
  return { lista, certa: lista.indexOf(certa) };
};

// ---------- Placas
function fundoPlaca(c, w, h, cor = "#ffffff") {
  c.fillStyle = "#151515";
  c.beginPath(); c.roundRect(6, 10, w - 12, h - 12, 40); c.fill();
  c.fillStyle = cor;
  c.beginPath(); c.roundRect(10, 4, w - 20, h - 20, 36); c.fill();
}
function textoPlaca(c, w, h, texto, { cor = "#ec2e8c", max = 170 } = {}) {
  let tam = max;
  c.font = `800 ${tam}px 'Baloo 2', sans-serif`;
  while (c.measureText(texto).width > w - 44 && tam > 30) { tam -= 6; c.font = `800 ${tam}px 'Baloo 2', sans-serif`; }
  c.textAlign = "center"; c.textBaseline = "middle";
  c.lineWidth = Math.max(6, tam / 12); c.strokeStyle = "#151515"; c.strokeText(texto, w / 2, h / 2 + 4);
  c.fillStyle = cor; c.fillText(texto, w / 2, h / 2 + 4);
}
const placaTexto = (texto, opts) => texturaCanvas(256, 256, (c, w, h) => { fundoPlaca(c, w, h); textoPlaca(c, w, h, String(texto), opts); });
const placaEmoji = (e) => texturaCanvas(256, 256, (c, w, h) => {
  fundoPlaca(c, w, h);
  c.font = "150px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(e, w / 2, h / 2 + 4);
});
const placaCor = (hex) => texturaCanvas(256, 256, (c, w, h) => {
  fundoPlaca(c, w, h);
  c.fillStyle = "#151515"; c.beginPath(); c.arc(w / 2, h / 2 - 4, 92, 0, Math.PI * 2); c.fill();
  c.fillStyle = hex; c.beginPath(); c.arc(w / 2, h / 2 - 4, 82, 0, Math.PI * 2); c.fill();
  c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath(); c.ellipse(w / 2 - 30, h / 2 - 38, 26, 14, -0.6, 0, Math.PI * 2); c.fill();
});

// ---------- Modos
const NUMEROS = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez"];

export const MODOS = {
  // Rabisco Kart (6 a 8 anos): adição e subtração até 10
  contas: {
    titulo: 'Rabisco <span>Kart</span>', sub: "Grande Prêmio da Escola", faixa: "alfabetizacao", voltas: 3, vmax: 31,
    dica: "Passe pelo número certo para ganhar turbo!", falaTitulo: "kart-titulo", unidade: "contas",
    pergunta() {
      const soma = Math.random() < 0.55;
      let a, b, r;
      if (soma) { r = 2 + sorteio(9); a = 1 + sorteio(r - 1); b = r - a; }
      else { a = 2 + sorteio(9); b = 1 + sorteio(a - 1); r = a - b; }
      const opcoes = new Set([r]);
      while (opcoes.size < 3) { const d = r + (Math.random() < 0.5 ? -1 : 1) * (1 + sorteio(3)); if (d >= 0 && d <= 10) opcoes.add(d); }
      const lista = embaralhar([...opcoes]);
      const texto = `${a} ${soma ? "+" : "−"} ${b}`;
      return { lista, certa: lista.indexOf(r), hud: `${texto} = <span class="q">?</span>`, fala: `conta-${a}-${soma ? "mais" : "menos"}-${b}`, resposta: `${texto} = ${r}`, quase: `quase-${r}` };
    },
    placa: (n) => placaTexto(n),
  },

  // Kart das Cores (1 ano e meio a 3 anos): passe pela cor que o Rabisco pedir
  cores: {
    titulo: 'Kart das <span>Cores</span>', sub: "Siga a cor que o Rabisco pedir!", faixa: "bem-pequenos", voltas: 2, vmax: 22, ajuda: 2.2,
    dica: "Passe pela cor certa!", falaTitulo: "kcor-titulo", unidade: "cores",
    cores: [
      { id: "vermelho", nome: "vermelho", hex: "#e63946" }, { id: "azul", nome: "azul", hex: "#1d6fe0" },
      { id: "amarelo", nome: "amarelo", hex: "#ffcc1f" }, { id: "verde", nome: "verde", hex: "#2bb24c" },
      { id: "rosa", nome: "rosa", hex: "#ec2e8c" }, { id: "laranja", nome: "laranja", hex: "#ff7a00" },
    ],
    pergunta() {
      const certa = this.cores[sorteio(this.cores.length)];
      const t = tres(certa, this.cores);
      return { ...t, hud: `<span class="bolinha" style="background:${certa.hex}"></span> ${certa.nome.toUpperCase()}`, fala: `kcor-${certa.id}`, resposta: `${certa.nome.toUpperCase()}!`, quase: `kcor-era-${certa.id}` };
    },
    placa: (cor) => placaCor(cor.hex),
  },

  // Corrida do Ônibus (4 e 5 anos): conte os amigos no ponto e passe pelo número certo
  onibus: {
    titulo: 'Corrida do <span>Ônibus</span>', sub: "Conte os amigos e leve todos para a escola!", faixa: "pequenos", voltas: 2, vmax: 26, ajuda: 1.6,
    dica: "Conte os amigos e passe pelo número certo!", falaTitulo: "kbus-titulo", unidade: "contagens", amigos: true,
    pergunta() {
      const r = 1 + sorteio(10);
      const opcoes = new Set([r]);
      while (opcoes.size < 3) { const d = r + (Math.random() < 0.5 ? -1 : 1) * (1 + sorteio(2)); if (d >= 1 && d <= 10) opcoes.add(d); }
      const lista = embaralhar([...opcoes]);
      const rostos = ["🧒", "👧", "👦", "🧒🏽", "👧🏾", "👦🏻", "🧒🏿", "👧🏼", "👦🏽", "🧒🏻"];
      const fila = embaralhar(rostos).slice(0, r).join("");
      return { lista, certa: lista.indexOf(r), hud: `<span class="amigos">${fila}</span>`, fala: "kbus-quantos", resposta: `${NUMEROS[r].toUpperCase()} amigos!`, quase: `quase-${r}`, ganho: r };
    },
    placa: (n) => placaTexto(n),
  },

  // English Kart Jr. (6 a 8 anos): ouça a palavra em inglês e passe pela figura certa
  "ingles-jr": {
    titulo: 'English <span>Kart Jr.</span>', sub: "Listen and drive through the right picture!", faixa: "alfabetizacao", voltas: 3, vmax: 28,
    dica: "Ouça a palavra em inglês e passe pela figura certa!", falaTitulo: "kingj-titulo", unidade: "palavras", ingles: true,
    palavras: [
      ["apple", "🍎"], ["dog", "🐶"], ["cat", "🐱"], ["ball", "⚽"], ["car", "🚗"], ["sun", "☀️"], ["fish", "🐟"], ["book", "📘"],
      ["star", "⭐"], ["house", "🏠"], ["tree", "🌳"], ["banana", "🍌"], ["bird", "🐦"], ["cake", "🎂"], ["duck", "🦆"], ["moon", "🌙"],
    ],
    pergunta() {
      const [palavra, e] = this.palavras[sorteio(this.palavras.length)];
      const t = tres(e, this.palavras.map((p) => p[1]));
      return { ...t, hud: `🔊 <span class="q">${palavra.toUpperCase()}</span>`, fala: `en-${palavra}`, resposta: `${palavra.toUpperCase()}!`, quase: `en-${palavra}` };
    },
    placa: (e) => placaEmoji(e),
  },

  // Rabisco Kart GP (9 a 12 anos): tabuada e capitais do Brasil
  gp: {
    titulo: 'Rabisco Kart <span>GP</span>', sub: "Campeonato Brasileiro", faixa: "maiores", voltas: 3, vmax: 34,
    dica: "Tabuada e capitais dão turbo!", falaTitulo: "kgp-titulo", unidade: "perguntas",
    capitais: [
      ["AC", "Acre", "Rio Branco"], ["AL", "Alagoas", "Maceió"], ["AP", "Amapá", "Macapá"], ["AM", "Amazonas", "Manaus"], ["BA", "Bahia", "Salvador"],
      ["CE", "Ceará", "Fortaleza"], ["DF", "Distrito Federal", "Brasília"], ["ES", "Espírito Santo", "Vitória"], ["GO", "Goiás", "Goiânia"],
      ["MA", "Maranhão", "São Luís"], ["MT", "Mato Grosso", "Cuiabá"], ["MS", "Mato Grosso do Sul", "Campo Grande"], ["MG", "Minas Gerais", "Belo Horizonte"],
      ["PA", "Pará", "Belém"], ["PB", "Paraíba", "João Pessoa"], ["PR", "Paraná", "Curitiba"], ["PE", "Pernambuco", "Recife"], ["PI", "Piauí", "Teresina"],
      ["RJ", "Rio de Janeiro", "Rio de Janeiro"], ["RN", "Rio Grande do Norte", "Natal"], ["RS", "Rio Grande do Sul", "Porto Alegre"], ["RO", "Rondônia", "Porto Velho"],
      ["RR", "Roraima", "Boa Vista"], ["SC", "Santa Catarina", "Florianópolis"], ["SP", "São Paulo", "São Paulo"], ["SE", "Sergipe", "Aracaju"], ["TO", "Tocantins", "Palmas"],
    ],
    pergunta() {
      if (Math.random() < 0.55) {
        const a = 2 + sorteio(8), b = 2 + sorteio(8), r = a * b;
        const opcoes = new Set([r]);
        for (const d of embaralhar([a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, r + 2, r - 2])) { if (opcoes.size < 3 && d > 0) opcoes.add(d); }
        const lista = embaralhar([...opcoes]);
        return { lista, certa: lista.indexOf(r), hud: `${a} × ${b} = <span class="q">?</span>`, fala: `tab-${a}-${b}`, resposta: `${a} × ${b} = ${r}`, quase: null };
      }
      const [uf, estado, capital] = this.capitais[sorteio(this.capitais.length)];
      const t = tres(capital, this.capitais.map((c) => c[2]));
      return { ...t, hud: `Capital de <span class="q">${estado}</span>?`, fala: `cap-${uf}`, resposta: `${estado}: ${capital}`, quase: null };
    },
    placa: (x) => placaTexto(x, { max: typeof x === "number" ? 150 : 96 }),
  },

  // English Kart (9 a 12 anos): leia a instrução em inglês para saber qual placa escolher
  ingles: {
    titulo: 'English <span>Kart</span>', sub: "Read the sign and choose the right gate!", faixa: "maiores", voltas: 3, vmax: 32,
    dica: "Leia em inglês e passe pela placa certa!", falaTitulo: "king-titulo", unidade: "frases", ingles: true,
    frases: [
      ["Something you can eat", "🍕", ["🚗", "📘", "⚽", "🪑"]], ["An animal that can fly", "🦅", ["🐶", "🐟", "🐢", "🐄"]],
      ["Something cold", "🧊", ["🔥", "☀️", "☕", "🌶️"]], ["You use it to write", "✏️", ["🍌", "🧦", "🎸", "🥄"]],
      ["It lives in the sea", "🐙", ["🦁", "🐓", "🐎", "🐘"]], ["You wear it on your feet", "👟", ["🎩", "🧤", "👓", "🧣"]],
      ["It shines at night", "🌙", ["☀️", "🌈", "🌧️", "🌪️"]], ["A vegetable", "🥕", ["🍰", "🍭", "🍩", "🍫"]],
      ["Something you drink", "🥛", ["🍞", "🧀", "🍗", "🥨"]], ["The biggest animal", "🐋", ["🐭", "🐜", "🐸", "🐝"]],
      ["It tells the time", "⏰", ["📷", "🔑", "📌", "🧲"]], ["You use it when it rains", "☂️", ["🕶️", "🩴", "🪁", "🏖️"]],
      ["A fruit that is yellow", "🍌", ["🍓", "🍇", "🍉", "🍒"]], ["It has four wheels", "🚗", ["🚲", "🛴", "✈️", "⛵"]],
      ["A musical instrument", "🎸", ["🔨", "🪣", "🧹", "🪜"]], ["You sleep in it", "🛏️", ["🛁", "🚪", "🪟", "🧺"]],
    ],
    pergunta() {
      const [frase, certa, erradas] = this.frases[sorteio(this.frases.length)];
      const lista = embaralhar([certa, ...embaralhar(erradas).slice(0, 2)]);
      return { lista, certa: lista.indexOf(certa), hud: `<span class="frase">${frase}</span>`, fala: null, resposta: `${frase}: ${certa}`, quase: null };
    },
    placa: (e) => placaEmoji(e),
  },
};

export function modoAtual() {
  const nome = new URLSearchParams(location.search).get("modo") || document.documentElement.dataset.modo || "contas";
  return { nome, ...(MODOS[nome] || MODOS.contas) };
}
