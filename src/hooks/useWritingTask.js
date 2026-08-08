import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { evaluateWriting, AiError } from "@/services/aiService";
import { sameForGrading } from "@/utils/textSignature";
import { applyStickyScore, STICKY_WITHIN } from "@/utils/stickyScore";

// Encapsulates the writing-task business logic (timer, word count, AI
// analysis) so the Writing page can stay focused on presentation.
export function useWritingTask(task, notify) {
  const { lang, t } = useApp();
  const [text, setText] = useState("");
  const [left, setLeft] = useState(task.min * 60);
  const [running, setRunning] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [ai, setAi] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  // Parse the "X à Y mots" target defensively: admin-authored tasks could
  // carry a malformed range, and a null match here would crash the page.
  const nums = String(task.words || "").match(/\d+/g)?.map(Number) || [];
  const lo = nums[0] ?? 0;
  const hi = nums[1] ?? nums[0] ?? 0;

  useEffect(() => {
    setText(""); setLeft(task.min * 60); setRunning(false); setShowSample(false); setAi(null); setAnalyzing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setLeft((l) => { if (l <= 1) { setRunning(false); return 0; } return l - 1; }), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const onTextChange = (value) => {
    setText(value);
    if (!running && left === task.min * 60) setRunning(true);
  };

  // Offline / local-dev fallback: a rough heuristic in the same shape as the
  // real feedback, so the workshop still shows something without serverless.
  const heuristic = () => ({
    level: words >= lo ? (words <= hi ? "B2" : "B1+") : "B1",
    summary: words < lo
      ? `Votre texte compte ${words} mots ; visez au moins ${lo} pour traiter tous les points de la consigne.`
      : `Longueur adaptée (${words} mots) : la consigne est respectée.`,
    strengths: ["Réponse rédigée dans le temps imparti."],
    improvements: [
      "Structurez avec un connecteur d'ouverture (« Tout d'abord ») et de clôture (« En conclusion »).",
      "Relisez-vous : accords, négations complètes, accents.",
    ],
    targetLevel: "",
    corrected: "",
    rewrites: [],
  });

  // The last text analysed, and what came back for it. Pressing the button
  // again without changing the WORDS re-shows that result instead of asking for
  // a new one: a second call would spend money and one of the candidate's
  // analyses to produce an answer that should be the same anyway — and when it
  // came back different, they would rightly stop believing either version.
  //
  // Punctuation and spacing do not count as a change: deleting one full stop
  // once moved a real analysis from 11/20 to 10/20, which makes the grader look
  // arbitrary. See utils/textSignature for why this compares words rather than
  // a similarity score.
  const lastRun = useRef({ text: null, feedback: null });

  const analyze = async () => {
    if (analyzing) return;
    if (words === 0) { notify(t("Rédigez d'abord votre réponse avant de lancer l'analyse.")); return; }

    const current = text.trim();
    if (lastRun.current.feedback && sameForGrading(lastRun.current.text, current)) {
      setAi(lastRun.current.feedback);
      notify(t(
        lastRun.current.text === current
          ? "Texte inchangé : voici votre analyse précédente. Modifiez votre texte pour en obtenir une nouvelle."
          : "Seules la ponctuation ou la mise en forme ont changé : la note reste la même. Modifiez les mots pour une nouvelle analyse.",
      ));
      return;
    }

    setAnalyzing(true);
    setAi(null);
    try {
      const feedback = await evaluateWriting({
        prompt: task.prompt,
        response: text,
        taskLabel: task.t || `Tâche ${task.task}`,
        task: task.task,
        targetWords: task.words,
        lang,
      });
      // A revision that moves the score by a point or less keeps the previous
      // grade: that difference is inside the noise of any grid, and reporting
      // it as a level change claims a precision this assessment does not have.
      const held = applyStickyScore(lastRun.current.feedback, feedback);
      lastRun.current = { text: current, feedback: held };
      setAi(held);
      if (held.scoreHeld) {
        notify(t(`Votre note reste à ${held.score}/20 : l'écart avec l'analyse précédente est trop faible (${STICKY_WITHIN} point ou moins) pour changer votre niveau. Les conseils ci-dessous portent sur votre nouveau texte.`));
      }
    } catch (err) {
      if (err instanceof AiError && (err.status === 404 || err.status === 0)) {
        setAi(heuristic());
        notify(t("Analyse IA indisponible ici — aperçu heuristique affiché. Déployez les fonctions serverless pour l'analyse complète."));
      } else if (err instanceof AiError && err.status === 401) {
        notify(t("Votre session a expiré. Reconnectez-vous pour lancer l'analyse."), "error");
      } else if (err instanceof AiError && (err.status === 429 || err.status === 403)) {
        notify(err.message, "error");
      } else {
        notify(t("L'analyse IA a échoué. Réessayez dans un instant."));
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return { text, onTextChange, left, running, setRunning, showSample, setShowSample, ai, analyze, analyzing, words, lo, hi };
}
