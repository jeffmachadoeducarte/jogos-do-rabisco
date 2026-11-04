// Conteúdo do passo a passo "Jogar na TV" (usado pela tela da ⚙️ em guia-tv.js e pelo guia impresso tv/guia.html,
// gerado por ferramentas/gera-guia-tv.mjs). Texto simples, pensado em pais.
// Fatos conferidos (nov/2026): iPhone espelha por AirPlay (Roku/Apple TV/Samsung/LG recentes); Android espelha por
// Miracast/Google Cast (Android TV/Google TV nativo, Roku e várias Smart TVs); alguns Android (ex.: Pixel) não espelham para Roku.

export const SITE = "jogos.educarte.qzz.io";

export const APARELHOS = [
  { id: "ios", ic: "🍎", nome: "iPhone / iPad" },
  { id: "android", ic: "🤖", nome: "Android" },
  { id: "pc", ic: "💻", nome: "Computador" },
];

export const TVS = [
  { id: "roku", ic: "📺", nome: "Roku" },
  { id: "androidtv", ic: "🟢", nome: "Android TV / Google TV" },
  { id: "smart", ic: "🖥️", nome: "Smart TV", sub: "Samsung, LG, outras" },
  { id: "cabo", ic: "🔌", nome: "Notebook com cabo" },
];

const CABO_PASSOS = [
  "Ligue o notebook na TV com um cabo HDMI e, no controle da TV, escolha a entrada HDMI onde ligou.",
  `Abra o navegador (Chrome) e entre em ${SITE}. Aperte F11 para a tela cheia.`,
  "Jogue com o teclado ou ligue um controle (USB ou Bluetooth) e aperte um botão nele.",
  "Para a TV virar só a tela: ⚙️ → Jogar na TV → Usar só controles. Os controles e os celulares entram pelo QR.",
];

const MESMO_WIFI = "O celular e a TV precisam estar no mesmo Wi-Fi.";
const DEITE = "Deite o celular (de lado) e abra o jogo. O que aparece no celular aparece na TV.";

export const CAMINHOS = {
  roku: {
    ios: {
      titulo: "iPhone com Roku (AirPlay)",
      passos: [
        MESMO_WIFI,
        "Na Roku, confira em Configurações → Apple AirPlay e HomeKit se o AirPlay está ligado. Só Roku mais recentes têm AirPlay.",
        "No iPhone, deslize para abrir a Central de Controle, toque em Espelhar Tela e escolha a Roku. Se a TV mostrar um código, digite no celular.",
        DEITE,
      ],
      aviso: "A Roku não apareceu na lista? Ela provavelmente é antiga e não tem AirPlay. Use a aba Notebook com cabo.",
    },
    android: {
      titulo: "Android com Roku (espelhamento de tela)",
      passos: [
        MESMO_WIFI,
        "Na Roku, abra Configurações → Sistema → Espelhamento de tela e deixe em \"Perguntar\" ou \"Sempre permitir\".",
        "No celular, puxe o painel de cima e toque em Transmitir, Smart View ou Espelhamento (o nome muda de marca para marca). Escolha a Roku.",
        "Aceite o pedido que aparece na TV. " + DEITE,
      ],
      aviso: "Alguns Android novos (como o Google Pixel) não espelham para Roku. Se a Roku não aparecer, use a aba Notebook com cabo.",
    },
  },
  androidtv: {
    ios: {
      titulo: "iPhone com Android TV / Google TV",
      passos: [
        "A maioria das TVs Android TV e Google TV não recebe AirPlay do iPhone. Procure \"AirPlay\" nas configurações da TV para conferir.",
        "Se a sua TV tiver AirPlay: no iPhone, abra a Central de Controle, toque em Espelhar Tela e escolha a TV.",
        "Se não tiver, o jeito mais fácil é a aba Notebook com cabo.",
      ],
      aviso: "Resumindo: iPhone pede TV com AirPlay (Apple TV, Roku recente, Samsung e LG recentes).",
    },
    android: {
      titulo: "Android com Android TV / Google TV (Transmitir tela)",
      passos: [
        MESMO_WIFI + " A TV já vem com Chromecast embutido.",
        "No celular, puxe o painel de cima e toque em Transmitir (ou Smart View / Espelhamento).",
        "Escolha o nome da sua TV na lista.",
        DEITE,
      ],
    },
  },
  smart: {
    ios: {
      titulo: "iPhone com Smart TV Samsung, LG ou outras (AirPlay)",
      passos: [
        MESMO_WIFI,
        "Na TV, procure AirPlay nas configurações e ligue. Só Samsung e LG mais recentes têm.",
        "No iPhone, abra a Central de Controle, toque em Espelhar Tela e escolha a TV. Digite o código da TV, se pedir.",
        DEITE,
      ],
      aviso: "Sua TV não aparece? Provavelmente é antiga. Use a aba Notebook com cabo.",
    },
    android: {
      titulo: "Android com Smart TV Samsung, LG ou outras",
      passos: [
        MESMO_WIFI,
        "Na TV, ligue o espelhamento: nas Samsung chama Smart View; nas LG, Compartilhar Tela; nas outras, Espelhamento ou Miracast.",
        "No celular, puxe o painel de cima, toque em Smart View, Transmitir ou Espelhamento e escolha a TV.",
        "Aceite o pedido na TV. " + DEITE,
      ],
      aviso: "Se a TV não aparecer, use a aba Notebook com cabo.",
    },
  },
  cabo: {
    todos: {
      titulo: "Notebook com cabo HDMI (o jeito mais firme)",
      passos: CABO_PASSOS,
      aviso: "Celular só liga por cabo com um adaptador de vídeo (USB-C ou Lightning para HDMI), e nem todo Android tem saída de vídeo. Por isso o notebook é a escolha mais segura.",
    },
  },
};

export const DICAS = [
  { ic: "🎮", titulo: "Controle Bluetooth (opcional)", texto: "Pareie o controle (PS4, Xbox ou genérico) nas configurações de Bluetooth do celular, abra o jogo e aperte um botão nele. O jogo reconhece sozinho." },
  { ic: "📱", titulo: "Segundo jogador pelo QR", texto: "Toque em ⚙️ → Jogar na TV → Mais um controle pelo celular. Outra pessoa lê o QR com a câmera do celular e vira o jogador 2." },
  { ic: "🔆", titulo: "Tela sempre acesa", texto: "Durante a partida o jogo pede para a tela não apagar. Se a TV travar ou ficar lenta, feche outros aplicativos e deixe o Wi-Fi forte (de preferência 5 GHz)." },
];

export function detectarAparelho(ua = navigator.userAgent, toque = navigator.maxTouchPoints || 0) {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && toque > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "pc";
}

// o caminho certo para esta combinação (computador e "cabo" caem no passo do notebook)
export function caminho(tv, aparelho) {
  const t = CAMINHOS[tv] || CAMINHOS.roku;
  if (t.todos) return t.todos;
  if (aparelho === "pc") return CAMINHOS.cabo.todos;
  return t[aparelho] || t.android;
}
