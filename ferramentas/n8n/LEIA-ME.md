# Cadastro da família -> Planilha Google (n8n)

O site envia o cadastro para o n8n, e o n8n grava uma linha na planilha. Uma linha por criança; se a família se cadastrar de novo, a linha é atualizada (não duplica).

## Passo a passo

1. **Criar a planilha.** No Google Planilhas: Arquivo > Importar > Fazer upload de `planilha-cabecalho.csv` > "Substituir planilha". Dê um nome (ex.: "Famílias - Jogos do Rabisco").
2. **Importar o fluxo.** No n8n: Workflows > Import from File > escolha `cadastro-familia.json`.
3. **Conectar o Google.** Abra o nó "Gravar na planilha", em *Credential* clique em "Create new credential" e entre com a conta Google.
4. **Escolher planilha e aba.** No mesmo nó, escolha a planilha criada em *Document* e a aba em *Sheet*. Confira que a coluna de correspondência é `chave`.
5. **Ativar o fluxo** (botão *Active*, canto superior direito). Só funciona de verdade depois de ativado.
6. **Copiar a "Production URL"** do nó Webhook (termina em `/webhook/jogos-rabisco-familia`, **não** a "Test URL") e mandar para o orquestrador, que coloca no site.

## Testar

Troque `SUA_URL` pela Production URL (dados fictícios):

```
curl -i -X POST "SUA_URL" -H "Content-Type: application/json" -d '{"origem":"jogos-do-rabisco","versao":"2026.10.11","timestamp":"2026-10-11T22:00:00.000Z","userAgent":"teste","responsavel":{"nome":"Ana Teste","email":"ana@exemplo.com","whatsapp":"(47) 99999-9999","cidade":"Itajaí","uf":"SC"},"crianca":{"nome":"Alice Teste","nascimento":"2020-03-15","genero":"menina","temFoto":true},"consentimento":{"novidades":true,"em":"2026-10-11T21:59:00.000Z"}}'
```

Deve responder `200` com `{"ok":true}` e aparecer uma linha na planilha. Rodando de novo, a linha é atualizada. Sem o nome da criança deve responder `400`. Depois do teste, apague a linha de teste.

## Observações

- **primeiro_cadastro_em**: o nó do Google não grava "só na criação", então essa coluna fica vazia (não mexe nela). Se quiser, preencha por fórmula/manual.
- **Erros**: dados inválidos = `400` (o site descarta). Falha do Google = `500` (o site tenta de novo mais tarde).
- **CORS**: o fluxo aceita apenas o site `https://educarte-jogos.zz51dl.easypanel.host` e `http://localhost:8080`. Se o endereço do site mudar, edite *Allowed Origins* no nó Webhook e o cabeçalho nos nós "Responder".
- **LGPD**: a foto da criança **nunca** é enviada (só `tem_foto` = sim/nao); qualquer campo grande é recusado. Quem tem `aceita_novidades` = **nao** **não pode** receber ofertas/novidades: filtre a coluna antes de qualquer envio. Use os dados só para o fim informado e apague a pedido da família.
