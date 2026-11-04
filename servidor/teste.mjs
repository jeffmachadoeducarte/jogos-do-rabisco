// Teste do relay: node --test teste.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { iniciar, ipDe } from './sala.mjs';
import { montarCsv } from './cadastro.mjs';

let srv, url, dirDados;
const TOKEN = 'token-de-teste-bem-longo-123456';
const abertos = [];

before(async () => {
  dirDados = fs.mkdtempSync(path.join(os.tmpdir(), 'sala-'));
  srv = await iniciar({ porta: 0, origens: '', escala: 0.01, log: false, dataDir: dirDados, adminToken: TOKEN, limites: { cadastrosPorJanela: 100000 } }); // 2 min viram 1,2 s
  url = `ws://127.0.0.1:${srv.porta}`;
});
after(async () => { abertos.forEach((w) => w.terminate()); await srv.parar(); fs.rmSync(dirDados, { recursive: true, force: true }); });

// Cliente com fila de mensagens e espera por tipo.
async function cliente() {
  const ws = new WebSocket(url);
  ws.fila = [];
  ws.fechou = new Promise((ok) => ws.on('close', (c) => ok(c)));
  ws.on('message', (b) => ws.fila.push(JSON.parse(b.toString())));
  abertos.push(ws);
  await new Promise((ok, no) => { ws.on('open', ok); ws.on('error', no); });
  ws.mandar = (o) => ws.send(JSON.stringify(o));
  ws.espera = async (t, ms = 3000) => {
    const fim = Date.now() + ms;
    for (;;) {
      const i = ws.fila.findIndex((m) => m.t === t);
      if (i >= 0) return ws.fila.splice(i, 1)[0];
      if (Date.now() > fim) throw new Error(`timeout esperando ${t}; fila=${JSON.stringify(ws.fila)}`);
      await new Promise((r) => setTimeout(r, 5));
    }
  };
  return ws;
}
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function novaSala() {
  const host = await cliente();
  host.mandar({ t: 'criar' });
  const sala = await host.espera('sala');
  return { host, ...sala };
}
async function entra(codigo, nome = 'Ana') {
  const c = await cliente();
  c.mandar({ t: 'entrar', codigo, nome });
  const e = await c.espera('entrou');
  return { c, ...e };
}

test('/saude responde', async () => {
  const r = await fetch(`http://127.0.0.1:${srv.porta}/saude`);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.ok, true);
  assert.deepEqual(j, { ok: true }); // sem contagem de salas
});

test('criar sala: código de 4 letras sem ambíguas e token', async () => {
  const { codigo, token } = await novaSala();
  assert.match(codigo, /^[ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
  assert.ok(token.length >= 16);
});

test('controle entra, host recebe chegou; repasse in e para (incl. *)', async () => {
  const { host, codigo } = await novaSala();
  const { c, id } = await entra(codigo, 'Alice');
  assert.equal(id, 'c1');
  assert.deepEqual(await host.espera('chegou'), { t: 'chegou', id: 'c1', nome: 'Alice' });
  c.mandar({ t: 'in', d: { x: 1, pulo: true } });
  assert.deepEqual(await host.espera('in'), { t: 'in', id: 'c1', d: { x: 1, pulo: true } });
  host.mandar({ t: 'para', id: 'c1', d: { vibrar: 50 } });
  assert.deepEqual(await c.espera('do-host'), { t: 'do-host', d: { vibrar: 50 } });
  const { c: c2 } = await entra(codigo, 'Bia');
  host.mandar({ t: 'para', id: '*', d: { msg: 'oi' } });
  assert.equal((await c.espera('do-host')).d.msg, 'oi');
  assert.equal((await c2.espera('do-host')).d.msg, 'oi');
  c.mandar({ t: 'ping' });
  assert.equal((await c.espera('pong')).t, 'pong');
});

test('código inválido e sala inexistente dão erro', async () => {
  const a = await cliente();
  a.mandar({ t: 'entrar', codigo: 'AB1' });
  assert.deepEqual(await a.espera('erro'), { t: 'erro', motivo: 'codigo-invalido' });
  const b = await cliente();
  b.mandar({ t: 'entrar', codigo: 'ZZZZ' });
  assert.deepEqual(await b.espera('erro'), { t: 'erro', motivo: 'sala-nao-existe' });
  const h = await cliente();
  h.mandar({ t: 'voltarHost', codigo: 'ZZZZ', token: 'x' });
  assert.deepEqual(await h.espera('erro'), { t: 'erro', motivo: 'sala-nao-existe' });
});

test('sala cheia no 5º controle', async () => {
  const { codigo } = await novaSala();
  for (let i = 0; i < 4; i++) await entra(codigo, 'c' + i);
  const extra = await cliente();
  extra.mandar({ t: 'entrar', codigo });
  assert.deepEqual(await extra.espera('erro'), { t: 'erro', motivo: 'sala-cheia' });
});

test('controle cai: host recebe saiu; voltar com token mantém id', async () => {
  const { host, codigo } = await novaSala();
  const { c, id, token } = await entra(codigo);
  await host.espera('chegou');
  c.terminate();
  assert.deepEqual(await host.espera('saiu'), { t: 'saiu', id });
  const c2 = await cliente();
  c2.mandar({ t: 'voltar', codigo, id, token });
  const e = await c2.espera('entrou');
  assert.equal(e.id, id);
  assert.equal(e.token, token);
  assert.equal((await host.espera('chegou')).id, id);
  c2.mandar({ t: 'in', d: { seq: 1 } });
  assert.equal((await host.espera('in')).id, id);
});

test('token errado é recusado', async () => {
  const { host, codigo, token } = await novaSala();
  const { id } = await entra(codigo);
  const c = await cliente();
  c.mandar({ t: 'voltar', codigo, id, token: 'errado' });
  assert.equal((await c.espera('erro')).t, 'erro');
  const h = await cliente();
  h.mandar({ t: 'voltarHost', codigo, token: 'errado' });
  assert.deepEqual(await h.espera('erro'), { t: 'erro', motivo: 'sala-nao-existe' });
  // o host verdadeiro segue intacto
  host.mandar({ t: 'ping' });
  await host.espera('pong');
  assert.ok(token);
});

test('host cai: controles recebem host-saiu; voltarHost gera host-voltou', async () => {
  const { host, codigo, token } = await novaSala();
  const { c } = await entra(codigo);
  host.terminate();
  assert.equal((await c.espera('host-saiu')).t, 'host-saiu');
  const h2 = await cliente();
  h2.mandar({ t: 'voltarHost', codigo, token });
  assert.equal((await h2.espera('sala')).codigo, codigo);
  assert.equal((await c.espera('host-voltou')).t, 'host-voltou');
  assert.equal((await h2.espera('chegou')).id, 'c1');
});

test('host fora por mais de 2 min (escalado): sala expira', async () => {
  const { host, codigo, token } = await novaSala();
  host.terminate();
  await pausa(1800);
  const h = await cliente();
  h.mandar({ t: 'voltarHost', codigo, token });
  assert.deepEqual(await h.espera('erro'), { t: 'erro', motivo: 'sala-nao-existe' });
});

test('mensagem acima de 2 KB derruba a conexão', async () => {
  const { host } = await novaSala();
  host.mandar({ t: 'para', id: '*', d: { lixo: 'x'.repeat(3000) } });
  assert.equal(await host.fechou, 1009);
});

// ---- limites e validação (A1 da auditoria) ----

// Cliente que passa X-Forwarded-For (vale porque a conexão vem de loopback, que conta como proxy).
function clienteDe(porta, ip) {
  const ws = new WebSocket(`ws://127.0.0.1:${porta}`, { headers: { 'x-forwarded-for': ip } });
  ws.fila = [];
  ws.on('message', (b) => ws.fila.push(JSON.parse(b.toString())));
  ws.fechou = new Promise((ok) => ws.on('close', (c) => ok(c)));
  abertos.push(ws);
  ws.aberto = new Promise((ok, no) => {
    ws.on('open', () => ok(ws));
    ws.on('unexpected-response', (_q, r) => no(Object.assign(new Error('http ' + r.statusCode), { status: r.statusCode })));
    ws.on('error', no);
  });
  ws.aberto.catch(() => {});
  ws.mandar = (o) => ws.send(JSON.stringify(o));
  return ws;
}

test('3 códigos errados na mesma conexão: a conexão é fechada (1008)', async () => {
  const c = await cliente();
  c.mandar({ t: 'entrar', codigo: 'ZZZZ' });
  c.mandar({ t: 'entrar', codigo: 'ZZZY' });
  await pausa(80);
  assert.equal(c.readyState, 1, 'após 2 erros ainda aberta');
  c.mandar({ t: 'entrar', codigo: 'ZZZX' });
  assert.equal(await c.fechou, 1008);
  assert.equal(c.fila.filter((m) => m.t === 'erro').length, 3);
});

test('tokens errados em voltar também contam para as 3 tentativas', async () => {
  const { codigo } = await novaSala();
  const c = await cliente();
  for (let i = 0; i < 3; i++) c.mandar({ t: 'voltar', codigo, id: 'c1', token: 'x' + i });
  assert.equal(await c.fechou, 1008);
});

test('acerto depois de 2 erros ainda entra', async () => {
  const { codigo } = await novaSala();
  const c = await cliente();
  c.mandar({ t: 'entrar', codigo: 'ZZZZ' });
  c.mandar({ t: 'entrar', codigo: 'ZZZY' });
  await c.espera('erro');
  c.mandar({ t: 'entrar', codigo });
  assert.equal((await c.espera('entrou')).id, 'c1');
});

test('muitas falhas do mesmo IP: IP bloqueado (429); outro IP segue livre', async () => {
  const s = await iniciar({ porta: 0, origens: '', escala: 0.01, log: false, limites: { falhasPorJanela: 4 } });
  try {
    for (let i = 0; i < 2; i++) {
      const c = clienteDe(s.porta, '203.0.113.7');
      await c.aberto;
      c.mandar({ t: 'entrar', codigo: 'ZZZZ' });
      c.mandar({ t: 'entrar', codigo: 'ZZZY' });
      if (i === 0) { await pausa(80); c.terminate(); }
      else await c.fechou; // na 4ª falha o IP é bloqueado e a conexão cai
    }
    await assert.rejects(clienteDe(s.porta, '203.0.113.7').aberto, (e) => e.status === 429);
    const outro = clienteDe(s.porta, '203.0.113.8');
    await outro.aberto;
    outro.mandar({ t: 'criar' });
    await pausa(80);
    assert.equal(outro.fila[0]?.t, 'sala');
  } finally { await s.parar(); }
});

test('limite de conexões simultâneas por IP', async () => {
  const s = await iniciar({ porta: 0, origens: '', log: false, limites: { conexoesPorIp: 3 } });
  try {
    for (let i = 0; i < 3; i++) await clienteDe(s.porta, '198.51.100.1').aberto;
    await assert.rejects(clienteDe(s.porta, '198.51.100.1').aberto, (e) => e.status === 429);
    await clienteDe(s.porta, '198.51.100.2').aberto;
  } finally { await s.parar(); }
});

test('teto global de conexões responde 503', async () => {
  const s = await iniciar({ porta: 0, origens: '', log: false, limites: { conexoesGlobal: 2 } });
  try {
    await clienteDe(s.porta, '198.51.100.1').aberto;
    await clienteDe(s.porta, '198.51.100.2').aberto;
    await assert.rejects(clienteDe(s.porta, '198.51.100.3').aberto, (e) => e.status === 503);
  } finally { await s.parar(); }
});

test('limite de salas por IP', async () => {
  const s = await iniciar({ porta: 0, origens: '', log: false, limites: { salasPorIp: 2 } });
  try {
    const abre = async (ip) => { const c = clienteDe(s.porta, ip); await c.aberto; c.mandar({ t: 'criar' }); await pausa(80); return c.fila[0]; };
    assert.equal((await abre('192.0.2.1')).t, 'sala');
    assert.equal((await abre('192.0.2.1')).t, 'sala');
    assert.deepEqual(await abre('192.0.2.1'), { t: 'erro', motivo: 'servidor-cheio' });
    assert.equal((await abre('192.0.2.2')).t, 'sala');
  } finally { await s.parar(); }
});

test('IP: X-Forwarded-For só vale vindo de proxy de rede privada', () => {
  const req = (remoto, xff) => ({ socket: { remoteAddress: remoto }, headers: xff ? { 'x-forwarded-for': xff } : {} });
  assert.equal(ipDe(req('10.0.1.5', '1.2.3.4, 5.6.7.8')), '5.6.7.8'); // o mais à direita foi posto pelo proxy
  assert.equal(ipDe(req('::ffff:172.18.0.2', '9.9.9.9')), '9.9.9.9');
  assert.equal(ipDe(req('8.8.8.8', '1.1.1.1')), '8.8.8.8'); // de fora o cabeçalho é forjável: ignorado
  assert.equal(ipDe(req('10.0.1.5')), '10.0.1.5');
});

test('mensagens fora do formato são ignoradas; 10 delas derrubam a conexão', async () => {
  const { host, codigo } = await novaSala();
  const { c } = await entra(codigo);
  await host.espera('chegou');
  c.mandar({ t: 'in', d: 'texto' }); // d precisa ser objeto
  c.mandar({ t: 'in', d: [1] });
  c.mandar({ t: 'qualquer' });
  c.mandar({ t: 'in', d: { x: 1 } });
  assert.deepEqual((await host.espera('in')).d, { x: 1 }); // só a válida chegou
  await pausa(50);
  assert.equal(host.fila.filter((m) => m.t === 'in').length, 0);
  const ruim = await cliente();
  ruim.send('isso nao e json');
  ruim.send(JSON.stringify([1, 2]));
  for (let i = 0; i < 10; i++) ruim.mandar({ t: 'entrar', codigo: { x: 1 } });
  assert.equal(await ruim.fechou, 1008);
});

test('host só repassa "para" com id válido e d objeto', async () => {
  const { host, codigo } = await novaSala();
  const { c } = await entra(codigo);
  host.mandar({ t: 'para', id: 'c1', d: 'x' });
  host.mandar({ t: 'para', id: { a: 1 }, d: {} });
  host.mandar({ t: 'para', id: 'c1', d: { ok: 1 } });
  assert.deepEqual((await c.espera('do-host')).d, { ok: 1 });
  await pausa(50);
  assert.equal(c.fila.filter((m) => m.t === 'do-host').length, 0);
});

test('nome do controle (texto que aparece na TV) é higienizado: só letras, 14 caracteres', async () => {
  const { host, codigo } = await novaSala();
  const c = await cliente();
  c.mandar({ t: 'entrar', codigo, nome: '<img src=x onerror=1>João Pedro da Silva Santos' });
  await c.espera('entrou');
  const ch = await host.espera('chegou');
  assert.match(ch.nome, /^[\p{L}\p{M} '-]{1,14}$/u);
  c.mandar({ t: 'in', d: { x: 0, nome: '<b>Zé</b>' + 'a'.repeat(40) } });
  const i = await host.espera('in');
  assert.match(i.d.nome, /^[\p{L}\p{M} '-]{1,14}$/u);
  c.mandar({ t: 'in', d: { x: 0, nome: 123 } });
  assert.equal('nome' in (await host.espera('in')).d, false);
});

// ---------- Cadastro das famílias ----------
const ORIGEM = 'https://jogos.educarte.qzz.io';
const base = () => `http://127.0.0.1:${srv.porta}`;
const novoId = () => crypto.randomUUID();
const novoSegredo = () => crypto.randomBytes(24).toString('hex');
const corpo = (o = {}) => ({
  id: novoId(), segredo: novoSegredo(),
  responsavel: { nome: 'Maria Souza', telefone: '+55 (11) 99999-1234', email: 'maria@exemplo.com' },
  criancas: [{ nome: 'Ana', nascimento: '2018-05-10' }],
  consentimento: { privacidade: true, versao: '2026-11', em: '2026-11-06T12:00:00Z' },
  marketing: { aceito: true, em: '2026-11-06T12:00:00Z' },
  ...o,
});
const post = (c, { origin = ORIGEM, b = base(), tipo = 'application/json' } = {}) =>
  fetch(`${b}/cadastro`, { method: 'POST', headers: { 'content-type': tipo, ...(origin && { origin }) }, body: typeof c === 'string' ? c : JSON.stringify(c) });
const apaga = (id, segredo, origin = ORIGEM, b = base()) =>
  fetch(`${b}/cadastro/${id}`, { method: 'DELETE', headers: { ...(origin && { origin }), ...(segredo && { 'x-segredo': segredo }) } });
const admin = (ext, token = TOKEN, q = '', b = base()) =>
  fetch(`${b}/admin/cadastros.${ext}${q}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
const dirTemp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sala-'));

test('cadastro: cria, atualiza com o segredo certo e recusa o errado', async () => {
  const c = corpo();
  assert.equal((await post(c)).status, 200);
  assert.deepEqual(await (await post({ ...c, responsavel: { ...c.responsavel, nome: 'Maria Nova' }, criancas: [{ nome: 'Bia', nascimento: '2020-01-02' }, { nome: 'Caio', nascimento: '2015-03-04' }] })).json(), { ok: true });
  const lista = await (await admin('json')).json();
  const f = lista.find((x) => x.id === c.id);
  assert.equal(f.responsavel.nome, 'Maria Nova');
  assert.deepEqual(f.criancas.map((k) => k.nome), ['Bia', 'Caio']);
  assert.equal(f.criado_em <= f.atualizado_em, true);
  assert.equal(JSON.stringify(f).includes(c.segredo), false);
  const r = await post({ ...c, segredo: novoSegredo(), responsavel: { ...c.responsavel, nome: 'Invasor' } });
  assert.equal(r.status, 401);
  const depois = (await (await admin('json')).json()).find((x) => x.id === c.id);
  assert.equal(depois.responsavel.nome, 'Maria Nova');
});

test('cadastro: o segredo só fica guardado como hash', async () => {
  const c = corpo();
  await post(c);
  const bruto = fs.readFileSync(path.join(dirDados, 'cadastros.sqlite')).toString('latin1');
  assert.equal(bruto.includes(c.segredo), false);
});

test('cadastro: validações estritas devolvem 400', async () => {
  const resp = (nome, telefone = '11999991234', email = 'a@b.co') => corpo({ responsavel: { nome, telefone, email } });
  const kid = (nome, nascimento) => corpo({ criancas: [{ nome, nascimento }] });
  const ruins = [
    corpo({ id: 'nao-uuid' }),
    corpo({ segredo: 'curto' }),
    resp('x'.repeat(81)),
    resp(''),
    resp('Ok', 'abc12345678'),
    resp('Ok', '1'.repeat(21)),
    resp('Ok', '11999991234', 'sem-arroba'),
    resp('Ok', '11999991234', 'x'.repeat(120) + '@b.co'),
    corpo({ criancas: Array.from({ length: 9 }, () => ({ nome: 'A', nascimento: '2018-01-01' })) }),
    kid('x'.repeat(31), '2018-01-01'),
    kid('Ana', '2018-02-30'),
    kid('Ana', '2099-01-01'),
    kid('Ana', '1900-01-01'),
    kid('Ana', '10/05/2018'),
    corpo({ criancas: 'x' }),
    corpo({ consentimento: { privacidade: false, versao: '1', em: '2026-11-06T12:00:00Z' } }),
    corpo({ consentimento: { privacidade: 'true', versao: '1', em: '2026-11-06T12:00:00Z' } }),
    corpo({ consentimento: undefined }),
    corpo({ marketing: { aceito: 'sim' } }),
    '{nao e json',
    '[1,2]',
  ];
  for (const r of ruins) assert.equal((await post(r)).status, 400, JSON.stringify(r).slice(0, 90));
  assert.equal((await post(corpo(), { tipo: 'text/plain' })).status, 400);
});

test('cadastro: corpo acima de 8 KB dá 413', async () => {
  const r = await post(corpo({ responsavel: { nome: 'x'.repeat(9000), telefone: '11999991234', email: 'a@b.co' } }));
  assert.equal(r.status, 413);
  const r2 = await post(JSON.stringify(corpo()) + ' '.repeat(9000));
  assert.equal(r2.status, 413);
});

test('cadastro: CORS exige Origin válido e responde o preflight', async () => {
  assert.equal((await post(corpo(), { origin: null })).status, 403);
  assert.equal((await post(corpo(), { origin: 'https://malvado.example' })).status, 403);
  const ok = await post(corpo(), { origin: 'http://localhost:5173' });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const pre = await fetch(`${base()}/cadastro`, { method: 'OPTIONS', headers: { origin: ORIGEM, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' } });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-origin'), ORIGEM);
  assert.match(pre.headers.get('access-control-allow-methods'), /POST.*DELETE.*OPTIONS/);
  assert.match(pre.headers.get('access-control-allow-headers'), /X-Segredo/i);
  const preRuim = await fetch(`${base()}/cadastro`, { method: 'OPTIONS', headers: { origin: 'https://malvado.example' } });
  assert.equal(preRuim.status, 403);
  assert.equal(preRuim.headers.get('access-control-allow-origin'), null);
  assert.equal((await fetch(`${base()}/cadastro`, { method: 'GET', headers: { origin: ORIGEM } })).status, 405);
});

test('cadastro: DELETE apaga de verdade e só registra id e data na auditoria', async () => {
  const c = corpo({ responsavel: { nome: 'Fulana Apagavel', telefone: '11999991234', email: 'apagar@exemplo.com' } });
  await post(c);
  assert.equal((await apaga(c.id, novoSegredo())).status, 401);
  assert.equal((await apaga(c.id, null)).status, 401);
  assert.equal((await apaga(c.id, c.segredo, null)).status, 403);
  assert.equal((await apaga(c.id, c.segredo)).status, 200);
  assert.equal((await apaga(c.id, c.segredo)).status, 401); // já foi
  assert.equal((await (await admin('json')).json()).some((x) => x.id === c.id), false);
  const bruto = fs.readFileSync(path.join(dirDados, 'cadastros.sqlite')).toString('latin1');
  assert.equal(bruto.includes('Fulana Apagavel'), false);
  assert.equal(bruto.includes('apagar@exemplo.com'), false);
  assert.equal(bruto.includes(c.id), true); // auditoria: só o id
});

test('cadastro: CSV com BOM, separador ;, uma linha por criança, filtro de marketing', async () => {
  const sim = corpo({ responsavel: { nome: 'Zelia CSV', telefone: '11988887777', email: 'zelia@exemplo.com' }, criancas: [{ nome: 'Luz', nascimento: '2019-04-05' }, { nome: 'Sol', nascimento: '2021-06-07' }] });
  const nao = corpo({ responsavel: { nome: 'Nando CSV', telefone: '11977776666', email: 'nando@exemplo.com' }, marketing: { aceito: false } });
  await post(sim); await post(nao);
  const r = await admin('csv');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/csv/);
  const buf = Buffer.from(await r.arrayBuffer());
  assert.deepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  const linhas = buf.toString('utf8').slice(1).trim().split('\r\n');
  assert.equal(linhas[0], '"responsável";"telefone";"e-mail";"aceita novidades";"criança";"nascimento";"idade";"cadastrado em"');
  const zelia = linhas.filter((l) => l.includes('Zelia CSV'));
  assert.equal(zelia.length, 2);
  assert.match(zelia[0], /^"Zelia CSV";"11988887777";"zelia@exemplo.com";"Sim";"Luz";"2019-04-05";"\d+";"\d{4}-\d{2}-\d{2} \d{2}:\d{2}"$/);
  assert.equal(linhas.some((l) => l.includes('Nando CSV') && l.includes('"Não"')), true);
  const so = await (await admin('csv', TOKEN, '?marketing=1')).text();
  assert.equal(so.includes('Zelia CSV'), true);
  assert.equal(so.includes('Nando CSV'), false);
  const js = await (await admin('json', TOKEN, '?marketing=1')).json();
  assert.equal(js.every((f) => f.marketing.aceito), true);
});

test('cadastro: CSV protege contra injeção de fórmula', async () => {
  const c = corpo({ responsavel: { nome: '=HYPERLINK("http://x")', telefone: '+55 11 99999-0000', email: '+cmd@x.co' }, criancas: [{ nome: '-2+3', nascimento: '2018-05-10' }] });
  assert.equal((await post(c)).status, 200);
  const linha = (await (await admin('csv')).text()).split('\r\n').find((l) => l.includes('HYPERLINK'));
  assert.ok(linha.startsWith('"\'=HYPERLINK(""http://x"")";"\'+55 11 99999-0000";"\'+cmd@x.co";"Sim";"\'-2+3"'), linha);
  assert.match(montarCsv([{ responsavel_nome: 'Ok', telefone: '1', email: 'e', marketing_aceito: 1, criado_em: '2026-11-06T12:00:00Z', criancas: [] }]), /"Ok";"1";"e";"Sim";"";"";"";/);
});

test('admin: exige token certo; sem ADMIN_TOKEN as rotas somem (404)', async () => {
  assert.equal((await admin('csv', null)).status, 401);
  assert.equal((await admin('csv', 'token-errado-token-errado-123456')).status, 401);
  assert.equal((await admin('json', TOKEN + 'x')).status, 401);
  const dir = dirTemp();
  const s2 = await iniciar({ porta: 0, log: false, dataDir: dir, adminToken: '' });
  try {
    const b = `http://127.0.0.1:${s2.porta}`;
    assert.equal((await admin('csv', TOKEN, '', b)).status, 404);
    assert.equal((await admin('json', null, '', b)).status, 404);
    assert.equal((await post(corpo(), { b })).status, 200); // o cadastro em si funciona
  } finally { await s2.parar(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('cadastro: limite por IP devolve 429 (vale também para admin e DELETE)', async () => {
  const dir = dirTemp();
  const s2 = await iniciar({ porta: 0, log: false, dataDir: dir, adminToken: TOKEN, limites: { cadastrosPorJanela: 4 } });
  try {
    const b = `http://127.0.0.1:${s2.porta}`;
    for (let i = 0; i < 4; i++) assert.equal((await post(corpo(), { b })).status, 200);
    assert.equal((await post(corpo(), { b })).status, 429);
    assert.equal((await admin('csv', TOKEN, '', b)).status, 429);
    assert.equal((await apaga(novoId(), novoSegredo(), ORIGEM, b)).status, 429);
    assert.equal((await fetch(`${b}/saude`)).status, 200); // o relay segue de pé
  } finally { await s2.parar(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('sem DATA_DIR gravável: /cadastro dá 503 e a sala segue funcionando', async () => {
  const dir = dirTemp();
  const arquivo = path.join(dir, 'arquivo-comum'); // um arquivo no lugar da pasta: não dá para gravar
  fs.writeFileSync(arquivo, 'x');
  const s2 = await iniciar({ porta: 0, log: false, dataDir: arquivo, adminToken: TOKEN, escala: 0.01 });
  try {
    const b = `http://127.0.0.1:${s2.porta}`;
    assert.equal((await post(corpo(), { b })).status, 503);
    assert.equal((await apaga(novoId(), novoSegredo(), ORIGEM, b)).status, 503);
    assert.equal((await admin('csv', TOKEN, '', b)).status, 503);
    assert.equal((await fetch(`${b}/saude`)).status, 200);
    const host = new WebSocket(`ws://127.0.0.1:${s2.porta}`);
    abertos.push(host);
    const msg = await new Promise((ok, no) => { host.on('open', () => host.send(JSON.stringify({ t: 'criar' }))); host.on('message', (m) => ok(JSON.parse(m.toString()))); host.on('error', no); });
    assert.equal(msg.t, 'sala');
  } finally { await s2.parar(); fs.rmSync(dir, { recursive: true, force: true }); }
});
