import { useState, useMemo, useEffect, useCallback } from "react";
import { Calendar, Zap, RotateCcw, Heart, Shuffle, ArrowRight, BookOpen, BookmarkPlus, BookmarkCheck, Target, Link2, Brain } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { TOUR_STEPS } from "@/constants/tour";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { VOCAB, VOCAB_CATS } from "@/constants/vocabulary";
import { MOT_PRECIS } from "@/constants/vocab/motPrecis";
import { CONNECTEURS, RELATIONS } from "@/constants/vocab/connecteurs";
import { ChoiceExercise } from "@/components/vocab/ChoiceExercise";
import { MyDeck } from "@/components/vocab/MyDeck";
import { useVocabDeck } from "@/hooks/useVocabDeck";

// CEFR level → Pill tone. A1–A2 (beginner) green, B1–B2 (intermediate) blue,
// C1 (advanced) red, C2 (mastery) gold — mirrors the brand's difficulty ramp.
const LEVEL_TONE = { A1: "green", A2: "green", B1: "blue", B2: "blue", C1: "red", C2: "gold" };

const rnd = (n) => Math.floor(Math.random() * n);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
// A random word from the pool, never the same one twice in a row.
const pickWord = (pool, exclude) => {
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0];
  let w;
  do { w = pool[rnd(pool.length)]; } while (exclude && w.fr === exclude.fr);
  return w;
};
// A quiz round: the answer word + 3 distractor words drawn from the same pool.
const makeQuiz = (pool) => {
  const word = pickWord(pool);
  if (!word) return null;
  const distractors = shuffle(pool.filter((w) => w.fr !== word.fr)).slice(0, 3).map((w) => w.fr);
  return { word, options: shuffle([word.fr, ...distractors]) };
};

// The page's four sections. « Les mots » is the original deck of themed words;
// the two exercises train what the Expression grids score — the precise word
// (lexique) and the right connector (cohérence); « Mon lexique » is the
// learner's own deck, reviewed with spaced repetition.
const SECTIONS = [
  { id: "mots", label: "Les mots", icon: BookOpen },
  { id: "precis", label: "Le mot précis", icon: Target },
  { id: "connecteurs", label: "Les connecteurs", icon: Link2 },
  { id: "lexique", label: "Mon lexique", icon: Brain },
];

export function Vocabulary() {
  const { c, favs, toggleFav, t, tourStep } = useApp();
  const deck = useVocabDeck();
  const [section, setSection] = useState("mots");
  const [cat, setCat] = useState("Tous");
  // Quiz first; the cards are the « Mode apprentissage ». The guided tour's
  // vocabulary step points at a card, so it switches to the cards while on it.
  const [mode, setMode] = useState("quiz");
  const touring = tourStep != null && TOUR_STEPS[tourStep]?.route === "vocabulary";
  useEffect(() => { if (touring) { setSection("mots"); setMode("cards"); } }, [touring]);

  const pool = useMemo(() => VOCAB.filter((v) => cat === "Tous" || v.cat === cat), [cat]);

  // One card at a time; `revealed` flips it to the definition side.
  const [card, setCard] = useState(() => pickWord(pool));
  const [revealed, setRevealed] = useState(false);
  const [quiz, setQuiz] = useState(() => makeQuiz(pool));
  const [qSel, setQSel] = useState(null);

  // Changing category (or clearing everything) reshuffles both modes.
  useEffect(() => {
    setCard(pickWord(pool));
    setRevealed(false);
    setQuiz(makeQuiz(pool));
    setQSel(null);
  }, [pool]);

  const nextCard = useCallback(() => {
    setCard((cur) => pickWord(pool, cur));
    setRevealed(false);
  }, [pool]);

  const nextQuiz = useCallback(() => {
    setQuiz(makeQuiz(pool));
    setQSel(null);
  }, [pool]);

  // A stable "word of the day": indexed by the day of the year so it holds for
  // the whole day but rotates through the bank over time.
  const daily = useMemo(() => {
    const now = new Date();
    const day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    return VOCAB[day % VOCAB.length];
  }, []);

  const tapCard = () => (revealed ? nextCard() : setRevealed(true));

  const motDuJour = (
    <Card className="p-4 border-2 border-rose-600/30 lg:w-80">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-8 h-8 rounded-xl bg-rose-600/10 text-rose-600 flex items-center justify-center shrink-0"><Calendar size={15} /></span>
        <p className="text-xs font-bold uppercase tracking-widest text-rose-600">{t("Mot du jour")}</p>
        <Pill tone={LEVEL_TONE[daily.level]} className="!px-2 !py-0.5 ml-auto">{daily.level}</Pill>
      </div>
      <p className={`font-display font-bold ${c.text}`}>{daily.fr}</p>
      <p className={`text-xs leading-relaxed ${c.sub}`}>{daily.def} — <span className="italic">« {daily.ex} »</span></p>
    </Card>
  );

  return (
    <PageShell tone="mint" icon={BookOpen} back wide aside={motDuJour} eyebrow={t("Vocabulaire")} title={t("Le lexique de votre nouvelle vie")} sub={t("Apprenez les mots, entraînez-vous à choisir le mot précis et le bon connecteur, et révisez votre propre lexique.")}>
      <div role="tablist" aria-label={t("Sections du vocabulaire")} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-7">
        {SECTIONS.map((sec) => {
          const on = section === sec.id;
          const Icon = sec.icon;
          return (
            <button key={sec.id} role="tab" aria-selected={on} onClick={() => setSection(sec.id)}
              className={`px-4 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${on ? "bg-[var(--tool-fill,#2563EB)] text-white shadow-md shadow-black/10" : `border ${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`}>
              <Icon size={15} /> {t(sec.label)}
              {sec.id === "lexique" && deck.stats.due > 0 && (
                <span className={`ml-1 text-[11px] font-bold rounded-full px-1.5 py-0.5 ${on ? "bg-white/25" : "bg-rose-600 text-white"}`}>{deck.stats.due}</span>
              )}
            </button>
          );
        })}
      </div>

      {section === "precis" && (
        <>
          <p className={`max-w-2xl mx-auto text-sm mb-5 ${c.sub}`}>{t("Le correcteur pénalise les mots vagues : chose, faire, il y a, bien, beaucoup. Choisissez l’expression qui dit la même chose avec précision.")}</p>
          <ChoiceExercise items={MOT_PRECIS} source="mot-precis" question="Quelle expression remplace le mieux le passage souligné ?" />
        </>
      )}
      {section === "connecteurs" && (
        <>
          <p className={`max-w-2xl mx-auto text-sm mb-5 ${c.sub}`}>{t("Un connecteur se choisit selon la relation entre les idées : opposition, cause, conséquence, condition… Un connecteur employé à contresens coûte des points en cohérence.")}</p>
          <ChoiceExercise items={CONNECTEURS} source="connecteur" relations={RELATIONS} question="Quel connecteur convient ?" />
        </>
      )}
      {section === "lexique" && <MyDeck />}

      {section === "mots" && (<>
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          {VOCAB_CATS.map((ct) => (
            <button key={ct} onClick={() => setCat(ct)} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${cat === ct ? "bg-[var(--tool-fill,#2563EB)] text-white shadow-md shadow-black/10" : `border ${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`}>
              {t(ct)}
            </button>
          ))}
        </div>
        <button onClick={() => setMode(mode === "cards" ? "quiz" : "cards")} className={`px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 self-start border ${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}>
          {mode === "quiz" ? <><BookOpen size={14} /> {t("Mode apprentissage")}</> : <><Zap size={14} /> {t("Mode quiz")}</>}
        </button>
      </div>

      {mode === "quiz" ? (
        <Card className="max-w-xl mx-auto p-7 rise">
          <div className="flex items-center justify-between">
            <Pill tone="red"><Zap size={12} /> {t("Quiz éclair")}</Pill>
            {quiz && <Pill tone={LEVEL_TONE[quiz.word.level]}>{quiz.word.level}</Pill>}
          </div>
          {quiz ? (
            <>
              <p className={`mt-4 font-medium ${c.text}`}>{t("Quel mot correspond à cette définition :")} « {quiz.word.def} » ?</p>
              <div className="mt-5 space-y-2.5">
                {quiz.options.map((o) => {
                  const st = qSel === null ? "idle" : o === quiz.word.fr ? "right" : o === qSel ? "wrong" : "dim";
                  return (
                    <button key={o} disabled={qSel !== null} onClick={() => { setQSel(o); if (o !== quiz.word.fr) deck.add({ term: quiz.word.fr, def: quiz.word.def, example: quiz.word.ex, source: "vocab" }); }} className={`w-full text-left px-5 py-3 rounded-2xl border text-sm font-medium transition-all
                      ${st === "idle" ? `${c.border} ${c.text} hover:border-blue-600 hover:bg-blue-600/5` : ""}
                      ${st === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : ""}
                      ${st === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
                      ${st === "dim" ? `${c.border} opacity-40 ${c.sub}` : ""}`}>{o}</button>
                  );
                })}
              </div>
              {qSel !== null && (
                <div className="mt-5 flex items-center gap-3">
                  <Btn small icon={ArrowRight} onClick={nextQuiz}>{t("Mot suivant")}</Btn>
                  <span className={`text-sm italic ${c.sub}`}>« {quiz.word.ex} »</span>
                  {qSel !== quiz.word.fr && <span className="text-xs font-semibold text-blue-600 flex items-center gap-1"><BookmarkCheck size={14} /> {t("Ajouté à « Mon lexique »")}</span>}
                </div>
              )}
            </>
          ) : (
            <p className={`mt-4 text-sm ${c.faint}`}>{t("Aucun mot dans cette catégorie.")}</p>
          )}
        </Card>
      ) : card ? (
        <div className="max-w-2xl mx-auto">
          <div className="fwrap h-[26rem]" data-tour="vocab-card">
            <div className={`fcard relative w-full h-full ${revealed ? "flipped" : ""}`}>
              <button onClick={tapCard} className={`fface absolute inset-0 rounded-3xl border ${c.border} ${c.card} p-10 flex flex-col items-center justify-center text-center card-lift`} aria-label={`${t("Voir la définition de")} ${card.fr}`}>
                <Pill tone="slate" className="absolute top-5 left-5">{t(card.cat)}</Pill>
                <Pill tone={LEVEL_TONE[card.level]} className="absolute top-5 right-16">{card.level}</Pill>
                <span onClick={(e) => { e.stopPropagation(); toggleFav(card.fr); }} role="button" aria-label={t("Favori")} className={`absolute top-4 right-4 p-2 rounded-full ${favs.includes(card.fr) ? "text-rose-600" : c.faint} hover:text-rose-600`}>
                  <Heart size={22} fill={favs.includes(card.fr) ? "currentColor" : "none"} />
                </span>
                <p className={`font-display font-bold text-4xl md:text-5xl leading-tight ${c.text}`}>{card.fr}</p>
                <p className={`mt-5 text-sm ${c.faint}`}>{t("Cliquez pour voir la définition")}</p>
              </button>
              <button onClick={tapCard} className="fface fback absolute inset-0 rounded-3xl p-10 flex flex-col justify-center text-left text-white grad-brand shadow-xl" aria-label={t("Mot suivant")}>
                <Pill tone="slate" className="absolute top-5 right-5 !bg-white/20 !text-white">{card.level}</Pill>
                <p className="text-xl md:text-2xl font-semibold leading-relaxed">{card.def}</p>
                <p className="mt-4 text-base md:text-lg italic opacity-90">« {card.ex} »</p>
                <p className="mt-7 text-sm opacity-75 flex items-center gap-1.5"><ArrowRight size={15} /> {t("Cliquez pour le mot suivant")}</p>
              </button>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <Btn small variant="ghost" icon={Shuffle} onClick={nextCard}>{t("Mot suivant")}</Btn>
            {deck.has(card.fr)
              ? <span className="text-xs font-semibold text-blue-600 flex items-center gap-1"><BookmarkCheck size={14} /> {t("Dans « Mon lexique »")}</span>
              : <Btn small variant="soft" icon={BookmarkPlus} onClick={() => deck.add({ term: card.fr, def: card.def, example: card.ex, source: "vocab" })}>{t("+ Mon lexique")}</Btn>}
            {revealed && <Btn small variant="soft" icon={RotateCcw} onClick={() => setRevealed(false)}>{t("Cacher")}</Btn>}
          </div>
        </div>
      ) : (
        <p className={`text-center py-10 text-sm ${c.faint}`}>{t("Aucun mot dans cette catégorie.")}</p>
      )}
      </>)}
    </PageShell>
  );
}
