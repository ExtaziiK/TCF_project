import { useState } from "react";
import { FileText, Mic, CalendarDays, Sparkles, ArrowRight, MessageCircle, PenLine } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { EECombinaison, EOTacheBlock, countEOSujets } from "@/components/sujets/renderers";
import { useSujetsArchive } from "@/hooks/useSujetsArchive";

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

// Ressources · Sujets d'actualité: the latest month's subjects for the épreuve
// the student picks (EE or EO) — the trending set to prepare right now. Older
// months live on the "Anciens sujets" pages.
export function SujetsActualite() {
  const { c, t, nav } = useApp();
  const [section, setSection] = useState("ee");
  const { loading, years } = useSujetsArchive(section);
  const latest = years[0]?.months[0] || null; // newest year, latest month
  const year = years[0]?.year;

  return (
    <PageShell
      back
      eyebrow={t("Ressources · Sujets d'actualité")}
      title={t("Sujets d'actualité")}
      sub={t("Les derniers sujets qui circulent ce mois-ci au TCF Canada. Choisissez l'épreuve pour découvrir les sujets à préparer en priorité.")}
    >
      {/* Épreuve toggle */}
      <div className="flex items-center gap-2 flex-wrap mb-8">
        {[["ee", "Expression écrite", FileText], ["eo", "Expression orale", Mic]].map(([s, label, Icon]) => (
          <button key={s} onClick={() => setSection(s)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${section === s ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            <Icon size={16} /> {t(label)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-5">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-6 h-40 animate-pulse" />)}</div>
      ) : !latest ? (
        <Card className="p-10 text-center">
          <Sparkles size={32} className="text-blue-600 mx-auto mb-4" />
          <p className={`font-display font-bold ${c.text}`}>{t("Sujets à venir")}</p>
          <p className={`mt-2 text-sm ${c.sub}`}>{t("Les sujets du mois seront publiés très prochainement.")}</p>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <div className="flex flex-wrap gap-2">
              <Pill tone="green"><Sparkles size={12} /> {t("Sujets du mois")}</Pill>
              <Pill tone="blue"><CalendarDays size={12} /> {latest.month} {year}</Pill>
              {section === "ee"
                ? <Pill tone="slate"><PenLine size={12} /> {plural(latest.data.length, t("combinaison"), t("combinaisons"))}</Pill>
                : <Pill tone="slate"><MessageCircle size={12} /> {plural(countEOSujets(latest.data), t("sujet"), t("sujets"))}</Pill>}
            </div>
            <Btn small variant="ghost" icon={ArrowRight} onClick={() => nav(section === "ee" ? "sujets-ee" : "sujets-eo")}>
              {t("Voir les anciens sujets")}
            </Btn>
          </div>

          {section === "ee" ? (
            <div className="space-y-5">{latest.data.map((s, i) => <EECombinaison key={i} s={s} i={i} />)}</div>
          ) : (
            <div className="space-y-8">{latest.data.map((tache) => <EOTacheBlock key={tache.tache} tache={tache} />)}</div>
          )}
        </>
      )}
    </PageShell>
  );
}
