// Catálogo de faixas etárias e jogos do portal.
// Princípio: o jogo é divertido primeiro; o conteúdo pedagógico mora na mecânica
// (as moedas são letras, o turbo vem da conta certa), nunca numa tela de prova.
//
// Para lançar um jogo: crie a pasta em jogos/<id>/ e mude status para "pronto".
// status: "pronto" | "em-breve"
// estilo: "plataforma" | "corrida" | "colorir" | "vestir" | "extra"
// ingles: true marca os jogos da trilha de inglês.

export const estilos = {
  plataforma: { nome: "Super Rabisco", icone: "🍄" },
  corrida: { nome: "Rabisco Kart", icone: "🏎️" },
  colorir: { nome: "Ateliê", icone: "🖍️" },
  vestir: { nome: "Camarim", icone: "👕" },
  extra: { nome: "Extra", icone: "⭐" },
};

export const faixas = [
  {
    id: "bebes",
    nome: "Bebês",
    idade: "4 meses a 1 ano e meio",
    cor: "#FFB13B",
    emoji: "🍼",
    nota: "Para o telão da sala ou o colo do adulto, sempre com o educador junto e em sessões curtas.",
    jogos: [
      { id: "pula-rabisco", estilo: "plataforma", nome: "Pula, Rabisco!", desc: "Toque em qualquer lugar e o Rabisco dá um pulo para pegar a estrela, com som de moedinha.", habilidade: "Causa e efeito", status: "pronto" },
      { id: "bibi-onibus", estilo: "corrida", nome: "Bi-bi, Ônibus!", desc: "Toque no ônibus da escola e ele anda, buzina e acende as luzes coloridas.", habilidade: "Atenção e sons", status: "pronto" },
      { id: "toca-e-pinta", estilo: "colorir", nome: "Toca e Pinta", desc: "Cada toque pinta mais um pedaço da cena, até o desenho ficar todo colorido.", habilidade: "Cores e contraste", status: "pronto" },
      { id: "cade-o-bone", estilo: "vestir", nome: "Cadê o Boné?", desc: "O Rabisco se esconde atrás da cortina... e volta com um chapéu novo e um \"Achou!\"", habilidade: "Permanência do objeto", status: "pronto" },
      { id: "baby-colors", estilo: "extra", nome: "Baby Colors", desc: "Balões grandes que falam a cor em inglês quando estouram: red, blue, yellow.", habilidade: "Inglês: primeiras palavras", status: "pronto", ingles: true },
    ],
  },
  {
    id: "bem-pequenos",
    nome: "Bem Pequenos",
    idade: "1 ano e meio a 3 anos",
    cor: "#FF5FA2",
    emoji: "🧸",
    jogos: [
      { id: "super-rabisco-mini", estilo: "plataforma", nome: "Super Rabisco Mini", desc: "Um botão só: o Rabisco corre sozinho e pula para pegar frutas. Cada fruta diz a cor dela.", habilidade: "Cores e frutas", status: "pronto" },
      { id: "kart-das-cores", estilo: "corrida", nome: "Kart das Cores", desc: "Siga pela pista da cor que o Rabisco pedir para chegar na escola.", habilidade: "Identificar cores", status: "pronto" },
      { id: "colorir-magico", estilo: "colorir", nome: "Colorir Mágico", desc: "Toque numa parte do desenho e ela se pinta sozinha, sem sair da linha.", habilidade: "Coordenação", status: "pronto" },
      { id: "veste-rabisco", estilo: "vestir", nome: "Veste o Rabisco", desc: "Toque nas roupas certas: está chovendo? Hora da capa e da galocha! Na praia, óculos e boia.", habilidade: "Roupas e clima", status: "pronto" },
      { id: "arca-de-noe", estilo: "extra", nome: "Arca de Noé", desc: "Ajude Noé a achar os pares de animais para entrar na arca.", habilidade: "Pares e animais", status: "pronto" },
      { id: "rabisco-moves", estilo: "extra", nome: "Rabisco Moves", desc: "Toque na parte do corpo que o Rabisco pedir em inglês: head, shoulders, knees and toes. E ele dança!", habilidade: "Inglês: corpo", status: "pronto", ingles: true },
    ],
  },
  {
    id: "pequenos",
    nome: "Pequenos",
    idade: "4 e 5 anos",
    cor: "#8E6CFF",
    emoji: "🎨",
    jogos: [
      { id: "super-rabisco-letras", estilo: "plataforma", nome: "Super Rabisco: Caça às Letras", desc: "Corra, pule nos blocos e passe pelos canos pegando as letras da figura. Com a palavra completa, o Rabisco desce o mastro e entra no castelo-escola.", habilidade: "Letras e palavras", status: "pronto" },
      { id: "kart-onibus", estilo: "corrida", nome: "Corrida do Ônibus", desc: "Conte os amigos que estão no ponto e passe pelo número certo: eles sobem no ônibus!", habilidade: "Contagem até 10", status: "pronto" },
      { id: "atelie", estilo: "colorir", nome: "Ateliê do Rabisco", desc: "Pincel livre, balde de tinta e adesivos. Misture azul com amarelo e descubra o verde.", habilidade: "Mistura de cores", status: "pronto" },
      { id: "camarim-profissoes", estilo: "vestir", nome: "Camarim das Profissões", desc: "Vista o Rabisco de bombeiro, médico, astronauta ou chef e veja ele trabalhar.", habilidade: "Profissões", status: "pronto" },
      { id: "memoria", estilo: "extra", nome: "Memória da Turma", desc: "Jogo da memória com Rabisco, escola, materiais e amigos.", habilidade: "Memória e atenção", status: "pronto" },
      { id: "rabisco-says", estilo: "extra", nome: "Rabisco Says", desc: "\"Rabisco says: jump on the red!\" Siga as ordens em inglês.", habilidade: "Inglês: comandos e cores", status: "pronto", ingles: true },
    ],
  },
  {
    id: "alfabetizacao",
    nome: "Alfabetização",
    idade: "6 a 8 anos",
    cor: "#00B5F0",
    emoji: "🚀",
    jogos: [
      { id: "super-rabisco", estilo: "plataforma", nome: "Super Rabisco", desc: "Aventura pela escola: pegue as bolhas das sílabas da palavra e fuja das sílabas intrusas para abrir o castelo.", habilidade: "Sílabas e palavras", status: "pronto" },
      { id: "cores-da-criacao", estilo: "plataforma", nome: "Rabisco e as Cores da Criação", desc: "Aventura 3D: a Borracha Apagona apagou as cores do Livro da Criação. Por onde o Rabisco passa, o Jardim ganha cor! Ache as ovelhinhas perdidas do pastor.", habilidade: "Aventura e exploração", status: "pronto" },
      { id: "rabisco-kart", estilo: "corrida", nome: "Rabisco Kart", desc: "Corrida 3D contra os amigos lápis de cor. Passe pelo número certo da conta e o Rabisco ganha turbo!", habilidade: "Adição e subtração", status: "pronto" },
      { id: "colorir-numeros", estilo: "colorir", nome: "Pinte pelos Números", desc: "Resolva a continha de cada pedaço para saber a cor e revelar a figura.", habilidade: "Cálculo mental", status: "pronto" },
      { id: "loja-camarim", estilo: "vestir", nome: "Lojinha do Camarim", desc: "Compre roupas novas para o Rabisco: pague o preço certinho e descubra quanto é o troco.", habilidade: "Dinheiro e troco", status: "pronto" },
      { id: "caca-palavras", estilo: "extra", nome: "Caça-Palavras", desc: "Ache as palavras escondidas com temas da escola e da natureza.", habilidade: "Leitura", status: "pronto" },
      { id: "english-kart-jr", estilo: "corrida", nome: "English Kart Jr.", desc: "Ouça a palavra em inglês e passe pelo portal com a figura certa.", habilidade: "Inglês: vocabulário", status: "pronto", ingles: true },
    ],
  },
  {
    id: "maiores",
    nome: "Maiores",
    idade: "9 a 12 anos",
    cor: "#1FC08E",
    emoji: "🏆",
    jogos: [
      { id: "super-rabisco-2", estilo: "plataforma", nome: "Super Rabisco 2", desc: "Fases com perguntas de ciências e história no caminho: pegue a bolha da resposta certa para abrir o mastro.", habilidade: "Ciências e história", status: "pronto" },
      { id: "cores-da-criacao", estilo: "plataforma", nome: "Rabisco e as Cores da Criação", desc: "Aventura 3D: a Borracha Apagona apagou as cores do Livro da Criação. Por onde o Rabisco passa, o Jardim ganha cor! Ache as ovelhinhas perdidas do pastor.", habilidade: "Aventura e exploração", status: "pronto" },
      { id: "rabisco-kart-gp", estilo: "corrida", nome: "Rabisco Kart GP", desc: "Campeonato pelo Brasil: tabuada e capitais dos estados dão turbo.", habilidade: "Tabuada e capitais", status: "pronto" },
      { id: "pixel-art", estilo: "colorir", nome: "Pixel Art do Rabisco", desc: "Monte desenhos em grade usando coordenadas, como batalha naval.", habilidade: "Plano cartesiano", status: "pronto" },
      { id: "estilista", estilo: "vestir", nome: "Rabisco Estilista", desc: "Crie uniformes para o time com orçamento limitado e porcentagem de desconto.", habilidade: "Porcentagem e orçamento", status: "pronto" },
      { id: "rabisco-robo", estilo: "extra", nome: "Rabisco Robô", desc: "Programe o caminho do Rabisco com blocos de comando.", habilidade: "Lógica e programação", status: "pronto" },
      { id: "english-kart", estilo: "corrida", nome: "English Kart", desc: "Leia a frase em inglês (\"It shines at night\") e passe pela figura certa para ganhar turbo.", habilidade: "Inglês: leitura", status: "pronto", ingles: true },
    ],
  },
];
