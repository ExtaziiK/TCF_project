import { signedLetter, escapeHtml, inline, button, codeBox } from "./emailLayout.js";

// Partner programme, server side: crediting a sale to the partner whose code
// was used, the partner space summary, and the emails an applicant receives.
// Tables: supabase/migrations/20261122_partners.sql.
//
// Sales come from two places and must never break them: the Stripe webhook
// (a card checkout) and the approval of a dinar transfer. So recordPartnerSale
// swallows every error — a missed credit is fixable by hand, a webhook that
// throws makes Stripe retry and a buyer wait.

export const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.tcfpasserelle.com").replace(/\/$/, "");
export const SPACE_URL = `${SITE}/espace-partenaire`;

const round2 = (n) => Math.round(Number(n) * 100) / 100;

// Commission on one sale, frozen at the rate in force when it happened.
export const commissionFor = (amount, pct) => round2((Number(amount) || 0) * (Number(pct) || 0) / 100);

// Credits a purchase to the partner owning `code`. Returns the inserted row,
// or null when the code belongs to no partner, the sale was already recorded,
// or anything failed.
export async function recordPartnerSale(admin, { code, source, externalId, amount, currency, plan, buyerUserId, occurredAt }) {
  try {
    const clean = String(code || "").trim().toUpperCase();
    if (!clean || !externalId) return null;
    const { data: partner } = await admin.from("partners").select("id, commission_pct").eq("code", clean).maybeSingle();
    if (!partner) return null;
    const row = {
      partner_id: partner.id,
      source,
      external_id: String(externalId),
      amount: round2(amount),
      currency: String(currency || "").toUpperCase().slice(0, 3),
      plan: plan ? String(plan).slice(0, 60) : null,
      commission_pct: Number(partner.commission_pct) || 0,
      commission: commissionFor(amount, partner.commission_pct),
      buyer_user_id: buyerUserId || null,
      ...(occurredAt ? { occurred_at: occurredAt } : {}),
    };
    const { data, error } = await admin.from("partner_sales").insert(row).select().single();
    if (error) {
      if (error.code !== "23505") console.warn("partner sale:", error.message); // 23505: already recorded
      return null;
    }
    return data;
  } catch (err) {
    console.warn("partner sale:", err.message);
    return null;
  }
}

// The promotion codes (as typed) applied to a Checkout session. The session
// object carries promotion-code ids; a code string needs one lookup each.
export async function sessionPromoCodes(stripe, session) {
  try {
    let ids = (session.discounts || []).map((d) => d.promotion_code).filter(Boolean);
    if (!ids.length && session.total_details?.amount_discount > 0) {
      const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ["total_details.breakdown.discounts.discount"] });
      ids = (full.total_details?.breakdown?.discounts || []).map((d) => d.discount?.promotion_code).filter(Boolean);
    }
    const codes = [];
    for (const id of ids) {
      const pc = typeof id === "string" ? await stripe.promotionCodes.retrieve(id) : id;
      if (pc?.code) codes.push(pc.code);
    }
    return codes;
  } catch (err) {
    console.warn("partner sale: promotion codes:", err.message);
    return [];
  }
}

// Totals for the space and the admin: per currency (card sales are in the
// Stripe currency, transfers in DZD — they are never added together), plus a
// per-month breakdown, newest first.
export function salesSummary(sales = [], payouts = []) {
  const byCurrency = {};
  const slot = (cur) => (byCurrency[cur] ||= { currency: cur, sales: 0, revenue: 0, commission: 0, paid: 0, due: 0 });
  for (const s of sales) {
    const b = slot(s.currency);
    b.sales += 1;
    b.revenue = round2(b.revenue + Number(s.amount));
    b.commission = round2(b.commission + Number(s.commission));
  }
  for (const p of payouts) slot(p.currency).paid = round2(slot(p.currency).paid + Number(p.amount));
  for (const b of Object.values(byCurrency)) b.due = round2(b.commission - b.paid);

  const months = {};
  for (const s of sales) {
    const m = String(s.occurred_at).slice(0, 7);
    const key = `${m}|${s.currency}`;
    const r = (months[key] ||= { month: m, currency: s.currency, sales: 0, commission: 0 });
    r.sales += 1;
    r.commission = round2(r.commission + Number(s.commission));
  }
  return {
    totals: Object.values(byCurrency),
    months: Object.values(months).sort((a, b) => b.month.localeCompare(a.month) || a.currency.localeCompare(b.currency)),
  };
}

/* --------------------------------- emails --------------------------------- */
// French by default; English for an application filed from the English site.

const TEXT = {
  fr: {
    hello: (n) => (n ? `Bonjour ${n},` : "Bonjour,"),
    receivedSubject: "Nous avons bien reçu votre demande de partenariat",
    received: "Merci pour votre intérêt pour TCF Passerelle. Votre demande de partenariat est bien arrivée.\n\nNotre équipe l'étudie et vous recontacte **sous 48 h**, par email ou WhatsApp, pour fixer un rendez-vous.",
    receivedCode: (c) => `Le code que vous avez choisi, **${c}**, est réservé pour vous. Il sera activé si votre demande est acceptée.`,
    acceptedSubject: "Bienvenue parmi les partenaires de TCF Passerelle",
    yourCode: "Votre code partenaire :",
    codeHow: (pct) => `Vos élèves ou votre audience le saisissent au moment du paiement${pct ? ` et obtiennent **${pct} % de réduction**` : ""}.`,
    spaceHow: (email) => `Votre espace partenaire vous attend. Connectez-vous (ou créez votre compte) avec cette adresse : **${email}**, puis ouvrez votre espace.`,
    spaceButton: "Ouvrir mon espace partenaire",
    declinedSubject: "Votre demande de partenariat",
    replyHint: "Une question ? Répondez simplement à ce message.",
  },
  en: {
    hello: (n) => (n ? `Hello ${n},` : "Hello,"),
    receivedSubject: "We have received your partnership application",
    received: "Thank you for your interest in TCF Passerelle. Your partnership application has arrived.\n\nOur team is reviewing it and will get back to you **within 48 hours**, by email or WhatsApp, to set up a meeting.",
    receivedCode: (c) => `The code you chose, **${c}**, is reserved for you. It will be activated if your application is accepted.`,
    acceptedSubject: "Welcome to the TCF Passerelle partner programme",
    yourCode: "Your partner code:",
    codeHow: (pct) => `Your students or audience enter it at checkout${pct ? ` and get **${pct}% off**` : ""}.`,
    spaceHow: (email) => `Your partner space is ready. Log in (or create your account) with this address: **${email}**, then open your space.`,
    spaceButton: "Open my partner space",
    declinedSubject: "Your partnership application",
    replyHint: "Any questions? Just reply to this message.",
  },
};

const textFor = (lang) => TEXT[lang === "en" ? "en" : "fr"];
const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "";
const para = (s) => String(s).split(/\n\s*\n/).filter((p) => p.trim()).map((p) => `<p style="margin:0 0 14px 0;">${inline(p.trim())}</p>`).join("");

// Right after applying.
export function receivedEmail(app) {
  const T = textFor(app.lang);
  const html = signedLetter(SITE, `
    <p style="margin:0 0 14px 0;">${escapeHtml(T.hello(firstName(app.name)))}</p>
    ${para(T.received)}
    ${app.desired_code ? para(T.receivedCode(app.desired_code)) : ""}
    <p style="margin:0 0 6px 0;color:#64748b;font-size:13px;">${escapeHtml(T.replyHint)}</p>`);
  return { subject: T.receivedSubject, html };
}

// Sent when the partner is activated. `message` is the team's own words
// (editable in the admin, prefilled); the code box and the space button are
// added around it.
export function acceptedEmail({ app, partner, message }) {
  const T = textFor(app?.lang);
  const html = signedLetter(SITE, `
    <p style="margin:0 0 14px 0;">${escapeHtml(T.hello(firstName(partner.name)))}</p>
    ${para(message)}
    ${partner.code ? `<p style="margin:0 0 8px 0;">${escapeHtml(T.yourCode)}</p>${codeBox(partner.code)}${para(T.codeHow(partner.discount_pct ? Number(partner.discount_pct) : null))}` : ""}
    ${para(T.spaceHow(partner.email))}
    <p style="margin:6px 0 22px 0;text-align:center;">${button(SPACE_URL, T.spaceButton)}</p>
    <p style="margin:0 0 6px 0;color:#64748b;font-size:13px;">${escapeHtml(T.replyHint)}</p>`);
  return { subject: T.acceptedSubject, html };
}

export function declinedEmail({ app, message }) {
  const T = textFor(app.lang);
  const html = signedLetter(SITE, `
    <p style="margin:0 0 14px 0;">${escapeHtml(T.hello(firstName(app.name)))}</p>
    ${para(message)}`);
  return { subject: T.declinedSubject, html };
}

// The prefilled messages the admin edits before sending.
export const DEFAULT_MESSAGES = {
  fr: {
    accepted: "Merci pour notre échange. Nous sommes ravis de vous compter parmi les partenaires de TCF Passerelle.",
    declined: "Merci pour votre demande et pour l'intérêt que vous portez à TCF Passerelle.\n\nAprès étude, nous ne pouvons pas donner suite pour le moment. Nous gardons vos coordonnées et n'hésiterons pas à revenir vers vous si l'occasion se présente.\n\nNous vous souhaitons une belle continuation.",
  },
  en: {
    accepted: "Thank you for our conversation. We are delighted to welcome you as a TCF Passerelle partner.",
    declined: "Thank you for your application and for your interest in TCF Passerelle.\n\nAfter review, we are unable to move forward at this time. We will keep your details and will not hesitate to get back to you if an opportunity arises.\n\nWe wish you all the best.",
  },
};
