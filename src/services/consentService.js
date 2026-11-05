// The visitor's cookie choice for Google Analytics and Google Ads conversion
// measurement, stored as one value:
//   "all"     — analytics + ads
//   "granted" — analytics only (also what any choice made before the ads
//               category existed means: that « oui » never covered ads)
//   "ads"     — ads only
//   "denied"  — neither
//   null      — not answered yet (the banner is then shown)
//
// Stored under the same localStorage key public/consent.js reads before the
// Google tag loads, so the choice made here also applies to every later page
// load from its very first hit. Changing it calls Consent Mode's « update »,
// which takes effect at once without a reload. ad_personalization (remarketing)
// is never granted.

const KEY = "cookie-consent";
const OPEN_EVENT = "cookie-consent:open";
const VALUES = ["all", "granted", "ads", "denied"];

export function getConsent() {
  try {
    const v = window.localStorage.getItem(KEY);
    return VALUES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

// What a stored value allows, and back.
export const consentFlags = (value) => ({
  analytics: value === "all" || value === "granted",
  ads: value === "all" || value === "ads",
});
export const consentValue = ({ analytics, ads }) => (analytics && ads ? "all" : analytics ? "granted" : ads ? "ads" : "denied");

export function setConsent(value) {
  try { window.localStorage.setItem(KEY, value); } catch { /* storage blocked: applies to this visit only */ }
  const { analytics, ads } = consentFlags(value);
  const state = (on) => (on ? "granted" : "denied");
  window.gtag?.("consent", "update", {
    analytics_storage: state(analytics),
    ad_storage: state(ads),
    ad_user_data: state(ads),
  });
}

// The footer's « Cookies » link reopens the banner so a choice can be changed.
export const openConsent = () => window.dispatchEvent(new window.Event(OPEN_EVENT));
export const onConsentOpen = (fn) => {
  window.addEventListener(OPEN_EVENT, fn);
  return () => window.removeEventListener(OPEN_EVENT, fn);
};
