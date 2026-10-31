// Cadastro: tocar num jogo nunca abre tela nenhuma e o jogo abre direto. O botão "Família" continua opcional
// (portão dos pais + formulário) e salva. Em /tv, ?tv=1 e 2 jogadores também não abre nada.
// Uso: node --experimental-websocket ferramentas/teste/cadastro-uma-vez.mjs [http://localhost:8080]
import { abrir, espera } from "./cdp.mjs";
const BASE = process.argv[2] || "http://localhost:8080";
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 8000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(200); } return false; };
const PORTAO = `!!document.querySelector(".portao-tela")`;
const FORM = `!!document.querySelector("#fam-resp-nome")`;
const ALGUM = `!!document.querySelector(".familia-tela")`;
const GOLPE = `(() => { const t = document.querySelector(".portao-conta")?.textContent.split("×").map(Number); const i = document.querySelector("#portao-resposta"); i.value = String(t[0] * t[1]); i.form.requestSubmit(); })()`;
// clica no jogo e devolve se o clique foi deixado seguir (nenhum preventDefault = o link abre o jogo)
const clicaJogo = `(() => { const a = document.querySelector("a.jogo.pronto"); if (!a) return "sem-jogo"; let seguiu = false; a.addEventListener("click", (e) => { seguiu = !e.defaultPrevented; e.preventDefault(); }, { once: true }); a.click(); return seguiu ? "segue" : "barrado"; })()`;
const tocarJogo = async (t) => { await t.ev(`document.querySelectorAll("[data-faixa]")[0]?.click()`); await espera(300); return t.ev(clicaJogo); };

async function nova(opts, url, antes = "") {
  const t = await abrir("about:blank", opts);
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: antes });
  await t.cmd("Page.navigate", { url });
  await ate(t, `document.readyState === "complete"`);
  await espera(600);
  return t;
}


for (const [nome, opts] of [["celular", { mobile: true, largura: 390, altura: 844 }], ["tablet", { mobile: true, largura: 820, altura: 1180 }], ["computador", { largura: 1280, altura: 800 }]]) {
  console.log(`\n== ${nome}`);
  // 1) sem cadastro: tocar em jogos não abre tela e o clique segue para o jogo
  let t = await nova(opts, `${BASE}/index.html`);
  ok(!(await t.ev(ALGUM)), "ao abrir o portal nada abre sozinho");
  ok((await tocarJogo(t)) === "segue", "1o toque num jogo: o link segue (nada o barra)");
  await espera(500);
  ok(!(await t.ev(ALGUM)) && !(await t.ev(PORTAO)), "1o toque: nenhuma tela de cadastro nem portão");
  for (let i = 0; i < 3; i++) { ok((await t.ev(clicaJogo)) === "segue", `toque ${i + 2}: segue`); await espera(200); }
  ok(!(await t.ev(ALGUM)), "toques seguintes não abrem cadastro");
  ok(await t.ev(`localStorage.getItem("rabisco.familia.perguntou") === null && !localStorage.getItem("rabisco.familia")`), "nada foi marcado nem salvo");
  // abrirCadastro obrigatório: resolve true na hora, sem tela
  const r = await t.ev(`(async () => { const F = (await import("/src/motor/familia.js")).Familia; const r = await Promise.race([F.abrirCadastro({ obrigatorio: true }), new Promise((x) => setTimeout(() => x("travou"), 1500))]); return r + "|" + !!document.querySelector(".familia-tela"); })()`);
  ok(r === "true|false", `abrirCadastro obrigatório resolve true sem abrir (${r})`);
  // botão Família continua abrindo (portão dos pais) e dá para cancelar
  await t.ev(`document.getElementById("familia").click()`);
  ok(await ate(t, PORTAO), "botão Família abre o portão");
  await t.ev(GOLPE);
  ok(await ate(t, FORM), "botão Família abre o formulário");
  await t.ev(`[...document.querySelectorAll(".familia-tela button")].find((b) => b.textContent === "Agora não").click()`);
  await espera(300);
  ok(!(await t.ev(ALGUM)), "Agora não fecha");
  await t.fechar();

  // 2) pelo botão Família: preenche e salva; depois os jogos seguem normalmente
  t = await nova(opts, `${BASE}/index.html`);
  await t.ev(`document.getElementById("familia").click()`);
  await ate(t, PORTAO); await t.ev(GOLPE);
  ok(await ate(t, FORM), "salvar: formulário abre pelo botão Família");
  await t.ev(`(() => { const s = (id, v) => { const e = document.querySelector("#fam-" + id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); };
    s("resp-nome", "Mae Teste"); s("email", "m@t.com"); s("crianca-nome", "Alice"); s("genero", "menina"); document.querySelector(".familia-form").requestSubmit(); })()`);
  await espera(800);
  ok(await t.ev(`!!JSON.parse(localStorage.getItem("rabisco.familia"))?.crianca?.nome`), "cadastro foi salvo");
  await t.ev(`document.querySelectorAll("[data-faixa]")[0]?.click()`); await espera(300);
  ok((await t.ev(clicaJogo)) === "segue", "depois de salvar, o jogo segue");
  ok(!(await t.ev(ALGUM)), "depois de salvar não abre cadastro");
  await t.fechar();
}

console.log("\n== localStorage bloqueado (modo privado): o jogo também segue");
{
  const bloqueia = `for (const k of ["localStorage"]) Object.defineProperty(window, k, { get() { throw new DOMException("bloqueado", "SecurityError"); } });`;
  const t = await nova({ mobile: true, largura: 390, altura: 844 }, `${BASE}/index.html`, bloqueia);
  ok((await tocarJogo(t)) === "segue", "bloqueado: o toque segue para o jogo");
  await espera(400);
  ok(!(await t.ev(ALGUM)), "bloqueado: nenhuma tela");
  await t.fechar();
}

console.log("\n== TV e 2 jogadores nunca abrem o cadastro completo");
for (const [nome, url, antes] of [
  ["/tv", `${BASE}/tv/`, ""],
  ["jogo com ?tv=1", `${BASE}/jogos/memoria/index.html?tv=1`, ""],
  ["portal com 2 jogadores na sessão", `${BASE}/index.html`, `try { sessionStorage.setItem("rabisco.jogadores", "2"); } catch {}`],
  ["portal com TV na sessão", `${BASE}/index.html`, `try { sessionStorage.setItem("rabisco.tv", JSON.stringify({ codigo: "ABCD", token: "x", vagas: [] })); } catch {}`],
]) {
  const t = await nova({ largura: 1280, altura: 720 }, url, antes);
  if (nome.startsWith("portal")) { await tocarJogo(t); await espera(600); }
  ok(!(await t.ev(ALGUM)), `${nome}: sem portão nem cadastro`);
  const r = await t.ev(`(async () => { const F = window.Familia || (await import("/src/motor/familia.js")).Familia; const r = await Promise.race([F.abrirCadastro({ obrigatorio: true }), new Promise((x) => setTimeout(() => x("travou"), 1500))]); return r + "|" + !!document.querySelector(".familia-tela"); })()`);
  ok(r === "true|false", `${nome}: abrirCadastro obrigatório resolve sem abrir (${r})`);
  await t.fechar();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : "\ntudo certo, 0 falhas");
process.exit(falhas ? 1 : 0);
