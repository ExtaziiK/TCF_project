import { supabase } from "@/services/supabaseClient";
import { postJSON } from "@/services/aiService";
import { getActiveProfileId } from "@/utils/activeProfile";

// The dictée's client half: fetch a dictation from the server, and keep the
// history of what the candidate scored.
//
// Supabase first, localStorage when the table is missing (error 42P01) or no
// user id is available — the same resilience pattern as quizResultsService and
// examService, so a database that has not had the migration applied yet loses
// the dashboard integration rather than the feature.

const LOCAL_KEY = (userId) => `passerelle-dictee-sessions-${userId || "anon"}`;

const localStore = {
  list(userId) {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY(userId))) || []; } catch { return []; }
  },
  add(userId, row) {
    try { localStorage.setItem(LOCAL_KEY(userId), JSON.stringify([row, ...localStore.list(userId)].slice(0, 200))); } catch { /* storage full/blocked */ }
  },
};

const isMissingTable = (error) => error && (error.code === "42P01" || /dictee_sessions/.test(error.message || ""));

const rowToSession = (r) => ({
  id: r.id,
  sujetKey: r.sujet_key,
  task: r.task,
  sentences: r.sentences,
  words: r.words,
  correct: r.correct,
  accentErrors: r.accent_errors,
  score: r.score,
  plays: r.plays,
  speed: r.speed == null ? null : Number(r.speed),
  durationSec: r.duration_sec,
  errors: r.errors || {},
  completedAt: r.completed_at,
});

/* ------------------------------ the dictation ----------------------------- */

// Asks the server for one dictation. `exclude` is the candidate's own recent
// sujet keys — sent so a random draw does not hand back a text they took down
// last week. Returns { id, sujetKey, task, level, prompt, sentences[], audio[] }
// where audio[i] is base64 mp3 or null (null → the client voices it itself).
export async function fetchDictee({ task, exclude = [] }) {
  return postJSON("/api/dictee", { task, exclude });
}

/* -------------------------------- history --------------------------------- */

export async function listDicteeSessions(userId) {
  const profileId = getActiveProfileId();
  let q = supabase.from("dictee_sessions").select("*").order("completed_at", { ascending: false });
  if (profileId) q = q.eq("profile_id", profileId);
  const { data, error } = await q;
  if (error) {
    if (!isMissingTable(error)) console.warn("dictee_sessions:", error.message);
    return { sessions: localStore.list(userId), backend: "local" };
  }
  return { sessions: data.map(rowToSession), backend: "supabase" };
}

export async function recordDicteeSession(userId, session) {
  const row = {
    user_id: userId,
    profile_id: getActiveProfileId(),
    dictee_id: session.dicteeId || null,
    sujet_key: session.sujetKey || null,
    task: session.task ?? null,
    sentences: session.sentences,
    words: session.words,
    correct: session.correct,
    accent_errors: session.accentErrors ?? 0,
    score: session.score,
    plays: session.plays ?? null,
    speed: session.speed ?? null,
    duration_sec: session.durationSec ?? null,
    errors: session.errors || {},
  };
  const { error } = await supabase.from("dictee_sessions").insert(row);
  if (error) {
    localStore.add(userId, { ...rowToSession({ ...row, completed_at: new Date().toISOString() }), id: null });
  }
}

// Sujet keys the candidate has already taken down, newest first. Passed to
// fetchDictee so the random draw skips them while there is anything left.
export const recentSujetKeys = (sessions, limit = 40) =>
  [...new Set(sessions.map((s) => s.sujetKey).filter(Boolean))].slice(0, limit);

/* -------------------------------- audio ----------------------------------- */

// Decodes one server-synthesized sentence (base64 mp3) into a playable object
// URL. A blob: URL, never a data: one — the site's Content-Security-Policy
// allows `media-src 'self' blob: https:` and would refuse a data: source.
export function audioUrlFromBase64(b64, mime = "audio/mpeg") {
  if (!b64) return null;
  try {
    const bytes = Uint8Array.from(window.atob(b64), (ch) => ch.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}
