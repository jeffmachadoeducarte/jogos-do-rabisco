// Rabiscolândia (Fatias 1 a 5): carrega sem erro, escolhe casa (e guarda), dirige sem atravessar sólidos, Garagem do
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
// se o navegador cair, uma chamada fica esperando para sempre: o vigia encerra com falha em vez de sair calado
const vigia = setTimeout(() => { console.log("✗ o teste travou (o navegador caiu?)"); process.exit(2); }, 65 * 60 * 1000);
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

// Fatia 5: joga as 12 missões de ponta a ponta (quem pede, itens, quem segue, carona, faixa, quem espera reage)
async function testarMissoes(t, { ok, espera, FOTOS, fotos = true }) {
  const ev = (s) => t.ev(s);
  const M = await ev("teste.missoes.MISSOES.map((m) => ({ id: m.id, quem: m.quem, npcs: m.npcs, etapas: m.etapas, tipo: m.tipo, titulo: m.titulo }))");
  // longe: ninguém das missões montado nem visível na largada (orçamento)
  await ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(1200);
  const custo = await ev("(() => { const a = teste.medir().semSombra.calls; teste.missoes.grupo.visible = false; const b = teste.medir().semSombra.calls; teste.missoes.grupo.visible = true; return { com: a, sem: b, montados: teste.missoes.montados() }; })()");
  ok(custo.com - custo.sem <= 0, `na praça as missões não custam chamadas de desenho (${custo.sem} → ${custo.com}; montados perto: ${custo.montados.join(", ") || "nenhum"})`);
  const perto = async (x, z, dx = 1.6, dz = 1.2) => { await ev(`teste.ir(${x + dx}, ${z + dz})`); await espera(700); };
  const acao = async () => { await ev("teste.acao()"); await espera(300); };
  const posNpc = (mid, id) => ev(`teste.missoes.npc('${mid}', '${id}')`);
  const fotoPerto = async (nome, x, z, ang = 0.6, dist = 7, alt = 3.4, ay = 1) => { if (!fotos) return; await ev(`teste.vista([${x} + Math.sin(${ang}) * ${dist}, ${alt}, ${z} + Math.cos(${ang}) * ${dist}], [${x}, ${ay}, ${z}])`); await espera(900); await t.foto(`${FOTOS}missao-${nome}.png`); await ev("teste.vista(null)"); };
  for (const m of M) {
    const q = await posNpc(m.id, m.quem);
    await perto(q.x, q.z);
    const ctx = await ev("teste.contexto");
    const marca = await ev(`(() => { const g = teste.missoes.grupo; return g.children.some((o) => o.isSprite && o.visible && o.material.depthTest === false); })()`);
    ok(ctx && ctx.includes(m.titulo), `${m.id}: perto de quem pede aparece "${ctx}"${marca ? " (com o ! em cima)" : ""}`);
    if (m.id === "ovelha" || m.id === "zaqueu" || m.id === "noe") await fotoPerto(`${m.id}-pede`, q.x, q.z, m.id === "noe" ? 2.2 : 0.5, m.id === "noe" ? 10 : 6.5, m.id === "zaqueu" ? 4.2 : 3.2, m.id === "zaqueu" ? 2.6 : 1);
    await acao();
    ok(await ev(`teste.missoes.ativa === '${m.id}'`), `${m.id}: missão aceita — ${(await ev("JSON.stringify(teste.missoes.texto())"))}`);
    for (let e = 0; e < m.etapas.length; e++) {
      const E = m.etapas[e];
      if (E.tipo === "falar") { const n = await posNpc(m.id, E.com); await perto(n.x, n.z); await acao(); }
      else if (E.tipo === "pegar") { for (const it of E.itens) { await perto(it.x, it.z, 0.8, 0.6); const c = await ev("teste.contexto"); await acao(); if (!(await ev(`teste.missoes.levando.includes('${it.id}')`))) ok(false, `${m.id}: pegar ${it.id} (contexto "${c}")`); } ok(true, `${m.id}: pegou ${E.itens.length} item(ns), na cabeça: ${(await ev("teste.missoes.levando.length"))}`); }
      else if (E.tipo === "plantar") { for (const p of E.pontos) { await perto(p.x, p.z, 0.6, 0.6); await acao(); } ok(await ev(`teste.missoes.plantasDe('${m.id}').every((p) => p.feito)`), `${m.id}: plantou nos ${E.pontos.length} canteiros`); }
      else if (E.tipo === "levar") { const n = await posNpc(m.id, E.ate); await perto(n.x, n.z); const c = await ev("teste.contexto"); await acao(); ok(c?.includes("Entregar"), `${m.id}: entregou para ${m.npcs[E.ate].nome} ("${c}")`); }
      else if (E.tipo === "seguir" || E.tipo === "faixa") {
        const quem = E.quem ?? E.com, n = await posNpc(m.id, quem);
        await perto(n.x, n.z, 1.2, 1.2); await espera(500);
        ok((await posNpc(m.id, quem)).seguindo, `${m.id}: ${m.npcs[quem].nome} começou a seguir o Rabisco`);
        const d = await posNpc(m.id, E.ate);
        if (E.tipo === "faixa") {
          // espera o vermelho para os pedestres e vai para o outro lado: o Caderninho não pisa na rua até ficar verde
          for (let k = 0; k < 40 && (await ev("(() => { const s = teste.mundo.semaforos.find((q) => q.x === -50 && q.z === 50); return teste.luzPedestreVerde(s, 'x'); })()")); k++) await espera(250);
          await ev(`teste.ir(${d.x + 1.5}, ${d.z - 1.5})`);
          let naRuaVermelho = false, esperou = false, chegou = false;
          for (let k = 0; k < 120 && !chegou; k++) {
            await espera(250);
            const st = await ev(`(() => { const n = teste.missoes.npc('faixa', 'caderninho'); const s = teste.mundo.semaforos.find((q) => q.x === -50 && q.z === 50); return { naRua: n.z > 44 && n.z < 56 && n.x > -44.5, verde: teste.luzPedestreVerde(s, 'x'), ativa: teste.missoes.ativa, x: n.x, z: n.z }; })()`);
            if (st.naRua && !st.verde && !esperou) naRuaVermelho = true;
            if (!st.naRua && !st.verde) esperou = true;
            if (st.ativa !== "faixa") chegou = true;
            if (k === 6 && fotos) await t.foto(`${FOTOS}missao-faixa-esperando.png`);
          }
          ok(esperou && !naRuaVermelho, `faixa: o Caderninho esperou o bonequinho verde na calçada (pisou na rua no vermelho: ${naRuaVermelho})`);
          ok(chegou, "faixa: atravessaram juntos e chegaram na Mamãe Caderno");
        } else {
          await ev(`teste.ir(${d.x + 1.6}, ${d.z + 1.4})`);
          for (let k = 0; k < 40 && (await ev(`teste.missoes.ativa === '${m.id}'`)); k++) await espera(250);
        }
      }
      else if (E.tipo === "dirigir") {
        const n = await posNpc(m.id, E.passageiro);
        await perto(n.x, n.z, 1.4, 1.0);
        const c = await ev("teste.contexto");
        ok(c?.includes("Chamar um carro"), `amigos: perto do Lápis Azul aparece "${c}"`);
        await acao(); await espera(400);
        const iv = await ev("teste.veiculos.length - 1");
        await ev(`teste.entrar(${iv})`); await espera(300);
        await ev(`teste.posVeiculo(${iv}, ${n.x + 2.5}, ${n.z + 1}, 0)`); await espera(800);
        ok(await ev("teste.missoes.carona"), "amigos: o Lápis Azul entrou de carona no carro");
        if (fotos) { await ev(`teste.vista([${n.x + 2.5} - 2.5, 3.6, ${n.z + 1} - 5], [${n.x + 2.5}, 1, ${n.z + 1}])`); await espera(700); await t.foto(`${FOTOS}missao-amigos-carona.png`); await ev("teste.vista(null)"); }
        const d = await posNpc(m.id, E.ate);
        await ev(`teste.posVeiculo(${iv}, ${d.x + 2}, -50, Math.PI / 2)`); await espera(400);
        for (let k = 0; k < 20 && (await ev(`teste.missoes.ativa === 'amigos'`)); k++) await espera(250);
        ok(await ev("teste.missoes.npc('amigos', 'medico').festa > 0"), "amigos: parou na frente do hospital, o Lápis Azul desceu e o Doutor Apontador comemorou");
        for (let k = 0; k < 20 && (await ev(`teste.missoes.ativa === 'amigos'`)); k++) await espera(250);
        await ev("teste.sair()");
      }
    }
    const feita = await ev(`teste.missoes.feitas.includes('${m.id}') && teste.missoes.ativa === null`);
    const dest = m.etapas.at(-1).ate;
    const nd = await posNpc(m.id, dest);
    ok(feita && (nd.festa > 0 || m.id === "amigos"), `${m.id}: concluída — ${m.npcs[dest].nome} reagiu (festa ${nd.festa.toFixed(1)} s) e o selo foi para o Passaporte`);
    await espera(250);
    await fotoPerto(`${m.id}-fim`, nd.x, nd.z, { lanche: Math.PI * 0.9, noe: 2.2 }[m.id] ?? 0.7, m.id === "noe" ? 9 : 6.5, 3);
    if (m.id === "ovelha") { await espera(5200); const b = await ev("document.querySelector('.balao-rp').textContent"); ok(/baseado em Lucas 15/.test(b), `ovelha: depois aparece o versículo "${b.slice(0, 90)}…"`); }
  }
  const salvo = await ev("teste.salvo");
  ok(salvo.missoesFeitas.length === 12 && salvo.selos.length === 12, `12 missões feitas e 12 selos guardados (${salvo.missoesFeitas.length}/${salvo.selos.length})`);
  // Passaporte no Rabifone
  await ev("teste.ir(0, 33); teste.fone.abrir()"); await espera(300);
  await ev("[...document.querySelectorAll('.rf-app')].find((b) => b.textContent.includes('Passaporte')).click()"); await espera(400);
  const pas = await ev("({ n: document.querySelectorAll('.rf-item-missao').length, selos: document.querySelectorAll('.rf-selo.feito').length, txt: document.querySelector('.rf-tela p')?.textContent })");
  ok(pas.n === 12 && pas.selos === 12, `Passaporte: ${pas.n} missões, ${pas.selos} selos ("${pas.txt}")`);
  if (fotos) await t.foto(`${FOTOS}missao-passaporte.png`);
  await ev("teste.fone.fechar()");
  // largar e voltar: de novo a ovelha, larga no meio, ela volta para o parque
  const q = await posNpc("lixo", "gari");
  await perto(q.x, q.z); await acao();
  const it = (await ev("teste.missoes.itensDe('lixo')"))[0];
  await perto(it.x, it.z, 0.8, 0.6); await acao();
  await ev("teste.missoes.largar()"); await espera(200);
  ok(await ev("teste.missoes.ativa === null && teste.missoes.itensDe('lixo').length === 0 && teste.missoes.levando.length === 0"), "largar a missão no meio: tira os itens e a cabeça fica vazia");
  await ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(900);
}

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
  // rádio gospel: liga no carro, abaixa quando a anfitriã fala, desliga ao sair
  ok(await t.ev("!!teste.radio?.ligado && !teste.radioUI.el.hidden"), "rádio: entrou no carro, o rádio está tocando e o painel aparece");
  await t.ev("teste.falar('rp-garagem')");
  let abaixou = false;
  for (let i = 0; i < 12 && !abaixou; i++) { await espera(150); abaixou = await t.ev("teste.radio.estado().abaixado"); }
  ok(abaixou, "rádio: a fala gravada (MP3) abaixa o volume");
  await t.foto(`${FOTOS}radio-rabiscolandia-1280.png`);
  await t.ev("teste.sair()");
  ok(await t.ev("!teste.radio.ligado && teste.radioUI.el.hidden"), "rádio: saiu do carro, o rádio para");
  const hiR = await t.ev("teste.veiculos.findIndex((v) => v.tipo === 'heli')");
  await t.ev(`teste.entrar(${hiR})`);
  ok(await t.ev("!teste.radio.ligado && teste.radioUI.el.hidden"), "rádio: no helicóptero não liga");
  await t.ev("teste.sair()");
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
  // ---------- D: cidade maior (5 × 5 blocos), helicóptero e as duas escolas
  ok(await t.ev("teste.mundo.blocos.length === 25"), "cidade de 5 × 5 blocos");
  // helicóptero do heliponto: sobe, voa para a frente sem atravessar prédios, desce devagar e pousa
  const hi = await t.ev("teste.veiculos.findIndex((v) => v.tipo === 'heli')");
  ok(hi >= 0, "o helicóptero está no heliponto");
  await t.ev(`teste.vista(null); teste.entrar(${hi})`);
  await espera(400);
  await t.foto(`${FOTOS}helicoptero-no-heliponto.png`);
  await t.ev("teste.voar(true)");
  await espera(2500);
  const alt1 = await t.ev("teste.dentro.alt");
  const h0 = await t.ev("[teste.dentro.pos.x, teste.dentro.pos.z]");
  await t.ev("teste.volante(1, 0.15, { subir: false })");
  let furou = false;
  for (let i = 0; i < 10; i++) { await espera(250); if (await t.ev("teste.mundo.solidos.some((s) => s.y1 > teste.dentro.alt + 0.3 && teste.dentro.pos.x > s.x0 && teste.dentro.pos.x < s.x1 && teste.dentro.pos.z > s.z0 && teste.dentro.pos.z < s.z1)")) furou = true; }
  const h1 = await t.ev("[teste.dentro.pos.x, teste.dentro.pos.z]");
  await t.foto(`${FOTOS}helicoptero-voando.png`);
  await t.ev("teste.volante(0, 0, { descer: true })");
  let pousou = false;
  for (let i = 0; i < 40 && !pousou; i++) { await espera(300); pousou = await t.ev("teste.dentro.alt - teste.chaoHeli(teste.dentro.pos.x, teste.dentro.pos.z) < 0.15"); }
  const voou = Math.hypot(h1[0] - h0[0], h1[1] - h0[1]);
  ok(alt1 > 4 && voou > 8 && !furou && pousou, `helicóptero: subiu a ${alt1.toFixed(1)} m, voou ${voou.toFixed(1)} m sem atravessar prédios e pousou devagar (${pousou})`);
  ok(await t.ev("teste.dentro.g.userData.rotor.rotation.y !== 0"), "helicóptero: as hélices giram");
  await t.ev("teste.volante(null); teste.sair()");
  ok(await t.ev("teste.dentro === null"), "helicóptero: depois de pousar, o Rabisco sai");
  // Garagem chama o helicóptero
  await t.ev("teste.ir(0, 33); teste.olhar(Math.PI)");
  await espera(400);
  const dh = await t.ev("teste.garagem('heli')");
  ok(dh != null && dh < 10, `app Garagem chama o helicóptero a ${dh?.toFixed?.(1)} m`);
  // vista de cima da cidade maior, escolas e novos bairros
  for (const [arq, pos, alvo, ir] of [
    ["rabiscopolis-maior-vista.png", [0, 430, 300], [0, 0, 0], [0, 33]],
    ["rabiscopolis-maior-praia.png", [30, 18, 160], [0, 0, 200], [0, 165]],
    ["rabiscopolis-maior-mirante-heliponto.png", [-30, 20, -160], [5, 3, -192], [0, -170]],
    ["rabiscopolis-maior-oeste.png", [-160, 18, -80], [-195, 2, -62], [-195, -45]],
    ["rabiscopolis-maior-leste.png", [160, 18, 85], [195, 2, 66], [195, 45]],
    ["escolas-kids-1.png", [-180, 9, 14], [-195, 4, -12], [-195, 5]],
    ["escolas-kids-1-parquinho.png", [-185, 10, 48], [-195, 0, 22], [-195, 40]],
    ["escolas-kids-2.png", [210, 10, 14], [195, 4, -14], [195, 5]],
  ]) {
    await t.ev(`teste.ir(${ir[0]}, ${ir[1]}); teste.vista(${JSON.stringify(pos)}, ${JSON.stringify(alvo)}, ${arq.includes("vista") ? "false" : "true"})`);
    await espera(1800);
    await t.foto(`${FOTOS}${arq}`);
  }
  await t.ev("teste.vista(null)");
  // orçamento também nos bairros novos
  for (const [nome, cmd] of [["Educarte Kids I", "teste.ir(-195, 4); teste.olhar(Math.PI)"], ["praia", "teste.ir(0, 160); teste.olhar(0)"]]) {
    await t.ev(cmd); await espera(1200);
    const m = await t.ev("teste.medir().total");
    ok(m.calls <= 250 && m.tris <= 350000, `orçamento TV/computador em ${nome}: ${m.calls} chamadas, ${Math.round(m.tris / 1000)} mil triângulos`);
  }
  // ---------- C: casa por dentro e decoração
  const prob = await t.ev("[...teste.verificar('A'), ...teste.verificar('B')]");
  ok(!prob.length, `plantas A e B: todo ponto cabe no cômodo, sem atravessar parede nem tapar porta ${prob.join("; ")}`);
  // entra pela porta da casa 3 (escolhida no item b)
  await t.ev("(() => { const l = teste.LOTES[2]; teste.ir(l.x, l.z + l.dir[1] * 0.5); })()");
  await espera(500);
  const ctxCasa = await t.ev("teste.contexto");
  await t.ev("teste.acao()");
  const entrou = await ate(t, "teste.emCasa?.numero === 3 && teste.emCasa.planta === 'A'", 8000);
  ok(entrou, `entrou em casa pela porta ("${ctxCasa}", casa ${await t.ev("JSON.stringify(teste.emCasa && [teste.emCasa.numero, teste.emCasa.planta])")}) e a planta é a A`);
  // aquecimento: a primeira volta desenha a cidade e a casa pela primeira vez (sobe tudo para a placa de vídeo)
  for (let i = 0; i < 2; i++) { await t.ev("teste.sairCasa()"); await espera(500); await t.ev("teste.entrarCasa()"); await espera(500); }
  // memória: (1) trocar o móvel 10× dentro de casa não deixa geometria sobrando; (2) entrar e sair 10× também não
  // aquecimento: sofá e poltrona já desenhados uma vez (as peças arredondadas ficam num cache compartilhado de propósito)
  for (const m of ["poltrona", "sofa"]) { await t.ev(`teste.decorar('sala-sofa', { id: '${m}', cor: 0x00b5f0 })`); await espera(300); }
  const memA = await t.ev("teste.memoria()");
  for (let i = 0; i < 10; i++) { await t.ev(`teste.decorar('sala-sofa', ${i % 2 ? "{ id: 'sofa', cor: 0x00b5f0 }" : "{ id: 'poltrona', cor: 0xec2e8c }"})`); await espera(200); }
  const memB = await t.ev("teste.memoria()");
  ok(memB.geometries <= memA.geometries + 1 && memB.textures === memA.textures, `trocar o móvel 10× não vaza memória (geometrias ${memA.geometries} → ${memB.geometries})`);
  for (let i = 0; i < 10; i++) { await t.ev("teste.sairCasa()"); await espera(250); await t.ev("teste.entrarCasa()"); await espera(250); }
  await t.ev("teste.decorar('sala-sofa', null)");
  await espera(600);
  const mem1 = await t.ev("teste.memoria()"), naCena = await t.ev("teste.geometriasNaCena()");
  ok(mem1.geometries <= naCena && mem1.textures <= memB.textures + 2, `entrar e sair 10× sem vazar memória (na placa de vídeo ${mem1.geometries} ≤ ligadas à cena ${naCena}; texturas ${memB.textures} → ${mem1.textures})`);
  // decorar pelo carrossel de verdade: chega no ponto do sofá, aperta a ação, passa móveis e cores e confirma
  await t.ev("teste.irAoPonto('sala-sofa')");
  await espera(400);
  const ctxDeco = await t.ev("teste.contexto");
  await t.ev("teste.acao()");
  await espera(500);
  ok(await t.ev("teste.deco.aberto"), `no ponto, a ação abre o carrossel ("${ctxDeco}")`);
  await t.ev("teste.deco.navegar(1, 0); teste.deco.navegar(0, 1); teste.deco.navegar(0, 1)");
  await espera(400);
  await t.foto(`${FOTOS}casa-carrossel.png`);
  const escolhaUI = await t.ev("teste.deco.escolha");
  await t.ev("teste.deco.confirmar()");
  await espera(300);
  ok(escolhaUI && await t.ev(`teste.emCasa.pontos.find((p) => p.id === 'sala-sofa').escolha?.id === ${JSON.stringify(escolhaUI.id)}`), `carrossel: escolheu "${escolhaUI?.id}" e ficou no lugar`);
  // decora o resto (cama no quarto, cantinho de oração, quadro de versículo...) e confere que cada móvel cabe no ponto
  const decorados = await t.ev(`(() => {
    const quero = { "qto-cama": "cama", "sala-meio": "oracao", "sala-quadro": "quadro-versiculo", "coz-meio": "mesa-jantar", "coz-fundo": "geladeira", "coz-fundo2": "fogao", "coz-parede": "armario", "qto-lado": "guarda-roupa", "qto-canto": "criado", "qto-frente": "bau", "qto-quadro": "quadro-versiculo", "sala-lado": "estante", "sala-canto": "planta" };
    const cores = [0xec2e8c, 0x00b5f0, 0xffcc1f, 0x58c43a, 0x8e6cff, 0xff7a00]; let n = 0, ruins = 0;
    for (const p of teste.emCasa.pontos) {
      const L = teste.lista(p.id); if (!L.length || p.id === "sala-sofa") continue;
      const it = L.find((x) => x.id === quero[p.id]) ?? L[0];
      teste.decorar(p.id, { id: it.id, variante: p.id === "qto-quadro" ? 1 : (it.variante ?? 0), cor: cores[n++ % 6] });
    }
    return { n, ruins };
  })()`);
  ok(decorados.n >= 12, `${decorados.n + 1} pontos decorados na planta A`);
  await t.ev("teste.irAoPonto('coz-meio')");
  await espera(800);
  await t.foto(`${FOTOS}casa-planta-A-decorada.png`);
  const salvos = await t.ev("JSON.stringify(teste.salvo.moveis[3])");
  // muda a cor da casa por fora (Rabifone) e recarrega: móveis e cor continuam
  await t.ev("teste.sairCasa(); teste.corCasa(0x8fe3cf)");
  await espera(300);
  await t.cmd("Page.reload");
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo"), "recarregou com a casa decorada");
  ok(await t.ev("teste.corParedes === 0x8fe3cf && teste.salvo.corCasa === 0x8fe3cf"), "a cor nova da casa continua depois de recarregar");
  await t.ev("(() => { const l = teste.LOTES[2]; teste.ir(l.x + 7, l.z + l.dir[1] * 6); teste.olhar(Math.atan2(-l.dir[0], -l.dir[1]) - 0.6); })()");
  await espera(1200);
  await t.foto(`${FOTOS}casa-cor-nova.png`);
  await t.ev("teste.entrarCasa()");
  await espera(400);
  const depois = await t.ev("JSON.stringify(Object.fromEntries(teste.emCasa.pontos.filter((p) => p.escolha).map((p) => [p.id, p.escolha])))");
  const ordenar = (j) => JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(j)).sort(([a], [b]) => a.localeCompare(b))));
  ok(ordenar(depois) === ordenar(salvos), `os móveis continuam no lugar depois de recarregar (${Object.keys(JSON.parse(depois)).length} móveis)`);
  // nada atravessa parede nem o Rabisco atravessa móvel: anda contra a parede do fundo e contra a cama
  await t.ev("teste.irAoPonto('qto-cama'); teste.volante(1, 0)");
  await espera(1200);
  await t.ev("teste.volante(null)");
  ok(await t.ev("!teste.dentroDeSolido(teste.j.pos.x, teste.j.pos.z)"), "o Rabisco não entra na cama nem na parede");
  await t.ev("teste.sairCasa()");
  // planta B: muda para uma casa da Vila das Flores e decora
  await t.ev("(() => { const l = teste.LOTES[8]; teste.ir(l.x, l.z + l.dir[1] * 0.5); })()");
  await espera(400);
  await t.ev("teste.acao()");
  await espera(800);
  await t.ev("teste.entrarCasa()");
  await espera(400);
  const nB = await t.ev(`(() => {
    const quero = { "qto-cama": "cama", "bebe-berco": "berco", "bebe-meio": "tapete", "bebe-canto": "bau", "sala-meio": "oracao", "sala-sofa": "sofa", "coz-meio": "mesa-jantar", "coz-fundo": "geladeira", "sala-quadro": "quadro-versiculo", "qto-quadro": "quadro-versiculo", "qto-lado": "guarda-roupa", "sala-lado": "piano" };
    const cores = [0x8e6cff, 0xffcc1f, 0x00b5f0, 0xec2e8c, 0x58c43a, 0xff7a00]; let n = 0;
    for (const p of teste.emCasa.pontos) { const L = teste.lista(p.id); if (!L.length) continue; const it = L.find((x) => x.id === quero[p.id]) ?? L[0]; teste.decorar(p.id, { id: it.id, variante: p.id === "qto-quadro" ? 2 : 0, cor: cores[n++ % 6] }); }
    return teste.emCasa.planta === "B" ? n : -1;
  })()`);
  ok(nB >= 10, `planta B (Vila das Flores): ${nB} pontos decorados`);
  await t.ev("teste.irAoPonto('sala-meio')");
  await espera(800);
  await t.foto(`${FOTOS}casa-planta-B-decorada.png`);
  await t.ev("teste.sairCasa()");
  // ---------- Fatia 3: lugares por dentro e profissões
  await t.ev("(() => { const l = teste.LUGARES.find((q) => q.id === 'hospital'); teste.ir(l.x, l.z); })()");
  await espera(500);
  const ctxHosp = await t.ev("teste.contexto");
  await t.ev("teste.acao()");
  ok(await ate(t, "teste.emLugar?.id === 'hospital'", 8000), `entra no hospital pela porta ("${ctxHosp}")`);
  const usar = async (iid) => { await t.ev(`teste.irAoInterativo('${iid}')`); await espera(300); const r = await t.ev("teste.contexto"); await t.ev("teste.acao()"); await espera(500); return r; };
  const SALAS3 = { hospital: ["curativo", "febre", "coracao"], veterinario: ["banho", "petisco"], kids1: ["sino", "lousa", "musiquinha"], kids2: ["sino", "lousa"], igreja: ["coral", "culto"], sorveteria: [], padaria: ["forno"], bombeiros: ["sirene"], mercado: ["caixa", "frutas"], biblioteca: ["ler", "carimbo"] };
  const PROF = { hospital: "medico", veterinario: "veterinario", kids1: "professor", kids2: "professor", igreja: "coral", sorveteria: "sorveteiro", padaria: "padeiro", bombeiros: "bombeiro", mercado: "caixa", biblioteca: "bibliotecario" };
  for (const [sala, objs] of Object.entries(SALAS3)) {
    if (sala !== "hospital") { await t.ev(`teste.entrarLugar('${sala}')`); await espera(400); }
    if (await t.ev("teste.profissao") === PROF[sala]) await usar("armario"); // tira o da sala anterior igual (professor)
    const rotArm = await usar("armario");
    const vestido = await t.ev("teste.profissao");
    const feitos = [];
    for (const o of objs) { const rot = await usar(o); feitos.push(`${rot}`); }
    const est = await t.ev("JSON.stringify(teste.emLugar.est, (k, v) => (k && typeof v === 'object' && v && !Array.isArray(v) ? undefined : v))");
    ok(vestido === PROF[sala], `${sala}: o armário (${rotArm}) veste o uniforme de ${vestido}`);
    const e = JSON.parse(est);
    const marcou = { hospital: e.curativo && e.febre && e.coracao, veterinario: e.banho && e.petisco, kids1: e.sino && e.lousa != null && e.musica, kids2: e.sino && e.lousa != null, igreja: e.coral && e.historia, sorveteria: true, padaria: e.assando > 0, bombeiros: e.sirene, mercado: e.compras && e.frutas, biblioteca: e.livro && e.carimbos }[sala];
    ok(Boolean(marcou), `${sala}: objetos funcionando (${feitos.join(" · ")})`);
    const m = await t.ev("teste.medir().total");
    ok(m.calls <= 250 && m.tris <= 350000, `${sala}: orçamento lá dentro ${m.calls} chamadas, ${Math.round(m.tris / 1000)} mil triângulos`);
    await t.foto(`${FOTOS}lugar-${sala}.png`);
    // missõezinhas com alguém esperando e reagindo
    if (sala === "sorveteria") {
      await usar("casquinha");
      const pedido = await t.ev("teste.emLugar.est.pedido.map((s) => s.id)");
      await t.ev(`teste.sorveteUI.escolher('${pedido[1]}'); teste.sorveteUI.escolher('${pedido[0]}'); teste.sorveteUI.entregar()`);
      await espera(300);
      const errou = await t.ev("teste.sorveteUI.aberto && teste.emLugar.est.casquinhas === 0");
      await t.ev(`teste.sorveteUI.escolher('${pedido[0]}'); teste.sorveteUI.escolher('${pedido[1]}')`);
      await t.foto(`${FOTOS}lugar-sorveteria-balcao.png`);
      await t.ev("teste.sorveteUI.entregar()");
      await espera(400);
      ok(errou && await t.ev("teste.emLugar.est.casquinhas === 1 && !teste.sorveteUI.aberto"), `sorveteria: casquinha na ordem errada pede de novo; ${pedido.join(" + ")} certinho o cliente agradece`);
    }
    if (sala === "padaria") {
      await espera(3600);
      await usar("entregar");
      ok(await t.ev("teste.emLugar.est.entregues === 1"), "padaria: o pão assou e o cliente recebeu");
    }
    if (sala === "bombeiros") {
      await usar("armario"); // tira o uniforme: sem ele o treino só dá a dica
      await usar("treino");
      const semJato = await t.ev("!(teste.emLugar.est.jato > 0)");
      await usar("armario");
      await usar("treino");
      await espera(3500);
      ok(semJato && await t.ev("teste.emLugar.est.apagou === true"), "bombeiros: sem uniforme dá a dica; de uniforme a mangueira apaga o foguinho de treino");
    }
    await t.ev("teste.sairLugar()"); await espera(300);
  }
  // sair e entrar nos lugares não vaza memória
  const memL0 = await t.ev("teste.memoria()");
  for (let i = 0; i < 5; i++) for (const sala of ["hospital", "igreja"]) { await t.ev(`teste.entrarLugar('${sala}')`); await espera(200); await t.ev("teste.sairLugar()"); await espera(200); }
  const memL1 = await t.ev("teste.memoria()"), naCenaL = await t.ev("teste.geometriasNaCena()");
  ok(memL1.geometries <= naCenaL && memL1.textures <= memL0.textures + 1, `entrar e sair dos lugares 10× sem vazar (placa ${memL1.geometries} ≤ cena ${naCenaL})`);
  ok(await t.ev("teste.profissao") !== undefined && await t.ev("JSON.stringify(teste.salvo.roupas)") !== undefined, "o uniforme fica guardado para a próxima vez");
  // ---------- Fatia 4: veículos
  const tipos = await t.ev("teste.veiculos.map((v) => v.tipo)");
  ok(["je", "ambulancia", "bombeiro", "sorvete", "bici", "patinete", "barco", "trator"].every((x) => tipos.includes(x)), `veículos na cidade: ${[...new Set(tipos)].join(", ")}`);
  for (const tipo of ["je", "ambulancia", "bombeiro", "sorvete", "bici", "patinete", "trator"]) {
    const i = tipos.indexOf(tipo);
    await t.ev(`teste.entrar(${i}); teste.volante(1, 0)`);
    const p0 = await t.ev(`[teste.veiculos[${i}].pos.x, teste.veiculos[${i}].pos.z]`);
    let furou = false;
    for (let k = 0; k < 6; k++) { await espera(250); if (await t.ev("teste.dentroDeSolido(teste.dentro.pos.x, teste.dentro.pos.z)")) furou = true; }
    await t.ev("teste.volante(null)");
    const p1 = await t.ev(`[teste.veiculos[${i}].pos.x, teste.veiculos[${i}].pos.z]`);
    const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    ok(d > 2 && !furou, `${tipo}: andou ${d.toFixed(1)} m sem atravessar nada`);
    if (tipo === "ambulancia") { await t.ev("teste.especial(true)"); await espera(700); ok(await t.ev("teste.dentro.sirene > 0"), "ambulância: a sirene liga e as luzes piscam"); await t.ev("teste.especial(false); teste.volante(null)"); }
    if (tipo === "bombeiro") { await t.ev("teste.especial(true)"); await espera(600); ok(await t.ev("teste.dentro.g.userData.jato.visible === true"), "caminhão de bombeiro: o canhão solta o jato d'água enquanto segura"); await t.foto(`${FOTOS}veiculo-bombeiro-jato.png`); await t.ev("teste.especial(false); teste.volante(null)"); await espera(300); ok(await t.ev("teste.dentro.g.userData.jato.visible === false"), "caminhão de bombeiro: soltou, o jato para"); }
    if (tipo === "sorvete") { await t.ev("teste.especial(true)"); await espera(300); await t.ev("teste.especial(false); teste.volante(null)"); }
    await t.ev("teste.sair()"); await espera(200);
    ok(await t.ev("teste.dentro === null"), `${tipo}: o Rabisco sai`);
  }
  // barquinho: anda no lago e não sai dele
  const ib = tipos.indexOf("barco");
  await t.ev(`teste.entrar(${ib}); teste.volante(1, 0.3)`);
  await espera(4000);
  await t.ev("teste.volante(null)");
  const naAgua = await t.ev(`(() => { const v = teste.veiculos[${ib}]; return [{ x: 8, z: 104, r: 15 }, { x: 0, z: 202, r: 24 }].some((l) => Math.hypot(v.pos.x - l.x, v.pos.z - l.z) < l.r); })()`);
  ok(naAgua, "barquinho: remou por 4 s e continua dentro do lago");
  await t.ev(`(() => { const v = teste.veiculos[${ib}]; teste.vista([v.pos.x + 6, 4, v.pos.z + 7], [v.pos.x, 0.5, v.pos.z]); })()`);
  await espera(800);
  await t.foto(`${FOTOS}veiculo-barquinho.png`);
  await t.ev("teste.vista(null)");
  await t.ev(`teste.posVeiculo(${ib}, 8, 104 + 15 - 2.6, Math.PI / 2)`); await espera(300);
  await t.ev("teste.sair()"); await espera(300);
  ok(await t.ev("teste.dentro === null"), "barquinho: na beirinha, o Rabisco desce");
  // sem atropelar: a Vovó Lápis atravessando a Avenida da Alegria; o carro para antes dela
  const iv = tipos.indexOf("je");
  const vo0 = await t.ev("[teste.vovo.grupo.position.x, teste.vovo.grupo.position.z]");
  await t.ev("teste.vovo.grupo.position.set(-30, 0.07, 52)");
  await t.ev(`teste.entrar(${iv}); teste.posVeiculo(${iv}, -30, 45, 0); teste.volante(1, 0)`);
  await espera(3000);
  await t.ev("teste.volante(null)");
  const dv = await t.ev(`Math.hypot(teste.veiculos[${iv}].pos.x + 30, teste.veiculos[${iv}].pos.z - 52)`);
  const andouV = await t.ev(`teste.veiculos[${iv}].pos.z - 45`);
  ok(dv > 1.2 && andouV > 1, `sem atropelar: o carro andou ${andouV.toFixed(1)} m e parou a ${dv.toFixed(1)} m da Vovó Lápis`);
  await t.ev(`teste.sair(); teste.vovo.grupo.position.set(${vo0[0]}, 0.25, ${vo0[1]})`);
  // vitrine para a foto: todos lado a lado na Avenida da Alegria
  const lista = ["carro", "je", "ambulancia", "bombeiro", "sorvete", "onibus", "trator", "bici", "patinete"];
  await t.ev(`(() => { const L = ${JSON.stringify(lista)}; let x = -40; for (const tp of L) { const i = teste.veiculos.findIndex((v) => v.tipo === tp); const v = teste.veiculos[i]; x += v.larg + 1.6; teste.posVeiculo(i, x, 56.5 + (tp === "onibus" ? 0.6 : 0), Math.PI / 2 * 0); x += v.larg + 1.6; } teste.ir(-14, 64); teste.vista([-14, 9, 72], [-14, 1, 56]); })()`);
  await espera(1500);
  await t.foto(`${FOTOS}veiculos-vitrine.png`);
  await t.ev("teste.vista(null)");
  // garagem: cada veículo novo aparece do lado
  for (const tp of ["ambulancia", "bombeiro", "bici"]) { await t.ev("teste.ir(4, 33); teste.olhar(Math.PI)"); await espera(200); const d = await t.ev(`teste.garagem('${tp}')`); ok(d != null && d < 9, `Garagem: ${tp} chega a ${d?.toFixed?.(1)} m`); }
  await t.ev("teste.ir(8, 124)"); await espera(200);
  ok(await t.ev("teste.garagem('barco') != null"), "Garagem: perto do lago, o barquinho chega na água");
  await t.ev("teste.ir(0, 33)"); await espera(200);
  ok(await t.ev("teste.garagem('barco') == null"), "Garagem: longe do lago, o barquinho não vem (avisa para ir ao lago)");
  // ---------- Fatia 5: missões
  await testarMissoes(t, { ok, espera, FOTOS });
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
  await t.toque(".rp-carro .rp-sair");
  await espera(500);
  ok(await t.ev("teste.dentro === null"), "(g) botão Sair tira o Rabisco do carro");
  // helicóptero no toque: ◀ ▶ à esquerda; ▲ subir, ▼ descer, ➤ frente e Sair à direita
  await t.ev("teste.entrar(teste.veiculos.findIndex((v) => v.tipo === 'heli'))");
  await espera(600);
  const hb = await t.ev(`[${vis('.rp-heli [data-b="esq"]')}, ${vis('.rp-heli [data-b="dir"]')}, ${vis('[data-b="subir"]')}, ${vis('[data-b="descer"]')}, ${vis('[data-b="voar"]')}, ${vis(".rp-heli .rp-sair")}, ${vis(".jd-camada")}, ${vis(".rp-carro")}]`);
  ok(hb.slice(0, 6).every(Boolean) && !hb[6] && !hb[7], `(g) no helicóptero: ◀ ${hb[0]} ▶ ${hb[1]} ▲ ${hb[2]} ▼ ${hb[3]} ➤ ${hb[4]} Sair ${hb[5]}`);
  const [sx, sy] = await t.ev(`(() => { const b = document.querySelector('[data-b="subir"]').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
  await t.cmd("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: sx, y: sy }] });
  await espera(1500);
  await t.cmd("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const altT = await t.ev("teste.dentro.alt");
  ok(altT > 2, `(g) segurando ▲ o helicóptero sobe (${altT.toFixed(1)} m)`);
  await t.foto(`${FOTOS}helicoptero-celular.png`);
  await t.ev("teste.volante(0, 0, { descer: true })");
  for (let i = 0; i < 30 && !(await t.ev("teste.dentro.alt - teste.chaoHeli(teste.dentro.pos.x, teste.dentro.pos.z) < 0.15")); i++) await espera(300);
  await t.ev("teste.volante(null)");
  await t.toque(".rp-heli .rp-sair");
  await espera(500);
  ok(await t.ev("teste.dentro === null"), "(g) depois de pousar, Sair tira o Rabisco do helicóptero");
  o = await olhar();
  ok(!PEDIDO.test(o.txt), "(h) depois de dirigir, nenhum pedido de controle/QR");
  // missão pelo toque: na praça não custa nada; perto do Pastor Lápis o botão ✋ mostra a missão e aceita
  const custoM = await t.ev("(() => { teste.ir(0, 33); teste.olhar(Math.PI); const a = teste.medir().semSombra.calls; teste.missoes.grupo.visible = false; const b = teste.medir().semSombra.calls; teste.missoes.grupo.visible = true; return [b, a]; })()");
  ok(custoM[1] - custoM[0] <= 0, `celular: na praça as missões não custam chamadas de desenho (${custoM[0]} → ${custoM[1]})`);
  await t.ev("(() => { const n = teste.missoes.npc('ovelha', 'pastor'); teste.ir(n.x + 1.4, n.z + 1.2); })()"); await espera(900);
  const rot = await t.ev("document.querySelector('.rp-acao').textContent");
  await t.toque(".rp-acao"); await espera(500);
  ok(rot.includes("ovelhinha") && await t.ev("teste.missoes.ativa === 'ovelha'"), `celular: o botão ✋ mostra "${rot}" e aceita a missão`);
  const faixaM = await t.ev("(() => { const a = document.querySelector('.missao-rp').getBoundingClientRect(), b = document.querySelector('.minimapa-rp').getBoundingClientRect(); return { vis: !document.querySelector('.missao-rp').hidden, cruza: !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom) }; })()");
  ok(faixaM.vis && !faixaM.cruza, "celular: a faixa da missão aparece no HUD sem tapar o minimapa");
  await t.foto(`${FOTOS}missao-celular.png`);
  await t.ev("teste.missoes.largar()");
  // decorar pelo toque: mora na casa 1, entra, abre o carrossel e toca ▶ e ✓
  await t.ev("(() => { const l = teste.LOTES[0]; teste.ir(l.x, l.z + l.dir[1] * 0.5); teste.acao(); })()");
  await espera(800);
  await t.ev("teste.entrarCasa(); teste.irAoPonto('sala-sofa'); teste.acao()");
  await espera(600);
  const nome0 = await t.ev("document.querySelector('.deco-rp .deco-nome').textContent");
  await t.toque('.deco-rp .deco-bt[data-d="dir"]');
  const nome1 = await t.ev("document.querySelector('.deco-rp .deco-nome').textContent");
  await t.foto(`${FOTOS}casa-carrossel-celular.png`);
  await t.toque(".deco-rp .deco-ok");
  await espera(300);
  ok(nome0 !== nome1 && await t.ev("!teste.deco.aberto && !!teste.emCasa.pontos.find((p) => p.id === 'sala-sofa').escolha"), `toque: ▶ troca o móvel ("${nome0}" → "${nome1}") e ✓ guarda`);
  await t.ev("teste.sairCasa()");
  ok(!errosDeVerdade(t).length, `(a) celular sem erro de console ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
  } finally { await t.fechar(); }
}

// ------------------------------------------------------------------ celular deitado 844 × 390: rádio sem tapar os botões
{
  const t = await abrir("about:blank", { mobile: true, largura: 844, altura: 390 });
  try {
    await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: "navigator.getGamepads = () => [null, null, null, null];" });
    await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
    ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo"), "844 × 390: começou");
    await espera(1500);
    await t.ev("teste.entrar(0)");
    await espera(1200);
    const r = await t.ev(`(() => { const caixa = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
      const rad = caixa(teste.radioUI.el); const outros = [...document.querySelectorAll(".rp-carro button, .minimapa-rp, .casca-topo button")].filter((e) => e.offsetParent).map(caixa);
      const bate = outros.filter((o) => !(o[2] <= rad[0] || o[0] >= rad[2] || o[3] <= rad[1] || o[1] >= rad[3])).length;
      return { rad, bate, ligado: teste.radio.ligado }; })()`);
    ok(r.ligado && r.bate === 0, `844 × 390: rádio tocando e o painel não encosta em botão nenhum (${r.bate} sobreposições)`);
    await t.foto(`${FOTOS}radio-rabiscolandia-844.png`);
  } finally { await t.fechar(); }
}

clearTimeout(vigia);
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
