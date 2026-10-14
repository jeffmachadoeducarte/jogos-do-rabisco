#!/usr/bin/env python3
"""Rádio gospel do carro: renderiza os hinos de domínio público (e as 3 músicas originais da
Rádio Alegria) em áudio com instrumentos AMOSTRADOS (SoundFont General MIDI + FluidSynth).

Lê as melodias e as vozes de src/radio/hinos.js, monta um ARRANJO por estação (introdução de
2 compassos, 2 estrofes com a 2ª mais cheia, andamento humano com pequenas variações,
dinâmica por frase e final com ritardando), gera um MIDI, renderiza no FluidSynth (44,1 kHz,
reverb leve), normaliza a loudness (~ -18 LUFS, pico ≤ -1,5 dBTP) e grava MP3 96 kbps em
assets/radio/<estacao>/<hino>.mp3. Também gera as vinhetas (fundo musical + voz da Francisca de
assets/voz/radio-*.mp3) e a musiquinha da van de sorvete (assets/radio/efeitos/van-sorvete.mp3).

Requisitos (fora do repositório):
  - fluidsynth (2.x)            → --fluidsynth /caminho/fluidsynth  (padrão: o do PATH)
  - ffmpeg com libmp3lame       → --ffmpeg /caminho/ffmpeg          (padrão: o do PATH)
  - node (para ler hinos.js)
  - SoundFont GM de licença livre → --sf2 /caminho/GeneralUser-GS.sf2
    (usado: GeneralUser GS v2.0.3, S. Christian Collins — https://github.com/mrbumpy409/GeneralUser-GS;
     licença: uso livre, inclusive comercial, em produções musicais — veja assets/radio/CREDITOS.md)

Uso:
  python3 ferramentas/radio/gerar_radio.py --sf2 ~/sf/GeneralUser-GS.sf2 [--so jesus-me-ama,graca] [--midi-dir /tmp/x]
"""
import argparse
import json
import math
import os
import random
import shutil
import struct
import subprocess
import sys
import tempfile

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SR = 44100

ESTACOES = [
    ("jesus-me-ama", "caixinha", ["jesus-me-ama", "manjedoura", "formoso-jesus"]),
    ("hinos-de-fe", "orgao", ["castelo-forte", "santo-santo-santo", "doxologia"]),
    ("paz", "piano", ["sou-feliz", "que-amigo", "mais-perto", "graca"]),
    ("alegria", "alegre", ["pulando", "bom-dia-sol", "palminhas"]),
]

# General MIDI (programa 0-based)
GM = dict(piano=0, celesta=8, glock=9, caixinha=10, vibrafone=11, marimba=12, xilofone=13,
          orgao_igreja=19, orgao_palheta=20, violao_nylon=24, violao_aco=25, baixo_acustico=32,
          baixo_dedo=33, cordas=48, cordas_lentas=49, pizzicato=45, coro_aahs=52, vozes_oohs=53,
          flauta=73, flauta_doce=74, violoncelo=42)


# ------------------------------------------------------------------ dados
def ler_hinos():
    caminho = os.path.join(RAIZ, "src", "radio", "hinos.js")
    js = ("const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8').replace(/export const/g,'const');"
          "process.stdout.write(JSON.stringify(new Function(s+';return HINOS')()))")
    out = subprocess.run(["node", "-e", js, caminho], check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def notas(lista):
    return [(lista[i], lista[i + 1], int(lista[i + 2])) for i in range(0, len(lista), 3)]


def separar_vozes(voz):
    """A lista 'voz' traz contralto e tenor misturados: separa por ataque (a mais aguda = contralto)."""
    por_t = {}
    for t, d, p in notas(voz):
        por_t.setdefault(round(t, 4), []).append((t, d, p))
    alto, tenor = [], []
    ult_a, ult_t = None, None
    for t in sorted(por_t):
        g = sorted(por_t[t], key=lambda n: -n[2])
        if len(g) >= 2:
            alto.append(g[0]); tenor.append(g[-1]); ult_a, ult_t = g[0][2], g[-1][2]
        else:
            n = g[0]
            da = abs(n[2] - ult_a) if ult_a is not None else 0
            dt = abs(n[2] - ult_t) if ult_t is not None else 99
            if da <= dt:
                alto.append(n); ult_a = n[2]
            else:
                tenor.append(n); ult_t = n[2]
    return alto, tenor


RAIZES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def cifra(c):
    r = RAIZES[c[0]]
    resto = c[1:]
    if resto.startswith("#"): r += 1; resto = resto[1:]
    elif resto.startswith("b"): r -= 1; resto = resto[1:]
    r %= 12
    menor = resto.startswith("m")
    pcs = [r, (r + (3 if menor else 4)) % 12, (r + 7) % 12]
    if resto.endswith("7"): pcs.append((r + 10) % 12)
    return r, pcs


def no_intervalo(pcs, lo, hi):
    return [p for p in range(lo, hi + 1) if p % 12 in pcs]


# ------------------------------------------------------------------ MIDI
class Arranjo:
    """Notas e controles em BATIDAS do arranjo; depois convertidos para segundos pelo mapa de andamento."""

    def __init__(self):
        self.notas = []    # (canal, t, dur, nota, vel, desvio_s)
        self.ccs = []      # (canal, t, cc, valor)
        self.canais = {}   # canal → dict(prog, vol, pan, rev, cho)

    def canal(self, ch, prog, vol=100, pan=64, rev=40, cho=0):
        self.canais[ch] = dict(prog=prog, vol=vol, pan=pan, rev=rev, cho=cho)

    def nota(self, ch, t, dur, p, vel, jit=0.008, desvio=0.0):
        if p < 0 or p > 127 or dur <= 0: return
        vel = int(max(1, min(127, round(vel + random.gauss(0, 3)))))
        j = max(-2.5 * jit, min(2.5 * jit, random.gauss(0, jit))) if jit else 0.0
        self.notas.append((ch, t, dur, p, vel, j + desvio))

    def cc(self, ch, t, num, val):
        self.ccs.append((ch, t, num, int(max(0, min(127, round(val))))))


class Andamento:
    """Mapa batida → segundos com pequenas variações (rubato) e ritardandos."""

    def __init__(self, bpm, comprimento, rits=(), deriva=0.015, semente=1):
        rnd = random.Random(semente)
        self.passo = 1 / 96
        n = int(comprimento / self.passo) + 400
        fases = [(rnd.uniform(0, 6.283), rnd.uniform(14, 30)), (rnd.uniform(0, 6.283), rnd.uniform(5, 9))]
        spb = 60.0 / bpm
        self.seg = [0.0]
        acc = 0.0
        for i in range(n):
            b = i * self.passo
            f = 1 + deriva * (0.7 * math.sin(fases[0][0] + 6.283 * b / fases[0][1]) + 0.3 * math.sin(fases[1][0] + 6.283 * b / fases[1][1]))
            for ini, fim, quanto in rits:
                if ini <= b < fim:
                    x = (b - ini) / (fim - ini)
                    f *= 1 + quanto * x * x
                elif b >= fim and quanto > 0.3 and fim > ini:  # depois do ritardando final continua devagar
                    f *= 1 + quanto
            acc += spb * f * self.passo
            self.seg.append(acc)

    def s(self, b):
        x = b / self.passo
        i = int(math.floor(x))
        if i < 0: return b * (self.seg[1] / self.passo)
        if i + 1 >= len(self.seg): return self.seg[-1] + (x - len(self.seg) + 1) * (self.seg[-1] - self.seg[-2])
        return self.seg[i] + (x - i) * (self.seg[i + 1] - self.seg[i])


def var_len(v):
    out = bytearray([v & 0x7F])
    v >>= 7
    while v:
        out.insert(0, 0x80 | (v & 0x7F))
        v >>= 7
    return bytes(out)


def escrever_midi(arr, andamento, caminho, cauda=3.5):
    PPQ = 480  # andamento fixo de 120 bpm → 960 ticks por segundo; o rubato já vem em segundos
    tick = lambda s: max(0, int(round(s * 960)))
    eventos = {}  # canal → lista (tick, ordem, bytes)
    for ch, c in arr.canais.items():
        ev = eventos.setdefault(ch, [])
        ev += [(0, 0, bytes([0xB0 | ch, 0, 0])), (0, 0, bytes([0xB0 | ch, 32, 0])),
               (0, 1, bytes([0xC0 | ch, c["prog"]])), (0, 2, bytes([0xB0 | ch, 7, c["vol"]])),
               (0, 2, bytes([0xB0 | ch, 10, c["pan"]])), (0, 2, bytes([0xB0 | ch, 91, c["rev"]])),
               (0, 2, bytes([0xB0 | ch, 93, c["cho"]])), (0, 2, bytes([0xB0 | ch, 11, 127]))]
    # notas: mesma altura no mesmo canal não se sobrepõe
    por_canal = {}
    for n in arr.notas: por_canal.setdefault(n[0], []).append(n)
    fim_s = 0.0
    for ch, lst in por_canal.items():
        lst.sort(key=lambda n: (n[1], n[3]))
        conv = []
        for (_, t, d, p, v, j) in lst:
            a = andamento.s(t) + j
            b = andamento.s(t + d) + (j if d < 1 else 0)
            conv.append([max(0.0, a), b, p, v])
        ult = {}
        for i, n in enumerate(conv):
            if n[2] in ult:
                k = ult[n[2]]
                if conv[k][1] > n[0] - 0.012: conv[k][1] = max(conv[k][0] + 0.03, n[0] - 0.012)
            ult[n[2]] = i
        ev = eventos.setdefault(ch, [])
        for a, b, p, v in conv:
            ev.append((tick(a), 4, bytes([0x90 | ch, p, v])))
            ev.append((tick(b), 3, bytes([0x80 | ch, p, 0])))
            fim_s = max(fim_s, b)
    for (ch, t, num, val) in arr.ccs:
        eventos.setdefault(ch, []).append((tick(andamento.s(t)), 2 if num != 64 or val == 0 else 5, bytes([0xB0 | ch, num, val])))
    trilhas = []
    tempo = bytes([0x00, 0xFF, 0x51, 0x03]) + (500000).to_bytes(3, "big")
    fim_t = tick(fim_s + cauda)
    trilhas.append(tempo + var_len(fim_t) + bytes([0xFF, 0x2F, 0x00]))
    for ch in sorted(eventos):
        ev = sorted(eventos[ch], key=lambda e: (e[0], e[1]))
        dados, ant = bytearray(), 0
        for t, _, b in ev:
            dados += var_len(t - ant) + b
            ant = t
        dados += var_len(max(0, fim_t - ant)) + bytes([0xFF, 0x2F, 0x00])
        trilhas.append(bytes(dados))
    with open(caminho, "wb") as f:
        f.write(b"MThd" + struct.pack(">IHHH", 6, 1, len(trilhas), PPQ))
        for t in trilhas:
            f.write(b"MTrk" + struct.pack(">I", len(t)) + t)
    return fim_s + cauda


# ------------------------------------------------------------------ análise do hino
class Hino:
    def __init__(self, id_, h):
        self.id, self.h = id_, h
        self.bpm, self.total = h["bpm"], h["total"]
        self.compasso = h["compasso"] or 4
        self.mel = notas(h["mel"])
        self.original = bool(h.get("original"))
        if self.original:
            self.acordes = [(a[0], a[1]) for a in h["acordes"]]
            self.alto = self.tenor = self.baixo = []
        else:
            self.alto, self.tenor = separar_vozes(h["voz"])
            self.baixo = notas(h["baixo"])
        self.inicio_compasso = self._achar_inicio()

    def _achar_inicio(self):
        if self.original: return 0
        bar, melhor, o_m = self.compasso, -1, 0
        for o in range(bar):
            sc = sum(d for t, d, p in self.baixo if abs(((t - o) % bar)) < 1e-6) * 2
            sc += sum(d for t, d, p in self.mel if abs(((t - o) % bar)) < 1e-6)
            if sc > melhor + 1e-9: melhor, o_m = sc, o
        return o_m

    def soando(self, voz, t):
        return [p for (a, d, p) in voz if a <= t + 1e-6 < a + d]

    def harmonia(self, t):
        """(baixo, classes de altura) do acorde na batida t."""
        if self.original:
            c = self.acordes[0][1]
            for a, nome in self.acordes:
                if a <= t + 1e-6: c = nome
            r, pcs = cifra(c)
            return r, pcs
        b = self.soando(self.baixo, t) or self.soando(self.baixo, math.floor(t))
        resto = self.soando(self.alto, t) + self.soando(self.tenor, t)
        pcs = sorted(set([p % 12 for p in resto + b]))
        return (b[0] % 12 if b else (pcs[0] if pcs else 0)), pcs

    def pos(self, t):
        return (t - self.inicio_compasso) % self.compasso


# ------------------------------------------------------------------ arranjos
def dinamica(t, ini, frase, base):
    """arco suave por frase (4 compassos) — sobe até o meio e relaxa."""
    x = ((t - ini) % frase) / frase
    return base + 7 * math.sin(math.pi * x)


def tocar_voz(arr, ch, voz, deslocamento, vel_base, h, ini_estrofe, frase, transp=0, legato=1.0, jit=0.008,
              de=None, ate=None, acento=4):
    for (t, d, p) in voz:
        if de is not None and t < de - 1e-6: continue
        if ate is not None and t >= ate - 1e-6: continue
        tt = t + deslocamento
        v = dinamica(tt, ini_estrofe, frase, vel_base) + (acento if abs(h.pos(t)) < 1e-6 else 0)
        arr.nota(ch, tt, d * legato, p + transp, v, jit=jit)


def secoes(h, intro_compassos=2):
    bar = h.compasso
    intro_de = h.total - intro_compassos * bar
    intro_len = intro_compassos * bar
    I = intro_len + 0.5               # respiro depois da introdução
    E1 = I
    E2 = E1 + h.total + (1.0 if not h.original else 0.0)
    FIM = E2 + h.total
    return dict(intro_de=intro_de, intro_len=intro_len, E1=E1, E2=E2, FIM=FIM, bar=bar)


def estender_final(arr, fim, extra, canais=None):
    novas = []
    for n in arr.notas:
        ch, t, d, p, v, j = n
        if (canais is None or ch in canais) and abs(t + d - fim) < 0.26 and ch != 9:
            n = (ch, t, d + extra, p, v, j)
        novas.append(n)
    arr.notas = novas


def padrao_arpejo(compasso, sub):
    """índices: 'B' = baixo, números = tons de cima da voicing."""
    if compasso == 3: return ["B", 0, 1, 2, 1, 0]
    if compasso == 6: return ["B", 0, 1, 2, 1, 0]
    return ["B", 0, 1, 2, "B5", 1, 2, 1] if sub == 0.5 else ["B", 1, "B5", 1]


def arpejo(arr, ch, h, de, ate, desloc, lo, hi, baixo_lo, baixo_hi, vel, sub, ini_estrofe, frase, dur_mult=1.0,
           pedal=False, jit=0.01):
    pad = padrao_arpejo(h.compasso, sub)
    passos = int(round((ate - de) / sub))
    ult_harm = None
    for k in range(passos):
        t = de + k * sub
        pos = h.pos(t)
        idx = int(round(pos / sub)) % len(pad)
        bt = math.floor(t + 1e-6)
        r, pcs = h.harmonia(bt)
        if not pcs: continue
        cima = no_intervalo(pcs, lo, hi)
        if len(cima) > 3:
            cima = cima[:3] if h.compasso != 4 else cima[-3:]
        baixos = no_intervalo([r], baixo_lo, baixo_hi)
        quinta = no_intervalo([(r + 7) % 12 if (r + 7) % 12 in pcs else r], baixo_lo, baixo_hi + 5)
        sinal = pad[idx]
        if sinal == "B": p = baixos[0] if baixos else None
        elif sinal == "B5": p = quinta[0] if quinta else (baixos[0] if baixos else None)
        else: p = cima[min(sinal, len(cima) - 1)] if cima else None
        harm = (r, tuple(pcs))
        if pedal and harm != ult_harm:
            arr.cc(ch, t + desloc - 0.02, 64, 0)
            arr.cc(ch, t + desloc + 0.12, 64, 110)
        ult_harm = harm
        if p is None: continue
        v = dinamica(t + desloc, ini_estrofe, frase, vel) + (6 if isinstance(sinal, str) else 0) - (3 if abs(pos % 1) > 1e-6 else 0)
        dur = sub * dur_mult
        if isinstance(sinal, str) and not pedal: dur = max(dur, min(h.compasso / 2, 2.0))
        arr.nota(ch, t + desloc, dur, p, v, jit=jit)


def arranjo_caixinha(h):
    """Rádio Jesus Me Ama: celesta / caixinha de música + violão de nylon dedilhado + baixo suave."""
    arr = Arranjo()
    s = secoes(h)
    bar, frase = s["bar"], 4 * s["bar"]
    sub = 0.5 if h.bpm <= 104 else 1
    arr.canal(0, GM["celesta"], vol=104, pan=58, rev=52)
    arr.canal(1, GM["violao_nylon"], vol=92, pan=74, rev=40)
    arr.canal(2, GM["caixinha"], vol=70, pan=50, rev=60)
    arr.canal(3, GM["baixo_acustico"], vol=86, pan=64, rev=22)
    arr.canal(4, GM["cordas_lentas"], vol=50, pan=64, rev=70, cho=30)
    # introdução: violão sozinho nos dois últimos compassos + a caixinha lembrando o fim da melodia
    d0 = s["intro_de"] - 0
    arpejo(arr, 1, h, s["intro_de"], h.total, -d0, 50, 67, 40, 52, 56, sub, 0, frase)
    tocar_voz(arr, 2, h.mel, -d0, 50, h, 0, frase, transp=12, de=s["intro_de"])
    for k, E in enumerate((s["E1"], s["E2"])):
        cheia = k == 1
        tocar_voz(arr, 0, h.mel, E, 84 if cheia else 78, h, E, frase, jit=0.007)
        if cheia:
            tocar_voz(arr, 2, h.mel, E, 54, h, E, frase, transp=12, jit=0.006)
            for (t, d, p) in h.alto + h.tenor:   # cordas bem baixinhas sustentando as vozes do meio
                arr.nota(4, E + t, d, p, 46, jit=0.0)
        arpejo(arr, 1, h, 0, h.total, E, 50, 67, 40, 52, 62 if cheia else 54, sub, E, frase)
        # baixo suave: só nos tempos fortes (cabeça e meio do compasso), segurando até o próximo
        fortes = [0] if h.compasso in (3, 6) else [0, 2]
        if h.compasso == 6: fortes = [0, 3]
        for (t, d, p) in h.baixo:
            pos = h.pos(t)
            if not any(abs(pos - f) < 1e-6 for f in fortes): continue
            seg = min((f - pos) % h.compasso or h.compasso for f in fortes + [h.compasso] if (f - pos) % h.compasso > 1e-6) if len(fortes) > 1 else h.compasso
            pb = p - 12 if p >= 48 else p
            arr.nota(3, E + t, max(d, seg) * 0.92, pb, (64 if cheia else 54) + (4 if abs(pos) < 1e-6 else 0), jit=0.006)
        arr.cc(4, E, 11, 0 if not cheia else 70)
    estender_final(arr, s["FIM"], 1.5)
    rits = [(s["intro_len"] - bar / 2, s["intro_len"], 0.15), (s["E2"] - 1.5, s["E2"], 0.06), (s["FIM"] - 2 * bar, s["FIM"], 0.45)]
    return arr, s, rits, 0.015


def arranjo_orgao(h):
    """Rádio Hinos de Fé: órgão de igreja + coro 'aahs' nas quatro vozes."""
    arr = Arranjo()
    s = secoes(h)
    bar, frase = s["bar"], 4 * s["bar"]
    arr.canal(0, GM["orgao_igreja"], vol=78, pan=64, rev=78)
    arr.canal(1, GM["orgao_igreja"], vol=70, pan=64, rev=82)     # pedaleira (baixo uma oitava abaixo)
    arr.canal(2, GM["coro_aahs"], vol=96, pan=50, rev=70, cho=20)  # sopranos e contraltos
    arr.canal(3, GM["coro_aahs"], vol=92, pan=78, rev=70, cho=20)  # tenores e baixos
    d0 = s["intro_de"]
    for voz in (h.mel, h.alto, h.tenor, h.baixo):
        tocar_voz(arr, 0, voz, -d0, 80, h, 0, frase, legato=0.98, jit=0.004, de=d0)
    arr.cc(0, 0, 11, 92)
    for k, E in enumerate((s["E1"], s["E2"])):
        cheia = k == 1
        for voz in (h.mel, h.alto, h.tenor, h.baixo):
            tocar_voz(arr, 0, voz, E, 80, h, E, frase, legato=0.985, jit=0.004)
        if cheia:
            tocar_voz(arr, 1, h.baixo, E, 82, h, E, frase, transp=-12, legato=0.98, jit=0.003)
        vc = 82 if cheia else 66
        tocar_voz(arr, 2, h.mel, E, vc + 4, h, E, frase, legato=0.94, jit=0.012, acento=2)
        tocar_voz(arr, 2, h.alto, E, vc - 6, h, E, frase, legato=0.94, jit=0.012, acento=2)
        tocar_voz(arr, 3, h.tenor, E, vc - 4, h, E, frase, legato=0.94, jit=0.012, acento=2)
        tocar_voz(arr, 3, h.baixo, E, vc, h, E, frase, legato=0.94, jit=0.012, acento=2)
        # expressão do órgão: arco por frase, mais cheio na 2ª estrofe
        base = 100 if cheia else 84
        t = E
        while t < E + h.total:
            x = ((t - E) % frase) / frase
            arr.cc(0, t, 11, base + 12 * math.sin(math.pi * x))
            arr.cc(1, t, 11, base + 6)
            t += 0.5
    arr.cc(0, s["FIM"] - 2 * bar, 11, 118)
    estender_final(arr, s["FIM"], 2.0)
    rits = [(s["intro_len"] - bar / 2, s["intro_len"], 0.2), (s["E2"] - 2, s["E2"], 0.1), (s["FIM"] - 2 * bar, s["FIM"], 0.5)]
    return arr, s, rits, 0.012


def arranjo_piano(h):
    """Rádio Paz: piano acústico (melodia + arpejos) e cordas suaves no fundo."""
    arr = Arranjo()
    s = secoes(h)
    bar, frase = s["bar"], 4 * s["bar"]
    sub = 0.5 if h.bpm <= 104 else 1
    arr.canal(0, GM["piano"], vol=108, pan=60, rev=48)   # mão direita (melodia)
    arr.canal(1, GM["piano"], vol=100, pan=68, rev=48)   # arpejos e baixo
    arr.canal(2, GM["cordas_lentas"], vol=78, pan=48, rev=72, cho=40)
    arr.canal(3, GM["violoncelo"], vol=74, pan=84, rev=64)
    d0 = s["intro_de"]
    arpejo(arr, 1, h, d0, h.total, -d0, 48, 64, 36, 50, 50, sub, 0, frase, pedal=True, dur_mult=1.6)
    tocar_voz(arr, 0, h.mel, -d0, 62, h, 0, frase, de=d0, transp=12)
    arr.cc(0, 0, 64, 90)
    for k, E in enumerate((s["E1"], s["E2"])):
        cheia = k == 1
        tocar_voz(arr, 0, h.mel, E, 80 if cheia else 72, h, E, frase, jit=0.01)
        if cheia:   # 2ª estrofe: a mão direita ganha a contralto por baixo da melodia
            tocar_voz(arr, 0, h.alto, E, 54, h, E, frase, jit=0.01)
        arpejo(arr, 1, h, 0, h.total, E, 48, 64, 36, 50, 58 if cheia else 52, sub, E, frase, pedal=True, dur_mult=1.6)
        # pedal da mão direita acompanha as trocas do arpejo (mesmo pedal, outro canal)
        for (t, d, p) in h.baixo:
            arr.cc(0, E + t - 0.02, 64, 0); arr.cc(0, E + t + 0.12, 64, 100)
        for voz in (h.alto, h.tenor):
            for (t, d, p) in voz:
                arr.nota(2, E + t, d, p, 70 if cheia else 56, jit=0.0)
        if cheia:
            for (t, d, p) in h.baixo:
                arr.nota(3, E + t, d, p if p < 55 else p - 12, 62, jit=0.0)
        # cordas entram devagar: quase nada na 1ª estrofe, presentes na 2ª
        t = E
        while t < E + h.total:
            x = (t - E) / h.total
            arr.cc(2, t, 11, (38 + 30 * x) if not cheia else (78 + 18 * math.sin(math.pi * x)))
            arr.cc(3, t, 11, 0 if not cheia else 70 + 20 * math.sin(math.pi * x))
            t += 0.5
    estender_final(arr, s["FIM"], 2.0)
    rits = [(s["intro_len"] - bar / 2, s["intro_len"], 0.18), (s["E2"] - 2, s["E2"], 0.1), (s["FIM"] - 2 * bar, s["FIM"], 0.5)]
    return arr, s, rits, 0.02


BUMBO, ARO, CAIXA, PALMA, CHIMBAL, CHIMBAL_ABERTO, PANDEIROLA, CHOCALHO, PRATO, TOM_A, TOM_M, TOM_G = 36, 37, 38, 39, 42, 46, 54, 70, 49, 50, 47, 45


def arranjo_alegre(h):
    """Rádio Alegria: marimba/xilofone + violão (estilo ukulele) + baixo + bateria leve, groove infantil."""
    arr = Arranjo()
    s = secoes(h)
    bar, frase = 4, 16
    arr.canal(0, GM["marimba"], vol=110, pan=56, rev=34)
    arr.canal(1, GM["xilofone"], vol=78, pan=80, rev=40)
    arr.canal(2, GM["violao_nylon"], vol=88, pan=36, rev=30)
    arr.canal(3, GM["baixo_dedo"], vol=96, pan=64, rev=12)
    arr.canal(4, GM["flauta_doce"], vol=60, pan=90, rev=50)
    arr.canal(9, 0, vol=90, pan=64, rev=26)
    palmas = h.id == "palminhas"

    def compasso_groove(t0, cheia, fill=False, ultimo=False):
        r, pcs = h.harmonia(t0 - s_desl(t0))
        acorde = no_intervalo(pcs, 55, 69)[:4]
        baixos = no_intervalo([r], 36, 47)
        b = baixos[0] if baixos else 40
        q = b + 7
        if ultimo:  # último compasso: um acorde só, deixado soar
            for i, p in enumerate(acorde): arr.nota(2, t0, 3.5, p, 70, jit=0, desvio=i * 0.02)
            arr.nota(3, t0, 3.5, b, 80, jit=0)
            return
        # violão: batida "pra baixo / pra cima"
        for (off, dur, desce, v) in [(0, 0.9, True, 66), (1, 0.4, True, 52), (1.5, 0.35, False, 44), (2.5, 0.35, False, 46), (3, 0.4, True, 54), (3.5, 0.35, False, 44)]:
            ordem = acorde if desce else list(reversed(acorde))
            for i, p in enumerate(ordem):
                arr.nota(2, t0 + off, dur, p, v + (6 if cheia else 0), jit=0.004, desvio=i * 0.011)
        # baixo saltitante
        for (off, dur, p, v) in [(0, 0.8, b, 80), (1.5, 0.4, b, 66), (2, 0.8, q, 74), (3, 0.45, b + 12, 64), (3.5, 0.4, q, 60)]:
            arr.nota(3, t0 + off, dur, p, v + (4 if cheia else 0), jit=0.004)
        # bateria
        for off in (0, 2):
            arr.nota(9, t0 + off, 0.2, BUMBO, 82 if cheia else 74, jit=0.003)
        arr.nota(9, t0 + 2.5, 0.2, BUMBO, 52, jit=0.003)
        for off in (1, 3):
            arr.nota(9, t0 + off, 0.2, CAIXA if cheia else ARO, 62 if cheia else 70, jit=0.004)
            if palmas or cheia: arr.nota(9, t0 + off, 0.2, PALMA, 64 if palmas else 50, jit=0.012)
        for k in range(8):
            arr.nota(9, t0 + k * 0.5, 0.2, CHIMBAL, 46 if k % 2 == 0 else 32, jit=0.005)
            if cheia: arr.nota(9, t0 + k * 0.5 + 0.25, 0.15, CHOCALHO, 30, jit=0.004)
        if cheia:
            for off in (0.5, 1.5, 2.5, 3.5): arr.nota(9, t0 + off, 0.2, PANDEIROLA, 40, jit=0.006)
        if fill:
            for i, (off, p) in enumerate([(3, TOM_A), (3.25, TOM_A), (3.5, TOM_M), (3.75, TOM_G)]):
                arr.nota(9, t0 + off, 0.2, p, 58 + i * 4, jit=0.003)

    desl = {}

    def s_desl(t):  # posição dentro da canção para pegar o acorde certo
        for (a, b), d in desl.items():
            if a <= t < b: return d
        return 0

    # introdução: 2 compassos de groove sobre os 2 últimos acordes da música, com virada
    desl[(0, 8)] = -(h.total - 8)
    compasso_groove(0, False)
    compasso_groove(4, False, fill=True)
    E1 = 8.0
    s["E1"], s["E2"] = E1, E1 + h.total
    s["FIM"] = s["E2"] + h.total
    s["intro_len"] = 8
    for k, E in enumerate((s["E1"], s["E2"])):
        cheia = k == 1
        desl[(E, E + h.total)] = E
        tocar_voz(arr, 0, h.mel, E, 88 if cheia else 82, h, E, frase, jit=0.006, legato=0.9)
        if cheia:
            tocar_voz(arr, 1, h.mel, E, 62, h, E, frase, transp=12, jit=0.006, legato=0.8)
            tocar_voz(arr, 4, h.mel, E, 44, h, E, frase, transp=12, jit=0.006, legato=0.85)
        nb = int(h.total // 4)
        for c in range(nb):
            ultimo = (k == 1 and c == nb - 1)
            compasso_groove(E + c * 4, cheia, fill=(c % 4 == 3 and not ultimo), ultimo=ultimo)
    # acorde final com prato
    fim = s["FIM"] - 4
    arr.nota(9, fim, 2, PRATO, 70, jit=0)
    arr.nota(9, fim, 0.3, BUMBO, 84, jit=0)
    estender_final(arr, s["FIM"], 1.5)
    rits = [(s["FIM"] - 4, s["FIM"], 0.25)]
    return arr, s, rits, 0.006


ARRANJOS = dict(caixinha=arranjo_caixinha, orgao=arranjo_orgao, piano=arranjo_piano, alegre=arranjo_alegre)


# ------------------------------------------------------------------ vinhetas e van de sorvete
def vinheta_midi(estilo):
    """Fundo musical da vinheta: um 'plim' com os instrumentos da estação e um acorde suave sob a voz."""
    arr = Arranjo()
    if estilo == "caixinha":
        arr.canal(0, GM["celesta"], vol=100, rev=60); arr.canal(1, GM["violao_nylon"], vol=80, rev=50)
        for i, p in enumerate([72, 76, 79, 84]): arr.nota(0, i * 0.5, 2.5, p, 78, jit=0)
        for i, p in enumerate([48, 55, 60, 64, 67, 72]): arr.nota(1, 2 + i * 0.25, 10 - i * 0.25, p, 40, jit=0)
        bpm = 132
    elif estilo == "orgao":
        arr.canal(0, GM["orgao_igreja"], vol=70, rev=85); arr.canal(1, GM["coro_aahs"], vol=80, rev=80)
        for p in (43, 55, 59, 62, 67): arr.nota(0, 0, 9, p, 80, jit=0)
        for p in (67, 71, 74): arr.nota(1, 0, 2.5, p, 70, jit=0)
        arr.cc(0, 0, 11, 110); arr.cc(0, 2.5, 11, 60)
        bpm = 100
    elif estilo == "piano":
        arr.canal(0, GM["piano"], vol=100, rev=60); arr.canal(1, GM["cordas_lentas"], vol=60, rev=80)
        arr.cc(0, 0, 64, 110)
        for i, p in enumerate([45, 52, 57, 60, 64, 69, 72, 76]): arr.nota(0, i * 0.33, 6, p, 64 - i, jit=0)
        for p in (57, 64, 69): arr.nota(1, 1, 8, p, 50, jit=0)
        bpm = 110
    else:
        arr.canal(0, GM["marimba"], vol=110, rev=40); arr.canal(1, GM["violao_nylon"], vol=80, rev=30); arr.canal(9, 0, vol=80)
        for i, p in enumerate([74, 79, 83, 86]): arr.nota(0, i * 0.5, 0.5, p, 84, jit=0)
        arr.nota(0, 2, 0.5, 91, 80, jit=0)
        for i, p in enumerate([55, 59, 62, 67]): arr.nota(1, 2 + i * 0.012 * 2.2, 0.6, p, 60, jit=0)
        arr.nota(9, 2, 0.3, BUMBO, 70, jit=0); arr.nota(9, 2, 0.3, PALMA, 60, jit=0); arr.nota(9, 2, 1.5, PRATO, 36, jit=0)
        for p in (55, 62, 67): arr.nota(1, 3, 6, p, 34, jit=0)
        bpm = 132
    return arr, bpm


MUSIQUINHA = [0, 1, 60, 1, 1, 64, 2, 1, 67, 3, 1, 64, 4, 2, 65, 6, 2, 62, 8, 1, 64, 9, 1, 67, 10, 1, 72, 11, 1, 67, 12, 4, 69,
              16, 1, 67, 17, 1, 65, 18, 1, 64, 19, 1, 62, 20, 4, 60]
MUSIQUINHA_ACORDES = [(0, "C"), (4, "F"), (6, "G"), (8, "C"), (12, "F"), (16, "G7"), (20, "C")]


def van_midi(voltas=3):
    """Musiquinha da van de sorvete (melodia original do jogo): caixinha de música + glockenspiel + pizzicato."""
    arr = Arranjo()
    arr.canal(0, GM["caixinha"], vol=110, rev=40)
    arr.canal(1, GM["glock"], vol=70, rev=40)
    arr.canal(2, GM["pizzicato"], vol=84, rev=30)
    arr.canal(3, GM["celesta"], vol=70, rev=40)
    mel = notas(MUSIQUINHA)
    for v in range(voltas):
        b = v * 24
        for (t, d, p) in mel:
            arr.nota(0, b + t, d * 0.9, p + 12, 84 + (6 if t % 4 == 0 else 0), jit=0.004)
            arr.nota(1, b + t, min(d, 1) * 0.5, p + 24, 46, jit=0.004)
        for i, (a, c) in enumerate(MUSIQUINHA_ACORDES):
            fim = MUSIQUINHA_ACORDES[i + 1][0] if i + 1 < len(MUSIQUINHA_ACORDES) else 24
            r, pcs = cifra(c)
            raiz = no_intervalo([r], 41, 52)[0]
            tons = no_intervalo(pcs, 60, 72)[:3]
            t = a
            while t < fim:
                arr.nota(2, b + t, 0.4, raiz if (t - a) % 2 == 0 else raiz + 7, 70, jit=0.004)
                for p in tons: arr.nota(3, b + t + 0.5, 0.35, p, 40, jit=0.004)
                t += 1
    return arr, 130


# ------------------------------------------------------------------ áudio
def rodar(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr[-3000:]); raise SystemExit(f"falhou: {' '.join(cmd[:3])} ...")
    return r


def renderizar(a, midi, raw, ganho=1.0):
    rodar([a.fluidsynth, "-ni", "-q", "-g", str(ganho), "-r", str(SR), "-F", raw, "-T", "raw", "-O", "s16", "-E", "little",
           "-o", "synth.reverb.active=1", "-o", "synth.reverb.room-size=0.55", "-o", "synth.reverb.damp=0.45",
           "-o", "synth.reverb.width=0.8", "-o", "synth.reverb.level=0.6",
           "-o", "synth.chorus.active=1", "-o", "synth.chorus.level=0.8", "-o", "synth.polyphony=512",
           a.sf2, midi])


def loud(a, entradas, filtro_pre, saida, alvo=-18.0, br="96k", extra_out=()):
    """2 passadas de loudnorm (EBU R128) e MP3 CBR."""
    base = [a.ffmpeg, "-hide_banner", "-nostats", "-y"] + entradas
    r = rodar(base + ["-filter_complex", f"{filtro_pre},loudnorm=I={alvo}:TP=-1.5:LRA=11:print_format=json[o]", "-map", "[o]", "-f", "null", "-"])
    txt = r.stderr
    js = json.loads(txt[txt.rindex("{"):txt.rindex("}") + 1])
    ln = (f"loudnorm=I={alvo}:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    rodar(base + ["-filter_complex", f"{filtro_pre},{ln},aresample={SR}[o]", "-map", "[o]", "-ac", "2", "-c:a", "libmp3lame",
                  "-b:a", br, "-id3v2_version", "0", *extra_out, saida])


def raw_in(raw):
    return ["-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", raw]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sf2", required=True)
    ap.add_argument("--fluidsynth", default=shutil.which("fluidsynth") or "fluidsynth")
    ap.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg")
    ap.add_argument("--so", default="", help="ids separados por vírgula (hinos, 'vinhetas', 'van')")
    ap.add_argument("--midi-dir", default="")
    ap.add_argument("--info", default="", help="grava JSON com tempos das seções")
    a = ap.parse_args()
    so = set(x for x in a.so.split(",") if x)
    hinos = ler_hinos()
    destino = os.path.join(RAIZ, "assets", "radio")
    tmp = tempfile.mkdtemp(prefix="radio-")
    info = {}
    semente = 7
    for est, estilo, ids in ESTACOES:
        os.makedirs(os.path.join(destino, est), exist_ok=True)
        for hid in ids:
            semente += 1
            if so and hid not in so: continue
            random.seed(semente)
            h = Hino(hid, hinos[hid])
            arr, s, rits, deriva = ARRANJOS[estilo](h)
            fim_b = max(n[1] + n[2] for n in arr.notas) + 8
            andam = Andamento(h.bpm, fim_b, rits, deriva=deriva, semente=semente)
            midi = os.path.join(a.midi_dir or tmp, f"{hid}.mid")
            dur = escrever_midi(arr, andam, midi)
            raw = os.path.join(tmp, f"{hid}.raw")
            renderizar(a, midi, raw)
            mp3 = os.path.join(destino, est, f"{hid}.mp3")
            # corta o silêncio do fim (cauda de reverb fica), afina graves e dá um fade curtinho
            loud(a, raw_in(raw), f"[0:a]atrim=0:{dur:.2f},highpass=f=35,afade=t=in:d=0.01,afade=t=out:st={dur - 1.2:.2f}:d=1.2", mp3)
            info[hid] = dict(estacao=est, segundos=round(dur, 1), estrofe1=round(andam.s(s["E1"]), 2), estrofe2=round(andam.s(s["E2"]), 2),
                             bytes=os.path.getsize(mp3), notas=len(arr.notas))
            print(f"{est}/{hid}.mp3  {dur:5.1f}s  {os.path.getsize(mp3) / 1e6:.2f} MB  ({len(arr.notas)} notas, compasso começa em {h.inicio_compasso})")
        if not so or "vinhetas" in so:
            for n, chave in enumerate([f"radio-{est}", f"radio-{est}-2"], start=1):
                random.seed(n)
                arr, bpm = vinheta_midi(estilo)
                andam = Andamento(bpm, 40, (), deriva=0)
                midi = os.path.join(tmp, f"vinheta-{est}-{n}.mid")
                escrever_midi(arr, andam, midi, cauda=0.5)
                raw = os.path.join(tmp, f"vinheta-{est}-{n}.raw")
                renderizar(a, midi, raw)
                voz = os.path.join(RAIZ, "assets", "voz", f"{chave}.mp3")
                r = subprocess.run([a.ffmpeg, "-hide_banner", "-i", voz], capture_output=True, text=True).stderr
                hms = r.split("Duration: ")[1].split(",")[0].split(":")
                dvoz = float(hms[0]) * 3600 + float(hms[1]) * 60 + float(hms[2])
                ini = 0.9 if estilo != "alegre" else 1.0
                total = ini + dvoz + 1.1
                pre = (f"[0:a]apad=whole_dur={total:.2f},atrim=0:{total:.2f},volume=0.55,afade=t=out:st={total - 0.8:.2f}:d=0.8[m];"
                       f"[1:a]aresample={SR},pan=stereo|c0=c0|c1=c0,volume=1.9,adelay={int(ini * 1000)}|{int(ini * 1000)}[v];"
                       f"[m][v]amix=inputs=2:normalize=0:duration=first")
                saida = os.path.join(destino, est, f"vinheta-{n}.mp3")
                loud(a, raw_in(raw) + ["-i", voz], pre, saida, alvo=-17.0)
                print(f"{est}/vinheta-{n}.mp3  {total:.1f}s  {os.path.getsize(saida) / 1e3:.0f} KB")
    if not so or "van" in so:
        os.makedirs(os.path.join(destino, "efeitos"), exist_ok=True)
        random.seed(3)
        arr, bpm = van_midi()
        andam = Andamento(bpm, 100, (), deriva=0)
        midi = os.path.join(tmp, "van.mid")
        escrever_midi(arr, andam, midi)
        raw = os.path.join(tmp, "van.raw")
        renderizar(a, midi, raw)
        volta = 24 * 60 / bpm
        # pega a 2ª volta (já carrega a cauda de reverb da 1ª): emenda sem costura quando tocada em loop
        saida = os.path.join(destino, "efeitos", "van-sorvete.mp3")
        loud(a, raw_in(raw), f"[0:a]atrim={volta:.5f}:{2 * volta:.5f},asetpts=PTS-STARTPTS,highpass=f=40", saida, alvo=-18.0)
        print(f"efeitos/van-sorvete.mp3  {volta:.2f}s  {os.path.getsize(saida) / 1e3:.0f} KB")
    if a.info:
        with open(a.info, "w") as f: json.dump(info, f, indent=1, ensure_ascii=False)
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
