// The runner: one request in, one logged run out.
//
// Order of operations, deliberately fixed:
//   1. log the request (before anything can fail)
//   2. route, and log the decision *with its reasoning*
//   3. run the chosen capability behind a step budget
//   4. log a handoff summary, whatever happened
//
// Step 4 runs in a `finally`, so a crashed capability still leaves a run that
// the next agent can pick up. A run that ends without a handoff is a bug.

const path = require('path');
const { route } = require('./router');
const { createTools } = require('./tools');

function newRunId(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
  ].join('') + '-' + [pad(now.getUTCHours()), pad(now.getUTCMinutes()), pad(now.getUTCSeconds())].join('') + '-' + Math.random().toString(36).slice(2, 6);
}

async function dispatch(request, options) {
  const {
    capabilities,
    model,
    bus,
    runsRoot,
    minConfidence = 0.45,
    defaultMaxSteps = 8,
    displayRoot,
    runId = newRunId(),
  } = options;

  bus.append({ run: runId, type: 'request', text: request });

  const decision = route(request, capabilities, { minConfidence });
  const capability = decision.picked || capabilities.find((c) => c.name === 'triage');
  if (!capability) throw new Error('no capability available, and no triage capability to fall back on');

  bus.append({
    run: runId,
    type: 'route',
    picked: capability.name,
    viaFallback: !decision.picked,
    confidence: Number(decision.confidence.toFixed(3)),
    matched: decision.matched,
    rejected: decision.rejected,
    reason: decision.reason,
  });

  const tools = createTools({
    root: path.join(runsRoot, runId),
    bus,
    runId,
    maxSteps: capability.budget?.maxSteps ?? defaultMaxSteps,
    displayRoot: displayRoot || path.dirname(runsRoot),
  });

  let status = 'ok';
  let result = null;

  try {
    result = (await capability.run({ request, model, tools, bus, runId, capability })) || {};
  } catch (error) {
    status = error.code === 'BUDGET_EXCEEDED' ? 'budget_exceeded' : 'failed';
    bus.append({ run: runId, type: 'error', code: error.code || 'ERROR', message: error.message });
  } finally {
    const handoff = {
      run: runId,
      type: 'handoff',
      request,
      capability: capability.name,
      status,
      steps: tools.steps,
      artifacts: tools.artifacts.map((a) => tools.display(a)),
      summary: result?.summary ?? 'no summary produced',
      next: result?.next ?? 'nothing queued',
      note: result?.handoff ?? '',
    };
    bus.append(handoff);
    return { ...handoff, runId, decision };
  }
}

module.exports = { dispatch, newRunId };
