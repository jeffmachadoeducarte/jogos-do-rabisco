// Rabiscolândia: moedinhas pela cidade e faíscas (o "tempero" do jogo: toda ação responde com brilho e som).
//  - Moedinhas douradas girando nas calçadas, nas praças e no parque. Encostar pega: som, faíscas e +1 Rabiscoin.
//    Cada moedinha vale uma vez por dia (voltam todas no dia seguinte): quem passeia pela cidade inteira acha mais.
//    Pegar várias seguidas sobe o som (sequência) e, a cada 5, toca a festinha curta.
//  - Faíscas: um punhado de pontinhos (poeirinha ao cair de um pulo e ao correr, brilho ao pegar moedinha).
// Orçamento de desenho: 2 chamadas no total (as moedinhas são instâncias de uma malha; as faíscas são um Points só).
//
//   const M = criarMoedasCidade(cena, { mundo, fis, salvo, salvar, hoje, ganhar, sons, dizer, toque });
//   M.atualizar(dt, t, { x, y, z, veiculo, noChao, vel, ocupado }) a cada passo · M.estourar(x, y, z, cor, n) · M.destruir()

import { THREE, texturaCanvas } from "./base3d.js";
import { distRua, BORDA, PRACA, PRACAS_NOVAS, PARQUE, MAR } from "./mapa.js";

const QUANTAS = 150, AFASTADAS = 13, MAX_VISIVEIS = 40, MAX_FAISCAS = 160;
const OURO = 0xffc61a;

// sorteio com semente: as moedinhas nascem sempre nos mesmos lugares
function sorteador(semente) { let s = semente >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function lugaresDasMoedas(fis) {
  const rnd = sorteador(20261113), pontos = [], grade = new Map();
  const chave = (x, z) => `${Math.floor(x / AFASTADAS)},${Math.floor(z / AFASTADAS)}`;
  const longeDasOutras = (x, z) => {
    const gx = Math.floor(x / AFASTADAS), gz = Math.floor(z / AFASTADAS);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const p of grade.get(`${gx + a},${gz + b}`) ?? []) if (Math.hypot(p.x - x, p.z - z) < AFASTADAS) return false;
    return true;
  };
  const por = (x, z) => {
    if (fis.bate(x, z, 0.1, 0.7) || !longeDasOutras(x, z)) return false;
    const p = { id: pontos.length, x, z, y: fis.chaoEm(x, z, 0.3) + 0.95, fase: rnd() * 6.28 };
    pontos.push(p); const k = chave(x, z); if (!grade.has(k)) grade.set(k, []); grade.get(k).push(p);
    return true;
  };
  // praças e parque primeiro (lugares de brincar a pé), depois as calçadas da cidade toda
  const areas = [{ x0: PRACA.x - PRACA.r, x1: PRACA.x + PRACA.r, z0: PRACA.z - PRACA.r, z1: PRACA.z + PRACA.r, n: 5 }, ...PRACAS_NOVAS.map((p) => ({ x0: p.x - p.r, x1: p.x + p.r, z0: p.z - p.r, z1: p.z + p.r, n: 4 })), { ...PARQUE, n: 10 }];
  for (const a of areas) { let n = 0; for (let k = 0; k < 400 && n < a.n; k++) { const x = a.x0 + rnd() * (a.x1 - a.x0), z = a.z0 + rnd() * (a.z1 - a.z0); if (distRua(x, z).d > 1 && por(x, z)) n++; } }
  const lim = BORDA - 12, costa = (MAR?.costa ?? Infinity) - 14;
  for (let k = 0; k < 60000 && pontos.length < QUANTAS; k++) {
    const x = (rnd() * 2 - 1) * lim, z = (rnd() * 2 - 1) * lim;
    if (z > costa) continue;
    const d = distRua(x, z).d;
    if (d > 0.9 && d < 2.0) por(x, z); // na calçada, entre o meio-fio e a linha dos postes
  }
  return pontos;
}

export function criarMoedasCidade(cena, { mundo, fis, salvo, salvar, hoje, ganhar, sons, dizer, toque = false }) {
  void mundo;
  const pontos = lugaresDasMoedas(fis);
  const grupo = new THREE.Group(); grupo.userData.dinamico = true; cena.add(grupo);
  // ---- moedinhas (instâncias)
  // moeda de duas cores numa malha só: aro dourado escuro e miolo amarelo-claro um pouco mais grosso (cor por vértice)
  const geo = new THREE.BufferGeometry();
  {
    const pos = [], nrm = [], cor = [], c = new THREE.Color();
    for (const [g0, hex] of [[new THREE.CylinderGeometry(0.5, 0.5, 0.1, 20), 0xf0a800], [new THREE.CylinderGeometry(0.36, 0.36, 0.16, 20), 0xffe066]]) {
      const g = g0.toNonIndexed(); c.setHex(hex);
      pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array);
      for (let i = 0; i < g.attributes.position.count; i++) cor.push(c.r, c.g, c.b);
      g0.dispose(); g.dispose();
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  }
  geo.rotateX(Math.PI / 2);
  const matMoeda = new THREE.MeshPhongMaterial({ vertexColors: true, emissive: 0x7a4a00, emissiveIntensity: 0.5, specular: 0xffffff, shininess: 90 });
  const moedas = new THREE.InstancedMesh(geo, matMoeda, MAX_VISIVEIS);
  moedas.frustumCulled = false; moedas.castShadow = false; moedas.receiveShadow = false; moedas.count = 0;
  grupo.add(moedas);
  // ---- faíscas (um Points só)
  const posF = new Float32Array(MAX_FAISCAS * 3).fill(-999), corF = new Float32Array(MAX_FAISCAS * 3);
  const geoF = new THREE.BufferGeometry();
  geoF.setAttribute("position", new THREE.BufferAttribute(posF, 3)); geoF.setAttribute("color", new THREE.BufferAttribute(corF, 3));
  const texF = texturaCanvas(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,255,255,0.85)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  const faiscas = new THREE.Points(geoF, new THREE.PointsMaterial({ size: 0.62, map: texF, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true }));
  faiscas.frustumCulled = false; grupo.add(faiscas);
  const vivas = []; // { i, vx, vy, vz, vida, g }
  let livreF = 0;
  const _c = new THREE.Color();
  function estourar(x, y, z, cor = OURO, n = 12, { forca = 3.2, sobe = 3.6, g = 9, vida = 0.7, raio = 0.2 } = {}) {
    _c.setHex(cor);
    for (let k = 0; k < n; k++) {
      const i = livreF; livreF = (livreF + 1) % MAX_FAISCAS;
      const a = Math.random() * 6.28, f = forca * (0.4 + Math.random() * 0.6);
      posF[i * 3] = x + Math.cos(a) * raio; posF[i * 3 + 1] = y; posF[i * 3 + 2] = z + Math.sin(a) * raio;
      const tom = 0.8 + Math.random() * 0.2; corF[i * 3] = _c.r * tom; corF[i * 3 + 1] = _c.g * tom; corF[i * 3 + 2] = _c.b * tom;
      const j = vivas.findIndex((v) => v.i === i); if (j >= 0) vivas.splice(j, 1);
      vivas.push({ i, vx: Math.cos(a) * f, vy: sobe * (0.5 + Math.random() * 0.5), vz: Math.sin(a) * f, vida: vida * (0.7 + Math.random() * 0.5), g });
    }
    geoF.attributes.color.needsUpdate = true;
  }

  // ---- o que já foi pego hoje
  const dia = () => { const s = salvo(); const h = hoje(); if (!s.moedasCidade || s.moedasCidade.dia !== h) s.moedasCidade = { dia: h, ids: [] }; return s.moedasCidade; };
  let pegas = new Set(dia().ids), diaVisto = dia().dia;
  let perto = [], tPerto = 0, seguidas = 0, tSeguida = 0, avisou = false, noChaoAntes = true, tPoeira = 0, pegasAgora = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eixoY = new THREE.Vector3(0, 1, 0), esc = new THREE.Vector3(1, 1, 1), p3 = new THREE.Vector3();
  const alcance = toque ? 38 : 52;

  function pegar(p) {
    pegas.add(p.id); pegasAgora++;
    const d = dia(); d.ids.push(p.id); salvar();
    seguidas = tSeguida > 0 ? seguidas + 1 : 1; tSeguida = 3.5;
    estourar(p.x, p.y, p.z, OURO, 14); estourar(p.x, p.y, p.z, 0xffffff, 5, { forca: 1.6, sobe: 4.4 });
    if (seguidas % 5 === 0) { sons.checkpoint?.(); estourar(p.x, p.y + 0.4, p.z, 0xec2e8c, 10, { sobe: 5 }); estourar(p.x, p.y + 0.4, p.z, 0x00b5f0, 10, { sobe: 5 }); }
    ganhar(1, seguidas % 5 === 0 ? `✨ ${seguidas} seguidas!` : "");
    if (!avisou) { avisou = true; if (d.ids.length <= 1) dizer?.("Rabiscolândia", "Uma moedinha! Tem muitas escondidas pela cidade. Elas voltam todo dia. ✨", 3800); }
  }

  const api = {
    grupo, pontos, estourar,
    get pegasHoje() { return pegas.size; }, get total() { return pontos.length; }, get visiveis() { return moedas.count; }, get faiscasVivas() { return vivas.length; },
    atualizar(dt, t, { x, y, z, veiculo = null, noChao = true, vel = 0, ocupado = false }) {
      // virou o dia com o jogo aberto: as moedinhas voltam
      if (hoje() !== diaVisto) { diaVisto = dia().dia; pegas = new Set(dia().ids); tPerto = 0; }
      // quais estão perto (confere de vez em quando)
      tPerto -= dt;
      if (tPerto <= 0) {
        tPerto = 0.4;
        perto = ocupado ? [] : pontos.filter((p) => !pegas.has(p.id) && Math.abs(p.x - x) < alcance && Math.abs(p.z - z) < alcance).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z)).slice(0, MAX_VISIVEIS);
      }
      // pegar: a pé encostando; no carro, na moto ou na bicicleta, passando pertinho (do alto, de helicóptero, não)
      const raio = veiculo ? 2.7 : 1.35, alto = veiculo ? (veiculo.alt ?? 0) > 2.5 : false;
      if (!ocupado && !alto) for (const p of perto) if (!pegas.has(p.id) && Math.hypot(p.x - x, p.z - z) < raio && (veiculo || Math.abs(p.y - (y + 0.9)) < 1.7)) pegar(p);
      tSeguida -= dt;
      // desenhar as que sobraram: girando e subindo e descendo devagar
      let n = 0;
      for (const p of perto) {
        if (pegas.has(p.id)) continue;
        q.setFromAxisAngle(eixoY, t * 2.6 + p.fase);
        p3.set(p.x, p.y + Math.sin(t * 2.2 + p.fase) * 0.12, p.z);
        m4.compose(p3, q, esc); moedas.setMatrixAt(n++, m4);
      }
      moedas.count = n; moedas.instanceMatrix.needsUpdate = true;
      // poeirinha: ao cair de um pulo e, de leve, ao correr a pé
      if (!veiculo && !ocupado) {
        if (noChao && !noChaoAntes) estourar(x, y + 0.08, z, 0xe9dcc0, 7, { forca: 2.2, sobe: 1.2, g: 3, vida: 0.45, raio: 0.25 });
        tPoeira -= dt;
        if (noChao && vel > 5 && tPoeira <= 0) { tPoeira = 0.16; estourar(x, y + 0.06, z, 0xe9dcc0, 1, { forca: 0.7, sobe: 0.9, g: 2, vida: 0.4, raio: 0.15 }); }
      }
      noChaoAntes = noChao;
      // faíscas voando
      if (vivas.length) {
        for (let k = vivas.length - 1; k >= 0; k--) {
          const f = vivas[k], i = f.i * 3;
          f.vida -= dt;
          if (f.vida <= 0) { posF[i + 1] = -999; vivas.splice(k, 1); continue; }
          f.vy -= f.g * dt; posF[i] += f.vx * dt; posF[i + 1] += f.vy * dt; posF[i + 2] += f.vz * dt;
        }
        geoF.attributes.position.needsUpdate = true;
      }
    },
    destruir() { grupo.removeFromParent(); geo.dispose(); matMoeda.dispose(); geoF.dispose(); faiscas.material.dispose(); texF.dispose(); },
  };
  return api;
}
