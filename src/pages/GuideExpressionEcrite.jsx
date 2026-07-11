import { PenLine, Clock, ListChecks, CheckCircle2, Quote } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { EE_CRITERIA, EE_METHOD } from "@/constants/guideEE";

// Numbered structure step (used by every task's "structure" list).
function Step({ i, label, desc }) {
  const { c, t } = useApp();
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i}</span>
      <div>
        <p className={`text-sm font-semibold ${c.text}`}>{t(label)}</p>
        {desc && <p className={`text-sm mt-0.5 leading-relaxed ${c.sub}`}>{t(desc)}</p>}
      </div>
    </div>
  );
}

export function GuideExpressionEcrite() {
  const { c, t } = useApp();
  return (
    <PageShell back eyebrow={t("Guide · Expression écrite")} title={t("Expression écrite : la méthode, tâche par tâche")} sub={t("Trois tâches à rédiger en une heure. Voici ce qui est évalué et comment structurer chaque production.")}>
      <div className="flex flex-wrap gap-2 mb-8">
        <Pill tone="blue"><Clock size={12} /> {t("Durée : 1 h")}</Pill>
        <Pill tone="slate"><PenLine size={12} /> {t("3 tâches")}</Pill>
        <Pill tone="green">{t("Note sur 20")}</Pill>
      </div>

      {/* Assessment criteria */}
      <Card className="p-6 md:p-7 mb-10">
        <div className="flex items-center gap-2 mb-4">
          <ListChecks size={18} className="text-blue-600" />
          <h3 className={`font-display font-bold ${c.text}`}>{t("Vous êtes évalué sur votre capacité à")}</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {EE_CRITERIA.map((x) => (
            <div key={x} className={`flex gap-2.5 text-sm ${c.sub}`}><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />{t(x)}</div>
          ))}
        </div>
      </Card>

      {/* The three tasks */}
      <div className="space-y-6">
        {EE_METHOD.map((task) => (
          <Card key={task.n} className="p-6 md:p-7">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="w-9 h-9 rounded-2xl grad-brand text-white flex items-center justify-center font-display font-bold shrink-0 shadow-lg shadow-blue-600/25">{task.n}</span>
              <h3 className={`font-display font-bold text-lg ${c.text}`}>{t("Tâche")} {task.n} · {t(task.title)}</h3>
              <Pill tone="blue">{t(task.words)}</Pill>
            </div>
            <p className={`text-sm leading-relaxed ${c.sub}`}>{t(task.brief)}</p>

            {task.note && <p className={`text-sm leading-relaxed mt-3 ${c.sub}`}>{t(task.note)}</p>}
            {task.example && (
              <div className={`mt-4 rounded-2xl border ${c.border} ${c.bg} p-4 text-sm italic leading-relaxed ${c.sub}`}>{t(task.example)}</div>
            )}

            {task.twoParts && (
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {task.twoParts.map((p) => (
                  <div key={p.p} className={`rounded-2xl border ${c.border} p-4`}>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">{t(p.p)}</p>
                    <p className={`text-sm mt-1 leading-relaxed ${c.sub}`}>{t(p.d)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">{t(task.structureTitle)}</p>
              <div className="space-y-2.5">
                {task.steps.map((st, i) => <Step key={st.s} i={i + 1} label={st.s} desc={st.d} />)}
              </div>
            </div>

            {task.examples && (
              <div className="mt-5 space-y-3">
                {task.examples.map((ex) => (
                  <div key={ex.label} className={`rounded-2xl border ${c.border} border-l-4 border-l-blue-600/60 ${c.bg} p-4`}>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-1.5 flex items-center gap-1.5"><Quote size={12} /> {t(ex.label)}</p>
                    <p className={`text-sm italic leading-relaxed ${c.sub}`}>{t(ex.quote)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
