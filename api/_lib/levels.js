// Official IRCC equivalences for the PRODUCTIVE épreuves (expression écrite and
// orale), which the TCF Canada scores out of 20 — not on a 699 scale, and not
// in CEFR letters.
//
// This is why the AI is asked for a score /20 rather than a CEFR level: /20 is
// the scale a real TCF rater works on, and it is what the candidate will see on
// their score report. Deriving the letter and the NCLC from the official table
// then costs nothing and cannot contradict itself — a model asked for both at
// once will happily answer "B2" and an NCLC that does not correspond.
//
// Mirrors the `eo`/`ee` rows of CEFR_BANDS and BANDS in src/utils/nclc.js. They
// are duplicated rather than imported because that module resolves Vite aliases
// ("@/utils/…") the serverless runtime cannot. Same official source; change one,
// change the other.

// Score /20 → CEFR. Below 4 the TCF reports no level.
const CEFR_BANDS = [[16, 20, "C2"], [14, 15, "C1"], [10, 13, "B2"], [6, 9, "B1"], [4, 5, "A2"]];
// Score /20 → NCLC. Below 4 there is no NCLC to award.
const NCLC_BANDS = [[16, 20, 10], [14, 15, 9], [12, 13, 8], [10, 11, 7], [7, 9, 6], [6, 6, 5], [4, 5, 4]];

const band = (bands, score) => bands.find(([lo, hi]) => score >= lo && score <= hi)?.[2] ?? null;

// Clamps to the reportable range and rounds: the model sometimes answers "13.5",
// and the TCF only ever awards whole points.
export function levelsFromScore(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { score: null, level: "", nclc: null };
  const score = Math.max(0, Math.min(20, Math.round(n)));
  return { score, level: band(CEFR_BANDS, score) || "", nclc: band(NCLC_BANDS, score) };
}
