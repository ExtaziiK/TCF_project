import { useEffect, useState } from "react";

// Encapsulates the writing-task business logic (timer, word count, AI
// analysis) so the Writing page can stay focused on presentation.
export function useWritingTask(task, notify) {
  const [text, setText] = useState("");
  const [left, setLeft] = useState(task.min * 60);
  const [running, setRunning] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [ai, setAi] = useState(null);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  // Parse the "X à Y mots" target defensively: admin-authored tasks could
  // carry a malformed range, and a null match here would crash the page.
  const nums = String(task.words || "").match(/\d+/g)?.map(Number) || [];
  const lo = nums[0] ?? 0;
  const hi = nums[1] ?? nums[0] ?? 0;

  useEffect(() => {
    setText(""); setLeft(task.min * 60); setRunning(false); setShowSample(false); setAi(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => { if (l <= 1) { setRunning(false); return 0; } return l - 1; }), 1000);
    return () => clearInterval(t);
  }, [running]);

  const onTextChange = (value) => {
    setText(value);
    if (!running && left === task.min * 60) setRunning(true);
  };

  const analyze = () => {
    setAi({
      score: words >= lo ? (words <= hi ? "B2" : "B1+") : "B1",
      points: [
        words < lo ? `Votre texte compte ${words} mots ; visez au moins ${lo} pour traiter tous les points de la consigne.` : `Longueur adaptée (${words} mots) : la consigne est respectée.`,
        "Structure : pensez à un connecteur d'ouverture (« Tout d'abord ») et de clôture (« En conclusion »).",
        "Registre : conservez le vouvoiement dans les messages formels et les tâches 2 et 3.",
      ],
    });
    notify("Analyse générée. En production, l'API IA renverrait une correction détaillée.");
  };

  return { text, onTextChange, left, running, setRunning, showSample, setShowSample, ai, analyze, words, lo, hi };
}
