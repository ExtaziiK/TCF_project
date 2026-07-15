import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { speakingDialogueTurn, blobToBase64, AiError } from "@/services/aiService";
import { speak, stopSpeaking } from "@/utils/speech";

// Preferred recording containers, best first. Whisper accepts all of these;
// we pick the first the browser can actually produce.
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
const pickMime = () =>
  typeof MediaRecorder !== "undefined"
    ? MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m))
    : undefined;

export const MAX_FOLLOW_UPS = 3; // keep in sync with api/expression-orale.js
const FOLLOW_UP_ANSWER_SECS = 90; // answers to follow-ups are shorter than the main answer
const DEFAULT_REVIEW_SECS = 60; // tasks without official prep still get review time

// Drives the oral-interview simulation for one speaking task:
//
//   idle -> review -> rec -> processing -> speaking -> ready -> rec -> ...
//                                       \-> done (after MAX_FOLLOW_UPS answers)
//
// The user reviews the subject, records an answer, the server transcribes it
// and the AI examiner replies with a follow-up question (spoken aloud via
// browser TTS while its text appears in the dialogue). After the last
// follow-up is answered the server grades the whole conversation.
// The mic stream is acquired once at begin() (so the permission prompt
// happens before the review clock) and held until the interview ends.
export function useOralInterview(task, notify) {
  const { lang, t } = useApp();
  const [phase, setPhase] = useState("idle"); // idle | review | rec | processing | speaking | ready | done
  const [count, setCount] = useState(0);
  const [turns, setTurns] = useState([]); // { id, role: "examiner"|"candidate", text, url?, failed? }
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");
  const nextId = useRef(1);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const objectUrlsRef = useRef([]); // recording URLs, revoked on unmount
  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  const taskRef = useRef(task);
  taskRef.current = task;

  const reviewSecs = task.prep > 0 ? task.prep : DEFAULT_REVIEW_SECS;
  const followUpsAsked = turns.filter((tn) => tn.role === "examiner" && !tn.closing).length;

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };

  const addTurn = (turn) => {
    const id = `turn-${nextId.current++}`;
    setTurns((ts) => [...ts, { id, ...turn }]);
  };

  // Assembles the recording and plays one dialogue turn against the server:
  // candidate transcript in, follow-up question (or final feedback) out.
  const finalizeRecording = async (mimeType) => {
    const chunks = chunksRef.current;
    chunksRef.current = [];
    const type = mimeType || pickMime() || "audio/webm";
    const blob = new Blob(chunks, { type });
    const url = chunks.length ? URL.createObjectURL(blob) : null;
    if (url) objectUrlsRef.current.push(url);
    setPhase("processing");
    setCount(0);
    setError("");

    const fail = (msg) => {
      if (url) addTurn({ role: "candidate", url, failed: true });
      setError(msg);
      setPhase("ready");
    };

    if (!chunks.length) {
      fail(t("Aucun son n'a été capté. Vérifiez votre micro."));
      return;
    }
    try {
      const audioBase64 = await blobToBase64(blob);
      // Failed attempts stay visible in the dialogue but are not part of it.
      const history = turnsRef.current
        .filter((tn) => !tn.failed && tn.text)
        .map(({ role, text }) => ({ role, text }));
      const res = await speakingDialogueTurn({
        audioBase64,
        mime: type,
        prompt: taskRef.current.prompt,
        taskLabel: taskRef.current.t || `Tâche ${taskRef.current.task}`,
        history,
        lang,
      });

      if (res.empty) {
        fail(t("Aucune parole détectée dans l'enregistrement. Réessayez."));
        return;
      }
      addTurn({ role: "candidate", text: res.transcript, url });

      if (res.done) {
        releaseStream();
        // Examiner lines stay in French whatever the UI language — the
        // interview itself is in French, only the feedback follows `lang`.
        const closing = "Merci, l'entretien est terminé. Voici mon évaluation.";
        addTurn({ role: "examiner", text: closing, closing: true });
        setFeedback(res.feedback || null);
        setPhase("done");
        speak(closing, () => {});
        return;
      }

      addTurn({ role: "examiner", text: res.reply });
      setPhase("speaking");
      speak(res.reply, () => setPhase((p) => (p === "speaking" ? "ready" : p)));
    } catch (err) {
      const msg =
        err instanceof AiError && (err.status === 404 || err.status === 0)
          ? t("Simulation indisponible ici (fonctions serverless non déployées).")
          : t("L'analyse a échoué. Réessayez.");
      fail(msg);
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
    recorder.start();
    setError("");
    setPhase("rec");
    // First answer gets the task's official speaking time; follow-up answers
    // are shorter, like the real examiner's relances.
    const firstAnswer = !turnsRef.current.some((tn) => tn.role === "candidate" && !tn.failed);
    setCount(firstAnswer ? taskRef.current.dur : Math.min(taskRef.current.dur, FOLLOW_UP_ANSWER_SECS));
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

  const abortRecorder = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      try { recorderRef.current.stop(); } catch { /* ignore */ }
    }
  };

  const reset = () => {
    abortRecorder();
    releaseStream();
    stopSpeaking();
    setPhase("idle");
    setCount(0);
    setTurns([]);
    setFeedback(null);
    setError("");
  };

  // Reset when switching tasks; abort any in-flight recording/stream.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => reset, [task.id]);

  // Release the mic and TTS if the component unmounts mid-interview, and free
  // the recordings' object URLs (they otherwise pin their blobs for the tab).
  useEffect(() => () => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
  }, []);

  // Countdown ticks during review / rec.
  useEffect(() => {
    if (phase !== "review" && phase !== "rec") return;
    const iv = setInterval(() => setCount((x) => x - 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // Auto-advance when the countdown hits zero: review -> record, rec -> stop.
  useEffect(() => {
    if (count > 0) return;
    if (phase === "review") beginRecording();
    else if (phase === "rec") finishRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, phase]);

  // Asks for the mic up front, then starts the review clock.
  const begin = async () => {
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
    setPhase("review");
    setCount(reviewSecs);
  };

  const skipReview = () => { if (phase === "review") beginRecording(); };
  const answer = () => { if (phase === "ready") beginRecording(); };
  const stop = () => { if (phase === "rec") finishRecording(); };
  // Replays an examiner line out loud (e.g. if the user missed the question).
  const replay = (text) => { if (phase === "ready" || phase === "done") speak(text, () => {}); };

  return { phase, count, turns, feedback, error, followUpsAsked, reviewSecs, begin, skipReview, answer, stop, replay, restart: reset };
}
