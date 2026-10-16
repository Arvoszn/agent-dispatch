const test = require('node:test');
const assert = require('node:assert/strict');

const { route, tokenize } = require('../src/router');
const capabilities = require('../capabilities');

test('tokenize drops stopwords and punctuation', () => {
  assert.deepEqual(tokenize('Log the payment of PHP 650, please.'), ['log', 'payment', 'php', '650']);
});

test('a clear request routes to the matching capability', () => {
  const decision = route('log a payment of PHP 650 from spawntest', capabilities);
  assert.equal(decision.picked.name, 'ledger');
  assert.ok(decision.confidence > 0.45);
  assert.ok(decision.matched.includes('log'));
});

test('two-word triggers outrank incidental single words', () => {
  const decision = route('research and compare the two suppliers, then find out the delivery time', capabilities);
  assert.equal(decision.picked.name, 'research');
  assert.ok(decision.matched.includes('find out'));
});

test('an unroutable request is refused, not guessed', () => {
  const decision = route('thing', capabilities);
  assert.equal(decision.picked, null);
  assert.match(decision.reason, /no capability declared a matching trigger/);
});

test('a weak match below the confidence floor is refused', () => {
  const left = capabilities.find((c) => c.name === 'research');
  const right = capabilities.find((c) => c.name === 'ledger');
  const decision = route('record and research', [left, right], { minConfidence: 0.75 });
  assert.equal(decision.picked, null);
  assert.match(decision.reason, /below the 0.75 floor/);
});
