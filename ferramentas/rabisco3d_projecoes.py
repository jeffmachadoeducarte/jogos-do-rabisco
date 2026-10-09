# Prepara as três vistas oficiais do Rabisco (frente, costas, lado) como texturas de projeção
# do Rabisco 3D: mesmo recorte, mesma escala, logo no peito, lado sem o antebraço apontando.
# Uso: python3 ferramentas/rig_rabisco.py ... (gera lado-sem-braco-full.png) e depois
#      python3 ferramentas/rabisco3d_projecoes.py
import os
from PIL import Image

RAIZ = os.path.join(os.path.dirname(__file__), "..")
ORIGEM = os.path.join(RAIZ, "referencias", "drive ilustrado Educarte 2025", "RABISCO")
PASTA = os.path.join(RAIZ, "assets", "rabisco", "3d")
RECORTE = (674, 172, 1464, 2697)   # igual para as três vistas (estão na mesma escala no original)
ALTURA = 2048

logo = Image.open(os.path.join(RAIZ, "assets", "marca", "logos", "branco.png")).convert("RGBA")


def salvar(im, nome):
    im = im.crop(RECORTE)
    im = im.resize((round(im.width * ALTURA / im.height), ALTURA), Image.LANCZOS)
    im.save(os.path.join(PASTA, nome), optimize=True)
    print(nome, im.size)


# frente com a logo oficial no peito (mesmas proporções de poses_com_logo.py)
frente = Image.open(os.path.join(ORIGEM, "rabisco 01.png")).convert("RGBA")
cx, topo, base, larg = 1077, 1325, 1727, 371  # pixels do PNG original
w = round(larg * 0.65)
lg = logo.resize((w, round(logo.height * w / logo.width)), Image.LANCZOS)
frente.alpha_composite(lg, (round(cx - w / 2), round(topo + (base - topo) * 0.16)))
salvar(frente, "frente.png")

salvar(Image.open(os.path.join(ORIGEM, "rabisco 03.png")).convert("RGBA"), "costas.png")

# lado: a vista lateral sem o antebraço (o braço 3D é desenhado à parte)
lado = Image.open(os.path.join(PASTA, "lado-sem-braco-full.png")).convert("RGBA")
# tira o "e" do peito da vista lateral: no 3D a logo da frente já aparece, e o "e" duplicava nos ombros
lp = lado.load()
for y in range(1110, 1245):
    for x in range(205, 310):
        r, g, b_, a = lp[x, y]
        if a and r > 110 and g > 150 and b_ > 200:
            lp[x, y] = (0, 189, 255, 255)
# tira a manga (e o traço dela) do desenho lateral: no 3D o braço é peça separada e, quando ele
# levanta o braço, o tronco por baixo precisa ser só a camiseta azul. A alça laranja fica.
for y in range(990, 1360):
    for x in range(300, 515):
        r, g, b_, a = lp[x, y]
        if not a:
            continue
        laranja = r > 200 and b_ < 80
        azul = b_ > 180 and r < 140
        if not (laranja or azul):
            lp[x, y] = (0, 189, 255, 255)
tela = Image.new("RGBA", (2064, 2752), (0, 0, 0, 0))
tela.alpha_composite(lado, (674, 172))
salvar(tela, "lado.png")
