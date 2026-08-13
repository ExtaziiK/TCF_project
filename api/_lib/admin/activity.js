import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../auth.js";
import { HttpError } from "../groq.js";

// Per-user activity for the detail panel in the Users tab.
//
// This endpoint adds NO tracking of its own. Every row it returns is something
// the platform already writes for its own reasons — quiz results, exam
// attempts, the Groq meter, dictée sessions, payment requests, consent, admin
// actions — merged into one timeline. Nothing new is stored about anyone, and
// no free-text answer or recording ever leaves its own table: the timeline
// carries scores, counts and timestamps, not content.
//
//   GET /api/admin/activity?userId=<uuid>[&offset=0]
//     → { user, summary, events, nextOffset }
//
// `summary` is computed on the first page only; "Charger plus" pages the
// timeline and leaves the totals alone.
//
// Paging is by offset, not by timestamp: the merged list is rebuilt on every
// request anyway (ten small per-user queries), and a timestamp cursor silently
// drops events that share a second — an exam start and its first AI call
// routinely do.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Newest rows pulled per source. Generous for a real candidate (the heaviest
// account on the platform has ~50 AI calls a month) while keeping one request
// bounded; older events beyond it are truncated rather than paged, which the
// panel says out loud when it runs out.
const PER_SOURCE = 500;
const PAGE = 40;

// Consecutive Groq calls on the same endpoint inside this gap are one sitting.
// Without it a single Expression orale shows up as two rows (transcription +
// analyse) and a dialogue as three per turn, which buries everything else.
const BURST_GAP_MS = 20 * 60 * 1000;

// A source that errors — table absent because a migration hasn't been applied,
// most often — contributes nothing instead of failing the whole panel.
async function rows(query) {
  const { data, error } = await query;
  return error ? [] : data || [];
}
async function countOf(query) {
  const { count, error } = await query;
  return error ? null : count ?? 0;
}

/* ------------------------------- labelling -------------------------------- */

const ENDPOINT_LABELS = {
  "expression-ecrite": "Expression écrite",
  "expression-orale": "Expression orale",
  "expression-orale-dialogue": "Expression orale — dialogue",
  dictee: "Dictée",
};
const endpointLabel = (e) => ENDPOINT_LABELS[e] || e || "IA";

// [singulier, pluriel] — "synthèse vocale" does not pluralise by appending an
// s to the phrase, so the two forms are spelled out rather than derived.
const KIND_LABELS = {
  chat: ["analyse", "analyses"],
  transcription: ["transcription", "transcriptions"],
  tts: ["synthèse vocale", "synthèses vocales"],
};

// "bank-co-Quiz_1_CO.json" → "CO — Quiz 1". Falls back to the stored section,
// then to a tidied key, so an unrecognised naming scheme still reads.
// Exported: the overview's stat detail lists label quiz rows the same way.
export function quizLabel(key = "", section = null) {
  const m = /Quiz[_-]?(\d+)[_-]?(CO|CE|EE|EO)/i.exec(key);
  if (m) return `${m[2].toUpperCase()} — Quiz ${m[1]}`;
  const clean = String(key).replace(/^bank-/, "").replace(/\.json$/, "").replace(/[_-]+/g, " ").trim();
  return section ? `${section.toUpperCase()} — ${clean || "quiz"}` : clean || "Quiz";
}

const plural = (n, one, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

/* --------------------------------- sources -------------------------------- */

// Groups the AI meter into sittings and turns each into one event carrying the
// call breakdown. Refused calls (error_status set) never share a burst with
// successful ones — "3 appels, tous refusés" and "3 appels" are different
// stories and the panel colours them differently.
function aiEvents(log) {
  const asc = [...log].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const bursts = [];
  let cur = null;
  for (const r of asc) {
    const failed = r.error_status != null;
    const at = Date.parse(r.created_at);
    if (cur && cur.endpoint === r.endpoint && cur.failed === failed && at - cur.lastAt <= BURST_GAP_MS) {
      cur.rows.push(r);
      cur.lastAt = at;
    } else {
      if (cur) bursts.push(cur);
      cur = { endpoint: r.endpoint, failed, rows: [r], startedAt: r.created_at, lastAt: at };
    }
  }
  if (cur) bursts.push(cur);

  return bursts.map((b) => {
    const byKind = {};
    let tokens = 0;
    for (const r of b.rows) {
      byKind[r.kind] = (byKind[r.kind] || 0) + 1;
      tokens += r.total_tokens || 0;
    }
    const parts = Object.entries(byKind).map(([k, n]) => {
      const [one, many] = KIND_LABELS[k] || [k, `${k}s`];
      return `${n} ${n > 1 ? many : one}`;
    });
    const reason = b.failed ? b.rows[b.rows.length - 1].error_detail || null : null;
    return {
      id: `ai:${b.rows[0].id}`,
      type: b.failed ? "ai_failed" : "ai",
      at: b.startedAt,
      title: endpointLabel(b.endpoint),
      detail: b.failed
        ? `${plural(b.rows.length, "appel")} refusé${b.rows.length > 1 ? "s" : ""}${b.rows[0].error_status ? ` · HTTP ${b.rows[0].error_status}` : ""}`
        : `${plural(b.rows.length, "appel")} · ${parts.join(", ")}`,
      meta: { calls: b.rows.length, tokens, endpoint: b.endpoint, reason },
    };
  });
}

function examEvents(attempts) {
  const out = [];
  const STALE_MS = 24 * 3600 * 1000;
  for (const a of attempts) {
    const done = a.status === "completed";
    const free = !!a.progress?.free;
    out.push({
      id: `exam-start:${a.id}`,
      type: "exam",
      at: a.started_at,
      title: free ? "TCF blanc (gratuit) commencé" : "TCF blanc commencé",
      // An attempt still "in_progress" a day later was abandoned, not paused —
      // that distinction is most of why this panel is worth opening.
      detail: done
        ? "terminé"
        : Date.now() - Date.parse(a.started_at) > STALE_MS
          ? "abandonné"
          : "en cours",
      meta: { free, completed: done },
    });
    if (done && a.completed_at) {
      const s = a.score || {};
      out.push({
        id: `exam-done:${a.id}`,
        type: "exam_done",
        at: a.completed_at,
        title: "TCF blanc terminé",
        detail: [s.pct != null ? `${s.pct} %` : null, s.level || null, s.points != null ? `${s.points} pts` : null]
          .filter(Boolean).join(" · ") || "sans score",
        meta: { pct: s.pct ?? null, level: s.level ?? null },
      });
    }
  }
  return out;
}

/* --------------------------------- summary -------------------------------- */

function summarise({ user, quizzes, attempts, aiLog, dictees, requests, payments, questions }) {
  const pcts = quizzes.map((q) => q.pct).filter((n) => typeof n === "number");
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

  const ok = aiLog.filter((r) => r.error_status == null);
  const byEndpoint = {};
  for (const r of ok) {
    const e = (byEndpoint[r.endpoint] ||= { endpoint: r.endpoint, label: endpointLabel(r.endpoint), calls: 0, tokens: 0 });
    e.calls++;
    e.tokens += r.total_tokens || 0;
  }

  // The distinction the Utilisation tab can't make: an "appel" is a Groq call,
  // and one candidate action costs between one and three of them. Analyses are
  // the graded chat calls outside dialogue mode; dialogue turns are counted
  // separately because they are billed but claim no quota (see the free-tier
  // rules in api/_lib/auth.js).
  const analyses = ok.filter((r) => r.kind === "chat" && r.endpoint !== "expression-orale-dialogue").length;
  const dialogueTurns = ok.filter((r) => r.endpoint === "expression-orale-dialogue" && r.kind === "transcription").length;

  const dictScores = dictees.map((d) => d.score).filter((n) => typeof n === "number");

  return {
    quizzes: { count: quizzes.length, avgPct: avg(pcts), bestPct: pcts.length ? Math.max(...pcts) : null },
    // Accuracy is over ANSWERED questions only. A skipped attempt is stored
    // with answered = false and is_correct = null, so counting it in the
    // denominator would report a candidate who skipped a whole quiz as 0 %
    // correct rather than as someone who answered nothing.
    questions: {
      ...questions,
      skipped: questions.seen != null && questions.answered != null ? questions.seen - questions.answered : null,
      pct: questions.answered && questions.correct != null ? Math.round((questions.correct / questions.answered) * 100) : null,
    },
    exams: { started: attempts.length, completed: attempts.filter((a) => a.status === "completed").length },
    dictees: { count: dictees.length, avgScore: avg(dictScores) },
    ai: {
      calls: ok.length,
      failures: aiLog.length - ok.length,
      tokens: ok.reduce((a, r) => a + (r.total_tokens || 0), 0),
      analyses,
      dialogueTurns,
      byEndpoint: Object.values(byEndpoint).sort((a, b) => b.calls - a.calls),
    },
    money: {
      requests: requests.length,
      approved: requests.filter((r) => r.status === "approved").length,
      paidDzd: payments.reduce((a, p) => a + Number(p.amount_dzd || 0), 0),
    },
    account: {
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at || null,
      // Days between signing up and the newest recorded activity, so a "signed
      // up and vanished" account is visible without reading the timeline.
      plan: user.app_metadata?.plan || "Sans papier",
      planLabel: user.app_metadata?.plan_label || null,
    },
  };
}

/* -------------------------------- handler --------------------------------- */

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
    await requireAdmin(req);

    const userId = String(req.query.userId || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new HttpError(400, "Identifiant de compte invalide.");
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const { data: found, error: userErr } = await admin.auth.admin.getUserById(userId);
    if (userErr || !found?.user) throw new HttpError(404, "Utilisateur introuvable.");
    const account = found.user;
    const email = account.email || "";

    const newest = (table, col) =>
      admin.from(table).select("*").eq("user_id", userId).order(col, { ascending: false }).limit(PER_SOURCE);

    const [quizzes, attempts, aiLog, dictees, reqByUser, reqByEmail, payments, testimonials, messages, terms, adminActions, profile] =
      await Promise.all([
        rows(newest("quiz_results", "completed_at")),
        rows(newest("exam_attempts", "started_at")),
        rows(admin.from("ai_usage_log").select("id, endpoint, kind, total_tokens, error_status, error_detail, created_at")
          .eq("user_id", userId).order("created_at", { ascending: false }).limit(PER_SOURCE)),
        rows(newest("dictee_sessions", "completed_at")),
        rows(newest("subscription_requests", "created_at")),
        // Requests placed before the account existed (or by a signed-out
        // visitor who typed the same address) carry only the email.
        email ? rows(admin.from("subscription_requests").select("*").ilike("email", email)
          .order("created_at", { ascending: false }).limit(PER_SOURCE)) : [],
        // revenue_entries has no user_id — `created_by` is the admin who typed
        // it in — so a payment is tied to a candidate by the email recorded on
        // the entry. Matching is what the Revenus tab already does by eye.
        email ? rows(admin.from("revenue_entries").select("*").ilike("email", email)
          .order("occurred_at", { ascending: false }).limit(PER_SOURCE)) : [],
        rows(newest("testimonials", "created_at")),
        rows(newest("contact_messages", "created_at")),
        rows(admin.from("terms_acceptances").select("*").eq("user_id", userId)
          .order("accepted_at", { ascending: false }).limit(PER_SOURCE)),
        email ? rows(admin.from("admin_audit_log").select("*").eq("target", email)
          .order("created_at", { ascending: false }).limit(PER_SOURCE)) : [],
        rows(admin.from("profiles").select("username, last_seen_at").eq("id", userId).limit(1)),
      ]);

    // Merge the two request queries; the same row can match on both.
    const requests = [...reqByUser];
    for (const r of reqByEmail) if (!requests.some((x) => x.id === r.id)) requests.push(r);

    const events = [
      ...quizzes.map((q) => ({
        id: `quiz:${q.id}`,
        type: "quiz",
        at: q.completed_at,
        title: quizLabel(q.quiz_key, q.section),
        detail: `${q.ok}/${q.total} · ${q.pct} %${q.duration_sec ? ` · ${Math.round(q.duration_sec / 60)} min` : ""}`,
        meta: { pct: q.pct, section: q.section },
      })),
      ...examEvents(attempts),
      ...aiEvents(aiLog),
      ...dictees.map((d) => ({
        id: `dictee:${d.id}`,
        type: "dictee",
        at: d.completed_at,
        title: "Dictée",
        detail: `${d.correct}/${d.words} mots · ${d.score} %${d.speed ? ` · ${d.speed}×` : ""}`,
        meta: { pct: d.score },
      })),
      ...requests.map((r) => ({
        id: `request:${r.id}`,
        type: "request",
        at: r.created_at,
        title: `Demande d'abonnement — ${r.plan}`,
        detail: [r.amount_dzd, r.method, r.status].filter(Boolean).join(" · "),
        meta: { status: r.status },
      })),
      ...payments.map((p) => ({
        id: `payment:${p.id}`,
        type: "payment",
        at: p.occurred_at,
        title: `Paiement encaissé — ${Number(p.amount_dzd || 0).toLocaleString("fr-CA")} DA`,
        detail: [p.plan, p.method].filter(Boolean).join(" · "),
        meta: {},
      })),
      ...testimonials.map((t) => ({
        id: `testimonial:${t.id}`,
        type: "testimonial",
        at: t.created_at,
        title: "Témoignage déposé",
        detail: [t.level, t.status].filter(Boolean).join(" · "),
        meta: { status: t.status },
      })),
      ...messages.map((m) => ({
        id: `message:${m.id}`,
        type: "message",
        at: m.created_at,
        title: "Message envoyé",
        detail: m.subject || "sans objet",
        meta: {},
      })),
      ...terms.map((t) => ({
        id: `terms:${t.id}`,
        type: "terms",
        at: t.accepted_at,
        title: `Conditions acceptées (v${t.version})`,
        detail: t.source,
        meta: {},
      })),
      ...adminActions.map((a) => ({
        id: `admin:${a.id}`,
        type: "admin_action",
        at: a.created_at,
        title: `Action admin — ${a.action}`,
        detail: a.actor_email || "—",
        meta: {},
      })),
      {
        id: `signup:${userId}`,
        type: "signup",
        at: account.created_at,
        title: "Compte créé",
        detail: account.app_metadata?.provider === "google" ? "via Google" : "par email",
        meta: {},
      },
    ].filter((e) => e.at);

    events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    const page = events.slice(offset, offset + PAGE);
    const nextOffset = offset + PAGE < events.length ? offset + PAGE : null;

    // Totals are for the whole account, so they are computed once on the first
    // page and reused while the admin pages the timeline.
    let summary = null;
    if (offset === 0) {
      // question_attempts is the one high-volume source that never becomes a
      // timeline entry — one quiz is twenty-odd rows and would bury everything
      // else — so it contributes counts only. Needs the (user_id, created_at)
      // index from 20260812_question_attempts_user_idx.sql; without it this is
      // a sequential scan of the biggest table on the platform.
      const qa = () => admin.from("question_attempts").select("*", { count: "exact", head: true }).eq("user_id", userId);
      const [seen, answered, correct] = await Promise.all([
        countOf(qa()),
        countOf(qa().eq("answered", true)),
        countOf(qa().eq("answered", true).eq("is_correct", true)),
      ]);
      summary = summarise({
        user: account, quizzes, attempts, aiLog, dictees, requests, payments,
        questions: { seen, answered, correct },
      });
    }

    res.status(200).json({
      user: {
        id: account.id,
        email: account.email,
        name: account.user_metadata?.name || account.user_metadata?.full_name || null,
        username: profile[0]?.username || null,
        lastSeenAt: profile[0]?.last_seen_at || null,
        createdAt: account.created_at,
        lastSignInAt: account.last_sign_in_at || null,
        plan: account.app_metadata?.plan || "Sans papier",
        planLabel: account.app_metadata?.plan_label || null,
        premiumUntil: account.app_metadata?.premium_until || null,
        admin: account.app_metadata?.role === "admin",
        owner: account.app_metadata?.role === "owner",
      },
      summary,
      events: page,
      nextOffset,
      // True when a source hit PER_SOURCE: the oldest history is cut off rather
      // than paged, and the panel says so instead of pretending it is complete.
      truncated: [quizzes, aiLog, dictees].some((s) => s.length >= PER_SOURCE),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Activity request failed." });
  }
}
