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
