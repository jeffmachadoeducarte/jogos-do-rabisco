// Reescreve falas.json a partir de dados.js (o gerador de vozes em Python lê o JSON).
// Uso: node jogos/rabisco-e-a-arca/falas.mjs && python3 ferramentas/gerar_vozes.py
import { readFileSync, writeFileSync } from "node:fs";

// dados.js é módulo do navegador (sem package.json "type": "module"): importa pelo texto
const fonte = readFileSync(new URL("./dados.js", import.meta.url), "utf8");
const { FALAS_PT, FALAS_EN } = await import(`data:text/javascript,${encodeURIComponent(fonte)}`);
writeFileSync(new URL("./falas.json", import.meta.url), JSON.stringify({ pt: FALAS_PT, en: FALAS_EN }, null, 1) + "\n");
console.log(`${Object.keys(FALAS_PT).length} falas em português e ${Object.keys(FALAS_EN).length} em inglês`);
