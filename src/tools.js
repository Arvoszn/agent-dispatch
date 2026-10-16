// The tool layer.
//
// Capabilities never touch the filesystem or the clock directly — they go
// through this object. That gives the runner two things it cannot get
// otherwise: a hard step budget (every tool call is a step), and a record of
// what was actually done, as opposed to what the model claimed it did.

const fs = require('fs');
const path = require('path');

class BudgetExceeded extends Error {
  constructor(message) {
    super(message);
    this.code = 'BUDGET_EXCEEDED';
  }
}

function createTools({ root, bus, runId, maxSteps = 8, displayRoot }) {
  let steps = 0;
  const artifacts = [];
  const artifactsRoot = path.join(root, 'artifacts');
  const base = displayRoot || root;

  // Paths are written to the log relative to the project root: a run log that
  // carries someone's home directory is a run log you cannot share.
  const display = (p) => path.relative(base, p).split(path.sep).join('/');

  const step = (label) => {
    steps += 1;
    bus.append({ run: runId, type: 'step', step: steps, label });
    if (steps > maxSteps) {
      bus.append({ run: runId, type: 'budget', limit: maxSteps, label });
      throw new BudgetExceeded(`step budget of ${maxSteps} exceeded at "${label}"`);
    }
    return steps;
  };

  return {
    get steps() {
      return steps;
    },
    artifacts,
    artifactsRoot,
    display,

    step,

    writeArtifact(name, content) {
      step(`write ${name}`);
      const file = path.join(artifactsRoot, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content, 'utf8');
      artifacts.push(file);
      bus.append({ run: runId, type: 'artifact', name, file: display(file), bytes: Buffer.byteLength(content) });
      return file;
    },

    appendLine(file, content) {
      step(`append ${path.basename(file)}`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, content + '\n', 'utf8');
      return file;
    },

    now() {
      return new Date().toISOString();
    },
  };
}

module.exports = { createTools, BudgetExceeded };
