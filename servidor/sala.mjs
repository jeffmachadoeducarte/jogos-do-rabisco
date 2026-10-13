// Relay de salas dos Jogos do Rabisco: celular vira controle lendo um QR.
// Só repassa mensagens; nada em disco, nada de conteúdo no log.
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // sem I, O, L (e sem 0/1)
const MAX_BYTES = 2048;
const MAX_CONTROLES = 4;
const MAX_SALAS = 500;
const MAX_MSG_POR_S = 60;

// Tempos em ms; TEMPO_ESCALA encolhe tudo (só para teste).
export function iniciar({ porta = Number(process.env.PORT) || 8090, origens = process.env.ORIGENS ?? '', escala = Number(process.env.TEMPO_ESCALA) || 1, log = true } = {}) {
  const T = {
    host: 2 * 60e3 * escala, // host fora: sala expira
    vaga: 2 * 60e3 * escala, // vaga do controle guardada
    sala: 4 * 3600e3 * escala, // vida máxima da sala
    ping: 20e3 * escala,
    morto: 45e3 * escala,
  };
  const permitidas = origens.split(',').map((s) => s.trim()).filter(Boolean);
  const salas = new Map();
  let abertas = 0, fechadas = 0;

  const token = () => crypto.randomBytes(16).toString('hex');
  const igual = (a, b) => {
    const x = Buffer.from(String(a)), y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
  };
  const novoCodigo = () => {
    for (;;) {
      let c = '';
      for (let i = 0; i < 4; i++) c += ALFABETO[crypto.randomInt(ALFABETO.length)];
      if (!salas.has(c)) return c;
    }
  };
  const enviar = (ws, obj) => {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  };
  const erro = (ws, motivo) => enviar(ws, { t: 'erro', motivo });
  const codigoOk = (c) => typeof c === 'string' && /^[A-Z]{4}$/.test(c) && [...c].every((l) => ALFABETO.includes(l));

  function fecharSala(codigo) {
    const s = salas.get(codigo);
    if (!s) return;
    salas.delete(codigo);
    fechadas++;
    if (log) console.log(`sala fechada (abertas agora: ${salas.size}, total abertas: ${abertas}, fechadas: ${fechadas})`);
    for (const ws of [s.host, ...[...s.controles.values()].map((c) => c.ws)]) {
      if (ws) { ws.sala = null; ws.close(1000, 'sala-expirou'); }
    }
  }

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url.split('?')[0] === '/saude') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ ok: true, salas: salas.size }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const wss = new WebSocketServer({
    server,
    maxPayload: MAX_BYTES, // acima disso a conexão cai (1009)
    verifyClient: ({ origin }) => !permitidas.length || permitidas.includes(origin),
  });

  wss.on('connection', (ws) => {
    ws.viva = true;
    ws.ultimo = Date.now();
    ws.janela = 0; // contagem de mensagens no segundo atual
    ws.papel = null;
    ws.sala = null;
    ws.id = null;
    const zera = setInterval(() => { ws.janela = 0; }, 1000);

    ws.on('message', (bruto, binario) => {
      ws.ultimo = Date.now();
      if (binario || ++ws.janela > MAX_MSG_POR_S) return;
      let m;
      try { m = JSON.parse(bruto.toString()); } catch { return; }
      if (!m || typeof m !== 'object') return;
      tratar(ws, m);
    });
    ws.on('pong', () => { ws.ultimo = Date.now(); });
    ws.on('error', () => {});
    ws.on('close', () => { clearInterval(zera); saiu(ws); });
  });

  function tratar(ws, m) {
    switch (m.t) {
      case 'ping': return enviar(ws, { t: 'pong' });
      case 'criar': {
        if (ws.papel) return;
        if (salas.size >= MAX_SALAS) return erro(ws, 'servidor-cheio');
        const codigo = novoCodigo();
        const s = { codigo, tokenHost: token(), host: ws, hostSaiu: 0, criada: Date.now(), controles: new Map(), proximo: 1 };
        salas.set(codigo, s);
        abertas++;
        ws.papel = 'host'; ws.sala = s;
        if (log) console.log(`sala aberta (abertas agora: ${salas.size}, total abertas: ${abertas}, fechadas: ${fechadas})`);
        return enviar(ws, { t: 'sala', codigo, token: s.tokenHost });
      }
      case 'voltarHost': {
        if (ws.papel) return;
        const s = codigoOk(m.codigo) && salas.get(m.codigo);
        if (!s || !igual(s.tokenHost, m.token ?? '')) return erro(ws, 'sala-nao-existe');
        if (s.host && s.host !== ws) { s.host.sala = null; s.host.close(1000, 'substituido'); }
        s.host = ws; s.hostSaiu = 0;
        ws.papel = 'host'; ws.sala = s;
        enviar(ws, { t: 'sala', codigo: s.codigo, token: s.tokenHost });
        // host novo precisa saber quem está na sala
        for (const [id, c] of s.controles) if (c.ws) enviar(ws, { t: 'chegou', id, nome: c.nome });
        for (const c of s.controles.values()) enviar(c.ws, { t: 'host-voltou' });
        return;
      }
      case 'entrar': {
        if (ws.papel) return;
        if (!codigoOk(m.codigo)) return erro(ws, 'codigo-invalido');
        const s = salas.get(m.codigo);
        if (!s) return erro(ws, 'sala-nao-existe');
        if (s.controles.size >= MAX_CONTROLES) return erro(ws, 'sala-cheia');
        const id = 'c' + s.proximo++;
        const nome = typeof m.nome === 'string' ? m.nome.slice(0, 30) : undefined;
        const c = { token: token(), ws, nome, saiu: 0 };
        s.controles.set(id, c);
        ws.papel = 'controle'; ws.sala = s; ws.id = id;
        enviar(ws, { t: 'entrou', id, token: c.token });
        return enviar(s.host, { t: 'chegou', id, nome });
      }
      case 'voltar': {
        if (ws.papel) return;
        if (!codigoOk(m.codigo)) return erro(ws, 'codigo-invalido');
        const s = salas.get(m.codigo);
        const c = s && s.controles.get(m.id);
        if (!c) return erro(ws, 'sala-nao-existe');
        if (!igual(c.token, m.token ?? '')) return erro(ws, 'token-invalido');
        if (c.ws && c.ws !== ws) { c.ws.sala = null; c.ws.close(1000, 'substituido'); }
        c.ws = ws; c.saiu = 0;
        ws.papel = 'controle'; ws.sala = s; ws.id = m.id;
        enviar(ws, { t: 'entrou', id: m.id, token: c.token });
        enviar(ws, s.host ? { t: 'host-voltou' } : { t: 'host-saiu' });
        return enviar(s.host, { t: 'chegou', id: m.id, nome: c.nome });
      }
      case 'in': {
        if (ws.papel !== 'controle' || !ws.sala) return;
        return enviar(ws.sala.host, { t: 'in', id: ws.id, d: m.d });
      }
      case 'para': {
        if (ws.papel !== 'host' || !ws.sala) return;
        const msg = { t: 'do-host', d: m.d };
        if (m.id === '*') for (const c of ws.sala.controles.values()) enviar(c.ws, msg);
        else enviar(ws.sala.controles.get(m.id)?.ws, msg);
      }
    }
  }

  function saiu(ws) {
    const s = ws.sala;
    if (!s) return;
    if (ws.papel === 'host' && s.host === ws) {
      s.host = null; s.hostSaiu = Date.now();
      for (const c of s.controles.values()) enviar(c.ws, { t: 'host-saiu' });
    } else if (ws.papel === 'controle') {
      const c = s.controles.get(ws.id);
      if (c && c.ws === ws) {
        c.ws = null; c.saiu = Date.now();
        enviar(s.host, { t: 'saiu', id: ws.id });
      }
    }
  }

  // Varredura: ping de protocolo, conexões mudas e expiração de salas/vagas.
  const passo = Math.max(10, Math.min(5000, T.ping / 2));
  let ultimoPing = 0;
  const varredor = setInterval(() => {
    const agora = Date.now();
    const pingar = agora - ultimoPing >= T.ping;
    if (pingar) ultimoPing = agora;
    for (const ws of wss.clients) {
      if (agora - ws.ultimo > T.morto) { ws.terminate(); continue; }
      if (pingar && ws.readyState === 1) ws.ping();
    }
    for (const [codigo, s] of salas) {
      if (agora - s.criada > T.sala || (!s.host && agora - s.hostSaiu > T.host)) { fecharSala(codigo); continue; }
      for (const [id, c] of s.controles) if (!c.ws && agora - c.saiu > T.vaga) s.controles.delete(id);
    }
  }, passo);

  return new Promise((ok) => {
    server.listen(porta, () => {
      if (log) console.log(`servidor de salas na porta ${server.address().port}`);
      ok({
        porta: server.address().port,
        parar: () => new Promise((fim) => {
          clearInterval(varredor);
          for (const ws of wss.clients) ws.terminate();
          wss.close(() => server.close(() => fim()));
        }),
      });
    });
  });
}

// Roda direto (node sala.mjs); importado pelo teste não sobe nada.
if (process.argv[1] === fileURLToPath(import.meta.url)) iniciar();
