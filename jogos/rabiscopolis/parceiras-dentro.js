// Rabiscolândia: as lojas parceiras por dentro (vieram da Rabiscópolis): Bella Cat Make Biju (5 acessórios nos
// pedestais, balcão de embrulhar presente, espelho de camarim, cerejeira rosa), Academia Rise Up (esteiras, halteres,
// colchonete, espelho e a faixa "Seu corpo é presente de Deus") e o escritório da Crescente Contabilidade (balcão com a
// contadora Elaine e o assistente Aurélio, bonecos de pessoas.js; mesas com computador, arquivos de gaveta e estante de pastas; missão Alvará da Escola). Montadas por montarSala (lugares-dentro.js) na
// primeira visita, no mesmo esquema das outras salas (14 × 9, vista em corte). A J.E Multimarcas vende só carros: não
// tem sala aqui (o pátio de carros é na rua).
//   montarBella(ctx) / montarRise(ctx) / montarCrescente(ctx), ctx = { g, ox, oz, inter, npcs, est, solido, I, npc, mesclar }

import { THREE, mat, malha, caixa, caixaRedonda, texturaCanvas, mesclar } from "./base3d.js";
import { alvara } from "./missoes-objetos.js";
import { criarPessoa } from "./pessoas.js";
import { PARCEIROS } from "../../src/parceiros.js";

const W = 14, D = 9;
// por enquanto os personagens parceiros não falam: a anfitriã narra (o balão mostra "Rabiscolândia")
const NARRA = "Rabiscolândia";
const tex = (w, h, f) => texturaCanvas(w, h, f);
const quadro = (t, w, h, emissivo = 0.35) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshToonMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: emissivo }));
const escrever = (c, s, x, y, tam, cor, peso = 800, max = 9999) => { c.font = `${peso} ${tam}px 'Baloo 2', sans-serif`; while (c.measureText(s).width > max && tam > 10) { tam -= 2; c.font = `${peso} ${tam}px 'Baloo 2', sans-serif`; } c.fillStyle = cor; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(s, x, y); };

// ------------------------------------------------------------------ Bella Cat
export const ACESSORIOS_BELLA = [
  { id: "laco", nome: "laço rosa", cor: 0xec2e8c },
  { id: "colar", nome: "colar de pérolas", cor: 0xf4f0ea },
  { id: "pulseira", nome: "pulseira azul", cor: 0x1fb5d6 },
  { id: "bolsa", nome: "bolsinha roxa", cor: 0x8e5bd8 },
  { id: "tiara", nome: "tiara amarela", cor: 0xffc928 },
];
// (copiado de jogos/cidade-do-rabisco/interiores.js · acessorio, no traço toon com contorno)
export function acessorio(id) {
  const g = new THREE.Group(), A = ACESSORIOS_BELLA.find((a) => a.id === id), m = mat(A.cor);
  const bola = (r, mm, x, y, z, c = 0.015) => { const b = malha(new THREE.SphereGeometry(r, 12, 10), mm, { contorno: c, sombra: false }); b.position.set(x, y, z); g.add(b); return b; };
  if (id === "laco") {
    for (const s of [-1, 1]) { const a = malha(new THREE.ConeGeometry(0.2, 0.36, 12), m, { contorno: 0.02, sombra: false }); a.rotation.z = s * Math.PI / 2; a.position.x = s * 0.17; g.add(a); }
    bola(0.09, m, 0, 0, 0);
    for (const s of [-1, 1]) { const f = caixaRedonda(0.07, 0.26, 0.03, m, { raio: 0.01, sombra: false }); f.position.set(s * 0.07, -0.16, 0); f.rotation.z = s * 0.3; g.add(f); }
  } else if (id === "colar") {
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; bola(0.045, m, Math.cos(a) * 0.24, Math.sin(a) * 0.28, 0, 0.008); }
    bola(0.08, mat(0xec2e8c), 0, -0.3, 0.02);
  } else if (id === "pulseira") {
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; bola(0.05, i % 3 ? m : mat(0xffffff), Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0, 0.008); }
  } else if (id === "bolsa") {
    g.add(caixaRedonda(0.42, 0.3, 0.16, m, { raio: 0.05, contorno: 0.02, sombra: false }));
    const alca = malha(new THREE.TorusGeometry(0.13, 0.025, 6, 16, Math.PI), m, { sombra: false }); alca.position.y = 0.15; g.add(alca);
    bola(0.04, mat(0xffcc1f), 0, 0.04, 0.09, 0);
  } else {
    g.add(malha(new THREE.TorusGeometry(0.24, 0.03, 6, 20, Math.PI), m, { contorno: 0.01, sombra: false }));
    for (const [x, y, r, cor] of [[0, 0.27, 0.07, 0xec2e8c], [-0.13, 0.22, 0.05, 0x1fb5d6], [0.13, 0.22, 0.05, 0x1fb5d6]]) bola(r, mat(cor), x, y, 0.01);
  }
  mesclar(g);
  return g;
}
const coracao = (ctx2, x, y, s, cor) => { ctx2.fillStyle = cor; ctx2.beginPath(); ctx2.moveTo(x, y + s * 0.35); ctx2.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.45, y - s, x, y - s * 0.45); ctx2.bezierCurveTo(x + s * 0.45, y - s, x + s, y - s * 0.4, x, y + s * 0.35); ctx2.fill(); };
export function montarBella({ g, ox, oz, inter, npcs, est, solido, I, npc }) {
  const fixo = new THREE.Group(); g.add(fixo);
  // letreiro no fundo (coração-gatinho + nome)
  const marca = tex(768, 256, (c, w, h) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h); coracao(c, 130, 140, 110, "#ec2e8c"); c.fillStyle = "#ffffff"; c.beginPath(); c.arc(130, 120, 32, 0, 7); c.fill(); escrever(c, "Bella Cat", 480, 100, 120, "#ec2e8c", 700); escrever(c, "MAKE BIJU", 480, 200, 60, "#333333"); void h; });
  const lm = quadro(marca, 3.0, 1.0); lm.rotation.y = -Math.PI / 2; lm.position.set(W / 2 - 0.16, 2.1, -1.2); fixo.add(lm); // parede da direita (o fundo tem o nome da loja)
  // estantes lilás com produtinhos coloridos (paredes do fundo, dos dois lados do letreiro)
  const cores = [0xec2e8c, 0xf7a8c8, 0xa98ce0, 0xffffff, 0xffcc1f, 0x7fd6ff, 0xd94a7a, 0xe6d6f5];
  const prods = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff), 80); prods.userData.dinamico = true;
  const m4 = new THREE.Matrix4(), cor = new THREE.Color(); let k = 0;
  for (const cx of [-4.4, 4.4]) {
    const e = caixaRedonda(3.4, 2.4, 0.5, mat(0xc9b3e6), { raio: 0.06, contorno: 0.03 }); e.position.set(cx, 1.2, -D / 2 + 0.4); fixo.add(e); solido(cx, -D / 2 + 0.4, 3.5, 0.6, 2.4);
    for (const y of [0.55, 1.15, 1.75]) {
      const p = caixa(3.2, 0.05, 0.5, mat(0xffffff), { sombra: false }); p.position.set(cx, y, -D / 2 + 0.7); fixo.add(p);
      for (let x = -1.45; x <= 1.45 && k < 80; x += 0.32, k++) { const alto = 0.14 + ((k * 7) % 5) * 0.04; m4.compose(new THREE.Vector3(ox + cx + x, y + 0.03 + alto / 2, oz - D / 2 + 0.72), new THREE.Quaternion(), new THREE.Vector3(0.18, alto, 0.18)); prods.setMatrixAt(k, m4); prods.setColorAt(k, cor.setHex(cores[(k * 5) % cores.length])); }
    }
  }
  prods.count = k;
  // pedestais em arco com os 5 acessórios
  const pedestais = ACESSORIOS_BELLA.map((A, i) => {
    const x = -4 + i * 2, z = -1.3 - Math.cos(((i - 2) / 4) * Math.PI) * 0.5;
    const base = malha(new THREE.CylinderGeometry(0.38, 0.42, 0.95, 18), mat(0xffffff), { contorno: 0.03 }); base.position.set(x, 0.48, z); fixo.add(base);
    const tampo = malha(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 18), mat(0xf7a8c8), { contorno: 0.02 }); tampo.position.set(x, 0.98, z); fixo.add(tampo);
    solido(x, z, 0.9, 0.9, 1.1);
    const obj = acessorio(A.id); obj.position.set(ox + x, 1.42, oz + z);
    const anel = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.04, 6, 28), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); anel.rotation.x = Math.PI / 2; anel.position.set(ox + x, 1.06, oz + z); anel.visible = false;
    return { ...A, x, z, obj, anel };
  });
  // balcão de presente (direita, perto da porta), com caixinhas e o rolo de fita
  const bx = 4.9, bz = 1.4;
  const balcao = caixaRedonda(1.0, 1.05, 2.6, mat(0xf7a8c8), { raio: 0.08, contorno: 0.04 }); balcao.position.set(bx, 0.53, bz); fixo.add(balcao);
  const topo = caixaRedonda(1.15, 0.08, 2.75, mat(0xffffff), { raio: 0.03 }); topo.position.set(bx, 1.1, bz); fixo.add(topo);
  for (const [dz, c, s] of [[0.7, 0xa98ce0, 0.35], [1.0, 0xec2e8c, 0.28]]) { const cx = caixaRedonda(s, s, s, mat(c), { raio: 0.04, contorno: 0.02 }); cx.position.set(bx, 1.14 + s / 2, bz + dz); fixo.add(cx); }
  const rolo = malha(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 14), mat(0xec2e8c), { contorno: 0.02 }); rolo.rotation.x = Math.PI / 2; rolo.position.set(bx, 1.27, bz - 0.9); fixo.add(rolo);
  solido(bx, bz, 1.1, 2.7, 1.2);
  // espelho de camarim com lampadinhas (parede da esquerda) e a cerejeira rosa (canto da direita, no fundo)
  const esp = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshToonMaterial({ color: 0xdff4ff, emissive: 0x9fd8ff, emissiveIntensity: 0.2 })); esp.rotation.y = Math.PI / 2; esp.position.set(-W / 2 + 0.16, 1.7, 1.6); fixo.add(esp);
  for (let i = 0; i < 6; i++) for (const dz of [-0.9, 0.9]) { const l = malha(new THREE.SphereGeometry(0.07, 8, 6), MAT_LAMP, { sombra: false }); l.position.set(-W / 2 + 0.2, 1.15 + i * 0.22, 1.6 + dz); fixo.add(l); }
  const pent = caixaRedonda(0.6, 0.8, 1.6, mat(0xffffff), { raio: 0.06, contorno: 0.03 }); pent.position.set(-W / 2 + 0.45, 0.4, 1.6); fixo.add(pent); solido(-W / 2 + 0.45, 1.6, 0.7, 1.7, 0.9);
  const tronco = malha(new THREE.CylinderGeometry(0.08, 0.11, 2.0, 8), mat(0x6b4a3a), { contorno: 0.03 }); tronco.position.set(6.1, 1.0, -3.7); fixo.add(tronco);
  for (const [x, y, z, r, c] of [[6.1, 2.2, -3.7, 0.55, 0xf7a8c8], [5.6, 2.0, -3.5, 0.4, 0xffd0e4], [6.5, 2.05, -3.9, 0.42, 0xffd0e4], [6.0, 2.6, -3.6, 0.38, 0xf7a8c8]]) { const f = malha(new THREE.IcosahedronGeometry(r, 1), mat(c), { contorno: 0.03 }); f.position.set(x, y, z); fixo.add(f); }
  solido(6.1, -3.7, 0.8, 0.8, 2);
  mesclar(fixo);
  const soltos = new THREE.Group(); soltos.add(prods); for (const p of pedestais) soltos.add(p.obj, p.anel);
  const embrulho = new THREE.Group(); embrulho.position.set(ox + bx, 1.32, oz + bz + 0.1); embrulho.visible = false; soltos.add(embrulho);
  const cxE = caixaRedonda(0.42, 0.34, 0.42, mat(0xa98ce0), { raio: 0.05, contorno: 0.02 }); embrulho.add(cxE);
  const fita = caixa(0.44, 0.06, 0.08, mat(0xec2e8c), { sombra: false }); fita.position.y = 0.18; embrulho.add(fita);
  const vend = npc("lapis", 0xa98ce0, 13, 0.78, "laco"); vend.grupo.position.set(ox + 5.9, 0.03, oz + 0.8); vend.grupo.rotation.y = -Math.PI / 2; npcs.push(vend);
  let tempo = 0;
  npcs.push({ grupo: soltos, atualizar: (dt) => { tempo += dt; for (const p of pedestais) { p.obj.rotation.y += dt * 0.8; p.obj.position.y = 1.42 + Math.sin(tempo * 2 + p.x) * 0.05; p.anel.visible = est.escolhido === p.id; } if (embrulho.visible) embrulho.rotation.y += dt; } });
  est.pedestais = pedestais.map((p) => p.id);
  for (const p of pedestais) I(`ped-${p.id}`, `💝 ${p.nome[0].toUpperCase()}${p.nome.slice(1)}`, p.x, p.z + 1.05, (api) => {
    est.escolhido = p.id; embrulho.visible = false;
    api.sons.moeda?.(); vend.acenar(2);
    api.falar(`cid-bella-${p.id}`);
    const presente = api.missao?.() === "presente";
    api.dizer(NARRA, presente ? `${p.nome[0].toUpperCase()}${p.nome.slice(1)}! Que lindo! Agora leve até o balcão para a Lápis Lilás embrulhar. 🎁` : `${p.nome[0].toUpperCase()}${p.nome.slice(1)}! Que lindo! Olhe todos os acessórios da Bella Cat. 💗`, 3600);
  }, 1.0);
  I("embrulhar", "🎁 Embrulhar para presente", bx - 1.0, bz, (api) => {
    if (!est.escolhido) { api.dizer(NARRA, "Primeiro escolha um acessório nos pedestais! 💝", 2600); return; }
    embrulho.visible = true; est.embrulhou = est.escolhido; vend.pular(); vend.acenar(2.5);
    api.sons.vitoria?.(); api.falar("cid-bella-embrulho");
    api.dizer(NARRA, "Pronto, embrulhadinho! Agora leve o presente até a Professora Lápis Turquesa, na porta da escola!", 4600);
    api.evento?.("embrulhou", { id: est.escolhido });
    setTimeout(() => (embrulho.visible = false), 1800);
  }, 1.3);
}
const MAT_LAMP = new THREE.MeshBasicMaterial({ color: 0xfff1b8 });

// ------------------------------------------------------------------ Rise Up
function halter(cor, escala = 1) {
  const g = new THREE.Group();
  const barra = malha(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), mat(0x9aa0a8), { sombra: false }); barra.rotation.z = Math.PI / 2; g.add(barra);
  for (const s of [-1, 1]) { const p = malha(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 14), mat(cor), { contorno: 0.015, sombra: false }); p.rotation.z = Math.PI / 2; p.position.x = s * 0.17; g.add(p); }
  g.scale.setScalar(escala);
  return g;
}
export function montarRise({ g, ox, oz, inter, npcs, est, solido, I, npc }) {
  const fixo = new THREE.Group(); g.add(fixo);
  // logo RISE UP e a faixa (parede do fundo)
  const logo = tex(512, 160, (c, w, h) => { c.fillStyle = "#151515"; c.fillRect(0, 0, w, h); c.fillStyle = "#ff7a00"; c.beginPath(); c.moveTo(110, 46); c.lineTo(140, 96); c.lineTo(80, 96); c.closePath(); c.fill(); escrever(c, "RISE UP", 300, 70, 88, "#ffffff", 900); escrever(c, "SAÚDE E BEM-ESTAR", 256, 132, 26, "#ff9a3c", 700); });
  const lg = quadro(logo, 2.8, 0.9, 0.4); lg.rotation.y = Math.PI / 2; lg.position.set(-W / 2 + 0.16, 2.1, -0.4); fixo.add(lg); // parede da esquerda (o fundo tem o nome da loja)
  const faixa = tex(1024, 160, (c, w, h) => { c.fillStyle = "#ff7a00"; c.fillRect(0, 0, w, h); c.fillStyle = "#fff6ea"; c.fillRect(10, 10, w - 20, h - 20); escrever(c, "Seu corpo é presente de Deus: cuide bem dele! ♥", w / 2, h / 2 + 4, 58, "#3a2a1a", 800, w - 60); });
  const fx = quadro(faixa, 5.6, 0.88, 0.4); fx.rotation.y = -Math.PI / 2; fx.position.set(W / 2 - 0.16, 2.2, 0); fixo.add(fx);
  // espelho grande no fundo
  const esp = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.4), new THREE.MeshToonMaterial({ color: 0xdff4ff, emissive: 0x9fd8ff, emissiveIntensity: 0.18 })); esp.position.set(0, 1.25, -D / 2 + 0.15); fixo.add(esp);
  // esteiras (a do meio é a da missão)
  const preto = mat(0x26282c), cinza = mat(0xb9bec6), laranja = mat(0xff7a00);
  const esteiras = [];
  for (const x of [-5.6, -3.8, -2.0]) {
    const base = caixaRedonda(1.0, 0.24, 2.4, preto, { raio: 0.06, contorno: 0.03 }); base.position.set(x, 0.12, -2.9); fixo.add(base);
    for (const s of [-1, 1]) { const p = caixaRedonda(0.08, 1.3, 0.08, cinza, { raio: 0.02 }); p.position.set(x + s * 0.42, 0.85, -3.95); fixo.add(p); const b = caixaRedonda(0.07, 0.07, 0.7, preto, { raio: 0.02 }); b.position.set(x + s * 0.46, 1.15, -3.6); fixo.add(b); }
    const painel = caixaRedonda(1.0, 0.34, 0.2, laranja, { raio: 0.05, contorno: 0.02 }); painel.position.set(x, 1.5, -4.0); painel.rotation.x = 0.5; fixo.add(painel);
    solido(x, -2.9, 1.1, 2.5, 0.25);
    esteiras.push({ x, z: -2.6 });
  }
  const cintaTex = tex(64, 256, (c, w, h) => { c.fillStyle = "#1b1c1f"; c.fillRect(0, 0, w, h); c.fillStyle = "#3a3d42"; for (let y = 0; y < h; y += 32) c.fillRect(0, y, w, 8); });
  cintaTex.wrapS = cintaTex.wrapT = THREE.RepeatWrapping; cintaTex.repeat.set(1, 2.2);
  const cinta = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 2.2), new THREE.MeshToonMaterial({ map: cintaTex })); cinta.rotation.x = -Math.PI / 2; cinta.position.set(ox - 3.8, 0.25, oz - 2.85);
  // estante de halteres (direita) e o colchonete laranja com o halter grande (rosa e azul, as cores do Rabisco)
  const est1 = caixaRedonda(0.8, 1.1, 2.8, preto, { raio: 0.05, contorno: 0.03 }); est1.position.set(W / 2 - 0.6, 0.55, -2.6); fixo.add(est1); solido(W / 2 - 0.6, -2.6, 0.9, 2.9, 1.2);
  [0xe63946, 0x1d6fe0, 0xffcc1f, 0x2bb24c, 0x8e6cff].forEach((c, i) => { for (const y of [0.75, 1.15]) { const h = halter(c, 0.85 + i * 0.05); h.position.set(W / 2 - 0.6, y, -3.7 + i * 0.55); h.rotation.y = Math.PI / 2; fixo.add(h); } });
  const colch = caixaRedonda(1.4, 0.08, 2.0, mat(0xff7a00), { raio: 0.03, sombra: false }); colch.position.set(3.4, 0.05, -1.6); fixo.add(colch);
  for (const [x, c] of [[-4.6, 0xec2e8c], [-3.2, 0x1d6fe0], [-1.8, 0x58c43a]]) { const cc = caixaRedonda(1.1, 0.06, 1.9, mat(c), { raio: 0.03, sombra: false }); cc.position.set(x, 0.04, 2.4); fixo.add(cc); }
  const bolaP = malha(new THREE.SphereGeometry(0.45, 18, 14), mat(0x8e6cff), { contorno: 0.03 }); bolaP.position.set(-6.2, 0.46, 0.6); fixo.add(bolaP); solido(-6.2, 0.6, 0.9, 0.9, 0.9);
  const bebe = caixaRedonda(0.6, 1.0, 0.45, mat(0xe8eef4), { raio: 0.06, contorno: 0.03 }); bebe.position.set(W / 2 - 0.5, 0.5, 1.4); fixo.add(bebe); solido(W / 2 - 0.5, 1.4, 0.7, 0.55, 1.6);
  const garrafao = malha(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 14), new THREE.MeshToonMaterial({ color: 0x7fd6ff, transparent: true, opacity: 0.75 }), { sombra: false }); garrafao.position.set(W / 2 - 0.5, 1.25, 1.4); fixo.add(garrafao);
  mesclar(fixo);
  const peso = new THREE.Group(); peso.position.set(ox + 3.4, 0.25, oz - 2.25);
  for (const [dx, c] of [[-0.18, 0xec2e8c], [0.18, 0x1d6fe0]]) { const h = halter(c, 1.2); h.position.x = dx; h.rotation.y = Math.PI / 2; peso.add(h); }
  const soltos = new THREE.Group(); soltos.add(cinta, peso);
  // os donos de verdade (bonecos de pessoas.js; não falam, a anfitriã narra): a Camila e o Robert são casados, então
  // ficam juntinhos, lado a lado no meio da academia (fora do caminho da esteira e do halter), virados para a porta;
  // acenam quando o Rabisco entra
  const camila = criarPessoa("camila"), robert = criarPessoa("riseup-dono", { nome: "Robert" });
  const PORTA_Z = D / 2 - 1.6, CASAL = [[1.0, -1.5], [-0.3, -1.5]]; // 1,3 m entre os dois: o braço do aceno não encosta no outro
  for (const [p, [x, z]] of [[camila, CASAL[0]], [robert, CASAL[1]]]) { p.grupo.position.set(ox + x, 0.03, oz + z); p.grupo.rotation.y = Math.atan2(-x, PORTA_Z - z); }
  npcs.push(camila, robert);
  est.pessoas = ["camila", "riseup-dono"];
  est.aoEntrar = () => { camila.calma(); robert.calma(); camila.acenar(2.6); robert.acenar(2.6); setTimeout(() => robert.acenar(1.6), 900); };
  npcs.push({ grupo: soltos, atualizar: (dt) => { if (est.correndo > 0) cintaTex.offset.y -= dt * 2.4; } });
  est.correu = false; est.levantou = 0;
  const fimTreino = (api) => { camila.comemorar(2.5); robert.comemorar(2.5); api.sons.vitoria?.(); api.confete?.(); api.parabens("rp-rise-ok", "Você foi forte e corajoso! Corpo saudável, coração alegre!", 4800); api.evento?.("treinou"); };
  I("esteira", "🏃 Correr na esteira", -3.8, -1.2, (api) => {
    if (est.correndo > 0) return;
    api.falar("cid-rise-esteira"); api.dizer(NARRA, "Primeiro, a esteira! Corra bastante: a barrinha vai enchendo!", 3000);
    est.correndo = 4.5;
    api.travar?.({ x: ox - 3.8, z: oz - 2.6, dir: Math.PI, modo: "andar", vel: 6, segundos: 4.5, aoFim: () => {
      est.correndo = 0; est.correu = true; camila.acenar(2); api.sons.moeda?.();
      api.falar("cid-rise-peso"); api.dizer(NARRA, "Que corrida! Agora vamos levantar o halter. Vá até o colchonete laranja e aperte o botão cinco vezes!", 4200);
    }, progresso: (f) => api.dizer("🏃 Esteira", `${"🟧".repeat(Math.round(f * 10))}${"⬜".repeat(10 - Math.round(f * 10))}`, 900) });
    setTimeout(() => api.falar("cid-rise-corre"), 2000);
  }, 1.4);
  I("halter", "🏋️ Levantar o halter", 3.4, -1.0, (api) => {
    if (est.levantou >= 5) { est.levantou = 0; }
    est.levantou++; api.sons.pulo?.(); api.falar(`cid-num-${est.levantou}`); robert.acenar(0.8);
    api.travar?.({ x: ox + 3.4, z: oz - 1.4, dir: Math.PI, modo: "parado", segundos: 0.7, pose: "halter", objeto: peso });
    api.dizer(NARRA, `${est.levantou}! ${est.levantou < 5 ? "Mais uma!" : "Cinco! Muito bem!"}`, 1400);
    if (est.levantou === 5) { if (est.correu) setTimeout(() => fimTreino(api), 900); else setTimeout(() => api.dizer(NARRA, "Muito forte! Agora corra na esteira também. 🏃", 3000), 900); }
  }, 1.3);
}

// ------------------------------------------------------------------ Crescente Contabilidade
// marrom e dourado da marca; a contadora Elaine (boneco) fica atrás do balcão, com a prancheta do alvará na mão, e o
// Aurélio recepciona na porta. Fora da missão ela só acena.
const MARROM = 0x813d18, MARROM_ESC = 0x5a2a10, DOURADO = 0xd4a937;
function mesaComputador(fixo, x, z, cadeira) {
  const tampo = caixaRedonda(1.9, 0.1, 0.95, mat(0xe9c79a), { raio: 0.04, contorno: 0.03 }); tampo.position.set(x, 0.78, z); fixo.add(tampo);
  for (const sx of [-1, 1]) { const p = caixaRedonda(0.1, 0.74, 0.85, mat(MARROM), { raio: 0.03 }); p.position.set(x + sx * 0.85, 0.37, z); fixo.add(p); }
  const monitor = caixaRedonda(0.85, 0.52, 0.07, mat(0x26282c), { raio: 0.03, contorno: 0.02 }); monitor.position.set(x, 1.22, z - 0.25); fixo.add(monitor);
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.42), new THREE.MeshToonMaterial({ color: 0x7fd6ff, emissive: 0x3aa0e0, emissiveIntensity: 0.5 })); tela.position.set(x, 1.22, z - 0.21); fixo.add(tela);
  const pe = caixa(0.08, 0.14, 0.08, mat(0x26282c), { sombra: false }); pe.position.set(x, 0.9, z - 0.27); fixo.add(pe);
  const teclado = caixaRedonda(0.6, 0.03, 0.2, mat(0xf4f4f4), { raio: 0.01, contorno: 0.01 }); teclado.position.set(x, 0.85, z + 0.12); fixo.add(teclado);
  const papel = caixa(0.3, 0.02, 0.4, mat(0xffffff), { sombra: false }); papel.position.set(x + 0.65, 0.84, z + 0.05); papel.rotation.y = 0.2; fixo.add(papel);
  if (cadeira) {
    const assento = caixaRedonda(0.6, 0.1, 0.6, mat(MARROM_ESC), { raio: 0.04, contorno: 0.02 }); assento.position.set(x, 0.5, z + 0.8); fixo.add(assento);
    const encosto = caixaRedonda(0.6, 0.6, 0.1, mat(MARROM_ESC), { raio: 0.04, contorno: 0.02 }); encosto.position.set(x, 0.85, z + 1.08); fixo.add(encosto);
    const haste = caixa(0.07, 0.45, 0.07, mat(0x26282c), { sombra: false }); haste.position.set(x, 0.23, z + 0.8); fixo.add(haste);
  }
}
export function montarCrescente({ g, ox, oz, inter, npcs, est, solido, I, npc }) {
  const fixo = new THREE.Group(); g.add(fixo);
  // banner da marca na parede da esquerda (o fundo tem o nome da sala)
  const P = PARCEIROS.find((p) => p.id === "crescente-contabilidade");
  const mBanner = new THREE.MeshToonMaterial({ color: MARROM });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2), mBanner); banner.rotation.y = Math.PI / 2; banner.position.set(-W / 2 + 0.22, 2.0, 1.2); banner.userData.dinamico = true; g.add(banner);
  const mold = caixaRedonda(0.08, 1.4, 3.8, mat(DOURADO), { raio: 0.03 }); mold.position.set(-W / 2 + 0.13, 2.0, 1.2); fixo.add(mold);
  if (P) new THREE.TextureLoader().load(`../../${P.foto}`, (t) => { t.colorSpace = THREE.SRGBColorSpace; Object.assign(mBanner, { map: t, emissiveMap: t, emissiveIntensity: 0.35 }); mBanner.color.set(0xffffff); mBanner.emissive.set(0xffffff); mBanner.needsUpdate = true; });
  // balcão de atendimento (marrom com tampo dourado), no meio; a contadora fica atrás
  const bz = -1.5;
  const balcao = caixaRedonda(4.2, 0.72, 0.9, mat(MARROM), { raio: 0.08, contorno: 0.04 }); balcao.position.set(0, 0.36, bz); fixo.add(balcao);
  const topo = caixaRedonda(4.4, 0.08, 1.05, mat(DOURADO), { raio: 0.03, contorno: 0.02 }); topo.position.set(0, 0.76, bz); fixo.add(topo);
  const faixaB = caixa(4.22, 0.12, 0.02, mat(DOURADO), { sombra: false }); faixaB.position.set(0, 0.45, bz + 0.46); fixo.add(faixaB);
  solido(0, bz, 4.4, 1.1, 0.9);
  // carimbo e pilha de papéis no balcão
  const pilha = caixa(0.42, 0.12, 0.32, mat(0xffffff), { sombra: false }); pilha.position.set(-1.3, 0.86, bz); fixo.add(pilha);
  const carimbo = malha(new THREE.CylinderGeometry(0.09, 0.11, 0.14, 12), mat(MARROM_ESC), { contorno: 0.015 }); carimbo.position.set(-0.7, 0.87, bz); fixo.add(carimbo);
  const cabo = malha(new THREE.SphereGeometry(0.07, 10, 8), mat(DOURADO), { contorno: 0.01 }); cabo.position.set(-0.7, 0.99, bz); fixo.add(cabo);
  // mesas com computador (lado esquerdo) e cadeiras de espera (frente, à esquerda)
  mesaComputador(fixo, -5.2, -3.2, true); solido(-5.2, -3.2, 2.0, 1.0, 1.2);
  mesaComputador(fixo, -2.9, -3.2, true); solido(-2.9, -3.2, 2.0, 1.0, 1.2);
  solido(-5.2, -2.4, 0.7, 0.7, 1.0); solido(-2.9, -2.4, 0.7, 0.7, 1.0);
  for (const x of [-5.4, -4.6, -3.8]) {
    const a = caixaRedonda(0.7, 0.12, 0.7, mat(DOURADO), { raio: 0.05, contorno: 0.02 }); a.position.set(x, 0.45, 3.5); fixo.add(a);
    const e = caixaRedonda(0.7, 0.6, 0.12, mat(DOURADO), { raio: 0.05, contorno: 0.02 }); e.position.set(x, 0.8, 3.84); fixo.add(e);
    for (const sx of [-0.28, 0.28]) { const p = caixa(0.06, 0.4, 0.06, mat(MARROM_ESC), { sombra: false }); p.position.set(x + sx, 0.2, 3.5); fixo.add(p); }
  }
  solido(-4.6, 3.6, 2.4, 0.9, 1.0);
  // arquivos de gaveta (parede da direita) com puxadores dourados
  for (const z of [-3.6, -2.6, -1.6]) {
    const a = caixaRedonda(0.75, 1.5, 0.9, mat(0x9aa0a8), { raio: 0.05, contorno: 0.03 }); a.position.set(W / 2 - 0.5, 0.75, z); fixo.add(a);
    for (const y of [0.35, 0.75, 1.15]) {
      const fr = caixa(0.02, 0.32, 0.78, mat(0xb9bec6), { sombra: false }); fr.position.set(W / 2 - 0.88, y, z); fixo.add(fr);
      const px = caixaRedonda(0.05, 0.05, 0.28, mat(DOURADO), { raio: 0.02 }); px.position.set(W / 2 - 0.9, y + 0.06, z); fixo.add(px);
      const et = caixa(0.02, 0.07, 0.18, mat(0xffffff), { sombra: false }); et.position.set(W / 2 - 0.89, y - 0.07, z); fixo.add(et);
    }
  }
  solido(W / 2 - 0.5, -2.6, 0.9, 3.0, 1.6);
  // estante baixa de pastas coloridas (fundo, à direita, embaixo da janela)
  const est1 = caixaRedonda(2.8, 1.1, 0.5, mat(MARROM), { raio: 0.05, contorno: 0.03 }); est1.position.set(3.4, 0.55, -D / 2 + 0.4); fixo.add(est1);
  const cores = [0xd6402f, 0x1d6fe0, 0xffcc1f, 0x2bb24c, 0x8e5bd8, DOURADO];
  for (const y of [0.28, 0.78]) for (let i = 0; i < 9; i++) { const pz = caixaRedonda(0.18, 0.4, 0.38, mat(cores[(i + (y > 0.5 ? 2 : 0)) % cores.length]), { raio: 0.02 }); pz.position.set(2.25 + i * 0.29, y + 0.06, -D / 2 + 0.5); fixo.add(pz); }
  solido(3.4, -D / 2 + 0.4, 2.9, 0.6, 1.2);
  // tapete marrom com borda dourada na frente do balcão
  const tb = caixa(3.2, 0.02, 1.9, mat(DOURADO), { sombra: false }); tb.position.set(0, 0.03, 0.6); fixo.add(tb);
  const tm = caixa(2.9, 0.025, 1.6, mat(MARROM), { sombra: false }); tm.position.set(0, 0.035, 0.6); fixo.add(tm);
  mesclar(fixo);
  // as pessoas de verdade (bonecos de pessoas.js; elas não falam, a anfitriã narra): a contadora Elaine atrás do balcão,
  // com a prancheta do ALVARÁ na mão, e o Aurélio, assistente, perto da porta. Quando o Rabisco entra, o Aurélio acena,
  // anda até o balcão e chama a Elaine (que acena de volta).
  const elaine = criarPessoa("elaine"); elaine.grupo.position.set(ox, 0.03, oz + bz - 1.0); npcs.push(elaine);
  const aurelio = criarPessoa("aurelio");
  const PORTA_A = [1.9, 2.5], ROT_A = Math.atan2(-1.9, 0.6); // de frente para quem entra
  const CAMINHO_A = [[2.9, 0.5], [2.9, -2.45], [1.15, -2.6]]; // contorna o balcão pela direita e para do lado da Elaine
  const ag = aurelio.grupo; ag.position.set(ox + PORTA_A[0], 0.03, oz + PORTA_A[1]); ag.rotation.y = ROT_A;
  const A = { fase: "porta", t: 0, i: 0, api: null }; // porta → recebe → anda → chamou
  est.pessoas = ["elaine", "aurelio"]; est.recepcao = "porta";
  const girar = (g, alvo, k) => { let d = alvo - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * Math.min(1, k); };
  npcs.push({ grupo: ag, atualizar: (dt) => {
    let vel = 0;
    A.t += dt;
    if (A.fase === "recebe") { girar(ag, ROT_A, dt * 6); if (A.t > 1.6) { A.fase = est.recepcao = "anda"; A.i = 0; } }
    else if (A.fase === "anda") {
      const [lx, lz] = CAMINHO_A[A.i], dx = ox + lx - ag.position.x, dz = oz + lz - ag.position.z, d = Math.hypot(dx, dz), passo = 2.2 * dt;
      girar(ag, Math.atan2(dx, dz), dt * 8); vel = 2.2;
      if (d <= passo) { ag.position.x = ox + lx; ag.position.z = oz + lz; if (++A.i >= CAMINHO_A.length) { A.fase = est.recepcao = "chamou"; A.t = 0; chamouElaine(); } }
      else { ag.position.x += (dx / d) * passo; ag.position.z += (dz / d) * passo; }
    } else if (A.fase === "chamou") girar(ag, A.t < 2.5 ? -Math.PI / 2 : 0.25, dt * 5); // aponta para a Elaine e depois olha o balcão
    aurelio.atualizar(dt, { vel });
  } });
  function chamouElaine() {
    aurelio.acenar(2.2); elaine.acenar(2.8);
    const api = A.api; A.api = null;
    if (!api || est.falou) return; // o Rabisco já está falando com a Elaine: não atrapalha
    api.falar("cid-crescente-aurelio");
    api.dizer(NARRA, "O Aurélio, assistente da Crescente, recebeu você e foi chamar a contadora Elaine!", 4200);
  }
  // a cada entrada o Aurélio volta para a porta e recepciona de novo
  est.aoEntrar = (api) => {
    ag.position.set(ox + PORTA_A[0], 0.03, oz + PORTA_A[1]); ag.rotation.y = ROT_A;
    Object.assign(A, { fase: "recebe", t: 0, i: 0, api }); est.falou = false; est.recepcao = "recebe";
    aurelio.calma(); aurelio.acenar(2.2); aurelio.pular();
  };
  // a entrega: a Elaine estica os braços, a prancheta some da mão dela e o alvará voa (grandão, girando) até a mão do
  // Rabisco. O evento (o alvará entra na mão) é na hora; o da mão fica escondido até o voo chegar.
  const voo = { obj: null, t: 0, de: new THREE.Vector3(), api: null, naMao: null };
  const alvoMao = new THREE.Vector3();
  const soltos = new THREE.Group(); soltos.userData.dinamico = true;
  npcs.push({ grupo: soltos, atualizar: (dt) => {
    if (!voo.obj) return;
    voo.t += dt;
    const cot = voo.api.rabisco?.bracoD?.cotovelo;
    if (cot) cot.getWorldPosition(alvoMao).y -= 0.45; else alvoMao.set(voo.de.x, 1, voo.de.z + 2);
    const k = Math.min(1, voo.t / 1.1), e = k * k * (3 - 2 * k);
    voo.obj.position.lerpVectors(voo.de, alvoMao, e); voo.obj.position.y += Math.sin(k * Math.PI) * 0.9;
    voo.obj.rotation.y = k * Math.PI * 2; voo.obj.scale.setScalar(1.6 - 0.6 * e);
    if (k >= 1) {
      soltos.remove(voo.obj); voo.obj.traverse((o) => o.geometry?.dispose()); voo.obj = null; voo.api = null;
      if (voo.naMao) voo.naMao.visible = true; voo.naMao = null;
    }
  } });
  est.alvara = false;
  I("contadora", "💬 Falar com a contadora Elaine", 0, bz + 1.25, (api) => {
    est.falou = true;
    if (api.missao?.() === "alvara" && !est.alvara && !voo.obj) {
      est.alvara = true; elaine.calma(); api.sons.vitoria?.();
      // de onde sai: a prancheta na mão esquerda dela (receber sem objeto = estica os braços e guarda a prancheta)
      elaine.ossos.objeto.getWorldPosition(voo.de); elaine.receber(null, 1.1);
      voo.obj = alvara(); voo.obj.position.copy(voo.de); voo.t = 0; voo.api = api; soltos.add(voo.obj);
      api.evento?.("alvara");
      voo.naMao = api.rabisco?.bracoD?.cotovelo?.children.find((o) => o.userData.item === "alvara") ?? null;
      const mao = voo.naMao; if (mao) { mao.visible = false; setTimeout(() => (mao.visible = true), 1600); } // se sair da sala no meio do voo
      setTimeout(() => { elaine.pular(); elaine.objeto(true); est.alvara = false; }, 3500); // pega outra prancheta (pode jogar de novo)
      api.falar("cid-crescente-alvara");
      api.dizer(NARRA, "A contadora Elaine entregou o alvará novinho da escola, com o selinho! Leve para a Diretora Sabrina, na porta da Educarte Kids II.", 5200);
      return;
    }
    elaine.acenar(2.5);
    api.sons.moeda?.(); api.falar("cid-crescente-oi");
    api.dizer(NARRA, "A contadora Elaine acenou! Na Crescente Contabilidade, ela cuida das contas e dos documentos das empresas.", 4600);
  }, 1.5);
}
