// Rabiscolândia: o que a criança guarda neste aparelho (localStorage "rabisco.rabiscopolis.v1"). Nada vai para a rede.
//   { casa: número do lote ou null, corCasa (cor das paredes, 0xRRGGBB), moveis: { [casa]: { [ponto]: { id, cor, variante } } }, roupas: [], pet: null, selos: [], missoesFeitas: [],
//     nomeRabisco: "" (nome na plaquinha quando não há cadastro da família, até 12 letras) }

const CHAVE = "rabisco.rabiscopolis.v1";
const VAZIO = () => ({ casa: null, corCasa: null, moveis: {}, roupas: [], pet: null, selos: [], missoesFeitas: [], nomeRabisco: "" });

export function carregar() {
  try { return { ...VAZIO(), ...(JSON.parse(localStorage.getItem(CHAVE)) || {}) }; } catch { return VAZIO(); }
}
export function salvar(dados) {
  try { localStorage.setItem(CHAVE, JSON.stringify(dados)); return true; } catch { return false; }
}
export function apagar() { try { localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ } }
export { CHAVE };
