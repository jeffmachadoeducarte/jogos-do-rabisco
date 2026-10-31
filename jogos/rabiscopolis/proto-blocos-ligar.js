// Protótipo visual "estilo de blocos" (só para gerar imagens de antes e depois). Este arquivo é o primeiro import do
// jogo.js: com ?estilo=blocos na URL ele liga a marca window.__blocos, que os ganchos em base3d.js, casas.js,
// carros.js e personagens.js consultam. Sem o parâmetro nada acontece e o jogo é o de sempre.
// O resto do protótipo mora em proto-blocos.js (carregado só com o parâmetro).
if (new URLSearchParams(location.search).get("estilo") === "blocos") window.__blocos = { ligado: true };
