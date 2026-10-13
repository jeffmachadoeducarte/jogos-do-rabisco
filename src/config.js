// Configuração do portal. Fica fora do código dos jogos para o deploy só trocar este arquivo.
//
// WEBHOOK_FAMILIA: endereço que recebe o cadastro da família (POST JSON, sem a foto da criança).
// Vazio = o cadastro fica só neste aparelho (localStorage). Ex.: "https://n8n.educarte.qzz.io/webhook/familia".
export const WEBHOOK_FAMILIA = "";

// Versão do app: vai junto no envio do cadastro, para saber de qual versão veio.
export const VERSAO_APP = "2026.10.11";

// SALA_JOGOS: endereço do servidor de salas (relay WebSocket, ver .claude/tmp/spec-multiplayer-tv.md) para o
// jogador 2 entrar pelo celular lendo um QR code. Vazio = ainda não existe: a tela do QR mostra "em breve" e
// o jogador 2 usa um controle (Bluetooth/USB) ou, no computador, o teclado dividido. Ex.: "wss://sala.educarte.qzz.io".
// Teste sem mexer neste arquivo: abrir o jogo com `?sala=ws://localhost:8090` na URL (vale só para aquela página;
// o QR leva o mesmo endereço para o celular) ou gravar no aparelho `localStorage.setItem("rabisco.salaTeste", "ws://...")`
// (apagar com `localStorage.removeItem("rabisco.salaTeste")`). Só aceita endereços ws:// ou wss://.
export const SALA_JOGOS = "" || salaDeTeste();

// DETECTOR_ROSTO: módulo opcional (caminho a partir da raiz do site, ex.: "vendor/pico/rosto.mjs") que exporta
// `detectar(canvas) → Promise<[{ x, y, width, height }]>`, para achar o rosto na foto da criança 100% no aparelho
// quando o navegador não tem a FaceDetector nativa. Vazio = sem detector embarcado: o responsável ajusta um círculo
// sobre o rosto e aprova (src/motor/familia.js). A foto nunca sai do aparelho em nenhum dos casos.
export const DETECTOR_ROSTO = "";

function salaDeTeste() {
  const ok = (u) => (typeof u === "string" && /^wss?:\/\/[^\s]+$/i.test(u) ? u : "");
  try { return ok(new URLSearchParams(globalThis.location?.search ?? "").get("sala")) || ok(globalThis.localStorage?.getItem("rabisco.salaTeste")); } catch { return ""; }
}
