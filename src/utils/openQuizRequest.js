// "Open this bank quiz" across a page change — the Carnet d'erreurs's
// « Refaire ce quiz » sends the candidate to Épreuves with one quiz to open.
// sessionStorage, read once: a refresh of Épreuves later must not reopen it.
const KEY = "open-quiz-request";

export function requestOpenQuiz(quizId) {
  try { sessionStorage.setItem(KEY, String(quizId)); } catch { /* blocked: the page opens on its grid */ }
}

export function takeOpenQuizRequest() {
  try {
    const id = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return id;
  } catch {
    return null;
  }
}
