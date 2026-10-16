// ledger: read amounts out of a request and append them to a running record.
//
// This is the capability that shows why the tool layer exists: the numbers come
// from parsing the request, not from the model's imagination, and the write is
// counted against the same step budget as everything else.

const path = require('path');

const AMOUNT = /(?:₱|php|\$|usd)\s?([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s?(?:php|pesos?|usd|dollars?)/gi;

function parseAmounts(request) {
  const found = [];
  for (const match of String(request).matchAll(AMOUNT)) {
    const raw = (match[1] || match[2] || '').replace(/,/g, '');
    const value = Number(raw);
    if (Number.isFinite(value)) found.push(value);
  }
  return found;
}

module.exports = {
  name: 'ledger',
  summary: 'Record amounts from a request into an append-only ledger.',
  triggers: ['log', 'ledger', 'record', 'payment', 'paid', 'amount', 'invoice', 'sales', 'bid', 'deposit'],
  weight: 1,
  budget: { maxSteps: 3 },

  async run({ request, tools, bus, runId }) {
    const amounts = parseAmounts(request);
    if (amounts.length === 0) {
      return {
        summary: 'no amounts found in the request',
        next: 'ask for the figure before recording anything',
        handoff: 'Nothing was written: the request contained no parseable amount.',
      };
    }

    const ledgerFile = path.join(path.dirname(tools.artifactsRoot), 'ledger.jsonl');
    let running = 0;
    for (const amount of amounts) {
      running += amount;
      tools.appendLine(ledgerFile, JSON.stringify({ at: tools.now(), amount, requestedBy: request }));
    }

    bus.append({ run: runId, type: 'note', message: `recorded ${amounts.length} amount(s), total ${running}` });

    return {
      summary: `recorded ${amounts.length} amount(s) totalling ${running}`,
      next: 'reconcile against the bank or GCash statement',
      handoff: `Ledger at ${tools.display(ledgerFile)}. Totals came from parsing the request text, not from a model.`,
      ledgerFile,
    };
  },
};
