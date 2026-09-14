import { supabase } from "@/services/supabaseClient";

// Model answers (« modèles de réponse ») for the Expression écrite subjects,
// backed by the sujets_answers table (migration 20260913_sujets_answers.sql).
//
// Reads are gated in the DATABASE, not here: the table's RLS only returns rows
// to is_premium(), and anon has no grant at all. A free account that calls
// loadAnswers gets an empty list, exactly as if the row did not exist — so the
// paywall holds even against someone querying Supabase directly with the anon
// key, which a client-side route guard alone would not do.
//
// Whether a combinaison HAS an answer is public information (the teaser is
// shown to everyone): it rides along in sujets_archive as the `a` flag on the
// combinaison itself — see hasAnswer below — rather than being read from this
// table, which non-Premium visitors cannot see into.

// The pure formatting/marking helpers live in sujetsAnswersFormat.js (no
// imports, so tests can load them without a bundler). Re-exported here so
// callers have a single entry point for this feature.
export { ANSWER_TACHES, hasAnswer, markAnswered, highlight } from "@/services/sujetsAnswersFormat";

// Every stored answer for one combinaison, keyed by tâche. Empty when the
// reader is not Premium (RLS), when the month predates the feature, or when
// generation never ran — the page tells those apart via `hasAnswer`.
export async function loadAnswers(section, year, monthNum, n) {
  const { data, error } = await supabase
    .from("sujets_answers")
    .select("tache, body, keywords")
    .eq("section", section)
    .eq("year", year)
    .eq("month_num", monthNum)
    .eq("n", n)
    .order("tache");
  if (error) return { ok: false, error: error.message, answers: {} };
  const answers = {};
  for (const r of data || []) answers[r.tache] = { body: r.body, keywords: r.keywords || [] };
  return { ok: true, answers };
}
