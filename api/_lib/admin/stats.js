import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";

// Platform stats for the admin overview. Server-side because account data
// (auth.users) is only reachable with the service-role key; activity counts
// come from the app tables. Everything is computed in one request so the
// dashboard renders from a single payload.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DAY = 24 * 3600 * 1000;
const DAYS_SHOWN = 14;

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

// Skeleton for a by-day series over the last DAYS_SHOWN days (oldest first).
function emptySeries() {
  const days = [];
  for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * DAY);
    days.push({ date: dayKey(date), count: 0 });
  }
  return days;
}

function bucketByDay(dates) {
  const series = emptySeries();
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

// Exact row count without fetching rows; a missing table (pre-migration DB)
// counts as zero instead of failing the whole overview.
async function countOf(table, filter) {
  let q = admin.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  return error ? 0 : count || 0;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
    await requireAdmin(req);

    const since = new Date(Date.now() - DAYS_SHOWN * DAY).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * DAY).toISOString();
    // "Online now" = pinged last_seen_at within the last few minutes (matches the
    // window used by the Users view). Pre-migration (no column) counts as zero.
    const onlineSince = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    const [users, quizTotal, quiz7d, quizRows, examsTotal, examsCompleted, attemptsTotal, messagesNew, online] =
      await Promise.all([
        listAllUsers(),
        countOf("quiz_results"),
        countOf("quiz_results", (q) => q.gte("completed_at", sevenDaysAgo)),
        admin.from("quiz_results").select("completed_at").gte("completed_at", since).limit(20000),
        countOf("exam_attempts"),
        countOf("exam_attempts", (q) => q.eq("status", "completed")),
        countOf("question_attempts"),
        countOf("contact_messages", (q) => q.eq("status", "new")),
        countOf("profiles", (q) => q.gte("last_seen_at", onlineSince)),
      ]);

    const now = Date.now();
    const premium = users.filter((u) => {
      const m = u.app_metadata || {};
      return m.plan === "Premium" && (!m.premium_until || Date.parse(m.premium_until) > now);
    }).length;
    const admins = users.filter((u) => ["admin", "owner"].includes(u.app_metadata?.role)).length;
    const new7d = users.filter((u) => now - Date.parse(u.created_at) < 7 * DAY).length;

    res.status(200).json({
      users: {
        total: users.length,
        premium,
        free: users.length - premium,
        admins,
        new7d,
        online,
        signupsByDay: bucketByDay(users.map((u) => u.created_at)),
      },
      activity: {
        quizzesTotal: quizTotal,
        quizzes7d: quiz7d,
        quizzesByDay: bucketByDay((quizRows.data || []).map((r) => r.completed_at)),
        examsTotal,
        examsCompleted,
        questionAttempts: attemptsTotal,
      },
      messagesNew,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Stats request failed." });
  }
}
