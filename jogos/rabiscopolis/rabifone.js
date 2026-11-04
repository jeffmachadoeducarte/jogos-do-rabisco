// Rabiscolândia: o Rabisfone, o celular do jogo. Menu HTML com 9 apps (Casa, Garagem, Mapa, Dia/Noite, o Passaporte
// das missões, com os selos, o Meu Rabisco, que abre a tela de vestir o Rabisco, o Ateliê, com o saldo de Rabiscoins e a
// loja de visual, o Presente do dia, com o calendário de 7 dias do baú e a Missão do dia, e o Trabalhar, com as profissões
// curtas de profissoes.js) que dá para
// usar no toque, no mouse, no teclado (setas, Enter, Esc) e no controle (direcional, A confirma, B volta): os itens
// têm data-foco e o foco anda pela grade, como nos menus da casca.
//
//   const fone = criarRabifone(caixa, { aoGaragem(tipo, cor), aoHora(h), aoMapa(), aoMeuRabisco(), aoCasa(acao), infoCasa(),
//     presente() → { disponivel, voltou, pegoHoje, seq, pegos: [7], premios: [7], missao: { id, icone, titulo, extra, feita } | null }, aoPresente(acao) });
//   fone.abrir(); fone.fechar(); fone.navegar(dx, dy); fone.confirmar(); fone.voltar();

// Ícones da Garagem: vista de lado, chapados, contorno escuro arredondado e 2 tons (a cor do veículo e um tom mais escuro),
// desenhados aqui (nada de emoji: o 🚗 era vermelho e o carro é rosa). iconeVeiculo(tipo, cor) → <svg> na cor pedida.
const CONTORNO = "#1d2333", VIDRO = "#bfe9ff", PNEU = "#2b2f3a", ARO = "#dfe4ee";
const hex = (c) => `#${((c >>> 0) & 0xffffff).toString(16).padStart(6, "0")}`;
const tom = (c, f) => hex((Math.round(((c >> 16) & 255) * f) << 16) | (Math.round(((c >> 8) & 255) * f) << 8) | Math.round((c & 255) * f));
const roda = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${PNEU}"/><circle cx="${x}" cy="${y}" r="${(r * 0.45).toFixed(1)}" fill="${ARO}" stroke="none"/>`;
const ondas = `<path d="M4 37 q4 -3 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0" fill="none" stroke="#00b5f0" stroke-width="2.6"/>`;
const traco = (d, cor, w = 3.6) => `<path d="${d}" fill="none" stroke="${CONTORNO}" stroke-width="${w + 2.8}"/><path d="${d}" fill="none" stroke="${cor}" stroke-width="${w}"/>`;
const DESENHOS = {
  carro: (C, S) => `<rect x="22" y="13" width="6" height="7" rx="2.5" fill="${S}"/>
    <path d="M5 29 V24.5 Q5 20 10 19.5 L52 19 Q59 19.5 59 25 V29 Q59 31 57 31 H7 Q5 31 5 29 Z" fill="${C}"/>
    <path d="M6.2 26 H57.8 V29 Q57.8 29.8 57 29.8 H7 Q6.2 29.8 6.2 29 Z" fill="${S}" stroke="none"/>
    <path d="M33 19 L37 11.5 H39.5 L37 19 Z" fill="${VIDRO}"/><circle cx="56" cy="22.6" r="1.6" fill="#fff3b0" stroke="none"/>${roda(16, 30, 6)}${roda(48, 30, 6)}`,
  fusca: (C, S) => `<path d="M6 30 Q5 24 11 22.5 Q16 10 32 10 Q48 10 53 22.5 Q59 24 58 30 Q58 31 56.5 31 H7.5 Q6 31 6 30 Z" fill="${C}"/>
    <path d="M18.5 21.5 Q22 14 30.5 13.5 V21.5 Z M33.5 13.5 Q42 14 45.5 21.5 H33.5 Z" fill="${VIDRO}"/>
    <path d="M8 31 Q8 23 17 23 Q26 23 26 31 Z M38 31 Q38 23 47 23 Q56 23 56 31 Z" fill="${S}"/>${roda(17, 30, 5.6)}${roda(47, 30, 5.6)}`,
  f1: (C, S) => `<rect x="2.5" y="10" width="10" height="5" rx="1.5" fill="${S}"/><rect x="6" y="14.5" width="3" height="8" fill="${S}"/>
    <circle cx="32" cy="15.5" r="4.6" fill="#fff"/><path d="M29.5 15 H35.5" stroke="${CONTORNO}" stroke-width="2.4"/>
    <path d="M5 29 L6 21 Q6 19.5 8 19.5 H25 L28 17 H38 L42 20 L55 22.5 Q62 24 62 28 V29.5 H5 Z" fill="${C}"/>
    <path d="M20 24 H40" stroke="#fff" stroke-width="2.6"/>
    <rect x="49" y="28.5" width="13" height="3.5" rx="1.5" fill="${S}"/>${roda(15, 29, 7.5)}${roda(47, 29, 7.5)}`,
  onibus: (C, S) => `<rect x="4" y="8" width="56" height="22" rx="5" fill="${C}"/><rect x="5.1" y="23" width="53.8" height="3.5" fill="${S}" stroke="none"/>
    <rect x="8" y="12" width="9" height="7" rx="1.5" fill="${VIDRO}"/><rect x="20" y="12" width="9" height="7" rx="1.5" fill="${VIDRO}"/><rect x="32" y="12" width="9" height="7" rx="1.5" fill="${VIDRO}"/>
    <rect x="45" y="12" width="11" height="13" rx="1.5" fill="${VIDRO}"/>${roda(16, 30, 5.6)}${roda(48, 30, 5.6)}`,
  heli: (C, S) => `<rect x="9" y="5.5" width="46" height="3" rx="1.5" fill="${CONTORNO}" stroke="none"/><rect x="30" y="7" width="4" height="5" fill="${S}"/>
    <rect x="44" y="16" width="15" height="4.5" rx="2" fill="${S}"/><rect x="56" y="11" width="4" height="12" rx="2" fill="${C}"/>
    <path d="M12 21 Q12 12 26 12 H38 Q47 12 47 21 Q47 28 38 28 H22 Q12 28 12 21 Z" fill="${C}"/>
    <path d="M14.5 20 Q15.5 14.5 25 14.5 V20.5 Z" fill="${VIDRO}"/>
    <path d="M18 28 V33 M40 28 V33 M12 33.5 H46" fill="none" stroke="${CONTORNO}" stroke-width="2.6"/>`,
  je: (C, S) => `<path d="M5 29 V23.5 Q5 20 9 19 L16 18 L22 11 Q23 10 25 10 H44 Q46 10 47 12 L52 18 Q59 19 59 24 V29 Q59 31 57 31 H7 Q5 31 5 29 Z" fill="${C}"/>
    <path d="M6.2 25 H57.8 V29 Q57.8 29.8 57 29.8 H7 Q6.2 29.8 6.2 29 Z" fill="${S}" stroke="none"/>
    <path d="M19 18 L24 12.5 H33 V18 Z M36 12.5 H44.5 L49 18 H36 Z" fill="${VIDRO}"/>${roda(16, 30, 6)}${roda(48, 30, 6)}`,
  ambulancia: (C) => `<rect x="14" y="5" width="8" height="3.5" rx="1.5" fill="#2f8cff"/>
    <path d="M4 29 V12 Q4 8.5 7.5 8.5 H40 L48 16 L57 18.5 Q60 19.5 60 24 V29 Q60 31 58 31 H6 Q4 31 4 29 Z" fill="${C}"/>
    <rect x="5.1" y="22" width="53.8" height="3.5" fill="#e8413c" stroke="none"/><path d="M41 11.5 L46.5 17 H41 Z" fill="${VIDRO}"/>
    <path d="M21 11 h4 v3.5 h3.5 v4 h-3.5 v3.5 h-4 v-3.5 h-3.5 v-4 h3.5 Z" fill="#e8413c" stroke="none"/>${roda(15, 30, 5.6)}${roda(48, 30, 5.6)}`,
  bombeiro: (C, S) => `<rect x="6" y="6.5" width="36" height="5" rx="1.5" fill="#dfe4ee"/><path d="M12 7 V11 M18 7 V11 M24 7 V11 M30 7 V11 M36 7 V11" stroke="${CONTORNO}" stroke-width="1.6"/>
    <path d="M4 29 V14 Q4 12 6 12 H44 V16 H51 Q54 16 56 19 L59 23 Q60 24.5 60 26 V29 Q60 31 58 31 H6 Q4 31 4 29 Z" fill="${C}"/>
    <rect x="5.1" y="23" width="53.8" height="3" fill="#ffe066" stroke="none"/><path d="M46 18.5 H51 L54.5 22.5 H46 Z" fill="${VIDRO}"/>
    <rect x="9" y="15" width="30" height="5.5" rx="1.5" fill="${S}"/>${roda(15, 30, 5.6)}${roda(49, 30, 5.6)}`,
  sorvete: (C, S) => `<path d="M26 10 L30 3 L34 10 Z" fill="#e8a65a"/><circle cx="30" cy="4" r="3.6" fill="#fff"/>
    <path d="M4 29 V14 Q4 10 8 10 H44 L52 18 Q60 19 60 24 V29 Q60 31 58 31 H6 Q4 31 4 29 Z" fill="${C}"/>
    <path d="M8 14 H38 V20 H8 Z" fill="#fff"/><path d="M8 20 l3.75 3 l3.75 -3 l3.75 3 l3.75 -3 l3.75 3 l3.75 -3 l3.75 3 l3.75 -3" fill="none" stroke="${S}" stroke-width="2.4"/>
    <path d="M44 13.5 L49.5 19 H44 Z" fill="${VIDRO}"/>${roda(15, 30, 5.6)}${roda(48, 30, 5.6)}`,
  trator: (C, S) => `<rect x="47" y="10" width="3" height="9" rx="1" fill="${CONTORNO}" stroke="none"/>
    <path d="M8 23 V7 Q8 5 10 5 H27 Q29 5 29 7 V18 H54 Q58 18 58 22 V27 Q58 29 56 29 H8 Z" fill="${C}"/>
    <rect x="12" y="8.5" width="13" height="9" rx="1.5" fill="${VIDRO}"/><rect x="31" y="21" width="25" height="3" fill="${S}" stroke="none"/>
    ${roda(18, 27, 9.5)}${roda(50, 31, 5.5)}`,
  bici: (C) => `<circle cx="15" cy="27" r="9" fill="none" stroke="${CONTORNO}" stroke-width="3.4"/><circle cx="49" cy="27" r="9" fill="none" stroke="${CONTORNO}" stroke-width="3.4"/>
    ${traco("M15 27 L26 15 H43 L49 27 M26 15 L32 27 L43 15 M15 27 H32 M43 15 L41 9", C)}
    <rect x="21" y="10.5" width="9" height="3.5" rx="1.75" fill="${CONTORNO}" stroke="none"/><path d="M37 9 H45" stroke="${CONTORNO}" stroke-width="3"/>`,
  patinete: (C) => `${traco("M45 30 L51 7 M46 7.5 H56", C)}
    <rect x="9" y="27" width="38" height="5" rx="2.5" fill="${C}"/>${roda(14, 33, 4.6)}${roda(47, 33, 4.6)}`,
  moto: (C, S) => `<path d="M12 24 L21 16.5 L35 15.5 L44 11.5 L55 17.5 L52 25 L37 26.5 L29 30 L17 28.5 Z" fill="${C}"/>
    <path d="M44 11.5 L48.5 9 L51 14.5 Z" fill="${VIDRO}"/><path d="M22 16.5 Q27 12.5 34 15.5 Z" fill="${CONTORNO}"/>
    <path d="M27 21 L40 20 L36 25.5 L30 26 Z" fill="${S}"/>${roda(14, 29, 7.5)}${roda(50, 29, 7.5)}`,
  barco: (C, S) => `${traco("M41 8 L22 31", "#b9773f", 3)}
    <path d="M4 20 H60 L54 30.5 Q52.5 33 49 33 H15 Q11.5 33 10 30.5 Z" fill="${C}"/><rect x="5.6" y="21" width="52.8" height="3.5" fill="${S}" stroke="none"/>${ondas}`,
  jetski: (C, S) => `<path d="M38 13 L42 10 H46" fill="none" stroke="${CONTORNO}" stroke-width="3"/>
    <path d="M5 27 L22 22 H38 L44 18 Q52 18 60 25 L56 30.5 Q55 32 53 32 H9 Q5 32 5 28 Z" fill="${C}"/>
    <path d="M22 22 Q28 16.5 36 19 L38 22 Z" fill="${S}"/><rect x="6.5" y="27.5" width="50" height="2.6" fill="#fff" stroke="none" opacity=".9"/>${ondas}`,
  lancha: (C, S) => `<path d="M28 18 L34 9 H44 L46 18 Z" fill="${VIDRO}"/>
    <path d="M3 18 H63 L54 31 Q53 32.5 51 32.5 H10 Q6 32.5 5 29 Z" fill="${C}"/>
    <rect x="4.5" y="22" width="53" height="3" fill="#fff" stroke="none"/><rect x="8" y="14" width="18" height="4" rx="2" fill="${S}"/>${ondas}`,
};
export function iconeVeiculo(tipo, cor = 0xec2e8c) {
  const d = DESENHOS[tipo] ?? DESENHOS.carro;
  const S = (cor & 0xffffff) >= 0xf0f0f0 ? "#c3c9d4" : tom(cor, 0.74); // branco: o segundo tom vira prata
  return `<svg class="rf-veiculo" viewBox="0 0 64 40" aria-hidden="true" stroke="${CONTORNO}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${d(hex(cor), S)}</svg>`;
}
// ícones do aparelho (barra de status e botões de baixo), também desenhados aqui, em currentColor
const SVG = {
  sinal: `<svg viewBox="0 0 18 12" aria-hidden="true" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>`,
  bateria: `<svg viewBox="0 0 27 12" aria-hidden="true" fill="currentColor"><rect x="0.75" y="0.75" width="22" height="10.5" rx="3.2" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".5"/><rect x="2.8" y="2.8" width="15.5" height="6.4" rx="1.6"/><rect x="24" y="4" width="2.2" height="4" rx="1" opacity=".5"/></svg>`,
  voltar: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 L8 12 L14.5 18.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  inicio: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="5.5" width="13" height="13" rx="4.5" fill="none" stroke="currentColor" stroke-width="2.8"/></svg>`,
  fechar: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
};

const APPS = [
  { id: "casa", icone: "🏠", nome: "Casa", cor: "#ec2e8c" },
  { id: "garagem", icone: iconeVeiculo("carro", 0xec2e8c), nome: "Garagem", cor: "#00b5f0" },
  { id: "mapa", icone: "🗺️", nome: "Mapa", cor: "#58c43a" },
  { id: "hora", icone: "🌗", nome: "Dia/Noite", cor: "#8e6cff" },
  { id: "passaporte", icone: "📘", nome: "Passaporte", cor: "#ff7a00" },
  { id: "meurabisco", icone: "✏️", nome: "Meu Rabisco", cor: "#00b5f0" },
  { id: "atelie", icone: "🎨", nome: "Ateliê", cor: "#8e6cff" },
  { id: "presente", icone: "🎁", nome: "Presente", titulo: "Presente do dia", cor: "#ffcc1f" },
  { id: "album", icone: "📒", nome: "Álbum", titulo: "Álbum de figurinhas", cor: "#58c43a" },
  { id: "trabalhar", icone: "💼", nome: "Trabalhar", cor: "#2e9e57" },
  { id: "desafios", icone: "🏁", nome: "Desafios", cor: "#ff7a00" },
];
const VEICULOS = [
  { tipo: "carro", cor: 0xec2e8c, nome: "Carro rosa", emoji: "🚗" },
  { tipo: "fusca", cor: 0x00b5f0, nome: "Fusquinha azul", emoji: "🚙" },
  { tipo: "f1", cor: 0xff7a00, nome: "Fórmula Rabisco", emoji: "🏎️" },
  { tipo: "onibus", cor: 0xffcc1f, nome: "Ônibus da escola", emoji: "🚌" },
  { tipo: "heli", cor: 0x00b5f0, nome: "Helicóptero", emoji: "🚁" },
  { tipo: "je", cor: 0xf4f4f4, nome: "Carro da J.E", emoji: "🚙" },
  { tipo: "ambulancia", cor: 0xffffff, nome: "Ambulância", emoji: "🚑" },
  { tipo: "bombeiro", cor: 0xe8413c, nome: "Caminhão de bombeiro", emoji: "🚒" },
  { tipo: "sorvete", cor: 0xffb3d4, nome: "Van de sorvete", emoji: "🍦" },
  { tipo: "trator", cor: 0x3c9a4a, nome: "Trator", emoji: "🚜" },
  { tipo: "bici", cor: 0xec2e8c, nome: "Bicicleta", emoji: "🚲" },
  { tipo: "patinete", cor: 0x00b5f0, nome: "Patinete", emoji: "🛴" },
  { tipo: "moto", cor: 0xc8141c, nome: "Moto esportiva", emoji: "🏍️" },
  { tipo: "barco", cor: 0xffcc1f, nome: "Barquinho (no lago)", emoji: "🚣" },
  { tipo: "jetski", cor: 0xec2e8c, nome: "Jet ski (no mar)", emoji: "🌊" },
  { tipo: "lancha", cor: 0x2f6fc0, nome: "Lancha (no mar)", emoji: "🚤" },
];
const HORAS = [{ h: 8, nome: "Manhã", emoji: "🌅" }, { h: 13, nome: "Tarde", emoji: "☀️" }, { h: 18.6, nome: "Pôr do sol", emoji: "🌇" }, { h: 22, nome: "Noite", emoji: "🌙" }];

export function criarRabifone(onde, cb) {
  const raiz = document.createElement("div");
  raiz.className = "rabifone";
  raiz.hidden = true;
  raiz.innerHTML = `<div class="rf-aparelho" role="dialog" aria-label="Rabisfone"><div class="rf-topo"><span class="rf-hora"></span><b class="rf-ilha">Rabisfone</b><span class="rf-status">${SVG.sinal}${SVG.bateria}</span></div><div class="rf-tela"></div><div class="rf-botoes"><button class="rf-voltar" data-foco aria-label="Voltar">${SVG.voltar}</button><button class="rf-inicio" data-foco aria-label="Início">${SVG.inicio}</button><button class="rf-fechar" data-foco aria-label="Fechar">${SVG.fechar}</button></div></div>`;
  onde.append(raiz);
  const tela = raiz.querySelector(".rf-tela"), aparelho = raiz.querySelector(".rf-aparelho");
  let app = null, foco = null, aberto = false, saida = 0;
  // troca de tela com um fade/deslize curto (para a direita ao entrar num app, para a esquerda ao voltar ao início)
  const trocar = (id) => {
    aparelho.dataset.app = id ?? "inicio";
    tela.classList.remove("rf-troca", "rf-troca-volta"); void tela.offsetWidth;
    tela.classList.add(id ? "rf-troca" : "rf-troca-volta");
  };
  raiz.addEventListener("click", (e) => { if (e.target === raiz) api.fechar(); });
  raiz.querySelector(".rf-voltar").addEventListener("click", () => api.voltar());
  raiz.querySelector(".rf-inicio").addEventListener("click", () => mostrar(null));
  raiz.querySelector(".rf-fechar").addEventListener("click", () => api.fechar());

  const botao = (html, aoClicar, cls = "") => { const b = document.createElement("button"); b.className = `rf-item ${cls}`; b.setAttribute("data-foco", ""); b.innerHTML = html; b.addEventListener("click", (e) => { e.stopPropagation(); aoClicar(); }); return b; };
  function mostrar(id) {
    app = id;
    tela.replaceChildren();
    tela.dataset.app = id ?? "inicio";
    tela.scrollTop = 0;
    trocar(id);
    if (!id) {
      const grade = document.createElement("div"); grade.className = "rf-grade";
      const novo = cb.presente?.()?.disponivel; // bolinha no app quando o presente de hoje está esperando
      for (const a of APPS) grade.append(botao(`<span class="rf-icone" style="background-color:${a.cor}">${a.icone}${a.id === "presente" && novo ? '<i class="rf-bolinha" aria-label="presente esperando">1</i>' : ""}</span><span>${a.nome}</span>`, () => mostrar(a.id), "rf-app"));
      tela.append(grade);
    } else {
      const t = APPS.find((a) => a.id === id);
      const h = document.createElement("h3"); h.innerHTML = `<span class="rf-h-icone" style="background-color:${t.cor}">${t.icone}</span><span>${t.titulo ?? t.nome}</span>`; tela.append(h);
      const lista = document.createElement("div"); lista.className = "rf-lista"; tela.append(lista);
      if (id === "garagem") {
        const p = document.createElement("p"); p.textContent = "Escolha e ele aparece do seu lado!"; tela.insertBefore(p, lista);
        for (const v of [...(cb.veiculosExtra?.() ?? []), ...VEICULOS]) lista.append(botao(`<span class="rf-emoji rf-emoji-veiculo">${iconeVeiculo(v.tipo, v.cor)}</span><span>${v.nome}</span>`, () => { cb.aoGaragem?.(v.tipo, v.cor); api.fechar(); }, "rf-item-veiculo"));
      } else if (id === "hora") {
        for (const o of HORAS) lista.append(botao(`<span class="rf-emoji">${o.emoji}</span>${o.nome}`, () => { cb.aoHora?.(o.h); api.fechar(); }));
      } else if (id === "mapa") {
        cb.aoMapa?.(); api.fechar(); return;
      } else if (id === "atelie") {
        // Ateliê Ponta do Lápis: o saldo de Rabiscoins, abrir a loja e o caminho até o prédio (ao lado da praça)
        const p = document.createElement("p");
        p.innerHTML = `Você tem <b class="rf-moedas">${cb.saldo?.() ?? 0}</b> Rabiscoins. Ganhe mais ajudando nas missões!`;
        tela.insertBefore(p, lista);
        lista.append(botao(`<span class="rf-emoji">🛍️</span>Abrir a loja`, () => { api.fechar(); cb.aoAtelie?.("abrir"); }));
        lista.append(botao(`<span class="rf-emoji">🧭</span>Mostrar o caminho`, () => { cb.aoAtelie?.("caminho"); api.fechar(); }));
      } else if (id === "desafios") {
        const p = document.createElement("p"); p.textContent = "Corra contra o relógio e ganhe medalhas! Escolha para ver o caminho."; tela.insertBefore(p, lista);
        for (const d of cb.desafios?.() ?? []) lista.append(botao(`<span class="rf-emoji">${d.icone}</span><span class="rf-missao">${d.nome}<small>${d.melhor != null ? `Recorde ${d.melhor.toFixed(1)} s ${{ bronze: "🥉", prata: "🥈", ouro: "🥇" }[d.medalha] ?? ""}` : "Ainda sem recorde"}</small></span>`, () => { cb.aoDesafio?.(d.id); api.fechar(); }));
      } else if (id === "presente") {
        mostrarPresente(lista);
      } else if (id === "album") {
        cb.montarAlbum?.(tela, lista, { botao }); // Álbum de figurinhas (album-ui.js)
      } else if (id === "trabalhar") {
        mostrarTrabalho(lista);
      } else if (id === "meurabisco") {
        api.fechar(); cb.aoMeuRabisco?.(); return;
      } else if (id === "passaporte") {
        const { lista: ms = [], ativa } = cb.missoes?.() ?? {};
        const p = document.createElement("p");
        const n = ms.filter((m) => m.feita).length;
        p.innerHTML = `Selos: <b>${n} de ${ms.length}</b>. Quem tem <b class="rf-excl">!</b> em cima está pedindo ajuda.`;
        tela.insertBefore(p, lista);
        if (ativa) lista.append(botao(`<span class="rf-emoji">🛑</span>Largar a missão de agora`, () => { cb.aoMissao?.("largar"); api.fechar(); }));
        for (const m of ms) {
          const b = botao(`<span class="rf-emoji">${m.icone}</span><span class="rf-missao">${m.titulo}<small>${m.doDia ? `<b class="rf-dodia">⭐ Missão do dia · +${m.doDia} extra</b>` : m.tipo === "biblica" ? "📖 História da Bíblia" : "🏙️ Cidadania"}</small></span><span class="rf-selo${m.feita ? " feito" : ""}">${m.feita ? "✅" : m.id === ativa ? "▶️" : "🧭"}</span>`, () => { if (m.id !== ativa) cb.aoMissao?.("caminho", m.id); api.fechar(); }, "rf-item-missao");
          b.dataset.missao = m.id; if (m.doDia) b.classList.add("rf-item-dodia");
          lista.append(b);
        }
      } else if (id === "casa") {
        const info = cb.infoCasa?.() ?? {};
        const p = document.createElement("p");
        p.textContent = info.tem ? `Sua casa é a ${info.nome}. Que lar bonito!` : "Você ainda não tem casa. Vá ao Bairro das Casas e aperte “Morar aqui?” na frente da que você gostar!";
        tela.insertBefore(p, lista);
        if (info.tem) lista.append(botao(`<span class="rf-emoji">🏃</span>Ir para casa`, () => { cb.aoCasa?.("ir"); api.fechar(); }));
        if (info.tem) lista.append(botao(`<span class="rf-emoji">🎨</span>Cor da casa`, () => mostrarCores()));
        lista.append(botao(`<span class="rf-emoji">🧭</span>${info.tem ? "Mostrar o caminho" : "Ir ao Bairro das Casas"}`, () => { cb.aoCasa?.(info.tem ? "caminho" : "bairro"); api.fechar(); }));
      }
    }
    focar(tela.querySelector("[data-foco]"));
  }
  // Presente do dia: o calendário de 7 dias (o que já pegou nesta volta, o de hoje e os que faltam, com o bônus no 7º),
  // o caminho até o baú e a Missão do dia com o extra
  function mostrarPresente(lista) {
    const P = cb.presente?.() ?? {}, premios = P.premios ?? [];
    const p = document.createElement("p");
    p.textContent = P.disponivel ? `Seu presente de hoje está esperando! É o dia ${P.seq} de 7.` : P.pegoHoje ? "Presente de hoje aberto! Amanhã tem outro." : "Amanhã tem presente novo esperando por você!";
    tela.insertBefore(p, lista);
    const cal = document.createElement("div"); cal.className = "rf-dias"; cal.setAttribute("role", "list");
    premios.forEach((v, i) => {
      const hoje = P.disponivel && i === P.seq - 1, pego = P.pegos?.[i];
      const d = document.createElement("div");
      d.className = `rf-dia${pego ? " pego" : ""}${hoje ? " hoje" : ""}${i === 6 ? " sete" : ""}`;
      d.setAttribute("role", "listitem");
      d.dataset.dia = String(i + 1);
      d.setAttribute("aria-label", `Dia ${i + 1}: ${v} Rabiscoins${pego ? ", já pegou" : hoje ? ", é hoje" : ""}`);
      d.innerHTML = `<small>Dia ${i + 1}</small><span class="rf-dia-icone">${pego ? "✅" : hoje ? "🎁" : i === 6 ? "⭐" : "🔒"}</span><b>+${v}</b>`;
      cal.append(d);
    });
    tela.insertBefore(cal, lista);
    const dica = document.createElement("p"); dica.className = "rf-dica";
    dica.textContent = "Dias seguidos rendem mais. Faltou um dia? Tudo bem: recomeça do dia 1 e você não perde nada.";
    tela.insertBefore(dica, lista);
    if (P.disponivel) lista.append(botao(`<span class="rf-emoji">🧭</span>Mostrar o caminho do presente`, () => { cb.aoPresente?.("caminho"); api.fechar(); }));
    const M = P.missao;
    if (M) {
      const box = document.createElement("div"); box.className = "rf-md";
      box.innerHTML = `<b>⭐ Missão do dia</b><span>${M.icone} ${M.titulo}</span><small>${M.feita ? "✅ Feita hoje! Amanhã tem outra." : `+${M.extra} Rabiscoins extra na primeira vez hoje`}</small>`;
      lista.append(box);
      if (!M.feita) lista.append(botao(`<span class="rf-emoji">🧭</span>Ir para a Missão do dia`, () => { cb.aoMissao?.("caminho", M.id); api.fechar(); }));
    }
  }
  // Trabalhar (profissoes.js): as 3 profissões curtas, o que rende e, com turno ativo, o andamento e o botão de terminar
  //   cb.trabalho() → { ativa: { id, titulo, icone, feitas, total, ganhou } | null, lista: [{ id, titulo, icone, resumo, turnos, insta, rende }], bonus }
  function mostrarTrabalho(lista) {
    const W = cb.trabalho?.() ?? { lista: [] }, A = W.ativa;
    const p = document.createElement("p");
    p.innerHTML = A ? `${A.icone} <b>${A.titulo}</b>: ${A.feitas} de ${A.total} tarefas · <b class="rf-moedas">${A.ganhou}</b> Rabiscoins até agora.`
      : `Turnos curtinhos de faz de conta! Cada tarefa rende Rabiscoins e o turno completo dá <b>+${W.bonus}</b> de bônus.`;
    tela.insertBefore(p, lista);
    if (A) {
      lista.append(botao(`<span class="rf-emoji">🛑</span>Terminar o turno agora`, () => { cb.aoTrabalho?.("terminar"); api.fechar(); }));
      return;
    }
    for (const t of W.lista) {
      const b = botao(`<span class="rf-emoji">${t.icone}</span><span class="rf-missao">${t.titulo}<small>${t.resumo}${t.insta ? ` · @${t.insta}` : ""}</small></span><span class="rf-selo">${t.turnos ? `✅${t.turnos > 1 ? t.turnos : ""}` : "▶️"}</span>`, () => { api.fechar(); cb.aoTrabalho?.("comecar", t.id); }, "rf-item-missao");
      b.dataset.trabalho = t.id;
      lista.append(b);
    }
    const dica = document.createElement("p"); dica.className = "rf-dica";
    dica.textContent = "Também dá para começar no ponto 💼 ao lado da Speedy Soluções, do galpão da Marlon Máquinas e dos Bombeiros. Pode parar quando quiser: o que já fez fica com você.";
    lista.append(dica);
  }
  // paleta de cores da casa por fora
  function mostrarCores() {
    app = "cores";
    tela.replaceChildren();
    tela.scrollTop = 0;
    trocar("cores");
    const h = document.createElement("h3"); h.innerHTML = `<span class="rf-h-icone" style="background-color:#ec2e8c">🎨</span><span>Cor da casa</span>`; tela.append(h);
    const grade = document.createElement("div"); grade.className = "rf-grade rf-cores"; tela.append(grade);
    for (const cor of cb.coresCasa?.() ?? []) grade.append(botao(`<span class="rf-icone" style="background-color:#${cor.toString(16).padStart(6, "0")}"></span>`, () => { cb.aoCasa?.("cor", cor); api.fechar(); }, "rf-app"));
    focar(tela.querySelector("[data-foco]"));
  }
  function focar(el) {
    foco?.classList.remove("rf-foco");
    foco = el;
    if (el) { el.classList.add("rf-foco"); el.focus({ preventScroll: true }); }
  }
  const relogio = () => { const h = cb.hora?.() ?? 10; raiz.querySelector(".rf-hora").textContent = `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`; };
  const api = {
    raiz,
    get aberto() { return aberto; },
    get app() { return app; },
    // abre com escala + opacidade; ao fechar, o aparelho some do mesmo jeito (~0,18 s) e só então fica hidden
    abrir(id = null) { clearTimeout(saida); raiz.classList.remove("rf-saindo"); aberto = true; relogio(); raiz.hidden = false; mostrar(id); cb.aoAbrir?.(); },
    fechar() {
      if (!aberto) return;
      aberto = false; foco?.classList.remove("rf-foco"); foco = null;
      const reduz = matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduz) raiz.hidden = true;
      else { raiz.classList.add("rf-saindo"); clearTimeout(saida); saida = setTimeout(() => { if (!aberto) { raiz.hidden = true; raiz.classList.remove("rf-saindo"); } }, 180); }
      cb.aoFechar?.();
    },
    alternar() { api.aberto ? api.fechar() : api.abrir(); },
    voltar() { if (app) mostrar(null); else api.fechar(); },
    confirmar() { foco?.click(); },
    // anda o foco pela grade: pega o item mais perto na direção pedida
    navegar(dx, dy) {
      const itens = [...raiz.querySelectorAll("[data-foco]")].filter((e) => e.offsetParent !== null);
      if (!foco || !itens.includes(foco)) { focar(itens[0]); return; }
      const a = foco.getBoundingClientRect(), ax = a.x + a.width / 2, ay = a.y + a.height / 2;
      let melhor = null, dm = Infinity;
      for (const e of itens) {
        if (e === foco) continue;
        const b = e.getBoundingClientRect(), bx = b.x + b.width / 2 - ax, by = b.y + b.height / 2 - ay;
        const frente = bx * dx + by * dy;
        if (frente <= 4) continue;
        const d = frente + Math.abs(bx * dy - by * dx) * 2;
        if (d < dm) { dm = d; melhor = e; }
      }
      if (melhor) focar(melhor);
    },
  };
  return api;
}
