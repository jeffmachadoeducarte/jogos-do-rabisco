// Rabiscolândia: o que a criança guarda neste aparelho (chave "rabisco.rabiscopolis.v1" do PERFIL ativo, via
// src/motor/perfis.js: cada jogador da família tem a sua cidade). Nada vai para a rede.
//   { casa: número do lote ou null, corCasa (cor das paredes, 0xRRGGBB), moveis: { [casa]: { [ponto]: { id, cor, variante } } }, roupas: [], pet: null, selos: [], missoesFeitas: [],
//     nomeRabisco: "" (nome na plaquinha quando não há cadastro da família, até 12 letras),
//     meuRabisco: { mochila, fone, sapatos, calca, oculos } (id da peça escolhida na tela Meu Rabisco; o que falta é o original),
//     diario: { bau, seq, maior, aviso, extra, md } (Presente do dia e Missão do dia: veja diario.js) }

import { armazem } from "../../src/motor/perfis.js";

const CHAVE = "rabisco.rabiscopolis.v1";
const VAZIO = () => ({ casa: null, corCasa: null, moveis: {}, roupas: [], pet: null, selos: [], missoesFeitas: [], nomeRabisco: "", meuRabisco: {} });

export function carregar() {
  try { return { ...VAZIO(), ...(JSON.parse(armazem.getItem(CHAVE)) || {}) }; } catch { return VAZIO(); }
}
export function salvar(dados) {
  try { armazem.setItem(CHAVE, JSON.stringify(dados)); return true; } catch { return false; }
}
export function apagar() { try { armazem.removeItem(CHAVE); } catch { /* sem armazenamento */ } }
export { CHAVE };
