// Rabiscolândia: as missões (dados puros, sem three.js: o teste de conteúdo lê este arquivo no node).
// Bíblicas (com versículo em paráfrase para crianças e "baseado em ...") e de cidadania, espalhadas pela cidade de
// antes, pelos bairros novos e pelo Mar Azul (essas só se fazem de jet ski ou de lancha). Em TODAS tem alguém
// esperando no destino, visível, que reage quando a criança chega. Sem tempo, sem perder: dá para largar e voltar.
//
// Etapas (em ordem):
//   { tipo: "falar", com: npcId }                              — conversar com alguém (ação perto dele)
//   { tipo: "pegar", itens: [{ id, nome, emoji, x, z, rotulo? }] } — pegar cada coisa (ação perto; vai em cima da cabeça;
//                                                                  rotulo troca o "Pegar ..." do botão)
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
//   { tipo: "evento", evento, lugar, texto, item? }            — acontece lá dentro de um lugar (embrulhou o presente na
//                                                                  Bella Cat, terminou o treino na Rise Up); item vai na cabeça
//   { tipo: "escolherCarro", de }                             — J.E: escolher um dos 5 carros do pátio ("⭐ Quero este!"); quem
//                                                                  vende entrega a chave e o carro vira um carro de verdade
//   levarVeiculo com veiculos: "escolhido" e portao: [x, z]    — sair dirigindo o carro escolhido pelo portão até quem espera
//   { tipo: "orar", tapete: [x, z], olhar, ate }               — Pai Nosso: no tapete azul, mãos juntas, frase por frase
//                                                                  (karaokê com as vozes cid-pai-1..11); o jogador 2 ora junto
//   { tipo: "cena", cena: "pet" | "obra", ate, falas: [{ texto, voz }] } — cena na rua, de missoes-cenas.js (a máquina do Marlon, a obra da
//                                                                  Kids II): o botão faz cada parte; no fim, quem espera reage
// npc.fachada: id do lugar da parceira cujo boneco da porta (mundo.js) é esse npc; a missão usa o mesmo boneco
// npcs: { id: { nome, tipo, cor, x, z, rot?, acessorio?, escala?, casa?: n, escola?: [dx, dz], caixa?: cor } } — tipo de
// personagens.js (lapis, giz, borracha...) ou bichinho (ovelha, coelho, gato); casa: na porta da casa n (posição na hora);
// escola: na porta da Educarte da idade da criança (Kids I até 4 anos, senão Kids II), deslocado [dx, dz];
// caixa: caixinha de correio dessa cor ao lado. O primeiro da lista é quem pede (com um "!" em cima).
// Só aparecem perto do Rabisco (orçamento de desenho). voz: { pedido?, fim? } reaproveita falas gravadas (cid-*).
// parceiro: id de src/parceiros.js: quem fala é a anfitriã e, no fim, ela faz a propaganda da empresa (propaganda.js).
// Nome da criança x "Rabisco" (regra do dono): a anfitriã/narradora fala o NOME DA CRIANÇA só na oração e no parabéns por
// missão concluída; ao mandar ir a algum lugar, fazer algo ou mexer no boneco, chama de "Rabisco". Nunca um pelo outro.
// Com o nome da criança (banco assets/voz/nomes): fimNome ("Parabéns, {nome}! ...": falas rp-m-<id>-fim-pre/-pos emendadas
// com o nome; sem nome no banco vale o `fim`, que então NÃO tem nome nem "Rabisco") e
// agradece: { pre, pos, neutra, texto, textoSem, ms } (quem recebe agradece pelo nome antes do "fim" da anfitriã).
// item.objeto (evento): vai na MÃO do Rabisco como objeto 3D (missoes-objetos.js), não na cabeça. levar.icone: do botão.
// corAcessorio (cor do laço) e tenis (cor do tênis): cada personagem com as suas cores.

// betoneira e carrinho de mão alugados na Construrenova: na calçada, em frente ao portão do galpão, do lado do seu Albino
const ALUGUEL_CONSTRURENOVA = [
  { id: "betoneira", nome: "betoneira", emoji: "🏗️", desenho: "betoneira", x: 148.3, z: 105.3, de: "albino", rotulo: "🔑 Alugar a betoneira" },
  { id: "carrinho", nome: "carrinho de mão", emoji: "🛞", desenho: "carrinho", x: 148.3, z: 107, de: "albino", rotulo: "🔑 Alugar o carrinho de mão" },
];
// garrafas PET na calçada, perto do galpão da Marlon Máquinas
const GARRAFAS_MARLON = [[-125, 147.5], [-112, 147.6], [-97, 147.5], [-84, 147.6]].map(([x, z], i) => ({ id: `pet${i + 1}`, nome: "garrafa PET", emoji: "🧴", x, z }));

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
  // ---- lojas parceiras por dentro (só existem se a parceira estiver em src/parceiros.js)
  {
    id: "presente", titulo: "Presente da Professora", icone: "🎁", tipo: "cidadania", voz: { pedido: "cid-bella", fim: "cid-bella-ok" }, parceiro: "bella-cat",
    npcs: {
      lilas: { nome: "Lápis Lilás, da Bella Cat", tipo: "lapis", cor: 0xa98ce0, x: 100.5, z: 8.2, acessorio: "laco" },
      professora: { nome: "Professora Lápis Turquesa", tipo: "lapis", mesmo: "escola:professora" },
    },
    pedido: "Oi, Rabisco! Que tal um presente para a Professora Lápis Turquesa? Entre na Bella Cat e escolha um acessório bem bonito!",
    etapas: [
      { tipo: "evento", evento: "embrulhou", lugar: "parceiro-bella-cat", texto: "Entre na Bella Cat, escolha e embrulhe um presente", item: { id: "presente", emoji: "🎁", nome: "presente" } },
      { tipo: "levar", ate: "professora" },
    ],
    fim: "Que lindo! A Professora Lápis Turquesa amou o presente. Obrigada por lembrar dela, Rabisco! Deus te abençoe!",
  },
  {
    id: "exercicio", titulo: "Treino na Rise Up", icone: "💪", tipo: "cidadania", voz: { pedido: "cid-rise" }, parceiro: "rise-up",
    npcs: { treinadora: { nome: "Treinadora Lápis Laranja", tipo: "lapis", cor: 0xff7a00, x: 123.5, z: 8.2, acessorio: "bone" } },
    pedido: "Oi, Rabisco! Esta é a Academia Rise Up, onde a gente cuida do corpo que Deus nos deu. Entre pela porta e vamos treinar!",
    etapas: [
      { tipo: "evento", evento: "treinou", lugar: "parceiro-rise-up", texto: "Entre na Rise Up: corra na esteira e levante o halter 5 vezes" },
      { tipo: "voltar", ate: "treinadora" },
    ],
    fim: "Que treino bonito! Agora, água fresquinha e um descanso. Corpo saudável, coração alegre!",
  },
  {
    id: "carroNovo", titulo: "Carro novo da J.E", icone: "🔑", tipo: "cidadania", voz: { pedido: "cid-je" }, parceiro: "je-multimarcas",
    npcs: {
      vendedor: { nome: "Seu Lápis Cinza, da J.E", tipo: "lapis", cor: 0x6b6b6b, x: 149.5, z: -77, rot: -Math.PI / 2, acessorio: "gravata" },
      verde: { nome: "Seu Lápis Verde", tipo: "lapis", cor: 0x4cae5a, casa: 4, acessorio: "chapeu" },
    },
    pedido: "Olá, Rabisco! Bem-vindo à J.E Multimarcas, a loja de carros! Entre no pátio pelo portão e escolha o carro que você mais gostar. Chegue pertinho e aperte o botão!",
    etapas: [
      { tipo: "escolherCarro", de: "vendedor", fala: "O Seu Lápis Cinza entregou a chave: o carro é seu! Cuide bem dele. Entre no carro e saia pelo portão!", voz: "cid-je-chave" },
      { tipo: "levarVeiculo", veiculos: "escolhido", carga: { nome: "carro novo", emoji: "🔑" }, ate: "verde", portao: [150, -82.5], falaPortao: "Boa viagem! Leve o carro novo até a casa verde: o Seu Lápis Verde quer ver!", vozPortao: "cid-je-portao" },
    ],
    fim: "Uau, que carro lindo! Parabéns! Vamos agradecer a Deus por esse presente!",
    fimNome: "Uau, que carro lindo! Parabéns, {nome}! Vamos agradecer a Deus por esse presente!",
  },
  {
    // Kids I: Diretora Carina (missão própria a fazer; por enquanto ela fica na porta, veja PESSOAS_PORTA)
    // Crescente Contabilidade: a Diretora Sabrina (só da Educarte Kids II) pede na porta da escola, a contadora Elaine entrega o alvará novo
    // (vai na mão do Rabisco) e a diretora recebe. O pedido é para o Rabisco ir (nada de nome); agradece: fala emendada
    // com o nome da criança no fim ("Alice"); sem nome no banco, a fala neutra (cid-alvara-obrigada).
    id: "alvara", titulo: "Alvará da Escola", icone: "📜", tipo: "cidadania", parceiro: "crescente-contabilidade",
    voz: { fim: "cid-alvara-ok" },
    npcs: {
      // boneco da Diretora Sabrina de verdade (pessoas.js): recebe o alvará nas mãos e comemora
      diretora: { nome: "Diretora Sabrina", tipo: "pessoa", pessoa: "sabrina", escola: [-4.5, 1.5], unidade: "kids2" },
    },
    pedido: "Oi, Rabisco! O alvará da escola venceu! Vá até a Crescente Contabilidade e fale com a contadora Elaine para buscar o alvará novo.",
    etapas: [
      { tipo: "evento", evento: "alvara", lugar: "parceiro-crescente-contabilidade", texto: "Vá até a Crescente Contabilidade e fale com a contadora Elaine", item: { id: "alvara", emoji: "📜", nome: "alvará", objeto: "alvara" } },
      { tipo: "levar", ate: "diretora", icone: "📜" },
    ],
    agradece: { pre: "cid-alvara-obrigada-pre", pos: "cid-alvara-obrigada-pos", neutra: "cid-alvara-obrigada", texto: "A Diretora Sabrina agradece, {nome}! Agora a escola está em dia.", textoSem: "A Diretora Sabrina agradece! Agora a escola está em dia.", ms: 3300 },
    fim: "Agora está tudo certinho! Ter uma boa contabilidade é essencial para qualquer empresa. Obrigada, Crescente Contabilidade!",
  },
  // ---- Igreja Reviver (a igreja da escola), de frente para a praça
  {
    id: "convite", titulo: "Convite para o culto infantil", icone: "💌", tipo: "biblica", voz: { pedido: "cid-igreja" },
    npcs: {
      tia: { nome: "Tia Lápis Lilás", tipo: "lapis", cor: 0xa98ce0, x: -6.5, z: -18, acessorio: "laco" },
      vermelhinho: { nome: "Lápis Vermelhinho", tipo: "lapis", cor: 0xe8413c, x: 86, z: -7.5, escala: 0.6, acessorio: "bone" },
      amarelinho: { nome: "Lápis Amarelinho", tipo: "lapis", cor: 0xffcc1f, x: 20, z: 76, escala: 0.6, acessorio: "laco" },
      verdinho: { nome: "Lápis Verdinho", tipo: "lapis", cor: 0x58c43a, x: -94, z: -5.5, escala: 0.6, acessorio: "bone" },
    },
    pedido: "Oi, Rabisco! Hoje tem culto infantil na Igreja Reviver! Convide três amigos lápis pela cidade e traga todos aqui. Siga os coraçõezinhos!",
    etapas: [{ tipo: "seguirVarios", quem: ["vermelhinho", "amarelinho", "verdinho"], ate: "tia", rotulo: "💌 Convidar", fala: "Oba! Eu vou ao culto infantil!", voz: "cid-convite", falaTodos: "Eu também vou! Três amigos! Agora vamos todos para a Igreja Reviver!", vozTodos: "cid-convite-todos" }],
    fim: "Que alegria! A turma toda chegou para o culto infantil. Obrigada por convidar os amigos!",
    verso: { texto: "Que alegria quando me chamam para ir à casa de Deus!", ref: "baseado em Salmos 122.1" },
  },
  {
    id: "painosso", titulo: "Orar o Pai Nosso", icone: "🙏", tipo: "biblica", voz: { pedido: "cid-painosso" },
    npcs: { tio: { nome: "Tio Lápis Azul", tipo: "lapis", cor: 0x1f3a8a, x: 6.5, z: -18, acessorio: "gravata" } },
    pedido: "Oi, Rabisco! Vamos orar juntos o Pai Nosso? Venha para o tapete azul na porta da igreja. Eu falo uma frase e você repete comigo, bem devagarinho.",
    etapas: [{ tipo: "orar", tapete: [0, -19.2], olhar: Math.PI, ate: "tio" }],
    fim: "Amém! Deus ouve a nossa oração, a de cada criança.",
    fimNome: "Amém, {nome}! Deus ouve a nossa oração, a de cada criança.",
    verso: { texto: "Jesus ensinou os amigos a conversar com Deus, chamando Deus de Pai.", ref: "baseado em Mateus 6.9-13" },
  },
  // ---- Mar Azul e Ilha da Alegria (só se chega de jet ski ou de lancha; quem fica na água espera abraçado na boia)
  {
    id: "resgateBoia", titulo: "Resgate na água", icone: "🛟", tipo: "cidadania",
    npcs: {
      salvavidas: { nome: "Salva-Vidas Lápis Vermelho", tipo: "lapis", cor: 0xe63946, x: -18, z: 265, rot: Math.PI, acessorio: "bone" },
      nadador: { nome: "Clipe Azul", tipo: "clipe", cor: 0x3d9af0, x: -62, z: 304, naAgua: true },
    },
    pedido: "Rabisco, o Clipe Azul nadou para longe, cansou e agora está boiando abraçado na boia! Pegue a lancha ou o jet ski no píer e traga ele de volta para a areia.",
    etapas: [{ tipo: "dirigir", passageiro: "nadador", ate: "salvavidas", comoIr: "de lancha ou jet ski", falaCarona: "Ufa! Obrigado, Rabisco! Já estou sentadinho. Vamos para a areia!", vozCarona: "rp-m-resgateBoia-carona", semBanco: "Aqui não tem lugar para mim! Venha de lancha ou de jet ski." }],
    fim: "Todo mundo a salvo! No mar, a gente nada sempre pertinho de um adulto e com a boia.",
  },
  {
    id: "piqueniqueIlha", titulo: "Piquenique na ilha", icone: "🧺", tipo: "biblica",
    npcs: { vovo: { nome: "Vovó Clipe", tipo: "clipe", cor: 0xff9fc8, x: 28, z: 292, rot: -Math.PI / 2, acessorio: "oculos" }, turma: { nome: "Turma da ilha", tipo: "piquenique", x: -5.5, z: 344 } },
    pedido: "Rabisco, a turma está esperando na Ilha da Alegria para um piquenique! A cesta é grande: leve de lancha, que ela está aqui do lado do píer.",
    etapas: [{ tipo: "levarVeiculo", de: "vovo", carga: { nome: "cesta de piquenique", emoji: "🧺" }, veiculos: ["lancha"], ate: "turma", comoIr: "de lancha",
      carregou: "A cesta está na lancha! Agora, para a ilha.", vozCarregou: "rp-m-piqueniqueIlha-carregou", aPe: "A cesta é grande! Venha de lancha: ela fica aqui do lado do píer.", vozAPe: "rp-m-piqueniqueIlha-ape",
      errado: "Aqui a cesta não cabe! Venha de lancha.", vozErrado: "rp-m-piqueniqueIlha-errado" }],
    fim: "Que piquenique gostoso! Sentar juntinhos e repartir deixa todo mundo feliz.",
    verso: { texto: "Os amigos de Jesus comiam juntos, com alegria e com o coração simples.", ref: "baseado em Atos 2.46" },
  },
  {
    id: "farol", titulo: "A luz do farol", icone: "💡", tipo: "biblica",
    npcs: { giz: { nome: "Seu Giz Azul", tipo: "giz", cor: 0x2f8fe8, x: 61, z: 259.5, rot: Math.PI, acessorio: "chapeu" }, faroleira: { nome: "Faroleira Lápis Amarela", tipo: "lapis", cor: 0xffcc1f, x: 14, z: 389, rot: 0.6, acessorio: "bone" } },
    pedido: "Rabisco, a luz do farol da ilha queimou! Pegue a lâmpada nova aqui no quiosque e leve de jet ski para a Faroleira Lápis Amarela, lá na ilha.",
    etapas: [
      { tipo: "pegar", itens: [{ id: "lampada", nome: "lâmpada nova", emoji: "💡", x: 74, z: 260.5 }] },
      { tipo: "levarVeiculo", carga: { nome: "lâmpada nova", emoji: "💡" }, veiculos: ["jetski"], ate: "faroleira", comoIr: "de jet ski", aPe: "Oi, Rabisco! A lâmpada chega mais rapidinho de jet ski: volte e venha com ele.", vozAPe: "rp-m-farol-ape" },
    ],
    fim: "A luz do farol acendeu! Agora os barquinhos encontram o caminho, até de noite.",
    verso: { texto: "Jesus disse: vocês são a luz do mundo. Deixe a sua luz brilhar fazendo o bem.", ref: "baseado em Mateus 5.14-16" },
  },
  {
    id: "regata", titulo: "Regata das boias", icone: "🏁", tipo: "cidadania",
    npcs: { capita: { nome: "Capitã Régua", tipo: "regua", x: 22.5, z: 262.5, rot: Math.PI, acessorio: "chapeu" } },
    pedido: "Oi, Rabisco! Vamos fazer uma regata no mar? Pegue o jet ski no píer e passe pelas boias na ordem: 1, 2, 3, 4 e 5!",
    etapas: [{ tipo: "bandeiras", pontos: [[46, 292, 0], [72, 338, 1], [42, 400, 0], [-46, 390, 0], [-44, 300, 1]], ate: "capita", veiculos: ["jetski"], titulo: "Regata das boias",
      textoPe: "Pegue o jet ski no píer e vá até a boia 1", aPe: "A regata é de jet ski! Ele está encostado no píer.", vozAPe: "rp-m-regata-ape" }],
    fim: "Que regata! Você passou por todas as boias do Mar Azul.",
  },
  {
    id: "rodaGigante", titulo: "Passeio na roda-gigante", icone: "🎡", tipo: "biblica",
    npcs: { turquesa: { nome: "Lápis Turquesa", tipo: "lapis", cor: 0x2ec4b6, x: -45, z: 257, rot: Math.PI, acessorio: "laco" }, bilheteiro: { nome: "Seu Pincel Roxo", tipo: "pincel", cor: 0x8e6cff, x: 0, z: 343.5, rot: Math.PI, acessorio: "bone" } },
    pedido: "Rabisco, vamos passear na roda-gigante da Ilha da Alegria? Vá de lancha ou de jet ski até a ilha e fale com o Seu Pincel Roxo no píer!",
    etapas: [
      { tipo: "levarVeiculo", carga: { nome: "ingresso da roda-gigante", emoji: "🎟️" }, veiculos: ["lancha", "jetski"], ate: "bilheteiro", comoIr: "de lancha ou jet ski", aPe: "Oi, Rabisco! Para chegar na ilha, venha de lancha ou de jet ski.", vozAPe: "rp-m-rodaGigante-ape" },
      { tipo: "evento", evento: "roda", lugar: "roda", texto: "Dê uma volta inteira na roda-gigante" },
      { tipo: "voltar", ate: "bilheteiro" },
    ],
    fim: "Lá de cima a cidade parece um desenho! Deus fez um mundo muito bonito para a gente cuidar.",
    verso: { texto: "Deus olhou para tudo o que tinha feito, e era muito bom!", ref: "baseado em Gênesis 1.31" },
  },
  {
    id: "pesca", titulo: "A rede cheia", icone: "🎣", tipo: "biblica",
    npcs: { pedro: { nome: "Pescador Pedro", tipo: "lapis", cor: 0x9a6232, x: 28, z: 280, rot: -Math.PI / 2, acessorio: "chapeu" }, andre: { nome: "Pescador André", tipo: "giz", cor: 0x5b8fd9, x: 4.5, z: 341.5, rot: Math.PI, acessorio: "chapeu" } },
    pedido: "Rabisco, ficamos a noite toda no mar e não pescamos nada! Leve a rede de lancha até o meu irmão André, na ilha. Vamos jogar a rede do outro lado do barco!",
    etapas: [{ tipo: "levarVeiculo", de: "pedro", carga: { nome: "rede de pesca", emoji: "🎣" }, veiculos: ["lancha"], ate: "andre", comoIr: "de lancha",
      carregou: "A rede está na lancha! Agora, para a ilha.", vozCarregou: "rp-m-pesca-carregou", aPe: "A rede é grande e pesada! Venha de lancha: ela fica do lado do píer.", vozAPe: "rp-m-pesca-ape",
      errado: "A rede não cabe aqui! Venha de lancha.", vozErrado: "rp-m-pesca-errado" }],
    fim: "Olha quantos peixinhos! A rede encheu do jeitinho que Jesus falou.",
    verso: { texto: "Jesus disse a Pedro para jogar a rede de novo, e ela ficou cheia de peixes!", ref: "baseado em Lucas 5.4-6" },
  },
  // ---- Vila dos Ipês (oeste, Rua dos Ipês: casas 17 a 24, Floricultura, Pizzaria e a Praça dos Ipês)
  {
    id: "flores", titulo: "Flores de aniversário", icone: "💐", tipo: "cidadania",
    npcs: { florista: { nome: "Florista Pincel Rosa", tipo: "pincel", cor: 0xec2e8c, x: -308.6, z: -113, rot: -Math.PI / 2, acessorio: "laco" }, vovo: { nome: "Vovó Borracha", tipo: "borracha", casa: 17 } },
    pedido: "Oi, Rabisco! Hoje é aniversário da Vovó Borracha, que mora na casa dezessete, aqui na Vila dos Ipês. Leve este buquê de flores para ela!",
    etapas: [{ tipo: "pegar", itens: [{ id: "buque", nome: "buquê de flores", emoji: "💐", x: -308.6, z: -118 }] }, { tipo: "levar", ate: "vovo", icone: "💐" }],
    fim: "Que flores lindas! Lembrar dos outros com carinho é um presente de verdade.",
  },
  {
    id: "lirios", titulo: "Os lírios do campo", icone: "🌼", tipo: "biblica",
    npcs: { jardineiro: { nome: "Jardineiro Caderno", tipo: "caderno", cor: 0x58c43a, x: -352, z: -136.5, acessorio: "chapeu" } },
    pedido: "Rabisco, a Praça dos Ipês está precisando de flores! Pegue as mudinhas na porta da Floricultura Florzinha e plante nos três buraquinhos da praça.",
    etapas: [
      { tipo: "pegar", itens: [{ id: "mudas", nome: "mudinhas de flor", emoji: "🌼", x: -308.6, z: -124.5 }] },
      { tipo: "plantar", pontos: [{ x: -361.5, z: -146 }, { x: -342.5, z: -146 }, { x: -352, z: -161 }], texto: "Plante as flores nos buraquinhos da praça" },
      { tipo: "levar", ate: "jardineiro", icone: "🌼" },
    ],
    fim: "Que praça florida! Deus cuida das flores do campo e cuida muito mais de você.",
    verso: { texto: "Olhem os lírios do campo: Deus veste as flores com tanta beleza, e cuida ainda mais de nós.", ref: "baseado em Mateus 6.28-30" },
  },
  {
    id: "pizza", titulo: "Pizza para a festa", icone: "🍕", tipo: "cidadania",
    npcs: { pizzaiolo: { nome: "Pizzaiolo Giz Vermelho", tipo: "giz", cor: 0xe8413c, x: -322.4, z: -184, rot: Math.PI / 2, acessorio: "chapeu" }, vizinha: { nome: "Dona Cola", tipo: "cola", casa: 26 } },
    pedido: "Rabisco, estas pizzas quentinhas são para a festa da Dona Cola, na casa vinte e seis, lá no Bairro das Palmeiras! É longe: venha de carro buscar.",
    etapas: [{ tipo: "levarVeiculo", de: "pizzaiolo", carga: { nome: "caixa de pizzas", emoji: "🍕" }, veiculos: "porta-malas", ate: "vizinha",
      carregou: "As pizzas estão no carro! Agora, para o Bairro das Palmeiras.", vozCarregou: "rp-m-pizza-carregou", aPe: "São muitas pizzas! Volte aqui de carro.", vozAPe: "rp-m-pizza-ape" }],
    fim: "Chegaram quentinhas! Agora a festa vai ficar completa. Obrigada, Rabisco!",
  },
  {
    id: "boasVindas", titulo: "Boas-vindas ao vizinho", icone: "🎂", tipo: "biblica",
    npcs: { vizinha: { nome: "Dona Régua", tipo: "regua", casa: 19 }, novo: { nome: "Seu Lápis Laranja", tipo: "lapis", cor: 0xff7a00, casa: 22, acessorio: "chapeu" } },
    pedido: "Rabisco, chegou um vizinho novo na casa vinte e dois! Leve este bolo de boas-vindas para o Seu Lápis Laranja e diga que ele é muito bem-vindo.",
    etapas: [{ tipo: "pegar", itens: [{ id: "bolo", nome: "bolo de boas-vindas", emoji: "🎂", casa: 19 }] }, { tipo: "levar", ate: "novo", icone: "🎂" }],
    fim: "Que recepção carinhosa! Agora eu já me sinto em casa aqui na Vila dos Ipês.",
    verso: { texto: "Recebam bem uns aos outros, com carinho, como Jesus recebe a gente.", ref: "baseado em Romanos 15.7" },
  },
  {
    id: "vovoCarona", titulo: "Carona para o vovô", icone: "👴", tipo: "biblica",
    npcs: { neta: { nome: "Lápis Rosa", tipo: "lapis", cor: 0xec2e8c, casa: 18, acessorio: "laco" }, vovo: { nome: "Vovô Régua", tipo: "regua", x: -321.2, z: -150, rot: Math.PI / 2, acessorio: "oculos" }, astronoma: { nome: "Astrônoma Régua", tipo: "regua", mesmo: "estrelas:astronoma" } },
    pedido: "Rabisco, o Vovô Régua quer muito ver as estrelas no Observatório, mas é longe para ir a pé. Ele está esperando na calçada da Rua dos Ipês: dá uma carona de carro para ele?",
    etapas: [{ tipo: "dirigir", passageiro: "vovo", ate: "astronoma", falaCarona: "Que carro confortável! Obrigado, Rabisco. Vamos para o Observatório!", vozCarona: "rp-m-vovoCarona-carona" }],
    fim: "Que céu lindo! Cuidar dos vovôs e das vovós é um jeito de mostrar o amor de Deus.",
    verso: { texto: "Respeite as pessoas mais velhas e cuide delas com carinho.", ref: "baseado em Levítico 19.32" },
  },
  {
    id: "cartasIpes", titulo: "Cartas na Vila dos Ipês", icone: "📬", tipo: "cidadania",
    npcs: {
      carteira: { nome: "Carteira Clipe Azul", tipo: "clipe", cor: 0x2f6fc0, x: -308.8, z: 24.2, rot: -Math.PI / 2, acessorio: "bone" },
      amarela: { nome: "Dona Giz Amarela", tipo: "giz", cor: 0xffcc1f, casa: 21, caixa: 0xffcc1f },
      verde: { nome: "Seu Pincel Verde", tipo: "pincel", cor: 0x1fc08e, casa: 23, caixa: 0x58c43a },
      laranja: { nome: "Dona Caderno Laranja", tipo: "caderno", cor: 0xff7a00, casa: 24, caixa: 0xff7a00 },
    },
    pedido: "Rabisco, chegaram três cartas para a Vila dos Ipês: a amarela, a verde e a laranja! Cada uma vai para a caixinha de correio da mesma cor.",
    etapas: [
      { tipo: "pegar", itens: [{ id: "c-amarela", nome: "carta amarela", emoji: "✉️", cor: 0xffcc1f, x: -308.8, z: 21 }, { id: "c-verde", nome: "carta verde", emoji: "✉️", cor: 0x58c43a, x: -308.8, z: 18.5 }, { id: "c-laranja", nome: "carta laranja", emoji: "✉️", cor: 0xff7a00, x: -308.8, z: 16 }] },
      { tipo: "entregar", entregas: [{ item: "c-amarela", ate: "amarela" }, { item: "c-verde", ate: "verde" }, { item: "c-laranja", ate: "laranja" }], fala: "Carta entregue! Era a caixinha da cor certa.", voz: "cid-carta-ok" },
    ],
    fim: "Todas as cartas chegaram! Uma cartinha carinhosa alegra o dia de qualquer vizinho.",
  },
  // ---- Bairro das Palmeiras (leste, Rua das Palmeiras: casas 25 a 32, Farmácia, Loja de Brinquedos e a Praça das Palmeiras)
  {
    id: "farmacia", titulo: "O xarope do vovô", icone: "🧴", tipo: "cidadania",
    npcs: {
      neto: { nome: "Giz Verdinho", tipo: "giz", cor: 0x58c43a, casa: 29, escala: 0.6, acessorio: "bone" },
      farmaceutica: { nome: "Farmacêutica Cola", tipo: "cola", x: 308.6, z: 125.5, rot: Math.PI / 2 },
      vovo: { nome: "Vovô Lápis Cinza", tipo: "lapis", cor: 0x9a9aa6, casa: 31, acessorio: "oculos" },
    },
    pedido: "Rabisco, o meu vovô está gripado! A doutora já passou o xarope: fale com a farmacêutica na Farmácia Saúde e leve o xarope para ele, na casa trinta e um.",
    etapas: [{ tipo: "falar", com: "farmaceutica" }, { tipo: "pegar", itens: [{ id: "xarope", nome: "xarope", emoji: "🧴", x: 308.6, z: 119.5 }] }, { tipo: "levar", ate: "vovo", icone: "🧴" }],
    fim: "Obrigado, Rabisco! Com o xarope, um chazinho e muito carinho, logo eu fico bom.",
  },
  {
    id: "brinquedo", titulo: "O ioiô repartido", icone: "🪀", tipo: "biblica",
    npcs: { dona: { nome: "Dona Caderno Azul", tipo: "caderno", cor: 0x00b5f0, x: 321.4, z: -114, rot: -Math.PI / 2, acessorio: "oculos" }, amiga: { nome: "Lápis Laranjinha", tipo: "lapis", cor: 0xff9f43, casa: 28, escala: 0.6, acessorio: "laco" } },
    pedido: "Rabisco, a Lápis Laranjinha machucou o pé e não pode brincar lá fora. Leve este ioiô colorido da Loja de Brinquedos para ela brincar em casa, na casa vinte e oito!",
    etapas: [{ tipo: "pegar", itens: [{ id: "ioio", nome: "ioiô colorido", emoji: "🪀", x: 321.4, z: -119.5 }] }, { tipo: "levar", ate: "amiga", icone: "🪀" }],
    fim: "Um ioiô! Agora eu brinco aqui sentadinha. Obrigada por lembrar de mim!",
    verso: { texto: "Deus ama quem reparte com alegria.", ref: "baseado em 2 Coríntios 9.7" },
  },
  {
    id: "corridaPalmeiras", titulo: "Corrida das Palmeiras", icone: "🏎️", tipo: "cidadania",
    npcs: { piloto: { nome: "Pincel Verde, o piloto", tipo: "pincel", cor: 0x1fc08e, x: 300, z: 60.5, rot: Math.PI, acessorio: "bone" } },
    pedido: "Oi, Rabisco! Que tal uma corrida pelo Bairro das Palmeiras? Pegue um carro e passe pelas bandeiras na ordem: 1, 2, 3, 4 e 5!",
    etapas: [{ tipo: "bandeiras", pontos: [[340, 50, 1], [390, 20, 0], [355, 0, 1], [315, -25, 0], [275, 50, 1]], ate: "piloto", titulo: "Corrida das Palmeiras" }],
    fim: "Que corrida! Você dirigiu com cuidado e passou por todas as bandeiras.",
  },
  {
    id: "festaPalmeiras", titulo: "Festa na praça", icone: "🎉", tipo: "cidadania",
    npcs: {
      animadora: { nome: "Animadora Clipe Rosa", tipo: "clipe", cor: 0xec2e8c, x: 352, z: 163, rot: Math.PI, acessorio: "laco" },
      a1: { nome: "Borrachinha Azul", tipo: "borracha", casa: 25, escala: 0.6 },
      a2: { nome: "Lápis Verdinho", tipo: "lapis", cor: 0x58c43a, casa: 30, escala: 0.6, acessorio: "bone" },
      a3: { nome: "Giz Amarelinho", tipo: "giz", cor: 0xffcc1f, casa: 32, escala: 0.6 },
    },
    pedido: "Rabisco, hoje tem festa na Praça das Palmeiras! Convide três amiguinhos nas casas do bairro e traga todo mundo para cá!",
    etapas: [{ tipo: "seguirVarios", quem: ["a1", "a2", "a3"], ate: "animadora", rotulo: "🎉 Convidar", fala: "Oba! Eu vou na festa!", voz: "rp-m-festaPalmeiras-convite", falaTodos: "Todo mundo junto! Agora, para a Praça das Palmeiras!", vozTodos: "rp-m-festaPalmeiras-todos" }],
    fim: "Que festa animada! Brincar junto é muito melhor.",
  },
  {
    id: "mudanca", titulo: "Ajudar na mudança", icone: "📦", tipo: "biblica",
    npcs: { dona: { nome: "Dona Caderno Lilás", tipo: "caderno", cor: 0xa98ce0, x: 300, z: -308.5, rot: 0, acessorio: "oculos" }, marido: { nome: "Seu Caderno Verde", tipo: "caderno", cor: 0x4cae5a, casa: 30, acessorio: "chapeu" } },
    pedido: "Rabisco, a Dona Caderno Lilás vai sair das Torres do Horizonte e morar numa casinha no Bairro das Palmeiras! Ajude na mudança: leve as caixas de carro até a casa trinta.",
    etapas: [{ tipo: "levarVeiculo", de: "dona", carga: { nome: "caixas da mudança", emoji: "📦" }, veiculos: "porta-malas", ate: "marido",
      carregou: "As caixas estão no carro! Agora, para a casa trinta.", vozCarregou: "rp-m-mudanca-carregou", aPe: "São caixas demais para levar a pé! Venha de carro.", vozAPe: "rp-m-mudanca-ape" }],
    fim: "Tudo arrumadinho na casa nova! Com ajuda, o trabalho fica leve.",
    verso: { texto: "Ajudem uns aos outros a carregar o que é pesado, como Jesus ensinou.", ref: "baseado em Gálatas 6.2" },
  },
  // ---- Jardim das Estrelas (norte, Rua do Arco-Íris: Praça das Estrelas, Museu dos Dinossauros e Observatório Estrelinha)
  {
    id: "estrelas", titulo: "Contar as estrelas", icone: "⭐", tipo: "biblica",
    npcs: { astronoma: { nome: "Astrônoma Régua", tipo: "regua", x: -7.6, z: -349.5, rot: Math.PI / 2, acessorio: "oculos" } },
    pedido: "Rabisco, caíram três estrelinhas de papel do Observatório lá na Praça das Estrelas! Junte todas e traga de volta para cá.",
    etapas: [{ tipo: "pegar", itens: [{ id: "e1", nome: "estrelinha", emoji: "⭐", x: -150, z: -339 }, { id: "e2", nome: "estrelinha", emoji: "⭐", x: -139, z: -361 }, { id: "e3", nome: "estrelinha", emoji: "⭐", x: -162, z: -360 }] }, { tipo: "levar", ate: "astronoma", icone: "⭐" }],
    fim: "Todas de volta! Quando você olhar o céu de noite, lembre: Deus conhece cada estrela pelo nome.",
    verso: { texto: "Deus levou Abraão para fora e disse: olhe para o céu e conte as estrelas, se puder!", ref: "baseado em Gênesis 15.5" },
  },
  {
    id: "dinossauros", titulo: "O ossinho do museu", icone: "🦴", tipo: "cidadania",
    npcs: { guia: { nome: "Guia Caderno Verde", tipo: "caderno", cor: 0x3c9a4a, x: 160, z: -321.5, rot: Math.PI, acessorio: "chapeu" } },
    pedido: "Rabisco, o ossinho de dinossauro do museu sumiu! Vamos seguir as pistas? A primeira está no gramado do outro lado da rua, bem na frente do museu.",
    etapas: [
      { tipo: "pistas", pistas: [
        { x: 150, z: -301 },
        { x: -138, z: -342, texto: "Achou! A próxima pista está na Praça das Estrelas, perto do chafariz.", voz: "rp-m-dinossauros-pista-2" },
        { x: -15, z: -330, texto: "Muito bem! A última pista está perto do Observatório, onde a gente olha o céu.", voz: "rp-m-dinossauros-pista-3" },
      ], achou: "Você achou o ossinho do dinossauro! Leve de volta para o Guia Caderno Verde, no museu.", vozAchou: "rp-m-dinossauros-achou" },
      { tipo: "levar", ate: "guia", icone: "🦴" },
    ],
    fim: "O ossinho voltou para o museu! Cuidar das coisas de todos é cuidar da cidade.",
  },
  {
    id: "criancas", titulo: "Jesus e as crianças", icone: "📖", tipo: "biblica",
    npcs: {
      professor: { nome: "Professor Lápis Azul", tipo: "lapis", cor: 0x1f3a8a, x: -150, z: -365.5, acessorio: "oculos" },
      k1: { nome: "Lápis Rosinha", tipo: "lapis", cor: 0xff9fc8, x: -96, z: -333, escala: 0.6, acessorio: "laco" },
      k2: { nome: "Giz Azulzinho", tipo: "giz", cor: 0x7fd6ff, x: -58.5, z: -300, escala: 0.6, acessorio: "bone" },
      k3: { nome: "Borrachinha Verde", tipo: "borracha", x: -205, z: -308.5, escala: 0.6 },
    },
    pedido: "Rabisco, vou contar uma história da Bíblia na Praça das Estrelas! Chame três crianças pelo Jardim das Estrelas e traga todas para ouvir.",
    etapas: [{ tipo: "seguirVarios", quem: ["k1", "k2", "k3"], ate: "professor", rotulo: "📖 Chamar", fala: "Oba! Eu adoro histórias!", voz: "rp-m-criancas-convite", falaTodos: "Somos três! Vamos para a Praça das Estrelas!", vozTodos: "rp-m-criancas-todos" }],
    fim: "Todo mundo sentadinho! Hoje a história é de quando Jesus abraçou as crianças.",
    verso: { texto: "Jesus disse: deixem as crianças virem a mim! E abraçou e abençoou cada uma.", ref: "baseado em Marcos 10.14-16" },
  },
  {
    id: "coelhos", titulo: "Os coelhinhos fujões", icone: "🐰", tipo: "cidadania",
    npcs: {
      dona: { nome: "Dona Apontador Lilás", tipo: "apontador", cor: 0xa98ce0, x: -110, z: -324, rot: Math.PI, acessorio: "oculos" },
      c1: { nome: "Coelhinho Branco", tipo: "coelho", x: -175, z: -371 },
      c2: { nome: "Coelhinho Saltitante", tipo: "coelho", x: -120, z: -296 },
      c3: { nome: "Coelhinho Dorminhoco", tipo: "coelho", x: -230, z: -340 },
    },
    pedido: "Rabisco, os meus três coelhinhos pularam a cerca e se espalharam pelo Jardim das Estrelas! Você me ajuda a achar?",
    etapas: [{ tipo: "achar", bichos: ["c1", "c2", "c3"], ate: "dona", rotulo: "🐰 Achar o coelhinho", fala: "Achei um coelhinho! Ele vem pulando atrás de você.", voz: "rp-m-coelhos-achou", oque: "coelhinhos", emoji: "🐰" }],
    fim: "Os três estão aqui! Obrigada por procurar com tanta paciência.",
  },
  {
    id: "luneta", titulo: "A luneta grande", icone: "🔭", tipo: "cidadania",
    npcs: { astronomo: { nome: "Astrônomo Clipe Roxo", tipo: "clipe", cor: 0x8e6cff, x: 140, z: -321.5, rot: Math.PI, acessorio: "oculos" }, astronoma: { nome: "Astrônoma Régua", tipo: "regua", mesmo: "estrelas:astronoma" } },
    pedido: "Rabisco, o museu emprestou uma luneta enorme para o Observatório Estrelinha! Ela não cabe na mão: venha de carro buscar.",
    etapas: [{ tipo: "levarVeiculo", de: "astronomo", carga: { nome: "luneta grande", emoji: "🔭" }, veiculos: "porta-malas", ate: "astronoma",
      carregou: "A luneta está no carro! Agora, para o Observatório.", vozCarregou: "rp-m-luneta-carregou", aPe: "A luneta é grande demais para levar a pé! Volte aqui de carro.", vozAPe: "rp-m-luneta-ape" }],
    fim: "Que luneta linda! Hoje de noite a gente vai ver a lua bem de pertinho.",
  },
  // ---- Orla do Mar Azul (a pé, na areia) e Ilha da Alegria (chega-se de barco)
  {
    id: "conchas", titulo: "Colar de conchinhas", icone: "🐚", tipo: "cidadania",
    npcs: { menina: { nome: "Giz Lilás", tipo: "giz", cor: 0xa98ce0, x: -100, z: 259.5, rot: Math.PI, acessorio: "laco" } },
    pedido: "Rabisco, eu quero fazer um colar de conchinhas! Me ajuda a achar cinco conchinhas na areia da Praia do Mar Azul?",
    etapas: [
      { tipo: "pegar", itens: [{ id: "k1", nome: "conchinha", emoji: "🐚", x: -132, z: 263 }, { id: "k2", nome: "conchinha", emoji: "🐚", x: -116, z: 266.5 }, { id: "k3", nome: "conchinha", emoji: "🐚", x: -86, z: 256.5 }, { id: "k4", nome: "conchinha", emoji: "🐚", x: -150, z: 257 }, { id: "k5", nome: "conchinha", emoji: "🐚", x: -170, z: 265.5 }] },
      { tipo: "levar", ate: "menina", icone: "🐚" },
    ],
    fim: "Cinco conchinhas! Vai ficar o colar mais bonito da praia. Obrigada!",
  },
  {
    id: "praiaLimpa", titulo: "Praia limpinha", icone: "🧴", tipo: "cidadania",
    npcs: { gari: { nome: "Gari Apontador Verde", tipo: "apontador", cor: 0x2bb24c, x: 104, z: 259, rot: Math.PI, acessorio: "bone" } },
    pedido: "Rabisco, deixaram lixinho na areia, e ele pode ir parar no mar! Me ajuda a recolher tudo e jogar na lixeira?",
    etapas: [
      { tipo: "pegar", itens: [{ id: "p1", nome: "garrafinha", emoji: "🧴", x: 92, z: 263.5 }, { id: "p2", nome: "papel", emoji: "📄", x: 124, z: 256 }, { id: "p3", nome: "latinha", emoji: "🥫", x: 141, z: 266 }, { id: "p4", nome: "sacolinha", emoji: "🛍️", x: 160, z: 260 }, { id: "p5", nome: "copinho", emoji: "🥤", x: 116, z: 267 }] },
      { tipo: "levar", ate: "gari", icone: "🗑️" },
    ],
    fim: "Praia limpinha e peixinhos felizes! Cuidar da natureza é cuidar do que Deus criou.",
  },
  {
    id: "aguaCoco", titulo: "Água de coco geladinha", icone: "🥥", tipo: "cidadania",
    npcs: { vendedora: { nome: "Dona Clipe Verde", tipo: "clipe", cor: 0x6fbf3a, x: 67, z: 259.8, rot: Math.PI, acessorio: "chapeu" }, salvavidas: { nome: "Salva-Vidas Lápis Vermelho", tipo: "lapis", mesmo: "resgateBoia:salvavidas" } },
    pedido: "Rabisco, está um calorão! Leve esta água de coco geladinha para o Salva-Vidas Lápis Vermelho, que está cuidando de todo mundo na praia.",
    etapas: [{ tipo: "pegar", itens: [{ id: "coco", nome: "água de coco", emoji: "🥥", x: 70.5, z: 261 }] }, { tipo: "levar", ate: "salvavidas", icone: "🥥" }],
    fim: "Que delícia! No calor, todo mundo precisa beber água. Obrigado por cuidar de quem cuida da gente!",
  },
  {
    id: "coqueirosIlha", titulo: "Coqueiros na ilha", icone: "🌴", tipo: "biblica",
    npcs: { jardineira: { nome: "Jardineira Pincel Laranja", tipo: "pincel", cor: 0xff7a00, x: -10, z: 357, acessorio: "chapeu" } },
    pedido: "Rabisco, vamos plantar coqueirinhos novos na Ilha da Alegria? Pegue os coquinhos aqui do meu lado e plante nos dois buraquinhos perto da roda-gigante.",
    etapas: [
      { tipo: "pegar", itens: [{ id: "coquinhos", nome: "coquinhos", emoji: "🥥", x: -13, z: 355 }] },
      { tipo: "plantar", pontos: [{ x: -14, z: 371 }, { x: 13, z: 367 }], texto: "Plante os coquinhos nos buraquinhos da ilha" },
      { tipo: "levar", ate: "jardineira", icone: "🌴" },
    ],
    fim: "Daqui a um tempinho vão nascer coqueiros bem altos! Quem planta com amor colhe com alegria.",
    verso: { texto: "Quem planta com generosidade também vai colher com fartura.", ref: "baseado em 2 Coríntios 9.6" },
  },
  {
    id: "bauIlha", titulo: "O baú da ilha", icone: "🧭", tipo: "cidadania",
    npcs: { capitao: { nome: "Capitão Borracha", tipo: "borracha", x: 10, z: 352, rot: Math.PI, acessorio: "chapeu" } },
    pedido: "Olá, Rabisco! Tem um baú escondido aqui na Ilha da Alegria. A primeira pista: procure perto do farol listrado!",
    etapas: [
      { tipo: "pistas", pistas: [
        { x: 15, z: 380.5 },
        { x: -9, z: 368.5, texto: "Achou! A próxima pista está pertinho da roda-gigante.", voz: "rp-m-bauIlha-pista-2" },
        { x: -18.5, z: 357.5, texto: "Muito bem! Agora procure perto do guarda-sol, na areia.", voz: "rp-m-bauIlha-pista-3" },
      ], achou: "Você achou o baú: dentro tem conchinhas, uma bússola e um mapa da ilha! Leve para o Capitão Borracha.", vozAchou: "rp-m-bauIlha-achou" },
      { tipo: "levar", ate: "capitao", icone: "🧭" },
    ],
    fim: "Que tesouro bonito! E o melhor de tudo é descobrir a ilha junto com os amigos.",
  },
  // ---- empresas parceiras, cada uma com a missão do seu ramo (quem pede fica na porta da loja; a propaganda vem no fim)
  {
    id: "cestaGala", titulo: "Cesta com buquê", icone: "💐", tipo: "cidadania", parceiro: "gala-presentes",
    npcs: {
      dourado: { nome: "Lápis Dourado, da Gala Presentes", tipo: "lapis", cor: 0xd9a520, x: -42.5, z: 36, rot: -Math.PI / 2, acessorio: "gravata" },
      aniversariante: { nome: "Dona Giz Rosa", tipo: "giz", cor: 0xff9fc8, casa: 8, acessorio: "laco" },
    },
    pedido: "Rabisco, hoje é aniversário da Dona Giz Rosa, e ela está esperando na casa oito! Monte o presente aqui na Gala Presentes: a cesta, o buquê e o cartão.",
    etapas: [
      { tipo: "pegar", itens: [{ id: "cesta", nome: "a cesta", emoji: "🧺", x: -43.5, z: 33 }, { id: "buque", nome: "o buquê", emoji: "💐", x: -43.5, z: 28 }, { id: "cartao", nome: "o cartão", emoji: "💌", x: -43.5, z: 24 }], fala: "Cesta pronta! Agora, entrega rápida para a Dona Giz Rosa, na casa oito.", voz: "rp-m-cestaGala-pegou" },
      { tipo: "levar", ate: "aniversariante", icone: "💐" },
    ],
    fim: "A cesta chegou rapidinho, e a Dona Giz Rosa ficou muito feliz. Alegrar alguém é mostrar o amor de Deus.",
    fimNome: "Muito bem, {nome}! A cesta chegou rapidinho, e a Dona Giz Rosa ficou muito feliz. Alegrar alguém é mostrar o amor de Deus.",
  },
  {
    // a moeda perdida (Lucas 15.8-9): a vela e a vassoura são as da história; a dona festeja no fim
    id: "semijoiaPerdida", titulo: "A semijoia perdida", icone: "💍", tipo: "biblica", parceiro: "see-love-joias",
    npcs: {
      perola: { nome: "Lápis Pérola, da See Love", tipo: "lapis", cor: 0xe8dcc8, x: 57.5, z: -115, rot: -Math.PI / 2, acessorio: "laco" },
      dona: { nome: "Dona Régua Rosa", tipo: "regua", casa: 16, acessorio: "oculos" },
    },
    pedido: "Rabisco, a Dona Régua Rosa perdeu uma semijoia na cidade! Pegue a vela e a vassoura aqui na See Love Semijoias e procure com cuidado.",
    etapas: [
      { tipo: "pegar", itens: [{ id: "vela", nome: "a vela", emoji: "🕯️", x: 57, z: -123 }, { id: "vassoura", nome: "a vassoura", emoji: "🧹", x: 57, z: -127 }], fala: "Luz acesa e vassoura na mão! Agora procure na frente da Biblioteca.", voz: "rp-m-semijoiaPerdida-procure" },
      { tipo: "pegar", itens: [{ id: "semijoia", nome: "a semijoia", emoji: "💍", x: 7, z: -53 }], fala: "Achou a semijoia! Leve para a Dona Régua Rosa, na casa dezesseis.", voz: "rp-m-semijoiaPerdida-achou" },
      { tipo: "levar", ate: "dona", icone: "💍" },
    ],
    fim: "A semijoia voltou para a dona!",
    fimNome: "Muito bem, {nome}! A semijoia voltou para a dona!",
    verso: { texto: "Uma mulher perdeu uma moeda. Acendeu a luz, varreu a casa e procurou até achar. Depois, chamou as amigas para festejar.", ref: "baseado em Lucas 15.8-9" },
  },
  {
    id: "uniformesCarina", titulo: "Uniformes novos da Educarte", icone: "👕", tipo: "cidadania", parceiro: "bella-company",
    npcs: {
      anil: { nome: "Lápis Anil, da Bella Company", tipo: "lapis", cor: 0x3f51b5, x: 223, z: 58, rot: Math.PI, acessorio: "bone" },
      // a mesma Diretora Carina da porta da Kids I (PESSOAS_PORTA), que fica escondida enquanto esta aparece
      carina: { nome: "Diretora Carina", tipo: "pessoa", pessoa: "carina", escola: [-4.5, 1.5], unidade: "kids1", soNaMissao: true },
    },
    pedido: "Rabisco, os uniformes novos da Educarte ficaram prontos na Bella Company! Pegue as camisetas e os agasalhos e leve para a Diretora Carina, na Educarte Kids I.",
    etapas: [
      { tipo: "pegar", itens: [{ id: "camisetas", nome: "as camisetas", emoji: "👕", x: 212, z: 57.5 }, { id: "agasalhos", nome: "os agasalhos", emoji: "🧥", x: 207.5, z: 57.5 }], fala: "Uniformes prontos! A Educarte Kids I fica do outro lado da cidade: chame um carro no Rabifone.", voz: "rp-m-uniformesCarina-pegou" },
      { tipo: "levar", ate: "carina", icone: "👕" },
    ],
    fim: "Os uniformes chegaram, e a Diretora Carina ficou muito feliz. Cuidar de cada criança é mostrar o amor de Deus.",
    fimNome: "Muito bem, {nome}! Os uniformes chegaram, e a Diretora Carina ficou muito feliz. Cuidar de cada criança é mostrar o amor de Deus.",
  },
  {
    id: "devocionalKids", titulo: "O devocional do Clipe", icone: "📖", tipo: "biblica", parceiro: "cafe-com-deus-pai-kids",
    npcs: {
      marrom: { nome: "Lápis Marrom, do Café com Deus Pai Kids", tipo: "lapis", cor: 0x8a5a2b, x: -42.5, z: -156, rot: -Math.PI / 2, acessorio: "oculos" },
      clipe: { nome: "Clipe Azulzinho", tipo: "clipe", cor: 0x00b5f0, casa: 15, escala: 0.6, acessorio: "bone" },
    },
    pedido: "Rabisco, o Clipe Azulzinho está esperando um devocional na casa quinze! Busque o Café com Deus Pai Kids aqui na loja e leve para ele.",
    etapas: [
      { tipo: "pegar", itens: [{ id: "devocional", nome: "o devocional", emoji: "📖", x: -43.5, z: -166 }], fala: "O devocional está com você! No caminho, agradeça a Deus por três presentes: o sol, o pão e a família.", voz: "rp-m-devocionalKids-pegou" },
      { tipo: "pegar", itens: [{ id: "sol", nome: "o sol", emoji: "☀️", rotulo: "🙏 Agradecer pelo sol", x: -48, z: -131 }, { id: "pao", nome: "o pão", emoji: "🥖", rotulo: "🙏 Agradecer pelo pão", x: -48, z: -118 }, { id: "familia", nome: "a família", emoji: "🏠", rotulo: "🙏 Agradecer pela família", x: -60, z: -103 }], fala: "Que coração agradecido! Agora entregue o devocional para o Clipe Azulzinho.", voz: "rp-m-devocionalKids-gratidao" },
      { tipo: "levar", ate: "clipe", icone: "📖" },
    ],
    fim: "Amém! O Clipe Azulzinho agradeceu a Deus junto com você.",
    fimNome: "Amém, {nome}! O Clipe Azulzinho agradeceu a Deus junto com você.",
    verso: { texto: "Agradeçam a Deus em todas as situações.", ref: "baseado em 1 Tessalonicenses 5.18" },
  },
  // ---- Vovô Léo, amigo do Rabisco: conta histórias bíblicas em eventos nas escolas. É pessoa de verdade: não fala, a anfitriã narra
  {
    id: "maletaLeo", titulo: "A maleta de histórias", icone: "🧳", tipo: "biblica",
    npcs: {
      leo: { nome: "Vovô Léo", tipo: "pessoa", pessoa: "vovo-leo", escola: [-10, 1.5], unidade: "kids1" },
      vizinha: { nome: "Dona Caderno Rosa", tipo: "caderno", cor: 0xff9fc8, casa: 20, acessorio: "oculos" },
    },
    pedido: "Rabisco, o Vovô Léo chegou na Educarte Kids I para contar histórias da Bíblia aos pequeninos, mas a maleta de histórias ficou na casa vinte, na Vila dos Ipês! Busque a maleta e leve para ele.",
    etapas: [
      { tipo: "pegar", itens: [{ id: "maleta", nome: "maleta de histórias", emoji: "🧳", casa: 20 }], fala: "Aqui está a maleta! Agora leve para o Vovô Léo, na Educarte Kids I.", voz: "rp-m-maletaLeo-pegou", quemFala: "vizinha" },
      { tipo: "levar", ate: "leo", icone: "🧳" },
    ],
    fim: "A maleta chegou! Os pequeninos já estão sentadinhos para ouvir a história do Vovô Léo.",
    fimNome: "Muito bem, {nome}! A maleta chegou e os pequeninos já estão sentadinhos para ouvir a história do Vovô Léo.",
    verso: { texto: "Desde pequenino, Timóteo conhecia as palavras da Bíblia, que ensinam a confiar em Jesus.", ref: "baseado em 2 Timóteo 3.15" },
  },
  {
    id: "samuelLeo", titulo: "A história de Samuel", icone: "👂", tipo: "biblica",
    npcs: {
      leo: { nome: "Vovô Léo", tipo: "pessoa", pessoa: "vovo-leo", escola: [-10, 1.5], unidade: "kids2", objeto: true },
      k1: { nome: "Clipe Verdinho", tipo: "clipe", cor: 0x58c43a, x: 170, z: 8.2, escala: 0.6, acessorio: "bone" },
      k2: { nome: "Caderninho Lilás", tipo: "caderno", cor: 0xa98ce0, x: 222, z: 8.2, escala: 0.6, acessorio: "laco" },
      k3: { nome: "Pincel Amarelinho", tipo: "pincel", cor: 0xffcc1f, casa: 27, escala: 0.6, acessorio: "bone" },
    },
    pedido: "Rabisco, o Vovô Léo vai contar uma história da Bíblia na Educarte Kids II! Chame três crianças, uma delas na casa vinte e sete, no Bairro das Palmeiras, e traga todas para ouvir. Siga os coraçõezinhos!",
    etapas: [{ tipo: "seguirVarios", quem: ["k1", "k2", "k3"], ate: "leo", rotulo: "👂 Chamar", fala: "Oba! Eu adoro histórias!", voz: "rp-m-criancas-convite", falaTodos: "Somos três! Vamos para a Educarte Kids II!", vozTodos: "rp-m-samuelLeo-todos" }],
    fim: "Todo mundo sentadinho! O Vovô Léo contou do menino Samuel, que ouviu Deus chamar de noite e aprendeu a escutar.",
    fimNome: "Muito bem, {nome}! Todo mundo sentadinho! O Vovô Léo contou do menino Samuel, que ouviu Deus chamar de noite e aprendeu a escutar.",
    verso: { texto: "O menino Samuel respondeu a Deus: fala, que o teu servo está ouvindo.", ref: "baseado em 1 Samuel 3.10" },
  },
  // ---- missões especiais das parceiras, pelo ramo de cada uma. Pessoas de verdade (seu Marlon, seu Albino, Tia Regina, Prof. Samira, Diretora Sabrina) não falam: a anfitriã narra
  {
    // Marlon Máquinas: junta garrafas PET pela rua e vê a máquina do galpão separar rótulo, tampa e flocos
    id: "parceiro-marlon-maquinas", titulo: "A máquina das garrafas", icone: "♻️", tipo: "cidadania", parceiro: "marlon-maquinas",
    npcs: { marlon: { nome: "Seu Marlon", tipo: "pessoa", pessoa: "marlon", fachada: "parceiro-marlon-maquinas" } },
    pedido: "Rabisco, o seu Marlon convidou você para visitar o galpão da Marlon Máquinas! Junte quatro garrafas PET aqui perto e traga para ele mostrar como a reciclagem funciona.",
    etapas: [
      { tipo: "pegar", itens: GARRAFAS_MARLON, fala: "Quatro garrafas! Agora vá até o portão do galpão: o seu Marlon vai mostrar a máquina.", voz: "rp-m-parceiro-marlon-maquinas-pegou" },
      { tipo: "cena", cena: "pet", ate: "marlon", falas: [
        { texto: "O seu Marlon mostra a máquina: um container que pica a garrafa PET e separa tudo. Coloque a primeira garrafa na esteira!", voz: "rp-m-parceiro-marlon-maquinas-maquina" },
        { texto: "Viu só? A tampa caiu numa caixa, o rótulo em outra, e a garrafa picadinha virou flocos. Coloque mais uma!", voz: "rp-m-parceiro-marlon-maquinas-separou" },
      ] },
    ],
    fim: "Cada parte separada vira coisa nova! O seu Marlon explica que reciclar deixa a cidade mais limpa e cuida do mundo que Deus criou.",
    fimNome: "Muito bem, {nome}! Cada parte separada vira coisa nova! O seu Marlon explica que reciclar deixa a cidade mais limpa e cuida do mundo que Deus criou.",
    verso: { texto: "Deus colocou o ser humano no jardim para cuidar dele e cultivá-lo.", ref: "baseado em Gênesis 2.15" },
  },
  {
    // Ballet e Cia: minijogo de passos no tempo da música e apresentação no palco (parceiras-palcos.js)
    id: "parceiro-ballet-e-cia", titulo: "O palco da Ballet e Cia", icone: "🩰", tipo: "biblica", parceiro: "ballet-e-cia",
    npcs: { samira: { nome: "Prof. Samira", tipo: "pessoa", pessoa: "samira", fachada: "parceiro-ballet-e-cia" } },
    pedido: "Rabisco, a Professora Samira preparou uma surpresa! Aqui na Ballet e Cia, as alunas da Educarte fazem ballet e jazz. Entre, suba no palco e dance com a turma!",
    etapas: [
      { tipo: "evento", evento: "dancou", lugar: "parceiro-ballet-e-cia", texto: "Entre na Ballet e Cia e dance no palco com a turma" },
      { tipo: "voltar", ate: "samira" },
    ],
    fim: "Que apresentação linda! A Professora Samira e a turma ficaram muito felizes. Dançar com alegria também é um jeito de louvar a Deus.",
    fimNome: "Parabéns, {nome}! Que apresentação linda! A Professora Samira e a turma ficaram muito felizes. Dançar com alegria também é um jeito de louvar a Deus.",
    verso: { texto: "Louvem o nome de Deus com danças e cantem para ele com alegria e música!", ref: "baseado em Salmos 149.3" },
  },
  {
    // BT Models: preparar a passarela e chamar cada amigo do estojo na hora certa, num desfile de fantasias (parceiras-palcos.js)
    id: "parceiro-bt-models", titulo: "O desfile do estojo", icone: "🎉", tipo: "biblica", parceiro: "bt-models",
    npcs: { produtora: { nome: "Produtora Régua", tipo: "regua", escola: [4.6, -1.2], unidade: "parceiro-bt-models", acessorio: "bone" } },
    pedido: "Rabisco, hoje tem desfile de fantasias na BT Models, com os amigos do estojo! Entre, prepare a passarela e chame cada amigo na hora certa.",
    etapas: [
      { tipo: "evento", evento: "desfilou", lugar: "parceiro-bt-models", texto: "Entre na BT Models, prepare a passarela e chame os amigos" },
      { tipo: "voltar", ate: "produtora" },
    ],
    fim: "Que desfile alegre! Cada um com a sua cor e com o seu jeito. Deus fez cada pessoa de um modo especial.",
    fimNome: "Muito bem, {nome}! Que desfile alegre! Cada um com a sua cor e com o seu jeito. Deus fez cada pessoa de um modo especial.",
    verso: { texto: "Eu te agradeço, Deus, porque me fizeste de um modo tão especial e maravilhoso!", ref: "baseado em Salmos 139.14" },
  },
  {
    // Speedy Soluções: leva os vidros de carro até a Kids II e a frente da escola troca de verdade (e fica trocada: missão feita no salvo)
    id: "parceiro-speedy-solucoes", titulo: "A frente nova da Kids II", icone: "🪟", tipo: "cidadania", parceiro: "speedy-solucoes",
    npcs: {
      vidraceiro: { nome: "Vidraceiro Clipe Azul", tipo: "clipe", cor: 0x2f8fe8, escola: [2.8, 0.2], unidade: "parceiro-speedy-solucoes", acessorio: "bone" },
      diretora: { nome: "Diretora Sabrina", tipo: "pessoa", pessoa: "sabrina", mesmo: "alvara:diretora" },
    },
    pedido: "Rabisco, a Speedy Soluções vai trocar a frente da Educarte Kids II! Os vidros e os perfis de alumínio são grandes: venha de carro buscar e leve até a Diretora Sabrina.",
    etapas: [
      { tipo: "levarVeiculo", de: "vidraceiro", carga: { nome: "carga de vidros", emoji: "🪟", modelo: "vidros" }, veiculos: "porta-malas", ate: "diretora",
        carregou: "Vidros bem firmes no carro! Agora, com cuidado, até a Educarte Kids II.", vozCarregou: "rp-m-parceiro-speedy-solucoes-carregou", aPe: "Os vidros são grandes demais para levar a pé! Venha de carro.", vozAPe: "rp-m-parceiro-speedy-solucoes-ape", errado: "Aqui não cabem os vidros! Venha de carro.", vozErrado: "rp-m-parceiro-speedy-solucoes-errado" },
      { tipo: "cena", cena: "obra", ate: "diretora", falas: [
        { texto: "A Diretora Sabrina já liberou a obra! Fique na marca, na frente da escola, e aperte o botão.", voz: "rp-m-parceiro-speedy-solucoes-obra" },
        { texto: "Primeiro, tiramos a frente antiga, com bastante cuidado. Aperte de novo para os perfis!", voz: "rp-m-parceiro-speedy-solucoes-tirou" },
        { texto: "Agora os perfis de alumínio, bem alinhados. Aperte de novo para os vidros!", voz: "rp-m-parceiro-speedy-solucoes-perfis" },
      ] },
    ],
    fim: "Olhe que linda! Agora a Educarte Kids II tem uma fachada nova, de pele de vidro com perfis de alumínio. A Diretora Sabrina ficou muito feliz.",
    fimNome: "Muito bem, {nome}! Olhe que linda! Agora a Educarte Kids II tem uma fachada nova, de pele de vidro com perfis de alumínio. A Diretora Sabrina ficou muito feliz.",
    verso: { texto: "Se o Senhor não construir a casa, o trabalho dos construtores não adianta.", ref: "baseado em Salmos 127.1" },
  },
  {
    // Construrenova: o Pedreiro Caderno precisa de equipamento; o Rabisco aluga a betoneira e o carrinho de mão com o seu
    // Albino (pessoa de verdade: não fala, acena) e leva até a obra, na Avenida da Alegria. Ensina que a ferramenta certa,
    // alugada, ajuda a construir com segurança
    id: "parceiro-construrenova", titulo: "A obra do Pedreiro Caderno", icone: "🧱", tipo: "cidadania", parceiro: "construrenova",
    figurinhaDe: "pedreiro",
    // o 1º npc é quem pede: o seu Albino, na porta da Construrenova (a missão aparece quando o Rabisco chega lá); o Pedreiro só recebe
    npcs: {
      albino: { nome: "Seu Albino", tipo: "pessoa", pessoa: "albino", fachada: "parceiro-construrenova" },
      pedreiro: { nome: "Pedreiro Caderno", tipo: "caderno", cor: 0x1fc08e, x: 171, z: 61.5, rot: Math.PI, acessorio: "capacete", corAcessorio: 0xffcc1f, obra: true },
    },
    pedido: "Rabisco, o Pedreiro Caderno vai levantar um muro, mas falta equipamento! Aqui na Construrenova, alugue com o seu Albino uma betoneira e um carrinho de mão e leve tudo para a obra dele, na Avenida da Alegria.",
    etapas: [
      { tipo: "pegar", itens: ALUGUEL_CONSTRURENOVA, fala: "Tudo alugado! O seu Albino conferiu a betoneira e o carrinho de mão. Agora leve até a obra do Pedreiro Caderno.", voz: "rp-m-parceiro-construrenova-alugou" },
      { tipo: "levar", ate: "pedreiro", icone: "🧱" },
    ],
    fim: "Agora sim! Com a ferramenta certa, alugada na Construrenova, o Pedreiro Caderno constrói um muro firme e trabalha com segurança.",
    fimNome: "Muito bem, {nome}! Com a ferramenta certa, alugada na Construrenova, o Pedreiro Caderno constrói um muro firme e trabalha com segurança.",
    verso: { texto: "Quem ouve as palavras de Jesus e faz o que ele ensina é como quem constrói a casa em cima da rocha.", ref: "baseado em Mateus 7.24" },
  },
  // ---- Sítio Floresça (Escola de Campo Educarte, da Tia Regina): duas missões curtas, uma depois da outra, com a mesma Tia
  // Regina (pessoa de verdade: não fala; a anfitriã narra). Antes, o Rabisco toca a campainha e ela abre o portão (sitio.js).
  // depois: só aparece com a outra feita · semPropaganda: a propaganda fica para o fim da segunda · figurinha: o bichinho
  // da missão ganha figurinha na página Amigos (além da Tia Regina)
  {
    // a pata Ale fugiu do lago: o Rabisco corre atrás dela pelo gramado (a Tia Regina ajuda, tocando a Ale para o lado
    // dele), pega a Ale e solta de volta no lago cercado (cena "ale" de missoes-cenas.js)
    id: "parceiro-sitio-floresca", titulo: "A pata Ale fugiu", icone: "🦆", tipo: "cidadania", parceiro: "sitio-floresca", semPropaganda: true,
    figurinha: { nome: "Pata Ale", tipo: "pata" },
    npcs: { regina: { nome: "Tia Regina", tipo: "pessoa", pessoa: "regina", fachada: "parceiro-sitio-floresca" } },
    pedido: "Rabisco, a pata Ale fugiu do lago e está correndo pelo gramado! Corra atrás dela, com a ajuda da Tia Regina, e leve a Ale de volta para o lago cercado.",
    etapas: [{ tipo: "cena", cena: "ale", ate: "regina", falas: [
      { texto: "Muito bem! A Ale está com o Rabisco. Agora leve a Ale até o portãozinho do lago.", voz: "rp-m-parceiro-sitio-floresca-pegou" },
    ] }],
    fim: "A Ale voltou para o lago e saiu nadando, toda feliz! Cuidar dos bichinhos é cuidar da criação de Deus.",
    fimNome: "Muito bem, {nome}! A Ale voltou para o lago e saiu nadando, toda feliz. Cuidar dos bichinhos é cuidar da criação de Deus.",
    verso: { texto: "Deus olhou para tudo o que tinha feito, e viu que era muito bom.", ref: "baseado em Gênesis 1.31" },
  },
  {
    // o Duck (golden bem arteiro) pulou no lago: o Rabisco vai até o portãozinho, pega o Duck (ele sai e se sacode todo)
    // e leva de volta para a Tia Regina, que espera no meio da estradinha (cena "duck")
    id: "parceiro-sitio-floresca-duck", titulo: "Duck no lago", icone: "🐕", tipo: "cidadania", parceiro: "sitio-floresca", depois: "parceiro-sitio-floresca",
    figurinha: { nome: "Duck", tipo: "cachorro" },
    npcs: { regina: { nome: "Tia Regina", tipo: "pessoa", pessoa: "regina", fachada: "parceiro-sitio-floresca" } },
    pedido: "Rabisco, o Duck é muito arteiro e pulou no lago! Vá até o portãozinho do lago, pegue o Duck e leve ele de volta para a Tia Regina.",
    etapas: [{ tipo: "cena", cena: "duck", ate: "regina", falas: [
      { texto: "Splash! O Duck saiu do lago e se sacudiu todinho. Agora leve o Duck até a Tia Regina.", voz: "rp-m-parceiro-sitio-floresca-duck-saiu" },
    ] }],
    fim: "O Duck voltou para a Tia Regina, abanando o rabo! Quem ama os animais cuida bem deles.",
    fimNome: "Muito bem, {nome}! O Duck voltou para a Tia Regina, abanando o rabo. Quem ama os animais cuida bem deles.",
    verso: { texto: "Quem é justo cuida bem dos seus animais.", ref: "baseado em Provérbios 12.10" },
  },
  // ---- Sítio Floresça, depois do Duck: mais quatro missões curtas, em fila, com a Tia Regina pedindo (cenas "comida",
  // "horta", "rocar" e "kids" de missoes-cenas.js). Só a última faz a propaganda de novo (para não cansar)
  {
    // pegar o balde de milho no galinheiro, jogar milho para as galinhas e depois para os patos do lago
    id: "parceiro-sitio-floresca-comida", titulo: "Hora de dar comida", icone: "🌽", tipo: "cidadania", parceiro: "sitio-floresca", depois: "parceiro-sitio-floresca-duck", semPropaganda: true,
    figurinha: { nome: "Galinhas do sítio", tipo: "galinha" },
    npcs: { regina: { nome: "Tia Regina", tipo: "pessoa", pessoa: "regina", fachada: "parceiro-sitio-floresca" } },
    pedido: "Rabisco, é hora de dar comida para os bichinhos do sítio! Pegue o balde de milho no galinheiro, jogue milho para as galinhas e depois para os patos do lago.",
    etapas: [{ tipo: "cena", cena: "comida", ate: "regina", falas: [
      { texto: "O Rabisco pegou o balde de milho! Agora jogue milho para as galinhas, aqui no galinheiro.", voz: "rp-m-parceiro-sitio-floresca-comida-balde" },
      { texto: "Có-có-có! As galinhas vieram correndo bicar o milho. Agora leve o balde até o lago, para os patos.", voz: "rp-m-parceiro-sitio-floresca-comida-galinhas" },
    ] }],
    fim: "As galinhas e os patos comeram bem e ficaram felizes! Deus cuida de cada bichinho que Ele criou.",
    fimNome: "Muito bem, {nome}! As galinhas e os patos comeram bem e ficaram felizes. Deus cuida de cada bichinho que Ele criou.",
    verso: { texto: "Olhem as aves do céu: o Pai do céu dá comida para elas.", ref: "baseado em Mateus 6.26" },
  },
  {
    // pegar o regador, regar os três canteiros (as plantas crescem), colher as alfaces e as cenouras e entregar à Tia Regina
    id: "parceiro-sitio-floresca-horta", titulo: "Cuidar da hortinha", icone: "🥕", tipo: "cidadania", parceiro: "sitio-floresca", depois: "parceiro-sitio-floresca-comida", semPropaganda: true,
    figurinha: { nome: "Hortinha", tipo: "horta" },
    npcs: { regina: { nome: "Tia Regina", tipo: "pessoa", pessoa: "regina", fachada: "parceiro-sitio-floresca" } },
    pedido: "Rabisco, a hortinha do sítio está com sede! Pegue o regador, regue os três canteiros, colha as alfaces e as cenouras e entregue para a Tia Regina.",
    etapas: [{ tipo: "cena", cena: "horta", ate: "regina", falas: [
      { texto: "O Rabisco pegou o regador! Agora regue os três canteiros da hortinha.", voz: "rp-m-parceiro-sitio-floresca-horta-regador" },
      { texto: "Que capricho! A hortinha cresceu bonita. Agora é só colher as alfaces e as cenouras.", voz: "rp-m-parceiro-sitio-floresca-horta-regou" },
      { texto: "Que cesta cheinha! Agora leve a colheita até a Tia Regina.", voz: "rp-m-parceiro-sitio-floresca-horta-colheu" },
    ] }],
    fim: "A Tia Regina adorou a colheita fresquinha! Quem planta e cuida com carinho vê a obra de Deus crescer.",
    fimNome: "Muito bem, {nome}! A Tia Regina adorou a colheita fresquinha. Quem planta e cuida com carinho vê a obra de Deus crescer.",
    verso: { texto: "Um planta, outro rega, mas é Deus quem faz crescer.", ref: "baseado em 1 Coríntios 3.6" },
  },
  {
    // subir no roçador (veículo que só anda dentro do sítio) e passar por cima de cada trecho de grama alta do lado direito
    id: "parceiro-sitio-floresca-rocar", titulo: "Roçar a grama", icone: "🚜", tipo: "cidadania", parceiro: "sitio-floresca", depois: "parceiro-sitio-floresca-horta", semPropaganda: true,
    figurinha: { nome: "Roçador", tipo: "rocador" },
    npcs: { regina: { nome: "Tia Regina", tipo: "pessoa", pessoa: "regina", fachada: "parceiro-sitio-floresca" } },
    pedido: "Rabisco, a grama do sítio cresceu demais! Suba no roçador, dirija pelo gramado e passe por cima de cada trecho de grama alta até ficar tudo baixinho.",
    etapas: [{ tipo: "cena", cena: "rocar", ate: "regina", falas: [
      { texto: "O Rabisco subiu no roçador! Passe por cima da grama alta, um trecho de cada vez.", voz: "rp-m-parceiro-sitio-floresca-rocar-subiu" },
      { texto: "Falta só um trecho de grama alta!", voz: "rp-m-parceiro-sitio-floresca-rocar-falta" },
    ] }],
    fim: "O gramado ficou lindo e baixinho, pronto para as crianças brincarem! Trabalhar com capricho também é um jeito de agradecer a Deus.",
    fimNome: "Muito bem, {nome}! O gramado ficou lindo e baixinho, pronto para as crianças brincarem. Trabalhar com capricho também é um jeito de agradecer a Deus.",
    verso: { texto: "Tudo o que vocês fizerem, façam de coração, como quem trabalha para Deus.", ref: "baseado em Colossenses 3.23" },
  },
  {
    // buscar as crianças da Educarte Kids II de ônibus, colher frutas e brincar no balanço de pneu no sítio, e levar todos
    // de volta para a escola, onde a Diretora Sabrina recebe (a mesma Diretora do Alvará). No fim, a propaganda de novo
    id: "parceiro-sitio-floresca-kids", titulo: "Dia no sítio com a Kids II", icone: "🚌", tipo: "cidadania", parceiro: "sitio-floresca", depois: "parceiro-sitio-floresca-rocar",
    figurinha: { nome: "Balanço de pneu", tipo: "balanco" },
    npcs: {
      regina: { nome: "Tia Regina", tipo: "pessoa", pessoa: "regina", fachada: "parceiro-sitio-floresca" },
      diretora: { nome: "Diretora Sabrina", tipo: "pessoa", pessoa: "sabrina", mesmo: "alvara:diretora" },
    },
    pedido: "Rabisco, hoje as crianças da Educarte Kids II vão passar o dia no Sítio Floresça! Vá até a escola, chame o ônibus e traga as crianças para cá.",
    etapas: [{ tipo: "cena", cena: "kids", ate: "diretora", falas: [
      { texto: "As crianças da Kids II entraram no ônibus, todas animadas! Agora dirija até o Sítio Floresça.", voz: "rp-m-parceiro-sitio-floresca-kids-embarcou" },
      { texto: "Chegamos ao Sítio Floresça! As crianças vão colher frutas nas árvores do gramado. Leve todo mundo até as frutíferas.", voz: "rp-m-parceiro-sitio-floresca-kids-chegou" },
      { texto: "Que cesta colorida de frutas! Agora as crianças vão brincar no balanço de pneu.", voz: "rp-m-parceiro-sitio-floresca-kids-frutas" },
      { texto: "Que tarde divertida! Agora leve as crianças de volta para o ônibus.", voz: "rp-m-parceiro-sitio-floresca-kids-balanco" },
      { texto: "Todo mundo no ônibus! Agora leve as crianças de volta para a Educarte Kids II.", voz: "rp-m-parceiro-sitio-floresca-kids-volta" },
    ] }],
    fim: "As crianças voltaram para a Kids II felizes, contando tudo para a Diretora Sabrina! Um dia no campo é um presente de Deus.",
    fimNome: "Muito bem, {nome}! As crianças voltaram para a Kids II felizes, contando tudo para a Diretora Sabrina. Um dia no campo é um presente de Deus.",
    verso: { texto: "Este é o dia que o Senhor fez: vamos nos alegrar!", ref: "baseado em Salmos 118.24" },
  },
];
// palavras que não podem aparecer em nada que a criança vê ou ouve (teste rabiscopolis-conteudo.mjs)
export const PROIBIDAS = ["arma", "revólver", "pistola", "tiro", "matar", "morte", "morreu", "sangue", "prisão", "preso", "polícia prende", "ladrão", "roubo", "roubar", "briga", "brigar", "soco", "susto", "monstro", "fantasma", "zumbi", "namor", "beijo", "roblox", "brookhaven", "robux", "dinheiro", "comprar", "pagar"];

// pessoas de verdade (bonecos de pessoas.js) paradas na porta de um lugar, sem missão ainda: acenam quando o Rabisco
// chega e a anfitriã apresenta uma vez (elas não falam). escola: [dx, dz] a partir da porta da unidade.
export const PESSOAS_PORTA = [
  { pessoa: "carina", nome: "Diretora Carina", unidade: "kids1", escola: [-4.5, 1.5], oi: { fala: "cid-carina-oi", texto: "Esta é a Diretora Carina, da Educarte Kids I!" } },
];

// ---- Natal na cidade (só com o modo Natal ligado: natal.js; missoes.js junta estas às de sempre). Ficam à parte para a
// cidade fora da época continuar igualzinha (Passaporte, contagem e testes das missões de sempre).
// Orçamento de desenho do celular (a praça e a rua da Gala já estavam no limite): quem pede o presépio é o anjinho, uma peça
// de presépio (uma malha só, natal-cidade.js · anjo), e o Clipe da Gala é simples: true (criarMorador: 2 malhas).
//  - natalPresepio: juntar as 7 peças do presépio pela cidade e montar na praça, perto da árvore (cena "presepio" de
//    missoes-cenas.js: cada botão põe uma peça e a anfitriã conta a história do nascimento de Jesus)
//  - natalPresentes (Gala Presentes): embrulhar três presentes na loja e entregar cada um para uma criança da cidade
//  - natalDesfile (BT Models): o desfile de Natal, com os amigos do estojo fantasiados (o mesmo salão do desfile de fantasias)
export const MISSOES_NATAL = [
  {
    id: "natalPresepio", titulo: "O presépio da praça", icone: "⭐", tipo: "biblica", natal: true,
    npcs: { anjo: { nome: "Anjinho do Presépio", tipo: "anjo", x: -5.4, z: 26.2, rot: 0.3 } },
    pedido: "Oi, Rabisco! Vamos montar o presépio da praça? As peças se espalharam pela cidade: Maria, José, o menino Jesus na manjedoura, os pastores, as ovelhinhas, a estrela e os magos. Siga a setinha, junte todas e traga para cá!",
    etapas: [
      { tipo: "pegar", itens: [
        { id: "maria", nome: "Maria", emoji: "👩", x: -14, z: -13 },
        { id: "estrela", nome: "a estrela", emoji: "⭐", x: 12, z: -57.5 },
        { id: "magos", nome: "os magos", emoji: "👑", x: 104.5, z: 6 },
        { id: "pastores", nome: "os pastores", emoji: "🧑‍🌾", x: 30, z: 66 },
        { id: "ovelhas", nome: "as ovelhinhas", emoji: "🐑", x: -14, z: 118 },
        { id: "menino", nome: "o menino Jesus na manjedoura", emoji: "👶", x: -102, z: 57.5 },
        { id: "jose", nome: "José", emoji: "👨", x: -76, z: -5.8 },
      ], fala: "Todas as peças do presépio! Agora volte para a praça e monte o presépio perto da árvore de Natal.", voz: "rp-m-natalPresepio-pegou" },
      { tipo: "cena", cena: "presepio", ate: "anjo", falas: [
        { texto: "Chegou a hora de montar o presépio! A cada botão, uma peça vai para o lugar, e eu conto a história do Natal.", voz: "rp-m-natalPresepio-montar" },
        { texto: "Esta é Maria. Um anjo contou que ela ia ser a mamãe do menino Jesus, o Filho de Deus.", voz: "rp-m-natalPresepio-maria" },
        { texto: "Este é José. Ele e Maria viajaram juntos até a cidadezinha de Belém.", voz: "rp-m-natalPresepio-jose" },
        { texto: "Em Belém não tinha lugar na hospedaria. O menino Jesus nasceu ali, e Maria deitou o bebê numa manjedoura, com muito amor.", voz: "rp-m-natalPresepio-menino" },
        { texto: "No campo, os pastores cuidavam das ovelhas de noite. Um anjo apareceu e contou a notícia: nasceu o Salvador!", voz: "rp-m-natalPresepio-pastores" },
        { texto: "Os pastores foram depressa até Belém, com as ovelhinhas, para conhecer o menino Jesus.", voz: "rp-m-natalPresepio-ovelhas" },
        { texto: "Lá no céu, brilhou uma estrela muito especial.", voz: "rp-m-natalPresepio-estrela" },
        { texto: "E os magos, que vinham de longe, seguiram a estrela e trouxeram presentes para Jesus.", voz: "rp-m-natalPresepio-magos" },
      ] },
    ],
    fim: "O presépio está pronto! O Natal é a festa do nascimento de Jesus, o maior presente de Deus para nós.",
    fimNome: "Parabéns, {nome}! O presépio está pronto! O Natal é a festa do nascimento de Jesus, o maior presente de Deus para nós.",
    verso: { texto: "Hoje nasceu para vocês o Salvador, que é Cristo, o Senhor!", ref: "baseado em Lucas 2.11" },
  },
  {
    id: "natalPresentes", titulo: "Presentes de Natal da Gala", icone: "🎁", tipo: "biblica", parceiro: "gala-presentes", natal: true,
    npcs: {
      clipe: { nome: "Clipe Vermelho, da Gala Presentes", tipo: "clipe", cor: 0xd62839, x: -43, z: 23.2, rot: -Math.PI / 2, acessorio: "gorro", simples: true },
      k1: { nome: "Giz Rosinha", tipo: "giz", cor: 0xff9fc8, x: 9.5, z: 30.5, rot: Math.PI, escala: 0.6, acessorio: "laco" },
      k2: { nome: "Caderninho Azul", tipo: "caderno", cor: 0x2f8fe8, x: -20, z: 78, escala: 0.6, acessorio: "bone" },
      k3: { nome: "Borrachinha Lilás", tipo: "borracha", casa: 6, escala: 0.6 },
    },
    pedido: "Rabisco, a Gala Presentes preparou presentes de Natal para três crianças da cidade! Embrulhe o ursinho, a bola e o livrinho aqui na calçada da loja e entregue cada presente para a criança certa.",
    etapas: [
      { tipo: "pegar", itens: [
        { id: "urso", nome: "o ursinho", emoji: "🧸", rotulo: "🎁 Embrulhar o ursinho", x: -43.5, z: 26.5 },
        { id: "bola", nome: "a bola", emoji: "⚽", rotulo: "🎁 Embrulhar a bola", x: -43.5, z: 21.5 },
        { id: "livro", nome: "o livrinho", emoji: "📘", rotulo: "🎁 Embrulhar o livrinho", x: -43.5, z: 18.5 },
      ], fala: "Presentes embrulhados, com laço de fita! O ursinho é da Giz Rosinha, na praça; a bola é do Caderninho Azul, no parquinho; e o livrinho é da Borrachinha Lilás, na casa seis.", voz: "rp-m-natalPresentes-pegou" },
      { tipo: "entregar", rotulo: "🎁 Entregar", oque: "os presentes", icone: "🎁", entregas: [{ item: "urso", ate: "k1" }, { item: "bola", ate: "k2" }, { item: "livro", ate: "k3" }], fala: "Feliz Natal! Obrigado pelo presente!", voz: "rp-m-natalPresentes-obrigado" },
    ],
    fim: "Que Natal alegre! Cada criança ganhou um presente embrulhado com carinho. Presentear alguém é um jeito de mostrar o amor de Deus.",
    fimNome: "Muito bem, {nome}! Que Natal alegre! Cada criança ganhou um presente embrulhado com carinho. Presentear alguém é um jeito de mostrar o amor de Deus.",
    verso: { texto: "Deus amou tanto o mundo que deu o seu Filho, Jesus: o maior presente de todos.", ref: "baseado em João 3.16" },
  },
  {
    id: "natalDesfile", titulo: "Desfile de Natal da BT Models", icone: "🎄", tipo: "biblica", parceiro: "bt-models", natal: true,
    npcs: { produtora: { nome: "Produtora Clipe Verde", tipo: "clipe", cor: 0x2bb24c, escola: [-4.6, -1.2], unidade: "parceiro-bt-models", acessorio: "gorro" } },
    pedido: "Rabisco, hoje tem desfile de Natal na BT Models! Os amigos do estojo vão desfilar fantasiados de estrela, de pastorzinho, de árvore de Natal e de anjinho. Entre, prepare a passarela e chame cada amigo na hora certa!",
    etapas: [
      { tipo: "evento", evento: "desfilou", lugar: "parceiro-bt-models", texto: "Entre na BT Models e faça o desfile de Natal" },
      { tipo: "voltar", ate: "produtora" },
    ],
    fim: "Que desfile de Natal lindo! A estrela, o pastorzinho e o anjinho lembram a noite em que Jesus nasceu.",
    fimNome: "Muito bem, {nome}! Que desfile de Natal lindo! A estrela, o pastorzinho e o anjinho lembram a noite em que Jesus nasceu.",
    verso: { texto: "Os anjos cantaram: glória a Deus nas alturas, e paz na terra!", ref: "baseado em Lucas 2.14" },
  },
];
