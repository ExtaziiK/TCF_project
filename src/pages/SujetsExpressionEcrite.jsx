import { FileText, MessagesSquare, CalendarDays, PenLine } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { ArchiveBrowser } from "@/components/sujets/ArchiveBrowser";
import { useSujetsArchive } from "@/hooks/useSujetsArchive";

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

// One task block (Tâche 1 / 2) — an uppercase label with its word-count pill,
// then the verbatim prompt. Exam prompts stay in French (rendered raw).
function Task({ n, words, children }) {
  const { c, t } = useApp();
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{t("Tâche")} {n}</span>
        {words && <Pill tone="slate">{words}</Pill>}
      </div>
      <p className={`text-sm leading-relaxed whitespace-pre-line ${c.text}`}>{children}</p>
    </div>
  );
}

// Tâche 3 — an argued opinion built on two short documents.
function TaskThree({ data }) {
  const { c, t } = useApp();
  const docs = [data?.doc1, data?.doc2].filter(Boolean);
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{t("Tâche")} 3</span>
        <Pill tone="amber"><MessagesSquare size={12} /> {t("Argumenter")}</Pill>
      </div>
      {data?.theme && <p className={`font-display font-bold ${c.text} mb-3`}>{data.theme}</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        {docs.map((doc, i) => (
          <div key={i} className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5"><FileText size={12} /> {t("Document")} {i + 1}</p>
            <p className={`text-sm leading-relaxed whitespace-pre-line ${c.sub}`}>{doc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Combinaison({ s, i }) {
  const { c, t } = useApp();
  return (
    <Card className="p-6 md:p-7">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-2xl grad-brand text-white flex items-center justify-center font-display font-extrabold shrink-0">{s.n ?? i + 1}</span>
        <h2 className={`font-display font-bold text-lg ${c.text}`}>{t("Combinaison")} {s.n ?? i + 1}</h2>
      </div>
      <div className="space-y-5">
        {s.t1 && <Task n={1} words="60–120 mots">{s.t1}</Task>}
        {s.t2 && <><div className={`border-t ${c.border}`} /><Task n={2} words="120–150 mots">{s.t2}</Task></>}
        {s.t3 && <><div className={`border-t ${c.border}`} /><TaskThree data={s.t3} /></>}
      </div>
    </Card>
  );
}

// Ressources page: the Expression écrite subjects, by year → month → combinaisons.
export function SujetsExpressionEcrite() {
  const { t } = useApp();
  const { loading, years } = useSujetsArchive("ee");

  const renderMonth = (m, y) => (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        <Pill tone="blue"><CalendarDays size={12} /> {m.month} {y.year}</Pill>
        <Pill tone="slate"><PenLine size={12} /> {plural(m.data.length, t("combinaison"), t("combinaisons"))}</Pill>
        <Pill tone="green">{t("3 tâches par sujet")}</Pill>
      </div>
      <div className="space-y-5">
        {m.data.map((s, i) => <Combinaison key={i} s={s} i={i} />)}
      </div>
    </>
  );

  return (
    <PageShell
      back
      eyebrow={t("Ressources · Expression écrite")}
      title={t("Sujets d'expression écrite")}
      sub={t("Les sujets qui ont circulé au TCF Canada, mois par mois. Choisissez une année, puis un mois, pour voir les combinaisons de tâches dans leur formulation réelle.")}
    >
      <ArchiveBrowser
        years={years}
        loading={loading}
        renderMonth={renderMonth}
        yearMeta={(y) => `${plural(y.months.length, t("mois"), t("mois"))} · ${plural(y.months.reduce((a, m) => a + m.data.length, 0), t("combinaison"), t("combinaisons"))}`}
        monthMeta={(m) => plural(m.data.length, t("combinaison"), t("combinaisons"))}
      />
    </PageShell>
  );
}
