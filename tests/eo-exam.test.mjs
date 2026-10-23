// The Expression orale simulation follows the real exam: official timings,
// the examiner speaking first where they do, a behaviour per tâche, and an
// interview that ends on time rather than after a fixed number of exchanges.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EO_TIMINGS, openingLine, openingIsQuestion } from "../api/_lib/eoLines.js";

// api/expression-orale.js pulls in the Supabase client, which refuses to load
// without a URL; nothing here reaches the network.
process.env.VITE_SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test";
const eo = await import("../api/expression-orale.js");

test("the three tâches add up to the official 12 minutes", () => {
  const total = Object.values(EO_TIMINGS).reduce((s, { prep, dur }) => s + prep + dur, 0);
  assert.equal(total, 12 * 60);
});

test("Tâche 2 is 5 min 30 including its 2 minutes of preparation", () => {
  assert.equal(EO_TIMINGS[2].prep, 120);
  assert.equal(EO_TIMINGS[2].prep + EO_TIMINGS[2].dur, 330);
});

test("the examiner asks the Tâche 1 and 3 questions out loud", () => {
  assert.ok(openingIsQuestion(1) && openingIsQuestion(3) && !openingIsQuestion(2));
  assert.match(openingLine(1, "Présentez-vous."), /Présentez-vous\./);
  assert.match(openingLine(3, "Faut-il interdire les voitures en ville ?"), /Faut-il interdire les voitures en ville \?/);
});

test("in Tâche 2 the candidate opens the role-play; the exam only announces the part", () => {
  assert.equal(openingLine(2, "Vous appelez un club de sport."), "");
  const announce = openingLine(2, "Vous appelez un club de sport.", { exam: true });
  assert.match(announce, /deux minutes/);
  assert.doesNotMatch(announce, /club de sport/); // the subject is on the card, not read out
});

test("the full exam opens with the welcome and the 12 minutes", () => {
  assert.match(openingLine(1, "Présentez-vous.", { exam: true }), /douze minutes/);
});

test("a subject can't stretch an opening line without limit", () => {
  assert.ok(openingLine(3, "x".repeat(5000)).length < 1100);
});

test("each tâche gets its own examiner behaviour", () => {
  assert.equal(eo.replySystem(1), eo.t1System);
  assert.equal(eo.replySystem(2), eo.followUpSystem);
  assert.equal(eo.replySystem(3), eo.t3System);
  assert.equal(eo.dialogueTask("nonsense"), 2);
});

test("the Tâche 2 interlocutor answers with concrete information", () => {
  assert.match(eo.followUpSystem, /CONCRÈTE/);
  assert.doesNotMatch(eo.followUpSystem, /Ne pose aucune question/);
});

test("the grade is briefed for the tâche that was actually taken", () => {
  assert.match(eo.finalSystem("fr", 1), /Entretien dirigé/);
  assert.match(eo.finalSystem("fr", 3), /point de vue/);
  assert.match(eo.finalSystem("en", 2), /Interaction/);
  assert.match(eo.finalSystem("en", 2), /feedback in English/);
});

test("the interview is not cut after three exchanges", () => {
  const history = Array.from({ length: 6 }, (_, i) => ({ role: i % 2 ? "examiner" : "candidate", text: `ligne ${i}` }));
  assert.equal(eo.dialogueWillGrade({ history }), false);
  assert.equal(eo.dialogueWillGrade({ history, final: true }), true);
});

test("the safety ceiling still ends a runaway interview", () => {
  const history = Array.from({ length: eo.MAX_EXCHANGES * 2 }, (_, i) => ({ role: i % 2 ? "examiner" : "candidate", text: `ligne ${i}` }));
  assert.equal(eo.dialogueWillGrade({ history }), true);
});
