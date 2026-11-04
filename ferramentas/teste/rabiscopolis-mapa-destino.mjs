// Mapa grande da Rabiscolândia (mapa-ui.js): nomes sem sobrepor no celular em pé, no celular deitado e na TV/computador,
// todos os lugares importantes no mapa, busca, e "Ir para lá" na Marlon Máquinas: a setinha (bússola + seta 3D + farol)
// guia até lá e some ao chegar; o ✕ cancela. Chrome mudo (--mute-audio, cdp.mjs). Fotos em FOTOS (ou .claude/tmp/mapa/).
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/rabiscopolis-mapa-destino.mjs [http://localhost:8097]
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8097";
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
const FOTOS = process.env.FOTOS || fileURLToPath(new URL("../../.claude/tmp/mapa/", import.meta.url));
mkdirSync(FOTOS, { recursive: true });
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 8 * 60 * 1000);
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 20000, passo = 150) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e));
const IMPORTANTES = ["kids1", "kids2", "igreja", "parceiro-je-multimarcas", "parceiro-rise-up", "parceiro-bella-cat", "parceiro-crescente-contabilidade", "parceiro-gala-presentes", "parceiro-see-love-joias", "parceiro-bella-company", "parceiro-marlon-maquinas", "parceiro-cafe-com-deus-pai-kids", "parceiro-ballet-e-cia", "parceiro-bt-models", "parceiro-speedy-solucoes", "parceiro-construrenova"];

// nada se sobrepõe: nome × nome, nome × alfinete, alfinete × alfinete (os encostados viram grupo "+n")
const SOBREPOE = `(() => {
  const d = teste.mapaUI.desenho, R = d.R ?? 14, ruins = [];
  const cruza = (a, b) => a.x0 < b.x1 - 0.5 && a.x1 > b.x0 + 0.5 && a.y0 < b.y1 - 0.5 && a.y1 > b.y0 + 0.5;
  const pinos = d.pinos.map((p) => ({ id: p.id, x0: p.x - p.r, x1: p.x + p.r, y0: p.y - p.r, y1: p.y + p.r }));
  for (let i = 0; i < d.rotulos.length; i++) for (let k = i + 1; k < d.rotulos.length; k++) if (cruza(d.rotulos[i], d.rotulos[k])) ruins.push(d.rotulos[i].txt + " × " + d.rotulos[k].txt);
  for (const r of d.rotulos) for (const p of pinos) if (cruza(r, p)) ruins.push(r.txt + " × alfinete " + p.id);
  const P = d.pinos;
  for (let i = 0; i < P.length; i++) for (let k = i + 1; k < P.length; k++) if (Math.hypot(P[i].x - P[k].x, P[i].y - P[k].y) < P[i].r + P[k].r) ruins.push("alfinete " + P[i].id + " × " + P[k].id);
  for (const r of d.rotulos) if (r.x0 < 0 || r.y0 < 0 || r.x1 > d.larg || r.y1 > d.alt) ruins.push(r.txt + " cortado na borda");
  return { ruins, nomes: d.rotulos.length, pinos: d.pinos.length };
})()`;

async function tela(nome, opcoes) {
  const t = await abrir("about:blank", opcoes);
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await ate(t, "document.readyState === 'complete'");
  await t.ev(`localStorage.clear(); ${FAMILIA}`);
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo && !!teste.mapaUI", 60000), `${nome}: o jogo carregou`);
  await ate(t, "document.fonts.status === 'loaded'", 8000);
  await espera(1200);
  return t;
}
async function conferir(t, nome, rotulo) {
  await espera(500);
  const r = await t.ev(SOBREPOE);
  ok(r.ruins.length === 0, `${nome} ${rotulo}: ${r.pinos} alfinetes e ${r.nomes} nomes, nada sobreposto ${r.ruins.slice(0, 5).join(" ; ")}`);
  ok(!(await t.transborda()), `${nome} ${rotulo}: a página não passa da largura da tela`);
}

for (const [nome, opcoes] of [["celular em pé", { mobile: true, largura: 390, altura: 844 }], ["celular deitado", { mobile: true, largura: 844, altura: 390 }], ["TV", { largura: 1920, altura: 1080 }]]) {
  const t = await tela(nome, opcoes);
  const arq = nome.replace(/ /g, "-").replace("é", "e");
  try {
    if (nome === "TV") await t.ev("document.documentElement.classList.add('modo-tv')");
    // no celular de verdade o jogo pede a tela deitada ("Gire o celular"); em pé o aviso sai da frente só para conferir o mapa
    if (nome === "celular em pé") await t.ev("(() => { const s = document.createElement('style'); s.textContent = '.gire-celular { display: none !important; }'; document.head.append(s); })()");
    await t.ev("teste.mapaPedido(); document.querySelector('.minimapa-rp').click()");
    ok(await ate(t, "!document.querySelector('.mapa-grande-rp').hidden"), `${nome}: o mapa grande abriu`);
    // todos os lugares importantes estão no mapa (na lista e como alfinete)
    const ids = await t.ev("teste.mapaUI.itens.map((i) => i.id)");
    const falta = IMPORTANTES.filter((i) => !ids.includes(i));
    ok(!falta.length, `${nome}: escolas, igreja e todas as parceiras estão no mapa ${falta.join(", ")}`);
    await conferir(t, nome, "cidade inteira");
    await t.foto(`${FOTOS}${arq}-1-cidade.png`);
    // aproximar no centro (mais nomes aparecem, nenhum por cima do outro)
    await t.ev("teste.mapaUI.zoom(2.2)"); await conferir(t, nome, "aproximado 2,2×");
    await t.foto(`${FOTOS}${arq}-2-aproximado.png`);
    await t.ev("teste.mapaUI.zoom(2.2)"); await conferir(t, nome, "aproximado 4,8×");
    await t.foto(`${FOTOS}${arq}-3-bem-perto.png`);
    // filtro das parceiras
    await t.ev("teste.mapaUI.zoom(0.01); teste.mapaUI.filtrar('parceira')"); await conferir(t, nome, "só parceiras");
    await t.foto(`${FOTOS}${arq}-4-parceiras.png`);
    await t.ev("teste.mapaUI.filtrar('todos')");
    // busca "marlon" → a Marlon Máquinas na lista; escolher mostra o cartão com "Ir para lá"
    await t.ev("teste.mapaUI.buscar('marlon')"); await espera(300);
    const itens = await t.ev("[...document.querySelectorAll('.mp-item')].map((b) => b.textContent)");
    ok(itens.length === 1 && /Marlon Máquinas/.test(itens[0]), `${nome}: a busca "marlon" acha a Marlon Máquinas (${itens.length} item)`);
    await t.ev("document.querySelector('.mp-item').click()"); await espera(700);
    ok(await t.ev("teste.mapaUI.selecionado === 'parceiro-marlon-maquinas' && !document.querySelector('.mp-cartao').hidden && !!document.querySelector('.mp-ir')"), `${nome}: escolher na lista mostra o cartão com "Ir para lá"`);
    await conferir(t, nome, "com a Marlon escolhida");
    await t.foto(`${FOTOS}${arq}-5-marlon-escolhida.png`);
    // tocar no alfinete do mapa também escolhe
    await t.ev("teste.mapaUI.buscar(''); document.querySelector('.mp-cartao .mp-x').click()"); await espera(400);
    const pin = await t.ev("(() => { const p = teste.mapaUI.desenho.pinos.find((q) => q.id === 'parceiro-kids1' || q.id === 'kids1'); return p ? [p.x, p.y] : null; })()");
    if (pin) { await t.ev(`teste.mapaUI.tocar(${pin[0]}, ${pin[1]})`); await espera(600); }
    const s2 = await t.ev("teste.mapaUI.selecionado");
    ok(s2 === "kids1" || (await t.ev("teste.mapaUI.vista.esc > teste.mapaUI.vista.min * 1.5")), `${nome}: tocar no alfinete da Educarte Kids I escolhe ou aproxima o grupo (${s2})`);
    // Ir para lá
    await t.ev("teste.mapaUI.selecionar('parceiro-marlon-maquinas')"); await espera(500);
    await t.ev("document.querySelector('.mp-ir').click()"); await espera(500);
    ok(await t.ev("document.querySelector('.mapa-grande-rp').hidden"), `${nome}: "Ir para lá" fecha o mapa`);
    ok(await t.ev("teste.alvoMapa?.id === 'parceiro-marlon-maquinas'"), `${nome}: o destino é a Marlon Máquinas`);
    ok(await ate(t, "!document.querySelector('.bussola-rp').hidden && /Marlon Máquinas/.test(document.querySelector('.bussola-rp .rotulo').textContent)", 3000), `${nome}: a bússola mostra "Marlon Máquinas" e os metros`);
    ok(await ate(t, "teste.guia?.visivel && teste.guia.farol", 3000), `${nome}: a seta 3D e o farol aparecem`);
    // a seta aponta para a Marlon (que fica em -106, 149,5)
    const g = await t.ev("(() => { const g = teste.guia, p = teste.j.pos; const ang = Math.atan2(-106 - p.x, 149.5 - p.z); return Math.abs(Math.atan2(Math.sin(g.rot - ang), Math.cos(g.rot - ang))); })()");
    ok(g < 0.05, `${nome}: a seta 3D aponta para a Marlon Máquinas (erro ${g.toFixed(3)} rad)`);
    await t.foto(`${FOTOS}${arq}-6-seta-guiando.png`);
    if (nome === "TV") {
      // o ✕ da bússola cancela
      await t.ev("document.querySelector('.bussola-rp .cancelar').click()"); await espera(400);
      ok(await t.ev("teste.alvoMapa === null && !teste.guia.visivel"), "TV: o ✕ da bússola cancela o destino");
      // teclado: abre com M, navega, Enter escolhe, Enter vai
      await t.ev("dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }))"); await espera(300); // minimapa
      await t.ev("teste.mapaUI.abrir ? document.querySelector('.minimapa-rp').click() : 0"); await espera(500);
      await t.ev("dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }))"); await espera(300);
      const foco1 = await t.ev("document.querySelector('.mapa-grande-rp .rf-foco')?.dataset.id ?? null");
      await t.ev("dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))"); await espera(400);
      const focoIr = await t.ev("document.querySelector('.mapa-grande-rp .rf-foco')?.classList.contains('mp-ir')");
      await t.ev("dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))"); await espera(400);
      ok(foco1 && focoIr && (await t.ev(`teste.alvoMapa?.id === ${JSON.stringify(foco1)} && document.querySelector('.mapa-grande-rp').hidden`)), `TV: no teclado, seta + Enter + Enter vai para ${foco1}`);
      await t.ev("document.querySelector('.bussola-rp .cancelar').click()"); await espera(300);
      // de novo a Marlon, e chegar lá de carro
      await t.ev("document.querySelector('.minimapa-rp').click()"); await espera(400);
      await t.ev("teste.mapaUI.selecionar('parceiro-marlon-maquinas')"); await espera(300);
      await t.ev("teste.mapaUI.ir('parceiro-marlon-maquinas')"); await espera(300);
    }
    // chegar: o Rabisco vai para perto da porta da Marlon e a setinha some
    await t.ev("teste.ir(-106, 145)");
    ok(await ate(t, "teste.alvoMapa === null", 5000), `${nome}: ao chegar o destino acaba`);
    ok(await ate(t, "!teste.guia.visivel && !teste.guia.farol && document.querySelector('.bussola-rp').hidden", 3000), `${nome}: a seta 3D, o farol e a bússola somem ao chegar`);
    await t.foto(`${FOTOS}${arq}-7-chegou.png`);
    ok(!errosDeVerdade(t).length, `${nome}: sem erro de console ${errosDeVerdade(t).slice(0, 3).join(" ; ")}`);
  } finally { await t.fechar(); }
}
clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
