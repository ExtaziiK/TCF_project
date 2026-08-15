// Normalizes a STORED plan_label to its CURRENT display name, for anywhere
// that shows one to a human (an email, an admin panel, a toast).
//
// A purchaser's plan_label is frozen at their checkout time and nothing ever
// rewrites it — see the comment on PASSES in ./passes.js. When a tier is
// renamed, existing holders keep the old string in app_metadata forever, which
// is correct for COMPARISONS (TYPE_FILTERS in ./admin/users.js and
// DAILY_SITTINGS in ./auth.js both match old-or-new on purpose) but wrong for
// DISPLAY: a "Première classe" holder is a Pro subscriber, and every surface
// that names their plan back to them should say so, not repeat whatever the
// tier happened to be called when they bought it.
//
// Hand-maintained rather than derived from PASSES, because PASSES only ever
// knows the CURRENT label per slug — there is no data structure anywhere that
// remembers what a tier used to be called, so the old -> new pairs have to be
// written down somewhere. This is that somewhere for the server; the client
// keeps its own copy in src/constants/pricing.js (api/ never imports from
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
