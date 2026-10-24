import { useEffect, useState } from "react";
import { Play, Sparkles, ChevronDown, Check, Loader2, RotateCcw, Headphones } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, TimerChip } from "@/components/common";
import { WritingEditor } from "@/components/expression/WritingEditor";
import { WritingExamSequence } from "@/components/expression/WritingExamSequence";
import { BankExplorer } from "@/components/bank/BankExplorer";
import { useBankSummary } from "@/hooks/useBank";
import { useWritingTask } from "@/hooks/useWritingTask";
import { useExpressionSession } from "@/hooks/useExpressionSession";
import { WorkshopSkeleton, EmptyTask } from "@/components/expression/WorkshopStates";
import { AiFeedback } from "@/components/expression/AiFeedback";
import { FreeExpressionNotice } from "@/components/expression/FreeExpressionNotice";
import { RefreshNotice } from "@/components/expression/RefreshNotice";
import { OFFICIAL_TASKS } from "@/services/expressionSessionService";
import { useExpressionTask } from "@/context/ExpressionTaskContext";
import { ModelAnswer } from "@/components/expression/ModelAnswer";
import { loadAnswers } from "@/services/sujetsAnswersService";
import { handOff } from "@/utils/handoff";

// Premium module backed by the question bank (section "ee") once quizzes
// exist there; until then the interactive writing workshop below is shown.
export function Writing() {
  const bank = useBankSummary();
  if (bank.ee.some((q) => q.kind !== "prompt")) {
    return (
      <BankExplorer
        back
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
  const { t } = useApp();
  return (
    <PageShell back eyebrow={t("Expression écrite")} title={t("Écrivez, comptez vos mots, comparez")} sub={t("Trois tâches, comme le jour de l'examen. L'analyse instantanée est assistée par IA ; les abonnés annuels reçoivent aussi une correction humaine.")}>
      <WritingWorkshopBody />
    </PageShell>
  );
}

// Shell-less body so the mock-exam runner can embed the exact same
// experience as the Expression écrite page. The session serves exactly one
// prompt per official tâche, drawn from the Question Bank (admin content)
// via a rotation-aware random pick — see expressionSessionService.
// `examKey` (TCF blanc): the attempt, so a later attempt on the same subjects
// starts fresh instead of reopening this one.
export function WritingWorkshopBody({ inExam = false, examKey = "" } = {}) {
  const { c, t } = useApp();
  const { loading, tasks, isFreeTier, focus } = useExpressionSession("ee");
  // Shared with the guide side panel when both are on screen (Exams hub); local
  // state otherwise (standalone page / mock runner).
  const [active, setActive] = useExpressionTask(OFFICIAL_TASKS[0]);
  // Sent here by a Modèle de réponse page: open the tâche it was showing.
  useEffect(() => { if (focus) setActive(focus); }, [focus, setActive]);

  if (loading) return <WorkshopSkeleton />;
  // TCF blanc: the three tâches on one 60-minute clock, graded at the end.
  if (inExam) return <WritingExamSequence tasks={tasks} examKey={examKey} />;
  const task = tasks.find((t) => t.task === active) || tasks[0];

  return (
    <div>
      {isFreeTier && <FreeExpressionNotice section="ee" />}
      <div className="flex gap-2 flex-wrap mb-6">
        {tasks.map((tk) => (
          <button key={tk.task} onClick={() => setActive(tk.task)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${active === tk.task ? "bg-[var(--tool-fill,#2563EB)] text-white shadow-md shadow-black/10" : `border ${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`}>
            {t(tk.empty ? `Tâche ${tk.task}` : tk.t)}
          </button>
        ))}
      </div>
      {task?.empty ? <EmptyTask task={task.task} /> : <WritingTaskPane key={task.id} task={task} />}
    </div>
  );
}

// The subject's model answer — the same text as its Modèle de réponse page and
// its dictée — for an archive subject. Premium only: the table's RLS returns
// nothing to anyone else, and the built-in seed subjects carry their own
// `sample` instead.
function useModelAnswer(task) {
  const [answer, setAnswer] = useState(null);
  const ref = task.ref;
  useEffect(() => {
    if (!ref) return undefined;
    let live = true;
    loadAnswers("ee", ref.year, ref.monthNum, ref.n).then((r) => { if (live) setAnswer(r.answers?.[task.task] || null); });
    return () => { live = false; };
  }, [ref, task.task]);
  return answer;
}

function WritingTaskPane({ task }) {
  const { c, notify, t, nav } = useApp();
  const model = useModelAnswer(task);
  const { text, onTextChange, notes, setNotes, left, running, setRunning, locked, overtime, continueOvertime, restart, showSample, setShowSample, ai, analyze, analyzing, failed, words, lo, hi } = useWritingTask(task, notify);

  const clock = (
    <>
      {overtime ? <Pill tone="amber">{t("Hors temps")}</Pill> : <TimerChip left={left} total={task.min * 60} />}
      {!running && left > 0 && !locked && <Btn small variant="ghost" icon={Play} onClick={() => setRunning(true)}>{t(left === task.min * 60 ? "Lancer le chrono" : "Reprendre le chrono")}</Btn>}
    </>
  );

  return (
    <div className="grid lg:grid-cols-3 gap-5 items-start rise">
      <div className="lg:col-span-2 space-y-5">
        <WritingEditor task={task} text={text} onTextChange={onTextChange} locked={locked} words={words} lo={lo} hi={hi} notes={notes} setNotes={setNotes} headerRight={clock} />
        {locked && (
          <Card className="p-5 border-2 border-amber-500/40 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className={`text-sm flex-1 ${c.sub}`}>{t("Le temps de cette tâche est écoulé. Le jour de l'examen, votre texte serait envoyé tel quel. Faites-le analyser, ou terminez-le hors temps pour vous entraîner.")}</p>
            <Btn small variant="ghost" onClick={continueOvertime}>{t("Continuer hors temps")}</Btn>
          </Card>
        )}
        <div className="flex gap-3 flex-wrap items-center">
          <Btn icon={Sparkles} variant="accent" onClick={analyze} disabled={analyzing}>{t(analyzing ? "Analyse en cours…" : "Analyser avec l'IA")}</Btn>
          {/* What is left on this tâche, as the server counted it: 2 for a free
              account (hard limit), 3 per 10-minute window for a paid one. */}
          {typeof ai?.aiLeft === "number" && (
            <span className={`text-xs ${c.sub}`}>
              {ai.aiLeft > 0
                ? t(`Il vous reste ${ai.aiLeft} analyse${ai.aiLeft > 1 ? "s" : ""} IA pour cette tâche.`)
                : t("Vous avez utilisé vos analyses IA pour cette tâche.")}
            </span>
          )}
          {(text || notes || left < task.min * 60) && (
            <button type="button" onClick={restart} className={`ml-auto text-xs font-semibold flex items-center gap-1.5 ${c.faint} hover:text-rose-600`}>
              <RotateCcw size={13} /> {t("Recommencer cette tâche")}
            </button>
          )}
        </div>
        {analyzing && !ai && (
          <Card className="p-6 border-2 border-blue-600/40 flex items-center gap-3">
            <Loader2 size={18} className="text-blue-600 animate-spin shrink-0" />
            <p className={`text-sm ${c.sub}`}>{t("L'examinateur IA lit votre texte…")}</p>
          </Card>
        )}
        {failed && !analyzing && <RefreshNotice copyText={text} kind={failed} section="ee" task={task.task} />}
        {ai && <AiFeedback level={ai.level} score={ai.score} nclc={ai.nclc} summary={ai.summary} strengths={ai.strengths} improvements={ai.improvements} corrected={ai.corrected} rewrites={ai.rewrites} />}
      </div>
      <div className="space-y-5">
        <Card className="p-6">
          <button onClick={() => setShowSample(!showSample)} className="w-full flex items-center justify-between" aria-expanded={showSample}>
            <span className={`font-display font-bold ${c.text}`}>{t("Exemple de réponse")}</span>
            <ChevronDown size={18} className={`text-blue-600 transition-transform ${showSample ? "rotate-180" : ""}`} />
          </button>
          {showSample ? (
            model ? (
              <div className="mt-4 rise">
                <ModelAnswer tache={task.task} answer={model} />
                <Btn small variant="ghost" className="mt-4" icon={Headphones} onClick={() => { handOff("dictee", { task: task.task, sujetKey: `${task.ref.year}-${task.ref.monthNum}-${task.ref.n}` }); nav("dictee"); }}>
                  {t("Faire la dictée de ce corrigé")}
                </Btn>
              </div>
            ) : task.sample
              ? <p className={`mt-4 text-sm leading-relaxed ${c.sub} rise`}>{task.sample}</p>
              : <p className={`mt-3 text-sm ${c.faint}`}>{t("Pas encore d'exemple pour ce sujet.")}</p>
          ) : (
            <p className={`mt-3 text-sm ${c.faint}`}>{t("Rédigez d'abord votre texte, puis comparez-le au modèle C1-C2 de ce sujet : même structure, même fourchette de mots que le jour de l'examen.")}</p>
          )}
        </Card>
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-3 ${c.text}`}>{t("Conseils pour cette tâche")}</h3>
          <ul className={`space-y-2.5 text-sm ${c.sub}`}>
            {(TASK_TIPS[task.task] || []).map((tip) => (
              <li key={tip} className="flex gap-2.5"><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />{t(tip)}</li>
            ))}
            <li className="flex gap-2.5"><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />{t("Gardez 3 minutes pour vous relire : accents, accords, a/à, et/est, -é/-er.")}</li>
            <li className="flex gap-2.5"><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />{t("Votre texte et votre plan sont gardés si vous changez de tâche ou rechargez la page.")}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

// What the grader checks on each tâche (api/expression-ecrite.js EE_TASK_BRIEFS),
// said to the candidate before they write.
const TASK_TIPS = {
  1: [
    "Traitez chaque point demandé dans la consigne, sans exception.",
    "Choisissez le bon registre (tu pour un ami, vous sinon) et gardez-le jusqu'au bout.",
  ],
  2: [
    "Racontez l'expérience au passé (passé composé, imparfait), puis donnez votre avis : les deux sont attendus.",
    "Organisez en paragraphes ; un titre convient pour un article ou un blog.",
  ],
  3: [
    "Deux parties obligatoires : d'abord la synthèse neutre des deux documents, puis votre opinion argumentée.",
    "Reformulez les documents avec vos mots : ce qui est recopié ne rapporte aucun point.",
  ],
};
