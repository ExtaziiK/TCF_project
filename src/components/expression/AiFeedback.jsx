import { Sparkles, Check, ArrowUpRight, ChevronDown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill } from "@/components/common";

// Renders one AI evaluation (shared by Expression écrite & orale). The dynamic
// text (summary, bullets, corrected version) is already localized by the model
// via the `lang` we send; only the static labels go through t().
export function AiFeedback({ level, score, nclc, summary, strengths = [], improvements = [], corrected, rewrites = [], compact }) {
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
          {/* One centered control instead of a label plus a separate "read it"
              link: the label WAS the toggle, so give it the affordance (chevron,
              cursor, native <details> semantics) directly rather than hiding
              "click to open" behind a second, easy-to-miss line of text.
              grad-brand (not the plain blue-600 text every other header in this
              card uses) makes it the one thing here styled like a call to
              action — this is the payoff of the whole analysis. */}
          <details className="group">
            <summary className="mx-auto w-fit flex items-center gap-2 rounded-full grad-brand text-white text-sm font-bold px-5 py-2.5 cursor-pointer select-none list-none shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all duration-200">
              <Sparkles size={15} aria-hidden="true" />
              {t("Version améliorée")}
              <span className="px-2 py-0.5 rounded-full bg-white/25 text-[11px] font-extrabold">C2</span>
              <ChevronDown size={16} className="transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className={`mt-4 text-sm leading-relaxed whitespace-pre-line ${c.sub}`}>{corrected}</p>
          </details>
        </div>
      )}
    </Card>
  );
}
