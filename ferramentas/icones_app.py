# Gera os ícones do app (PWA) a partir da pose de frente do Rabisco: assets/app/icone-*.png
# Uso: python3 ferramentas/icones_app.py   (requer Pillow)
import os
from PIL import Image, ImageDraw

AQUI = os.path.dirname(__file__)
RAIZ = os.path.join(AQUI, "..")
SAIDA = os.path.join(RAIZ, "assets", "app")
os.makedirs(SAIDA, exist_ok=True)
rabisco = Image.open(os.path.join(RAIZ, "assets", "rabisco", "poses", "frente.png")).convert("RGBA")
# só da cintura para cima: o rosto fica grande no ícone
rabisco = rabisco.crop((0, 0, rabisco.width, int(rabisco.height * 0.58)))

def icone(lado, area, arredondado):
    """area: fração do quadrado ocupada pelo Rabisco (ícone 'maskable' precisa de margem segura)"""
    im = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    fundo = Image.new("RGBA", (lado, lado), (0, 181, 240, 255))
    # círculo de luz atrás do Rabisco
    ImageDraw.Draw(fundo).ellipse([lado * 0.12, lado * 0.18, lado * 0.88, lado * 0.94], fill=(127, 214, 255, 255))
    mascara = Image.new("L", (lado, lado), 0)
    if arredondado:
        ImageDraw.Draw(mascara).rounded_rectangle([0, 0, lado - 1, lado - 1], radius=int(lado * 0.22), fill=255)
    else:
        mascara.paste(255, [0, 0, lado, lado])
    im.paste(fundo, (0, 0), mascara)
    alt = int(lado * area)
    r = rabisco.resize((int(rabisco.width * alt / rabisco.height), alt), Image.LANCZOS)
    im.alpha_composite(r, ((lado - r.width) // 2, lado - r.height - int(lado * (1 - area) / 2)))
    return im

for lado in (192, 512):
    icone(lado, 0.86, True).save(os.path.join(SAIDA, f"icone-{lado}.png"))
    icone(lado, 0.66, False).save(os.path.join(SAIDA, f"icone-maskable-{lado}.png"))
icone(180, 0.86, False).convert("RGB").save(os.path.join(SAIDA, "apple-touch-icon.png"))
print("ok:", os.path.abspath(SAIDA))
