import { useState } from "react";
import { CalendarDays, Mic, MessageCircle, MessagesSquare } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Pill, Segmented } from "@/components/common";
import { ArchiveBrowser } from "@/components/sujets/ArchiveBrowser";
import { EOPartieCard, countEOSujets } from "@/components/sujets/renderers";
import { useSujetsArchive } from "@/hooks/useSujetsArchive";

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const TACHES = [
  { id: 2, label: "Tâche 2 · Interaction", Icon: MessagesSquare },
  { id: 3, label: "Tâche 3 · Point de vue", Icon: MessageCircle },
];

// Ressources page: previous Expression orale subjects. Pick a year, a month
// and a tâche, then go through its parties one at a time.
export function SujetsExpressionOrale() {
  const { t } = useApp();
  const { loading, years } = useSujetsArchive("eo");
  const [tache, setTache] = useState(2);

  // The tâche picked, or the month's first one if it has no such tâche.
  const tacheOf = (m) => m.data.find((tk) => tk.tache === tache) || m.data[0] || null;

  const units = (m) => {
    const tk = tacheOf(m);
    return (tk?.parties || []).map((p) => ({
      key: `${m.key}-${tk.tache}-${p.partie}`,
      n: p.partie,
      node: <EOPartieCard tache={tk} partie={p} />,
    }));
  };

  const controls = (m) => {
    const available = TACHES.filter((x) => m.data.some((tk) => tk.tache === x.id));
    if (available.length < 2) return null;
    return <Segmented items={available} value={tacheOf(m)?.tache} onChange={setTache} label={t("Tâche")} />;
  };

  const summary = (m, y) => (
    <>
      <Pill tone="blue"><CalendarDays size={12} /> {t(m.month)} {y.year}</Pill>
      <Pill tone="slate"><Mic size={12} /> {plural(countEOSujets(m.data), t("sujet"), t("sujets"))}</Pill>
      <Pill tone="amber"><MessageCircle size={12} /> {plural(tacheOf(m)?.parties?.length || 0, t("partie"), t("parties"))}</Pill>
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
      <ArchiveBrowser years={years} loading={loading} units={units} unitName="Partie" resetKey={tache} controls={controls} summary={summary} />
    </PageShell>
  );
}
