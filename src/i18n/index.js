import { EN, EN_PATTERNS } from "@/i18n/en";

// The UI is authored in French (the source language). English is looked up
// in the EN dictionary by the exact French string; templated strings (with
// interpolated numbers/labels) fall through to EN_PATTERNS; date-like
// strings get their French month names swapped. A string nothing matches
// falls back to the French text, so partially translated screens stay usable.
const STORAGE_KEY = "passerelle.lang";

const MONTHS = {
  janvier: "January", février: "February", mars: "March", avril: "April",
  mai: "May", juin: "June", juillet: "July", août: "August",
  septembre: "September", octobre: "October", novembre: "November", décembre: "December",
};
const MONTH_RE = new RegExp(`\\b(${Object.keys(MONTHS).join("|")})\\b`, "g");

export const translate = (lang, text) => {
  if (lang !== "en" || typeof text !== "string") return text;
  if (text in EN) return EN[text];
  const tr = (s) => translate("en", s);
  for (const [re, fn] of EN_PATTERNS) {
    const m = re.exec(text);
    if (m) return fn(m, tr);
  }
  // Formatted dates ("9 juillet 2026", "juillet 2026", "43 % · 9 juillet"):
  // digits + a French month name is a date, not an untranslated sentence.
  if (/\d/.test(text)) return text.replace(MONTH_RE, (mo) => MONTHS[mo]);
  return text;
};

export function loadLang() {
  try { return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "fr"; } catch { return "fr"; }
}

export function saveLang(lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private mode: language just won't persist */ }
}
