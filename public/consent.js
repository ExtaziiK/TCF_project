// Google tag setup, loaded by index.html BEFORE the tag itself (gtm.js).
//
// A separate file rather than the inline snippet Google hands out: the CSP is
// `script-src 'self' https://www.googletagmanager.com`, which blocks inline
// scripts. Does what Google Tag Manager's snippet does (the dataLayer and its
// « gtm.js » start event, at the end of this file), plus Consent Mode v2:
//
//   · analytics cookies start DENIED and are granted only once the visitor
//     clicks « Accepter » in the cookie banner (src/components/layout/
//     CookieConsent.jsx). Until then Google receives cookieless pings only.
//   · Google Ads conversion measurement (ad_storage + ad_user_data) likewise
//     starts DENIED and is granted only by « Tout accepter » or the
//     « Mesure publicitaire » switch. It tells Google Ads whether a visit
//     from an ad ended in a purchase (/merci); the site itself shows no ads.
//   · ad_personalization (remarketing) is always denied.
//
// The choice is remembered in localStorage under the key below
// (src/services/consentService.js reads and writes the same key), and applied
// here, before the tag loads, so a returning visitor is never measured
// against their choice — not even for the first hit. Values:
//   "all" = analytics + ads · "granted" = analytics only (also what every
//   choice made before ads existed means) · "ads" = ads only · "denied".
(function () {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  var choice = null;
  try { choice = window.localStorage.getItem("cookie-consent"); } catch (e) { /* storage blocked: treat as no choice */ }
  var analytics = choice === "all" || choice === "granted";
  var ads = choice === "all" || choice === "ads";

  gtag("consent", "default", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: ads ? "granted" : "denied",
    ad_user_data: ads ? "granted" : "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
  // The GTM container snippet's own push: it is what starts the container —
  // the « Container Loaded » / All Pages event, and what Tag Assistant
  // (Prévisualiser) waits for. It used to be gtag("js", …), the Google-tag
  // (gtag.js) snippet's line, which GTM does not treat as its start event.
  // Pushed AFTER the consent defaults so every tag sees them.
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
})();
