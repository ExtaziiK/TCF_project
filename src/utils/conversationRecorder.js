// Records a whole Expression orale tâche as ONE audio file that sounds like
// the conversation it was: the candidate's microphone and the examiner's
// voice, mixed live in a Web Audio graph and captured by a single
// MediaRecorder. The interview pauses it while our server works on an answer
// and during the Tâche 2 preparation, so the file holds the exchange, not the
// waiting.
//
// Mixing live (rather than stitching the per-answer recordings afterwards)
// keeps it to one compressed file with no re-encoding in the browser, and
// the examiner's lines land exactly where they were heard.
//
// The examiner's voice is captured only when it plays through an <audio>
// element routed here (attach); the browser's own speech synthesis, the
// fallback when the server sent no audio, cannot be captured — those lines
// are simply missing from the file. Nothing here ever throws into the
// interview: a recorder that can't start leaves the tâche running as before.

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
const pickMime = () => (typeof MediaRecorder !== "undefined" ? MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m)) : undefined);

export function createConversationRecorder(micStream) {
  const AudioCtx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!AudioCtx || typeof MediaRecorder === "undefined" || !micStream) return null;
  let ctx;
  let recorder;
  try {
    ctx = new AudioCtx();
    const dest = ctx.createMediaStreamDestination();
    // The microphone goes to the recording only, never to the speakers.
    ctx.createMediaStreamSource(micStream).connect(dest);
    const mime = pickMime();
    recorder = new MediaRecorder(dest.stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
    ctx.resume?.().catch(() => {});

    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    let activeMs = 0;
    let since = 0; // when the current running stretch began
    let closed = false;

    return {
      // Recording (or resumed) — the conversation is live.
      run() {
        if (closed) return;
        try {
          if (recorder.state === "inactive") recorder.start(1000);
          else if (recorder.state === "paused") recorder.resume();
          else return;
          since = Date.now();
        } catch { /* recorder refused: the tâche goes on unrecorded */ }
      },
      // Paused — waiting, not talking.
      hold() {
        if (closed || recorder.state !== "recording") return;
        try { recorder.pause(); activeMs += Date.now() - since; } catch { /* ignore */ }
      },
      // Routes an examiner <audio> element through the mix: heard on the
      // speakers AND recorded. Only when the audio graph is running —
      // otherwise the element would go silent, so it plays as usual instead.
      attach(audioEl) {
        if (closed || ctx.state !== "running") return;
        try {
          const src = ctx.createMediaElementSource(audioEl);
          src.connect(ctx.destination);
          src.connect(dest);
        } catch { /* plays unrouted: heard, not recorded */ }
      },
      // Ends the recording: { blob, mime, durationSecs } or null if nothing was captured.
      finish() {
        if (closed) return Promise.resolve(null);
        return new Promise((resolve) => {
          const done = () => {
            closed = true;
            ctx.close?.().catch(() => {});
            const type = recorder.mimeType || mime || "audio/webm";
            const blob = chunks.length ? new Blob(chunks, { type }) : null;
            resolve(blob ? { blob, mime: type, durationSecs: Math.round(activeMs / 1000) } : null);
          };
          if (recorder.state === "recording") activeMs += Date.now() - since;
          if (recorder.state === "inactive") { done(); return; }
          recorder.onstop = done;
          try { recorder.stop(); } catch { done(); }
        });
      },
      // Throws the recording away (task switched, page left).
      discard() {
        if (closed) return;
        closed = true;
        recorder.ondataavailable = null;
        recorder.onstop = null;
        try { if (recorder.state !== "inactive") recorder.stop(); } catch { /* ignore */ }
        ctx.close?.().catch(() => {});
      },
    };
  } catch {
    ctx?.close?.().catch(() => {});
    return null;
  }
}
