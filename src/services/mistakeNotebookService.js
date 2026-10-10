import { supabase } from "@/services/supabaseClient";
import { getBank } from "@/services/bankService";
import { getActiveProfileId } from "@/utils/activeProfile";
import { isUnderReview } from "@/constants/quizReview";

// Carnet d'erreurs (supabase/migrations/20261010_mistake_notebook.sql).
//
// The quiz engine drops every wrong or blank bank question in here; the
// candidate takes it out with « J'ai compris ». Rows hold only the question id —
// the question itself (media, options, explanation) is looked up in the bank,
// so a correction made to the bank shows up in the notebook too.

const SECTIONS = ["co", "ce"];

// Fire-and-forget, like recordAttempts: a notebook hiccup must never interrupt
// the end of a quiz. `items` = [{ questionId, choice }] (choice null = blank).
// Only questions the bank can resolve are kept — that is what the notebook
// page will look them up in, and it is also where the section comes from
// (admin-added questions have bare UUID ids that do not name one).
export async function recordMistakes(userId, items) {
  if (!userId || !items?.length) return { ok: false };
  const index = bankQuestionIndex({ staff: true });
  const rows = items
    .map((x) => ({ x, q: index.get(String(x.questionId)) }))
    .filter(({ q }) => q)
    .map(({ x, q }) => ({ q: String(x.questionId), s: q.section, c: Number.isInteger(x.choice) ? x.choice : null }));
  if (rows.length === 0) return { ok: false };
  const { error } = await supabase.rpc("notebook_record", { p_profile: getActiveProfileId(), p_items: rows });
  if (error) console.warn("mistake_notebook:", error.message);
  return { ok: !error };
}

// Misspelt dictée words (migration 20261011_mistake_notebook_dictee.sql).
// `diffs` = diffSentence() results for the dictée's segments. Only words the
// candidate HEARD and wrote wrong are kept — spelling, accents, agreements,
// homophones. Unheard words are left out: stopping a dictée early scores every
// segment not reached as entirely missing, and those are not spelling mistakes.
const DICTEE_KEPT = new Set(["wrong", "accent"]);
export async function recordDicteeMistakes(userId, diffs) {
  if (!userId || !diffs?.length) return;
  const rows = [];
  for (const diff of diffs) {
    for (const w of diff.words || []) {
      if (!DICTEE_KEPT.has(w.status) || !w.got || w.family === "missed") continue;
      rows.push({
        q: `dictee:${w.exp.exact}`,
        s: "dictee",
        c: null,
        d: { word: w.exp.raw, typed: w.got, family: w.family, sentence: diff.source, start: w.exp.start, end: w.exp.end },
      });
    }
  }
  if (rows.length === 0) return;
  const { error } = await supabase.rpc("notebook_record", { p_profile: getActiveProfileId(), p_items: rows.slice(0, 200) });
  if (error) console.warn("mistake_notebook:", error.message);
}

// A dictée card is shown from its own `detail`; one without it (written before
// the part-2 migration) has nothing to show and is skipped.
export const isDicteeCard = (card) => String(card.questionId).startsWith("dictee:");
export const dicteeCardOk = (card) => isDicteeCard(card) && !!card.detail?.word && !!card.detail?.sentence;

const rowToCard = (r) => ({
  id: r.id,
  questionId: r.question_id,
  section: r.section,
  status: r.status,
  timesWrong: r.times_wrong,
  lastChoice: r.last_choice,
  relapsed: r.relapsed,
  lastWrongAt: r.last_wrong_at,
  understoodAt: r.understood_at,
  detail: r.detail ?? null,
});

// Every card of the profile in use, newest mistake first. `missing` is true when
// the migration has not been applied, so the page can say so instead of
// showing an empty notebook that never fills.
export async function listMistakes() {
  const profileId = getActiveProfileId();
  let q = supabase.from("mistake_notebook").select("*").order("last_wrong_at", { ascending: false }).limit(2000);
  if (profileId) q = q.eq("profile_id", profileId);
  const { data, error } = await q;
  if (error) {
    console.warn("mistake_notebook:", error.message);
    return { ok: false, missing: error.code === "42P01" || error.code === "PGRST205", cards: [] };
  }
  return { ok: true, cards: data.map(rowToCard) };
}

// « J'ai compris » / « Remettre à revoir ». Putting a card back clears the
// relapse badge: the candidate chose to revisit it, nothing went wrong.
export async function setMistakeStatus(id, status) {
  const patch = status === "understood"
    ? { status, understood_at: new Date().toISOString(), relapsed: false }
    : { status, understood_at: null, relapsed: false };
  const { error } = await supabase.from("mistake_notebook").update(patch).eq("id", id);
  return { ok: !error, error: error?.message };
}

// « Vider mon carnet »: every card of the profile in use, both tabs, gone.
// Scoped like listMistakes, so on a shared account one profile's reset never
// touches a sibling's notebook. RLS limits it to the account's own rows anyway.
export async function clearMistakes(userId) {
  if (!userId) return { ok: false };
  const profileId = getActiveProfileId();
  let q = supabase.from("mistake_notebook").delete().eq("user_id", userId);
  if (profileId) q = q.eq("profile_id", profileId);
  const { error } = await q;
  return { ok: !error, error: error?.message };
}

// question id -> the bank question, stamped with where it lives. Rebuilt on
// each call because admin quizzes are injected into the bank after start-up.
// Quizzes under review are left out for members, as on the Révision page.
export function bankQuestionIndex({ staff } = {}) {
  const bank = getBank();
  const map = new Map();
  for (const section of SECTIONS) {
    for (const quiz of bank[section] || []) {
      if (quiz.kind === "prompt" || (!staff && isUnderReview(quiz))) continue;
      (quiz.questions || []).forEach((q, i) => {
        if (q.id != null) map.set(String(q.id), { ...q, section, quizNumber: quiz.quizNumber, order: i + 1 });
      });
    }
  }
  return map;
}
