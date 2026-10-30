// Igreja Reviver: fachada com as placas azuis lisas e as missões da igreja (Convite e Pai Nosso) do lado de fora.
// Fotos em .claude/tmp/igreja/. Uso: python3 -m http.server 8731 &  node --experimental-websocket ferramentas/teste/igreja-fora.mjs [http://localhost:8731]
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const BASE = process.argv[2] || "http://localhost:8731";
const FOTOS = fileURLToPath(new URL("../../.claude/tmp/igreja/", import.meta.url));
mkdirSync(FOTOS, { recursive: true });
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
const FAMILIA = `localStorage.setItem("rabisco.familia", JSON.stringify({ responsavel: { nome: "Teste", email: "t@t" }, crianca: { nome: "Alice", genero: "menina" } }))`;
const ate = async (t, expr, ms = 40000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(250); } return false; };

const t = await abrir("about:blank", { largura: 1280, altura: 720 });
try {
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabiscopolis/` });
  await ate(t, "document.readyState === 'complete'");
  await t.ev(`localStorage.clear(); ${FAMILIA}`);
  await t.cmd("Page.navigate", { url: `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo` });
  ok(await ate(t, "!!window.teste?.vivo && !!teste.mundo", 60000), "jogo carregou");
  await t.ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(2500);
  // fachada de frente e de perto (as placas ficam na frente da igreja)
  await t.ev("teste.vista([0, 3.2, -4], [0, 2.2, -17])"); await espera(2500); await t.foto(`${FOTOS}1-fachada-igreja.png`);
  await t.ev("teste.vista([0, 1.6, -9.5], [0, 1.0, -17])"); await espera(2500); await t.foto(`${FOTOS}2-placas-azuis-de-perto.png`);
  await t.ev("teste.vista(null)");
  // Convite: tudo do lado de fora (a Tia espera na frente da igreja)
  const tia = await t.ev("teste.missoes.npc('convite', 'tia')");
  await t.ev(`teste.ir(${tia.x + 1.6}, ${tia.z + 1.4})`); await espera(1500);
  const c0 = await t.ev("teste.contexto");
  ok(/Convite/.test(c0 ?? ""), `perto da Tia aparece "${c0}"`);
  await t.ev("teste.acao()"); await espera(1500);
  ok(await t.ev("teste.missoes.ativa === 'convite'"), "Convite aceito na frente da igreja");
  ok(await t.ev("!teste.emLugar"), "o Rabisco está do lado de fora");
  await t.ev(`teste.vista([${tia.x} + 5, 3, ${tia.z} + 8], [${tia.x}, 1.2, ${tia.z}])`); await espera(1200); await t.foto(`${FOTOS}3-convite-na-frente-da-igreja.png`); await t.ev("teste.vista(null)");
  // convida os três e traz para a frente da igreja
  for (const id of ["vermelhinho", "amarelinho", "verdinho"]) {
    const n = await t.ev(`teste.missoes.npc('convite', '${id}')`);
    await t.ev(`teste.ir(${n.x + 1.0}, ${n.z + 1.0})`); await espera(700); await t.ev("teste.acao()"); await espera(400);
  }
  await t.ev(`teste.ir(${tia.x - 14}, ${tia.z - 1.5})`); await espera(1500);
  await t.ev(`teste.ir(${tia.x + 1.6}, ${tia.z + 1.4})`);
  ok(await ate(t, "teste.missoes.ativa === null && teste.missoes.feitas.includes('convite')", 15000), "Convite concluído na frente da igreja");
  ok(await t.ev("!teste.emLugar"), "ainda do lado de fora ao concluir (não entrou no prédio)");
  await espera(800);
  await t.ev(`teste.vista([${tia.x} + 5, 3, ${tia.z} + 8], [${tia.x}, 1.2, ${tia.z}])`); await espera(1200); await t.foto(`${FOTOS}4-convite-concluido-fora.png`); await t.ev("teste.vista(null)");
  // Pai Nosso: tapete na porta, com o nome da criança
  const tio = await t.ev("teste.missoes.npc('painosso', 'tio')");
  await t.ev(`teste.ir(${tio.x + 1.6}, ${tio.z + 1.4})`); await espera(1500);
  await t.ev("teste.acao()"); await espera(1500);
  ok(await t.ev("teste.missoes.ativa === 'painosso'"), "Pai Nosso aceito na frente da igreja");
  await t.ev("teste.ir(0, -16.2)"); await espera(300); await t.ev("teste.ir(0, -19.2)"); await espera(1200);
  const o = await t.ev("teste.oracao");
  ok(o?.painel && /Alice, vamos orar juntos/.test(o.texto), `a oração chama a criança pelo nome ("${o?.texto?.slice(0, 40)}")`);
  ok(await t.ev("!teste.emLugar"), "a oração é do lado de fora, no tapete da porta");
  await t.foto(`${FOTOS}5-painosso-na-porta-da-igreja.png`);
  ok(!t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)/.test(e)).length, `sem erro de console ${t.erros.slice(0, 3).join(" ; ")}`);
} finally { await t.fechar(); }
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
