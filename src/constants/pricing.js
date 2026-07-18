// Access passes, priced in USD. `accent` grades along the brand gradient from
// blue (cheapest) to red (most expensive). `price` / `per` are static
// fallbacks shown instantly; useLivePlans overlays the live Stripe amount.
// NOTE: the numeric quotas below (quiz counts, daily AI simulations, mock-exam
// and device limits) are marketing copy — the checkout backend currently
// grants a single "Premium" role and does not yet enforce them.
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
      "Suivi de progression",
    ],
  },
  {
    name: "Passeport valide",
    price: "$4.99",
    per: "5 jours d'accès",
    accent: "indigo",
    cta: "Choisir Passeport valide",
    featured: false,
    priceId: "price_1TuaWRCFsAOkGQj0WeMgaejo",
    feats: [
      "20 quiz de compréhension écrite",
      "20 quiz de compréhension orale",
      "2 simulations IA par jour (écrit + oral)",
      "1 TCF blanc chronométré",
    ],
  },
  {
    name: "Visa accordé",
    price: "$8.99",
    per: "15 jours d'accès",
    accent: "violet",
    cta: "Choisir Visa accordé",
    featured: false,
    priceId: "price_1TuaZYCFsAOkGQj0OCxA6IWA",
    feats: [
      "39 quiz de compréhension écrite",
      "40 quiz de compréhension orale",
      "6 simulations IA par jour (écrit + oral)",
      "3 TCF blancs chronométrés",
    ],
  },
  {
    name: "Classe économie",
    price: "$19.99",
    per: "30 jours d'accès",
    accent: "rose",
    cta: "Choisir Classe économie",
    featured: true,
    priceId: "price_1TuabOCFsAOkGQj0M6cOUnxr",
    feats: [
      "Tous les quiz de compréhension écrite (39)",
      "Tous les quiz de compréhension orale (40)",
      "Simulations IA illimitées (10 / jour)",
      "TCF blancs illimités",
      "Accès sur 2 appareils",
    ],
  },
  {
    name: "Première classe",
    price: "$39.99",
    per: "90 jours d'accès",
    accent: "red",
    cta: "Choisir Première classe",
    featured: false,
    priceId: "price_1TuadPCFsAOkGQj0QXGKdRGS",
    feats: [
      "Tous les quiz de compréhension écrite (39)",
      "Tous les quiz de compréhension orale (40)",
      "Simulations IA illimitées (50 / jour)",
      "TCF blancs illimités",
      "Accès sur 4 appareils",
    ],
  },
];
