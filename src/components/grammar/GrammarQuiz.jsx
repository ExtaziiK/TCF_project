import { useState, useMemo, useCallback } from "react";
import { ArrowRight, RotateCcw, Trophy } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { GRAMMAR_TOPICS } from "@/constants/grammar";

const rnd = (n) => Math.floor(Math.random() * n);
// A random question from the pool, never the same one twice in a row.
const pick = (pool, exclude) => {
  if (pool.length <= 1) return pool[0];
  let x;
  do { x = pool[rnd(pool.length)]; } while (exclude && x.q === exclude.q);
  return x;
};

// Grammar quiz: one exercise at a time, drawn at random from every lesson's
// bank, with the correct answer explained and a running score.
export function GrammarQuiz() {
  const { c, t } = useApp();
  const pool = useMemo(
    () => GRAMMAR_TOPICS.flatMap((tp) => tp.qs.map((q) => ({ ...q, topic: tp.t }))),
    [],
  );
  const [item, setItem] = useState(() => pick(pool));
  const [sel, setSel] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const answer = (i) => {
    if (sel !== null) return;
    setSel(i);
    setScore((s) => ({ correct: s.correct + (i === item.a ? 1 : 0), total: s.total + 1 }));
  };
  const next = useCallback(() => {
    setItem((cur) => pick(pool, cur));
    setSel(null);
  }, [pool]);
  const reset = () => { setScore({ correct: 0, total: 0 }); setSel(null); setItem(pick(pool)); };

  return (
    <Card className="max-w-xl mx-auto p-7 rise">
      <div className="flex items-center justify-between gap-3">
        <Pill tone="blue">{t(item.topic)}</Pill>
        <span className={`inline-flex items-center gap-1.5 text-sm font-mono2 font-semibold ${c.sub}`}>
          <Trophy size={14} className="text-amber-500" /> {score.correct}/{score.total}
        </span>
      </div>

      <p className={`mt-5 font-medium ${c.text}`}>{item.q}</p>
      <div className="mt-4 flex gap-2 flex-wrap">
        {item.opts.map((o, i) => {
          const st = sel === null ? "idle" : i === item.a ? "right" : i === sel ? "wrong" : "dim";
          return (
            <button key={o} disabled={sel !== null} onClick={() => answer(i)} className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all
              ${st === "idle" ? `${c.border} ${c.text} hover:border-blue-600 hover:bg-blue-600/5` : ""}
              ${st === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : ""}
              ${st === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
              ${st === "dim" ? `${c.border} opacity-40 ${c.sub}` : ""}`}>{o}</button>
          );
        })}
      </div>

      {sel !== null && (
        <>
          <p className={`mt-4 text-sm rise ${sel === item.a ? "text-emerald-600" : "text-rose-600"}`}>
            {t(sel === item.a ? "Bonne réponse !" : "Pas tout à fait.")} <span className={c.sub}>{item.exp}</span>
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Btn small icon={ArrowRight} onClick={next}>{t("Question suivante")}</Btn>
            <Btn small variant="ghost" icon={RotateCcw} onClick={reset}>{t("Recommencer")}</Btn>
          </div>
        </>
      )}
    </Card>
  );
}
