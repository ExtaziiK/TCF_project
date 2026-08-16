import { useRef, useState } from "react";
import { Check, X, AlertTriangle, CornerDownLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { AccentKeys, insertAtCaret, NO_ASSIST_PROPS } from "@/components/common";
import { checkAnswer, isCorrect, missingAccents, filledSentence } from "@/utils/conjugationCheck";

// One conjugation exercise, in either practice mode:
//   mode="write"   an input the candidate types the form into
//   mode="choose"  the four options as buttons
//
// Both call `onAnswer(correct)` exactly once, on the first attempt, so a parent
// running a scored session can count the answer without the child knowing
// anything about scoring. `verdict` is lifted out of the two branches because
// the correction block below is identical for both — only the way the answer
// is collected differs.
export function ConjugationExercise({ q, mode = "write", onAnswer, autoFocus = false }) {
  const { c, t, dark } = useApp();
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState(null); // "correct" | "accent" | "wrong"
  const [chosen, setChosen] = useState(null);
  const inputRef = useRef(null);
  const done = verdict !== null;

  const settle = (v) => {
    setVerdict(v);
    onAnswer?.(isCorrect(v));
  };

  const submit = () => {
    if (done || !typed.trim()) return;
    settle(checkAnswer(q, typed));
  };

  const choose = (opt) => {
    if (done) return;
    setChosen(opt);
    settle(checkAnswer(q, opt));
  };

  // The prompt: a sentence with its gap, or — for a bare drill — the
  // infinitive and the pronoun on their own.
  //
  // The infinitive sits directly ABOVE the gap rather than trailing at the end
  // of the sentence. It is the task — without it the exercise has no possible
  // answer — and candidates reported missing it entirely when it was a faint
  // parenthetical at the far right, especially once the sentence wrapped and
  // put it on a line of its own, away from the blank it describes. Stacked on
  // the blank, the two read as one unit: "this verb, in this slot".
  //
  // Gold, in the amber pair the pricing notice already uses, because slate is
  // what the rest of the line is: the point is that this one element is not
  // part of the sentence but an instruction about it. The light shade is
  // amber-700 (≈5:1 on white) rather than the brand's #b8860b (3.3:1), which
  // would have put the label back under the WCAG AA floor it was just lifted
  // out of.
  //
  // `leading-[2.4]` on the paragraph is what reserves room for the stacked
  // label; without it the label of a wrapped second line collides with the
  // line above.
  const gold = dark ? "text-amber-400" : "text-amber-700";
  const prompt = q.s ? (
    <p className={`text-[15px] leading-[2.4] ${c.text}`}>
      {q.s.split("___")[0]}
      <span className="inline-block align-bottom mx-1.5 text-center">
        <span className={`block text-sm font-mono2 font-bold leading-none pb-1 whitespace-nowrap ${gold}`}>
          {q.inf}
        </span>
        <span className="block min-w-[84px] px-2 border-b-2 border-dashed border-blue-500/60 text-blue-600 font-semibold leading-snug">
          {done ? q.a : "…"}
        </span>
      </span>
      {q.s.split("___")[1]}
    </p>
  ) : (
    <p className={`flex items-center gap-2 flex-wrap ${c.text}`}>
      {/* Gold here too: the verb to conjugate is always the gold word, whether
          it heads a drill or sits over a gap. */}
      <span className={`font-display font-bold text-lg ${gold}`}>{q.inf}</span>
      <span className={c.faint}>·</span>
      <span className={`font-mono2 text-sm ${c.sub}`}>{q.p}</span>
      <span className={c.faint}>→</span>
      <span className={`font-semibold ${done ? "text-blue-600" : c.faint}`}>{done ? q.a : "?"}</span>
    </p>
  );

  return (
    <div className={`p-5 rounded-2xl border ${c.border}`}>
      {prompt}

      {mode === "write" ? (
        <div className={`mt-4 rounded-xl border overflow-hidden ${done ? c.border : "border-blue-600/40"}`}>
          {!done && <AccentKeys defaultOn={false} onInsert={(ch) => insertAtCaret(inputRef, ch, typed, setTyped)} />}
          <div className="flex items-stretch">
            <input
              ref={inputRef}
              value={typed}
              autoFocus={autoFocus}
              disabled={done}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
              placeholder={q.p ? `${q.p} …` : t("Votre réponse")}
              aria-label={t("Écrivez la forme conjuguée")}
              {...NO_ASSIST_PROPS}
              className={`flex-1 px-4 py-3 bg-transparent outline-none text-[15px] ${c.text} disabled:opacity-70`}
            />
            {!done && (
              <button
                type="button" onClick={submit} disabled={!typed.trim()}
                className="px-4 shrink-0 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
              >
                {t("Vérifier")} <CornerDownLeft size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid sm:grid-cols-2 gap-2">
          {q.opts.map((o) => {
            // Compared through checkAnswer, not ===, so an option that differs
            // from `a` only by an accepted variant still lights up green.
            const right = isCorrect(checkAnswer(q, o));
            const st = !done ? "idle" : right ? "right" : o === chosen ? "wrong" : "dim";
            return (
              <button
                key={o} type="button" disabled={done} onClick={() => choose(o)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-semibold text-left transition-all
                  ${st === "idle" ? `${c.border} ${c.text} hover:border-blue-600 hover:bg-blue-600/5` : ""}
                  ${st === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : ""}
                  ${st === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
                  ${st === "dim" ? `${c.border} opacity-40 ${c.sub}` : ""}`}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}

      {done && <Correction q={q} verdict={verdict} typed={mode === "write" ? typed : chosen} />}
    </div>
  );
}

// The feedback block. Three tones, because "accent" is a real third outcome:
// it is marked wrong, but naming the accent that was dropped is the whole
// point of grading strictly in the first place.
function Correction({ q, verdict, typed }) {
  const { c, t } = useApp();
  const accents = verdict === "accent" ? missingAccents(q, typed) : [];
  const sentence = filledSentence(q);

  const tone = {
    correct: { cls: "text-emerald-600", Icon: Check, label: "Bonne réponse !" },
    accent: { cls: "text-amber-600", Icon: AlertTriangle, label: "Presque : il manque un accent." },
    wrong: { cls: "text-rose-600", Icon: X, label: "Pas tout à fait." },
  }[verdict];

  return (
    <div className="mt-4 rise">
      <p className={`text-sm font-semibold flex items-start gap-2 ${tone.cls}`}>
        <tone.Icon size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          {t(tone.label)}
          {verdict !== "correct" && (
            <span className={`font-normal ${c.sub}`}>
              {" "}{t("La forme attendue est")} <strong className={c.text}>{q.a}</strong>
              {accents.length > 0 && <> — {t("vous avez oublié")} <strong className={c.text}>{accents.join(", ")}</strong></>}.
            </span>
          )}
        </span>
      </p>
      <p className={`mt-2 text-sm ${c.sub}`}>{q.exp}</p>
      {sentence && <p className={`mt-2 text-sm italic ${c.faint}`}>« {sentence} »</p>}
    </div>
  );
}
