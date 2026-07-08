import { getBank } from "@/services/bankService";
import { supabase } from "@/services/supabaseClient";

// Examens blancs: dynamic mock-exam generation + attempt persistence.
//
// Generation is data-driven: tasks are drawn from whatever getBank() returns,
// so dropping new quiz JSONs into src/bank/<section>/ automatically enlarges
// the pool — no code changes, no hardcoded IDs.
//
// Attempts are stored in Supabase (tables from
// supabase/migrations/20260707_exam_attempts.sql, RLS-scoped to the user and
// premium-gated) so an exam survives leaving the page or switching devices.
// If the tables have not been created yet, everything transparently falls
// back to localStorage so the feature still works locally.

export const TASKS_PER_EXAM = 4;

/* ------------------------------ generation ------------------------------ */

// How many times each quiz appeared in this user's past attempts — used to
// bias selection toward least-used quizzes so the whole bank rotates over
// time instead of repeating the same combination.
function usageCounts(history) {
  const counts = {};
  for (const attempt of history) {
    for (const t of attempt.tasks) if (t.quizId) counts[t.quizId] = (counts[t.quizId] || 0) + 1;
  }
  return counts;
}

const pickWeighted = (pool, counts) => {
  const minUse = Math.min(...pool.map((q) => counts[q.id] || 0));
  const leastUsed = pool.filter((q) => (counts[q.id] || 0) === minUse);
  return leastUsed[Math.floor(Math.random() * leastUsed.length)];
};

// The official épreuve order, and what to run for an épreuve whose bank
// section has no quizzes yet: the interactive workshop/studio experiences
// (same as the Expression écrite / orale pages). As soon as quiz JSONs land
// in src/bank/ee|eo, generation switches to real bank quizzes by itself.
const EPREUVE_ORDER = ["co", "ce", "ee", "eo"];
const BUILTIN_TASKS = { ee: "writing", eo: "speaking" };

// Builds the task list for a new exam: one task per épreuve, in official
// order. Bank-backed épreuves get a random quiz (no repeats within the
// exam, preferring quizzes the user has seen least across past attempts);
// épreuves without bank content fall back to their built-in experience.
export function generateExamTasks(history = []) {
  const bank = getBank();
  const counts = usageCounts(history);
  const used = new Set();
  const tasks = [];
  // only quizzes the MCQ engine can run — "prompt" bank entries (admin
  // consignes for EE/EO) are practiced through the built-in experiences
  const mcq = (section) => (bank[section] || []).filter((q) => q.kind !== "prompt");
  const pickQuiz = (section) => {
    let pool = mcq(section).filter((q) => !used.has(q.id));
    if (pool.length === 0) pool = mcq(section); // section exhausted: allow repeats rather than fail
    const quiz = pickWeighted(pool, counts);
    used.add(quiz.id);
    return quiz;
  };
  for (const section of EPREUVE_ORDER) {
    if (mcq(section).length > 0) {
      tasks.push({ type: "quiz", quizId: pickQuiz(section).id, section, order: tasks.length });
    } else if (BUILTIN_TASKS[section]) {
      tasks.push({ type: BUILTIN_TASKS[section], section, order: tasks.length });
    } else {
      // épreuve without content or built-in: substitute a quiz from any populated section
      const populated = EPREUVE_ORDER.filter((s) => mcq(s).length > 0);
      if (populated.length === 0) continue;
      const s2 = populated[Math.floor(Math.random() * populated.length)];
      tasks.push({ type: "quiz", quizId: pickQuiz(s2).id, section: s2, order: tasks.length });
    }
  }
  return tasks;
}

// Resolves stored quiz-task references back to live bank quizzes (built-in
// tasks have nothing to resolve). A quiz removed from the bank since the
// attempt started resolves to null.
export function resolveTasks(tasks) {
  const bank = getBank();
  return tasks.map((t) =>
    (t.type || "quiz") === "quiz" ? bank[t.section]?.find((q) => q.id === t.quizId) || null : null
  );
}

/* ------------------------------- scoring -------------------------------- */

export function scoreExam(taskResults) {
  const ok = taskResults.reduce((s, r) => s + r.ok, 0);
  const total = taskResults.reduce((s, r) => s + r.total, 0);
  const pct = total ? Math.round((ok / total) * 100) : 0;
  const points = Math.round((pct / 100) * 699); // official TCF scale is /699
  const level = pct >= 85 ? "C1" : pct >= 65 ? "B2" : pct >= 40 ? "B1" : "A2";
  return { ok, total, pct, points, level };
}

/* ----------------------------- persistence ------------------------------ */
// Storage adapter: Supabase first, localStorage when the tables are missing
// (error code 42P01 = undefined_table) or no user id is available.

const LOCAL_KEY = (userId) => `passerelle-exams-${userId || "anon"}`;

const localStore = {
  list(userId) {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY(userId))) || []; } catch { return []; }
  },
  saveAll(userId, attempts) {
    try { localStorage.setItem(LOCAL_KEY(userId), JSON.stringify(attempts)); } catch { /* storage full/blocked */ }
  },
};

const isMissingTable = (error) => error && (error.code === "42P01" || /exam_attempts/.test(error.message || ""));

const rowToAttempt = (row, taskRows) => ({
  id: row.id,
  status: row.status,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  score: row.score,
  progress: row.progress || {},
  tasks: (taskRows || row.exam_attempt_tasks || [])
    .sort((a, b) => a.task_order - b.task_order)
    .map((t) => ({ type: t.task_type || "quiz", quizId: t.quiz_id, section: t.section, order: t.task_order })),
});

export async function listAttempts(userId) {
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("*, exam_attempt_tasks(*)")
    .order("started_at", { ascending: false });
  if (error) {
    if (!isMissingTable(error)) console.warn("exam_attempts:", error.message);
    return { attempts: localStore.list(userId), backend: "local" };
  }
  return { attempts: data.map((r) => rowToAttempt(r)), backend: "supabase" };
}

export async function createAttempt(userId, tasks) {
  const attempt = {
    id: globalThis.crypto?.randomUUID?.() || `local-${Date.now()}`,
    status: "in_progress",
    startedAt: new Date().toISOString(),
    completedAt: null,
    score: null,
    progress: { taskIndex: 0, picks: {}, timeLeft: {} },
    tasks,
  };
  const { data, error } = await supabase
    .from("exam_attempts")
    .insert({ user_id: userId, status: attempt.status, progress: attempt.progress })
    .select()
    .single();
  if (error) {
    localStore.saveAll(userId, [attempt, ...localStore.list(userId)]);
    return attempt;
  }
  attempt.id = data.id;
  const { error: taskErr } = await supabase.from("exam_attempt_tasks").insert(
    tasks.map((t) => ({ exam_attempt_id: data.id, task_type: t.type || "quiz", quiz_id: t.quizId || null, section: t.section, task_order: t.order }))
  );
  if (taskErr) console.warn("exam_attempt_tasks:", taskErr.message);
  return attempt;
}

export async function saveProgress(userId, attempt) {
  // Only the progress payload is written, and never over a completed
  // attempt — a late autosave must not resurrect a finished exam.
  const { error } = await supabase
    .from("exam_attempts")
    .update({ progress: attempt.progress })
    .eq("id", attempt.id)
    .eq("status", "in_progress");
  if (error) {
    const all = localStore.list(userId).map((a) =>
      a.id === attempt.id && a.status === "in_progress" ? { ...a, progress: attempt.progress } : a
    );
    localStore.saveAll(userId, all);
  }
}

export async function completeAttempt(userId, attempt, score) {
  const done = { ...attempt, status: "completed", completedAt: new Date().toISOString(), score };
  const { error } = await supabase
    .from("exam_attempts")
    .update({ status: "completed", completed_at: done.completedAt, score, progress: done.progress })
    .eq("id", attempt.id);
  if (error) {
    const all = localStore.list(userId).map((a) => (a.id === attempt.id ? done : a));
    localStore.saveAll(userId, all);
  }
  return done;
}

export async function abandonAttempt(userId, attempt) {
  const { error } = await supabase.from("exam_attempts").delete().eq("id", attempt.id);
  if (error) {
    localStore.saveAll(userId, localStore.list(userId).filter((a) => a.id !== attempt.id));
  }
}
