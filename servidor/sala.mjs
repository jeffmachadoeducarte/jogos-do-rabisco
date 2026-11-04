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
const MAX_FALHAS_CONEXAO = 3; // códigos errados por conexão: na 3ª a conexão é fechada
const MAX_INVALIDAS = 10; // mensagens fora do formato por conexão

// Limites por IP e globais. Generosos de propósito: uma escola/casa inteira pode sair pelo mesmo IP.
// O atacante que adivinha códigos (23^4 = 279.841) fica limitado a ~40 palpites por IP a cada 10 min.
const LIMITES = {
  conexoesGlobal: 2000, // conexões simultâneas no servidor todo
  conexoesPorIp: 60, // conexões simultâneas por IP
  novasPorMin: 120, // conexões novas por IP por minuto (janela deslizante)
  falhasPorJanela: 40, // palpites errados por IP na janela
  janelaFalhas: 10 * 60e3,
  bloqueio: 10 * 60e3, // quanto tempo o IP fica barrado ao estourar as falhas
  salasPorIp: 25, // salas abertas ao mesmo tempo por IP
  criadasPorJanela: 100, // salas criadas por IP na janela
  janelaCriadas: 10 * 60e3,
};
const NOME_MAX = 14;
// só letras (qualquer língua), espaço, apóstrofo e hífen: o mesmo que src/motor/nomes.js mostra na TV
const limparNome = (t) => String(t ?? '').normalize('NFC').replace(/[^\p{L}\p{M} '-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, NOME_MAX);
const ehObjeto = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const textoCurto = (t, max = 64) => typeof t === 'string' && t.length <= max;
const ID_CONTROLE = /^c\d{1,6}$/;

// O proxy do EasyPanel (Traefik) fica numa rede privada e põe o IP real à direita de X-Forwarded-For.
// Só confia no cabeçalho se a conexão vier de endereço de rede privada/loopback: de fora, é forjável.
const ehProxy = (a = '') => {
  const x = a.replace(/^::ffff:/, '');
  return x === '::1' || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|f[cd][0-9a-f]{2}:|fe80:)/i.test(x);
};
export function ipDe(req) {
  const direto = req.socket.remoteAddress || '?';
  const xff = req.headers['x-forwarded-for'];
  if (ehProxy(direto) && typeof xff === 'string') {
    const ult = xff.split(',').pop().trim();
    if (ult && ult.length <= 64) return ult;
  }
  return direto;
}

// Tempos em ms; TEMPO_ESCALA encolhe tudo (só para teste).
export function iniciar({ porta = Number(process.env.PORT) || 8090, origens = process.env.ORIGENS ?? '', escala = Number(process.env.TEMPO_ESCALA) || 1, log = true, limites = {} } = {}) {
  const L = { ...LIMITES, ...limites };
  const T = {
    host: 2 * 60e3 * escala, // host fora: sala expira
    vaga: 2 * 60e3 * escala, // vaga do controle guardada
    sala: 4 * 3600e3 * escala, // vida máxima da sala
    ping: 20e3 * escala,
    morto: 45e3 * escala,
  };
  const permitidas = origens.split(',').map((s) => s.trim()).filter(Boolean);
  const salas = new Map();
  const ips = new Map(); // ip -> { conexoes, novas: [t], falhas: [t], criadas: [t], bloqueadoAte }
  const estadoIp = (ip) => {
    let e = ips.get(ip);
    if (!e) ips.set(ip, e = { conexoes: 0, novas: [], falhas: [], criadas: [], bloqueadoAte: 0 });
    return e;
  };
  const recente = (lista, janela, agora) => { while (lista.length && agora - lista[0] > janela) lista.shift(); return lista.length; };
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
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const wss = new WebSocketServer({
    server,
    maxPayload: MAX_BYTES, // acima disso a conexão cai (1009)
    verifyClient: ({ origin, req }, resp) => {
      if (permitidas.length && !permitidas.includes(origin)) return resp(false, 401, 'origem');
      const agora = Date.now();
      const e = estadoIp(ipDe(req));
      if (agora < e.bloqueadoAte) return resp(false, 429, 'bloqueado');
      if (wss.clients.size >= L.conexoesGlobal) return resp(false, 503, 'cheio');
      if (e.conexoes >= L.conexoesPorIp) return resp(false, 429, 'conexoes');
      if (recente(e.novas, 60e3, agora) >= L.novasPorMin) return resp(false, 429, 'ritmo');
      e.novas.push(agora);
      resp(true);
    },
  });

  wss.on('connection', (ws, req) => {
    ws.ip = ipDe(req);
    estadoIp(ws.ip).conexoes++;
    ws.falhas = 0;
    ws.invalidas = 0;
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
      if (!ehObjeto(m) || !formatoOk(m)) {
        if (++ws.invalidas >= MAX_INVALIDAS) ws.close(1008, 'invalido');
        return;
      }
      tratar(ws, m);
    });
    ws.on('pong', () => { ws.ultimo = Date.now(); });
    ws.on('error', () => {});
    ws.on('close', () => { clearInterval(zera); estadoIp(ws.ip).conexoes--; saiu(ws); });
  });

  // Formato estrito de cada mensagem; o que não bate é descartado (e conta como inválida).
  function formatoOk(m) {
    switch (m.t) {
      case 'ping': case 'criar': return true;
      case 'voltarHost': return textoCurto(m.codigo, 8) && (m.token === undefined || textoCurto(m.token));
      case 'entrar': return textoCurto(m.codigo, 8) && (m.nome === undefined || typeof m.nome === 'string');
      case 'voltar': return textoCurto(m.codigo, 8) && textoCurto(m.id, 8) && (m.token === undefined || textoCurto(m.token));
      case 'in': return ehObjeto(m.d);
      case 'para': return (m.id === '*' || (typeof m.id === 'string' && ID_CONTROLE.test(m.id))) && ehObjeto(m.d);
      default: return false;
    }
  }

  // Palpite errado de código/token: por conexão (3 e fecha) e por IP (estourou, bloqueia por um tempo).
  function falhou(ws, motivo) {
    erro(ws, motivo);
    const agora = Date.now();
    const e = estadoIp(ws.ip);
    e.falhas.push(agora);
    if (recente(e.falhas, L.janelaFalhas, agora) >= L.falhasPorJanela) e.bloqueadoAte = agora + L.bloqueio;
    if (++ws.falhas >= MAX_FALHAS_CONEXAO || agora < e.bloqueadoAte) ws.close(1008, 'tentativas');
  }

  function tratar(ws, m) {
    switch (m.t) {
      case 'ping': return enviar(ws, { t: 'pong' });
      case 'criar': {
        if (ws.papel) return;
        if (salas.size >= MAX_SALAS) return erro(ws, 'servidor-cheio');
        const agora = Date.now();
        const e = estadoIp(ws.ip);
        let doIp = 0;
        for (const x of salas.values()) if (x.ip === ws.ip) doIp++;
        if (doIp >= L.salasPorIp || recente(e.criadas, L.janelaCriadas, agora) >= L.criadasPorJanela) return erro(ws, 'servidor-cheio');
        e.criadas.push(agora);
        const codigo = novoCodigo();
        const s = { codigo, ip: ws.ip, tokenHost: token(), host: ws, hostSaiu: 0, criada: Date.now(), controles: new Map(), proximo: 1 };
        salas.set(codigo, s);
        abertas++;
        ws.papel = 'host'; ws.sala = s;
        if (log) console.log(`sala aberta (abertas agora: ${salas.size}, total abertas: ${abertas}, fechadas: ${fechadas})`);
        return enviar(ws, { t: 'sala', codigo, token: s.tokenHost });
      }
      case 'voltarHost': {
        if (ws.papel) return;
        const s = codigoOk(m.codigo) && salas.get(m.codigo);
        if (!s || !igual(s.tokenHost, m.token ?? '')) return falhou(ws, 'sala-nao-existe');
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
        if (!codigoOk(m.codigo)) return falhou(ws, 'codigo-invalido');
        const s = salas.get(m.codigo);
        if (!s) return falhou(ws, 'sala-nao-existe');
        if (s.controles.size >= MAX_CONTROLES) return erro(ws, 'sala-cheia');
        const id = 'c' + s.proximo++;
        const nome = typeof m.nome === 'string' ? limparNome(m.nome) || undefined : undefined;
        const c = { token: token(), ws, nome, saiu: 0 };
        s.controles.set(id, c);
        ws.papel = 'controle'; ws.sala = s; ws.id = id;
        enviar(ws, { t: 'entrou', id, token: c.token });
        return enviar(s.host, { t: 'chegou', id, nome });
      }
      case 'voltar': {
        if (ws.papel) return;
        if (!codigoOk(m.codigo)) return falhou(ws, 'codigo-invalido');
        const s = salas.get(m.codigo);
        const c = s && s.controles.get(m.id);
        if (!c) return falhou(ws, 'sala-nao-existe');
        if (!igual(c.token, m.token ?? '')) return falhou(ws, 'token-invalido');
        if (c.ws && c.ws !== ws) { c.ws.sala = null; c.ws.close(1000, 'substituido'); }
        c.ws = ws; c.saiu = 0;
        ws.papel = 'controle'; ws.sala = s; ws.id = m.id;
        enviar(ws, { t: 'entrou', id: m.id, token: c.token });
        enviar(ws, s.host ? { t: 'host-voltou' } : { t: 'host-saiu' });
        return enviar(s.host, { t: 'chegou', id: m.id, nome: c.nome });
      }
      case 'in': {
        if (ws.papel !== 'controle' || !ws.sala) return;
        const d = m.d;
        if (typeof d.nome === 'string') d.nome = limparNome(d.nome); // texto livre que pode aparecer na TV
        else if ('nome' in d) delete d.nome;
        return enviar(ws.sala.host, { t: 'in', id: ws.id, d });
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
    for (const [ip, e] of ips) {
      if (e.conexoes <= 0 && agora >= e.bloqueadoAte && !recente(e.novas, 60e3, agora) && !recente(e.falhas, L.janelaFalhas, agora) && !recente(e.criadas, L.janelaCriadas, agora)) ips.delete(ip);
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
