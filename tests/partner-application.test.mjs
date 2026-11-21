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
    studentsPerYear: "31 à 100", courseFormat: "both", tests: ["TCF Canada", "Inventé"], links: { instagram: "x" }, desiredCode: "HORIZON",
  });
  assert.equal(row.phone, "+213555123456");
  assert.equal(waLink, "https://wa.me/213555123456");
  assert.equal(row.students_per_year, "31 à 100");
  assert.equal(row.course_format, "both");
  assert.deepEqual(row.tests, ["TCF Canada"]);
  assert.equal(row.links, undefined, "creator fields are not kept on a school");
  assert.equal(row.desired_code, undefined, "schools get a group agreement, not a promo code");
});

test("ranges and formats outside the lists are dropped", () => {
  const { row } = cleanApplication({ ...base, kind: "school", organisation: "X", phone: "+213555123456", studentsPerYear: "60", courseFormat: "hybride" });
  assert.equal(row.students_per_year, null);
  assert.equal(row.course_format, null);
});

test("teachers and creators choose a 4–15 character code, upper-cased", () => {
  assert.match(cleanApplication({ ...base, kind: "teacher" }).error, /code/);
  assert.match(cleanApplication({ ...base, kind: "teacher", desiredCode: "ab" }).error, /4 à 15/);
  assert.match(cleanApplication({ ...base, kind: "teacher", desiredCode: "SAMIRA 10" }).error, /4 à 15/);
  const { row } = cleanApplication({ ...base, kind: "teacher", desiredCode: " samira10 ", payoutMethod: "baridimob", payoutDetails: "CCP 0012345 67" });
  assert.equal(row.desired_code, "SAMIRA10");
  assert.equal(row.payout_method, "baridimob");
  assert.equal(row.payout_details, "CCP 0012345 67");
  assert.equal(cleanApplication({ ...base, kind: "teacher", desiredCode: "SAMIRA10", payoutMethod: "paypal" }).row.payout_method, null);
});

test("a creator needs at least one link; the phone is optional", () => {
  assert.match(cleanApplication({ ...base, kind: "creator", desiredCode: "AMINE15" }).error, /lien/);
  const { row } = cleanApplication({ ...base, kind: "creator", desiredCode: "AMINE15", links: { youtube: " https://youtube.com/@x ", tiktok: "" } });
  assert.deepEqual(row.links, { youtube: "https://youtube.com/@x" });
  assert.equal(row.phone, null);
});

test("other proposals need a message; unknown kinds and bad emails are refused", () => {
  assert.match(cleanApplication({ ...base, kind: "other" }).error, /Décrivez/);
  assert.ok(cleanApplication({ ...base, kind: "other", message: "Un salon étudiant" }).row);
  assert.match(cleanApplication({ ...base, kind: "partner" }).error, /type/);
  assert.match(cleanApplication({ ...base, kind: "other", message: "x", email: "nope" }).error, /courriel/);
});

test("the email lines carry only what was filled in, never the payout details", () => {
  const { row } = cleanApplication({
    ...base, kind: "creator", desiredCode: "AMINE15", links: { instagram: "https://instagram.com/x" },
    audienceSize: "10 000 à 100 000", payoutMethod: "wise", payoutDetails: "amine@wise.com",
  });
  const lines = applicationLines(row);
  assert.deepEqual(lines.map(([k]) => k), ["Type", "Pays", "Liens", "Audience", "Code souhaité", "Paiement"]);
  assert.ok(!lines.some(([, v]) => String(v).includes("amine@wise.com")));
});
