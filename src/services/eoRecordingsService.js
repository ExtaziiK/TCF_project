import { getSupabase } from "@/services/supabaseClient";

// The Expression orale recordings a candidate keeps to listen to themselves
// (supabase/migrations/20261023_eo_recordings.sql): one audio file per tâche,
// the whole exchange as it happened. Everything here talks to Supabase
// directly under RLS — no serverless hop (the Vercel plan has none to spare).
// Files live in the account's own folder of the private "eo-recordings"
// bucket and are played through short-lived signed URLs.

const BUCKET = "eo-recordings";
const TABLE = "eo_recordings";
// The newest this many are kept per account; older ones are deleted after
// each save, so storage stays bounded (about 1-2 MB per tâche).
export const KEEP_RECORDINGS = 30;
const MAX_BYTES = 15 * 1024 * 1024; // the bucket's own limit
// Fired on window after a save or a delete, so an open list refreshes itself.
export const EO_RECORDINGS_CHANGED = "eo-recordings-changed";
const changed = () => { try { window.dispatchEvent(new window.Event(EO_RECORDINGS_CHANGED)); } catch { /* no window */ } };

const extFor = (mime = "") => (mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("mpeg") ? "mp3" : "webm");
// The bucket accepts these types only; strip codec parameters
// ("audio/webm;codecs=opus" -> "audio/webm").
const baseMime = (mime = "") => mime.split(";")[0].trim() || "audio/webm";

// Saves one tâche's recording. Returns { ok, id?, error? } and never throws:
// a failed save must not spoil the feedback the candidate is reading.
export async function saveEoRecording({ blob, task, taskLabel, prompt, mode, durationSecs, score }) {
  try {
    if (!blob?.size) return { ok: false, error: "empty" };
    if (blob.size > MAX_BYTES) return { ok: false, error: "too-large" };
    const sb = await getSupabase();
    const { data: auth } = await sb.auth.getUser();
    const u = auth?.user;
    if (!u) return { ok: false, error: "not-authenticated" };

    const mime = baseMime(blob.type);
    const path = `${u.id}/${Date.now()}-t${task}-${Math.random().toString(36).slice(2, 8)}.${extFor(mime)}`;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: false });
    if (upErr) return { ok: false, error: upErr.message };

    const { data, error } = await sb.from(TABLE).insert({
      user_id: u.id,
      task,
      task_label: taskLabel ? String(taskLabel).slice(0, 120) : null,
      prompt: prompt ? String(prompt).slice(0, 1500) : null,
      mode: mode === "exam" ? "exam" : "practice",
      storage_path: path,
      mime,
      duration_secs: Number.isFinite(durationSecs) ? Math.round(durationSecs) : null,
      score: Number.isFinite(score) ? Math.max(0, Math.min(20, Math.round(score))) : null,
    }).select("id").single();
    if (error) {
      // No row to point at the file: don't leave it orphaned.
      await sb.storage.from(BUCKET).remove([path]).catch(() => {});
      return { ok: false, error: error.message };
    }
    await pruneOld(u.id).catch(() => {});
    changed();
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err?.message || "failed" };
  }
}

// The account's recordings, newest first.
export async function listEoRecordings() {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .select("id, task, task_label, prompt, mode, storage_path, mime, duration_secs, score, created_at")
    .order("created_at", { ascending: false })
    .limit(KEEP_RECORDINGS);
  if (error) throw error;
  return data || [];
}

// A playable URL for one recording, valid for an hour.
export async function eoRecordingUrl(storagePath) {
  const sb = await getSupabase();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// Deletes a recording: the file, then its row.
export async function deleteEoRecording({ id, storage_path: storagePath }) {
  const sb = await getSupabase();
  if (storagePath) await sb.storage.from(BUCKET).remove([storagePath]);
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  changed();
}

// Keeps the newest KEEP_RECORDINGS; deletes the files and rows of the rest.
async function pruneOld(userId) {
  const sb = await getSupabase();
  const { data } = await sb
    .from(TABLE)
    .select("id, storage_path")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(KEEP_RECORDINGS, KEEP_RECORDINGS + 99);
  if (!data?.length) return;
  await sb.storage.from(BUCKET).remove(data.map((r) => r.storage_path)).catch(() => {});
  await sb.from(TABLE).delete().in("id", data.map((r) => r.id));
}
