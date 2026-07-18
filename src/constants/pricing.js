// Access passes, priced in USD. `accent` escalates with price and drives each
// card's colour (see components/pricing/PlanCard). `price` / `per` are static
// fallbacks shown instantly; useLivePlans overlays the live Stripe amount.
// NOTE: the numeric quotas below (quiz counts, daily AI simulations, mock-exam
// and device limits) are marketing copy — the checkout backend currently grants
// a single "Premium" role and does not yet enforce them per plan.
export const PLANS = [
  {
    name: "Découverte",
    price: "$0",
    per: "pour toujours",
    accent: "slate",
    cta: "Créer un compte",
    featured: false,
    priceId: null,
    feats: [
      "Le premier quiz de chaque épreuve offert",
      "Corrections détaillées et explications",
      "Cartes de vocabulaire de base",
      "Suivi de progression simple",
    ],
  },
  {
    name: "Starter",
    price: "$4.99",
    per: "accès 5 jours",
    accent: "sky",
    cta: "Choisir Starter",
    featured: false,
    priceId: "price_1TuaWRCFsAOkGQj0WeMgaejo",
    feats: [
      "20 quiz de compréhension écrite",
      "20 quiz de compréhension orale",
      "Simulation IA (écrit + oral) : 2 / jour",
      "1 TCF blanc complet",
    ],
  },
  {
    name: "Essentiel",
    price: "$8.99",
    per: "accès 15 jours",
    accent: "emerald",
    cta: "Choisir Essentiel",
    featured: false,
    priceId: "price_1TuaZYCFsAOkGQj0OCxA6IWA",
    feats: [
      "39 quiz de compréhension écrite",
      "40 quiz de compréhension orale",
      "Simulation IA (écrit + oral) : 6 / jour",
      "3 TCF blancs complets",
    ],
  },
  {
    name: "Premium",
    price: "$19.99",
    per: "accès 30 jours",
    accent: "violet",
    cta: "Choisir Premium",
    featured: true,
    priceId: "price_1TuabOCFsAOkGQj0M6cOUnxr",
    feats: [
      "39 quiz de compréhension écrite",
      "40 quiz de compréhension orale",
      "Simulation IA illimitée (10 / jour)",
      "TCF blancs illimités",
      "Jusqu'à 2 appareils",
    ],
  },
  {
    name: "Premium+",
    price: "$39.99",
    per: "accès 90 jours",
    accent: "amber",
    cta: "Choisir Premium+",
    featured: false,
    priceId: "price_1TuadPCFsAOkGQj0QXGKdRGS",
    feats: [
      "39 quiz de compréhension écrite",
      "40 quiz de compréhension orale",
      "Simulation IA illimitée (50 / jour)",
      "TCF blancs illimités",
      "Jusqu'à 4 appareils",
    ],
  },
];
