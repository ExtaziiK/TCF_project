// A WhatsApp number as a candidate types it → the international form the team
// can call back on. Pure; tests/support-request.test.mjs pins it.
//
// Most candidates write their number the local way — « 0555 12 34 56 » in
// Algeria — and WhatsApp only knows it as +213 555 12 34 56. When the number
// has no country code, the account's country (stored in French at signup, see
// COUNTRIES in src/constants/exam.js) supplies it, for the countries whose
// local numbers start with a trunk « 0 ». A number that cannot be made
// international is still accepted and sent as typed: the team can still read
// it; only the one-tap WhatsApp link is left out.

// Country (as stored at signup) → calling code, for trunk-0 numbering plans.
const TRUNK_ZERO = {
  "Algérie": "213", "Maroc": "212", "Tunisie": "216", "France": "33", "Belgique": "32",
  "Égypte": "20", "Liban": "961", "Royaume-Uni": "44", "Turquie": "90", "Syrie": "963",
  "Iran": "98", "Irak": "964", "Jordanie": "962", "Pakistan": "92",
};
// North American numbers: ten digits, no trunk prefix.
const NANP = new Set(["Canada", "États-Unis"]);

export function normalizeWhatsApp(raw, country = "") {
  const typed = String(raw || "").trim().slice(0, 40);
  let s = typed.replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  let international = s.startsWith("+");
  let digits = s.replace(/\D/g, "");

  if (!international && TRUNK_ZERO[country] && digits.startsWith("0")) {
    digits = TRUNK_ZERO[country] + digits.slice(1);
    international = true;
  } else if (!international && NANP.has(country) && digits.length === 10) {
    digits = `1${digits}`;
    international = true;
  }

  // E.164 allows at most 15 digits; fewer than 8 is not a phone number.
  const ok = digits.length >= 8 && digits.length <= 15;
  return {
    ok,
    typed,
    international: ok && international,
    e164: ok && international ? `+${digits}` : null,
    waLink: ok && international ? `https://wa.me/${digits}` : null,
  };
}
