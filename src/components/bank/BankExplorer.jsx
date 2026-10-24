import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Play, FolderOpen, ArrowRight, Lock, Check, Eye, RotateCcw, BookOpen, X, Wrench, Headphones, PenLine, Mic } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, BankLoading } from "@/components/common";
import { Quiz } from "@/components/quiz";
import { QuizReport } from "@/components/quiz/QuizReport";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { CO_GUIDE_PANEL, CE_GUIDE_PANEL } from "@/pages/GuideComprehension";
import { EE_GUIDE_PANEL } from "@/pages/GuideExpressionEcrite";
import { EO_GUIDE_PANEL } from "@/pages/GuideExpressionOrale";
import { loadQuiz } from "@/services/bankService";
import { useBankSummary } from "@/hooks/useBank";
import { SECTION_LABELS, quizDurationSec } from "@/utils/bankAdapter";
import { ExpressionTaskProvider } from "@/context/ExpressionTaskContext";
import { listQuizResults, bestScoresByKey, reviewableAttemptsByKey } from "@/services/quizResultsService";
import { useSignedQuestions } from "@/hooks/useSignedQuestions";
import { ROLES, isStaff } from "@/auth/rbac";
import { isUnderReview } from "@/constants/quizReview";
import { takeOpenQuizRequest } from "@/utils/openQuizRequest";
import { TOUR_STEPS } from "@/constants/tour";
import { PALETTE, toolTone } from "@/components/home/toolsData";

const isPrompt = (quiz) => quiz.kind === "prompt";

// Each épreuve's look in the hub — icon, colour (the landing page's tool
// colours), and its official format for the tile.
const EPREUVE = {
  co: { icon: Headphones, tone: "blue", n: 39, mins: 35 },
  ce: { icon: BookOpen, tone: "rose", n: 39, mins: 60 },
  ee: { icon: PenLine, tone: "violet", tasks: "3 tâches · 60 min" },
  eo: { icon: Mic, tone: "amber", tasks: "3 tâches · 12 min" },
};
// { fill, bg, ink, soft, panel, edge }: `fill` is the saturated colour of a
// selected tile (white text on it, in both themes); the rest follow the theme.
function epreuveColors(section, dark) {
  const tone = EPREUVE[section]?.tone || "blue";
  const [bg, ink, soft] = PALETTE[tone][dark ? "dark" : "light"];
  return { ...toolTone(tone, dark), bg, ink, soft };
}

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
//
// `review` = the quiz is pulled for correction (constants/quizReview.js).
// Members get a greyed card whose hover/focus says why it is closed; staff
// keep the normal card, marked so they know members cannot see it.
function QuizCard({ quiz, number, onOpen, onReview, best, reviewAttempt, locked, review, staff }) {
  const { c, t, dark } = useApp();
  const accent = epreuveColors(quiz.section, dark);
  const prompt = isPrompt(quiz);
  const count = quiz.count;
  // A member's past score on a quiz under review was graded against the wrong
  // answers, so it is not shown as a result; the card only says it is closed.
  const closed = review && !staff;
  const done = !prompt && !!best && !closed;
  const answered = best?.answered ?? best?.total;
  const partial = done && !!best.total && answered < best.total;
  const canReview = !!reviewAttempt;
  const minutes = Math.max(1, Math.round(quizDurationSec(quiz.section, count) / 60));

  const badge = closed ? (
    <span className="w-7 h-7 rounded-full bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0"><Wrench size={13} /></span>
  ) : locked ? (
    <span className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0"><Lock size={14} /></span>
  ) : partial ? (
    <span className="w-7 h-7 rounded-full bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0"><Check size={16} /></span>
  ) : done ? (
    <span className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0"><Check size={16} /></span>
  ) : (
    <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: accent.soft, color: accent.ink }}><Play size={14} className="ml-0.5" /></span>
  );

  return (
    <div className="group relative h-full">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
        aria-label={prompt ? t(quiz.title) : `${t("Quizz")} ${number}${closed ? ` — ${t("En révision")}` : ""}`}
        aria-describedby={review ? `review-note-${quiz.id}` : undefined}
        className="text-left w-full h-full block cursor-pointer"
      >
        <Card lift={!locked && !closed} className={`p-3.5 h-full flex gap-2.5 ${partial ? "!bg-orange-500/10 !border-orange-500/40" : done ? "!bg-emerald-500/10 !border-emerald-500/40" : ""} ${locked || closed ? "opacity-60" : ""} ${review && staff ? "!border-orange-500/50 border-dashed" : ""}`}>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-display font-bold text-sm leading-snug ${locked || closed ? c.sub : c.text}`}>
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
              {closed ? (
                <span className="text-orange-600">{t("En révision")}</span>
              ) : review && staff && !done ? (
                <span className="text-orange-600">{t("Masqué aux membres")}</span>
              ) : done ? (
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
      {/* Why the quiz is closed (members) or hidden (staff), on hover/focus.
          A bubble above the card rather than an overlay, so it never covers
          the staff card's own result actions. */}
      {review && (
        <div id={`review-note-${quiz.id}`} role="tooltip"
          className="absolute z-20 left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 rounded-xl bg-slate-900 text-white text-[11px] leading-snug font-medium px-3 py-2 shadow-xl
            opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {closed
            ? t("Ce quiz est en cours de révision par notre équipe. Il sera de nouveau disponible très bientôt.")
            : t("En révision : masqué aux membres, visible uniquement par l'équipe.")}
        </div>
      )}
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
      // Closed, it collapses in height too: a zero-width aside still had its
      // content's full height and stretched the row, leaving a tall blank.
      className={`shrink-0 overflow-hidden transition-[width,opacity] duration-500 ease-in-out ${open ? "w-[min(440px,85vw)] opacity-100" : "w-0 h-0 opacity-0"}`}
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
//
// The grid is drawn from the bank's summary (no download); a quiz's questions
// are fetched when it is opened — `opening` holds its card meanwhile.
export function BankExplorer({ sections = ["co", "ce", "ee", "eo"], eyebrow, title, sub, back, workshops, initialSection }) {
  const { c, user, role, nav, notify, t, tourStep, dark } = useApp();
  const bank = useBankSummary();
  const [section, setSection] = useState(sections.includes(initialSection) ? initialSection : sections[0]);
  const [quiz, setQuiz] = useState(null);
  const [opening, setOpening] = useState(null); // summary of the quiz being downloaded
  const openSeq = useRef(0); // only the latest open wins if two are in flight
  const [review, setReview] = useState(null); // { quiz, attempt } — reopened past attempt, read-only

  // Downloads a quiz, then opens it (or, with `attempt`, its past correction).
  const openQuiz = (summary, attempt) => {
    const seq = ++openSeq.current;
    setOpening(summary);
    loadQuiz(summary.id).then(
      (full) => {
        if (seq !== openSeq.current) return;
        setOpening(null);
        if (!full) return;
        if (attempt) setReview({ quiz: full, attempt });
        else setQuiz(full);
      },
      () => {
        if (seq !== openSeq.current) return;
        setOpening(null);
        notify(t("Impossible de charger ce quiz. Vérifiez votre connexion et réessayez."), "error");
      }
    );
  };
  // The guided tour walks through each épreuve in turn (constants/tour.js:
  // `section` on the co/ce/eo/ee steps) and needs to switch this component's
  // own tab state to match, the same way it force-opens Nav's "Pratique"
  // dropdown — there is no external control for `section` otherwise. For
  // CO/CE it also opens quiz 1 (`openQuiz`), so the step can explain the
  // real answer/navigation controls instead of just pointing at a closed
  // card — a genuine, freely-retakeable practice quiz, not a metered
  // attempt, so opening it for the tour costs the candidate nothing.
  useEffect(() => {
    if (tourStep == null) return;
    const step = TOUR_STEPS[tourStep];
    if (!step?.section || !sections.includes(step.section)) return;
    setSection(step.section);
    if (step.openQuiz) {
      const qz = bank[step.section]?.[0];
      if (qz) openQuiz(qz);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep]);
  const [guideOpen, setGuideOpen] = useState(false); // épreuve guide popup on the open-quiz view
  const [bestScores, setBestScores] = useState({});
  const [reviewableAttempts, setReviewableAttempts] = useState({});

  // Free tier: only the first quiz of each épreuve is playable — the rest are
  // locked and route to the upgrade page. Premium/admin never hit this.
  const freeTier = role === ROLES.FREE_USER;
  const goUpgrade = () => { notify(t("Ce quiz fait partie de l'abonnement Premium.")); nav("pricing"); };
  const staff = isStaff(role);

  // Arriving with a quiz to open (« Refaire ce quiz » in the carnet): switch to
  // its épreuve and open it — through the same locks as a click on its card,
  // so a locked or under-review quiz just shows its épreuve's grid.
  useEffect(() => {
    const id = takeOpenQuizRequest();
    if (!id) return;
    for (const s of sections) {
      const idx = (bank[s] || []).findIndex((qz) => String(qz.id) === id);
      if (idx < 0) continue;
      const qz = bank[s][idx];
      setSection(s);
      if ((isUnderReview(qz) && !staff) || (freeTier && idx > 0)) return;
      openQuiz(qz);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadScores = () => {
    listQuizResults(user?.id).then(({ results }) => {
      setBestScores(bestScoresByKey(results));
      setReviewableAttempts(reviewableAttemptsByKey(results));
    });
  };
  useEffect(reloadScores, [user?.id]);

  const closeQuiz = () => { openSeq.current++; setOpening(null); setQuiz(null); reloadScores(); };

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

  if (opening) {
    // Same shell as the open quiz, so the page doesn't jump when it arrives.
    // Tagged like it too: the tour's CO/CE steps open quiz 1 and point here.
    return (
      <PageShell wide eyebrow={t(SECTION_LABELS[opening.section])} title={t(opening.title)}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <button onClick={closeQuiz} className="text-sm font-semibold text-blue-600 flex items-center gap-1"><ChevronLeft size={15} /> {t("Tous les quiz")}</button>
        </div>
        <BankLoading className="max-w-3xl xl:max-w-[62rem] mx-auto" data-tour={`bank-${opening.section}`} />
      </PageShell>
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
            {/* Tagged for the tour's CO/CE steps, which open this quiz for
                real rather than just pointing at its closed card — see
                `openQuiz` in constants/tour.js. */}
            <div className="max-w-3xl xl:max-w-[62rem] mx-auto" data-tour={`bank-${quiz.section}`}>
              <Quiz
                key={quiz.id}
                questions={quiz.questions}
                duration={quizDurationSec(quiz.section, quiz.questions.length)}
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
  // The multi-épreuve hub (tiles + tinted panel); single-section pages keep
  // the plain grid.
  const hub = sections.length > 1;
  const tone = epreuveColors(section, dark);

  return (
    <PageShell wide eyebrow={t(eyebrow)} title={t(title)} sub={t(sub)} back={back}>
      {/* The épreuve picker: four tiles, one colour each. Backgrounds stay
          neutral — the colour is in the outlines: the selected tile is
          outlined in full colour, lifted and checked, and points down at the
          panel below, outlined the same way — so it is always obvious which
          épreuve the quizzes belong to. */}
      {hub && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {sections.map((s) => {
            const e = EPREUVE[s];
            const k = epreuveColors(s, dark);
            const on = section === s;
            const meta = e.tasks ? t(e.tasks) : `${t("39 questions")} · ${e.mins} min`;
            return (
              <button key={s} data-tour={`bank-${s}`} aria-pressed={on}
                onClick={() => { setSection(s); setGuideOpen(false); }}
                className={`relative text-left rounded-3xl p-4 md:p-5 border-2 transition duration-300 ${c.card} ${on ? "-translate-y-1 shadow-xl" : "hover:-translate-y-0.5 hover:shadow-md"}`}
                style={on ? { borderColor: k.fill, boxShadow: `0 18px 36px -14px ${k.fill}66` } : { borderColor: `${k.ink}33` }}>
                <span className="flex items-start justify-between gap-2">
                  <span className="grid place-items-center w-11 h-11 rounded-2xl" style={{ background: k.soft, color: k.ink }}>
                    <e.icon size={21} />
                  </span>
                  {on && <span className="grid place-items-center w-6 h-6 rounded-full text-white" style={{ background: k.fill }}><Check size={14} strokeWidth={3} /></span>}
                </span>
                <span className={`mt-3 block font-display font-extrabold text-base md:text-lg leading-tight ${c.text}`}>{t(SECTION_LABELS[s])}</span>
                <span className={`mt-1 block text-xs font-semibold ${c.faint}`}>{meta}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: k.soft, color: k.ink }}>
                  {workshops?.[s] ? t("Correction par IA") : `${bank[s].length} ${t("Quizz")}`}
                </span>
                {/* Pointer into the panel (one row of tiles only, from lg): centred on
                    the panel's top edge — 20px gap + the tile's 4px lift. */}
                {on && <span aria-hidden="true" className={`hidden lg:block absolute left-1/2 -translate-x-1/2 w-5 h-5 rotate-45 border-l-2 border-t-2 ${c.bg}`}
                  style={{ bottom: -35, borderColor: k.fill }} />}
              </button>
            );
          })}
        </div>
      )}
      <div className={hub ? "rounded-[28px] border-2 p-3 sm:p-5 md:p-6 transition-colors duration-300" : undefined}
        style={hub ? { borderColor: tone.fill, "--tool-fill": tone.fill } : undefined}>
      {freeTier && !showWorkshop && quizzes.length > 0 && (
        <Card className="p-4 mb-6 flex items-center gap-3 border-blue-600/30">
          <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Lock size={16} /></span>
          <p className={`text-sm ${c.sub}`}>{t("Offre gratuite : le premier quiz de chaque épreuve est ouvert. Passez au Premium pour débloquer tous les autres.")}</p>
          <Btn small variant="accent" className="ml-auto shrink-0" onClick={() => nav("pricing")}>{t("Débloquer")}</Btn>
        </Card>
      )}
      {showWorkshop ? (
        // Open to free accounts too: they get one fixed subject with two AI
        // analyses per tâche, and the workshop body explains that itself
        // (FreeExpressionNotice). Premium is what lifts the rotation and the cap.
        //
        // Provider shares the selected tâche between the workshop and the
        // guide panel, so switching task on either side updates the other.
        <ExpressionTaskProvider>
          {GUIDE_PANELS[section] && (
            <div className="flex justify-end mb-4">
              <Btn small variant={guideOpen ? "soft" : "ghost"} icon={BookOpen} onClick={() => setGuideOpen((o) => !o)}>{t("Guide de l'épreuve")}</Btn>
            </div>
          )}
          <div className="flex items-start gap-6">
            <div className="flex-1 min-w-0" data-tour={`bank-${section}`}>{workshop}</div>
            {GUIDE_PANELS[section] && <GuideAside section={section} open={guideOpen} onClose={() => setGuideOpen(false)} />}
          </div>
        </ExpressionTaskProvider>
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
            const review = isUnderReview(qz);
            const best = bestScores[`bank-${qz.id}`];
            const reviewAttempt = reviewableAttempts[`bank-${qz.id}`];
            const cardProps = {
              quiz: qz, number: idx + 1, locked, best, reviewAttempt, review, staff,
              // Under review beats the Premium lock: sending a free member to
              // the pricing page for a quiz no one can open would be a lie.
              onOpen: () => (review && !staff
                ? notify(t("Ce quiz est en cours de révision par notre équipe. Il sera de nouveau disponible très bientôt."))
                : locked ? goUpgrade() : openQuiz(qz)),
              onReview: () => openQuiz(qz, reviewAttempt),
            };
            // The tour spotlights the first quiz of whichever épreuve is
            // active — it's the one card that's always genuinely playable,
            // even on the free tier. Only this one tile gets the extra
            // wrapper (h-full so it still stretches like a normal grid
            // item), so every other card's DOM is exactly what it was.
            return idx === 0 ? (
              <div key={qz.id} data-tour={`bank-${section}`} className="h-full"><QuizCard {...cardProps} /></div>
            ) : (
              <QuizCard key={qz.id} {...cardProps} />
            );
          })}
        </div>
      )}
      </div>
    </PageShell>
  );
}
