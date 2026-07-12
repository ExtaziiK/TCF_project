import { useEffect, useRef, useState } from "react";
import { CheckCircle2, BarChart3, Play, ArrowRight, Trophy, RotateCcw, Trash2, CloudOff, Clock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, SectionHead, ProgressBar } from "@/components/common";
import { Quiz } from "@/components/quiz";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { ExamSetup } from "@/components/exam/ExamSetup";
import { WritingWorkshopBody } from "@/pages/Writing";
import { SpeakingStudioBody } from "@/pages/Speaking";
import { SECTION_LABELS } from "@/utils/bankAdapter";
import { MOCK_SECTIONS } from "@/constants/mocks";
import {
  TASKS_PER_EXAM, generateExamTasks, resolveTasks, scoreExam, levelForPct,
  listAttempts, createAttempt, saveProgress, completeAttempt, abandonAttempt,
} from "@/services/examService";

const when = (iso) => new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/* --------------------------- final report view --------------------------- */

function ExamReport({ attempt, onRestart, onBack }) {
  const { c, nav, t } = useApp();
  const s = attempt.score;
  return (
    <Card className="p-7 rise max-w-2xl mx-auto">
      <div className="text-center">
        <Trophy size={36} className="text-amber-500 mx-auto" />
        <h3 className={`font-display font-bold text-2xl mt-3 ${c.text}`}>{t("Résultat du TCF blanc")}</h3>
        <p className="font-display font-extrabold text-5xl mt-5 grad-text">{s.points} / 699</p>
        <p className={`mt-2 text-sm ${c.sub}`}>{s.ok} / {s.total} {t("bonnes réponses")} ({s.pct} %) · {t("niveau estimé")} <span className="font-bold text-blue-600">{s.level}</span></p>
        <p className={`mt-1 text-xs ${c.faint}`}>{t("Score calculé sur les épreuves à choix multiple ; l'expression écrite et orale sont auto-évaluées.")}</p>
        <div className="max-w-xs mx-auto mt-4"><ProgressBar pct={s.pct} tone="grad" /></div>
      </div>
      <div className="mt-8 space-y-2.5">
        {s.perTask.map((task, i) => {
          const selfAssessed = task.type && task.type !== "quiz";
          const taskPct = task.total ? Math.round((task.ok / task.total) * 100) : 0;
          return (
            <div key={i} className={`flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border ${c.border}`}>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono2 font-bold ${c.faint}`}>{t("TÂCHE")} {i + 1}</span>
                <span className={`text-sm font-semibold ${c.text}`}>{t(SECTION_LABELS[task.section])}</span>
              </div>
              {selfAssessed ? (
                <Pill tone="blue"><CheckCircle2 size={12} /> {t("Complétée · auto-évaluée")}</Pill>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-mono2 ${c.sub}`}>{task.ok} / {task.total}</span>
                  <Pill tone="slate">{t("Niveau")} {levelForPct(taskPct)}</Pill>
                  <Pill tone={taskPct >= 65 ? "green" : "amber"}>{taskPct} %</Pill>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex gap-3 justify-center flex-wrap">
        <Btn icon={RotateCcw} onClick={onRestart}>{t("Nouveau TCF blanc")}</Btn>
        <Btn variant="ghost" icon={BarChart3} onClick={() => nav("dashboard")}>{t("Ma progression")}</Btn>
        <Btn variant="ghost" onClick={onBack}>{t("Mes examens")}</Btn>
      </div>
    </Card>
  );
}

/* ------------------------------ exam runner ------------------------------ */

function ExamRunner({ attempt: initialAttempt, onExit }) {
  const { c, user, notify, t } = useApp();
  const [attempt, setAttempt] = useState(initialAttempt);
  const [justFinished, setJustFinished] = useState(null); // completed attempt -> report
  const saveTimer = useRef(null);
  const quizzes = resolveTasks(attempt.tasks);
  const mode = attempt.progress?.mode || "entrainement"; // "test" mirrors real conditions
  const startedLabel = new Date(attempt.startedAt).toLocaleDateString("fr-CA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // Debounced autosave so every answer/navigation persists the session.
  const persist = (next) => {
    setAttempt(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveProgress(user?.id, next), 600);
  };
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  if (justFinished) return <ExamReport attempt={justFinished} onRestart={onExit} onBack={onExit} />;

  const idx = attempt.progress.taskIndex || 0;
  const task = attempt.tasks[idx];
  const type = task.type || "quiz";
  const quiz = quizzes[idx];
  const order = task.order;

  // Records the finished task and moves on (or completes the exam).
  const advanceWith = async (result) => {
    clearTimeout(saveTimer.current); // a stale autosave must not race the writes below
    const results = { ...attempt.progress.results, [order]: { ...result, section: task.section, type } };
    if (idx + 1 < attempt.tasks.length) {
      const next = { ...attempt, progress: { ...attempt.progress, results, taskIndex: idx + 1 } };
      setAttempt(next);
      saveProgress(user?.id, next);
      notify(`${t("Tâche")} ${idx + 1} ${t("terminée — place à la suivante :")} ${t(SECTION_LABELS[attempt.tasks[idx + 1].section])}.`);
    } else {
      const perTask = attempt.tasks.map((t) => results[t.order] || { ok: 0, total: 0, section: t.section, type: t.type || "quiz" });
      const score = { ...scoreExam(perTask), perTask };
      const done = await completeAttempt(user?.id, { ...attempt, progress: { ...attempt.progress, results } }, score);
      setJustFinished(done);
    }
  };

  const header = (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
      <div className="flex items-center gap-2 flex-wrap">
        {attempt.tasks.map((_, k) => (
          <span key={k} className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono2 border
            ${k === idx ? "bg-blue-600 text-white border-blue-600" : k < idx ? "border-emerald-500 text-emerald-600 bg-emerald-500/10" : `${c.border} ${c.faint}`}`}>
            {k < idx ? "✓ " : ""}{t("Tâche")} {k + 1}
          </span>
        ))}
      </div>
      <button onClick={onExit} className={`text-sm font-semibold ${c.sub} hover:text-blue-600`}>{t("Quitter (progression sauvegardée)")}</button>
    </div>
  );

  // Expression écrite / orale: same experience as their module pages, plus
  // a completion button (these épreuves are self-assessed, not auto-scored).
  if (type !== "quiz") {
    return (
      <div>
        {header}
        <SectionHead eyebrow={`${t("Tâche")} ${idx + 1} / ${attempt.tasks.length}`} title={t(SECTION_LABELS[task.section])} sub={t("Travaillez la tâche comme le jour J. Cette épreuve est auto-évaluée : elle n'entre pas dans le score à choix multiple.")} />
        {type === "writing" ? <WritingWorkshopBody /> : <SpeakingStudioBody />}
        <Card className="mt-8 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-blue-600/40">
          <p className={`text-sm ${c.sub}`}>{t("Quand vous avez terminé cette épreuve, passez à la suite de l'examen.")}</p>
          <Btn icon={CheckCircle2} onClick={() => advanceWith({ ok: 0, total: 0, completed: true })}>{t("J'ai terminé cette tâche")}</Btn>
        </Card>
      </div>
    );
  }

  if (!quiz) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto">
        <p className={`font-display font-bold ${c.text}`}>{t("Cet examen référence un quiz qui n'existe plus dans la banque.")}</p>
        <Btn small variant="ghost" className="mt-5" icon={Trash2} onClick={async () => { await abandonAttempt(user?.id, attempt); onExit(); }}>{t("Abandonner cet examen")}</Btn>
      </Card>
    );
  }

  const savedPicks = attempt.progress.picks?.[order] || {};
  const savedIndex = attempt.progress.indexAt?.[order] || 0;
  const savedLeft = attempt.progress.timeLeft?.[order];
  const duration = savedLeft ?? quiz.questions.length * 55;
  const candidatePanel = {
    nom: attempt.progress?.candidate?.nom,
    pays: attempt.progress?.candidate?.pays,
    type: t(SECTION_LABELS[task.section]),
    date: startedLabel,
  };
  // Real-exam Compréhension orale: audio auto-plays and the question moves on
  // by itself. Only in test mode, and only for the audio-driven CO épreuve.
  const autoAdvance = mode === "test" && task.section === "co" && quiz.questions.some((qq) => qq.audio);

  const onProgress = ({ picks, index, left }) => {
    persist({
      ...attempt,
      progress: {
        ...attempt.progress,
        picks: { ...attempt.progress.picks, [order]: picks },
        indexAt: { ...attempt.progress.indexAt, [order]: index },
        timeLeft: { ...attempt.progress.timeLeft, [order]: left },
      },
    });
  };

  return (
    <div>
      {header}
      <SectionHead eyebrow={`${t("Tâche")} ${idx + 1} / ${attempt.tasks.length}`} title={t(SECTION_LABELS[task.section])} sub={`${quiz.title} · ${quiz.questions.length} ${t("questions · vos réponses sont enregistrées automatiquement.")}`} />
      <Quiz
        key={attempt.id + "-" + order}
        questions={quiz.questions}
        duration={duration}
        storageKey={`mock-${attempt.id}-${order}`}
        deferResults
        hideReport
        examLayout
        candidate={candidatePanel}
        oneWay={mode === "test"}
        autoAdvance={autoAdvance}
        initialPicks={savedPicks}
        initialIndex={savedIndex}
        onProgress={onProgress}
        onComplete={({ ok, total }) => advanceWith({ ok, total })}
        renderAbove={(q, qi, ctx) => <BankQuestionMedia question={q} allowReplay={mode !== "test"} autoPlay={ctx?.autoPlay} onAudioEnded={ctx?.onAudioEnded} />}
      />
    </div>
  );
}

/* --------------------------------- lobby --------------------------------- */

export function Mocks() {
  const { c, nav, user, notify, t } = useApp();
  const [attempts, setAttempts] = useState(null);
  const [backend, setBackend] = useState("supabase");
  const [active, setActive] = useState(null);
  const [setup, setSetup] = useState(false); // pre-exam mode + candidate screen
  const [starting, setStarting] = useState(false);

  const reload = async () => {
    const { attempts: list, backend: b } = await listAttempts(user?.id);
    setAttempts(list);
    setBackend(b);
  };
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Called by the setup screen with the chosen mode + candidate identity.
  const start = async ({ mode, nom, email, pays }) => {
    setStarting(true);
    const tasks = generateExamTasks(attempts || []);
    if (tasks.length === 0) { notify(t("La banque de questions est vide : impossible de générer un examen.")); setStarting(false); return; }
    const attempt = await createAttempt(user?.id, tasks, { mode, candidate: { nom, email, pays } });
    setStarting(false);
    setSetup(false);
    setActive(attempt);
  };

  if (active) {
    return (
      <PageShell wide eyebrow={t("TCF blanc")} title={t("Conditions d'examen")} sub={t("Répondez à chaque tâche comme le jour J : la correction n'est révélée qu'à la toute fin.")}>
        <ExamRunner attempt={active} onExit={() => { setActive(null); reload(); }} />
      </PageShell>
    );
  }

  if (setup) {
    return (
      <PageShell back wide eyebrow={t("TCF blanc")} title={t("Vos informations")} sub={t("Choisissez votre mode et renseignez vos informations avant de démarrer.")}>
        <ExamSetup onStart={start} onCancel={() => setSetup(false)} busy={starting} />
      </PageShell>
    );
  }

  const inProgress = (attempts || []).filter((a) => a.status === "in_progress");
  const history = (attempts || []).filter((a) => a.status === "completed");

  return (
    <PageShell tight center big back wide eyebrow={t("TCF blanc")} title={t("Répétez le jour J, dans les conditions du jour J")} sub={`${t("Chaque examen est généré aléatoirement :")} ${TASKS_PER_EXAM} ${t("tâches tirées de la banque de questions, jamais deux fois la même combinaison.")}`}>
      {backend === "local" && (
        <Card className="p-3 mb-4 flex items-center gap-3 border-amber-500/40">
          <CloudOff size={18} className="text-amber-500 shrink-0" />
          <p className={`text-sm ${c.sub}`}>{t("Sauvegarde locale : vos examens sont conservés sur cet appareil. Exécutez la migration Supabase (")}<span className="font-mono2">supabase/migrations</span>{t(") pour la synchronisation multi-appareils.")}</p>
        </Card>
      )}

      {/* One panel: format pills, then the four épreuves, then the start CTA.
          Vertical padding runs deeper than horizontal so the three groups get
          breathing room top and bottom. */}
      <Card className="relative overflow-hidden px-6 py-9 md:px-10 md:py-12 border-2 border-blue-600/40 mb-8">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-600/10 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-rose-600/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-col items-center gap-8 md:gap-10">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Pill tone="slate"><Clock size={12} /> {t("≈ 2 h 47 au total")}</Pill>
            <Pill tone="blue">{TASKS_PER_EXAM} {t("épreuves officielles")}</Pill>
            <Pill tone="green"><Trophy size={12} /> {t("Score sur 699")}</Pill>
          </div>

          {/* Informational only — these tiles don't navigate, they present the
              format. Rendered on the page background so they read as inset
              tiles against the white panel; hover expands the description. */}
          <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {MOCK_SECTIONS.map((s, i) => (
              <div key={s.t} className={`group p-5 flex flex-col text-left rounded-2xl border ${c.border} ${c.bg} transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/10`}>
                <div className="flex items-start justify-between mb-4">
                  <span className="w-10 h-10 rounded-xl grad-brand text-white flex items-center justify-center shadow-md shadow-blue-600/25"><s.icon size={18} /></span>
                  <Pill tone="blue">{t("Épreuve")} {i + 1}</Pill>
                </div>
                <p className={`font-display font-bold text-sm ${c.text}`}>{t(s.t)}</p>
                <p className={`text-xs font-mono2 mt-1 ${c.faint}`}>{t(s.d)}</p>
                <div className="max-h-0 opacity-0 overflow-hidden transition-all duration-300 group-hover:max-h-48 group-hover:opacity-100 group-hover:mt-3">
                  <p className={`text-xs leading-relaxed ${c.sub}`}>{t(s.desc)}</p>
                  <button onClick={() => nav("guide")} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:gap-1.5 transition-all">
                    {t("Pour plus de détails, cliquez ici")} <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3">
            <Btn variant="accent" icon={Play} disabled={attempts === null} onClick={() => setSetup(true)}>{t("Commencer l'examen")}</Btn>
            <p className={`text-xs text-center ${c.faint}`}>{t("Interrompez la session à tout moment : votre progression est sauvegardée automatiquement.")}</p>
          </div>
        </div>
      </Card>

      {inProgress.length > 0 && (
        <>
          <SectionHead tight title={t("Examens en cours")} sub={t("Reprenez exactement où vous vous êtes arrêté·e.")} />
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {inProgress.map((a) => {
              const doneTasks = Object.keys(a.progress?.results || {}).length;
              return (
                <Card key={a.id} className="p-6 transition-all duration-200 hover:shadow-xl hover:shadow-blue-600/10">
                  <div className="flex items-center justify-between mb-3">
                    <Pill tone="amber"><Play size={12} /> {t("En cours")}</Pill>
                    <span className={`text-xs font-mono2 ${c.faint}`}>{t("Commencé le")} {t(when(a.startedAt))}</span>
                  </div>
                  <p className={`font-display font-bold ${c.text}`}>
                    {t(SECTION_LABELS[a.tasks[Math.min(a.progress?.taskIndex || 0, a.tasks.length - 1)]?.section] || "TCF blanc")}
                  </p>
                  <p className={`text-xs mt-1 font-mono2 ${c.faint}`}>{t("Tâche")} {Math.min((a.progress?.taskIndex || 0) + 1, a.tasks.length)} / {a.tasks.length} · {doneTasks} {t(doneTasks > 1 ? "terminées" : "terminée")}</p>
                  <div className="mt-3"><ProgressBar pct={(doneTasks / a.tasks.length) * 100} tone="grad" /></div>
                  <div className="mt-5 flex items-center gap-2 flex-wrap">
                    <Btn small variant="accent" icon={Play} onClick={() => setActive(a)}>{t("Reprendre l'examen")}</Btn>
                    <Btn small variant="ghost" className="text-rose-600" icon={Trash2} onClick={async () => { await abandonAttempt(user?.id, a); reload(); notify(t("Examen abandonné.")); }}>{t("Abandonner")}</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {history.length > 0 && (
        <>
          <SectionHead tight title={t("Historique")} sub={t("Vos TCF blancs terminés.")} />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {history.map((a) => {
              const perTask = a.score?.perTask || [];
              return (
                <Card key={a.id} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Pill tone="green"><CheckCircle2 size={12} /> {t("Terminé")}</Pill>
                    <span className={`text-xs font-mono2 ${c.faint}`}>{t(when(a.completedAt))}</span>
                  </div>
                  <p className="font-display font-extrabold text-3xl grad-text">{a.score?.points ?? 0} / 699</p>
                  <p className={`text-xs mt-1 ${c.sub}`}>{a.score?.ok} / {a.score?.total} {t("bonnes réponses")}</p>
                  <div className="mt-3"><ProgressBar pct={a.score?.pct || 0} tone="grad" /></div>
                  {/* Per-task levels — one badge per épreuve, not the single
                      blended global level, since a candidate may be B1 in one
                      épreuve and A2 in another. */}
                  {perTask.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      {perTask.map((task, i) => {
                        const selfAssessed = task.type && task.type !== "quiz";
                        const taskPct = task.total ? Math.round((task.ok / task.total) * 100) : 0;
                        return (
                          <div key={i} className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border ${c.border}`}>
                            <span className={`text-[11px] font-bold uppercase tracking-wide ${c.faint}`}>{task.section}</span>
                            <span className={`text-xs font-mono2 font-bold ${c.text}`}>{selfAssessed ? t("Auto") : levelForPct(taskPct)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Card className="mt-10 p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
        <span className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><BarChart3 size={20} /></span>
        <div className="flex-1">
          <p className={`font-semibold ${c.text}`}>{t("Analyse de performance après chaque examen")}</p>
          <p className={`text-sm mt-1 ${c.sub}`}>{t("Score par tâche, pourcentage global, niveau CECR estimé et historique complet de vos tentatives.")}</p>
        </div>
        <Btn small variant="ghost" onClick={() => nav("dashboard")} icon={ArrowRight}>{t("Ma progression")}</Btn>
      </Card>
    </PageShell>
  );
}
