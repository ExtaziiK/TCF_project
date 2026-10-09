// "Problème technique — besoin d'assistance" (api/_lib/public/support.js):
// the WhatsApp number the team calls back on, and the context attached to it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeWhatsApp } from "../api/_lib/phone.js";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test";
const { contextLines, SUPPORT_SUBJECT } = await import("../api/_lib/public/support.js");

test("an Algerian number typed the local way becomes +213", () => {
  const p = normalizeWhatsApp("0555 12 34 56", "Algérie");
  assert.equal(p.e164, "+213555123456");
  assert.equal(p.waLink, "https://wa.me/213555123456");
});

test("international forms are kept, 00 becomes +", () => {
  assert.equal(normalizeWhatsApp("+213 555-12-34-56", "France").e164, "+213555123456");
  assert.equal(normalizeWhatsApp("00213555123456").e164, "+213555123456");
  assert.equal(normalizeWhatsApp("(514) 555-0199", "Canada").e164, "+15145550199");
  assert.equal(normalizeWhatsApp("06 12 34 56 78", "France").e164, "+33612345678");
});

test("a number with no code and an unknown country is accepted but not linked", () => {
  const p = normalizeWhatsApp("0555123456", "");
  assert.equal(p.ok, true);
  assert.equal(p.e164, null);
  assert.equal(p.waLink, null);
  assert.equal(p.typed, "0555123456");
});

test("not a phone number", () => {
  assert.equal(normalizeWhatsApp("").ok, false);
  assert.equal(normalizeWhatsApp("12345").ok, false);
  assert.equal(normalizeWhatsApp("+1234567890123456").ok, false, "over 15 digits");
  assert.equal(normalizeWhatsApp("abc").ok, false);
});

test("the team gets the number, the problem, the tâche and the device", () => {
  const lines = Object.fromEntries(contextLines({
    ctx: { issue: "Votre micro n'a rien enregistré.", section: "eo", task: 2, page: "/expression-orale", online: true },
    device: { device: "Android", browser: "Facebook (navigateur intégré)" },
    plan: "gratuit",
    phone: normalizeWhatsApp("0555123456", "Algérie"),
  }));
  assert.deepEqual(lines, {
    WhatsApp: "+213555123456",
    "Problème affiché": "Votre micro n'a rien enregistré.",
    "Épreuve": "Expression orale · tâche 2",
    Page: "/expression-orale",
    Appareil: "Android · Facebook (navigateur intégré)",
    Compte: "gratuit",
  });
  assert.equal(SUPPORT_SUBJECT, "Problème technique — besoin d'assistance");
});
