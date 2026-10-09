# Exporta as poses oficiais do Rabisco com a logo Educarte no peito, como na Character Bible.
# Uso: python3 ferramentas/poses_com_logo.py
# A logo é o arquivo oficial (branco.png), só redimensionado e posicionado sobre a camiseta.
import os
from PIL import Image

RAIZ = os.path.join(os.path.dirname(__file__), "..")
ORIGEM = os.path.join(RAIZ, "referencias", "drive ilustrado Educarte 2025", "RABISCO")
DESTINO = os.path.join(RAIZ, "assets", "rabisco", "poses")
LOGO = Image.open(os.path.join(RAIZ, "assets", "marca", "logos", "branco.png")).convert("RGBA")
ICONE = Image.open(os.path.join(RAIZ, "assets", "marca", "logos", "icone-branco.png")).convert("RGBA")

# Camiseta visível (entre as alças da mochila), medida em pixels do PNG original:
# (centro x, topo da camiseta, base da camiseta, largura visível)
POSES = {
    "frente": ("rabisco 01.png", (1077, 1325, 1727, 371)),
    "apresentando": ("rabisco 02.png", (1024, 1354, 1702, 316)),
    "costas": ("rabisco 03.png", None),  # de costas a mochila cobre a camiseta
    "lado": ("rabisco 04.png", None),
}


def com_logo(im, medida):
    cx, topo, base, largura = medida
    # proporções da Character Bible: logo com 65% da largura, começando a 16% da altura
    w = round(largura * 0.65)
    logo = LOGO.resize((w, round(LOGO.height * w / LOGO.width)), Image.LANCZOS)
    y = round(topo + (base - topo) * 0.16)
    im.alpha_composite(logo, (round(cx - w / 2), y))
    return im


def lado_com_icone(im):
    # vista lateral: o peito aparece de perfil, então vai o símbolo, levemente achatado pela curva
    w, h = 84, 112
    icone = ICONE.resize((w, h), Image.LANCZOS)
    im.alpha_composite(icone, (674 + 258 - w // 2, 172 + 1120))
    return im


os.makedirs(DESTINO, exist_ok=True)
for nome, (arquivo, medida) in POSES.items():
    im = Image.open(os.path.join(ORIGEM, arquivo)).convert("RGBA")
    if medida:
        im = com_logo(im, medida)
    elif nome == "lado":
        im = lado_com_icone(im)
    im = im.crop(im.getchannel("A").getbbox())
    im.thumbnail((700, 900), Image.LANCZOS)
    im.save(os.path.join(DESTINO, f"{nome}.png"), optimize=True)
    print(nome, im.size)
