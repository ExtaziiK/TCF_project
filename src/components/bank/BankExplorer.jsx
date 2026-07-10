import { useEffect, useState } from "react";
import { ChevronLeft, Play, FolderOpen, ArrowRight, Lock, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, ProgressBar } from "@/components/common";
import { Quiz } from "@/components/quiz";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { getBank } from "@/services/bankService";
import { SECTION_LABELS } from "@/utils/bankAdapter";
import { listQuizResults, bestScoresByKey } from "@/services/quizResultsService";
import { ROLES } from "@/auth/rbac";

const isPrompt = (quiz) => quiz.kind === "prompt";

// Compact quiz tile for the épreuves grid. The section is already shown by the
// tabs above the grid and the page header, so it's dropped here to keep the
// card small. The corner badge and colour encode state at a glance:
// emerald = completed, blue = ready to start, amber lock = Premium-only
// (free tier, everything past quiz 1 of each épreuve).
function QuizCard({ quiz, number, onOpen, best, locked }) {
  const { c, t } = useApp();
  const prompt = isPrompt(quiz);
  const count = quiz.questions.length;
  const done = !prompt && !!best;
  const minutes = Math.max(1, Math.round((count * 55) / 60));

  const badge = locked ? (
    <span className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0"><Lock size={14} /></span>
  ) : done ? (
    <span className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0"><Check size={16} /></span>
  ) : (
    <span className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Play size={14} className="ml-0.5" /></span>
  );

  return (
    <button onClick={onOpen} className="text-left w-full" aria-label={prompt ? t(quiz.title) : `${t("Quizz")} ${number}`}>
      <Card lift={!locked} className={`p-4 h-full flex flex-col gap-2.5 ${done ? "ring-1 ring-emerald-500/40" : ""} ${locked ? "opacity-60" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-display font-bold text-[15px] leading-snug ${locked ? c.sub : c.text}`}>
            {prompt ? t(quiz.title) : `${t("Quizz")} ${number}`}
          </h3>
          {badge}
        </div>
        <p className={`text-xs font-semibold ${c.faint}`}>
          {prompt
            ? `${count} ${t(count > 1 ? "consignes" : "consigne")}`
            : `${count} ${t("questions")} · ≈ ${minutes} min`}
        </p>
        {done ? (
          <div className="mt-auto pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
              <span className="text-emerald-600">{t("Terminé")}</span>
              <span className={c.faint}>{best.ok}/{best.total} · {best.pct} %</span>
            </div>
            <ProgressBar pct={best.pct} tone={best.pct >= 65 ? "grad" : "blue"} />
          </div>
        ) : locked ? (
          <p className="mt-auto pt-1 text-[11px] font-bold text-amber-600">{t("Réservé au Premium")}</p>
        ) : null}
      </Card>
    </button>
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
export function BankExplorer({ sections = ["co", "ce", "ee", "eo"], eyebrow, title, sub, back }) {
  const { c, user, role, nav, notify, t } = useApp();
  const bank = getBank();
  const [section, setSection] = useState(sections[0]);
  const [quiz, setQuiz] = useState(null);
  const [bestScores, setBestScores] = useState({});

  // Free tier: only the first quiz of each épreuve is playable — the rest are
  // locked and route to the upgrade page. Premium/admin never hit this.
  const freeTier = role === ROLES.FREE_USER;
  const goUpgrade = () => { notify(t("Ce quiz fait partie de l'abonnement Premium.")); nav("pricing"); };

  const reloadScores = () => {
    listQuizResults(user?.id).then(({ results }) => setBestScores(bestScoresByKey(results)));
  };
  useEffect(reloadScores, [user?.id]);

  const closeQuiz = () => { setQuiz(null); reloadScores(); };

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
          renderAbove={(q, idx) => <BankQuestionMedia key={q.id ?? idx} question={q} />}
          doneExtra={<Btn variant="ghost" onClick={closeQuiz}>{t("Choisir un autre quiz")}</Btn>}
        />
      </PageShell>
    );
  }

  const quizzes = bank[section];
  return (
    <PageShell wide eyebrow={t(eyebrow)} title={t(title)} sub={t(sub)} back={back}>
      {sections.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-8">
          {sections.map((s) => (
            <button key={s} onClick={() => setSection(s)} className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors ${section === s ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
              {t(SECTION_LABELS[s])}
              <span className={`text-xs font-mono2 ${section === s ? "opacity-80" : c.faint}`}>{bank[s].length}</span>
            </button>
          ))}
        </div>
      )}
      {freeTier && quizzes.length > 0 && (
        <Card className="p-4 mb-6 flex items-center gap-3 border-blue-600/30">
          <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Lock size={16} /></span>
          <p className={`text-sm ${c.sub}`}>{t("Offre gratuite : le premier quiz de chaque épreuve est ouvert. Passez au Premium pour débloquer tous les autres.")}</p>
          <Btn small variant="accent" className="ml-auto shrink-0" onClick={() => nav("pricing")}>{t("Débloquer")}</Btn>
        </Card>
      )}
      {quizzes.length === 0 ? (
        <Card className="p-10 text-center">
          <FolderOpen size={32} className="text-blue-600 mx-auto mb-4" />
          <p className={`font-display font-bold ${c.text}`}>{t("Aucun quiz dans cette épreuve pour l'instant")}</p>
          <p className={`mt-2 text-sm ${c.sub}`}>{t("De nouveaux quiz sont ajoutés régulièrement — revenez bientôt.")}</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quizzes.map((qz, idx) => {
            const locked = freeTier && idx > 0;
            return (
              <QuizCard
                key={qz.id}
                quiz={qz}
                number={idx + 1}
                locked={locked}
                best={bestScores[`bank-${qz.id}`]}
                onOpen={() => (locked ? goUpgrade() : setQuiz(qz))}
              />
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
