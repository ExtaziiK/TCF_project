import { CalendarDays, Mic, MessageCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Pill } from "@/components/common";
import { ArchiveBrowser } from "@/components/sujets/ArchiveBrowser";
import { EOTacheBlock, countEOSujets } from "@/components/sujets/renderers";
import { useSujetsArchive } from "@/hooks/useSujetsArchive";

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

// Ressources page: previous Expression orale subjects, by year → month → tâches.
export function SujetsExpressionOrale() {
  const { t } = useApp();
  const { loading, years } = useSujetsArchive("eo");

  const renderMonth = (m, y) => (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        <Pill tone="blue"><CalendarDays size={12} /> {m.month} {y.year}</Pill>
        <Pill tone="slate"><Mic size={12} /> {plural(countEOSujets(m.data), t("sujet"), t("sujets"))}</Pill>
        <Pill tone="amber"><MessageCircle size={12} /> {t("Tâches 2 et 3")}</Pill>
      </div>
      <div className="space-y-8">
        {m.data.map((tache) => <EOTacheBlock key={tache.tache} tache={tache} />)}
      </div>
    </>
  );

  return (
    <PageShell
      back
      eyebrow={t("Ressources · Expression orale")}
      title={t("Anciens sujets d'expression orale")}
      sub={t("Les sujets qui ont circulé au TCF Canada, mois par mois. Choisissez une année, puis un mois : les sujets de la Tâche 2 (interaction) et de la Tâche 3 (point de vue), regroupés par partie.")}
    >
      <ArchiveBrowser
        years={years}
        loading={loading}
        renderMonth={renderMonth}
        yearMeta={(y) => `${plural(y.months.length, t("mois"), t("mois"))} · ${plural(y.months.reduce((a, m) => a + countEOSujets(m.data), 0), t("sujet"), t("sujets"))}`}
        monthMeta={(m) => plural(countEOSujets(m.data), t("sujet"), t("sujets"))}
      />
    </PageShell>
  );
}
