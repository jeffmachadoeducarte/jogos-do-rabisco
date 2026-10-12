// Super Rabisco: confere, nas 10 fases, que tudo que o jogador precisa alcançar (letras, moedas, caixas) dá para alcançar
// com folga de 15% usando o pulo normal, inclusive com toque rápido (celular).
// 1) mede no jogo (window.teste, física real em passo fixo) a altura do pulo segurando e com toques de 8, 42 e 83 ms;
// 2) monta os "pisos" (topos de blocos, canos, degraus, pirâmide) e vê o que se alcança partindo do chão, subindo no máximo (pulo de toque / 1,15);
// 3) confere que cada letra e cada moeda fica ao alcance de algum piso alcançável e que nenhuma letra está dentro de um sólido.
// Uso: node --experimental-websocket ferramentas/teste/super-rabisco-alcance.mjs [http://localhost:8087]
import { abrir, espera } from "./cdp.mjs";
const BASE = process.argv[2] || "http://localhost:8087";
const FOLGA = 1.15, ALT_J = 2.3;
let falhas = 0;
const falha = (m) => { falhas++; console.log("   ✗", m); };

const medir = `(() => {
  const T = window.teste, j = T.j, e = T.entrada, P = T.PASSO;
  const salvo = { ...j }, ex = T.FASE.inicio;
  const alturas = {};
  for (const [nome, passos] of [["segurando", 1e9], ["toque8ms", 1], ["toque42ms", 5], ["toque83ms", 10]]) {
    Object.assign(j, { x: ex, y: 0, vx: 0, vy: 0, noChao: true, coyote: 0, buffer: 0 });
    e.dir = e.esq = e.pulo = e.puloNovo = false;
    T.mover(P); T.mover(P);
    let max = 0, n = 0;
    e.pulo = true; e.puloNovo = true;
    do { if (n >= passos) e.pulo = false; T.mover(P); n++; max = Math.max(max, j.y); } while ((!j.noChao || n < 3) && n < 2000);
    alturas[nome] = max;
  }
  e.pulo = false; Object.assign(j, salvo);
  return alturas;
})()`;

const t = await abrir("about:blank");
for (let fase = 1; fase <= 10; fase++) {
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/super-rabisco-letras/?teste&jogar&fase=${fase}&nivel=1` });
  let ok = false;
  for (let i = 0; i < 40 && !ok; i++) { await espera(500); ok = await t.ev(`window.teste?.estado === "jogando"`).catch(() => false); }
  if (!ok) { falha(`fase ${fase}: o jogo não começou`); continue; }
  const h = await t.ev(medir);
  const dados = await t.ev(`({ s: window.teste.solidos.map(({x0,x1,y0,y1}) => [x0,x1,y0,y1]), m: window.teste.FASE.moedas, l: window.teste.letras.map((l) => [l.x - 0.5, l.y - 0.5]), fim: window.teste.FASE.fim })`);
  const L = h.toque83ms / FOLGA;     // quanto se pode subir de uma vez, com folga e com toque rápido
  console.log(`Fase ${fase}: pulo segurando ${h.segurando.toFixed(2)}, toque 8ms ${h.toque8ms.toFixed(2)}, 42ms ${h.toque42ms.toFixed(2)}, 83ms ${h.toque83ms.toFixed(2)} blocos; sobe até ${L.toFixed(2)} com folga`);
  if (h.toque8ms < 3 * FOLGA) falha(`fase ${fase}: toque de 8ms sobe só ${h.toque8ms.toFixed(2)} (precisa ${(3 * FOLGA).toFixed(2)} para a maior caixa, 3)`);
  // pisos: chão + topo de cada sólido do mundo principal
  const sol = dados.s.filter(([x0, x1, y0, y1]) => x1 < dados.fim + 1 && x0 > -1 && y1 < 40 && y0 >= 0);
  // blocos empilhados: o topo de baixo fica coberto pelo de cima (não é piso)
  const coberto = ([x0, x1, , y1]) => sol.some(([a, b, c]) => c === y1 && a < x1 - 0.01 && b > x0 + 0.01);
  const pisos = [{ x0: -1, x1: dados.fim, top: 0, ok: true }, ...sol.filter((s) => !coberto(s)).map(([x0, x1, , y1]) => ({ x0, x1, top: y1, ok: false }))];
  // piso é válido se não houver sólido logo acima (cabe a altura do Rabisco)
  const livre = (p) => !sol.some(([x0, x1, y0, y1]) => x0 < p.x1 - 0.01 && x1 > p.x0 + 0.01 && y0 < p.top + ALT_J - 0.01 && y1 > p.top + 0.01 && y0 >= p.top - 0.01);
  for (let mudou = true; mudou;) {
    mudou = false;
    for (const b of pisos) if (!b.ok && livre(b)) {
      if (pisos.some((a) => a.ok && a.x0 <= b.x1 + 0.01 && a.x1 >= b.x0 - 0.01 && b.top - a.top <= L + 1e-9 && !(a.top >= b.top && false))) { b.ok = true; mudou = true; }
    }
    // descer: do piso alto para o vizinho mais baixo (sem limite)
  }
  const ruins = pisos.filter((p) => !p.ok && p.top > 0);
  const alcanca = ([x, y], margem = 0) => pisos.some((p) => p.ok && x > p.x0 - 0.9 && x < p.x1 + 0.9 && y >= p.top - 0.5 && y <= p.top + ALT_J + 0.5 + L - margem);
  for (const [x, y] of dados.l) {
    if (sol.some(([x0, x1, y0, y1]) => x > x0 - 0.1 && x < x1 + 0.1 && y > y0 - 0.1 && y < y1 + 0.1)) falha(`fase ${fase}: letra em ${x.toFixed(1)},${y.toFixed(1)} dentro de um bloco`);
    else if (!alcanca([x, y])) falha(`fase ${fase}: letra em ${x.toFixed(1)},${y.toFixed(1)} fora de alcance`);
  }
  for (const [x, y] of dados.m) if (!alcanca([x, y])) falha(`fase ${fase}: moeda em ${x},${y} fora de alcance`);
  // a pirâmide e o mastro precisam ser alcançáveis
  const mastro = pisos.find((p) => p.top === 1 && p.ok);
  if (!mastro) falha(`fase ${fase}: sem piso alcançável perto do mastro`);
  // toda caixa/bloco visível que não dá para escalar é falha, menos as caixas "?" altas (só de bater por baixo)
  for (const p of ruins) if (p.top < 9) falha(`fase ${fase}: topo em ${p.x0}-${p.x1}, altura ${p.top}, impossível de subir`);
  if (t.erros.length) { falha(`fase ${fase}: erros no console ${t.erros.slice(0, 2).join(" | ")}`); t.erros.length = 0; }
}
await t.fechar();
console.log(falhas ? `FALHOU: ${falhas} problema(s)` : "OK: as 10 fases estão alcançáveis com folga de 15%");
process.exit(falhas ? 1 : 0);
