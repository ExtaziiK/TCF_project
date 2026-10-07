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
export const QUIZZES_UNDER_REVIEW = {
  // Série 26 shipped with Série 25's audio, answers and transcripts under
  // Série 26's images, so the recordings never matched the pictures and right
  // answers were graded wrong (reported by a member, 2026-10-07).
  co: [26],
};

export const isUnderReview = (quiz) =>
  !!quiz && (QUIZZES_UNDER_REVIEW[quiz.section] || []).includes(quiz.quizNumber);
