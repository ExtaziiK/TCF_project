// Guards the conjugation bank (src/constants/conjugation/*.js) and the grader
// that marks it (src/utils/conjugationCheck.js).
//
// The bank is ~240 hand-written exercises, and its failure modes are all
// silent: an option list where the correct answer simply isn't present (the
// candidate cannot answer « Choisir » correctly, ever), the same option listed
// twice, a sentence whose "___" was lost in an edit (nothing to fill), a
// duplicated exercise. None of these throw — they just quietly produce an
// unanswerable question. So they are checked here rather than by eye.
//
// The leaf data files are imported by URL rather than through the "@/"
// aggregator: they are dependency-free by design, which is what lets a plain
// `node --test` read them without Vite's alias resolution.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "src", "constants", "conjugation");

const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
const tenses = [];
for (const file of files) {
  const mod = await import(pathToFileURL(path.join(dir, file)).href);
  const exported = Object.values(mod);
  assert.equal(exported.length, 1, `${file} must export exactly one tense object`);
  tenses.push({ file, tense: exported[0] });
}

const { checkAnswer, isCorrect, missingAccents, filledSentence } =
  await import(pathToFileURL(path.join(root, "src", "utils", "conjugationCheck.js")).href);

test("every tense file is complete and self-consistent", () => {
  assert.equal(tenses.length, 9, "every data file is wired into CONJUGATION_TENSES");
  const ids = new Set();
  for (const { file, tense } of tenses) {
    for (const key of ["id", "t", "d", "level", "use"]) {
      assert.ok(tense[key], `${file}: missing "${key}"`);
    }
    assert.equal(path.basename(file, ".js"), tense.id, `${file}: filename must match the id (the id is the quiz_key suffix)`);
    assert.ok(!ids.has(tense.id), `${file}: duplicate id "${tense.id}"`);
    ids.add(tense.id);

    assert.ok(tense.lesson.length >= 4, `${file}: a lesson needs at least four points`);
    assert.ok(tense.tables.length >= 1, `${file}: at least one conjugation table`);
    assert.ok(tense.irregulars.length >= 4, `${file}: the forms to memorise`);
    for (const tb of tense.tables) {
      const labels = tb.labels || ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];
      assert.equal(tb.forms.length, labels.length, `${file}: table "${tb.verb}" has ${tb.forms.length} forms for ${labels.length} labels`);
    }
  }
});

test("every exercise is answerable in both modes", () => {
  for (const { file, tense } of tenses) {
    assert.ok(tense.qs.length >= 25, `${file}: only ${tense.qs.length} exercises`);
    const seen = new Set();

    for (const q of tense.qs) {
      const where = `${file} · ${q.inf} (${q.p})`;
      assert.ok(q.inf && q.p && q.a && q.exp, `${where}: inf, p, a and exp are all required`);

      // A sentence must have exactly one gap to fill, and filling it must not
      // leave the stray " ," that an edited sentence can be left with.
      if (q.s) {
        assert.equal(q.s.split("___").length, 2, `${where}: the sentence needs exactly one "___"`);
        assert.doesNotMatch(filledSentence(q), /\s+[,.]/, `${where}: filling the gap leaves a space before punctuation`);
      }

      // « Choisir » mode: four distinct options, one of which is the answer.
      assert.equal(q.opts.length, 4, `${where}: expected 4 options, got ${q.opts.length}`);
      assert.equal(new Set(q.opts).size, 4, `${where}: duplicate options — ${q.opts.join(" / ")}`);
      const right = q.opts.filter((o) => isCorrect(checkAnswer(q, o)));
      assert.equal(right.length, 1, `${where}: ${right.length} of the 4 options grade as correct`);

      // « Écrire » mode: the answer, and any declared variant, must be accepted.
      for (const form of [q.a, ...(q.alt || [])]) {
        assert.equal(checkAnswer(q, form), "correct", `${where}: "${form}" should be accepted`);
      }

      const key = `${q.inf}|${q.p}|${q.s || ""}`;
      assert.ok(!seen.has(key), `${where}: duplicate exercise`);
      seen.add(key);
    }
  }
});

test("grading forgives the keyboard, never the conjugation", () => {
  const q = { inf: "manger", p: "je", a: "ai mangé", opts: [], exp: "" };

  assert.equal(checkAnswer(q, "ai mangé"), "correct");
  assert.equal(checkAnswer(q, "  AI   Mangé "), "correct", "case and stray spaces are the keyboard's fault, not the candidate's");
  assert.equal(checkAnswer(q, "ai mange"), "accent", "a missing accent is its own verdict");
  assert.equal(checkAnswer(q, "ai mangés"), "wrong", "agreement is never forgiven");
  assert.equal(checkAnswer(q, "suis mangé"), "wrong", "the auxiliary is never forgiven");
  assert.equal(checkAnswer(q, ""), "wrong");

  // "accent" is softer feedback, NOT a softer mark — it must not score.
  assert.equal(isCorrect(checkAnswer(q, "ai mange")), false);
  assert.deepEqual(missingAccents(q, "ai mange"), ["é"]);

  // Apostrophe shape and spacing around it are normalised.
  const el = { inf: "avoir", p: "je", a: "j'ai eu", opts: [], exp: "" };
  assert.equal(checkAnswer(el, "j’ai eu"), "correct", "the curly apostrophe is the same apostrophe");
  assert.equal(checkAnswer(el, "j' ai eu"), "correct");

  // Declared variants are accepted in full.
  const alt = { inf: "essayer", p: "nous", a: "essaierons", alt: ["essayerons"], opts: [], exp: "" };
  assert.equal(checkAnswer(alt, "essayerons"), "correct");
  assert.equal(checkAnswer(alt, "essaierions"), "wrong");
});

test("the sentence is rebuilt with the answer in place", () => {
  const q = { s: "Hier, nous ___ au marché.", inf: "aller", p: "nous", a: "sommes allés", opts: [], exp: "" };
  assert.equal(filledSentence(q), "Hier, nous sommes allés au marché.");
  assert.equal(filledSentence({ inf: "aller", p: "nous", a: "irons" }), null, "a bare drill has no sentence");
});
