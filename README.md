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
src/config.js           WEBHOOK_FAMILIA (envio do cadastro) e versão do app
src/motor3d/            base 3D de todos os jogos (Three.js)
  rabisco3d.js          Rabisco 3D com articulações: parado, andar, pular, comemorar, dirigir
  toon.js               visual de desenho animado (tons chapados + contorno preto)
  objetos.js            escola, ônibus, lápis gigantes, karts, blocos "?", borrachas, livros...
  companheiro3d.js      a criança cadastrada como personagem 3D no estilo do Rabisco (foto no rosto)
src/motor/              jogos 2D (Phaser), som e voz
  rabisco.js            Rabisco 2D animado (anda, corre, pula) com as peças do rig oficial
  cenario_mario.js      cenário estilo Mario: tijolos, blocos "?", canos, morros, mastro, castelo-escola
  cenario.js            borracha, bolha de letra, ônibus e efeitos
  sons.js               efeitos e músicas no estilo 8-bit (gerados na hora)
  voz.js                falas gravadas de assets/voz e a narradora com o nome da criança (speechSynthesis)
  familia.js, familia.css  cadastro da família (responsável e criança) e API Familia
  companheiro.js        a criança como bonequinho 2D (canvas)
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

Fases: Rabisco Kart tem 10 pistas (`jogos/rabisco-kart/pistas.js`, `?pista=N`), Super Rabisco tem 10 fases
(`jogos/super-rabisco-letras/fases.js`, `?fase=N`, geradas com semente), Cores da Criação tem 10 páginas
(`jogos/cores-da-criacao/paginas.js`) e os jogos dos bebês têm 10 fases cada.

Cidade do Rabisco (`jogos/cidade-do-rabisco`): mundo livre 3D com visual mais realista (materiais PBR); `cidade.js`
monta ruas, semáforos e lugares, `jogo.js` cuida do trânsito, moradores e missões. `src/motor/joystick.js` é o
joystick dinâmico dos jogos 3D de andar livre.

App instalável (PWA): `manifest.webmanifest`, `sw.js` (funciona sem internet) e `src/motor/instalar.js` (pede para
instalar ao entrar no portal). Ícones: `ferramentas/icones_app.py`.

Testes automáticos (Chrome sem janela, controle e toque simulados): `node --experimental-websocket ferramentas/teste/todos.mjs`.

Testar: `?jogar` (ou `?nivel=2`) começa direto; `?teste` expõe `window.teste` nos jogos. Laboratório de roupas: `jogos/laboratorio/camarim.html`.
As falas novas ficam em `ferramentas/gerar_vozes.py` (voz em português e, para os jogos de inglês, `falas_en`).

## Família e criança no jogo

Antes do primeiro jogo em cada aparelho, o portal pede um cadastro curto (`src/motor/familia.js` + `familia.css`):
responsável (nome, e-mail ou WhatsApp, cidade/UF) e criança (nome, nascimento, menina/menino e foto, todos opcionais
menos o nome). O botão "Família" no topo do portal abre o mesmo cadastro para editar. `index.html?cadastro` abre
o cadastro na hora (testes); `?semcadastro` pula o gate.

- **Guardado no aparelho** (`localStorage`, chave `rabisco.familia`): tudo, inclusive a foto da criança (recorte
  quadrado centralizado, 256 px, JPEG em dataURL). A foto nunca sai do aparelho.
- **Enviado** (só se `WEBHOOK_FAMILIA` em `src/config.js` estiver preenchido): POST JSON sem a foto, com
  `origem: "jogos-do-rabisco"`, `versao` (VERSAO_APP), `timestamp`, `userAgent` resumido, `responsavel`, `crianca`
  (nome, nascimento, genero, temFoto) e `consentimento` (caixa LGPD "quero receber novidades"). Sem internet, o
  envio fica numa fila (`rabisco.familia.fila`) e tenta de novo ao voltar a conexão ou na próxima abertura.
- **Configurar o envio**: edite `src/config.js` e coloque a URL do webhook (ex.: um fluxo do n8n).
- **Nos jogos**: `import { Familia } from "../../src/motor/familia.js"` (ou `window.Familia`):
  `Familia.crianca()` → `{ nome, nascimento, idade, genero, foto }` ou `null`; `temFoto()`, `completo()`, `aoMudar(cb)`.

Voz: a Francisca é a **narradora/anfitriã** (ela não "é" o Rabisco) e **toda fala é pré-gravada com ela**: nenhum
caminho do código usa a voz do navegador (speechSynthesis). Para chamar a criança pelo nome há um banco de nomes
gravados em `assets/voz/nomes/<nome-sem-acento>.mp3` ("Alice!", "maria-clara.mp3"...). `saudar()` e `parabenizar()`
(`src/motor/voz.js`) tocam frases em partes emendadas sem intervalo via Web Audio: `par-pre-1` ("Parabéns,") +
`nomes/alice` + `par-pos-1` ("Você mandou muito bem!"). O nome vem sempre no fim da primeira parte, onde a emenda soa
natural. Só o MP3 do nome cadastrado é baixado (`audioDoNome`, HEAD + fetch). Se o nome/apelido não estiver no banco,
tocam as frases neutras inteiras `saudacao-1..3` / `parabens-1..3`; o cadastro avisa ("A narradora vai te chamar de
Alice!") quando o nome existe. Crianças com menos de 4 anos ouvem frases mais curtas; uma em cada três frases tem um
toque leve de fé ("Deus abençoe a sua aventura!"). A casca (`casca.js`) já chama `saudar()` ao começar e `parabenizar()`
em `jogo.vencer()`, então todos os jogos da casca ganham isso sem edição. Jogos com laço próprio (Kart) chamam
`saudar()`/`parabenizar()`/`falarNome("cor-pre", "cor-pos")` nos seus próprios ganchos.

Para acrescentar nomes: inclua na lista `NOMES` de `ferramentas/gerar_vozes.py` e rode
`python3 ferramentas/gerar_vozes.py --nomes` (gera só o que falta; ~420 nomes já gravados). Nomes compostos
(Maria Clara, João Pedro) viram `maria-clara.mp3`; o jogo tenta o composto e depois o primeiro nome.

Companheiro: a criança aparece dentro do jogo.
- 3D: `criarCompanheiro3D({ raiz, altura, cracha })` em `src/motor3d/companheiro3d.js` devolve `null` sem cadastro,
  senão um personagem no estilo do Rabisco (lápis verde, short roxo, boné amarelo com laço; com foto, o rosto é a
  foto em círculo). Mesma API de animação do `Rabisco3D` (`atualizar(dt, { modo, vel, vmax })`) e `bracos()` para
  poses próprias. Usado no Rabisco Kart (kart de dois lugares: `jogos/rabisco-kart/jogo.js`, e por tabela Kart GP,
  Kart das Cores e os outros modos) e na Cidade do Rabisco (a criança segue o Rabisco e comenta os lugares).
- 2D: `criarCompanheiro()` em `src/motor/companheiro.js` → `desenhar(ctx, x, y, escala, { passo, virado, nome })`.

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
