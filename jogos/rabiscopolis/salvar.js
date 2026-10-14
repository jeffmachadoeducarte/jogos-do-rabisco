// Rabiscolândia: o que a criança guarda neste aparelho (localStorage "rabisco.rabiscopolis.v1"). Nada vai para a rede.
//   { casa: número do lote ou null, corCasa, moveis: [], roupas: [], pet: null, selos: [], missoesFeitas: [] }

const CHAVE = "rabisco.rabiscopolis.v1";
const VAZIO = () => ({ casa: null, corCasa: null, moveis: [], roupas: [], pet: null, selos: [], missoesFeitas: [] });

export function carregar() {
  try { return { ...VAZIO(), ...(JSON.parse(localStorage.getItem(CHAVE)) || {}) }; } catch { return VAZIO(); }
}
export function salvar(dados) {
  try { localStorage.setItem(CHAVE, JSON.stringify(dados)); return true; } catch { return false; }
}
export function apagar() { try { localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ } }
export { CHAVE };
