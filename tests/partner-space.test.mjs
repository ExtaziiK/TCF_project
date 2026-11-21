// Partner space (api/_lib/partners.js): commission maths, totals per currency,
// crediting a sale to the right partner exactly once, and the emails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { commissionFor, salesSummary, recordPartnerSale, receivedEmail, acceptedEmail, declinedEmail } from "../api/_lib/partners.js";

test("commission is the agreed share of the amount paid, rounded to the cent", () => {
  assert.equal(commissionFor(29.99, 20), 6);
  assert.equal(commissionFor(2600, 15), 390);
  assert.equal(commissionFor(10, null), 0);
});

test("totals stay per currency and subtract what was already paid", () => {
  const sales = [
    { occurred_at: "2026-11-02T10:00:00Z", amount: 30, currency: "USD", commission: 6 },
    { occurred_at: "2026-11-20T10:00:00Z", amount: 30, currency: "USD", commission: 6 },
    { occurred_at: "2026-10-15T10:00:00Z", amount: 2600, currency: "DZD", commission: 520 },
  ];
  const { totals, months } = salesSummary(sales, [{ amount: 5, currency: "USD" }]);
  const usd = totals.find((t) => t.currency === "USD");
  const dzd = totals.find((t) => t.currency === "DZD");
  assert.deepEqual(usd, { currency: "USD", sales: 2, revenue: 60, commission: 12, paid: 5, due: 7 });
  assert.deepEqual(dzd, { currency: "DZD", sales: 1, revenue: 2600, commission: 520, paid: 0, due: 520 });
  assert.deepEqual(months.map((m) => `${m.month} ${m.currency} ${m.sales}`), ["2026-11 USD 2", "2026-10 DZD 1"]);
});

// A tiny stand-in for the Supabase client: just the calls recordPartnerSale makes.
function fakeAdmin({ partners, sales = [] }) {
  return {
    sales,
    from(table) {
      const q = { table, filters: {} };
      return {
        select() { return this; },
        eq(k, v) { q.filters[k] = v; return this; },
        async maybeSingle() { return { data: partners.find((p) => p.code === q.filters.code) || null }; },
        insert(row) {
          return {
            select: () => ({
              single: async () => {
                if (sales.some((s) => s.external_id === row.external_id)) return { data: null, error: { code: "23505" } };
                sales.push(row);
                return { data: row, error: null };
              },
            }),
          };
        },
      };
    },
  };
}

test("a sale is credited to the code's partner once, at its commission rate", async () => {
  const admin = fakeAdmin({ partners: [{ id: "p1", code: "SAMIRA10", commission_pct: 20 }] });
  const sale = { code: "samira10", source: "stripe", externalId: "stripe:cs_1", amount: 29.99, currency: "usd", plan: "Pro" };
  const row = await recordPartnerSale(admin, sale);
  assert.equal(row.partner_id, "p1");
  assert.equal(row.currency, "USD");
  assert.equal(row.commission, 6);
  assert.equal(await recordPartnerSale(admin, sale), null, "a redelivered webhook adds nothing");
  assert.equal(admin.sales.length, 1);
});

test("a code that belongs to no partner credits nothing", async () => {
  const admin = fakeAdmin({ partners: [] });
  assert.equal(await recordPartnerSale(admin, { code: "TCF50", source: "dzd", externalId: "dzd:1", amount: 2600, currency: "DZD" }), null);
  assert.equal(admin.sales.length, 0);
});

test("emails: French by default, English when applied in English, code and space link included", () => {
  const fr = receivedEmail({ name: "Samira Benali", lang: "fr", desired_code: "SAMIRA10" });
  assert.match(fr.subject, /bien reçu/);
  assert.match(fr.html, /Bonjour Samira,/);
  assert.match(fr.html, /SAMIRA10/);
  const en = acceptedEmail({ app: { lang: "en" }, partner: { name: "Amine", email: "amine@x.com", code: "AMINE15", discount_pct: 15 }, message: "Welcome!" });
  assert.match(en.subject, /Welcome/);
  assert.match(en.html, /AMINE15/);
  assert.match(en.html, /15% off/);
  assert.match(en.html, /espace-partenaire/);
  assert.match(en.html, /amine@x\.com/);
  const no = declinedEmail({ app: { name: "Ali", lang: "fr" }, message: "Merci.\n\nNous ne pouvons pas donner suite." });
  assert.match(no.html, /Nous ne pouvons pas donner suite/);
});
