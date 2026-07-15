import { Clock, ListChecks, CheckCircle2, HelpCircle, Lightbulb } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { CO_GUIDE, CE_GUIDE } from "@/constants/guideComprehension";

// Config-driven guide shared by the two comprehension épreuves (CO / CE).
function ComprehensionGuide({ d }) {
  const { c, t } = useApp();
  const ex = d.example;
  return (
    <PageShell back eyebrow={t(d.eyebrow)} title={t(d.title)} sub={t(d.sub)}>
      <div className="flex flex-wrap gap-2 mb-8">
        <Pill tone="blue"><Clock size={12} /> {t(d.durationLabel)}</Pill>
        <Pill tone="slate">{t("39 questions")}</Pill>
        <Pill tone="slate">{t("QCM · 4 choix")}</Pill>
        <Pill tone="green">{t("Score sur 699")}</Pill>
      </div>

      {/* Skills tested */}
      <Card className="p-6 md:p-7 mb-10">
        <div className="flex items-center gap-2 mb-4">
          <ListChecks size={18} className="text-blue-600" />
          <h3 className={`font-display font-bold ${c.text}`}>{t(d.skillsTitle)}</h3>
        </div>
        <ul className="space-y-2.5">
          {d.skills.map((x) => (
            <li key={x} className={`flex gap-2.5 text-sm ${c.sub}`}><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />{t(x)}</li>
          ))}
        </ul>
      </Card>

      {/* Question types */}
      <h3 className={`font-display font-bold text-xl ${c.text} mb-5`}>{t("Les types de questions")}</h3>
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {d.types.map((ty, i) => (
          <Card key={ty.t} className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-xl grad-brand text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
              <p className={`font-display font-bold text-sm ${c.text}`}>{t(ty.t)}</p>
            </div>
            <p className={`text-sm leading-relaxed ${c.sub}`}>{t(ty.d)}</p>
          </Card>
        ))}
      </div>

      {/* Worked example */}
      <h3 className={`font-display font-bold text-xl ${c.text} mb-5 flex items-center gap-2`}><HelpCircle size={20} className="text-blue-600" /> {t("Un exemple")}</h3>
      <Card className="p-6 md:p-7 mb-10">
        <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 text-sm italic leading-relaxed ${c.sub}`}>{t(ex.context)}</div>
        <p className={`font-semibold mt-4 ${c.text}`}>{t(ex.question)}</p>
        <div className="mt-3 space-y-2">
          {ex.options.map((o) => {
            const correct = o.k === ex.answer;
            return (
              <div key={o.k} className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-sm ${correct ? "border-emerald-500 bg-emerald-500/10" : c.border}`}>
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
      <h3 className={`font-display font-bold text-xl ${c.text} mb-2`}>{t("Conseils pour réussir")}</h3>
      <p className={`text-sm mb-5 ${c.sub}`}>{t(d.tipsIntro)}</p>
      <Card className="p-6 md:p-7">
        <div className="flex items-center gap-2 mb-4"><Lightbulb size={18} className="text-amber-500" /><p className={`font-display font-bold ${c.text}`}>{t("Bons réflexes")}</p></div>
        <ul className="space-y-2.5">
          {d.tips.map((x) => (<li key={x} className={`flex gap-2.5 text-sm ${c.sub}`}><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />{t(x)}</li>))}
        </ul>
      </Card>
    </PageShell>
  );
}

export function GuideComprehensionOrale() {
  return <ComprehensionGuide d={CO_GUIDE} />;
}

export function GuideComprehensionEcrite() {
  return <ComprehensionGuide d={CE_GUIDE} />;
}
