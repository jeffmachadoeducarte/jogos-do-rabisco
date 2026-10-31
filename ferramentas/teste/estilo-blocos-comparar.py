# Monta comparacao-<cena>.png (ANTES | DEPOIS lado a lado) a partir de antes-*.png e depois-*.png em .claude/tmp/estilo-blocos/
import glob, os, sys
from PIL import Image, ImageDraw, ImageFont
pasta = os.path.join(os.path.dirname(__file__), "..", "..", ".claude", "tmp", "estilo-blocos")
def fonte(t):
    for f in ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        if os.path.exists(f): return ImageFont.truetype(f, t)
    return ImageFont.load_default()
for a in sorted(glob.glob(os.path.join(pasta, "antes-*.png"))):
    cena = os.path.basename(a)[len("antes-"):-4]
    d = os.path.join(pasta, f"depois-{cena}.png")
    if not os.path.exists(d): continue
    A, D = Image.open(a).convert("RGB"), Image.open(d).convert("RGB")
    W, H = A.size
    out = Image.new("RGB", (W * 2 + 12, H), (255, 255, 255))
    out.paste(A, (0, 0)); out.paste(D, (W + 12, 0))
    g = ImageDraw.Draw(out); f = fonte(34)
    for x, txt, cor in [(14, "ANTES", (21, 21, 21)), (W + 26, "DEPOIS (blocos)", (236, 46, 140))]:
        w = g.textlength(txt, font=f)
        g.rounded_rectangle((x, 14, x + w + 28, 66), 10, fill=(255, 255, 255)); g.text((x + 14, 20), txt, font=f, fill=cor)
    out.save(os.path.join(pasta, f"comparacao-{cena}.png"))
    print("ok", cena)
