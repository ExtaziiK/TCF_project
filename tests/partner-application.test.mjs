// « Devenir partenaire » (api/_lib/public/partner.js): what each kind of
// application must carry, and what is kept of it.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.VITE_SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test";
const { cleanApplication, applicationLines } = await import("../api/_lib/public/partner.js");

const base = { name: "Samira B.", email: "samira@ecole.dz", country: "Algérie" };

test("a school needs its name and a WhatsApp number, and the number becomes international", () => {
  assert.match(cleanApplication({ ...base, kind: "school", phone: "0555 12 34 56" }).error, /établissement/);
  assert.match(cleanApplication({ ...base, kind: "school", organisation: "École Horizon" }).error, /WhatsApp/);
  const { row, waLink } = cleanApplication({
    ...base, kind: "school", organisation: "École Horizon", phone: "0555 12 34 56",
    studentsPerYear: "60", tests: ["TCF Canada", "Inventé"], links: { instagram: "x" },
  });
  assert.equal(row.phone, "+213555123456");
  assert.equal(waLink, "https://wa.me/213555123456");
  assert.deepEqual(row.tests, ["TCF Canada"]);
  assert.equal(row.links, undefined, "creator fields are not kept on a school");
});

test("a creator needs at least one link; the phone is optional", () => {
  assert.match(cleanApplication({ ...base, kind: "creator" }).error, /lien/);
  const { row } = cleanApplication({ ...base, kind: "creator", links: { youtube: " https://youtube.com/@x ", tiktok: "" } });
  assert.deepEqual(row.links, { youtube: "https://youtube.com/@x" });
  assert.equal(row.phone, null);
});

test("other proposals need a message; unknown kinds and bad emails are refused", () => {
  assert.match(cleanApplication({ ...base, kind: "other" }).error, /Décrivez/);
  assert.ok(cleanApplication({ ...base, kind: "other", message: "Un salon étudiant" }).row);
  assert.match(cleanApplication({ ...base, kind: "partner" }).error, /type/);
  assert.match(cleanApplication({ ...base, kind: "other", message: "x", email: "nope" }).error, /courriel/);
});

test("the email lines carry only what was filled in", () => {
  const { row } = cleanApplication({ ...base, kind: "creator", links: { instagram: "https://instagram.com/x" }, audienceSize: "25k" });
  const keys = applicationLines(row).map(([k]) => k);
  assert.deepEqual(keys, ["Type", "Pays", "Liens", "Audience"]);
});
