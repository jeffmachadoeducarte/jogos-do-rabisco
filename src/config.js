// Configuração do portal. Fica fora do código dos jogos para o deploy só trocar este arquivo.
//
// WEBHOOK_FAMILIA: endereço que recebe o cadastro da família (POST JSON, sem a foto da criança).
// Vazio = o cadastro fica só neste aparelho (localStorage). Ex.: "https://n8n.educarte.qzz.io/webhook/familia".
export const WEBHOOK_FAMILIA = "";

// Versão do app: vai junto no envio do cadastro, para saber de qual versão veio.
export const VERSAO_APP = "2026.10.11";
