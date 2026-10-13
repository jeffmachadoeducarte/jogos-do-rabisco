// Celular/tablet jogando SOZINHO pelo toque: nenhum jogo pode pedir controle (gamepad) nem QR, e o jogo tem que começar pelo toque.
// Cobre retrato (390x844) e paisagem (844x390), sem gamepad, com a visita "limpa" e com estado "sujo" de uma ida anterior
// à /tv ou ao modo 2 jogadores (sessionStorage rabisco.jogadores / rabisco.tv). Também confere o caminho real:
// escolher "2 jogadores" num jogo e abrir outro no mesmo celular NÃO pode lembrar o 2.
// Uso: node --experimental-websocket ferramentas/teste/celular-solo.mjs [http://localhost:8080] [id,id,...]
import { abrir, espera } from "./cdp.mjs";
const BASE = process.argv[2] || "http://localhost:8080";
const SO = (process.argv[3] || "").split(",").filter(Boolean);
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 20000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };

// jogo → como "começar": seletor do botão e como saber que começou (idade/estilo variados da casca + Kart + Cidade + Super Rabisco)
const JOGOS = [
  { id: "rabisco-kart", inicio: "#jogar", comecou: "teste.estado === 'corrida'", landscape: true },
  { id: "cidade-do-rabisco", inicio: ".botao.respira", comecou: "!!teste.j && teste.dois === false", landscape: true },
  { id: "super-rabisco-letras", inicio: ".nivel", comecou: "!document.querySelector('.nivel')?.offsetParent", landscape: true },
  { id: "pula-rabisco", inicio: ".casca-nivel", comecou: "!document.querySelector('.casca-nivel')?.offsetParent" }, // bebês
  { id: "colorir-magico", inicio: ".casca-nivel", comecou: "!document.querySelector('.casca-nivel')?.offsetParent" }, // bem pequenos
  { id: "memoria", inicio: ".casca-nivel", comecou: "!document.querySelector('.casca-nivel')?.offsetParent" }, // pequenos (revezamento)
  { id: "super-rabisco", inicio: ".nivel", comecou: "!document.querySelector('.nivel')?.offsetParent", landscape: true }, // alfabetização
  { id: "pixel-art", inicio: ".casca-nivel", comecou: "!document.querySelector('.casca-nivel')?.offsetParent" }, // maiores
].filter((j) => !SO.length || SO.includes(j.id));

// o que NUNCA pode aparecer para quem joga sozinho no toque
const PEDIDO = /conecte um controle|ligue (o|um) controle|leia o qr|aperte um bot[aã]o|em breve: o jogador 2|jogador 2 \(|desconectou|conectou numa tv/i;
const OLHAR = `(() => {
  const vis = (e) => e && e.offsetParent !== null && getComputedStyle(e).visibility !== "hidden";
  const txt = document.body.innerText.replace(/\\s+/g, " ");
  return JSON.stringify({
    txt: txt.slice(0, 2000),
    qrAtivo: vis(document.querySelector(".jog-qr.ativo")),
    aviso: vis(document.querySelector(".jog-aviso:not([hidden])")),
    modo: window.Jogadores?.modo ?? null, tv: window.Jogadores?.tv ?? false,
    gamepad: document.body.classList.contains("com-controle"),
  });
})()`;
const SUJO = `try {
  sessionStorage.setItem("rabisco.jogadores", "2");
  sessionStorage.setItem("rabisco.tv", JSON.stringify({ codigo: "ABCD", token: "x", vagas: [{ tipo: "celular", cel: "c1" }, { tipo: "controle", pad: 0 }] }));
} catch {}`;

async function celular(largura, altura, sujo) {
  const t = await abrir("about:blank", { mobile: true, largura, altura });
  await t.cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  // celular sem nenhum controle: a lista de gamepads é sempre vazia
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: `navigator.getGamepads = () => [null, null, null, null]; ${sujo ? SUJO : ""}` });
  return t;
}
// toque de verdade no centro do botão; devolve false se outra coisa (ex.: aviso "Gire o celular") cobre o botão
async function tocarInicio(t, sel) {
  const pos = await t.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: "center" }); const b = e.getBoundingClientRect();
    const x = b.x + b.width / 2, y = b.y + b.height / 2; const topo = document.elementFromPoint(x, y); return [x, y, Boolean(topo && (e === topo || e.contains(topo)))]; })()`);
  if (!pos) return "sem-botao";
  if (!pos[2]) return "coberto";
  await t.tocaXY(pos[0], pos[1]);
  return "tocou";
}

for (const [largura, altura, nome] of [[390, 844, "retrato"], [844, 390, "paisagem"]]) {
  for (const sujo of [false, true]) {
    const t = await celular(largura, altura, sujo);
    for (const j of JOGOS) {
      const rot = `${j.id} · ${nome}${sujo ? " · estado sujo" : ""}`;
      await t.cmd("Page.navigate", { url: `${BASE}/jogos/${j.id}/?teste` });
      const carregou = await ate(t, `document.querySelector(${JSON.stringify(j.inicio)}) !== null`, 30000);
      await espera(1200);
      if (!carregou) { ok(false, `${rot}: não carregou a abertura`); continue; }
      let o = JSON.parse(await t.ev(OLHAR));
      ok(!PEDIDO.test(o.txt) && !o.qrAtivo && !o.aviso, `${rot}: abertura sem pedido de controle/QR${PEDIDO.test(o.txt) ? ` ("${o.txt.match(PEDIDO)[0]}")` : ""}`);
      ok(o.modo === null || o.modo === 1, `${rot}: 1 jogador por padrão (modo ${o.modo})`);
      ok(!o.tv, `${rot}: abrir pelo portal não é modo TV`);
      const r = await tocarInicio(t, j.inicio);
      if (r === "coberto") {
        // o jogo pede o celular deitado (Kart/Cidade): o aviso de girar cobre o botão; a checagem de começar vale na paisagem
        ok(j.landscape && nome === "retrato", `${rot}: botão coberto só pelo aviso "gire o celular" (jogo de tela deitada)`);
      } else {
        ok(r === "tocou", `${rot}: toque no botão de começar`);
        ok(await ate(t, j.comecou, 40000, 300), `${rot}: o jogo começou pelo toque`);
        await espera(500);
        o = JSON.parse(await t.ev(OLHAR));
        ok(!PEDIDO.test(o.txt) && !o.aviso, `${rot}: depois de começar, nenhum pedido de controle${PEDIDO.test(o.txt) ? ` ("${o.txt.match(PEDIDO)[0]}")` : ""}`);
      }
    }
    ok(!t.erros.filter((e) => !/assets\/voz\/(cid-|nomes\/)/.test(e)).length, `${nome}${sujo ? " sujo" : ""}: sem erros ${t.erros.slice(0, 3).join(" ; ")}`);
    await t.fechar();
  }
}

// caminho real: escolheu "2 jogadores" num jogo e abriu outro no mesmo celular → o outro volta a 1 jogador, sem pedir controle
if (!SO.length) {
  const t = await celular(844, 390, false);
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/memoria/?teste` });
  await ate(t, "!!document.querySelector('[data-jogadores=\"2\"]')", 30000);
  await t.toque('[data-jogadores="2"]');
  ok(await t.ev("Jogadores.modo === 2"), "fluxo real: 2 jogadores escolhido na Memória");
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabisco-kart/?teste` });
  await ate(t, "!!document.getElementById('jogar') && window.Jogadores?.modo !== undefined", 30000);
  await espera(800);
  ok(await t.ev("Jogadores.modo === 1 && document.querySelector('[data-jogadores=\"1\"]').getAttribute('aria-pressed') === 'true'"), "fluxo real: o Kart abre em 1 jogador (o 2 da Memória não vai junto)");
  ok(await tocarInicio(t, "#jogar") === "tocou" && await ate(t, "teste.estado === 'corrida'", 40000, 300), "fluxo real: Kart começa pelo toque, sem pedir controle");
  await t.fechar();
}

console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
