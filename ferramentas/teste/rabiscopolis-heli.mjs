// Helicóptero da Rabiscolândia sobrevoa o que está abaixo dele: bem alto passa por cima de um prédio, baixo bate nele,
// pousa no telhado sem entrar no prédio, e quem sai do helicóptero no telhado desce para o chão (não fica preso).
// O carro continua batendo no mesmo prédio. Chrome mudo (--mute-audio, cdp.mjs).
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/rabiscopolis-heli.mjs [http://localhost:8097]
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8097";
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 5 * 60 * 1000);
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 15000, passo = 150) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e));

const t = await abrir("about:blank", { largura: 1280, altura: 720 });
try {
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await ate(t, "document.readyState === 'complete'");
  await t.ev(`localStorage.clear(); ${FAMILIA}`);
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo", 40000), "o jogo carregou");
  await espera(1500);

  // prédio de teste: com altura real (topo) e um corredor reto, de lado a lado, sem mais nada no caminho
  const alvo = await t.ev(`(() => {
    const S = teste.mundo.solidos, R = 2.6;
    for (const s of S) {
      if (!s.topo || s.topo < 8 || s.topo > 30 || s.x1 - s.x0 < 6 || s.x1 - s.x0 > 30 || Math.abs(s.x0) > 300 || Math.abs(s.z0) > 300) continue;
      const z = (s.z0 + s.z1) / 2, xa = s.x0 - 26, xb = s.x1 + 14;
      const limpo = S.every((o) => o === s || (o.topo ?? o.y1) < 0.3 || !(o.x1 > xa - R && o.x0 < xb + R && o.z1 > z - R - 1 && o.z0 < z + R + 1));
      if (limpo) return { x0: s.x0, x1: s.x1, z0: s.z0, z1: s.z1, z, topo: s.topo, y1: s.y1, xa, xb };
    }
    return null;
  })()`);
  ok(!!alvo, `achou um prédio com corredor livre: ${JSON.stringify(alvo)}`);
  if (!alvo) throw new Error("sem prédio de teste");
  ok(alvo.topo < alvo.y1, `a altura real (${alvo.topo.toFixed(1)}) é menor que o y1 de folga (${alvo.y1})`);

  const iheli = await t.ev("teste.veiculos.findIndex((v) => v.tipo === 'heli')");
  ok(iheli >= 0, "há helicóptero na cidade");
  const voo = async (alt, ms = 20000) => {
    await t.ev("teste.sair?.(); 0").catch(() => {});
    await t.ev(`(() => { const v = teste.veiculos[${iheli}]; if (teste.dentro) { teste.dentro.vel = 0; teste.sair(); } v.pos.set(${alvo.xa}, ${alt}, ${alvo.z}); v.alt = ${alt}; v.ang = Math.PI / 2; v.vel = 0; v.vs = 0; v.rotor = 1; teste.ir(${alvo.xa}, ${alvo.z + 6}); teste.entrar(${iheli}); v.pos.set(${alvo.xa}, ${alt}, ${alvo.z}); v.alt = ${alt}; v.ang = Math.PI / 2; v.vel = 0; v.rotor = 1; })()`);
    await t.ev("teste.volante(1, 0)");
    const passou = await ate(t, `teste.dentro && teste.dentro.pos.x > ${alvo.x1 + 4}`, ms, 100);
    const x = await t.ev("teste.dentro.pos.x");
    await t.ev("teste.volante(null)");
    return { passou, x };
  };

  // (a) bem alto: atravessa o prédio e sai do outro lado
  const alto = await voo(alvo.topo + 4);
  ok(alto.passou, `(a) helicóptero alto passou por cima do prédio (x final ${alto.x.toFixed(1)}, prédio ${alvo.x0.toFixed(1)}..${alvo.x1.toFixed(1)})`);

  // (b) baixo, mesmo trajeto: bate e não passa
  const baixo = await voo(2, 9000);
  ok(!baixo.passou && baixo.x < alvo.x0, `(b) helicóptero baixo foi bloqueado (x final ${baixo.x.toFixed(1)} < ${alvo.x0.toFixed(1)})`);

  // (c) descer sobre o prédio: para no topo, não entra nele
  await t.ev(`(() => { const v = teste.dentro; v.pos.set(${(alvo.x0 + alvo.x1) / 2}, ${alvo.topo + 5}, ${alvo.z}); v.alt = ${alvo.topo + 5}; v.vel = 0; v.vs = 0; })()`);
  await t.ev("teste.voar(false, true)");
  await espera(6000);
  await t.ev("teste.voar(false, false)");
  const d = await t.ev("({ alt: teste.dentro.alt, y: teste.dentro.pos.y, chao: teste.chaoHeli(teste.dentro.pos.x, teste.dentro.pos.z) })");
  ok(d.alt >= alvo.topo - 0.02 && d.alt < alvo.topo + 0.5, `(c) desceu e parou no topo do prédio (alt ${d.alt.toFixed(2)}, topo ${alvo.topo.toFixed(2)})`);
  ok(d.y >= alvo.topo - 0.02, "(c) o helicóptero não ficou dentro do prédio");

  // (d) sair no telhado: o Rabisco vai para o chão, fora do prédio, e fica livre
  await t.ev("teste.volante(null); teste.dentro.vel = 0");
  await t.ev("teste.sair()");
  ok(await ate(t, "!teste.dentro", 3000), "(d) saiu do helicóptero sobre o prédio");
  await espera(1500);
  const p = await t.ev(`({ x: teste.j.pos.x, y: teste.j.pos.y, z: teste.j.pos.z, preso: teste.fis.bate(teste.j.pos.x, teste.j.pos.z, teste.j.pos.y), dentroPredio: teste.fis.bate(teste.j.pos.x, teste.j.pos.z, 0.1, 0) })`);
  ok(!p.preso && !p.dentroPredio && p.y < 1, `(d) o Rabisco não ficou preso (x ${p.x.toFixed(1)}, y ${p.y.toFixed(2)}, z ${p.z.toFixed(1)})`);
  await t.ev("teste.voar(false, false)");

  // (e) carro: mesmo prédio continua bloqueando
  const ic = await t.ev("teste.veiculos.findIndex((v) => v.tipo === 'carro')");
  await t.ev(`(() => { teste.posVeiculo(${ic}, ${alvo.xa}, ${alvo.z}, Math.PI / 2); teste.entrar(${ic}); teste.posVeiculo(${ic}, ${alvo.xa}, ${alvo.z}, Math.PI / 2); teste.volante(1, 0); })()`);
  const carroPassou = await ate(t, `teste.dentro && teste.dentro.pos.x > ${alvo.x0}`, 9000, 100);
  const cx = await t.ev("teste.dentro.pos.x");
  await t.ev("teste.volante(null)");
  ok(!carroPassou && cx < alvo.x0, `(e) carro bloqueado pelo mesmo prédio (x final ${cx.toFixed(1)} < ${alvo.x0.toFixed(1)})`);

  const err = errosDeVerdade(t);
  ok(err.length === 0, `(f) sem erro de console (${err.length}) ${err.slice(0, 3).join(" | ")}`);
} catch (e) {
  console.log("✗ erro:", e.message); falhas++;
} finally {
  clearTimeout(vigia);
  await t.fechar?.();
}
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
