import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError, MODEL_DAILY_TOKENS } from "../groq.js";

// Usage & consumption for the admin "Utilisation" tab:
// - AI (Groq): aggregated from our own meter (ai_usage_log) — Groq has no
//   usage API, so the expression endpoints log every call they make.
// - Supabase: measured from inside the project via admin_platform_usage()
//   (database size, per-bucket storage) plus MAU derived from auth accounts.
//   Egress isn't measurable from inside — the dashboard links out for it.
// Missing tables/functions (pre-migration DB) degrade to nulls, never a 500.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DAY = 24 * 3600 * 1000;
const DAYS_SHOWN = 14;
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

function bucketByDay(dates) {
  const series = [];
  for (let i = DAYS_SHOWN - 1; i >= 0; i--) series.push({ date: dayKey(new Date(Date.now() - i * DAY)), count: 0 });
  const index = Object.fromEntries(series.map((d, i) => [d.date, i]));
  for (const at of dates) {
    const i = index[dayKey(at)];
    if (i !== undefined) series[i].count++;
  }
  return series;
}

async function listAllUsers() {
  const users = [];
  for (let page = 1; users.length < 5000; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new HttpError(502, `Lecture des comptes impossible : ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

// An upstream HTTP status, said in the language of what an admin should DO
// about it. The status alone is a category; Groq's own sentence (error_detail)
// carries the specifics and travels beside this, unaltered.
export function failureReason(status) {
  if (status === 429) return { label: "Quota Groq épuisé", hint: "Limite glissante sur 24 h — elle se libère seule, ou relevez le plafond.", tone: "amber" };
  if (status === 401 || status === 403) return { label: "Clé Groq refusée", hint: "GROQ_API_KEY invalide, révoquée ou absente des variables Vercel.", tone: "red" };
  if (status === 400 || status === 422) return { label: "Requête rejetée", hint: "Groq a refusé la requête elle-même (trop longue, mal formée).", tone: "red" };
  if (status === 500) return { label: "Configuration serveur", hint: "L'IA n'est pas configurée côté serveur.", tone: "red" };
  if (status === 502 || status === 503) return { label: "Panne amont", hint: "Groq a répondu autre chose qu'une analyse exploitable.", tone: "red" };
  if (!status) return { label: "Aucune réponse", hint: "Réseau ou délai dépassé : Groq n'a jamais répondu.", tone: "slate" };
  return { label: `Erreur ${status}`, hint: "Statut inattendu renvoyé par Groq.", tone: "slate" };
}

// How many refusals of each kind, over 24 h and 30 days. Ordered by the 24-hour
// count so the reason that is biting NOW comes first, not the one that happened
// most over the month.
function byReason(failed) {
  const since24 = Date.now() - DAY;
  const groups = {};
  for (const r of failed) {
    const status = r.error_status || 0;
    (groups[status] ||= { status, ...failureReason(status), count30d: 0, count24h: 0 });
    groups[status].count30d++;
    if (Date.parse(r.created_at) >= since24) groups[status].count24h++;
  }
  return Object.values(groups).sort((a, b) => b.count24h - a.count24h || b.count30d - a.count30d);
}

// The last refusals, one line each: who, when, on which endpoint and model, and
// what Groq actually said. Capped at 12 — this is a "what is happening right
// now" panel, not a log viewer.
//
// A row with no user_id is shown as unattributed rather than dropped: a refusal
// that happened before authentication resolved still counts as a refusal, and
// hiding it would make the list disagree with the totals beside it.
function recentFailures(failed, emails) {
  return failed.slice(0, 12).map((r) => ({
    at: r.created_at,
    email: r.user_id ? emails[r.user_id] || r.user_id : null,
    endpoint: r.endpoint || null,
    kind: r.kind || null,
    model: r.model || null,
    status: r.error_status || 0,
    ...failureReason(r.error_status || 0),
    // Groq's verbatim sentence — it names the exhausted bucket and the wait.
    // Null on rows written before 20260808_ai_usage_failure_detail.sql.
    detail: r.error_detail || null,
  }));
}

// Aggregates the last 30 days of ai_usage_log. Row-capped: at ~2 calls per
// workshop attempt this covers thousands of sessions; beyond that, swap for
// a SQL aggregate RPC without touching the dashboard.
async function aiUsage(users) {
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const COLS = "user_id, endpoint, kind, model, prompt_tokens, completion_tokens, total_tokens, audio_bytes, created_at, error_status";
  const rows = (cols) => admin
    .from("ai_usage_log")
    .select(cols)
    .gte("created_at", since30)
    .order("created_at", { ascending: false })
    .limit(20000);

  // Selecting a column the database doesn't have yet fails the whole query, and
  // the tab would go blank on the deploy that lands ahead of its migration —
  // for the sake of one diagnostic field. Ask for error_detail, and fall back to
  // the rest if it isn't there: a dashboard missing Groq's sentence is worth far
  // more than no dashboard.
  let { data, error } = await rows(`${COLS}, error_detail`);
  if (error) ({ data, error } = await rows(COLS));
  if (error) return null; // table missing — migration not applied yet

  // Failures are logged too (error_status set, no tokens). They must be kept
  // OUT of the volume and token figures — a rejected call spent nothing — but
  // reported on their own, because a saturated day would otherwise look like a
  // quiet one.
  const failed = data.filter((r) => r.error_status);
  const ok = data.filter((r) => !r.error_status);

  // ai_usage_log carries every provider. Groq does the chat and the
  // transcription; kind "tts" is Azure neural speech (api/_lib/tts.js), billed
  // per character on a different account entirely.
  const groq = ok.filter((r) => r.kind !== "tts");
  const tts = ok.filter((r) => r.kind === "tts");

  const since7 = Date.now() - 7 * DAY;
  const sum = (rows, f) => rows.reduce((s, r) => s + (f(r) || 0), 0);
  const emails = Object.fromEntries(users.map((u) => [u.id, u.email]));

  // Rows with no user_id are skipped rather than bucketed under "unknown":
  // they cannot be attributed, and a phantom top consumer is worse than a
  // slightly short list.
  const topUsers = (rows, metric) => {
    const byUser = {};
    for (const r of rows) {
      if (!r.user_id) continue;
      (byUser[r.user_id] ||= { calls: 0, units: 0 });
      byUser[r.user_id].calls++;
      byUser[r.user_id].units += metric(r) || 0;
    }
    return Object.entries(byUser)
      .sort((a, b) => b[1].calls - a[1].calls)
      .slice(0, 5)
      .map(([id, v]) => ({ email: emails[id] || id, calls: v.calls, units: v.units }));
  };

  return {
    calls30d: groq.length,
    calls7d: groq.filter((r) => Date.parse(r.created_at) >= since7).length,
    promptTokens30d: sum(groq, (r) => r.prompt_tokens),
    completionTokens30d: sum(groq, (r) => r.completion_tokens),
    transcriptions30d: groq.filter((r) => r.kind === "transcription").length,
    audioBytes30d: sum(groq, (r) => r.audio_bytes),
    callsByDay: bucketByDay(groq.map((r) => r.created_at)),
    topUsers: topUsers(groq, (r) => r.total_tokens),

    // Three windows. Only the 24-hour one has a limit to compare against:
    // Groq's allowance is a ROLLING day, so 7 and 30 are trend, not headroom.
    windows: [1, 7, 30].map((days) => {
      const from = Date.now() - days * DAY;
      const inWindow = (r) => Date.parse(r.created_at) >= from;
      const rows = groq.filter(inWindow);
      return {
        days,
        calls: rows.length,
        tokens: sum(rows, (r) => r.total_tokens),
        failures: failed.filter(inWindow).length,
      };
    }),

    // Per bucket over the rolling 24 hours, each against its own ceiling. The
    // chain is only as deep as its buckets: a model at 100% is one the fallback
    // has already moved past, which the totals alone would hide.
    buckets: Object.entries(MODEL_DAILY_TOKENS).map(([model, limit]) => {
      const rows = groq.filter((r) => r.model === model && Date.parse(r.created_at) >= Date.now() - DAY);
      return { model, limit, tokens: sum(rows, (r) => r.total_tokens), calls: rows.length };
    }),
    // What the dashboard could not show before. `saturated` is the actionable
    // one: 429s in the last hour mean the model's rate limit is refusing real
    // candidates right now, not that something is broken in the code.
    failures30d: failed.length,
    failures24h: failed.filter((r) => Date.parse(r.created_at) >= Date.now() - DAY).length,
    saturated: failed.filter((r) => r.error_status === 429 && Date.parse(r.created_at) >= Date.now() - 3600e3).length,
    // Counts alone answered "how many were refused" but never the two questions
    // an admin actually has in front of the red banner: refused to WHOM, and
    // for what reason. Both are in the row — user_id and error_status/detail —
    // they were simply aggregated away.
    failureReasons: byReason(failed),
    recentFailures: recentFailures(failed, emails),
    affectedUsers24h: new Set(
      failed.filter((r) => r.user_id && Date.parse(r.created_at) >= Date.now() - DAY).map((r) => r.user_id),
    ).size,
    // Azure neural TTS: the examiner's voice in the Tâche 2 interview. Billed
    // per CHARACTER, which is what logAiUsage stores in total_tokens for these
    // rows — hence "caractères" rather than tokens on the dashboard.
    azure: {
      calls30d: tts.length,
      calls7d: tts.filter((r) => Date.parse(r.created_at) >= since7).length,
      characters30d: sum(tts, (r) => r.total_tokens),
      audioBytes30d: sum(tts, (r) => r.audio_bytes),
      callsByDay: bucketByDay(tts.map((r) => r.created_at)),
      topUsers: topUsers(tts, (r) => r.total_tokens),
    },
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
    await requireAdmin(req);

    const users = await listAllUsers();
    const [ai, platformRes] = await Promise.all([aiUsage(users), admin.rpc("admin_platform_usage")]);

    const platform = platformRes.error ? null : platformRes.data;
    const monthAgo = Date.now() - 30 * DAY;
    const mau = users.filter((u) => u.last_sign_in_at && Date.parse(u.last_sign_in_at) >= monthAgo).length;

    res.status(200).json({ ai, platform, mau, totalUsers: users.length });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Usage request failed." });
  }
}
