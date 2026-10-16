// Canned answers for the offline stub model, keyed by a phrase the prompt
// contains. Two capabilities ask for a bullet brief and a deliverable, so the
// table only needs those two shapes plus a default.
//
// Replace this file (and pass `httpModel()`) to run the same pipeline against a
// real model — nothing else in src/ needs to change.

const BRIEF = [
  '- Live comment auctions convert best when the price ladder is visible to everyone in the thread [seller interviews]',
  '- Buyers abandon when payment instructions arrive more than a few minutes after a claim [support tickets]',
  '- Recorded sales need a written ledger line per claim, because the live thread scrolls away [internal note]',
].join('\n');

const DRAFT = [
  '**Comment auction — how the claim window works**',
  '',
  'Open ascending bids on Mine / Steal / Grab. The claim is what locks the item.',
  'Winner gets the price ladder and the payment instructions in a private reply,',
  'and the ledger records one line per claim so nothing depends on recalling a',
  'scrolling thread. Payment review happens before fulfilment, not after.',
].join('\n');

module.exports = {
  'bullet points': BRIEF,
  'Task: research brief': BRIEF,
  'Task: draft deliverable': DRAFT,
  default: 'No canned answer for this prompt — swap in a real model adapter to see live output.',
};
