# Mede o rosto oficial (assets/rabisco/3d/rosto-adesivo.png) e grava os contornos de cada parte
# (sobrancelhas, boca, dentes, língua) e as elipses dos olhos em assets/rabisco/3d/rosto3d.json.
# O Rabisco 3D monta o rosto em relevo com esses dados (pixels da textura, 382 x 496).
# Uso: python3 ferramentas/rabisco3d_rosto.py
import json, os
from collections import deque
from PIL import Image

PASTA = os.path.join(os.path.dirname(__file__), "..", "assets", "rabisco", "3d")
im = Image.open(os.path.join(PASTA, "rosto-adesivo.png")).convert("RGBA")
W, H = im.size
px = im.load()


def tipo(c):
    r, g, b, a = c
    if a < 40: return None
    if max(r, g, b) < 70: return "K"
    if r > 220 and g > 220 and b > 220: return "W"
    if b > 180 and r < 120: return "B"
    if r > 200 and g < 140 and b > 120: return "P"
    return None


def componentes():
    vistos, saida = set(), []
    for y in range(H):
        for x in range(W):
            t = tipo(px[x, y])
            if not t or (x, y) in vistos: continue
            fila, pts = deque([(x, y)]), []
            vistos.add((x, y))
            while fila:
                a, b = fila.popleft(); pts.append((a, b))
                for n in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if 0 <= n[0] < W and 0 <= n[1] < H and n not in vistos and tipo(px[n]) == t:
                        vistos.add(n); fila.append(n)
            if len(pts) >= 60: saida.append((t, pts))
    return saida


def contorno(pts, passo=3, recuo=0):
    col = {}
    for x, y in pts:
        a, b = col.get(x, (y, y)); col[x] = (min(a, y), max(b, y))
    xs = sorted(col)
    xs = [x for x in xs if xs[0] + recuo <= x <= xs[-1] - recuo][::passo]
    topo = [(x, col[x][0] + recuo) for x in xs]
    base = [(x, col[x][1] - recuo) for x in reversed(xs)]
    return topo + base


def elipse(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return {"cx": (min(xs) + max(xs)) / 2, "cy": (min(ys) + max(ys)) / 2, "rx": (max(xs) - min(xs)) / 2, "ry": (max(ys) - min(ys)) / 2}


comps = componentes()
por = lambda t: sorted([p for k, p in comps if k == t], key=len, reverse=True)
K = por("K"); Wc = por("W"); B = por("B"); P = por("P")
lado = lambda pts: sum(p[0] for p in pts) / len(pts) < W / 2  # True = olho/sobrancelha da esquerda da imagem

boca = max(K, key=lambda p: sum(q[1] for q in p) / len(p))           # a mancha preta mais baixa
olhosK = sorted([p for p in K if p is not boca and len(p) > 5000], key=lambda p: -len(p))[:2]
sobr = [p for p in K if p is not boca and p not in olhosK and min(q[1] for q in p) < 120]
pupilas = [p for p in K if p is not boca and p not in olhosK and p not in sobr]
brancos = [p for p in Wc if len(p) > 5000]
brilhos = [p for p in Wc if len(p) < 600]
dentes = max([p for p in Wc if 2000 < len(p) < 5000], key=len)

olhos = []
for contornoOlho in sorted(olhosK, key=lambda p: sum(q[0] for q in p)):
    esq = lado(contornoOlho)
    escolhe = lambda lista: next(p for p in lista if lado(p) == esq)
    olhos.append({"contorno": elipse(contornoOlho), "branco": elipse(escolhe(brancos)), "iris": elipse(escolhe(B)),
                  "pupila": elipse(escolhe(pupilas)), "brilho": elipse(escolhe(brilhos))})

dados = {
    "largura": W, "altura": H,
    "olhos": olhos,
    "sobrancelhas": [contorno(p) for p in sorted(sobr, key=lambda p: sum(q[0] for q in p))],
    "boca": contorno(boca), "bocaDentro": contorno(boca, recuo=9),
    "dentes": contorno(dentes, passo=6), "lingua": contorno(P[0]),
}
json.dump(dados, open(os.path.join(PASTA, "rosto3d.json"), "w"))
print({k: (len(v) if isinstance(v, list) else v) for k, v in dados.items()})
print(json.dumps(olhos, indent=0)[:600])
