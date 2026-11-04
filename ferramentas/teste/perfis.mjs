// Perfis da família ("Quem vai jogar?"): cadastro único na 1ª entrada (responsável + 2 filhos + o responsável jogando),
// progresso separado por perfil (Rabiscoins), troca de perfil pelo chip e pelo ⚙️ do jogo (Rabiscolândia), portão dos pais
// com PIN, apagar perfil, migração do progresso antigo (sem perfil) e "apagar tudo". Também a página de privacidade,
// o "Fale com a gente" (WhatsApp) e o envio do cadastro para a Educarte (POST/DELETE) num servidor FALSO local
// (localStorage "teste.apiCadastro"; o servidor real fica bloqueado em cdp.mjs).
// Nada toca som (cdp.mjs abre o Chrome com --mute-audio). Um navegador por vez.
// Uso: node --experimental-websocket ferramentas/teste/perfis.mjs [http://localhost:8080]
//      FOTOS=/pasta node ... → salva as telas (cadastro no celular deitado e na TV, Quem vai jogar, área dos pais, privacidade)
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync } from "node:fs";
import { createServer } from "node:http";
const BASE = process.argv[2] || "http://localhost:8080";
const FOTOS = process.env.FOTOS || "";
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 10000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(150); } return false; };
const foto = async (t, nome) => { if (FOTOS) await t.foto(`${FOTOS}/${nome}.png`); };
const J = JSON.stringify;
// nome fora do banco de vozes (assets/voz/nomes) dá 404 no HEAD: é esperado, a narradora usa a fala neutra
const errosDe = (t) => t.erros.filter((e) => !/HTTP 404 .*\/voz\/nomes\//.test(e));
// preenche um campo como gente (valor + evento input)
const preencher = (t, sel, v) => t.ev(`(() => { const e = document.querySelector(${J(sel)}); e.focus(); e.value = ${J(v)}; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); return e.value; })()`);
const clicar = (t, sel) => t.ev(`(() => { const e = document.querySelector(${J(sel)}); if (!e) return false; e.click(); return true; })()`);
const tocar = async (t, sel) => { await t.ev(`document.querySelector(${J(sel)}).scrollIntoView({ block: "center" })`); await espera(150); await t.toque(sel); };
const erroVisivel = (t) => t.ev(`[...document.querySelectorAll(".perfis-tela .erro")].map((e) => e.textContent).filter(Boolean).join(" | ")`);
const reg = (t) => t.ev(`JSON.parse(localStorage.getItem("rabisco.perfis"))`);
const saldo = (t) => t.ev(`import("/src/motor/rabiscoins.js").then((m) => m.saldo())`);
const marcar = (t) => t.ev(`window.__antes = 1`);
const recarregou = (t) => ate(t, `!window.__antes && document.readyState === "complete"`, 15000);

// ---------- servidor falso do cadastro (POST /cadastro, DELETE /cadastro/<id> com X-Segredo)
const api = { pedidos: [], falhar: false };
const servidor = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Segredo");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  let corpo = "";
  req.on("data", (c) => { corpo += c; });
  req.on("end", () => {
    if (api.falhar) { res.writeHead(503); res.end(); return; }
    api.pedidos.push({ metodo: req.method, url: req.url, segredo: req.headers["x-segredo"] || "", corpo: corpo ? JSON.parse(corpo) : null, bruto: corpo });
    res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"ok":true}');
  });
});
await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
const API = `http://127.0.0.1:${servidor.address().port}/cadastro`;
const posts = () => api.pedidos.filter((x) => x.metodo === "POST");
const esperarPedido = async (n, ms = 8000) => { const fim = Date.now() + ms; while (Date.now() < fim && api.pedidos.length < n) await espera(100); return api.pedidos.length >= n; };
const USAR_API = `try { localStorage.setItem("teste.apiCadastro", ${JSON.stringify(API)}); } catch {}`;

async function nova(opts, url, antes = "") {
  const t = await abrir("about:blank", opts);
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: `${antes};\n${USAR_API}` });
  await t.cmd("Page.navigate", { url });
  await ate(t, `document.readyState === "complete"`);
  await espera(800);
  return t;
}

// ================================================================== 1) 1ª entrada no celular deitado
console.log("\n== 1ª entrada: cadastro único (celular deitado 844x390)");
let t = await nova({ mobile: true, largura: 844, altura: 390 }, `${BASE}/index.html`);
ok(await ate(t, `!!document.querySelector(".cadastro [data-etapa='1']:not([hidden])")`), "o cadastro abre sozinho na 1ª entrada");
ok(!(await t.transborda()), "cadastro cabe na largura do celular deitado");
await foto(t, "cadastro-1-celular-deitado");
// validação amigável
await preencher(t, '[data-campo="resp-nome"]', "Maria");
await tocar(t, '[data-acao="continuar"]');
ok(/nome completo/.test(await erroVisivel(t)), "nome sem sobrenome: pede o nome completo");
await preencher(t, '[data-campo="resp-nome"]', "Maria Souza");
ok((await preencher(t, '[data-campo="telefone"]', "11987654321")) === "(11) 98765-4321", "telefone ganha a máscara (11) 98765-4321");
await preencher(t, '[data-campo="email"]', "maria@exemplo");
await clicar(t, '[data-acao="continuar"]');
ok(/e-mail/i.test(await erroVisivel(t)), "e-mail incompleto: avisa");
await preencher(t, '[data-campo="email"]', "maria@exemplo.com");
await preencher(t, '[data-campo="pin"]', "1234");
await clicar(t, '[data-acao="continuar"]');
ok(/fácil/.test(await erroVisivel(t)), "PIN 1234: pede um mais difícil");
await preencher(t, '[data-campo="pin"]', "2580");
// Enter no último campo também avança
await t.ev(`document.querySelector('[data-campo="pin"]').form.requestSubmit()`);
ok(await ate(t, `!!document.querySelector(".cadastro [data-etapa='2']:not([hidden])")`), "Continuar (Enter) leva à tela 2: quem vai jogar");
// 1ª criança + outro filho + eu também quero jogar
await preencher(t, '.cad-filho[data-filho="0"] [data-campo="filho-nome"]', "Alice");
await preencher(t, '.cad-filho[data-filho="0"] [data-campo="filho-nasc"]', "2018-03-10");
await clicar(t, '.cad-filho[data-filho="0"] input[value="menina"]');
await tocar(t, '[data-acao="mais-filho"]');
ok(await t.ev(`document.querySelectorAll(".cad-filho").length === 2`), "➕ Adicionar outro filho cria o 2º cartão");
ok(await t.ev(`document.querySelector('.cad-filho[data-filho="0"] [data-campo="filho-nome"]').value === "Alice"`), "o que já foi digitado continua lá");
await preencher(t, '.cad-filho[data-filho="1"] [data-campo="filho-nome"]', "Theo");
await preencher(t, '.cad-filho[data-filho="1"] [data-campo="filho-nasc"]', "2030-01-01");
await clicar(t, '[data-acao="salvar"]');
ok(/futuro/.test(await erroVisivel(t)), "nascimento no futuro: avisa");
await preencher(t, '.cad-filho[data-filho="1"] [data-campo="filho-nasc"]', "2015-07-01");
await clicar(t, '[data-acao="salvar"]');
ok(/menina ou menino/.test(await erroVisivel(t)), "sem menina/menino: pergunta");
await clicar(t, '.cad-filho[data-filho="1"] input[value="menino"]');
await clicar(t, "#cad-adulto");
await t.ev(`document.querySelector("#cad-adulto").dispatchEvent(new Event("change"))`);
await clicar(t, '.cad-adulto-genero input[value="menina"]');
await clicar(t, '[data-acao="salvar"]');
ok(/responsável legal/.test(await erroVisivel(t)), "sem o consentimento do responsável legal não salva");
ok(await t.ev(`!document.querySelector("#cad-novidades").checked && document.querySelector('.cad-lgpd a[href$="privacidade.html"]') !== null`), "consentimento separado do de novidades, com link da política");
await foto(t, "cadastro-2-celular-deitado");
await clicar(t, "#cad-lgpd");
await clicar(t, '[data-acao="salvar"]');
ok(await ate(t, `!document.querySelector(".cadastro")`), "salvou e fechou o cadastro");
let r = await reg(t);
ok(r?.perfis?.length === 3 && r.perfis.map((p) => p.nome).join(",") === "Alice,Theo,Maria", `3 perfis: Alice, Theo e Maria (${r?.perfis?.map((p) => p.nome)})`);
ok(r.perfis[2].tipo === "adulto" && r.perfis[0].genero === "menina" && r.perfis[1].nascimento === "2015-07-01", "tipo, gênero e nascimento guardados");
const ids = Object.fromEntries(r.perfis.map((p) => [p.nome, p.id]));
const fam = await t.ev(`JSON.parse(localStorage.getItem("rabisco.familia"))`);
ok(fam.responsavel.nome === "Maria Souza" && fam.responsavel.telefone === "(11) 98765-4321" && fam.responsavel.email === "maria@exemplo.com", "responsável: nome completo, telefone e e-mail");
ok(fam.consentimento.responsavelLegal?.aceito && fam.consentimento.responsavelLegal.versaoTermo && fam.consentimento.responsavelLegal.em && !fam.consentimento.novidades.aceito, "consentimento registrado com data/hora e versão do termo; novidades desmarcado");
ok(fam.pin?.h && !JSON.stringify(fam).includes("2580"), "PIN guardado só como impressão (o número não aparece)");
ok(!JSON.stringify(fam).match(/cpf|rg"/i) && !fam.crianca, "sem CPF/RG e sem criança dentro do cadastro (ela mora no perfil)");
ok(await esperarPedido(1), "o cadastro foi enviado para a Educarte (servidor falso)");
{
  const p = posts()[0], c = p?.corpo || {};
  ok(p?.url === "/cadastro" && /^[0-9a-f-]{36}$/.test(c.id) && /^[0-9a-f]{48}$/.test(c.segredo), "POST /cadastro com id anônimo (UUID) e segredo do aparelho");
  ok(c.responsavel?.nome === "Maria Souza" && c.responsavel.telefone === "(11) 98765-4321" && c.responsavel.email === "maria@exemplo.com", "envia o responsável (nome completo, telefone, e-mail)");
  ok(J(c.criancas) === J([{ nome: "Alice", nascimento: "2018-03-10" }, { nome: "Theo", nascimento: "2015-07-01" }]), "envia as crianças (primeiro nome e nascimento), sem o perfil do adulto");
  ok(c.consentimento?.privacidade === true && c.consentimento.versao && c.consentimento.em && c.marketing?.aceito === false, "consentimento (termo, versão, data/hora) e marketing separado (não aceito)");
  ok(!/data:image|foto|genero|rabiscoins|pin/i.test(p.bruto), "nunca vai a foto (nem gênero, PIN ou progresso)");
  ok(c.id === fam.id && c.segredo === fam.segredo, "id e segredo ficam guardados no aparelho (para atualizar e apagar)");
}
ok(await ate(t, `localStorage.getItem("rabisco.familia.fila") === null`), "enviado: nada pendente");
ok(await ate(t, `!!document.querySelector(".quem .quem-item")`), "depois do cadastro aparece \"Quem vai jogar?\"");
ok(await t.ev(`document.querySelectorAll(".quem .quem-item").length === 3`), "Quem vai jogar? mostra os 3 jogadores");
ok(await t.ev(`(() => { const a = document.querySelector('.quem [data-acao="whatsapp"]'); return !!a && a.target === "_blank" && a.rel === "noopener" && a.href.startsWith("https://wa.me/5547999236042?text="); })()`), "\"Fale com a gente\" discreto no Quem vai jogar? (WhatsApp, nova aba)");
await foto(t, "quem-vai-jogar-celular-deitado");
ok(r.ativo === ids.Alice && (await t.ev(`Familia.crianca().nome`)) === "Alice", "o 1º filho começa jogando (a narradora chama de Alice)");
ok(/Alice/.test(await t.ev(`document.getElementById("familia").textContent`)), "chip do topo mostra Alice");
await clicar(t, '.quem [data-acao="fechar"]');

// ================================================================== 2) progresso separado + troca pelo chip
console.log("\n== progresso separado por perfil + troca de perfil");
await t.ev(`import("/src/motor/rabiscoins.js").then((m) => m.ganhar(50, "teste"))`);
ok((await saldo(t)) === 50, "Alice ganhou 50 Rabiscoins");
ok(await t.ev(`localStorage.getItem("rabisco.rabiscoins.v1") === null && !!localStorage.getItem(${J(`rabisco.perfil.${ids.Alice}.rabisco.rabiscoins.v1`)})`), "a carteira mora na chave do perfil da Alice");
await clicar(t, "#familia");
ok(await ate(t, `!!document.querySelector(".quem .quem-item.ativo")`), "chip abre \"Quem vai jogar?\"");
await marcar(t);
await tocar(t, `.quem-item[data-perfil="${ids.Theo}"]`);
ok(await recarregou(t), "tocar no Theo recarrega a página");
await espera(800);
ok((await t.ev(`Familia.crianca().nome`)) === "Theo" && (await t.ev(`Familia.crianca().genero`)) === "menino", "agora joga o Theo");
ok((await saldo(t)) === 0, "Theo começa com a carteira dele (0)");
await t.ev(`import("/src/motor/rabiscoins.js").then((m) => m.ganhar(7, "teste"))`);
ok(!(await t.ev(`!!document.querySelector(".cadastro")`)), "cadastro feito: não abre de novo");
// troca com o controle: direcional + A
await t.conecta();
await clicar(t, "#familia");
await ate(t, `!!document.querySelector(".quem .quem-item")`);
await espera(300);
const alvo = await t.ev(`(() => { const f = document.activeElement; return f?.dataset?.perfil || ""; })()`);
ok(alvo === ids.Theo, "o foco começa em quem está jogando");
await t.botao(14); // ← no direcional
ok((await t.ev(`document.activeElement?.dataset?.perfil || ""`)) === ids.Alice, "← no direcional leva o foco à Alice");
await marcar(t);
await t.botao(0);
ok(await recarregou(t), "A no controle escolhe a Alice");
await espera(800);
ok((await t.ev(`Familia.crianca().nome`)) === "Alice" && (await saldo(t)) === 50, "Alice volta com os 50 dela; os 7 do Theo ficaram com ele");
await t.fechar();

// ================================================================== 3) dentro do jogo: ⚙️ → Quem vai jogar? (Rabiscolândia)
console.log("\n== dentro do jogo (Rabiscolândia): ⚙️ → Quem vai jogar?");
{
  // mesmo cadastro, montado direto no aparelho novo (a Rabiscolândia é pesada: só a troca é testada aqui)
  const prep = `if (!sessionStorage.getItem("__prep")) { sessionStorage.setItem("__prep", "1"); localStorage.clear();
    localStorage.setItem("rabisco.perfis", JSON.stringify({ v: 1, ativo: "pA", perfis: [{ id: "pA", nome: "Alice", tipo: "crianca", nascimento: "2018-03-10", genero: "menina", foto: null }, { id: "pT", nome: "Theo", tipo: "crianca", nascimento: "2015-07-01", genero: "menino", foto: null }] }));
    localStorage.setItem("rabisco.perfil.pA.rabisco.rabiscopolis.v1", JSON.stringify({ casa: 3, nomeRabisco: "" }));
    localStorage.setItem("rabisco.perfil.pT.rabisco.rabiscopolis.v1", JSON.stringify({ casa: 9, nomeRabisco: "" })); }`;
  t = await nova({ mobile: true, largura: 844, altura: 390 }, `${BASE}/jogos/rabiscopolis/`, prep);
  ok(await ate(t, `!!window.Familia && !!document.querySelector(".casca-engrenagem")`, 30000), "jogo abriu");
  ok((await t.ev(`Familia.crianca().nome`)) === "Alice" && (await t.ev(`import("/jogos/rabiscopolis/salvar.js").then((m) => m.carregar().casa)`)) === 3, "Rabiscolândia da Alice (casa 3)");
  await t.ev(`document.querySelector(".casca-engrenagem").click()`);
  ok(await ate(t, `!!document.querySelector('[data-eng="perfil"]')`), "⚙️ tem \"👤 Quem vai jogar?\"");
  ok(/Alice/.test(await t.ev(`document.querySelector('[data-eng="perfil"]').textContent`)), "mostra quem joga agora");
  await t.ev(`document.querySelector('[data-eng="perfil"]').click()`);
  ok(await ate(t, `!!document.querySelector(".quem .quem-item")`), "abre \"Quem vai jogar?\" por cima do jogo");
  await marcar(t);
  await t.ev(`document.querySelector('.quem-item[data-perfil="pT"]').click()`);
  ok(await recarregou(t), "trocar recarrega o jogo");
  await ate(t, `!!window.Familia`, 30000);
  ok((await t.ev(`Familia.crianca().nome`)) === "Theo" && (await t.ev(`import("/jogos/rabiscopolis/salvar.js").then((m) => m.carregar().casa)`)) === 9, "Rabiscolândia do Theo (casa 9)");
  ok(!errosDe(t).length, `sem erros no jogo ${errosDe(t).join(" ; ")}`);
  await t.fechar();
}

// ================================================================== 4) área dos pais: portão com PIN, apagar perfil
console.log("\n== área dos pais: PIN, apagar perfil");
{
  const prep = `if (!sessionStorage.getItem("__prep")) { sessionStorage.setItem("__prep", "1"); localStorage.clear(); }`;
  t = await nova({ largura: 1280, altura: 800 }, `${BASE}/index.html`, prep);
  // cadastro rápido pela própria tela
  await ate(t, `!!document.querySelector(".cadastro")`);
  await preencher(t, '[data-campo="resp-nome"]', "João Pereira Lima");
  await preencher(t, '[data-campo="telefone"]', "21912345678");
  await preencher(t, '[data-campo="email"]', "joao@exemplo.com.br");
  await preencher(t, '[data-campo="pin"]', "4826");
  await clicar(t, '[data-acao="continuar"]');
  await preencher(t, '.cad-filho[data-filho="0"] [data-campo="filho-nome"]', "Bia");
  await preencher(t, '.cad-filho[data-filho="0"] [data-campo="filho-nasc"]', "2016-05-20");
  await clicar(t, '.cad-filho[data-filho="0"] input[value="menina"]');
  await clicar(t, '[data-acao="mais-filho"]');
  await preencher(t, '.cad-filho[data-filho="1"] [data-campo="filho-nome"]', "Davi");
  await preencher(t, '.cad-filho[data-filho="1"] [data-campo="filho-nasc"]', "2019-01-02");
  await clicar(t, '.cad-filho[data-filho="1"] input[value="menino"]');
  await clicar(t, "#cad-lgpd");
  await clicar(t, "#cad-novidades");
  api.falhar = true; // servidor fora do ar / sem internet
  const antesEnvio = api.pedidos.length;
  await clicar(t, '[data-acao="salvar"]');
  await ate(t, `!!document.querySelector(".quem .quem-item")`);
  await espera(800);
  ok(await t.ev(`!!JSON.parse(localStorage.getItem("rabisco.familia.fila"))?.id`), "servidor fora: o cadastro fica guardado para tentar de novo (o jogo segue)");
  api.falhar = false;
  await t.ev(`Familia.sincronizar()`);
  ok(await esperarPedido(antesEnvio + 1) && (await ate(t, `localStorage.getItem("rabisco.familia.fila") === null`)), "tentou de novo e enviou");
  const idFam = posts().at(-1).corpo.id, segFam = posts().at(-1).corpo.segredo;
  ok(posts().at(-1).corpo.marketing.aceito === true && posts().at(-1).corpo.marketing.em, "aceite de novidades e pedidos de opinião vai com data/hora");
  r = await reg(t);
  const bia = r.perfis[0].id, davi = r.perfis[1].id;
  await t.ev(`import("/src/motor/rabiscoins.js").then((m) => m.ganhar(30, "teste"))`);
  await t.ev(`localStorage.setItem(${J(`rabisco.perfil.${davi}.rabisco.rabiscoins.v1`)}, JSON.stringify({ saldo: 12, ganhos: {}, comprados: [], total: 12 }))`);
  await clicar(t, '.quem [data-acao="pais"]');
  ok(await ate(t, `!!document.querySelector(".portao-tela #portao-resposta")`), "Área dos pais pede o portão");
  ok(/PIN/.test(await t.ev(`document.querySelector(".portao-pergunta").textContent`)), "o portão pede o PIN (não uma conta fácil)");
  await preencher(t, "#portao-resposta", "1111");
  await t.ev(`document.querySelector(".portao-form").requestSubmit()`);
  ok(/errado/.test(await erroVisivel(t)) && !(await t.ev(`!!document.querySelector(".pais-lista")`)), "PIN errado não entra");
  await preencher(t, "#portao-resposta", "9999");
  await t.ev(`document.querySelector(".portao-form").requestSubmit()`);
  ok(await t.ev(`!document.querySelector(".portao-esqueci").hidden`), "depois de 2 erros aparece \"Esqueci o PIN\"");
  await preencher(t, "#portao-resposta", "4826");
  await t.ev(`document.querySelector(".portao-form").requestSubmit()`);
  ok(await ate(t, `!!document.querySelector(".pais-lista")`), "PIN certo abre a área dos pais");
  ok(await t.ev(`document.querySelectorAll(".pais-jogador").length === 2 && !!document.querySelector('.pais-privacidade a[href$="privacidade.html"]') && !!document.querySelector('[data-acao="apagar-tudo"]')`), "lista os jogadores, link da política e \"Apagar tudo\"");
  const zap = await t.ev(`(() => { const a = document.querySelector('.pais [data-acao="whatsapp"]'); return a ? { href: a.href, alvo: a.target, rel: a.rel } : null; })()`);
  const msg = zap ? decodeURIComponent(new URL(zap.href).searchParams.get("text") || "") : "";
  ok(zap && zap.href.startsWith("https://wa.me/5547999236042?text=") && zap.alvo === "_blank" && zap.rel === "noopener", "área dos pais: \"Fale com a gente\" abre o WhatsApp (47) 99923-6042 em nova aba");
  ok(/^Olá! Sou João, responsável por Bia e Davi, e vim pelo Jogo do Rabisco 🎨/.test(msg), `mensagem pronta com o nome (${msg})`);
  await foto(t, "area-dos-pais");
  // apagar o Davi (cancela primeiro, depois confirma)
  await clicar(t, `.pais-jogador[data-perfil="${davi}"] [data-acao="apagar"]`);
  ok(await ate(t, `!!document.querySelector(".confirmar")`), "apagar perfil pede confirmação");
  await clicar(t, '.confirmar [data-acao="nao"]');
  ok((await reg(t)).perfis.length === 2, "Cancelar não apaga");
  await clicar(t, `.pais-jogador[data-perfil="${davi}"] [data-acao="apagar"]`);
  await ate(t, `!!document.querySelector(".confirmar")`);
  await clicar(t, '.confirmar [data-acao="sim"]');
  await espera(300);
  r = await reg(t);
  ok(r.perfis.length === 1 && r.perfis[0].id === bia, "Davi apagado; Bia continua");
  await espera(500);
  ok(posts().at(-1).corpo.id === idFam && J(posts().at(-1).corpo.criancas.map((c) => c.nome)) === J(["Bia"]), "apagar o Davi atualiza o cadastro na Educarte (mesmo id, sem duplicar)");
  ok(await t.ev(`!Object.keys(localStorage).some((k) => k.startsWith(${J(`rabisco.perfil.${davi}.`)}))`), "o progresso do Davi saiu junto");
  ok((await saldo(t)) === 30, "as moedas da Bia ficaram");
  // adicionar jogador pela área (eu também quero jogar)
  await clicar(t, '[data-acao="novo-adulto"]');
  ok(await ate(t, `!!document.querySelector(".editar [data-campo='perfil-nome']")`), "\"Eu também quero jogar\" abre o perfil do adulto");
  ok((await t.ev(`document.querySelector(".editar [data-campo='perfil-nome']").value`)) === "João", "já vem com o primeiro nome do responsável");
  await clicar(t, '.editar input[value="menino"]');
  await clicar(t, '[data-acao="salvar-perfil"]');
  await espera(300);
  ok((await reg(t)).perfis.some((p) => p.tipo === "adulto" && p.nome === "João"), "perfil do responsável criado");
  await clicar(t, '.pais [data-acao="fechar"]');
  await espera(300);
  ok(!(await t.ev(`!!document.querySelector(".perfis-tela")`)), "Fechar fecha a área dos pais");
  // portão antigo (sem PIN): conta de 2 algarismos × 1
  await t.ev(`(() => { const f = JSON.parse(localStorage.getItem("rabisco.familia")); f.pin = null; localStorage.setItem("rabisco.familia", JSON.stringify(f)); })()`);
  await marcar(t); await t.ev(`location.reload()`); await recarregou(t); await espera(600);
  await t.ev(`Familia.portaoDosPais()`.replace("Familia.portaoDosPais()", `(window.__p = Familia.portaoDosPais(), 1)`));
  await ate(t, `!!document.querySelector(".portao-conta")`);
  const [a, b] = (await t.ev(`document.querySelector(".portao-conta").textContent`)).split("×").map(Number);
  ok(a >= 12 && a <= 19 && b >= 6 && b <= 9, `sem PIN: conta difícil de cabeça (${a} × ${b})`);
  await clicar(t, ".portao-tela .botao.branco");
  ok(!errosDe(t).length, `sem erros (${errosDe(t).join(" ; ")})`);
  await t.fechar();
}

// ================================================================== 5) migração do progresso antigo (sem perfil)
console.log("\n== migração: progresso antigo vai para o 1º perfil, sem perder nada");
{
  const FOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
  const antigos = {
    "rabisco.rabiscoins.v1": J({ saldo: 321, ganhos: { "rabiscolandia:missao:padaria": 2 }, comprados: ["rabiscolandia:chapeu:coroa"], total: 400 }),
    "rabisco.rabiscopolis.v1": J({ casa: 7, corCasa: 16711680, moveis: { 7: { sofa: { id: "sofa1" } } }, selos: ["a"], missoesFeitas: ["padaria"], album: { figs: ["a:pessoa-1", "a:lugar-2"] }, diario: { seq: 4 }, bichinho: { atual: "gato" } }),
    "rabisco-memoria-niveis": J({ 1: true, 2: true }),
    "superRabiscoEstrelas": J({ 1: true }),
    "superRabiscoSilabas-fases": J({ 1: true }),
    "kart-cores-medalhas": J({ 1: 1 }),
    "rabisco-arca-recorde": "42",
  };
  const antes = `if (!sessionStorage.getItem("__prep")) { sessionStorage.setItem("__prep", "1"); localStorage.clear();
    localStorage.setItem("rabisco.familia", ${J(J({ responsavel: { nome: "Ana Lima", email: "ana@exemplo.com", whatsapp: "(31) 99876-5432", cidade: "BH", uf: "MG" }, crianca: { nome: "Lara", nascimento: "2017-09-09", genero: "menina", foto: FOTO }, consentimento: { novidades: true, em: "2026-10-01T10:00:00.000Z" }, criadoEm: "2026-10-01T10:00:00.000Z" }))});
    for (const [k, v] of Object.entries(${J(antigos)})) localStorage.setItem(k, v);
    localStorage.setItem("rabisco.som", "0"); }`;
  t = await nova({ mobile: true, largura: 390, altura: 844 }, `${BASE}/index.html`, antes);
  r = await reg(t);
  const lara = r?.perfis?.[0];
  ok(r?.perfis?.length === 1 && lara.nome === "Lara" && lara.foto === FOTO && lara.genero === "menina" && lara.nascimento === "2017-09-09", "a criança do cadastro antigo virou o 1º perfil (com a foto)");
  const migrado = await t.ev(`(() => { const o = {}; for (const k of ${J(Object.keys(antigos))}) o[k] = { velho: localStorage.getItem(k), novo: localStorage.getItem(${J(`rabisco.perfil.${lara.id}.`)} + k) }; return o; })()`);
  for (const [k, v] of Object.entries(antigos)) ok(migrado[k].velho === null && migrado[k].novo === v, `migrou ${k} sem mudar nada`);
  ok(r.migracao?.chaves?.length === Object.keys(antigos).length, "a migração ficou registrada (data e chaves)");
  ok(await t.ev(`localStorage.getItem("rabisco.som") === "0"`), "preferência do aparelho (som) fica do aparelho");
  ok((await saldo(t)) === 321, "Rabiscoins antigos aparecem (321)");
  ok((await t.ev(`import("/jogos/rabiscopolis/salvar.js").then((m) => m.carregar())`)).album.figs.length === 2, "álbum da Rabiscolândia continua");
  const famV2 = await t.ev(`JSON.parse(localStorage.getItem("rabisco.familia"))`);
  ok(famV2.v === 2 && !famV2.crianca && famV2.responsavel.telefone === "(31) 99876-5432" && famV2.consentimento.novidades.aceito, "cadastro antigo convertido (WhatsApp → telefone, novidades mantido)");
  ok((await t.ev(`Familia.crianca().nome`)) === "Lara", "a narradora continua chamando a Lara");
  // cadastro antigo não tinha o consentimento do responsável legal: o questionário abre já preenchido
  ok(await ate(t, `!!document.querySelector(".cadastro")`), "cadastro antigo: abre o questionário para confirmar e consentir");
  ok((await t.ev(`document.querySelector('[data-campo="resp-nome"]').value`)) === "Ana Lima", "já vem preenchido com o responsável");
  ok(!(await t.transborda()), "cadastro cabe no celular em pé");
  await preencher(t, '[data-campo="pin"]', "7391");
  await clicar(t, '[data-acao="continuar"]');
  ok((await t.ev(`document.querySelector('.cad-filho[data-filho="0"] [data-campo="filho-nome"]').value`)) === "Lara", "a Lara já está no cartão");
  await clicar(t, "#cad-lgpd");
  await clicar(t, '[data-acao="salvar"]');
  await ate(t, `!document.querySelector(".cadastro")`);
  r = await reg(t);
  ok(r.perfis.length === 1 && r.perfis[0].id === lara.id && r.perfis[0].foto === FOTO, "confirmar não duplica nem perde a Lara (mesmo perfil, mesma foto)");
  ok((await saldo(t)) === 321, "e as moedas continuam");
  // uma página antiga (cache) grava a chave sem perfil de novo: entra no perfil ativo na próxima carga
  await t.ev(`localStorage.setItem("rabisco.rabiscoins.v1", JSON.stringify({ saldo: 400, ganhos: {}, comprados: [], total: 480 }))`);
  await marcar(t); await t.ev(`location.reload()`); await recarregou(t); await espera(500);
  ok((await saldo(t)) === 400 && (await t.ev(`localStorage.getItem("rabisco.rabiscoins.v1") === null`)), "chave antiga gravada depois também é trazida para o perfil");
  ok(!errosDe(t).length, `sem erros (${errosDe(t).join(" ; ")})`);

  // ================================================================== 6) apagar tudo
  console.log("\n== apagar todos os dados deste aparelho");
  await clicar(t, "#familia");
  await ate(t, `!!document.querySelector(".quem")`);
  await clicar(t, '.quem [data-acao="pais"]');
  await ate(t, `!!document.querySelector("#portao-resposta")`);
  await preencher(t, "#portao-resposta", "7391");
  await t.ev(`document.querySelector(".portao-form").requestSubmit()`);
  await ate(t, `!!document.querySelector('[data-acao="apagar-tudo"]')`);
  await clicar(t, '[data-acao="apagar-tudo"]');
  await ate(t, `!!document.querySelector(".confirmar")`);
  await clicar(t, '.confirmar [data-acao="nao"]');
  ok(await t.ev(`!!localStorage.getItem("rabisco.familia")`), "Cancelar não apaga nada");
  await clicar(t, '[data-acao="apagar-tudo"]');
  await ate(t, `!!document.querySelector(".confirmar")`);
  await marcar(t);
  await clicar(t, '.confirmar [data-acao="sim"]');
  ok(await recarregou(t), "apagou e recarregou");
  {
    const lara = posts().filter((x) => x.corpo?.criancas?.[0]?.nome === "Lara").at(-1)?.corpo;
    const del = api.pedidos.filter((x) => x.metodo === "DELETE").at(-1);
    ok(lara && del && del.url === `/cadastro/${lara.id}` && del.segredo === lara.segredo, "apagar tudo pede DELETE /cadastro/<id> com X-Segredo ao servidor");
    ok(lara?.marketing?.aceito === true, "o aceite de novidades do cadastro antigo foi mantido no envio");
  }
  await espera(600);
  const sobrou = await t.ev(`Object.keys(localStorage).filter((k) => k !== "rabisco.perfis")`);
  ok(sobrou.length === 0, `nada da família ficou no aparelho (sobrou: ${sobrou.join(", ") || "nada"})`);
  ok((await reg(t)).perfis.length === 1 && !(await reg(t)).perfis[0].nome && (await saldo(t)) === 0, "começa do zero, com um perfil vazio");
  ok(await ate(t, `!!document.querySelector(".cadastro")`), "e o cadastro da 1ª entrada aparece de novo");
  await clicar(t, '[data-acao="depois"]');
  await espera(300);
  ok(!(await t.ev(`!!document.querySelector(".cadastro")`)), "\"Agora não\" fecha");
  ok(await t.ev(`(() => { const a = document.querySelector("a.jogo.pronto"); if (!a) return false; let seguiu = false; a.addEventListener("click", (e) => { seguiu = !e.defaultPrevented; e.preventDefault(); }, { once: true }); a.click(); return seguiu; })()`), "tocar num jogo segue direto (nenhum cadastro barra)");
  await marcar(t); await t.ev(`location.reload()`); await recarregou(t); await espera(800);
  ok(!(await t.ev(`!!document.querySelector(".cadastro")`)), "\"Agora não\": não pergunta de novo nesta visita");
  await t.fechar();
}

// ================================================================== 7) TV 1920x1080 + privacidade
console.log("\n== TV 1920x1080 e página de privacidade");
{
  t = await nova({ largura: 1920, altura: 1080 }, `${BASE}/index.html`);
  ok(await ate(t, `!!document.querySelector(".cadastro")`), "TV: cadastro abre");
  await foto(t, "cadastro-1-tv-1920x1080");
  await preencher(t, '[data-campo="resp-nome"]', "Maria Souza");
  await preencher(t, '[data-campo="telefone"]', "11987654321");
  await preencher(t, '[data-campo="email"]', "maria@exemplo.com");
  await preencher(t, '[data-campo="pin"]', "2580");
  await clicar(t, '[data-acao="continuar"]');
  await clicar(t, '[data-acao="mais-filho"]');
  await foto(t, "cadastro-2-tv-1920x1080");
  await preencher(t, '.cad-filho[data-filho="0"] [data-campo="filho-nome"]', "Alice");
  await preencher(t, '.cad-filho[data-filho="0"] [data-campo="filho-nasc"]', "2018-03-10");
  await clicar(t, '.cad-filho[data-filho="0"] input[value="menina"]');
  await preencher(t, '.cad-filho[data-filho="1"] [data-campo="filho-nome"]', "Theo");
  await preencher(t, '.cad-filho[data-filho="1"] [data-campo="filho-nasc"]', "2015-07-01");
  await clicar(t, '.cad-filho[data-filho="1"] input[value="menino"]');
  await clicar(t, "#cad-lgpd");
  await clicar(t, '[data-acao="salvar"]');
  ok(await ate(t, `!!document.querySelector(".quem .quem-item")`), "TV: Quem vai jogar?");
  await espera(400);
  await foto(t, "quem-vai-jogar-tv-1920x1080");
  ok(!errosDe(t).length, `sem erros (${errosDe(t).join(" ; ")})`);
  await t.fechar();

  t = await nova({ mobile: true, largura: 390, altura: 844 }, `${BASE}/privacidade.html`);
  ok(await t.ev(`document.body.textContent.includes("só neste aparelho") && document.body.textContent.includes("servidor da Educarte") && !!document.querySelector('a[href^="https://wa.me/5547999236042"][target="_blank"][rel="noopener"]')`), "privacidade: linguagem simples, diz o que vai para o servidor e tem o WhatsApp de contato");
  ok(!(await t.transborda()), "privacidade cabe no celular");
  await foto(t, "privacidade-celular");
  await t.fechar();
}

// ================================================================== 8) modo privado (localStorage bloqueado)
console.log("\n== localStorage bloqueado: nada quebra");
{
  const bloqueia = `Object.defineProperty(window, "localStorage", { get() { throw new DOMException("bloqueado", "SecurityError"); } });`;
  t = await nova({ mobile: true, largura: 390, altura: 844 }, `${BASE}/index.html`, bloqueia);
  ok(await t.ev(`!!window.Perfis && Perfis.lista().length === 1`), "bloqueado: perfis em memória");
  ok(!errosDe(t).length, `bloqueado: sem erros (${errosDe(t).join(" ; ")})`);
  await t.fechar();
}

servidor.close();
ok(!api.pedidos.some((x) => /data:image/.test(x.bruto)), `nenhum dos ${api.pedidos.length} pedidos ao servidor levou foto`);
console.log(falhas ? `\n${falhas} FALHA(S)` : "\ntudo certo, 0 falhas");
process.exit(falhas ? 1 : 0);
