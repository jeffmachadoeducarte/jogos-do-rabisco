// Painel de entrada: a escola Educarte em 3D com o Rabisco acenando na frente.
// Por cima, os cartões de idade; cada um abre a lista de jogos daquela faixa (src/catalogo.js).

import { faixas, estilos } from "./catalogo.js";
import { THREE, COR3D, toon, carregarTextura, aleatorio } from "./motor3d/toon.js";
import { escolaEducarte3D, arvore3D, nuvem3D, morro3D, onibus3D, lapis3D } from "./motor3d/objetos.js";
import { Rabisco3D } from "./motor3d/rabisco3d.js";
import { falar, preCarregarFalas } from "./motor/voz.js";
import { sons } from "./motor/sons.js";
import { ligarControle } from "./motor/controle.js";

const RAIZ = ".";
const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ Cena 3D
const renderer = new THREE.WebGLRenderer({ canvas: $("cena"), antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const cena = new THREE.Scene();
cena.fog = new THREE.Fog(0xcdeeff, 70, 200);
const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.3, 600);

const ceu = new THREE.Mesh(
  new THREE.SphereGeometry(400, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { topo: { value: new THREE.Color(0x2f9bff) }, horizonte: { value: new THREE.Color(0xd6f3ff) } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 topo; uniform vec3 horizonte; varying vec3 vP; void main(){ float h = clamp(vP.y*1.7, 0.0, 1.0); gl_FragColor = vec4(mix(horizonte, topo, pow(h,0.75)), 1.0); }",
  }),
);
cena.add(ceu);
const sol = new THREE.DirectionalLight(0xffffff, 2.5);
sol.position.set(18, 30, 22);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -30, right: 30, top: 25, bottom: -15, near: 1, far: 120 });
sol.shadow.bias = -0.0005;
sol.shadow.normalBias = 0.04;
cena.add(sol, new THREE.HemisphereLight(0xd6f3ff, 0x5aa83a, 1.6));

const texLogo = carregarTextura(`${RAIZ}/assets/marca/logos/azul-icone-rosa.png`);
const texIcone = carregarTextura(`${RAIZ}/assets/marca/logos/icone-branco.png`);

// gramado, morros, nuvens, árvores e lápis gigantes
const grama = new THREE.Mesh(new THREE.CircleGeometry(160, 64), toon(0x62c845));
grama.rotation.x = -Math.PI / 2;
grama.receiveShadow = true;
cena.add(grama);
const rnd = aleatorio(9);
for (let i = 0; i < 9; i++) {
  const m = morro3D(30 + rnd() * 25, i % 2 ? 0x7dd36a : 0x9fe08a);
  m.position.set(-90 + i * 24, 0, -60 - rnd() * 20);
  cena.add(m);
}
for (let i = 0; i < 10; i++) {
  const n = nuvem3D(0.8 + rnd() * 0.6);
  n.position.set(-60 + i * 13 + rnd() * 6, 22 + rnd() * 10, -35 - rnd() * 15);
  cena.add(n);
}
for (const [x, z, e] of [[-24, -4, 0.7], [-20, 6, 0.6], [22, -3, 0.75], [26, 7, 0.6], [-30, 12, 0.55], [31, 14, 0.5]]) {
  const a = arvore3D(e);
  a.position.set(x, 0, z);
  cena.add(a);
}
const coresLapis = [COR3D.roxo, COR3D.vermelho, COR3D.amarelo, 0x2f7de1, COR3D.verde, COR3D.laranja, COR3D.rosa];
for (let i = 0; i < 9; i++) {
  const l = lapis3D(coresLapis[i % coresLapis.length], 10 + rnd() * 8, 1);
  l.position.set(-44 + i * 11, 0, -22 - rnd() * 6);
  l.rotation.z = (rnd() - 0.5) * 0.2;
  cena.add(l);
}

const escola = escolaEducarte3D(texLogo, texIcone);
escola.position.set(3, 0, -6);
cena.add(escola);
const bus = onibus3D(texLogo);
bus.scale.setScalar(0.75);
bus.rotation.y = -1.1;
bus.position.set(-14, 0, 9);
cena.add(bus);

// Rabisco na frente da escola, acenando
const rabisco = new Rabisco3D({ raiz: RAIZ, altura: 4.6 });
rabisco.grupo.position.set(-4.5, 0, 12.5);
rabisco.grupo.rotation.y = 0.35;
cena.add(rabisco.grupo);

const alvoCam = new THREE.Vector3(-1, 2.6, 4);
function ajustarTela() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", ajustarTela);
ajustarTela();

const relogio = new THREE.Clock();
let modoRabisco = "acenar", modoAte = 0;
function quadro() {
  const dt = Math.min(relogio.getDelta(), 1 / 30);
  controle.atualizar();
  const t = relogio.elapsedTime;
  // câmera passeando bem devagar na frente da escola (celular: mais longe para caber tudo)
  const longe = camera.aspect < 0.9 ? 1.6 : 1;
  camera.position.set(-3 + Math.sin(t * 0.12) * 4, 5.2 + Math.sin(t * 0.2) * 0.3, 4 + 25 * longe);
  camera.lookAt(alvoCam);
  if (t > modoAte) modoRabisco = "acenar";
  rabisco.atualizar(dt, { modo: modoRabisco });
  rabisco.grupo.rotation.y = 0.35 + Math.sin(t * 0.5) * 0.08;
  escola.userData.balanco.rotation.x = Math.sin(t * 1.6) * 0.35;
  escola.userData.bandeira.rotation.y = Math.sin(t * 2) * 0.12;
  renderer.render(cena, camera);
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
const comemorar = () => { modoRabisco = "comemorar"; modoAte = relogio.elapsedTime + 1.6; };

// ------------------------------------------------------------------ Cartões de idade e jogos
const soIngles = $("so-ingles");
const filtrar = (jogos) => (soIngles.checked ? jogos.filter((j) => j.ingles) : jogos);
let faixaAberta = null;

function desenharFaixas() {
  $("faixas").innerHTML = faixas.map((f) => {
    const n = filtrar(f.jogos).length;
    return `<button class="faixa ${faixaAberta === f.id ? "aberta" : ""}" data-faixa="${f.id}" style="--cor:${f.cor}">
      <span class="emoji" aria-hidden="true">${f.emoji}</span>
      <strong>${f.nome}</strong>
      <span class="idade">${f.idade}</span>
      <span class="contagem">${n} ${n === 1 ? "jogo" : "jogos"}</span>
    </button>`;
  }).join("");
}

function abrirFaixa(id) {
  const f = faixas.find((x) => x.id === id);
  if (!f) return;
  faixaAberta = id;
  $("painel").style.setProperty("--cor", f.cor);
  $("painel-titulo").textContent = `${f.emoji} ${f.nome}`;
  $("painel-idade").textContent = f.idade;
  $("painel-nota").hidden = !f.nota;
  $("painel-nota").textContent = f.nota || "";
  const jogos = filtrar(f.jogos);
  $("jogos").innerHTML = jogos.length ? jogos.map((j) => {
    const pronto = j.status === "pronto";
    const est = estilos[j.estilo];
    const conteudo = `
      <div class="selos">
        <span class="selo estilo">${est.icone} ${est.nome}</span>
        ${j.ingles ? '<span class="selo ingles">English</span>' : ""}
        <span class="selo ${pronto ? "pronto" : "breve"}">${pronto ? "Jogar ▶" : "Em breve"}</span>
      </div>
      <h3>${j.nome}</h3>
      <p>${j.desc}</p>
      <span class="habilidade">${j.habilidade}</span>`;
    return pronto
      ? `<a class="jogo pronto" href="jogos/${j.id}/">${conteudo}</a>`
      : `<div class="jogo">${conteudo}</div>`;
  }).join("") : '<p class="vazio">Ainda não tem jogo de inglês nesta idade.</p>';
  $("painel").hidden = false;
  $("boas-vindas").classList.add("recolhida");
  desenharFaixas();
  comemorar();
  sons.destravar();
  falar("portal-idade");
}

function fecharPainel() {
  faixaAberta = null;
  $("painel").hidden = true;
  $("boas-vindas").classList.remove("recolhida");
  desenharFaixas();
}

$("faixas").addEventListener("click", (e) => {
  const b = e.target.closest("[data-faixa]");
  if (b) (faixaAberta === b.dataset.faixa ? fecharPainel() : abrirFaixa(b.dataset.faixa));
});
$("fechar").addEventListener("click", fecharPainel);
addEventListener("keydown", (e) => { if (e.key === "Escape") fecharPainel(); });
soIngles.addEventListener("change", () => { desenharFaixas(); if (faixaAberta) abrirFaixa(faixaAberta); });
$("som").addEventListener("click", () => { $("som").textContent = sons.alternarMudo() ? "🔇" : "🔊"; });

// O Rabisco dá "oi" no primeiro toque (o navegador só deixa tocar som depois de um toque)
preCarregarFalas(["portal-oi", "portal-idade"]);
let cumprimentou = false;
addEventListener("pointerdown", (e) => {
  if (cumprimentou || e.target.closest("[data-faixa]")) return;
  cumprimentou = true;
  sons.destravar();
  falar("portal-oi");
});

// Controle: direcional escolhe a idade ou o jogo, A abre, B volta para as idades
const controle = ligarControle({
  menu: () => (faixaAberta ? $("painel") : document.body),
  aoVoltar: () => { if (faixaAberta) { const id = faixaAberta; fecharPainel(); const b = document.querySelector(`[data-faixa="${id}"]`); if (b) controle.controle.focar(b); } },
  aoConectar: () => { sons.destravar(); },
});

desenharFaixas();
// voltando de um jogo (index.html#/faixa/pequenos), o painel daquela idade já abre
const faixaDoEndereco = () => location.hash.match(/^#\/faixa\/([\w-]+)/)?.[1];
if (faixaDoEndereco()) abrirFaixa(faixaDoEndereco());
addEventListener("hashchange", () => { const f = faixaDoEndereco(); if (f) abrirFaixa(f); });
