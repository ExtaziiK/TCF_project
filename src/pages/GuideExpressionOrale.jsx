import { useState } from "react";
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
  const [active, setActive] = useState(0);
  const task = EO_TASKS[active];
  return (
    <PageShell back eyebrow={t("Guide · Expression orale")} title={t("Expression orale : la méthode, tâche par tâche")} sub={t("Douze minutes d'entretien avec un examinateur, en trois exercices. Voici le déroulé, la notation et comment vous entraîner.")}>
      <div className="flex flex-wrap gap-2 mb-8">
        <Pill tone="blue"><Clock size={12} /> {t("Durée : 12 min")}</Pill>
        <Pill tone="slate"><Mic size={12} /> {t("3 tâches")}</Pill>
        <Pill tone="green">{t("Note sur 20")}</Pill>
        <Pill tone="amber">{t("Face à un examinateur")}</Pill>
      </div>

      {/* The three tasks, as tabs */}
      <Section title="Le déroulé de l'épreuve" sub={EO_INTRO}>
        <div role="tablist" aria-label={t("Les trois tâches")} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {EO_TASKS.map((tk, i) => {
            const on = i === active;
            return (
              <button
                key={tk.n}
                role="tab"
                aria-selected={on}
                onClick={() => setActive(i)}
                className={`group relative overflow-hidden text-left rounded-2xl border p-4 flex items-center gap-3 transition-all duration-300
                  ${on
                    ? "border-blue-600/50 shadow-xl shadow-blue-600/15 -translate-y-0.5"
                    : `${c.border} ${c.card} hover:-translate-y-0.5 hover:border-blue-600/40 hover:shadow-lg`}`}
                style={on ? { background: "linear-gradient(135deg, rgba(46,107,230,0.12), rgba(216,53,74,0.07))" } : undefined}
              >
                {on && <span aria-hidden="true" className="plan-sheen is-auto" />}
                <span className={`relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center font-display font-extrabold text-lg shrink-0 transition-all duration-300
                  ${on ? "grad-brand text-white shadow-lg shadow-blue-600/30 scale-105" : "bg-blue-600/10 text-blue-600 group-hover:scale-105"}`}>{tk.n}</span>
                <span className="relative z-10 min-w-0">
                  <span className={`block text-[11px] font-bold uppercase tracking-widest ${on ? "text-blue-600" : c.faint}`}>{t("Tâche")} {tk.n}</span>
                  <span className={`block text-sm font-semibold leading-tight ${c.text}`}>{t(tk.title)}</span>
                </span>
              </button>
            );
          })}
        </div>

        <Card key={active} role="tabpanel" className="p-6 md:p-7 rise">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
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
