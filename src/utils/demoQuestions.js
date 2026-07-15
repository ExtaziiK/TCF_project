import { GRAMMAR_TOPICS } from "@/constants/grammar";
import { VOCAB } from "@/constants/vocabulary";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomGrammarQuestion() {
  const pool = GRAMMAR_TOPICS.flatMap((topic) => topic.qs.map((q) => ({ ...q, topic: topic.t })));
  const picked = pick(pool);
  return { kind: "grammar", tag: picked.topic, route: "grammar", q: picked.q, opts: picked.opts, a: picked.a, exp: picked.exp };
}

function randomVocabQuestion() {
  const word = pick(VOCAB);
  const distractors = shuffle(VOCAB.filter((v) => v.fr !== word.fr)).slice(0, 3).map((v) => v.fr);
  const opts = shuffle([word.fr, ...distractors]);
  return {
    kind: "vocabulary",
    tag: word.cat,
    route: "vocabulary",
    q: `Quel mot correspond à cette définition : « ${word.def} » ?`,
    opts,
    a: opts.indexOf(word.fr),
    exp: `« ${word.fr} » — ${word.ex}`,
  };
}

// One random MCQ drawn from the grammar or vocabulary bank, normalized to the
// same { q, opts, a, exp } shape as a listening question so it can reuse the
// exact rendering used by DemoQuestion.
export function randomSecondaryQuestion() {
  return Math.random() < 0.5 ? randomGrammarQuestion() : randomVocabQuestion();
}
