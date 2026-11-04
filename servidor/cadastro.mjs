// Cadastro das famílias (responsável + crianças) para o dono usar em novidades e pedido de feedback.
// SQLite em DATA_DIR. Nunca registra dado pessoal no console: só contagens e ids.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export const ORIGENS_CADASTRO = ['https://jogos.educarte.qzz.io'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;
const MAX_CORPO = 8 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROLE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const TELEFONE = /^[0-9+()\- ]{8,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

class ErroHttp extends Error {
  constructor(status, motivo) { super(motivo); this.status = status; this.motivo = motivo; }
}
const ruim = (m) => new ErroHttp(400, m);

const ehObjeto = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
function texto(v, campo, max, min = 1) {
  if (typeof v !== 'string') throw ruim(campo);
  const t = v.normalize('NFC').trim();
  if (t.length < min || t.length > max || CONTROLE.test(t)) throw ruim(campo);
  return t;
}
function instante(v, campo, obrigatorio) {
  if (v === undefined || v === null) { if (obrigatorio) throw ruim(campo); return null; }
  if (typeof v !== 'string' || v.length > 40 || !/^\d{4}-\d{2}-\d{2}T/.test(v) || Number.isNaN(Date.parse(v))) throw ruim(campo);
  return new Date(v).toISOString();
}
function dataNascimento(v, agora) {
  const m = typeof v === 'string' && DATA.exec(v);
  if (!m) throw ruim('nascimento');
  const [a, me, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(a, me - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== me - 1 || dt.getUTCDate() !== d) throw ruim('nascimento');
  if (dt.getTime() > agora + 86400e3) throw ruim('nascimento'); // futuro (com folga de fuso)
  if (a < new Date(agora).getUTCFullYear() - 25) throw ruim('nascimento'); // implausível para criança
  return v;
}

export function validar(c, agora = Date.now()) {
  if (!ehObjeto(c)) throw ruim('corpo');
  if (typeof c.id !== 'string' || !UUID.test(c.id)) throw ruim('id');
  if (typeof c.segredo !== 'string' || c.segredo.length < 32 || c.segredo.length > 128) throw ruim('segredo');
  if (!ehObjeto(c.responsavel)) throw ruim('responsavel');
  const nome = texto(c.responsavel.nome, 'responsavel.nome', 80);
  const telefone = texto(c.responsavel.telefone, 'responsavel.telefone', 20, 8);
  if (!TELEFONE.test(telefone) || telefone.replace(/\D/g, '').length < 8) throw ruim('responsavel.telefone');
  const email = texto(c.responsavel.email, 'responsavel.email', 120, 5);
  if (!EMAIL.test(email)) throw ruim('responsavel.email');
  if (!Array.isArray(c.criancas) || c.criancas.length > 8) throw ruim('criancas');
  const criancas = c.criancas.map((k) => {
    if (!ehObjeto(k)) throw ruim('criancas');
    return { nome: texto(k.nome, 'crianca.nome', 30), nascimento: dataNascimento(k.nascimento, agora) };
  });
  if (!ehObjeto(c.consentimento) || c.consentimento.privacidade !== true) throw ruim('consentimento');
  const versao = texto(c.consentimento.versao, 'consentimento.versao', 20);
  const privEm = instante(c.consentimento.em, 'consentimento.em', true);
  if (!ehObjeto(c.marketing) || typeof c.marketing.aceito !== 'boolean') throw ruim('marketing');
  const mktEm = instante(c.marketing.em, 'marketing.em', false);
  return { id: c.id.toLowerCase(), segredo: c.segredo, nome, telefone, email, criancas, versao, privEm, aceito: c.marketing.aceito, mktEm };
}

const scrypt = (s, sal) => new Promise((ok, no) => crypto.scrypt(s, sal, 32, (e, k) => (e ? no(e) : ok(k))));
async function hashear(segredo) {
  const sal = crypto.randomBytes(16);
  return `${sal.toString('hex')}$${(await scrypt(segredo, sal)).toString('hex')}`;
}
async function confere(segredo, guardado) {
  const [sal, h] = String(guardado).split('$');
  if (!sal || !h) return false;
  const k = await scrypt(String(segredo), Buffer.from(sal, 'hex'));
  const esperado = Buffer.from(h, 'hex');
  return k.length === esperado.length && crypto.timingSafeEqual(k, esperado);
}
const igualConst = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

// --- CSV ---
const celula = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // injeção de fórmula
  return `"${s.replace(/"/g, '""')}"`;
};
function idade(nasc, agora) {
  const [a, m, d] = nasc.split('-').map(Number);
  const h = new Date(agora);
  let n = h.getUTCFullYear() - a;
  if (h.getUTCMonth() + 1 < m || (h.getUTCMonth() + 1 === m && h.getUTCDate() < d)) n--;
  return Math.max(0, n);
}
function quando(iso) {
  try {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch { return iso; }
}
export function montarCsv(familias, agora = Date.now()) {
  const linhas = [['responsável', 'telefone', 'e-mail', 'aceita novidades', 'criança', 'nascimento', 'idade', 'cadastrado em']];
  for (const f of familias) {
    const base = [f.responsavel_nome, f.telefone, f.email, f.marketing_aceito ? 'Sim' : 'Não'];
    const fim = quando(f.criado_em);
    if (!f.criancas.length) linhas.push([...base, '', '', '', fim]);
    for (const k of f.criancas) linhas.push([...base, k.nome, k.nascimento, idade(k.nascimento, agora), fim]);
  }
  return '﻿' + linhas.map((l) => l.map(celula).join(';')).join('\r\n') + '\r\n';
}

export function criarCadastros({ dataDir, adminToken = '', origens = ORIGENS_CADASTRO, log = true } = {}) {
  let db = null;
  try {
    if (!dataDir) throw new Error('sem DATA_DIR');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.accessSync(dataDir, fs.constants.W_OK);
    const arquivo = path.join(dataDir, 'cadastros.sqlite');
    db = new Database(arquivo);
    try { fs.chmodSync(arquivo, 0o600); } catch { /* volume sem chmod: segue */ }
    db.pragma('foreign_keys = ON');
    db.pragma('secure_delete = ON'); // apagar é apagar de verdade
    db.exec(`
      CREATE TABLE IF NOT EXISTS familias (
        id TEXT PRIMARY KEY, segredo_hash TEXT NOT NULL, responsavel_nome TEXT NOT NULL, telefone TEXT NOT NULL, email TEXT NOT NULL,
        marketing_aceito INTEGER NOT NULL, marketing_em TEXT, privacidade_versao TEXT NOT NULL, privacidade_em TEXT NOT NULL,
        criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS criancas (
        familia_id TEXT NOT NULL REFERENCES familias(id) ON DELETE CASCADE, nome TEXT NOT NULL, nascimento TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS criancas_familia ON criancas(familia_id);
      CREATE TABLE IF NOT EXISTS auditoria (familia_id TEXT NOT NULL, acao TEXT NOT NULL, em TEXT NOT NULL);`);
    if (log) console.log(`cadastro: banco pronto (${db.prepare('SELECT COUNT(*) n FROM familias').get().n} famílias)`);
  } catch (e) {
    try { db?.close(); } catch { /* nada */ }
    db = null;
    if (log) console.warn(`cadastro: indisponível (${e.code || e.message}); a sala segue normalmente`);
  }

  const q = db && {
    pegar: db.prepare('SELECT segredo_hash FROM familias WHERE id = ?'),
    inserir: db.prepare('INSERT INTO familias (id, segredo_hash, responsavel_nome, telefone, email, marketing_aceito, marketing_em, privacidade_versao, privacidade_em, criado_em, atualizado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?)'),
    atualizar: db.prepare('UPDATE familias SET responsavel_nome=?, telefone=?, email=?, marketing_aceito=?, marketing_em=?, privacidade_versao=?, privacidade_em=?, atualizado_em=? WHERE id=?'),
    limparCriancas: db.prepare('DELETE FROM criancas WHERE familia_id = ?'),
    criancaNova: db.prepare('INSERT INTO criancas (familia_id, nome, nascimento) VALUES (?,?,?)'),
    apagar: db.prepare('DELETE FROM familias WHERE id = ?'),
    auditar: db.prepare('INSERT INTO auditoria (familia_id, acao, em) VALUES (?,?,?)'),
    familias: db.prepare('SELECT * FROM familias ORDER BY criado_em, id'),
    criancasDe: db.prepare('SELECT nome, nascimento FROM criancas WHERE familia_id = ? ORDER BY rowid'),
  };

  const gravar = db && db.transaction((c, hashNovo, hashVisto) => {
    const agora = new Date().toISOString();
    const atual = q.pegar.get(c.id);
    if (atual) {
      if (atual.segredo_hash !== hashVisto) throw new ErroHttp(401, 'segredo');
      q.atualizar.run(c.nome, c.telefone, c.email, c.aceito ? 1 : 0, c.mktEm, c.versao, c.privEm, agora, c.id);
      q.limparCriancas.run(c.id);
    } else {
      if (hashVisto) throw new ErroHttp(401, 'segredo'); // sumiu entre a checagem e a gravação
      q.inserir.run(c.id, hashNovo, c.nome, c.telefone, c.email, c.aceito ? 1 : 0, c.mktEm, c.versao, c.privEm, agora, agora);
    }
    for (const k of c.criancas) q.criancaNova.run(c.id, k.nome, k.nascimento);
  });

  const apagarTx = db && db.transaction((id) => {
    q.apagar.run(id);
    q.auditar.run(id, 'apagado', new Date().toISOString());
  });

  const lerTudo = (soMarketing) => q.familias.all()
    .filter((f) => !soMarketing || f.marketing_aceito)
    .map((f) => ({ ...f, criancas: q.criancasDe.all(f.id) }));

  // --- HTTP ---
  const origemOk = (o) => typeof o === 'string' && (origens.includes(o) || LOCAL.test(o));
  function cabecalhos(res, origin) {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    if (origin) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'Origin');
    }
  }
  function json(res, status, obj) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  }
  const falha = (res, status, motivo) => json(res, status, { ok: false, erro: motivo });

  function lerCorpo(req) {
    return new Promise((ok, no) => {
      if (Number(req.headers['content-length']) > MAX_CORPO) return no(new ErroHttp(413, 'grande'));
      const partes = []; let total = 0;
      req.on('data', (b) => {
        total += b.length;
        if (total > MAX_CORPO) { no(new ErroHttp(413, 'grande')); req.pause(); return; }
        partes.push(b);
      });
      req.on('end', () => ok(Buffer.concat(partes).toString('utf8')));
      req.on('error', () => no(new ErroHttp(400, 'corpo')));
      req.on('aborted', () => no(new ErroHttp(400, 'corpo')));
    });
  }

  async function salvar(req, res) {
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) throw ruim('tipo');
    let bruto;
    try { bruto = JSON.parse(await lerCorpo(req)); } catch (e) { throw e instanceof ErroHttp ? e : ruim('json'); }
    const c = validar(bruto);
    const atual = q.pegar.get(c.id);
    let hashNovo = null;
    if (atual) {
      if (!(await confere(c.segredo, atual.segredo_hash))) throw new ErroHttp(401, 'segredo');
    } else {
      hashNovo = await hashear(c.segredo);
    }
    gravar(c, hashNovo, atual ? atual.segredo_hash : null);
    if (log) console.log(`cadastro: ${atual ? 'atualizado' : 'criado'} ${c.id} (${c.criancas.length} crianças)`);
    json(res, 200, { ok: true });
  }

  async function remover(req, res, id) {
    if (!UUID.test(id)) throw ruim('id');
    id = id.toLowerCase();
    const segredo = req.headers['x-segredo'];
    if (typeof segredo !== 'string' || segredo.length < 32 || segredo.length > 128) throw new ErroHttp(401, 'segredo');
    const atual = q.pegar.get(id);
    if (!atual || !(await confere(segredo, atual.segredo_hash))) throw new ErroHttp(401, 'segredo');
    apagarTx(id);
    if (log) console.log(`cadastro: apagado ${id}`);
    json(res, 200, { ok: true });
  }

  function admin(req, res, caminho, consulta) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m || !igualConst(m[1], adminToken)) return falha(res, 401, 'token');
    const csv = caminho === '/admin/cadastros.csv';
    const lista = lerTudo(consulta.get('marketing') === '1');
    if (log) console.log(`cadastro: exportação ${csv ? 'csv' : 'json'} (${lista.length} famílias)`);
    if (csv) {
      res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="cadastros.csv"' });
      return res.end(montarCsv(lista));
    }
    const saida = lista.map((f) => ({
      id: f.id,
      responsavel: { nome: f.responsavel_nome, telefone: f.telefone, email: f.email },
      criancas: f.criancas,
      marketing: { aceito: !!f.marketing_aceito, em: f.marketing_em },
      privacidade: { versao: f.privacidade_versao, em: f.privacidade_em },
      criado_em: f.criado_em,
      atualizado_em: f.atualizado_em,
    }));
    return json(res, 200, saida);
  }

  // Devolve false se a rota não é do cadastro. `limitar(ip)` devolve true se o IP estourou o limite.
  async function rota(req, res, ip, limitar) {
    const url = new URL(req.url, 'http://x');
    const caminho = url.pathname;
    const ehCad = caminho === '/cadastro' || /^\/cadastro\/[^/]+$/.test(caminho);
    const ehAdmin = caminho === '/admin/cadastros.csv' || caminho === '/admin/cadastros.json';
    if (!ehCad && !ehAdmin) return false;
    const origin = req.headers.origin;
    try {
      if (ehAdmin) {
        if (!adminToken) { res.writeHead(404); res.end(); return true; }
        cabecalhos(res, null);
        if (req.method !== 'GET') throw new ErroHttp(405, 'metodo');
        if (limitar(ip)) throw new ErroHttp(429, 'ritmo');
        if (!db) throw new ErroHttp(503, 'indisponivel');
        admin(req, res, caminho, url.searchParams);
        return true;
      }
      // /cadastro: Origin obrigatório e válido, inclusive no preflight
      if (!origemOk(origin)) { cabecalhos(res, null); throw new ErroHttp(403, 'origem'); }
      cabecalhos(res, origin);
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'access-control-allow-methods': 'POST, DELETE, OPTIONS',
          'access-control-allow-headers': 'Content-Type, X-Segredo',
          'access-control-max-age': '600',
        });
        res.end();
        return true;
      }
      let id = null;
      if (caminho.startsWith('/cadastro/')) {
        try { id = decodeURIComponent(caminho.slice(10)); } catch { throw ruim('id'); }
      }
      if (!((req.method === 'POST' && !id) || (req.method === 'DELETE' && id))) throw new ErroHttp(405, 'metodo');
      if (limitar(ip)) throw new ErroHttp(429, 'ritmo');
      if (!db) throw new ErroHttp(503, 'indisponivel');
      if (id) await remover(req, res, id); else await salvar(req, res);
    } catch (e) {
      if (!res.headersSent) {
        if (e instanceof ErroHttp) {
          if (e.status === 413) res.setHeader('connection', 'close');
          falha(res, e.status, e.motivo);
        } else {
          if (log) console.warn(`cadastro: erro interno (${e.code || e.name})`);
          falha(res, 500, 'interno');
        }
      }
    }
    return true;
  }

  return { rota, disponivel: !!db, fechar: () => { try { db?.close(); } catch { /* nada */ } } };
}
