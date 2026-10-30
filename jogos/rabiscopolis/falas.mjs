// Reescreve falas.json com as falas do Rabiscolândia (chaves rp-*), no padrão de jogos/rabisco-e-a-arca/falas.mjs.
// O gerador de vozes (ferramentas/gerar_vozes.py, "BLOCO Rabiscolândia") lê o falas.json.
// Uso: node jogos/rabiscopolis/falas.mjs && python3 ferramentas/gerar_vozes.py
import { writeFileSync } from "node:fs";

// rp-casa-pre + nome da criança + rp-casa-pos (falarNome); sem nome no banco, vale rp-casa inteira
export const FALAS_PT = {
  "rp-titulo": "Rabiscolândia! Vida na cidade com o Rabisco!",
  "rp-intro": "Que cidade grande! Escolha uma casa no Bairro das Casas e use o Rabifone para chamar um carro.",
  "rp-casa": "Agora esta é a sua casa! Que lar bonito!",
  "rp-casa-pre": "Agora esta é a casa de",
  "rp-casa-pos": "Que lar bonito!",
  "rp-carro": "Cinto afivelado! Para a frente acelera, para trás freia.",
  "rp-onibus": "Todos a bordo do ônibus da escola!",
  "rp-garagem": "Seu veículo chegou!",
  "rp-noite": "Boa noite! As janelas e os postes acenderam.",
  "rp-dia": "Bom dia, Rabiscolândia!",
  "rp-casa-entrar": "Que casa gostosa! Chegue perto de um círculo amarelo e aperte a ação para decorar.",
  "rp-casa-cor": "Casa pintadinha de cor nova!",
  "rp-casa-movel": "Ficou lindo!",
  "rp-heli": "Hélices girando! Para sair, pouse no chão.",
  "rp-heli-pousar": "Primeiro pouse o helicóptero: segure para descer até encostar no chão.",
  // Fatia 3: lugares por dentro e profissões
  "rp-lugar-entrar": "Bem-vindo! Vista o uniforme no armário e brinque com os objetos.",
  "rp-prof-medico": "Agora você é o médico! Vamos cuidar dos amigos.",
  "rp-prof-veterinario": "Agora você é o veterinário! Os bichinhos agradecem.",
  "rp-prof-professor": "Agora você é o professor! A turma está esperando.",
  "rp-prof-bombeiro": "Agora você é o bombeiro! Pronto para ajudar.",
  "rp-prof-padeiro": "Agora você é o padeiro! Hora de fazer pão quentinho.",
  "rp-prof-sorveteiro": "Agora você é o sorveteiro! Quem quer sorvete?",
  "rp-prof-caixa": "Agora você é o caixa do mercado!",
  "rp-prof-bibliotecario": "Agora você cuida da biblioteca! Shhh, hora de ler.",
  "rp-prof-coral": "Beca vestida! Vamos cantar no coral.",
  "rp-hosp-curativo": "Pronto! Um curativo e um abraço: ele já está melhor.",
  "rp-hosp-febre": "Trinta e seis graus e meio: tudo bem, sem febre!",
  "rp-hosp-coracao": "Tum-tum, tum-tum! Coração feliz.",
  "rp-vet-banho": "Banho de espuma! Ele ficou cheirosinho.",
  "rp-vet-petisco": "Au-au! Ele abanou o rabinho de alegria.",
  "rp-escola-roda": "Hora da roda! Todos juntinhos.",
  "rp-escola-recreio": "Recreio! Todo mundo brincando junto.",
  "rp-escola-lousa": "Muito bem, turma! Vamos ler juntos.",
  "rp-igreja-coral": "Vamos louvar a Deus cantando!",
  "rp-historia-1": "A ovelhinha perdida. Um pastor tinha cem ovelhas. Uma ovelhinha se perdeu! O pastor procurou até encontrar e voltou feliz, com ela no colo. Jesus cuida de cada um de nós assim. Baseado em Lucas 15.",
  "rp-historia-2": "Jesus e as crianças. Muitas crianças queriam ver Jesus. Alguns acharam que ele estava ocupado demais. Mas Jesus disse: deixem as crianças virem a mim! E abençoou cada uma. Baseado em Marcos 10.",
  "rp-historia-3": "O lanche repartido. Uma multidão estava com fome. Um menino ofereceu cinco pães e dois peixinhos. Jesus agradeceu a Deus e repartiu: todos comeram e ainda sobrou! Baseado em João 6.",
  "rp-sorvete-pedido": "Oi! Pode montar a minha casquinha?",
  "rp-sorvete-certo": "Hum! Do jeitinho que eu pedi. Obrigado!",
  "rp-sorvete-quase": "Quase! Vamos tentar de novo?",
  "rp-padaria-forno": "O pão está assando... que cheirinho bom!",
  "rp-padaria-obrigado": "Pão quentinho! Muito obrigado, vou dividir com a minha família.",
  "rp-bombeiro-uniforme": "Primeiro vista o uniforme de bombeiro no armário!",
  "rp-bombeiro-apagou": "Fogo de treino apagado! Bombeiro cuida de todo mundo.",
  "rp-mercado-caixa": "Bip, bip, bip! Obrigada pela compra.",
  "rp-livro-1": "O livro das cores. Vermelho como o morango, amarelo como o sol, azul como o céu e verde como a folha. Deus pintou o mundo com muitas cores!",
  // missões que vieram da Rabiscópolis (o resto reaproveita as falas cid-* já gravadas)
  "rp-bella-entrar": "Bem-vindo à Bella Cat! Chegue pertinho dos pedestais para ver os laços, colares e tiaras.",
  "rp-rise-entrar": "Bem-vindo à Academia Rise Up! Aqui a gente cuida do corpo que Deus nos deu.",
  "rp-corrida-pe": "A corrida é de carro! Chame um carro no Rabifone e passe por baixo da bandeira.",
  "rp-remedio-heli": "Que bom que você veio! Mas a doutora pediu para vir de helicóptero: pouse aqui pertinho.",
  // Mar Azul e Ilha da Alegria: jet ski, lancha e roda-gigante
  "rp-mar": "Partiu, Rabisco! Para a frente acelera, para trás freia. Encoste na areia, no píer ou na ilha para descer.",
  "rp-roda": "Segure firme, Rabisco! Lá de cima dá para ver a cidade inteira.",
  "rp-roda-fim": "Que passeio lindo! Deus fez um mundo muito bonito.",
  "rp-livro-2": "Os bichos da arca. O leão, a girafa, o elefante e o macaquinho entraram na arca de dois em dois. Noé cuidou de todos até a chuva passar.",
};
// quadros de versículo da casa (paráfrases para crianças, com a referência em que se baseiam)
import { readFileSync } from "node:fs";
const fonteMoveis = readFileSync(new URL("./moveis.js", import.meta.url), "utf8");
const versos = [...fonteMoveis.matchAll(/\{ texto: "([^"]+)", ref: "([^"]+)" \}/g)];
versos.forEach(([, texto, ref], i) => { FALAS_PT[`rp-versiculo-${i + 1}`] = `${texto} ${ref.replace(/^baseado/, "Baseado")}.`; });
// Fatia 5: missões (quem pede, quem recebe e, nas bíblicas, o versículo em paráfrase)
const { MISSOES } = await import(`data:text/javascript,${encodeURIComponent(readFileSync(new URL("./missoes-dados.js", import.meta.url), "utf8"))}`);
// (as missões que vieram da Rabiscópolis reaproveitam as falas gravadas cid-* quando o texto é o mesmo: voz.pedido/voz.fim)
for (const m of MISSOES) {
  if (!m.voz?.pedido) FALAS_PT[`rp-m-${m.id}-pedido`] = m.pedido;
  if (!m.voz?.fim) FALAS_PT[`rp-m-${m.id}-fim`] = m.fim;
  if (m.verso) FALAS_PT[`rp-m-${m.id}-verso`] = `${m.verso.texto} ${m.verso.ref.replace(/^baseado/, "Baseado")}.`;
  // falas das etapas com voz própria (rp-*): o texto que aparece no balão é o mesmo que a voz fala
  const PARES = [["fala", "voz"], ["falaTodos", "vozTodos"], ["carregou", "vozCarregou"], ["aPe", "vozAPe"], ["errado", "vozErrado"], ["falaCarona", "vozCarona"], ["achou", "vozAchou"], ["falaPortao", "vozPortao"], ["erro", "vozErro"]];
  for (const E of m.etapas) {
    for (const [txt, voz] of PARES) if (E[txt] && E[voz]?.startsWith("rp-")) FALAS_PT[E[voz]] = E[txt];
    for (const q of E.pistas ?? []) if (q.texto && q.voz?.startsWith("rp-")) FALAS_PT[q.voz] = q.texto;
  }
}
writeFileSync(new URL("./falas.json", import.meta.url), JSON.stringify({ pt: FALAS_PT }, null, 1) + "\n");
console.log(`${Object.keys(FALAS_PT).length} falas em português`);
