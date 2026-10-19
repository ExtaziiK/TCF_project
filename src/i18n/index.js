// The English dictionary is ~250 KB of strings that a French visitor — most
// of them — never reads, so it is its own chunk, fetched the first time the
// UI is switched to English (or at boot when English is the saved choice; see
// main.jsx). Until it has arrived, lookups fall back to the French source.
let EN = null;
let EN_PATTERNS = [];
let loading = null;

export function loadEnglish() {
  loading ||= import("@/i18n/en").then(
    (m) => {
      EN = m.EN;
      EN_PATTERNS = m.EN_PATTERNS;
    },
    (err) => {
      loading = null; // a failed fetch (offline, new deploy) can be retried
      throw err;
    },
  );
  return loading;
}

export const englishReady = () => EN !== null;

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
  if (lang !== "en" || typeof text !== "string" || !EN) return text;
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
