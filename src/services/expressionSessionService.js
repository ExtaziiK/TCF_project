import { EE_COMBINATIONS } from "@/constants/writing";
import { SPEAKING_TASKS } from "@/constants/speaking";
import { loadArchive } from "@/services/sujetsArchiveService";

// Practice sessions for Expression écrite / orale, drawn from the monthly
// subjects archive (the same data as the Ressources pages: shipped base +
// admin additions). A session locks one prompt per official tâche:
//   - EE rotates a whole combinaison (its three tâches together, like the exam)
//   - EO draws Tâche 2 & 3 from the archive; Tâche 1 stays the generic entretien
// Selection is least-served-first (fair rotation), persisted per-user locally;
// once everything is seen equally the pool reshuffles itself. Falls back to the
// built-in seeds if the archive is ever empty/unreachable.

export const OFFICIAL_TASKS = [1, 2, 3];

// Per-tâche metadata (labels, word counts / timings) reused for every archived
// subject — only the prompt text comes from the archive.
const EE_META = {
  1: { t: "Tâche 1 · Message court", words: "60 à 120 mots", min: 15 },
  2: { t: "Tâche 2 · Message développé", words: "120 à 150 mots", min: 20 },
  3: { t: "Tâche 3 · Texte argumenté", words: "120 à 180 mots", min: 25 },
};
const EO_META = {
  1: { t: "Tâche 1 · Entretien dirigé", prep: 0, dur: 120 },
  2: { t: "Tâche 2 · Interaction", prep: 120, dur: 330 },
  3: { t: "Tâche 3 · Point de vue", prep: 0, dur: 270 },
};

/* -------------------------- seen-count tracking -------------------------- */
// How often each prompt was served to this user. Local for now; moving it to a
// Supabase table later only changes these two functions.
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

/* ------------------------------ archive pools ---------------------------- */
// EE Tâche 3 ships a theme + two short documents; present them as one argued
// prompt (kept multi-line — the workshop renders the prompt with line breaks).
function composeT3(t3) {
  const parts = [];
  if (t3?.theme) parts.push(`« ${t3.theme} »`);
  if (t3?.doc1) parts.push(`Document 1 : ${t3.doc1}`);
  if (t3?.doc2) parts.push(`Document 2 : ${t3.doc2}`);
  parts.push("Deux points de vue s'opposent sur cette question. Rédigez un texte argumenté dans lequel vous exposez votre opinion, à l'aide d'arguments et d'exemples.");
  return parts.join("\n\n");
}

// Flattens the EE archive into a pool of combinaisons (one subject = 3 tâches).
async function buildEECombos() {
  const { years } = await loadArchive("ee");
  const combos = [];
  for (const y of years) for (const m of y.months) (m.data || []).forEach((s, i) => {
    if (s.t1 || s.t2 || s.t3) combos.push({ id: `ee-${m.key}-${s.n ?? i + 1}`, s });
  });
  return combos;
}

function eeTasksFromCombo({ id, s }) {
  return OFFICIAL_TASKS.map((task) => {
    if (task === 1) return s.t1 ? { task, id: `${id}-t1`, ...EE_META[1], sample: "", prompt: s.t1 } : { task, empty: true };
    if (task === 2) return s.t2 ? { task, id: `${id}-t2`, ...EE_META[2], sample: "", prompt: s.t2 } : { task, empty: true };
    return s.t3 ? { task, id: `${id}-t3`, ...EE_META[3], sample: "", prompt: composeT3(s.t3) } : { task, empty: true };
  });
}

// Flattens the EO archive into per-tâche pools (Tâche 2 & 3 only).
async function buildEOPools() {
  const { years } = await loadArchive("eo");
  const pools = { 2: [], 3: [] };
  for (const y of years) for (const m of y.months) for (const tache of (m.data || [])) {
    if (!pools[tache.tache]) continue;
    for (const p of tache.parties || []) (p.sujets || []).forEach((txt, i) => {
      pools[tache.tache].push({ id: `eo-${m.key}-t${tache.tache}-p${p.partie}-${i}`, prompt: txt });
    });
  }
  return pools;
}

/* ----------------------------- session builder --------------------------- */
// EE fallback when the archive is empty: rotate the built-in combinations.
function generateWritingCombinationSession(userId) {
  const seen = readSeen(userId);
  const combo = pickLeastSeen(EE_COMBINATIONS, seen) || EE_COMBINATIONS[0];
  recordSeen(userId, [combo.id]);
  return OFFICIAL_TASKS.map((task) => {
    const tk = combo.tasks.find((x) => Number(x.task) === task);
    return tk ? { task, ...tk } : { task, empty: true };
  });
}

// One prompt per official tâche, locked for the session. Returns
// [{ task: 1..3, ...workshopTaskShape } | { task, empty: true }].
export async function generateExpressionSession(userId, section) {
  const seen = readSeen(userId);
  if (section === "ee") {
    const combos = await buildEECombos();
    if (!combos.length) return generateWritingCombinationSession(userId);
    const combo = pickLeastSeen(combos, seen) || combos[0];
    recordSeen(userId, [combo.id]);
    return eeTasksFromCombo(combo);
  }
  // Expression orale.
  const pools = await buildEOPools();
  const picks = OFFICIAL_TASKS.map((task) => {
    if (task === 1) return { task, ...SPEAKING_TASKS[0], id: "seed-eo-1" }; // entretien dirigé
    const pool = pools[task] || [];
    if (!pool.length) { const seed = SPEAKING_TASKS[task - 1]; return seed ? { task, ...seed, id: `seed-eo-${task}` } : { task, empty: true }; }
    const chosen = pickLeastSeen(pool, seen);
    return { task, id: chosen.id, ...EO_META[task], prompt: chosen.prompt };
  });
  recordSeen(userId, picks.filter((p) => !p.empty).map((p) => p.id));
  return picks;
}
