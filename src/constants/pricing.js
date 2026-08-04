// Access passes, priced in USD. `accent` grades along the brand gradient from
// blue up through red, then gold for the top VIP tier. `price` / `per` are
// static fallbacks shown instantly; useLivePlans overlays the live Stripe
// amount.
// NOTE: the per-day AI-SIMULATION quotas below are now enforced, per épreuve,
// against the plan_label baked into app_metadata at checkout — Passeport 2,
// Visa 6, Première classe and VIP unlimited (api/_lib/auth.js:DAILY_SITTINGS,
// counted in public.ai_sittings). A "simulation" is one sitting: it opens on
// the first AI analysis and stays open while the candidate works, so a whole
// Expression écrite counts once. Paid accounts are additionally paced at 3
// analyses per tâche per 5 minutes. Keep these numbers in sync with the cards.
// The per-day MOCK-EXAM quotas are still marketing copy: nothing enforces them.
// The quiz counts, by contrast, now describe what actually
// happens: every paid pass unlocks the whole bank (40 CE + 40 CO), because
// BankExplorer only locks quizzes for ROLES.FREE_USER. Keep the counts in
// sync with src/bank if the bank grows.
// The DEVICE limits are likewise enforced, via the active-session
// mechanism (profiles.active_session_ids + claim_device_session):
// Première classe → 2 simultaneous devices, VIP → 4, other plans → 1. Over the
// limit, the newest login wins and the oldest device is signed out — a login is
// never refused for this reason.
export const PLANS = [
  {
    name: "Sans papier",
    price: "$0",
    per: "pour toujours",
    accent: "blue",
    cta: "Créer un compte",
    featured: false,
    slug: null, // free plan: nothing to buy
    feats: [
      "Un quiz offert dans chaque épreuve",
      // One only, and it is enforced by the attempt itself — see
      // examService.findFreeAttempt and requirePremiumOrFreeMock. Keep the
      // wording honest about the limit: it is the first thing a free user
      // discovers when they try to start a second.
      "1 TCF blanc complet, correction IA incluse",
      // One fixed subject per workshop, two AI analyses per tâche (rbac opens
      // the routes; api/_lib/auth.js enforces the quota). Same honesty rule as
      // above — say the limit, since it is what they hit first.
      "1 sujet d'expression écrite et 1 d'expression orale, avec analyse IA",
      "Corrections détaillées et explications",
      "Cartes de vocabulaire et leçons de grammaire, sans limite",
      "Sujets EE/EO du mois",
      "Suivi de progression",
    ],
  },
  {
    name: "Passeport",
    price: "$7.99",
    per: "5 jours d'accès",
    days: 5,
    accent: "violet",
    cta: "Choisir Passeport",
    featured: false,
    slug: "passeport",
    feats: [
      "40 quiz de compréhension écrite",
      "40 quiz de compréhension orale",
      "2 simulations IA par jour (écrit + oral)",
      "1 TCF blanc chronométré par jour",
      "Sujets EE/EO du mois",
    ],
  },
  {
    name: "Visa",
    price: "$14.99",
    per: "15 jours d'accès",
    days: 15,
    accent: "rose",
    cta: "Choisir Visa",
    featured: false,
    slug: "visa",
    feats: [
      "40 quiz de compréhension écrite",
      "40 quiz de compréhension orale",
      "6 simulations IA par jour (écrit + oral)",
      "3 TCF blancs chronométrés par jour",
      "Sujets EE/EO du mois",
    ],
  },
  {
    name: "Première classe",
    price: "$24.99",
    per: "30 jours d'accès",
    days: 30,
    accent: "red",
    cta: "Choisir Première classe",
    featured: true,
    slug: "premiere-classe",
    feats: [
      "Tous les quiz de compréhension écrite (40)",
      "Tous les quiz de compréhension orale (40)",
      "Simulations IA illimitées",
      "TCF blancs illimités",
      "Sujets EE/EO du mois",
      "Accès sur 2 appareils",
    ],
  },
  {
    name: "VIP",
    price: "$49.99",
    per: "90 jours d'accès",
    days: 90,
    accent: "gold",
    cta: "Choisir VIP",
    featured: false,
    slug: "vip",
    feats: [
      "Tous les quiz de compréhension écrite (40)",
      "Tous les quiz de compréhension orale (40)",
      "Simulations IA illimitées",
      "TCF blancs illimités",
      "Sujets EE/EO du mois",
      "Accès sur 4 appareils",
    ],
  },
];
