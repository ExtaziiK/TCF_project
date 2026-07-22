import { useState } from "react";
import { PenLine, Clock, ListChecks, CheckCircle2, Quote, Sparkles, ArrowRight, FileText } from "lucide-react";
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

// Amical / formel register card (two-column phrase lists).
function RegisterCard({ tone, title, items }) {
  const { c, t } = useApp();
  const box = tone === "amical" ? "border-amber-400/40 bg-amber-500/5" : "border-blue-400/40 bg-blue-500/5";
  const head = tone === "amical" ? "text-amber-600" : "text-blue-600";
  return (
    <div className={`rounded-2xl border ${box} p-4`}>
      <p className={`text-xs font-bold uppercase tracking-wide mb-2.5 ${head}`}>{tone === "amical" ? "😊" : "👔"} {t(title)}</p>
      <ul className={`space-y-1.5 text-sm ${c.sub}`}>{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </div>
  );
}

// Renders a template line, styling {placeholders} as dashed fill-in pills.
function fills(line) {
  return line.split(/(\{[^}]+\})/g).map((part, i) =>
    part.startsWith("{") && part.endsWith("}")
      ? <span key={i} className="inline-block rounded-md border border-dashed border-blue-600/50 bg-blue-600/5 text-blue-600 font-medium px-2 py-0.5 text-[13px]">{part.slice(1, -1)}</span>
      : part
  );
}

// Ready-to-use phrase bank + fill-in template for a task (Tâche 1 for now).
function PhraseBank({ data }) {
  const { c, t } = useApp();
  return (
    <div className={`mt-8 pt-6 border-t ${c.border}`}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={18} className="text-blue-600" />
        <h4 className={`font-display font-bold ${c.text}`}>{t(data.title)}</h4>
      </div>
      <p className={`text-sm mb-6 ${c.sub}`}>{t(data.intro)}</p>

      <div className="space-y-6">
        {data.sections.map((sec, i) => (
          <div key={i}>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">{t(sec.label)}</p>
            {sec.note && <p className={`text-sm mb-3 ${c.sub}`}>{t(sec.note)}</p>}
            {!sec.note && <div className="mb-3" />}
            {sec.kind === "registers" && (
              <div className="grid sm:grid-cols-2 gap-3">
                <RegisterCard tone="amical" title="Registre amical" items={sec.amical} />
                <RegisterCard tone="formel" title="Registre formel" items={sec.formel} />
              </div>
            )}
            {sec.kind === "phrases" && (
              <div className="grid sm:grid-cols-2 gap-2">
                {sec.items.map((p) => (
                  <div key={p} className={`flex items-start gap-2 text-sm rounded-xl border ${c.border} ${c.bg} px-3.5 py-2.5 ${c.sub}`}>
                    <ArrowRight size={14} className="text-blue-600 shrink-0 mt-0.5" />{p}
                  </div>
                ))}
              </div>
            )}
            {sec.kind === "chips" && (
              <div className="flex flex-wrap gap-2">
                {sec.items.map((ch) => (
                  <span key={ch} className="text-sm font-medium rounded-full bg-blue-600/10 text-blue-600 px-3.5 py-1.5">{ch}</span>
                ))}
              </div>
            )}
            {sec.kind === "model" && (
              <div className={`rounded-2xl border ${c.border} border-l-4 border-l-blue-600/60 ${c.card} p-4 text-sm leading-relaxed space-y-2 ${c.text}`}>
                {sec.lines.map((line, j) => <p key={j}>{fills(line)}</p>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {data.template && (
        <div className={`mt-6 rounded-2xl border ${c.border} border-l-4 border-l-blue-600/60 ${c.card} p-5`}>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-1.5 mb-3"><FileText size={13} /> {t(data.template.label)}</p>
          <div className={`text-sm leading-relaxed space-y-2 ${c.text}`}>
            {data.template.lines.map((line, i) => <p key={i}>{fills(line)}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}

export function GuideExpressionEcrite() {
  const { c, t } = useApp();
  const [active, setActive] = useState(0);
  const task = EE_METHOD[active];
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

      {/* The three tasks, as tabs */}
      <div role="tablist" aria-label={t("Les trois tâches")} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {EE_METHOD.map((tk, i) => {
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
              {/* playful sliding sheen on the active tab */}
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

      {/* Active task content — re-keyed so it animates in on tab switch */}
      <Card key={active} role="tabpanel" className="p-6 md:p-7 rise">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
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

        {task.phraseBank && <PhraseBank data={task.phraseBank} />}
      </Card>
    </PageShell>
  );
}
