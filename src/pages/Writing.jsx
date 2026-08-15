import { useRef } from "react";
import { Play, Sparkles, ChevronDown, Check, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, TimerChip, AccentKeys, insertAtCaret, NO_ASSIST_PROPS } from "@/components/common";
import { BankExplorer } from "@/components/bank/BankExplorer";
import { getBank } from "@/services/bankService";
import { useWritingTask } from "@/hooks/useWritingTask";
import { useExpressionSession } from "@/hooks/useExpressionSession";
import { WorkshopSkeleton, EmptyTask } from "@/components/expression/WorkshopStates";
import { AiFeedback } from "@/components/expression/AiFeedback";
import { FreeExpressionNotice } from "@/components/expression/FreeExpressionNotice";
import { OFFICIAL_TASKS } from "@/services/expressionSessionService";
import { useExpressionTask } from "@/context/ExpressionTaskContext";

// Premium module backed by the question bank (section "ee") once quizzes
// exist there; until then the interactive writing workshop below is shown.
export function Writing() {
  if (getBank().ee.some((q) => q.kind !== "prompt")) {
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
export function WritingWorkshopBody({ inExam = false } = {}) {
  const { c, t } = useApp();
  const { loading, tasks, isFreeTier } = useExpressionSession("ee");
  // Shared with the guide side panel when both are on screen (Exams hub); local
  // state otherwise (standalone page / mock runner).
  const [active, setActive] = useExpressionTask(OFFICIAL_TASKS[0]);

  if (loading) return <WorkshopSkeleton />;
  const task = tasks.find((t) => t.task === active) || tasks[0];

  return (
    <div>
      {isFreeTier && !inExam && <FreeExpressionNotice section="ee" />}
      <div className="flex gap-2 flex-wrap mb-6">
        {tasks.map((tk) => (
          <button key={tk.task} onClick={() => setActive(tk.task)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${active === tk.task ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            {t(tk.empty ? `Tâche ${tk.task}` : tk.t)}
          </button>
        ))}
      </div>
      {task?.empty ? <EmptyTask task={task.task} /> : <WritingTaskPane key={task.id} task={task} />}
    </div>
  );
}

function WritingTaskPane({ task }) {
  const { c, notify, t } = useApp();
  const { text, onTextChange, left, running, setRunning, showSample, setShowSample, ai, analyze, analyzing, words, lo, hi } = useWritingTask(task, notify);

  const taRef = useRef(null);

  return (
    <div className="grid lg:grid-cols-3 gap-5 rise">
      <div className="lg:col-span-2 space-y-5">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <Pill tone="red">{t(task.words)}</Pill>
            <div className="flex items-center gap-2">
              <TimerChip left={left} total={task.min * 60} />
              {!running && left > 0 && <Btn small variant="ghost" icon={Play} onClick={() => setRunning(true)}>{t("Lancer le chrono")}</Btn>}
            </div>
          </div>
          <p className={`font-medium leading-relaxed whitespace-pre-line ${c.text}`}>{task.prompt}</p>
        </Card>
        <Card className="p-2">
          {/* The on-screen French accents (shared with the dictée) plus the
              live word count pushed to the right. The Accents toggle stays
              visible so anyone with a FR keyboard can hide the keys — their
              choice is remembered. Insertion preserves undo/redo. */}
          <AccentKeys
            onInsert={(ch) => insertAtCaret(taRef, ch, text, onTextChange)}
            right={<span className={`ml-auto pr-2 text-xs font-mono2 font-semibold ${words >= lo && words <= hi ? "text-emerald-500" : words > 0 ? "text-amber-500" : c.faint}`}>{words} {t(words > 1 ? "mots" : "mot")} · {t("cible")} {lo}–{hi}</span>}
          />
          {/* Real-exam conditions: the browser must not help the candidate
              write. spellCheck off removes the red squiggles; autoCorrect /
              autoCapitalize / autoComplete off kill iOS/Android autocorrect,
              QuickType predictions and any "previously entered" suggestions;
              the data-gramm* attributes opt the field out of Grammarly-style
              extensions. No placeholder, so the zone is completely blank until
              the candidate types. Copy/paste/undo/redo/shortcuts are untouched
              (no handlers block them), so normal editing still works. */}
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={11}
            aria-label={t("Zone de rédaction")}
            {...NO_ASSIST_PROPS}
            className={`w-full p-5 bg-transparent outline-none text-[15px] leading-relaxed resize-y ${c.text}`}
          />
        </Card>
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
        </div>
        {analyzing && !ai && (
          <Card className="p-6 border-2 border-blue-600/40 flex items-center gap-3">
            <Loader2 size={18} className="text-blue-600 animate-spin shrink-0" />
            <p className={`text-sm ${c.sub}`}>{t("L'examinateur IA lit votre texte…")}</p>
          </Card>
        )}
        {ai && <AiFeedback level={ai.level} score={ai.score} nclc={ai.nclc} summary={ai.summary} strengths={ai.strengths} improvements={ai.improvements} corrected={ai.corrected} rewrites={ai.rewrites} />}
      </div>
      <div className="space-y-5">
        <Card className="p-6">
          <button onClick={() => setShowSample(!showSample)} className="w-full flex items-center justify-between" aria-expanded={showSample}>
            <span className={`font-display font-bold ${c.text}`}>{t("Exemple de réponse")}</span>
            <ChevronDown size={18} className={`text-blue-600 transition-transform ${showSample ? "rotate-180" : ""}`} />
          </button>
          {showSample ? (
            task.sample
              ? <p className={`mt-4 text-sm leading-relaxed ${c.sub} rise`}>{task.sample}</p>
              : <p className={`mt-3 text-sm ${c.faint}`}>{t("Pas encore d'exemple pour ce sujet.")}</p>
          ) : (
            <p className={`mt-3 text-sm ${c.faint}`}>{t("Rédigez d'abord votre texte, puis comparez-le à une réponse de niveau B2/C1.")}</p>
          )}
        </Card>
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-3 ${c.text}`}>{t("Conseils pour cette tâche")}</h3>
          <ul className={`space-y-2.5 text-sm ${c.sub}`}>
            <li className="flex gap-2.5"><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />{t("Répondez à chaque élément de la consigne, sans exception.")}</li>
            <li className="flex gap-2.5"><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />{t("Gardez 3 minutes pour vous relire : accords, négations, accents.")}</li>
            <li className="flex gap-2.5"><Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />{t("Le hors-sujet est plus pénalisé qu'une petite faute de grammaire.")}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
