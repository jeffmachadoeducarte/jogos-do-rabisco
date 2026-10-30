// Rabiscolândia 2x maior: bairros novos, Mar Azul, Ilha da Alegria, jet ski, lancha, roda-gigante e as missões novas.
//  - orçamento de desenho nos bairros novos, na orla e na ilha (TV/computador ≤ 250 chamadas, celular ≤ 180, ≤ 350 mil tri);
//  - jet ski e lancha: andam só no mar, com o Rabisco DENTRO/sentado e do tamanho de sempre; não deixam descer na água;
//  - a pé ninguém entra no mar; a roda-gigante gira e o Rabisco dá uma volta inteira sentado na cabine;
//  - cada missão nova (da 27ª em diante em missoes-dados.js) é jogada de ponta a ponta pelo que a etapa pede
//    (teletransportando o Rabisco e os veículos, como os outros testes), sem áudio faltando.
// Fotos em .claude/tmp/cidade-dobro/.
// Uso: python3 -m http.server 8231 &  node --experimental-websocket ferramentas/teste/rabiscopolis-missoes-novas.mjs [http://localhost:8231]
//      SO_MISSOES=resgateBoia,farol para conferir só essas.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8231";
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
const FOTOS = fileURLToPath(new URL("../../.claude/tmp/cidade-dobro/", import.meta.url));
mkdirSync(FOTOS, { recursive: true });
const ANTES = 26; // missões que existiam antes da cidade crescer
let falhas = 0;
const vigia = setTimeout(() => { console.log("✗ o teste travou (o navegador caiu?)"); process.exit(2); }, 50 * 60 * 1000);
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; return Boolean(c); };
const ate = async (t, expr, ms = 40000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const PONTOS = [["Vila dos Ipês", -312, -25, 1.57], ["Bairro das Palmeiras", 312, 25, -1.57], ["Jardim das Estrelas", -150, -330, 0], ["Torres do Horizonte", 330, -330, 0.8], ["Praia do Mar Azul", -40, 262, 0], ["Ilha da Alegria", 0, 350, 0], ["praça (de antes)", 0, 33, Math.PI]];

async function abrirJogo(opcoes) {
  const t = await abrir("about:blank", opcoes);
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await ate(t, "document.readyState === 'complete'");
  await t.ev(`localStorage.clear(); ${FAMILIA}`);
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo", 90000), `carregou (${opcoes.mobile ? "celular" : "TV/computador"})`);
  await espera(2500);
  return t;
}
async function orcamento(t, max, rotulo) {
  for (const [nome, x, z, yaw] of PONTOS) {
    await t.ev(`teste.ir(${x}, ${z}); teste.olhar(${yaw})`); await espera(1300);
    const m = await t.ev("teste.medir().total");
    ok(m.calls <= max && m.tris <= 350000, `orçamento ${rotulo} em ${nome}: ${m.calls} chamadas (≤ ${max}), ${Math.round(m.tris / 1000)} mil triângulos`);
  }
}

// ---------------------------------------------------------------- TV/computador
const t = await abrirJogo({ largura: 1280, altura: 720 });
const ev = (s) => t.ev(s);
try {
  const soMissoes = Boolean(process.env.SO_MISSOES); // conferindo só algumas missões: pula o resto
  if (!soMissoes) await orcamento(t, 250, "TV/computador");
  const tipos = await ev("teste.veiculos.map((v) => v.tipo)");
  const idx = (tipo) => tipos.indexOf(tipo);
  ok(idx("jetski") >= 0 && idx("lancha") >= 0, "jet ski e lancha estacionados no píer do Mar Azul");

  if (!soMissoes) {
    // ---- a pé não entra no mar
    await ev("teste.ir(-60, 265); teste.olhar(0); teste.volante(1, 0)"); await espera(3000);
    const zPe = await ev("teste.j.pos.z"); await ev("teste.volante(null)");
    ok(zPe < 270, `a pé, o Rabisco para na beira da água (z = ${zPe.toFixed(1)}; o mar começa em 270)`);

    // ---- jet ski e lancha: só no mar, com o Rabisco dentro e do tamanho de sempre
    for (const [tipo, virar] of [["jetski", -0.3], ["lancha", 0.25]]) {
      const i = idx(tipo);
      await ev(`teste.ir(28, 262); teste.entrar(${i}); teste.volante(1, ${virar})`); await espera(3500);
      const s = await ev(`(() => { const v = teste.veiculos[${i}], rb = teste.rabisco.grupo; return { x: v.pos.x, z: v.pos.z, vel: v.vel, dentro: teste.dentro?.tipo, naAgua: teste.fis.naAguaDoMar(v.pos.x, v.pos.z, v.larg), escala: rb.scale.toArray(), noVeiculo: rb.parent === v.g, assento: v.g.userData.motorista.y }; })()`);
      ok(s.dentro === tipo && s.noVeiculo && s.escala.every((k) => Math.abs(k - 1) < 1e-6), `${tipo}: o Rabisco vai dentro (no assento), sem mudar de tamanho (escala ${s.escala.join("/")})`);
      ok(s.naAgua && Math.abs(s.vel) > 3, `${tipo}: andou no mar (${s.x.toFixed(1)}, ${s.z.toFixed(1)}), ${s.vel.toFixed(1)} m/s`);
      // foto andando: devagar (com a espuma), a câmera acompanha de lado e da frente
    await ev(`teste.volante(0.3, 0.15); teste.veiculos[${i}].vel = 3.5; window.__seguir = setInterval(() => { const v = teste.veiculos[${i}], a = v.ang, x = v.pos.x, z = v.pos.z, D = ${tipo === "lancha" ? 8.5 : 5.5}; teste.vista([x + Math.cos(a) * D + Math.sin(a) * D * 0.7, ${tipo === "lancha" ? 4.4 : 2.6}, z - Math.sin(a) * D + Math.cos(a) * D * 0.7], [x, 1, z]); }, 30)`); await espera(2000);
    await t.foto(`${FOTOS}${tipo}-andando-com-o-rabisco.png`);
    await ev("clearInterval(window.__seguir); teste.vista(null)");
      // direto contra a areia: para na costa
      await ev(`teste.posVeiculo(${i}, -100, 285, Math.PI); teste.volante(1, 0)`); await espera(3000);
      const zc = await ev(`teste.veiculos[${i}].pos.z`);
      ok(zc > 270, `${tipo}: não sobe na areia (parou em z = ${zc.toFixed(1)})`);
      await ev(`teste.volante(null); teste.veiculos[${i}].vel = 0; teste.posVeiculo(${i}, -100, 310, Math.PI / 2)`); await espera(300);
      await ev("teste.sair()"); await espera(300);
      ok((await ev("teste.dentro?.tipo ?? null")) === tipo, `${tipo}: no meio do mar não dá para descer`);
      await ev(`teste.posVeiculo(${i}, -40, ${tipo === "lancha" ? 272.2 : 271.5}, Math.PI / 2)`); await espera(300);
      await ev("teste.sair()"); await espera(300);
      const pe = await ev("[teste.dentro?.tipo ?? null, teste.j.pos.z]");
      ok(pe[0] === null && pe[1] < 270, `${tipo}: encostado na areia, o Rabisco desce em terra (z = ${pe[1].toFixed(1)})`);
      await ev(`teste.posVeiculo(${i}, ${tipo === "jetski" ? 33.6 : 21.5}, ${tipo === "jetski" ? 284 : 289}, 0)`); // volta para o píer
    }
    // Garagem do Rabifone: na areia chama, longe do mar não
    await ev("teste.ir(-80, 266)"); await espera(400);
    ok((await ev("teste.garagem('jetski')")) != null, "Rabifone: chama o jet ski na beira do mar");
    await ev("teste.ir(0, 33)"); await espera(400);
    ok((await ev("teste.garagem('lancha')")) == null, "Rabifone: longe do mar, a lancha não vem (só anda no mar)");

    // ---- roda-gigante
    await ev("teste.ir(0, 370.5)"); await espera(800);
    ok((await ev("teste.contexto")) === "🎡 Andar na roda-gigante", "na frente da roda-gigante aparece \"🎡 Andar na roda-gigante\"");
    const g0 = await ev("teste.mundo.anima.roda.giro"); await espera(1500);
    ok((await ev("teste.mundo.anima.roda.giro")) > g0, "a roda-gigante está girando");
    await ev("teste.subirRoda()"); await espera(8000);
    const r1 = await ev("({ r: teste.roda, escala: teste.rabisco.grupo.scale.toArray(), y: teste.j.pos.y })");
    ok(r1.r && r1.y > 4 && r1.escala.every((k) => Math.abs(k - 1) < 1e-6), `roda-gigante: o Rabisco subiu sentado na cabine (a ${r1.y.toFixed(1)} m), do tamanho de sempre`);
    await t.foto(`${FOTOS}roda-gigante-com-o-rabisco.png`);
    ok(await ate(t, "teste.roda === null", 40000), "roda-gigante: deu a volta inteira e desceu sozinho na plataforma");
    ok((await ev("teste.j.pos.y")) < 0.5, "roda-gigante: depois do passeio, o Rabisco está no chão");

  }
  // ---------------------------------------------------------------- missões novas
  const so = process.env.SO_MISSOES?.split(",");
  const M = (await ev(`teste.missoes.MISSOES.slice(${ANTES}).map((m) => ({ id: m.id, quem: m.quem, titulo: m.titulo, icone: m.icone, etapas: m.etapas, npcs: m.npcs }))`)).filter((m) => !so || so.includes(m.id));
  const irPerto = async (x, z, ms = 700) => {
    await ev(`(() => { if (teste.dentro) soltar(); for (const r of [1.4, 1.9, 2.5, 0.9, 3.2]) for (let a = 0; a < 6.28; a += 0.4) { const px = ${x} + Math.sin(a) * r, pz = ${z} + Math.cos(a) * r; if (!teste.fis.bate(px, pz, 0.1, 0.32)) { teste.ir(px, pz); return true; } } teste.ir(${x}, ${z}); return false; })()`);
    await espera(ms);
  };
  // desce do veículo onde estiver (barco: leva até a areia da orla antes)
  await ev(`window.soltar = () => { const v = teste.dentro; if (!v) return; v.vel = 0; const i = teste.veiculos.indexOf(v); if (["jetski", "lancha"].includes(v.tipo)) teste.posVeiculo(i, 45, v.tipo === "jetski" ? 271.4 : 272.4, Math.PI / 2); teste.sair(); if (teste.dentro) { teste.posVeiculo(i, v.pos.x, v.pos.z + 1, v.ang); teste.sair(); } }`);
  // um ponto livre para o veículo perto de (x, z): barco na água, carro fora dos prédios
  const ondePor = (tipo, x, z, max) => ev(`(() => { const i = teste.veiculos.findIndex((v) => v.tipo === "${tipo}"), v = teste.veiculos[i];
    for (let r = 2.5; r <= ${max}; r += 0.5) for (let a = 0; a < 6.28; a += 0.3) { const px = ${x} + Math.sin(a) * r, pz = ${z} + Math.cos(a) * r;
      if (!teste.fis.veiculoBate(v, px, pz, a + Math.PI / 2, [])) return [px, pz, a + Math.PI / 2]; } return null; })()`);
  const dirigirAte = async (tipo, x, z, max) => {
    const i = idx(tipo), p = await ondePor(tipo, x, z, max);
    if (!p) return false;
    if ((await ev("teste.dentro?.tipo ?? null")) !== tipo) { await ev("soltar()"); await ev(`teste.entrar(${i})`); }
    await ev(`teste.posVeiculo(${i}, ${p[0]}, ${p[1]}, ${p[2]}); teste.volante(null)`); await espera(900);
    return true;
  };
  const npc = (mid, id) => ev(`teste.missoes.npc(${JSON.stringify(mid)}, ${JSON.stringify(id)})`);
  for (const m of M) {
    const nomeM = `${m.icone} ${m.id}`;
    await ev("soltar(); teste.volante(null)");
    const q = await npc(m.id, m.quem);
    await irPerto(q.x, q.z, 1100);
    const c = await ev("teste.contexto");
    ok(c?.includes(m.titulo), `${nomeM}: perto de quem pede aparece "${c}"`);
    await ev("teste.acao()"); await espera(500);
    if (!ok((await ev("teste.missoes.ativa")) === m.id, `${nomeM}: missão aceita`)) continue;
    let travou = null;
    for (let k = 0; k < m.etapas.length && !travou; k++) {
      const E = m.etapas[k], fim = Date.now() + 75000;
      const aindaNela = () => ev(`teste.missoes.ativa === ${JSON.stringify(m.id)} && teste.missoes.etapa === ${k}`);
      while ((await aindaNela()) && Date.now() < fim) {
        if (E.tipo === "falar" || E.tipo === "levar" || E.tipo === "voltar") { const n = await npc(m.id, E.com ?? E.ate); await irPerto(n.x, n.z); await ev("teste.acao()"); await espera(600); }
        else if (E.tipo === "pegar") { for (const it of (await ev(`teste.missoes.itensDe(${JSON.stringify(m.id)})`)).filter((x) => !x.pego)) { await irPerto(it.x, it.z, 500); await ev("teste.acao()"); await espera(400); } }
        else if (E.tipo === "plantar") { for (const pl of (await ev(`teste.missoes.plantasDe(${JSON.stringify(m.id)})`)).filter((x) => !x.feito)) { await irPerto(pl.x, pl.z, 500); await ev("teste.acao()"); await espera(700); } }
        else if (E.tipo === "achar" || E.tipo === "seguirVarios") {
          const juntos = (await ev("teste.missoes.etapaInfo().juntos")) ?? [];
          for (const id of [].concat(E.bichos ?? E.quem).filter((x) => !juntos.includes(x))) { const n = await npc(m.id, id); await irPerto(n.x, n.z, 600); await ev("teste.acao()"); await espera(500); }
          const d = await npc(m.id, E.ate); await irPerto(d.x, d.z, 2500);
        } else if (E.tipo === "dirigir") {
          const p = m.npcs[E.passageiro], tipo = p.naAgua ? "lancha" : "carro", n = await npc(m.id, E.passageiro);
          if (!(await ev("teste.missoes.carona"))) { await dirigirAte(tipo, n.x, n.z, 5.5); await ate(t, "teste.missoes.carona", 4000); }
          const d = await npc(m.id, E.ate); await dirigirAte(tipo, d.x, d.z, 10); await espera(1200);
        } else if (E.tipo === "levarVeiculo") {
          const tipo = E.veiculos === "porta-malas" ? "carro" : E.veiculos.includes("lancha") ? "lancha" : E.veiculos[0];
          if (!(await ev("teste.missoes.etapaInfo().carregado"))) { const n = await npc(m.id, E.de); await dirigirAte(tipo, n.x, n.z, 8); await ate(t, "teste.missoes.etapaInfo().carregado", 4000); }
          const d = await npc(m.id, E.ate); await dirigirAte(tipo, d.x, d.z, 11); await espera(1200);
        } else if (E.tipo === "bandeiras") {
          const tipo = E.veiculos?.[0] ?? "carro", i = idx(tipo);
          if ((await ev("teste.dentro?.tipo ?? null")) !== tipo) { await ev("soltar()"); await ev(`teste.entrar(${i})`); }
          for (let b = (await ev("teste.missoes.etapaInfo().prox")) ?? 0; b < E.pontos.length; b++) { const [x, z, giro] = E.pontos[b]; await ev(`teste.posVeiculo(${i}, ${x}, ${z}, ${giro ? Math.PI / 2 : 0})`); await espera(700); }
          await espera(800);
        } else if (E.tipo === "evento" && E.evento === "roda") {
          await ev("soltar()"); await ev("teste.ir(0, 370.5)"); await espera(600); await ev("teste.subirRoda()");
          await ate(t, "teste.roda === null", 45000); await espera(500);
        } else if (E.tipo === "pistas") {
          const b = await ev("teste.missoes.etapaInfo().bau"); if (!b) { await espera(800); continue; }
          await irPerto(b.x, b.z, 600); await ev("teste.acao()"); await espera(2700);
        } else if (E.tipo === "entregar") {
          const feitas = await ev("teste.missoes.etapaInfo().entregues");
          for (const en of E.entregas.filter((x) => !feitas.includes(x.item))) { const n = await npc(m.id, en.ate); await irPerto(n.x, n.z, 800); await ev("teste.acao()"); await espera(700); }
        } else { travou = `etapa ${E.tipo} sem jogador automático`; break; }
      }
      if (!travou && (await aindaNela())) travou = `parou na etapa ${k + 1} (${E.tipo}): ${JSON.stringify(await ev("teste.missoes.texto()"))}, contexto ${await ev("teste.contexto")}`;
      if (!travou && k === 0 && m.id === "resgateBoia") { await ev("teste.vista([-30, 6, 280], [-18, 1, 266])"); await espera(700); await t.foto(`${FOTOS}missao-resgate-boia.png`); await ev("teste.vista(null)"); }
    }
    await espera(600);
    const feitas = await ev("teste.missoes.feitas");
    ok(!travou && feitas.includes(m.id) && (await ev("teste.missoes.ativa")) === null, `${nomeM}: concluída de ponta a ponta${travou ? ` — ${travou}` : ""}`);
    await ev("soltar(); teste.volante(null)");
  }
  const semVoz = t.erros.filter((e) => /assets\/voz\/rp-/.test(e));
  ok(!semVoz.length, `nenhuma fala rp-* sem MP3 durante as missões ${semVoz.slice(0, 5).join(" ; ")}`);
  const erros = t.erros.filter((e) => !/assets\/voz\/nomes\//.test(e));
  ok(!erros.length, `sem erro de console ${erros.slice(0, 4).join(" ; ")}`);
} catch (e) { ok(false, `erro no teste: ${e.message}`); }
await t.fechar();

// ---------------------------------------------------------------- celular (orçamento menor)
if (!process.env.SO_MISSOES) {
  const c = await abrirJogo({ mobile: true, largura: 1180, altura: 820 }); // o mesmo tablet deitado do rabiscopolis.mjs
  try { await orcamento(c, 180, "celular"); } catch (e) { ok(false, `erro no celular: ${e.message}`); }
  await c.fechar();
}
clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
