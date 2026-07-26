import { Clock, ListChecks, CheckCircle2, HelpCircle, Lightbulb } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { CO_GUIDE, CE_GUIDE } from "@/constants/guideComprehension";

// Section → guide config, so surfaces outside this file (e.g. the quiz page's
// "Guide de l'épreuve" popup) can pull the right data by épreuve code.
export const COMPREHENSION_GUIDE_BY_SECTION = { co: CO_GUIDE, ce: CE_GUIDE };

// The guide's inner content, without the PageShell wrapper — reused both by the
// full guide page below and by the side panel shown on the quiz page. In the
// panel the available width is ~440px, so `compact` tightens every dimension
// (padding, headings, spacing) and drops the 3-column types grid to a single
// column, otherwise the same content reads as cramped and overloaded.
export function ComprehensionGuideBody({ d, compact = false }) {
  const { c, t } = useApp();
  const ex = d.example;
  // Spacing/scale tokens swapped by density so the two layouts stay in sync.
  const cardPad = compact ? "p-4" : "p-6 md:p-7";
  const blockGap = compact ? "mb-6" : "mb-10";
  const heading = `font-display font-bold ${compact ? "text-base" : "text-xl"} ${c.text}`;
  const headingGap = compact ? "mb-3" : "mb-5";
  return (
    <>
      <div className={`flex flex-wrap gap-2 ${compact ? "mb-5" : "mb-8"}`}>
        <Pill tone="blue"><Clock size={12} /> {t(d.durationLabel)}</Pill>
        <Pill tone="slate">{t("39 questions")}</Pill>
        <Pill tone="slate">{t("QCM · 4 choix")}</Pill>
        <Pill tone="green">{t("Score sur 699")}</Pill>
      </div>

      {/* Skills tested */}
      <Card className={`${cardPad} ${blockGap}`}>
        <div className="flex items-center gap-2 mb-4">
          <ListChecks size={18} className="text-blue-600 shrink-0" />
          <h3 className={`font-display font-bold ${compact ? "text-sm" : ""} ${c.text}`}>{t(d.skillsTitle)}</h3>
        </div>
        <ul className="space-y-2.5">
          {d.skills.map((x) => (
            <li key={x} className={`flex gap-2.5 text-sm ${c.sub}`}><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />{t(x)}</li>
          ))}
        </ul>
      </Card>

      {/* Question types */}
      <h3 className={`${heading} ${headingGap}`}>{t("Les types de questions")}</h3>
      <div className={`${compact ? "space-y-3" : "grid sm:grid-cols-3 gap-4"} ${blockGap}`}>
        {d.types.map((ty, i) => (
          <Card key={ty.t} className={compact ? "p-4" : "p-5"}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-xl grad-brand text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
              <p className={`font-display font-bold text-sm ${c.text}`}>{t(ty.t)}</p>
            </div>
            <p className={`text-sm leading-relaxed ${c.sub}`}>{t(ty.d)}</p>
          </Card>
        ))}
      </div>

      {/* Worked example */}
      <h3 className={`${heading} ${headingGap} flex items-center gap-2`}><HelpCircle size={compact ? 18 : 20} className="text-blue-600 shrink-0" /> {t("Un exemple")}</h3>
      <Card className={`${cardPad} ${blockGap}`}>
        <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 text-sm italic leading-relaxed ${c.sub}`}>{t(ex.context)}</div>
        <p className={`font-semibold mt-4 ${c.text}`}>{t(ex.question)}</p>
        <div className="mt-3 space-y-2">
          {ex.options.map((o) => {
            const correct = o.k === ex.answer;
            return (
              <div key={o.k} className={`flex items-center gap-3 ${compact ? "px-3 py-2" : "px-4 py-2.5"} rounded-2xl border text-sm ${correct ? "border-emerald-500 bg-emerald-500/10" : c.border}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${correct ? "bg-emerald-500 text-white" : "bg-blue-600/10 text-blue-600"}`}>{o.k}</span>
                <span className={`flex-1 ${correct ? "font-semibold text-emerald-600" : c.sub}`}>{t(o.txt)}</span>
                {correct && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
              </div>
            );
          })}
        </div>
        {ex.note && <p className={`text-xs mt-3 ${c.faint}`}>{t(ex.note)}</p>}
      </Card>

      {/* Tips */}
      <h3 className={`${heading} mb-2`}>{t("Conseils pour réussir")}</h3>
      <p className={`text-sm ${headingGap} ${c.sub}`}>{t(d.tipsIntro)}</p>
      <Card className={cardPad}>
        <div className="flex items-center gap-2 mb-4"><Lightbulb size={18} className="text-amber-500 shrink-0" /><p className={`font-display font-bold ${compact ? "text-sm" : ""} ${c.text}`}>{t("Bons réflexes")}</p></div>
        <ul className="space-y-2.5">
          {d.tips.map((x) => (<li key={x} className={`flex gap-2.5 text-sm ${c.sub}`}><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />{t(x)}</li>))}
        </ul>
      </Card>
    </>
  );
}

// Config-driven guide shared by the two comprehension épreuves (CO / CE).
function ComprehensionGuide({ d }) {
  const { t } = useApp();
  return (
    <PageShell back eyebrow={t(d.eyebrow)} title={t(d.title)} sub={t(d.sub)}>
      <ComprehensionGuideBody d={d} />
    </PageShell>
  );
}

export function GuideComprehensionOrale() {
  return <ComprehensionGuide d={CO_GUIDE} />;
}

export function GuideComprehensionEcrite() {
  return <ComprehensionGuide d={CE_GUIDE} />;
}
