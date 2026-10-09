# Gera as falas dos jogos como arquivos MP3 (voz neural feminina, pt-BR).
# Uso: python3 ferramentas/gerar_vozes.py [--voz pt-BR-ThalitaMultilingualNeural] [--refazer]
#   voz padrão: pt-BR-FranciscaNeural. A Thalita é "multilíngue" e, em letras soltas e
#   soletrações, troca para o inglês ("Letra S" virava "Let's dress") — por isso não é a padrão.
#   sem --refazer, só gera as falas que ainda não existem
# Requer: pip install edge-tts
# Para trocar por gravações de uma professora, basta substituir os MP3 mantendo os nomes
# (as soletrações também têm os tempos de cada letra em assets/voz/soletrar.json).
import asyncio, json, os, sys
import edge_tts

args = sys.argv[1:]
VOZ = args[args.index("--voz") + 1] if "--voz" in args else "pt-BR-FranciscaNeural"
REFAZER = "--refazer" in args
RITMO = "-8%"
SAIDA = os.path.join(os.path.dirname(__file__), "..", "assets", "voz")

NUMEROS = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez"]
import unicodedata
# Super Rabisco por nível: 1 = curtinhas, 2 = maiores, 3 = compostas (com hífen)
PALAVRAS = ["bola", "gato", "sapo", "pato", "vaca", "bolo", "dado", "casa", "foca", "lobo", "mala", "uva",
            "sapato", "cavalo", "macaco", "pipoca", "banana", "girafa", "tomate", "boneca", "janela", "caneta",
            "guarda-chuva", "arco-íris", "beija-flor", "porco-espinho", "cachorro-quente", "couve-flor",
            "camelo", "baleia", "quebra-cabeça", "bate-papo", "estrela-do-mar", "pé-de-moleque", "segunda-feira", "guarda-roupa"]
# nome do arquivo sem acento (arco-íris -> arco-iris)
slug = lambda p: unicodedata.normalize("NFD", p).encode("ascii", "ignore").decode()

falas = {}
soletrar = {}

# --- Super Rabisco: Caça às Letras ---
# nome de cada letra como se fala em português (usado na soletração)
NOME = {
    "A": "á", "B": "bê", "C": "cê", "D": "dê", "E": "é", "F": "éfe", "G": "gê", "H": "agá", "I": "i",
    "J": "jota", "K": "cá", "L": "éle", "M": "éme", "N": "ene", "O": "ó", "P": "pê", "Q": "quê",
    "R": "érre", "S": "ésse", "T": "tê", "U": "u", "V": "vê", "W": "dáblio", "X": "xis", "Y": "ípsilon", "Z": "zê",
}
# "a letra: X." com a pausa dos dois pontos: sem ela, as vogais grudavam ("pegou o A" virava "pegou a")
# o M escrito "éme": como "M" ou "ême" a voz soava igual ao N (conferido com reconhecimento de fala)
ESCRITA = {"M": "éme"}
for l in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
    falas[f"letra-{l}"] = f"Você pegou a letra: {ESCRITA.get(l, l)}."
NOME["Í"] = "i"; NOME["É"] = "é"; NOME["Ç"] = "cê cedilha"
falas["letra-CEDILHA"] = "Você pegou a letra: cê cedilha."
for p in PALAVRAS:
    k, letras = slug(p), [c for c in p.upper() if c != "-"]
    falas[f"inicio-{k}"] = f"Vamos pegar as letras de {p}!"
    falas[f"completa-{k}"] = f"{p.capitalize()}! Agora vamos para a escola!"
    falas[f"parabens-{k}"] = "Parabéns, você formou a palavra!"
    soletrar[f"soletra-{k}"] = (", ".join(NOME[c] for c in letras) + f". {p.capitalize()}!", len(letras))
falas["nivel-1"] = "Nível um! Palavras curtinhas."
falas["nivel-2"] = "Nível dois! Palavras maiores."
falas["nivel-3"] = "Nível três! Palavras compostas, feitas de duas palavras juntas."
falas["sala-secreta"] = "Uau! Uma sala secreta!"
falas["nivel-completo"] = "Parabéns! Você completou o nível!"
# portal (painel de entrada)
falas["portal-oi"] = "Oi! Eu sou o Rabisco! Escolha a sua idade e vamos brincar!"
falas["portal-idade"] = "Escolha um jogo!"
falas["dica-letra"] = "Ainda falta uma letra. Volte para procurar!"

# --- Rabisco Kart ---
falas.update({
    "kart-titulo": "Rabisco Kart! Vamos correr?",
    "contagem-3": "Três!", "contagem-2": "Dois!", "contagem-1": "Um!", "contagem-ja": "Já!",
    "acerto-1": "Isso! Turbo!", "acerto-2": "Muito bem! Turbo!", "acerto-3": "Acertou! Lá vai o turbo!",
    "volta-2": "Volta dois!", "volta-final": "Última volta!",
    "chegada-1": "Você chegou em primeiro lugar! Parabéns!",
    "chegada-2": "Você chegou em segundo lugar! Muito bem!",
    "chegada-3": "Você chegou em terceiro lugar! Muito bem!",
    "chegada-4": "Você chegou em quarto lugar! Vamos tentar de novo?",
})
for n in range(0, 11):
    falas[f"quase-{n}"] = f"Quase! A resposta era {NUMEROS[n]}."
for a in range(1, 10):
    for b in range(1, 11 - a):
        falas[f"conta-{a}-mais-{b}"] = f"Quanto é {NUMEROS[a]} mais {NUMEROS[b]}?"
for a in range(2, 11):
    for b in range(1, a):
        falas[f"conta-{a}-menos-{b}"] = f"Quanto é {NUMEROS[a]} menos {NUMEROS[b]}?"


# --- Memória da Turma ---
falas.update({
    "mem-titulo": "Memória da Turma! Vamos achar os pares?",
    "mem-nivel-1": "Olhe bem as cartas! Elas vão se esconder.",
    "mem-nivel-2": "Agora são seis pares. Preste atenção!",
    "mem-nivel-3": "Oito pares! Você consegue!",
    "mem-par": "Achou o par!",
    "mem-vitoria": "Parabéns! Você achou todos os pares!",
})
for k, nome in {"rabisco": "Rabisco", "escola": "Escola", "onibus": "Ônibus", "lapis": "Lápis", "mochila": "Mochila",
                "livro": "Livro", "tesoura": "Tesoura", "giz": "Giz de cera", "maca": "Maçã", "bola": "Bola",
                "regua": "Régua", "pincel": "Pincel"}.items():
    falas[f"mem-{k}"] = f"{nome}!"


# --- Corridas novas (modos do Rabisco Kart: ../jogos/rabisco-kart/modos.js) ---
CORES = {"vermelho": "vermelho", "azul": "azul", "amarelo": "amarelo", "verde": "verde", "rosa": "rosa", "laranja": "laranja"}
falas["kcor-titulo"] = "Kart das Cores! Vamos correr?"
for k, nome in CORES.items():
    falas[f"kcor-{k}"] = f"Passe pela cor {nome}!"
    falas[f"kcor-era-{k}"] = f"Essa era a cor {nome}!"
falas["kbus-titulo"] = "Corrida do Ônibus! Vamos levar os amigos para a escola!"
falas["kbus-quantos"] = "Quantos amigos estão no ponto? Conte e passe pelo número certo!"
falas["kgp-titulo"] = "Rabisco Kart G P! O campeonato vai começar!"
for a in range(2, 10):
    for b in range(2, 10):
        falas[f"tab-{a}-{b}"] = f"Quanto é {NUMEROS[a]} vezes {NUMEROS[b]}?"
ESTADOS = {"AC": "do Acre", "AL": "de Alagoas", "AP": "do Amapá", "AM": "do Amazonas", "BA": "da Bahia", "CE": "do Ceará",
           "DF": "do Distrito Federal", "ES": "do Espírito Santo", "GO": "de Goiás", "MA": "do Maranhão", "MT": "de Mato Grosso",
           "MS": "de Mato Grosso do Sul", "MG": "de Minas Gerais", "PA": "do Pará", "PB": "da Paraíba", "PR": "do Paraná",
           "PE": "de Pernambuco", "PI": "do Piauí", "RJ": "do Rio de Janeiro", "RN": "do Rio Grande do Norte", "RS": "do Rio Grande do Sul",
           "RO": "de Rondônia", "RR": "de Roraima", "SC": "de Santa Catarina", "SP": "de São Paulo", "SE": "de Sergipe", "TO": "do Tocantins"}
for uf, nome in ESTADOS.items():
    falas[f"cap-{uf}"] = f"Qual é a capital {nome}?"
falas["kingj-titulo"] = "English Kart Júnior! Ouça a palavra em inglês!"
falas["king-titulo"] = "English Kart! Leia a placa em inglês!"

# --- Plataformas novas (modos do Super Rabisco: ../jogos/super-rabisco-letras/modos.js) ---
# Super Rabisco: sílabas
SILABAS_PALAVRAS = {
    "bola": "bola", "gato": "gato", "casa": "casa", "pato": "pato", "sapo": "sapo", "vaca": "vaca", "dado": "dado", "faca": "faca",
    "mala": "mala", "lua": "lua", "rato": "rato", "bolo": "bolo", "sapato": "sapato", "cavalo": "cavalo", "macaco": "macaco",
    "pipoca": "pipoca", "banana": "banana", "girafa": "girafa", "tomate": "tomate", "boneca": "boneca", "janela": "janela",
    "caneta": "caneta", "baleia": "baleia", "peteca": "peteca", "chocolate": "chocolate", "borboleta": "borboleta",
    "tartaruga": "tartaruga", "bicicleta": "bicicleta", "princesa": "princesa", "coruja": "coruja", "pinguim": "pinguim",
    "planeta": "planeta", "floresta": "floresta", "estrela": "estrela", "dragao": "dragão", "coelho": "coelho",
}
for k, p in SILABAS_PALAVRAS.items():
    falas[f"sil-inicio-{k}"] = f"Vamos pegar as sílabas de {p}!"
    falas[f"sil-completa-{k}"] = f"{p.capitalize()}! Agora corra até o mastro!"
# como cada sílaba soa sozinha (escrita para a voz não soletrar)
SILABAS = {
    "ba": "bá", "bo": "bô", "la": "lá", "ga": "gá", "to": "tô", "ca": "cá", "sa": "sá", "pa": "pá", "po": "pô", "va": "vá", "da": "dá",
    "do": "dô", "fa": "fá", "ma": "má", "lu": "lú", "a": "á", "ra": "rá", "lo": "lô", "co": "cô", "pi": "pí", "na": "ná",
    "gi": "gí", "te": "tê", "ne": "nê", "ja": "já", "ta": "tá", "le": "lê", "ia": "iá", "pe": "pê", "cho": "xô", "bor": "bór",
    "tar": "tár", "ru": "rú", "bi": "bí", "ci": "cí", "cle": "clê", "prin": "prín", "ce": "cê", "cor": "cór", "uja": "úja",
    "pin": "pín", "guim": "guím", "pla": "plá", "flor": "flôr", "es": "és", "tre": "trê", "dra": "drá", "gao": "gão",
    "coe": "côe", "lho": "lho",
}
for k, som in SILABAS.items():
    falas[f"sil-{k}"] = f"{som}!"
falas.update({
    "sil-nivel-1": "Nível um! Palavras de duas sílabas.",
    "sil-nivel-2": "Nível dois! Palavras de três sílabas.",
    "sil-nivel-3": "Nível três! Sílabas difíceis!",
    "sil-falta": "Ainda falta uma sílaba. Volte para procurar!",
    "sil-intrusa": "Ops! Essa sílaba não é da palavra.",
    "sil-parabens": "Parabéns! Você montou a palavra!",
})
# Super Rabisco Mini: frutas e cores
for k, (nome, cor) in {"morango": ("Morango", "vermelho"), "uva": ("Uva", "roxa"), "banana": ("Banana", "amarela"),
                       "laranja": ("Laranja", "laranja"), "maca": ("Maçã", "verde"), "melancia": ("Melancia", "vermelha"),
                       "mirtilo": ("Mirtilo", "azul")}.items():
    falas[f"mini-{k}"] = f"{nome}! {cor.capitalize()}!"
falas.update({
    "mini-inicio": "Toque na tela para o Rabisco pular e pegar as frutas!",
    "mini-completa": "Oba! Vamos para a escola!",
    "mini-vitoria": "Eba! Muito bem!",
})
# Super Rabisco 2: ciências e história
falas.update({
    "sr2-nivel-1": "Nível um! Corpo e natureza.",
    "sr2-nivel-2": "Nível dois! Espaço e Terra.",
    "sr2-nivel-3": "Nível três! História do Brasil.",
    "sr2-inicio": "Leia a pergunta e pegue a bolha da resposta certa!",
    "sr2-erro": "Essa não é a resposta. Tente outra!",
    "sr2-falta": "Ainda falta responder uma pergunta. Volte para procurar!",
    "sr2-completa": "Todas certas! Corra até o mastro!",
    "sr2-parabens": "Parabéns! Você acertou todas as perguntas!",
})

# --- Jogos de colorir (src/motor/colorir.js, desenhos.js e pintura.js) ---
falas.update({
    "des-casa": "Vamos pintar a casa!", "des-onibus": "Vamos pintar o ônibus da escola!", "des-peixe": "Vamos pintar o fundo do mar!",
    "des-jardim": "Vamos pintar o jardim!", "des-foguete": "Vamos pintar o foguete!", "des-rabisco": "Vamos pintar o Rabisco!",
    "tp-titulo": "Toca e Pinta! Toque na tela para pintar!", "tp-vitoria": "Que lindo! Tudo colorido!",
    "cm-titulo": "Colorir Mágico! Escolha uma cor e toque no desenho!", "cm-vitoria": "Que desenho lindo!",
    "at-titulo": "Bem-vindo ao Ateliê do Rabisco! Misture as cores e pinte do seu jeito!", "at-vitoria": "Que obra de arte!",
    "pn-titulo": "Pinte pelos Números! Resolva a conta para descobrir a cor!", "pn-vitoria": "Parabéns! Você descobriu a figura!",
    "pn-escolha": "Escolha uma cor primeiro!",
})
for k, nome in {"vermelho": "Vermelho", "laranja": "Laranja", "amarelo": "Amarelo", "verde": "Verde", "verde-claro": "Verde-claro",
                "ciano": "Azul-claro", "azul": "Azul", "roxo": "Roxo", "rosa": "Rosa", "marrom": "Marrom", "bege": "Bege",
                "branco": "Branco", "cinza": "Cinza", "preto": "Preto"}.items():
    falas[f"cor-{k}"] = f"{nome}!"
for chave, frase in {"amarelo+azul": "Azul com amarelo fica verde!", "amarelo+vermelho": "Vermelho com amarelo fica laranja!",
                     "azul+vermelho": "Azul com vermelho fica roxo!", "branco+vermelho": "Vermelho com branco fica rosa!",
                     "branco+preto": "Preto com branco fica cinza!", "azul+branco": "Azul com branco fica azul-claro!",
                     "branco+marrom": "Marrom com branco fica bege!", "laranja+preto": "Laranja com preto fica marrom!",
                     "branco+verde": "Verde com branco fica verde-claro!"}.items():
    falas[f"mix-{chave}"] = frase

# --- Jogos de vestir (src/motor/camarim.js e vestir.js) ---
ROUPA_NOME = {
    "capa-chuva": "a capa de chuva", "galochas": "as galochas", "guarda-chuva": "o guarda-chuva", "sueste": "o chapéu de chuva",
    "oculos-sol": "os óculos de sol", "chapeu-sol": "o chapéu de sol", "boia": "a boia", "gorro": "o gorro", "cachecol": "o cachecol",
    "casaco": "o casaco", "botas-neve": "as botas", "capacete-bombeiro": "o capacete", "farda-bombeiro": "a farda",
    "calca-bombeiro": "a calça", "botas-bombeiro": "as botas", "mangueira": "a mangueira", "jaleco": "o jaleco",
    "estetoscopio": "o estetoscópio", "calca-jeans": "a calça", "chapeu-chef": "o chapéu de chef", "dolma-chef": "a roupa de chef",
    "colher-pau": "a colher de pau", "capacete-astronauta": "o capacete", "traje-astronauta": "o traje espacial",
    "calca-astronauta": "a calça espacial", "botas-astronauta": "as botas espaciais",
}
for k, nome in ROUPA_NOME.items():
    falas[f"vr-{k}"] = f"Isso! {nome.split(' ', 1)[1].capitalize()}!"
    falas[f"cp-{k}"] = f"Muito bem! {nome.split(' ', 1)[1].capitalize()}!"
falas.update({
    "cb-titulo": "Cadê o Rabisco? Toque na tela!", "cb-cade": "Cadê o Rabisco?", "cb-achou": "Achou!", "cb-vitoria": "Achou! Muito bem!",
    "vr-titulo": "Veste o Rabisco! Que roupa combina com o tempo?", "vr-vitoria": "Muito bem! O Rabisco está pronto!",
    "vr-chuva": "Está chovendo! Vista o Rabisco para a chuva!", "vr-sol": "Que sol! Vamos vestir o Rabisco para a praia!",
    "vr-frio": "Brrr! Que frio! Vamos esquentar o Rabisco!",
    "vr-nao-chuva": "Hmm, com chuva, não!", "vr-nao-sol": "Hmm, na praia, não!", "vr-nao-frio": "Hmm, no frio, não!",
    "vr-pronto-chuva": "Agora pode chover à vontade!", "vr-pronto-sol": "Oba! Vamos para a praia!", "vr-pronto-frio": "Que quentinho!",
    "cp-titulo": "Camarim das Profissões! O que o Rabisco vai ser hoje?", "cp-vitoria": "Parabéns! Que profissional!",
    "cp-bombeiro": "Vamos vestir o Rabisco de bombeiro!", "cp-medico": "Vamos vestir o Rabisco de médico!",
    "cp-chef": "Vamos vestir o Rabisco de chef de cozinha!", "cp-astronauta": "Vamos vestir o Rabisco de astronauta!",
    "cp-nao": "Hmm, isso é de outra profissão!",
    "cp-pronto-bombeiro": "O bombeiro chegou! Vamos apagar o fogo!", "cp-pronto-medico": "O doutor Rabisco vai cuidar de você!",
    "cp-pronto-chef": "Hum! O chef fez um bolo delicioso!", "cp-pronto-astronauta": "Três, dois, um... Rumo às estrelas!",
    "lj-titulo": "Lojinha do Camarim! Vamos às compras?", "lj-vitoria": "Parabéns! Você fez todas as compras!",
    "lj-pague": "Toque nas moedas e notas para pagar o preço certinho!", "lj-troco": "Quanto é o troco?", "lj-obrigado": "Obrigado! Volte sempre!",
    "es-titulo": "Rabisco Estilista! Monte o uniforme do time!", "es-vitoria": "Que uniforme lindo! E dentro do orçamento!",
    "es-inicio": "Escolha uma peça de cada tipo. Atenção ao desconto e ao orçamento!", "es-caro": "Essa passa do orçamento. Escolha outra!",
})

# --- Bebês: Baby Colors, Pula Rabisco e Bi-bi Ônibus ---
falas.update({
    "en-bc-titulo": "Baby Colors! Estoure os balões!", "en-bc-vitoria": "Eba! Muito bem!",
    "pr-titulo": "Pula, Rabisco! Toque na tela!", "pr-vitoria": "Eba! Pegou todas as estrelas!", "pr-eba": "Eba!",
    "bb-titulo": "Bi-bi! Toque no ônibus!", "bb-vitoria": "O ônibus chegou na escola!",
    "bb-vrum": "Vrum, vrum!", "bb-bibi": "Bi-bi!", "bb-luzes": "Que luzes bonitas!",
})

# --- Arca de Noé e Rabisco Moves ---
falas.update({
    "an-titulo": "Arca de Noé! Vamos ajudar Noé?", "an-inicio": "Toque em dois animais iguais!", "an-vitoria": "Todos os animais estão na arca!",
    "an-leao": "Leão!", "an-elefante": "Elefante!", "an-girafa": "Girafa!", "an-zebra": "Zebra!", "an-macaco": "Macaco!",
    "an-coelho": "Coelho!", "an-urso": "Urso!", "an-pato": "Pato!", "an-porco": "Porco!", "an-vaca": "Vaca!",
    "rm-titulo": "Rabisco Moves! Vamos dançar?",
})

falas["rs-titulo"] = "Rabisco Says! Ouça o Rabisco em inglês e toque na cor certa!"

# --- Caça-Palavras ---
falas.update({"cp2-titulo": "Caça-Palavras! Vamos achar as palavras escondidas?", "cp2-inicio": "Toque na primeira e na última letra da palavra!", "cp2-vitoria": "Parabéns! Você achou todas as palavras!"})
for w in ["bola", "livro", "sala", "lupa", "cola", "giz", "mesa", "papel", "escola", "mochila", "caderno", "caneta", "tesoura", "borracha",
          "estojo", "pincel", "floresta", "cachoeira", "montanha", "oceano", "planeta", "estrela", "borboleta", "jardim", "nuvem", "semente"]:
    falas[f"cp2-{w}"] = f"{w.capitalize()}!"

# --- Pixel Art ---
falas.update({"px-titulo": "Pixel Art do Rabisco! Siga as coordenadas!", "px-vitoria": "Parabéns! Você descobriu o desenho!",
    "px-nivel-1": "Pinte cada casa da lista com a cor certa. A letra é a coluna e o número é a linha.",
    "px-nivel-2": "Agora as casas vêm em trechos: pinte da primeira até a última.",
    "px-nivel-3": "Plano cartesiano! O primeiro número é o x, para o lado. O segundo é o y, para cima."})

# --- Rabisco Robô ---
falas.update({"rr-titulo": "Rabisco Robô! Programe o caminho até a escola!", "rr-vitoria": "Parabéns! O programa funcionou!",
    "rr-nivel-1": "Monte o caminho com as setas e aperte rodar!",
    "rr-nivel-2": "Agora o Rabisco é um robô: ele anda para a frente e vira para os lados.",
    "rr-nivel-3": "Use o bloco repetir para fazer programas mais curtos!",
    "rr-bateu": "Ops! Vamos tentar de novo?", "rr-faltou": "Quase! O Rabisco ainda não chegou na escola."})

# --- Rabisco e as Cores da Criação (página 1: o Jardim) ---
falas.update({
    "cc-titulo": "Rabisco e as Cores da Criação!",
    "cc-intro": "Oh, não! A Borracha Apagona apagou as cores do Jardim! Ande por tudo para pintar de novo!",
    "cc-pastor": "Oi, Rabisco! Minhas ovelhinhas se perderam. Você me ajuda a encontrar?",
    "cc-ovelha-1": "Uma ovelhinha!", "cc-ovelha-2": "Duas ovelhinhas!", "cc-ovelha-3": "Três ovelhinhas!",
    "cc-entregou": "Obrigado, Rabisco! Ainda falta alguma ovelhinha...",
    "cc-portao": "O portão abriu!", "cc-portao-fechado": "Hmm, o portão quer sementes.",
    "cc-vermelho": "Vermelho!", "cc-ponte": "As flores vermelhas viraram uma ponte!",
    "cc-estrela": "Uma estrela escondida!", "cc-caiu": "Ops! Vamos de novo!",
    "cc-final": "Você achou todas! E Deus viu que tudo era muito bom!",
})

# Falas em inglês (voz americana): chave -> texto
VOZ_EN = "en-US-AnaNeural"
falas_en = {}
# Rabisco Says
for c in ["red", "blue", "yellow", "green", "pink", "orange"]:
    falas_en[f"en-rs-says-{c}"] = f"Rabisco says: touch {c}!"
    falas_en[f"en-rs-{c}"] = f"Touch {c}!"
    for f in ["star", "heart", "circle", "square"]:
        falas_en[f"en-rs-says-{c}-{f}"] = f"Rabisco says: touch the {c} {f}!"
falas_en.update({"en-rs-didnt-say": "Good! Rabisco didn't say!", "en-rs-yes": "Yes!", "en-rs-oops": "Oops!", "en-rs-oops-didnt": "Oops! Rabisco didn't say!"})
for parte in ["head", "shoulders", "knees", "toes", "eyes", "mouth", "hands", "tummy"]:
    falas_en[f"en-{parte}"] = f"{parte.capitalize()}!"
    falas_en[f"en-touch-{parte}"] = f"Touch your {parte}!"
falas_en["en-great-job"] = "Great job!"
for c in ["red", "blue", "yellow", "green", "pink", "orange", "purple"]:
    falas_en[f"en-{c}"] = f"{c.capitalize()}!"
for w in ["apple", "dog", "cat", "ball", "car", "sun", "fish", "book", "star", "house", "tree", "banana", "bird", "cake", "duck", "moon"]:
    falas_en[f"en-{w}"] = f"{w.capitalize()}!"


async def gerar(chave, texto, marcas=None, voz=None):
    caminho = os.path.join(SAIDA, f"{chave}.mp3")
    if os.path.exists(caminho) and not REFAZER and marcas is None:
        return
    com = edge_tts.Communicate(texto, voz or VOZ, rate=RITMO, boundary="WordBoundary")
    with open(caminho, "wb") as f:
        async for parte in com.stream():
            if parte["type"] == "audio":
                f.write(parte["data"])
            elif parte["type"] == "WordBoundary" and marcas is not None:
                marcas.append(round(parte["offset"] / 10_000_000, 3))  # segundos


async def main():
    os.makedirs(SAIDA, exist_ok=True)
    sem = asyncio.Semaphore(6)
    tempos = {}

    async def uma(chave, texto, n_letras=None, voz=None):
        async with sem:
            for tentativa in range(3):
                try:
                    marcas = [] if n_letras else None
                    await gerar(chave, texto, marcas, voz)
                    if n_letras:
                        tempos[chave] = marcas[:n_letras]  # instante em que cada letra é falada
                    return
                except Exception as e:  # rede instável: tenta de novo
                    if tentativa == 2: print("falhou", chave, e)
                    await asyncio.sleep(1)

    tarefas = [uma(k, t) for k, t in falas.items()]
    tarefas += [uma(k, t, n) for k, (t, n) in soletrar.items()]
    tarefas += [uma(k, t, voz=VOZ_EN) for k, t in falas_en.items()]
    await asyncio.gather(*tarefas)
    with open(os.path.join(SAIDA, "soletrar.json"), "w") as f:
        json.dump(tempos, f, indent=1, sort_keys=True)
    print(f"{len(falas) + len(soletrar)} falas em {os.path.abspath(SAIDA)} com {VOZ}")


asyncio.run(main())
