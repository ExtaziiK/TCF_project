import { CalendarDays, PenLine } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Pill } from "@/components/common";
import { ArchiveBrowser } from "@/components/sujets/ArchiveBrowser";
import { EECombinaison } from "@/components/sujets/renderers";
import { useSujetsArchive } from "@/hooks/useSujetsArchive";

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

// Ressources page: previous Expression écrite subjects, by year → month → combinaisons.
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
        {m.data.map((s, i) => <EECombinaison key={i} s={s} i={i} />)}
      </div>
    </>
  );

  return (
    <PageShell
      back
      eyebrow={t("Ressources · Expression écrite")}
      title={t("Anciens sujets d'expression écrite")}
      sub={t("Les sujets qui ont circulé au TCF Canada, mois par mois. Choisissez une année, puis un mois, pour revoir les combinaisons de tâches dans leur formulation réelle.")}
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
