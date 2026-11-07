// Rabiscolândia: níveis de qualidade (alta · media · baixa), escolhidos sozinhos pelo aparelho e ajustados pelo tempo
// de quadro durante o jogo. Ponto único que o resto do jogo consulta: `qualidade.nivel`, `qualidade.p` (os números do
// nível no aparelho) e `qualidade.tem("x")` (o que cada nível liga). As etapas seguintes do "Mundo Vivo" só perguntam aqui.
//
// alta  = o visual de hoje (sem regressão): TV/computador dpr até 1,25 (≤ ~1080p), celular até 1,3; sombra 1024 em ±44 m.
// media = dpr até 1,0; sombra 1024 só em ±30 m e só nos blocos perto (menos chamadas no passe de sombra); neblina mais perto.
// baixa = dpr ×0,7; sem sombra; neblina e detalhe bem mais perto; sem adereços de detalhe, animação de fundo nem volume (AO).
//
// Escolha no início: ?qualidade=alta|media|baixa manda; senão, o nível lembrado (se o jogo já baixou neste aparelho, nos
// últimos 7 dias); senão, pela memória/CPU que o navegador informa. Durante o jogo: fica lento (FPS médio < LENTO) por
// alguns segundos seguidos → desce um nível; sobe só se ficar folgado (FPS ≥ FOLGADO) por muito mais tempo, no máximo
// uma vez por partida e nunca acima do nível de partida (histerese: não fica subindo e descendo).

export const NIVEIS = ["baixa", "media", "alta"];
const LENTO = 27, FOLGADO = 56, SEG_LENTO = 4, SEG_FOLGADO = 30, ESPERA_INICIO = 5, ESPERA_TROCA = 3, CHAVE = "rabisco.qualidade";

// os números de cada nível, por aparelho (toque = celular/tablet; senão TV/computador)
const TABELA = {
  alta: {
    tv: { dprMax: 1.25, limite1080: true, sombra: 1024, area: 44, sombraAte: Infinity, alcance: 140, detalheAte: 36, semaforoAte: null, neblinaDe: 60 },
    toque: { dprMax: 1.3, limite1080: false, sombra: 1024, area: 44, sombraAte: Infinity, alcance: 95, detalheAte: 35, semaforoAte: 55, neblinaDe: 40 },
    tem: ["sombra", "sombraLonge", "adereços", "adereçosLonge", "fundoAnimado", "detalhe", "volume"],
  },
  media: {
    tv: { dprMax: 1.0, limite1080: true, sombra: 1024, area: 30, sombraAte: 24, alcance: 120, detalheAte: 32, semaforoAte: 90, neblinaDe: 50 },
    toque: { dprMax: 1.0, limite1080: false, sombra: 1024, area: 30, sombraAte: 24, alcance: 85, detalheAte: 30, semaforoAte: 50, neblinaDe: 35 },
    tem: ["sombra", "adereços", "fundoAnimado", "detalhe", "volume"],
  },
  baixa: {
    tv: { dprMax: 0.875, limite1080: true, sombra: 0, area: 30, sombraAte: 0, alcance: 95, detalheAte: 26, semaforoAte: 60, neblinaDe: 40 },
    toque: { dprMax: 0.91, limite1080: false, sombra: 0, area: 30, sombraAte: 0, alcance: 70, detalheAte: 24, semaforoAte: 40, neblinaDe: 30 },
    tem: [],
  },
};

export function perfil() {
  const toque = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  return { toque, dprMax: toque ? 1.3 : 1.25, sombra: 1024, limite1080: !toque };
}

// o que o aparelho conta de si (memória e núcleos só existem em alguns navegadores)
function aparelho(toque) {
  const mem = navigator.deviceMemory ?? null, nucleos = navigator.hardwareConcurrency ?? null;
  let inicial = "alta";
  if (toque) {
    if ((mem != null && mem <= 2) || (nucleos != null && nucleos <= 2)) inicial = "baixa";
    else if ((mem != null && mem <= 4) || (nucleos != null && nucleos <= 4)) inicial = "media";
  } else if ((mem != null && mem <= 2) || (nucleos != null && nucleos <= 2)) inicial = "media";
  return { toque, mem, nucleos, inicial };
}
const lerLembrado = () => { try { const d = JSON.parse(localStorage.getItem(CHAVE) || "null"); return d && NIVEIS.includes(d.nivel) && Date.now() - (d.quando || 0) < 7 * 864e5 ? d.nivel : null; } catch { return null; } };
const lembrar = (nivel) => { try { if (nivel) localStorage.setItem(CHAVE, JSON.stringify({ nivel, quando: Date.now() })); else localStorage.removeItem(CHAVE); } catch { /* sem localStorage */ } };
const idx = (n) => NIVEIS.indexOf(n);

export function criarQualidade(r3, ajustarTamanho, { forcado = null } = {}) {
  const p = perfil();
  const ap = aparelho(p.toque);
  const lembrado = lerLembrado();
  const forcar = NIVEIS.includes(forcado) ? forcado : null;
  // começa no menor entre o que o aparelho sugere e o que já ficou lembrado (o jogo baixou numa partida anterior)
  let nivel = forcar ?? (lembrado && idx(lembrado) < idx(ap.inicial) ? lembrado : ap.inicial);
  const partida = nivel;
  let subiu = false, tUlt = 0, tInicio = 0, tTroca = 0, somaLento = 0, somaFolgado = 0, janela = { n: 0, dt: 0 };
  const api = {
    perfil: p, aparelho: ap, forcado: forcar, lembrado, NIVEIS,
    get nivel() { return nivel; },
    get p() { return TABELA[nivel][p.toque ? "toque" : "tv"]; },
    tem(x) { return TABELA[nivel].tem.includes(x); },
    get dpr() { return api.calcular(innerWidth, innerHeight); },
    fps: 0, trocas: [],
    aoAplicar: null, // jogo.js: aplica o nível no céu, no mundo e na neblina
    calcular(w, h) {
      const q = api.p;
      let dpr = Math.min(devicePixelRatio || 1, q.dprMax);
      if (q.limite1080) dpr *= Math.min(1, Math.sqrt((1920 * 1080) / (w * h * dpr * dpr)));
      return Math.max(0.6, dpr);
    },
    // muda de nível (também pela API de teste); `motivo` fica no histórico
    definir(novo, motivo = "api") {
      if (!NIVEIS.includes(novo) || novo === nivel) return false;
      const antes = nivel; nivel = novo;
      api.trocas.push({ de: antes, para: novo, motivo, t: tUlt });
      tTroca = tUlt; somaLento = 0; somaFolgado = 0; janela = { n: 0, dt: 0 };
      if (motivo === "lento") lembrar(novo); else if (motivo === "folgado") lembrar(novo === partida ? null : novo);
      api.aoAplicar?.(novo, antes);
      ajustarTamanho();
      return true;
    },
    // chamar a cada quadro com o tempo (s). Média de 1 s; lento por SEG_LENTO s seguidos → desce; folgado por SEG_FOLGADO s → sobe (1×)
    medir(agora) {
      if (!tInicio) { tInicio = agora; tUlt = agora; return; }
      const dt = agora - tUlt; tUlt = agora;
      if (dt <= 0 || dt > 0.5) return; // aba escondida ou engasgo de carga: não conta
      if (agora - tInicio < ESPERA_INICIO || agora - tTroca < ESPERA_TROCA) return;
      janela.n++; janela.dt += dt;
      if (janela.dt < 1) return;
      api.fps = janela.n / janela.dt;
      const fps = api.fps, seg = janela.dt; janela = { n: 0, dt: 0 };
      if (forcar) return;
      if (fps < LENTO) { somaLento += seg; somaFolgado = 0; } else if (fps >= FOLGADO) { somaFolgado += seg; somaLento = 0; } else { somaLento = 0; somaFolgado = 0; }
      if (somaLento >= SEG_LENTO && idx(nivel) > 0) api.definir(NIVEIS[idx(nivel) - 1], "lento");
      else if (somaFolgado >= SEG_FOLGADO && !subiu && idx(nivel) < idx(partida)) { subiu = true; api.definir(NIVEIS[idx(nivel) + 1], "folgado"); }
    },
    // compatibilidade com quem ainda chama (antes: só desligava a sombra)
    aoSemSombra: null,
  };
  return api;
}
