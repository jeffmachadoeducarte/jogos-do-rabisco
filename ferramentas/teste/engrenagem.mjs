// ⚙️ Configurações (src/motor/engrenagem.js): sobe o relay real (servidor/sala.mjs) e confere
//  (a) portal: a ⚙️ abre, o som liga/desliga e o aparelho lembra (e o M do teclado também), "Jogar na TV" mostra os 3 jeitos;
//  (b) "Jogar aqui mesmo" no Kart (tablet): layout de TV, toque continua; com um controle 🎮 e 2 jogadores, pergunta o nome
//      dos dois (sugestão do cadastro para o jogador 1) e os nomes aparecem no HUD;
//  (c) "Mais um controle pelo celular" no Kart: QR + código na ⚙️, o celular entra (relay real), o nome do jogador 2 vem
//      do PRÓPRIO celular ("Qual é o seu nome?" no controle);
//  (d) "Usar só controles" no Kart: a página vira a tela (sem toque), QR na abertura, controle 🎮 na vaga 1 (escolhe o nome
//      pelo teclado da tela com o direcional) + celular na vaga 2, corrida a 2; "Voltar ao normal" desfaz;
//  (e) a ⚙️ também está na casca (Rabiscópolis / Rabiscolândia / jogos comuns) e na pausa; o M não mexe no som onde o M é o mapa.
// Uso: node --experimental-websocket ferramentas/teste/engrenagem.mjs [http://localhost:8080]
// Fotos em .claude/tmp/engrenagem/.
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
const BASE = process.argv[2] || "http://localhost:8080";
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const PASTA = RAIZ + ".claude/tmp/engrenagem/";
mkdirSync(PASTA, { recursive: true });
let falhas = 0;
const quer = (k) => !process.env.SO || process.env.SO.includes(k); // SO=bd roda só (b) e (d)
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 20000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const foto = (t, nome) => t.foto(PASTA + nome);
const errosDe = (t) => t.erros.filter((e) => !/assets\/voz\/(cid-|nomes\/|rp-)/.test(e));

// ------------------------------------------------------------------ Relay real
const portaLivre = () => new Promise((r) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const PORTA = await portaLivre();
const SALA = `ws://localhost:${PORTA}`;
if (!existsSync(RAIZ + "servidor/node_modules/ws")) { console.log("✗ rode `cd servidor && npm ci` antes"); process.exit(1); }
const relay = spawn(process.execPath, ["sala.mjs"], { cwd: RAIZ + "servidor", env: { ...process.env, PORT: String(PORTA), ORIGENS: "" }, stdio: "ignore" });
process.on("exit", () => { try { relay.kill(); } catch { /* */ } });
let saude = null;
for (let i = 0; i < 40 && !saude; i++) { await espera(150); try { saude = await (await fetch(`http://localhost:${PORTA}/saude`)).json(); } catch { /* subindo */ } }
ok(saude?.ok === true, `relay real no ar (porta ${PORTA})`);

// controles físicos simulados: quantos estão ligados fica no sessionStorage (sobrevive ao recarregar a página)
const PADS = `
  window.__pads = [0, 1].map((i) => ({ index: i, id: "teste " + i, connected: true, mapping: "standard", timestamp: 0,
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }));
  window.__nPads = Number(sessionStorage.getItem("__nPads") || 0);
  navigator.getGamepads = () => window.__pads.map((p, i) => (i < window.__nPads && p.connected ? p : null));
  window.__liga = (n) => { window.__nPads = n; sessionStorage.setItem("__nPads", n); dispatchEvent(Object.assign(new Event("gamepadconnected"), { gamepad: window.__pads[n - 1] })); };
  window.__btn = (p, i, v) => { window.__pads[p].buttons[i].pressed = v; window.__pads[p].buttons[i].value = v ? 1 : 0; };
`;
const CADASTRO = `if (!localStorage.getItem("rabisco.familia")) localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t.com" }, crianca: { nome: "Alice Souza", genero: "menina" } }));`;
async function aparelho(url, { mobile = true, largura = 1180, altura = 820 } = {}) {
  const t = await abrir("about:blank", { mobile, largura, altura });
  await t.cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: PADS + CADASTRO });
  await t.cmd("Page.navigate", { url });
  return t;
}
async function celular(url) {
  const c = await abrir("about:blank", { mobile: true, largura: 844, altura: 390 });
  await c.cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  await c.cmd("Page.navigate", { url });
  return c;
}
const tecla = async (t, key, code, kc) => {
  await t.cmd("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
  await t.cmd("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
  await espera(250);
};
const clicar = (t, sel) => t.ev(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return false; b.click(); return true; })()`);
const painel = (t) => t.ev("Engrenagem.aberta ? Engrenagem.vista : null");
// escreve no campo do nome que estiver aberto (como o teclado do aparelho) e aperta OK
async function escreverNome(t, nome) {
  await t.ev(`(() => { const c = document.querySelector('.nomes-campo'); c.focus(); c.value = ''; })()`);
  await t.cmd("Input.insertText", { text: nome });
  await espera(150);
  await clicar(t, ".nomes-ok");
  await espera(300);
}
const pad = async (t, p, b, ms = 200) => { await t.ev(`__btn(${p}, ${b}, true)`); await espera(ms); await t.ev(`__btn(${p}, ${b}, false)`); await espera(250); };

// ------------------------------------------------------------------ (a) portal
if (quer("a")) {
  const t = await aparelho(`${BASE}/index.html?semcadastro`);
  ok(await ate(t, "!!document.querySelector('#som.eng-botao') && !!window.Engrenagem"), "(a) portal: ⚙️ no lugar do 🔊");
  ok(await t.ev("!document.querySelector('.tv-botao-portal') && !document.getElementById('jogar-tv')"), "(a) portal: os botões 📺 soltos foram para dentro da ⚙️");
  await espera(1200);
  await clicar(t, "#som");
  ok(await ate(t, "Engrenagem.aberta && !!document.querySelector('[data-eng=som]') && !!document.querySelector('[data-eng=tv]')", 3000), "(a) ⚙️ abre com 🔊 Som e 📺 Jogar na TV");
  ok(await t.ev("document.querySelector('[data-eng=som]').textContent.includes('LIGADO')"), "(a) som começa LIGADO");
  await foto(t, "portal-engrenagem.png");
  await clicar(t, "[data-eng=som]");
  ok(await ate(t, "document.querySelector('[data-eng=som]').textContent.includes('DESLIGADO') && localStorage.getItem('rabisco.som') === '0'", 3000), "(a) Som → DESLIGADO e lembra no aparelho");
  await foto(t, "portal-som-desligado.png");
  await clicar(t, "[data-eng=tv]");
  ok(await ate(t, "['aqui','mais1','controles'].every((k) => !!document.querySelector(`[data-eng=${k}]`))", 3000), "(a) Jogar na TV: 'Jogar aqui mesmo', 'Mais um controle pelo celular', 'Usar só controles'");
  await foto(t, "portal-jogar-na-tv.png");
  ok(!(await t.transborda()), "(a) painel cabe na tela do tablet");
  await t.ev("location.reload()");
  await ate(t, "!!window.Engrenagem && !!document.querySelector('#som.eng-botao')");
  await espera(800);
  await clicar(t, "#som");
  ok(await ate(t, "document.querySelector('[data-eng=som]')?.textContent.includes('DESLIGADO')", 3000), "(a) recarregou: o som continua DESLIGADO");
  await clicar(t, "[data-eng=som]");
  ok(await ate(t, "localStorage.getItem('rabisco.som') === '1'", 2000), "(a) liga de novo");
  await t.fechar();
  // celular pequeno em pé: painel cabe
  const c = await aparelho(`${BASE}/index.html?semcadastro`, { largura: 375, altura: 740 });
  await ate(c, "!!window.Engrenagem");
  await espera(800);
  await c.ev("Engrenagem.abrir('tv')");
  await espera(400);
  ok(!(await c.transborda()), "(a) 375 px: Jogar na TV cabe sem rolar para o lado");
  await foto(c, "celular-jogar-na-tv.png");
  await c.fechar();
  // computador: M liga/desliga o som
  const d = await aparelho(`${BASE}/index.html?semcadastro`, { mobile: false, largura: 1280, altura: 720 });
  await ate(d, "!!window.Engrenagem");
  await espera(800);
  await tecla(d, "m", "KeyM", 77);
  ok(await ate(d, "localStorage.getItem('rabisco.som') === '0'", 2000), "(a) M no teclado desliga o som");
  await tecla(d, "m", "KeyM", 77);
  ok(await ate(d, "localStorage.getItem('rabisco.som') === '1'", 2000), "(a) M de novo liga");
  ok(!errosDe(d).length, "(a) portal sem erros " + errosDe(d).join(" ; "));
  await d.fechar();
}

// ------------------------------------------------------------------ (b) Jogar aqui mesmo (Kart, tablet) + controle 🎮 para o jogador 2
if (quer("b")) {
  const t = await aparelho(`${BASE}/jogos/rabisco-kart/?teste&sala=${encodeURIComponent(SALA)}`);
  await ate(t, "!!window.teste && !!window.Engrenagem", 40000);
  ok(await t.ev("Jogadores.modo === 1"), "(b) tablet abre em 1 jogador (toque)");
  await clicar(t, "#som");
  await ate(t, "Engrenagem.aberta");
  await clicar(t, "[data-eng=tv]");
  await ate(t, "!!document.querySelector('[data-eng=aqui]')", 3000);
  await foto(t, "kart-jogar-na-tv.png");
  await clicar(t, "[data-eng=aqui]");
  ok(await ate(t, "Engrenagem.vista === 'pronto-aqui' && document.documentElement.classList.contains('modo-tv') && sessionStorage.getItem('rabisco.telaTV') === 'aqui'", 3000), "(b) 'Jogar aqui mesmo': layout de TV ligado, aparelho segue no toque");
  ok(await t.ev("getComputedStyle(document.querySelector('.toque')).display !== 'none' && !document.documentElement.classList.contains('sala-tv')"), "(b) botões de toque continuam (zonas da TV)");
  await foto(t, "kart-aqui-pronto.png");
  await clicar(t, "[data-eng=ok]");
  ok(await ate(t, "!Engrenagem.aberta", 2000), "(b) 'Entendi' fecha");
  // um controle 🎮 liga e escolhem 2 jogadores: o controle é do jogador 2 e cada um diz o nome
  await t.ev("__liga(1)");
  await t.ev("document.querySelector('[data-jogadores=\"2\"]').click()");
  ok(await ate(t, "Jogadores.modo === 2 && Jogadores.j2.entrada === 'controle'", 4000), "(b) 2 jogadores: jogador 2 no controle 🎮");
  ok(await ate(t, "document.querySelector('.nomes-tela')?.dataset.jogador === '1'", 5000), "(b) 'Qual é o seu nome?' do jogador 1");
  ok(await t.ev("document.querySelector('.nomes-campo').value === 'Alice'"), "(b) jogador 1 já vem com o primeiro nome do cadastro (Alice)");
  await foto(t, "kart-aqui-nome-j1.png");
  await clicar(t, ".nomes-ok");
  ok(await ate(t, "document.querySelector('.nomes-tela')?.dataset.jogador === '2'", 4000), "(b) agora o jogador 2");
  await escreverNome(t, "Bia");
  ok(await ate(t, "!document.querySelector('.nomes-tela') && Jogadores.j1.nome === 'Alice' && Jogadores.j2.nome === 'Bia'", 4000), `(b) nomes guardados: ${await t.ev("Jogadores.j1.nome + ' / ' + Jogadores.j2.nome")}`);
  ok(await t.ev("document.querySelector('.jog-quem')?.textContent.includes('1 · Alice') && document.querySelector('.jog-quem').textContent.includes('2 · Bia')"), "(b) nomes no quem-é-quem da abertura");
  await clicar(t, "#jogar");
  ok(await ate(t, "teste.estado === 'contagem' || teste.estado === 'corrida'", 20000), "(b) corrida começou");
  ok(await ate(t, "document.querySelector('#hud-j2 .tag-j1')?.textContent.includes('Alice') && document.querySelector('#hud-j2 .tag-j2')?.textContent.includes('Bia')", 8000), "(b) nomes no HUD da tela dividida");
  await espera(3500);
  await foto(t, "kart-aqui-dois.png");
  ok(!errosDe(t).length, "(b) sem erros " + errosDe(t).join(" ; "));
  await t.fechar();
}

// ------------------------------------------------------------------ (c) Mais um controle pelo celular (Kart, tablet, sem controle físico)
if (quer("c")) {
  const t = await aparelho(`${BASE}/jogos/rabisco-kart/?teste&sala=${encodeURIComponent(SALA)}`);
  await ate(t, "!!window.teste && !!window.Engrenagem", 40000);
  await t.ev("Engrenagem.abrir('tv')");
  await ate(t, "!!document.querySelector('[data-eng=mais1]')", 3000);
  await clicar(t, "[data-eng=mais1]");
  ok(await ate(t, "Engrenagem.vista === 'pronto-mais1' && Jogadores.modo === 2 && sessionStorage.getItem('rabisco.telaTV') === 'mais1'", 3000), "(c) 'Mais um controle pelo celular': 2 jogadores");
  ok(await ate(t, "!!document.querySelector('.eng-qr svg') && /^[A-Z]{4}$/.test(document.querySelector('.eng-codigo')?.textContent || '')", 10000), "(c) QR + código dentro da ⚙️");
  await foto(t, "kart-mais1-qr.png");
  const link = await t.ev("Jogadores.sala.link");
  const c = await celular(link);
  ok(await ate(t, "Jogadores.j2.entrada === 'celular'", 10000), "(c) celular entrou como jogador 2");
  ok(await ate(t, "document.querySelector('.eng-qr .ok')?.textContent.includes('Celular')", 3000), "(c) a ⚙️ mostra 'Celular do jogador 2 conectado ✓'");
  await clicar(t, "[data-eng=ok]");
  ok(await ate(t, "document.querySelector('.nomes-tela')?.dataset.jogador === '1'", 5000), "(c) nome do jogador 1 (no aparelho)");
  await escreverNome(t, "Alice");
  ok(await ate(t, "document.querySelector('.nomes-tela')?.dataset.jogador === '2'", 4000), "(c) nome do jogador 2: a tela espera o celular");
  ok(await ate(c, "!document.getElementById('tela-nome').hidden", 5000), "(c) o celular pergunta 'Qual é o seu nome?'");
  await foto(c, "celular-nome.png");
  await foto(t, "kart-mais1-espera-nome.png");
  await c.ev(`(() => { const i = document.getElementById('nome'); i.value = 'Bia'; document.querySelector('#form-nome button[type=submit]').click(); })()`);
  ok(await ate(t, "!document.querySelector('.nomes-tela') && Jogadores.j2.nome === 'Bia'", 5000), "(c) o nome veio do celular: Bia");
  ok(await ate(c, "document.getElementById('tela-nome').hidden && !document.getElementById('pad').hidden && document.getElementById('chip-nome').textContent === 'Bia'", 5000), "(c) celular voltou ao controle com o chip 'Bia'");
  await foto(c, "celular-depois-do-nome.png");
  ok(!errosDe(t).length && !c.erros.length, "(c) sem erros " + [...errosDe(t), ...c.erros].join(" ; "));
  await c.fechar();
  await t.fechar();
}

// ------------------------------------------------------------------ (d) Usar só controles (Kart): a página vira a tela
if (quer("d")) {
  const t = await aparelho(`${BASE}/jogos/rabisco-kart/?teste&sala=${encodeURIComponent(SALA)}`);
  await ate(t, "!!window.teste && !!window.Engrenagem", 40000);
  await t.ev("Engrenagem.abrir('tv')");
  await ate(t, "!!document.querySelector('[data-eng=controles]')", 3000);
  await clicar(t, "[data-eng=controles]");
  ok(await ate(t, "new URLSearchParams(location.search).get('tv') === '1' && !!window.teste && window.Jogadores?.tv === true", 40000), "(d) mesmo jogo, agora como tela (?tv=1)");
  ok(await t.ev("document.documentElement.classList.contains('sala-tv') && getComputedStyle(document.querySelector('.toque')).display === 'none' && getComputedStyle(document.getElementById('som')).display === 'none'"), "(d) toque e botões da tela somem");
  ok(await ate(t, "!!document.querySelector('.jog-qr-tv.ativo svg') && /^[A-Z]{4}$/.test(document.querySelector('.jog-qr-tv .jog-qr-codigo')?.textContent || '')", 10000), "(d) QR + código na abertura do jogo");
  await foto(t, "kart-so-controles-vazio.png");
  await clicar(t, "#jogar");
  await espera(400);
  ok(await t.ev("teste.estado === 'abertura'"), "(d) sem ninguém, CORRER não larga (pede para alguém entrar)");
  // controle 🎮 aperta um botão → vaga 1; celular → vaga 2
  await t.ev("__liga(1); __btn(0, 0, true)"); await espera(300); await t.ev("__btn(0, 0, false)");
  ok(await ate(t, "Jogadores.salaTV.vagas[0].tipo === 'controle'", 4000), "(d) controle 🎮 → vaga 1");
  const link = await t.ev("Jogadores.salaTV.sala.link");
  const c = await celular(link);
  ok(await ate(t, "Jogadores.salaTV.vagas[1].tipo === 'celular' && Jogadores.modo === 2", 10000), "(d) celular 📱 → vaga 2: 2 jogadores");
  ok(await ate(t, "document.querySelector('.nomes-tela')?.dataset.jogador === '1'", 6000), "(d) 'Qual é o seu nome?' do jogador 1 (controle)");
  ok(await t.ev("!document.querySelector('.nomes-tela').classList.contains('toque') && getComputedStyle(document.querySelector('.nomes-teclado')).display !== 'none'"), "(d) teclado na tela para quem usa controle");
  await foto(t, "kart-so-controles-nome-j1.png");
  // direcional + A no teclado da tela: ✓ Sou Alice → ↓ vai para as letras; volta e confirma a sugestão
  ok(await t.ev("document.activeElement?.classList.contains('nomes-sugestao')"), "(d) foco já na sugestão '✓ Sou Alice'");
  await pad(t, 0, 0);
  ok(await ate(t, "document.querySelector('.nomes-tela')?.dataset.jogador === '2'", 4000), "(d) A no controle confirmou 'Alice'; agora o jogador 2");
  ok(await ate(c, "!document.getElementById('tela-nome').hidden", 5000), "(d) celular do jogador 2 pergunta o nome");
  await c.ev(`(() => { document.getElementById('nome').value = 'Bia'; document.querySelector('#form-nome button[type=submit]').click(); })()`);
  ok(await ate(t, "!document.querySelector('.nomes-tela') && Jogadores.j1.nome === 'Alice' && Jogadores.j2.nome === 'Bia'", 5000), "(d) Alice (controle) e Bia (celular)");
  ok(await ate(t, "document.querySelector('.jog-escolha-tv')?.textContent.includes('Alice') && document.querySelector('.jog-escolha-tv').textContent.includes('Bia')", 3000), "(d) nomes nas vagas da abertura");
  await espera(500);
  if (process.env.DEPURAR) console.log("antes do Start", await t.ev("JSON.stringify({ e: teste.estado, d: teste.dividida, j2: !!teste.j2 })"));
  await foto(t, "kart-so-controles-dois.png");
  await pad(t, 0, 9); // Start larga
  if (!(await ate(t, "teste.estado !== 'abertura'", 3000))) await clicar(t, "#jogar");
  ok(await ate(t, "teste.estado === 'corrida' && teste.dividida", 30000), "(d) corrida a 2 com controle + celular");
  if (process.env.DEPURAR) console.log(await t.ev("JSON.stringify({ e: teste.estado, d: teste.dividida, m: Jogadores.modo, p: Jogadores.j2Pronto, v: Jogadores.salaTV.vagas, nomes: !!document.querySelector('.nomes-tela'), eng: Engrenagem.aberta, aviso: document.querySelector('#mensagem')?.textContent, ban: document.querySelector('.jog-banner')?.textContent })"));
  await espera(800);
  await t.ev("__btn(0, 14, true)"); await ate(t, "teste.jogador.virar > 0.3", 4000, 150);
  const v = await t.ev("teste.jogador.virar"); await t.ev("__btn(0, 14, false)");
  ok(v > 0.3, `(d) controle vira o kart da Alice (${v.toFixed(2)})`);
  await foto(t, "kart-so-controles-corrida.png");
  // pausa → ⚙️ → Voltar ao normal
  await pad(t, 0, 9);
  ok(await ate(t, "!document.querySelector('.pausa-tela').hidden && !!document.querySelector('.pausa-cartao .engrenagem-pausa')", 3000), "(d) pausa tem ⚙️ Configurações");
  await clicar(t, ".pausa-cartao .engrenagem-pausa");
  ok(await ate(t, "Engrenagem.aberta && !!document.querySelector('[data-eng=normal]')", 3000), "(d) ⚙️ mostra 'Voltar ao normal'");
  await foto(t, "kart-so-controles-pausa-engrenagem.png");
  await clicar(t, "[data-eng=normal]");
  ok(await ate(t, "!new URLSearchParams(location.search).has('tv') && !!window.teste && window.Jogadores?.tv === false && !document.documentElement.classList.contains('sala-tv')", 40000), "(d) 'Voltar ao normal': jogo normal de novo, com toque");
  ok(!errosDe(t).length && !c.erros.length, "(d) sem erros " + [...errosDe(t), ...c.erros].join(" ; "));
  await c.fechar();
  await t.fechar();
}

// ------------------------------------------------------------------ (e) casca e pausa (Rabiscolândia, Memória)
for (const id of quer("e") ? ["rabiscopolis", "memoria"] : []) {
  const t = await aparelho(`${BASE}/jogos/${id}/?teste`, { mobile: false, largura: 1280, altura: 720 });
  await ate(t, "!!window.Engrenagem && !!document.querySelector('.casca-engrenagem')", 40000);
  await espera(1500);
  ok(await t.ev("!document.querySelector('.casca-topo .remap-botao')"), `(e) ${id}: uma ⚙️ só no topo`);
  await t.ev("document.querySelector('.casca-engrenagem').click()");
  ok(await ate(t, "Engrenagem.aberta && !!document.querySelector('[data-eng=tv]')", 3000), `(e) ${id}: ⚙️ da casca abre`);
  if (id !== "memoria") ok(await t.ev("!!document.querySelector('[data-eng=botoes]')"), `(e) ${id}: 'Trocar teclas e botões' dentro da ⚙️`);
  await tecla(t, "Escape", "Escape", 27);
  ok(await ate(t, "!Engrenagem.aberta", 2000), `(e) ${id}: Esc fecha`);
  await tecla(t, "m", "KeyM", 77);
  await espera(300);
  const som = await t.ev("localStorage.getItem('rabisco.som')");
  if (id === "memoria") ok(som === "0", `(e) ${id}: M desliga o som`);
  else ok(som !== "0", `(e) ${id}: M é do mapa, não mexe no som`);
  ok(!errosDe(t).length, `(e) ${id}: sem erros ` + errosDe(t).join(" ; "));
  await t.fechar();
}

console.log(falhas ? `${falhas} falha(s)` : "tudo certo", "· fotos em", PASTA);
process.exit(falhas ? 1 : 0);
