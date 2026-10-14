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
// Etapas que vieram da Rabiscópolis (a cidade antiga, que agora mora aqui):
//   { tipo: "achar", bichos: [npcId], ate, rotulo, fala, voz }   — achar cada bichinho escondido (ação); quem foi achado
//                                                                  vem atrás do Rabisco em fila até quem espera
//   { tipo: "seguirVarios", quem: [npcId], ate, rotulo, fala, voz, falaTodos, vozTodos } — convidar cada amigo (ação);
//                                                                  eles vêm em fila (de carro, vão de carona)
//   { tipo: "contar", ate, min, max }                          — contar os patinhos do lago e pisar na placa do número
//   { tipo: "bandeiras", pontos: [[x, z, giro]], ate }         — de carro, passar pelos pórticos na ordem (cronômetro só
//                                                                  para mostrar: não tem tempo para perder)
//   { tipo: "levarVeiculo", de?, carga, veiculos, ate, pousar? } — carga grande no porta-malas (ou o remédio no
//                                                                  helicóptero): só chega de veículo, parando perto
//   { tipo: "apagar", fogos: [[x, z]] }                        — apagar foguinhos de lixeira com água (ação ou o jato do
//                                                                  caminhão de bombeiro)
//   { tipo: "pistas", pistas: [{ x, z, texto, voz }] }         — caça ao tesouro: um baú por vez; cada um dá a pista
//   { tipo: "entregar", entregas: [{ item, ate }] }            — cada carta (item pego antes) para quem tem a caixinha da cor
//   { tipo: "voltar", ate }                                    — voltar e contar para quem pediu (ele comemora)
// npcs: { id: { nome, tipo, cor, x, z, rot?, acessorio?, escala?, casa?: n, escola?: [dx, dz], caixa?: cor } } — tipo de
// personagens.js (lapis, giz, borracha...) ou bichinho (ovelha, coelho, gato); casa: na porta da casa n (posição na hora);
// escola: na porta da Educarte da idade da criança (Kids I até 4 anos, senão Kids II), deslocado [dx, dz];
// caixa: caixinha de correio dessa cor ao lado. O primeiro da lista é quem pede (com um "!" em cima).
// Só aparecem perto do Rabisco (orçamento de desenho). voz: { pedido?, fim? } reaproveita falas gravadas (cid-*).

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
    id: "carta", titulo: "Cartas coloridas", icone: "✉️", tipo: "cidadania",
    npcs: {
      carteiro: { nome: "Carteiro Caderno", tipo: "caderno", cor: 0xffcc1f, x: 190, z: 58 },
      rosa: { nome: "Dona Borracha", tipo: "borracha", casa: 1, caixa: 0xff6fae },
      azul: { nome: "Seu Apontador Azul", tipo: "apontador", cor: 0x3d9af0, casa: 2, caixa: 0x3d9af0 },
      vovo: { nome: "Vovó Lápis", tipo: "vovo", x: 0, z: 0, caixa: 0xa98ce0 },
    },
    pedido: "Chegaram três cartas coloridas: a rosa, a azul e a lilás! Cada uma vai para a caixinha de correio da mesma cor, no Bairro das Casas.",
    etapas: [
      { tipo: "pegar", itens: [{ id: "c-rosa", nome: "carta rosa", emoji: "✉️", cor: 0xff6fae, x: 193, z: 57 }, { id: "c-azul", nome: "carta azul", emoji: "✉️", cor: 0x3d9af0, x: 195, z: 57 }, { id: "c-lilas", nome: "carta lilás", emoji: "✉️", cor: 0xa98ce0, x: 197, z: 57 }] },
      { tipo: "entregar", entregas: [{ item: "c-rosa", ate: "rosa" }, { item: "c-azul", ate: "azul" }, { item: "c-lilas", ate: "vovo" }], fala: "Carta entregue! Era a caixinha da cor certa.", voz: "cid-carta-ok" },
    ],
    fim: "Que alegria receber carta! Obrigado, carteiro ajudante!",
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
  // ---- vieram da Rabiscópolis
  {
    id: "gatos", titulo: "Os gatinhos fujões", icone: "🐱", tipo: "cidadania", voz: { pedido: "cid-gatos" },
    npcs: {
      rosa: { nome: "Lápis Rosa", tipo: "lapis", cor: 0xec2e8c, x: -20, z: -41, acessorio: "laco" },
      g1: { nome: "Gatinho Laranja", tipo: "gato", cor: 0xff9f43, x: -6, z: -40 },
      g2: { nome: "Gatinho Cinza", tipo: "gato", cor: 0x9a9aa6, x: 22, z: 90 },
      g3: { nome: "Gatinho Branco", tipo: "gato", cor: 0xfdfdfd, x: -41, z: -67 },
    },
    pedido: "Meus três gatinhos fugiram! Um foi para trás da Igreja Reviver, outro para o parque e outro para perto do hospital.",
    etapas: [{ tipo: "achar", bichos: ["g1", "g2", "g3"], ate: "rosa", rotulo: "🐱 Achar o gatinho", fala: "Achei um gatinho! Miau!", voz: "cid-gato-ok" }],
    fim: "Meus três gatinhos voltaram! Obrigada por procurar com tanto carinho.",
  },
  {
    id: "tesouro", titulo: "Caça ao tesouro", icone: "🗝️", tipo: "biblica", voz: { pedido: "cid-tesouro" },
    npcs: { professora: { nome: "Professora Lápis Roxa", tipo: "lapis", cor: 0x8e6cff, x: -8, z: -57, acessorio: "oculos" } },
    pedido: "Vamos fazer uma caça ao tesouro? Primeira pista: procure onde o sino toca e a gente agradece a Deus!",
    etapas: [
      { tipo: "pistas", pistas: [
        { x: -9, z: -14 },
        { x: 5.5, z: 3.5, texto: "Achou! Próxima pista: onde a água dança no meio da cidade.", voz: "cid-pista-2" },
        { x: -20, z: 80, texto: "Muito bem! Agora vá ao playground, onde tem balanço e escorregador.", voz: "cid-pista-3" },
        { x: 100, z: -6.5, texto: "Quase lá! A última pista: onde se faz o pão quentinho.", voz: "cid-pista-4" },
      ], achou: "Você achou o tesouro: um livro de histórias da Bíblia! Leve para a Professora Lápis Roxa, na Biblioteca." },
      { tipo: "levar", ate: "professora" },
    ],
    fim: "Que tesouro lindo! Mas o maior tesouro de todos é o amor de Deus.",
    verso: { texto: "O amor de Deus vale mais do que qualquer tesouro escondido.", ref: "baseado em Mateus 13.44" },
  },
  {
    id: "patos", titulo: "Quantos patinhos?", icone: "🦆", tipo: "cidadania", voz: { pedido: "cid-patos", fim: "cid-patos-ok" },
    npcs: { dona: { nome: "Dona Lápis Azul", tipo: "lapis", cor: 0x00b5f0, x: -8, z: 96, acessorio: "chapeu" } },
    pedido: "Quantos patinhos estão nadando no lago? Conte bem e pise no número certo!",
    etapas: [{ tipo: "contar", ate: "dona", min: 3, max: 5, erro: "Hmm, conte de novo, devagarinho.", vozErro: "cid-patos-erro" }],
    fim: "Isso mesmo! Em inglês, pato é duck! Quack, quack!",
  },
  {
    id: "encomenda", titulo: "A caixa de frutas", icone: "📦", tipo: "cidadania", voz: { pedido: "cid-encomenda", fim: "cid-encomenda-ok" },
    npcs: { feirante: { nome: "Seu Lápis Marrom, o feirante", tipo: "lapis", cor: 0x9a6232, x: 78, z: -7.5, acessorio: "chapeu" }, vovo: { nome: "Vovó Lápis", tipo: "vovo", x: 0, z: 0 } },
    pedido: "Esta caixa de frutas é grande demais para levar a pé! Venha de carro e leve para a casa da Vovó Lápis.",
    etapas: [{ tipo: "levarVeiculo", de: "feirante", carga: { nome: "caixa de frutas", emoji: "📦", modelo: "frutas" }, veiculos: "porta-malas", ate: "vovo",
      carregou: "A caixa de frutas está no carro! Agora, para a casa da Vovó.", vozCarregou: "cid-caixa-carro", aPe: "A caixa é pesada! Volte aqui de carro.", vozAPe: "cid-caixa-pe" }],
    fim: "Obrigada, Rabisco! Cinco laranjas e três bananas! Deus abençoe você!",
  },
  {
    id: "corrida", titulo: "Corrida dos números", icone: "🏁", tipo: "cidadania", voz: { pedido: "cid-corrida", fim: "cid-corrida-ok" },
    npcs: { piloto: { nome: "Lápis Verde, a piloto", tipo: "lapis", cor: 0x2bb24c, x: 70, z: 42, acessorio: "bone" } },
    pedido: "Oi, Rabisco! Pegue o carro e passe pelas bandeiras na ordem: 1, 2, 3, 4 e 5! O relógio começa na bandeira 1.",
    etapas: [{ tipo: "bandeiras", pontos: [[100, 50, 1], [140, 15, 0], [95, 0, 1], [50, 20, 0], [62, 50, 1]], ate: "piloto" }],
    fim: "Que corrida! Você passou por todas as bandeiras!",
  },
  {
    id: "fogo", titulo: "Bombeiros na rua", icone: "🚒", tipo: "cidadania", voz: { pedido: "cid-bombeiro", fim: "cid-bombeiro-ok" },
    npcs: { capitao: { nome: "Capitão Lápis Vermelho", tipo: "lapis", cor: 0xe63946, x: 37, z: -57.5, acessorio: "capacete" } },
    pedido: "Socorro! Tem quatro foguinhos na cidade. Chegue pertinho e aperte o botão da água!",
    etapas: [
      { tipo: "apagar", fogos: [[-57, -25], [57, -30], [-100, -42.5], [100, 43]], fala: "Fogo apagado!", voz: "cid-fogo-ok" },
      { tipo: "voltar", ate: "capitao" },
    ],
    fim: "A cidade está segura! Obrigado, Deus, por cuidar de nós!",
  },
  {
    id: "escola", titulo: "Hora da Aula", icone: "🎒", tipo: "cidadania", voz: { pedido: "cid-professora", fim: "cid-escola-ok" },
    npcs: {
      professora: { nome: "Professora Lápis Turquesa", tipo: "lapis", cor: 0x2ec4b6, escola: [7, 1.5], acessorio: "oculos" },
      mamae: { nome: "Mamãe Lápis Azul", tipo: "lapis", cor: 0x3d7ad9, casa: 2, lado: -1.6, acessorio: "laco" },
      aluno: { nome: "Lápis Azulzinho", tipo: "lapis", cor: 0x3d7ad9, escola: [4, 1.5], escala: 0.6, acessorio: "bone" },
    },
    pedido: "Oi, Rabisco! O sino da aula já vai tocar e o Lápis Azulzinho esqueceu a mochila em casa! Busque a mochila azul na casa azul, a de número dois, e traga para ele aqui na porta da escola!",
    etapas: [
      { tipo: "pegar", itens: [{ id: "mochila", nome: "mochila azul", emoji: "🎒", casa: 2 }], fala: "A mochila azul! Obrigada, Rabisco! Agora corra para a escola!", voz: "cid-mochila", quemFala: "mamae" },
      { tipo: "levar", ate: "aluno" },
    ],
    fim: "Minha mochila! Obrigado, Rabisco! Hoje a aula é das letras: A, B, C!",
  },
  {
    id: "remedio", titulo: "Remédio de helicóptero", icone: "🚁", tipo: "cidadania", voz: { fim: "cid-remedio-ok" },
    npcs: { doutora: { nome: "Doutora Lápis Branca", tipo: "lapis", cor: 0xf4f4f4, x: 17.8, z: -186, acessorio: "oculos" }, vovo: { nome: "Vovó Lápis", tipo: "vovo", x: 0, z: 0 } },
    pedido: "Oi, Rabisco! A Vovó Lápis precisa do remédio dela! Pegue a maleta, suba no helicóptero aqui do heliponto e pouse pertinho da casa dela, no Bairro das Casas.",
    etapas: [
      { tipo: "pegar", itens: [{ id: "maleta", nome: "maleta do remédio", emoji: "💊", x: 19.6, z: -184.6 }] },
      { tipo: "levarVeiculo", carga: { nome: "maleta do remédio", emoji: "💊" }, veiculos: ["heli"], ate: "vovo", pousar: true,
        aPe: "Que bom que você veio! Mas a doutora pediu para vir de helicóptero: pouse aqui pertinho.", vozAPe: "rp-remedio-heli" },
    ],
    fim: "Meu remédio! Obrigada, Rabisco! Que voo lindo! Deus cuida de nós com tanto carinho.",
  },
];
// palavras que não podem aparecer em nada que a criança vê ou ouve (teste rabiscopolis-conteudo.mjs)
export const PROIBIDAS = ["arma", "revólver", "pistola", "tiro", "matar", "morte", "morreu", "sangue", "prisão", "preso", "polícia prende", "ladrão", "roubo", "roubar", "briga", "brigar", "soco", "susto", "monstro", "fantasma", "zumbi", "namor", "beijo", "roblox", "brookhaven", "robux", "dinheiro", "comprar", "pagar"];
