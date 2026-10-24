import { useMemo, useState } from "react";
import { ArrowRight, BookmarkPlus, BookmarkCheck, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { useVocabDeck } from "@/hooks/useVocabDeck";
import { BLANK, choicesFor, fillBlank, replaceVague, roundOrder } from "@/utils/vocabExercise";

// One multiple-choice vocabulary exercise, shared by « Le mot précis » and
// « Le bon connecteur ». Each item is a sentence with either a vague passage to
// replace (`vague`) or a blank to fill (`___`), four choices, and an
// explanation. A round shows every item once before any repeats.
//
// Every wrong answer puts the right one in « Mon lexique » — the word the
// learner did not know is exactly the one to review — and a right answer can
// be added by hand.

const LEVEL_TONE = { A1: "green", A2: "green", B1: "blue", B2: "blue", C1: "red", C2: "gold" };

function Sentence({ item, chosen }) {
  const { c } = useApp();
  // The passage in play, highlighted: the vague words, or the blank (filled in
  // once answered).
  const mark = (txt, tone) => <mark className={`rounded px-1 py-0.5 font-semibold ${tone}`}>{txt}</mark>;
  if (item.vague) {
    const [before, after] = item.sentence.split(item.vague);
    return (
      <p className={`text-lg leading-relaxed ${c.text}`}>
        {before}{mark(chosen || item.vague, chosen ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-400/25 text-amber-800 dark:text-amber-300 underline decoration-wavy decoration-amber-500/70")}{after}
      </p>
    );
  }
  const [before, after] = item.sentence.split(BLANK);
  const glued = chosen && /['’]$/.test(chosen) && after.startsWith(" ");
  return (
    <p className={`text-lg leading-relaxed ${c.text}`}>
      {before}{mark(chosen || "……", chosen ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-blue-600/10 text-blue-600")}{glued ? after.slice(1) : after}
    </p>
  );
}

export function ChoiceExercise({ items, question, source, relations = null }) {
  const { c, t } = useApp();
  const deck = useVocabDeck();
  const byId = useMemo(() => new Map(items.map((x) => [x.id, x])), [items]);
  const [order, setOrder] = useState(() => roundOrder(items));
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState({ right: 0, done: 0 });
  const [added, setAdded] = useState(false);

  const item = byId.get(order[pos]);
  const choices = useMemo(() => (item ? choicesFor(item) : []), [item]);
  const answered = picked !== null;
  const correct = answered && picked === item.answer;
  const finished = pos >= order.length;

  // What goes into the deck: the right answer, its explanation, and the
  // corrected sentence as the example.
  const deckEntry = (x) => ({
    term: x.answer.replace(/['’]$/, "").trim(),
    def: x.why,
    example: x.vague ? replaceVague(x.sentence, x.vague, x.answer) : fillBlank(x.sentence, x.answer),
    source,
  });

  const choose = async (choice) => {
    if (answered) return;
    setPicked(choice);
    const ok = choice === item.answer;
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), done: s.done + 1 }));
    if (!ok) setAdded(await deck.add(deckEntry(item)) || deck.has(deckEntry(item).term));
  };

  const next = () => {
    setPicked(null);
    setAdded(false);
    setPos((p) => p + 1);
  };

  const restart = () => {
    setOrder(roundOrder(items));
    setPos(0);
    setPicked(null);
    setAdded(false);
    setScore({ right: 0, done: 0 });
  };

  if (finished) {
    return (
      <Card className="max-w-2xl mx-auto p-8 text-center rise">
        <p className={`font-display font-bold text-2xl ${c.text}`}>{score.right} / {score.done}</p>
        <p className={`mt-2 text-sm ${c.sub}`}>{t("Série terminée. Les réponses manquées sont dans « Mon lexique », prêtes à être révisées.")}</p>
        <Btn className="mt-5" icon={RotateCcw} onClick={restart}>{t("Recommencer une série")}</Btn>
      </Card>
    );
  }

  const inDeck = deck.has(deckEntry(item).term);

  return (
    <Card className="max-w-2xl mx-auto p-7 rise">
      <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <Pill tone={LEVEL_TONE[item.level] || "slate"}>{item.level}</Pill>
          {relations && answered && <Pill tone="slate">{t(relations[item.relation] || item.relation)}</Pill>}
        </div>
        <span className={`text-xs font-mono2 ${c.faint}`}>{pos + 1} / {order.length} · {score.right} ✓</span>
      </div>

      <p className={`text-xs font-bold uppercase tracking-widest text-blue-600 mb-3`}>{t(question)}</p>
      <Sentence item={item} chosen={answered ? item.answer : null} />

      <div className="mt-6 grid sm:grid-cols-2 gap-2.5">
        {choices.map((o) => {
          const st = !answered ? "idle" : o === item.answer ? "right" : o === picked ? "wrong" : "dim";
          return (
            <button key={o} disabled={answered} onClick={() => choose(o)} className={`text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all
              ${st === "idle" ? `${c.border} ${c.text} hover:border-blue-600 hover:bg-blue-600/5` : ""}
              ${st === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : ""}
              ${st === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
              ${st === "dim" ? `${c.border} opacity-40 ${c.sub}` : ""}`}>{o}</button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-5 rise">
          <p className={`text-sm font-semibold flex items-center gap-1.5 ${correct ? "text-emerald-600" : "text-rose-600"}`}>
            {correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {t(correct ? "Exact !" : "Pas tout à fait.")}
          </p>
          <p className={`mt-1.5 text-sm leading-relaxed ${c.sub}`}>{item.why}</p>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <Btn small icon={ArrowRight} onClick={next}>{t(pos + 1 < order.length ? "Suivant" : "Voir le résultat")}</Btn>
            {!correct && added ? (
              <span className="text-xs font-semibold text-blue-600 flex items-center gap-1"><BookmarkCheck size={14} /> {t("Ajouté à « Mon lexique » pour la révision")}</span>
            ) : inDeck ? (
              <span className={`text-xs font-semibold flex items-center gap-1 ${c.faint}`}><BookmarkCheck size={14} /> {t("Dans « Mon lexique »")}</span>
            ) : (
              <button type="button" onClick={() => deck.add(deckEntry(item))} className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline">
                <BookmarkPlus size={14} /> {t("Ajouter à « Mon lexique »")}
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
