// Reescreve falas.json com as falas do Rabiscópolis (chaves rp-*), no padrão de jogos/rabisco-e-a-arca/falas.mjs.
// O gerador de vozes (ferramentas/gerar_vozes.py, "BLOCO Rabiscópolis") lê o falas.json.
// Uso: node jogos/rabiscopolis/falas.mjs && python3 ferramentas/gerar_vozes.py
import { writeFileSync } from "node:fs";

// rp-casa-pre + nome da criança + rp-casa-pos (falarNome); sem nome no banco, vale rp-casa inteira
export const FALAS_PT = {
  "rp-titulo": "Rabiscópolis! Vida na cidade com o Rabisco!",
  "rp-intro": "Que cidade grande! Escolha uma casa no Bairro das Casas e use o Rabifone para chamar um carro.",
  "rp-casa": "Agora esta é a sua casa! Que lar bonito!",
  "rp-casa-pre": "Agora esta é a casa de",
  "rp-casa-pos": "Que lar bonito!",
  "rp-carro": "Cinto afivelado! Para a frente acelera, para trás freia.",
  "rp-onibus": "Todos a bordo do ônibus da escola!",
  "rp-garagem": "Seu veículo chegou!",
  "rp-noite": "Boa noite! As janelas e os postes acenderam.",
  "rp-dia": "Bom dia, Rabiscópolis!",
};
writeFileSync(new URL("./falas.json", import.meta.url), JSON.stringify({ pt: FALAS_PT }, null, 1) + "\n");
console.log(`${Object.keys(FALAS_PT).length} falas em português`);
