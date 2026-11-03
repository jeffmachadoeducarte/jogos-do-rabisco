// Rabiscolândia: a placa do @ na fachada das 12 parceiras. Confere o texto (igual a src/parceiros.js, sem cortar) e fotografa da
// rua com a câmera real do jogo: o jogador no meio da rua, de frente para o prédio.
// Uso: node --experimental-websocket ferramentas/teste/rabiscolandia-placas.mjs <http://localhost:porta> <pasta> [ids...]
// Variáveis: TAM=1280x720 · MOBILE=1 · RECUO=9 (metros do ponto da parceira até o jogador) · ANGULO=0 (de lado, em radianos) · HORA=11
import { mkdirSync } from "node:fs";
import { abrir, espera } from "./cdp.mjs";

const [BASE = "http://localhost:8743", PASTA = "/tmp/placas", ...IDS] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const [L, A] = (process.env.TAM ?? "1280x720").split("x").map(Number);
const RECUO = Number(process.env.RECUO ?? 9), ANGULO = Number(process.env.ANGULO ?? 0), HORA = Number(process.env.HORA ?? 11);
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const OCULTA = `(() => { const s = document.createElement("style"); s.textContent = ".cena-rp > *:not(canvas), canvas.minimapa-rp, .casca-redondo, .pausa-botao, .engrenagem-pausa, [class*='radio'], .casca-topo, .casca-dica, .casca-aviso, .casca-balao { display: none !important; }"; document.head.append(s); })()`;
// tira da frente o trânsito e os veículos parados (a câmera real pode nascer dentro de um deles)
const SEM_CARROS = `teste.transito?.forEach((k) => { k.g.position.y = -50; }); teste.veiculos?.forEach((v) => { if (v.g) v.g.visible = false; if (v.grupo) v.grupo.visible = false; });`;
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };

const t = await abrir("about:blank", { largura: L, altura: A, mobile: Boolean(process.env.MOBILE) });
await t.cmd("Page.addScriptToEvaluateOnNewDocument", { source: FAMILIA });
await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo` });
for (let i = 0; i < 400; i++) { if (await t.ev("Boolean(window.teste?.mundo && window.teste.rabisco)").catch(() => false)) break; await espera(150); }
await espera(2500);
await t.ev(OCULTA);

const textos = await t.ev(`import("/jogos/rabiscopolis/placas-instagram.js").then(({ medidasPlacas }) => teste.PARCEIROS.map((p) => [p.id, "@" + p.instagram, medidasPlacas[p.id]]))`);
for (const [id, arroba, m] of textos) ok(m?.arroba === arroba && m.largura <= m.area, `${id}: ${m?.arroba}, fonte ${m?.px}px, ocupa ${Math.round(m?.largura)} de ${Math.round(m?.area)}px`);
ok(new Set(textos.map((q) => q[2]?.arroba)).size === 12, "12 placas diferentes");

const lista = await t.ev(`teste.PARCEIROS.map((p) => { const l = teste.mundo.lugares.find((q) => q.id === "parceiro-" + p.id); return [p.id, l.x, l.z, l.dir[0], l.dir[1]]; })`);
for (const [id, x, z, dx, dz] of lista) {
  if (IDS.length && !IDS.includes(id)) continue;
  const yaw = Math.atan2(-dx, -dz) + ANGULO, px = x + dx * RECUO, pz = z + dz * RECUO;
  const ir = `teste.hora?.(${HORA}); teste.vista(null); teste.ir(${px}, ${pz}); teste.olhar(${yaw}); ${SEM_CARROS}`;
  await t.ev(ir); await espera(1400);
  await t.ev(ir); await espera(500);
  await t.foto(`${PASTA}/${id}.png`);
  console.log(id, JSON.stringify(await t.ev("teste.medir().total")));
}
const erros = t.erros.filter((e) => !/assets\/voz|favicon|fonts\.g/.test(e));
ok(!erros.length, `sem erro de console ${erros.slice(0, 3).join(" | ")}`);
await t.fechar();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
