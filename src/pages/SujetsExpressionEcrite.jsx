import { PenLine, CalendarDays, FileText, MessagesSquare } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { SUJETS_EE, SUJETS_EE_MONTH } from "@/constants/sujetsEE";

// One task block (Tâche 1 / 2) — an uppercase label with its word-count pill,
// then the verbatim prompt. Exam prompts stay in French, so they are rendered
// raw (not through the i18n dictionary).
function Task({ n, words, children }) {
  const { c, t } = useApp();
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{t("Tâche")} {n}</span>
        {words && <Pill tone="slate">{words}</Pill>}
      </div>
      <p className={`text-sm leading-relaxed ${c.text}`}>{children}</p>
    </div>
  );
}

// Tâche 3 is an argued opinion built on two short documents — shown as the
// theme heading and a two-column pair of document cards.
function TaskThree({ data }) {
  const { c, t } = useApp();
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{t("Tâche")} 3</span>
        <Pill tone="amber"><MessagesSquare size={12} /> {t("Argumenter")}</Pill>
      </div>
      <p className={`font-display font-bold ${c.text} mb-3`}>{data.theme}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {[data.doc1, data.doc2].map((doc, i) => (
          <div key={i} className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5"><FileText size={12} /> {t("Document")} {i + 1}</p>
            <p className={`text-sm leading-relaxed ${c.sub}`}>{doc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Ressources page: the Expression écrite subjects ("combinaisons") circulating
// in the current TCF Canada session, for candidates to practise the real
// wording. Data lives in constants/sujetsEE.js and is refreshed each month.
export function SujetsExpressionEcrite() {
  const { c, t } = useApp();
  return (
    <PageShell
      back
      eyebrow={t("Ressources · Expression écrite")}
      title={`${t("Sujets d'expression écrite")} — ${SUJETS_EE_MONTH}`}
      sub={t("Les combinaisons de sujets qui circulent ce mois-ci pour l'épreuve d'expression écrite du TCF Canada. Entraînez-vous sur les formulations réelles des trois tâches.")}
    >
      <div className="flex flex-wrap gap-2 mb-8">
        <Pill tone="blue"><CalendarDays size={12} /> {SUJETS_EE_MONTH}</Pill>
        <Pill tone="slate"><PenLine size={12} /> {SUJETS_EE.length} {t("combinaisons")}</Pill>
        <Pill tone="green">{t("3 tâches par sujet")}</Pill>
      </div>

      <div className="space-y-5">
        {SUJETS_EE.map((s) => (
          <Card key={s.n} className="p-6 md:p-7">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-10 h-10 rounded-2xl grad-brand text-white flex items-center justify-center font-display font-extrabold shrink-0">{s.n}</span>
              <h2 className={`font-display font-bold text-lg ${c.text}`}>{t("Combinaison")} {s.n}</h2>
            </div>
            <div className="space-y-5">
              <Task n={1} words="60–120 mots">{s.t1}</Task>
              <div className={`border-t ${c.border}`} />
              <Task n={2} words="120–150 mots">{s.t2}</Task>
              <div className={`border-t ${c.border}`} />
              <TaskThree data={s.t3} />
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
