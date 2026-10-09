# Recorta a vista lateral oficial do Rabisco (rabisco 04.png) em peças para animação.
# Uso: python3 ferramentas/rig_rabisco.py <rabisco 04.png> assets/rabisco/rig [previa.png]
# O desenho não é alterado: só separamos braço, perna e mochila e tapamos o buraco atrás do braço.
import sys, json
from collections import deque
from PIL import Image, ImageDraw

src, outdir = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA').crop((674, 172, 1461, 2697))
# símbolo Educarte no peito (de perfil, levemente achatado), como em poses_com_logo.py
import os
_icone = Image.open(os.path.join(os.path.dirname(__file__), '..', 'assets', 'marca', 'logos', 'icone-branco.png')).convert('RGBA')
im.alpha_composite(_icone.resize((84, 112), Image.LANCZOS), (258 - 42, 1120))
W, H = im.size
px = im.load()
PRETO = (17, 17, 17, 255)
PELE = (253, 226, 204, 255)


def tipo(c):
    r, g, b, a = c
    if a < 10: return 'T'
    if max(r, g, b) < 80: return 'K'
    if b > 180 and r < 140: return 'B'
    if r > 180 and g < 130 and b > 100: return 'P'
    if r > 200 and b < 80: return 'O'
    if r > 200 and g > 170: return 'S'
    return '?'


def interp(pts, x):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x0 <= x <= x1: return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return pts[0][1] if x < pts[0][0] else pts[-1][1]


# --- antebraço + mão: percorre a pele atravessando traços pretos finos (dedos) ---
TOPO_BRACO = 1342
LIM_TRACO = 20
visto = {}
fila = deque([(410, 1400, 0)])
while fila:
    x, y, k = fila.popleft()
    if not (0 <= x < W and TOPO_BRACO <= y < 1810): continue
    t = tipo(px[x, y])
    if t in 'BPOT': continue
    k = 0 if t == 'S' else k + 1
    if k > LIM_TRACO or visto.get((x, y), 99) <= k: continue
    visto[(x, y)] = k
    fila.extend([(x + 1, y, k), (x - 1, y, k), (x, y + 1, k), (x, y - 1, k)])
mascara = Image.new('L', (W, H), 0); mp = mascara.load()
for p in visto: mp[p] = 255
from PIL import ImageFilter
mascara = mascara.filter(ImageFilter.MaxFilter(3)); mp = mascara.load()
for y in range(H):
    for x in range(W):
        if mp[x, y] and (y < TOPO_BRACO or tipo(px[x, y]) in 'BPO'): mp[x, y] = 0

braco_img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(braco_img)  # prolonga o braço por baixo do punho da manga (atrás do braço real)
d.polygon([(366, 1290), (466, 1290), (466, 1372), (366, 1372)], fill=PELE)
d.line([(364, 1290), (364, 1372)], fill=PRETO, width=11)
d.line([(468, 1290), (468, 1372)], fill=PRETO, width=11)
braco_real = Image.new('RGBA', (W, H), (0, 0, 0, 0)); braco_real.paste(im, (0, 0), mascara)
braco_img.alpha_composite(braco_real)

# --- corpo: tapa o buraco do braço copiando a roupa vizinha ---
corpo = im.copy(); cp = corpo.load()
barra = [(170, 1572), (250, 1577), (400, 1614), (500, 1611), (600, 1598)]
for y in range(TOPO_BRACO, 1800):
    for x in range(W - 1, -1, -1):
        if not mp[x, y]: continue
        yb = interp(barra, x)
        short_esq = 305 - (y - 1612) * 0.03
        if y < yb - 8:
            if x < 184: cp[x, y] = (0, 0, 0, 0); continue
        elif y <= yb + 8:
            cp[x, y] = PRETO if x >= 186 else (0, 0, 0, 0); continue
        elif x < short_esq:
            cp[x, y] = (0, 0, 0, 0); continue
        xx = x + 1
        while xx < W and (mp[xx, y] or tipo(cp[xx, y]) not in 'BPOK'): xx += 1
        cp[x, y] = cp[xx, y] if xx < W else (0, 0, 0, 0)
# suaviza as emendas da área tapada
liso = corpo.filter(ImageFilter.MedianFilter(9))
preenchido = mascara.copy(); fp = preenchido.load()
for y in range(H):
    for x in range(W):
        if fp[x, y] and cp[x, y][3] == 0: fp[x, y] = 0
corpo.paste(liso, (0, 0), preenchido)
dc = ImageDraw.Draw(corpo)
dc.line([(195, 1330), (195, 1582)], fill=PRETO, width=26)        # lateral do tronco
dc.line([(305, 1612), (299, 1806)], fill=PRETO, width=17)        # lateral do short

# vista lateral inteira sem o antebraço, em alta resolução: textura de projeção do Rabisco 3D
import os
_pasta3d = os.path.join(os.path.dirname(__file__), '..', 'assets', 'rabisco', '3d')
os.makedirs(_pasta3d, exist_ok=True)
corpo.save(os.path.join(_pasta3d, 'lado-sem-braco-full.png'))

# --- punho da manga (fica por cima do antebraço) ---
punho_m = Image.new('L', (W, H), 0)
ImageDraw.Draw(punho_m).polygon([(314, 1262), (506, 1262), (506, 1328), (470, 1354), (330, 1352), (314, 1340)], fill=255)
punho = Image.new('RGBA', (W, H), (0, 0, 0, 0)); punho.paste(corpo, (0, 0), punho_m)

# --- mochila ---
mochila = Image.new('RGBA', (W, H), (0, 0, 0, 0))
mochila.paste(corpo.crop((596, 1000, W, 1640)), (596, 1000))
corpo.paste((0, 0, 0, 0), (596, 1000, W, 1640))

# --- perna (abaixo do short) ---
CORTE = 1932
perna = Image.new('RGBA', (W, H), (0, 0, 0, 0))
perna.paste(im.crop((0, CORTE, W, H)), (0, CORTE))
dp = ImageDraw.Draw(perna)
dp.polygon([(384, 1840), (488, 1840), (488, CORTE + 4), (384, CORTE + 4)], fill=PELE)
dp.line([(383, 1840), (383, CORTE + 6)], fill=PRETO, width=11)
dp.line([(488, 1840), (488, CORTE + 6)], fill=PRETO, width=13)
corpo.paste((0, 0, 0, 0), (0, CORTE, W, H))

pecas = {'corpo': corpo, 'braco': braco_img, 'punho': punho, 'mochila': mochila, 'perna': perna}
pivos = {'corpo': (435, 1900), 'braco': (416, 1320), 'punho': (416, 1320), 'mochila': (690, 1040), 'perna': (436, 1870)}

ESCALA = 420 / H
meta = {'altura': 420, 'largura': round(W * ESCALA), 'pecas': {}}
for nome, p in pecas.items():
    bb = p.getchannel('A').getbbox()
    c = p.crop(bb).resize((round((bb[2] - bb[0]) * ESCALA), round((bb[3] - bb[1]) * ESCALA)), Image.LANCZOS)
    c.save(f'{outdir}/{nome}.png', optimize=True)
    pvx, pvy = pivos[nome]
    meta['pecas'][nome] = {
        'origemX': round((pvx - bb[0]) / (bb[2] - bb[0]), 4),
        'origemY': round((pvy - bb[1]) / (bb[3] - bb[1]), 4),
        'pivoX': round(pvx * ESCALA, 1), 'pivoY': round(pvy * ESCALA, 1),
    }
json.dump(meta, open(f'{outdir}/rig.json', 'w'), indent=1)

if len(sys.argv) > 3:
    def montar(ang_braco, ang_perna):
        f = Image.new('RGBA', (W, H), (190, 190, 190, 255))
        pt = perna.rotate(-ang_perna, center=pivos['perna'], resample=Image.BICUBIC)
        f.alpha_composite(pt)
        f.alpha_composite(corpo)
        f.alpha_composite(braco_img.rotate(ang_braco, center=pivos['braco'], resample=Image.BICUBIC))
        f.alpha_composite(punho)
        f.alpha_composite(mochila)
        return f
    quadros = [corpo, montar(0, 0), montar(20, 20), montar(-20, -20)]
    prev = Image.new('RGBA', (W * 4, H), (190, 190, 190, 255))
    for i, q in enumerate(quadros): prev.alpha_composite(q, (W * i, 0))
    prev.crop((0, 1000, W * 4, 2525)).convert('RGB').save(sys.argv[3])
print(json.dumps(meta))
