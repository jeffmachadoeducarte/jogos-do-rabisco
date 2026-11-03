// Rabiscolândia: o Rabifone, o celular do jogo. Menu HTML com 9 apps (Casa, Garagem, Mapa, Dia/Noite, o Passaporte
// das missões, com os selos, o Meu Rabisco, que abre a tela de vestir o Rabisco, o Ateliê, com o saldo de Rabiscoins e a
// loja de visual, o Presente do dia, com o calendário de 7 dias do baú e a Missão do dia, e o Trabalhar, com as profissões
// curtas de profissoes.js) que dá para
// usar no toque, no mouse, no teclado (setas, Enter, Esc) e no controle (direcional, A confirma, B volta): os itens
// têm data-foco e o foco anda pela grade, como nos menus da casca.
//
//   const fone = criarRabifone(caixa, { aoGaragem(tipo, cor), aoHora(h), aoMapa(), aoMeuRabisco(), aoCasa(acao), infoCasa(),
//     presente() → { disponivel, voltou, pegoHoje, seq, pegos: [7], premios: [7], missao: { id, icone, titulo, extra, feita } | null }, aoPresente(acao) });
//   fone.abrir(); fone.fechar(); fone.navegar(dx, dy); fone.confirmar(); fone.voltar();

const APPS = [
  { id: "casa", icone: "🏠", nome: "Casa", cor: "#ec2e8c" },
  { id: "garagem", icone: "🚗", nome: "Garagem", cor: "#00b5f0" },
  { id: "mapa", icone: "🗺️", nome: "Mapa", cor: "#58c43a" },
  { id: "hora", icone: "🌗", nome: "Dia/Noite", cor: "#8e6cff" },
  { id: "passaporte", icone: "📘", nome: "Passaporte", cor: "#ff7a00" },
  { id: "meurabisco", icone: "✏️", nome: "Meu Rabisco", cor: "#00b5f0" },
  { id: "atelie", icone: "🎨", nome: "Ateliê", cor: "#8e6cff" },
  { id: "presente", icone: "🎁", nome: "Presente", titulo: "Presente do dia", cor: "#ffcc1f" },
  { id: "trabalhar", icone: "💼", nome: "Trabalhar", cor: "#2e9e57" },
];
const VEICULOS = [
  { tipo: "carro", cor: 0xec2e8c, nome: "Carro rosa", emoji: "🚗" },
  { tipo: "carro", cor: 0x00b5f0, nome: "Carro azul", emoji: "🚙" },
  { tipo: "carro", cor: 0xff7a00, nome: "Carro laranja", emoji: "🏎️" },
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
  raiz.innerHTML = `<div class="rf-aparelho" role="dialog" aria-label="Rabifone"><div class="rf-topo"><span class="rf-hora"></span><b>Rabifone</b><span>📶🔋</span></div><div class="rf-tela"></div><div class="rf-botoes"><button class="rf-voltar" data-foco aria-label="Voltar">◀</button><button class="rf-inicio" data-foco aria-label="Início">●</button><button class="rf-fechar" data-foco aria-label="Fechar">✕</button></div></div>`;
  onde.append(raiz);
  const tela = raiz.querySelector(".rf-tela");
  let app = null, foco = null;
  raiz.addEventListener("click", (e) => { if (e.target === raiz) api.fechar(); });
  raiz.querySelector(".rf-voltar").addEventListener("click", () => api.voltar());
  raiz.querySelector(".rf-inicio").addEventListener("click", () => mostrar(null));
  raiz.querySelector(".rf-fechar").addEventListener("click", () => api.fechar());

  const botao = (html, aoClicar, cls = "") => { const b = document.createElement("button"); b.className = `rf-item ${cls}`; b.setAttribute("data-foco", ""); b.innerHTML = html; b.addEventListener("click", (e) => { e.stopPropagation(); aoClicar(); }); return b; };
  function mostrar(id) {
    app = id;
    tela.replaceChildren();
    tela.dataset.app = id ?? "inicio";
    if (!id) {
      const grade = document.createElement("div"); grade.className = "rf-grade";
      const novo = cb.presente?.()?.disponivel; // bolinha no app quando o presente de hoje está esperando
      for (const a of APPS) grade.append(botao(`<span class="rf-icone" style="background:${a.cor}">${a.icone}${a.id === "presente" && novo ? '<i class="rf-bolinha" aria-label="presente esperando">1</i>' : ""}</span><span>${a.nome}</span>`, () => mostrar(a.id), "rf-app"));
      tela.append(grade);
    } else {
      const t = APPS.find((a) => a.id === id);
      const h = document.createElement("h3"); h.innerHTML = `${t.icone} ${t.titulo ?? t.nome}`; tela.append(h);
      const lista = document.createElement("div"); lista.className = "rf-lista"; tela.append(lista);
      if (id === "garagem") {
        const p = document.createElement("p"); p.textContent = "Escolha e ele aparece do seu lado!"; tela.insertBefore(p, lista);
        for (const v of [...(cb.veiculosExtra?.() ?? []), ...VEICULOS]) lista.append(botao(`<span class="rf-emoji">${v.emoji}</span>${v.nome}`, () => { cb.aoGaragem?.(v.tipo, v.cor); api.fechar(); }));
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
      } else if (id === "presente") {
        mostrarPresente(lista);
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
    const h = document.createElement("h3"); h.textContent = "🎨 Cor da casa"; tela.append(h);
    const grade = document.createElement("div"); grade.className = "rf-grade rf-cores"; tela.append(grade);
    for (const cor of cb.coresCasa?.() ?? []) grade.append(botao(`<span class="rf-icone" style="background:#${cor.toString(16).padStart(6, "0")}"></span>`, () => { cb.aoCasa?.("cor", cor); api.fechar(); }, "rf-app"));
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
    get aberto() { return !raiz.hidden; },
    get app() { return app; },
    abrir(id = null) { relogio(); raiz.hidden = false; mostrar(id); cb.aoAbrir?.(); },
    fechar() { if (raiz.hidden) return; raiz.hidden = true; foco = null; cb.aoFechar?.(); },
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
