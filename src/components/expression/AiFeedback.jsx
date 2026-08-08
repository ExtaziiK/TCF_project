import { Sparkles, Check, ArrowUpRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill } from "@/components/common";

// Renders one AI evaluation (shared by Expression écrite & orale). The dynamic
// text (summary, bullets, corrected version) is already localized by the model
// via the `lang` we send; only the static labels go through t().
export function AiFeedback({ level, score, nclc, summary, strengths = [], improvements = [], corrected, targetLevel, rewrites = [], compact }) {
  const { c, t } = useApp();
  return (
    <Card className={`${compact ? "p-4" : "p-6"} border-2 border-blue-600/40 rise`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="font-semibold text-sm text-blue-600 flex items-center gap-1.5"><Sparkles size={15} /> {t("Analyse IA")}</p>
        <span className="flex items-center gap-1.5 flex-wrap justify-end">
          {typeof score === "number" && <Pill tone="blue">{score} / 20</Pill>}
          {level && <Pill tone="blue">{level}</Pill>}
          {typeof nclc === "number" && <Pill tone="green">NCLC {nclc}</Pill>}
          {/* Below 4/20 the TCF awards no level at all, so there is nothing to
              convert. Saying so beats a lone score with two empty spaces beside
              it, which reads as something having failed to load. */}
          {typeof score === "number" && !level && <Pill tone="slate">{t("Niveau non attribué")}</Pill>}
        </span>
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

      {rewrites.length > 0 && (
        <div className="mt-5 pt-4 border-t border-blue-600/20">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600 flex items-center gap-1.5 mb-3">
            <Sparkles size={14} /> {t("Vos phrases, en mieux")}
          </p>
          <ul className="space-y-3">
            {rewrites.map((r, i) => (
              <li key={i} className={`rounded-2xl border ${c.border} overflow-hidden`}>
                {/* Their own sentence struck through, the better version under
                    it. Seeing the two together is what makes the advice land;
                    a bullet saying "vary your vocabulary" does not. */}
                <p className={`px-3.5 py-2.5 text-sm line-through decoration-rose-500/60 ${c.sub}`}>{r.before}</p>
                <p className={`px-3.5 py-2.5 text-sm border-t ${c.border} ${c.text}`}>
                  <Sparkles size={14} className="inline text-blue-500 mr-1.5 -mt-0.5" />{r.after}
                </p>
                {r.why && <p className={`px-3.5 pb-2.5 text-xs ${c.faint}`}>{r.why}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {corrected && (
        <div className="mt-5 pt-4 border-t border-blue-600/20">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600 flex items-center gap-1.5"><ArrowUpRight size={14} /> {t("Version améliorée")}</p>
            {targetLevel && <Pill tone="blue">{t("Niveau visé :")} {targetLevel}</Pill>}
          </div>
          <details>
            <summary className="text-sm font-semibold text-blue-600 cursor-pointer select-none">{t("Lire le texte réécrit")}</summary>
            <p className={`mt-2 text-sm leading-relaxed whitespace-pre-line ${c.sub}`}>{corrected}</p>
          </details>
        </div>
      )}
    </Card>
  );
}
