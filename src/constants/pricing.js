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
// The DICTÉE line on each paid card is enforced, per tâche and per day, off the
// same plan_label — Starter 3 per tâche per day, Pro and Ultimate uncapped
// (api/_lib/auth.js:DAILY_DICTEES, counted in public.rate_limits). Pro and
// Ultimate are additionally asked to take a fifteen-minute break after five
// draws on one tâche; that is an anti-churn pause and not an allowance, so it
// is deliberately absent from these cards — see api/_lib/dictee-quota.js.
// The quiz counts, by contrast, now describe what actually
// happens: every paid pass unlocks the whole bank (40 CE + 40 CO), because
// BankExplorer only locks quizzes for ROLES.FREE_USER. Keep the counts in
// sync with src/bank if the bank grows.
// The DEVICE limits are likewise enforced, via the active-session
// mechanism (profiles.active_session_ids + claim_device_session):
// Pro → 2 simultaneous devices, Ultimate → 4, other plans → 1. Over the
// limit, the newest login wins and the oldest device is signed out — a login is
// never refused for this reason.
// TWO LISTS PER PLAN, and the split is the whole point of the page.
//
// `feats` holds ONLY what differs between the tiers; `also` holds what every
// paid tier grants identically. Read across the three paid cards and `feats`
// lines up axis by axis, in the same order every time — AI simulations, mock
// exams, dictée, devices — so "6 par jour / illimitées / illimitées" and
// "1 / 2 / 4 appareils" can be compared by moving the eye sideways instead of
// re-reading three near-identical lists. That was the actual problem: the tiers
// share most of their content, so a single mixed list made $7.99, $19.99 and
// $49.99 look like three prices for the same thing.
//
// Everything shared therefore moves to `also`. It is IDENTICAL across the
// three paid plans and a test holds it that way (tests/pricing-cards.test.mjs):
// the moment one card's shared block drifts, the comparison silently stops
// being one.
//
// The two are ORDER, not styling. PlanCard renders them as a single uniform
// list under one "Ce qui change" heading — the differences simply come first,
// which is all the emphasis they need. (They were briefly a second block in
// smaller, greyer type under a heading of their own; that said the same thing
// three times and made half of every paid card look like a footnote.)
//
// The free tier has no `also`: it is the baseline the paid `feats` differ
// FROM, so its list stays whole and PlanCard drops the heading for it.
//
// PlanCard shows only the FIRST FOUR `feats` on the landing page (compact
// mode) — which, now that `feats` is the differences, is exactly the four
// lines worth showing there. Duration is in neither list: it sits under the
// price ("30 jours d'accès"), which is where a buyer looks for it.
//
// The quantities match what api/_lib/auth.js actually enforces — a card
// promising more than the code grants is a support ticket, not marketing.

// What every paid tier grants identically. One array referenced by all three
// rather than three copies: three copies is how a line gets edited on one card
// and left stale on the others, and a shared block that is not word-for-word
// shared is worse than no shared block at all — it puts a difference in front
// of the reader where there is none.
const SHARED_PAID_FEATS = [
  "Les 80 quiz débloqués : 40 en compréhension écrite, 40 en orale",
  "Correction IA détaillée : niveau CECRL, points à corriger, texte réécrit",
  "Entretien oral simulé avec un examinateur IA qui vous répond",
  "Un nouveau sujet d'expression à chaque session",
];

export const PLANS = [
  {
    // Renamed from "Sans papier" 2026-08. This is also the literal string
    // written to app_metadata.plan for a free account (api/stripe-webhook.js,
    // api/_lib/admin/users.js) and read back into user.plan everywhere the
    // free tier is displayed — Profile.jsx, Mocks.jsx, the admin's user list
    // and activity feed. All of those were updated alongside this card so the
    // name is consistent everywhere it appears. EXISTING free accounts whose
    // app_metadata.plan is still the literal string "Sans papier" (nothing
    // rewrites already-stored values) keep showing that old name in their own
    // UI until they next trigger a write to that field — same "old label
    // persists for existing holders" tradeoff as the Starter/Pro/Ultimate
    // rename; see PASSES in api/_lib/passes.js for the fuller reasoning.
    // Functionally inert either way: every entitlement check in the app gates
    // on `plan === "Premium"`, never on the free tier's exact spelling.
    name: "Basic",
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
      // La dictée is NOT here: it moved to the paid tiers when it became
      // Premium (rbac.js → dictee: PREMIUM, api/dictee.js → requirePremium).
      // A free account still sees it in the menu and lands on its sales page,
      // which is where it gets described — not on this card.
      "Cartes de vocabulaire et leçons de grammaire, sans limite",
      "Sujets EE/EO du mois",
      "Suivi de progression",
    ],
  },
  {
    name: "Starter",
    price: "$7.99", // static fallback only — useLivePlans overlays the real Stripe amount within moments; keep in sync with the admin Tarifs tab if it's edited there again
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
      "3 TCF blancs chronométrés par jour, notés sur 699",
      // Enforced, per tâche and per day, in api/_lib/auth.js:DAILY_DICTEES —
      // change one and change the other. (Pro and Ultimate's fifteen-minute
      // anti-churn pause is deliberately not advertised, being a pause and not
      // an allowance — see api/_lib/dictee-quota.js.)
      "La dictée : 3 par tâche et par jour, dans toute la bibliothèque",
      // Enforced by device_limit_for() and stated in the CGU (terms.js §4):
      // one device for free accounts and Starter, two for Pro, four for
      // Ultimate. Listed here even though it is a limit rather than a grant —
      // without it the 1 / 2 / 4 progression has a hole in its first column
      // and the reader cannot tell whether Starter has no limit or no mention.
      "Un seul appareil à la fois",
    ],
    also: SHARED_PAID_FEATS,
  },
  {
    name: "Pro",
    price: "$14.99", // static fallback only — see the note on Starter's price above
    per: "30 jours d'accès",
    days: 30,
    accent: "red",
    cta: "Choisir Pro",
    featured: true,
    slug: "premiere-classe", // internal slug unchanged on rename — see the note above the array
    feats: [
      "Simulations IA illimitées, à l'écrit comme à l'oral",
      "TCF blancs chronométrés illimités, notés sur 699",
      "La dictée : toute la bibliothèque, sans limite",
      "Accès simultané sur 2 appareils",
    ],
    also: SHARED_PAID_FEATS,
  },
  {
    name: "Ultimate",
    price: "$39.99", // static fallback only — see the note on Starter's price above
    per: "90 jours d'accès",
    days: 90,
    accent: "gold",
    cta: "Choisir Ultimate",
    featured: false,
    // Ultimate and Pro are the SAME entitlements but for the device count:
    // what the extra money buys is three months instead of one, which is what
    // "90 jours d'accès" under the price is there to say.
    slug: "vip", // internal slug unchanged on rename — see the note above the array
    feats: [
      "Simulations IA illimitées, à l'écrit comme à l'oral",
      "TCF blancs chronométrés illimités, notés sur 699",
      "La dictée : toute la bibliothèque, sans limite",
      "Accès simultané sur 4 appareils",
    ],
    also: SHARED_PAID_FEATS,
  },
];

// Normalizes a STORED plan_label to its CURRENT display name, for anywhere
// that shows one to a signed-in user (Profile.jsx, Nav.jsx, the admin's user
// list and activity panel, a post-purchase toast).
//
// A purchaser's plan_label is frozen at their checkout time and nothing ever
// rewrites it — see the note on PASSES in api/_lib/passes.js. When a tier is
// renamed, existing holders keep the old string in app_metadata forever, which
// is correct for COMPARISONS (TYPE_FILTERS server-side, maxProfilesFor in
// useProfiles.js both match old-or-new on purpose) but wrong for DISPLAY: a
// "Première classe" holder is a Pro subscriber, and every surface naming their
// plan back to them should say so, not repeat whatever it was called when they
// bought it.
//
// Hand-maintained rather than derived from PLANS above, because PLANS only
// ever knows the CURRENT name per slug — there is no data structure anywhere
// that remembers what a tier used to be called, so the old -> new pairs have
// to be written down somewhere. This is that somewhere for the client; the
// server keeps its own copy in api/_lib/planLabel.js (api/ never imports from
// src/, by design) — update both if a tier is ever renamed again.
//
// "Passeport" is deliberately absent: it was discontinued, not renamed, so
// there is no current name to map it to. It passes through unchanged, which
// is the accurate thing to show.
const LEGACY_LABELS = {
  Visa: "Starter",
  "Première classe": "Pro",
  VIP: "Ultimate",
};

export function currentPlanLabel(label) {
  return LEGACY_LABELS[label] || label;
}
