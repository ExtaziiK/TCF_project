// Access passes, priced in USD. `accent` grades along the brand gradient: blue
// (free) → violet → red → gold for the top Ultimate tier. `price` / `per` are
// static fallbacks shown instantly; useLivePlans overlays the live Stripe
// amount.
//
// Passeport (the former 5-day entry pass) was discontinued 2026-08 and is
// deliberately ABSENT from this array: PAID_PLANS everywhere derives from it,
// so removing the object here is what stops it being sold anywhere in the app
// (pricing page, checkout, the admin's manual DZD-payment plan picker). It is
// NOT gone from the backend — api/_lib/passes.js, auth.js's DAILY_SITTINGS and
// the device_limit_for() DB function all still recognise the slug/label so
// whoever already holds one keeps their entitlement until it naturally
// expires. Visa/Première classe/VIP were renamed to Starter/Pro/Ultimate the
// same day — same tiers, same prices, same durations, cosmetic rename only;
// see those same three files for why a plan's INTERNAL slug never changed
// even though its display name did.
//
// NOTE: the per-day AI-SIMULATION quotas below are now enforced, per épreuve,
// against the plan_label baked into app_metadata at checkout — Starter 6,
// Pro and Ultimate unlimited (api/_lib/auth.js:DAILY_SITTINGS, counted in
// public.ai_sittings). A "simulation" is one sitting: it opens on the first AI
// analysis and stays open while the candidate works, so a whole Expression
// écrite counts once. Paid accounts are additionally paced at 3 analyses per
// tâche per 10 minutes. Keep these numbers in sync with the cards.
// The per-day MOCK-EXAM quotas are still marketing copy: nothing enforces them.
// The quiz counts, by contrast, now describe what actually
// happens: every paid pass unlocks the whole bank (40 CE + 40 CO), because
// BankExplorer only locks quizzes for ROLES.FREE_USER. Keep the counts in
// sync with src/bank if the bank grows.
// The DEVICE limits are likewise enforced, via the active-session
// mechanism (profiles.active_session_ids + claim_device_session):
// Pro → 2 simultaneous devices, Ultimate → 4, other plans → 1. Over the
// limit, the newest login wins and the oldest device is signed out — a login is
// never refused for this reason.
// Feature lists are ordered deliberately: PlanCard shows only the FIRST FOUR
// on the landing page (compact mode), so each plan leads with what it grants
// that the free tier does not. The quantities match what api/_lib/auth.js
// actually enforces — a card promising more than the code grants is a support
// ticket, not marketing.
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
      // Free, and listed here rather than on a paid card because that is what
      // the code does: api/dictee.js gates on requireUser, not requirePremium.
      // The library is shared — three new texts are written every night and
      // every text ever written stays available to everyone, so there is no
      // per-account quota to describe.
      "La dictée : toute la bibliothèque, sans limite",
      "Cartes de vocabulaire et leçons de grammaire, sans limite",
      "Sujets EE/EO du mois",
      "Suivi de progression",
    ],
  },
  {
    name: "Starter",
    price: "$14.99",
    per: "15 jours d'accès",
    days: 15,
    // "violet" was Passeport's colour — freed up when that tier was
    // discontinued (2026-08). Moved here so the three remaining paid tiers
    // spread evenly across the full brand ramp (blue → violet → red → gold)
    // instead of bunching into rose/red, which read too close together once
    // violet dropped out.
    accent: "violet",
    cta: "Choisir Starter",
    featured: false,
    slug: "visa", // internal slug unchanged on rename — see the note above the array
    feats: [
      "6 simulations IA par jour en expression écrite, et 6 à l'oral",
      "Les 80 quiz débloqués : 40 en compréhension écrite, 40 en orale",
      "3 TCF blancs chronométrés par jour, notés sur 699",
      "Correction IA détaillée : niveau CECRL, points à corriger, texte réécrit",
      "Entretien oral simulé avec un examinateur IA qui vous répond",
      "Un nouveau sujet d'expression à chaque session",
    ],
  },
  {
    name: "Pro",
    price: "$24.99",
    per: "30 jours d'accès",
    days: 30,
    accent: "red",
    cta: "Choisir Pro",
    featured: true,
    slug: "premiere-classe", // internal slug unchanged on rename — see the note above the array
    feats: [
      "Simulations IA illimitées, à l'écrit comme à l'oral",
      "TCF blancs chronométrés illimités, notés sur 699",
      "Les 80 quiz débloqués : 40 en compréhension écrite, 40 en orale",
      "Accès simultané sur 2 appareils",
      "Correction IA détaillée : niveau CECRL, points à corriger, texte réécrit",
      "Entretien oral simulé avec un examinateur IA qui vous répond",
      "Un nouveau sujet d'expression à chaque session",
    ],
  },
  {
    name: "Ultimate",
    price: "$49.99",
    per: "90 jours d'accès",
    days: 90,
    accent: "gold",
    cta: "Choisir Ultimate",
    featured: false,
    slug: "vip", // internal slug unchanged on rename — see the note above the array
    feats: [
      "Simulations IA illimitées, à l'écrit comme à l'oral",
      "TCF blancs chronométrés illimités, notés sur 699",
      "Les 80 quiz débloqués : 40 en compréhension écrite, 40 en orale",
      "Accès simultané sur 4 appareils",
      "Correction IA détaillée : niveau CECRL, points à corriger, texte réécrit",
      "Entretien oral simulé avec un examinateur IA qui vous répond",
      "Un nouveau sujet d'expression à chaque session",
    ],
  },
];
