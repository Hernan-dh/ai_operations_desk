'use strict';

const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const ROOT = __dirname;
const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/triage-engine.js', ['triage-engine.js', 'text/javascript; charset=utf-8']],
]);
const MAX_BODY_BYTES = 16 * 1024;

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Request body exceeds the 16 KB limit.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch {
    const error = new Error('Request body must be valid JSON.');
    error.status = 400;
    throw error;
  }
}

function createServer(options = {}) {
  const n8nWebhookUrl = options.n8nWebhookUrl || process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook/operations-desk-triage-ai';
  const n8nTimeoutMs = options.n8nTimeoutMs || Number.parseInt(process.env.N8N_TIMEOUT_MS || '45000', 10);
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' http://localhost:5678 https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    const pathname = new URL(request.url, 'http://localhost').pathname;

    if (request.method === 'GET' && pathname === '/healthz') return sendJson(response, 200, { status: 'ok' });
    if (request.method === 'POST' && pathname === '/api/triage') {
      try {
        const body = await readJson(request);
        if (typeof body.request !== 'string' || body.request.trim().length < 12 || body.request.length > 1200) {
          const error = new Error('Request must contain between 12 and 1200 characters.');
          error.status = 422;
          throw error;
        }
        const upstream = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request: body.request.trim() }),
          signal: AbortSignal.timeout(n8nTimeoutMs),
        });
        const raw = await upstream.text();
        let result;
        try { result = JSON.parse(raw); }
        catch { throw new Error('n8n returned an invalid JSON response.'); }
        if (!upstream.ok) {
          const error = new Error(result.message || result.error || `n8n returned HTTP ${upstream.status}.`);
          error.status = 502;
          throw error;
        }
        return sendJson(response, 200, result);
      } catch (error) {
        const unavailable = error.name === 'TimeoutError' || error.cause?.code || (!error.status && error.message?.startsWith('n8n'));
        return sendJson(response, error.status || (unavailable ? 503 : 500), { error: unavailable ? 'n8n is unavailable. The request was not processed.' : (error.message || 'Request could not be processed.') });
      }
    }
    if (request.method === 'GET' && STATIC_FILES.has(pathname)) {
      const [filename, contentType] = STATIC_FILES.get(pathname);
      try {
        const contents = await readFile(path.join(ROOT, filename));
        response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': filename === 'index.html' ? 'no-cache' : 'public, max-age=3600' });
        return response.end(contents);
      } catch { return sendJson(response, 500, { error: 'Static asset unavailable.' }); }
    }
    return sendJson(response, 404, { error: 'Not found.' });
  });
}

if (require.main === module) {
  const port = Number.parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';
  createServer().listen(port, host, () => console.log(`AI Operations Desk listening on http://${host}:${port}`));
}

module.exports = { createServer };
