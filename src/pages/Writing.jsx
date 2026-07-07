import { useState } from "react";
import { Play, Sparkles, GraduationCap, ChevronDown, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, TimerChip } from "@/components/common";
import { BankExplorer } from "@/components/bank/BankExplorer";
import { getBank } from "@/services/bankService";
import { useWritingTask } from "@/hooks/useWritingTask";
import { WRITING_TASKS } from "@/constants/writing";

// Premium module backed by the question bank (section "ee") once quizzes
// exist there; until then the interactive writing workshop below is shown.
export function Writing() {
  if (getBank().ee.length > 0) {
    return (
      <BankExplorer
        sections={["ee"]}
        eyebrow="Expression écrite"
        title="Écrivez comme le jour de l'examen"
        sub="Tous les quiz officiels d'expression écrite, en conditions d'examen."
      />
    );
  }
  return <WritingWorkshop />;
}

function WritingWorkshop() {
  return (
    <PageShell eyebrow="Expression écrite" title="Écrivez, comptez vos mots, comparez" sub="Trois tâches, comme le jour de l'examen. L'analyse instantanée est assistée par IA ; les abonnés annuels reçoivent aussi une correction humaine.">
      <WritingWorkshopBody />
    </PageShell>
  );
}

// Shell-less body so the mock-exam runner can embed the exact same
// experience as the Expression écrite page.
export function WritingWorkshopBody() {
  const { c, notify } = useApp();
  const [taskId, setTaskId] = useState(1);
  const task = WRITING_TASKS.find((t) => t.id === taskId);
  const { text, onTextChange, left, running, setRunning, showSample, setShowSample, ai, analyze, words, lo, hi } = useWritingTask(task, notify);

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-6">
        {WRITING_TASKS.map((t) => (
          <button key={t.id} onClick={() => setTaskId(t.id)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${taskId === t.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>{t.t}</button>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <Pill tone="red">{task.words}</Pill>
              <div className="flex items-center gap-2">
                <TimerChip left={left} total={task.min * 60} />
                {!running && left > 0 && <Btn small variant="ghost" icon={Play} onClick={() => setRunning(true)}>Lancer le chrono</Btn>}
              </div>
            </div>
            <p className={`font-medium leading-relaxed ${c.text}`}>{task.prompt}</p>
          </Card>
          <Card className="p-2">
            <div className={`flex items-center gap-1 px-3 py-2 border-b ${c.border}`} aria-hidden="true">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${c.sub} ${c.hoverSoft}`}>G</span>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm italic ${c.sub} ${c.hoverSoft}`}>I</span>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm underline ${c.sub} ${c.hoverSoft}`}>S</span>
              <span className={`ml-auto pr-2 text-xs font-mono2 font-semibold ${words >= lo && words <= hi ? "text-emerald-500" : words > 0 ? "text-amber-500" : c.faint}`}>{words} mot{words > 1 ? "s" : ""} · cible {lo}–{hi}</span>
            </div>
            <textarea value={text} onChange={(e) => onTextChange(e.target.value)} rows={11} placeholder="Commencez à écrire ici — le chronomètre démarre automatiquement…" aria-label="Zone de rédaction" className={`w-full p-5 bg-transparent outline-none text-[15px] leading-relaxed resize-y ${c.text} placeholder:opacity-40`} />
          </Card>
          <div className="flex gap-3 flex-wrap">
            <Btn icon={Sparkles} variant="accent" onClick={analyze}>Analyser avec l'IA</Btn>
            <Btn variant="ghost" icon={GraduationCap} onClick={() => notify("Texte envoyé pour correction humaine (fonctionnalité Premium Annuel — démo).")}>Envoyer à un enseignant</Btn>
          </div>
          {ai && (
            <Card className="p-6 border-2 border-blue-600/40 rise">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-sm text-blue-600 flex items-center gap-1.5"><Sparkles size={15} /> Analyse IA — aperçu</p>
                <Pill tone="blue">Niveau estimé : {ai.score}</Pill>
              </div>
              <ul className="space-y-2.5">
                {ai.points.map((p) => <li key={p} className={`flex gap-2.5 text-sm ${c.sub}`}><Check size={15} className="text-blue-600 shrink-0 mt-0.5" />{p}</li>)}
              </ul>
            </Card>
          )}
        </div>
        <div className="space-y-5">
          <Card className="p-6">
            <button onClick={() => setShowSample(!showSample)} className="w-full flex items-center justify-between" aria-expanded={showSample}>
              <span className={`font-display font-bold ${c.text}`}>Exemple de réponse</span>
              <ChevronDown size={18} className={`text-blue-600 transition-transform ${showSample ? "rotate-180" : ""}`} />
            </button>
            {showSample ? (
              <p className={`mt-4 text-sm leading-relaxed ${c.sub} rise`}>{task.sample}</p>
            ) : (
              <p className={`mt-3 text-sm ${c.faint}`}>Rédigez d'abord votre texte, puis comparez-le à une réponse de niveau B2/C1.</p>
            )}
          </Card>
          <Card className="p-6">
            <h3 className={`font-display font-bold mb-3 ${c.text}`}>Conseils pour cette tâche</h3>
            <ul className={`space-y-2.5 text-sm ${c.sub}`}>
              <li className="flex gap-2.5"><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />Répondez à chaque élément de la consigne, sans exception.</li>
              <li className="flex gap-2.5"><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />Gardez 3 minutes pour vous relire : accords, négations, accents.</li>
              <li className="flex gap-2.5"><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />Le hors-sujet est plus pénalisé qu'une petite faute de grammaire.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
