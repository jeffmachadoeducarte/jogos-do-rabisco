// Rabiscolândia: o carro da cidade (IA) NUNCA pode prender o Rabisco, de carro ou a pé.
// Bug que veio da Cidade do Rabisco: "o carro da cidade encosta e não dá mais para ir nem para frente nem para trás"
// (a colisão recusava todo passo cujo ponto de chegada estivesse dentro de algo, e o carro já estava dentro).
// Monta cenários aleatórios no jogo de verdade (IA batendo na traseira, de lado, de frente, ré contra ela, duas IAs
// prendendo, mais poste/árvore/muro/veículo estacionado encostados, com todos os veículos novos e a pé) e mede em
// TEMPO DE JOGO: depois do contato, segurar frente ou ré tem que mover > 2 m (na direção que não tem obstáculo fixo).
// Duas rodadas com sementes diferentes; as duas precisam passar 100 %.
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/carro-preso-rabiscolandia.mjs [http://localhost:8097] [cenarios por rodada]
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8097";
const N = Number(process.argv[3]) || 40;
const SO_RODADA = Number(process.env.RODADA) || 0;
const URL_JOGO = `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo`;
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 40 * 60 * 1000);
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };

const TIPOS = ["carro", "je", "onibus", "ambulancia", "sorvete", "bombeiro", "trator", "bici", "patinete", "moto"];
const CASOS = ["traseira", "lado", "frente", "re", "preso2", "dentro", "apé"];
const OBST = ["nenhum", "poste", "arvore", "muro", "estacionado"];
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---- lado da página: monta e mede um cenário
const PAGINA = `(() => {
  const T = window.teste; const fis = T.fis; const extras = []; let estac = null, estacSalvo = null;
  const rota = T.transito[0].rota; // rota "contorno" ou a primeira: usa a que tem trecho reto grande
  const lado = (dx, dz) => [dz, -dx];
  const limpar = () => {
    for (const e of extras) { const l = e.tipo === "c" ? T.mundo.circulos : T.mundo.solidos; const i = l.indexOf(e.o); if (i >= 0) l.splice(i, 1); }
    extras.length = 0;
    if (estac) { estac.pos.set(estacSalvo[0], estac.pos.y, estacSalvo[1]); estac.ang = estacSalvo[2]; estac = null; }
    T.volante(null);
  };
  const latDe = (o, v, pe, fundo) => { const r = { poste: 0.25, muro: 0.2, arvore: 0.6, estacionado: 3.5, nenhum: 0 }[o]; const L = pe ? 0.35 : v.larg + 0.05; return o === "estacionado" ? (pe ? 1 : v.comp + 1) + 0.5 : L + r - fundo * 0.4; };
  const passosDe = (v) => v.comp > 3 ? [-v.comp + 1.4, v.comp - 1.4] : v.comp < 1.6 ? [-v.comp * 0.6, v.comp * 0.6] : [-1.5, 1.5];
  const guardar = (v, ia) => ({ p: [v.pos.x, v.pos.z], a: v.ang, ia: ia.map((k) => ({ s: k.s, vel: k.vel, vAtual: k.vAtual })) });
  const T0 = () => T.tempo ?? performance.now() / 1000;
  window.__cen = {
    limpar,
    // cria o veículo do jogador e devolve o índice
    veiculo(tipo) {
      if (T.dentro) T.sair();
      T.ir(0, 33);
      for (const [x, z] of [[0, 33], [4, 33], [-4, 36], [8, 30]]) { T.ir(x, z); if (T.garagem(tipo) != null) return T.veiculos.length - 1; }
      return -1;
    },
    // monta o cenário; devolve o que precisa para medir
    montar(c) {
      limpar();
      const ia = c.n2 ? [T.transito[c.ia], T.transito[c.ia2]] : [T.transito[c.ia]];
      const k = ia[0], pts = k.rota.pts, e = c.aresta % pts.length, a = pts[e], b = pts[(e + 1) % pts.length];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / seg, dz = (b[1] - a[1]) / seg, h = Math.atan2(dx, dz), [rx, rz] = lado(dx, dz);
      const base = k.rota.acum[e] + seg * 0.5, pt = (s) => ({ x: a[0] + dx * (s - k.rota.acum[e]), z: a[1] + dz * (s - k.rota.acum[e]) });
      ia.forEach((q, i) => { q.s = base + (i ? c.d2 : 0); const p = pt(q.s); q.g.position.set(p.x, 0.03, p.z); q.g.rotation.y = h; q.vel = c.vivo ? 9 : 0; q.vAtual = c.vivo ? 9 : 0; });
      const P = pt(base);
      const pos = (u, w) => [P.x + dx * u + rx * w, P.z + dz * u + rz * w];
      let alvo, ang;
      if (c.caso === "traseira") { alvo = pos(14, 0); ang = h; }
      else if (c.caso === "lado") { alvo = pos(c.u, c.w); ang = h + c.da; }
      else if (c.caso === "frente") { alvo = pos(3.5 + c.u * 0.3, c.w * 0.3); ang = h + Math.PI; }
      else if (c.caso === "re") { alvo = pos(3.2, c.w * 0.3); ang = h; }
      else if (c.caso === "preso2") { alvo = pos(c.d2 / 2, c.w * 0.3); ang = h + c.da; }
      else { alvo = pos(c.u * 0.3, c.w * 0.3); ang = h + c.da; } // dentro / apé
      const a_pe = c.caso === "apé", v = a_pe ? null : T.veiculos[c.iv];
      if (a_pe) { if (T.dentro) T.sair(); T.ir(alvo[0], alvo[1]); }
      else { T.entrar(c.iv); T.posVeiculo(c.iv, alvo[0], alvo[1], ang); v.vel = 0; v.preso = 0; v.saida = null; }
      // o trecho tem que estar limpo de verdade (o mundo também tem postes e prédios): ±5 m na frente e atrás
      { const fx0 = a_pe ? 0 : Math.sin(v.ang), fz0 = a_pe ? 1 : Math.cos(v.ang);
        const Lc = a_pe ? 3 : v.comp + 7; for (const d of [-Lc, -Lc * 0.75, -Lc / 2, -Lc / 4, 0, Lc / 4, Lc / 2, Lc * 0.75, Lc]) { const x = alvo[0] + fx0 * d, z = alvo[1] + fz0 * d; const quem = [...T.veiculos.filter((q) => q !== v).map((q) => ({ x: q.pos.x, z: q.pos.z, raio: q.comp })), ...T.moradores.filter((m) => m.p.grupo.visible).map((m) => ({ x: m.p.grupo.position.x, z: m.p.grupo.position.z, raio: 0.5 }))];
          if (a_pe ? T.fis.bate(x, z, 0.1) || quem.some((o) => Math.hypot(o.x - x, o.z - z) < o.raio + 1) : T.fis.veiculoPen(v, x, z, v.ang, quem) > 0) return { sujo: true }; } }
      // obstáculo fixo encostado, só de um lado do eixo de movimento (frente, trás) ou ao lado
      const fx = a_pe ? 0 : Math.sin(v.ang), fz = a_pe ? 1 : Math.cos(v.ang), sx = fz, sz = -fx;
      const alcance = a_pe ? 0.5 : Math.max(...passosDe(v).map(Math.abs)) + v.larg + 0.05;
      const dist = (c.obst === "nenhum" ? 0 : alcance + (c.lado === 1 ? 0.25 : 0.2) - c.fundo);
      const sinal = c.eixo === "frente" ? 1 : c.eixo === "tras" ? -1 : 0;
      const ox = alvo[0] + fx * sinal * dist + (sinal ? 0 : sx * latDe(c.obst, v, a_pe, c.fundo)), oz = alvo[1] + fz * sinal * dist + (sinal ? 0 : sz * latDe(c.obst, v, a_pe, c.fundo));
      if (c.obst === "poste") { const o = { x0: ox - 0.25, x1: ox + 0.25, z0: oz - 0.25, z1: oz + 0.25, y0: 0, y1: 3 }; T.mundo.solidos.push(o); extras.push({ tipo: "s", o }); }
      else if (c.obst === "muro") { const o = { x0: ox - 4, x1: ox + 4, z0: oz - 0.2, z1: oz + 0.2, y0: 0, y1: 0.9 }; T.mundo.solidos.push(o); extras.push({ tipo: "s", o }); }
      else if (c.obst === "arvore") { const o = { x: ox, z: oz, r: 0.6 }; T.mundo.circulos.push(o); extras.push({ tipo: "c", o }); }
      else if (c.obst === "estacionado") { estac = T.veiculos.find((q, i) => i !== c.iv && q.tipo === "carro" && q.alt < 1.5); estacSalvo = [estac.pos.x, estac.pos.z, estac.ang]; T.posVeiculo(T.veiculos.indexOf(estac), ox, oz, v ? v.ang : 0); }
      return { ia: ia.length };
    },
    estado(c) { const v = c.caso === "apé" ? null : T.veiculos[c.iv]; const ia = (c.n2 ? [T.transito[c.ia], T.transito[c.ia2]] : [T.transito[c.ia]]); return { v, ia }; },
    // anda "seg" s de jogo com o volante dado e devolve o deslocamento líquido
    async segurar(c, acel, seg, virar = 0) {
      const v = c.caso === "apé" ? null : T.veiculos[c.iv];
      const p0 = v ? [v.pos.x, v.pos.z] : [T.j.pos.x, T.j.pos.z], t0 = T0();
      T.volante(acel, virar);
      while (T0() - t0 < seg) await new Promise((r) => setTimeout(r, 30));
      const p1 = v ? [v.pos.x, v.pos.z] : [T.j.pos.x, T.j.pos.z];
      T.volante(null);
      return Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    },
    // deixa a IA ir de verdade até a traseira do jogador parado (6 s de jogo)
    async esperar(seg) { const t0 = T0(); while (T0() - t0 < seg) await new Promise((r) => setTimeout(r, 30)); },
    snap(c) { const v = c.caso === "apé" ? null : T.veiculos[c.iv]; const ia = (c.n2 ? [T.transito[c.ia], T.transito[c.ia2]] : [T.transito[c.ia]]); return { p: v ? [v.pos.x, v.pos.z, v.ang] : [T.j.pos.x, T.j.pos.z], ia: ia.map((k) => ({ s: k.s, vel: k.vel, vAtual: k.vAtual })) }; },
    restaurar(c, s) {
      const v = c.caso === "apé" ? null : T.veiculos[c.iv];
      if (v) { T.posVeiculo(c.iv, s.p[0], s.p[1], s.p[2]); v.vel = 0; v.virar = 0; v.preso = 0; v.saida = null; } else { T.j.pos.set(s.p[0], 0.07, s.p[1]); T.j.vel.set(0, 0, 0); }
      (c.n2 ? [T.transito[c.ia], T.transito[c.ia2]] : [T.transito[c.ia]]).forEach((k, i) => { Object.assign(k, s.ia[i]); });
    },
    // a IA nunca pode ter ficado "presa" a ponto de o jogador não conseguir sair e ela nunca andar de novo (informativo)
    posIA(c) { return (c.n2 ? [T.transito[c.ia], T.transito[c.ia2]] : [T.transito[c.ia]]).map((k) => [k.g.position.x, k.g.position.z]); },
    livre(c) { const v = T.veiculos[c.iv]; return v && fis.veiculoPen ? fis.veiculoPen(v, v.pos.x, v.pos.z, v.ang, []) : 0; },
  };
  return true;
})()`;

const t = await abrir("about:blank", { largura: 960, altura: 600 });
try {
  await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: `${FAMILIA}; navigator.getGamepads = () => [null, null, null, null];` });
  await t.cmd("Page.navigate", { url: URL_JOGO });
  let pronto = false;
  for (let i = 0; i < 160 && !pronto; i++) { await espera(250); pronto = await t.ev("!!window.teste?.vivo && !!teste.mundo").catch(() => false); }
  ok(pronto, "jogo carregou");
  await espera(1500);
  await t.ev(PAGINA);
  // rota reta: usa as arestas longas da rota do primeiro carro; carros da mesma rota para o caso de 2 IAs
  const info = await t.ev(`(() => { const ts = teste.transito; const r = ts[0].rota; const idx = ts.map((k, i) => k.rota === r ? i : -1).filter((i) => i >= 0); const ar = r.pts.map((p, i) => Math.hypot(r.pts[(i + 1) % r.pts.length][0] - p[0], r.pts[(i + 1) % r.pts.length][1] - p[1])); return { idx, ar, n: r.pts.length, total: ts.length }; })()`);
  const longas = info.ar.map((d, i) => [d, i]).filter(([d]) => d > 16).map(([, i]) => i);
  ok(info.idx.length >= 2 && longas.length > 0, `cenário base: ${info.idx.length} carros da IA na mesma rota, ${longas.length} trechos retos longos`);

  for (const rodada of SO_RODADA ? [SO_RODADA] : [1, 2]) {
    const rnd = mulberry(rodada * 7919 + 13);
    const pick = (l) => l[Math.floor(rnd() * l.length)];
    let passaram = 0, puladas = 0; const falhasR = [];
    for (let n = 0; n < N; n++) {
      // garante cobertura: os primeiros cenários percorrem os tipos de veículo e os casos
      const tipo = TIPOS[n % TIPOS.length], caso = n % 7 === 6 ? "apé" : CASOS[(n * 3 + rodada) % 6];
      const obst = pick(OBST), eixo = obst === "nenhum" ? "nenhum" : pick(["frente", "tras", "lado"]);
      const c = { tipo, caso, obst, eixo, aresta: pick(longas), ia: info.idx[0], ia2: info.idx[1], n2: caso === "preso2", d2: 4 + rnd() * 2, vivo: caso === "traseira",
        u: (rnd() - 0.5) * 3, w: (rnd() - 0.5) * 3, da: pick([0, Math.PI / 2, -Math.PI / 2, Math.PI, 0.4, 2.5]), lado: rnd() < 0.5 ? 0 : 1, fundo: pick([0, 0.1, 0.3, 0.6, 0.9]) };
      if (caso === "lado") { c.w = (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 1.2); c.u = (rnd() - 0.5) * 3; }
      c.iv = caso === "apé" ? -1 : await t.ev(`__cen.veiculo(${JSON.stringify(tipo)})`);
      if (caso !== "apé" && c.iv < 0) { falhasR.push(`#${n} ${tipo}: não consegui criar o veículo`); continue; }
      { let m = await t.ev(`__cen.montar(${JSON.stringify(c)})`); for (let q = 0; q < 40 && m?.sujo; q++) { c.aresta = pick(longas); c.ia = info.idx[q % info.idx.length]; c.ia2 = info.idx[(q + 1) % info.idx.length]; m = await t.ev(`__cen.montar(${JSON.stringify(c)})`); } if (m?.sujo) { puladas++; continue; } }
      if (process.env.CASO && n !== Number(process.env.CASO)) continue;
      if (process.env.CASO) { for (let q = 0; q < 12; q++) { const r = await t.ev(`(async () => { const d = await __cen.segurar(${JSON.stringify(c)}, 1, 0.25); const v = teste.veiculos[${c.iv}]; return [d, v.pos.x, v.pos.z, v.ang, v.vel, v.preso, !!v.saida, __cen.livre(${JSON.stringify(c)})]; })()`); console.log(JSON.stringify(r)); } console.log(await t.ev(`(() => { const v = teste.veiculos[${c.iv}]; const f = teste.fis; return JSON.stringify([-0.3,-0.15,0,0.15,0.3].map((d) => f.veiculoPen(v, v.pos.x + Math.sin(v.ang) * d, v.pos.z + Math.cos(v.ang) * d, v.ang, []))); })()`)); console.log(await t.ev(`JSON.stringify(teste.mundo.solidos.slice(-1).concat(teste.mundo.circulos.slice(-1)))`)); }
      if (caso === "traseira") await t.ev(`__cen.esperar(7)`); // a IA chega e freia na traseira
      const s = await t.ev(`__cen.snap(${JSON.stringify(c)})`);
      const preso0 = caso === "apé" ? 0 : await t.ev(`__cen.livre(${JSON.stringify(c)})`);
      const f = await t.ev(`__cen.segurar(${JSON.stringify(c)}, 1, 3.5)`);
      await t.ev(`__cen.restaurar(${JSON.stringify(c)}, ${JSON.stringify(s)})`);
      const r = await t.ev(`__cen.segurar(${JSON.stringify(c)}, -1, 3.5)`);
      await t.ev("__cen.limpar()");
      // o que se espera: só a direção do obstáculo fixo pode ficar travada; a pé basta uma das duas
      let bom;
      if (caso === "apé") bom = Math.max(f, r) > 2;
      else if (eixo === "frente") bom = r > 2;
      else if (eixo === "tras") bom = f > 2;
      else if (eixo === "lado") bom = Math.max(f, r) > 2; // encostado de lado (quina de poste/árvore): sai por um dos sentidos
      else bom = f > 2 && r > 2;
      if (bom) passaram++; else falhasR.push(`#${n} ${tipo} ${caso} obst=${obst}/${eixo}: frente ${f.toFixed(1)} m, ré ${r.toFixed(1)} m (sobreposição inicial ${Number(preso0).toFixed(2)}) ${process.env.DEPURAR ? JSON.stringify(c) : ""}`);
    }
    ok(passaram === N - puladas && N - puladas >= 30, `rodada ${rodada}: ${passaram}/${N - puladas} cenários (${puladas} sem trecho limpo no mapa, trocados) (frente/ré movem > 2 m em tempo de jogo depois do contato) ${falhasR.slice(0, 6).join(" | ")}`);
  }
  ok(!t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e)).length, `sem erro de console ${t.erros.slice(0, 3).join(" ; ")}`);
} finally { await t.fechar(); }
clearTimeout(vigia);
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
