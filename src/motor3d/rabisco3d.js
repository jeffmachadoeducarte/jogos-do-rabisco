// Rabisco em 3D a partir das três vistas oficiais (frente, lado e costas, mesma escala).
//
// Como funciona: o corpo é montado com as medidas tiradas das vistas e "pintado" pelos próprios
// desenhos oficiais projetados — a frente na frente, o lado nos lados, as costas atrás — misturando
// conforme a direção de cada pedaço da superfície. Assim, de qualquer ângulo ele tem o traço, as
// cores e os detalhes do desenho. A projeção é calculada na pose de descanso e fica presa às
// peças, então braços e pernas podem se mexer sem a pintura escorregar.
//
// Unidade: 1 = 410 px da arte original (diâmetro da cabeça). Pés em y = 0, frente = +z.
// Texturas: assets/rabisco/3d/{frente,lado,costas}.png (ferramentas/rabisco3d_projecoes.py).

import { THREE, toon } from "./toon.js";

const G = THREE;
const ALTURA_NATIVA = 6.08;

// Enquadramento das texturas (pixels do PNG original) e correspondência com o modelo
const REC = { x0: 674, y0: 172, x1: 1464, y1: 2697 };
const PX = 410;                         // pixels por unidade
const CHAO_PX = 2667;                   // linha do chão na arte
const CENTRO = { frente: 1076, costas: 1076, lado: 1075 };

// ---- street dance (hip-hop infantil): só articulações, no tempo de uma música (b = batida, ~100-110 BPM)
// Regras do traço: o braço que sobe acima da cabeça é o esquerdo (do lado direito fica a aba do boné); nenhum braço passa na
// frente do peito (a logo fica sempre à vista) nem vai muito para trás (a mochila e as alças ficam como estão).
//   rb.danca = { passo, b }  e  rb.atualizar(dt, { modo: "street" })   (passo: um de PASSOS_STREET; b: batidas desde o começo do passo)
//   passoStreet(b) → { passo, b }: a coreografia padrão em laço (8 compassos, termina no freeze)
export const PASSOS_STREET = ["groove", "pump", "step", "running", "wave", "quadril", "giro", "freeze"];
export const COREO_STREET = [[0, "pump"], [8, "step"], [16, "running"], [24, "wave"], [26, "quadril"], [28, "giro"], [30, "freeze"]];
export function passoStreet(b, coreo = COREO_STREET, laco = 32) {
  const x = ((b % laco) + laco) % laco;
  let at = coreo[0];
  for (const c of coreo) if (x >= c[0]) at = c;
  return { passo: at[1], b: x - at[0] };
}
const VOLTA = Math.PI * 2, PERNA = 2.0; // perna nativa: quadril (y 2,0) até a sola
const lisoSt = (k) => { const q = Math.max(0, Math.min(1, k)); return q * q * (3 - 2 * q); };
const misturaSt = (a, b, k) => a + (b - a) * k;
const abreSt = (dx) => Math.asin(Math.max(-0.6, Math.min(0.6, dx / PERNA))); // ângulo da perna para o pé ir dx para o lado
function joelhos(p, a, b = a) { p.qE = -a; p.jE = 2 * a; p.qD = -b; p.jD = 2 * b; p.corpoY = -PERNA * (1 - Math.cos(Math.min(a, b))); }
function poseStreet(p, passo, b, z0) {
  const u = ((b % 1) + 1) % 1;
  const desce = Math.pow(0.5 + 0.5 * Math.cos(u * VOLTA), 1.6); // 1 na batida (joelhos dobrados), 0 no contratempo
  p.tronX = 0.05 + 0.06 * desce; // a cabeça acompanha a batida
  if (passo === "pump") { // bounce com os punhos subindo e descendo, um de cada vez
    joelhos(p, 0.14 + 0.26 * desce);
    const lado = Math.floor(b) % 2 ? -1 : 1, kE = lado > 0 ? desce : 0, kD = lado < 0 ? desce : 0;
    p.oEx = -0.45 - 0.75 * kE; p.oDx = -0.45 - 0.75 * kD; p.oEz = z0 + 0.12; p.oDz = -z0 - 0.12;
    p.cE = -1.5 + 0.25 * kE; p.cD = -1.5 + 0.25 * kD;
    p.tronY = lado * 0.13 * desce; p.tronX += 0.04 * desce;
  } else if (passo === "step") { // step-touch: um pé abre para o lado, o corpo vai junto e o outro pé vem encostar
    const S = Math.sin((Math.PI * b) / 2), C = Math.cos((Math.PI * b) / 2), wE = Math.max(0, S), wD = Math.max(0, -S);
    const c = 0.24 * S, fE = 0.36 * wE, fD = -0.36 * wD;
    p.corpoX = c; p.qEz = abreSt(fE - c); p.qDz = abreSt(fD - c);
    const a = 0.12 + 0.18 * desce, vel = Math.abs(C); // o pé que está indo levanta um pouco; o outro encosta a ponta na hora do passo
    const sobeE = S > 0 ? 0.28 * vel : 0.2 * S ** 6, sobeD = S < 0 ? 0.28 * vel : 0.2 * S ** 6;
    p.qE = -a - sobeE; p.jE = 2 * a + 2 * sobeE; p.qD = -a - sobeD; p.jD = 2 * a + 2 * sobeD;
    p.corpoY = -PERNA * (1 - Math.cos(a)) - PERNA * (1 - Math.cos(Math.max(Math.abs(p.qEz), Math.abs(p.qDz)))) * 0.6;
    // aponta para o lado do passo: o esquerdo sobe na diagonal, o direito fica na altura do ombro (longe da aba)
    p.oEz = misturaSt(z0 + 0.2, 2.05, wE); p.oEx = misturaSt(-0.55, -0.15, wE); p.cE = misturaSt(-1.35, -0.08, wE);
    p.oDz = misturaSt(-z0 - 0.2, -1.42, wD); p.oDx = misturaSt(-0.55, -0.15, wD); p.cD = misturaSt(-1.35, -0.08, wD);
    p.tronZ = -0.07 * S; p.tronY = 0.12 * S;
  } else if (passo === "running") { // running man simplificado: um joelho sobe, o outro pé desliza para trás
    const i = Math.floor(b), sobeE = i % 2 === 0, s = Math.sin(Math.PI * u);
    const qSobe = 0.38 * (1 - u) - 1.0 * s, jSobe = 0.3 * (1 - u) + 1.45 * s, qApoio = 0.38 * u, jApoio = 0.3 * u + 0.08;
    if (sobeE) { p.qE = qSobe; p.jE = jSobe; p.qD = qApoio; p.jD = jApoio; } else { p.qD = qSobe; p.jD = jSobe; p.qE = qApoio; p.jE = jApoio; }
    p.corpoY = -PERNA * (1 - Math.cos(qApoio)) - 0.06 * desce;
    // braços de corrida: o do lado contrário ao joelho vem para a frente (para trás, pouco: a mochila está ali)
    const fr = -0.25 - 0.85 * s, tr = -0.05 + 0.3 * s;
    p.oEx = sobeE ? tr : fr; p.oDx = sobeE ? fr : tr; p.cE = p.cD = -1.45; p.oEz = z0 + 0.1; p.oDz = -z0 - 0.1;
    p.tronX = 0.1 + 0.05 * desce; p.tronY = (sobeE ? -1 : 1) * 0.1 * s;
  } else if (passo === "wave") { // onda nos braços abertos: vai da mão esquerda até a direita a cada 2 batidas
    joelhos(p, 0.1 + 0.12 * desce);
    const x = (((b % 2) + 2) % 2) / 2, bump = (c) => Math.exp(-((x - c) ** 2) / 0.012);
    const mE = bump(0.12), oE = bump(0.36), oD = bump(0.62), mD = bump(0.86);
    p.oEz = 1.42 + 0.38 * oE + 0.15 * mE; p.cEz = 0.85 * mE + 0.2 * oE; p.oEx = -0.15;
    p.oDz = -1.42 - 0.38 * oD - 0.15 * mD; p.cDz = -0.85 * mD - 0.2 * oD; p.oDx = -0.15;
    p.cE = p.cD = -0.08; p.tronZ = 0.06 * (oD - oE); p.tronX = 0.04;
  } else if (passo === "quadril") { // giro de quadril: os pés ficam no chão, o quadril passeia e o tronco compensa
    const hx = 0.17 * Math.sin(Math.PI * b), a = 0.16 + 0.08 * desce;
    joelhos(p, a);
    p.corpoX = hx; p.qEz = p.qDz = abreSt(-hx);
    p.tronZ = 0.32 * hx; p.tronX = 0.05 + 0.07 * Math.cos(Math.PI * b);
    // mão esquerda "levanta o teto" e a direita na cintura (cotovelo para fora)
    p.oEz = 2.6; p.oEx = -0.2; p.cE = -0.35 - 0.45 * desce;
    p.oDz = -0.9; p.oDx = -0.08; p.cDz = 1.42; p.cD = -0.1;
  } else if (passo === "giro") { // um giro no lugar (2 batidas), cotovelos dobrados e pezinhos marcando
    const k = Math.min(1, Math.max(0, b / 2));
    p.giro = VOLTA * lisoSt(k);
    const pe = Math.max(0, Math.sin(VOLTA * b)), pd = Math.max(0, -Math.sin(VOLTA * b));
    p.qE = -0.2 - 0.3 * pe; p.jE = 0.4 + 0.6 * pe; p.qD = -0.2 - 0.3 * pd; p.jD = 0.4 + 0.6 * pd; p.corpoY = -PERNA * (1 - Math.cos(0.2));
    p.oEx = p.oDx = -0.55; p.cE = p.cD = -1.7; p.oEz = z0 + 0.35; p.oDz = -z0 - 0.35; p.tronX = 0.06;
  } else if (passo === "freeze") { // pose final: dedo esquerdo apontando para o alto, mão direita na cintura, pernas abertas
    const hit = 1 - lisoSt(b / 0.35); // um "tum" ao chegar na pose
    p.qEz = 0.22; p.qDz = -0.18; p.qE = -0.28; p.jE = 0.55; p.qD = 0.04; p.jD = 0.05;
    p.corpoY = -PERNA * (1 - Math.cos(0.22)) - 0.06 - 0.08 * hit;
    p.oEz = 2.5; p.oEx = -0.35; p.cE = -0.1;
    p.oDz = -0.9; p.oDx = -0.08; p.cDz = 1.42; p.cD = -0.1;
    p.tronZ = -0.07; p.tronY = 0.22; p.tronX = 0.03 + 0.06 * hit;
  } else { // groove: o balanço de esperar a batida
    joelhos(p, 0.08 + 0.15 * desce);
    p.oEz = z0 + 0.1; p.oDz = -z0 - 0.1; p.oEx = p.oDx = -0.12 - 0.12 * desce; p.cE = p.cD = -0.45 - 0.3 * desce;
    p.tronY = 0.07 * Math.sin(Math.PI * b);
  }
}

const COR = { azul: 0x00bdff, rosa: 0xf14ba8, pele: 0xffe5cf, laranja: 0xff6400, branco: 0xffffff };

const vert = /* glsl */ `
  attribute vec3 posRef;
  attribute vec3 nrmRef;
  varying vec3 vPos;
  varying vec3 vNrm;
  varying vec3 vNrmVista;
  void main() {
    vPos = posRef;
    vNrm = nrmRef;
    vNrmVista = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const frag = /* glsl */ `
  uniform sampler2D texFrente, texCostas, texLado;
  uniform vec3 corBase;
  uniform float pesoLado;
  varying vec3 vPos;
  varying vec3 vNrm;
  varying vec3 vNrmVista;
  const vec4 R = vec4(${REC.x0}.0, ${REC.y0}.0, ${REC.x1 - REC.x0}.0, ${REC.y1 - REC.y0}.0);
  vec2 uvDe(float px, float py) { return vec2((px - R.x) / R.z, 1.0 - (py - R.y) / R.w); }
  vec4 amostra(sampler2D t, vec2 uv) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
    return texture2D(t, uv);
  }
  void main() {
    vec2 h = normalize(vNrm.xz + vec2(0.0, 1e-4));
    // troca curta entre as vistas: cada desenho pinta só a sua face (sem embaralhar cores e a logo)
    float wf = pow(max(h.y, 0.0), 10.0);
    float wb = pow(max(-h.y, 0.0), 10.0);
    float ws = pow(abs(h.x), 10.0) * pesoLado;
    float py = ${CHAO_PX}.0 - vPos.y * ${PX}.0;
    vec4 cf = amostra(texFrente, uvDe(${CENTRO.frente}.0 + vPos.x * ${PX}.0, py));
    vec4 cb = amostra(texCostas, uvDe(${CENTRO.costas}.0 - vPos.x * ${PX}.0, py));
    vec4 cs = amostra(texLado, uvDe(${CENTRO.lado}.0 - vPos.z * ${PX}.0, py));
    // onde a vista não tem desenho (fora da silhueta), entra a cor da peça
    vec3 f = mix(corBase, cf.rgb, cf.a), b = mix(corBase, cb.rgb, cb.a), s = mix(corBase, cs.rgb, cs.a);
    vec3 cor = (f * wf + b * wb + s * ws) / max(wf + wb + ws, 1e-4);
    // luz suave por cima da pintura (a arte já tem sombra própria)
    vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
    float luz = 0.8 + 0.22 * smoothstep(-0.3, 0.7, dot(normalize(vNrmVista), L));
    gl_FragColor = vec4(cor * luz, 1.0);
    #include <colorspace_fragment>
  }
`;

// Quebra os triângulos grandes (até nenhum lado passar de max) para a peça poder curvar na cabeça
function subdividir(geo, max) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position.array, saida = [];
  const pilha = [];
  for (let i = 0; i < p.length; i += 9) pilha.push([p.slice(i, i + 3), p.slice(i + 3, i + 6), p.slice(i + 6, i + 9)]);
  const d2 = (u, v) => (u[0] - v[0]) ** 2 + (u[1] - v[1]) ** 2 + (u[2] - v[2]) ** 2;
  const meio = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2, (u[2] + v[2]) / 2];
  while (pilha.length) {
    const [a, b, c] = pilha.pop();
    const ab = d2(a, b), bc = d2(b, c), ca = d2(c, a), m = Math.max(ab, bc, ca);
    if (m <= max * max || saida.length > 60000) { saida.push(...a, ...b, ...c); continue; }
    if (m === ab) { const x = meio(a, b); pilha.push([a, x, c], [x, b, c]); }
    else if (m === bc) { const x = meio(b, c); pilha.push([a, b, x], [a, x, c]); }
    else { const x = meio(c, a); pilha.push([a, b, x], [x, b, c]); }
  }
  const out = new G.BufferGeometry();
  out.setAttribute("position", new G.Float32BufferAttribute(saida, 3));
  return out;
}

const contorno = new G.MeshBasicMaterial({ color: 0x151515, side: G.BackSide });

export class Rabisco3D {
  constructor({ raiz = "../..", altura = 2 } = {}) {
    const carregar = (n) => {
      const t = new G.TextureLoader().load(`${raiz}/assets/rabisco/3d/${n}.png`);
      t.colorSpace = G.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    };
    this.raiz = raiz;
    this.tex = { frente: carregar("frente"), costas: carregar("costas"), lado: carregar("lado") };

    this.grupo = new G.Group();                 // posição no mundo (pés em y=0)
    this.escala = altura / ALTURA_NATIVA;
    this.corpo = new G.Group();
    this.corpo.scale.setScalar(this.escala);
    this.grupo.add(this.corpo);
    this.malhas = [];

    this.montar();
    this.assar();

    this.fase = 0;
    this.tempo = 0;
    this.atual = {};
  }

  // Peça pintada pela projeção
  peca(geo, corBase, { pai, pesoLado = 1, borda = 0.025 } = {}) {
    const mat = new G.ShaderMaterial({
      uniforms: {
        texFrente: { value: this.tex.frente }, texCostas: { value: this.tex.costas }, texLado: { value: this.tex.lado },
        corBase: { value: new G.Color(corBase) }, pesoLado: { value: pesoLado },
      },
      vertexShader: vert, fragmentShader: frag,
    });
    const m = new G.Mesh(geo, mat);
    m.castShadow = true;
    if (borda) {
      const casca = new G.Mesh(geo, contorno);
      geo.computeBoundingBox();
      const t = new G.Vector3();
      geo.boundingBox.getSize(t);
      casca.scale.set(1 + borda / Math.max(t.x, 0.05), 1 + borda / Math.max(t.y, 0.05), 1 + borda / Math.max(t.z, 0.05));
      m.add(casca);
    }
    (pai ?? this.corpo).add(m);
    this.malhas.push(m);
    return m;
  }

  // Peça modelada com cor oficial (tênis, mãos, fones, braços, pernas): nelas a projeção não
  // encaixa bem, então ganham forma e cor próprias, com o mesmo contorno preto.
  solida(geo, cor, { pai, borda = 0.025 } = {}) {
    const m = new G.Mesh(geo, toon(cor));
    m.castShadow = true;
    if (borda) {
      const casca = new G.Mesh(geo, contorno);
      geo.computeBoundingBox();
      const t = new G.Vector3();
      geo.boundingBox.getSize(t);
      casca.scale.set(1 + borda / Math.max(t.x, 0.05), 1 + borda / Math.max(t.y, 0.05), 1 + borda / Math.max(t.z, 0.05));
      m.add(casca);
    }
    (pai ?? this.corpo).add(m);
    return m;
  }

  // Tênis do Rabisco: cabedal ciano, biqueira branca, sola rosa, cadarços e gola
  tenis(pe, lado) {
    const elipse = (sx, sy, sz, cor, x, y, z, borda = 0.03) => {
      const m = this.solida(new G.SphereGeometry(1, 28, 18), cor, { pai: pe, borda });
      m.scale.set(sx, sy, sz);
      m.position.set(x, y, z);
      return m;
    };
    elipse(0.3, 0.1, 0.5, COR.rosa, 0, -0.65, 0.1);           // sola
    elipse(0.27, 0.24, 0.42, COR.azul, 0, -0.5, 0.02);        // cabedal
    elipse(0.255, 0.16, 0.2, COR.branco, 0, -0.56, 0.33);     // biqueira
    const gola = this.solida(new G.TorusGeometry(0.15, 0.06, 10, 24), COR.azul, { pai: pe, borda: 0.02 });
    gola.rotation.x = Math.PI / 2;
    gola.position.set(0, -0.31, -0.03);
    for (let i = 0; i < 3; i++) {
      const cadarco = this.solida(new G.CapsuleGeometry(0.035, 0.26, 4, 8), COR.azul, { pai: pe, borda: 0.02 });
      cadarco.rotation.z = Math.PI / 2;
      cadarco.position.set(0, -0.33 - i * 0.045, 0.12 + i * 0.075);
      cadarco.rotation.x = -0.5;
    }
    pe.rotation.y = lado * 0.22;
  }

  // Mão de desenho animado relaxada: palma, quatro dedos com duas falanges (comprimentos diferentes,
  // levemente abertos e curvados para dentro) e polegar na frente da palma.
  mao(pai, lado) {
    const m = new G.Group();
    m.position.y = -0.78;
    pai.add(m);
    const pele = (geo, alvo, borda = 0.012) => this.solida(geo, COR.pele, { pai: alvo, borda });
    const palma = pele(new G.SphereGeometry(1, 24, 16), m, 0.018);
    palma.scale.set(0.055, 0.115, 0.13);
    palma.position.y = -0.06;
    const punho = pele(new G.CylinderGeometry(0.075, 0.085, 0.08, 16), m, 0.012);
    punho.position.y = 0.05;
    punho.scale.z = 1.15;

    // falange: cápsula pendurada a partir da articulação (topo em y = 0)
    const falange = (alvo, raio, comp) => {
      const f = pele(new G.CapsuleGeometry(raio, comp, 6, 10), alvo);
      f.position.y = -comp / 2;
      return f;
    };
    // indicador → mindinho: [z na palma, comprimento, abertura do leque] (médio maior, mindinho menor)
    const DEDOS = [[0.085, 0.17, -0.2], [0.03, 0.19, -0.07], [-0.025, 0.18, 0.07], [-0.075, 0.14, 0.2]];
    for (const [z, comp, abre] of DEDOS) {
      const base = new G.Group();
      base.position.set(0, -0.16, z);
      base.rotation.set(abre, 0, -lado * 0.12); // leque + leve curva para o corpo
      m.add(base);
      falange(base, 0.03, comp * 0.55);
      const junta = new G.Group();
      junta.position.y = -comp * 0.55 - 0.014;
      junta.rotation.z = -lado * 0.3;
      base.add(junta);
      falange(junta, 0.027, comp * 0.4);
    }
    // polegar: junto da palma, apontando para baixo e para a frente
    const pol = new G.Group();
    pol.position.set(-lado * 0.02, -0.03, 0.115);
    pol.rotation.set(-0.5, 0, -lado * 0.25);
    m.add(pol);
    falange(pol, 0.034, 0.06);
    const polJunta = new G.Group();
    polJunta.position.y = -0.075;
    polJunta.rotation.z = -lado * 0.25;
    pol.add(polJunta);
    falange(polJunta, 0.03, 0.05);
    return m;
  }

  // ---------- rosto 3D ----------
  // A textura do rosto cobre um arco de 2,196 rad da cabeça, de y 3,505 a 4,715 (centro 4,11).
  montarRosto(d) {
    const R = 0.515, ANG = 2.1962, YC = 4.11, ALT = 1.21;
    const th = (x) => (x / d.largura - 0.5) * ANG;            // ângulo em volta da cabeça
    const yy = (y) => (0.5 - y / d.altura) * ALT;              // altura relativa ao centro do rosto
    const rosto = new G.Group();
    rosto.position.y = YC - 2.15;
    this.tronco.add(rosto);
    const PRETO = 0x151515;

    // Peça em relevo a partir de um contorno: extrude, subdivide e "dobra" na curva da cabeça
    const relevo = (contorno, cor, { base = 0, altura = 0.02, chanfro = 0.008, furo = null } = {}) => {
      const forma = new G.Shape(contorno.map(([x, y]) => new G.Vector2(th(x) * R, yy(y))));
      if (furo) forma.holes.push(new G.Path(furo.map(([x, y]) => new G.Vector2(th(x) * R, yy(y)))));
      let geo = new G.ExtrudeGeometry(forma, { depth: altura, bevelEnabled: chanfro > 0, bevelThickness: chanfro, bevelSize: chanfro * 0.8, bevelSegments: 2, curveSegments: 4 });
      geo = subdividir(geo, 0.02);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const a = pos.getX(i) / R, r = R + base + pos.getZ(i);
        pos.setXYZ(i, r * Math.sin(a), pos.getY(i), r * Math.cos(a));
      }
      geo.computeVertexNormals();
      const m = new G.Mesh(geo, toon(cor));
      m.castShadow = true;
      rosto.add(m);
      return m;
    };

    // olhos: globo branco saltado, aro preto, íris, pupila e brilho
    for (const o of d.olhos) {
      const g = new G.Group();
      g.rotation.y = th(o.branco.cx);
      g.position.y = yy(o.branco.cy);
      rosto.add(g);
      const arco = (rx) => (rx / d.largura) * ANG * R, alto = (ry) => (ry / d.altura) * ALT;
      const a = arco(o.branco.rx), b = alto(o.branco.ry), c = 0.055, zc = R - 0.015; // olho saltado na medida
      const aro = new G.Mesh(new G.SphereGeometry(1, 32, 24), toon(PRETO));
      // aro fino: só um filete preto em volta do branco (como o traço do desenho)
      const BORDA = 0.011;
      aro.scale.set(a + BORDA, b + BORDA, c);
      aro.position.z = zc - 0.006;
      const globo = new G.Mesh(new G.SphereGeometry(1, 40, 30), toon(0xffffff));
      globo.scale.set(a, b, c);
      globo.position.z = zc;
      globo.castShadow = true;
      g.add(aro, globo);
      // ponto na superfície do globo + direção para fora (para "colar" íris, pupila e brilho)
      const naSuperficie = (e, folga) => {
        const du = arco(e.cx - o.branco.cx), dv = -alto(e.cy - o.branco.cy);
        const k = Math.max(0.05, 1 - (du / a) ** 2 - (dv / b) ** 2);
        const z = c * Math.sqrt(k);
        const n = new G.Vector3(du / (a * a), dv / (b * b), z / (c * c)).normalize();
        return { p: new G.Vector3(du, dv, zc + z).addScaledVector(n, folga), n };
      };
      const disco = (e, cor, espessura, folga, aumento = 0) => {
        const { p, n } = naSuperficie(e, folga);
        const m = new G.Mesh(new G.SphereGeometry(1, 28, 16), toon(cor));
        m.scale.set(arco(e.rx) + aumento, alto(e.ry) + aumento, espessura);
        m.position.copy(p);
        m.lookAt(p.clone().add(n));
        g.add(m);
        return m;
      };
      disco(o.iris, PRETO, 0.012, -0.004, 0.012);   // aro preto da íris
      disco(o.iris, 0x00bdff, 0.014, 0.0);          // íris azul
      disco(o.pupila, PRETO, 0.012, 0.006);         // pupila
      disco(o.brilho, 0xffffff, 0.01, 0.014, 0.004); // brilho
    }

    // sobrancelhas: em alto-relevo, sobrepondo o contorno de cima dos olhos
    for (const s of d.sobrancelhas) relevo(s, PRETO, { base: 0.02, altura: 0.03, chanfro: 0.012 });

    // boca com profundidade: fundo escuro, aro preto em relevo, dentes e língua por cima do fundo
    relevo(d.boca, 0x3d0b1c, { base: 0.0, altura: 0.006, chanfro: 0 }); // fundo cobre a boca inteira (sem frestas)
    relevo(d.boca, PRETO, { base: 0.0, altura: 0.028, chanfro: 0.008, furo: d.bocaDentro });
    relevo(d.dentes, 0xffffff, { base: 0.004, altura: 0.012, chanfro: 0 });
    relevo(d.lingua, 0xf05aa6, { base: 0.004, altura: 0.014, chanfro: 0.008 });
  }

  montar() {
    // ---- quadril, short e pernas ----
    // bermuda toda rosa (peça própria: assim a mochila do desenho não "pinta" o short)
    const bacia = this.solida(new G.CylinderGeometry(0.56, 0.57, 0.42, 40), COR.rosa, { borda: 0.03 });
    bacia.scale.z = 0.62;
    bacia.position.set(0, 2.1, -0.06);

    const perna = (lado) => {
      const quadril = new G.Group();
      quadril.position.set(lado * 0.28, 2.0, -0.06);
      this.corpo.add(quadril);
      const shortPerna = this.solida(new G.CylinderGeometry(0.28, 0.3, 0.6, 28), COR.rosa, { pai: quadril, borda: 0.03 });
      shortPerna.scale.z = 1.15;
      shortPerna.position.y = -0.26;
      const barra = this.solida(new G.TorusGeometry(0.3, 0.018, 6, 32), 0x151515, { pai: quadril, borda: 0 });
      barra.rotation.x = Math.PI / 2;
      barra.scale.y = 1.15;
      barra.position.y = -0.47;
      const coxa = this.solida(new G.CylinderGeometry(0.12, 0.12, 0.7, 18), COR.pele, { pai: quadril, borda: 0.02 });
      coxa.position.y = -0.55;
      const joelho = new G.Group();
      joelho.position.y = -0.85;
      quadril.add(joelho);
      const canela = this.solida(new G.CylinderGeometry(0.12, 0.115, 0.78, 18), COR.pele, { pai: joelho, borda: 0.02 });
      canela.position.y = -0.38; // desce até dentro do tênis (sem vão)
      // tênis grandão (sola encosta em y = 0)
      const pe = new G.Group();
      pe.position.set(lado * 0.04, -0.4, 0);
      joelho.add(pe);
      this.tenis(pe, lado);
      return { quadril, joelho, pe };
    };
    this.pernaE = perna(1);
    this.pernaD = perna(-1);

    // ---- tronco: o lápis inteiro, azul limpo (só o rosto e a logo vão por cima, como adesivos) ----
    this.tronco = new G.Group();
    this.tronco.position.y = 2.15;
    this.corpo.add(this.tronco);
    const T = (m, y) => { m.position.y = y - 2.15; return m; };
    const perfil = [
      [0.0, 2.2], [0.545, 2.2], [0.55, 2.3], [0.54, 3.0], [0.535, 3.48], [0.52, 3.52], [0.515, 4.0], [0.515, 4.76],
    ].map(([r, y]) => new G.Vector2(r, y - 2.15));
    this.solida(new G.LatheGeometry(perfil, 48), COR.azul, { pai: this.tronco, borda: 0.04 });
    // boné (faixa laranja) e ponta do lápis
    const bone = this.solida(new G.CylinderGeometry(0.55, 0.55, 0.27, 48), COR.laranja, { pai: this.tronco, borda: 0.03 });
    T(bone, 4.9);
    this.bone = bone; // roupas3d.js troca a cor (time) e esconde a aba sob chapéus
    const madeira = this.solida(new G.CylinderGeometry(0.17, 0.535, 0.68, 48), 0xffe5cf, { pai: this.tronco, borda: 0.03 });
    T(madeira, 5.38);
    const grafite = this.solida(new G.ConeGeometry(0.17, 0.36, 32), 0x151515, { pai: this.tronco, borda: 0 });
    T(grafite, 5.9);
    // barra da camiseta
    const barraCam = this.solida(new G.TorusGeometry(0.548, 0.016, 6, 48), 0x151515, { pai: this.tronco, borda: 0 });
    barraCam.rotation.x = Math.PI / 2;
    T(barraCam, 2.36);
    // adesivos: rosto oficial e logo oficial, acompanhando a curva do lápis
    const adesivo = (tex, raio, altura, larg, y) => {
      const ang = 2 * Math.asin(larg / 2 / raio);
      const geo = new G.CylinderGeometry(raio, raio, altura, 32, 1, true, -ang / 2, ang);
      const m = new G.Mesh(geo, new G.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      m.renderOrder = 1;
      this.tronco.add(m);
      T(m, y);
      return m;
    };
    const tx = (url) => { const t = new G.TextureLoader().load(url); t.colorSpace = G.SRGBColorSpace; t.anisotropy = 8; return t; };
    // rosto em relevo (olhos, sobrancelhas e boca), montado com as medidas do desenho oficial
    fetch(`${this.raiz}/assets/rabisco/3d/rosto3d.json`).then((r) => r.json()).then((d) => this.montarRosto(d)).catch(() => {});
    // logo com leve relevo: camadas finas empilhadas (laterais um tom mais escuras) e o topo branco
    const texLogo = tx(`${this.raiz}/assets/marca/logos/branco.png`);
    const CAMADAS = 7, ALTURA_LOGO = 0.009;
    for (let i = 0; i <= CAMADAS; i++) {
      const topo = i === CAMADAS;
      const m = adesivo(texLogo, 0.55 + (ALTURA_LOGO * i) / CAMADAS, 0.33, 0.62, 3.12);
      m.material = m.material.clone();
      m.material.color.set(topo ? 0xffffff : i === 0 ? 0x0a7fb0 : 0xa9def2); // base = sombrinha, lados = tom claro
      m.renderOrder = 1 + i;
      if (i === 0) m.position.y -= 0.004; // sombra um pouco abaixo, como luz vindo de cima
    }

    // fones: concha rosa, almofada ciano e a haste rosa passando por trás da cabeça
    for (const s of [-1, 1]) {
      const concha = this.solida(new G.CylinderGeometry(0.17, 0.17, 0.14, 28), COR.rosa, { pai: this.tronco, borda: 0.03 });
      concha.rotation.z = Math.PI / 2;
      concha.position.x = s * 0.585;
      T(concha, 4.09);
      const almofada = this.solida(new G.CylinderGeometry(0.135, 0.135, 0.06, 24), COR.azul, { pai: this.tronco, borda: 0.015 });
      almofada.rotation.z = Math.PI / 2;
      almofada.position.x = s * 0.51;
      T(almofada, 4.09);
      const tampa = this.solida(new G.CylinderGeometry(0.09, 0.09, 0.04, 20), 0xd8378f, { pai: this.tronco, borda: 0.01 });
      tampa.rotation.z = Math.PI / 2;
      tampa.position.x = s * 0.665;
      T(tampa, 4.09);
    }
    // haste: sai de uma concha, contorna a nuca por fora (descendo um pouco) e chega na outra
    const caminho = new G.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => {
      const a = (i / 12) * Math.PI;
      return new G.Vector3(0.56 * Math.cos(a), -0.24 * Math.sin(a), -0.56 * Math.sin(a));
    }));
    const haste = this.solida(new G.TubeGeometry(caminho, 48, 0.038, 10, false), COR.rosa, { pai: this.tronco, borda: 0 });
    T(haste, 4.09);

    // aba do boné, virada para a direita do Rabisco e inclinada para baixo
    const forma = new G.Shape();
    forma.absellipse(0, 0, 0.5, 0.95, Math.PI, Math.PI * 2, false, 0);
    const geoAba = new G.ExtrudeGeometry(forma, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 2, curveSegments: 24 });
    geoAba.rotateX(-Math.PI / 2);
    const pivoAba = new G.Group();
    pivoAba.rotation.y = -0.8;
    T(pivoAba, 4.86);
    this.tronco.add(pivoAba);
    const aba = this.solida(geoAba, COR.laranja, { pai: pivoAba, borda: 0.04 });
    this.aba = aba; this.pivoAba = pivoAba;
    aba.position.z = 0.42;
    aba.rotation.x = 0.4;

    const iniMochila = this.tronco.children.length; // (só marca as peças da mochila e das alças, para um jogo poder trocá-las)
    // mochila nas costas (a forma vem da vista lateral e das costas)
    const fm = new G.Shape();
    const mw = 0.42, mh = 0.72, mr = 0.2;
    fm.moveTo(-mw + mr, -mh); fm.lineTo(mw - mr, -mh); fm.quadraticCurveTo(mw, -mh, mw, -mh + mr);
    fm.lineTo(mw, mh - mr); fm.quadraticCurveTo(mw, mh, mw - mr, mh); fm.lineTo(-mw + mr, mh);
    fm.quadraticCurveTo(-mw, mh, -mw, mh - mr); fm.lineTo(-mw, -mh + mr); fm.quadraticCurveTo(-mw, -mh, -mw + mr, -mh);
    const geoM = new G.ExtrudeGeometry(fm, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 });
    geoM.center();
    // mochila toda laranja; os detalhes são feitos de contorno preto, como no traço do desenho
    const mochila = this.solida(geoM, COR.laranja, { pai: this.tronco, borda: 0.04 });
    mochila.position.z = -0.72;
    T(mochila, 2.68);
    const ZM = -0.925; // face de trás da mochila
    const linha = (pts, raio = 0.014) => this.solida(new G.TubeGeometry(new G.CatmullRomCurve3(pts.map(([x, y, z = ZM]) => new G.Vector3(x, y - 2.15, z))), 40, raio, 8, false), 0x151515, { pai: this.tronco, borda: 0 });
    // bolso da frente: peça laranja em relevo com borda preta
    const fb = new G.Shape();
    const bw = 0.27, bh = 0.2, br = 0.08;
    fb.moveTo(-bw + br, -bh); fb.lineTo(bw - br, -bh); fb.quadraticCurveTo(bw, -bh, bw, -bh + br);
    fb.lineTo(bw, bh - br); fb.quadraticCurveTo(bw, bh, bw - br, bh); fb.lineTo(-bw + br, bh);
    fb.quadraticCurveTo(-bw, bh, -bw, bh - br); fb.lineTo(-bw, -bh + br); fb.quadraticCurveTo(-bw, -bh, -bw + br, -bh);
    const bolso = this.solida(new G.ExtrudeGeometry(fb, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 }), COR.laranja, { pai: this.tronco, borda: 0.035 });
    bolso.rotation.y = Math.PI;
    bolso.position.z = ZM + 0.01;
    T(bolso, 2.48);
    // borda preta do bolso (contorno fechado)
    const contornoBolso = fb.getPoints(12).map((v) => new G.Vector3(-v.x, v.y + 2.48 - 2.15, ZM - 0.065));
    this.solida(new G.TubeGeometry(new G.CatmullRomCurve3(contornoBolso, true), 120, 0.013, 6, true), 0x151515, { pai: this.tronco, borda: 0 });
    // zíper do bolso em arco (o "sorriso" do desenho)
    linha([[-0.17, 2.6, ZM - 0.075], [-0.08, 2.53, ZM - 0.08], [0, 2.51, ZM - 0.08], [0.08, 2.53, ZM - 0.08], [0.17, 2.6, ZM - 0.075]], 0.016);
    // zíper de cima e costura de baixo
    linha([[-0.36, 3.12], [-0.18, 3.18, ZM - 0.01], [0, 3.2, ZM - 0.015], [0.18, 3.18, ZM - 0.01], [0.36, 3.12]]);
    linha([[-0.44, 2.18, ZM + 0.03], [-0.2, 2.17, ZM - 0.005], [0.2, 2.17, ZM - 0.005], [0.44, 2.18, ZM + 0.03]]);
    // alça de mão no topo
    const alcaMao = this.solida(new G.TorusGeometry(0.09, 0.025, 8, 20, Math.PI), COR.laranja, { pai: this.tronco, borda: 0.012 });
    alcaMao.position.z = -0.74;
    T(alcaMao, 3.47);

    // alças da mochila: saem do topo da mochila, passam por cima do ombro, descem na frente do
    // ombro e voltam para a mochila por baixo do braço (laço em volta do ombro, nada no peito)
    for (const sx of [-1, 1]) {
      // laço contínuo sempre POR FORA da camiseta (raio 0,585): sai do topo da mochila, contorna o ombro
      // pela frente e volta por baixo do braço até a base da mochila — sem entrar no corpo, sem quebra
      const R = 0.585;
      const p = (graus, y, r = R) => { const t = (graus * Math.PI) / 180; return new G.Vector3(sx * r * Math.sin(t), y - 2.15, r * Math.cos(t)); };
      const pts = [p(150, 3.3, 0.62), p(120, 3.5, 0.6), p(95, 3.58, 0.62), p(76, 3.48), p(70, 3.3), p(74, 3.12), p(92, 3.02), p(118, 2.94), p(146, 2.86, 0.62)];
      this.solida(new G.TubeGeometry(new G.CatmullRomCurve3(pts, false, "centripetal"), 64, 0.055, 10, false), COR.laranja, { pai: this.tronco, borda: 0 });
    }

    this.partes = { mochila: this.tronco.children.slice(iniMochila) };

    // braços na pose do desenho (soltos ao lado do corpo)
    const braco = (lado) => {
      const ombro = new G.Group();
      ombro.position.set(lado * 0.6, 3.42 - 2.15, 0);
      ombro.rotation.z = lado * 0.17;
      this.tronco.add(ombro);
      const manga = this.solida(new G.CylinderGeometry(0.16, 0.15, 0.5, 20), COR.rosa, { pai: ombro, borda: 0.03 });
      manga.position.y = -0.22;
      const punho = this.solida(new G.CylinderGeometry(0.155, 0.155, 0.1, 20), COR.azul, { pai: ombro, borda: 0.02 });
      punho.position.y = -0.51;
      const cotovelo = new G.Group();
      cotovelo.position.y = -0.56;
      ombro.add(cotovelo);
      const antebraco = this.solida(new G.CylinderGeometry(0.085, 0.078, 0.72, 16), COR.pele, { pai: cotovelo, borda: 0.02 });
      antebraco.position.y = -0.34;
      this.mao(cotovelo, lado);
      return { ombro, cotovelo };
    };
    this.bracoE = braco(1);
    this.bracoD = braco(-1);
    this.restoOmbroZ = 0.17;
  }

  // Calcula a projeção na pose de descanso e grava em cada peça
  assar() {
    this.grupo.updateMatrixWorld(true);
    const inv = new G.Matrix4().copy(this.corpo.matrixWorld).invert();
    const m = new G.Matrix4(), nm = new G.Matrix3(), v = new G.Vector3();
    for (const malha of this.malhas) {
      m.multiplyMatrices(inv, malha.matrixWorld);
      nm.getNormalMatrix(m);
      const geo = malha.geometry;
      if (!geo.attributes.normal) geo.computeVertexNormals();
      const pos = geo.attributes.position, nor = geo.attributes.normal;
      const pr = new Float32Array(pos.count * 3), nr = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m);
        pr.set([v.x, v.y, v.z], i * 3);
        v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
        nr.set([v.x, v.y, v.z], i * 3);
      }
      geo.setAttribute("posRef", new G.BufferAttribute(pr, 3));
      geo.setAttribute("nrmRef", new G.BufferAttribute(nr, 3));
    }
  }

  // Ângulos das articulações para cada modo
  pose(modo, { vel = 0, virar = 0, vmax = 8 }) {
    const t = this.tempo, f = this.fase;
    const ritmo = Math.min(1, Math.abs(vel) / vmax);
    const z0 = this.restoOmbroZ;
    const p = { tronX: 0, tronZ: 0, tronY: 0, corpoY: 0, qE: 0, qD: 0, jE: 0, jD: 0, oEx: 0, oDx: 0, oEz: z0, oDz: -z0, cE: 0, cD: 0, corpoX: 0, qEz: 0, qDz: 0, cEz: 0, cDz: 0, giro: 0 };
    if (modo === "parado") {
      const r = Math.sin(t * 2.2);
      p.oEx = r * 0.04; p.oDx = -r * 0.04;
      p.corpoY = r * 0.012;
    } else if (modo === "andar") {
      const amp = 0.3 + 0.4 * ritmo, s = Math.sin(f);
      p.qE = -s * amp; p.qD = s * amp;
      p.jE = Math.max(0, Math.sin(f + 1.2)) * (0.35 + ritmo * 0.8);
      p.jD = Math.max(0, Math.sin(f + 1.2 + Math.PI)) * (0.35 + ritmo * 0.8);
      p.oEx = s * amp * 0.9; p.oDx = -s * amp * 0.9;
      p.cE = p.cD = -0.2 - ritmo * 0.8;
      p.tronX = 0.04 + 0.1 * ritmo;
      p.tronY = s * 0.05;
      p.corpoY = Math.abs(Math.cos(f)) * (0.05 + 0.1 * ritmo);
    } else if (modo === "pular") {
      p.qE = -0.8; p.jE = 1.1; p.qD = 0.2; p.jD = 0.4;
      // braço levantado é o esquerdo: do lado direito fica a aba do boné
      p.oEx = -2.6; p.oEz = 0.25; p.cE = -0.2;
      p.oDx = 0.4; p.oDz = -0.5; p.cD = -0.5;
    } else if (modo === "acenar") {
      // dá "oi" com o braço esquerdo (do lado direito fica a aba do boné)
      const r = Math.sin(t * 2.2);
      p.oEz = 2.55; p.oEx = -0.25; p.cE = -0.35 + Math.sin(t * 7) * 0.45;
      p.oDx = r * 0.04;
      p.tronZ = Math.sin(t * 1.4) * 0.04;
      p.corpoY = Math.abs(Math.sin(t * 2.2)) * 0.02;
    } else if (modo === "comemorar") {
      const pulo = Math.abs(Math.sin(t * 5));
      p.corpoY = pulo * 0.5;
      p.oEz = 2.5 + Math.sin(t * 10) * 0.2; p.oDz = -2.5 - Math.sin(t * 10) * 0.2;
      p.qE = p.qD = -pulo * 0.25; p.jE = p.jD = pulo * 0.5;
    } else if (modo === "street") {
      const d = this.danca ?? passoStreet(t * 1.75); // sem música: a coreografia padrão a 105 BPM
      poseStreet(p, d.passo, d.b, z0);
    } else if (modo === "dirigir" || modo === "comemorarSentado") {
      p.qE = p.qD = -1.45; p.jE = p.jD = 1.3;
      if (modo === "dirigir") {
        // braços para a frente e um pouco para dentro, mãos na altura do peito (o jogo encaixa o volante nelas)
        p.oEx = p.oDx = -0.75; p.cE = p.cD = -0.75;
        p.oEz = -0.12 + virar * 0.12; p.oDz = 0.12 + virar * 0.12;
        p.tronZ = -virar * 0.1;
      } else {
        p.oEz = 2.6 + Math.sin(t * 9) * 0.25; p.oDz = -2.6 - Math.sin(t * 9 + 1) * 0.25;
        p.tronZ = Math.sin(t * 4.5) * 0.08;
        p.corpoY = Math.abs(Math.sin(t * 4.5)) * 0.1;
      }
    }
    return p;
  }

  atualizar(dt, { modo = "parado", vel = 0, virar = 0, vmax = 8 } = {}) {
    this.tempo += dt;
    if (modo === "andar") this.fase += (Math.abs(vel) * dt * Math.PI) / (1.6 * this.escala);
    const alvo = this.pose(modo, { vel, virar, vmax });
    const k = Math.min(1, dt * (modo === "andar" ? 20 : modo === "street" ? 16 : 12));
    for (const c in alvo) this.atual[c] = (this.atual[c] ?? alvo[c]) + (alvo[c] - (this.atual[c] ?? alvo[c])) * k;
    const a = this.atual;
    a.giro = alvo.giro; // o giro da dança vai direto (de uma volta inteira para zero não pode voltar girando ao contrário)
    this.tronco.rotation.set(a.tronX, a.tronY, a.tronZ);
    this.corpo.position.y = a.corpoY * this.escala;
    this.pernaE.quadril.rotation.x = a.qE; this.pernaD.quadril.rotation.x = a.qD;
    this.pernaE.joelho.rotation.x = a.jE; this.pernaD.joelho.rotation.x = a.jD;
    this.bracoE.ombro.rotation.set(a.oEx, 0, a.oEz);
    this.bracoD.ombro.rotation.set(a.oDx, 0, a.oDz);
    this.bracoE.cotovelo.rotation.x = a.cE; this.bracoD.cotovelo.rotation.x = a.cD;
    // juntas que só a dança usa (pé para o lado, quadril, cotovelo de lado, giro): fora dela não mexe em nada
    if (modo === "street" || this.restoStreet) {
      this.corpo.position.x = a.corpoX * this.escala; this.corpo.rotation.y = a.giro;
      this.pernaE.quadril.rotation.z = a.qEz; this.pernaD.quadril.rotation.z = a.qDz;
      this.bracoE.cotovelo.rotation.z = a.cEz; this.bracoD.cotovelo.rotation.z = a.cDz;
      this.restoStreet = modo === "street" || Math.abs(a.corpoX) + Math.abs(a.qEz) + Math.abs(a.qDz) + Math.abs(a.cEz) + Math.abs(a.cDz) > 1e-3;
      if (!this.restoStreet) { this.corpo.position.x = 0; this.pernaE.quadril.rotation.z = this.pernaD.quadril.rotation.z = 0; this.bracoE.cotovelo.rotation.z = this.bracoD.cotovelo.rotation.z = 0; }
    }
  }
}

export { ALTURA_NATIVA };
