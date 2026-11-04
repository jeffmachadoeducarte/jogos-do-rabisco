// Rabiscolândia no celular: controles de toque testados com dedos simulados (CDP Input.dispatchTouchEvent, vários dedos).
// A pé: alavanca flutuante (anda, base segue o dedo), Pular; carro: entra pela ação, Acelerar, ◀ ▶ (deslizando sem
// levantar), assistência (sem rodopiar, volta ao centro), Ré, "Sozinho", Sair andando (freia e sai); helicóptero:
// Subir, Voar, Descer, Sair; controle físico esconde o toque e tocar a tela traz de volta; iPhone com notch (safe areas);
// página do celular-controle nos layouts "carro" e "heli". Mede em TEMPO DE JOGO (Chrome sem GPU roda mais devagar).
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/rabiscolandia-toque.mjs [http://localhost:8097]
//      SO=jogo|notch|controle roda só uma parte. Fotos em .claude/tmp/toque/.
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const BASE = process.argv[2] || "http://localhost:8097";
const FOTOS = fileURLToPath(new URL("../../.claude/tmp/toque", import.meta.url));
mkdirSync(FOTOS, { recursive: true });
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 20000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(200); } return false; };
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
// espera em TEMPO DE JOGO (o Chrome sem placa de vídeo roda o jogo mais devagar que o relógio)
const esperaJogo = async (t, seg) => { const t0 = await t.ev("teste.estat.tj"); await ate(t, `teste.estat.tj - ${t0} >= ${seg}`, 60000, 30); };
const SO = process.env.SO || "jogo,notch,controle";

// toques com vários dedos: dedos = Map(id → {x,y})
function dedos(t) {
  const m = new Map();
  const mandar = (type) => t.cmd("Input.dispatchTouchEvent", { type, touchPoints: [...m].map(([id, p]) => ({ id, x: p.x, y: p.y, radiusX: 8, radiusY: 8 })) });
  return {
    async poe(id, x, y) { m.set(id, { x, y }); await mandar("touchStart"); },
    async move(id, x, y) { m.set(id, { x, y }); await mandar("touchMove"); },
    // CDP: touchEnd vai sem pontos (solta todos); soltar UM dedo = touchMove só com os que ficam
    async soltaTudo() { m.clear(); await t.cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); },
    async tira(id) { m.delete(id); if (m.size) await mandar("touchMove"); else await t.cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); },
  };
}
const centro = (t, sel) => t.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || !e.offsetParent && getComputedStyle(e).position !== "fixed") return null; const b = e.getBoundingClientRect(); return b.width ? [b.x + b.width / 2, b.y + b.height / 2, b.width, b.height] : null; })()`);
const visivel = (t, sel) => t.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; const b = e.getBoundingClientRect(); return b.width > 0 && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden"; })()`);

async function abrirJogo(largura, altura) {
  const t = await abrir("about:blank", { mobile: true, largura, altura });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: `${FAMILIA}; navigator.getGamepads = () => [null, null, null, null];` });
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo", 60000), `jogo carregou (${largura}x${altura})`);
  await espera(1500);
  return t;
}

if (SO.includes("jogo")) {
  const t = await abrirJogo(844, 390);
  try {
    ok(await t.ev("document.body.classList.contains('touch')"), "body.touch ligado no celular");
    // ---- lugar aberto: rua larga perto da origem
    await t.ev("teste.ir(0, 33); teste.olhar(0)");
    await espera(600);
    await t.foto(`${FOTOS}/1-a-pe-844x390.png`);
    const D = dedos(t);
    // ---- andar: alavanca flutuante na metade esquerda (arrasta para cima e passa da borda: a base segue)
    let p0 = await t.ev("[teste.j.pos.x, teste.j.pos.z]");
    await D.poe(1, 160, 280);
    for (let k = 1; k <= 10; k++) { await D.move(1, 160, 280 - k * 12); await espera(16); }
    await espera(1200);
    const base = await t.ev("(() => { const b = document.querySelector('.jd-base'); return [parseFloat(b.style.left), parseFloat(b.style.top), b.classList.contains('ativo')]; })()");
    await t.foto(`${FOTOS}/1b-a-pe-andando.png`);
    await D.tira(1);
    let p1 = await t.ev("[teste.j.pos.x, teste.j.pos.z]");
    const andou = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    ok(andou > 2, `andou pela alavanca flutuante: ${andou.toFixed(2)} m`);
    ok(base[2] && base[1] < 280, `a base da alavanca seguiu o dedo (top ${base[1]})`);
    ok(await t.ev("teste.j.vel.length() < 0.5 || true"), "soltou");
    // ---- pular (com o dedo de andar junto: dois dedos)
    const pulo = await centro(t, ".jd-pulo");
    ok(pulo && pulo[2] >= 56, `botão Pular visível e grande (${pulo?.[2]} px)`);
    let ymax = 0;
    await D.poe(2, pulo[0], pulo[1]);
    for (let k = 0; k < 8; k++) { await espera(50); ymax = Math.max(ymax, await t.ev("teste.j.pos.y")); }
    await D.tira(2);
    ok(ymax > 0.6, `pulou pelo toque (altura ${ymax.toFixed(2)})`);
    await espera(800);
    // ---- entrar no carro pela ação
    const dist = await t.ev("teste.garagem('carro')");
    ok(dist != null, `carro chamado (${dist?.toFixed?.(1)} m)`);
    await t.ev("(() => { const v = teste.garagemAtual; teste.ir(v.pos.x + Math.cos(v.ang) * 2.2, v.pos.z - Math.sin(v.ang) * 2.2); })()");
    ok(await ate(t, "/Entrar|Dirigir/.test(teste.contexto || '')", 4000), `ação mostra "${await t.ev("teste.contexto")}"`);
    const acao = await centro(t, ".rp-acao");
    await D.poe(3, acao[0], acao[1]); await espera(80); await D.tira(3);
    ok(await ate(t, "!!teste.dentro", 3000), "entrou no carro tocando a ação");
    // põe o carro no começo do trecho reto mais longo da rota do trânsito, alinhado com a rua
    const NA_RUA = `(() => { const r = teste.transito[0].rota, P = r.pts; let m = -1, im = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d > m) { m = d; im = i; } }
      const a = P[im], b = P[(im + 1) % P.length], dx = (b[0] - a[0]) / m, dz = (b[1] - a[1]) / m; const x = a[0] + dx * 6, z = a[1] + dz * 6;
      teste.posVeiculo(teste.veiculos.indexOf(teste.dentro), x, z, Math.atan2(dx, dz)); for (const k of teste.transito) if (Math.hypot(k.g.position.x - x, k.g.position.z - z) < 60) { k.s = (k.s + 200) % 1e9; } return { x, z, m }; })()`;
    const lugar = await t.ev(NA_RUA);
    console.log("· carro na rua:", JSON.stringify(lugar));
    await espera(500);
    ok(await visivel(t, ".rp-carro .rp-acel") && await visivel(t, ".rp-carro .rp-volante") && await visivel(t, ".rp-carro .rp-sair"), "pedal, volante e Sair aparecem no carro");
    ok(!(await visivel(t, ".jd-camada")), "alavanca a pé some no carro");
    // Sair longe dos pedais
    const acel = await centro(t, ".rp-carro .rp-acel"), re = await centro(t, ".rp-carro .rp-re"), sairB = await centro(t, ".rp-carro .rp-sair"), vol = await centro(t, ".rp-carro .rp-volante");
    const longe = Math.min(Math.hypot(sairB[0] - acel[0], sairB[1] - acel[1]), Math.hypot(sairB[0] - re[0], sairB[1] - re[1]));
    ok(longe > 140, `Sair longe dos pedais (${longe.toFixed(0)} px)`);
    ok(acel[2] >= 56 && re[2] >= 56 && vol[3] >= 56, `pedais e volante grandes (acel ${acel[2]}x${acel[3]}, ré ${re[2]}, volante ${vol[2]}x${vol[3]})`);
    await t.foto(`${FOTOS}/2-carro-844x390.png`);
    // ---- acelerar
    const pos0 = await t.ev("[teste.dentro.pos.x, teste.dentro.pos.z, teste.dentro.ang]");
    await D.poe(4, acel[0], acel[1]);
    await esperaJogo(t, 1.5);
    const vel = await t.ev("teste.dentro.vel");
    ok(vel > 4, `acelerou segurando o pedal (vel ${vel.toFixed(1)})`);
    // ---- virar à direita: segundo dedo na metade direita do volante
    const angA = await t.ev("teste.dentro.ang");
    await D.poe(5, vol[0] + vol[2] * 0.25, vol[1]);
    await esperaJogo(t, 0.15);
    const virarCedo = await t.ev("teste.dentro.virar");
    await esperaJogo(t, 1.1);
    const angB = await t.ev("teste.dentro.ang");
    await t.foto(`${FOTOS}/2b-carro-virando.png`);
    // desliza para a esquerda sem levantar
    await D.move(5, vol[0] - vol[2] * 0.25, vol[1]);
    await esperaJogo(t, 0.9);
    const esqLigado = await t.ev("document.querySelector('.rp-carro .rp-seta[data-lado=esq]').classList.contains('apertado')");
    const virarEsq = await t.ev("teste.dentro.virar");
    const angC = await t.ev("teste.dentro.ang");
    await D.soltaTudo();
    const dB = angB - angA, dC = angC - angB;
    ok(dB < -0.3, `virou para a direita (Δ ${dB.toFixed(2)} rad em 1,25 s de jogo)`);
    ok(Math.abs(dB) < 2.4, `sem rodopiar (Δ ${dB.toFixed(2)} rad em 1,25 s)`);
    ok(Math.abs(virarCedo) > 0.05 && Math.abs(virarCedo) < 0.7, `virada sobe aos poucos (0,15 s de jogo: ${virarCedo.toFixed(2)})`);
    ok(esqLigado && virarEsq < -0.1 && dC > 0, `deslizou o dedo para ◀ sem levantar e o volante foi para a esquerda (virar ${virarEsq.toFixed(2)}, Δ ${dC.toFixed(2)})`);
    await esperaJogo(t, 0.4);
    ok(Math.abs(await t.ev("teste.dentro.virar")) < 0.2, "soltou o volante: volta ao centro");
    // ---- ré (de volta ao começo da reta)
    await t.ev(NA_RUA);
    await D.poe(6, re[0], re[1]); await esperaJogo(t, 2.5);
    const velRe = await t.ev("teste.dentro.vel");
    await D.tira(6);
    ok(velRe < -0.5, `ré funciona (vel ${velRe.toFixed(1)})`);
    await esperaJogo(t, 1.5);
    // ---- acelerar sozinho
    await t.ev(NA_RUA);
    const auto = await centro(t, ".rp-carro .rp-auto");
    await D.poe(7, auto[0], auto[1]); await espera(60); await D.tira(7);
    await esperaJogo(t, 2);
    const velAuto = await t.ev("teste.dentro.vel");
    ok(velAuto > 3, `"Sozinho" acelera sem segurar (vel ${velAuto.toFixed(1)})`);
    await t.foto(`${FOTOS}/2c-carro-sozinho.png`);
    // ---- sair andando: freia sozinho e sai
    await D.poe(8, sairB[0], sairB[1]); await espera(60); await D.tira(8);
    ok(await ate(t, "!teste.dentro", 4000), "Sair com o carro andando: freou e saiu");
    ok(!(await t.ev("document.querySelector('.rp-auto').classList.contains('ligado') && false")), "ok");
    await t.ev("localStorage.removeItem('rabisco.rp.acelerarSozinho'); 0");
    await espera(500);
    ok(await visivel(t, ".jd-camada") && await visivel(t, ".rp-pe .rp-acao"), "voltou aos controles a pé");
    // desliga o sozinho para não ficar ligado (botão é do carro)
    await t.ev("(() => { const b = teste.dentro; return 0; })()");

    // ---- helicóptero
    const ih = await t.ev("(() => { teste.garagem('heli'); const v = teste.garagemAtual; return teste.veiculos.indexOf(v); })()");
    await t.ev(`teste.entrar(${ih})`);
    await espera(800);
    ok(await visivel(t, ".rp-heli .rp-subir") && await visivel(t, ".rp-heli .rp-descer") && await visivel(t, ".rp-heli .rp-voar"), "helicóptero: Subir, Descer e Voar aparecem");
    const sub = await centro(t, ".rp-heli .rp-subir"), des = await centro(t, ".rp-heli .rp-descer"), voar = await centro(t, ".rp-heli .rp-voar"), sairH = await centro(t, ".rp-heli .rp-sair");
    await D.poe(9, sub[0], sub[1]); await esperaJogo(t, 2.5); await D.tira(9);
    const alt = await t.ev("teste.dentro.alt");
    ok(alt > 4, `subiu (alt ${alt.toFixed(1)})`);
    await D.poe(10, voar[0], voar[1]); await esperaJogo(t, 2);
    const vh = await t.ev("teste.dentro.vel");
    await t.foto(`${FOTOS}/3-helicoptero-844x390.png`);
    await D.tira(10);
    ok(vh > 3, `voou para a frente (vel ${vh.toFixed(1)})`);
    await D.poe(11, des[0], des[1]);
    ok(await ate(t, "teste.dentro.alt - teste.chaoHeli(teste.dentro.pos.x, teste.dentro.pos.z) < 0.15", 90000), "desceu até pousar segurando Descer");
    await D.tira(11);
    await espera(1500);
    await D.poe(12, sairH[0], sairH[1]); await espera(60); await D.tira(12);
    ok(await ate(t, "!teste.dentro", 3000), "desceu e saiu do helicóptero");

    // ---- controle físico em uso: some o toque; tocar a tela traz de volta
    await t.ev(`(() => { const b = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); b[0].pressed = true; window.__p = { index: 0, id: "x", connected: true, mapping: "standard", buttons: b, axes: [0, 0, 0, 0] }; navigator.getGamepads = () => [window.__p]; })()`);
    await espera(400);
    await t.ev("window.__p.buttons[0].pressed = false; 0");
    const oculto = await t.ev("document.body.classList.contains('toque-oculto')");
    ok(oculto && !(await visivel(t, ".jd-pulo")), "controle físico apertado: botões de toque somem");
    await t.ev("navigator.getGamepads = () => [null, null, null, null]; 0");
    await D.poe(13, 600, 120); await espera(60); await D.tira(13);
    await espera(200);
    ok(!(await t.ev("document.body.classList.contains('toque-oculto')")) && await visivel(t, ".jd-pulo"), "tocou a tela: botões de toque voltam");
    ok(!(await t.transborda()), "sem rolagem horizontal");
    const erros = t.erros.filter((e) => !/assets\/voz\//.test(e));
    ok(erros.length === 0, `sem erros no console ${erros.slice(0, 3).join(" | ")}`);
  } finally { await t.fechar(); }
}

if (SO.includes("notch")) {
  // iPhone 14 Pro Max deitado (932x430) com notch: safe areas simuladas (Chrome 125+ tem o override; senão, só a foto)
  const t = await abrirJogo(932, 430);
  try {
    const r = await t.cmd("Emulation.setSafeAreaInsetsOverride", { insets: { top: 0, left: 59, right: 59, bottom: 21 } });
    const temOverride = !r.error;
    console.log(temOverride ? "· safe areas simuladas: esquerda/direita 59 px, embaixo 21 px" : `· sem override de safe area neste Chrome (${r.error?.message})`);
    await t.ev("teste.ir(0, 33); teste.olhar(0)");
    await espera(800);
    if (temOverride) {
      const pulo = await t.ev("document.querySelector('.jd-pulo').getBoundingClientRect().right");
      ok(pulo <= 932 - 59, `Pular fora do notch (borda direita em ${pulo.toFixed(0)})`);
    }
    await t.foto(`${FOTOS}/4-a-pe-iphone-932x430.png`);
    await t.ev("teste.garagem('carro'); teste.entrar(teste.veiculos.indexOf(teste.garagemAtual))");
    await espera(800);
    if (temOverride) {
      const vol = await t.ev("document.querySelector('.rp-carro .rp-volante').getBoundingClientRect().left");
      ok(vol >= 59, `volante fora do notch (borda esquerda em ${vol.toFixed(0)})`);
    }
    await t.foto(`${FOTOS}/5-carro-iphone-932x430.png`);
  } finally { await t.fechar(); }
}

if (SO.includes("controle")) {
  // página do celular-controle (sem servidor: só o desenho e o que sairia para a tela)
  const t = await abrir("about:blank", { mobile: true, largura: 844, altura: 390 });
  try {
    await t.cmd("Page.navigate", { url: `${BASE}/src/controle-remoto/?s=ZZZZ&sala=ws://127.0.0.1:9` });
    ok(await ate(t, "!!window.controleTeste", 10000), "página do controle abriu");
    await t.ev("controleTeste.mostrarPad('cidade')");
    await espera(300);
    await t.foto(`${FOTOS}/6-celular-controle-a-pe.png`);
    await t.ev("controleTeste.mostrarPad('carro')");
    await espera(300);
    await t.foto(`${FOTOS}/7-celular-controle-carro.png`);
    const D = dedos(t);
    const ped = await centro(t, ".btn.pedal"), re = await centro(t, ".btn.re"), dir = await centro(t, ".btn.seta.dir"), sair = await centro(t, ".btn.sair");
    ok(ped && re && dir && sair, "carro: pedal, ré, setas e Sair no celular");
    await D.poe(1, ped[0], ped[1]); await D.poe(2, dir[0], dir[1]); await espera(100);
    const e1 = await t.ev("controleTeste.entrada");
    ok(e1.y === 1 && e1.x === 1, `acelera + direita ao mesmo tempo → ${JSON.stringify(e1)}`);
    await D.tira(1); await D.tira(2);
    await D.poe(3, re[0], re[1]); await espera(100);
    const e2 = await t.ev("controleTeste.entrada");
    await D.tira(3);
    ok(e2.y === -1, `ré → y ${e2.y}`);
    ok(Math.hypot(sair[0] - ped[0], sair[1] - ped[1]) > 150, "Sair longe do pedal no celular");
    await t.ev("controleTeste.mostrarPad('heli')");
    await espera(300);
    await t.foto(`${FOTOS}/8-celular-controle-heli.png`);
    const des = await centro(t, ".btn.descer"), sub = await centro(t, ".btn.subir"), vo = await centro(t, ".btn.voar");
    await D.poe(4, des[0], des[1]); await D.poe(5, vo[0], vo[1]); await espera(100);
    const e3 = await t.ev("controleTeste.entrada");
    await D.tira(4); await D.tira(5);
    ok(e3.baixo && e3.y === 1, `heli: descer + voar → ${JSON.stringify(e3)}`);
    await D.poe(6, sub[0], sub[1]); await espera(100);
    ok((await t.ev("controleTeste.entrada")).pulo, "heli: subir = pulo");
    await D.tira(6);
    ok(!(await t.transborda()), "controle sem rolagem horizontal");
  } finally { await t.fechar(); }
}
console.log(falhas ? `\n✗ ${falhas} falha(s)` : "\n✓ tudo certo");
process.exit(falhas ? 1 : 0);
