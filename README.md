# Jogos do Rabisco

Portal de jogos pedagógicos da Educarte Escola Cristã, com o Rabisco como mascote.

## Como rodar

Site estático, sem build. Na pasta do projeto:

```sh
python3 -m http.server 8080
```

E abra http://localhost:8080

## Publicação

Fica no app `educarte/jogos` do EasyPanel (VPS da Educarte), que puxa o branch `main` deste repositório e
monta o `Dockerfile` (nginx). Para publicar: commit, `git push` e `~/.config/educarte/deploy jogos`.
A pasta `referencias/` não vai para o repositório.

## Estrutura

```
index.html              portal (cards por idade)
src/catalogo.js         faixas etárias e lista de jogos (edite aqui)
src/app.js, style.css   telas e visual do portal
src/motor3d/            base 3D de todos os jogos (Three.js)
  rabisco3d.js          Rabisco 3D com articulações: parado, andar, pular, comemorar, dirigir
  toon.js               visual de desenho animado (tons chapados + contorno preto)
  objetos.js            escola, ônibus, lápis gigantes, karts, blocos "?", borrachas, livros...
src/motor/              jogos 2D (Phaser), som e voz
  rabisco.js            Rabisco 2D animado (anda, corre, pula) com as peças do rig oficial
  cenario_mario.js      cenário estilo Mario: tijolos, blocos "?", canos, morros, mastro, castelo-escola
  cenario.js            borracha, bolha de letra, ônibus e efeitos
  sons.js               efeitos e músicas no estilo 8-bit (gerados na hora)
  voz.js                toca as falas gravadas de assets/voz
assets/rabisco/poses/   poses oficiais (frente, apresentando, costas, lado)
assets/rabisco/rig/     vista lateral recortada em peças para animar
assets/marca/logos/     todas as versões da logo
assets/voz/             falas do jogo em MP3
vendor/                 Phaser 3.80 (jogos 2D) e Three.js 0.160 (Kart), locais para funcionar sem internet
ferramentas/            scripts que geram o rig e as vozes
jogos/<id>/             cada jogo numa pasta própria
referencias/            Character Bible, drive ilustrado, amostras de voz
```

## Motores comuns (src/motor)

```
casca.js, casca.css    jogos 2D: abertura com níveis, topo (sair, placar, som), pausa, vitória, controle, teclado e celular
controle.js            gamepad (Xbox, PlayStation, Switch, genérico): ligarControle() para os jogos, navegação por direcional nos menus
celular.js             toque, tela cheia e aviso "gire o celular" nos jogos que pedem tela deitada
colorir.js, desenhos.js, pintura.js, colorir.css   desenhos SVG para colorir (Toca e Pinta, Colorir Mágico, Ateliê, Pinte pelos Números)
camarim.js, vestir.js, camarim.css                 roupas em SVG sobre o Rabisco de frente (jogos de vestir)
```

Jogos que são variações de outro: as pastas só redirecionam com `?modo=`.

- Rabisco Kart (`jogos/rabisco-kart/modos.js`): contas, cores (Kart das Cores), onibus (Corrida do Ônibus), ingles-jr, gp, ingles
- Super Rabisco (`jogos/super-rabisco-letras/modos.js`): letras, silabas (Super Rabisco), mini (Super Rabisco Mini), ciencias (Super Rabisco 2)

Rabisco e as Cores da Criação (`jogos/cores-da-criacao`): aventura 3D; `cores.js` faz o mundo a lápis ganhar cor perto do
Rabisco e `jardim.js` monta a primeira página. Para uma página nova, crie outro arquivo como `jardim.js`.

Testar: `?jogar` (ou `?nivel=2`) começa direto; `?teste` expõe `window.teste` nos jogos. Laboratório de roupas: `jogos/laboratorio/camarim.html`.
As falas novas ficam em `ferramentas/gerar_vozes.py` (voz em português e, para os jogos de inglês, `falas_en`).

## Princípio dos jogos

O jogo é divertido primeiro, e o conteúdo fica na mecânica: as moedas são letras, o turbo
vem da conta certa. Nada de tela de prova. Quatro jogos principais aparecem em todas as
idades, ficando mais difíceis conforme a faixa:

- **Super Rabisco**: plataforma no estilo Mario
- **Rabisco Kart**: corrida no estilo Mario Kart
- **Ateliê**: colorir
- **Camarim**: vestir o Rabisco

## Qual logo usar

| Fundo | Arquivo |
|---|---|
| Claro / branco | `azul-icone-rosa.png` (principal) |
| Azul, rosa ou foto | `branco.png` ou `branco-icone-rosa.png` |
| Só o símbolo | `icone-rosa.png`, `icone-azul.png`, `icone-branco.png` |

Nunca usar a versão de texto branco em fundo claro.

## Voz

As falas são MP3 em `assets/voz`, com voz feminina neural brasileira (Francisca). Para regerar:

```sh
pip install edge-tts
python3 ferramentas/gerar_vozes.py --refazer
```

Não use a voz "Thalita Multilingual": em letras soltas e soletrações ela troca para o inglês
("Letra S" virava "Let's dress"). Depois de gerar, vale conferir as letras com um reconhecedor
de fala (foi assim que a letra M foi corrigida para "éme").

Também dá para gravar uma professora: basta substituir os MP3 mantendo os mesmos nomes.

## Rabisco 3D (referência oficial para todos os jogos)

Aprovado pelo Jefferson em 08/10/2026. Todos os jogos 3D usam `src/motor3d/rabisco3d.js`:

```js
import { Rabisco3D } from "../../src/motor3d/rabisco3d.js";
const rabisco = new Rabisco3D({ raiz: "../..", altura: 2.4 });
cena.add(rabisco.grupo);
rabisco.atualizar(dt, { modo: "andar", vel, vmax }); // parado | andar | pular | comemorar | dirigir | comemorarSentado
```

- Corpo medido nas vistas oficiais (frente, lado e costas, mesma escala), camiseta azul lisa.
- Rosto em relevo: olhos saltados com aro fino, íris, pupila e brilho; sobrancelhas em alto-relevo;
  boca com profundidade (dentes e língua). Medidas em `assets/rabisco/3d/rosto3d.json`
  (`ferramentas/rabisco3d_rosto.py`).
- Logo oficial no peito com leve relevo; mochila toda laranja com detalhes em contorno preto;
  alças em laço pelo ombro; mãos com 4 dedos e polegar; fones com haste pela nuca.
- No pulo, quem sobe é o braço esquerdo (do lado direito fica a aba do boné).
- Para conferir de todos os ângulos: `jogos/laboratorio/rabisco3d.html?vistas`.

## Regras do mascote (Character Bible)

- Usar sempre os assets oficiais do Rabisco. Não redesenhar nem gerar por IA.
- Logo Educarte só pelo arquivo oficial.
- Paleta: ciano `#00B5F0`, rosa `#EC2E8C`, laranja `#FF7A00`, pele `#FCE3C6`.
