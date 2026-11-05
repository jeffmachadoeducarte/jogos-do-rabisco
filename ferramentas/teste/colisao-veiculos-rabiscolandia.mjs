// Rabiscolândia: o veículo do jogador não atravessa os outros (carro do trânsito e veículo estacionado) e o trânsito
// nunca prende o jogador. Mede, no jogo de verdade, a menor distância entre a lataria do veículo do jogador e a do outro
// durante a batida (precisa ficar >= -0,12 m: encosta e para, sem entrar), e que depois dá para ir embora.
// Casos: (1) jogador bate na traseira de um carro do trânsito parado; (2) de frente (o trânsito cede, dando ré);
// (3) contra um veículo estacionado (precisa parar rente, sem quicar); (4) helicóptero rente ao chão contra um estacionado,
// e no ar passando por cima (não bate); (5) jogador já nasce sobreposto ao carro do trânsito e consegue sair.
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/colisao-veiculos-rabiscolandia.mjs [http://localhost:8097] (TIPO=fusca|f1 para os carros novos)
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8097";
const TIPO = process.env.TIPO || "carro"; // TIPO=fusca ou TIPO=f1 testa os carros novos da Garagem
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 10 * 60 * 1000);
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };

const t = await abrir("about:blank", { largura: 960, altura: 600 });
try {
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: `${FAMILIA}; navigator.getGamepads = () => [null, null, null, null];` });
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo` });
  let pronto = false;
  for (let i = 0; i < 160 && !pronto; i++) { await espera(250); pronto = await t.ev("!!window.teste?.vivo && !!teste.mundo").catch(() => false); }
  ok(pronto, "jogo carregou");
  await espera(1500);
  await t.ev(`(() => {
    const T = teste, fis = T.fis;
    const caixa = (x, z, ang, hl, hw) => ({ x, z, raio: hl, caixa: { ang, hl, hw } });
    const meu = () => T.dentro;
    // procura um trecho reto e limpo da rota do trânsito (60 m) onde dá para montar o cenário
    const trecho = () => {
      const k = T.transito[0], pts = k.rota.pts;
      for (let e = 0; e < pts.length; e++) {
        const a = pts[e], b = pts[(e + 1) % pts.length], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (seg < 50) continue;
        const dx = (b[0] - a[0]) / seg, dz = (b[1] - a[1]) / seg, cx = a[0] + dx * seg / 2, cz = a[1] + dz * seg / 2;
        return { k, e, dx, dz, cx, cz, h: Math.atan2(dx, dz), base: k.rota.acum[e] + seg / 2 };
      }
      return null;
    };
    window.__col = {
      trecho,
      criar(tipo) { if (T.dentro) T.sair(); T.ir(0, 33); for (const [x, z] of [[0, 33], [4, 33], [-4, 36], [8, 30]]) { T.ir(x, z); if (T.garagem(tipo) != null) return T.veiculos.length - 1; } return -1; },
      // solta o carro do trânsito parado no meio do trecho
      // (os outros carros do trânsito são levados para longe e ficam parados: eles são testados no cenário do sanduíche)
      parar(c) { for (const q of T.transito) if (q !== c.k) { q.s = c.base + q.rota.total / 2 + 30; q.vel = 0; q.vAtual = 0; q.fantasma = 0; q.g.position.set(1e4, 0.03, 1e4); } c.k.s = c.base; c.k.vel = 0; c.k.vAtual = 0; c.k.fantasma = 0; c.k.g.position.set(c.cx, 0.03, c.cz); c.k.g.rotation.y = c.h; },
      // dirige segurando acelerador (1 frente, -1 ré) por até "seg" s e devolve o menor vão visto
      async dirigir(iv, outroFn, acel, seg, ate = false, meta = 0) {
        const v = T.veiculos[iv]; let min = 99, ultimo = null, t0 = performance.now(), p0 = [v.pos.x, v.pos.z], vmax = 0, parados = 0, tj0 = T.estat.tj ?? 0;
        T.volante(acel, 0);
        while (performance.now() - t0 < seg * 1000) {
          const o = outroFn(); const g = fis.folgaAte(v, o); if (g < min) min = g; vmax = Math.max(vmax, Math.abs(v.vel));
          if (meta && Math.hypot(v.pos.x - p0[0], v.pos.z - p0[1]) > meta) break; // já andou o que precisava
          if (ate && g < 0.6 && Math.abs(v.vel) < 0.4) { if (++parados > 30) break; } else parados = 0; // encostou e parou: acabou
          await new Promise((r) => setTimeout(r, 16));
        }
        T.volante(0, 0);
        const o = outroFn();
        return { min, vel: v.vel, tj: +(T.estat.tj - tj0).toFixed(1), vao: fis.folgaAte(v, o), andou: Math.hypot(v.pos.x - p0[0], v.pos.z - p0[1]) };
      },
    };
    return true;
  })()`);

  // ---- (1) traseira de um carro do trânsito parado
  {
    const iv = await t.ev(`__col.criar(${JSON.stringify(TIPO)})`);
    ok(iv >= 0, `${TIPO} do jogador criado`);
    const c = await t.ev(`JSON.stringify(__col.trecho())`).then((s) => JSON.parse(s));
    await t.ev(`(() => { const c = __col.trecho(); __col.parar(c); T = teste; T.entrar(${iv}); T.posVeiculo(${iv}, c.cx - c.dx * 20, c.cz - c.dz * 20, c.h); const v = T.veiculos[${iv}]; v.vel = 0; v.preso = 0; v.saida = null; })()`);
    const outro = `(() => { const k = teste.transito[0]; return { x: k.g.position.x, z: k.g.position.z, raio: 2.4, caixa: { ang: k.g.rotation.y, hl: 2.3, hw: 1.1 } }; })`;
    const r = await t.ev(`(async () => { const c = __col.trecho(); const f = ${outro}; return await __col.dirigir(${iv}, f, 1, 100, true); })()`);
    ok(r.min >= -0.12, `traseira do trânsito: não entrou (menor vão ${r.min.toFixed(2)} m)`);
    ok(r.vao < 1.5 && Math.abs(r.vel) < 1.5, `traseira do trânsito: parou rente (vão ${r.vao.toFixed(2)} m, vel ${r.vel.toFixed(2)})`);
    const re = await t.ev(`(async () => { const f = ${outro}; return await __col.dirigir(${iv}, f, -1, 60, false, 3); })()`);
    ok(re.andou > 2, `traseira do trânsito: dá ré e sai (andou ${re.andou.toFixed(1)} m)`);
  }
  // ---- (2) de frente: o trânsito cede
  {
    const iv = await t.ev(`T = teste, T.veiculos.length - 1`);
    await t.ev(`(() => { const c = __col.trecho(); __col.parar(c); const v = teste.veiculos[${iv}]; teste.posVeiculo(${iv}, c.cx + c.dx * 16, c.cz + c.dz * 16, c.h + Math.PI); v.vel = 0; v.preso = 0; v.saida = null; })()`);
    const outro = `(() => { const k = teste.transito[0]; return { x: k.g.position.x, z: k.g.position.z, raio: 2.4, caixa: { ang: k.g.rotation.y, hl: 2.3, hw: 1.1 } }; })`;
    const s0 = await t.ev(`teste.transito[0].s`);
    const r = await t.ev(`(async () => await __col.dirigir(${iv}, ${outro}, 1, 100, true))()`);
    const s1 = await t.ev(`teste.transito[0].s`);
    ok(r.min >= -0.12, `de frente: não entrou no carro do trânsito (menor vão ${r.min.toFixed(2)} m)`);
    ok(s1 < s0 - 0.5, `de frente: o trânsito cedeu dando ré (${(s0 - s1).toFixed(1)} m)`);
    const re = await t.ev(`(async () => await __col.dirigir(${iv}, ${outro}, -1, 60, false, 3))()`);
    ok(re.andou > 2, `de frente: dá ré e sai (andou ${re.andou.toFixed(1)} m)`);
  }
  // ---- (6) sanduíche: parado entre dois carros do trânsito (um na frente, um atrás), ambos encostados: não pode prender
  {
    const iv = await t.ev(`teste.veiculos.length - 1`);
    const antes = await t.ev(`(() => { const c = __col.trecho(); __col.parar(c); const B = teste.transito.find((q) => q !== c.k && q.rota === c.k.rota); if (!B) return null; B.s = c.base - 10.4; B.vel = 0; B.vAtual = 0; const v = teste.veiculos[${iv}]; teste.posVeiculo(${iv}, c.cx - c.dx * 5.2, c.cz - c.dz * 5.2, c.h); v.vel = 0; v.preso = 0; v.saida = null; return [v.pos.x, v.pos.z]; })()`);
    ok(Boolean(antes), "sanduíche: dois carros do trânsito na mesma rota");
    const r = await t.ev(`(async () => await __col.dirigir(${iv}, () => { const k = teste.transito[0]; return { x: k.g.position.x, z: k.g.position.z, raio: 2.4, caixa: { ang: k.g.rotation.y, hl: 2.3, hw: 1.1 } }; }, 1, 100, false, 3))()`);
    ok(r.andou > 2, `sanduíche entre dois carros do trânsito: não prende (andou ${r.andou.toFixed(1)} m em ${r.tj} s de jogo)`);
  }
  // ---- (5) nasce sobreposto: tem que conseguir sair
  {
    const iv = await t.ev(`teste.veiculos.length - 1`);
    await t.ev(`(() => { const c = __col.trecho(); __col.parar(c); const v = teste.veiculos[${iv}]; teste.posVeiculo(${iv}, c.cx + c.dx * 0.8, c.cz + c.dz * 0.8, c.h + 0.3); v.vel = 0; v.preso = 0; v.saida = null; })()`);
    const p0 = await t.ev(`[teste.dentro.pos.x, teste.dentro.pos.z]`);
    const r = await t.ev(`(async () => await __col.dirigir(${iv}, () => ({ x: 1e5, z: 1e5, caixa: { ang: 0, hl: 1, hw: 1 } }), 1, 60, false, 3))()`);
    ok(r.andou > 2, `sobreposto ao trânsito: consegue sair (andou ${r.andou.toFixed(1)} m)`);
    await t.ev(`(() => { teste.sair(); })()`);
  }
  // ---- (3) estacionado: usa o primeiro veículo parado do mundo, levado para um lugar livre
  {
    const livre = await t.ev(`(() => { const T = teste; for (let x = -160; x <= 160; x += 8) for (let z = -160; z <= 160; z += 8) { let ok = true; for (let a = 0; a < 6.3 && ok; a += 0.4) for (const r of [4, 8, 14, 22]) if (T.fis.bate(x + Math.cos(a) * r, z + Math.sin(a) * r, 0.1, 1.5)) ok = false; if (ok && T.veiculos.every((v) => Math.hypot(v.pos.x - x, v.pos.z - z) > 30)) return [x, z]; } return null; })()`);
    ok(Boolean(livre), `lugar livre para o teste: ${livre}`);
    const [lx, lz] = livre;
    const iv = await t.ev(`teste.veiculos.length - 1`);
    await t.ev(`(() => { const p = teste.veiculos.find((v, i) => i !== ${iv}); window.__park = p; if (teste.dentro) teste.sair(); teste.entrar(${iv}); teste.posVeiculo(teste.veiculos.indexOf(p), ${lx}, ${lz}, 0.6); teste.posVeiculo(${iv}, ${lx} - Math.sin(0.6) * 16, ${lz} - Math.cos(0.6) * 16, 0.6); const v = teste.veiculos[${iv}]; v.vel = 0; v.preso = 0; v.saida = null; })()`);
    const outro = `(() => { const p = window.__park; return { x: p.pos.x, z: p.pos.z, raio: p.comp, caixa: { ang: p.ang, hl: p.comp, hw: p.larg } }; })`;
    const r = await t.ev(`(async () => await __col.dirigir(${iv}, ${outro}, 1, 100, true))()`);
    ok(r.min >= -0.12, `estacionado: não entrou (menor vão ${r.min.toFixed(2)} m)`);
    ok(Math.abs(r.vel) < 1.5 && r.vao < 1.5, `estacionado: parou rente, sem quicar (vão ${r.vao.toFixed(2)} m, vel ${r.vel.toFixed(2)})`);
    const re = await t.ev(`(async () => await __col.dirigir(${iv}, ${outro}, -1, 60, false, 3))()`);
    ok(re.andou > 2, `estacionado: dá ré e sai (andou ${re.andou.toFixed(1)} m)`);
    // ---- (4) helicóptero: no chão bate, no ar passa por cima
    await t.ev(`(() => { teste.sair(); })()`);
    const ih = await t.ev(`(() => { for (const [x, z] of [[0, 0], [3, 0], [-3, 3], [6, -3]]) { teste.ir(${lx} + 14 + x, ${lz} + z); if (teste.garagem("heli") != null) return teste.veiculos.length - 1; } return -1; })()`);
    ok(ih >= 0, "helicóptero criado");
    await t.ev(`(() => { const h = teste.veiculos[${ih}], p = window.__park; teste.entrar(${ih}); teste.posVeiculo(${ih}, p.pos.x - Math.sin(1.2) * 14, p.pos.z - Math.cos(1.2) * 14, 1.2); h.alt = teste.chaoHeli(h.pos.x, h.pos.z) + 0.3; h.vs = 0; h.vel = 0; })()`);
    const outroH = `(() => { const p = window.__park; return { x: p.pos.x, z: p.pos.z, raio: p.comp, caixa: { ang: p.ang, hl: p.comp, hw: p.larg } }; })`;
    const rh = await t.ev(`(async () => { const h = teste.veiculos[${ih}]; let min = 99; teste.volante(1, 0); const t0 = performance.now(); let par = 0; while (performance.now() - t0 < 40000) { const g = teste.fis.folgaAte(h, ${outroH}()); if (g < min) min = g; if (g < 0.8 && Math.abs(h.vel) < 0.3) { if (++par > 40) break; } else par = 0; await new Promise((r) => setTimeout(r, 16)); } teste.volante(0, 0); return { min, alt: h.alt }; })()`);
    ok(rh.alt < 1.5 && rh.min >= -0.2, `helicóptero no chão: bate no estacionado e para (menor vão ${rh.min.toFixed(2)} m)`);
    await t.ev(`(() => { const h = teste.veiculos[${ih}], p = window.__park; teste.posVeiculo(${ih}, p.pos.x - Math.sin(1.2) * 14, p.pos.z - Math.cos(1.2) * 14, 1.2); h.vel = 0; })()`);
    const ra = await t.ev(`(async () => { const h = teste.veiculos[${ih}], p = window.__park; teste.voar(true); const t0 = performance.now(); while (performance.now() - t0 < 40000 && h.alt < 6) await new Promise((r) => setTimeout(r, 30)); teste.voar(false); teste.volante(1, 0); const t1 = performance.now(); let passou = false; while (performance.now() - t1 < 40000 && !passou) { const ex = (h.pos.x - p.pos.x), ez = (h.pos.z - p.pos.z); if (Math.hypot(ex, ez) < 1.5) passou = true; await new Promise((r) => setTimeout(r, 16)); } teste.volante(0, 0); return { passou, alt: h.alt }; })()`);
    ok(ra.passou && ra.alt > 3, `helicóptero no ar: passa por cima do estacionado (alt ${ra.alt.toFixed(1)} m)`);
  }
  ok(!t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e)).length, `sem erro de console ${t.erros.slice(0, 3).join(" ; ")}`);
} finally { await t.fechar(); }
clearTimeout(vigia);
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
