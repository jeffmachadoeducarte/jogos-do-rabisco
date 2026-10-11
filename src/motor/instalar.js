// App instalável: registra o service worker e, no portal, pede para instalar os Jogos do Rabisco
// na tela inicial (abre em tela cheia, como um aplicativo, e funciona sem internet).
// Android/Chrome/Edge: botão "Instalar" que abre o pedido do próprio sistema.
// iPhone/iPad (Safari não tem esse pedido): passo a passo "Compartilhar → Adicionar à Tela de Início".
//
//   registrarApp();          // em todas as páginas (o service worker cuida do resto)
//   pedirInstalacao();       // no portal, assim que a pessoa entra

const RAIZ = new URL("../../", import.meta.url);
const CHAVE_ADIADO = "rabisco-instalar-adiado";

export function registrarApp() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  navigator.serviceWorker.register(new URL("sw.js", RAIZ), { scope: RAIZ.pathname }).catch(() => {});
}

export const jaInstalado = () => matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches || navigator.standalone === true;
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

let pedidoGuardado = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); pedidoGuardado = e; document.dispatchEvent(new Event("rabisco-pode-instalar")); });
addEventListener("appinstalled", () => { pedidoGuardado = null; document.querySelector(".instalar-app")?.remove(); });

const CSS = `
.instalar-app { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 16px; background: rgba(10, 42, 74, 0.5); }
.instalar-app .cartao { position: relative; max-width: 460px; width: 100%; background: #fff; border: 5px solid #151515; border-radius: 32px; box-shadow: 8px 10px 0 #151515;
  padding: 18px 22px 20px; font-family: "Baloo 2", system-ui, sans-serif; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.instalar-app img.icone { width: 96px; height: 96px; border-radius: 24px; box-shadow: 0 5px 0 #151515; border: 4px solid #151515; }
.instalar-app h2 { margin: 0; font-family: "Neulis Cursive", "Baloo 2", sans-serif; font-weight: 900; font-size: 34px; line-height: 1.05; color: #00b5f0; text-shadow: 3px 4px 0 #ec2e8c; }
.instalar-app p { margin: 0; font-size: 18px; font-weight: 700; color: #151515; }
.instalar-app ol { margin: 4px 0; padding-left: 0; list-style: none; text-align: left; font-size: 18px; font-weight: 700; display: flex; flex-direction: column; gap: 8px; }
.instalar-app ol li { display: flex; align-items: center; gap: 10px; }
.instalar-app ol b.n { flex: none; width: 32px; height: 32px; border-radius: 50%; background: #ffcc1f; border: 3px solid #151515; display: grid; place-items: center; }
.instalar-app .simbolo { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; background: #e8f4ff; border: 2px solid #1d6fe0; color: #1d6fe0; font-size: 20px; vertical-align: middle; }
.instalar-app .botoes { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 6px; }
.instalar-app button { font: 800 22px "Baloo 2", sans-serif; border: none; border-radius: 999px; padding: 6px 26px 10px; cursor: pointer; box-shadow: 0 6px 0 #151515; }
.instalar-app .sim { background: #ec2e8c; color: #fff; }
.instalar-app .nao { background: #fff; color: #151515; border: 3px solid #151515; }
.instalar-app .seta-ios { position: fixed; left: 50%; bottom: 6px; transform: translateX(-50%); font-size: 46px; animation: inst-seta 1s ease-in-out infinite; }
@keyframes inst-seta { 50% { transform: translate(-50%, 10px); } }
@media (max-height: 520px) { .instalar-app .cartao { padding: 10px 18px 14px; gap: 4px; } .instalar-app img.icone { width: 64px; height: 64px; } .instalar-app h2 { font-size: 26px; } .instalar-app p, .instalar-app ol { font-size: 15px; } }
`;

export function pedirInstalacao({ forcar = false } = {}) {
  if (jaInstalado()) return;
  try { if (!forcar && Date.now() - Number(localStorage.getItem(CHAVE_ADIADO) || 0) < 3 * 864e5) return; } catch { /* sem armazenamento */ }
  const mostrar = () => {
    if (document.querySelector(".instalar-app")) return;
    const estilo = document.createElement("style");
    estilo.textContent = CSS;
    document.head.append(estilo);
    const caixa = document.createElement("div");
    caixa.className = "instalar-app";
    caixa.setAttribute("role", "dialog");
    caixa.setAttribute("aria-label", "Instalar o app");
    const icone = new URL("assets/app/icone-192.png", RAIZ).href;
    let corpo;
    if (pedidoGuardado) {
      corpo = `<p>Instale no tablet ou no celular: abre em tela cheia, direto da tela inicial, e funciona até sem internet!</p>
        <div class="botoes"><button class="sim">📲 Instalar</button><button class="nao">Agora não</button></div>`;
    } else if (ehIOS()) {
      corpo = `<p>Coloque os jogos na tela inicial do ${/ipad|macintel/i.test(navigator.userAgent + navigator.platform) ? "iPad" : "iPhone"}:</p>
        <ol><li><b class="n">1</b> Toque em <span class="simbolo">⬆︎</span> Compartilhar</li>
        <li><b class="n">2</b> Escolha <b>“Adicionar à Tela de Início”</b></li>
        <li><b class="n">3</b> Toque em <b>Adicionar</b></li></ol>
        <div class="botoes"><button class="nao">Entendi</button></div>`;
    } else {
      if (!forcar && !("ontouchstart" in window || navigator.maxTouchPoints > 0)) return;
      corpo = `<p>Abra o menu do navegador <b>⋮</b> e escolha <b>“Instalar app”</b> ou <b>“Adicionar à tela inicial”</b>.</p>
        <div class="botoes"><button class="nao">Entendi</button></div>`;
    }
    caixa.innerHTML = `<div class="cartao"><img class="icone" src="${icone}" alt=""><h2>Jogos do Rabisco</h2>${corpo}</div>${ehIOS() && !pedidoGuardado ? '<div class="seta-ios" aria-hidden="true">⬇️</div>' : ""}`;
    document.body.append(caixa);
    const fechar = () => { caixa.remove(); try { localStorage.setItem(CHAVE_ADIADO, String(Date.now())); } catch { /* ok */ } };
    caixa.querySelector(".nao").addEventListener("click", fechar);
    caixa.querySelector(".sim")?.addEventListener("click", async () => {
      const p = pedidoGuardado;
      caixa.remove();
      if (!p) return;
      p.prompt();
      const { outcome } = await p.userChoice.catch(() => ({}));
      // instalou ou recusou: não pergunta de novo nos próximos dias (instalado, ele abre pelo ícone)
      try { localStorage.setItem(CHAVE_ADIADO, String(outcome === "accepted" ? Date.now() + 3650 * 864e5 : Date.now())); } catch { /* ok */ }
      pedidoGuardado = null;
    });
    (caixa.querySelector(".sim") || caixa.querySelector(".nao")).focus();
  };
  // o Chrome avisa que dá para instalar um pouquinho depois de abrir: espera esse aviso por até 2,5 s
  if (pedidoGuardado || ehIOS()) setTimeout(mostrar, 600);
  else {
    const t = setTimeout(mostrar, 2500);
    document.addEventListener("rabisco-pode-instalar", () => { clearTimeout(t); mostrar(); }, { once: true });
  }
}
