// Dois jogadores, Modo TV e portão dos pais: simula 2 controles (gamepads) no Chrome sem janela.
// Uso: node --experimental-websocket ferramentas/teste/dois-jogadores.mjs [http://localhost:8080] [kart,cidade,revezamento,tv,portao,foto]
// Fotos em .claude/tmp/dois-jogadores/. Imagens de rosto são SINTÉTICAS (emoji desenhado em canvas), nunca foto de gente.
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const BASE = process.argv[2] || "http://localhost:8080";
const SO = (process.argv[3] || "").split(",").filter(Boolean);
const quer = (n) => !SO.length || SO.includes(n);
const PASTA = fileURLToPath(new URL("../../.claude/tmp/dois-jogadores/", import.meta.url));
mkdirSync(PASTA, { recursive: true });
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 20000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(250); } return false; };

// 2 controles simulados (o cdp.mjs simula 1): índice 0 = jogador 1, índice 1 = jogador 2
const PADS = (n) => `
  window.__pads = [0, 1].map((i) => ({ index: i, id: "teste " + i, connected: true, mapping: "standard", timestamp: 0,
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }));
  window.__nPads = ${n};
  navigator.getGamepads = () => window.__pads.map((p, i) => (i < window.__nPads && p.connected ? p : null));
  window.__btn = (p, i, v) => { window.__pads[p].buttons[i].pressed = v; window.__pads[p].buttons[i].value = v ? 1 : 0; };
  window.__eixo = (p, x, y) => { window.__pads[p].axes[0] = x; window.__pads[p].axes[1] = y; };
  window.__desconecta = (p) => { window.__pads[p].connected = false; dispatchEvent(Object.assign(new Event("gamepaddisconnected"), { gamepad: window.__pads[p] })); };
  window.__reconecta = (p) => { window.__pads[p].connected = true; dispatchEvent(Object.assign(new Event("gamepadconnected"), { gamepad: window.__pads[p] })); };
`;
async function abrir2(url, { pads = 2, antes = "", ...op } = {}) {
  const t = await abrir("about:blank", op);
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: PADS(pads) + antes });
  await t.cmd("Page.navigate", { url });
  return t;
}
const CADASTRO = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t.com" }, crianca: { nome: "Alice", genero: "menina" } }));`;
const foto = (t, nome) => t.foto(PASTA + nome);
// vozes novas da Cidade ainda não geradas (edge-tts deu 403; ver .claude/tmp/cidade-kart/relatorio.md): não contam como erro deste teste
const errosDe = (t) => t.erros.filter((e) => !/assets\/voz\/cid-/.test(e));

// ------------------------------------------------------------------ Kart
if (quer("kart")) {
  const t = await abrir2(`${BASE}/jogos/rabisco-kart/?teste`, { pads: 2, antes: CADASTRO, largura: 1280, altura: 720 });
  await ate(t, "!!window.teste && !!document.querySelector('[data-jogadores]')");
  await t.ev(`document.querySelector('[data-jogadores="2"]').click()`);
  await espera(400);
  ok(await t.ev(`document.querySelector('.jog-quem [data-jogador="2"]')?.dataset.entrada`) === "controle", "Kart: 2 controles → jogador 2 no controle (sem QR)");
  ok(await t.ev(`!document.querySelector('.jog-qr').classList.contains('ativo')`), "Kart: QR escondido quando há controle");
  await foto(t, "escolha-2-jogadores-kart.png");
  await t.ev(`document.getElementById('jogar').click()`);
  await espera(900);
  await foto(t, "quem-e-quem-kart.png");
  ok(await t.ev("teste.dividida && !!teste.j2 && teste.j2.humano === 2"), "Kart: kart do jogador 2 criado e tela dividida");
  ok(await ate(t, "teste.estado === 'corrida'", 30000), "Kart: corrida começou");
  await t.ev("__eixo(1, 1, 0)"); // jogador 2 vira para a direita
  await espera(1500);
  const v = await t.ev("[teste.j2.virar, teste.jogador.virar]");
  ok(v[0] < -0.3 && Math.abs(v[1]) < 0.3, `Kart: alavanca do controle 2 vira só o kart do jogador 2 (j2 ${v[0].toFixed(2)}, j1 ${v[1].toFixed(2)})`);
  await t.ev("__eixo(1, 0, 0)");
  await t.ev("__eixo(0, -1, 0)");
  await espera(1200);
  const w = await t.ev("[teste.j2.virar, teste.jogador.virar]");
  ok(w[1] > 0.3 && Math.abs(w[0]) < 0.4, `Kart: controle 1 vira só o Rabisco (j1 ${w[1].toFixed(2)}, j2 ${w[0].toFixed(2)})`);
  await t.ev("__eixo(0, 0, 0)");
  await espera(2500);
  await foto(t, "kart-2-jogadores.png");
  await t.ev("__desconecta(1)");
  await espera(800);
  ok(await t.ev(`!!document.querySelector('.jog-aviso:not([hidden])')?.textContent.includes('desconectou')`), "Kart: controle do jogador 2 caiu → aviso amigável");
  await foto(t, "kart-controle-desconectou.png");
  await t.ev("__reconecta(1)");
  await espera(800);
  ok(await t.ev(`!document.querySelector('.jog-aviso:not([hidden])')`), "Kart: controle de volta fecha o aviso");
  ok(!t.erros.length, "Kart: sem erros " + t.erros.join(" ; "));
  await t.fechar();
}

// ------------------------------------------------------------------ Cidade
const tecla = async (t, code, tipo) => t.cmd("Input.dispatchKeyEvent", { type: tipo, code, key: code === "Space" ? " " : code.replace(/^Key/, "").toLowerCase(), windowsVirtualKeyCode: { KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, Space: 32, KeyF: 70, ArrowUp: 38 }[code] });
if (quer("cidade")) {
  const t = await abrir2(`${BASE}/jogos/cidade-do-rabisco/?teste`, { pads: 2, antes: CADASTRO, largura: 1280, altura: 720 });
  await ate(t, "!!window.teste && !!document.querySelector('[data-jogadores]')");
  await t.ev(`document.querySelector('[data-jogadores="2"]').click()`);
  await espera(300);
  await foto(t, "escolha-2-jogadores-cidade.png");
  await t.ev(`document.querySelector('.casca-abertura .botao.respira, .casca-abertura .casca-nivel').click()`);
  ok(await ate(t, "teste.dois && !!teste.companheiro && !!document.querySelector('.jog-banner.ativo')", 40000), "Cidade: modo 2 jogadores com a criança e o quem-é-quem");
  await foto(t, "quem-e-quem-cidade.png");
  await espera(3000);
  const a0 = await t.ev("[teste.amigo.pos.x, teste.amigo.pos.z, teste.j.pos.x, teste.j.pos.z]");
  await t.ev("__eixo(1, 0, -1)"); // jogador 2 anda para a frente
  await espera(2500);
  await t.ev("__eixo(1, 0, 0)");
  const a1 = await t.ev("[teste.amigo.pos.x, teste.amigo.pos.z, teste.j.pos.x, teste.j.pos.z]");
  const andouJ2 = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]), andouJ1 = Math.hypot(a1[2] - a0[2], a1[3] - a0[3]);
  ok(andouJ2 > 1 && andouJ1 < 0.3, `Cidade: controle 2 move só a criança (criança ${andouJ2.toFixed(1)} m, Rabisco ${andouJ1.toFixed(1)} m)`);
  await t.ev("__eixo(0, 1, 0)"); // jogador 1 anda para o lado
  await espera(1500);
  await t.ev("__eixo(0, 0, 0)");
  const a2 = await t.ev("[teste.amigo.pos.x, teste.amigo.pos.z, teste.j.pos.x, teste.j.pos.z]");
  ok(Math.hypot(a2[2] - a1[2], a2[3] - a1[3]) > 1, "Cidade: controle 1 move o Rabisco");
  ok(Math.hypot(a2[0] - a2[2], a2[1] - a2[3]) <= 11.2, "Cidade: a criança fica a no máximo 11 m do Rabisco");
  await t.ev("__btn(1, 2, true)"); await espera(250); await t.ev("__btn(1, 2, false)");
  await espera(300);
  ok(await t.ev("teste.amigo.acena > 0"), "Cidade: ação do jogador 2 a pé = acenar");
  await foto(t, "cidade-2-jogadores-a-pe.png");
  await t.ev("teste.entrar(0)");
  await espera(1200);
  await t.ev("__btn(1, 0, true)"); await espera(200); await t.ev("__btn(1, 0, false)");
  await t.ev("__btn(1, 2, true)"); await espera(200); await t.ev("__btn(1, 2, false)");
  await espera(400);
  ok(await t.ev("!!teste.dentro && teste.amigo.buzina > 0 && teste.amigo.acena > 0"), "Cidade: no carro, jogador 2 buzina (A) e acena (X)");
  await t.ev("teste.volante(1, 0)"); await espera(1500); await t.ev("teste.volante(0, 0)");
  await foto(t, "cidade-2-jogadores-carro.png");
  await t.ev("teste.volante(null)");
  ok(!errosDe(t).length, "Cidade (2 controles): sem erros " + errosDe(t).join(" ; "));
  await t.fechar();

  // computador sem controle: teclado dividido (jogador 1 = setas, jogador 2 = WASD)
  const k = await abrir2(`${BASE}/jogos/cidade-do-rabisco/?teste&jogadores=2`, { pads: 0, antes: CADASTRO, largura: 1280, altura: 720 });
  await ate(k, "!!window.teste && !!document.querySelector('[data-jogadores]')");
  ok(await k.ev(`document.querySelector('.jog-quem [data-jogador="2"]')?.dataset.entrada`) === "teclado", "Cidade: sem controle no computador → jogador 2 no teclado (WASD)");
  await k.ev(`document.querySelector('.casca-abertura .botao.respira, .casca-abertura .casca-nivel').click()`);
  await ate(k, "teste.dois && !!teste.companheiro", 40000);
  await espera(4000);
  const b0 = await k.ev("[teste.amigo.pos.x, teste.amigo.pos.z, teste.j.pos.x, teste.j.pos.z]");
  await tecla(k, "KeyW", "keyDown"); await espera(2000); await tecla(k, "KeyW", "keyUp");
  const b1 = await k.ev("[teste.amigo.pos.x, teste.amigo.pos.z, teste.j.pos.x, teste.j.pos.z]");
  ok(Math.hypot(b1[0] - b0[0], b1[1] - b0[1]) > 1 && Math.hypot(b1[2] - b0[2], b1[3] - b0[3]) < 0.3, "Cidade: W move só a criança");
  await tecla(k, "ArrowUp", "keyDown"); await espera(1500); await tecla(k, "ArrowUp", "keyUp");
  const b2 = await k.ev("[teste.j.pos.x, teste.j.pos.z]");
  ok(Math.hypot(b2[0] - b1[2], b2[1] - b1[3]) > 1, "Cidade: seta ↑ move o Rabisco");
  await foto(k, "cidade-teclado-dividido.png");
  ok(!k.erros.length, "Cidade (teclado dividido): sem erros " + k.erros.join(" ; "));
  await k.fechar();
}

// ------------------------------------------------------------------ Revezamento (jogo 2D da casca, sem editar o jogo)
if (quer("revezamento")) {
  const t = await abrir2(`${BASE}/jogos/memoria/?teste`, { pads: 0, antes: CADASTRO, mobile: true, largura: 1180, altura: 820 });
  await ate(t, "!!window.cascaTeste && !!document.querySelector('[data-jogadores]')");
  ok(await t.ev(`document.querySelector('[data-jogadores="1"]').getAttribute('aria-pressed')`) === "true", "Revezamento: 1 jogador é o padrão");
  await t.ev(`document.querySelector('[data-jogadores="2"]').click()`);
  await espera(400);
  await foto(t, "escolha-1-ou-2-jogadores.png");
  await t.toque(".casca-nivel");
  await espera(700);
  ok(await t.ev(`document.querySelector('.jog-banner')?.textContent.includes('vez do Rabisco')`), "Revezamento: 1ª rodada é a vez do Rabisco");
  await foto(t, "revezamento-vez-rabisco.png");
  await t.ev("cascaTeste.vencer({ estrelas: 3 })");
  await espera(1500);
  const txt = await t.ev(`document.querySelector('.casca-placar-2j')?.textContent || ''`);
  ok(txt.includes("⭐ 3") && txt.includes("vez da Alice"), "Revezamento: placar na vitória e próxima vez da Alice");
  await foto(t, "revezamento-placar-rodada.png");
  await t.ev(`[...document.querySelectorAll('.casca-vitoria button')].find((b) => b.textContent.includes('de novo')).click()`);
  await espera(700);
  ok(await t.ev(`document.querySelector('.jog-banner')?.textContent.includes('vez da Alice')`), "Revezamento: 2ª rodada é a vez da Alice");
  await foto(t, "revezamento-vez-alice.png");
  await t.ev("cascaTeste.vencer({ estrelas: 2 })");
  await espera(1500);
  await t.ev(`[...document.querySelectorAll('.casca-vitoria button')].find((b) => b.textContent.trim() === 'Sair').click()`);
  await espera(600);
  const fim = await t.ev(`document.querySelector('.jog-aviso[aria-label="Placar final"]')?.textContent || ''`);
  ok(fim.includes("Rabisco fez mais estrelas") && fim.includes("⭐ 3") && fim.includes("⭐ 2"), "Revezamento: placar final dos dois ao sair");
  await foto(t, "revezamento-placar-final.png");
  ok(!t.erros.length, "Revezamento: sem erros " + t.erros.join(" ; "));
  await t.fechar();
}

// ------------------------------------------------------------------ Modo TV
if (quer("tv")) {
  const t = await abrir2(`${BASE}/index.html?semcadastro`, { pads: 0, largura: 1280, altura: 720 });
  await ate(t, "!!document.querySelector('.tv-botao-portal')");
  await espera(1500);
  await t.ev(`document.querySelector('.tv-botao-portal').click()`);
  await espera(500);
  ok(await t.ev("document.documentElement.classList.contains('modo-tv') && localStorage.getItem('rabisco.modoTV') === '1'"), "TV: botão do portal liga o Modo TV e lembra no aparelho");
  await foto(t, "modo-tv-portal.png");
  const ld = await abrir2(`${BASE}/index.html?semcadastro`, { pads: 0, mobile: true, largura: 375, altura: 740 });
  await ate(ld, "!!document.querySelector('.tv-botao-portal')");
  await espera(1500);
  ok(!(await ld.transborda()), "TV: portal em 375 px não transborda com o botão 📺");
  await foto(ld, "modo-tv-botao-portal-375.png");
  await ld.fechar();
  await t.fechar();
  // num jogo: Kart com o Modo TV lembrado (HUD mínimo, ◀ ▶ viram as metades da tela) e o botão na pausa
  const k = await abrir2(`${BASE}/jogos/rabisco-kart/?teste&auto`, { pads: 0, mobile: true, largura: 1180, altura: 820, antes: `localStorage.setItem("rabisco.modoTV", "1");` });
  await ate(k, "!!window.teste && teste.estado === 'corrida'", 40000);
  await espera(1500);
  ok(await k.ev("getComputedStyle(document.getElementById('mapa')).display === 'none' && document.getElementById('btn-esq').getBoundingClientRect().width > innerWidth * 0.45"), "TV: no Kart o minimapa some e os botões viram metades da tela");
  await foto(k, "modo-tv-kart.png");
  await k.ev("document.querySelector('.pausa-botao').click()");
  await espera(500);
  ok(await k.ev(`document.querySelector('.pausa-cartao .tv-botao')?.textContent.includes('ligado')`), "TV: pausa mostra '📺 Modo TV: ligado'");
  await foto(k, "modo-tv-pausa.png");
  ok(!k.erros.length, "TV Kart: sem erros " + k.erros.join(" ; "));
  await k.fechar();
  // detecção oportunista: screen.isExtended → sugere (não liga sozinho)
  const d = await abrir2(`${BASE}/index.html?semcadastro`, { pads: 0, largura: 1280, altura: 720, antes: `Object.defineProperty(Screen.prototype, "isExtended", { get: () => true, configurable: true });` });
  await ate(d, "!!document.querySelector('.tv-sugestao')", 8000);
  ok(await d.ev(`document.querySelector('.tv-sugestao')?.textContent.includes('conectou numa TV') && !document.documentElement.classList.contains('modo-tv')`), "TV: tela estendida → sugere o Modo TV (sem ligar sozinho)");
  await foto(d, "modo-tv-sugestao.png");
  await d.ev(`document.querySelector('.tv-sugestao button.sim').click()`);
  ok(await d.ev("document.documentElement.classList.contains('modo-tv')"), "TV: 'Ativar' liga o Modo TV");
  await d.fechar();
  // sem nenhuma API (como no iPhone): nada quebra
  const s = await abrir2(`${BASE}/jogos/memoria/?jogar`, { pads: 0, mobile: true, largura: 390, altura: 844, antes: `delete window.PresentationRequest; try { delete Screen.prototype.isExtended; } catch {}` });
  await espera(3500);
  ok(!s.erros.length && !(await s.ev("!!document.querySelector('.tv-sugestao')")), "TV: sem as APIs (iPhone) nada quebra e nada é sugerido");
  await s.fechar();
}

// ------------------------------------------------------------------ Rabiscolândia (Fatia 7): 2 jogadores, carona, missões a 2
// com 1 jogador só o Rabisco; o jogador 2 escolhe a criança do cadastro ou um amigo do estojo; câmera enquadra os dois
if (quer("rabiscolandia")) {
  const URL_RP = `${BASE}/jogos/rabiscopolis/?teste&fixo`;
  const comecar = async (t) => { await ate(t, "!!window.teste && !!document.querySelector('.casca-abertura .botao')"); await t.ev(`document.querySelector('.casca-abertura .botao.respira, .casca-abertura .casca-nivel').click()`); };
  const errosRP = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e));
  const aperta = async (t, p, b) => { await t.ev(`__btn(${p}, ${b}, true)`); await espera(220); await t.ev(`__btn(${p}, ${b}, false)`); await espera(250); };
  // 1 jogador: só o Rabisco
  {
    const t = await abrir2(`${URL_RP}&jogadores=1`, { pads: 1, antes: CADASTRO, largura: 1280, altura: 720 });
    await comecar(t);
    await ate(t, "teste.vivo", 40000); await espera(2500);
    ok(await t.ev("!teste.dois && !teste.j2.escolhendo && !document.querySelector('.escolha-j2-rp')"), "Rabiscolândia: com 1 jogador só o Rabisco (sem jogador 2 nem escolha)");
    ok(!errosRP(t).length, "Rabiscolândia (1 jogador): sem erros " + errosRP(t).join(" ; "));
    await t.fechar();
  }
  // 2 controles no computador
  {
    const t = await abrir2(URL_RP, { pads: 2, antes: CADASTRO, largura: 1280, altura: 720 });
    await ate(t, "!!window.teste && !!document.querySelector('[data-jogadores]')");
    await t.ev(`document.querySelector('[data-jogadores="2"]').click()`); await espera(300);
    await comecar(t);
    ok(await ate(t, "teste.vivo && teste.j2.escolhendo", 40000), "Rabiscolândia: o jogador 2 entra e escolhe quem quer ser");
    await espera(1200);
    const ops = await t.ev("teste.j2.opcoes()");
    ok(ops[0] === "crianca" && ["lapis", "giz", "borracha", "caderno"].every((x) => ops.includes(x)), `Rabiscolândia: opções = a criança do cadastro + amigos do estojo (${ops.join(", ")})`);
    await foto(t, "rabiscolandia-escolha-j2.png");
    await t.ev("__eixo(1, 1, 0)"); await espera(300); await t.ev("__eixo(1, 0, 0)"); await espera(200);
    await aperta(t, 1, 2);
    ok(await ate(t, "teste.dois && teste.j2.escolha === 'lapis'", 3000), "Rabiscolândia: ▶ e X do controle 2 escolhem o Lápis Rosa");
    await espera(1500);
    const a0 = await t.ev("[teste.j2.pos.x, teste.j2.pos.z, teste.j.pos.x, teste.j.pos.z]");
    await t.ev("__eixo(1, 0, -1)"); await espera(1500); await t.ev("__eixo(1, 0, 0)");
    const a1 = await t.ev("[teste.j2.pos.x, teste.j2.pos.z, teste.j.pos.x, teste.j.pos.z]");
    ok(Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) > 1 && Math.hypot(a1[2] - a0[2], a1[3] - a0[3]) < 0.3, `Rabiscolândia: controle 2 move só o jogador 2 (${Math.hypot(a1[0] - a0[0], a1[1] - a0[1]).toFixed(1)} m)`);
    await t.ev("__eixo(0, 1, 0)"); await espera(1500); await t.ev("__eixo(0, 0, 0)");
    const a2 = await t.ev("[teste.j2.pos.x, teste.j2.pos.z, teste.j.pos.x, teste.j.pos.z]");
    ok(Math.hypot(a2[2] - a1[2], a2[3] - a1[3]) > 1, "Rabiscolândia: controle 1 move o Rabisco");
    ok(Math.hypot(a2[0] - a2[2], a2[1] - a2[3]) <= 11.3, `Rabiscolândia: o jogador 2 fica a no máximo 11 m (${Math.hypot(a2[0] - a2[2], a2[1] - a2[3]).toFixed(1)} m)`);
    ok((await t.ev("teste.naTela")).every(Boolean), "Rabiscolândia: a câmera enquadra os dois");
    await foto(t, "rabiscolandia-2-jogadores.png");
    await aperta(t, 1, 2);
    ok(await t.ev("teste.j2.acena > 0"), "Rabiscolândia: ação do jogador 2 longe de missão = acenar");
    // orçamento com os dois na praça
    await t.ev("teste.ir(0, 33); teste.olhar(Math.PI); teste.j2.colocarPerto()"); await espera(1500);
    const m2 = await t.ev("teste.medir().semSombra");
    ok(m2.calls <= 250 && m2.tris <= 350000, `Rabiscolândia: orçamento TV com 2 jogadores na praça ${m2.calls} chamadas, ${Math.round(m2.tris / 1000)} mil triângulos`);
    // missão pela ação do jogador 2: o Pastor Lápis pede para ele
    await t.ev("(() => { const n = teste.missoes.npc('ovelha', 'pastor'); teste.ir(n.x + 6, n.z + 4); })()"); await espera(900);
    await t.ev("(() => { const n = teste.missoes.npc('ovelha', 'pastor'); teste.j2.st.pos.set(n.x + 1.2, 0.07, n.z + 1); })()"); await espera(700);
    const rot = await t.ev("document.querySelector('.acao-j2-rp:not([hidden])')?.textContent || ''");
    await aperta(t, 1, 2);
    ok(rot.includes("ovelhinha") && await t.ev("teste.missoes.ativa === 'ovelha'"), `Rabiscolândia: o jogador 2 aceita a missão pela ação dele ("${rot.trim()}")`);
    await foto(t, "rabiscolandia-j2-missao.png");
    await t.ev("teste.missoes.largar()");
    // carona no carro: A buzina, X acena
    await t.ev("teste.ir(4, 33); teste.entrar(0)"); await espera(900);
    ok(await t.ev("teste.j2.sentado"), "Rabiscolândia: o jogador 2 vai de carona no carro");
    await aperta(t, 1, 0); const buz = await t.ev("teste.j2.buzina > 0");
    await aperta(t, 1, 2);
    ok(buz && await t.ev("teste.j2.acena > 0"), "Rabiscolândia: no carro o jogador 2 buzina (A) e acena (X)");
    await t.ev("teste.volante(1, 0)"); await espera(1500); await t.ev("teste.volante(0, 0)"); await espera(700);
    await foto(t, "rabiscolandia-carona.png");
    await t.ev("teste.volante(null); teste.sair()"); await espera(500);
    ok(await t.ev("teste.j2.aPe && !teste.j2.sentado"), "Rabiscolândia: desceram os dois");
    // bicicleta (sem banco de carona): o jogador 2 vem correndo atrás
    const ib = await t.ev("teste.veiculos.findIndex((v) => v.tipo === 'bici')");
    await t.ev(`teste.entrar(${ib}); teste.volante(1, 0)`); await espera(2500); await t.ev("teste.volante(null)"); await espera(600);
    const db = await t.ev(`Math.hypot(teste.j2.pos.x - teste.j.pos.x, teste.j2.pos.z - teste.j.pos.z)`);
    ok(await t.ev("teste.j2.seguindo") && db < 7, `Rabiscolândia: na bicicleta o jogador 2 vem correndo atrás (${db.toFixed(1)} m)`);
    await t.ev("teste.sair()"); await espera(400);
    // por dentro: entra junto na padaria
    await t.ev("teste.entrarLugar('padaria')"); await espera(1500);
    const dl = await t.ev("Math.hypot(teste.j2.pos.x - teste.j.pos.x, teste.j2.pos.z - teste.j.pos.z)");
    ok(dl < 4, `Rabiscolândia: na padaria o jogador 2 entra junto (${dl.toFixed(1)} m do Rabisco)`);
    await foto(t, "rabiscolandia-2-jogadores-padaria.png");
    await t.ev("teste.sairLugar()"); await espera(1200);
    ok(await t.ev("Math.hypot(teste.j2.pos.x - teste.j.pos.x, teste.j2.pos.z - teste.j.pos.z) < 4"), "Rabiscolândia: e sai junto");
    // Pai Nosso: o jogador 2 ora junto, do lado do Rabisco, de mãos juntas
    await t.ev("teste.missoes.aceitar('painosso')"); await espera(300);
    await t.ev("teste.ir(0, -19.2)"); await espera(1200);
    const ora = await t.ev("({ o: !!teste.oracao, d: Math.hypot(teste.j2.pos.x - teste.j.pos.x, teste.j2.pos.z - teste.j.pos.z), z: teste.j2.pos.z })");
    ok(ora.o && ora.d > 0.8 && ora.d < 1.8 && Math.abs(ora.z + 19.2) < 0.3, `Rabiscolândia: no Pai Nosso o jogador 2 ora do lado do Rabisco (${ora.d.toFixed(1)} m)`);
    await foto(t, "rabiscolandia-2-jogadores-orando.png");
    for (let k = 0; k < 14 && (await t.ev("teste.oracao !== null")); k++) { await t.ev("teste.proximaFrase()"); await espera(200); }
    await espera(600);
    ok(await t.ev("teste.oracao === null && teste.j2.aPe"), "Rabiscolândia: depois do Amém o jogador 2 volta a andar");
    // controle 2 caiu: aviso amigável; voltou: segue
    await t.ev("__desconecta(1)"); await espera(900);
    ok(await t.ev(`!!document.querySelector('.jog-aviso:not([hidden])')?.textContent.includes('desconectou')`), "Rabiscolândia: controle do jogador 2 caiu → aviso amigável");
    await t.ev("__reconecta(1)"); await espera(900);
    ok(await t.ev(`!document.querySelector('.jog-aviso:not([hidden])')`), "Rabiscolândia: controle de volta fecha o aviso");
    ok(!errosRP(t).length, "Rabiscolândia (2 controles): sem erros " + errosRP(t).join(" ; "));
    await t.fechar();
  }
  // teclado dividido no computador: jogador 2 = WASD + F
  {
    const k = await abrir2(`${URL_RP}&jogadores=2`, { pads: 0, antes: CADASTRO, largura: 1280, altura: 720 });
    await ate(k, "!!window.teste && !!document.querySelector('[data-jogadores]')");
    ok(await k.ev(`document.querySelector('.jog-quem [data-jogador="2"]')?.dataset.entrada`) === "teclado", "Rabiscolândia: sem controle → jogador 2 no teclado (WASD)");
    await comecar(k);
    await ate(k, "teste.vivo && teste.j2.escolhendo", 40000); await espera(1200);
    await tecla(k, "KeyD", "keyDown"); await espera(200); await tecla(k, "KeyD", "keyUp"); await espera(150);
    await tecla(k, "KeyD", "keyDown"); await espera(200); await tecla(k, "KeyD", "keyUp"); await espera(150);
    await tecla(k, "KeyF", "keyDown"); await espera(200); await tecla(k, "KeyF", "keyUp");
    ok(await ate(k, "teste.dois && teste.j2.escolha === 'giz'", 3000), `Rabiscolândia: D D F escolhe o Giz Azul (${await k.ev("teste.j2.escolha")})`);
    await espera(1500);
    const b0 = await k.ev("[teste.j2.pos.x, teste.j2.pos.z, teste.j.pos.x, teste.j.pos.z]");
    await tecla(k, "KeyW", "keyDown"); await espera(1500); await tecla(k, "KeyW", "keyUp");
    const b1 = await k.ev("[teste.j2.pos.x, teste.j2.pos.z, teste.j.pos.x, teste.j.pos.z]");
    ok(Math.hypot(b1[0] - b0[0], b1[1] - b0[1]) > 1 && Math.hypot(b1[2] - b0[2], b1[3] - b0[3]) < 0.3, "Rabiscolândia: W move só o jogador 2");
    await tecla(k, "ArrowUp", "keyDown"); await espera(1500); await tecla(k, "ArrowUp", "keyUp");
    const b2 = await k.ev("[teste.j.pos.x, teste.j.pos.z]");
    ok(Math.hypot(b2[0] - b1[2], b2[1] - b1[3]) > 1, "Rabiscolândia: seta ↑ move o Rabisco");
    await foto(k, "rabiscolandia-teclado-dividido.png");
    ok(!errosRP(k).length, "Rabiscolândia (teclado dividido): sem erros " + errosRP(k).join(" ; "));
    await k.fechar();
  }
  // tablet com 1 controle: o controle é do jogador 2 (Alice, a criança do cadastro) e o Rabisco é do toque
  {
    const c = await abrir2(URL_RP, { pads: 1, antes: CADASTRO, mobile: true, largura: 1180, altura: 820 });
    await ate(c, "!!window.teste && !!document.querySelector('[data-jogadores]')");
    await c.ev(`document.querySelector('[data-jogadores="2"]').click()`); await espera(300);
    await c.ev(`document.querySelector('.casca-abertura .botao.respira, .casca-abertura .casca-nivel').click()`);
    ok(await ate(c, "teste.vivo && teste.j2.escolhendo", 40000), "Rabiscolândia (tablet + 1 controle): o controle é do jogador 2 e ele escolhe");
    await espera(1000);
    await c.ev("__btn(0, 0, true)"); await espera(220); await c.ev("__btn(0, 0, false)");
    ok(await ate(c, "teste.dois && teste.j2.escolha === 'crianca'", 4000), "Rabiscolândia: A escolhe a Alice (criança do cadastro, com crachá)");
    await c.ev("teste.ir(0, 33); teste.olhar(Math.PI); teste.j2.colocarPerto()"); await espera(2500);
    const mc = await c.ev("teste.medir().semSombra");
    ok(mc.calls <= 180 && mc.tris <= 350000, `Rabiscolândia: orçamento celular com 2 jogadores na praça ${mc.calls} chamadas (≤ 180), ${Math.round(mc.tris / 1000)} mil triângulos`);
    await foto(c, "rabiscolandia-tablet-alice.png");
    ok(!errosRP(c).length, "Rabiscolândia (tablet): sem erros " + errosRP(c).join(" ; "));
    await c.fechar();
  }
}
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
