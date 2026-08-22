// The first-login guided tour (src/components/tour/TourOverlay.jsx). Started
// once by AppProvider's startTour(), called right after a brand-new account's
// very first successful sign-in (see consumeFirstLogin in authService.js) —
// never on a returning login, and never for an admin/owner account.
//
// Each step spotlights one real, always-reachable piece of UI via a
// `data-tour="<target>"` attribute rather than a screenshot of its own, so
// the tour can never show something the product has since stopped looking
// like:
//   - nav-exams / nav-pratique live in Nav.jsx (global chrome, mounted on
//     every route)
//   - bank-co / bank-ce / bank-eo / bank-ee live in BankExplorer.jsx — its
//     `section` (and, for CO/CE, `quiz`) state has no external control
//     otherwise, so these steps carry a `section` (and `openQuiz`), which
//     BankExplorer reads back via tourStep to force the matching tab open —
//     and, for CO/CE, to open quiz 1 for real, so the step can explain the
//     actual answer/navigation controls rather than just point at a closed
//     card. It's a genuine, freely-retakeable practice quiz, not a metered
//     attempt, so opening it costs the candidate nothing.
//   - vocab-card, grammar-topics, conjugation-tenses, dictee-steps each live
//     on their own Pratique page
//   - exam-modes lives on ExamSetup.jsx, reached by Mocks.jsx forcing its
//     `setup` state the same way — the tour stops there rather than
//     auto-starting the exam itself, since that would spend the free tier's
//     one TCF blanc attempt without the candidate having chosen to
//
// `route`, when set, is where AppProvider.nextTourStep() navigates before
// that step's target is searched for.
export const TOUR_STEPS = [
  {
    target: "nav-exams",
    title: "Bienvenue sur Passerelle !",
    body: "Quatre épreuves, chacune avec ses quiz. Un premier quiz est offert partout.",
  },
  {
    target: "bank-co",
    section: "co",
    openQuiz: true,
    route: "exams",
    title: "Compréhension orale",
    body: "Écoutez, répondez, puis Suivante. Le score s'affiche à la fin.",
  },
  {
    target: "bank-ce",
    section: "ce",
    openQuiz: true,
    route: "exams",
    title: "Compréhension écrite",
    body: "Lisez le texte, répondez, puis Suivante.",
  },
  {
    target: "bank-eo",
    section: "eo",
    route: "exams",
    title: "Expression orale",
    body: "Enregistrez-vous sur un vrai sujet : l'IA évalue votre niveau.",
  },
  {
    target: "bank-ee",
    section: "ee",
    route: "exams",
    title: "Expression écrite",
    body: "Rédigez sur un vrai sujet : l'IA vous renvoie votre niveau et une version corrigée.",
  },
  {
    target: "nav-pratique",
    title: "La Pratique",
    body: "Vocabulaire, grammaire, conjugaison, dictée — à votre rythme, sans chrono.",
  },
  {
    target: "vocab-card",
    route: "vocabulary",
    title: "Vocabulaire",
    body: "Cliquez pour révéler la définition, puis passez au mot suivant.",
  },
  {
    target: "grammar-topics",
    route: "grammar",
    title: "Grammaire",
    body: "Une leçon courte, puis des exercices corrigés aussitôt.",
  },
  {
    target: "conjugation-tenses",
    route: "conjugation",
    title: "Conjugaison",
    body: "Neuf temps à travailler, chacun avec sa leçon et ses exercices.",
  },
  {
    target: "dictee-steps",
    route: "dictee",
    title: "La dictée",
    body: "Un texte lu à voix haute, que vous écrivez sans aide.",
  },
  {
    target: "exam-modes",
    route: "mocks",
    title: "Le TCF blanc",
    body: "Réaliste pour les conditions d'examen, Entraînement pour vous exercer sans chrono. Cliquez sur Commencer quand vous êtes prêt.",
  },
];
