# Rádio do carro — créditos e licenças

As faixas desta pasta são **arranjos instrumentais feitos pela Educarte** e renderizados por
`ferramentas/radio/gerar_radio.py` (MIDI → FluidSynth → MP3). Nenhuma gravação de terceiros é usada.

## Melodias e harmonias

Hinos em **domínio público**: compositores falecidos há mais de 70 anos e melodias publicadas antes de 1929.
As vozes (soprano, contralto, tenor, baixo) vêm das edições antigas reunidas pelo **Open Hymnal**
(coletânea de domínio público).

| Estação | Faixa | Hino | Autor / origem | Ano |
|---|---|---|---|---|
| Rádio Jesus Me Ama | `jesus-me-ama/jesus-me-ama.mp3` | Cristo Me Ama (Jesus Loves Me) | William B. Bradbury (1816–1868) | 1862 |
| Rádio Jesus Me Ama | `jesus-me-ama/manjedoura.mp3` | Lá na Manjedoura (Away in a Manger, melodia Mueller) | James R. Murray (1841–1905) | 1887 |
| Rádio Jesus Me Ama | `jesus-me-ama/formoso-jesus.mp3` | Formoso Jesus (melodia Crusaders' Hymn) | canção folclórica da Silésia; harmonia Richard S. Willis (1819–1900) | 1842 |
| Rádio Hinos de Fé | `hinos-de-fe/castelo-forte.mp3` | Castelo Forte (Ein feste Burg) | Martinho Lutero (1483–1546) | 1529 |
| Rádio Hinos de Fé | `hinos-de-fe/santo-santo-santo.mp3` | Santo, Santo, Santo (melodia Nicaea) | John B. Dykes (1823–1876) | 1861 |
| Rádio Hinos de Fé | `hinos-de-fe/doxologia.mp3` | Doxologia (Old Hundredth) | Louis Bourgeois (c.1510–c.1560) | 1551 |
| Rádio Paz | `paz/sou-feliz.mp3` | Sou Feliz com Jesus (melodia Ville du Havre) | Philip P. Bliss (1838–1876) | 1876 |
| Rádio Paz | `paz/que-amigo.mp3` | Que Amigo em Cristo Temos | Charles C. Converse (1832–1918) | 1868 |
| Rádio Paz | `paz/mais-perto.mp3` | Mais Perto Quero Estar (melodia Bethany) | Lowell Mason (1792–1872) | 1856 |
| Rádio Paz | `paz/graca.mp3` | Maravilhosa Graça (melodia New Britain) | melodia tradicional americana; harmonia Edwin O. Excell (1851–1921) | 1829 |
| Rádio Alegria | `alegria/pulando.mp3` | Pulando de Alegria | composição própria (Educarte) | 2026 |
| Rádio Alegria | `alegria/bom-dia-sol.mp3` | Bom Dia, Sol! | composição própria (Educarte) | 2026 |
| Rádio Alegria | `alegria/palminhas.mp3` | Palminhas | composição própria (Educarte) | 2026 |
| — | `efeitos/van-sorvete.mp3` | musiquinha da van de sorvete (loop) | composição própria (Educarte) | 2026 |

Vinhetas (`<estação>/vinheta-1.mp3`, `vinheta-2.mp3`): fundo musical próprio + a voz da anfitriã de
`assets/voz/radio-*.mp3` (voz sintetizada “Francisca”, gerada por `ferramentas/gerar_vozes.py`).

## Instrumentos (SoundFont)

**GeneralUser GS v2.0.3** — S. Christian Collins — <https://github.com/mrbumpy409/GeneralUser-GS>
(site: <https://schristiancollins.com/generaluser.php>).

Licença (GeneralUser GS License v2.0, trecho): *“You may use GeneralUser GS without restriction for your own
music creation, private or commercial. […] GeneralUser GS inherits the usage rights of the samples contained
within, all of which allow full use in music production, including the ability to make profit from musical
recordings created with GeneralUser GS.”*

O arquivo `.sf2` **não** faz parte do repositório nem do site: só as gravações (MP3) feitas com ele.

## Ferramentas

- **FluidSynth 2.6.1** (LGPL-2.1) — sintetizador de SoundFont usado só para renderizar; não é distribuído.
- **FFmpeg 7.1** com LAME — reverb do FluidSynth, normalização de loudness EBU R128 (−18 LUFS, pico ≤ −1,5 dBTP)
  e codificação MP3 96 kbps estéreo, 44,1 kHz.
