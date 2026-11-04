// Cadastro uma vez só: na 1ª entrada no PORTAL abre o questionário único (responsável + filhos); "Agora não" fecha e não
// pergunta de novo nesta visita; tocar num jogo nunca abre cadastro (o link segue). Depois de cadastrado, o portal não
// pergunta mais e o chip do topo abre "Quem vai jogar?" (troca de perfil). /tv, ?tv=1 e jogos abertos direto nunca
// abrem o cadastro; abrirCadastro({ obrigatorio: true }) resolve true na hora, sem tela. O fluxo completo dos perfis
// está em ferramentas/teste/perfis.mjs.
// Uso: node --experimental-websocket ferramentas/teste/cadastro-uma-vez.mjs [http://localhost:8080]
import { abrir, espera } from "./cdp.mjs";
const BASE = process.argv[2] || "http://localhost:8080";
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 8000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(200); } return false; };
const CADASTRO = `!!document.querySelector(".cadastro")`;
const ALGUM = `!!document.querySelector(".familia-tela")`;
// clica no jogo e devolve se o clique foi deixado seguir (nenhum preventDefault = o link abre o jogo)
const clicaJogo = `(() => { const a = document.querySelector("a.jogo.pronto"); if (!a) return "sem-jogo"; let seguiu = false; a.addEventListener("click", (e) => { seguiu = !e.defaultPrevented; e.preventDefault(); }, { once: true }); a.click(); return seguiu ? "segue" : "barrado"; })()`;
const s = (id, v) => `(() => { const e = document.querySelector(${JSON.stringify(id)}); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", { bubbles: true })); })()`;

async function nova(opts, url, antes = "") {
  const t = await abrir("about:blank", opts);
  if (antes) await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: antes });
  await t.cmd("Page.navigate", { url });
  await ate(t, `document.readyState === "complete"`);
  await espera(800);
  return t;
}
async function cadastrar(t) {
  await t.ev(s('[data-campo="resp-nome"]', "Mae Teste"));
  await t.ev(s('[data-campo="telefone"]', "11900000004"));
  await t.ev(s('[data-campo="email"]', "m@t.com"));
  await t.ev(s('[data-campo="pin"]', "3719"));
  await t.ev(`document.querySelector('[data-acao="continuar"]').click()`);
  await t.ev(s('.cad-filho [data-campo="filho-nome"]', "Alice"));
  await t.ev(s('.cad-filho [data-campo="filho-nasc"]', "2018-02-02"));
  await t.ev(`document.querySelector('.cad-filho input[value="menina"]').click(); document.querySelector("#cad-lgpd").click(); document.querySelector('[data-acao="salvar"]').click()`);
}

for (const [nome, opts] of [["celular", { mobile: true, largura: 390, altura: 844 }], ["tablet", { mobile: true, largura: 820, altura: 1180 }], ["computador", { largura: 1280, altura: 800 }]]) {
  console.log(`\n== ${nome}`);
  // 1) 1ª entrada: o cadastro abre uma vez; "Agora não" fecha; os jogos seguem
  let t = await nova(opts, `${BASE}/index.html`);
  ok(await ate(t, CADASTRO), "1ª entrada no portal: abre o cadastro único");
  ok(!(await t.transborda()), "cadastro cabe na tela");
  await t.ev(`document.querySelector('[data-acao="depois"]').click()`);
  await espera(300);
  ok(!(await t.ev(ALGUM)), "Agora não fecha");
  for (let i = 0; i < 3; i++) { ok((await t.ev(clicaJogo)) === "segue", `toque ${i + 1} num jogo: segue`); await espera(200); }
  ok(!(await t.ev(ALGUM)), "tocar nos jogos não abre cadastro");
  await t.ev(`location.reload()`); await espera(1500);
  ok(!(await t.ev(CADASTRO)), "nesta visita não pergunta de novo");
  ok(await t.ev(`!localStorage.getItem("rabisco.familia")`), "nada do responsável foi salvo");
  const r = await t.ev(`(async () => { const F = (await import("/src/motor/familia.js")).Familia; const r = await Promise.race([F.abrirCadastro({ obrigatorio: true }), new Promise((x) => setTimeout(() => x("travou"), 1500))]); return r + "|" + !!document.querySelector(".familia-tela"); })()`);
  ok(r === "true|false", `abrirCadastro obrigatório resolve true sem abrir (${r})`);
  await t.fechar();

  // 2) preenche e salva; depois o portal não pergunta mais e o chip abre "Quem vai jogar?"
  t = await nova(opts, `${BASE}/index.html`);
  await ate(t, CADASTRO);
  await cadastrar(t);
  ok(await ate(t, `!document.querySelector(".cadastro")`), "salvou");
  ok(await t.ev(`JSON.parse(localStorage.getItem("rabisco.perfis")).perfis[0].nome === "Alice" && !!JSON.parse(localStorage.getItem("rabisco.familia")).consentimento.responsavelLegal`), "cadastro salvo (perfil Alice + consentimento)");
  ok((await t.ev(clicaJogo)) === "segue", "depois de salvar, o jogo segue");
  await t.ev(`sessionStorage.clear(); location.reload()`); await espera(1500);
  ok(!(await t.ev(ALGUM)), "nova visita: não abre cadastro");
  ok(await ate(t, `/Alice/.test(document.getElementById("familia")?.textContent || "")`, 15000), `chip mostra Alice (${await t.ev(`document.getElementById("familia")?.textContent`)})`);
  await t.ev(`document.getElementById("familia").click()`);
  ok(await ate(t, `!!document.querySelector(".quem .quem-item")`), "chip abre \"Quem vai jogar?\"");
  ok(!t.erros.length, `sem erros (${t.erros.join(" ; ")})`);
  await t.fechar();
}

console.log("\n== localStorage bloqueado (modo privado): o jogo também segue");
{
  const bloqueia = `for (const k of ["localStorage"]) Object.defineProperty(window, k, { get() { throw new DOMException("bloqueado", "SecurityError"); } });`;
  const t = await nova({ mobile: true, largura: 390, altura: 844 }, `${BASE}/index.html`, bloqueia);
  await t.ev(`document.querySelector('[data-acao="depois"]')?.click()`);
  ok((await t.ev(clicaJogo)) === "segue", "bloqueado: o toque segue para o jogo");
  ok(!t.erros.length, `bloqueado: sem erros (${t.erros.join(" ; ")})`);
  await t.fechar();
}

console.log("\n== TV e jogos abertos direto nunca abrem o cadastro");
for (const [nome, url, antes] of [
  ["/tv", `${BASE}/tv/`, ""],
  ["jogo com ?tv=1", `${BASE}/jogos/memoria/index.html?tv=1`, ""],
  ["jogo aberto direto", `${BASE}/jogos/memoria/index.html`, ""],
  ["portal com TV na sessão", `${BASE}/index.html`, `try { sessionStorage.setItem("rabisco.tv", JSON.stringify({ codigo: "ABCD", token: "x", vagas: [] })); } catch {}`],
  ["portal com ?semcadastro", `${BASE}/index.html?semcadastro`, ""],
]) {
  const t = await nova({ largura: 1280, altura: 720 }, url, antes);
  await espera(600);
  ok(!(await t.ev(ALGUM)), `${nome}: sem cadastro`);
  const r = await t.ev(`(async () => { const F = window.Familia || (await import("/src/motor/familia.js")).Familia; const r = await Promise.race([F.abrirCadastro({ obrigatorio: true }), new Promise((x) => setTimeout(() => x("travou"), 1500))]); return r + "|" + !!document.querySelector(".familia-tela"); })()`);
  ok(r === "true|false", `${nome}: abrirCadastro obrigatório resolve sem abrir (${r})`);
  await t.fechar();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : "\ntudo certo, 0 falhas");
process.exit(falhas ? 1 : 0);
