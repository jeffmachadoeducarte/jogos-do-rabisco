# Servidor de salas (jogos-sala)

Relay WebSocket que deixa o celular virar controle do jogo lendo um QR code.
A sala só repassa mensagens entre a tela do jogo (host) e os celulares (controles); não guarda nada em disco nem registra conteúdo. O único dado em disco é o cadastro das famílias (seção abaixo). Protocolo: `.claude/tmp/protocolo-sala.md`.

## Rodar local

```
cd servidor && npm i && node sala.mjs
npm test   # node --test teste.mjs
```

## Variáveis

- `PORT`: porta (padrão 8090).
- `ORIGENS`: origens permitidas, separadas por vírgula (ex.: `https://jogos.educarte.qzz.io`). Vazio aceita todas, só para teste local.
- `DATA_DIR`: pasta do banco de cadastros (padrão `/data`). Se não for gravável, a sala funciona normalmente e `/cadastro` responde 503.
- `ADMIN_TOKEN`: senha das rotas `/admin/*` (use 32+ caracteres aleatórios). Vazio desliga as rotas (404).
- `TEMPO_ESCALA`: multiplica os tempos de expiração/ping (padrão 1); só para teste.

`GET /saude` responde `{"ok":true}` (sem contagem de salas).

Limites (em `LIMITES`, sala.mjs): 3 códigos errados por conexão (fecha com 1008); por IP: 40 palpites errados/10 min (depois bloqueia 10 min), 60 conexões simultâneas, 120 novas/min, 25 salas abertas, 100 criadas/10 min; teto global de 2000 conexões e 500 salas. O IP real vem do último valor de `X-Forwarded-For`, só quando a conexão chega de rede privada (proxy do EasyPanel).

## Publicação

App novo `jogos-sala` no EasyPanel, origem GitHub (mesmo repositório), build pela pasta `servidor/` (Dockerfile dela), porta 8090, domínio com WebSocket (wss). O site estático ignora esta pasta via `.dockerignore`.

## Cadastro das famílias (marketing e feedback, LGPD)

Arquivo `cadastro.mjs`; banco SQLite (`better-sqlite3`, binário pronto para Alpine) em `DATA_DIR/cadastros.sqlite`, permissão 600. Tabelas: `familias`, `criancas` e `auditoria` (só id, ação e data de quem foi apagado). O segredo da família fica só como hash scrypt com sal. Nada de dado pessoal vai para o log: só contagens e ids.

API (CORS só para `https://jogos.educarte.qzz.io` e `http://localhost`/`127.0.0.1`; Origin obrigatório):

- `POST /cadastro` (JSON, até 8 KB): `{id (UUID), segredo (32 a 128 caracteres), responsavel:{nome, telefone, email}, criancas:[{nome, nascimento AAAA-MM-DD}] (0 a 8), consentimento:{privacidade:true, versao, em}, marketing:{aceito, em}}`. Id novo cria; id existente só atualiza se o segredo bater (401 se não). Erros: 400 formato, 401 segredo, 403 origem, 413 tamanho, 429 ritmo, 503 sem disco.
- `DELETE /cadastro/:id` com header `X-Segredo`: apaga de verdade (`secure_delete`), registra só id e data.
- Limite por IP: 20 requisições a cada 10 min (`cadastrosPorJanela` em `LIMITES`), vale também para `/admin`.

### Exportar para o dono

Com `ADMIN_TOKEN` configurado:

```
curl -H "Authorization: Bearer SEU_ADMIN_TOKEN" -o cadastros.csv "https://sala.educarte.qzz.io/admin/cadastros.csv"
curl -H "Authorization: Bearer SEU_ADMIN_TOKEN" -o cadastros.csv "https://sala.educarte.qzz.io/admin/cadastros.csv?marketing=1"   # só quem aceitou novidades
curl -H "Authorization: Bearer SEU_ADMIN_TOKEN" "https://sala.educarte.qzz.io/admin/cadastros.json"
```

O CSV abre direto no Excel e no Google Planilhas (UTF-8 com BOM, separador `;`). Uma linha por criança, com os dados do responsável: responsável, telefone, e-mail, aceita novidades, criança, nascimento, idade, cadastrado em. Células que começam com `=`, `+`, `-` ou `@` ganham um `'` na frente (proteção contra fórmula). Para marketing, use só as linhas com "Sim" em "aceita novidades" (`?marketing=1`).

### Volume e backup (EasyPanel)

Monte um volume persistente no app `jogos-sala` com ponto de montagem `/data`. O container sobe como root só para acertar o dono da pasta e roda o servidor como usuário `node`. Backup: copie `cadastros.sqlite` do volume (o journal é o padrão do SQLite, então copie com o servidor parado ou use `sqlite3 cadastros.sqlite ".backup copia.sqlite"`).
