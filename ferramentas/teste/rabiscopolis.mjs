// Rabiscópolis (Fatia 1): carrega sem erro, escolhe casa (e guarda), dirige sem atravessar sólidos, Garagem do
// Rabifone, noite com janelas acesas, lojas parceiras, controles de toque e celular sozinho sem pedir controle/QR.
// Tira as fotos em .claude/tmp/rabiscopolis/.
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/rabiscopolis.mjs [http://localhost:8097]
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8097";
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
const FOTOS = fileURLToPath(new URL("../../.claude/tmp/rabiscopolis/", import.meta.url));
mkdirSync(FOTOS, { recursive: true });
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 40000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
// 404 das vozes ainda não geradas (rp-*) e do banco de nomes é esperado
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e));
const PEDIDO = /conecte um controle|ligue (o|um) controle|leia o qr|aperte um bot[aã]o|em breve: o jogador 2|jogador 2 \(|desconectou|conectou numa tv/i;
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
// orçamento de desenho (passe principal; renderer.info): TV/computador ≤ 250 chamadas, celular ≤ 180, ≤ 350 mil triângulos
const PONTOS = [["praça", "teste.ir(0, 33); teste.olhar(Math.PI)"], ["Bairro das Casas", "teste.ir(-96, 2); teste.olhar(Math.PI * 0.82)"]];
async function orcamento(t, maxCalls, rotulo) {
  for (const [nome, cmd] of PONTOS) {
    await t.ev(cmd); await espera(1200);
    const m = await t.ev("teste.medir().total");
    ok(m.calls <= maxCalls && m.tris <= 350000, `orçamento ${rotulo} na ${nome}: ${m.calls} chamadas (≤ ${maxCalls}), ${Math.round(m.tris / 1000)} mil triângulos (≤ 350 mil)`);
  }
}
const fps = (t) => t.ev(`new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(Math.round((n / 3) * 10) / 10); }; requestAnimationFrame(f); })`);

// ------------------------------------------------------------------ computador/TV: 1280 × 720, sem toque
{
  const t = await abrir("about:blank", { largura: 1280, altura: 720 });
  try {
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await ate(t, "document.readyState === 'complete'");
  await t.ev(`localStorage.clear(); ${FAMILIA}`);
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo"), "carregou e começou (1280 × 720)");
  await espera(3000);
  const est = await t.ev("teste.estat");
  const q = await fps(t);
  console.log(`  desempenho na largada (praça, 9 blocos): ${est.calls} chamadas de desenho, ${Math.round(est.tris / 1000)} mil triângulos, ${est.malhas} malhas mescladas, FPS headless (swiftshader) ${q}`);
  // (a)
  ok(!errosDeVerdade(t).length, `(a) sem erro de console ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
  await t.foto(`${FOTOS}largada.png`);
  await orcamento(t, 250, "TV/computador");
  // (f)
  const parc = await t.ev("[teste.LUGARES.filter((l) => l.parceiro).length, teste.PARCEIROS.length]");
  ok(parc[0] === parc[1], `(f) lugares com parceiro (${parc[0]}) = PARCEIROS (${parc[1]})`);
  // (b) escolher casa
  await t.ev("(() => { const l = teste.LOTES[2]; teste.ir(l.x, l.z + l.dir[1] * 0.5); teste.olhar(Math.atan2(-l.dir[0], -l.dir[1])); })()");
  await espera(600);
  const ctx = await t.ev("teste.contexto");
  await t.ev("teste.acao()");
  await espera(800);
  const casa = await t.ev("teste.salvo.casa");
  ok(casa === 3, `(b) na frente do lote 3 a ação é "${ctx}" e salvou casa = ${casa}`);
  await t.ev("(() => { const l = teste.LOTES[2]; teste.ir(l.x + 6, l.z + l.dir[1] * -2.5); teste.olhar(Math.atan2(-l.dir[0], -l.dir[1]) + 0.5); })()");
  await espera(1500);
  await t.foto(`${FOTOS}casa-escolhida.png`);
  await t.cmd("Page.reload");
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo"), "recarregou");
  ok(await t.ev("teste.salvo.casa") === 3, "(b) a casa escolhida continua salva depois de recarregar");
  // foto: rua do Bairro das Casas
  await t.ev("teste.ir(-96, 2); teste.olhar(Math.PI * 0.82)");
  await espera(1500);
  await t.foto(`${FOTOS}rua-bairro-das-casas.png`);
  // (c) dirigir 2 s
  await t.ev("teste.entrar(0)");
  const p0 = await t.ev("[teste.dentro.pos.x, teste.dentro.pos.z]");
  await t.ev("teste.volante(1, 0)");
  let atravessou = false;
  for (let i = 0; i < 10; i++) { await espera(200); if (await t.ev("teste.dentroDeSolido(teste.dentro.pos.x, teste.dentro.pos.z)")) atravessou = true; }
  await t.ev("teste.volante(null)");
  const p1 = await t.ev("[teste.dentro.pos.x, teste.dentro.pos.z]");
  const andou = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  ok(andou > 5 && !atravessou, `(c) o carro andou ${andou.toFixed(1)} m em 2 s sem atravessar sólidos`);
  // foto: carro na avenida (Avenida da Alegria, z = 50)
  await t.ev("teste.sair(); (() => { const v = teste.veiculos[0]; v.pos.set(-20, 0.03, 52.8); v.ang = Math.PI / 2; v.vel = 0; })(); teste.entrar(0); teste.volante(0.6, 0)");
  await espera(1800);
  await t.ev("teste.volante(null)");
  await t.foto(`${FOTOS}carro-na-avenida.png`);
  // (d) Garagem pelo Rabifone (pelo menu de verdade: abre, app Garagem, Carro laranja)
  await t.ev("teste.sair(); teste.ir(4, 33); teste.olhar(Math.PI)");
  await espera(400);
  await t.ev("teste.fone.abrir('garagem')");
  await espera(400);
  await t.foto(`${FOTOS}rabifone-garagem.png`);
  const nAntes = await t.ev("teste.veiculos.length");
  await t.ev("[...document.querySelectorAll('.rf-item')].find((b) => /laranja/.test(b.textContent)).click()");
  await espera(400);
  const dist = await t.ev("(() => { const v = teste.veiculos.at(-1); return Math.hypot(v.pos.x - teste.j.pos.x, v.pos.z - teste.j.pos.z); })()");
  ok(await t.ev("teste.veiculos.length") === nAntes + 1 && dist < 6, `(d) app Garagem criou o veículo a ${dist.toFixed(1)} m do Rabisco`);
  // carro de perto e ônibus dirigindo (o teto some e o Rabisco aparece no banco do motorista)
  await t.ev("teste.ir(0, 33); (() => { const v = teste.veiculos[0]; v.pos.set(8, 0.03, 40); v.ang = Math.PI / 2; })(); teste.vista([13.5, 2.2, 43.2], [8.5, 0.9, 40])");
  await espera(1200);
  await t.foto(`${FOTOS}carro-de-perto.png`);
  await t.ev("teste.vista(null); teste.entrar(2); teste.volante(0.5, 0.25)");
  await espera(1500);
  await t.ev("teste.volante(null)");
  ok(await t.ev("teste.dentro?.tipo === 'onibus' && teste.rabisco.grupo.visible && teste.dentro.g.userData.cima.visible === false"), "ônibus: o Rabisco aparece dirigindo (teto e janelas somem)");
  await t.foto(`${FOTOS}onibus-dirigindo.png`);
  await t.ev("teste.sair()");
  ok(await t.ev("teste.veiculos[2].g.userData.cima.visible === true"), "ônibus: o teto volta quando ele desce");
  // blocos novos: campo de futebol, quadra + horta, Vila das Flores
  for (const [arq, pos, alvo] of [["bloco-campo.png", [70, 26, 48], [95, 0, 92]], ["bloco-quadra-horta.png", [92, 22, -52], [114, 0, -100]], ["bloco-vila-das-flores.png", [-60, 16, -78], [-95, 0, -95]]]) {
    await t.ev(`teste.ir(${alvo[0]}, ${alvo[2] + 30}); teste.vista(${JSON.stringify(pos)}, ${JSON.stringify(alvo)})`);
    await espera(1500);
    await t.foto(`${FOTOS}${arq}`);
  }
  await t.ev("teste.vista(null)");
  // praça de dia e de noite
  await t.ev("teste.hora(13); teste.ir(0, 36); teste.olhar(Math.PI)");
  await espera(1500);
  await t.foto(`${FOTOS}praca-dia.png`);
  // (e) noite
  await t.ev("teste.hora(22)");
  await espera(1200);
  const luz = await t.ev("teste.janelas");
  ok(luz.janela > 0.5 && luz.lampada > 1, `(e) às 22 h as janelas acendem (emissivo ${luz.janela.toFixed(2)}, postes ${luz.lampada.toFixed(2)})`);
  await t.foto(`${FOTOS}praca-noite.png`);
  await t.ev("teste.hora(10)");
  // vista de cima
  await t.ev("teste.vista([0, 250, 175], [0, 0, 8], false)");
  await espera(1500);
  await t.foto(`${FOTOS}vista-de-cima.png`);
  await t.ev("teste.vista(null)");
  // moradores de perto (protótipo no jogo): o Lápis Vermelho na Avenida da Alegria
  await t.ev("(() => { const m = teste.moradores[0].p.grupo; teste.ir(m.position.x + 3, m.position.z - 2); })()");
  await espera(600);
  await t.ev("(() => { const m = teste.moradores[0].p.grupo; teste.vista([m.position.x + 2.4, 1.8, m.position.z - 3.2], [m.position.x, 0.9, m.position.z]); })()");
  await espera(800);
  await t.foto(`${FOTOS}morador-no-jogo.png`);
  await t.ev("teste.vista(null)");
  ok(!errosDeVerdade(t).length, `sem erros até o fim (computador) ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
  } finally { await t.fechar(); }
}

// ------------------------------------------------------------------ celular/tablet deitado: 1180 × 820, toque, sem controle
{
  const t = await abrir("about:blank", { mobile: true, largura: 1180, altura: 820 });
  try {
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: "navigator.getGamepads = () => [null, null, null, null];" });
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&fixo` });
  ok(await ate(t, "!!document.querySelector('.casca-abertura .botao')"), "celular: abertura carregou");
  await espera(1200);
  const olhar = () => t.ev(`JSON.stringify({ txt: document.body.innerText.replace(/\\s+/g, " ").slice(0, 3000), qr: !!document.querySelector(".jog-qr.ativo") })`).then(JSON.parse);
  let o = await olhar();
  ok(!PEDIDO.test(o.txt) && !o.qr, `(h) abertura no celular sem pedido de controle/QR${PEDIDO.test(o.txt) ? ` ("${o.txt.match(PEDIDO)[0]}")` : ""}`);
  await t.toque(".casca-abertura .botao");
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo"), "celular: começou pelo toque");
  await espera(2500);
  o = await olhar();
  ok(!PEDIDO.test(o.txt) && !o.qr, "(h) jogando no celular, nenhum pedido de controle/QR");
  await orcamento(t, 180, "celular");
  await t.ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(800);
  const vis = (sel) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.offsetParent !== null && getComputedStyle(e).display !== "none"; })()`;
  const pe = await t.ev(`[${vis(".jd-camada")}, ${vis(".rp-acao")}, ${vis(".rp-pe .rp-fone")}, ${vis(".rp-volante")}]`);
  ok(pe[0] && pe[1] && pe[2] && !pe[3], `(g) a pé: joystick ${pe[0]}, Ação ${pe[1]}, 📱 ${pe[2]}, sem volante (${!pe[3]})`);
  await t.foto(`${FOTOS}celular-deitado-a-pe.png`);
  await t.ev("teste.entrar(0)");
  await espera(800);
  const car = await t.ev(`[${vis('[data-b="esq"]')}, ${vis('[data-b="dir"]')}, ${vis('[data-b="frente"]')}, ${vis('[data-b="re"]')}, ${vis(".rp-sair")}, ${vis(".jd-camada")}]`);
  ok(car.slice(0, 5).every(Boolean) && !car[5], `(g) no carro: ◀ ${car[0]} ▶ ${car[1]} ▲ ${car[2]} ▼ ${car[3]} Sair ${car[4]}, joystick escondido (${!car[5]})`);
  // dirige pelo toque de verdade: segura ▲ por 1,5 s
  const p0 = await t.ev("[teste.dentro.pos.x, teste.dentro.pos.z]");
  const [x, y] = await t.ev(`(() => { const b = document.querySelector('[data-b="frente"]').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
  await t.cmd("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await espera(1500);
  await t.cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const p1 = await t.ev("[teste.dentro.pos.x, teste.dentro.pos.z]");
  ok(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 3, `(g) segurando ▲ o carro anda (${Math.hypot(p1[0] - p0[0], p1[1] - p0[1]).toFixed(1)} m)`);
  await t.foto(`${FOTOS}celular-deitado-no-carro.png`);
  await espera(1500);
  await t.toque(".rp-sair");
  await espera(500);
  ok(await t.ev("teste.dentro === null"), "(g) botão Sair tira o Rabisco do carro");
  o = await olhar();
  ok(!PEDIDO.test(o.txt), "(h) depois de dirigir, nenhum pedido de controle/QR");
  ok(!errosDeVerdade(t).length, `(a) celular sem erro de console ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
  } finally { await t.fechar(); }
}

console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
