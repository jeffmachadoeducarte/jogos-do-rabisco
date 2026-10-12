// Companheiro 3D: a criança cadastrada (src/motor/familia.js) como um personagem no estilo do Rabisco.
// Reaproveita o Rabisco3D oficial sem mexer nele: troca a cor do lápis, do short e do boné, põe um laço
// no boné e, se houver foto, o rosto vira a foto recortada em círculo (o rosto em relevo do Rabisco
// não é montado). Opcional: crachá flutuante com o nome. Mesmo custo do Rabisco (nenhuma luz extra).
//
//   import { criarCompanheiro3D } from "../../src/motor3d/companheiro3d.js";
//   const amigo = criarCompanheiro3D({ raiz: "../..", altura: 1.6, cracha: true });  // null sem criança cadastrada
//   cena.add(amigo.grupo);  amigo.atualizar(dt, { modo: "andar", vel, vmax });        // mesma API do Rabisco3D
//   amigo.bracos(oEx, oEz, cE)  // ajusta os braços depois de atualizar (ex.: segurando no kart)

import { THREE, toon, texturaCanvas } from "./toon.js";
import { Rabisco3D } from "./rabisco3d.js";

const G = THREE;
const AZUL_RABISCO = 0x00bdff, ROSA_RABISCO = 0xf14ba8, LARANJA_RABISCO = 0xff6400;

const dadosCrianca = () => { try { return window.Familia?.crianca?.() || null; } catch { return null; } };

// Foto quadrada (dataURL) → textura redonda com contorno preto, no mesmo traço do desenho
function texturaRosto(foto, proporcao = 1) {
  const W = 256, H = Math.round(256 * proporcao);
  const tex = texturaCanvas(W, H, () => {});
  const im = new Image();
  im.onload = () => {
    const c = tex.image, x = c.getContext("2d");
    x.clearRect(0, 0, W, H);
    const r = Math.min(W, H) / 2 - 8;
    x.save(); x.beginPath(); x.arc(W / 2, H / 2, r, 0, Math.PI * 2); x.clip();
    x.drawImage(im, W / 2 - r, H / 2 - r, r * 2, r * 2);
    x.restore();
    x.lineWidth = 9; x.strokeStyle = "#151515"; x.beginPath(); x.arc(W / 2, H / 2, r, 0, Math.PI * 2); x.stroke();
    tex.needsUpdate = true;
  };
  im.src = foto;
  return tex;
}

// Crachá: nome num sprite de texto que sempre olha para a câmera
function cracha(nome) {
  const tex = texturaCanvas(512, 160, (x, w, h) => {
    x.font = "900 86px 'Baloo 2', system-ui, sans-serif";
    const larg = Math.min(w - 40, x.measureText(nome).width + 70);
    const rx = (w - larg) / 2, ry = 20, rr = 60;
    x.fillStyle = "#151515"; x.beginPath(); x.roundRect(rx - 7, ry - 7, larg + 14, h - 2 * ry + 14, rr); x.fill();
    x.fillStyle = "#ffffff"; x.beginPath(); x.roundRect(rx, ry, larg, h - 2 * ry, rr - 6); x.fill();
    x.fillStyle = "#ec2e8c"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(nome, w / 2, h / 2 + 4);
  });
  const s = new G.Sprite(new G.SpriteMaterial({ map: tex, transparent: true, depthTest: true }));
  s.scale.set(2.6, 0.82, 1);
  return s;
}

export function criarCompanheiro3D({ raiz = "../..", altura = 1.8, cor = 0x58c43a, corShort = 0x8e6cff, corBone = 0xffcc1f, cracha: querCracha = false, crianca = dadosCrianca() } = {}) {
  if (!crianca?.nome) return null;
  const rb = new Rabisco3D({ raiz, altura });
  const foto = crianca.foto || null;
  if (foto) rb.montarRosto = () => {}; // com foto, o rosto é a foto (sem olhos/boca em relevo por baixo)

  // troca de cores: materiais são compartilhados (cache do toon), então clona antes de pintar
  const pintar = (m, nova) => { m.material = m.material.clone(); m.material.color.set(nova); };
  rb.grupo.updateMatrixWorld(true);
  rb.corpo.traverse((m) => {
    if (!m.isMesh || !m.material?.color || m.material.type !== "MeshToonMaterial") return;
    const hex = m.material.color.getHex();
    if (hex === AZUL_RABISCO && m.geometry.type === "LatheGeometry") pintar(m, cor);       // o lápis (camiseta + cabeça)
    else if (hex === ROSA_RABISCO) pintar(m, corShort);                                     // short
    else if (hex === LARANJA_RABISCO && m === rb.bone) pintar(m, corBone);                  // faixa do boné
  });

  // laço no boné (a "diferença de cabelo" sem redesenhar o personagem)
  const laco = new G.Group();
  const matLaco = toon(0xec2e8c);
  for (const s of [-1, 1]) {
    const folha = new G.Mesh(new G.SphereGeometry(0.16, 16, 12), matLaco);
    folha.scale.set(1.25, 0.8, 0.55);
    folha.position.set(s * 0.17, 0, 0);
    laco.add(folha);
  }
  const no = new G.Mesh(new G.SphereGeometry(0.085, 12, 10), toon(0x151515));
  laco.add(no);
  laco.position.set(0.3, 4.95 - 2.15, 0.4);
  laco.rotation.set(0, 0.6, 0.3);
  rb.tronco.add(laco);

  // rosto: foto em círculo colada na curva da cabeça (mesma medida do rosto do Rabisco)
  let rostoFoto = null;
  if (foto) {
    const R = 0.515 + 0.012, ANG = 2.0, ALT = 1.15;
    const geo = new G.CylinderGeometry(R, R, ALT, 32, 1, true, -ANG / 2, ANG);
    rostoFoto = new G.Mesh(geo, new G.MeshToonMaterial({ map: texturaRosto(foto, ALT / (R * ANG)), transparent: true, gradientMap: toon(0xffffff).gradientMap }));
    rostoFoto.position.y = 4.11 - 2.15;
    rostoFoto.renderOrder = 2;
    rb.tronco.add(rostoFoto);
  }

  let placa = null;
  if (querCracha) {
    placa = cracha(crianca.nome);
    placa.position.y = 6.6 * rb.escala;
    rb.grupo.add(placa);
  }

  const atualizarBase = rb.atualizar.bind(rb);
  return {
    grupo: rb.grupo, rabisco: rb, crianca, temFoto: Boolean(foto), cracha: placa,
    get escala() { return rb.escala; },
    atualizar(dt, opcoes) {
      atualizarBase(dt, opcoes);
      if (placa) placa.position.y = (6.6 + Math.sin(rb.tempo * 2) * 0.08) * rb.escala;
    },
    // posição dos braços depois de atualizar (ombro X, ombro Z, cotovelo), para poses próprias do jogo
    bracos(oEx, oEz, cE) {
      rb.bracoE.ombro.rotation.set(oEx, 0, oEz + rb.restoOmbroZ);
      rb.bracoD.ombro.rotation.set(oEx, 0, -oEz - rb.restoOmbroZ);
      rb.bracoE.cotovelo.rotation.x = cE; rb.bracoD.cotovelo.rotation.x = cE;
    },
  };
}
