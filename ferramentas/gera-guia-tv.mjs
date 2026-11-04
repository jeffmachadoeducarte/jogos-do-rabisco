// Gera tv/guia.html (guia de 1 página para as famílias) a partir de src/motor/guia-tv-dados.js.
// Uso: node ferramentas/gera-guia-tv.mjs
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// o módulo é ES mas a pasta não declara "type": carrega por data: URL
const { TVS, CAMINHOS, DICAS, SITE } = await import("data:text/javascript;base64," + readFileSync(new URL("../src/motor/guia-tv-dados.js", import.meta.url)).toString("base64"));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const passos = (c) => `<ol>${c.passos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>${c.aviso ? `<p class="aviso">💡 ${esc(c.aviso)}</p>` : ""}`;
const bloco = (rot, c) => `<div class="via"><h3>${rot}</h3>${passos(c)}</div>`;

const cartoes = TVS.map((t) => {
  const c = CAMINHOS[t.id];
  const corpo = c.todos
    ? `<div class="via cheia"><h3>Qualquer aparelho</h3>${passos(c.todos)}</div>`
    : bloco("🍎 iPhone / iPad", c.ios) + bloco("🤖 Android", c.android);
  return `<section class="tv"><h2>${t.ic} ${esc(t.nome)}${t.sub ? ` <small>(${esc(t.sub)})</small>` : ""}</h2><div class="vias">${corpo}</div></section>`;
}).join("\n");

const dicas = DICAS.map((d) => `<div class="dica"><b>${d.ic} ${esc(d.titulo)}</b>${esc(d.texto)}</div>`).join("");

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#00b5f0">
<title>Jogar na TV - Jogos do Rabisco</title>
<link rel="icon" href="../assets/marca/logos/icone-rosa.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap" rel="stylesheet">
<style>
:root { --azul: #00b5f0; --rosa: #ec2e8c; --amarelo: #ffcc1f; --laranja: #ff7a00; --tinta: #151515; }
* { box-sizing: border-box; }
body { margin: 0; background: #eaf8ff; color: var(--tinta); font: 600 17px/1.35 "Baloo 2", ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif; }
.pagina { max-width: 900px; margin: 0 auto; padding: 16px; }
header { display: flex; align-items: center; gap: 14px; background: #fff; border: 4px solid var(--tinta); border-radius: 24px; box-shadow: 6px 7px 0 var(--tinta); padding: 10px 16px; }
header img { height: 52px; width: auto; flex: none; }
h1 { margin: 0; font-size: clamp(24px, 6vw, 36px); line-height: 1.05; }
h1 span { color: var(--rosa); }
.sub { margin: 14px 4px 10px; font-weight: 700; font-size: 18px; }
.tv { background: #fff; border: 4px solid var(--tinta); border-radius: 22px; box-shadow: 5px 6px 0 var(--tinta); padding: 10px 14px 12px; margin: 14px 0; break-inside: avoid; }
.tv h2 { margin: 0 0 6px; font-size: 24px; color: #fff; background: var(--azul); display: inline-block; border: 3px solid var(--tinta); border-radius: 999px; padding: 0 14px 2px; }
.vias { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tv h2 small { font-size: 0.7em; font-weight: 700; }
.via.cheia { grid-column: 1 / -1; }
.via h3 { margin: 4px 0 2px; font-size: 18px; }
ol { margin: 0; padding: 0; list-style: none; counter-reset: p; }
li { counter-increment: p; position: relative; padding: 2px 0 2px 36px; font-size: 16px; }
li::before { content: counter(p); position: absolute; left: 0; top: 2px; width: 26px; height: 26px; border-radius: 50%; background: var(--rosa); color: #fff; border: 2px solid var(--tinta); font: 800 15px/22px "Baloo 2", system-ui, sans-serif; text-align: center; }
.aviso { margin: 6px 0 0; background: #fff3c4; border: 2px dashed var(--tinta); border-radius: 12px; padding: 4px 9px; font-size: 14.5px; }
.dicas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0; }
.dica { background: #fff8d6; border: 3px solid var(--tinta); border-radius: 16px; padding: 7px 11px 9px; font-size: 14.5px; line-height: 1.25; }
.dica b { display: block; font-size: 16.5px; }
footer { text-align: center; font-weight: 800; font-size: 18px; margin: 16px 0 6px; }
footer a { color: var(--rosa); }
.botao { display: block; width: fit-content; margin: 8px auto; background: var(--rosa); color: #fff; text-decoration: none; font-weight: 800; font-size: 20px; border: 4px solid var(--tinta); border-radius: 18px; box-shadow: 0 5px 0 var(--tinta); padding: 6px 22px 8px; }
a:focus-visible { outline: 5px solid var(--amarelo); outline-offset: 3px; }
@media (max-width: 640px) { .vias, .dicas { grid-template-columns: 1fr; } header img { height: 42px; } }
@media print {
  @page { size: A4; margin: 8mm; }
  body { background: #fff; font-size: 9.5pt; line-height: 1.22; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pagina { max-width: none; padding: 0; }
  header { box-shadow: none; padding: 5px 12px; border-width: 3px; } header img { height: 34px; } h1 { font-size: 20pt; }
  .sub { margin: 6px 2px 4px; font-size: 10pt; }
  .tv { box-shadow: none; margin: 6px 0; padding: 4px 9px 6px; border-width: 3px; }
  .tv h2 { font-size: 12pt; margin-bottom: 2px; }
  .via h3 { font-size: 10pt; margin: 2px 0 1px; }
  li { font-size: 9pt; padding: 1px 0 1px 24px; } li::before { width: 17px; height: 17px; font-size: 8.5pt; line-height: 14px; top: 2px; }
  .aviso { font-size: 8.5pt; padding: 2px 6px; margin-top: 3px; }
  .dicas { margin: 6px 0; gap: 6px; } .dica { font-size: 8.5pt; padding: 3px 7px 4px; } .dica b { font-size: 9.5pt; }
  footer { margin: 6px 0 0; font-size: 11pt; } .botao { display: none; }
}
</style>
</head>
<body>
<main class="pagina">
  <header>
    <img src="../assets/marca/logos/azul-icone-rosa.svg" alt="Educarte Escola Cristã">
    <h1>Jogos do <span>Rabisco</span> na TV</h1>
  </header>
  <p class="sub">O jogo roda no celular e a TV só mostra a tela. Escolha a sua TV e siga os passos (3 ou 4, bem curtinhos).</p>
  ${cartoes}
  <div class="dicas">${dicas}</div>
  <a class="botao" href="../">Abrir o jogo</a>
  <footer>Jogue em <a href="https://${SITE}">${SITE}</a></footer>
</main>
</body>
</html>
`;
writeFileSync(fileURLToPath(new URL("../tv/guia.html", import.meta.url)), html);
console.log("tv/guia.html gerado");
