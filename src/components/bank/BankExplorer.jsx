import { useEffect, useState } from "react";
import { ChevronLeft, Play, FolderOpen, ArrowRight, Lock, Check, Eye, RotateCcw, BookOpen, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { Quiz } from "@/components/quiz";
import { QuizReport } from "@/components/quiz/QuizReport";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { CO_GUIDE_PANEL, CE_GUIDE_PANEL } from "@/pages/GuideComprehension";
import { EE_GUIDE_PANEL } from "@/pages/GuideExpressionEcrite";
import { EO_GUIDE_PANEL } from "@/pages/GuideExpressionOrale";
import { getBank } from "@/services/bankService";
import { SECTION_LABELS } from "@/utils/bankAdapter";
import { ExpressionTaskProvider } from "@/context/ExpressionTaskContext";
import { listQuizResults, bestScoresByKey, reviewableAttemptsByKey } from "@/services/quizResultsService";
import { useSignedQuestions } from "@/hooks/useSignedQuestions";
import { ROLES } from "@/auth/rbac";

const isPrompt = (quiz) => quiz.kind === "prompt";

// Every épreuve's guide, keyed by section, for the "Guide de l'épreuve" side
// panel. Each descriptor carries its header meta and a compact-aware Body.
const GUIDE_PANELS = { co: CO_GUIDE_PANEL, ce: CE_GUIDE_PANEL, ee: EE_GUIDE_PANEL, eo: EO_GUIDE_PANEL };

// Compact quiz tile for the épreuves grid. The section is already shown by the
// tabs above the grid and the page header, so it's dropped here to keep the
// card small. The corner badge and colour encode state at a glance:
// emerald = completed (all questions answered), orange = completed but some
// questions left unanswered, blue = ready to start, amber lock = Premium-only
// (free tier, everything past quiz 1 of each épreuve).
// Hovering (or focusing) a completed card reveals its actions — "Résultats"
// (reopens the most recent attempt that carries per-question detail; not
// necessarily the best-scoring one on the card, and hidden until such a
// reviewable attempt exists) and "Refaire" (retake the quiz) — plus a caption
// clarifying that the "ok/total" figure is correct answers, not answered.
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
                // "ok/total" is correct answers over total questions — not the
                // number answered; the title + hover overlay spell that out.
                <span className={`inline-flex items-center gap-1 ${partial ? "text-orange-600" : "text-emerald-600"}`} title={`${best.ok} ${t("bonnes réponses sur")} ${best.total}`}>
                  <Check size={12} className="shrink-0" />{best.ok}/{best.total}
                </span>
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
      {/* Completed cards reveal their actions on hover/focus: review the past
          attempt (when one carries per-question detail) and/or retake the quiz.
          The caption clarifies that "3/39" is correct answers, not answered. */}
      {done && !locked && (
        <div className="absolute inset-0 rounded-3xl bg-slate-900/65 opacity-0 pointer-events-none transition-opacity
          group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto
          flex flex-col items-center justify-center gap-1.5 p-2.5 text-center">
          <p className="text-white/90 text-[10px] font-semibold leading-tight">{best.ok}/{best.total} {t("bonnes réponses")}</p>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {canReview && (
              <button
                onClick={(e) => { e.stopPropagation(); onReview(); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white text-slate-900 shadow hover:scale-105 transition-transform"
              >
                <Eye size={13} /> {t("Résultats")}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onOpen(); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white shadow hover:scale-105 transition-transform"
            >
              <RotateCcw size={13} /> {t("Refaire")}
            </button>
          </div>
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

// Side panel that lets the candidate re-read the épreuve's guide (skills
// tested, question types, a worked example, tips) right beside the question,
// without leaving the exam page. Rendered only for sections that have a guide
// (compréhension orale / écrite). It sticks below the nav while the quiz on the
// left scrolls, and stays a fixed inner width so its content never reflows
// while the wrapping <aside> animates its width open/closed.
function GuidePanel({ section, onClose }) {
  const { c, t } = useApp();
  const guide = GUIDE_PANELS[section];
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!guide) return null;
  const Body = guide.Body;
  return (
    <div className={`sticky top-24 flex flex-col max-h-[calc(100vh-7rem)] rounded-3xl border ${c.border} ${c.card} shadow-xl overflow-hidden`} role="dialog" aria-label={t(guide.title)}>
      <div className={`shrink-0 flex items-start justify-between gap-3 p-5 border-b ${c.border}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">{t(guide.eyebrow)}</p>
          <h3 className={`font-display font-bold text-lg mt-1 ${c.text}`}>{t(guide.title)}</h3>
        </div>
        <button onClick={onClose} aria-label={t("Fermer")} className={`p-2 rounded-full shrink-0 ${c.hoverSoft} ${c.faint}`}><X size={18} /></button>
      </div>
      {/* .guide-compact folds the guide's viewport-based grids to one column. */}
      <div className="guide-compact overflow-y-auto p-5">
        <p className={`text-sm mb-6 ${c.sub}`}>{t(guide.sub)}</p>
        <Body compact />
      </div>
    </div>
  );
}

// The animating shell around GuidePanel: opening it widens the <aside> from 0,
// and the sibling content (flex-1) reflows in sync so the question/workshop
// slides left as the guide slides in. Shared by the quiz and workshop views.
function GuideAside({ section, open, onClose }) {
  return (
    <aside
      aria-hidden={!open}
      className={`shrink-0 overflow-hidden transition-[width,opacity] duration-500 ease-in-out ${open ? "w-[min(440px,85vw)] opacity-100" : "w-0 opacity-0"}`}
    >
      <div className="w-[min(440px,85vw)]">
        <GuidePanel section={section} onClose={onClose} />
      </div>
    </aside>
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
  const [guideOpen, setGuideOpen] = useState(false); // épreuve guide popup on the open-quiz view
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
  useEffect(() => { window.scrollTo({ top: 0 }); setGuideOpen(false); }, [quiz, review]);

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
    const hasGuide = !!GUIDE_PANELS[quiz.section];
    return (
      <PageShell wide eyebrow={t(SECTION_LABELS[quiz.section])} title={t(quiz.title)} sub={`${quiz.questions.length} ${t("questions · conditions d'examen : la correction complète est révélée à la fin, avec votre score.")}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <button onClick={closeQuiz} className="text-sm font-semibold text-blue-600 flex items-center gap-1"><ChevronLeft size={15} /> {t("Tous les quiz")}</button>
          {hasGuide && (
            <Btn small variant={guideOpen ? "soft" : "ghost"} icon={BookOpen} onClick={() => setGuideOpen((o) => !o)}>{t("Guide de l'épreuve")}</Btn>
          )}
        </div>
        {/* Opening the guide animates the <aside> width from 0; the quiz column
            (flex-1) reflows in sync each frame, so the question slides left as
            the panel slides in — no separate transition needed on the quiz. */}
        <div className="flex items-start gap-6">
          <div className="flex-1 min-w-0">
            <div className="max-w-3xl mx-auto">
              <Quiz
                key={quiz.id}
                questions={quiz.questions}
                duration={quiz.questions.length * 55}
                storageKey={`bank-${quiz.id}`}
                deferResults
                renderAbove={(q) => <BankQuestionMedia question={q} />}
                doneExtra={<Btn variant="ghost" onClick={closeQuiz}>{t("Choisir un autre quiz")}</Btn>}
              />
            </div>
          </div>
          {hasGuide && <GuideAside section={quiz.section} open={guideOpen} onClose={() => setGuideOpen(false)} />}
        </div>
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
            <button key={s} onClick={() => { setSection(s); setGuideOpen(false); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors ${section === s ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
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
        freeTier ? <PremiumSectionGate /> : (
          // Provider shares the selected tâche between the workshop and the
          // guide panel, so switching task on either side updates the other.
          <ExpressionTaskProvider>
            {GUIDE_PANELS[section] && (
              <div className="flex justify-end mb-4">
                <Btn small variant={guideOpen ? "soft" : "ghost"} icon={BookOpen} onClick={() => setGuideOpen((o) => !o)}>{t("Guide de l'épreuve")}</Btn>
              </div>
            )}
            <div className="flex items-start gap-6">
              <div className="flex-1 min-w-0">{workshop}</div>
              {GUIDE_PANELS[section] && <GuideAside section={section} open={guideOpen} onClose={() => setGuideOpen(false)} />}
            </div>
          </ExpressionTaskProvider>
        )
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
