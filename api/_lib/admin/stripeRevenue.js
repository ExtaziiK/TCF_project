import Stripe from "stripe";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";

// Card payments taken through Stripe, for the "Stripe" half of the admin
// Revenus tab. Read-only and live from the Stripe API: Stripe stays the ledger
// for this money (refunds, disputes and fees all happen there), so nothing is
// copied into Supabase that could drift out of step with it.
//
//   GET /api/admin/stripe-revenue → { sales: [...], livemode, truncated }
//
// A sale is one succeeded charge. The charge carries the money (amount,
// refunds, and via its balance transaction the fee and the net that lands in
// the bank); the Checkout Session that produced it carries what was bought
// (metadata.plan) and the buyer's details. The two lists are joined on the
// payment intent id. A charge with no session (made by hand in the Stripe
// dashboard, say) is still counted, just without a plan.

// Built on first use, not at import — this shares one serverless function with
// every other admin route (see promo.js for the reasoning).
let client = null;
const stripe = () => (client ||= new Stripe(process.env.STRIPE_SECRET_KEY));

// Upper bound per list. At 100 per page that is 10 Stripe calls each, which
// stays well inside the function timeout; past it the tab says it is cut off.
const MAX_ROWS = 1000;

// Currencies Stripe counts in whole units rather than cents.
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);
const toMajor = (amount, currency) => (amount == null ? null : ZERO_DECIMAL.has(String(currency).toLowerCase()) ? amount : amount / 100);

const idOf = (v) => (v && typeof v === "object" ? v.id : v) || null;

function toSale(charge, session) {
  const bt = charge.balance_transaction && typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
  const currency = charge.currency;
  const amount = toMajor(charge.amount, currency);
  const refunded = toMajor(charge.amount_refunded || 0, currency);
  return {
    key: `stripe:${charge.id}`,
    id: charge.id,
    paymentIntent: idOf(charge.payment_intent),
    date: new Date(charge.created * 1000).toISOString(),
    currency,
    amount,
    refunded,
    // Kept = what the customer was charged minus what went back to them.
    kept: Math.max(0, amount - refunded),
    // Fee and net come in the account's settlement currency, which can differ
    // from the charge currency; they travel with their own currency code.
    fee: bt ? toMajor(bt.fee, bt.currency) : null,
    net: bt ? toMajor(bt.net, bt.currency) : null,
    settlementCurrency: bt?.currency || null,
    disputed: !!charge.disputed,
    plan: session?.metadata?.plan || charge.metadata?.plan || null,
    customer: session?.customer_details?.name || charge.billing_details?.name || null,
    email: session?.customer_details?.email || charge.billing_details?.email || charge.receipt_email || null,
    promo: session?.total_details?.amount_discount ? toMajor(session.total_details.amount_discount, session.currency) : null,
    livemode: !!charge.livemode,
  };
}

export default async function handler(req, res) {
  try {
    await requireAdmin(req);
    if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
    if (!process.env.STRIPE_SECRET_KEY) throw new HttpError(503, "STRIPE_SECRET_KEY absente des variables d'environnement.");

    const [charges, sessions] = await Promise.all([
      stripe().charges.list({ limit: 100, expand: ["data.balance_transaction"] }).autoPagingToArray({ limit: MAX_ROWS }),
      stripe().checkout.sessions.list({ limit: 100, status: "complete" }).autoPagingToArray({ limit: MAX_ROWS }),
    ]);

    const byIntent = new Map();
    for (const s of sessions) {
      const pi = idOf(s.payment_intent);
      if (pi) byIntent.set(pi, s);
    }

    const sales = charges
      .filter((ch) => ch.status === "succeeded" && ch.paid)
      .map((ch) => toSale(ch, byIntent.get(idOf(ch.payment_intent))));

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      sales,
      livemode: sales.length ? sales[0].livemode : !String(process.env.STRIPE_SECRET_KEY).startsWith("sk_test"),
      truncated: charges.length >= MAX_ROWS,
    });
  } catch (err) {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: err.message || "Lecture Stripe impossible." });
  }
}
