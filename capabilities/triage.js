// triage: the fallback. Refusing to guess is a feature.
//
// When nothing clears the routing floor, the honest output is not a plausible
// answer — it is a written statement of what is missing, addressed to whoever
// picks the run up next. This capability never calls a model: there is nothing
// to infer.

module.exports = {
  name: 'triage',
  summary: 'Hand an unroutable request to a human with the gaps named.',
  triggers: [],
  weight: 0,
  budget: { maxSteps: 2 },

  async run({ request, tools, bus, runId }) {
    const gaps = [];
    if (request.trim().split(/\s+/).length < 4) gaps.push('the request is very short — what is the actual goal?');
    if (!/\d/.test(request)) gaps.push('no numbers, dates, or ids were given');
    if (!/(for|to|about|from)\b/i.test(request)) gaps.push('no object stated — who or what is this about?');
    if (!gaps.length) gaps.push('no capability declared a matching trigger, so the intent needs a human decision');

    const file = tools.writeArtifact(
      'handoff.md',
      [
        '# Needs a human decision',
        '',
        `Request: ${request}`,
        `Logged: ${tools.now()}`,
        '',
        '## What is missing',
        ...gaps.map((g) => `- ${g}`),
        '',
        '## Suggested next step',
        'Reply with the missing detail, or name the capability explicitly.',
        '',
      ].join('\n')
    );

    bus.append({ run: runId, type: 'note', message: 'routed to triage instead of guessing' });

    return {
      summary: `not routed confidently — ${gaps.length} gap(s) written up`,
      next: 'a human answers the questions in handoff.md',
      handoff: `Handoff note at ${tools.display(file)}. No work was invented.`,
      file,
    };
  },
};
