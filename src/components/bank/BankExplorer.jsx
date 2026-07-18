import { useEffect, useState } from "react";
import { ChevronLeft, Play, FolderOpen, ArrowRight, Lock, Check, Eye } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { Quiz } from "@/components/quiz";
import { QuizReport } from "@/components/quiz/QuizReport";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { getBank } from "@/services/bankService";
import { SECTION_LABELS } from "@/utils/bankAdapter";
import { listQuizResults, bestScoresByKey, reviewableAttemptsByKey } from "@/services/quizResultsService";
import { useSignedQuestions } from "@/hooks/useSignedQuestions";
import { ROLES } from "@/auth/rbac";

const isPrompt = (quiz) => quiz.kind === "prompt";

// Compact quiz tile for the épreuves grid. The section is already shown by the
// tabs above the grid and the page header, so it's dropped here to keep the
// card small. The corner badge and colour encode state at a glance:
// emerald = completed (all questions answered), orange = completed but some
// questions left unanswered, blue = ready to start, amber lock = Premium-only
// (free tier, everything past quiz 1 of each épreuve).
// Hovering (or focusing) a completed card reveals a "Voir la correction"
// button that reopens the most recent attempt with per-question detail on
// record (which isn't necessarily the best-scoring one shown on the card —
// older attempts, or ones recorded before a pending migration, carry no
// detail; the button simply doesn't show until a reviewable attempt exists).
function QuizCard({ quiz, number, onOpen, onReview, best, reviewAttempt, locked }) {
  const { c, t } = useApp();
  const prompt = isPrompt(quiz);
  const count = quiz.questions.length;
  const done = !prompt && !!best;
  const answered = best?.answered ?? best?.total;
  const partial = done && !!best.total && answered < best.total;
  const canReview = !!reviewAttempt;
  const minutes = Math.max(1, Math.round((count * 55) / 60));

  const badge = locked ? (
    <span className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0"><Lock size={14} /></span>
  ) : partial ? (
    <span className="w-7 h-7 rounded-full bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0"><Check size={16} /></span>
  ) : done ? (
    <span className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0"><Check size={16} /></span>
  ) : (
    <span className="w-7 h-7 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Play size={14} className="ml-0.5" /></span>
  );

  return (
    <div className="group relative h-full">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
        aria-label={prompt ? t(quiz.title) : `${t("Quizz")} ${number}`}
        className="text-left w-full h-full block cursor-pointer"
      >
        <Card lift={!locked} className={`p-3.5 h-full flex gap-2.5 ${partial ? "!bg-orange-500/10 !border-orange-500/40" : done ? "!bg-emerald-500/10 !border-emerald-500/40" : ""} ${locked ? "opacity-60" : ""}`}>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-display font-bold text-sm leading-snug ${locked ? c.sub : c.text}`}>
                {prompt ? t(quiz.title) : `${t("Quizz")} ${number}`}
              </h3>
              {badge}
            </div>
            {/* Meta and completion status share one line so the card's height
                never changes with state — an extra footer row would grow the
                card, and in a grid that stretches its whole row. The score's
                progress is shown as the vertical bar on the right instead. */}
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
              <span className={c.faint}>
                {prompt ? `${count} ${t(count > 1 ? "consignes" : "consigne")}` : `${count} ${t("questions")}`}
              </span>
              {done ? (
                <span className={partial ? "text-orange-600" : "text-emerald-600"}>{best.ok}/{best.total}</span>
              ) : locked ? (
                <span className="text-amber-600">{t("Premium")}</span>
              ) : !prompt ? (
                <span className={c.faint}>≈ {minutes} min</span>
              ) : null}
            </div>
          </div>
          {done && (
            <div
              role="progressbar" aria-valuenow={best.pct} aria-valuemin={0} aria-valuemax={100}
              title={`${t("Terminé")} · ${best.ok}/${best.total} · ${best.pct} %`}
              className={`w-1.5 self-stretch shrink-0 rounded-full overflow-hidden flex flex-col justify-end ${partial ? "bg-orange-500/20" : "bg-emerald-500/20"}`}
            >
              <div className={`w-full rounded-full ${partial ? "bg-orange-500" : "bg-emerald-500"}`} style={{ height: `${best.pct}%` }} />
            </div>
          )}
        </Card>
      </div>
      {canReview && (
        <div className="absolute inset-0 rounded-3xl bg-slate-900/55 opacity-0 pointer-events-none transition-opacity
          group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto
          flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onReview(); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-900 shadow-lg hover:scale-105 transition-transform"
          >
            <Eye size={14} /> {t("Voir la correction")}
          </button>
        </div>
      )}
    </div>
  );
}

// Reopens a past attempt's full correction (score, per-question right/wrong/
// skipped, explanations) from its stored answers, without re-running the quiz.
function ReviewPanel({ quiz, attempt, onBack, onRestart }) {
  const { t } = useApp();
  // The Quiz engine isn't mounted here, so signed-media descriptors are
  // exchanged for fresh URLs directly (no-op when the flag is off).
  const questions = useSignedQuestions(quiz.questions);
  return (
    <PageShell eyebrow={t(SECTION_LABELS[quiz.section])} title={t(quiz.title)} sub={t("Correction de votre dernière tentative revoyable.")}>
      <button onClick={onBack} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-8"><ChevronLeft size={15} /> {t("Tous les quiz")}</button>
      <QuizReport
        questions={questions}
        answers={attempt.answers}
        duration={attempt.durationSec ?? 0}
        left={0}
        onRestart={onRestart}
        renderAbove={(q) => <BankQuestionMedia question={q} />}
      />
    </PageShell>
  );
}

// Shown to free users on an épreuve whose content is a Premium-only workshop
// (Expression écrite / orale — there's no free "quiz 1" to open there).
function PremiumSectionGate() {
  const { c, nav, t } = useApp();
  return (
    <Card className="p-8 md:p-10 text-center border-2 border-blue-600/40 max-w-2xl mx-auto">
      <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30"><Lock size={22} /></span>
      <p className={`font-display font-bold text-lg mt-4 ${c.text}`}>{t("Cette épreuve fait partie du Premium")}</p>
      <p className={`text-sm mt-1.5 ${c.sub}`}>{t("L'atelier d'expression écrite et orale, avec l'analyse IA, est réservé aux abonnés Premium.")}</p>
      <Btn variant="accent" className="mt-6" onClick={() => nav("pricing")}>{t("Voir les forfaits")}</Btn>
    </Card>
  );
}

// Expression écrite / orale entries: a list of consignes with their metadata,
// linking to the workshop page where these tasks are actually practiced.
function PromptList({ quiz, onBack }) {
  const { c, nav, t } = useApp();
  const route = quiz.section === "ee" ? "writing" : "speaking";
  return (
    <PageShell eyebrow={t(SECTION_LABELS[quiz.section])} title={t(quiz.title)} sub={t("Ces consignes sont disponibles comme tâches dans l'atelier de pratique.")}>
      <button onClick={onBack} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-8"><ChevronLeft size={15} /> {t("Tous les quiz")}</button>
      <div className="space-y-4 max-w-3xl">
        {quiz.questions.map((q, i) => (
          <Card key={q.id ?? i} className="p-6">
            <div className="flex gap-2 flex-wrap mb-3">
              {quiz.section === "ee" && q.minWords && <Pill tone="red">{q.minWords} {t("à")} {q.maxWords} {t("mots")}</Pill>}
              {quiz.section === "eo" && <Pill tone="blue">{Number(q.prepTime) ? `${t("Préparation :")} ${q.prepTime} s` : t("Sans préparation")}</Pill>}
              {quiz.section === "eo" && q.speakTime && <Pill tone="red">{t("Parole :")} {q.speakTime} s</Pill>}
            </div>
            <p className={`leading-relaxed font-medium ${c.text}`}>{q.prompt}</p>
            {q.instructions && <p className={`text-sm mt-2 ${c.sub}`}>{q.instructions}</p>}
            {q.image && <img src={q.image} alt="" className="max-h-48 rounded-2xl object-contain mt-3" />}
          </Card>
        ))}
        <Btn icon={ArrowRight} onClick={() => nav(route)}>{t("Travailler ces tâches dans l'atelier")}</Btn>
      </div>
    </PageShell>
  );
}

// Quiz browser over the question bank. The admin "Banque de questions" page
// shows every section; the premium module pages reuse it locked to a single
// section, so the same data and quiz engine serve both without duplication.
export function BankExplorer({ sections = ["co", "ce", "ee", "eo"], eyebrow, title, sub, back, workshops }) {
  const { c, user, role, nav, notify, t } = useApp();
  const bank = getBank();
  const [section, setSection] = useState(sections[0]);
  const [quiz, setQuiz] = useState(null);
  const [review, setReview] = useState(null); // { quiz, attempt } — reopened past attempt, read-only
  const [bestScores, setBestScores] = useState({});
  const [reviewableAttempts, setReviewableAttempts] = useState({});

  // Free tier: only the first quiz of each épreuve is playable — the rest are
  // locked and route to the upgrade page. Premium/admin never hit this.
  const freeTier = role === ROLES.FREE_USER;
  const goUpgrade = () => { notify(t("Ce quiz fait partie de l'abonnement Premium.")); nav("pricing"); };

  const reloadScores = () => {
    listQuizResults(user?.id).then(({ results }) => {
      setBestScores(bestScoresByKey(results));
      setReviewableAttempts(reviewableAttemptsByKey(results));
    });
  };
  useEffect(reloadScores, [user?.id]);

  const closeQuiz = () => { setQuiz(null); reloadScores(); };

  // Jump to the top when a quiz opens or closes — this swaps the whole panel
  // in place (no route change), so without this the user stays scrolled to
  // wherever the quiz grid card was.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [quiz, review]);

  if (review) {
    return (
      <ReviewPanel
        quiz={review.quiz}
        attempt={review.attempt}
        onBack={() => setReview(null)}
        onRestart={() => { const qz = review.quiz; setReview(null); setQuiz(qz); }}
      />
    );
  }

  if (quiz && isPrompt(quiz)) return <PromptList quiz={quiz} onBack={closeQuiz} />;

  if (quiz) {
    return (
      <PageShell eyebrow={t(SECTION_LABELS[quiz.section])} title={t(quiz.title)} sub={`${quiz.questions.length} ${t("questions · conditions d'examen : la correction complète est révélée à la fin, avec votre score.")}`}>
        <button onClick={closeQuiz} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-8"><ChevronLeft size={15} /> {t("Tous les quiz")}</button>
        <Quiz
          key={quiz.id}
          questions={quiz.questions}
          duration={quiz.questions.length * 55}
          storageKey={`bank-${quiz.id}`}
          deferResults
          renderAbove={(q) => <BankQuestionMedia question={q} />}
          doneExtra={<Btn variant="ghost" onClick={closeQuiz}>{t("Choisir un autre quiz")}</Btn>}
        />
      </PageShell>
    );
  }

  const quizzes = bank[section];
  // EE/EO carry no MCQ quizzes — their épreuve is the expression workshop,
  // handed in via `workshops`. Show it whenever the section has no real quiz
  // (a bank prompt-quiz doesn't count); free users get the Premium gate.
  const workshop = workshops?.[section];
  const showWorkshop = workshop && !quizzes.some((qz) => !isPrompt(qz));

  return (
    <PageShell wide eyebrow={t(eyebrow)} title={t(title)} sub={t(sub)} back={back}>
      {sections.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-8">
          {sections.map((s) => (
            <button key={s} onClick={() => setSection(s)} className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors ${section === s ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
              {t(SECTION_LABELS[s])}
              <span className={`text-xs font-mono2 ${section === s ? "opacity-80" : c.faint}`}>{workshops?.[s] ? "" : bank[s].length}</span>
            </button>
          ))}
        </div>
      )}
      {freeTier && !showWorkshop && quizzes.length > 0 && (
        <Card className="p-4 mb-6 flex items-center gap-3 border-blue-600/30">
          <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Lock size={16} /></span>
          <p className={`text-sm ${c.sub}`}>{t("Offre gratuite : le premier quiz de chaque épreuve est ouvert. Passez au Premium pour débloquer tous les autres.")}</p>
          <Btn small variant="accent" className="ml-auto shrink-0" onClick={() => nav("pricing")}>{t("Débloquer")}</Btn>
        </Card>
      )}
      {showWorkshop ? (
        freeTier ? <PremiumSectionGate /> : workshop
      ) : quizzes.length === 0 ? (
        <Card className="p-10 text-center">
          <FolderOpen size={32} className="text-blue-600 mx-auto mb-4" />
          <p className={`font-display font-bold ${c.text}`}>{t("Aucun quiz dans cette épreuve pour l'instant")}</p>
          <p className={`mt-2 text-sm ${c.sub}`}>{t("De nouveaux quiz sont ajoutés régulièrement — revenez bientôt.")}</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {quizzes.map((qz, idx) => {
            const locked = freeTier && idx > 0;
            const best = bestScores[`bank-${qz.id}`];
            const reviewAttempt = reviewableAttempts[`bank-${qz.id}`];
            return (
              <QuizCard
                key={qz.id}
                quiz={qz}
                number={idx + 1}
                locked={locked}
                best={best}
                reviewAttempt={reviewAttempt}
                onOpen={() => (locked ? goUpgrade() : setQuiz(qz))}
                onReview={() => setReview({ quiz: qz, attempt: reviewAttempt })}
              />
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
