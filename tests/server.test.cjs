const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server.js');

async function withServer(run, n8nHandler = null, n8nUrl = null) {
  let n8n;
  let n8nWebhookUrl = n8nUrl;
  if (n8nHandler) {
    n8n = require('node:http').createServer(n8nHandler).listen(0, '127.0.0.1');
    await once(n8n, 'listening');
    n8nWebhookUrl = `http://127.0.0.1:${n8n.address().port}/webhook/operations-desk-triage`;
  }
  const server = createServer({ n8nWebhookUrl }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally {
    server.close();
    await once(server, 'close');
    if (n8n) { n8n.close(); await once(n8n, 'close'); }
  }
}

test('serves the application and health endpoint', () => withServer(async (baseUrl) => {
  const health = await fetch(`${baseUrl}/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /AI Operations Desk/);
}));

test('proxies triage through n8n', () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/triage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request: 'Invoice INV-204 has an incorrect amount of USD 480.' }) });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.category, 'billing');
  assert.equal(result.engine, 'n8n-test-engine');
}, (request, response) => {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ category: 'billing', engine: 'n8n-test-engine' }));
}));

test('rejects invalid API input without crashing', () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/triage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request: 'Help' }) });
  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /between 12 and 1200/);
}));

test('fails closed when n8n is unavailable', () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/triage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request: 'A sufficiently long operations request.' }) });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /n8n is unavailable/);
}), null, 'http://127.0.0.1:1/webhook/operations-desk-triage');
