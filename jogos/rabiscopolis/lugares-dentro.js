// Rabiscolândia: os lugares por dentro, para encenar (Fatia 3). Cada lugar tem uma sala vista em corte (como a casa),
// um armário de uniforme (veste a profissão do lugar) e 2–3 objetos para brincar, com um amigo do estojo que reage:
//   hospital (curativo, febre, coração) · veterinário (banho e petisco) · Educarte Kids I (sino, musiquinha, lousa)
//   · Educarte Kids II (sino do recreio, lousa) · Igreja Reviver (coral com hino de domínio público, culto infantil
//   com historinha narrada) · sorveteria (montar a casquinha pedida) · padaria (assar e entregar o pão) · bombeiros
//   (treino de apagar o foguinho, sirene) · mercado (passar as compras, arrumar as frutas) · biblioteca (ler, carimbar).
// As salas ficam longe da cidade (z = 1200) e são montadas só na primeira visita.
//
//   const s = montarSala(id);   // { id, nome, grupo, solidos, entrada, porta, interativos, npcs, atualizar(dt, t) }
//   interativo.fazer(api)       // api = { dizer, falar, sons, rabisco, profissao, vestir(id), tirar(), tocarHino(id), abrirSorvete(pedido, ok) }

import { THREE, mat, malha, caixa, caixaRedonda, letreiro, MAT, texturaCanvas, mesclar, r as rnd } from "./base3d.js";
import { criarMorador } from "./personagens.js";
import { movel } from "./moveis.js";
import { PROFISSOES } from "./roupas-rp.js";
import { HINOS } from "../../src/radio/hinos.js";
import { montarAulas } from "./aulas-sala.js";
import { montarBella, montarRise } from "./parceiras-dentro.js";

const W = 14, D = 9, ALT = 3;
export const SALAS = {
  hospital: { nome: "Hospital Cuidar", piso: 0xdfe6ee, parede: 0xeaf6ff, acento: 0xe8413c, profissao: "medico" },
  veterinario: { nome: "Veterinário Amigo Bicho", piso: 0xd8f5ea, parede: 0xeffaf5, acento: 0x1fc08e, profissao: "veterinario" },
  kids1: { nome: "Educarte Kids I", piso: 0xffe3ef, parede: 0xfff4fa, acento: 0xff9cc0, profissao: "professor" },
  kids2: { nome: "Educarte Kids II", piso: 0xe9c79a, parede: 0xeaf6ff, acento: 0x00b5f0, profissao: "professor" },
  igreja: { nome: "Igreja Reviver", piso: 0xe9c79a, parede: 0xf4f6fb, acento: 0x1f3a8a, profissao: "coral" },
  sorveteria: { nome: "Sorveteria Geladinho", piso: 0xfff0f6, parede: 0xffe3ef, acento: 0xff6fae, profissao: "sorveteiro" },
  padaria: { nome: "Padaria Pão Quentinho", piso: 0xe9c79a, parede: 0xfbe6c4, acento: 0x8a4b2a, profissao: "padeiro" },
  bombeiros: { nome: "Bombeiros", piso: 0xdfe6ee, parede: 0xffe1dc, acento: 0xe8413c, profissao: "bombeiro" },
  mercado: { nome: "Mercado Cesta Cheia", piso: 0xeef5e8, parede: 0xd9f2c9, acento: 0x2bb24c, profissao: "caixa" },
  biblioteca: { nome: "Biblioteca Ler é Bom", piso: 0xe9c79a, parede: 0xf3e6cf, acento: 0x8e6cff, profissao: "bibliotecario" },
  // lojas parceiras por dentro (parceiras-dentro.js): sem armário de uniforme
  "parceiro-bella-cat": { nome: "Bella Cat Make Biju", piso: 0xfbeef5, parede: 0xf9dbe9, acento: 0xec2e8c, profissao: null, fala: "rp-bella-entrar", boasVindas: "Bem-vindo à Bella Cat! Chegue pertinho dos pedestais para ver os laços, colares e tiaras.",
    dica: { missao: "presente", fala: "cid-bella-escolha", texto: "Que bom que você veio! Escolha um presente: chegue pertinho de um pedestal e aperte o botão!" } },
  "parceiro-rise-up": { nome: "Academia Rise Up", piso: 0x4a4e55, parede: 0xf1ebe0, acento: 0xff7a00, profissao: null, fala: "rp-rise-entrar", boasVindas: "Bem-vindo à Academia Rise Up! Aqui a gente cuida do corpo que Deus nos deu. Corra na esteira e levante o halter!" },
};
export const IDS_SALAS = Object.keys(SALAS);
export const origemSala = (id) => [IDS_SALAS.indexOf(id) * 40 - 180, 0, 1200];

// sabores da sorveteria
export const SABORES = [
  { id: "morango", nome: "morango", cor: 0xff8cc0 }, { id: "menta", nome: "menta", cor: 0x8fe3cf }, { id: "chocolate", nome: "chocolate", cor: 0x8a4b2a },
  { id: "baunilha", nome: "baunilha", cor: 0xfff0c9 }, { id: "uva", nome: "uva", cor: 0xa98ce0 }, { id: "limao", nome: "limão", cor: 0xe8f06a },
];
// historinhas do culto infantil e livros da biblioteca (texto do balão; a voz é o MP3 rp-*)
export const HISTORIAS = [
  { fala: "rp-historia-1", titulo: "A ovelhinha perdida", texto: "Um pastor tinha cem ovelhas. Uma ovelhinha se perdeu! O pastor procurou até encontrar e voltou feliz, com ela no colo. Jesus cuida de cada um de nós assim. (baseado em Lucas 15)" },
  { fala: "rp-historia-2", titulo: "Jesus e as crianças", texto: "Muitas crianças queriam ver Jesus. Alguns acharam que ele estava ocupado demais. Mas Jesus disse: deixem as crianças virem a mim! E abençoou cada uma. (baseado em Marcos 10)" },
  { fala: "rp-historia-3", titulo: "O lanche repartido", texto: "Uma multidão estava com fome. Um menino ofereceu cinco pães e dois peixinhos. Jesus agradeceu a Deus e repartiu: todos comeram e ainda sobrou! (baseado em João 6)" },
];
export const LIVROS = [
  { fala: "rp-livro-1", titulo: "O livro das cores", texto: "Vermelho como o morango, amarelo como o sol, azul como o céu e verde como a folha. Deus pintou o mundo com muitas cores!" },
  { fala: "rp-livro-2", titulo: "Os bichos da arca", texto: "O leão, a girafa, o elefante e o macaquinho entraram na arca de dois em dois. Noé cuidou de todos até a chuva passar." },
];

// ---------- peças comuns
function parede(g, solidos, eixo, fixo, a, b, vaos, cor, altura = ALT) {
  const trechos = []; let ini = a;
  for (const [v0, v1] of [...vaos].sort((p, q) => p[0] - q[0])) { if (v0 > ini) trechos.push([ini, v0]); ini = Math.max(ini, v1); }
  if (b > ini) trechos.push([ini, b]);
  for (const [t0, t1] of trechos) {
    const comp = t1 - t0, meio = (t0 + t1) / 2;
    const p = caixaRedonda(eixo === "x" ? comp : 0.25, altura, eixo === "x" ? 0.25 : comp, mat(cor), { raio: 0.06, contorno: 0.04 });
    p.position.set(eixo === "x" ? meio : fixo, altura / 2, eixo === "x" ? fixo : meio); g.add(p);
    solidos.push(eixo === "x" ? { x0: t0, x1: t1, z0: fixo - 0.13, z1: fixo + 0.13, y1: altura } : { x0: fixo - 0.13, x1: fixo + 0.13, z0: t0, z1: t1, y1: altura });
  }
}
function armario(cor) {
  const g = new THREE.Group();
  const c = caixaRedonda(1.6, 2.2, 0.7, mat(cor), { raio: 0.1, contorno: 0.05 }); c.position.y = 1.1; g.add(c);
  const linha = caixa(0.04, 2.0, 0.72, mat(0x151515), { sombra: false }); linha.position.y = 1.1; g.add(linha);
  for (const s of [-1, 1]) { const m = malha(new THREE.SphereGeometry(0.06, 8, 6), mat(0xffcc1f)); m.position.set(s * 0.14, 1.15, 0.37); g.add(m); }
  // cabide desenhado na porta
  const placaT = texturaCanvas(128, 128, (c2, w, h) => { c2.clearRect(0, 0, w, h); c2.font = "90px 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"; c2.textAlign = "center"; c2.textBaseline = "middle"; c2.fillText("👔", w / 2, h / 2 + 6); });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: placaT, transparent: true }));
  p.position.set(0, 1.7, 0.37); p.userData.dinamico = true; g.add(p);
  return g;
}
const mesa = (w, d, cor, h = 0.85) => { const g = new THREE.Group(); const t = caixaRedonda(w, 0.12, d, mat(cor), { raio: 0.05, contorno: 0.03 }); t.position.y = h; g.add(t); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = malha(new THREE.CylinderGeometry(0.05, 0.05, h, 8), mat(0x8a5a32), { contorno: 0.02 }); p.position.set(x * (w / 2 - 0.12), h / 2, z * (d / 2 - 0.12)); g.add(p); } return g; };
const texLousa = (linhas) => texturaCanvas(512, 256, (c, w, h) => {
  c.fillStyle = "#2e5a3f"; c.fillRect(0, 0, w, h);
  c.strokeStyle = "#c98a4b"; c.lineWidth = 16; c.strokeRect(0, 0, w, h);
  c.fillStyle = "#ffffff"; c.textAlign = "center"; c.textBaseline = "middle";
  // a letra diminui para caber (as frases das aulas são mais compridas)
  let tam = 70; const cabe = () => { c.font = `800 ${tam}px 'Baloo 2', sans-serif`; return linhas.every((l) => c.measureText(l).width < w - 40); };
  while (!cabe() && tam > 26) tam -= 4;
  linhas.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (linhas.length - 1) / 2) * tam * 1.15));
});
function npc(tipo, cor, semente, escala = 0.78) { const m = criarMorador(tipo, { cor, semente, escala }); return m; }

// ---------- sintetizador simples (hino do coral e musiquinha das crianças)
let ac = null;
const contextoAudio = () => { try { ac ??= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch { ac = null; } return ac; };
addEventListener("pointerdown", () => contextoAudio(), { once: true });
addEventListener("keydown", () => contextoAudio(), { once: true });
export function tocarNotas(notas, bpm = 100, { onda = "triangle", vol = 0.12, ate = Infinity } = {}) {
  const c = contextoAudio(); if (!c) return 0;
  const t0 = c.currentTime + 0.05, s = 60 / bpm;
  let fim = 0;
  for (let i = 0; i < notas.length; i += 3) {
    const [ini, dur, midi] = [notas[i], notas[i + 1], notas[i + 2]];
    if (ini >= ate) break;
    const o = c.createOscillator(), gn = c.createGain();
    o.type = onda; o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    const a = t0 + ini * s, b = a + dur * s * 0.95;
    gn.gain.setValueAtTime(0, a); gn.gain.linearRampToValueAtTime(vol, a + 0.03); gn.gain.setTargetAtTime(0, b - 0.06, 0.05);
    o.connect(gn).connect(c.destination); o.start(a); o.stop(b + 0.2);
    fim = Math.max(fim, ini + dur);
  }
  return fim * s;
}
// musiquinha original (composição própria, 8 compassos simples em dó maior)
export const MUSIQUINHA = [0, 1, 60, 1, 1, 64, 2, 1, 67, 3, 1, 64, 4, 2, 65, 6, 2, 62, 8, 1, 64, 9, 1, 67, 10, 1, 72, 11, 1, 67, 12, 4, 69, 16, 1, 67, 17, 1, 65, 18, 1, 64, 19, 1, 62, 20, 4, 60];

// ---------- montagem
export function montarSala(id, { idade = null } = {}) {
  const def = SALAS[id], [ox, , oz] = origemSala(id);
  const g = new THREE.Group(); g.position.set(ox, 0, oz);
  const fixo = new THREE.Group(); g.add(fixo);
  const solidosL = [], inter = [], npcs = [], anim = [];
  const est = {}; // estado dos objetos (para os testes e para não repetir)
  // chão, paredes, placa e janelas
  const grama = malha(new THREE.PlaneGeometry(40, 30), mat(0x7ccf52), { sombra: false }); grama.rotation.x = -Math.PI / 2; grama.position.y = -0.02; fixo.add(grama);
  const piso = malha(new THREE.PlaneGeometry(W, D), mat(def.piso), { sombra: false }); piso.rotation.x = -Math.PI / 2; piso.position.y = 0.02; piso.receiveShadow = true; fixo.add(piso);
  parede(fixo, solidosL, "x", -D / 2, -W / 2, W / 2, [], def.parede);
  parede(fixo, solidosL, "z", -W / 2, -D / 2, D / 2, [], def.parede);
  parede(fixo, solidosL, "z", W / 2, -D / 2, D / 2, [], def.parede);
  parede(fixo, solidosL, "x", D / 2, -W / 2, W / 2, [[-1.2, 1.2]], 0xffffff, 0.7);
  const faixa = caixa(W, 0.3, 0.05, mat(def.acento), { sombra: false }); faixa.position.set(0, 2.6, -D / 2 + 0.16); fixo.add(faixa);
  const placa = letreiro(def.nome, 5, { cor: `#${new THREE.Color(def.acento).getHexString()}` }); placa.position.set(0, 2.1, -D / 2 + 0.14); fixo.add(placa);
  // na igreja o lado direito do fundo é do letreiro (a cruz fica no meio) e nas escolas é da lousa: janela só à esquerda
  for (const x of ["igreja", "kids1", "kids2"].includes(id) ? [-4.5] : [-4.5, 4.5]) { const j = caixaRedonda(1.6, 1.1, 0.12, MAT.janela, { raio: 0.06, contorno: 0.03 }); j.position.set(x, 1.9, -D / 2 + 0.15); fixo.add(j); }
  const tap = caixa(1.8, 0.03, 0.9, mat(def.acento), { sombra: false }); tap.position.set(0, 0.03, D / 2 - 0.8); fixo.add(tap);
  const solido = (x, z, w, d, h = 1.2) => solidosL.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y1: h });
  const add = (o, x, z, rot = 0, dinamico = false) => { o.position.set(x, 0, z); o.rotation.y = rot; if (dinamico) o.userData.dinamico = true; g.add(o); return o; };
  const I = (iid, rotulo, x, z, fazer, raio = 1.6) => inter.push({ id: iid, rotulo, local: [x, z], pos: [ox + x, oz + z], raio, fazer });

  // armário de uniforme (canto do fundo à esquerda); as lojas parceiras não têm
  if (def.profissao) { add(armario(def.acento), -W / 2 + 1.1, -D / 2 + 0.6); solido(-W / 2 + 1.1, -D / 2 + 0.6, 1.7, 0.8, 2.3); }
  const prof = PROFISSOES[def.profissao];
  if (def.profissao) I("armario", "👔 Uniforme", -W / 2 + 1.1, -D / 2 + 1.6, (api) => {
    if (api.profissao() === def.profissao) { api.tirar(); api.dizer(def.nome, "Uniforme guardado no armário!"); est.uniforme = false; return; }
    api.vestir(def.profissao); est.uniforme = true;
    api.falar(`rp-prof-${def.profissao}`);
    api.dizer(def.nome, `Uniforme de ${prof.nome.toLowerCase()} vestido! Vamos brincar de trabalhar.`);
  });

  // decoração comum: plantas nos cantos da frente, tapete redondo com a cor do lugar e um quadrinho na parede
  for (const [x, z] of [[-W / 2 + 0.8, D / 2 - 1.3], [W / 2 - 0.8, D / 2 - 1.3]]) { const pl = movel("planta").fazer(def.acento); pl.position.set(x, 0, z); g.add(pl); solido(x, z, 0.6, 0.6, 1.2); }
  if (def.profissao) { const tapete = movel("tapete").fazer(def.acento); tapete.position.set(id === "igreja" ? 2 : -0.5, 0, 1.6); tapete.scale.setScalar(1.3); g.add(tapete); }
  if (def.profissao) { const quadro = movel("quadro-versiculo").fazer(def.acento, IDS_SALAS.indexOf(id) % 6); quadro.position.set(-W / 2 + 0.16, 0, 1.2); quadro.rotation.y = Math.PI / 2; g.add(quadro); }
  // banquinho de espera na parede da direita
  if (["hospital", "veterinario", "padaria", "mercado", "sorveteria"].includes(id)) { const b = movel("sofa").fazer(def.acento); b.position.set(W / 2 - 0.6, 0, 1.4); b.rotation.y = -Math.PI / 2; b.scale.setScalar(0.85); g.add(b); solido(W / 2 - 0.6, 1.4, 1.0, 2.2, 1); }

  // ---------- objetos de cada lugar
  if (id === "hospital") {
    const maca = add(new THREE.Group(), 3, -2.2);
    const base = caixaRedonda(2.2, 0.6, 1.0, mat(0xffffff), { raio: 0.1, contorno: 0.04 }); base.position.y = 0.55; maca.add(base);
    const trav = caixaRedonda(0.6, 0.18, 0.8, mat(0x9fd8ff), { raio: 0.08 }); trav.position.set(-0.75, 0.94, 0); maca.add(trav);
    solido(3, -2.2, 2.3, 1.1, 0.9);
    const paciente = npc("lapis", 0xe8413c, 1); paciente.grupo.position.set(ox + 3.3, 0.85, oz - 2.2); paciente.grupo.rotation.y = 0.6; npcs.push(paciente);
    const curativo = caixaRedonda(0.3, 0.18, 0.05, mat(0xffe0c0), { raio: 0.04, contorno: 0.02 }); curativo.position.set(0.05, 1.25, 0.38); curativo.visible = false; paciente.grupo.children[0].add(curativo);
    const monitor = caixaRedonda(0.9, 0.7, 0.2, mat(0x2f3440), { raio: 0.08, contorno: 0.03 }); monitor.position.set(5.2, 1.7, -4.2); g.add(monitor);
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.55), new THREE.MeshBasicMaterial({ color: 0x1fc08e })); tela.position.set(5.2, 1.7, -4.09); tela.userData.dinamico = true; g.add(tela);
    const cx = add(caixaRedonda(0.7, 0.45, 0.5, mat(0xffffff), { raio: 0.08, contorno: 0.03 }), 0.6, -3.8); cx.position.y = 0.95; add(mesa(1.4, 0.8, 0xdfe6ee), 0.6, -3.8); solido(0.6, -3.8, 1.5, 0.9);
    const cruz1 = caixa(0.28, 0.08, 0.02, mat(0xe8413c), { sombra: false }); cruz1.position.set(0.6, 1.0, -3.54); g.add(cruz1); const cruz2 = caixa(0.08, 0.28, 0.02, mat(0xe8413c), { sombra: false }); cruz2.position.set(0.6, 1.0, -3.54); g.add(cruz2);
    I("curativo", "🩹 Fazer curativo", 3, -1.0, (api) => { curativo.visible = true; est.curativo = true; paciente.pular(); paciente.acenar(2.5); api.sons.moeda?.(); api.falar("rp-hosp-curativo"); api.dizer("Lápis Vermelho", "Obrigado! Um curativo e um abraço: já estou melhor!"); });
    I("febre", "🌡️ Medir a febre", 4.5, -1.2, (api) => { est.febre = true; api.sons.bipe(true); api.falar("rp-hosp-febre"); api.dizer("Hospital Cuidar", "36,5 graus: tudo bem, sem febre!"); });
    I("coracao", "🩺 Ouvir o coração", 1.8, -1.2, (api) => { est.coracao = true; tela.material.color.setHex(0xff6fae); setTimeout(() => tela.material.color.setHex(0x1fc08e), 1500); api.sons.bipe(); setTimeout(() => api.sons.bipe(), 300); api.falar("rp-hosp-coracao"); api.dizer("Lápis Vermelho", "Tum-tum, tum-tum! Coração feliz."); paciente.acenar(); });
  }
  if (id === "veterinario") {
    add(mesa(1.8, 1.0, 0xdfe6ee, 0.9), 2.5, -2.5); solido(2.5, -2.5, 1.9, 1.1);
    const cao = new THREE.Group(); cao.position.set(ox + 2.5, 1.0, oz - 2.5); cao.userData.dinamico = true;
    const corpo = malha(new THREE.CapsuleGeometry(0.32, 0.6, 4, 10), mat(0xd9a066), { contorno: 0.04 }); corpo.rotation.x = Math.PI / 2; corpo.position.y = 0.4; cao.add(corpo);
    const cab = malha(new THREE.SphereGeometry(0.33, 14, 10), mat(0xd9a066), { contorno: 0.04 }); cab.position.set(0, 0.75, 0.5); cao.add(cab);
    for (const s of [-1, 1]) { const o = malha(new THREE.SphereGeometry(0.15, 10, 8), mat(0x8a5a32)); o.scale.set(0.6, 1.3, 0.5); o.position.set(s * 0.27, 0.85, 0.45); cao.add(o); const olho = malha(new THREE.SphereGeometry(0.06, 8, 6), mat(0x151515)); olho.position.set(s * 0.12, 0.82, 0.8); cao.add(olho); }
    const rabo = malha(new THREE.CapsuleGeometry(0.06, 0.3, 4, 6), mat(0xd9a066)); rabo.position.set(0, 0.65, -0.55); rabo.rotation.x = -0.7; cao.add(rabo);
    for (const [x, z] of [[-0.18, 0.3], [0.18, 0.3], [-0.18, -0.3], [0.18, -0.3]]) { const p = malha(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8), mat(0xd9a066)); p.position.set(x, 0.05, z); cao.add(p); }
    npcs.push({ grupo: cao, atualizar: (dt, t) => { rabo.rotation.z = Math.sin(t * (est.festa > 0 ? 18 : 5)) * 0.5; if (est.festa > 0) { est.festa -= dt; cao.position.y = 1.0 + Math.abs(Math.sin(t * 10)) * 0.3; } else cao.position.y = 1.0; if (est.banhoT > 0) { est.banhoT -= dt; cao.rotation.y = Math.sin(t * 25) * 0.15; bolhas.visible = true; } else bolhas.visible = false; } });
    const bolhas = new THREE.Group(); cao.add(bolhas); bolhas.visible = false;
    for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.1 + rnd() * 0.12, 10, 8), new THREE.MeshToonMaterial({ color: 0xcff4ff, transparent: true, opacity: 0.7 })); b.position.set((rnd() - 0.5) * 1.1, 0.4 + rnd() * 0.8, (rnd() - 0.5) * 1.2); bolhas.add(b); }
    const banheira = caixaRedonda(1.4, 0.5, 0.9, mat(0x9fd8ff), { raio: 0.15, contorno: 0.04 }); banheira.position.set(5.3, 0.25, -3.5); g.add(banheira); solido(5.3, -3.5, 1.5, 1.0, 0.5);
    I("banho", "🛁 Dar banho", 2.5, -1.3, (api) => { est.banho = true; est.banhoT = 3; api.sons.estouro?.(); api.falar("rp-vet-banho"); api.dizer("Veterinário", "Banho de espuma! Ele ficou cheirosinho."); });
    I("petisco", "🦴 Dar petisco", 4.0, -1.6, (api) => { est.petisco = true; est.festa = 2.2; api.sons.pulo(); api.falar("rp-vet-petisco"); api.dizer("Veterinário", "Au-au! Ele abanou o rabinho de alegria."); });
    est.cao = cao;
  }
  if (id === "kids1" || id === "kids2") {
    const bebes = id === "kids1";
    const lousaTex = [bebes ? ["☀️ 🌼 ❤️"] : ["2 + 3 = 5"], bebes ? ["A  B  C"] : ["4 + 4 = 8"], bebes ? ["Deus me ama!"] : ["Deus é amor"]];
    const lousaMat = new THREE.MeshToonMaterial({ map: texLousa(lousaTex[0]) });
    const lousa = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), lousaMat); lousa.position.set(4.4, 1.55, -D / 2 + 0.16); lousa.userData.dinamico = true; g.add(lousa);
    const sino = add(new THREE.Group(), -2.5, -3.6);
    add(mesa(1.2, 0.8, bebes ? 0xffd3e2 : 0xc98a4b, 0.8), -2.5, -3.6); solido(-2.5, -3.6, 1.3, 0.9);
    const s1 = malha(new THREE.SphereGeometry(0.22, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.6), mat(0xffcc1f), { contorno: 0.03 }); s1.position.y = 1.15; sino.add(s1);
    const cabo = malha(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), mat(0x8a5a32)); cabo.position.y = 1.4; sino.add(cabo);
    sino.userData.dinamico = true;
    // alunos: bebês (pequenininhos) ou crianças do estojo, sentados em almofadas/carteiras
    const tipos = bebes ? [["giz", 0xff9cc0], ["lapis", 0x9fd8ff], ["cola", 0]] : [["lapis", 0x58c43a], ["regua", 0], ["caderno", 0x8e6cff]];
    tipos.forEach(([tp, cor], i) => {
      const a = npc(tp, cor, 4 + i, bebes ? 0.5 : 0.7); a.grupo.position.set(ox - 1 + i * 1.6, 0.03, oz + 0.8); a.grupo.rotation.y = Math.PI; npcs.push(a);
      if (bebes) { const al = caixaRedonda(0.9, 0.2, 0.9, mat([0xbff0dc, 0xffd3e2, 0xe2d4ff][i]), { raio: 0.1, contorno: 0.03 }); al.position.set(-1 + i * 1.6, 0.1, 0.8); g.add(al); }
      else { const c = caixaRedonda(0.9, 0.08, 0.6, mat(0xc98a4b), { raio: 0.03, contorno: 0.02 }); c.position.set(-1 + i * 1.6, 0.7, 0.2); g.add(c); }
    });
    est.alunos = npcs.length;
    let li = 0;
    I("sino", bebes ? "🔔 Hora da roda" : "🔔 Sino do recreio", -2.5, -2.6, (api) => { est.sino = (est.sino ?? 0) + 1; for (const a of npcs) { a.pular?.(); a.acenar?.(2); } [0, 0.25, 0.5].forEach((d) => setTimeout(() => api.sons.nota(5), d * 1000)); sino.rotation.z = 0.5; setTimeout(() => (sino.rotation.z = 0), 400); api.falar(bebes ? "rp-escola-roda" : "rp-escola-recreio"); api.dizer(def.nome, bebes ? "Hora da roda! Todos juntinhos." : "Recreio! Todo mundo brincando junto."); });
    I("lousa", "✏️ Escrever na lousa", 4.4, -3.0, (api) => { if (est.aulas?.aula) return; li = (li + 1) % lousaTex.length; lousaMat.map.dispose(); lousaMat.map = texLousa(lousaTex[li]); lousaMat.needsUpdate = true; est.lousa = li; api.sons.letra?.(); api.falar("rp-escola-lousa"); api.dizer(def.nome, "Muito bem, turma! Vamos ler juntos."); });
    if (bebes) I("musiquinha", "🎵 Cantar a musiquinha", -0.2, -0.6, (api) => { est.musica = true; const dur = tocarNotas(MUSIQUINHA, 110, { onda: "sine", vol: 0.14 }); est.dancando = dur; api.dizer(def.nome, "La, la, la! Os bebês dançam junto. 🎶"); });
    est.lousaMat = lousaMat;
    // aulas por idade com a Professora Lápis Turquesa (aulas-sala.js); a lousa mostra a rodada
    const escrever = (linhas) => { lousaMat.map.dispose(); lousaMat.map = texLousa(linhas); lousaMat.needsUpdate = true; };
    montarAulas({ id, g, ox, oz, inter, npcs, est, solido, escrever, idade });
  }
  if (id === "igreja") {
    // púlpito, cruz e o coral (três amigos de beca) no fundo; banquinhos do culto infantil na frente
    const cruzV = caixaRedonda(0.3, 2.2, 0.15, mat(0xffd36b), { raio: 0.05, contorno: 0.03 }); cruzV.position.set(0, 1.9, -D / 2 + 0.25); g.add(cruzV);
    const cruzH = caixaRedonda(1.2, 0.3, 0.15, mat(0xffd36b), { raio: 0.05, contorno: 0.03 }); cruzH.position.set(0, 2.4, -D / 2 + 0.25); g.add(cruzH);
    placa.position.x = 4.4; // a cruz fica no meio
    const palco = caixaRedonda(7, 0.3, 2.6, mat(0xc98a4b), { raio: 0.06, contorno: 0.04 }); palco.position.set(2, 0.15, -3); g.add(palco);
    const coral = [];
    [0xffcc1f, 0xec2e8c, 0x58c43a].forEach((cor, i) => { const c = npc(["lapis", "giz", "pincel"][i], cor, 7 + i, 0.75); c.grupo.position.set(ox + 0.6 + i * 1.4, 0.3, oz - 3.2); npcs.push(c); coral.push(c);
      const beca = malha(new THREE.CylinderGeometry(0.42, 0.5, 0.9, 16, 1, true), mat(0x2f6fc0, { side: THREE.DoubleSide }), { contorno: 0.03 }); beca.position.y = 0.75; c.grupo.children[0].add(beca); });
    solido(2, -3, 7, 2.6, 0.35);
    for (let i = 0; i < 3; i++) { const b = caixaRedonda(2.4, 0.4, 0.6, mat([0xff9cc0, 0x9fd8ff, 0xfff0a8][i]), { raio: 0.1, contorno: 0.03 }); b.position.set(-3.5, 0.2, -1.2 + i * 1.2); g.add(b); }
    const prof = npc("caderno", 0xffcc1f, 11, 0.8); prof.grupo.position.set(ox - 3.5, 0.03, oz - 2.6); npcs.push(prof);
    let hist = 0;
    I("coral", "🎵 Cantar no coral", 2, -1.2, (api) => {
      est.coral = (est.coral ?? 0) + 1;
      const h = HINOS["jesus-me-ama"];
      api.falar("rp-igreja-coral");
      setTimeout(() => { const dur = tocarNotas(h.mel, h.bpm, { onda: "triangle", vol: 0.13, ate: 32 }); est.cantando = dur; }, 2200);
      for (const c of coral) c.acenar(4);
      api.dizer("Igreja Reviver", `Vamos louvar a Deus cantando! 🎶 ${h.nome} (${h.rotulo})`, 6000);
    });
    I("culto", "📖 Culto infantil", -3.5, 0.2, (api) => {
      const hs = HISTORIAS[hist % HISTORIAS.length]; hist++; est.historia = hs.titulo;
      api.sentar?.(); api.falar(hs.fala); api.dizer(hs.titulo, hs.texto, 14000); prof.acenar(3);
    });
    // orar o Pai Nosso de frente para a cruz (a mesma oração da missão, sem precisar de missão)
    I("orar", "🙏 Orar o Pai Nosso", -0.6, -0.9, (api) => { est.orou = (est.orou ?? 0) + 1; api.orar?.(); });
    est.coralNpcs = coral;
  }
  if (id === "sorveteria") {
    const balcao = caixaRedonda(4, 1.0, 1.0, mat(0xffd6e8), { raio: 0.1, contorno: 0.04 }); balcao.position.set(1, 0.5, -2.6); g.add(balcao); solido(1, -2.6, 4.1, 1.1);
    const vidro = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 0.8), new THREE.MeshToonMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.45 })); vidro.position.set(1, 1.25, -2.6); g.add(vidro);
    SABORES.forEach((s, i) => { const p = malha(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 14), mat(s.cor), { contorno: 0.02 }); p.position.set(-0.4 + i * 0.55, 1.08, -2.6); g.add(p); });
    const cliente = npc("clipe", 0x8e6cff, 12); cliente.grupo.position.set(ox + 3.6, 0.03, oz - 0.6); cliente.grupo.rotation.y = -2.2; npcs.push(cliente);
    const casquinha = new THREE.Group(); casquinha.position.set(ox + 2.4, 1.05, oz - 2.1); casquinha.userData.dinamico = true;
    const cone = malha(new THREE.ConeGeometry(0.16, 0.45, 14), mat(0xe8a85a), { contorno: 0.02 }); cone.rotation.x = Math.PI; cone.position.y = 0.22; casquinha.add(cone);
    npcs.push({ grupo: casquinha, atualizar: () => {} });
    const novoPedido = () => { const a = SABORES[Math.floor(rnd() * SABORES.length)]; let b; do b = SABORES[Math.floor(rnd() * SABORES.length)]; while (b === a); return [a, b]; };
    est.pedido = novoPedido(); est.casquinhas = 0;
    const montar = (sabores) => { while (casquinha.children.length > 1) casquinha.children.at(-1).removeFromParent(); sabores.forEach((s, i) => { const b = malha(new THREE.SphereGeometry(0.2, 14, 10), mat(s.cor), { contorno: 0.02 }); b.position.y = 0.5 + i * 0.3; casquinha.add(b); }); };
    I("casquinha", "🍦 Montar casquinha", 1.6, -1.4, (api) => {
      const [a, b] = est.pedido;
      api.falar("rp-sorvete-pedido");
      api.dizer("Clipe Roxo", `Oi! Quero uma casquinha de ${a.nome} e ${b.nome}, por favor!`, 6000);
      api.abrirSorvete(SABORES, (escolha) => {
        montar(escolha);
        const certo = escolha.length === 2 && escolha[0].id === a.id && escolha[1].id === b.id;
        if (certo) { est.casquinhas++; cliente.pular(); cliente.acenar(2.5); api.sons.vitoria?.(); api.falar("rp-sorvete-certo"); api.dizer("Clipe Roxo", "Hum! Do jeitinho que eu pedi. Obrigado!"); est.pedido = novoPedido(); }
        else { api.sons.erro?.(); api.falar("rp-sorvete-quase"); api.dizer("Clipe Roxo", `Quase! Eu pedi ${a.nome} e ${b.nome}. Vamos tentar de novo?`); }
        return certo;
      });
    });
    est.montar = montar;
  }
  if (id === "padaria") {
    const forno = caixaRedonda(1.8, 1.6, 1.2, mat(0xb85a3a), { raio: 0.25, contorno: 0.05 }); forno.position.set(-2.5, 0.8, -3.7); g.add(forno); solido(-2.5, -3.7, 1.9, 1.3, 1.7);
    const boca = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), MAT.janelaQuente); boca.position.set(-2.5, 0.9, -3.08); g.add(boca);
    const balcao = caixaRedonda(3.2, 1.0, 0.9, mat(0xfbe6c4), { raio: 0.1, contorno: 0.04 }); balcao.position.set(2.5, 0.5, -2.8); g.add(balcao); solido(2.5, -2.8, 3.3, 1.0);
    const pao = malha(new THREE.CapsuleGeometry(0.18, 0.5, 6, 12), mat(0xfff0c9), { contorno: 0.02 }); pao.rotation.z = Math.PI / 2; pao.position.set(ox - 2.5, 0.95, oz - 3.0); pao.scale.setScalar(0.6); pao.userData.dinamico = true;
    const cliente = npc("regua", 0, 13); cliente.grupo.position.set(ox + 4.2, 0.03, oz - 1.2); cliente.grupo.rotation.y = -2.4; npcs.push(cliente);
    npcs.push({ grupo: pao, atualizar: (dt) => { if (est.assando > 0) { est.assando -= dt; const k = 1 - est.assando / 3; pao.scale.setScalar(0.6 + k * 0.5); pao.material.color.lerpColors(new THREE.Color(0xfff0c9), new THREE.Color(0xd99a4e), k); if (est.assando <= 0) { est.paoPronto = true; } } } });
    pao.material = new THREE.MeshToonMaterial({ color: 0xfff0c9 });
    I("forno", "🔥 Assar o pão", -2.5, -2.4, (api) => { if (est.assando > 0) return; est.assando = 3; est.paoPronto = false; pao.visible = true; pao.position.set(ox - 2.5, 0.95, oz - 3.0); api.sons.porta?.(); api.falar("rp-padaria-forno"); api.dizer("Padaria", "O pão está assando... que cheirinho bom!"); });
    I("entregar", "🥖 Entregar o pão", 3.6, -1.6, (api) => {
      if (!est.paoPronto) { api.dizer("Régua Rui", "Ainda não tem pão quentinho. Asse um no forno!"); return; }
      est.paoPronto = false; est.entregues = (est.entregues ?? 0) + 1; pao.position.set(ox + 3.6, 1.05, oz - 2.6);
      cliente.pular(); cliente.acenar(2.5); api.sons.moeda?.(); api.falar("rp-padaria-obrigado"); api.dizer("Régua Rui", "Pão quentinho! Muito obrigado, vou dividir com a minha família.");
    });
  }
  if (id === "bombeiros") {
    const alvo = new THREE.Group(); alvo.position.set(ox + 3, 0, oz - 2); alvo.userData.dinamico = true;
    const lixeira = malha(new THREE.CylinderGeometry(0.4, 0.34, 0.8, 14), mat(0x8a8f99), { contorno: 0.03 }); lixeira.position.y = 0.4; alvo.add(lixeira);
    const chamas = [0xff3d1f, 0xff8a1f, 0xffd84a].map((c, i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.45 - i * 0.12, 1.2 - i * 0.25, 10), new THREE.MeshBasicMaterial({ color: c })); m.position.y = 1.2 - i * 0.05; alvo.add(m); return m; });
    const agua = new THREE.Group(); agua.visible = false; alvo.add(agua);
    for (let i = 0; i < 16; i++) { const gt = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshToonMaterial({ color: 0x7fd6ff })); agua.add(gt); }
    npcs.push({ grupo: alvo, atualizar: (dt, t) => {
      const forca = est.fogo ?? 1;
      chamas.forEach((m, i) => { m.scale.set(forca, forca * (0.9 + Math.sin(t * 12 + i) * 0.12), forca); m.visible = forca > 0.02; });
      if (est.jato > 0) { est.jato -= dt; agua.visible = true; agua.children.forEach((gt, i) => { const f = ((t * 2 + i / 16) % 1); gt.position.set(-2.4 + f * 2.4, 1.2 + Math.sin(f * Math.PI) * 0.8 - f * 0.2, 0.6 - f * 0.6); }); est.fogo = Math.max(0, forca - dt * 0.45); if (est.fogo === 0 && !est.apagou) { est.apagou = true; est.aoApagar?.(); } } else agua.visible = false;
    } });
    solido(3, -2, 0.9, 0.9, 1.0);
    const sirene = add(new THREE.Group(), -2.5, -4.0);
    const cx = caixaRedonda(0.8, 0.6, 0.4, mat(0xe8413c), { raio: 0.1, contorno: 0.03 }); cx.position.y = 2.1; sirene.add(cx);
    const luz = malha(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshToonMaterial({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: 0 }), { sombra: false }); luz.position.y = 2.55; sirene.add(luz); sirene.userData.dinamico = true;
    const cap = npc("apontador", 0xe8413c, 14); cap.grupo.position.set(ox - 4.5, 0.03, oz - 1); cap.grupo.rotation.y = 1.2; npcs.push(cap);
    I("treino", "💧 Treino: apagar o foguinho", 0.8, -1.4, (api) => {
      if (api.profissao() !== "bombeiro") { api.dizer("Capitão Apontador", "Primeiro vista o uniforme de bombeiro no armário!"); api.falar("rp-bombeiro-uniforme"); return; }
      est.fogo = est.fogo ?? 1; est.apagou = false; est.jato = 3.2;
      est.aoApagar = () => { api.falar("rp-bombeiro-apagou"); api.dizer("Capitão Apontador", "Fogo de treino apagado! Bombeiro cuida de todo mundo."); cap.pular(); cap.acenar(2); setTimeout(() => { est.fogo = 1; }, 6000); };
      api.dizer("Bombeiros", "Mira na chama e segura a mangueira firme!");
    });
    I("sirene", "🚨 Tocar a sirene", -2.5, -2.9, (api) => { est.sirene = (est.sirene ?? 0) + 1; luz.material.emissiveIntensity = 2; setTimeout(() => (luz.material.emissiveIntensity = 0), 1600); for (let i = 0; i < 4; i++) setTimeout(() => api.sons.buzina(), i * 350); api.dizer("Bombeiros", "Uóóó-uóóó! Bombeiros a postos!"); });
  }
  if (id === "mercado") {
    const caixaR = caixaRedonda(2.4, 1.0, 1.0, mat(0x2bb24c), { raio: 0.1, contorno: 0.04 }); caixaR.position.set(2, 0.5, -2.4); g.add(caixaR); solido(2, -2.4, 2.5, 1.1);
    const esteira = caixa(1.8, 0.05, 0.6, mat(0x2f3440), { sombra: false }); esteira.position.set(2, 1.03, -2.4); g.add(esteira);
    const itens = [0xe8413c, 0xffcc1f, 0x58c43a].map((c, i) => { const it = malha(new THREE.SphereGeometry(0.15, 10, 8), mat(c), { contorno: 0.02 }); it.position.set(ox + 1.3 + i * 0.4, 1.2, oz - 2.4); it.userData.dinamico = true; return it; });
    const sacola = caixaRedonda(0.5, 0.5, 0.35, mat(0xfff4e0), { raio: 0.06, contorno: 0.03 }); sacola.position.set(3.4, 1.3, -2.4); g.add(sacola);
    npcs.push(...itens.map((it) => ({ grupo: it, atualizar: () => {} })));
    const cliente = npc("borracha", 0, 15); cliente.grupo.position.set(ox + 3.9, 0.03, oz - 1.1); cliente.grupo.rotation.y = -2.3; npcs.push(cliente);
    for (let i = 0; i < 3; i++) { const pr = caixaRedonda(2.6, 0.12, 0.6, mat(0xc98a4b), { raio: 0.03, contorno: 0.02 }); pr.position.set(-3.5, 0.5 + i * 0.6, -4.0); g.add(pr); }
    solido(-3.5, -4.0, 2.7, 0.7, 2);
    const frutas = new THREE.Group(); frutas.position.set(ox - 3.5, 0, oz - 4.0); frutas.userData.dinamico = true; frutas.visible = false;
    for (let i = 0; i < 12; i++) { const f = malha(new THREE.SphereGeometry(0.13, 8, 6), mat([0xe8413c, 0xffcc1f, 0xff8a1f, 0x58c43a][i % 4])); f.position.set(-1.1 + (i % 6) * 0.42, 0.65 + Math.floor(i / 6) * 0.6, 0); frutas.add(f); }
    npcs.push({ grupo: frutas, atualizar: () => {} });
    I("caixa", "🛒 Passar as compras", 2, -1.4, (api) => {
      est.compras = (est.compras ?? 0) + 1;
      itens.forEach((it, i) => { setTimeout(() => { api.sons.bipe(i === 2); it.position.set(ox + 3.4, 1.65 + i * 0.05, oz - 2.4); }, 400 * (i + 1)); });
      setTimeout(() => { itens.forEach((it, i) => it.position.set(ox + 1.3 + i * 0.4, 1.2, oz - 2.4)); }, 4000);
      api.falar("rp-mercado-caixa"); api.dizer("Borrachinha", "Bip, bip, bip! Obrigada pela compra.");
      setTimeout(() => cliente.acenar(2), 1500);
    });
    I("frutas", "🍎 Arrumar as frutas", -3.5, -2.9, (api) => { frutas.visible = true; est.frutas = true; api.sons.moeda?.(); api.dizer("Mercado", "Frutas arrumadinhas: maçã, banana, laranja e uva!"); });
  }
  if (id === "biblioteca") {
    const est1 = movel("estante").fazer(0x8e6cff); add(est1, -4, -4.1); solido(-4, -4.1, 1.5, 0.5, 2);
    const est2 = movel("estante").fazer(0x00b5f0); add(est2, -2.2, -4.1); solido(-2.2, -4.1, 1.5, 0.5, 2);
    add(mesa(2.2, 1.2, 0xc98a4b, 0.8), 2.5, -2.5); solido(2.5, -2.5, 2.3, 1.3);
    const livroMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const livro = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), livroMat); livro.rotation.x = -Math.PI / 2 + 0.25; livro.position.set(2.5, 0.92, -2.4); livro.userData.dinamico = true; g.add(livro);
    const leitor = npc("caderno", 0x1fc08e, 16); leitor.grupo.position.set(ox + 4.4, 0.03, oz - 2.2); leitor.grupo.rotation.y = -1.6; npcs.push(leitor);
    const carimbo = add(new THREE.Group(), 5.6, -3.8); const cb = caixaRedonda(0.3, 0.3, 0.3, mat(0xec2e8c), { raio: 0.06, contorno: 0.02 }); cb.position.y = 0.95; carimbo.add(cb); add(mesa(0.9, 0.6, 0xc98a4b, 0.8), 5.6, -3.8); solido(5.6, -3.8, 1.0, 0.7);
    let li = 0;
    I("ler", "📚 Ler um livro", 2.5, -1.4, (api) => {
      const lv = LIVROS[li % LIVROS.length]; li++; est.livro = lv.titulo;
      livroMat.map?.dispose(); livroMat.map = texturaCanvas(512, 320, (c, w, h) => { c.fillStyle = "#fffdf6"; c.fillRect(0, 0, w, h); c.fillStyle = "#8e6cff"; c.font = "800 40px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.fillText(lv.titulo, w / 2, 70); c.fillStyle = "#151515"; c.font = "700 26px 'Baloo 2', sans-serif"; const pal = lv.texto.split(" "); let l = "", y = 130; for (const p of pal) { if (c.measureText(`${l} ${p}`).width > w - 60) { c.fillText(l, w / 2, y); y += 34; l = p; } else l = l ? `${l} ${p}` : p; } c.fillText(l, w / 2, y); });
      livroMat.needsUpdate = true;
      api.falar(lv.fala); api.dizer(lv.titulo, lv.texto, 11000); leitor.acenar(2);
    });
    I("carimbo", "🔖 Carimbar o livro", 5.6, -2.9, (api) => { est.carimbos = (est.carimbos ?? 0) + 1; cb.position.y = 0.85; setTimeout(() => (cb.position.y = 0.95), 200); api.sons.bloco?.(); api.dizer("Biblioteca", "Tchac! Livro emprestado. Devolva daqui a uma semana!"); });
  }

  if (id === "parceiro-bella-cat" || id === "parceiro-rise-up") {
    const npcA = (tp, cor, semente, escala, acessorio) => criarMorador(tp, { cor, semente, escala, acessorio });
    (id === "parceiro-bella-cat" ? montarBella : montarRise)({ g, ox, oz, inter, npcs, est, solido, I, npc: npcA });
  }

  mesclar(fixo);
  // os amigos e objetos que mexem ficam em coordenadas do mundo, num grupo solto junto com a sala
  const raiz = new THREE.Group(); raiz.add(g);
  const soltos = new THREE.Group(); raiz.add(soltos);
  for (const n of npcs) if (!n.grupo.parent) soltos.add(n.grupo);
  const solidos = solidosL.map((s) => ({ x0: s.x0 + ox, x1: s.x1 + ox, z0: s.z0 + oz, z1: s.z1 + oz, y1: s.y1 }));
  return {
    id, nome: def.nome, profissao: def.profissao, grupo: raiz, solidos, interativos: inter, npcs, est,
    entrada: [ox, oz + D / 2 - 1.6], porta: [ox, oz + D / 2 - 0.6],
    atualizar(dt, t) { for (const n of npcs) n.atualizar(dt, t, { vel: 0 }); if (est.dancando > 0) { est.dancando -= dt; for (const n of npcs) if (n.pular && Math.random() < dt * 2) n.pular(); } },
  };
}
