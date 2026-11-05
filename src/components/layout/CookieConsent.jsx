import { useEffect, useRef, useState } from "react";
import { Cookie, Lock, ShieldCheck, BarChart3, ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { RouteLink } from "@/components/common/RouteLink";
import { getConsent, setConsent, onConsentOpen } from "@/services/consentService";

// Cookie consent for Google Analytics (Consent Mode, public/consent.js starts
// it « denied »). A card anchored at the bottom centre of the screen, the site
// blurred behind it, shown until the visitor answers and again whenever the
// footer's « Cookies » link asks for it. Drawn in the site's own vocabulary:
// brand-gradient strip and icon tile, blue eyebrow, display-font title, the
// gradient « accent » button for the main action.
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
  const panel = useRef(null);

  useEffect(() => onConsentOpen(() => {
    setAnalytics(getConsent() === "granted");
    setDetails(false);
    setOpen(true);
  }), []);
  // Keyboard and screen-reader users land in the card rather than behind it.
  useEffect(() => { if (open) panel.current?.focus(); }, [open, details]);
  if (!open) return null;

  const answer = (value) => { setConsent(value); setOpen(false); setDetails(false); };
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center p-3 sm:p-6 bg-slate-950/30 backdrop-blur-sm">
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title"
        className={`rise relative w-full max-w-3xl overflow-hidden rounded-[28px] border shadow-2xl outline-none ${c.border} ${c.card}`}>
        <div className="grad-brand h-1.5" aria-hidden="true" />
        <div className="p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grad-brand w-11 h-11 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/25">
              <Cookie size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{t("Confidentialité")}</p>
              <h2 id="cookie-consent-title" className={`mt-1 font-display font-bold text-lg sm:text-xl leading-snug ${c.text}`}>
                {details ? t("Vos préférences de cookies") : t("Cookies de mesure d'audience")}
              </h2>
            </div>
          </div>

          {!details ? (
            <div className="mt-4 md:flex md:items-end md:gap-8">
              <p className={`text-sm leading-relaxed md:flex-1 ${c.sub}`}>
                {t("Avec votre accord, nous utilisons Google Analytics pour savoir quelles pages sont lues et améliorer le site. Aucune publicité, aucune revente de données.")}{" "}
                <RouteLink r="privacy" className="font-semibold text-blue-600 hover:underline">{t("En savoir plus")}</RouteLink>
              </p>
              <div className="mt-5 md:mt-0 flex flex-col sm:flex-row md:flex-col gap-2 md:w-64 shrink-0">
                <Btn variant="accent" className="sm:flex-1 md:flex-none" onClick={() => answer("granted")}>{t("Tout accepter")}</Btn>
                <Btn variant="ghost" className="sm:flex-1 md:flex-none" onClick={() => setDetails(true)}>{t("Accepter uniquement l'essentiel")}</Btn>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 grid md:grid-cols-2 gap-3">
                <CategoryRow
                  icon={ShieldCheck}
                  title={t("Essentiels")}
                  text={t("Connexion, sécurité, langue et thème. Indispensables au fonctionnement du site, toujours actifs.")}
                  locked
                />
                <CategoryRow
                  icon={BarChart3}
                  title={t("Mesure d'audience")}
                  text={t("Google Analytics : les pages consultées et le parcours sur le site, pour l'améliorer.")}
                  checked={analytics}
                  onChange={setAnalytics}
                />
              </div>
              <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center gap-2">
                <button type="button" onClick={() => setDetails(false)}
                  className={`inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-2 py-2 sm:mr-auto ${c.sub} hover:text-blue-600 transition-colors`}>
                  <ArrowLeft size={15} aria-hidden="true" /> {t("Retour")}
                </button>
                <Btn variant="ghost" onClick={() => answer("denied")}>{t("Refuser")}</Btn>
                <Btn variant="accent" onClick={() => answer(analytics ? "granted" : "denied")}>{t("Enregistrer mes choix")}</Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// One cookie category: its icon, name, purpose, and its switch (a padlock for
// the essentials, which cannot be turned off).
function CategoryRow({ icon: Icon, title, text, checked, onChange, locked }) {
  const { c, t } = useApp();
  const on = locked || checked;
  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-3 transition-colors ${on ? "border-blue-600/30 bg-blue-600/[0.05]" : c.border}`}>
      <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Icon size={17} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className={`text-sm font-semibold ${c.text}`}>{title}</p>
          {locked ? (
            <span className={`flex items-center gap-1 text-[11px] font-semibold shrink-0 ${c.faint}`}><Lock size={11} aria-hidden="true" /> {t("Toujours actifs")}</span>
          ) : (
            <button type="button" role="switch" aria-checked={on} aria-label={title} onClick={() => onChange(!checked)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${on ? "bg-blue-600" : c.track}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
            </button>
          )}
        </div>
        <p className={`mt-1 text-xs leading-relaxed ${c.sub}`}>{text}</p>
      </div>
    </div>
  );
}
