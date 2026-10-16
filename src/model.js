// Model adapters.
//
// The dispatcher needs exactly one thing from a model: complete({ system, prompt })
// returning { text, tokens }. Everything else — routing, budgets, logging,
// handoff — is independent of which model answers, which is the whole point of
// keeping the adapter this thin.
//
// `stubModel` answers from a table, deterministically. That means the demo,
// the tests, and anyone who clones the repo get a working end-to-end run with
// no API key and no network. Swap in `httpModel` when you want a real one.

function stubModel(table) {
  const entries = Object.entries(table);

  return {
    name: 'stub',
    async complete({ prompt }) {
      const text = String(prompt || '');
      for (const [needle, answer] of entries) {
        if (text.toLowerCase().includes(needle.toLowerCase())) {
          return { text: typeof answer === 'function' ? answer(text) : answer, tokens: 0 };
        }
      }
      return { text: '[stub] no canned answer matched this prompt', tokens: 0 };
    },
  };
}

// Minimal OpenAI-compatible chat adapter. The key is read from the environment
// and never passed around; nothing is logged that could contain it.
function httpModel({ endpoint = 'https://api.openai.com/v1/chat/completions', model = 'gpt-4o-mini', apiKey = process.env.OPENAI_API_KEY, system = 'You are a terse operations assistant.' } = {}) {
  if (!apiKey) throw new Error('httpModel: set OPENAI_API_KEY or pass apiKey');

  return {
    name: `http:${model}`,
    async complete({ prompt, system: override }) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: override || system },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`model request failed: ${res.status} ${await res.text()}`);
      const body = await res.json();
      return {
        text: body.choices?.[0]?.message?.content ?? '',
        tokens: body.usage?.total_tokens ?? 0,
      };
    },
  };
}

module.exports = { stubModel, httpModel };
