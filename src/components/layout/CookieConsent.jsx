import { useEffect, useState } from "react";
import { Cookie, Lock, ShieldCheck, BarChart3, ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { RouteLink } from "@/components/common/RouteLink";
import { getConsent, setConsent, onConsentOpen } from "@/services/consentService";

// Cookie consent for Google Analytics (Consent Mode, public/consent.js starts
// it « denied »). A compact card at the bottom centre of the screen, shown
// until the visitor answers and again whenever the footer's « Cookies » link
// asks for it. Drawn in the site's own vocabulary: brand-gradient strip and
// icon tile, display-font title, the gradient « accent » button.
//
// It never blocks the site: no overlay, and the full-width wrapper lets clicks
// through (pointer-events-none) except on the card itself. Nor does it take
// the focus on opening — besides being intrusive, a focused card picked up the
// global `*:focus-visible` rule (styles/index.css), whose border-radius:8px
// squared the card's corners until the visitor clicked elsewhere.
//
// Two views:
//   · « Tout accepter » or « Accepter uniquement l'essentiel »;
//   · the latter opens the detail: one toggle per category (essentials always
//     on), « Refuser » and « Enregistrer mes choix ».
// No cookie is set before a click either way.
export function CookieConsent() {
  const { c, t } = useApp();
  const [open, setOpen] = useState(() => getConsent() === null);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(() => getConsent() === "granted");

  useEffect(() => onConsentOpen(() => {
    setAnalytics(getConsent() === "granted");
    setDetails(false);
    setOpen(true);
  }), []);
  if (!open) return null;

  const answer = (value) => { setConsent(value); setOpen(false); setDetails(false); };
  return (
    <div className="fixed inset-x-0 bottom-0 z-[95] flex justify-center p-3 sm:p-4 pointer-events-none">
      <section aria-labelledby="cookie-consent-title"
        className={`rise pointer-events-auto relative w-full max-w-3xl overflow-hidden rounded-3xl border shadow-2xl ${c.border} ${c.card}`}>
        <div className="grad-brand h-1" aria-hidden="true" />
        {!details ? (
          <div className="px-4 py-3 sm:px-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span className="grad-brand w-8 h-8 rounded-xl text-white flex items-center justify-center shrink-0">
                <Cookie size={16} aria-hidden="true" />
              </span>
              <p className={`text-xs sm:text-[13px] leading-snug ${c.sub}`}>
                <span id="cookie-consent-title" className={`font-display font-bold ${c.text}`}>{t("Cookies de mesure d'audience")}</span>
                {" · "}
                {t("Avec votre accord, nous utilisons Google Analytics pour savoir quelles pages sont lues et améliorer le site. Aucune publicité, aucune revente de données.")}{" "}
                <RouteLink r="privacy" className="font-semibold text-blue-600 hover:underline">{t("En savoir plus")}</RouteLink>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Btn small variant="ghost" className="flex-1 md:flex-none !px-3.5" onClick={() => setDetails(true)}>{t("Accepter uniquement l'essentiel")}</Btn>
              <Btn small variant="accent" className="flex-1 md:flex-none" onClick={() => answer("granted")}>{t("Tout accepter")}</Btn>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 sm:px-5">
            <p id="cookie-consent-title" className={`font-display font-bold text-sm ${c.text}`}>{t("Vos préférences de cookies")}</p>
            <div className="mt-2 grid sm:grid-cols-2 gap-2">
              <CategoryRow icon={ShieldCheck} title={t("Essentiels")} text={t("Connexion, sécurité, langue et thème.")} locked />
              <CategoryRow icon={BarChart3} title={t("Mesure d'audience")} text={t("Google Analytics, pour améliorer le site.")}
                checked={analytics} onChange={setAnalytics} />
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <button type="button" onClick={() => setDetails(false)}
                className={`inline-flex items-center gap-1 text-xs font-semibold mr-auto ${c.sub} hover:text-blue-600 transition-colors`}>
                <ArrowLeft size={14} aria-hidden="true" /> {t("Retour")}
              </button>
              <Btn small variant="ghost" onClick={() => answer("denied")}>{t("Refuser")}</Btn>
              <Btn small variant="accent" onClick={() => answer(analytics ? "granted" : "denied")}>{t("Enregistrer mes choix")}</Btn>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// One cookie category, on a single line: icon, name, purpose, and its switch
// (a padlock for the essentials, which cannot be turned off).
function CategoryRow({ icon: Icon, title, text, checked, onChange, locked }) {
  const { c, t } = useApp();
  const on = locked || checked;
  return (
    <div className={`rounded-2xl border px-3 py-2 flex items-center gap-2.5 transition-colors ${on ? "border-blue-600/30 bg-blue-600/[0.05]" : c.border}`}>
      <Icon size={16} className="text-blue-600 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-semibold ${c.text}`}>{title}</p>
        <p className={`text-[11px] leading-snug ${c.sub}`}>{text}</p>
      </div>
      {locked ? (
        <span className={`flex items-center gap-1 text-[11px] font-semibold shrink-0 ${c.faint}`}><Lock size={11} aria-hidden="true" /> {t("Toujours actifs")}</span>
      ) : (
        <button type="button" role="switch" aria-checked={on} aria-label={title} onClick={() => onChange(!checked)}
          className={`w-10 h-[22px] rounded-full transition-colors relative shrink-0 ${on ? "bg-blue-600" : c.track}`}>
          <span className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${on ? "left-5" : "left-0.5"}`} />
        </button>
      )}
    </div>
  );
}
