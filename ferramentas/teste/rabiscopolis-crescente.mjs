// Rabiscolândia: Crescente Contabilidade (parceira nova) e a missão Alvará da Escola, de ponta a ponta, com 1 e 2 jogadores.
//  - o prédio-escritório fica longe das outras parceiras; banner da marca de letreiro;
//  - a Diretora Sabrina (lápis rosa) pede na porta da escola da criança; a anfitriã chama a criança pelo nome
//    ("Alice" + "o alvará da escola venceu!...") e fala "Crescente Contabilidade";
//  - lá dentro a contadora entrega o alvará, que vai na MÃO do Rabisco; a diretora recebe na porta da escola;
//  - no fim: "Obrigada, Alice! ..." e a fala exata da anfitriã; sem erro de console;
//  - ANDANDO DE VERDADE (seção 4): sem teleporte nem gancho, com teclado (1280 × 720) e com o joystick de toque
//    (celular deitado 844 × 390), o Rabisco anda da calçada até a porta, entra pela ação, anda até a contadora (e, na
//    Bella Cat e na Rise Up, até o balcão/halter) e usa a ação; falha se não chegar. No 2 jogadores, o controle 1 anda.
// Fotos em .claude/tmp/crescente/. Nunca toca som: o Chrome do cdp.mjs abre com --mute-audio.
// Uso: node --experimental-websocket ferramentas/teste/rabiscopolis-crescente.mjs [http://localhost:8080] [1,2,3,4]
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8080";
const SO = (process.argv[3] || "").split(",").filter(Boolean);
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
const FOTOS = fileURLToPath(new URL("../../.claude/tmp/crescente/", import.meta.url));
const FOTOS_RP = fileURLToPath(new URL("../../.claude/tmp/rabiscopolis/", import.meta.url));
mkdirSync(FOTOS, { recursive: true }); mkdirSync(FOTOS_RP, { recursive: true });
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
    ok(/^RabiscolândiaAlice, o alvará da escola venceu! Vá até a Crescente Contabilidade e fale com a contadora Elaine para buscar o alvará novo\./.test(b0), `a anfitriã chama a Alice pelo nome e fala "Crescente Contabilidade" e "contadora Elaine" ("${b0.slice(0, 90)}")`);
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
    const bC = await balao(t);
    ok(/^RabiscolândiaA contadora Elaine entregou o alvará/.test(bC), `quem fala é a anfitriã narrando, não a contadora ("${bC.slice(0, 60)}")`);
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
    ok(/^RabiscolândiaA Diretora Sabrina agradece, Alice! Agora a escola está em dia\./.test(bAg), `a anfitriã narra que a Diretora Sabrina agradece ("${bAg.slice(0, 70)}")`);
    ok((await ev("teste.missoes.naMao")) === null, "o alvará saiu da mão do Rabisco");
    ok(await ate(t, `document.querySelector('.balao-rp')?.textContent.includes(${JSON.stringify(FIM)})`, 8000), `no fim a anfitriã diz: "${FIM}"`);
    // o MP3 só entra na lista quando termina de baixar: espera um pouco
    ok(await ate(t, "performance.getEntriesByType('resource').some((r) => r.name.includes('/assets/voz/cid-alvara-ok.mp3'))", 10000) && await baixou(t, "cid-alvara-obrigada-pos"), "as falas do fim são as gravadas (cid-alvara-obrigada-pre/pos e cid-alvara-ok)");
    await ev("teste.vista(null)");
    ok(!errosDeVerdade(t).length, `sem erro de console ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
  } finally { await t.fechar(); }
}

// ------------------------------------------------------------------ andar de verdade (sem teleporte)
// Anda até (x, z) só pela entrada que o jogador usa: a cada 100 ms lê a posição e a câmera e escolhe a direção
// (teclas: setas; toque: o dedo segura o joystick e arrasta; controle: o eixo do pad). Devolve { chegou, log }.
const CAM = "[Math.sin(teste.camYaw), Math.cos(teste.camYaw)]"; // o mesmo "frente" que fisica.andar usa
const SETAS = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };
function entradaTeclas(t) {
  const presas = new Set();
  const solta = async (k) => { await t.cmd("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: k, windowsVirtualKeyCode: SETAS[k] }); presas.delete(k); };
  return {
    async mandar(ix, iy) {
      const quer = new Set([iy > 0.38 && "ArrowUp", iy < -0.38 && "ArrowDown", ix > 0.38 && "ArrowRight", ix < -0.38 && "ArrowLeft"].filter(Boolean));
      for (const k of [...presas]) if (!quer.has(k)) await solta(k);
      for (const k of quer) if (!presas.has(k)) { await t.cmd("Input.dispatchKeyEvent", { type: "keyDown", key: k, code: k, windowsVirtualKeyCode: SETAS[k] }); presas.add(k); }
    },
    async parar() { for (const k of [...presas]) await solta(k); },
    digital: true,
    async acao() { for (const type of ["keyDown", "keyUp"]) { await t.cmd("Input.dispatchKeyEvent", { type, key: "f", code: "KeyF", windowsVirtualKeyCode: 70 }); await espera(120); } },
  };
}
// o dedo pousa onde o jogador pousaria: metade esquerda, de baixo para cima, no primeiro ponto em que o joystick
// recebe o toque (se nada da metade esquerda chega ao joystick, o teste falha: algo está tapando o controle)
const PONTO_JOYSTICK = `(() => { for (let y = innerHeight - 70; y > innerHeight * 0.35; y -= 20) for (let x = 90; x < innerWidth * 0.42; x += 30) { const e = document.elementFromPoint(x, y); if (e?.closest('.jd-camada') && !e.closest('button')) return [x, y]; } return null; })()`;
function entradaToque(t) {
  let O = null; const R = 56; let segurando = false;
  return {
    async mandar(ix, iy) {
      if (!segurando) {
        O = await t.ev(PONTO_JOYSTICK);
        if (!O) { const o = await t.ev("(() => { const e = document.elementFromPoint(150, innerHeight - 110); return e ? (e.className || e.tagName) + '' : null; })()"); throw new Error(`toque: nenhum ponto da metade esquerda chega ao joystick (em (150, ${"h-110"}) está "${o}")`); }
        await t.cmd("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: O[0], y: O[1] }] }); segurando = true; await espera(30);
      }
      const m = Math.hypot(ix, iy) || 1, pt = { x: O[0] + (ix / m) * R * 1.3, y: O[1] - (iy / m) * R * 1.3 };
      await t.cmd("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pt] });
    },
    digital: false,
    async parar() { if (segurando) await t.cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); segurando = false; },
    async acao() { await t.toque(".rp-acao"); },
  };
}
function entradaPad(t, p) {
  return {
    async mandar(ix, iy) { await t.ev(`__eixo(${p}, ${ix}, ${-iy})`); },
    async parar() { await t.ev(`__eixo(${p}, 0, 0)`); },
    async acao() { await t.ev(`__btn(${p}, 2, true)`); await espera(400); await t.ev(`__btn(${p}, 2, false)`); await espera(150); },
  };
}
// espera os quadros voltarem ao normal (a 1ª visita monta a sala e compila sombreadores: no Chrome sem janela um quadro
// chega a levar segundos, e uma tecla apertada nesse meio-tempo vira um passo enorme)
const UM_QUADRO = "new Promise((r) => requestAnimationFrame(() => r()))";
async function estabilizar(t, ms = 20000) {
  const fim = Date.now() + ms; let bons = 0;
  while (Date.now() < fim && bons < 4) {
    const t0 = Date.now(); await t.ev("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
    bons = Date.now() - t0 < 150 ? bons + 1 : 0;
  }
}
// o limite é em passinhos (o Chrome sem janela às vezes leva segundos por quadro; tempo de relógio não serve de limite)
async function andarAte(t, ent, alvo, { raio = 0.5, passos = 40, ms = 120000, pos = "[teste.j.pos.x, teste.j.pos.z]", chegou = null } = {}) {
  await estabilizar(t);
  const log = [], fim = Date.now() + ms, ini = await t.ev(pos);
  const andou = async () => { const [x, z] = await t.ev(pos); return Math.hypot(x - ini[0], z - ini[1]); };
  let parado = 0, ultimo = null;
  try {
    while (Date.now() < fim && log.length < passos) {
      const [x, z, fx, fz] = await t.ev(`[...${pos}, ...${CAM}]`);
      log.push(`(${x.toFixed(2)}, ${z.toFixed(2)})`);
      const dx = alvo[0] - x, dz = alvo[1] - z, d = Math.hypot(dx, dz);
      if (d < raio && (!chegou || await t.ev(chegou))) return { chegou: true, log, andou: await andou() };
      // parado 1,5 s com a entrada apertada = bloqueado
      if (ultimo && Math.hypot(x - ultimo[0], z - ultimo[1]) < 0.02) { if (++parado >= 12) return { chegou: false, log, preso: [x, z], andou: await andou() }; } else parado = 0;
      ultimo = [x, z];
      const wx = dx / d, wz = dz / d;
      // inverso de fisica.andar: wx = fx·iy − fz·ix, wz = fz·iy + fx·ix
      let iy = fx * wx + fz * wz, ix = -fz * wx + fx * wz;
      // passinhos: aperta por um quadro e solta (no Chrome sem janela um quadro leva 0,1–0,3 s e a leitura pela CDP
      // demora mais que isso; segurando direto o Rabisco passava do ponto e ficava indo e voltando)
      await ent.mandar(ix, iy); await t.ev(UM_QUADRO); await ent.parar(); await t.ev(UM_QUADRO);
    }
    return { chegou: false, log, andou: await andou() };
  } finally { await ent.parar(); await espera(250); }
}
// sai da calçada, anda até a porta, entra pela ação e anda até o interativo `alvoId` (com um ponto de passagem opcional)
// `empurra`: no fim, anda contra o móvel do interativo (balcão) nessa direção: o móvel segura o Rabisco dentro da zona
// da ação, como faz uma criança que encosta no balcão (com quadros lentos um passinho de tecla passa de 3 m)
async function entrarEAndar(t, ent, lugarId, alvoId, { rotulo, passa = null, empurra = null, nome }) {
  const L = await t.ev(`teste.LUGARES.find((l) => l.id === '${lugarId}')`);
  // começa na calçada, 5 m na frente da porta, olhando para ela (a câmera vem de trás)
  await t.ev(`teste.ir(${L.x + L.dir[0] * 5}, ${L.z + L.dir[1] * 5}); teste.olhar(${Math.atan2(-L.dir[0], -L.dir[1])})`); await espera(900);
  // anda até a porta e aperta a ação quando aparece "Entrar" (se o embalo passou do ponto, anda de novo: até 3 vezes)
  let r0, entrou = false;
  for (let k = 0; k < 3 && !entrou; k++) {
    r0 = await andarAte(t, ent, [L.x + L.dir[0] * 0.6, L.z + L.dir[1] * 0.6], { raio: 2.5, chegou: "(teste.contexto || '').includes('Entrar')" });
    if (!r0.chegou) break;
    if (!(await t.ev("(teste.contexto || '').includes('Entrar')"))) continue;
    await ent.acao();
    entrou = await ate(t, `teste.emLugar?.id === '${lugarId}'`, 6000);
  }
  ok(r0.chegou, `${nome}: andou da calçada até a porta (${r0.log.length} passos${r0.chegou ? "" : `; parou em ${r0.log.slice(-3).join(" → ")}`})`);
  ok(entrou, `${nome}: entrou pela porta com a ação`);
  if (!entrou) return { chegou: false, L };
  await espera(900);
  const e0 = await t.ev("[teste.j.pos.x, teste.j.pos.z]");
  ok(!(await t.ev(`teste.dentroDeSolido(${e0[0]}, ${e0[1]})`)), `${nome}: o ponto de entrada não está dentro de nada`);
  const it = await t.ev(`teste.emLugar.interativos.find((i) => i.id === '${alvoId}')`);
  const caminho = [...(passa ? [[it.pos[0] + passa[0], it.pos[1] + passa[1]]] : []), empurra ? [it.pos[0] + empurra[0] * 3, it.pos[1] + empurra[1] * 3] : it.pos];
  let r = { chegou: true, log: [] };
  for (let k = 0; k < caminho.length && r.chegou; k++) {
    const ultimoP = k === caminho.length - 1;
    const rk = await andarAte(t, ent, caminho[k], ultimoP ? { raio: empurra ? 9 : 2.5, chegou: `(teste.contexto || '').includes(${JSON.stringify(rotulo)})` } : { raio: 1.0 });
    r = { chegou: rk.chegou, log: [...r.log, ...rk.log] };
  }
  const p = await t.ev("[teste.j.pos.x, teste.j.pos.z]");
  ok(r.chegou, `${nome}: andou da porta até "${rotulo}" (${Math.hypot(p[0] - e0[0], p[1] - e0[1]).toFixed(1)} m em ${r.log.length} passos${r.chegou ? "" : `; parou em ${r.log.slice(-4).join(" → ")} — o alvo era (${it.pos.map((v) => v.toFixed(2)).join(", ")})`})`);
  return { chegou: r.chegou, L, it };
}

// ------------------------------------------------------------------ seção 4: andar de verdade nas 3 parceiras (teclado e toque)
async function andarDeVerdade(modo) {
  const toque = modo === "toque";
  const t = await abrir("about:blank", toque ? { mobile: true, largura: 844, altura: 390 } : { largura: 1280, altura: 720 });
  const nomeM = toque ? "toque 844×390" : "teclado";
  try {
    await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: FAMILIA + (toque ? "navigator.getGamepads = () => [null, null, null, null];" : "") });
    await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
    ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo"), `${nomeM}: carregou`);
    await espera(2500);
    if (toque) ok(await t.ev("!!document.querySelector('.jd-camada') && document.querySelector('.jd-camada').offsetParent !== null"), `${nomeM}: o joystick de toque aparece`);
    const ent = toque ? entradaToque(t) : entradaTeclas(t);
    // a missão do alvará ativa (pedida na porta da escola, pela ação de verdade)
    const d = await t.ev("teste.missoes.npc('alvara', 'diretora')");
    await t.ev(`teste.ir(${d.x + 1.4}, ${d.z + 1.2})`); await espera(900);
    await ent.acao(); await espera(1200);
    ok(await t.ev("teste.missoes.ativa === 'alvara'"), `${nomeM}: missão Alvará aceita`);
    // Crescente: da calçada até a contadora, e a ação entrega o alvará
    const c = await entrarEAndar(t, ent, "parceiro-crescente-contabilidade", "contadora", { rotulo: "contadora", empurra: [0, -1], nome: `${nomeM} · Crescente` });
    if (c.chegou) {
      const pj = await t.ev("[teste.j.pos.x, teste.j.pos.z]");
      ok(pj[1] > c.it.pos[1] - 0.6, `${nomeM} · Crescente: chegou pela frente do balcão (z ${pj[1].toFixed(2)})`);
      if (!toque) await t.foto(`${FOTOS_RP}crescente-balcao.png`);
      await ent.acao(); await espera(1000);
      ok(await t.ev("teste.missoes.naMao === 'alvara'"), `${nomeM} · Crescente: a contadora entregou o alvará (na mão do Rabisco)`);
      if (!toque) await t.foto(`${FOTOS_RP}crescente-balcao-alvara.png`);
      // depois da fala o Rabisco continua andando: volta até a porta
      await espera(800);
      const rv = await andarAte(t, ent, [c.it.pos[0], (await t.ev("teste.j.pos.z")) + 3], { raio: 0.8, passos: 8 });
      ok(rv.andou > 1.5, `${nomeM} · Crescente: depois de falar com a contadora o Rabisco anda de novo (${rv.andou.toFixed(1)} m)`);
    }
    await t.ev("teste.sairLugar()"); await espera(700);
    // Bella Cat: até o balcão de presente; Rise Up: até o halter (e depois do halter anda de novo)
    await entrarEAndar(t, ent, "parceiro-bella-cat", "embrulhar", { rotulo: "Embrulhar", passa: [-1.4, 0], empurra: [1, 0], nome: `${nomeM} · Bella Cat` });
    await t.ev("teste.sairLugar()"); await espera(700);
    const r = await entrarEAndar(t, ent, "parceiro-rise-up", "halter", { rotulo: "halter", nome: `${nomeM} · Rise Up` });
    if (r.chegou) {
      await ent.acao(); await espera(300);
      await ate(t, "teste.trava === null", 15000); await espera(300);
      const z0 = await t.ev("teste.j.pos.z");
      const rv = await andarAte(t, ent, [await t.ev("teste.j.pos.x"), z0 + 3], { raio: 0.8, passos: 8 });
      ok(rv.andou > 1.5, `${nomeM} · Rise Up: depois do halter o Rabisco anda de novo (${rv.andou.toFixed(1)} m)`);
    }
    await t.ev("teste.sairLugar()"); await espera(500);
    ok(!errosDeVerdade(t).length, `${nomeM}: sem erro de console ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
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
    // a parede da frente fica 1,6 m atrás de onde o Rabisco nasce: o jogador 2 tem de estar do lado de dentro
    const fora = await ev("teste.j2.pos.z - teste.j.pos.z");
    ok(fora < 1.3, `2 jogadores: o jogador 2 nasce dentro da sala, não no vão da porta (${fora.toFixed(2)} m atrás do Rabisco)`);
    // o Rabisco anda até a contadora com o controle 1 de verdade (sem teleporte) e o jogador 2 também se mexe lá dentro
    const ci = await ev("teste.emLugar.interativos.find((i) => i.id === 'contadora')");
    const r1 = await andarAte(t, entradaPad(t, 0), ci.pos, { raio: 2.5, chegou: "(teste.contexto || '').includes('contadora')" });
    ok(r1.chegou, `2 jogadores: o Rabisco anda com o controle até a contadora${r1.chegou ? "" : ` (parou em ${r1.log.slice(-3).join(" → ")})`}`);
    const q0 = await ev("[teste.j2.pos.x, teste.j2.pos.z]");
    const r2 = await andarAte(t, entradaPad(t, 1), [q0[0] - 2.5, q0[1] + 0.5], { raio: 0.8, passos: 8, pos: "[teste.j2.pos.x, teste.j2.pos.z]" });
    ok(r2.andou > 1.2, `2 jogadores: o jogador 2 anda lá dentro${r2.chegou ? "" : ` (parou em ${r2.log.slice(-3).join(" → ")})`}`);
    await aperta(0, 2); await espera(1000);
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
if (!SO.length || SO.includes("4")) { await andarDeVerdade("teclado"); await andarDeVerdade("toque"); }
clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
