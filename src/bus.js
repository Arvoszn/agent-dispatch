// Append-only run log.
//
// One JSON object per line (JSONL) so a run can be tailed while it is still
// being written, replayed later, or filtered by run id without loading the
// whole file into a parser. Nothing here ever mutates an earlier line: a
// handoff is written by appending, which is what makes the log trustworthy
// when two agents touch the same run.

const fs = require('fs');
const path = require('path');

class Bus {
  constructor(file) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, '');
  }

  append(event) {
    const row = { at: new Date().toISOString(), ...event };
    fs.appendFileSync(this.file, JSON.stringify(row) + '\n', 'utf8');
    return row;
  }

  read() {
    return fs
      .readFileSync(this.file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  run(runId) {
    return this.read().filter((e) => e.run === runId);
  }

  runs() {
    return [...new Set(this.read().map((e) => e.run))];
  }
}

module.exports = { Bus };
