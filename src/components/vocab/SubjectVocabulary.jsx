import { useMemo, useState } from "react";
import { ChevronDown, BookmarkPlus, BookmarkCheck, Lightbulb } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/common";
import { VOCAB } from "@/constants/vocabulary";
import { wordsForSubject } from "@/utils/subjectThemes";
import { useVocabDeck } from "@/hooks/useVocabDeck";
import { SpeakButton } from "@/components/vocab/SpeakButton";

// « Vocabulaire utile pour ce sujet » — in the writing workshop, the ten words
// of the subject's theme worth using in the text (C1 and B2 first), each with
// its meaning, a listen button and « + Mon lexique ». Closed by default: the
// candidate should try the subject on their own first.
export function SubjectVocabulary({ prompt }) {
  const { c, t } = useApp();
  const deck = useVocabDeck();
  const [open, setOpen] = useState(false);
  const { themes, words } = useMemo(() => wordsForSubject(prompt, VOCAB), [prompt]);
  if (!words.length) return null;

  return (
    <Card className="p-6">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3" aria-expanded={open}>
        <span className={`font-display font-bold flex items-center gap-2 ${c.text}`}><Lightbulb size={17} className="text-amber-500" /> {t("Vocabulaire utile pour ce sujet")}</span>
        <ChevronDown size={18} className={`text-blue-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {!open ? (
        <p className={`mt-3 text-sm ${c.faint}`}>{t("Thème :")} {themes.map((x) => t(x)).join(", ")} · {words.length} {t("mots de niveau B2–C1 à placer dans votre texte.")}</p>
      ) : (
        <ul className="mt-4 space-y-3 rise">
          {words.map((w) => {
            const saved = deck.has(w.fr);
            return (
              <li key={w.fr} className="flex items-start gap-2">
                <SpeakButton text={w.fr} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${c.text}`}>{w.fr} <span className={`text-[11px] font-normal ${c.faint}`}>{w.level}</span></p>
                  <p className={`text-xs ${c.sub}`}>{w.def}</p>
                </div>
                <button
                  type="button"
                  disabled={saved}
                  onClick={() => deck.add({ term: w.fr, def: w.def, example: w.ex, source: "vocab" })}
                  aria-label={saved ? t("Dans « Mon lexique »") : `${t("Ajouter à « Mon lexique »")} : ${w.fr}`}
                  className={`p-1.5 rounded-lg shrink-0 ${saved ? "text-blue-600" : `${c.faint} hover:text-blue-600`}`}
                >
                  {saved ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
