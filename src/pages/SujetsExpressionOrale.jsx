import { CalendarDays, Mic, MessageCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { ArchiveBrowser } from "@/components/sujets/ArchiveBrowser";
import { useSujetsArchive } from "@/hooks/useSujetsArchive";

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const countSujets = (data) => data.reduce((a, t) => a + t.parties.reduce((b, p) => b + p.sujets.length, 0), 0);
// Tâche 2 = jeu de rôle interactif, Tâche 3 = opinion argumentée.
const TACHE_LABEL = { 2: "Interaction", 3: "Expression d'un point de vue" };

function TacheBlock({ tache }) {
  const { c, t } = useApp();
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-2xl grad-brand text-white flex items-center justify-center font-display font-extrabold shrink-0">{tache.tache}</span>
        <h2 className={`font-display font-bold text-lg ${c.text}`}>{t("Tâche")} {tache.tache}{TACHE_LABEL[tache.tache] ? ` · ${t(TACHE_LABEL[tache.tache])}` : ""}</h2>
      </div>
      <div className="space-y-4">
        {tache.parties.map((p) => (
          <Card key={p.partie} className="p-5 md:p-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-3">{t("Partie")} {p.partie}</p>
            <ol className="space-y-3">
              {p.sujets.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className={`text-sm leading-relaxed whitespace-pre-line ${c.text}`}>{s}</p>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Ressources page: the Expression orale subjects, by year → month → tâches.
export function SujetsExpressionOrale() {
  const { t } = useApp();
  const { loading, years } = useSujetsArchive("eo");

  const renderMonth = (m, y) => (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        <Pill tone="blue"><CalendarDays size={12} /> {m.month} {y.year}</Pill>
        <Pill tone="slate"><Mic size={12} /> {plural(countSujets(m.data), t("sujet"), t("sujets"))}</Pill>
        <Pill tone="amber"><MessageCircle size={12} /> {t("Tâches 2 et 3")}</Pill>
      </div>
      <div className="space-y-8">
        {m.data.map((tache) => <TacheBlock key={tache.tache} tache={tache} />)}
      </div>
    </>
  );

  return (
    <PageShell
      back
      eyebrow={t("Ressources · Expression orale")}
      title={t("Sujets d'expression orale")}
      sub={t("Les sujets qui ont circulé au TCF Canada, mois par mois. Choisissez une année, puis un mois : les sujets de la Tâche 2 (interaction) et de la Tâche 3 (point de vue), regroupés par partie.")}
    >
      <ArchiveBrowser
        years={years}
        loading={loading}
        renderMonth={renderMonth}
        yearMeta={(y) => `${plural(y.months.length, t("mois"), t("mois"))} · ${plural(y.months.reduce((a, m) => a + countSujets(m.data), 0), t("sujet"), t("sujets"))}`}
        monthMeta={(m) => plural(countSujets(m.data), t("sujet"), t("sujets"))}
      />
    </PageShell>
  );
}
