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
# A voz Francisca é a narradora/anfitriã dos jogos (não "é" o Rabisco). Decisão do Jefferson em 11/10/2026.
falas["portal-oi"] = "Bem-vindos aos Jogos do Rabisco! Escolha a sua idade e vamos brincar?"
falas["portal-idade"] = "Escolha um jogo!"
# Saudações e parabéns da narradora SEM o nome da criança (quando o nome não está no banco de nomes).
# Neutras de gênero; uma em cada grupo tem um toque leve de fé e gratidão.
falas["saudacao-1"] = "Que bom ter você aqui! A aventura de hoje já vai começar!"
falas["saudacao-2"] = "Oi! Vamos para mais uma aventura?"
falas["saudacao-3"] = "Que alegria! Deus abençoe a sua aventura de hoje!"
falas["parabens-1"] = "Parabéns! Você mandou muito bem!"
falas["parabens-2"] = "Muito bem! Que orgulho de você!"
falas["parabens-3"] = "Parabéns! Que presente lindo Deus nos deu: aprender brincando!"
# Frases COM o nome, em partes emendáveis (src/motor/voz.js toca pre + nome + pos sem intervalo, via Web Audio).
# O nome vem sempre no fim da primeira parte ("Parabéns, Alice!"), que é onde a emenda soa natural.
# Nada de voz do navegador: se o nome não estiver em assets/voz/nomes, vale a frase neutra acima.
falas["sau-pre-1"] = "Oi! Que bom ter você aqui,"
falas["sau-pre-2"] = "Que alegria ver você,"
falas["sau-pre-3"] = "Deus abençoe a sua aventura de hoje,"
falas["sau-pos-1"] = "A aventura de hoje já vai começar!"
falas["sau-pos-2"] = "Vamos para mais uma aventura?"
falas["sau-pos-pronta"] = "Está pronta para a aventura?"
falas["sau-pos-pronto"] = "Está pronto para a aventura?"
falas["par-pre-1"] = "Parabéns,"
falas["par-pre-2"] = "Muito bem,"
falas["par-pre-3"] = "Isso aí,"
falas["par-pos-1"] = "Você mandou muito bem!"
falas["par-pos-2"] = "Que orgulho de você!"
falas["par-pos-3"] = "Deus abençoe a sua aventura!"
falas["par-pos-4"] = "Que presente lindo Deus nos deu: aprender brincando!"
falas["cor-pre"] = "Boa corrida,"
falas["cor-pos"] = "Vamos tentar de novo?"
falas["lug-pre"] = "Olha só,"
falas["lug-pos"] = "Chegamos num lugar novo!"

# Banco de nomes (assets/voz/nomes/<nome-sem-acento>.mp3), falados como chamada: "Alice!".
# Só gera com --nomes (são ~300 arquivos). Para acrescentar um nome: coloque aqui e rode com --nomes.
# O jogo baixa só o MP3 do nome da criança cadastrada (src/motor/voz.js, audioDoNome).
NOMES = """
Miguel Arthur Gael Théo Heitor Ravi Davi Bernardo Noah Gabriel Samuel Pedro Anthony Isaac Benício Benjamin Matteo
Lucas Joaquim Nicolas Lorenzo Rafael Henrique Murilo Levi Guilherme Vicente Felipe Bryan Matheus Daniel Enzo Caleb
Pietro Antônio Ryan Leonardo Bento Eduardo Thomas João Vitor Yuri Caio Breno Luan Otávio Augusto Cauã Kauê Emanuel
Ícaro Nathan Thiago Diego Luiz Luís André Vinícius Francisco Bruno Tomás Gustavo Erick Victor Danilo Fernando Igor
Alexandre Josué Elias Jonas Rodrigo Mateus Ruan Davi Lucca Apollo Zion Asafe Oliver Liam Noé Raul Hugo Léo Ravi Kaique
Kaio Kauan Ícaro Santiago Ângelo Iago Ian Isaque Jorge Júlio Marcelo Marcos Mário Renan Ricardo Saulo Sérgio Vitor
Wesley Yago Filipe Fábio Carlos Cristiano Fabrício Giovanni Giovani Heitor Heloís Jean José Juan Kevin Lúcio Luiz Nicolas
Otto Paulo Pablo Ronaldo Rubens Téo Theo Tiago Vinicius William Nathanael Natan Davi Luca Abner Arthur Benjamim Benicio
Helena Alice Laura Maria Sophia Sofia Valentina Heloísa Cecília Júlia Julia Isabella Isabela Manuela Lívia Maitê Lorena
Ana Luísa Ayla Eloá Antonella Elisa Beatriz Maya Maya Isis Mariana Aurora Esther Ester Melissa Yasmin Olívia Lara Agatha
Ágatha Liz Clara Emanuelly Emanuelle Marina Catarina Rafaela Giovanna Giovana Luna Alícia Alicia Isadora Pietra Nicole
Bianca Gabriela Larissa Letícia Vitória Ana Clara Ana Júlia Ana Laura Ana Beatriz Ana Luiza Maria Clara Maria Eduarda
Maria Luísa Maria Júlia Maria Cecília Maria Alice Maria Helena Maria Fernanda Maria Vitória Maria Flor João Pedro
João Miguel João Lucas João Gabriel João Vitor João Guilherme Pedro Henrique Pedro Lucas Luiz Miguel Luiz Felipe
Luiz Henrique Carlos Eduardo Davi Lucca Davi Luiz Enzo Gabriel Arthur Miguel Lívia Stella Stella Mirella Melina Eva
Amanda Alana Bruna Camila Carolina Débora Duda Eduarda Emily Fernanda Flávia Gabrielly Hadassa Hanna Jade Joana
Josefina Kyara Kiara Lavínia Leticia Luana Luiza Luísa Louise Malu Marcela Maria Milena Mirela Natália Nina Paloma
Paula Rebeca Renata Sara Sarah Serena Tainá Talita Taís Thaís Vanessa Yara Zoe Zoé Ísis Íris Iris Aline Alessandra
Andressa Bela Brenda Caroline Cléo Dani Elena Ellen Ellie Flora Francisca Gabi Heloise Ingrid Iara Jéssica Júlia
Lala Lia Lola Lorena Lua Mel Mia Nana Nanda Nicolly Pérola Rafa Sophie Sofie Tati Vivi Vitória Antonela Antônia
Benedita Celina Dalila Dandara Domitila Dora Eloah Gabriele Gaia Glória Jasmine Judite Kaylane Kethlyn Lais Laís
Lilian Lis Luara Luma Mabel Madalena Maísa Maisa Manu Maria Isis Melinda Micaela Nair Noemi Noêmi Pilar Rita Rute
Ruth Samara Samira Tereza Teresa Valentine Vera Yasmim Alberto Adriel Alan Alex Allan Anderson Ângelo Arthur Gabriel
Benjamin Bernardo Bruno Caíque Cauê Cauan Cristian Davi Miguel Dominic Edson Eliseu Enrico Enzo Miguel Estevão Ezequiel
Gael Henrique Gil Heitor Miguel Henri Henry Ivan Jairo Joel Jonatas Jonathan Julian Kalel Kael Kalebe Lauro Lázaro
Leandro Lívio Lorenzo Miguel Luan Miguel Marcus Martin Martim Maurício Max Moisés Nicholas Nicolau Nelson Pedro Miguel
Rafael Miguel Rael Rian Roberto Rômulo Ruben Rui Simão Sidney Tales Tadeu Teodoro Timóteo Túlio Valentim Vicente Miguel
Vítor Vitor Hugo Wagner Walter Wilson Zaqueu Zeca Zé Dudu Cacá Bia Kiko Lulu Nico Rafinha Tetê Tico Totó
""".split("\n")
import re as _re
_lista = []
for _linha in NOMES:
    _linha = _linha.strip()
    if not _linha: continue
    # nomes compostos (Maria Clara, João Pedro...) ficam juntos; o resto é um nome por palavra
    _partes = _re.findall(r"(?:Maria|Ana|João|Pedro|Luiz|Carlos|Davi|Enzo|Arthur|Heitor|Lívia|Gael|Rafael|Vitor|Vicente|Lorenzo|Luan) [A-ZÁÂÃÉÊÍÓÔÚÇ][a-záâãéêíóôúç]+|[A-ZÁÂÃÉÊÍÓÔÚÇ][a-záâãéêíóôúç]+", _linha)
    _lista += _partes
NOMES = sorted(set(_lista))
nomes_voz = {f"nomes/{slug(n).lower().replace(' ', '-')}": f"{n}!" for n in NOMES}
GERAR_NOMES = "--nomes" in args
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
    "des-arcoiris": "Vamos pintar o arco-íris!", "des-barco": "Vamos pintar o barquinho!", "des-trem": "Vamos pintar o trenzinho!", "des-bolo": "Vamos pintar o bolo de aniversário!",
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

# --- Rabisco e as Cores da Criação: 10 páginas (../jogos/cores-da-criacao/paginas.js) ---
falas.update({
    "cc-titulo": "Rabisco e as Cores da Criação!",
    "cc-entregou": "Obrigado, Rabisco! Ainda falta alguém...",
    "cc-portao": "O portão abriu!", "cc-estrela": "Uma estrela escondida!", "cc-caiu": "Ops! Vamos de novo!",
})
# página: (personagem, bichos no singular/plural e gênero, o que o portão pede, fala do fim)
PAGINAS_CC = {
    "jardim": ("Lápis Verde", "ovelhinha", "ovelhinhas", "a", "sementes", "Oh, não! A Borracha Apagona apagou as cores do Jardim! Ande por tudo para pintar de novo!", "Você achou todas! E Deus viu que tudo era muito bom!"),
    "mar": ("Lápis Azul", "patinho", "patinhos", "o", "conchas", "Agora é o Mar! A Borracha apagou a praia. Vamos pintar tudo de novo!", "Deus fez os peixes do mar e as aves do céu!"),
    "pomar": ("Lápis Laranja", "pintinho", "pintinhos", "o", "maçãs", "Que pomar cinzento! Vamos pintar as árvores e as frutas!", "Deus fez as árvores que dão frutos. Que delícia!"),
    "floresta": ("Lápis Marrom", "coelhinho", "coelhinhos", "o", "nozes", "A Floresta dos Bichos perdeu as cores! Vamos colorir!", "Deus fez os animais, cada um do seu jeitinho!"),
    "fazenda": ("Lápis Amarelo", "porquinho", "porquinhos", "o", "cenouras", "Bem-vindo à Fazenda! Vamos pintar tudo de novo!", "Deus cuida de cada um dos seus bichinhos!"),
    "ceu": ("Lápis Ciano", "passarinho", "passarinhos", "o", "penas", "Subimos até o Céu! Vamos pintar as nuvens!", "Deus fez o céu bem grande e lindo!"),
    "neve": ("Lápis Branco", "pinguinzinho", "pinguinzinhos", "o", "flocos de neve", "Que frio! A Montanha de Neve está sem cor. Vamos pintar!", "Deus manda a neve branquinha cair sobre a terra!"),
    "deserto": ("Lápis Vermelho", "camelinho", "camelinhos", "o", "gotas de água", "Chegamos ao Oásis no deserto! Vamos colorir!", "Deus faz brotar água até no deserto!"),
    "noite": ("Lápis Roxo", "corujinha", "corujinhas", "a", "estrelinhas", "Já é noite! Vamos pintar a noite estrelada!", "Deus conhece cada estrela pelo nome!"),
    "descanso": ("Lápis Rosa", "ovelhinha", "ovelhinhas", "a", "livros", "A última página! Vamos pintar a escola e o jardim!", "No sétimo dia, Deus descansou. E tudo ficou muito bom! Parabéns, você coloriu o livro inteiro!"),
}
UM = {"o": ["Um", "Dois", "Três"], "a": ["Uma", "Duas", "Três"]}
for pid, (pers, sing, plur, gen, itens, intro, fim) in PAGINAS_CC.items():
    falas[f"cc-intro-{pid}"] = intro
    falas[f"cc-pastor-{pid}"] = f"Oi, Rabisco! Eu sou o {pers}. Meus {plur} se perderam. Você me ajuda a encontrar?" if gen == "o" else f"Oi, Rabisco! Eu sou o {pers}. Minhas {plur} se perderam. Você me ajuda a encontrar?"
    for k in range(3):
        falas[f"cc-bicho-{pid}-{k + 1}"] = f"{UM[gen][k]} {sing if k == 0 else plur}!"
    falas[f"cc-portao-fechado-{pid}"] = f"Hmm, o portão quer {itens}."
    falas[f"cc-final-{pid}"] = fim
COR_FALA = {"vermelho": ("Vermelho", "vermelhas"), "azul": ("Azul", "azuis"), "amarelo": ("Amarelo", "amarelas"), "verde": ("Verde", "verdes"),
            "laranja": ("Laranja", "laranja"), "rosa": ("Rosa", "cor-de-rosa"), "roxo": ("Roxo", "roxas"), "branco": ("Branco", "brancas"), "ciano": ("Azul-claro", "azul-claras")}
for cor, (nome, adj) in COR_FALA.items():
    falas[f"cc-cor-{cor}"] = f"{nome}!"
    falas[f"cc-ponte-{cor}"] = f"As flores {adj} viraram uma ponte!"

# --- Cidade do Rabisco ---
falas.update({
    "cid-titulo": "Cidade do Rabisco!",
    "cid-intro": "Que cidade bonita! Vamos passear? Converse com quem tem um ponto de exclamação em cima.",
    "cid-carteiro": "Oi, Rabisco! Leve estas cartas: a vermelha, a azul e a amarela. Cada uma vai na caixa de correio da casa da mesma cor!",
    "cid-gatos": "Meus três gatinhos fugiram! Um foi para trás da Igreja Reviver, outro para o parque e outro para perto do hospital.",
    "cid-padeiro": "Pão quentinho! Você leva para a escola? As crianças vão adorar o lanche!",
    "cid-guarda": "Olá! Atravesse a rua na faixa de pedestre, mas só quando o bonequinho do semáforo ficar verde. Três vezes!",
    "cid-carta-ok": "Carta entregue!", "cid-gato-ok": "Achei um gatinho! Miau!", "cid-pao-ok": "Que cheirinho bom! Obrigado pelo pão, Rabisco!",
    "cid-faixa-ok": "Muito bem! Atravessou certinho!", "cid-espere": "Espere o bonequinho verde para atravessar!",
    "cid-missao-ok": "Missão cumprida!", "cid-final": "Você ajudou todo mundo! Você é um amigo da cidade!",
})
for k, nome in {"escola": "Escola Educarte", "igreja": "Igreja Reviver", "praca": "Praça", "parque": "Parque", "biblioteca": "Biblioteca", "padaria": "Padaria",
                "hospital": "Hospital", "bombeiros": "Bombeiros", "correio": "Correio", "mercado": "Mercado", "casas": "Rua das Casas Coloridas", "casas2": "Vila"}.items():
    falas[f"cid-lugar-{k}"] = f"{nome}!"

# --- Cidade do Rabisco: carro, missões novas e números da corrida ---
falas.update({
    "cid-carro": "Cinto de segurança afivelado! Para a frente acelera, para trás freia.",
    "cid-corrida": "Oi, Rabisco! Pegue o carro e passe pelas bandeiras na ordem: um, dois, três, quatro e cinco! O relógio começa na bandeira um.",
    "cid-corrida-ok": "Que corrida! Você passou por todas as bandeiras!",
    "cid-corrida-tempo": "Acabou o tempo! Vamos de novo? Comece pela bandeira um.",
    "cid-encomenda": "Esta caixa de frutas é grande demais para levar a pé! Venha de carro e leve para a casa da Vovó Lápis.",
    "cid-caixa-carro": "A caixa de frutas está no carro! Agora, para a casa da Vovó.",
    "cid-caixa-pe": "A caixa é pesada! Volte aqui de carro.",
    "cid-encomenda-ok": "Obrigada, Rabisco! Cinco laranjas e três bananas! Deus abençoe você!",
    "cid-bombeiro": "Socorro! Tem quatro foguinhos na cidade. Chegue pertinho e aperte o botão da água!",
    "cid-fogo-ok": "Fogo apagado!",
    "cid-bombeiro-ok": "A cidade está segura! Obrigado, Deus, por cuidar de nós!",
    "cid-tesouro": "Vamos fazer uma caça ao tesouro? Primeira pista: procure onde o sino toca e a gente agradece a Deus!",
    "cid-pista-2": "Achou! Próxima pista: onde a água dança no meio da cidade.",
    "cid-pista-3": "Muito bem! Agora vá ao playground, onde tem balanço e escorregador.",
    "cid-pista-4": "Quase lá! A última pista: onde se faz o pão quentinho.",
    "cid-tesouro-ok": "Você achou o tesouro: um livro de histórias e dez selos! Mas o maior tesouro é o amor de Deus.",
    "cid-patos": "Quantos patinhos estão nadando no lago? Conte bem e pise no número certo!",
    "cid-patos-erro": "Hmm, conte de novo, devagarinho.",
    "cid-patos-ok": "Isso mesmo! Em inglês, pato é duck! Quack, quack!",
    # lojas parceiras (2026-10-14): pátio da J.E, Bella Cat e Rise Up por dentro
    "cid-je": "Olá, Rabisco! Bem-vindo à J.E Multimarcas, a loja de carros! Entre no pátio pelo portão e escolha o carro que você mais gostar. Chegue pertinho e aperte o botão!",
    "cid-je-vermelho": "Quero este! O carro vermelho!", "cid-je-azul": "Quero este! O carro azul!", "cid-je-amarelo": "Quero este! O carro amarelo!",
    "cid-je-verde": "Quero este! O carro verde!", "cid-je-roxo": "Quero este! O carro roxo!",
    "cid-je-chave": "É seu! Cuide bem dele! Aqui está a chave. Entre no carro e saia pelo portão!",
    "cid-je-portao": "Boa viagem! Leve o carro novo até a casa verde: o Seu Lápis Verde quer ver!",
    "cid-je-ok": "Uau, que carro lindo! Parabéns, Rabisco! Vamos agradecer a Deus por esse presente!",
    "cid-bella": "Oi, Rabisco! Que tal um presente para a Professora Lápis Turquesa? Entre aqui na Bella Cat e escolha um acessório bem bonito!",
    "cid-bella-escolha": "Que bom que você veio! Escolha um presente: chegue pertinho de um pedestal e aperte o botão!",
    "cid-bella-laco": "O laço rosa! Que lindo!", "cid-bella-colar": "O colar de pérolas brancas! Que lindo!", "cid-bella-pulseira": "A pulseira azul! Que linda!",
    "cid-bella-bolsa": "A bolsinha roxa! Que linda!", "cid-bella-tiara": "A tiara amarela, cheia de brilhos! Que linda!",
    "cid-bella-embrulho": "Pronto, embrulhadinho! Agora leve o presente até a Professora Lápis Turquesa, na porta da escola!",
    "cid-bella-ok": "Que lindo! Obrigada por lembrar de mim, Rabisco. Deus te abençoe!",
    "cid-rise": "Oi, Rabisco! Bem-vindo à Academia Rise Up! Aqui a gente cuida do corpo que Deus nos deu. Entre pela porta e vamos treinar!",
    "cid-rise-esteira": "Primeiro, a esteira! Suba na esteira do meio e corra: aperte o botão ou vá para a frente!",
    "cid-rise-corre": "Isso! Continue correndo!",
    "cid-rise-peso": "Que corrida! Agora vamos levantar o halter. Vá até o colchonete laranja e aperte o botão cinco vezes!",
    "cid-rise-ok": "Parabéns, Rabisco! Você foi forte e corajoso! Corpo saudável, coração alegre!",
    # Hora da Aula (Escola Educarte)
    "cid-professora": "Oi, Rabisco! O sino da aula já vai tocar e o Lápis Azulzinho esqueceu a mochila em casa! Busque a mochila azul na casa azul, a de número dois, e traga para ele aqui na porta da escola!",
    "cid-mochila": "A mochila azul! Obrigada, Rabisco! Agora corra para a Escola Educarte!",
    "cid-sino": "Plim, plom! O sino tocou! Mas a professora espera você. Corra, Rabisco!",
    "cid-escola-ok": "Minha mochila! Obrigado, Rabisco! Hoje a aula é das letras: A, B, C!",
    # Convite para o culto infantil (Igreja Reviver)
    "cid-igreja": "Oi, Rabisco! Hoje tem culto infantil na Igreja Reviver! Convide três amigos lápis pela cidade e traga todos aqui. Siga os coraçõezinhos!",
    "cid-convite": "Oba! Eu vou ao culto infantil!",
    "cid-convite-todos": "Eu também vou! Três amigos! Agora vamos todos para a Igreja Reviver!",
    "cid-igreja-ok": "Que alegria! Alegrei-me quando me disseram: vamos à casa do Senhor! Baseado no Salmo cento e vinte e dois, versículo um.",
    # Pai Nosso (Igreja Reviver)
    "cid-painosso": "Oi, Rabisco! Vamos orar juntos o Pai Nosso? Venha para o tapete azul na porta da igreja. Eu falo uma frase e você repete comigo, bem devagarinho.",
    "cid-pai-intro": "Vamos orar juntos. Fique quietinho e repita comigo.",
})
# Pai Nosso (Mateus 6:9-13, texto tradicional): uma fala por frase, mais devagar (RITMO_FALA)
PAI_NOSSO = ["Pai nosso, que estás no céu,", "santificado seja o teu nome.", "Venha o teu reino,", "seja feita a tua vontade,", "assim na terra como no céu.",
             "O pão nosso de cada dia nos dá hoje.", "Perdoa as nossas ofensas,", "assim como nós perdoamos a quem nos tem ofendido.",
             "E não nos deixes cair em tentação,", "mas livra-nos do mal.", "Amém."]
RITMO_FALA = {"cid-pai-intro": "-15%"}  # ritmo próprio de algumas falas (o resto usa RITMO)
for i, frase in enumerate(PAI_NOSSO, 1):
    falas[f"cid-pai-{i}"] = frase
    RITMO_FALA[f"cid-pai-{i}"] = "-15%"
for n in range(1, 11):
    falas[f"cid-num-{n}"] = f"{NUMEROS[n].capitalize()}!"

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


# >>> BLOCO Rabisco e a Arca (jogos/rabisco-e-a-arca) — mantido por quem cuida desse jogo >>>
# As falas ficam em jogos/rabisco-e-a-arca/falas.json (gerado por falas.mjs a partir de dados.js):
# "pt" vai para a Francisca e "en" para a voz em inglês (VOZ_EN).
with open(os.path.join(os.path.dirname(__file__), "..", "jogos", "rabisco-e-a-arca", "falas.json"), encoding="utf-8") as _f:
    _arca = json.load(_f)
falas.update(_arca["pt"])
falas_en.update(_arca["en"])
# <<< FIM DO BLOCO Rabisco e a Arca <<<

# >>> BLOCO Rabiscolândia (jogos/rabiscopolis) — mantido por quem cuida desse jogo >>>
# As falas ficam em jogos/rabiscopolis/falas.json (gerado por jogos/rabiscopolis/falas.mjs), chaves rp-*:
#   node jogos/rabiscopolis/falas.mjs && python3 ferramentas/gerar_vozes.py
with open(os.path.join(os.path.dirname(__file__), "..", "jogos", "rabiscopolis", "falas.json"), encoding="utf-8") as _f:
    _rp = json.load(_f)
falas.update(_rp["pt"])
falas_en.update(_rp.get("en", {}))
# <<< FIM DO BLOCO Rabiscolândia <<<

# >>> BLOCO Rádio (src/radio) — vinhetas do rádio gospel do carro, chaves radio-* >>>
# Duas variações por estação; o rádio alterna entre elas entre um hino e outro.
falas.update({
    "radio-jesus-me-ama": "Rádio Jesus Me Ama!",
    "radio-jesus-me-ama-2": "Você está ouvindo a Rádio Jesus Me Ama!",
    "radio-hinos-de-fe": "Rádio Hinos de Fé!",
    "radio-hinos-de-fe-2": "Você está ouvindo a Rádio Hinos de Fé.",
    "radio-paz": "Rádio Paz.",
    "radio-paz-2": "Você está ouvindo a Rádio Paz.",
    "radio-alegria": "Rádio Alegria!",
    "radio-alegria-2": "Você está ouvindo a Rádio Alegria!",
})
# <<< FIM DO BLOCO Rádio <<<


async def gerar(chave, texto, marcas=None, voz=None):
    caminho = os.path.join(SAIDA, f"{chave}.mp3")
    if os.path.exists(caminho) and not REFAZER and marcas is None:
        return
    com = edge_tts.Communicate(texto, voz or VOZ, rate=RITMO_FALA.get(chave, RITMO), boundary="WordBoundary")
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
    if GERAR_NOMES:
        os.makedirs(os.path.join(SAIDA, "nomes"), exist_ok=True)
        tarefas += [uma(k, t) for k, t in nomes_voz.items()]
    tarefas += [uma(k, t, n) for k, (t, n) in soletrar.items()]
    tarefas += [uma(k, t, voz=VOZ_EN) for k, t in falas_en.items()]
    await asyncio.gather(*tarefas)
    with open(os.path.join(SAIDA, "soletrar.json"), "w") as f:
        json.dump(tempos, f, indent=1, sort_keys=True)
    print(f"{len(falas) + len(soletrar)} falas{' + ' + str(len(nomes_voz)) + ' nomes' if GERAR_NOMES else ''} em {os.path.abspath(SAIDA)} com {VOZ}")


asyncio.run(main())
