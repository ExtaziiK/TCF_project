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
//     `section` state has no external control otherwise, so these steps also
//     carry a `section`, which BankExplorer reads back via tourStep to force
//     the matching tab open (the same way Nav force-opens "Pratique")
//   - vocab-card, grammar-topics, conjugation-tenses, dictee-steps each live
//     on their own Pratique page
//   - mocks-start lives on the Mocks.jsx lobby
//
// `route`, when set, is where AppProvider.nextTourStep() navigates before
// that step's target is searched for.
export const TOUR_STEPS = [
  {
    target: "nav-exams",
    title: "Bienvenue sur Passerelle !",
    body: "Commençons par « Épreuves » : les quatre compétences du TCF Canada, chacune avec ses propres quiz. Un premier quiz est offert dans chaque épreuve.",
  },
  {
    target: "bank-co",
    section: "co",
    route: "exams",
    title: "Compréhension orale",
    body: "Des quiz audio, dans le format officiel. Écoutez, répondez, et votre score se calcule automatiquement à la fin.",
  },
  {
    target: "bank-ce",
    section: "ce",
    route: "exams",
    title: "Compréhension écrite",
    body: "Des textes suivis de questions, comme à l'examen. La difficulté progresse au fil des quiz — avancez à votre rythme.",
  },
  {
    target: "bank-eo",
    section: "eo",
    route: "exams",
    title: "Expression orale",
    body: "Un atelier de pratique : vous vous enregistrez sur un vrai sujet, puis une correction IA détaillée évalue votre niveau CECRL.",
  },
  {
    target: "bank-ee",
    section: "ee",
    route: "exams",
    title: "Expression écrite",
    body: "Le même principe à l'écrit : vous rédigez sur un sujet réel, et l'IA vous renvoie votre niveau, vos points à corriger et une version réécrite.",
  },
  {
    target: "nav-pratique",
    title: "La Pratique",
    body: "Vocabulaire, grammaire, conjugaison et dictée : de quoi retravailler une notion précise, à votre rythme et sans limite de temps.",
  },
  {
    target: "vocab-card",
    route: "vocabulary",
    title: "Vocabulaire",
    body: "Une carte à la fois : cliquez pour révéler la définition, puis passez au mot suivant. Marquez vos favoris pour les retrouver plus tard.",
  },
  {
    target: "grammar-topics",
    route: "grammar",
    title: "Grammaire",
    body: "Des leçons courtes, un sujet à la fois : la règle, puis des exercices corrigés immédiatement. Dix minutes suffisent.",
  },
  {
    target: "conjugation-tenses",
    route: "conjugation",
    title: "Conjugaison",
    body: "Neuf temps à travailler, chacun avec sa leçon et ses exercices. Choisissez d'écrire la réponse ou de la sélectionner — comme vous préférez.",
  },
  {
    target: "dictee-steps",
    route: "dictee",
    title: "La dictée",
    body: "Un texte de niveau C1/C2 lu à voix haute, que vous écrivez sans aide. La correction vous dit précisément d'où viennent vos fautes.",
  },
  {
    target: "mocks-start",
    route: "mocks",
    title: "Le TCF blanc",
    body: "Le test complet, dans les conditions de l'examen et noté sur 699. Prêt à découvrir votre niveau ?",
  },
];
