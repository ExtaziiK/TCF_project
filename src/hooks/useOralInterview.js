import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { speakingDialogueTurn, speakingOpening, blobToBase64, AiError, reportClientIssue, shouldReportFromBrowser } from "@/services/aiService";
import { getFreeMockAttemptId } from "@/utils/freeMockAttempt";
import { failureKind, failureIssue } from "@/utils/aiIssue";
import { speak, stopSpeaking } from "@/utils/speech";
import { openingLine, openingIsQuestion, PREP_END_LINE } from "../../api/_lib/eoLines.js";

// What a single failed turn says, by failure kind (utils/aiIssue.js): the
// interview carries on, so the advice ends with "answer again".
const RETRY_LINES = {
  offline: "Votre connexion internet a été interrompue — le problème vient de votre Wi-Fi ou de vos données mobiles, pas du site. Vérifiez-les, puis répondez à nouveau.",
  timeout: "Votre réponse a mis trop de temps à être traitée. Répondez à nouveau ; si votre connexion est lente, préférez le Wi-Fi.",
  generic: "Votre réponse n'a pas pu être prise en compte. Répondez à nouveau.",
};

// A microphone that never started, recorded for the admin (code "micro").
// err.name is the useful part: NotAllowedError (permission refused),
// NotFoundError (no microphone), NotReadableError (another app holds it).
export function reportMicIssue(task, err, mode) {
  reportClientIssue("eo", {
    stage: "micro", code: "micro", status: 0, task, mode,
    message: err ? `${err.name || "Error"}: ${err.message || ""}` : "Aucune donnée audio reçue du micro.",
    attemptId: getFreeMockAttemptId() || undefined,
  });
}

// Preferred recording containers, best first. Whisper accepts all of these;
// we pick the first the browser can actually produce.
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
const pickMime = () =>
  typeof MediaRecorder !== "undefined"
    ? MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m))
    : undefined;

export const MAX_EMPTY_REPROMPTS = 2; // silent answers get re-prompted at most this many times

// Longest single answer before the recording stops itself, per tâche: the
// first one (introducing yourself, opening the role-play, stating your
// position) runs longer than the later ones. Never beyond the time left.
const TURN_CAPS = {
  1: { first: 60, next: 45 },
  2: { first: 45, next: 45 },
  3: { first: 180, next: 90 },
};
// The browser's fallback voice, when the server sent no audio: France French,
// like the examiner's server voice (api/_lib/tts.js EXAMINER_VOICE).
const VOICE = { prefer: "fr-FR" };
const MIN_TURN_SECS = 10; // with less than this left, the answer being sent is the last one

// Drives one tâche of the Expression orale as on exam day:
//
//   idle -> [opening] -> [review] -> rec -> processing -> speaking -> ready -> rec -> ...
//                                                     \-> done (when the time is up)
//
// - opening: the examiner speaks first and briefs the tâche — what to do, how
//   long, who starts — ending on the question (Tâches 1 and 3) or the subject
//   and the start of the preparation (Tâche 2). The line comes from the
//   server in the examiner's France-French voice, or from eoLines.js with the
//   browser's voice when the server can't be reached.
// - review: Tâche 2's two minutes of preparation, closed by the examiner's
//   "c'est à vous". Tâches 1 and 3 have none.
// - The clock is the real one: it runs for the whole tâche — while the
//   candidate speaks, while the examiner speaks, and while the candidate
//   hesitates — and stops only while our server works on an answer (on exam
//   day the examiner replies instantly). At zero the examiner cuts in, even
//   mid-sentence, and the exchange is graded.
// - The candidate answers as soon as the examiner has spoken: the recording
//   starts by itself, and a button ends their turn.
// - `exam`: the TCF blanc. The page hides the text of what is said, and the
//   briefings chain the three tâches (welcome, then transitions).
// The mic stream is acquired once at begin() (so the permission prompt
// happens before the clock) and held until the tâche ends.
export function useOralInterview(task, notify, { exam = false } = {}) {
  const { lang, t } = useApp();
  const [phase, setPhaseState] = useState("idle"); // idle | opening | review | rec | processing | speaking | ready | done
  const [count, setCount] = useState(0);
  const [turns, setTurns] = useState([]); // { id, role: "examiner"|"candidate", text, url?, audioUrl?, failed?, reprompt?, emptyRec?, meta? }
  const [feedback, setFeedback] = useState(null);
  const [ended, setEnded] = useState(false); // stopped after too many silent answers, no grade
  const [error, setError] = useState("");
  // Two failed turns in a row: the page asks to be refreshed (RefreshNotice,
  // with "copy the conversation" first). One alone only asks to answer again —
  // the interview carries on as it is, and a refresh would throw it away.
  // Holds the failure kind ("offline" | "timeout" | "generic") for RefreshNotice.
  const [needsRefresh, setNeedsRefresh] = useState(null);
  // A microphone problem to explain (MicHelp): the browser's error name, or
  // "unsupported" / "silent". Null when the microphone works.
  const [micIssue, setMicIssue] = useState(null);
  // No voice could say a line out loud: the exam mode then shows the text,
  // or the candidate would never know what was asked.
  const [voiceless, setVoiceless] = useState(false);
  // The live microphone, for the level meter (MicLevel) while the candidate speaks.
  const [micStream, setMicStream] = useState(null);
  const [remaining, setRemaining] = useState(task.dur); // time left for the whole tâche
  const voicelessRef = useRef(false);
  const failStreak = useRef(0);
  const nextId = useRef(1);
  const remainingRef = useRef(task.dur);
  const clockOn = useRef(false); // the tâche's clock has started (after the preparation)
  const timeUpSent = useRef(false); // the closing turn is on its way
  const silenceEnd = useRef(null); // seconds of silence that closed the current answer, if any
  const runId = useRef(0); // bumped on reset: a late answer from an old run is dropped
  const phaseRef = useRef("idle");
  const starting = useRef(false); // waiting for the mic permission (begin)
  const emptyStreak = useRef(0); // consecutive silent answers at the current question
  const playerRef = useRef(null); // examiner audio currently playing
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const objectUrlsRef = useRef([]); // recording URLs, revoked on unmount
  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  const taskRef = useRef(task);
  taskRef.current = task;

  const reviewSecs = task.prep || 0;
  const interviewSecs = task.dur;

  const setPhase = (p) => { phaseRef.current = p; setPhaseState(p); };
  const setBudget = (secs) => { remainingRef.current = secs; setRemaining(secs); };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setMicStream(null);
  };

  const addTurn = (turn) => {
    const id = `turn-${nextId.current++}`;
    setTurns((ts) => [...ts, { id, ...turn }]);
    turnsRef.current = [...turnsRef.current, { id, ...turn }];
  };

  // speak() stays silent when the browser has no French voice (better than an
  // English voice mangling the question); explain that once per interview.
  // Only reachable when the server sent no audio for the line.
  const noteUnspoken = (spoken) => {
    if (spoken || voicelessRef.current) return;
    voicelessRef.current = true;
    setVoiceless(true);
    notify(t("Aucune voix française sur ce navigateur : les questions s'affichent à l'écrit seulement. Essayez Microsoft Edge ou installez une voix française dans votre système."));
  };

  // Decodes the server-synthesized speech (base64 mp3) into a playable
  // object URL, tracked for revocation with the recordings.
  const audioUrlFromBase64 = (b64, mime = "audio/mpeg") => {
    if (!b64) return null;
    try {
      const bytes = Uint8Array.from(window.atob(b64), (ch) => ch.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      objectUrlsRef.current.push(url);
      return url;
    } catch {
      return null;
    }
  };

  const stopExaminerAudio = () => {
    playerRef.current?.pause();
    playerRef.current = null;
    stopSpeaking();
  };

  // Voices one examiner line: the server's audio when available, browser TTS
  // otherwise. `onDone(spoken)` fires exactly once.
  const sayLine = (text, audioUrl, onDone) => {
    stopExaminerAudio();
    if (!audioUrl) { speak(text, onDone, VOICE); return; }
    let handled = false;
    const finish = (spoken) => { if (!handled) { handled = true; onDone(spoken); } };
    const player = new window.Audio(audioUrl);
    playerRef.current = player;
    player.onended = () => finish(true);
    // Bad decode/interrupted playback: fall back to browser TTS so the line
    // is still heard where possible.
    player.onerror = () => { if (!handled) { handled = true; speak(text, onDone, VOICE); } };
    player.play().catch(() => { if (!handled) { handled = true; speak(text, onDone, VOICE); } });
  };

  // The examiner has finished a line: the candidate's turn. They just answer
  // — the recording starts by itself, as speaking does in the room.
  const afterExaminer = (spoken) => {
    noteUnspoken(spoken);
    if (phaseRef.current !== "speaking") return;
    if (remainingRef.current > 0) beginRecording();
    else setPhase("ready");
  };

  const closeOut = (line, audioUrl, { grade = null, endedNoGrade = false } = {}) => {
    releaseStream();
    emptyStreak.current = 0;
    addTurn({ role: "examiner", text: line, closing: true, audioUrl });
    if (grade) setFeedback(grade);
    if (endedNoGrade) setEnded(true);
    setPhase("done");
    sayLine(line, audioUrl, noteUnspoken);
  };

  // Only real exchanges are part of the dialogue: silent attempts (emptyRec),
  // re-prompts, failed attempts and announcements (meta) are display-only.
  const dialogueHistory = () =>
    turnsRef.current
      .filter((tn) => !tn.failed && !tn.reprompt && !tn.emptyRec && !tn.meta && !tn.closing && tn.text)
      .map(({ role, text }) => ({ role, text }));

  // Each graded answer's fluency measures, in order (the server can't keep them).
  const fluencyHistory = () =>
    turnsRef.current
      .filter((tn) => tn.role === "candidate" && !tn.failed && !tn.emptyRec && tn.fluency)
      .map((tn) => tn.fluency);

  // One turn against the server: the candidate's recording (or none, when the
  // time ran out before they answered) in, the next examiner line or the
  // grade out.
  const sendTurn = async ({ blob, url, type, final, endedBySilence = null }) => {
    const run = runId.current;
    setPhase("processing");
    setCount(0);
    setError("");

    const fail = (msg) => {
      if (url) addTurn({ role: "candidate", url, failed: true });
      setError(msg);
      setPhase("ready");
    };

    try {
      const audioBase64 = blob ? await blobToBase64(blob) : "";
      const res = await speakingDialogueTurn({
        audioBase64,
        mime: type,
        prompt: taskRef.current.prompt,
        taskLabel: taskRef.current.t || `Tâche ${taskRef.current.task}`,
        task: taskRef.current.task,
        history: dialogueHistory(),
        silenceEnd: endedBySilence ?? undefined,
        fluency: fluencyHistory(),
        emptyStreak: emptyStreak.current,
        lang,
        final,
      });
      if (run !== runId.current) return; // restarted meanwhile
      // The server answered: whatever the turn says next, the streak is over.
      failStreak.current = 0;

      const examinerAudio = audioUrlFromBase64(res.audio, res.audioMime);

      // Nothing intelligible was said (silence or a Whisper hallucination).
      // No sound at all in the file: a microphone problem, explained as one.
      setMicIssue(res.empty && res.silentRecording ? "silent" : null);
      if (res.empty) {
        // Keep the silent take visible so the user can replay and notice their
        // mic was quiet, but it's not part of the graded dialogue.
        if (url) addTurn({ role: "candidate", url, emptyRec: true });

        // Cap reached (or time up): the examiner stops re-prompting and closes
        // out — grading what was said (res.done) or ending without a grade.
        if (res.capped) {
          const line = res.closing || res.reprompt || t("Nous allons nous arrêter ici.");
          closeOut(line, examinerAudio, res.done ? { grade: res.feedback || null } : { endedNoGrade: true });
          return;
        }

        // Under the cap: re-prompt the same question. This examiner turn is a
        // re-prompt (reprompt:true) so it never counts as a follow-up.
        emptyStreak.current += 1;
        const line = res.reprompt || t("Je n'ai pas entendu votre réponse. Réessayez.");
        addTurn({ role: "examiner", text: line, reprompt: true, audioUrl: examinerAudio });
        setPhase("speaking");
        sayLine(line, examinerAudio, afterExaminer);
        return;
      }

      // A real answer resets the silent-answer streak.
      emptyStreak.current = 0;
      if (res.transcript) addTurn({ role: "candidate", text: res.transcript, url, fluency: res.fluency || null });

      if (res.done) {
        // Examiner lines stay in French whatever the UI language — the
        // interview itself is in French, only the feedback follows `lang`.
        closeOut(res.closing || "Merci, c'est terminé.", examinerAudio, { grade: res.feedback || null });
        return;
      }

      addTurn({ role: "examiner", text: res.reply, audioUrl: examinerAudio });
      setPhase("speaking");
      sayLine(res.reply, examinerAudio, afterExaminer);
    } catch (err) {
      if (run !== runId.current) return;
      // A failed closing turn is NOT re-sent by the clock (at zero it would
      // retry every second): the candidate answers again with the mic button,
      // and that last recording is sent as the final turn.
      // 404 only — a dropped connection (status 0) is a real failure in
      // production, not the local "no serverless functions" case.
      const known =
        err instanceof AiError && err.status === 404
          ? t("Simulation indisponible ici (fonctions serverless non déployées).")
          // The quota refusal explains itself; the generic notice would leave
          // the candidate wondering why the evaluation never arrived.
          : err instanceof AiError && err.status === 401
            ? t("Votre session a expiré. Reconnectez-vous pour lancer l'analyse.")
            : err instanceof AiError && (err.status === 429 || err.status === 403)
              ? err.message
              : null;
      if (known) { fail(known); return; }
      failStreak.current += 1;
      const kind = failureKind(err);
      const twice = failStreak.current > 1;
      if (shouldReportFromBrowser(err)) {
        reportClientIssue("eo", {
          mode: "entretien", stage: "envoi", status: err?.status ?? 0, message: err?.message,
          task: taskRef.current.task, audioBytes: blob?.size ?? 0, mime: type,
          attemptId: getFreeMockAttemptId() || undefined,
          shown: twice ? failureIssue(kind, "eo")?.title || "Cette page doit être actualisée pour continuer." : RETRY_LINES[kind],
        });
      }
      if (twice) { fail(""); setNeedsRefresh(kind); }
      else fail(t(RETRY_LINES[kind]));
    }
  };

  // Assembles the recording and sends it.
  const finalizeRecording = (mimeType) => {
    const chunks = chunksRef.current;
    chunksRef.current = [];
    const type = mimeType || pickMime() || "audio/webm";
    const blob = new Blob(chunks, { type });
    const url = chunks.length ? URL.createObjectURL(blob) : null;
    if (url) objectUrlsRef.current.push(url);

    // The clock ran down while the candidate spoke; when too little is left,
    // this answer is the last one and the server grades the exchange.
    const final = remainingRef.current < MIN_TURN_SECS;
    if (final) timeUpSent.current = true;

    if (!chunks.length) {
      setPhase("ready");
      setError(t("Aucun son n'a été capté. Vérifiez votre micro."));
      setMicIssue("silent");
      reportMicIssue(taskRef.current.task, null, "entretien");
      if (final) sendTurn({ final: true }); // time is up all the same
      return;
    }
    sendTurn({ blob, url, type, final, endedBySilence: silenceEnd.current });
    silenceEnd.current = null;
  };

  // The time ran out while the examiner was talking or before the candidate
  // started answering: the examiner closes, and what was said is graded.
  const endOnTime = () => {
    if (timeUpSent.current) return;
    timeUpSent.current = true;
    stopExaminerAudio();
    sendTurn({ final: true });
  };

  const beginRecording = () => {
    const stream = streamRef.current;
    if (!stream) { setPhase("idle"); return; }
    let recorder;
    try {
      const mime = pickMime();
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
    } catch (err) {
      setMicIssue("unsupported");
      reportMicIssue(taskRef.current.task, err, "entretien");
      releaseStream();
      setPhase("idle");
      return;
    }
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    recorder.onstop = () => finalizeRecording(recorder.mimeType);
    recorderRef.current = recorder;
    recorder.start();
    clockOn.current = true;
    setError("");
    setPhase("rec");
    const firstAnswer = !turnsRef.current.some((tn) => tn.role === "candidate" && !tn.failed && !tn.emptyRec);
    const caps = TURN_CAPS[taskRef.current.task] || TURN_CAPS[2];
    setCount(Math.max(1, Math.min(firstAnswer ? caps.first : caps.next, remainingRef.current)));
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

  // Tâche 2's preparation. The examiner's "c'est à vous" is fetched now so
  // it plays the moment the two minutes are up.
  const prepEnd = useRef(null); // Promise<{ line, audioUrl }>
  const startReview = () => {
    const tk = taskRef.current;
    prepEnd.current = speakingOpening({ task: tk.task, stage: "prep-end" })
      .then((res) => ({ line: res.line || PREP_END_LINE, audioUrl: audioUrlFromBase64(res.audio, res.audioMime) }))
      .catch(() => ({ line: PREP_END_LINE, audioUrl: null }));
    setPhase("review");
    setCount(tk.prep);
  };

  // The preparation is over (time up, or the candidate is ready early): the
  // examiner hands over, then the candidate opens the role-play.
  const endReview = async () => {
    if (phaseRef.current !== "review") return;
    const run = runId.current;
    setPhase("opening");
    const { line, audioUrl } = await (prepEnd.current || Promise.resolve({ line: PREP_END_LINE, audioUrl: null }));
    if (run !== runId.current) return;
    addTurn({ role: "examiner", text: line, audioUrl, meta: true });
    setPhase("speaking");
    sayLine(line, audioUrl, (spoken) => {
      clockOn.current = true;
      afterExaminer(spoken);
    });
  };

  const reset = () => {
    runId.current += 1;
    starting.current = false;
    abortRecorder();
    releaseStream();
    stopExaminerAudio();
    emptyStreak.current = 0;
    clockOn.current = false;
    timeUpSent.current = false;
    setPhase("idle");
    setCount(0);
    setBudget(taskRef.current.dur);
    setTurns([]);
    turnsRef.current = [];
    setFeedback(null);
    setEnded(false);
    setError("");
    setNeedsRefresh(null);
    setMicIssue(null);
    failStreak.current = 0;
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

  // One tick a second. The preparation counts down on its own; once the
  // tâche has started, its clock runs in every phase except while our server
  // is working on an answer. The answer's own countdown (`count`) runs
  // during preparation and recording.
  useEffect(() => {
    const live = ["rec", "ready", "speaking"].includes(phase);
    if (phase !== "review" && !live) return;
    const iv = setInterval(() => {
      if (phase === "review" || phase === "rec") setCount((x) => x - 1);
      if (live && clockOn.current) {
        setBudget(Math.max(0, remainingRef.current - 1));
        if (remainingRef.current <= 0 && phase !== "rec") endOnTime();
      }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-advance when the countdown hits zero: review -> record, rec -> stop.
  useEffect(() => {
    if (count > 0) return;
    if (phase === "review") endReview();
    else if (phase === "rec") finishRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, phase]);

  // The examiner speaks first: the briefing of the tâche (see eoLines.js).
  const playOpening = async () => {
    const run = runId.current;
    const tk = taskRef.current;
    const question = openingIsQuestion(tk.task);
    setPhase("opening");
    let line = "";
    let audioUrl = null;
    try {
      const res = await speakingOpening({ task: tk.task, prompt: tk.prompt, exam });
      line = res.line || "";
      audioUrl = audioUrlFromBase64(res.audio, res.audioMime);
    } catch {
      // Same words in the browser's voice: the tâche must still start.
      line = openingLine(tk.task, tk.prompt, { exam });
    }
    if (run !== runId.current) return;
    if (!line) { startReview(); return; }
    addTurn({ role: "examiner", text: line, audioUrl, meta: !question });
    // The briefing is off the clock: the tâche's time starts when the
    // candidate's does (Tâches 1 and 3), or after the preparation (Tâche 2).
    setPhase("speaking");
    sayLine(line, audioUrl, (spoken) => {
      if (question) { clockOn.current = true; afterExaminer(spoken); return; }
      noteUnspoken(spoken);
      if (run === runId.current && phaseRef.current === "speaking") startReview();
    });
  };

  // Asks for the mic up front, then the examiner opens the tâche.
  // Re-entry guard: `starting` covers the wait for the mic permission, and a
  // reset during that wait (task switch, or React's dev-mode double mount)
  // drops that stream instead of starting a second interview.
  const begin = async () => {
    if (phaseRef.current !== "idle" || starting.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicIssue("unsupported");
      reportMicIssue(taskRef.current.task, { name: "unsupported", message: "getUserMedia ou MediaRecorder absent" }, "entretien");
      return;
    }
    const run = runId.current;
    starting.current = true;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setMicIssue(err?.name || "other");
      reportMicIssue(taskRef.current.task, err, "entretien");
      return;
    } finally {
      starting.current = false;
    }
    if (run !== runId.current) { stream.getTracks().forEach((tr) => tr.stop()); return; }
    setMicIssue(null);
    streamRef.current = stream;
    setMicStream(stream);
    setBudget(taskRef.current.dur);
    clockOn.current = false;
    timeUpSent.current = false;
    playOpening();
  };

  const skipReview = () => { if (phase === "review") endReview(); };
  const answer = () => { if (phase === "ready") beginRecording(); };
  // `silenceSecs`: the turn was closed by the candidate falling silent
  // (MicLevel), not by the button — the server counts that silence as a pause.
  const stop = (silenceSecs) => {
    if (phase !== "rec") return;
    silenceEnd.current = typeof silenceSecs === "number" ? silenceSecs : null;
    finishRecording();
  };
  // Replays an examiner turn out loud (e.g. if the user missed the question),
  // reusing its server-synthesized audio when it has one.
  const replay = (turn) => { if (phase === "ready" || phase === "done") sayLine(turn.text, turn.audioUrl, () => {}); };

  return { phase, count, turns, feedback, ended, error, needsRefresh, micIssue, clearMicIssue: () => setMicIssue(null), voiceless, micStream, remaining, interviewSecs, reviewSecs, begin, skipReview, answer, stop, replay, restart: reset };
}
