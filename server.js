'use strict';

const http = require('node:http');
const { readFile } = require('node:fs/promises');
const { randomUUID, timingSafeEqual } = require('node:crypto');
const path = require('node:path');
const { PostgresCaseStore } = require('./case-store.js');

const ROOT = __dirname;
const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']], ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']], ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);
const MAX_BODY_BYTES = 16 * 1024;

function log(level, event, fields = {}) {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields })}\n`);
}
function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}
async function readJson(request) {
  const chunks = []; let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Request body exceeds the 16 KB limit.'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}
function safeEqual(left, right) {
  const a = Buffer.from(left || ''), b = Buffer.from(right || '');
  return a.length === b.length && timingSafeEqual(a, b);
}
function createRateLimiter(limit, windowMs = 60000) {
  const buckets = new Map();
  return (key) => {
    const now = Date.now(); let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) { bucket = { count: 0, resetAt: now + windowMs }; buckets.set(key, bucket); }
    bucket.count += 1;
    if (buckets.size > 10000) for (const [id, value] of buckets) if (value.resetAt <= now) buckets.delete(id);
    return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
  };
}

function createServer(options = {}) {
  const store = options.store;
  if (!store) throw new Error('A case store is required.');
  const n8nWebhookUrl = options.n8nWebhookUrl || process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook/operations-desk-triage-ai';
  const n8nTimeoutMs = options.n8nTimeoutMs || Number.parseInt(process.env.N8N_TIMEOUT_MS || '45000', 10);
  const operatorKey = options.operatorKey || process.env.OPERATOR_KEY || '';
  const rateLimit = createRateLimiter(options.rateLimit || Number.parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60', 10));

  return http.createServer(async (request, response) => {
    const requestId = request.headers['x-request-id'] || randomUUID();
    const startedAt = Date.now();
    response.setHeader('X-Request-Id', requestId); response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const clientIp = String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || '').split(',')[0].trim();
    const rate = rateLimit(clientIp);
    response.setHeader('X-RateLimit-Remaining', String(rate.remaining));
    if (!rate.allowed) { log('warn', 'rate_limit_exceeded', { requestId, clientIp }); return sendJson(response, 429, { error: 'Too many requests. Try again in one minute.', requestId }); }
    const requireOperator = () => operatorKey && safeEqual(request.headers['x-operator-key'], operatorKey);

    try {
      if (request.method === 'GET' && pathname === '/healthz') {
        try { await store.health(); return sendJson(response, 200, { status: 'ok', database: 'ok' }); }
        catch { return sendJson(response, 503, { status: 'degraded', database: 'unavailable' }); }
      }
      if (request.method === 'POST' && pathname === '/api/triage') {
        const body = await readJson(request);
        if (typeof body.request !== 'string' || body.request.trim().length < 12 || body.request.length > 1200)
          throw Object.assign(new Error('Request must contain between 12 and 1200 characters.'), { status: 422 });
        const upstream = await fetch(n8nWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId }, body: JSON.stringify({ request: body.request.trim(), requestId }), signal: AbortSignal.timeout(n8nTimeoutMs) });
        const raw = await upstream.text(); let result;
        try { result = JSON.parse(raw); } catch { throw Object.assign(new Error('n8n returned invalid JSON.'), { status: 502 }); }
        if (!upstream.ok) throw Object.assign(new Error(result.message || result.error || `n8n returned HTTP ${upstream.status}.`), { status: 502 });
        const saved = await store.create(body.request.trim(), result);
        log('info', 'case_created', { requestId, caseId: saved.caseId, status: saved.status, engine: saved.engine, durationMs: Date.now() - startedAt });
        return sendJson(response, 201, saved);
      }
      if (request.method === 'GET' && pathname === '/api/cases') {
        if (!requireOperator()) return sendJson(response, 401, { error: 'Operator key required.', requestId });
        const status = new URL(request.url, 'http://localhost').searchParams.get('status');
        return sendJson(response, 200, { cases: await store.list(status) });
      }
      const decisionMatch = pathname.match(/^\/api\/cases\/(\d+)\/decision$/);
      if (request.method === 'POST' && decisionMatch) {
        if (!requireOperator()) return sendJson(response, 401, { error: 'Operator key required.', requestId });
        const body = await readJson(request);
        if (!['approve', 'reject'].includes(body.decision)) throw Object.assign(new Error('Decision must be approve or reject.'), { status: 422 });
        const note = String(body.note || '').trim();
        if (note.length > 1000) throw Object.assign(new Error('Decision note exceeds 1,000 characters.'), { status: 422 });
        const saved = await store.decide(Number(decisionMatch[1]), body.decision, note, 'operator');
        log('info', 'case_decided', { requestId, caseId: saved.caseId, decision: body.decision, durationMs: Date.now() - startedAt });
        return sendJson(response, 200, saved);
      }
      if (request.method === 'GET' && STATIC_FILES.has(pathname)) {
        const [filename, contentType] = STATIC_FILES.get(pathname); const contents = await readFile(path.join(ROOT, filename));
        response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': filename === 'index.html' ? 'no-cache' : 'public, max-age=3600' }); return response.end(contents);
      }
      return sendJson(response, 404, { error: 'Not found.', requestId });
    } catch (error) {
      const unavailable = error.name === 'TimeoutError' || error.cause?.code || error.message === 'fetch failed';
      const status = error.status || (unavailable ? 503 : 500);
      log(status >= 500 ? 'error' : 'warn', 'request_failed', { requestId, method: request.method, path: pathname, status, error: error.message, durationMs: Date.now() - startedAt });
      return sendJson(response, status, { error: unavailable ? 'n8n is unavailable. The request was not processed.' : (error.message || 'Request could not be processed.'), requestId });
    }
  });
}

if (require.main === module) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  if (!process.env.OPERATOR_KEY) throw new Error('OPERATOR_KEY is required.');
  const store = new PostgresCaseStore(process.env.DATABASE_URL);
  store.init().then(() => {
    const port = Number.parseInt(process.env.PORT || '3000', 10), host = process.env.HOST || '0.0.0.0';
    const server = createServer({ store }).listen(port, host, () => log('info', 'server_started', { host, port }));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await store.close(); process.exit(0); }));
  }).catch((error) => { log('error', 'database_startup_failed', { error: error.message }); process.exit(1); });
}

module.exports = { createServer };
