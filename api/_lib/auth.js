import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./groq.js";

// Validates the caller's Supabase session (Bearer token) and returns the user.
// The Expression workshops are Premium in the UI; requiring a real session
// here keeps the billable Groq key from being driven by anonymous traffic
// that never loaded the app.
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function requireUser(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) throw new HttpError(401, "Authentication required.");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "Invalid or expired session.");
  const user = data.user;

  // Multi-device sessions: the profile holds up to N active session ids (N from
  // the plan tier). The caller must present one of them. A device that rolled
  // off the set — evicted as the oldest when a newer device logged in, signed
  // out by the user, or reset by an admin — is refused here even though its JWT
  // hasn't expired yet, so it can't keep driving the billable endpoint. That
  // bite is immediate, ahead of the client's own heartbeat noticing.
  // Accounts with no set on record (null, e.g.
  // pre-migration) are left unaffected. Errors reading the column fail open.
  const { data: profile } = await admin.from("profiles").select("active_session_ids").eq("id", user.id).maybeSingle();
  const active = profile?.active_session_ids || null;
  if (Array.isArray(active) && active.length) {
    const presented = String(req.headers["x-device-session"] || "").trim();
    if (!active.includes(presented)) throw new HttpError(401, "Session ouverte sur un autre appareil.");
  }
  return user;
}

// Mirrors src/auth/rbac.js (hasActiveSubscription + admin): Premium is only
// active while premium_until — when set — is in the future. Evaluated from
// app_metadata, which clients cannot self-edit.
export function isPremiumUser(user) {
  const meta = user?.app_metadata || {};
  if (meta.role === "admin" || meta.role === "owner") return true;
  if (meta.plan !== "Premium") return false;
  if (!meta.premium_until) return true;
  const until = Date.parse(meta.premium_until);
  return Number.isFinite(until) && until > Date.now();
}

// requireUser + an active Premium plan (or admin). The Expression workshops
// are Premium in the UI; without this check any free account could drive the
// billable Groq endpoints directly, bypassing the client-side gate.
export async function requirePremium(req) {
  const user = await requireUser(req);
  if (!isPremiumUser(user)) throw new HttpError(403, "Réservé à l'abonnement Premium.");
  return user;
}

// Premium, OR a free account inside one of the two things it may use the AI
// for: the single TCF blanc it is entitled to, and the standalone Expression
// workshop's one fixed subject.
//
// Which case applies is decided by whether an attempt is named, not by a flag
// the client sets:
//   - an attempt id -> it must belong to the caller, be flagged as the free
//     mock and still be in progress; every fact is read from the database with
//     the service-role key, so the client only ever supplies the id;
//   - no attempt id -> the standalone workshop. Any signed-in account may call,
//     and the spend is bounded by claimFreeAiUse's per-tache quota rather than
//     by this gate.
//
// Premium is unaffected either way: unlimited, and nothing is counted.
// Whether this account is part-way through the one free TCF blanc, and if so
// which quiz numbers that exam is made of.
//
// api/media.js signs quiz media and lets a non-Premium caller have quiz 1 only.
// The free mock is built from quiz 15, so without this its audio and images
// were filtered out and the exam opened with empty questions. Rather than
// hard-code 15 there, the quizzes are read back from the attempt's own tasks —
// change the free exam's content and the media follows.
//
// Returns an empty array for everyone else, so the quiz-1 rule is unchanged
// for anonymous visitors and for free users who are not sitting the exam.
export async function freeMockQuizNumbers(user) {
  if (!user) return [];
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id, progress")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!attempt?.progress?.free) return [];

  const { data: tasks } = await admin
    .from("exam_attempt_tasks")
    .select("quiz_id")
    .eq("exam_attempt_id", attempt.id);
  // quiz_id looks like "co-Quiz_15_CO"; the exam's quiz number is the digits.
  const numbers = new Set();
  for (const t of tasks || []) {
    const m = String(t.quiz_id || "").match(/(\d+)/);
    if (m) numbers.add(Number(m[1]));
  }
  return [...numbers];
}

export async function requirePremiumOrFreeMock(req, attemptId) {
  const user = await requireUser(req);
  if (isPremiumUser(user)) return user;

  // No attempt named: the standalone Expression écrite / orale workshop, where
  // a free account gets one fixed subject. Access is open to any signed-in
  // user; what bounds it is the two-analyses-per-tache quota claimed below,
  // NOT this gate.
  if (attemptId == null || attemptId === "") return user;

  if (typeof attemptId !== "string") {
    throw new HttpError(403, "Réservé à l'abonnement Premium.");
  }
  const { data, error } = await admin
    .from("exam_attempts")
    .select("id, user_id, status, progress")
    .eq("id", attemptId)
    .maybeSingle();
  if (error || !data) throw new HttpError(403, "Réservé à l'abonnement Premium.");
  if (data.user_id !== user.id) throw new HttpError(403, "Réservé à l'abonnement Premium.");
  if (!data.progress?.free) throw new HttpError(403, "Réservé à l'abonnement Premium.");
  if (data.status !== "in_progress") {
    throw new HttpError(403, "Votre TCF blanc gratuit est terminé. La correction IA fait partie de l'abonnement Premium.");
  }
  return user;
}

/* ------------------ the free tier's AI quota (2 per tache) ----------------- */

// A free account gets two AI analyses per tache, counted separately for the
// TCF blanc and for the standalone workshop. Access is gated by
// requirePremiumOrFreeMock above; this caps VOLUME, because every analysis is a
// billable Groq call and the button can otherwise be pressed forever.
export const FREE_AI_USES_PER_TASK = 2;

// The six real taches. The key comes from the browser, so it is validated
// against this shape rather than trusted: without it a client could send a new
// task key per request and give itself an unlimited number of buckets.
const TASK_KEY = /^(ee|eo):[1-3]$/;

export function freeAiTaskKey(section, task) {
  const key = `${String(section || "").toLowerCase()}:${String(task ?? "").trim()}`;
  return TASK_KEY.test(key) ? key : null;
}

// The quota key carries its scope: work inside the free TCF blanc and work in
// the standalone workshop are separate budgets, each two per tache.
function quotaKey(attemptId, taskKey) {
  return attemptId ? `attempt:${attemptId}:${taskKey}` : `practice:${taskKey}`;
}

// Claims one use up front - before the AI call, so a burst of clicks is refused
// rather than served. Returns null for Premium (unlimited, nothing counted).
export async function claimFreeAiUse(user, attemptId, taskKey) {
  if (isPremiumUser(user)) return null;
  if (!taskKey) throw new HttpError(400, "Tâche inconnue.");

  const key = quotaKey(attemptId, taskKey);
  const { data, error } = await admin.rpc("claim_free_ai_use", {
    p_user: user.id,
    p_key: key,
    p_limit: FREE_AI_USES_PER_TASK,
    p_attempt: attemptId || null,
    p_task: taskKey,
  });
  // Fail CLOSED: if the quota cannot be recorded we cannot bound the spend, so
  // refuse rather than hand out an uncounted analysis.
  if (error) {
    console.warn("claim_free_ai_use:", error.message);
    throw new HttpError(503, "La correction IA est momentanément indisponible. Réessayez dans un instant.");
  }
  if (data === -1) {
    throw new HttpError(429, `Vous avez utilisé vos ${FREE_AI_USES_PER_TASK} analyses IA gratuites pour cette tâche. Les analyses illimitées font partie de l'abonnement Premium.`);
  }
  return { userId: user.id, key, left: Math.max(FREE_AI_USES_PER_TASK - data, 0) };
}

// Hands the use back when the AI call fails, so a transient upstream error does
// not cost one of only two attempts. Never throws: it runs inside a catch.
export async function releaseFreeAiUse(claim) {
  if (!claim) return;
  const { error } = await admin.rpc("release_free_ai_use", { p_user: claim.userId, p_key: claim.key });
  if (error) console.warn("release_free_ai_use:", error.message);
}

// requireUser + a back-office role (admin or owner; app_metadata,
// server-controlled). Gates the service-role admin API (api/admin/*): user
// management and platform stats. An owner has every admin capability.
export async function requireAdmin(req) {
  const user = await requireUser(req);
  const role = user.app_metadata?.role;
  if (role !== "admin" && role !== "owner") throw new HttpError(403, "Réservé à l'administration.");
  return user;
}

// requireUser + the owner role. The owner is the only account allowed to
// assign or revoke admins, so admin-management actions gate on this.
export async function requireOwner(req) {
  const user = await requireUser(req);
  if (user.app_metadata?.role !== "owner") throw new HttpError(403, "Réservé au propriétaire.");
  return user;
}
