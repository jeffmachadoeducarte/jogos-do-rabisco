// Rabisco animado (vista lateral), montado com as peças oficiais de assets/rabisco/rig.
// A arte original olha para a esquerda; o container é espelhado para andar à direita.
//
// Hierarquia: this (posição nos pés, espelho, inclinação)
//               └ mola (estica e achata)
//                   └ raiz (escala do rig, desloca para os pés ficarem em 0,0)
//                       ├ braço de trás, perna de trás, perna da frente
//                       └ tronco (corpo, mochila, braço, punho)

const PECAS = ["corpo", "braco", "punho", "mochila", "perna"];
const CENTRO_PES = 66; // x dos pés no espaço do rig
const COMPRIMENTO_PERNA = 109; // do quadril à sola, no espaço do rig
const TINTA_TRAS = 0xb9c6d3;

export function carregarRabisco(scene, raizProjeto) {
  scene.load.json("rabisco-rig", `${raizProjeto}/assets/rabisco/rig/rig.json`);
  for (const p of PECAS) scene.load.image(`rabisco-${p}`, `${raizProjeto}/assets/rabisco/rig/${p}.png`);
}

const suave = (atual, alvo, dt, rapidez) => atual + (alvo - atual) * Math.min(1, dt * rapidez);

export class Rabisco extends Phaser.GameObjects.Container {
  constructor(scene, x, y, altura = 150) {
    super(scene, x, y);
    scene.add.existing(this);
    const rig = scene.cache.json.get("rabisco-rig");
    this.rig = rig;
    this.escala = altura / rig.altura;
    this.altura = altura;

    this.mola = scene.add.container(0, 0);
    this.raiz = scene.add.container(-CENTRO_PES * this.escala, -rig.altura * this.escala).setScale(this.escala);
    this.tronco = scene.add.container(0, 0);
    this.add(this.mola);
    this.mola.add(this.raiz);

    const peca = (nome, destino, tinta) => {
      const m = rig.pecas[nome];
      const img = scene.add.image(m.pivoX, m.pivoY, `rabisco-${nome}`).setOrigin(m.origemX, m.origemY);
      if (tinta) img.setTint(tinta);
      destino.add(img);
      return img;
    };
    this.bracoTras = peca("braco", this.raiz, TINTA_TRAS);
    this.pernaTras = peca("perna", this.raiz, TINTA_TRAS);
    this.pernaFrente = peca("perna", this.raiz);
    this.raiz.add(this.tronco);
    this.corpo = peca("corpo", this.tronco);
    this.mochila = peca("mochila", this.tronco);
    this.braco = peca("braco", this.tronco);
    this.punho = peca("punho", this.tronco);

    this.dir = 1; // 1 = direita, -1 = esquerda
    this.fase = 0;
    this.ang = { pf: 0, pt: 0, bf: 0, bt: 0, inclina: 0 };
    this.mochilaAng = 0;
    this.mochilaVel = 0;
    this.estica = 1;
    this.esticaVel = 0;
    this.noChaoAntes = true;
    this.vyAntes = 0;
    this.olhar(1);
  }

  olhar(dir) {
    this.dir = dir;
    this.scaleX = dir === 1 ? -1 : 1;
  }

  // Chamado a cada quadro. vx/vy em px/s; vmax = velocidade de corrida.
  atualizar(dt, { vx = 0, vy = 0, noChao = true, vmax = 320 } = {}) {
    const t = this.scene.time.now / 1000;
    const vel = Math.abs(vx);
    const ritmo = Math.min(1, vel / vmax);
    if (vel > 20) this.olhar(Math.sign(vx));

    const alvo = { pf: 0, pt: 0, bf: 0, bt: 0, inclina: 0 };
    let queda = 0; // quanto o quadril desce (espaço do rig)
    let rapidez = 14;

    if (!noChao) {
      const subindo = vy < 0;
      alvo.pf = subindo ? 38 : 22;
      alvo.pt = subindo ? -28 : -12;
      alvo.bf = subindo ? 75 : 40;
      alvo.bt = subindo ? -55 : -25;
      alvo.inclina = this.dir * 5 * ritmo;
      rapidez = 10;
    } else if (vel > 15) {
      // Passada sincronizada com a velocidade para os pés não "patinarem"
      const amp = Phaser.Math.DegToRad(12 + 22 * ritmo);
      const pernaPx = COMPRIMENTO_PERNA * this.escala;
      this.fase += (vel * dt * Math.PI) / (2 * pernaPx * Math.sin(amp));
      const s = Math.sin(this.fase);
      const ampG = Phaser.Math.RadToDeg(amp);
      alvo.pf = s * ampG;
      alvo.pt = -s * ampG;
      alvo.bf = -s * ampG * 0.9;
      alvo.bt = s * ampG * 0.9;
      alvo.inclina = this.dir * (2 + 6 * ritmo);
      queda = COMPRIMENTO_PERNA * (1 - Math.cos(Math.abs(s) * amp)) + Math.abs(Math.cos(this.fase)) * 4 * ritmo;
      rapidez = 30;
    } else {
      // Parado: respiração e braços soltos
      const resp = Math.sin(t * 2.4);
      alvo.bf = resp * 2.5;
      alvo.bt = -resp * 2;
      this.tronco.y = resp * 1.6;
    }
    if (noChao && vel > 15) this.tronco.y = suave(this.tronco.y, 0, dt, 10);
    if (!noChao) this.tronco.y = suave(this.tronco.y, 0, dt, 10);

    for (const k in alvo) this.ang[k] = suave(this.ang[k], alvo[k], dt, rapidez);
    this.pernaFrente.angle = this.ang.pf;
    this.pernaTras.angle = this.ang.pt;
    this.braco.angle = this.ang.bf;
    this.bracoTras.angle = this.ang.bt;
    this.rotation = Phaser.Math.DegToRad(this.ang.inclina);
    this.mola.y = queda * this.escala;

    // Mochila com mola: atrasa quando acelera e balança com a passada
    const alvoMochila = -ritmo * 9 + (noChao ? Math.sin(this.fase * 2) * 3 * ritmo : vy * 0.012);
    this.mochilaVel += ((alvoMochila - this.mochilaAng) * 180 - this.mochilaVel * 12) * dt;
    this.mochilaAng += this.mochilaVel * dt;
    this.mochila.angle = this.mochilaAng;

    // Estica no pulo, achata na aterrissagem
    if (!noChao && this.noChaoAntes && vy < 0) this.esticaVel = 3.2;
    if (noChao && !this.noChaoAntes) this.esticaVel = -Math.min(4, 1.5 + this.vyAntes / 300);
    this.esticaVel += ((1 - this.estica) * 260 - this.esticaVel * 14) * dt;
    this.estica += this.esticaVel * dt;
    this.mola.scaleY = this.estica;
    this.mola.scaleX = 1 / Math.sqrt(this.estica);
    this.noChaoAntes = noChao;
    this.vyAntes = vy;
  }

  piscar(duracaoMs = 1200) {
    this.scene.tweens.add({ targets: this, alpha: 0.3, duration: 90, yoyo: true, repeat: Math.floor(duracaoMs / 180) });
  }
}
