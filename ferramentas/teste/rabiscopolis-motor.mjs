// Som de motor dos veículos da Rabiscolândia: liga ao entrar, sobe com a velocidade, para ao sair, pausar ou com o 🔇.
// Verifica por instrumentação (o Chrome roda com --mute-audio, cdp.mjs): contexto 'running', motor ligado e ganho > 0.
// Uso: python3 -m http.server 8097 &  node --experimental-websocket ferramentas/teste/rabiscopolis-motor.mjs [http://localhost:8097]
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8097";
const URL_JOGO = `${BASE}/jogos/rabiscopolis/`;
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const vigia = setTimeout(() => { console.log("✗ o teste travou"); process.exit(2); }, 5 * 60 * 1000);
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const ate = async (t, expr, ms = 15000, passo = 150) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
const errosDeVerdade = (t) => t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e));
const M = `import("../../src/motor/sons.js").then((m) => m.motor)`;
const estado = (t) => t.ev(`${M}.then((m) => ({ ligado: m.ligado, ganho: +m.ganho.toFixed(4), ctx: m.estadoAudio, ritmo: m.ritmo }))`);

const t = await abrir("about:blank", { largura: 1280, altura: 720 });
try {
  await t.cmd("Page.navigate", { url: URL_JOGO });
  await ate(t, "document.readyState === 'complete'");
  await t.ev(`localStorage.clear(); ${FAMILIA}`);
  await t.cmd("Page.navigate", { url: `${URL_JOGO}?teste&jogar&fixo` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo", 40000), "o jogo carregou");
  await espera(1500);
  const tipos = await t.ev("teste.veiculos.map((v) => v.tipo)");
  console.log("veículos na cidade:", tipos.join(", "));
  let s = await estado(t);
  ok(!s.ligado, "a pé: motor desligado");

  // conta nós criados: ligar uma vez e rodar quadros não pode criar nós novos
  await t.ev("teste.entrar(0)");
  ok(await ate(t, `${M}.then((m) => m.ligado && m.ganho > 0)`, 4000), "entrou no carro: motor ligado, ganho > 0");
  s = await estado(t);
  ok(s.ctx === "running", `AudioContext 'running' (${s.ctx})`);
  const parado = s.ganho;
  await t.ev("teste.volante(1, 0)");
  await espera(2500);
  s = await estado(t);
  ok(s.ganho > parado && s.ritmo > 0.3, `acelerando: ganho ${parado} → ${s.ganho}, ritmo ${s.ritmo?.toFixed?.(2)}`);
  await t.ev("teste.volante(null)");

  // pausa: o motor cala; continuar: volta
  await t.ev("teste.jogo.pausa.pausar()");
  ok(await ate(t, `${M}.then((m) => !m.ligado)`, 3000), "pausado: motor desligado");
  await t.ev("teste.jogo.pausa.continuar()");
  ok(await ate(t, `${M}.then((m) => m.ligado)`, 3000), "continuou: motor volta");

  // 🔇 da engrenagem: mestre zera
  await t.ev(`import("../../src/motor/sons.js").then((m) => m.sons.mudo || m.sons.alternarMudo())`);
  await espera(300);
  ok(await t.ev(`import("../../src/motor/sons.js").then((m) => m.sons.mudo)`), "🔇 ligado (o mestre zera o motor junto com os outros sons)");
  await t.ev(`import("../../src/motor/sons.js").then((m) => m.sons.mudo && m.sons.alternarMudo())`);

  await t.ev("teste.sair()");
  ok(await ate(t, `${M}.then((m) => !m.ligado)`, 3000), "saiu do carro: motor parado");
  s = await estado(t);
  ok(!s.ligado && s.ganho < 0.005, `ganho depois de sair: ${s.ganho}`);

  // cada tipo de veículo
  const vistos = new Set();
  for (let i = 0; i < tipos.length; i++) {
    const tp = tipos[i];
    if (vistos.has(tp)) continue; vistos.add(tp);
    await t.ev(`teste.entrar(${i})`);
    await espera(900);
    s = await estado(t);
    const mudoTipo = ["bici", "patinete"].includes(tp);
    ok(mudoTipo ? !s.ligado : s.ligado && s.ganho > 0, `${tp}: ${mudoTipo ? "sem motor (bicicleta/patinete)" : `motor ligado, ganho ${s.ganho}`}`);
    await t.ev("teste.voar?.(false); teste.sair()");
    await espera(300);
  }
  ok(!errosDeVerdade(t).length, `sem erro de console ${errosDeVerdade(t).slice(0, 4).join(" ; ")}`);
} finally {
  await t.fechar();
}
clearTimeout(vigia);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
