import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";
import { quizLabel } from "./activity.js";
import { currentPlanLabel } from "../planLabel.js";

// Platform stats for the admin overview. Server-side because account data
// (auth.users) is only reachable with the service-role key; activity counts
// come from the app tables. Everything is computed in one request so the
// dashboard renders from a single payload.
//
//   GET /api/admin/stats            → the counters + by-day series
//   GET /api/admin/stats?detail=key → who/what is behind one counter, for the
//                                     pop-up opened by clicking its card

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DAY = 24 * 3600 * 1000;
const DAYS_SHOWN = 14;
// "Online now" window — same three minutes the Users view uses (the app pings
// last_seen_at every 45s), so the two screens can never disagree.
const ONLINE_WINDOW_MS = 3 * 60 * 1000;
// Rows returned per detail list. The card keeps showing the true total; the
// pop-up shows the newest slice of it and says so when it is cut off.
const DETAIL_LIMIT = 60;

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

/* ------------------------------ detail lists ------------------------------ */

// One list per stat card, so clicking "3 connectés maintenant" shows WHICH
// three. Every row is data the platform already stores; nothing new is
// recorded, and no free-text answer or message body is returned — labels,
// scores and timestamps only.
//
// Rows share one shape so the pop-up renders them all the same way:
//   { id, label, sub, pill, tone, right, at }
// `at` is an ISO timestamp the client formats; `pill` is a short badge.

const displayName = (u) => u?.user_metadata?.name || u?.user_metadata?.full_name || u?.email || null;

const premiumActive = (meta, now = Date.now()) =>
  meta.plan === "Premium" && (!meta.premium_until || Date.parse(meta.premium_until) > now);

// Rows are joined to accounts in memory: listUsers has no "by id" batch call,
// and one getUserById per row would be 60 round trips for a single pop-up.
async function accountIndex() {
  const users = await listAllUsers();
  return new Map(users.map((u) => [u.id, u]));
}

// A deleted account still owns rows in the activity tables (question_attempts
// nulls the user_id, the others cascade), so this never assumes a match.
const whoIs = (byId, userId) => {
  const u = byId.get(userId);
  return u ? { label: displayName(u), sub: u.email } : { label: "Compte supprimé", sub: null };
};

const scoreTone = (pct) => (pct == null ? "slate" : pct >= 70 ? "green" : pct >= 50 ? "amber" : "red");

// Fallback label for a bank question id, used when the client can't resolve it
// against the bundled bank (admin-authored questions, a bank file since
// removed). Ids are built as bank-<section>-<exam_id ?? fileName>-<question id>
// in src/utils/bankAdapter.js, and the middle part is NOT reliably a quiz
// number: CO files have no exam_id so it is the file name ("Quiz_3_CO.json"),
// while CE files carry the source export's exam_id (Quiz 1 → 37). Printing it
// raw claimed a "quiz 37" that does not exist, so it is only used when it
// really does spell out a quiz number.
function questionLabel(id = "") {
  const m = /^bank-(co|ce|ee|eo)-(.*)-(\d+)$/i.exec(String(id));
  if (!m) return String(id);
  const [, section, key, order] = m;
  const quiz = /quiz[_\s-]*(\d+)/i.exec(key);
  return `${section.toUpperCase()}${quiz ? ` — Quiz ${quiz[1]}` : ""} · question ${order}`;
}

async function rowsOf(query) {
  const { data, error } = await query;
  return error ? [] : data || [];
}

const DETAILS = {
  // Newest accounts first — the question behind the card is "who just joined".
  users: async () => {
    const byId = await accountIndex();
    const users = [...byId.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const [profiles] = await Promise.all([
      rowsOf(admin.from("profiles").select("id, username").in("id", users.slice(0, DETAIL_LIMIT).map((u) => u.id))),
    ]);
    const usernames = Object.fromEntries(profiles.map((p) => [p.id, p.username]));
    return {
      title: "Utilisateurs inscrits",
      subtitle: "Les comptes les plus récents en premier.",
      total: users.length,
      avatar: true,
      rows: users.slice(0, DETAIL_LIMIT).map((u) => {
        const meta = u.app_metadata || {};
        const active = premiumActive(meta);
        return {
          id: u.id,
          label: displayName(u),
          sub: [u.email, usernames[u.id] ? `@${usernames[u.id]}` : null].filter(Boolean).join(" · "),
          pill: meta.role === "owner" ? "Owner" : meta.role === "admin" ? "Admin"
            : active ? currentPlanLabel(meta.plan_label) || "Premium" : "Basic",
          tone: meta.role ? "red" : active ? "gold" : "slate",
          right: "inscrit le",
          at: u.created_at,
        };
      }),
    };
  },

  // Everyone whose last_seen_at ping is inside the online window.
  online: async () => {
    const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    const [byId, profiles, total] = await Promise.all([
      accountIndex(),
      rowsOf(admin.from("profiles").select("id, username, last_seen_at")
        .gte("last_seen_at", since).order("last_seen_at", { ascending: false }).limit(DETAIL_LIMIT)),
      // Counted, not derived from the capped list: the card shows the real
      // number and the two must agree even on a busy evening.
      countOf("profiles", (q) => q.gte("last_seen_at", since)),
    ]);
    return {
      title: "Connectés maintenant",
      subtitle: "Comptes actifs sur le site au cours des 3 dernières minutes.",
      total,
      avatar: true,
      empty: "Personne en ligne pour le moment.",
      rows: profiles.map((p) => {
        const who = whoIs(byId, p.id);
        return {
          id: p.id,
          label: who.label || (p.username ? `@${p.username}` : "Compte"),
          sub: [who.sub, p.username ? `@${p.username}` : null].filter(Boolean).join(" · "),
          pill: "en ligne",
          tone: "green",
          right: "vu",
          at: p.last_seen_at,
        };
      }),
    };
  },

  // Active Premium accounts, soonest expiry first: the list is most useful as
  // "who is about to lose access", not as another alphabetical roster.
  premium: async () => {
    const byId = await accountIndex();
    const now = Date.now();
    const holders = [...byId.values()].filter((u) => premiumActive(u.app_metadata || {}, now));
    holders.sort((a, b) => {
      // No expiry = unlimited access; those belong at the end, not at the top.
      const ax = a.app_metadata?.premium_until ? Date.parse(a.app_metadata.premium_until) : Infinity;
      const bx = b.app_metadata?.premium_until ? Date.parse(b.app_metadata.premium_until) : Infinity;
      return ax - bx;
    });
    return {
      title: "Abonnés Premium actifs",
      subtitle: "Accès en cours, les échéances les plus proches en premier.",
      total: holders.length,
      avatar: true,
      empty: "Aucun abonnement Premium actif.",
      rows: holders.slice(0, DETAIL_LIMIT).map((u) => {
        const meta = u.app_metadata || {};
        return {
          id: u.id,
          label: displayName(u),
          sub: u.email,
          pill: currentPlanLabel(meta.plan_label) || "Premium",
          tone: "gold",
          right: meta.premium_until ? "expire le" : "sans expiration",
          at: meta.premium_until || null,
        };
      }),
    };
  },

  quizzes: async () => {
    const quizzes = await rowsOf(admin.from("quiz_results")
      .select("id, user_id, quiz_key, section, ok, total, pct, completed_at")
      .order("completed_at", { ascending: false }).limit(DETAIL_LIMIT));
    const byId = await accountIndex();
    return {
      title: "Quiz complétés",
      subtitle: "Les derniers quiz terminés, avec le score obtenu.",
      total: await countOf("quiz_results"),
      empty: "Aucun quiz terminé pour le moment.",
      rows: quizzes.map((q) => ({
        id: `quiz-${q.id}`,
        label: quizLabel(q.quiz_key, q.section),
        sub: [whoIs(byId, q.user_id).label, `${q.ok}/${q.total} bonnes réponses`].filter(Boolean).join(" · "),
        pill: `${q.pct} %`,
        tone: scoreTone(q.pct),
        right: "le",
        at: q.completed_at,
      })),
    };
  },

  exams: async () => {
    const [done, running] = await Promise.all([
      rowsOf(admin.from("exam_attempts").select("id, user_id, score, completed_at")
        .eq("status", "completed").order("completed_at", { ascending: false }).limit(DETAIL_LIMIT)),
      countOf("exam_attempts", (q) => q.neq("status", "completed")),
    ]);
    const byId = await accountIndex();
    return {
      title: "TCF blancs terminés",
      subtitle: running > 0 ? `${running} autre${running > 1 ? "s" : ""} tentative${running > 1 ? "s" : ""} encore en cours.` : "Épreuves blanches menées jusqu'au bout.",
      total: await countOf("exam_attempts", (q) => q.eq("status", "completed")),
      avatar: true,
      empty: "Aucun TCF blanc terminé pour le moment.",
      rows: done.map((e) => {
        const s = e.score || {};
        const who = whoIs(byId, e.user_id);
        return {
          id: `exam-${e.id}`,
          label: who.label,
          sub: [who.sub, s.level ? `niveau ${s.level}` : null, s.points != null ? `${s.points} pts` : null].filter(Boolean).join(" · "),
          pill: s.pct != null ? `${s.pct} %` : "sans score",
          tone: scoreTone(s.pct ?? null),
          right: "le",
          at: e.completed_at,
        };
      }),
    };
  },

  // The highest-volume table on the platform: the newest slice, plus the
  // accuracy the whole table adds up to (a count query, not a scan of rows).
  attempts: async () => {
    const [recent, seen, answered, correct] = await Promise.all([
      rowsOf(admin.from("question_attempts").select("id, question_id, user_id, answered, is_correct, duration_ms, created_at")
        .order("created_at", { ascending: false }).limit(DETAIL_LIMIT)),
      countOf("question_attempts"),
      countOf("question_attempts", (q) => q.eq("answered", true)),
      countOf("question_attempts", (q) => q.eq("answered", true).eq("is_correct", true)),
    ]);
    const byId = await accountIndex();
    // Accuracy is over ANSWERED rows only: a skip is stored with answered =
    // false and no verdict, so counting it as a miss would misreport it.
    const pct = answered ? Math.round((correct / answered) * 100) : null;
    return {
      title: "Réponses enregistrées",
      subtitle: pct == null
        ? "Chaque question rencontrée en entraînement."
        : `${pct} % de bonnes réponses sur ${answered.toLocaleString("fr-CA")} réponses données (${(seen - answered).toLocaleString("fr-CA")} questions passées).`,
      total: seen,
      empty: "Aucune réponse enregistrée pour le moment.",
      rows: recent.map((r) => ({
        id: `qa-${r.id}`,
        // The browser bundles the whole question bank, so it can name the exact
        // quiz this id belongs to; `label` is the fallback when it cannot.
        code: r.question_id,
        label: questionLabel(r.question_id),
        sub: [whoIs(byId, r.user_id).label, r.duration_ms ? `${Math.round(r.duration_ms / 1000)} s` : null].filter(Boolean).join(" · "),
        pill: !r.answered ? "passée" : r.is_correct ? "correcte" : "incorrecte",
        tone: !r.answered ? "slate" : r.is_correct ? "green" : "red",
        right: "le",
        at: r.created_at,
      })),
    };
  },

  // Subjects and senders only — the message body stays in the Messages tab.
  messages: async () => {
    const messages = await rowsOf(admin.from("contact_messages").select("id, name, email, subject, created_at")
      .eq("status", "new").order("created_at", { ascending: false }).limit(DETAIL_LIMIT));
    return {
      title: "Messages à traiter",
      subtitle: "Messages reçus et pas encore traités.",
      total: await countOf("contact_messages", (q) => q.eq("status", "new")),
      avatar: true,
      empty: "Aucun message en attente. Boîte de réception à jour.",
      rows: messages.map((m) => ({
        id: `msg-${m.id}`,
        label: m.name || m.email,
        sub: [m.email, m.subject || "sans objet"].filter(Boolean).join(" · "),
        pill: "nouveau",
        tone: "amber",
        right: "reçu le",
        at: m.created_at,
      })),
    };
  },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
    await requireAdmin(req);

    const detail = String(req.query.detail || "").trim();
    if (detail) {
      const build = Object.prototype.hasOwnProperty.call(DETAILS, detail) ? DETAILS[detail] : null;
      if (!build) throw new HttpError(400, "Détail inconnu.");
      const payload = await build();
      return res.status(200).json({
        key: detail,
        limit: DETAIL_LIMIT,
        // The card shows the true total; the list is capped, and the pop-up
        // says so rather than letting the two numbers quietly disagree.
        truncated: payload.total > payload.rows.length,
        ...payload,
      });
    }

    const since = new Date(Date.now() - DAYS_SHOWN * DAY).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * DAY).toISOString();
    // "Online now" = pinged last_seen_at within the last few minutes (matches the
    // window used by the Users view). Pre-migration (no column) counts as zero.
    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();

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
