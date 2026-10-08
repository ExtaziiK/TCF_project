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
// Nothing is under review right now. Past entries (2026-10-07): CO 26, rebuilt
// on the real Série 26 recordings; CO 13, 33, 35 and 38, whose Q34/Q35 played
// recordings their options didn't belong to and were given new options.
export const QUIZZES_UNDER_REVIEW = {};

export const isUnderReview = (quiz) =>
  !!quiz && (QUIZZES_UNDER_REVIEW[quiz.section] || []).includes(quiz.quizNumber);
