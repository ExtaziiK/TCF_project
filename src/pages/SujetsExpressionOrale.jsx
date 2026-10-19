import { useState } from "react";
import { CalendarDays, Mic, MessageCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Pill, Segmented } from "@/components/common";
import { ArchiveBrowser } from "@/components/sujets/ArchiveBrowser";
import { countEOSujets, eoTacheOf, eoTachesIn, eoUnits } from "@/components/sujets/renderers";
import { useSujetsArchive } from "@/hooks/useSujetsArchive";

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

// Ressources page: previous Expression orale subjects. Pick a year, a month
// and a tâche, then go through its parties one at a time.
export function SujetsExpressionOrale() {
  const { t } = useApp();
  const { loading, years } = useSujetsArchive("eo");
  const [tache, setTache] = useState(2);

  const controls = (m) => {
    const available = eoTachesIn(m);
    if (available.length < 2) return null;
    return <Segmented items={available} value={eoTacheOf(m, tache)?.tache} onChange={setTache} label={t("Tâche")} />;
  };

  const summary = (m, y) => (
    <>
      <Pill tone="blue"><CalendarDays size={12} /> {t(m.month)} {y.year}</Pill>
      <Pill tone="slate"><Mic size={12} /> {plural(countEOSujets(m.data), t("sujet"), t("sujets"))}</Pill>
      <Pill tone="amber"><MessageCircle size={12} /> {plural(eoTacheOf(m, tache)?.parties?.length || 0, t("partie"), t("parties"))}</Pill>
    </>
  );

  return (
    <PageShell
      back
      tone="amber"
      icon={Mic}
      eyebrow={t("Ressources · Expression orale")}
      title={t("Anciens sujets d'expression orale")}
      sub={t("Les sujets qui ont circulé au TCF Canada, mois par mois. Choisissez un mois et une tâche — Tâche 2 (interaction) ou Tâche 3 (point de vue) — puis passez d'une partie à l'autre.")}
    >
      <ArchiveBrowser years={years} loading={loading} units={(m) => eoUnits(m, tache)} unitName="Partie" resetKey={tache} controls={controls} summary={summary} />
    </PageShell>
  );
}
