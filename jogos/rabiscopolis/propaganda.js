// Rabiscolândia: a propaganda de cada empresa parceira (dados puros: falas.mjs e o teste leem este arquivo no node).
// Ao concluir uma missão com `parceiro: "<id>"`, depois da fala de fim (e do versículo, se houver), a anfitriã toca a voz
// rp-prop-<id> e o balão mostra o texto, o nome e o @, esses dois lidos de PARCEIROS (src/parceiros.js): missoes.js cuida disso.
//  - texto: o que aparece escrito no balão ("" = só o nome e o @: a Crescente já agradece na fala de fim da missão)
//  - falado: como a voz diz o mesmo texto, só quando a escrita normal sai errada no TTS (sem ele, vale o texto)
//  - arroba: o @ escrito para a voz, com "ponto", "underline" e separado em palavras, para ela não soletrar
// Trocou um texto? Apague o MP3 e gere de novo: node jogos/rabiscopolis/falas.mjs && python3 ferramentas/gerar_vozes.py
// (para não pegar a cópia antiga guardada no aparelho, melhor dar um id/nome de arquivo novo).
export const PROPAGANDA = {
  "je-multimarcas": { texto: "Conheça a J.E Multimarcas, loja de carros!", arroba: "arroba J.E Multimarcas Itajaí" },
  "bella-cat": { texto: "Conheça a Bella Cat, de make e biju!", falado: "Conheça a Bella Cat, de mêique e biju!", arroba: "arroba Bella Cat underline Itajaí" },
  "rise-up": { texto: "Academia Rise Up, em Navegantes: treino, saúde e bem-estar. Saúde para viver mais e viver melhor!", arroba: "arroba academia Rise Up" },
  "crescente-contabilidade": { texto: "", arroba: "arroba contabilidade crescente" },
  "gala-presentes": { texto: "Gala Presentes: cestas e buquês em Itajaí e região, com entrega rápida!", arroba: "arroba gala ponto presentes" },
  "see-love-joias": { texto: "See Love Semijoias: semijoias e acessórios.", arroba: "arroba See Love semijoias" },
  "bella-company": { texto: "Bella Company: uniformes escolares do berçário ao ensino médio, em Itajaí. Feito com cuidado. Para quem importa.", arroba: "arroba somos Bella Company" },
  "marlon-maquinas": { texto: "Marlon Máquinas, especialista em máquinas para reciclagem.", arroba: "arroba marlon máquinas" },
  "cafe-com-deus-pai-kids": { texto: "Café com Deus Pai Kids: devocional para crianças.", arroba: "arroba café com Deus Pai" },
  "ballet-e-cia": { texto: "Ballet e Cia: ballet e jazz, com a Professora Samira. Em cada passo, aprendendo e crescendo juntos.", arroba: "arroba ballet e cia Itajaí" },
  "bt-models": { texto: "BT Models: agência de campanhas publicitárias e desfiles, em Balneário Camboriú.", arroba: "arroba BT Models ponto agency" },
  "speedy-solucoes": { texto: "Speedy Soluções: box, esquadrias e vidros temperados. Reflexos de excelência a cada instalação.", falado: "Speedy Soluções: bóx, esquadrias e vidros temperados. Reflexos de excelência a cada instalação.", arroba: "arroba Speedy soluções ponto S C" },
  construrenova: { texto: "Construrenova, locação e venda de máquinas para construção.", arroba: "arroba constru ponto renova" },
};
// o texto da voz rp-prop-<id>
export const falaDaPropaganda = (id) => { const P = PROPAGANDA[id]; return `${P.falado ?? P.texto} No Instagram: ${P.arroba}.`.trim(); };
