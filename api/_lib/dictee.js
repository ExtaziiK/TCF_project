import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./groq.js";
import { synthesizeFrench } from "./tts.js";
import { dictationText } from "./eeSpec.js";

// The dictée's server half: find a sujet, read its model answer, and cut it
// into the units a candidate types one at a time.
//
// The text is NOT written here. It is the subject's model answer — the one in
// sujets_answers, written and graded once (api/_lib/eeModelAnswer.js) and also
// shown on the subject's « Modèle de réponse » page and as the workshop's
// example. A candidate who studied the corrigé then takes it down under
// dictation, so the structures they heard are the ones they read. Each
// (sujet, tâche) is recorded once and cached in dictee_texts with a link to its
// answer; every later candidate hears the same recording of the same text,
// which is what makes two scores comparable.
//
// Texts the dictée wrote for itself before (answer_id null) stay playable until
// the subject's model answer replaces them.

// Built on first use rather than at import. The splitter below is pure and is
// held to a fixture table by tests/dictee-split.test.mjs, which imports this
// module with no Supabase environment at all — a client constructed at module
// scope throws "supabaseUrl is required" before a single test runs.
let client = null;
const admin = () =>
  (client ||= createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  }));

/* ------------------------------ the archive ------------------------------- */

// Mirrors src/services/sujetsArchiveService.loadArchive: the shipped JSON is
// the base, rows in sujets_archive are admin overrides layered on top. The
// prompt MUST come from here rather than from the request body — otherwise the
// endpoint is an open text generator that anyone with a session can point at
// arbitrary text.
let shippedCache = null;

const rowsFrom = (json) => {
  const rows = [];
  for (const y of json.years || []) {
    for (const m of y.months || []) rows.push({ year: y.year, monthNum: m.monthNum, data: m.sujets || [] });
  }
  if (!rows.length) throw new HttpError(502, "Le recueil de sujets est vide.");
  return rows;
};

// Read from DISK, not over HTTP from our own deployment.
//
// This used to fetch https://<host>/data/sujets-ee.json — asking the
// deployment for one of its own static files. That is fragile in a way that
// took a while to see: on a preview with Deployment Protection enabled, the
// request comes back as Vercel's SSO login page — HTML, with status 200. The
// `res.ok` check passes, `res.json()` throws
// «Unexpected token '<', "<!DOCTYPE "... is not valid JSON», and the handler
// dutifully wraps THAT into a valid JSON error response. The candidate is then
// shown a JSON parse error by an endpoint that parsed its JSON perfectly well,
// and no amount of hardening on the client can see it, because from the
// client's side nothing was ever malformed.
//
// The file ships with the deployment (vercel.json includeFiles), so reading it
// is a filesystem call with no auth, no network and no gateway in between.
// The archive lives in data/sujets — outside public/, so it is never served
// to the open web (signed-in accounts get it from /api/public/sujets).
const SHIPPED_PATHS = [
  path.join(process.cwd(), "data", "sujets", "sujets-ee.json"),
  fileURLToPath(new URL("../../data/sujets/sujets-ee.json", import.meta.url)),
];

async function fetchShipped() {
  if (shippedCache) return shippedCache;

  for (const file of SHIPPED_PATHS) {
    try {
      shippedCache = rowsFrom(JSON.parse(await readFile(file, "utf8")));
      return shippedCache;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      // Missing here — try the next location.
    }
  }

  // No HTTP fallback any more: the file is no longer public, so a runtime
  // whose bundle dropped it has nothing to fetch — say so plainly.
  throw new HttpError(502, "Le recueil de sujets est introuvable sur le serveur.");
}

export const sujetKeyOf = (year, monthNum, n) => `${year}-${monthNum}-${n}`;

// Every (sujet, tâche) the archive can offer, flattened. Tâche 3 needs both
// documents to be present — a themed subject with one missing document cannot
// be answered, so it is not offered.
export async function listSujets() {
  const map = new Map();
  for (const r of await fetchShipped()) map.set(`${r.year}-${r.monthNum}`, r);
  const { data } = await admin().from("sujets_archive").select("year, month_num, data").eq("section", "ee");
  for (const r of data || []) map.set(`${r.year}-${r.month_num}`, { year: r.year, monthNum: r.month_num, data: r.data });

  const out = [];
  for (const month of map.values()) {
    for (const s of month.data || []) {
      const key = sujetKeyOf(month.year, month.monthNum, s.n);
      if (typeof s.t1 === "string" && s.t1.trim()) out.push({ key, task: 1, prompt: s.t1.trim(), year: month.year, monthNum: month.monthNum, n: s.n });
      if (typeof s.t2 === "string" && s.t2.trim()) out.push({ key, task: 2, prompt: s.t2.trim(), year: month.year, monthNum: month.monthNum, n: s.n });
      if (s.t3?.theme && s.t3?.doc1 && s.t3?.doc2) {
        out.push({
          key, task: 3, year: month.year, monthNum: month.monthNum, n: s.n,
          prompt: `Thème : ${s.t3.theme}\nDocument 1 : ${s.t3.doc1}\nDocument 2 : ${s.t3.doc2}`,
          theme: s.t3.theme,
        });
      }
    }
  }
  return out;
}

/* --------------------------- sentence splitting --------------------------- */

// A dictation unit is what someone can hold in their head for one listen.
// Below ~5 words there is nothing to work out; past ~28 the exercise stops
// measuring French and starts measuring short-term memory, so an over-long
// sentence is cut at a comma near its middle. The generator is told to write
// in this range; this is the guard for when it doesn't.
const MIN_WORDS = 5;
const MAX_WORDS = 28;

const wordCount = (s) => (s.match(/[\p{L}\p{N}]+/gu) || []).length;

// Splits at a comma nearest the midpoint, so both halves stay speakable. Falls
// back to leaving the sentence whole: a bad cut is worse than a long sentence.
function cutLong(sentence) {
  if (wordCount(sentence) <= MAX_WORDS) return [sentence];
  const commas = [...sentence.matchAll(/,\s+/g)].map((m) => m.index + m[0].length);
  if (!commas.length) return [sentence];
  const mid = sentence.length / 2;
  const at = commas.reduce((best, i) => (Math.abs(i - mid) < Math.abs(best - mid) ? i : best), commas[0]);
  const head = sentence.slice(0, at).trim();
  const tail = sentence.slice(at).trim();
  if (wordCount(head) < MIN_WORDS || wordCount(tail) < MIN_WORDS) return [sentence];
  return [...cutLong(head), ...cutLong(tail)];
}

// Cuts a text into whole sentences, nothing finer.
//
// `glue` folds a sentence too short to dictate into the one before it. That is
// right when the SENTENCE is the unit a candidate types — nobody should be
// made to listen to "Bien sûr." on its own — and wrong once sense groups are,
// because a three-word group is an ordinary atom and gluing would bury a full
// stop in the middle of one. So the legacy path glues and splitGroups doesn't.
function sentencesOf(text, glue) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  // Terminator followed by whitespace and something that starts a new sentence.
  // French closing punctuation (« » ! ?) is kept with the sentence it ends.
  const raw = clean.match(/[^.!?…]+[.!?…]+(?:\s*[»"])?|\S[^.!?…]*$/g) || [clean];
  const merged = [];
  for (const piece of raw.map((s) => s.trim()).filter(Boolean)) {
    if (glue && merged.length && wordCount(piece) < MIN_WORDS) merged[merged.length - 1] += ` ${piece}`;
    else merged.push(piece);
  }
  return merged;
}

export function splitSentences(text) {
  return sentencesOf(text, true).flatMap(cutLong);
}

/* -------------------------- sense-group splitting ------------------------- */

// What a dictation is actually read in.
//
// A teacher reading a dictée does not count words — they read by GROUPES DE
// SENS, the stretch between two breaths, and they stop where the sense allows
// a stop. Cutting "douze mots" off a sentence lands mid-clause about half the
// time, and a candidate asked to hold "les chercheurs affirment que les
// enfants exposés très" has been given a memory test, not a dictation.
//
// So this cuts only at places a reader could breathe, ranked: the stronger the
// boundary, the earlier it is tried. A sentence is cut at the strongest marker
// available NEAREST ITS MIDDLE, and each half is then re-examined — which is
// what keeps the weak markers (a preposition opening a group) from ever being
// reached inside a stretch the strong ones could already shorten.
//
// The output is ATOMS: the finest units on offer. Longer settings are built by
// the client playing consecutive atoms back to back (src/utils/dicteeSegments),
// so one synthesis serves every length and Azure is billed once per text.

const MIN_GROUP = 3; // either side of a cut; below this a group carries no sense
const ATOM_MAX = 8; // an atom at or under this is left alone

// `\b` is ASCII-only. Next to "à", "où" or "malgré" it sees no boundary at
// all, so every accented marker written with `\b` silently never matches and
// the splitter quietly loses half its rules — which is exactly what happened
// the first time. These are the same idea done in Unicode.
const OPEN = "(?<![\\p{L}\\p{N}])";
const CLOSE = "(?![\\p{L}\\p{N}])";

// Markers that open the group they introduce. `elided` forms end in their own
// apostrophe ("qu'", "lorsqu'"), which is already a boundary — giving them the
// closing guard would demand a non-letter after the apostrophe and match none.
const before = (plain, elided = []) =>
  new RegExp(
    `${OPEN}(?:${elided.length ? `(?:${elided.join("|")})['’]|` : ""}(?:${plain.join("|")})${CLOSE})`,
    "giu",
  );

// `where: "after"` keeps the marker with the head (punctuation ends a group);
// `where: "before"` opens the tail with it (a conjunction belongs to the group
// it introduces). Order is the priority order.
const BREAKS = [
  { where: "after", re: /[;:]\s+/g },
  { where: "after", re: /,\s+/g },
  // Multi-word subordinators, matched before the bare ones so that "parce que"
  // is cut at "parce" and never left as a dangling "que".
  {
    where: "before",
    re: before(["parce que", "bien que", "alors que", "tandis que", "afin que", "pour que", "de sorte que", "si bien que", "au moment où", "dès que", "pendant que", "même si"]),
  },
  // Bare relatives and subordinators. The lookbehind is what stops this rule
  // from re-cutting the "que" of a multi-word subordinator above.
  {
    where: "before",
    re: new RegExp(
      `(?<!(?:parce|bien|alors|tandis|afin|pour|sorte|dès|pendant|même)\\s)${OPEN}(?:(?:qu|lorsqu|puisqu)['’]|(?:qui|que|dont|où|lorsque|quand|puisque|comme|si)${CLOSE})`,
      "giu",
    ),
  },
  { where: "before", re: before(["et", "mais", "ou", "donc", "car", "ni", "or"]) },
  { where: "before", re: before(["dans", "pour", "avec", "sans", "sous", "sur", "après", "avant", "selon", "malgré", "depuis", "pendant", "chez", "vers", "entre", "parmi", "contre"]) },
  // Last resort: the light prepositions, and ONLY where a determiner follows.
  // "à la publicité télévisée" is a group a reader can open on; "à faire" and
  // "à peine" are not, and the determiner is what tells the two apart — without
  // it this rule would cut "commencer / à écrire" and strand an infinitive.
  {
    where: "before",
    re: new RegExp(
      `${OPEN}(?:à|de|en)\\s+(?:l['’]|(?:la|le|les|un|une|ce|cet|cette|ces|son|sa|ses|leur|leurs|nos|notre|vos|votre)${CLOSE})`,
      "giu",
    ),
  },
];

// Character offsets where a tail could begin, for one rule.
function cutPoints(sentence, rule) {
  const out = [];
  rule.re.lastIndex = 0;
  for (const m of sentence.matchAll(rule.re)) {
    // "after" consumes the trailing space, so the tail starts past the match;
    // "before" starts the tail at the marker itself.
    out.push(rule.where === "after" ? m.index + m[0].length : m.index);
  }
  return out;
}

function splitClause(sentence) {
  if (wordCount(sentence) <= ATOM_MAX) return [sentence];
  const mid = sentence.length / 2;
  for (const rule of BREAKS) {
    let best = -1;
    for (const at of cutPoints(sentence, rule)) {
      const head = sentence.slice(0, at).trim();
      const tail = sentence.slice(at).trim();
      // A cut that strands three words on either side is not a group boundary,
      // whatever the marker says.
      if (!head || !tail || wordCount(head) < MIN_GROUP || wordCount(tail) < MIN_GROUP) continue;
      if (best < 0 || Math.abs(at - mid) < Math.abs(best - mid)) best = at;
    }
    if (best < 0) continue;
    return [...splitClause(sentence.slice(0, best).trim()), ...splitClause(sentence.slice(best).trim())];
  }
  // No legal cut anywhere: a long group is worse than a butchered one.
  return [sentence];
}

// The atoms of a whole text, in order. Joining them all back with single
// spaces reproduces the text exactly — the client rebuilds every longer
// setting by joining runs of them, and the correction is scored against that
// join, so any drift here would score a candidate against a text nobody read.
export function splitGroups(text) {
  return sentencesOf(text, false).flatMap(splitClause);
}

/* ---------------------------- the model answer ---------------------------- */

// The level a dictée is labelled with: the grade its model answer cleared
// (16+ is the grader's C2 band). A model answer from before the gate has no
// grade, and is labelled by what it was asked for.
const levelOf = (answer) => (answer?.score >= 16 ? "C2" : "C1");

// What a voice cannot read and a candidate could not be fairly asked to type:
// digits, symbols, brackets and quotation marks. Model answers written by the
// gate never contain them (eeSpec.js EE_DICTATION_RULES); one from before may.
export const undictable = (text) => /[\d%€$&/#+=@()[\]«»"“”]/.test(text);

// The model answer of one (sujet, tâche), or null.
export async function readAnswer(sujet) {
  if (!Number.isInteger(sujet?.year) || !Number.isInteger(sujet?.monthNum) || !Number.isInteger(sujet?.n)) return null;
  const run = (cols) => admin()
    .from("sujets_answers")
    .select(cols)
    .eq("section", "ee").eq("year", sujet.year).eq("month_num", sujet.monthNum).eq("n", sujet.n).eq("tache", sujet.task)
    .maybeSingle();
  let { data, error } = await run("id, body, score, version");
  // 20261024_ee_model_answers.sql not applied yet: no score, no version.
  if (error) ({ data, error } = await run("id, body"));
  return error ? null : data;
}

// Every sujet key whose model answer for this tâche can be dictated — what a
// new dictée can be recorded from.
export async function answeredKeysFor(task) {
  const { data, error } = await admin().from("sujets_answers").select("year, month_num, n, body").eq("section", "ee").eq("tache", task);
  if (error) return new Set();
  return new Set((data || []).filter((r) => !undictable(dictationText({ task, body: r.body }))).map((r) => sujetKeyOf(r.year, r.month_num, r.n)));
}

// The dictée text of one model answer, already cut. Throws when the answer
// cannot be dictated, so nothing half-usable is cached.
export function textFromAnswer(answer, task) {
  const text = dictationText({ task, body: answer?.body || "" });
  if (wordCount(text) < 40 || undictable(text)) throw new HttpError(409, "Le modèle de réponse de ce sujet ne peut pas être dicté.");
  const sentences = splitSentences(text);
  const groups = splitGroups(text);
  // The join is what the candidate is scored against, so a text whose atoms do
  // not rebuild it is refused rather than cached — a cached one would go on
  // marking people down against words nobody read for as long as the row lives.
  if (sentences.length < 3 || groups.join(" ") !== text) throw new HttpError(409, "Le modèle de réponse de ce sujet ne se découpe pas en dictée.");
  return { text, sentences, groups, level: levelOf(answer), words: wordCount(text) };
}

// What Azure is asked to SAY for one group, which is not always what the
// candidate is scored on. Each group is synthesized as its own request, so a
// group ending mid-clause gets the falling, finished-speaking contour Azure
// gives any bare phrase — and three of those played back to back sound like
// three statements instead of one sentence. A trailing comma buys the
// continuing contour instead. It exists only in the SSML: the reference text
// keeps the punctuation the generator actually wrote.
export const speechFor = (group) => {
  const s = String(group).trim();
  return /[.,;:!?…»"]$/.test(s) ? s : `${s},`;
};

/* --------------------------------- cache ---------------------------------- */

// Which sujet keys already have a cached text for this tâche. Answering from
// the cache itself, rather than from a list kept somewhere else, is what stops
// the library and the archive from drifting apart.
export async function cachedKeysFor(task) {
  const { data, error } = await admin().from("dictee_texts").select("sujet_key").eq("task", task);
  if (error) return new Set(); // table missing → everything reads as uncached
  return new Set((data || []).map((r) => r.sujet_key));
}

const LEGACY_COLUMNS = "id, level, text, sentences, audio, groups, groups_audio, words, featured_on, created_at";
const ROW_COLUMNS = `${LEGACY_COLUMNS}, answer_id`;

export async function readCached(sujetKey, task) {
  const run = (cols) => admin()
    .from("dictee_texts")
    .select(cols)
    .eq("sujet_key", sujetKey)
    .eq("task", task)
    .maybeSingle();
  let { data, error } = await run(ROW_COLUMNS);
  // answer_id comes with 20261024_ee_model_answers.sql; before it, the row
  // reads as a legacy one.
  if (error) ({ data, error } = await run(LEGACY_COLUMNS));
  // A missing table (42P01) means the migration has not been applied: fall
  // through to recording every time rather than failing the feature outright.
  if (error) return null;
  return data;
}

// Which sujet keys have a dictée already recorded FROM their model answer.
export async function answerKeysFor(task) {
  const { data, error } = await admin().from("dictee_texts").select("sujet_key").eq("task", task).not("answer_id", "is", null);
  if (error) return new Set();
  return new Set((data || []).map((r) => r.sujet_key));
}

/* ------------------------- the daily spending cap -------------------------- */

// Everything a candidate can draw is already paid for: a text is written and
// recorded once and then served to everyone, for ever. So the lifetime bill is
// bounded by the archive (1 428 sujet-tâche pairs) no matter what happens here
// — what this caps is the RATE, which is what actually protects the Azure free
// tier from a traffic spike and, more pressingly, keeps the base64 in
// dictee_texts from arriving faster than the database can hold it.
//
// The cron seeds SEED texts a day; candidates may trigger BURST more between
// them, and those are cached and handed to everyone else exactly like the
// seeded ones. Past that the day is spent and the library — which by then holds
// every text of every previous day — is what people practise on.
export const DAILY_SEED = 3; // one per tâche
export const DAILY_BURST = 3;
export const DAILY_TOTAL = DAILY_SEED + DAILY_BURST;

// UTC, matching Postgres `current_date` and the schedule Vercel Cron reads. The
// seed runs at 07:00 UTC — the small hours in Canada — so the day's texts are
// waiting before anyone opens the page.
export const today = () => new Date().toISOString().slice(0, 10);

// How many texts have been written today, counted from the rows themselves. No
// counter to keep, nothing to reset at midnight, and no way for the count to
// drift from what was actually spent.
//
// Two requests arriving together can both read the last remaining slot and both
// spend it. Deliberately not locked: the overrun is one or two texts on the
// busiest days, and the alternative is a transaction around a Groq call that
// can take ten seconds.
export async function generatedToday() {
  const { count, error } = await admin()
    .from("dictee_texts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${today()}T00:00:00Z`);
  // Table missing, or the count failed: report the day as spent. Failing
  // closed costs a candidate one fresh text; failing open uncaps the spend.
  if (error) return DAILY_TOTAL;
  return count || 0;
}

/* -------------------------------- the library ------------------------------ */

// Today's dictées du jour, and everything seeded before them. Both are free to
// serve, so the picker offers them together and only a sujet in neither costs
// anything to start.
export async function listLibrary(limit = 80) {
  const { data, error } = await admin()
    .from("dictee_texts")
    .select("sujet_key, task, level, words, featured_on, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

// Fills in what a cached row is missing — its groups, its recordings, or both.
// Used to repair a synthesis that came back with holes, and to bring a row
// written before the dictation moved to sense groups up to date.
export async function patchCached(id, patch) {
  if (!id) return;
  const { error } = await admin().from("dictee_texts").update(patch).eq("id", id);
  if (error) console.warn("dictee_texts patch:", error.message);
}

/* ------------------------------- synthesis -------------------------------- */

// Azure is called once per group. Four at a time keeps a twenty-group text
// inside the function's budget without opening thirty sockets at once.
const TTS_BATCH = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every group must have a recording. A row with holes in it is worse than one
// with none: the dictée would switch to the browser's robotic voice for group
// five and back to the neural one for group six, which sounds like a fault and
// changes the listening task mid-exercise.
export const isComplete = (audio, groups) =>
  Array.isArray(audio) && Array.isArray(groups) && audio.length === groups.length && audio.every(Boolean);

export async function synthesizeGroups(groups) {
  const out = new Array(groups.length).fill(null);
  let bytes = 0;
  let chars = 0;
  const take = (i, tts, spoken) => {
    if (!tts) return;
    out[i] = tts.audio;
    bytes += tts.bytes;
    chars += spoken.length;
  };

  for (let i = 0; i < groups.length; i += TTS_BATCH) {
    const slice = groups.slice(i, i + TTS_BATCH).map(speechFor);
    const done = await Promise.all(slice.map((s) => synthesizeFrench(s)));
    done.forEach((tts, k) => take(i + k, tts, slice[k]));
  }

  // Azure answers "Downstream Service Throttled" under a burst — observed while
  // seeding, four groups out of eight. One sequential, spaced retry recovers
  // them; the concurrency that caused the throttle is exactly what it drops.
  const missing = out.map((a, i) => (a ? -1 : i)).filter((i) => i >= 0);
  for (const i of missing) {
    await sleep(400);
    const spoken = speechFor(groups[i]);
    take(i, await synthesizeFrench(spoken), spoken);
  }
  // All-null means Azure is unconfigured or down. Not an error: the client
  // reads the groups with the browser's own voice instead, which is worse but
  // still a dictée. Returning null here tells the caller not to cache it.
  return out.some(Boolean) ? { audio: out, bytes, chars } : null;
}

/* --------------------------------- minting -------------------------------- */

// Writes one (sujet, tâche) into the library: the model answer, its groups and
// their recordings, cached for everyone who ever draws it afterwards. Shared by
// the daily cron and the on-demand burst so there is one definition of what a
// dictée is, and it returns the meters both of them have to log.
export async function mintDictee(sujet, { featuredOn = null, answer = null } = {}) {
  const source = answer || (await readAnswer(sujet));
  if (!source) throw new HttpError(409, "Ce sujet n'a pas encore de modèle de réponse : sa dictée sera disponible dès qu'il sera rédigé.");
  const made = textFromAnswer(source, sujet.task);

  const ttsStart = Date.now();
  const tts = await synthesizeGroups(made.groups);
  const ttsMs = Date.now() - ttsStart;

  const id = await writeCached({
    sujet_key: sujet.key,
    task: sujet.task,
    level: made.level,
    prompt: sujet.prompt.slice(0, 4000),
    text: made.text,
    sentences: made.sentences,
    groups: made.groups,
    groups_audio: tts?.audio || null,
    audio: null,
    words: made.words,
    featured_on: featuredOn,
    answer_id: source.id || null,
  });

  return {
    row: { id, ...made, groupsAudio: tts?.audio || null },
    tts: tts ? { chars: tts.chars, bytes: tts.bytes, ms: ttsMs } : null,
  };
}

export async function writeCached(row) {
  const upsert = (r) => admin()
    .from("dictee_texts")
    .upsert(r, { onConflict: "sujet_key,task" })
    .select("id")
    .maybeSingle();
  let { data, error } = await upsert(row);
  // answer_id comes with 20261024_ee_model_answers.sql.
  if (error && /answer_id/.test(error.message || "")) {
    ({ data, error } = await upsert(Object.fromEntries(Object.entries(row).filter(([k]) => k !== "answer_id"))));
  }
  if (error) {
    console.warn("dictee_texts upsert:", error.message);
    return null;
  }
  return data?.id || null;
}

// `attachAudio` used to live here, repairing the per-SENTENCE recordings in
// `audio`. Nothing reads that column since the dictation moved to sense groups
// — its replacement is attachGroupAudio, further up.
