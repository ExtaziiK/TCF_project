import { useRef } from "react";
import { Lock, NotebookPen } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, AccentKeys, insertAtCaret, NO_ASSIST_PROPS } from "@/components/common";

// One Expression écrite tâche being written, as on the exam station: the
// consigne, the on-screen accents, the live word count against the target,
// and a text area with no spell-checker. Shared by the practice workshop and
// the TCF blanc (WritingExamSequence), which add their own clock and actions.
//
// `locked`: the time is up — the text stays readable but takes no more input.
// `notes`/`setNotes`: the plan (brouillon), like the scrap paper the centre
// hands out; it is never graded.
//
// `lengthHint`: in the practice workshop, says what an out-of-range count
// risks under the official rules. The TCF blanc leaves it out, like the exam.
export function WritingEditor({ task, text, onTextChange, locked = false, words, lo, hi, notes, setNotes, headerRight = null, lengthHint = false }) {
  const { c, t } = useApp();
  const taRef = useRef(null);
  const inRange = words >= lo && words <= hi;
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <Pill tone="red">{t(task.words)}</Pill>
          {headerRight && <div className="flex items-center gap-2 flex-wrap">{headerRight}</div>}
        </div>
        <p className={`font-medium leading-relaxed whitespace-pre-line ${c.text}`}>{task.prompt}</p>
      </Card>

      {setNotes && (
        <details className={`group rounded-3xl border ${c.border} ${c.card}`}>
          <summary className={`px-5 py-3 cursor-pointer select-none list-none flex items-center gap-2 text-sm font-semibold ${c.sub}`}>
            <NotebookPen size={16} className="text-blue-600" /> {t("Brouillon (plan)")}
            <span className={`ml-auto text-xs font-normal ${c.faint}`}>{t("Comme la feuille du centre : non corrigé")}</span>
          </summary>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            aria-label={t("Brouillon")}
            {...NO_ASSIST_PROPS}
            className={`w-full px-5 pb-4 bg-transparent outline-none text-sm leading-relaxed resize-y ${c.text}`}
          />
        </details>
      )}

      <Card className={`p-2 ${locked ? "opacity-80" : ""}`}>
        <AccentKeys
          onInsert={(ch) => { if (!locked) insertAtCaret(taRef, ch, text, onTextChange); }}
          right={<span className={`ml-auto pr-2 text-xs font-mono2 font-semibold ${inRange ? "text-emerald-500" : words > 0 ? "text-amber-500" : c.faint}`}>{words} {t(words > 1 ? "mots" : "mot")} · {t("cible")} {lo}–{hi}</span>}
        />
        {/* Real-exam conditions: the browser must not help the candidate
            write — see NO_ASSIST_PROPS. No placeholder: a blank page. */}
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          readOnly={locked}
          rows={11}
          aria-label={t("Zone de rédaction")}
          {...NO_ASSIST_PROPS}
          className={`w-full p-5 bg-transparent outline-none text-[15px] leading-relaxed resize-y ${c.text}`}
        />
        {lengthHint && words > hi && (
          <p className="px-5 pb-3 text-xs font-semibold text-amber-600">
            {t("Au-delà de")} {hi} {t("mots, la tâche ne respecte plus le nombre de mots exigé : selon les règles officielles, elle risque d'être évaluée « A1 non atteint ». Resserrez votre texte.")}
          </p>
        )}
        {lengthHint && words > 0 && words < lo && (
          <p className={`px-5 pb-3 text-xs ${c.faint}`}>
            {t("Encore")} {lo - words} {t("mot(s) pour atteindre le minimum exigé. En dessous, la tâche risque d'être évaluée « A1 non atteint ».")}
          </p>
        )}
        {locked && (
          <p className={`px-5 pb-3 text-xs font-semibold flex items-center gap-1.5 text-amber-600`}>
            <Lock size={13} /> {t("Temps écoulé : le texte est verrouillé.")}
          </p>
        )}
      </Card>
    </div>
  );
}
