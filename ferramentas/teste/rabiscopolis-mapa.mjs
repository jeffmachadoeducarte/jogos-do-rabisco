// Rabiscolândia: confere o traçado da cidade (jogos/rabiscopolis/mapa.js) sem navegador.
//  - todo lote, lugar, prédio e vaga fica fora do asfalto (distRua > 0, inclusive os cantos da pegada);
//  - nenhum lugar/lote/prédio/vaga em cima de outro;
//  - cada empresa parceira de PARCEIROS tem ponto (e só elas têm "parceiro");
//  - as rotas dos carros são fechadas e andam só em cima do asfalto (com a faixa da direita).
// Uso: node ferramentas/teste/rabiscopolis-mapa.mjs
import { readFileSync } from "node:fs";

// os módulos do jogo são do navegador (sem package.json "type": "module"): importa pelo texto, trocando o import relativo
const raiz = new URL("../../", import.meta.url);
const texto = (p) => readFileSync(new URL(p, raiz), "utf8");
const parceirosSrc = texto("src/parceiros.js");
const urlParceiros = `data:text/javascript,${encodeURIComponent(parceirosSrc)}`;
const mapaSrc = texto("jogos/rabiscopolis/mapa.js").replace(/from\s+["']\.\.\/\.\.\/src\/parceiros\.js["']/, `from "${urlParceiros}"`);
const M = await import(`data:text/javascript,${encodeURIComponent(mapaSrc)}`);
const { PARCEIROS } = await import(urlParceiros);

let falhas = 0;
const ok = (c, msg) => { console.log(c ? "✓" : "✗", msg); if (!c) falhas++; };

// ---------- pegadas: lugares com prédio, lotes, prédios de enchimento e vagas
const cantos = (p) => [[p.x0, p.z0], [p.x1, p.z0], [p.x1, p.z1], [p.x0, p.z1], [(p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2]];
const fora = (p) => cantos(p).every(([x, z]) => M.distRua(x, z).d > 0);
const pegadas = [
  ...M.LUGARES.filter((l) => l.pegada).map((l) => ({ id: l.id, ...M.pegadaDe(l.x, l.z, l.dir, l.pegada[0], l.pegada[1], l.recuo) })),
  ...M.LOTES.map((l) => ({ id: l.id, ...M.pegadaDe(l.x, l.z, l.dir, M.LOTE.w, M.LOTE.d, M.LOTE.recuo) })),
  ...[...M.PREDIOS, ...M.PREDIOS_NOVOS].map((p) => ({ id: p.id, x0: p.x0, x1: p.x1, z0: p.z0, z1: p.z1 })),
  ...M.PEGADAS_FIXAS.filter((p) => p.id.startsWith("vaga-")),
];
const naRua = pegadas.filter((p) => !fora(p)).map((p) => p.id);
ok(!naRua.length, `${pegadas.length} pegadas (lugares, ${M.LOTES.length} lotes, ${M.PREDIOS.length} + ${M.PREDIOS_NOVOS.length} prédios, vagas) fora do asfalto ${naRua.join(", ")}`);
const pontos = [...M.LUGARES.map((l) => [l.id, l.x, l.z]), ...M.LOTES.map((l) => [l.id, l.x, l.z]), ...M.VAGAS.map((v, i) => [`vaga-${i}`, v.x, v.z]), ["largada", M.LARGADA.x, M.LARGADA.z]];
const pontoNaRua = pontos.filter(([, x, z]) => M.distRua(x, z).d <= 0).map(([id]) => id);
ok(!pontoNaRua.length, `${pontos.length} pontos de porta/vaga com distRua > 0 ${pontoNaRua.join(", ")}`);

// ---------- nada em cima de nada
const sobre = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
const choques = [];
for (let i = 0; i < pegadas.length; i++) for (let k = i + 1; k < pegadas.length; k++) if (sobre(pegadas[i], pegadas[k])) choques.push(`${pegadas[i].id}×${pegadas[k].id}`);
ok(!choques.length, `nenhuma pegada sobreposta ${choques.slice(0, 8).join(", ")}`);
// lugares sem prédio (praça, parque) não podem ter o ponto dentro do prédio de ninguém
const dentro = M.LUGARES.filter((l) => !l.pegada).filter((l) => pegadas.some((p) => l.x > p.x0 && l.x < p.x1 && l.z > p.z0 && l.z < p.z1)).map((l) => l.id);
ok(!dentro.length, `praça e parque livres ${dentro.join(", ")}`);
// pontos de lugar distintos (dois lugares não podem dividir a mesma porta)
const perto = [];
for (let i = 0; i < M.LUGARES.length; i++) for (let k = i + 1; k < M.LUGARES.length; k++) {
  const a = M.LUGARES[i], b = M.LUGARES[k];
  if (Math.hypot(a.x - b.x, a.z - b.z) < 8) perto.push(`${a.id}×${b.id}`);
}
ok(!perto.length, `portas dos lugares a 8 m ou mais umas das outras ${perto.join(", ")}`);
// tudo dentro da cidade (300 × 300)
const longe = pegadas.filter((p) => Math.max(Math.abs(p.x0), Math.abs(p.x1), Math.abs(p.z0), Math.abs(p.z1)) > M.BORDA).map((p) => p.id);
ok(!longe.length, `tudo dentro de ±${M.BORDA} m ${longe.join(", ")}`);

// ---------- parceiras
const comParceiro = M.LUGARES.filter((l) => l.parceiro);
ok(comParceiro.length === PARCEIROS.length, `${comParceiro.length} lojas parceiras = ${PARCEIROS.length} em PARCEIROS`);
ok(PARCEIROS.every((p) => comParceiro.some((l) => l.parceiro.id === p.id)), "cada parceira tem o seu ponto");
ok(M.PONTOS_PARCEIROS.length >= PARCEIROS.length, `pontos sobrando para parceiras novas: ${M.PONTOS_PARCEIROS.length - PARCEIROS.length}`);
ok(!M.lugar("igreja").parceiro, "a Igreja Reviver não conta como loja parceira");

// ---------- rotas dos carros: fechadas e em cima do asfalto (também deslocadas 2,7 m para a faixa da direita)
for (const rota of M.ROTAS) {
  const n = rota.pts.length;
  let fora = 0, total = 0;
  for (let i = 0; i < n; i++) {
    const [ax, az] = rota.pts[i], [bx, bz] = rota.pts[(i + 1) % n]; // o último liga no primeiro: rota fechada
    const l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / l, nz = (bx - ax) / l;
    for (let s = 0; s <= l; s += 1) for (const off of [0, 2.7, -2.7]) {
      total++;
      const x = ax + ((bx - ax) * s) / l + nx * off, z = az + ((bz - az) * s) / l + nz * off;
      if (M.distRua(x, z).d > -0.3) fora++;
    }
  }
  ok(n >= 3 && fora === 0, `rota ${rota.id}: fechada (${n} pontos) e no asfalto (${total} amostras, ${fora} fora)`);
}

// ---------- o resto que o jogo usa
ok(M.LOTES.filter((l) => l.bairro === "Bairro das Casas").length === 8 && M.LOTES.filter((l) => l.bairro === "Vila das Flores").length === 8 && M.LOTES.length === 32 && new Set(M.LOTES.map((l) => l.numero)).size === 32, "8 lotes no Bairro das Casas, 8 na Vila das Flores e 16 nos bairros novos (Vila dos Ipês e Bairro das Palmeiras), números únicos");
ok(M.LOTES.slice(0, 16).every((l, i) => l.numero === i + 1), "os 16 lotes de antes continuam com o mesmo número e na mesma ordem");
ok(M.MORADORES.length >= 10 && M.MORADORES.every((m) => M.RUAS.some((r) => r.id === m.rua)), `${M.MORADORES.length} moradores do estojo, cada um numa rua que existe`);
const PLANO = ["praca", "igreja", "kids1", "kids2", "biblioteca", "hospital", "veterinario", "bombeiros", "mercado", "padaria", "sorveteria", "correios", "lavarapido", "estudio", "parque", "praia", "mirante", "heliponto", "fazendinha", "campo"];
ok(PLANO.every((id) => M.lugar(id)), `todos os lugares do plano existem (${PLANO.filter((id) => !M.lugar(id)).join(", ")})`);
ok(!M.lugar("escola"), "a escola única saiu: agora são Educarte Kids I e Kids II");
const k1 = M.lugar("kids1"), k2 = M.lugar("kids2");
ok(k1 && k2 && Math.sign(k1.x) !== Math.sign(k2.x) && Math.hypot(k1.x - k2.x, k1.z - k2.z) > 300, `as duas escolas ficam em lados opostos, a ${k1 && k2 ? Math.round(Math.hypot(k1.x - k2.x, k1.z - k2.z)) : "?"} m uma da outra`);
ok(M.VAGAS.some((v) => v.tipo === "heli" && Math.hypot(v.x - M.HELIPONTO.x, v.z - M.HELIPONTO.z) < 1), "o helicóptero fica no heliponto");
ok(M.VAGAS.filter((v) => v.tipo === "barco").every((v) => [M.LAGO, M.LAGO2].some((l) => Math.hypot(v.x - l.x, v.z - l.z) < l.r - 2)), "os barquinhos começam dentro dos lagos");
ok(["je", "ambulancia", "bombeiro", "sorvete", "bici", "patinete", "barco", "trator", "heli", "onibus", "carro"].every((t) => M.VAGAS.some((v) => v.tipo === t)), "cada tipo de veículo tem a sua vaga");
ok(M.NBLOCOS === 9 && M.GRADE0 === -450 && M.BORDA === 400 && M.BORDA_ANTIGA === 250, "cidade de 800 m em 9 × 9 blocos (o miolo de antes tem 500 m)");
ok(M.blocoDe(0, 0).join() === "4,4" && M.blocoDe(-249, 249).join() === "2,6" && M.blocoDe(160, -60).join() === "6,3" && M.blocoDe(-399, 399).join() === "0,8", "blocos de 100 m com as divisas do miolo em ±50, ±150 e ±250, como antes");
// ---------- bairros novos e o mar
const area = (b) => (2 * b) ** 2;
const aguaDentro = (2 * M.BORDA) * (M.BORDA - M.MAR.costa) - Math.PI * M.ILHA.r ** 2;
ok(area(M.BORDA) / area(M.BORDA_ANTIGA) >= 2 && (area(M.BORDA) - aguaDentro) / area(M.BORDA_ANTIGA) >= 2, `área: ${area(M.BORDA_ANTIGA) / 1e3} mil m² → ${area(M.BORDA) / 1e3} mil m² (${(area(M.BORDA) / area(M.BORDA_ANTIGA)).toFixed(2)}×; só terra: ${((area(M.BORDA) - aguaDentro) / area(M.BORDA_ANTIGA)).toFixed(2)}×)`);
const BAIRROS_NOVOS = ["Vila dos Ipês", "Bairro das Palmeiras", "Jardim das Estrelas", "Orla do Mar Azul", "Ilha da Alegria"];
ok(BAIRROS_NOVOS.every((b) => M.LUGARES.some((l) => l.novo && l.bairro === b)), `cada bairro novo tem lugares com nome (${BAIRROS_NOVOS.join(", ")})`);
ok(M.PRACAS_NOVAS.length >= 3 && M.PREDIOS_NOVOS.length >= 60, `bairros novos com ${M.PRACAS_NOVAS.length} praças e ${M.PREDIOS_NOVOS.length} prédios`);
const naAgua = [...M.LUGARES.filter((l) => l.pegada).map((l) => M.pegadaDe(l.x, l.z, l.dir, l.pegada[0], l.pegada[1], l.recuo)), ...M.LOTES.map((l) => M.pegadaDe(l.x, l.z, l.dir, M.LOTE.w, M.LOTE.d, M.LOTE.recuo)), ...M.PREDIOS_NOVOS].filter((p) => cantos(p).some(([x, z]) => M.naMar(x, z)));
ok(!naAgua.length, "nenhum prédio, casa ou loja dentro do mar");
ok(M.LUGARES.filter((l) => l.novo).every((l) => !M.naMar(l.x, l.z)), "todo lugar novo fica em terra (ou no píer, ou na ilha)");
ok(M.naMar(0, 300) && !M.naMar(0, 360) && !M.naMar(28, 290) && !M.naMar(0, 260) && M.naIlha(M.RODA.x, M.RODA.z), "o mar começa na costa; a ilha e os píeres são chão");
// toda rua nova encosta em outra rua (a cidade continua ligada)
const ligada = M.RUAS.filter((r) => r.nova).filter((r) => !r.pts.some(([x, z]) => M.distRua(x, z, r).d < 0)); // a ponta (ou um vértice) fica no asfalto de outra
ok(!ligada.length, `toda rua nova começa ou passa em cima de outra rua ${ligada.map((r) => r.id).join(", ")}`);

console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
