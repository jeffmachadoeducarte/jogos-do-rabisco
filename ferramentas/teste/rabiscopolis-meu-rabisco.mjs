// Rabiscolândia, tela "Meu Rabisco": abre pelo Rabifone e pela ⚙️; cada aba tem o original e pelo menos 4 opções; a escolha vale no
// Rabisco da cidade, persiste ao recarregar e convive com uniforme, veículo e casa; o original fica idêntico ao Rabisco de sempre;
// o nome da plaquinha vem do cadastro ou do campo "Como você se chama?"; o custo de desenho segue no orçamento.
// Uso: python3 -m http.server 8731 &  node --experimental-websocket ferramentas/teste/rabiscopolis-meu-rabisco.mjs [http://localhost:8731]
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8731";
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 40000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e));
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;

async function comecar(t, { familia = true, limpar = true } = {}) {
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await ate(t, "document.readyState === 'complete'");
  if (limpar) await t.ev(`localStorage.clear(); ${familia ? FAMILIA : ""}`);
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo"), "carregou e começou");
  await espera(2500);
}
const png = (t) => t.ev("(() => { const p = teste.meuRb.palco; p.renderer.render(p.cena, p.cam); return p.canvas.toDataURL(); })()");

const t = await abrir("about:blank", { largura: 1280, altura: 720 });
try {
  await comecar(t);
  // abre pelo Rabifone
  await t.ev("teste.fone.abrir()"); await espera(300);
  const apps = await t.ev("[...document.querySelectorAll('.rf-app')].map((b) => b.textContent.trim())");
  ok(apps.some((a) => /Meu Rabisco/.test(a)), `Rabifone tem o app "Meu Rabisco" (${apps.join(", ")})`);
  await t.ev("[...document.querySelectorAll('.rf-app')].find((b) => /Meu Rabisco/.test(b.textContent)).click()"); await espera(1500);
  ok(await t.ev("teste.meuRb.aberto && teste.fone.aberto === false"), "o app abre a tela e fecha o Rabifone");
  // abas: original + pelo menos 4 opções (óculos: nenhum + 4)
  const abas = await t.ev("[...document.querySelectorAll('.mrb-aba')].map((b) => b.dataset.aba)");
  ok(abas.join() === "mochila,fone,sapatos,calca,oculos", `cinco abas (${abas.join(", ")})`);
  for (const a of abas) {
    await t.ev(`document.querySelector('[data-aba=${a}]').click()`); await espera(200);
    const ops = await t.ev("[...document.querySelectorAll('.mrb-op')].map((b) => b.dataset.id)");
    ok(ops.length >= 5 && ops[0] === (a === "oculos" ? "nenhum" : "original"), `aba ${a}: original primeiro e ${ops.length - 1} opções`);
  }
  // nome do cadastro: sem campo
  ok(await t.ev("!document.querySelector('.mrb-campo') && /Alice/.test(document.querySelector('.mrb-nome').textContent)"), "com cadastro, a tela mostra o nome do cadastro e não pede outro");
  // original = Rabisco de sempre: compara com um Rabisco3D novo, sem mexer em nada, no mesmo palco e ângulo
  await t.ev("document.querySelector('[data-aba=mochila]').click(); teste.meuRb.girar(0.6)"); await espera(2500); // câmera parada no enquadramento da aba
  // as duas imagens saem no mesmo instante e na mesma pose (tempo e ângulos iguais), só muda quem é o Rabisco
  const [imgOrig, ref] = await t.ev(`(async () => {
    const { Rabisco3D } = await import("/src/motor3d/rabisco3d.js"); const p = teste.meuRb.palco, mr = teste.meuRb;
    const novo = new Rabisco3D({ raiz: "../..", altura: 2.2 }); novo.grupo.visible = false; p.cena.add(novo.grupo);
    await new Promise((r) => setTimeout(r, 1500));
    const velho = mr.rabisco; novo.grupo.rotation.y = velho.grupo.rotation.y;
    for (const r of [velho, novo]) { r.tempo = 1; r.atual = {}; r.atualizar(0, { modo: "parado" }); }
    const foto = (a, b) => { a.grupo.visible = true; b.grupo.visible = false; p.renderer.render(p.cena, p.cam); return p.canvas.toDataURL(); };
    const d = [foto(velho, novo), foto(novo, velho)]; velho.grupo.visible = true; novo.grupo.removeFromParent(); return d; })()`);
  // as duas imagens vêm de poses de "parado" um pouco diferentes (respiração): compara de perto, por pixel
  const dif = await t.ev(`(async (a, b) => { const carrega = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const [x, y] = await Promise.all([carrega(a), carrega(b)]); const c = (i) => { const k = document.createElement("canvas"); k.width = i.width; k.height = i.height; const g = k.getContext("2d"); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const d1 = c(x), d2 = c(y); let n = 0; for (let i = 0; i < d1.length; i += 4) if (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]) > 90) n++; return n / (d1.length / 4); })(${JSON.stringify(imgOrig)}, ${JSON.stringify(ref)})`);
  if (process.env.DEBUG_IMG) { const { writeFileSync } = await import('node:fs'); for (const [n, d] of [['a', imgOrig], ['b', ref]]) writeFileSync(`/tmp/orig-${n}.png`, Buffer.from(d.split(',')[1], 'base64')); }
  ok(dif < 0.004, `Rabisco original igual ao de sempre (${(dif * 100).toFixed(3)}% dos pixels diferem)`);
  // escolhas valem na hora, no Rabisco da cidade
  for (const [s, id] of [["mochila", "rosa"], ["fone", "ciano"], ["sapatos", "bota"], ["calca", "calca-rosa"], ["oculos", "coracao"]]) await t.ev(`teste.meuRb.escolher("${s}", "${id}")`);
  await espera(400);
  const p1 = await t.ev("teste.pecas");
  ok(p1.mochila === "rosa" && p1.fone === "ciano" && p1.sapatos === "bota" && p1.calca === "calca-rosa" && p1.oculos === "coracao", `as cinco peças valem no Rabisco da cidade ${JSON.stringify(p1)}`);
  ok(await t.ev("teste.rabisco.rp.mochila.visible === false"), "a mochila original some quando se escolhe outra");
  ok((await t.ev("teste.salvo.meuRabisco.mochila")) === "rosa", "a escolha fica salva no aparelho");
  // volta tudo ao original: a imagem volta igual
  for (const [s, id] of [["mochila", "original"], ["fone", "original"], ["sapatos", "original"], ["calca", "original"], ["oculos", "nenhum"]]) await t.ev(`teste.meuRb.escolher("${s}", "${id}")`);
  await espera(400);
  ok(await t.ev("teste.rabisco.rp.mochila.visible === true") && (await t.ev("JSON.stringify(Object.keys(teste.rabisco.rp.grupos))")) === "[]", "voltar ao original devolve a mochila e tira as peças novas");
  const imgVolta = await png(t);
  ok(imgVolta.length > 1000, "a prévia segue desenhando depois de voltar ao original");
  for (const [s, id] of [["mochila", "gatinho"], ["fone", "fofinho"], ["sapatos", "laranja"], ["calca", "bermuda-laranja"], ["oculos", "estrela"]]) await t.ev(`teste.meuRb.escolher("${s}", "${id}")`);
  await t.ev("teste.meuRb.fechar()"); await espera(300);
  ok(await t.ev("!teste.meuRb.aberto && teste.meuRb.palco === null"), "fechar solta a vista 3D");

  // persiste ao recarregar
  await comecar(t, { limpar: false });
  const p2 = await t.ev("teste.pecas");
  ok(p2.mochila === "gatinho" && p2.fone === "fofinho" && p2.sapatos === "laranja" && p2.calca === "bermuda-laranja" && p2.oculos === "estrela", `depois de recarregar as peças continuam ${JSON.stringify(p2)}`);
  // custo de desenho com tudo trocado, na praça
  await t.ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(1200);
  // o trânsito muda a conta de um instante para o outro: compara o mesmo instante com as peças novas e com o original
  const c = await t.ev(`(async () => { const { vestirPecas } = await import("/jogos/rabiscopolis/meu-rabisco.js"); const rb = teste.rabisco, antes = { ...rb.rp.atual };
    const m = () => teste.medir().total; const novas = m(); vestirPecas(rb, {}, { juntar: true }); const orig = m(); vestirPecas(rb, antes, { juntar: true }); return { novas, orig }; })()`);
  ok(c.orig.calls <= 250 && c.novas.calls <= 250 && c.orig.tris <= 350000 && c.novas.tris <= 350000, `orçamento na praça: original ${c.orig.calls} chamadas, com as cinco peças novas ${c.novas.calls} (≤ 250), ${Math.round(c.novas.tris / 1000)} mil triângulos (≤ 350 mil)`);
  ok(c.novas.calls - c.orig.calls <= 16, `as peças novas custam pouco desenho (+${c.novas.calls - c.orig.calls} chamadas)`);
  // uniforme, veículo e casa convivem
  await t.ev("teste.entrarLugar('bombeiros')").catch(() => {}); await espera(800);
  const lug = await t.ev("teste.emLugar?.id ?? null");
  if (lug) { await t.ev("teste.sairLugar()"); await espera(500); }
  await t.ev("teste.entrar(0)"); await espera(600);
  ok((await t.ev("teste.pecas.mochila")) === "gatinho" && !errosDeVerdade(t).length, "dentro do carro as peças seguem no Rabisco");
  await t.ev("teste.sair()"); await espera(400);
  await t.ev("teste.entrarCasa(1)").catch(() => {}); await espera(600); await t.ev("teste.sairCasa()"); await espera(400);
  // uniforme: botas escondem os sapatos escolhidos, óculos redondos escondem os de sol
  const uni = await t.ev(`(async () => { const { vestirProfissao, tirarProfissao } = await import("/jogos/rabiscopolis/roupas-rp.js"); const { ajustarUniforme } = await import("/jogos/rabiscopolis/meu-rabisco.js"); const rb = teste.rabisco;
    const vis = (s) => (rb.rp.grupos[s] ?? []).every((g) => g.visible);
    vestirProfissao(rb, "bombeiro"); ajustarUniforme(rb); const a = { sapatos: vis("sapatos"), oculos: vis("oculos") };
    vestirProfissao(rb, "professor"); ajustarUniforme(rb); const b = { sapatos: vis("sapatos"), oculos: vis("oculos") };
    tirarProfissao(rb); ajustarUniforme(rb); const c = { sapatos: vis("sapatos"), oculos: vis("oculos") }; return { a, b, c }; })()`);
  ok(!uni.a.sapatos && uni.a.oculos && uni.b.sapatos && !uni.b.oculos && uni.c.sapatos && uni.c.oculos, `uniforme manda no mesmo lugar e some ao tirar ${JSON.stringify(uni)}`);
  ok(!errosDeVerdade(t).length, `sem erro de console ${errosDeVerdade(t).slice(0, 3).join(" ; ")}`);

  // sem cadastro: campo "Como você se chama?" (até 12 letras), só no aparelho
  await comecar(t, { familia: false });
  ok(await t.ev("teste.placa === null || teste.placa.visivel === false"), "sem nome, sem plaquinha");
  await t.ev("teste.meuRb.abrir()"); await espera(1500);
  ok(await t.ev("!!document.querySelector('.mrb-campo') && document.querySelector('.mrb-campo').maxLength === 12"), "sem cadastro aparece o campo com limite de 12 letras");
  await t.ev("(() => { const i = document.querySelector('.mrb-campo'); i.value = 'Joaquim Manoel Silva'; i.dispatchEvent(new Event('input')); })()"); await espera(300);
  const pl = await t.ev("teste.placa");
  ok(pl?.visivel && pl.nome === "Joaquim Mano".slice(0, 12) || pl?.nome === "Joaquim Mano", `o campo vira a plaquinha ("${pl?.nome}")`);
  ok((await t.ev("teste.salvo.nomeRabisco")).length <= 12, "o nome é guardado só no aparelho (até 12 letras)");
  await t.ev("teste.meuRb.fechar()");
  // pela ⚙️
  await t.ev("document.querySelector('.eng-botao').click()"); await espera(500);
  ok(await t.ev("!!document.querySelector('[data-eng=meurabisco]')"), "a ⚙️ tem a opção Meu Rabisco");
  await t.ev("document.querySelector('[data-eng=meurabisco]').click()"); await espera(1200);
  ok(await t.ev("teste.meuRb.aberto"), "a opção da ⚙️ abre a tela");
  ok(!errosDeVerdade(t).length, `sem erro de console ${errosDeVerdade(t).slice(0, 3).join(" ; ")}`);
} finally { await t.fechar(); }
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
