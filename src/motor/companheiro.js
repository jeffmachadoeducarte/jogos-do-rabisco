// Companheiro 2D: a criança cadastrada (src/motor/familia.js) como um bonequinho no traço do Rabisco,
// para os jogos 2D (canvas). Rosto redondo = a foto recortada em círculo; sem foto, carinha desenhada.
// Mesmo estilo de cores do companheiro 3D (lápis verde, short roxo, laço rosa).
//
//   import { criarCompanheiro } from "../../src/motor/companheiro.js";
//   const amigo = criarCompanheiro();            // null sem criança cadastrada
//   amigo.desenhar(ctx, x, y, escala, { passo: t * 6 });   // x, y = pés do boneco; escala 1 = 120 px de altura

const dadosCrianca = () => { try { return window.Familia?.crianca?.() || null; } catch { return null; } };

export function criarCompanheiro({ crianca = dadosCrianca(), cor = "#58c43a", corShort = "#8e6cff", corBone = "#ffcc1f" } = {}) {
  if (!crianca?.nome) return null;
  let img = null;
  if (crianca.foto) { img = new Image(); img.src = crianca.foto; }

  function desenhar(ctx, x, y, escala = 1, { passo = 0, virado = false, nome = false } = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(virado ? -escala : escala, escala);
    ctx.lineWidth = 4; ctx.strokeStyle = "#151515"; ctx.lineJoin = "round";
    const balanco = Math.sin(passo) * 6;
    // pernas e tênis
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#fce3c6";
      ctx.beginPath(); ctx.roundRect(s * 10 - 5, -28 + s * balanco * 0.3, 10, 24, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.roundRect(s * 10 - 9, -8 + s * balanco * 0.3, 18, 9, 5); ctx.fill(); ctx.stroke();
    }
    // short
    ctx.fillStyle = corShort;
    ctx.beginPath(); ctx.roundRect(-20, -46, 40, 22, 7); ctx.fill(); ctx.stroke();
    // lápis (corpo + cabeça), ponta e boné
    ctx.fillStyle = cor;
    ctx.beginPath(); ctx.roundRect(-19, -112, 38, 72, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = corBone;
    ctx.beginPath(); ctx.roundRect(-20, -120, 40, 10, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffe5cf";
    ctx.beginPath(); ctx.moveTo(-19, -120); ctx.lineTo(19, -120); ctx.lineTo(0, -140); ctx.closePath(); ctx.fill(); ctx.stroke();
    // laço
    ctx.fillStyle = "#ec2e8c";
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(12 + s * 7, -122, 7, 4, s * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // braços balançando
    ctx.fillStyle = "#fce3c6";
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 20, -98); ctx.rotate(s * 0.25 + Math.sin(passo + (s > 0 ? Math.PI : 0)) * 0.3);
      ctx.beginPath(); ctx.roundRect(-4, 0, 8, 30, 4); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    // rosto redondo: foto em círculo ou carinha
    const cy = -90, r = 15;
    ctx.save(); ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    if (img?.complete && img.naturalWidth) ctx.drawImage(img, -r, cy - r, r * 2, r * 2);
    else {
      ctx.fillStyle = "#fce3c6"; ctx.fillRect(-r, cy - r, r * 2, r * 2);
      ctx.fillStyle = "#151515";
      ctx.beginPath(); ctx.arc(-5, cy - 3, 2.4, 0, 7); ctx.arc(5, cy - 3, 2.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(0, cy + 2, 6, 0.3, Math.PI - 0.3); ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.stroke();
    if (nome) {
      ctx.font = "800 14px 'Baloo 2', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.strokeStyle = "#151515"; ctx.lineWidth = 3;
      ctx.strokeText(crianca.nome, 0, -148); ctx.fillText(crianca.nome, 0, -148);
    }
    ctx.restore();
  }
  return { crianca, temFoto: Boolean(crianca.foto), desenhar, altura: 140 };
}
