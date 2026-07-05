import { useEffect, useRef, useState } from "react";
import { fmt } from "@/utils/format";

// Drives the record/prep/stop state machine for a speaking task:
// idle -> (prep) -> rec -> idle, logging a history entry on stop.
export function useSpeakingSession(task, notify) {
  const [phase, setPhase] = useState("idle");
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState([{ id: "rec-0", t: "Tâche 1 · Entretien dirigé", dur: "1:48", when: "hier" }]);
  const [playingId, setPlayingId] = useState(null);
  const nextId = useRef(1);

  const stop = () => {
    const id = `rec-${nextId.current++}`;
    setHistory((h) => [{ id, t: task.t, dur: fmt(Math.max(1, task.dur - count)), when: "à l'instant" }, ...h]);
    setPhase("idle");
    setCount(0);
    notify("Enregistrement sauvegardé dans votre historique.");
  };

  useEffect(() => {
    setPhase("idle");
    setCount(0);
  }, [task.id]);

  useEffect(() => {
    if (phase === "idle") return;
    const iv = setInterval(() => setCount((x) => x - 1), 1000);
    return () => clearInterval(iv);
  }, [phase, task.id]);

  useEffect(() => {
    if (count > 0) return;
    if (phase === "prep") { setPhase("rec"); setCount(task.dur); }
    else if (phase === "rec") stop();
    // `stop` is intentionally omitted: it changes identity every render and
    // must only fire on the tick where count reaches 0.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, phase]);

  const start = () => {
    if (task.prep > 0) { setPhase("prep"); setCount(task.prep); }
    else { setPhase("rec"); setCount(task.dur); }
  };

  const skipPrep = () => { setPhase("rec"); setCount(task.dur); };

  return { phase, count, history, playingId, setPlayingId, start, stop, skipPrep };
}
