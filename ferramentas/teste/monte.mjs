// Rabiscolândia (Mundo Vivo, etapa 7): Monte da Oração, horizonte e balão.
//  - o lugar "monte" existe no mundo (topo, entrada), está no mapa grande com "Ir para lá" e tem figurinha no álbum;
//  - a trilha sobe andando: a física leva o Rabisco do pé da 1ª escadinha ao 1º patamar (2,4 m) só com "para a frente";
//  - chegar no topo (perto da cruz) marca o save, fala o versículo e dá a figurinha l:monte (uma vez só);
//  - as montanhas do horizonte e o balão existem, são 1 malha cada, fora da neblina, e somem no nível "baixa";
//  - o orçamento real na frente do Monte fica dentro do limite (celular ≤ 180).
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/monte.mjs [http://localhost:8097] [pasta-das-fotos]
import { abrir, espera } from "./cdp.mjs";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:8097";
const FOTOS = process.argv[3] || null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
let falhas = 0;
const vigia = setTimeout(() => { console.log("✗ o teste travou (o navegador caiu?)"); process.exit(2); }, 12 * 60 * 1000);
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 90000, passo = 250) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e));
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;

async function abrirJogo({ mobile = false, query = "" } = {}) {
  const t = await abrir("about:blank", mobile ? { mobile: true, largura: 844, altura: 390 } : { largura: 1280, altura: 720 });
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: FAMILIA });
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo${query}` });
  ok(await ate(t, "Boolean(window.teste?.vivo && window.teste.mundo && window.teste.qualidade)"), `carregou (${mobile ? "celular 844×390" : "TV/computador 1280×720"}${query})`);
  await espera(2000);
  return t;
}

// ---------- TV/computador: o lugar, a trilha, o topo, o horizonte e o balão
{
  const t = await abrirJogo();
  const M = await t.ev(`(() => { const l = teste.mundo.lugares.find((q) => q.id === "monte"); return l ? { x: l.x, z: l.z, topo: l.topo, alt: l.alturaTopo, entrada: l.entrada, novo: l.novo } : null; })()`);
  ok(M?.topo && M.alt > 10, `o Monte da Oração está no mundo: entrada (${M?.x}, ${M?.z}), topo (${M?.topo?.join(", ")}) a ${M?.alt} m`);
  // nada em cima do morro (prédio de enchimento, árvore de bosque): o único sólido alto no centro é o próprio morro
  const sobre = await t.ev(`teste.mundo.solidos.filter((s) => s.x0 > ${M.topo[0]} - 20 && s.x1 < ${M.topo[0]} + 20 && s.z0 > ${M.topo[1]} - 20 && s.z1 < ${M.topo[1]} + 20 && s.y1 >= 19).length`);
  ok(sobre === 0, `nenhum prédio de enchimento ficou em cima do morro (${sobre} sólidos de prédio dentro dele)`);
  // mapa grande: o lugar aparece na lista e o cartão tem "Ir para lá"
  await t.ev("teste.mapaUI.abrir()"); await espera(600);
  await t.ev('teste.mapaUI.selecionar("monte")'); await espera(400);
  const cartao = await t.ev(`(() => { const c = document.querySelector(".mp-cartao"); return c ? c.textContent : ""; })()`);
  ok(/Monte da Oração/.test(cartao) && /Ir para lá/.test(cartao), `mapa grande: cartão do Monte com "Ir para lá" (${cartao.replace(/\\s+/g, " ").trim().slice(0, 70)})`);
  await t.ev(`(() => { document.querySelector(".mp-ir")?.click(); })()`); await espera(500);
  const alvo = await t.ev("teste.alvoMapa ? { x: teste.alvoMapa.x, z: teste.alvoMapa.z, nome: teste.alvoMapa.nome } : null");
  ok(alvo && Math.abs(alvo.x - M.x) < 1 && Math.abs(alvo.z - M.z) < 1, `"Ir para lá" marca o destino no Monte (${JSON.stringify(alvo)})`);
  await t.ev("teste.mapaUI.fechar()"); await espera(300);
  // a trilha: do pé da 1ª escadinha (lado sul, sobe para +x) até o 1º patamar, só andando para a frente
  const subida = await t.ev(`(() => { const j = teste.j, f = teste.fis; const [ex, ez] = [${M.entrada[0]}, ${M.entrada[1]}]; j.pos.set(ex - 4.5, 0.07, ez - 2.6); j.vel.set(0, 0, 0); const y0 = j.pos.y; let n = 0;
    while (n++ < 300 && j.pos.x < ex + 2.9) f.andar(j, { ix: 0, iy: 1, pular: false, segura: false }, Math.PI / 2, 1 / 60);
    return { y0, y: j.pos.y, x: j.pos.x, z: j.pos.z, n }; })()`);
  ok(subida.y > 2.0 && subida.y < 2.5, `a trilha sobe andando: de y=${subida.y0} a y=${subida.y.toFixed(2)} (último degrau a 2,4 m) em (${subida.x.toFixed(1)}, ${subida.z.toFixed(1)}), ${subida.n} quadros`);
  // o topo: perto da cruz → versículo, save e figurinha (uma vez só)
  const antes = await t.ev('teste.album.album.tem("l:monte")');
  ok(antes === false, "antes de subir, a figurinha l:monte ainda falta");
  await espera(3500); // o aviso do presente do dia já passou: o balão fica livre para o versículo
  await t.ev(`teste.j.pos.set(${M.topo[0]} + 2.5, ${M.alt} + 0.05, ${M.topo[1]} + 2.5); teste.j.vel.set(0, 0, 0);`);
  const viuVersiculo = await ate(t, `/Salmo/.test(document.querySelector(".balao-rp")?.textContent ?? "")`, 4000, 100);
  await espera(1500);
  const chegou = await t.ev(`({ salvo: Boolean(teste.salvo.monte), fig: teste.album.album.tem("l:monte") })`);
  ok(chegou.salvo, "chegar no topo marca salvo.monte");
  ok(chegou.fig, "chegar no topo dá a figurinha l:monte do álbum");
  ok(viuVersiculo, "o balão mostra o versículo (Salmo 121) ao chegar no topo");
  if (FOTOS) { await t.ev(`teste.vista([${M.topo[0]} + 6, ${M.alt} + 3.5, ${M.topo[1]} + 9], [${M.topo[0]}, ${M.alt} + 2, ${M.topo[1]}])`); await espera(900); await t.foto(`${FOTOS}/monte-topo.png`); }
  // o horizonte e o balão: 1 malha cada, fora da neblina, e somem no nível baixa
  const ceu = await t.ev(`(() => { const c = teste.ceu; return { serra: c.serra.isMesh && c.serra.geometry.attributes.position.count > 1000, serraFog: c.serra.material.fog, balao: c.balao.isMesh, balaoFog: c.balao.material.fog, alt: c.balao.position.y, vis: [c.serra.visible, c.balao.visible] }; })()`);
  ok(ceu.serra && ceu.serraFog === false && ceu.balao && ceu.balaoFog === false, `montanhas e balão: 1 malha cada, fora da neblina (fog ${ceu.serraFog}/${ceu.balaoFog})`);
  ok(ceu.alt > 55 && ceu.alt < 75 && ceu.vis.every(Boolean), `o balão voa a ${ceu.alt.toFixed(1)} m e tudo aparece no nível alta`);
  await t.ev('teste.qualidade.definir("baixa", "api")'); await espera(400);
  const baixa = await t.ev("[teste.ceu.serra.visible, teste.ceu.balao.visible, teste.ceu.nuvens.visible]");
  ok(baixa.every((v) => v === false), `nível baixa: montanhas, balão e nuvens somem (${baixa.join(", ")})`);
  await t.ev('teste.qualidade.definir("alta", "api")'); await espera(400);
  if (FOTOS) {
    // o Monte visto da Rua do Arco-Íris (cachoeira e trilha), e a praça com o horizonte e o balão ao fundo
    await t.ev(`teste.vista([${M.x} + 40, 10, ${M.z} + 22], [${M.x} + 4, 6, ${M.z} - 22])`); await espera(900); await t.foto(`${FOTOS}/monte-frente.png`);
    await t.ev("teste.vista(null); teste.ir(0, 72); teste.vista([0, 9, 70], [0, 40, -400])"); await espera(900); await t.foto(`${FOTOS}/praca-horizonte.png`); // o céu e a serra acompanham o Rabisco: ele vai junto
    await t.ev(`teste.vista(null); teste.ir(${M.x} + 20, ${M.z} + 12); teste.hora(20.5)`); await espera(600); await t.ev(`teste.vista([${M.x} + 40, 10, ${M.z} + 22], [${M.x} + 4, 6, ${M.z} - 22])`); await espera(900); await t.foto(`${FOTOS}/monte-noite.png`);
    await t.ev("teste.hora(7); teste.vista(null)");
  }
  const erros = errosDeVerdade(t);
  ok(!erros.length, `sem erros no console (${erros.slice(0, 2).join(" | ")})`);
  await t.fechar();
}

// ---------- celular: orçamento real (com a sombra) na frente do Monte e na praça
{
  const t = await abrirJogo({ mobile: true });
  const M = await t.ev(`(() => { const l = teste.mundo.lugares.find((q) => q.id === "monte"); return { x: l.x, z: l.z }; })()`);
  for (const [nome, cmd] of [["frente do Monte", `teste.ir(${M.x} + 6, ${M.z} + 8); teste.olhar(Math.PI)`], ["praça", "teste.ir(0, 33); teste.olhar(Math.PI)"]]) {
    await t.ev(cmd); await espera(1200);
    const m = await t.ev("teste.medir()");
    ok(m.total.calls <= 180, `orçamento real no celular na ${nome}: ${m.total.calls} chamadas com sombra (≤ 180), ${Math.round(m.total.tris / 1000)} mil triângulos`);
  }
  if (FOTOS) await t.foto(`${FOTOS}/celular-praca.png`);
  await t.fechar();
}

clearTimeout(vigia);
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
