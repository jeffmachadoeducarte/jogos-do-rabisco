// Rabiscolândia: Crescente Contabilidade (parceira nova) e a missão Alvará da Escola, de ponta a ponta, com 1 e 2 jogadores.
//  - o prédio-escritório fica longe das outras parceiras; banner da marca de letreiro;
//  - a Diretora Sabrina (lápis rosa) pede na porta da escola da criança; a anfitriã chama a criança pelo nome
//    ("Alice" + "o alvará da escola venceu!...") e fala "Crescente Contabilidade";
//  - lá dentro a contadora entrega o alvará, que vai na MÃO do Rabisco; a diretora recebe na porta da escola;
//  - no fim: "Obrigada, Alice! ..." e a fala exata da anfitriã; sem erro de console.
// Fotos em .claude/tmp/crescente/. Nunca toca som: o Chrome do cdp.mjs abre com --mute-audio.
// Uso: node --experimental-websocket ferramentas/teste/rabiscopolis-crescente.mjs [http://localhost:8080] [1,2]
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8080";
const SO = (process.argv[3] || "").split(",").filter(Boolean);
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
const FOTOS = fileURLToPath(new URL("../../.claude/tmp/crescente/", import.meta.url));
mkdirSync(FOTOS, { recursive: true });
let falhas = 0;
const vigia = setTimeout(() => { console.log("✗ o teste travou (o navegador caiu?)"); process.exit(2); }, 20 * 60 * 1000);
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 40000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e));
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }));`;
const FIM = "Agora está tudo certinho! Ter uma boa contabilidade é essencial para qualquer empresa. Obrigada, Crescente Contabilidade!";
const balao = (t) => t.ev("document.querySelector('.balao-rp')?.textContent || ''");
const baixou = (t, chave) => t.ev(`performance.getEntriesByType('resource').some((r) => r.name.includes('/assets/voz/${chave}.mp3'))`);

// ------------------------------------------------------------------ 1 jogador: a missão inteira, com fotos
async function umJogador() {
  const t = await abrir("about:blank", { largura: 1280, altura: 720 });
  try {
    await t.cmd("Page.navigate", { url: URL_JOGO });
    await ate(t, "document.readyState === 'complete'");
    await t.ev(`localStorage.clear(); ${FAMILIA}`);
    // a lista de arquivos baixados (para conferir as vozes) cabe tudo: o padrão do navegador é só 250
    await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: "performance.setResourceTimingBufferSize(20000);" });
    await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
    ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo"), "carregou e começou (1 jogador)");
    await espera(2500);
    const ev = (s) => t.ev(s);
    const L = await ev("teste.LUGARES.find((l) => l.id === 'parceiro-crescente-contabilidade')");
    ok(L && L.parceiro?.tipo === "contabilidade" && L.parceiro.instagram === "contabilidadecrescente", `a Crescente Contabilidade está na cidade (${L?.x}, ${L?.z})`);
    // longe das outras parceiras
    const outras = await ev("teste.LUGARES.filter((l) => l.parceiro && l.id !== 'parceiro-crescente-contabilidade').map((l) => Math.hypot(l.x - " + L.x + ", l.z - " + L.z + "))");
    ok(outras.every((d) => d > 150), `longe das outras parceiras (${outras.map((d) => Math.round(d)).join(", ")} m)`);
    // fachada: prédio-escritório marrom e dourado com o banner
    await ev(`teste.ir(${L.x}, ${L.z - 6}); teste.olhar(0)`); await espera(1500);
    await ev(`teste.vista([${L.x + 9}, 6.5, ${L.z - 20}], [${L.x}, 5.2, ${L.z + 5}])`); await espera(2500);
    await t.foto(`${FOTOS}1-fachada.png`);
    await ev(`teste.vista([${L.x - 2}, 4, ${L.z - 12}], [${L.x}, 5.6, ${L.z + 2}])`); await espera(1200);
    await t.foto(`${FOTOS}1b-fachada-banner.png`);
    await ev("teste.vista(null)");
    ok(await ev(`teste.fis ? !teste.dentroDeSolido?.(${L.x}, ${L.z}) : true`), "a calçada na frente da porta é livre");

    // quem pede: a Diretora Sabrina, na porta da escola da criança
    const d = await ev("teste.missoes.npc('alvara', 'diretora')");
    const esc = await ev("teste.LUGARES.find((l) => l.id === 'kids2')");
    ok(Math.hypot(d.x - esc.x, d.z - esc.z) < 8, `a Diretora Sabrina espera na porta da Educarte Kids II (${d.x.toFixed(1)}, ${d.z.toFixed(1)})`);
    await ev(`teste.ir(${d.x + 1.4}, ${d.z + 1.2})`); await espera(900);
    const c0 = await ev("teste.contexto");
    ok(c0?.includes("Alvará da Escola"), `perto da diretora aparece "${c0}"`);
    await ev("teste.acao()"); await espera(1500);
    ok(await ev("teste.missoes.ativa === 'alvara'"), `missão aceita — ${await ev("JSON.stringify(teste.missoes.texto())")}`);
    const b0 = await balao(t);
    ok(/Alice, o alvará da escola venceu! Vá até o escritório da Crescente Contabilidade/.test(b0), `a anfitriã chama a Alice pelo nome e fala "Crescente Contabilidade" ("${b0.slice(0, 90)}")`);
    ok(await baixou(t, "cid-alvara-pos") && await baixou(t, "nomes/alice"), "a voz é a gravada (nome Alice + cid-alvara-pos), nada de voz do navegador");
    const a = await ev("teste.missoes.alvo()");
    ok(a && Math.hypot(a.x - L.x, a.z - L.z) < 1, `a seta/bússola aponta para a porta da Crescente (${a?.emoji})`);

    // entrar e falar com a contadora
    await ev(`teste.ir(${L.x + L.dir[0] * 0.5}, ${L.z + L.dir[1] * 0.5})`); await espera(700);
    const c1 = await ev("teste.contexto");
    await ev("teste.acao()");
    ok(c1?.includes("Entrar") && await ate(t, "teste.emLugar?.id === 'parceiro-crescente-contabilidade'", 8000), `entrou na Crescente ("${c1}")`);
    await espera(600);
    ok(/buscar o alvará/.test(await balao(t)), `lá dentro a contadora chama ("${(await balao(t)).slice(0, 60)}")`);
    const ci = await ev("teste.emLugar.interativos.find((i) => i.id === 'contadora')");
    await ev(`teste.ir(${ci.pos[0] + 1.4}, ${ci.pos[1] + 2.4})`); await espera(600);
    await ev(`teste.vista([${ci.pos[0] + 3.2}, 3.4, ${ci.pos[1] + 4.6}], [${ci.pos[0] - 0.4}, 1.2, ${ci.pos[1] - 1.6}])`); await espera(1500);
    await t.foto(`${FOTOS}2-interior-contadora.png`);
    await ev(`teste.vista([${ci.pos[0] + 6.2}, 6.5, ${ci.pos[1] + 5.8}], [${ci.pos[0] - 1}, 0.8, ${ci.pos[1] - 1.8}])`); await espera(1200);
    await t.foto(`${FOTOS}2b-interior-geral.png`);
    await ev("teste.vista(null)");
    await ev("teste.irAoInterativo('contadora')"); await espera(200);
    const c2 = await ev("teste.contexto");
    await ev("teste.acao()"); await espera(1000);
    ok(c2?.includes("contadora") && (await ev("teste.missoes.etapa")) === 1 && await ev("teste.missoes.levando.includes('alvara')"), `a contadora entregou o alvará ("${c2}")`);
    ok((await ev("teste.missoes.naMao")) === "alvara" && await ev("!!teste.rabisco.bracoD.cotovelo.children.find((o) => o.userData.item === 'alvara')"), "o alvará (papel com selo) está na mão do Rabisco");
    ok(await baixou(t, "cid-crescente-alvara"), "a contadora fala com a voz gravada");
    await t.foto(`${FOTOS}2c-contadora-entregou.png`);
    await ev("teste.sairLugar()"); await espera(700);
    // de perto, na calçada: o alvará (papel com selo) na mão do Rabisco, de frente e de trás
    const p = await ev("[teste.j.pos.x, teste.j.pos.z, teste.rabisco.grupo.rotation.y]");
    for (const [k, ang] of [["3-alvara-na-mao", 0.9], ["3b-alvara-na-mao-costas", Math.PI - 0.6]]) {
      const a0 = p[2] + ang;
      await ev(`teste.vista([${p[0] + Math.sin(a0) * 2.6}, 1.8, ${p[1] + Math.cos(a0) * 2.6}], [${p[0]}, 0.9, ${p[1]}])`); await espera(1100);
      await t.foto(`${FOTOS}${k}.png`);
    }
    await ev("teste.vista(null)");
    const a2 = await ev("teste.missoes.alvo()");
    ok(a2 && Math.hypot(a2.x - d.x, a2.z - d.z) < 1.5, "a seta agora aponta para a Diretora Sabrina");

    // levar até a escola: a diretora espera na porta
    await ev(`teste.ir(${d.x + 1.5}, ${d.z + 1.6})`); await espera(1000);
    const c3 = await ev("teste.contexto");
    ok(c3?.includes("Entregar para Diretora Sabrina"), `na porta da escola: "${c3}"`);
    await ev(`teste.vista([${d.x - 2.2}, 2.3, ${d.z + 6.2}], [${d.x + 0.8}, 1.0, ${d.z + 0.7}])`); await espera(1300);
    await t.foto(`${FOTOS}4-entrega-diretora-antes.png`);
    await ev("teste.acao()"); await espera(500);
    const bAg = await balao(t);
    await t.foto(`${FOTOS}5-entrega-diretora.png`);
    ok(await ev("teste.missoes.ativa === null && teste.missoes.feitas.includes('alvara')"), "entregou e a missão terminou (selo no Passaporte)");
    ok(/Obrigada, Alice! Agora a escola está em dia\./.test(bAg), `a Diretora Sabrina agradece ("${bAg.slice(0, 60)}")`);
    ok((await ev("teste.missoes.naMao")) === null, "o alvará saiu da mão do Rabisco");
    ok(await ate(t, `document.querySelector('.balao-rp')?.textContent.includes(${JSON.stringify(FIM)})`, 8000), `no fim a anfitriã diz: "${FIM}"`);
    // o MP3 só entra na lista quando termina de baixar: espera um pouco
    ok(await ate(t, "performance.getEntriesByType('resource').some((r) => r.name.includes('/assets/voz/cid-alvara-ok.mp3'))", 10000) && await baixou(t, "cid-alvara-obrigada-pos"), "as falas do fim são as gravadas (cid-alvara-obrigada-pre/pos e cid-alvara-ok)");
    await ev("teste.vista(null)");
    ok(!errosDeVerdade(t).length, `sem erro de console ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
  } finally { await t.fechar(); }
}

// ------------------------------------------------------------------ 2 jogadores: o jogador 2 aceita e entrega
const PADS = `
  window.__pads = [0, 1].map((i) => ({ index: i, id: "teste " + i, connected: true, mapping: "standard", timestamp: 0,
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }));
  navigator.getGamepads = () => window.__pads;
  window.__btn = (p, i, v) => { window.__pads[p].buttons[i].pressed = v; window.__pads[p].buttons[i].value = v ? 1 : 0; };
  window.__eixo = (p, x, y) => { window.__pads[p].axes[0] = x; window.__pads[p].axes[1] = y; };
`;
async function doisJogadores() {
  const t = await abrir("about:blank", { largura: 1280, altura: 720 });
  try {
    await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: PADS + FAMILIA + "performance.setResourceTimingBufferSize(20000);" });
    await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&fixo` });
    const aperta = async (p, b) => { await t.ev(`__btn(${p}, ${b}, true)`); await espera(450); await t.ev(`__btn(${p}, ${b}, false)`); await espera(150); };
    await ate(t, "!!window.teste && !!document.querySelector('[data-jogadores]')");
    await t.ev(`document.querySelector('[data-jogadores="2"]').click()`); await espera(300);
    await ate(t, "!!document.querySelector('.casca-abertura .botao')");
    await t.ev(`document.querySelector('.casca-abertura .botao.respira, .casca-abertura .casca-nivel').click()`);
    ok(await ate(t, "teste.vivo && teste.j2.escolhendo", 40000), "2 jogadores: o jogador 2 escolhe quem quer ser");
    await espera(1000);
    await aperta(1, 2);
    ok(await ate(t, "teste.dois", 4000), "2 jogadores: jogador 2 em jogo");
    await espera(1200);
    const ev = (s) => t.ev(s);
    const d = await ev("teste.missoes.npc('alvara', 'diretora')");
    // o jogador 2 aceita a missão pela ação dele
    await ev(`teste.ir(${d.x + 5}, ${d.z + 3})`); await espera(900);
    await ev(`teste.j2.st.pos.set(${d.x + 1.2}, 0.07, ${d.z + 1})`); await espera(800);
    const rot = await ev("document.querySelector('.acao-j2-rp:not([hidden])')?.textContent || ''");
    await aperta(1, 2); await espera(400);
    ok(rot.includes("Alvará") && await ev("teste.missoes.ativa === 'alvara'"), `2 jogadores: o jogador 2 aceita a missão ("${rot.trim()}")`);
    // os dois entram na Crescente; o Rabisco fala com a contadora
    await ev("teste.entrarLugar('parceiro-crescente-contabilidade')"); await espera(1500);
    const dl = await ev("Math.hypot(teste.j2.pos.x - teste.j.pos.x, teste.j2.pos.z - teste.j.pos.z)");
    ok(dl < 4, `2 jogadores: o jogador 2 entra junto na Crescente (${dl.toFixed(1)} m)`);
    await ev("teste.irAoInterativo('contadora')"); await espera(300);
    await ev("teste.acao()"); await espera(1000);
    ok((await ev("teste.missoes.naMao")) === "alvara", "2 jogadores: o alvará está na mão do Rabisco");
    await t.foto(`${FOTOS}6-dois-jogadores-dentro.png`);
    await ev("teste.sairLugar()"); await espera(800);
    // o jogador 2 entrega para a diretora
    await ev(`teste.ir(${d.x + 4}, ${d.z + 3.5})`); await espera(900);
    await ev(`teste.j2.st.pos.set(${d.x + 1.2}, 0.07, ${d.z + 1})`); await espera(800);
    const rot2 = await ev("document.querySelector('.acao-j2-rp:not([hidden])')?.textContent || ''");
    await aperta(1, 2); await espera(600);
    ok(rot2.includes("Diretora Sabrina") && await ev("teste.missoes.ativa === null && teste.missoes.feitas.includes('alvara')"), `2 jogadores: o jogador 2 entrega o alvará ("${rot2.trim()}")`);
    await t.foto(`${FOTOS}7-dois-jogadores-entrega.png`);
    ok(await ate(t, `document.querySelector('.balao-rp')?.textContent.includes(${JSON.stringify(FIM)})`, 8000), "2 jogadores: a anfitriã diz o fim");
    ok(!errosDeVerdade(t).length, `2 jogadores: sem erro de console ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
  } finally { await t.fechar(); }
}

// idade ≤ 4 (Kids I): a Diretora Sabrina continua na Educarte Kids II
async function idadeBaixa() {
  const t = await abrir("about:blank", { largura: 1280, altura: 720 });
  try {
    await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo&idade=3` });
    ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo"), "carregou com ?idade=3");
    await espera(1500);
    const d = await t.ev("teste.missoes.npc('alvara', 'diretora')");
    const k2 = await t.ev("teste.LUGARES.find((l) => l.id === 'kids2')");
    const k1 = await t.ev("teste.LUGARES.find((l) => l.id === 'kids1')");
    ok(Math.hypot(d.x - k2.x, d.z - k2.z) < 8 && Math.hypot(d.x - k1.x, d.z - k1.z) > 8, `idade 3: a Diretora Sabrina fica na Kids II (${d.x.toFixed(1)}, ${d.z.toFixed(1)})`);
  } finally { await t.fechar?.(); }
}
if (!SO.length || SO.includes("3")) await idadeBaixa();
if (!SO.length || SO.includes("1")) await umJogador();
if (!SO.length || SO.includes("2")) await doisJogadores();
clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
