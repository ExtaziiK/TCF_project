import { createClient } from "@supabase/supabase-js";

// GET /api/public/stats — the live figures behind the home page's "Auto"
// statistics (src/constants/home.js STAT_SOURCES). A visitor's anon key can
// read none of these tables, so the counts are made here with the service
// role and only the totals leave the server.
//
// Cached at the edge for 5 minutes (stale for 10 more while it refreshes): the
// home page is the busiest page of the site, and a figure five minutes old is
// as true as one read this second.
//
//   { students, quizzes, exams, answers, dictees, corrections }
//   students    — registered learners, staff excluded (same RPC as before)
//   quizzes     — quizzes completed            (Aperçu « Quiz complétés »)
//   exams       — TCF blancs completed         (Aperçu « TCF blancs terminés »)
//   answers     — answers recorded             (Aperçu « Réponses enregistrées »)
//   dictees     — dictée texts available
//   corrections — texts and oral answers corrected by the AI: successful
//                 expression-écrite gradings, single-take expression-orale
//                 gradings, and finished oral interviews (each one graded once)
// A count that fails comes back null, so the page keeps its last known figure
// rather than showing 0.
let admin = null;
const db = () => (admin ||= createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
}));

async function countOf(table, filter) {
  let q = db().from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  return error ? null : count ?? 0;
}

const graded = (endpoint) => (q) => q.eq("endpoint", endpoint).eq("kind", "chat").is("error_status", null);
const sum = (...ns) => (ns.every((n) => n === null) ? null : ns.reduce((a, n) => a + (n || 0), 0));

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const [students, quizzes, exams, answers, dictees, ee, eo, interviews] = await Promise.all([
      db().rpc("registered_students_count").then(({ data, error }) => (error || !Number.isFinite(Number(data)) ? null : Number(data))),
      countOf("quiz_results"),
      countOf("exam_attempts", (q) => q.eq("status", "completed")),
      countOf("question_attempts"),
      countOf("dictee_texts"),
      countOf("ai_usage_log", graded("expression-ecrite")),
      countOf("ai_usage_log", graded("expression-orale")),
      countOf("eo_recordings"),
    ]);
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ students, quizzes, exams, answers, dictees, corrections: sum(ee, eo, interviews) });
  } catch {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({});
  }
}
