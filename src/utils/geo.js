// The visitor's country, used for exactly one thing: which currency tab the
// pricing block opens on. Two sources, used in this order:
//
//   1. guessCountry() — the browser's own timezone/locale. Synchronous, so the
//      very first paint is already right for most Algerian visitors and no tab
//      is seen flipping a moment after the page appears.
//   2. detectCountry() — /api/geo, i.e. the edge's reading of the request IP.
//      Authoritative, and the only source that gets it right when the device
//      disagrees with where it is (a phone set to fr-FR being used in Alger).
//
// Both are advisory: they choose a default the visitor can always override,
// and nothing about payment or access is decided here.

const CACHE_KEY = "passerelle.country";

// Per tab: a session is short enough that the answer cannot go stale in a way
// that matters, and it keeps Accueil → Tarifs from making the same call twice.
const readCache = () => {
  try { return sessionStorage.getItem(CACHE_KEY) || ""; } catch { return ""; }
};
const writeCache = (code) => {
  try { sessionStorage.setItem(CACHE_KEY, code); } catch { /* private mode */ }
};

// Best guess from the device alone, or null when it says nothing useful.
export function guessCountry() {
  try {
    // Algeria has a single timezone and Africa/Algiers is used by nowhere else,
    // so this is a strong signal on its own — stronger than the language tag,
    // which is very often plain "fr" there.
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Africa/Algiers") return "DZ";
  } catch { /* no Intl.timeZone — fall through to the language tags */ }
  try {
    const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const tag of tags) {
      const region = /^[A-Za-z]{2,3}[-_]([A-Za-z]{2})\b/.exec(String(tag || ""));
      if (region) return region[1].toUpperCase();
    }
  } catch { /* no navigator.languages */ }
  return null;
}

// The edge's answer, or null if it cannot be had. Never throws: a failure here
// only means the caller keeps whatever guessCountry() said.
export async function detectCountry() {
  const cached = readCache();
  if (cached) return cached;
  try {
    const res = await fetch("/api/geo", { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    // A static preview (or `vite dev`) has no serverless functions and rewrites
    // this path to index.html, so the body may well be HTML — .json() throws
    // and we fall into the catch, which is the correct outcome anyway.
    const { country } = await res.json();
    if (!/^[A-Z]{2}$/.test(String(country || ""))) return null;
    writeCache(country);
    return country;
  } catch {
    return null; // offline, blocked, or no functions deployed
  }
}
