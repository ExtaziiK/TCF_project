// Quizzes pulled from members while their content is being corrected. A
// listed quiz stays in the bank (staff still open it from the grid to check
// the fix), but candidates see a locked "En révision" card, the TCF blanc never
// draws it, and the revision sheets leave its questions out.
//
// Keyed by section, valued by quiz number (the series number shown on the card
// and in metadata.serie_number) — not by grid position, which shifts whenever
// a quiz is added.
//
// To put a quiz back online: remove its number here and redeploy.
//
// Previous entry: CO Quiz 26 (2026-10-07), hidden after a member reported
// Série 25 answers over Série 26 audio, reopened once rebuilt.
export const QUIZZES_UNDER_REVIEW = {
  // One question in each plays a recording its four options don't belong to
  // (found in the 2026-10-07 bank audit): Q34 of 13 and 33 is a report on car
  // sound design under the options of a climate question; Q35 of 35 and 38 has
  // garbled options for a report on the Québec forest industry.
  co: [13, 33, 35, 38],
};

export const isUnderReview = (quiz) =>
  !!quiz && (QUIZZES_UNDER_REVIEW[quiz.section] || []).includes(quiz.quizNumber);
