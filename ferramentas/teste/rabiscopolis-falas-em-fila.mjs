// Rabiscolândia: ao concluir uma missão, as falas da anfitriã (conclusão -> versículo -> propaganda do parceiro) tocam em
// fila, cada uma só depois de a anterior ACABAR, sem cortar nenhuma, com o balão sincronizado à voz.
//  - mede início e fim reais de cada áudio (MP3 solto e sequência emendada com o nome da criança) e confere que não há sobreposição;
//  - missões com parceiro (com e sem "agradece") e sem parceiro (com e sem versículo), com e sem nome cadastrado;
//  - missão que COMPLETA uma página do álbum: a fala "página completa" toca por último (depois da propaganda), sem cortar nenhuma;
//    a fala da "primeira figurinha" via missão continua calada;
//  - aceitar outra missão no meio cancela a fila: fala velha não toca por cima.
// Uso: python3 -m http.server 8746 &  node --experimental-websocket ferramentas/teste/rabiscopolis-falas-em-fila.mjs http://localhost:8746
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8746";
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; return Boolean(c); };
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 9 * 60 * 1000);
const t = await abrir("about:blank", { largura: 1280, altura: 720 });
const ev = (s) => t.ev(s);
const ate = async (expr, ms = 40000, passo = 200) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await ev(expr).catch(() => false)) return true; await espera(passo); } return false; };

const INSTRUMENTO = `window.__ev = []; {
  const p = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const e = { k: "mp3", src: this.src.replace(/^.*\\/voz\\//, ""), ini: performance.now(), fim: null, cortada: false };
    window.__ev.push(e);
    const acabou = () => { if (e.fim == null) { e.fim = performance.now(); e.cortada = !this.ended; } };
    this.addEventListener("ended", acabou, { once: true }); this.addEventListener("pause", acabou, { once: true });
    return p.call(this);
  };
  const s = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (when, off, dur) {
    const ini = performance.now() + (when - this.context.currentTime) * 1000;
    window.__ev.push({ k: "seq", ini, fim: ini + (dur ?? this.buffer.duration) * 1000, cortada: false });
    return s.call(this, when, off, dur);
  };
  const b = document.querySelector(".balao-rp");
  new MutationObserver(() => window.__ev.push({ k: "balao", ini: performance.now(), txt: b.textContent })).observe(b, { childList: true, characterData: true, subtree: true });
}`;

// junta os pedaços emendados de uma sequência numa fala só
function falas(evs) {
  const a = evs.filter((e) => e.k !== "balao").sort((x, y) => x.ini - y.ini), r = [];
  for (const e of a) {
    const u = r.at(-1);
    if (e.k === "seq" && u?.k === "seq" && e.ini <= u.fim + 60) u.fim = Math.max(u.fim, e.fim);
    else r.push({ ...e });
  }
  return r;
}
async function carregar(nome) {
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabiscopolis/` });
  await ate("document.readyState === 'complete'");
  await ev(`localStorage.clear(); ${nome ? `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "${nome}", genero: "menina" } }))` : ""}`);
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo` });
  if (!ok(await ate("!!window.teste?.vivo && !!teste.mundo", 90000), `o jogo carregou (${nome ?? "sem nome"})`)) return false;
  await espera(1500);
  await ev(INSTRUMENTO);
  return true;
}
// conclui a missão e devolve as falas medidas até a fila acabar
async function medir(id, rotulo, esperado) {
  await ev(`teste.missoes.aceitar(${JSON.stringify(id)})`);
  await espera(12000); // deixa o pedido da missão acabar: só a conclusão entra na medição
  await ev("window.__ev.length = 0");
  const t0 = await ev("performance.now()");
  ok(await ev(`teste.missoes.concluirParaTeste(${JSON.stringify(id)})`), `${rotulo}: missão ${id} concluída`);
  const M = await ev(`(() => { const m = teste.missoes.MISSOES.find((x) => x.id === ${JSON.stringify(id)}); return { verso: !!m.verso, parceiro: m.parceiro ?? null }; })()`);
  const n = 1 + (M.verso ? 1 : 0) + (M.parceiro ? 1 : 0) + (esperado.agradece ? 1 : 0);
  // espera todas as falas esperadas começarem e terminarem
  const fim = Date.now() + 90000;
  let f = [];
  while (Date.now() < fim) { await espera(500); f = falas(await ev("window.__ev")); if (f.length >= n && f.every((x) => x.fim != null) && f.at(-1).fim <= (await ev("performance.now()"))) break; }
  await espera(800);
  const evs = await ev("window.__ev"); f = falas(evs);
  console.log(`   ${rotulo} (${id}) sequência medida (s desde a conclusão):`);
  for (const x of f) console.log(`     ${x.k === "mp3" ? x.src.padEnd(34) : "(nome emendado)".padEnd(34)} início ${((x.ini - t0) / 1000).toFixed(2)}  fim ${x.fim == null ? "?" : ((x.fim - t0) / 1000).toFixed(2)}${x.cortada ? "  CORTADA" : ""}`);
  ok(f.length === n, `${rotulo}: ${n} falas (${f.length})`);
  ok(f.every((x) => !x.cortada && x.fim != null), `${rotulo}: nenhuma fala foi cortada`);
  let sobre = 0; for (let i = 1; i < f.length; i++) if (f[i].ini < f[i - 1].fim - 30) sobre++;
  ok(sobre === 0, `${rotulo}: nenhuma fala começa antes de a anterior acabar`);
  const mp3 = f.filter((x) => x.k === "mp3").map((x) => x.src);
  if (M.verso) ok(mp3.includes(`rp-m-${id}-verso.mp3`), `${rotulo}: o versículo tocou`);
  if (M.parceiro) ok(mp3.at(-1) === `rp-prop-${M.parceiro}.mp3`, `${rotulo}: a propaganda é a última`);
  // balão sincronizado: o versículo e a propaganda aparecem no balão junto do início do áudio
  const bal = evs.filter((e) => e.k === "balao");
  const casa = (fala, re) => bal.some((e) => re.test(e.txt) && Math.abs(e.ini - fala.ini) < 700);
  const verso = f.find((x) => x.src === `rp-m-${id}-verso.mp3`), prop = f.find((x) => x.src?.startsWith("rp-prop-"));
  if (verso) ok(casa(verso, /📖/), `${rotulo}: balão do versículo aparece junto da voz`);
  if (prop) ok(casa(prop, /@/), `${rotulo}: balão da propaganda aparece junto da voz`);
  return f;
}

// missão que ganha figurinha: confere as falas da fila e se a fala do álbum (página completa / primeira) entrou ou não
async function medirAlbum(id, rotulo, { completaPagina }) {
  await ev(`teste.missoes.aceitar(${JSON.stringify(id)})`);
  await espera(12000);
  if (completaPagina) { // deixa só a figurinha do versículo desta missão faltando na página dos versículos
    await ev(`(() => { const A = teste.album.album; for (const f of A.paginas().find((p) => p.id === "versiculos").figs) if (f.id !== "v:${id}") A.ganhar(f.id); })()`);
  }
  await ev("window.__ev.length = 0");
  ok(await ev(`teste.missoes.concluirParaTeste(${JSON.stringify(id)})`), `${rotulo}: missão ${id} concluída`);
  const M = await ev(`(() => { const m = teste.missoes.MISSOES.find((x) => x.id === ${JSON.stringify(id)}); return { verso: !!m.verso, parceiro: m.parceiro ?? null }; })()`);
  const n = 1 + (M.verso ? 1 : 0) + (M.parceiro ? 1 : 0) + (completaPagina ? 1 : 0);
  const fim = Date.now() + 120000;
  let f = [];
  while (Date.now() < fim) { await espera(500); f = falas(await ev("window.__ev")); if (f.length >= n && f.every((x) => x.fim != null) && f.at(-1).fim <= (await ev("performance.now()"))) break; }
  await espera(6000); // sobra de tempo: uma fala indevida do álbum apareceria aqui
  f = falas(await ev("window.__ev"));
  const t0 = f[0]?.ini ?? 0;
  console.log(`   ${rotulo} (${id}) falas:`); for (const x of f) console.log(`     ${(x.src ?? "(nome emendado)").padEnd(34)} início ${((x.ini - t0) / 1000).toFixed(2)}  fim ${x.fim == null ? "?" : ((x.fim - t0) / 1000).toFixed(2)}${x.cortada ? "  CORTADA" : ""}`);
  const mp3 = f.filter((x) => x.k === "mp3").map((x) => x.src);
  ok(f.every((x) => !x.cortada && x.fim != null), `${rotulo}: nenhuma fala foi cortada`);
  let sobre = 0; for (let i = 1; i < f.length; i++) if (f[i].ini < f[i - 1].fim - 30) sobre++;
  ok(sobre === 0, `${rotulo}: nenhuma fala começa antes de a anterior acabar`);
  if (completaPagina) {
    ok(f.length === n, `${rotulo}: ${n} falas (${f.length})`);
    const ordem = mp3.map((s) => (s === `rp-m-${id}-verso.mp3` ? "verso" : s.startsWith("rp-prop-") ? "prop" : s === "rp-album-pagina-versiculos.mp3" ? "pagina" : "outra"));
    const esperada = ["verso", ...(M.parceiro ? ["prop"] : []), "pagina"];
    ok(JSON.stringify(ordem.filter((x) => x !== "outra")) === JSON.stringify(esperada), `${rotulo}: ordem versículo${M.parceiro ? ", propaganda" : ""}, página completa (${ordem.join(" > ")})`);
    ok(mp3.at(-1) === "rp-album-pagina-versiculos.mp3", `${rotulo}: a página completa é a última fala`);
  } else {
    ok(!mp3.includes("rp-album-primeira.mp3"), `${rotulo}: a "primeira figurinha" via missão fica calada`);
    ok(!mp3.some((s) => s.startsWith("rp-album-pagina")), `${rotulo}: sem página completa, nenhuma fala de página`);
  }
  return f;
}

try {
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo` });
  await ate("!!window.teste?.vivo && !!teste.mundo", 90000);
  const info = await ev(`teste.missoes.MISSOES.map((m) => ({ id: m.id, parceiro: m.parceiro ?? null, verso: !!m.verso, agradece: !!m.agradece, fimNome: !!m.fimNome }))`);
  const acha = (f) => info.find(f)?.id;
  const A = acha((m) => m.parceiro && m.verso && m.agradece), B = acha((m) => m.parceiro && m.verso && !m.agradece && m.fimNome), B2 = acha((m) => m.parceiro && m.verso && !m.agradece && !m.fimNome);
  const C = acha((m) => !m.parceiro && m.verso && m.fimNome), C2 = acha((m) => !m.parceiro && m.verso && !m.fimNome), D = acha((m) => !m.parceiro && !m.verso);
  console.log("   missões escolhidas:", { A, B, B2, C, C2, D });

  if (await carregar("Alice")) {
    if (B) await medir(B, "parceiro + nome", {});
    if (A) await medir(A, "parceiro com agradece + nome", { agradece: true });
    if (C) await medir(C, "sem parceiro + nome", {});
  }
  if (await carregar(null)) {
    if (B2 ?? B) await medir(B2 ?? B, "parceiro sem nome", {});
    if (C2 ?? C) await medir(C2 ?? C, "sem parceiro sem nome", {});
    if (D) await medir(D, "sem parceiro nem versículo", {});

    // ---- álbum: a "primeira figurinha" que vem da missão fica calada (estado limpo, sem figurinhas)
    if (D ?? C2) await medirAlbum(D ?? C2, "primeira figurinha via missão", { completaPagina: false });
    // ---- álbum: a página completa ganha na missão toca no fim da fila
    if (B2 ?? B) { if (await carregar(null)) await medirAlbum(B2 ?? B, "missão completa página", { completaPagina: true }); }
    // ---- aceitar outra missão no meio: a fila velha é cancelada
    const id = B2 ?? B;
    if (id) {
      await ev(`teste.missoes.aceitar(${JSON.stringify(id)})`);
      await espera(12000);
      await ev("window.__ev.length = 0");
      await ev(`teste.missoes.concluirParaTeste(${JSON.stringify(id)})`);
      await espera(1500); // o fim ainda está falando
      const outra = info.find((m) => m.id !== id && !m.agradece)?.id;
      await ev(`teste.missoes.aceitar(${JSON.stringify(outra)})`);
      await espera(25000);
      const f = falas(await ev("window.__ev"));
      const velhas = f.filter((x) => x.src && (x.src === `rp-m-${id}-verso.mp3` || x.src.startsWith("rp-prop-")) && x.ini > 0);
      ok(velhas.length === 0, `aceitar outra missão no meio cancela a fila: nada do versículo/propaganda velhos (${f.map((x) => x.src ?? "seq").join(", ")})`);
      await ev("teste.missoes.largar()");
    }
  }
  const erros = t.erros.filter((e) => !/assets\/voz\/nomes\//.test(e));
  ok(!erros.length, `sem erro de console ${erros.slice(0, 4).join(" ; ")}`);
} catch (e) { ok(false, `erro no teste: ${e.message}`); }
await t.fechar();
clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
