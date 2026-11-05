// Google tag setup, loaded by index.html BEFORE the tag itself (gtm.js).
//
// A separate file rather than the inline snippet Google hands out: the CSP is
// `script-src 'self' https://www.googletagmanager.com`, which blocks inline
// scripts. Same three statements as Google's snippet, plus Consent Mode v2:
//
//   · analytics cookies start DENIED and are granted only once the visitor
//     clicks « Accepter » in the cookie banner (src/components/layout/
//     CookieConsent.jsx). Until then Google receives cookieless pings only.
//   · advertising storage is always denied: the site runs no ads.
//
// The choice is remembered in localStorage under the key below
// (src/services/consentService.js reads and writes the same key), and applied
// here, before the tag loads, so a returning visitor is never measured
// against their choice — not even for the first hit.
(function () {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  var choice = null;
  try { choice = window.localStorage.getItem("cookie-consent"); } catch (e) { /* storage blocked: treat as no choice */ }

  gtag("consent", "default", {
    analytics_storage: choice === "granted" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
  gtag("js", new Date());
})();
