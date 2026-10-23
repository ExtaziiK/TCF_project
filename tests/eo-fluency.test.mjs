// Fluency measured on the audio (api/_lib/fluency.js): hesitations and pauses
// used to vanish from the transcript, so a halting candidate graded like a
// fluent one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { measureFluency, aggregateFluency, sanitizeFluency, countFillers, fluencyBrief, FILLER_PROMPT } from "../api/_lib/fluency.js";

process.env.VITE_SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test";
const eo = await import("../api/expression-orale.js");

// Words at the given [start, end] times, in seconds.
const words = (...spans) => spans.map(([start, end], i) => ({ word: `m${i}`, start, end }));

test("hesitations are counted, but not the past participle « eu »", () => {
  assert.equal(countFillers("Euh, je pense que, heu, hum... j'ai eu de la chance, euhhh"), 4);
});

test("long pauses, the delay before answering and the speech rate are measured", () => {
  const m = measureFluency({
    text: "Alors euh je travaille dans une banque depuis cinq ans",
    words: words([2, 2.4], [2.5, 2.8], [2.9, 3.2], [7, 7.5], [7.6, 8], [8.1, 8.4], [8.5, 9], [9.1, 9.5], [9.6, 10], [10.1, 10.5]),
    duration: 14,
  });
  assert.equal(m.startDelay, 2); // took 2 s to start
  assert.equal(m.pauses, 1); // the 3.8 s gap
  assert.equal(m.longestPause, 3.8);
  assert.equal(m.fillers, 1);
  assert.equal(m.words, 9); // fillers are not words
  // 8.5 s from first to last word, minus the 3.8 s silence
  assert.equal(m.speechSecs, 4.7);
  assert.equal(m.spanSecs, 8.5);
  assert.equal(m.recSecs, 14);
});

test("silence after the last word (reaching for the button) is not a pause", () => {
  const m = measureFluency({ text: "Bonjour madame", words: words([0.5, 1], [1.1, 1.6]), duration: 12 });
  assert.equal(m.pauses, 0);
});

test("without timings there are no measures rather than invented ones", () => {
  assert.equal(measureFluency({ text: "Bonjour", words: [], segments: [] }), null);
});

test("segments flagged as silence by Whisper are ignored when there are no word timings", () => {
  const m = measureFluency({
    text: "Bonjour, je voudrais des informations",
    segments: [{ start: 0, end: 3, no_speech_prob: 0.9 }, { start: 3.5, end: 6, no_speech_prob: 0.05 }],
  });
  assert.equal(m.startDelay, 3.5);
});

test("the tâche's figures add up every answer, rates per minute of speech", () => {
  const agg = aggregateFluency([
    { recSecs: 40, speechSecs: 30, spanSecs: 30, words: 60, pauses: 1, longestPause: 4, startDelay: 1, fillers: 3 },
    { recSecs: 40, speechSecs: 30, spanSecs: 30, words: 60, pauses: 2, longestPause: 6, startDelay: 3, fillers: 3 },
  ]);
  assert.equal(agg.wpm, 120);
  assert.equal(agg.pauses, 3);
  assert.equal(agg.pausesPerMin, 3);
  assert.equal(agg.longestPause, 6);
  assert.equal(agg.avgStartDelay, 2);
  assert.equal(agg.fillersPerMin, 6);
  assert.equal(aggregateFluency([]), null);
});

test("pauses are counted per minute of answering, not per minute of speech", () => {
  // 12 s of speech spread over 24 s with 2 long pauses: 5 per minute, not 10.
  const agg = aggregateFluency([{ recSecs: 28, speechSecs: 12, spanSecs: 24, words: 25, pauses: 2, longestPause: 5, startDelay: 2, fillers: 4 }]);
  assert.equal(agg.pausesPerMin, 5);
  assert.equal(agg.wpm, 125);
});

test("measures echoed by the client are clamped", () => {
  const [m] = sanitizeFluency([{ recSecs: 1e9, words: -5, pauses: "x" }]);
  assert.equal(m.recSecs, 600);
  assert.equal(m.words, 0);
  assert.equal(m.pauses, 0);
  assert.deepEqual(sanitizeFluency("nope"), []);
});

test("the grader reads the measures, and is told how to weigh them", () => {
  const brief = fluencyBrief(aggregateFluency([{ recSecs: 60, speechSecs: 45, words: 70, pauses: 4, longestPause: 7, startDelay: 2, fillers: 9 }]));
  assert.match(brief, /pauses de plus de 3 s : 4/);
  assert.match(brief, /93 mots par minute/);
  assert.equal(fluencyBrief(null), "");
  const sys = eo.finalSystem("fr", 2);
  assert.match(sys, /FLUENCY/);
  assert.match(sys, /never penalise them/);
  assert.doesNotMatch(sys, /fluency are invisible/);
});

test("Whisper is primed to keep the hesitations", () => {
  assert.ok(countFillers(FILLER_PROMPT) >= 2);
});
