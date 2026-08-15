// How much of a dictée is read out at a time.
//
// The server sends ATOMS — the finest sense groups of the text, one recording
// each (api/_lib/dictee.js → splitGroups). Everything longer is built here, by
// joining runs of consecutive atoms and playing their recordings back to back.
// That is the whole reason the setting is free: three listening lengths, one
// Groq generation, one Azure synthesis, one row in the cache.
//
// Two rules the joining never breaks:
//   • a segment never crosses a sentence end — a full stop is where a reader
//     stops, and running two sentences together to reach a word target would
//     undo the thing the atom splitter was careful about;
//   • no segment is left with a handful of words when it could ride along with
//     the one before it, so a sentence never ends in a two-word scrap.
//
// Pure module, no imports of its own, so tests run it exactly as the browser
// does during a live dictée.

// `target` is the word count a segment grows toward, not a promise: growth
// stops at the first atom boundary that reaches it, so the real length is the
// target plus whatever the last atom carried. Named by level rather than by
// number because a number does not tell a candidate which one to pick.
export const SEGMENT_MODES = [
  { id: "court", label: "Débutant", hint: "un groupe de sens", words: "~5 mots", target: 0 },
  { id: "moyen", label: "Standard", hint: "deux groupes", words: "~10 mots", target: 10 },
  { id: "phrase", label: "Examen", hint: "la phrase entière", words: "comme le jour J", target: Infinity },
];

export const DEFAULT_SEGMENT_MODE = "moyen";

export const segmentMode = (id) =>
  SEGMENT_MODES.find((m) => m.id === id) || SEGMENT_MODES.find((m) => m.id === DEFAULT_SEGMENT_MODE);

const MIN_SEGMENT = 4; // below this a segment is folded into the one before it

const wordCount = (s) => (String(s).match(/[\p{L}\p{N}]+/gu) || []).length;

// Whether this atom closes a sentence. Derived from the atom's own punctuation
// rather than stored alongside it: a parallel array would be one more thing
// that can fall out of step with the recordings, and the text is already there.
// Closing quotes ride along with the terminator they follow.
export const endsSentence = (atom) => /[.!?…]\s*["»']*$/.test(String(atom).trim());

// Runs of atoms, each run one thing the candidate hears and types.
// Returns [{ from, to, text, words }], `from`/`to` inclusive atom indices —
// the indices are what the player uses to queue the right recordings.
export function buildSegments(atoms, target) {
  const list = Array.isArray(atoms) ? atoms.filter((a) => typeof a === "string" && a.trim()) : [];
  if (!list.length) return [];

  const spans = [];
  let from = 0;
  let words = 0;
  for (let i = 0; i < list.length; i++) {
    words += wordCount(list[i]);
    // The sentence end is a hard stop; the target is a soft one. `i === last`
    // closes the final span for a text whose last sentence has no full stop.
    const hard = endsSentence(list[i]) || i === list.length - 1;
    // Stop BEFORE overshooting rather than after reaching the target. Growing
    // until the count passes it lets the atom that tips the scale land entirely
    // inside the segment, so a "~10 mots" setting fed two seven-word groups
    // would hand out fourteen — the one length the candidate did not choose.
    const overshoots = i + 1 < list.length && words + wordCount(list[i + 1]) > target;
    if (hard || overshoots) {
      spans.push({ from, to: i });
      from = i + 1;
      words = 0;
    }
  }

  // Fold a scrap into a neighbour — but only one inside the same sentence, so
  // a genuinely short sentence ("Il faut agir.") stays the short segment it
  // honestly is instead of being glued to the sentence after it.
  //
  // Backwards first, since a segment reads better finishing a thought than
  // opening one; forwards only when the scrap IS the start of its sentence and
  // has nothing behind it to join.
  //
  // The threshold is capped by the target: on the shortest setting the target
  // is zero and every atom is meant to stand alone, so there is nothing to
  // call a scrap and this loop correctly does nothing at all.
  const floor = Math.min(MIN_SEGMENT, target);
  for (let i = spans.length - 1; i >= 0; i--) {
    const span = spans[i];
    if (wordCount(list.slice(span.from, span.to + 1).join(" ")) >= floor) continue;
    const prev = i > 0 ? spans[i - 1] : null;
    if (prev && !endsSentence(list[prev.to])) {
      prev.to = span.to;
      spans.splice(i, 1);
      continue;
    }
    const next = spans[i + 1];
    if (next && !endsSentence(list[span.to])) {
      next.from = span.from;
      spans.splice(i, 1);
    }
  }

  return spans.map(({ from: a, to: b }) => {
    const text = list.slice(a, b + 1).join(" ");
    return { from: a, to: b, text, words: wordCount(text) };
  });
}
