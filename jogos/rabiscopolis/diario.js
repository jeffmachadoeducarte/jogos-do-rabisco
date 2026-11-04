// Rabiscolândia: o Presente do dia (um baú por dia) e a Missão do dia. Sem DOM e sem three.js (dá para testar em node):
// o baú de blocos fica em diario-bau.js e a tela de 7 dias no Rabisfone (rabifone.js).
//
// O dia é a data LOCAL do aparelho ("2026-11-03"). Tudo fica no salvamento da Rabiscolândia (salvar.js), em salvo.diario:
//   { bau: dia do último baú aberto, seq: 1..7 (em que dia da sequência ele foi), maior: o dia mais adiante já visto,
//     aviso: dia em que a anfitriã já avisou do presente, extra: dia em que o extra da Missão do dia já rendeu,
//     md: { dia, id } (a Missão do dia registrada) }
// As moedas vão para a carteira do portal (src/motor/rabiscoins.js).
//
// Regras: dias seguidos rendem um pouco mais (PREMIOS, do 1º ao 7º dia, com bônus no 7º; depois recomeça do 1).
// Faltou um dia? A sequência só volta para o dia 1: ninguém perde moeda nem o que já pegou.
// Relógio voltando no tempo (data antes do dia mais adiante já visto): nada de baú nem de extra até a data passar dele.
//
//   const D = criarDiario({ salvo: () => salvo, salvar: () => salvar(salvo), ganhar: (qtd, motivo) => …, hoje: () => "2026-11-03" });
//   D.estado() → { hoje, disponivel, voltou, seq (dia da sequência de hoje), premio, pegos: [7 × bool], hojeNoCalendario }
//   D.abrir() → { qtd, seq, bonus } | null      D.deveAvisar() → true só na 1ª entrada do dia com presente esperando
//   D.missaoDoDia(candidatos) → id | null       D.pagarExtra(id, candidatos) → EXTRA_DIA | 0

export const PREMIOS = [10, 12, 14, 16, 18, 20, 40]; // o 7º dia: 20 + 20 de bônus
export const BONUS_7 = 20;
export const EXTRA_DIA = 15; // Missão do dia: além do normal, na primeira conclusão do dia
export const MOTIVO_BAU = "rabiscolandia:presente-do-dia";
export const MOTIVO_EXTRA = "rabiscolandia:missao-do-dia";

const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;
const dois = (n) => String(n).padStart(2, "0");
// data local do aparelho
export const diaDe = (d = new Date()) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
export const valido = (s) => typeof s === "string" && FORMATO.test(s) && !Number.isNaN(numero(s));
// número do dia (dias desde 1970, sem fuso: só a data conta)
export function numero(s) { const m = FORMATO.exec(s ?? ""); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5) : NaN; }
export function deNumero(n) { const d = new Date(n * 864e5); return `${d.getUTCFullYear()}-${dois(d.getUTCMonth() + 1)}-${dois(d.getUTCDate())}`; }
export const ontemDe = (s) => deNumero(numero(s) - 1);
// data de verdade (para a época do ano das missões de temporada)
export const dataDe = (s) => { const m = FORMATO.exec(s); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(); };

// sorteio da Missão do dia: determinístico pela data e nunca igual ao do dia anterior (com a mesma lista). Uma corrente
// desde EPOCA: cada dia anda 1 + (sorteio % (n - 1)) casas para a frente, então nunca para na mesma.
const EPOCA = numero("2024-01-01");
function embaralha(k) { let t = (k * 0x9e3779b1) >>> 0; t ^= t >>> 15; t = Math.imul(t, 0x85ebca6b) >>> 0; t ^= t >>> 13; t = Math.imul(t, 0xc2b2ae35) >>> 0; return (t ^ (t >>> 16)) >>> 0; }
const memo = new Map(); // `${n}` → { ate, idx } (o último dia calculado: a corrente só anda para a frente)
export function sorteio(dia, n) {
  if (n <= 1) return 0;
  const d = numero(dia);
  if (!(d > EPOCA)) return embaralha(d) % n;
  let m = memo.get(n);
  if (!m || m.ate > d) m = { ate: EPOCA, idx: embaralha(EPOCA) % n };
  let { ate, idx } = m;
  for (let k = ate + 1; k <= d; k++) idx = (idx + 1 + (embaralha(k) % (n - 1))) % n;
  memo.set(n, { ate: d, idx });
  return idx;
}

export function criarDiario({ salvo, salvar, ganhar, hoje = () => diaDe(), aoAbrir = null }) {
  const dados = () => {
    const s = salvo();
    if (!s.diario || typeof s.diario !== "object" || Array.isArray(s.diario)) s.diario = {};
    return s.diario;
  };
  const guardar = () => { try { salvar(); } catch { /* sem armazenamento: vale só até fechar */ } };
  const diaHoje = () => { const h = hoje(); return valido(h) ? h : diaDe(); };
  // o relógio voltou? (anota o dia mais adiante já visto)
  function olhar() {
    const D = dados(), h = diaHoje();
    const maior = valido(D.maior) ? D.maior : null;
    if (maior && numero(h) < numero(maior)) return { D, h, voltou: true };
    if (maior !== h) { D.maior = h; guardar(); }
    return { D, h, voltou: false };
  }
  function estado() {
    const { D, h, voltou } = olhar();
    const ultimo = valido(D.bau) ? D.bau : null, seqAntes = Number.isInteger(D.seq) && D.seq >= 1 && D.seq <= 7 ? D.seq : 0;
    const pegoHoje = ultimo === h;
    const disponivel = !voltou && !pegoHoje;
    // ontem também abriu (e não fechou os 7): continua; senão (faltou, ou fechou os 7), recomeça do dia 1
    const seguido = ultimo && numero(h) - numero(ultimo) === 1 && seqAntes < 7;
    const seq = pegoHoje ? seqAntes : disponivel ? (seguido ? seqAntes + 1 : 1) : 0;
    // calendário: os dias desta volta já pegos (até ontem, ou até hoje se hoje já abriu)
    const ate = pegoHoje ? seqAntes : disponivel ? seq - 1 : 0;
    const pegos = PREMIOS.map((_, i) => i < ate);
    return { hoje: h, disponivel, voltou, pegoHoje, seq, premio: seq ? PREMIOS[seq - 1] : 0, pegos, ultimo };
  }
  function abrir() {
    const e = estado();
    if (!e.disponivel) return null;
    const D = dados();
    D.bau = e.hoje; D.seq = e.seq;
    guardar();
    ganhar(e.premio, MOTIVO_BAU);
    aoAbrir?.(e); // o Álbum dá a figurinha surpresa (album-ui.js)
    return { qtd: e.premio, seq: e.seq, bonus: e.seq === 7 };
  }
  // a anfitriã avisa uma vez por dia, na primeira entrada, se o presente está esperando
  function deveAvisar() {
    const e = estado();
    if (!e.disponivel) return false;
    const D = dados();
    if (D.aviso === e.hoje) return false;
    D.aviso = e.hoje; guardar();
    return true;
  }
  // candidatos: ids das missões que a criança consegue fazer agora, na ordem da lista (quem chama filtra)
  function missaoDoDia(candidatos) {
    const { D, h, voltou } = olhar();
    if (voltou || !candidatos?.length) return null;
    if (D.md?.dia === h && candidatos.includes(D.md.id)) return D.md.id;
    const ontem = ontemDe(h);
    const anterior = D.md?.dia === ontem ? D.md.id : candidatos[sorteio(ontem, candidatos.length)];
    let id = candidatos[sorteio(h, candidatos.length)];
    if (id === anterior && candidatos.length > 1) id = candidatos[(candidatos.indexOf(id) + 1) % candidatos.length];
    D.md = { dia: h, id }; guardar();
    return id;
  }
  const extraPagoHoje = () => dados().extra === diaHoje();
  function pagarExtra(id, candidatos) {
    const { D, h, voltou } = olhar();
    if (voltou || D.extra === h || !id || missaoDoDia(candidatos) !== id) return 0;
    D.extra = h; guardar();
    ganhar(EXTRA_DIA, MOTIVO_EXTRA);
    return EXTRA_DIA;
  }
  return { estado, abrir, deveAvisar, missaoDoDia, pagarExtra, extraPagoHoje, hoje: diaHoje };
}
