import { Sparkles, Check, ArrowUpRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill } from "@/components/common";

// Renders one AI evaluation (shared by Expression écrite & orale). The dynamic
// text (summary, bullets, corrected version) is already localized by the model
// via the `lang` we send; only the static labels go through t().
export function AiFeedback({ level, summary, strengths = [], improvements = [], corrected, compact }) {
  const { c, t } = useApp();
  return (
    <Card className={`${compact ? "p-4" : "p-6"} border-2 border-blue-600/40 rise`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="font-semibold text-sm text-blue-600 flex items-center gap-1.5"><Sparkles size={15} /> {t("Analyse IA")}</p>
        {level && <Pill tone="blue">{t("Niveau estimé :")} {level}</Pill>}
      </div>
      {summary && <p className={`text-sm ${c.sub} mb-4`}>{summary}</p>}

      {strengths.length > 0 && (
        <div className="mb-4">
          <p className={`text-xs font-bold uppercase tracking-wide ${c.faint} mb-2`}>{t("Points forts")}</p>
          <ul className="space-y-2">
            {strengths.map((s, i) => (
              <li key={i} className={`flex gap-2.5 text-sm ${c.sub}`}><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />{s}</li>
            ))}
          </ul>
        </div>
      )}

      {improvements.length > 0 && (
        <div>
          <p className={`text-xs font-bold uppercase tracking-wide ${c.faint} mb-2`}>{t("À améliorer")}</p>
          <ul className="space-y-2">
            {improvements.map((s, i) => (
              <li key={i} className={`flex gap-2.5 text-sm ${c.sub}`}><ArrowUpRight size={15} className="text-amber-500 shrink-0 mt-0.5" />{s}</li>
            ))}
          </ul>
        </div>
      )}

      {corrected && (
        <details className="mt-4">
          <summary className="text-sm font-semibold text-blue-600 cursor-pointer select-none">{t("Voir une version améliorée")}</summary>
          <p className={`mt-2 text-sm leading-relaxed whitespace-pre-line ${c.sub}`}>{corrected}</p>
        </details>
      )}
    </Card>
  );
}
