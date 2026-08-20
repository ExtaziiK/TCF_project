import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, BookOpen, PenLine, ArrowRight, Zap, Table2, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { ConjugationExercise } from "@/components/conjugation/ConjugationExercise";
import { ConjugationQuiz, ModeToggle } from "@/components/conjugation/ConjugationQuiz";
import { ConjugationTable, IrregularList } from "@/components/conjugation/ConjugationTable";
import { ConjugationQuotaWall, QuotaMeter } from "@/components/conjugation/ConjugationQuotaWall";
import { useConjugationQuota } from "@/hooks/useConjugationQuota";
import { CONJUGATION_TENSES } from "@/constants/conjugation";

// Warm-up exercises shown on the tense page before the scored session is
// offered — same ramp as Grammaire: read the rule, try a few, then play.
const PREVIEW_EXERCISES = 3;

const LEVEL_TONE = { A1: "green", A2: "green", B1: "blue", B2: "amber", C1: "red" };

export function Conjugation() {
  const { c, t, role, user, notify } = useApp();
  const [tenseId, setTenseId] = useState(null);
  const [mode, setMode] = useState("lessons"); // index: "lessons" | "quiz"
  const [tenseMode, setTenseMode] = useState("practice"); // per-tense: "practice" | "quiz"
  // Écrire / Choisir, remembered across tenses and across both practice modes:
  // a candidate who has chosen to type should not be handed a multiple choice
  // again on the next lesson.
  const [answerMode, setAnswerMode] = useState("write");

  // The free tier's ten minutes a day. Premium, admin and owner get
  // `metered: false` and never see a meter, a warning or a wall.
  const quota = useConjugationQuota(role, user?.id);

  // Whether a scored set is live right now. The paywall is only ever raised at
  // a boundary — this is what tells the page it is not standing at one.
  const [sessionOpen, setSessionOpen] = useState(false);
  const openSession = useCallback(() => setSessionOpen(true), []);
  // Leaving the exercises, switching tense or switching mode all end the set,
  // so the next render is a boundary again.
  const closeSession = () => setSessionOpen(false);

  // Practice is withheld only when the budget is spent AND no set is running.
  // `ready` keeps a not-yet-loaded zero from flashing a wall at somebody who
  // still has nine minutes.
  const practiceLocked = quota.metered && quota.ready && quota.exhausted && !sessionOpen;

  // One warning, the first time the last five minutes are crossed. Destructured
  // so this depends on a boolean and a stable callback rather than on the whole
  // quota object, which changes identity every second as the clock ticks.
  const { shouldWarn, markWarned } = quota;
  useEffect(() => {
    if (!shouldWarn) return;
    notify(t("Il vous reste 5 minutes de conjugaison aujourd'hui."));
    markWarned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldWarn, markWarned]);

  const tense = CONJUGATION_TENSES.find((x) => x.id === tenseId);
  const openTense = (id) => { setTenseId(id); setTenseMode("practice"); closeSession(); };

  if (tense) {
    const inQuiz = tenseMode === "quiz";
    return (
      <PageShell eyebrow={t("Conjugaison")} title={t(tense.t)} sub={t(tense.d)}>
        <button onClick={() => setTenseId(null)} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-8">
          <ChevronLeft size={15} /> {t("Tous les temps")}
        </button>

        <div className="grid lg:grid-cols-2 gap-5 items-start">
          {/* ------------------------------ la leçon ------------------------------ */}
          <div className="space-y-5">
            <Card className="p-7">
              <h3 className={`font-display font-bold mb-4 flex items-center gap-2 ${c.text}`}>
                <BookOpen size={18} className="text-blue-600" aria-hidden="true" /> {t("La leçon")}
              </h3>
              <div className={`mb-5 p-3 rounded-xl text-sm ${c.hoverSoft} ${c.sub}`}>
                <strong className={c.text}>{t("Quand l'utiliser ?")}</strong> {t(tense.use)}
              </div>
              <ul className="space-y-4">
                {tense.lesson.map((l, i) => (
                  <li key={i} className={`flex gap-3 text-sm leading-relaxed ${c.sub}`}>
                    <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 text-xs font-mono2 font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {l}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-7">
              <h3 className={`font-display font-bold mb-4 flex items-center gap-2 ${c.text}`}>
                <Table2 size={18} className="text-blue-600" aria-hidden="true" /> {t("Les tableaux")}
              </h3>
              <div className="space-y-4">
                {tense.tables.map((tb) => <ConjugationTable key={tb.verb + tb.note} table={tb} />)}
              </div>
            </Card>

            <Card className="p-7">
              <h3 className={`font-display font-bold mb-4 flex items-center gap-2 ${c.text}`}>
                <Sparkles size={18} className="text-amber-500" aria-hidden="true" /> {t("À mémoriser")}
              </h3>
              <IrregularList items={tense.irregulars} />
            </Card>
          </div>

          {/* ----------------------------- la pratique ---------------------------- */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className={`font-display font-bold flex items-center gap-2 ${c.text}`}>
                {inQuiz
                  ? <><Zap size={18} className="text-rose-600" aria-hidden="true" /> {t("Série notée")}</>
                  : <><PenLine size={18} className="text-rose-600" aria-hidden="true" /> {t("À vous de jouer")}</>}
              </h3>
              <div className="flex items-center gap-2">
                {quota.metered && quota.ready && !practiceLocked && <QuotaMeter left={quota.left} limit={quota.limit} />}
                {!practiceLocked && (
                  <button
                    onClick={() => { setTenseMode(inQuiz ? "practice" : "quiz"); closeSession(); }}
                    className={`px-3.5 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 ${inQuiz ? `border ${c.border} ${c.sub} ${c.hoverSoft}` : "bg-rose-600 text-white"}`}
                  >
                    {inQuiz ? <><PenLine size={14} /> {t("Exercices")}</> : <><Zap size={14} /> {t("Mode quiz")}</>}
                  </button>
                )}
              </div>
            </div>

            {practiceLocked ? (
              <ConjugationQuotaWall resetAt={quota.resetAt} />
            ) : inQuiz ? (
              <ConjugationQuiz
                tense={tense} mode={answerMode} onModeChange={setAnswerMode}
                blocked={quota.exhausted} resetAt={quota.resetAt} onSessionOpen={openSession}
              />
            ) : (
              <>
                <div className="flex justify-end">
                  <ModeToggle mode={answerMode} onChange={setAnswerMode} />
                </div>
                {tense.qs.slice(0, PREVIEW_EXERCISES).map((q) => (
                  // Keyed by mode too: switching Écrire ↔ Choisir resets the
                  // exercise instead of leaving a stale correction on screen.
                  <ConjugationExercise key={`${q.a}-${q.inf}-${answerMode}`} q={q} mode={answerMode} />
                ))}
                <button
                  onClick={() => setTenseMode("quiz")}
                  className={`w-full p-4 rounded-2xl border border-dashed text-sm font-semibold text-rose-600 flex items-center justify-center gap-2 ${c.border} ${c.hoverSoft}`}
                >
                  <Zap size={15} /> {t("S'entraîner sur ce temps en série notée")} <ArrowRight size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      back wide
      eyebrow={t("Conjugaison")}
      title={t("Un temps à la fois, jusqu'à ce qu'il soit acquis")}
      sub={t("Choisissez le temps que vous voulez travailler : la leçon d'abord, les exercices ensuite — à écrire ou à choisir.")}
    >
      <div className="flex justify-end items-center gap-2 mb-6">
        {quota.metered && quota.ready && !practiceLocked && <QuotaMeter left={quota.left} limit={quota.limit} />}
        <button
          onClick={() => { setMode(mode === "quiz" ? "lessons" : "quiz"); closeSession(); }}
          className={`px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 ${mode === "quiz" ? "bg-rose-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}
        >
          {mode === "quiz" ? <><BookOpen size={14} /> {t("Mode leçons")}</> : <><Zap size={14} /> {t("Mode quiz")}</>}
        </button>
      </div>

      {mode === "quiz" ? (
        <div className="max-w-xl mx-auto">
          {practiceLocked ? (
            <ConjugationQuotaWall resetAt={quota.resetAt} />
          ) : (
            <>
              <p className={`text-center text-sm mb-6 ${c.sub}`}>
                {t("Tous les temps mélangés, dix exercices par série. Chaque réponse est expliquée.")}
              </p>
              <ConjugationQuiz
                mode={answerMode} onModeChange={setAnswerMode}
                blocked={quota.exhausted} resetAt={quota.resetAt} onSessionOpen={openSession}
              />
            </>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-tour="conjugation-tenses">
          {CONJUGATION_TENSES.map((tp, i) => (
            <button key={tp.id} onClick={() => openTense(tp.id)} className="text-left">
              <Card lift className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 font-mono2 font-bold flex items-center justify-center">{String(i + 1).padStart(2, "0")}</span>
                  <Pill tone={LEVEL_TONE[tp.level] || "slate"}>{tp.level}</Pill>
                </div>
                <h3 className={`font-display font-bold text-lg mt-4 ${c.text}`}>{t(tp.t)}</h3>
                <p className={`mt-1.5 text-sm ${c.sub}`}>{t(tp.d)}</p>
                <div className={`mt-4 pt-4 border-t ${c.border} flex items-center justify-between gap-2`}>
                  <span className="text-sm font-semibold text-blue-600 flex items-center gap-1">{t("Ouvrir la leçon")} <ArrowRight size={14} /></span>
                  <span className={`text-xs font-mono2 ${c.faint}`}>{tp.qs.length} {t("exercices")}</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </PageShell>
  );
}
