// Rabiscolândia: monta a cidade 3D a partir de mapa.js, em 3 × 3 blocos de 100 m. Cada bloco é um grupo com tudo o
// que é fixo (prédios, casas, árvores, postes) mesclado por material; só o bloco do jogador e os vizinhos ficam
// visíveis (com a neblina em 140 m, o resto nem apareceria). Ruas, calçadas e o chão são de todos os blocos.
// Devolve as colisões (retângulos e círculos), os lugares, as casas, os semáforos e o que anima (água, patos, bichos).

import { THREE, mat, matNovo, malha, caixa, TEX, fita, densificar, normais, arvoreReal, semaforo, mesclar, r as rnd } from "./base3d.js";
import { RUAS, CALCADA, distRua, LUGARES, LOTES, LOTE, PREDIOS, PREDIOS_NOVOS, PRACAS_NOVAS, BORDA_ANTIGA, MAR, ORLA, ILHA, PIERS, RODA, naMar, SEMAFOROS, PONTOS_PARCEIROS, PARQUE, LAGO, PLAYGROUND, PRACA, FAZENDA, CAMPO, ESPORTES, QUADRA, HORTA, PARQUINHO_BEBE, PATIO_KIDS2, HELIPONTO, PRAIA, LAGO2, NBLOCOS, GRADE0, VAGAS, LARGADA, PEGADAS_FIXAS, BORDA, BLOCO, blocoDe, pegadaDe } from "./mapa.js";
import * as P from "./predios.js";
import { FACHADAS } from "./predios-parceiros.js";
import { criarPessoa } from "./pessoas.js";
import { casa } from "./casas.js";
import { degraus } from "./blocos.js";
import { MISSOES, PESSOAS_PORTA } from "./missoes-dados.js";
import { DESAFIOS, AREAS_DESAFIOS, HELI, BARCO } from "./desafios-dados.js";
import { marEAreia, pier, postoSalvaVidas, quiosqueCoco, rodaGigante, enfeitesOrla } from "./orla.js";
import { aleatorio } from "../../src/motor3d/toon.js";
import { atelie } from "./atelie-predio.js";

// local (lx, lz) de um grupo girado em rot (múltiplos de 90°) → mundo (igual a cidade.js · mundoDe)
export const mundoDe = (ox, oz, rot, lx, lz) => [ox + lx * Math.cos(rot) + lz * Math.sin(rot), oz - lx * Math.sin(rot) + lz * Math.cos(rot)];
function retMundo(ox, oz, rot, s) {
  const cs = [[s.x0, s.z0], [s.x1, s.z0], [s.x1, s.z1], [s.x0, s.z1]].map(([x, z]) => mundoDe(ox, oz, rot, x, z));
  const xs = cs.map((c) => c[0]), zs = cs.map((c) => c[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), y1: s.y1, ...(s.topo ? { topo: s.topo } : {}) };
}

export const RODA_VEL = (Math.PI * 2) / 30; // rad/s
// volume: AO falso e tom por peça (base3d.mesclar); aderecos: lixeiras, hidrantes, floreiras, bancos e cercas nas calçadas;
// aderecosLonge: esses adereços aparecem até a neblina (senão só perto, como detalhe)
export function montarMundo(cena, { volume = true, aderecos = true, aderecosLonge = true } = {}) {
  const solidos = [], circulos = [], lugares = [], casas = [], semaforos = [], anima = { patos: [], bichos: [], aguas: [], jatos: [], pessoas: [] };
  const blocos = [];
  for (let i = 0; i < NBLOCOS; i++) for (let j = 0; j < NBLOCOS; j++) { const g = new THREE.Group(); g.userData.bloco = [i, j]; cena.add(g); blocos.push(g); }
  const blocoEm = (x, z) => { const [i, j] = blocoDe(x, z); return blocos[i * NBLOCOS + j]; };
  const ocupado = (x, z, folga = 0) => solidos.some((s) => x > s.x0 - folga && x < s.x1 + folga && z > s.z0 - folga && z < s.z1 + folga) || PEGADAS_FIXAS.some((s) => x > s.x0 - folga && x < s.x1 + folga && z > s.z0 - folga && z < s.z1 + folga);
  // põe um conjunto { grupo, solidos } com a frente em (ox, oz) girado em rot, no bloco certo
  // altura real do que está montado (só o helicóptero usa: y1 de prédio é 20/30 "de folga", e ele passa por cima do telhado de verdade)
  const topoDe = (grupo) => new THREE.Box3().setFromObject(grupo).max.y;
  const por = (S, ox, oz, rot, bloco = blocoEm(ox, oz)) => {
    S.grupo.position.set(ox, 0, oz); S.grupo.rotation.y = rot;
    bloco.add(S.grupo);
    if (S.solidos.some((s) => !s.circulo && s.y1 >= 20)) { const topo = topoDe(S.grupo); for (const s of S.solidos) if (!s.circulo && s.y1 >= 20) s.topo = topo; }
    for (const s of S.solidos) {
      if (s.circulo) { const [x, z] = mundoDe(ox, oz, rot, s.x, s.z); circulos.push({ x, z, r: s.r }); } else solidos.push(retMundo(ox, oz, rot, s));
    }
    return S;
  };

  // ---------- chão (grama) e morrinhos em volta
  // o gramado vai até um pouco depois da costa (embaixo do mar não tem chão: senão os dois "brigam" de longe)
  const chaoZ1 = MAR.costa + 4;
  TEX.grama.repeat.set(140, 140 * (chaoZ1 + 700) / 1400); // placa de 10 m
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(1400, chaoZ1 + 700), mat(0xffffff, { map: TEX.grama }));
  chao.rotation.x = -Math.PI / 2; chao.position.set(0, -0.02, (chaoZ1 - 700) / 2); chao.receiveShadow = true;
  cena.add(chao);
  const morros = new THREE.Group();
  for (let n = 0; n < 22; n++) {
    const a = (n / 22) * Math.PI * 2, d = 490 + rnd() * 40; // depois do Horizonte (e não no mar, ao sul); de longe, menos polígonos
    const lado = 90 + rnd() * 50; // morrinho em degraus, de longe (poucas caixas)
    const m = malha(degraus(lado, lado * 0.8, 30, 5, { fim: 0.3 }), mat([0x5fb44f, 0x54a947, 0x69bf58][n % 3]), { sombra: false });
    m.position.set(Math.cos(a) * d, 8, Math.sin(a) * d); m.rotation.y = a; if (Math.sin(a) * d < 300) morros.add(m);
  }
  cena.add(morros);
  mesclar(morros, { volume });

  // ---------- ruas: calçada, asfalto, faixa branca tracejada (fora dos cruzamentos)
  const ruas = new THREE.Group();
  const matAsfalto = mat(0xffffff, { map: TEX.asfalto });
  const matCalcada = mat(0xffffff, { map: TEX.calcada });
  const matLinha = matNovo({ map: TEX.linha, transparent: true, alphaTest: 0.4 });
  const dentroDeOutra = (rua, folga) => (x, z) => distRua(x, z, rua).d < folga;
  // as ruas dos bairros novos ficam em 3 grupos (oeste, norte e leste), cada um mesclado e só visível perto: de longe
  // (na praça, por exemplo) não custam nada
  const regioes = { oeste: new THREE.Group(), norte: new THREE.Group(), leste: new THREE.Group() };
  const regiaoDe = (x, z) => (x < -245 ? "oeste" : x > 245 ? "leste" : z < -245 ? "norte" : x < 0 ? "oeste" : "leste");
  const fitas = (rua, pts, fechada, i, g) => {
    for (const s of [1, -1]) { const f = fita(pts, fechada, s * rua.w / 2, s * (rua.w / 2 + CALCADA), 0.07, matCalcada, 3, dentroDeOutra(rua, 0.3)); if (f) g.add(f); }
    const a = fita(pts, fechada, -rua.w / 2, rua.w / 2, 0.04 + i * 0.002, matAsfalto, 6); if (a) g.add(a);
    const l = fita(pts, fechada, -0.18, 0.18, 0.09, matLinha, 5, dentroDeOutra(rua, 2)); if (l) g.add(l);
  };
  RUAS.forEach((rua, i) => {
    if (!rua.nova) { fitas(rua, rua.pts, rua.fechada, i, ruas); return; }
    // rua nova: corta nos pedaços de cada região (pelo meio de cada trecho) e cada pedaço vai para o seu grupo
    let pedaco = [rua.pts[0]], reg = null;
    for (let k = 1; k < rua.pts.length; k++) {
      const [a, b] = [rua.pts[k - 1], rua.pts[k]], r = regiaoDe((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      if (reg && r !== reg) { fitas(rua, pedaco, false, i, regioes[reg]); pedaco = [a]; }
      reg = r; pedaco.push(b);
    }
    fitas(rua, pedaco, false, i, regioes[reg]);
  });
  for (const g of Object.values(regioes)) { cena.add(g); mesclar(g, { volume }); g.userData.ret = new THREE.Box3().setFromObject(g); }
  // faixas de pedestre (zebra): só visual, no grupo "ruas" mesclado (0 chamadas); não entram em solidos nem nas rotas
  const matFaixa = matNovo({ color: 0xffffff }); // material próprio (o mat(0xffffff) é compartilhado por cor)
  matFaixa.color.setRGB(1.2, 1.2, 1.2); // branco nítido: compensa o escurecimento de contato do shader (0,85 rente ao chão); vira cor por vértice na mesclagem
  // zebra atravessando uma rua de largura w no ponto (xc, zc); aoLongoDeX = a rua corre ao longo de x (as listras ficam deitadas em x)
  const faixa = (xc, zc, aoLongoDeX, w) => {
    for (let d = -w / 2 + 0.8; d <= w / 2 - 0.6; d += 1.35) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(aoLongoDeX ? 3 : 0.8, aoLongoDeX ? 0.8 : 3), matFaixa);
      l.rotation.x = -Math.PI / 2; l.position.set(aoLongoDeX ? xc : xc + d, 0.1, aoLongoDeX ? zc + d : zc); ruas.add(l);
    }
  };
  for (const s of SEMAFOROS) {
    for (const lado of [-1, 1]) { faixa(s.x, s.z + lado * (s.wX / 2 + 1.8), false, s.wZ); faixa(s.x + lado * (s.wZ / 2 + 1.8), s.z, true, s.wX); }
    const postes = [];
    const gs = new THREE.Group();
    for (const [sx, sz, rot] of [[1, 1, Math.PI], [-1, -1, 0], [1, -1, -Math.PI / 2], [-1, 1, Math.PI / 2]]) {
      const p = semaforo();
      p.position.set(s.x + sx * (s.wZ / 2 + 0.8), 0.07, s.z + sz * (s.wX / 2 + 0.8));
      p.rotation.y = rot;
      p.userData.eixo = rot === 0 || rot === Math.PI ? "z" : "x";
      gs.add(p); postes.push(p);
      solidos.push({ x0: p.position.x - 0.25, x1: p.position.x + 0.25, z0: p.position.z - 0.25, z1: p.position.z + 0.25, y1: 5 });
    }
    cena.add(gs);
    mesclar(gs, { volume }); // só as luzes ficam separadas
    semaforos.push({ ...s, postes, fase: (s.x + s.z) % 200 ? 0 : 6, grupo: gs });
  }
  // cruzamentos principais sem semáforo (os T das ruas de antes), a frente da praça/biblioteca nas avenidas e as escolas
  for (const [x, z, aoLongoDeX, w] of [
    [0, 50, true, 12], [0, -50, true, 12], // praça ↔ av. da Alegria (sul) e ↔ biblioteca (av. da Esperança, norte)
    [-50, 6.3, false, 11], [-50, -6.3, false, 11], [-57.3, 0, true, 9], // Rua das Casas × Rua do Sol
    [50, 6.8, false, 11], [50, -6.8, false, 11], [57.3, 0, true, 10], // Rua do Comércio × Rua da Lua
    [-50, -88.7, false, 11], [-50, -101.3, false, 11], [-57.3, -95, true, 9], // Rua das Flores × Rua do Sol
    [-6.8, -140, true, 12], [6.8, -140, true, 12], [0, -147.8, false, 10], // Rua do Mirante × Av. do Contorno
    [-195, 0, true, 9], [195, 0, true, 10], // Educarte Kids I e Kids II
  ]) faixa(x, z, aoLongoDeX, w);
  cena.add(ruas);
  mesclar(ruas, { volume });

  // ---------- lugares
  const fabrica = { igreja: P.igrejaReviver, hospital: P.hospital, bombeiros: P.bombeiros, biblioteca: P.biblioteca, mercado: P.mercado, padaria: P.padaria, sorveteria: P.sorveteria, kids1: P.educarteKids1, kids2: P.educarteKids2, veterinario: P.veterinario, lavarapido: P.lavaRapido, estudio: P.estudio, correios: P.correios, mirante: P.mirante };
  for (const l of LUGARES) {
    lugares.push({ ...l });
    if (l.novo) continue; // os dos bairros novos são montados no fim (a cidade de antes fica igualzinha)
    const ox = l.x - l.dir[0] * l.recuo, oz = l.z - l.dir[1] * l.recuo;
    if (l.parceiro?.tipo === "contabilidade") { por(P.escritorioCrescente(l), ox, oz, l.rot); continue; } // prédio-escritório (sem foto)
    if (FACHADAS[l.parceiro?.tipo]) { // parceira com fachada inventada (predios-parceiros.js)
      const n0 = solidos.length;
      const S = por(FACHADAS[l.parceiro.tipo](l), ox, oz, l.rot);
      Object.assign(lugares.at(-1), { porta: mundoDe(ox, oz, l.rot, ...S.porta), topo: S.topo, origem: [ox, oz, l.rot] });
      // o Sítio Floresça tem vida própria (portão, Tia Regina, Duck, Ale: sitio.js); recebe as colisões dele já no mundo
      if (S.vivo) lugares.at(-1).sitio = S.vivo({ origem: [ox, oz, l.rot], solidos: solidos.slice(n0), lugar: lugares.at(-1) });
      if (S.pessoa) { // quem fica na porta: cada um respira, olha em volta e só anima com o bloco visível
        const q = criarPessoa(S.pessoa.id);
        q.grupo.userData.dinamico = true; q.grupo.position.set(S.pessoa.x, 0.09, S.pessoa.z);
        S.grupo.add(q.grupo);
        anima.pessoas.push(q);
        const [px, pz] = mundoDe(ox, oz, l.rot, S.pessoa.x, S.pessoa.z);
        lugares.at(-1).pessoaNaPorta = { m: q, x: px, z: pz }; // as missões usam este mesmo boneco (nada de dois iguais)
      }
      continue;
    }
    if (l.parceiro) {
      const s = { x0: 0, x1: 0, z0: 0, z1: 0, y1: 20 };
      solidos.push(s);
      const S = P.lojaDeParceiro(l, (w) => {
        const r = retMundo(ox, oz, l.rot, { x0: -w / 2 - 0.2, x1: w / 2 + 0.2, z0: -7.7, z1: 0.2, y1: 20 });
        Object.assign(s, r);
      });
      por(S, ox, oz, l.rot);
      s.topo = topoDe(S.grupo);
      continue;
    }
    if (fabrica[l.id]) {
      const S = por(fabrica[l.id](l), ox, oz, l.rot);
      if (S.foto) lugares.at(-1).fotoGrupo = S.foto;
      if (S.frente) Object.assign(lugares.at(-1), { frente: S.frente, origem: [ox, oz, l.rot] });
    }
  }
  // praça (centro) e parque e fazendinha (em coordenadas do mundo)
  const pr = por(P.praca(PRACA.r), PRACA.x, PRACA.z, 0);
  anima.aguas.push(pr.agua); anima.jatos.push(pr.jato);
  const pq = por(P.parque(PARQUE, LAGO, PLAYGROUND), 0, 0, 0, blocoEm(LAGO.x, LAGO.z));
  anima.patos.push(...pq.patos); anima.aguas.push(pq.agua);
  const fz = por(P.fazendinha(LUGARES.find((l) => l.id === "fazendinha"), FAZENDA), 0, 0, 0, blocoEm((FAZENDA.x0 + FAZENDA.x1) / 2, (FAZENDA.z0 + FAZENDA.z1) / 2));
  anima.bichos.push(...fz.bichos);
  // esportes (sudeste) e quadra + horta (nordeste)
  const cp = por(P.campoFutebol(CAMPO, ESPORTES), 0, 0, 0, blocoEm(CAMPO.x, CAMPO.z));
  anima.bola = cp.bola;
  por(P.quadra(QUADRA), 0, 0, 0, blocoEm(QUADRA.x0, QUADRA.z0));
  por(P.hortaComunitaria(HORTA), 0, 0, 0, blocoEm(HORTA.x0, HORTA.z0));
  // bairros de fora: parquinho de bebê (Kids I), quadra da Kids II, heliponto e praia
  por(P.parquinhoBebe(PARQUINHO_BEBE), 0, 0, 0, blocoEm(PARQUINHO_BEBE.x0, PARQUINHO_BEBE.z0));
  por(P.quadra(PATIO_KIDS2), 0, 0, 0, blocoEm(PATIO_KIDS2.x0, PATIO_KIDS2.z0));
  por(P.heliponto(HELIPONTO), 0, 0, 0, blocoEm(HELIPONTO.x, HELIPONTO.z));
  const pr2 = por(P.praia(PRAIA, LAGO2), 0, 0, 0, blocoEm(LAGO2.x, LAGO2.z));
  anima.aguas.push(pr2.agua); anima.boias = pr2.boias;
  // placa da fazendinha e do parque na calçada
  for (const [id, cor] of [["fazendinha", "#d6402f"], ["parque", "#3c9a4a"], ["campo", "#2f6fc0"], ["praia", "#ff7a00"], ["heliponto", "#2f3440"]]) {
    const l = LUGARES.find((q) => q.id === id);
    const g = new THREE.Group();
    for (const s of [-1, 1]) { const p = malha(new THREE.CylinderGeometry(0.1, 0.12, 3.2, 8), mat(0x9a6232)); p.position.set(s * 2.6, 1.6, 0); g.add(p); }
    const placaL = caixa(6, 1.3, 0.2, mat(0xf3c99a)); placaL.position.y = 2.9; g.add(placaL);
    const txt = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.1), matNovo({ map: placaTexto(l.nome, cor), transparent: true, alphaTest: 0.4 }));
    txt.position.set(0, 2.9, 0.12); g.add(txt);
    const [dx, dz] = l.dir, lado = dz ? [1, 0] : [0, 1]; // ao lado da entrada, um pouco para dentro
    g.position.set(l.x + lado[0] * 7 - dx * 1.5, 0.07, l.z + lado[1] * 7 - dz * 1.5); g.rotation.y = l.rot;
    blocoEm(l.x, l.z).add(g);
    const sx = dz ? 2.8 : 0.3, sz = dz ? 0.3 : 2.8;
    solidos.push({ x0: g.position.x - sx, x1: g.position.x + sx, z0: g.position.z - sz, z1: g.position.z + sz, y1: 0.6 });
  }

  // ---------- Bairro das Casas
  for (const l of LOTES) {
    const ox = l.x - l.dir[0] * LOTE.recuo, oz = l.z - l.dir[1] * LOTE.recuo;
    const { grupo, solidos: sl } = casa(l);
    por({ grupo, solidos: sl }, ox, oz, l.rot);
    const [px, pz] = mundoDe(ox, oz, l.rot, ...grupo.userData.porta);
    casas.push({ lote: l, grupo, placa: grupo.userData.placa, porta: [px, pz], frente: [l.x, l.z] });
  }

  // ---------- prédios de enchimento
  for (const p of PREDIOS) {
    const S = P.predioEnchimento(p);
    // frente do prédio: meio da face que olha para dir
    const [dx, dz] = p.dir, deitado = Math.abs(dx) > 0.5;
    const meia = (deitado ? p.x1 - p.x0 : p.z1 - p.z0) / 2;
    por(S, p.cx + dx * meia, p.cz + dz * meia, p.rot);
  }

  // ---------- calçadas: postes de luz e árvores (desviam de tudo), canteiros com florzinhas
  for (const rua of RUAS.filter((r) => !r.nova)) {
    const pts = densificar(rua.pts, rua.fechada, 11), ns = normais(pts, rua.fechada);
    pts.forEach(([x, z], i) => {
      for (const s of [1, -1]) {
        const lado = (i + (s > 0 ? 0 : 1)) % 2;
        const off = rua.w / 2 + CALCADA - 0.6;
        const ax = x + ns[i][0] * s * off, az = z + ns[i][1] * s * off;
        if (distRua(ax, az, rua).d < 3 || Math.abs(ax) > BORDA_ANTIGA - 4 || Math.abs(az) > BORDA_ANTIGA - 4) continue;
        if (ocupado(ax, az, 1.2) || SEMAFOROS.some((q) => Math.hypot(q.x - ax, q.z - az) < 12)) continue;
        if (LUGARES.some((l) => Math.hypot(l.x - ax, l.z - az) < 5) || LOTES.some((l) => Math.abs(l.x - ax) < 2 && Math.abs(l.z - az) < 3)) continue;
        if (Math.hypot(ax - LARGADA.x, az - LARGADA.z) < 6) continue;
        if (lado === 0) {
          const p = P.posteLuz(); p.position.set(ax, 0.07, az); blocoEm(ax, az).add(p);
          solidos.push({ x0: ax - 0.25, x1: ax + 0.25, z0: az - 0.25, z1: az + 0.25, y1: 5 });
        } else {
          const a = arvoreReal(0.8 + rnd() * 0.25, i); a.position.set(ax, 0.07, az); blocoEm(ax, az).add(a);
          solidos.push({ x0: ax - 0.45, x1: ax + 0.45, z0: az - 0.45, z1: az + 0.45, y1: 6 });
        }
      }
    });
  }
  // ---------- adereços de calçada (Mundo Vivo, etapa 4): lixeira, hidrante, banco, floreira e cercadinho, no meio do caminho
  // entre um poste e uma árvore, na MESMA linha deles (a 2,4 m do meio-fio: sobra 2,1 m de passagem; os moradores andam a
  // 1,4 m). Tudo entra na mesclagem do bloco (0 chamadas). Sólidos (menos a cerca) entram em solidos. Nunca em cima de:
  // faixa de rodagem de qualquer rua, vaga, largada, porta/portão (lugares e casas), ponto de missão ou de pessoa,
  // bandeira/área de desafio, ponto das parceiras, semáforo.
  const estatAd = { colocados: 0 }; // quantos adereços entraram e por que os outros não (os testes leem)
  if (aderecos) {
    const pontos = [];
    const junta = (o, prof = 0) => { if (!o || typeof o !== "object" || prof > 6) return; if (typeof o.x === "number" && typeof o.z === "number") pontos.push([o.x, o.z]); for (const v of Object.values(o)) if (v && typeof v === "object") junta(v, prof + 1); };
    junta(MISSOES); junta(PESSOAS_PORTA); junta(DESAFIOS); junta(HELI); junta(BARCO);
    for (const [x, z] of PONTOS_PARCEIROS) pontos.push([x, z]);
    for (const v of VAGAS) pontos.push([v.x, v.z]);
    for (const l of lugares) if (l.porta) pontos.push(l.porta);
    for (const c of casas) pontos.push(c.porta);
    const nega = (motivo) => { estatAd[motivo] = (estatAd[motivo] ?? 0) + 1; return false; };
    const livre = (ax, az, rua) => {
      // nunca na pista (distRua = distância até a beira da rua mais perto; < 0 é dentro) nem perto de outra rua (cruzamento)
      if (distRua(ax, az).d < 0.3 || distRua(ax, az, rua).d < 3 || Math.abs(ax) > BORDA_ANTIGA - 4 || Math.abs(az) > BORDA_ANTIGA - 4) return nega("pista");
      if (ocupado(ax, az, 1.2)) return nega("ocupado");
      if (SEMAFOROS.some((q) => Math.hypot(q.x - ax, q.z - az) < 12)) return nega("semaforo");
      if (LUGARES.some((l) => Math.hypot(l.x - ax, l.z - az) < 5) || LOTES.some((l) => Math.abs(l.x - ax) < 2.5 && Math.abs(l.z - az) < 3.5)) return nega("lugar");
      if (Math.hypot(ax - LARGADA.x, az - LARGADA.z) < 6) return nega("largada");
      if (pontos.some(([x, z]) => Math.hypot(x - ax, z - az) < 4)) return nega("ponto");
      if (AREAS_DESAFIOS.some((r) => ax > r.x0 - 2 && ax < r.x1 + 2 && az > r.z0 - 2 && az < r.z1 + 2)) return nega("desafio");
      estatAd.colocados++;
      return true;
    };
    const TIPOS = ["lixeira", "banco", "hidrante", "floreira", "cerca", "banco", "lixeira", "floreira"];
    let k = 0;
    for (const rua of RUAS.filter((r) => !r.nova)) {
      const pts = densificar(rua.pts, rua.fechada, 11), ns = normais(pts, rua.fechada), total = rua.fechada ? pts.length : pts.length - 1;
      for (let i = 0; i < total; i++) {
        const j = (i + 1) % pts.length, mx = (pts[i][0] + pts[j][0]) / 2, mz = (pts[i][1] + pts[j][1]) / 2;
        const tx = pts[j][0] - pts[i][0], tz = pts[j][1] - pts[i][1], tl = Math.hypot(tx, tz) || 1, nx = (ns[i][0] + ns[j][0]) / 2, nz = (ns[i][1] + ns[j][1]) / 2, nl = Math.hypot(nx, nz) || 1;
        for (const s of [1, -1]) {
          const tipo = TIPOS[k++ % TIPOS.length];
          const off = rua.w / 2 + CALCADA - 0.6, ax = mx + (nx / nl) * s * off, az = mz + (nz / nl) * s * off;
          if (!livre(ax, az, rua)) continue;
          const g = tipo === "lixeira" ? P.lixeira() : tipo === "hidrante" ? P.hidrante() : tipo === "floreira" ? P.floreira() : tipo === "cerca" ? P.cerca(3) : P.banco();
          g.position.set(ax, 0.07, az);
          // vira para a rua: o eixo x da peça fica ao longo da calçada e a frente (−z local) olha para o meio-fio
          g.rotation.y = Math.atan2(tx / tl, tz / tl) + (s > 0 ? Math.PI / 2 : -Math.PI / 2) + (tipo === "banco" ? Math.PI : 0);
          if (tipo !== "cerca" && !aderecosLonge) g.userData.detalhe = true; else if (tipo === "banco" && aderecosLonge) g.userData.detalhe = false;
          blocoEm(ax, az).add(g);
          if (tipo !== "cerca") { const r = tipo === "banco" || tipo === "floreira" ? (tipo === "banco" ? 1.35 : 0.65) : 0.3, rz = tipo === "banco" || tipo === "floreira" ? 0.35 : 0.3; const ao = Math.abs(tx / tl) > 0.5; solidos.push({ x0: ax - (ao ? r : rz), x1: ax + (ao ? r : rz), z0: az - (ao ? rz : r), z1: az + (ao ? rz : r), y1: 1.2 }); }
        }
      }
    }
  }
  // árvores e moitas nos terrenos vazios (enchem a cidade sem pesar)
  for (let n = 0; n < 560; n++) {
    const x = (rnd() - 0.5) * 2 * (BORDA_ANTIGA - 6), z = (rnd() - 0.5) * 2 * (BORDA_ANTIGA - 6);
    if (distRua(x, z).d < CALCADA + 2 || ocupado(x, z, 3) || Math.hypot(x - LARGADA.x, z - LARGADA.z) < 8) continue;
    if (VAGAS.some((v) => Math.hypot(v.x - x, v.z - z) < 9)) continue;
    if (rnd() < 0.7) {
      const a = arvoreReal(0.9 + rnd() * 0.6, n); a.position.set(x, 0.03, z); a.rotation.y = rnd() * 6; blocoEm(x, z).add(a);
      solidos.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5, y1: 6 });
    } else {
      const m = malha(new THREE.IcosahedronGeometry(0.9, 1), mat(0x5cc443), { sombra: false }); m.scale.set(1.3, 0.8, 1.1); m.position.set(x, 0.5, z); m.userData.detalhe = true; blocoEm(x, z).add(m);
      for (let k = 0; k < 4; k++) { const f = malha(new THREE.IcosahedronGeometry(0.13, 0), mat([0xff5fa2, 0xffcc1f, 0xffffff][k % 3]), { sombra: false }); f.userData.detalhe = true; f.position.set(x + (rnd() - 0.5) * 2, 0.95 + rnd() * 0.2, z + (rnd() - 0.5) * 1.6); blocoEm(x, z).add(f); }
    }
  }

  // ---------- bairros novos (Vila dos Ipês, Bairro das Palmeiras, Jardim das Estrelas, Torres do Horizonte) e a orla
  // do Mar Azul com a Ilha da Alegria. Tudo depois da cidade de antes e com sorteio próprio: lá nada muda de lugar.
  const rnd2 = aleatorio(5081);
  const fabricaNova = { floricultura: P.floricultura, pizzaria: P.pizzaria, farmacia: P.farmacia, brinquedos: P.brinquedos, museu: P.museu, observatorio: P.observatorio, salvavidas: postoSalvaVidas, quiosque: quiosqueCoco };
  for (const l of LUGARES.filter((q) => q.novo && fabricaNova[q.id])) por(fabricaNova[l.id](l), l.x - l.dir[0] * l.recuo, l.z - l.dir[1] * l.recuo, l.rot);
  // Ateliê Ponta do Lápis (loja de visual): a porta em coordenadas do mundo, para a ação "entrar na loja"
  { const l = LUGARES.find((q) => q.id === "atelie"), ox = l.x - l.dir[0] * l.recuo, oz = l.z - l.dir[1] * l.recuo, S = por(atelie(l), ox, oz, l.rot);
    Object.assign(lugares.find((q) => q.id === "atelie"), { porta: mundoDe(ox, oz, l.rot, ...S.porta), topo: topoDe(S.grupo) }); }
  for (const pc of PRACAS_NOVAS) { const S = por(P.praca(pc.r), pc.x, pc.z, 0); anima.aguas.push(S.agua); anima.jatos.push(S.jato); }
  for (const p of PREDIOS_NOVOS) {
    const [dx, dz] = p.dir, meia = (Math.abs(dx) > 0.5 ? p.x1 - p.x0 : p.z1 - p.z0) / 2;
    por(P.predioEnchimento(p), p.cx + dx * meia, p.cz + dz * meia, p.rot);
  }
  // o mar, a areia e a ilha (fora dos blocos), os píeres, a roda-gigante e os enfeites da orla
  const orla = marEAreia(); cena.add(orla.grupo); anima.aguas.push(orla.mar);
  regioes.orla = orla.grupo; orla.grupo.userData.ret = new THREE.Box3().setFromObject(orla.grupo); // longe da orla, nem desenha
  for (const pi of PIERS) por(pier(pi), 0, 0, 0, blocoEm((pi.x0 + pi.x1) / 2, (pi.z0 + pi.z1) / 2));
  const roda = por(rodaGigante(), RODA.x, RODA.z, 0);
  anima.roda = roda;
  const livreOrla = (x, z, f) => !ocupado(x, z, f) && !LUGARES.some((l) => l.novo && Math.hypot(l.x - x, l.z - z) < f + 4) && !PIERS.some((pi) => x > pi.x0 - f && x < pi.x1 + f && z > pi.z0 - f && z < pi.z1 + f);
  for (const it of enfeitesOrla(livreOrla)) { it.S.grupo.rotation.y += it.rot; por(it.S, it.x, it.z, it.S.grupo.rotation.y); }
  // placas das praças novas e da orla, como as do parque
  for (const [id, cor] of [["pracaIpes", "#c2477a"], ["pracaPalmeiras", "#1f8a7a"], ["pracaEstrelas", "#7a52c9"], ["orla", "#00b5f0"], ["ilha", "#ff7a00"]]) {
    const l = LUGARES.find((q) => q.id === id), g = placaDeLugar(l.nome, cor);
    const pc = PRACAS_NOVAS.find((q) => q.id === id);
    const [px, pz] = pc ? [pc.x + pc.r + 3, pc.z + pc.r + 3] : [l.x + 7, l.z - l.dir[1] * 1.5];
    g.position.set(px, 0.07, pz); g.rotation.y = pc ? Math.PI / 4 : Math.PI; blocoEm(px, pz).add(g); // a da orla olha para a rua
    solidos.push({ x0: px - 1.8, x1: px + 1.8, z0: pz - 1.8, z1: pz + 1.8, y1: 0.6 });
  }
  // calçadas das ruas novas: postes e árvores (como nas de antes)
  for (const rua of RUAS.filter((r) => r.nova)) {
    const pts = densificar(rua.pts, rua.fechada, 13), ns = normais(pts, rua.fechada);
    pts.forEach(([x, z], i) => {
      for (const s of [1, -1]) {
        const off = rua.w / 2 + CALCADA - 0.6, ax = x + ns[i][0] * s * off, az = z + ns[i][1] * s * off;
        if (Math.max(Math.abs(ax), Math.abs(az)) < BORDA_ANTIGA || Math.abs(ax) > BORDA - 4 || az < -BORDA + 4 || az > ORLA.z0 - 1) continue;
        if (distRua(ax, az, rua).d < 3 || ocupado(ax, az, 1.2)) continue;
        if (LUGARES.some((l) => Math.hypot(l.x - ax, l.z - az) < 5) || LOTES.some((l) => Math.abs(l.x - ax) < 3 && Math.abs(l.z - az) < 3)) continue;
        if ((i + (s > 0 ? 0 : 1)) % 2 === 0) {
          const p = P.posteLuz(); p.position.set(ax, 0.07, az); blocoEm(ax, az).add(p);
          solidos.push({ x0: ax - 0.25, x1: ax + 0.25, z0: az - 0.25, z1: az + 0.25, y1: 5 });
        } else {
          const a = arvoreReal(0.8 + rnd2() * 0.25, i); a.position.set(ax, 0.07, az); blocoEm(ax, az).add(a);
          solidos.push({ x0: ax - 0.45, x1: ax + 0.45, z0: az - 0.45, z1: az + 0.45, y1: 6 });
        }
      }
    });
  }
  // árvores e moitas nos terrenos vazios dos bairros novos (bosquinhos), nunca na areia nem no mar
  for (let n = 0; n < 620; n++) {
    const x = (rnd2() - 0.5) * 2 * (BORDA - 8), z = -BORDA + 8 + rnd2() * (ORLA.z0 - 4 + BORDA - 8);
    if (Math.max(Math.abs(x), Math.abs(z)) < BORDA_ANTIGA + 1 || distRua(x, z).d < CALCADA + 2 || ocupado(x, z, 3)) continue;
    if (LUGARES.some((l) => l.novo && Math.hypot(l.x - x, l.z - z) < 8)) continue;
    if (rnd2() < 0.75) {
      const a = arvoreReal(0.9 + rnd2() * 0.6, n); a.position.set(x, 0.03, z); a.rotation.y = rnd2() * 6; blocoEm(x, z).add(a);
      solidos.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5, y1: 6 });
    } else {
      const m = malha(new THREE.IcosahedronGeometry(0.9, 1), mat(0x5cc443), { sombra: false }); m.scale.set(1.3, 0.8, 1.1); m.position.set(x, 0.5, z); m.userData.detalhe = true; blocoEm(x, z).add(m);
    }
  }
  void naMar; void ILHA;

  // ---------- mescla cada bloco (o que é fixo vira poucas malhas)
  let malhas = 0;
  for (const b of blocos) malhas += mesclar(b, { volume });
  for (const c of casas) mesclar(c.grupo.userData.paredes, { volume }); // cada casa com as paredes à parte (cor trocável)
  for (const l of lugares) if (l.frente) for (const g of Object.values(l.frente)) mesclar(g); // cada frente da Kids II à parte (só uma aparece)

  // retângulo de cada bloco (para a distância até o jogador)
  for (const g of blocos) { const [i, j] = g.userData.bloco; g.userData.ret = { x0: GRADE0 + i * BLOCO, x1: GRADE0 + (i + 1) * BLOCO, z0: GRADE0 + j * BLOCO, z1: GRADE0 + (j + 1) * BLOCO }; }
  const api = {
    solidos, circulos, lugares, casas, semaforos, anima, blocos, malhas, aderecos: estatAd,
    // frente da Educarte Kids II: 0 = a antiga · 1 = só a parede (obra) · 2 = perfis de alumínio · 3 = pele de vidro inteira
    frenteKids2(fase) { const f = lugares.find((l) => l.id === "kids2")?.frente; if (!f) return; f.antiga.visible = fase === 0; f.perfis.visible = fase >= 2; f.vidro.visible = fase >= 3; },
    alcance: 140, // neblina: além disso não se vê nada
    detalheAte: 36, // flores, cercas, moitas e bancos só nos blocos perto
    semaforoAte: null, // até onde os semáforos aparecem (null = até a neblina)
    sombraAte: Infinity, // até que distância (do retângulo do bloco) as malhas mescladas fazem sombra (qualidade "media": só perto)
    // mostra só o bloco do jogador e os vizinhos que estão dentro da neblina; detalhe só perto
    visibilidade(x, z) {
      const [bi, bj] = blocoDe(x, z);
      // semáforos (as luzes acendem, não dá para mesclar): longe, na neblina, nem desenham
      // no celular (semaforoAte) somem antes da neblina: cada um custa 4 chamadas (poste e as 3 luzes) e de longe é um pontinho
      for (const s of semaforos) s.grupo.visible = api.alcance > 1000 || Math.hypot(s.x - x, s.z - z) < (api.semaforoAte ?? api.alcance + 15);
      for (const g of Object.values(regioes)) { const b = g.userData.ret; g.visible = api.alcance > 1000 || Math.hypot(Math.max(b.min.x - x, 0, x - b.max.x), Math.max(b.min.z - z, 0, z - b.max.z)) < api.alcance; }
      for (const g of blocos) {
        const [i, j] = g.userData.bloco, r = g.userData.ret;
        const d = Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));
        g.visible = (api.alcance > 1000 || (Math.abs(i - bi) <= 1 && Math.abs(j - bj) <= 1)) && d < api.alcance; // alcance enorme = foto de cima (tudo)
        const det = d < api.detalheAte;
        if (g.userData.det !== det) {
          g.userData.det = det;
          for (const m of g.children) if (m.userData.mesclada && m.userData.detalhe) m.visible = det;
        }
        const somb = d < api.sombraAte;
        if (g.userData.somb !== somb) {
          g.userData.somb = somb;
          for (const m of g.children) if (m.userData.mesclada && m.userData.sombra) m.castShadow = somb;
        }
      }
    },
    blocosVisiveis: () => blocos.filter((g) => g.visible).length,
    get sitio() { return lugares.find((q) => q.sitio)?.sitio ?? null; }, // o Sítio Floresça (sitio.js)
    atualizar(dt, t) {
      for (const p of anima.patos) { p.a += p.v * dt; p.p.position.set(LAGO.x + Math.cos(p.a) * p.r, 0.12 + Math.sin(t * 3 + p.r) * 0.03, LAGO.z + Math.sin(p.a) * p.r); p.p.rotation.y = -p.a; }
      for (const j of anima.jatos) j.scale.y = 1 + Math.sin(t * 6) * 0.08;
      for (const q of anima.pessoas) { let v = true; for (let o = q.grupo; o && v; o = o.parent) v = o.visible; if (v) q.atualizar(dt, { modo: "parado" }); } // só quem está perto
      TEX.agua.offset.set(t * 0.012, t * 0.02); // a água corre devagar
      if (anima.roda) anima.roda.girar(t * RODA_VEL); // a roda-gigante não para (uma volta a cada ~30 s)
      if (anima.boias) for (const [i, b] of anima.boias.entries()) b.position.y = 0.2 + Math.sin(t * 1.8 + i) * 0.08;
      if (anima.bola) { anima.bola.rotation.y = t * 0.6; anima.bola.position.y = 0.4 + Math.abs(Math.sin(t * 2.2)) * 0.5; }
      for (const b of anima.bichos) {
        const g = b.g, [ax, az] = b.alvo;
        const dx = ax - g.position.x, dz = az - g.position.z, d = Math.hypot(dx, dz);
        if (d < 0.3 || Math.random() < dt * 0.05) b.alvo = [b.x0 + Math.random() * (b.x1 - b.x0), b.z0 + Math.random() * (b.z1 - b.z0)];
        else if (Math.sin(t * 0.7 + b.fase) > -0.2) {
          g.position.x += (dx / d) * b.v * dt; g.position.z += (dz / d) * b.v * dt;
          g.rotation.y = Math.atan2(dx, dz);
          g.position.y = 0.03 + Math.abs(Math.sin(t * (b.tipo === "galinha" ? 14 : 6) + b.fase)) * (b.tipo === "galinha" ? 0.12 : 0.05);
        }
      }
    },
  };
  return api;
}

// placa de madeira com o nome do lugar (a mesma das placas do parque e da fazendinha), de frente para +z
function placaDeLugar(nome, cor) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) { const p = malha(new THREE.CylinderGeometry(0.1, 0.12, 3.2, 8), mat(0x9a6232)); p.position.set(s * 2.6, 1.6, 0); g.add(p); }
  const placaL = caixa(6, 1.3, 0.2, mat(0xf3c99a)); placaL.position.y = 2.9; g.add(placaL);
  const txt = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.1), matNovo({ map: placaTexto(nome, cor), transparent: true, alphaTest: 0.4 }));
  txt.position.set(0, 2.9, 0.12); g.add(txt);
  return g;
}
// texto de placa simples (nome do lugar)
function placaTexto(texto, cor) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 100;
  const x = c.getContext("2d");
  x.clearRect(0, 0, 512, 100);
  let tam = 66; x.font = `800 ${tam}px 'Baloo 2', sans-serif`;
  while (x.measureText(texto).width > 480) { tam -= 3; x.font = `800 ${tam}px 'Baloo 2', sans-serif`; }
  x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = cor; x.fillText(texto, 256, 54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
void pegadaDe;
