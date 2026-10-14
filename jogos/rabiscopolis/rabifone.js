// Rabiscolândia: o Rabifone, o celular do jogo. Menu HTML com 4 apps (Casa, Garagem, Mapa, Dia/Noite) que dá para
// usar no toque, no mouse, no teclado (setas, Enter, Esc) e no controle (direcional, A confirma, B volta): os itens
// têm data-foco e o foco anda pela grade, como nos menus da casca.
//
//   const fone = criarRabifone(caixa, { aoGaragem(tipo, cor), aoHora(h), aoMapa(), aoCasa(acao), infoCasa() });
//   fone.abrir(); fone.fechar(); fone.navegar(dx, dy); fone.confirmar(); fone.voltar();

const APPS = [
  { id: "casa", icone: "🏠", nome: "Casa", cor: "#ec2e8c" },
  { id: "garagem", icone: "🚗", nome: "Garagem", cor: "#00b5f0" },
  { id: "mapa", icone: "🗺️", nome: "Mapa", cor: "#58c43a" },
  { id: "hora", icone: "🌗", nome: "Dia/Noite", cor: "#8e6cff" },
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
  { tipo: "barco", cor: 0xffcc1f, nome: "Barquinho (no lago)", emoji: "🚣" },
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
      for (const a of APPS) grade.append(botao(`<span class="rf-icone" style="background:${a.cor}">${a.icone}</span><span>${a.nome}</span>`, () => mostrar(a.id), "rf-app"));
      tela.append(grade);
    } else {
      const t = APPS.find((a) => a.id === id);
      const h = document.createElement("h3"); h.innerHTML = `${t.icone} ${t.nome}`; tela.append(h);
      const lista = document.createElement("div"); lista.className = "rf-lista"; tela.append(lista);
      if (id === "garagem") {
        const p = document.createElement("p"); p.textContent = "Escolha e ele aparece do seu lado!"; tela.insertBefore(p, lista);
        for (const v of VEICULOS) lista.append(botao(`<span class="rf-emoji">${v.emoji}</span>${v.nome}`, () => { cb.aoGaragem?.(v.tipo, v.cor); api.fechar(); }));
      } else if (id === "hora") {
        for (const o of HORAS) lista.append(botao(`<span class="rf-emoji">${o.emoji}</span>${o.nome}`, () => { cb.aoHora?.(o.h); api.fechar(); }));
      } else if (id === "mapa") {
        cb.aoMapa?.(); api.fechar(); return;
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
