import { CalendarDays, PenLine } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Pill } from "@/components/common";
import { ArchiveBrowser } from "@/components/sujets/ArchiveBrowser";
import { eeUnits } from "@/components/sujets/renderers";
import { useSujetsArchive } from "@/hooks/useSujetsArchive";

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

// Ressources page: previous Expression écrite subjects. Pick a year and a
// month, then go through its combinaisons one at a time.
export function SujetsExpressionEcrite() {
  const { t } = useApp();
  const { loading, years } = useSujetsArchive("ee");

  const summary = (m, y) => (
    <>
      <Pill tone="blue"><CalendarDays size={12} /> {t(m.month)} {y.year}</Pill>
      <Pill tone="slate"><PenLine size={12} /> {plural(m.data.length, t("combinaison"), t("combinaisons"))}</Pill>
      <Pill tone="green">{t("3 tâches par sujet")}</Pill>
    </>
  );

  return (
    <PageShell
      back
      tone="violet"
      icon={PenLine}
      eyebrow={t("Ressources · Expression écrite")}
      title={t("Anciens sujets d'expression écrite")}
      sub={t("Les combinaisons qui ont circulé au TCF Canada, mois par mois, dans leur formulation réelle. Choisissez un mois, puis passez d'une combinaison à l'autre.")}
    >
      <ArchiveBrowser years={years} loading={loading} units={(m, y) => eeUnits(m, y.year)} unitName="Combinaison" summary={summary} />
    </PageShell>
  );
}
