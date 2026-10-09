// Jogo de vestir com objetivo (Veste o Rabisco e Camarim das Profissões): o Rabisco pede um conjunto
// de roupas; a criança escolhe no guarda-roupa. A peça certa veste; a errada faz o Rabisco balançar
// a cabeça. Com tudo vestido, a cena acontece (chuva, praia, o bombeiro apagando o fogo...).
//
//   jogoDeVestir({ titulo, faixa, fases: [{ nome, pedido, fala, certas: [...], erradas: [...], cena, efeito }] })

import { criarCasca, el } from "./casca.js";
import { ROUPAS, montarRabisco, miniatura } from "./camarim.js";
import { sons } from "./sons.js";
import { falar } from "./voz.js";

export function jogoDeVestir({ titulo, sub, faixa, cor, fases, falas = {}, prefixoFala }) {
  let fase = null, rabisco = null, erros = 0, cena = null;

  const jogo = criarCasca({
    titulo, sub, faixa, cor,
    niveis: fases.map((f) => ({ nome: f.nome, desc: f.desc ?? "" })),
    dica: { teclado: "Setas para escolher · Enter para vestir · P para pausar", toque: "Toque na roupa para vestir o Rabisco", controle: "Direcional para escolher · A para vestir · Start para pausar" },
    falas,
    aoComecar: (n) => montar(fases[n - 1]),
  });

  function montar(f) {
    fase = f; erros = 0;
    const palco = el("div", { class: `palco-camarim cena-${f.cena}` });
    cena = el("div", { class: "lado-rabisco" });
    const balao = el("div", { class: "balao", texto: f.pedido });
    cena.append(balao);
    rabisco = montarRabisco(cena);
    cena.append(el("div", { class: "efeitos" }));
    const vitrine = el("div", { class: "vitrine" });
    const grade = el("div", { class: "guarda-roupa", role: "group", "aria-label": "Guarda-roupa" });
    for (const id of embaralhar([...f.certas, ...f.erradas])) {
      const b = el("button", { class: "peca", "aria-label": ROUPAS[id].nome, onclick: () => escolher(id, b) });
      b.append(miniatura(id), el("span", { texto: ROUPAS[id].nome }));
      grade.append(b);
    }
    vitrine.append(grade);
    palco.append(cena, vitrine);
    jogo.palco.append(palco);
    atualizarPlacar();
    falar(f.fala);
  }

  const embaralhar = (a) => a.sort(() => Math.random() - 0.5);
  const atualizarPlacar = () => jogo.placar(`👕 ${fase.certas.filter((id) => rabisco.vestido(id)).length}/${fase.certas.length}`);

  function escolher(id, botao) {
    if (jogo.pausado || jogo.estado !== "jogando") return;
    if (!fase.certas.includes(id)) {
      erros++;
      rabisco.animar("nao");
      botao.classList.remove("errada"); void botao.offsetWidth; botao.classList.add("errada");
      sons.erro();
      jogo.aviso(fase.naoServe ?? "Hmm... essa não!", "", 1500);
      falar(fase.falaNao);
      return;
    }
    if (rabisco.vestido(id)) return;
    rabisco.vestir(id);
    botao.classList.add("vestida");
    sons.moeda();
    falar(`${prefixoFala}-${id}`);
    atualizarPlacar();
    if (fase.certas.every((x) => rabisco.vestido(x))) {
      setTimeout(() => {
        rabisco.animar("pula");
        sons.vitoria();
        efeito(fase.efeito);
        falar(fase.falaPronto);
      }, 700);
      const estrelas = erros === 0 ? 3 : erros <= 2 ? 2 : 1;
      setTimeout(() => jogo.vencer({ titulo: fase.titulo ?? "Prontinho!", estrelas, texto: fase.pronto }), 3400);
    }
  }

  // a cena acontece: emojis que voam do Rabisco (água, corações, estrelas...)
  function efeito({ emojis, de = [0.85, 0.62], para = [1.6, 0.3], n = 14 } = {}) {
    const caixa = cena.querySelector(".efeitos");
    if (!emojis) return;
    for (let i = 0; i < n; i++) {
      const e = el("span", { class: "efeito", texto: emojis[i % emojis.length] });
      e.style.left = `${de[0] * 100}%`; e.style.top = `${de[1] * 100}%`;
      e.style.setProperty("--x1", `${para[0] * 100 + (Math.random() - 0.5) * 40}%`);
      e.style.setProperty("--y1", `${para[1] * 100 + (Math.random() - 0.5) * 40}%`);
      e.style.animationDelay = `${i * 0.12}s`;
      caixa.append(e);
    }
  }

  return jogo;
}
