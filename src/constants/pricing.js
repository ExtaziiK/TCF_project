// Access passes, priced in USD. `accent` grades along the brand gradient from
// blue up through red, then gold for the top VIP tier. `price` / `per` are
// static fallbacks shown instantly; useLivePlans overlays the live Stripe
// amount.
// NOTE: the per-day AI-simulation, quiz-count and mock-exam quotas below are
// still marketing copy — checkout grants a single "Premium" role and does not
// yet enforce them. The DEVICE limits, however, ARE enforced via the active-
// session mechanism (profiles.active_session_ids + claim_device_session):
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
    priceId: null,
    feats: [
      "Un quiz offert dans chaque épreuve",
      "Corrections détaillées et explications",
      "Cartes de vocabulaire pour démarrer",
      "Sujets d'actualité du mois (EE + EO)",
      "Suivi de progression",
    ],
  },
  {
    name: "Passeport",
    price: "$4.99",
    per: "5 jours d'accès",
    days: 5,
    accent: "violet",
    cta: "Choisir Passeport",
    featured: false,
    priceId: "price_1Txu9yFzf0ilrkDnvsHPE0oy",
    feats: [
      "20 quiz de compréhension écrite",
      "20 quiz de compréhension orale",
      "2 simulations IA par jour (écrit + oral)",
      "1 TCF blanc chronométré par jour",
      "Sujets d'actualité du mois (EE + EO)",
    ],
  },
  {
    name: "Visa",
    price: "$8.99",
    per: "15 jours d'accès",
    days: 15,
    accent: "rose",
    cta: "Choisir Visa",
    featured: false,
    priceId: "price_1Txu9uFzf0ilrkDnXXgHJiAG",
    feats: [
      "40 quiz de compréhension écrite",
      "40 quiz de compréhension orale",
      "6 simulations IA par jour (écrit + oral)",
      "3 TCF blancs chronométrés par jour",
      "Sujets d'actualité du mois (EE + EO)",
    ],
  },
  {
    name: "Première classe",
    price: "$19.99",
    per: "30 jours d'accès",
    days: 30,
    accent: "red",
    cta: "Choisir Première classe",
    featured: true,
    priceId: "price_1Txu9uFzf0ilrkDni2sOGNO5",
    feats: [
      "Tous les quiz de compréhension écrite (40)",
      "Tous les quiz de compréhension orale (40)",
      "Simulations IA illimitées",
      "TCF blancs illimités",
      "Sujets d'actualité du mois (EE + EO)",
      "Accès sur 2 appareils",
    ],
  },
  {
    name: "VIP",
    price: "$39.99",
    per: "90 jours d'accès",
    days: 90,
    accent: "gold",
    cta: "Choisir VIP",
    featured: false,
    priceId: "price_1Txu9vFzf0ilrkDnltQg1Fbc",
    feats: [
      "Tous les quiz de compréhension écrite (40)",
      "Tous les quiz de compréhension orale (40)",
      "Simulations IA illimitées",
      "TCF blancs illimités",
      "Sujets d'actualité du mois (EE + EO)",
      "Accès sur 4 appareils",
    ],
  },
];
