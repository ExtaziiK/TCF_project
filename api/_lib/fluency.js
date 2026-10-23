// Fluency measures for the Expression orale, taken from the audio rather than
// guessed from the text: how long the candidate actually spoke, their speech
// rate, their long pauses, their hesitations ("euh", "hum") and how long they
// took to start answering once the examiner had finished.
//
// A transcript alone hides all of this: Whisper writes a clean text, so a
// candidate who stops every few seconds read exactly like a fluent one. With
// word timestamps (verbose_json) and a prompt that keeps the fillers, the
// grader gets numbers to weigh — indicative ones (Whisper's timings are
// approximate), which is how the grader is told to use them.

// A pause long enough that a rater hears the candidate searching for words.
export const LONG_PAUSE_SECS = 3;
// Gaps shorter than this are ordinary breathing between words, not silence.
const MICRO_GAP_SECS = 1;

// Filler words a French speaker uses to hold the floor. "euh" needs its h:
// "eu" alone is the past participle of avoir ("j'ai eu").
const FILLER_RE = /\b(?:euh+|heu+|hum+|hmm+|mmh*|bah|ben)\b/gi;

// What Whisper is primed with so it writes the hesitations down instead of
// cleaning them away (Whisper imitates the style of its prompt). On silence
// Whisper may echo it back: api/expression-orale.js treats that as nothing said.
export const FILLER_PROMPT = "Euh… alors, euh, je pense que… hum, comment dire… voilà.";

export const countFillers = (text) => (String(text || "").match(FILLER_RE) || []).length;
export const stripFillers = (text) => String(text || "").replace(FILLER_RE, " ");

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const round1 = (n) => Math.round(n * 10) / 10;

// Timed units of speech, best source first: words, else segments that are not
// flagged as silence by Whisper itself.
function timedUnits({ words, segments }) {
  const ws = (Array.isArray(words) ? words : [])
    .map((w) => ({ start: num(w?.start), end: num(w?.end) }))
    .filter((w) => w.start !== null && w.end !== null && w.end >= w.start);
  if (ws.length) return ws;
  return (Array.isArray(segments) ? segments : [])
    .filter((s) => !(num(s?.no_speech_prob) > 0.6))
    .map((s) => ({ start: num(s?.start), end: num(s?.end) }))
    .filter((s) => s.start !== null && s.end !== null && s.end >= s.start);
}

// One recording -> its measures, or null when the transcription carried no
// timings (the plain-text fallback): no numbers beats invented ones.
export function measureFluency({ text, words, segments, duration }) {
  const units = timedUnits({ words, segments }).sort((a, b) => a.start - b.start);
  if (!units.length) return null;
  const wordCount = stripFillers(text).split(/\s+/).filter((w) => /[a-zà-ÿ0-9]/i.test(w)).length;
  let pauses = 0;
  let longest = 0;
  let silent = 0;
  for (let i = 1; i < units.length; i++) {
    const gap = units[i].start - units[i - 1].end;
    if (gap >= MICRO_GAP_SECS) silent += gap;
    if (gap >= LONG_PAUSE_SECS) pauses += 1;
    if (gap > longest) longest = gap;
  }
  const span = units[units.length - 1].end - units[0].start;
  const speechSecs = Math.max(0, span - silent);
  // spanSecs: first word to last, pauses included — what "per minute" rates
  // are taken over, as a listener experiences them.
  // Silence after the last word is the candidate reaching for the "done"
  // button, not hesitation: only the delay before the first word counts.
  return {
    recSecs: round1(num(duration) ?? units[units.length - 1].end),
    speechSecs: round1(speechSecs),
    spanSecs: round1(span),
    words: wordCount,
    pauses,
    longestPause: round1(longest),
    startDelay: round1(units[0].start),
    fillers: countFillers(text),
  };
}

// The client keeps each answer's measures and sends them back with the
// dialogue; clamp them so a tampered payload stays a plausible one.
export function sanitizeFluency(raw) {
  if (!Array.isArray(raw)) return [];
  const clamp = (v, max) => Math.max(0, Math.min(max, num(v) ?? 0));
  return raw.slice(0, 40).filter((m) => m && typeof m === "object").map((m) => ({
    recSecs: clamp(m.recSecs, 600),
    speechSecs: clamp(m.speechSecs, 600),
    spanSecs: clamp(m.spanSecs ?? m.speechSecs, 600),
    words: Math.round(clamp(m.words, 3000)),
    pauses: Math.round(clamp(m.pauses, 200)),
    longestPause: clamp(m.longestPause, 600),
    startDelay: clamp(m.startDelay, 600),
    fillers: Math.round(clamp(m.fillers, 1000)),
  }));
}

// The whole tâche: every answer's measures added up. The speech rate is per
// minute of actual speech; pauses and hesitations are per minute of answering
// (first word to last, pauses included), as a listener counts them —
// otherwise the pauses would shrink the very minutes they are counted over.
export function aggregateFluency(list) {
  const ms = (list || []).filter(Boolean);
  if (!ms.length) return null;
  const sum = (k) => ms.reduce((s, m) => s + (m[k] || 0), 0);
  const speechMin = sum("speechSecs") / 60;
  const spanMin = ms.reduce((s, m) => s + (m.spanSecs ?? m.speechSecs ?? 0), 0) / 60;
  const perSpanMin = (n) => (spanMin > 0 ? round1(n / spanMin) : 0);
  return {
    answers: ms.length,
    recSecs: Math.round(sum("recSecs")),
    speechSecs: Math.round(sum("speechSecs")),
    wpm: speechMin > 0 ? Math.round(sum("words") / speechMin) : 0,
    pauses: sum("pauses"),
    pausesPerMin: perSpanMin(sum("pauses")),
    longestPause: round1(Math.max(...ms.map((m) => m.longestPause || 0))),
    avgStartDelay: round1(sum("startDelay") / ms.length),
    fillers: sum("fillers"),
    fillersPerMin: perSpanMin(sum("fillers")),
  };
}

const mmss = (secs) => {
  const s = Math.round(secs);
  return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s` : `${s} s`;
};

// The measures as the grader reads them, in French like the rest of its input.
export function fluencyBrief(agg) {
  if (!agg) return "";
  return [
    `Mesures de fluidité (prises sur l'audio, indicatives) :`,
    `- temps de parole effectif : ${mmss(agg.speechSecs)} sur ${mmss(agg.recSecs)} d'enregistrement, en ${agg.answers} intervention(s) ;`,
    `- débit : ${agg.wpm} mots par minute de parole ;`,
    `- pauses de plus de ${LONG_PAUSE_SECS} s : ${agg.pauses} (${agg.pausesPerMin} par minute), la plus longue : ${agg.longestPause} s ;`,
    `- hésitations (« euh », « hum »...) : ${agg.fillers} (${agg.fillersPerMin} par minute) ;`,
    `- délai moyen avant de commencer à répondre : ${agg.avgStartDelay} s.`,
  ].join("\n");
}
