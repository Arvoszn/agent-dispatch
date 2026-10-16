// The capability set. Order does not matter — routing scores every entry —
// but the fallback (triage) must be present, because the runner falls back to
// it by name when nothing clears the confidence floor.

module.exports = [
  require('./research'),
  require('./draft'),
  require('./ledger'),
  require('./triage'),
];
