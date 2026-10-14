// Rabiscolândia: as aulas por idade nas salas da Educarte (vieram da Rabiscópolis). A Professora Lápis Turquesa
// fica perto da lousa; a ação perto dela começa a próxima aula (Inglês, Português, Matemática) no nível da idade da
// criança (aulas.js: bebê até 4 anos na Kids I; 5–6, 7–8 e 9–12 na Kids II). Errar só dá dica e repete; no fim,
// confete e "O sábio ouve e aprende ainda mais" (baseado em Provérbios 1.5). O sino, a lousa e a musiquinha da sala
// continuam. Na escola "da outra idade", a professora avisa onde é a turma da criança.
//   montarAulas({ id, g, ox, oz, inter, npcs, est, solido, escrever, idade })  (chamado por montarSala)

import { THREE, mat, malha, caixaRedonda, texturaCanvas, mesclar } from "./base3d.js";
import { criarMorador } from "./personagens.js";
import { falar, falarSequencia } from "../../src/motor/voz.js";
import { nivelDaIdade, MATERIAS } from "./aulas.js";

const COR_OBJ = { vermelho: 0xe53935, azul: 0x1e6fe0, amarelo: 0xffc928, verde: 0x2bb24c };
const COR_LETRA = ["#ec2e8c", "#ff9f43", "#ffcc1f", "#58c43a", "#00b5f0", "#8e6cff"];
const TEXTO_AULA = {
  aulaIngles: { bebe: "Vamos aprender as cores em inglês! Escute e ache a bola da cor certa. Depois aperte o botão!", k: "Aula de inglês! Escute bem e ache o que eu pedir. Depois aperte o botão!" },
  aulaPortugues: { bebe: "Vamos ouvir os bichinhos! Escute o som e ache o bichinho certo!", k: "Aula de português! Vamos escrever uma palavra: pegue as letras na ordem certa!" },
  aulaMatematica: { bebe: "Vamos brincar com as formas e contar até três!", k: "Aula de matemática! Pegue as maçãs na bandeja e leve para a minha mesa!" },
};
const FALA_AULA = { aulaIngles: "cid-aula-ingles", aulaPortugues: "cid-aula-portugues", aulaMatematica: "cid-aula-matematica" };
// onde os objetos da aula aparecem (local da sala; longe dos alunos do meio, do sino e da lousa)
const VAGAS = [[-5.4, -1.5], [-4.0, -1.5], [-5.4, 0.2], [-4.0, 0.2], [3.6, 0.3], [5.0, 0.3], [-5.4, 1.9], [-4.0, 1.9], [3.6, 1.9], [5.0, 1.9], [-2.6, 2.6]];
const embaralhar = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
const fala = (chaves) => { falarSequencia(chaves).then((ok) => { if (!ok && chaves[0]) falar(chaves[0]); }); };

// objetos das aulas (copiados de jogos/cidade-do-rabisco/interiores.js · objetoAula, no traço toon da cidade)
export function objetoAula({ tipo, valor }) {
  const g = new THREE.Group();
  const bola = (r, cor, x, y, z, c = 0.03) => { const m = malha(new THREE.SphereGeometry(r, 16, 12), mat(cor), { contorno: c, sombra: false }); m.position.set(x, y, z); g.add(m); return m; };
  if (tipo === "livro") {
    const l = new THREE.Group(); l.position.y = 0.5; l.rotation.y = 0.35; g.add(l);
    const capa = caixaRedonda(0.66, 0.86, 0.26, mat(COR_OBJ[valor]), { raio: 0.04, contorno: 0.03, sombra: false }); l.add(capa);
    const folhas = caixaRedonda(0.6, 0.8, 0.2, mat(0xfffbee), { raio: 0.02, sombra: false }); folhas.position.x = 0.05; l.add(folhas);
    const estrela = malha(new THREE.CircleGeometry(0.13, 5), mat(0xffffff), { sombra: false }); estrela.position.set(0, 0.12, 0.135); l.add(estrela);
  } else if (tipo === "bicho") {
    const cor = { gato: 0xff9f43, cachorro: 0x9a6232, pato: 0xffd84a }[valor];
    if (valor === "pato") {
      bola(0.36, cor, 0, 0.34, 0).scale.set(1, 0.8, 1.25); bola(0.24, cor, 0, 0.78, 0.18);
      const bico = malha(new THREE.ConeGeometry(0.08, 0.22, 8), mat(0xff8a1f), { sombra: false }); bico.rotation.x = Math.PI / 2; bico.position.set(0, 0.76, 0.46); g.add(bico);
      for (const s of [-1, 1]) { bola(0.065, 0xffffff, s * 0.1, 0.85, 0.35, 0); bola(0.035, 0x151515, s * 0.1, 0.86, 0.41, 0); }
    } else {
      bola(0.34, cor, 0, 0.36, 0).scale.set(1, 0.9, 1.1); bola(0.27, cor, 0, 0.82, 0.12);
      for (const s of [-1, 1]) {
        if (valor === "gato") { const o = malha(new THREE.ConeGeometry(0.09, 0.2, 4), mat(cor), { contorno: 0.02, sombra: false }); o.position.set(s * 0.14, 1.07, 0.1); g.add(o); }
        else bola(1, 0x6b4224, s * 0.26, 0.8, 0.08, 0).scale.set(0.07, 0.17, 0.11);
        bola(0.07, 0xffffff, s * 0.1, 0.88, 0.33, 0); bola(0.04, 0x151515, s * 0.1, 0.89, 0.39, 0);
      }
      bola(0.05, valor === "gato" ? 0xec2e8c : 0x151515, 0, 0.8, 0.39, 0);
    }
  } else if (tipo === "bola") {
    bola(0.38, COR_OBJ[valor], 0, 0.4, 0, 0.04);
    const f = malha(new THREE.TorusGeometry(0.385, 0.03, 6, 24), mat(0xffffff), { sombra: false }); f.position.y = 0.4; g.add(f);
  } else if (tipo === "forma") {
    const cor = { circulo: 0xe53935, quadrado: 0x1e6fe0, triangulo: 0xffc928 }[valor];
    let geo;
    if (valor === "triangulo") { const t = new THREE.Shape([new THREE.Vector2(0, 0.46), new THREE.Vector2(-0.48, -0.36), new THREE.Vector2(0.48, -0.36)]); geo = new THREE.ExtrudeGeometry(t, { depth: 0.14, bevelEnabled: false }); geo.translate(0, 0, -0.07); }
    else if (valor === "circulo") { geo = new THREE.CylinderGeometry(0.42, 0.42, 0.14, 28); geo.rotateX(Math.PI / 2); }
    else geo = new THREE.BoxGeometry(0.72, 0.72, 0.14);
    const f = malha(geo, mat(cor), { contorno: 0.03, sombra: false }); f.position.y = 0.66; g.add(f);
    const pe = caixaRedonda(0.5, 0.1, 0.3, mat(0xffffff), { raio: 0.03, sombra: false }); pe.position.y = 0.05; g.add(pe);
    const haste = caixaRedonda(0.06, 0.2, 0.06, mat(0xffffff), { raio: 0.02, sombra: false }); haste.position.y = 0.18; g.add(haste);
  } else if (tipo === "letra") {
    const cor = COR_LETRA[valor.charCodeAt(0) % 6];
    const tex = texturaCanvas(128, 128, (c, w, h) => { c.fillStyle = "#fffaf0"; c.fillRect(0, 0, w, h); c.lineWidth = 10; c.strokeStyle = cor; c.strokeRect(5, 5, w - 10, h - 10); c.font = "900 96px 'Baloo 2', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = cor; c.fillText(valor, w / 2, h / 2 + 6); });
    const cubo = malha(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshToonMaterial({ map: tex }), { contorno: 0.03, sombra: false }); cubo.position.y = 0.36; cubo.rotation.y = 0.2; g.add(cubo);
  }
  mesclar(g);
  const anel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 6, 28), new THREE.MeshBasicMaterial({ color: 0xffcc1f })); anel.rotation.x = Math.PI / 2; anel.position.y = 0.06; anel.visible = false; g.add(anel);
  g.userData.anel = anel;
  return g;
}
function macaGeo() { const g = new THREE.SphereGeometry(0.14, 12, 10); g.scale(1, 0.92, 1); return g; }
function pilhaDeMacas(n) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const m = malha(macaGeo(), mat(0xe53935), { contorno: 0.02, sombra: false }); m.position.set(((i % 3) - 1) * 0.3, Math.floor(i / 3) * 0.26, 0); g.add(m); }
  mesclar(g);
  return g;
}

export function montarAulas({ id, g, ox, oz, inter, npcs, est, solido, escrever, idade }) {
  const nivel = nivelDaIdade(idade), daqui = (nivel === "bebe") === (id === "kids1");
  // professora, a mesa dela (cesta das maçãs) e a bandeja de maçãs
  const prof = criarMorador("lapis", { cor: 0x2ec4b6, nome: "Professora Lápis Turquesa", semente: 9, escala: 0.82, acessorio: "oculos" });
  prof.grupo.position.set(ox + 2.4, 0.03, oz - 3.6); npcs.push(prof);
  const fixos = new THREE.Group(); g.add(fixos);
  const madeira = mat(id === "kids1" ? 0xffd3e2 : 0xc98a4b);
  const mesa = (x, z, w = 1.3, d = 0.7) => { const t = caixaRedonda(w, 0.1, d, madeira, { raio: 0.04, contorno: 0.03 }); t.position.set(x, 0.8, z); fixos.add(t); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = malha(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), mat(0x8a5a32)); p.position.set(x + a * (w / 2 - 0.1), 0.4, z + b * (d / 2 - 0.1)); fixos.add(p); } solido(x, z, w + 0.1, d + 0.1); };
  mesa(0.7, -3.75); mesa(-4.2, -3.75);
  const cesta = malha(new THREE.CylinderGeometry(0.34, 0.26, 0.3, 14, 1, true), mat(0xc98a3c, { side: THREE.DoubleSide }), { contorno: 0.02 }); cesta.position.set(0.9, 1.0, -3.75); fixos.add(cesta);
  mesclar(fixos);
  // as maçãs da bandeja: uma malha só (InstancedMesh); "count" mostra as que sobraram
  const macas = new THREE.InstancedMesh(macaGeo(), mat(0xe53935), 10); macas.userData.dinamico = true;
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 10; i++) { m4.makeTranslation(ox - 4.7 + (i % 5) * 0.25, 0.98, oz - 3.9 + Math.floor(i / 5) * 0.28); macas.setMatrixAt(i, m4); }
  const soltos = new THREE.Group(); soltos.add(macas);
  const naCesta = new THREE.Group(); naCesta.position.set(ox + 0.9, 1.2, oz - 3.75); soltos.add(naCesta);
  npcs.push({ grupo: soltos, atualizar: (dt, t) => animar(dt, t) });

  let aula = null, ordem = 0, rabisco = null, pilha = null;
  const it = { id: "aula", rotulo: "", local: [2.4, -2.5], pos: [ox + 2.4, oz - 2.5], raio: 1.4, fazer: (api) => comecar(api) };
  const rotuloAula = () => { const M = MATERIAS[ordem % 3]; it.rotulo = daqui ? `${M.icone} ${M.nome} com a Professora` : "💬 Falar com a Professora"; };
  rotuloAula(); inter.push(it);
  est.aulas = { nivel, daqui, feitas: [], aula: null };
  const dizerProf = (api, texto, ms = 3400) => api.dizer("Professora Lápis Turquesa", texto, ms);

  function comecar(api) {
    rabisco = api.rabisco;
    if (!daqui) { prof.acenar(2); fala([id === "kids1" ? "cid-aula-outra-kids1" : "cid-aula-outra-kids2"]); dizerProf(api, id === "kids1" ? "Aqui é a Educarte Kids I, a escolinha dos pequenininhos! A sua turma estuda na Educarte Kids II." : "Aqui é a Educarte Kids II, a escola dos maiores! A sua turma estuda na Educarte Kids I, do outro lado da cidade.", 5200); return; }
    if (aula) return;
    const M = MATERIAS[ordem % 3];
    aula = { M, api, rod: M.gerar(nivel, Math.random), i: -1, objs: [], pos: 0, carregando: 0, espera: true };
    removerInter(it);
    prof.acenar(2.5); prof.pular();
    fala([`${FALA_AULA[M.id]}${nivel === "bebe" ? "-bebe" : ""}`]);
    dizerProf(api, TEXTO_AULA[M.id][nivel === "bebe" ? "bebe" : "k"], 4600);
    escrever([M.nome]);
    setTimeout(() => { if (aula?.M === M) { aula.espera = false; proxima(); } }, 2600);
  }
  const removerInter = (x) => { const k = inter.indexOf(x); if (k >= 0) inter.splice(k, 1); };
  function limparRodada() {
    for (const o of aula.objs) { o.g.removeFromParent(); removerInter(o.inter); }
    aula.objs = [];
    for (const x of [aula.pegar, aula.entregar]) if (x) removerInter(x);
    aula.pegar = aula.entregar = null;
  }
  function proxima() {
    limparRodada();
    aula.i++;
    const R = aula.R = aula.rod[aula.i];
    est.aulas.aula = R ? { materia: aula.M.id, i: aula.i, total: aula.rod.length, tipo: R.tipo, certo: R.certo ?? null, palavra: R.palavra ?? null, n: R.n ?? null } : null;
    if (!R) return terminar();
    aula.pos = 0; aula.carregando = 0; macas.count = 10;
    const por = (itens) => itens.forEach((op, k) => {
      const [x, z] = VAGAS[k % VAGAS.length], o = objetoAula(op); o.position.set(ox + x, 0.03, oz + z); soltos.add(o);
      const obj = { ...op, g: o, x: ox + x, z: oz + z };
      obj.inter = { id: `obj-${op.valor}-${k}`, valor: op.valor, rotulo: "✋ Este!", local: [x, z], pos: [ox + x, oz + z], raio: 0.95, fazer: () => escolher(obj) };
      inter.push(obj.inter); aula.objs.push(obj);
    });
    if (R.tipo === "achar") { por(embaralhar(R.opcoes)); escrever(R.sub ? [R.lousa, R.sub] : [R.lousa]); }
    else if (R.tipo === "letras") { por(R.blocos.map((l) => ({ tipo: "letra", valor: l, nome: `a letra ${l}` }))); escreverPalavra(); }
    else {
      escrever([R.lousa, `Traga ${R.n} maçãs`]);
      aula.pegar = { id: "macas", rotulo: "🍎 Pegar maçã", local: [-4.2, -2.8], pos: [ox - 4.2, oz - 2.8], raio: 1.3, fazer: () => pegarMaca() };
      aula.entregar = { id: "mesa", rotulo: "🧺 Entregar na mesa", local: [0.7, -2.8], pos: [ox + 0.7, oz - 2.8], raio: 1.2, fazer: () => entregarMacas() };
      inter.push(aula.pegar, aula.entregar);
    }
    fala(R.fala);
  }
  const ehIngles = () => aula?.M.id === "aulaIngles";
  function escreverPalavra() { const R = aula.R; escrever([[...R.palavra].map((l, k) => (k < aula.pos ? l : "_")).join(" ")]); }
  function acertou(espera = 2300) {
    aula.espera = true; aula.api.sons.moeda?.(); prof.pular(); prof.acenar(2);
    fala([ehIngles() ? "en-cid-yes" : "cid-aula-certo"]);
    dizerProf(aula.api, ehIngles() ? "Yes! Great job! Muito bem!" : ["Muito bem!", "Isso mesmo!", "Que capricho!"][aula.i % 3], 2000);
    const A = aula;
    setTimeout(() => { if (aula === A) { aula.espera = false; proxima(); } }, espera);
  }
  function errou(texto, falas) {
    aula.api.sons.erro?.();
    est.aulas.dicas = (est.aulas.dicas ?? 0) + 1;
    dizerProf(aula.api, texto, 3400);
    fala([...(falas ?? [ehIngles() ? "en-cid-try" : "cid-aula-dica"]), ...aula.R.fala]);
  }
  function escolher(obj) {
    if (!aula?.R || aula.espera) return;
    const R = aula.R;
    if (R.tipo === "achar") {
      if (obj.valor === R.certo) { obj.g.position.y += 0.35; acertou(); }
      else errou(`Esse é ${obj.nome}. Escute de novo e tente outra vez!`);
    } else if (R.tipo === "letras") {
      const certa = R.palavra[aula.pos];
      if (obj.valor === certa) {
        aula.pos++; aula.api.sons.letra?.(); falar(`letra-${certa}`); escreverPalavra(); obj.festa = 0.5;
        if (aula.pos === R.palavra.length) { aula.espera = true; const A = aula; setTimeout(() => { if (aula === A) { aula.espera = false; acertou(2600); } }, 900); }
      } else errou(`Essa é a letra ${obj.valor}. Procure a letra ${certa}!`, ["cid-aula-procure", `letra-${certa}`]);
    }
  }
  function carregar(n) {
    if (pilha) { pilha.removeFromParent(); pilha = null; }
    if (n && rabisco) { pilha = pilhaDeMacas(n); pilha.position.y = 2.35 / (rabisco.grupo.scale.y || 1); rabisco.grupo.add(pilha); }
  }
  function pegarMaca() {
    if (!aula?.R || aula.espera || aula.R.tipo !== "contar") return;
    if (aula.carregando >= 10) { dizerProf(aula.api, "Já está bem cheio! Leve para a mesa.", 2200); return; }
    aula.carregando++; macas.count = 10 - aula.carregando;
    aula.api.sons.moeda?.(); falar(`cid-num-${aula.carregando}`);
    carregar(aula.carregando);
  }
  function entregarMacas() {
    if (!aula?.R || aula.espera || aula.R.tipo !== "contar" || !aula.carregando) return;
    const R = aula.R, c = aula.carregando;
    carregar(0);
    if (c === R.n) { const p = pilhaDeMacas(c); p.scale.setScalar(0.7); naCesta.add(p); aula.objs.push({ g: p }); acertou(2600); }
    else { aula.carregando = 0; macas.count = 10; errou(`Você trouxe ${c}. ${R.lousa.includes("?") ? "Faça a conta de novo, devagarinho!" : `Eu pedi ${R.n}.`} Vamos contar de novo!`, ["cid-aula-conta-de-novo"]); }
  }
  function terminar() {
    const M = aula.M, api = aula.api;
    limparRodada(); carregar(0); macas.count = 10;
    aula = null; ordem++; est.aulas.feitas.push(M.id); est.aulas.aula = null;
    escrever(["Parabéns!", `★ ${M.nome} ★`]);
    prof.pular(); prof.acenar(3.5); api.sons.vitoria?.(); api.confete?.();
    fala(["cid-aula-fim"]);
    dizerProf(api, "Parabéns, Rabisco! Você aprendeu muito hoje! “O sábio ouve e aprende ainda mais.” (baseado em Provérbios 1.5)", 6400);
    rotuloAula(); inter.push(it);
  }
  // o objeto mais perto do Rabisco ganha o anelzinho amarelo; os que acertou dão pulinho
  function animar(dt, t) {
    if (!aula) return;
    const p = rabisco?.grupo.getWorldPosition(_p);
    let melhor = null, dm = 1.0;
    for (const o of aula.objs) { if (!o.inter) continue; const d = p ? Math.hypot(o.x - p.x, o.z - p.z) : 9; if (d < dm) { dm = d; melhor = o; } if (o.festa > 0) { o.festa -= dt; o.g.position.y = 0.03 + Math.abs(Math.sin(t * 12)) * 0.3; } }
    for (const o of aula.objs) if (o.g.userData.anel) o.g.userData.anel.visible = o === melhor;
  }
  const _p = new THREE.Vector3();
  return { prof };
}
