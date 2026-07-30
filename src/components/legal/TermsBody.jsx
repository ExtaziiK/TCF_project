import { AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { TERMS_SECTIONS, TERMS_UPDATED, TERMS_DRAFT, TERMS_DRAFT_NOTICE, fillOperator } from "@/constants/terms";

// The conditions themselves, rendered identically on the standalone page and
// inside the registration dialog — one component so the text a visitor accepts
// at signup is provably the same text published at /conditions-generales.
export function TermsBody({ compact }) {
  const { c, t } = useApp();
  return (
    <div className={compact ? "space-y-5" : "space-y-7"}>
      {TERMS_DRAFT && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>{t(TERMS_DRAFT_NOTICE)}</span>
          </p>
        </div>
      )}
      <p className={`text-xs ${c.faint}`}>{t("Dernière mise à jour :")} {t(TERMS_UPDATED)}</p>
      {TERMS_SECTIONS.map((s) => (
        <section key={s.t}>
          <h2 className={`font-display font-bold ${compact ? "text-base" : "text-lg"} ${c.text}`}>{t(s.t)}</h2>
          {/* Substitution runs AFTER translation so each paragraph keeps one
              stable i18n key whatever the operator's details are. */}
          {s.p.map((para, i) => (
            <p key={i} className={`mt-2 text-sm leading-relaxed ${c.sub}`}>{fillOperator(t(para))}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
