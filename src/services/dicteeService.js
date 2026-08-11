import { supabase } from "@/services/supabaseClient";
import { postJSON } from "@/services/aiService";
import { getActiveProfileId } from "@/utils/activeProfile";
import { loadArchive } from "@/services/sujetsArchiveService";

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
export async function fetchDictee({ task, sujetKey = null, exclude = [] }) {
  return postJSON("/api/dictee", { task, sujetKey, exclude });
}

/* ------------------------- the choosable sujets --------------------------- */

// How far back the picker reaches. The archive holds forty months — 1 428
// (sujet, tâche) pairs — and offering all of them means almost every draw is a
// sujet nobody has ever dictated, so almost every draw pays for a fresh Groq
// generation and a fresh Azure synthesis. Two months is 30-odd pairs: enough
// choice to never feel repetitive, few enough that the library fills quickly
// and most sessions then cost nothing at all.
export const RECENT_MONTHS = 2;

// Read from the SHIPPED archive the browser already has (plus any admin
// overrides), not from the API — listing subjects should not cost a request,
// and this is the same source api/_lib/dictee.js reads server-side, so a key
// picked here always resolves there.
export async function listRecentSujets(months = RECENT_MONTHS) {
  const archive = await loadArchive("ee").catch(() => ({ years: [] }));
  const flat = [];
  for (const y of archive.years || []) {
    for (const m of y.months || []) {
      flat.push({ year: y.year, monthNum: m.monthNum, month: m.month, sujets: m.data || [] });
    }
  }
  // Newest first, across years — loadArchive orders months differently inside
  // the current year and past years, so it is re-sorted rather than trusted.
  flat.sort((a, b) => b.year - a.year || b.monthNum - a.monthNum);
  return flat.slice(0, months);
}

// The pickable entries for one tâche: one per sujet in the recent months.
// Tâche 3 is a themed dossier rather than a one-line instruction, so its theme
// is what gets shown — the two documents would swamp a list.
export function sujetsForTask(months, task) {
  const out = [];
  for (const m of months) {
    for (const s of m.sujets) {
      const key = `${m.year}-${m.monthNum}-${s.n}`;
      if (task === 3) {
        if (s.t3?.theme && s.t3?.doc1 && s.t3?.doc2) {
          out.push({ key, task, n: s.n, month: m.month, year: m.year, label: s.t3.theme, theme: true });
        }
        continue;
      }
      const prompt = task === 1 ? s.t1 : s.t2;
      if (typeof prompt === "string" && prompt.trim()) {
        out.push({ key, task, n: s.n, month: m.month, year: m.year, label: prompt.trim(), theme: false });
      }
    }
  }
  return out;
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
