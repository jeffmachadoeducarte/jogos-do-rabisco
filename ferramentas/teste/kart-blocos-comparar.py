#!/usr/bin/env python3
# Junta antes/depois do Rabisco Kart lado a lado: .claude/tmp/kart-blocos/comparacao-<cena>.png
import glob, os, sys
from PIL import Image, ImageDraw
pasta = os.path.join(os.path.dirname(__file__), "../../.claude/tmp/kart-blocos")
for a in sorted(glob.glob(os.path.join(pasta, "antes-*.png"))):
    nome = os.path.basename(a)[len("antes-"):-4]
    d = os.path.join(pasta, f"depois-{nome}.png")
    if not os.path.exists(d): continue
    A, D = Image.open(a).convert("RGB"), Image.open(d).convert("RGB")
    h = max(A.height, D.height)
    img = Image.new("RGB", (A.width + D.width + 12, h + 36), "white")
    img.paste(A, (0, 36)); img.paste(D, (A.width + 12, 36))
    t = ImageDraw.Draw(img); t.text((8, 10), "ANTES", fill="black"); t.text((A.width + 20, 10), "DEPOIS (blocos)", fill="black")
    img.save(os.path.join(pasta, f"comparacao-{nome}.png"))
    print("comparacao", nome)
