import { test } from "node:test";
import assert from "node:assert/strict";
import { deletionScheduledEmail, accountDeletedEmail } from "../api/_lib/mailer.js";

const user = { email: "a@example.com", user_metadata: { name: "Amina" } };

test("deactivation email names the deletion date and the way back in", () => {
  const { subject, html } = deletionScheduledEmail(user, "2026-10-05T12:00:00.000Z", "https://www.tcfpasserelle.com");
  assert.match(subject, /désactivé/);
  assert.match(html, /Bonjour Amina,/);
  assert.match(html, /5 octobre 2026/);
  assert.match(html, /href="https:\/\/www\.tcfpasserelle\.com\/connexion"/);
});

test("deleted email confirms the erasure", () => {
  const { subject, html } = accountDeletedEmail(user);
  assert.match(subject, /supprimé/);
  assert.match(html, /définitivement supprimés/);
});
