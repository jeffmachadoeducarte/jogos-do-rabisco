// Rabiscolândia: os móveis da casa (catálogo de ~30), no mesmo traço da cidade. Cada móvel é uma função que recebe
// a cor escolhida e devolve um grupo com a frente para +z, o chão em y = 0, e userData.pegada [largura, fundo].
// Os quadros de versículo usam paráfrases para crianças com "baseado em ...".

import { THREE, matNovo, mat, malha, caixa, caixaRedonda, MAT, texturaCanvas } from "./base3d.js";

export const CORES_MOVEL = [0xec2e8c, 0x00b5f0, 0xffcc1f, 0x58c43a, 0x8e6cff, 0xff7a00, 0xfff4e0, 0x9a6232];
const MADEIRA = 0xc98a4b, MADEIRA_ESCURA = 0x8a5a32, BRANCO = 0xfffdf6;

// versículos em paráfrase infantil (com a referência em que se baseiam)
export const VERSICULOS = [
  { texto: "Deus cuida de mim todos os dias.", ref: "baseado em 1 Pedro 5.7" },
  { texto: "O Senhor é o meu pastor: nada vai me faltar.", ref: "baseado no Salmo 23.1" },
  { texto: "Amem uns aos outros como Jesus nos amou.", ref: "baseado em João 13.34" },
  { texto: "Eu e minha família vamos servir ao Senhor.", ref: "baseado em Josué 24.15" },
  { texto: "Tudo o que respira louve ao Senhor!", ref: "baseado no Salmo 150.6" },
  { texto: "Sejam bondosos e perdoem uns aos outros.", ref: "baseado em Efésios 4.32" },
];
const texVersiculo = new Map();
function texturaVersiculo(i, corFundo) {
  const k = `${i}|${corFundo}`;
  if (texVersiculo.has(k)) return texVersiculo.get(k);
  const v = VERSICULOS[i % VERSICULOS.length];
  const t = texturaCanvas(512, 384, (c, w, h) => {
    c.fillStyle = `#${new THREE.Color(corFundo).getHexString()}`; c.fillRect(0, 0, w, h);
    c.fillStyle = "#fffdf6"; c.beginPath(); c.roundRect(22, 22, w - 44, h - 44, 26); c.fill();
    c.fillStyle = "#151515"; c.textAlign = "center"; c.textBaseline = "middle";
    const palavras = v.texto.split(" "), linhas = []; let l = "";
    c.font = "800 44px 'Baloo 2', sans-serif";
    for (const p of palavras) { const t2 = l ? `${l} ${p}` : p; if (c.measureText(t2).width > w - 100) { linhas.push(l); l = p; } else l = t2; }
    linhas.push(l);
    linhas.forEach((ln, n) => c.fillText(ln, w / 2, h / 2 - 30 - ((linhas.length - 1) * 50) / 2 + n * 50));
    c.font = "700 26px 'Baloo 2', sans-serif"; c.fillStyle = "#8e6cff"; c.fillText(v.ref, w / 2, h - 62);
    c.fillStyle = "#ffcc1f"; c.font = "40px sans-serif"; c.fillText("✝", w / 2, 64);
  });
  texVersiculo.set(k, t);
  return t;
}
const novoG = (w, d) => { const g = new THREE.Group(); g.userData.pegada = [w, d]; return g; };
const perna = (g, x, z, h, cor = MADEIRA_ESCURA, r = 0.05) => { const p = malha(new THREE.CylinderGeometry(r, r, h, 8), mat(cor)); p.position.set(x, h / 2, z); g.add(p); };

export const MOVEIS = [
  // ---- sala
  { id: "sofa", nome: "Sofá", comodo: "sala", fazer(cor) {
    const g = novoG(2.4, 1.0);
    const base = caixaRedonda(2.4, 0.5, 0.95, mat(cor)); base.position.y = 0.4; g.add(base);
    const enc = caixaRedonda(2.4, 0.7, 0.28, mat(cor)); enc.position.set(0, 0.85, -0.36); g.add(enc);
    for (const s of [-1, 1]) { const b = caixaRedonda(0.28, 0.55, 0.95, mat(cor)); b.position.set(s * 1.1, 0.7, 0); g.add(b); }
    for (const s of [-0.5, 0.5]) { const a = caixaRedonda(1.0, 0.18, 0.7, mat(new THREE.Color(cor).lerp(new THREE.Color(0xffffff), 0.35).getHex())); a.position.set(s, 0.72, 0.05); g.add(a); }
    return g; } },
  { id: "poltrona", nome: "Poltrona", comodo: "sala", fazer(cor) {
    const g = novoG(1.1, 1.0);
    const base = caixaRedonda(1.0, 0.45, 0.9, mat(cor)); base.position.y = 0.38; g.add(base);
    const enc = caixaRedonda(1.0, 0.8, 0.25, mat(cor)); enc.position.set(0, 0.85, -0.34); g.add(enc);
    for (const s of [-1, 1]) { const b = caixaRedonda(0.22, 0.5, 0.9, mat(cor)); b.position.set(s * 0.45, 0.65, 0); g.add(b); }
    return g; } },
  { id: "mesa-centro", nome: "Mesinha de centro", comodo: "sala", fazer(cor) {
    const g = novoG(1.3, 0.8);
    const t = caixaRedonda(1.3, 0.1, 0.75, mat(cor)); t.position.y = 0.45; g.add(t);
    for (const [x, z] of [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]]) perna(g, x, z, 0.4);
    const livro = caixa(0.35, 0.08, 0.25, mat(0xe8413c), { sombra: false }); livro.position.set(-0.2, 0.54, 0); g.add(livro);
    return g; } },
  { id: "tapete", nome: "Tapete redondo", comodo: "sala", baixo: true, fazer(cor) {
    const g = novoG(2.2, 2.2);
    const t = malha(new THREE.CylinderGeometry(1.1, 1.1, 0.03, 32), mat(cor), { sombra: false }); t.position.y = 0.02; g.add(t);
    const t2 = malha(new THREE.CylinderGeometry(0.7, 0.7, 0.035, 28), mat(0xfff4e0), { sombra: false }); t2.position.y = 0.025; g.add(t2);
    return g; } },
  { id: "tv", nome: "TV com rack", comodo: "sala", fazer(cor) {
    const g = novoG(1.8, 0.5);
    const rack = caixaRedonda(1.8, 0.5, 0.45, mat(cor)); rack.position.y = 0.25; g.add(rack);
    const tv = caixaRedonda(1.4, 0.85, 0.08, mat(0x2a2a2a)); tv.position.set(0, 1.0, -0.1); g.add(tv);
    const tela = caixa(1.28, 0.74, 0.02, MAT.janela, { sombra: false }); tela.position.set(0, 1.0, -0.05); g.add(tela);
    return g; } },
  { id: "estante", nome: "Estante de livros", comodo: "sala", fazer(cor) {
    const g = novoG(1.4, 0.4);
    const corpo = caixaRedonda(1.4, 2.0, 0.38, mat(cor)); corpo.position.y = 1.0; g.add(corpo);
    const cores = [0xe8413c, 0x00b5f0, 0xffcc1f, 0x58c43a, 0x8e6cff, 0xff7a00];
    for (let n = 0; n < 3; n++) for (let i = 0; i < 7; i++) { const l = caixa(0.14, 0.42 + (i % 3) * 0.04, 0.26, mat(cores[(i + n) % 6]), { sombra: false }); l.position.set(-0.5 + i * 0.165, 0.42 + n * 0.62, 0.08); g.add(l); }
    return g; } },
  { id: "abajur", nome: "Abajur", comodo: "sala", fazer(cor) {
    const g = novoG(0.5, 0.5);
    perna(g, 0, 0, 1.3, 0x2f3440, 0.04);
    const cup = malha(new THREE.CylinderGeometry(0.22, 0.32, 0.38, 16, 1, true), mat(cor, { side: THREE.DoubleSide })); cup.position.y = 1.4; g.add(cup);
    const luz = malha(new THREE.SphereGeometry(0.1, 10, 8), MAT.lampada, { sombra: false }); luz.position.y = 1.3; g.add(luz);
    const pe = malha(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 16), mat(0x2f3440)); pe.position.y = 0.03; g.add(pe);
    return g; } },
  { id: "planta", nome: "Vaso de planta", comodo: "sala", fazer(cor) {
    const g = novoG(0.6, 0.6);
    const vaso = malha(new THREE.CylinderGeometry(0.28, 0.2, 0.45, 14), mat(cor)); vaso.position.y = 0.22; g.add(vaso);
    for (let i = 0; i < 5; i++) { const f = malha(new THREE.SphereGeometry(0.25, 8, 6), mat(i % 2 ? 0x4cb83f : 0x5cc443)); f.scale.set(0.6, 1.2, 0.6); const a = (i / 5) * 6.28; f.position.set(Math.cos(a) * 0.12, 0.75 + (i % 2) * 0.2, Math.sin(a) * 0.12); f.rotation.z = Math.cos(a) * 0.4; g.add(f); }
    return g; } },
  { id: "quadro-versiculo", nome: "Quadro de versículo", comodo: "parede", parede: true, fazer(cor, variante = 0) {
    const g = novoG(1.2, 0.1);
    const mold = caixaRedonda(1.25, 0.95, 0.06, mat(MADEIRA)); mold.position.y = 1.6; g.add(mold);
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.82), matNovo({ map: texturaVersiculo(variante, cor) })); tela.position.set(0, 1.6, 0.035); g.add(tela);
    g.userData.versiculo = VERSICULOS[variante % VERSICULOS.length];
    return g; }, variantes: VERSICULOS.length },
  { id: "relogio", nome: "Relógio de parede", comodo: "parede", parede: true, fazer(cor) {
    const g = novoG(0.6, 0.1);
    const aro = malha(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 24), mat(cor)); aro.rotation.x = Math.PI / 2; aro.position.y = 1.9; g.add(aro);
    const face = malha(new THREE.CylinderGeometry(0.25, 0.25, 0.07, 24), mat(BRANCO)); face.rotation.x = Math.PI / 2; face.position.set(0, 1.9, 0.005); g.add(face);
    for (const [w, h, r] of [[0.03, 0.18, 0], [0.03, 0.13, 1.6]]) { const p = caixa(w, h, 0.02, mat(0x151515), { sombra: false }); p.position.set(Math.sin(r) * h / 2, 1.9 + Math.cos(r) * h / 2, 0.05); p.rotation.z = -r; g.add(p); }
    return g; } },
  { id: "oracao", nome: "Cantinho de oração", comodo: "sala", fazer(cor) {
    const g = novoG(1.6, 1.2);
    const tap = malha(new THREE.CylinderGeometry(0.8, 0.8, 0.03, 28), mat(0xfff4e0), { sombra: false }); tap.position.y = 0.02; g.add(tap);
    for (const [x, z, c] of [[-0.45, 0.2, cor], [0.45, 0.2, 0x00b5f0]]) { const a = caixaRedonda(0.55, 0.22, 0.55, mat(c)); a.position.set(x, 0.12, z); g.add(a); }
    // mesinha baixa com a Bíblia aberta e um potinho de flor
    const mesa = caixaRedonda(0.8, 0.08, 0.45, mat(MADEIRA)); mesa.position.set(0, 0.35, -0.4); g.add(mesa);
    for (const x of [-0.32, 0.32]) perna(g, x, -0.4, 0.32, MADEIRA_ESCURA, 0.03);
    for (const s of [-1, 1]) { const pag = caixa(0.24, 0.04, 0.32, mat(BRANCO), { sombra: false }); pag.position.set(s * 0.12, 0.42, -0.4); pag.rotation.z = s * -0.12; g.add(pag); }
    const capa = caixa(0.52, 0.03, 0.34, mat(0x7a2a2a), { sombra: false }); capa.position.set(0, 0.395, -0.4); g.add(capa);
    const flor = malha(new THREE.SphereGeometry(0.08, 8, 6), mat(0xff9cc0)); flor.position.set(0.3, 0.5, -0.45); g.add(flor);
    return g; } },
  { id: "piano", nome: "Piano", comodo: "sala", fazer(cor) {
    const g = novoG(1.6, 0.7);
    const corpo = caixaRedonda(1.6, 1.2, 0.6, mat(cor)); corpo.position.set(0, 0.6, -0.05); g.add(corpo);
    const teclas = caixa(1.4, 0.06, 0.25, mat(BRANCO), { sombra: false }); teclas.position.set(0, 0.78, 0.3); g.add(teclas);
    for (let i = 0; i < 9; i++) { const p = caixa(0.07, 0.07, 0.14, mat(0x151515), { sombra: false }); p.position.set(-0.62 + i * 0.155, 0.83, 0.25); g.add(p); }
    return g; } },
  { id: "aquario", nome: "Aquário", comodo: "sala", fazer(cor) {
    const g = novoG(1.0, 0.5);
    const mov = caixaRedonda(1.0, 0.7, 0.45, mat(cor)); mov.position.y = 0.35; g.add(mov);
    const vid = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.4), matNovo({ color: 0x7fd6ff, transparent: true, opacity: 0.55 })); vid.position.y = 0.98; g.add(vid);
    for (const [x, c] of [[-0.2, 0xff7a00], [0.15, 0xffcc1f]]) { const p = malha(new THREE.SphereGeometry(0.06, 8, 6), mat(c)); p.scale.x = 1.6; p.position.set(x, 1.0, 0); g.add(p); }
    return g; } },
  // ---- quarto
  { id: "cama", nome: "Cama", comodo: "quarto", fazer(cor) {
    const g = novoG(1.4, 2.1);
    const base = caixaRedonda(1.4, 0.35, 2.0, mat(MADEIRA)); base.position.y = 0.25; g.add(base);
    const colchao = caixaRedonda(1.3, 0.22, 1.9, mat(BRANCO)); colchao.position.y = 0.5; g.add(colchao);
    const coberta = caixaRedonda(1.34, 0.12, 1.3, mat(cor)); coberta.position.set(0, 0.6, 0.3); g.add(coberta);
    const trav = caixaRedonda(0.5, 0.18, 0.35, mat(BRANCO)); trav.position.set(0, 0.68, -0.7); g.add(trav);
    const cab = caixaRedonda(1.45, 1.0, 0.12, mat(MADEIRA)); cab.position.set(0, 0.7, -1.0); g.add(cab);
    return g; } },
  { id: "beliche", nome: "Beliche", comodo: "quarto", fazer(cor) {
    const g = novoG(1.2, 2.1);
    for (const y of [0.35, 1.45]) { const c = caixaRedonda(1.15, 0.2, 1.95, mat(BRANCO)); c.position.y = y; g.add(c); const cob = caixaRedonda(1.18, 0.1, 1.2, mat(y > 1 ? cor : 0x00b5f0)); cob.position.set(0, y + 0.12, 0.3); g.add(cob); }
    for (const [x, z] of [[-0.58, -0.95], [0.58, -0.95], [-0.58, 0.95], [0.58, 0.95]]) perna(g, x, z, 2.1, MADEIRA, 0.06);
    for (let i = 0; i < 4; i++) { const d = caixa(0.04, 0.04, 0.4, mat(MADEIRA), { sombra: false }); d.position.set(0.62, 0.5 + i * 0.35, 0.7); g.add(d); }
    return g; } },
  { id: "berco", nome: "Berço", comodo: "quarto", fazer(cor) {
    const g = novoG(0.9, 1.4);
    const base = caixaRedonda(0.85, 0.15, 1.3, mat(BRANCO)); base.position.y = 0.45; g.add(base);
    const lenc = caixa(0.8, 0.1, 1.25, mat(cor), { sombra: false }); lenc.position.y = 0.55; g.add(lenc);
    for (let i = 0; i <= 8; i++) for (const s of [-1, 1]) { const g2 = caixa(0.04, 0.6, 0.04, mat(BRANCO), { sombra: false }); g2.position.set(s * 0.42, 0.75, -0.6 + i * 0.15); g.add(g2); }
    for (const [x, z] of [[-0.42, -0.65], [0.42, -0.65], [-0.42, 0.65], [0.42, 0.65]]) perna(g, x, z, 1.05, BRANCO, 0.04);
    const ursinho = malha(new THREE.SphereGeometry(0.13, 10, 8), mat(0xd9a066)); ursinho.position.set(0, 0.7, -0.3); g.add(ursinho);
    return g; } },
  { id: "guarda-roupa", nome: "Guarda-roupa", comodo: "quarto", fazer(cor) {
    const g = novoG(1.6, 0.6);
    const c = caixaRedonda(1.6, 2.1, 0.58, mat(cor)); c.position.y = 1.05; g.add(c);
    const linha = caixa(0.03, 1.9, 0.6, mat(0x151515), { sombra: false }); linha.position.y = 1.05; g.add(linha);
    for (const s of [-1, 1]) { const m = malha(new THREE.SphereGeometry(0.05, 8, 6), mat(0xffcc1f)); m.position.set(s * 0.12, 1.1, 0.3); g.add(m); }
    return g; } },
  { id: "comoda", nome: "Cômoda", comodo: "quarto", fazer(cor) {
    const g = novoG(1.2, 0.5);
    const c = caixaRedonda(1.2, 0.9, 0.48, mat(cor)); c.position.y = 0.45; g.add(c);
    for (let i = 0; i < 3; i++) { const l = caixa(1.05, 0.02, 0.5, mat(0x151515), { sombra: false }); l.position.y = 0.2 + i * 0.28; g.add(l); const m = malha(new THREE.SphereGeometry(0.04, 8, 6), mat(0xffcc1f)); m.position.set(0, 0.33 + i * 0.28, 0.25); g.add(m); }
    return g; } },
  { id: "criado", nome: "Criado-mudo com luminária", comodo: "quarto", fazer(cor) {
    const g = novoG(0.5, 0.45);
    const c = caixaRedonda(0.5, 0.55, 0.42, mat(cor)); c.position.y = 0.28; g.add(c);
    const lum = malha(new THREE.ConeGeometry(0.15, 0.22, 12, 1, true), mat(BRANCO, { side: THREE.DoubleSide })); lum.position.y = 0.85; g.add(lum);
    perna(g, 0, 0, 0.75, 0x2f3440, 0.025);
    return g; } },
  { id: "bau", nome: "Baú de brinquedos", comodo: "quarto", fazer(cor) {
    const g = novoG(1.0, 0.6);
    const c = caixaRedonda(1.0, 0.55, 0.55, mat(cor)); c.position.y = 0.28; g.add(c);
    const tampa = caixaRedonda(1.04, 0.12, 0.58, mat(new THREE.Color(cor).multiplyScalar(0.8).getHex())); tampa.position.y = 0.6; g.add(tampa);
    const bola = malha(new THREE.SphereGeometry(0.16, 10, 8), mat(0xff7a00)); bola.position.set(0.3, 0.8, 0); g.add(bola);
    const cubo = caixaRedonda(0.2, 0.2, 0.2, mat(0x00b5f0)); cubo.position.set(-0.25, 0.76, 0.05); g.add(cubo);
    return g; } },
  { id: "cavalinho", nome: "Cavalinho de balanço", comodo: "quarto", fazer(cor) {
    const g = novoG(1.1, 0.5);
    const base = malha(new THREE.TorusGeometry(0.55, 0.05, 6, 18, Math.PI), mat(MADEIRA)); base.rotation.z = Math.PI; base.position.y = 0.55; base.scale.y = 0.4; g.add(base);
    const corpo = malha(new THREE.CapsuleGeometry(0.2, 0.55, 4, 10), mat(cor)); corpo.rotation.z = Math.PI / 2; corpo.position.y = 0.55; g.add(corpo);
    const cab = malha(new THREE.SphereGeometry(0.18, 10, 8), mat(cor)); cab.position.set(0.42, 0.8, 0); g.add(cab);
    return g; } },
  { id: "estudo", nome: "Mesa de estudos", comodo: "quarto", fazer(cor) {
    const g = novoG(1.3, 0.7);
    const t = caixaRedonda(1.3, 0.08, 0.65, mat(cor)); t.position.y = 0.75; g.add(t);
    for (const [x, z] of [[-0.58, -0.27], [0.58, -0.27], [-0.58, 0.27], [0.58, 0.27]]) perna(g, x, z, 0.72);
    const cad = caixa(0.35, 0.03, 0.25, mat(0x58c43a), { sombra: false }); cad.position.set(-0.2, 0.81, 0.05); g.add(cad);
    const lapis = malha(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), mat(0xffcc1f)); lapis.rotation.z = Math.PI / 2; lapis.position.set(0.2, 0.81, 0.1); g.add(lapis);
    const cad2 = caixaRedonda(0.45, 0.45, 0.45, mat(0xec2e8c)); cad2.position.set(0, 0.45, 0.55); g.add(cad2);
    return g; } },
  { id: "pelucias", nome: "Prateleira de pelúcias", comodo: "parede", parede: true, fazer(cor) {
    const g = novoG(1.2, 0.3);
    const p = caixaRedonda(1.2, 0.08, 0.3, mat(cor)); p.position.set(0, 1.4, 0.12); g.add(p);
    for (const [x, c] of [[-0.4, 0xd9a066], [0, 0xff9cc0], [0.4, 0xffffff]]) { const b = malha(new THREE.SphereGeometry(0.14, 10, 8), mat(c)); b.position.set(x, 1.58, 0.12); g.add(b); const cab = malha(new THREE.SphereGeometry(0.1, 10, 8), mat(c)); cab.position.set(x, 1.78, 0.14); g.add(cab); }
    return g; } },
  { id: "violao", nome: "Violão no suporte", comodo: "quarto", fazer(cor) {
    const g = novoG(0.6, 0.5);
    const corpo = malha(new THREE.SphereGeometry(0.28, 14, 10), mat(cor)); corpo.scale.set(1, 1.2, 0.35); corpo.position.y = 0.45; g.add(corpo);
    const boca = malha(new THREE.CircleGeometry(0.08, 12), mat(0x151515), { sombra: false }); boca.position.set(0, 0.5, 0.1); g.add(boca);
    const braco = caixa(0.08, 0.7, 0.05, mat(MADEIRA_ESCURA), { sombra: false }); braco.position.set(0, 1.0, 0); g.add(braco);
    return g; } },
  // ---- cozinha
  { id: "mesa-jantar", nome: "Mesa com cadeiras", comodo: "cozinha", fazer(cor) {
    const g = novoG(1.8, 1.8);
    const t = caixaRedonda(1.4, 0.08, 0.9, mat(MADEIRA)); t.position.y = 0.75; g.add(t);
    for (const [x, z] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]]) perna(g, x, z, 0.72);
    for (const [x, z, r] of [[-0.4, 0.7, Math.PI], [0.4, 0.7, Math.PI], [-0.4, -0.7, 0], [0.4, -0.7, 0]]) {
      const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = r; g.add(c);
      const a = caixaRedonda(0.42, 0.06, 0.4, mat(cor)); a.position.y = 0.45; c.add(a);
      const e = caixaRedonda(0.42, 0.45, 0.06, mat(cor)); e.position.set(0, 0.7, -0.18); c.add(e);
      for (const [px, pz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) perna(c, px, pz, 0.44, MADEIRA_ESCURA, 0.025);
    }
    const fruteira = malha(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xffffff)); fruteira.position.y = 0.95; g.add(fruteira);
    for (const [x, c] of [[-0.08, 0xe8413c], [0.08, 0xffcc1f], [0, 0x58c43a]]) { const f = malha(new THREE.SphereGeometry(0.07, 8, 6), mat(c)); f.position.set(x, 0.92, (x === 0 ? 0.06 : 0)); g.add(f); }
    return g; } },
  { id: "geladeira", nome: "Geladeira", comodo: "cozinha", fazer(cor) {
    const g = novoG(0.8, 0.7);
    const c = caixaRedonda(0.8, 1.9, 0.68, mat(cor)); c.position.y = 0.95; g.add(c);
    const linha = caixa(0.82, 0.03, 0.7, mat(0x151515), { sombra: false }); linha.position.y = 1.35; g.add(linha);
    for (const y of [1.05, 1.6]) { const m = caixaRedonda(0.05, 0.3, 0.05, mat(0xdfe6ee)); m.position.set(0.3, y, 0.36); g.add(m); }
    const ima = caixa(0.15, 0.12, 0.02, mat(0xec2e8c), { sombra: false }); ima.position.set(-0.15, 1.65, 0.35); g.add(ima);
    return g; } },
  { id: "fogao", nome: "Fogão", comodo: "cozinha", fazer(cor) {
    const g = novoG(0.8, 0.65);
    const c = caixaRedonda(0.8, 0.9, 0.62, mat(cor)); c.position.y = 0.45; g.add(c);
    const forno = caixa(0.6, 0.4, 0.02, MAT.janelaQuente, { sombra: false }); forno.position.set(0, 0.42, 0.32); g.add(forno);
    for (const [x, z] of [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.15], [0.2, 0.15]]) { const b = malha(new THREE.TorusGeometry(0.09, 0.025, 6, 12), mat(0x2a2a2a)); b.rotation.x = Math.PI / 2; b.position.set(x, 0.91, z); g.add(b); }
    const panela = malha(new THREE.CylinderGeometry(0.13, 0.12, 0.15, 12), mat(0xe8413c)); panela.position.set(-0.2, 1.0, -0.12); g.add(panela);
    return g; } },
  { id: "pia", nome: "Pia com armário", comodo: "cozinha", fazer(cor) {
    const g = novoG(1.4, 0.65);
    const c = caixaRedonda(1.4, 0.85, 0.62, mat(cor)); c.position.y = 0.43; g.add(c);
    const tampo = caixa(1.45, 0.06, 0.66, mat(0xdfe6ee), { sombra: false }); tampo.position.y = 0.88; g.add(tampo);
    const cuba = caixa(0.5, 0.04, 0.4, mat(0x9fb3c8), { sombra: false }); cuba.position.set(0.2, 0.92, 0); g.add(cuba);
    const torneira = malha(new THREE.TorusGeometry(0.1, 0.025, 6, 12, Math.PI), mat(0xdfe6ee)); torneira.position.set(0.2, 1.0, -0.22); g.add(torneira);
    return g; } },
  { id: "armario", nome: "Armário de parede", comodo: "parede", parede: true, fazer(cor) {
    const g = novoG(1.4, 0.4);
    const c = caixaRedonda(1.4, 0.7, 0.38, mat(cor)); c.position.set(0, 1.85, 0.19); g.add(c);
    const linha = caixa(0.03, 0.62, 0.4, mat(0x151515), { sombra: false }); linha.position.set(0, 1.85, 0.2); g.add(linha);
    return g; } },
  { id: "cesto", nome: "Cesto de frutas", comodo: "cozinha", fazer(cor) {
    const g = novoG(0.6, 0.6);
    const c = malha(new THREE.CylinderGeometry(0.3, 0.22, 0.3, 14), mat(cor)); c.position.y = 0.15; g.add(c);
    for (let i = 0; i < 6; i++) { const f = malha(new THREE.SphereGeometry(0.09, 8, 6), mat([0xe8413c, 0xffcc1f, 0x58c43a][i % 3])); const a = i; f.position.set(Math.cos(a) * 0.14, 0.33, Math.sin(a) * 0.14); g.add(f); }
    return g; } },
];
export const moveisDoComodo = (comodo) => MOVEIS.filter((m) => m.comodo === comodo);
export const movel = (id) => MOVEIS.find((m) => m.id === id);
