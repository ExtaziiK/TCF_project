import { createClient } from "@supabase/supabase-js";
import { HttpError, groqChatJSON } from "./groq.js";

// The dictée's server half: find a sujet, write the model answer nobody has
// written yet, and cut it into the units a candidate types one at a time.
//
// The archive holds 476 sujets × 3 tâches of PROMPTS and not one model answer,
// so the text taken down under dictation has to be generated. Everything here
// exists to make that generation happen exactly once per (sujet, tâche): the
// result is cached in dictee_texts and every later candidate hears the same
// recording of the same text, which is what makes two scores comparable.

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

async function fetchShipped(req) {
  if (shippedCache) return shippedCache;
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const res = await fetch(`${proto}://${host}/data/sujets-ee.json`);
  if (!res.ok) throw new HttpError(502, "Le recueil de sujets est momentanément indisponible.");
  const json = await res.json();
  const rows = [];
  for (const y of json.years || []) {
    for (const m of y.months || []) rows.push({ year: y.year, monthNum: m.monthNum, data: m.sujets || [] });
  }
  shippedCache = rows;
  return rows;
}

export const sujetKeyOf = (year, monthNum, n) => `${year}-${monthNum}-${n}`;

// Every (sujet, tâche) the archive can offer, flattened. Tâche 3 needs both
// documents to be present — a themed subject with one missing document cannot
// be answered, so it is not offered.
export async function listSujets(req) {
  const map = new Map();
  for (const r of await fetchShipped(req)) map.set(`${r.year}-${r.monthNum}`, r);
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

export function splitSentences(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  // Terminator followed by whitespace and something that starts a new sentence.
  // French closing punctuation (« » ! ?) is kept with the sentence it ends.
  const raw = clean.match(/[^.!?…]+[.!?…]+(?:\s*[»"])?|\S[^.!?…]*$/g) || [clean];
  const merged = [];
  for (const piece of raw.map((s) => s.trim()).filter(Boolean)) {
    // Too short to be a dictation unit on its own — glue it to the previous
    // one rather than asking someone to listen to "Bien sûr."
    if (merged.length && wordCount(piece) < MIN_WORDS) merged[merged.length - 1] += ` ${piece}`;
    else merged.push(piece);
  }
  return merged.flatMap(cutLong);
}

/* ------------------------------- generation ------------------------------- */

// Tâche 1 and 2 are practical texts, tâche 3 is the argued essay — which is why
// only tâche 3 is written at C2. Lengths follow the real épreuve.
const TASK_SPEC = {
  1: { level: "C1", words: "90 à 120", kind: "un message ou une lettre personnelle adressée à la personne indiquée par la consigne" },
  2: { level: "C1", words: "120 à 160", kind: "le texte demandé par la consigne (article, billet de blog, courriel ou compte rendu), avec le registre qui convient" },
  3: { level: "C2", words: "180 à 220", kind: "un texte argumenté qui confronte les deux documents, prend position et la défend" },
};

const system = (spec) => `Tu es un formateur FLE qui rédige des corrigés modèles pour le TCF Canada, épreuve d'Expression écrite.

Rédige ${spec.kind}. Niveau visé : ${spec.level}. Longueur : ${spec.words} mots.

Le texte sera DICTÉ : une voix de synthèse le lira phrase par phrase et un candidat l'écrira sous la dictée. Cela impose des règles absolues.
- Phrases de 8 à 20 mots. Jamais de phrase de plus de 25 mots.
- Écris tous les nombres en toutes lettres : « vingt pour cent », jamais « 20 % » ; « deux mille vingt-six », jamais « 2026 ».
- Aucune abréviation, aucun sigle, aucune adresse, aucun symbole (%, €, &, /, #).
- Aucun titre, aucune liste, aucun tiret de liste, aucune parenthèse, aucun guillemet.
- Pas de nom propre inhabituel : seuls des noms courants et faciles à écrire sont admis.
- Le texte est un seul bloc de prose continue, sans saut de ligne.

La langue doit mériter le niveau ${spec.level} : connecteurs variés, subordination réelle, lexique précis, temps maîtrisés. C'est un modèle que le candidat doit avoir intérêt à copier.
Ton français doit être irréprochable — la moindre faute sera dictée puis comptée comme une erreur au candidat.

Réponds UNIQUEMENT par un objet JSON minifié : {"text":"<le texte>"}`;

// Writes and caches the model answer for one (sujet, tâche). Returns the row.
export async function generateText(sujet) {
  const spec = TASK_SPEC[sujet.task];
  // Warmer than the graders (temperature 0) on purpose: this is prose, not a
  // verdict, and it is written once and then frozen in the cache, so there is
  // nothing for sampling noise to make inconsistent.
  const { json, usage, model } = await groqChatJSON(
    [
      { role: "system", content: system(spec) },
      { role: "user", content: `Consigne :\n${sujet.prompt.slice(0, 2000)}` },
    ],
    { temperature: 0.4, maxTokens: 1200 },
  );
  const text = typeof json?.text === "string" ? json.text.replace(/\s+/g, " ").trim() : "";
  if (wordCount(text) < 40) throw new HttpError(502, "Le corrigé généré est inexploitable. Réessayez.");
  const sentences = splitSentences(text);
  if (sentences.length < 3) throw new HttpError(502, "Le corrigé généré est inexploitable. Réessayez.");
  // `model` is the one that actually answered — groqChatJSON walks a fallback
  // chain on a 429, so the first model in the list is not necessarily the one
  // that did the work, and metering the wrong one makes the admin's per-model
  // budget read as spent where it isn't.
  return { text, sentences, level: spec.level, words: wordCount(text), usage, model };
}

/* --------------------------------- cache ---------------------------------- */

// Which sujet keys already have a cached text for this tâche. Answering from
// the cache itself, rather than from a list kept somewhere else, is what stops
// the library and the archive from drifting apart.
export async function cachedKeysFor(task) {
  const { data, error } = await admin().from("dictee_texts").select("sujet_key").eq("task", task);
  if (error) return new Set(); // table missing → everything reads as uncached
  return new Set((data || []).map((r) => r.sujet_key));
}

export async function readCached(sujetKey, task) {
  const { data, error } = await admin
    .from("dictee_texts")
    .select("id, level, text, sentences, audio, words")
    .eq("sujet_key", sujetKey)
    .eq("task", task)
    .maybeSingle();
  // A missing table (42P01) means the migration has not been applied: fall
  // through to generating every time rather than failing the feature outright.
  if (error) return null;
  return data;
}

export async function writeCached(row) {
  const { data, error } = await admin
    .from("dictee_texts")
    .upsert(row, { onConflict: "sujet_key,task" })
    .select("id")
    .maybeSingle();
  if (error) {
    console.warn("dictee_texts upsert:", error.message);
    return null;
  }
  return data?.id || null;
}

// Fills in audio for a row whose text was already cached but whose recording
// was not (first synthesis failed, or the row predates the audio column).
export async function attachAudio(id, audio) {
  if (!id) return;
  const { error } = await admin().from("dictee_texts").update({ audio }).eq("id", id);
  if (error) console.warn("dictee_texts audio:", error.message);
}
