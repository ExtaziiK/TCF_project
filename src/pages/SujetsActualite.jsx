import { useState } from "react";
import { FileText, Mic, CalendarDays, Sparkles, ArrowRight, PenLine, MessageCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, Segmented } from "@/components/common";
import { SujetsDeck } from "@/components/sujets/SujetsDeck";
import { eeUnits, eoUnits, eoTacheOf, eoTachesIn, countEOSujets } from "@/components/sujets/renderers";
import { useSujetsArchive } from "@/hooks/useSujetsArchive";

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const EPREUVES = [
  { id: "ee", label: "Expression écrite", Icon: FileText },
  { id: "eo", label: "Expression orale", Icon: Mic },
];

// Ressources · Sujets EE/EO: the latest month's subjects for the épreuve
// the student picks (EE or EO) — the trending set to prepare right now. Older
// months live on the "Anciens sujets" pages. Same layout as those: a control
// bar, then the month one combinaison (EE) or partie (EO) at a time, in the
// épreuve's colour.
export function SujetsActualite() {
  const { c, t, nav } = useApp();
  const [section, setSection] = useState("ee");
  const [tache, setTache] = useState(2);
  const { loading, years } = useSujetsArchive(section);
  const eo = section === "eo";
  // The most recent month that has subjects. « Ajouter un mois » in the admin
  // saves a month empty before anything is imported into it; opening on that
  // month would show nothing, so empty months are skipped (as in the nav's
  // « Sujets de … » label, sujetsLatestService).
  const newest = years
    .map((y) => ({ year: y.year, months: y.months.filter((m) => m.data?.length) }))
    .find((y) => y.months.length);
  const year = newest?.year;
  const latest = (newest?.months || []).reduce((best, m) => (!best || m.monthNum > best.monthNum ? m : best), null);
  const taches = latest && eo ? eoTachesIn(latest) : [];

  const summary = latest && (
    <>
      <Pill tone="green"><Sparkles size={12} /> {t("Sujets du mois")}</Pill>
      <Pill tone="blue"><CalendarDays size={12} /> {t(latest.month)} {year}</Pill>
      {eo ? (
        <Pill tone="amber"><MessageCircle size={12} /> {plural(countEOSujets(latest.data), t("sujet"), t("sujets"))}</Pill>
      ) : (
        <Pill tone="slate"><PenLine size={12} /> {plural(latest.data.length, t("combinaison"), t("combinaisons"))}</Pill>
      )}
    </>
  );

  return (
    <PageShell
      back
      tone={eo ? "amber" : "violet"}
      icon={Sparkles}
      eyebrow={t("Ressources · Sujets EE/EO")}
      title={t("Sujets EE/EO du mois")}
      sub={t("Les derniers sujets qui circulent ce mois-ci au TCF Canada. Choisissez l'épreuve pour découvrir les sujets à préparer en priorité.")}
    >
      <Card className="p-3 md:p-4 mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Épreuve toggle */}
          <div>
            <Segmented items={EPREUVES} value={section} onChange={setSection} label={t("Épreuve")} />
          </div>
          {taches.length > 1 && (
            <Segmented items={taches} value={eoTacheOf(latest, tache)?.tache} onChange={setTache} label={t("Tâche")} />
          )}
          <Btn small variant="ghost" className="sm:ml-auto" icon={ArrowRight} onClick={() => nav(eo ? "sujets-eo" : "sujets-ee")}>
            {t("Voir les anciens sujets")}
          </Btn>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <Card className={`h-12 animate-pulse ${c.track}`} />
          <Card className={`h-96 animate-pulse ${c.track}`} />
        </div>
      ) : !latest ? (
        <Card className="p-10 text-center">
          <Sparkles size={32} className="text-blue-600 mx-auto mb-4" />
          <p className={`font-display font-bold ${c.text}`}>{t("Sujets à venir")}</p>
          <p className={`mt-2 text-sm ${c.sub}`}>{t("Les sujets du mois seront publiés très prochainement.")}</p>
        </Card>
      ) : (
        <SujetsDeck
          key={`${section}|${latest.key}|${eo ? tache : ""}`}
          units={eo ? eoUnits(latest, tache) : eeUnits(latest, year)}
          unitName={eo ? "Partie" : "Combinaison"}
          summary={summary}
        />
      )}
    </PageShell>
  );
}
