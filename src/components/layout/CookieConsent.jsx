import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { RouteLink } from "@/components/common/RouteLink";
import { getConsent, setConsent, onConsentOpen } from "@/services/consentService";

// Cookie banner for Google Analytics (consent for the EU's RGPD and Quebec's
// Loi 25). Shown until the visitor answers, and again whenever the footer's
// « Cookies » link asks for it. Refusing is exactly as easy as accepting: two
// buttons of the same size, side by side, and no cookie is set before a click
// (public/consent.js starts Google in « denied »).
export function CookieConsent() {
  const { c, t } = useApp();
  const [open, setOpen] = useState(() => getConsent() === null);
  useEffect(() => onConsentOpen(() => setOpen(true)), []);
  if (!open) return null;

  const answer = (value) => { setConsent(value); setOpen(false); };
  return (
    <div role="dialog" aria-labelledby="cookie-consent-title"
      className="fixed z-[60] bottom-4 inset-x-4 sm:inset-x-auto sm:left-4 sm:max-w-sm">
      <div className={`rounded-3xl border shadow-2xl p-5 ${c.border} ${c.card}`}>
        <p id="cookie-consent-title" className={`flex items-center gap-2 font-display font-bold ${c.text}`}>
          <Cookie size={18} className="text-blue-600" aria-hidden="true" /> {t("Cookies de mesure d'audience")}
        </p>
        <p className={`mt-2 text-sm leading-relaxed ${c.sub}`}>
          {t("Avec votre accord, nous utilisons Google Analytics pour savoir quelles pages sont lues et améliorer le site. Aucune publicité, aucune revente de données.")}{" "}
          <RouteLink r="privacy" className="font-semibold text-blue-600 hover:underline">{t("En savoir plus")}</RouteLink>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Btn small variant="soft" onClick={() => answer("denied")}>{t("Refuser")}</Btn>
          <Btn small variant="soft" onClick={() => answer("granted")}>{t("Accepter")}</Btn>
        </div>
      </div>
    </div>
  );
}
