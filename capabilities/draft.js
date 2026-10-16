// draft: write the deliverable, and check it against the brief when one exists.

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'draft',
  summary: 'Produce the written deliverable.',
  triggers: ['draft', 'write', 'compose', 'email', 'caption', 'copy', 'message', 'post'],
  weight: 1,
  budget: { maxSteps: 5 },

  async run({ request, model, tools, bus, runId }) {
    // A brief written earlier in the same run is used as the source, which is
    // the cheap version of "don't redo the previous agent's work".
    const briefPath = path.join(tools.artifactsRoot, 'brief.md');
    let brief = '';
    if (fs.existsSync(briefPath)) {
      brief = fs.readFileSync(briefPath, 'utf8');
      bus.append({ run: runId, type: 'note', message: 'used the existing brief' });
    }

    const { text } = await model.complete({
      prompt: `Task: draft deliverable\nRequest: ${request}\n${brief ? `Brief: ${brief}` : 'No brief supplied.'}`,
    });

    const file = tools.writeArtifact(
      'draft.md',
      [`# Draft`, '', `Request: ${request}`, `Written: ${tools.now()}`, '', text, ''].join('\n')
    );

    return {
      summary: `draft written (${text.length} chars)`,
      next: 'human review before sending',
      handoff: `Draft is at ${tools.display(file)}. It has not been sent anywhere.`,
      file,
    };
  },
};
