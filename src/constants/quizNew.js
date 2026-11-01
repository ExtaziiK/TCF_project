// Quizzes recently added to the bank. Their card in the Épreuves grid carries
// a "Nouveau" badge, and the landing page and the member dashboard show a chip
// that points to them.
//
// Keyed by section, valued by quiz number (metadata.serie_number / the number
// in the file name), like constants/quizReview.js.
//
// To retire the badge and the chips: empty this object and redeploy.
//
// 2026-11-01: CE and CO Quiz 41–43, built from the bank's least-repeated
// questions (each question's `source` field names the quiz it came from).
export const NEW_QUIZZES = { ce: [41, 42, 43], co: [41, 42, 43] };

export const isNewQuiz = (quiz) =>
  !!quiz && (NEW_QUIZZES[quiz.section] || []).includes(quiz.quizNumber);

export const newQuizCount = (section) => (NEW_QUIZZES[section] || []).length;
