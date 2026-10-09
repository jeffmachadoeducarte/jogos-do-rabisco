// Modos do Super Rabisco: a mesma fase serve vários jogos do portal. Cada modo diz o que vai dentro
// das bolhas (letras, sílabas, frutas ou respostas), o que aparece no painel e o que o Rabisco fala.
// O modo vem de ?modo= na URL (as pastas jogos/<id>/ redirecionam para cá).
//
// desafio(item) → {
//   e: figura do painel, rotulo: texto da vitória,
//   pecas: [{ texto, voz }]        bolhas certas, espalhadas pela fase na ordem
//   casas: ["", "-", ...]          uma casa por peça ("-" = hífen já desenhado)
//   erradas: [[...], ...]          (opcional) bolhas erradas junto de cada peça (perguntas)
//   perguntas: ["...", ...]        (opcional) uma pergunta por peça, mostrada no painel
//   falas: { inicio, completa, parabens, soletra? }
// }

const slug = (p) => p.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const letrasDe = (p) => [...p].filter((c) => c !== "-");
const vozDaLetra = (l) => (l === "Ç" ? "CEDILHA" : l.normalize("NFD")[0]); // Í -> I; Ç tem voz própria

export const MODOS = {
  // Super Rabisco: Caça às Letras (4 e 5 anos)
  letras: {
    titulo: "Super Rabisco", sub: "Caça às Letras", faixa: "pequenos", chave: "superRabiscoEstrelas", porNivel: 10,
    dica: { teclado: "Setas para andar · Espaço para pular · ⬇ para entrar no cano · P para pausar", toque: "◀ ▶ para andar · ⤒ para pular · ⬇ para entrar no cano" },
    falasExtras: ["dica-letra", "sala-secreta", "nivel-completo"], falta: "Faltam letras! Volte para procurar", falaFalta: "dica-letra",
    niveis: [
      { nome: "Palavras curtinhas", itens: [
        { p: "BOLA", e: "⚽" }, { p: "GATO", e: "🐱" }, { p: "SAPO", e: "🐸" }, { p: "PATO", e: "🦆" },
        { p: "VACA", e: "🐮" }, { p: "BOLO", e: "🎂" }, { p: "DADO", e: "🎲" }, { p: "CASA", e: "🏠" },
        { p: "FOCA", e: "🦭" }, { p: "LOBO", e: "🐺" }, { p: "MALA", e: "🧳" }, { p: "UVA", e: "🍇" }] },
      { nome: "Palavras maiores", itens: [
        { p: "SAPATO", e: "👟" }, { p: "CAVALO", e: "🐴" }, { p: "MACACO", e: "🐒" }, { p: "PIPOCA", e: "🍿" },
        { p: "BANANA", e: "🍌" }, { p: "GIRAFA", e: "🦒" }, { p: "TOMATE", e: "🍅" }, { p: "BONECA", e: "🪆" },
        { p: "JANELA", e: "🪟" }, { p: "CANETA", e: "🖊️" }, { p: "CAMELO", e: "🐫" }, { p: "BALEIA", e: "🐋" }] },
      { nome: "Palavras compostas", itens: [
        { p: "GUARDA-CHUVA", e: "☂️" }, { p: "ARCO-ÍRIS", e: "🌈" }, { p: "BEIJA-FLOR", e: "🐦" },
        { p: "PORCO-ESPINHO", e: "🦔" }, { p: "CACHORRO-QUENTE", e: "🌭" }, { p: "COUVE-FLOR", e: "🥦" },
        { p: "QUEBRA-CABEÇA", e: "🧩" }, { p: "BATE-PAPO", e: "💬" }, { p: "ESTRELA-DO-MAR", e: "⭐" },
        { p: "PÉ-DE-MOLEQUE", e: "🥜" }, { p: "SEGUNDA-FEIRA", e: "📅" }, { p: "GUARDA-ROUPA", e: "👗" }] },
    ],
    falaNivel: (n) => `nivel-${n}`,
    desafio(item) {
      const id = slug(item.p);
      return {
        e: item.e, rotulo: item.p, chave: item.p,
        pecas: letrasDe(item.p).map((l) => ({ texto: l, voz: `letra-${vozDaLetra(l)}` })),
        casas: [...item.p].map((c) => (c === "-" ? "-" : "")),
        falas: { inicio: `inicio-${id}`, completa: `completa-${id}`, parabens: `parabens-${id}`, soletra: `soletra-${id}` },
      };
    },
  },

  // Super Rabisco (6 a 8 anos): sílabas — pegue as bolhas das sílabas da palavra; cuidado com as sílabas intrusas
  silabas: {
    titulo: "Super Rabisco", sub: "Sílabas", faixa: "alfabetizacao", chave: "superRabiscoSilabas", porNivel: 6,
    dica: { teclado: "Setas para andar · Espaço para pular · Pegue só as sílabas da palavra · P para pausar", toque: "◀ ▶ para andar · ⤒ para pular · Pegue só as sílabas da palavra" },
    falasExtras: ["sil-falta", "sil-intrusa", "nivel-completo"], falta: "Faltam sílabas! Volte para procurar", falaFalta: "sil-falta",
    niveis: [
      { nome: "Duas sílabas", desc: "BO-LA", itens: [
        ["BO", "LA", "⚽"], ["GA", "TO", "🐱"], ["CA", "SA", "🏠"], ["PA", "TO", "🦆"], ["SA", "PO", "🐸"], ["VA", "CA", "🐮"],
        ["DA", "DO", "🎲"], ["FA", "CA", "🔪"], ["MA", "LA", "🧳"], ["LU", "A", "🌙"], ["RA", "TO", "🐭"], ["BO", "LO", "🎂"]] },
      { nome: "Três sílabas", desc: "SA-PA-TO", itens: [
        ["SA", "PA", "TO", "👟"], ["CA", "VA", "LO", "🐴"], ["MA", "CA", "CO", "🐒"], ["PI", "PO", "CA", "🍿"], ["BA", "NA", "NA", "🍌"],
        ["GI", "RA", "FA", "🦒"], ["TO", "MA", "TE", "🍅"], ["BO", "NE", "CA", "🪆"], ["JA", "NE", "LA", "🪟"], ["CA", "NE", "TA", "🖊️"],
        ["BA", "LE", "IA", "🐋"], ["PE", "TE", "CA", "🪁"]] },
      { nome: "Sílabas difíceis", desc: "CHO-CO-LA-TE", itens: [
        ["CHO", "CO", "LA", "TE", "🍫"], ["BOR", "BO", "LE", "TA", "🦋"], ["TAR", "TA", "RU", "GA", "🐢"], ["BI", "CI", "CLE", "TA", "🚲"],
        ["PRIN", "CE", "SA", "👸"], ["COR", "UJA", "🦉"], ["PIN", "GUIM", "🐧"], ["PLA", "NE", "TA", "🪐"],
        ["FLOR", "ES", "TA", "🌳"], ["ES", "TRE", "LA", "⭐"], ["DRA", "GÃO", "🐉"], ["COE", "LHO", "🐰"]] },
    ],
    falaNivel: (n) => `sil-nivel-${n}`,
    desafio(item) {
      const silabas = item.slice(0, -1), e = item.at(-1);
      const palavra = silabas.join("");
      const id = slug(palavra);
      return {
        e, rotulo: silabas.join("-"), chave: palavra,
        pecas: silabas.map((s) => ({ texto: s, voz: `sil-${slug(s)}` })),
        casas: silabas.map(() => ""),
        intrusas: 2 + Math.min(2, silabas.length - 2), // bolhas com sílabas que não são da palavra
        falas: { inicio: `sil-inicio-${id}`, completa: `sil-completa-${id}`, parabens: "sil-parabens" },
      };
    },
    // sílabas para as bolhas intrusas
    banco: ["MI", "TU", "PE", "XA", "ZO", "NU", "RI", "FE", "GU", "JO", "VI", "QUE", "LHA", "NHO", "DE", "SU"],
  },

  // Super Rabisco Mini (1 ano e meio a 3 anos): o Rabisco corre sozinho; qualquer toque faz ele pular
  mini: {
    titulo: "Super Rabisco Mini", sub: "Toque para pular!", faixa: "bem-pequenos", chave: "superRabiscoMini", porNivel: 3,
    autoCorre: true, semInimigos: true, mastroAberto: true, velocidade: 0.55,
    dica: { teclado: "Qualquer tecla faz o Rabisco pular!", toque: "Toque em qualquer lugar para pular!" },
    falasExtras: ["mini-vitoria"],
    niveis: [
      { nome: "Frutas", desc: "3 frutas", itens: [["morango", "uva", "banana"], ["laranja", "maca", "uva"], ["banana", "melancia", "morango"], ["maca", "laranja", "mirtilo"]] },
      { nome: "Mais frutas", desc: "4 frutas", itens: [["morango", "banana", "uva", "laranja"], ["maca", "mirtilo", "melancia", "banana"], ["uva", "laranja", "maca", "morango"]] },
      { nome: "Muitas frutas", desc: "6 frutas", itens: [["morango", "banana", "uva", "laranja", "maca", "mirtilo"], ["melancia", "uva", "banana", "maca", "laranja", "morango"]] },
    ],
    frutas: {
      morango: "🍓", uva: "🍇", banana: "🍌", laranja: "🍊", maca: "🍏", melancia: "🍉", mirtilo: "🫐",
    },
    falaNivel: () => "mini-inicio",
    desafio(item) {
      return {
        e: "🧺", rotulo: item.map((f) => this.frutas[f]).join(" "), chave: item.join(","), emoji: true,
        pecas: item.map((f) => ({ texto: this.frutas[f], voz: `mini-${f}` })),
        casas: item.map(() => ""),
        falas: { inicio: null, completa: "mini-completa", parabens: "mini-vitoria" },
      };
    },
  },

  // Super Rabisco 2 (9 a 12 anos): cada fase tem perguntas de ciências e história; pegue a bolha da resposta certa
  ciencias: {
    titulo: "Super Rabisco 2", sub: "Ciências e História", faixa: "maiores", chave: "superRabiscoCiencias", porNivel: 4, bolhaGrande: true,
    dica: { teclado: "Setas para andar · Espaço para pular · Pegue a bolha da resposta certa · P para pausar", toque: "◀ ▶ para andar · ⤒ para pular · Pegue a bolha da resposta certa" },
    falasExtras: ["sr2-erro", "sr2-falta", "nivel-completo"], falta: "Faltam respostas! Volte para procurar", falaFalta: "sr2-falta",
    niveis: [
      { nome: "Corpo e natureza", desc: "Ciências", itens: [
        { e: "🫁", q: [["Que órgão bombeia o sangue?", "CORAÇÃO", ["PULMÃO", "ESTÔMAGO"]], ["Que gás as plantas soltam?", "OXIGÊNIO", ["FUMAÇA", "VAPOR"]], ["Quantos ossos tem um adulto?", "206", ["52", "1000"]]] },
        { e: "🌱", q: [["De onde a planta tira água?", "RAIZ", ["FLOR", "FOLHA"]], ["O que a lagarta vira?", "BORBOLETA", ["ABELHA", "MINHOCA"]], ["Que animal é mamífero?", "BALEIA", ["TUBARÃO", "PINGUIM"]]] },
        { e: "💧", q: [["Água a 100 °C...", "FERVE", ["CONGELA", "SOME"]], ["Gelo é água no estado...", "SÓLIDO", ["GASOSO", "LÍQUIDO"]], ["A chuva vem das...", "NUVENS", ["MONTANHAS", "ESTRELAS"]]] },
        { e: "🦷", q: [["Quantos sentidos temos?", "5", ["3", "8"]], ["Que órgão usamos para pensar?", "CÉREBRO", ["FÍGADO", "RIM"]], ["Qual alimento tem mais cálcio?", "LEITE", ["BALA", "REFRIGERANTE"]]] },
      ] },
      { nome: "Espaço e Terra", desc: "Ciências", itens: [
        { e: "🪐", q: [["Qual é o maior planeta?", "JÚPITER", ["MARTE", "VÊNUS"]], ["A Terra gira em volta do...", "SOL", ["LUA", "MARTE"]], ["Planeta com anéis famosos?", "SATURNO", ["TERRA", "MERCÚRIO"]]] },
        { e: "🌍", q: [["Maior país da América do Sul?", "BRASIL", ["CHILE", "PERU"]], ["Maior oceano do mundo?", "PACÍFICO", ["ÍNDICO", "ÁRTICO"]], ["Satélite natural da Terra?", "LUA", ["SOL", "COMETA"]]] },
        { e: "🌋", q: [["Montanha que solta lava?", "VULCÃO", ["GEISER", "DUNA"]], ["Tremor da terra se chama...", "TERREMOTO", ["TORNADO", "ECLIPSE"]], ["Maior floresta do Brasil?", "AMAZÔNIA", ["CERRADO", "PAMPA"]]] },
        { e: "☀️", q: [["O Sol é uma...", "ESTRELA", ["LUA", "COMETA"]], ["Um dia na Terra tem...", "24 HORAS", ["12 HORAS", "7 HORAS"]], ["Um ano tem quantos meses?", "12", ["10", "52"]]] },
      ] },
      { nome: "História do Brasil", desc: "História", itens: [
        { e: "⛵", q: [["Quem chegou ao Brasil em 1500?", "CABRAL", ["COLOMBO", "TIRADENTES"]], ["Primeiros moradores do Brasil?", "INDÍGENAS", ["ROMANOS", "VIKINGS"]], ["Árvore que deu nome ao Brasil?", "PAU-BRASIL", ["IPÊ", "PINHEIRO"]]] },
        { e: "🇧🇷", q: [["Ano da Independência?", "1822", ["1500", "1988"]], ["Quem gritou 'Independência'?", "D. PEDRO I", ["CABRAL", "PELÉ"]], ["Capital do Brasil hoje?", "BRASÍLIA", ["SALVADOR", "RIO"]]] },
        { e: "📜", q: [["Lei que acabou a escravidão?", "ÁUREA", ["SECA", "MAIOR"]], ["Ano da Lei Áurea?", "1888", ["1822", "1950"]], ["Primeira capital do Brasil?", "SALVADOR", ["BRASÍLIA", "CURITIBA"]]] },
        { e: "🏛️", q: [["Ano da Proclamação da República?", "1889", ["1500", "2000"]], ["Herói da Inconfidência Mineira?", "TIRADENTES", ["ZUMBI", "CABRAL"]], ["Líder do Quilombo dos Palmares?", "ZUMBI", ["D. PEDRO", "VARGAS"]]] },
      ] },
    ],
    falaNivel: (n) => `sr2-nivel-${n}`,
    desafio(item) {
      return {
        e: item.e, rotulo: item.q.map((x) => x[1]).join(" · "), chave: item.q[0][0],
        pecas: item.q.map(([, certa]) => ({ texto: certa, voz: null })),
        erradas: item.q.map(([, , erradas]) => erradas),
        perguntas: item.q.map(([pergunta]) => pergunta),
        casas: item.q.map(() => ""),
        falas: { inicio: "sr2-inicio", completa: "sr2-completa", parabens: "sr2-parabens" },
      };
    },
  },
};

export function modoAtual() {
  const nome = new URLSearchParams(location.search).get("modo") || "letras";
  return { nome, ...(MODOS[nome] || MODOS.letras) };
}
export { slug, letrasDe };
