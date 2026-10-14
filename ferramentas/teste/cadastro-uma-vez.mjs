// O cadastro completo da família abre no MÁXIMO UMA VEZ por aparelho (celular/tablet/computador):
// depois de salvar, de "Agora não" ou de voltar no portão dos pais, não abre sozinho de novo. O botão "Família" continua
// abrindo para editar. Em /tv, ?tv=1 e 2 jogadores o cadastro completo nunca abre.
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
const clicaJogo = `(() => { const a = document.querySelector("a.jogo.pronto"); if (!a) return false; a.addEventListener("click", (e) => e.preventDefault(), { once: true }); a.click(); return true; })()`;
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
  // 1) primeira visita: abre 1 vez; "Voltar" no portão; depois não abre mais (nem recarregando)
  let t = await nova(opts, `${BASE}/index.html`);
  ok(!(await t.ev(ALGUM)), "ao abrir o portal nada abre sozinho");
  ok(await tocarJogo(t), "tocou num jogo");
  ok(await ate(t, PORTAO), "1o toque: portão dos pais abre");
  await t.ev(`document.querySelector(".portao-tela .botao.branco").click()`);
  await espera(400);
  ok(!(await t.ev(ALGUM)), "Voltar no portão fecha tudo");
  for (let i = 0; i < 3; i++) { await t.ev(clicaJogo); await espera(300); }
  ok(!(await t.ev(ALGUM)), "toques seguintes em jogos não abrem o cadastro");
  await t.ev(`location.reload()`); await espera(2500); await ate(t, `document.readyState === "complete" && !!document.getElementById("familia")`);
  await t.ev(clicaJogo); await espera(400);
  ok(!(await t.ev(ALGUM)), "depois de recarregar também não abre");
  // (tocar num jogo agora segue para o jogo sem cadastro: volta ao portal)
  await t.cmd("Page.navigate", { url: `${BASE}/index.html` });
  await espera(1500);
  // botão Família continua abrindo para editar
  await ate(t, `!!document.getElementById("familia")`, 15000); await t.ev(`document.getElementById("familia").click()`);
  ok(await ate(t, PORTAO), "botão Família abre o portão");
  await t.ev(GOLPE);
  ok(await ate(t, FORM), "botão Família abre o formulário para editar");
  await t.ev(`[...document.querySelectorAll(".familia-tela button")].find((b) => b.textContent === "Agora não").click()`);
  await espera(300);
  ok(!(await t.ev(ALGUM)), "Agora não fecha");
  await t.fechar();

  // 2) primeira visita: preenche e salva; depois nunca mais abre sozinho
  t = await nova(opts, `${BASE}/index.html`);
  await tocarJogo(t);
  await ate(t, PORTAO); await t.ev(GOLPE);
  ok(await ate(t, FORM), "salvar: formulário abre uma vez");
  await t.ev(`(() => { const s = (id, v) => { const e = document.querySelector("#fam-" + id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); };
    s("resp-nome", "Mae Teste"); s("email", "m@t.com"); s("crianca-nome", "Alice"); s("genero", "menina"); document.querySelector(".familia-form").requestSubmit(); })()`);
  await espera(800);
  ok(await t.ev(`!!JSON.parse(localStorage.getItem("rabisco.familia"))?.crianca?.nome`), "cadastro foi salvo");
  await t.ev(`location.href = location.href`); await espera(2500); await ate(t, `document.readyState === "complete" && !!document.getElementById("familia")`);
  await t.ev(clicaJogo); await espera(400);
  ok(!(await t.ev(ALGUM)), "depois de salvar não abre mais");
  await t.fechar();

  // 3) "Agora não" no formulário: não abre de novo
  t = await nova(opts, `${BASE}/index.html`);
  await tocarJogo(t);
  await ate(t, PORTAO); await t.ev(GOLPE); await ate(t, FORM);
  await t.ev(`[...document.querySelectorAll(".familia-tela button")].find((b) => b.textContent === "Agora não").click()`);
  await espera(300);
  await t.ev(clicaJogo); await espera(400);
  ok(!(await t.ev(ALGUM)), "depois de Agora não, tocar noutro jogo não abre");
  await t.fechar();

  // 4) recarregar com o portão aberto conta como pergunta feita
  t = await nova(opts, `${BASE}/index.html`);
  await tocarJogo(t); await ate(t, PORTAO);
  await t.ev(`location.reload()`); await espera(2500); await ate(t, `document.readyState === "complete" && !!document.getElementById("familia")`);
  await t.ev(clicaJogo); await espera(400);
  ok(!(await t.ev(ALGUM)), "recarregar com o portão aberto não faz perguntar de novo");
  await t.fechar();
}

console.log("\n== localStorage bloqueado (modo privado): no máximo uma vez por sessão, sem laço");
{
  const bloqueia = `for (const k of ["localStorage"]) Object.defineProperty(window, k, { get() { throw new DOMException("bloqueado", "SecurityError"); } });`;
  const t = await nova({ mobile: true, largura: 390, altura: 844 }, `${BASE}/index.html`, bloqueia);
  await tocarJogo(t);
  ok(await ate(t, PORTAO), "bloqueado: abre a 1a vez");
  await t.ev(`document.querySelector(".portao-tela .botao.branco").click()`); await espera(300);
  for (let i = 0; i < 3; i++) { await t.ev(clicaJogo); await espera(300); }
  ok(!(await t.ev(ALGUM)), "bloqueado: não vira laço");
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
  // chamada direta como o portal faria: resolve true na hora, sem tela
  const r = await t.ev(`(async () => { const F = window.Familia || (await import("/src/motor/familia.js")).Familia; const r = await Promise.race([F.abrirCadastro({ obrigatorio: true }), new Promise((x) => setTimeout(() => x("travou"), 1500))]); return r + "|" + !!document.querySelector(".familia-tela"); })()`);
  ok(r === "true|false", `${nome}: abrirCadastro obrigatório resolve sem abrir (${r})`);
  await t.fechar();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : "\ntudo certo, 0 falhas");
process.exit(falhas ? 1 : 0);
