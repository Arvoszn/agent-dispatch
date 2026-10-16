// research: turn a question into a short, cited-by-hand brief file.
//
// Every capability returns the same shape: { summary, next, handoff }. The
// summary is what the run log shows, `next` is what the following agent
// should do, and `handoff` is the human-readable note kept with the run.

module.exports = {
  name: 'research',
  summary: 'Collect the facts a later step can write from.',
  triggers: ['research', 'find out', 'look up', 'compare', 'sources', 'investigate', 'brief', 'what is'],
  weight: 1,
  budget: { maxSteps: 4 },

  async run({ request, model, tools }) {
    const { text } = await model.complete({
      system: 'You collect facts and label them plainly. No filler.',
      prompt: `Task: research brief\nRequest: ${request}\nReturn 3 short bullet points, each with the source type in brackets.`,
    });

    const file = tools.writeArtifact(
      'brief.md',
      [`# Brief`, '', `Request: ${request}`, `Written: ${tools.now()}`, '', text, ''].join('\n')
    );

    return {
      summary: `brief written with 3 points (${text.split('\n').filter(Boolean).length} lines)`,
      next: 'draft from the brief',
      handoff: `Brief is at ${tools.display(file)}. Next agent should draft from it rather than re-researching.`,
      file,
    };
  },
};
