import { useEffect, useRef, useState } from "react";
import { Cookie, Lock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { RouteLink } from "@/components/common/RouteLink";
import { getConsent, setConsent, onConsentOpen } from "@/services/consentService";

// Cookie consent for Google Analytics (Consent Mode, public/consent.js starts
// it « denied »). A dialog in the middle of the screen, the site blurred
// behind it, shown until the visitor answers and again whenever the footer's
// « Cookies » link asks for it.
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
  const firstButton = useRef(null);

  useEffect(() => onConsentOpen(() => {
    setAnalytics(getConsent() === "granted");
    setDetails(false);
    setOpen(true);
  }), []);
  // Keyboard users land on the dialog rather than behind it.
  useEffect(() => { if (open) firstButton.current?.focus(); }, [open, details]);
  if (!open) return null;

  const answer = (value) => { setConsent(value); setOpen(false); setDetails(false); };
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title"
        className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 ${c.border} ${c.card}`}>
        <p id="cookie-consent-title" className={`flex items-center gap-2.5 font-display font-bold text-lg ${c.text}`}>
          <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Cookie size={18} aria-hidden="true" /></span>
          {details ? t("Vos préférences de cookies") : t("Cookies de mesure d'audience")}
        </p>

        {!details ? (
          <>
            <p className={`mt-3 text-sm leading-relaxed ${c.sub}`}>
              {t("Avec votre accord, nous utilisons Google Analytics pour savoir quelles pages sont lues et améliorer le site. Aucune publicité, aucune revente de données.")}{" "}
              <RouteLink r="privacy" className="font-semibold text-blue-600 hover:underline">{t("En savoir plus")}</RouteLink>
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <span ref={firstButton} tabIndex={-1} className="sr-only" />
              <Btn onClick={() => answer("granted")}>{t("Tout accepter")}</Btn>
              <Btn variant="ghost" onClick={() => setDetails(true)}>{t("Accepter uniquement l'essentiel")}</Btn>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              <CategoryRow
                title={t("Essentiels")}
                text={t("Connexion, sécurité, langue et thème. Indispensables au fonctionnement du site, toujours actifs.")}
                locked
              />
              <CategoryRow
                title={t("Mesure d'audience")}
                text={t("Google Analytics : les pages consultées et le parcours sur le site, pour l'améliorer.")}
                checked={analytics}
                onChange={setAnalytics}
                switchRef={firstButton}
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Btn variant="ghost" onClick={() => answer("denied")}>{t("Refuser")}</Btn>
              <Btn onClick={() => answer(analytics ? "granted" : "denied")}>{t("Enregistrer mes choix")}</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// One cookie category: its name, what it is for, and its switch (a padlock for
// the essentials, which cannot be turned off).
function CategoryRow({ title, text, checked, onChange, locked, switchRef }) {
  const { c, t } = useApp();
  const on = locked || checked;
  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-4 ${c.border}`}>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${c.text}`}>{title}</p>
        <p className={`mt-1 text-xs leading-relaxed ${c.sub}`}>{text}</p>
      </div>
      {locked ? (
        <span className={`flex items-center gap-1 text-xs font-semibold shrink-0 ${c.faint}`}><Lock size={12} aria-hidden="true" /> {t("Toujours actifs")}</span>
      ) : (
        <button ref={switchRef} role="switch" aria-checked={on} aria-label={title} onClick={() => onChange(!checked)}
          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${on ? "bg-blue-600" : c.track}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
        </button>
      )}
    </div>
  );
}
