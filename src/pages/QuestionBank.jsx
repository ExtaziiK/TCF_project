import { useState } from "react";
import { ChevronLeft, Play, FolderOpen } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { Quiz } from "@/components/quiz";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { getBank } from "@/services/bankService";
import { SECTION_LABELS } from "@/utils/bankAdapter";

const SECTIONS = ["co", "ce", "ee", "eo"];

function QuizCard({ quiz, number, onOpen }) {
  const { c } = useApp();
  return (
    <button onClick={onOpen} className="text-left">
      <Card lift className="p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <Pill tone="blue">{SECTION_LABELS[quiz.section]}</Pill>
          <Pill tone="slate">{quiz.questions.length} questions</Pill>
        </div>
        <h3 className={`font-display font-bold text-lg leading-snug flex-1 ${c.text}`}>Quizz {number}</h3>
        <p className="mt-4 text-sm font-semibold text-blue-600 flex items-center gap-1.5"><Play size={14} /> Commencer ce quiz</p>
      </Card>
    </button>
  );
}

export function QuestionBank() {
  const { c } = useApp();
  const bank = getBank();
  const [section, setSection] = useState("co");
  const [quiz, setQuiz] = useState(null);

  if (quiz) {
    return (
      <PageShell eyebrow={SECTION_LABELS[quiz.section]} title={quiz.title} sub={`${quiz.questions.length} questions · conditions d'examen : la correction complète est révélée à la fin, avec votre score.`}>
        <button onClick={() => setQuiz(null)} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-8"><ChevronLeft size={15} /> Tous les quiz</button>
        <Quiz
          key={quiz.id}
          questions={quiz.questions}
          duration={quiz.questions.length * 55}
          storageKey={`bank-${quiz.id}`}
          deferResults
          renderAbove={(q, idx) => <BankQuestionMedia key={q.id ?? idx} question={q} />}
          doneExtra={<Btn variant="ghost" onClick={() => setQuiz(null)}>Choisir un autre quiz</Btn>}
        />
      </PageShell>
    );
  }

  const quizzes = bank[section];
  return (
    <PageShell wide eyebrow="Banque de questions" title="Tous vos quiz, classés par épreuve" sub="Les quiz sont chargés automatiquement depuis les dossiers de la banque : déposez un fichier JSON dans le dossier d'une épreuve et il apparaît ici.">
      <div className="flex gap-2 flex-wrap mb-8">
        {SECTIONS.map((s) => (
          <button key={s} onClick={() => setSection(s)} className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors ${section === s ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            {SECTION_LABELS[s]}
            <span className={`text-xs font-mono2 ${section === s ? "opacity-80" : c.faint}`}>{bank[s].length}</span>
          </button>
        ))}
      </div>
      {quizzes.length === 0 ? (
        <Card className="p-10 text-center">
          <FolderOpen size={32} className="text-blue-600 mx-auto mb-4" />
          <p className={`font-display font-bold ${c.text}`}>Aucun quiz dans cette épreuve pour l'instant</p>
          <p className={`mt-2 text-sm ${c.sub}`}>Déposez vos fichiers JSON dans <span className="font-mono2">src/bank/{section}/</span> et ils apparaîtront ici automatiquement.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map((qz, idx) => <QuizCard key={qz.id} quiz={qz} number={idx + 1} onOpen={() => setQuiz(qz)} />)}
        </div>
      )}
    </PageShell>
  );
}
