// Rabiscolândia: as missões (dados puros, sem three.js: o teste de conteúdo lê este arquivo no node).
// 8 bíblicas (com versículo em paráfrase para crianças e "baseado em ...") e 4 de cidadania. Em TODAS tem alguém
// esperando no destino, visível, que reage quando a criança chega. Sem tempo, sem perder: dá para largar e voltar.
//
// Etapas (em ordem):
//   { tipo: "falar", com: npcId }                              — conversar com alguém (ação perto dele)
//   { tipo: "pegar", itens: [{ id, nome, emoji, x, z }] }      — pegar cada coisa (ação perto; vai em cima da cabeça)
//   { tipo: "levar", ate: npcId }                              — entregar ao npc (ação perto dele; ele reage)
//   { tipo: "seguir", quem: npcId, ate: npcId }                — o amigo vem atrás do Rabisco até o destino
//   { tipo: "plantar", pontos: [{ x, z }] }                    — plantar a semente em cada ponto (ação)
//   { tipo: "dirigir", passageiro: npcId, ate: npcId }         — levar o amigo de carro (ele entra como carona)
//   { tipo: "faixa", com: npcId, ate: npcId, semaforo: [x, z] } — atravessar juntos na faixa com o bonequinho verde
// npcs: { id: { nome, tipo, cor, x, z, rot?, acessorio? } } — tipo de personagens.js (lapis, giz, borracha...);
// o primeiro da lista é quem pede (com um "!" em cima). Só aparecem perto do Rabisco (orçamento de desenho).

export const MISSOES = [
  {
    id: "ovelha", titulo: "A ovelhinha perdida", icone: "🐑", tipo: "biblica",
    npcs: { pastor: { nome: "Pastor Lápis", tipo: "lapis", cor: 0x9a6232, x: -80, z: 66, acessorio: "cajado" }, ovelha: { nome: "Ovelhinha", tipo: "ovelha", x: 24, z: 120 } },
    pedido: "Uma das minhas ovelhinhas se perdeu! Você me ajuda a achar? Ela gosta do Parque do Lago.",
    etapas: [{ tipo: "seguir", quem: "ovelha", ate: "pastor" }],
    fim: "Que alegria! Eu procurei por toda parte. Obrigado por cuidar dela!",
    verso: { texto: "Jesus cuida de cada um de nós, como o pastor cuida da ovelhinha que se perdeu.", ref: "baseado em Lucas 15.4-6" },
  },
  {
    id: "lanche", titulo: "O lanche repartido", icone: "🍞", tipo: "biblica",
    npcs: { menino: { nome: "Giz Laranja", tipo: "giz", cor: 0xffa21f, x: 16, z: 68 }, amigos: { nome: "Turma do piquenique", tipo: "piquenique", x: 26, z: 82 } },
    pedido: "Vamos fazer um piquenique no parque! Pegue os pães na padaria e os peixinhos no mercado.",
    etapas: [
      { tipo: "pegar", itens: [{ id: "paes", nome: "cesta de pães", emoji: "🍞", x: 93, z: -6 }, { id: "peixes", nome: "dois peixinhos", emoji: "🐟", x: 70, z: -6 }] },
      { tipo: "levar", ate: "amigos" },
    ],
    fim: "Tem para todo mundo e ainda sobrou! Obrigado por repartir com a gente.",
    verso: { texto: "Um menino repartiu o seu lanche, Jesus agradeceu a Deus e todos comeram.", ref: "baseado em João 6.9-11" },
  },
  {
    id: "vizinho", titulo: "O bom vizinho", icone: "🩹", tipo: "biblica",
    npcs: { amiga: { nome: "Borrachinha", tipo: "borracha", x: -112, z: 6.2, sentada: true }, enfermeira: { nome: "Enfermeira Cola", tipo: "cola", x: -28, z: -57 } },
    pedido: "Ai, tropecei e ralei o joelho! Você pode buscar um curativo no Hospital?",
    etapas: [{ tipo: "falar", com: "enfermeira" }, { tipo: "pegar", itens: [{ id: "curativo", nome: "kit de curativo", emoji: "🩹", x: -26, z: -57 }] }, { tipo: "levar", ate: "amiga" }],
    fim: "Já estou melhor! Você parou para me ajudar. Muito obrigada!",
    verso: { texto: "Ajude quem precisa, como o bom samaritano que parou para cuidar de alguém no caminho.", ref: "baseado em Lucas 10.33-34" },
  },
  {
    id: "noe", titulo: "Os bichinhos de dois em dois", icone: "🐰", tipo: "biblica",
    npcs: { noe: { nome: "Noé Lápis", tipo: "lapis", cor: 0x9a6232, x: -12, z: 160, acessorio: "barba" }, coelhos: { nome: "Coelhinhos", tipo: "coelho", x: -22, z: 96 } },
    pedido: "A minha arquinha está pronta! Me ajuda a trazer os dois coelhinhos do parque?",
    etapas: [{ tipo: "seguir", quem: "coelhos", ate: "noe" }],
    fim: "Os dois coelhinhos chegaram! Deus cuidou de todos os bichos na arca.",
    verso: { texto: "Noé confiou em Deus e cuidou dos animais, de dois em dois.", ref: "baseado em Gênesis 7.8-9" },
  },
  {
    id: "zaqueu", titulo: "Zaqueu em cima da árvore", icone: "🌳", tipo: "biblica",
    npcs: { zaqueu: { nome: "Zaqueu Clipe", tipo: "clipe", cor: 0x58c43a, x: 38, z: -30, naArvore: true }, padeiro: { nome: "Seu Pão", tipo: "giz", cor: 0xd99a4e, x: 99, z: -6 } },
    pedido: "Eu sou baixinho e subi na árvore para ver melhor! Vamos juntos lanchar na padaria?",
    etapas: [{ tipo: "seguir", quem: "zaqueu", ate: "padeiro" }],
    fim: "Que bom ter um amigo para lanchar! Eu quero ser bom com todo mundo.",
    verso: { texto: "Jesus chamou Zaqueu pelo nome e foi à casa dele. Ele ama a todos.", ref: "baseado em Lucas 19.5-6" },
  },
  {
    id: "semeador", titulo: "O semeador", icone: "🌱", tipo: "biblica",
    npcs: { jardineira: { nome: "Jardineira Régua", tipo: "regua", x: 112, z: -70 } },
    pedido: "Pegue o saquinho de sementes e plante nos três canteiros da horta.",
    etapas: [{ tipo: "pegar", itens: [{ id: "sementes", nome: "saquinho de sementes", emoji: "🌱", x: 110, z: -72 }] }, { tipo: "plantar", pontos: [{ x: 106, z: -94 }, { x: 112, z: -89.4 }, { x: 118, z: -84.8 }] }, { tipo: "levar", ate: "jardineira" }],
    fim: "As sementinhas brotaram na terra boa! Vai dar muita fruta.",
    verso: { texto: "A semente que cai na terra boa cresce e dá muito fruto.", ref: "baseado em Mateus 13.8" },
  },
  {
    id: "rute", titulo: "Rute e as espigas", icone: "🌾", tipo: "biblica",
    npcs: { vovo: { nome: "Vovó Lápis", tipo: "vovo", x: 0, z: 0 } },
    pedido: "Na Fazendinha tem espigas de trigo para colher. Leve quatro para a Vovó Lápis fazer pão!",
    etapas: [{ tipo: "pegar", itens: [{ id: "esp1", nome: "espiga", emoji: "🌾", x: -120, z: 70 }, { id: "esp2", nome: "espiga", emoji: "🌾", x: -116, z: 74 }, { id: "esp3", nome: "espiga", emoji: "🌾", x: -112, z: 70 }, { id: "esp4", nome: "espiga", emoji: "🌾", x: -108, z: 74 }] }, { tipo: "levar", ate: "vovo" }],
    fim: "Que trigo bonito! Você cuidou de mim com tanto carinho. Obrigada!",
    verso: { texto: "Rute foi fiel e cuidou da sua sogra Noemi com amor.", ref: "baseado em Rute 2.2-3" },
  },
  {
    id: "amigos", titulo: "Os amigos que ajudam", icone: "🚗", tipo: "biblica",
    npcs: { amigo: { nome: "Lápis Azul", tipo: "lapis", cor: 0x2f8fe8, x: -93, z: -89, sentada: true }, medico: { nome: "Doutor Apontador", tipo: "apontador", cor: 0xffffff, x: -22, z: -57 } },
    pedido: "O Lápis Azul torceu o pé e não consegue andar até o hospital. Leve ele de carro!",
    etapas: [{ tipo: "dirigir", passageiro: "amigo", ate: "medico" }],
    fim: "Chegamos! Bons amigos ajudam um ao outro. Obrigado pela carona!",
    verso: { texto: "Os amigos levaram o amigo até Jesus, porque amigo de verdade ajuda.", ref: "baseado em Marcos 2.3-5" },
  },
  // ---- cidadania
  {
    id: "carta", titulo: "Uma carta para a Vovó", icone: "✉️", tipo: "cidadania",
    npcs: { carteiro: { nome: "Carteiro Caderno", tipo: "caderno", cor: 0xffcc1f, x: 190, z: 58 }, vovo: { nome: "Vovó Lápis", tipo: "vovo", x: 0, z: 0 } },
    pedido: "Chegou uma carta para a Vovó Lápis! Você pode entregar?",
    etapas: [{ tipo: "pegar", itens: [{ id: "carta", nome: "carta", emoji: "✉️", x: 193, z: 58 }] }, { tipo: "levar", ate: "vovo" }],
    fim: "Uma carta do meu neto! Que alegria. Obrigada, carteiro ajudante!",
  },
  {
    id: "lixo", titulo: "Parque limpinho", icone: "🗑️", tipo: "cidadania",
    npcs: { gari: { nome: "Gari Clipe", tipo: "clipe", cor: 0xff7a00, x: -6, z: 70 } },
    pedido: "Alguém esqueceu lixinho no parque. Me ajuda a jogar tudo na lixeira?",
    etapas: [{ tipo: "pegar", itens: [{ id: "l1", nome: "garrafinha", emoji: "🧴", x: -20, z: 76 }, { id: "l2", nome: "papel", emoji: "📄", x: 18, z: 80 }, { id: "l3", nome: "latinha", emoji: "🥫", x: 30, z: 118 }, { id: "l4", nome: "papel", emoji: "📄", x: -30, z: 110 }, { id: "l5", nome: "garrafinha", emoji: "🧴", x: 0, z: 84 }] }, { tipo: "levar", ate: "gari" }],
    fim: "Parque limpinho! Cuidar da cidade é cuidar de todo mundo.",
  },
  {
    id: "faixa", titulo: "Atravessar na faixa", icone: "🚦", tipo: "cidadania",
    npcs: { caderninho: { nome: "Caderninho", tipo: "caderno", cor: 0x1fc08e, x: -42.5, z: 41.5 }, mae: { nome: "Mamãe Caderno", tipo: "caderno", cor: 0x8e6cff, x: -42.5, z: 59 } },
    pedido: "Preciso atravessar para encontrar a minha mãe. Vamos juntos, na faixa e com o bonequinho verde?",
    etapas: [{ tipo: "faixa", com: "caderninho", ate: "mae", semaforo: [-50, 50] }],
    fim: "Chegamos com segurança! Na faixa e com o sinal verde é muito melhor.",
  },
  {
    id: "livro", titulo: "Devolver o livro", icone: "📚", tipo: "cidadania",
    npcs: { bibliotecaria: { nome: "Bibliotecária Cola", tipo: "cola", x: 6, z: -57 }, professora: { nome: "Professora Régua", tipo: "regua", x: 188, z: -6 } },
    pedido: "A professora da Educarte Kids II pediu este livro emprestado. Você leva para ela?",
    etapas: [{ tipo: "pegar", itens: [{ id: "livro", nome: "livro", emoji: "📕", x: 8, z: -57 }] }, { tipo: "levar", ate: "professora" }],
    fim: "Era esse livro mesmo! A turma vai adorar a história. Obrigada!",
  },
];
// palavras que não podem aparecer em nada que a criança vê ou ouve (teste rabiscopolis-conteudo.mjs)
export const PROIBIDAS = ["arma", "revólver", "pistola", "tiro", "matar", "morte", "morreu", "sangue", "prisão", "preso", "polícia prende", "ladrão", "roubo", "roubar", "briga", "brigar", "soco", "susto", "monstro", "fantasma", "zumbi", "namor", "beijo", "roblox", "brookhaven", "robux", "dinheiro", "comprar", "pagar"];
