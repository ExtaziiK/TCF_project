import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { LONG_PAUSE_SECS } from "../../../api/_lib/fluency.js";

const BARS = 32;
// Loudness (RMS of the waveform, 0..1) that counts as speech: well above a
// quiet room, but adapted upward when the room is noisier (see noiseFloor).
const MIN_SPEECH_RMS = 0.015;
// How long the level has to stay low before it reads as silence rather than
// the gap between two words.
const SILENCE_AFTER_SECS = 0.6;

// The candidate's live microphone while they answer: bars that rise and fall
// with their voice, scrolling like a recording, so they can see when they are
// speaking and when they have gone quiet. With `countSilence` (practice mode),
// a pause long enough to be counted in the grade (LONG_PAUSE_SECS, the same
// threshold as api/_lib/fluency.js) shows how long it has lasted.
//
// It also ends the turn the way a conversation does: `endAfter` seconds of
// silence once the candidate has spoken (or `beforeSpeechEndAfter` if they
// never started) calls `onSilenceEnd(seconds)`, once, with a countdown shown
// for the last two seconds so it never comes as a surprise.
// `warnSilence` (Tâche 3 once the examiner has no relance left): no one will
// step in any more, so a long silence says plainly that it costs points.
// Reads the stream only — nothing is recorded or sent from here.
export function MicLevel({ stream, active, countSilence = false, warnSilence = false, endAfter = 0, beforeSpeechEndAfter = 0, onSilenceEnd }) {
  const { c, t } = useApp();
  const barsRef = useRef([]);
  const [state, setState] = useState({ speaking: false, silence: 0, heard: false });
  // The latest callback, without restarting the audio graph on every render.
  const onEndRef = useRef(onSilenceEnd);
  onEndRef.current = onSilenceEnd;

  useEffect(() => {
    if (!stream || !active) return undefined;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return undefined;
    let ctx;
    try { ctx = new AudioCtx(); } catch { return undefined; }
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    ctx.resume?.().catch(() => {});

    const samples = new Float32Array(analyser.fftSize);
    const history = new Array(BARS).fill(0);
    let noiseFloor = 0.01;
    let lastVoice = window.performance.now();
    let heard = false; // the candidate has spoken in this turn
    let ended = false;
    let lastShown = 0;
    let lastBarStep = 0;
    let frame;

    const tick = (now) => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      const rms = Math.sqrt(sum / samples.length);
      // The room's own level: follows quiet moments quickly, loud ones slowly.
      noiseFloor = rms < noiseFloor ? noiseFloor * 0.9 + rms * 0.1 : noiseFloor * 0.999 + rms * 0.001;
      const voiced = rms > Math.max(MIN_SPEECH_RMS, noiseFloor * 2.5);
      if (voiced) { lastVoice = now; heard = true; }
      const quietSecs = (now - lastVoice) / 1000;
      const limit = heard ? endAfter : beforeSpeechEndAfter;
      if (!ended && limit > 0 && quietSecs >= limit) {
        ended = true;
        onEndRef.current?.(Math.round(quietSecs * 10) / 10);
      }

      // A new bar about every 60 ms, oldest on the left.
      if (now - lastBarStep > 60) {
        lastBarStep = now;
        history.shift();
        history.push(Math.min(1, rms * 9));
        history.forEach((level, i) => {
          const el = barsRef.current[i];
          if (el) el.style.transform = `scaleY(${Math.max(0.06, level)})`;
        });
      }
      // The label updates a few times a second, not every frame.
      if (now - lastShown > 250) {
        lastShown = now;
        setState({ speaking: quietSecs < SILENCE_AFTER_SECS, silence: quietSecs >= SILENCE_AFTER_SECS ? quietSecs : 0, heard });
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      try { source.disconnect(); } catch { /* already gone */ }
      ctx.close?.().catch(() => {});
      setState({ speaking: false, silence: 0, heard: false });
    };
  }, [stream, active, endAfter, beforeSpeechEndAfter]);

  if (!active) return null;
  const longPause = (countSilence || warnSilence) && state.silence >= LONG_PAUSE_SECS;
  // The turn is about to close on silence: say so for its last two seconds.
  const limit = state.heard ? endAfter : beforeSpeechEndAfter;
  const endsIn = limit > 0 && state.silence > 0 && limit - state.silence <= 2 ? Math.max(1, Math.ceil(limit - state.silence)) : 0;
  const label = state.speaking
    ? t("Vous parlez")
    : endsIn
      ? `${t("Fin de votre tour dans")} ${endsIn} s…`
      : longPause
        ? `${t("Silence")} · ${Math.floor(state.silence)} s${warnSilence ? ` — ${t("continuez à parler, le silence vous coûte des points")}` : ""}`
        : t("…");
  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-2" aria-hidden="true">
      <div className="flex items-center justify-center gap-[3px] h-14 w-full">
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            ref={(el) => { barsRef.current[i] = el; }}
            className={`w-1.5 h-full rounded-full origin-center transition-transform duration-75 ${state.speaking ? "bg-emerald-500" : longPause ? "bg-amber-500" : "bg-slate-400/60"}`}
            style={{ transform: "scaleY(0.06)" }}
          />
        ))}
      </div>
      <p className={`text-xs font-semibold min-h-4 text-center ${endsIn || longPause ? "text-amber-600" : state.speaking ? "text-emerald-600" : c.faint}`}>{label}</p>
    </div>
  );
}
