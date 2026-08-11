import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { fetchDictee, recordDicteeSession, listDicteeSessions, recentSujetKeys, audioUrlFromBase64, listRecentSujets } from "@/services/dicteeService";
import { diffSentence, summarize } from "@/utils/dicteeDiff";
import { AiError } from "@/services/aiService";

// One dictée, start to finish: draw a text, play it sentence by sentence, score
// each sentence as it is validated, and reveal the whole correction at the end.
//
// Nothing is shown between sentences. A dictation is one continuous exercise:
// correcting it as you go turns it into a string of little quizzes, and — since
// the sentences of a single text share their vocabulary and register — it hands
// the candidate spellings they are about to need.
//
// The scoring runs here, in the browser, on the text the server already sent.
// That matches how the rest of the app works (the question bank ships its own
// answer keys too) and means the final report appears instantly, with no round
// trip between the last sentence and the verdict.

export const SPEEDS = [0.6, 0.8, 1, 1.2];
export const DEFAULT_SPEED = 1;

export function useDictee() {
  const { user, notify, t } = useApp();

  const [phase, setPhase] = useState("idle"); // idle | loading | typing | done
  const [dictee, setDictee] = useState(null);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState([]); // diffSentence() per validated sentence
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [history, setHistory] = useState([]);
  const [months, setMonths] = useState(null); // recent EE months, for the picker

  const urlsRef = useRef([]); // object URLs, one per sentence
  const playerRef = useRef(null);
  const startedAtRef = useRef(null);
  const savedRef = useRef(false);

  /* ---- past sessions: shown on the intro, and used to avoid repeats ---- */
  useEffect(() => {
    let live = true;
    listDicteeSessions(user?.id).then(({ sessions }) => live && setHistory(sessions));
    return () => { live = false; };
  }, [user?.id]);

  /* ---- the sujets on offer: the archive's most recent months ---- */
  // Read straight from the shipped archive, so opening the page costs no
  // request and the list is there before the candidate has chosen a tâche.
  useEffect(() => {
    let live = true;
    listRecentSujets().then((m) => live && setMonths(m)).catch(() => live && setMonths([]));
    return () => { live = false; };
  }, []);

  /* ---- audio lifetime ---- */
  // Object URLs pin their blobs for as long as the tab lives, so every one
  // handed out here is revoked when the dictée is replaced or the page closes.
  const releaseAudio = useCallback(() => {
    playerRef.current?.pause();
    playerRef.current = null;
    for (const url of urlsRef.current) if (url) URL.revokeObjectURL(url);
    urlsRef.current = [];
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => releaseAudio, [releaseAudio]);

  /* --------------------------------- start -------------------------------- */

  // `sujetKey` names the sujet the candidate picked. Omitting it lets the
  // server draw one, which it does from the whole archive — so the picker
  // always passes a key, and the serverless draw stays as the fallback for a
  // browser that could not read the archive at all.
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
    } catch (err) {
      // A local `vite dev` has no serverless routes, so the endpoint 404s.
      // Say so plainly instead of blaming the candidate's connection.
      const msg = err instanceof AiError && err.status === 404
        ? t("La dictée nécessite les fonctions serveur : lancez `vercel dev` plutôt que `vite`.")
        : err?.message || t("La dictée n'a pas pu être préparée.");
      setError(msg);
      setPhase("idle");
      notify(msg);
    }
  }, [history, notify, releaseAudio, t]);

  /* --------------------------------- audio -------------------------------- */

  const play = useCallback(() => {
    if (!dictee) return;
    const url = urlsRef.current[index];
    setPlays((n) => n + 1);
    setPlaying(true);
    window.speechSynthesis?.cancel();

    // No recording for this sentence (Azure unconfigured, or a synthesis that
    // failed): read it with the browser's own voice rather than dropping the
    // sentence. Worse quality, same exercise.
    if (!url) {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        // Nothing can voice this sentence. Say so — a dictée whose play button
        // silently does nothing looks like a broken page, and the candidate
        // would sit there pressing it.
        setPlaying(false);
        notify(t("Aucune voix française sur ce navigateur : essayez Microsoft Edge ou installez une voix française dans votre système."));
        return;
      }
      const utter = new window.SpeechSynthesisUtterance(dictee.sentences[index]);
      utter.lang = "fr-CA";
      utter.rate = speed;
      utter.onend = () => setPlaying(false);
      utter.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(utter);
      return;
    }

    const player = playerRef.current || new window.Audio();
    playerRef.current = player;
    if (player.src !== url) player.src = url;
    player.currentTime = 0;
    // Pitch preservation is the default per spec, but stating it here is the
    // difference between a slower voice and a lower one — and at 0.6× an
    // unpreserved pitch sounds like a different speaker, which is exactly the
    // wrong thing to train an ear on.
    player.preservesPitch = true;
    player.mozPreservesPitch = true;
    player.webkitPreservesPitch = true;
    player.playbackRate = speed;
    player.onended = () => setPlaying(false);
    player.play().catch(() => setPlaying(false));
  }, [dictee, index, speed, notify, t]);

  // Changing speed mid-sentence applies to the audio already loaded, so the
  // candidate can slow a sentence down without restarting it.
  useEffect(() => {
    if (playerRef.current) playerRef.current.playbackRate = speed;
  }, [speed]);

  /* ------------------------------- answering ------------------------------ */

  // Validating scores the sentence and moves straight on. The correction is
  // NOT shown here: seeing the answer after every sentence turns a dictation
  // into a series of little quizzes, tells the candidate mid-exercise which
  // way their ear is failing, and — because the sentences of one text share
  // vocabulary and register — hands them the next sentence's spellings. The
  // whole correction arrives at the end, in one piece, like a real dictée.
  const validate = useCallback(() => {
    if (!dictee) return;
    const diff = diffSentence(dictee.sentences[index], draft);
    setResults((prev) => [...prev.slice(0, index), diff]);
    playerRef.current?.pause();
    window.speechSynthesis?.cancel();
    setPlaying(false);
    if (index + 1 >= dictee.sentences.length) { setPhase("done"); return; }
    setIndex((i) => i + 1);
    setDraft("");
  }, [dictee, draft, index]);

  // Ends the dictée early. The sentence in progress is scored on whatever has
  // been typed, and every sentence not reached is scored as unanswered rather
  // than dropped: stopping at sentence four of ten is a result, and silently
  // rescoring it out of four would hide that.
  const finish = useCallback(() => {
    if (!dictee) return;
    const done = [...results.slice(0, index), diffSentence(dictee.sentences[index], draft)];
    const skipped = dictee.sentences.slice(done.length).map((s) => diffSentence(s, ""));
    setResults([...done, ...skipped]);
    setPhase("done");
  }, [dictee, draft, index, results]);

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
      sentences: dictee.sentences.length,
      words: summary.words,
      correct: summary.correct,
      accentErrors: summary.accentErrors,
      score: summary.score,
      plays,
      speed,
      durationSec: startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : null,
      errors: summary.errors,
    }).then(() => listDicteeSessions(user?.id)).then(({ sessions }) => setHistory(sessions));
  }, [phase, summary, dictee, plays, speed, user?.id, releaseAudio]);

  return {
    phase, dictee, error, index, draft, setDraft, results, summary, history,
    months, speed, setSpeed, plays, playing,
    sentenceCount: dictee?.sentences.length || 0,
    playsPerSentence: results.length ? Math.round((plays / results.length) * 10) / 10 : 0,
    start, play, validate, finish, reset,
  };
}
