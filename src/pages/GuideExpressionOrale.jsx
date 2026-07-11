import { Mic, Clock, MessageCircle, CheckCircle2, Lightbulb, Info } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { EO_INTRO, EO_TASKS, EO_SCORING, EO_LEVELS, EO_TIPS_INTRO, EO_TIPS, EO_KNOW } from "@/constants/guideEO";

// Section header, matching the exam-guide rhythm.
function Section({ title, sub, children }) {
  const { c, t } = useApp();
  return (
    <section className="mb-10">
      <h3 className={`font-display font-bold text-xl ${c.text}`}>{t(title)}</h3>
      {sub && <p className={`mt-2 text-sm leading-relaxed ${c.sub}`}>{t(sub)}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function GuideExpressionOrale() {
  const { c, t } = useApp();
  return (
    <PageShell back eyebrow={t("Guide · Expression orale")} title={t("Expression orale : la méthode, tâche par tâche")} sub={t("Douze minutes d'entretien avec un examinateur, en trois exercices. Voici le déroulé, la notation et comment vous entraîner.")}>
      <div className="flex flex-wrap gap-2 mb-8">
        <Pill tone="blue"><Clock size={12} /> {t("Durée : 12 min")}</Pill>
        <Pill tone="slate"><Mic size={12} /> {t("3 tâches")}</Pill>
        <Pill tone="green">{t("Note sur 20")}</Pill>
        <Pill tone="amber">{t("Face à un examinateur")}</Pill>
      </div>

      {/* The three tasks */}
      <Section title="Le déroulé de l'épreuve" sub={EO_INTRO}>
        <div className="space-y-6">
          {EO_TASKS.map((task) => (
            <Card key={task.n} className="p-6 md:p-7">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="w-9 h-9 rounded-2xl grad-brand text-white flex items-center justify-center font-display font-bold shrink-0 shadow-lg shadow-blue-600/25">{task.n}</span>
                <h3 className={`font-display font-bold text-lg ${c.text}`}>{t("Tâche")} {task.n} · {t(task.title)}</h3>
                <Pill tone="blue"><Clock size={12} /> {task.time}</Pill>
                <Pill tone={task.prep === "Avec préparation" ? "amber" : "slate"}>{t(task.prep)}</Pill>
              </div>
              <p className={`text-sm leading-relaxed ${c.sub}`}>{t(task.goal)}</p>
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">{t("Exemples de sujets")}</p>
                <div className="space-y-2.5">
                  {task.prompts.map((p) => (
                    <div key={p} className="flex items-start gap-3">
                      <MessageCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <p className={`text-sm italic leading-relaxed ${c.sub}`}>« {t(p)} »</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Scoring + CECRL capability grid */}
      <Section title="Comment vous êtes noté" sub={EO_SCORING}>
        <Card className="p-6 md:p-7">
          {EO_LEVELS.map((l, i) => (
            <div key={l.lvl} className={`flex items-start gap-4 py-3 ${i ? `border-t ${c.border}` : ""}`}>
              <span className="shrink-0"><Pill tone="blue">{l.lvl}</Pill></span>
              <p className={`text-sm leading-relaxed ${c.sub}`}>{t(l.d)}</p>
            </div>
          ))}
        </Card>
      </Section>

      {/* Tips */}
      <Section title="Conseils pour réussir" sub={EO_TIPS_INTRO}>
        <Card className="p-6 md:p-7">
          <div className="flex items-center gap-2 mb-4"><Lightbulb size={18} className="text-amber-500" /><p className={`font-display font-bold ${c.text}`}>{t("Entraînez-vous au quotidien")}</p></div>
          <ul className="space-y-2.5">
            {EO_TIPS.map((x) => (<li key={x} className={`flex gap-2.5 text-sm ${c.sub}`}><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />{t(x)}</li>))}
          </ul>
        </Card>
      </Section>

      {/* Good to know */}
      <Section title="Bon à savoir">
        <Card className="p-6 md:p-7 border-2 border-blue-600/30">
          <ul className="space-y-2.5">
            {EO_KNOW.map((x) => (<li key={x} className={`flex gap-2.5 text-sm ${c.sub}`}><Info size={16} className="text-blue-600 shrink-0 mt-0.5" />{t(x)}</li>))}
          </ul>
        </Card>
      </Section>
    </PageShell>
  );
}
