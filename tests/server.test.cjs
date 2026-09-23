const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server.js');

function memoryStore() {
  const cases = [];
  return {
    async health() { return true; },
    async create(request, result) { const item = { id: cases.length + 1, request, status: result.humanReview ? 'pending_review' : 'routed', createdAt: new Date().toISOString(), ...result }; cases.push(item); return item; },
    async list(status) { return status && status !== 'all' ? cases.filter(item => item.status === status) : cases; },
    async decide(id, decision, note) { const item = cases.find(entry => entry.id === id); if (!item) throw Object.assign(new Error('Case not found.'), { status: 404 }); if (item.status !== 'pending_review') throw Object.assign(new Error('Only pending cases can be decided.'), { status: 409 }); Object.assign(item, { status: decision === 'approve' ? 'approved' : 'rejected', decision, decisionNote: note }); return item; },
  };
}
async function withServer(run, n8nHandler = null, n8nUrl = null, options = {}) {
  let n8n; let n8nWebhookUrl = n8nUrl;
  if (n8nHandler) { n8n = require('node:http').createServer(n8nHandler).listen(0, '127.0.0.1'); await once(n8n, 'listening'); n8nWebhookUrl = `http://127.0.0.1:${n8n.address().port}/webhook`; }
  const server = createServer({ store: options.store || memoryStore(), operatorKey: 'test-operator', n8nWebhookUrl, rateLimit: options.rateLimit || 60 }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { server.close(); await once(server, 'close'); if (n8n) { n8n.close(); await once(n8n, 'close'); } }
}
const n8nResult = { caseId:'OPS-TEST', category:'billing', priority:'medium', humanReview:true, summary:'Billing case.', nextAction:'Review.', missing:[], procedure:{id:'OPS-FIN-004',title:'Billing',excerpt:'Review invoice.'}, audit:['validated'], engine:'n8n-test-engine' };
const n8nHandler = (_request, response) => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(n8nResult)); };

test('serves application and database-aware health', () => withServer(async baseUrl => {
  const health = await fetch(`${baseUrl}/healthz`); assert.equal(health.status, 200); assert.deepEqual(await health.json(), { status:'ok', database:'ok' });
  const page = await fetch(baseUrl); assert.equal(page.status, 200); assert.match(await page.text(), /Operations queue/);
}));
test('proxies through n8n and persists the case', () => withServer(async baseUrl => {
  const created = await fetch(`${baseUrl}/api/triage`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({request:'Invoice INV-204 has an incorrect amount of USD 480.'}) });
  assert.equal(created.status, 201); assert.equal((await created.json()).status, 'pending_review');
  const listed = await fetch(`${baseUrl}/api/cases`, { headers:{'X-Operator-Key':'test-operator'} }); assert.equal(listed.status, 200); assert.equal((await listed.json()).cases.length, 1);
}, n8nHandler));
test('requires operator authorization and records a decision', () => withServer(async baseUrl => {
  await fetch(`${baseUrl}/api/triage`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({request:'Invoice INV-204 has an incorrect amount of USD 480.'}) });
  assert.equal((await fetch(`${baseUrl}/api/cases`)).status, 401);
  const decision = await fetch(`${baseUrl}/api/cases/1/decision`, { method:'POST', headers:{'Content-Type':'application/json','X-Operator-Key':'test-operator'}, body:JSON.stringify({decision:'approve',note:'Verified'}) });
  assert.equal(decision.status, 200); const item = await decision.json(); assert.equal(item.status, 'approved'); assert.equal(item.decisionNote, 'Verified');
}, n8nHandler));
test('rejects invalid API input without calling n8n', () => withServer(async baseUrl => {
  const response = await fetch(`${baseUrl}/api/triage`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({request:'Help'}) }); assert.equal(response.status, 422);
}));
test('fails closed when n8n is unavailable', () => withServer(async baseUrl => {
  const response = await fetch(`${baseUrl}/api/triage`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({request:'A sufficiently long operations request.'}) }); assert.equal(response.status, 503); assert.match((await response.json()).error,/n8n is unavailable/);
}, null, 'http://127.0.0.1:1/webhook'));
test('rate limits excessive requests', () => withServer(async baseUrl => {
  assert.equal((await fetch(`${baseUrl}/healthz`)).status, 200); assert.equal((await fetch(`${baseUrl}/healthz`)).status, 429);
}, null, null, { rateLimit:1 }));
