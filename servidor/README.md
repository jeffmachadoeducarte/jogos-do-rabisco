# Servidor de salas (jogos-sala)

Relay WebSocket que deixa o celular virar controle do jogo lendo um QR code.
Só repassa mensagens entre a tela do jogo (host) e os celulares (controles); não guarda nada em disco nem registra conteúdo. Protocolo: `.claude/tmp/protocolo-sala.md`.

## Rodar local

```
cd servidor && npm i && node sala.mjs
npm test   # node --test teste.mjs
```

## Variáveis

- `PORT`: porta (padrão 8090).
- `ORIGENS`: origens permitidas, separadas por vírgula (ex.: `https://jogos.educarte.qzz.io`). Vazio aceita todas, só para teste local.
- `TEMPO_ESCALA`: multiplica os tempos de expiração/ping (padrão 1); só para teste.

`GET /saude` responde `{"ok":true}` (sem contagem de salas).

Limites (em `LIMITES`, sala.mjs): 3 códigos errados por conexão (fecha com 1008); por IP: 40 palpites errados/10 min (depois bloqueia 10 min), 60 conexões simultâneas, 120 novas/min, 25 salas abertas, 100 criadas/10 min; teto global de 2000 conexões e 500 salas. O IP real vem do último valor de `X-Forwarded-For`, só quando a conexão chega de rede privada (proxy do EasyPanel).

## Publicação

App novo `jogos-sala` no EasyPanel, origem GitHub (mesmo repositório), build pela pasta `servidor/` (Dockerfile dela), porta 8090, domínio com WebSocket (wss). O site estático ignora esta pasta via `.dockerignore`.
