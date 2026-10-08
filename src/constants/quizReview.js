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
// Nothing is under review right now. Last entry: CO Quiz 26 (2026-10-07),
// hidden after a member reported Série 25 answers over Série 26 audio, and
// reopened once rebuilt on the real Série 26 recordings.
export const QUIZZES_UNDER_REVIEW = {};

export const isUnderReview = (quiz) =>
  !!quiz && (QUIZZES_UNDER_REVIEW[quiz.section] || []).includes(quiz.quizNumber);
