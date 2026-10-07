import { test } from "node:test";
import assert from "node:assert/strict";
import { renderEmail, normalizeEmail, EMAIL_TEMPLATES } from "../api/_lib/emailTemplates.js";
import { renderWelcome, DEFAULT_WELCOME } from "../api/_lib/welcomeTemplate.js";

const SITE = "https://www.tcfpasserelle.com";

test("deactivation email names the deletion date and the way back in", () => {
  const { subject, html } = renderEmail("deletionScheduled", null, { firstName: "Amina", vars: { date: "5 octobre 2026" }, site: SITE });
  assert.match(subject, /désactivé/);
  assert.match(html, /Bonjour Amina,/);
  assert.match(html, /5 octobre 2026/);
  assert.match(html, /href="https:\/\/www\.tcfpasserelle\.com\/connexion"/);
});

test("deleted email confirms the erasure", () => {
  const { subject, html } = renderEmail("accountDeleted", null, { site: SITE });
  assert.match(subject, /supprimé/);
  assert.match(html, /définitivement supprimés/);
  assert.match(html, /Bonjour,/);
});

test("placeholders fill the subject and body; unknown ones stay visible", () => {
  const { subject, html } = renderEmail("expiring", { body: "Plus que {jours} sur {forfait}. {typo}" }, { vars: { forfait: "Starter", jours: "1 jour" }, site: SITE });
  assert.equal(subject, "Votre accès Starter expire dans 1 jour");
  assert.match(html, /Plus que 1 jour sur Starter\. \{typo\}/);
});

test("[Text](target) becomes a button only for a known target", () => {
  const { html } = renderEmail("expired", { body: "[Renouveler](tarifs)\n\n[Ailleurs](https)" }, { site: SITE });
  assert.match(html, /<a href="https:\/\/www\.tcfpasserelle\.com\/tarifs"[^>]*>Renouveler<\/a>/);
  assert.match(html, /\[Ailleurs\]\(https\)/);
});

test("admin text is escaped, never injected", () => {
  const { html, subject } = renderEmail("expired", { subject: "<b>x</b>", body: "<script>alert(1)</script> **gras**" }, { site: SITE });
  assert.ok(!html.includes("<script>"));
  assert.match(html, /<strong>gras<\/strong>/);
  assert.equal(subject, "<b>x</b>"); // a subject is plain text in the mail header
  assert.ok(!renderWelcome({ intro: "<img src=x onerror=1>" }, { site: SITE }).html.includes("<img src=x"));
});

test("every email is on by default and keeps an empty-string edit", () => {
  for (const id of Object.keys(EMAIL_TEMPLATES)) assert.equal(normalizeEmail(id, null).enabled, true);
  assert.equal(normalizeEmail("expired", { enabled: false }).enabled, false);
  assert.equal(normalizeEmail("expired", { body: "" }).body, "");
});

test("defaults fit the settings column", () => {
  for (const id of Object.keys(EMAIL_TEMPLATES)) assert.ok(JSON.stringify(normalizeEmail(id, null)).length < 2000, id);
  assert.ok(JSON.stringify(DEFAULT_WELCOME).length < 2000);
});

test("welcome promo box links to the how-to page, with the GIF only for its code", () => {
  const withGif = renderWelcome({ promoCode: "TCF30" }, { site: SITE }).html;
  assert.match(withGif, /href="https:\/\/www\.tcfpasserelle\.com\/code-promo\?code=TCF30"/);
  assert.match(withGif, /promo-tcf30\.gif/);
  const other = renderWelcome({ promoCode: "ETE25" }, { site: SITE }).html;
  assert.match(other, /code-promo\?code=ETE25/);
  assert.ok(!other.includes("promo-tcf30.gif"));
  assert.ok(!renderWelcome({ promoCode: "" }, { site: SITE }).html.includes("code-promo"));
});

test("brand name reads TCF Passerelle", () => {
  const { subject, html } = renderWelcome(null, { site: SITE });
  assert.match(subject, /TCF Passerelle/);
  assert.match(html, /L'équipe TCF Passerelle/);
  assert.ok(!/Passerelle TCF/.test(html + subject));
});

test("offer email: {encadre} becomes the TCF50 box with its GIF, and it says how to opt out", () => {
  const { subject, html } = renderEmail("offer", null, { firstName: "Leila", site: SITE });
  assert.match(subject, /-50/);
  assert.match(html, /TCF50/);
  assert.match(html, /promo-tcf50\.gif/);
  assert.match(html, /code-promo\?code=TCF50/);
  assert.match(html, /STOP/);
  assert.ok(!html.includes("{encadre}"));
  assert.ok(!renderEmail("offer", { promoCode: "" }, { site: SITE }).html.includes("code-promo"));
});

test("CCP / BaridiMob are named to Algerian accounts only", async () => {
  const { paymentPhrase } = await import("../api/_lib/emailTemplates.js");
  assert.equal(paymentPhrase({ user_metadata: { country: "Algérie" } }), "par carte ou par CCP / BaridiMob");
  assert.equal(paymentPhrase({ user_metadata: { country: "algerie" } }), "par carte ou par CCP / BaridiMob");
  assert.equal(paymentPhrase({ user_metadata: { country: "Maroc" } }), "par carte bancaire");
  assert.equal(paymentPhrase({ user_metadata: {} }), "par carte bancaire");
  const dz = renderEmail("offer", null, { vars: { paiement: paymentPhrase({ user_metadata: { country: "Algérie" } }) }, site: SITE }).html;
  const other = renderEmail("offer", null, { vars: { paiement: paymentPhrase({ user_metadata: { country: "France" } }) }, site: SITE }).html;
  assert.match(dz, /BaridiMob/);
  assert.ok(!/BaridiMob|CCP/.test(other));
});

test("default welcome: no promo box, and it presents the tools", () => {
  const { html } = renderWelcome(null, { site: SITE });
  assert.ok(!html.includes("code-promo"));
  assert.ok(!html.includes("TCF30"));
  for (const word of ["Sujets du mois", "La dictée", "Révision", "Calculateur NCLC", "modèle de réponse"]) assert.match(html, new RegExp(word));
  assert.match(renderWelcome({ promoCode: "TCF30" }, { site: SITE }).html, /code-promo\?code=TCF30/);
});

test("plan emails: tier, end date, and the profiles line only for Pro / Ultimate", async () => {
  const { profilesPhrase } = await import("../api/_lib/emailTemplates.js");
  assert.match(profilesPhrase("Pro"), /2 profils/);
  assert.match(profilesPhrase("VIP"), /4 profils/);
  assert.equal(profilesPhrase("Starter"), "");
  const dz = renderEmail("dzActivated", null, { vars: { forfait: "Ultimate", date: "4 janvier 2027", methode: "CCP", profils: profilesPhrase("Ultimate") }, site: SITE });
  assert.equal(dz.subject, "Votre forfait Ultimate est activé");
  assert.match(dz.html, /par <strong>CCP<\/strong>/);
  assert.match(dz.html, /4 janvier 2027/);
  assert.match(dz.html, /4 profils/);
  const card = renderEmail("premiumWelcome", null, { vars: { forfait: "Starter", date: "x", profils: "" }, site: SITE });
  assert.ok(!card.html.includes("Profils"));
  assert.match(card.html, /Révision/);
});

test("TCF blanc results: same numbers as the report, NCLC from the calculator bands, weakest section", async () => {
  const { summarizeScore } = await import("../api/_lib/mockResults.js");
  const { nclcFor } = await import("../api/_lib/scoreBands.js");
  const score = { ok: 54, total: 78, pct: 69, points: 482, level: "B2", perTask: [
    { section: "co", type: "quiz", ok: 25, total: 39 }, { section: "ce", type: "quiz", ok: 29, total: 39 },
    { section: "ee", type: "writing", ok: 0, total: 0 }, { section: "eo", type: "speaking", ok: 0, total: 0 },
  ] };
  const s = summarizeScore(score);
  assert.equal(s.points, 482);
  assert.equal(s.weakest.name, "Compréhension orale");
  assert.equal(s.sections[0].nclc, nclcFor("co", Math.round(0.64 * 699)));
  assert.equal(s.sections[2].selfAssessed, true);
  const { subject, html } = renderEmail("mockResults", null, { vars: { score: "482 / 699", niveau: "B2", faible: s.weakest.name, _score: score }, site: SITE });
  assert.equal(subject, "Vos résultats du TCF blanc : 482 / 699");
  assert.match(html, /482&nbsp;\/&nbsp;699/);
  assert.match(html, /NCLC 6/);
  assert.match(html, /auto-évaluée/);
  assert.ok(!html.includes("{resultats}") && !html.includes("[object Object]"));
});

test("nudge: only confirmed, non-Premium accounts between 3 and 7 days old, never twice", async () => {
  const { nudgeCandidates } = await import("../api/_lib/nudge.js");
  const now = Date.parse("2026-10-07T08:00:00Z"), day = 864e5;
  const mk = (id, ageDays, extra = {}) => ({ id, email: `${id}@x.co`, email_confirmed_at: "2026-01-01", created_at: new Date(now - ageDays * day).toISOString(), app_metadata: {}, ...extra });
  const ids = nudgeCandidates([
    mk("ok3", 3.2), mk("young", 2.5), mk("old", 8),
    mk("unconfirmed", 4, { email_confirmed_at: null }),
    mk("premium", 4, { app_metadata: { plan: "Premium", premium_until: "2027-01-01" } }),
    mk("staff", 4, { app_metadata: { role: "admin" } }),
    mk("done", 4, { app_metadata: { nudge_email_sent_at: "2026-10-06" } }),
    mk("expiredPass", 5, { app_metadata: { plan: "Premium", premium_until: "2026-10-01" } }),
  ], now).map((u) => u.id);
  assert.deepEqual(ids, ["ok3", "expiredPass"]);
});

test("TCF blanc results: practice tips follow the weakest section, and the email invites them to reach out", async () => {
  const { practiceTips } = await import("../api/_lib/mockResults.js");
  assert.match(practiceTips("co"), /compréhension orale/);
  assert.match(practiceTips("ce"), /Révision/);
  assert.ok(!practiceTips("ce").includes("podcast"));
  assert.match(practiceTips(undefined), /sujets du mois/);
  const { html } = renderEmail("mockResults", null, { vars: { conseils: practiceTips("ce") }, site: SITE });
  assert.match(html, /Comment progresser sur TCF Passerelle/);
  assert.match(html, /Besoin de conseils pour votre préparation/);
});
