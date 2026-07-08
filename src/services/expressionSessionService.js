import { listQuestions } from "@/services/questionsService";
import { WRITING_TASKS } from "@/constants/writing";
import { SPEAKING_TASKS } from "@/constants/speaking";

// Practice sessions for Expression écrite / orale, driven by the Question
// Bank. A session is one prompt per official tâche (1..3), picked by a
// smart random strategy:
//   - pool = active bank questions for that section+task, plus the seed
//     prompt shipped with the app (seeds are ordinary pool members, so
//     admin content dilutes them naturally — nothing is hardcoded in the UI)
//   - selection prefers the prompts this user has been served least
//     (per-user counts persisted locally), breaking ties at random; once
//     everything has been seen equally, the pool reshuffles by itself
//   - the three picks are locked for the lifetime of the session object;
//     a new page visit generates a new set
//
// The strategy hook (pickLeastSeen) is deliberately isolated so future
// policies (difficulty-aware, AI-recommended, premium pools…) can replace
// it without touching the UI or the session flow.

export const OFFICIAL_TASKS = [1, 2, 3];

/* ------------------------------ seed prompts ----------------------------- */
// The original built-in tasks, normalized to the same shape as bank prompts.

const SEEDS = {
  ee: WRITING_TASKS.map((t, i) => ({
    id: `seed-ee-${i + 1}`,
    task: i + 1,
    payload: { prompt: t.prompt, sample: t.sample, minWords: null, maxWords: null },
    seed: t, // keep original labels/timings
  })),
  eo: SPEAKING_TASKS.map((t, i) => ({
    id: `seed-eo-${i + 1}`,
    task: i + 1,
    payload: { prompt: t.prompt, prepTime: t.prep, speakTime: t.dur },
    seed: t,
  })),
};

/* -------------------------- seen-count tracking -------------------------- */
// How often each prompt was served to this user. Local for now; moving it
// to a Supabase table later only changes these two functions.

const SEEN_KEY = (userId) => `passerelle-expression-seen-${userId || "anon"}`;

function readSeen(userId) {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY(userId))) || {}; } catch { return {}; }
}

function recordSeen(userId, ids) {
  try {
    const seen = readSeen(userId);
    for (const id of ids) seen[id] = (seen[id] || 0) + 1;
    localStorage.setItem(SEEN_KEY(userId), JSON.stringify(seen));
  } catch { /* storage unavailable — rotation just resets each visit */ }
}

/* --------------------------- selection strategy -------------------------- */

// Least-served first, random among equals. Exported for tests and reuse.
export function pickLeastSeen(pool, seenCounts) {
  if (pool.length === 0) return null;
  const min = Math.min(...pool.map((q) => seenCounts[q.id] || 0));
  const fresh = pool.filter((q) => (seenCounts[q.id] || 0) === min);
  return fresh[Math.floor(Math.random() * fresh.length)];
}

/* ------------------------------ task shaping ----------------------------- */
// Adapts a picked prompt (bank question or seed) to the shape the workshop
// pages already consume (useWritingTask / useSpeakingSession).

const DEFAULT_LABELS = { 1: "Message court", 2: "Article de blogue", 3: "Texte argumenté" };
const DEFAULT_LABELS_EO = { 1: "Entretien dirigé", 2: "Interaction", 3: "Point de vue" };

function toWritingTask(entry) {
  if (entry.seed) return { ...entry.seed, id: entry.id, task: entry.task };
  const p = entry.payload;
  const lo = Number(p.minWords) || 60;
  const hi = Number(p.maxWords) || 120;
  return {
    id: entry.id,
    task: entry.task,
    t: `Tâche ${entry.task} · ${DEFAULT_LABELS[entry.task] || "Rédaction"}`,
    words: `${lo} à ${hi} mots`,
    min: Math.max(10, Math.round(hi / 8)), // minutes on the clock, scaled to length
    prompt: [p.prompt, p.instructions].filter(Boolean).join(" "),
    sample: p.sample || "",
  };
}

function toSpeakingTask(entry) {
  if (entry.seed) return { ...entry.seed, id: entry.id, task: entry.task };
  const p = entry.payload;
  return {
    id: entry.id,
    task: entry.task,
    t: `Tâche ${entry.task} · ${DEFAULT_LABELS_EO[entry.task] || "Expression"}`,
    prep: Number(p.prepTime) || 0,
    dur: Number(p.speakTime) || 120,
    prompt: p.prompt,
  };
}

/* ----------------------------- session builder --------------------------- */

// One prompt per official tâche, locked for the session. Returns
// [{ task: 1..3, ...workshopTaskShape } | { task, empty: true }].
export async function generateExpressionSession(userId, section) {
  const { questions } = await listQuestions();
  const bank = questions.filter((q) => q.section === section && q.status === "active");
  const seen = readSeen(userId);
  const shape = section === "ee" ? toWritingTask : toSpeakingTask;

  const picks = OFFICIAL_TASKS.map((task) => {
    const fromBank = bank
      .filter((q) => Number(q.task) === task)
      .map((q) => ({ id: q.id, task, payload: q.payload }));
    const seed = SEEDS[section]?.find((s) => s.task === task);
    // dedupe: an admin prompt identical to the seed replaces it
    const pool = seed && !fromBank.some((q) => q.payload.prompt === seed.payload.prompt)
      ? [...fromBank, seed]
      : fromBank;
    const chosen = pickLeastSeen(pool, seen);
    return chosen ? { task, ...shape(chosen) } : { task, empty: true };
  });

  recordSeen(userId, picks.filter((p) => !p.empty).map((p) => p.id));
  return picks;
}
