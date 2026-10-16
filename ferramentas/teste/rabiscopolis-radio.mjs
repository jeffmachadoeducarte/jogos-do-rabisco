// Rádio Rabisco (gospel dance no carro da Rabiscolândia): cada vez que entra no carro toca uma faixa DIFERENTE
// da anterior (saco embaralhado guardado no aparelho, inclusive depois de recarregar), o aviso "🎵 Rádio Rabisco"
// aparece, a música para com fade ao sair, abaixa com a fala da anfitriã e obedece o 🔇 da engrenagem.
// O Chrome do teste roda com --mute-audio (cdp.mjs): nada toca no alto-falante.
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/rabiscopolis-radio.mjs [http://localhost:8097]
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8097";
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 6 * 60 * 1000);
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 15000, passo = 200) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e));

const t = await abrir("about:blank", { largura: 1280, altura: 720 });
try {
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await ate(t, "document.readyState === 'complete'");
  await t.ev(`localStorage.clear(); ${FAMILIA}`);
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo", 40000), "o jogo carregou");
  await espera(1500);

  // saco embaralhado (lógica pura): 700 sorteios, nunca a mesma em seguida e cada rodada de 7 passa por todas
  const saco = await t.ev(`import("./radio-rabisco.js").then((m) => {
    const guardado = localStorage.getItem("rabisco-radio-dance"); localStorage.removeItem("rabisco-radio-dance");
    const ids = m.FAIXAS.map((f) => f.id), seq = [];
    for (let i = 0; i < 700; i++) seq.push(m.sortearFaixa(ids));
    if (guardado == null) localStorage.removeItem("rabisco-radio-dance"); else localStorage.setItem("rabisco-radio-dance", guardado);
    let repetiu = 0, rodadasCompletas = 0;
    for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) repetiu++;
    for (let i = 0; i + ids.length <= seq.length; i += ids.length) if (new Set(seq.slice(i, i + ids.length)).size === ids.length) rodadasCompletas++;
    return { n: ids.length, repetiu, rodadasCompletas, rodadas: Math.floor(seq.length / ids.length) };
  })`);
  ok(saco.n >= 6, `${saco.n} faixas na Rádio Rabisco`);
  ok(saco.repetiu === 0 && saco.rodadasCompletas === saco.rodadas, `saco embaralhado: 700 sorteios sem repetir a anterior (${saco.repetiu}) e ${saco.rodadasCompletas}/${saco.rodadas} rodadas com todas as faixas`);
  const arquivos = await t.ev(`import("./radio-rabisco.js").then((m) => Promise.all(m.FAIXAS.map((f) =>
    fetch(new URL("../../assets/radio/rabisco/" + f.id + ".m4a", location.href)).then((r) => r.ok ? r.arrayBuffer().then((b) => b.byteLength) : 0)))
  )`);
  ok(arquivos.every((b) => b > 100000 && b < 600 * 1024), `arquivos das faixas existem e são leves (${arquivos.map((b) => Math.round(b / 1024)).join(", ")} KB)`);

  // entrar e sair do carro 3 vezes: 3 faixas diferentes em sequência
  const tocadas = [];
  async function umaVolta(rotulo) {
    await t.ev("teste.entrar(0)");
    const tocou = await ate(t, "(() => { const e = teste.radio.estado(); return e.modo === 'dance' && e.faixa?.tocando && e.faixa.tempo > 0.3; })()", 12000);
    const e = await t.ev("teste.radio.estado()");
    const aviso = await t.ev("(() => { const a = teste.avisoRadio?.el; return a && !a.hidden ? a.textContent : ''; })()");
    ok(tocou && e.ligado && /\/assets\/radio\/rabisco\/.+\.m4a$/.test(e.faixa?.src || ""), `${rotulo}: entrou no carro, Rádio Rabisco tocando "${e.hino?.nome}" (${e.faixa?.id}, ${e.faixa?.tempo} s)`);
    ok(aviso === `🎵 Rádio Rabisco: ${e.hino?.nome}`, `${rotulo}: aviso no alto da tela "${aviso}"`);
    tocadas.push(e.faixa?.id);
    await t.ev("teste.sair()");
    await espera(700);
    const s = await t.ev("({ e: teste.radio.estado(), escondido: teste.radioUI.el.hidden })");
    ok(!s.e.ligado && !s.e.audioTocando && s.escondido, `${rotulo}: saiu do carro, a música parou (fade) e o painel sumiu`);
  }
  for (let i = 1; i <= 3; i++) await umaVolta(`volta ${i}`);
  ok(tocadas.length === 3 && new Set(tocadas).size === 3, `3 voltas, 3 faixas diferentes: ${tocadas.join(" → ")}`);

  // fala da anfitriã abaixa; 🔇 da engrenagem zera; ▶ troca para os hinos e ◀ volta para outra faixa dance
  await t.ev("teste.entrar(0)");
  await ate(t, "teste.radio.estado().faixa?.tocando");
  const antes = await t.ev("teste.radio.estado().faixa.id");
  await t.ev("teste.falar('rp-garagem')");
  ok(await ate(t, "teste.radio.estado().abaixado && teste.radio.estado().ganhoDuck < 0.6", 3000, 100), "a fala da anfitriã abaixa a música (ducking)");
  await ate(t, "!teste.radio.estado().abaixado", 12000);
  ok(await ate(t, "teste.radio.estado().ganhoMestre > 0.2", 3000), "depois da fala o volume volta");
  await t.ev(`import("../../src/motor/sons.js").then((m) => m.sons.mudo || m.sons.alternarMudo())`);
  ok(await ate(t, "teste.radio.estado().ganhoMestre < 0.02", 3000, 100), "🔇 da engrenagem: a rádio fica muda");
  await t.ev(`import("../../src/motor/sons.js").then((m) => m.sons.mudo && m.sons.alternarMudo())`);
  ok(await ate(t, "teste.radio.estado().ganhoMestre > 0.2", 3000, 100), "🔊 de novo: a rádio volta");
  await t.ev("teste.radio.proxima()"); await espera(400);
  const hinos = await t.ev("teste.radio.estado()");
  ok(hinos.modo !== "dance" && hinos.id !== "rabisco", `▶ passa para as estações de hinos (${hinos.nome})`);
  await t.ev("teste.radio.anterior()");
  ok(await ate(t, "teste.radio.estado().modo === 'dance' && teste.radio.estado().faixa?.tocando"), "◀ volta para a Rádio Rabisco");
  const depois = await t.ev("teste.radio.estado().faixa.id");
  ok(depois !== antes, `voltando para a Rádio Rabisco toca outra faixa (${antes} → ${depois})`);
  await t.ev("teste.sair()"); await espera(600);

  // entre sessões: recarrega e a primeira faixa não é a última que tocou
  const ultima = await t.ev(`JSON.parse(localStorage.getItem("rabisco-radio-dance")).recentes.at(-1)`);
  await t.cmd("Page.reload");
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo", 40000), "recarregou");
  await espera(1200);
  await t.ev("teste.entrar(0)");
  await ate(t, "teste.radio.estado().faixa?.tocando");
  const primeira = await t.ev("teste.radio.estado().faixa?.id");
  ok(primeira && primeira !== ultima, `depois de recarregar não repete a última (${ultima} → ${primeira})`);
  await t.ev("teste.sair()"); await espera(500);

  ok(!errosDeVerdade(t).length, `sem erro de console ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
} finally {
  await t.fechar();
}
clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
