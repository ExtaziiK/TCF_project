// Text-to-speech for the AI examiner, via the browser's SpeechSynthesis API.
// Groq exposes no French TTS today (PlayAI is English/Arabic only), so the
// examiner's voice is synthesized locally: free, offline, no extra serverless
// function — at the cost of voice quality varying by OS/browser. Swapping in
// a server TTS later only means replacing `speak` with an audio fetch+play.

const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

// getVoices() is empty until the browser loads its voice list (async on
// Chrome); warm it up and refresh on voiceschanged.
let voices = [];
function refreshVoices() {
  try { voices = window.speechSynthesis.getVoices() || []; } catch { voices = []; }
}
if (canSpeak()) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

// Not all French voices are equal: browsers list legacy robotic voices (e.g.
// Windows SAPI "Hortense") alongside neural ones (Edge's "... Natural",
// Chrome's "Google français", Safari's "Enhanced"). Rank by quality first —
// a natural fr-FR voice beats a robotic fr-CA one — with fr-CA only as a
// tiebreak (TCF Canada oblige).
function scoreVoice(v) {
  const name = v.name.toLowerCase();
  let s = 0;
  if (/natural|neural/.test(name)) s += 8; // Edge neural voices
  if (/premium|enhanced/.test(name)) s += 6; // Safari high-quality voices
  if (/google/.test(name)) s += 5; // Chrome's "Google français"
  if (!v.localService) s += 3; // network voices are usually neural
  if (/^fr[-_]ca/i.test(v.lang)) s += 1;
  return s;
}

function pickFrenchVoice() {
  if (!voices.length) refreshVoices();
  const fr = voices.filter((v) => /^fr([-_]|$)/i.test(v.lang));
  if (!fr.length) return null;
  return fr.reduce((best, v) => (scoreVoice(v) > scoreVoice(best) ? v : best));
}

// The model occasionally emits typographic characters that trip TTS engines
// (non-breaking hyphens read as silence or "tiret", stray markdown emphasis).
function cleanForSpeech(text) {
  return text
    .replace(/[‑‐]/g, "-") // non-breaking / typographic hyphens
    .replace(/[\u00a0\u202f]/g, " ") // (narrow) no-break spaces
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Chrome fires voiceschanged late on first load; wait briefly for the list
// rather than speaking with the engine's default (often an English voice
// mangling the French text).
function whenVoicesReady(cb) {
  if (voices.length) { cb(); return; }
  refreshVoices();
  if (voices.length) { cb(); return; }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    window.speechSynthesis.removeEventListener?.("voiceschanged", go);
    refreshVoices();
    cb();
  };
  window.speechSynthesis.addEventListener?.("voiceschanged", go);
  setTimeout(go, 1500);
}

// Speaks `text` in French and always calls `onEnd` exactly once — on normal
// completion, on error, on cancel, or immediately when TTS is unavailable
// (the caller uses it to advance the interview state machine).
export function speak(text, onEnd) {
  const cleaned = canSpeak() ? cleanForSpeech(text || "") : "";
  if (!cleaned) { onEnd?.(); return; }
  const synth = window.speechSynthesis;
  synth.cancel(); // never queue behind a previous utterance

  let ended = false;
  const finish = () => { if (!ended) { ended = true; onEnd?.(); } };

  whenVoicesReady(() => {
    if (ended) return;
    const u = new window.SpeechSynthesisUtterance(cleaned);
    const voice = pickFrenchVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang || "fr-FR";
    // Neural voices sound best at natural speed; robotic ones gain a lot of
    // intelligibility from a slight slowdown.
    u.rate = voice && scoreVoice(voice) >= 5 ? 1 : 0.92;
    u.onend = finish;
    u.onerror = finish;
    try { synth.speak(u); } catch { finish(); }
  });
}

export function stopSpeaking() {
  if (canSpeak()) { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }
}
