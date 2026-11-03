// Rabiscolândia: Rabiscoins e o Ateliê Ponta do Lápis (loja de visual). Confere, num aparelho novo (perfil do Chrome vazio):
//  - concluir uma missão de verdade rende Rabiscoins (1ª vez 20; repetir, 5), com o contador do HUD e a animação de ganho;
//  - o saldo, as compras e o que está vestido continuam depois de recarregar a página;
//  - a loja abre e fecha pelo teclado (F na porta, Esc) e pelo toque (✋ na porta, ✓ Pronto), e também pelo Rabifone;
//  - sem saldo a compra é recusada (nada muda); com saldo, compra, desconta e já veste;
//  - equipar aparece no Rabisco da cidade (grafo de cena: camiseta, chapéu, aba do boné) e trocar volta o original;
//  - a pintura comprada vale no veículo chamado pelo Rabifone (cor da lataria no grafo de cena);
//  - chamadas de desenho dentro do orçamento (TV ≤ 250, celular ≤ 180) na praça e na frente da loja; sem erro de console.
// Uso: node --experimental-websocket ferramentas/teste/rabiscopolis-loja.mjs <http://localhost:porta> [pasta das fotos]
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const [BASE = "http://localhost:8099", PASTA = fileURLToPath(new URL("../../.claude/tmp/loja/", import.meta.url))] = process.argv.slice(2);
const OUT = PASTA.endsWith("/") ? PASTA : `${PASTA}/`;
mkdirSync(OUT, { recursive: true });
const URL_JOGO = `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo`;
const CEL = { mobile: true, largura: 844, altura: 390, agente: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1" };
const ate = async (t, expr, ms = 90000, passo = 150) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)|favicon|fonts\.g/.test(e));
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const tecla = async (t, code) => {
  const kc = { KeyF: 70, Escape: 27, ArrowRight: 39, ArrowLeft: 37, ArrowDown: 40, ArrowUp: 38, Enter: 13 }[code];
  const key = code === "Escape" ? "Escape" : code === "Enter" ? "Enter" : code.startsWith("Arrow") ? code : code.replace(/^Key/, "").toLowerCase();
  await t.cmd("Input.dispatchKeyEvent", { type: "keyDown", code, key, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
  await t.cmd("Input.dispatchKeyEvent", { type: "keyUp", code, key, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
  await espera(250);
};
async function esperarJogo(t) {
  if (!(await ate(t, "Boolean(window.teste?.vivo && window.teste.mundo && window.teste.rabisco)"))) throw new Error("o jogo não abriu: " + t.erros.join(" | "));
  await espera(2500);
}
const PORTA = "(() => { const l = teste.mundo.lugares.find((q) => q.id === 'atelie'); return [l.x, l.z, l.porta]; })()";
const irNaPorta = async (t) => { const [x, z] = await t.ev(PORTA); await t.ev(`teste.ir(${x - 1.2}, ${z}); teste.olhar(Math.PI / 2)`); await espera(700); };
// conclui a missão do treino de verdade (aceitar → o evento lá dentro → voltar até a treinadora e apertar a ação)
async function missaoTreino(t) {
  await t.ev("teste.missoes.aceitar('exercicio')"); await espera(300);
  await t.ev("teste.missoes.evento('treinou')"); await espera(300);
  const n = await t.ev("teste.missoes.npc('exercicio', 'treinadora')");
  await t.ev(`teste.ir(${n.x + 1.3}, ${n.z + 0.4})`); await espera(600);
  for (let i = 0; i < 6 && !(await t.ev("teste.missoes.ativa === null")); i++) { await t.ev("teste.acao()"); await espera(500); }
  return ate(t, "teste.missoes.ativa === null && teste.missoes.feitas.includes('exercicio')", 8000);
}
const SALDO = "teste.Rabiscoins.saldo()";
const CONTADOR = "Number(document.querySelector('.rbc-contador b')?.textContent)";

// ================================================================ TV/computador (teclado)
{
  const t = await abrir(URL_JOGO, { largura: 1280, altura: 720 });
  await esperarJogo(t);
  ok(await t.ev(SALDO) === 0 && await t.ev(CONTADOR) === 0, "aparelho novo: 0 Rabiscoins e o contador do HUD mostra 0");
  ok(await t.ev("document.querySelectorAll('.hud-rp .rbc-contador .rbc-moeda').length") === 1, "contador com a moedinha desenhada (svg)");

  // ---- custo de desenho antes de vestir qualquer coisa
  const medir = async (rotulo, teto) => {
    const m = {};
    for (const [nome, [x, z, yaw]] of Object.entries({ "praça": [0, 33, Math.PI], "frente da loja": [17, 20, Math.PI / 2], "porta da loja": [21.5, 20, Math.PI / 2], "loja de lado": [20, 40, 2.4] })) {
      await t.ev(`teste.ir(${x}, ${z}); teste.olhar(${yaw})`); await espera(900);
      m[nome] = (await t.ev("teste.medir().total")).calls;
      ok(m[nome] <= teto, `${rotulo}, ${nome}: ${m[nome]} chamadas (≤ ${teto})`);
    }
    return m;
  };
  const tvAntes = await medir("TV", 250);

  // ---- ganhar moedas ao concluir missão (1ª vez 20; repetir 5)
  ok(await missaoTreino(t), "missão do treino concluída de verdade");
  ok(await ate(t, `${SALDO} === 20`, 3000), `concluir a missão rendeu 20 Rabiscoins (saldo ${await t.ev(SALDO)})`);
  ok(await ate(t, "document.querySelector('.rbc-mais, .rbc-voa') != null", 8000, 60), "apareceu a animação de ganho (+20 e as moedinhas)");
  ok(await ate(t, `${CONTADOR} === 20`, 5000), "o contador do HUD contou até 20");
  await espera(2000);
  ok(await missaoTreino(t), "a mesma missão de novo");
  ok(await ate(t, `${SALDO} === 25`, 3000), `repetir a missão rende menos: +5 (saldo ${await t.ev(SALDO)})`);

  // ---- recarregar: o saldo continua
  await t.cmd("Page.reload"); await esperarJogo(t);
  ok(await t.ev(SALDO) === 25 && await ate(t, `${CONTADOR} === 25`, 3000), "depois de recarregar: 25 Rabiscoins no saldo e no contador");

  // ---- a loja abre e fecha pelo teclado
  await irNaPorta(t);
  ok((await t.ev("teste.contexto")) === "🎨 Entrar no Ateliê", `na porta do Ateliê a ação é "${await t.ev("teste.contexto")}"`);
  await tecla(t, "KeyF"); await espera(900);
  ok(await t.ev("teste.atelie.aberto"), "F abriu a loja");
  ok(await t.ev("document.querySelectorAll('.atl-aba').length") === 5 && await t.ev("document.querySelectorAll('.atl-item').length") >= 4, "loja com 5 abas e as peças da aba");
  ok(Number(await t.ev("document.querySelector('.atl-saldo b').textContent")) === 25, "o saldo aparece na loja");
  ok(await t.ev("teste.atelie.rabisco != null && teste.atelie.palco != null"), "prévia do Rabisco girando na vitrine");
  // navegar pelo teclado prova a peça no Rabisco da vitrine (sem comprar)
  await tecla(t, "ArrowDown"); await tecla(t, "ArrowRight"); await espera(300);
  const provando = await t.ev("teste.atelie.selecionado?.id");
  ok(Boolean(provando) && await t.ev(SALDO) === 25, `andar pelas peças só prova (${provando}); nada foi comprado`);
  await tecla(t, "Escape"); await espera(500);
  ok(!(await t.ev("teste.atelie.aberto")), "Esc fechou a loja");

  // ---- recusar sem saldo
  await t.ev("teste.abrirAtelie('chapeu')"); await espera(800);
  await t.ev("teste.atelie.escolher('coroa'); teste.atelie.fazer()"); await espera(300);
  ok(await t.ev(SALDO) === 25 && !(await t.ev("teste.Rabiscoins.tem('rabiscolandia:chapeu:coroa')")), "sem saldo (coroa por 200): a compra é recusada e o saldo fica igual");
  ok(await t.ev("document.querySelector('.atl-acao').classList.contains('falta') && /Faltam/.test(document.querySelector('.atl-acao').textContent)"), `o botão mostra quanto falta ("${await t.ev("document.querySelector('.atl-acao').textContent.replace(/\\s+/g, ' ').trim()")}")`);
  ok((await t.ev("teste.pecas.chapeu")) === "original", "nada foi vestido");

  // ---- comprar com saldo: boné rosa por 20 → saldo 5, já vestido, e o boné do Rabisco da cidade fica rosa
  await t.ev("teste.atelie.escolher('bone-rosa'); teste.atelie.fazer()"); await espera(400);
  ok(await t.ev(SALDO) === 5 && await t.ev("teste.Rabiscoins.tem('rabiscolandia:chapeu:bone-rosa')"), `comprou o boné rosa por 20 (saldo ${await t.ev(SALDO)})`);
  ok((await t.ev("teste.pecas.chapeu")) === "bone-rosa", "o boné rosa já foi vestido");
  ok(await t.ev("teste.rabisco.bone.material.color.getHexString() === 'f14ba8' && teste.rabisco.aba.material.color.getHexString() === 'f14ba8'"), "grafo de cena: boné e aba do Rabisco da cidade ficaram rosa");
  ok(Number(await t.ev("document.querySelector('.atl-saldo b').textContent")) === 5, "o saldo da loja baixou para 5");

  // ---- equipar e ver no Rabisco: camiseta e cartola (mais moedas para o teste)
  await t.ev("teste.Rabiscoins.ganhar(400, 'teste')");
  await t.ev("teste.atelie.aba('camiseta'); teste.atelie.escolher('rosa'); teste.atelie.fazer()");
  await t.ev("teste.atelie.aba('chapeu'); teste.atelie.escolher('cartola'); teste.atelie.fazer()"); await espera(400);
  const cena = await t.ev(`(() => { const rb = teste.rabisco, g = rb.rp.grupos; const naCena = (o) => { for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p === teste.cena) return true; } return false; };
    const malhas = (gs) => (gs ?? []).flatMap((x) => { const l = []; x.traverse((o) => { if (o.isMesh) l.push(o); }); return l; });
    const cam = malhas(g.camiseta), cha = malhas(g.chapeu);
    const corCam = cam.some((m) => m.material.color?.getHexString() === 'f14ba8' || (m.geometry.attributes.color && m.material.vertexColors));
    return { cam: cam.length, camVisivel: (g.camiseta ?? []).every(naCena), noTronco: (g.camiseta ?? [])[0]?.parent === rb.tronco, mangas: (g.camiseta ?? []).slice(1).every((x) => x.parent === rb.bracoE.ombro || x.parent === rb.bracoD.ombro), corCam, cha: cha.length, chaVisivel: (g.chapeu ?? []).every(naCena), aba: rb.pivoAba.visible, bone: rb.bone.material.color.getHexString() }; })()`);
  ok(cena.cam > 0 && cena.camVisivel && cena.noTronco && cena.mangas && cena.corCam, `grafo de cena: camiseta rosa no tronco e nas mangas do Rabisco da cidade (${JSON.stringify(cena)})`);
  ok(cena.cha > 0 && cena.chaVisivel && !cena.aba && cena.bone !== "f14ba8", "grafo de cena: cartola na cabeça, a aba do boné escondida e o boné voltou ao laranja");
  ok(JSON.stringify(await t.ev("[teste.pecas.camiseta, teste.pecas.chapeu]")) === '["rosa","cartola"]', "vestido: camiseta rosa e cartola");
  // trocar de volta ao original e vestir de novo (o que já é seu não cobra de novo)
  const s0 = await t.ev(SALDO);
  await t.ev("teste.atelie.aba('chapeu'); teste.atelie.escolher('cartola'); teste.atelie.fazer()"); await espera(300);
  ok((await t.ev("teste.pecas.chapeu")) === "original" && await t.ev("teste.rabisco.pivoAba.visible && !(teste.rabisco.rp.grupos.chapeu?.length)"), "↩ Tirar: volta o boné original com a aba");
  await t.ev("teste.atelie.escolher('cartola'); teste.atelie.fazer()"); await espera(300);
  ok((await t.ev("teste.pecas.chapeu")) === "cartola" && await t.ev(SALDO) === s0, "vestir de novo o que já é seu não cobra nada");
  await t.ev("teste.atelie.fechar()");

  // ---- pintura: helicóptero laranja e carro roxo, chamados pelo Rabifone
  await t.ev("teste.abrirAtelie('veiculo')"); await espera(800);
  ok(await t.ev("teste.atelie.escolher('heli-laranja') && teste.atelie.veiculo != null"), "a aba Pinturas mostra o veículo girando na vitrine");
  await t.ev("teste.atelie.fazer(); teste.atelie.escolher('carro-roxo'); teste.atelie.fazer(); teste.atelie.fechar()"); await espera(300);
  ok(JSON.stringify(await t.ev("teste.salvo.pinturas")) === '{"heli":"heli-laranja","carro":"carro-roxo"}', `pinturas guardadas (${JSON.stringify(await t.ev("teste.salvo.pinturas"))})`);
  await t.ev("teste.ir(0, 20); teste.olhar(0)"); await espera(400);
  ok((await t.ev("teste.garagem('heli')")) != null, "helicóptero chamado pelo Rabifone");
  const corHeli = await t.ev(`(() => { const v = teste.garagemAtual, C = teste.rabisco.bone.material.color.constructor, alvo = new C(0xff7a00), azul = new C(0x00b5f0); let laranja = 0, az = 0;
    v.g.traverse((o) => { const a = o.geometry?.attributes?.color; if (!a) return; for (let i = 0; i < a.count; i++) { const d = (c) => Math.abs(a.getX(i) - c.r) + Math.abs(a.getY(i) - c.g) + Math.abs(a.getZ(i) - c.b); if (d(alvo) < 0.02) laranja++; if (d(azul) < 0.02) az++; } });
    return { tipo: v.tipo, cor: v.cor.toString(16), laranja, az }; })()`);
  ok(corHeli.tipo === "heli" && corHeli.cor === "ff7a00" && corHeli.laranja > 100 && corHeli.az === 0, `grafo de cena: o helicóptero saiu laranja, sem o azul de fábrica (${JSON.stringify(corHeli)})`);
  await t.ev("teste.fone.abrir('garagem')"); await espera(300);
  ok((await t.ev("document.querySelector('.rabifone .rf-item').textContent")).includes("Carro roxo"), "a Garagem do Rabifone mostra o carro pintado primeiro");
  await t.ev("document.querySelector('.rabifone .rf-item').click()"); await espera(400);
  ok((await t.ev("teste.garagemAtual?.cor?.toString(16)")) === "8e6cff", "o carro chamado saiu roxo");

  // ---- Rabifone: app do Ateliê com o saldo e "Abrir a loja"
  await t.ev("teste.fone.abrir('atelie')"); await espera(300);
  ok(Number(await t.ev("document.querySelector('.rf-moedas')?.textContent")) === await t.ev(SALDO), "o app Ateliê do Rabifone mostra o saldo");
  await t.ev("[...document.querySelectorAll('.rabifone .rf-item')].find((b) => /Abrir a loja/.test(b.textContent)).click()"); await espera(800);
  ok(await t.ev("teste.atelie.aberto"), "pelo Rabifone também abre a loja");
  await t.ev("teste.atelie.fechar()");

  // ---- recarregar: compras, roupa vestida e pinturas continuam
  await t.cmd("Page.reload"); await esperarJogo(t);
  ok(JSON.stringify(await t.ev("[teste.pecas.camiseta, teste.pecas.chapeu]")) === '["rosa","cartola"]' && await t.ev("teste.rabisco.rp.grupos.camiseta?.length > 0 && !teste.rabisco.pivoAba.visible"), "depois de recarregar o Rabisco continua de camiseta rosa e cartola");
  ok(await t.ev("teste.Rabiscoins.tem('rabiscolandia:pintura:heli-laranja') && teste.salvo.pinturas.heli === 'heli-laranja'"), "a pintura comprada continua");
  // peça paga que não foi comprada (salvo mexido à mão) não vale
  await t.ev("(() => { const k = 'rabisco.rabiscopolis.v1', d = JSON.parse(localStorage.getItem(k)); d.meuRabisco.chapeu = 'coroa'; localStorage.setItem(k, JSON.stringify(d)); })()");
  await t.cmd("Page.reload"); await esperarJogo(t);
  ok((await t.ev("teste.pecas.chapeu")) === "original", "peça não comprada no salvo volta para o original");
  // custo de desenho vestido (camiseta + boné de cor): segue no orçamento
  await t.ev("teste.Rabiscoins.ganhar(100, 'teste'); teste.abrirAtelie('chapeu'); teste.atelie.escolher('bone-rosa'); teste.atelie.fazer(); teste.atelie.fechar()");
  const tvVestido = await medir("TV vestido", 250);
  // fotos: loja por fora e o menu
  await t.ev("(() => { const s = document.createElement('style'); s.textContent = '.cena-rp > *:not(canvas):not(.atelie-rp), canvas.minimapa-rp, .casca-dica, .casca-aviso { display: none !important; }'; document.head.append(s); })()");
  await t.ev("teste.ir(12, 24); teste.vista([3, 8, 40], [29, 4.5, 20])"); await espera(1500); await t.foto(`${OUT}loja-por-fora.png`);
  await t.ev("teste.vista(null); teste.abrirAtelie('camiseta'); teste.atelie.escolher('listrada'); teste.atelie.girar(0.35)"); await espera(1800); await t.foto(`${OUT}loja-menu.png`);
  await t.ev("teste.atelie.fechar()");
  const er = errosDeVerdade(t);
  ok(!er.length, `sem erro de console ${er.slice(0, 3).join(" | ")}`);
  console.log("TV antes:", JSON.stringify(tvAntes), "· vestido:", JSON.stringify(tvVestido));
  await t.fechar();
}

// ================================================================ celular (toque)
{
  const t = await abrir(URL_JOGO, CEL);
  await esperarJogo(t);
  const m = {};
  for (const [nome, [x, z, yaw]] of Object.entries({ "praça": [0, 33, Math.PI], "frente da loja": [17, 20, Math.PI / 2], "porta da loja": [21.5, 20, Math.PI / 2], "loja de lado": [20, 40, 2.4] })) {
    await t.ev(`teste.ir(${x}, ${z}); teste.olhar(${yaw})`); await espera(900);
    m[nome] = (await t.ev("teste.medir().total")).calls;
    ok(m[nome] <= 180, `celular, ${nome}: ${m[nome]} chamadas (≤ 180)`);
  }
  await irNaPorta(t);
  await t.toque(".rp-acao"); await espera(1000);
  ok(await t.ev("teste.atelie.aberto"), "no celular, o ✋ na porta abriu a loja");
  ok(!(await t.ev("document.documentElement.scrollWidth > innerWidth + 1")), "a loja cabe na tela do celular deitado");
  await t.ev("teste.Rabiscoins.ganhar(50, 'teste')");
  await t.toque(".atl-aba[data-cat=oculos]"); await espera(300);
  await t.toque(".atl-item:nth-child(2)"); await espera(400);
  const sel = await t.ev("teste.atelie.selecionado?.opcao");
  ok(sel === "grandao", `tocar na peça seleciona e prova (${sel})`);
  await t.toque(".atl-acao"); await espera(400);
  ok((await t.ev("teste.pecas.oculos")) === "grandao" && await t.ev(SALDO) === 10, `tocar no botão grande comprou e vestiu o óculos (saldo ${await t.ev(SALDO)})`);
  await t.toque(".atl-ok"); await espera(500);
  ok(!(await t.ev("teste.atelie.aberto")), "✓ Pronto fechou a loja no toque");
  const er = errosDeVerdade(t);
  ok(!er.length, `celular sem erro de console ${er.slice(0, 3).join(" | ")}`);
  console.log("celular:", JSON.stringify(m));
  await t.fechar();
}

console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
