// The model answer of a subject is ONE text used three ways — the corrigé page,
// the workshop's example, the dictée — so it is held to the grader's rules and
// to the dictée's at once. These pin the measurable half of that contract.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EE_RANGE, examWords, assembleAnswer, structureIssues, dictationIssues, dictationText,
} from "../api/_lib/eeSpec.js";
import { splitGroups } from "../api/_lib/dictee.js";

process.env.VITE_SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test";
const { consigneFor, measuredIssues, passes, nextStepName, newDraft, usableKeywords, quotedFixes, MODEL_PASS } = await import("../api/_lib/eeModelAnswer.js");
const ee = await import("../api/expression-ecrite.js");

const words = (n, w = "mot") => Array.from({ length: n }, () => w).join(" ");

test("the generator and the grader share one set of rules", () => {
  assert.deepEqual(EE_RANGE, { 1: [60, 120], 2: [120, 150], 3: [120, 180] });
  // The grader's brief is the one in eeSpec, re-exported unchanged.
  assert.match(ee.EE_TASK_BRIEFS[3], /TWO REQUIRED PARTS/);
  assert.match(ee.eeSystem("fr", 2), /passé composé/);
});

test("Tâche 3's consigne asks for the comparison AND the opinion", () => {
  const c = consigneFor(3, { t3: { theme: "Les zoos", doc1: "Pour.", doc2: "Contre." } });
  assert.match(c, /Document 1 : Pour\./);
  // France Éducation international's own wording (sample paper EE00demo).
  assert.match(c, /vous présentez les deux opinions avec vos propres mots \(entre 40 et 60 mots\)/);
  assert.match(c, /vous donnez votre position sur le thème général, commun à ces deux opinions \(entre 80 et 120 mots\)/);
  assert.equal(consigneFor(3, { t3: {} }), "");
});

test("a tâche 1 message is assembled with its formulas, and counted like the exam counter", () => {
  const a = assembleAnswer(1, { opening: "Salut Léo,", message: "Je t'écris pour te raconter.\n\nÀ bientôt chez moi.", closing: "À très vite,", signature: "Alex" });
  assert.equal(a.body, "Salut Léo,\n\nJe t'écris pour te raconter.\n\nÀ bientôt chez moi.\n\nÀ très vite,\n\nAlex");
  assert.equal(a.words, examWords(a.body));
  assert.equal(a.title, "");
  assert.deepEqual(structureIssues(1, a).filter((x) => !/mots/.test(x)), []);
  const bare = assembleAnswer(1, { message: words(90) });
  assert.equal(structureIssues(1, bare).length, 3); // opening, closing, signature
});

test("the word range is the official one, title included", () => {
  const over = assembleAnswer(2, { title: "Un titre", body: `${words(50)}\n\n${words(50)}\n\n${words(49)}` });
  assert.equal(over.words, 151);
  assert.match(structureIssues(2, over)[0], /151 mots alors que le maximum est 150/);
  const ok = assembleAnswer(2, { title: "Un titre", body: `${words(45)}\n\n${words(45)}\n\n${words(45)}` });
  assert.deepEqual(structureIssues(2, ok), []);
  const twoParas = assembleAnswer(2, { body: `${words(70)}\n\n${words(70)}` });
  assert.match(structureIssues(2, twoParas).join(" "), /trois/);
});

test("tâche 3 needs both parts, each in its own range", () => {
  const ok = assembleAnswer(3, { title: "Zoos", synthesis: words(50), opinion: `${words(50)}\n\n${words(50)}` });
  assert.deepEqual(structureIssues(3, ok), []);
  const noSynthesis = assembleAnswer(3, { opinion: `${words(70)}\n\n${words(70)}` });
  assert.match(structureIssues(3, noSynthesis).join(" "), /synthèse des deux documents manque/);
  const longSynthesis = assembleAnswer(3, { synthesis: words(80), opinion: words(85) });
  assert.match(structureIssues(3, longSynthesis).join(" "), /synthèse fait 80 mots/);
});

test("a synthesis lifted from the documents is caught", () => {
  const doc1 = "les animaux sauvages ne doivent pas être introduits dans les zoos car ces lieux ne reproduisent pas leur habitat naturel";
  const sujet = { t3: { theme: "Zoos", doc1, doc2: "les zoos offrent de nombreux bénéfices aux espèces menacées" } };
  const a = assembleAnswer(3, { synthesis: `Selon le premier document, ${doc1}. ${words(25)}`, opinion: words(90) });
  assert.match(measuredIssues(3, a, sujet).join(" "), /reprend des passages entiers/);
});

test("what cannot be dictated is reported", () => {
  assert.equal(dictationIssues("Une phrase tout à fait normale et assez longue.").length, 0);
  assert.match(dictationIssues("Il fait 15 degrés.").join(), /chiffres/);
  assert.match(dictationIssues("Une hausse de vingt %.").join(), /symboles/);
  assert.match(dictationIssues("Un mot (entre parenthèses) ici.").join(), /parenthèses/);
  assert.match(dictationIssues(`${words(30)}.`).join(), /dépassent 25 mots/);
});

test("the dictée reads the answer as prose: no title, no signature, the greeting runs on", () => {
  const a = assembleAnswer(1, { opening: "Salut Léo,", message: "Ça fait un mois que je vis à Lyon. Léo, tu viendras ?", closing: "À très vite,", signature: "Alex" });
  const text = dictationText(a);
  assert.equal(text, "Salut Léo, ça fait un mois que je vis à Lyon. Léo, tu viendras ? À très vite.");
  // A name after the greeting keeps its capital.
  const named = dictationText(assembleAnswer(1, { opening: "Chère Madame,", message: "Lucie m'a dit que vous partiez. Je pense que Lucie a raison.", closing: "Bien à vous,", signature: "Paul" }));
  assert.match(named, /^Chère Madame, Lucie m'a dit/);
  const t2 = dictationText(assembleAnswer(2, { title: "Une fête inoubliable", body: "Premier paragraphe ici.\n\nSecond paragraphe là." }));
  assert.equal(t2, "Premier paragraphe ici. Second paragraphe là.");
  // The dictée scores against the join of its groups: it must rebuild the text.
  assert.equal(splitGroups(text).join(" "), text);
});

test("the publishing bar is C2 overall and C1 in every criterion", () => {
  const crit = (v) => ({ consigne: v, coherence: v, lexique: v, morphosyntaxe: v, orthographe: v });
  assert.equal(passes({ score: MODEL_PASS.score, criteria: crit(16) }), true);
  assert.equal(passes({ score: 15, criteria: crit(18) }), false);
  assert.equal(passes({ score: 18, criteria: { ...crit(18), orthographe: 13 } }), false);
  assert.equal(passes(null), false);
});

test("a draft goes write → proofread → grade, with a fix first when something measured fails", () => {
  const d = newDraft(2);
  assert.equal(nextStepName(d), "write");
  assert.equal(nextStepName({ ...d, json: {}, issues: ["x"] }), "fix");
  assert.equal(nextStepName({ ...d, json: {}, issues: [] }), "proofread");
  assert.equal(nextStepName({ ...d, json: {}, proofread: true }), "grade");
  const low = { score: 13, criteria: {} };
  assert.equal(nextStepName({ ...d, json: {}, proofread: true, grade: low }), "revise");
  assert.equal(nextStepName({ ...d, json: {}, proofread: true, grade: low, revised: true }), null);
});

test("a stored tâche 1 answer (body only) still loses its signature in the dictée", () => {
  assert.equal(dictationText({ task: 1, body: "Salut Léo,\n\nJe t'écris enfin.\n\nÀ très vite,\n\nAlex" }), "Salut Léo, je t'écris enfin. À très vite.");
  // Not a tâche 1: a short last line is text, not a signature.
  assert.equal(dictationText({ task: 2, body: "Un texte.\n\nFin du texte." }), "Un texte. Fin du texte.");
});

test("slips the grader quotes as « wrong » → « right » are recognised, rewrites are not", () => {
  const fixes = quotedFixes([
    "« cafés confortable » → « cafés confortables » (orthographe)",
    "Remplacer « il y a » par « on trouve ».",
    "« une phrase beaucoup trop longue pour être une simple correction ici » → « autre chose »",
  ]);
  assert.deepEqual(fixes, [{ wrong: "cafés confortable", right: "cafés confortables" }]);
});

test("only expressions that really occur in the text are kept to memorise", () => {
  assert.deepEqual(usableKeywords(["« En revanche »", "en revanche", "absent ici", "ok"], "En revanche, il pleut."), ["En revanche"]);
});

test("the official word-count rule caps a text outside the range, whatever the model said", async () => {
  const { applyLengthRule, lengthBreach, LENGTH_CAP } = await import("../api/_lib/eeSpec.js");
  assert.equal(lengthBreach("120 à 150 mots", 135), null);
  assert.equal(lengthBreach("120 à 150 mots", 150), null, "the maximum itself is allowed");
  assert.deepEqual(lengthBreach("120 à 150 mots", 151), { lo: 120, hi: 150, words: 151, short: false });
  const fb = { score: 16, level: "C1", criteria: { consigne: 17, lexique: 16 }, improvements: ["Varier le lexique."] };
  const over = applyLengthRule(fb, "120 à 150 mots", 162);
  assert.equal(over.score, LENGTH_CAP);
  assert.equal(over.criteria.consigne, 8);
  assert.equal(over.criteria.lexique, 16, "language criteria are not punished for length");
  assert.match(over.improvements[0], /162 mots, au-dessus du maximum de 150/);
  assert.match(over.improvements[0], /A1 non atteint/);
  const short = applyLengthRule({ ...fb }, "60 à 120 mots", 41);
  assert.match(short.improvements[0], /sous le minimum de 60/);
  // In range: untouched.
  assert.deepEqual(applyLengthRule(fb, "120 à 150 mots", 140), fb);
  // A weak text keeps its own lower score.
  assert.equal(applyLengthRule({ ...fb, score: 6 }, "120 à 150 mots", 170).score, 6);
});

test("the grader is told whether the length respects the range, computed in code", async () => {
  const { eeUserMessage } = await import("../api/_lib/eeGrader.js");
  assert.match(eeUserMessage({ targetWords: "60 à 120 mots", wordCount: 130, text: "x" }), /HORS de la fourchette exigée \(trop long\)/);
  assert.match(eeUserMessage({ targetWords: "60 à 120 mots", wordCount: 90, text: "x" }), /conforme à la fourchette/);
});
