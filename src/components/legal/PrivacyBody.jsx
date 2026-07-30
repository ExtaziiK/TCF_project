import { AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PRIVACY_SECTIONS, PRIVACY_UPDATED, PRIVACY_DRAFT, PRIVACY_DRAFT_NOTICE } from "@/constants/privacy";
import { fillOperator } from "@/constants/terms";

// The privacy policy, rendered from constants/privacy.js. Mirrors TermsBody:
// same draft banner, same {token} substitution after translation, so both legal
// documents behave identically and can only drift on purpose.
export function PrivacyBody() {
  const { c, t } = useApp();
  return (
    <div className="space-y-7">
      {PRIVACY_DRAFT && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>{t(PRIVACY_DRAFT_NOTICE)}</span>
          </p>
        </div>
      )}
      <p className={`text-xs ${c.faint}`}>{t("Dernière mise à jour :")} {t(PRIVACY_UPDATED)}</p>
      {PRIVACY_SECTIONS.map((s) => (
        <section key={s.t}>
          <h2 className={`font-display font-bold text-lg ${c.text}`}>{t(s.t)}</h2>
          {s.p.map((para, i) => (
            <p key={i} className={`mt-2 text-sm leading-relaxed ${c.sub}`}>{fillOperator(t(para))}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
