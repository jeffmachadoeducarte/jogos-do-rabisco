// Camarim: o Rabisco de frente (assets/rabisco/poses/frente.png, 284 × 900) com roupas desenhadas por cima.
// Cada roupa é um SVG nas mesmas coordenadas da imagem e ocupa um lugar do corpo (slot); vestir outra
// roupa no mesmo lugar troca a anterior. Usado pelos jogos de vestir (Cadê o Boné?, Veste o Rabisco,
// Camarim das Profissões, Lojinha do Camarim e Rabisco Estilista).
//
//   const r = montarRabisco(onde);  r.vestir("capa-chuva");  r.tirar("corpo");  r.vestido("galochas");

const RAIZ = new URL("../../", import.meta.url).href;
const NS = "http://www.w3.org/2000/svg";

// ordem de desenho: o que vem depois fica por cima
export const SLOTS = ["pernas", "pes", "corpo", "cintura", "pescoco", "olhos", "cabeca", "mao"];

const PERNA = "M58,598 H226 L222,800 H152 L142,690 L132,800 H62Z";
const TRONCO = "M30,378 Q142,352 254,378 L280,622 Q142,644 4,622Z";
const bota = (cor, extra = "") => `
  <path d="M28,770 H112 V858 Q112,892 80,892 H14 Q-4,892 4,866 L28,850Z" fill="${cor}"/>
  <path d="M172,770 H256 V850 L280,866 Q288,892 270,892 H204 Q172,892 172,858Z" fill="${cor}"/>${extra}`;

export const ROUPAS = {
  // ---------- cabeça (abaixo da ponta do lápis, como o boné original)
  "capacete-bombeiro": { nome: "Capacete de bombeiro", slot: "cabeca", icone: "⛑️", svg: `
    <path d="M48,256 Q52,138 142,128 Q232,138 236,256Z" fill="#e63946"/>
    <path d="M14,254 Q142,224 270,254 Q272,282 142,272 Q12,282 14,254Z" fill="#b5172a"/>
    <path d="M142,150 l20,15 -8,24 h-24 l-8,-24z" fill="#ffcc1f"/>` },
  "chapeu-chef": { nome: "Chapéu de chef", slot: "cabeca", icone: "👨‍🍳", svg: `
    <path d="M70,258 V176 Q26,160 48,110 Q60,58 106,72 Q120,14 166,30 Q218,18 228,80 Q266,106 214,176 V258Z" fill="#ffffff"/>
    <rect x="68" y="220" width="148" height="40" rx="8" fill="#ffffff"/>` },
  "capacete-astronauta": { nome: "Capacete de astronauta", slot: "cabeca", icone: "👩‍🚀", svg: `
    <circle cx="142" cy="196" r="150" fill="rgba(170,225,255,0.38)"/>
    <path d="M60,118 Q90,70 140,62" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
    <rect x="36" y="316" width="212" height="44" rx="20" fill="#e8e8e8"/>` },
  sueste: { nome: "Chapéu de chuva", slot: "cabeca", icone: "🟡", svg: `
    <path d="M42,252 Q60,146 142,140 Q224,146 242,252Z" fill="#ffcc1f"/>
    <path d="M4,250 Q142,214 280,250 Q282,284 142,274 Q2,284 4,250Z" fill="#f2b705"/>` },
  gorro: { nome: "Gorro de lã", slot: "cabeca", icone: "🧶", svg: `
    <path d="M56,256 Q58,138 142,132 Q226,138 228,256Z" fill="#e63946"/>
    <rect x="50" y="224" width="184" height="38" rx="12" fill="#ffffff"/>
    <path d="M70,190 h144 M64,160 h156" stroke="#ffffff" stroke-width="10" fill="none"/>
    <circle cx="142" cy="128" r="24" fill="#ffffff"/>` },
  "chapeu-sol": { nome: "Chapéu de sol", slot: "cabeca", icone: "👒", svg: `
    <ellipse cx="142" cy="244" rx="138" ry="30" fill="#f2d16b"/>
    <path d="M78,240 Q84,160 142,156 Q200,160 206,240Z" fill="#f2d16b"/>
    <path d="M80,222 Q142,232 204,222 L206,240 Q142,250 78,240Z" fill="#ec2e8c"/>` },
  coroa: { nome: "Coroa", slot: "cabeca", icone: "👑", svg: `
    <path d="M66,256 L56,158 L102,204 L142,140 L182,204 L228,158 L218,256Z" fill="#ffcc1f"/>
    <circle cx="142" cy="226" r="12" fill="#e63946"/><circle cx="98" cy="232" r="9" fill="#1d6fe0"/><circle cx="186" cy="232" r="9" fill="#2bb24c"/>` },
  "bone-time": { nome: "Boné do time", slot: "cabeca", icone: "🧢", svg: `
    <path d="M62,250 Q66,150 142,144 Q218,150 222,250Z" fill="#1fc08e"/>
    <path d="M150,250 Q240,232 282,262 Q240,280 150,266Z" fill="#14966d"/>
    <circle cx="142" cy="200" r="20" fill="#ffffff"/>` },

  // ---------- olhos
  "oculos-sol": { nome: "Óculos de sol", slot: "olhos", icone: "🕶️", svg: `
    <rect x="66" y="266" width="70" height="52" rx="18" fill="#222"/>
    <rect x="148" y="266" width="70" height="52" rx="18" fill="#222"/>
    <path d="M136,284 h12" stroke="#151515" stroke-width="8"/>
    <path d="M80,276 l20,0" stroke="#fff" stroke-width="6" stroke-linecap="round"/>` },

  // ---------- pescoço
  cachecol: { nome: "Cachecol", slot: "pescoco", icone: "🧣", svg: `
    <path d="M56,344 Q142,380 228,344 L230,382 Q142,416 54,382Z" fill="#1d6fe0"/>
    <path d="M170,372 h40 l10,104 h-40Z" fill="#1d6fe0"/>
    <path d="M176,456 h40" stroke="#fff" stroke-width="8"/>` },
  estetoscopio: { nome: "Estetoscópio", slot: "pescoco", icone: "🩺", svg: `
    <path d="M92,356 Q96,476 142,484 Q188,476 192,356" fill="none" stroke="#151515" stroke-width="16" stroke-linecap="round"/>
    <path d="M92,356 Q96,476 142,484 Q188,476 192,356" fill="none" stroke="#9aa3ad" stroke-width="8" stroke-linecap="round"/>
    <circle cx="142" cy="500" r="20" fill="#9aa3ad"/>` },

  // ---------- corpo
  "capa-chuva": { nome: "Capa de chuva", slot: "corpo", icone: "🧥", svg: `
    <path d="${TRONCO}" fill="#ffcc1f"/>
    <path d="M142,372 V636" stroke="#151515" stroke-width="5"/>
    <circle cx="124" cy="440" r="7" fill="#151515"/><circle cx="124" cy="510" r="7" fill="#151515"/><circle cx="124" cy="580" r="7" fill="#151515"/>` },
  casaco: { nome: "Casaco de frio", slot: "corpo", icone: "🧥", svg: `
    <path d="${TRONCO}" fill="#e63946"/>
    <path d="M30,378 Q142,352 254,378 L250,404 Q142,382 34,404Z" fill="#ffffff"/>
    <path d="M6,600 Q142,622 278,600 L280,622 Q142,644 4,622Z" fill="#ffffff"/>
    <path d="M142,392 V632" stroke="#ffcc1f" stroke-width="8"/>` },
  jaleco: { nome: "Jaleco de médico", slot: "corpo", icone: "🥼", svg: `
    <path d="M30,378 Q142,354 254,378 L272,704 H12Z" fill="#ffffff"/>
    <path d="M110,372 L142,470 L174,372" fill="#bfe6ff"/>
    <path d="M142,470 V704" stroke="#151515" stroke-width="5"/>
    <rect x="166" y="560" width="54" height="40" rx="6" fill="#ffffff"/>
    <path d="M70,520 h34 M87,503 v34" stroke="#e63946" stroke-width="10"/>` },
  "farda-bombeiro": { nome: "Farda de bombeiro", slot: "corpo", icone: "🚒", svg: `
    <path d="${TRONCO}" fill="#c1121f"/>
    <rect x="10" y="560" width="264" height="22" fill="#ffcc1f"/>
    <rect x="44" y="460" width="196" height="20" fill="#ffcc1f"/>
    <path d="M142,372 V636" stroke="#151515" stroke-width="5"/>` },
  "dolma-chef": { nome: "Roupa de chef", slot: "corpo", icone: "🍳", svg: `
    <path d="${TRONCO}" fill="#ffffff"/>
    <path d="M100,380 Q142,400 184,380 L176,640 H108Z" fill="#f4f4f4"/>
    <circle cx="118" cy="440" r="7" fill="#151515"/><circle cx="166" cy="440" r="7" fill="#151515"/>
    <circle cx="118" cy="510" r="7" fill="#151515"/><circle cx="166" cy="510" r="7" fill="#151515"/>
    <path d="M90,600 h104 v60 h-104Z" fill="#e63946"/>` },
  "traje-astronauta": { nome: "Traje espacial", slot: "corpo", icone: "🚀", svg: `
    <path d="${TRONCO}" fill="#f1f1f1"/>
    <rect x="98" y="430" width="88" height="66" rx="10" fill="#9aa3ad"/>
    <circle cx="122" cy="462" r="9" fill="#e63946"/><circle cx="160" cy="462" r="9" fill="#2bb24c"/>
    <circle cx="66" cy="420" r="18" fill="#1d6fe0"/>` },
  "camisa-time": { nome: "Camisa do time", slot: "corpo", icone: "👕", svg: `
    <path d="${TRONCO}" fill="#1fc08e"/>
    <path d="M60,470 H224" stroke="#ffffff" stroke-width="18"/>
    <text x="142" y="580" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="72" fill="#ffffff" stroke="#151515" stroke-width="3">10</text>` },
  "camisa-listrada": { nome: "Camisa listrada", slot: "corpo", icone: "👕", svg: `
    <path d="${TRONCO}" fill="#ffffff"/>
    <path d="M20,430 H264 M14,500 H270 M10,570 H274" stroke="#1d6fe0" stroke-width="22"/>` },

  // ---------- cintura
  boia: { nome: "Boia", slot: "cintura", icone: "🛟", svg: `
    <ellipse cx="142" cy="610" rx="150" ry="54" fill="#ff7a00"/>
    <ellipse cx="142" cy="600" rx="96" ry="24" fill="rgba(255,255,255,0.0)"/>
    <path d="M30,580 l40,40 M214,620 l40,-40" stroke="#ffffff" stroke-width="22"/>` },

  // ---------- pernas
  "calca-jeans": { nome: "Calça jeans", slot: "pernas", icone: "👖", svg: `<path d="${PERNA}" fill="#3a6ea5"/><path d="M142,600 V690" stroke="#151515" stroke-width="4"/>` },
  "calca-bombeiro": { nome: "Calça de bombeiro", slot: "pernas", icone: "🚒", svg: `<path d="${PERNA}" fill="#c1121f"/><path d="M64,760 h66 M154,760 h66" stroke="#ffcc1f" stroke-width="16"/>` },
  "calca-astronauta": { nome: "Calça espacial", slot: "pernas", icone: "🚀", svg: `<path d="${PERNA}" fill="#f1f1f1"/><path d="M70,700 h56 M158,700 h56" stroke="#9aa3ad" stroke-width="8"/>` },
  "short-time": { nome: "Calção do time", slot: "pernas", icone: "🩳", svg: `<path d="M56,596 H228 L226,700 H152 L142,660 L132,700 H58Z" fill="#ffffff"/><path d="M60,600 V700 M224,600 V700" stroke="#1fc08e" stroke-width="10"/>` },

  // ---------- pés
  galochas: { nome: "Galochas", slot: "pes", icone: "🥾", svg: bota("#ffcc1f") },
  "botas-neve": { nome: "Botas de neve", slot: "pes", icone: "🥾", svg: bota("#8b5a2b", `<rect x="22" y="760" width="96" height="30" rx="12" fill="#fff"/><rect x="166" y="760" width="96" height="30" rx="12" fill="#fff"/>`) },
  "botas-bombeiro": { nome: "Botas de bombeiro", slot: "pes", icone: "🥾", svg: bota("#2b2b2b", `<path d="M28,800 h84 M172,800 h84" stroke="#ffcc1f" stroke-width="12"/>`) },
  "botas-astronauta": { nome: "Botas espaciais", slot: "pes", icone: "🥾", svg: bota("#f1f1f1", `<path d="M14,870 h90 M180,870 h90" stroke="#9aa3ad" stroke-width="10"/>`) },
  chuteira: { nome: "Chuteiras", slot: "pes", icone: "👟", svg: bota("#2b2b2b").replace(/770/g, "820") },

  // ---------- mão (a mão do lado direito da tela)
  "guarda-chuva": { nome: "Guarda-chuva", slot: "mao", icone: "☂️", svg: `
    <path d="M268,330 V600 Q268,622 248,622" fill="none" stroke="#151515" stroke-width="10" stroke-linecap="round"/>
    <path d="M150,340 Q268,220 386,340 Q356,322 327,340 Q298,322 268,340 Q238,322 209,340 Q180,322 150,340Z" fill="#ec2e8c"/>` },
  mangueira: { nome: "Mangueira", slot: "mao", icone: "🧯", svg: `
    <path d="M262,600 Q250,700 300,720" fill="none" stroke="#151515" stroke-width="22" stroke-linecap="round"/>
    <path d="M262,600 Q250,700 300,720" fill="none" stroke="#e63946" stroke-width="12" stroke-linecap="round"/>
    <path d="M250,560 L300,540 L306,566 L262,598Z" fill="#9aa3ad"/>` },
  "colher-pau": { nome: "Colher de pau", slot: "mao", icone: "🥄", svg: `
    <path d="M262,600 L290,420" stroke="#151515" stroke-width="16" stroke-linecap="round"/>
    <path d="M262,600 L290,420" stroke="#c98b4f" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="294" cy="400" rx="20" ry="30" fill="#c98b4f"/>` },
  bola: { nome: "Bola", slot: "mao", icone: "⚽", svg: `
    <circle cx="276" cy="610" r="36" fill="#ffffff"/>
    <path d="M276,592 l14,10 -5,16 h-18 l-5,-16z" fill="#151515"/>` },
};

// Monta o Rabisco com as camadas de roupa. Devolve funções para vestir, tirar e animar.
export function montarRabisco(onde, { pose = "frente" } = {}) {
  const caixa = document.createElement("div");
  caixa.className = "rabisco-camarim";
  caixa.innerHTML = `<img src="${RAIZ}assets/rabisco/poses/${pose}.png" alt="Rabisco"><svg viewBox="0 0 284 900" aria-hidden="true">${SLOTS.map((s) => `<g data-slot="${s}"></g>`).join("")}</svg>`;
  onde.append(caixa);
  const svg = caixa.querySelector("svg");
  const img = caixa.querySelector("img");
  const vestidos = {};
  // com outro chapéu, a aba do boné original sai de cena (frente-sem-aba.png: ferramentas/rabisco_sem_aba.py)
  const trocarImagem = () => { if (pose === "frente") img.src = `${RAIZ}assets/rabisco/poses/${vestidos.cabeca ? "frente-sem-aba" : "frente"}.png`; };
  return {
    caixa,
    vestir(id) {
      const r = ROUPAS[id];
      const g = svg.querySelector(`[data-slot="${r.slot}"]`);
      g.innerHTML = `<g class="roupa" data-roupa="${id}">${r.svg}</g>`;
      vestidos[r.slot] = id;
      trocarImagem();
      caixa.classList.remove("veste"); void caixa.offsetWidth; caixa.classList.add("veste");
    },
    tirar(slot) { svg.querySelector(`[data-slot="${slot}"]`).innerHTML = ""; delete vestidos[slot]; trocarImagem(); },
    limpar() { for (const s of SLOTS) this.tirar(s); },
    vestido: (id) => vestidos[ROUPAS[id].slot] === id,
    get vestidos() { return { ...vestidos }; },
    animar(nome) { caixa.classList.remove("nao", "pula"); void caixa.offsetWidth; caixa.classList.add(nome); },
  };
}

// Desenho pequeno de uma roupa (para os botões do guarda-roupa): enquadra só a peça
export function miniatura(id) {
  const svg = document.createElementNS(NS, "svg");
  svg.innerHTML = `<g class="roupa">${ROUPAS[id].svg}</g>`;
  svg.setAttribute("aria-hidden", "true");
  Object.assign(svg.style, { position: "absolute", left: "-9999px", width: "284px", height: "900px" });
  document.body.append(svg);
  const b = svg.querySelector("g").getBBox();
  svg.remove();
  svg.removeAttribute("style");
  const lado = Math.max(b.width, b.height) + 24;
  svg.setAttribute("viewBox", `${b.x + b.width / 2 - lado / 2} ${b.y + b.height / 2 - lado / 2} ${lado} ${lado}`);
  return svg;
}
