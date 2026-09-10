const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeRequest } = require('../triage-engine.js');

test('routes access requests and enforces human review', () => {
  const result = analyzeRequest('I need access to the analytics repository today.');
  assert.equal(result.category, 'access');
  assert.equal(result.priority, 'high');
  assert.equal(result.humanReview, true);
  assert.equal(result.procedure.id, 'OPS-ACC-003');
});

test('finds complete billing information', () => {
  const result = analyzeRequest('Invoice INV-204 has an incorrect amount of USD 480.');
  assert.equal(result.category, 'billing');
  assert.deepEqual(result.missing, []);
  assert.equal(result.humanReview, true);
});

test('routes a technical incident with described impact', () => {
  const result = analyzeRequest('The client portal service is unavailable for the whole support team.');
  assert.equal(result.category, 'technical');
  assert.deepEqual(result.missing, []);
  assert.equal(result.priority, 'medium');
});

test('rejects unusably short requests', () => {
  assert.throws(() => analyzeRequest('Help'), /at least 12/);
});
