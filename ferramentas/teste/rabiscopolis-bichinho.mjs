// Rabiscolândia: o bichinho que acompanha o Rabisco (Pet Shop do Ateliê, bichinho.js). Confere, num aparelho novo:
//  - o primeiro bichinho sai de graça (saldo 0); os outros custam o preço: com saldo troca e desconta, sem saldo recusa;
//  - o bichinho segue o Rabisco (≤ 3 m depois de andar), fica fora de prédios e senta quando o Rabisco para;
//  - vai junto no veículo (carro e moto) e reaparece ao descer;
//  - o nome vira uma plaquinha menor que a do Rabisco e fica salvo; a ação perto dele faz um truque;
//  - tudo continua depois de recarregar a página;
//  - custo de desenho: no máximo +2 chamadas por causa do bichinho (praça, celular).
// Uso: node --experimental-websocket ferramentas/teste/rabiscopolis-bichinho.mjs <http://localhost:porta> [pasta das fotos]
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { abrir, espera } from "./cdp.mjs";

const [BASE = "http://localhost:8099", PASTA = fileURLToPath(new URL("../../.claude/tmp/bichinho/", import.meta.url))] = process.argv.slice(2);
const OUT = PASTA.endsWith("/") ? PASTA : `${PASTA}/`;
mkdirSync(OUT, { recursive: true });
const URL_JOGO = `${BASE}/jogos/rabiscopolis/?teste&jogar&fixo`;
const CEL = { mobile: true, largura: 844, altura: 390, agente: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1" };
const ate = async (t, expr, ms = 60000, passo = 150) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await t.ev(expr).catch(() => false)) return true; await espera(passo); } return false; };
let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };
async function esperarJogo(t) {
  if (!(await ate(t, "Boolean(window.teste?.vivo && window.teste.mundo && window.teste.rabisco)", 90000))) throw new Error("o jogo não abriu: " + t.erros.join(" | "));
  await espera(2500);
}
const SALDO = "teste.Rabiscoins.saldo()";
const PET = "teste.bichinho.info";
const distPet = "(() => { const b = teste.bichinho.info, j = teste.j; return Math.hypot(b.x - j.pos.x, b.z - j.pos.z); })()";
// anda até o Rabisco ter percorrido `m` metros (o tempo do jogo corre mais devagar com o Chrome sem GPU: nada de relógio)
const andar = async (t, m, iy = 1) => {
  const p0 = await t.ev("({ x: teste.j.pos.x, z: teste.j.pos.z })");
  await t.ev(`teste.volante(${iy}, 0)`);
  await ate(t, `Math.hypot(teste.j.pos.x - ${p0.x}, teste.j.pos.z - ${p0.z}) > ${m}`, 60000, 100);
  await t.ev("teste.volante(null)");
};

// ================================================================ desktop: Pet Shop, seguir, sentar, veículo, nome, persistência
{
  const t = await abrir(URL_JOGO, { largura: 1280, altura: 720 });
  await esperarJogo(t);
  ok(await t.ev(`${PET} === null`) && await t.ev(SALDO) === 0, "aparelho novo: sem bichinho e com 0 Rabiscoins");

  // ---- Pet Shop: aba nova, 6 bichinhos
  await t.ev("teste.abrirAtelie('bichinho')"); await espera(900);
  ok(await t.ev("document.querySelectorAll('.atl-aba').length") === 6 && await t.ev("document.querySelector('.atl-aba.ativa')?.dataset.cat") === "bichinho", "o Ateliê tem a aba Bichinhos (6 abas)");
  ok(await t.ev("document.querySelectorAll('.atl-item').length") === 6, "a aba mostra os 6 bichinhos");
  ok(await t.ev("teste.atelie.escolher('gato') && teste.atelie.palco != null && teste.atelie.rabisco != null"), "a prévia da loja mostra o bichinho na vitrine");
  await espera(600);
  await t.foto(OUT + "loja-bichinhos-gato.png");
  ok(/De graça/.test(await t.ev("document.querySelector('.atl-item[data-id=\"rabiscolandia:bichinho:gato\"]').textContent")) && /de graça/i.test(await t.ev("document.querySelector('.atl-acao').textContent")), "o 1º bichinho aparece como de graça");

  // ---- ganhar o grátis (saldo 0)
  await t.ev("teste.atelie.fazer()"); await espera(500);
  ok(await t.ev(SALDO) === 0 && await t.ev("teste.Rabiscoins.tem('rabiscolandia:bichinho:gato')"), "o 1º bichinho (gatinho) foi de graça: saldo continua 0 e ele é da criança");
  ok(await t.ev("teste.salvo.bichinho?.atual") === "gato" && await t.ev(`${PET}?.id`) === "gato", "o gatinho já foi com o Rabisco (salvo e na cidade)");
  ok(/\b60\b/.test(await t.ev("document.querySelector('.atl-item[data-id=\"rabiscolandia:bichinho:cachorro\"]').textContent")), "depois do grátis os outros mostram o preço (cachorrinho 60)");

  // ---- recusar sem saldo
  await t.ev("teste.atelie.escolher('tartaruga'); teste.atelie.fazer()"); await espera(300);
  ok(await t.ev(SALDO) === 0 && !(await t.ev("teste.Rabiscoins.tem('rabiscolandia:bichinho:tartaruga')")) && await t.ev("teste.salvo.bichinho.atual") === "gato", "sem saldo (tartaruguinha por 150): recusado, nada muda");
  ok(await t.ev("document.querySelector('.atl-acao').classList.contains('falta')"), "o botão mostra quanto falta");
  // ---- trocar com saldo
  await t.ev("teste.Rabiscoins.ganhar(100, 'teste')");
  await t.ev("teste.atelie.escolher('coelho'); teste.atelie.fazer()"); await espera(400);
  ok(await t.ev(SALDO) === 10 && await t.ev("teste.Rabiscoins.tem('rabiscolandia:bichinho:coelho')") && await t.ev(`${PET}?.id`) === "coelho", "com saldo: trocou 90 Rabiscoins pelo coelhinho (saldo 10) e ele já vai junto");
  await t.ev("teste.atelie.escolher('ovelha'); teste.atelie.fazer()"); await espera(300);
  ok(await t.ev(SALDO) === 10 && !(await t.ev("teste.Rabiscoins.tem('rabiscolandia:bichinho:ovelha')")), "ovelhinha (120) com 10 de saldo: recusado");
  // trocar de bichinho já seu não cobra
  await t.ev("teste.atelie.escolher('gato'); teste.atelie.fazer()"); await espera(300);
  ok(await t.ev(SALDO) === 10 && await t.ev(`${PET}?.id`) === "gato", "voltar ao gatinho (já é seu) não cobra");

  // ---- nome
  await t.ev("teste.atelie.escolher('gato')");
  ok(await t.ev("!document.querySelector('.atl-nomepet').hidden"), "o campo do nome aparece para o bichinho que já é seu");
  await t.ev("(() => { const c = document.querySelector('.atl-campo'); c.value = 'Mingau'; c.dispatchEvent(new Event('input', { bubbles: true })); })()"); await espera(300);
  ok(await t.ev("teste.salvo.bichinho.nomes.gato") === "Mingau" && await t.ev(`${PET}.nome`) === "Mingau", "nome salvo (Mingau)");
  const pl = await t.ev(`({ pet: ${PET}.placa, rabisco: teste.placa })`);
  ok(pl.pet && pl.pet.w < 0.76 && (!pl.rabisco || pl.rabisco.y > pl.pet.y), `a plaquinha do bichinho é menor que a do Rabisco (${JSON.stringify(pl)})`);
  await t.ev("teste.atelie.fechar()"); await espera(500);

  // ---- segue o Rabisco
  await t.ev("teste.ir(0, 33); teste.olhar(Math.PI)"); await espera(500);
  await t.ev(`${PET} && teste.bichinho.reaparecer()`); await espera(300);
  const antes = await t.ev(`({ x: teste.j.pos.x, z: teste.j.pos.z })`);
  await andar(t, 14);
  const depois = await t.ev(`({ x: teste.j.pos.x, z: teste.j.pos.z, d: ${distPet}, v: ${PET}.vel })`);
  ok(Math.hypot(depois.x - antes.x, depois.z - antes.z) > 10, `o Rabisco andou ${Math.hypot(depois.x - antes.x, depois.z - antes.z).toFixed(1)} m`);
  ok(depois.d <= 3, `andando, o bichinho ficou a ${depois.d.toFixed(2)} m do Rabisco (≤ 3)`);
  await t.foto(OUT + "seguindo-na-rua.png");
  await andar(t, 6);
  await espera(800);
  const parado = await t.ev(`({ d: ${distPet}, s: ${PET}.sentado, solido: teste.dentroDeSolido(${PET}.x, ${PET}.z) })`);
  ok(parado.d <= 3 && !parado.solido, `parado: a ${parado.d.toFixed(2)} m e fora de prédios`);
  ok(await ate(t, `${PET}.sentado > 0.9`, 60000), "com o Rabisco parado o bichinho senta");
  await espera(500);
  await t.foto(OUT + "sentado-parado.png");
  // correndo: contra uma parede de prédio o bichinho não atravessa
  await t.ev("teste.ir(0, 33)"); await espera(400);
  await t.ev("teste.olhar(Math.PI / 2)");
  await andar(t, 15);
  ok(!(await t.ev(`teste.dentroDeSolido(${PET}.x, ${PET}.z)`)), "depois de passear junto a prédios, o bichinho não está dentro de nada");

  // ---- truque (ação perto dele)
  await t.ev("teste.ir(0, 33)"); await espera(2500);
  await t.ev(`teste.bichinho.reaparecer()`); await espera(500);
  const rot = await t.ev("teste.contexto");
  await t.ev("teste.acao()"); await espera(150);
  ok(await t.ev(`${PET}.truque`) != null, `a ação perto dele faz um truque (ação: "${rot}"; truque: ${await t.ev(`${PET}.truque`)})`);
  ok(await ate(t, `${PET}.truque === null`, 40000, 100), "o truque termina sozinho");
  ok(await t.ev("teste.bichinho.truque()") === true, "o toque nele (mesma função) também faz o truque");
  await ate(t, `${PET}.truque === null`, 40000, 100);
  await t.ev(`teste.bichinho.carinho()`);
  ok(await ate(t, `${PET}.coracao > 0.3`, 40000, 50), "o carinho solta um coração");

  // ---- veículo: carro e moto
  await t.ev("teste.ir(0, 20); teste.olhar(0)"); await espera(500);
  ok((await t.ev("teste.garagem('carro')")) != null, "carro chamado pelo Rabifone");
  await t.ev("teste.entrar(teste.veiculos.indexOf(teste.garagemAtual))"); await espera(900);
  const carro = await t.ev(`({ modo: teste.modo, naCarona: ${PET}.naCarona, vis: ${PET}.visivel })`);
  ok(carro.modo === "veiculo" && carro.naCarona === "carro" && carro.vis, `no carro o bichinho vai sentado (${JSON.stringify(carro)})`);
  await t.ev("teste.volante(1, 0)"); await espera(2500);
  await t.foto(OUT + "no-carro.png");
  const dc = await t.ev(`Math.hypot(${PET}.x - teste.dentro.pos.x, ${PET}.z - teste.dentro.pos.z)`);
  ok(dc <= 3, `andando de carro o bichinho está com o carro (${dc.toFixed(2)} m)`);
  await t.ev("teste.volante(null)"); await espera(2500);
  await t.ev("teste.sair()"); await espera(1200);
  const desceu = await t.ev(`({ modo: teste.modo, naCarona: ${PET}.naCarona, vis: ${PET}.visivel, d: ${distPet} })`);
  ok(desceu.modo === "rua" && !desceu.naCarona && desceu.vis && desceu.d <= 4, `ao descer o bichinho reaparece perto (${JSON.stringify(desceu)})`);
  await t.ev("teste.ir(0, 20); teste.olhar(0)"); await espera(500);
  ok((await t.ev("teste.garagem('moto')")) != null, "moto chamada");
  await t.ev("teste.entrar(teste.veiculos.indexOf(teste.garagemAtual))"); await espera(900);
  const moto = await t.ev(`({ modo: teste.modo, naCarona: ${PET}.naCarona, vis: ${PET}.visivel })`);
  ok(moto.modo === "veiculo" && moto.naCarona === "moto" && moto.vis, `na moto o bichinho vai na garupa (${JSON.stringify(moto)})`);
  await t.foto(OUT + "na-moto.png");
  await t.ev("teste.sair()"); await espera(1000);

  // ---- persistência
  await t.cmd("Page.reload"); await esperarJogo(t);
  ok(await t.ev(`${PET}?.id`) === "gato" && await t.ev(`${PET}.nome`) === "Mingau", "depois de recarregar: o gatinho Mingau continua com o Rabisco");
  ok(await t.ev("teste.Rabiscoins.tem('rabiscolandia:bichinho:coelho') && teste.salvo.bichinho.nomes.gato === 'Mingau'"), "as compras e o nome continuam guardados");
  ok(await t.ev(SALDO) === 10, "o saldo continua 10");
  // bichinho não trocado no salvo (mexido à mão) não vale
  await t.ev("(() => { const k = 'rabisco.rabiscopolis.v1', d = JSON.parse(localStorage.getItem(k)); d.bichinho.atual = 'tartaruga'; localStorage.setItem(k, JSON.stringify(d)); })()");
  await t.cmd("Page.reload"); await esperarJogo(t);
  ok(await t.ev(`${PET}`) === null, "bichinho que não foi trocado (salvo mexido à mão) não aparece");
  ok(t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)|favicon|fonts\.g/.test(e)).length === 0, "sem erro de console: " + t.erros.slice(0, 3).join(" | "));
  await t.fechar();
}

// ================================================================ celular: custo de desenho
{
  const t = await abrir(URL_JOGO, CEL);
  await esperarJogo(t);
  await t.ev("teste.Rabiscoins.ganhar(500, 'teste'); teste.abrirAtelie('bichinho'); teste.atelie.escolher('cachorro'); teste.atelie.fazer(); teste.atelie.fechar()"); await espera(500);
  await t.ev("teste.bichinho.definir(null)");
  const medir = async () => { const m = {}; for (const [nome, [x, z, yaw]] of Object.entries({ "praça": [0, 33, Math.PI], "frente da loja": [17, 20, Math.PI / 2] })) { await t.ev(`teste.ir(${x}, ${z}); teste.olhar(${yaw})`); await espera(900); m[nome] = (await t.ev("teste.medir().total")).calls; } return m; };
  const sem = await medir();
  await t.ev("teste.bichinho.definir('cachorro', 'Pipoca')"); await espera(300);
  await t.ev(`teste.bichinho.reaparecer()`);
  const com = {};
  for (const [nome, [x, z, yaw]] of Object.entries({ "praça": [0, 33, Math.PI], "frente da loja": [17, 20, Math.PI / 2] })) {
    await t.ev(`teste.ir(${x}, ${z}); teste.olhar(${yaw}); teste.bichinho.reaparecer()`); await espera(900);
    com[nome] = (await t.ev("teste.medir().total")).calls;
    ok(com[nome] - sem[nome] <= 2, `celular, ${nome}: bichinho com nome custa +${com[nome] - sem[nome]} (${sem[nome]} → ${com[nome]}) (≤ +2)`);
  }
  // o teto do celular é 180 na praça: a base (sem o bichinho) é que decide se sobra folga; o bichinho em si custa no máximo +2
  console.log(`  (praça no celular: ${sem["praça"]} sem o bichinho, ${com["praça"]} com ele; teto 180)`);
  await t.foto(OUT + "celular-praca.png");
  ok(t.erros.filter((e) => !/assets\/voz\/(rp-|nomes\/)|favicon|fonts\.g/.test(e)).length === 0, "sem erro de console no celular");
  await t.fechar();
}
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
