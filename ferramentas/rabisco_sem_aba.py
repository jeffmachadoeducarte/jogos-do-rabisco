# Gera assets/rabisco/poses/frente-sem-aba.png: a pose de frente sem a aba do boné que sai para o lado
# da cabeça. O camarim (src/motor/camarim.js) usa esta imagem quando o Rabisco põe outro chapéu,
# para a aba laranja não aparecer por baixo dele.
# Uso: python3 ferramentas/rabisco_sem_aba.py   (requer Pillow)
import os
from PIL import Image

AQUI = os.path.dirname(__file__)
ORIGEM = os.path.join(AQUI, "..", "assets", "rabisco", "poses", "frente.png")
SAIDA = os.path.join(AQUI, "..", "assets", "rabisco", "poses", "frente-sem-aba.png")

im = Image.open(ORIGEM).convert("RGBA")
px = im.load()
W, H = im.size
# a aba fica à esquerda da cabeça (o lápis começa em x≈66) entre y≈150 e y≈268 (na imagem de 284 × 900)
esc = W / 284
for y in range(int(150 * esc), int(268 * esc)):
    for x in range(0, int(66 * esc)):
        px[x, y] = (0, 0, 0, 0)
# restinho do contorno da aba logo acima do fone de ouvido
for y in range(int(268 * esc), int(286 * esc)):
    for x in range(0, int(42 * esc)):
        px[x, y] = (0, 0, 0, 0)
im.save(SAIDA)
print("ok:", os.path.abspath(SAIDA))
