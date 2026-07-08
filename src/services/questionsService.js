import { supabase } from "@/services/supabaseClient";
import { injectAdminQuizzes } from "@/services/bankService";

// Admin-authored questions: CRUD + version history + bulk operations.
// Supabase first (tables from supabase/migrations/20260708_questions.sql,
// RLS: everyone reads active questions, only admins write), localStorage
// fallback when the tables are missing — same resilience pattern as
// examService / quizResultsService, so the QMS is usable immediately.
//
// A question row: { id, section, task, difficulty, status, tags[], payload,
// version, createdAt, updatedAt, createdBy }. `payload` is the type-specific
// content described by src/constants/questionSchema.js — new fields and new
// sections need no schema change.

const LOCAL_KEY = "passerelle-admin-questions";

const localStore = {
  list() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch { return []; }
  },
  saveAll(rows) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(rows)); } catch { /* storage full/blocked */ }
  },
};

const newId = () => globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const rowToQuestion = (r) => ({
  id: r.id,
  section: r.section,
  task: r.task,
  difficulty: r.difficulty,
  status: r.status,
  tags: r.tags || [],
  payload: r.payload || {},
  version: r.version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  createdBy: r.created_by,
});

export async function listQuestions() {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return { questions: localStore.list(), backend: "local" };
  return { questions: data.map(rowToQuestion), backend: "supabase" };
}

export async function createQuestion(userId, question) {
  const now = new Date().toISOString();
  const q = { ...question, id: newId(), version: 1, createdAt: now, updatedAt: now, createdBy: userId || null };
  const { data, error } = await supabase
    .from("questions")
    .insert({
      section: q.section, task: q.task, difficulty: q.difficulty, status: q.status,
      tags: q.tags, payload: q.payload, version: 1, created_by: userId || null,
    })
    .select()
    .single();
  if (error) {
    localStore.saveAll([{ ...q, versions: [] }, ...localStore.list()]);
    return q;
  }
  return rowToQuestion(data);
}

// Every update snapshots the previous state into question_versions so the
// history can be inspected and rolled back.
export async function updateQuestion(userId, question) {
  const now = new Date().toISOString();
  const { data: prev, error: readErr } = await supabase.from("questions").select("*").eq("id", question.id).single();
  if (!readErr && prev) {
    await supabase.from("question_versions").insert({
      question_id: prev.id, version: prev.version, payload: prev.payload,
      section: prev.section, task: prev.task, difficulty: prev.difficulty, status: prev.status, tags: prev.tags,
      edited_by: userId || null,
    });
    const { data, error } = await supabase
      .from("questions")
      .update({
        section: question.section, task: question.task, difficulty: question.difficulty,
        status: question.status, tags: question.tags, payload: question.payload,
        version: prev.version + 1, updated_at: now,
      })
      .eq("id", question.id)
      .select()
      .single();
    if (!error) return rowToQuestion(data);
  }
  // local fallback: keep versions inline on the record
  const all = localStore.list().map((q) => {
    if (q.id !== question.id) return q;
    const versions = [...(q.versions || []), { version: q.version, payload: q.payload, section: q.section, task: q.task, difficulty: q.difficulty, status: q.status, tags: q.tags, editedAt: now }];
    return { ...q, ...question, version: (q.version || 1) + 1, updatedAt: now, versions };
  });
  localStore.saveAll(all);
  return all.find((q) => q.id === question.id);
}

export async function deleteQuestions(ids) {
  const { error } = await supabase.from("questions").delete().in("id", ids);
  if (error) localStore.saveAll(localStore.list().filter((q) => !ids.includes(q.id)));
}

// Bulk field change (status, difficulty, task…) applied to many questions.
export async function patchQuestions(ids, patch) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("questions").update({ ...patch, updated_at: now }).in("id", ids);
  if (error) {
    localStore.saveAll(localStore.list().map((q) => (ids.includes(q.id) ? { ...q, ...patch, updatedAt: now } : q)));
  }
}

export async function duplicateQuestions(userId, questions) {
  const copies = [];
  for (const q of questions) {
    const copy = await createQuestion(userId, {
      ...q,
      payload: JSON.parse(JSON.stringify(q.payload)),
      status: "disabled", // copies start disabled so they never appear live by accident
    });
    copies.push(copy);
  }
  return copies;
}

export async function listVersions(question) {
  const { data, error } = await supabase
    .from("question_versions")
    .select("*")
    .eq("question_id", question.id)
    .order("version", { ascending: false });
  if (error) {
    const local = localStore.list().find((q) => q.id === question.id);
    return (local?.versions || []).slice().reverse();
  }
  return data.map((v) => ({ version: v.version, payload: v.payload, section: v.section, task: v.task, difficulty: v.difficulty, status: v.status, tags: v.tags, editedAt: v.created_at }));
}

export async function rollbackQuestion(userId, question, version) {
  return updateQuestion(userId, {
    ...question,
    section: version.section ?? question.section,
    task: version.task ?? question.task,
    difficulty: version.difficulty ?? question.difficulty,
    status: version.status ?? question.status,
    tags: version.tags ?? question.tags,
    payload: version.payload,
  });
}

/* --------------------------- media (storage) ----------------------------- */

// Uploads to the same Supabase Storage buckets the bank media lives in, so a
// file uploaded once is referenced by URL from any number of questions.
export async function uploadMedia(file, kind) {
  const bucket = kind === "audio" ? "Audio" : "Image";
  const path = `admin/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw new Error(`Téléversement refusé (${error.message}). Vous pouvez coller une URL à la place.`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/* ---------------------- site integration helpers ------------------------- */

// Maps active admin questions into the shapes the site already consumes.

// Bank sections: questions grouped per section+task as virtual bank quizzes
// appended to the file-based bank. CO/CE MCQs run through the quiz engine;
// EE/EO prompts become "consignes" entries (kind: "prompt") that the bank
// explorer lists and links to the workshop pages.
export function toBankQuizzes(questions) {
  const active = questions.filter((q) => q.status === "active");
  const groups = {};
  for (const q of active) {
    if (!["co", "ce", "ee", "eo"].includes(q.section)) continue;
    const key = `${q.section}-${q.task || 0}`;
    (groups[key] ||= []).push(q);
  }
  return Object.entries(groups).map(([key, qs]) => {
    const [section, task] = key.split("-");
    const prompt = section === "ee" || section === "eo";
    return {
      id: `admin-${key}`,
      title: `${task !== "0" ? `Tâche ${task}` : "Questions"} · ajouts de l'équipe`,
      section,
      kind: prompt ? "prompt" : undefined,
      quizNumber: 1000 + Number(task), // sorts after the file-based quizzes
      questions: qs.map((q) =>
        prompt
          ? {
              id: q.id,
              prompt: q.payload.prompt,
              instructions: q.payload.instructions || "",
              minWords: q.payload.minWords,
              maxWords: q.payload.maxWords,
              prepTime: q.payload.prepTime,
              speakTime: q.payload.speakTime,
              image: q.payload.image || null,
            }
          : {
              id: q.id,
              q: [q.payload.passage, q.payload.transcript, q.payload.q].filter(Boolean).join(" — "),
              opts: (q.payload.opts || []).filter((o) => String(o).trim()),
              a: q.payload.answerIndex,
              exp: q.payload.exp || "",
              audio: q.payload.audio || null,
              image: q.payload.image || null,
            }
      ),
    };
  });
}

// Loads active questions and pushes them everywhere the site consumes them:
// co/ce MCQs become bank quizzes; ee/eo prompts feed the workshop pages via
// the getters below. Called at app start and after each QMS mutation.
let siteQuestions = [];
export async function syncSiteContent() {
  const { questions } = await listQuestions();
  siteQuestions = questions;
  injectAdminQuizzes(toBankQuizzes(questions));
  return questions;
}
export const getAdminWritingTasks = () => toWritingTasks(siteQuestions);
export const getAdminSpeakingTasks = () => toSpeakingTasks(siteQuestions);

// Prompt sections: expression écrite / orale tasks for the workshop pages.
export function toWritingTasks(questions) {
  return questions
    .filter((q) => q.status === "active" && q.section === "ee")
    .map((q, i) => ({
      id: `admin-ee-${q.id}`,
      t: `Tâche ${q.task || "?"} · ${String(q.payload.prompt || "").slice(0, 34)}…`,
      words: `${q.payload.minWords} à ${q.payload.maxWords} mots`,
      min: Math.round(Number(q.payload.minWords) / 4) || 15,
      prompt: [q.payload.prompt, q.payload.instructions].filter(Boolean).join(" "),
      sample: q.payload.sample || "",
      adminIndex: i,
    }));
}

export function toSpeakingTasks(questions) {
  return questions
    .filter((q) => q.status === "active" && q.section === "eo")
    .map((q) => ({
      id: `admin-eo-${q.id}`,
      t: `Tâche ${q.task || "?"} · ${String(q.payload.prompt || "").slice(0, 34)}…`,
      prep: Number(q.payload.prepTime) || 0,
      dur: Number(q.payload.speakTime) || 120,
      prompt: q.payload.prompt,
    }));
}
