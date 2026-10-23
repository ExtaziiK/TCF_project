import { useCallback, useState } from "react";
import { DoorOpen, ChevronRight, Award, AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { AiFeedback } from "@/components/expression/AiFeedback";
import { OralInterview } from "@/components/expression/OralInterview";
import { levelsFromScore } from "../../../api/_lib/levels.js";

// The Expression orale of the TCF blanc, run like the real one: the three
// tâches back to back in a single 12-minute interview, in the official order,
// with no choosing, no skipping the preparation and no text on screen. The
// examiner opens and announces each part; the evaluation comes only at the
// end, as one score /20 with its level and NCLC, then the detail per tâche.
export function OralExamSequence({ tasks }) {
  const { c, t } = useApp();
  const parts = tasks.filter((tk) => !tk.empty);
  const [stage, setStage] = useState("lobby"); // "lobby" | index into parts | "report"
  const [results, setResults] = useState({}); // task number -> { feedback, ended }
  const [partDone, setPartDone] = useState(false);

  const onFinish = useCallback((task, result) => {
    setResults((r) => ({ ...r, [task]: result }));
    setPartDone(true);
  }, []);

  const next = () => {
    setPartDone(false);
    setStage((s) => (s + 1 < parts.length ? s + 1 : "report"));
  };

  if (stage === "lobby") {
    return (
      <Card className="p-7 max-w-2xl mx-auto">
        <h3 className={`font-display font-bold text-xl mb-3 flex items-center gap-2 ${c.text}`}><DoorOpen size={20} className="text-blue-600" /> {t("Vous entrez dans la salle d'examen")}</h3>
        <ul className={`space-y-2 text-sm ${c.sub} list-disc list-inside mb-6`}>
          <li>{t("L'épreuve dure 12 minutes : trois parties enchaînées, face à l'examinatrice, qui vous explique chaque tâche avant de commencer.")}</li>
          <li>{t("Partie 1 (2 min) : elle vous demande de vous présenter, puis vous pose des questions.")}</li>
          <li>{t("Partie 2 (5 min 30) : 2 minutes de préparation, puis c'est vous qui menez la conversation.")}</li>
          <li>{t("Partie 3 (4 min 30) : vous donnez votre point de vue et le défendez.")}</li>
          <li>{t("Comme le jour J, vous écoutez sans lire : le texte et l'évaluation s'affichent à la fin.")}</li>
          <li>{t("Le chronomètre ne s'arrête pas : à la fin du temps, l'examinatrice vous interrompt.")}</li>
        </ul>
        <p className={`text-xs mb-5 ${c.faint}`}>{t("Utilisez un casque ou des écouteurs, dans une pièce calme, et autorisez le micro.")}</p>
        <Btn icon={DoorOpen} onClick={() => setStage(0)}>{t("Commencer l'épreuve")}</Btn>
      </Card>
    );
  }

  if (stage === "report") return <OralExamReport parts={parts} results={results} />;

  const task = parts[stage];
  const last = stage + 1 >= parts.length;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">{t("Partie")} {stage + 1} / {parts.length} · {t(task.t)}</p>
      <OralInterview key={task.id} task={task} exam autoStart onFinish={(r) => onFinish(task.task, r)} />
      {partDone && (
        <div className="mt-5 flex justify-center">
          <Btn icon={last ? Award : ChevronRight} onClick={next}>{last ? t("Voir mes résultats") : t("Partie suivante")}</Btn>
        </div>
      )}
    </div>
  );
}

// One Expression orale score, as the TCF reports it: the three tâches are
// marked as one épreuve, so their scores are averaged. A tâche that ended
// without anything to grade counts as 0, as silence would in the room.
function OralExamReport({ parts, results }) {
  const { c, t } = useApp();
  const scores = parts.map((tk) => results[tk.task]?.feedback?.score);
  const overall = levelsFromScore(scores.reduce((sum, s) => sum + (Number.isFinite(s) ? s : 0), 0) / parts.length);
  const missing = parts.filter((tk, i) => !Number.isFinite(scores[i]));

  return (
    <div className="space-y-5">
      <Card className="p-7 text-center border-2 border-blue-600/40">
        <p className={`text-xs font-bold uppercase tracking-widest text-blue-600 mb-2`}>{t("Expression orale · résultat")}</p>
        <p className={`font-display font-bold text-5xl ${c.text}`}>{overall.score ?? "—"}<span className={`text-2xl ${c.faint}`}> / 20</span></p>
        <p className={`mt-2 text-sm font-semibold ${c.sub}`}>
          {overall.level ? `${t("Niveau")} ${overall.level}` : t("Pas de niveau attribué")}
          {overall.nclc ? ` · NCLC ${overall.nclc}` : ""}
        </p>
        {missing.length > 0 && (
          <p className="mt-3 text-xs font-semibold text-amber-600 flex items-center justify-center gap-1.5">
            <AlertCircle size={13} /> {t("Comptée 0 faute de réponse évaluable :")} {missing.map((tk) => t(tk.t)).join(", ")}
          </p>
        )}
        <p className={`mt-3 text-xs ${c.faint}`}>{t("Estimation par l'IA à partir de la transcription : la prononciation n'est pas évaluée.")}</p>
      </Card>
      {parts.map((tk) => {
        const fb = results[tk.task]?.feedback;
        return (
          <div key={tk.id}>
            <p className={`font-display font-bold mb-2 ${c.text}`}>{t(tk.t)}</p>
            {fb ? <AiFeedback compact {...fb} /> : <Card className={`p-5 text-sm ${c.sub}`}>{t("Aucune réponse évaluable pour cette partie.")}</Card>}
          </div>
        );
      })}
    </div>
  );
}
