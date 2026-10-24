import { useMemo } from "react";
import { BookMarked, ShieldCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { highlight } from "@/services/sujetsAnswersFormat";

// THE model answer of one subject, as both the « Modèle de réponse » page and
// the writing workshop's « Exemple de réponse » show it — the same text the
// dictée reads aloud. The memorisable expressions are picked out at render
// time from the stored list, so the body itself stays clean, copyable text.
//
// A graded answer (written by the quality gate, api/_lib/eeModelAnswer.js) also
// shows the structure the exam rewards: tâche 3's two required parts are
// labelled, and the grade our own correction gave it is stated.

function Highlighted({ text, keywords }) {
  const { c } = useApp();
  const parts = useMemo(() => highlight(text, keywords), [text, keywords]);
  return (
    <p className={`text-[15px] leading-[1.85] whitespace-pre-line ${c.text}`}>
      {parts.map((p, i) =>
        p.strong
          ? <strong key={i} className="font-semibold text-blue-700 dark:text-blue-400 bg-blue-600/10 rounded px-1 py-0.5 box-decoration-clone">{p.text}</strong>
          : <span key={i}>{p.text}</span>,
      )}
    </p>
  );
}

const PartLabel = ({ children }) => (
  <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-1.5">{children}</p>
);

export function ModelAnswer({ tache, answer, compact = false }) {
  const { c, t } = useApp();
  const graded = Number.isFinite(answer?.score);
  const paras = String(answer?.body || "").split(/\n{2,}/);
  // Tâche 3: the synthesis is the first paragraph, the opinion the rest — the
  // shape the gate writes, so it is only labelled on a graded answer.
  const twoParts = graded && Number(tache) === 3 && paras.length >= 2;

  return (
    <div>
      {graded && (
        <p className={`mb-4 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400`}>
          <ShieldCheck size={13} /> {t("Validé par notre correcteur :")} {answer.score}/20
          {answer.words ? <span className="font-normal opacity-80">· {answer.words} {t("mots")}</span> : null}
        </p>
      )}
      {answer?.title && <p className={`font-display font-bold text-lg mb-3 ${c.text}`}>{answer.title}</p>}
      {twoParts ? (
        <div className="space-y-4">
          <div>
            <PartLabel>{t("1 · Synthèse des deux documents")}</PartLabel>
            <Highlighted text={paras[0]} keywords={answer.keywords} />
          </div>
          <div>
            <PartLabel>{t("2 · Votre opinion argumentée")}</PartLabel>
            <Highlighted text={paras.slice(1).join("\n\n")} keywords={answer.keywords} />
          </div>
        </div>
      ) : (
        <Highlighted text={answer?.body} keywords={answer?.keywords} />
      )}
      {!compact && answer?.keywords?.length > 0 && (
        <div className={`mt-5 pt-5 border-t ${c.border}`}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-3 flex items-center gap-1.5">
            <BookMarked size={12} /> {t("Expressions à mémoriser")}
          </p>
          <div className="flex flex-wrap gap-2">
            {answer.keywords.map((k, i) => (
              <span key={i} className={`text-sm rounded-full border ${c.border} px-3 py-1.5 ${c.text}`}>{k}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
