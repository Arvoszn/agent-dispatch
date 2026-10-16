#!/usr/bin/env node
// Usage:
//   node src/cli.js "log a payment of PHP 650 from spawntest"
//   node src/cli.js demo                 # five sample requests, offline
//   node src/cli.js log [runId]          # print the raw run log
//   node src/cli.js handoff [runId]      # print the resume briefing
//   node src/cli.js report [runId]       # write runs/report-<runId>.html
//   node src/cli.js runs                 # list run ids
//
// Runs land in runs/ (gitignored): runs/log.jsonl plus one folder per run
// holding that run's artifacts.

const fs = require('fs');
const path = require('path');

const { Bus } = require('./bus');
const { dispatch } = require('./runner');
const { stubModel } = require('./model');
const { renderReport } = require('./report');
const capabilities = require('../capabilities');
const stubTable = require('../demo/stub-table');

const ROOT = path.join(__dirname, '..');
const RUNS = path.join(ROOT, 'runs');
const bus = new Bus(path.join(RUNS, 'log.jsonl'));

const model = stubModel(stubTable);

async function runRequest(request) {
  const result = await dispatch(request, { capabilities, model, bus, runsRoot: RUNS });
  const route = bus.run(result.runId).find((e) => e.type === 'route');
  console.log(`\n  request    ${request}`);
  console.log(`  routed to  ${result.capability} (confidence ${route.confidence}${route.viaFallback ? ', fallback' : ''})`);
  console.log(`  matched    ${route.matched.join(', ') || '—'}`);
  console.log(`  status     ${result.status} after ${result.steps} step(s)`);
  console.log(`  summary    ${result.summary}`);
  console.log(`  next       ${result.next}`);
  console.log(`  run id     ${result.runId}`);
  return result;
}

function latestRunId() {
  const runs = bus.runs();
  return runs[runs.length - 1];
}

(async () => {
  const [command, ...rest] = process.argv.slice(2);
  const arg = rest.join(' ');

  if (!command) {
    console.log('usage: node src/cli.js "<request>" | demo | log [runId] | handoff [runId] | report [runId] | runs');
    process.exit(1);
  }

  if (command === 'demo') {
    console.log('Offline demo run (stub model, no network, no API key)');
    const { requests } = require('../demo/scenario');
    const ids = [];
    for (const request of requests) {
      const result = await runRequest(request);
      ids.push(result.runId);
    }
    console.log(`\n  ${ids.length} runs written. Latest report:  node src/cli.js report ${ids[ids.length - 1]}\n`);
    return;
  }

  if (command === 'runs') {
    for (const id of bus.runs()) console.log(id);
    return;
  }

  if (command === 'log') {
    const runId = arg || latestRunId();
    if (!runId) return console.log('no runs yet — try: node src/cli.js demo');
    for (const e of bus.run(runId)) {
      const detail = e.type === 'step' ? e.label : e.type === 'route' ? `${e.picked} (${e.confidence})` : e.type === 'handoff' ? `${e.status} · ${e.summary}` : e.type === 'request' ? e.text : e.message || e.name || '';
      console.log(`${e.at}  ${String(e.type).padEnd(9)} ${detail}`);
    }
    return;
  }

  if (command === 'handoff') {
    const runId = arg || latestRunId();
    if (!runId) return console.log('no runs yet — try: node src/cli.js demo');
    const h = bus.run(runId).find((e) => e.type === 'handoff');
    if (!h) return console.log(`${runId}: no handoff recorded (that would be a bug)`);
    console.log(`RUN ${h.runId}\n  capability  ${h.capability}\n  request     ${h.request}\n  status      ${h.status} (${h.steps} steps)\n  summary     ${h.summary}\n  next        ${h.next}\n  note        ${h.note}\n  artifacts   ${h.artifacts.join(', ') || '—'}`);
    return;
  }

  if (command === 'report') {
    const runId = arg || latestRunId();
    if (!runId) return console.log('no runs yet — try: node src/cli.js demo');
    const events = bus.run(runId);
    if (!events.length) return console.log(`no events for run ${runId}`);
    const file = path.join(RUNS, `report-${runId}.html`);
    fs.writeFileSync(file, renderReport(runId, events), 'utf8');
    console.log(file);
    return;
  }

  // anything else is treated as the request itself
  const request = [command, ...rest].join(' ');
  await runRequest(request);
})();
