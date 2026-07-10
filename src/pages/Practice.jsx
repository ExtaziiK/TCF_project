import { useState } from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { Quiz } from "@/components/quiz";
import { BankQuestionMedia } from "@/components/bank/BankQuestionMedia";
import { FEATURES } from "@/constants/home";
import { getBank } from "@/services/bankService";
import { SECTION_LABELS } from "@/utils/bankAdapter";

// Only these modules are backed by the real question bank (co/ce/ee/eo);
// vocabulaire and grammaire are lesson-based, not quiz-based.
const ROUTE_SECTION = { listening: "co", reading: "ce", writing: "ee", speaking: "eo" };

export function Practice() {
  const { c, nav, t } = useApp();
  const bank = getBank();
  const [openQuiz, setOpenQuiz] = useState(null);

  if (openQuiz) {
    return (
      <PageShell eyebrow={t(SECTION_LABELS[openQuiz.section])} title={openQuiz.title} sub={`${openQuiz.questions.length} ${t("questions · conditions d'examen : la correction complète est révélée à la fin, avec votre score.")}`}>
        <button onClick={() => setOpenQuiz(null)} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-8"><ChevronLeft size={15} /> {t("Retour à la pratique gratuite")}</button>
        <Quiz
          key={openQuiz.id}
          questions={openQuiz.questions}
          duration={openQuiz.questions.length * 55}
          storageKey={`bank-${openQuiz.id}`}
          deferResults
          renderAbove={(q, idx) => <BankQuestionMedia key={q.id ?? idx} question={q} />}
          doneExtra={<Btn variant="ghost" onClick={() => setOpenQuiz(null)}>{t("Choisir un autre module")}</Btn>}
        />
      </PageShell>
    );
  }

  return (
    <PageShell back wide eyebrow={t("Pratique gratuite")} title={t("Essayez chaque module, sans compte ni carte")} sub={t("10 questions gratuites par jour et par module. Créez un compte pour sauvegarder votre progression.")}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((f) => {
          const section = ROUTE_SECTION[f.route];
          const firstQuiz = section ? bank[section].find((q) => q.kind !== "prompt") || null : null;
          return (
            <button key={f.t} onClick={() => (firstQuiz ? setOpenQuiz(firstQuiz) : nav(f.route))} className="text-left">
              <Card lift className="p-6 h-full">
                <div className="flex items-start justify-between">
                  <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center shadow-lg shadow-blue-600/25"><f.icon size={22} /></span>
                  <Pill tone="green">{t("Gratuit")}</Pill>
                </div>
                <h3 className={`font-display font-bold text-lg mt-5 ${c.text}`}>{t(f.t)}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${c.sub}`}>{t(f.d)}</p>
                <p className="mt-4 text-sm font-semibold text-blue-600 flex items-center gap-1">
                  {t("Essayer maintenant")} <ArrowRight size={14} />
                </p>
              </Card>
            </button>
          );
        })}
      </div>
      <Card className="mt-8 p-6 text-center border-2 border-blue-600/40">
        <p className={`font-display font-bold text-lg ${c.text}`}>{t("Envie de tout débloquer ?")}</p>
        <p className={`text-sm mt-1 ${c.sub}`}>{t("Questions illimitées, examens blancs complets et analyse IA dès 19 $ / mois.")}</p>
        <div className="mt-4 flex justify-center gap-3"><Btn small variant="accent" onClick={() => nav("pricing")}>{t("Voir les forfaits")}</Btn></div>
      </Card>
    </PageShell>
  );
}
