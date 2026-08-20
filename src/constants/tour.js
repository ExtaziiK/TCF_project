// The first-login guided tour (src/components/tour/TourOverlay.jsx). Started
// once by AppProvider's startTour(), called right after a brand-new account's
// very first successful sign-in (see consumeFirstLogin in authService.js) —
// never on a returning login, and never for an admin/owner account.
//
// Each step spotlights one real, always-reachable piece of UI via a
// `data-tour="<target>"` attribute — two live in Nav.jsx (global chrome,
// mounted on every route) and the last lives on the Mocks.jsx lobby — rather
// than a screenshot of its own, so the tour can never show something the
// product has since stopped looking like. `route`, when set, is where
// AppProvider.nextTourStep() navigates before that step's target is searched
// for.
export const TOUR_STEPS = [
  {
    target: "nav-exams",
    title: "Bienvenue sur Passerelle !",
    body: "Commençons par « Épreuves » : les quatre compétences du TCF Canada, chacune avec ses propres quiz. Un premier quiz est offert dans chaque épreuve.",
  },
  {
    target: "nav-pratique",
    title: "La Pratique",
    body: "Vocabulaire, grammaire, conjugaison et dictée : de quoi retravailler une notion précise, à votre rythme et sans limite de temps.",
  },
  {
    target: "mocks-start",
    route: "mocks",
    title: "Le TCF blanc",
    body: "Le test complet, dans les conditions de l'examen et noté sur 699. Prêt à découvrir votre niveau ?",
  },
];
