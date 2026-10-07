import { createClient } from "@supabase/supabase-js";
import { requireUser } from "../auth.js";
import { HttpError } from "../groq.js";
import { enforceRateLimit } from "../ratelimit.js";
import { sendMail, mailConfigured } from "../mailer.js";
import { composeEmail } from "../emails.js";
import { loadWelcomeConfig, welcomeSkipReason, sendWelcome } from "../welcome.js";
import { summarizeScore, practiceTips } from "../mockResults.js";

// Self-service account deletion, Facebook-style: asking to delete DEACTIVATES
// the account at once and schedules the real deletion GRACE_DAYS later. Any
// sign-in during that window cancels it. Grouped with the small public routes
// purely for the Vercel function count (see api/public/[resource].js); every
// action here requires a signed-in user, except "abandon-signup" below, which
// by nature has no session yet and proves itself with the password instead.
//
//   POST /api/public/account { action: "delete" }
//        Stamps deletion_requested_at / deletion_scheduled_for on the account,
//        signs it out on every device and emails the date.
//   POST /api/public/account { action: "reactivate" }
//        Clears both stamps. The app calls this as soon as a session shows up
//        carrying them — i.e. on the next sign-in, whatever the method.
//   POST /api/public/account { action: "welcome" }
//        Sends the welcome email, once per account (welcome_email_sent_at), to
//        a confirmed account created in the last WELCOME_WINDOW_DAYS, unless
//        the owner switched it off in Administration → Emails. See ../welcome.js.
//   POST /api/public/account { action: "mock-results", attemptId }
//        "Vos résultats du TCF blanc", right after the FREE TCF blanc, once per
//        account (mock_results_email_sent_at). Only the attempt id comes from
//        the browser: owner, status, "free" and the score are all read here.
//   POST /api/public/account { action: "abandon-signup", email, password }
//        "Wrong address?" on the confirmation-code screen. Deletes the account
//        that sign-up just created, so the candidate can sign up again with
//        the right address — otherwise the first attempt keeps their username
//        reserved (handle_new_user writes the profile at once). See
//        handleAbandonSignup for what it takes.
//
// The actual deletion is done by the daily cron (api/cron/reminders.js), which
// also re-checks last_sign_in_at so a sign-in whose "reactivate" call never
// landed still cancels it.
//
// State lives in app_metadata (clients cannot edit it), like the reminder
// stamps — no table, no migration. Metadata is merged, never replaced.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export const GRACE_DAYS = 7;

const fmtLongDate = (iso) =>
  new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Toronto" });
const DAY_MS = 24 * 60 * 60 * 1000;
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.tcfpasserelle.com").replace(/\/$/, "");

// app_metadata with the deletion stamps cleared — what reactivating writes
// back. Also used by the cron when a sign-in it spots cancels a deletion.
// Nulled rather than omitted: GoTrue MERGES app_metadata on update, so a key
// that is simply left out survives untouched.
export function withoutDeletion(meta) {
  return { ...(meta || {}), deletion_requested_at: null, deletion_scheduled_for: null };
}

async function handleDelete(req, res, user) {
  const meta = user.app_metadata || {};
  // Staff accounts carry the back office with them; losing the owner leaves
  // nobody able to manage admins. Same rule as the admin panel's delete.
  if (meta.role === "owner" || meta.role === "admin") {
    throw new HttpError(403, "Un compte administrateur ne peut pas être supprimé depuis le profil.");
  }

  const now = new Date();
  const scheduledFor = new Date(now.getTime() + GRACE_DAYS * DAY_MS).toISOString();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...meta, deletion_requested_at: now.toISOString(), deletion_scheduled_for: scheduledFor },
  });
  if (error) throw new HttpError(502, `Demande refusée : ${error.message}`);

  // Deactivate: sign out every device. sessions_revoked_at is the marker the
  // app's heartbeat acts on (see the 20260727 migration) and the global
  // signOut revokes refresh tokens so an idle tab can't quietly resume.
  await admin
    .from("profiles")
    .update({ sessions_revoked_at: now.toISOString(), active_session_ids: null, active_session_id: null })
    .eq("id", user.id);
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  try { await admin.auth.admin.signOut(token, "global"); } catch { /* the marker above still kicks devices */ }

  let emailed = false;
  if (user.email && mailConfigured()) {
    try {
      const mail = await composeEmail(admin, "deletionScheduled", user, { date: fmtLongDate(scheduledFor) }, SITE);
      if (mail) {
        await sendMail({ to: user.email, subject: mail.subject, html: mail.html });
        emailed = true;
      }
    } catch (err) {
      console.error(`account: deletion email to ${user.email} failed:`, err.message);
    }
  }
  return res.status(200).json({ ok: true, scheduledFor, emailed });
}

async function handleWelcome(res, user) {
  const reason = welcomeSkipReason(user);
  if (reason) return res.status(200).json({ ok: true, sent: false, reason });
  const cfg = await loadWelcomeConfig(admin);
  // Switched off by the owner: nothing is stamped, so an account still inside
  // the window gets it if the email is switched back on.
  if (!cfg.enabled) return res.status(200).json({ ok: true, sent: false, reason: "disabled" });
  try {
    await sendWelcome(admin, user, cfg);
  } catch (err) {
    console.error(`account: welcome email to ${user.email} failed:`, err.message);
    throw new HttpError(502, "Envoi du courriel de bienvenue impossible.");
  }
  return res.status(200).json({ ok: true, sent: true });
}

// Only an account that is still unconfirmed, younger than a day, and whose
// password the caller knows. The password is checked by GoTrue itself: for an
// unconfirmed account it answers "email_not_confirmed" ONLY when the password
// is right (a wrong one gets "invalid_credentials" — verified 2026-10-06), so
// a stranger who merely knows the address cannot remove someone's sign-up.
// The answer is the same whatever happened, so it reveals nothing about which
// addresses exist.
const ABANDON_MAX_AGE_MS = DAY_MS;

async function handleAbandonSignup(req, res) {
  await enforceRateLimit(req, { name: "abandon-signup", limit: 10, windowSeconds: 3600 });
  const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 200);
  const password = String(req.body?.password || "").slice(0, 200);
  const done = (removed) => res.status(200).json({ ok: true, removed });
  if (!email || !password) return done(false);

  const { error } = await anon.auth.signInWithPassword({ email, password });
  if (error?.code !== "email_not_confirmed") return done(false);

  for (let page = 1; page <= 20; page++) {
    const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (listError) return done(false);
    const user = data.users.find((u) => (u.email || "").toLowerCase() === email);
    if (user) {
      const young = Date.now() - Date.parse(user.created_at) < ABANDON_MAX_AGE_MS;
      if (user.email_confirmed_at || user.confirmed_at || !young) return done(false);
      const { error: delError } = await admin.auth.admin.deleteUser(user.id);
      return done(!delError);
    }
    if (data.users.length < 1000) break;
  }
  return done(false);
}

async function handleMockResults(req, res, user) {
  const meta = user.app_metadata || {};
  const done = (sent, reason) => res.status(200).json({ ok: true, sent, reason });
  if (meta.mock_results_email_sent_at) return done(false, "already");
  if (!user.email || !mailConfigured()) return done(false, "no-mail");
  const attemptId = String(req.body?.attemptId || "");
  if (!attemptId) throw new HttpError(400, "TCF blanc introuvable.");
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id, user_id, status, score, progress")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt || attempt.user_id !== user.id) throw new HttpError(404, "TCF blanc introuvable.");
  if (attempt.status !== "completed" || !attempt.progress?.free || !attempt.score?.perTask) return done(false, "not-free-or-unfinished");

  const summary = summarizeScore(attempt.score);
  const mail = await composeEmail(admin, "mockResults", user, {
    score: `${summary.points} / 699`,
    niveau: summary.level,
    faible: summary.weakest?.name || "la compréhension",
    conseils: practiceTips(summary.weakest?.key),
    _score: attempt.score,
  }, SITE);
  if (!mail) return done(false, "disabled");
  const stamp = (v) => admin.auth.admin.updateUserById(user.id, { app_metadata: { ...meta, mock_results_email_sent_at: v } });
  await stamp(new Date().toISOString());
  try {
    await sendMail({ to: user.email, subject: mail.subject, html: mail.html });
  } catch (err) {
    await stamp(null);
    console.error(`account: mock results email to ${user.email} failed:`, err.message);
    throw new HttpError(502, "Envoi des résultats impossible.");
  }
  return done(true);
}

async function handleReactivate(res, user) {
  const meta = user.app_metadata || {};
  if (!meta.deletion_scheduled_for && !meta.deletion_requested_at) return res.status(200).json({ ok: true, reactivated: false });
  const { error } = await admin.auth.admin.updateUserById(user.id, { app_metadata: withoutDeletion(meta) });
  if (error) throw new HttpError(502, `Réactivation refusée : ${error.message}`);
  return res.status(200).json({ ok: true, reactivated: true });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    if (req.body?.action === "abandon-signup") return await handleAbandonSignup(req, res);
    const user = await requireUser(req);
    await enforceRateLimit(req, { name: "account", limit: 10, windowSeconds: 3600, userId: user.id });
    // getUser() returns the live record, so these stamps are current even if
    // the caller's JWT predates them.
    const action = req.body?.action;
    if (action === "delete") return await handleDelete(req, res, user);
    if (action === "reactivate") return await handleReactivate(res, user);
    if (action === "welcome") return await handleWelcome(res, user);
    if (action === "mock-results") return await handleMockResults(req, res, user);
    throw new HttpError(400, "Action inconnue.");
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "Requête refusée." });
  }
}
