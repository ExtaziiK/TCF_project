import { CheckCircle2, Calendar, BarChart3, Play, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, SectionHead } from "@/components/common";
import { MOCKS, MOCK_SECTIONS } from "@/constants/mocks";

export function Mocks() {
  const { c, nav, notify } = useApp();
  return (
    <PageShell wide eyebrow="Examens blancs" title="Répétez le jour J, dans les conditions du jour J" sub="Minutage officiel, quatre épreuves enchaînées, score sur 699 et rapport détaillé section par section.">
      <div className="grid lg:grid-cols-3 gap-5 mb-10">
        {MOCKS.map((m) => (
          <Card key={m.id} lift className={`p-6 flex flex-col ${m.id === 2 ? "border-2 border-blue-600/50" : ""}`}>
            <div className="flex items-center justify-between mb-4">
              <Pill tone={m.diff === "Renforcé" ? "red" : "blue"}>{m.diff}</Pill>
              {m.done ? <Pill tone="green"><CheckCircle2 size={12} /> Terminé</Pill> : m.id === 2 ? <Pill tone="amber"><Calendar size={12} /> Planifié samedi</Pill> : null}
            </div>
            <h3 className={`font-display font-bold text-lg ${c.text}`}>{m.name}</h3>
            <p className={`text-sm mt-1 font-mono2 ${c.faint}`}>2 h 47 · 4 épreuves · 78 questions + 6 tâches</p>
            {m.done ? (
              <div className="mt-5">
                <p className="font-display font-extrabold text-3xl grad-text">{m.score} / 699</p>
                <p className={`text-xs mt-1 ${c.sub}`}>Équivalent NCLC 7 · niveau B2</p>
                <Btn small variant="ghost" className="mt-4" icon={BarChart3} onClick={() => nav("progress")}>Voir le rapport</Btn>
              </div>
            ) : (
              <Btn small className="mt-5" icon={Play} onClick={() => { notify("Examen blanc lancé : l'épreuve de compréhension orale commence."); nav("listening"); }}>Commencer l'examen</Btn>
            )}
          </Card>
        ))}
      </div>
      <SectionHead title="Le déroulé, épreuve par épreuve" sub="L'ordre et les durées reproduisent la session officielle. Vous pouvez aussi vous entraîner sur une seule épreuve." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_SECTIONS.map((s, i) => (
          <button key={s.t} onClick={() => nav(s.route)} className="text-left">
            <Card lift className="p-5 h-full">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-mono2 font-bold ${c.faint}`}>ÉPREUVE {i + 1}</span>
              </div>
              <s.icon size={22} className="text-blue-600" />
              <p className={`font-semibold mt-3 ${c.text}`}>{s.t}</p>
              <p className={`text-sm font-mono2 mt-1 ${c.faint}`}>{s.d}</p>
            </Card>
          </button>
        ))}
      </div>
      <Card className="mt-10 p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
        <span className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><BarChart3 size={20} /></span>
        <div className="flex-1">
          <p className={`font-semibold ${c.text}`}>Analyse de performance après chaque examen</p>
          <p className={`text-sm mt-1 ${c.sub}`}>Score par épreuve, temps passé par question, types d'erreurs récurrents et révision guidée de chaque mauvaise réponse.</p>
        </div>
        <Btn small variant="ghost" onClick={() => nav("progress")} icon={ArrowRight}>Ma progression</Btn>
      </Card>
    </PageShell>
  );
}
