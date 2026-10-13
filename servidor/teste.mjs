// Teste do relay: node --test teste.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { iniciar } from './sala.mjs';

let srv, url;
const abertos = [];

before(async () => {
  srv = await iniciar({ porta: 0, origens: '', escala: 0.01, log: false }); // 2 min viram 1,2 s
  url = `ws://127.0.0.1:${srv.porta}`;
});
after(async () => { abertos.forEach((w) => w.terminate()); await srv.parar(); });

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
  assert.equal(typeof j.salas, 'number');
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
