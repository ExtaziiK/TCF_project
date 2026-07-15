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

function pickFrenchVoice() {
  if (!voices.length) refreshVoices();
  const fr = voices.filter((v) => /^fr([-_]|$)/i.test(v.lang));
  return (
    fr.find((v) => /^fr[-_]CA/i.test(v.lang)) || // examen « Canada » oblige
    fr.find((v) => v.default) ||
    fr[0] ||
    null
  );
}

// Speaks `text` in French and always calls `onEnd` exactly once — on normal
// completion, on error, on cancel, or immediately when TTS is unavailable
// (the caller uses it to advance the interview state machine).
export function speak(text, onEnd) {
  if (!canSpeak() || !text) { onEnd?.(); return; }
  const synth = window.speechSynthesis;
  synth.cancel(); // never queue behind a previous utterance

  const u = new window.SpeechSynthesisUtterance(text);
  const voice = pickFrenchVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang || "fr-FR";
  u.rate = 0.95;

  let ended = false;
  const finish = () => { if (!ended) { ended = true; onEnd?.(); } };
  u.onend = finish;
  u.onerror = finish;
  try { synth.speak(u); } catch { finish(); }
}

export function stopSpeaking() {
  if (canSpeak()) { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }
}
