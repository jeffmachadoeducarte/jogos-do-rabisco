// Rabiscolândia: a casa decorável (casa-dados.js, casa-3d.js, casa-decorar.js, casa-catalogo-ui.js). Confere, num aparelho novo:
//  - entrar pela porta (F) leva ao interior em blocos (sala e quarto), a anfitriã dá as boas-vindas só na 1ª vez e sair volta à rua;
//  - modo Decorar pelo teclado: o baú abre (Tab), tira a cama do baú, setas movem, Q/E giram, F põe, X guarda, C muda a cor;
//  - pelo controle: direcional move, X gira, A põe; pelo toque: tocar no chão leva o móvel, tocar nele põe, arrastar move, botões;
//  - nunca sobrepõe (recusa e o móvel continua na mão); passagem e porta ficam livres;
//  - trocar móvel por Rabiscoins: recusa sem saldo (nada muda), com saldo desconta e o móvel vai para o baú; papel de parede;
//  - Esc/Pronto salvam; tudo continua depois de recarregar; trocar de casa leva os móveis junto;
//  - os móveis de Natal só aparecem na época (?teste&hoje=AAAA-MM-DD): fora dela somem da casa e do catálogo e voltam no Natal;
//  - chamadas de desenho com a casa cheia e na rua do Bairro das Casas (TV ≤ 250, celular ≤ 180); sem erro de console.
// Uso: node --experimental-websocket ferramentas/teste/rabiscopolis-casa.mjs <http://localhost:porta> [pasta das fotos]
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const [BASE = "http://localhost:8754", PASTA = fileURLToPath(new URL("../../.claude/tmp/casa/", import.meta.url))] = process.argv.slice(2);
const OUT = PASTA.endsWith("/") ? PASTA : `${PASTA}/`;
mkdirSync(OUT, { recursive: true });
const URL_DIA = (d) => `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo&hoje=${d}`;
const NOV = "2026-11-03", DEZ = "2026-12-10";
const CEL = { mobile: true, largura: 844, altura: 390, agente: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1" };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)|favicon|fonts\.g/.test(e));
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; return Boolean(c); };
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 14 * 60 * 1000);
const ate = async (t, expr, ms = 90000, passo = 150) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
async function esperarJogo(t) {
  if (!(await ate(t, "Boolean(window.teste?.vivo && window.teste.mundo && window.teste.rabisco)"))) throw new Error("o jogo não abriu: " + t.erros.join(" | "));
  await espera(2000);
}
const INSTRUMENTO = `window.__voz = []; { const p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__voz.push(this.src.replace(/^.*\\/voz\\//, "")); return p.call(this); }; }`;
const tecla = async (t, code, n = 1) => {
  const kc = { KeyF: 70, KeyQ: 81, KeyE: 69, KeyX: 88, KeyC: 67, KeyB: 66, Tab: 9, Escape: 27, ArrowRight: 39, ArrowLeft: 37, ArrowDown: 40, ArrowUp: 38, Enter: 13 }[code];
  const key = code === "Escape" ? "Escape" : code === "Enter" ? "Enter" : code === "Tab" ? "Tab" : code.startsWith("Arrow") ? code : code.replace(/^Key/, "").toLowerCase();
  for (let i = 0; i < n; i++) {
    await t.cmd("Input.dispatchKeyEvent", { type: "keyDown", code, key, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
    await t.cmd("Input.dispatchKeyEvent", { type: "keyUp", code, key, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
    await espera(160);
  }
  await espera(120);
};
const D = "teste.decorar";
const MAO = `JSON.stringify(${D}.mao && [${D}.mao.id, ${D}.mao.gx, ${D}.mao.gz, ${D}.mao.rot, ${D}.mao.cabe])`;
const mao = async (t) => JSON.parse(await t.ev(MAO));
const MOVEIS = "JSON.stringify(teste.emCasa.moveis)";
const SALVOS = "JSON.stringify(teste.salvo.casaDeco?.moveis ?? null)";
const SALDO = "teste.Rabiscoins.saldo()";
// ponto da tela do meio de um quadradinho (gz = -1: na parede do fundo, na altura do quadro)
const TELA = (gx, gz) => `(() => { const c = teste.casa, V = teste.cam.position.constructor, s = 0.5;
  const v = new V(c.origem[0] - 7 + (${gx} + 0.5) * s, ${gz} < 0 ? 1.65 : 0, c.origem[1] + (${gz} < 0 ? -3.98 : -4 + (${gz} + 0.5) * s)).project(teste.cam);
  const r = teste.r3.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; })()`;
// monta uma sala caprichada pela api do modo (troca o que faltar, tira do baú, leva e põe)
const SALA_BONITA = `(() => { const d = teste.decorar, c = d.catalogo, out = [];
  while (d.estado.moveis.length) { d.pegar(0); d.tirar(); } // começa da casa vazia (tudo de volta no baú)
  const por = (id, gx, gz, rot = 0, cores = 0) => {
    c.abrir(); for (const a of ['quarto', 'sala', 'enfeites', 'brinquedos', 'natal']) { c.aba(a); if (c.escolher(id)) break; }
    if (d.noBau(id) <= 0) c.fazer(); c.fazer(); c.fechar();
    if (!d.mao) return out.push(id + ':sem-mao');
    d.irPara(gx, gz); for (let i = 0; i < rot; i++) d.girar(1); for (let i = 0; i < cores; i++) d.pintar(1);
    out.push(id + ':' + d.por());
  };
  por('sofa', 2, 0); por('quadro', 3, -1, 0, 1); por('tapete', 3, 3, 0, 1); por('mesa', 9, 1); por('cadeira', 9, 3, 2); por('cadeira', 11, 3, 2);
  por('estante', 12, 0); por('abajur', 0, 0); por('samambaia', 0, 9); por('poltrona', 0, 3, 1, 1); por('vaso', 7, 0); por('cristaleira', 12, 6, 1);
  por('piano', 9, 9); por('pufe', 6, 5, 0, 2);
  por('cama', 24, 0); por('escrivaninha', 18, 0); por('tapete-listras', 21, 6); por('cama-pet', 18, 6); por('aquario', 26, 6, 3); por('bau-brinquedos', 22, 0, 0, 1);
  por('cavalinho', 25, 13); por('pufe', 23, 13, 0, 1); por('quadro', 24, -1, 0, 2);
  return out; })()`;

// ================================================================ TV/computador: teclado e controle
{
  const t = await abrir(URL_DIA(NOV), { largura: 1280, altura: 720 });
  try {
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: INSTRUMENTO });
  await t.cmd("Page.reload"); await esperarJogo(t);
  // ---- escolher a casa 3 e entrar pela porta, com a ação (F)
  await t.ev("teste.morarAqui(3)"); await espera(400);
  const [fx, fz] = await t.ev("teste.casaFrente(3)");
  await t.ev(`teste.ir(${fx}, ${fz})`); await espera(600);
  ok(/Entrar em casa/.test(await t.ev("teste.contexto") ?? ""), `na frente da casa a ação é "${await t.ev("teste.contexto")}"`);
  await tecla(t, "KeyF");
  ok(await ate(t, "teste.modo === 'casa' && teste.emCasa?.planta === 'M'", 6000), "F na porta: entrou na casa (interior em blocos, sala e quarto)");
  await espera(800);
  ok(await t.ev("window.__voz.includes('rp-casa-boasvindas.mp3') && teste.salvo.casaDeco?.falou?.boasVindas === true"), "a anfitriã deu as boas-vindas na 1ª vez");
  const solidosCasa = await t.ev("teste.casa.solidos.length");
  ok(solidosCasa >= 7, `paredes com colisão (${solidosCasa})`);
  await t.foto(`${OUT}tv-casa-vazia.png`);
  const vazia = (await t.ev("teste.medir().total")).calls;
  ok(vazia <= 250, `casa vazia: ${vazia} chamadas (≤ 250)`);
  ok(/Decorar/.test(await t.ev("teste.contexto") ?? ""), `lá dentro a ação é "${await t.ev("teste.contexto")}"`);

  // ---- modo Decorar pelo teclado
  await tecla(t, "KeyF");
  ok(await t.ev(`${D}.ativo && teste.casa.gradeMalha.visible`), "F: entrou no modo Decorar, com a grade no chão");
  await espera(400);
  ok(await t.ev("window.__voz.includes('rp-casa-dica.mp3') && teste.salvo.casaDeco.falou.dica === true"), "a anfitriã explica como decorar na 1ª vez");
  await tecla(t, "Tab");
  ok(await t.ev(`${D}.catalogo.aberto && ${D}.catalogo.cat === 'bau'`), "Tab abre o catálogo no baú de móveis");
  const bau = await t.ev(`${D}.catalogo.itens`);
  ok(JSON.stringify(bau) === '["cama","mesa","cadeira"]', `aparelho novo: no baú vêm de graça a cama, a mesa e a cadeira (${bau})`);
  await tecla(t, "KeyF"); await tecla(t, "KeyF"); // o 1º cartão (cama) e o botão "Pôr na casa"
  let m = await mao(t);
  ok(m?.[0] === "cama" && !(await t.ev(`${D}.catalogo.aberto`)), `"Pôr na casa": a cama veio para a mão (${JSON.stringify(m)})`);
  await t.ev(`${D}.irPara(20, 1)`); m = await mao(t);
  await tecla(t, "ArrowRight", 2); await tecla(t, "ArrowDown");
  const m2 = await mao(t);
  ok(m2[1] === m[1] + 2 && m2[2] === m[2] + 1, `setas movem a cama um quadradinho por vez (${m[1]},${m[2]} → ${m2[1]},${m2[2]})`);
  await tecla(t, "KeyE"); const rE = (await mao(t))[3]; await tecla(t, "KeyQ"); const rQ = (await mao(t))[3];
  ok(rE === 1 && rQ === 0, `E gira para um lado e Q para o outro (rot ${rE} → ${rQ})`);
  await tecla(t, "KeyC"); const corNova = await t.ev(`${D}.mao.cor`);
  await tecla(t, "KeyF");
  let mv = JSON.parse(await t.ev(MOVEIS));
  ok(!(await t.ev(`${D}.mao`)) && mv.length === 1 && mv[0].id === "cama" && mv[0].gx === m2[1] && mv[0].gz === m2[2] && mv[0].cor === corNova && corNova !== 0x00b5f0, `F pôs a cama no lugar, com a cor nova (${JSON.stringify(mv[0])})`);
  // ---- sobrepor: a cadeira em cima da cama é recusada
  await tecla(t, "Tab"); await t.ev(`${D}.catalogo.escolher('cadeira')`); await t.ev(`${D}.catalogo.fazer()`);
  ok((await mao(t))?.[0] === "cadeira", "a cadeira saiu do baú");
  await t.ev(`${D}.irPara(${mv[0].gx + 1}, ${mv[0].gz + 1})`); await espera(200);
  ok((await mao(t))[4] === false, "em cima da cama o lugar fica vermelho (não cabe)");
  await tecla(t, "KeyF");
  ok(JSON.parse(await t.ev(MOVEIS)).length === 1 && (await mao(t))?.[0] === "cadeira", "F em cima da cama: recusou (a cadeira continua na mão, nada mudou)");
  await t.ev(`${D}.irPara(5, 14)`); await tecla(t, "KeyF");
  ok(JSON.parse(await t.ev(MOVEIS)).length === 1, "na frente da porta da rua também não deixa (passagem livre)");
  await t.ev(`${D}.irPara(18, 6)`); await tecla(t, "KeyF");
  mv = JSON.parse(await t.ev(MOVEIS));
  ok(mv.length === 2 && mv[1].id === "cadeira" && mv[1].gx === 18 && mv[1].gz === 6, "num lugar livre a cadeira foi posta");
  // ---- mover um móvel já posto: cursor em cima, F pega, setas, F põe
  await t.ev(`${D}.irPara(${mv[0].gx}, ${mv[0].gz})`); await tecla(t, "KeyF");
  ok((await mao(t))?.[0] === "cama", "F em cima da cama pega a cama");
  await tecla(t, "ArrowLeft", 3); await tecla(t, "KeyF");
  const mv2 = JSON.parse(await t.ev(MOVEIS));
  ok(mv2[0].gx === mv[0].gx - 3 && mv2[0].gz === mv[0].gz, `a cama mudou de lugar (gx ${mv[0].gx} → ${mv2[0].gx})`);
  // ---- tirar: X em cima da cadeira guarda no baú
  await t.ev(`${D}.irPara(18, 6)`); await tecla(t, "KeyX");
  ok(JSON.parse(await t.ev(MOVEIS)).length === 1 && await t.ev(`${D}.noBau('cadeira')`) === 2, "X guardou a cadeira de volta no baú (2 no baú)");
  // ---- controle: direcional move, X gira, A põe
  await tecla(t, "Tab"); await t.ev(`${D}.catalogo.escolher('mesa')`); await t.ev(`${D}.catalogo.fazer()`);
  await t.ev(`${D}.irPara(2, 6)`); const c0 = await mao(t);
  await t.botao(15); await t.botao(13);
  const c1 = await mao(t);
  await t.botao(2);
  const c2 = await mao(t);
  ok(c1[1] === c0[1] + 1 && c1[2] === c0[2] + 1 && c2[3] === 1, `controle: ▶ e ▼ movem e X gira a mesa (${JSON.stringify(c0)} → ${JSON.stringify(c1)} → ${JSON.stringify(c2)})`);
  await t.botao(0);
  ok(!(await t.ev(`${D}.mao`)) && JSON.parse(await t.ev(MOVEIS)).some((q) => q.id === "mesa" && q.rot === 1), "controle: A pôs a mesa");

  // ---- trocar por Rabiscoins: sem saldo recusa, com saldo vai para o baú
  await tecla(t, "Tab"); await t.ev(`${D}.catalogo.aba('sala'); ${D}.catalogo.escolher('sofa')`);
  ok(/Faltam/.test(await t.ev(`${D}.catalogo.acao`)), `sem Rabiscoins o botão do sofá diz "${await t.ev(`${D}.catalogo.acao`)}"`);
  await t.ev(`${D}.catalogo.fazer()`);
  ok(await t.ev(SALDO) === 0 && await t.ev(`${D}.tem('sofa')`) === 0, "sem saldo: a troca foi recusada (saldo 0, sem sofá)");
  await t.ev("teste.Rabiscoins.ganhar(100, 'teste')"); await t.ev(`${D}.catalogo.atualizar()`);
  ok(/Trocar por/.test(await t.ev(`${D}.catalogo.acao`)), `com 100 Rabiscoins: "${await t.ev(`${D}.catalogo.acao`)}"`);
  await t.ev(`${D}.catalogo.fazer()`);
  ok(await t.ev(SALDO) === 40 && await t.ev(`${D}.tem('sofa')`) === 1 && await t.ev(`${D}.noBau('sofa')`) === 1, `trocou: -60 (saldo ${await t.ev(SALDO)}) e o sofá está no baú`);
  ok(await t.ev("teste.Rabiscoins.tem('rabiscolandia:casa:sofa:1')"), "a carteira guardou a troca (rabiscolandia:casa:sofa:1)");
  ok(await t.ev("document.querySelector('.casa-cat-rp .atl-saldo b').textContent") === "40", "o saldo do catálogo mostra 40");
  await t.ev(`${D}.catalogo.fazer()`); await t.ev(`${D}.irPara(2, 0)`); await tecla(t, "KeyF");
  ok(JSON.parse(await t.ev(MOVEIS)).some((q) => q.id === "sofa"), "o sofá trocado foi posto na sala");
  // papel de parede: vale para a casa toda
  await tecla(t, "Tab"); await t.ev(`${D}.catalogo.aba('paredes'); ${D}.catalogo.escolher('papel-estrelas'); ${D}.catalogo.fazer()`);
  ok(await t.ev("teste.casa.papelAtual") === "papel-liso" && await t.ev(SALDO) === 40, "papel de estrelas (60) com 40: recusado");
  await t.ev(`teste.Rabiscoins.ganhar(30, 'teste'); ${D}.catalogo.atualizar(); ${D}.catalogo.fazer()`);
  ok(await t.ev("teste.casa.papelAtual") === "papel-estrelas" && await t.ev(SALDO) === 10, "com saldo: trocou e já pôs o papel de estrelas");
  await t.ev(`${D}.catalogo.fechar()`);
  // ---- fora do Natal: nada de Natal no catálogo
  await tecla(t, "Tab");
  const abasNov = await t.ev("[...document.querySelectorAll('.casa-cat-rp .atl-aba')].map((b) => b.dataset.cat).join(',')");
  ok(!abasNov.includes("natal") && !(await t.ev(`(() => { const c = ${D}.catalogo; let n = 0; for (const a of ['bau','quarto','sala','enfeites','brinquedos','paredes']) { c.aba(a); n += c.itens.filter((i) => ['arvore-natal','guirlanda','lareira'].includes(i)).length; } return n; })()`)), `em novembro não tem móvel de Natal (abas: ${abasNov})`);
  await tecla(t, "Escape");
  ok(!(await t.ev(`${D}.catalogo.aberto`)) && await t.ev(`${D}.ativo`), "Esc fecha o catálogo e continua decorando");
  // ---- Esc sai do modo e salva
  const antes = await t.ev(MOVEIS);
  await tecla(t, "Escape");
  ok(!(await t.ev(`${D}.ativo`)) && await t.ev(SALVOS) === antes && await t.ev("teste.salvo.casaDeco.papel") === "papel-estrelas", "Esc saiu do Decorar e salvou os móveis e o papel");
  ok(!(await t.ev("teste.jogo.pausado")), "o Esc do Decorar não pausou o jogo");
  ok(await t.ev("teste.casa.solidos.length") < await t.ev("teste.fis ? 9999 : 0") && await t.ev("teste.dentroDeSolido(teste.j.pos.x, teste.j.pos.z)") === false, "o Rabisco não ficou dentro de móvel");

  // ---- casa cheia: chamadas de desenho (TV ≤ 250)
  await t.ev("teste.Rabiscoins.ganhar(3000, 'teste')");
  await t.ev(`${D}.entrar()`);
  const r = await t.ev(SALA_BONITA);
  const naoPos = r.filter((x) => !x.endsWith(":true"));
  ok(naoPos.length === 0, `sala caprichada: ${r.length} móveis postos${naoPos.length ? " — não couberam: " + naoPos.join(", ") : ""}`);
  await espera(600);
  const nCheia = await t.ev("teste.emCasa.moveis.length");
  const cheiaDeco = (await t.ev("teste.medir().total")).calls;
  ok(cheiaDeco <= 250, `TV, casa cheia (${nCheia} móveis) no modo Decorar: ${cheiaDeco} chamadas (≤ 250)`);
  await t.ev(`${D}.irPara(10, 8)`); await espera(300);
  await t.foto(`${OUT}tv-decorar-grade.png`);
  await t.ev(`${D}.irPara(3, 9); ${D}.acao()`); await espera(400); // a poltrona? (não: chão vazio abre o baú)
  await t.ev(`${D}.catalogo.fechar(); ${D}.irPara(13, 6); ${D}.acao(); ${D}.mover(0, 1)`); await espera(500);
  await t.foto(`${OUT}tv-decorar-selecionado.png`);
  await t.ev(`${D}.mover(0, -1); ${D}.por()`);
  await t.ev(`${D}.abrirCatalogo('sala'); ${D}.catalogo.escolher('piano')`); await espera(500);
  await t.foto(`${OUT}tv-catalogo.png`);
  await t.ev(`${D}.catalogo.fechar(); ${D}.sair()`); await espera(800);
  await t.ev("teste.ir(teste.casa.origem[0] - 4, teste.casa.origem[1] + 1.2)"); await espera(900);
  await t.foto(`${OUT}tv-casa-decorada.png`);
  const cheia = (await t.ev("teste.medir().total")).calls;
  ok(cheia <= 250, `TV, casa cheia andando: ${cheia} chamadas (≤ 250)`);
  const salvosCheia = await t.ev(SALVOS);
  // ---- sair pela porta e a rua do Bairro das Casas
  await t.ev("teste.sairCasa()"); await espera(600);
  ok(await t.ev("teste.modo") === "rua" && !(await t.ev("teste.casa.grupo.visible")), "saiu de casa: de volta à rua");
  const rua = [];
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { await t.ev(`teste.olhar(${yaw})`); await espera(700); rua.push((await t.ev("teste.medir().total")).calls); }
  ok(Math.max(...rua) <= 250, `TV, rua do Bairro das Casas: ${rua.join(", ")} chamadas (≤ 250)`);

  // ---- recarregar: tudo continua
  await t.cmd("Page.reload"); await esperarJogo(t);
  await t.ev("teste.entrarCasa(3)"); await espera(800);
  ok(await t.ev(MOVEIS) === salvosCheia && await t.ev("teste.emCasa.papel") === "papel-estrelas", `depois de recarregar: os ${nCheia} móveis e o papel continuam iguais`);
  ok(!(await t.ev("window.__voz.includes('rp-casa-boasvindas.mp3')")), "a anfitriã não repete as boas-vindas");
  ok((await t.ev("teste.medir().total")).calls <= 250, "TV, casa cheia depois de recarregar ≤ 250");
  // ---- trocar de casa: os móveis vão junto
  await t.ev("teste.sairCasa(); teste.morarAqui(6)"); await espera(400);
  await t.ev("teste.entrarCasa(6)"); await espera(800);
  ok(await t.ev("teste.emCasa.numero") === 6 && await t.ev(MOVEIS) === salvosCheia, "mudou para a casa 6: os móveis vieram junto");
  await t.ev("teste.sairCasa()");

  // ---- Natal: na época aparece, fora dela some da casa e do catálogo (e volta no Natal)
  await t.cmd("Page.navigate", { url: URL_DIA(DEZ) }); await esperarJogo(t);
  await t.ev(`teste.entrarCasa(6); ${D}.entrar(); ${D}.abrirCatalogo()`); await espera(300);
  const abasDez = await t.ev("[...document.querySelectorAll('.casa-cat-rp .atl-aba')].map((b) => b.dataset.cat).join(',')");
  await t.ev(`${D}.catalogo.aba('natal')`);
  ok(abasDez.includes("natal") && JSON.stringify(await t.ev(`${D}.catalogo.itens`)) === '["arvore-natal","guirlanda","lareira"]', `em dezembro: aba de Natal com a arvorezinha, a guirlanda e a lareira com meias`);
  await t.ev(`${D}.catalogo.escolher('arvore-natal'); ${D}.catalogo.fazer(); ${D}.catalogo.fazer(); ${D}.irPara(13, 12)`);
  ok(await t.ev(`${D}.por()`), "a arvorezinha de Natal foi posta");
  await t.ev(`${D}.abrirCatalogo('natal'); ${D}.catalogo.escolher('guirlanda'); ${D}.catalogo.fazer(); ${D}.catalogo.fazer(); ${D}.irPara(18, -1)`);
  ok(await t.ev(`${D}.por()`), "a guirlanda foi posta na parede do quarto");
  await t.ev(`${D}.irPara(10, 10)`); await espera(300);
  await t.foto(`${OUT}tv-natal.png`);
  await t.ev(`${D}.sair()`); await espera(300);
  const comNatal = await t.ev("teste.emCasa.moveis.filter((q) => ['arvore-natal', 'guirlanda'].includes(q.id)).length");
  ok(comNatal === 2, "dezembro: 2 enfeites de Natal na casa");
  await t.cmd("Page.navigate", { url: URL_DIA("2027-02-10") }); await esperarJogo(t);
  await t.ev("teste.entrarCasa(6)"); await espera(500);
  ok(await t.ev("teste.emCasa.moveis.filter((q) => ['arvore-natal', 'guirlanda'].includes(q.id)).length") === 0 && await t.ev(`${D}.tem('arvore-natal')`) === 1, "fevereiro: os enfeites de Natal saíram da casa (continuam sendo da criança)");
  await t.ev(`${D}.entrar(); ${D}.abrirCatalogo('bau')`);
  ok(!(await t.ev(`${D}.catalogo.itens`)).includes("arvore-natal"), "fora da época nem o baú mostra a arvorezinha");
  await t.ev(`${D}.sair()`);
  await t.cmd("Page.navigate", { url: URL_DIA("2027-12-02") }); await esperarJogo(t);
  await t.ev(`teste.entrarCasa(6); ${D}.entrar(); ${D}.abrirCatalogo('bau')`);
  ok((await t.ev(`${D}.catalogo.itens`)).includes("arvore-natal") && await t.ev(SALDO) === await t.ev(SALDO), "no Natal seguinte a arvorezinha volta para o baú, sem trocar de novo");
  await t.ev(`${D}.catalogo.fechar(); ${D}.sair()`);
  const errs = errosDeVerdade(t);
  ok(errs.length === 0, `TV: sem erro de console${errs.length ? ": " + errs.slice(0, 4).join(" | ") : ""}`);
  } finally { await t.fechar(); }
}

// ================================================================ celular (toque)
{
  const t = await abrir(URL_DIA(NOV), CEL);
  try {
  await esperarJogo(t);
  // a rua do Bairro das Casas antes de a casa existir (a casa por dentro só é montada na 1ª entrada)
  const olharRua = async () => { const r = []; for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { await t.ev(`teste.olhar(${yaw})`); await espera(700); r.push((await t.ev("teste.medir().total")).calls); } return r; };
  const [fx2, fz2] = await t.ev("teste.casaFrente(2)"), dir2 = await t.ev("teste.mundo.casas.find((k) => k.lote.numero === 2).lote.dir");
  await t.ev(`teste.ir(${fx2 + dir2[0] * 2.5}, ${fz2 + dir2[1] * 2.5})`);
  const ruaAntes = await olharRua();
  await t.ev("teste.morarAqui(2); teste.entrarCasa(2)"); await espera(1200);
  ok(await t.ev("teste.modo") === "casa", "celular: entrou na casa");
  await t.foto(`${OUT}cel-casa-vazia.png`);
  await t.toque(".rp-acao"); await espera(500);
  ok(await t.ev(`${D}.ativo`), "celular: ✋ Decorar entrou no modo Decorar");
  ok(await t.ev("getComputedStyle(document.querySelector('.casa-deco-rp .cd-barra')).display !== 'none'"), "a barra de botões grandes aparece");
  await t.toque(".cd-barra [data-a=catalogo]"); await espera(500);
  ok(await t.ev(`${D}.catalogo.aberto`), "celular: 🧺 Baú abre o catálogo");
  await t.toque(".casa-cat-rp .atl-item:nth-child(2)"); await espera(300); // a mesa
  await t.toque(".casa-cat-rp .atl-acao"); await espera(500);
  ok((await mao(t))?.[0] === "mesa", "celular: tocou na mesa e em \"Pôr na casa\": a mesa está na mão");
  // tocar no chão leva a mesa; tocar nela põe
  let [x, y] = await t.ev(TELA(5, 5));
  await t.tocaXY(x, y); await espera(300);
  let mm = await mao(t);
  ok(mm[1] <= 5 && mm[1] + 3 > 5 && mm[2] <= 5 && mm[2] + 2 > 5, `tocar no chão levou a mesa até lá (${mm[1]},${mm[2]})`);
  [x, y] = await t.ev(TELA(mm[1] + 1, mm[2]));
  await t.tocaXY(x, y); await espera(300);
  let mv = JSON.parse(await t.ev(MOVEIS));
  ok(!(await t.ev(`${D}.mao`)) && mv.length === 1 && mv[0].id === "mesa", "tocar na mesa que está na mão põe");
  // arrastar a mesa posta para outro lugar
  const [ax, ay] = await t.ev(TELA(mv[0].gx + 1, mv[0].gz));
  const [bx, by] = await t.ev(TELA(mv[0].gx + 5, mv[0].gz + 3));
  await t.arrasta(ax, ay, bx, by, 14);
  await espera(300);
  const mv2 = JSON.parse(await t.ev(MOVEIS));
  ok(mv2.length === 1 && mv2[0].gx === mv[0].gx + 4 && mv2[0].gz === mv[0].gz + 3 && !(await t.ev(`${D}.mao`)), `arrastar moveu a mesa e soltou no lugar (${mv[0].gx},${mv[0].gz} → ${mv2[0].gx},${mv2[0].gz})`);
  // tocar pega, ⟳ gira, ✋ põe
  [x, y] = await t.ev(TELA(mv2[0].gx + 1, mv2[0].gz));
  await t.tocaXY(x, y); await espera(250);
  await t.toque(".cd-barra [data-a=girarD]"); await espera(250);
  ok((await mao(t))?.[3] === 1, "celular: tocar na mesa pega e ⟳ gira");
  await t.toque(".cd-barra [data-a=acao]"); await espera(300);
  ok(JSON.parse(await t.ev(MOVEIS))[0].rot === 1 && !(await t.ev(`${D}.mao`)), "celular: ✋ Pôr deixou a mesa girada");
  // sobrepor pelo toque: a cadeira arrastada para cima da mesa não fica
  await t.toque(".cd-barra [data-a=catalogo]"); await ate(t, `${D}.catalogo.aberto`, 4000);
  await t.ev(`${D}.catalogo.aba('bau'); ${D}.catalogo.escolher('cadeira')`); await espera(200);
  for (let i = 0; i < 2 && !(await t.ev(`${D}.mao`)); i++) { await t.toque(".casa-cat-rp .atl-acao"); await ate(t, `Boolean(${D}.mao)`, 2000); }
  const mesa = JSON.parse(await t.ev(MOVEIS))[0];
  const cad = await mao(t);
  const [cx0, cy0] = await t.ev(TELA(cad[1], cad[2])), [cx1, cy1] = await t.ev(TELA(mesa.gx, mesa.gz + 1));
  await t.arrasta(cx0, cy0, cx1, cy1, 14); await espera(300);
  ok(JSON.parse(await t.ev(MOVEIS)).length === 1 && (await mao(t))?.[4] === false, "celular: arrastar a cadeira para cima da mesa é recusado (fica na mão, vermelha)");
  await t.toque(".cd-barra [data-a=tirar]"); await espera(300);
  ok(!(await t.ev(`${D}.mao`)) && await t.ev(`${D}.noBau('cadeira')`) === 2, "celular: 📦 Guardar devolveu a cadeira ao baú");
  // troca pelo toque: sem saldo recusa, com saldo vai
  await t.toque(".cd-barra [data-a=catalogo]"); await ate(t, `${D}.catalogo.aberto`, 4000);
  // o 1º toque logo depois de o catálogo abrir às vezes não vira clique no Chrome sem janela (como no "Pôr na casa" acima): tenta 2 vezes
  for (let i = 0; i < 2 && !(await t.ev(`${D}.catalogo.cat === 'enfeites'`)); i++) { await t.toque(".casa-cat-rp .atl-aba[data-cat=enfeites]"); await ate(t, `${D}.catalogo.cat === 'enfeites'`, 3000); }
  await t.toque(".casa-cat-rp .atl-item[data-id=vaso]"); await espera(300);
  ok(await t.ev(`${D}.catalogo.cat === 'enfeites' && ${D}.catalogo.selecionado?.id === 'vaso'`), "celular: tocou na aba Enfeites e no vaso");
  await t.toque(".casa-cat-rp .atl-acao"); await espera(300);
  ok(await t.ev(`${D}.tem('vaso')`) === 0, "celular: sem saldo o vaso não veio");
  await t.ev(`teste.Rabiscoins.ganhar(3000, 'teste'); ${D}.catalogo.atualizar()`);
  await t.toque(".casa-cat-rp .atl-acao"); await espera(400);
  ok(await t.ev(`${D}.tem('vaso')`) === 1 && await t.ev(SALDO) === 2985, `celular: com saldo trocou o vaso (-15): tem ${await t.ev(`${D}.tem('vaso')`)}, saldo ${await t.ev(SALDO)}`);
  await t.toque(".casa-cat-rp .atl-ok"); await espera(300);
  // casa cheia no celular
  await t.ev(`${D}.catalogo.fechar()`);
  const r = await t.ev(SALA_BONITA.replace("por('mesa', 9, 1); ", ""));
  ok(r.filter((s) => !s.endsWith(":true")).length <= 1, `celular: casa cheia (${await t.ev("teste.emCasa.moveis.length")} móveis)`);
  await t.ev(`${D}.irPara(13, 6); ${D}.acao()`); await espera(500);
  await t.foto(`${OUT}cel-decorar.png`);
  const celDeco = (await t.ev("teste.medir().total")).calls;
  ok(celDeco <= 180, `celular, casa cheia no Decorar: ${celDeco} chamadas (≤ 180)`);
  await t.ev(`${D}.por()`);
  await t.ev(`${D}.abrirCatalogo('quarto')`); await espera(500);
  await t.foto(`${OUT}cel-catalogo.png`);
  await t.ev(`${D}.catalogo.fechar()`);
  await t.toque(".cd-barra [data-a=pronto]"); await espera(700);
  ok(!(await t.ev(`${D}.ativo`)) && await t.ev(SALVOS) === await t.ev(MOVEIS), "celular: ✓ Pronto saiu e salvou");
  await t.foto(`${OUT}cel-casa-decorada.png`);
  const celCheia = (await t.ev("teste.medir().total")).calls;
  ok(celCheia <= 180, `celular, casa cheia andando: ${celCheia} chamadas (≤ 180)`);
  await t.ev("teste.sairCasa()"); await espera(600);
  const rua = await olharRua();
  // a casa por dentro fica escondida na rua: não custa nenhuma chamada (o resto da rua varia com o trânsito passando)
  const custoCasa = await t.ev("(() => { const g = teste.casa.grupo; let n = 0; g.traverse((o) => { if (o.isMesh) { let v = true; for (let p = o; p; p = p.parent) if (!p.visible) v = false; if (v) n++; } }); return n; })()");
  ok(custoCasa === 0, `celular, rua do Bairro das Casas: a casa decorada não desenha nada lá fora (${custoCasa} malhas); rua ${rua.join(", ")} chamadas, e antes de a casa existir ${ruaAntes.join(", ")}`);
  ok(Math.max(...rua) <= 180, `celular, rua do Bairro das Casas ≤ 180: pior ângulo ${Math.max(...rua)} (antes de a casa existir: ${Math.max(...ruaAntes)})`);
  ok(!(await t.transborda()), "a página não transborda no celular");
  const errs = errosDeVerdade(t);
  ok(errs.length === 0, `celular: sem erro de console${errs.length ? ": " + errs.slice(0, 4).join(" | ") : ""}`);
  } finally { await t.fechar(); }
}

clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
