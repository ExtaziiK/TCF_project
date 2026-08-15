// Why the longest pass costs what it costs.
//
// Pro and Ultimate grant the same thing — the entitlements are identical but
// for the device count. What separates them is one month against three, so on
// a row of cards $19.99 and $49.99 read as two prices for one product unless
// the buyer stops and divides. Almost nobody divides. They just see the big
// number and move to the cheaper card.
//
// So the division happens here, and the answer is shown on the card: three
// months at Ultimate costs meaningfully LESS PER DAY than the same three
// months bought as Pro. That is the honest argument for the higher price, and
// it is the only one this file makes.
//
// Computed from the prices actually on screen rather than hard-coded, because
// prices are admin-editable (Stripe, then the Tarifs tab) and are re-rendered
// into the visitor's currency. A percentage survives all of that: it is a
// ratio of two figures in the same currency, so it stays true whether the
// cards are showing dollars, euros or dinars, and it cannot go stale the way a
// written-in "économisez 17 %" would the first time someone edits a price.

// Below this, the difference is not worth a line on the card — and a "1 %
// cheaper" badge reads as an apology rather than an argument.
const MIN_PERCENT = 5;

// The numeric part of a formatted price ("$49.99", "€45.99", "6750 DA").
// Spaces are stripped first: the DZD formatter deliberately omits thousands
// separators, but a locale that ever added one must not turn 6 750 into 6.
function amount(formatted) {
  const cleaned = String(formatted ?? "").replace(/\s/g, "").replace(",", ".");
  const m = cleaned.match(/\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Cost per day of access, or null when the plan cannot be measured: the free
// tier, a pass with no duration, or a price still loading from Stripe — that
// last one matters, since PlanCard refuses to print a price it is unsure of
// and a saving computed against a stale figure would be exactly that.
function perDay(plan) {
  if (!plan?.slug || !plan.days || plan.priceState === "loading") return null;
  const price = amount(plan.price);
  return price == null ? null : price / plan.days;
}

// { [planName]: { percent, reference } } for the plans worth annotating.
//
// Only plans LONGER than the reference are considered, and the reference is
// the featured one (Pro) — the tier the page is built to sell and the one a
// visitor compares everything against. Restricting it to longer passes is not
// cosmetic: Starter is also cheaper per day than Pro, because it is capped,
// and badging it "cheaper per day" would argue against the very limits the
// card next to it just finished explaining. The saving is only an argument
// when the two plans grant the same thing and differ in duration.
export function perDayValueNotes(plans = []) {
  const reference = plans.find((p) => p.featured && p.slug);
  const refPerDay = perDay(reference);
  if (!refPerDay) return {};

  const notes = {};
  for (const plan of plans) {
    if (plan.name === reference.name || !plan.days || plan.days <= reference.days) continue;
    const mine = perDay(plan);
    if (!mine || mine >= refPerDay) continue;
    const percent = Math.round((1 - mine / refPerDay) * 100);
    if (percent >= MIN_PERCENT) notes[plan.name] = { percent, reference: reference.name };
  }
  return notes;
}
