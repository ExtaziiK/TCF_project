// Pure helpers for the vocabulary exercises (« Le mot précis », « Le bon
// connecteur »). No React, no I/O — tests/vocab-deck.test.mjs holds them to
// the data.

export const BLANK = "___";

// An answer ending in an apostrophe (« Bien qu’ ») joins the next word.
const glues = (s) => /['’]$/.test(s);

// The connector sentence with its blank filled.
export function fillBlank(sentence, word) {
  return String(sentence).replace(/___ ?/, (m) => (glues(word) ? word : word + (m.endsWith(" ") ? " " : "")));
}

// The « mot précis » sentence with the vague passage replaced.
export const replaceVague = (sentence, vague, word) => String(sentence).replace(vague, word);

// The four choices of one item, in a stable random order for that round.
export function choicesFor(item, rnd = Math.random) {
  const all = [item.answer, ...item.distractors];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

// A round: every item once, shuffled, so nothing repeats until all are seen.
export function roundOrder(items, rnd = Math.random) {
  const ids = items.map((x) => x.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}
