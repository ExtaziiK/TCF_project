import { useEffect, useState } from "react";
import { ChevronLeft, Play, FolderOpen, Clock, Trophy, RotateCcw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn, ProgressBar } from "@/components/common";
import { Quiz } from "@/components/quiz";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { getBank } from "@/services/bankService";
import { SECTION_LABELS } from "@/utils/bankAdapter";
import { listQuizResults, bestScoresByKey } from "@/services/quizResultsService";

function QuizCard({ quiz, number, onOpen, best }) {
  const { c } = useApp();
  const minutes = Math.max(1, Math.round((quiz.questions.length * 55) / 60));
  return (
    <button onClick={onOpen} className="text-left">
      <Card lift className="p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <Pill tone="blue">{SECTION_LABELS[quiz.section]}</Pill>
          <Pill tone="slate">{quiz.questions.length} questions</Pill>
          <Pill tone="slate"><Clock size={11} /> ≈ {minutes} min</Pill>
        </div>
        <h3 className={`font-display font-bold text-lg leading-snug ${c.text}`}>Quizz {number}</h3>
        <div className="flex-1 mt-3">
          {best ? (
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className={`flex items-center gap-1 ${best.pct >= 65 ? "text-emerald-600" : "text-amber-600"}`}><Trophy size={12} /> Meilleur score : {best.pct} %</span>
                <span className={c.faint}>{best.ok} / {best.total}</span>
              </div>
              <ProgressBar pct={best.pct} tone={best.pct >= 65 ? "grad" : "blue"} />
            </div>
          ) : (
            <p className={`text-xs font-semibold ${c.faint}`}>Jamais tenté — lancez-vous !</p>
          )}
        </div>
        <p className="mt-4 text-sm font-semibold text-blue-600 flex items-center gap-1.5">
          {best ? <><RotateCcw size={14} /> Refaire ce quiz</> : <><Play size={14} /> Commencer ce quiz</>}
        </p>
      </Card>
    </button>
  );
}

// Quiz browser over the question bank. The admin "Banque de questions" page
// shows every section; the premium module pages reuse it locked to a single
// section, so the same data and quiz engine serve both without duplication.
export function BankExplorer({ sections = ["co", "ce", "ee", "eo"], eyebrow, title, sub, back }) {
  const { c, user } = useApp();
  const bank = getBank();
  const [section, setSection] = useState(sections[0]);
  const [quiz, setQuiz] = useState(null);
  const [bestScores, setBestScores] = useState({});

  const reloadScores = () => {
    listQuizResults(user?.id).then(({ results }) => setBestScores(bestScoresByKey(results)));
  };
  useEffect(reloadScores, [user?.id]);

  const closeQuiz = () => { setQuiz(null); reloadScores(); };

  if (quiz) {
    return (
      <PageShell eyebrow={SECTION_LABELS[quiz.section]} title={quiz.title} sub={`${quiz.questions.length} questions · conditions d'examen : la correction complète est révélée à la fin, avec votre score.`}>
        <button onClick={closeQuiz} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-8"><ChevronLeft size={15} /> Tous les quiz</button>
        <Quiz
          key={quiz.id}
          questions={quiz.questions}
          duration={quiz.questions.length * 55}
          storageKey={`bank-${quiz.id}`}
          deferResults
          renderAbove={(q, idx) => <BankQuestionMedia key={q.id ?? idx} question={q} />}
          doneExtra={<Btn variant="ghost" onClick={closeQuiz}>Choisir un autre quiz</Btn>}
        />
      </PageShell>
    );
  }

  const quizzes = bank[section];
  return (
    <PageShell wide eyebrow={eyebrow} title={title} sub={sub} back={back}>
      {sections.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-8">
          {sections.map((s) => (
            <button key={s} onClick={() => setSection(s)} className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors ${section === s ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
              {SECTION_LABELS[s]}
              <span className={`text-xs font-mono2 ${section === s ? "opacity-80" : c.faint}`}>{bank[s].length}</span>
            </button>
          ))}
        </div>
      )}
      {quizzes.length === 0 ? (
        <Card className="p-10 text-center">
          <FolderOpen size={32} className="text-blue-600 mx-auto mb-4" />
          <p className={`font-display font-bold ${c.text}`}>Aucun quiz dans cette épreuve pour l'instant</p>
          <p className={`mt-2 text-sm ${c.sub}`}>De nouveaux quiz sont ajoutés régulièrement — revenez bientôt.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map((qz, idx) => <QuizCard key={qz.id} quiz={qz} number={idx + 1} onOpen={() => setQuiz(qz)} best={bestScores[`bank-${qz.id}`]} />)}
        </div>
      )}
    </PageShell>
  );
}
