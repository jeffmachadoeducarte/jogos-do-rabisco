// Rabiscolândia: o retrato dos bonecos de bloco das pessoas para as figurinhas do Álbum.
// É o MESMO boneco do jogo (pessoas.js); nenhuma foto. Renderiza em 3D uma vez só, copia para um canvas 2D guardado em cache e
// descarta tudo (cena, geometria e o contexto WebGL): nada fica na cena da cidade nem no custo de desenho do jogo.
//   await prepararRetratos(["sabrina", "carina"])    retrato("sabrina") → canvas 2D (ou null se ainda não ficou pronto)
import { THREE } from "../../src/motor3d/toon.js";
import { criarPessoa } from "./pessoas.js";

const LARG = 360, ALT = 400;
const cache = new Map(); // id → canvas 2D
let emCurso = null;

export const retrato = (id) => cache.get(id) ?? null;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function gerar(ids) {
  const alvo = ids.filter((id) => !cache.has(id));
  if (!alvo.length) return;
  let r3 = null;
  try {
    const c3 = document.createElement("canvas"); c3.width = LARG; c3.height = ALT;
    r3 = new THREE.WebGLRenderer({ canvas: c3, antialias: true, alpha: true, preserveDrawingBuffer: true });
    r3.outputColorSpace = THREE.SRGBColorSpace; r3.toneMapping = THREE.ACESFilmicToneMapping; r3.setPixelRatio(1); r3.setSize(LARG, ALT, false);
    r3.setClearColor(0x000000, 0);
    const cena = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(30, LARG / ALT, 0.1, 50);
    const sol = new THREE.DirectionalLight(0xfff2dc, 2.6); sol.position.set(2.5, 4, 6); cena.add(sol);
    cena.add(new THREE.HemisphereLight(0xdff0ff, 0xd9c9a8, 1.3));
    for (const id of alvo) {
      const p = criarPessoa(id, { escala: 1, objeto: false });
      p.olhosAbertos(60);
      p.grupo.rotation.y = -0.28; // um quarto de lado, olhando para quem vê
      cena.add(p.grupo);
      const h = 2.15; // mesma altura para todos: o Vovô Léo, que é baixinho como o Rabisco, aparece menor (como no jogo)
      cam.position.set(0, h * 0.5 + 0.1, h * 2.25); cam.lookAt(0, h * 0.5, 0);
      // a logo da Sabrina (imagem da escola) chega depois; espera um pouco antes de tirar o retrato
      await espera(id === "sabrina" ? 400 : 120);
      p.atualizar(0.05, { modo: "parado" });
      cena.updateMatrixWorld(true);
      r3.render(cena, cam);
      const d = document.createElement("canvas"); d.width = LARG; d.height = ALT;
      d.getContext("2d").drawImage(c3, 0, 0);
      cache.set(id, d);
      cena.remove(p.grupo);
      p.grupo.traverse((o) => { o.geometry?.dispose?.(); });
    }
  } finally {
    try { r3?.dispose(); r3?.forceContextLoss(); } catch { /* sem contexto: nada a soltar */ }
  }
}

// gera os retratos que faltam (uma vez); chamadas juntas esperam a mesma rodada
export function prepararRetratos(ids) {
  const faltam = ids.filter((id) => !cache.has(id));
  if (!faltam.length) return Promise.resolve();
  const rodada = (emCurso ?? Promise.resolve()).catch(() => {}).then(() => gerar(faltam)).catch(() => {});
  emCurso = rodada;
  return rodada;
}
