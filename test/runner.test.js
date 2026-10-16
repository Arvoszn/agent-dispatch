const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { Bus } = require('../src/bus');
const { dispatch } = require('../src/runner');
const { stubModel } = require('../src/model');
const capabilities = require('../capabilities');
const stubTable = require('../demo/stub-table');

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-dispatch-'));
  return { dir, bus: new Bus(path.join(dir, 'log.jsonl')), runsRoot: path.join(dir, 'runs') };
}

test('every run ends with a handoff, in order: request -> route -> steps -> handoff', async () => {
  const { dir, bus, runsRoot } = scratch();
  const result = await dispatch('research how comment auctions convert', {
    capabilities,
    model: stubModel(stubTable),
    bus,
    runsRoot,
    runId: 'test-run',
  });

  const types = bus.run('test-run').map((e) => e.type);
  assert.equal(types[0], 'request');
  assert.equal(types[1], 'route');
  assert.equal(types[types.length - 1], 'handoff');
  assert.equal(result.status, 'ok');
  assert.ok(result.artifacts.length >= 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the ledger capability parses amounts instead of trusting a model', async () => {
  const { dir, bus, runsRoot } = scratch();
  const result = await dispatch('log a payment of PHP 650 and a 200 pesos deposit', {
    capabilities,
    model: stubModel(stubTable),
    bus,
    runsRoot,
    runId: 'ledger-run',
  });

  assert.equal(result.capability, 'ledger');
  assert.match(result.summary, /totalling 850/);
  const ledger = fs.readFileSync(path.join(runsRoot, 'ledger-run', 'ledger.jsonl'), 'utf8');
  assert.equal(ledger.trim().split('\n').length, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a capability that exceeds its step budget fails loudly and still hands off', async () => {
  const { dir, bus, runsRoot } = scratch();
  const greedy = {
    name: 'greedy',
    summary: 'tries to do too much',
    triggers: ['greedy'],
    budget: { maxSteps: 2 },
    async run({ tools }) {
      for (let i = 0; i < 5; i++) tools.writeArtifact(`file-${i}.md`, 'x');
      return { summary: 'should never get here' };
    },
  };

  const result = await dispatch('greedy task', {
    capabilities: [...capabilities, greedy],
    model: stubModel(stubTable),
    bus,
    runsRoot,
    runId: 'budget-run',
  });

  assert.equal(result.status, 'budget_exceeded');
  assert.equal(result.steps, 3); // two allowed writes, the third trips the budget
  const last = bus.run('budget-run').at(-1);
  assert.equal(last.type, 'handoff');
  assert.equal(last.status, 'budget_exceeded');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('run logs carry relative paths, never an absolute home directory', async () => {
  const { dir, bus, runsRoot } = scratch();
  await dispatch('research how comment auctions convert', {
    capabilities,
    model: stubModel(stubTable),
    bus,
    runsRoot,
    runId: 'paths-run',
  });

  const raw = fs.readFileSync(path.join(dir, 'log.jsonl'), 'utf8');
  assert.ok(!/:[\\/]{1,2}Users[\\/]/.test(raw), 'log contains an absolute path');
  const handoff = bus.run('paths-run').at(-1);
  assert.equal(handoff.type, 'handoff');
  assert.ok(handoff.artifacts.every((a) => a.startsWith('runs/')), 'artifact paths should be run-relative');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('an unroutable request lands in triage and invents no work', async () => {
  const { dir, bus, runsRoot } = scratch();
  const result = await dispatch('thing', {
    capabilities,
    model: stubModel(stubTable),
    bus,
    runsRoot,
    runId: 'triage-run',
  });

  assert.equal(result.capability, 'triage');
  assert.equal(result.status, 'ok');
  const note = fs.readFileSync(path.join(runsRoot, 'triage-run', 'artifacts', 'handoff.md'), 'utf8');
  assert.match(note, /Needs a human decision/);
  fs.rmSync(dir, { recursive: true, force: true });
});
