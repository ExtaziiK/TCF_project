import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { fmt } from "@/utils/format";
import { evaluateSpeaking, blobToBase64, AiError } from "@/services/aiService";

// Preferred recording containers, best first. Whisper accepts all of these;
// we pick the first the browser can actually produce.
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
const pickMime = () =>
  typeof MediaRecorder !== "undefined"
    ? MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m))
    : undefined;

// Drives the record/prep/stop state machine for a speaking task and, once the
// recording stops, sends it off for transcription + AI evaluation:
//   idle -> (prep) -> rec -> processing -> idle
// Each finished attempt becomes a history entry that fills in with the audio,
// transcript and AI feedback as they arrive.
export function useSpeakingSession(task, notify) {
  const { lang, t } = useApp();
  const [phase, setPhase] = useState("idle"); // idle | prep | rec | processing
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState([]);
  const nextId = useRef(1);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const taskRef = useRef(task);
  taskRef.current = task;

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };

  // Assembles the recording, drops it into history as "processing", then
  // transcribes + evaluates it and patches the entry with the result.
  const finalizeRecording = async (mimeType) => {
    releaseStream();
    const chunks = chunksRef.current;
    chunksRef.current = [];
    const type = mimeType || pickMime() || "audio/webm";
    const blob = new Blob(chunks, { type });
    const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    const id = `rec-${nextId.current++}`;
    const url = chunks.length ? URL.createObjectURL(blob) : null;

    setHistory((h) => [{ id, t: taskRef.current.t, when: "à l'instant", dur: fmt(elapsed), url, status: "processing" }, ...h]);
    setPhase("idle");
    setCount(0);

    const patch = (fields) => setHistory((h) => h.map((e) => (e.id === id ? { ...e, ...fields } : e)));

    if (!chunks.length) {
      patch({ status: "error", error: t("Aucun son n'a été capté. Vérifiez votre micro.") });
      return;
    }
    try {
      const audioBase64 = await blobToBase64(blob);
      const fb = await evaluateSpeaking({
        audioBase64,
        mime: type,
        prompt: taskRef.current.prompt,
        taskLabel: taskRef.current.t || `Tâche ${taskRef.current.task}`,
        lang,
      });
      patch({ status: "done", transcript: fb.transcript || "", empty: !!fb.empty, feedback: fb.empty ? null : fb });
    } catch (err) {
      const msg =
        err instanceof AiError && (err.status === 404 || err.status === 0)
          ? t("Analyse vocale indisponible ici (fonctions serverless non déployées).")
          : t("La transcription a échoué. Réessayez.");
      patch({ status: "error", error: msg });
    }
  };

  const beginRecording = () => {
    const stream = streamRef.current;
    if (!stream) { setPhase("idle"); return; }
    let recorder;
    try {
      const mime = pickMime();
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
    } catch {
      notify(t("Impossible de démarrer l'enregistrement sur ce navigateur."));
      releaseStream();
      setPhase("idle");
      return;
    }
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    recorder.onstop = () => finalizeRecording(recorder.mimeType);
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    recorder.start();
    setPhase("rec");
    setCount(taskRef.current.dur);
  };

  const finishRecording = () => {
    setPhase("processing");
    setCount(0);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); return; } catch { /* fall through to direct finalize */ }
    }
    finalizeRecording(recorder?.mimeType);
  };

  // Reset when switching tasks; abort any in-flight recording/stream.
  useEffect(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      try { recorderRef.current.stop(); } catch { /* ignore */ }
    }
    releaseStream();
    setPhase("idle");
    setCount(0);
  }, [task.id]);

  // Release the mic if the component unmounts mid-session.
  useEffect(() => () => releaseStream(), []);

  // Countdown ticks during prep / rec.
  useEffect(() => {
    if (phase !== "prep" && phase !== "rec") return;
    const iv = setInterval(() => setCount((x) => x - 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // Auto-advance when the countdown hits zero: prep -> record, rec -> stop.
  useEffect(() => {
    if (count > 0) return;
    if (phase === "prep") beginRecording();
    else if (phase === "rec") finishRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, phase]);

  const start = async () => {
    if (phase !== "idle") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      notify(t("Votre navigateur ne permet pas l'enregistrement audio."));
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      notify(t("Micro non autorisé. Autorisez l'accès au microphone pour vous enregistrer."));
      return;
    }
    streamRef.current = stream;
    if (taskRef.current.prep > 0) { setPhase("prep"); setCount(taskRef.current.prep); }
    else beginRecording();
  };

  const skipPrep = () => { if (phase === "prep") beginRecording(); };
  const stop = () => { if (phase === "rec") finishRecording(); };

  return { phase, count, history, start, stop, skipPrep };
}
