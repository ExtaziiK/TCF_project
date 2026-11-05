// The visitor's cookie choice for Google Analytics: "granted", "denied", or
// null when they have not answered yet (the banner is then shown).
//
// Stored under the same localStorage key public/consent.js reads before the
// Google tag loads, so the choice made here also applies to every later page
// load from its very first hit. Changing it calls Consent Mode's « update »,
// which takes effect at once without a reload.

const KEY = "cookie-consent";
const OPEN_EVENT = "cookie-consent:open";

export function getConsent() {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try { window.localStorage.setItem(KEY, value); } catch { /* storage blocked: applies to this visit only */ }
  window.gtag?.("consent", "update", { analytics_storage: value });
}

// The footer's « Cookies » link reopens the banner so a choice can be changed.
export const openConsent = () => window.dispatchEvent(new window.Event(OPEN_EVENT));
export const onConsentOpen = (fn) => {
  window.addEventListener(OPEN_EVENT, fn);
  return () => window.removeEventListener(OPEN_EVENT, fn);
};
