import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { fetchDictee, fetchDicteeLibrary, recordDicteeSession, listDicteeSessions, recentSujetKeys, audioUrlFromBase64 } from "@/services/dicteeService";
import { buildSegments, segmentMode, DEFAULT_SEGMENT_MODE } from "@/utils/dicteeSegments";
import { diffSentence, summarize } from "@/utils/dicteeDiff";
import { AiError } from "@/services/aiService";

// One dictée, start to finish: draw a text, play it a segment at a time, score
// each segment as it is validated, and reveal the whole correction at the end.
//
// Nothing is shown between segments. A dictation is one continuous exercise:
// correcting it as you go turns it into a string of little quizzes, and — since
// the segments of a single text share their vocabulary and register — it hands
// the candidate spellings they are about to need.
//
// HOW MUCH IS READ AT A TIME. The server sends the text's sense groups and one
// recording per group; the segments a candidate actually hears are built here
// by joining consecutive groups (src/utils/dicteeSegments.js) and playing their
// recordings back to back. So the three listening lengths cost one generation
// and one synthesis between them, and the setting can be changed between
// dictées without anything being regenerated.
//
// The scoring runs here, in the browser, on the text the server already sent.
// That matches how the rest of the app works (the question bank ships its own
// answer keys too) and means the final report appears instantly, with no round
// trip between the last segment and the verdict.

export const SPEEDS = [0.6, 0.8, 1, 1.2];
export const DEFAULT_SPEED = 1;

// A beat between the recordings that make up one segment. Azure already leaves
// a little silence at the end of each clip; this adds just enough that two
// groups read back to back sound like a reader phrasing a sentence rather than
// like two files playing.
const GAP_MS = 130;

const MODE_KEY = "passerelle-dictee-mode";

const storedMode = () => {
  try { return localStorage.getItem(MODE_KEY) || DEFAULT_SEGMENT_MODE; } catch { return DEFAULT_SEGMENT_MODE; }
};

export function useDictee() {
  const { user, notify, t } = useApp();

  const [phase, setPhase] = useState("idle"); // idle | loading | typing | done
  const [dictee, setDictee] = useState(null);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState([]); // diffSentence() per validated segment
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [mode, setModeState] = useState(storedMode);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [history, setHistory] = useState([]);
  const [library, setLibrary] = useState(null); // { today, library, budget } or null while loading

  const urlsRef = useRef([]); // object URLs, one per sense group
  const playerRef = useRef(null);
  const runRef = useRef(0); // cancels an in-flight playback queue
  const startedAtRef = useRef(null);
  const savedRef = useRef(false);

  // Remembered across dictées: someone who needs short segments needs them
  // every time, and re-choosing on every visit is a small tax on exactly the
  // candidate who is finding the exercise hardest.
  const setMode = useCallback((id) => {
    setModeState(id);
    try { localStorage.setItem(MODE_KEY, id); } catch { /* storage full/blocked */ }
  }, []);

  /* ---- past sessions: shown on the intro, and used to avoid repeats ---- */
  useEffect(() => {
    let live = true;
    listDicteeSessions(user?.id).then(({ sessions }) => live && setHistory(sessions));
    return () => { live = false; };
  }, [user?.id]);

  /* ---- what can be started right now ---- */
  // Today's three and the library behind them, with the day's remaining budget
  // for sujets nobody has dictated yet. Everything in both lists is already
  // written and recorded, so the picker can offer them without any warning.
  const loadLibrary = useCallback(() => {
    fetchDicteeLibrary()
      .then(setLibrary)
      .catch(() => setLibrary({ today: [], library: [], budget: { remaining: 0, total: 0, used: 0 } }));
  }, []);

  useEffect(loadLibrary, [loadLibrary]);

  /* ---- audio lifetime ---- */
  // Object URLs pin their blobs for as long as the tab lives, so every one
  // handed out here is revoked when the dictée is replaced or the page closes.
  const releaseAudio = useCallback(() => {
    runRef.current++; // any queue still walking its way through a segment stops here
    playerRef.current?.pause();
    playerRef.current = null;
    for (const url of urlsRef.current) if (url) URL.revokeObjectURL(url);
    urlsRef.current = [];
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => releaseAudio, [releaseAudio]);

  /* ------------------------------- segments ------------------------------- */

  // What the candidate actually hears and types, one entry per turn. Rebuilt if
  // the mode changes — which the page only allows before a dictée starts, so
  // this never renumbers an exercise in progress.
  const segments = useMemo(
    () => (dictee ? buildSegments(dictee.groups, segmentMode(mode).target) : []),
    [dictee, mode],
  );

  /* --------------------------------- start -------------------------------- */

  // `sujetKey` names the sujet the candidate picked. Omitting it lets the
  // server draw one, which it does from the whole archive — so the picker
  // always passes a key, and the serverless draw stays as the fallback for a
  // browser that could not read the library at all.
  const start = useCallback(async (task, sujetKey = null) => {
    releaseAudio();
    setPhase("loading");
    setError(null);
    setDictee(null);
    setResults([]);
    setIndex(0);
    setDraft("");
    setPlays(0);
    savedRef.current = false;
    try {
      const data = await fetchDictee({ task, sujetKey, exclude: recentSujetKeys(history) });
      urlsRef.current = (data.audio || []).map((b64) => audioUrlFromBase64(b64, data.audioMime));
      setDictee(data);
      startedAtRef.current = Date.now();
      setPhase("typing");
      // A fresh text may have just been minted, which spends a slot and adds a
      // row — both of which the intro shows.
      loadLibrary();
    } catch (err) {
      // A local `vite dev` has no serverless routes, so the endpoint 404s.
      // Say so plainly instead of blaming the candidate's connection.
      const msg = err instanceof AiError && err.status === 404
        ? t("La dictée nécessite les fonctions serveur : lancez `vercel dev` plutôt que `vite`.")
        : err?.message || t("La dictée n'a pas pu être préparée.");
      setError(msg);
      setPhase("idle");
      notify(msg);
      loadLibrary();
    }
  }, [history, notify, releaseAudio, t, loadLibrary]);

  /* --------------------------------- audio -------------------------------- */

  // Plays the recordings of one segment in order. `run` is the token taken when
  // the segment started: anything that interrupts playback (a replay, a
  // validation, leaving the page) bumps runRef, and every step of the queue
  // checks it before doing anything — without that, a queue abandoned mid-way
  // would carry on speaking over the segment that replaced it.
  const playQueue = useCallback((from, to, at, run) => {
    if (run !== runRef.current) return;
    if (at > to) { setPlaying(false); return; }

    const next = () => {
      if (run !== runRef.current) return;
      // The gap is what makes two groups sound like one phrased sentence.
      if (at < to) setTimeout(() => playQueue(from, to, at + 1, run), GAP_MS);
      else setPlaying(false);
    };

    const url = urlsRef.current[at];

    // No recording for this group (Azure unconfigured, or a synthesis that
    // failed): read it with the browser's own voice rather than dropping it.
    // Worse quality, same exercise.
    if (!url) {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        // Nothing can voice this group. Say so — a dictée whose play button
        // silently does nothing looks like a broken page, and the candidate
        // would sit there pressing it.
        setPlaying(false);
        notify(t("Aucune voix française sur ce navigateur : essayez Microsoft Edge ou installez une voix française dans votre système."));
        return;
      }
      const utter = new window.SpeechSynthesisUtterance(dictee.groups[at]);
      utter.lang = "fr-CA";
      utter.rate = speed;
      utter.onend = next;
      utter.onerror = next;
      window.speechSynthesis.speak(utter);
      return;
    }

    const player = playerRef.current || new window.Audio();
    playerRef.current = player;
    player.src = url;
    player.currentTime = 0;
    // Pitch preservation is the default per spec, but stating it here is the
    // difference between a slower voice and a lower one — and at 0.6× an
    // unpreserved pitch sounds like a different speaker, which is exactly the
    // wrong thing to train an ear on.
    player.preservesPitch = true;
    player.mozPreservesPitch = true;
    player.webkitPreservesPitch = true;
    player.playbackRate = speed;
    player.onended = next;
    player.play().catch(() => { if (run === runRef.current) setPlaying(false); });
  }, [dictee, speed, notify, t]);

  const play = useCallback(() => {
    const segment = segments[index];
    if (!segment) return;
    const run = ++runRef.current; // cancels whatever was playing before
    window.speechSynthesis?.cancel();
    setPlays((n) => n + 1);
    setPlaying(true);
    playQueue(segment.from, segment.to, segment.from, run);
  }, [segments, index, playQueue]);

  // Changing speed mid-segment applies to the audio already loaded, so the
  // candidate can slow a segment down without restarting it.
  useEffect(() => {
    if (playerRef.current) playerRef.current.playbackRate = speed;
  }, [speed]);

  const stopAudio = useCallback(() => {
    runRef.current++;
    playerRef.current?.pause();
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }, []);

  /* ------------------------------- answering ------------------------------ */

  // Validating scores the segment and moves straight on. The correction is
  // NOT shown here: seeing the answer after every segment turns a dictation
  // into a series of little quizzes, tells the candidate mid-exercise which
  // way their ear is failing, and — because the segments of one text share
  // vocabulary and register — hands them the next segment's spellings. The
  // whole correction arrives at the end, in one piece, like a real dictée.
  const validate = useCallback(() => {
    if (!segments.length) return;
    const diff = diffSentence(segments[index].text, draft);
    setResults((prev) => [...prev.slice(0, index), diff]);
    stopAudio();
    if (index + 1 >= segments.length) { setPhase("done"); return; }
    setIndex((i) => i + 1);
    setDraft("");
  }, [segments, draft, index, stopAudio]);

  // Ends the dictée early. The segment in progress is scored on whatever has
  // been typed, and every segment not reached is scored as unanswered rather
  // than dropped: stopping at segment four of ten is a result, and silently
  // rescoring it out of four would hide that.
  const finish = useCallback(() => {
    if (!segments.length) return;
    const done = [...results.slice(0, index), diffSentence(segments[index].text, draft)];
    const skipped = segments.slice(done.length).map((s) => diffSentence(s.text, ""));
    setResults([...done, ...skipped]);
    stopAudio();
    setPhase("done");
  }, [segments, draft, index, results, stopAudio]);

  const reset = useCallback(() => {
    releaseAudio();
    setPhase("idle");
    setDictee(null);
    setResults([]);
    setIndex(0);
    setDraft("");
    setPlays(0);
  }, [releaseAudio]);

  /* -------------------------------- scoring ------------------------------- */

  const summary = useMemo(() => (results.length ? summarize(results) : null), [results]);

  // Recorded once, when the dictée reaches its end. `savedRef` rather than a
  // dependency on `phase` alone: this effect re-runs whenever the summary
  // object is rebuilt, and a second insert would double-count the session in
  // the streak and the XP total.
  useEffect(() => {
    if (phase !== "done" || !summary || !dictee || savedRef.current) return;
    savedRef.current = true;
    releaseAudio();
    recordDicteeSession(user?.id, {
      dicteeId: dictee.id,
      sujetKey: dictee.sujetKey,
      task: dictee.task,
      // Stored because it is what makes two scores comparable: the same text at
      // "Débutant" and at "Examen" are not the same exercise.
      segmentMode: mode,
      sentences: results.length,
      words: summary.words,
      correct: summary.correct,
      accentErrors: summary.accentErrors,
      score: summary.score,
      plays,
      speed,
      durationSec: startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : null,
      errors: summary.errors,
    }).then(() => listDicteeSessions(user?.id)).then(({ sessions }) => setHistory(sessions));
  }, [phase, summary, dictee, plays, speed, mode, results.length, user?.id, releaseAudio]);

  return {
    phase, dictee, error, index, draft, setDraft, results, summary, history,
    library, speed, setSpeed, mode, setMode, plays, playing, segments,
    segmentCount: segments.length,
    playsPerSegment: results.length ? Math.round((plays / results.length) * 10) / 10 : 0,
    start, play, validate, finish, reset, reloadLibrary: loadLibrary,
  };
}
