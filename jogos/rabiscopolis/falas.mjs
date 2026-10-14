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
};
// quadros de versículo da casa (paráfrases para crianças, com a referência em que se baseiam)
import { readFileSync } from "node:fs";
const fonteMoveis = readFileSync(new URL("./moveis.js", import.meta.url), "utf8");
const versos = [...fonteMoveis.matchAll(/\{ texto: "([^"]+)", ref: "([^"]+)" \}/g)];
versos.forEach(([, texto, ref], i) => { FALAS_PT[`rp-versiculo-${i + 1}`] = `${texto} ${ref.replace(/^baseado/, "Baseado")}.`; });
writeFileSync(new URL("./falas.json", import.meta.url), JSON.stringify({ pt: FALAS_PT }, null, 1) + "\n");
console.log(`${Object.keys(FALAS_PT).length} falas em português`);
