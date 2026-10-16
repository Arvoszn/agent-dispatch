// Routing.
//
// Routing is deliberately boring and explainable: tokenise the request, count
// declared triggers, weight phrase matches above single words, and require the
// winner to clear a confidence floor before it is trusted. If nothing clears
// it, the request is *not* guessed at — it goes to triage, which writes a
// handoff note instead of pretending to work.
//
// Every decision returns its own reasoning so the log can answer "why did it do
// that?" months later.

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'for', 'with', 'from', 'in', 'on', 'at', 'is', 'it', 'this', 'that', 'my', 'our', 'please']);

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

function scoreCapability(request, capability) {
  const text = String(request).toLowerCase();
  const tokens = new Set(tokenize(request));
  const matched = [];
  let score = 0;

  for (const trigger of capability.triggers || []) {
    const needle = trigger.toLowerCase();
    if (needle.includes(' ')) {
      if (text.includes(needle)) {
        score += 3;
        matched.push(trigger);
      }
      continue;
    }
    if (tokens.has(needle)) {
      score += 1;
      matched.push(trigger);
    }
  }

  score *= capability.weight ?? 1;
  return { score, matched };
}

function route(request, capabilities, { minConfidence = 0.45 } = {}) {
  const scored = capabilities
    .map((capability) => ({ capability, ...scoreCapability(request, capability) }))
    .sort((a, b) => b.score - a.score);

  const total = scored.reduce((sum, s) => sum + s.score, 0);
  const best = scored[0];
  const confidence = total > 0 ? best.score / total : 0;

  if (!best || best.score === 0 || confidence < minConfidence) {
    return {
      picked: null,
      confidence,
      matched: best ? best.matched : [],
      rejected: scored.filter((s) => s.score > 0).map(({ capability, score, matched }) => ({ name: capability.name, score, matched })),
      reason:
        total === 0
          ? 'no capability declared a matching trigger'
          : `best match (${best.capability.name}) only reached confidence ${confidence.toFixed(2)}, below the ${minConfidence} floor`,
    };
  }

  return {
    picked: best.capability,
    confidence,
    matched: best.matched,
    rejected: scored.slice(1).filter((s) => s.score > 0).map(({ capability, score, matched }) => ({ name: capability.name, score, matched })),
    reason: `matched ${best.matched.join(', ')}; confidence ${confidence.toFixed(2)} over ${scored.filter((s) => s.score > 0).length} candidate(s)`,
  };
}

module.exports = { route, scoreCapability, tokenize };
