# Gera as texturas do Rabisco 3D a partir da arte oficial (rabisco 01.png):
#  - rosto.png: olhos, sobrancelhas e boca, sem a aba do boné (que vira peça 3D)
#  - cores.json: cores oficiais amostradas da arte
# Uso: python3 ferramentas/rabisco3d_texturas.py
import json, os
from collections import deque
from PIL import Image

RAIZ = os.path.join(os.path.dirname(__file__), "..")
ORIGEM = os.path.join(RAIZ, "referencias", "drive ilustrado Educarte 2025", "RABISCO", "rabisco 01.png")
DESTINO = os.path.join(RAIZ, "assets", "rabisco", "3d")
os.makedirs(DESTINO, exist_ok=True)

im = Image.open(ORIGEM).convert("RGBA").crop((676, 173, 1464, 2667))
px = im.load()
AZUL = (0, 189, 255, 255)


def tipo(c):
    r, g, b, a = c
    if a < 10: return "T"
    if max(r, g, b) < 80: return "K"
    if b > 180 and r < 140: return "B"
    if r > 180 and g < 130 and b > 100: return "P"
    if r > 200 and b < 80: return "O"
    if r > 200 and g > 170: return "S"
    return "?"


# Rosto: área da frente da cabeça (entre os contornos laterais), em pixels do recorte
X0, X1, Y0, Y1 = 215, 597, 560, 1056
rosto = im.crop((X0, Y0, X1, Y1))
rp = rosto.load()
W, H = rosto.size

# remove a aba do boné: laranja + o traço preto colado nela (até 18 px)
dist = {}
fila = deque()
for y in range(H):
    for x in range(W):
        if tipo(rp[x, y]) == "O":
            dist[(x, y)] = 0
            fila.append((x, y))
while fila:
    x, y = fila.popleft()
    d = dist[(x, y)]
    if d >= 18: continue
    for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= q[0] < W and 0 <= q[1] < H and q not in dist and tipo(rp[q]) in "K?":
            dist[q] = d + 1
            fila.append(q)
for p in dist:
    rp[p] = AZUL

# azul chapado (a sombra vem da luz 3D)
for y in range(H):
    for x in range(W):
        r, g, b, a = rp[x, y]
        if b > 180 and r < 90 and g > 120: rp[x, y] = AZUL
# sobras do contorno da cabeça nas bordas (os olhos não chegam nessas faixas)
for y in range(H):
    for x in range(W):
        if (x > 355) or (y < 12) or (x < 14 and y > 335):
            if tipo(rp[x, y]) in "K?": rp[x, y] = AZUL
rosto.save(os.path.join(DESTINO, "rosto.png"), optimize=True)

# versão "adesivo": só olhos, sobrancelhas e boca. O azul de FORA (ligado à borda) fica
# transparente; o azul de dentro dos olhos (íris) continua.
adesivo = rosto.copy()
ap = adesivo.load()
def azulado(c):
    r, g, b, a = c
    return a > 0 and b > 150 and r < 120 and g > 90
fora = set()
fila = deque([(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)])
while fila:
    q = fila.popleft()
    if q in fora or not (0 <= q[0] < W and 0 <= q[1] < H) or not azulado(ap[q]):
        continue
    fora.add(q)
    x, y = q
    fila.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
for q in fora:
    ap[q] = (0, 0, 0, 0)
adesivo.save(os.path.join(DESTINO, "rosto-adesivo.png"), optimize=True)
