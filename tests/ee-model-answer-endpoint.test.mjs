// The admin endpoint that writes a subject's model answer, driven step by step
// as the admin page drives it — with Groq and Supabase replaced by fakes, so
// the plumbing is checked without spending quota or touching the database:
// the draft travels, nothing is stored until the last step, a passing text is
// published with its grade, the subject's old dictée is dropped, and a text
// under the bar is not published at all.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { examWords } from "../api/_lib/eeSpec.js";

const canMock = typeof mock.module === "function";

process.env.VITE_SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test";

const db = { upserts: [], deletes: [] };
let gradeScore = 18;

// One reply per kind of call, told apart by the system prompt.
const T2 = {
  plan: "récit puis avis",
  title: "Une fête inoubliable",
  body: [
    "Le mois dernier, j'ai assisté pour la première fois à la fête de la Saint-Jean à Québec. Cette célébration réunit chaque année des milliers d'habitants dans les rues de la vieille ville.",
    "Dès la tombée de la nuit, les rues se sont remplies de musiciens et de familles. Nous avons dansé autour d'un immense feu, tandis que les anciens racontaient l'origine de la fête aux enfants émerveillés.",
    "Cette soirée m'a profondément marqué, car elle m'a montré combien une tradition peut rapprocher des inconnus. Je recommande vivement à chacun de vivre cette expérience au moins une fois, à condition de réserver son logement bien à l'avance. Vous ne le regretterez pas, et vous en garderez des souvenirs lumineux pendant de longues années.",
  ].join("\n\n"),
  keywords: ["Dès la tombée de la nuit", "à condition de", "absente du texte"],
};

if (canMock) {
  mock.module("../api/_lib/groq.js", {
    namedExports: {
      HttpError: class extends Error { constructor(status, msg) { super(msg); this.status = status; } },
      groqChatJSON: async (messages) => {
        const sys = messages[0].content;
        if (/certified TCF Canada examiner grading/.test(sys)) {
          const c = { consigne: gradeScore, coherence: gradeScore, lexique: gradeScore, morphosyntaxe: gradeScore, orthographe: gradeScore };
          return { json: { score: gradeScore, criteria: c, summary: "ok", improvements: ["« inconnus » → « inconnus »"] }, usage: { total_tokens: 10 }, model: "fake-20b" };
        }
        if (/correcteur-réviseur/.test(sys)) return { json: { errors: [], fixed: {} }, usage: { total_tokens: 10 }, model: "fake-120b" };
        return { json: T2, usage: { total_tokens: 10 }, model: "fake-120b" };
      },
      normalizeFeedback: (raw) => ({ score: raw.score, criteria: raw.criteria, summary: raw.summary, improvements: raw.improvements }),
    },
  });
  mock.module("../api/_lib/auth.js", { namedExports: { requireAdmin: async () => ({ id: "admin-1" }) } });
  mock.module("../api/_lib/ratelimit.js", { namedExports: { enforceRateLimit: async () => {} } });
  mock.module("../api/_lib/usage.js", { namedExports: { logAiUsage: () => {} } });
  mock.module("@supabase/supabase-js", {
    namedExports: {
      createClient: () => ({
        from: (table) => {
          const q = {
            filters: {},
            select() { return q; },
            eq(k, v) { q.filters[k] = v; return q; },
            maybeSingle: async () => ({ data: null, error: null }),
            upsert: async (row) => { db.upserts.push({ table, row }); return { error: null }; },
            delete() { const d = { eq(k, v) { (d.f ||= {})[k] = v; return d; }, not(k, op, v) { (d.f ||= {})[`not.${k}`] = `${op} ${v}`; return d; }, then(r) { db.deletes.push({ table, ...d.f }); r({ error: null }); } }; return d; },
          };
          return q;
        },
      }),
    },
  });
}

const call = async (handler, body) => {
  let status = 200;
  let out;
  const res = { status(s) { status = s; return res; }, json(j) { out = j; return res; } };
  await handler({ method: "POST", body, headers: {} }, res);
  return { status, out };
};

const sujet = { t1: "", t2: "Vous avez participé à une fête traditionnelle. Racontez-la dans un billet de blog.", t3: null };

test("a model answer is written step by step and published only at the end, with its grade", { skip: !canMock && "needs --experimental-test-module-mocks" }, async () => {
  const { default: handler } = await import("../api/_lib/admin/sujetAnswers.js");
  const base = { section: "ee", year: 2026, monthNum: 10, n: 4, tache: 2, ...sujet };
  db.upserts.length = 0;
  db.deletes.length = 0;
  gradeScore = 18;

  let draft = null;
  const steps = [];
  for (let i = 0; i < 10; i++) {
    const { status, out } = await call(handler, { ...base, draft });
    assert.equal(status, 200, JSON.stringify(out));
    steps.push(out.step);
    if (out.done) {
      assert.equal(out.published, true, out.reason);
      break;
    }
    // Nothing is stored before the last step.
    assert.equal(db.upserts.length, 0);
    draft = out.draft;
  }
  assert.deepEqual(steps, ["write", "proofread", "grade"]);
  const row = db.upserts.find((u) => u.table === "sujets_answers")?.row;
  assert.equal(row.title, "Une fête inoubliable");
  assert.equal(row.score, 18);
  assert.equal(row.version, 2);
  assert.equal(row.words, examWords(`${row.title} ${row.body}`));
  assert.ok(row.words >= 120 && row.words <= 150, `${row.words} mots`);
  // Only expressions that occur in the text.
  assert.deepEqual(row.keywords, ["Dès la tombée de la nuit", "à condition de"]);
  // The subject's previous dictée is dropped so the new text gets recorded.
  // Only a dictée recorded from an earlier answer; a legacy one stays playable.
  assert.deepEqual(db.deletes, [{ table: "dictee_texts", sujet_key: "2026-10-4", task: 2, "not.answer_id": "is null" }]);
});

test("a text under the bar is revised once, then left unpublished", { skip: !canMock && "needs --experimental-test-module-mocks" }, async () => {
  const { default: handler } = await import("../api/_lib/admin/sujetAnswers.js");
  const base = { section: "ee", year: 2026, monthNum: 10, n: 5, tache: 2, ...sujet };
  db.upserts.length = 0;
  gradeScore = 13;
  let draft = null;
  const steps = [];
  let last;
  for (let i = 0; i < 12; i++) {
    ({ out: last } = await call(handler, { ...base, draft }));
    steps.push(last.step);
    if (last.done) break;
    draft = last.draft;
  }
  assert.deepEqual(steps, ["write", "proofread", "grade", "revise", "proofread", "grade"]);
  assert.equal(last.published, false);
  assert.match(last.reason, /13\/20 sous le seuil/);
  assert.equal(db.upserts.length, 0);
});

test("a tâche the combinaison does not pose is refused", { skip: !canMock && "needs --experimental-test-module-mocks" }, async () => {
  const { default: handler } = await import("../api/_lib/admin/sujetAnswers.js");
  const { status, out } = await call(handler, { section: "ee", year: 2026, monthNum: 10, n: 4, tache: 1, ...sujet });
  assert.equal(status, 400);
  assert.match(out.error, /n'existe pas/);
});
