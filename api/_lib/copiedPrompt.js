// Did the candidate submit the consigne back to us instead of writing?
//
// It happens often enough to matter — a candidate selects the subject to read
// it, pastes into the answer box by reflex, and submits. The model USUALLY
// notices, but "usually" is the problem: one run called it out and capped the
// score, another graded the copied documents as though they were the
// candidate's own prose and awarded a level for them. A candidate told they
// reached B2 for pasting the question has been actively misled.
//
// This is a deterministic check, so it should be computed rather than left to
// the grader to spot. Measured on the ANSWER's n-grams: what share of what they
// submitted already appears in the subject. Anchoring it that way means a long
// consigne cannot dilute the signal, and a candidate who legitimately quotes a
// phrase or two from the documents still passes.
const NGRAM = 5;

const wordsOf = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

export function copiedShare(answer, prompt) {
  const a = wordsOf(answer);
  const p = wordsOf(prompt);
  if (a.length < NGRAM || p.length < NGRAM) return 0;
  const gramsOf = (w) => new Set(Array.from({ length: w.length - NGRAM + 1 }, (_, i) => w.slice(i, i + NGRAM).join(" ")));
  const ga = gramsOf(a);
  const gp = gramsOf(p);
  let hits = 0;
  for (const g of ga) if (gp.has(g)) hits++;
  return hits / ga.size;
}

// Above this the submission is the subject, not an answer: refuse to grade it
// rather than spend a call producing a level for text the candidate did not
// write. Set high so quoting the documents, which is legitimate in an
// argumentative text, is never mistaken for copying the lot.
export const COPIED_HARD = 0.7;
// Between the two, grade normally but tell the grader what it is looking at.
export const COPIED_WARN = 0.4;
