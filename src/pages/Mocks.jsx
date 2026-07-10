import { useEffect, useRef, useState } from "react";
import { CheckCircle2, BarChart3, Play, ArrowRight, Trophy, RotateCcw, Trash2, CloudOff } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, SectionHead, ProgressBar } from "@/components/common";
import { Quiz } from "@/components/quiz";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { WritingWorkshopBody } from "@/pages/Writing";
import { SpeakingStudioBody } from "@/pages/Speaking";
import { SECTION_LABELS } from "@/utils/bankAdapter";
import { MOCK_SECTIONS } from "@/constants/mocks";
import {
  TASKS_PER_EXAM, generateExamTasks, resolveTasks, scoreExam,
  listAttempts, createAttempt, saveProgress, completeAttempt, abandonAttempt,
} from "@/services/examService";

const when = (iso) => new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/* --------------------------- final report view --------------------------- */

function ExamReport({ attempt, onRestart, onBack }) {
  const { c, nav } = useApp();
  const s = attempt.score;
  return (
    <Card className="p-7 rise max-w-2xl mx-auto">
      <div className="text-center">
        <Trophy size={36} className="text-amber-500 mx-auto" />
        <h3 className={`font-display font-bold text-2xl mt-3 ${c.text}`}>Résultat de l'examen blanc</h3>
        <p className="font-display font-extrabold text-5xl mt-5 grad-text">{s.points} / 699</p>
        <p className={`mt-2 text-sm ${c.sub}`}>{s.ok} / {s.total} bonnes réponses ({s.pct} %) · niveau estimé <span className="font-bold text-blue-600">{s.level}</span></p>
        <p className={`mt-1 text-xs ${c.faint}`}>Score calculé sur les épreuves à choix multiple ; l'expression écrite et orale sont auto-évaluées.</p>
        <div className="max-w-xs mx-auto mt-4"><ProgressBar pct={s.pct} tone="grad" /></div>
      </div>
      <div className="mt-8 space-y-2.5">
        {s.perTask.map((t, i) => {
          const selfAssessed = t.type && t.type !== "quiz";
          return (
            <div key={i} className={`flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border ${c.border}`}>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono2 font-bold ${c.faint}`}>TÂCHE {i + 1}</span>
                <span className={`text-sm font-semibold ${c.text}`}>{SECTION_LABELS[t.section]}</span>
              </div>
              {selfAssessed ? (
                <Pill tone="blue"><CheckCircle2 size={12} /> Complétée · auto-évaluée</Pill>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-mono2 ${c.sub}`}>{t.ok} / {t.total}</span>
                  <Pill tone={t.total && t.ok / t.total >= 0.65 ? "green" : "amber"}>{t.total ? Math.round((t.ok / t.total) * 100) : 0} %</Pill>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex gap-3 justify-center flex-wrap">
        <Btn icon={RotateCcw} onClick={onRestart}>Nouvel examen blanc</Btn>
        <Btn variant="ghost" icon={BarChart3} onClick={() => nav("dashboard")}>Ma progression</Btn>
        <Btn variant="ghost" onClick={onBack}>Mes examens</Btn>
      </div>
    </Card>
  );
}

/* ------------------------------ exam runner ------------------------------ */

function ExamRunner({ attempt: initialAttempt, onExit }) {
  const { c, user, notify } = useApp();
  const [attempt, setAttempt] = useState(initialAttempt);
  const [justFinished, setJustFinished] = useState(null); // completed attempt -> report
  const saveTimer = useRef(null);
  const quizzes = resolveTasks(attempt.tasks);

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
      notify(`Tâche ${idx + 1} terminée — place à la suivante : ${SECTION_LABELS[attempt.tasks[idx + 1].section]}.`);
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
        {attempt.tasks.map((t, k) => (
          <span key={k} className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono2 border
            ${k === idx ? "bg-blue-600 text-white border-blue-600" : k < idx ? "border-emerald-500 text-emerald-600 bg-emerald-500/10" : `${c.border} ${c.faint}`}`}>
            {k < idx ? "✓ " : ""}Tâche {k + 1}
          </span>
        ))}
      </div>
      <button onClick={onExit} className={`text-sm font-semibold ${c.sub} hover:text-blue-600`}>Quitter (progression sauvegardée)</button>
    </div>
  );

  // Expression écrite / orale: same experience as their module pages, plus
  // a completion button (these épreuves are self-assessed, not auto-scored).
  if (type !== "quiz") {
    return (
      <div>
        {header}
        <SectionHead eyebrow={`Tâche ${idx + 1} / ${attempt.tasks.length}`} title={SECTION_LABELS[task.section]} sub="Travaillez la tâche comme le jour J. Cette épreuve est auto-évaluée : elle n'entre pas dans le score à choix multiple." />
        {type === "writing" ? <WritingWorkshopBody /> : <SpeakingStudioBody />}
        <Card className="mt-8 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-blue-600/40">
          <p className={`text-sm ${c.sub}`}>Quand vous avez terminé cette épreuve, passez à la suite de l'examen.</p>
          <Btn icon={CheckCircle2} onClick={() => advanceWith({ ok: 0, total: 0, completed: true })}>J'ai terminé cette tâche</Btn>
        </Card>
      </div>
    );
  }

  if (!quiz) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto">
        <p className={`font-display font-bold ${c.text}`}>Cet examen référence un quiz qui n'existe plus dans la banque.</p>
        <Btn small variant="ghost" className="mt-5" icon={Trash2} onClick={async () => { await abandonAttempt(user?.id, attempt); onExit(); }}>Abandonner cet examen</Btn>
      </Card>
    );
  }

  const savedPicks = attempt.progress.picks?.[order] || {};
  const savedIndex = attempt.progress.indexAt?.[order] || 0;
  const savedLeft = attempt.progress.timeLeft?.[order];
  const duration = savedLeft ?? quiz.questions.length * 55;

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
      <SectionHead eyebrow={`Tâche ${idx + 1} / ${attempt.tasks.length}`} title={SECTION_LABELS[task.section]} sub={`${quiz.title} · ${quiz.questions.length} questions · vos réponses sont enregistrées automatiquement.`} />
      <Quiz
        key={attempt.id + "-" + order}
        questions={quiz.questions}
        duration={duration}
        storageKey={`mock-${attempt.id}-${order}`}
        deferResults
        hideReport
        initialPicks={savedPicks}
        initialIndex={savedIndex}
        onProgress={onProgress}
        onComplete={({ ok, total }) => advanceWith({ ok, total })}
        renderAbove={(q, qi) => <BankQuestionMedia key={q.id ?? qi} question={q} />}
      />
    </div>
  );
}

/* --------------------------------- lobby --------------------------------- */

export function Mocks() {
  const { c, nav, user, notify } = useApp();
  const [attempts, setAttempts] = useState(null);
  const [backend, setBackend] = useState("supabase");
  const [active, setActive] = useState(null);
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

  const start = async () => {
    setStarting(true);
    const tasks = generateExamTasks(attempts || []);
    if (tasks.length === 0) { notify("La banque de questions est vide : impossible de générer un examen."); setStarting(false); return; }
    const attempt = await createAttempt(user?.id, tasks);
    setStarting(false);
    setActive(attempt);
  };

  if (active) {
    return (
      <PageShell wide eyebrow="Examen blanc" title="Conditions d'examen" sub="Répondez à chaque tâche comme le jour J : la correction n'est révélée qu'à la toute fin.">
        <ExamRunner attempt={active} onExit={() => { setActive(null); reload(); }} />
      </PageShell>
    );
  }

  const inProgress = (attempts || []).filter((a) => a.status === "in_progress");
  const history = (attempts || []).filter((a) => a.status === "completed");

  return (
    <PageShell back wide eyebrow="Examens blancs" title="Répétez le jour J, dans les conditions du jour J" sub={`Chaque examen est généré aléatoirement : ${TASKS_PER_EXAM} tâches tirées de la banque de questions, jamais deux fois la même combinaison.`}>
      {backend === "local" && (
        <Card className="p-4 mb-6 flex items-center gap-3 border-amber-500/40">
          <CloudOff size={18} className="text-amber-500 shrink-0" />
          <p className={`text-sm ${c.sub}`}>Sauvegarde locale : vos examens sont conservés sur cet appareil. Exécutez la migration Supabase (<span className="font-mono2">supabase/migrations</span>) pour la synchronisation multi-appareils.</p>
        </Card>
      )}

      <SectionHead title="Le déroulé, épreuve par épreuve" sub="L'ordre et les durées reproduisent la session officielle. Vous pouvez aussi vous entraîner sur une seule épreuve." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      <Card className="p-8 md:p-12 border-2 border-blue-600/40 mb-8 text-center">
        <h3 className={`font-display font-extrabold text-3xl md:text-4xl ${c.text}`}>Nouvel examen blanc</h3>
        <p className={`text-base md:text-lg leading-relaxed mt-4 max-w-2xl mx-auto ${c.sub}`}>
          Préparez-vous dans les conditions réelles de l'examen. Votre examen blanc réunit {TASKS_PER_EXAM} épreuves choisies pour varier les exercices et cibler vos progrès. Vous pouvez interrompre la session à tout moment&nbsp;: votre progression est sauvegardée automatiquement.
        </p>
        <div className="mt-8 flex justify-center">
          <Btn variant="accent" icon={Play} disabled={starting || attempts === null} onClick={start}>{starting ? "Génération…" : "Commencer l'examen"}</Btn>
        </div>
      </Card>

      {inProgress.length > 0 && (
        <>
          <SectionHead title="Examens en cours" sub="Reprenez exactement où vous vous êtes arrêté·e." />
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {inProgress.map((a) => {
              const doneTasks = Object.keys(a.progress?.results || {}).length;
              return (
                <Card key={a.id} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`font-semibold text-sm ${c.text}`}>Commencé le {when(a.startedAt)}</p>
                      <p className={`text-xs mt-1 font-mono2 ${c.faint}`}>Tâche {Math.min((a.progress?.taskIndex || 0) + 1, a.tasks.length)} / {a.tasks.length} · {doneTasks} terminée{doneTasks > 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Btn small icon={Play} onClick={() => setActive(a)}>Reprendre</Btn>
                      <button aria-label="Abandonner" title="Abandonner cet examen" onClick={async () => { await abandonAttempt(user?.id, a); reload(); }} className={`p-2 rounded-full ${c.hoverSoft} ${c.faint}`}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="mt-3"><ProgressBar pct={(doneTasks / a.tasks.length) * 100} /></div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {history.length > 0 && (
        <>
          <SectionHead title="Historique" sub="Vos examens blancs terminés." />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {history.map((a) => (
              <Card key={a.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Pill tone="green"><CheckCircle2 size={12} /> Terminé</Pill>
                  <span className={`text-xs font-mono2 ${c.faint}`}>{when(a.completedAt)}</span>
                </div>
                <p className="font-display font-extrabold text-3xl grad-text">{a.score?.points ?? 0} / 699</p>
                <p className={`text-xs mt-1 ${c.sub}`}>{a.score?.ok} / {a.score?.total} bonnes réponses · niveau {a.score?.level}</p>
                <div className="mt-3"><ProgressBar pct={a.score?.pct || 0} tone="grad" /></div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Card className="mt-10 p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
        <span className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><BarChart3 size={20} /></span>
        <div className="flex-1">
          <p className={`font-semibold ${c.text}`}>Analyse de performance après chaque examen</p>
          <p className={`text-sm mt-1 ${c.sub}`}>Score par tâche, pourcentage global, niveau CECR estimé et historique complet de vos tentatives.</p>
        </div>
        <Btn small variant="ghost" onClick={() => nav("dashboard")} icon={ArrowRight}>Ma progression</Btn>
      </Card>
    </PageShell>
  );
}
